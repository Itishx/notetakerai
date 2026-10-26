"use strict";
/* Maven (Memory And Voice ENgine), part 1: dictation only.
 *
 * Press Control+Option, talk, press again: the words are cleaned up and typed
 * where your cursor is. Lives in the menu bar. Shows a small capsule with eyes at the bottom
 * while listening. Never speaks. Audio stays in memory only.
 *
 * Pipeline (the same cloud path the Braino Mac app proved out):
 *   recorder start (+ phases every 400 ms) -> stop -> phases or full upload
 *   -> quick tidy or dictation-refine -> safety gate -> native paste
 *   (fallback: clipboard + a short note on the island). */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFile } = require("child_process");
const { promisify } = require("util");
const electron = require("electron");
const { app, BrowserWindow, Tray, Menu, nativeImage, clipboard, screen, ipcMain, shell, session, systemPreferences } = electron;
const { createOnboarding } = require(path.join(__dirname, "lib", "onboarding.cjs"));
const { createHera } = require(path.join(__dirname, "lib", "hera.cjs"));
const mavenStore = require(path.join(__dirname, "lib", "store.cjs"));
let hub = null;
function openHub() { if (!hub) { mavenStore.init(app.getPath("userData")); hub = require(path.join(__dirname, "lib", "hub.cjs")).createHub({ app, BrowserWindow, ipcMain, shell, dialog: electron.dialog, showOnboarding: () => onboarding && onboarding.show(), log }); } hub.open(); }
const { assessDictationEdit, normalizeDictationSession, spokenNumbersToDigits } = require(path.join(__dirname, "lib", "dictation.cjs"));

const execFileP = promisify(execFile);
const ROOT_DIR = path.join(__dirname, "..", "..");
const KEYS_SWIFT = path.join(__dirname, "native", "MavenKeys.swift");

