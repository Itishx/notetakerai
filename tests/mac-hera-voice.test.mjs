import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");

const lift = (src, start, endMarker = "\n}\n") => {
  const at = src.indexOf(start);
  assert.ok(at >= 0, `not found: ${start}`);
  return src.slice(at, src.indexOf(endMarker, at) + endMarker.length);
};

/* One live transcript, two endings: Option twice types it (main's dictation
   path, unchanged); talking to Braino shows it live and sends it as the
   command. These hold the second ending. */

const makeCommandText = (state) => Function("heraVoice", "logRenderer", "wait", `
  const HERA_SEGMENT_WAIT_MS = 60;
  ${lift(js, "async function heraCommandText(openaiText) {")}
  return heraCommandText;
`)(state, (event, data) => state.logs.push({ event, ...data }), (ms) => new Promise((r) => setTimeout(r, ms)));

const turn = (text, flags = {}) => ({ text, done: true, dirty: false, clipped: false, ...flags });

test("the command is HERA's words when HERA can be trusted", async () => {
  const state = { on: true, turnRotate: turn("open my notes from yesterday"), logs: [] };
  assert.equal(await makeCommandText(state)("Open my notes from yesterday."), "open my notes from yesterday");
  assert.equal(state.logs.at(-1).source, "hera");
  assert.equal(state.turnRotate, null, "a turn's words are used once");
});

test("OpenAI's words are used when HERA's cannot be", async () => {
  const cases = [
    [{ on: false }, "hera_off"],
    [{ on: true, turnRotate: null }, "no_turn_boundary"],
    [{ on: true, turnRotate: turn("open my notes", { dirty: true }) }, "braino_was_audible"],
    [{ on: true, turnRotate: turn("my notes", { clipped: true }) }, "started_with_barge_in"],
    [{ on: true, turnRotate: turn("open") }, "hera_missed_words"],
    [{ on: true, turnRotate: turn("") }, "hera_heard_nothing"],
    [{ on: true, turnRotate: { text: "", done: false } }, "hera_too_slow"],
  ];
  for (const [partial, why] of cases) {
    const state = { logs: [], ...partial };
    assert.equal(await makeCommandText(state)("Open my notes from yesterday."), "Open my notes from yesterday.", why);
    assert.equal(state.logs.at(-1).why, why);
  }
});

test("the live line does not say the end of a phrase twice", () => {
  const live = (settled, partial) => Function("heraVoice", `
    ${lift(js, "function heraVoiceLiveText() {")}
    return heraVoiceLiveText;
  `)({ settled, partial })();
  assert.equal(live("open my notes", "notes from yesterday"), "open my notes from yesterday");
  assert.equal(live("open my notes", ""), "open my notes");
  assert.equal(live("", "open my"), "open my");
  assert.equal(live("book a table", "for two tonight"), "book a table for two tonight");
});

test("HERA is rotated at every pause, after he speaks, and on a barge-in", () => {
  const stopped = js.slice(js.indexOf('if (event.type === "input_audio_buffer.speech_stopped")'));
  assert.match(stopped.slice(0, 600), /heraVoice\.turnRotate = heraVoiceRotate\("turn_end"\)/);
  assert.match(js, /heraVoiceRotate\("barge_in", \{ clipsNext: true \}\);\s*interruptVoiceTurn\("barge_in", "speech_started"\)/);
  // Only when he was actually audible: a silent reply leaves nothing to clear.
  assert.match(js, /logRenderer\("speech\.done"[^\n]*\n\s*if \(!quiet\) heraVoiceRotate\("braino_spoke", \{ echoTail: true \}\);/);
  /* His voice through the speakers marks the segment rather than showing up as yours. */
  assert.match(lift(js, "window.brainoMac.onVoiceCaption?.((event) => {", "\n});\n"), /if \(brainoAudible\(\) \|\| now < heraVoice\.ignoreUntil\) \{\s*heraVoice\.dirty = true;/);
});

test("OpenAI decides whether it was for him; HERA says what was said", () => {
  const flush = lift(js, "async function flushRealtimeTranscript(reason) {");
  assert.match(flush, /if \(accepted\) transcript = await heraCommandText\(transcript\);/);
  const acceptAt = flush.indexOf("shouldAcceptVoiceTranscript(transcript)");
  const swapAt = flush.indexOf("await heraCommandText(transcript)");
  assert.ok(acceptAt > 0 && acceptAt < swapAt);
  /* And the notch is painted by one source at a time. */
  assert.match(js, /if \(!heraVoice\.on\) nfSetHeard\(rtUserTranscript\.trim\(\)\);/);
});

test("in voice mode HERA only displays: nothing typed, pasted, or put on the clipboard", () => {
  const handler = lift(main, "function handleParakeetLine(line) {");
  const routeAt = handler.indexOf('if (voiceCaptionMode && ["segment", "partial", "utterance"].includes(event.type))');
  const deltaGuardAt = handler.indexOf('if (event.type === "delta" && (voiceCaptionMode || voiceCaptionStopping)) return;');
  const clipboardAt = handler.indexOf("clipboard.writeText");
  assert.ok(routeAt > 0 && deltaGuardAt > routeAt && clipboardAt > deltaGuardAt, "guards must run before the delta path");
  assert.match(handler, /if \(event\.type === "final" && voiceCaptionStopping\) \{\s*voiceCaptionStopping = false;\s*return;/);
  /* Dictation and LIVE take it over, and hand nothing across. */
  const start = lift(main, "async function startLocalDictation() {");
  assert.match(start, /yieldVoiceCaption\(liveTranscriptMode \? "live" : "dictation"\);/);
  assert.match(js, /if \(realtimeActive\) window\.setTimeout\(\(\) => void heraVoiceStart\("after_dictation"\), 1500\);/);
});

test("the caption says you're still speaking, and long speech gets room", () => {
  assert.match(js, /const spokenLabel = liveWords \? "You're saying" : "You said";/);
  assert.match(js, /inlineMode === "heard" && nfHeardLive \? "HERA" : "Live"/);
  assert.match(css, /#notch-face\.nf-inline-open\.nf-inline-long \.nf-pill,[\s\S]{0,120}width: var\(--nf-reading-surface-w\);/);
  assert.match(css, /#notch-face\.nf-inline-trimmed \.nf-inline-caption-text \{[\s\S]{0,120}mask-image: linear-gradient/);
  /* Trimmed at a word, with no dots. */
  assert.match(js, /const heardTrimmed = heardForInline\.length > NF_INLINE_MAX_CHARS;/);
});
