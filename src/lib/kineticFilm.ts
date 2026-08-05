// Generic kinetic-typography timeline engine, shared by the newer teaser
// films (Braino Split, Braino OS). Reuses the exact word-reveal grammar
// already established in NotchTeaser.tsx/IntroTeaser.tsx (the flagship "Don't
// Blink" films), just data-driven instead of hand-authored per scene:
//   - a plain token ("Braino") stamps in on its own
//   - a "+token" fuses flush onto the PREVIOUS token with no gap ("Bli"+"nk."
//     reads "Blink.") — this is also the match-cut trigger point
//   - a "*token" gets the coral/gold emphasis shimmer instead of a plain stamp
//   - a "^token" renders bigger, just that word, independent of fuse/emphasis
export type KToken = string;

export type KBeat = {
  id: string;
  words: KToken[];        // one phrase's tokens, in the +/*/^ convention above
  cadence?: number;       // ms per token in this beat (defaults to the film's cadence)
  gapAfter?: number;      // ms hold after this beat before the next begins
  matchCut?: boolean;     // fire the invert-flash overlay once this beat's fused word finishes assembling
  matchCutLast?: boolean; // fire on the final token even when the payoff word is too short to be split/fused
  matchCutEveryToken?: boolean; // pulse once on every token while keeping earlier fused tokens visible
  matchCutEveryWordEnd?: boolean; // pulse after each completed fused word, not after its internal chunks
  cutEveryWord?: boolean; // every single word gets its own cut as it lands (the "IOMI" letter-by-letter convention)
  strobe?: boolean;       // the cut(s) in this beat pulse 3x fast instead of one held snap
  strobeCount?: number;   // exact number of visible invert pulses across the cut window
  big?: boolean;          // the whole line renders bigger — the film's headline reveal
  hero?: string;          // which persistent hero visual (if any) is on screen during this beat
  heroMode?: string;      // a mode flag passed to that hero via data-hero-mode, for its own internal transitions
  snap?: boolean;         // let beat-sync analysis nudge this beat's start to the nearest detected pulse
  scriptText?: string;    // override text for the ScriptPanel line (defaults to the words joined)
  graphic?: string;       // an image URL to show, dead-centre, for the duration of this beat
  offsetX?: number;       // dragged position, % of frame width from centre (canvas edit mode)
  offsetY?: number;       // dragged position, % of frame height from centre
  scale?: number;         // resized scale factor, 1 = default size
  iomiReveal?: boolean;   // letter-by-letter IOMI landing, then one-shot gold reveal
};

export type KBeatTiming = {
  id: string;
  start: number;
  end: number;            // start of next beat (or this beat's own end if last)
  wordStarts: number[];   // per-token start offset, relative to film start
  fuseIndex: number;      // index of the last "+"-prefixed token, or -1
};

export function buildKineticTimeline(beats: KBeat[], defaultCadence: number, defaultGap: number) {
  const timings: KBeatTiming[] = [];
  let t = 0;
  beats.forEach((b) => {
    const cadence = b.cadence ?? defaultCadence;
    const start = t;
    const wordStarts = b.words.map((_, i) => start + i * cadence);
    // last fused token, not first — the cut fires once the fused word has
    // fully assembled ("Bra"+"ino"+"OS" cuts on "OS" landing, not "ino")
    let fuseIndex = -1;
    b.words.forEach((w, i) => { if (w.startsWith("+")) fuseIndex = i; });
    timings.push({ id: b.id, start, end: 0, wordStarts, fuseIndex });
    t = start + b.words.length * cadence + (b.gapAfter ?? defaultGap);
  });
  timings.forEach((tm, i) => { tm.end = timings[i + 1]?.start ?? t; });
  return { timings, total: t };
}

// ── the editable, Instagram-caption-style script format ──────────────────
// One line per beat, edited directly — no code, no re-asking the model.
//   - plain words just stamp in, space-separated
//   - "word**word**" / select + Bigger: `**word**` renders that word bigger
//   - `//` FLUSH against the letters on both sides ("Bra//ino//OS") fuses
//     them into one word, match cut on the last fuse landing — "BrainoOS"
//   - `//` WITH a space on either side ("Ready? // Lock in.") cuts between
//     two separate words — the "LetsFuckingGo"/"IOMI" formula, every word
//     in the line gets its own cut
//   - `///` (three slashes, same flush/spaced rule) is the same two formulas
//     but the cut(s) pulse 3x fast instead of one held snap — "3x match cut"
export function parseScriptText(text: string): KBeat[] {
  // NOT filtered for blank lines — a blank line is a valid beat with no
  // words (a graphic-only beat, or a plain hold). Filtering them out here
  // would silently misalign any per-line metadata (hero, graphic, …) kept
  // by index alongside the raw lines.
  return text.split("\n").map((l) => l.trim()).map((rawLine, i) => {
    // bigger markers first: **word** -> ^word, per word inside the span
    const line = rawLine.replace(/\*\*([^*]+)\*\*/g, (_, inner: string) =>
      inner.trim().split(/\s+/).map((w) => `^${w}`).join(" "));

    const segments: string[] = [];
    const joins: { spaced: boolean; strobe: boolean }[] = [];
    const re = /\/{2,3}/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const before = line.slice(lastIndex, m.index);
      segments.push(before);
      const after = line.slice(m.index + m[0].length);
      const spaced = /\s$/.test(before) || /^\s/.test(after);
      joins.push({ spaced, strobe: m[0].length === 3 });
      lastIndex = m.index + m[0].length;
    }
    segments.push(line.slice(lastIndex));

    const words: string[] = [];
    segments.forEach((seg, si) => {
      seg.trim().split(/\s+/).filter(Boolean).forEach((tok, ti) => {
        words.push(si > 0 && ti === 0 && !joins[si - 1].spaced ? `+${tok}` : tok);
      });
    });

    return {
      id: `line-${i}`,
      words,
      matchCut: joins.some((j) => !j.spaced),
      cutEveryWord: joins.some((j) => j.spaced),
      strobe: joins.some((j) => j.strobe),
    } as KBeat;
  });
}

export function beatsToScriptText(beats: KBeat[]): string {
  // empty-word beats (a hold, or a graphic-only beat) round-trip as a blank
  // line, not dropped — dropping them here would misalign the per-line
  // metadata every caller keeps alongside these lines by index.
  return beats.map((b) => {
    if (b.words.length === 0) return "";
    const cutMark = b.strobe ? "///" : "//";
    let out = "";
    b.words.forEach((w) => {
      const { text, fuse, big } = cleanToken(w);
      const shown = big ? `**${text}**` : text;
      if (out === "") out = shown;
      else if (fuse) out += `${cutMark}${shown}`;
      else if (b.cutEveryWord) out += ` ${cutMark} ${shown}`;
      else out += ` ${shown}`;
    });
    return out;
  }).join("\n");
}

export function cleanToken(tok: KToken): { text: string; fuse: boolean; emph: boolean; big: boolean } {
  let rest = tok;
  let fuse = false;
  if (rest.startsWith("+")) { fuse = true; rest = rest.slice(1); }
  let big = false;
  if (rest.startsWith("^")) { big = true; rest = rest.slice(1); }
  let emph = false;
  if (!big && rest.startsWith("*")) { emph = true; rest = rest.slice(1); }
  return { text: rest, fuse, emph, big };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