/* ---------- config: same .env / .env.local approach as the Mac app ---------- */
function loadDotEnv() {
  const out = {};
  for (const dir of [ROOT_DIR, __dirname]) {
    for (const file of [".env", ".env.local"]) {
      const full = path.join(dir, file);
      if (!fs.existsSync(full)) continue;
      for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        out[match[1]] = value;
      }
    }
  }
  return out;
}
const ENV = { ...loadDotEnv(), ...process.env };
const SUPABASE_URL = String(ENV.VITE_SUPABASE_URL || ENV.SUPABASE_URL || "https://suwhgaxxdizowbyjlljj.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || ENV.VITE_SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_ANON_KEY || "";

/* ---------- logging: ~/Library/Logs/Maven/maven.log, never the words ---------- */
const LOG_DIR = path.join(os.homedir(), "Library", "Logs", "Maven");
const LOG_FILE = path.join(LOG_DIR, "maven.log");
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}
function log(event, data = {}) {
  const safe = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (/^(text|transcript|raw|prepared)$/i.test(k)) continue; // dictation content is never logged
    safe[k] = v instanceof Error ? v.message : v;
  }
  try { fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${event} ${JSON.stringify(safe)}\n`); } catch (_) {}
}

/* ---------- app shell ---------- */
app.setName("Maven");
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray = null;
let island = null;
let keys = null;
let heraInstance = null;
let quitting = false;
let onboarding = null;

function sendIsland(channel, payload) {
  if (island && !island.isDestroyed()) { try { island.webContents.send(channel, payload); } catch (_) {} }
}
function hera() {
  if (!heraInstance) heraInstance = createHera({
    BrowserWindow, session, log,
    onLevel: (v) => sendIsland("maven:level", { v }),
  });
  return heraInstance;
}

/* The Maven mark for the menu bar: two slanted bars, drawn as a template
   bitmap (black + alpha) at 2x so macOS tints it for light and dark bars. */
function trayIcon() {
  const S = 36; // 18pt at 2x
  const buf = Buffer.alloc(S * S * 4);
  const bars = [{ cx: 13, cy: 18 }, { cx: 23, cy: 18 }];
  const ang = (41 * Math.PI) / 180, cos = Math.cos(ang), sin = Math.sin(ang);
  const halfW = 3.4, halfH = 13, r = 3.4;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let a = 0;
      for (const b of bars) {
        // supersample 4x4 for soft edges
        let hit = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
          const px = x + (sx + 0.5) / 4 - b.cx, py = y + (sy + 0.5) / 4 - b.cy;
          const u = px * cos + py * sin, v = -px * sin + py * cos; // into the bar's frame
          const qx = Math.abs(u) - (halfW - r), qy = Math.abs(v) - (halfH - r);
          const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
          if (d <= 0) hit++;
        }
        // ink to light along the bar: full at the top, fading toward the bottom
        const py = y + 0.5 - b.cy, px = x + 0.5 - b.cx;
        const v = -px * sin + py * cos;
        const fade = 1 - 0.65 * Math.min(1, Math.max(0, (v + halfH) / (2 * halfH)));
        a = Math.max(a, (hit / 16) * fade);
      }
      const i = (y * S + x) * 4;
      buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = Math.round(a * 255); // BGRA
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 });
  img.setTemplateImage(true);
  return img;
}

function lastDictationPath() { return path.join(app.getPath("userData"), "last-dictation.txt"); }

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Maven");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Maven", click: () => openHub() },
    { label: "Start dictation (⌃⌥)", click: () => toggleDictation("menu") },
    { label: "Open last dictation", click: () => { const p = lastDictationPath(); if (fs.existsSync(p)) shell.openPath(p); } },
    { label: "Show onboarding again", click: () => onboarding && onboarding.show() },
    { type: "separator" },
    { label: "Quit Maven", click: () => { quitting = true; app.quit(); } },
  ]));
}

/* ---------- the island: a small capsule in one of three bottom spots ----------
   2026-10-26 (Itish): never the top, never "anywhere". Bottom-left,
   bottom-centre or bottom-right of its display. Drag it and three faint spots
   show; let go and it glides to the nearest one and stays there. */
const ISLAND_W = 150, ISLAND_H = 96;
const CAP_W = 58, CAP_H = 30, CAP_BOTTOM = 26; // capsule inside the window: centred, 14px from the bottom
const SPOT_MARGIN = 16;
const SPOTS = ["bottom-left", "bottom-centre", "bottom-right"];
const islandPosPath = () => path.join(app.getPath("userData"), "island.json");
let islandAllowed = false; // hidden until onboarding reaches "Put Maven where you like" (or is done)
function savedSpot() {
  try {
    const s = JSON.parse(fs.readFileSync(islandPosPath(), "utf8"));
    if (s && SPOTS.includes(s.spot)) return s;
  } catch (_) {}
  return { spot: "bottom-right", displayId: null };
}
function saveSpot(spot, displayId) {
  try { fs.mkdirSync(path.dirname(islandPosPath()), { recursive: true }); fs.writeFileSync(islandPosPath(), JSON.stringify({ spot, displayId })); } catch (_) {}
}
function displayById(id) { return screen.getAllDisplays().find((d) => d.id === id) || screen.getPrimaryDisplay(); }
/* The window bounds that put the capsule SPOT_MARGIN in from the work area edges. */
function spotBounds(display, spot) {
  const wa = display.workArea;
  const capY = wa.y + wa.height - SPOT_MARGIN - CAP_H;
  const capX = spot === "bottom-left" ? wa.x + SPOT_MARGIN
    : spot === "bottom-centre" ? wa.x + Math.round((wa.width - CAP_W) / 2)
    : wa.x + wa.width - SPOT_MARGIN - CAP_W;
  return { x: Math.round(capX - (ISLAND_W - CAP_W) / 2), y: Math.round(capY - (ISLAND_H - CAP_BOTTOM - CAP_H)), width: ISLAND_W, height: ISLAND_H };
}
function placeIsland() {
  if (!island || island.isDestroyed() || drag) return;
  const s = savedSpot();
  island.setBounds(spotBounds(displayById(s.displayId), s.spot));
}
let glideTimer = 0;
function glideIsland(to, ms = 180) {
  clearInterval(glideTimer);
  if (!island || island.isDestroyed()) return;
  const from = island.getBounds();
  const t0 = Date.now();
  glideTimer = setInterval(() => {
    if (!island || island.isDestroyed()) { clearInterval(glideTimer); return; }
    const k = Math.min(1, (Date.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3); // ease out
    island.setBounds({ x: Math.round(from.x + (to.x - from.x) * e), y: Math.round(from.y + (to.y - from.y) * e), width: ISLAND_W, height: ISLAND_H });
    if (k >= 1) clearInterval(glideTimer);
  }, 16);
}
function setIslandAllowed(on) {
  islandAllowed = Boolean(on);
  if (!island || island.isDestroyed()) return;
  if (islandAllowed) { placeIsland(); island.showInactive(); sendIsland("maven:state", { state: "idle" }); }
  else island.hide();
}
function createIsland() {
  island = new BrowserWindow({
    width: ISLAND_W, height: ISLAND_H, show: false, frame: false, transparent: true, resizable: false, movable: false,
    focusable: false, skipTaskbar: true, hasShadow: false, alwaysOnTop: true, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, "renderer", "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  island.setAlwaysOnTop(true, "screen-saver");
  island.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  island.setIgnoreMouseEvents(true, { forward: true }); // click-through, except the capsule (see maven:hover)
  island.loadFile(path.join(__dirname, "renderer", "island.html"));
  placeIsland();
  island.once("ready-to-show", () => { if (islandAllowed) island.showInactive(); sendIsland("maven:state", { state: "idle" }); });
  island.webContents.once("did-finish-load", () => { if (islandAllowed && !island.isVisible()) island.showInactive(); sendIsland("maven:state", { state: "idle" }); });
  island.on("closed", () => { island = null; });
}

/* The three faint target spots: a transparent, click-through window over the
   display under the cursor, shown only while dragging. */
let targets = null;
const TARGETS_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:transparent;overflow:hidden}
.s{position:absolute;width:${CAP_W + 16}px;height:${CAP_H + 16}px;border-radius:${(CAP_H + 16) / 2}px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55),0 0 0 1px rgba(0,0,0,.18);background:rgba(13,13,12,.10);transition:background .12s,box-shadow .12s}
.s.on{background:rgba(13,13,12,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.85),0 0 0 1px rgba(0,0,0,.25)}
</style></head><body><script>
window.draw=function(spots,active){document.body.innerHTML="";for(const s of spots){const d=document.createElement("div");d.className="s"+(s.name===active?" on":"");d.style.left=s.x+"px";d.style.top=s.y+"px";document.body.appendChild(d);}};
</script></body></html>`;
function ensureTargets() {
  if (targets && !targets.isDestroyed()) return targets;
  targets = new BrowserWindow({
    show: false, frame: false, transparent: true, resizable: false, movable: false, focusable: false, skipTaskbar: true,
    hasShadow: false, alwaysOnTop: true, fullscreenable: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  targets.setAlwaysOnTop(true, "screen-saver");
  targets.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  targets.setIgnoreMouseEvents(true);
  targets.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(TARGETS_HTML));
  targets.on("closed", () => { targets = null; });
  return targets;
}
function drawTargets(display, active) {
  const t = ensureTargets();
  const b = display.bounds;
  const cur = t.getBounds();
  if (cur.x !== b.x || cur.y !== b.y || cur.width !== b.width || cur.height !== b.height) t.setBounds(b);
  const spots = SPOTS.map((name) => {
    const w = spotBounds(display, name);
    return { name, x: w.x + (ISLAND_W - CAP_W) / 2 - 8 - b.x, y: w.y + (ISLAND_H - CAP_BOTTOM - CAP_H) - 8 - b.y };
  });
  const js = `window.draw && window.draw(${JSON.stringify(spots)}, ${JSON.stringify(active)})`;
  if (t.webContents.isLoading()) t.webContents.once("did-finish-load", () => t.webContents.executeJavaScript(js).catch(() => {}));
  else t.webContents.executeJavaScript(js).catch(() => {});
  if (!t.isVisible()) t.showInactive();
  if (island && !island.isDestroyed()) island.moveTop(); // the capsule stays above its targets
}
function nearestSpot(display, capCx, capCy) {
  let best = SPOTS[2], bestD = Infinity;
  for (const name of SPOTS) {
    const w = spotBounds(display, name);
    const d = Math.hypot(w.x + ISLAND_W / 2 - capCx, w.y + ISLAND_H - CAP_BOTTOM - CAP_H / 2 - capCy);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/* Manual dragging: app-region drag gives no start/end, so main moves the
   window with the cursor at ~60 fps while the button is down. */
let drag = null;
function capsuleCentre(b) { return { x: b.x + ISLAND_W / 2, y: b.y + ISLAND_H - CAP_BOTTOM - CAP_H / 2 }; }
function dragStart() {
  if (!island || island.isDestroyed() || drag) return;
  clearInterval(glideTimer);
  const p = screen.getCursorScreenPoint();
  const b = island.getBounds();
  drag = { dx: p.x - b.x, dy: p.y - b.y, startX: p.x, startY: p.y, moved: false, active: "", displayId: null, timer: 0, startedAt: Date.now() };
  island.setIgnoreMouseEvents(false);
  drag.timer = setInterval(dragTick, 16);
}
function dragTick() {
  if (!drag || !island || island.isDestroyed()) return;
  const p = screen.getCursorScreenPoint();
  if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) < 4) return; // a click, not a drag yet
  drag.moved = true;
  const x = p.x - drag.dx, y = p.y - drag.dy;
  island.setBounds({ x, y, width: ISLAND_W, height: ISLAND_H });
  const display = screen.getDisplayNearestPoint(p);
  const c = capsuleCentre({ x, y });
  const active = nearestSpot(display, c.x, c.y);
  if (active !== drag.active || display.id !== drag.displayId) {
    drag.active = active; drag.displayId = display.id;
    drawTargets(display, active);
  }
  if (Date.now() - drag.startedAt > 30000) dragEnd(); // a lost mouseup never leaves it stuck to the cursor
}
function dragEnd() {
  if (!drag) return;
  const d = drag; drag = null;
  clearInterval(d.timer);
  if (targets && !targets.isDestroyed()) targets.hide();
  if (!island || island.isDestroyed()) return;
  if (!d.moved) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const c = capsuleCentre(island.getBounds());
  const spot = nearestSpot(display, c.x, c.y);
  saveSpot(spot, display.id);
  glideIsland(spotBounds(display, spot));
  log("island.spot", { spot, display: display.id });
  if (onboarding) onboarding.placed(spot);
}
/* During onboarding's placement step: show the spots without a drag, as a hint. */
function showTargetsHint(on) {
  if (on) { const s = savedSpot(); drawTargets(displayById(s.displayId), s.spot); }
  else if (targets && !targets.isDestroyed() && !drag) targets.hide();
}

let islandHideTimer = 0;
function islandShow(state, extra = {}) {
  if (!island || island.isDestroyed()) return;
  clearTimeout(islandHideTimer);
  if (islandAllowed && !island.isVisible()) island.showInactive();
  sendIsland("maven:state", { state, ...extra });
}
function islandHide(delay = 0) {
  clearTimeout(islandHideTimer);
  // The mark stays; only the dots and notes go (back to idle).
  islandHideTimer = setTimeout(() => sendIsland("maven:state", { state: "idle" }), delay);
}
ipcMain.on("maven:hover", (_e, over) => {
  if (drag) return; // keep the mouse while dragging
  if (island && !island.isDestroyed()) island.setIgnoreMouseEvents(!over, { forward: true });
});
ipcMain.on("maven:drag", (_e, what) => { if (what === "start") dragStart(); else dragEnd(); });
ipcMain.on("maven:action", (_e, action) => {
  if (action === "cancel") stopDictation("island cancel", { discard: true });
  else if (action === "done") stopDictation("island done");
  else if (action === "hub") openHub();
});

/* ---------- key watcher ----------
   Compiled once into userData (so a launch is not a multi-second `xcrun swift`
   compile that swallows the first presses), restarted after Accessibility is
   granted (a tap made before that never receives events), and "ready" only
   once the event tap is really enabled. */
const pasteWaiters = [];
let keysReady = false;
let keysRestarting = false;
function setKeysReady(v) {
  if (keysReady === v) return;
  keysReady = v;
  log("keys.ready", { ready: v });
  if (onboarding) onboarding.setKeysReady(v);
}
async function keysBinary() {
  const prebuilt = path.join(__dirname, "native", "MavenKeys");
  if (fs.existsSync(prebuilt)) return prebuilt;
  try {
    const st = fs.statSync(KEYS_SWIFT);
    const dir = path.join(app.getPath("userData"), "bin");
    const out = path.join(dir, `MavenKeys-${Math.round(st.mtimeMs)}-${st.size}`);
    if (fs.existsSync(out)) return out;
    fs.mkdirSync(dir, { recursive: true });
    log("keys.compiling", {});
    await execFileP("/usr/bin/xcrun", ["swiftc", "-O", "-o", out, KEYS_SWIFT], { timeout: 180000 });
    return out;
  } catch (error) {
    log("keys.compile_failed", { error: String(error?.message || error).slice(0, 300) });
    return null; // fall back to `xcrun swift`
  }
}
async function startKeys() {
  if (keys || quitting) return;
  if (!fs.existsSync(KEYS_SWIFT)) { log("keys.missing", {}); return; }
  setKeysReady(false);
  const bin = await keysBinary();
  if (keys || quitting) return;
  const proc = spawn(bin || "xcrun", bin ? [] : ["swift", KEYS_SWIFT], { cwd: __dirname, stdio: ["pipe", "pipe", "pipe"] });
  keys = proc;
  let buf = "";
  proc.stdout.on("data", (chunk) => {
    buf += String(chunk || "");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop(); // a line split across chunks is kept for the next one
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t === "pasted" || t.startsWith("pasted\t")) { const w = pasteWaiters.shift(); if (w) w(t.split("\t")[1] || ""); continue; }
      if (t.startsWith("dictate-hold-")) { onChord(t.slice("dictate-hold-".length)); continue; }
      if (t === "ready") setKeysReady(true);
      log("keys.status", { line: t });
    }
  });
  proc.stderr.on("data", (c) => log("keys.stderr", { line: String(c).slice(0, 300) }));
  proc.on("error", (error) => log("keys.spawn_failed", { error }));
  proc.on("exit", (code) => {
    log("keys.exit", { code });
    if (keys === proc) keys = null;
    setKeysReady(false);
    while (pasteWaiters.length) pasteWaiters.shift()(null);
    if (quitting) return;
    if (keysRestarting) { keysRestarting = false; void startKeys(); }
    else setTimeout(() => void startKeys(), 3000);
  });
}
function restartKeys(why) {
  log("keys.restart", { why });
  if (!keys) { void startKeys(); return; }
  keysRestarting = true;
  try { keys.kill(); } catch (_) {}
}
function nativePaste(timeoutMs = 400) {
  if (!keys || keys.killed || !keys.stdin || keys.stdin.destroyed) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); };
    pasteWaiters.push(finish);
    setTimeout(() => { const i = pasteWaiters.indexOf(finish); if (i >= 0) pasteWaiters.splice(i, 1); finish(null); }, timeoutMs);
    try { keys.stdin.write("paste\n"); } catch (_) { finish(null); }
  });
}

