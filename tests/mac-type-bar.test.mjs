import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* ⌘⌥T, 2026-10-25: one line of glass in the middle of the screen; the answer
   comes in the notch and is never spoken. */
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs");
const preload = read("preload.cjs");
const notch = read("renderer/braino-mac.js");
const html = read("renderer/type-bar.html");
const js = read("renderer/type-bar.js");

test("⌘⌥T opens the centre glass bar, not the notch's own field", () => {
  assert.match(main, /const took = globalShortcut\.register\(combo, \(\) => \{\s*toggleTypeBar\(combo\);/);
  // Bottom of the screen, a pill, and it stays when you switch Spaces (2026-10-25).
  assert.match(main, /display\.workArea\.height - height - 36/);
  assert.match(main, /setVisibleOnAllWorkspaces\(true, \{ visibleOnFullScreen: true \}\)/);
  assert.doesNotMatch(main, /typeBarWindow\.on\("blur"/);
  assert.match(html, /border-radius: 999px/);
  assert.match(html, /class="mascot"/);
  assert.doesNotMatch(html, /class="orb"/);
  assert.match(js, /getWalkerSvgFor\?\.\("braino"\)/);
});

test("what is typed goes to the notch as a typed turn", () => {
  assert.match(main, /sendToRenderer\("braino-mac:run-input", \{ text: said, source: "type_bar" \}\)/);
  assert.match(preload, /typeBarSend: \(text\) => ipcRenderer\.invoke\("braino-mac:type-bar-send", text\)/);
  assert.match(notch, /flushRealtimeTranscript\("app_chat", text, \{ separateTurn: true, preAccepted: true, typed: true \}\)/);
});

test("typed is never spoken, chat route included", () => {
  assert.match(notch, /answerViaRealtimeChat\(turnText, \{ silent: Boolean\(opts\.typed\) \}\)/);
  assert.match(notch, /await speak\(result\?\.say \|\| "Done\.", \{ silent: Boolean\(options\.typed\) \}\)/);
});

test("the bar: Enter sends, Esc closes, ↑ recalls, scripts allowed only from the app", () => {
  assert.match(html, /script-src 'self'/);
  assert.doesNotMatch(html, /<script>(?!<\/script>)/);
  assert.match(js, /e\.key === "Escape"/);
  assert.match(js, /e\.key === "ArrowUp"/);
  assert.match(js, /api\.typeBarSend\?\.\(text\)/);
});
