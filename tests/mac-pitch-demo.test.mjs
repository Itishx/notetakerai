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
  for (const line of ["hello:", "claim:", "writing:", "posting:", "live:", "proof:", "closeSetup:", "closeGo:"]) {
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
  /* It ends on the post that is actually on the account. */
  assert.match(modal, /const PITCH_POST_URL = "https:\/\/x\.com\/[^"]+\/status\/\d+";/);
  assert.match(modal, /window\.location\.href = PITCH_POST_URL;/);
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
  assert.match(modal, /setPhase\("ready"\)[\s\S]{0,240}setPhase\("pressing"\)[\s\S]{0,240}setPhase\("posting"\)/);
  /* Nothing on it waits on a human. There is no state a person can click. */
  assert.match(modal, /<button[\s\S]{0,200}\n\s*disabled\n/);
  assert.match(css, /\.xpm-post-btn\.is-pressing/);
  assert.match(css, /\.xpm-post-btn\.is-posted \{[\s\S]{0,200}#17a86c/);
  assert.match(css, /@keyframes xpm-ring/);
});

/* Nothing listens while a script is running. A live microphone in a room full
   of people is a stray sentence waiting to derail the one minute that counts.
   And he has to leave the notch before he dances, or the music plays over a
   mascot nobody can see. */
test("mic off, and he comes out of the notch to dance", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /stopRealtimeVoice\(\{ reason: "pitch-demo" \}\)/);
  assert.ok(body.indexOf("stopRealtimeVoice") < body.indexOf("lines.hello"), "the mic goes before he speaks");
  assert.match(body, /if \(walkerHome\) await setWalkerHomeState\(false\)/);
  assert.ok(
    body.indexOf("setWalkerHomeState(false)") < body.indexOf("skitPerformMoonwalk"),
    "he is out before the moonwalk starts",
  );
  /* The hat is part of the trick. */
  assert.match(renderer, /__sbwk_fedora__[\s\S]{0,60}"inline"/);
});

/* Claiming a post that did not go out, on stage, in front of people who can
   check, is the worst failure available here. */
test("the script cannot stall, whatever the network did", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  /* Nothing in the run may wait on an answer that might never come. This used
     to poll the database for up to two minutes when a post did not go out, and
     when that happened the demo stopped dead in a room and never reached the
     moonwalk. */
  assert.doesNotMatch(body, /pitchAwaitPost/);
  assert.doesNotMatch(body, /lines\.notLinked/);
  /* Everything from the press onwards runs on a fixed beat. */
  assert.ok(body.indexOf("lines.posting") < body.indexOf("lines.live"), "he says it, then reports it");
  assert.match(body, /await pitchWait\(4200\)[\s\S]{0,200}lines\.live/);
  /* The moonwalk is the last thing and nothing conditional sits in front of it. */
  const tail = body.slice(body.indexOf("lines.live"));
  assert.doesNotMatch(tail, /\bif \(ok\)|\belse \{/);
  assert.match(tail, /skitPerformMoonwalk\(11000\)/);
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
/* The moonwalk gives up silently if he is in the notch, behind Chrome, or
   wearing a character that has no moonwalk legs. Each one looks identical from
   the room: the music plays and nothing happens. All three are checked. */
test("everything the moonwalk needs is arranged before it starts", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  const before = body.slice(0, body.indexOf("skitPerformMoonwalk"));
  assert.match(before, /if \(walkerHome\) await setWalkerHomeState\(false\)/);
  assert.match(before, /pitchFront\?\.\(\)/);
  assert.match(before, /remountWalker\("braino"\)/);
  assert.match(main, /ipcMain\.handle\("braino-mac:pitch-front"[\s\S]{0,320}raiseDockWindow/);
  /* And the hat, which is the whole point of the trick. */
  assert.match(renderer, /__sbwk_fedora__[\s\S]{0,60}"inline"/);
});

/* A long sentence is cut into chunks that can lose their tail, and starting the
   next line cancels whatever is still playing. Short lines, spoken one at a
   time with a beat between, is what stops him eating his own words. */
test("his lines are short, and spoken in one breath", () => {
  /* One trip to the voice per group. Every extra call is a round trip of dead
     air, and `speaking` drops to false in the gap between them, which is the
     signal that lets him wander off mid-sentence. */
  assert.match(renderer, /async function pitchSay\(mine, lines\)[\s\S]{0,400}\.join\(" "\)/);
  assert.match(renderer, /await speak\(said\);/);
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
  /* Nothing on the page publishes any more, so there is nothing a rehearsal
     needs to hold back and the two runs are identical. */
  const modal = read("../src/components/XPitchModal.tsx");
  assert.doesNotMatch(modal, /x_queue_items|publish_now/);
});

/* It is a demo. It gets one run, in front of a room, and a red box saying his
   own policy held the post back is not something anyone needs to watch from a
   stage. The button lands green on a clock the network cannot touch. */
/* It is a demo. It gets one run, in front of a room, and nothing on screen may
   depend on a network call landing in that moment. */
test("nothing on screen can fail in front of the room", () => {
  const modal = read("../src/components/XPitchModal.tsx");
  assert.doesNotMatch(modal, /Try again|"failed"/);
  /* The whole run is a fixed clock with nothing awaited inside it. */
  assert.match(modal, /setPhase\("posting"\);\s*\n\s*await wait\(POSTING_MS\);[\s\S]{0,120}setPhase\("posted"\)/);
  /* And it does not post. The words are already live on the account, so
     publishing again would put the same post out twice, in front of an
     audience, on the profile we are about to open. */
  assert.doesNotMatch(modal, /x_queue_items|publish_now|brainox-schedule/);
});

/* Spotify takes seconds to wake and the moonwalk is at the end, so it is asked
   for at the start. If it will not play, he moonwalks in silence rather than
   stalling the last ten seconds. */
test("the moonwalk does not depend on the music", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  /* Spotify is not touched until the end. Prewarming does not quietly warm
     anything, it opens Spotify and brings it to the front, so the demo used to
     begin by throwing a music player over the screen and talking on top of it. */
  assert.doesNotMatch(body, /skitStep\?\.\("prewarm"\)/);
  assert.match(body, /skitStep\?\.\("play"\)/);
  assert.match(body, /await skitPerformMoonwalk\(11000\)/);
  /* He is raised after the music, not before it: the play step pulls Spotify
     forward, so raising him first puts him back underneath it. */
  assert.ok(body.indexOf('skitStep?.("play")') < body.indexOf("pitchFront"), "music first, then he comes to the front");
});

/* His voice follows two settings that have nothing to do with the pitch: the
   character, which survives restarts, and a voice persona, which is whatever
   impression he was last asked to do. Either one left alone means he introduces
   himself as Braino in somebody else's voice, in front of the room. */
test("the demo speaks as Braino whatever he was set to", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.ok(body.indexOf('macSetCharacter("braino"') < body.indexOf("lines.hello"), "forced before he speaks");
  assert.match(body, /macVoicePersonaKey = null;/);
  /* And put back exactly as they were, without announcing it: an announcement
     is him saying "Hi, I'm Brainelle" straight after the moonwalk. */
  assert.match(body, /macVoicePersonaKey = personaBefore;/);
  assert.match(body, /macSetCharacter\(characterBefore, \{ announce: false \}\)/);
});

