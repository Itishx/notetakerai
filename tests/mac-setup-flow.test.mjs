import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Companion setup: double-click Braino, "Set him up", a split window with his
   notebook filling in live. */
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs");
const js = read("renderer/setup.js");
const index = read("renderer/index.html");
const preload = read("preload.cjs");

test("it opens from his menu", () => {
  assert.match(index, /id="braino-setup-open"[^>]*>Set him up</);
  assert.match(read("renderer/braino-mac.js"), /window\.brainoMac\.setupOpen\?\.\(\)/);
  assert.match(preload, /setupOpen: \(\) => ipcRenderer\.invoke\("braino-mac:setup-open"\)/);
});

test("the notebook refreshes live and every answer is saved at once", () => {
  assert.match(js, /setInterval\(\(\) => \{ if \(!document\.hidden\) void refresh\(\); \}, 3000\);/);
  assert.match(js, /await api\.setupSave\?\.\(patch\)/);
  assert.match(main, /ipcMain\.handle\("braino-mac:setup-snapshot", async \(\) => setupSnapshot\(\)\);/);
});

test("answers become memory, replaced rather than duplicated, and settings apply", () => {
  assert.match(main, /source=eq\.onboarding`, \{ method: "DELETE"/);
  assert.match(main, /source: "onboarding", status: "active"/);
  assert.match(main, /if \(typeof answers\.memoryOn === "boolean"\) setActivityPaused\(!answers\.memoryOn\);/);
});

test("his lines have no dashes", () => {
  assert.doesNotMatch(js, /[—–]/);
});
