import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* "Stop talking" went to the loop, failed, and then talked (2026-10-15). */
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const src = js.match(/const STOP_TALKING = (\/.*\/i);/)[1];
const STOP_TALKING = eval(src);

test("stop talking, in its many words, is caught before any route", () => {
  for (const t of ["Stop talking", "Braino, stop talking.", "stop speaking", "shut up", "be quiet please", "hush", "zip it", "chup raho", "Stop talking now"]) assert.ok(STOP_TALKING.test(t), t);
});

test("a real request that starts the same way is left alone", () => {
  for (const t of ["stop talking about cats", "stop the task", "stop the music", "be quiet on WhatsApp for an hour"]) assert.ok(!STOP_TALKING.test(t), t);
});

test("it stops his voice and says nothing, typed or spoken", () => {
  assert.match(js, /if \(isStopTalkingPhrase\(transcript\)\) \{ voiceTurnInFlight = false; stopTalkingNow\("voice", transcript\); return; \}/);
  assert.match(js, /if \(isStopTalkingPhrase\(said\)\) \{ stopTalkingNow\("typed", said\); return; \}/);
  const body = js.slice(js.indexOf("function stopTalkingNow("), js.indexOf("function isStopTaskPhrase("));
  assert.doesNotMatch(body, /speak\(/);
});
