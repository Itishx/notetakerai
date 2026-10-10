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

/* Everything the session log said was broken, asserted in the source.
 *
 * These are shape checks rather than behaviour, because each one needs a live
 * screen to exercise. They exist so the specific regressions from 2026-08-25
 * cannot come back quietly. */
test("the loop keeps going, stops when circling, and says what it is doing", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // No step budget worth the name: a counter killed the Faro run mid-work.
  assert.match(main, /MAC_HIL_HARD_STOP = 60/);
  // What ends a run is repeating yourself, not a number.
  assert.match(main, /hil\.loop\.circling/);
  assert.match(main, /repeats >= MAC_HIL_REPEAT_LIMIT/);
  // A new command cancels whatever was running: two runs were alive at once.
  assert.match(main, /macHilGeneration \+= 1/);
  assert.match(main, /hil\.loop\.superseded/);
  // He speaks his progress as he works.
  assert.match(main, /narrator\.line\(stepLine\(turn\.decision\.step\?\.action/);
});

test("a question holds the run, the same as the gate", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const ask = main.slice(main.indexOf('if (d.type === "ask")'), main.indexOf('if (d.type === "answer")'));
  assert.match(ask, /pendingHilRun = \{/);
  assert.match(ask, /stepsUsed: step/);
  // A question is not permission, so nothing is pre-approved by answering one.
  assert.match(ask, /gatedSig: ""/);
});

test("he can actually look, and actually scroll", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // look is a screenshot to a vision model, not the same list read returns.
  assert.match(main, /async function macLookAtScreen/);
  assert.match(main, /visionMode: "describe"/);
  assert.doesNotMatch(main, /type === "read" \|\| type === "look"/);
  // scroll exists at all now.
  assert.match(main, /if \(type === "scroll"\)/);
  const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoAX.swift", import.meta.url), "utf8");
  assert.match(swift, /"pagedown": 121/);
  // And he can see more of the screen than before.
  assert.match(main, /MAC_HIL_OBSERVE_CAP = 220/);
});

/* Being able to change your mind mid-run.
 *
 * The main process could already drop a running loop when a new command
 * arrived, but the command never got that far: the renderer dropped every
 * transcript while a turn was in flight, and a HIL run holds that flag for
 * minutes. Giving him a second task mid-run did nothing at all. */
test("a new command interrupts long work instead of being dropped", () => {
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  // An interruption is allowed once the running turn is genuinely long work.
  assert.match(renderer, /VOICE_TURN_INTERRUPT_AFTER_MS = 2500/);
  assert.match(renderer, /const interrupting = voiceTurnInFlight/);
  // But not before, so his own voice coming back cannot cut him off.
  assert.match(renderer, /Date\.now\(\) - voiceTurnStartedAt > VOICE_TURN_INTERRUPT_AFTER_MS/);
  // The old turn's result is discarded rather than spoken over the new job.
  assert.match(renderer, /voiceTurnMine === voiceTurnToken/);
  assert.match(renderer, /voice\.stale_turn_settled/);
});

/* The three things that made him feel slow and scattered. */
test("he plays music even when macOS blocks AppleScript", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // A second route, used when the local app refuses.
  assert.match(main, /async function playSpotifyViaWebApi/);
  assert.match(main, /spotify-playback/);
  assert.match(main, /spotify\.mac_app\.play_failed/);
  // And it says what is wrong once, rather than failing silently thousands of times.
  assert.match(main, /looksLikeAutomationDenied/);
  assert.match(main, /warnedAutomationDenied/);
});

test("he remembers what he just said", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /function macRecentExchanges/);
  // Handed to the loop as context, which had only the screen and the command.
  assert.match(main, /macRecentExchanges\(\),/);
});

test("thinking is shown, not waited for", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  // Every step goes to the screen.
  assert.match(main, /braino-mac:thinking-step/);
  assert.match(renderer, /onThinkingStep/);
  // Only the first is spoken: speaking each one cost about six seconds a turn.
  // ...and only while acting, never a note about "the user" (2026-09-27).
  assert.match(main, /narrator\.line\(stepLine\(turn\.decision\.step\?\.action/);
  // And a sound made while thinking is not an instruction.
  assert.match(renderer, /VOICE_FILLER_ONLY/);
  assert.match(renderer, /voice\.filler_ignored/);
});

/* Saying it is not doing it.
 *
 * Asked to run task 49 he replied "Task 49 is open a site that does not exist
 * and tell me what happened. I'm starting that now." and the run ended with
 * nothing started. */
test("a promise continues the run instead of ending it", async () => {
  const { macPromisesAction } = (await import("node:module")).createRequire(import.meta.url)("../mac/braino-mac/hil-verify.cjs");
  for (const said of [
    "Task 49 is open a site that does not exist. I'm starting that now.",
    "I will open LinkedIn for you",
    "Let me check that",
    "On it",
  ]) {
    assert.equal(macPromisesAction(said), true, said);
  }
  // Reports of work already done are proper endings.
  for (const said of [
    "I opened Medium in a new tab. The page is ready.",
    "Your Google Meet is ready: https://meet.google.com/x",
    "Tomorrow is 32 degrees, so not over 35.",
    "I have sent it.",
  ]) {
    assert.equal(macPromisesAction(said), false, said);
  }
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /hil\.loop\.promise_not_kept/);
});

/* Not knowing is not the same as knowing there is nothing.
 *
 * Both media probes run through AppleScript. When macOS refuses Automation they
 * failed and the app reported "nothing is playing", which switched off the very
 * guard that stops speaker audio being heard as a command. */
test("when he cannot tell what is playing, he guards anyway", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /spotifyProbeFailed/);
  assert.match(main, /youtubeProbeFailed/);
  assert.match(main, /const uncertain = !playing && \(spotifyProbeFailed \|\| youtubeProbeFailed\)/);
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(renderer, /mediaAudioUncertain/);
  // 2026-09-26: "not sure" counts only if something was confirmed playing in the last ten minutes.
  assert.match(renderer, /return mediaAudioPlaying \|\| \(mediaAudioUncertain && Date\.now\(\) - mediaConfirmedPlayingAt < 10 \* 60 \* 1000\);/);
});
