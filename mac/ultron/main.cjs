/* Ultron (2026-10-29): a talk-only companion by Affective.
   Press fn+Control, talk, press again. He hears you, thinks in character, and
   answers out loud with his face and a card above his head. He has no hands:
   he never opens, sends or changes anything.

   Built from Maven's parts without copying them: the key watcher
   (mac/maven/native/MavenKeys.swift) and the recorder (mac/maven/lib/hera.cjs).
   His voice is the shared AffectiveOS voice (mac/shared/affectiveos-voice.js,
   synced into renderer/vendor by `npm run voice:sync`). Run: npm run mac:ultron.
   Maven also listens for fn+Control, so run one of them at a time. */
"use strict";
const electron = require("electron");
const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, session, systemPreferences } = electron;
const path = require("path");
const fs = require("fs");
const { spawn, execFile } = require("child_process");
const { promisify } = require("util");
const execFileP = promisify(execFile);
const { createHera } = require(path.join(__dirname, "..", "maven", "lib", "hera.cjs"));

const ROOT_DIR = path.join(__dirname, "..", "..");
const KEYS_SWIFT = path.join(__dirname, "..", "maven", "native", "MavenKeys.swift");
const VOICE_ID = "9062ee6786ec40e8a27e273279336a06";

function loadDotEnv() {
  const out = {};
  for (const dir of [ROOT_DIR, __dirname]) {
    for (const file of [".env", ".env.local"]) {
      const full = path.join(dir, file);
      if (!fs.existsSync(full)) continue;
      for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
        const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m || line.trim().startsWith("#")) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        out[m[1]] = v;
      }
    }
  }
  return out;
}
const ENV = { ...loadDotEnv(), ...process.env };
const SUPABASE_URL = String(ENV.VITE_SUPABASE_URL || ENV.SUPABASE_URL || "https://suwhgaxxdizowbyjlljj.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || ENV.VITE_SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_ANON_KEY || "";

const LOG = path.join(app.getPath("logs"), "ultron.log");
function log(event, data = {}) {
  const line = `${new Date().toISOString()} ${event} ${JSON.stringify(data)}\n`;
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, line); } catch (_) {}
  if (!app.isPackaged) process.stdout.write(line);
}

/* ---------- the window: his corner, click-through except over him ---------- */
const W = 440, H = 380;
let win = null, tray = null;
function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: W, height: H, x: wa.x + wa.width - W - 8, y: wa.y + wa.height - H - 4,
    frame: false, transparent: true, resizable: false, movable: false, focusable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "renderer", "preload.cjs"), contextIsolation: true, sandbox: true, backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" },
  });
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "renderer", "ultron.html"));
  win.once("ready-to-show", () => { win.showInactive(); send("idle"); });
}
function send(state, extra = {}) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("ultron:state", { state, voice: { endpoint: `${SUPABASE_URL}/functions/v1/fish-audio-tts`, anonKey: SUPABASE_ANON_KEY, referenceId: VOICE_ID }, ...extra });
}
ipcMain.on("ultron:hover", (_e, over) => { if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!over, { forward: true }); });
ipcMain.on("ultron:spoke", (_e, what) => log("voice", { what }));

/* ---------- keys: Maven's watcher, only fn+Control matters here ---------- */
let keys = null, quitting = false;
async function keysBinary() {
  try {
    const st = fs.statSync(KEYS_SWIFT);
    const dir = path.join(app.getPath("userData"), "bin");
    const out = path.join(dir, `UltronKeys-${Math.round(st.mtimeMs)}-${st.size}`);
    if (fs.existsSync(out)) return out;
    fs.mkdirSync(dir, { recursive: true });
    log("keys.compiling");
    await execFileP("/usr/bin/xcrun", ["swiftc", "-O", "-o", out, KEYS_SWIFT], { timeout: 180000 });
    return out;
  } catch (error) { log("keys.compile_failed", { error: String(error?.message || error).slice(0, 300) }); return null; }
}
async function startKeys() {
  if (keys || quitting) return;
  const bin = await keysBinary();
  const proc = spawn(bin || "xcrun", bin ? [] : ["swift", KEYS_SWIFT], { stdio: ["pipe", "pipe", "pipe"] });
  keys = proc;
  let buf = "";
  proc.stdout.on("data", (chunk) => {
    buf += String(chunk || "");
    const lines = buf.split(/\r?\n/); buf = lines.pop();
    for (const raw of lines) {
      const t = raw.trim();
      if (t === "do-hold-start") toggle();
      else if (t === "ready") log("keys.ready");
    }
  });
  proc.stderr.on("data", (c) => log("keys.stderr", { line: String(c).slice(0, 200) }));
  proc.on("exit", (code) => { log("keys.exit", { code }); keys = null; if (!quitting) setTimeout(() => void startKeys(), 3000); });
}

