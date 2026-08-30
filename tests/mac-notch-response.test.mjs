import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  LONG_ANSWER_THRESHOLD,
  classifyNotchAnswer,
  estimateLongAnswerHeight,
  fitLongAnswerHeight,
  normalizeNotchAnswer,
  notchAnswerLingerMs,
  relativeWindowTop,
  splitNotchAnswerBlocks,
} = require("../mac/braino-mac/notch-response.cjs");

test("measures the overlay from its current display instead of the global desktop", () => {
  assert.equal(relativeWindowTop(900, 900), 0);
  assert.equal(relativeWindowTop(-1080, -1080), 0);
  assert.equal(relativeWindowTop(26, 0), 26);
  assert.equal(relativeWindowTop(930, 900), 30);
});

test("repairs missing display spaces without breaking decimals, URLs, or acronyms", () => {
  assert.equal(
    normalizeNotchAnswer('Hey,your task is over.Please look at README.md",Braino is done.'),
    'Hey, your task is over. Please look at README.md", Braino is done.',
  );
  assert.equal(normalizeNotchAnswer("Hey , your task is over ."), "Hey, your task is over.");
  assert.equal(
    normalizeNotchAnswer("Version 2.5 is on example.com. U.S.A. stays intact."),
    "Version 2.5 is on example.com. U.S.A. stays intact.",
  );
});

test("moves answers beyond the compact surface's real capacity into reading mode", () => {
  assert.equal(LONG_ANSWER_THRESHOLD, 100);
  assert.equal(classifyNotchAnswer("A compact answer.").kind, "short");
  assert.equal(classifyNotchAnswer("x".repeat(99)).kind, "short");
  assert.equal(classifyNotchAnswer("x".repeat(100)).kind, "long");
  assert.equal(classifyNotchAnswer("A first paragraph.\n\nA second paragraph.").kind, "long");
});

test("keeps useful response structure without trusting response HTML", () => {
  assert.deepEqual(
    splitNotchAnswerBlocks("## The point\n\nA summary.\n\n- First\n- Second\n1. Third"),
    [
      { type: "heading", level: 2, text: "The point" },
      { type: "paragraph", text: "A summary." },
      { type: "bullet", text: "First" },
      { type: "bullet", text: "Second" },
      { type: "number", text: "Third" },
    ],
  );
});

test("long responses hold longer and never exceed the visible screen", () => {
  assert.ok(notchAnswerLingerMs("x".repeat(500), "long") > notchAnswerLingerMs("Done", "short"));
  assert.equal(estimateLongAnswerHeight("x".repeat(5000), 720), 630);
  assert.equal(estimateLongAnswerHeight("Short but rich", 900), 196);
  assert.equal(fitLongAnswerHeight(90, 900), 164);
  assert.equal(fitLongAnswerHeight(271.4, 900), 271);
  assert.equal(fitLongAnswerHeight(900, 720), 630);
});

