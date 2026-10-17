import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const line = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* Hold the room (2026-10-15): calling him pauses what is playing; once he has
   understood you it resumes, unless the command was about the sound itself. */
const decide = Function(`
  ${line("const MEDIA_HOLD_KEEP_PAUSED =")}
  ${line("const MEDIA_HOLD_RESUME_WORDS =")}
  return (t) => MEDIA_HOLD_KEEP_PAUSED.test(t) && !MEDIA_HOLD_RESUME_WORDS.test(t) ? "keep" : "resume";
`)();

test("an ordinary task brings the music back", () => {
  for (const t of ["open WhatsApp", "what's the weather tomorrow", "message Riya I'm late", "turn the volume down a bit"]) assert.equal(decide(t), "resume", t);
});

test("a command about the sound leaves the old track paused", () => {
  for (const t of ["pause", "play Billie Jean", "next song", "stop the music", "mute it"]) assert.equal(decide(t), "keep", t);
});

test("asking to carry on resumes", () => {
  assert.equal(decide("resume the video"), "resume");
  assert.equal(decide("continue playing"), "resume");
});

test("off by default, and every way out of a session lets the music go", () => {
  assert.match(js, /localStorage\.getItem\(MEDIA_HOLD_KEY\) === "1"/);
  for (const why of ["session_end", "start_failed", "no_speech", "no_turn", "switched_off"]) assert.ok(js.includes(`"${why}"`), why);
});

test("only what he paused is resumed", () => {
  assert.match(main, /player state is paused and \(name of current track\) is/);
  assert.match(main, /querySelectorAll\('\[data-braino-held\]'\)/);
});

test("starting a session never lets go of the music it just paused", () => {
  assert.match(js, /stopRealtimeVoice\(\{ keepDictation: isDictation, startingNew: true \}\)/);
  assert.match(js, /if \(!options\.startingNew\) releaseMedia\(true, "session_end"\)/);
});

test("his name in an already open session pauses the music too", () => {
  assert.match(js, /voiceExplicitlyAddressesBraino\(soFar\) && !isSelfEcho\(soFar\)\) \{\n\s+holdMedia\("name_live"\)/);
});

test("the mic open turns every sound down, Chrome included, and never sticks low", () => {
  assert.match(js, /if \(!holdMedia\("wake"\)\) void window\.brainoMac\.musicDuck/);
  assert.match(main, /CHROME_DIP_JS/);
  assert.match(main, /if \(!musicDuckWanted && musicDuckState === state\) await restoreMusicDuck\(\)/);
});

test("a sentence he ignores lets the music go", () => {
  assert.match(js, /releaseMedia\(true, "ignored"\)/);
});
