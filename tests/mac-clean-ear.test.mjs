import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* Clean hearing (2026-10-04): a turn the mic never heard a voice in, or one
   the transcriber was unsure of, is dropped. No meter never drops. */
const verdict = (meter, logprobs, text = "open the door", now = 10000) => Function("Date", `
  const logRenderer = () => {};
  const cleanEarMeter = ${JSON.stringify(meter)};
  const rtSpeechStartedAt = 8000;
  const rtUserStoppedAt = 9500;
  ${liftLine("const CLEAN_EAR_MIN_VOICED =")}
  ${liftLine("const CLEAN_EAR_MIN_LOGPROB =")}
  let cleanEarMeterWhy = "";
  ${lift("function cleanEarVoicedSamples() {")}
  ${lift("function cleanEarVerdict(event, text, { localWindow, heraWords = 0 }) {")}
  return cleanEarVerdict({ logprobs: ${JSON.stringify(logprobs)} }, ${JSON.stringify(text)}, { localWindow: true });
`)({ now: () => now });

const samples = (voicedCount) => Array.from({ length: 30 }, (_, i) => [7500 + i * 50, i < voicedCount ? 1 : 0]);

test("a real voice the transcriber is sure of goes through", () => {
  assert.equal(verdict({ everHeard: true, samples: samples(12) }, [{ logprob: -0.1 }, { logprob: -0.3 }]).drop, false);
});

test("words with no voice on the mic are dropped", () => {
  assert.equal(verdict({ everHeard: true, samples: samples(0) }, [{ logprob: -0.1 }]).why, "no_voice_on_mic");
});

test("words the transcriber was unsure of are dropped", () => {
  assert.equal(verdict({ everHeard: true, samples: samples(12) }, [{ logprob: -2.4 }, { logprob: -1.9 }]).why, "transcriber_unsure");
});

test("no meter, or a meter that only ever read silence, never drops", () => {
  assert.equal(verdict(null, []).drop, false);
  assert.equal(verdict({ everHeard: false, samples: samples(0) }, []).drop, false);
});

test("no confidence scores fall back to the mic check alone", () => {
  assert.equal(verdict({ everHeard: true, samples: samples(12) }, []).drop, false);
});

test("OpenAI unsure is not a drop when HERA heard a sentence", () => {
  const v = Function("Date", `
    const logRenderer = () => {};
    const cleanEarMeter = null; let cleanEarMeterWhy = "";
    const rtSpeechStartedAt = 0, rtUserStoppedAt = 0;
    ${liftLine("const CLEAN_EAR_MIN_VOICED =")}
    ${liftLine("const CLEAN_EAR_MIN_LOGPROB =")}
    ${lift("function cleanEarVoicedSamples() {")}
    ${lift("function cleanEarVerdict(event, text, { localWindow, heraWords = 0 }) {")}
    return cleanEarVerdict({ logprobs: [{ logprob: -2.5 }] }, "This is a test.", { localWindow: true, heraWords: 40 });
  `)(Date);
  assert.equal(v.drop, false);
});

test("the mic check can never learn a long voice as the room", () => {
  assert.match(js, /const threshold = Math\.min\(CLEAN_EAR_MAX_THRESHOLD,/);
  assert.match(js, /rms < CLEAN_EAR_FLOOR_LEARN_BELOW\) meter\.floor =/);
});

