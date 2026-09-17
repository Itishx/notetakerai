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

const makeCommandText = (state) => Function("heraVoice", "logRenderer", `
  ${lift(js, "async function heraCommandText(openaiText) {")}
  return heraCommandText;
`)(state, (event, data) => state.logs.push({ event, ...data }));

/* The command is OpenAI's words. HERA's were tried and lost on the evidence:
   his own voice in them after most replies, his name misheard, and up to 600ms
   of waiting on every turn. HERA stays as what you see while you talk. */
test("the command is OpenAI's words, with nothing to wait for", async () => {
  const state = { on: true, earlyText: "", logs: [] };
  assert.equal(await makeCommandText(state)("Open my notes from yesterday."), "Open my notes from yesterday.");
  assert.equal(state.logs.at(-1).source, "openai");
  assert.doesNotMatch(lift(js, "async function heraCommandText(openaiText) {"), /await wait|setTimeout/);
});

/* Except what you said while the session was still connecting: OpenAI never
   heard it, HERA did, and he had not spoken yet so there was no echo. */
test("words said while connecting come from HERA", async () => {
  const state = { on: true, earlyText: "book a table for two at eight", logs: [] };
  assert.equal(await makeCommandText(state)("at eight"), "book a table for two at eight");
  assert.equal(state.logs.at(-1).source, "hera_early");
  assert.equal(state.earlyText, "", "used once");
  const shorter = { on: true, earlyText: "book", logs: [] };
  assert.equal(await makeCommandText(shorter)("book a table for two"), "book a table for two");
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
  assert.match(stopped.slice(0, 900), /heraVoiceRotate\("turn_end"\)/);
  /* A line begun while connecting is taken whole at the first pause. */
  assert.match(stopped.slice(0, 900), /if \(heraVoice\.early\) \{\s*heraVoice\.earlyText = heraVoiceLiveText\(\);/);
  assert.match(js, /heraVoiceRotate\("barge_in", \{ clipsNext: true \}\);\s*interruptVoiceTurn\("barge_in", "speech_started"\)/);
  assert.match(js, /if \(!quiet\) heraVoiceRotate\("braino_spoke", \{ echoTail: true \}\);/);
  assert.match(lift(js, "window.brainoMac.onVoiceCaption?.((event) => {", "\n});\n"), /if \(brainoAudible\(\) \|\| now < heraVoice\.ignoreUntil\) \{\s*heraVoice\.dirty = true;/);
});

/* You can talk the moment you press: HERA is on the Mac and ready, the
   session takes seconds. */
test("HERA starts at the press, and a sentence finished before ready is sent at ready", () => {
  assert.match(lift(js, "function voiceStartBegin() {"), /void heraVoiceStart\("press"\);/);
  assert.match(lift(js, "async function heraVoiceStart(reason) {"), /heraVoice\.early = !realtimeActive;/);
  const ready = lift(js, "function heraVoiceAtReady() {");
  assert.match(ready, /rtUserTranscript = text;[\s\S]*void flushRealtimeTranscript\("early_hera"\);/);
  assert.match(ready, /if \(heraVoice\.sawOpenAiSpeech\) return;/);
});

test("OpenAI decides whether it was for him; HERA says what was said", () => {
  const flush = lift(js, "async function flushRealtimeTranscript(reason, textOverride) {");
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

/* Switched off after it showed a video's audio as the user's words. Voice
   mode shows OpenAI's transcript only; dictation and LIVE keep HERA. */
test("HERA is off in voice mode", () => {
  assert.match(js, /const HERA_LIVE_IN_VOICE = false;/);
  assert.match(lift(js, "async function heraVoiceStart(reason) {"), /^async function heraVoiceStart\(reason\) \{\s*if \(!HERA_LIVE_IN_VOICE\) return;/);
  /* With it off, OpenAI's words paint the notch, as before. */
  assert.match(js, /if \(!heraVoice\.on\) nfSetHeard\(rtUserTranscript\.trim\(\)\);/);
  /* And the waiting line says what is true. */
  assert.match(lift(js, "function voiceStartText(phase) {"), /return heraVoice\.on \? "Go ahead, I'm listening" : "Connecting";/);
});
