// Braino's own browser (2026-10-05): do-it-for-me web jobs run in a window
// inside the app, read and pressed from inside the page, never your Chrome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const own = require("../mac/braino-mac/own-browser.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("which jobs go to his browser", () => {
  for (const t of ["book me the tickets to Drishyam", "book me a flight from Pune to Hyderabad tomorrow", "order from Blinkit", "find me the five cheapest flights to Mumbai", "book an Uber to Ajmera Greens", "compare iPhone 17 prices"]) assert.ok(own.wantsOwnBrowser(t), t);
  for (const t of ["open YouTube", "show me the cheapest flights to Mumbai", "play Billie Jean", "message Param", "open this article for me", "what is the weather"]) assert.ok(!own.wantsOwnBrowser(t), t);
});

test("the loop's eyes and hands use his browser during his job", () => {
  assert.match(main, /if \(macOwnJobActive\(\)\) return macBuildOwnObservation\(\);/);
  assert.match(main, /if \(onPage && macLastReadWasPage\.own && \(type === "click" \|\| type === "type" \|\| type === "pressKey"\)\)/);
  assert.match(main, /async function openChromeUrl\(url\) \{\n  url = localizeUrl\(url\);\n  if \(macOwnJobActive\(\)\) \{/);
  assert.match(main, /const out = macOwnJobActive\(\) \? await ownBrowser\(\)\.run\(wrapped\) : await runJs\(wrapped, app, 45000\);/);
  assert.match(main, /if \(macOwnJobActive\(\)\) \{ const u = ownBrowser\(\)\.url\(\);/);
  assert.match(main, /macOwnJobActive\(\) \? OWN_BROWSER_NOTE : ""/);
});

test("a new job ends the last one's use of his browser; an answer keeps it; quitting closes it", () => {
  assert.match(main, /if \(!pendingMacWorkflow && !\/\^show me/);
  assert.match(main, /app\.on\("before-quit", \(\) => \{ try \{ ownBrowserInstance\?\.destroy\(\); \} catch \(_\) \{\} \}\);/);
  assert.match(main, /source: "own_browser:show"/);
  assert.match(main, /BRAINO_OWN_BROWSER/);
});

test("real input events, with the old DOM press only as a fallback", () => {
  const src = readFileSync(new URL("../mac/braino-mac/own-browser.cjs", import.meta.url), "utf8");
  assert.match(src, /sendInputEvent\(\{ type: "mouseDown"/);
  assert.match(src, /insertText\(String\(text \?\? ""\)\)/);
  assert.match(src, /if \(keyCode === "Return"\) w\.webContents\.sendInputEvent\(\{ type: "char", keyCode: "\\r" \}\);/);
  assert.match(src, /setUserAgent\(ua\)/);
});

test("his browser is on screen by default, without taking the keyboard; hide it keeps it hidden for the job", () => {
  const src = readFileSync(new URL("../mac/braino-mac/own-browser.cjs", import.meta.url), "utf8");
  assert.match(src, /function reveal\(\) \{ const w = ensure\(\); if \(!w\.isVisible\(\)\) w\.showInactive\(\);/);
  assert.match(main, /if \(ownBrowserVisibleByDefault\(\) && !macOwnJob\?\.hidden\) ownBrowser\(\)\.reveal\(\);/);
  assert.match(main, /BRAINO_OWN_BROWSER_VISIBLE/);
  assert.match(main, /if \(macOwnJob\) macOwnJob\.hidden = true;/);
});
