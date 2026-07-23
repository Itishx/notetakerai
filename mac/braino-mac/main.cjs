const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen, shell, systemPreferences } = require("electron");
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
const APP_VERSION = "12.0.41";
const ORGANIZED_FOLDER_NAME = "Braino Organized";
const ORGANIZE_MANIFEST_NAME = ".braino-last-organize.json";
const LOG_DIR = path.join(os.homedir(), "Library", "Logs", "Braino Mac");
const LOG_PATH = path.join(LOG_DIR, "braino-mac.log");
const AUTH_STORE_DIR = path.join(os.homedir(), "Library", "Application Support", "Braino Mac");
const AUTH_STORE_PATH = path.join(AUTH_STORE_DIR, "auth-session.json");
const FILE_ACTION_HISTORY_PATH = path.join(AUTH_STORE_DIR, "file-actions.json");
const FILE_ACTION_CONFIRM_MS = 120000;
const MAC_WORKFLOW_CONFIRM_MS = 300000;
const MAX_FILE_ACTION_HISTORY = 80;
const AUTH_CALLBACK_PATH = "/braino-mac-auth-callback";
const {
  resolveWebTarget,
  resolveAppTarget,
  extractCloseShortcutTarget,
} = require(path.join(ROOT_DIR, "extension", "lib", "openTargets.cjs"));

let dockWindow = null;
let swiftHotkey = null;
let activeSpeech = null;
let lastControlTapAt = 0;
let cachedAuthSession = null;
let pendingAuthWaiters = [];
let authBrowserFlow = null;
let macChatHistory = [];
let pendingFileConfirmation = null;
let pendingMacWorkflow = null;
let lastSpotifyReconnectAt = 0;
const SPOTIFY_RECONNECT_COOLDOWN_MS = 10 * 60 * 1000;
let activeMacContext = null;
let overlaySyncTimer = null;
let lastOverlayDisplayKey = "";
let lastOverlayContextKey = "";
let lastOverlayStateSentAt = 0;
let dockWindowHiddenByUser = false;
let lastOverlayRaiseLogAt = 0;

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
const MAC_TEAM_DEMO_TRACK_URI = "spotify:track:5EKEFHtqsOW0lTxqh8BhlI";
const MAC_TEAM_DEMO_TRACK_START_MS = 52000;
const MAC_TEAM_DEMO_ARTICLE_URL = "https://medium.com/towards-deep-learning/google-just-changed-everything-for-machine-learning-on-spreadsheets-afbda2eea8c8";
const MAC_TEAM_DEMO_LAUNCH_URL = "https://www.trybraino.com/";

const RAW_CONSOLE = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

function isStdioWriteError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  return (
    code === "EIO" ||
    code === "EPIPE" ||
    code === "ERR_STREAM_DESTROYED" ||
    /\bwrite\s+(EIO|EPIPE)\b/i.test(message)
  );
}

function appendMacLogLine(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch (_) {}
}

function guardStdioStream(stream, label) {
  if (!stream || typeof stream.write !== "function") return;
  const originalWrite = stream.write.bind(stream);
  stream.write = (...args) => {
    try {
      return originalWrite(...args);
    } catch (error) {
      if (isStdioWriteError(error)) {
        appendMacLogLine(`[${new Date().toISOString()}] stdio.${label}.write_failed ${String(error?.message || error)}\n`);
        return false;
      }
      throw error;
    }
  };
  if (typeof stream.on === "function") {
    stream.on("error", (error) => {
      appendMacLogLine(`[${new Date().toISOString()}] stdio.${label}.error ${String(error?.message || error)}\n`);
    });
  }
}

function safeConsole(method, ...args) {
  try {
    const fn = RAW_CONSOLE[method] || RAW_CONSOLE.log;
    fn(...args);
  } catch (error) {
    if (!isStdioWriteError(error)) {
      appendMacLogLine(`[${new Date().toISOString()}] console.${method}.failed ${String(error?.message || error)}\n`);
    }
  }
}

guardStdioStream(process.stdout, "stdout");
guardStdioStream(process.stderr, "stderr");
for (const method of Object.keys(RAW_CONSOLE)) {
  console[method] = (...args) => safeConsole(method, ...args);
}

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
    appendMacLogLine(line);
  } catch (_) {}
  safeConsole("log", "[Braino Mac]", event, sanitizeForLog(payload));
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
  if (!safeFragment || process.platform !== "darwin") return { ok: false, attemptedBrowsers: 0 };

  const browsers = ["Google Chrome", "Google Chrome Beta", "Google Chrome Canary", "Microsoft Edge", "Brave Browser", "Arc"];
  let attemptedBrowsers = 0;
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
      attemptedBrowsers += 1;
      logMac("auth.browser_tabs.close_attempted", { browser, fragment });
    } catch (error) {
      logMac("auth.browser_tabs.close_failed", { browser, error });
    }
  }
  return { ok: true, attemptedBrowsers };
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
  try {
    dockWindow.webContents.send(channel, payload);
  } catch (error) {
    logMac("renderer.send.failed", { channel, error });
  }
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

function getDisplayMetrics(display = screen.getPrimaryDisplay()) {
  const { bounds, workArea, scaleFactor } = display;
  const dockHeight = Math.max(0, (bounds.y + bounds.height) - (workArea.y + workArea.height));
  const dockTop = dockHeight > 0
    ? workArea.y - bounds.y + workArea.height
    : bounds.height - 94;
  return {
    id: display.id,
    bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    workArea: { x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height },
    scaleFactor,
    dockTop,
    dockHeight,
  };
}

function parseNumberPair(value) {
  const [left, right] = String(value || "")
    .split(",")
    .map((part) => Number(part.trim()));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return [left, right];
}

function normalizeActiveMacContext(parts = []) {
  const appName = String(parts[0] || "").trim();
  if (!appName) return null;
  const bundleId = String(parts[1] || "").trim();
  const windowTitle = String(parts[2] || "").trim();
  const position = parseNumberPair(parts[3]);
  const size = parseNumberPair(parts[4]);
  const browserTitle = String(parts[5] || "").trim();
  const browserUrl = String(parts[6] || "").trim();
  const windowBounds = position && size && size[0] > 0 && size[1] > 0
    ? { x: position[0], y: position[1], width: size[0], height: size[1] }
    : null;
  return {
    appName,
    bundleId,
    windowTitle,
    windowBounds,
    browserTitle,
    browserUrl,
    isBrowser: Boolean(browserUrl),
    updatedAt: new Date().toISOString(),
  };
}

function isBrainoSelfContext(context) {
  const text = `${context?.appName || ""} ${context?.windowTitle || ""} ${context?.bundleId || ""}`;
  return /Braino Mac/i.test(text) || /vite_react_shadcn_ts/i.test(text);
}

async function readActiveMacContext() {
  if (process.platform !== "darwin") return null;
  const script = `
set frontApp to ""
set windowTitle to ""
set windowPositionText to ""
set windowSizeText to ""
tell application "System Events"
  try
    set frontProc to first application process whose frontmost is true
    set frontApp to name of frontProc as text
    try
      tell frontProc
        if (count of windows) > 0 then
          set windowTitle to name of window 1 as text
          set {wx, wy} to position of window 1
          set {ww, wh} to size of window 1
          set windowPositionText to (wx as text) & "," & (wy as text)
          set windowSizeText to (ww as text) & "," & (wh as text)
        end if
      end tell
    end try
  end try
end tell
set AppleScript's text item delimiters to tab
return {frontApp, "", windowTitle, windowPositionText, windowSizeText, "", ""} as text`;

  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 3500 });
    const context = normalizeActiveMacContext(String(stdout || "").trimEnd().split("\t"));
    if (!context) return null;
    const browser = await readActiveBrowserContext(context.appName);
    if (browser?.browserUrl || browser?.browserTitle) {
      context.browserTitle = browser.browserTitle || "";
      context.browserUrl = browser.browserUrl || "";
      context.isBrowser = Boolean(browser.browserUrl);
    }
    return context;
  } catch (error) {
    logMac("desktop.context.read_failed", { error });
    return null;
  }
}

async function readActiveBrowserContext(appName) {
  const browser = String(appName || "").trim();
  if (!["Google Chrome", "Brave Browser", "Microsoft Edge", "Safari"].includes(browser)) {
    return null;
  }
  const script = browser === "Safari"
    ? 'tell application "Safari" to return (name of front document as text) & (ASCII character 9) & (URL of front document as text)'
    : `tell application "${escapeAppleScriptString(browser)}" to return (title of active tab of window 1 as text) & (ASCII character 9) & (URL of active tab of window 1 as text)`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 2500 });
    const [browserTitle = "", browserUrl = ""] = String(stdout || "").trimEnd().split("\t");
    return {
      browserTitle: browserTitle.trim(),
      browserUrl: browserUrl.trim(),
    };
  } catch (error) {
    logMac("desktop.browser_context.read_failed", { appName: browser, error });
    return null;
  }
}

function displayForContext(context) {
  if (context?.windowBounds) {
    try {
      return screen.getDisplayMatching(context.windowBounds);
    } catch (_) {}
  }
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  } catch (_) {
    return screen.getPrimaryDisplay();
  }
}

function overlayDisplayKey(display) {
  const b = display?.bounds || {};
  return [display?.id || "", b.x, b.y, b.width, b.height].join(":");
}

function overlayContextKey(context) {
  if (!context) return "";
  return [
    context.appName || "",
    context.windowTitle || "",
    context.browserTitle || "",
    context.browserUrl || "",
    context.windowBounds ? `${context.windowBounds.x},${context.windowBounds.y},${context.windowBounds.width},${context.windowBounds.height}` : "",
  ].join("::");
}

function sendOverlayState(reason, display = displayForContext(activeMacContext)) {
  const displayMetrics = getDisplayMetrics(display || screen.getPrimaryDisplay());
  lastOverlayStateSentAt = Date.now();
  sendToRenderer("braino-mac:overlay-context", {
    reason,
    activeContext: activeMacContext,
    displayMetrics,
  });
}

function raiseDockWindow(reason = "raise") {
  if (!dockWindow || dockWindow.isDestroyed() || dockWindowHiddenByUser) return;
  try {
    dockWindow.setFocusable(false);
    dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    dockWindow.setAlwaysOnTop(false);
    dockWindow.setAlwaysOnTop(true, "screen-saver", 1);
    if (!dockWindow.isVisible()) dockWindow.showInactive();
    dockWindow.moveTop?.();
    const now = Date.now();
    if (reason !== "poll" || now - lastOverlayRaiseLogAt > 10000) {
      lastOverlayRaiseLogAt = now;
      logMac("overlay.raise", {
        reason,
        visible: dockWindow.isVisible(),
        focused: dockWindow.isFocused(),
        appName: activeMacContext?.appName || "",
      });
    }
  } catch (error) {
    logMac("overlay.raise.failed", { reason, error });
  }
}

function positionDockWindow(display = displayForContext(activeMacContext), reason = "position", options = {}) {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  const targetDisplay = display || screen.getPrimaryDisplay();
  const { bounds } = targetDisplay;
  const key = overlayDisplayKey(targetDisplay);
  if (key !== lastOverlayDisplayKey) {
    dockWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }, false);
    lastOverlayDisplayKey = key;
  }
  raiseDockWindow(reason);
  if (options.notify !== false) sendOverlayState(reason, targetDisplay);
}

function ensureDockWindowVisible(reason = "show") {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  dockWindowHiddenByUser = false;
  positionDockWindow(displayForContext(activeMacContext), reason);
}

async function refreshDesktopOverlayContext(reason = "poll") {
  const context = await readActiveMacContext();
  if (context && !isBrainoSelfContext(context)) {
    activeMacContext = context;
  }
  const display = displayForContext(activeMacContext);
  const contextKey = overlayContextKey(activeMacContext);
  const displayKey = overlayDisplayKey(display);
  const displayChanged = Boolean(displayKey && displayKey !== lastOverlayDisplayKey);
  let contextChanged = false;
  if (contextKey && contextKey !== lastOverlayContextKey) {
    lastOverlayContextKey = contextKey;
    contextChanged = true;
    logMac("desktop.context.changed", {
      reason,
      appName: activeMacContext?.appName || "",
      windowTitle: textForLog(activeMacContext?.windowTitle || activeMacContext?.browserTitle || ""),
      browserUrl: textForLog(activeMacContext?.browserUrl || ""),
      displayId: display?.id || null,
    });
  }
  const shouldNotifyRenderer =
    reason !== "poll" ||
    contextChanged ||
    displayChanged ||
    Date.now() - lastOverlayStateSentAt > 30000;
  positionDockWindow(display, reason, { notify: shouldNotifyRenderer });
}

function startDesktopOverlaySync() {
  if (overlaySyncTimer) clearInterval(overlaySyncTimer);
  void refreshDesktopOverlayContext("startup");
  overlaySyncTimer = setInterval(() => {
    void refreshDesktopOverlayContext("poll");
  }, 900);
}

