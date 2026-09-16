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

/* ── The /notch-lab port ────────────────────────────────────────────────────
   Signed off on the lab page before it landed here. These pin the three things
   that were reviewed, so a later edit cannot quietly undo them. */

/* He was a black plate with a coral light on it, which read as a stain rather
   than as Braino. The plate is now painted in the mascot's own gradient. */
test("he is coral while he thinks, not a black plate", () => {
  const face = css.slice(css.indexOf("#notch-face.nf-thinking .nf-response-face {"));
  assert.match(face, /#f6a8a2/i);
  assert.match(face, /#e8786e/i);
  /* On a light plate the fold and smile have to be ink, or they vanish. */
  assert.match(css, /#notch-face\.nf-thinking \.nf-response-fold,[\s\S]{0,80}stroke: rgba\(92, ?28, ?22/);
  /* Coral light over a coral plate is invisible, so the sweep is white and
     blended rather than drawn on top. */
  assert.match(css, /#notch-face\.nf-thinking \.nf-response-face::after \{[\s\S]{0,400}mix-blend-mode: soft-light/);
});

/* The collapse arrow sat against the last line of reasoning with nothing
   between them. */
test("the arrow that closes the panel has room under the last line", () => {
  assert.match(css, /#notch-face\.nf-think-open \.nf-thinking-canvas \{[\s\S]{0,120}padding-bottom: 46px/);
  assert.match(css, /#notch-face\.nf-think-open \.nf-think-chip \{[\s\S]{0,80}bottom: 14px/);
});

/* Your sentence stays while he works on it.
   1aaedb2 handed the box to the centred chip 1.1s into every job, so a command
   vanished the moment he started on it. main kept it, with the phase in the
   box's own chip, and that is the rule again. */
test("your sentence stays in the box while he works", () => {
  assert.doesNotMatch(js, /NF_HEARD_MIN_MS/);
  assert.doesNotMatch(js, /heldRecently/);
  assert.match(js, /if \(processingActive\) inlineMode = heardForInline \? "thinking" : ""/);
  /* The phase goes in the caption's own chip, shimmering. */
  assert.match(js, /classList\.toggle\("nf-inline-working", active && !typingOpen && \(mode === "thinking"/);
  /* And the caption is not cleared by a timer while the job is still running. */
  assert.match(js, /function clearUnlessWorking\(\) \{\s*if \(voiceTurnInFlight \|\| processing\)/);
});

/* With the caption open, the thinking canvas and the centred chip must not
   paint the phase a second and third time, and the collapsed thinking pill
   must not shrink the box to a strip. */
test("the open caption owns the shape while he thinks", () => {
  assert.match(css, /#notch-face\.nf-inline-open:not\(\.nf-think-open\) \.nf-thinking-canvas \{[\s\S]{0,60}display: none !important/);
  assert.match(css, /#notch-face\.nf-inline-open:not\(\.nf-think-open\) \.nf-think-chip \{ display: none; \}/);
  const collapsed = css.indexOf("#notch-face.nf-thinking:not(.nf-think-open) .nf-pill {\n  width: min(430px");
  const override = css.indexOf("#notch-face.nf-inline-open.nf-thinking:not(.nf-think-open) .nf-pill {");
  assert.ok(collapsed > 0 && override > collapsed, "the caption rule must come after the collapsed thinking pill");
});

/* The chip used to cycle four words on a clock. None meant anything. */
test("thinking is one word", () => {
  assert.match(js, /const THINKING_PHASES = \["Thinking"\];/);
  // No list anywhere still carries the old clock words.
  assert.doesNotMatch(js, /\[[^\]\n]*"(?:Hatching|Deciding|Calibrating)"/);
});

/* His closed eyes were being eaten by the physical notch. The lids sit at y
   29-36 of the viewBox and the housing is 33px, so two thirds of both eyes were
   behind it and a 3px sliver showed. This file's own contract at the top says
   the top --nf-notch-h hides behind the housing and the face lives on the chin
   below; .nf-response-face was the one element ignoring it. */
test("his face clears the physical notch", () => {
  /* Coral still runs to the pill's y=0, so there is no black band above him. */
  assert.match(css, /#notch-face \.nf-response-face \{[\s\S]{0,220}height: calc\(72px \+ var\(--nf-notch-h\)\)/);
  /* Only the drawing moves down. */
  assert.match(css, /#notch-face \.nf-response-face svg \{[\s\S]{0,160}margin-top: var\(--nf-notch-h\)/);
  /* And the header has to clear the taller plate, or it lands on his face. */
  assert.match(css, /padding: calc\(var\(--nf-safe-top\) \+ var\(--nf-notch-h\) \+ 43px\) 24px 10px;/);
});
