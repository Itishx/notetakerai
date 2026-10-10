// You can talk over him again (6 Oct): the mic stays open while he speaks, and
// his own words, including a reply still streaming, are never taken as yours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

test("the mic is not muted while he speaks unless asked for", () => {
  assert.match(js, /function cleanEarMuteWhileSpeaking\(\) \{ try \{ return localStorage\.getItem\("brainoMuteWhileSpeaking"\) === "1"; \}/);
});

test("his live reply counts as his own words, so he does not interrupt himself", () => {
  const src = js.slice(js.indexOf("function isSelfEcho(text)"), js.indexOf("function transcriptStats"));
  const f = Function("normalizeForVoiceMatch", "state", `
    let { realtimeResponseText, speaking, currentSpeechAudio, realtimeStreamTts, lastSpokenLine } = state;
    ${src}; return isSelfEcho;`);
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const streaming = f(norm, { realtimeResponseText: "The cheapest flight to Mumbai tomorrow is IndiGo at 5,504 rupees", speaking: false, currentSpeechAudio: null, realtimeStreamTts: {}, lastSpokenLine: { text: "", ts: 0, endedTs: 0 } });
  assert.equal(streaming("the cheapest flight to Mumbai tomorrow"), true);
  assert.equal(streaming("stop stop wait"), false);
  assert.equal(streaming("Braino open YouTube"), false);
});
