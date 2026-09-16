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
  const stopAt = flush.indexOf('isStopTaskPhrase(transcript) && await stopTaskNow("voice_phrase", transcript)');
  const hilAt = flush.indexOf("routeInterjectionIntoRunningJob(transcript)");
  assert.ok(stopAt > 0 && stopAt < hilAt);
  assert.match(js, /if \(result\?\.superseded && !result\?\.say\) \{[\s\S]{0,120}return;/);
});

/* ── Voice waking up ───────────────────────────────────────────────────────── */

test("the countdown never claims to be live, and speak-now only follows ready", () => {
  let now = 0;
  const voiceStartText = Function("voiceStart", "Date", `
    ${lift("function voiceStartText(phase) {")}
    return voiceStartText;
  `)({ startedAt: 0, estimateMs: 3800 }, { now: () => now });
  assert.equal(voiceStartText("starting"), "Live in 4");
  now = 1000; assert.equal(voiceStartText("starting"), "Live in 3");
  now = 3500; assert.equal(voiceStartText("starting"), "Live in 1");
  now = 3900; assert.equal(voiceStartText("starting"), "Almost there");
  now = 9000; assert.equal(voiceStartText("starting"), "Almost there");
  assert.equal(voiceStartText("ready"), "You can speak now");
  /* "ready" is set in exactly one place: once the session is really up. */
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
  assert.match(face, /Say \\u201cHey \$\{activeWakeName\(\)\}\\u201d to wake me/);
  assert.match(css, /#notch-face\.nf-name-asleep \.nf-pill \{[\s\S]{0,160}animation: none;/);
});

test("his name lights the notch, and a wake word lights it like Control twice", () => {
  assert.match(lift("function namedWake(why) {"), /if \(why === "name"\) flashNameWake\(\);/);
  assert.match(js, /namedWake\("wake-word"\);\s*if \(!realtimeActive && !realtimeConnecting && !processing\) \{\s*\/\/[^\n]*\n\s*startVoiceWakeShimmer\(\);/);
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
    let namedModeOn = true, namedAddressedAt = 0, namedGraceUntil = 0;
    let speaking = false, processing = false, voiceTurnInFlight = false;
    let lastSpokenLine = { endedTs: 0 };
    const NAMED_WINDOW_MS = 5000;
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
  now += 6000;                         // and after it, the normal five seconds
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
  /* And the transcriber is told the name exists. */
  assert.match(js, /always write that name as Braino, in English letters/);
});
