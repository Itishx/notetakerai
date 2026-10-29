"use strict";
/* Maven (Memory And Voice ENgine): Write (dictation) and Do (one small job).
 *
 * Press Control+Option, talk, press again: the words are cleaned up and typed
 * where your cursor is. Press fn+Control instead and ask for one job ("open
 * YouTube", "tell Neha I'm late"): Maven works out the one action, does it, and
 * anything that sends or fills waits for your yes in the island. Lives in the menu bar. Shows a small capsule with eyes at the bottom
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
function openHub(page) { if (!hub) { mavenStore.init(app.getPath("userData")); hub = require(path.join(__dirname, "lib", "hub.cjs")).createHub({ app, BrowserWindow, ipcMain, shell, dialog: electron.dialog, showOnboarding: () => onboarding && onboarding.show(), log }); } hub.open(page); }
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
    { label: "Ask Maven to do something (fn⌃)", click: () => toggleDictation("menu", "do") },
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
/* 2026-10-27: the window is a fixed, generous 380x240 so the island can grow
   into its card without the window ever resizing mid-animation. The capsule
   sits at the window's bottom edge, on the side matching its spot (left spot:
   left side), so the card grows up and toward the screen centre. Everything
   outside the visible shape is click-through. */
const ISLAND_W = 560, ISLAND_H = 320; // wide enough for the Bar layout (2026-10-28)
const CAP_W = 58, CAP_H = 30, CAP_BOTTOM = 26, CAP_SIDE = 26; // capsule inside the window
let anchorSpot = "bottom-right"; // which side of the window the capsule is drawn on
const capOffsetX = (spot) => spot === "bottom-left" ? CAP_SIDE : spot === "bottom-centre" ? (ISLAND_W - CAP_W) / 2 : ISLAND_W - CAP_SIDE - CAP_W;
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
/* Where the capsule itself goes: SPOT_MARGIN in from the work area edges. */
function capRect(display, spot) {
  const wa = display.workArea;
  const y = wa.y + wa.height - SPOT_MARGIN - CAP_H;
  const x = spot === "bottom-left" ? wa.x + SPOT_MARGIN
    : spot === "bottom-centre" ? wa.x + Math.round((wa.width - CAP_W) / 2)
    : wa.x + wa.width - SPOT_MARGIN - CAP_W;
  return { x, y };
}
/* The window bounds that put the capsule there, drawn on the side `anchor` says. */
function spotBounds(display, spot, anchor = spot) {
  const c = capRect(display, spot);
  return { x: Math.round(c.x - capOffsetX(anchor)), y: Math.round(c.y - (ISLAND_H - CAP_BOTTOM - CAP_H)), width: ISLAND_W, height: ISLAND_H };
}
function setAnchor(spot) { anchorSpot = spot; sendIsland("maven:anchor", { spot }); }
function placeIsland() {
  if (!island || island.isDestroyed() || drag) return;
  const s = savedSpot();
  setAnchor(s.spot);
  island.setBounds(spotBounds(displayById(s.displayId), s.spot));
}
let glideTimer = 0;
function glideIsland(to, ms = 180, after = null) {
  clearInterval(glideTimer);
  if (!island || island.isDestroyed()) return;
  const from = island.getBounds();
  const t0 = Date.now();
  glideTimer = setInterval(() => {
    if (!island || island.isDestroyed()) { clearInterval(glideTimer); return; }
    const k = Math.min(1, (Date.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3); // ease out
    island.setBounds({ x: Math.round(from.x + (to.x - from.x) * e), y: Math.round(from.y + (to.y - from.y) * e), width: ISLAND_W, height: ISLAND_H });
    if (k >= 1) { clearInterval(glideTimer); if (after) after(); }
  }, 16);
}
function setIslandAllowed(on) {
  islandAllowed = Boolean(on);
  if (!island || island.isDestroyed()) return;
  if (islandAllowed) { placeIsland(); island.showInactive(); sendRest(); }
  else island.hide();
}
/* The first time the pill is on screen (launch, or after onboarding places
   it) it wakes up: fades in with its eyes shut, opens them, blinks once. */
let woke = false;
function sendRest() {
  if (islandAllowed && !woke && island && !island.isDestroyed() && !island.webContents.isLoading()) { woke = true; islandShow("wake"); return; }
  islandShow("idle");
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
  island.webContents.once("did-finish-load", () => { setAnchor(anchorSpot); if (islandAllowed && !island.isVisible()) island.showInactive(); sendRest(); });
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
    const c = capRect(display, name);
    return { name, x: c.x - 8 - b.x, y: c.y - 8 - b.y };
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
    const c = capRect(display, name);
    const d = Math.hypot(c.x + CAP_W / 2 - capCx, c.y + CAP_H / 2 - capCy);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/* Manual dragging: app-region drag gives no start/end, so main moves the
   window with the cursor at ~60 fps while the button is down. */
let drag = null;
function capsuleCentre(b) { return { x: b.x + capOffsetX(anchorSpot) + CAP_W / 2, y: b.y + ISLAND_H - CAP_BOTTOM - CAP_H / 2 }; }
function dragStart() {
  if (!island || island.isDestroyed() || drag || doAsk) return;
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
  // Glide with the capsule where it is drawn now, then switch sides in one step.
  glideIsland(spotBounds(display, spot, anchorSpot), 180, () => { setAnchor(spot); if (island && !island.isDestroyed()) island.setBounds(spotBounds(display, spot)); });
  log("island.spot", { spot, display: display.id });
  if (onboarding) onboarding.placed(spot);
}
/* During onboarding's placement step: show the spots without a drag, as a hint. */
function showTargetsHint(on) {
  if (on) { const s = savedSpot(); drawTargets(displayById(s.displayId), s.spot); }
  else if (targets && !targets.isDestroyed() && !drag) targets.hide();
}

let islandHideTimer = 0;
/* ---------- Maven's voice (2026-10-29) ----------
   The AffectiveOS voice (mac/shared/affectiveos-voice.js) with Maven's own
   Fish voice. He speaks in Do mode only: what he did, or what he's asking.
   Write mode stays silent, because you're in the middle of typing. */
const MAVEN_VOICE_ID = "9062ee6786ec40e8a27e273279336a06";
let doTalk = false; // true from a Do take until the next Write take
let pendingSay = ""; // his in-character line for this Do, from the brain
const talkHistory = []; let talkAt = 0; // the last few turns, so follow-ups make sense
function maySay(text) {
  if (!doTalk || !text) return;
  if (pendingSay) { text = pendingSay; pendingSay = ""; }
  try { mavenStore.init(app.getPath("userData")); if (mavenStore.getSettings().talk === false) return; } catch (_) {}
  sendIsland("maven:say", { text: String(text), endpoint: `${SUPABASE_URL}/functions/v1/fish-audio-tts`, anonKey: SUPABASE_ANON_KEY, referenceId: MAVEN_VOICE_ID });
}
function warmVoice() { sendIsland("maven:say", { text: "-", warm: true, endpoint: `${SUPABASE_URL}/functions/v1/fish-audio-tts`, anonKey: SUPABASE_ANON_KEY, referenceId: MAVEN_VOICE_ID }); }

function islandShow(state, extra = {}) {
  if (!island || island.isDestroyed()) return;
  clearTimeout(islandHideTimer);
  if (islandAllowed && !island.isVisible()) island.showInactive();
  // The look travels with every state: Bar layout, and the theme from Settings.
  let theme = "ink", character = true;
  try { mavenStore.init(app.getPath("userData")); const st = mavenStore.getSettings(); theme = String(st.islandTheme || "ink"); character = st.character !== false; } catch (_) {}
  sendIsland("maven:state", { state, look: { layout: "bar", theme, character }, ...extra });
  if (state === "sent") maySay(extra.text || "Sent.");
}
function islandHide(delay = 0) {
  clearTimeout(islandHideTimer);
  // The mark stays; only the dots and notes go (back to idle).
  islandHideTimer = setTimeout(() => sendIsland("maven:state", { state: "idle" }), delay);
}
ipcMain.on("maven:hover", (_e, over) => {
  if (drag) return; // keep the mouse while dragging
  if (doAsk && !over) return; // the card is asking: it keeps the mouse until answered
  if (island && !island.isDestroyed()) island.setIgnoreMouseEvents(!over, { forward: true });
});
ipcMain.on("maven:drag", (_e, what) => { if (what === "start") dragStart(); else dragEnd(); });
ipcMain.on("maven:card", (_e, a) => { void onCard(a || {}); });
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
      if (t === "copied" || t.startsWith("copied\t")) { const w = copyWaiters.shift(); if (w) w(t.split("\t")[1] || ""); continue; }
      if (t.startsWith("dictate-hold-")) { onChord(t.slice("dictate-hold-".length)); continue; }
      if (t.startsWith("do-hold-")) { onChord(t.slice("do-hold-".length), "do"); continue; }
      if (t === "ask-enter" || t === "ask-esc") { askKeysOn = false; void onCard({ do: t === "ask-enter" ? "key-enter" : "key-esc" }); continue; }
      if (t === "ready") setKeysReady(true);
      log("keys.status", { line: t });
    }
  });
  proc.stderr.on("data", (c) => log("keys.stderr", { line: String(c).slice(0, 300) }));
  proc.on("error", (error) => log("keys.spawn_failed", { error }));
  proc.on("exit", (code) => {
    log("keys.exit", { code });
    if (keys === proc) keys = null;
    askKeysOn = false; // a new watcher starts with ask mode off
    setKeysReady(false);
    while (pasteWaiters.length) pasteWaiters.shift()(null);
    while (copyWaiters.length) copyWaiters.shift()(null);
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
/* Ask mode (2026-10-27): while the island asks, the key watcher catches Return
   and Esc system-wide (and swallows them), so answering never depends on which
   window has focus. Off on answer, fold, edit, quit, restart, and after 25 s
   (the watcher enforces the 25 s itself too). */
let askKeysOn = false, askKeysTimer = 0;
function setAskKeys(on) {
  clearTimeout(askKeysTimer);
  if (on === askKeysOn && !on) return;
  askKeysOn = on;
  try { if (keys && !keys.killed && keys.stdin && !keys.stdin.destroyed) keys.stdin.write(on ? "ask-on\n" : "ask-off\n"); } catch (_) {}
  if (on) askKeysTimer = setTimeout(() => setAskKeys(false), 25000);
}
/* Cmd+C through the key watcher (Do mode reading a selection). null when it can't. */
const copyWaiters = [];
function nativeCopy(timeoutMs = 400) {
  if (!keys || keys.killed || !keys.stdin || keys.stdin.destroyed) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); };
    copyWaiters.push(finish);
    setTimeout(() => { const i = copyWaiters.indexOf(finish); if (i >= 0) copyWaiters.splice(i, 1); finish(null); }, timeoutMs);
    try { keys.stdin.write("copy\n"); } catch (_) { finish(null); }
  });
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
/* fn+Control is the same, for Do (one small job): press, ask, press again. */
let takeMode = "write"; // what the current recording is for: "write" or "do"
function onChord(kind, mode = "write") {
  if (kind === "end") return;
  if (kind === "cancel") {
    if ((phase === "starting" || phase === "listening") && takeMode === mode && Date.now() - startedAt < 1500) stopDictation("chord was a shortcut", { discard: true });
    return;
  }
  if (kind === "start") {
    if (mode === "write" && onboarding && onboarding.onChord()) return; // the shortcut step only checks the keys
    if (mode === "do" && doAsk && phase !== "listening" && phase !== "starting") { void startDictation("fn+Control", "confirm"); return; } // say "send" / "cancel"
    if (mode === "do" && takeMode === "confirm") mode = "confirm";
    toggleDictation(mode === "do" ? "fn+Control" : "Control+Option", mode);
  }
}
function toggleDictation(source, mode = "write") {
  // A press while the last one is still pasting starts a new one; it is never ignored.
  if (phase === "idle" || phase === "finishing") void startDictation(source, mode);
  else if (phase === "starting" || phase === "listening") stopDictation(source);
}

