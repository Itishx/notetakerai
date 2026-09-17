import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");

/* Lift a top-level declaration out of the renderer, so the real code is what
   gets exercised rather than a copy of it. */
const lift = (start, endMarker = "\n}\n") => {
  const at = js.indexOf(start);
  assert.ok(at >= 0, `not found: ${start}`);
  const end = js.indexOf(endMarker, at);
  return js.slice(at, end + endMarker.length);
};
const liftLine = (start) => {
  const at = js.indexOf(start);
  assert.ok(at >= 0, `not found: ${start}`);
  return js.slice(at, js.indexOf("\n", at) + 1);
};

/* ── "Braino, stop the task" ───────────────────────────────────────────────── */

const isStopTaskPhrase = Function(`
  ${liftLine("const STOP_LISTENING_WAKE =")}
  ${liftLine("const STOP_LISTENING_LEAD =")}
  ${liftLine("const STOP_TASK_NAMED_JOB =")}
  ${lift("const STOP_TASK_BARE = [", "\n];\n")}
  ${liftLine("const STOP_TASK_BRAINELLE_WAKE =")}
  ${lift("function isStopTaskPhrase(text) {")}
  return isStopTaskPhrase;
`)();

test("stop the task is heard on the words, with or without his name", () => {
  for (const said of [
    "Braino, stop the task.",
    "stop the task",
    "Cancel the search",
    "Hey Braino, cancel that",
    "Braino stop",
    "Braino, stop, stop",
    "Braino, stop it",
    "Braino never mind",
    "Brainelle, stop the task",
  ]) assert.equal(isStopTaskPhrase(said), true, said);
});

test("a bare stop needs his name, and a sentence is not a stop", () => {
  for (const said of [
    "stop",
    "stop it",
    "never mind",
    "don't stop the music",
    "stop listening",
    "Braino, stop listening",
    "can you stop the task after you find the flight and book it",
  ]) assert.equal(isStopTaskPhrase(said), false, said);
});

