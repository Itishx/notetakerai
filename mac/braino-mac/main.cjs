const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, systemPreferences } = require("electron");
const { execFile, spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
const INDEX_PATH = path.join(__dirname, "renderer", "index.html");
const HOTKEY_HELPER_PATH = path.join(__dirname, "native", "BrainoControlTap.swift");
const SPEECH_HELPER_PATH = path.join(__dirname, "native", "BrainoSpeech.swift");
const APP_VERSION = "12.0.23";
const ORGANIZED_FOLDER_NAME = "Braino Organized";
const ORGANIZE_MANIFEST_NAME = ".braino-last-organize.json";
const LOG_DIR = path.join(os.homedir(), "Library", "Logs", "Braino Mac");
const LOG_PATH = path.join(LOG_DIR, "braino-mac.log");
const AUTH_STORE_DIR = path.join(os.homedir(), "Library", "Application Support", "Braino Mac");
const AUTH_STORE_PATH = path.join(AUTH_STORE_DIR, "auth-session.json");
const AUTH_CALLBACK_PATH = "/braino-mac-auth-callback";

let dockWindow = null;
let swiftHotkey = null;
let activeSpeech = null;
let lastControlTapAt = 0;
let cachedAuthSession = null;
let pendingAuthWaiters = [];
let authBrowserFlow = null;
let macChatHistory = [];

function loadDotEnv() {
  const out = {};
  for (const file of [".env", ".env.local"]) {
    const full = path.join(ROOT_DIR, file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[match[1]] = value;
    }
  }
  return out;
}

const ENV = { ...loadDotEnv(), ...process.env };
const SUPABASE_URL = ENV.VITE_SUPABASE_URL || ENV.SUPABASE_URL || "https://suwhgaxxdizowbyjlljj.supabase.co";
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || ENV.VITE_SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_ANON_KEY || "";
const OPENAI_API_KEY = ENV.OPENAI_API_KEY || ENV.OPENAI_REALTIME_API_KEY || ENV.VITE_OPENAI_API_KEY || "";
const ENV_BRAINO_AUTH_TOKEN = ENV.BRAINO_AUTH_TOKEN || ENV.BRAINO_SUPABASE_AUTH_TOKEN || ENV.VITE_BRAINO_AUTH_TOKEN || ENV.VITE_BRAINO_SUPABASE_AUTH_TOKEN || "";
const DEFAULT_BRAINO_AUTH_ORIGINS = app.isPackaged
  ? "https://www.trybraino.com"
  : "https://www.trybraino.com,https://braino-git-cinemamode-itishs-projects.vercel.app";
const BRAINO_AUTH_ORIGINS = (ENV.BRAINO_MAC_AUTH_ORIGINS || DEFAULT_BRAINO_AUTH_ORIGINS)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

function redact(value) {
  if (value == null) return value;
  const text = String(value);
  if (!text) return "";
  if (/^(sk-|eyJ|sbp_|ghp_|github_pat_|xox)/i.test(text) || text.length > 80) {
    return `${text.slice(0, 6)}...${text.slice(-4)} (${text.length} chars)`;
  }
  return text;
}

function sanitizeForLog(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 5).join("\n"),
    };
  }
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (/token|key|secret|authorization|apikey|sdp|password/i.test(key)) {
        out[key] = typeof item === "boolean" ? item : redact(item);
      } else {
        out[key] = sanitizeForLog(item);
      }
    }
    return out;
  }
  return value;
}

function logMac(event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    pid: process.pid,
    event,
    ...sanitizeForLog(payload),
  };
  const line = `[${entry.ts}] ${event} ${JSON.stringify(entry)}\n`;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch (_) {}
  console.log("[Braino Mac]", event, sanitizeForLog(payload));
}

function textForLog(value, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeAuthSession(data = {}) {
  const accessToken = String(data.access_token || "").trim();
  const refreshToken = String(data.refresh_token || "").trim();
  if (!accessToken) return null;
  const expiresIn = Number(data.expires_in || 0);
  const expiresAt = Number(data.expires_at || 0) || Math.floor(Date.now() / 1000) + (expiresIn > 0 ? expiresIn : 3600);
  const user = data.user || null;
  const displayName = cleanDisplayName(
    data.display_name ||
      data.displayName ||
      data.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "",
  );
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    display_name: displayName || null,
    user,
    saved_at: new Date().toISOString(),
  };
}

function cleanDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return nameFromEmail(raw);
  return raw;
}

function nameFromEmail(email) {
  const local = String(email || "").split("@")[0] || "";
  const firstWord =
    local.replace(/\d+/g, " ").replace(/[._-]+/g, " ").trim().split(/\s+/).find(Boolean) || "";
  if (!firstWord) return "";
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function displayNameFromSession(session) {
  if (!session) return "";
  return cleanDisplayName(
    session.display_name ||
      session.displayName ||
      session.user?.user_metadata?.full_name ||
      session.user?.user_metadata?.name ||
      session.user?.email ||
      "",
  );
}

function loadAuthSession() {
  if (cachedAuthSession) return cachedAuthSession;
  try {
    if (!fs.existsSync(AUTH_STORE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(AUTH_STORE_PATH, "utf8"));
    cachedAuthSession = normalizeAuthSession(parsed);
    return cachedAuthSession;
  } catch (error) {
    logMac("auth.load.failed", { error });
    return null;
  }
}

function saveAuthSession(session) {
  const normalized = normalizeAuthSession(session);
  if (!normalized) throw new Error("Auth response did not include an access token.");
  fs.mkdirSync(AUTH_STORE_DIR, { recursive: true });
  fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(normalized, null, 2), { mode: 0o600 });
  cachedAuthSession = normalized;
  logMac("auth.session.saved", {
    userId: normalized.user?.id || null,
    email: normalized.user?.email || null,
    displayName: normalized.display_name || null,
    expiresAt: normalized.expires_at,
    authStorePath: AUTH_STORE_PATH,
  });
  return normalized;
}

function clearAuthSession() {
  cachedAuthSession = null;
  try {
    if (fs.existsSync(AUTH_STORE_PATH)) fs.unlinkSync(AUTH_STORE_PATH);
  } catch (error) {
    logMac("auth.clear.failed", { error });
  }
}

function authStatusPayload() {
  const session = loadAuthSession();
  const displayName = displayNameFromSession(session);
  return {
    authenticated: Boolean(ENV_BRAINO_AUTH_TOKEN || session?.access_token),
    source: ENV_BRAINO_AUTH_TOKEN ? "env" : session?.access_token ? "stored" : "missing",
    email: session?.user?.email || null,
    displayName: displayName || null,
    userId: session?.user?.id || null,
    expiresAt: session?.expires_at || null,
    authStorePath: AUTH_STORE_PATH,
  };
}

async function supabaseAuthFetch(pathname, body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured for Braino auth.");
  }
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.error || `Auth failed (${response.status}).`);
  }
  return data;
}

async function refreshStoredBrainoSession(session) {
  if (!session?.refresh_token) return null;
  logMac("auth.refresh.start", { email: session.user?.email || null });
  const data = await supabaseAuthFetch("token?grant_type=refresh_token", {
    refresh_token: session.refresh_token,
  });
  const next = saveAuthSession({
    ...data,
    display_name: session.display_name || null,
    user: data.user || session.user || null,
  });
  logMac("auth.refresh.ok", { email: next.user?.email || null, expiresAt: next.expires_at });
  return next;
}

async function getBrainoAuthToken(options = {}) {
  if (ENV_BRAINO_AUTH_TOKEN) return ENV_BRAINO_AUTH_TOKEN;
  const refresh = options.refresh !== false;
  let session = loadAuthSession();
  if (!session?.access_token) return "";
  const expiresAtMs = Number(session.expires_at || 0) * 1000;
  if (!refresh || expiresAtMs > Date.now() + 60_000) return session.access_token;
  try {
    session = await refreshStoredBrainoSession(session);
    return session?.access_token || "";
  } catch (error) {
    logMac("auth.refresh.failed", { error });
    clearAuthSession();
    return "";
  }
}

function authSessionFromRelayPayload(data = {}) {
  const displayName = String(data.displayName || data.name || "").trim();
  return normalizeAuthSession({
    access_token: data.token || data.access_token,
    refresh_token: data.refreshToken || data.refresh_token,
    expires_at: data.expiresAt || data.expires_at,
    expires_in: data.expiresIn || data.expires_in,
    display_name: displayName || data.display_name,
    user: data.user || {
      id: data.userId || data.user_id || null,
      email: data.email || null,
      user_metadata: displayName ? { full_name: displayName, name: displayName } : {},
    },
  });
}

function resolveAuthWaiters(payload) {
  const waiters = pendingAuthWaiters;
  pendingAuthWaiters = [];
  waiters.forEach(({ resolve }) => resolve(payload));
}

function rejectAuthWaiters(error) {
  const waiters = pendingAuthWaiters;
  pendingAuthWaiters = [];
  waiters.forEach(({ resolve }) => resolve({ ok: false, error: error?.message || String(error || "Authentication cancelled.") }));
}

function authCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
  };
}

