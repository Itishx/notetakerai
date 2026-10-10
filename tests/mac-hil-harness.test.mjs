import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const { parseInterruptIntent, workflowClaimsUtterance } = require("../mac/braino-mac/interrupt-intent.cjs");
const { macWantsTheBrain, macClosesAllTabs } = require("../mac/braino-mac/hil-routing.cjs");

/* From the 2026-08-25 session. Every case below is a real command that went
   wrong, kept as the eval set for the harness rather than for the prompt. */

test("more than one job goes to the brain, whatever the jobs are", () => {
  /* The worst one: three jobs, one of them the word "play", so a pattern match
     took all three and started composing an email nobody asked for. */
  assert.equal(macWantsTheBrain("find the latest email from Anthropic, put the invoice number in a new note, and then play something instrumental"), true);
  assert.equal(macWantsTheBrain("close all my tabs, open cursor, then play a song on spotify"), true);
  /* And one job still goes the fast way. */
  for (const fast of ["play billie jean", "open spotify", "organize my desktop", "call mom", "take a screenshot"]) {
    assert.equal(macWantsTheBrain(fast), false, fast);
  }
});

test("close all the tabs is matched by shape, not by an exact sentence", () => {
  for (const said of ["Close all the tabs please", "close all my tabs", "close every tab", "clear all my tabs now", "Braino, can you please close all the tabs?"]) {
    assert.equal(macClosesAllTabs(said), true, said);
  }
  for (const said of ["close the youtube tabs", "close all my tabs, then open cursor", "close chrome"]) {
    assert.equal(macClosesAllTabs(said), false, said);
  }
  /* It runs before the brain, because closing every tab is one AppleScript. */
  const router = main.slice(main.indexOf("if (macClosesAllTabs(raw))"), main.indexOf("if (macHilEnabled() && macWantsTheBrain(raw))"));
  assert.match(router, /closeAllBrowserTabs\(\)/);
});

/* "I could not find an app or known website called all the tabs", spoken out
   loud, while the layer that understood it sat in shadow watching. */
test("a miss is handed to the brain, not read out", () => {
  assert.match(main, /function macCascadeMissed/);
  assert.match(main, /if \(macCascadeMissed\(result\) && macHilEnabled\(\)\)/);
  assert.match(main, /result = await runMacHilLoop\(raw\);/);
  /* Only a failure to UNDERSTAND falls through. Being refused by macOS is news
     about the world and the loop cannot do better. */
  const fn = main.slice(main.indexOf("function macCascadeMissed"), main.indexOf("async function runMacHilLoop"));
  assert.match(fn, /result\.missed === true/);
  assert.match(fn, /result\.source === "hil_loop"/);
});

test("stop stops, and only the right kind of stop", () => {
  for (const said of ["Stop", "Braino stop that task. Stop. Stop.", "cancel that", "never mind", "stop everything"]) {
    assert.equal(parseInterruptIntent(said)?.action, "abort", said);
  }
  for (const said of ["Stop the song Braino.", "stop the music", "stop recording", "stop the timer"]) {
    assert.equal(parseInterruptIntent(said), null, said);
  }
  /* It runs before anything half finished can claim the word, and it kills the
     run in flight rather than at the next step boundary. */
  const router = main.slice(main.indexOf("const interrupt = parseInterruptIntent(raw)"), main.indexOf("const pendingWorkflowResult"));
  assert.match(router, /macHilGeneration \+= 1/);
  assert.match(router, /pendingHilRun = null/);
  assert.match(router, /clearPendingMacWorkflow\(\)/);
  assert.match(main, /let macHilAbort = null;/);
  assert.match(main, /macHilAbort\.abort\(\)/);
  assert.match(main, /signal: controller\.signal/);
});

/* A pending question ate a GitHub request, then "take care of the anthropic
   task", then a stop, answering all three with "I still need the email
   address". */
test("a question may claim an answer, never an instruction", () => {
  const pending = { type: "mail", stage: "mail_body" };
  assert.equal(workflowClaimsUtterance(pending, "I will send it tonight"), true);
  assert.equal(workflowClaimsUtterance(pending, "thanks, this is exactly what I needed"), true);
  assert.equal(workflowClaimsUtterance(pending, "open the NotetakerAI repository on GitHub and read me the newest commit"), false);
  assert.equal(workflowClaimsUtterance(pending, "close all the tabs please"), false);
  assert.match(main, /if \(pending\.type !== "hil_answer" && !workflowClaimsUtterance\(pending, raw\)\)/);
});

/* Four "yes please" in a row for one tweet, because navigate, read and type all
   came back marked irreversible. */
test("only something that can be irreversible may stop and ask", () => {
  assert.match(main, /const MAC_HIL_GATEABLE = new Set\(\["click", "pressKey", "selectOption"\]\)/);
  const fn = main.slice(main.indexOf("function macStepCanBeIrreversible"), main.indexOf("/* \"and leave it unsent\""));
  assert.match(fn, /if \(type === "type"\) return action\.submit === true;/);
  assert.match(main, /const irreversible = \(stepObj\.reversible === false && macStepCanBeIrreversible\(stepObj\)[^)]*\) \|\| unaskedSend;/);
});

test("WhatsApp is instant only when they asked to send (2026-09-28)", () => {
  const pick = (re) => main.match(re)[0];
  const unasked = new Function(`${pick(/const MAC_MESSAGE_TOOLS[^\n]*\n/)}${pick(/const MAC_ASKED_TO_SEND[^\n]*\n/)}${pick(/function macUnaskedMessageSend\(step, command\) \{[\s\S]*?\n\}/)}; return macUnaskedMessageSend;`)();
  const send = { action: { type: "tool", tool: "whatsapp_send" } };
  assert.equal(unasked(send, "Saying that you're not ready bro"), true);
  assert.equal(unasked(send, "send this link to Param on WhatsApp"), false);
  assert.equal(unasked(send, "Ask Param where he is"), false);
  assert.equal(unasked({ action: { type: "tool", tool: "open_url" } }, "anything"), false);
});

test("they already said not to send it", () => {
  assert.match(main, /function macCommandForbidsSending/);
  assert.match(main, /if \(irreversible && macCommandForbidsSending\(command\)\)/);
  assert.match(main, /hil\.loop\.send_refused/);
});

test("a read is never worth a turn, and one bad turn is not fatal", () => {
  assert.match(main, /hil\.loop\.read_skipped/);
  assert.match(main, /stepObj\.action\?\.type === "read" && stepObj\.action\?\.index == null/);
  assert.match(main, /if \(retried < 2\)/);
  assert.match(main, /retried = 0; \/\/ a good turn clears the run's hiccup budget/);
});

test("he no longer reads a stack trace out loud", () => {
  const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
  assert.doesNotMatch(renderer, /await speak\(`Delegate error/);
  assert.match(renderer, /That one broke on my side, so I stopped/);
});
