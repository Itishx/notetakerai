import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildSpotifyFocusRestoreScript,
  selectSpotifyReturnTarget,
} = require("../mac/braino-mac/spotify-focus-return.cjs");

const chrome = {
  appName: "Google Chrome",
  browserTitle: "Braino settings",
  browserUrl: "https://www.trybraino.com/settings",
  windowTitle: "Braino settings",
};

assert.deepEqual(
  selectSpotifyReturnTarget(chrome, null),
  chrome,
  "the foreground browser tab is preserved as the return target",
);
console.log("ok  preserves the foreground browser tab");

assert.deepEqual(
  selectSpotifyReturnTarget(
    { appName: "Braino Mac", windowTitle: "Braino Mac" },
    chrome,
  ),
  chrome,
  "Braino's overlay falls back to the last real foreground app",
);
console.log("ok  ignores Braino's own overlay");

assert.equal(
  selectSpotifyReturnTarget({ appName: "Spotify" }, chrome),
  null,
  "Spotify remains foreground when the command started there",
);
console.log("ok  leaves Spotify foreground when it was already active");

const restoreScript = buildSpotifyFocusRestoreScript(chrome);
assert.match(restoreScript, /application process "Google Chrome"/);
assert.match(restoreScript, /set frontmost .* to true/);
console.log("ok  restores the prior app without opening another tab");

assert.equal(buildSpotifyFocusRestoreScript(null), "");
console.log("ok  empty return targets are ignored safely");

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const runDelegate = main.slice(
  main.indexOf("async function runDelegate("),
  main.indexOf("async function routeMacDelegate"),
);
const spotifyPlay = main.slice(
  main.indexOf("async function playSpotifySongOnMac"),
  main.indexOf("// A-B music looping"),
);
const rendererDelegate = renderer.slice(
  renderer.indexOf("async function runDelegate"),
  renderer.indexOf("async function answerViaRealtimeChat"),
);
assert.ok(
  runDelegate.indexOf("fastSpotifyTrackIntent(raw)") < runDelegate.indexOf("routeMacDelegate(prompt, raw)"),
  "explicit Spotify tracks bypass fresh desktop context and voice-mode fetches",
);
assert.match(runDelegate, /setTimeout\(\(\) => fireHilReasonThinking\(raw\), 1000\)/);
assert.doesNotMatch(runDelegate, /await fireHilReasonThinking/);
assert.match(spotifyPlay, /if \(!nativeOk\) \{[\s\S]*callSpotifyFunction\("spotify-playback"/);
assert.match(spotifyPlay, /deferRestore: fastStart/);
assert.ok(
  rendererDelegate.indexOf("const delegatePromise = window.brainoMac.delegate")
    < rendererDelegate.indexOf("scheduleNotchThinking(text"),
  "renderer dispatches the command before drawing the thinking surface",
);
console.log("ok  keeps thinking, focus restore, and redundant API playback off Spotify's start path");

console.log("\n6 passed, 0 failed");
