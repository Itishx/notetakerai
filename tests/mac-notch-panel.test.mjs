import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };

/* The app moves into the notch: double-click Braino, he jumps up, the notch
   opens into his settings; close it and he jumps back to where he was. */
test("double-clicking Braino opens the panel in the notch, not the floating card", () => {
  const dbl = js.slice(js.indexOf('walker.addEventListener("dblclick"'), js.indexOf('walker.addEventListener("dblclick"') + 400);
  assert.match(dbl, /void nfOpenPanelFromBraino\(\);/);
  assert.doesNotMatch(dbl, /setBrainoCustomizerOpen/);
  const open = lift("async function nfOpenPanelFromBraino() {");
  assert.match(open, /nfPanelReturn = \{ x: posX, y: posY \};[\s\S]*walkerJumpIntoNotch\(\)[\s\S]*nfSetPanelOpen\(true/);
  const close = lift("async function nfClosePanel(via) {");
  assert.match(close, /walkerJumpOutTo\(spot\)/);
});

test("it closes the way a popover does", () => {
  assert.match(js, /if \(event\.key === "Escape" && nfPanelOpen\) \{/);
  assert.match(js, /if \(nfPanelOpen\) void nfClosePanel\("blur"\);/);
  assert.match(js, /void nfClosePanel\("outside"\);/);
  /* The pointer is ours while it is up, so the outside click lands here. */
  assert.match(lift("function refreshMousePassthrough(event) {"), /if \(nfPanelOpen\) \{\s*setMousePassthrough\(false\);/);
  /* Nothing else can collapse its click zone from under it. */
  assert.doesNotMatch(js.replace(lift("function nfSetPanelOpen("), "").replace(lift("function nfCollapseNotchZone() {"), ""), /setNotchZone\?\.\(\{ expanded: false \}\)/);
});

test("the panel carries size, character, and the three settings", () => {
  for (const hook of ['class="nf-panel-size"', 'data-mascot="brainelle"', 'data-setting="named"', 'data-setting="voice"', 'data-setting="stay"', 'data-action="wallpaper-next"', 'data-action="wallpaper-restore"', 'data-action="patch"']) {
    assert.ok(html.includes(hook), hook);
  }
  const apply = lift("async function applyPanelSetting(name, on) {");
  assert.match(apply, /window\.brainoMac\.namedMode\?\.\(\{ enabled: on \}\)/);
  assert.match(apply, /writeBoolSetting\(TALK_OUT_LOUD_KEY, on\)/);
  assert.match(css, /#notch-face\.nf-panel-open \.nf-pill \{[\s\S]{0,80}width: var\(--nf-panel-w\);/);
});

test("he stays where you drop him, snaps to edges, and lands there at boot", () => {
  const end = lift("function endDrag(event) {");
  assert.match(end, /if \(moved && stayPut\(\)\) \{\s*const spot = snapToEdge\(posX, posY\);\s*pinWalkerAt\(spot\.x, spot\.y\);/);
  const snap = Function("getMoveBounds", "EDGE_SNAP_PX", `${lift("function snapToEdge(x, y) {")} return snapToEdge;`)(
    () => ({ minX: 10, maxX: 900, minY: 54, maxY: 700 }), 56);
  assert.deepEqual(snap(40, 300), { x: 10, y: 300 });
  assert.deepEqual(snap(880, 690), { x: 900, y: 700 });
  assert.deepEqual(snap(400, 300), { x: 400, y: 300 });
  assert.match(js, /await walkTo\(pinnedSpot \? pinnedSpot\.minX : startX, landingY/);
});

test("talk out loud, off: the reply is shown and not spoken", () => {
  const speak = lift("async function speak(text, options = {}) {");
  assert.match(speak, /const quiet = !options\.forceVoice && !herMode && !pitchRunning && !talkOutLoud\(\);/);
  assert.match(speak, /if \(quiet\) \{[\s\S]{0,200}animateNotchAnswerEstimate\(line, generation, readMs\);[\s\S]{0,60}return;/);
  assert.match(lift("function brainoAudible() {"), /\(speaking && !speakingSilently\)/);
});
