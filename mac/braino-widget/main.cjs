"use strict";

/* The countdown on the desktop, until the sixteenth of October.
 *
 * Its own app rather than a window inside Braino, deliberately. Braino is three
 * weeks from launch and the rule this month is that nothing new goes near him;
 * a widget that has to be running all day is exactly the kind of thing that
 * would take him down with it at four in the morning. This one knows nothing
 * about him and cannot.
 *
 *   npm run widget         it sits on the wallpaper, behind everything
 *   npm run widget:place   it floats on top so you can drag and size it
 *
 * Two commands because of one macOS rule: a window at the desktop level gets no
 * mouse events at all, so the thing you can see on your wallpaper is the thing
 * you cannot grab. Placing it is therefore its own short-lived mode. Put it
 * where you want it, quit, and the desktop copy opens exactly there. */

const { app, BrowserWindow, screen, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

/* Placing mode: on top, grabbable, temporary. Anything else is the widget. */
const PLACING = process.env.BRAINO_WIDGET_PLACE === "1";

/* Where it was last time. A widget that opens in the middle of the screen
   every morning is a widget you close every morning. */
let statePath = "";
function readBounds() {
  try {
    const saved = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const { x, y, width, height } = saved || {};
    if ([x, y, width, height].every((n) => Number.isFinite(n))) {
      /* Only if that place still exists: a window remembered onto a monitor
         that has since been unplugged is a window you cannot find. */
      const fits = screen.getAllDisplays().some((d) => {
        const b = d.workArea;
        return x + width > b.x && x < b.x + b.width && y + height > b.y && y < b.y + b.height;
      });
      if (fits) return { x, y, width, height };
    }
  } catch (_) {}
  return null;
}

let saveTimer = null;
function rememberBounds(win) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(statePath, JSON.stringify(win.getBounds())); } catch (_) {}
  }, 400);
}

function createWindow() {
  const fallback = (() => {
    const area = screen.getPrimaryDisplay().workArea;
    return { width: 340, height: 250, x: area.x + area.width - 380, y: area.y + 60 };
  })();

  const win = new BrowserWindow({
    ...fallback,
    ...(readBounds() || {}),
    minWidth: 220,
    minHeight: 150,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: PLACING,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    /* On the wallpaper, under every real window, where a widget belongs: you
       see it when you get back to the desktop and never before. macOS gives
       such a window no mouse events, which is why placing it is a mode. */
    ...(PLACING ? {} : { type: "desktop" }),
    /* While placing, it is a reminder being moved, not a thing to work in: it
       should never take the keyboard from whatever is being typed into. */
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (PLACING) win.setAlwaysOnTop(true, "floating", 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: PLACING });
  win.loadFile(path.join(__dirname, "index.html"), PLACING ? { search: "place=1" } : {});

  win.on("move", () => rememberBounds(win));
  win.on("resize", () => rememberBounds(win));

  /* Focusable is off so it never steals the caret, which also means the window
     cannot be clicked to drag. So the renderer reports where the pointer went
     down and main moves the window itself. */
  let dragFrom = null;
  ipcMain.on("widget:drag-start", (_e, offset) => {
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    dragFrom = { dx: point.x - bounds.x, dy: point.y - bounds.y, offset };
  });
  ipcMain.on("widget:drag-move", () => {
    if (!dragFrom) return;
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    win.setBounds({ ...bounds, x: point.x - dragFrom.dx, y: point.y - dragFrom.dy });
  });
  ipcMain.on("widget:drag-end", () => { dragFrom = null; });

  /* The corner, same idea: the renderer says the pointer is down on it and
     main resizes from the cursor. */
  let sizeFrom = null;
  ipcMain.on("widget:size-start", () => {
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    sizeFrom = { x: point.x, y: point.y, width: bounds.width, height: bounds.height };
  });
  ipcMain.on("widget:size-move", () => {
    if (!sizeFrom) return;
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    win.setBounds({
      ...bounds,
      width: Math.max(220, Math.round(sizeFrom.width + (point.x - sizeFrom.x))),
      height: Math.max(150, Math.round(sizeFrom.height + (point.y - sizeFrom.y))),
    });
  });
  ipcMain.on("widget:size-end", () => { sizeFrom = null; });

  ipcMain.on("widget:quit", () => app.quit());
  return win;
}

app.whenReady().then(() => {
  statePath = path.join(app.getPath("userData"), "braino-widget-bounds.json");
  app.dock?.hide?.();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* It is the only window, and closing it is how you stop it. */
app.on("window-all-closed", () => app.quit());