let phaseTimer = 0, phaseJobs = [];
/* Whisper loops on noise and silence ("शायद, शायद, शायद, शायद"). A word or short
   phrase said 3+ times in a row becomes one (2026-10-28). */
function collapseRepeats(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const out = [];
  let i = 0;
  while (i < words.length) {
    let done = false;
    for (let n = 3; n >= 1 && !done; n--) {            // phrases of 1 to 3 words
      const chunk = words.slice(i, i + n).map(norm).join(" ");
      if (!chunk) continue;
      let reps = 1;
      while (words.slice(i + reps * n, i + (reps + 1) * n).map(norm).join(" ") === chunk) reps++;
      if (reps >= 3) { out.push(...words.slice(i + (reps - 1) * n, i + reps * n)); i += reps * n; done = true; }
    }
    if (!done) { out.push(words[i]); i++; }
  }
  return out.join(" ");
}
let longTakeTimer1 = 0, longTakeTimer2 = 0, longTake = false;
async function startDictation(source, mode = "write") {
  if (mode === "do") { doTalk = true; warmVoice(); } else if (mode === "write") doTalk = false;
  longTake = false;
  if (doAsk && mode !== "confirm") void endAsk("interrupted by a new take");
  phase = "starting";
  takeMode = mode;
  startedAt = Date.now();
  stopQueued = null;
  session_ += 1;
  if (mode === "confirm") armFold(); // the card stays up while you answer by voice
  else islandShow("listening", { mode });
  // Wake the transcriber while you talk (an OPTIONS call: no model, no cost).
  fetch(`${SUPABASE_URL}/functions/v1/transcribe-and-notes`, { method: "OPTIONS" }).catch(() => {});
  const r = await hera().start().catch((error) => ({ ok: false, error: String(error?.message || error) }));
  if (!r?.ok) {
    log("dictation.start_failed", { error: r?.error || "" });
    phase = "idle";
    if (mode !== "confirm") { islandShow("note", { note: "Mic not available." }); islandHide(1600); }
    return;
  }
  phase = "listening";
  phaseJobs = [];
  clearInterval(phaseTimer);
  phaseTimer = setInterval(async () => {
    for (const seg of await hera().take()) phaseJobs.push(transcribePhase(seg));
  }, 400);
  log("dictation.started", { session: session_, source });
  // Accidental takes (2026-10-28: ⌃⌥ pressed by mistake, 4.5 min of a TV recorded).
  // At 2 min the pill asks "Still talking?"; at 5 min it stops and only copies.
  clearTimeout(longTakeTimer1); clearTimeout(longTakeTimer2);
  const mine = session_;
  longTakeTimer1 = setTimeout(() => { if (session_ === mine && phase === "listening") { islandShow("reply", { note: "Still talking?", hint: "Press ⌃⌥ to finish, ✕ to drop it" }); setTimeout(() => { if (session_ === mine && phase === "listening") islandShow("listening", { mode: takeMode }); }, 3500); } }, 120000);
  longTakeTimer2 = setTimeout(() => { if (session_ === mine && phase === "listening") { longTake = true; stopDictation("five minutes, stopped by itself"); } }, 300000);
  if (stopQueued) { const q = stopQueued; stopQueued = null; stopDictation(q.reason, q.opts); }
}

