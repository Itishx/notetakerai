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
test("without subtitles is the quiet notch band: labels, no words, one shape", () => {
  assert.match(r, /&& !notchFace\.classList\.contains\("nf-aos"\)\n\s*\);/);
  assert.match(r, /!\(quietNotchOn\(\) \|\| noSubtitles\(\)\)/);
  assert.match(r, /if \(c\.answerOwnsNotch && !noSubtitles\(\)\)/);
  assert.match(r, /right = noSubtitles\(\) \? "Speaking" : activeWakeName\(\);/);
  // The regular notch stays hardware sized underneath, except during boot.
  assert.match(css, /\.dropping\)\) \.nf-pill \{\s*width: var\(--nf-notch-w, 190px\) !important;\s*height: var\(--nf-notch-h, 32px\) !important;/);
  assert.match(css, /\.dropping\)\) \.nf-q::after \{/);
  assert.match(app, /\["braino", "With subtitles"\], \["affective", "Without subtitles"\]/);
});

test("without subtitles: the line sits below the housing, and waking ripples the screen edge", () => {
  assert.match(css, /\.dropping\)\) \.nf-q \{ height: calc\(var\(--nf-notch-h, 32px\) \+ 6px\) !important; \}/);
  assert.match(r, /if \(noSubtitles\(\)\) aosWakeRipple\(\);/);
  assert.match(css, /#aos-ripple\.on \{ animation: aosPulse 1\\.3s/);
});