/* ---------- dictation state ---------- */
// idle -> starting -> listening -> finishing -> idle
let phase = "idle";
let startedAt = 0;
let stopQueued = null;
let session_ = 0;

/* Hands-free: press Control+Option to start, press again to stop and paste.
   Letting go does nothing. Another key within 1.5 s of starting means the
   chord was a shortcut: the take is thrown away. */
function onChord(kind) {
  if (kind === "end") return;
  if (kind === "cancel") {
    if ((phase === "starting" || phase === "listening") && Date.now() - startedAt < 1500) stopDictation("chord was a shortcut", { discard: true });
    return;
  }
  if (kind === "start") {
    if (onboarding && onboarding.onChord()) return; // the shortcut step only checks the keys
    toggleDictation("Control+Option");
  }
}
function toggleDictation(source) {
  // A press while the last one is still pasting starts a new one; it is never ignored.
  if (phase === "idle" || phase === "finishing") void startDictation(source);
  else if (phase === "starting" || phase === "listening") stopDictation(source);
}

let phaseTimer = 0, phaseJobs = [];
async function startDictation(source) {
  phase = "starting";
  startedAt = Date.now();
  stopQueued = null;
  session_ += 1;
  islandShow("listening");
  // Wake the transcriber while you talk (an OPTIONS call: no model, no cost).
  fetch(`${SUPABASE_URL}/functions/v1/transcribe-and-notes`, { method: "OPTIONS" }).catch(() => {});
  const r = await hera().start().catch((error) => ({ ok: false, error: String(error?.message || error) }));
  if (!r?.ok) {
    log("dictation.start_failed", { error: r?.error || "" });
    phase = "idle";
    islandShow("note", { note: "Mic not available." });
    islandHide(1600);
    return;
  }
  phase = "listening";
  phaseJobs = [];
  clearInterval(phaseTimer);
  phaseTimer = setInterval(async () => {
    for (const seg of await hera().take()) phaseJobs.push(transcribePhase(seg));
  }, 400);
  log("dictation.started", { session: session_, source });
  if (stopQueued) { const q = stopQueued; stopQueued = null; stopDictation(q.reason, q.opts); }
}