function stopDictation(reason, opts = {}) {
  if (phase === "starting") { stopQueued = { reason, opts }; return; }
  if (phase !== "listening") return;
  phase = "finishing";
  if (takeMode === "confirm") { /* the card stays */ }
  else if (takeMode === "do" && !opts.discard) islandShow("thinking"); // eyes drift, slow dim light, while it works out the job
  else islandHide(); // the moment you press, the listening state goes; the text follows
  void finishDictation(reason, Boolean(opts.discard), session_, takeMode);
}

/* ---------- transcription ---------- */
/* Language for dictation (Settings / onboarding): "en" | "hi" | "hinglish". */
function dictationLanguage() { try { mavenStore.init(app.getPath("userData")); return mavenStore.getLanguage(); } catch (_) { return "en"; } }
async function transcribeAudio({ audioBase64, mimeType, fileName }) {
  if (!audioBase64) return { ok: false, error: "No audio." };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "Not configured." };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-and-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ mode: "lecture", audioBase64, fileName, mimeType, transcriptOnly: true, dictation: true, language: dictationLanguage() }),
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
function quickTidy(raw, language = "en") {
  if (language !== "en") return ""; // Hindi / Hinglish always go to the model
  const text = String(raw || "").trim();
  if (/[\u0900-\u097F]/.test(text)) return ""; // Devanagari is never "already clean" English
  const words = text.split(/\s+/).filter(Boolean);
  if (!text || words.length > 60 || NEEDS_MODEL.test(text) || !/^[A-Z]/.test(text) || !/[.?!,]/.test(text)) return "";
  let out = text.replace(/\bi\b/g, "I").replace(/\bi'(m|ll|ve|d)\b/gi, (_m, x) => "I'" + x.toLowerCase());
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.?!]$/.test(out)) out += /^(?:can|could|would|will|is|are|do|does|did|what|why|how|where|when|who|which|shall|should)\b/i.test(out) ? "?" : ".";
  return out;
}
let lastRefine = {};
/* A script conversion (Devanagari -> Roman) can't be checked word by word, so it
   gets its own check: no Devanagari left, similar length, every digit kept. */
