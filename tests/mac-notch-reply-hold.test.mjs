import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* One shape for the whole back and forth (2026-10-11): replying no longer
   closes his sheet and rebuilds the notch four or five times. */
const r = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");

test("a new turn in a live conversation holds the sheet instead of closing it", () => {
  assert.match(r, /if \(!\(realtimeActive && holdNotchAnswerForReply\(\)\)\) clearNotchAnswer\(\{ invalidate: true \}\);/);
});

test("your words, then thinking, show inside the held sheet", () => {
  assert.match(r, /if \(nfReplyHold\.on && nfHeardText && nfHeardText !== previous\) showReplyHoldText/);
  assert.match(r, /if \(nfReplyHold\.on\) \{\s*nfFlowPromptText[\s\S]{0,200}nf-reply-thinking/);
});

test("his answer keeps the width and only the height moves", () => {
  assert.match(r, /nfAnswerModeLocked = fromHold \? nfReplyHold\.mode : "";/);
  assert.match(r, /releaseReplyHold\("answer"\)/);
});

test("it folds away on its own when nothing follows", () => {
  assert.match(r, /if \(idle && Date\.now\(\) - nfReplyHold\.since > 3500\) releaseReplyHold\("quiet"\);/);
  assert.match(css, /#notch-face\.nf-answer-reply/);
});

/* Without subtitles: the AffectiveOS style, now the no subtitles mode. */
const app = readFileSync(new URL("../mac/braino-mac/renderer/app.js", import.meta.url), "utf8");
test("without subtitles there are no sheets, only a listening dot and speaking bars", () => {
  assert.match(r, /&& !notchFace\.classList\.contains\("nf-aos"\)\n\s*\);/);
  assert.match(css, /\.dropping\)\)\.speak \.nf-ns-talk \{ opacity: 1; \}/);
  // Never taller than idle: only the width moves (2026-10-11).
  // ...except during boot, sign in and the greeting, which play at full size.
  assert.match(css, /#notch-face\.nf-aos:not\(:is\(\.nf-iomi-booting, [^)]*\.nf-boot-logo-on[^)]*\)\) \.nf-pill \{[\s\S]{0,120}height: var\(--nf-notch-h, 32px\) !important;/);
  assert.match(css, /\.dropping\)\)\.nf-ns-working \.nf-aos-band \{ animation: nfNsSweep/);
  assert.match(r, /notchFace\.classList\.toggle\("nf-ns-working"/);
  assert.match(app, /\["braino", "With subtitles"\], \["affective", "Without subtitles"\]/);
});
