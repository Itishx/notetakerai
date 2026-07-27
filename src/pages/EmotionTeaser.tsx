import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import "./emotion-teaser.css";

// Self-contained walker instance for the closing "music mode" dancer inside
// the notch — same collision-avoidance rename /notch's cowork mascot and
// content.js's own music-mode dancer use (a shared #id across instances
// silently causes "the white brain" bug).
const namespacedWalker = (prefix: string) =>
  BRAINO_WALKER_SVG
    .replace(/__sbwk_/g, `__${prefix}_`)
    .replace(/sbb-(fill|dark|glow)/g, `${prefix}-$1`)
    .replace(/sbwk-(fill|dark|glow)/g, `${prefix}-$1`);

/* ============================================================================
   /aware — "Braino: Emotional Maturity". Twin of /notch: same rAF-driven
   deterministic render(t), same stamp-cut kinetic type engine (kinetic /
   sequence / phraseSeq / fuse "+" / emphasis "*" / swap-stack / word chunking
   — the "x2x2 formula" from /dontblink, see chunkWord() below), same font,
   same 3-hits-only beat-snap rule — but its OWN track (one.mp3, played from
   2:25 in), auto-analyzed and beat-matched at runtime exactly like /notch
   does with its own track, just a different file. Dark red / white palette
   (deep red base, white text, white match-cut invert instead of black/white)
   — untouched, only the cut/chunk philosophy is imported from /dontblink.

   Ends right on the "Hu"+"man." match cut, then loops. Full script, full
   words — no content is trimmed. Only the pace changed: no notch cutaway
   scene anymore (was its own 2.9s beat, cut entirely), and every stamp
   runs faster than it used to (SW ~220-260ms vs the original 280-400ms).

     1  open        "Most people have a problem with AI."
     2  complaint   "He's always" "validating."
     3  contrast    "But not" "Braino."
     4  why         "Here's why."
     5  poet        "He was trained" -> MATCH CUT "Deliberately trained." ->
                    "by a *poet.*" MATCH CUT — both beats of this line cut now
     6  delib       "To be the *most*" -> MATCH CUT "emotionally intelligent"
                    -> "AI. Ever."
     6b engine      "He does not sugarcoat." MATCH CUT -> "Trained on you."
                    "Reads what you don't say." -> "Calls you out." MATCH CUT
                    -> "Gently." "Runs on his own" -> "*Emotional Engine."
                    BIG Apple-style match cut, biggest text in the scene,
                    one-shot shimmer
     7  proof       "Way beyond a chatbot." "Not "how can I / assist you
                    today."" "Just a guy." "In your notch." MATCH CUT
                    "Unbothered."
     8  turn        "No "as an AI, I can't relate."" "He relates." "Because
                    he's been" -> MATCH CUT "*taught* to."
     9  close       "His intelligence?" "Artificial." "His understanding" "of
                    emotions?" "Hu" -> MATCH CUT -> "+man." (fused reveal) —
                    the film ends here, holds, loops. The notch comes back
                    for this hold, and only this hold — nothing else uses it.
   Match-cut rule: the invert flip IS the effect — word-stamp/fade animation
   is suppressed on any line while its match-cut is active (.invert-flash
   .et-word.in { animation: none }), so the cut reads as one clean flip.
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── Syllable chunking ("the x2x2 formula") — same engine as /dontblink's
// IntroTeaser.tsx (copied verbatim, see that file for the full rationale):
// long words split at their median letter into a "+"-fused pair so every
// beat has something stamping in, instead of a whole word sitting static
// on one frame. Flip CHUNK_WORDS to false to go back to whole words —
// nothing else needs touching, every index derives from the map below.
const CHUNK_WORDS = true;
const CHUNK_MIN_LEN = 4;
const CHUNK_SKIP = new Set([
  "your", "yours", "that", "with", "from", "they", "them", "their", "there",
  "have", "been", "were", "will", "just", "else", "what", "when", "than",
  "then", "these", "those", "some", "such", "into", "onto", "over",
  "only", "also", "both", "each", "same", "very", "much", "more", "most",
]);
function chunkWord(word: string): string[] {
  if (!CHUNK_WORDS) return [word];
  const marker = word.startsWith("+") || word.startsWith("*") ? word[0] : "";
  if (marker === "*") return [word];
  const m = word.slice(marker.length).match(/^([^A-Za-z0-9]*)([A-Za-z0-9’']+)(.*)$/);
  if (!m) return [word];
  const [, pre, core, post] = m;
  if (core.length < CHUNK_MIN_LEN || CHUNK_SKIP.has(core.toLowerCase())) return [word];
  const cut = Math.floor(core.length / 2);
  return [`${marker}${pre}${core.slice(0, cut)}`, `+${core.slice(cut)}${post}`];
}
type Chunked = { words: string[]; wordToChunks: number[][]; chunkToWord: number[] };
function chunkPhrase(words: string[]): Chunked {
  const out: string[] = [];
  const wordToChunks: number[][] = [];
  const chunkToWord: number[] = [];
  words.forEach((w, wi) => {
    const idxs: number[] = [];
    for (const c of chunkWord(w)) { idxs.push(out.length); chunkToWord.push(wi); out.push(c); }
    wordToChunks.push(idxs);
  });
  return { words: out, wordToChunks, chunkToWord };
}
const chunkScript = (phrases: string[][]) => phrases.map(chunkPhrase);
const chunkedWords = (cs: Chunked[]) => cs.map((c) => c.words);
// last chunk index of an original word — what match-cut landings compare against
const lastChunkOf = (c: Chunked, wordIdx: number) => c.wordToChunks[wordIdx][c.wordToChunks[wordIdx].length - 1];

const OPEN_PHRASES = chunkedWords(chunkScript([["Most", "people"], ["have", "a", "problem"], ["with", "AI."]]));
const OPEN_SW = 220;
const OPEN_GAPS: number[] = [];

// one line, holds — not split into two beats
const COMPLAINT_PHRASES = chunkedWords(chunkScript([["He's", "always", "*validating."]]));
const COMPLAINT_SW = 220;
const COMPLAINT_GAPS: number[] = []; COMPLAINT_GAPS[0] = 300;   // the hold

const CONTRAST_PHRASES = chunkedWords(chunkScript([["But", "not"], ["Braino."]]));
const CONTRAST_SW = 240;
const CONTRAST_GAPS: number[] = [];

// chunked like every other line now — "Here's" -> "Her"+"+e's" — this line
// was the one holdout still using whole words.
const WHY_CHUNKS = chunkPhrase(["Here's", "why."]);
const WHY_WORDS = WHY_CHUNKS.words;
const WHY_SW = 240;

// full script restored — only the pace changed this round, not the words.
// No notch cutaway scene anymore though (was its own 2.9s beat, cut
// entirely per direction, separate from the word-count question).
const POET_CHUNKS = chunkScript([["He", "was", "trained"], ["Deliberately", "trained."], ["by", "a", "*poet."]]);
const POET_PHRASES = chunkedWords(POET_CHUNKS);
const POET_SW = 260;
const POET_GAPS: number[] = []; POET_GAPS[0] = 150; POET_GAPS[1] = 200;   // room after the match cut before "by a poet." joins

// the pitch, right after the poet reveal — the emotional-engine claim in plain
// words. Currently the film's ending: holds here, then loops.
const DELIB_CHUNKS = chunkScript([["To", "be", "the", "*most"], ["emotionally", "intelligent"], ["AI.", "Ever."]]);
const DELIB_PHRASES = chunkedWords(DELIB_CHUNKS);
const DELIB_SW = 240;
const DELIB_GAPS: number[] = []; DELIB_GAPS[0] = 200;   // extra breath before "emotionally intelligent" lands

// the technical beat — plain, upfront, no sugar coating; MATCH CUT lands on
// "Calls you out." right before "Gently." joins, then "Emotional Engine."
// lands its own BIG cut.
const ENGINE_CHUNKS = chunkScript([
  ["He", "does", "not", "sugarcoat."],
  ["Trained", "on", "you."],
  ["Reads", "what", "you", "don't", "say."],
  ["Calls", "you", "out."],
  ["Gently."],
  ["Runs", "on", "his", "own"],
  ["*Emotional", "Engine."],
]);
const ENGINE_PHRASES = chunkedWords(ENGINE_CHUNKS);
const ENGINE_SW = 220;
const ENGINE_GAPS: number[] = []; ENGINE_GAPS[5] = 260;   // breath before "Emotional Engine." lands its big reveal

// he's not a chatbot — plain proof, back to normal flowing phrases (no
// back-to-back match cuts). Just ONE match cut, on "Unbothered." landing —
// plain invert flash, no size pop.
const PROOF_CHUNKS = chunkScript([
  ["Way", "beyond", "a", "chatbot."],
  ["Not", "“how", "can", "I"],
  ["assist", "you", "today.”"],
  ["Just", "a", "guy."],
  ["In", "your", "notch."],
  ["Unbothered."],
]);
const PROOF_PHRASES = chunkedWords(PROOF_CHUNKS);
const PROOF_SW = 220;
const PROOF_GAPS: number[] = [];

// the turn — he relates, because he's actually built to. Plain, no cuts —
// the only other match cut this close to the end is "Hu"+"man." in CLOSE_PHRASES.
const TURN_CHUNKS = chunkScript([
  ["No", "“as", "an", "AI,"],
  ["I", "can't", "relate.”"],
  ["He", "relates."],
  ["Because", "he's", "been"],
  ["*taught", "to."],
]);
const TURN_PHRASES = chunkedWords(TURN_CHUNKS);
const TURN_SW = 220;
const TURN_GAPS: number[] = [];

// the close — artificial intelligence, human understanding. "Hu" + "+man."
// fuses flush (the "+" convention) right as the match cut fires.
const CLOSE_CHUNKS = chunkScript([
  ["His", "intelligence?"],
  ["Artificial."],
  ["His", "understanding"],
  ["of", "emotions?"],
  ["Hu", "+man."],
]);
const CLOSE_PHRASES = chunkedWords(CLOSE_CHUNKS);
const CLOSE_SW = 240;
const CLOSE_GAPS: number[] = []; CLOSE_GAPS[3] = 260;   // extra breath right before the reveal
// holds on "Hu"+"man." — the film ends here, then loops. The notch comes
// back for this hold: dozing -> eyes open -> expands downward -> dances,
// same 4-phase choreography /notch's own now-playing pill uses. Trimmed
// from 3600 to fit the ~25s runtime target — still enough for a real beat.
const CLOSE_HOLD = 1800;
let CLOSE_DANCE_HZ = 120 / 60;   // fallback BPM guess — overwritten with the real analyzed BPM in applyBeats()

const GAP = 140;

const phraseSw = (sw: number | number[], i: number) =>
  Array.isArray(sw) ? (sw[i] ?? sw[sw.length - 1]) : sw;
const phraseSeq = (phrases: string[][], sw: number | number[], gaps?: number[]) => {
  const starts: number[] = [];
  let acc = 0;
  phrases.forEach((ph, i) => {
    starts.push(acc);
    acc += ph.length * phraseSw(sw, i) + (gaps?.[i] ?? GAP);
  });
  return { starts, total: acc };
};

const OPEN_TOTAL = phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).total;
const COMPLAINT_TOTAL = phraseSeq(COMPLAINT_PHRASES, COMPLAINT_SW, COMPLAINT_GAPS).total;
const CONTRAST_TOTAL = phraseSeq(CONTRAST_PHRASES, CONTRAST_SW, CONTRAST_GAPS).total;
const WHY_TOTAL = WHY_WORDS.length * WHY_SW + GAP;
const POET_TOTAL = phraseSeq(POET_PHRASES, POET_SW, POET_GAPS).total;
const DELIB_TOTAL = phraseSeq(DELIB_PHRASES, DELIB_SW, DELIB_GAPS).total;
const ENGINE_TOTAL = phraseSeq(ENGINE_PHRASES, ENGINE_SW, ENGINE_GAPS).total;
const PROOF_TOTAL = phraseSeq(PROOF_PHRASES, PROOF_SW, PROOF_GAPS).total;
const TURN_TOTAL = phraseSeq(TURN_PHRASES, TURN_SW, TURN_GAPS).total;
const CLOSE_TOTAL = phraseSeq(CLOSE_PHRASES, CLOSE_SW, CLOSE_GAPS).total;

// Build the timeline. Opening (open/complaint/contrast/why) keeps its tight,
// fast-sync gaps — that's the part that landed well. Everything after
// "Here's why" gets noticeably more breathing room (bigger H multipliers),
// same principle as /notch: only the HOLD between scenes changes, per-word
// cadence (SW/GAP) is untouched either way.
const buildTimeline = (H: number, snap?: (ms: number, down: boolean) => number) => {
  let last = -1;
  const S2 = (ms: number, doSnap = false) => {
    let v = doSnap && snap ? snap(ms, true) : Math.round(ms);
    if (v <= last + 120) v = Math.round(Math.max(ms, last + 120));
    last = v;
    return v;
  };
  const open = S2(300);
  const complaint = S2(open + OPEN_TOTAL + H * 0.1);
  const contrast = S2(complaint + COMPLAINT_TOTAL + H * 0.12);
  const why = S2(contrast + CONTRAST_TOTAL + H * 0.12);
  const poet = S2(why + WHY_TOTAL + H * 0.24);
  const delib = S2(poet + POET_TOTAL + H * 0.24);
  const engine = S2(delib + DELIB_TOTAL + H * 0.24);
  const proof = S2(engine + ENGINE_TOTAL + H * 0.22);
  const turn = S2(proof + PROOF_TOTAL + H * 0.22);
  const close = S2(turn + TURN_TOTAL + H * 0.22);
  // the film ends right on the "Hu"+"man." match cut: hold on it, then loop.
  // GAP is subtracted since it's appended after CLOSE_PHRASES' last phrase
  // too (phraseSeq adds it unconditionally) — landTime is when "man." itself
  // finishes stamping in, not the trailing padding after it.
  const end = Math.round(close + (CLOSE_TOTAL - GAP) + CLOSE_HOLD);
  return { open, complaint, contrast, why, poet, delib, engine, proof, turn, close, end };
};

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

// full script (every word) at the tightened pace (SW ~220-260ms, GAP 140ms,
// no notch cutaway) naturally runs ~37.5s even at H's floor — that's the
// real target now, not an arbitrary number, so the solver isn't fighting to
// stretch OR compress it.
const TARGET_MS = 37500;
// new track (one.mp3) plays from 2:25 in, not from 0:00 — "t=0" in the film
// is "2:25" in the mp3, everything (playback + beat/downbeat arrays) is
// shifted by this amount, see applyBeats(). NOTE: one.mp3 is only 3:37.15
// total, and the full film (open -> ... -> the "Hu"+"man." close) runs
// ~56-67s depending on the solved hold — starting at 3:30 (or the originally
// requested 3:47, which is PAST the file's end entirely) left only a few
// seconds of real track, and the code hard-clamps the whole scrubber/timeline
// to whatever's left in the file (see hardEnd below) — that's what chopped
// the visible film down to "7 seconds". 2:25 leaves ~72s of tail, comfortably
// past the film's own max length, so nothing gets truncated.
const AUDIO_START_OFFSET_MS = 145000;
const DEFAULT_H = solveHold(TARGET_MS);
const DEFAULT_T = buildTimeline(DEFAULT_H);

export default function EmotionTeaser() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("et-page");
    return () => document.body.classList.remove("et-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const openEl = q(".et-open");
    const complaint = q(".et-complaint");
    const contrast = q(".et-contrast");
    const why = q(".et-why");
    const notchWrap = q(".et-notch");
    const notch = q(".et-notch .nf-face");
    const capEl = notch.querySelector<HTMLElement>(".nf-cap-l");
    const poet = q(".et-poet");
    const delib = q(".et-delib");
    const engine = q(".et-engine");
    const proof = q(".et-proof");
    const turn = q(".et-turn");
    const close = q(".et-close");
    const dancerHost = notch.querySelector<HTMLElement>(".nf-dancer");
    const invert = q(".et-invert");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let T = { ...DEFAULT_T };
    let holdMs = DEFAULT_H;

    const poetStarts = phraseSeq(POET_PHRASES, POET_SW, POET_GAPS).starts;
    const delibStarts = phraseSeq(DELIB_PHRASES, DELIB_SW, DELIB_GAPS).starts;
    const engineStarts = phraseSeq(ENGINE_PHRASES, ENGINE_SW, ENGINE_GAPS).starts;
    const proofStarts = phraseSeq(PROOF_PHRASES, PROOF_SW, PROOF_GAPS).starts;
    const turnStarts = phraseSeq(TURN_PHRASES, TURN_SW, TURN_GAPS).starts;
    const closeStarts = phraseSeq(CLOSE_PHRASES, CLOSE_SW, CLOSE_GAPS).starts;
    const openStarts = phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).starts;
    const complaintStarts = phraseSeq(COMPLAINT_PHRASES, COMPLAINT_SW, COMPLAINT_GAPS).starts;
    const contrastStarts = phraseSeq(CONTRAST_PHRASES, CONTRAST_SW, CONTRAST_GAPS).starts;

    const audioEl = root.querySelector<HTMLAudioElement>(".et-audio");
    let trackLoaded = false;

    const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

    // reset
    root.querySelectorAll<HTMLElement>(".et-word").forEach((w) => w.classList.remove("in"));
    [openEl, complaint, contrast, why, poet, delib, engine, proof, turn, close].forEach((el) => (el.style.opacity = "0"));
    invert.style.opacity = "0";
    [poet, delib, engine, close, proof, turn].forEach((el) => el.classList.remove("invert-flash"));
    notchWrap.style.opacity = "0"; notch.className = "nf-face on home dozing"; setNotchStatus(notch, "");
    notchWrap.style.transform = ""; notchWrap.classList.remove("et-dance-pos");
    if (capEl) capEl.textContent = "";

    if (reduced) { close.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".et-close .et-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0;
    let playing = true, manualT = 0, startWall = performance.now();

    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const seqIdx = new Map<HTMLElement, number>();
    const resetSceneCaches = () => { kinCache.clear(); seqIdx.clear(); };

    const kineticAt = (host: HTMLElement, active: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(":scope > .et-word")), last: -2 }; kinCache.set(host, c); }
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      const c = kinCache.get(host);
      const len = c ? c.spans.length : host.querySelectorAll(".et-word").length;
      const active = t - start < 0 ? -1 : Math.min(len - 1, Math.floor((t - start) / per));
      kineticAt(host, active);
    };
    const sequence = (host: HTMLElement, phrases: string[][], starts: number[], sceneStart: number, sw: number | number[], t: number) => {
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
        host.innerHTML = phrases[idx].map((w) => {
          const fuse = w.startsWith("+");
          const emph = w.startsWith("*");
          const cls = fuse ? " nt-fuse" : emph ? " nt-emph" : "";
          const text = fuse || emph ? w.slice(1) : w;
          return `<span class="et-word${cls}">${text}</span>`;
        }).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);
      }
      kinetic(host, sceneStart + starts[idx], phraseSw(sw, idx), t);
    };

    let firedDeliberately = false, firedPoet = false, firedIntelligent = false, firedSugarcoat = false, firedEngine = false, firedCallsOut = false, firedTaught = false, firedMan = false;
    let lastNotchCls = "";
    let dancerParts: { ll: SVGElement | null; rl: SVGElement | null; la: SVGElement | null; ra: SVGElement | null; laB: SVGElement | null; raB: SVGElement | null } | null = null;

    const render = (t: number) => {
      openEl.style.opacity = String(ramp(t, T.open, T.open + 100) * (1 - ramp(t, T.complaint - 200, T.complaint - 60)));
      sequence(openEl, OPEN_PHRASES, openStarts, T.open, OPEN_SW, t);

      complaint.style.opacity = String(ramp(t, T.complaint, T.complaint + 90) * (1 - ramp(t, T.contrast - 200, T.contrast - 60)));
      sequence(complaint, COMPLAINT_PHRASES, complaintStarts, T.complaint, COMPLAINT_SW, t);

      contrast.style.opacity = String(ramp(t, T.contrast, T.contrast + 90) * (1 - ramp(t, T.why - 200, T.why - 60)));
      sequence(contrast, CONTRAST_PHRASES, contrastStarts, T.contrast, CONTRAST_SW, t);

      why.style.opacity = String(ramp(t, T.why, T.why + 90) * (1 - ramp(t, T.poet - 200, T.poet - 60)));
      kinetic(why, T.why, WHY_SW, t);

      poet.style.opacity = String(ramp(t, T.poet, T.poet + 90) * (1 - ramp(t, T.delib - 200, T.delib - 60)));
      sequence(poet, POET_PHRASES, poetStarts, T.poet, POET_SW, t);
      // "Deliberately trained." — its own match-cut once both words land,
      // self-bounded: seqIdx moves to phrase 2 ("by a poet.") right after,
      // so this can never latch true past its own phrase. Chunked, so "last
      // chunk of the last word" is looked up via the map, not hardcoded.
      const deliberatelyLanded = seqIdx.get(poet) === 1 && (kinCache.get(poet)?.last ?? -1) === lastChunkOf(POET_CHUNKS[1], 1);
      // "by a *poet.*" — its own match cut too, last phrase in POET_PHRASES
      // so bounded by t < T.delib same as every other trailing-phrase cut.
      const poetLanded = t < T.delib && seqIdx.get(poet) === 2
        && (kinCache.get(poet)?.last ?? -1) === lastChunkOf(POET_CHUNKS[2], 2);
      poet.classList.toggle("invert-flash", deliberatelyLanded || poetLanded);
      if (deliberatelyLanded && !firedDeliberately) { firedDeliberately = true; }
      if (!deliberatelyLanded) firedDeliberately = false;
      if (poetLanded && !firedPoet) { firedPoet = true; }
      if (!poetLanded) firedPoet = false;

      delib.style.opacity = String(ramp(t, T.delib, T.delib + 100) * (1 - ramp(t, T.engine - 220, T.engine - 60)));
      sequence(delib, DELIB_PHRASES, delibStarts, T.delib, DELIB_SW, t);
      // "emotionally intelligent" — its own match-cut once both words land,
      // self-bounded: seqIdx moves to phrase 2 ("AI. Ever.") right after.
      const intelligentLanded = seqIdx.get(delib) === 1 && (kinCache.get(delib)?.last ?? -1) === lastChunkOf(DELIB_CHUNKS[1], 1);
      delib.classList.toggle("invert-flash", intelligentLanded);
      if (intelligentLanded && !firedIntelligent) { firedIntelligent = true; }
      if (!intelligentLanded) firedIntelligent = false;

      engine.style.opacity = String(ramp(t, T.engine, T.engine + 100) * (1 - ramp(t, T.proof - 220, T.proof - 60)));
      sequence(engine, ENGINE_PHRASES, engineStarts, T.engine, ENGINE_SW, t);
      // "sugarcoat." — its own match-cut once all 4 words land, self-bounded:
      // seqIdx moves to phrase 1 ("Trained on you.") right after.
      const sugarcoatLanded = seqIdx.get(engine) === 0 && (kinCache.get(engine)?.last ?? -1) === lastChunkOf(ENGINE_CHUNKS[0], 3);
      if (sugarcoatLanded && !firedSugarcoat) { firedSugarcoat = true; }
      if (!sugarcoatLanded) firedSugarcoat = false;
      // "Calls you out." — its own match-cut once all 3 words land,
      // self-bounded: seqIdx moves to phrase 4 ("Gently.") right after.
      const callsOutLanded = seqIdx.get(engine) === 3 && (kinCache.get(engine)?.last ?? -1) === lastChunkOf(ENGINE_CHUNKS[3], 2);
      // "Emotional Engine." — the finale of this scene, Apple-style BIG
      // reveal: "Engine." splits "Eng"+"+ine." same as every chunked word,
      // but the match cut lands right as "+ine." completes, the whole line
      // jumps to its biggest size, and "Engine." gets a one-shot shimmer.
      // Last phrase in ENGINE_PHRASES — no next index to self-bound against,
      // so bounded by t < T.proof same as every other trailing-phrase cut.
      const engineBigLanded = t < T.proof && seqIdx.get(engine) === 6
        && (kinCache.get(engine)?.last ?? -1) === lastChunkOf(ENGINE_CHUNKS[6], 1);
      engine.classList.toggle("invert-flash", sugarcoatLanded || callsOutLanded || engineBigLanded);
      engine.classList.toggle("et-engine-big", engineBigLanded);
      if (callsOutLanded && !firedCallsOut) { firedCallsOut = true; }
      if (!callsOutLanded) firedCallsOut = false;
      if (engineBigLanded && !firedEngine) {
        firedEngine = true;
        const spans = kinCache.get(engine)?.spans;
        if (spans) { spans[1]?.classList.add("et-engine-shimmer"); spans[2]?.classList.add("et-engine-shimmer"); }
      }
      if (!engineBigLanded) firedEngine = false;

      proof.style.opacity = String(ramp(t, T.proof, T.proof + 100) * (1 - ramp(t, T.turn - 220, T.turn - 60)));
      sequence(proof, PROOF_PHRASES, proofStarts, T.proof, PROOF_SW, t);
      // ONE match cut — "Unbothered." (last phrase) landing. Plain invert
      // flash, no size pop. Bounded by t < T.turn so it can't latch true
      // past this scene (same bug class manLanded below already hit once).
      const proofCutLanded = t < T.turn && seqIdx.get(proof) === PROOF_PHRASES.length - 1
        && (kinCache.get(proof)?.last ?? -1) === lastChunkOf(PROOF_CHUNKS[PROOF_CHUNKS.length - 1], 0);
      proof.classList.toggle("invert-flash", proofCutLanded);

      turn.style.opacity = String(ramp(t, T.turn, T.turn + 100) * (1 - ramp(t, T.close - 220, T.close - 60)));
      sequence(turn, TURN_PHRASES, turnStarts, T.turn, TURN_SW, t);
      // "*taught* to." — the turn's own match cut, last phrase in TURN_PHRASES
      // so bounded by t < T.close same as every other trailing-phrase cut.
      // "*taught*" already carries the shimmer emphasis (the "*" marker) —
      // this adds the cut on top, right as "to." lands.
      const taughtLanded = t < T.close && seqIdx.get(turn) === 4
        && (kinCache.get(turn)?.last ?? -1) === lastChunkOf(TURN_CHUNKS[4], 1);
      turn.classList.toggle("invert-flash", taughtLanded);
      if (taughtLanded && !firedTaught) { firedTaught = true; }
      if (!taughtLanded) firedTaught = false;

      // close holds through the end of the film — no next scene to fade into.
      close.style.opacity = String(ramp(t, T.close, T.close + 100));
      sequence(close, CLOSE_PHRASES, closeStarts, T.close, CLOSE_SW, t);
      // "Hu" + "+man." — the fused reveal IS the match cut, and the film
      // ends right on it (see buildTimeline's `end`), so this is bounded by
      // T.end same as every other latch-risk landing in this file.
      const manLanded = t < T.end && seqIdx.get(close) === 4 && (kinCache.get(close)?.last ?? -1) === lastChunkOf(CLOSE_CHUNKS[4], 1);
      close.classList.toggle("invert-flash", manLanded);
      if (manLanded && !firedMan) { firedMan = true; }
      if (!manLanded) firedMan = false;

      // the notch comes back right as "Hu"+"man." lands, for the hold before
      // the loop: dozing -> eyes open -> expands downward -> dances. Same
      // mechanic as the Mac app's now-playing notch (--music-flash /
      // --music-hue), same rig-rename trick as every other mascot use.
      {
        const landT = T.end - CLOSE_HOLD;
        const inDance = t >= landT && t < T.end;
        const danceOp = inDance ? ramp(t, landT, landT + 250) * (1 - ramp(t, T.end - 200, T.end)) : 0;
        // direct assignment, not Math.max-accumulated: the notch cutaway
        // scene that used to also write this opacity is gone, so nothing
        // else resets it — the old Math.max pattern left it pinned at ~1
        // forever after the FIRST loop's dance played, showing the dancing
        // notch stuck on screen through every scene of every replay after.
        notchWrap.style.opacity = String(danceOp);
        // pushed clear of the "Hu man." text it would otherwise sit under.
        notchWrap.classList.toggle("et-dance-pos", inDance);
        if (inDance) {
          const dt0 = t - landT;
          const DOZE_DUR = 400, EYES_DUR = 400, EXPAND_DUR = 500;
          const eyesAt = DOZE_DUR, expandAt = DOZE_DUR + EYES_DUR, danceAt = DOZE_DUR + EYES_DUR + EXPAND_DUR;
          let cls: string, cap = "";
          if (dt0 < eyesAt) { cls = "nf-face on home dozing"; }
          else if (dt0 < expandAt) { cls = "nf-face on home awake"; }
          else { cls = "nf-face on home music mic-live"; cap = ""; }
          if (cls !== lastNotchCls) {
            notch.className = cls; lastNotchCls = cls;
            setNotchStatus(notch, dt0 >= danceAt ? "♪ braino fm" : "");
            if (capEl) capEl.textContent = cap;
          }
          // scale grows from a small dozing pill up to full size across the
          // expand window, anchored at the top so it reads as growing
          // DOWNWARD, not from its centre.
          const growP = ramp(t, landT + expandAt, landT + danceAt);
          const scale = 0.62 + growP * (1.15 - 0.62);
          notchWrap.style.transform = `translate(-50%, 0) scale(${scale.toFixed(3)})`;

          const inFullDance = dt0 >= danceAt;
          if (inFullDance) {
            if (dancerHost && !dancerHost.firstElementChild) { dancerHost.innerHTML = namespacedWalker("etd"); dancerParts = null; }
            if (dancerHost && !dancerParts) {
              const part = (id: string) => dancerHost.querySelector<SVGElement>(`#__etd_${id}__`) || null;
              dancerParts = { ll: part("ll"), rl: part("rl"), la: part("la"), ra: part("ra"), laB: part("la_bg"), raB: part("ra_bg") };
            }
            const dt = (t - landT - danceAt) / 1000;
            const beatV = (Math.sin(dt * 2 * Math.PI * CLOSE_DANCE_HZ) + 1) / 2;
            notch.style.setProperty("--music-flash", (beatV * beatV).toFixed(3));
            notch.style.setProperty("--music-hue", ((dt * 40) % 360).toFixed(0));
            const s = Math.sin(dt * 6.4);
            if (dancerParts) {
              dancerParts.ll?.setAttribute("transform", `rotate(${s * 12} 44 74)`);
              dancerParts.rl?.setAttribute("transform", `rotate(${-s * 12} 56 74)`);
              dancerParts.la?.setAttribute("transform", `rotate(${s * 24} 22 53)`);
              dancerParts.laB?.setAttribute("transform", `rotate(${s * 24} 22 53)`);
              dancerParts.ra?.setAttribute("transform", `rotate(${s * 24} 78 53)`);
              dancerParts.raB?.setAttribute("transform", `rotate(${s * 24} 78 53)`);
            }
            const svg = dancerHost?.firstElementChild as HTMLElement | null;
            if (svg) svg.style.transform = `rotate(${s * 9}deg)`;
          }
        } else {
          dancerParts = null;
        }
      }

      invert.style.opacity = (deliberatelyLanded || poetLanded || intelligentLanded || sugarcoatLanded || callsOutLanded
        || engineBigLanded || taughtLanded || proofCutLanded || manLanded) ? "1" : "0";
    };

    const controls = root.querySelector<HTMLElement>(".et-scrubber");
    const slider = root.querySelector<HTMLInputElement>(".et-scrub");
    const playBtn = root.querySelector<HTMLButtonElement>(".et-play");
    const timeLabel = root.querySelector<HTMLElement>(".et-time");
    if (slider) slider.max = String(T.end);

    const setPlaying = (p: boolean) => {
      playing = p;
      if (playBtn) playBtn.textContent = p ? "❚❚" : "▶";
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = (manualT + AUDIO_START_OFFSET_MS) / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => { manualT = clamp(ms, 0, T.end); if (trackLoaded && audioEl) audioEl.currentTime = (manualT + AUDIO_START_OFFSET_MS) / 1000; };

    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    let audioAnchor = 0, lastUi = 0;
    const loop = () => {
      if (playing) {
        if (trackLoaded && audioEl) {
          const at = audioEl.currentTime * 1000 - AUDIO_START_OFFSET_MS;
          const wall = performance.now();
          if (audioAnchor === 0 || Math.abs(wall - audioAnchor - at) > 250) audioAnchor = wall - at;
          else audioAnchor += (wall - at - audioAnchor) * 0.06;
          manualT = wall - audioAnchor;
        } else {
          manualT = performance.now() - startWall;
        }
        if (manualT >= T.end) { resetSceneCaches(); seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = AUDIO_START_OFFSET_MS / 1000; audioEl.play().catch(() => {}); } else { startWall = performance.now(); } }
      }
      render(manualT);
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

    const frame = q(".et-frame");
    const onPlay = () => { if (manualT >= T.end) { resetSceneCaches(); seek(0); } setPlaying(!playing); };
    frame.addEventListener("click", onPlay);

    const onScrub = (e: Event) => { setPlaying(false); seek(+(e.target as HTMLInputElement).value); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); onPlay(); }
      else if (e.key === "ArrowRight") { setPlaying(false); seek(manualT + (e.shiftKey ? 1000 : 33)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); seek(manualT - (e.shiftKey ? 1000 : 33)); }
    };
    let hideTimer = 0, overBar = false;
    const showControls = () => {
      document.body.classList.add("et-controls");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => { if (!overBar) document.body.classList.remove("et-controls"); }, 2200);
    };
    const onBarEnter = () => { overBar = true; showControls(); };
    const onBarLeave = () => { overBar = false; showControls(); };
    addEventListener("pointermove", showControls);
    controls?.addEventListener("pointerenter", onBarEnter);
    controls?.addEventListener("pointerleave", onBarLeave);
    showControls();

    // native listeners throughout — a JSX onClick here is silently dead
    // because the controls' own stopPropagation blocks React's synthetic
    // event delegation (same bug documented on /notch's scrubber).
    slider?.addEventListener("input", onScrub);
    playBtn?.addEventListener("click", onPlay);
    root.querySelector(".et-step-back")?.addEventListener("click", () => { setPlaying(false); seek(manualT - 33); });
    root.querySelector(".et-step-fwd")?.addEventListener("click", () => { setPlaying(false); seek(manualT + 33); });
    controls?.addEventListener("click", (e) => e.stopPropagation());
    addEventListener("keydown", onKey);

    const onReplay = () => { resetSceneCaches(); seek(0); setPlaying(true); };
    root.querySelector(".et-replaybtn")?.addEventListener("click", onReplay);
    const onGrids = () => frame.classList.toggle("grids");
    root.querySelector(".et-grids")?.addEventListener("click", onGrids);
    const onFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else frame.requestFullscreen?.().catch(() => {}); };
    root.querySelector(".et-fs")?.addEventListener("click", onFs);
    const onFsChange = () => { if (document.fullscreenElement === frame) { resetSceneCaches(); seek(0); setPlaying(true); } };
    document.addEventListener("fullscreenchange", onFsChange);

    // fit the film to its own track: the words keep their fast, accelerating
    // cadence; H is solved so the film spans the track, and the snap point
    // lands on the nearest beat/downbeat. The track plays from
    // AUDIO_START_OFFSET_MS onward (2:25 in) — beats/downbeats before that
    // point are dropped and everything is shifted to be relative to that
    // mark, so "t=0" in the film IS "2:25" in the mp3.
    const applyBeats = (a: BeatAnalysis) => {
      const shift = (arr: number[]) => arr.filter((ms) => ms >= AUDIO_START_OFFSET_MS).map((ms) => ms - AUDIO_START_OFFSET_MS);
      const shifted: BeatAnalysis = {
        ...a,
        beats: shift(a.beats),
        downbeats: shift(a.downbeats),
        durationMs: a.durationMs - AUDIO_START_OFFSET_MS,
      };
      if (a.bpm && a.bpm > 0) CLOSE_DANCE_HZ = a.bpm / 60;
      const target = Math.min(TARGET_MS, shifted.durationMs - 200);
      const snap = (ms: number, down: boolean) =>
        snapToBeat(ms, down ? shifted.downbeats : shifted.beats, Math.max(0, ms - 350));
      let goal = target;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;
      }
      const hardEnd = Math.round(shifted.durationMs - 60);
      if (T.end > hardEnd) T.end = hardEnd;
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
    };

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/one.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        seek(0); manualT = 0;
        if (audioEl) {
          audioEl.src = "/one.mp3"; audioEl.load(); audioEl.currentTime = AUDIO_START_OFFSET_MS / 1000;
          try { await audioEl.play(); playing = true; } catch { playing = false; }
        }
      } catch { /* film still plays on its own wall-clock, unsynced */ }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      frame.removeEventListener("click", onPlay);
      slider?.removeEventListener("input", onScrub);
      removeEventListener("keydown", onKey);
      removeEventListener("pointermove", showControls);
      controls?.removeEventListener("pointerenter", onBarEnter);
      controls?.removeEventListener("pointerleave", onBarLeave);
      document.removeEventListener("fullscreenchange", onFsChange);
      window.clearTimeout(hideTimer);
      document.body.classList.remove("et-controls");
    };
  }, [runId]);

  return (
    <div className="et-films">
      <section className="et" ref={rootRef}>
        <div className="et-frame">
          <div className="et-stage">
            <div className="et-open" />
            <div className="et-complaint" />
            <div className="et-contrast" />
            <div className="et-why">{WHY_WORDS.map((w, i) => {
              const fuse = w.startsWith("+"); const emph = w.startsWith("*");
              const cls = fuse ? " nt-fuse" : emph ? " nt-emph" : "";
              const text = fuse || emph ? w.slice(1) : w;
              return <span key={i} className={`et-word${cls}`}>{text}</span>;
            })}</div>
            {/* the real notch — comes back once right at the very end, dancing through the closing hold */}
            <div className="et-notch">
              <NotchFace className="on home dozing" />
            </div>
            {/* everything after "Here's why" fades in slower instead of stamping — let it breathe */}
            <div className="et-poet et-slow" />
            <div className="et-delib et-slow" />
            <div className="et-engine et-slow" />
            <div className="et-proof et-slow" />
            <div className="et-turn et-slow" />
            <div className="et-close et-slow" />

            <div className="et-invert" />
          </div>
        </div>
        <audio className="et-audio" preload="auto" />

        <div className="et-veil" aria-hidden="true" />
        <div className="et-scrubber">
          <button className="et-play" title="Play / Pause (space)">❚❚</button>
          <button className="et-step-back" title="Back 1 frame (←)">◀|</button>
          <input className="et-scrub" type="range" min="0" max={String(DEFAULT_T.end)} defaultValue="0" step="1" />
          <button className="et-step-fwd" title="Forward 1 frame (→)">|▶</button>
          <span className="et-time">0.00s</span>
          <button className="et-replaybtn" title="Restart">⟲</button>
          <button className="et-fs" title="Fullscreen">⛶</button>
          <button className="et-grids" title="Toggle centre guides">▦</button>
        </div>
      </section>
    </div>
  );
}
