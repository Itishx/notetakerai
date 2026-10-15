import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-10-15: the Google Cloud run took 6 minutes and 25 steps; the Komil
   reply sent "to Komil saying..." as the message. */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const page = readFileSync(new URL("../mac/braino-mac/chrome-page.cjs", import.meta.url), "utf8");

test("typing reports the whole value and whether it matches", () => {
  assert.match(page, /'exact match, '\+v\.length\+' characters: '/);
  assert.doesNotMatch(page, /return 'BRAINO_OK '\+\(e\.value\|\|''\)\.slice\(0,60\)/);
});

test("a yes covers the next gated step even if one step comes first", () => {
  assert.match(main, /let consentUntilStep = \(resume\?\.consentFromAnswer \|\| resume\?\.approvedSig\)/);
});

test("a handed off checklist approves its own steps, except money and deleting", () => {
  assert.match(main, /hil\.loop\.handoff_approved/);
  assert.match(main, /pay\|buy\|purchase\|order\|checkout\|transfer\|delete/);
});

test("a job from the Braino app moves the app aside first", () => {
  assert.match(main, /function macAppStepAside\(\)/);
  assert.match(main, /if \(!resume && macAppStepAside\(\)\) await focusChrome\(\)/);
});

test("reply to a named person sends only the message, to that person", () => {
  const src = main.slice(main.indexOf("function parseWhatsAppReplyIntent"), main.indexOf("function parseWhatsAppRememberIntent"));
  const cleanPrompt = (x) => String(x).trim().replace(/[.!?]+$/, "");
  const parse = new Function("cleanPrompt", `${src}; return parseWhatsAppReplyIntent;`)(cleanPrompt);
  assert.deepEqual(parse("Please reply to Komil saying chocolates are on their way. This is Braino replying to you on WhatsApp. Thank you."),
    { message: "Chocolates are on their way. This is Braino replying to you on WhatsApp. Thank you", to: "Komil" });
  assert.deepEqual(parse("reply to Riya: running late"), { message: "Running late", to: "Riya" });
  assert.deepEqual(parse("reply saying I will call you back"), { message: "I will call you back", to: "" });
  assert.equal(parse("reply"), null);
});

const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");

test("every input goes the voice way: the app's chat runs in the notch", () => {
  assert.match(main, /dockWindow\.webContents\.send\("braino-mac:run-input"/);
  assert.match(preload, /onRunInput: \(callback\)/);
  assert.match(renderer, /flushRealtimeTranscript\("app_chat", text, \{ separateTurn: true, preAccepted: true, typed: true \}\)/);
  assert.match(renderer, /if \(accepted && !opts\.fromHera && !opts\.typed\) transcript = await heraCommandText/);
});

test("a yes answers the waiting job before the chat fast lane", () => {
  assert.match(main, /if \(!pendingMacWorkflow && sorted\.kind === "chat"/);
});

test("a handoff never pauses at 20 seconds, and a page that refuses scripts is said once", () => {
  assert.match(main, /isHandoff \? MAC_HANDOFF_TIME_MS : resume\?\.keepGoing/);
  assert.match(main, /Do not use exec_js here again/);
});

test("steps typed on one line still read as a list", () => {
  const src = main.slice(main.indexOf("const HANDOFF_STEP_LINE"), main.indexOf("/* A job started from the Braino app"));
  const { parseHandoff } = new Function(`${src}; return { parseHandoff };`)();
  assert.equal(parseHandoff("I wanted to: 1. Open YouTube. 2. Search. 3. Copy the link.").steps.length, 3);
});
