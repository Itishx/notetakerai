import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Notch Drop (2026-10-01): Tray and AirDrop in the notch, behind a switch.
const main = fs.readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
const swift = fs.readFileSync(new URL("../mac/braino-mac/native/BrainoDrop.swift", import.meta.url), "utf8");

test("off unless the switch is on", () => {
  assert.match(main, /const NOTCH_DROP_ON = process\.env\.BRAINO_NOTCH_DROP === "1";/);
  assert.match(main, /if \(!NOTCH_DROP_ON \|\| dropWatcher\) return;/);
});

test("the watcher reads only the mouse button and the drag pasteboard", () => {
  assert.match(swift, /NSEvent\.pressedMouseButtons/);
  assert.match(swift, /NSPasteboard\(name: \.drag\)/);
  assert.doesNotMatch(swift, /addGlobalMonitorForEvents|CGEventTap|CGWindowListCreateImage/);
});

test("AirDrop reports every real outcome", () => {
  for (const s of ["picking", "sending", "sent", "cancelled", "failed"]) assert.ok(swift.includes(`"${s}"`), s);
  for (const s of ["air-picking", "air-sending", "air-sent", "air-failed", "air-cancelled"]) assert.ok(js.includes(`"${s}"`), s);
});

test("one island size for every drop state", () => {
  const sizes = css.match(/#notch-face\.nf-drop \.nf-pill \{[^}]*\}/g) || [];
  assert.equal(sizes.length, 1);
  assert.match(sizes[0], /width: 520px !important/);
  assert.doesNotMatch(css, /#notch-face\[data-drop[^\]]*\] \.nf-pill/);
});