function scriptSafe(raw, cand) {
  const c = String(cand || ""), r = String(raw || "");
  if (!c || /[\u0900-\u097F]/.test(c)) return false;
  const ratio = c.length / Math.max(1, r.length);
  if (ratio < 0.5 || ratio > 1.9) return false;
  const digits = (r.match(/\d+/g) || []);
  return digits.every((d) => c.includes(d));
}
async function refine(raw, timeoutMs, language = "en", convert = false) {
  lastRefine = {};
  if (!raw || raw.length > 20000 || !SUPABASE_ANON_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dictation-refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ transcript: convert ? "[lang: hinglish] " + raw : raw, language }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { log("refine.failed", { status: res.status }); return null; }
    const candidate = String(data?.formatted || "").trim();
    const a = convert ? { accepted: scriptSafe(raw, candidate), reason: "script_conversion", sourceCoverage: 1 } : assessDictationEdit(raw, candidate);
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
  const words = (t) => String(t || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}₹'\s-]/gu, " ").split(/\s+/).filter(Boolean);
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
    `  heard   (${d.heard.provider || "?"}, ${dictationLanguage() === "auto" ? "auto→" : ""}${d.language || "en"}, ${sec(d.textMs)}): "${d.raw}"`,
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
      // Not the user: very long, barely matching takes (a TV in the next room) stay out of training.
      train: !(d.audio.ms > 180000 && diff.kept < 0.4) && !longTake,
      at: new Date().toISOString(), language: d.language || "en", spokenSec: +(d.audio.ms / 1000).toFixed(1), phases: d.audio.phases || 0, heardBy: d.heard.provider || "",
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

async function finishDictation(reason, discard, mySession = session_, mode = "write") {
  const t0 = Date.now();
  clearInterval(phaseTimer); phaseTimer = 0;
  const audio = await hera().stop();
  if (discard) {
    phaseJobs = [];
    log("dictation.discarded", { reason });
    if (session_ === mySession) phase = "idle";
    return;
  }
  if (mode === "confirm") { await confirmByVoice(audio, mySession); return; }
  try {
    if (!audio?.audioBase64) { log("dictation.empty", { reason, error: audio?.error || "" }); if (mode === "do") { islandShow("reply", { note: "Again?", face: "again" }); islandHide(1600); } else islandHide(); return; }
    const phased = await collectPhases(audio);
    const heard = phased && phased.length >= Math.max(12, (audio.ms || 0) / 120)
      ? { ok: true, transcript: phased, provider: "phases" }
      : await transcribeAudio({ audioBase64: audio.audioBase64, mimeType: audio.mimeType, fileName: "maven.webm" }).catch((e) => ({ ok: false, error: String(e?.message || e) }));
    const textMs = Date.now() - t0;
    if (!heard.ok || !heard.transcript) {
      log("dictation.nothing_heard", { reason, error: heard.error || "" });
      if (mode === "do") islandShow("reply", { note: "Again?", face: "again" }); else islandShow("note", { note: "Heard nothing." });
      islandHide(1400); return;
    }
    if (mode === "do") { await runDo({ raw: heard.transcript.trim(), heard, audio, t0, textMs }); return; }
    // Auto or several languages: transcribe unlocked, then read the language from the text.
    const asked = dictationLanguage();
    /* Auto writes Hindi as Roman Hinglish (2026-10-28): Whisper puts spoken
       Hinglish in Devanagari, and mixed lines confused the cleanup. Devanagari
       output only when Hindi alone is picked in Settings. */
    const convert = asked === "auto" && /[\u0900-\u097F]/.test(heard.transcript);
    const language = convert ? "hinglish" : asked === "auto" ? mavenStore.detectLanguage(heard.transcript) : asked;
    const heardText = collapseRepeats(heard.transcript.trim());
    const raw = language === "en" ? spokenNumbersToDigits(heardText) : heardText;
    const quick = quickTidy(raw, language);
    const c0 = Date.now();
    let cleaned = quick || await refine(raw, Math.min(language === "en" ? 7000 : 9000, 2500 + raw.length * 8), language, convert);
    // Hinglish expected but the conversion failed: try once more before giving up on Roman letters.
    if (!cleaned && convert) { log("refine.retry", { reason: "conversion failed" }); cleaned = await refine(raw, 12000, language, convert); }
    const cleanMs = Date.now() - c0;
    mavenStore.init(app.getPath("userData"));
    const finalText = mavenStore.expandSnippet(mavenStore.applyDictionary((convert ? (cleaned || raw) : gate(raw, cleaned)) || raw));
    const p0 = Date.now();
    const pasted = longTake ? (clipboard.writeText(finalText), { ok: false, app: "", longTake: true }) : await insertText(finalText);
    const pasteMs = Date.now() - p0;
    try { fs.writeFileSync(lastDictationPath(), `${new Date().toISOString()}\nRAW: ${raw}\nFINAL: ${finalText}\n`); } catch (_) {}
    printDictation({ language, audio, heard, raw, quick, cleaned, finalText, pasted, textMs, cleanMs, pasteMs, totalMs: Date.now() - t0 });
    // One gentle nudge toward Do mode, after the third dictation, once ever.
    try {
      const st = mavenStore.getSettings();
      if (!st.doNudged && mavenStore.getHistory().length >= 3) {
        mavenStore.setSetting("doNudged", true);
        setTimeout(() => { if (phase === "idle") { islandShow("reply", { note: "Try fn⌃ too?", hint: "Press fn⌃ and say “open YouTube”" }); islandHide(5200); } }, 1600);
      }
    } catch (_) {}
    log("dictation.done", { reason, provider: heard.provider || "", recordedMs: audio.ms, textMs, cleanMs, pasteMs, totalMs: Date.now() - t0, chars: finalText.length, cleaned: Boolean(cleaned), pasted: pasted.ok, app: pasted.app || "" });
    if (session_ === mySession) {
      if (pasted.ok) { islandShow("done"); islandHide(850); } // green edge light, then rest // a quick happy squint
      else { islandShow("note", { note: pasted.longTake ? "Long take. Copied." : "Copied. No box." }); islandHide(2600); }
    }
  } catch (error) {
    log("dictation.failed", { error: String(error?.message || error) });
    islandHide();
  } finally {
    // Only if no new dictation started meanwhile.
    if (session_ === mySession) phase = "idle";
  }
}

/* ---------- Do mode (2026-10-27): one spoken command, one step ----------
   record -> transcribe (same as dictation) -> intent (dictation-refine,
   mode "intent": one action JSON) -> act. Opening things just happens; anything
   that sends or fills shows the island card and waits for Enter / Send.
   Esc cancels. The island takes key focus only while it asks, and gives it back
   to the app you were in. After 20 s it folds and leaves the draft on the clipboard. */
const actions = require(path.join(__dirname, "lib", "actions.cjs"));
const whatsapp = require(path.join(__dirname, "lib", "whatsapp.cjs"));
const { MAVEN_JOBS } = require(path.join(__dirname, "lib", "jobs.cjs"));
const CHAT_APPS = /^(WhatsApp|Slack|Messages|Telegram|Discord|Signal|Microsoft Teams)$/i;
const DETAIL_WORDS = { name: "name", email: "email", phone: "phone number", address: "address" };

async function intentFor(raw) {
  if (!SUPABASE_ANON_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dictation-refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: "intent", transcript: raw, language: dictationLanguage(), persona: true, history: Date.now() - talkAt < 10 * 60000 ? talkHistory.slice(-4) : [] }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.intent?.action) { log("do.intent_failed", { status: res.status }); return null; }
    return { intent: data.intent, model: `${data.provider || "?"} ${data.model || ""}`.trim(), provider: String(data.provider || ""), why: String(data.why || ""), cachedTokens: data.cachedTokens || 0 };
  } catch (error) {
    log("do.intent_failed", { error: error?.name === "AbortError" ? "timeout" : String(error?.message || error) });
    return null;
  } finally { clearTimeout(timer); }
}

/* After every "Not my job." a tiny second line says how to see the list (3 s). */
const HELP_HINT = "Say “what can you do?”";
/* His answer, shown in the card above his head while he says it. */
function sayCard(text) {
  const t = String(text || "").trim();
  if (!t) return;
  pendingSay = "";
  void ask({ kind: "say", title: "", right: "", preview: t, primary: "", foldMs: Math.min(30000, 4500 + t.length * 65) }, { result: "", at: new Date().toISOString() }, { onYes: async () => { islandShow("idle"); return "read"; } });
  maySay(t);
}
function reply(text, face = "done", ms = 1700) {
  if (doTalk && pendingSay && pendingSay.length > 18) { const t = pendingSay; sayCard(t); return; }
  maySay(text);
  const refused = text === "Not my job.";
  islandShow("reply", { note: text, face, ...(refused ? { hint: HELP_HINT } : {}) });
  islandHide(refused ? Math.max(ms, 3000) : ms);
}

