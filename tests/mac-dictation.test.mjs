import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  assessDictationRefinement,
  assessDictationInsertion,
  buildDictationTranscriptionConfig,
  buildDictationTurnDetection,
  evaluateDictationStart,
  normalizeDictationChunk,
  normalizeDictationSession,
  parseDictationControl,
  shouldUseDictationPasteFallback,
} = require("../mac/braino-mac/dictation.cjs");

test("accepts formatting-only cleanup and unambiguous time notation", () => {
  assert.equal(
    assessDictationRefinement(
      "so am i going there or am i not going there",
      "So, am I going there, or am I not going there?",
    ).accepted,
    true,
  );
  assert.equal(
    assessDictationRefinement("let's go at five p m", "Let's go at 5 p.m.").accepted,
    true,
  );
  assert.equal(
    assessDictationRefinement("let's go at six o'clock", "Let's go at 6:00.").accepted,
    true,
  );
  assert.equal(
    assessDictationRefinement("it is twenty percent", "It is 20%.").accepted,
    true,
  );
  assert.equal(
    assessDictationRefinement("it costs twenty dollars", "It costs $20.").accepted,
    true,
  );
});

test("rejects summaries, deleted words, reordered clauses, and changed protected tokens", () => {
  assert.equal(
    assessDictationRefinement(
      "so am i going there or am i not going there",
      "Going there. So am I going there or am I not?",
    ).accepted,
    false,
  );
  assert.equal(
    assessDictationRefinement("I want to sleep but I can't", "I cannot sleep.").accepted,
    false,
  );
  assert.deepEqual(
    assessDictationRefinement("Email me at itish@example.com", "Email me at ish@example.com").reason,
    "protected_token_changed",
  );
});

