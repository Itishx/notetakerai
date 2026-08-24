import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { macVerifyAssert, macHilStepSignature, macHilAnswerApproves } =
  require("../mac/braino-mac/hil-verify.cjs");

/* The bug that made two jobs impossible.
 *
 * url_contains was compared against the window title. A Gmail window is called
 * "Inbox (12) - Gmail" and contains the string "mail.google.com" nowhere, so
 * every navigation reported failure, the loop decided it had not arrived, and
 * navigated again. That is the hundred tabs, and it is why a run never reached
 * its second job: the first could never be declared finished. */
test("arriving somewhere counts as arriving", () => {
  const gmail = {
    appName: "Google Chrome",
    windowTitle: "Inbox (12) - itish@gmail.com - Gmail",
    browserUrl: "https://mail.google.com/mail/u/0/#inbox",
    elements: [{ index: 0, role: "button", name: "Compose" }],
  };
  assert.equal(macVerifyAssert({ assert: "url_contains", value: "mail.google.com" }, gmail).ok, true);
});

test("being somewhere else is still a failure", () => {
  const elsewhere = {
    appName: "Google Chrome",
    windowTitle: "YouTube",
    browserUrl: "https://www.youtube.com/",
    elements: [],
  };
  const verdict = macVerifyAssert({ assert: "url_contains", value: "mail.google.com" }, elsewhere);
  assert.equal(verdict.ok, false);
  // And it says where it actually is, rather than that nothing mentions it.
  assert.match(verdict.why, /youtube\.com/);
});

test("with no address at all it falls back to what is on screen", () => {
  const native = { appName: "Notes", windowTitle: "Braino notes", browserUrl: "", elements: [] };
  assert.equal(macVerifyAssert({ assert: "url_contains", value: "braino" }, native).ok, true);
  assert.equal(macVerifyAssert({ assert: "url_contains", value: "spotify" }, native).ok, false);
});

/* The gate that could not be got through.
 *
 * These are the exact five answers from the session that went round in circles,
 * each one answered with the identical question. */
test("every way a person says yes gets through the gate", () => {
  for (const said of [
    "Yes Braino, close all my tabs",
    "Yes, yes, go ahead",
    "Yes Braino go ahead close all the tabs",
    "Yes you fucking idiot just close all the tabs",
    "yeah do it",
    "sure, proceed",
  ]) {
    assert.equal(macHilAnswerApproves(said), true, said);
  }
});

test("an answer to a question is not permission", () => {
  for (const said of [
    "no don't",
    "wait",
    "hold on",
    "the subject should be hello",
    "send it to itish",
  ]) {
    assert.equal(macHilAnswerApproves(said), false, said);
  }
});

/* A yes covers the thing that was asked about, not whatever comes next. */
test("permission is for one specific step", () => {
  const closing = { action: { type: "click", index: 4 } };
  const sending = { action: { type: "click", index: 9 } };
  assert.equal(macHilStepSignature(closing), macHilStepSignature({ action: { type: "click", index: 4 } }));
  assert.notEqual(macHilStepSignature(closing), macHilStepSignature(sending));
});

/* The wiring: the run has to be held when it asks, and picked back up when it
   is answered, rather than restarted. */
test("the gate holds the run instead of throwing it away", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /pendingHilRun = \{/);
  assert.match(main, /gatedSig: stepSig/);
  // Resumed with everything it had, so it does not re-plan.
  assert.match(main, /runMacHilLoop\(held\.command, \{/);
  assert.match(main, /stepsUsed: held\.stepsUsed/);
  assert.match(main, /approvedSig: approved \? held\.gatedSig : ""/);
  // And the loop starts where it stopped.
  assert.match(main, /for \(let step = startStep; step < maxSteps/);
});
