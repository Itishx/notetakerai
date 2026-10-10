// 2026-10-03: a Mac Mini opened apple.com instead of the India store, and
// "what is taking up space" set the volume to 100%.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parseVolumeCommand } = require("../mac/braino-mac/media-control.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const localizeUrl = Function(main.slice(main.indexOf("function localizeUrl"), main.indexOf("\nasync function openChromeUrl")) + ";return localizeUrl")();

test("sites open in your country's version", () => {
  assert.equal(localizeUrl("https://www.apple.com/mac-mini/", "IN"), "https://www.apple.com/in/mac-mini/");
  assert.equal(localizeUrl("https://www.amazon.com/s?k=mouse", "IN"), "https://www.amazon.in/s?k=mouse");
  assert.equal(localizeUrl("https://www.apple.com/in/", "IN"), "https://www.apple.com/in/");
  assert.equal(localizeUrl("https://www.apple.com/", "US"), "https://www.apple.com/");
  assert.match(main, /async function openChromeUrl\(url\) \{\n  url = localizeUrl\(url\);/);
});

test("disk space is not a volume command; turn it down still is", () => {
  for (const t of ["What is taking up space on my MacBook right now", "how low is my battery"]) assert.equal(parseVolumeCommand(t), null, t);
  for (const t of ["can you turn it down please", "turn it up", "make it quieter", "volume 40"]) assert.ok(parseVolumeCommand(t), t);
});