function createDockWindow() {
  const initialDisplay = displayForContext(activeMacContext);
  const initialBounds = initialDisplay.bounds;
  dockWindow = new BrowserWindow({
    type: "panel",
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
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
    focusable: false,
    title: "Braino Mac",
    show: false,
    acceptFirstMouse: true,
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

  app.dock?.hide?.();
  dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  dockWindow.setAlwaysOnTop(true, "screen-saver", 1);
  dockWindow.setFocusable(false);
  dockWindow.setIgnoreMouseEvents(true, { forward: true });
  dockWindow.once("ready-to-show", () => {
    positionDockWindow(initialDisplay, "ready-to-show");
  });
  dockWindow.on("blur", () => {
    positionDockWindow(undefined, "blur");
  });
  positionDockWindow(initialDisplay, "create");
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
    ensureDockWindowVisible("voice-hotkey");
    return;
  }
  lastControlTapAt = now;
}

function toggleDockWindowVisibility(source) {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  if (dockWindow.isVisible()) {
    dockWindowHiddenByUser = true;
    dockWindow.hide();
    return;
  }
  ensureDockWindowVisible("visibility-toggle");
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
      ensureDockWindowVisible("voice-hotkey");
    }),
    herToggle: globalShortcut.register("CommandOrControl+Shift+H", () => {
      sendToRenderer("braino-mac:her-toggle", { source: "Command+Shift+H" });
      ensureDockWindowVisible("her-hotkey");
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
        ensureDockWindowVisible("voice-hotkey");
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
  "2. I can bulk organize Desktop files by type, date, or project.",
  "3. I can undo the last file action I performed.",
  "4. I can create folders on Desktop, Documents, Downloads, Pictures, Movies, Music, or Home.",
  "5. I can rename files and folders.",
  "6. I can move files or folders into another folder.",
  "7. I can delete files or folders only after explicit confirmation, then restore them with undo.",
  "8. I can find files on this Mac with Spotlight.",
  "9. I can open the best matching file when you ask for it.",
  "10. I can open installed Mac apps by name, and fall back to the right website for common services.",
  "11. I can close apps or matching browser tabs for the services I opened.",
  "12. I can play songs, pause/resume, skip, change volume, and add tracks to liked songs or playlists through Spotify.",
  "13. I can create notes in Apple Notes, asking what to write if you do not say it upfront.",
  "14. I can send or draft email in Apple Mail, resolving contact names through Contacts when possible.",
].join("\n");

function isMacSkillsPrompt(text) {
  const raw = String(text || "").toLowerCase();
  return /\b(mac skills?|macbook skills?|local skills?|desktop skills?|mac capabilities|what can you do on (?:my\s+)?mac|what can you do locally)\b/.test(raw)
    || (/\bwhat can you do\b/.test(raw) && /\b(mac|macbook|desktop|files?|locally|computer|system)\b/.test(raw));
}

function appleScriptStringLiteral(value) {
  const lines = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (!lines.length) return '""';
  return lines.map((line) => `"${escapeAppleScriptString(line)}"`).join(" & linefeed & ");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlForNotesBody(value) {
  const blocks = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.split("\n").map(escapeHtml).join("<br>"))
    .filter((block) => block.trim());
  return `<div>${blocks.length ? blocks.join("</div><div><br></div><div>") : " "}</div>`;
}

function cleanNoteContent(value) {
  let text = String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\bnode\b/gi, "note")
    .replace(/\bnodes\b/gi, "notes")
    .replace(/^(?:i\s+(?:would\s+)?like\s+to\s+)?(?:talk|write|remember)\s+(?:about|that)\s*/i, "")
    .replace(/^(?:about|that|saying|with|content|body|text)\s+/i, "")
    .replace(/\s+(?:for me|please|pls)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  for (let index = 0; index < 4; index += 1) {
    const before = text;
    text = text
      .replace(/^(?:i\s+(?:would\s+)?like\s+(?:the\s+)?note\s+to\s+(?:say|be|read))\s*[:\-]?\s*/i, "")
      .replace(/^(?:the\s+)?note\s+(?:should\s+)?(?:say|be|read)\s*[:\-]?\s*/i, "")
      .replace(/^(?:say|write|put)\s+(?:in\s+)?(?:the\s+)?note\s*[:\-]?\s*/i, "")
      .replace(/^(?:i\s+(?:would\s+)?like\s+to\s+)?(?:create|make|write|take|add)\s+(?:a\s+)?(?:new\s+)?note\s+(?:about|that|saying|with|for)?\s*/i, "")
      .replace(/^(?:the\s+)?(?:note|content|body|text)\s+(?:is|should be)\s*[:\-]?\s*/i, "")
      .trim();
    if (text === before) break;
  }
  text = text
    .replace(/\b(?:the\s+)?note\s+(?:should\s+)?(?:say|be|read)\s*[:\-]?\s*/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.length % 2 === 0) {
    const midpoint = words.length / 2;
    const left = words.slice(0, midpoint).join(" ");
    const right = words.slice(midpoint).join(" ");
    if (normalizeSearchToken(left) === normalizeSearchToken(right)) text = left;
  }
  return /^(?:me|it|this|that|note)$/i.test(text) ? "" : text;
}

function deriveNoteTitle(body, providedTitle = "") {
  const explicitTitle = cleanNoteContent(providedTitle);
  if (explicitTitle) return explicitTitle.slice(0, 70);
  const firstLine = String(body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "Braino Note";
  return firstLine
    .replace(/[.?!]+$/g, "")
    .split(/\s+/)
    .slice(0, 8)
    .join(" ")
    .slice(0, 70) || "Braino Note";
}

function parseNoteIntent(raw) {
  const source = String(raw || "").replace(/\bnode\b/gi, "note").replace(/\bnodes\b/gi, "notes").trim();
  if (!/\b(?:notes?|apple notes)\b/i.test(source)) return null;
  if (!/\b(?:create|make|write|take|add|new)\b/i.test(source)) return null;
  if (/\b(?:mail|email)\b/i.test(source)) return null;

  let title = "";
  let body = "";
  const explicit = source.match(/\btitle\s*[:\-]?\s*(.+?)\s+(?:body|content|text|note)\s*[:\-]?\s*(.+)$/i);
  if (explicit?.[1] && explicit?.[2]) {
    title = explicit[1];
    body = explicit[2];
  }
  const calledAbout = !body && source.match(/\b(?:create|make|write|take|add)\s+(?:a\s+)?(?:new\s+)?note\s+(?:called|named|titled)\s+(.+?)\s+(?:about|that|saying|with|for)\s+(.+)$/i);
  if (calledAbout?.[1] && calledAbout?.[2]) {
    title = calledAbout[1];
    body = calledAbout[2];
  }
  if (!body) {
    body = extractAfter(source, [
      /\b(?:create|make|write|take|add)\s+(?:a\s+)?(?:new\s+)?note(?:\s+(?:in|on)\s+(?:apple\s+)?notes?)?\s+(?:about|that|saying|with|for)\s+(.+)$/i,
      /\b(?:note|remember)\s+(?:this|that)?\s*[:\-]?\s*(.+)$/i,
    ]);
  }
  if (!title) {
    title = extractAfter(source, [
      /\b(?:create|make|write|take|add)\s+(?:a\s+)?(?:new\s+)?note\s+(?:called|named|titled)\s+(.+)$/i,
    ]);
  }
  return {
    title: cleanNoteContent(title),
    body: cleanNoteContent(body),
  };
}

function setPendingMacWorkflow(workflow) {
  pendingMacWorkflow = {
    ...workflow,
    createdAt: Date.now(),
  };
  logMac("mac.workflow.pending", {
    type: pendingMacWorkflow.type,
    stage: pendingMacWorkflow.stage,
    hasRecipient: Boolean(pendingMacWorkflow.data?.recipient),
    hasBody: Boolean(pendingMacWorkflow.data?.body),
  });
}

function clearPendingMacWorkflow() {
  pendingMacWorkflow = null;
}

function delegateStatePayload() {
  return {
    hasPendingWorkflow: Boolean(pendingMacWorkflow),
    workflowType: pendingMacWorkflow?.type || "",
    workflowStage: pendingMacWorkflow?.stage || "",
    hasPendingFileConfirmation: Boolean(pendingFileConfirmation),
    chatHistoryTurns: macChatHistory.length,
  };
}

function isWorkflowCancelIntent(text) {
  return /^(?:cancel|stop|never mind|nevermind|leave it|forget it|no)$/i.test(String(text || "").trim());
}

async function createAppleNoteViaUi({ title, body, includeTitleLine = false } = {}) {
  const noteText = includeTitleLine && title ? `${title}\n\n${body}` : body;
  if (!String(noteText || "").trim()) return { ok: false, error: "No note text was provided." };

  const previousClipboard = clipboard.readText();
  clipboard.writeText(noteText);
  const script = `
tell application id "com.apple.Notes"
  activate
end tell
delay 0.45
tell application "System Events"
  tell process "Notes"
    keystroke "n" using command down
    delay 0.25
    keystroke "v" using command down
  end tell
end tell
return ${appleScriptStringLiteral(title || "Braino Note")}`;

  logMac("notes.create.ui_fallback.start", {
    title: textForLog(title),
    bodyChars: String(body || "").length,
    accessibilityTrusted: systemPreferences.isTrustedAccessibilityClient(false),
  });
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 10000 });
    setTimeout(() => {
      try {
        if (clipboard.readText() === noteText) clipboard.writeText(previousClipboard);
      } catch (_) {}
    }, 700);
    const createdTitle = stdout.trim() || title || "Braino Note";
    logMac("notes.create.ui_fallback.done", { title: textForLog(createdTitle), bodyChars: String(body || "").length });
    return { ok: true, title: createdTitle };
  } catch (error) {
    setTimeout(() => {
      try {
        if (clipboard.readText() === noteText) clipboard.writeText(previousClipboard);
      } catch (_) {}
    }, 700);
    logMac("notes.create.ui_fallback.failed", { title: textForLog(title), error });
    return { ok: false, error: error?.message || "UI fallback failed." };
  }
}

async function createAppleNote(note) {
  if (process.platform !== "darwin") return { ok: false, say: "Apple Notes is only available on macOS." };
  const body = cleanNoteContent(note?.body || "");
  if (!body) return { ok: false, say: "Tell me what the note should say." };
  const explicitTitle = cleanNoteContent(note?.title || "");
  const title = deriveNoteTitle(body, explicitTitle);
  const script = `
set noteName to ${appleScriptStringLiteral(title)}
set noteBody to ${appleScriptStringLiteral(htmlForNotesBody(body))}
tell application id "com.apple.Notes"
  activate
  set targetFolder to missing value
  repeat with theAccount in accounts
    try
      if exists folder "Notes" of theAccount then
        set targetFolder to folder "Notes" of theAccount
        exit repeat
      end if
    end try
  end repeat
  if targetFolder is missing value then
    try
      set targetFolder to folder "Notes" of account 1
    on error
      set targetFolder to first folder of account 1
    end try
  end if
  make new note at targetFolder with properties {name:noteName, body:noteBody}
end tell
return noteName`;

  sendTaskProgress({ status: "thinking", text: "Creating note" });
  logMac("notes.create.start", { title: textForLog(title), bodyChars: body.length });
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 10000 });
    const createdTitle = stdout.trim() || title;
    setTimeout(() => ensureDockWindowVisible("notes-create"), 450);
    logMac("notes.create.done", { title: textForLog(createdTitle), bodyChars: body.length });
    sendTaskProgress({ status: "done", text: "Created note" });
    return { ok: true, say: `Done. I created the note in Apple Notes: ${createdTitle}.` };
  } catch (error) {
    logMac("notes.create.failed", { title: textForLog(title), error });
    const fallback = await createAppleNoteViaUi({ title, body, includeTitleLine: Boolean(explicitTitle) });
    if (fallback.ok) {
      setTimeout(() => ensureDockWindowVisible("notes-create-ui-fallback"), 450);
      sendTaskProgress({ status: "done", text: "Created note" });
      return { ok: true, say: `Done. I created the note in Apple Notes: ${fallback.title || title}.` };
    }
    return { ok: false, say: `I opened Notes, but macOS would not let me create the note yet: ${fallback.error || error?.message || "AppleScript failed"}.` };
  }
}

async function startNoteWorkflow(intent = {}) {
  if (!intent.body) {
    const openResult = await openApp("Notes");
    if (!openResult.ok) {
      return { ok: false, say: `I could not open Apple Notes yet: ${openResult.error || "macOS did not find the app"}.` };
    }
    setTimeout(() => ensureDockWindowVisible("notes-pending"), 450);
    setPendingMacWorkflow({
      type: "note",
      stage: "note_body",
      data: { title: intent.title || "" },
    });
    return { ok: true, say: "Opening Notes. What should the note say?" };
  }
  return createAppleNote(intent);
}

function extractEmailAddress(value) {
  const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function cleanMailRecipient(value) {
  return String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:to|recipient is|send it to|mail it to|email it to)\s+/i, "")
    .replace(/\s+(?:for me|please|pls)$/i, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericMailRecipient(value) {
  return /^(?:someone|somebody|someone in my contacts|somebody in my contacts|a contact|one contact|person|him|her|them)$/i
    .test(cleanMailRecipient(value));
}

function cleanMailBody(value) {
  return String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:i\s+(?:would\s+)?like\s+(?:the\s+)?(?:email|mail|message)\s+to\s+(?:say|be|read))\s*[:\-]?\s*/i, "")
    .replace(/^(?:the\s+)?(?:email|mail|message)\s+(?:should\s+)?(?:say|be|read)\s*[:\-]?\s*/i, "")
    .replace(/^(?:body|message|saying|that|about)\s*[:\-]?\s*/i, "")
    .replace(/\s+(?:for me|please|pls)$/i, "")
    .trim();
}

function deriveMailSubject(body) {
  const cleaned = String(body || "")
    .replace(/\r?\n+/g, " ")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Quick note";
  return titleCaseWords(cleaned.split(/\s+/).slice(0, 7).join(" ")).slice(0, 72) || "Quick note";
}

function parseMailIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(?:mail|email|gmail)\b/i.test(source)) return null;
  if (!/\b(?:send|write|compose|draft|create|mail|email|gmail)\b/i.test(source)) return null;
  const lower = source.toLowerCase();
  const action = /\b(?:draft|compose|write|create)\b/i.test(source) && !/\bsend\b/i.test(source)
    ? "draft"
    : "send";

  const toMatch = source.match(/\bto\s+(.+?)(?=\s+(?:with\s+)?subject\b|\s+(?:body|message|saying|that|about)\b|$)/i)
    || source.match(/\b(?:email|gmail|mail)\s+(.+?)(?=\s+(?:with\s+)?subject\b|\s+(?:body|message|saying|that|about)\b|$)/i);
  let recipient = cleanMailRecipient(toMatch?.[1] || "");
  if (isGenericMailRecipient(recipient)) recipient = "";

  const explicitEmail = extractEmailAddress(source);
  if (explicitEmail && !recipient) recipient = explicitEmail;

  const subjectMatch = source.match(/\b(?:with\s+)?subject\s*[:\-]?\s*(.+?)(?=\s+(?:and\s+)?(?:body|message|saying|that)\b|$)/i);
  const subject = cleanMailBody(subjectMatch?.[1] || "");
  let body = extractAfter(source, [
    /\b(?:body|message)\s*[:\-]?\s*(.+)$/i,
    /\b(?:saying|that)\s+(.+)$/i,
    /\babout\s+(.+)$/i,
  ]);
  body = cleanMailBody(body);
  if (subject && body === subject) body = "";

  const asksMail = /\b(?:send|write|compose|draft|create)\s+(?:an?\s+)?(?:mail|email|gmail)\b/i.test(source)
    || /\bemail\s+\S+/i.test(source);
  if (!asksMail && !/\b(mail|email|gmail)\s+(?:to|for)\b/i.test(lower)) return null;
  return { action, recipient, subject, body };
}

async function resolveMailRecipient(recipient) {
  const cleaned = cleanMailRecipient(recipient);
  const email = extractEmailAddress(cleaned);
  if (email) return { ok: true, name: cleaned.replace(email, "").trim(), email, source: "typed_email" };
  if (/^(?:me|myself|itish)$/i.test(cleaned)) {
    const auth = authStatusPayload();
    if (auth.email) return { ok: true, name: auth.displayName || "Itish", email: auth.email, source: "braino_auth" };
  }
  if (!cleaned || isGenericMailRecipient(cleaned)) {
    return { ok: false, reason: "missing_recipient" };
  }
  if (process.platform !== "darwin") return { ok: false, reason: "contacts_unavailable" };

  const script = `
set queryName to ${appleScriptStringLiteral(cleaned)}
tell application id "com.apple.AddressBook"
  repeat with thePerson in people
    try
      set personName to name of thePerson as text
      ignoring case
        if personName contains queryName then
          if (count of emails of thePerson) > 0 then
            set firstEmail to value of item 1 of emails of thePerson as text
            return personName & tab & firstEmail
          end if
        end if
      end ignoring
    end try
  end repeat
end tell
return ""`;

  logMac("contacts.lookup.start", { recipient: textForLog(cleaned) });
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    const [name = "", foundEmail = ""] = stdout.trim().split("\t");
    logMac("contacts.lookup.done", {
      recipient: textForLog(cleaned),
      found: Boolean(foundEmail),
      name: textForLog(name),
      hasEmail: Boolean(foundEmail),
    });
    if (foundEmail) return { ok: true, name: name.trim() || cleaned, email: foundEmail.trim(), source: "contacts" };
    return { ok: false, reason: "not_found" };
  } catch (error) {
    logMac("contacts.lookup.failed", { recipient: textForLog(cleaned), error });
    return { ok: false, reason: "contacts_failed", error: error?.message || "Contacts lookup failed." };
  }
}

