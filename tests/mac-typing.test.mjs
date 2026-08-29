import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
const html = read("../mac/braino-mac/renderer/index.html");
const css = read("../mac/braino-mac/renderer/braino-mac.css");

/* The Mac app was voice only. The one input in it was a size slider. */

test("the shortcut cannot steal new tab from every app", () => {
  /* Electron shortcuts are system wide, so plain Cmd+T would take "new tab"
     from every browser, editor and terminal on the machine. */
  assert.match(main, /"CommandOrControl\+Alt\+T"/);
  assert.doesNotMatch(main, /globalShortcut\.register\("CommandOrControl\+T"/);
  assert.match(main, /would take "new tab" away from every browser/);
});

/* register() returns false when another app already owns a combination, and a
   silent false is how this shipped broken: Cmd+Alt+T did nothing and there was
   no way to tell whether it failed to register or failed to reach the
   renderer. */
test("a blocked shortcut is neither silent nor fatal", () => {
  const block = main.slice(main.indexOf("typeToBraino: (() => {"));
  const body = block.slice(0, block.indexOf("dashboard: globalShortcut"));
  assert.ok((body.match(/"CommandOrControl[^"]+"/g) || []).length >= 2, "needs a fallback combo");
  assert.match(body, /logMac\("hotkeys\.typing", \{ combo \}\)/);
  assert.match(body, /logMac\("hotkeys\.typing\.taken", \{ combo \}\)/);
  /* And every registration reports whether it took. */
  assert.match(main, /logMac\("hotkeys\.registered"/);
});

test("typing lands in the box speech lands in", () => {
  /* Same caption section, so understanding, routing, the thinking panel and
     the reply are all identical past this point. */
  const caption = html.slice(html.indexOf('class="nf-inline-caption"'));
  assert.match(caption.slice(0, 900), /class="nf-type-field"/);
  /* And the two never show at once: two lines of text in one box is the
     overlap that took three rounds to remove. */
  assert.match(css, /#notch-face\.nf-typing \.nf-inline-caption-text \{ display: none; \}/);
  assert.match(css, /#notch-face \.nf-type-field \{[\s\S]{0,120}display: none;/);
});

test("a typed turn is a quiet turn", () => {
  assert.match(renderer, /async function answerViaRealtimeChat\(prompt, options = \{\}\)/);
  assert.match(renderer, /if \(!silent\) beginRealtimeStreamTts\(generation\);/);
  /* The answer is still logged, just not spoken. */
  assert.match(renderer, /route: "typed"/);
  assert.match(renderer, /answerViaRealtimeChat\(said, \{ silent: true \}\)/);
});

test("typing never starts him listening", () => {
  const open = renderer.slice(renderer.indexOf("function openTyping"));
  const body = open.slice(0, open.indexOf("\n}\n"));
  assert.doesNotMatch(body, /startVoice|toggleVoice|startRecognition|realtimeStart/);
});

test("typing mid-job is the same conversation as speaking mid-job", () => {
  const submit = renderer.slice(renderer.indexOf("async function submitTyped"));
  const body = submit.slice(0, submit.indexOf("\n}\n"));
  assert.match(body, /routeInterjectionIntoRunningJob\(said\)/);
  /* And a typed job is never dropped when there is no chat session open. */
  assert.match(body, /if \(!answered\) await runDelegate\(said/);
});

test("the hotkey is the way in, and the click is left alone", () => {
  assert.match(renderer, /window\.brainoMac\.onTypeToggle\?\.\(/);
  /* Escape closes, Enter sends. */
  assert.match(renderer, /event\.key === "Escape"[\s\S]{0,80}closeTyping\("escape"\)/);
  assert.match(renderer, /event\.key === "Enter" && !event\.shiftKey/);
  /* A click on the island has meant "talk to me" since long before typing
     existed, so adding a second meaning did not replace the first: the field
     opened AND the microphone started. */
  assert.doesNotMatch(renderer, /openTyping\("click"\)/);
  assert.match(renderer, /Clicking the notch is NOT a way in/);
  assert.match(renderer, /tray\.click_talk/);
});

/* The field opened and vanished in the same tick: openTyping added
   nf-inline-open, then updateNotchFace recomputed that class from whether
   anything had been SPOKEN, found nothing, and took it back off. The log said
   type.open twelve times and the screen never changed. */
test("typing holds the caption surface open on its own", () => {
  assert.match(renderer, /const active = typingOpen \|\| Boolean\(mode && value\)/);
  assert.match(renderer, /nfInlineCaptionLabelEl\.textContent = typingOpen \? "You typed" : "You said"/);
});

/* `let` is not hoisted, and syncInlineVoiceSurface sits far above openTyping. */
test("typingOpen is declared before anything reads it", () => {
  const decl = renderer.indexOf("let typingOpen = false;");
  const uses = [...renderer.matchAll(/\btypingOpen\b/g)].map((m) => m.index).filter((i) => i !== decl + 4);
  assert.ok(decl > 0, "typingOpen must exist");
  assert.ok(decl < Math.min(...uses), "declaration must come before every read");
});

/* The dock window is created focusable:false so it never steals the caret.
   Right for an overlay, fatal for a text field: focus() did nothing and every
   letter went to the app in front. Braino OS already does this dance. */
test("the notch takes the keyboard while you type, and gives it back", () => {
  assert.match(main, /ipcMain\.handle\("braino-mac:typing-focus"/);
  const h = main.slice(main.indexOf('ipcMain.handle("braino-mac:typing-focus"'));
  const body = h.slice(0, h.indexOf("\n});") + 4);
  assert.match(body, /dockWindow\.setFocusable\(on\)/);
  assert.match(body, /if \(on\) dockWindow\.focus\(\)/);
  assert.match(body, /dockWindow\.setIgnoreMouseEvents\(!on/);
  /* And it is handed back on close, not left held. */
  assert.match(renderer, /typingFocus\?\.\(false\)/);
});

/* Clicking INTO the text box to place the caret was starting the microphone,
   which is the opposite of what reaching for the keyboard means. */
test("the field owns its own clicks", () => {
  const h = renderer.slice(renderer.indexOf('logRenderer("tray.click_talk"') - 1400);
  const guards = h.slice(0, h.indexOf('logRenderer("tray.click_talk"'));
  assert.match(guards, /if \(typingOpen \|\| event\.target\.closest\("\.nf-inline-caption"\)\) return;/);
});

/* The field and his reply were drawn on top of each other: two labels and two
   paragraphs in the same absolutely positioned box. The caption used to close
   itself when an answer arrived, so it never needed listing; typing holds it
   open on purpose, which broke that assumption. */
test("an answer owns the box, whatever is holding it", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const hide = css.slice(css.indexOf("#notch-face.nf-answer-open .nf-band,"));
  assert.match(hide.slice(0, hide.indexOf("}") + 1), /#notch-face\.nf-answer-open \.nf-inline-caption,/);
  /* And the state matches the pixels: the field stands down rather than being
     hidden underneath, so the keyboard is handed back. */
  assert.match(renderer, /if \(typingOpen\) closeTyping\("answer"\);/);
});

/* Two ways to start listening already exist (Control twice, Command+Space) and
   none to type, so the gesture with no keyboard behind it goes to the keyboard.
   It also removes the trap: reaching for the notch because you missed the
   typing shortcut used to open the microphone instead. */
test("clicking the notch types, it does not listen", () => {
  assert.match(renderer, /logRenderer\("tray\.click_type"/);
  const h = renderer.slice(renderer.indexOf('logRenderer("tray.click_type"'));
  assert.match(h.slice(0, 400), /openTyping\("click"\)/);
  assert.doesNotMatch(h.slice(0, 400), /toggleVoice\(\)/);
});

test("the field is not jammed against the rule above it", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const rule = css.slice(css.indexOf("#notch-face .nf-type-field {"));
  assert.match(rule.slice(0, 400), /margin: 10px 0 0;/);
});

/* Measured: a booking URL is one 90 character word, and none of these surfaces
   had a wrapping rule, so it ran past the edge and was cut off. */
test("nothing he says can be wider than the box he says it in", () => {
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("Nothing he says can be wider"));
  const rule = block.slice(0, block.indexOf("}") + 1);
  for (const sel of ["nf-answer-short-text", "nf-answer-body", "nf-inline-caption-text", "nf-thinking-current"]) {
    assert.ok(rule.includes(sel), `${sel} must be allowed to wrap`);
  }
  assert.match(rule, /overflow-wrap: anywhere/);
});