function stopDictation(reason, opts = {}) {
  if (phase === "starting") { stopQueued = { reason, opts }; return; }
  if (phase !== "listening") return;
  phase = "finishing";
  islandHide(); // the moment you press, the listening state goes; the text follows
  void finishDictation(reason, Boolean(opts.discard), session_);
}

/* ---------- transcription ---------- */
async function transcribeAudio({ audioBase64, mimeType, fileName }) {
  if (!audioBase64) return { ok: false, error: "No audio." };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "Not configured." };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-and-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ mode: "lecture", audioBase64, fileName, mimeType, transcriptOnly: true, dictation: true, language: "en" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log("transcribe.failed", { status: res.status }); return { ok: false, error: `Transcription failed (${res.status}).` }; }
  const transcript = String(data?.transcript || "").trim();
  return transcript
    ? { ok: true, transcript, provider: data?.provider || "", groqMs: data?.groqMs || 0 }
    : { ok: false, error: "No speech." };
}
function transcribePhase(seg) {
  return transcribeAudio({ audioBase64: seg.wav, mimeType: "audio/wav", fileName: `maven-${seg.index}.wav` })
    .then((r) => ({ index: seg.index, ok: Boolean(r?.ok), text: String(r?.transcript || "").trim() }))
    .catch(() => ({ index: seg.index, ok: false, text: "" }));
}
async function collectPhases(audio) {
  clearInterval(phaseTimer); phaseTimer = 0;
  if (!audio?.phases) return null; // a short take: the whole recording is used
  const jobs = phaseJobs.splice(0);
  for (const seg of audio.untaken || []) jobs.push(transcribePhase(seg));
  if (audio.tail) jobs.push(transcribePhase(audio.tail));
  const results = (await Promise.all(jobs)).sort((a, b) => a.index - b.index);
  const complete = results.length === audio.phases && results.every((r, i) => r.index === i && r.ok);
  const text = results.map((r) => r.text).filter(Boolean).join(" ").trim();
  log("phases", { phases: audio.phases, results: results.length, complete, chars: text.length });
  return complete && text ? text : null;
}

