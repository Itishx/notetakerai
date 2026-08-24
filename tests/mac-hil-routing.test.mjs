import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  macWantsTheBrain,
  macFastLane,
  macLooksMultiStep,
  macAsksForTheBrain,
  macStripBrainRequest,
  macLooksLikeTask,
} = require("../mac/braino-mac/hil-routing.cjs");

/* Several jobs in one breath is the thing the cascade cannot do: it does the
   first one and drops the rest without saying so. */
test("two jobs in one breath go to the brain", () => {
  for (const said of [
    "open spotify and play billie jean then tell me the time",
    "summarise this and put it in my notes",
    "find the invoice and email it to itish",
    "take a screenshot and save it to the desktop",
    "open cursor after that start the dev server",
  ]) {
    assert.equal(macLooksMultiStep(said), true, said);
  }
});

/* The fast lane has to stay fast. A single plain command answers in under a
   second and must never wait on a model. */
test("one plain command stays in the fast lane", () => {
  for (const said of [
    "play billie jean",
    "open spotify",
    "pause",
    "what time is it",
    "open cursor",
    "turn the volume up",
  ]) {
    assert.equal(macLooksMultiStep(said), false, said);
  }
});

test("asking him to think reaches for the loop on purpose", () => {
  assert.equal(macAsksForTheBrain("use your brain and sort my downloads"), true);
  assert.equal(macAsksForTheBrain("think it through, then book the table"), true);
  assert.equal(macAsksForTheBrain("figure it out"), true);
  assert.equal(macAsksForTheBrain("play billie jean"), false);
  // The request itself is not part of the job.
  assert.equal(macStripBrainRequest("use your brain and sort my downloads"), "and sort my downloads");
  assert.equal(macStripBrainRequest("figure it out"), "figure it out");
});

/* A job goes to the loop when nothing else claimed it. A question about the
   world stays conversation: routing "what is the capital of France" round a
   fourteen step agent loop would be slower and worse than answering it. */
test("unmatched jobs reach the loop, questions stay conversation", () => {
  for (const job of [
    "send itish the notes from yesterday",
    "download the latest invoice",
    "rename these files properly",
    "draft a reply to that email",
  ]) {
    assert.equal(macLooksLikeTask(job), true, job);
  }
  for (const chat of [
    "what is the capital of france",
    "how are you doing today",
    "why is the sky blue",
    "who won the match",
    "tell me a joke",
    "what should i open next",
  ]) {
    assert.equal(macLooksLikeTask(chat), false, chat);
  }
});

/* The wiring, not just the predicates.
 *
 * Two doors, deliberately not three. Asking him to think hands work over, and
 * anything the cascade never claimed falls through to him. What must NOT happen
 * is the loop taking multi step work off the cascade by itself: that was tried
 * and reverted, because this loop has browser hands while the cascade can launch
 * apps, screenshot and search files, and answers in under a second. */
test("the brain is wired into the Mac router at both doors", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const front = main.indexOf('logMac("delegate.hil_loop.front"');
  const unmatched = main.indexOf('logMac("delegate.hil_loop.unmatched"');
  /* The LAST one: there is an earlier, deliberate fallback that sends
     consequence questions ("if I delete the dmg, will I lose the app?") to
     conversation so action intents never see them. */
  const conversation = main.lastIndexOf("return runMacConversation(raw);");
  assert.ok(front > 0, "asking him to think reaches the loop before the cascade");
  // The reverted lesson, kept reverted.
  assert.doesNotMatch(main, /macLooksMultiStep\(raw\)\)\s*\{\s*\n\s*logMac\("delegate\.hil_loop\.front"/);
  assert.ok(unmatched > front, "unclaimed work reaches the loop after the cascade");
  assert.ok(conversation > unmatched, "conversation is what is left, not the default for jobs");
  // One brain, one endpoint, same as the browser.
  assert.match(main, /functions\/v1\/hil-loop/);
  // And a way to turn it off.
  assert.match(main, /BRAINO_HIL/);
});

/* The brain is the default, not a thing you ask for.
 *
 * Having to say "use your brain" is a toggle, not a mind. Browser shaped work
 * is exactly what the loop's vocabulary covers, so it goes there on its own. */
test("browser shaped work reaches the brain without being asked", () => {
  for (const said of [
    "open my gmail and star the newest email",
    "find the mesa email and draft a reply",
    "search youtube for the ultron scene",
    "book a table on zomato for friday",
    "reply to that linkedin message",
  ]) {
    assert.equal(macWantsTheBrain(said), true, said);
  }
});

/* The fast lane is one specific kind of thing: native Mac powers the loop has
   no verb for, which also happen to answer in under a second. */
test("native Mac work stays with the cascade", () => {
  for (const said of [
    "play billie jean",
    "open spotify",
    "take a screenshot",
    "call mom",
    "rename these files",
    "turn on dark mode",
    "organise my desktop",
    "start dictation",
  ]) {
    assert.equal(macFastLane(said), true, said);
    assert.equal(macWantsTheBrain(said), false, said);
  }
});

test("questions still never reach the loop", () => {
  for (const said of ["what is the capital of france", "how are you", "why is the sky blue"]) {
    assert.equal(macWantsTheBrain(said), false, said);
  }
});

/* Pointing at the screen.
 *
 * Working out what "this" is requires looking, which a pattern match cannot do.
 * The log has "rename this file to invoice one" answered with "I searched the
 * Mac, but did not find this" — that is guessing. Narrow on purpose: "play that
 * song" is still the fast lane. */
test("anything pointing at the screen needs eyes, so it needs the loop", () => {
  const { macNeedsScreenContext } = require("../mac/braino-mac/hil-routing.cjs");
  for (const said of [
    "rename this file to invoice one",
    "click on done on the screen what you see",
    "open that invoice which you just downloaded",
    "look at my screen and tell me what is using energy",
  ]) {
    assert.equal(macNeedsScreenContext(said), true, said);
    assert.equal(macWantsTheBrain(said), true, said);
  }
  for (const said of ["play that song", "take a screenshot", "open spotify"]) {
    assert.equal(macNeedsScreenContext(said), false, said);
    assert.equal(macWantsTheBrain(said), false, said);
  }
});
