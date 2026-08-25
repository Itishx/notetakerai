import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoAX.swift", import.meta.url), "utf8");

/* Cursor Mode announced "your task is over" whenever the agent panel went quiet
   for twenty five seconds. That is not a finished task: it is a model thinking,
   a long tool call, a person reading a diff. In one real session it fired eight
   times in an hour, every time over the top of something else, and every time
   it spoke it interrupted a live run and cost that run its context.

   A thing that speaks unprompted has to be right nearly always, because the
   cost of being wrong is the sentence it interrupted. So it is gone, not tuned:
   a longer window would only have made it wrong less often. */
test("he never announces that a task is over", () => {
  assert.doesNotMatch(main, /cursor-task-complete/);
  assert.doesNotMatch(main, /finishCursorTask/);
  assert.doesNotMatch(renderer, /Your task is over/);
  assert.doesNotMatch(renderer, /onCursorTaskComplete/);
  const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");
  assert.doesNotMatch(preload, /cursor-task-complete/);
  // The state stays: the dashboard shows it and the voice prompt reads it as
  // context, and neither of those interrupts anybody.
  assert.match(main, /function endCursorTaskSilently/);
  assert.match(main, /broadcastCursorMode\(\)/);
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

/* And nothing else grew back in its place: no file list, no commit summary,
   no "I finished that for you" under another name. */
test("nothing speaks off the back of the watcher", () => {
  const watcher = main.slice(main.indexOf("async function pollCursorMode"), main.indexOf("function startCursorModeMonitoring"));
  assert.doesNotMatch(watcher, /speak|voice\.out|sendToRenderer\("braino-mac:(?!cursor-mode)/);
  assert.doesNotMatch(renderer, /I saw updates in/);
});