/* ---------- clean-up ---------- */
/* A plain dictation (up to 60 words) needs no model. Returns the tidied line, or "". */
const NEEDS_MODEL = /\b(?:um+|uh+|er|hmm+|like|you know|i mean|actually|wait|no|scratch|sorry|or|comma|period|full stop|question mark|exclamation|new line|new paragraph|bullet|list|following|first|then|finally|steps?|percent|dot|at|underscore|rupees?|lakh|crore|thousand|hundred|am|pm|so|okay)\b|\d|@|\b(\w+) \1\b/i;
function quickTidy(raw) {
  const text = String(raw || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (!text || words.length > 60 || NEEDS_MODEL.test(text) || !/^[A-Z]/.test(text) || !/[.?!,]/.test(text)) return "";
  let out = text.replace(/\bi\b/g, "I").replace(/\bi'(m|ll|ve|d)\b/gi, (_m, x) => "I'" + x.toLowerCase());
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.?!]$/.test(out)) out += /^(?:can|could|would|will|is|are|do|does|did|what|why|how|where|when|who|which|shall|should)\b/i.test(out) ? "?" : ".";
  return out;
}
let lastRefine = {};
async function refine(raw, timeoutMs) {
  lastRefine = {};
  if (!raw || raw.length > 20000 || !SUPABASE_ANON_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dictation-refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ transcript: raw }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { log("refine.failed", { status: res.status }); return null; }
    const candidate = String(data?.formatted || "").trim();
    const a = assessDictationEdit(raw, candidate);
    lastRefine = { model: String(data?.model || ""), provider: String(data?.provider || ""), candidate, verdict: a.accepted ? "accepted" : "refused", reason: a.reason || "", coverage: a.sourceCoverage };
    if (!a.accepted) { log("refine.rejected", { reason: a.reason }); return null; }
    return candidate;
  } catch (error) {
    lastRefine = { verdict: "failed", reason: error?.name === "AbortError" ? "timeout" : "request error" };
    log("refine.fallback", { reason: lastRefine.reason });
    return null;
  } finally { clearTimeout(timer); }
}
/* The safety gate: a cleaned version is used only if it passes the edit check
   (fillers, corrections and layout allowed; invented words refused). */
