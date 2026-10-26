"use strict";
/* First-run onboarding: one centred window, one step per screen (modelled on
   Wispr Flow's Mac onboarding). Completion lives in userData/onboarding.json. */
const fs = require("fs");
const path = require("path");

function createOnboarding({ app, BrowserWindow, ipcMain, systemPreferences, shell, session, log = () => {} }) {
  let win = null;
  let step = "";
  const statePath = () => path.join(app.getPath("userData"), "onboarding.json");

  function isDone() {
    try { return Boolean(JSON.parse(fs.readFileSync(statePath(), "utf8")).completed); } catch (_) { return false; }
  }
  function markDone() {
    try { fs.mkdirSync(path.dirname(statePath()), { recursive: true }); fs.writeFileSync(statePath(), JSON.stringify({ completed: true, at: new Date().toISOString() })); } catch (_) {}
  }
  function perms() {
    let accessibility = false, microphone = false;
    try { accessibility = systemPreferences.isTrustedAccessibilityClient(false); } catch (_) {}
    try { microphone = systemPreferences.getMediaAccessStatus("microphone") === "granted"; } catch (_) {}
    return { accessibility, microphone };
  }
  function send(channel, payload) {
    if (win && !win.isDestroyed()) { try { win.webContents.send(channel, payload); } catch (_) {} }
  }

  ipcMain.handle("onboarding:perms", () => perms());
  ipcMain.handle("onboarding:request", async (_e, which) => {
    if (which === "accessibility") {
      try { systemPreferences.isTrustedAccessibilityClient(true); } catch (_) {}
      try { await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"); } catch (_) {}
    } else if (which === "microphone") {
      try { await systemPreferences.askForMediaAccess("microphone"); } catch (_) {}
    }
    return perms();
  });
  ipcMain.on("onboarding:step", (_e, s) => { step = String(s || ""); log("onboarding.step", { step }); });
  ipcMain.on("onboarding:finish", () => { markDone(); log("onboarding.done", {}); if (win && !win.isDestroyed()) win.close(); });

  function show() {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); return; }
    const partition = "persist:maven-onboarding";
    try { session.fromPartition(partition).setPermissionRequestHandler((_wc, p, cb) => cb(p === "media")); } catch (_) {}
    win = new BrowserWindow({
      width: 760, height: 560, resizable: false, fullscreenable: false, minimizable: false, center: true, show: false,
      titleBarStyle: "hiddenInset", backgroundColor: "#f4f2ec", title: "Welcome to Maven",
      webPreferences: { preload: path.join(__dirname, "..", "renderer", "onboarding-preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, partition },
    });
    win.loadFile(path.join(__dirname, "..", "renderer", "onboarding.html"));
    win.once("ready-to-show", () => { try { app.focus({ steal: true }); } catch (_) {} win.show(); win.focus(); });
    win.on("closed", () => { win = null; step = ""; });
  }

  /* Called by main for every Control+Option press. Returns true when the
     shortcut step swallowed it (no dictation starts on that screen). */
  function onChord() {
    if (!win || win.isDestroyed()) return false;
    send("onboarding:chord", {});
    return step === "shortcut";
  }

  return { show, isDone, onChord, isOpen: () => Boolean(win && !win.isDestroyed()) };
}

module.exports = { createOnboarding };