function sendAuthHttp(res, statusCode, payload = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...authCorsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

function readAuthJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        req.destroy(new Error("Auth callback body was too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Auth callback was not valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function escapeAppleScriptString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function closeBrowserTabsMatching(fragment) {
  const safeFragment = escapeAppleScriptString(fragment);
  if (!safeFragment || process.platform !== "darwin") return;

  const browsers = ["Google Chrome", "Google Chrome Beta", "Google Chrome Canary", "Microsoft Edge", "Brave Browser", "Arc"];
  for (const browser of browsers) {
    const safeBrowser = escapeAppleScriptString(browser);
    const script = `
tell application "System Events"
  if exists process "${safeBrowser}" then
    tell application "${safeBrowser}"
      repeat with w in windows
        set matchingTabs to {}
        repeat with t in tabs of w
          try
            if (URL of t as string) contains "${safeFragment}" then set end of matchingTabs to t
          end try
        end repeat
        repeat with t in matchingTabs
          try
            close t
          end try
        end repeat
      end repeat
    end tell
  end if
end tell`;
    try {
      await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 5000 });
      logMac("auth.browser_tabs.close_attempted", { browser, fragment });
    } catch (error) {
      logMac("auth.browser_tabs.close_failed", { browser, error });
    }
  }
}

function stopAuthBrowserFlow(options = {}) {
  const flow = authBrowserFlow;
  if (!flow) return;
  authBrowserFlow = null;
  if (flow.timeout) clearTimeout(flow.timeout);
  if (flow.server) {
    try { flow.server.close(); } catch (_) {}
  }
  if (options.closeTabs !== false) {
    void closeBrowserTabsMatching(`macNonce=${encodeURIComponent(flow.nonce)}`);
  }
}

function buildAuthRelayUrl(origin, port, nonce, reason) {
  const url = new URL(`${origin}/auth/extension`);
  url.searchParams.set("mode", "signin");
  url.searchParams.set("source", "braino-mac");
  url.searchParams.set("reason", reason || "realtime");
  url.searchParams.set("macCallback", `http://127.0.0.1:${port}${AUTH_CALLBACK_PATH}`);
  url.searchParams.set("macNonce", nonce);
  return url.toString();
}

async function openBrowserAuthTabs(flow) {
  for (const origin of BRAINO_AUTH_ORIGINS) {
    const url = buildAuthRelayUrl(origin, flow.port, flow.nonce, flow.reason);
    logMac("auth.browser.open", { origin, url });
    await shell.openExternal(url);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function startBrowserAuthFlow(reason = "realtime") {
  if (authBrowserFlow) {
    logMac("auth.browser.reuse", { reason, port: authBrowserFlow.port });
    return;
  }

  const nonce = crypto.randomBytes(18).toString("base64url");
  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname !== AUTH_CALLBACK_PATH) {
      sendAuthHttp(res, 404, { ok: false, error: "not_found" });
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, authCorsHeaders());
      res.end();
      return;
    }

    if (req.method !== "POST") {
      sendAuthHttp(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    try {
      const body = await readAuthJsonBody(req);
      if (body?.nonce !== nonce) {
        logMac("auth.callback.bad_nonce", { hasNonce: Boolean(body?.nonce) });
        sendAuthHttp(res, 403, { ok: false, error: "bad_nonce" });
        return;
      }

      const session = authSessionFromRelayPayload(body);
      if (!session?.access_token) {
        sendAuthHttp(res, 400, { ok: false, error: "missing_token" });
        return;
      }

      saveAuthSession(session);
      sendAuthHttp(res, 200, { ok: true });
      logMac("auth.callback.ok", { email: session.user?.email || null, userId: session.user?.id || null });
      resolveAuthWaiters({ ok: true, source: "browser", email: session.user?.email || null });
      stopAuthBrowserFlow({ closeTabs: true });
    } catch (error) {
      logMac("auth.callback.failed", { error });
      sendAuthHttp(res, 500, { ok: false, error: error?.message || "auth_callback_failed" });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const port = server.address()?.port;
  authBrowserFlow = {
    server,
    port,
    nonce,
    reason,
    timeout: setTimeout(() => {
      logMac("auth.browser.timeout", { reason, port });
      stopAuthBrowserFlow({ closeTabs: true });
      rejectAuthWaiters(new Error("Braino browser sign-in timed out."));
    }, 120000),
  };

  logMac("auth.browser.start", {
    reason,
    port,
    originCount: BRAINO_AUTH_ORIGINS.length,
  });

  try {
    await openBrowserAuthTabs(authBrowserFlow);
  } catch (error) {
    logMac("auth.browser.open_failed", { error });
    stopAuthBrowserFlow({ closeTabs: true });
    rejectAuthWaiters(error);
  }
}

async function ensureBrainoAuth(reason = "realtime") {
  const existing = await getBrainoAuthToken();
  if (existing) return { ok: true, source: ENV_BRAINO_AUTH_TOKEN ? "env" : "stored" };
  if (OPENAI_API_KEY && reason !== "startup") return { ok: true, source: "openai" };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Supabase is not configured for Braino auth." };
  }
  sendToRenderer("braino-mac:auth-required", { reason });
  return new Promise((resolve) => {
    pendingAuthWaiters.push({ resolve });
    startBrowserAuthFlow(reason).catch((error) => {
      logMac("auth.browser.start_failed", { error });
      rejectAuthWaiters(error);
    });
  });
}

function execFileP(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 20000, maxBuffer: 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

function sendToRenderer(channel, payload) {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  dockWindow.webContents.send(channel, payload);
}

function sendTaskProgress(payload) {
  sendToRenderer("braino-mac:task-progress", payload);
}

function splitHelperLines(onLine) {
  let buffer = "";
  return (chunk) => {
    buffer += String(chunk || "");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) onLine(trimmed);
    }
  };
}

function positionDockWindow() {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  const display = screen.getPrimaryDisplay();
  dockWindow.setBounds({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
  }, false);
}

function getDisplayMetrics() {
  const display = screen.getPrimaryDisplay();
  const { bounds, workArea, scaleFactor } = display;
  const dockHeight = Math.max(0, (bounds.y + bounds.height) - (workArea.y + workArea.height));
  const dockTop = dockHeight > 0
    ? workArea.y - bounds.y + workArea.height
    : bounds.height - 94;
  return {
    bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    workArea: { x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height },
    scaleFactor,
    dockTop,
    dockHeight,
  };
}

function createDockWindow() {
  dockWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    focusable: true,
    title: "Braino Mac",
    trafficLightPosition: { x: -100, y: -100 },
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      devTools: true,
    },
  });

  dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  dockWindow.setAlwaysOnTop(true, "screen-saver");
  dockWindow.setIgnoreMouseEvents(true, { forward: true });
  positionDockWindow();
  dockWindow.loadFile(INDEX_PATH);

  dockWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
}

function requestAccessibilityTrust(prompt = true) {
  try {
    return systemPreferences.isTrustedAccessibilityClient(Boolean(prompt));
  } catch (_) {
    return false;
  }
}

async function requestMicrophoneAccess() {
  if (process.platform !== "darwin") return { ok: true, status: "unsupported" };
  try {
    const before = systemPreferences.getMediaAccessStatus("microphone");
    logMac("microphone.permission.before", { status: before });
    if (before === "granted") return { ok: true, status: before };
    const granted = await systemPreferences.askForMediaAccess("microphone");
    const after = systemPreferences.getMediaAccessStatus("microphone");
    logMac("microphone.permission.after", { granted, status: after });
    return { ok: Boolean(granted || after === "granted"), status: after };
  } catch (error) {
    logMac("microphone.permission.error", { error });
    return { ok: false, status: "unknown", error: error?.message || "Could not request microphone access." };
  }
}

function markControlTap(source) {
  const now = Date.now();
  if (now - lastControlTapAt < 520) {
    lastControlTapAt = 0;
    sendToRenderer("braino-mac:voice-toggle", { source });
    if (dockWindow && !dockWindow.isDestroyed()) dockWindow.showInactive();
    return;
  }
  lastControlTapAt = now;
}

function toggleDockWindowVisibility(source) {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  if (dockWindow.isVisible()) {
    dockWindow.hide();
    return;
  }
  dockWindow.showInactive();
  sendToRenderer("braino-mac:helper-status", {
    type: "visibility",
    line: "braino-visible",
    source,
  });
}

function registerHotkeys() {
  const registered = {
    controlSpace: globalShortcut.register("CommandOrControl+Space", () => {
      sendToRenderer("braino-mac:voice-toggle", { source: "Control+Space" });
      if (dockWindow && !dockWindow.isDestroyed()) dockWindow.showInactive();
    }),
    bareControl: false,
  };

  try {
    registered.bareControl = globalShortcut.register("Control", () => markControlTap("Electron Control"));
  } catch (_) {
    registered.bareControl = false;
  }

  sendToRenderer("braino-mac:helper-status", { type: "electron-hotkeys", registered });
  return registered;
}

