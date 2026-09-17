import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* No name, no action — the way Siri and Alexa work. A conversation window let
   a video's audio through as a command. */
const make = (state, now) => Function("Date", "s", `
  let { namedModeOn, speaking, processing, voiceTurnInFlight, namedGraceUntil, namedSpeechAwake, lastSpokenLine } = s;
  const NAMED_ANSWER_WINDOW_MS = 10000;
  ${lift("function namedWindowOpen() {")}
  ${lift("function namedAnswerWindowOpen() {")}
  ${liftLine("const ANSWER_REPLY =")}
  ${lift("function answersHisQuestion(text) {")}
  return { namedWindowOpen, answersHisQuestion };
`)({ now: () => now }, { namedModeOn: true, speaking: false, processing: false, voiceTurnInFlight: false,
  namedGraceUntil: 0, namedSpeechAwake: false, lastSpokenLine: { endedTs: 0, asked: false }, ...state });

test("his name every time, with plain exceptions", () => {
  const now = 1_000_000;
  const open = (state) => make(state, now).namedWindowOpen();
  assert.equal(open({}), false, "asleep by default: a name is needed");
  assert.equal(open({ namedModeOn: false }), true, "named mode off: everything is for him");
  assert.equal(open({ speaking: true }), true, "cutting in while he talks");
  assert.equal(open({ voiceTurnInFlight: true }), true, "while he works");
  assert.equal(open({ namedGraceUntil: now + 5000 }), true, "first sentence after a wake");
  assert.equal(open({ namedSpeechAwake: true }), true, "a sentence begun while open");
  /* A question he asked opens nothing by itself: only a short answer counts. */
  assert.equal(open({ lastSpokenLine: { endedTs: now - 4000, asked: true } }), false);
  assert.doesNotMatch(lift("function namedWindowOpen() {"), /NAMED_WINDOW_MS/);
});

/* "What's on your mind?" and then the TV said "Open the language." */
test("after his question, only a short reply needs no name", () => {
  const now = 1_000_000;
  const asked = make({ lastSpokenLine: { endedTs: now - 4000, asked: true } }, now).answersHisQuestion;
  for (const said of ["Yes.", "yeah go ahead", "No thanks", "The second one", "cancel", "Okay", "number 2"]) {
    assert.equal(asked(said), true, said);
  }
  for (const said of ["Open the language.", "Hold the line", "I think he is saying something to the audience.",
    "yes but first open my email and then send it to everyone on the team"]) {
    assert.equal(asked(said), false, said);
  }
  assert.equal(make({ lastSpokenLine: { endedTs: now - 11000, asked: true } }, now).answersHisQuestion("yes"), false, "too late");
  assert.equal(make({ lastSpokenLine: { endedTs: now - 1000, asked: false } }, now).answersHisQuestion("yes"), false, "he asked nothing");
  const accept = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(accept, /\} else if \(!namedWindowOpen\(\) && !answersHisQuestion\(text\)\) \{/);
});

/* The transcriber writes words for noise. Real sentences from the log on the
   left, what the room made up on the right, with how long each took. */
