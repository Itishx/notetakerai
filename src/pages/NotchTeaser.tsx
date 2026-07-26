import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import "./notch-teaser.css";

/* ============================================================================
   /notch-teaser — the Braino Notch teaser film. Fast kinetic typography (like
   the "don't blink" launch video) intercut with the REAL notch:
     1  cold open   "Braino." → "For your Mac."   (word-by-word, dead centre)
     2  intro       "Let's fucking go."
     3  WAKE-UP     the full boot sequence — the notch comes alive
     4  GREETING    the notch CAPTIONS "hey shawty"
     5  SEE         he looks down at your screen (eyes drift + dart)
     6  REVEAL      "He sees your screen." → "Only when you ask." (no wink
                    beat here anymore — straight into HYPE)
     7  HYPE        "He's smarter now. Fast/+er. Like crazy / fast. (0.5s)
                    Because he can... wait... let's just ask him." — trails
                    into the pivot ("+" = fuses flush onto the prior word)
     8  REAL LIFECYCLE  the bar returns and runs the ACTUAL notch states
                    (verbatim to LID_SEQ): dozing → listen (sonar + mouth-
                    listen, no text — this IS "let's ask him") → captioning
                    types "What can you do?" → captioning + speak together
                    — pill spreads sideways, mouth talks, his answer
                    (Browsing · Coding · Emailing … → "Watching. Always.")
                    types in the SAME real caption wing, glowing (turbo)
     8b BOOM        its own separate beat ("Bo" + "om" join, no space), right after
     9  tagline     "Speak." holds (extra breath) → clears → "Watch" → clears
                    → "It" → clears → "Happen." — five sequential beats,
                    nothing accumulates
    10  MATCH CUT   "Introducing" (its own beat) → clears → "Braino" lands →
                    "Notch" fuses onto it right as the frame flips white,
                    glittering, no space ("BrainoNotch")
    11  "Oh... and one more thing." → mascot ("Braino") → "Co" holds, THEN
                    "oking" lands beside it, flashes the frame white, settles
                    black → later swaps to "Work" in the same slot, no flash
    12  WINK        the island winks → black
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

const OPEN_PHRASES = [["Braino."], ["For", "your", "Mac."]];
// "Less" holds, then "goo" joins, then "oooo" fuses onto it with no space
// (reads "Less goooooo") — same fused-word mechanic as "BrainoNotch"/"Boom".
const INTRO_WORDS = ["Less", "goo", "oooo"];
const SCREEN_MAIN_PHRASES = [["He", "sees", "your", "screen."]];
const NOTE1_WORDS = ["Only", "when", "you", "ask"];
// "Speak." holds, THEN clears with extra breathing room, THEN "Watch" →
// "It" → "Happen." each land on their OWN, one fully replacing the last —
// FIVE sequential beats total, none of them accumulating together.
const TAG_PHRASES = [["Speak."], ["Watch"], ["It"], ["Happen."]];
// Trimmed — this whole tagline was taking too long. Modest cuts, not drastic.
const TAG_SW = 230;
const TAG_GAPS: number[] = []; TAG_GAPS[0] = 340;  // extra gap after "Speak." before "Watch" joins — trimmed from 480
const ONEMORE_PHRASES = [["Oh..."], ["and", "one", "more", "thing."]];
// REVERSED order (the reveal): mascot (standing in for "Braino") → "Co"
// holds, THEN "oking" lands next to it ("Cooking") → THEN, in the SAME slot,
// "oking" is replaced by "Work" ("CoWork") — no hyphen, plain stamp, no
// bounce — "Co" is a single persistent element, built ONCE, NEVER rebuilt or
// moved across either transition: the swap slot always reserves space for
// the WIDER of "Work"/"oking" (CSS Grid overlap, see .nt-swap-stack), so
// there is no reflow-jump possible.
const COWORK_WORDS = ["Braino", "Co"];
const COWORK_STARTS = [0, 0];                // "Co" lands immediately — no empty gap where the mascot used to be
const COWORK_OKING_AT = 780;                 // when "oking" lands in the swap slot, relative to T.cowork
const COWORK_WORK_SWAP_AT = 1650;            // when "oking" is replaced by "Work", relative to T.cowork
// its OWN standalone beat, between "one more thing" and the mascot/Co-Work
// sequence — plain two-word kinetic line, same style as every other simple
// line ("Introducing", "That's", etc.), nothing fused, nothing swapped.
const WEARE_WORDS = ["we", "are"];
const GREET_CAP = "hey shawty";
// "Introducing" is its OWN fully separate beat — lands alone, clears
// completely. THEN "Braino" lands on its own, and "+Notch" fuses onto it
// (same "+" convention as Fast/+er.) right as the match cut
// flips the frame white — reads as "Braino" / "BrainoNotch" appearing
// together with the cut, not a 3-word pile-up under one accumulating line.
const THATSBRAINO_PHRASES = [["Introducing"], ["Braino", "+Notch"]];
// Per-phrase cadence: "Introducing" (index 0) gets the SAME normal word
// cadence as everything else in the film — no special treatment. "Braino"/
// "+Notch" (index 1) gets its own longer cadence so BRAINO holds a real
// beat before Notch fuses onto it. These must be different numbers, and
// they were bugged before: one shared value multiplied by word-count-per-
// phrase silently added ~3 EXTRA SECONDS to the total film (a 2-word phrase
// at sw=1000 costs 2000ms, not 1000ms) — that's what pushed "Cooking Next"
// out of its slot at the end. Never reuse one big number across phrases of
// different lengths again.
const THATSBRAINO_SW = [300, 750];
// "Introducing" doesn't need extra breathing room — back to the standard gap.
const THATSBRAINO_GAPS: number[] = [];
const THATSBRAINO_HOLD = 130;                // it's a MATCH CUT — sharp, not a lingering hold. Just enough to register before the next scene
// what Braino actually does — real skills flickering fast, ending on the punch
const MODE_WORDS = [
  "Browsing", "Coding", "Emailing", "Booking",
  "Scheduling", "Designing", "Debugging", "Translating",
  "Summarizing", "Automating", "Remembering", "Shopping",
  "Navigating", "Organizing", "Recording", "Researching",
  "Reminding", "Listening", "Watching. Always.",
];
// BOOM — its own separate, singular beat right after the flicker holds.
// Two-part reveal, no space: "Bo" lands, then "om" joins to complete it.
// +1 frame (33ms) added to the gap — "Bo" needs to fully stamp and settle
// before "om" lands, not overlap it.
const BOOM_PARTS = ["Bo", "om"];
const BOOM_STARTS = [0, 253];
const BOOM_DUR = 600;   // was 800 — trimmed the hold AFTER "Boom" forms, not the "Bo"/"om" reveal itself (BOOM_STARTS untouched)

// mode flicker schedule (fast, accelerating; the final punch-word holds)
const MODE_DURS = MODE_WORDS.map((_, i) =>
  i === MODE_WORDS.length - 1 ? 620 : Math.round(230 - (230 - 90) * (i / (MODE_WORDS.length - 2)))
);
const MODE_CUM: number[] = [];
{ let acc = 0; for (const d of MODE_DURS) { MODE_CUM.push(acc); acc += d; } }
const MODES_TOTAL = MODE_DURS.reduce((a, b) => a + b, 0);
const BOOT_LEN = 7700;    // verbatim boot beats; short hold after the greeting
// The outro: island forms fast → he WINKS FIRST → the perimeter line races
// back out (reverse of the boot's slow 2.7s draw-in, much quicker) → beat of
// black. Reordered + tightened from the old form→coral→wink sequence.
const WINK_START = 550;       // how long the fast draw-in takes before he winks
const WINK_HOLD = 650;        // the wink itself, held
const OUTRO_LINE_DUR = 900;   // the retracting perimeter line — faster than the boot's 2700ms
const WINK_TAIL = WINK_START + WINK_HOLD + OUTRO_LINE_DUR + 300;   // + a beat of black — trailing black-beat was 550, trimmed; WINK_START/WINK_HOLD/OUTRO_LINE_DUR (the actual wink choreography) untouched
const COWORK_HOLD = 300;  // was 550 — readable hold after "Cooking"/"CoWork" settles, before the wink
const ONEMORE_HOLD = 200; // was 400 — "Oh, and one more thing." hold before the mascot/Co begins
// HYPE — right after the vision reveal, before the notch returns: quick
// phrases in the same spot, building the pitch then trailing off into the
// pivot — "He's smarter now. Fast/+er. Like crazy / fast. (0.5s hold)
// Because he can... wait... let's just ask him." "Fast" + "+er." fuses flush
// (no gap) into "Faster." — was reading choppy as a single flat word before.
// "Like" lands, THEN "crazy" joins with its own emphasis animation (the "*"
// marker — a little extra energy, matching what the word means), THEN
// "fast." joins as its own beat.
// "He's" is a PERSISTENT anchor word — its own element, never rebuilt, never
// moved. Only the word NEXT TO it swaps: "Smart/+er" -> "Fast/+er." — each
// itself a two-part fuse reveal (not a flat whole-word swap) — both slots are
// ALWAYS reserved in a CSS Grid overlap (.nt-swap-stack), sized to the WIDER
// of the two, so the container's width never changes between them and "He's"
// truly cannot shift, at any point. Plain stamp only, no bounce/slide.
const HYPE_OPEN_ANCHOR = "He’s";
const HYPE_OPEN_SWAP_AT = 480;              // "Smarter" holds this long before "Faster." replaces it — UNCHANGED, this IS the swap animation timing
const HYPE_OPEN_DUR = HYPE_OPEN_SWAP_AT + 700;   // reverted to +700 — the +400 trim made "Faster." feel rushed, not enough time to read it before the cut

const HYPE_PHRASES = [["Like", "*crazy", "fast."], ["(0.5s)"], ["Because", "he", "can", "now"], ["wait..."], ["let's", "just", "ask", "him."]];
// Slowed from 260 to 340 — closer to the intro's 360ms cadence (SW.open).
// At 260ms the words were advancing faster than the .18s stamp flash could
// even fully settle, especially on "Fast/+er." and "Like crazy/fast." —
// reading choppy instead of a beat you can actually see land.
const HYPE_SW = 340;
// "(0.5s)" holds an extra beat before it joins (index 0, right after "Like
// crazy fast." clears) — 0.5s instead of the standard 260ms GAP. It also
// needs to LEAVE faster than standard once landed — index 1's own trailing
// gap (before "Because he can now") trimmed to 90ms. The tail ("Because he
// can now... wait... let's just ask him.") gets widened gaps (index 2, 3)
// so each settles properly before the next joins, instead of racing through
// on the bare default.
const HYPE_GAPS: number[] = []; HYPE_GAPS[0] = 500; HYPE_GAPS[1] = 90; HYPE_GAPS[2] = 340; HYPE_GAPS[3] = 380;
// "Ready?" holds on its own, THEN clears for "Don't" → "Blink." — a normal
// TWO-word line, real space between them (NOT fused like "BrainoNotch") —
// the match cut fires once "Blink." lands. THEN straight into the "What can
// you do?" lifecycle — NO wink here; the wink is the CLOSING beat instead,
// once the fast skills words finish (see CUT_WINK_DUR below).
const READY_PHRASES = [["Ready?"], ["Don't", "Blink."]];
const READY_SW = 280;
// "Ready?" holds ~0.7s (matches the old READY_DUR feel) before "Don't" begins.
const READY_GAPS: number[] = []; READY_GAPS[0] = 500; READY_GAPS[1] = 350;   // was 600 — breathing room after "Don't Blink" lands, before the cut (READY_GAPS[0], the "Ready?" hold, untouched)
// THE REAL notch lifecycle (verbatim to LID_SEQ in HomeOS.tsx), compressed
// for the teaser's pace: listening (sonar + mouth-listen, no text — this IS
// "let's just ask him") → captioning types what was heard ("What can you
// do?") → speak + captioning together — the pill spreads AND the mouth
// talks, skills flicker inside the SAME caption wing → once the fast words
// finish, the caption clears and he WINKS — the closing beat, right before
// "Boom". No dozing re-entry: "Don't Blink" already established he's awake.
const CUT_PRE_TEXT = "What can you do?";
const CUT_TYPE_MS = 45;     // per-character typing speed — matches the boot greeting's typewriter (GREET_CAP)
const CUT_LISTEN_DUR = 400; // listening — sonar + mouth-listen, no text; the "What can you do?" caption was kicking in too late, trimmed the pure-listen gap before it types
const CUT_TYPE_DUR = CUT_PRE_TEXT.length * CUT_TYPE_MS + 150;   // was +300 — captioning; the typing speed itself (CUT_PRE_TEXT.length * CUT_TYPE_MS) is untouched, only the hold after it finishes
const CUT_WINK_DUR = 650;   // the closing wink, once the flicker finishes
// cumulative phase-start offsets (ms from T.button)
const CUT_LISTEN_AT = 0;
const CUT_TYPE_AT = CUT_LISTEN_AT + CUT_LISTEN_DUR;
const CUT_PRE_DUR = CUT_TYPE_AT + CUT_TYPE_DUR;   // == CUT_SPEAK_AT
const CUT_SPEAK_END = CUT_PRE_DUR + MODES_TOTAL;  // flicker (incl. final hold) finishes here
const CUT_DUR = CUT_SPEAK_END + CUT_WINK_DUR;     // + the closing wink

// The WORDS get FASTER as the film progresses — each scene has its own cadence
// (ms per word), decreasing scene by scene. Animations are NOT part of this.
const SW = { open: 360, screen: 280 };
// TEXT flows: sentence → sentence is a small FIXED beat, never the big hold.
const GAP = 260;

// A GROUP is capped at 4 words — any longer sentence is split into sequential
// phrases that share ONE spot: phrase clears, next phrase takes its place.
// phraseSeq gives each phrase's start offset (ms) + the group's total duration.
// `gaps` optionally overrides the trailing gap AFTER phrase i (sparse array —
// unset indices fall back to the standard GAP), for the rare beat that needs
// to hold longer before the next phrase joins.
// `sw` can be a single number (every phrase shares one word-cadence) or a
// per-phrase array (sparse — unset indices fall back to the LAST provided
// value) — needed when one phrase's internal word-to-word hold must be much
// longer than another's without inflating the WHOLE group's duration (this
// caught out THATSBRAINO: a single big `sw` meant to slow only "Braino"→
// "+Notch" also multiplied "Introducing"'s own contribution, and because
// `sw` is applied `words-in-phrase × sw`, the effect compounds per word —
// silently adding several extra SECONDS to the timeline, not the intended
// fraction of one).
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

const HYPE_DUR = phraseSeq(HYPE_PHRASES, HYPE_SW, HYPE_GAPS).total;
const READY_TOTAL = phraseSeq(READY_PHRASES, READY_SW, READY_GAPS).total;
const TAG_TOTAL = phraseSeq(TAG_PHRASES, TAG_SW, TAG_GAPS).total;
const THATSBRAINO_DUR = phraseSeq(THATSBRAINO_PHRASES, THATSBRAINO_SW, THATSBRAINO_GAPS).total + THATSBRAINO_HOLD;

const ONEMORE_DUR = phraseSeq(ONEMORE_PHRASES, 300).total + ONEMORE_HOLD;
const WEARE_SW = 300;
const WEARE_DUR = WEARE_WORDS.length * WEARE_SW + GAP + 150;   // was +300 — "we" / "are" reveal speed (WEARE_SW/GAP) untouched, only the trailing hold before the mascot begins
const COWORK_DUR = COWORK_WORK_SWAP_AT + COWORK_HOLD;   // "oking" lands, later replaced by "Work", then holds before the wink

// SEE-YOUR-SCREEN runs sequentially in the SAME spot: plain text, no cutaway.
// No "of course" wink anymore — the scene just ends once "Only when you
// ask" clears.
const screenTimes = (sw: number, _H: number) => {
  const mainEnd = SCREEN_MAIN_PHRASES[0].length * sw + GAP;
  const mainStarts = [0];
  const n1Start = mainEnd;
  const n1End = n1Start + NOTE1_WORDS.length * sw + GAP;
  const total = n1End;
  return { mainStarts, mainEnd, n1Start, n1End, total };
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
  const hype = S2(screen + screenTimes(SW.screen, H).total + H * 0.08);   // "He's [smarter/Faster.] → Like crazy / fast. (0.5s) Because he can now..."
  const ready = S2(hype + HYPE_OPEN_DUR + HYPE_DUR + H * 0.06);               // "Ready?" → "Don't Blink" fuses in → the notch winks
  const button = S2(ready + READY_TOTAL + H * 0.06, true);   // SNAP: restores the 3rd documented beat-hit (was silently lost — comment above always said boot/match-cut/wink) — "What can you do?" lands on a downbeat
  const boom = S2(button + CUT_DUR + H * 0.2);                // his answer lands — "Boom", its own separate beat
  const tag = S2(boom + BOOM_DUR + H * 0.2);                  // straight from "Boom" into the tagline
  const thatsBraino = S2(tag + TAG_TOTAL + H * 0.3);   // "That's Braino" → "Notch" joins, frame inverts
  const oneMore = S2(thatsBraino + THATSBRAINO_DUR + H * 0.3);
  const weAre = S2(oneMore + ONEMORE_DUR);                    // "we" / "are" — its own standalone beat
  const cowork = S2(weAre + WEARE_DUR);                       // "Braino" / "Co" / "Work" begins
  const wink = S2(cowork + COWORK_DUR, true);                 // SNAP: glitch·glitch·wink lands on a downbeat
  const end = Math.round(wink + WINK_TAIL);
  return { open, intro, boot, see, screen, hype, ready, button, boom, tag, thatsBraino, oneMore, weAre, cowork, wink, end };
};

// Solve the hold H so the whole film lands on `target` ms (end is linear in H).
const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

const TARGET_MS = 34000;
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
    const hypeOpen = q(".nt-hype-open");
    const hypeSwapA = q(".nt-hype-swap .nt-swap-a");
    const hypeSwapB = q(".nt-hype-swap .nt-swap-b");
    const hype = q(".nt-hype");
    const ready = q(".nt-ready");
    const boom = q(".nt-boom");
    const tag = q(".nt-tag");
    const thatsBraino = q(".nt-thatsbraino");
    const thatsBrainoInvert = q(".nt-thatsbraino-invert");
    const oneMore = q(".nt-onemore");
    const weAre = q(".nt-weare");
    const cowork = q(".nt-cowork");
    const coworkMascot = q(".nt-cowork-mascot");
    const coworkSwapA = q(".nt-cowork-swap .nt-swap-a");
    const coworkSwapB = q(".nt-cowork-swap .nt-swap-b");
    const glitch = q(".nt-glitch");
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
    const hypeStarts = phraseSeq(HYPE_PHRASES, HYPE_SW, HYPE_GAPS).starts;   // fixed cadence — never changes on sync
    const readyStarts = phraseSeq(READY_PHRASES, READY_SW, READY_GAPS).starts;   // fixed cadence — never changes on sync
    const tagStarts = phraseSeq(TAG_PHRASES, TAG_SW, TAG_GAPS).starts;      // fixed cadence — never changes on sync
    const thatsBrainoStarts = phraseSeq(THATSBRAINO_PHRASES, THATSBRAINO_SW, THATSBRAINO_GAPS).starts;   // fixed cadence — never changes on sync
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
    [notchWrap, bloom, intro, openLine, screen, hypeOpen, hype, ready, boom, tag, thatsBraino, oneMore, weAre, cowork, coworkMascot].forEach((el) => (el.style.opacity = "0"));
    [hypeSwapA, hypeSwapB, coworkSwapA, coworkSwapB].forEach((el) => { el.style.visibility = "hidden"; el.style.opacity = "0"; });
    glitch.style.opacity = "0"; cowork.classList.remove("invert-flash");
    notchWrap.classList.remove("cut-front");
    invert2.style.opacity = "0"; intro.classList.remove("invert-flash");
    thatsBrainoInvert.style.opacity = "0"; thatsBraino.classList.remove("invert-flash");
    notch.className = "nf-face on home dozing";
    notchWrap.className = "nt-notch";

    if (reduced) { tag.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".nt-tag .nt-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0, lastCls = "", lastMode = -1, lastStatus = "__", mascotBuilt = false;
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
    // seqIdx is declared below (after `sequence` exists); resetSceneCaches
    // clears both together — called on every restart (loop-wrap, manual
    // replay-to-0), NOT just on mount. Without this, a host's "last reached"
    // index stays latched from the PREVIOUS playthrough (e.g. Boom's "om",
    // Blink's "Blink." — see the invert-flash bug this fixed), so the very
    // first frame of a new loop reads those stale indices as if that beat
    // had already landed again, pinning invert2 white from frame 1.
    const resetSceneCaches = () => {
      kinCache.clear();
      seqIdx.clear();
    };
    // shared by both cadences below: writes the DOM only when the active index changes
    const kineticAt = (host: HTMLElement, active: number) => {
      let c = kinCache.get(host);
      // :scope > .nt-word only — a plain descendant ".nt-word" query would
      // also match nested .nt-swap-stack children (e.g. cowork's "Work"/
      // "oking"), which aren't part of this host's own word list at all.
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(":scope > .nt-word")), last: -2 }; kinCache.set(host, c); }
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      const c = kinCache.get(host);
      const len = c ? c.spans.length : host.querySelectorAll(".nt-word").length;
      const active = t - start < 0 ? -1 : Math.min(len - 1, Math.floor((t - start) / per));
      kineticAt(host, active);
    };
    // per-word cumulative offsets (ms from scene start) — for lines whose
    // cadence isn't uniform, e.g. the tagline: "Speak." holds, then
    // "Watch"/"It"/"Happen." join fast, one after another
    const kineticStarts = (host: HTMLElement, starts: number[], sceneStart: number, t: number) => {
      const rel = t - sceneStart;
      let active = -1;
      for (let i = 0; i < starts.length; i++) if (rel >= starts[i]) active = i;
      kineticAt(host, active);
    };

    // SEQUENCE — drives a host through N phrases in the SAME spot: builds the
    // active phrase's word spans on demand, then accumulates it with kinetic().
    // Used for any sentence longer than 4 words (split into ≤4-word phrases).
    const seqIdx = new Map<HTMLElement, number>();
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
        // A word prefixed with "+" fuses flush against the previous word (no
        // gap) — e.g. ["Fast", "+er."] reads as one word, "Faster.", built
        // from two separately-timed reveals instead of appearing all at once.
        // A word prefixed with "*" gets an extra emphasis animation on top of
        // the plain stamp-in (a little energy on a specific word, e.g. "crazy").
        host.innerHTML = phrases[idx].map((w) => {
          const fuse = w.startsWith("+");
          const emph = w.startsWith("*");
          const cls = fuse ? " nt-fuse" : emph ? " nt-emph" : "";
          const text = fuse || emph ? w.slice(1) : w;
          return `<span class="nt-word${cls}">${text}</span>`;
        }).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);   // stale span cache — rebuild against the new phrase
      }
      kinetic(host, sceneStart + starts[idx], phraseSw(sw, idx), t);
    };

    // The whole film from an ARBITRARY time t (ms) — deterministic → scrubbable.
    const render = (t: number) => {
      shimmer.style.opacity = "0";

      // ── TEXT scenes ──
      openLine.style.opacity = String(ramp(t, T.open, T.open + 120) * (1 - ramp(t, T.intro - 250, T.intro)));
      intro.style.opacity = String(ramp(t, T.intro, T.intro + 200) * (1 - ramp(t, T.boot - 250, T.boot)));
      screen.style.opacity = String(ramp(t, T.screen, T.screen + 110) * (1 - ramp(t, T.hype - 200, T.hype - 60)));
      // "He's" is a fixed anchor — its own element, never rebuilt — while
      // "smarter" swaps to "Faster." right next to it (plain stamp, no
      // bounce — see .nt-swap-stack CSS), THEN the WHOLE beat clears and
      // hands off to "Like crazy / fast. (0.5s) Because he can now..."
      const hypeOpenT = T.hype + HYPE_OPEN_DUR;
      hypeOpen.style.opacity = String(ramp(t, T.hype, T.hype + 100) * (1 - ramp(t, hypeOpenT - 220, hypeOpenT - 60)));
      {
        // Direct inline styles, not classList — bypasses ANY possible CSS
        // specificity/cascade/animation-interruption failure mode entirely.
        const toB = (t - T.hype) >= HYPE_OPEN_SWAP_AT;
        const smarterOn = !toB && t >= T.hype;
        hypeSwapA.style.visibility = smarterOn ? "visible" : "hidden";
        hypeSwapA.style.opacity = smarterOn ? "1" : "0";
        hypeSwapB.style.visibility = toB ? "visible" : "hidden";
        hypeSwapB.style.opacity = toB ? "1" : "0";
        // "Smart" holds, "+er" fuses onto it → "Smarter"; then the slot swaps
        // and "Fast" holds, "+er." fuses onto it → "Faster." — same fuse
        // convention as everywhere else, not a flat swap of whole words. Uses
        // the SAME standard GAP as every other word-to-word beat in the film
        // (was a custom faster 160ms — read as rushed, out of rhythm with
        // the rest of the stamp animation's pacing).
        kinetic(hypeSwapA, T.hype, GAP, t);
        kinetic(hypeSwapB, T.hype + HYPE_OPEN_SWAP_AT, GAP, t);
      }
      hype.style.opacity = String(ramp(t, hypeOpenT, hypeOpenT + 100) * (1 - ramp(t, T.ready - 220, T.ready - 60)));
      sequence(hype, HYPE_PHRASES, hypeStarts, hypeOpenT, HYPE_SW, t);
      // "Ready?" holds, clears, THEN "Don't" holds, "Blink." joins next to
      // it — a real space, not fused — the match cut fires once it lands.
      ready.style.opacity = String(ramp(t, T.ready, T.ready + 90) * (1 - ramp(t, T.ready + READY_TOTAL - 200, T.ready + READY_TOTAL - 60)));
      sequence(ready, READY_PHRASES, readyStarts, T.ready, READY_SW, t);
      // "Boom" — his answer lands, its own separate singular beat (not part
      // of the skills flicker), big and on its own before the tagline
      boom.style.opacity = String(ramp(t, T.boom, T.boom + 80) * (1 - ramp(t, T.tag - 200, T.tag - 60)));
      kineticStarts(boom, BOOM_STARTS, T.boom, t);
      tag.style.opacity = String(ramp(t, T.tag, T.tag + 120) * (1 - ramp(t, T.thatsBraino - 220, T.thatsBraino - 60)));
      // "Introducing" holds and clears, THEN "Braino" lands, THEN "+Notch"
      // fuses onto it right as the match cut flips the frame white.
      thatsBraino.style.opacity = String(ramp(t, T.thatsBraino, T.thatsBraino + 100) * (1 - ramp(t, T.oneMore - 220, T.oneMore - 60)));
      sequence(thatsBraino, THATSBRAINO_PHRASES, thatsBrainoStarts, T.thatsBraino, THATSBRAINO_SW, t);
      {
        // Same cache-based match-cut pattern as readyInv/boomInv: fires the
        // instant "+Notch" (index 1 of phrase 1) actually lands, bounded by
        // the scene's own window so it can't latch white past T.oneMore.
        const tbInv = t < T.oneMore && (kinCache.get(thatsBraino)?.last ?? -1) === 1;
        thatsBraino.classList.toggle("invert-flash", tbInv);
        thatsBrainoInvert.style.opacity = tbInv ? "1" : "0";
      }
      // "Oh, and one more thing." — its own beat, right before "we are"
      oneMore.style.opacity = String(ramp(t, T.oneMore, T.oneMore + 100) * (1 - ramp(t, T.weAre - 250, T.weAre - 80)));
      sequence(oneMore, ONEMORE_PHRASES, oneMoreStarts, T.oneMore, 300, t);
      // "we are" — its own standalone beat, plain kinetic line, right before
      // the mascot/Co-Work sequence begins
      weAre.style.opacity = String(ramp(t, T.weAre, T.weAre + 100) * (1 - ramp(t, T.cowork - 250, T.cowork - 80)));
      kinetic(weAre, T.weAre, WEARE_SW, t);
      // "Braino" (mascot) → "Co" (persistent, never rebuilt) → "oking" lands
      // beside it (own brief white flash) → LATER, in the SAME slot, "oking"
      // is replaced by "Work" (completing "CoWork") — plain stamp, no flash,
      // no bounce. "Co" never moves through any of this.
      cowork.style.opacity = String(ramp(t, T.cowork, T.cowork + 120) * (1 - ramp(t, T.wink - 250, T.wink - 60)));
      kineticStarts(cowork, COWORK_STARTS, T.cowork, t);
      const coworkRel = t - T.cowork;
      const COWORK_FLASH_DUR = 226; // 160 + 2 frames (33ms each, this app's scrubber step unit)
      const coworkInv = t < T.wink
        && coworkRel >= COWORK_STARTS[1] && coworkRel < COWORK_STARTS[1] + COWORK_FLASH_DUR;
      cowork.classList.toggle("invert-flash", coworkInv);
      glitch.style.opacity = coworkInv ? "1" : "0";
      // REVERSED order: "oking" lands FIRST ("Cooking"), THEN later swaps to
      // "Work" ("CoWork") — both reserved from the start (CSS Grid overlap),
      // only one visible at a time, "Co" never shifts either way. No hyphen —
      // plain stamp only, no bounce.
      {
        // Direct inline styles, not classList — bypasses ANY possible CSS
        // specificity/cascade/animation-interruption failure mode entirely.
        const workOn = coworkRel >= COWORK_WORK_SWAP_AT;
        const okingOn = !workOn && coworkRel >= COWORK_OKING_AT;
        coworkSwapA.style.visibility = okingOn ? "visible" : "hidden";
        coworkSwapA.style.opacity = okingOn ? "1" : "0";
        coworkSwapB.style.visibility = workOn ? "visible" : "hidden";
        coworkSwapB.style.opacity = workOn ? "1" : "0";
      }
      // slot 0 ("Braino") — mascot removed here, screen just stays empty
      // until "Co" lands at COWORK_STARTS[1]; everything else untouched.
      {
        const showMascot = false;
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
      // Same match-cut mechanic, reused on three more landings: "(0.5s)" (its
      // own HYPE phrase), "Blink." landing next to "Don't" (real space, not
      // fused), and "Boom" completing ("om" landing on "Bo"). Read straight off the
      // sequence()/kineticStarts() state each already updated above this
      // frame — held while that specific word/phrase is the active one.
      // kinCache/seqIdx track the LAST active index, which latches forever
      // once reached (by design, so revealed words stay visible) — using
      // that alone as an invert gate left invert2 stuck white for the rest
      // of the film the instant "Blink."/"Boom" landed. Bounding each by its
      // own scene's time window fixes it: false again once that scene ends.
      const hypeInv = t < T.ready && (seqIdx.get(hype) ?? -1) === 1;              // "(0.5s)" phrase — index shifted after He's/smarter moved to its own element
      const readyInv = t < T.button && (kinCache.get(ready)?.last ?? -1) === 1;   // "Blink." landed — match cut fires
      const boomInv = t < T.tag + 66 && (kinCache.get(boom)?.last ?? -1) === 1;   // "om" landed — "Boom" complete; +2 frames (33ms each) held past the scene cutoff
      intro.classList.toggle("invert-flash", introInv);
      hype.classList.toggle("invert-flash", hypeInv);
      ready.classList.toggle("invert-flash", readyInv);
      boom.classList.toggle("invert-flash", boomInv);

      // invert2 is shared across all four match cuts — they never overlap in time.
      invert2.style.opacity = (introInv || hypeInv || readyInv || boomInv) ? "1" : "0";
      sequence(tag, TAG_PHRASES, tagStarts, T.tag, TAG_SW, t);
      // SEE-YOUR-SCREEN — two lines SEQUENTIALLY in the SAME dead-centre spot:
      // "He sees your screen." clears → "Only when you ask." No wink beat
      // after this anymore — the scene just ends and hands off to HYPE.
      scMain.style.opacity = String(ramp(t, T.screen, T.screen + 90) * (1 - ramp(t, T.screen + st.mainEnd - 220, T.screen + st.mainEnd - 60)));
      note1.style.opacity = String(ramp(t, T.screen + st.n1Start, T.screen + st.n1Start + 110) * (1 - ramp(t, T.screen + st.n1End, T.screen + st.n1End + 160)));
      sequence(scMain, SCREEN_MAIN_PHRASES, st.mainStarts, T.screen, P.screen, t);
      kinetic(note1, T.screen + st.n1Start, P.screen, t);

      const inBoot = t >= T.boot && t < T.see;
      const inSee = t >= T.see && t < T.screen;         // notch looks DOWN at the screen
      // the REAL notch lifecycle: dozes → wake hint → listens (asking him) →
      // captions what was heard → speaks the answer (skills flicker, own
      // overlay — his replies are voice + mouth, never a notch caption).
      const inCut = t >= T.button && t < T.boom;
      const cutBt = inCut ? t - T.button : -1;
      // turbo (fast glow) only during the actual flicker, not the closing wink
      const inCutSpeak = inCut && cutBt >= CUT_PRE_DUR && cutBt < CUT_SPEAK_END;
      const inWink = t >= T.wink;

      // ── the ONE island: boots, LOOKS at the screen, then stays hidden
      //    through the screen-reveal text and the whole HYPE/Ready scene —
      //    no "of course" wink anymore — returns for the WHOLE "What can
      //    you do?" lifecycle, winks as ITS closing beat once the fast
      //    words finish, then returns again for the film's final wink. ──
      let islandOp = 0;
      if (t >= T.boot && t < T.screen) islandOp = ramp(t, T.boot, T.boot + 400) * (1 - ramp(t, T.screen - 500, T.screen - 200));
      else if (inCut) islandOp = ramp(t, T.button, T.button + 200) * (1 - ramp(t, T.boom - 250, T.boom - 80));
      // the close: form + wink, then a HARD CUT to black (no fade)
      else if (inWink) islandOp = ramp(t, T.wink + 100, T.wink + 350) * (t < T.wink + WINK_START + WINK_HOLD + OUTRO_LINE_DUR ? 1 : 0);
      notchWrap.style.opacity = String(islandOp);
      notchWrap.classList.toggle("seeing", inSee);
      notchWrap.classList.toggle("turbo", inCutSpeak);   // fast glow only, no jump — the pill already spreads + mouth talks
      notchWrap.classList.toggle("eyes-only", inWink);
      notchWrap.classList.toggle("cut-front", inCut);

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

      // THE REAL notch lifecycle, verbatim to LID_SEQ: dozing (default) →
      // listen (sonar + mouth-listen, no text — this beat IS "let's ask
      // him") → captioning (types what was heard) → captioning + speak —
      // the pill spreads sideways AND the mouth talks, his answer typed in
      // the SAME real caption wing (eyes stay visible the whole time, no
      // overlap to solve — this is the notch's own proven mechanic).
      if (inCut) {
        let baseCls: string;
        let capText = "";
        if (cutBt < CUT_TYPE_AT) {
          baseCls = "nf-face on home listen mic-live";
        } else if (cutBt < CUT_PRE_DUR) {
          baseCls = "nf-face on home captioning mic-live";
          const chars = clamp(Math.floor((cutBt - CUT_TYPE_AT) / CUT_TYPE_MS), 0, CUT_PRE_TEXT.length);
          capText = CUT_PRE_TEXT.slice(0, chars);
        } else if (cutBt < CUT_SPEAK_END) {
          baseCls = "nf-face on home captioning speak mic-live";
          const idx = modeIndexAt(cutBt - CUT_PRE_DUR);
          lastMode = idx;
          capText = idx === N - 1 ? MODE_WORDS[idx] : `${MODE_WORDS[idx]}…`;
        } else {
          // The fast words are DONE — the caption clears and he winks, the
          // closing beat of this whole scene, right before "Boom".
          baseCls = "nf-face on home awake nf-wink";
          lastMode = -1;
        }
        if (baseCls !== lastCls) { notch.className = baseCls; lastCls = baseCls; setNotchStatus(notch, ""); }
        if (capEl && capEl.textContent !== capText) capEl.textContent = capText;
      } else {
        if (lastMode !== -1) lastMode = -1;
      }

      // WINK — the OUTRO, reordered: the island forms FAST, he WINKS almost
      // immediately (first), THEN the perimeter line races back OUT — the
      // exact reverse of the boot's slow draw-in, but quicker — completing
      // the loop around the housing as it disappears, before the hard cut
      // to black. No coral wash here; the outro is meant to read fast.
      if (inWink) {
        const rt = t - T.wink;
        const outroStart = WINK_START + WINK_HOLD;   // wink has held; the line starts retracting
        const outroEnd = outroStart + OUTRO_LINE_DUR;
        // sh: 0 = line invisible, 1 = line fully drawn/visible.
        let sh: number;
        let shimmerOp: number;
        let bloomOp: number;
        if (rt < WINK_START) {
          // quick draw-IN as the island appears — much faster than the boot's 2.7s
          sh = ramp(rt, 100, WINK_START);
          shimmerOp = ramp(rt, 100, 300);
          bloomOp = shimmerOp * 0.9;
        } else if (rt < outroStart) {
          sh = 1; shimmerOp = 1; bloomOp = 0.9;   // held fully formed while he winks
        } else {
          // OUTRO: the line retracts around the perimeter and vanishes — the
          // reverse of the boot, and faster (900ms vs. 2700ms).
          const outroT = 1 - ramp(rt, outroStart, outroEnd);
          sh = outroT; shimmerOp = outroT; bloomOp = outroT * 0.9;
        }
        shimmer.style.opacity = String(shimmerOp);
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(bloomOp);
        // WINK FIRST — as soon as he's formed, not after a coral wash.
        const cls = rt >= WINK_START ? "nf-face on home awake nf-wink" : "nf-face on home awake";
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
        if (manualT >= T.end) { resetSceneCaches(); seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } else { startWall = performance.now(); } } // LOOP
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
    const onPlay = () => { if (manualT >= T.end) { resetSceneCaches(); seek(0); } setPlaying(!playing); };
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
    const onFsChange = () => { if (document.fullscreenElement === frame) { resetSceneCaches(); seek(0); setPlaying(true); } };
    document.addEventListener("fullscreenchange", onFsChange);

    const log = (msg: string) => {
      if (logEl) logEl.textContent = msg;
      // eslint-disable-next-line no-console
      console.log("[BeatSync]", msg);
    };

    // DOWNLOAD — there's no pre-rendered video file; this is a LIVE CSS/SVG
    // animation. The only way to turn it into an actual video file is to
    // record it in real time via tab capture (getDisplayMedia) + MediaRecorder,
    // muxed with the synced <audio> track (tab audio comes along for free when
    // the user picks "This Tab" in the share prompt — unavoidable, browser
    // security requires that click). Resolution is whatever the tab is
    // actually rendered at, so fullscreen first for the sharpest capture your
    // display can give — this is NOT a guaranteed hardware-independent 4K
    // render, it's a screen recording of the real thing. MP4 output only
    // happens where the browser's MediaRecorder actually supports an MP4
    // mimeType (Safari); everywhere else (Chrome/Edge/Firefox) it falls back
    // to WebM, which is what those browsers are actually able to produce.
    const downloadBtn = root.querySelector<HTMLButtonElement>(".nt-download");
    let recording = false;
    const onDownload = async () => {
      if (recording) return;
      const md = navigator.mediaDevices as (MediaDevices & { getDisplayMedia?: (c?: unknown) => Promise<MediaStream> }) | undefined;
      if (!md?.getDisplayMedia) { log("Screen recording isn't supported in this browser."); return; }
      recording = true;
      if (downloadBtn) { downloadBtn.disabled = true; downloadBtn.textContent = "●"; }
      let stream: MediaStream | null = null;
      try {
        const portrait = frame.classList.contains("portrait");
        if (!document.fullscreenElement) { try { await frame.requestFullscreen(); } catch { /* user may decline — still proceed at whatever size */ } }
        resetSceneCaches(); seek(0); setPlaying(false);
        await new Promise((r) => setTimeout(r, 200)); // let fullscreen settle before the share prompt captures a frame
        log('Pick "This Tab" in the share prompt to record with sound…');
        // Retina displays have far more PHYSICAL pixels than their logical
        // CSS size suggests (devicePixelRatio). Requesting exactly that many
        // as an "ideal" (never a hard "min") asks for the most real quality
        // the hardware actually has — unlike last time's hardcoded 3840×2160,
        // which exceeded the real source on a smaller screen and corrupted
        // the recording. "ideal" is just a hint the browser clamps safely;
        // it can't fail the way a fixed/min request can.
        const dpr = window.devicePixelRatio || 1;
        const idealW = Math.round((window.screen.width || 1920) * dpr);
        const idealH = Math.round((window.screen.height || 1080) * dpr);
        stream = await md.getDisplayMedia({
          video: { frameRate: 30, aspectRatio: portrait ? 9 / 16 : 16 / 9, width: { ideal: idealW }, height: { ideal: idealH } },
          audio: true,
          preferCurrentTab: true,       // Chrome-only: skips straight to "share this tab" instead of the full picker
          selfBrowserSurface: "include",
        });
        if (!document.fullscreenElement) {
          // the share prompt often force-exits fullscreen — recapture it now
          // that permission is granted, so the actual recorded frame is full
          // native resolution, not whatever small window was left behind.
          try { await frame.requestFullscreen(); await new Promise((r) => setTimeout(r, 200)); } catch { /* proceed at whatever size is available */ }
        }
        const [videoTrack] = stream.getVideoTracks();
        const { width: capW, height: capH } = videoTrack?.getSettings() || {};
        log(`Capturing at ${capW ?? "?"}×${capH ?? "?"} (${portrait ? "9:16" : "16:9"}) — this is your display's real max, not a guaranteed 4K.`);
        const mimeType = [
          "video/mp4;codecs=avc1.640028,mp4a.40.2",
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm",
        ].find((m) => MediaRecorder.isTypeSupported(m)) || "";
        // higher bitrate too — at this resolution 40Mbps was starting to
        // compress visibly; 80Mbps keeps fine text/gradient edges crisp
        const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 80_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
        rec.start(1000);   // periodic chunks, not one giant blob at the end — more resilient if anything hiccups mid-recording
        resetSceneCaches(); seek(0); setPlaying(true);
        log(`Recording at ${capW ?? "?"}×${capH ?? "?"}, real time…`);
        await new Promise((r) => setTimeout(r, T.end + 500));
        rec.stop();
        setPlaying(false);
        await stopped;
        const blob = new Blob(chunks, { type: (mimeType.split(";")[0]) || "video/webm" });
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `braino-notch-teaser.${ext}`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        log(ext === "mp4" ? "Downloaded as MP4 ✓" : "Downloaded as WebM ✓ (this browser's recorder can't output native MP4)");
      } catch (err) {
        log(`Recording cancelled or failed: ${(err as Error)?.message || "?"}`);
      } finally {
        stream?.getTracks().forEach((tr) => tr.stop());
        recording = false;
        if (downloadBtn) { downloadBtn.disabled = false; downloadBtn.textContent = "⬇"; }
      }
    };
    downloadBtn?.addEventListener("click", onDownload);

    // orientation toggle (16:9 / 9:16) — export aspect ratio, applied to
    // .nt-frame before recording starts
    const orientBtns = Array.from(root.querySelectorAll<HTMLButtonElement>(".nt-orient-btn"));
    const orientHandlers = orientBtns.map((btn) => () => {
      frame.classList.toggle("portrait", btn.dataset.ar === "portrait");
      orientBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
    orientBtns.forEach((b, i) => b.addEventListener("click", orientHandlers[i]));

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
      const winkFloor = T.cowork + COWORK_DUR;   // wink must never land before "Co-oking" finishes
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
      downloadBtn?.removeEventListener("click", onDownload);
      orientBtns.forEach((b, i) => b.removeEventListener("click", orientHandlers[i]));
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
            <div className="nt-intro">{INTRO_WORDS.map((w, i) => <span key={i} className={i === 0 ? "nt-word nt-in-first" : "nt-word"}>{w}</span>)}</div>
            <div className="nt-screen">
              <div className="nt-screen-main" />
              <div className="nt-screen-note nt-note-1">{NOTE1_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            </div>
            <div className="nt-hype-open">
              <span className="nt-word nt-hype-anchor">{HYPE_OPEN_ANCHOR}</span>
              <span className="nt-hype-swap nt-swap-stack">
                <span className="nt-word nt-swap-a">
                  <span className="nt-word">smart</span><span className="nt-word nt-fuse">er</span>
                </span>
                <span className="nt-word nt-swap-b">
                  <span className="nt-word">fast</span><span className="nt-word nt-fuse">er.</span>
                </span>
              </span>
            </div>
            <div className="nt-hype" />
            <div className="nt-ready" />
            <div className="nt-boom">{BOOM_PARTS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="nt-tag" />
            <div className="nt-thatsbraino" />
            <div className="nt-thatsbraino-invert" />
            <div className="nt-onemore" />
            <div className="nt-weare">{WEARE_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="nt-cowork-mascot" />
            <div className="nt-cowork">
              {COWORK_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}
              <span className="nt-cowork-swap nt-swap-stack">
                <span className="nt-word nt-swap-a">oking</span>
                <span className="nt-word nt-swap-b">Work</span>
              </span>
            </div>
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
          <span className="nt-orient">
            <button className="nt-orient-btn active" data-ar="landscape" title="Export as 16:9 landscape">16:9</button>
            <button className="nt-orient-btn" data-ar="portrait" title="Export as 9:16 portrait (Reels/Stories)">9:16</button>
          </span>
          <button className="nt-download" title="Record + download this film (tab capture, real-time)">⬇</button>
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
