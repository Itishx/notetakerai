import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import ScriptPanel from "@/components/ScriptPanel";
import TeaserTransport from "@/components/TeaserTransport";
import type { ScriptLine } from "@/lib/teaserScript";
import "./notch-teaser.css";
import "./intro-teaser.css";
import "./maven-teaser.css";
import { GRAPHICS } from "./mavenFilmGraphics";

/* ============================================================================
   /maven-teaser — the Maven launch film. A straight CLONE of /dontblink
   (IntroTeaser.tsx): same engine, same CSS, same cuts. Only the words changed
   (the Maven script), and the notch is replaced by the real Maven pill
   (mavenFilmGraphics.ts, ported from mac/maven/renderer/island.*), which plays
   in the gaps between lines. Everything below is the original /intro notes.
   ============================================================================
   /intro — the FULL combined introductory film. Same engine, same CSS, same
   font as /notch (which stays completely untouched as its own short cut) —
   this is Acts 1-6 (new) prepended in front of /notch's own Acts 7-12
   (copied verbatim, unchanged), reordered: "Deep Breaths." + "LetsFuckingGo"
   now play right after Act 6 ("THE TURN"), BEFORE the notch's boot/wake-up
   sequence — then boot, then "This is Braino."/BrainoNotch fuse/"For your
   Mac." runs straight into "He sees your screen." with no LetsFuckingGo in
   between anymore. Everything else keeps its exact internal order/timing.

     1  COLD OPEN   "Hey." "You've got 71 seconds?" "Perfect." "Don't
                    Blink." (match cut: white invert + 2-frame black flash)
     2  REVEAL      "This." "Is." "Braino." — slow-mo, each its own held beat
     3  SAY HI      "Say hi." "Hi. Hola. Bonjour. नमस्ते. こんにちは. مرحبا."
                    "He speaks all of those." "Moving on."
     4  ANY PAGE    "Any page." "Any question." "Ask it." "Answered." "That
                    4,000-word article?" "Four lines." "Boom."
     5  SEARCH      "Web search? Built in." "Fresh answers." "Real sources."
                    "Zero tab-hopping." "Your RAM says thanks."
     6  THE TURN    "But that's just the browser." → the notch's boot
                    sequence (dozing → authenticating → verdict → wink →
                    captions "hey shawty")
     7  MAC         "Braino." → "For your Mac." → "LetsFuckingGo" (flush,
                    per-word match cut) → he looks down at your screen →
                    "He sees your screen." → "Only when you ask." → HYPE:
                    "He's" [smarter→Faster.] "Like *crazy fast." "chat ngl,
                    even we were surprised." (full match cut, every word)
                    "Because he can... wait... let's just ask him."
     8  LIFECYCLE   "Ready?" → "Don't Blink." (match cut) → the REAL notch
                    lifecycle: listens → captions "What can you do?" →
                    speaks + skills flicker → wink → "Bo"+"om" (match cut,
                    fused, "Boom")
     9  TAGLINE     "Speak." → "Watch" → "It" → "Happen." → "Introducing" →
                    "Braino"+"+Notch" (match cut, single shimmer wave,
                    "BrainoNotch")
    10  ONE MORE    "Oh... and one more thing."
    11  BIGGER      "This is part of / Ready? Lock in. / Braino OS /
                    (Version 1) / (Coming Very Fucking Soon)" — full match
                    cut, every word
    12  LANDING     island forms fast → wink → perimeter retracts → cut to
                    black → "Braino." → "trybraino.com"
   Match-cut rule: the invert flip IS the effect — word-stamp/fade animation
   is suppressed on any line while its match-cut is active (see
   docs/braino-design.md §10).
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── ACT 1 — cold open ──────────────────────────────────────────────────────
// "Hey." and "Perfect." stomp in fast, normal. "You've got 71 seconds?" is a
// separate style — the whole sentence fades in TOGETHER as one unit (see
// it-fade-whole + the explicit all-at-once override below), not word-by-word.
const ACT1_PHRASES = [["You"], ["talk", "faster", "than", "you"], ["type."]];
const ACT1_SW = 300;
const ACT1_SWS = [ACT1_SW, ACT1_SW, ACT1_SW];
const ACT1_GAPS: number[] = []; ACT1_GAPS[1] = 900;   // extra hold so the fade-together beat has time to read
// "Don't" — its own beat, own match cut — then "Bli"+"+nk." fuses, big,
// its own match cut too, then a hard 2-frame (66ms) cut to black before
// Act 2 fades up.
const DONTBLINK_PHRASES = [["So", "why", "are", "you"], ["still", "typ", "+ing?"]];
const DONTBLINK_SW = 320;
const DONTBLINK_SWS = [DONTBLINK_SW, DONTBLINK_SW];
const DONTBLINK_GAPS: number[] = [];
const BLACKBEAT_HOLD = 66;   // 2 frames @ 30fps

// ── ACT 2 — "Meet." ──────────────────────────────────────────────────────
// "Meet" holds, then MATCH CUT — plain invert flash into "Braino.", same
// convention as every other cut in the film (no scale/pop animation).
// "you'll ever see." lands as a CALLBACK — same host, same size/position
// as the opener, so it reads as the same frame coming back.
const WAKE_PRE = 800;   // longer pause between "Maven." and the pill forming
const ACT2_PHRASES = [
  ["Meet"],
  ["Mav", "+en."],
];
const ACT2_SW = 260;
const ACT2_GAPS: number[] = []; ACT2_GAPS[0] = 40; ACT2_GAPS[1] = WAKE_PRE + GRAPHICS.wake.dur + 250;   // a held black beat after "Maven.", then the pill forms

// ── ACT 3 — what he does ────────────────────────────────────────────────────
// No question framing here anymore — the film was asking "what does/else can
// he do" THREE times (here, in Hype, and the notch's own "What can you do?"
// caption right before the skills flicker). Only Hype's line asks the
// question now; this act just shows, as statements. The app names
// (GitHub/Notion/Gmail/Figma/Spotify) stomp in dead centre, same spot as
// every other word, plain text, every word the same colour EXCEPT Spotify,
// which stays green. "Anything." breaks it — holds 2x longer, silent. Then
// three situation → action beats: a meeting getting recorded/transcribed
// (MATCH CUT + the "Braino is listening" blue glow); a long article he just
// reads for you — TWO MATCH CUTS for the "Press Control x2" double
// keystroke, then a callback cut on "ChatGPT." as the old copy-paste
// workflow dies; and an inbox getting cleaned and replied to in under five
// seconds (MATCH CUT, the payoff line), capped by the actual pitch.
// 40-second cut (2026-10-28): the short script, and only three pill beats
// that read on their own: wake, listen-then-green, send.
const ACT3_PHRASES = [
  ["Hold", "a", "key."],                 // 0
  ["Talk."],                             // 1 — then the pill listens and goes green (gap)
  ["It's", "al", "+ready", "written."],  // 2 — match cut
  ["No", "“umm”."],                      // 3
  ["No", "“like”."],                     // 4 — match cut
  ["Works", "any", "+where"],            // 5
  ["you", "type."],                      // 6
  ["Even", "in"],                        // 7
  ["Hing", "+lish."],                    // 8 — fused, big, match cut + shimmer
];
const ACT3_SW = 300;
const ACT3_SWS = ACT3_PHRASES.map(() => ACT3_SW);
const PILL_PAD = 250;   // black before and after the pill in a gap
const ACT3_GAPS: number[] = [];
ACT3_GAPS[2] = GRAPHICS.done.dur + 2 * PILL_PAD;   // after "It's already written."
ACT3_GAPS[4] = 300;
ACT3_GAPS[6] = 300;
ACT3_GAPS[8] = 460;
// the pill beats inside Act 2/3's gaps: [act, phrase index, graphic]
const PILL_GAPS: [2 | 3, number, keyof typeof GRAPHICS][] = [[2, 1, "wake"], [3, 2, "done"]];

// ── ACT 4 — web search ──────────────────────────────────────────────────────
// "Web Search" and "Built In" land as their own single beats (not word by
// word). "Fresh answers." / "Real sources." / "Zero tab-hopping." — GROUP B
// — stomp in dead centre, same spot as everything else, one after another,
// normal speed (the fast tak-tak-tak ramp here read as too fast — reverted).
// "Your RAM" / "says thanks." lands as two chunks. Plain match cut on
// "Zero tab-hopping." landing (no vacuum/sliver-tab graphic yet).
const ACT4_PHRASES = [
  ["One", "more"],
  ["thing."],
];
const ACT4_SW = 260;
const ACT4_GAPS: number[] = [];

// ── ACT 5 — the turn / close match ──────────────────────────────────────────
// "But that's just Chrome." → "So what happens when you" → "close it?" — the
// film's hinge, straight into the notch reveal. Plain invert match cut for
// now (no browser-window morph graphic yet — animated later with real art).
const TURN_PHRASES = [["Say"], ["“Tell", "Rahul"], ["I’m", "running", "late.”"]];
const TURN_SW = 280;
const TURN_GAPS: number[] = []; TURN_GAPS[0] = 380; TURN_GAPS[1] = 160;

// "Deep Breaths." — right after the close-match, before the notch boot
// animation. A deliberate held beat, NOT part of the speed ramp below —
// same exception as "Ready?/Lock in." in the finale, the film gets a moment
// to exhale before it keeps accelerating.
const DEEPBREATHS_WORDS = ["Maven"];
const DEEPBREATHS_SW = 380;

// ── Syllable chunking (Part A — "This is Braino." onward) ───────────────────
// A beat is only ALIVE while something is stamping in, so a long word sitting
// whole on one beat goes static and the film reads like pasted frames. Split
// every long word at its median letter and the second half becomes a "+"
// fused chunk: each half gets its own stamp, and they still render flush as
// one word ("Th"+"is" reads as "This", no seam).
//
// REVERSIBLE: flip CHUNK_WORDS to false and Part A goes back to whole words.
// Nothing else needs touching — every index that depends on span counts is
// derived from the map below, not hardcoded.
const CHUNK_WORDS = false;   // Maven: whole words; chunks are hand-picked in the arrays
// Under 4 letters stays whole: "is", "a", "to", "do", "and", "you", "was",
// "the", "for" — the two-letter words and function words. 4+ splits, so
// "This" -> "Th"+"is" and "Braino" -> "Bra"+"ino".
const CHUNK_MIN_LEN = 4;
// Function words stay whole even at 4+ letters. Chunking earns its keep on
// words that carry weight; splitting the connective tissue ("yo/ur", "ju/st",
// "el/se") just reads as a stutter. Short words are already percussive, which
// is why the static-frame problem was never about them.
const CHUNK_SKIP = new Set([
  "your", "yours", "that", "with", "from", "they", "them", "their", "there",
  "have", "been", "were", "will", "just", "else", "what", "when", "than",
  "then", "these", "those", "some", "such", "into", "onto", "over",
  "only", "also", "both", "each", "same", "very", "much", "more", "most",
]);

// One word -> its chunks. Preserves a leading "+" (fuse) / "*" (shimmer)
// marker, any leading bracket, and trailing punctuation. "*" words are left
// whole — the shimmer sweep is a single-span effect and splitting kills it.
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

// Chunks a phrase and hands back the map that keeps downstream index math
// honest: wordToChunks[originalWordIdx] = [chunk indices], and
// chunkToWord[chunkIdx] = originalWordIdx (used by the every-other-word
// invert strobes, which must alternate per WORD, not per chunk).
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
// last chunk index of an original word — what the match-cut landings compare against
const lastChunkOf = (c: Chunked, wordIdx: number) => c.wordToChunks[wordIdx][c.wordToChunks[wordIdx].length - 1];

// ── /notch's own script, copied verbatim (Acts 7-12) ────────────────────────
// "This is Braino." lands (RHYME MATCH, same position/size as Act 2's
// "Braino."). "Braino." itself never moves and is never re-stamped — it's
// the SAME word, same DOM span, the whole way through. Right as "+Notch"
// fuses onto it, THAT is the match cut, and in the same instant "This"/"is"
// disappear — leaving "Braino Notch" alone, centred. One continuous phrase,
// not a phrase transition. "For your Mac." + LetsFuckingGo (INTRO_WORDS
// below) are untouched — same mechanic, same timing math as always.
const OPEN_SRC = [["Mav", "+en."]];
const OPEN_CHUNKS = chunkScript(OPEN_SRC);
const OPEN_PHRASES = chunkedWords(OPEN_CHUNKS);
const OPEN_SW = [270, 270];
const OPEN_GAPS: number[] = []; OPEN_GAPS[0] = 1400;   // Maven: hold on the last word, the film ends here   // hold after the fuse so the shimmer reads before "For your Mac."
const INTRO_WORDS = ["sends", "it."];
const SCREEN_MAIN_PHRASES = chunkedWords(chunkScript([["Out", "now"]]));
const NOTE1_WORDS = ["on", "Mac."];
const TAG_PHRASES = chunkedWords(chunkScript([["Speak."], ["Watch"], ["It"], ["Happen."]]));
const TAG_SW = 180;   // ramp continues — was 230
const TAG_GAPS: number[] = []; TAG_GAPS[0] = 340;
const ONEMORE_PHRASES = chunkedWords(chunkScript([["Oh..."], ["and", "one", "more", "thing."]]));
const BIGGER_SRC = [
  ["This", "is", "part", "of"],
  ["Ready?", "Lock", "in."],
  ["Braino", "+OS"],
  ["I", "O", "M", "I"],   // matches the actual IOMI page — spaced letters, every one its own cut (see isIomiPhrase below)
  ["(Coming", "+Very", "+Fucking", "+Soon)"],   // flush, LetsFuckingGo energy — one word: (ComingVeryFuckingSoon)
];
const BIGGER_CHUNKS = chunkScript(BIGGER_SRC);
const BIGGER_PHRASES = chunkedWords(BIGGER_CHUNKS);
// deliberately NOT part of the speed ramp — "Ready?/Lock in." is the film's
// biggest match cut, same energy as LetsFuckingGo but slower and heavier,
// each word gets a full beat. Everything else trends faster; this is the
// one intentional contrast.
const BIGGER_SW = 300;
const BIGGER_GAPS: number[] = [];
BIGGER_GAPS[0] = 450;   // "This is part of" dangles — held 1.5x too long, deliberately incomplete
BIGGER_GAPS[3] = 1300;  // IOMI needs real time to hold at its big size + play the full shimmer sweep before the next line
const GREET_CAP = "hey shawty";
const MODE_WORDS = [
  "Browsing", "Coding", "Emailing", "Booking",
  "Scheduling", "Designing", "Debugging", "Translating",
  "Summarizing", "Automating", "Remembering", "Shopping",
  "Navigating", "Organizing", "Recording", "Researching",
  "Reminding", "Listening", "Watching. Always.",
];
const BOOM_PARTS = ["Bo", "om"];
const BOOM_STARTS = [0, 253];
const BOOM_DUR = 600;

const MODE_DURS = MODE_WORDS.map((_, i) =>
  i === MODE_WORDS.length - 1 ? 620 : Math.round(170 - (170 - 55) * (i / (MODE_WORDS.length - 2)))
);
const MODE_CUM: number[] = [];
{ let acc = 0; for (const d of MODE_DURS) { MODE_CUM.push(acc); acc += d; } }
const MODES_TOTAL = MODE_DURS.reduce((a, b) => a + b, 0);
const BOOT_LEN = 7700;
const WINK_START = 550;
const WINK_HOLD = 650;
const OUTRO_LINE_DUR = 900;
const WINK_TAIL = 200;   // Maven: cut to black right after "Maven."
const BIGGER_HOLD = 300;
const ONEMORE_HOLD = 200;
const HYPE_OPEN_ANCHOR = "He’s";
const HYPE_OPEN_SWAP_AT = 480;
const HYPE_OPEN_DUR = 0;   // Maven: no hype scene

// "chat ngl," breaks onto its own beat, "even I was surprised." right after
// it — nonstop match-cut rhythm across the break (see hypeInv in render()).
const HYPE_SRC = [["Like", "*crazy", "fast."], ["chat", "ngl,"], ["even", "I", "was", "surprised."], ["What", "else", "can", "he", "do?"], ["Let's", "just", "ask", "him."], ["Eyes", "open."]];
const HYPE_CHUNKS = chunkScript(HYPE_SRC);
const HYPE_PHRASES = chunkedWords(HYPE_CHUNKS);
const HYPE_SW = 250;   // ramp continues — was 340
const HYPE_GAPS: number[] = []; HYPE_GAPS[0] = 500; HYPE_GAPS[1] = 60; HYPE_GAPS[2] = 90; HYPE_GAPS[3] = 340; HYPE_GAPS[4] = 380;
const READY_CHUNKS = chunkScript([["Ready?"], ["Don't", "Blink."]]);
const READY_PHRASES = chunkedWords(READY_CHUNKS);
const READY_SW = 210;   // ramp continues — was 280
const READY_GAPS: number[] = []; READY_GAPS[0] = 500; READY_GAPS[1] = 350;
const CUT_PRE_TEXT = "What can you do?";
const CUT_TYPE_MS = 45;
const CUT_LISTEN_DUR = 400;
const CUT_TYPE_DUR = CUT_PRE_TEXT.length * CUT_TYPE_MS + 150;
const CUT_WINK_DUR = 650;
const CUT_LISTEN_AT = 0;
const CUT_TYPE_AT = CUT_LISTEN_AT + CUT_LISTEN_DUR;
const CUT_PRE_DUR = CUT_TYPE_AT + CUT_TYPE_DUR;
const CUT_SPEAK_END = CUT_PRE_DUR + MODES_TOTAL;
const CUT_DUR = CUT_SPEAK_END + CUT_WINK_DUR;

const SW = { open: 280, screen: 220 };   // ramp continues — was 360/280
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

const ACT1_TOTAL = phraseSeq(ACT1_PHRASES, ACT1_SWS, ACT1_GAPS).total;
const DONTBLINK_TOTAL = phraseSeq(DONTBLINK_PHRASES, DONTBLINK_SWS, DONTBLINK_GAPS).total;
const ACT2_TOTAL = phraseSeq(ACT2_PHRASES, ACT2_SW, ACT2_GAPS).total;
const ACT3_TOTAL = phraseSeq(ACT3_PHRASES, ACT3_SWS, ACT3_GAPS).total;
const ACT4_TOTAL = phraseSeq(ACT4_PHRASES, ACT4_SW, ACT4_GAPS).total;
const TURN_TOTAL = phraseSeq(TURN_PHRASES, TURN_SW, TURN_GAPS).total;
const DEEPBREATHS_TOTAL = DEEPBREATHS_WORDS.length * DEEPBREATHS_SW + GAP;

const HYPE_DUR = phraseSeq(HYPE_PHRASES, HYPE_SW, HYPE_GAPS).total;
const READY_TOTAL = phraseSeq(READY_PHRASES, READY_SW, READY_GAPS).total;
const TAG_TOTAL = phraseSeq(TAG_PHRASES, TAG_SW, TAG_GAPS).total;
const ONEMORE_DUR = phraseSeq(ONEMORE_PHRASES, 300).total + ONEMORE_HOLD;
const BIGGER_DUR = phraseSeq(BIGGER_PHRASES, BIGGER_SW, BIGGER_GAPS).total + BIGGER_HOLD;

const screenTimes = (sw: number, _H: number) => {
  const mainEnd = SCREEN_MAIN_PHRASES[0].length * sw + GAP;
  const mainStarts = [0];
  const n1Start = mainEnd;
  const n1End = n1Start + NOTE1_WORDS.length * sw + GAP;
  const total = n1End;
  return { mainStarts, mainEnd, n1Start, n1End, total };
};

// Build the timeline. Acts 1-6 are new, chained forward with fixed/H-scaled
// gaps like everything else. Reordered from /notch's own timeline: "Deep
// Breaths." then LetsFuckingGo (`intro`) both now sit right after Act 6's
// turn line, BEFORE the notch's boot/wake-up — then boot, then `open`
// ("This is Braino." → BrainoNotch fuse → "For your Mac.") runs straight
// into "He sees your screen." (`see`), no LetsFuckingGo in between anymore.
const buildTimeline = (H: number, snap?: (ms: number, down: boolean) => number) => {
  let last = -1;
  const S2 = (ms: number, doSnap = false) => {
    let v = doSnap && snap ? snap(ms, true) : Math.round(ms);
    if (v <= last + 120) v = Math.round(Math.max(ms, last + 120));
    last = v;
    return v;
  };
  const act1 = S2(300);
  const dontBlink = S2(act1 + ACT1_TOTAL + H * 0.1);
  const blackBeat = S2(dontBlink + DONTBLINK_TOTAL, true);          // SNAP: the beat drop
  const act2 = S2(blackBeat + BLACKBEAT_HOLD + H * 0.15);
  const act3 = S2(act2 + ACT2_TOTAL + H * 0.15);
  // Maven (2026-10-29): no "One more thing / Say Tell Rahul / Maven sends it"
  // text — straight from "Hinglish." into the Do flow. Those scenes are
  // squeezed to the 120ms minimum and never shown (hidden in render()).
  const act4 = S2(act3 + ACT3_TOTAL + H * 0.15);
  const turn = S2(act4);
  const deepBreaths = S2(turn);
  const intro = S2(deepBreaths);
  const boot = S2(intro, true);   // SNAP: the Do flow hits a downbeat
  const open = S2(boot + GRAPHICS.send.dur + 300);
  const see = S2(open + phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).total);
  const screen = S2(see);
  // Maven: the notch's hype/ready/lifecycle/boom/tag/one-more/bigger scenes
  // are not used — parked far past the end so they never render.
  const hype = 1e9, ready = 1e9 + 1, button = 1e9 + 2, boom = 1e9 + 3, tag = 1e9 + 4, oneMore = 1e9 + 5, bigger = 1e9 + 6;
  const wink = S2(screen);   // Maven: ends on "Maven."
  const end = Math.round(wink + WINK_TAIL);
  return {
    act1, dontBlink, blackBeat, act2, act3, act4, turn, deepBreaths,
    open, intro, boot, see, screen, hype, ready, button, boom, tag, oneMore, bigger, wink, end,
  };
};

// timeline editor — scene boundaries shown as labeled ticks (so pacing/lag
// is visible at a glance), reused by the click-to-toggle match-cut markers.
const SCENE_MARKS: { key: string; label: string }[] = [
  { key: "act1", label: "You talk" }, { key: "dontBlink", label: "Still typing" }, { key: "act2", label: "Meet Maven" },
  { key: "act3", label: "Hold a key" }, { key: "act4", label: "One more thing" }, { key: "turn", label: "Tell Rahul" },
  { key: "deepBreaths", label: "Maven sends it" }, { key: "boot", label: "Send" }, { key: "open", label: "Maven. Talk." },
  { key: "screen", label: "Out now" }, { key: "wink", label: "Pill" },
];

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

const TARGET_MS = buildTimeline(1200).end;   // Maven: hold fixed at 1200 (no 71-second target)
const DEFAULT_H = solveHold(TARGET_MS);
const DEFAULT_T = buildTimeline(DEFAULT_H);

// ── read-along script panel — DERIVED ONLY from the arrays/timeline above
// (never hand-duplicated), so the panel can never drift from the actual
// film. "+word"/"*word" chunks (manual or auto via chunkWord) are rejoined
// flush, same as they render on screen. ──
const joinPhrase = (words: string[]) => {
  let out = "";
  words.forEach((w) => {
    const fused = w.startsWith("+");
    const text = fused || w.startsWith("*") ? w.slice(1) : w;
    out += fused || out === "" ? text : ` ${text}`;
  });
  return out;
};

function buildScriptLines(T: typeof DEFAULT_T): ScriptLine[] {
  const lines: ScriptLine[] = [];
  const group = (base: number, phrases: string[][], sw: number | number[], gaps?: number[]) => {
    const starts = phraseSeq(phrases, sw, gaps).starts;
    phrases.forEach((p, i) => lines.push({ tStart: base + starts[i], text: joinPhrase(p) }));
  };

  group(T.act1, ACT1_PHRASES, ACT1_SWS, ACT1_GAPS);
  group(T.dontBlink, DONTBLINK_PHRASES, DONTBLINK_SWS, DONTBLINK_GAPS);
  group(T.act2, ACT2_PHRASES, ACT2_SW, ACT2_GAPS);
  group(T.act3, ACT3_PHRASES, ACT3_SWS, ACT3_GAPS);
  lines.push({ tStart: T.boot, text: "Tell Rahul I’m running late. Sent." });
  group(T.open, OPEN_PHRASES, OPEN_SW, OPEN_GAPS);
  return lines.sort((a, b) => a.tStart - b.tStart);
}
const SCRIPT_LINES = buildScriptLines(DEFAULT_T);

export default function MavenTeaser() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playingUi, setPlayingUi] = useState(true);
  const controlsApiRef = useRef<{ seek: (ms: number) => void; onPlay: () => void; restart: () => void } | null>(null);

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
    const oneMore = q(".nt-onemore");
    const bigger = q(".nt-bigger");
    const glitch = q(".nt-glitch");
    const invert2 = q(".nt-invert2");
    // Acts 1-6 elements
    const act1El = q(".it-act1");
    const dontBlinkEl = q(".it-dontblink");
    const blackBeatEl = q(".it-black");
    const act2El = q(".it-act2");
    const act3El = q(".it-act3");
    const act4El = q(".it-act4");
    const turnEl = q(".it-turn");
    const deepBreathsEl = q(".it-deepbreaths");
    const itInvert = q(".it-invert");
    const screenGlow = q(".it-screenglow");
    const frameCounter = q(".nt-framecounter");
    const pillCtx = root.querySelector<HTMLCanvasElement>(".mvt-pill")!.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let T = { ...DEFAULT_T };
    const P = { ...SW };
    let holdMs = DEFAULT_H;
    let openStarts = phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).starts;
    let oneMoreStarts = phraseSeq(ONEMORE_PHRASES, 300).starts;
    const biggerStarts = phraseSeq(BIGGER_PHRASES, BIGGER_SW, BIGGER_GAPS).starts;
    const hypeStarts = phraseSeq(HYPE_PHRASES, HYPE_SW, HYPE_GAPS).starts;
    const readyStarts = phraseSeq(READY_PHRASES, READY_SW, READY_GAPS).starts;
    const tagStarts = phraseSeq(TAG_PHRASES, TAG_SW, TAG_GAPS).starts;
    const act1Starts = phraseSeq(ACT1_PHRASES, ACT1_SWS, ACT1_GAPS).starts;
    const dontBlinkStarts = phraseSeq(DONTBLINK_PHRASES, DONTBLINK_SWS, DONTBLINK_GAPS).starts;
    const act2Starts = phraseSeq(ACT2_PHRASES, ACT2_SW, ACT2_GAPS).starts;
    const act3Starts = phraseSeq(ACT3_PHRASES, ACT3_SWS, ACT3_GAPS).starts;
    const act4Starts = phraseSeq(ACT4_PHRASES, ACT4_SW, ACT4_GAPS).starts;
    const turnStarts = phraseSeq(TURN_PHRASES, TURN_SW, TURN_GAPS).starts;

    // ── editor: click-to-toggle match-cut markers on the timeline (Acts 1-6
    // only — /notch's own copied scenes, Acts 7-12, stay fixed for now).
    // Persisted to localStorage so toggles survive a reload. ──
    let disabledCuts: Set<string>;
    try { disabledCuts = new Set(JSON.parse(localStorage.getItem("it-disabled-cuts") || "[]")); }
    catch { disabledCuts = new Set(); }
    const cutOn = (id: string) => !disabledCuts.has(id);
    const CUT_MARKS: { id: string; label: string; time: () => number }[] = [
      { id: "perfect", label: "type.", time: () => T.act1 + act1Starts[2] },
      { id: "dont", label: "So why are you", time: () => T.dontBlink },
      { id: "blink", label: "still typ+ing?", time: () => T.dontBlink + dontBlinkStarts[1] },
      { id: "meetBraino", label: "Meet → Maven.", time: () => T.act2 + act2Starts[1] },
      { id: "recording", label: "already written.", time: () => T.act3 + act3Starts[2] },
      { id: "control1", label: "No like.", time: () => T.act3 + act3Starts[4] },
      { id: "ask", label: "Hinglish.", time: () => T.act3 + act3Starts[8] },
      { id: "tabhop", label: "thing.", time: () => T.act4 + act4Starts[1] },
      { id: "close", label: "late.”", time: () => T.turn + turnStarts[2] },
      { id: "thisIsBraino", label: "Mav", time: () => T.open + openStarts[0] },
      { id: "brainoNotch", label: "Mav+en. fuse.", time: () => T.open + openStarts[0] + OPEN_SW[0] },
    ];
    let st = screenTimes(P.screen, holdMs);
    const recomputeStarts = () => {
      openStarts = phraseSeq(OPEN_PHRASES, OPEN_SW, OPEN_GAPS).starts;
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

    const scMain = screen.querySelector<HTMLElement>(".nt-screen-main")!;
    const note1 = screen.querySelector<HTMLElement>(".nt-note-1")!;
    const capEl = notch.querySelector<HTMLElement>(".nf-cap-l");

    const N = MODE_WORDS.length;
    const modeIndexAt = (el: number) => {
      let idx = 0;
      for (let i = 0; i < N; i++) if (el >= MODE_CUM[i]) idx = i;
      return clamp(idx, 0, N - 1);
    };

    // reset
    root.querySelectorAll<HTMLElement>(".nt-word").forEach((w) => w.classList.remove("in"));
    [notchWrap, bloom, intro, openLine, screen, hypeOpen, hype, ready, boom, tag, oneMore, bigger,
      act1El, dontBlinkEl, act2El, act3El, act4El, turnEl, deepBreathsEl].forEach((el) => (el.style.opacity = "0"));
    [hypeSwapA, hypeSwapB].forEach((el) => { el.style.visibility = "hidden"; el.style.opacity = "0"; });
    glitch.style.opacity = "0"; bigger.classList.remove("invert-flash", "it-iomi-reveal");
    blackBeatEl.style.opacity = "0"; itInvert.style.opacity = "0";
    screenGlow.style.opacity = "0"; screenGlow.classList.remove("it-listening");
    [dontBlinkEl, act1El, act2El, act3El, act4El, turnEl, deepBreathsEl, openLine].forEach((el) => el.classList.remove("invert-flash"));
    dontBlinkEl.classList.remove("it-blink-big");
    notchWrap.classList.remove("cut-front");
    invert2.style.opacity = "0"; intro.classList.remove("invert-flash");
    notch.className = "nf-face on home dozing";
    notchWrap.className = "nt-notch";

    if (reduced) { tag.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".nt-tag .nt-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0, lastCls = "", lastMode = -1, lastStatus = "__";
    let firedNotchShimmer = false, firedAskShimmer = false, firedIomiShimmer = false, firedDontBlink = false;
    let audioAnchor = 0;
    let playing = true, manualT = 0, startWall = performance.now();
    const controls = root.querySelector<HTMLElement>(".nt-scrubber");
    const slider = root.querySelector<HTMLInputElement>(".nt-scrub");
    const playBtn = root.querySelector<HTMLButtonElement>(".nt-play");
    const timeLabel = root.querySelector<HTMLElement>(".nt-time");
    if (slider) slider.max = String(T.end);

    // ── editor controls ──
    const editBtn = root.querySelector<HTMLButtonElement>(".nt-editbtn");
    const timelineHost = root.querySelector<HTMLElement>(".nt-timeline-marks");
    const fontScaleInput = root.querySelector<HTMLInputElement>(".nt-fontscale");
    const bgColorInput = root.querySelector<HTMLInputElement>(".nt-bgcolor");
    const stageEl = root.querySelector<HTMLElement>(".nt-stage");
    const filmsEl = document.querySelector<HTMLElement>(".nt-films");
    const frameEl = root.querySelector<HTMLElement>(".nt-frame");   // same element `frame` (declared later) will refer to — used here so we don't reference `frame` before its declaration (that was the crash: TDZ ReferenceError)

    const savedScale = localStorage.getItem("it-font-scale") || "1";
    const savedBg = localStorage.getItem("it-bg-color") || "#000000";
    if (stageEl) { stageEl.style.transform = `scale(${savedScale})`; stageEl.style.transformOrigin = "center center"; }
    if (filmsEl) filmsEl.style.background = savedBg;
    if (frameEl) frameEl.style.background = savedBg;
    if (fontScaleInput) fontScaleInput.value = savedScale;
    if (bgColorInput) bgColorInput.value = savedBg;

    const onFontScale = (e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      if (stageEl) stageEl.style.transform = `scale(${v})`;
      localStorage.setItem("it-font-scale", v);
    };
    const onBgColor = (e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      if (filmsEl) filmsEl.style.background = v;
      if (frameEl) frameEl.style.background = v;
      localStorage.setItem("it-bg-color", v);
    };
    fontScaleInput?.addEventListener("input", onFontScale);
    bgColorInput?.addEventListener("input", onBgColor);

    let editMode = false;
    const onEditToggle = () => {
      editMode = !editMode;
      document.body.classList.toggle("nt-editmode", editMode);
    };
    editBtn?.addEventListener("click", onEditToggle);

    // scene ticks (view-only, labeled, so pacing/lag is visible at a glance)
    // + match-cut markers (click to toggle, persisted). Rebuilt whenever T
    // changes (after beat-sync recomputes the whole timeline).
    const renderTimeline = () => {
      if (!timelineHost) return;
      const ticks = SCENE_MARKS.map((m) => {
        const time = (T as unknown as Record<string, number>)[m.key];
        const pct = clamp((time / T.end) * 100, 0, 100);
        return `<span class="nt-tick" style="left:${pct}%" title="${m.label}"></span>`;
      }).join("");
      const cuts = CUT_MARKS.map((c) => {
        const pct = clamp((c.time() / T.end) * 100, 0, 100);
        return `<button class="nt-cutmark ${cutOn(c.id) ? "on" : "off"}" data-id="${c.id}" style="left:${pct}%" title="${c.label} — click to toggle its match cut"></button>`;
      }).join("");
      timelineHost.innerHTML = ticks + cuts;
    };
    const onTimelineClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".nt-cutmark");
      if (!btn) return;
      const id = btn.dataset.id!;
      if (disabledCuts.has(id)) disabledCuts.delete(id); else disabledCuts.add(id);
      localStorage.setItem("it-disabled-cuts", JSON.stringify([...disabledCuts]));
      btn.classList.toggle("on"); btn.classList.toggle("off");
    };
    timelineHost?.addEventListener("click", onTimelineClick);
    renderTimeline();

    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const resetSceneCaches = () => { kinCache.clear(); seqIdx.clear(); };
    const kineticAt = (host: HTMLElement, active: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(":scope > .nt-word, :scope > .it-word")), last: -2 }; kinCache.set(host, c); }
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      const c = kinCache.get(host);
      const len = c ? c.spans.length : host.querySelectorAll(".nt-word, .it-word").length;
      const active = t - start < 0 ? -1 : Math.min(len - 1, Math.floor((t - start) / per));
      kineticAt(host, active);
    };
    const kineticStarts = (host: HTMLElement, starts: number[], sceneStart: number, t: number) => {
      const rel = t - sceneStart;
      let active = -1;
      for (let i = 0; i < starts.length; i++) if (rel >= starts[i]) active = i;
      kineticAt(host, active);
    };

    const seqIdx = new Map<HTMLElement, number>();
    const sequence = (host: HTMLElement, phrases: string[][], starts: number[], sceneStart: number, sw: number | number[], t: number, cls = "nt-word") => {
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
          const extra = fuse ? " nt-fuse" : emph ? " nt-emph" : "";
          const text = fuse || emph ? w.slice(1) : w;
          return `<span class="${cls}${extra}">${text}</span>`;
        }).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);
      }
      kinetic(host, sceneStart + starts[idx], phraseSw(sw, idx), t);
    };

    // The whole film from an ARBITRARY time t (ms) — deterministic → scrubbable.
    const render = (t: number) => {
      shimmer.style.opacity = "0";
      frameCounter.textContent = `${(t / 1000).toFixed(2)}s · f${Math.round(t / 33.333)}`;

      // ── ACTS 1-6 (new) ──
      act1El.style.opacity = String(ramp(t, T.act1, T.act1 + 100) * (1 - ramp(t, T.dontBlink - 200, T.dontBlink - 60)));
      sequence(act1El, ACT1_PHRASES, act1Starts, T.act1, ACT1_SWS, t, "nt-word");
      // "You've got 71 seconds?" (phrase idx 1) fades in as ONE unit —
      // separate style from the fast stomps around it. Bypasses kinetic()'s
      // per-word timing entirely (the near-zero-cadence trick this used
      // before was fragile and left it invisible) — the instant this phrase
      // is current, force all 4 words active/visible together, directly.
      act1El.classList.toggle("it-fade-whole", seqIdx.get(act1El) === 1);
      if (seqIdx.get(act1El) === 1) {
        const c = kinCache.get(act1El);
        if (c && c.last < c.spans.length - 1) {
          c.last = c.spans.length - 1;
          c.spans.forEach((sp) => sp.classList.add("in"));
        }
      }
      // MATCH CUT — "Perfect." (last phrase, idx 2) lands.
      const perfectLanded = t < T.dontBlink && seqIdx.get(act1El) === 2 && (kinCache.get(act1El)?.last ?? -1) === 0 && cutOn("perfect");
      act1El.classList.toggle("invert-flash", perfectLanded);

      dontBlinkEl.style.opacity = String(ramp(t, T.dontBlink, T.dontBlink + 90) * (1 - ramp(t, T.blackBeat - 40, T.blackBeat)));
      sequence(dontBlinkEl, DONTBLINK_PHRASES, dontBlinkStarts, T.dontBlink, DONTBLINK_SWS, t);
      // MATCH CUT — "Don't" (phrase idx 0) lands on its own.
      const dontLanded = t < T.blackBeat && seqIdx.get(dontBlinkEl) === 0 && (kinCache.get(dontBlinkEl)?.last ?? -1) === 0 && cutOn("dont");
      // "Bli"+"+nk." fuses, big — its own held beat and its own match cut.
      dontBlinkEl.classList.toggle("it-blink-big", seqIdx.get(dontBlinkEl) === 1);
      const blinkLanded = t < T.blackBeat && seqIdx.get(dontBlinkEl) === 1 && (kinCache.get(dontBlinkEl)?.last ?? -1) === DONTBLINK_PHRASES[1].length - 1 && cutOn("blink");
      const dontBlinkLanded = dontLanded || blinkLanded;
      dontBlinkEl.classList.toggle("invert-flash", dontBlinkLanded);
      if (dontBlinkLanded && !firedDontBlink) firedDontBlink = true;
      if (!dontBlinkLanded) firedDontBlink = false;
      itInvert.style.opacity = dontBlinkLanded ? "1" : "0";

      // the 2-frame hard black cut, right after the invert lands
      blackBeatEl.style.opacity = String(ramp(t, T.blackBeat, T.blackBeat + 20) * (1 - ramp(t, T.blackBeat + BLACKBEAT_HOLD - 20, T.blackBeat + BLACKBEAT_HOLD)));

      act2El.style.opacity = String(ramp(t, T.act2, T.act2 + 100) * (1 - ramp(t, T.act3 - 220, T.act3 - 60)));
      sequence(act2El, ACT2_PHRASES, act2Starts, T.act2, ACT2_SW, t, "nt-word");
      // MATCH CUT — "Meet" → "Braino." lands. Plain invert flash, same
      // convention as every other cut in the film — no scale/pop animation.
      // "you'll ever see." (phrase idx 3) is the CALLBACK — same host, same
      // size/position as the opener, no extra code needed for that to read
      // as the same frame.
      const act2PhraseIdx = seqIdx.get(act2El) ?? -1;
      const meetBrainoLanded = t < T.act3 && act2PhraseIdx === 1 && (kinCache.get(act2El)?.last ?? -1) === 0 && cutOn("meetBraino");
      act2El.classList.toggle("invert-flash", meetBrainoLanded);

      act3El.style.opacity = String(ramp(t, T.act3, T.act3 + 100) * (1 - ramp(t, T.act4 - 220, T.act4 - 60)));
      sequence(act3El, ACT3_PHRASES, act3Starts, T.act3, ACT3_SWS, t, "nt-word");
      const act3PhraseIdx = seqIdx.get(act3El) ?? -1;
      // GitHub/Notion/Gmail/Figma/Spotify (idx 1-5) stomp in dead centre —
      // same spot as every other word, one after the other, plain text — no
      // highlight/chip. Every word is the same colour except Spotify, which
      // stays green. "Anything." (idx 6) breaks it — off-white, held.
      if (act3PhraseIdx === -1) {
        const span = kinCache.get(act3El)?.spans[0];
        if (span) span.style.color = "#25D366";
      }
      act3El.classList.toggle("it-anything", false);
      // "As"+"+k." — the closing fuse — gets its own held beat, 3x size.
      act3El.classList.toggle("it-ask-big", act3PhraseIdx === 8);
      // MATCH CUT — "He's already recording." (idx 8) lands.
      const recordingLanded = t < T.act4 && act3PhraseIdx === 2 && (kinCache.get(act3El)?.last ?? -1) === 3 && cutOn("recording");
      // TWO MATCH CUTS for "Press Control x2" — back to back.
      const controlLanded1 = t < T.act4 && act3PhraseIdx === 4 && (kinCache.get(act3El)?.last ?? -1) === 1 && cutOn("control1");
      const controlLanded2 = t < T.act4 && act3PhraseIdx === 17 && (kinCache.get(act3El)?.last ?? -1) === 1 && cutOn("control2");
      // MATCH CUT — "doing." (idx 15) lands.
      const doingLanded = false;
      // TWO MATCH CUTS — "you copy" → "pasted", back to back.
      const copyLanded = false;
      const pastedLanded = false;
      // MATCH CUT — "Chat"+"+GPT." fuses (idx 20, "ChatGPT." reads as one
      // word) — the old copy-paste workflow dies right here.
      const chatgptLanded = false;
      // MATCH CUT — "5 seconds." (idx 25) lands — the payoff.
      const repliesLanded = false;
      // MATCH CUT — "As"+"+k." fuses (last phrase, idx 28) — same shimmer
      // treatment as the BrainoNotch fuse.
      const askLanded = t < T.act4 && act3PhraseIdx === 8 && (kinCache.get(act3El)?.last ?? -1) === 1 && cutOn("ask");
      act3El.classList.toggle("invert-flash", recordingLanded || controlLanded1 || controlLanded2 || doingLanded || copyLanded || pastedLanded || chatgptLanded || repliesLanded || askLanded);
      if (askLanded && !firedAskShimmer) {
        firedAskShimmer = true;
        const fuseEl = act3El.querySelector<HTMLElement>(".nt-fuse");
        if (fuseEl) { fuseEl.classList.remove("nt-shimmer-play"); void fuseEl.offsetWidth; fuseEl.classList.add("nt-shimmer-play"); }
      }
      if (!askLanded) firedAskShimmer = false;

      // subtle blue glow around the screen edges, macOS-style — a "Braino is
      // listening" indicator, now actually tied to him recording the meeting
      // instead of a random article. Fires right as "He's already
      // recording." lands, breathes through "Transcribing. Every word.",
      // gone before "Inbox a mess?" starts.
      {
        const glowStart = T.act3 + act3Starts[2] + ACT3_PHRASES[2].length * ACT3_SW;   // Maven: the warm listening glow while the pill listens
        const glowEnd = T.act3 + act3Starts[3];
        screenGlow.style.opacity = String(ramp(t, glowStart, glowStart + 220) * (1 - ramp(t, glowEnd - 200, glowEnd)));
        screenGlow.classList.toggle("it-listening", t >= glowStart && t < glowEnd);
      }

      act4El.style.opacity = String(ramp(t, T.act4, T.act4 + 100) * (1 - ramp(t, T.turn - 220, T.turn - 60)));
      sequence(act4El, ACT4_PHRASES, act4Starts, T.act4, ACT4_SW, t, "nt-word");
      // GROUP B — "Fresh answers." / "Real sources." / "Zero tab-hopping."
      // (idx 2-4) stomp in dead centre, same spot as everything else, one
      // after another, normal speed.
      // MATCH CUT — "Zero tab-hopping." (phrase idx 4) lands. (No vacuum/
      // sliver-tab graphic yet — plain invert cut, animated later.)
      const tabhopLanded = t < T.turn && seqIdx.get(act4El) === 1 && (kinCache.get(act4El)?.last ?? -1) === 0 && cutOn("tabhop");
      act4El.classList.toggle("invert-flash", tabhopLanded);

      sequence(turnEl, TURN_PHRASES, turnStarts, T.turn, TURN_SW, t, "nt-word");
      turnEl.style.opacity = String(ramp(t, T.turn, T.turn + 100) * (1 - ramp(t, T.deepBreaths - 220, T.deepBreaths - 60)));
      // MATCH CUT — "close it?" (last phrase, idx 2) lands, then straight
      // into "Deep Breaths." (No browser-window morph graphic yet — plain
      // invert cut, animated later once we have real art.)
      const closeLanded = t < T.deepBreaths && seqIdx.get(turnEl) === 2 && (kinCache.get(turnEl)?.last ?? -1) === TURN_PHRASES[2].length - 1 && cutOn("close");
      turnEl.classList.toggle("invert-flash", closeLanded);

      // "Deep Breaths." — a deliberate held beat before the notch boot
      // animation, NOT part of the speed ramp (see DEEPBREATHS_SW).
      deepBreathsEl.style.opacity = String(ramp(t, T.deepBreaths, T.deepBreaths + 120) * (1 - ramp(t, T.intro - 300, T.intro - 100)));
      kinetic(deepBreathsEl, T.deepBreaths, DEEPBREATHS_SW, t);

      itInvert.style.opacity = (perfectLanded || dontBlinkLanded || meetBrainoLanded || recordingLanded || controlLanded1 || controlLanded2 || doingLanded || copyLanded || pastedLanded || chatgptLanded || repliesLanded || askLanded || tabhopLanded || closeLanded) ? "1" : "0";

      // ── /notch's own film (Acts 7-12), unchanged from here down ──
      openLine.style.opacity = String(ramp(t, T.open, T.open + 120) * (1 - ramp(t, T.see - 250, T.see)));
      intro.style.opacity = String(ramp(t, T.intro, T.intro + 200) * (1 - ramp(t, T.boot - 250, T.boot)));
      screen.style.opacity = String(ramp(t, T.screen, T.screen + 110) * (1 - ramp(t, T.hype - 200, T.hype - 60)));
      const hypeOpenT = T.hype + HYPE_OPEN_DUR;
      hypeOpen.style.opacity = String(ramp(t, T.hype, T.hype + 100) * (1 - ramp(t, hypeOpenT - 220, hypeOpenT - 60)));
      {
        const toB = (t - T.hype) >= HYPE_OPEN_SWAP_AT;
        const smarterOn = !toB && t >= T.hype;
        hypeSwapA.style.visibility = smarterOn ? "visible" : "hidden";
        hypeSwapA.style.opacity = smarterOn ? "1" : "0";
        hypeSwapB.style.visibility = toB ? "visible" : "hidden";
        hypeSwapB.style.opacity = toB ? "1" : "0";
        kinetic(hypeSwapA, T.hype, GAP, t);
        kinetic(hypeSwapB, T.hype + HYPE_OPEN_SWAP_AT, GAP, t);
      }
      hype.style.opacity = String(ramp(t, hypeOpenT, hypeOpenT + 100) * (1 - ramp(t, T.ready - 220, T.ready - 60)));
      sequence(hype, HYPE_PHRASES, hypeStarts, hypeOpenT, HYPE_SW, t);
      // "Eyes open." (last HYPE phrase) — 2 frames of pure black and total
      // silence before the skills run. Reuses the same black-flash div as
      // "Don't Blink."'s beat drop; the two time windows never overlap.
      {
        const eyesOpenLandT = hypeOpenT + hypeStarts[5] + HYPE_PHRASES[5].length * HYPE_SW;
        const eyesOp = ramp(t, eyesOpenLandT, eyesOpenLandT + 20) * (1 - ramp(t, eyesOpenLandT + BLACKBEAT_HOLD - 20, eyesOpenLandT + BLACKBEAT_HOLD));
        if (eyesOp > 0) blackBeatEl.style.opacity = String(eyesOp);
      }
      ready.style.opacity = String(ramp(t, T.ready, T.ready + 90) * (1 - ramp(t, T.ready + READY_TOTAL - 200, T.ready + READY_TOTAL - 60)));
      sequence(ready, READY_PHRASES, readyStarts, T.ready, READY_SW, t);
      boom.style.opacity = String(ramp(t, T.boom, T.boom + 80) * (1 - ramp(t, T.tag - 200, T.tag - 60)));
      kineticStarts(boom, BOOM_STARTS, T.boom, t);
      tag.style.opacity = String(ramp(t, T.tag, T.tag + 120) * (1 - ramp(t, T.oneMore - 220, T.oneMore - 60)));
      oneMore.style.opacity = String(ramp(t, T.oneMore, T.oneMore + 100) * (1 - ramp(t, T.bigger - 250, T.bigger - 80)));
      sequence(oneMore, ONEMORE_PHRASES, oneMoreStarts, T.oneMore, 300, t);
      bigger.style.opacity = String(ramp(t, T.bigger, T.bigger + 120) * (1 - ramp(t, T.wink - 250, T.wink - 60)));
      sequence(bigger, BIGGER_PHRASES, biggerStarts, T.bigger, BIGGER_SW, t);
      // %2 must alternate per ORIGINAL WORD — with chunking on, a raw chunk
      // index would strobe twice as fast and read as a flicker.
      const biggerChunkIdx = kinCache.get(bigger)?.last ?? -1;
      const biggerPhraseIdx = seqIdx.get(bigger) ?? -1;
      const biggerWordIdx = biggerChunkIdx >= 0 && biggerPhraseIdx >= 0
        ? (BIGGER_CHUNKS[biggerPhraseIdx]?.chunkToWord[biggerChunkIdx] ?? -1) : -1;
      // "IOMI" gets a cut on every single letter, not just every-other —
      // this is the product reveal, it earns the extra cuts.
      const isIomiPhrase = BIGGER_CHUNKS[biggerPhraseIdx]?.words.join("") === "IOMI";
      const biggerInv = t < T.wink && biggerWordIdx >= 0 && (isIomiPhrase || biggerWordIdx % 2 === 0);
      bigger.classList.toggle("invert-flash", biggerInv);
      glitch.style.opacity = biggerInv ? "1" : "0";
      // once the last letter of "IOMI" lands, it jumps to the biggest text
      // in the film with a gradient fill + one-shot shimmer sweep — same
      // convention as the BrainoNotch/"As k." shimmers, just the climax size.
      const iomiAllLanded = t < T.wink && isIomiPhrase && biggerChunkIdx === (BIGGER_CHUNKS[biggerPhraseIdx]?.words.length ?? 0) - 1;
      bigger.classList.toggle("it-iomi-reveal", iomiAllLanded);
      if (iomiAllLanded && !firedIomiShimmer) {
        firedIomiShimmer = true;
        const spans = kinCache.get(bigger)?.spans ?? [];
        spans.forEach((sp) => {
          sp.classList.remove("it-iomi-shimmer"); void sp.offsetWidth; sp.classList.add("it-iomi-shimmer");
        });
      }
      if (!iomiAllLanded) firedIomiShimmer = false;
      sequence(openLine, OPEN_PHRASES, openStarts, T.open, OPEN_SW, t);
      // RHYME MATCH — "Braino" (word idx 2, still inside "This is Braino")
      // lands in the identical position/size as Act 2's "Braino." (same
      // host class as every other kinetic line). "Braino" itself is never
      // re-stamped and never moves from here on — same DOM span, same
      // screen position, all the way through the fuse below.
      const openBrainoLanded = t < T.see && seqIdx.get(openLine) === 0 && (kinCache.get(openLine)?.last ?? -1) === lastChunkOf(OPEN_CHUNKS[0], 0) && cutOn("thisIsBraino");
      // "+Notch" (word idx 3, same phrase) fuses onto "Braino" — that IS
      // the match cut — and in the SAME instant, "This"/"is" go invisible.
      // visibility:hidden, NOT display:none: they still occupy their space,
      // so the row's width (and therefore "Braino"'s centred position)
      // never changes — "Braino" doesn't shift/jump when they vanish.
      const brainoNotchLanded = t < T.see && seqIdx.get(openLine) === 0 && (kinCache.get(openLine)?.last ?? -1) === lastChunkOf(OPEN_CHUNKS[0], 1) && cutOn("brainoNotch");
      openLine.classList.toggle("invert-flash", openBrainoLanded || brainoNotchLanded);
      if (seqIdx.get(openLine) === 0) {
        // explicit both ways (not just on-landing) so scrubbing backward
        // past the fuse correctly brings "This"/"is" back into view.
        const c = kinCache.get(openLine);
        const hideThem = brainoNotchLanded ? "hidden" : "";
        // every chunk of "This" and "is" — with chunking on that is more
        // than the first two spans.
        for (const wi of [] as number[]) for (const ci of OPEN_CHUNKS[0].wordToChunks[wi]) {
          if (c?.spans[ci]) c.spans[ci].style.visibility = hideThem;
        }
      }
      if (brainoNotchLanded && !firedNotchShimmer) {
        firedNotchShimmer = true;
        // the "+Notch" span specifically — with chunking on this phrase holds
        // several .nt-fuse chunks, and querySelector would grab the first one.
        const fuseEl = kinCache.get(openLine)?.spans[lastChunkOf(OPEN_CHUNKS[0], 1)]
          ?? openLine.querySelector<HTMLElement>(".nt-fuse");
        if (fuseEl) { fuseEl.classList.remove("nt-shimmer-play"); void fuseEl.offsetWidth; fuseEl.classList.add("nt-shimmer-play"); }
      }
      if (!brainoNotchLanded) firedNotchShimmer = false;
      kinetic(intro, T.intro, P.open, t);
      const introIdx = t < T.intro ? -1 : Math.min(INTRO_WORDS.length - 1, Math.floor((t - T.intro) / P.open));
      const introInv = introIdx >= 0 && t < T.boot && introIdx % 2 === 1;
      // "chat ngl," / "even I was surprised." are two phrases now (the break
      // the user asked for) but the alternating match-cut flash needs to
      // read as ONE continuous rhythm across the split — offset phrase 2's
      // local word index by phrase 1's word count so the %2 pattern doesn't
      // reset at the break.
      const hypePhraseIdx = seqIdx.get(hype) ?? -1;
      const hypeLocalChunk = kinCache.get(hype)?.last ?? -1;
      // per ORIGINAL WORD (see the bigger strobe above); the +2 offset that
      // carries the rhythm across the "chat ngl," break is a WORD count too.
      const hypeLocalIdx = hypeLocalChunk >= 0 && hypePhraseIdx >= 0
        ? (HYPE_CHUNKS[hypePhraseIdx]?.chunkToWord[hypeLocalChunk] ?? -1) : -1;
      const hypeWordIdx = hypePhraseIdx === 1 ? hypeLocalIdx : hypePhraseIdx === 2 && hypeLocalIdx >= 0 ? hypeLocalIdx + 2 : -1;
      const hypeInv = t < T.ready && hypeWordIdx >= 0 && hypeWordIdx % 2 === 0;
      const readyInv = t < T.button && (kinCache.get(ready)?.last ?? -1) === lastChunkOf(READY_CHUNKS[1], 1);
      const boomInv = t < T.tag + 66 && (kinCache.get(boom)?.last ?? -1) === 1;
      intro.classList.toggle("invert-flash", introInv);
      hype.classList.toggle("invert-flash", hypeInv);
      ready.classList.toggle("invert-flash", readyInv);
      boom.classList.toggle("invert-flash", boomInv);

      invert2.style.opacity = (introInv || hypeInv || readyInv || boomInv || openBrainoLanded || brainoNotchLanded) ? "1" : "0";
      sequence(tag, TAG_PHRASES, tagStarts, T.tag, TAG_SW, t);
      scMain.style.opacity = String(ramp(t, T.screen, T.screen + 90) * (1 - ramp(t, T.screen + st.mainEnd - 220, T.screen + st.mainEnd - 60)));
      note1.style.opacity = String(ramp(t, T.screen + st.n1Start, T.screen + st.n1Start + 110) * (1 - ramp(t, T.screen + st.n1End, T.screen + st.n1End + 160)));
      sequence(scMain, SCREEN_MAIN_PHRASES, st.mainStarts, T.screen, P.screen, t);
      kinetic(note1, T.screen + st.n1Start, P.screen, t);

      const inBoot = t >= T.boot && t < T.open;
      const inSee = t >= T.see && t < T.screen;
      const inCut = t >= T.button && t < T.boom;
      const cutBt = inCut ? t - T.button : -1;
      const inCutSpeak = inCut && cutBt >= CUT_PRE_DUR && cutBt < CUT_SPEAK_END;
      const inWink = t >= T.wink;

      // /notch's own timeline had boot flow straight into "see" (adjacent
      // scenes, one continuous notch appearance). Here, open/intro now sit
      // BETWEEN boot and see, so the island fades out before "open" begins
      // (a pure text interlude, same as it was pre-boot) and gets its own
      // fresh fade-in at "see" — two separate windows, not one continuous
      // one. Without this split, the island (and its "hey shawty" caption)
      // stayed frozen on screen straight through "Braino./For your Mac." and
      // "LetsFuckingGo" — nothing was ever hiding or resetting it in that gap.
      let islandOp = 0;
      if (t >= T.boot && t < T.open) islandOp = ramp(t, T.boot, T.boot + 400) * (1 - ramp(t, T.open - 500, T.open - 200));
      else if (t >= T.see && t < T.screen) islandOp = ramp(t, T.see, T.see + 300) * (1 - ramp(t, T.screen - 500, T.screen - 200));
      else if (inCut) islandOp = ramp(t, T.button, T.button + 200) * (1 - ramp(t, T.boom - 250, T.boom - 80));
      else if (inWink) islandOp = ramp(t, T.wink + 100, T.wink + 350) * (t < T.wink + WINK_START + WINK_HOLD + OUTRO_LINE_DUR ? 1 : 0);
      notchWrap.style.opacity = String(islandOp);
      notchWrap.classList.toggle("seeing", inSee);
      notchWrap.classList.toggle("turbo", inCutSpeak);
      notchWrap.classList.toggle("eyes-only", inWink);
      notchWrap.classList.toggle("cut-front", inCut);

      if (t < T.boot) {
        const cls = "nf-face on home dozing";
        if (cls !== lastCls) {
          notch.className = cls; lastCls = cls; lastStatus = "";
          setNotchStatus(notch, "");
          if (capEl) capEl.textContent = "";
        }
      }

      if (inBoot) {
        const bt = t - T.boot;
        const sh = ramp(bt, 900, 3600);
        shimmer.style.opacity = String(ramp(bt, 900, 1150) * (1 - ramp(bt, 3400, 3900)));
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(ramp(t, T.boot, T.boot + 200) * sh * (1 - ramp(bt, 5600, 6100)) * 0.9);
        let cls = "nf-face on home dozing", status = "", cap = "";
        if (bt >= 6160) {
          cls = "nf-face on home awake captioning nf-wink";
          cap = GREET_CAP.slice(0, clamp(Math.floor((bt - 6160) / 55), 0, GREET_CAP.length));
        } else if (bt >= 5460) cls = "nf-face on home awake nf-auth-ok";
        else if (bt >= 4700) cls = "nf-face on home dozing nf-coral";
        else if (bt >= 3600) { cls = "nf-face on home dozing nf-auth"; status = "authenticating"; }
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; }
        if (status !== lastStatus) { setNotchStatus(notch, status); lastStatus = status; }
        if (capEl && capEl.textContent !== cap) capEl.textContent = cap;
      }

      if (inSee) {
        const cls = "nf-face on home awake";
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }

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
          baseCls = "nf-face on home awake nf-wink";
          lastMode = -1;
        }
        if (baseCls !== lastCls) { notch.className = baseCls; lastCls = baseCls; setNotchStatus(notch, ""); }
        if (capEl && capEl.textContent !== capText) capEl.textContent = capText;
      } else {
        if (lastMode !== -1) lastMode = -1;
      }

      if (inWink) {
        const rt = t - T.wink;
        const outroStart = WINK_START + WINK_HOLD;
        const outroEnd = outroStart + OUTRO_LINE_DUR;
        let sh: number;
        let shimmerOp: number;
        let bloomOp: number;
        if (rt < WINK_START) {
          sh = ramp(rt, 100, WINK_START);
          shimmerOp = ramp(rt, 100, 300);
          bloomOp = shimmerOp * 0.9;
        } else if (rt < outroStart) {
          sh = 1; shimmerOp = 1; bloomOp = 0.9;
        } else {
          const outroT = 1 - ramp(rt, outroStart, outroEnd);
          sh = outroT; shimmerOp = outroT; bloomOp = outroT * 0.9;
        }
        shimmer.style.opacity = String(shimmerOp);
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(bloomOp);
        const cls = rt >= WINK_START ? "nf-face on home awake nf-wink" : "nf-face on home awake";
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }

      // ── Maven: the notch never shows; the real Maven pill plays instead ──
      notchWrap.style.opacity = "0"; shimmer.style.opacity = "0"; bloom.style.opacity = "0";
      [act4El, turnEl, deepBreathsEl, intro, screen].forEach((el) => (el.style.opacity = "0"));
      pillCtx.setTransform(1, 0, 0, 1, 0, 0); pillCtx.globalAlpha = 1; pillCtx.clearRect(0, 0, 1920, 1080);
      let pill: [keyof typeof GRAPHICS, number] | null = null;
      for (const [act, i, g] of PILL_GAPS) {
        const [host, base, starts, phrases, sws] = act === 2 ? [act2El, T.act2, act2Starts, ACT2_PHRASES, ACT2_SW] as const : [act3El, T.act3, act3Starts, ACT3_PHRASES, ACT3_SWS] as const;
        const from = base + starts[i] + phrases[i].length * phraseSw(sws, i) + (g === "wake" ? WAKE_PRE : PILL_PAD), to = from + GRAPHICS[g].dur;
        // the gap is black: the line that just finished clears, the pill plays
        if (t >= base + starts[i] + phrases[i].length * phraseSw(sws, i) + 250 && t < to + PILL_PAD) host.style.opacity = "0";
        if (t >= from && t < to) pill = [g, t - from];
      }
      if (t >= T.boot && t < T.boot + GRAPHICS.send.dur) pill = ["send", t - T.boot];
      if (pill) { pillCtx.fillStyle = "#000"; pillCtx.fillRect(0, 0, 1920, 1080); GRAPHICS[pill[0]].draw(pillCtx, pill[1]); }
    };

    // ── playback loop + scrubber (same dev tooling as /notch) ──
    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    const setPlaying = (p: boolean) => {
      playing = p;
      setPlayingUi(p);
      if (playBtn) playBtn.textContent = p ? "❚❚" : "▶";
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = manualT / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => {
      manualT = clamp(ms, 0, T.end);
      audioAnchor = 0;
      if (trackLoaded && audioEl) audioEl.currentTime = manualT / 1000;
    };

    let lastUi = 0;
    let endedOnce = false;
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
        if (manualT >= T.end) {
          if (!endedOnce && new URLSearchParams(window.location.search).has("embed")) {
            endedOnce = true;
            window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin);
          }
          resetSceneCaches(); seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } else { startWall = performance.now(); }
        }
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
        setCurrentMs(manualT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const frame = q(".nt-frame");
    const onScrub = (e: Event) => { setPlaying(false); seek(+(e.target as HTMLInputElement).value); };
    const onPlay = () => { if (manualT >= T.end) { resetSceneCaches(); seek(0); } setPlaying(!playing); };
    const restart = () => { resetSceneCaches(); seek(0); setPlaying(true); };
    controlsApiRef.current = { seek: (ms: number) => { setPlaying(false); seek(ms); }, onPlay, restart };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); onPlay(); }
      else if (e.key === "ArrowRight") { setPlaying(false); seek(manualT + (e.shiftKey ? 1000 : 33)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); seek(manualT - (e.shiftKey ? 1000 : 33)); }
    };
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

    // jump straight to Group A (the app-name socials, Act 3) or Group B
    // (Fresh answers/Real sources/Zero tab-hopping, Act 4) — toggles which
    // one it jumps to next, so repeat clicks bounce back and forth for
    // quick review of the two fast-cadence sections.
    const groupJumpBtn = root.querySelector<HTMLButtonElement>(".nt-groupjump");
    let groupJumpToB = true;
    const onGroupJump = () => {
      setPlaying(false);
      const target = groupJumpToB ? T.act3 + act3Starts[1] : T.act4 + act4Starts[1];
      seek(target);
      groupJumpToB = !groupJumpToB;
      if (groupJumpBtn) groupJumpBtn.textContent = groupJumpToB ? "→B" : "→A";
    };
    groupJumpBtn?.addEventListener("click", onGroupJump);
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
        await new Promise((r) => setTimeout(r, 200));
        log('Pick "This Tab" in the share prompt to record with sound…');
        const dpr = window.devicePixelRatio || 1;
        const idealW = Math.round((window.screen.width || 1920) * dpr);
        const idealH = Math.round((window.screen.height || 1080) * dpr);
        stream = await md.getDisplayMedia({
          video: { frameRate: 30, aspectRatio: portrait ? 9 / 16 : 16 / 9, width: { ideal: idealW }, height: { ideal: idealH } },
          audio: true,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
        });
        if (!document.fullscreenElement) {
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
        const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 80_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
        rec.start(1000);
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
        link.href = url; link.download = `maven-launch-film.${ext}`;
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

    const orientBtns = Array.from(root.querySelectorAll<HTMLButtonElement>(".nt-orient-btn"));
    const orientHandlers = orientBtns.map((btn) => () => {
      frame.classList.toggle("portrait", btn.dataset.ar === "portrait");
      orientBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
    orientBtns.forEach((b, i) => b.addEventListener("click", orientHandlers[i]));

    const applyBeats = (a: BeatAnalysis) => {
      const target = Math.min(TARGET_MS, a.durationMs - 200);
      // Snap to the nearest beat/downbeat, but never drift more than 400ms
      // from the requested time — snapToBeat has no upper bound on distance,
      // and on a sparse downbeat grid (slow BPM, long bars) that could pull
      // a cut forward by a second or more, reading as a hang (e.g. right
      // after "Don't Blink."). Falls back to the raw time if nothing's close.
      const snap = (ms: number, down: boolean) => {
        const snapped = snapToBeat(ms, down ? a.downbeats : a.beats, Math.max(0, ms - 350));
        return Math.abs(snapped - ms) <= 400 ? snapped : ms;
      };
      let goal = target;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        recomputeStarts();
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;
      }
      const lastOk = target - WINK_TAIL;
      const winkFloor = T.screen;
      if (T.wink > lastOk) T.wink = Math.round(Math.max(winkFloor, lastOk));
      T.end = T.wink + WINK_TAIL;
      const hardEnd = Math.round(a.durationMs - 60);
      if (T.end > hardEnd) {
        T.wink = Math.max(T.screen + 100, hardEnd - WINK_TAIL);
        T.end = Math.min(hardEnd, T.wink + WINK_TAIL);
      }
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
      renderTimeline();
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
          localStorage.setItem("it-beatsync", JSON.stringify({ name: file.name, bpm: a.bpm, durationMs: a.durationMs, timeline: T }));
        } catch { /* storage blocked */ }
        log(`${file.name} · ${a.bpm} BPM · ${a.beats.length} beats · synced ✓`);
        seek(0); setPlaying(true);
      } catch (err) {
        log(`Couldn't analyze that file. ${(err as Error)?.message || ""}`);
      }
    };
    fileInput?.addEventListener("change", onFile);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/surkin.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        if (slider) slider.max = String(T.end);
        seek(0); manualT = 0;
        if (audioEl) {
          audioEl.src = "/surkin.mp3"; audioEl.load(); audioEl.currentTime = 0;
          try {
            await audioEl.play();
            playing = true; if (playBtn) playBtn.textContent = "❚❚";
            log(`Tiger Rhythm · ${a.bpm} BPM · synced ✓`);
          } catch {
            playing = false; if (playBtn) playBtn.textContent = "▶";
            log(`Tiger Rhythm · ${a.bpm} BPM · synced ✓ — press play ▶`);
          }
        }
      } catch (err) {
        if (!cancelled) log(`Couldn't auto-sync Tiger Rhythm (${(err as Error)?.message || "?"}). Upload a track to sync.`);
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
      document.body.classList.remove("nt-editmode");
      fontScaleInput?.removeEventListener("input", onFontScale);
      bgColorInput?.removeEventListener("input", onBgColor);
      editBtn?.removeEventListener("click", onEditToggle);
      groupJumpBtn?.removeEventListener("click", onGroupJump);
      timelineHost?.removeEventListener("click", onTimelineClick);
    };
  }, [runId]);

  const toggleGrids = () => {
    rootRef.current?.querySelector(".nt-frame")?.classList.toggle("grids");
  };
  const goFullscreen = () => {
    const frame = rootRef.current?.querySelector<HTMLElement>(".nt-frame");
    if (!frame) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.().catch(() => {});
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // Maven: restart in place. Re-running the effect re-fetched the track and the
  // play() came too late after the click, so the browser blocked it.
  const replay = () => controlsApiRef.current?.restart();

  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return (
    <div className={"nt-films" + (embed ? " it-embed" : "")}>
      <section className="nt" ref={rootRef}>
        <div className="nt-frame">
          <div className="nt-stage">
            {/* ── ACTS 1-5 (new) ── */}
            <div className="it-act1" />
            <div className="it-dontblink" />
            <div className="it-black" />
            <div className="it-act2" />
            <div className="it-act3" />
            <div className="it-act4" />
            <div className="it-turn" />
            <div className="it-deepbreaths">{DEEPBREATHS_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
            <div className="it-invert" />

            {/* ── /notch's own film (Acts 7-12), unchanged ── */}
            <div className="nt-open" />
            <div className="nt-intro">{INTRO_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}</div>
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
            <div className="nt-onemore" />
            <div className="nt-bigger" />
            <div className="nt-glitch" />

            {/* ONE island the whole way — boots, GREETS, thinks, winks */}
            <div className="nt-notch">
              <NotchFace className="on home dozing" />
              <svg className="nt-shimmer" viewBox="0 0 190 55" aria-hidden="true">
                <defs>
                  <linearGradient id="it-glow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFFFFF" /><stop offset=".45" stopColor="#CFE0FF" />
                    <stop offset=".8" stopColor="#7AA2FF" /><stop offset="1" stopColor="#F0A86B" />
                  </linearGradient>
                </defs>
                <path className="nt-p nt-p-glow" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#it-glow)" fill="none" />
                <path className="nt-p nt-p-core" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#it-glow)" fill="none" />
              </svg>
            </div>
            <div className="nt-bloom" />
            <div className="nt-invert2" />
          </div>
          <canvas className="mvt-pill" width={1920} height={1080} aria-hidden="true" />
          <div className="it-screenglow" />
          <div className="nt-framecounter">0.00s · f0</div>
        </div>
        <audio className="nt-audio" preload="auto" />

        <div className="nt-veil" aria-hidden="true" />
        <div className="nt-scrubber">
          <button className="nt-play" title="Play / Pause (space)">❚❚</button>
          <button className="nt-step-back" title="Back 1 frame (←)">◀|</button>
          <div className="nt-timeline-wrap">
            <input className="nt-scrub" type="range" min="0" max={String(DEFAULT_T.end)} defaultValue="0" step="1" />
            <div className="nt-timeline-marks" />
          </div>
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
          <button className="nt-groupjump" title="Jump to Group A (app-name socials) / Group B (Fresh answers/Real sources/Zero tab-hopping)">→B</button>
          <button className="nt-editbtn" title="Edit mode: toggle match cuts, resize text, change background">✎ Edit</button>
          <label className="nt-fontscale-wrap" title="Resize text">
            A<input className="nt-fontscale" type="range" min="0.6" max="1.8" step="0.05" defaultValue="1" />A
          </label>
          <input className="nt-bgcolor" type="color" defaultValue="#000000" title="Background colour" />
        </div>
        <div className="nt-log" />

        {/* public viewer chrome — additive, doesn't touch the film's own
            scene text/timing/render(t) above */}
        <ScriptPanel lines={SCRIPT_LINES} currentMs={currentMs} />
        <TeaserTransport
          durationMs={DEFAULT_T.end}
          currentMs={currentMs}
          playing={playingUi}
          onSeek={(ms) => controlsApiRef.current?.seek(ms)}
          onTogglePlay={() => controlsApiRef.current?.onPlay()}
          onRestart={replay}
        />
      </section>
    </div>
  );
}
