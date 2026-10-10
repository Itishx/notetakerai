import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-09-24: someone presenting near the mic ("So let's start. Starting one
   more thing.", "So we will note the form for collecting those doubts.") was
   taken as commands, because a waiting question and his own speaking both
   switched the named filter off. */
const src = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const pick = (re) => src.match(re)[0];
const env = new Function(
  "state",
  `let { namedModeOn, namedSpeechAwake, namedGraceUntil, speaking, processing, voiceTurnInFlight } = state;
   ${pick(/const SAID_TO_HIM_QUESTION[^\n]*\n/)}${pick(/const SAID_TO_HIM_ORDER[^\n]*\n/)}${pick(/const SAID_TO_HIM_CORRECTION[^\n]*\n/)}
   ${pick(/function saidToBraino\(text\) \{[\s\S]*?\n\}/)}
   ${pick(/function namedBusyOnly\(\) \{[\s\S]*?\n\}/)}
   ${pick(/const BUSY_INTERRUPT[^\n]*\n/)}
   ${pick(/const ANSWER_REPLY[^\n]*\n/)}
   ${pick(/function answersPendingQuestion\(text\) \{[\s\S]*?\n\}/)}
   return { saidToBraino, namedBusyOnly, answersPendingQuestion, BUSY_INTERRUPT };`,
);

test("a waiting question no longer turns the filter off", () => {
  assert.doesNotMatch(src, /if \(namedModeOn && !herMode && !hasPendingDelegateFollowup\(\)\) \{/);
  const { answersPendingQuestion } = env({});
  assert.equal(answersPendingQuestion("Ilu"), true);
  assert.equal(answersPendingQuestion("the second one"), true);
  assert.equal(answersPendingQuestion("So we will note the form for collecting those doubts."), false);
  // 2026-09-27: while "are you safe?" waited, the room got in as the answer.
  assert.equal(answersPendingQuestion("Say it as a verb."), false);
  assert.equal(answersPendingQuestion("मेरा फोन कहाँ है?"), false);
  assert.equal(answersPendingQuestion("لیگا دیا."), false);
  assert.equal(answersPendingQuestion("Yes."), true);
  assert.equal(answersPendingQuestion("हाँ"), true);
});

test("while he talks or works, only speech aimed at him gets in", () => {
  const busy = env({ namedModeOn: true, namedSpeechAwake: false, namedGraceUntil: 0, speaking: true });
  assert.equal(busy.namedBusyOnly(), true);
  assert.equal(busy.saidToBraino("So let's start. Starting one more thing."), false);
  assert.equal(busy.saidToBraino("open the file"), true);
  assert.equal(busy.BUSY_INTERRUPT.test("stop"), true);
  assert.match(src, /if \(namedModeOn && namedWindowOpen\(\) && !namedBusyOnly\(\)\) namedSpeechAwake = true;/);
});

test("another voice lowers him, only words meant for him stop him", () => {
  // 84 cut-offs on 2026-09-25, 82 by other voices.
  assert.match(src, /if \(audiblyTalking && namedModeOn && !herMode && !dictationMode\) \{\n\s+duckSpeech\(true, "speech_started"\);/);
  assert.match(src, /voiceExplicitlyAddressesBraino\(soFar\) \|\| BARGE_STOP\.test\(soFar\)/);
  const stop = new RegExp(src.match(/const BARGE_STOP = (\/.*\/i);/)[1].slice(1, -2), "i");
  for (const s of ["stop", "wait", "Braino stop", "ruko", "bas", "no no"]) assert.ok(stop.test(s), s);
  for (const s of ["original task diya hai", "how is this possible"]) assert.ok(!stop.test(s), s);
});
