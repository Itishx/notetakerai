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
const APP_VERSION = "12.0.16";
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
  return String(input || "")
    .replace(/^(?:hey\s+|ok(?:ay)?\s+|yo\s+)?(?:braino|bruno|breno|reno)[,\s]+/i, "")
    .replace(/^(?:can|could|will|would)\s+you\s+(?:please\s+)?/i, "")
    .replace(/^please\s+/i, "")
    .trim();
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

async function openChromeUrl(url) {
  await execFileP("open", ["-a", "Google Chrome", url]);
}

async function openApp(appName) {
  await execFileP("open", ["-a", appName]);
}

function mdfindExpression(query) {
  const escaped = String(query || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
  return `kMDItemDisplayName == "*${escaped}*"cd || kMDItemTextContent == "*${escaped}*"cd`;
}

async function findFiles(query) {
  const result = await execFileP("mdfind", [mdfindExpression(query)], { timeout: 12000 });
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !/\/Library\/|\/node_modules\/|\/\.git\//.test(filePath))
    .slice(0, 8);
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

async function organizeDesktopFiles() {
  const desktopDir = path.join(os.homedir(), "Desktop");
  const organizedDir = path.join(desktopDir, ORGANIZED_FOLDER_NAME);
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
  const desktopDir = path.join(os.homedir(), "Desktop");
  const organizedDir = path.join(desktopDir, ORGANIZED_FOLDER_NAME);
  const manifestPath = path.join(organizedDir, ORGANIZE_MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, say: "I do not see a Braino organize manifest to undo." };
  }

  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const moves = Array.isArray(manifest.moves) ? manifest.moves.slice().reverse() : [];
  let restored = 0;
  for (const move of moves) {
    if (!move?.to || !move?.from || !fs.existsSync(move.to)) continue;
    const destinationPath = await uniquePath(move.from);
    sendTaskProgress({ status: "thinking", text: `Restoring ${path.basename(destinationPath)}` });
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.rename(move.to, destinationPath);
    restored += 1;
  }
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

async function runDelegate(prompt) {
  const raw = cleanPrompt(prompt);
  const text = raw.toLowerCase();
  if (!raw) return { ok: false, say: "Say the task again, my guy. I got air." };

  if (/\b(undo|reverse|restore)\b.*\b(organize|organization|desktop|files?)\b/.test(text)) {
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
    await shell.openPath(folders[folder.toLowerCase()]);
    return { ok: true, say: `Opened ${folder}.` };
  }

  const appName = extractAfter(raw, [
    /\bopen\s+(?:the\s+)?(?:app\s+)?([A-Za-z][\w\s.&-]{1,40})\s+app$/i,
    /\bopen\s+(Chrome|Google Chrome|Safari|Finder|Xcode|Cursor|Spotify|Slack|Notion|Terminal|Mail|Calendar|Notes)\b/i,
  ]);
  if (appName) {
    await openApp(appName);
    return { ok: true, say: `Opening ${appName}.` };
  }

  const urlTarget = extractAfter(raw, [
    /\b(?:open|go to|navigate to|visit)\s+(\S+\.\S+|https?:\/\/\S+)/i,
  ]);
  if (urlTarget && isLikelyUrl(urlTarget)) {
    const url = toUrl(urlTarget);
    await openChromeUrl(url);
    return { ok: true, say: `Opening ${urlTarget} in Chrome.` };
  }

  const webQuery = extractAfter(raw, [
    /\b(?:google|search google for|search the web for|look up|find online)\s+(.+)$/i,
    /\b(?:open chrome and search|search chrome for)\s+(.+)$/i,
  ]);
  if (webQuery) {
    await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(webQuery)}`);
    return { ok: true, say: `Searching Chrome for ${webQuery}.` };
  }

  const fileQuery = extractAfter(raw, [
    /\b(?:find|search for|look for|open)\s+(?:my\s+)?(?:file|document|pdf|doc|docx|ppt|spreadsheet|sheet|presentation|note)s?\s+(?:called|named|about|for)?\s*(.+)$/i,
    /\b(?:find|open)\s+(.+?)\s+(?:file|document|pdf|doc|docx|ppt|spreadsheet|sheet|presentation|note)s?$/i,
  ]);
  if (fileQuery) {
    const files = await findFiles(fileQuery);
    if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${fileQuery}.` };
    if (/\bopen\b/i.test(raw)) {
      await shell.openPath(files[0]);
      return { ok: true, say: `Opened ${path.basename(files[0])}.`, files };
    }
    return {
      ok: true,
      say: `I found ${files.length} match${files.length === 1 ? "" : "es"}. The first one is ${path.basename(files[0])}.`,
      files,
    };
  }

  if (/\bchrome\b|\bbrowser\b|\bsearch\b|\bopen\b/.test(text)) {
    await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(raw)}`);
    return { ok: true, say: "I do not know that exact move yet, so I searched it in Chrome." };
  }

  return {
    ok: true,
    say: "I am here. I can tidy your Desktop, open apps, search Chrome, find documents, open files, or tell you what window is in front. Give me a real task and I will move.",
  };
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