async function createAppleMailMessage(mail) {
  const recipientName = cleanMailRecipient(mail?.recipientName || mail?.recipient || "");
  const recipientEmail = extractEmailAddress(mail?.recipientEmail || mail?.recipient || "");
  const body = cleanMailBody(mail?.body || "");
  const subject = cleanMailBody(mail?.subject || "") || deriveMailSubject(body);
  const action = mail?.action === "draft" ? "draft" : "send";
  if (!recipientEmail) return { ok: false, say: `I need an email address for ${recipientName || "that person"}.` };
  if (!body) return { ok: false, say: "What should the email say?" };
  const script = `
set recipientName to ${appleScriptStringLiteral(recipientName || recipientEmail)}
set recipientEmail to ${appleScriptStringLiteral(recipientEmail)}
set mailSubject to ${appleScriptStringLiteral(subject)}
set mailBody to ${appleScriptStringLiteral(body)}
tell application id "com.apple.mail"
  activate
  set outgoingMessage to make new outgoing message with properties {subject:mailSubject, content:mailBody & linefeed, visible:true}
  tell outgoingMessage
    make new to recipient at end of to recipients with properties {name:recipientName, address:recipientEmail}
    ${action === "send" ? "send" : ""}
  end tell
end tell
return mailSubject`;

  sendTaskProgress({ status: "thinking", text: action === "send" ? "Sending email" : "Drafting email" });
  logMac("mail.compose.start", {
    action,
    recipient: textForLog(recipientName || recipientEmail),
    hasEmail: Boolean(recipientEmail),
    subject: textForLog(subject),
    bodyChars: body.length,
  });
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 15000 });
    setTimeout(() => ensureDockWindowVisible("mail-compose"), 450);
    logMac("mail.compose.done", {
      action,
      subject: textForLog(stdout.trim() || subject),
      recipient: textForLog(recipientName || recipientEmail),
    });
    sendTaskProgress({ status: "done", text: action === "send" ? "Sent email" : "Draft ready" });
    return {
      ok: true,
      say: action === "send"
        ? `Done. I sent the email to ${recipientName || recipientEmail}.`
        : `Done. I drafted the email to ${recipientName || recipientEmail}.`,
    };
  } catch (error) {
    logMac("mail.compose.failed", {
      action,
      recipient: textForLog(recipientName || recipientEmail),
      subject: textForLog(subject),
      error,
    });
    return { ok: false, say: `I opened Mail, but macOS would not let me ${action === "send" ? "send" : "draft"} it yet: ${error?.message || "AppleScript failed"}.` };
  }
}

async function executeMailWorkflow(data = {}) {
  const mail = {
    action: data.action === "draft" ? "draft" : "send",
    recipient: cleanMailRecipient(data.recipient || ""),
    recipientEmail: extractEmailAddress(data.recipientEmail || data.recipient || ""),
    recipientName: cleanMailRecipient(data.recipientName || data.recipient || ""),
    subject: cleanMailBody(data.subject || ""),
    body: cleanMailBody(data.body || ""),
  };
  if (!mail.recipient && !mail.recipientEmail) {
    setPendingMacWorkflow({ type: "mail", stage: "mail_recipient", data: mail });
    const openResult = await openApp("Mail");
    if (!openResult.ok) {
      return { ok: false, say: `I could not open Apple Mail yet: ${openResult.error || "macOS did not find the app"}.` };
    }
    return { ok: true, say: "Opening Mail. Who should I send it to?" };
  }
  if (!mail.body) {
    setPendingMacWorkflow({ type: "mail", stage: "mail_body", data: mail });
    const openResult = await openApp("Mail");
    if (!openResult.ok) {
      return { ok: false, say: `I could not open Apple Mail yet: ${openResult.error || "macOS did not find the app"}.` };
    }
    return { ok: true, say: "What should the email say?" };
  }

  if (!mail.recipientEmail) {
    const resolved = await resolveMailRecipient(mail.recipient);
    if (!resolved.ok) {
      setPendingMacWorkflow({
        type: "mail",
        stage: "mail_email",
        data: mail,
      });
      const targetName = mail.recipient || "that person";
      return { ok: true, say: `I could not find an email address for ${targetName} in Contacts. Type or say the email address.` };
    }
    mail.recipientEmail = resolved.email;
    mail.recipientName = resolved.name || mail.recipient;
  }

  clearPendingMacWorkflow();
  return createAppleMailMessage(mail);
}

async function startMailWorkflow(intent = {}) {
  return executeMailWorkflow(intent);
}

async function handlePendingMacWorkflow(raw) {
  const pending = pendingMacWorkflow;
  if (!pending) return null;
  if (Date.now() - Number(pending.createdAt || 0) > MAC_WORKFLOW_CONFIRM_MS) {
    clearPendingMacWorkflow();
    return null;
  }
  if (isWorkflowCancelIntent(raw)) {
    clearPendingMacWorkflow();
    return { ok: true, say: "Cancelled. I did not do anything." };
  }

  if (pending.type === "spotify_add") {
    clearPendingMacWorkflow();
    const playlist = cleanSpotifyPlaylistName(raw);
    if (!playlist) return { ok: true, say: "I did not catch the playlist name. Say it once more?" };
    return addSpotifyTrackOnMac({ ...(pending.data || {}), playlist, needsPlaylist: false });
  }

  if (pending.type === "spotify_create_playlist") {
    clearPendingMacWorkflow();
    const name = cleanSpotifyPlaylistName(raw);
    if (!name) return { ok: true, say: "I did not catch the playlist name. Say it once more?" };
    return createSpotifyPlaylistOnMac(name, pending.data || {});
  }

  if (pending.type === "note") {
    const parsed = parseNoteIntent(raw);
    const body = parsed?.body || cleanNoteContent(raw);
    const title = parsed?.title || pending.data?.title || "";
    clearPendingMacWorkflow();
    return createAppleNote({ ...(pending.data || {}), title, body });
  }

  if (pending.type === "mail") {
    const data = { ...(pending.data || {}) };
    if (pending.stage === "mail_recipient") {
      data.recipient = cleanMailRecipient(raw);
      return executeMailWorkflow(data);
    }
    if (pending.stage === "mail_body") {
      const parsed = parseMailIntent(raw);
      data.subject = parsed?.subject || data.subject || "";
      data.body = parsed?.body || cleanMailBody(raw);
      return executeMailWorkflow(data);
    }
    if (pending.stage === "mail_email") {
      const email = extractEmailAddress(raw);
      if (!email) return { ok: true, say: "I still need the email address. Type it like name@example.com, or say cancel." };
      data.recipientEmail = email;
      return executeMailWorkflow(data);
    }
  }

  clearPendingMacWorkflow();
  return null;
}

async function openChromeUrl(url) {
  await execFileP("open", ["-a", "Google Chrome", url]);
  setTimeout(() => ensureDockWindowVisible("open-chrome-url"), 650);
}

async function openSpotifyReconnect(authToken) {
  if (!authToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/spotify-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ source: "braino-mac" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) {
      logMac("spotify.reconnect.failed", { status: response.status, error: data?.error || null });
      return false;
    }
    await shell.openExternal(data.authUrl);
    logMac("spotify.reconnect.opened", { status: response.status });
    return true;
  } catch (error) {
    logMac("spotify.reconnect.error", { error });
    return false;
  }
}

async function callSpotifyFunction(functionName, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Supabase is not configured for Spotify." };
  }
  let authToken = await getBrainoAuthToken();
  if (!authToken) {
    const authResult = await ensureBrainoAuth("spotify");
    if (!authResult?.ok) return { ok: false, error: authResult?.error || "Braino sign-in is required for Spotify." };
    authToken = await getBrainoAuthToken();
  }
  if (!authToken) return { ok: false, error: "Braino sign-in is required for Spotify." };

  logMac("spotify.function.start", {
    functionName,
    payloadKeys: Object.keys(payload || {}),
  });
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      logMac("spotify.function.failed", {
        functionName,
        status: response.status,
        error: data?.error || null,
        details: data?.details || null,
        reconnectRequired: Boolean(data?.reconnectRequired),
      });
      const reconnectAllowed = Date.now() - lastSpotifyReconnectAt > SPOTIFY_RECONNECT_COOLDOWN_MS;
      if (data?.reconnectRequired) {
        if (reconnectAllowed) {
          lastSpotifyReconnectAt = Date.now();
          await openSpotifyReconnect(authToken);
          return { ok: false, error: "Spotify needs to be reconnected. I opened the reconnect page." };
        }
        return { ok: false, error: "Spotify still is not connected. Finish the reconnect tab I opened earlier, then ask me again." };
      }
      const errorBlob = `${data?.error || ""} ${data?.details || ""}`;
      if (/"status"\s*:\s*403/.test(errorBlob) || /\bforbidden\b/i.test(errorBlob)) {
        // A Spotify 403 here usually means the stored token was granted before the
        // current scope list existed. A fresh connect picks up the new scopes.
        logMac("spotify.write_forbidden", {
          functionName,
          grantedScope: data?.grantedScope || "unknown",
          scopeHint: data?.scopeHint || "",
        });
        if (reconnectAllowed) {
          lastSpotifyReconnectAt = Date.now();
          await openSpotifyReconnect(authToken);
          return {
            ok: false,
            error: "Spotify refused that with the current permissions. I opened a Spotify reconnect page, approve it once, and ask me again.",
          };
        }
        return {
          ok: false,
          error: "Spotify is still refusing writes. Finish the reconnect tab from before, or tell Itish to check the braino-mac log for spotify.write_forbidden.",
        };
      }
      return { ok: false, error: [data?.error, data?.details].filter(Boolean).join(" - ") || `${functionName} failed (${response.status}).` };
    }
    logMac("spotify.function.done", { functionName, status: response.status });
    return { ok: true, ...data };
  } catch (error) {
    logMac("spotify.function.error", { functionName, error });
    return { ok: false, error: error?.message || `${functionName} failed.` };
  }
}

function formatSpotifyArtists(track) {
  if (Array.isArray(track?.artists)) {
    return track.artists.map((item) => typeof item === "string" ? item : item?.name).filter(Boolean).join(", ");
  }
  return String(track?.artists || "").trim();
}

