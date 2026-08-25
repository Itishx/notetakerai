import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const shared = require("../extension/lib/hilShared.js");

/* One copy, both surfaces.
 *
 * The thinking has always been shared: one prompt, one version, answered
 * server-side for the browser and the Mac alike. The harness was not, and every
 * bug this week lived there — a fix made in the Mac app stayed in the Mac app.
 * Anything that is a judgement about the loop rather than about a particular
 * pair of hands lives in this file now. */
test("the shared harness makes the same judgements everywhere", () => {
  assert.equal(shared.promisesAction("I'm starting that now"), true);
  assert.equal(shared.promisesAction("I opened Medium in a new tab."), false);
  assert.equal(shared.answerApproves("yes go ahead"), true);
  assert.equal(shared.answerApproves("the subject should be hello"), false);
  assert.equal(shared.stepSignature({ action: { type: "click", index: 4 } }),
               shared.stepSignature({ action: { type: "click", index: 4 } }));
  assert.notEqual(shared.stepSignature({ action: { type: "click", index: 4 } }),
                  shared.stepSignature({ action: { type: "click", index: 9 } }));
  // Going in circles is what should end a run, not a step counter.
  assert.equal(shared.isCircling(["a", "b", "a", "a"], "a"), true);
  assert.equal(shared.isCircling(["a", "b", "c"], "a"), false);
});

test("both surfaces actually load it", () => {
  const bg = readFileSync(new URL("../extension/background.js", import.meta.url), "utf8");
  assert.match(bg, /"lib\/hilShared\.js"/);
  // And the browser stops treating a promise as an ending, the same as the Mac.
  assert.match(bg, /BrainoHilShared\?\.promisesAction/);

  const macVerify = readFileSync(new URL("../mac/braino-mac/hil-verify.cjs", import.meta.url), "utf8");
  assert.match(macVerify, /require\("\.\.\/\.\.\/extension\/lib\/hilShared\.js"\)/);
  // The Mac keeps only what is genuinely Mac-shaped.
  assert.match(macVerify, /function macVerifyAssert/);
});

/* The Mac re-exports the shared judgements under its own names, so the call
   sites in main.cjs did not have to change and cannot drift. */
test("the Mac's names still resolve to the shared implementations", () => {
  const mac = require("../mac/braino-mac/hil-verify.cjs");
  assert.equal(mac.macPromisesAction, shared.promisesAction);
  assert.equal(mac.macHilAnswerApproves, shared.answerApproves);
  assert.equal(mac.macHilStepSignature, shared.stepSignature);
});
