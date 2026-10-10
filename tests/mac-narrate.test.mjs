import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* Talk me through it: he says what he heard and what he is doing as he works. */
const require = createRequire(import.meta.url);
const { asDoing, ackLine, createNarrator } = require("../mac/braino-mac/narrate.cjs");
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");

test("steps are said the way a person would say them", () => {
  assert.equal(asDoing("fill both HSN fields"), "Filling both HSN fields.");
  assert.equal(asDoing("open Google Flights"), "Opening Google Flights.");
  assert.equal(asDoing("compare the five cheapest flights"), "Comparing the five cheapest flights.");
  assert.equal(asDoing("get the price"), "Getting the price.");
  assert.equal(asDoing("searching the web"), "Searching the web.");
  assert.equal(asDoing("The user wants to book five flights"), "Booking five flights.");
});

test("he opens with Got it and the goal", () => {
  assert.equal(ackLine("Find the five cheapest flights to Goa"), "Got it. Finding the five cheapest flights to Goa.");
  assert.equal(ackLine(""), "Got it.");
});

test("never twice, never on top of each other, and the ack always goes", () => {
  let t = 0; const out = [];
  const n = createNarrator((x) => out.push(x), { now: () => t, minGapMs: 4500 });
  n.ack("open the flights page");
  n.step("open the flights page");          // same as just said, and too soon
  t = 1000; n.step("type Goa");             // too soon
  t = 6000; n.step("type Goa");
  t = 12000; n.step("type Goa");            // already said
  assert.deepEqual(out, ["Got it. Opening the flights page.", "Typing Goa."]);
});

test("his technical thinking is never read out; narration has its own channel", () => {
  const main = read("main.cjs");
  assert.doesNotMatch(main, /sendToRenderer\("braino-mac:speak-line", \{ text: aloud \}\)/);
  assert.match(main, /if \(turn\.split\?\.restated_goal\) narrator\.ack\(turn\.split\.restated_goal\);/);
  assert.match(main, /sendToRenderer\("braino-mac:narrate"/);
  const r = read("renderer/braino-mac.js");
  assert.match(r, /window\.brainoMac\.onNarrate\?\.\(/);
  assert.match(r, /if \(!text \|\| !narrateOn\(\)\) return;/);
});

test("no dashes in what he says", () => {
  assert.doesNotMatch(asDoing("open it — now") + ackLine("type – fast"), /[—–]/);
});

/* "What's up" turned the volume up 20 points (2026-10-10). */
test("a short question or greeting is never a volume command", () => {
  const { parseVolumeCommand } = require("../mac/braino-mac/media-control.cjs");
  for (const s of ["What's up", "whats up", "what is up", "how's it going up there"]) assert.equal(parseVolumeCommand(s), null, s);
  for (const s of ["turn it up", "can you turn it up", "volume up", "louder", "a bit lower"]) assert.ok(parseVolumeCommand(s), s);
});
