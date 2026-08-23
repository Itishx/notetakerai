"use strict";

// The teleprompter: a script the founder can read while presenting, that the
// people watching the screen share never see.
//
// One window, two modes. Compose drops under the notch, takes focus, and is an
// ordinary visible panel — you are pasting into it, so it has to be clickable
// and it does not matter who sees it yet. Prompt mode turns the same window
// into the read-along overlay: content-protected, movable, resizable, and gone
// from any capture.
//
// setContentProtection is the whole feature. On macOS it sets
// NSWindowSharingNone, so the window is excluded from screen recording and
// screen sharing at the window-server level rather than by hiding it from a
// particular app. Zoom, Meet, QuickTime and Screenshot all miss it equally.

const path = require("path");
const { BrowserWindow, screen } = require("electron");

const PAGE = path.join(__dirname, "renderer", "teleprompter.html");

const COMPOSE = { width: 720, height: 420 };
const PROMPT = { width: 560, height: 300 };

let win = null;
let mode = null;          // "compose" | "prompt"
let lastPromptBounds = null;
let log = () => {};

function isLive() {
  return Boolean(win && !win.isDestroyed());
}

// Top-centre of whichever display the pointer is on, a little below the menu
// bar so it reads as the notch opening rather than a window appearing.
function composeBounds() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  return {
    width: COMPOSE.width,
    height: COMPOSE.height,
    x: Math.round(area.x + (area.width - COMPOSE.width) / 2),
    y: Math.round(area.y + 12),
  };
}

function defaultPromptBounds() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  return {
    width: PROMPT.width,
    height: PROMPT.height,
    x: Math.round(area.x + (area.width - PROMPT.width) / 2),
    y: Math.round(area.y + area.height - PROMPT.height - 90),
  };
}

function build() {
  const b = composeBounds();
  win = new BrowserWindow({
    ...b,
    // A panel joins fullscreen Spaces, which is where a demo actually happens.
    // A normal window would vanish the moment the founder goes fullscreen.
    type: "panel",
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    minWidth: 320,
    minHeight: 140,
    title: "Braino Teleprompter",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  win.setAlwaysOnTop(true, "screen-saver", 1);
  win.on("closed", () => { win = null; mode = null; });
  return win.loadFile(PAGE);
}

async function open(options = {}) {
  log = typeof options.log === "function" ? options.log : log;
  if (!isLive()) await build();

  mode = "compose";
  win.setContentProtection(false);   // you are pasting into it; it is yours to see
  win.setBounds(composeBounds());
  win.setResizable(false);
  win.setFocusable(true);
  win.showInactive();
  win.focus();
  win.webContents.send("braino-mac:teleprompter-mode", { mode: "compose" });
  log("teleprompter.compose.open", {});
  return { ok: true, mode };
}

// Compose is done: the same window becomes the overlay nobody else can see.
function present(script) {
  if (!isLive()) return { ok: false, reason: "no_window" };
  const text = String(script || "").trim();
  if (!text) return { ok: false, reason: "empty" };

  mode = "prompt";
  win.setBounds(lastPromptBounds || defaultPromptBounds());
  win.setResizable(true);
  // Focusable stays true so the founder can still scroll and drag it. It is
  // invisible to capture, not to them.
  win.setContentProtection(true);
  win.webContents.send("braino-mac:teleprompter-mode", { mode: "prompt", script: text });
  win.showInactive();
  log("teleprompter.present", { chars: text.length });
  return { ok: true, mode, chars: text.length };
}

function close() {
  if (!isLive()) return { ok: true };
  try { lastPromptBounds = mode === "prompt" ? win.getBounds() : lastPromptBounds; } catch (_) {}
  try { win.setContentProtection(false); } catch (_) {}
  win.close();
  win = null;
  mode = null;
  log("teleprompter.close", {});
  return { ok: true };
}

function state() {
  return { open: isLive(), mode };
}

module.exports = { open, present, close, state, isLive };