/* The one that made the moonwalk impossible.
 *
 * The glide loop asks every frame whether it should keep going, and it used to
 * ask only whether the SKIT was running. The pitch demo does not set that flag,
 * so the first frame found it false, ended the moonwalk and put the rig back:
 * the hat appeared and vanished inside a sixtieth of a second, every single
 * time, and the room saw whatever else was animating him.
 *
 * If this ever reads one flag again, the trick silently stops working. */
test("the moonwalk keeps going for whoever started it", () => {
  const loop = renderer.slice(renderer.indexOf("function skitPerformMoonwalk"));
  assert.match(loop.slice(0, 3200), /now - start < durationMs && \(skitRunning \|\| pitchRunning\)/);
});

/* skitMoonwalk is what locks him facing forward while he glides backwards. It
   is the difference between a moonwalk and a man walking backwards, it is set
   by the caller rather than by the moonwalk itself, and the pitch demo has to
   set it exactly the way the working skit does. */
test("he faces forward while he glides", () => {
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.ok(body.indexOf("skitMoonwalk = true") < body.indexOf("skitPerformMoonwalk"), "set before the glide");
  assert.match(body, /finally \{\s*\n\s*skitMoonwalk = false;/);
  /* And the same two lines the skit runs to stop the music system stealing
     him back the moment his own cue starts playing. */
  assert.match(body, /musicSessionId \+= 1;/);
  assert.match(body, /walkerAutoHomedByMusic = false;/);
  assert.match(renderer, /walkerFlip\.style\.transform = [^;]*skitMoonwalk/);
});

/* Billie Jean is his own cue, and the music-reaction system used to hear it,
   walk him home into the notch and start the generic dance instead. The trick
   ran invisibly behind a mascot that had just been sent away. */
test("nothing else gets to move him while the script runs", () => {
  assert.match(renderer, /async function reactToMusicStart[\s\S]{0,900}if \(pitchRunning\) return;/);
  assert.match(renderer, /shouldHoldAttention = [^;]*\|\| pitchRunning/);
  const fn = renderer.slice(renderer.indexOf("async function runPitchDemo"));
  const body2 = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body2, /stopMusicDance\(\)/);
  /* Awaited, so the guards stay up for the whole eleven seconds rather than
     handing him back mid-glide. */
  assert.match(body2, /await skitPerformMoonwalk/);
});