function parseSpotifyPlayIntent(raw) {
  const source = String(raw || "").trim();
  const hasPlayIntent = /\b(?:play|played|put on|queue|spin|listen to|start listening to)\b/i.test(source);
  if (!hasPlayIntent) return null;
  const mentionsSpotify = /\bspotify\b/i.test(source);
  const mentionsMusic = /\b(song|track|music|tune|album|artist)\b/i.test(source);
  const wantsVideo = /\b(youtube|video|movie|show|episode|trailer|netflix|watch)\b/i.test(source) && !mentionsSpotify;
  if (wantsVideo) return null;
  if (!mentionsSpotify && !mentionsMusic && !/\b(?:play|put on|queue|spin|listen to)\s+["“][^"”]+["”]/i.test(source)) {
    const loosePlay = source.match(/\b(?:play|put on|queue|spin|listen to)\s+(.+)$/i);
    if (!loosePlay || loosePlay[1].trim().split(/\s+/).length > 8) return null;
  }
  if (/\b(?:pause|resume|continue|next|skip|previous|prev|volume|stop)\b/i.test(source)) return null;
  const song = extractAfter(source, [
    /\b(?:play|played|put on|queue|spin|listen to)\s+["“](.+?)["”]\s+(?:on|in|with)\s+spotify\b/i,
    /\b(?:play|played|put on|queue|spin|listen to)\s+["“](.+?)["”]\s*$/i,
    /\b(?:play|played|put on|queue|spin|listen to)\s+(?:the\s+)?(?:song|track|music|tune)\s+["“]?(.+?)["”]?\s+(?:on|in|with)\s+spotify\b/i,
    /\b(?:play|played|put on|queue|spin|listen to)\s+(.+?)\s+(?:on|in|with)\s+spotify\b/i,
    /\bspotify\s+(?:play|played|start|put on|queue|spin)\s+(.+)$/i,
    /\b(?:play|put on|queue|spin|listen to)\s+(.+)$/i,
  ]);
  const cleaned = cleanOpenTarget(song)
    .replace(/\b(?:on|in|with)\s+spotify\b/gi, " ")
    .replace(/^(?:the\s+)?(?:song|track|music|tune)\s+/i, "")
    .replace(/\b(?:for me|please|pls|right now|now)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^(?:this|it|this song|this track|this music|song|track|music)$/i.test(cleaned)) {
    return { needsSong: true, song: "" };
  }
  return { needsSong: false, song: cleaned };
}

function parseSpotifyControlIntent(raw) {
  const source = String(raw || "").trim();
  const mentionsSpotifyPlayback = /\b(spotify|song|track|music|tune|playlist)\b/i.test(source);
  const shortControl = /^(?:pause|resume|continue|play|next|skip|previous|prev|back|stop)\b/i.test(cleanPrompt(source));
  if (!mentionsSpotifyPlayback && !shortControl) return null;
  if (/\b(?:pause|stop)\b/i.test(source)) return { control: "pause" };
  if (/\b(?:resume|continue)\b/i.test(source)) return { control: "play" };
  const cleaned = cleanPrompt(source);
  if (/^(?:play|start)\s*$/i.test(cleaned) || /^(?:play|start)\s+(?:the\s+)?(?:song|music|track|spotify)$/i.test(cleaned)) {
    return { control: "play" };
  }
  if (/\b(?:next|skip)\b/i.test(source)) return { control: "next" };
  if (/\b(?:previous|prev|back)\b/i.test(source)) return { control: "previous" };
  return null;
}

function clampSpotifyVolume(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function parseSpotifyVolumeIntent(raw) {
  const source = String(raw || "").trim();
  const hasVolumeWord = /\b(?:volume|vol|sound)\b/i.test(source);
  const wantsLouder = /\b(louder|raise|increase|boost|higher)\b/i.test(source)
    || /\bturn\s+up\b/i.test(source)
    || /\bturn\s+(?:it|the\s+(?:music|sound|volume))\s+up\b/i.test(source)
    || /\b(full|max(?:imum)?)\s+(?:volume|vol|sound)\b/i.test(source)
    || /\b(?:volume|vol|sound)\s+(?:up|higher|full|max)\b/i.test(source);
  const wantsQuieter = /\b(quieter|softer|dimmer|lower|decrease|reduce)\b/i.test(source)
    || /\bturn\s+down\b/i.test(source)
    || /\bturn\s+(?:it|the\s+(?:music|sound|volume))\s+down\b/i.test(source)
    || /\b(mute|silence)\b/i.test(source);
  if (!hasVolumeWord && !wantsLouder && !wantsQuieter) return null;

  if (/\b(?:full|max(?:imum)?)\s*(?:volume|vol|sound)?$|\b(?:volume|vol|sound)\s+(?:full|max)\b/i.test(source)) {
    return { volumePercent: 100, volumeStep: 0 };
  }
  if (/\b(?:mute|silence)\b/i.test(source)) return { volumePercent: 0, volumeStep: 0 };
  // "reduce/raise the volume by N percent" is a relative step, not an absolute target.
  const byAmount = source.match(/\b(?:by|down by|up by)\s+(\d{1,3})\s*(?:%|percent)?\b/i);
  if (byAmount?.[1] && (wantsQuieter || wantsLouder)) {
    const amount = clampSpotifyVolume(byAmount[1]);
    return { volumePercent: null, volumeStep: wantsQuieter ? -amount : amount };
  }
  const exact = source.match(/(?:set|change|put|make)\s+(?:the\s+)?(?:spotify\s+)?(?:volume|vol|sound)\s+(?:to\s+)?(\d{1,3})\s*%?/i)
    || source.match(/\b(?:volume|vol|sound)\s+(?:to\s+|at\s+)?(\d{1,3})\s*%?/i)
    || source.match(/\b(\d{1,3})\s*%?\s+(?:volume|vol|sound)\b/i)
    || source.match(/\b(?:make|set|put)\s+it\s+(?:to|at|on)?\s*(\d{1,3})\s*(?:%|percent)\b/i)
    || (hasVolumeWord ? source.match(/\b(\d{1,3})\s*(?:%|percent)\b/i) : null);
  if (exact?.[1]) return { volumePercent: clampSpotifyVolume(exact[1]), volumeStep: 0 };
  if (wantsQuieter) return { volumePercent: null, volumeStep: -20 };
  if (wantsLouder) return { volumePercent: null, volumeStep: 20 };
  return null;
}

function cleanSpotifySongQuery(value) {
  return cleanOpenTarget(value)
    .replace(/^(?:the\s+)?(?:song|track|music|tune)\s+/i, "")
    .replace(/\b(?:on|in|with)\s+spotify\b/gi, " ")
    .replace(/\b(?:for me|please|pls|right now|now)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSpotifyPlaylistName(value) {
  return cleanOpenTarget(value)
    .replace(/\s+(?:playlist|on spotify|in spotify|with spotify)$/i, "")
    .replace(/^(?:my\s+)?(?:playlist\s+)?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpotifyAddTrackIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(?:add|save)\b/i.test(source)) return null;
  if (!/\b(?:spotify|playlist|liked songs?|song|track|music|tune)\b/i.test(source)) return null;

  // "add this song to my playlist" with no playlist name: ask which one instead
  // of guessing (the generic patterns below would misparse "playlist" as a name).
  if (/\bto\s+(?:my\s+|the\s+|a\s+)?playlist\s*(?:on\s+spotify\s*)?[?.!]?\s*$/i.test(source)) {
    const songMatch = source.match(/\b(?:add|save)\s+(?:the\s+)?(?:song|track|music|tune)?\s*["“]?(.+?)["”]?\s+to\s+(?:my\s+|the\s+|a\s+)?playlist\s*(?:on\s+spotify\s*)?[?.!]?\s*$/i);
    const rawSong = songMatch?.[1] ? cleanSpotifySongQuery(songMatch[1]) : "";
    const song = /^(?:this|it|that|current|playing|song|track|music|tune|this song|the song)$/i.test(rawSong) ? "" : rawSong;
    return { song, playlist: null, useCurrent: !song, needsPlaylist: true };
  }

  if (/(?:add|save)\s+(?:this|current|playing)(?:\s+(?:song|track|music|tune))?\s+to\s+(?:my\s+)?(?:liked\s+songs?|spotify)\b/i.test(source)) {
    return { song: "", playlist: null, useCurrent: true };
  }

  const currentQuotedPlaylist = source.match(/(?:add|save)\s+(?:this|current|playing)(?:\s+(?:song|track|music|tune))?\s+to\s+(?:my\s+)?(?:playlist\s+)?["“](.+?)["”](?:\s+(?:on|in)\s+spotify)?$/i);
  if (currentQuotedPlaylist?.[1]) {
    return { song: "", playlist: cleanSpotifyPlaylistName(currentQuotedPlaylist[1]), useCurrent: true };
  }

  const currentNamedPlaylist = source.match(/(?:add|save)\s+(?:this|current|playing)(?:\s+(?:song|track|music|tune))?\s+to\s+(?:my\s+)?(.+?)\s+playlist(?:\s+(?:on|in)\s+spotify)?$/i);
  if (currentNamedPlaylist?.[1]) {
    return { song: "", playlist: cleanSpotifyPlaylistName(currentNamedPlaylist[1]), useCurrent: true };
  }

  const quotedAdd = source.match(/(?:add|save)\s+["“](.+?)["”]\s+to\s+(?:my\s+)?(?:playlist\s+)?["“](.+?)["”](?:\s+(?:on|in)\s+spotify)?$/i);
  if (quotedAdd?.[1] && quotedAdd?.[2]) {
    return { song: cleanSpotifySongQuery(quotedAdd[1]), playlist: cleanSpotifyPlaylistName(quotedAdd[2]), useCurrent: false };
  }

  const namedLiked = source.match(/(?:add|save)\s+(?:the\s+)?(?:song|track|music|tune)?\s*["“]?(.+?)["”]?\s+to\s+(?:my\s+)?liked\s+songs?(?:\s+(?:on|in)\s+spotify)?$/i);
  if (namedLiked?.[1]) {
    return { song: cleanSpotifySongQuery(namedLiked[1]), playlist: null, useCurrent: false };
  }

  const namedPlaylist = source.match(/(?:add|save)\s+(?:the\s+)?(?:song|track|music|tune)?\s*["“]?(.+?)["”]?\s+to\s+(?:my\s+)?(?:playlist\s+)?["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?$/i);
  if (namedPlaylist?.[1] && namedPlaylist?.[2]) {
    return {
      song: cleanSpotifySongQuery(namedPlaylist[1]),
      playlist: cleanSpotifyPlaylistName(namedPlaylist[2]),
      useCurrent: false,
    };
  }

  return null;
}

function parseSpotifyWhatsPlayingIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source) return false;
  return /(what(?:'s| is)?\s+(?:song|track|music)?\s*(?:is\s+)?(?:this|playing|currently playing)|what\s+song\s+is\s+(?:this|playing|on)|which\s+song\s+is\s+this|what\s+am\s+i\s+listening\s+to|now\s+playing|current(?:ly playing)?\s+song|name\s+of\s+(?:this|the)\s+song|who\s+sings\s+this)/i.test(source);
}

function parseSpotifyShuffleRepeatIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  const mentionsShuffle = /\bshuffle\b/i.test(source);
  const mentionsRepeat = /\b(?:repeat|loop)\b/i.test(source);
  if (!mentionsShuffle && !mentionsRepeat) return null;
  const off = /\b(?:off|stop|disable|end|cancel)\b/i.test(source) || /\bturn\s+off\b/i.test(source);
  return { feature: mentionsShuffle ? "shuffling" : "repeating", enable: !off };
}

function parseSpotifySeekIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (/\b(?:restart|start over|play (?:it|this|the song) again|from the (?:beginning|start|top))\b/i.test(source)
    && /\b(?:song|track|music|it|this|spotify)\b/i.test(source)) {
    return { positionSeconds: 0, relativeSeconds: 0 };
  }
  const clock = source.match(/\b(?:skip|jump|go|seek)\s+(?:ahead\s+)?to\s+(\d{1,2}):(\d{2})\b/i);
  if (clock) return { positionSeconds: Number(clock[1]) * 60 + Number(clock[2]), relativeSeconds: 0 };
  const units = source.match(/\b(?:skip|jump|go|seek)\s+to\s+(\d{1,3})\s+(second|minute)s?\b/i);
  if (units) return { positionSeconds: Number(units[1]) * (units[2].toLowerCase() === "minute" ? 60 : 1), relativeSeconds: 0 };
  const rel = source.match(/\b(?:go|skip|jump)\s+(back(?:ward)?s?|forward|ahead)\s+(\d{1,3})\s+seconds?\b/i)
    || source.match(/\b(rewind|fast forward)\s+(?:by\s+)?(\d{1,3})\s+seconds?\b/i);
  if (rel) {
    const direction = /back|rewind/i.test(rel[1]) ? -1 : 1;
    return { positionSeconds: null, relativeSeconds: direction * Number(rel[2]) };
  }
  if (/\brewind\b/i.test(source) && /\b(?:song|track|music|spotify|it|this)\b/i.test(source)) {
    return { positionSeconds: null, relativeSeconds: -10 };
  }
  return null;
}

function parseSpotifyQueueIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\bqueue\b/i.test(source) && !/\bnext\b/i.test(source)) return null;
  const match = source.match(/\b(?:add|put)\s+(?:the\s+)?(?:song|track)?\s*["“]?(.+?)["”]?\s+(?:to|in|into|on)\s+(?:the\s+|my\s+)?queue\b/i)
    || source.match(/\bqueue\s+(?:up\s+)?["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?\s*$/i)
    || source.match(/\b(?:play|put on)\s+["“]?(.+?)["”]?\s+next(?:\s+(?:on|in)\s+spotify)?\s*$/i);
  if (!match?.[1]) return null;
  const song = cleanSpotifySongQuery(match[1]);
  if (!song || /^(?:this|it|that|current|song|track|music)$/i.test(song)) return { needsSong: true, song: "" };
  return { needsSong: false, song };
}

function parseSpotifyContextPlayIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(?:play|put on|start|listen to)\b/i.test(source)) return null;
  const playlist = source.match(/\b(?:play|put on|start|listen to)\s+(?:my\s+|the\s+)?playlist\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?\s*$/i)
    || source.match(/\b(?:play|put on|start|listen to)\s+(?:my\s+|the\s+)?["“]?(.+?)["”]?\s+playlist(?:\s+(?:on|in)\s+spotify)?\s*$/i);
  if (playlist?.[1]) {
    const name = cleanSpotifyPlaylistName(playlist[1]);
    if (name) return { kind: "playlist", name };
  }
  const album = source.match(/\b(?:play|put on|start|listen to)\s+(?:the\s+)?album\s+["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?\s*$/i);
  if (album?.[1]) {
    const name = cleanSpotifySongQuery(album[1]);
    if (name) return { kind: "album", name };
  }
  const artist = source.match(/\b(?:play|put on|start|listen to)\s+(?:some\s+|(?:songs?|music|tracks?)\s+(?:by|from)\s+|(?:the\s+)?artist\s+)["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?\s*$/i);
  if (artist?.[1]) {
    const name = cleanSpotifySongQuery(artist[1]);
    if (name) return { kind: "artist", name };
  }
  return null;
}

async function describeSpotifyNowPlaying() {
  sendTaskProgress({ status: "thinking", text: "Checking Spotify" });
  const state = await readSpotifyMacState();
  if (state.ok && state.name) {
    const paused = /paused/i.test(state.state || "");
    const artistLine = state.artist ? ` by ${state.artist}` : "";
    logMac("spotify.now_playing", {
      source: "mac_app",
      track: textForLog(state.name),
      artist: textForLog(state.artist || ""),
      state: state.state || "",
    });
    sendTaskProgress({ status: "done", text: `${state.name}${artistLine}` });
    return {
      ok: true,
      say: paused
        ? `Spotify is paused on ${state.name}${artistLine}.`
        : `This is ${state.name}${artistLine}.`,
    };
  }
  const playerState = await callSpotifyFunction("spotify-player-state", {});
  const track = playerState?.track;
  if (playerState.ok && track?.name) {
    const artists = formatSpotifyArtists(track);
    const artistLine = artists ? ` by ${artists}` : "";
    logMac("spotify.now_playing", { source: "api", track: textForLog(track.name), artist: textForLog(artists || "") });
    sendTaskProgress({ status: "done", text: `${track.name}${artistLine}` });
    return {
      ok: true,
      say: playerState.isPlaying
        ? `This is ${track.name}${artistLine}.`
        : `Spotify is paused on ${track.name}${artistLine}.`,
    };
  }
  logMac("spotify.now_playing.empty", { macError: state.error || "", apiError: playerState.error || "" });
  return { ok: false, say: "Nothing seems to be playing on Spotify right now." };
}

async function setSpotifyModeOnMac(intent) {
  const label = intent.feature === "shuffling" ? "Shuffle" : "Repeat";
  sendTaskProgress({ status: "thinking", text: `${label} ${intent.enable ? "on" : "off"}` });
  const script = `
tell application "Spotify"
  set ${intent.feature} to ${intent.enable ? "true" : "false"}
  return ${intent.feature} as text
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 6000 });
    const actual = /true/i.test(stdout.trim());
    logMac("spotify.mode.set", { feature: intent.feature, requested: intent.enable, actual });
    sendTaskProgress({ status: "done", text: `${label} ${actual ? "on" : "off"}` });
    return { ok: true, say: `${label} is ${actual ? "on" : "off"}.` };
  } catch (error) {
    logMac("spotify.mode.failed", { feature: intent.feature, error });
    return { ok: false, say: `I could not change ${label.toLowerCase()} on Spotify. Is the Spotify app open?` };
  }
}

async function seekSpotifyOnMac(intent) {
  sendTaskProgress({ status: "thinking", text: "Moving playback" });
  const relative = Number(intent?.relativeSeconds || 0);
  let targetSeconds = typeof intent?.positionSeconds === "number" ? Math.max(0, intent.positionSeconds) : null;
  try {
    if (targetSeconds == null) {
      const { stdout } = await execFileP("/usr/bin/osascript", ["-e", 'tell application "Spotify" to return player position as text'], { timeout: 4000 });
      const current = Number(String(stdout).trim().replace(",", "."));
      targetSeconds = Math.max(0, (Number.isFinite(current) ? current : 0) + relative);
    }
    await execFileP("/usr/bin/osascript", ["-e", `tell application "Spotify" to set player position to ${Math.round(targetSeconds)}`], { timeout: 4000 });
    logMac("spotify.seek.done", { targetSeconds: Math.round(targetSeconds), relative, source: "mac_app" });
    sendTaskProgress({ status: "done", text: "Done" });
    if (targetSeconds === 0) return { ok: true, say: "Took it from the top." };
    return { ok: true, say: relative ? `Moved ${Math.abs(relative)} seconds ${relative < 0 ? "back" : "ahead"}.` : `Jumped to ${Math.floor(targetSeconds / 60)}:${String(Math.round(targetSeconds % 60)).padStart(2, "0")}.` };
  } catch (error) {
    logMac("spotify.seek.native_failed", { error });
    if (targetSeconds == null) return { ok: false, say: "I could not read where the song is right now." };
    const api = await callSpotifyFunction("spotify-playback", { action: "seek", positionMs: Math.round(targetSeconds * 1000) });
    if (api.ok) {
      logMac("spotify.seek.done", { targetSeconds: Math.round(targetSeconds), relative, source: "api" });
      return { ok: true, say: targetSeconds === 0 ? "Took it from the top." : "Moved the song." };
    }
    return { ok: false, say: api.error || "I could not move the song position." };
  }
}

async function queueSpotifyTrackOnMac(songQuery) {
  const query = String(songQuery || "").trim();
  if (!query) return { ok: false, say: "Tell me the song to queue and I will line it up on Spotify." };
  sendTaskProgress({ status: "thinking", text: `Queueing ${query}` });
  const search = await callSpotifyFunction("spotify-search", { query, limit: 5 });
  if (!search.ok) return { ok: false, say: search.error || "Spotify search failed." };
  const track = Array.isArray(search.tracks) ? search.tracks[0] : null;
  if (!track?.uri) return { ok: false, say: `I could not find ${query} on Spotify.` };
  const title = String(track.name || query).trim();
  const artists = formatSpotifyArtists(track);
  const result = await callSpotifyFunction("spotify-playback", { action: "queue", uri: track.uri });
  if (!result.ok) {
    logMac("spotify.queue.failed", { track: textForLog(title), error: result.error || "" });
    return { ok: false, say: result.error || `I could not queue ${title}. Make sure something is playing first.` };
  }
  logMac("spotify.queue.done", { track: textForLog(title), artists: textForLog(artists || ""), uri: track.uri });
  sendTaskProgress({ status: "done", text: `Queued ${title}` });
  return { ok: true, say: `Queued ${title}${artists ? ` by ${artists}` : ""} to play next.` };
}

async function playSpotifyContextOnMac(kind, name) {
  const query = String(name || "").trim();
  if (!query) return { ok: false, say: `Tell me the ${kind} name and I will play it on Spotify.` };
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: `Searching Spotify for ${query}` });
  const wasRunningPromise = isMacApplicationRunning("Spotify");
  const openPromise = openApp("Spotify");
  const searchPromise = callSpotifyFunction("spotify-search", { query, limit: 5, types: [kind] });
  const [wasRunning, openResult, search] = await Promise.all([wasRunningPromise, openPromise, searchPromise]);
  if (!search.ok) return { ok: false, say: search.error || "Spotify search failed." };
  const list = kind === "playlist" ? search.playlists : kind === "album" ? search.albums : search.artists;
  const item = Array.isArray(list) ? list[0] : null;
  if (!item?.uri) return { ok: false, say: `I could not find a ${kind} called ${query} on Spotify.` };
  if (!openResult.ok) return { ok: false, say: `I found the ${kind}, but I could not open the Spotify Mac app.` };
  await new Promise((resolve) => setTimeout(resolve, wasRunning ? 180 : 650));

  const label = kind === "playlist"
    ? `your playlist ${item.name}${item.ownedByUser === false && item.owner ? ` by ${item.owner}` : ""}`
    : kind === "album"
      ? `the album ${item.name}${item.artists ? ` by ${item.artists}` : ""}`
      : `${item.name}`;
  sendTaskProgress({ status: "thinking", text: `Playing ${item.name}` });

  let nativeOk = false;
  let apiOk = false;
  let apiError = "";
  try {
    await playSpotifyTrackInMacApp(item.uri);
    nativeOk = true;
    logMac("spotify.context_play.mac_app.done", { kind, name: textForLog(item.name), uri: item.uri, durationMs: Date.now() - startedAt });
  } catch (error) {
    logMac("spotify.context_play.mac_app.failed", { kind, name: textForLog(item.name), uri: item.uri, error });
  }
  const playback = await callSpotifyFunction("spotify-playback", { action: "play", contextUri: item.uri });
  if (playback.ok) apiOk = true;
  else {
    apiError = playback.error || "Spotify playback failed.";
    logMac("spotify.context_play.api.failed_after_native", { kind, name: textForLog(item.name), error: apiError });
  }

  if (!nativeOk && !apiOk) return { ok: false, say: apiError || `Spotify opened, but I could not start the ${kind}.` };
  sendTaskProgress({ status: "done", text: `Playing ${item.name}` });
  return { ok: true, say: `Playing ${label} on Spotify.` };
}

function parseSpotifyCreatePlaylistIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(?:create|make|start)\b/i.test(source) || !/\bplaylist\b/i.test(source)) return null;
  const addCurrent = /\b(?:and\s+)?(?:add|put|with)\s+(?:this|current|playing)(?:\s+(?:song|track))?\b/i.test(source);
  const named = source.match(/\b(?:create|make|start)\s+(?:me\s+)?(?:a\s+|the\s+)?(?:new\s+)?playlist\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?(?:\s+and\s+.*)?[?.!]?\s*$/i)
    || source.match(/\b(?:create|make|start)\s+(?:me\s+)?(?:a\s+|the\s+)?(?:new\s+)?["“]?(.+?)["”]?\s+playlist(?:\s+(?:on|in)\s+spotify)?(?:\s+and\s+.*)?[?.!]?\s*$/i);
  let name = named?.[1] ? cleanSpotifyPlaylistName(named[1]) : "";
  if (/^(?:new|a|me|for me|spotify)$/i.test(name)) name = "";
  return { name, addCurrent, needsName: !name };
}

async function createSpotifyPlaylistOnMac(name, options = {}) {
  const playlistName = String(name || "").trim();
  if (!playlistName) return { ok: false, say: "Tell me the playlist name and I will create it on Spotify." };
  sendTaskProgress({ status: "thinking", text: `Creating playlist ${playlistName}` });
  const created = await callSpotifyFunction("spotify-add-track", { action: "createPlaylist", name: playlistName });
  if (!created.ok) {
    logMac("spotify.create_playlist.failed", { name: textForLog(playlistName), error: created.error || "" });
    return { ok: false, say: created.error || `I could not create the playlist ${playlistName}.` };
  }
  logMac("spotify.create_playlist.done", {
    name: textForLog(created.playlistName || playlistName),
    playlistId: created.playlistId || "",
    addCurrent: Boolean(options.addCurrent),
  });
  if (options.addCurrent) {
    const added = await addSpotifyTrackOnMac({ song: "", playlist: created.playlistName || playlistName, useCurrent: true });
    if (added.ok) {
      return { ok: true, say: `Created the playlist ${created.playlistName || playlistName} and ${added.say.charAt(0).toLowerCase()}${added.say.slice(1)}` };
    }
    return { ok: true, say: `Created the playlist ${created.playlistName || playlistName}, but adding the current song failed: ${added.say}` };
  }
  sendTaskProgress({ status: "done", text: `Created ${created.playlistName || playlistName}` });
  return { ok: true, say: `Created the playlist ${created.playlistName || playlistName} on Spotify.` };
}

async function playSpotifyTrackInMacApp(uri, positionMs = 0) {
  const safeUri = escapeAppleScriptString(uri);
  const positionSeconds = Math.max(0, Math.round(Number(positionMs) || 0) / 1000);
  const seekLine = positionSeconds > 0
    ? `  delay 0.35
  set player position to ${positionSeconds}`
    : "";
  const script = `
tell application "Spotify"
  activate
  play track "${safeUri}"
${seekLine}
end tell`;
  await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 10000 });
}

async function isMacApplicationRunning(appName) {
  const safeApp = escapeAppleScriptString(canonicalAppName(appName));
  const script = `
tell application "System Events"
  return exists application process "${safeApp}"
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 2500 });
    return /^true$/i.test(stdout.trim());
  } catch (error) {
    logMac("app.running_check.failed", { appName: safeApp, error });
    return false;
  }
}

async function readSpotifyMacState() {
  const script = `
tell application "System Events"
  set spotifyRunning to exists application process "Spotify"
end tell
if spotifyRunning then
  tell application "Spotify"
    set stateText to player state as text
    set trackName to ""
    set artistName to ""
    set volumeLevel to ""
    set trackUrl to ""
    try
      set trackName to name of current track
      set artistName to artist of current track
      set trackUrl to spotify url of current track
    end try
    try
      set volumeLevel to sound volume as text
    end try
    return stateText & linefeed & trackName & linefeed & artistName & linefeed & volumeLevel & linefeed & trackUrl
  end tell
else
  return "not running"
end if`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 4000 });
    const [state = "", name = "", artist = "", volume = "", uri = ""] = stdout.trim().split(/\r?\n/);
    const volumePercent = Number.isFinite(Number(volume)) ? clampSpotifyVolume(volume) : null;
    return { ok: true, state, name, artist, volumePercent, uri };
  } catch (error) {
    logMac("spotify.mac_app.state.failed", { error });
    return { ok: false, error: error?.message || "Could not read Spotify state." };
  }
}