test("noise that came back as words is not a command", () => {
  const looksLikeNoise = Function(`
    ${liftLine("const NOISE_PROMPT_ECHO =")}
    ${liftLine("const NOISE_CLASSIC =")}
    ${liftLine("const NOISE_MIN_SPEECH_MS =")}
    ${liftLine("const NOISE_MIN_WORDS_PER_SEC =")}
    ${lift("function looksLikeNoise(text, speechMs = 0) {")}
    return looksLikeNoise;
  `)();
  assert.equal(looksLikeNoise("Hold the line", 9157), true);
  assert.equal(looksLikeNoise("Open the language.", 3880), true);
  assert.equal(looksLikeNoise("Use English as the language.", 1200), true);
  assert.equal(looksLikeNoise("Hey Braino", 4331), true);
  assert.equal(looksLikeNoise("Thank you.", 800), true);
  assert.equal(looksLikeNoise("you", 1306), true);
  assert.equal(looksLikeNoise("Braino stop the task", 2585), false);
  assert.equal(looksLikeNoise("Hey Braino", 1473), false);
  assert.equal(looksLikeNoise("Yes.", 900), false);
  assert.equal(looksLikeNoise("can you please open youtube", 3000), false);
  assert.equal(looksLikeNoise("Braino, can you please start an instant Google Meet and then send that link to myself on WhatsApp.", 7000), false);
  /* Judged only where no name carried the sentence, and a bare name made of
     noise wakes nothing. */
  const accept = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(accept, /if \(named && isBareWakeWord\(text\) && looksLikeNoise\(text, rtLastSpeechMs\)\) \{/);
  assert.match(accept, /\} else if \(looksLikeNoise\(text, rtLastSpeechMs\)\) \{\s*\/\*[\s\S]*?\*\/\s*logRenderer\("named\.noise_ignored"/);
  /* The turn length comes from OpenAI's audio clock. */
  assert.match(js, /rtSpeechAudioStartMs = Number\.isFinite\(event\.audio_start_ms\) \? event\.audio_start_ms : null;/);
  assert.match(js, /event\.audio_end_ms - rtSpeechAudioStartMs/);
});

test("his last line remembers whether it was a question", () => {
  assert.match(lift("function noteSpoken(text) {"), /asked: \/\\\?\["'\)\\\]\]\*\\s\*\$\/\.test\(String\(text \|\| ""\)\.trim\(\)\)/);
});

test("the on-device listener's ear rescues a misspelt name", () => {
  assert.match(js, /if \(realtimeActive\) namedHeardOnDeviceAt = Date\.now\(\);/);
  const accept = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(accept, /if \(named \|\| heardOnDevice\) \{/);
  /* "Hey Braino" on its own leaves the match for the sentence after it. */
  assert.match(accept, /if \(!isBareWakeWord\(text\)\) namedHeardOnDeviceAt = 0;/);
});

test("the notch says he is listening for his name, not that he is off", () => {
  assert.match(js, /\? `Listening for \\u201c\$\{activeWakeName\(\)\}\\u201d`/);
});

/* ── Half sentences ───────────────────────────────────────────────────────── */

const looksUnfinished = Function(`
  ${lift("const FRAGMENT_TAIL_WORDS = new Set([", "\n]);\n")}
  ${lift("function looksUnfinished(text) {")}
  return looksUnfinished;
`)();

test("a half sentence is recognised by how it ends", () => {
  for (const said of ["I need", "Regarding the", "Can you please close all", "Braino, open the", "Hey Braino, send it to", "play music"]) {
    assert.equal(looksUnfinished(said), true, said);
  }
  for (const said of ["Braino, are you listening?", "I think he is saying something to the audience.", "How are you Braino",
    "Open the file", "please close all my tabs", "Braino what the fuck did I do", "Braino, play some music."]) {
    assert.equal(looksUnfinished(said), false, said);
  }
});

test("it is held, joined to the rest, and never lost", () => {
  const flush = lift("async function flushRealtimeTranscript(reason, textOverride) {");
  // joined before it is judged, and keeps the verdict the first half got
  assert.match(flush, /transcript = `\$\{heldFragment\.text\} \$\{transcript\}`/);
  assert.match(flush, /heldWasAccepted \? Boolean\(transcript\) : shouldAcceptVoiceTranscript\(transcript\)/);
  // a wordless turn releases it rather than dropping it
  assert.match(flush, /void flushRealtimeTranscript\("held_fragment", held\);/);
  // held only when accepted, not an answer, not a follow-up, not already released
  assert.match(flush, /if \(accepted && !dictationMode && !fromHold && !answering && !hasPendingDelegateFollowup\(\)\s*&& !isBareWakeWord\(transcript\) && looksUnfinished\(transcript\)\) \{/);
  // stop is never held: its checks come first
  assert.ok(flush.indexOf("isStopTaskPhrase(transcript)") < flush.indexOf("looksUnfinished(transcript)"));
  // silence releases it after the hold, as it is
  const release = lift("function releaseHeldFragment() {");
  assert.match(release, /void flushRealtimeTranscript\("held_fragment", text\);/);
  assert.match(release, /Date\.now\(\) - heldFragment\.at < FRAGMENT_MAX_HOLD_MS/);
  assert.match(liftLine("const FRAGMENT_HOLD_MS ="), /1500/);
  assert.match(lift("function stopRealtimeVoice(options = {}) {"), /clearHeldFragment\(\);/);
});

/* ── Stopping ─────────────────────────────────────────────────────────────── */

test("stop the task with nothing running says so, and never becomes a task", () => {
  const nothing = lift("async function nothingToStop(source, transcript = \"\") {");
  assert.match(nothing, /await speak\("Nothing's running right now\."\);/);
  assert.match(nothing, /if \(speaking\) \{\s*\/\/[^\n]*\n\s*stopSpeechOutput\(\);/);
  const flush = lift("async function flushRealtimeTranscript(reason, textOverride) {");
  assert.match(flush, /if \(isStopTaskPhrase\(transcript\)\) \{\s*if \(await stopTaskNow\("voice_phrase", transcript\)\) return;\s*if \(accepted\) \{\s*await nothingToStop\("voice_phrase", transcript\);\s*return;/);
  assert.match(lift("async function submitTyped(text) {"), /if \(!await stopTaskNow\("typed", said\)\) await nothingToStop\("typed", said\);/);
});

test("the open thinking sheet has a Stop button that stops the task", () => {
  const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const lab = readFileSync(new URL("../src/pages/NotchLab.tsx", import.meta.url), "utf8");
  assert.match(html, /<span class="nf-thinking-state">Thinking<\/span>\s*<button class="nf-thinking-stop" type="button" aria-label="Stop the task">Stop<\/button>/);
  assert.match(lab, /nf-thinking-stop/);
  assert.match(css, /#notch-face \.nf-thinking-stop \{\s*display: none;/);
  assert.match(css, /#notch-face\.nf-think-open \.nf-thinking-stop \{ display: inline-flex; \}/);
  assert.match(js, /querySelector\("\.nf-thinking-stop"\)\?\.addEventListener\("click", async \(event\) => \{[\s\S]{0,400}await stopTaskNow\("thinking_button"\)/);
});

/* ── Boot and hotkeys ─────────────────────────────────────────────────────── */

test("the black boot screen is for the first run only", () => {
  const boot = lift("async function runStartupSequence(config = {}) {");
  assert.match(boot, /const introUp = authReady && firstRun \? Boolean\(intro\?\.show\(\{ firstRun \}\)\) : false;/);
  assert.match(boot, /boot\.intro\.skipped", \{ why: "not-first-run" \}/);
  assert.doesNotMatch(boot, /intro\.finish\(\{ firstRun: false \}\)/);
});

test("double Space is two taps on their own, never two spaces in a sentence", () => {
  const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoControlTap.swift", import.meta.url), "utf8");
  const keyDown = swift.slice(swift.indexOf("private func handleKeyDown"), swift.indexOf("private func printLine"));
  assert.match(keyDown, /guard keyCode == 49, !isAutoRepeat else \{\s*if !isAutoRepeat \{ lastSpaceDown = 0 \}\s*return\s*\}/);
  assert.match(keyDown, /if lastSpaceDown > 0 && now - lastSpaceDown < 0\.52 \{\s*printLine\("double-space"\)/);
  assert.match(keyDown, /\} else if now - previousKeyAt >= 0\.6 \{\s*lastSpaceDown = now/);
});
