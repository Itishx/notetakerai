import assert from "node:assert/strict";
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

console.log("\n5 passed, 0 failed");
