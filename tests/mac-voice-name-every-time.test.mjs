import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* No name, no action — the way Siri and Alexa work. A conversation window let
   a video's audio through as a command. */
test("his name every time, with four plain exceptions", () => {
  let now = 1_000_000;
  const make = (state) => Function("Date", "s", `
    let { namedModeOn, speaking, processing, voiceTurnInFlight, namedGraceUntil, namedSpeechAwake, lastSpokenLine } = s;
    const NAMED_ANSWER_WINDOW_MS = 10000;
    ${lift("function namedWindowOpen() {")}
    return namedWindowOpen;
  `)({ now: () => now }, { namedModeOn: true, speaking: false, processing: false, voiceTurnInFlight: false,
    namedGraceUntil: 0, namedSpeechAwake: false, lastSpokenLine: { endedTs: 0, asked: false }, ...state });
  assert.equal(make({})(), false, "asleep by default: a name is needed");
  assert.equal(make({ namedModeOn: false })(), true, "named mode off: everything is for him");
  assert.equal(make({ speaking: true })(), true, "cutting in while he talks");
  assert.equal(make({ voiceTurnInFlight: true })(), true, "while he works");
  assert.equal(make({ namedGraceUntil: now + 5000 })(), true, "first sentence after a wake");
  assert.equal(make({ namedSpeechAwake: true })(), true, "a sentence begun while open");
  assert.equal(make({ lastSpokenLine: { endedTs: now - 4000, asked: true } })(), true, "answering his question");
  assert.equal(make({ lastSpokenLine: { endedTs: now - 11000, asked: true } })(), false, "the answer window passes");
  assert.equal(make({ lastSpokenLine: { endedTs: now - 1000, asked: false } })(), false, "a statement opens nothing");
  /* The old time window is gone from the check. */
  assert.doesNotMatch(lift("function namedWindowOpen() {"), /NAMED_WINDOW_MS/);
});

test("his last line remembers whether it was a question", () => {
  assert.match(lift("function noteSpoken(text) {"), /asked: \/\\\?\["'\)\\\]\]\*\\s\*\$\/\.test\(String\(text \|\| ""\)\.trim\(\)\)/);
});

test("the on-device listener's ear rescues a misspelt name", () => {
  assert.match(js, /if \(realtimeActive\) namedHeardOnDeviceAt = Date\.now\(\);/);
  const accept = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(accept, /if \(voiceExplicitlyAddressesBraino\(text\) \|\| heardOnDevice\) \{/);
  assert.match(accept, /namedHeardOnDeviceAt = 0;/);
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
