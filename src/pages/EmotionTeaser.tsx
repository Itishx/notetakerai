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
   sequence / phraseSeq / fuse "+" / emphasis "*" / swap-stack), same font,
   same 3-hits-only beat-snap rule — but its OWN track (she-needs-him.mp3,
   157 BPM, "She Needs Him" by Her's), auto-analyzed and beat-matched at
   runtime exactly like /notch does with its own track, just a different
   file. Dark red / white palette (deep red base, white text, white match-cut
   invert instead of black/white).

   Full script locked in through the closing card.

     1  open        "Most people have a problem with AI."
     2  complaint   "He's always" "validating."
     3  contrast    "But not" "Braino."
     4  why         "Here's why."
     4b notchCut    real notch cutaway — listens, then types "he's overthinking
                    this again" in its own caption wing, exactly like /notch's
                    real lifecycle, and gets to play all the way out
     5  poet        "He was trained" -> MATCH CUT "Deliberately trained." ->
                    "by a *poet." — the match cut is its own beat mid-sentence
     6  delib       "To be the *most" "emotionally intelligent" "AI. Ever."
     6b engine      "He does not sugarcoat." "Trained on you." "Reads what you
                    don't say." "Calls you out." MATCH CUT -> "Gently." "Runs
                    on his own" "*Emotional Engine."
     7  proof       "Way beyond a chatbot." "Not "how can I assist you
                    today."" "Just a guy." "In your notch." "Unbothered."
     8  turn        "No "as an AI, I can't relate."" "He relates." "Because
                    he's been" "*taught to."
     9  close       "His intelligence?" "Artificial." "His understanding" "of
                    emotions?" "Hu" -> MATCH CUT -> "+man." (fused reveal)
    10  black       a beat of pure black — the hard cut before the card
    11  cta         "Braino." -> "More Human, Less AI." — the notch goes into
                    real "music mode" here (same mechanic as the Mac app's
                    now-playing notch): the walker mascot dances inside the
                    pill, the box-shadow does its live hue/beat light show.
                    Holds, then loops.
   Match-cut rule: the invert flip IS the effect — word-stamp/fade animation
   is suppressed on any line while its match-cut is active (.invert-flash
   .et-word.in { animation: none }), so the cut reads as one clean flip.
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const OPEN_PHRASES = [["Most", "people"], ["have", "a", "problem"], ["with", "AI."]];
const OPEN_SW = 280;
const OPEN_GAPS: number[] = [];

// one line, holds — not split into two beats
const COMPLAINT_PHRASES = [["He's", "always", "*validating."]];
const COMPLAINT_SW = 280;
const COMPLAINT_GAPS: number[] = []; COMPLAINT_GAPS[0] = 520;   // the hold

const CONTRAST_PHRASES = [["But", "not"], ["Braino."]];
const CONTRAST_SW = 320;
const CONTRAST_GAPS: number[] = [];

const WHY_WORDS = ["Here's", "why."];
const WHY_SW = 320;

// real notch cutaway, right after "Here's why" — listens, then types what
// he's actually noticing, exactly like /notch's real captioning lifecycle
const NOTCHCUT_CAPTION = "he's overthinking this again";
const NOTCHCUT_LISTEN_DUR = 550;
const NOTCHCUT_TYPE_MS = 45;
const NOTCHCUT_TYPE_DUR = NOTCHCUT_CAPTION.length * NOTCHCUT_TYPE_MS;
const NOTCHCUT_HOLD = 1100;   // let the caption breathe once fully typed, before cutting away — was clipping
const NOTCHCUT_DUR = NOTCHCUT_LISTEN_DUR + NOTCHCUT_TYPE_DUR + NOTCHCUT_HOLD;

const POET_PHRASES = [["He", "was", "trained"], ["Deliberately", "trained."], ["by", "a", "*poet."]];
const POET_SW = 400;   // slower — everything after "Here's why" breathes
const POET_GAPS: number[] = []; POET_GAPS[0] = 220; POET_GAPS[1] = 320;   // more room after the match cut before "by a poet." joins

// the pitch, right after the poet reveal — the emotional-engine claim in plain
// words. Currently the film's ending: holds here, then loops.
const DELIB_PHRASES = [["To", "be", "the", "*most"], ["emotionally", "intelligent"], ["AI.", "Ever."]];
const DELIB_SW = 360;
const DELIB_GAPS: number[] = []; DELIB_GAPS[0] = 340;   // extra breath before "emotionally intelligent" lands

// the technical beat — plain, upfront, no sugar coating; MATCH CUT lands on
// "Calls you out." right before "Gently." joins
const ENGINE_PHRASES = [
  ["He", "does", "not", "sugarcoat."],
  ["Trained", "on", "you."],
  ["Reads", "what", "you", "don't", "say."],
  ["Calls", "you", "out."],
  ["Gently."],
  ["Runs", "on", "his", "own"],
  ["*Emotional", "Engine."],
];
const ENGINE_SW = 300;
const ENGINE_GAPS: number[] = []; ENGINE_GAPS[5] = 460;   // "Runs on his own" needs its own breath before "Emotional Engine." lands

// he's not a chatbot — plain proof, back to normal flowing phrases (no
// back-to-back match cuts). Just ONE match cut, on "Unbothered." landing —
// plain invert flash, no size pop.
const PROOF_PHRASES = [
  ["Way", "beyond", "a", "chatbot."],
  ["Not", "“how", "can", "I"],
  ["assist", "you", "today.”"],
  ["Just", "a", "guy."],
  ["In", "your", "notch."],
  ["Unbothered."],
];
const PROOF_SW = 300;
const PROOF_GAPS: number[] = [];

// the turn — he relates, because he's actually built to. Plain, no cuts —
// the only match cut this close to the end is "Hu"+"man." in CLOSE_PHRASES.
const TURN_PHRASES = [
  ["No", "“as", "an", "AI,"],
  ["I", "can't", "relate.”"],
  ["He", "relates."],
  ["Because", "he's", "been"],
  ["*taught", "to."],
];
const TURN_SW = 300;
const TURN_GAPS: number[] = [];

// the close — artificial intelligence, human understanding. "Hu" + "+man."
// fuses flush (the "+" convention) right as the match cut fires.
const CLOSE_PHRASES = [
  ["His", "intelligence?"],
  ["Artificial."],
  ["His", "understanding"],
  ["of", "emotions?"],
  ["Hu", "+man."],
];
const CLOSE_SW = 340;
const CLOSE_GAPS: number[] = []; CLOSE_GAPS[3] = 400;   // extra breath right before the reveal

// right after "Hu"+"man." lands — a rapid-fire aside. Two words at a time,
// replacing in place (not accumulating on one line — a full 12-word
// sentence at this font-size was running off the edges of the screen).
const PROFANITY_PHRASES = [
  ["(he", "also"],
  ["says", "fuck,"],
  ["behenchod,", "yeah"],
  ["—", "no"],
  ["filters,", "because"],
  ["fuck", "them)"],
];
const PROFANITY_SW = 220;
const PROFANITY_GAPS: number[] = [];

// a beat of pure black — the hard cut before the closing card
const BLACK_HOLD = 600;

// closing card — the notch goes into real "music mode": the walker mascot
// dances inside the pill (same rig, same rename-per-instance trick as every
// other mascot use), the box-shadow runs its live hue/beat light show, both
// driven by --music-flash / --music-hue exactly like content.js's own
// now-playing notch. Keyed off elapsed scene time (not wall clock), so it
// stays fully scrubbable like everything else in this film.
// "More"/"Human,"/"Less"/"AI." each land as their own word now — 4 match
// cuts punctuating the human/AI contrast the line is literally making.
const CTA_PHRASES = [["Braino."], ["More"], ["Human,"], ["Less"], ["AI."]];
const CTA_SW = 320;
const CTA_GAPS: number[] = []; CTA_GAPS[0] = 500; CTA_GAPS[1] = 140; CTA_GAPS[2] = 140; CTA_GAPS[3] = 140;
const CTA_DANCE_HZ = 157 / 60;   // synced to the track's own 157 BPM
const CTA_HOLD = 2600;   // dancing hold before it loops

const GAP = 260;

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
const PROFANITY_TOTAL = phraseSeq(PROFANITY_PHRASES, PROFANITY_SW, PROFANITY_GAPS).total;
const CTA_TOTAL = phraseSeq(CTA_PHRASES, CTA_SW, CTA_GAPS).total;

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
  const notchCut = S2(why + WHY_TOTAL + H * 0.12);
  const poet = S2(notchCut + NOTCHCUT_DUR + H * 0.24);
  const delib = S2(poet + POET_TOTAL + H * 0.24);
  const engine = S2(delib + DELIB_TOTAL + H * 0.24);
  const proof = S2(engine + ENGINE_TOTAL + H * 0.22);
  const turn = S2(proof + PROOF_TOTAL + H * 0.22);
  const close = S2(turn + TURN_TOTAL + H * 0.22);
  const profanity = S2(close + CLOSE_TOTAL + H * 0.16);
  const black = S2(profanity + PROFANITY_TOTAL + H * 0.14);
  const cta = S2(black + BLACK_HOLD, true);                  // SNAP 1 — the closing card lands on a downbeat
  const end = Math.round(cta + CTA_TOTAL + CTA_HOLD);
  return { open, complaint, contrast, why, notchCut, poet, delib, engine, proof, turn, close, profanity, black, cta, end };
};

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