/* ---------- the island asking ---------- */
let doAsk = null; // { spec, rec, draft, front, onYes, onChoose, timer, editing }
/* Only for the Edit field: typing needs real key focus. Answering never does. */
function takeFocus() {
  if (!island || island.isDestroyed()) return;
  try { island.setFocusable(true); island.setIgnoreMouseEvents(false); app.focus({ steal: true }); island.focus(); } catch (_) {}
}
async function giveFocusBack(front, tookFocus = true) {
  if (!island || island.isDestroyed()) return;
  try { island.blur(); island.setFocusable(false); island.setIgnoreMouseEvents(true, { forward: true }); } catch (_) {}
  if (tookFocus && front && front !== "Electron" && front !== "Maven") await actions.activate(front);
}
function armFold() {
  if (!doAsk) return;
  clearTimeout(doAsk.timer);
  const ms = doAsk.spec.foldMs || 20000;
  doAsk.timer = setTimeout(() => void endAsk(`folded after ${Math.round(ms / 1000)}s`), ms);
}
async function ask(spec, rec, handlers) {
  if (spec.kind !== "say") maySay(spec.kind === "choose" || spec.kind === "help" ? spec.title : spec.right || spec.title);
  const front = doAsk ? doAsk.front : await actions.frontApp();
  if (doAsk) clearTimeout(doAsk.timer);
  doAsk = { spec, rec, draft: String(spec.preview || ""), front, editing: false, ...handlers };
  islandShow("ask", { card: spec });
  try { if (island && !island.isDestroyed()) island.setIgnoreMouseEvents(false); } catch (_) {} // buttons clickable, focus untouched
  if (spec.kind !== "say") setAskKeys(true); // Enter / Esc reach the card from any app (never for a plain answer: you keep your Enter)
  armFold();
}
/* Ends the question without doing it: cancelled, folded, or interrupted. */
async function endAsk(why) {
  const job = doAsk;
  if (!job) return;
  doAsk = null;
  clearTimeout(job.timer);
  setAskKeys(false);
  const keep = /folded/.test(why) && job.draft && job.spec.kind !== "choose" && job.spec.kind !== "say";
  if (keep) clipboard.writeText(job.draft);
  islandShow("idle");
  await giveFocusBack(job.front, job.editing);
  if (keep) reply("On your clipboard.", "nope", 1800);
  job.rec.result = why + (keep ? ", draft on clipboard" : "");
  finishDo(job.rec);
}
async function onCard(a) {
  const job = doAsk;
  if (!job) return;
  if (a.do === "key-enter" || a.do === "key-esc") {
    // From the key watcher: the renderer answers exactly as its own keydown would (choose / edited text).
    job.rec.answeredBy = a.do === "key-enter" ? "enter" : "esc";
    sendIsland("maven:cardkey", a.do === "key-enter" ? "enter" : "esc");
    return;
  }
  if (a.do === "editing") { job.editing = true; setAskKeys(false); takeFocus(); armFold(); return; }
  if (a.do === "activity") { armFold(); return; }
  if (a.do === "cancel") { await endAsk("cancelled"); return; }
  if (a.do === "choose" && job.onChoose) { clearTimeout(job.timer); setAskKeys(false); if (job.editing) await giveFocusBack(job.front); await job.onChoose(Number(a.choice) || 0); return; }
  if (a.do === "primary" && job.onYes) {
    const text = typeof a.text === "string" && a.text.trim() ? a.text.trim() : job.draft;
    doAsk = null;
    clearTimeout(job.timer);
    setAskKeys(false);
    if (job.editing) await giveFocusBack(job.front);
    const a0 = Date.now();
    try { job.rec.result = await job.onYes(text, job); }
    catch (error) { job.rec.result = `failed: ${String(error?.message || error).slice(0, 160)}`; islandShow("idle"); reply("Not my job.", "nope"); }
    job.rec.sendMs = Date.now() - a0;
    if (text !== job.draft) job.rec.edited = text;
    finishDo(job.rec);
  }
}

