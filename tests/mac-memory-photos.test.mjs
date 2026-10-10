import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Photos come from Apple Photos only when "Today's photos" is pressed; the
// window itself only ever reads the saved copies.
const js = fs.readFileSync(new URL("../mac/braino-mac/renderer/memory.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const loadAll = js.slice(js.indexOf("async function loadAll("), js.indexOf("\n}\n", js.indexOf("async function loadAll(")));

test("opening the window never asks Photos", () => {
  assert.match(loadAll, /memoryPhotos\?\.\(/);
  assert.doesNotMatch(loadAll, /memoryPhotosFetch/);
});

test("Photos is only asked from the button", () => {
  assert.match(js, /el\("add-photos"\)\.addEventListener\("click"[\s\S]*?memoryPhotosFetch/);
});

test("at most 8 photos, and Photos is quit if it was not already open", () => {
  assert.match(main, /if pickN > 8 then set pickN to 8/);
  assert.match(main, /if not wasRunning then tell application "Photos" to quit/);
});
