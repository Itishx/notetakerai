import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import "./home-os.css";
import "./notch-teaser.css";

/* ============================================================================
   /notch-teaser — the Braino Notch teaser film. Fast kinetic typography (like
   the "don't blink" launch video) intercut with the REAL notch:
     1  cold open   "Braino found a new home."   (word-by-word, dead centre)
     2  intro       "Say hello to it."
     3  WAKE-UP     the full boot sequence — the notch comes alive
     4  GREETING    the notch CAPTIONS "hey, it's me." (play-less-than-i-do style)
     5  SEE         he looks down at your screen (eyes drift + dart)
     6  REVEAL      "With a vision model, he sees everything on your screen."
                    → (that you allow) → (Ofc) BIG
     7  MATCH CUT   the bar returns, ONE continuous caption sequence: "Introducing"
                    → "Braino" → "What does he do?" → fast mode-words flicker
                    (Thinking · Reading · Pondering …) → "Notch", frame inverts B/W
     8  "xD" → tagline "Speak. Watch It Happen." → "That's Braino"
     9  "Oh... and one more thing." → Braino Co-Work
    10  WINK        the island winks → black
   One rAF clock, deterministic render(t), fully scrubbable + MP3 beat-sync.
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Self-contained walker instance: rename BOTH the element-id prefix AND every
// gradient id (sbb-*/sbwk-* — the source mixes both) to one unique prefix, so
// this instance never collides with another on the page. Verbatim to how
// content.js avoids "the white brain" bug (shared #sbb-fill across instances).
const namespacedWalker = (prefix: string) =>
  BRAINO_WALKER_SVG
    .replace(/__sbwk_/g, `__${prefix}_`)
    .replace(/sbb-(fill|dark|glow)/g, `${prefix}-$1`)
    .replace(/sbwk-(fill|dark|glow)/g, `${prefix}-$1`);

const OPEN_PHRASES = [["Braino?", "For?", "Your?", "Mac?"]];
const INTRO_WORDS = ["Let's", "fucking", "goo."];
const SCREEN_MAIN_PHRASES = [["With", "a", "vision", "model,"], ["now", "sees", "everything"], ["on", "your", "screen."]];
const NOTE1_WORDS = ["(only", "when", "needed)"];
const TAG_WORDS = ["Speak.", "Watch", "It", "Happen."];
const ONEMORE_PHRASES = [["Oh..."], ["and", "one", "more", "thing."]];
const COWORK_WORDS = ["Braino", "Co-", "Work"];   // per-word invert: Braino normal, Co-=invert#1, Work=invert#2 — the hyphen inverts with it
const GREET_CAP = "hey shawty";
// "That's Braino?" holds, then "BrainoNotch" JOINS right next to it (nothing
// clears — kinetic() only ever adds words) and the frame inverts white↔black.
// "That's Braino?" keeps its ORIGINAL colour (white), so once the background
// flips white it visually disappears — only "BrainoNotch" is recoloured
// black, so it's the one thing that reads after the flip.
const THATSBRAINO_WORDS = ["That's", "Braino?", "BrainoNotch"];
// what Braino actually does — real skills flickering fast, ending on the punch
const MODE_WORDS = [
  "Browsing", "Searching", "Coding", "Emailing",
  "Booking", "Remembering", "Shopping", "Watching. Always.",
];

// mode flicker schedule (fast, accelerating; the final punch-word holds) —
// this one stays quick, it's the Braino/Notch caption (CUT_CAP_HOLD) that got slowed down
const MODE_DURS = MODE_WORDS.map((_, i) =>
  i === MODE_WORDS.length - 1 ? 620 : Math.round(230 - (230 - 90) * (i / (MODE_WORDS.length - 2)))
);
const MODE_CUM: number[] = [];
{ let acc = 0; for (const d of MODE_DURS) { MODE_CUM.push(acc); acc += d; } }
const MODES_TOTAL = MODE_DURS.reduce((a, b) => a + b, 0);
const BOOT_LEN = 7700;    // verbatim boot beats; short hold after the greeting
const WINK_TAIL = 4100;   // form → coral → WINK plays out fully → beat of black
const COWORK_SW = 360;    // Braino → Co → Work cadence (each join is its own match cut)
const ONEMORE_HOLD = 400; // "Oh, and one more thing." hold before Braino begins
// ONE continuous notch-pill sequence, right after the vision reveal: types
// "Introducing" → "Braino" → "What does he do?" (same caption wing as the
// Thinking/Reading flicker), THEN the SAME pill runs the fast mode-words
// flicker, THEN caption swaps to "Notch" and the frame inverts white↔black.
const CUT_PRE_WORDS = ["What can he do?"];
const CUT_CAP_HOLD = 780;   // per word, in the pill — readable
const CUT_PRE_DUR = CUT_PRE_WORDS.length * CUT_CAP_HOLD;
const CUT_DUR = CUT_PRE_DUR + MODES_TOTAL + CUT_CAP_HOLD;   // pre-words + fast flicker + "Notch"
const VISION_MASCOT_DUR = 850; // "With a vision model," clears → a beat of black → mascot waves → match-cuts
const VISION_PAUSE = 220;       // the wait: text is gone, nothing shows yet
const VISION_MASCOT_IN = 130;   // mascot's own fade-in, right after the pause
const VISION_FLIP_AT = 550;     // when, inside that window, the invert fires
const THATSBRAINO_SW = 300;