test("prefetches the narrow formatter while speaking and never blocks insertion on it", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  const edge = readFileSync(
    new URL("../supabase/functions/voice/dictation-refine/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(edge, /lossless speech-dictation formatter/);
  assert.match(edge, /Never summarize, answer, shorten, embellish/);
  assert.match(main, /assessDictationRefinement\(raw, candidate\)/);
  assert.match(main, /braino-mac:dictation-refine/);
  assert.match(renderer, /scheduleDictationRefinement\(turn/);
  assert.match(renderer, /dictationInsert\(\{ chunks, prepared \}\)/);
  const insertion = main.slice(
    main.indexOf("async function insertDictationText"),
    main.indexOf("function parseAxClickIntent"),
  );
  assert.doesNotMatch(insertion, /await refineDictationText/);
  assert.match(insertion, /const focus = await runAxHelper/);
  assert.match(main, /error\?\.name === "AbortError" \? "timeout"/);
  assert.match(main, /warmDictationRefinement\(\);/);
  assert.match(main, /timeoutMs: 10000, warmup: true/);
});

test("recognizes BrainoHERA start commands and former Yap Mode aliases", () => {
  for (const phrase of [
    "Braino, start dictation mode.",
    "Breno start dictation",
    "Braino, start BrainoHERA",
    "Start Braino Hera",
    "Start Hera mode",
    "BrainoHERA",
    "Start Yap Mode",
    "Yap Mode",
    "Speak your mind",
    "Take this down",
    "Write what I say",
    "Start typing",
  ]) {
    assert.deepEqual(parseDictationControl(phrase, false), { action: "start" }, phrase);
  }
});

test("never consumes dictated words as an in-session command", () => {
  for (const phrase of ["Done.", "stop dictation", "turn off Yap Mode", "I'm done"]) {
    assert.equal(parseDictationControl(phrase, true), null, phrase);
  }
});

test("normalizes standalone layout commands and leaves room for the next turn", () => {
  assert.equal(normalizeDictationChunk("new line"), "\n");
  assert.equal(normalizeDictationChunk("New paragraph."), "\n\n");
  assert.equal(normalizeDictationChunk("This is the sentence."), "This is the sentence. ");
});

test("assembles the complete ordered session for one final insertion", () => {
  assert.equal(
    normalizeDictationSession(["First thought.", "new paragraph", "Second thought."]),
    "First thought. \n\nSecond thought. ",
  );
});

test("verifies a real field mutation instead of trusting a paste command", () => {
  const before = {
    appName: "Cursor",
    role: "AXTextArea",
    valueReadable: true,
    valueLength: 10,
    valueHash: "before",
    selectionLocation: 10,
    selectionLength: 0,
  };
  assert.deepEqual(
    assessDictationInsertion(before, {
      ...before,
      valueLength: 15,
      valueHash: "after",
      selectionLocation: 15,
    }, "hello"),
    { verified: true, reason: "field_changed" },
  );
  assert.deepEqual(
    assessDictationInsertion(before, before, "hello"),
    { verified: false, reason: "field_unchanged" },
  );
});

test("pastes only into verified editable fields and keeps other transcripts recoverable", () => {
  assert.deepEqual(evaluateDictationStart("editable", true), {
    ok: true,
    insertionMode: "paste",
    hasEditableTarget: true,
  });
  assert.deepEqual(evaluateDictationStart("no_focus", true), {
    ok: true,
    insertionMode: "notch",
    hasEditableTarget: false,
  });
  assert.deepEqual(evaluateDictationStart("not_editable", true), {
    ok: true,
    insertionMode: "notch",
    hasEditableTarget: false,
  });
  assert.equal(shouldUseDictationPasteFallback("no_focus"), true);
  assert.equal(shouldUseDictationPasteFallback("not_editable"), true);
  assert.equal(shouldUseDictationPasteFallback("insert_failed"), true);
});

test("still blocks secure targets and missing Accessibility permission", () => {
  assert.equal(evaluateDictationStart("secure", true).ok, false);
  assert.equal(evaluateDictationStart("needs-accessibility", true).ok, false);
  assert.equal(evaluateDictationStart("editable", false).ok, false);
  assert.equal(shouldUseDictationPasteFallback("secure"), false);
  assert.equal(shouldUseDictationPasteFallback("needs-accessibility"), false);
});

test("builds accuracy-first live transcription with faithful context", () => {
  const config = buildDictationTranscriptionConfig({ keywords: ["Itish", "Braino"] });
  assert.equal(config.model, "gpt-live-transcribe");
  assert.equal(config.delay, "low");
  assert.deepEqual(config.languages, ["en", "hi"]);
  assert.match(config.prompt, /Transcribe every clearly spoken word faithfully/);
  assert.match(config.prompt, /Keep openings, filler words, repetitions, false starts/);
  assert.match(config.prompt, /Do not summarize, answer, add ideas, or silently rewrite/);
  assert.deepEqual(config.keywords, [
    "Braino",
    "BrainoHERA",
    "Braino Hera",
    "IOMI",
    "Yap Mode",
    "Notch",
    "Itish",
    "Itish Pande",
  ]);
});

test("omits unsupported context when explicitly using GA realtime whisper", () => {
  const config = buildDictationTranscriptionConfig({
    model: "gpt-realtime-whisper",
    keywords: ["Itish"],
  });
  assert.equal(config.prompt, undefined);
  assert.equal(config.keywords, undefined);
});

test("disables unsupported server turn detection for live transcription", () => {
  assert.equal(buildDictationTurnDetection(), null);

  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  const edgeFunction = readFileSync(
    new URL("../supabase/functions/realtime/openai-realtime-call/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    renderer,
    /model:\s*DICTATION_TRANSCRIPTION_MODEL,[\s\S]{0,1200}?turn_detection:\s*null/,
  );
  assert.match(
    edgeFunction,
    /model:\s*DICTATION_TRANSCRIPTION_MODEL,[\s\S]{0,1200}?turn_detection:\s*null/,
  );
});

test("buffers turns and performs one insertion only after stop drain", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(renderer, /enqueueDictationTranscript/);
  assert.match(
    renderer,
    /const drain = await waitForDictationDrain\([\s\S]{0,120}?\);[\s\S]{0,800}?await flushBufferedDictationTranscript\(\)/,
  );
  assert.match(renderer, /dictation\.stop\.acknowledged/);
  assert.match(renderer, /function dictationDrainTimeoutMs\(committedAudioMs = 0\)/);
  assert.match(renderer, /waitForDictationDrain\(dictationDrainTimeoutMs\(lastCommittedAudioMs\)\)/);
  assert.match(renderer, /settlePendingDictationDeltas\("stop_deadline"\)/);
  assert.match(renderer, /dictationStartGeneration \+= 1;[\s\S]{0,180}?stopRealtimeVoice\(\{ keepDictation: true \}\)/);
});

test("starts protected microphone capture before the blocking focus preflight", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  const yapStart = renderer.slice(
    renderer.indexOf("async function startYapMode"),
    renderer.indexOf("async function stopYapMode"),
  );
  assert.ok(
    yapStart.indexOf("const realtimeStart = startRealtimeVoice")
      < yapStart.indexOf("await window.brainoMac.dictationControl"),
    "microphone/WebRTC startup must begin before Accessibility focus probing",
  );
  assert.match(yapStart, /startupGate/);
  assert.match(
    renderer,
    /const startupDecision = await dictationStartupGate;[\s\S]{0,900}?sendRealtimeEvent\(buildRealtimeSessionUpdate\(\)\)/,
  );
  assert.match(renderer, /await dictationStartupGate;[\s\S]{0,500}?startupDecision\?\.ok === false/);
});

test("captures clean mono dictation audio and leaves denoising to the transcription session", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /channelCount:\s*\{ ideal: 1 \}/);
  assert.match(renderer, /echoCancellation:\s*false/);
  assert.match(renderer, /noiseSuppression:\s*false/);
  assert.match(renderer, /autoGainControl:\s*false/);
});