function startSwiftHotkeyHelper() {
  if (!fs.existsSync(HOTKEY_HELPER_PATH)) return;
  swiftHotkey = spawn("xcrun", ["swift", HOTKEY_HELPER_PATH], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  swiftHotkey.stdout.on("data", (chunk) => {
    String(chunk || "").split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed === "double-control") {
        sendToRenderer("braino-mac:voice-toggle", { source: "double Control" });
        if (dockWindow && !dockWindow.isDestroyed()) dockWindow.showInactive();
        return;
      }
      if (trimmed === "double-space") {
        toggleDockWindowVisibility("double Space");
        return;
      }
      sendToRenderer("braino-mac:helper-status", { type: "swift", line: trimmed });
    });
  });

  swiftHotkey.stderr.on("data", (chunk) => {
    const line = String(chunk || "").trim();
    if (line) sendToRenderer("braino-mac:helper-status", { type: "swift-error", line });
  });

  swiftHotkey.on("exit", (code) => {
    sendToRenderer("braino-mac:helper-status", { type: "swift-exit", code });
    swiftHotkey = null;
  });
}

function decodeSpeechLine(line) {
  const tabIndex = line.indexOf("\t");
  if (tabIndex === -1) return { type: line, text: "" };
  return {
    type: line.slice(0, tabIndex),
    text: line.slice(tabIndex + 1).trim(),
  };
}

function stopNativeSpeech() {
  if (!activeSpeech) return;
  try { activeSpeech.kill(); } catch (_) {}
  activeSpeech = null;
}

function runNativeSpeech() {
  if (!fs.existsSync(SPEECH_HELPER_PATH)) {
    return Promise.resolve({ ok: false, error: "Native speech helper is missing." });
  }

  if (activeSpeech) stopNativeSpeech();
  return new Promise((resolve) => {
    let settled = false;
    let latestTranscript = "";
    const child = spawn("xcrun", ["swift", SPEECH_HELPER_PATH], {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeSpeech = child;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      if (activeSpeech === child) activeSpeech = null;
      try { child.kill(); } catch (_) {}
      resolve(payload);
    };

    const timeout = setTimeout(() => {
      finish(latestTranscript
        ? { ok: true, transcript: latestTranscript }
        : { ok: false, error: "No speech heard." });
    }, 16000);

    child.stdout.on("data", splitHelperLines((line) => {
      const parsed = decodeSpeechLine(line);
      if (parsed.type === "speech-ready") {
        sendToRenderer("braino-mac:speech-transcript", { status: "ready", text: "" });
        return;
      }
      if (parsed.type === "speech-partial") {
        latestTranscript = parsed.text || latestTranscript;
        sendToRenderer("braino-mac:speech-transcript", { status: "partial", text: latestTranscript });
        return;
      }
      if (parsed.type === "speech-final") {
        clearTimeout(timeout);
        finish({ ok: true, transcript: parsed.text || latestTranscript });
        return;
      }
      if (parsed.type === "speech-error") {
        clearTimeout(timeout);
        finish({ ok: false, error: parsed.text || "Native speech failed." });
        return;
      }
      sendToRenderer("braino-mac:speech-transcript", { status: "helper", text: line });
    }));

    child.stderr.on("data", splitHelperLines((line) => {
      sendToRenderer("braino-mac:speech-transcript", { status: "error", text: line });
    }));

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish({ ok: false, error: error?.message || "Could not start native speech." });
    });

    child.on("exit", () => {
      clearTimeout(timeout);
      if (!settled) {
        finish(latestTranscript
          ? { ok: true, transcript: latestTranscript }
          : { ok: false, error: "No speech heard." });
      }
    });
  });
}

function cleanPrompt(input) {
  let text = String(input || "").replace(/\s+/g, " ").trim();
  for (let index = 0; index < 4; index += 1) {
    const before = text;
    text = text
      .replace(/^(?:hey|hi|hello|ok|okay|yo|so|buddy|bro|brother|dude|my guy)[,\s]+/i, "")
      .replace(/^(?:braino|bruno|breno|reno|dino)[,\s]+/i, "")
      .replace(/^(?:can|could|will|would)\s+you\s+(?:please\s+)?/i, "")
      .replace(/^please\s+/i, "")
      .replace(/^(?:help me|can you help me)\s+(?:to\s+)?/i, "")
      .trim();
    if (text === before) break;
  }
  return text.replace(/[.?!]+$/g, "").trim();
}

function isLikelyUrl(value) {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(String(value || "").trim());
}

function toUrl(value) {
  const trimmed = String(value || "").trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractAfter(text, regexes) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

const MAC_SKILLS_REPLY = [
  "Mac skills right now:",
  "1. I can organize loose Desktop files into clean folders.",
  "2. I can undo the last Desktop organization.",
  "3. I can find files on this Mac with Spotlight.",
  "4. I can open the best matching file when you ask for it.",
  "5. I can open installed Mac apps by name, and fall back to the right website for common services.",
].join("\n");

function isMacSkillsPrompt(text) {
  const raw = String(text || "").toLowerCase();
  return /\b(mac skills?|macbook skills?|local skills?|desktop skills?|mac capabilities|what can you do on (?:my\s+)?mac|what can you do locally)\b/.test(raw)
    || (/\bwhat can you do\b/.test(raw) && /\b(mac|macbook|desktop|files?|locally|computer|system)\b/.test(raw));
}

async function openChromeUrl(url) {
  await execFileP("open", ["-a", "Google Chrome", url]);
}

const FILE_KIND_EXTENSIONS = {
  pdf: [".pdf"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif", ".tiff", ".bmp", ".svg"],
  video: [".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm"],
  audio: [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"],
  document: [".doc", ".docx", ".pages", ".txt", ".rtf", ".md"],
  spreadsheet: [".xls", ".xlsx", ".csv", ".numbers", ".tsv"],
  presentation: [".ppt", ".pptx", ".key"],
  archive: [".zip", ".rar", ".7z", ".tar", ".gz", ".dmg", ".pkg"],
};

const COMMON_WEB_TARGETS = new Map([
  ["chatgpt", "https://chatgpt.com"],
  ["gmail", "https://mail.google.com"],
  ["google maps", "https://maps.google.com"],
  ["linkedin", "https://www.linkedin.com"],
  ["maps", "https://maps.google.com"],
  ["medium", "https://medium.com"],
  ["netflix", "https://www.netflix.com"],
  ["spotify", "https://open.spotify.com"],
  ["twitter", "https://x.com"],
  ["whatsapp", "https://web.whatsapp.com"],
  ["x", "https://x.com"],
  ["youtube", "https://www.youtube.com"],
  ["youtube music", "https://music.youtube.com"],
]);

const APP_NAME_ALIASES = new Map([
  ["activity monitor", "Activity Monitor"],
  ["app store", "App Store"],
  ["chrome", "Google Chrome"],
  ["cursor", "Cursor"],
  ["facetime", "FaceTime"],
  ["finder", "Finder"],
  ["google chrome", "Google Chrome"],
  ["mail", "Mail"],
  ["messages", "Messages"],
  ["music", "Music"],
  ["notes", "Notes"],
  ["photos", "Photos"],
  ["safari", "Safari"],
  ["slack", "Slack"],
  ["spotify", "Spotify"],
  ["terminal", "Terminal"],
  ["whatsapp", "WhatsApp"],
  ["xcode", "Xcode"],
]);

function normalizeSearchToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mdfindLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function cleanOpenTarget(value) {
  return String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+(?:for me|please|pls)$/i, "")
    .replace(/^(?:the|my|an?|application)\s+/i, "")
    .trim();
}

function canonicalAppName(appName) {
  const cleaned = cleanOpenTarget(appName);
  const normalized = normalizeSearchToken(cleaned);
  return APP_NAME_ALIASES.get(normalized) || cleaned;
}

function commonWebTargetFor(appName) {
  const normalized = normalizeSearchToken(cleanOpenTarget(appName));
  return COMMON_WEB_TARGETS.get(normalized) || "";
}

function appBaseName(appPath) {
  const base = path.basename(appPath || "", ".app");
  return base || path.basename(appPath || "");
}

function rankNameMatch(candidateName, query) {
  const candidate = normalizeSearchToken(candidateName);
  const target = normalizeSearchToken(query);
  if (!candidate || !target) return 0;
  if (candidate === target) return 100;
  if (candidate.startsWith(target)) return 84;
  if (candidate.includes(target)) return 70;
  const targetWords = target.split(" ").filter(Boolean);
  const hits = targetWords.filter((word) => candidate.includes(word)).length;
  return hits ? 40 + hits * 8 : 0;
}

function editDistanceWithin(a, b, maxDistance) {
  const left = String(a || "");
  const right = String(b || "");
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > maxDistance) return false;
    previous = current;
  }
  return previous[right.length] <= maxDistance;
}

function fuzzyWordIncluded(candidateWords, queryWord) {
  if (!queryWord) return true;
  if (queryWord.length <= 2) return candidateWords.includes(queryWord);
  return candidateWords.some((candidateWord) => {
    if (candidateWord.includes(queryWord) || queryWord.includes(candidateWord)) return true;
    const maxDistance = queryWord.length >= 7 ? 2 : 1;
    return editDistanceWithin(candidateWord, queryWord, maxDistance);
  });
}

function candidateMatchesQuery(candidateText, queryText) {
  const candidate = normalizeSearchToken(candidateText);
  const query = normalizeSearchToken(queryText);
  if (!candidate || !query) return false;
  if (candidate.includes(query)) return true;
  const candidateWords = candidate.split(" ").filter(Boolean);
  const queryWords = query.split(" ").filter(Boolean);
  if (!queryWords.length) return false;
  return queryWords.every((word) => fuzzyWordIncluded(candidateWords, word));
}