/* Voice answer to the card (fn+Control while it asks): a short match, no intent call. */
const SAY_YES = /^(send( it)?|yes|yeah|yep|haan|haa|ha|han|bhej( do| de)?|हाँ|हां|भेज( दो| दे)?|ok(ay)?|do it)$/i;
const SAY_NO = /^(cancel|no|nope|nahi|nahin|mat|नहीं|रहने दो|stop)$/i;
async function confirmByVoice(audio, mySession) {
  try {
    if (!doAsk) return;
    const heard = audio?.audioBase64 ? await transcribeAudio({ audioBase64: audio.audioBase64, mimeType: audio.mimeType, fileName: "maven-confirm.webm" }).catch(() => null) : null;
    const said = String(heard?.transcript || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const job = doAsk;
    if (!job) return;
    log("do.confirm_voice", { said });
    if (SAY_YES.test(said)) { job.rec.answeredBy = `voice "${said}"`; sendIsland("maven:cardkey", "enter"); }
    else if (SAY_NO.test(said)) { job.rec.answeredBy = `voice "${said}"`; sendIsland("maven:cardkey", "esc"); }
    else { if (!job.editing) setAskKeys(true); armFold(); } // not a yes or no: the card keeps asking
  } finally { if (session_ === mySession) { phase = "idle"; takeMode = "write"; } }
}

/* ---------- the actions ---------- */
async function sendFlow(intent, rec) {
  const person = String(intent.person || "").trim();
  const message = String(intent.message || "").trim();
  if (!person || !message) { reply("Again?", "again"); return "no person or message"; }
  const viaMail = /mail|gmail|email/i.test(String(intent.app || ""));
  if (viaMail) {
    const to = await actions.emailFor(person);
    await ask({ kind: "send", title: `To ${person}${to ? "" : " (no email saved)"}`, right: "Drafted. Send?", preview: message, primary: "Send" }, rec, {
      onYes: async (text) => {
        islandShow("sent", { text: "In Mail." });
        await giveFocusBack("");
        await shell.openExternal(actions.mailto(to, intent.subject || "", text));
        islandHide(1400);
        return `mail compose opened${to ? "" : " (no address)"}`;
      },
    });
    return "asking";
  }
  if (!whatsapp.installed()) { clipboard.writeText(message); reply("No WhatsApp app.", "nope", 2000); return "no WhatsApp app, draft on clipboard"; }
  const self = whatsapp.isSelf(person);
  const found = self
    ? await whatsapp.resolveSelf(mavenStore.getDetails()).catch(() => ({ ok: false }))
    : await whatsapp.resolve(person).catch(() => ({ ok: false }));
  if (self && !found.ok) { clipboard.writeText(message); reply("Can't find your chat.", "nope", 2200); return "can't find own chat, draft on clipboard"; }
  const sendCard = async (who) => ask({ kind: "send", title: `To ${who.name}`, right: "Drafted. Send?", preview: message, primary: "Send" }, rec, {
    onYes: async (text, job) => {
      await giveFocusBack(""); // WhatsApp takes the front itself
      const r = await whatsapp.send({ phone: who.phone, text, openExternal: (u) => shell.openExternal(u), log });
      if (r.ok) { islandShow("sent", { text: "Sent." }); islandHide(1500); return `sent on WhatsApp to ${who.name}`; }
      clipboard.writeText(text);
      islandShow("idle");
      await actions.activate(job.front);
      reply("Not sent. Copied.", "nope", 2200);
      return `not sent (${r.why}), draft on clipboard`;
    },
  });
  if (found.ok) { await sendCard(found); return "asking"; }
  if (found.choices?.length) {
    // Two people with that name is always a question, never a guess.
    const first = person.split(/\s+/)[0];
    await ask({ kind: "choose", title: `Which ${first}?`, right: "Pick one", options: found.choices.map((c) => ({ name: c.name, meta: c.chats ? `${c.chats} msgs` : "" })) }, rec, {
      onChoose: async (i) => { const pick = found.choices[i] || found.choices[0]; rec.chose = pick.name; await sendCard(pick); },
    });
    return "asking";
  }
  clipboard.writeText(message);
  reply(`Can't find ${person}.`, "nope", 2200);
  return `can't find ${person}, draft on clipboard`;
}

async function pasteInto(front, text) {
  await giveFocusBack(front);
  await new Promise((r) => setTimeout(r, 180));
  clipboard.writeText(text);
  const pasted = await nativePaste();
  return pasted !== null;
}

/* ---------- "draft a reply to this": read the screen, draft, ask ----------
   Mail's selected message, else Chrome's active tab (Gmail or any page), else
   whatever is selected (Cmd+C, old clipboard put back). Never presses send. */
async function readSelection() {
  const old = clipboard.readText();
  const marker = `maven-${Date.now()}`;
  clipboard.writeText(marker);
  const ok = await nativeCopy();
  await new Promise((r) => setTimeout(r, 250));
  const got = clipboard.readText();
  clipboard.writeText(old || "");
  if (ok === null || !got || got === marker || !got.trim()) return null;
  return { app: ok || "", sender: "", text: got.trim().slice(0, 6000) };
}
async function readScreen(front) {
  if (/^Mail$/i.test(front)) {
    const m = await actions.readMail();
    if (m) return { ...m, source: "mail" };
  }
  if (/^Google Chrome$/i.test(front)) {
    try {
      const c = await actions.readChrome();
      if (c) return { ...c, source: c.app === "Gmail" ? "gmail" : "chrome" };
    } catch (error) { log("do.chrome_js_off", {}); }
  }
  const sel = await readSelection();
  return sel ? { ...sel, app: sel.app || front, source: "selection" } : null;
}
async function composeFor(context, instruction) {
  if (!SUPABASE_ANON_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dictation-refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: "compose", transcript: instruction || "reply", context, instruction }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.formatted) { log("do.compose_failed", { status: res.status }); return null; }
    return data.formatted;
  } catch (error) {
    log("do.compose_failed", { error: error?.name === "AbortError" ? "timeout" : String(error?.message || error) });
    return null;
  } finally { clearTimeout(timer); }
}
const senderName = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/"/g, "").trim() || String(s || "").replace(/[<>]/g, "").trim();
async function draftReply(intent, rec) {
  const front = await actions.frontApp();
  const seen = await readScreen(front);
  if (!seen) { reply("Select it first.", "nope", 2200); rec.contextSource = "none"; return "nothing readable on screen"; }
  rec.contextSource = seen.source;
  const draft = await composeFor(seen.text, String(intent.subject || intent.instruction || "").trim());
  if (!draft) { reply("Again?", "again"); return `compose failed (${seen.source})`; }
  rec.draft = draft;
  const who = senderName(seen.sender) || seen.app || front || "this";
  await ask({ kind: "reply", title: `Reply to ${who}`, right: "Drafted. Yours?", preview: draft, primary: "Send" }, rec, {
    onYes: async (text, job) => {
      islandShow("idle");
      if (seen.source === "mail") {
        await giveFocusBack("Mail");
        if (!(await actions.mailReplyOpen())) { await actions.mailStartReply(); await new Promise((r) => setTimeout(r, 900)); }
        await new Promise((r) => setTimeout(r, 150));
        clipboard.writeText(text);
        const ok = (await nativePaste()) !== null;
        reply(ok ? "Drafted. Your call." : "Copied. No box.", ok ? "done" : "nope", 2000);
        return ok ? "draft pasted in Mail reply (not sent)" : "no reply box, copied";
      }
      const ok = await pasteInto(job.front, text); // never presses send
      reply(ok ? "Drafted. Your call." : "Copied. No box.", ok ? "done" : "nope", 2000);
      return ok ? `draft pasted in ${job.front} (not sent)` : "no text box, copied";
    },
  });
  return "asking";
}

/* ---------- "fill this form": every field it knows, in Chrome (2026-10-29) ----------
   No AI call: each field is matched to a saved detail by its label, name and
   autocomplete. Shows what goes where, fills on yes, never presses Submit. */
