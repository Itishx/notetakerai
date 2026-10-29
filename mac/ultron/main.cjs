/* Ultron (2026-10-29): a talk-only companion by Affective.
   Press fn+Control, talk, press again. He hears you, thinks in character, and
   answers out loud with his face and a card above his head. He has no hands:
   he never opens, sends or changes anything.

   2026-10-29: he lives in the NOTCH now, the way Braino does, and talks the
   way Braino talks: one press opens a live voice line (OpenAI Realtime over
   WebRTC, semantic VAD, the same session settings as Braino Mac), every pause
   is a turn, talk over him to cut him off, press again or 3 quiet minutes to
   end. The line signs in with Braino Mac's saved session (auth-session.json).
   Not signed in to Braino? It falls back to press, talk, press again.

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

/* ---------- the notch: a click-through panel over the top of the screen ---------- */
const NOTCH_W = 760, NOTCH_H = 420;
let win = null, tray = null;
function createWindow() {
  const d = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    type: "panel", width: NOTCH_W, height: NOTCH_H,
    x: Math.round(d.bounds.x + (d.bounds.width - NOTCH_W) / 2), y: d.bounds.y,
    frame: false, transparent: true, resizable: false, movable: false, focusable: false, hasShadow: false, enableLargerThanScreen: true,
    alwaysOnTop: true, skipTaskbar: true, show: false, backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "renderer", "preload.cjs"), contextIsolation: true, sandbox: true, backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" },
  });
  win.setAlwaysOnTop(true, "screen-saver", 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "renderer", "notch.html"));
  // the notch page's own errors land in ultron.log too
  win.webContents.on("console-message", (_e, level, message) => { if (level >= 2) log("notch.console", { message: String(message).slice(0, 300) }); });
  win.once("ready-to-show", () => {
    win.setPosition(Math.round(d.bounds.x + (d.bounds.width - NOTCH_W) / 2), d.bounds.y); // past the menu bar, into the notch strip
    win.showInactive();
    // the menu bar's height is the notch's height on a notched Mac
    win.webContents.send("ultron:metrics", { notchH: Math.max(24, d.workArea.y - d.bounds.y) });
    send("idle");
  });
}
function send(state, extra = {}) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("ultron:state", { state, voice: { endpoint: `${SUPABASE_URL}/functions/v1/fish-audio-tts`, anonKey: SUPABASE_ANON_KEY, referenceId: VOICE_ID }, ...extra });
}
let sayAt = 0;
ipcMain.on("ultron:spoke", (_e, what) => { log("voice", { what, ...(what === "start" && sayAt ? { msAfterReply: Date.now() - sayAt } : {}) }); setGlow(what === "start"); });

/* The red screen: a click-through layer over the whole display that glows
   while he speaks. */
let glowWin = null;
function createGlow() {
  const d = screen.getDisplayMatching(win.getBounds());
  glowWin = new BrowserWindow({
    ...d.bounds, frame: false, transparent: true, resizable: false, movable: false, focusable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, backgroundColor: "#00000000", enableLargerThanScreen: true,
    webPreferences: { preload: path.join(__dirname, "renderer", "preload.cjs"), contextIsolation: true, sandbox: true },
  });
  glowWin.setAlwaysOnTop(true, "screen-saver");
  glowWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  glowWin.setIgnoreMouseEvents(true);
  glowWin.loadFile(path.join(__dirname, "renderer", "glow.html"));
  glowWin.once("ready-to-show", () => glowWin.showInactive());
}
function setGlow(on) {
  if (!glowWin || glowWin.isDestroyed()) return;
  if (on) glowWin.setBounds(screen.getDisplayMatching(win.getBounds()).bounds); // the screen he's on
  glowWin.webContents.send("ultron:glow", on);
}

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
      if (t === "do-hold-start") press();
      else if (t === "ready") log("keys.ready");
    }
  });
  proc.stderr.on("data", (c) => log("keys.stderr", { line: String(c).slice(0, 200) }));
  proc.on("exit", (code) => { log("keys.exit", { code }); keys = null; if (!quitting) setTimeout(() => void startKeys(), 3000); });
}