async function setSpotifyVolumeInMacApp(volumePercent) {
  const nextVolume = clampSpotifyVolume(volumePercent);
  const script = `
tell application "Spotify"
  activate
  set sound volume to ${nextVolume}
  return sound volume as text
end tell`;
  const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 6000 });
  return clampSpotifyVolume(stdout.trim() || nextVolume);
}

async function getSpotifyApiVolumeFallback() {
  const playerState = await callSpotifyFunction("spotify-player-state", {});
  if (!playerState.ok) return { ok: false, error: playerState.error || "Could not read Spotify volume." };
  const activeVolume = playerState?.activeDevice?.volumePercent;
  const firstDeviceVolume = Array.isArray(playerState.devices)
    ? playerState.devices.find((device) => typeof device?.volumePercent === "number")?.volumePercent
    : null;
  const current = typeof activeVolume === "number"
    ? activeVolume
    : typeof firstDeviceVolume === "number"
      ? firstDeviceVolume
      : 50;
  return { ok: true, volumePercent: clampSpotifyVolume(current) };
}

async function controlSpotifyVolumeOnMac(volumeIntent) {
  const startedAt = Date.now();
  let target = typeof volumeIntent?.volumePercent === "number" ? clampSpotifyVolume(volumeIntent.volumePercent) : null;
  const step = Number(volumeIntent?.volumeStep || 0);
  sendTaskProgress({ status: "thinking", text: "Adjusting Spotify volume" });

  if (target == null) {
    const state = await readSpotifyMacState();
    if (typeof state?.volumePercent === "number") {
      target = clampSpotifyVolume(state.volumePercent + step);
    } else {
      const apiVolume = await getSpotifyApiVolumeFallback();
      if (!apiVolume.ok) return { ok: false, say: apiVolume.error || "I could not read Spotify volume yet." };
      target = clampSpotifyVolume(apiVolume.volumePercent + step);
    }
  }

  let nativeOk = false;
  try {
    const actual = await setSpotifyVolumeInMacApp(target);
    nativeOk = true;
    logMac("spotify.mac_app.volume.done", { requested: target, actual, durationMs: Date.now() - startedAt });
    sendTaskProgress({ status: "done", text: `Volume ${actual}%` });
    return { ok: true, say: `Spotify volume set to ${actual}%.` };
  } catch (error) {
    logMac("spotify.mac_app.volume.failed", { requested: target, error });
  }

  const api = await callSpotifyFunction("spotify-playback", { action: "volume", volumePercent: target });
  if (api.ok) {
    logMac("spotify.api_volume.done", { requested: target, nativeOk, durationMs: Date.now() - startedAt });
    sendTaskProgress({ status: "done", text: `Volume ${target}%` });
    return { ok: true, say: `Spotify volume set to ${target}%.` };
  }
  logMac("spotify.api_volume.failed_after_native", { requested: target, error: api.error || "" });
  return { ok: false, say: api.error || "Spotify did not accept the volume change." };
}

async function controlSpotifyPlaybackOnMac(control) {
  const normalized = String(control || "").trim().toLowerCase();
  const commandMap = {
    pause: "pause",
    play: "play",
    next: "next track",
    previous: "previous track",
  };
  const command = commandMap[normalized];
  if (!command) return { ok: false, say: "Tell me pause, resume, next, or previous for Spotify." };
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: `Spotify ${normalized}` });
  if (normalized === "play") await openApp("Spotify");
  const isSkip = normalized === "next" || normalized === "previous";
  const before = isSkip ? await readSpotifyMacState() : null;
  try {
    await execFileP("/usr/bin/osascript", ["-e", `tell application "Spotify" to ${command}`], { timeout: 6000 });
    if (isSkip) await new Promise((resolve) => setTimeout(resolve, 500));
    const state = await readSpotifyMacState();
    logMac("spotify.mac_app.control.done", {
      control: normalized,
      state: state?.state || "",
      track: state?.name || "",
      artist: state?.artist || "",
      previousTrack: before?.name || "",
      durationMs: Date.now() - startedAt,
    });
    if (isSkip && state?.ok && state.name) {
      const artistLine = state.artist ? ` by ${state.artist}` : "";
      if (before?.name && state.name === before.name) {
        return { ok: true, say: `Spotify stayed on ${state.name}${artistLine}. It might be on repeat, want me to turn that off?` };
      }
      return {
        ok: true,
        say: normalized === "next"
          ? `Skipped. Now playing ${state.name}${artistLine}.`
          : `Went back. Now playing ${state.name}${artistLine}.`,
      };
    }
    return { ok: true, say: normalized === "pause" ? "Paused Spotify." : normalized === "play" ? "Resumed Spotify." : normalized === "next" ? "Skipped to the next track." : "Went back to the previous track." };
  } catch (error) {
    logMac("spotify.mac_app.control.failed", { control: normalized, error });
    const apiAction = normalized === "previous" ? "previous" : normalized;
    const api = await callSpotifyFunction("spotify-playback", { action: apiAction });
    if (api.ok) return { ok: true, say: normalized === "pause" ? "Paused Spotify." : normalized === "play" ? "Resumed Spotify." : normalized === "next" ? "Skipped to the next track." : "Went back to the previous track." };
    return { ok: false, say: api.error || "Spotify did not accept that playback command." };
  }
}

async function playSpotifySongOnMac(songQuery) {
  const query = String(songQuery || "").trim();
  if (!query) return { ok: false, say: "Tell me the song name and I will play it on Spotify." };
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: `Searching Spotify for ${query}` });
  const wasRunningPromise = isMacApplicationRunning("Spotify");
  const openPromise = openApp("Spotify");
  const searchPromise = callSpotifyFunction("spotify-search", { query, limit: 5 });
  const [wasRunning, openResult, search] = await Promise.all([wasRunningPromise, openPromise, searchPromise]);
  if (!search.ok) return { ok: false, say: search.error || "Spotify search failed." };
  const track = Array.isArray(search.tracks) ? search.tracks[0] : null;
  if (!track?.uri) return { ok: false, say: `I could not find ${query} on Spotify.` };

  sendTaskProgress({ status: "thinking", text: "Opening Spotify" });
  if (!openResult.ok) return { ok: false, say: "I found the track, but I could not open the Spotify Mac app." };
  await new Promise((resolve) => setTimeout(resolve, wasRunning ? 180 : 650));

  const title = String(track.name || track.title || query).trim();
  const artists = formatSpotifyArtists(track) || "unknown";
  let nativeOk = false;
  let apiOk = false;
  let apiError = "";

  sendTaskProgress({ status: "thinking", text: `Playing ${title}` });
  try {
    await playSpotifyTrackInMacApp(track.uri);
    nativeOk = true;
    const state = await readSpotifyMacState();
    logMac("spotify.mac_app.play.done", {
      track: title,
      artists,
      uri: track.uri,
      state: state?.state || "",
      stateTrack: state?.name || "",
      stateArtist: state?.artist || "",
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logMac("spotify.mac_app.play.failed", { track: title, artists, uri: track.uri, error });
  }

  const playback = await callSpotifyFunction("spotify-playback", { action: "play", uris: [track.uri] });
  if (playback.ok) {
    apiOk = true;
  } else {
    apiError = playback.error || "Spotify playback failed.";
    logMac("spotify.api_play.failed_after_native", { track: title, artists, error: apiError });
  }

  if (!nativeOk && !apiOk) return { ok: false, say: apiError || "Spotify opened, but I could not start playback." };
  sendTaskProgress({ status: "done", text: `Playing ${title}` });
  return { ok: true, say: `Playing ${title} by ${artists} on Spotify.` };
}

async function playMacTeamDemoSpotifyTrack() {
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: "Playing DAF on Spotify" });
  const wasRunning = await isMacApplicationRunning("Spotify");
  const openResult = await openApp("Spotify");
  if (!openResult.ok) return { ok: false, say: "I could not open Spotify for the demo." };
  await new Promise((resolve) => setTimeout(resolve, wasRunning ? 180 : 650));

  let nativeOk = false;
  let apiOk = false;
  let apiError = "";
  try {
    await playSpotifyTrackInMacApp(MAC_TEAM_DEMO_TRACK_URI, MAC_TEAM_DEMO_TRACK_START_MS);
    nativeOk = true;
    logMac("team_demo.spotify.mac_app.play.done", { durationMs: Date.now() - startedAt });
  } catch (error) {
    logMac("team_demo.spotify.mac_app.play.failed", { error });
  }

  const playback = await callSpotifyFunction("spotify-playback", {
    action: "play",
    uris: [MAC_TEAM_DEMO_TRACK_URI],
    positionMs: MAC_TEAM_DEMO_TRACK_START_MS,
  });
  if (playback.ok) apiOk = true;
  else {
    apiError = playback.error || "Spotify playback failed.";
    logMac("team_demo.spotify.api_play.failed_after_native", { error: apiError });
  }

  if (!nativeOk && !apiOk) return { ok: false, say: apiError || "Spotify opened, but I could not start DAF." };
  sendTaskProgress({ status: "done", text: "DAF is playing" });
  return { ok: true, say: "DAF is playing on Spotify." };
}

function spotifyTrackIdFromTrack(track) {
  const id = String(track?.id || "").trim();
  if (id) return id;
  const uri = String(track?.uri || "").trim();
  const uriMatch = uri.match(/spotify:track:([A-Za-z0-9]+)/i);
  if (uriMatch?.[1]) return uriMatch[1];
  const externalUrl = String(track?.externalUrl || track?.external_url || "").trim();
  const urlMatch = externalUrl.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  return urlMatch?.[1] || "";
}

async function resolveSpotifyTrackForAdd(intent) {
  if (intent?.useCurrent) {
    const playerState = await callSpotifyFunction("spotify-player-state", {});
    if (playerState.ok && playerState.track) {
      const trackId = spotifyTrackIdFromTrack(playerState.track);
      if (trackId) return { ok: true, track: playerState.track, trackId, source: "api_current" };
    }

    const state = await readSpotifyMacState();
    if (state.ok && state.name) {
      const query = [state.name, state.artist].filter(Boolean).join(" ");
      const search = await callSpotifyFunction("spotify-search", { query, limit: 3 });
      if (!search.ok) return { ok: false, error: search.error || "Spotify search failed." };
      const track = Array.isArray(search.tracks) ? search.tracks[0] : null;
      const trackId = spotifyTrackIdFromTrack(track);
      if (trackId) return { ok: true, track, trackId, source: "mac_current_search" };
    }

    return { ok: false, error: "I could not read the currently playing Spotify track." };
  }

  const query = cleanSpotifySongQuery(intent?.song || "");
  if (!query) return { ok: false, error: "Tell me which song to add." };
  const search = await callSpotifyFunction("spotify-search", { query, limit: 5 });
  if (!search.ok) return { ok: false, error: search.error || "Spotify search failed." };
  const track = Array.isArray(search.tracks) ? search.tracks[0] : null;
  const trackId = spotifyTrackIdFromTrack(track);
  if (!trackId) return { ok: false, error: `I could not find ${query} on Spotify.` };
  return { ok: true, track, trackId, source: "search" };
}

