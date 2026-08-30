import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");

/* Seventy-five seconds in front of investors, with Braino doing the talking. */

test("nothing in the minute is generated", () => {
  /* Every word is written in PITCH. A model call inside this minute is a chance
     for him to say something nobody has read, and that risk buys nothing. */
  assert.match(main, /const PITCH = \{/);
  assert.match(main, /Just pitched Braino at Mesa/);
  for (const line of ["hello:", "open:", "posting:", "live:", "notLinked:", "closeSetup:", "closeGo:"]) {
    assert.ok(main.includes(line), `PITCH.lines is missing ${line}`);
  }
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.doesNotMatch(body, /understand\(|answerViaRealtimeChat|runDelegate|hil-/);
});

/* Shift twice is the trigger, which is a real risk: it can fire while you are
   typing capitals, and this gesture publishes to a live account. What keeps it
   safe is that publishing is the last thing it does and the rehearse flag runs
   the whole thing without it. Both of those have to stay true. */
test("Shift twice runs the pitch, and can be practised without publishing", () => {
  assert.match(main, /if \(trimmed === "double-shift"\)[\s\S]{0,500}startPitchDemo/);
  /* The idle screen lost the gesture, so nothing else answers double Shift. */
  assert.doesNotMatch(main, /if \(trimmed === "double-shift"\)[\s\S]{0,500}toggleIdleScreen/);
  /* The key combination still works, for a room whose keyboard fights the
     bare double-modifier. */
  assert.match(main, /globalShortcut\.register\("CommandOrControl\+Shift\+P"/);
  /* One way in, so the two triggers cannot drift apart. */
  assert.match(main, /function startPitchDemo\(source\)/);
  assert.match(main, /BRAINO_PITCH_REHEARSE/);
});

/* Pressing it again restarts rather than stacking. Rehearsing means running it
   over and over, and a second run landing on a first is two voices at once. */
test("a restart stops the run already talking", () => {
  assert.match(main, /sendToRenderer\("braino-mac:pitch-stop"/);
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /const mine = \+\+pitchGeneration;/);
  assert.ok(body.split("pitchStale(mine)").length > 6, "every step checks whether it is still the live run");
  assert.match(renderer, /onPitchStop\?\.\(\(\) => \{[\s\S]{0,140}pitchGeneration \+= 1/);
});

/* He opens both pages himself. A demo where a human drives the browser is a
   demo of a human driving a browser. */
test("he opens the pages himself, and only shows X when the post really went", () => {
  assert.match(main, /ipcMain\.handle\("braino-mac:pitch-open"/);
  /* The profile comes from the connected account. A hardcoded handle survives
     until the account changes, and then he opens a stranger's profile. */
  assert.match(main, /x_connections\?user_identifier=eq\./);
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.ok(
    body.indexOf('pitchOpen?.({ where: "dashboard" })') < body.indexOf('pitchOpen?.({ where: "profile" })'),
    "the dashboard comes before the profile",
  );
  /* Opening X to show a post that is not there is worse than saying nothing. */
  assert.match(body, /if \(ok\) \{[\s\S]{0,240}pitchOpen\?\.\(\{ where: "profile" \}\)/);
});

/* Claiming a post that did not go out, on stage, in front of people who can
   check, is the worst failure available here. */
test("green only when it actually went", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /const ok = Boolean\(sent\?\.ok\);/);
  assert.match(body, /if \(ok\) \{[\s\S]{0,240}nf-think-complete/);
  /* And the honest line when it did not. */
  assert.match(body, /lines\.notLinked/);
  /* The green class never survives the run. */
  assert.match(body, /finally \{[\s\S]{0,300}classList\.remove\("nf-think-complete"\)/);
});

/* It can be practised without burning the post, which can only go out once. */
test("it can be rehearsed", () => {
  assert.match(main, /BRAINO_PITCH_REHEARSE/);
  const handler = main.slice(main.indexOf('ipcMain.handle("braino-mac:pitch-post"'));
  assert.match(handler.slice(0, 500), /if \(payload\?\.rehearse\)[\s\S]{0,140}rehearsed: true/);
});

/* Spotify takes seconds to wake and the moonwalk is at the end, so it is asked
   for at the start. If it will not play, he moonwalks in silence rather than
   stalling the last ten seconds. */
test("the moonwalk does not depend on the music", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.ok(body.indexOf('skitStep?.("prewarm")') < body.indexOf("lines.hello"), "music is woken first");
  assert.match(body, /void window\.brainoMac\.skitStep\?\.\("play"\)/);
  assert.match(body, /skitPerformMoonwalk\(11000\)/);
});
