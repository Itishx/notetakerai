import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseDanceIntent, pickDanceTrack, DANCE_FLOOR } = require("../mac/braino-mac/dance-intent.cjs");

test("asking him to dance is enough", () => {
  for (const said of [
    "Braino, can you please dance?",
    "Braino, please dance.",
    "braino dance",
    "let's dance",
    "dance for me",
    "show me your moves",
  ]) {
    assert.equal(parseDanceIntent(said)?.action, "start", said);
  }
  assert.equal(parseDanceIntent("stop dancing")?.action, "stop");
});

/* "dance" turns up in song titles, film names and ordinary sentences, and none
   of those are an instruction to start dancing. */
test("talking about dancing is not asking for it", () => {
  for (const said of [
    "play a dance song",
    "I watched Street Dancer yesterday",
    "put on some dance music",
    "search youtube for a dance tutorial and tell me which one is best for beginners",
  ]) {
    assert.equal(parseDanceIntent(said), null, said);
  }
});

/* Nothing kills a party trick faster than the same song twice running. */
test("he does not play the same song twice in a row", () => {
  let previous = "";
  for (let i = 0; i < 12; i += 1) {
    const pick = pickDanceTrack();
    assert.ok(DANCE_FLOOR.includes(pick), pick);
    assert.notEqual(pick, previous, "repeated straight away");
    previous = pick;
  }
});

test("the whole trick is wired, and does not wait to be noticed", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /const danceIntent = parseDanceIntent\(raw\)/);
  // He starts moving before the music, because noticing music runs through
  // AppleScript and that is the thing macOS refuses.
  const block = main.slice(main.indexOf("const danceIntent"), main.indexOf("const danceIntent") + 900);
  assert.ok(
    block.indexOf('braino-mac:dance') < block.indexOf("playSpotifySongOnMac"),
    "the dance is triggered before the song is asked for",
  );
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(renderer, /onDance\?\.\(/);
  assert.match(renderer, /beginMusicTheatrics\(\)/);
});

/* The trap that ate it the first time.
 *
 * The voice turn forks to realtime chat before it forks to the delegate, so a
 * politely phrased request gets answered with words instead of being done. The
 * log has "Braino, can you please dance?" routed straight to realtime_chat,
 * never reaching the intent chain. That is a class of bug: every new trick
 * phrased politely lands in it. */
test("a party trick is caught before chat can answer it", () => {
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const quick = renderer.indexOf("if (await runQuickVoiceCommand(turnText)) return;");
  const chatFork = renderer.indexOf("if (shouldUseRealtimeDirectChat(turnText))");
  assert.ok(quick > 0, "the quick door exists");
  assert.ok(quick < chatFork, "and it comes before the chat fork");

  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const door = main.slice(
    main.indexOf('ipcMain.handle("braino-mac:quick-command"'),
    main.indexOf('ipcMain.handle("braino-mac:quick-command"') + 1400,
  );
  // Dance is behind that door, and first, being the most conversational.
  assert.match(door, /parseDanceIntent\(raw\)/);
  assert.ok(
    door.indexOf("parseDanceIntent") < door.indexOf("parseBrainoOsColorIntent"),
    "party tricks are checked first",
  );
});
