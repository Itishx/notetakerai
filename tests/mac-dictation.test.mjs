import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  assessDictationEdit,
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
  assert.match(edge, /You turn raw dictated speech into the exact text/);
  assert.match(edge, /Add a word that was not said/);
  // Both engines are judged by the same clean-up contract, so dictation does
  // not silently behave differently depending on which one served the session.
  assert.match(main, /assessDictationEdit\(raw, candidate\)/);
  assert.match(main, /braino-mac:dictation-refine/);
  assert.match(renderer, /scheduleDictationRefinement\(turn/);
  assert.match(renderer, /dictationInsert\(\{ chunks, prepared \}\)/);
  const insertion = main.slice(
    main.indexOf("async function insertDictationText"),
    main.indexOf("function parseAxClickIntent"),
  );
  assert.doesNotMatch(insertion, /await refineDictationText/);
  // The field lookup starts when dictation stops (prefetched) and is awaited here.
  assert.match(insertion, /const focus = \(prefetched && await prefetched\) \|\| await runAxHelper\(\["focused"\]\)/);
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

/* The clean-up half of BrainoHERA.

   BrainoFormat is instructed to drop fillers and resolve self-corrections, so
   it has to be judged by a gate that permits deletion. It used to be judged by
   assessDictationRefinement, which demands identical words in identical order,
   so every successful clean-up was rejected and the raw transcript pasted
   instead. These lock the delete-only contract in place. */
test("clean-up may delete fillers, stutters and corrected-away words", () => {
  assert.equal(
    assessDictationEdit(
      "lets meet at 5 actually 6 pm um can you tell the team thanks",
      "Let's meet at 6 PM. Can you tell the team? Thanks.",
    ).accepted,
    true,
  );
  assert.equal(
    assessDictationEdit(
      "so um i think we should uh ship the the notch fix on friday",
      "I think we should ship the notch fix on Friday.",
    ).accepted,
    true,
  );
  assert.equal(
    assessDictationEdit(
      "point one is the parser point two is the notch",
      "1. The parser\n2. The notch",
    ).accepted,
    true,
  );
});

/* A speech model mishears words that sound alike, and a formatter reading the
   whole sentence often has the context to fix them. A real microphone pass
   produced "tell the teen thanks", which is plainly "team"; refusing that
   correction threw away the whole clean-up over one letter. Rare and close is
   allowed. Frequent, or distant, is not. */
test("clean-up may correct a misheard word, within limits", () => {
  assert.equal(
    assessDictationEdit(
      "let's meet at 5 actually 6 pm can you tell the teen thanks",
      "Let's meet at 6 PM. Can you tell the team? Thanks.",
    ).accepted,
    true,
  );
  // Same stem, so an expansion reads as spelling rather than as a new word.
  assert.equal(
    assessDictationEdit("tell him the deploy is done", "Tell him the deployment is done.").accepted,
    true,
  );
  assert.equal(
    assessDictationEdit("i cant ship it today", "I cannot ship it today.").accepted,
    true,
  );
  // Rewriting most of the words is a rewrite, however close each one is.
  assert.equal(
    assessDictationEdit("the teen wont bild the parsr", "The team won't build the parser.").reason,
    "too_many_words_changed",
  );
});

test("clean-up may never invent, reorder, summarize, or drop a protected token", () => {
  // A reason the speaker never gave. Short sources trip the length guard
  // first; either way the invention never reaches the caret.
  assert.equal(
    assessDictationEdit("the deploy failed", "The deploy failed because the token expired.").accepted,
    false,
  );
  assert.equal(
    assessDictationEdit(
      "the deploy failed again this morning and i had to roll it back by hand",
      "The deploy failed again this morning because the token expired, and I had to roll it back by hand.",
    ).reason,
    "words_added_or_reordered",
  );
  // A different word is an invention even when it fits the sentence.
  assert.equal(
    assessDictationEdit("tell him the deploy is done", "Tell him the rollback is done.").accepted,
    false,
  );
  // Numbers are never "close" to other numbers: a wrong one is the mistake
  // nobody catches by rereading.
  assert.equal(
    assessDictationEdit("ship it on the 6th at 5 pm", "Ship it on the 8th at 5 PM.").accepted,
    false,
  );
  // Dictation, not summarization.
  assert.equal(
    assessDictationEdit(
      "we need to fix the parser and then ship it and then tell the team",
      "Ship it.",
    ).reason,
    "too_much_removed",
  );
  // Addresses, URLs, handles and code tokens have to survive verbatim.
  assert.equal(
    assessDictationEdit("send it to itish@example.com tomorrow", "Send it tomorrow.").reason,
    "protected_token_changed",
  );
});

test("the on-device path is gated by the clean-up contract, not the lossless one", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /const verdict = assessDictationEdit\(raw, formatted\)/);
});