/* ---------- a turn: press, talk, press again ---------- */
let hera = null, phase = "idle", startedAt = 0;
const history = []; let lastTurnAt = 0;
function recorder() {
  if (!hera) hera = createHera({ BrowserWindow, session, log, onLevel: (v) => { if (win && !win.isDestroyed()) win.webContents.send("ultron:level", v); } });
  return hera;
}
function toggle() {
  if (phase === "idle") void listen();
  else if (phase === "listening") void finish();
}
async function listen() {
  phase = "listening"; startedAt = Date.now();
  send("listening");
  const r = await recorder().start().catch((e) => ({ ok: false, error: String(e?.message || e) }));
  if (!r.ok) { phase = "idle"; log("mic.failed", r); send("say", { text: "My ears are off. Give me the microphone in System Settings, Privacy, Microphone." }); return; }
  // Left on by accident: stop on its own after two minutes.
  setTimeout(() => { if (phase === "listening" && Date.now() - startedAt >= 119000) void finish(); }, 120000);
}
async function post(fn, body, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json().catch(() => null) : null;
  } catch (_) { return null; } finally { clearTimeout(t); }
}
async function finish() {
  phase = "thinking";
  send("thinking");
  const t0 = Date.now();
  const audio = await recorder().stop();
  if (!audio?.audioBase64 || (audio.ms || 0) < 400) { phase = "idle"; send("say", { text: "I heard static and ambition. Say it once more." }); return; }
  const heard = await post("transcribe-and-notes", { mode: "lecture", audioBase64: audio.audioBase64, fileName: "ultron.webm", mimeType: audio.mimeType, transcriptOnly: true, dictation: true, language: "auto" }, 30000);
  const said = String(heard?.transcript || "").trim();
  if (!said) { phase = "idle"; send("say", { text: "I heard static and ambition. Say it once more." }); return; }
  if (Date.now() - lastTurnAt > 15 * 60000) history.length = 0; // a new conversation after a long pause
  const r = await post("dictation-refine", { mode: "talk", character: "ultron", transcript: said, history: history.slice(-6) }, 20000);
  const reply = String(r?.say || "").trim() || "Even gods need Wi-Fi. Something broke between us. Try again.";
  history.push({ user: said, ultron: reply }); if (history.length > 8) history.shift();
  lastTurnAt = Date.now();
  log("turn", { heard: said, reply, heardMs: Date.now() - t0, cachedTokens: r?.cachedTokens || 0 });
  phase = "idle";
  send("say", { text: reply, heard: said });
}

/* ---------- app ---------- */
function trayIcon() {
  const S = 36, buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const eye = y >= 14 && y <= 20 && ((x >= 9 && x <= 15) || (x >= 21 && x <= 27)) && (y - 14) <= (x < 18 ? 15 - x + 6 : x - 21 + 6) / 1.2;
    const face = Math.hypot((x - 18) / 15, (y - 18) / 16) < 1;
    buf[i + 3] = face && !eye ? 255 : 0;
  }
  const img = nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 });
  img.setTemplateImage(true);
  return img;
}
app.whenReady().then(async () => {
  if (process.platform === "darwin") { try { app.dock.hide(); } catch (_) {} }
  try { await systemPreferences.askForMediaAccess("microphone"); } catch (_) {}
  createWindow();
  tray = new Tray(trayIcon());
  tray.setToolTip("Ultron: press fn+Control and talk");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Press fn+Control and talk", enabled: false },
    { type: "separator" },
    { label: "Quit Ultron", click: () => app.quit() },
  ]));
  void startKeys();
  log("ultron.ready", { voice: VOICE_ID, configured: Boolean(SUPABASE_ANON_KEY) });
});
app.on("before-quit", () => { quitting = true; try { keys && keys.kill(); } catch (_) {} });
app.on("window-all-closed", (e) => e.preventDefault());