function gate(raw, prepared) {
  const r = String(raw || "").trim();
  const c = String(prepared || "").trim();
  if (!c || !normalizeDictationSession([r]).trim()) return normalizeDictationSession([r]).trim();
  return (assessDictationEdit(r, c).accepted ? normalizeDictationSession([c]) : normalizeDictationSession([r])).trim();
}

/* ---------- the record of every dictation (2026-10-26, Itish) ----------
   Everything in seconds to one decimal. Printed in the terminal, and kept as
   one JSON line per dictation in userData/training/dictations.jsonl so there
   is always data to train on. Stays on this Mac. */
const sec = (ms) => `${(Math.max(0, ms || 0) / 1000).toFixed(1)}s`;
function wordDiff(a, b) {
  const words = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9₹'\s-]/g, " ").split(/\s+/).filter(Boolean);
  const A = words(a), B = words(b);
  const left = new Map(); B.forEach((w) => left.set(w, (left.get(w) || 0) + 1));
  const removed = [];
  A.forEach((w) => { if (left.get(w)) left.set(w, left.get(w) - 1); else removed.push(w); });
  const added = [];
  const pool = new Map(); A.forEach((w) => pool.set(w, (pool.get(w) || 0) + 1));
  B.forEach((w) => { if (pool.get(w)) pool.set(w, pool.get(w) - 1); else added.push(w); });
  return { removed, added, kept: A.length ? (A.length - removed.length) / A.length : 1, words: A.length };
}
function printDictation(d) {
  const r = lastRefine || {};
  const diff = wordDiff(d.raw, d.finalText);
  const used = d.finalText !== normalizeDictationSession([d.raw]).trim();
  const cleanLine = d.quick ? "skipped (plain line, already clean)"
    : r.verdict === "accepted" ? `${r.provider || "?"}${r.model ? " " + r.model : ""}, ${sec(d.cleanMs)}`
    : r.verdict === "refused" ? `refused by the safety check (${r.reason}), raw words pasted`
    : r.verdict === "failed" ? `${r.reason}, raw words pasted`
    : "not run";
  const lines = [
    "",
    `[MAVEN] ── ${sec(d.audio.ms)} spoken · ${d.pasted.ok ? `pasted into ${d.pasted.app || "the front app"}` : "copied (no text box)"} · total ${sec(d.totalMs)}`,
    `  heard   (${d.heard.provider || "?"}, ${sec(d.textMs)}): "${d.raw}"`,
    `  cleanup ${cleanLine}`,
    used ? `  final   "${d.finalText}"` : "  final   same as heard",
    `  changes removed ${diff.removed.length ? diff.removed.map((w) => `"${w}"`).join(", ") : "nothing"}${diff.added.length ? ` · added ${diff.added.map((w) => `"${w}"`).join(", ")}` : ""}`,
    `  kept    ${Math.round(diff.kept * 100)}% of ${diff.words} words${d.audio.phases ? ` · ${d.audio.phases} phases` : ""}`,
    `  time    text ${sec(d.textMs)} · clean ${d.quick ? "0.0s" : sec(d.cleanMs)} · paste ${sec(d.pasteMs)} · total ${sec(d.totalMs)}`,
  ];
  console.log(lines.join("\n"));
  try {
    const dir = path.join(app.getPath("userData"), "training");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "dictations.jsonl"), JSON.stringify({
      at: new Date().toISOString(), spokenSec: +(d.audio.ms / 1000).toFixed(1), phases: d.audio.phases || 0, heardBy: d.heard.provider || "",
      raw: d.raw, cleanup: d.quick ? "skipped" : r.verdict || "none", cleanupModel: r.model || "", candidate: r.candidate || "", refusedBecause: r.verdict === "refused" ? r.reason : "",
      final: d.finalText, removed: diff.removed, added: diff.added, keptPct: Math.round(diff.kept * 100),
      textSec: +(d.textMs / 1000).toFixed(1), cleanSec: +(d.cleanMs / 1000).toFixed(1), pasteSec: +(d.pasteMs / 1000).toFixed(1), totalSec: +(d.totalMs / 1000).toFixed(1),
      app: d.pasted.app || "", pasted: Boolean(d.pasted.ok),
    }) + "\n");
  } catch (_) {}
}