async function findInstalledApps(appName) {
  const cleaned = canonicalAppName(appName);
  if (!cleaned) return [];
  if (normalizeSearchToken(cleaned).length < 2) return [];
  const escaped = mdfindLiteral(cleaned);
  const expression = `kMDItemContentType == "com.apple.application-bundle" && (kMDItemDisplayName == "*${escaped}*"cd || kMDItemFSName == "*${escaped}*.app"cd)`;
  let paths = [
    path.join("/Applications", `${cleaned}.app`),
    path.join("/System/Applications", `${cleaned}.app`),
    path.join(os.homedir(), "Applications", `${cleaned}.app`),
  ].filter((appPath) => fs.existsSync(appPath));
  try {
    const result = await execFileP("mdfind", [expression], { timeout: 8000 });
    const found = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    paths.push(...found);
    logMac("app.search.mdfind.done", {
      requested: textForLog(appName),
      canonical: cleaned,
      resultCount: found.length,
      firstResults: found.slice(0, 4).map(appBaseName),
    });
  } catch (error) {
    logMac("app.search.mdfind.failed", { appName: cleaned, error });
  }

  let scannedCount = 0;
  const scanRoots = ["/Applications", path.join(os.homedir(), "Applications")].filter((rootPath) => fs.existsSync(rootPath));
  for (const rootPath of scanRoots) {
    try {
      const result = await execFileP("find", [rootPath, "-maxdepth", "3", "-name", "*.app", "-print"], { timeout: 8000 });
      const found = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      scannedCount += found.length;
      paths.push(...found);
    } catch (error) {
      logMac("app.search.find.failed", { rootPath, error });
    }
  }

  const matches = Array.from(new Set(paths))
    .filter((appPath) => appPath.endsWith(".app") && rankNameMatch(appBaseName(appPath), cleaned) > 0)
    .sort((a, b) => rankNameMatch(appBaseName(b), cleaned) - rankNameMatch(appBaseName(a), cleaned))
    .slice(0, 5);
  logMac("app.search.done", {
    requested: textForLog(appName),
    canonical: cleaned,
    scannedCount,
    matchCount: matches.length,
    firstResults: matches.slice(0, 4).map((appPath) => ({ name: appBaseName(appPath), path: appPath })),
  });
  return matches;
}

async function openApp(appName) {
  const canonical = canonicalAppName(appName);
  if (!canonical) return { ok: false, error: "No app name was provided." };
  logMac("app.open.start", {
    requested: textForLog(appName),
    canonical,
  });
  try {
    await execFileP("open", ["-a", canonical], { timeout: 8000 });
    logMac("app.open.success", { requested: textForLog(appName), canonical, method: "open-a" });
    return { ok: true, appName: canonical, method: "open-a" };
  } catch (error) {
    logMac("app.open.open_a.failed", { appName: canonical, error });
  }

  const matches = await findInstalledApps(canonical);
  if (matches.length) {
    const openError = await shell.openPath(matches[0]);
    if (!openError) {
      logMac("app.open.success", {
        requested: textForLog(appName),
        canonical,
        method: "spotlight",
        appPath: matches[0],
      });
      return { ok: true, appName: appBaseName(matches[0]), appPath: matches[0], method: "spotlight" };
    }
    logMac("app.open.path.failed", { appName: canonical, appPath: matches[0], error: openError });
  }
  logMac("app.open.not_found", { requested: textForLog(appName), canonical });
  return { ok: false, appName: canonical, error: "App was not found." };
}

function mdfindExpression(query) {
  const variants = searchQueryVariants(query).map(mdfindLiteral).filter(Boolean);
  const nameClauses = variants.flatMap((escaped) => [
    `kMDItemDisplayName == "*${escaped}*"cd`,
    `kMDItemFSName == "*${escaped}*"cd`,
  ]);
  const primary = variants[0] || mdfindLiteral(query);
  return [...nameClauses, `kMDItemTextContent == "*${primary}*"cd`].join(" || ");
}

function searchQueryVariants(query) {
  const cleaned = String(query || "").replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return Array.from(new Set([
    cleaned,
    cleaned.replace(/\s+/g, "_"),
    cleaned.replace(/\s+/g, "-"),
    cleaned.replace(/\s+/g, ""),
  ]));
}

function fileKindForText(text) {
  const raw = String(text || "").toLowerCase();
  const ext = path.extname(raw).toLowerCase();
  if (ext === ".pdf" || /\bpdfs?\b/.test(raw)) return "pdf";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif", ".tiff", ".bmp", ".svg"].includes(ext)
    || /\b(images?|photos?|pictures?|pngs?|jpe?gs?|webp|screenshots?)\b/.test(raw)) return "image";
  if ([".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm"].includes(ext) || /\b(videos?|movies?|mp4|mov)\b/.test(raw)) return "video";
  if ([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"].includes(ext) || /\b(audio|songs?|music|mp3)\b/.test(raw)) return "audio";
  if ([".xls", ".xlsx", ".csv", ".numbers", ".tsv"].includes(ext) || /\b(spreadsheets?|sheets?|excel|csv|numbers)\b/.test(raw)) return "spreadsheet";
  if ([".ppt", ".pptx", ".key"].includes(ext) || /\b(presentations?|slides?|ppt|keynote)\b/.test(raw)) return "presentation";
  if ([".zip", ".rar", ".7z", ".tar", ".gz", ".dmg", ".pkg"].includes(ext) || /\b(archives?|zips?|installers?|dmg|pkg)\b/.test(raw)) return "archive";
  if (/\b(folders?|directories?)\b/.test(raw)) return "folder";
  if ([".doc", ".docx", ".pages", ".txt", ".rtf", ".md"].includes(ext) || /\b(documents?|docs?|docx?|pages|notes?|text files?)\b/.test(raw)) return "document";
  return "";
}

function fileExtensionsForKind(kind) {
  return FILE_KIND_EXTENSIONS[kind] || [];
}

function cleanFileQuery(value, kind = "") {
  const kindWords = [
    "file", "files", "document", "documents", "doc", "docs", "pdf", "pdfs", "image", "images",
    "photo", "photos", "picture", "pictures", "png", "jpg", "jpeg", "webp", "folder", "folders",
    "directory", "directories", "spreadsheet", "spreadsheets", "sheet", "sheets", "presentation",
    "presentations", "slides", "video", "videos", "audio", "song", "songs", "archive", "zip",
  ];
  let query = String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\b(?:that\s+)?i\s+have\b/gi, " ")
    .replace(/\b(?:on|in)\s+(?:my\s+)?(?:mac|macbook|computer|system)\b/gi, " ")
    .replace(/\b(?:called|named|titled|about|for)\b/gi, " ")
    .replace(/^(?:the|my|an?|some)\s+/i, "")
    .trim();

  const hasExplicitExtension = /\.[a-z0-9]{2,5}$/i.test(query);
  if (!hasExplicitExtension) {
    query = query.replace(new RegExp(`\\b(?:${kindWords.join("|")})\\b`, "gi"), " ");
  }
  if (kind && !hasExplicitExtension) {
    query = query.replace(new RegExp(`\\b${kind}\\b`, "gi"), " ");
  }
  return query.replace(/\s+/g, " ").trim();
}

function parseFileIntent(raw) {
  const source = String(raw || "").trim();
  if (!source) return null;
  const lower = source.toLowerCase();
  if (/\bapps?|applications?\b/.test(lower) && !/\b(files?|documents?|pdfs?|images?|folders?)\b/.test(lower)) return null;

  const kind = fileKindForText(source);
  const hasMacScope = /\b(?:on|in)\s+(?:my\s+)?(?:mac|macbook|computer|system)\b/i.test(source);
  const hasFileWord = Boolean(kind) || hasMacScope || /\b(files?|documents?|pdfs?|images?|photos?|pictures?|folders?|directories?)\b/i.test(source);
  const hasFileVerb = /\b(find|search for|look for|open|show me|locate|help me look for|help me find)\b/i.test(source);
  if (!hasFileVerb || !hasFileWord) return null;

  const patterns = [
    /\b(?:help me\s+)?(?:find|search for|look for|locate|open|show me)\s+(?:the\s+|my\s+|a\s+|an\s+)?(?:file|document|doc|pdf|image|photo|picture|png|jpg|jpeg|webp|folder|directory|spreadsheet|sheet|presentation|slides|video|audio|song|archive|zip)s?\s+(?:called|named|titled|about|for)?\s*(.+)$/i,
    /\b(?:help me\s+)?(?:find|search for|look for|locate|open|show me)\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+(?:file|document|doc|pdf|image|photo|picture|png|jpg|jpeg|webp|folder|directory|spreadsheet|sheet|presentation|slides|video|audio|song|archive|zip)s?(?:\s+(?:file|document|folder|image|that\s+i\s+have|i\s+have|on\s+my\s+mac|in\s+my\s+mac|on\s+my\s+computer|in\s+my\s+computer))*$/i,
    /\b(?:help me\s+)?(?:find|search for|look for|locate|open|show me)\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+(?:on|in)\s+(?:my\s+)?(?:mac|macbook|computer|system)$/i,
    /\bopen\s+(?:my\s+)?(.+?\.(?:pdf|docx?|pptx?|xlsx?|csv|txt|md|pages|numbers|key|png|jpe?g|gif|webp|heic|mov|mp4|mp3|zip|dmg|pkg))$/i,
    /\b(?:find|search for|look for|open)\s+(?:my\s+)?(resume|cv|cover letter|portfolio|invoice|receipt)\b/i,
  ];

  const captured = extractAfter(source, patterns) || (kind ? source.replace(/\b(?:find|search for|look for|locate|open|show me|help me)\b/gi, " ") : "");
  const query = cleanFileQuery(captured, kind);
  if (!query) return null;
  return {
    query,
    kind,
    shouldOpen: /\bopen\b/i.test(source),
  };
}