// The WORDS get FASTER as the film progresses — each scene has its own cadence
// (ms per word), decreasing scene by scene. Animations are NOT part of this.
const SW = { open: 360, screen: 280, tag: 300 };
// TEXT flows: sentence → sentence is a small FIXED beat, never the big hold.
const GAP = 260;

// A GROUP is capped at 4 words — any longer sentence is split into sequential
// phrases that share ONE spot: phrase clears, next phrase takes its place.
// phraseSeq gives each phrase's start offset (ms) + the group's total duration.
const phraseSeq = (phrases: string[][], sw: number) => {
  const starts: number[] = [];
  let acc = 0;
  for (const ph of phrases) { starts.push(acc); acc += ph.length * sw + GAP; }
  return { starts, total: acc };
};

const ONEMORE_DUR = phraseSeq(ONEMORE_PHRASES, 300).total + ONEMORE_HOLD;
const COWORK_DUR = COWORK_WORDS.length * COWORK_SW + 550;   // 3 words + a readable hold before the wink

// SEE-YOUR-SCREEN runs five phrases sequentially in the SAME spot; `sw` per
// word, scaled by cadence. (3 for the main reveal, then the two asides.)
const screenTimes = (sw: number, _H: number) => {
  const p0 = SCREEN_MAIN_PHRASES[0].length * sw + GAP;
  const mascotStart = p0;
  const mascotEnd = p0 + VISION_MASCOT_DUR;             // "he" is replaced by the mascot + match cut
  const p1 = SCREEN_MAIN_PHRASES[1].length * sw + GAP;
  const p2 = SCREEN_MAIN_PHRASES[2].length * sw + GAP;
  const mainStarts = [0, mascotEnd, mascotEnd + p1];
  const mainEnd = mascotEnd + p1 + p2;
  const n1Start = mainEnd;
  const n1End = n1Start + NOTE1_WORDS.length * sw + GAP;
  const n2Start = n1End;
  const total = n2Start + sw + GAP;
  return { mainStarts, mainEnd, n1Start, n1End, n2Start, total, mascotStart, mascotEnd };
};

// Build the timeline. Word reveals use the per-scene SW cadence (untouched by
// duration fitting); the single HOLD `H` is what fills the film out to length.
// Animations (boot / match cut / wink / modes) keep fixed durations. snap() pins
// each scene start to the beat grid.
const buildTimeline = (H: number, snap?: (ms: number, down: boolean) => number) => {
  // ONLY the three big hits snap to the music (boot, the match cut, the wink) —
  // snapping every scene inserted up to a downbeat of dead air BETWEEN sentences
  // and shoved the ending on top of itself. Text chains EXACTLY.
  let last = -1;
  const S2 = (ms: number, doSnap = false) => {
    let v = doSnap && snap ? snap(ms, true) : Math.round(ms);
    if (v <= last + 120) v = Math.round(Math.max(ms, last + 120));  // strictly forward
    last = v;
    return v;
  };
  // TEXT chains tight (word beats + GAP); the hold H lives ONLY inside the
  // motion-graphics segments — they take their own time, the text never waits.
  const open = S2(250);
  const intro = S2(open + phraseSeq(OPEN_PHRASES, SW.open).total);
  const boot = S2(intro + INTRO_WORDS.length * SW.open + GAP, true); // SNAP: the wake-up hits a downbeat
  const see = S2(boot + BOOT_LEN);                           // right after the wink — no gap, no lag
  const screen = S2(see + H * 0.22);                         // the look-down, brief
  const button = S2(screen + screenTimes(SW.screen, H).total + H * 0.08); // the bar returns: Introducing → Braino → What does he do? → fast words → Notch (cut)
  const tag = S2(button + CUT_DUR + H * 0.3);                 // straight from the Braino/Notch reveal into the tagline
  const thatsBraino = S2(tag + TAG_WORDS.length * SW.tag + H * 0.3);   // "That's Braino?" → "Notch" joins, frame inverts
  const oneMore = S2(thatsBraino + THATSBRAINO_WORDS.length * THATSBRAINO_SW + GAP + H * 0.3);
  const cowork = S2(oneMore + ONEMORE_DUR);                      // "Braino" / "Co" / "Work" begins
  const wink = S2(cowork + COWORK_DUR, true);                 // SNAP: glitch·glitch·wink lands on a downbeat
  const end = Math.round(wink + WINK_TAIL);
  return { open, intro, boot, see, screen, button, tag, thatsBraino, oneMore, cowork, wink, end };
};

// Solve the hold H so the whole film lands on `target` ms (end is linear in H).
const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

const TARGET_MS = 34000;   // Ready?/flurry merged into one continuous notch-pill sequence (Introducing/Braino/What does he do?/fast words/Notch)
const DEFAULT_H = solveHold(TARGET_MS);
const DEFAULT_T = buildTimeline(DEFAULT_H);