/* The clean-up takes roughly 660ms for a sentence and 2.5s for sixty-five
   words, and stop has to feel immediate, so WHEN it runs decides whether it
   exists at all. Two earlier versions never landed once: one started it from
   the stop-time delta and read the result microseconds later, and one waited
   for Parakeet's end-of-utterance callback, which does not fire during
   continuous speech. The partial stream is the only signal that does. */
test("the clean-up is driven by pauses in the live transcript, not by stop", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const partial = main.slice(main.indexOf('if (event.type === "partial")'));
  assert.match(partial.slice(0, 600), /noteLiveTranscript\(text\)/);
  assert.match(main, /setTimeout\(\(\) => prefetchLocalFormat\(cumulative\), CLEANUP_PAUSE_MS\)/);
  // Stop resolves what is already there rather than starting from scratch.
  assert.match(main, /turn\.prepared = await resolveCleanup\(turn\.raw\)/);
  // Bounded, and scaled to how much there is to clean.
  assert.match(main, /const budgetMs = Math\.min\(CLEANUP_STOP_BUDGET_MS, cleanupDeadlineMs\(finalRaw\) \+ 1200\);/);
  assert.match(main, /return settleWithin\(job, Math\.max\(0, budgetMs - \(Date\.now\(\) - startedAt\)\)\);/);
});

/* Words spoken after the last pause are in no finished clean-up. Reusing a
   stale one without accounting for them would silently drop what the speaker
   said, and the gate cannot catch it: missing words look exactly like ordinary
   filler removal. */
test("a stale clean-up is only reused when what it lacks is a short tail", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const resolve = main.slice(
    main.indexOf("async function resolveCleanup"),
    main.indexOf("function recordLocalTurn"),
  );
  assert.match(resolve, /finalRaw\.startsWith\(ready\.source\)/);
  assert.match(resolve, /countWords\(tail\) <= CLEANUP_MAX_APPENDED_TAIL_WORDS/);
  // And the assembled result is still put to the gate.
  assert.match(resolve, /assessDictationEdit\(finalRaw, composed\)/);
});

/* A contraction is a faithful rewrite of two words. Treating it as a new word
   refused an otherwise perfect sixty-five word clean-up over "it is not"
   becoming "it isn't". */
test("contractions are the same words to the gate", () => {
  assert.equal(assessDictationEdit("if it is not ready we wait", "If it isn't ready, we wait.").accepted, true);
  assert.equal(assessDictationEdit("we are aiming for friday", "We're aiming for Friday.").accepted, true);
  assert.equal(assessDictationEdit("i can not do it", "I cannot do it.").accepted, true);
  assert.equal(assessDictationEdit("we will not ship today", "We won't ship today.").accepted, true);
  // Expanding a contraction is not a licence to change what it says.
  assert.equal(assessDictationEdit("we are aiming for friday", "We aren't aiming for Friday.").accepted, false);
});

/* The microphone has to survive the input device changing underneath it.

   AVAudioEngine binds its input node at start and never re-binds: a Bluetooth
   headset connecting left the tap delivering nothing while the engine still
   reported itself as running. A real session logged fourteen seconds of
   "listening" with zero audio. Both recovery paths have to stay in the source. */
