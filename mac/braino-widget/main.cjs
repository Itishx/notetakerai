"use strict";

/* Braino at the edge of the screen, counting down to the sixteenth of October.
 *
 * Its own app rather than a window inside Braino, deliberately. Braino is three
 * weeks from launch and the rule this month is that nothing new goes near him;
 * a widget that has to be running all day is exactly the kind of thing that
 * would take him down with it at four in the morning. This one knows nothing
 * about him and cannot.
 *
 *   npm run widget
 *
 * A transparent window pinned to the middle of the right edge. Almost all of it
 * is nothing: a sliver of Braino leaning in past the edge, and the numbers that
 * come out of him when he is clicked. Because it sits on top of real work all
 * day, the window is click-through everywhere except the sliver itself, so the
 * only pixels it can ever steal a click from are the ones you can see. */

const { app, BrowserWindow, screen, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

/* Braino, read here rather than in the preload: a preload runs sandboxed and
   has no node:fs, and a file:// page may not fetch the file beside it. */
let BRAINO_SVG = "";
try { BRAINO_SVG = fs.readFileSync(path.join(__dirname, "braino.svg"), "utf8"); } catch (_) {}

/* Sized for the open state and never resized: growing the window as the panel
   unfurls would animate in steps the compositor can see. The window stays put
   and the drawing inside it moves. */
const W = 400;
const H = 150;

function edgeBounds() {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: area.x + area.width - W,
    y: Math.round(area.y + (area.height - H) / 2),
    width: W,
    height: H,
  };
}

function createWindow() {
  const win = new BrowserWindow({
    ...edgeBounds(),
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    /* It is a reminder, not a thing to work in: it never takes the keyboard
       away from whatever is actually being typed into. */
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "floating", 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  /* Transparent to the pointer by default, but still told where the pointer is,
     so the page can say when it is over Braino and claim the clicks back.
     While it holds the clicks it also watches the real cursor, because the one
     unacceptable failure here is a transparent window left holding a rectangle
     of someone's screen after the pointer has gone. A page that misses its own
     mouseleave cannot cause that: main checks the cursor itself and lets go. */
  let watch = null;
  const release = () => {
    clearInterval(watch); watch = null;
    if (win.isDestroyed()) return;
    win.setIgnoreMouseEvents(true, { forward: true });
    win.webContents.send("widget:cold");
  };
  release();

  ipcMain.on("widget:hot", (_e, rect) => {
    if (win.isDestroyed() || !rect) return;
    win.setIgnoreMouseEvents(false);
    clearInterval(watch);
    watch = setInterval(() => {
      if (win.isDestroyed()) return clearInterval(watch);
      const p = screen.getCursorScreenPoint();
      const b = win.getBounds();
      const x = p.x - b.x, y = p.y - b.y;
      const pad = 4;
      const inside = x >= rect.x - pad && x <= rect.x + rect.w + pad
                  && y >= rect.y - pad && y <= rect.y + rect.h + pad;
      if (!inside) release();
    }, 160);
  });

  win.on("closed", () => clearInterval(watch));

  win.loadFile(path.join(__dirname, "index.html"));

  /* Plug in a monitor, change the resolution, and the right edge moves. */
  const reseat = () => { if (!win.isDestroyed()) win.setBounds(edgeBounds()); };
  screen.on("display-metrics-changed", reseat);
  screen.on("display-added", reseat);
  screen.on("display-removed", reseat);

  ipcMain.on("widget:quit", () => app.quit());
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle("widget:braino", () => BRAINO_SVG);
  app.dock?.hide?.();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => app.quit());
