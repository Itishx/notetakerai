import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseMediaControlIntent,
  parseNowPlayingIntent,
  parseVolumeCommand,
  applyVolumeCommand,
  speakableMediaTitle,
} = require("../mac/braino-mac/media-control.cjs");
const { parseInterruptIntent } = require("../mac/braino-mac/interrupt-intent.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

/* All three failures of 2026-09-17 were the same mistake: Spotify was assumed
   while a YouTube video was the thing making noise. */
test("stopping the sound is about the sound, not about Spotify", () => {
  assert.deepEqual(parseMediaControlIntent("Braino please stop the video playing on YouTube."), { action: "pause", target: "browser" });
  assert.deepEqual(parseMediaControlIntent("pause the song"), { action: "pause", target: "any" });
  assert.deepEqual(parseMediaControlIntent("stop whatever is playing"), { action: "pause", target: "any" });
  assert.deepEqual(parseMediaControlIntent("mute it"), { action: "mute", target: "any" });
  assert.deepEqual(parseMediaControlIntent("unmute the video"), { action: "unmute", target: "browser" });
  assert.deepEqual(parseMediaControlIntent("next song"), { action: "next", target: "any" });
  assert.deepEqual(parseMediaControlIntent("resume the music"), { action: "play", target: "any" });
  assert.deepEqual(parseMediaControlIntent("pause spotify"), { action: "pause", target: "spotify" });
});

test("jobs, recordings and songs by name are not media controls", () => {
  for (const said of [
    "stop the task", "stop listening", "stop the recording", "stop the timer",
    "play Billie Jean", "play something by Tame Impala", "open youtube", "what did you do",
  ]) {
    assert.equal(parseMediaControlIntent(said), null, said);
  }
  // And the stop-the-task parser leaves the media ones alone.
  assert.equal(parseInterruptIntent("stop the video playing on YouTube"), null);
  assert.deepEqual(parseInterruptIntent("stop the task")?.action, "abort");
});

/* "reduce the volume by 50%" turned 57 into 6: fifty POINTS off, not half. */
test("a volume command means what a person means", () => {
  const cmd = (said) => parseVolumeCommand(said);
  assert.deepEqual(cmd("reduce the volume by 50%"), { mode: "percent", value: 50, direction: -1, target: "any" });
  assert.equal(applyVolumeCommand(cmd("reduce the volume by 50%"), 57), 29);
  assert.equal(applyVolumeCommand(cmd("increase the volume by 50 percent"), 6), 9);
  assert.equal(applyVolumeCommand(cmd("turn it down by 20"), 57), 37);
  assert.equal(applyVolumeCommand(cmd("turn the volume down"), 57), 37);
  assert.equal(applyVolumeCommand(cmd("turn it down a bit"), 57), 47);
  assert.equal(applyVolumeCommand(cmd("turn it down a lot"), 57), 27);
  assert.equal(applyVolumeCommand(cmd("set the volume to 40"), 57), 40);
  assert.equal(applyVolumeCommand(cmd("volume 65%"), 10), 65);
  assert.equal(applyVolumeCommand(cmd("make it 30 percent"), 10), 30);
  assert.equal(applyVolumeCommand(cmd("full volume"), 10), 100);
  assert.equal(applyVolumeCommand(cmd("mute the volume"), 60), 0);
  // Never out of range, and never compounding off a remembered number: the
  // caller always passes the volume the thing is actually at.
  assert.equal(applyVolumeCommand(cmd("turn it down"), 5), 0);
  assert.equal(applyVolumeCommand(cmd("turn it up"), 95), 100);
  assert.equal(applyVolumeCommand(cmd("reduce the volume by 50%"), 0), 0);
  for (const said of ["stop the video", "open youtube", "how loud was the crowd"]) {
    assert.equal(cmd(said), null, said);
  }
});

test("a tab title is said the way a person would say it", () => {
  assert.equal(speakableMediaTitle("(5418) Tame Impala - Loser (Theatre Version) |🎧Use Headphones🎧 - YouTube"), "Tame Impala, Loser");
  assert.equal(speakableMediaTitle("Stranger Things | Netflix"), "Stranger Things");
  assert.equal(speakableMediaTitle(""), "");
});

test("what is playing is a question about everything, not about Spotify", () => {
  assert.deepEqual(parseNowPlayingIntent("what's playing?"), { target: "any" });
  assert.deepEqual(parseNowPlayingIntent("what song is this"), { target: "any" });
  assert.equal(parseNowPlayingIntent("what did you do"), null);
});

/* The doing half: it has to ask the Mac, act, and then look again. */
test("the sound is found, acted on, and checked", () => {
  // Asked before the thinking loop, which took 53 seconds and gave up.
  const routing = main.slice(main.indexOf("const mediaIntent = parseMediaControlIntent(raw);"));
  assert.ok(main.indexOf("const mediaIntent = parseMediaControlIntent(raw);") < main.indexOf("if (macHilEnabled() && macWantsTheBrain(raw)) {"));
  assert.match(routing.slice(0, 1200), /return controlPlayingMedia\(mediaIntent\.action, mediaIntent\.target\);/);
  assert.match(routing.slice(0, 1600), /const volumeCommand = parseVolumeCommand\(raw\);[\s\S]{0,400}return setPlayingMediaVolume\(volumeCommand\);/);
  // Spotify and the browsers are asked at the same time, and only browsers
  // that are actually open are asked at all.
  const resolve = main.slice(main.indexOf("async function resolveAudioSources("));
  assert.match(resolve.slice(0, 1200), /await Promise\.all\(\[\s*wantSpotify \? readSpotifyMacState/);
  assert.match(main, /async function runningBrowsers\(\) \{[\s\S]{0,600}get name of every application process/);
  // The separator is not the word "tab": inside a Chrome tell block it is a class.
  assert.match(main, /const MEDIA_FIELD_SEP = "\\u0001";/);
  assert.match(main, /set out to out & wi & SEP & ti & SEP & r & SEP & ttl & SEP & u & linefeed/);
  assert.doesNotMatch(main, /out & wi & tab & ti/);
  // Claimed only after looking again.
  const control = main.slice(main.indexOf("async function controlPlayingMedia("));
  assert.match(control.slice(0, 4000), /const still = \(await runBrowserMediaScript\(source\.app, MEDIA_FIND_JS\)\)/);
  assert.match(control.slice(0, 4600), /if \(acted\.length && !still\.length\) done\.push\(source\.label\);\s*else failed\.push\(source\.label\);/);
  assert.match(main, /return \{ ok: false, say: `I could not stop \$\{joinLabels\(failed\)\}\.` \};/);
  assert.match(control.slice(0, 3000), /return \{ ok: true, nothingPlaying: true, say: "Nothing is playing\." \};/);
  // Volume is computed from what the thing is actually at, then read back.
  const volume = main.slice(main.indexOf("async function setPlayingMediaVolume("));
  assert.match(volume.slice(0, 2400), /const next = applyVolumeCommand\(command, current\);/);
  assert.match(volume.slice(0, 2400), /const after = \(await runBrowserMediaScript\(source\.app, MEDIA_FIND_JS\)\)/);
});

test("the loop and the stop word get the same hands", () => {
  assert.match(main, /media_control: \(a\) => controlPlayingMedia\(/);
  assert.match(main, /media_volume: \(a\) => setPlayingMediaVolume\(/);
  assert.match(main, /now_playing: \(\) => describePlayingMedia\(\),/);
  assert.match(main, /ipcMain\.handle\("braino-mac:media-control"/);
  const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");
  assert.match(preload, /mediaControl: \(payload\) => ipcRenderer\.invoke\("braino-mac:media-control", payload\)/);
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const nothing = renderer.slice(renderer.indexOf("async function nothingToStop("));
  assert.match(nothing.slice(0, 1200), /const media = await window\.brainoMac\.mediaControl\?\.\(\{ action: "pause", target: "any" \}\)/);
  assert.match(nothing.slice(0, 1200), /if \(media\?\.ok && !media\.nothingPlaying\)/);
});
