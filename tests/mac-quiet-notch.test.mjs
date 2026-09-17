import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const lab = readFileSync(new URL("../src/pages/NotchLab.tsx", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* Which quiet state a moment gets, from the same inputs updateNotchFace has. */
const stateFor = (over = {}, env = {}) => Function("e", `
  let { quietOn, herMode, dictationMode, nfPanelOpen, typingOpen, classes, nfQuietAnswerOpenGen,
    nfAnswerGeneration, nfHeardText, nfHeardShownAt, speaking } = e;
  const notchFace = { classList: { contains: (n) => classes.includes(n) } };
  const quietNotchOn = () => quietOn;
  const NF_QUIET_HEARD_MS = 2200;
  ${lift("const NF_QUIET_STANDS_DOWN = [", "\n];\n")}
  ${lift("function quietStateFor(c) {")}
  return quietStateFor;
`)({
  quietOn: true, herMode: false, dictationMode: false, nfPanelOpen: false, typingOpen: false, classes: [],
  nfQuietAnswerOpenGen: -1, nfAnswerGeneration: 4, nfHeardText: "", nfHeardShownAt: 0, speaking: false, ...env,
})({ visible: true, inlineMode: "", processingActive: false, answerOwnsNotch: false, namedAsleep: false,
  sessionEngaged: false, yapOwnsNotch: false, thinkingOpen: false, ...over });

test("each moment gets its quiet state", () => {
  assert.equal(stateFor(), "", "resting stays as it is today");
  assert.equal(stateFor({ sessionEngaged: true }), "listen");
  assert.equal(stateFor({ sessionEngaged: true, namedAsleep: true }), "asleep");
  assert.equal(stateFor({ sessionEngaged: true, inlineMode: "starting" }), "starting");
  assert.equal(stateFor({ sessionEngaged: true, processingActive: true }), "work");
  assert.equal(stateFor({ sessionEngaged: true }, { speaking: true }), "speak");
  assert.equal(stateFor({ sessionEngaged: true, answerOwnsNotch: true }), "answer");
  const now = Date.now();
  assert.equal(stateFor({ sessionEngaged: true, inlineMode: "heard" }, { nfHeardText: "open youtube", nfHeardShownAt: now - 500 }), "heard");
  assert.equal(stateFor({ sessionEngaged: true, inlineMode: "heard" }, { nfHeardText: "open youtube", nfHeardShownAt: now - 3000 }), "listen", "two seconds, then the band goes back");
  assert.equal(stateFor({ sessionEngaged: true, inlineMode: "thinking", processingActive: true }, { nfHeardText: "x", nfHeardShownAt: now - 3000 }), "work");
});

test("what you opened, or a mode of its own, is left as it is", () => {
  assert.equal(stateFor({ sessionEngaged: true, thinkingOpen: true }), "", "the steps");
  assert.equal(stateFor({ sessionEngaged: true, answerOwnsNotch: true }, { nfQuietAnswerOpenGen: 4 }), "", "More on this answer");
  assert.equal(stateFor({ sessionEngaged: true }, { nfPanelOpen: true }), "");
  assert.equal(stateFor({ sessionEngaged: true }, { typingOpen: true }), "");
  assert.equal(stateFor({ sessionEngaged: true, yapOwnsNotch: true }), "", "dictation");
  for (const mode of ["nf-music-open", "nf-meeting-open", "expanded", "alarming", "live", "nf-iomi-booting"]) {
    assert.equal(stateFor({ sessionEngaged: true }, { classes: [mode] }), "", mode);
  }
  assert.equal(stateFor({ sessionEngaged: true }, { quietOn: false }), "", "switched off");
  assert.equal(stateFor({ sessionEngaged: true, visible: false }), "");
});

test("the line keeps the newest words and makes room for its buttons", () => {
  const fit = Function(`
    const nfTextWidth = (t) => t.length * 7;
    ${lift("function nfFitFront(text, maxWidth, font) {")}
    return nfFitFront;
  `)();
  assert.deepEqual(fit("open youtube", 300), { text: "open youtube", trimmed: false });
  const long = fit("I see Cursor documenting that the Shopify extensions page shows none active", 300);
  assert.equal(long.trimmed, true);
  assert.ok(long.text.length * 7 <= 300);
  assert.ok("I see Cursor documenting that the Shopify extensions page shows none active".endsWith(long.text));
  const room = Function(`
    const nfQuietWidth = () => 420;
    ${lift("function nfQuietLineRoom(state, long) {")}
    return nfQuietLineRoom;
  `)();
  assert.equal(room("heard", false), 388);
  assert.equal(room("answer", false), 360);
  assert.equal(room("answer", true), 306);
  /* The ears clear the camera housing: 80pt either side of it. */
  assert.match(liftLine("const NF_QUIET_EAR_W ="), /80/);
});

/* Every sheet took the clicks of the tabs under it. */
test("only the band and real buttons take a click", () => {
  assert.equal((js.match(/window\.brainoMac\.setNotchZone\?\.\(/g) || []).length, 2, "every zone request goes through nfSetZone");
  const push = lift("function nfPushZone() {");
  assert.match(push, /if \(nfQuietState\) \{\s*window\.brainoMac\.setNotchZone\?\.\(\{ expanded: true, width: nfQuietWidth\(\) \+ 16, height: nfNotchHeight\(\) \+ 6 \}\);/);
  assert.match(lift("function renderQuietNotch(ctx) {"), /if \(changed\) nfPushZone\(\);/);
  const zone = lift("function nfPointInNotchZone(x, y) {");
  assert.match(zone, /if \(nfQuietState && nfQuietEls\?\.root\) \{[\s\S]*y <= band\.top \+ nfNotchHeight\(\) \+ 4\) return true;\s*return Boolean\(document\.elementFromPoint\(x, y\)\?\.closest\?\.\("\.nf-q button"\)\);/);
  assert.match(main, /Math\.max\(30, Math\.min\(900, requestedHeight\)\)/);
  assert.match(css, /#notch-face \.nf-q-line \{[\s\S]{0,260}pointer-events: none;/);
  assert.match(css, /#notch-face \.nf-q-band \{[\s\S]{0,120}pointer-events: auto;/);
});

test("the full surfaces are hidden underneath, never shown through", () => {
  assert.match(css, /#notch-face\.nf-quiet-on \.nf-pill,\s*#notch-face\.nf-quiet-on \.nf-pill \*,\s*#notch-face\.nf-quiet-on \.nf-sonar,\s*#notch-face\.nf-quiet-on\.nf-inline-open \.nf-inline-caption,\s*#notch-face\.nf-quiet-on\.nf-answer-open \.nf-answer-surface \{\s*visibility: hidden;/);
  assert.match(html, /<div class="nf-q" aria-live="polite">[\s\S]*<button class="nf-q-more" type="button">More<\/button>[\s\S]*<button class="nf-q-x" type="button" aria-label="Dismiss">/);
  assert.match(lab, /nf-q-band/);
  assert.match(lab, /id: "q-listen"/);
  const hook = js.slice(js.indexOf("function updateNotchFace() {"));
  assert.match(hook.slice(0, hook.indexOf("\n}\n")), /renderQuietNotch\(\{\s*visible, inlineMode, processingActive, answerOwnsNotch, namedAsleep,\s*sessionEngaged, yapOwnsNotch, thinkingOpen,\s*\}\);\s*$/);
  /* Declared up top: updateNotchFace can run before the rest of the file. */
  assert.ok(js.indexOf("let nfQuietState = \"\";") < js.indexOf("function updateNotchFace() {"));
  assert.ok(js.indexOf("let nfQuietState = \"\";") < 1000 * 30);
});

/* ── Stealth ──────────────────────────────────────────────────────────────── */

const stealth = (on) => Function(`
  const stealthOn = () => ${on};
  ${liftLine("const STEALTH_LEAD =")}
  ${lift("function parseStealthPhrase(text) {")}
  return parseStealthPhrase;
`)();

test("stealth is asked for in plain words", () => {
  const ask = stealth(false);
  for (const said of ["Braino, go stealth", "Braino stealth mode", "Hey Braino, turn on stealth mode.", "Braino can you please go stealth", "stealth"]) {
    assert.equal(ask(said), "on", said);
  }
  for (const said of ["Braino, stealth mode off", "Braino turn off stealth", "exit stealth mode", "Braino, stop stealth mode"]) {
    assert.equal(ask(said), "off", said);
  }
  for (const said of ["Braino, come back", "what is stealth mode in games and why do people like it", "open youtube"]) {
    assert.equal(ask(said), "", said);
  }
  assert.equal(stealth(true)("Braino, come back"), "off", "only while he is hidden");
});

test("stealth fades him to 1% and hover brings him back", () => {
  assert.match(css, /#notch-face\.on\.nf-stealth:not\(\.nf-reveal\):not\(\.nf-think-open\):not\(\.nf-panel-open\)[^{]*:not\(\.nf-auth-err\):not\(\.nf-think-failed\) \{\s*opacity: \.01;/);
  assert.match(js, /notchFace\?\.classList\.toggle\("nf-reveal", nfZoneInsideMain\);/);
  assert.match(lift("async function runStartupSequence(config = {}) {"), /startupActive = true;\s*applyStealth\(\);/);
});

test("stealth is a switch in the panel, and a phrase by voice or typed", () => {
  assert.match(html, /data-setting="stealth" role="switch"/);
  assert.match(lab, /data-setting=\\"stealth\\"/);
  assert.match(lift("async function applyPanelSetting(name, on) {"), /\} else if \(name === "stealth"\) \{\s*setStealth\(on, "panel"\);/);
  assert.match(lift("function renderBrainoPanel() {"), /setSwitch\("stealth", stealthOn\(\)\);/);
  const flush = lift("async function flushRealtimeTranscript(reason, textOverride) {");
  assert.match(flush, /const stealthAsk = accepted \? parseStealthPhrase\(transcript\) : "";\s*if \(stealthAsk\) \{\s*await handleStealthPhrase\(stealthAsk, transcript, "voice"\);\s*return;/);
  /* Before a short "go stealth" can be held as half a sentence. */
  assert.ok(flush.indexOf("parseStealthPhrase(transcript)") < flush.indexOf("looksUnfinished(transcript)"));
  assert.match(lift("async function submitTyped(text) {"), /const stealthAsk = parseStealthPhrase\(said\);/);
  assert.match(lift("async function handleStealthPhrase(which, transcript, source) {"), /await speak\(which === "on" \? "Stealth on\. Hover the notch to see me\." : "I'm back\."\);/);
});