test("stopping is instant, says so, and nothing says Done after it", () => {
  const stop = lift("async function stopTaskNow(");
  assert.match(stop, /window\.brainoMac\.stopRunningJob\(\)/);
  assert.match(stop, /delegateGeneration \+= 1;/);
  assert.match(stop, /voiceTurnToken \+= 1;/);
  assert.match(stop, /await speak\("I stopped the task\."\)/);
  /* Checked before HIL is asked anything: that question costs 5 to 10 seconds. */
  const flush = js.slice(js.indexOf("async function flushRealtimeTranscript"));
  const stopAt = flush.indexOf('if (await stopTaskNow("voice_phrase", transcript)) return;');
  const hilAt = flush.indexOf("routeInterjectionIntoRunningJob(transcript)");
  assert.ok(stopAt > 0 && stopAt < hilAt);
  assert.match(js, /if \(result\?\.superseded && !result\?\.say\) \{[\s\S]{0,120}return;/);
});

/* ── Voice waking up ───────────────────────────────────────────────────────── */

/* No countdown: a number made a slow connection look slower and was a guess
   anyway. With HERA listening from the press there is nothing to wait for. */
test("waking says go ahead, not a countdown, and speak-now only follows ready", () => {
  const text = (heraOn) => Function("heraVoice", `
    ${lift("function voiceStartText(phase) {")}
    return voiceStartText;
  `)({ on: heraOn });
  assert.equal(text(true)("starting"), "Go ahead, I'm listening");
  assert.equal(text(false)("starting"), "Connecting");
  assert.equal(text(true)("ready"), "You can speak now");
  assert.doesNotMatch(lift("function voiceStartText(phase) {"), /Live in|Almost there/);
  const ready = js.slice(js.indexOf("realtimeActive = true;\n    // The session is genuinely live"), js.indexOf('logRenderer("realtime.ready"'));
  assert.match(ready, /voiceStartReady\(\);\s*namedOpenAtReady\(\);/);
});

test("the estimate is this Mac's own median, with sane bounds", () => {
  const make = (history) => Function("window", `
    const VOICE_CONNECT_HISTORY_KEY = "k";
    const VOICE_CONNECT_DEFAULT_MS = 3800;
    ${lift("function voiceConnectEstimateMs() {")}
    return voiceConnectEstimateMs;
  `)({ localStorage: { getItem: () => JSON.stringify(history) } });
  assert.equal(make([])(), 3800);
  assert.equal(make([2907, 2686, 5712, 2366, 5088])(), 2907);
  assert.equal(make([100, 200, 300])(), 1500);
  assert.equal(make([20000, 20000, 20000])(), 7000);
});

/* ── Asleep, and waking ───────────────────────────────────────────────────── */

test("asleep does not look like listening, and the room does not flash up", () => {
  const face = js.slice(js.indexOf("function updateNotchFace"), js.indexOf("function nfShowTransient"));
  assert.match(face, /const namedAsleep = visible && !herMode && !dictationMode/);
  assert.match(face, /&& \(!namedAsleep \|\| voiceExplicitlyAddressesBraino\(nfHeardText\)\)/);
  assert.match(face, /sessionEngaged && !namedAsleep\s*&& \(dictationCapturing/);
  assert.match(face, /Listening for \\u201c\$\{activeWakeName\(\)\}\\u201d/);
  assert.match(face, /Say \\u201cHey \$\{activeWakeName\(\)\}\\u201d to wake me/);
  assert.match(css, /#notch-face\.nf-name-asleep \.nf-pill \{[\s\S]{0,160}animation: none;/);
});

test("his name lights the notch, and a wake word lights it like Control twice", () => {
  /* Only a real wake after a long quiet: his name is now in every sentence, so
     lighting up on each one would flash the notch all conversation. */
  assert.match(lift("function namedWake(why) {"), /if \(why === "name" && asleepFor >= NAME_WAKE_LIGHT_AFTER_MS \* 3\) flashNameWake\(\);/);
  /* "Hey Braino" gets the gold trace; the hotkey keeps the blue. */
  assert.match(js, /startVoiceWakeShimmer\(\{ golden: true \}\);\s*void startListening\(\);/);
  /* And nothing else plays that trace on a timer. */
  assert.match(js, /\/\/ window\.setInterval\(\(\) => void runNotchShimmer\(\), 90 \* 1000\);/);
  assert.match(css, /#notch-face\.nf-name-wake \.nf-shine \{/);
  /* The trace stretches to whatever box a state gives it. */
  const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
  assert.match(html, /<svg class="nf-shine" viewBox="0 0 190 55" preserveAspectRatio="none"/);
});

test("the five seconds start when you can talk, not when you said his name", () => {
  const open = lift("function namedOpenAtReady() {");
  assert.match(open, /namedAddressedAt = Date\.now\(\);/);
});

test("her name wakes her, and only while she is the one on screen", () => {
  const make = (name) => Function("activeWakeName", `
    ${liftLine("const BRAINELLE_NAME_RE =")}
    ${liftLine("const BRAINO_SCRIPT_RE =")}
    ${liftLine("const BRAINELLE_SCRIPT_RE =")}
    ${lift("function normalizeForVoiceMatch(value) {")}
    ${lift("function voiceExplicitlyAddressesBraino(text) {")}
    return voiceExplicitlyAddressesBraino;
  `)(() => name);
  const asBrainelle = make("Brainelle");
  const asBraino = make("Braino");
  assert.equal(asBrainelle("Brinell, are you listening?"), true);
  assert.equal(asBrainelle("Hi Brunel, how are you?"), true);
  assert.equal(asBrainelle("Braino, what's up"), true);
  assert.equal(asBraino("Brinell, are you listening?"), false);
  assert.equal(asBrainelle("Pranil, are you listening?"), false);
});

/* ── Waking by name, for real ─────────────────────────────────────────────── */

test("after a deliberate wake, the first sentence gets through however long it takes", () => {
  let now = 1_000_000;  // a real clock is never 0, and 0 reads as "never woken"
  const env = Function("Date", `
    let namedModeOn = true, namedAddressedAt = 0, namedGraceUntil = 0, namedSpeechAwake = false;
    const NAME_WAKE_LIGHT_AFTER_MS = 20000;
    let speaking = false, processing = false, voiceTurnInFlight = false;
    let lastSpokenLine = { endedTs: 0 };
    const NAMED_WINDOW_MS = 12000;
    const NAMED_FIRST_COMMAND_MS = 15000;
    const logRenderer = () => {};
    const flashNameWake = () => {};
    const updateNotchFace = () => {};
    ${lift("function namedWindowOpen() {")}
    ${lift("function namedWake(why) {")}
    ${lift("function namedOpenAtReady() {")}
    return { namedWindowOpen, namedWake, namedOpenAtReady };
  `)({ now: () => now });
  env.namedWake("wake-word");          // "Hey Braino", on-device
  now += 4300; env.namedOpenAtReady(); // voice live 4.3s later
  now += 12000;                        // you start talking 12s after "speak now"
  assert.equal(env.namedWindowOpen(), true);
  env.namedWake("follow-up");          // that sentence lands
  now += 13000;                        // and after it, the normal window
  assert.equal(env.namedWindowOpen(), false);
});

test("his name wakes him in any script, and nothing is dropped without a log", () => {
  const addressed = Function("activeWakeName", `
    ${liftLine("const BRAINELLE_NAME_RE =")}
    ${liftLine("const BRAINO_SCRIPT_RE =")}
    ${liftLine("const BRAINELLE_SCRIPT_RE =")}
    ${lift("function normalizeForVoiceMatch(value) {")}
    ${lift("function voiceExplicitlyAddressesBraino(text) {")}
    return voiceExplicitlyAddressesBraino;
  `)(() => "Braino");
  assert.equal(addressed("हेलो ब्रेनो।"), true);
  assert.equal(addressed("हे ब्रैनो"), true);
  assert.equal(addressed("ہیلو برینو"), true);
  assert.equal(addressed("नमस्ते"), false);
  const accept = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(accept, /named\.awake_other_script/);
  assert.match(accept, /voice\.transcript_unreadable/);
  /* And the transcriber is told the name exists, as a word and not a
     sentence it can repeat back over silence. */
  /* No names in the prompt beyond the one line it always had: every name
     sentence we added came back out of silence as something "you said". */
  const prompt = js.slice(js.indexOf('"Transcribe the user\'s words in a quiet personal voice conversation."'), js.indexOf("turn_detection: {", js.indexOf('"Transcribe the user\'s words in a quiet personal voice conversation."')))
    .split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(prompt, /Vocabulary|Brainelle|Hey Braino|English letters/);
  assert.match(prompt, /"Transcribe the user's direct command to Braino\.",\s*"Ignore music, fans, coughs/);
});

/* A sentence that STARTS while he is awake is his, however long it runs; and
   the window is long enough for a real back-and-forth. */
test("a sentence begun while awake is never cut off for ending late", () => {
  assert.match(js, /const NAMED_WINDOW_MS = 12000;/);
  assert.match(lift("function namedWindowOpen() {"), /return Boolean\(namedSpeechAwake\);/);
  assert.match(js, /if \(namedModeOn && namedWindowOpen\(\)\) namedSpeechAwake = true;/);
  assert.match(lift("async function flushRealtimeTranscript(reason, textOverride) {"), /if \(transcript\) namedSpeechAwake = false;/);
});

/* "Hey Braino" worked once, until the first voice session took the mic, and
   never again. The listener now re-attaches. */
test("the wake listener re-attaches to the microphone", () => {
  const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoWakeWord.swift", import.meta.url), "utf8");
  assert.match(swift, /forName: \.AVAudioEngineConfigurationChange/);
  assert.match(swift, /else if quietFor > 5 \{\s*self\.heal\(/);
  assert.match(swift, /func heal\(_ reason: String\) \{[\s\S]*try attachMicrophone\(\)[\s\S]*restartCycle\(with: recognizer\)/);
  assert.match(swift, /"Brainelle", "Hey Brainelle"/);
  assert.match(js, /if \(brainoAudible\(\)\) \{\s*logRenderer\("wakeword\.self_heard"/);
});

/* It woke him once per launch: restarting from inside the recognition
   callback cancelled the new task, whose callback restarted again, forever. */
test("the wake listener cannot cancel its own replacement", () => {
  const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoWakeWord.swift", import.meta.url), "utf8");
  assert.match(swift, /guard let self, !self\.stopped, generation == self\.cycleGeneration else \{ return \}/);
  assert.match(swift, /func scheduleRestart\(after delay: TimeInterval, with recognizer: SFSpeechRecognizer\) \{[\s\S]*cycleGeneration \+= 1[\s\S]*task\?\.cancel\(\)/);
  assert.match(swift, /if result\.isFinal \{\s*self\.scheduleRestart\(after: 0\.1, with: recognizer\)/);
  /* No restart is called straight from inside the handler any more. */
  const handler = swift.slice(swift.indexOf("task = recognizer.recognitionTask(with: req)"), swift.indexOf("cycleTimer?.invalidate()", swift.indexOf("task = recognizer.recognitionTask(with: req)")));
  assert.match(handler, /DispatchQueue\.main\.async \{/);
  assert.doesNotMatch(handler, /self\.restartCycle\(/);
});