function shouldSkipSearchPath(filePath) {
  if (/\/Library\/Mobile Documents\//.test(filePath)) {
    return /\/(?:node_modules|\.git|\.cache|\.Trash)\//.test(filePath);
  }
  return /\/(?:Library|node_modules|\.git|\.cache|\.Trash)\//.test(filePath)
    || /^\/(?:System|Library|private|usr|bin|sbin)\b/.test(filePath);
}

function pathMatchesKind(filePath, kind, stats = null) {
  if (!kind) return true;
  if (kind === "folder") return stats ? stats.isDirectory() : true;
  if (stats && !stats.isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const allowed = fileExtensionsForKind(kind);
  return !allowed.length || allowed.includes(ext);
}

function rankFileMatch(filePath, query, kind) {
  const basename = path.basename(filePath);
  const nameWithoutExt = basename.replace(/\.[^.]+$/, "");
  let score = rankNameMatch(nameWithoutExt, query);
  score = Math.max(score, rankNameMatch(basename, query));
  if (score === 0 && candidateMatchesQuery(nameWithoutExt, query)) score = 32;
  if (pathMatchesKind(filePath, kind)) score += 18;
  if (filePath.startsWith(path.join(os.homedir(), "Desktop"))) score += 10;
  if (filePath.startsWith(path.join(os.homedir(), "Downloads"))) score += 8;
  if (filePath.startsWith(path.join(os.homedir(), "Documents"))) score += 7;
  return score;
}

async function fallbackWalkFileSearch(query, options = {}) {
  const roots = [
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Downloads"),
    path.join(os.homedir(), "Pictures"),
    path.join(os.homedir(), "Movies"),
    path.join(os.homedir(), "Music"),
    path.join(os.homedir(), "Library", "Mobile Documents", "com~apple~CloudDocs"),
  ].filter((rootPath) => fs.existsSync(rootPath));
  const normalizedQuery = normalizeSearchToken(query);
  const results = [];
  let visited = 0;
  const maxVisited = 24000;
  const maxDepth = 6;

  async function walk(dir, depth) {
    if (results.length >= 12 || visited >= maxVisited || shouldSkipSearchPath(`${dir}/`)) return;
    let entries = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (results.length >= 12 || visited >= maxVisited) return;
      if (!entry.name || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (shouldSkipSearchPath(`${fullPath}/`)) continue;
      visited += 1;
      const isDirectory = entry.isDirectory();
      const statsLike = { isDirectory: () => isDirectory, isFile: () => entry.isFile() };
      const candidateText = normalizeSearchToken(entry.name.replace(/\.[^.]+$/, ""));
      if (candidateMatchesQuery(candidateText, normalizedQuery) && pathMatchesKind(fullPath, options.kind || "", statsLike)) {
        results.push(fullPath);
      }
      if (isDirectory && depth < maxDepth) await walk(fullPath, depth + 1);
    }
  }

  for (const rootPath of roots) {
    await walk(rootPath, 0);
    if (results.length >= 12 || visited >= maxVisited) break;
  }
  return results;
}

async function findFiles(query, options = {}) {
  const cleanQuery = cleanFileQuery(query, options.kind || "");
  if (!cleanQuery) return [];
  const variants = searchQueryVariants(cleanQuery);
  logMac("file.search.start", {
    requested: textForLog(query),
    cleanQuery,
    kind: options.kind || "",
    variants,
  });
  let mdfindPaths = [];
  try {
    const result = await execFileP("mdfind", [mdfindExpression(cleanQuery)], { timeout: 12000 });
    mdfindPaths = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    logMac("file.search.mdfind.done", {
      cleanQuery,
      kind: options.kind || "",
      resultCount: mdfindPaths.length,
      firstResults: mdfindPaths.slice(0, 5).map((filePath) => path.basename(filePath)),
    });
  } catch (error) {
    logMac("file.search.mdfind.failed", { query: cleanQuery, kind: options.kind || "", error });
  }
  const fallbackPaths = mdfindPaths.length < 4 ? await fallbackWalkFileSearch(cleanQuery, options) : [];
  logMac("file.search.fallback.done", {
    cleanQuery,
    kind: options.kind || "",
    ranFallback: mdfindPaths.length < 4,
    resultCount: fallbackPaths.length,
    firstResults: fallbackPaths.slice(0, 5).map((filePath) => path.basename(filePath)),
  });
  const seen = new Set();
  const candidates = [...mdfindPaths, ...fallbackPaths]
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  const matches = candidates
    .filter((filePath) => {
      if (seen.has(filePath) || shouldSkipSearchPath(filePath)) return false;
      seen.add(filePath);
      let stats = null;
      try {
        stats = fs.lstatSync(filePath);
      } catch (_) {
        return false;
      }
      return pathMatchesKind(filePath, options.kind || "", stats);
    })
    .sort((a, b) => rankFileMatch(b, cleanQuery, options.kind || "") - rankFileMatch(a, cleanQuery, options.kind || ""))
    .slice(0, 8);
  logMac("file.search.done", {
    cleanQuery,
    kind: options.kind || "",
    matchCount: matches.length,
    firstResults: matches.slice(0, 5).map((filePath) => ({ name: path.basename(filePath), path: filePath })),
  });
  return matches;
}

async function openLocalPath(filePath) {
  const error = await shell.openPath(filePath);
  if (error) {
    logMac("file.open.failed", { filePath, error });
    return { ok: false, error };
  }
  logMac("file.open.success", { filePath, name: path.basename(filePath) });
  return { ok: true };
}

async function frontWindowSummary() {
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      set windowTitle to ""
      try
        tell process frontApp
          set windowTitle to name of front window
        end tell
      end try
    end tell
    return frontApp & " — " & windowTitle
  `;
  const { stdout } = await execFileP("osascript", ["-e", script]);
  return stdout.trim();
}

function categoryForFile(fileName) {
  const lower = fileName.toLowerCase();
  const ext = path.extname(lower).slice(1);
  if (/^screen\s+shot|^screenshot|^screen\s+recording|^screenrecording/.test(lower)) return "Screenshots and Recordings";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "tiff", "bmp", "svg"].includes(ext)) return "Images";
  if (["mov", "mp4", "m4v", "avi", "mkv", "webm"].includes(ext)) return "Videos";
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext)) return "Audio";
  if (ext === "pdf") return "PDFs";
  if (["doc", "docx", "pages", "txt", "rtf", "md"].includes(ext)) return "Documents";
  if (["xls", "xlsx", "csv", "numbers", "tsv"].includes(ext)) return "Spreadsheets";
  if (["ppt", "pptx", "key"].includes(ext)) return "Presentations";
  if (["zip", "rar", "7z", "tar", "gz", "dmg", "pkg"].includes(ext)) return "Archives and Installers";
  if (["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "html", "css", "json", "xml", "yml", "yaml"].includes(ext)) return "Code";
  if (["fig", "psd", "ai", "sketch"].includes(ext)) return "Design";
  if (["url", "webloc", "inetloc"].includes(ext)) return "Links";
  return "Misc";
}

function shouldSkipDesktopEntry(fileName, stats) {
  if (!fileName || fileName.startsWith(".")) return true;
  if (fileName === ORGANIZED_FOLDER_NAME) return true;
  if (stats.isDirectory()) return true;
  if (!stats.isFile()) return true;
  return false;
}

async function uniquePath(targetPath) {
  const parsed = path.parse(targetPath);
  let candidate = targetPath;
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name} ${index}${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

async function writeOrganizeManifest(baseDir, manifest) {
  const manifestPath = path.join(baseDir, ORGANIZE_MANIFEST_NAME);
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

function desktopOrganizePaths() {
  const desktopDir = path.join(os.homedir(), "Desktop");
  const organizedDir = path.join(desktopDir, ORGANIZED_FOLDER_NAME);
  const manifestPath = path.join(organizedDir, ORGANIZE_MANIFEST_NAME);
  return { desktopDir, organizedDir, manifestPath };
}

function hasDesktopOrganizeManifest() {
  return fs.existsSync(desktopOrganizePaths().manifestPath);
}

function isDesktopOrganizeUndoIntent(text) {
  const raw = String(text || "").toLowerCase();
  const undoSignal = /\b(undo|reverse|restore|put back|move back)\b/.test(raw);
  if (!undoSignal) return false;
  if (/\b(organize|organisation|organization|desktop|files?|folders?|clean(?:ed)? up|sort(?:ed)?)\b/.test(raw)) return true;
  if (/\b(it|that|this|last|previous|everything|all|what you just did|whatever you just did)\b/.test(raw)) {
    return hasDesktopOrganizeManifest();
  }
  return false;
}

async function organizeDesktopFiles() {
  const { desktopDir, organizedDir } = desktopOrganizePaths();
  sendTaskProgress({ status: "thinking", text: "Scanning Desktop" });

  let entries = [];
  try {
    entries = await fs.promises.readdir(desktopDir);
  } catch (error) {
    return {
      ok: false,
      say: `I could not read your Desktop yet: ${error?.message || "permission issue"}.`,
    };
  }

  const filesToMove = [];
  for (const fileName of entries) {
    const sourcePath = path.join(desktopDir, fileName);
    let stats;
    try {
      stats = await fs.promises.lstat(sourcePath);
    } catch (_) {
      continue;
    }
    if (shouldSkipDesktopEntry(fileName, stats)) continue;
    filesToMove.push({ fileName, sourcePath, category: categoryForFile(fileName) });
  }

  if (!filesToMove.length) {
    sendTaskProgress({ status: "done", text: "Desktop already clean" });
    return { ok: true, say: "Your Desktop already looks clean. I did not find loose files to move." };
  }

  await fs.promises.mkdir(organizedDir, { recursive: true });
  const manifest = {
    createdAt: new Date().toISOString(),
    desktopDir,
    organizedDir,
    moves: [],
  };
  const counts = new Map();

  for (const item of filesToMove) {
    const categoryDir = path.join(organizedDir, item.category);
    await fs.promises.mkdir(categoryDir, { recursive: true });
    const destinationPath = await uniquePath(path.join(categoryDir, item.fileName));
    sendTaskProgress({ status: "thinking", text: `Moving ${item.fileName}` });
    await fs.promises.rename(item.sourcePath, destinationPath);
    manifest.moves.push({
      fileName: item.fileName,
      category: item.category,
      from: item.sourcePath,
      to: destinationPath,
    });
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }

  await writeOrganizeManifest(organizedDir, manifest);
  sendTaskProgress({ status: "done", text: `Organized ${manifest.moves.length} files` });

  const summary = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");
  return {
    ok: true,
    files: manifest.moves.map((move) => move.to),
    say: `Done. I organized ${manifest.moves.length} Desktop file${manifest.moves.length === 1 ? "" : "s"} into ${ORGANIZED_FOLDER_NAME}${summary ? `: ${summary}` : ""}. Existing folders were left alone, and I saved an undo manifest.`,
  };
}

async function undoDesktopOrganization() {
  const { organizedDir, manifestPath } = desktopOrganizePaths();
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, say: "I do not see a Braino organize manifest to undo." };
  }

  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const moves = Array.isArray(manifest.moves) ? manifest.moves.slice().reverse() : [];
  let restored = 0;
  const touchedDirs = new Set();
  for (const move of moves) {
    if (!move?.to || !move?.from || !fs.existsSync(move.to)) continue;
    const destinationPath = await uniquePath(move.from);
    sendTaskProgress({ status: "thinking", text: `Restoring ${path.basename(destinationPath)}` });
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.rename(move.to, destinationPath);
    touchedDirs.add(path.dirname(move.to));
    restored += 1;
  }
  try { await fs.promises.unlink(manifestPath); } catch (_) {}
  const dirs = Array.from(touchedDirs)
    .filter((dir) => {
      const relative = path.relative(organizedDir, dir);
      return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    })
    .sort((a, b) => b.length - a.length);
  for (const dir of dirs) {
    try {
      if ((await fs.promises.readdir(dir)).length === 0) await fs.promises.rmdir(dir);
    } catch (_) {}
  }
  try {
    if ((await fs.promises.readdir(organizedDir)).length === 0) await fs.promises.rmdir(organizedDir);
  } catch (_) {}
  sendTaskProgress({ status: "done", text: `Restored ${restored} files` });
  return {
    ok: true,
    say: `Done. I restored ${restored} file${restored === 1 ? "" : "s"} back to the Desktop.`,
  };
}

async function transcribeAudioCommand(payload = {}) {
  const audioBase64 = String(payload.audioBase64 || "").trim();
  const mimeType = String(payload.mimeType || "audio/webm").trim();
  if (!audioBase64) return { ok: false, error: "No audio was recorded." };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logMac("voice.transcribe.missing_supabase", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
    });
    return { ok: false, error: "Supabase is not configured for transcription." };
  }

  logMac("voice.transcribe.start", {
    mimeType,
    audioBytesApprox: Math.floor(audioBase64.length * 0.75),
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
  });
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/transcribe-and-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      mode: "lecture",
      audioBase64,
      fileName: "braino-mac-command.webm",
      mimeType,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    logMac("voice.transcribe.failed", {
      status: response.status,
      error: data?.error || null,
    });
    return { ok: false, error: data?.error || `Transcription failed (${response.status}).` };
  }

  const transcript = String(data?.transcript || "").trim();
  logMac("voice.transcribe.done", {
    transcriptChars: transcript.length,
    hasTranscript: Boolean(transcript),
  });
  return transcript
    ? { ok: true, transcript }
    : { ok: false, error: "The audio was recorded, but no speech was detected." };
}

function buildRealtimeSessionConfig() {
  return {
    type: "realtime",
    model: "gpt-realtime-mini",
    output_modalities: ["text"],
    instructions: [
      "You are Braino, running as a Mac desktop companion.",
      "Your job in this session is to listen accurately and let the Mac app execute actions.",
      "If the audio is unclear, silent, music, fan noise, or side chatter, output nothing rather than guessing.",
      "Always transcribe and reason in English unless the user explicitly asks for another language.",
      "Keep spoken responses short, warm, and direct.",
    ].join("\n"),
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        transcription: {
          model: "gpt-4o-transcribe",
          language: "en",
          prompt: [
            "Transcribe exactly what the user says.",
            "If the audio is unclear, silent, music/noise, or unrelated background speech, output nothing.",
            "Keep names, brands, URLs, file names, and code tokens intact.",
          ].join(" "),
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",
          create_response: false,
          interrupt_response: true,
        },
      },
      output: {
        voice: "marin",
      },
    },
  };
}

function getSdpStats(sdp) {
  const text = String(sdp || "");
  return {
    offerChars: text.length,
    hasVersionLine: /^v=0\r?$/m.test(text),
    mediaLineCount: (text.match(/^m=/gm) || []).length,
    hasAudioLine: /^m=audio\s/m.test(text),
    hasApplicationLine: /^m=application\s/m.test(text),
    endsWithLineBreak: /\r?\n$/.test(text),
  };
}

function normalizeRealtimeSdp(rawSdp) {
  const text = String(rawSdp || "");
  if (!text.trim()) return "";
  const withCrLf = text.replace(/\r?\n/g, "\r\n");
  return withCrLf.endsWith("\r\n") ? withCrLf : `${withCrLf}\r\n`;
}

function extractRealtimeClientSecret(payload) {
  if (typeof payload?.clientSecret === "string") return payload.clientSecret;
  if (typeof payload?.value === "string") return payload.value;
  const nested = payload?.client_secret;
  if (typeof nested === "string") return nested;
  if (nested && typeof nested === "object" && typeof nested.value === "string") return nested.value;
  return "";
}

function buildRealtimeClientSecretPayload(requestedModel) {
  return {
    session: {
      ...buildRealtimeSessionConfig(),
      model: requestedModel,
    },
  };
}

async function createRealtimeClientSecretFromSupabase({ authToken, requestedModel, voiceEngine }) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/openai-realtime-call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
      "X-Braino-Realtime-Model": requestedModel,
    },
    body: JSON.stringify({
      action: "client_secret",
      voiceEngine: voiceEngine || "fish",
    }),
  });
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (_) {}
  if (!response.ok) {
    return {
      ok: false,
      error: parsed?.details || parsed?.error || raw || `Realtime client secret failed (${response.status}).`,
    };
  }
  const clientSecret = extractRealtimeClientSecret(parsed);
  if (!clientSecret) {
    return { ok: false, error: "Realtime client secret response was missing the client secret." };
  }
  return {
    ok: true,
    clientSecret,
    sessionId: parsed?.sessionId || null,
    realtimeModel: parsed?.realtimeModel || requestedModel,
    transcriptionModel: parsed?.transcriptionModel || "gpt-4o-transcribe",
  };
}

async function createRealtimeClientSecretFromOpenAi({ requestedModel }) {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRealtimeClientSecretPayload(requestedModel)),
  });
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (_) {}
  if (!response.ok) {
    return {
      ok: false,
      error: parsed?.error?.message || parsed?.message || raw || `OpenAI realtime client secret failed (${response.status}).`,
    };
  }
  const clientSecret = extractRealtimeClientSecret(parsed);
  if (!clientSecret) {
    return { ok: false, error: "OpenAI realtime client secret response was missing the client secret." };
  }
  return {
    ok: true,
    clientSecret,
    sessionId: null,
    realtimeModel: requestedModel,
    transcriptionModel: "gpt-4o-transcribe",
  };
}

async function exchangeRealtimeOfferWithOpenAi({ sdp, clientSecret, requestedModel, transport }) {
  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      "Content-Type": "application/sdp",
    },
    body: sdp,
  });
  const answerSdp = await response.text();
  if (!response.ok) {
    let message = `OpenAI realtime failed (${response.status}).`;
    try {
      const parsed = JSON.parse(answerSdp);
      message = parsed?.error?.message || parsed?.message || message;
    } catch (_) {
      if (answerSdp) message = answerSdp;
    }
    logMac("realtime.create.openai_failed", {
      status: response.status,
      error: message,
      requestedModel,
      transport,
    });
    return { ok: false, error: message };
  }
  return { ok: true, answerSdp };
}

async function createRealtimeCall({ offerSdp, voiceEngine } = {}) {
  const sdp = normalizeRealtimeSdp(offerSdp);
  let authToken = await getBrainoAuthToken();
  logMac("realtime.create.start", {
    voiceEngine: voiceEngine || "fish",
    ...getSdpStats(sdp),
    hasBrainoAuthToken: Boolean(authToken),
    hasOpenAiApiKey: Boolean(OPENAI_API_KEY),
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
  });
  if (!sdp) {
    logMac("realtime.create.missing_sdp");
    return { ok: false, error: "Missing realtime offer SDP." };
  }

  const requestedModel = voiceEngine === "realtime" ? "gpt-realtime-2" : "gpt-realtime-mini";
  if (!authToken && !OPENAI_API_KEY && SUPABASE_URL && SUPABASE_ANON_KEY) {
    logMac("realtime.create.auth_required", { requestedModel });
    const authResult = await ensureBrainoAuth("realtime");
    if (!authResult?.ok) {
      logMac("realtime.create.auth_failed", { error: authResult?.error || "Authentication cancelled." });
      return { ok: false, error: authResult?.error || "Braino sign-in is required for realtime voice." };
    }
    authToken = await getBrainoAuthToken();
  }

  if (authToken && SUPABASE_URL && SUPABASE_ANON_KEY) {
    logMac("realtime.create.transport", {
      transport: "supabase-ephemeral",
      requestedModel,
    });
    const secretResult = await createRealtimeClientSecretFromSupabase({
      authToken,
      requestedModel,
      voiceEngine,
    });
    if (!secretResult?.ok) {
      logMac("realtime.create.client_secret_failed", {
        transport: "supabase-ephemeral",
        error: secretResult?.error || "missing client secret",
      });
      return { ok: false, error: secretResult?.error || "Realtime client secret failed." };
    }
    const exchange = await exchangeRealtimeOfferWithOpenAi({
      sdp,
      clientSecret: secretResult.clientSecret,
      requestedModel: secretResult.realtimeModel || requestedModel,
      transport: "supabase-ephemeral",
    });
    if (!exchange.ok) {
      return exchange;
    }
    logMac("realtime.create.supabase_ephemeral_ok", {
      sessionId: secretResult.sessionId || null,
      realtimeModel: secretResult.realtimeModel || requestedModel,
      transcriptionModel: secretResult.transcriptionModel || "gpt-4o-transcribe",
    });
    return {
      ok: true,
      answerSdp: exchange.answerSdp,
      transport: "supabase-ephemeral",
      sessionId: secretResult.sessionId || null,
      realtimeModel: secretResult.realtimeModel || requestedModel,
      transcriptionModel: secretResult.transcriptionModel || "gpt-4o-transcribe",
    };
  }

  if (!OPENAI_API_KEY) {
    logMac("realtime.create.missing_credentials", {
      hasBrainoAuthToken: Boolean(authToken),
      hasOpenAiApiKey: Boolean(OPENAI_API_KEY),
      envKeysPresent: Object.keys(ENV).filter((key) => /OPENAI|BRAINO_AUTH|SUPABASE/i.test(key)).sort(),
    });
    return {
      ok: false,
      error: "Realtime needs either BRAINO_AUTH_TOKEN for the Braino Supabase realtime endpoint or OPENAI_API_KEY for direct local realtime.",
    };
  }

  logMac("realtime.create.transport", {
    transport: "openai-direct-ephemeral",
    requestedModel,
  });
  const secretResult = await createRealtimeClientSecretFromOpenAi({
    requestedModel,
  });
  if (!secretResult?.ok) {
    logMac("realtime.create.client_secret_failed", {
      transport: "openai-direct-ephemeral",
      error: secretResult?.error || "missing client secret",
    });
    return { ok: false, error: secretResult?.error || "OpenAI realtime client secret failed." };
  }
  const exchange = await exchangeRealtimeOfferWithOpenAi({
    sdp,
    clientSecret: secretResult.clientSecret,
    requestedModel,
    transport: "openai-direct-ephemeral",
  });
  if (!exchange.ok) {
    return exchange;
  }

  logMac("realtime.create.openai_ok", {
    requestedModel,
  });
  return {
    ok: true,
    answerSdp: exchange.answerSdp,
    transport: "openai-direct-ephemeral",
    sessionId: null,
    realtimeModel: requestedModel,
    transcriptionModel: "gpt-4o-transcribe",
  };
}

async function updateRealtimeSession({ action, sessionId, reason } = {}) {
  const normalizedAction = String(action || "").trim().toLowerCase();
  const id = String(sessionId || "").trim();
  const authToken = await getBrainoAuthToken();
  if (!authToken || !SUPABASE_URL || !SUPABASE_ANON_KEY || !id) {
    logMac("realtime.session.skip", {
      action: normalizedAction,
      hasSessionId: Boolean(id),
      hasBrainoAuthToken: Boolean(authToken),
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
    });
    return { ok: false, error: "Realtime session tracking is not configured." };
  }
  if (!["heartbeat", "end"].includes(normalizedAction)) {
    return { ok: false, error: "Unsupported realtime session action." };
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/openai-realtime-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      action: normalizedAction,
      sessionId: id,
      reason: String(reason || "mac_client").trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  logMac(response.ok ? "realtime.session.ok" : "realtime.session.failed", {
    action: normalizedAction,
    status: response.status,
    sessionId: id,
    error: data?.error || null,
  });
  return response.ok
    ? { ok: true, ...data }
    : { ok: false, error: data?.error || `Realtime session update failed (${response.status}).` };
}

function rememberMacChat(role, content) {
  const text = String(content || "").trim();
  if (!text) return;
  macChatHistory.push({ role, content: text });
  if (macChatHistory.length > 18) macChatHistory = macChatHistory.slice(-18);
}

function macClientContext() {
  const now = new Date();
  let clientTimeZone = null;
  try {
    clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (_) {}
  return {
    clientTimeZone,
    clientUtcOffsetMinutes: now.getTimezoneOffset(),
    clientLocalTime: now.toISOString(),
  };
}

async function runMacConversation(prompt) {
  const startedAt = Date.now();
  const authToken = await getBrainoAuthToken();
  const auth = authStatusPayload();
  const context = macClientContext();
  const body = {
    notes: "",
    message: prompt,
    responseMedium: "voice",
    chatHistory: macChatHistory.slice(-14),
    pageContext: {
      title: "Braino on Mac",
      url: "braino://mac",
      text: [
        "The user is talking to Braino from the Mac desktop companion.",
        "This is normal conversation unless the user asks for a concrete Mac action.",
        "Keep replies short, warm, alive, and natural for spoken voice.",
      ].join("\n"),
    },
    userId: auth.userId || null,
    driveConnected: false,
    ...context,
  };

  logMac("mac.chat.start", {
    promptChars: prompt.length,
    historyTurns: body.chatHistory.length,
    hasBrainoAuthToken: Boolean(authToken),
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: true,
      say: "I am here. The chat line is not connected yet on this Mac build, but I am listening.",
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      logMac("mac.chat.failed", {
        status: response.status,
        error: data?.error || null,
      });
      return {
        ok: true,
        say: "I am here. That reply got stuck on the way back. Say it again and I will catch it.",
      };
    }
    const reply = String(data?.reply || "").trim() || "I am here.";
    rememberMacChat("user", prompt);
    rememberMacChat("assistant", reply);
    logMac("mac.chat.done", {
      replyChars: reply.length,
      historyTurns: macChatHistory.length,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, say: reply };
  } catch (error) {
    logMac("mac.chat.error", { error, durationMs: Date.now() - startedAt });
    return {
      ok: true,
      say: "I am here. The chat wire slipped for a second, but I am listening.",
    };
  }
}

async function runDelegate(prompt) {
  const raw = cleanPrompt(prompt);
  const text = raw.toLowerCase();
  logMac("delegate.intent.start", {
    prompt: textForLog(prompt),
    cleaned: textForLog(raw),
  });
  if (!raw) return { ok: false, say: "Say the task again, my guy. I got air." };

  if (isMacSkillsPrompt(text)) {
    return { ok: true, say: MAC_SKILLS_REPLY };
  }

  if (isDesktopOrganizeUndoIntent(text)) {
    return undoDesktopOrganization();
  }

  if (/\b(organize|organise|clean up|cleanup|tidy|sort)\b.*\b(my\s+)?(desktop|files?|desktop files?)\b/.test(text)
    || /\bdesktop\b.*\b(messy|cluttered|chaos|clean)\b/.test(text)) {
    return organizeDesktopFiles();
  }

  if (/\b(quit|exit|close braino|hide braino)\b/.test(text)) {
    if (dockWindow && !dockWindow.isDestroyed()) dockWindow.hide();
    return { ok: true, say: "Done. I am still around, just hiding." };
  }

  if (/\b(accessibility|permissions|input monitoring)\b/.test(text)) {
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
    return { ok: true, say: "Opening Accessibility settings. Give Braino permission there, then double Control gets much cleaner." };
  }

  if (/\b(what do you see|what is open|front window|current app|active app)\b/.test(text)) {
    const summary = await frontWindowSummary();
    return { ok: true, say: summary ? `I see ${summary}.` : "I could not read the front window yet." };
  }

  const folder = extractAfter(raw, [
    /\bopen\s+(?:my\s+)?(downloads|documents|desktop|applications|home)\s*(?:folder)?$/i,
  ]);
  if (folder) {
    const folders = {
      downloads: path.join(os.homedir(), "Downloads"),
      documents: path.join(os.homedir(), "Documents"),
      desktop: path.join(os.homedir(), "Desktop"),
      applications: "/Applications",
      home: os.homedir(),
    };
    logMac("delegate.folder_intent", { folder: folder.toLowerCase(), targetPath: folders[folder.toLowerCase()] });
    await shell.openPath(folders[folder.toLowerCase()]);
    return { ok: true, say: `Opened ${folder}.` };
  }

  const urlTarget = extractAfter(raw, [
    /\b(?:open|go to|navigate to|visit)\s+(\S+\.\S+|https?:\/\/\S+)/i,
  ]);
  if (urlTarget && isLikelyUrl(urlTarget)) {
    const url = toUrl(urlTarget);
    logMac("delegate.url_intent", { raw: textForLog(raw), url });
    await openChromeUrl(url);
    return { ok: true, say: `Opening ${urlTarget} in Chrome.` };
  }

  const webQuery = extractAfter(raw, [
    /\b(?:google|search google for|search the web for|look up|find online)\s+(.+)$/i,
    /\b(?:open chrome and search|search chrome for)\s+(.+)$/i,
  ]);
  if (webQuery) {
    logMac("delegate.web_search_intent", { query: textForLog(webQuery) });
    await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(webQuery)}`);
    return { ok: true, say: `Searching Chrome for ${webQuery}.` };
  }

  const fileIntent = parseFileIntent(raw);
  if (fileIntent) {
    logMac("delegate.file_intent", {
      raw: textForLog(raw),
      query: fileIntent.query,
      kind: fileIntent.kind || "",
      shouldOpen: fileIntent.shouldOpen,
    });
    const files = await findFiles(fileIntent.query, { kind: fileIntent.kind });
    if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${fileIntent.query}.` };
    if (fileIntent.shouldOpen) {
      const opened = await openLocalPath(files[0]);
      if (!opened.ok) return { ok: false, say: `I found ${path.basename(files[0])}, but macOS would not open it: ${opened.error}.`, files };
      return { ok: true, say: `Opened ${path.basename(files[0])}.`, files };
    }
    return {
      ok: true,
      say: `I found ${files.length} match${files.length === 1 ? "" : "es"}. The first one is ${path.basename(files[0])}.`,
      files,
    };
  }

  const appName = extractAfter(raw, [
    /\b(?:open|launch|start)\s+(?:the\s+)?(?:app\s+)?([A-Za-z][\w\s.&-]{0,60}?)(?:\s+app)?(?:\s+for\s+me)?$/i,
  ]);
  if (appName && !isLikelyUrl(appName)) {
    const target = cleanOpenTarget(appName);
    logMac("delegate.open_intent", { raw: textForLog(raw), target });
    const appResult = await openApp(target);
    if (appResult.ok) {
      return { ok: true, say: `Opening ${appResult.appName || target}.` };
    }
    const website = commonWebTargetFor(target);
    if (website) {
      logMac("delegate.open_web_fallback", {
        target,
        website,
        appError: appResult.error || "",
      });
      await openChromeUrl(website);
      const host = new URL(website).hostname.replace(/^www\./, "");
      return { ok: true, say: `I did not find a Mac app for ${target}, so I opened ${host}.` };
    }
    const files = await findFiles(target, { kind: "" });
    if (files.length) {
      const opened = await openLocalPath(files[0]);
      if (!opened.ok) return { ok: false, say: `I found ${path.basename(files[0])}, but macOS would not open it: ${opened.error}.`, files };
      return { ok: true, say: `Opened ${path.basename(files[0])}.`, files };
    }
  }

  if (/\bchrome\b|\bbrowser\b|\bsearch\b|\bopen\b/.test(text)) {
    logMac("delegate.generic_browser_fallback", { raw: textForLog(raw) });
    await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(raw)}`);
    return { ok: true, say: "I do not know that exact move yet, so I searched it in Chrome." };
  }

  return runMacConversation(raw);
}

