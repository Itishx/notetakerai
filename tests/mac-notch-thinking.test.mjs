import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const html = read("../mac/braino-mac/renderer/index.html");
const css = read("../mac/braino-mac/renderer/braino-mac.css");
const js = read("../mac/braino-mac/renderer/braino-mac.js");

/* The line used to be a caption pinned to the left edge of a 190px housing, so
   "Reading the page and understanding what matters" reached the screen as the
   word "READ". */
test("what he is thinking sits in the middle, and fits", () => {
  assert.match(html, /class="nf-think-chip"/);
  assert.match(html, /nf-think-chip-text/);
  assert.match(html, /nf-think-chip-arrow/);
  const chip = css.slice(css.indexOf("#notch-face .nf-think-chip {"), css.indexOf("#notch-face.nf-thinking .nf-think-chip"));
  assert.match(chip, /left: 50%/);
  assert.match(chip, /translateX\(-50%\)/);
  /* The island grows to hold a sentence rather than clipping it to the housing. */
  assert.match(css, /#notch-face\.nf-thinking:not\(\.nf-think-open\) \.nf-pill \{[\s\S]{0,120}width: min\(430px/);
  assert.match(css, /max-width: 318px/);
  assert.match(css, /text-overflow: ellipsis/);
});

test("it shimmers, and the arrow turns over when it opens", () => {
  assert.match(css, /@keyframes nfThinkShimmer/);
  assert.match(css, /animation: nfThinkShimmer/);
  assert.match(css, /-webkit-background-clip: text/);
  assert.match(css, /#notch-face\.nf-think-open \.nf-think-chip-arrow \{ transform: rotate\(180deg\); \}/);
  /* Motion is a preference, not a decision. */
  assert.match(css, /prefers-reduced-motion[\s\S]{0,160}nf-think-chip-text \{ animation: none/);
});

/* Two of anything is one too many: the dots said "thinking" from the corner
   while the chip says it in words. */
test("the old furniture is gone", () => {
  assert.match(css, /#notch-face \.nf-think-dots,\n#notch-face \.nf-think-arrow \{ display: none !important; \}/);
  assert.doesNotMatch(html, /class="nf-think-arrow"/);
});

/* The bug: every arriving step removed nf-think-open, so the panel closed
   itself under your hand and the next click reopened it. */
test("nothing automatic closes a panel a person opened", () => {
  assert.match(js, /let nfThinkingPinned = false;/);
  const open = js.slice(js.indexOf("function openNotchThinking"), js.indexOf("function normalizedNotchAnswer"));
  assert.match(open, /if \(!nfThinkingPinned\) notchFace\.classList\.remove\("nf-think-open"\)/);
  assert.doesNotMatch(open, /"nf-answer-long", "nf-think-open"/);
  /* And the pin can never outlive the state it belongs to. */
  assert.match(js, /if \(nfThinkingPinned && !notchFace\?\.classList\.contains\("nf-thinking"\)\) nfThinkingPinned = false;/);
});

/* The other half of the double click: the clickable zone hugged the physical
   housing, so the first press landed on the desktop behind the chip. */
test("the clickable zone covers the chip", () => {
  assert.match(js, /NF_THINK_ISLAND_WIDTH = 430/);
  assert.match(js, /NF_THINK_ISLAND_HEIGHT = 92/);
  assert.match(js, /function nfSyncThinkingZone/);
  const open = js.slice(js.indexOf("function openNotchThinking"), js.indexOf("function normalizedNotchAnswer"));
  assert.match(open, /nfSyncThinkingZone\(\)/);
  assert.doesNotMatch(open, /setNotchZone\?\.\(\{ expanded: false \}\)/);
});

test("the chip is the named way in, and takes one press", () => {
  assert.match(js, /querySelector\("\.nf-think-chip"\)\?\.addEventListener\("click"/);
  const handler = js.slice(js.indexOf('querySelector(".nf-think-chip")?.addEventListener'), js.indexOf('querySelector(".nf-think-chip")?.addEventListener') + 700);
  assert.match(handler, /event\.stopPropagation\(\)/);
  assert.match(handler, /nfSetThinkingOpen\(opening\)/);
  assert.match(js, /function nfSetThinkingOpen/);
  assert.match(js, /aria-expanded/);
});
