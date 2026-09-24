import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Mesa syncs by itself, in Braino's own session, and says so when the login
   expires. Before: Chrome-only, and six silent days after a 401 on 2026-09-18. */
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs");
const html = read("renderer/dashboard.html");
const js = read("renderer/dashboard.js");
const preload = read("preload.cjs");

test("his own persistent session, a hidden window, Chrome only as a manual fallback", () => {
  assert.match(main, /const MESA_PARTITION = "persist:mesa-nexus";/);
  assert.match(main, /new BrowserWindow\(\{ show: false,[^\n]*partition: MESA_PARTITION/);
  assert.match(main, /if \(!out\.ok && !background\) \{/);
});

test("daily by itself: launch, every half hour, wake and unlock, if over 20 hours", () => {
  assert.match(main, /const MESA_AUTO_SYNC_AFTER_MS = 20 \* 3600 \* 1000;/);
  assert.match(main, /startMesaAutoSync\(\);/);
  assert.match(main, /powerMonitor\.on\("resume"/);
  assert.match(main, /powerMonitor\.on\("unlock-screen"/);
});

test("an expired login is said once a day, never silently", () => {
  assert.match(main, /function markMesaLoginExpired\(\)/);
  assert.match(main, /Your Mesa login expired\. Open Braino Settings, then Mesa, to reconnect\./);
});

test("Settings has a Mesa page with connect, sync and assignments", () => {
  assert.match(html, /<section class="bd-view" data-view="mesa">/);
  assert.match(html, /id="mesa-connect"/);
  assert.match(preload, /mesaConnect: \(\) => ipcRenderer\.invoke\("braino-mac:mesa-connect"\)/);
  assert.match(js, /mesa: \(\) => loadMesa\("state"\),/);
  assert.match(main, /ipcMain\.handle\("braino-mac:mesa-sync"/);
});

test("attendance and the rest use his own Mesa login, and ride the daily sync", () => {
  assert.match(main, /async function syncNexusEverything\(options = \{\}\)/);
  assert.match(main, /let out = await runInMesaSession\(js, 45000\);/);
  assert.match(main, /const rest = await syncNexusEverything\(\{ background: true \}\)/);
});

test("a Google Doc with Drive disconnected opens the sign-in instead of stopping", () => {
  assert.match(main, /async function startGoogleDriveConnect\(authToken, userId\)/);
  assert.match(main, /I opened the Google sign-in in Chrome\. Approve it once, then ask me again/);
});