ipcMain.handle("braino-mac:get-config", () => {
  const auth = authStatusPayload();
  return {
    appVersion: APP_VERSION,
    displayMetrics: getDisplayMetrics(),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    realtimeConfigured: Boolean((auth.authenticated && SUPABASE_URL && SUPABASE_ANON_KEY) || OPENAI_API_KEY),
    realtimeAuthSource: auth.source === "env" || auth.source === "stored" ? "braino" : OPENAI_API_KEY ? "openai" : "missing",
    auth,
    accessibilityTrusted: systemPreferences.isTrustedAccessibilityClient(false),
    microphoneStatus: process.platform === "darwin" ? systemPreferences.getMediaAccessStatus("microphone") : "unsupported",
    logPath: LOG_PATH,
  };
});

ipcMain.handle("braino-mac:delegate", async (_event, prompt) => runDelegate(prompt));

ipcMain.handle("braino-mac:log", async (_event, payload = {}) => {
  logMac(String(payload?.event || "renderer.log"), payload?.data || {});
  return { ok: true, logPath: LOG_PATH };
});

ipcMain.handle("braino-mac:auth-status", async () => authStatusPayload());

ipcMain.handle("braino-mac:auth-sign-out", async () => {
  clearAuthSession();
  return { ok: true, ...authStatusPayload() };
});