/* ---------- typing it in ---------- */
async function insertText(text) {
  const previous = clipboard.readText();
  clipboard.writeText(text);
  const front = await nativePaste();
  if (front !== null) {
    await new Promise((r) => setTimeout(r, 140));
    // The words stay on the clipboard as well: with no text box under the cursor nothing is lost.
    return { ok: true, app: front, native: true, previous };
  }
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", 'tell application "System Events"\nset n to name of first application process whose frontmost is true\nkey code 9 using {command down}\nreturn n\nend tell'], { timeout: 4000 });
    return { ok: true, app: String(stdout || "").trim(), native: false, previous };
  } catch (error) {
    log("paste.failed", { error: String(error?.message || error).slice(0, 200) });
    return { ok: false, previous };
  }
}

async function finishDictation(reason, discard, mySession = session_) {
  const t0 = Date.now();
  clearInterval(phaseTimer); phaseTimer = 0;
  const audio = await hera().stop();
  if (discard) {
    phaseJobs = [];
    log("dictation.discarded", { reason });
    if (session_ === mySession) phase = "idle";
    return;
  }
  try {
    if (!audio?.audioBase64) { log("dictation.empty", { reason, error: audio?.error || "" }); islandHide(); return; }
    const phased = await collectPhases(audio);
    const heard = phased && phased.length >= Math.max(12, (audio.ms || 0) / 120)
      ? { ok: true, transcript: phased, provider: "phases" }
      : await transcribeAudio({ audioBase64: audio.audioBase64, mimeType: audio.mimeType, fileName: "maven.webm" }).catch((e) => ({ ok: false, error: String(e?.message || e) }));
    const textMs = Date.now() - t0;
    if (!heard.ok || !heard.transcript) { log("dictation.nothing_heard", { reason, error: heard.error || "" }); islandShow("note", { note: "Heard nothing." }); islandHide(1400); return; }
    const raw = spokenNumbersToDigits(heard.transcript.trim());
    const quick = quickTidy(raw);
    const c0 = Date.now();
    const cleaned = quick || await refine(raw, Math.min(7000, 2500 + raw.length * 8));
    const cleanMs = Date.now() - c0;
    mavenStore.init(app.getPath("userData"));
    const finalText = mavenStore.expandSnippet(mavenStore.applyDictionary(gate(raw, cleaned) || raw));
    const p0 = Date.now();
    const pasted = await insertText(finalText);
    const pasteMs = Date.now() - p0;
    try { fs.writeFileSync(lastDictationPath(), `${new Date().toISOString()}\nRAW: ${raw}\nFINAL: ${finalText}\n`); } catch (_) {}
    printDictation({ audio, heard, raw, quick, cleaned, finalText, pasted, textMs, cleanMs, pasteMs, totalMs: Date.now() - t0 });
    log("dictation.done", { reason, provider: heard.provider || "", recordedMs: audio.ms, textMs, cleanMs, pasteMs, totalMs: Date.now() - t0, chars: finalText.length, cleaned: Boolean(cleaned), pasted: pasted.ok, app: pasted.app || "" });
    if (session_ === mySession) {
      if (pasted.ok) { islandShow("done"); islandHide(700); } // a quick happy squint
      else { islandShow("note", { note: "Copied. No box." }); islandHide(2200); }
    }
  } catch (error) {
    log("dictation.failed", { error: String(error?.message || error) });
    islandHide();
  } finally {
    // Only if no new dictation started meanwhile.
    if (session_ === mySession) phase = "idle";
  }
}

