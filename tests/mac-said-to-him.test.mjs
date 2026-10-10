// 2026-10-03: talking to someone else ABOUT Braino woke him and started a job,
// while replying TO him without his name was dropped. Real sentences from the log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { nameIsAddressed } = require("../mac/braino-mac/address-intent.cjs");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

test("calling him still works exactly as before", () => {
  for (const t of ["Braino, can you please open YouTube?", "Hey Braino open YouTube", "Okay Braino", "Braino what did I do today?", "Braino switch to Chrome profile 2.", "Can you please open it, Braino?", "Can you, Braino, open it for me", "So Braino can you check", "Bruno", "Braino stop", "I will do it later Braino open YouTube"]) {
    assert.equal(nameIsAddressed(t), true, t);
  }
});

test("his name said about him is not calling him", () => {
  for (const t of [
    "The first another what I'm noticing right now is that after Braino is done asking me a question",
    "Right now I can see in the logs it says okay I have to say Braino every single time that cannot be",
    "If I say an answer back he's not hearing it long enough OK I have to say Bruno",
    "Go to the notch but don't you think the notch or Braino",
    "I think Braino keeps forgetting", "Tell Braino to stop", "Braino's notch is too big",
  ]) assert.equal(nameIsAddressed(t), false, t);
  assert.equal(nameIsAddressed("Can you please open YouTube"), null);
});

test("the name check and the wake word both use it", () => {
  assert.match(renderer, /return !nameIsOnlyAMention\(raw\);/);
  assert.match(renderer, /if \(payload\?\.transcript && nameIsOnlyAMention\(payload\.transcript\)\)/);
});

test("a reply to him needs no name: short answers, corrections, the same topic", () => {
  assert.match(renderer, /if \(words <= 6 && lastSpokenLine\?\.asked && ANSWER_REPLY\.test\(value\)\) return true;/);
  assert.match(renderer, /\^\(\?:but\|that'\?s \(\?:wrong/);
  assert.match(renderer, /sharesAWordWithQuestion\(value, lastSpokenLine\?\.text\) \|\| sharesAWordWithQuestion\(value, rtLastHeardText\)/);
  // still strict while music or a video plays
  const fn = renderer.slice(renderer.indexOf("function followsHisReply"));
  assert.ok(fn.indexOf("mediaMaybePlaying()) return saidToBraino(text)") < fn.indexOf("ANSWER_REPLY.test(value)"));
});

test("a question anywhere in his line counts as asking", () => {
  assert.match(renderer, /asked: \/\\\?\/\.test\(String\(text \|\| ""\)\) \|\| \/\\b\(\?:tell me \(\?:which/);
});