test("keeps startup and live dictation PCM on one ordered transport", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /function flushDictationPrerollAndStartStreaming/);
  assert.match(renderer, /transport:\s*"ordered_pcm_datachannel"/);
  assert.doesNotMatch(renderer, /dictationSender\.replaceTrack\(stream\.getAudioTracks/);
  assert.match(
    renderer,
    /capture\.processor\.onaudioprocess = \(event\) => \{[\s\S]{0,700}?appendEncodedDictationAudio/,
  );
});

test("preserves a short phrase when stop lands before realtime is ready", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /function freezeDictationPreroll/);
  assert.match(renderer, /dictation\.stop\.queued/);
  assert.match(
    renderer,
    /const queuedStopSource = dictationStopRequestedSource;[\s\S]{0,300}?await stopYapMode/,
  );
  assert.doesNotMatch(
    renderer,
    /dictationStarting && !realtimeActive\) \{[\s\S]{0,300}?dictationStartGeneration \+= 1/,
  );
});

test("never commits an empty or speechless dictation buffer", () => {
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /bufferedAudioMs < 100/);
  assert.match(renderer, /cause:\s*"buffer_too_small"/);
  assert.match(renderer, /cause:\s*"trailing_silence"/);
  assert.match(renderer, /dictationManualCommitPending[\s\S]{0,500}?waitForDictationCommitAck/);
});

test("brands the Mac transcript sheet as BrainoHERA with the website green shimmer", () => {
  const html = readFileSync(
    new URL("../mac/braino-mac/renderer/index.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url),
    "utf8",
  );
  assert.match(html, /aria-label="BrainoHERA live transcript"/);
  assert.match(html, /Braino<span class="nf-hera-shimmer">HERA<\/span>/);
  assert.match(
    css,
    /linear-gradient\(100deg, #17693e 0%, #4ac784 23%, #d8ffe9 43%, #4ac784 63%, #17693e 100%\)/,
  );
  assert.match(css, /animation: nfHeraNameShimmer 3\.4s linear infinite/);
  assert.match(css, /\.nf-hera-shimmer \{ animation: none; \}/);
});
