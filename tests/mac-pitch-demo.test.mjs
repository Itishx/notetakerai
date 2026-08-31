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
  for (const line of ["hello:", "claim:", "writing:", "posting:", "live:", "proof:", "notLinked:", "closeSetup:", "closeGo:"]) {
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

/* He opens the page himself. A demo where a human drives the browser is a demo
   of a human driving a browser. */
test("he opens the page, and only one thing navigates", () => {
  assert.match(main, /ipcMain\.handle\("braino-mac:pitch-open"/);
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /pitchOpen\?\.\(\{ where: "dashboard" \}\)/);
  /* The page takes the room to the post. Two things navigating the same tab
     is a race, so this app must not also be doing it. */
  assert.doesNotMatch(body, /where: "profile"/);
  const modal = read("../src/components/XPitchModal.tsx");
  assert.match(modal, /status\/\$\{payload\.xPostId\}/);
});

/* The visible half is on the page, not in the notch. From the back of a room a
   notch moving reads as nothing happening, which is how the first version of
   this failed in front of a real audience. */
test("the writing happens where the room can see it", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.doesNotMatch(body, /renderThinkingCanvas|openNotchThinking/);
  const modal = read("../src/components/XPitchModal.tsx");
  assert.match(modal, /Just pitched Braino at Mesa/);
  /* Five to eight lines, so it reads as a post rather than a paragraph. */
  const post = modal.slice(modal.indexOf("export const PITCH_POST"), modal.indexOf('].join("\\n")'));
  const written = (post.match(/^\s*"[^"]+",\s*$/gm) || []).length;
  assert.ok(written >= 5 && written <= 8, `post should be 5 to 8 lines, got ${written}`);
});

/* He presses his own button. A demo where a human has to click is a demo of a
   human clicking, and the green landing is the thing the room remembers. */
test("he posts it himself, and the button goes green", () => {
  const modal = read("../src/components/XPitchModal.tsx");
  const css = read("../src/components/x-pitch-modal.css");
  /* Writing, then his own press, then the publish. In that order. */
  assert.match(modal, /setPhase\("ready"\)[\s\S]{0,200}setPhase\("pressing"\)[\s\S]{0,200}publishRef\.current\(\)/);
  /* Nothing waits on a human: the only clickable state is a failed retry. */
  assert.match(modal, /disabled=\{phase !== "failed"\}/);
  assert.match(css, /\.xpm-post-btn\.is-pressing/);
  assert.match(css, /\.xpm-post-btn\.is-posted \{[\s\S]{0,200}#17a86c/);
  assert.match(css, /@keyframes xpm-ring/);
});

/* Claiming a post that did not go out, on stage, in front of people who can
   check, is the worst failure available here. */
test("he only claims it went if it went", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /const ok = Boolean\(published\?\.ok\);/);
  assert.match(body, /if \(ok\) \{[\s\S]{0,200}lines\.live/);
  assert.match(body, /\} else \{[\s\S]{0,120}lines\.notLinked/);
});

/* The Mac used to publish. It does not any more: the page writes the post where
   the room can read it and publishes when a human presses yes. A path in this
   app that posts to X on its own would be a loaded gun on a hotkey. */
test("this app can no longer post to X by itself", () => {
  assert.doesNotMatch(main, /braino-mac:pitch-post/);
  assert.doesNotMatch(read("../mac/braino-mac/preload.cjs"), /pitchPost/);
  /* What it does instead is watch for the post the page made. */
  assert.match(main, /ipcMain\.handle\("braino-mac:pitch-await-post"/);
  assert.match(main, /status=eq\.published/);
});

/* He waits on the post existing rather than on a countdown, so the line after
   it lands on the thing it describes. */
test("he waits for the post to exist, not for a countdown", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.ok(body.indexOf("lines.posting") < body.indexOf("pitchAwaitPost"), "he says it before he waits");
  assert.match(body, /await window\.brainoMac\.pitchAwaitPost\?\.\(\{ rehearse \}\)/);
});

/* A long sentence is cut into chunks that can lose their tail, and starting the
   next line cancels whatever is still playing. Short lines, spoken one at a
   time with a beat between, is what stops him eating his own words. */
test("his lines are short, and spoken one at a time", () => {
  assert.match(renderer, /async function pitchSay\(mine, lines\)[\s\S]{0,400}for \(const line of list\)/);
  assert.match(renderer, /await speak\(line\);[\s\S]{0,80}await pitchWait\(/);
  const block = main.slice(main.indexOf("  lines: {"), main.indexOf("  rehearse:"));
  for (const line of block.match(/"[^"]{12,}"/g) || []) {
    assert.ok(line.length < 110, `a line long enough to get cut: ${line}`);
  }
});

/* It can be practised without burning the post, which can only go out once. */
test("it can be rehearsed", () => {
  assert.match(main, /BRAINO_PITCH_REHEARSE/);
  /* Rehearsing opens the page in a mode that will not publish. */
  assert.match(main, /dashboardRehearse: "https:\/\/trybraino\.com\/x\?pitch=rehearse"/);
  assert.match(main, /PITCH\.rehearse\(\) \? PITCH\.dashboardRehearse : PITCH\.dashboard/);
  /* And the wait resolves instead of hanging on a post that will never come. */
  const handler = main.slice(main.indexOf('ipcMain.handle("braino-mac:pitch-await-post"'));
  assert.match(handler.slice(0, 500), /if \(payload\?\.rehearse\)[\s\S]{0,400}rehearsed: true/);
  /* The page half has the same switch, and it is the half that publishes. */
  const modal = read("../src/components/XPitchModal.tsx");
  assert.match(modal, /if \(rehearse\) \{/);
  assert.ok(modal.indexOf("if (rehearse) {") < modal.indexOf("x_queue_items"), "rehearsal returns before it queues anything");
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