async function addSpotifyTrackOnMac(intent) {
  const playlistName = intent?.playlist ? cleanSpotifyPlaylistName(intent.playlist) : "";
  const destination = playlistName ? `playlist ${playlistName}` : "Liked Songs";
  sendTaskProgress({ status: "thinking", text: `Adding to ${destination}` });
  logMac("spotify.add_track.start", {
    useCurrent: Boolean(intent?.useCurrent),
    song: textForLog(intent?.song || ""),
    playlist: textForLog(playlistName),
  });

  const resolved = await resolveSpotifyTrackForAdd(intent);
  if (!resolved.ok) {
    logMac("spotify.add_track.resolve_failed", {
      useCurrent: Boolean(intent?.useCurrent),
      song: textForLog(intent?.song || ""),
      error: resolved.error || "",
    });
    return { ok: false, say: resolved.error || "I could not resolve that Spotify track." };
  }

  const track = resolved.track;
  const title = String(track?.name || intent?.song || "that track").trim();
  const artists = formatSpotifyArtists(track);
  const payload = playlistName
    ? { action: "addToPlaylist", trackId: resolved.trackId, playlistName }
    : { action: "like", trackId: resolved.trackId };
  const result = await callSpotifyFunction("spotify-add-track", payload);
  if (!result.ok) {
    logMac("spotify.add_track.failed", {
      track: textForLog(title),
      playlist: textForLog(playlistName),
      error: result.error || "",
    });
    return { ok: false, say: result.error || `I could not add ${title} to ${destination}.` };
  }

  const finalDestination = playlistName
    ? `playlist ${result.playlistName || playlistName}`
    : "Liked Songs";
  logMac("spotify.add_track.done", {
    track: textForLog(title),
    artists: textForLog(artists),
    destination: textForLog(finalDestination),
    source: resolved.source,
  });
  sendTaskProgress({ status: "done", text: `Added to ${finalDestination}` });
  const artistLine = artists ? ` by ${artists}` : "";
  return { ok: true, say: `Added ${title}${artistLine} to ${finalDestination} on Spotify.` };
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
  return resolveAppTarget(cleaned) || cleaned;
}

function commonWebTargetFor(appName) {
  return resolveWebTarget(cleanOpenTarget(appName));
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

const NATIVE_APP_BUNDLE_IDS = {
  notes: "com.apple.Notes",
  mail: "com.apple.mail",
  contacts: "com.apple.AddressBook",
  calendar: "com.apple.iCal",
  reminders: "com.apple.reminders",
  finder: "com.apple.finder",
  preview: "com.apple.Preview",
  photos: "com.apple.Photos",
  music: "com.apple.Music",
  messages: "com.apple.MobileSMS",
  facetime: "com.apple.FaceTime",
  safari: "com.apple.Safari",
  spotify: "com.spotify.client",
};

function nativeBundleIdForApp(appName) {
  const key = normalizeSearchToken(canonicalAppName(appName));
  return NATIVE_APP_BUNDLE_IDS[key] || "";
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
  const bundleId = nativeBundleIdForApp(canonical);
  if (bundleId) {
    try {
      await execFileP("open", ["-b", bundleId], { timeout: 8000 });
      logMac("app.open.success", { requested: textForLog(appName), canonical, bundleId, method: "open-bundle" });
      return { ok: true, appName: canonical, bundleId, method: "open-bundle" };
    } catch (error) {
      logMac("app.open.bundle.failed", { appName: canonical, bundleId, error });
    }
  }

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

async function quitMacApplication(appName) {
  const canonical = canonicalAppName(appName);
  if (!canonical || process.platform !== "darwin") return { ok: false, appName: canonical, status: "unsupported" };
  const safeApp = escapeAppleScriptString(canonical);
  const script = `
tell application "System Events"
  set appIsRunning to exists application process "${safeApp}"
end tell
if appIsRunning then
  tell application "${safeApp}" to quit
  return "closed"
else
  return "not_running"
end if`;
  logMac("app.close.start", { requested: textForLog(appName), canonical });
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    const status = stdout.trim() || "unknown";
    logMac("app.close.done", { requested: textForLog(appName), canonical, status });
    return { ok: status === "closed", appName: canonical, status };
  } catch (error) {
    logMac("app.close.failed", { requested: textForLog(appName), canonical, error });
    return { ok: false, appName: canonical, status: "failed", error: error?.message || "Could not close app." };
  }
}

async function closeOpenTarget(target) {
  const cleaned = cleanOpenTarget(target);
  if (!cleaned) return { ok: false, say: "Tell me what to close." };

  logMac("delegate.close_intent", { target: textForLog(cleaned) });
  const appResult = await quitMacApplication(cleaned);
  const website = commonWebTargetFor(cleaned);
  let webResult = null;
  if (website) {
    try {
      const host = new URL(website).hostname.replace(/^www\./, "");
      webResult = await closeBrowserTabsMatching(host);
      logMac("delegate.close_web_tabs", { target: textForLog(cleaned), website, host, attemptedBrowsers: webResult?.attemptedBrowsers || 0 });
    } catch (error) {
      logMac("delegate.close_web_tabs.failed", { target: textForLog(cleaned), website, error });
    }
  }

  if (appResult.ok && website) {
    return { ok: true, say: `Closed ${appResult.appName}, and closed any ${cleaned} browser tabs too.` };
  }
  if (appResult.ok) {
    return { ok: true, say: `Closed ${appResult.appName}.` };
  }
  if (website) {
    return { ok: true, say: `I did not see the ${cleaned} app running, so I closed any ${cleaned} browser tabs I could find.` };
  }

  const matches = await findInstalledApps(cleaned);
  if (matches.length) {
    const retry = await quitMacApplication(appBaseName(matches[0]));
    if (retry.ok) return { ok: true, say: `Closed ${retry.appName}.` };
    return { ok: false, say: `${appBaseName(matches[0])} exists, but I do not see it running right now.` };
  }
  return { ok: false, say: `I could not find an app or known website called ${cleaned}.` };
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
  const context = await readActiveMacContext();
  if (context && !isBrainoSelfContext(context)) activeMacContext = context;
  return describeMacContext(activeMacContext || context);
}

function describeMacContext(context) {
  if (!context?.appName) return "";
  const title = context.browserTitle || context.windowTitle || "";
  const parts = [context.appName];
  if (title) parts.push(title);
  if (context.browserUrl) parts.push(context.browserUrl);
  return parts.join(" - ");
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

function organizeModeForText(text) {
  const raw = String(text || "").toLowerCase();
  if (/\bby\s+date\b|\bdate\s+(?:wise|based)\b|\bmonth\b|\bmodified\b/.test(raw)) return "date";
  if (/\bby\s+project\b|\bproject\s+(?:wise|based)\b|\bprojects?\b/.test(raw)) return "project";
  return "type";
}

function dateCategoryForFile(stats) {
  const date = stats?.mtime instanceof Date ? stats.mtime : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `By Date/${year}-${month}`;
}

function projectCategoryForFile(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  const normalized = normalizeSearchToken(base)
    .replace(/\bscreen\s*shot\b/g, " ")
    .replace(/\bscreenshot\b/g, " ")
    .replace(/\bscreen\s*recording\b/g, " ")
    .replace(/\b(?:copy|final|draft|version|v\d+)\b/g, " ")
    .replace(/\b\d{4}[-_. ]?\d{1,2}[-_. ]?\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[-_. ]?\d{1,2}[-_. ]?\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}[.:]\d{2}(?:\s?[ap]m)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const knownProjects = [
    ["Braino", /\bbraino|notetaker|sidebrain|cinema\s*mode\b/],
    ["Resume", /\bresume|cv|cover\s+letter|portfolio\b/],
    ["Amdocs", /\bamdocs|anz|at\s*and\s*t|att\b/],
    ["Invoices and Receipts", /\binvoice|receipt|payment|bill\b/],
    ["Screenshots", /\bscreen|shot|recording\b/],
  ];
  for (const [name, regex] of knownProjects) {
    if (regex.test(normalized)) return `By Project/${name}`;
  }
  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !/^\d+$/.test(word))
    .slice(0, 3);
  return `By Project/${words.length ? titleCaseWords(words.join(" ")) : "Misc Project"}`;
}

function organizationCategoryForItem(fileName, stats, mode) {
  if (mode === "date") return dateCategoryForFile(stats);
  if (mode === "project") return projectCategoryForFile(fileName);
  return categoryForFile(fileName);
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

function readFileActionHistory() {
  try {
    if (!fs.existsSync(FILE_ACTION_HISTORY_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(FILE_ACTION_HISTORY_PATH, "utf8"));
    return Array.isArray(parsed?.actions) ? parsed.actions : [];
  } catch (error) {
    logMac("file.history.read.failed", { error });
    return [];
  }
}

async function writeFileActionHistory(actions) {
  const safeActions = Array.isArray(actions) ? actions.slice(-MAX_FILE_ACTION_HISTORY) : [];
  await fs.promises.mkdir(AUTH_STORE_DIR, { recursive: true });
  await fs.promises.writeFile(FILE_ACTION_HISTORY_PATH, JSON.stringify({ actions: safeActions }, null, 2));
}

async function pushFileAction(action) {
  const nextAction = {
    id: action?.id || crypto.randomUUID(),
    createdAt: action?.createdAt || new Date().toISOString(),
    type: action?.type || "file_action",
    description: action?.description || "file action",
    steps: Array.isArray(action?.steps) ? action.steps : [],
  };
  const history = readFileActionHistory();
  history.push(nextAction);
  await writeFileActionHistory(history);
  logMac("file.history.push", {
    actionId: nextAction.id,
    type: nextAction.type,
    description: nextAction.description,
    steps: nextAction.steps.length,
  });
  return nextAction;
}

function hasFileActionHistory() {
  return readFileActionHistory().length > 0;
}

function safePathExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch (_) {
    return false;
  }
}

function isDangerousFileOperationPath(filePath) {
  const resolved = path.resolve(String(filePath || ""));
  const home = os.homedir();
  const exactProtected = new Set([
    "/",
    home,
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Downloads"),
    path.join(home, "Pictures"),
    path.join(home, "Movies"),
    path.join(home, "Music"),
    path.join(home, "Applications"),
    "/Applications",
    "/System",
    "/Library",
  ]);
  if (exactProtected.has(resolved)) return true;
  if (/^\/(?:System|Library|bin|sbin|usr|private|etc|var)\b/.test(resolved)) return true;
  if (path.basename(resolved).startsWith(".")) return true;
  return false;
}

function sanitizeFileSystemName(value) {
  return String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+(?:for me|please|pls)$/i, "")
    .replace(/^(?:the|my|an?|new)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[/:]/g, "-")
    .replace(/^\.+$/g, "")
    .trim();
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function knownFolderPathForName(value) {
  const key = normalizeSearchToken(value)
    .replace(/\bfolder\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const folders = {
    desktop: path.join(os.homedir(), "Desktop"),
    downloads: path.join(os.homedir(), "Downloads"),
    download: path.join(os.homedir(), "Downloads"),
    documents: path.join(os.homedir(), "Documents"),
    document: path.join(os.homedir(), "Documents"),
    pictures: path.join(os.homedir(), "Pictures"),
    picture: path.join(os.homedir(), "Pictures"),
    photos: path.join(os.homedir(), "Pictures"),
    photo: path.join(os.homedir(), "Pictures"),
    movies: path.join(os.homedir(), "Movies"),
    videos: path.join(os.homedir(), "Movies"),
    video: path.join(os.homedir(), "Movies"),
    music: path.join(os.homedir(), "Music"),
    songs: path.join(os.homedir(), "Music"),
    home: os.homedir(),
  };
  return folders[key] || "";
}

function extractKnownFolderReference(text) {
  const match = String(text || "").match(/\b(?:on|in|inside|under|within|to|into)\s+(?:my\s+)?(desktop|downloads?|documents?|pictures?|photos?|movies?|videos?|music|songs?|home)(?:\s+folder)?\b/i);
  return match?.[1] ? knownFolderPathForName(match[1]) : "";
}

function stripKnownFolderReference(text) {
  return String(text || "")
    .replace(/\b(?:on|in|inside|under|within|to|into)\s+(?:my\s+)?(?:desktop|downloads?|documents?|pictures?|photos?|movies?|videos?|music|songs?|home)(?:\s+folder)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandHomePath(value) {
  const rawPath = String(value || "").trim();
  if (!rawPath) return "";
  if (rawPath === "~") return os.homedir();
  if (rawPath.startsWith("~/")) return path.join(os.homedir(), rawPath.slice(2));
  return rawPath;
}

async function movePath(sourcePath, destinationPath) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    await fs.promises.rename(sourcePath, destinationPath);
    return;
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
  }
  await fs.promises.cp(sourcePath, destinationPath, {
    recursive: true,
    force: false,
    errorOnExist: true,
    preserveTimestamps: true,
  });
  await fs.promises.rm(sourcePath, { recursive: true, force: false });
}

function isFileActionUndoIntent(text) {
  const raw = String(text || "").toLowerCase();
  const undoSignal = /\b(undo|reverse|restore|put back|move back)\b/.test(raw);
  if (!undoSignal) return false;
  if (/\b(file|folder|rename|renamed|move|moved|delete|deleted|trash|desktop|organize|organise|cleanup|cleaned|sort|sorted|action)\b/.test(raw)) return true;
  return /\b(it|that|this|last|previous|everything|all|what you just did|whatever you just did)\b/.test(raw) && hasFileActionHistory();
}

async function undoLastFileAction() {
  const history = readFileActionHistory();
  const action = history.pop();
  if (!action) {
    if (hasDesktopOrganizeManifest()) return undoDesktopOrganization();
    return { ok: false, say: "I do not have a file action to undo yet." };
  }

  let undone = 0;
  let skipped = 0;
  const touchedDirs = new Set();
  const steps = Array.isArray(action.steps) ? action.steps.slice().reverse() : [];
  logMac("file.undo.start", {
    actionId: action.id,
    type: action.type,
    description: action.description,
    steps: steps.length,
  });

  for (const step of steps) {
    try {
      if (["move", "rename", "delete"].includes(step?.type)) {
        const currentPath = step.type === "delete" ? step.trashPath : step.to;
        const originalPath = step.from;
        if (!safePathExists(currentPath) || !originalPath) {
          skipped += 1;
          continue;
        }
        const destinationPath = await uniquePath(originalPath);
        sendTaskProgress({ status: "thinking", text: `Restoring ${path.basename(destinationPath)}` });
        await movePath(currentPath, destinationPath);
        touchedDirs.add(path.dirname(currentPath));
        undone += 1;
      } else if (step?.type === "create_folder") {
        const folderPath = step.path;
        if (!safePathExists(folderPath)) {
          skipped += 1;
          continue;
        }
        const entries = await fs.promises.readdir(folderPath);
        if (entries.length) {
          skipped += 1;
          logMac("file.undo.create_folder.not_empty", { folderPath, entries: entries.length });
          continue;
        }
        sendTaskProgress({ status: "thinking", text: `Removing ${path.basename(folderPath)}` });
        await fs.promises.rmdir(folderPath);
        undone += 1;
      }
    } catch (error) {
      skipped += 1;
      logMac("file.undo.step.failed", { actionId: action.id, step, error });
    }
  }

  if (action.type === "organize_desktop") {
    const { organizedDir, manifestPath } = desktopOrganizePaths();
    try { if (fs.existsSync(manifestPath)) await fs.promises.unlink(manifestPath); } catch (_) {}
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
      if (fs.existsSync(organizedDir) && (await fs.promises.readdir(organizedDir)).length === 0) await fs.promises.rmdir(organizedDir);
    } catch (_) {}
  }

  await writeFileActionHistory(history);
  logMac("file.undo.done", {
    actionId: action.id,
    type: action.type,
    undone,
    skipped,
  });
  sendTaskProgress({ status: "done", text: undone ? `Undid ${undone} file step${undone === 1 ? "" : "s"}` : "Undo checked" });
  if (!undone) {
    return { ok: false, say: `I found the last action, but there was nothing left I could safely undo${skipped ? `; ${skipped} step${skipped === 1 ? "" : "s"} were skipped` : ""}.` };
  }
  return {
    ok: true,
    say: `Done. I undid ${action.description || "the last file action"}${skipped ? `, with ${skipped} skipped step${skipped === 1 ? "" : "s"}` : ""}.`,
  };
}

function parseCreateFolderIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(create|make|new)\b/i.test(source) || !/\bfolders?\b/i.test(source)) return null;
  const captured = extractAfter(source, [
    /\b(?:create|make)\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called|named)?\s*(.+)$/i,
    /\b(?:create|make)\s+(.+?)\s+folder\b/i,
    /\bnew\s+folder\s+(?:called|named)?\s*(.+)$/i,
  ]);
  const parentDir = extractKnownFolderReference(source) || path.join(os.homedir(), "Desktop");
  const name = sanitizeFileSystemName(stripKnownFolderReference(captured)
    .replace(/\b(?:called|named)\b/gi, " ")
    .replace(/\bfolder\b/gi, " "));
  if (!name) return null;
  return { name, parentDir };
}