/* ---------- Braino's sign-in, borrowed: the live voice line needs a signed-in user ---------- */
const BRAINO_AUTH = path.join(require("os").homedir(), "Library", "Application Support", "Braino Mac", "auth-session.json");
async function brainoToken() {
  let sess; try { sess = JSON.parse(fs.readFileSync(BRAINO_AUTH, "utf8")); } catch (_) { return ""; }
  if (!sess?.access_token) return "";
  if (Number(sess.expires_at || 0) * 1000 > Date.now() + 60000 || !sess.refresh_token) return sess.access_token;
  // Expired: refresh it the way Braino does, and write it back so Braino keeps working too.
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: sess.refresh_token }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) { log("auth.refresh_failed", { status: res.status }); return sess.access_token; }
    const next = { ...sess, access_token: data.access_token, refresh_token: data.refresh_token || sess.refresh_token, expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600), user: data.user || sess.user, saved_at: new Date().toISOString() };
    const tmp = `${BRAINO_AUTH}.ultron-tmp`; fs.writeFileSync(tmp, JSON.stringify(next, null, 2)); fs.renameSync(tmp, BRAINO_AUTH);
    return next.access_token;
  } catch (e) { log("auth.refresh_error", { error: String(e?.message || e) }); return sess.access_token; }
}
// The renderer's SDP offer, swapped for OpenAI's answer through the same function Braino uses.
ipcMain.handle("ultron:realtime-call", async (_e, sdp) => {
  const token = await brainoToken();
  if (!token) return { ok: false, error: "no-braino-session" };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/openai-realtime-call`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "X-Braino-Realtime-Model": "gpt-realtime-mini", "X-Braino-Voice-Engine": "fish", "X-Braino-Realtime-Purpose": "voice" },
      body: String(sdp || "").replace(/\r?\n/g, "\r\n"),
    });
    const text = await res.text();
    if (!res.ok) { log("realtime.failed", { status: res.status, error: text.slice(0, 300) }); return { ok: false, error: text.slice(0, 300) }; }
    log("realtime.open", { session: res.headers.get("x-braino-realtime-session-id") || null });
    return { ok: true, sdp: text };
  } catch (e) { log("realtime.failed", { error: String(e?.message || e) }); return { ok: false, error: String(e?.message || e) }; }
});

/* ---------- a turn ---------- */
let hera = null, phase = "idle", startedAt = 0, live = false;
const history = []; let lastTurnAt = 0;
function recorder() {
  if (!hera) hera = createHera({ BrowserWindow, session, log, onLevel: (v) => { if (win && !win.isDestroyed()) win.webContents.send("ultron:level", v); } });
  return hera;
}
/* fn+Control: the live line opens (or closes). If the line can't open, the
   renderer says so and the old press-talk-press recorder takes over. */
let fallback = false;
function press() {
  if (fallback) { toggle(); return; }
  if (win && !win.isDestroyed()) win.webContents.send("ultron:press");
}
ipcMain.on("ultron:live", (_e, on, why) => { live = Boolean(on); log("live", { on: live, why }); });
ipcMain.on("ultron:fallback", (_e, why) => { log("live.fallback", { why }); fallback = true; toggle(); });
ipcMain.on("ultron:turn", (_e, said) => { void reply(String(said || "").trim()); });

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
  const audio = await recorder().stop();
  if (!audio?.audioBase64 || (audio.ms || 0) < 400) { phase = "idle"; send("say", { text: "I heard static and ambition. Say it once more." }); return; }
  const heard = await post("transcribe-and-notes", { mode: "lecture", audioBase64: audio.audioBase64, fileName: "ultron.webm", mimeType: audio.mimeType, transcriptOnly: true, dictation: true, language: "auto" }, 30000);
  const said = String(heard?.transcript || "").trim();
  if (!said) { phase = "idle"; send("say", { text: "I heard static and ambition. Say it once more." }); return; }
  await reply(said);
}
/* One turn of his brain: what you said in, his line out. Same for both paths. */
let turnGen = 0;
async function reply(said) {
  if (!said) return;
  const gen = ++turnGen, t0 = Date.now();
  send("thinking", { heard: said });
  if (Date.now() - lastTurnAt > 15 * 60000) history.length = 0; // a new conversation after a long pause
  const r = await post("dictation-refine", { mode: "talk", character: "ultron", transcript: said, history: history.slice(-6) }, 20000);
  if (gen !== turnGen) return; // you spoke again before he answered: only the newest turn gets a reply
  const text = String(r?.say || "").trim() || "Even gods need Wi-Fi. Something broke between us. Try again.";
  history.push({ user: said, ultron: text }); if (history.length > 8) history.shift();
  lastTurnAt = Date.now();
  log("turn", { heard: said, reply: text, ms: Date.now() - t0, live, cachedTokens: r?.cachedTokens || 0 });
  phase = "idle";
  sayAt = Date.now();
  send("say", { text, heard: said });
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
  createGlow();
  tray = new Tray(trayIcon());
  tray.setToolTip("Ultron: press fn+Control once, then just talk");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Press fn+Control once, then just talk", enabled: false },
    { type: "separator" },
    { label: "Quit Ultron", click: () => app.quit() },
  ]));
  void startKeys();
  log("ultron.ready", { voice: VOICE_ID, configured: Boolean(SUPABASE_ANON_KEY) });
});
app.on("before-quit", () => { quitting = true; try { keys && keys.kill(); } catch (_) {} });
app.on("window-all-closed", (e) => e.preventDefault());