const FORM_ASK = /\b(fill|feel|bhar|bharo|bhar do)\b.{0,25}\b(form|फॉर्म)\b|\bform\b.{0,12}\b(bhar|fill)|फॉर्म.{0,12}भर/i;
function fieldKind(f) {
  const h = `${f.ac} ${f.name} ${f.id} ${f.label} ${f.ph}`.toLowerCase();
  if (f.type === "email" || /email|e-mail|ईमेल/.test(h)) return "email";
  if (f.type === "tel" || /\btel\b|phone|mobile|contact (no|number)|whatsapp|फ़ोन|मोबाइल/.test(h)) return "phone";
  if (/given-name|first.?name|fname/.test(h)) return "first";
  if (/family-name|last.?name|surname|lname/.test(h)) return "last";
  if (/(user|company|business|file|org|team|project|nick).?name/.test(h)) return "";
  if (/\bname\b|full.?name|नाम/.test(h)) return "name";
  if (/street-address|address-line1|address|street|पता/.test(h)) return "address";
  return "";
}
async function fillFormFlow(rec) {
  const front = await actions.frontApp();
  if (!/chrome/i.test(front || "")) { reply("Open it in Chrome.", "nope", 2400); return `form fill needs Chrome (front: ${front})`; }
  let fields;
  try { fields = await actions.chromeFormFields(); }
  catch (error) {
    if (error.code === "javascript") { islandShow("reply", { note: "Turn on Chrome setting.", face: "nope", hint: "View → Developer → Allow JavaScript from Apple Events" }); islandHide(6000); return "chrome javascript off"; }
    throw error;
  }
  const d = mavenStore.getDetails();
  const parts = String(d.name || "").trim().split(/\s+/);
  const values = { name: d.name, email: d.email, phone: d.phone, address: d.address, first: parts[0] || "", last: parts.length > 1 ? parts.slice(1).join(" ") : "" };
  const pairs = {}; const lines = [];
  for (const f of fields) {
    if (String(f.value || "").trim()) continue;
    const k = fieldKind(f);
    const v = k && String(values[k] || "").trim();
    if (!v) continue;
    pairs[f.i] = v;
    lines.push(`${(f.label || f.ph || k).replace(/\s+/g, " ").replace(/\*$/, "").trim().slice(0, 28)}: ${v}`);
  }
  rec.formFields = fields.length;
  if (!fields.length) { reply("No form here.", "nope", 2000); return "no form fields"; }
  if (!lines.length) {
    const none = !d.name && !d.email && !d.phone && !d.address;
    reply(none ? "Save your details first." : "Nothing I know.", "nope", 2600);
    return none ? "no details saved" : `no matching fields (${fields.length} fields)`;
  }
  // Asked on purpose, so it just fills (2026-10-29). Still never presses Submit.
  const n = await actions.chromeFillForm(pairs);
  reply(n ? `Filled ${n}. Your call.` : "Couldn't fill.", n ? "done" : "nope", 2200);
  return `filled ${n} of ${fields.length} fields`;
}

/* ---------- said in Do, meant for Write (2026-10-29) ----------
   When Do can't act and it sounds like ordinary speech, offer to write it. */
async function offerWrite(raw, rec) {
  const words = String(raw || "").trim().split(/\s+/).filter(Boolean).length;
  if (words < 6) return null;
  const cleaned = (await refine(raw, 3000).catch(() => null)) || raw.trim();
  await ask({ kind: "reply", title: "Meant to write this?", right: "Write it?", preview: cleaned, primary: "Write" }, rec, {
    onYes: async (text, job) => {
      islandShow("idle");
      const ok = await pasteInto(job.front, text);
      reply(ok ? "Written." : "On your clipboard.", ok ? "done" : "nope");
      return ok ? `wrote it instead, in ${job.front}` : "no text box, copied";
    },
  });
  return "asking: write instead";
}

async function doAction(intent, rec) {
  mavenStore.init(app.getPath("userData"));
  const act = intent.action;
  pendingSay = String(intent.say || "").trim();
  talkHistory.push({ user: String(rec.heard || "").slice(0, 400), maven: pendingSay || String(intent.reply3 || "") }); talkAt = Date.now();
  if (talkHistory.length > 6) talkHistory.shift();
  if (act === "chat") { sayCard(pendingSay || "Hm."); return "talked"; }
  const heardWords = String(rec.heard || "").split(/\s+/).length;
  if ((act === "fill" && !intent.detail) || ((act === "none" || act === "fill") && heardWords <= 12 && FORM_ASK.test(rec.heard || ""))) return fillFormFlow(rec);
  if (act === "open_app" || act === "switch_app") {
    const found = actions.findApp(intent.app);
    if (!found) {
      const site = act === "open_app" ? actions.siteFor(intent.app, intent.url) : null;
      if (site && intent.app && !/\s/.test(String(intent.app).trim())) { await shell.openExternal(site.href); reply(`${site.label}. Open.`); return `no app, opened ${site.href}`; }
      reply(`Can't find ${intent.app || "that"}.`, "nope"); return "app not found";
    }
    await actions.openApp(found);
    reply(act === "open_app" ? `${found.name}. Open.` : "There.");
    return `opened ${found.name}`;
  }
  if (act === "open_url") {
    const site = actions.siteFor(intent.app || "", intent.url);
    if (!site) { reply("Again?", "again"); return "no site"; }
    await shell.openExternal(site.href);
    reply(`${site.label}. Open.`);
    return `opened ${site.href}`;
  }
  if (act === "help") {
    // "what can you do?": the list, in the card. See all opens the Hub's page. Esc or 12 s folds it.
    await ask({ kind: "help", title: "What I can do", right: "My jobs.", jobs: MAVEN_JOBS, primary: "See all", foldMs: 12000 }, rec, {
      onYes: async () => { islandShow("idle"); await giveFocusBack(""); openHub("jobs"); return "showed jobs, opened the Hub"; },
    });
    return "asking";
  }
  if (act === "send_message") return sendFlow(intent, rec);
  if (act === "reply" && intent.draft === true && !String(intent.message || "").trim()) return draftReply(intent, rec);
  if (act === "reply") {
    const message = String(intent.message || "").trim();
    if (!message) { reply("Again?", "again"); return "no message"; }
    const front = await actions.frontApp();
    await ask({ kind: "reply", title: `Reply in ${front || "this app"}`, right: "Written. Send?", preview: message, primary: "Send" }, rec, {
      onYes: async (text, job) => {
        islandShow("idle");
        const ok = await pasteInto(job.front, text);
        if (ok && CHAT_APPS.test(job.front)) { await new Promise((r) => setTimeout(r, 120)); await actions.pressReturn(); reply("Sent."); return `pasted and sent in ${job.front}`; }
        reply(ok ? "Written." : "Copied. No box.", ok ? "done" : "nope");
        return ok ? `pasted in ${job.front}` : "no text box, copied";
      },
    });
    return "asking";
  }
  if (act === "fill") {
    const key = Object.keys(DETAIL_WORDS).includes(intent.detail) ? intent.detail : "";
    const value = key ? mavenStore.getDetails()[key] : "";
    if (!key) { reply("Not my job.", "nope"); return "unknown detail"; }
    if (!value) { reply(`No ${DETAIL_WORDS[key]} saved.`, "nope", 2200); return `no ${key} saved`; }
    await ask({ kind: "fill", title: `Fill your ${DETAIL_WORDS[key]}`, right: "Your call.", preview: value, primary: "Fill" }, rec, {
      onYes: async (text, job) => {
        islandShow("idle");
        const ok = await pasteInto(job.front, text); // never presses Submit
        reply(ok ? "Filled. Your call." : "Copied. No box.", ok ? "done" : "nope", 2000);
        return ok ? `filled ${key} in ${job.front}` : "no text box, copied";
      },
    });
    return "asking";
  }
  if (act === "add_to_list") {
    if (!intent.item) { reply("Again?", "again"); return "no item"; }
    const list = String(intent.list || "List").replace(/\s+list$/i, "").trim() || "List";
    const r = await actions.addToNote(list, intent.item);
    reply("Added.");
    return `${r} note "${list}"`;
  }
  if (act === "remember") {
    if (!mavenStore.addMemory(intent.fact, intent.word)) { reply("Again?", "again"); return "no fact"; }
    reply("Got it.");
    return intent.word ? `remembered, "${intent.word}" in the dictionary` : "remembered";
  }
  const again = /again/i.test(String(intent.reply3 || ""));
  const offered = again ? null : await offerWrite(rec.heard, rec);
  if (offered) return "asking";
  reply(again ? "Again?" : "Not my job.", again ? "again" : "nope");
  return again ? "didn't hear" : "not my job";
}

