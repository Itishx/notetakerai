import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
const html = read("../mac/braino-mac/renderer/index.html");
const css = read("../mac/braino-mac/renderer/braino-mac.css");

/* The Mac app was voice only. The one input in it was a size slider. */

test("the shortcut cannot steal new tab from every app", () => {
  /* Electron shortcuts are system wide, so plain Cmd+T would take "new tab"
     from every browser, editor and terminal on the machine. */
  assert.match(main, /"CommandOrControl\+Alt\+T"/);
  assert.doesNotMatch(main, /globalShortcut\.register\("CommandOrControl\+T"/);
  assert.match(main, /would take "new tab" away from every browser/);
});

/* register() returns false when another app already owns a combination, and a
   silent false is how this shipped broken: Cmd+Alt+T did nothing and there was
   no way to tell whether it failed to register or failed to reach the
   renderer. */
test("a blocked shortcut is neither silent nor fatal", () => {
  const block = main.slice(main.indexOf("typeToBraino: (() => {"));
  const body = block.slice(0, block.indexOf("dashboard: globalShortcut"));
  assert.ok((body.match(/"CommandOrControl[^"]+"/g) || []).length >= 2, "needs a fallback combo");
  assert.match(body, /logMac\("hotkeys\.typing", \{ combo \}\)/);
  assert.match(body, /logMac\("hotkeys\.typing\.taken", \{ combo \}\)/);
  /* And every registration reports whether it took. */
  assert.match(main, /logMac\("hotkeys\.registered"/);
});

test("typing lands in the box speech lands in", () => {
  /* Same caption section, so understanding, routing, the thinking panel and
     the reply are all identical past this point. */
  const caption = html.slice(html.indexOf('class="nf-inline-caption"'));
  assert.match(caption.slice(0, 900), /class="nf-type-field"/);
  /* And the two never show at once: two lines of text in one box is the
     overlap that took three rounds to remove. */
  assert.match(css, /#notch-face\.nf-typing \.nf-inline-caption-text \{ display: none; \}/);
  assert.match(css, /#notch-face \.nf-type-field \{[\s\S]{0,120}display: none;/);
});

test("a typed turn is a quiet turn", () => {
  assert.match(renderer, /async function answerViaRealtimeChat\(prompt, options = \{\}\)/);
  assert.match(renderer, /if \(!silent\) beginRealtimeStreamTts\(generation\);/);
  /* The answer is still logged, just not spoken. */
  assert.match(renderer, /route: "typed"/);
  assert.match(renderer, /answerViaRealtimeChat\(said, \{ silent: true \}\)/);
});

test("typing never starts him listening", () => {
  const open = renderer.slice(renderer.indexOf("function openTyping"));
  const body = open.slice(0, open.indexOf("\n}\n"));
  assert.doesNotMatch(body, /startVoice|toggleVoice|startRecognition|realtimeStart/);
});

test("typing mid-job is the same conversation as speaking mid-job", () => {
  const submit = renderer.slice(renderer.indexOf("async function submitTyped"));
  const body = submit.slice(0, submit.indexOf("\n}\n"));
  assert.match(body, /routeInterjectionIntoRunningJob\(said\)/);
  /* And a typed job is never dropped when there is no chat session open. */
  assert.match(body, /if \(!answered\) await runDelegate\(said/);
});

test("the hotkey is the way in, and the click is left alone", () => {
  assert.match(renderer, /window\.brainoMac\.onTypeToggle\?\.\(/);
  /* Escape closes, Enter sends. */
  assert.match(renderer, /event\.key === "Escape"[\s\S]{0,80}closeTyping\("escape"\)/);
  assert.match(renderer, /event\.key === "Enter" && !event\.shiftKey/);
  /* A click on the island has meant "talk to me" since long before typing
     existed, so adding a second meaning did not replace the first: the field
     opened AND the microphone started. */
  assert.doesNotMatch(renderer, /openTyping\("click"\)/);
  assert.match(renderer, /Clicking the notch is NOT a way in/);
  assert.match(renderer, /tray\.click_talk/);
});