async function createMacFolder(intent) {
  const parentDir = intent?.parentDir || path.join(os.homedir(), "Desktop");
  const folderName = sanitizeFileSystemName(intent?.name || "");
  if (!folderName) return { ok: false, say: "Tell me the folder name and I will create it." };
  if (!safePathExists(parentDir)) return { ok: false, say: `I could not find the parent folder for ${folderName}.` };
  if (isDangerousFileOperationPath(parentDir) && parentDir === "/Applications") {
    return { ok: false, say: "I will not create folders inside Applications from voice." };
  }

  const targetPath = await uniquePath(path.join(parentDir, folderName));
  sendTaskProgress({ status: "thinking", text: `Creating ${path.basename(targetPath)}` });
  await fs.promises.mkdir(targetPath, { recursive: false });
  await pushFileAction({
    type: "create_folder",
    description: `creating ${path.basename(targetPath)}`,
    steps: [{ type: "create_folder", path: targetPath }],
  });
  sendTaskProgress({ status: "done", text: `Created ${path.basename(targetPath)}` });
  logMac("file.create_folder.done", { folderName, parentDir, targetPath });
  return {
    ok: true,
    files: [targetPath],
    say: `Created ${path.basename(targetPath)} in ${path.basename(parentDir) || parentDir}.`,
  };
}

function parseRenameFileIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(rename|change name|call)\b/i.test(source)) return null;
  const match = source.match(/\brename\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+to\s+(.+)$/i)
    || source.match(/\bchange\s+(?:the\s+)?name\s+of\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+to\s+(.+)$/i)
    || source.match(/\bcall\s+(?:the\s+|my\s+|a\s+|an\s+)?(?:file|folder|document|pdf|image|video)\s+(.+?)\s+(.+)$/i);
  if (!match?.[1] || !match?.[2]) return null;
  const kind = fileKindForText(match[1]);
  const query = cleanFileQuery(match[1], kind);
  const newName = sanitizeFileSystemName(match[2].replace(/\b(?:file|folder|document|pdf|image|video)\b$/i, ""));
  if (!query || !newName) return null;
  return { query, kind, newName };
}

async function renameMacFile(intent) {
  const files = await findFiles(intent.query, { kind: intent.kind });
  if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${intent.query}.` };
  const sourcePath = files[0];
  if (isDangerousFileOperationPath(sourcePath)) return { ok: false, say: `I will not rename ${path.basename(sourcePath)} from voice.` };
  const stats = await fs.promises.lstat(sourcePath);
  const ext = stats.isFile() ? path.extname(sourcePath) : "";
  const hasNewExt = /\.[a-z0-9]{2,8}$/i.test(intent.newName);
  const finalName = stats.isFile() && ext && !hasNewExt ? `${intent.newName}${ext}` : intent.newName;
  const destinationPath = await uniquePath(path.join(path.dirname(sourcePath), finalName));

  sendTaskProgress({ status: "thinking", text: `Renaming ${path.basename(sourcePath)}` });
  await movePath(sourcePath, destinationPath);
  await pushFileAction({
    type: "rename",
    description: `renaming ${path.basename(sourcePath)} to ${path.basename(destinationPath)}`,
    steps: [{ type: "rename", from: sourcePath, to: destinationPath }],
  });
  sendTaskProgress({ status: "done", text: `Renamed ${path.basename(destinationPath)}` });
  logMac("file.rename.done", { sourcePath, destinationPath });
  return {
    ok: true,
    files: [destinationPath],
    say: `Renamed ${path.basename(sourcePath)} to ${path.basename(destinationPath)}.`,
  };
}

function parseMoveFileIntent(raw) {
  const source = String(raw || "").trim();
  if (/\b(move back|put back|undo|restore)\b/i.test(source)) return null;
  if (!/\b(move|put|place)\b/i.test(source)) return null;
  const match = source.match(/\b(?:move|put|place)\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+(?:to|into|in)\s+(?:the\s+|my\s+)?(.+)$/i);
  if (!match?.[1] || !match?.[2]) return null;
  const kind = fileKindForText(match[1]);
  const query = cleanFileQuery(match[1], kind);
  const destination = match[2].trim();
  if (!query || !destination) return null;
  return { query, kind, destination };
}

async function resolveDestinationFolder(destinationText) {
  const raw = String(destinationText || "").trim();
  if (!raw) return { ok: false, error: "No destination folder was provided." };
  const expanded = expandHomePath(raw.replace(/^["'`]+|["'`]+$/g, ""));
  if (path.isAbsolute(expanded) && safePathExists(expanded)) {
    const stats = await fs.promises.lstat(expanded);
    return stats.isDirectory()
      ? { ok: true, folderPath: expanded, created: false }
      : { ok: false, error: `${path.basename(expanded)} is not a folder.` };
  }

  const known = knownFolderPathForName(raw) || extractKnownFolderReference(raw);
  if (known) return { ok: true, folderPath: known, created: false };

  const newFolderName = extractAfter(raw, [
    /\b(?:new\s+)?folder\s+(?:called|named)\s+(.+)$/i,
    /\b(?:new\s+)?folder\s+(.+)$/i,
  ]);
  if (/\bnew\s+folder\b/i.test(raw) && newFolderName) {
    const parentDir = extractKnownFolderReference(raw) || path.join(os.homedir(), "Desktop");
    const folderPath = await uniquePath(path.join(parentDir, sanitizeFileSystemName(stripKnownFolderReference(newFolderName))));
    await fs.promises.mkdir(folderPath, { recursive: false });
    return { ok: true, folderPath, created: true };
  }

  const cleanDestination = sanitizeFileSystemName(stripKnownFolderReference(raw).replace(/\bfolder\b/gi, " "));
  if (!cleanDestination) return { ok: false, error: "I could not understand the destination folder." };
  const folders = await findFiles(cleanDestination, { kind: "folder" });
  if (!folders.length) return { ok: false, error: `I could not find a folder called ${cleanDestination}.` };
  return { ok: true, folderPath: folders[0], created: false };
}

async function moveMacFile(intent) {
  const files = await findFiles(intent.query, { kind: intent.kind });
  if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${intent.query}.` };
  const sourcePath = files[0];
  if (isDangerousFileOperationPath(sourcePath)) return { ok: false, say: `I will not move ${path.basename(sourcePath)} from voice.` };
  const destination = await resolveDestinationFolder(intent.destination);
  if (!destination.ok) return { ok: false, say: destination.error };
  const destinationFolder = destination.folderPath;
  const sourceResolved = path.resolve(sourcePath);
  const destinationResolved = path.resolve(destinationFolder);
  if (sourceResolved === destinationResolved || path.dirname(sourceResolved) === destinationResolved) {
    return { ok: true, say: `${path.basename(sourcePath)} is already there.` };
  }
  if (destinationResolved.startsWith(`${sourceResolved}${path.sep}`)) {
    return { ok: false, say: "I will not move a folder inside itself." };
  }

  const destinationPath = await uniquePath(path.join(destinationFolder, path.basename(sourcePath)));
  sendTaskProgress({ status: "thinking", text: `Moving ${path.basename(sourcePath)}` });
  await movePath(sourcePath, destinationPath);
  const steps = [];
  if (destination.created) steps.push({ type: "create_folder", path: destinationFolder });
  steps.push({ type: "move", from: sourcePath, to: destinationPath });
  await pushFileAction({
    type: "move",
    description: `moving ${path.basename(sourcePath)} to ${path.basename(destinationFolder) || destinationFolder}`,
    steps,
  });
  sendTaskProgress({ status: "done", text: `Moved ${path.basename(destinationPath)}` });
  logMac("file.move.done", { sourcePath, destinationPath, destinationCreated: destination.created });
  return {
    ok: true,
    files: [destinationPath],
    say: `Moved ${path.basename(destinationPath)} to ${path.basename(destinationFolder) || destinationFolder}.`,
  };
}

function parseDeleteFileIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\b(delete|remove|trash)\b/i.test(source) && !/\bmove\b.+\btrash\b/i.test(source)) return null;
  const captured = extractAfter(source, [
    /\bmove\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+?)\s+to\s+(?:the\s+)?trash$/i,
    /\b(?:delete|remove|trash)\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+)$/i,
  ]);
  const kind = fileKindForText(captured || source);
  const query = cleanFileQuery(captured || source.replace(/\b(delete|remove|trash)\b/gi, " "), kind);
  if (!query) return null;
  return { query, kind };
}

function isDeleteConfirmation(text) {
  const raw = String(text || "").trim().toLowerCase();
  return /^(?:yes|yeah|yep|yup|sure|confirm|confirmed|do it|go ahead|delete it|trash it|move it to trash|yes delete it)$/.test(raw)
    || /\b(?:yes|yeah|yep|yup|confirm|confirmed)\b.*\b(?:delete|trash)\b/.test(raw);
}

function isDeleteCancel(text) {
  return /^(?:no|nope|cancel|stop|don't|do not|leave it|never mind|nevermind)$/i
    .test(String(text || "").trim().toLowerCase());
}

async function executeConfirmedDelete(confirmation) {
  if (!confirmation?.filePath || !safePathExists(confirmation.filePath)) {
    pendingFileConfirmation = null;
    return { ok: false, say: "That file is not there anymore, so I did not delete anything." };
  }
  const sourcePath = confirmation.filePath;
  if (isDangerousFileOperationPath(sourcePath)) {
    pendingFileConfirmation = null;
    return { ok: false, say: `I will not delete ${path.basename(sourcePath)} from voice.` };
  }
  const trashRoot = path.join(os.homedir(), ".Trash");
  const fallbackTrashRoot = path.join(AUTH_STORE_DIR, "Safe Trash");
  const root = safePathExists(trashRoot) ? trashRoot : fallbackTrashRoot;
  const trashPath = await uniquePath(path.join(root, path.basename(sourcePath)));
  sendTaskProgress({ status: "thinking", text: `Moving ${path.basename(sourcePath)} to Trash` });
  await movePath(sourcePath, trashPath);
  await pushFileAction({
    type: "delete",
    description: `deleting ${path.basename(sourcePath)}`,
    steps: [{ type: "delete", from: sourcePath, trashPath }],
  });
  pendingFileConfirmation = null;
  sendTaskProgress({ status: "done", text: `Deleted ${path.basename(sourcePath)}` });
  logMac("file.delete.done", { sourcePath, trashPath });
  return {
    ok: true,
    say: `Deleted ${path.basename(sourcePath)}. I moved it to Trash and saved undo for it.`,
  };
}

function handlePendingFileConfirmation(raw) {
  const pending = pendingFileConfirmation;
  if (!pending) return null;
  if (Date.now() - Number(pending.createdAt || 0) > FILE_ACTION_CONFIRM_MS) {
    pendingFileConfirmation = null;
    return null;
  }
  if (isDeleteCancel(raw)) {
    pendingFileConfirmation = null;
    return { ok: true, say: "Cancelled. I did not delete anything." };
  }
  if (isDeleteConfirmation(raw)) {
    return executeConfirmedDelete(pending);
  }
  pendingFileConfirmation = null;
  return null;
}

async function requestDeleteConfirmation(intent) {
  const files = await findFiles(intent.query, { kind: intent.kind });
  if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${intent.query}.` };
  const filePath = files[0];
  if (isDangerousFileOperationPath(filePath)) return { ok: false, say: `I will not delete ${path.basename(filePath)} from voice.` };
  pendingFileConfirmation = {
    type: "delete",
    createdAt: Date.now(),
    filePath,
    query: intent.query,
    kind: intent.kind || "",
    alternatives: files.slice(1, 4),
  };
  logMac("file.delete.confirmation_requested", {
    query: intent.query,
    kind: intent.kind || "",
    filePath,
    alternatives: pendingFileConfirmation.alternatives,
  });
  sendTaskProgress({ status: "thinking", text: `Confirm delete ${path.basename(filePath)}` });
  return {
    ok: true,
    files: [filePath, ...pendingFileConfirmation.alternatives],
    say: `I found ${path.basename(filePath)}. Say yes, delete it to move it to Trash, or say cancel.`,
  };
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

async function organizeDesktopFiles(options = {}) {
  const mode = ["type", "date", "project"].includes(options.mode) ? options.mode : "type";
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
    filesToMove.push({ fileName, sourcePath, category: organizationCategoryForItem(fileName, stats, mode) });
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
    mode,
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
  await pushFileAction({
    type: "organize_desktop",
    description: `organizing Desktop files by ${mode}`,
    steps: manifest.moves.map((move) => ({ type: "move", from: move.from, to: move.to })),
  });
  sendTaskProgress({ status: "done", text: `Organized ${manifest.moves.length} files` });

  const summary = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");
  return {
    ok: true,
    files: manifest.moves.map((move) => move.to),
    say: `Done. I organized ${manifest.moves.length} Desktop file${manifest.moves.length === 1 ? "" : "s"} by ${mode} into ${ORGANIZED_FOLDER_NAME}${summary ? `: ${summary}` : ""}. Existing folders were left alone, and I saved undo for it.`,
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
      "When the Mac client explicitly requests a conversational response, answer as Braino with warmth, emotional intelligence, and concise natural speech.",
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
          eagerness: "medium",
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

async function createRealtimeCallFromSupabaseDirect({ sdp, authToken, requestedModel, voiceEngine }) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/openai-realtime-call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/sdp",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
      "X-Braino-Realtime-Model": requestedModel,
      "X-Braino-Voice-Engine": voiceEngine || "fish",
    },
    body: sdp,
  });
  const answerSdp = await response.text();
  if (!response.ok) {
    let message = `Supabase realtime failed (${response.status}).`;
    try {
      const parsed = JSON.parse(answerSdp);
      message = parsed?.details || parsed?.error || parsed?.message || message;
    } catch (_) {
      if (answerSdp) message = answerSdp;
    }
    return { ok: false, error: message, status: response.status };
  }
  if (!isLikelyRealtimeAnswerSdp(answerSdp)) {
    return {
      ok: false,
      error: "Supabase realtime returned an invalid answer SDP.",
      status: response.status,
    };
  }
  return {
    ok: true,
    answerSdp,
    sessionId: response.headers.get("x-braino-realtime-session-id") || null,
    realtimeModel: response.headers.get("x-braino-realtime-model") || requestedModel,
    transcriptionModel: response.headers.get("x-braino-realtime-transcription-model") || "gpt-4o-transcribe",
  };
}

