import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseIdleScreenIntent } = require("../mac/braino-mac/idle-screen-intent.cjs");

test("asking for the screen puts it up", () => {
  for (const said of [
    "Braino, show me the idle screen",
    "put up your idle screen",
    "bring up the lock screen",
    "open the screen saver",
    "screensaver",
    "idle screen",
    "I want the lock screen",
  ]) {
    assert.equal(parseIdleScreenIntent(said)?.action, "open", said);
  }
});

test("asking for it to go takes it down", () => {
  for (const said of [
    "close the idle screen",
    "hide the lock screen",
    "get rid of the screen saver",
    "braino, leave the idle screen",
  ]) {
    assert.equal(parseIdleScreenIntent(said)?.action, "close", said);
  }
});

/* The other feature in this app that owns the word "wallpaper" sets the actual
   macOS desktop background. Nothing here may take one of those sentences. */
test("the desktop background is a different thing entirely", () => {
  for (const said of [
    "set my wallpaper to spider man",
    "change the wallpaper",
    "make this my desktop background",
    "put my old wallpaper back",
  ]) {
    assert.equal(parseIdleScreenIntent(said), null, said);
  }
});

test("talking about screens is not asking for one", () => {
  for (const said of [
    "my lock screen photo on the iPhone is nice",
    "share my screen on the call",
    "what does the screen saver on a mac normally do",
  ]) {
    const parsed = parseIdleScreenIntent(said);
    assert.equal(parsed?.action !== "open", true, said);
  }
});