// 41200 was set before the profanity beat + other additions this session —
// actual content already runs ~50s even at the MINIMUM hold (H floor), so
// the solver was pinned at its floor for the ENTIRE film, not just the end.
// That's what made the last stretch (close → profanity → black → cta) read
// as cramped/overlapping — there was no real breathing room anywhere.
const TARGET_MS = 52500;
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
    const profanity = q(".et-profanity");
    const black = q(".et-black");
    const cta = q(".et-cta");
    const dancerHost = notch.querySelector<HTMLElement>(".nf-dancer");
    const invert = q(".et-invert");
    const rings = q(".et-rings");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let T = { ...DEFAULT_T };
    let holdMs = DEFAULT_H;

    const poetStarts = phraseSeq(POET_PHRASES, POET_SW, POET_GAPS).starts;
    const delibStarts = phraseSeq(DELIB_PHRASES, DELIB_SW, DELIB_GAPS).starts;
    const engineStarts = phraseSeq(ENGINE_PHRASES, ENGINE_SW, ENGINE_GAPS).starts;
    const proofStarts = phraseSeq(PROOF_PHRASES, PROOF_SW, PROOF_GAPS).starts;
    const turnStarts = phraseSeq(TURN_PHRASES, TURN_SW, TURN_GAPS).starts;
    const closeStarts = phraseSeq(CLOSE_PHRASES, CLOSE_SW, CLOSE_GAPS).starts;
    const profanityStarts = phraseSeq(PROFANITY_PHRASES, PROFANITY_SW, PROFANITY_GAPS).starts;
    const ctaStarts = phraseSeq(CTA_PHRASES, CTA_SW, CTA_GAPS).starts;
    const openStarts = phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).starts;
    const complaintStarts = phraseSeq(COMPLAINT_PHRASES, COMPLAINT_SW, COMPLAINT_GAPS).starts;
    const contrastStarts = phraseSeq(CONTRAST_PHRASES, CONTRAST_SW, CONTRAST_GAPS).starts;

    const audioEl = root.querySelector<HTMLAudioElement>(".et-audio");
    let trackLoaded = false;

    const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

    // reset
    root.querySelectorAll<HTMLElement>(".et-word").forEach((w) => w.classList.remove("in"));
    [openEl, complaint, contrast, why, poet, delib, engine, proof, turn, close, profanity, black, cta].forEach((el) => (el.style.opacity = "0"));
    invert.style.opacity = "0";
    rings.classList.remove("burst");
    [poet, engine, close, proof, turn].forEach((el) => el.classList.remove("invert-flash"));
    notchWrap.style.opacity = "0"; notch.className = "nf-face on home dozing"; setNotchStatus(notch, "");
    notchWrap.style.transform = ""; cta.classList.remove("invert-flash");
    notchWrap.classList.remove("et-dance-pos");
    if (capEl) capEl.textContent = "";

    if (reduced) { cta.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".et-cta .et-word").forEach((w) => w.classList.add("in")); return; }

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

    const burst = () => {
      rings.classList.remove("burst"); void rings.offsetWidth; rings.classList.add("burst");
    };
    let firedDeliberately = false, firedCallsOut = false, firedMan = false;
    let lastNotchCls = "";
    let dancerParts: { ll: SVGElement | null; rl: SVGElement | null; la: SVGElement | null; ra: SVGElement | null; laB: SVGElement | null; raB: SVGElement | null } | null = null;

    const render = (t: number) => {
      openEl.style.opacity = String(ramp(t, T.open, T.open + 100) * (1 - ramp(t, T.complaint - 200, T.complaint - 60)));
      sequence(openEl, OPEN_PHRASES, openStarts, T.open, OPEN_SW, t);

      complaint.style.opacity = String(ramp(t, T.complaint, T.complaint + 90) * (1 - ramp(t, T.contrast - 200, T.contrast - 60)));
      sequence(complaint, COMPLAINT_PHRASES, complaintStarts, T.complaint, COMPLAINT_SW, t);

      contrast.style.opacity = String(ramp(t, T.contrast, T.contrast + 90) * (1 - ramp(t, T.why - 200, T.why - 60)));
      sequence(contrast, CONTRAST_PHRASES, contrastStarts, T.contrast, CONTRAST_SW, t);

      why.style.opacity = String(ramp(t, T.why, T.why + 90) * (1 - ramp(t, T.notchCut - 200, T.notchCut - 60)));
      kinetic(why, T.why, WHY_SW, t);

      // real notch cutaway — the ONLY notch appearance now: listens, then
      // types what he's noticing, and gets to play all the way out (a longer
      // fade-in/out window than before) before handing off to "He was trained".
      {
        const inNotchCut = t >= T.notchCut && t < T.poet;
        const notchCutBt = inNotchCut ? t - T.notchCut : -1;
        const notchOp = inNotchCut
          ? ramp(t, T.notchCut, T.notchCut + 200) * (1 - ramp(t, T.poet - 350, T.poet - 120))
          : 0;
        notchWrap.style.opacity = String(notchOp);

        if (inNotchCut) {
          let cls: string, cap = "";
          if (notchCutBt < NOTCHCUT_LISTEN_DUR) {
            cls = "nf-face on home listen mic-live";
          } else if (notchCutBt < NOTCHCUT_LISTEN_DUR + NOTCHCUT_TYPE_DUR) {
            cls = "nf-face on home captioning mic-live";
            const chars = clamp(Math.floor((notchCutBt - NOTCHCUT_LISTEN_DUR) / NOTCHCUT_TYPE_MS), 0, NOTCHCUT_CAPTION.length);
            cap = NOTCHCUT_CAPTION.slice(0, chars);
          } else {
            cls = "nf-face on home captioning mic-live";
            cap = NOTCHCUT_CAPTION;
          }
          if (cls !== lastNotchCls) { notch.className = cls; lastNotchCls = cls; setNotchStatus(notch, ""); }
          if (capEl && capEl.textContent !== cap) capEl.textContent = cap;
        } else if (t < T.notchCut) {
          const cls = "nf-face on home dozing";
          if (cls !== lastNotchCls) { notch.className = cls; lastNotchCls = cls; }
        }
      }

      poet.style.opacity = String(ramp(t, T.poet, T.poet + 90) * (1 - ramp(t, T.delib - 200, T.delib - 60)));
      sequence(poet, POET_PHRASES, poetStarts, T.poet, POET_SW, t);
      // "Deliberately trained." — its own match-cut once both words land,
      // self-bounded: seqIdx moves to phrase 2 ("by a poet.") right after,
      // so this can never latch true past its own phrase.
      const deliberatelyLanded = seqIdx.get(poet) === 1 && (kinCache.get(poet)?.last ?? -1) === 1;
      poet.classList.toggle("invert-flash", deliberatelyLanded);
      if (deliberatelyLanded && !firedDeliberately) { firedDeliberately = true; burst(); }
      if (!deliberatelyLanded) firedDeliberately = false;

      delib.style.opacity = String(ramp(t, T.delib, T.delib + 100) * (1 - ramp(t, T.engine - 220, T.engine - 60)));
      sequence(delib, DELIB_PHRASES, delibStarts, T.delib, DELIB_SW, t);

      engine.style.opacity = String(ramp(t, T.engine, T.engine + 100) * (1 - ramp(t, T.proof - 220, T.proof - 60)));
      sequence(engine, ENGINE_PHRASES, engineStarts, T.engine, ENGINE_SW, t);
      // "Calls you out." — its own match-cut once all 3 words land,
      // self-bounded: seqIdx moves to phrase 4 ("Gently.") right after.
      const callsOutLanded = seqIdx.get(engine) === 3 && (kinCache.get(engine)?.last ?? -1) === 2;
      engine.classList.toggle("invert-flash", callsOutLanded);
      if (callsOutLanded && !firedCallsOut) { firedCallsOut = true; burst(); }
      if (!callsOutLanded) firedCallsOut = false;

      proof.style.opacity = String(ramp(t, T.proof, T.proof + 100) * (1 - ramp(t, T.turn - 220, T.turn - 60)));
      sequence(proof, PROOF_PHRASES, proofStarts, T.proof, PROOF_SW, t);
      // ONE match cut — "Unbothered." (last phrase) landing. Plain invert
      // flash, no size pop. Bounded by t < T.turn so it can't latch true
      // past this scene (same bug class manLanded below already hit once).
      const proofCutLanded = t < T.turn && seqIdx.get(proof) === PROOF_PHRASES.length - 1
        && (kinCache.get(proof)?.last ?? -1) === 0;
      proof.classList.toggle("invert-flash", proofCutLanded);

      turn.style.opacity = String(ramp(t, T.turn, T.turn + 100) * (1 - ramp(t, T.close - 220, T.close - 60)));
      sequence(turn, TURN_PHRASES, turnStarts, T.turn, TURN_SW, t);

      close.style.opacity = String(ramp(t, T.close, T.close + 100) * (1 - ramp(t, T.profanity - 180, T.profanity - 60)));
      sequence(close, CLOSE_PHRASES, closeStarts, T.close, CLOSE_SW, t);
      // "Hu" + "+man." — the fused reveal IS the match cut, once both parts land.
      // Unlike "Deliberately trained."/"Calls you out.", "Hu"+"man." is
      // CLOSE_PHRASES' LAST phrase — there's no next phrase to move seqIdx
      // off idx 4, so without an explicit t-bound this stayed true forever
      // once it fired, leaving the full-white .et-invert overlay stuck on
      // top of every scene after it (the profanity line, black, even the
      // closing card).
      const manLanded = t < T.profanity && seqIdx.get(close) === 4 && (kinCache.get(close)?.last ?? -1) === 1;
      close.classList.toggle("invert-flash", manLanded);
      if (manLanded && !firedMan) { firedMan = true; burst(); }
      if (!manLanded) firedMan = false;

      // rapid-fire aside right after "Human." — two words at a time,
      // replacing in place so it never runs off the edges of the screen.
      profanity.style.opacity = String(ramp(t, T.profanity, T.profanity + 60) * (1 - ramp(t, T.black - 100, T.black)));
      sequence(profanity, PROFANITY_PHRASES, profanityStarts, T.profanity, PROFANITY_SW, t);

      // a beat of pure black before the card
      black.style.opacity = String(ramp(t, T.black - 40, T.black + 40) * (1 - ramp(t, T.cta - 80, T.cta)));

      // closing card — "Braino." then "More"/"Human,"/"Less"/"AI." (each its
      // own match cut), holds, loops. The notch goes into real music mode:
      // appears dozing → eyes open → expands downward → dancer + light show.
      cta.style.opacity = String(ramp(t, T.cta, T.cta + 140) * (1 - ramp(t, T.end - 260, T.end - 100)));
      sequence(cta, CTA_PHRASES, ctaStarts, T.cta, CTA_SW, t);
      const ctaIdx = seqIdx.get(cta) ?? -1;
      const ctaLast = kinCache.get(cta)?.last ?? -1;
      const moreLanded = ctaIdx === 1 && ctaLast === 0;
      const humanLanded = ctaIdx === 2 && ctaLast === 0;
      const lessLanded = ctaIdx === 3 && ctaLast === 0;
      // "AI." is CTA_PHRASES' LAST phrase — idx clamps here forever once
      // the scene moves on, so (unlike the other three) it can't be
      // self-bounded by "does the next phrase exist" — bound it by an
      // explicit short time window instead (same fix as manLanded/
      // proofCutLanded above, applied up front this time).
      const aiLandT = T.cta + ctaStarts[4] + CTA_SW;
      const aiLanded = t >= aiLandT && t < aiLandT + 200;
      cta.classList.toggle("invert-flash", moreLanded || humanLanded || lessLanded || aiLanded);
      {
        const inDance = t >= T.cta && t < T.end;
        const danceOp = inDance ? ramp(t, T.cta, T.cta + 250) * (1 - ramp(t, T.end - 200, T.end)) : 0;
        notchWrap.style.opacity = String(Math.max(Number(notchWrap.style.opacity) || 0, danceOp));
        // during the dance, the notch was dead-centre same as the "Braino."/
        // tagline text — directly overlapping it. Push it down, clear of the
        // text, for this phase only (notchCut earlier stays centred).
        notchWrap.classList.toggle("et-dance-pos", inDance);
        if (inDance) {
          // four staged beats: dozing (small) → eyes open (awake) → expands
          // downward → dancer fades in once fully expanded.
          const dt0 = t - T.cta;
          const DOZE_DUR = 400, EYES_DUR = 400, EXPAND_DUR = 500;
          const eyesAt = DOZE_DUR, expandAt = DOZE_DUR + EYES_DUR, danceAt = DOZE_DUR + EYES_DUR + EXPAND_DUR;
          let cls: string, cap = "";
          if (dt0 < eyesAt) { cls = "nf-face on home dozing"; }
          else if (dt0 < expandAt) { cls = "nf-face on home awake"; }
          else { cls = "nf-face on home music mic-live"; cap = ""; }
          if (cls !== lastNotchCls) {
            notch.className = cls; lastNotchCls = cls;
            setNotchStatus(notch, dt0 >= danceAt ? "♪ she needs him · braino fm" : "");
            if (capEl) capEl.textContent = cap;
          }
          // scale grows from a small dozing pill up to full size across the
          // expand window, anchored at the top (see .et-dance-pos) so it
          // reads as growing DOWNWARD, not from its centre.
          const growP = ramp(t, T.cta + expandAt, T.cta + danceAt);
          const scale = 0.62 + growP * (1.15 - 0.62);
          notchWrap.style.transform = `translate(-50%, 0) scale(${scale.toFixed(3)})`;

          const inFullDance = dt0 >= danceAt;
          if (inFullDance) {
            if (dancerHost && !dancerHost.firstElementChild) { dancerHost.innerHTML = namespacedWalker("etd"); dancerParts = null; }
            if (dancerHost && !dancerParts) {
              const part = (id: string) => dancerHost.querySelector<SVGElement>(`#__etd_${id}__`) || null;
              dancerParts = { ll: part("ll"), rl: part("rl"), la: part("la"), ra: part("ra"), laB: part("la_bg"), raB: part("ra_bg") };
            }
            const dt = (t - T.cta - danceAt) / 1000;
            const beatV = (Math.sin(dt * 2 * Math.PI * CTA_DANCE_HZ) + 1) / 2;
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
        } else if (t < T.notchCut) {
          dancerParts = null;
        }
      }

      invert.style.opacity = (deliberatelyLanded || callsOutLanded || proofCutLanded || manLanded
        || moreLanded || humanLanded || lessLanded || aiLanded) ? "1" : "0";
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
        if (p) { audioEl.currentTime = manualT / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => { manualT = clamp(ms, 0, T.end); if (trackLoaded && audioEl) audioEl.currentTime = manualT / 1000; };

    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    let audioAnchor = 0, lastUi = 0;
    const loop = () => {
      if (playing) {
        if (trackLoaded && audioEl) {
          const at = audioEl.currentTime * 1000;
          const wall = performance.now();
          if (audioAnchor === 0 || Math.abs(wall - audioAnchor - at) > 250) audioAnchor = wall - at;
          else audioAnchor += (wall - at - audioAnchor) * 0.06;
          manualT = wall - audioAnchor;
        } else {
          manualT = performance.now() - startWall;
        }
        if (manualT >= T.end) { resetSceneCaches(); seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } else { startWall = performance.now(); } }
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

    // fit the film to its own track (she-needs-him.mp3): the words keep their
    // fast, accelerating cadence; H is solved so the film spans the track,
    // and the snap point lands on the nearest beat / downbeat.
    const applyBeats = (a: BeatAnalysis) => {
      const target = Math.min(TARGET_MS, a.durationMs - 200);
      const snap = (ms: number, down: boolean) =>
        snapToBeat(ms, down ? a.downbeats : a.beats, Math.max(0, ms - 350));
      let goal = target;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;
      }
      const hardEnd = Math.round(a.durationMs - 60);
      if (T.end > hardEnd) T.end = hardEnd;
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
    };

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/she-needs-him.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        seek(0); manualT = 0;
        if (audioEl) {
          audioEl.src = "/she-needs-him.mp3"; audioEl.load(); audioEl.currentTime = 0;
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
            <div className="et-why">{WHY_WORDS.map((w, i) => <span key={i} className="et-word">{w}</span>)}</div>
            {/* real notch cutaway — listens, then types what he's noticing */}
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
            <div className="et-profanity" />
            <div className="et-black" />
            <div className="et-cta et-slow" />

            <div className="et-rings"><i /><i /><i /></div>

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