ipcMain.handle("braino-mac:ensure-auth", async (_event, reason) => ensureBrainoAuth(String(reason || "realtime")));

ipcMain.handle("braino-mac:native-listen", async () => runNativeSpeech());

ipcMain.handle("braino-mac:native-listen-stop", () => {
  stopNativeSpeech();
  return { ok: true };
});

ipcMain.handle("braino-mac:transcribe-audio", async (_event, payload) => transcribeAudioCommand(payload));

ipcMain.handle("braino-mac:create-realtime-call", async (_event, payload) => createRealtimeCall(payload));

ipcMain.handle("braino-mac:update-realtime-session", async (_event, payload) => updateRealtimeSession(payload));

ipcMain.handle("braino-mac:request-accessibility", () => ({
  accessibilityTrusted: requestAccessibilityTrust(true),
}));

ipcMain.handle("braino-mac:request-microphone", async () => requestMicrophoneAccess());

ipcMain.on("braino-mac:set-mouse-passthrough", (_event, passthrough) => {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  dockWindow.setIgnoreMouseEvents(Boolean(passthrough), { forward: true });
});

ipcMain.handle("braino-mac:tts-config", () => ({
  ok: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
  endpoint: SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/fish-audio-tts` : "",
  anonKey: SUPABASE_ANON_KEY || "",
}));

ipcMain.handle("braino-mac:tts", async (_event, text) => {
  const speakable = String(text || "").trim();
  if (!speakable) return { ok: false, error: "empty" };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "missing_supabase" };
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/fish-audio-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ text: speakable }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false, error: body || `tts_${response.status}` };
  }
  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { ok: true, dataUrl: `data:${contentType};base64,${base64}` };
});

ipcMain.handle("braino-mac:system-say", async (_event, text) => {
  const speakable = String(text || "").trim();
  if (!speakable) return { ok: false };
  execFile("say", [speakable.slice(0, 900)], () => {});
  return { ok: true };
});

app.whenReady().then(() => {
  const auth = authStatusPayload();
  logMac("app.ready", {
    appVersion: APP_VERSION,
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
    hasBrainoAuthToken: Boolean(auth.authenticated),
    brainoAuthSource: auth.source,
    hasOpenAiApiKey: Boolean(OPENAI_API_KEY),
    envKeysPresent: Object.keys(ENV).filter((key) => /OPENAI|BRAINO_AUTH|SUPABASE/i.test(key)).sort(),
    logPath: LOG_PATH,
  });
  requestAccessibilityTrust(true);
  createDockWindow();
  registerHotkeys();
  startSwiftHotkeyHelper();
  screen.on("display-metrics-changed", positionDockWindow);
  screen.on("display-added", positionDockWindow);
  screen.on("display-removed", positionDockWindow);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopNativeSpeech();
  if (swiftHotkey) {
    try { swiftHotkey.kill(); } catch (_) {}
  }
});

app.on("window-all-closed", () => {
  // Keep the menu-barless companion process alive while Braino is on screen.
});
