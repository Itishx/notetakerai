import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");

/* Sixty seconds in front of investors. */

test("nothing in the minute is generated", () => {
  /* Every word is written in PITCH. A model call inside this minute is a chance
     for him to say something nobody has read, and that risk buys nothing. */
  assert.match(main, /const PITCH = \{/);
  assert.match(main, /Just pitched Braino at Mesa/);
  for (const line of ["hello:", "claim:", "live:", "notLinked:", "close:"]) {
    assert.ok(main.includes(line), `PITCH.lines is missing ${line}`);
  }
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.doesNotMatch(body, /understand\(|answerViaRealtimeChat|runDelegate|hil-/);
});

/* A bare double-modifier can fire while you are typing, and this is the one
   gesture that must never go off by accident. */
test("the trigger cannot misfire", () => {
  assert.match(main, /globalShortcut\.register\("CommandOrControl\+Shift\+P"/);
  assert.match(main, /Not Shift twice/);
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
  assert.match(body, /finally \{[\s\S]{0,200}classList\.remove\("nf-think-complete"\)/);
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
  assert.ok(body.indexOf('skitStep?.("prewarm")') < body.indexOf("speak(lines.hello"), "music is woken first");
  assert.match(body, /void window\.brainoMac\.skitStep\?\.\("play"\)/);
  assert.match(body, /skitPerformMoonwalk\(11000\)/);
});
