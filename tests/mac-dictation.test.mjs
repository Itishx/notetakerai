import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  evaluateDictationStart,
  normalizeDictationChunk,
  parseDictationControl,
  shouldUseDictationPasteFallback,
} = require("../mac/braino-mac/dictation.cjs");

test("recognizes the documented Yap Mode start commands and aliases", () => {
  for (const phrase of [
    "Braino, start dictation mode.",
    "Breno start dictation",
    "Start Yap Mode",
    "Yap Mode",
    "Speak your mind",
    "Take this down",
    "Write what I say",
    "Start typing",
  ]) {
    assert.deepEqual(parseDictationControl(phrase, false), { action: "start" }, phrase);
  }
});

test("done only exits while dictation is active", () => {
  assert.equal(parseDictationControl("done", false), null);
  assert.deepEqual(parseDictationControl("Done.", true), { action: "stop" });
  assert.deepEqual(parseDictationControl("stop dictation", true), { action: "stop" });
  assert.deepEqual(parseDictationControl("turn off Yap Mode", true), { action: "stop" });
  assert.deepEqual(parseDictationControl("I'm done", true), { action: "stop" });
  assert.equal(parseDictationControl("I got it done yesterday", true), null);
});

test("normalizes standalone layout commands and leaves room for the next turn", () => {
  assert.equal(normalizeDictationChunk("new line"), "\n");
  assert.equal(normalizeDictationChunk("New paragraph."), "\n\n");
  assert.equal(normalizeDictationChunk("This is the sentence."), "This is the sentence. ");
});

test("uses system paste for editable and Chromium-hidden text fields", () => {
  assert.deepEqual(evaluateDictationStart("editable", true), {
    ok: true,
    insertionMode: "paste",
  });
  assert.deepEqual(evaluateDictationStart("no_focus", true), {
    ok: true,
    insertionMode: "paste",
  });
  assert.deepEqual(evaluateDictationStart("not_editable", true), {
    ok: true,
    insertionMode: "paste",
  });
  assert.equal(shouldUseDictationPasteFallback("no_focus"), true);
  assert.equal(shouldUseDictationPasteFallback("not_editable"), true);
  assert.equal(shouldUseDictationPasteFallback("insert_failed"), true);
});

test("still blocks secure targets and missing Accessibility permission", () => {
  assert.equal(evaluateDictationStart("secure", true).ok, false);
  assert.equal(evaluateDictationStart("needs-accessibility", true).ok, false);
  assert.equal(evaluateDictationStart("editable", false).ok, false);
  assert.equal(shouldUseDictationPasteFallback("secure"), false);
  assert.equal(shouldUseDictationPasteFallback("needs-accessibility"), false);
});