async function runDo({ raw, heard, audio, t0, textMs }) {
  // Ink thinking bar (2026-10-28): what it heard, shimmering, with the blue edge light, while HIL decides.
  islandShow("think", { text: raw.length > 46 ? raw.slice(0, 44).trimEnd() + "…" : raw });
  const rec = { t0, at: new Date().toISOString(), heard: raw, heardBy: heard.provider || "", spokenSec: +((audio?.ms || 0) / 1000).toFixed(1), textMs, intentMs: 0, actMs: 0, sendMs: 0, intent: null, model: "", result: "" };
  const i0 = Date.now();
  // "fill this form" is clear enough to skip the intent call (saves ~2 s and a model call).
  if (raw.split(/\s+/).length <= 12 && FORM_ASK.test(raw)) {
    rec.intent = { action: "fill_form" }; rec.model = "rule";
    try { rec.result = await fillFormFlow(rec); } catch (error) { rec.result = `failed: ${String(error?.message || error).slice(0, 160)}`; reply("Not my job.", "nope"); }
    if (rec.result !== "asking") finishDo(rec);
    return;
  }
  const r = await intentFor(raw);
  rec.intentMs = Date.now() - i0;
  if (!r) { reply("Again?", "again"); rec.result = "intent failed"; finishDo(rec); return; }
  rec.intent = r.intent; rec.model = r.model; rec.provider = r.provider; rec.why = r.why; rec.cachedTokens = r.cachedTokens;
  const a0 = Date.now();
  try { rec.result = await doAction(r.intent, rec); }
  catch (error) { rec.result = `failed: ${String(error?.message || error).slice(0, 160)}`; reply("Not my job.", "nope"); }
  rec.actMs = Date.now() - a0;
  if (rec.result !== "asking") finishDo(rec);
}

/* One terminal block per Do command, like the dictation one, and a JSON line
   in userData/training/commands.jsonl. Seconds to one decimal. */
function finishDo(rec) {
  if (!rec || !rec.t0) return; // an answer card has no take of its own
  const totalMs = Date.now() - rec.t0;
  const i = rec.intent || {};
  console.log([
    "",
    `[MAVEN DO] ── ${i.action || "none"} · ${rec.result} · total ${sec(totalMs)}`,
    `  heard   (${rec.heardBy || "?"}, ${sec(rec.textMs)}): "${rec.heard}"`,
    `  intent  (${rec.model || "failed"}, ${sec(rec.intentMs)}): ${JSON.stringify(rec.intent || {})}`,
    `  why     ${rec.why || "(none)"}  [teacher hil · ${rec.model || "?"}${rec.cachedTokens ? ` · ${rec.cachedTokens} cached` : ""}]`,
    ...(rec.answeredBy ? [`  answer  ${rec.answeredBy}`] : []),
    `  action  ${i.action || "none"}${i.app ? ` · ${i.app}` : ""}${i.person ? ` · to ${i.person}` : ""}${rec.chose ? ` (chose ${rec.chose})` : ""}${rec.edited ? " · edited" : ""}`,
    ...(rec.contextSource ? [`  screen  ${rec.contextSource}${rec.draft ? ` · draft: "${rec.draft.slice(0, 120)}"` : ""}`] : []),
    `  result  ${rec.result}`,
    `  time    text ${sec(rec.textMs)} · intent ${sec(rec.intentMs)} · act ${sec(rec.actMs)}${rec.sendMs ? ` · send ${sec(rec.sendMs)}` : ""} · total ${sec(totalMs)}`,
  ].join("\n"));
  log("do.done", { action: i.action || "none", result: rec.result, intentMs: rec.intentMs, totalMs });
  mavenStore.init(app.getPath("userData"));
  mavenStore.appendCommand({
    at: rec.at, spokenSec: rec.spokenSec, heardBy: rec.heardBy, heard: rec.heard, intent: rec.intent, model: rec.model,
    provider: rec.provider || "", why: rec.why || "", teacher: "hil", cachedTokens: rec.cachedTokens || 0, answeredBy: rec.answeredBy || "",
    action: i.action || "none", result: rec.result, chose: rec.chose || "", edited: rec.edited || "",
    ...(rec.contextSource ? { contextSource: rec.contextSource } : {}), ...(rec.draft ? { draft: rec.draft } : {}),
    textSec: +(rec.textMs / 1000).toFixed(1), intentSec: +(rec.intentMs / 1000).toFixed(1), actSec: +(rec.actMs / 1000).toFixed(1), sendSec: +((rec.sendMs || 0) / 1000).toFixed(1), totalSec: +(totalMs / 1000).toFixed(1),
  });
}

/* ---------- lifecycle ---------- */
app.on("second-instance", () => { if (app.isReady()) openHub(); });
app.on("activate", () => { if (app.isReady()) openHub(); });
app.on("window-all-closed", (e) => { if (!quitting) e.preventDefault?.(); });
app.on("before-quit", () => {
  quitting = true;
  setAskKeys(false); // never leave Return / Esc swallowed
  try { keys && keys.stdin && keys.stdin.end(); } catch (_) {}
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