test("a clean HERA turn is sent the moment you stop, and OpenAI's copy is only logged", () => {
  assert.match(js, /if \(HERA_SENDS_COMMAND && heraLive && cleanEarApplies\(\)\) void heraDirectTurn\(event\.item_id, heraLive, heraRequest\);/);
  assert.match(js, /const HERA_SENDS_COMMAND = false;/);
  assert.match(js, /cleanEarApplies\(\) && heraSentItems\.has\(String\(event\.item_id \|\| ""\)\)\) \{[\s\S]{0,160}logRenderer\("voice\.compare"/);
  assert.match(js, /if \(!dictationMode && heraSentItems\.has\(String\(event\.item_id \|\| ""\)\)\) return;/);
});

test("the switch never touches dictation or her mode", () => {
  assert.match(lift("function cleanEarApplies() {", "}\n"), /!dictationMode && !herMode/);
});

/* 2026-10-05 00:24: a "speaking" flag stuck after a chat reply was handed to
   the delegate, and the mute held the mic shut for 85 seconds. The mute now
   follows the audio actually playing, never the flags. */
test("the mic is muted only while his audio is really playing", () => {
  const playing = (state) => Function("realtimeVoiceEngine", "currentSpeechAudio", "activeSpeechAudios", "brainoAudible", `
    ${lift("function cleanEarAudioPlaying() {")}
    return cleanEarAudioPlaying();
  `)(state.engine || "fish", state.current || null, new Set(state.audios || []), () => true);
  // A stuck flag with nothing playing: not muted.
  assert.equal(playing({}), false);
  assert.equal(playing({ audios: [{ paused: true, ended: false }], current: { paused: false, ended: true } }), false);
  // Real audio: muted.
  assert.equal(playing({ audios: [{ paused: false, ended: false }] }), true);
  assert.equal(playing({ current: { paused: false, ended: false } }), true);
});

test("the mute loop never reads the speaking flags to decide", () => {
  const loop = js.slice(js.indexOf("let cleanEarLastPlayingAt = 0;"), js.indexOf("function cleanEarMeterStop()"));
  // Mute only when opted in (5 Oct): the mic stays open so you can talk over him.
  assert.match(loop, /const want = Boolean\(rtMic\) && realtimeActive && cleanEarApplies\(\) && cleanEarMuteWhileSpeaking\(\) && \(playing \|\| Boolean\(tail\)\);/);
  assert.match(loop, /logRenderer\("clean_ear\.stale_audible"/);
});

/* The `speaking` flag itself (2026-10-05 07:17-07:20: speaking:true with no
   audio, no stream fetch, for minutes). Released after six quiet seconds. */
const stuck = () => Function("logRenderer", "noteSpeechEnded", "setTalk", "setStatus", `
  let speaking = true, speakingSilently = false, activeSpeechJobGeneration = 10, realtimeStreamTts = { generation: 10 };
  let realtimeResponseInFlight = false, realtimeActive = true, processing = false;
  let cleanEarLastPlayingAt = 0, speechViaSystemSayUntil = 0, speakingFlagSince = 0;
  const ttsAbortControllers = new Set();
  ${liftLine("const STUCK_SPEAKING_MS =")}
  ${lift("function releaseStuckSpeakingFlag(now, playing) {")}
  return {
    tick: (now, playing = false) => releaseStuckSpeakingFlag(now, playing),
    state: () => ({ speaking, activeSpeechJobGeneration, stream: realtimeStreamTts }),
    fetching: () => ttsAbortControllers.add({}),
    silent: () => { speakingSilently = true; },
    say: (until) => { speechViaSystemSayUntil = until; },
  };
`)(() => {}, () => {}, () => {}, () => {});

test("a speaking flag with nothing playing for six seconds is released", () => {
  const s = stuck();
  s.tick(100000); s.tick(103000);
  assert.equal(s.state().speaking, true, "not before six seconds");
  s.tick(106500);
  assert.deepEqual(s.state(), { speaking: false, activeSpeechJobGeneration: 0, stream: null });
});

test("real speech, a voice being fetched, the system voice, or a silent reply are never cut", () => {
  for (const setup of [(s) => s.fetching(), (s) => s.silent(), (s) => s.say(999999999)]) {
    const s = stuck(); setup(s);
    s.tick(100000); s.tick(120000);
    assert.equal(s.state().speaking, true);
  }
  const playing = stuck();
  playing.tick(100000, true); playing.tick(120000, true);
  assert.equal(playing.state().speaking, true);
});