function isLikelyRealtimeAnswerSdp(sdp) {
  const text = String(sdp || "");
  return /^v=0\r?$/m.test(text) && /^m=/m.test(text);
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
      transport: "supabase-direct-sdp",
      requestedModel,
    });
    const directResult = await createRealtimeCallFromSupabaseDirect({
      sdp,
      authToken,
      requestedModel,
      voiceEngine,
    });
    if (directResult?.ok) {
      logMac("realtime.create.supabase_direct_ok", {
        sessionId: directResult.sessionId || null,
        realtimeModel: directResult.realtimeModel || requestedModel,
        transcriptionModel: directResult.transcriptionModel || "gpt-4o-transcribe",
      });
      return {
        ok: true,
        answerSdp: directResult.answerSdp,
        transport: "supabase-direct-sdp",
        sessionId: directResult.sessionId || null,
        realtimeModel: directResult.realtimeModel || requestedModel,
        transcriptionModel: directResult.transcriptionModel || "gpt-4o-transcribe",
      };
    }
    logMac("realtime.create.supabase_direct_failed", {
      status: directResult?.status || null,
      error: directResult?.error || "direct SDP failed",
    });

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
  const latestContext = await readActiveMacContext();
  if (latestContext && !isBrainoSelfContext(latestContext)) activeMacContext = latestContext;
  const surface = activeMacContext || latestContext;
  const surfaceTitle = surface?.browserTitle || surface?.windowTitle || "Mac desktop";
  const surfaceUrl = surface?.browserUrl || "braino://mac";
  const surfaceLines = [
    `Current active Mac app: ${surface?.appName || "unknown"}.`,
    surfaceTitle ? `Current window/tab title: ${surfaceTitle}.` : "",
    surface?.browserUrl ? `Current browser URL: ${surface.browserUrl}.` : "",
    surface?.windowBounds ? `Current active window bounds: x ${surface.windowBounds.x}, y ${surface.windowBounds.y}, width ${surface.windowBounds.width}, height ${surface.windowBounds.height}.` : "",
  ].filter(Boolean);
  const body = {
    notes: "",
    message: prompt,
    responseMedium: "voice",
    chatHistory: macChatHistory.slice(-14),
    pageContext: {
      title: surface?.appName ? `${surface.appName}: ${surfaceTitle}` : "Braino on Mac",
      url: surfaceUrl,
      text: [
        "The user is talking to Braino from the Mac desktop companion.",
        "Braino is a visible OS-level overlay that follows the user's active Mac app and display.",
        ...surfaceLines,
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
    activeApp: surface?.appName || "",
    activeTitle: textForLog(surfaceTitle),
    activeUrl: textForLog(surface?.browserUrl || ""),
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: true,
      source: "mac_conversation",
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
        source: "mac_conversation",
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
    return { ok: true, source: "mac_conversation", say: reply };
  } catch (error) {
    logMac("mac.chat.error", { error, durationMs: Date.now() - startedAt });
    return {
      ok: true,
      source: "mac_conversation",
      say: "I am here. The chat wire slipped for a second, but I am listening.",
    };
  }
}

async function runDelegate(prompt) {
  const raw = cleanPrompt(prompt);
  const result = await routeMacDelegate(prompt, raw);
  if (raw && result?.source !== "mac_conversation") {
    rememberMacChat("user", raw);
    if (result?.say) rememberMacChat("assistant", result.say);
  }
  return {
    ...(result || { ok: false, say: "I could not route that yet." }),
    delegateState: delegateStatePayload(),
  };
}

async function routeMacDelegate(prompt, raw = cleanPrompt(prompt)) {
  const text = raw.toLowerCase();
  const latestContext = await readActiveMacContext();
  if (latestContext && !isBrainoSelfContext(latestContext)) activeMacContext = latestContext;
  logMac("delegate.intent.start", {
    prompt: textForLog(prompt),
    cleaned: textForLog(raw),
    activeApp: activeMacContext?.appName || "",
    activeTitle: textForLog(activeMacContext?.browserTitle || activeMacContext?.windowTitle || ""),
    activeUrl: textForLog(activeMacContext?.browserUrl || ""),
  });
  if (!raw) return { ok: false, say: "Say the task again, my guy. I got air." };

  const pendingWorkflowResult = await handlePendingMacWorkflow(raw);
  if (pendingWorkflowResult) return pendingWorkflowResult;

  if (isMacSkillsPrompt(text)) {
    return { ok: true, say: MAC_SKILLS_REPLY };
  }

  const pendingFileResult = await handlePendingFileConfirmation(raw);
  if (pendingFileResult) return pendingFileResult;

  if (isFileActionUndoIntent(text) || isDesktopOrganizeUndoIntent(text)) {
    return undoLastFileAction();
  }

  const noteIntent = parseNoteIntent(raw);
  if (noteIntent) {
    logMac("delegate.notes_intent", {
      raw: textForLog(raw),
      hasTitle: Boolean(noteIntent.title),
      hasBody: Boolean(noteIntent.body),
    });
    return startNoteWorkflow(noteIntent);
  }

  const mailIntent = parseMailIntent(raw);
  if (mailIntent) {
    logMac("delegate.mail_intent", {
      raw: textForLog(raw),
      action: mailIntent.action,
      recipient: textForLog(mailIntent.recipient || ""),
      hasSubject: Boolean(mailIntent.subject),
      hasBody: Boolean(mailIntent.body),
    });
    return startMailWorkflow(mailIntent);
  }

  const closeTarget = extractCloseShortcutTarget(raw);
  if (closeTarget && !/\bbraino\b/i.test(closeTarget)) {
    return closeOpenTarget(closeTarget);
  }

  if (/\b(organize|organise|clean up|cleanup|tidy|sort)\b.*\b(my\s+)?(desktop|files?|desktop files?)\b/.test(text)
    || /\b(?:bulk\s+)?(?:organize|organise|clean up|cleanup|tidy|sort)\b.*\b(type|date|project|month)\b/.test(text)
    || /\bdesktop\b.*\b(messy|cluttered|chaos|clean)\b/.test(text)) {
    return organizeDesktopFiles({ mode: organizeModeForText(text) });
  }

  const spotifyCreatePlaylist = parseSpotifyCreatePlaylistIntent(raw);
  if (spotifyCreatePlaylist) {
    logMac("delegate.spotify_create_playlist_intent", {
      raw: textForLog(raw),
      name: textForLog(spotifyCreatePlaylist.name || ""),
      addCurrent: spotifyCreatePlaylist.addCurrent,
      needsName: spotifyCreatePlaylist.needsName,
    });
    if (spotifyCreatePlaylist.needsName) {
      setPendingMacWorkflow({
        type: "spotify_create_playlist",
        stage: "playlist_name",
        data: { addCurrent: spotifyCreatePlaylist.addCurrent },
      });
      return { ok: true, say: "Sure. What should the playlist be called?" };
    }
    return createSpotifyPlaylistOnMac(spotifyCreatePlaylist.name, { addCurrent: spotifyCreatePlaylist.addCurrent });
  }

  const createFolderIntent = parseCreateFolderIntent(raw);
  if (createFolderIntent) {
    logMac("delegate.create_folder_intent", {
      raw: textForLog(raw),
      name: createFolderIntent.name,
      parentDir: createFolderIntent.parentDir,
    });
    return createMacFolder(createFolderIntent);
  }

  const renameFileIntent = parseRenameFileIntent(raw);
  if (renameFileIntent) {
    logMac("delegate.rename_file_intent", {
      raw: textForLog(raw),
      query: renameFileIntent.query,
      kind: renameFileIntent.kind || "",
      newName: renameFileIntent.newName,
    });
    return renameMacFile(renameFileIntent);
  }

  const moveFileIntent = parseMoveFileIntent(raw);
  if (moveFileIntent) {
    logMac("delegate.move_file_intent", {
      raw: textForLog(raw),
      query: moveFileIntent.query,
      kind: moveFileIntent.kind || "",
      destination: moveFileIntent.destination,
    });
    return moveMacFile(moveFileIntent);
  }

  const deleteFileIntent = parseDeleteFileIntent(raw);
  if (deleteFileIntent) {
    logMac("delegate.delete_file_intent", {
      raw: textForLog(raw),
      query: deleteFileIntent.query,
      kind: deleteFileIntent.kind || "",
    });
    return requestDeleteConfirmation(deleteFileIntent);
  }

  if (/^(?:quit|exit|hide|close)$/i.test(text) || /\b(?:quit|exit|close|hide)\s+braino\b/i.test(text)) {
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindowHiddenByUser = true;
      dockWindow.hide();
    }
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

  const spotifyVolume = parseSpotifyVolumeIntent(raw);
  if (spotifyVolume) {
    logMac("delegate.spotify_volume_intent", {
      raw: textForLog(raw),
      volumePercent: spotifyVolume.volumePercent,
      volumeStep: spotifyVolume.volumeStep,
    });
    return controlSpotifyVolumeOnMac(spotifyVolume);
  }

  if (parseSpotifyWhatsPlayingIntent(raw)) {
    logMac("delegate.spotify_whats_playing_intent", { raw: textForLog(raw) });
    return describeSpotifyNowPlaying();
  }

  const spotifyMode = parseSpotifyShuffleRepeatIntent(raw);
  if (spotifyMode) {
    logMac("delegate.spotify_mode_intent", { raw: textForLog(raw), feature: spotifyMode.feature, enable: spotifyMode.enable });
    return setSpotifyModeOnMac(spotifyMode);
  }

  const spotifySeek = parseSpotifySeekIntent(raw);
  if (spotifySeek) {
    logMac("delegate.spotify_seek_intent", {
      raw: textForLog(raw),
      positionSeconds: spotifySeek.positionSeconds,
      relativeSeconds: spotifySeek.relativeSeconds,
    });
    return seekSpotifyOnMac(spotifySeek);
  }

  const spotifyQueue = parseSpotifyQueueIntent(raw);
  if (spotifyQueue) {
    logMac("delegate.spotify_queue_intent", {
      raw: textForLog(raw),
      song: textForLog(spotifyQueue.song || ""),
      needsSong: Boolean(spotifyQueue.needsSong),
    });
    if (spotifyQueue.needsSong) {
      return { ok: true, say: "Tell me the song to queue and I will line it up on Spotify." };
    }
    return queueSpotifyTrackOnMac(spotifyQueue.song);
  }

  const spotifyAddTrack = parseSpotifyAddTrackIntent(raw);
  if (spotifyAddTrack) {
    logMac("delegate.spotify_add_track_intent", {
      raw: textForLog(raw),
      song: textForLog(spotifyAddTrack.song || ""),
      playlist: textForLog(spotifyAddTrack.playlist || ""),
      useCurrent: Boolean(spotifyAddTrack.useCurrent),
      needsPlaylist: Boolean(spotifyAddTrack.needsPlaylist),
    });
    if (spotifyAddTrack.needsPlaylist) {
      setPendingMacWorkflow({
        type: "spotify_add",
        stage: "playlist_name",
        data: { song: spotifyAddTrack.song || "", useCurrent: Boolean(spotifyAddTrack.useCurrent) },
      });
      return { ok: true, say: "Sure. Which playlist should I add it to?" };
    }
    return addSpotifyTrackOnMac(spotifyAddTrack);
  }

  const spotifyControl = parseSpotifyControlIntent(raw);
  if (spotifyControl) {
    logMac("delegate.spotify_control_intent", {
      raw: textForLog(raw),
      control: spotifyControl.control,
    });
    return controlSpotifyPlaybackOnMac(spotifyControl.control);
  }

  const spotifyContext = parseSpotifyContextPlayIntent(raw);
  if (spotifyContext) {
    logMac("delegate.spotify_context_play_intent", {
      raw: textForLog(raw),
      kind: spotifyContext.kind,
      name: textForLog(spotifyContext.name),
    });
    return playSpotifyContextOnMac(spotifyContext.kind, spotifyContext.name);
  }

  const spotifyPlay = parseSpotifyPlayIntent(raw);
  if (spotifyPlay) {
    logMac("delegate.spotify_play_intent", {
      raw: textForLog(raw),
      song: textForLog(spotifyPlay.song || ""),
      needsSong: Boolean(spotifyPlay.needsSong),
    });
    if (spotifyPlay.needsSong) {
      return { ok: true, say: "Tell me the song name and I will play it on Spotify." };
    }
    return playSpotifySongOnMac(spotifyPlay.song);
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

async function runMacDemoAction(action, payload = {}) {
  const name = String(action || "").trim();
  logMac("team_demo.action.start", {
    action: name,
    payloadKeys: Object.keys(payload || {}),
  });
  if (name === "play-team-spotify") {
    return playMacTeamDemoSpotifyTrack();
  }
  if (name === "pause-spotify") {
    return controlSpotifyPlaybackOnMac("pause");
  }
  if (name === "open-team-article") {
    await openChromeUrl(MAC_TEAM_DEMO_ARTICLE_URL);
    return { ok: true, url: MAC_TEAM_DEMO_ARTICLE_URL };
  }
  if (name === "close-team-article") {
    const result = await closeBrowserTabsMatching("medium.com/towards-deep-learning/google-just-changed-everything-for-machine-learning-on-spreadsheets");
    return { ok: true, ...result };
  }
  if (name === "open-braino-launch") {
    await openChromeUrl(MAC_TEAM_DEMO_LAUNCH_URL);
    return { ok: true, url: MAC_TEAM_DEMO_LAUNCH_URL };
  }
  return { ok: false, error: `Unknown demo action: ${name || "empty"}` };
}

ipcMain.handle("braino-mac:get-config", () => {
  const auth = authStatusPayload();
  const display = displayForContext(activeMacContext);
  return {
    appVersion: APP_VERSION,
    activeContext: activeMacContext,
    displayMetrics: getDisplayMetrics(display),
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

ipcMain.handle("braino-mac:demo-action", async (_event, action, payload) => runMacDemoAction(action, payload));

ipcMain.handle("braino-mac:delegate-state", async () => delegateStatePayload());

ipcMain.handle("braino-mac:active-context", async () => {
  await refreshDesktopOverlayContext("manual");
  return {
    ok: true,
    activeContext: activeMacContext,
    displayMetrics: getDisplayMetrics(displayForContext(activeMacContext)),
  };
});

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

ipcMain.handle("braino-mac:tts", async (_event, text, referenceId) => {
  const speakable = String(text || "").trim();
  if (!speakable) return { ok: false, error: "empty" };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "missing_supabase" };
  const voiceReferenceId = String(referenceId || "").trim();
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/fish-audio-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ text: speakable, ...(voiceReferenceId ? { referenceId: voiceReferenceId } : {}) }),
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
  startDesktopOverlaySync();
  screen.on("display-metrics-changed", () => void refreshDesktopOverlayContext("display-metrics-changed"));
  screen.on("display-added", () => void refreshDesktopOverlayContext("display-added"));
  screen.on("display-removed", () => void refreshDesktopOverlayContext("display-removed"));
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (overlaySyncTimer) {
    clearInterval(overlaySyncTimer);
    overlaySyncTimer = null;
  }
  stopNativeSpeech();
  if (swiftHotkey) {
    try { swiftHotkey.kill(); } catch (_) {}
  }
});

app.on("window-all-closed", () => {
  // Keep the menu-barless companion process alive while Braino is on screen.
});
