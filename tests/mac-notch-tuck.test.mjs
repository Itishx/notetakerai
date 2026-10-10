import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-09-30: idle, the notch's chin covered Chrome's tab strip, so tabs near
   the middle and a new tab could not be clicked. It now tucks to the housing
   when the pointer comes near and never takes a click below the menu bar. */
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");

test("idle, the strip below the menu bar belongs to Chrome", () => {
  assert.match(js, /if \(nfIdleForTuck\(\) && y > nfNotchHeight\(\)\) return false;/);
  assert.match(js, /function refreshMousePassthrough\(event\) \{\n  nfUpdateTuck\(event\.clientX, event\.clientY\);/);
});

test("it never tucks while anything is happening in the notch", () => {
  const idle = js.slice(js.indexOf("function nfIdleForTuck"), js.indexOf("function nfUpdateTuck"));
  for (const c of ["listen", "speak", "captioning", "busy", "nf-thinking", "nf-answer-open", "nf-inline-open", "nf-think-open"]) assert.ok(idle.includes(`"${c}"`), c);
  assert.match(idle, /nfExpanded \|\| nfMusicOpen \|\| nfDropDepth > 0/);
});

test("tucked is the housing's own height, and only when idle", () => {
  assert.match(css, /#notch-face\.nf-tuck:not\(\.listen\):not\(\.speak\)[^{]*\.nf-pill \{\s*height: var\(--nf-notch-h\);/);
});
