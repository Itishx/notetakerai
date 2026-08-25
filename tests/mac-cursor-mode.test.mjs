import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoAX.swift", import.meta.url), "utf8");

/* Cursor Mode used to poll git and announce "your task is over" at the first
   changed file. Files change constantly WHILE the work happens, which is
   precisely when the task is not over. */
test("a changed file no longer ends a task", () => {
  assert.doesNotMatch(main, /finishCursorTask\("quiet"\)/);
  assert.doesNotMatch(main, /finishCursorTask\("commit"\)/);
  // The only thing that ends a task is the agent going quiet.
  assert.match(main, /finishCursorTask\("agent_idle"\)/);
  assert.match(main, /CURSOR_AGENT_QUIET_MS = 25000/);
});

/* Cursor's agent panel is a webview, so accessibility cannot see a "generating"
   control. What it can see is the conversation growing. */
test("he watches the agent's own output", () => {
  assert.match(main, /async function readCursorAgentSignal/);
  assert.match(main, /observeapp", "Cursor"/);
  // Code blocks weigh more than plain elements: typing in the composer never
  // creates one, so this is what separates a person from an agent at work.
  assert.match(main, /copy code to clipboard/i);
  // And observing an app that is not in front had to exist at all.
  assert.match(swift, /case "observeapp"/);
  assert.match(swift, /func hilCandidates\(appQuery: String = ""\)/);
});

test("he says four words and nothing else", () => {
  const handler = renderer.slice(
    renderer.indexOf("onCursorTaskComplete"),
    renderer.indexOf("onCursorTaskComplete") + 600,
  );
  assert.match(handler, /"Your task is over\."/);
  // No file list read aloud.
  assert.doesNotMatch(handler, /changedFiles/);
  assert.doesNotMatch(handler, /I saw updates in/);
});
