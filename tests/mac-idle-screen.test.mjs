import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const surface = read("../mac/braino-mac/renderer/wallpaper.js");
const css = read("../mac/braino-mac/renderer/wallpaper.css");
const html = read("../mac/braino-mac/renderer/index.html");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
const preload = read("../mac/braino-mac/preload.cjs");

const surfaceBlock = main.slice(
  main.indexOf("function setIdleScreenSurface"),
  main.indexOf("function openIdleScreen"),
);

test("the screen is drawn in the app, not fetched", () => {
  assert.doesNotMatch(surfaceBlock, /new BrowserWindow/);
  assert.doesNotMatch(surfaceBlock, /loadURL/);
  assert.match(surfaceBlock, /sendToRenderer\("braino-mac:idle-screen"/);
  /* The overlay is deliberately unfocusable so it never steals the caret. A
     screen you click into has to take that back, and hand it straight back. */
  assert.match(surfaceBlock, /dockWindow\.setFocusable\(next\)/);
  assert.match(surfaceBlock, /dockWindow\.setIgnoreMouseEvents\(!next/);
});

test("it ships with the app", () => {
  assert.match(html, /wallpaper\.js/);
  assert.match(html, /wallpaper\.css/);
  assert.match(surface, /window\.__brainoWallpaper/);
  assert.doesNotMatch(surface, /fetch\(|XMLHttpRequest/);
  /* The clock is the whole picture, so its font has to actually be there. */
  assert.match(html, /Instrument\+Serif/);
  assert.match(css, /Instrument Serif/);
});

/* This covers every display and floats over full-screen apps. A screen you
   cannot get out of is worse than no screen at all. */
test("there is always a way out", () => {
  assert.match(main, /globalShortcut\.register\("Escape", \(\) => closeIdleScreen/);
  assert.match(renderer, /addEventListener\("keydown"[\s\S]{0,200}idleScreenClosed/);
  assert.match(surface, /addEventListener\("click"/);
});

test("one key opens it, and the film moved off that key", () => {
  const swift = main.slice(main.indexOf('if (trimmed === "double-shift")'), main.indexOf('if (trimmed === "double-space")'));
  assert.match(swift, /toggleIdleScreen/);
  assert.doesNotMatch(swift, /launch-demo-start/);
  assert.match(main, /globalShortcut\.register\("CommandOrControl\+Shift\+L"/);
});

/* He is allowed to put a screen over an empty desk, never over work. */
test("it never covers something that is running", () => {
  const watch = main.slice(main.indexOf("function idleScreenWouldInterrupt"), main.indexOf("async function runIdleScreenShortcut"));
  assert.match(watch, /brainoOsOpen/);
  assert.match(watch, /localDictationActive/);
  assert.match(watch, /meetingState/);
  assert.match(watch, /idleScreenWouldInterrupt\(\)\) return/);
  /* Only the one that came up by itself goes away by itself. */
  assert.match(watch, /idleScreenReason === "idle" && idle < 4/);
});

test("both dashboards can edit the row under the clock", () => {
  assert.match(preload, /idleScreenSettings/);
  assert.match(main, /ipcMain\.handle\("braino-mac:idle-screen-settings"/);
  const dashboard = read("../mac/braino-mac/renderer/dashboard.js");
  assert.match(dashboard, /loadIdleEditor/);
  const web = read("../src/components/WallpaperShortcutsCard.tsx");
  assert.match(web, /Shift twice/);
});

/* An empty row is a bad edit, not a preference. */
test("a bad save never leaves the clock sitting on nothing", () => {
  const store = main.slice(main.indexOf("function readIdleScreenSettings"), main.indexOf("let idleScreenOpen"));
  assert.match(store, /rows\.length \? rows : fallback\.shortcuts/);
  assert.match(store, /IDLE_SCREEN_DEFAULT_SHORTCUTS/);
});

/* Eleven looks were drawn and only one of them can be up at a time. */
test("the looks take turns, without rebuilding the row underneath", () => {
  /* How often is yours to set now, so the number lives in the settings rather
     than in the surface. */
  assert.match(surface, /cycleMs = Math\.max\(3000, payload\.cycleSeconds \* 1000\)/);
  assert.match(surface, /setInterval\([\s\S]{0,160}paintLook\(\)[\s\S]{0,40}cycleMs/);
  /* Rebuilding the buttons on every turn would refetch each favicon and flash
     the whole row, so a turn repaints the look and restyles what is there. */
  const turn = surface.slice(surface.indexOf("function paintLook"), surface.indexOf("function styleActions"));
  assert.doesNotMatch(turn, /renderActions\(/);
  assert.match(turn, /styleActions\(look\)/);
  /* And it stops when the screen goes, rather than turning over an empty page
     for as long as the app is running. */
  assert.match(surface, /lookTimer\) \{ window\.clearInterval\(lookTimer\)/);
  /* Holding one look is a rotation of one, not a special case. */
  assert.match(main, /if \(settings\.mode === "one"\)/);
  assert.match(surface, /if \(rotation\.length < 2\) return/);

  /* The bench on the site turns at whatever the same setting says. */
  const web = read("../src/pages/Wallpaper.tsx");
  assert.match(web, /settings\.cycleSeconds \* 1000/);
});