/* ---------- lifecycle ---------- */
app.on("second-instance", () => { if (app.isReady()) openHub(); });
app.on("activate", () => { if (app.isReady()) openHub(); });
app.on("window-all-closed", (e) => { if (!quitting) e.preventDefault?.(); });
app.on("before-quit", () => {
  quitting = true;
  try { keys && keys.kill(); } catch (_) {}
  try { targets && !targets.isDestroyed() && targets.destroy(); } catch (_) {}
  try { heraInstance && heraInstance.destroy(); } catch (_) {}
});
app.whenReady().then(() => {
  if (app.dock) app.dock.hide();
  buildTray();
  createIsland();
  onboarding = createOnboarding({
    app, BrowserWindow, ipcMain, systemPreferences, shell, session, log,
    keysReady: () => keysReady,
    onAccessibilityGranted: () => restartKeys("accessibility granted"),
    onPlaceStep: (on) => {
      if (on) { saveSpot("bottom-right", screen.getPrimaryDisplay().id); setIslandAllowed(true); }
      showTargetsHint(on);
    },
    onClosed: () => { showTargetsHint(false); setIslandAllowed(true); }, // finished or closed early: always shown after
  });
  if (onboarding.isDone()) setIslandAllowed(true);
  else onboarding.show();
  void startKeys();
  screen.on("display-metrics-changed", placeIsland);
  screen.on("display-added", placeIsland);
  screen.on("display-removed", placeIsland);
  log("maven.ready", { hasKey: Boolean(SUPABASE_ANON_KEY) });
});

module.exports = { quickTidy, gate, trayIcon };
