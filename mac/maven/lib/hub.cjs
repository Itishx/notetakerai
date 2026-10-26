"use strict";
/* The Hub: Maven's main window (home, dictionary, snippets, settings). */
const path = require("path");
const store = require("./store.cjs");
const { MAVEN_JOBS } = require("./jobs.cjs");

function createHub({ app, BrowserWindow, ipcMain, shell, dialog, showOnboarding, log = () => {} }) {
  store.init(app.getPath("userData"));
  let win = null, unwatch = null;
  const send = (ch, v) => { if (win && !win.isDestroyed()) win.webContents.send(ch, v); };
  const fromHub = (e) => win && !win.isDestroyed() && e.sender === win.webContents;
  const handle = (ch, fn) => ipcMain.handle(ch, (e, ...a) => (fromHub(e) ? fn(...a) : null));

  handle("hub:history", () => ({ items: store.getHistory(), stats: store.stats(store.getHistory()) }));
  handle("hub:correction", (c) => store.saveCorrection(c));
  handle("hub:dict:get", () => store.getDictionary());
  handle("hub:dict:save", (l) => store.saveDictionary(l));
  handle("hub:snip:get", () => store.getSnippets());
  handle("hub:snip:save", (l) => store.saveSnippets(l));
  handle("hub:settings:get", () => ({
    shortcut: "⌃⌥", doShortcut: "fn ⌃", microphone: "System default", version: app.getVersion(),
    launchAtLogin: Boolean(app.getLoginItemSettings().openAtLogin),
  }));
  handle("hub:settings:set", (k, v) => { if (k === "launchAtLogin") app.setLoginItemSettings({ openAtLogin: Boolean(v) }); return true; });
  handle("hub:details:get", () => store.getDetails());
  handle("hub:details:save", (d) => store.saveDetails(d));
  handle("hub:openData", () => shell.openPath(store.dataDir()));
  handle("hub:deleteHistory", async () => {
    const r = await dialog.showMessageBox(win, { type: "warning", buttons: ["Delete", "Cancel"], defaultId: 1, cancelId: 1, message: "Delete all history?", detail: "Every past dictation will be removed from this Mac. This cannot be undone." });
    if (r.response !== 0) return false;
    store.deleteHistory();
    send("hub:history", { items: [], stats: store.stats([]) });
    return true;
  });
  handle("hub:jobs", () => MAVEN_JOBS);
  handle("hub:onboarding", () => { showOnboarding && showOnboarding(); });

  function open(page) {
    if (win && !win.isDestroyed()) { if (page) send("hub:page", page); if (win.isMinimized()) win.restore(); win.show(); win.focus(); return win; }
    win = new BrowserWindow({
      width: 980, height: 680, minWidth: 760, minHeight: 520, show: false, title: "Maven",
      titleBarStyle: "hiddenInset", backgroundColor: "#f4f2ec",
      webPreferences: { preload: path.join(__dirname, "..", "renderer", "hub-preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (e) => e.preventDefault());
    win.loadFile(path.join(__dirname, "..", "renderer", "hub.html"));
    if (page) win.webContents.once("did-finish-load", () => send("hub:page", page));
    win.once("ready-to-show", () => { if (app.dock) app.dock.show(); win.show(); win.focus(); });
    unwatch = store.watchHistory((items) => send("hub:history", { items, stats: store.stats(items) }));
    win.on("closed", () => { try { unwatch && unwatch(); } catch (_) {} unwatch = null; win = null; if (app.dock) app.dock.hide(); });
    log("hub.open", {});
    return win;
  }
  return { open };
}

module.exports = { createHub };
