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

/* First launch, tied together (2026-10-10). */
const app = read("renderer/app.js");
test("a new person who signs in goes straight into setup, not the old full-screen cover", () => {
  assert.match(main, /setTimeout\(\(\) => maybeStartSetup\("signed-in"\), 1500\);/);
  assert.match(main, /setTimeout\(\(\) => maybeStartSetup\("startup"\), 9000\);/);
  assert.match(main, /firstRun: process\.env\.BRAINO_OLD_FIRST_RUN === "1" && loadFirstRun\(\)/);
});

test("the notch says each step's line while the window shows it", () => {
  assert.match(js, /api\.setupNotch\?\.\(/);
  assert.match(preload, /setupNotch: \(text, ms\) => ipcRenderer\.invoke\("braino-mac:setup-notch"/);
  assert.match(read("renderer/braino-mac.js"), /onSetupNotch\?\.\(\(payload\) => \{ if \(payload\?\.text\) nfShowTransient/);
});

test("Allow asks macOS for real and the row turns green by itself", () => {
  assert.match(main, /systemPreferences\.askForMediaAccess\("microphone"\)/);
  assert.match(main, /systemPreferences\.isTrustedAccessibilityClient\(true\)/);
  assert.match(js, /STEPS\[at\]\?\.kind === "permissions"\) void checkPermissions\(\); \}, 1000\)/);
});

test("try me waits for the first real thing said to him", () => {
  assert.match(main, /setupWindow\.webContents\.send\("braino-mac:setup-heard"/);
  assert.match(js, /api\.onSetupHeard\?\.\(/);
});

test("both windows are white, and home counts only real activity", () => {
  assert.match(read("renderer/setup.html"), /href="white\.css"/);
  assert.match(read("renderer/app.html"), /href="white\.css"/);
  assert.match(app, /need: \["snap", "activity", "mems"\]/);
});
