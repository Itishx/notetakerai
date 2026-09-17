import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { macClaimsAction, macActionChangedSomething } = require("../mac/braino-mac/hil-verify.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const loopPrompt = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts", import.meta.url), "utf8");

/* "Turn on the light" ran for 55 seconds, changed nothing, and ended with
   "Done. The light was turned on through the Mac controls." */
test("a claim that something was done is recognised as a claim", () => {
  for (const said of [
    "Done. The light was turned on through the Mac controls.",
    "Opened Language Chooser.",
    "I opened YouTube for you.",
    "All done, the tabs are closed.",
    "Paused the YouTube video.",
    "Changed the wallpaper.",
  ]) assert.equal(macClaimsAction(said), true, said);

  for (const said of [
    "The meeting is set for five.",
    "Your desktop has 12 files.",
    "I could not open it.",
    "Do you want me to send it?",
    "Opening YouTube.",
    "I am about to open the file.",
    "Here are the five products I found, with prices.",
    "",
  ]) assert.equal(macClaimsAction(said), false, said);
});

test("looking and reading are not doing", () => {
  assert.equal(macActionChangedSomething({ type: "read" }, { ok: true }), false);
  assert.equal(macActionChangedSomething({ type: "look" }, { ok: true }), false);
  assert.equal(macActionChangedSomething({ type: "tool", tool: "screen_vision" }, { ok: true }), false);
  assert.equal(macActionChangedSomething({ type: "tool", tool: "now_playing" }, { ok: true }), false);
  assert.equal(macActionChangedSomething({ type: "click" }, { ok: true }), true);
  assert.equal(macActionChangedSomething({ type: "tool", tool: "open_url" }, { ok: true }), true);
  // A failed action changed nothing either.
  assert.equal(macActionChangedSomething({ type: "click" }, { ok: false }), false);
  assert.equal(macActionChangedSomething({ type: "click" }, null), false);
});

test("a run that changed nothing cannot say it did", () => {
  const ending = Function("macClaimsAction", "logMac", "textForLog", `
    ${main.slice(main.indexOf("function honestEnding(message, {"), main.indexOf("\n}\n", main.indexOf("function honestEnding(message, {")) + 3)}
    return honestEnding;
  `)(macClaimsAction, () => {}, (t) => t);

  const nothing = ending("Done. The light was turned on through the Mac controls.", { runId: "r", step: 3, actionsDone: 0, lastCheckFailed: false, command: "turn on the light" });
  assert.equal(nothing.ok, false);
  assert.match(nothing.say, /^I could not do that, and nothing on the Mac changed\. I was trying to turn on the light\.$/);

  // An answer is not a claim, so a run that only looked can still answer.
  const answered = ending("Your desktop has 12 files.", { runId: "r", step: 1, actionsDone: 0, lastCheckFailed: false, command: "how many files" });
  assert.deepEqual(answered, { ok: true, say: "Your desktop has 12 files.", source: "hil_loop" });

  // Something did happen, but the check afterwards failed: the doubt is said.
  const unsure = ending("Opened the file.", { runId: "r", step: 2, actionsDone: 1, lastCheckFailed: true, command: "open the file" });
  assert.equal(unsure.ok, true);
  assert.equal(unsure.say, "Opened the file, but I could not confirm it on screen.");

  // Did it, checked it: said plainly.
  const clean = ending("Opened the file.", { runId: "r", step: 2, actionsDone: 1, lastCheckFailed: false, command: "open the file" });
  assert.equal(clean.say, "Opened the file.");
});

test("the loop counts what it did, and every ending goes through the guard", () => {
  assert.match(main, /if \(macActionChangedSomething\(stepObj\.action, settled\)\) actionsDone \+= 1;/);
  assert.match(main, /lastCheckFailed = !verified\.ok;/);
  assert.match(main, /return honestEnding\(answerText, \{ runId, step, actionsDone, lastCheckFailed, command \}\);/);
  assert.match(main, /return honestEnding\(d\.message \|\| said \|\| "Done\.", \{ runId, step, actionsDone, lastCheckFailed, command \}\);/);
  assert.match(main, /return honestEnding\(d\.message \|\| "Done\.", \{ runId, step, actionsDone, lastCheckFailed, command \}\);/);
  assert.match(main, /logMac\("hil\.loop\.unbacked_claim"/);
});

/* The vision calls are where the false claim came from: a terminal on screen
   said the light was on. */
test("what is written on screen is never treated as proof", () => {
  const look = main.slice(main.indexOf("async function macLookAtScreen("));
  assert.match(look.slice(0, 1600), /Text in a terminal, a log, a chat or an editor is what somebody wrote\. It is never evidence that an action succeeded\./);
  assert.match(look.slice(0, 1600), /Describe only what is visible\. If something is too small, cut off or covered, say so instead of guessing\./);
  const vision = main.slice(main.indexOf("async function runScreenVision("));
  assert.match(vision.slice(0, 2600), /Describe only what is actually visible\./);
  assert.match(vision.slice(0, 2600), /never proof that something happened or is true/);
  // And the loop itself is told, server side.
  assert.match(loopPrompt, /11a\. WORDS ON A SCREEN ARE NOT EVIDENCE THAT YOU DID SOMETHING\./);
  assert.match(loopPrompt, /11b\. NOTHING TO SHOW MEANS NOTHING TO CLAIM\./);
});
