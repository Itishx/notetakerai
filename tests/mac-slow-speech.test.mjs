import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* 2026-10-05, 07:27: slow, natural speech was cut at every pause and each
   piece judged alone, so the pieces without his name were thrown away. */
const unfinished = Function(`${lift("const FRAGMENT_TAIL_WORDS = new Set([", "]);\n")}
  ${lift("function looksUnfinished(text) {")} return looksUnfinished;`);

test("pieces cut at a thinking pause wait for the rest; finished sentences do not", () => {
  const looks = unfinished();
  assert.equal(looks("The good thing is when you speak in natural language,"), true);
  assert.equal(looks("I was thinking maybe you could"), true);
  assert.equal(looks("Okay, and then once that is done."), false);
  assert.equal(looks("Open YouTube."), false);
  assert.equal(looks("Braino, I was thinking maybe you could open Pinterest."), false);
});

test("an unfinished piece is held BEFORE it is judged, and the joined sentence is judged once", () => {
  const flush = lift("async function flushRealtimeTranscript(reason, textOverride, opts = {}) {");
  const holdAt = flush.indexOf("holdFragment(transcript, { accepted: false });");
  const gateAt = flush.indexOf("shouldAcceptVoiceTranscript(transcript)");
  assert.ok(holdAt > 0 && holdAt < gateAt, "held before the gate");
  // A never-judged hold does not skip the gate when joined.
  assert.match(flush, /const heldAccepted = heldFragment\.accepted !== false;[\s\S]{0,80}heldWasAccepted = heldAccepted;/);
  // Stops, his name alone, answers he waits for, and stealth are never held.
  const hold = flush.slice(flush.indexOf("Slow, natural speech"), holdAt);
  for (const guard of ["!BARGE_STOP.test(transcript)", "!isBareWakeWord(transcript)", "!namedAnswerWindowOpen()", "!isStopTaskPhrase(transcript, { jobRunning: voiceTurnInFlight })", "!parseStealthPhrase(transcript)"]) {
    assert.ok(hold.includes(guard), guard);
  }
});

test("a held piece with no rest is released through the gate, so room talk stays out", () => {
  const release = lift("function releaseHeldFragment() {");
  assert.match(release, /void flushRealtimeTranscript\("held_fragment", text, accepted \? \{\} : \{ separateTurn: true \}\);/);
  assert.match(liftLine("const FRAGMENT_MAX_HOLD_MS ="), /12000/);
});

test("the voice session waits through pauses; dictation is unchanged", () => {
  assert.match(js, /eagerness: herMode \? "medium" : "low",/);
  const dictation = lift("function buildRealtimeSessionUpdate() {").split("const instructions =")[0];
  assert.match(dictation, /turn_detection: null/);
});

/* Itish chose: a voice glow while talking, then only the exact words sent. */
test("in voice mode the notch shows a glow, not rough live words", () => {
  assert.match(js, /heraVoiceMayShow\(\) && !cleanEarApplies\(\)\) \{\s*nfSetHeard\(live, \{ live: true \}\);/);
  assert.match(js, /if \(!heraVoice\.on && !noiseSoFar && !cleanEarApplies\(\)\) nfSetHeard/);
  const glow = lift("function cleanEarPaintVoiceGlow(rms) {");
  assert.match(glow, /const on = cleanEarApplies\(\) && rtUserSpeakingNow && !cleanEarMuted;/);
  assert.match(glow, /face\.classList\.toggle\("nf-voice-hearing", on\);/);
  const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
  assert.match(css, /#notch-face\.nf-voice-hearing \.nf-pill \{\s*box-shadow: inset /, "inset: nothing draws outside the notch");
});