export default function NotchTeaser() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* no floating mascot on the teaser stage */
  useEffect(() => {
    document.body.classList.add("nt-page");
    return () => document.body.classList.remove("nt-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const notch = q(".nt-notch .nf-face");
    const notchWrap = q(".nt-notch");
    const glowP = root.querySelector<SVGPathElement>(".nt-p-glow")!;
    const coreP = root.querySelector<SVGPathElement>(".nt-p-core")!;
    const shimmer = q(".nt-shimmer");
    const bloom = q(".nt-bloom");
    const openLine = q(".nt-open");
    const intro = q(".nt-intro");
    const screen = q(".nt-screen");
    const tag = q(".nt-tag");
    const thatsBraino = q(".nt-thatsbraino");
    const thatsBrainoInvert = q(".nt-thatsbraino-invert");
    const oneMore = q(".nt-onemore");
    const cowork = q(".nt-cowork");
    const coworkMascot = q(".nt-cowork-mascot");
    const visionMascot = q(".nt-vision-mascot");
    const visionInvert = q(".nt-vision-invert");
    const glitch = q(".nt-glitch");
    const invert = q(".nt-invert");
    const invert2 = q(".nt-invert2");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // T = live timeline (rebuilt onto the beat grid when a track is synced).
    // P = per-scene word cadence (accelerating). holdMs = the fill hold.
    let T = { ...DEFAULT_T };
    const P = { ...SW };
    let holdMs = DEFAULT_H;
    // phraseSeq()/screenTimes() results only change when P/holdMs change (i.e.
    // on sync) — cache them here instead of allocating fresh arrays every frame
    // in render(), which was the real source of the recent jank.
    let openStarts = phraseSeq(OPEN_PHRASES, P.open).starts;
    let oneMoreStarts = phraseSeq(ONEMORE_PHRASES, 300).starts;
    let st = screenTimes(P.screen, holdMs);
    const recomputeStarts = () => {
      openStarts = phraseSeq(OPEN_PHRASES, P.open).starts;
      oneMoreStarts = phraseSeq(ONEMORE_PHRASES, 300).starts;
      st = screenTimes(P.screen, holdMs);
    };
    const audioEl = root.querySelector<HTMLAudioElement>(".nt-audio");
    const fileInput = root.querySelector<HTMLInputElement>(".nt-file");
    const logEl = root.querySelector<HTMLElement>(".nt-log");
    let trackLoaded = false;

    const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
    const len = coreP.getTotalLength();
    [glowP, coreP].forEach((p) => { p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });

    // cached per-frame elements — NEVER querySelector inside render (jank)
    const scMain = screen.querySelector<HTMLElement>(".nt-screen-main")!;
    const note1 = screen.querySelector<HTMLElement>(".nt-note-1")!;
    const ofcBg = screen.querySelector<HTMLElement>(".nt-ofc-bg")!;
    const ofcMascot = screen.querySelector<HTMLElement>(".nt-ofc-mascot")!;
    const ofcCaption = screen.querySelector<HTMLElement>(".nt-ofc-caption")!;
    const capEl = notch.querySelector<HTMLElement>(".nf-cap-l");

    // the mode-word flicker index at elapsed time el (ms into the modes scene)
    const N = MODE_WORDS.length;
    const modeIndexAt = (el: number) => {
      let idx = 0;
      for (let i = 0; i < N; i++) if (el >= MODE_CUM[i]) idx = i;
      return clamp(idx, 0, N - 1);
    };

    // reset
    root.querySelectorAll<HTMLElement>(".nt-word").forEach((w) => w.classList.remove("in"));
    [notchWrap, bloom, intro, openLine, screen, tag, thatsBraino, oneMore, cowork, coworkMascot, visionMascot, visionInvert, ofcBg, ofcMascot, ofcCaption].forEach((el) => (el.style.opacity = "0"));
    glitch.style.opacity = "0"; cowork.classList.remove("invert-flash");
    invert.style.opacity = "0";
    notchWrap.classList.remove("cut-front");
    invert2.style.opacity = "0"; intro.classList.remove("invert-flash");
    thatsBrainoInvert.style.opacity = "0"; thatsBraino.classList.remove("invert-flash");
    notch.className = "nf-face on home dozing";
    notchWrap.className = "nt-notch";

    if (reduced) { tag.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".nt-tag .nt-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0, lastCls = "", lastMode = -1, lastStatus = "__", mascotBuilt = false, visionMascotBuilt = false, ofcMascotBuilt = false;
    let audioAnchor = 0; // wall-clock anchor servo-locked to the audio clock
    let playing = true, manualT = 0, startWall = performance.now();
    const controls = root.querySelector<HTMLElement>(".nt-scrubber");
    const slider = root.querySelector<HTMLInputElement>(".nt-scrub");
    const playBtn = root.querySelector<HTMLButtonElement>(".nt-play");
    const timeLabel = root.querySelector<HTMLElement>(".nt-time");
    if (slider) slider.max = String(T.end);

    // ACCUMULATE one line, driven by the passed clock t (so it scrubs). Word
    // spans + last active index are cached per host — DOM writes only on change.
    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(".nt-word")), last: -2 }; kinCache.set(host, c); }
      const active = t - start < 0 ? -1 : Math.min(c.spans.length - 1, Math.floor((t - start) / per));
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };

    // SEQUENCE — drives a host through N phrases in the SAME spot: builds the
    // active phrase's word spans on demand, then accumulates it with kinetic().
    // Used for any sentence longer than 4 words (split into ≤4-word phrases).
    const seqIdx = new Map<HTMLElement, number>();
    const sequence = (host: HTMLElement, phrases: string[][], starts: number[], sceneStart: number, sw: number, t: number) => {
      const rel = t - sceneStart;
      let idx = -1;
      for (let i = 0; i < phrases.length; i++) {
        const s0 = starts[i];
        const s1 = i + 1 < phrases.length ? starts[i + 1] : Infinity;
        if (rel >= s0 && rel < s1) { idx = i; break; }
      }
      if (idx === -1 && rel >= starts[starts.length - 1]) idx = phrases.length - 1;
      if (idx < 0) return;
      if (seqIdx.get(host) !== idx) {
        host.innerHTML = phrases[idx].map((w) => `<span class="nt-word">${w}</span>`).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);   // stale span cache — rebuild against the new phrase
      }
      kinetic(host, sceneStart + starts[idx], sw, t);
    };

    // The whole film from an ARBITRARY time t (ms) — deterministic → scrubbable.
    const render = (t: number) => {
      shimmer.style.opacity = "0";

      // ── TEXT scenes ──
      openLine.style.opacity = String(ramp(t, T.open, T.open + 120) * (1 - ramp(t, T.intro - 250, T.intro)));
      intro.style.opacity = String(ramp(t, T.intro, T.intro + 200) * (1 - ramp(t, T.boot - 250, T.boot)));
      screen.style.opacity = String(ramp(t, T.screen, T.screen + 110) * (1 - ramp(t, T.button - 200, T.button - 60)));
      tag.style.opacity = String(ramp(t, T.tag, T.tag + 120) * (1 - ramp(t, T.thatsBraino - 220, T.thatsBraino - 60)));
      // "That's Braino?" holds, "BrainoNotch" JOINS right next to it (nothing
      // clears, kinetic() only ever adds words), then the frame inverts —
      // "That's Braino?" keeps its colour and disappears into the white,
      // only "BrainoNotch" (.nt-tb-punch, see CSS) reads after the flip.
      thatsBraino.style.opacity = String(ramp(t, T.thatsBraino, T.thatsBraino + 100) * (1 - ramp(t, T.oneMore - 220, T.oneMore - 60)));
      kinetic(thatsBraino, T.thatsBraino, THATSBRAINO_SW, t);
      {
        const tbIdx = t < T.thatsBraino ? -1 : Math.min(THATSBRAINO_WORDS.length - 1, Math.floor((t - T.thatsBraino) / THATSBRAINO_SW));
        const tbInv = tbIdx === THATSBRAINO_WORDS.length - 1 && t < T.oneMore;
        thatsBraino.classList.toggle("invert-flash", tbInv);
        thatsBrainoInvert.style.opacity = tbInv ? "1" : "0";
      }
      // "Oh, and one more thing." — its own beat, right before Braino Co-Work
      oneMore.style.opacity = String(ramp(t, T.oneMore, T.oneMore + 100) * (1 - ramp(t, T.cowork - 250, T.cowork - 80)));
      sequence(oneMore, ONEMORE_PHRASES, oneMoreStarts, T.oneMore, 300, t);
      // "Braino" / "Co" / "Work" — PER-WORD frame invert, SAME mechanic as
      // "Let's f$cking go.": Braino normal, Co joins → match cut, Work joins →
      // match cut again (lands back on black), then the existing wink plays on.
      cowork.style.opacity = String(ramp(t, T.cowork, T.cowork + 120) * (1 - ramp(t, T.wink - 250, T.wink - 60)));
      kinetic(cowork, T.cowork, COWORK_SW, t);
      const coworkIdx = t < T.cowork ? -1 : Math.min(COWORK_WORDS.length - 1, Math.floor((t - T.cowork) / COWORK_SW));
      const coworkInv = coworkIdx >= 0 && t < T.wink && coworkIdx % 2 === 1;
      cowork.classList.toggle("invert-flash", coworkInv);
      glitch.style.opacity = coworkInv ? "1" : "0";
      // slot 0 ("Braino") is the standing mascot instead of text — same timing,
      // same match-cut logic on Co-/Work untouched.
      {
        const showMascot = coworkIdx === 0;
        coworkMascot.style.opacity = showMascot ? "1" : "0";
        if (showMascot) {
          if (!mascotBuilt && !coworkMascot.firstElementChild) {
            coworkMascot.innerHTML = namespacedWalker("ntc");
            mascotBuilt = true;
          }
          const wt = t - T.cowork;
          const wave = Math.sin(wt / 90) * 26;
          coworkMascot.querySelector<SVGGElement>("#__ntc_ra__")?.setAttribute("transform", `rotate(${wave} 92 59)`);
        }
      }
      sequence(openLine, OPEN_PHRASES, openStarts, T.open, P.open, t);
      kinetic(intro, T.intro, P.open, t);
      // "Let's f$cking go." — PER-WORD frame invert: each new word flips the whole
      // frame white↔black (like the match cut) and HOLDS until the next word.
      const introIdx = t < T.intro ? -1 : Math.min(INTRO_WORDS.length - 1, Math.floor((t - T.intro) / P.open));
      const introInv = introIdx >= 0 && t < T.boot && introIdx % 2 === 1;
      intro.classList.toggle("invert-flash", introInv);

      // invert2 is used by intro only now.
      invert2.style.opacity = introInv ? "1" : "0";
      kinetic(tag, T.tag, P.tag, t);
      // SEE-YOUR-SCREEN — three lines SEQUENTIALLY in the SAME dead-centre spot:
      // "He can now see your screen." clears → "(that you allow)" → "(Ofc)" big.
      // scMain: "With a vision model," shows, then FULLY CLEARS before the
      // mascot's window (no overlap) — a beat of black, then the mascot takes
      // over — then it returns for "now sees everything on your screen."
      {
        const rel = t - T.screen;
        let op: number;
        if (rel < st.mascotStart) {
          op = ramp(t, T.screen, T.screen + 90) * (1 - ramp(rel, st.mascotStart - 220, st.mascotStart - 60));
        } else if (rel < st.mascotEnd) {
          op = 0;   // the mascot beat owns the stage — text is fully gone
        } else {
          op = ramp(rel, st.mascotEnd, st.mascotEnd + 90) * (1 - ramp(t, T.screen + st.mainEnd, T.screen + st.mainEnd + 160));
        }
        scMain.style.opacity = String(op);
      }
      note1.style.opacity = String(ramp(t, T.screen + st.n1Start, T.screen + st.n1Start + 110) * (1 - ramp(t, T.screen + st.n1End, T.screen + st.n1End + 160)));
      // "of course" — the standing mascot waves, captioned like the notch's
      // own caption wing (same monospace typing style).
      {
        const ofcStart = T.screen + st.n2Start;
        const ofcOp = ramp(t, ofcStart, ofcStart + 200) * (1 - ramp(t, T.button - 200, T.button - 60));
        ofcBg.style.opacity = String(ofcOp);
        ofcMascot.style.opacity = String(ofcOp);
        ofcCaption.style.opacity = String(ofcOp);
        if (ofcOp > 0.01) {
          if (!ofcMascotBuilt && !ofcMascot.firstElementChild) {
            ofcMascot.innerHTML = namespacedWalker("ofcm");
            ofcMascotBuilt = true;
          }
          const ot = t - ofcStart;
          const wave = Math.sin(ot / 90) * 26;
          ofcMascot.querySelector<SVGGElement>("#__ofcm_ra__")?.setAttribute("transform", `rotate(${wave} 92 59)`);
          const txt = "of course";
          const chars = clamp(Math.floor((ot - 150) / 45), 0, txt.length);
          ofcCaption.textContent = txt.slice(0, chars);
        }
      }
      sequence(scMain, SCREEN_MAIN_PHRASES, st.mainStarts, T.screen, P.screen, t);
      kinetic(note1, T.screen + st.n1Start, P.screen, t);
      // "he" is REPLACED by the standing mascot + a match cut (same pattern as
      // Braino Co-Work). Text clears → a WAIT (black) → mascot fades in, waves
      // → the frame inverts white↔black, holding until the sentence continues.
      {
        const visionActive = t >= T.screen + st.mascotStart && t < T.screen + st.mascotEnd;
        const vt = t - (T.screen + st.mascotStart);
        const mascotShown = visionActive && vt >= VISION_PAUSE;   // the WAIT — nothing shows first
        const visionFlip = visionActive && vt >= VISION_FLIP_AT;
        visionMascot.style.opacity = mascotShown ? String(ramp(vt, VISION_PAUSE, VISION_PAUSE + VISION_MASCOT_IN)) : "0";
        visionInvert.style.opacity = visionFlip ? "1" : "0";
        screen.classList.toggle("invert-flash", visionFlip);
        if (mascotShown) {
          if (!visionMascotBuilt && !visionMascot.firstElementChild) {
            visionMascot.innerHTML = namespacedWalker("ntv");
            visionMascotBuilt = true;
          }
          const wave = Math.sin(vt / 90) * 26;
          visionMascot.querySelector<SVGGElement>("#__ntv_ra__")?.setAttribute("transform", `rotate(${wave} 92 59)`);
        }
      }

      const inBoot = t >= T.boot && t < T.see;
      const inSee = t >= T.see && t < T.screen;         // notch looks DOWN at the screen
      // the ONE notch-pill sequence: types "Introducing" → "Braino" → "What does
      // he do?", THEN the SAME pill runs the fast mode-words flicker, THEN
      // caption swaps to "Notch" and the frame inverts white↔black.
      const inCut = t >= T.button && t < T.tag;
      const cutBt = inCut ? t - T.button : -1;
      const inCutModes = inCut && cutBt >= CUT_PRE_DUR && cutBt < CUT_PRE_DUR + MODES_TOTAL;
      const cutFlipped = inCut && cutBt >= CUT_PRE_DUR + MODES_TOTAL;   // "Notch" is the beat the frame inverts on
      const inWink = t >= T.wink;

      // ── the ONE island: boots, GREETS, LOOKS at the screen, returns for the
      //    Introducing/Braino/what-does-he-do/fast-words/Notch cut, returns
      //    again for the closing wink. It never shares the stage with text. ──
      let islandOp = 0;
      if (t >= T.boot && t < T.screen) islandOp = ramp(t, T.boot, T.boot + 400) * (1 - ramp(t, T.screen - 500, T.screen - 200));
      else if (inCut) islandOp = ramp(t, T.button, T.button + 200) * (1 - ramp(t, T.tag - 250, T.tag - 80));
      // the close: form + wink, then a HARD CUT to black (no fade)
      else if (inWink) islandOp = ramp(t, T.wink + 200, T.wink + 500) * (t < T.wink + 3500 ? 1 : 0);
      notchWrap.style.opacity = String(islandOp);
      notchWrap.classList.toggle("seeing", inSee);
      notchWrap.classList.toggle("thinking", inCutModes);
      notchWrap.classList.toggle("eyes-only", inWink);
      // "cut-front" lifts the pill above the frame-invert overlay (z-index), so its
      // caption stays visible when the background flips to white; "cut-flip" swaps
      // the caption to black text for that half.
      notchWrap.classList.toggle("cut-front", inCut);
      notchWrap.classList.toggle("cut-flip", cutFlipped);

      // PRE-BOOT — force the resting state while the notch is still INVISIBLE.
      // Without this, a loop wrap leaves him "awake nf-wink" from the ending and
      // the dozing flip only lands AT boot — eyes visibly closing on-screen.
      if (t < T.boot) {
        const cls = "nf-face on home dozing";
        if (cls !== lastCls) {
          notch.className = cls; lastCls = cls; lastStatus = "";
          setNotchStatus(notch, "");
          if (capEl) capEl.textContent = "";
        }
      }

      // BOOT — VERBATIM to the Mac app runNotchBoot():
      //   dozing (eyes closed) → slow perimeter line (900→3600ms) → nf-auth
      //   "authenticating" → nf-coral wave → nf-auth-ok (green verdict, eyes
      //   open) → captioning + nf-wink, types "how you doing?" → stays.
      if (inBoot) {
        const bt = t - T.boot;
        const sh = ramp(bt, 900, 3600);                       // the very slow line, 2.7s
        shimmer.style.opacity = String(ramp(bt, 900, 1150) * (1 - ramp(bt, 3400, 3900)));
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(ramp(t, T.boot, T.boot + 200) * sh * (1 - ramp(bt, 5600, 6100)) * 0.9);
        let cls = "nf-face on home dozing", status = "", cap = "";
        if (bt >= 6160) {                                     // Beat 5: spread, wink, type hello
          cls = "nf-face on home awake captioning nf-wink";
          cap = GREET_CAP.slice(0, clamp(Math.floor((bt - 6160) / 55), 0, GREET_CAP.length));
        } else if (bt >= 5460) cls = "nf-face on home awake nf-auth-ok";      // Beat 4: green verdict, eyes open
        else if (bt >= 4700) cls = "nf-face on home dozing nf-coral";         // Beat 3b: coral wave
        else if (bt >= 3600) { cls = "nf-face on home dozing nf-auth"; status = "authenticating"; } // Beat 3
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; }
        if (status !== lastStatus) { setNotchStatus(notch, status); lastStatus = status; }
        if (capEl && capEl.textContent !== cap) capEl.textContent = cap;
      }

      // SEE — the caption drops and the notch looks DOWN at your screen, eyes
      // drifting low and darting around (the .seeing class drives the pupils)
      if (inSee) {
        const cls = "nf-face on home awake";
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }

      // MATCH CUT — ONE continuous notch-pill sequence: types "Introducing" →
      // "Braino" → "What does he do?", THEN the SAME pill runs the fast
      // mode-words flicker (VERBATIM to the Mac notch's thinking — busy +
      // captioning, fixed pill width via .thinking), THEN caption swaps to
      // "Notch" and the whole frame INVERTS white↔black in one beat.
      if (inCut) {
        const baseCls = inCutModes ? "nf-face on home awake busy captioning" : "nf-face on home awake captioning";
        if (baseCls !== lastCls) { notch.className = baseCls; lastCls = baseCls; setNotchStatus(notch, ""); lastMode = -1; }
        let word: string;
        if (cutBt < CUT_PRE_DUR) {
          word = CUT_PRE_WORDS[clamp(Math.floor(cutBt / CUT_CAP_HOLD), 0, CUT_PRE_WORDS.length - 1)];
        } else if (inCutModes) {
          const idx = modeIndexAt(cutBt - CUT_PRE_DUR);
          lastMode = idx;
          word = idx === N - 1 ? MODE_WORDS[idx] : `${MODE_WORDS[idx]}…`;
        } else {
          word = "Notch";
        }
        if (capEl && capEl.textContent !== word) capEl.textContent = word;
        invert.style.opacity = cutFlipped ? "1" : "0";
      } else {
        if (lastMode !== -1) lastMode = -1;
        invert.style.opacity = "0";
      }

      // WINK — the island forms at dead centre with the perimeter shimmer, then
      // Braino's CORAL wave washes through (his colours, same as boot), his eyes
      // open, he WINKS, and it HARD-CUTS to black.
      if (inWink) {
        const rt = t - T.wink;
        const sh = ramp(rt, 250, 1350);
        shimmer.style.opacity = String(ramp(rt, 250, 500) * (1 - ramp(rt, 2700, 3200)));
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(ramp(rt, 250, 550) * (1 - ramp(rt, 2700, 3300)) * 0.8);
        let cls = "nf-face on home awake";
        if (rt >= 2100) cls = "nf-face on home awake nf-wink";        // the wink — 0.6s, plays out FULLY
        else if (rt >= 1100) cls = "nf-face on home awake nf-coral";  // Braino's coral shimmer
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }
    };

    // ── playback loop + scrubber ──
    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    const setPlaying = (p: boolean) => {
      playing = p;
      if (playBtn) playBtn.textContent = p ? "❚❚" : "▶";
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = manualT / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => {
      manualT = clamp(ms, 0, T.end);
      audioAnchor = 0; // force a clean re-lock of the smoothed clock
      if (trackLoaded && audioEl) audioEl.currentTime = manualT / 1000;
    };

    let lastUi = 0;
    const loop = () => {
      if (playing) {
        if (trackLoaded && audioEl) {
          // the media clock steps in chunks — smooth it against the wall clock
          const at = audioEl.currentTime * 1000;
          const wall = performance.now();
          if (audioAnchor === 0 || Math.abs(wall - audioAnchor - at) > 250) audioAnchor = wall - at; // (re)lock on start/seek
          else audioAnchor += (wall - at - audioAnchor) * 0.06;                                      // gentle servo
          manualT = wall - audioAnchor;
        } else {
          manualT = performance.now() - startWall;
        }
        if (manualT >= T.end) { seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } else { startWall = performance.now(); } } // LOOP
      }
      render(manualT);
      // the glassy scrubber (backdrop blur) repaints on every update — throttle
      // its UI to ~8fps so the FILM keeps the full frame budget
      const now = performance.now();
      if (now - lastUi > 120) {
        lastUi = now;
        if (slider) {
          if (document.activeElement !== slider) slider.value = String(Math.round(manualT));
          slider.style.setProperty("--p", `${(manualT / T.end) * 100}%`);
        }
        if (timeLabel) timeLabel.textContent = fmt(manualT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const frame = q(".nt-frame");
    const onScrub = (e: Event) => { setPlaying(false); seek(+(e.target as HTMLInputElement).value); };
    const onPlay = () => { if (manualT >= T.end) { seek(0); } setPlaying(!playing); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); onPlay(); }
      else if (e.key === "ArrowRight") { setPlaying(false); seek(manualT + (e.shiftKey ? 1000 : 33)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); seek(manualT - (e.shiftKey ? 1000 : 33)); }
    };
    // Netflix controls: surface on pointer move, hide after idle (unless hovering the bar)
    let hideTimer = 0, overBar = false;
    const showControls = () => {
      document.body.classList.add("nt-controls");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => { if (!overBar) document.body.classList.remove("nt-controls"); }, 2200);
    };
    const onBarEnter = () => { overBar = true; showControls(); };
    const onBarLeave = () => { overBar = false; showControls(); };
    addEventListener("pointermove", showControls);
    controls?.addEventListener("pointerenter", onBarEnter);
    controls?.addEventListener("pointerleave", onBarLeave);
    showControls();

    slider?.addEventListener("input", onScrub);
    playBtn?.addEventListener("click", onPlay);
    root.querySelector(".nt-step-back")?.addEventListener("click", () => { setPlaying(false); seek(manualT - 33); });
    root.querySelector(".nt-step-fwd")?.addEventListener("click", () => { setPlaying(false); seek(manualT + 33); });
    controls?.addEventListener("click", (e) => e.stopPropagation());
    frame.addEventListener("click", onPlay);
    addEventListener("keydown", onKey);
    const onFsChange = () => { if (document.fullscreenElement === frame) { seek(0); setPlaying(true); } };
    document.addEventListener("fullscreenchange", onFsChange);

    const log = (msg: string) => {
      if (logEl) logEl.textContent = msg;
      // eslint-disable-next-line no-console
      console.log("[BeatSync]", msg);
    };

    // Fit the film to the track: the WORDS keep their fast, accelerating cadence
    // (untouched); the HOLD is solved so the film spans the track, and every
    // scene start snaps to the nearest beat / downbeat so the cuts hit the music.
    const applyBeats = (a: BeatAnalysis) => {
      // HARD limit: the full film (wink + cut-to-black included) must land inside
      // min(45s, track). Beat-snapping pushes scenes LATER (up to a downbeat per
      // snap), so solve the hold, measure the snapped overshoot, and re-solve
      // with the drift absorbed — a couple of iterations converge.
      const target = Math.min(TARGET_MS, a.durationMs - 200);
      const snap = (ms: number, down: boolean) =>
        snapToBeat(ms, down ? a.downbeats : a.beats, Math.max(0, ms - 350));
      let goal = target;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        recomputeStarts();
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;                // absorb the snap drift and re-solve
      }
      // belt-and-braces: keep the ending inside the limit, but NEVER pull the
      // wink back onto the tagline/match cut — the close must play out in order
      const lastOk = target - WINK_TAIL;
      const winkFloor = T.cowork + COWORK_DUR;   // wink must never land before Braino/Co/Work finishes
      if (T.wink > lastOk) T.wink = Math.round(Math.max(winkFloor, lastOk));
      T.end = T.wink + WINK_TAIL;
      // ABSOLUTE clamp: T.end must NEVER exceed the real audio file. If it did,
      // the audio stalls at its true end while the render loop still expects
      // more time — the two clocks fight, producing the "endless blinking"
      // oscillation right at the boundary. This is the last word, no exceptions.
      const hardEnd = Math.round(a.durationMs - 60);
      if (T.end > hardEnd) {
        T.wink = Math.max(T.cowork + 100, hardEnd - WINK_TAIL);
        T.end = Math.min(hardEnd, T.wink + WINK_TAIL);
      }
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
    };

    const onFile = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      log(`Analyzing "${file.name}"…`);
      setPlaying(false);
      try {
        const buf = await file.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        applyBeats(a);
        if (audioEl) { audioEl.src = URL.createObjectURL(file); audioEl.load(); }
        try {
          localStorage.setItem("nt-beatsync", JSON.stringify({ name: file.name, bpm: a.bpm, durationMs: a.durationMs, timeline: T }));
        } catch { /* storage blocked */ }
        log(`${file.name} · ${a.bpm} BPM · ${a.beats.length} beats · synced ✓`);
        seek(0); setPlaying(true);
      } catch (err) {
        log(`Couldn't analyze that file. ${(err as Error)?.message || ""}`);
      }
    };
    fileInput?.addEventListener("change", onFile);

    // AUTO-SYNC to the "Don't Blink" track on load. Analyse it, beat-snap the
    // film, then attempt to play (browsers may block autoplay until the user
    // clicks — the film stays ready and the play button / frame-click starts it).
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dont-blink.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        if (slider) slider.max = String(T.end);
        seek(0); manualT = 0;
        // try to autoplay in sync; if the browser blocks it, leave the film
        // paused at 0 and ready — one click on the frame / play starts it
        if (audioEl) {
          audioEl.src = "/dont-blink.mp3"; audioEl.load(); audioEl.currentTime = 0;
          try {
            await audioEl.play();
            playing = true; if (playBtn) playBtn.textContent = "❚❚";
            log(`Don't Blink · ${a.bpm} BPM · synced ✓`);
          } catch {
            playing = false; if (playBtn) playBtn.textContent = "▶";
            log(`Don't Blink · ${a.bpm} BPM · synced ✓ — press play ▶`);
          }
        }
      } catch (err) {
        if (!cancelled) log(`Couldn't auto-sync Don't Blink (${(err as Error)?.message || "?"}). Upload a track to sync.`);
      }
    })();

    return () => {
      cancelled = true;
      fileInput?.removeEventListener("change", onFile);
      cancelAnimationFrame(raf);
      slider?.removeEventListener("input", onScrub);
      playBtn?.removeEventListener("click", onPlay);
      frame.removeEventListener("click", onPlay);
      removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      removeEventListener("pointermove", showControls);
      controls?.removeEventListener("pointerenter", onBarEnter);
      controls?.removeEventListener("pointerleave", onBarLeave);
      window.clearTimeout(hideTimer);
      document.body.classList.remove("nt-controls");
    };
  }, [runId]);

  const replay = () => setRunId((n) => n + 1);
  const toggleGrids = () => {
    rootRef.current?.querySelector(".nt-frame")?.classList.toggle("grids");
  };
  const goFullscreen = () => {
    const frame = rootRef.current?.querySelector<HTMLElement>(".nt-frame");
    if (!frame) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="nt-films">
      <section className="nt" ref={rootRef}>
        <div className="nt-frame">
          <div className="nt-stage">
            {/* open/screen-main are filled at runtime by sequence() —
               each sentence over 4 words plays as ≤4-word phrases, same spot */}
            <div className="nt-open" />
            <div className="nt-intro">{INTRO_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="nt-screen">
              <div className="nt-screen-main" />
              <div className="nt-screen-note nt-note-1">{NOTE1_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
              {/* "of course" — full WHITE background (same as before), Braino
                 stands in it and waves, with a caption BUBBLE above him,
                 styled like the notch's own caption wing */}
              <div className="nt-ofc-bg" />
              <div className="nt-ofc-mascot" dangerouslySetInnerHTML={{ __html: namespacedWalker("ofcm") }} />
              <div className="nt-ofc-caption">of course</div>
              <div className="nt-vision-mascot" />
              <div className="nt-vision-invert" />
            </div>
            <div className="nt-tag">{TAG_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="nt-thatsbraino">{THATSBRAINO_WORDS.map((w, i) => <span key={i} className={i === THATSBRAINO_WORDS.length - 1 ? "nt-word nt-tb-punch" : "nt-word"}>{w}</span>)}</div>
            <div className="nt-thatsbraino-invert" />
            <div className="nt-onemore" />
            <div className="nt-cowork-mascot" />
            <div className="nt-cowork">{COWORK_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="nt-glitch" />

            {/* ONE island the whole way — boots, GREETS, thinks, winks */}
            <div className="nt-notch">
              <NotchFace className="on home dozing" />
              <svg className="nt-shimmer" viewBox="0 0 190 55" aria-hidden="true">
                <defs>
                  <linearGradient id="nt-glow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFFFFF" /><stop offset=".45" stopColor="#CFE0FF" />
                    <stop offset=".8" stopColor="#7AA2FF" /><stop offset="1" stopColor="#F0A86B" />
                  </linearGradient>
                </defs>
                <path className="nt-p nt-p-glow" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#nt-glow)" fill="none" />
                <path className="nt-p nt-p-core" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#nt-glow)" fill="none" />
              </svg>
            </div>
            <div className="nt-bloom" />

            {/* "Let's f$cking go." double-strobe: white/black inverts TWICE, fast */}
            <div className="nt-invert2" />

            {/* the Braino/Notch cut: captioned in the pill itself, invert white/black */}
            <div className="nt-invert" />
          </div>
        </div>
        <audio className="nt-audio" preload="auto" />

        <div className="nt-veil" aria-hidden="true" />
        {/* frame-by-frame scrubber */}
        <div className="nt-scrubber">
          <button className="nt-play" title="Play / Pause (space)">❚❚</button>
          <button className="nt-step-back" title="Back 1 frame (←)">◀|</button>
          <input className="nt-scrub" type="range" min="0" max={String(DEFAULT_T.end)} defaultValue="0" step="1" />
          <button className="nt-step-fwd" title="Forward 1 frame (→)">|▶</button>
          <span className="nt-time">0.00s</span>
          <button className="nt-replaybtn" onClick={replay} title="Restart">⟲</button>
          <button className="nt-fs" onClick={goFullscreen} title="Fullscreen">⛶</button>
          <button className="nt-grids" onClick={toggleGrids} title="Toggle centre guides">▦</button>
          <label className="nt-upload" title="Upload an MP3 to beat-sync the text">
            ♪ Sync track
            <input className="nt-file" type="file" accept="audio/*" hidden />
          </label>
        </div>
        <div className="nt-log" />
      </section>
    </div>
  );
}