test("the Mac renderer mounts and drives the Chrome-system response and Yap states", () => {
  const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const hotkey = readFileSync(new URL("../mac/braino-mac/native/BrainoControlTap.swift", import.meta.url), "utf8");

  assert.match(html, /class="nf-thinking-canvas"/);
  assert.match(html, /class="nf-answer-surface"/);
  assert.match(html, /class="nf-yap-surface"/);
  assert.match(html, /class="nf-inline-caption"/);
  assert.match(html, /\.\.\/notch-response\.cjs/);
  assert.match(css, /#notch-face\.nf-answer-short \.nf-pill/);
  assert.match(css, /#notch-face\.nf-answer-long \.nf-pill/);
  assert.match(css, /#notch-face\.nf-yap-open \.nf-pill/);
  assert.match(css, /#notch-face\.nf-inline-open \.nf-pill/);
  assert.match(css, /--nf-compact-surface-w: min\(480px, calc\(100vw - 32px\)\)/);
  assert.match(css, /--nf-yap-height/);
  assert.match(css, /Braino SF Pro Display/);
  assert.match(css, /font: 500 17px\/1\.48/);
  assert.match(css, /width 1050ms cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(js, /scheduleNotchThinking\(text,/);
  assert.match(js, /startNotchAnswer\(line, generation, \{\s*rich:/);
  assert.match(js, /updateNotchAnswerText\(nfFlowResponseText, streamState\.generation\)/);
  assert.match(js, /trackNotchAnswerAudio\(audio, spokenText, generation\)/);
  assert.match(js, /function updateYapTranscript/);
  assert.match(js, /function syncInlineVoiceSurface/);
  assert.match(js, /classList\.toggle\("nf-yap-open", yapOwnsNotch\)/);
  assert.match(js, /function renderedLongAnswerHeight/);
  assert.match(js, /nfAnswerBody\.scrollHeight/);
  assert.match(main, /notchZoneExpandedHeight/);
  assert.match(js, /nfAnswerArticle\?\.contains\(event\.target\)/);
  assert.doesNotMatch(html, /nf-answer-(?:lane|walker)/);
  assert.doesNotMatch(css, /nf-answer-(?:lane|walker)/);
  assert.doesNotMatch(js, /NotchAnswerWalk|nfAnswerWalk/);
  assert.doesNotMatch(js, /notchFixedHeight: 240/);
  assert.match(main, /present front document[\s\S]{0,80}play front document/);
  assert.match(hotkey, /printLine\("double-shift"\)/);
  /* Shift twice has been the launch film, then the idle screen, and is now the
     pitch demo. What this test cares about is only that the Swift helper's
     signal reaches one handler and is not dropped; which handler it is belongs
     to tests/mac-pitch-demo.test.mjs. */
  assert.match(main, /trimmed === "double-shift"[\s\S]{0,500}?(?:startPitchDemo|toggleIdleScreen)/);
  assert.doesNotMatch(main, /trimmed === "double-space"[\s\S]{0,180}?launch-demo-start/);
  assert.match(css, /#notch-face\.nf-answer-exiting \.nf-pill/);
  assert.match(css, /#notch-face\.nf-surface-exiting \.nf-pill/);
  assert.match(js, /function beginNotchSurfaceExit/);
  assert.doesNotMatch(css, /#notch-face\.nf-answer-exiting \.nf-pill \{ background: #000/);
  assert.match(css, /height 280ms cubic-bezier/);
  assert.match(css, /background: #000/);
  assert.doesNotMatch(css, /launch-demo-glow/);
  assert.doesNotMatch(js, /launch-demo-glow/);
  assert.match(css, /#notch-face\.launch-now-playing \.nf-pill/);
  assert.match(js, /slots\.push\("Now Playing · Launch Vid\.MP4"\)/);
  assert.match(js, /await setWalkerHomeState\(true\);[\s\S]{0,100}?launchDemoNowPlaying = true/);
  assert.match(js, /fetchTtsChunk\(fullText, generation\)/);
  assert.match(js, /launch_demo\.tts\.playing/);
  assert.match(js, /const timingWeights = sequence\.map/);
  assert.match(js, /audio\.addEventListener\("loadedmetadata"/);
});

test("voice subtitles stay inside Braino's box and expanded thinking fits its content", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const updateFace = js.slice(js.indexOf("function updateNotchFace"), js.indexOf("function nfShowTransient"));

  assert.match(css, /#notch-face\.nf-inline-open \.nf-inline-caption/);
  assert.match(css, /#notch-face\.nf-inline-open \.nf-cap,[\s\S]{0,500}?display: none !important/);
  assert.match(css, /\.nf-answer-short-text \.nf-answer-word:not\(:last-child\) \{ margin-right: \.24em; \}/);
  /* The caption carries your sentence and nothing else now: the phase lives in
     the centred chip, so this call no longer passes one. */
  assert.match(updateFace, /syncInlineVoiceSurface\(inlineMode, inlineText\)/);
  assert.match(updateFace, /layoutNotchCaption\(""\)/);
  assert.match(updateFace, /classList\.remove\("captioning"\)/);
  assert.doesNotMatch(updateFace, /layoutNotchCaption\(yapOwnsNotch \? "" : caption\)/);
  assert.match(js, /function renderedThinkingHeight/);
  assert.match(js, /--nf-thinking-height/);
  assert.match(js, /classList\.contains\("nf-inline-open"\)/);
  assert.doesNotMatch(js, /expanded: true, width: 650, height: 260/);
  assert.doesNotMatch(js, /else if \(!walkerHome\) setBubble\(rtUserTranscript/);
  assert.match(js, /onSpeechTranscript[\s\S]{0,260}?nfSetHeard\(speech\.text\)/);
  assert.match(css, /--nf-safe-top: max\(var\(--nf-notch-h\), 32px\)/);
  assert.match(css, /--nf-content-top: calc\(var\(--nf-safe-top\) \+ 20px\)/);
  assert.match(css, /padding: var\(--nf-content-top\) 18px 14px/);
});

test("thinking stays collapsed until click, and the chip is clickable", () => {
  const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const openThinking = js.slice(
    js.indexOf("function openNotchThinking"),
    js.indexOf("function normalizedNotchAnswer"),
  );
  const delegate = js.slice(
    js.indexOf("async function runDelegate"),
    js.indexOf("async function answerViaRealtimeChat"),
  );
  assert.doesNotMatch(openThinking, /classList\.add\([^)]*nf-think-open/);
  /* The zone used to hug the physical housing, which put the chip outside the
     clickable area: the first press landed on the desktop behind it and only the
     second one opened anything. It now covers the island, and goes back the
     moment thinking ends. */
  assert.match(openThinking, /nfSyncThinkingZone\(\)/);
  assert.match(js, /event\.target\.closest\?\.\("\.nf-pill"\)/);
  assert.ok(
    delegate.indexOf("const delegatePromise = window.brainoMac.delegate")
      < delegate.indexOf("scheduleNotchThinking(text"),
  );
});

test("Mac answer and thinking sheets use a fixed black material", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const responseSection = css.slice(css.indexOf("Chrome-system response surfaces on Mac IOMI"));
  assert.match(responseSection, /linear-gradient\(180deg,rgba\(0,0,0,\.99\)/);
  assert.match(responseSection, /\.nf-yap-open \.nf-pill::before,[\s\S]{0,1400}?background: linear-gradient\(180deg,rgba\(0,0,0,\.99\)/);
  assert.doesNotMatch(responseSection, /conic-gradient/);
  assert.doesNotMatch(responseSection, /#ec8078|#dc77a8|#779cff|#f4cf87/i);
});

test("thinking, short answers, and long answers share BrainoHERA's Apple font contract", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const responseSection = css.slice(css.indexOf("Chrome-system response surfaces on Mac IOMI"));
  const appleStack = /"Braino SF Pro Display", "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif/;

  assert.match(responseSection, /#notch-face \.nf-thinking-canvas,[\s\S]{0,180}?#notch-face \.nf-thinking-canvas \*/);
  assert.match(responseSection, /#notch-face \.nf-answer-surface,[\s\S]{0,180}?#notch-face \.nf-answer-surface \*/);
  assert.match(responseSection, appleStack);
  assert.match(responseSection, /font-synthesis: none/);

  const responseTypography = responseSection.slice(responseSection.indexOf("One explicit Apple type contract"));
  assert.doesNotMatch(responseTypography, /"Newsreader"|Georgia|,\s*serif/);
});
