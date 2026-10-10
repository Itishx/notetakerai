// Tool bugs from the 30-day log review (5 Oct): the brain chose right, the hand did wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const media = require("../mac/braino-mac/media-control.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("lower the volume lowers it (relative was ignored and 100 stayed 100)", () => {
  assert.equal(media.applyVolumeCommand({ mode: "relative", value: 15, direction: -1 }, 100), 85);
  assert.equal(media.applyVolumeCommand({ mode: "relative", value: 15, direction: 1 }, 15), 30);
});

test("Spotify volume is retried once and never reported done when it did not change", () => {
  assert.match(main, /if \(actual !== null && Math\.abs\(Number\(actual\) - next\) > 3\) \{/);
  assert.match(main, /Spotify didn't take the change; it's still at/);
});

test("disk full is total minus free", () => {
  assert.match(main, /pctUsed: Math\.round\(\(\(totalKb - availKb\) \/ totalKb\) \* 100\),/);
});

test("the phone-number question is a question, expires, and lets the next command through", () => {
  assert.match(main, /stage: "phone_number", ttlMs: 45000/);
  assert.match(main, /return \{ ok: true, asks: true, say: "What's your phone number\?/);
  assert.match(main, /if \(number\.length < 7\) return null;/);
});

test("close the app means the front app; close A and B closes both", () => {
  assert.match(main, /if \(\/\^\(\?:app\|apps\|application\|it\|this\|that\|this app\|that app\)\$\/i\.test\(bare\)\)/);
  assert.match(main, /const several = bare\.split\(/);
});

test("contacts load before the same-name check on a cold start", () => {
  assert.match(main, /if \(!contactsCache\) await refreshContactsIfStale\(\)\.catch\(\(\) => false\);/);
});

test("tab switch says what it did, and a miss lists the tabs", () => {
  assert.match(main, /say: `Switched to \$\{/);
  assert.match(main, /I see \$\{some\.join\(", "\)\}\. Which one\?/);
});
