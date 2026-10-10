import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-09-29: "online, offline, or both?" then a twenty second answer with no
   name ("both, and like B2B and gifting shops and wedding planners...") was
   dropped as named.ignored. */
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const at = js.indexOf("function answersHisQuestion(text) {");
const fnSrc = js.slice(at, js.indexOf("\n}\n", at) + 3)
  + js.slice(js.indexOf("const ANSWER_STOPWORDS"), js.indexOf("\n}\n", js.indexOf("function sharesAWordWithQuestion")) + 3);
const Q = "What's your current approach, online, offline, or both?";
const make = ({ asked = true, endedTs, startedAt, now, media = false, text = Q }) => new Function(
  "lastSpokenLine", "rtSpeechStartedAt", "NAMED_ANSWER_WINDOW_MS", "ANSWER_REPLY", "namedAnswerWindowOpen", "mediaAudioPlaying", "mediaMaybePlaying", "Date",
  `${fnSrc}; return answersHisQuestion;`,
)({ asked, endedTs, text }, startedAt, 20000, /^(?:yes|no|both)\b/i, () => now - endedTs <= 20000, media, () => media, { now: () => now });

const LONG = "both and like B2B and gifting shops and wedding planners and festive orders and flea stalls and website Instagram Facebook";

test("a long answer that started inside the window counts, even if it ends after it", () => {
  assert.equal(make({ endedTs: 1000, startedAt: 7000, now: 23000 })(LONG), true);
});

test("still no: a sentence that started long after, one with no question asked, or with media playing", () => {
  assert.equal(make({ endedTs: 1000, startedAt: 40000, now: 55000 })(LONG), false);
  assert.equal(make({ asked: false, endedTs: 1000, startedAt: 3000, now: 9000 })(LONG), false);
  assert.equal(make({ endedTs: 1000, startedAt: 3000, now: 9000, media: true })(LONG), false);
});

test("a long, well timed sentence that does not answer him stays out", () => {
  assert.equal(make({ endedTs: 1000, startedAt: 3000, now: 9000 })("I think he is saying something to the audience."), false);
  assert.equal(make({ endedTs: 1000, startedAt: 3000, now: 9000, text: "" })(LONG), false);
});

test("short answers work as before", () => {
  assert.equal(make({ endedTs: 1000, startedAt: 2000, now: 4000 })("yes"), true);
});