test("dictation capture recovers from an input device change", () => {
  const dictate = readFileSync(
    new URL("../mac/braino-mac/native/BrainoDictate/Sources/BrainoDictate/main.swift", import.meta.url),
    "utf8",
  );
  assert.match(dictate, /AVAudioEngineConfigurationChange/);
  assert.match(dictate, /func healIfDeaf/);
  // A session must never open on a tap that has already gone quiet.
  assert.match(dictate, /mic\.healIfDeaf\(reason: "session start"/);
});

/* A clean-up of an earlier transcript was still running at stop, the final one
   was queued behind it, and stop returned nothing at once: the raw words were
   pasted (preparedTurns 0). */
test("stop waits for a running clean-up, then uses the final one", async () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const lift = (start, end = "\n}\n") => {
    const at = main.indexOf(start);
    assert.ok(at >= 0, start);
    return main.slice(at, main.indexOf(end, at) + end.length);
  };
  const make = Function("formatDictationTurn", `
    const CLEANUP_MIN_WORDS = 3, CLEANUP_MAX_APPENDED_TAIL_WORDS = 6, CLEANUP_STOP_BUDGET_MS = 3000;
    const liveTranscriptMode = false;
    const heraLog = () => {};
    const textForLog = (t) => t;
    const assessDictationEdit = () => ({ accepted: true, reason: "cleaned" });
    const stripFormatterChatter = (text) => text;
    let localFormat = { results: new Map(), inflight: "", queued: "", latest: null, live: "" };
    ${lift("function cleanupDeadlineMs(text) {")}
    ${lift("function countWords(text) {")}
    ${lift("function prefetchLocalFormat(text) {")}
    ${lift("function runLocalFormat(raw) {")}
    ${lift("async function resolveCleanup(finalRaw) {")}
    ${lift("function settleWithin(promise, ms) {")}
    return { prefetchLocalFormat, resolveCleanup };
  `);
  const api = make((text) => new Promise((done) => setTimeout(() => done(text.toUpperCase()), 150)));
  api.prefetchLocalFormat("so this is braino hera to see");
  const cleaned = await api.resolveCleanup("so this is braino hera to see if it works and if the words are pasted");
  assert.equal(cleaned, "SO THIS IS BRAINO HERA TO SEE IF IT WORKS AND IF THE WORDS ARE PASTED");
});

/* Cursor's side panels report no focused field while the caret is in one. */
test("a text box Accessibility cannot see still gets a paste, and the words are kept", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /const DICTATION_BLIND_PASTE_APPS = \/\^\(\?:cursor\|code\|visual studio code\|windsurf\|google chrome/);
  assert.doesNotMatch(main.match(/const DICTATION_BLIND_PASTE_APPS = .*$/m)[0], /electron/i, "never Braino's own dev window");
  const insert = main.slice(main.indexOf("async function insertDictationText"));
  assert.match(insert.slice(0, 3000), /if \(focus\.status === "no_focus" && DICTATION_BLIND_PASTE_APPS\.test\(front\)\) \{\s*const pasted = await pasteDictationFallback\(text, front\);/);
  assert.match(insert.slice(0, 3000), /return \{ \.\.\.keepDictationFallback\(text, focus\.status\), blindPaste \};/);
  /* And the log no longer calls the notch fallback a paste. */
  assert.match(main, /inserted\?\.fallback\s*\? \(inserted\.blindPaste \? "pasted without confirmation, also in the notch and on the clipboard" : "no text box found/);
});

/* "Sure! Here's the cleaned text: ..." and "we can maybe go" -> "maybe we can
   go" refused clean-ups that were otherwise exactly right. */
test("a chatty preamble is removed and harmless words may move", async () => {
  const { stripFormatterChatter } = await import("../mac/braino-mac/dictation.cjs");
  const spoken = "okay so i think we can go home tomorrow and then you know we can maybe go for dinner tonight at 7 p m at uh be our own booze restaurant in jubilee hills in hyderabad";
  const chatty = "Sure! Here's the cleaned text: I think we can go home tomorrow. Then we can maybe go for dinner tonight at 7 PM at our own booze restaurant in Jubilee Hills, Hyderabad.";
  assert.equal(assessDictationEdit(spoken, chatty).accepted, false, "the gate itself still refuses invented words");
  assert.equal(assessDictationEdit(spoken, stripFormatterChatter(chatty)).accepted, true);
  const moved = assessDictationEdit(spoken, "I think we can go home tomorrow, and then maybe we can go for dinner tonight at 7 PM at our own booze restaurant in Jubilee Hills, Hyderabad.");
  assert.equal(moved.accepted, true);
  assert.equal(moved.moved, 1);
  assert.equal(stripFormatterChatter('Sure, here is your cleaned-up transcript: "Hello there." Let me know if you need anything else.'), "Hello there.");
  assert.equal(stripFormatterChatter("Here is my plan: go home."), "Here is my plan: go home.");
  // Moves that change the meaning stay refused.
  assert.equal(assessDictationEdit("the dog bit the man", "The man bit the dog.").accepted, false);
  assert.equal(assessDictationEdit("i do not think we can go", "I think we cannot go.").accepted, false);
  assert.equal(assessDictationEdit("we meet at 5 and leave at 6", "We meet at 6 and leave at 5.").accepted, false);
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /formatDictationTurn\(raw\)\s*\.then\(\(offered\) => stripFormatterChatter\(offered\)\)/);
});
