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
const TOUCH_ID_HELPER_PATH = path.join(__dirname, "native", "BrainoTouchID.swift");
const WAKE_WORD_HELPER_PATH = path.join(__dirname, "native", "BrainoWakeWord.swift");
const AX_HELPER_PATH = path.join(__dirname, "native", "BrainoAX.swift");
const LIVE_CAPTION_HELPER_PATH = path.join(__dirname, "native", "BrainoLiveCaption.swift");
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
let swiftWakeWord = null;
let wakeWordGaveUp = false; // true once "unavailable" fires — don't keep respawning a dead end
let wakeWordCrashCount = 0;  // consecutive crashy exits; give up after 3 (TCC dead end)
let wakeWordRestartTimer = null;
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

const NOTCH_CACHE_PATH = path.join(AUTH_STORE_DIR, "notch-metrics.json");
let cachedNotchMetrics = (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(NOTCH_CACHE_PATH, "utf8"));
    return Number.isFinite(parsed?.width) ? parsed : null;
  } catch (_) {
    return null;
  }
})();

async function measureNotch() {
  const swiftSource = [
    "import AppKit",
    "if let s = NSScreen.main {",
    "  let f = s.frame",
    "  let tl = s.auxiliaryTopLeftArea?.width ?? 0",
    "  let tr = s.auxiliaryTopRightArea?.width ?? 0",
    "  print(\"\\(f.width - tl - tr) \\(s.safeAreaInsets.top)\")",
    "}",
  ].join("\n");
  const tmpPath = path.join(app.getPath("temp"), "braino-notch-measure.swift");
  try {
    await fs.promises.writeFile(tmpPath, swiftSource);
    const { stdout } = await execFileP("/usr/bin/xcrun", ["swift", tmpPath], { timeout: 90000 });
    const [width, height] = String(stdout || "").trim().split(/\s+/).map(Number);
    if (Number.isFinite(width) && width > 40 && width < 600 && Number.isFinite(height) && height > 0) {
      cachedNotchMetrics = { width: Math.round(width), height: Math.round(height) };
      fs.promises.writeFile(NOTCH_CACHE_PATH, JSON.stringify(cachedNotchMetrics)).catch(() => {});
      logMac("notch.measured", cachedNotchMetrics);
      sendOverlayState("notch_measured");
    } else {
      logMac("notch.measure.no_notch", { raw: String(stdout || "").trim() });
    }
  } catch (error) {
    logMac("notch.measure.failed", { error });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
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
    notch: cachedNotchMetrics,
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
    // Transient by nature (System Events busy, secure-input moments) and
    // polled constantly — log at most once every 5 minutes, keep last context.
    const now = Date.now();
    if (now - lastContextReadFailLogAt > 5 * 60 * 1000) {
      lastContextReadFailLogAt = now;
      logMac("desktop.context.read_failed", { error });
    }
    return null;
  }
}

let lastContextReadFailLogAt = 0;

async function readActiveBrowserContext(appName) {
  const browser = String(appName || "").trim();
  if (!["Google Chrome", "Brave Browser", "Microsoft Edge", "Safari"].includes(browser)) {
    return null;
  }
  // A browser with zero open windows throws "Invalid index -1719" — guard for
  // it instead of logging a stack trace on every 8s poll while Chrome is
  // running windowless.
  const script = browser === "Safari"
    ? 'tell application "Safari"\n  if (count of documents) = 0 then return ""\n  return (name of front document as text) & (ASCII character 9) & (URL of front document as text)\nend tell'
    : `tell application "${escapeAppleScriptString(browser)}"\n  if (count of windows) = 0 then return ""\n  return (title of active tab of window 1 as text) & (ASCII character 9) & (URL of active tab of window 1 as text)\nend tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 2500 });
    const [browserTitle = "", browserUrl = ""] = String(stdout || "").trimEnd().split("\t");
    return {
      browserTitle: browserTitle.trim(),
      browserUrl: browserUrl.trim(),
    };
  } catch (error) {
    const now = Date.now();
    if (now - lastBrowserReadFailLogAt > 5 * 60 * 1000) {
      lastBrowserReadFailLogAt = now;
      logMac("desktop.browser_context.read_failed", { appName: browser, error });
    }
    return null;
  }
}
let lastBrowserReadFailLogAt = 0;

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
    const actual = dockWindow.getBounds();
    if (actual.y !== bounds.y || actual.height !== bounds.height) {
      logMac("overlay.bounds.clamped", { requested: bounds, actual });
    }
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
    // Must stay a panel: only panels join fullscreen Spaces, which is how Braino
    // stays visible over fullscreen apps. The notch face lives in its own window
    // because panels get clamped below the menu bar.
    type: "panel",
    // Without this, any setBounds after show lets macOS constrain the frame
    // below the menu bar (verified empirically) — which exiles notch UI.
    enableLargerThanScreen: true,
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
    // Double-Space no longer hides the overlay: the walker goes home to the
    // notch instead (his eyes appear there while he is inside).
    sendToRenderer("braino-mac:walker-toggle", { source });
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
      if (trimmed === "double-command") {
        logMac("hotkey.double_command", {});
        sendToRenderer("braino-mac:summon-toggle", { source: "double Command" });
        ensureDockWindowVisible("summon-hotkey");
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

// The wake-word helper is meant to run forever ("always listening"). Unlike
// the hotkey tap, if it dies unexpectedly we DO want to bring it back — but
// only if the reason wasn't "unavailable" (permission denied / on-device
// recognition unsupported), since respawning into the same wall is pointless
// noise and the user should just fall back to double-Control / wake voice
// commands via the manual hotkey instead.
function startBrainoWakeWord() {
  if (!fs.existsSync(WAKE_WORD_HELPER_PATH) || wakeWordGaveUp) return;
  if (wakeWordRestartTimer) {
    clearTimeout(wakeWordRestartTimer);
    wakeWordRestartTimer = null;
  }
  swiftWakeWord = spawn("xcrun", ["swift", WAKE_WORD_HELPER_PATH], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  swiftWakeWord.stdout.on("data", (chunk) => {
    String(chunk || "").split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      if (line === "armed") {
        logMac("wakeword.armed", {});
        sendToRenderer("braino-mac:wake-status", { armed: true });
        return;
      }
      if (line.startsWith("wake\t")) {
        const transcript = line.slice(5).trim();
        logMac("wakeword.detected", { transcript: textForLog(transcript) });
        sendToRenderer("braino-mac:wake-detected", { transcript });
        ensureDockWindowVisible("wake-word");
        return;
      }
      if (line.startsWith("unavailable\t")) {
        wakeWordGaveUp = true;
        const reason = line.slice(12).trim();
        logMac("wakeword.unavailable", { reason });
        sendToRenderer("braino-mac:wake-status", { armed: false, unavailable: true, reason });
      }
    });
  });

  swiftWakeWord.stderr.on("data", (chunk) => {
    const line = String(chunk || "").trim();
    if (line) logMac("wakeword.stderr", { line });
  });

  swiftWakeWord.on("exit", (code) => {
    swiftWakeWord = null;
    // A TCC privacy-violation abort kills the process before it can print
    // "unavailable" on stdout, so gaveUp never trips and the old code
    // respawned it every 5s forever (flooding the log, burning CPU). Count
    // consecutive crashy exits and give up after a few — a denied Speech
    // Recognition permission is a dead end, not a transient hiccup.
    const crashed = code === null || code !== 0;
    wakeWordCrashCount = crashed ? wakeWordCrashCount + 1 : 0;
    if (crashed && wakeWordCrashCount >= 3) wakeWordGaveUp = true;
    logMac("wakeword.exit", { code, gaveUp: wakeWordGaveUp, crashCount: wakeWordCrashCount });
    if (wakeWordGaveUp) {
      sendToRenderer("braino-mac:wake-status", { armed: false, unavailable: true, reason: "wake word needs Speech Recognition permission" });
      return;
    }
    // Transient crash — back off progressively, don't hammer every 5s.
    wakeWordRestartTimer = setTimeout(() => startBrainoWakeWord(), 5000 * wakeWordCrashCount + 5000);
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

  if (pending.type === "phone" && pending.stage === "phone_number") {
    clearPendingMacWorkflow();
    const number = String(raw || "").replace(/[^\d+]/g, "");
    if (number.length < 7) return { ok: false, say: "That didn't look like a number. Try again — say send to phone." };
    saveMyPhone(number);
    return sendToPhone(pending.data?.content || "");
  }

  if (pending.type === "meeting" && pending.stage === "meeting_offer") {
    clearPendingMacWorkflow();
    if (/\b(?:yes|yeah|yep|sure|go|record|do it|please)\b/i.test(cleanPrompt(raw))) {
      return startMeetingRecording(pending.data?.source || "meeting");
    }
    return { ok: true, say: "No recording then. I will sit this one out quietly." };
  }

  if (pending.type === "xclip" && pending.stage === "xclip_confirm") {
    clearPendingMacWorkflow();
    if (/\b(?:yes|yeah|yep|ship|send|post|go|do it)\b/i.test(cleanPrompt(raw))) {
      return postClipToX(pending.data?.caption || "");
    }
    return { ok: true, say: "Holding it. The clip stays with me if you change your mind." };
  }

  if (pending.type === "cleanup" && pending.stage === "count_style") {
    clearPendingMacWorkflow();
    const brief = /\b(?:point|short|quick|cut|straight|just|tldr|summary)\b/i.test(cleanPrompt(raw));
    const counted = await countAllHomeItems();
    const total = String(counted?.say || "");
    const say = brief
      ? `${total.split(".")[0]}. Want me to create a redundant folder of what is worth letting go, so you can review, delete or recover?`
      : `${total} Want me to create a redundant folder of what is worth letting go?`;
    setPendingMacWorkflow({ type: "cleanup", stage: "cleanup_offer", data: {} });
    return { ok: true, say };
  }

  if (pending.type === "cleanup" && pending.stage === "cleanup_offer") {
    clearPendingMacWorkflow();
    if (/\b(?:yes|yeah|yep|sure|go|do it|create|make it|please)\b/i.test(cleanPrompt(raw))) {
      sendTaskProgress({ status: "thinking", text: "Scanning for what you don't need" });
      const items = await scanCleanupCandidates();
      if (!items.length) return { ok: true, say: "Nothing is stale enough to park right now. You are clean." };
      return createRedundantFolder(items.map((c) => ({ name: c.name, full: c.full, size: c.size, isDir: c.isDir, isCapture: c.isCapture })));
    }
    return { ok: true, say: "Alright, just the numbers then." };
  }

  if (pending.type === "cleanup" && pending.stage === "cleanup_confirm") {
    clearPendingMacWorkflow();
    const answer = cleanPrompt(raw);
    if (/\b(?:yes|yeah|yep|sure|go|do it|create|make it|please)\b/i.test(answer)) {
      return createRedundantFolder(pending.data?.items || []);
    }
    return { ok: true, say: "Alright, leaving everything exactly where it is." };
  }

  if (pending.type === "cleanup" && pending.stage === "recover_confirm") {
    clearPendingMacWorkflow();
    const answer = cleanPrompt(raw);
    if (/\b(?:yes|yeah|yep|sure|do it|bring it|recover|please)\b/i.test(answer)) {
      const item = pendingReviewBin?.files?.find((f) => f.binName === pending.data?.binName);
      if (!item) return { ok: false, say: "Odd — that one is not in the folder anymore." };
      const restored = await moveRedundantItemsBack([item]);
      logMac("files.cleanup.recovered", { restored, binName: textForLog(item.binName) });
      return { ok: true, say: restored ? `Recovered ${item.binName}, back where it came from.` : "It would not move. It is still in the folder." };
    }
    return { ok: true, say: "Okay, leaving it in the folder." };
  }

  if (pending.type === "cleanup" && pending.stage === "recover_pick") {
    clearPendingMacWorkflow();
    const options = pending.data?.options || [];
    const answer = cleanPrompt(raw);
    const ordinal = answer.match(/\b(first|second|third|1|2|3)\b/i)?.[1]?.toLowerCase();
    const ordinalIndex = { first: 0, 1: 0, second: 1, 2: 1, third: 2, 3: 2 }[ordinal];
    let chosen = ordinalIndex !== undefined ? options[ordinalIndex] : null;
    if (!chosen) {
      const ranked = options
        .map((name) => ({ name, score: scoreRedundantMatch({ binName: name }, answer) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.score >= 0.4) chosen = ranked[0].name;
    }
    if (!chosen) return { ok: true, say: "I did not catch which one. Say recover and the name once more." };
    const item = pendingReviewBin?.files?.find((f) => f.binName === chosen);
    if (!item) return { ok: false, say: "That one is not in the folder anymore." };
    const restored = await moveRedundantItemsBack([item]);
    logMac("files.cleanup.recovered", { restored, binName: textForLog(item.binName) });
    return { ok: true, say: restored ? `Recovered ${item.binName}, back where it came from.` : "It would not move. It is still in the folder." };
  }

  if (pending.type === "whatsapp") {
    clearPendingMacWorkflow();
    if (pending.stage === "whatsapp_recipient") {
      const recipient = cleanPrompt(raw).replace(/^(?:to\s+|my\s+)+/i, "").trim();
      if (!recipient) return { ok: true, say: "I did not catch the name. Who is it for?" };
      const message = pending.data?.message || "";
      if (!message) {
        setPendingMacWorkflow({ type: "whatsapp", stage: "whatsapp_message", data: { recipient } });
        return { ok: true, say: `What should I say to ${recipient}?` };
      }
      return sendWhatsAppMessage(recipient, message);
    }
    if (pending.stage === "whatsapp_message") {
      const message = String(raw || "").trim().replace(/^(?:say|tell (?:her|him|them)|saying)\s+/i, "");
      if (!message) return { ok: true, say: "I did not catch the message. Say it once more?" };
      return sendWhatsAppMessage(pending.data?.recipient || "", message);
    }
  }

  if (pending.type === "spotify_add") {
    clearPendingMacWorkflow();
    const reply = cleanPrompt(raw);
    // "you can add it to my liked songs" or just "liked songs" → like, not a playlist.
    if (/\bliked?\s+songs?\b/i.test(reply) || /^liked?$/i.test(reply.trim())) {
      return addSpotifyTrackOnMac({ ...(pending.data || {}), playlist: null, needsPlaylist: false });
    }
    // The reply may itself be a complete add command; reparse before assuming it is a bare name.
    const reparsed = parseSpotifyAddTrackIntent(raw);
    if (reparsed && !reparsed.needsPlaylist) {
      return addSpotifyTrackOnMac({
        ...reparsed,
        song: reparsed.song || pending.data?.song || "",
        useCurrent: reparsed.useCurrent || Boolean(pending.data?.useCurrent),
      });
    }
    // Otherwise treat it as the playlist name, stripping spoken filler around it.
    const playlist = cleanSpotifyPlaylistName(
      reply
        .replace(/^(?:you can\s+|please\s+|just\s+|yeah\s+|yes\s+|ok(?:ay)?\s+)*/i, "")
        .replace(/^(?:add|put|save)\s+(?:it|this|that|the song)?\s*/i, "")
        .replace(/^(?:to|in|into|on)\s+/i, "")
        .replace(/^(?:my|the)\s+/i, "")
        .replace(/^(?:playlist\s+)?(?:called|named)?\s*/i, "")
        .replace(/\s+playlist$/i, ""),
    );
    if (!playlist) {
      setPendingMacWorkflow({ type: "spotify_add", stage: "playlist_name", data: pending.data || {} });
      return { ok: true, say: "I did not catch the playlist name. Just say the name itself." };
    }
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

// Incognito needs the Chrome binary directly — `open -a` swallows the flag.
async function openChromeIncognitoUrl(url) {
  await execFileP("open", ["-na", "Google Chrome", "--args", "--incognito", url]);
  setTimeout(() => ensureDockWindowVisible("open-chrome-incognito"), 650);
}

// ── Voice Commands ───────────────────────────────────────────────────────────
// Same feature as the Chrome extension's, sharing the same Supabase tables: user-defined Modes
// (name + notch color) holding phrase→URL(s) commands. A mode is voice-activated by name; while
// it runs, only its phrases match and the notch wears its color. Cached in memory here and
// refreshed on a short TTL, mirroring how the extension caches into chrome.storage.local.
const VOICE_MODES_TTL_MS = 60 * 1000;
let voiceModesCache = { modes: [], fetchedAt: 0 };

async function fetchVoiceModes(options = {}) {
  const auth = authStatusPayload();
  if (!auth.userId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return voiceModesCache.modes;
  if (!options.force && Date.now() - voiceModesCache.fetchedAt < VOICE_MODES_TTL_MS) return voiceModesCache.modes;
  const authToken = await getBrainoAuthToken();
  if (!authToken) return voiceModesCache.modes;
  const base = SUPABASE_URL.replace(/\/$/, "");
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` };
  try {
    const [modesRes, commandsRes, urlsRes] = await Promise.all([
      fetch(`${base}/rest/v1/voice_modes?user_id=eq.${encodeURIComponent(auth.userId)}&select=id,name,notch_color,is_active&order=position.asc`, { headers }),
      fetch(`${base}/rest/v1/voice_commands?user_id=eq.${encodeURIComponent(auth.userId)}&select=id,mode_id,phrase,open_mode&order=position.asc`, { headers }),
      fetch(`${base}/rest/v1/voice_command_urls?select=id,command_id,url&order=position.asc`, { headers }),
    ]);
    if (!modesRes.ok || !commandsRes.ok || !urlsRes.ok) throw new Error(`voice_modes ${modesRes.status}/${commandsRes.status}/${urlsRes.status}`);
    const [modes, commands, urls] = await Promise.all([modesRes.json(), commandsRes.json(), urlsRes.json()]);
    const urlsByCommand = new Map();
    for (const u of urls) {
      const list = urlsByCommand.get(u.command_id) || [];
      list.push(u.url);
      urlsByCommand.set(u.command_id, list);
    }
    const commandsByMode = new Map();
    for (const c of commands) {
      const list = commandsByMode.get(c.mode_id) || [];
      list.push({ id: c.id, phrase: c.phrase, openMode: c.open_mode === "incognito" ? "incognito" : "tab", urls: urlsByCommand.get(c.id) || [] });
      commandsByMode.set(c.mode_id, list);
    }
    voiceModesCache = {
      fetchedAt: Date.now(),
      modes: modes.map((m) => ({
        id: m.id,
        name: m.name,
        notchColor: m.notch_color || "#0A84FF",
        isActive: m.is_active === true,
        commands: commandsByMode.get(m.id) || [],
      })),
    };
    logMac("voice_modes.fetched", { count: voiceModesCache.modes.length });
  } catch (error) {
    logMac("voice_modes.fetch_failed", { error: String(error?.message || error) });
  }
  return voiceModesCache.modes;
}

async function setVoiceModeActive(modeId, active) {
  const auth = authStatusPayload();
  const authToken = await getBrainoAuthToken();
  if (!auth.userId || !authToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const base = SUPABASE_URL.replace(/\/$/, "");
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" };
  try {
    // Only one active mode per user (unique partial index) — clear the others first.
    if (active) {
      await fetch(`${base}/rest/v1/voice_modes?user_id=eq.${encodeURIComponent(auth.userId)}&is_active=eq.true`, {
        method: "PATCH", headers, body: JSON.stringify({ is_active: false }),
      });
    }
    const res = await fetch(`${base}/rest/v1/voice_modes?id=eq.${encodeURIComponent(modeId)}`, {
      method: "PATCH", headers, body: JSON.stringify({ is_active: active, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`patch ${res.status}`);
    voiceModesCache.modes = voiceModesCache.modes.map((m) => ({ ...m, isActive: active ? m.id === modeId : false }));
    return true;
  } catch (error) {
    logMac("voice_modes.set_active_failed", { error: String(error?.message || error) });
    return false;
  }
}

function normalizeVoiceText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[.!?,]+$/, "")
    .replace(/^(?:hey |hi |yo |ok |okay |braino[,!. ]+|can you |could you |would you |will you |please |kindly |i want you to |i'?d like you to |let'?s )+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Letters+digits only — speech-to-text splits a name like "Focus2" into two
// tokens ("focus 2"), and typed
// names carry caps/spaces/punctuation nobody says out loud. Comparing raw
// strings made a correctly-configured mode simply never match.
const MAC_NUMWORDS = {zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",
  ten:"10",eleven:"11",twelve:"12",thirteen:"13",fourteen:"14",fifteen:"15",sixteen:"16",seventeen:"17",
  eighteen:"18",nineteen:"19",twenty:"20",thirty:"30",forty:"40",fifty:"50"};
function voiceModeKey(text) {
  // Spoken numbers arrive as words ("mode eighteen"), typed names as digits
  // ("Focus2") — fold them together before comparing.
  return normalizeVoiceText(text)
    .replace(/[a-z]+/g, (w) => MAC_NUMWORDS[w] || w)
    .replace(/[^a-z0-9]/g, "");
}
const MODE_START_VERBS = "start|activate|turn on|enable|begin|switch on|switch to|enter|go into|open";
const MODE_STOP_VERBS = "stop|deactivate|turn off|disable|end|switch off|exit|quit|leave|close";
function detectVoiceModeCommand(raw, modes) {
  const t = normalizeVoiceText(raw);
  if (!t || !modes.length) return null;
  const m = t.match(new RegExp(`^(${MODE_START_VERBS}|${MODE_STOP_VERBS})\\s+(?:the\\s+)?(.+)$`));
  if (!m) return null;
  const action = new RegExp(`^(${MODE_START_VERBS})$`).test(m[1]) ? "start" : "stop";
  const rest = m[2].trim();
  if (!rest) return null;
  // "enter <name> mode" / "start mode <name>" / "start <name>" all resolve
  // to the same mode, whatever the user called it.
  const candidates = [rest, rest.replace(/^mode\s+/, ""), rest.replace(/\s+mode$/, "")].map(voiceModeKey).filter(Boolean);
  const mode = modes.find((mo) => {
    const name = voiceModeKey(mo.name);
    const bare = name.replace(/^mode/, "").replace(/mode$/, "");
    return candidates.some((c) => c === name || (bare && c === bare));
  });
  return mode ? { mode, action } : null;
}

// Self-awareness: Braino knows which mode he is in and answers straight, with
// no model round-trip. Asked ABOUT a mode, this must never be mistaken for a
// command to enter one, so it is checked before detectVoiceModeCommand.
function detectVoiceModeQuery(raw, modes) {
  const t = normalizeVoiceText(raw);
  if (!t) return null;
  if (/^(what|which)\s+mode\b|^what('?s| is)\s+(the\s+)?(current\s+)?mode\b|^(are|am)\s+(you|we|i)\s+in\s+(any|a)\s+mode\b/.test(t)) {
    return { kind: "which" };
  }
  const m = t.match(/^(?:are|is)\s+(?:you|we|it)\s+in\s+(?:the\s+)?(.+?)(?:\s+mode)?\??$|^(?:am\s+i)\s+in\s+(?:the\s+)?(.+?)(?:\s+mode)?\??$/);
  if (!m) return null;
  const rest = (m[1] || m[2] || "").trim();
  if (!rest) return null;
  const candidates = [rest, rest.replace(/^mode\s+/, "")].map(voiceModeKey).filter(Boolean);
  const mode = modes.find((mo) => {
    const name = voiceModeKey(mo.name);
    const bare = name.replace(/^mode/, "").replace(/mode$/, "");
    return candidates.some((c) => c === name || (bare && c === bare));
  });
  return mode ? { kind: "is", mode } : null;
}

// Speech-to-text rarely returns a configured phrase letter-perfect — a real
// transcript of "Play Alanna" came back as "Play Alana" and, with exact
// matching, fell straight through to the Spotify route. Compare on letters
// only and allow a small edit distance proportional to length.
function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function phraseMatches(spoken, phrase) {
  if (!spoken || !phrase) return false;
  if (spoken === phrase) return true;
  const a = spoken.replace(/[^a-z0-9]/g, "");
  const b = phrase.replace(/[^a-z0-9]/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length >= 5 && (a.includes(b) || b.includes(a))) return true;
  const tol = Math.max(1, Math.floor(b.length * 0.25));
  return editDistance(a, b) <= tol;
}
function detectVoiceCommandPhrase(raw, modes) {
  const mode = modes.find((m) => m.isActive);
  if (!mode) return null;
  const t = normalizeVoiceText(raw);
  if (!t) return null;
  for (const command of mode.commands || []) {
    if (phraseMatches(t, normalizeVoiceText(command.phrase))) return { mode, command };
  }
  return null;
}

// Random 1..N of the command's URLs so a multi-link command varies run to run.
function pickRandomUrls(urls) {
  const list = (urls || []).filter(Boolean);
  if (list.length <= 1) return list;
  const shuffled = list.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 1 + Math.floor(Math.random() * list.length));
}

// The notch keeps the mode's color for as long as the mode runs; the renderer
// flashes a "<name> activated" caption that fades, then shrinks back to compact.
const voiceWait = (ms) => new Promise((r) => setTimeout(r, ms));

// The notch narrates a Voice Command the way it narrates everything else:
// caption in the dynamic island, one short step at a time, then it settles
// back to the compact arch wearing the mode's colour. sendTaskProgress is
// already wired to nfSetThinking on the renderer side.
function voiceStep(text) {
  sendTaskProgress({ status: "thinking", text });
}
function voiceStepClear() {
  sendToRenderer("braino-mac:task-progress", { status: "ready", clearNotch: true });
}

function sendVoiceModeState(mode) {
  sendToRenderer("braino-mac:voice-mode", mode
    ? { active: true, name: mode.name, color: mode.notchColor }
    : { active: false });
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
        // Diagnosed 2026-07-24: scopes and token are fine. Spotify returns 403 on
        // library/playlist writes because the app is in Development Mode and the
        // account is not in the app's User Management allowlist. Reconnecting
        // cannot fix that, so do not open the consent page for this.
        logMac("spotify.write_forbidden", {
          functionName,
          grantedScope: data?.grantedScope || "unknown",
          scopeHint: data?.scopeHint || "",
        });
        return {
          ok: false,
          error: "Spotify blocks playlist and library saves for apps like mine since twenty twenty five. Playback still works fine. For liked songs, just play the track and say add this song to my liked songs, and I will use the Spotify app menu instead.",
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
  // "resume WATCHING Little Brother on Netflix" is not a Spotify command —
  // any video-context mention wins over a bare control verb unless the user
  // explicitly names Spotify/music.
  const mentionsSpotifyPlayback = /\b(spotify|song|track|music|tune|playlist)\b/i.test(source);
  const mentionsVideoContext = /\b(netflix|prime\s*video|hotstar|disney|hulu|apple\s*tv|watching|watch|episode|series|season|show|movie|film|video)\b/i.test(source);
  if (mentionsVideoContext && !mentionsSpotifyPlayback) return null;
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

  const isCurrentTrackWord = (value) => /^(?:this|it|that|current|playing|the song|this song|song|track|music|tune)$/i.test(String(value || "").trim());

  const namedLiked = source.match(/(?:add|save)\s+(?:the\s+)?(?:song|track|music|tune)?\s*["“]?(.+?)["”]?\s+to\s+(?:my\s+)?liked\s+songs?(?:\s+(?:on|in)\s+spotify)?[?.!]?\s*$/i);
  if (namedLiked?.[1]) {
    const song = cleanSpotifySongQuery(namedLiked[1]);
    if (!song || isCurrentTrackWord(song)) return { song: "", playlist: null, useCurrent: true };
    return { song, playlist: null, useCurrent: false };
  }

  const namedPlaylist = source.match(/(?:add|save)\s+(?:the\s+)?(?:song|track|music|tune)?\s*["“]?(.+?)["”]?\s+to\s+(?:my\s+)?(?:playlist\s+)?["“]?(.+?)["”]?(?:\s+(?:on|in)\s+spotify)?$/i);
  if (namedPlaylist?.[1] && namedPlaylist?.[2]) {
    const song = cleanSpotifySongQuery(namedPlaylist[1]);
    return {
      song: isCurrentTrackWord(song) ? "" : song,
      playlist: cleanSpotifyPlaylistName(namedPlaylist[2]),
      useCurrent: isCurrentTrackWord(song),
    };
  }

  return null;
}

async function captureScreenBase64() {
  const filePath = path.join(app.getPath("temp"), `braino-screen-${Date.now()}.png`);
  try {
    await execFileP("/usr/sbin/screencapture", ["-x", filePath], { timeout: 8000 });
    // Downscale before upload: caps image tokens and keeps the JSON body small.
    try {
      await execFileP("/usr/bin/sips", ["-Z", "1440", filePath], { timeout: 8000 });
    } catch (resizeError) {
      logMac("vision.capture.resize_failed", { error: resizeError });
    }
    const buffer = await fs.promises.readFile(filePath);
    if (!buffer?.length) throw new Error("empty screenshot");
    logMac("vision.capture.done", { bytes: buffer.length });
    return { ok: true, base64: buffer.toString("base64") };
  } catch (error) {
    logMac("vision.capture.failed", { error });
    return { ok: false, error: "Screen capture failed. Check Screen Recording permission for Braino." };
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
  }
}

function parseScreenVisionIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source) return null;
  const patterns = [
    /\b(?:read|summarize|summarise|explain|translate)\s+(?:this|that|the)\b/i,
    /\b(?:read|summarize|summarise)\s+(?:it|this)\s+(?:for me|to me|aloud)\b/i,
    /\b(?:look at|check)\s+(?:my\s+)?screen\b/i,
    /\bwhat(?:'s| is)?\s+on\s+(?:my|the)\s+screen\b/i,
    /\bwhat\s+am\s+i\s+(?:looking at|reading|watching)\b/i,
    /\bhelp\s+me\s+with\s+(?:this|that)\b/i,
    /\b(?:can|do)\s+you\s+see\s+(?:this|that|my\s+screen|what\s+i\s+see)\b/i,
    /\bwhat\s+do\s+you\s+see\b/i,
    /\bwhat\s+is\s+this\s+(?:page|pdf|document|article|error|code)\b/i,
  ];
  if (!patterns.some((pattern) => pattern.test(source))) return null;
  return { question: String(raw || "").trim() };
}

// The LLM understanding gate: when no regex intent claims a command, a real
// model decides what the user MEANT — no more phrase-by-phrase hardcoding.
async function classifyIntentLLM(raw) {
  const authToken = await getBrainoAuthToken();
  if (!authToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const surface = activeMacContext || {};
  const message = [
    "Classify this Mac voice command into EXACTLY one tool. Reply with ONLY strict JSON, no prose, no markdown.",
    `Command: "${String(raw || "").trim()}"`,
    surface.appName ? `Front app: ${surface.appName}${surface.windowTitle ? ` ("${surface.windowTitle}")` : ""}.` : "",
    'Tools: {"tool":"open_app","arg":"app name"} | {"tool":"open_website","arg":"domain or url"} | {"tool":"find_file","arg":"file query"} | {"tool":"amazon","arg":"product"} | {"tool":"youtube","arg":"video"} | {"tool":"drive","arg":"document name"} | {"tool":"web_search","arg":"query"} | {"tool":"design_cowork","arg":""} | {"tool":"chat","arg":""}',
    "find_file = the user's own documents (resume, notes, invoices, screenshots). chat = talking TO Braino, not commanding. amazon = physical products/books to BUY only — articles, blogs, essays, news, videos and anything to READ online is web_search, never amazon.",
    "design_cowork = the user wants help making a BETTER DESIGN of what's on their screen, or wants Claude Design to improve a website/UI they are looking at (even vaguely: 'help me design something better', 'make this look nicer', 'ask Claude to redesign this'). This looks at the screen, captures the site, and hands it to Claude Design.",
  ].filter(Boolean).join("\n");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ notes: "", message, chatHistory: [], responseMedium: "text" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    const parsed = JSON.parse(reply.match(/\{[\s\S]*\}/)?.[0] || "null");
    if (!parsed?.tool) return null;
    logMac("intent.llm", { raw: textForLog(raw), tool: parsed.tool, arg: textForLog(String(parsed.arg || "")) });
    return { tool: String(parsed.tool), arg: String(parsed.arg || "").trim() };
  } catch (error) {
    logMac("intent.llm.failed", { error });
    return null;
  }
}

async function executeClassifiedIntent(classified, raw) {
  const { tool, arg } = classified;
  if (tool === "open_app" && arg) {
    const result = await openApp(arg);
    if (result.ok) return { ok: true, say: `Opening ${result.appName || arg}.` };
    return { ok: false, say: `I could not find an app called ${arg}.` };
  }
  if (tool === "open_website" && arg) {
    const url = /^https?:\/\//i.test(arg) ? arg : `https://${arg.includes(".") ? arg : `www.${arg}.com`}`;
    await openChromeUrl(url);
    return { ok: true, say: `Opening ${arg.replace(/^https?:\/\//, "")}.` };
  }
  if (tool === "find_file" && arg) {
    const files = await findFiles(arg, { kind: "" });
    if (!files.length) return { ok: false, say: `I searched the Mac, but did not find ${arg}.` };
    const opened = await openLocalPath(files[0]);
    return opened.ok
      ? { ok: true, say: `Opened ${path.basename(files[0])}.`, files }
      : { ok: false, say: `Found ${path.basename(files[0])} but it would not open.`, files };
  }
  if (tool === "amazon" && arg) { await openChromeUrl(SEMANTIC_SITES.amazon.search(arg)); return { ok: true, say: `${arg} on Amazon, coming up.` }; }
  if (tool === "youtube" && arg) { await openChromeUrl(SEMANTIC_SITES.youtube.search(arg)); return { ok: true, say: `${arg} on YouTube.` }; }
  if (tool === "drive" && arg) { await openChromeUrl(SEMANTIC_SITES["google drive"].search(arg)); return { ok: true, say: `Looking for ${arg} in your Drive.` }; }
  if (tool === "web_search" && arg) return runMacWebSearch(arg);
  if (tool === "design_cowork") return runDesignCowork(raw);
  return runMacConversation(raw);
}

// Ambient companion glance: unprompted look at the screen, one short warm
// line back. Called by the renderer's ambient loop while he's awake-idle.
async function runAmbientObserve() {
  const startedAt = Date.now();
  const shot = await captureScreenBase64();
  if (!shot.ok) return { ok: false, say: "" };
  const authToken = await getBrainoAuthToken();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authToken) return { ok: false, say: "" };
  const surface = activeMacContext || {};
  const message = [
    "You are Braino, glancing at your human's screen unprompted, as a companion who lives on this Mac.",
    surface.appName ? `Front app: ${surface.appName}${surface.windowTitle ? `, window "${surface.windowTitle}"` : ""}.` : "",
    "In ONE short spoken sentence (22 words max): either a specific, genuinely useful observation or tip about what they are doing right now, or a warm offer to help with it.",
    "Casual, warm, zero preamble, no questions about permission, never mention screenshots or that you are an AI.",
  ].filter(Boolean).join("\n");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ notes: "", chatHistory: macChatHistory.slice(-4), message, visionMode: "describe", imageBase64: shot.base64, responseMedium: "voice" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!response.ok || !reply) throw new Error(data?.error || `ambient observe failed (${response.status})`);
    logMac("ambient.observe", { activeApp: surface.appName || "", replyChars: reply.length, durationMs: Date.now() - startedAt });
    rememberMacChat("assistant", reply);
    return { ok: true, say: reply };
  } catch (error) {
    logMac("ambient.observe.failed", { error });
    return { ok: false, say: "" };
  }
}

ipcMain.handle("braino-mac:ambient-observe", async () => runAmbientObserve());

async function runScreenVision(question) {
  const q = String(question || "").trim();
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: "Looking at your screen" });

  const screenStatus = systemPreferences.getMediaAccessStatus?.("screen") || "unknown";
  if (screenStatus === "denied" || screenStatus === "restricted") {
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture");
    return {
      ok: false,
      say: "I need Screen Recording permission to see your screen. I opened the setting, turn it on for Braino, then ask me again.",
    };
  }

  const shot = await captureScreenBase64();
  if (shot.ok) sendTaskProgress({ status: "thinking", text: "Reading your screen" });
  if (!shot.ok) {
    const summary = await frontWindowSummary();
    return {
      ok: true,
      say: summary
        ? `I could not capture the screen, but the front window is ${summary}. Check Screen Recording permission so I can actually see it.`
        : shot.error,
    };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, say: "Vision is not configured on this build." };
  let authToken = await getBrainoAuthToken();
  if (!authToken) {
    await ensureBrainoAuth("vision");
    authToken = await getBrainoAuthToken();
  }

  const surface = activeMacContext || {};
  const message = [
    q || "Describe what is on my screen.",
    surface.appName
      ? `Context: the front app is ${surface.appName}${surface.windowTitle ? `, window "${surface.windowTitle}"` : ""}${surface.browserUrl ? `, at ${surface.browserUrl}` : ""}.`
      : "",
    "You are looking at a screenshot of the user's Mac screen.",
    "If asked to read a document or page, read or summarize the visible text faithfully instead of describing the layout.",
    "If asked for your opinion, preference, or which option is better, COMMIT to one clear choice and say why in a sentence — never turn the question back on the user.",
    "Answer for voice: direct and natural, no markdown, no lists.",
  ].filter(Boolean).join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        notes: "",
        chatHistory: macChatHistory.slice(-6),
        message,
        visionMode: "describe",
        imageBase64: shot.base64,
        responseMedium: "voice",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || data?.response || "").trim();
    if (!response.ok || !reply) throw new Error(data?.error || `vision failed (${response.status}).`);
    logMac("vision.done", {
      questionChars: q.length,
      replyChars: reply.length,
      durationMs: Date.now() - startedAt,
      activeApp: surface.appName || "",
    });
    rememberMacChat("user", q || "look at my screen");
    rememberMacChat("assistant", reply);
    sendTaskProgress({ status: "done", text: "Done" });
    return { ok: true, say: reply };
  } catch (error) {
    logMac("vision.failed", { error });
    return { ok: false, say: "I could not make sense of the screen just now. Try once more." };
  }
}

const WHATSAPP_CONTACTS_PATH = path.join(AUTH_STORE_DIR, "whatsapp-contacts.json");

function loadWhatsAppContacts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(WHATSAPP_CONTACTS_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveWhatsAppContact(alias, entry) {
  const contacts = loadWhatsAppContacts();
  contacts[String(alias || "").toLowerCase().trim()] = entry;
  fs.writeFileSync(WHATSAPP_CONTACTS_PATH, JSON.stringify(contacts, null, 2));
  logMac("whatsapp.contact.saved", { alias: textForLog(alias), hasPhone: Boolean(entry?.phone), name: textForLog(entry?.name || "") });
}

const CONTACTS_CACHE_PATH = path.join(AUTH_STORE_DIR, "contacts-cache.json");
const WA_LISTENER_STATE_PATH = path.join(AUTH_STORE_DIR, "whatsapp-listener.json");
const WAKE_WORD_STATE_PATH = path.join(AUTH_STORE_DIR, "wake-word.json");

function loadWakeWordState() {
  try {
    return Boolean(JSON.parse(fs.readFileSync(WAKE_WORD_STATE_PATH, "utf8"))?.enabled);
  } catch (_) {
    return false;
  }
}

function saveWakeWordState(enabled) {
  try {
    fs.writeFileSync(WAKE_WORD_STATE_PATH, JSON.stringify({ enabled: Boolean(enabled) }));
  } catch (_) {}
}

// ── Braino Cowork: opt-in coworking mode. He checks the screen on a short
// interval (default 90s, tunable by voice: "check on me every 30 seconds"),
// and only speaks when he has ONE concrete way to help — the model answers
// "SKIP" otherwise and he stays quiet. "Start cowork mode" / "stop cowork
// mode". State persists like the wake-word toggle. The dedicated human
// intelligence layer comes later; v1 is watch -> offer -> (user says yes)
// -> the normal delegate routing does the task.
const COWORK_STATE_PATH = path.join(AUTH_STORE_DIR, "cowork.json");
const COWORK_DEFAULT_INTERVAL_MS = 90 * 1000;
const COWORK_MIN_INTERVAL_MS = 15 * 1000;
const COWORK_MAX_INTERVAL_MS = 10 * 60 * 1000;

function loadCoworkState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(COWORK_STATE_PATH, "utf8")) || {};
    return {
      enabled: Boolean(parsed.enabled),
      intervalMs: Math.min(COWORK_MAX_INTERVAL_MS, Math.max(COWORK_MIN_INTERVAL_MS, Number(parsed.intervalMs) || COWORK_DEFAULT_INTERVAL_MS)),
    };
  } catch (_) {
    return { enabled: false, intervalMs: COWORK_DEFAULT_INTERVAL_MS };
  }
}

let coworkState = loadCoworkState();
let coworkRecentSuggestions = [];

function saveCoworkState() {
  try { fs.writeFileSync(COWORK_STATE_PATH, JSON.stringify(coworkState)); } catch (_) {}
}

function setCoworkState(patch) {
  coworkState = { ...coworkState, ...patch };
  if (!coworkState.enabled) coworkRecentSuggestions = [];
  saveCoworkState();
  sendToRenderer("braino-mac:cowork", coworkState);
  logMac("cowork.state", coworkState);
}

// One cowork glance: screenshot -> vision -> either "" (nothing worth
// interrupting for) or one short offer to help. The recent-suggestion list
// keeps him from repeating himself every interval.
async function runCoworkObserve() {
  const startedAt = Date.now();
  const shot = await captureScreenBase64();
  if (!shot.ok) return { ok: false, say: "" };
  const authToken = await getBrainoAuthToken();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authToken) return { ok: false, say: "" };
  const surface = activeMacContext || {};
  const message = [
    "You are Braino in COWORK MODE: a coworking buddy who has been watching your human work on this Mac, checking in every minute or two.",
    surface.appName ? `Front app: ${surface.appName}${surface.windowTitle ? `, window "${surface.windowTitle}"` : ""}${surface.browserUrl ? `, at ${surface.browserUrl}` : ""}.` : "",
    coworkRecentSuggestions.length ? `You already offered recently (do NOT repeat or rephrase these): ${coworkRecentSuggestions.join(" | ")}` : "",
    "Look at the screen. If there is ONE concrete, genuinely useful thing you could DO for them right now (draft the reply, tidy the file, look something up, fix the error on screen, queue the next step), offer it in ONE short spoken sentence, max 20 words, phrased so they can accept by just saying yes.",
    "Only speak when it is truly worth interrupting focused work. If nothing new or useful, reply with exactly: SKIP",
    "Casual, warm, zero preamble, never mention screenshots or that you are an AI.",
  ].filter(Boolean).join("\n");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ notes: "", chatHistory: macChatHistory.slice(-4), message, visionMode: "describe", imageBase64: shot.base64, responseMedium: "voice" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!response.ok) throw new Error(data?.error || `cowork observe failed (${response.status})`);
    const skipped = !reply || /^skip[.!]?$/i.test(reply);
    logMac("cowork.observe", { activeApp: surface.appName || "", skipped, replyChars: reply.length, durationMs: Date.now() - startedAt });
    if (skipped) return { ok: true, say: "" };
    coworkRecentSuggestions = [...coworkRecentSuggestions.slice(-4), reply];
    rememberMacChat("assistant", reply);
    return { ok: true, say: reply };
  } catch (error) {
    logMac("cowork.observe.failed", { error });
    return { ok: false, say: "" };
  }
}

ipcMain.handle("braino-mac:cowork-observe", async () => runCoworkObserve());
ipcMain.handle("braino-mac:cowork-state", async () => coworkState);

// ── The island's cowork label ("co-work", "capturing", "uploading"…). Sent to
// the renderer, which shows it in the notch ticker while the ability runs. ──
function setNotchCoworkLabel(label, thinking) {
  sendToRenderer("braino-mac:cowork-label", { label: String(label || ""), thinking: String(thinking || "") });
}

// ── Cowork Ability #1: the Claude Design handoff. The step machine lives in
// cowork-design.cjs; here we inject the real primitives it drives. ──
const { makeDesignCowork } = require("./cowork-design.cjs");

// screencapture straight to a file we keep (the run archive on the Desktop).
async function captureScreenToFile(destPath) {
  try {
    await execFileP("/usr/sbin/screencapture", ["-x", destPath], { timeout: 8000 });
    await execFileP("/usr/bin/sips", ["-Z", "2000", destPath], { timeout: 8000 }).catch(() => {});
    const stat = await fs.promises.stat(destPath).catch(() => null);
    return { ok: Boolean(stat && stat.size > 0) };
  } catch (error) {
    logMac("cowork.capture_file.failed", { error });
    return { ok: false };
  }
}

async function fileToBase64(p) {
  try { return (await fs.promises.readFile(p)).toString("base64"); } catch { return ""; }
}

// One vision question against an already-captured base64 shot.
async function askVision(question, base64) {
  const authToken = await getBrainoAuthToken();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authToken) return { ok: false, say: "" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ notes: "", chatHistory: [], message: question, visionMode: "describe", imageBase64: base64, responseMedium: "voice" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    return reply ? { ok: true, say: reply } : { ok: false, say: "" };
  } catch (error) {
    logMac("cowork.vision.failed", { error });
    return { ok: false, say: "" };
  }
}

// osascript key press / typing via System Events.
async function pressKey(keyCode, mod) {
  const using = mod ? ` using ${mod} down` : "";
  await execFileP("/usr/bin/osascript", ["-e", `tell application "System Events" to key code ${keyCode}${using}`], { timeout: 5000 }).catch(() => {});
}
async function typeText(text) {
  await execFileP("/usr/bin/osascript", ["-e", `tell application "System Events" to keystroke ${JSON.stringify(String(text))}`], { timeout: 8000 }).catch(() => {});
}

// Vision-locate a described UI element and click it (reuses the vision-point
// edge function + AX click). Returns true if it found and clicked something.
async function clickTargetByVision(description) {
  const shot = await captureScreenBase64();
  if (!shot.ok) return false;
  const authToken = await getBrainoAuthToken();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authToken) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/vision-point`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ target: description, said: description, context: "", imageBase64: shot.base64 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const parsed = JSON.parse(String(data?.reply || "").match(/\{[\s\S]*\}/)?.[0] || "null");
    if (parsed?.found && Number.isFinite(Number(parsed.x)) && Number.isFinite(Number(parsed.y))) {
      const ok = await clickAtNormalized(Number(parsed.x), Number(parsed.y), description);
      logMac("cowork.click", { target: textForLog(description), x: parsed.x, y: parsed.y, ok });
      return ok;
    }
    logMac("cowork.click.notfound", { target: textForLog(description) });
    return false;
  } catch (error) {
    logMac("cowork.click.failed", { error });
    return false;
  }
}

// Attach a folder of files to whatever input just opened a native file dialog:
// click the attach affordance, then drive the Open panel with Go-to-Folder
// (Cmd+Shift+G), type the folder path, select all, and open. Deterministic.
async function attachFilesViaDialog(dir, files) {
  // 1 — click the "+" / attach / paperclip button (vision-located).
  const clicked = await clickTargetByVision("the plus, attach, or paperclip button that adds files to the message input");
  if (!clicked) { logMac("cowork.attach.no_button", {}); return false; }
  await new Promise((r) => setTimeout(r, 1400));
  // Some UIs show a menu ("Upload from computer"); try to click it, harmless if absent.
  await clickTargetByVision("the 'Upload a file' or 'Upload from computer' menu option").catch(() => {});
  await new Promise((r) => setTimeout(r, 1400));
  // 2 — drive the macOS Open panel: Go to Folder → type path → Enter.
  await pressKey(5, "command down, shift down"); // Cmd+Shift+G
  await new Promise((r) => setTimeout(r, 700));
  await typeText(dir);
  await new Promise((r) => setTimeout(r, 500));
  await pressKey(36); // Enter — go to folder
  await new Promise((r) => setTimeout(r, 900));
  // 3 — select every screenshot and open.
  await pressKey(0, "command"); // Cmd+A — select all in the listing
  await new Promise((r) => setTimeout(r, 500));
  await pressKey(36); // Enter — open the selection
  logMac("cowork.attach.done", { dir, count: files.length });
  return true;
}

const runDesignCowork = makeDesignCowork({
  path, fs,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  homeDir: app.getPath("home"),
  attachFiles: attachFilesViaDialog,
  clickTarget: clickTargetByVision,
  captureFile: captureScreenToFile,
  captureB64: captureScreenBase64,
  fileToB64: fileToBase64,
  vision: askVision,
  key: pressKey,
  type: typeText,
  openChromeUrl,
  frontApp: () => (activeMacContext && activeMacContext.appName) || "Google Chrome",
  activate: (name) => execFileP("/usr/bin/osascript", ["-e", `tell application ${JSON.stringify(name)} to activate`], { timeout: 5000 }).catch(() => {}),
  notch: setNotchCoworkLabel,
  say: async (line) => { sendToRenderer("braino-mac:speak-line", { text: String(line || "") }); },
  log: logMac,
});

function stopBrainoWakeWord() {
  if (wakeWordRestartTimer) {
    clearTimeout(wakeWordRestartTimer);
    wakeWordRestartTimer = null;
  }
  if (swiftWakeWord) {
    swiftWakeWord.kill();
    swiftWakeWord = null;
  }
  sendToRenderer("braino-mac:wake-status", { armed: false });
}

function parseWakeWordToggleIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (/\b(?:turn off|stop|disable)\b.*\b(?:wake word|always listen(?:ing)?|hey braino)\b/i.test(source)) return { enable: false };
  if (/\b(?:turn on|enable|start)\b.*\b(?:wake word|always listen(?:ing)?|hey braino)\b/i.test(source)) return { enable: true };
  if (/\balways listen for me\b/i.test(source)) return { enable: true };
  return null;
}
const WA_POLL_INTERVAL_MS = 2500;
let contactsCache = null;
let waListenerEnabled = false;
let waLastRecId = 0;
let waPollTimer = null;
let waPollBusy = false;
let lastIncomingWhatsApp = null;

async function importAllContacts(force = false) {
  try {
    if (!force) {
      const stat = await fs.promises.stat(CONTACTS_CACHE_PATH).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs < 24 * 3600 * 1000) {
        contactsCache = JSON.parse(await fs.promises.readFile(CONTACTS_CACHE_PATH, "utf8"));
        logMac("contacts.cache.loaded", { count: Object.keys(contactsCache).length });
        return;
      }
    }
    await execFileP("/usr/bin/open", ["-gja", "Contacts"], { timeout: 4000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 900));
    const script = `
set out to ""
tell application "Contacts"
  repeat with p in every person
    try
      if (count of phones of p) > 0 then
        set out to out & (name of p) & tab & (value of first phone of p) & linefeed
      end if
    end try
  end repeat
end tell
return out`;
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
    const map = {};
    for (const line of String(stdout || "").split(/\r?\n/)) {
      const [name, phone] = line.split("\t");
      if (name?.trim() && phone?.trim()) map[name.toLowerCase().trim()] = { name: name.trim(), phone: phone.trim() };
    }
    if (Object.keys(map).length) {
      contactsCache = map;
      await fs.promises.writeFile(CONTACTS_CACHE_PATH, JSON.stringify(map, null, 2));
      logMac("contacts.imported", { count: Object.keys(map).length });
    }
  } catch (error) {
    logMac("contacts.import_failed", { error });
  }
}

function findContactInCache(query) {
  if (!contactsCache) return null;
  const q = String(query || "").toLowerCase().trim();
  if (!q) return null;
  if (contactsCache[q]) return contactsCache[q];
  const keys = Object.keys(contactsCache);
  const starts = keys.find((k) => k.startsWith(q));
  if (starts) return contactsCache[starts];
  const contains = keys.find((k) => k.includes(q) || q.includes(k.replace(/[^a-z0-9 ]/g, "").trim()));
  return contains ? contactsCache[contains] : null;
}

async function notificationDbPath() {
  const grouped = path.join(os.homedir(), "Library", "Group Containers", "group.com.apple.usernoted", "db2", "db");
  if (fs.existsSync(grouped)) return grouped;
  try {
    const { stdout } = await execFileP("/usr/bin/getconf", ["DARWIN_USER_DIR"], { timeout: 3000 });
    return path.join(String(stdout).trim(), "com.apple.notificationcenter", "db2", "db");
  } catch (_) {
    return grouped;
  }
}

async function queryWhatsAppNotifications(sinceRecId, limit = 8) {
  const db = await notificationDbPath();
  const sql = `SELECT r.rec_id || '::' || hex(r.data) FROM record r JOIN app a ON r.app_id = a.app_id WHERE a.identifier LIKE '%whatsapp%' AND r.rec_id > ${Math.max(0, Number(sinceRecId) || 0)} ORDER BY r.rec_id ASC LIMIT ${limit};`;
  const { stdout } = await execFileP("/usr/bin/sqlite3", ["-readonly", db, sql], { timeout: 6000, maxBuffer: 8 * 1024 * 1024 });
  const rows = [];
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const sep = line.indexOf("::");
    if (sep < 1) continue;
    const recId = Number(line.slice(0, sep));
    const hexData = line.slice(sep + 2).trim();
    if (!Number.isFinite(recId) || !hexData) continue;
    const tmp = path.join(app.getPath("temp"), `braino-nc-${recId}.plist`);
    try {
      await fs.promises.writeFile(tmp, Buffer.from(hexData, "hex"));
      const { stdout: jsonOut } = await execFileP("/usr/bin/plutil", ["-convert", "json", "-o", "-", tmp], { timeout: 4000 });
      const parsed = JSON.parse(jsonOut);
      const req = parsed?.req || {};
      rows.push({ recId, sender: String(req.titl || "").trim(), subtitle: String(req.subt || "").trim(), body: String(req.body || "").trim() });
    } catch (_) {
    } finally {
      fs.promises.unlink(tmp).catch(() => {});
    }
  }
  return rows;
}

function loadWaListenerState() {
  // Default ON: the user expects incoming WhatsApps spoken without having to
  // discover an opt-in phrase. "turn off whatsapp reader" persists false.
  try {
    return Boolean(JSON.parse(fs.readFileSync(WA_LISTENER_STATE_PATH, "utf8"))?.enabled);
  } catch (_) {
    return true;
  }
}

function saveWaListenerState(enabled) {
  try {
    fs.writeFileSync(WA_LISTENER_STATE_PATH, JSON.stringify({ enabled: Boolean(enabled) }));
  } catch (_) {}
}

async function pollWhatsAppNotifications() {
  if (waPollBusy) return;
  waPollBusy = true;
  try {
    if (waBadgeCount && activeMacContext?.appName === "WhatsApp") clearWaBadge();
    const rows = await queryWhatsAppNotifications(waLastRecId);
    for (const row of rows) {
      waLastRecId = Math.max(waLastRecId, row.recId);
      if (!row.body || !row.sender) continue;
      // Group chats put the group in titl and "Sender: msg" in body; keep it natural.
      const sender = row.sender.replace(/\s*\(\d+ messages?\)\s*$/i, "");
      lastIncomingWhatsApp = { name: sender, at: Date.now() };
      logMac("whatsapp.incoming", { sender: textForLog(sender), bodyChars: row.body.length, recId: row.recId, spoken: waListenerEnabled });
      if (waListenerEnabled) {
        sendToRenderer("braino-mac:speak-line", { text: `${sender} says: ${row.body}` });
      } else {
        updateWaBadge(sender);
      }
    }
  } catch (error) {
    logMac("whatsapp.listener.poll_failed", { error });
  } finally {
    waPollBusy = false;
  }
}

async function whatsAppListenerDiagnostics() {
  const db = await notificationDbPath();
  let dbOk = false;
  let waCount = 0;
  let waMax = 0;
  let globalMax = 0;
  try {
    const { stdout } = await execFileP("/usr/bin/sqlite3", ["-readonly", db,
      "SELECT (SELECT COUNT(*) FROM record r JOIN app a ON r.app_id=a.app_id WHERE a.identifier LIKE '%whatsapp%') || '|' || (SELECT COALESCE(MAX(r2.rec_id),0) FROM record r2 JOIN app a2 ON r2.app_id=a2.app_id WHERE a2.identifier LIKE '%whatsapp%') || '|' || (SELECT COALESCE(MAX(rec_id),0) FROM record);",
    ], { timeout: 6000 });
    const [count, waMaxRaw, globalMaxRaw] = String(stdout || "").trim().split("|").map(Number);
    dbOk = true;
    waCount = count || 0;
    waMax = waMaxRaw || 0;
    globalMax = globalMaxRaw || 0;
  } catch (_) {}
  logMac("whatsapp.diagnostics", { dbOk, waCount, waMax, globalMax, enabled: waListenerEnabled, fromRecId: waLastRecId });
  const parts = [];
  parts.push(waListenerEnabled ? "My reader is on." : "My reader is off — say read my whatsapps to turn it on.");
  if (!dbOk) {
    parts.push("But macOS is hiding the notification database from me — I need Full Disk Access in System Settings.");
  } else if (!waCount) {
    parts.push("And macOS has no WhatsApp notifications recorded at all — check WhatsApp notifications are allowed with previews always shown.");
  } else if (waMax <= waLastRecId) {
    parts.push("The plumbing is fine — macOS just has not recorded a new WhatsApp notification since I started. Mind that WhatsApp mutes its own banners while it is the front app, and a Focus mode silences everything.");
  } else {
    parts.push("There are fresh notifications I have not caught yet — tell me if the next one stays silent.");
  }
  return { ok: true, say: parts.join(" ") };
}

async function startWhatsAppListener({ announce = false, enable = true } = {}) {
  const db = await notificationDbPath();
  try {
    const { stdout } = await execFileP("/usr/bin/sqlite3", ["-readonly", db, "SELECT COALESCE(MAX(rec_id),0) FROM record;"], { timeout: 6000 });
    waLastRecId = Number(String(stdout).trim()) || 0;
  } catch (error) {
    logMac("whatsapp.listener.db_blocked", { error });
    if (!announce) return { ok: false, say: "" };
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
    return {
      ok: false,
      say: "I need Full Disk Access to hear WhatsApp notifications. I opened the setting, add the app running me, then ask again.",
    };
  }
  let everSeen = 0;
  try {
    const { stdout } = await execFileP("/usr/bin/sqlite3", ["-readonly", db, "SELECT COUNT(*) FROM record r JOIN app a ON r.app_id = a.app_id WHERE a.identifier LIKE '%whatsapp%';"], { timeout: 6000 });
    everSeen = Number(String(stdout).trim()) || 0;
  } catch (_) {}
  if (enable) {
    waListenerEnabled = true;
    saveWaListenerState(true);
  }
  if (waPollTimer) clearInterval(waPollTimer);
  waPollTimer = setInterval(() => void pollWhatsAppNotifications(), WA_POLL_INTERVAL_MS);
  logMac("whatsapp.listener.started", { fromRecId: waLastRecId, everSeen, spoken: waListenerEnabled });
  if (!announce) return { ok: true, say: "" };
  if (everSeen === 0) {
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.notifications");
    return {
      ok: true,
      say: "I am listening for WhatsApp now, but macOS has never shown me a WhatsApp notification. In the settings I just opened, allow notifications for WhatsApp with previews, and check WhatsApp's own notification settings too.",
    };
  }
  return { ok: true, say: "I am listening. When a WhatsApp message comes in, I will read it out, and you can just say reply, then the message." };
}

function stopWhatsAppListener() {
  waListenerEnabled = false;
  saveWaListenerState(false);
  if (waPollTimer) {
    clearInterval(waPollTimer);
    waPollTimer = null;
  }
  logMac("whatsapp.listener.stopped", {});
  return { ok: true, say: "Okay, I stopped reading your WhatsApp messages." };
}

function parseCallIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source) return null;
  if (!/\b(?:call|face\s*time|ring|dial)\b/i.test(source)) return null;
  const facetime = /\bface\s*time\b/i.test(source);
  const wantsVideo = /\bvideo\b/i.test(source);
  const onWhatsApp = /\bwhats\s*app\b/i.test(source);
  const match = source.match(/\b(?:video\s+call|voice\s+call|audio\s+call|call|face\s*time|ring|dial)\s+(?:my\s+)?(.+?)(?:\s+on\s+whats\s*app|\s+on\s+face\s*time|\s+for\s+me)?\s*$/i);
  let recipient = match?.[1]
    ?.replace(/\bon\s+whats\s*app\b/gi, "")
    .replace(/\bon\s+face\s*time\b/gi, "")
    .replace(/\b(?:please|now|right now)\b/gi, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "";
  if (!recipient || recipient.split(/\s+/).length > 4) return null;
  if (facetime) return { app: "facetime", video: !/\baudio\b/i.test(source), recipient };
  if (onWhatsApp || wantsVideo) return { app: "whatsapp", video: wantsVideo, recipient };
  return { app: "phone", video: false, recipient };
}

async function clickWhatsAppCallMenuItem(video) {
  if (process.platform !== "darwin") return false;
  const axTargets = video
    ? ["Video call", "Start video call", "Video Call"]
    : ["Voice call", "Audio call", "Start voice call", "Voice Call"];
  const menuTargets = video
    ? ["Video Call", "Video call", "Start Video Call", "Start video call"]
    : ["Voice Call", "Voice call", "Audio Call", "Audio call", "Start Voice Call", "Start voice call"];
  const targetList = menuTargets.map((target) => `"${escapeAppleScriptString(target)}"`).join(", ");

  const focusScript = `
tell application "System Events"
  if not (exists application process "WhatsApp") then return "no-app"
end tell
tell application "WhatsApp" to activate
delay 0.35
return "ok"`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", focusScript], { timeout: 6000 });
    if (/no-app/i.test(String(stdout || ""))) return false;
  } catch (error) {
    logMac("call.whatsapp.focus_failed", { video, error });
  }

  // WhatsApp exposes the call controls as toolbar buttons in current builds.
  // Use the native AX helper first so we click what the user can actually see.
  for (const target of axTargets) {
    const result = await runAxHelper(["press", target], 12000);
    logMac("call.whatsapp.ax_press", {
      video,
      target: textForLog(target),
      status: result.status,
      detail: textForLog(result.detail),
    });
    if (result.status === "pressed") return true;
    if (result.status === "needs-accessibility") break;
  }

  // Backup for older WhatsApp builds where calls are only exposed through
  // app menus. Open each menu before reading it; direct `menu 1 of mb` access
  // can throw and used to leak a raw Delegate error into the UI.
  const script = `
on textMatches(valueText, wantedNames)
  ignoring case
    repeat with wantedName in wantedNames
      if valueText contains (wantedName as text) then return true
    end repeat
  end ignoring
  return false
end textMatches

tell application "System Events"
  if not (exists application process "WhatsApp") then return "no-app"
  tell application process "WhatsApp"
    set frontmost to true
    delay 0.25
    set wantedNames to {${targetList}}
    repeat with mb in menu bar items of menu bar 1
      try
        click mb
        delay 0.08
        if exists menu 1 of mb then
          repeat with mi in menu items of menu 1 of mb
            try
              set nm to name of mi as text
              if my textMatches(nm, wantedNames) then
                click mi
                return "clicked-menu"
              end if
            end try
          end repeat
        end if
      end try
    end repeat
    key code 53
    return "not-found"
  end tell
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 10000 });
    const status = String(stdout || "").trim();
    logMac("call.whatsapp.menu_press", { video, status });
    return /clicked/i.test(status);
  } catch (error) {
    logMac("call.whatsapp.menu_press_failed", { video, error });
    return false;
  }
}

async function pressReturnInApp(appName) {
  const script = `
tell application "System Events"
  if not (exists application process "${escapeAppleScriptString(appName)}") then return "no-app"
  tell application process "${escapeAppleScriptString(appName)}"
    set frontmost to true
    delay 0.25
    key code 36
  end tell
  return "ok"
end tell`;
  try {
    await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 6000 });
  } catch (_) {}
}

async function startCall(intent) {
  const label = intent.app === "facetime"
    ? (intent.video ? "FaceTime" : "FaceTime audio")
    : intent.app === "phone"
      ? "your iPhone"
      : intent.video
        ? "WhatsApp video"
        : "WhatsApp voice";
  sendTaskProgress({ status: "thinking", text: `Calling ${intent.recipient}` });

  const resolved = await resolveWhatsAppRecipient(intent.recipient);
  if (!resolved.ok) {
    return {
      ok: false,
      say: `I could not find a number for ${intent.recipient}. Say "Braino, remember ${intent.recipient}'s number is" and the number.`,
    };
  }
  const phone = normalizeWhatsAppPhone(resolved.phone);
  if (!phone || phone.length < 10) {
    return { ok: false, say: `The number I have for ${resolved.name} does not look complete. Teach me the full one with country code.` };
  }

  if (intent.app === "facetime") {
    await shell.openExternal(`${intent.video ? "facetime" : "facetime-audio"}://+${phone}`);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await pressReturnInApp("FaceTime");
    logMac("call.started", { app: "facetime", video: intent.video, to: textForLog(resolved.name) });
    sendTaskProgress({ status: "done", text: `Calling ${resolved.name}` });
    return { ok: true, say: `Calling ${resolved.name} on ${intent.video ? "FaceTime" : "FaceTime audio"}.` };
  }

  if (intent.app === "phone") {
    await shell.openExternal(`tel://+${phone}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await pressReturnInApp("FaceTime");
    logMac("call.started", { app: "phone", to: textForLog(resolved.name) });
    sendTaskProgress({ status: "done", text: `Calling ${resolved.name}` });
    return { ok: true, say: `Calling ${resolved.name} through your iPhone.` };
  }

  const wasRunning = await isMacApplicationRunning("WhatsApp");
  await shell.openExternal(`whatsapp://send?phone=${phone}`);
  await new Promise((resolve) => setTimeout(resolve, wasRunning ? 1900 : 3800));
  const clicked = await clickWhatsAppCallMenuItem(intent.video);
  if (!clicked) {
    logMac("call.whatsapp.menu_missing", { video: intent.video, to: textForLog(resolved.name) });
    return {
      ok: false,
      say: `I opened ${resolved.name}'s chat but could not reach the ${intent.video ? "video" : "voice"} call button. The chat is up, one click and you are through.`,
    };
  }
  logMac("call.started", { app: "whatsapp", video: intent.video, to: textForLog(resolved.name) });
  sendTaskProgress({ status: "done", text: `Calling ${resolved.name}` });
  return { ok: true, say: `Starting a ${intent.video ? "video" : "voice"} call with ${resolved.name} on WhatsApp.` };
}

// ── Notch live activities: timers/reminders, calendar peek, unread badge ──
let activeTimers = [];
let waBadgeCount = 0;
let waBadgeSender = "";
let calendarNext = null;

function broadcastTimers() {
  sendToRenderer("braino-mac:timers", {
    timers: activeTimers.map(({ id, label, endAt, kind }) => ({ id, label, endAt, kind: kind || "timer" })),
  });
  persistTimers();
}

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, ninety: 90, couple: 2, few: 3,
};

function spokenAmount(raw) {
  const text = String(raw || "").toLowerCase().trim();
  if (/^\d+$/.test(text)) return Number(text);
  let total = 0;
  for (const part of text.split(/[\s-]+/)) {
    if (part === "of") continue;
    if (NUMBER_WORDS[part] == null) return NaN;
    total += NUMBER_WORDS[part];
  }
  return total || NaN;
}

function reminderSeconds(amount, unit) {
  const n = spokenAmount(amount);
  if (!Number.isFinite(n)) return 0;
  if (/^h/i.test(unit)) return n * 3600;
  if (/^m/i.test(unit)) return n * 60;
  return n;
}

const AMOUNT_RE = "(\\d+|[a-z]+(?:[ -][a-z]+)?)";
const UNIT_RE = "(seconds?|secs?|minutes?|mins?|hours?|hrs?)";

// Touch ID (or the account password on Macs without the sensor — same
// .deviceOwnerAuthentication policy System Preferences itself uses, so one
// code path covers every Mac). Returns true/false/null (null = hardware or
// LocalAuthentication itself unavailable, e.g. no Swift toolchain).
async function requireTouchId(reason) {
  try {
    const { stdout } = await execFileP("/usr/bin/xcrun", ["swift", TOUCH_ID_HELPER_PATH, reason], { timeout: 30000 });
    const result = String(stdout || "").trim();
    logMac("touchid.result", { reason: textForLog(reason), result });
    if (result === "ok") return true;
    if (result === "denied") return false;
    return null;
  } catch (error) {
    logMac("touchid.failed", { error });
    return null;
  }
}

// ── Live captions: on-device partial STT while a realtime session runs, so
// the user's words form on screen AS they speak. Display-only — OpenAI's
// transcript stays authoritative for routing. ──
// ── Google Maps: directions, distance, show-a-place. Deterministic URLs;
// origin defaults to the user's current location so "navigate to X" just
// works. Best-effort distance readout scraped after load. ──
function mapsSearchUrl(q) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; }
function mapsDirUrl(dest, origin) {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  return origin ? `${base}&origin=${encodeURIComponent(origin)}` : base;
}

const MAPS_DISTANCE_JS = "(function(){var el=document.querySelector('#section-directions-trip-0, div[aria-label*=\\\"min\\\"], .Fk3sm, .ivN21e');var t=document.body.innerText||'';var m=t.match(/([0-9.,]+\\s*(?:km|mi|miles|kilometers?))/i);var d=t.match(/([0-9]+\\s*(?:h|hr|hours?|min|minutes?)(?:\\s*[0-9]+\\s*min)?)/i);return JSON.stringify({dist:m?m[1]:'',dur:d?d[1]:''});})()";

async function mapsScrapeDistance() {
  await new Promise((r) => setTimeout(r, 3500));
  const raw = await chromeInjectJs(MAPS_DISTANCE_JS);
  if (raw === "__jsoff__" || raw === "__err__" || raw === "__nowin__" || !raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

async function runMapsDirections({ destination, origin }) {
  // "here" / "my location" = current location, which Maps fills when origin
  // is omitted — don't pass the literal word.
  if (origin && /^(?:here|my (?:location|place|home)|current location|where i am)$/i.test(origin.trim())) origin = "";
  sendTaskProgress({ status: "thinking", text: `Mapping ${destination}` });
  await openChromeUrl(mapsDirUrl(destination, origin));
  const scraped = await mapsScrapeDistance();
  logMac("maps.directions", { destination: textForLog(destination), origin: textForLog(origin || "current"), dist: scraped?.dist || "", dur: scraped?.dur || "" });
  if (scraped?.dist) {
    return { ok: true, say: `${origin ? `${origin} to ${destination}` : destination} is about ${scraped.dist}${scraped.dur ? `, roughly ${scraped.dur}` : ""}.` };
  }
  return { ok: true, say: `Directions to ${destination} are up${origin ? ` from ${origin}` : ""}.` };
}

async function runMapsShow(place) {
  sendTaskProgress({ status: "thinking", text: `Finding ${place}` });
  await openChromeUrl(mapsSearchUrl(place));
  logMac("maps.show", { place: textForLog(place) });
  return { ok: true, say: `Here's ${place} on the map.` };
}

function parseMapsIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (/^(?:what|which|whats|what'?s)\b/i.test(source) && !/\bdistance\b|\bhow far\b/i.test(source)) {
    // "what's the distance" is fine; other questions aren't map commands.
  }
  // distance / how far — with explicit from/to
  let m = source.match(/\b(?:distance|how far)\b.*?\bfrom\s+(.+?)\s+to\s+(.+)$/i);
  if (m) return { mode: "directions", origin: m[1].trim(), destination: m[2].trim() };
  m = source.match(/\bhow far\s+(?:is\s+)?(.+?)\s+from\s+(.+)$/i);
  if (m) return { mode: "directions", origin: m[2].trim(), destination: m[1].trim() };
  // directions/navigate from A to B
  m = source.match(/\b(?:directions|navigate|route|drive|get)\b.*?\bfrom\s+(.+?)\s+to\s+(.+)$/i);
  if (m) return { mode: "directions", origin: m[1].trim(), destination: m[2].trim() };
  // navigate/directions to X (origin = current location)
  m = source.match(/\b(?:navigate|directions|route|drive|take me)\b\s+(?:me\s+)?to\s+(.+)$/i);
  if (m) return { mode: "directions", destination: m[1].trim() };
  // show/find where X is on the map
  m = source.match(/\b(?:show me|find|where(?:'s| is)|locate|pull up)\b\s+(?:where\s+)?(.+?)(?:\s+is)?(?:\s+on (?:the|google)\s+maps?)?$/i);
  let place = m && /\bmaps?\b/i.test(source) ? m[1] : null;
  if (!place && /\bon (?:the|google)\s+maps?\b/i.test(source)) {
    place = source.replace(/.*\b(?:show me|find|where(?:'s| is)|locate|pull up|open)\b\s+/i, "");
  }
  if (place == null) return null;
  place = cleanMapPlace(place);
  // Vague / filler asks ("show me anything on the map, dude") are NOT a real
  // place — ask instead of searching the literal words.
  if (!place || /^(?:some(?:thing|where)|any(?:thing|where)|a place|stuff|things)$/i.test(place)) {
    return { mode: "ask" };
  }
  return { mode: "show", place };
}

function cleanMapPlace(value) {
  return String(value || "")
    .replace(/\bon (?:the|google)\s+maps?\b/gi, "")
    .replace(/\bwhere\b|\bis\b/gi, " ")
    .replace(/\b(?:dude|bro|man|buddy|please|for me|okay|ok|yeah|just)\b/gi, " ")
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Send to phone: text the current tab (or a place) to the user's own
// number via Messages. Number stored on first use. ──
const PHONE_STATE_PATH = path.join(AUTH_STORE_DIR, "my-phone.json");
function loadMyPhone() { try { return JSON.parse(fs.readFileSync(PHONE_STATE_PATH, "utf8"))?.number || ""; } catch (_) { return ""; } }
function saveMyPhone(n) { try { fs.writeFileSync(PHONE_STATE_PATH, JSON.stringify({ number: n })); } catch (_) {} }

async function sendToPhone(content) {
  const number = loadMyPhone();
  if (!number) {
    setPendingMacWorkflow({ type: "phone", stage: "phone_number", data: { content } });
    return { ok: true, say: "What's your phone number? I'll remember it and send things straight to your phone." };
  }
  const text = content || activeMacContext?.browserUrl || "";
  if (!text) return { ok: false, say: "There's nothing to send — open a page or tell me what to send." };
  try {
    await execFileP("/usr/bin/osascript", ["-e",
      `tell application "Messages" to send "${text.replace(/"/g, '\\"')}" to buddy "${number}" of (service 1 whose service type is iMessage)`,
    ], { timeout: 8000 });
    logMac("phone.sent", { chars: text.length });
    return { ok: true, say: "Sent to your phone." };
  } catch (error) {
    logMac("phone.send.failed", { error });
    return { ok: false, say: "I couldn't send it — check Messages is signed into iMessage." };
  }
}

function parseSendToPhoneIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (/\bsend\s+(?:this|it|that|the (?:link|page|url))\s+to\s+(?:my\s+)?phone\b/i.test(source)
    || /\b(?:send|push)\s+to\s+(?:my\s+)?phone\b/i.test(source)
    || /\bon my phone\b.*\bsend\b/i.test(source)) return {};
  return null;
}

// ── Multi-tab research: fire dedicated source tabs, read each, compare. ──
const PAGE_TEXT_JS = "(function(){return (document.body&&document.body.innerText||'').replace(/\\s+/g,' ').slice(0,6000);})()";

async function chromeOpenTabAndRead(url) {
  await execFileP("/usr/bin/osascript", ["-e",
    `tell application "Google Chrome" to tell front window to make new tab with properties {URL:"${url.replace(/"/g, '\\"')}"}`,
  ], { timeout: 8000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3800));
  const raw = await chromeInjectJs(PAGE_TEXT_JS);
  return raw && !/^__(?:jsoff|err|nowin)__$/.test(raw) ? raw : "";
}

async function runResearch(query) {
  sendTaskProgress({ status: "thinking", text: `Firing tabs on ${query.slice(0, 30)}` });
  const sources = [
    `https://www.google.com/search?q=${encodeURIComponent(query + " review comparison")}`,
    `https://www.google.com/search?q=${encodeURIComponent(query + " specs pros and cons")}`,
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " review")}`,
  ];
  const texts = [];
  for (const url of sources) {
    const text = await chromeOpenTabAndRead(url);
    if (text) texts.push(text);
    logMac("research.tab_read", { url: textForLog(url), chars: text.length });
  }
  if (!texts.length) {
    return { ok: false, say: "I opened the tabs but Chrome won't let me read them — turn on Allow JavaScript from Apple Events in View, Developer." };
  }
  sendTaskProgress({ status: "thinking", text: "Comparing what I found" });
  const authToken = await getBrainoAuthToken();
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ notes: "", chatHistory: [], message: `Based on these web pages, answer concisely for voice (under 70 words): "${query}". Give a clear recommendation with the key reason.\n\n${texts.join("\n---\n").slice(0, 11000)}`, responseMedium: "voice" }),
    });
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    logMac("research.done", { query: textForLog(query), tabs: texts.length, replyChars: reply.length });
    return { ok: true, say: reply || "I read a few sources but couldn't pull it together — try asking more specifically." };
  } catch (error) {
    logMac("research.failed", { error });
    return { ok: false, say: "The comparison got stuck on the way back. Try once more." };
  }
}

function parseResearchIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  const m = source.match(/\b(?:research|compare|difference between)\s+(.+)$/i);
  if (!m) return null;
  return { query: m[1].replace(/\bfor me\b/i, "").trim() };
}

// ── Amazon shopping: search, and lean on the universal clicker for the rest. ──
async function runAmazonSearch(product) {
  sendTaskProgress({ status: "thinking", text: `Amazon: ${product.slice(0, 30)}` });
  await openChromeUrl(`https://www.amazon.in/s?k=${encodeURIComponent(product)}`);
  logMac("amazon.search", { product: textForLog(product) });
  return { ok: true, say: `Here are options for ${product}. Say click the first one, or the second, and I'll open it — then add to cart when you're ready.` };
}

// Web-content asks are NOT products: "find me some articles by Mark Manson"
// used to ride the "find me" branch straight into a literal Amazon search
// (zero results, verbatim filler and all). These words route to web research.
const AMAZON_CONTENT_WORDS_RE = /\b(?:articles?|blogs?|blog posts?|essays?|posts?|news|videos?|interviews?|podcasts?|papers?|pdfs?|tutorials?|recipes?|lyrics|quotes?)\b/i;

function cleanAmazonQuery(text) {
  // Strip spoken filler so the search term reads like something a human
  // would type: "some articles by..." → "articles by...".
  return String(text || "").replace(/^(?:some|a few|a couple of|any|me some)\s+/i, "").trim();
}

function parseAmazonIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (AMAZON_CONTENT_WORDS_RE.test(source) && !/\bamazon\b/i.test(source)) return null;
  const onAmazon = /amazon\.(?:in|com)/.test(activeMacContext?.browserUrl || "");
  let m = source.match(/\b(?:show me options for|options for|search amazon for|find me|shop for)\s+(.+)$/i);
  if (m) return { mode: "search", product: cleanAmazonQuery(m[1]) };
  m = source.match(/\bamazon\b.*\bfor\s+(.+)$/i);
  if (m) return { mode: "search", product: cleanAmazonQuery(m[1]) };
  if (onAmazon) {
    m = source.match(/\bsearch\s+for\s+(.+)$/i) || source.match(/\bshow me\s+(.+)$/i);
    if (m) return { mode: "search", product: cleanAmazonQuery(m[1]) };
  }
  return null;
}

// ── Gmail reply: read the open thread, draft a reply, send it — all via
// injected JS on the active Chrome tab (needs "Allow JavaScript from Apple
// Events"). Ported locators from the extension's __sbGmail* flow. ──
async function chromeInjectJs(js) {
  const script = `tell application "Google Chrome"
  if (count of windows) = 0 then return "__nowin__"
  try
    return execute active tab of front window javascript "${js.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
  on error errMsg
    if errMsg contains "turned off" then return "__jsoff__"
    return "__err__"
  end try
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    return String(stdout || "").trim();
  } catch (_) {
    return "__err__";
  }
}

const GMAIL_READ_JS = "(function(){var subj=(document.querySelector('h2.hP')||document.querySelector('[role=\\\"main\\\"] h2')||{}).innerText||'';var msgs=document.querySelectorAll('.ii.gt .a3s, div[role=\\\"listitem\\\"] .a3s, .adn .a3s');var last=msgs[msgs.length-1];var body=last?(last.innerText||last.textContent||''):'';var gd=document.querySelectorAll('.gD');var sender=gd.length?(gd[gd.length-1].getAttribute('name')||gd[gd.length-1].getAttribute('email')||''):'';return JSON.stringify({subject:subj.slice(0,300),sender:sender,body:body.slice(0,5000)});})()";

const GMAIL_CLICK_REPLY_JS = "(function(){function v(e){if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}var ex=document.querySelector('span.ams.bkH[role=\\\"link\\\"]');if(ex&&v(ex)){ex.click();return 'ok';}var c=Array.from(document.querySelectorAll('[role=\\\"button\\\"],span[role=\\\"link\\\"],span[role=\\\"button\\\"]'));var r=c.find(function(e){if(!v(e))return false;var t=((e.getAttribute('aria-label')||'')+' '+(e.getAttribute('data-tooltip')||'')+' '+(e.innerText||'')).trim();return /^reply$/i.test((e.innerText||'').trim())||/^reply\\b/i.test(e.getAttribute('aria-label')||'');});if(r){r.click();return 'ok';}return 'no_reply';})()";

function gmailFillBodyJs(text) {
  const b64 = Buffer.from(text, "utf8").toString("base64");
  return `(function(){function v(e){if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}var box=Array.from(document.querySelectorAll('div[role=\\"textbox\\"][aria-label*=\\"Body\\"], div.Am.Al.editable, div[g_editable=\\"true\\"]')).find(v);if(!box)return 'no_field';var txt=decodeURIComponent(escape(atob('${b64}')));box.focus();box.innerText=txt;box.dispatchEvent(new InputEvent('input',{bubbles:true}));return 'filled';})()`;
}

const GMAIL_SEND_JS = "(function(){function v(e){if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}var s=document.querySelector('div[role=\\\"button\\\"][aria-label^=\\\"Send\\\"], div[role=\\\"button\\\"][data-tooltip^=\\\"Send\\\"]');if(!s){s=Array.from(document.querySelectorAll('div[role=\\\"button\\\"],button')).find(function(e){return v(e)&&/^send\\b/i.test((e.getAttribute('aria-label')||e.getAttribute('data-tooltip')||e.innerText||'').trim());});}if(s&&v(s)){s.click();return 'sent';}return 'no_send';})()";

async function readGmailThread() {
  const raw = await chromeInjectJs(GMAIL_READ_JS);
  if (raw === "__jsoff__" || raw === "__nowin__" || raw === "__err__" || !raw) return { status: raw || "__err__" };
  try { return { status: "ok", ...JSON.parse(raw) }; } catch (_) { return { status: "__parse__" }; }
}

async function replyToOpenGmail(userInstruction) {
  const onGmail = /mail\.google\.com/.test(activeMacContext?.browserUrl || "");
  if (!onGmail) {
    return { ok: false, say: "Open the email you want me to reply to, then ask again." };
  }
  sendTaskProgress({ status: "thinking", text: "Reading the email" });
  const thread = await readGmailThread();
  if (thread.status === "__jsoff__") {
    return { ok: false, say: "Chrome will not let me touch the page — turn on Allow JavaScript from Apple Events in View, Developer, then ask again." };
  }
  if (thread.status !== "ok" || !thread.body) {
    return { ok: false, say: "I could not read the open email. Make sure a thread is open, not the inbox list." };
  }
  sendTaskProgress({ status: "thinking", text: "Writing the reply" });
  const authToken = await getBrainoAuthToken();
  const message = [
    `Write a reply to this email from ${thread.sender || "the sender"}.`,
    userInstruction ? `The user wants to say: ${userInstruction}` : "Write a natural, appropriate reply based on the email's content.",
    "Return ONLY the reply body — no subject, no 'Hi'/'Dear' unless it fits, no signature block, no markdown, no preamble.",
    "---",
    `Subject: ${thread.subject}`,
    `Email:\n${thread.body}`,
  ].join("\n");
  let reply = "";
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ notes: "", chatHistory: [], message, responseMedium: "text" }),
    });
    const data = await response.json().catch(() => ({}));
    reply = String(data?.reply || "").trim();
  } catch (error) {
    logMac("gmail.reply.generate_failed", { error });
  }
  if (!reply) return { ok: false, say: "I read the email but the reply draft got stuck. Try once more." };

  const clicked = await chromeInjectJs(GMAIL_CLICK_REPLY_JS);
  if (clicked !== "ok") return { ok: false, say: "I drafted a reply but could not open the reply box on the page." };
  await new Promise((r) => setTimeout(r, 550));
  const filled = await chromeInjectJs(gmailFillBodyJs(reply));
  if (filled !== "filled") return { ok: false, say: "I opened the reply but could not type into it." };
  await new Promise((r) => setTimeout(r, 250));
  const sent = await chromeInjectJs(GMAIL_SEND_JS);
  logMac("gmail.reply", { sender: textForLog(thread.sender || ""), replyChars: reply.length, sent });
  if (sent === "sent") return { ok: true, say: `Replied to ${thread.sender ? thread.sender.split(" ")[0] || thread.sender : "them"}.` };
  return { ok: true, say: "Reply is written and ready in Gmail — just hit send, it would not click for me." };
}

function parseGmailReplyIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (!/\breply\b/i.test(source)) return null;
  // Must be about an email, not a WhatsApp reply or the redundant folder etc.
  const emailCtx = /\b(?:email|mail|gmail|message|thread|this)\b/i.test(source);
  const onGmail = /mail\.google\.com/.test(activeMacContext?.browserUrl || "");
  if (!emailCtx && !onGmail) return null;
  if (/\bwhats\s*app\b/i.test(source)) return null;
  const instruction = source.match(/\breply\b.*?\b(?:saying|with|that)\s+(.+)$/i)?.[1]?.trim() || "";
  return { instruction };
}

// ── Wallpaper: random official macOS picture, or fetch an image by name and
// set it. Reversible — the previous wallpaper is snapshotted first. ──
const WALLPAPER_DIR = "/System/Library/Desktop Pictures";
const WALLPAPER_STATE_PATH = path.join(AUTH_STORE_DIR, "wallpaper-prev.json");

async function currentWallpaperPath() {
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e",
      'tell application "System Events" to get picture of current desktop'], { timeout: 4000 });
    const value = String(stdout || "").trim();
    // Some macOS builds return "missing value" here — not a usable path.
    return value && value !== "missing value" && fs.existsSync(value) ? value : "";
  } catch (_) { return ""; }
}

async function setWallpaper(imagePath) {
  const prev = await currentWallpaperPath();
  if (prev) { try { fs.writeFileSync(WALLPAPER_STATE_PATH, JSON.stringify({ path: prev })); } catch (_) {} }
  await execFileP("/usr/bin/osascript", ["-e",
    `tell application "System Events" to set picture of every desktop to "${imagePath.replace(/"/g, '\\"')}"`,
  ], { timeout: 6000 });
  logMac("wallpaper.set", { path: textForLog(imagePath) });
}

async function setRandomOfficialWallpaper() {
  let pics = [];
  try {
    pics = fs.readdirSync(WALLPAPER_DIR)
      .filter((n) => /\.(heic|jpg|jpeg|png)$/i.test(n))
      .map((n) => path.join(WALLPAPER_DIR, n));
  } catch (_) {}
  if (!pics.length) return { ok: false, say: "I could not find the built-in Mac wallpapers." };
  const pick = pics[Math.floor(Math.random() * pics.length)];
  try {
    await setWallpaper(pick);
    return { ok: true, say: `Fresh look — that's ${path.basename(pick).replace(/\.[^.]+$/, "")}.` };
  } catch (error) {
    logMac("wallpaper.set.failed", { error });
    return { ok: false, say: "macOS blocked the wallpaper change — it may want Automation permission for System Events. Check System Settings, Privacy, Automation." };
  }
}

async function setWallpaperFromWeb(subject) {
  sendTaskProgress({ status: "thinking", text: `Finding a ${subject} wallpaper` });
  // Free source: an image search that returns a direct file. Unsplash's source
  // endpoint hands back a real photo for any query, no key, no cost.
  const url = `https://source.unsplash.com/2560x1440/?${encodeURIComponent(subject)}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`image fetch ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 8000) throw new Error("image too small");
    const dir = path.join(AUTH_STORE_DIR, "wallpapers");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}-${Date.now()}.jpg`);
    fs.writeFileSync(file, buffer);
    await setWallpaper(file);
    return { ok: true, say: `Done — your desktop is ${subject} now.` };
  } catch (error) {
    logMac("wallpaper.web.failed", { subject: textForLog(subject), error });
    return { ok: false, say: `I could not pull a ${subject} image just now. Try once more, or say random wallpaper for a built-in one.` };
  }
}

async function restoreWallpaper() {
  try {
    const prev = JSON.parse(fs.readFileSync(WALLPAPER_STATE_PATH, "utf8"))?.path;
    if (!prev || !fs.existsSync(prev)) return { ok: false, say: "I do not have your previous wallpaper saved." };
    await setWallpaper(prev);
    return { ok: true, say: "Put your old wallpaper back." };
  } catch (_) {
    return { ok: false, say: "I could not restore the previous wallpaper." };
  }
}

function parseWallpaperIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (!/\b(?:wallpaper|desktop background|background image)\b/i.test(source)) return null;
  if (/^(?:what|which|whats|what'?s)\b/i.test(source)) return null; // a question, not a command
  if (/\b(?:back|previous|restore|undo|old)\b/i.test(source)) return { mode: "restore" };
  if (/\b(?:random|different|new|change|switch|another|surprise)\b/i.test(source)
    && !/\bto\b/i.test(source)) return { mode: "random" };
  // "set my wallpaper to spider man" / "make spider man my wallpaper"
  let subject = source.match(/\bwallpaper\s+to\s+(?:a|an|the\s+)?(.+)$/i)?.[1]
    || source.match(/\bmake\s+(.+?)\s+my\s+(?:wallpaper|desktop background)\b/i)?.[1]
    || source.match(/\bset\s+(.+?)\s+as\s+(?:my\s+)?wallpaper\b/i)?.[1];
  if (subject) return { mode: "web", subject: subject.replace(/^(?:a|an|the)\s+/i, "").trim() };
  return { mode: "random" };
}

// ── Meeting recorder: detect the meeting, offer, record (on-device
// transcription + periodic context screenshots), live notes every 2 min in a
// glass panel, stop → summary synced to the dashboard. The overlay goes
// content-protected while recording — INVISIBLE to screen shares (the
// window never reaches the capture pipeline), fully visible to the user. ──
let meetingState = null; // { startedAt, source, transcript:[{t,text}], notes:[], lastNoteIndex, shots:[], lastShotB64, noteTimer, shotTimer }
let lastMeetingOfferAt = 0;
let meetingSeenUrls = new Set(); // Meet URLs already present — never offered
const meetingAppReadyAt = Date.now();

function meetingDetectFromTabs(tabs) {
  const meetUrls = (tabs || []).map((t) => t.url || "").filter((u) => /meet\.google\.com\/[a-z0-9-]{6,}/i.test(u));
  // A Meet that was already open when Braino started (or during the first
  // ~30s of boot) is NOT a "going into a meeting" moment — record it silently
  // so we never greet the user with a meeting offer at launch.
  if (Date.now() - meetingAppReadyAt < 30 * 1000) {
    meetUrls.forEach((u) => meetingSeenUrls.add(u));
    return;
  }
  if (meetingState || Date.now() - lastMeetingOfferAt < 10 * 60 * 1000) {
    meetUrls.forEach((u) => meetingSeenUrls.add(u));
    return;
  }
  // Offer only for a Meet URL that JUST appeared (a real join), not one that
  // has been sitting open.
  const fresh = meetUrls.find((u) => !meetingSeenUrls.has(u));
  meetUrls.forEach((u) => meetingSeenUrls.add(u));
  if (!fresh) return;
  lastMeetingOfferAt = Date.now();
  setPendingMacWorkflow({ type: "meeting", stage: "meeting_offer", data: { source: "Google Meet" } });
  sendToRenderer("braino-mac:speak-line", { text: "Oh, going into a meeting. Want me to record it and take notes?" });
  logMac("meeting.offer", { url: textForLog(fresh) });
}

function startMeetingRecording(source) {
  if (meetingState) return { ok: true, say: "Already recording. I have not missed a word." };
  meetingState = {
    startedAt: Date.now(),
    source: source || "meeting",
    transcript: [],
    notes: [],
    lastNoteIndex: 0,
    shots: [],
    lastShotB64: "",
    noteTimer: setInterval(() => void meetingLiveNotes(), 2 * 60 * 1000),
    shotTimer: setInterval(() => void meetingSnapshot(), 90 * 1000),
  };
  startLiveCaptions();
  try { dockWindow?.setContentProtection(true); } catch (_) {}
  sendToRenderer("braino-mac:meeting", { action: "start", source: meetingState.source, startedAt: meetingState.startedAt });
  logMac("meeting.start", { source: textForLog(meetingState.source) });
  void meetingSnapshot();
  return { ok: true, say: `Recording. I am listening, taking notes, and this stays invisible if you share your screen.` };
}

async function meetingSnapshot() {
  if (!meetingState) return;
  const shot = await captureScreenBase64();
  if (!shot.ok) return;
  meetingState.lastShotB64 = shot.base64;
  meetingState.shots.push(Date.now());
  logMac("meeting.snapshot", { count: meetingState.shots.length });
}

function meetingTranscriptText(fromIndex = 0) {
  if (!meetingState) return "";
  return meetingState.transcript.slice(fromIndex)
    .map((row) => `[${Math.round((row.t - meetingState.startedAt) / 60000)}m] ${row.text}`)
    .join("\n");
}

async function meetingLiveNotes() {
  if (!meetingState) return;
  const fresh = meetingTranscriptText(meetingState.lastNoteIndex);
  if (!fresh || fresh.length < 60) return;
  const fromIndex = meetingState.transcript.length;
  const authToken = await getBrainoAuthToken();
  if (!authToken) return;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        notes: "",
        chatHistory: [],
        message: `Live meeting notes. Existing bullets:\n${meetingState.notes.join("\n") || "(none yet)"}\n\nNew transcript chunk:\n${fresh}\n\nReturn 1-3 NEW terse bullet points (each starting with "- ") capturing decisions, facts, or action items from the new chunk only. No preamble.`,
        responseMedium: "text",
      }),
    });
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!reply) return;
    const bullets = reply.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("-")).slice(0, 3);
    if (!bullets.length) return;
    meetingState.notes.push(...bullets);
    meetingState.lastNoteIndex = fromIndex;
    sendToRenderer("braino-mac:meeting", { action: "notes", notes: meetingState.notes.slice(-14) });
    logMac("meeting.live_notes", { bullets: bullets.length, totalNotes: meetingState.notes.length });
  } catch (error) {
    logMac("meeting.live_notes.failed", { error });
  }
}

async function stopMeetingRecording() {
  if (!meetingState) return { ok: false, say: "Nothing is being recorded right now." };
  const state = meetingState;
  meetingState = null;
  clearInterval(state.noteTimer);
  clearInterval(state.shotTimer);
  try { dockWindow?.setContentProtection(false); } catch (_) {}
  sendToRenderer("braino-mac:meeting", { action: "stop" });
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  const transcript = state.transcript.map((row) => `[${Math.round((row.t - state.startedAt) / 60000)}m] ${row.text}`).join("\n");
  logMac("meeting.stop", { minutes, transcriptLines: state.transcript.length, notes: state.notes.length });
  if (!transcript) return { ok: true, say: "Stopped. The meeting never produced a word I could hear, so there is nothing to save." };
  sendTaskProgress({ status: "thinking", text: "Writing up the meeting" });
  const authToken = await getBrainoAuthToken();
  let summary = "";
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        notes: "",
        chatHistory: [],
        message: `Summarize this ${minutes}-minute ${state.source} into crisp meeting notes with sections: Summary (2-3 sentences), Key points (bullets), Action items (bullets, or "None"). The screenshot shows the meeting screen for extra context.\n\nLive bullets so far:\n${state.notes.join("\n") || "(none)"}\n\nTranscript:\n${transcript.slice(0, 12000)}`,
        visionMode: state.lastShotB64 ? "describe" : undefined,
        imageBase64: state.lastShotB64 || undefined,
        responseMedium: "text",
      }),
    });
    const data = await response.json().catch(() => ({}));
    summary = String(data?.reply || "").trim();
  } catch (error) {
    logMac("meeting.summary.failed", { error });
  }
  const auth = authStatusPayload();
  const title = `${state.source} — ${new Date(state.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} (${minutes} min)`;
  const body = [summary || "(summary unavailable)", "", "— Full transcript —", transcript].join("\n");
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/notes`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${await getBrainoAuthToken()}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: auth.userId || undefined,
        title: title.slice(0, 120),
        structured_notes: body.slice(0, 60000),
        use_case: "meeting",
        source_title: state.source,
      }),
    });
    if (!response.ok) throw new Error(`notes insert ${response.status}`);
    logMac("meeting.synced", { title: textForLog(title), chars: body.length });
    return { ok: true, say: `Done. ${minutes} minutes recorded, summarized, and synced to your dashboard.` };
  } catch (error) {
    logMac("meeting.sync.failed", { error });
    return { ok: true, say: "Recorded and summarized, but the dashboard sync hiccuped. The notes are safe in my log." };
  }
}

function parseMeetingIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (/\bstop\b.*\brecord/i.test(source) || /\brecord(?:ing)?\b.*\bstop\b/i.test(source)) return { action: "stop" };
  // Meeting = a CALL/MEETING specifically. Bare "record this" / "record my
  // screen" is screen recording, handled separately.
  if (/\brecord\b.*\b(?:this|the)\s+(?:call|meeting|meet)\b/i.test(source)
    || /\brecord\s+(?:the\s+)?(?:call|meeting)\b/i.test(source)) return { action: "start" };
  return null;
}

// ── Screen video recording (Command-Shift-5 equivalent via screencapture). ──
let screenRecProc = null;
let screenRecPath = "";
let screenRecStartedAt = 0;

async function startScreenRecording() {
  if (screenRecProc) return { ok: true, say: "Already rolling. Say stop when you're done." };
  const dir = path.join(os.homedir(), "Desktop");
  screenRecPath = path.join(dir, `Screen Recording ${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.mov`);
  screenRecStartedAt = Date.now();
  // -v = video, -g = capture default-input audio (mic), -x = no sound cue;
  // records until we send SIGINT.
  screenRecProc = spawn("/usr/sbin/screencapture", ["-v", "-g", "-x", screenRecPath], { stdio: "ignore" });
  screenRecProc.on("exit", () => { screenRecProc = null; });
  sendToRenderer("braino-mac:screen-rec", { action: "start", startedAt: screenRecStartedAt });
  logMac("screenrec.start", { path: textForLog(screenRecPath) });
  return { ok: true, say: "Recording your screen with audio. Say stop recording when you're finished." };
}

async function stopScreenRecording() {
  if (!screenRecProc) return { ok: false, say: "Nothing is being screen-recorded right now." };
  const proc = screenRecProc;
  const outPath = screenRecPath;
  const secs = Math.max(1, Math.round((Date.now() - screenRecStartedAt) / 1000));
  try { proc.kill("SIGINT"); } catch (_) {} // SIGINT makes screencapture flush + save
  sendToRenderer("braino-mac:screen-rec", { action: "stop" });
  // Give it a moment to finalize the file, then reveal it.
  await new Promise((r) => setTimeout(r, 1200));
  screenRecProc = null;
  logMac("screenrec.stop", { seconds: secs, path: textForLog(outPath) });
  if (fs.existsSync(outPath)) {
    await execFileP("/usr/bin/open", ["-R", outPath]).catch(() => {});
    const mb = Math.round(fs.statSync(outPath).size / (1024 * 1024));
    return { ok: true, say: `Saved — ${secs} seconds, about ${mb} megabytes, on your Desktop. I opened it in Finder.` };
  }
  return { ok: true, say: `Stopped after ${secs} seconds. The recording is saving to your Desktop.` };
}

async function takeScreenshot() {
  const dir = path.join(os.homedir(), "Desktop");
  const shotPath = path.join(dir, `Screenshot ${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.png`);
  try {
    await execFileP("/usr/sbin/screencapture", ["-x", shotPath], { timeout: 6000 });
    if (!fs.existsSync(shotPath)) throw new Error("no file");
    await execFileP("/usr/bin/open", ["-R", shotPath]).catch(() => {});
    logMac("screenshot.taken", { path: textForLog(shotPath) });
    return { ok: true, say: "Screenshot saved to your Desktop." };
  } catch (error) {
    logMac("screenshot.failed", { error });
    return { ok: false, say: "The screenshot didn't take — check Screen Recording permission." };
  }
}

function parseScreenshotIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  // "take a screenshot" / "take a ss" / "grab a screenshot" / "screenshot this"
  if (/\b(?:take|grab|capture|snap|get)\s+(?:a\s+)?(?:screenshot|screen shot|ss)\b/i.test(source)
    || /\bscreenshot\s+(?:this|it|the screen|my screen)\b/i.test(source)
    || /^(?:screenshot|screen shot)$/i.test(source)) return {};
  return null;
}

function parseScreenRecordIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (screenRecProc && (/\bstop\b.*\brecord/i.test(source) || /\b(?:done|stop)\s+recording\b/i.test(source) || /\bstop\b.*\bscreen\b/i.test(source))) return { action: "stop" };
  if (/\brecord\s+(?:my|the)\s+screen\b/i.test(source)
    || /\bscreen\s*record(?:ing)?\b/i.test(source)
    || /\bstart\s+(?:a\s+)?screen\s+recording\b/i.test(source)
    || /\brecord\s+(?:this|it|my|the)\b(?!\s+(?:call|meeting|meet))/i.test(source)
    || /^record$/i.test(source)) return { action: "start" };
  return null;
}

// TCC lesson learned the hard way: a helper SPAWNED by Electron inherits
// Electron's permission identity, and Electron's plist has no speech key —
// instant kill. Launched via `open` as its own .app, the helper IS its own
// TCC client: it prompts once under "Braino Live Caption" and works forever.
// stdout is lost with `open`, so captions append to a file we tail.
const LIVE_CAPTION_APP_PATH = path.join(__dirname, "native", "bin", "BrainoLiveCaption.app");
const LIVE_CAPTION_APP_BIN = path.join(LIVE_CAPTION_APP_PATH, "Contents", "MacOS", "braino-live-caption");
const LIVE_CAPTION_PLIST_PATH = path.join(__dirname, "native", "BrainoLiveCaption-Info.plist");
const LIVE_CAPTION_OUT_PATH = path.join(AUTH_STORE_DIR, "live-captions.txt");
let liveCaptionTailTimer = null;
let liveCaptionTailOffset = 0;
let liveCaptionRunning = false;

async function ensureLiveCaptionApp() {
  try {
    const sourceStat = fs.statSync(LIVE_CAPTION_HELPER_PATH);
    const binStat = fs.existsSync(LIVE_CAPTION_APP_BIN) ? fs.statSync(LIVE_CAPTION_APP_BIN) : null;
    if (binStat && binStat.mtimeMs >= sourceStat.mtimeMs) return true;
    fs.mkdirSync(path.dirname(LIVE_CAPTION_APP_BIN), { recursive: true });
    fs.copyFileSync(LIVE_CAPTION_PLIST_PATH, path.join(LIVE_CAPTION_APP_PATH, "Contents", "Info.plist"));
    await execFileP("/usr/bin/swiftc", [LIVE_CAPTION_HELPER_PATH, "-o", LIVE_CAPTION_APP_BIN, "-O"], { timeout: 120000 });
    await execFileP("/usr/bin/codesign", ["-s", "-", "-f", "--deep", LIVE_CAPTION_APP_PATH], { timeout: 20000 });
    logMac("caption.app.built", {});
    return true;
  } catch (error) {
    logMac("caption.app.build_failed", { error });
    return fs.existsSync(LIVE_CAPTION_APP_BIN);
  }
}

function tailLiveCaptions() {
  if (liveCaptionTailTimer) return;
  liveCaptionTailOffset = 0;
  liveCaptionTailTimer = setInterval(() => {
    try {
      const stat = fs.statSync(LIVE_CAPTION_OUT_PATH);
      if (stat.size <= liveCaptionTailOffset) return;
      const fd = fs.openSync(LIVE_CAPTION_OUT_PATH, "r");
      const buffer = Buffer.alloc(stat.size - liveCaptionTailOffset);
      fs.readSync(fd, buffer, 0, buffer.length, liveCaptionTailOffset);
      fs.closeSync(fd);
      liveCaptionTailOffset = stat.size;
      for (const line of buffer.toString("utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const sep = trimmed.indexOf("\t");
        const kind = sep < 0 ? trimmed : trimmed.slice(0, sep);
        const text = sep < 0 ? "" : trimmed.slice(sep + 1);
        if (kind === "caption" || kind === "caption-final") {
          sendToRenderer("braino-mac:live-caption", { text, final: kind === "caption-final" });
          if (kind === "caption-final" && meetingState && text.trim()) {
            meetingState.transcript.push({ t: Date.now(), text: text.trim() });
            sendToRenderer("braino-mac:meeting", { action: "transcript", text: text.trim() });
          }
        } else if (kind === "unavailable") {
          logMac("caption.helper.unavailable", { reason: textForLog(text) });
        } else if (kind === "caption-ready") {
          logMac("caption.helper.ready", {});
        }
      }
    } catch (_) {}
  }, 120);
}

function startLiveCaptions() {
  if (liveCaptionRunning) return;
  liveCaptionRunning = true;
  void (async () => {
    if (!(await ensureLiveCaptionApp())) { liveCaptionRunning = false; return; }
    try {
      try { fs.writeFileSync(LIVE_CAPTION_OUT_PATH, ""); } catch (_) {}
      await execFileP("/usr/bin/open", ["-g", "-a", LIVE_CAPTION_APP_PATH, "--args", "--out", LIVE_CAPTION_OUT_PATH, "--parent", String(process.pid)], { timeout: 15000 });
      tailLiveCaptions();
      logMac("caption.helper.start", { via: "open-app" });
    } catch (error) {
      liveCaptionRunning = false;
      logMac("caption.helper.launch_failed", { error });
    }
  })();
}

function stopLiveCaptions() {
  if (!liveCaptionRunning) return;
  liveCaptionRunning = false;
  if (liveCaptionTailTimer) { clearInterval(liveCaptionTailTimer); liveCaptionTailTimer = null; }
  execFileP("/usr/bin/pkill", ["-f", "braino-live-caption"], { timeout: 5000 }).catch(() => {});
  logMac("caption.helper.stop", {});
}

ipcMain.on("braino-mac:live-captions", (_event, on) => {
  if (on) startLiveCaptions();
  else stopLiveCaptions();
});

// ── X (@brainosays): stats, mentions, clip-and-tweet — thin voice layers
// over the existing edge functions (x-status, x-post-media, dispatch). ──
let lastXStats = null; // { followers, delta7d, at }
let lastClip = null; // { path, at, seconds }
let xPollTimer = null;

async function fetchXStatus() {
  const authToken = await getBrainoAuthToken();
  if (!authToken) return null;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/x-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `x-status ${response.status}`);
    return data;
  } catch (error) {
    logMac("x.status.failed", { error });
    return null;
  }
}

async function pollXStats() {
  const status = await fetchXStatus();
  if (!status?.connected || status.followers?.count == null) return;
  lastXStats = { followers: status.followers.count, delta7d: status.followers.delta7d ?? null, at: Date.now() };
  sendToRenderer("braino-mac:x-stats", lastXStats);
  logMac("x.stats", { followers: lastXStats.followers, delta7d: lastXStats.delta7d });
}

function startXStatsPolling() {
  // X's free tier caps users/me at ~25 calls/DAY — a 45-minute poll was
  // eating the whole budget and starving manual asks with 429s. Four ambient
  // polls a day leaves headroom for the user actually asking.
  if (xPollTimer) clearInterval(xPollTimer);
  setTimeout(() => void pollXStats(), 2 * 60 * 1000);
  xPollTimer = setInterval(() => void pollXStats(), 6 * 60 * 60 * 1000);
}

async function fetchLatestFollowerSnapshot() {
  const authToken = await getBrainoAuthToken();
  if (!authToken) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/x_follower_snapshots?select=captured_on,followers_count&order=captured_on.desc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` } },
    );
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || !rows.length) return null;
    return { capturedOn: rows[0].captured_on, followers: rows[0].followers_count };
  } catch (_) {
    return null;
  }
}

async function speakXStats() {
  sendTaskProgress({ status: "thinking", text: "Checking the X account" });
  const status = await fetchXStatus();
  if (!status) return { ok: false, say: "I could not reach X just now." };
  if (!status.connected) return { ok: false, say: "The X account is not linked — connect it on the dashboard and I will keep the pulse." };
  // The numbers belong in the island, not just in his mouth.
  sendToRenderer("braino-mac:x-stats", {
    followers: status.followers?.count ?? null,
    delta7d: status.followers?.delta7d ?? null,
    mentions: status.mentions?.length ?? 0,
    likes: status.lastTweet?.likes ?? null,
    replies: status.lastTweet?.replies ?? null,
    panel: true,
  });
  const parts = [];
  if (status.followers?.count != null) {
    const delta = status.followers.delta7d;
    parts.push(`You are at ${status.followers.count} followers${delta != null && delta !== 0 ? `, ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} this week` : ""}.`);
  }
  if (status.lastTweet) {
    parts.push(`The last tweet has ${status.lastTweet.likes ?? 0} likes and ${status.lastTweet.replies ?? 0} replies.`);
  }
  if (status.mentions?.length) {
    parts.push(`${status.mentions.length} recent mention${status.mentions.length > 1 ? "s" : ""} — ask me for mentions and I will read them.`);
  }
  if (!parts.length) {
    // Live calls rate-limited — fall back to the newest daily snapshot so he
    // still answers with a REAL number instead of shrugging.
    const snapshot = await fetchLatestFollowerSnapshot();
    if (snapshot?.followers != null) {
      sendToRenderer("braino-mac:x-stats", { followers: snapshot.followers, delta7d: null, mentions: 0, likes: null, panel: true });
      const when = new Date(snapshot.capturedOn).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      logMac("x.stats.snapshot_fallback", { followers: snapshot.followers, capturedOn: snapshot.capturedOn });
      return { ok: true, say: `X is rate-limiting live numbers right now, but as of ${when} you have ${snapshot.followers} followers. Fresh numbers when their meter resets.` };
    }
    parts.push("Connected, but X is rate-limiting the numbers right now. Ask me again in a bit.");
  }
  return { ok: true, say: parts.join(" ") };
}

async function speakXMentions() {
  sendTaskProgress({ status: "thinking", text: "Reading X mentions" });
  const status = await fetchXStatus();
  if (!status?.connected) return { ok: false, say: "The X account is not linked yet." };
  const mentions = status.mentions || [];
  if (!mentions.length) return { ok: true, say: "No fresh mentions. Quiet on the timeline." };
  const spoken = mentions.slice(0, 3).map((m) => `${m.handle} says: ${String(m.text || "").replace(/https?:\/\/\S+/g, "").slice(0, 140)}`).join(". Next. ");
  return { ok: true, say: `${mentions.length} mention${mentions.length > 1 ? "s" : ""}. ${spoken}` };
}

function parseXIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  // Voice transcribes "X" as "ex" constantly — "my ex account" is the bird
  // app, not a former partner. Treat ex/X/twitter as one token here.
  const X_WORD = "(?:x|ex|twitter)";
  if (/\b(?:any\s+)?mentions\b/i.test(source) || new RegExp(`\\bwho(?:'s| is)? (?:talking|replying)\\b.*\\b${X_WORD}\\b`, "i").test(source)) return { action: "mentions" };
  if (new RegExp(`\\b(?:how(?:'s| is| are)?|hows)\\b.*\\b${X_WORD}(?:\\s+account)?\\b.*\\b(?:doing|going|performing|looking)\\b`, "i").test(source)
    || new RegExp(`\\b(?:how(?:'s| is| are)?|hows)\\b.*\\b(?:${X_WORD}\\s+account|twitter|followers?)\\b`, "i").test(source)
    || new RegExp(`\\b${X_WORD}\\b.*\\b(?:stats|doing|numbers|followers?)\\b`, "i").test(source)
    || /\bfollower (?:count|numbers?)\b/i.test(source)) return { action: "stats" };
  const clipMatch = source.match(/\b(?:record|take|grab|start)\s+(?:a\s+)?clip(?:\s+(?:of|for)\s+(\d{1,2})\s*seconds?)?/i);
  if (clipMatch) return { action: "clip", seconds: Math.min(60, Math.max(5, Number(clipMatch[1]) || 15)) };
  const tweetClip = source.match(/\b(?:tweet|post)\s+(?:it|the clip|that)\s+(?:saying|with caption|with the caption|captioned)\s+(.+)$/i);
  if (tweetClip) return { action: "tweet_clip", caption: tweetClip[1].trim() };
  return null;
}

async function recordScreenClip(seconds) {
  const dir = path.join(AUTH_STORE_DIR, "clips");
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  const clipPath = path.join(dir, `clip-${Date.now()}.mp4`);
  sendTaskProgress({ status: "thinking", text: `Recording ${seconds}s of screen` });
  try {
    await execFileP("/usr/sbin/screencapture", ["-x", "-v", "-V", String(seconds), clipPath], { timeout: (seconds + 20) * 1000 });
    if (!fs.existsSync(clipPath)) throw new Error("no clip file");
    const mb = Math.round(fs.statSync(clipPath).size / (1024 * 1024));
    lastClip = { path: clipPath, at: Date.now(), seconds };
    logMac("x.clip.recorded", { seconds, mb });
    return { ok: true, say: `Clip is in the can, ${seconds} seconds. Say tweet it saying, and then your caption.` };
  } catch (error) {
    logMac("x.clip.failed", { error });
    return { ok: false, say: "The recording did not take. Screen Recording permission may need a look." };
  }
}

async function tweetLastClip(caption) {
  if (!lastClip || Date.now() - lastClip.at > 30 * 60 * 1000) {
    return { ok: false, say: "There is no fresh clip. Say record a clip first." };
  }
  if (!caption) return { ok: false, say: "Give me the caption — tweet it saying, then your words." };
  setPendingMacWorkflow({ type: "xclip", stage: "xclip_confirm", data: { caption } });
  return { ok: true, say: `Caption reads: ${caption}. Ship it to X?` };
}

async function postClipToX(caption) {
  const authToken = await getBrainoAuthToken();
  if (!authToken) return { ok: false, say: "I am not signed in enough to post." };
  const base = SUPABASE_URL.replace(/\/$/, "");
  sendTaskProgress({ status: "thinking", text: "Uploading the clip" });
  try {
    const bytes = fs.readFileSync(lastClip.path);
    const objectPath = `mac-clips/${path.basename(lastClip.path)}`;
    const uploadResponse = await fetch(`${base}/storage/v1/object/x-post-media/${objectPath}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "video/mp4",
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!uploadResponse.ok) throw new Error(`storage upload ${uploadResponse.status}`);
    const mediaUrl = `${base}/storage/v1/object/public/x-post-media/${objectPath}`;
    const auth = authStatusPayload();
    sendTaskProgress({ status: "thinking", text: "Posting to X" });
    const insertResponse = await fetch(`${base}/rest/v1/scheduled_x_posts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: auth?.userId || undefined,
        content: caption,
        scheduled_at: new Date().toISOString(),
        media_url: mediaUrl,
        thread_mode: false,
      }),
    });
    const inserted = await insertResponse.json().catch(() => null);
    if (!insertResponse.ok) throw new Error(`insert ${insertResponse.status}: ${JSON.stringify(inserted)?.slice(0, 120)}`);
    const dispatchResponse = await fetch(`${base}/functions/v1/dispatch-scheduled-x-posts`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const dispatched = await dispatchResponse.json().catch(() => ({}));
    logMac("x.clip.posted", { caption: textForLog(caption), posted: dispatched?.posted, failed: dispatched?.failed });
    if (dispatched?.posted >= 1) return { ok: true, say: "It is live on X. Clip and all." };
    if (dispatched?.failed >= 1) return { ok: false, say: "The post reached the queue but X rejected it — video uploads can be picky. It will retry from the dashboard." };
    return { ok: true, say: "Queued for X — it will fire on the next dispatch pass." };
  } catch (error) {
    logMac("x.clip.post_failed", { error });
    return { ok: false, say: "Posting stumbled. The clip is safe, try tweet it again." };
  }
}

// ── Accessibility hands: press buttons, manage windows, act on selection. ──
async function runAxHelper(args, timeout = 15000) {
  try {
    const { stdout } = await execFileP("/usr/bin/xcrun", ["swift", AX_HELPER_PATH, ...args], { timeout });
    const line = String(stdout || "").trim().split("\n")[0] || "";
    const sep = line.indexOf("\t");
    return sep < 0 ? { status: line, detail: "" } : { status: line.slice(0, sep), detail: line.slice(sep + 1) };
  } catch (error) {
    logMac("ax.helper_failed", { args: args[0], error });
    return { status: "error", detail: error?.message || "helper failed" };
  }
}

function parseAxClickIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  // Bare shopping actions with no click verb — "add to cart", "buy now".
  if (/^(?:add (?:this |it )?to (?:the )?cart|buy now|proceed to (?:buy|checkout)|place (?:the |your )?order|checkout)$/i.test(source)) {
    return { target: source.replace(/^(?:add (?:this |it )?to (?:the )?cart)$/i, "add to cart") };
  }
  // Match the click verb ANYWHERE, not just at the start — "now click on
  // proceed to buy", "look at the screen and click the yellow button".
  const match = source.match(/\b(?:click|press|tap|hit|select|choose)\s+(?:on\s+)?(?:the\s+)?(.+)$/i);
  if (!match) return null;
  // Trim trailing chrome: "button", "link", "for me", "on the screen/page".
  let target = match[1]
    .replace(/\s+(?:button|link|option|listing)\b/i, "")
    .replace(/\s+(?:for me|please|now)\b.*$/i, "")
    .replace(/\s+on (?:the\s+)?(?:screen|page)\b.*$/i, "")
    .trim();
  // "click it/that/there" right after he pointed at something.
  if (/^(?:it|that|there|this|on it)$/i.test(target)) return { target: "", clickLastPointed: true };
  if (target.length < 2) return null;
  // Media-control words stay with the music intents.
  if (/^(?:play|pause|stop|next|previous|skip)$/i.test(target)) return null;
  // Ordinals into the vision-clicker as-is ("the second one").
  return { target };
}

async function axClick({ target, clickLastPointed }) {
  if (clickLastPointed) {
    if (!lastPointedAt || Date.now() - lastPointedAt.at > 2 * 60 * 1000) {
      return { ok: false, say: "Point me at something first — say show me where it is, then click it." };
    }
    const clicked = await clickAtNormalized(lastPointedAt.x, lastPointedAt.y, lastPointedAt.label);
    return clicked
      ? { ok: true, say: `Clicked the ${lastPointedAt.label}.` }
      : { ok: false, say: "The click did not land. Try once more." };
  }
  sendTaskProgress({ status: "thinking", text: `Looking for "${target}" to click` });
  const result = await runAxHelper(["press", target]);
  logMac("ax.press", { target: textForLog(target), status: result.status, detail: textForLog(result.detail) });
  if (result.status === "pressed") return { ok: true, say: `Clicked ${result.detail}.` };
  if (result.status === "ambiguous") {
    const options = result.detail.split("|").filter(Boolean).slice(0, 3).join(", or ");
    return { ok: true, say: `I see a few: ${options}. Which one?` };
  }
  if (result.status === "needs-accessibility") {
    return { ok: false, say: "I need Accessibility permission for that — it should already be on for my hotkeys, check System Settings." };
  }
  // AX came up dry (blind tree, canvas UI, web content) — find it with VISION
  // and land a real mouse click. This is what makes the clicker universal.
  sendTaskProgress({ status: "thinking", text: `Eyes on: finding ${target}` });
  const pointed = await runScreenPoint(target, `click ${target}`);
  if (lastPointedAt && Date.now() - lastPointedAt.at < 15000) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const clicked = await clickAtNormalized(lastPointedAt.x, lastPointedAt.y, lastPointedAt.label);
    if (clicked) return { ok: true, say: `Clicked the ${lastPointedAt.label}.` };
  }
  if (pointed?.ok) return { ok: true, say: `I can see ${target} but the click did not land. Say click it to retry.` };
  return { ok: false, say: `I could not find ${target} on this screen.` };
}

function parseWindowManageIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  let action = null;
  if (/\bmaximi[sz]e\b|\bfull\s*screen\b/i.test(source)) action = "maximize";
  else if (/\bminimi[sz]e\b/i.test(source)) action = "minimize";
  else if (/\bcent(?:er|re)\b.*\bwindow\b|\bwindow\b.*\bcent(?:er|re)\b/i.test(source)) action = "center";
  else if (/\b(?:left|right)\s+half\b/i.test(source) || /\b(?:snap|put|move)\b.*\b(?:to\s+the\s+)?(?:left|right)\b/i.test(source)) {
    action = /\bleft\b/i.test(source) ? "left" : "right";
  }
  if (!action) return null;
  // Needs to be about a window/app — not "minimize the risk" in dictation.
  const appMatch = source.match(/\b(?:maximi[sz]e|minimi[sz]e|snap|put|move|cent(?:er|re))\s+(?!the\s+window|this|that|it\b)(?:the\s+)?([a-z][a-z ]{1,24}?)(?:\s+(?:window|app))?(?:\s+(?:on|to|in)\b|$)/i);
  let appQuery = "front";
  if (appMatch?.[1] && !/^(?:window|screen|this|that|it|left|right)$/i.test(appMatch[1].trim())) {
    const candidate = appMatch[1].trim();
    // Real app names are short — "risk of failure" is dictation, not an app.
    if (candidate.split(/\s+/).length > 2) return null;
    appQuery = candidate;
  }
  if (appQuery === "front" && !/\bwindow\b|\bscreen\b|\bthis\b|\bit\b|\bchrome|safari|cursor|spotify|whatsapp|finder|notes\b/i.test(source)) return null;
  return { action, appQuery };
}

async function axManageWindow({ action, appQuery }) {
  sendTaskProgress({ status: "thinking", text: `Window: ${action}${appQuery !== "front" ? ` ${appQuery}` : ""}` });
  const result = await runAxHelper(["window", action, appQuery]);
  logMac("ax.window", { action, appQuery: textForLog(appQuery), status: result.status, detail: textForLog(result.detail) });
  if (result.status === "done") {
    const label = { left: "on the left half", right: "on the right half", maximize: "maximized", minimize: "minimized", center: "centered" }[action] || action;
    return { ok: true, say: appQuery === "front" ? `Done, ${label}.` : `${appQuery} is ${label}.` };
  }
  if (result.status === "needs-accessibility") return { ok: false, say: "I need Accessibility permission to move windows." };
  return { ok: false, say: appQuery === "front" ? "I could not grab that window." : `I do not see ${appQuery} running with a window.` };
}

function parseSelectedTextIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (!/\b(?:selection|selected|highlighted|what i (?:have |just )?(?:selected|highlighted)|this (?:sentence|text|paragraph|line|word|bit|message|email))\b/i.test(source)) return null;
  const verb = source.match(/\b(read|fix|correct|improve|rewrite|rephrase|polish|shorten|expand|translate|summari[sz]e|explain)\b/i)?.[1]?.toLowerCase();
  if (!verb) return null;
  if (verb === "read") return { verb: "read", language: "", speakOnly: true };
  const language = source.match(/\btranslate\b.*?\b(?:to|into)\s+([a-z]+)\b/i)?.[1] || "";
  const speakOnly = /^summari|^explain/.test(verb);
  return { verb, language, speakOnly };
}

async function readSelectionViaCopy() {
  // Universal fallback: Cmd+C into the clipboard. Works everywhere a human
  // can copy, including web content where the AX tree is blind.
  const before = clipboard.readText();
  try {
    await execFileP("/usr/bin/osascript", ["-e", 'tell application "System Events" to keystroke "c" using command down'], { timeout: 4000 });
  } catch (_) { return ""; }
  await new Promise((resolve) => setTimeout(resolve, 400));
  const after = clipboard.readText();
  return after && after !== before ? after : "";
}

async function actOnSelectedText({ verb, language, speakOnly }) {
  sendTaskProgress({ status: "thinking", text: "Reading your selection" });
  const grabbed = await runAxHelper(["selected"]);
  let text = grabbed.status === "selected" && grabbed.detail
    ? Buffer.from(grabbed.detail, "base64").toString("utf8")
    : "";
  let viaCopy = false;
  if (!text.trim()) {
    text = await readSelectionViaCopy();
    viaCopy = true;
    logMac("ax.selection.copy_fallback", { got: Boolean(text.trim()) });
  }
  if (!text.trim()) {
    return { ok: false, say: "I do not see any text selected. Highlight it and ask again." };
  }
  if (verb === "read") {
    const spoken = text.trim().slice(0, 900);
    return { ok: true, say: spoken.length < text.trim().length ? `${spoken}... and it goes on.` : spoken };
  }
  const instruction = verb === "translate"
    ? `Translate the following text into ${language || "English"}.`
    : speakOnly
      ? `${verb === "explain" ? "Explain" : "Summarize"} the following text, briefly, for voice.`
      : `${verb.charAt(0).toUpperCase()}${verb.slice(1)} the following text. Keep the original meaning, tone appropriate, same language unless asked otherwise.`;
  const message = [
    instruction,
    speakOnly ? "" : "Return ONLY the replacement text — no preamble, no quotes, no markdown.",
    "---",
    text.slice(0, 6000),
  ].filter(Boolean).join("\n");
  sendTaskProgress({ status: "thinking", text: `${verb} ${text.length} chars` });
  const authToken = await getBrainoAuthToken();
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ notes: "", message, chatHistory: [], responseMedium: speakOnly ? "voice" : "text" }),
    });
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!response.ok || !reply) throw new Error(data?.error || `selection ${verb} failed (${response.status})`);
    if (speakOnly) return { ok: true, say: reply };
    if (!viaCopy) {
      const replaced = await runAxHelper(["replace", Buffer.from(reply, "utf8").toString("base64")]);
      logMac("ax.selection", { verb, chars: text.length, replyChars: reply.length, replaced: replaced.status });
      if (replaced.status === "replaced") return { ok: true, say: "Done, swapped in." };
    }
    // Paste over the still-highlighted selection — the universal write path.
    clipboard.writeText(reply);
    try {
      await execFileP("/usr/bin/osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down'], { timeout: 4000 });
      logMac("ax.selection.paste_fallback", { verb, replyChars: reply.length });
      return { ok: true, say: "Done, swapped in." };
    } catch (_) {
      return { ok: true, say: "It is on your clipboard — just paste." };
    }
  } catch (error) {
    logMac("ax.selection.failed", { verb, error });
    return { ok: false, say: "That did not go through. Try once more." };
  }
}

function parseTouchIdTestIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  return /\b(?:verify|confirm|authenticate)\b.*\b(?:it'?s me|its me|my identity|me)\b/i.test(source)
    || /\btouch\s*id\b/i.test(source);
}

// ══ Time suite: timers, ALARMS (wall-clock, persisted across restarts),
// STOPWATCH, time/date queries. The notch is the clock face for all of it. ══

const TIMERS_STORE_PATH = path.join(AUTH_STORE_DIR, "timers.json");

function persistTimers() {
  try {
    fs.writeFileSync(TIMERS_STORE_PATH, JSON.stringify(
      activeTimers.map(({ id, label, endAt, kind }) => ({ id, label, endAt, kind: kind || "timer" })),
    ));
  } catch (_) {}
}

// Alarms must survive an app restart — re-arm everything still in the future.
function restoreTimers() {
  try {
    const saved = JSON.parse(fs.readFileSync(TIMERS_STORE_PATH, "utf8"));
    const now = Date.now();
    for (const t of Array.isArray(saved) ? saved : []) {
      if (!t?.endAt || t.endAt <= now + 2000 || !t?.label) continue;
      armTimer({ id: t.id || crypto.randomUUID(), label: String(t.label), endAt: Number(t.endAt), kind: t.kind === "alarm" ? "alarm" : "timer" });
    }
    if (activeTimers.length) logMac("timers.restored", { count: activeTimers.length });
    broadcastTimers();
  } catch (_) {}
}

let lastFiredAlarm = null; // { label, at } — snooze/dismiss window

function fireTimer(timer) {
  activeTimers = activeTimers.filter((t) => t.id !== timer.id);
  broadcastTimers();
  sendToRenderer("braino-mac:timer-fired", { id: timer.id, label: timer.label, kind: timer.kind || "timer" });
  if (timer.kind === "alarm") {
    lastFiredAlarm = { label: timer.label, at: Date.now() };
    const clock = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    sendToRenderer("braino-mac:speak-line", { text: `It's ${clock}. ${timer.label && timer.label !== "alarm" ? `${timer.label}.` : "Alarm."} Say snooze or tap the notch to stop.` });
  } else {
    sendToRenderer("braino-mac:speak-line", { text: `Reminder. ${timer.label}.` });
  }
  logMac("timer.fired", { kind: timer.kind || "timer", label: textForLog(timer.label) });
}

function armTimer(timer) {
  activeTimers.push(timer);
  timer.handle = setTimeout(() => fireTimer(timer), Math.max(250, timer.endAt - Date.now()));
}

function parseReminderIntent(raw) {
  const source = cleanPrompt(String(raw || ""))
    .replace(/[?.!]+\s*$/, "")
    // Spoken durations arrive as words; normalize the idioms first.
    .replace(/\bhalf\s+an?\s+hour\b/gi, "30 minutes")
    .replace(/\ban?\s+hour\s+and\s+a\s+half\b/gi, "90 minutes")
    .replace(/\bquarter\s+of\s+an?\s+hour\b/gi, "15 minutes");
  if (/\b(?:cancel|stop|clear|remove)\b.*\b(?:timer|reminder|countdown)s?\b/i.test(source)) return { cancel: true };
  let match = source.match(new RegExp(`\\b(?:set\\s+)?(?:a\\s+)?(?:timer|reminder|countdown)\\s+(?:for\\s+|in\\s+|of\\s+)?${AMOUNT_RE}\\s*${UNIT_RE}\\b(?:\\s+(?:for|to|about|called)\\s+(.+))?$`, "i"));
  if (match) {
    const seconds = reminderSeconds(match[1], match[2]);
    if (seconds) return { seconds, label: (match[3] || "timer").trim() };
  }
  match = source.match(new RegExp(`\\bremind\\s+me\\s+in\\s+${AMOUNT_RE}\\s*${UNIT_RE}\\s+(?:to\\s+|about\\s+|that\\s+)?(.+)$`, "i"));
  if (match) {
    const seconds = reminderSeconds(match[1], match[2]);
    if (seconds) return { seconds, label: match[3].trim() };
  }
  match = source.match(new RegExp(`\\bremind\\s+me\\s+(?:to\\s+|about\\s+)?(.+?)\\s+in\\s+${AMOUNT_RE}\\s*${UNIT_RE}$`, "i"));
  if (match) {
    const seconds = reminderSeconds(match[2], match[3]);
    if (seconds) return { seconds, label: match[1].trim() };
  }
  return null;
}

function startReminder(seconds, label) {
  const clamped = Math.min(12 * 3600, Math.max(5, seconds));
  const timer = {
    id: crypto.randomUUID(),
    kind: "timer",
    label: String(label || "timer").slice(0, 28),
    endAt: Date.now() + clamped * 1000,
  };
  armTimer(timer);
  broadcastTimers();
  logMac("reminder.set", { label: textForLog(timer.label), seconds: clamped });
  const minutes = Math.round(clamped / 60);
  return {
    ok: true,
    say: clamped < 90
      ? `Done. ${clamped} seconds on the clock for ${timer.label}.`
      : `Done. I will remind you about ${timer.label} in ${minutes} minute${minutes === 1 ? "" : "s"}. It is counting in the notch.`,
  };
}

// ── Alarms: absolute wall-clock time ──
// "7", "7:30", "7 30 pm", "7.30am"; noon/midnight normalized upstream.
const CLOCK_RE = "(\\d{1,2})(?:[:. ](\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?";

function nextClockFire(hourRaw, minuteRaw, meridiem) {
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);
  if (!Number.isFinite(hour) || hour > 23 || minute > 59) return null;
  const now = new Date();
  const mk = (h) => {
    const d = new Date(now);
    d.setHours(h, minute, 0, 0);
    if (d.getTime() <= now.getTime() + 5000) d.setDate(d.getDate() + 1);
    return d;
  };
  if (meridiem) {
    const pm = /p/i.test(meridiem);
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
    return mk(hour);
  }
  if (hour === 0 || hour >= 13) return mk(hour);
  // No am/pm spoken: the NEAREST future interpretation wins ("alarm at 7"
  // said at 3pm means 7pm tonight, said at 10pm means 7am tomorrow).
  const a = mk(hour % 12);
  const b = mk((hour % 12) + 12);
  return a.getTime() <= b.getTime() ? a : b;
}

function parseAlarmIntent(raw) {
  const source = cleanPrompt(String(raw || ""))
    .replace(/[?.!]+\s*$/, "")
    .replace(/\bnoon\b/gi, "12:00 pm")
    .replace(/\bmidnight\b/gi, "12:00 am")
    .replace(/\bhalf\s+past\s+(\d{1,2})\b/gi, "$1:30");
  if (/\bcancel\b.*\balarms?\b|\balarms?\b.*\bcancel\b/i.test(source)) return { cancel: true };
  let m = source.match(new RegExp(`\\b(?:set\\s+)?(?:an?\\s+)?alarm\\s+(?:for|at)\\s+${CLOCK_RE}(?:\\s+(?:for|to|about|called)\\s+(.+))?$`, "i"));
  if (m) {
    const fire = nextClockFire(m[1], m[2], m[3]);
    if (fire) return { fireAt: fire.getTime(), label: (m[4] || "alarm").trim() };
  }
  m = source.match(new RegExp(`\\bwake\\s+me(?:\\s+up)?\\s+at\\s+${CLOCK_RE}\\b`, "i"));
  if (m) {
    const fire = nextClockFire(m[1], m[2], m[3]);
    if (fire) return { fireAt: fire.getTime(), label: "wake up" };
  }
  m = source.match(new RegExp(`\\bremind\\s+me\\s+at\\s+${CLOCK_RE}\\s+(?:to\\s+|about\\s+|that\\s+)?(.+)$`, "i"));
  if (m) {
    const fire = nextClockFire(m[1], m[2], m[3]);
    if (fire) return { fireAt: fire.getTime(), label: m[4].trim() };
  }
  return null;
}

function startAlarm(fireAt, label) {
  const timer = {
    id: crypto.randomUUID(),
    kind: "alarm",
    label: String(label || "alarm").slice(0, 28),
    endAt: fireAt,
  };
  armTimer(timer);
  broadcastTimers();
  const when = new Date(fireAt);
  const clock = when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const tomorrow = when.getDate() !== new Date().getDate();
  logMac("alarm.set", { label: textForLog(timer.label), fireAt, clock });
  return { ok: true, say: `Alarm set for ${clock}${tomorrow ? " tomorrow" : ""}${timer.label && timer.label !== "alarm" ? `, ${timer.label}` : ""}. It is on the notch.` };
}

// "snooze" / "stop the alarm": within the post-fire window they control the
// RINGING alarm; otherwise "turn off the alarm" cancels the pending ones.
function parseAlarmControlIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (/^snooze$|\bsnooze\b/i.test(source)) return { snooze: true };
  if (/\b(?:stop|dismiss|turn off|shut (?:up|off)|silence|kill)\b.*\balarms?\b|\balarms?\s+off\b/i.test(source)) return { dismiss: true };
  return null;
}

function handleAlarmControl(intent) {
  const ringing = lastFiredAlarm && Date.now() - lastFiredAlarm.at < 2 * 60 * 1000;
  if (intent.snooze) {
    if (!lastFiredAlarm || Date.now() - lastFiredAlarm.at > 10 * 60 * 1000) {
      return { ok: true, say: "Nothing to snooze right now." };
    }
    sendToRenderer("braino-mac:alarm-dismiss", {});
    const result = startAlarm(Date.now() + 9 * 60 * 1000, lastFiredAlarm.label);
    logMac("alarm.snoozed", { label: textForLog(lastFiredAlarm.label) });
    return { ok: true, say: "Snoozed. Nine minutes." };
  }
  if (ringing) {
    sendToRenderer("braino-mac:alarm-dismiss", {});
    return { ok: true, say: "Alarm off." };
  }
  return cancelReminders("alarm");
}

// ── Stopwatch ──
let stopwatch = null; // { running, startedAt, accumMs }

function stopwatchElapsedMs() {
  if (!stopwatch) return 0;
  return stopwatch.accumMs + (stopwatch.running ? Date.now() - stopwatch.startedAt : 0);
}

function fmtStopwatch(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function spokenStopwatch(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  if (!m) return `${sec} second${sec === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"} ${sec} second${sec === 1 ? "" : "s"}`;
}

function broadcastStopwatch() {
  sendToRenderer("braino-mac:stopwatch", stopwatch
    ? { on: true, running: stopwatch.running, accumMs: stopwatch.accumMs, startedAt: stopwatch.startedAt }
    : { on: false, running: false, accumMs: 0, startedAt: 0 });
}

function parseStopwatchIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (!/\bstop\s*watch\b/i.test(source)) return null;
  if (/\brestart\b/i.test(source)) return { action: "restart" };
  if (/\b(?:reset|clear|zero)\b/i.test(source)) return { action: "reset" };
  if (/\b(?:pause|stop|hold|halt)\b/i.test(source)) return { action: "pause" };
  if (/\b(?:resume|continue|unpause|keep going)\b/i.test(source)) return { action: "resume" };
  if (/\b(?:what|how long|how much|where|reading|check|at)\b/i.test(source)) return { action: "read" };
  return { action: "start" };
}

function handleStopwatch(intent) {
  const action = intent?.action || "";
  const elapsed = stopwatchElapsedMs();
  if (action === "start" || action === "restart") {
    stopwatch = { running: true, startedAt: Date.now(), accumMs: 0 };
    broadcastStopwatch();
    logMac("stopwatch", { action });
    return { ok: true, say: action === "restart" ? "Stopwatch restarted from zero." : "Stopwatch running. It is counting in the notch." };
  }
  if (!stopwatch) return { ok: true, say: "No stopwatch running. Say start a stopwatch." };
  if (action === "pause") {
    if (stopwatch.running) stopwatch = { running: false, startedAt: 0, accumMs: elapsed };
    broadcastStopwatch();
    logMac("stopwatch", { action, elapsed });
    return { ok: true, say: `Stopped at ${spokenStopwatch(elapsed)}.` };
  }
  if (action === "resume") {
    if (!stopwatch.running) stopwatch = { running: true, startedAt: Date.now(), accumMs: stopwatch.accumMs };
    broadcastStopwatch();
    return { ok: true, say: "Stopwatch running again." };
  }
  if (action === "reset") {
    stopwatch = null;
    broadcastStopwatch();
    logMac("stopwatch", { action });
    return { ok: true, say: "Stopwatch cleared." };
  }
  return { ok: true, say: `${spokenStopwatch(elapsed)}${stopwatch.running ? ", still counting" : ", paused"}.` };
}

// ── "what time is it" / "what's the date" — he knows the Mac's clock ──
function parseTimeQueryIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  if (/\bwhat\s+time\s+is\s+it\b|\bwhat(?:'s| is)\s+the\s+time\b|\bcurrent\s+time\b|\btime\s+right\s+now\b|\btell\s+me\s+the\s+time\b/i.test(source)) return { time: true };
  if (/\bwhat(?:'s| is)\s+(?:the\s+|today'?s\s+)?date\b|\bwhat\s+day\s+is\s+(?:it|today)\b|\btoday'?s\s+date\b/i.test(source)) return { date: true };
  return null;
}

function answerTimeQuery(intent) {
  const now = new Date();
  if (intent.time) {
    return { ok: true, say: `It's ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` };
  }
  return { ok: true, say: `It's ${now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}.` };
}

function cancelReminders(kind) {
  const doomed = kind ? activeTimers.filter((t) => (t.kind || "timer") === kind) : activeTimers;
  for (const timer of doomed) clearTimeout(timer.handle);
  activeTimers = kind ? activeTimers.filter((t) => (t.kind || "timer") !== kind) : [];
  broadcastTimers();
  logMac("reminder.cancelled", { count: doomed.length, kind: kind || "all" });
  const noun = kind === "alarm" ? "alarm" : "timer";
  return { ok: true, say: doomed.length ? `Cancelled ${doomed.length === 1 ? `the ${noun}` : `${doomed.length} ${noun}s`}. The notch is clear.` : "There was nothing running." };
}

async function checkCalendarNext() {
  const swiftSource = [
    "import EventKit",
    "import Foundation",
    "let store = EKEventStore()",
    "let sem = DispatchSemaphore(value: 0)",
    "var granted = false",
    "if #available(macOS 14.0, *) {",
    "  store.requestFullAccessToEvents { g, _ in granted = g; sem.signal() }",
    "} else {",
    "  store.requestAccess(to: .event) { g, _ in granted = g; sem.signal() }",
    "}",
    "sem.wait()",
    "if granted {",
    "  let start = Date(); let end = start.addingTimeInterval(24*3600)",
    "  let pred = store.predicateForEvents(withStart: start, end: end, calendars: nil)",
    "  let events = store.events(matching: pred).filter { !$0.isAllDay }.sorted { $0.startDate < $1.startDate }",
    "  if let e = events.first {",
    "    let clean: (String?) -> String = { ($0 ?? \"\").replacingOccurrences(of: \"\\t\", with: \" \").replacingOccurrences(of: \"\\n\", with: \" \") }",
    "    let blob = [e.url?.absoluteString ?? \"\", clean(e.location), String(clean(e.notes).prefix(600))].joined(separator: \" \")",
    "    print(\"\\(Int(e.startDate.timeIntervalSince1970))\\t\\(e.title ?? \"Event\")\\t\\(blob)\")",
    "  }",
    "}",
  ].join("\n");
  const tmpPath = path.join(app.getPath("temp"), "braino-cal-next.swift");
  try {
    await fs.promises.writeFile(tmpPath, swiftSource);
    const { stdout } = await execFileP("/usr/bin/xcrun", ["swift", tmpPath], { timeout: 60000 });
    const line = String(stdout || "").trim().split(/\r?\n/).pop() || "";
    const [epoch, title = "", blob = ""] = line.split("\t");
    const startAt = Number(epoch) * 1000;
    // Video-call link buried in the event's url/location/notes → one-click Join.
    const joinMatch = blob.match(/https?:\/\/[^\s<>"',;)]*(?:zoom\.us\/j\/|meet\.google\.com\/|teams\.microsoft\.com\/l\/meetup-join|webex\.com\/(?:meet|join)\/)[^\s<>"',;)]*/i);
    const next = Number.isFinite(startAt) && startAt > Date.now() - 60000 && title.trim()
      ? { title: title.trim().slice(0, 30), startAt, joinUrl: joinMatch ? joinMatch[0] : "" }
      : null;
    const changed = JSON.stringify(next) !== JSON.stringify(calendarNext);
    calendarNext = next;
    if (changed) {
      logMac("calendar.next", next || { none: true });
      sendToRenderer("braino-mac:calendar-next", { next });
    }
  } catch (error) {
    logMac("calendar.check.failed", { error });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

function updateWaBadge(sender) {
  waBadgeCount += 1;
  waBadgeSender = String(sender || "").slice(0, 20);
  sendToRenderer("braino-mac:wa-badge", { count: waBadgeCount, sender: waBadgeSender });
}

function clearWaBadge() {
  if (!waBadgeCount) return;
  waBadgeCount = 0;
  waBadgeSender = "";
  sendToRenderer("braino-mac:wa-badge", { count: 0, sender: "" });
}

function parseWaListenerIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (/\b(?:stop|quit|no more|disable|turn off)\b.*\bwhats\s*app/i.test(source) && /\bread|listen|notif/i.test(source)) return { enable: false };
  if (/\bwhats\s*app\b.*\b(?:reader|listener|notifications?)\s+off\b/i.test(source)) return { enable: false };
  if (/\b(?:read|speak|announce|listen\s+(?:to|for))\b.*\bwhats\s*app/i.test(source)) return { enable: true };
  if (/\bwhats\s*app\b.*\b(?:reader|listener|notifications?)\s+on\b/i.test(source)) return { enable: true };
  if (/\bwhats\s*app\b.*\b(?:notifs?|notifications?|messages?)\b/i.test(source)
    && /\b(?:on|start|enable|fix|working|work)\b/i.test(source)) return { enable: true };
  return null;
}

function parseWhatsAppReplyIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  const match = source.match(/^reply(?:\s+to\s+(?:her|him|them))?(?:\s+(?:saying|that|with))?\s+(.+)$/i);
  if (!match?.[1]) return null;
  return { message: match[1].trim() };
}

function parseWhatsAppRememberIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  const phoneMatch = source.match(/\b(?:remember|save)\s+(?:that\s+)?(?:my\s+)?(.+?)(?:'s)?\s+(?:whatsapp\s+)?(?:phone\s+)?number\s+is\s+([+\d][\d\s\-()]{6,})\s*$/i);
  if (phoneMatch?.[1] && phoneMatch?.[2]) {
    return { alias: phoneMatch[1].trim(), phone: phoneMatch[2].replace(/[^\d+]/g, "") };
  }
  const nameMatch = source.match(/\bremember\s+(?:that\s+)?my\s+(.+?)\s+is\s+(?:called\s+)?([a-z][a-z .'-]{1,40})\s*$/i);
  if (nameMatch?.[1] && nameMatch?.[2] && /\b(mom|mum|dad|father|mother|brother|sister|wife|husband|girlfriend|boyfriend|best friend|friend|boss|uncle|aunt|grandma|grandpa)\b/i.test(nameMatch[1])) {
    return { alias: nameMatch[1].trim(), name: nameMatch[2].trim() };
  }
  return null;
}

function parseWhatsAppIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\bwhats\s*app\b/i.test(source)) return null;
  const messageMatch = source.match(/\b(?:saying|that says|which says|telling (?:her|him|them)|telling|tell (?:her|him|them))\s+["“]?(.+?)["”]?\s*$/i);
  const message = messageMatch?.[1]?.trim() || "";
  let recipient = "";
  const patterns = [
    /\bsend\s+(?:a\s+)?(?:whatsapp\s+)?message\s+to\s+(?:my\s+)?(.+?)\s+(?:on\s+whats\s*app\s+)?(?:saying|that says|telling|tell)\b/i,
    /\bsend\s+(?:my\s+)?(.+?)\s+a\s+(?:whatsapp\s+)?message\b/i,
    /\b(?:message|whatsapp|text)\s+(?:my\s+)?(.+?)\s+(?:on\s+whats\s*app\s+)?(?:saying|that says|telling|tell)\b/i,
    /\bsend\s+(?:a\s+)?(?:whatsapp\s+)?message\s+to\s+(?:my\s+)?(.+?)\s*$/i,
    /\b(?:message|whatsapp|text)\s+(?:my\s+)?([a-z .'-]{2,30})\s*$/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      recipient = match[1].replace(/\bon\s+whats\s*app\b/gi, "").replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
      break;
    }
  }
  if (!recipient && !message) return null;
  return { recipient, message, needsMessage: !message, needsRecipient: !recipient };
}

async function resolveWhatsAppRecipient(recipientRaw) {
  const key = String(recipientRaw || "").toLowerCase().trim();
  if (!key) return { ok: false, error: "empty recipient" };
  const contacts = loadWhatsAppContacts();
  const alias = contacts[key];
  if (alias?.phone) return { ok: true, name: alias.name || recipientRaw, phone: alias.phone, source: "alias" };

  const cached = findContactInCache(alias?.name || recipientRaw);
  if (cached?.phone) {
    logMac("whatsapp.contact.resolved", { query: textForLog(recipientRaw), name: textForLog(cached.name), source: "cache" });
    return { ok: true, name: cached.name, phone: cached.phone, source: "cache" };
  }

  const lookupName = alias?.name || recipientRaw;
  // Contacts must be running or the query throws -600; launch it hidden first.
  try {
    await execFileP("/usr/bin/open", ["-gja", "Contacts"], { timeout: 4000 });
    await new Promise((resolve) => setTimeout(resolve, 700));
  } catch (_) {}
  const script = `
tell application "Contacts"
  set matches to (every person whose name contains "${escapeAppleScriptString(lookupName)}")
  repeat with p in matches
    if (count of phones of p) > 0 then
      return (name of p) & linefeed & (value of first phone of p)
    end if
  end repeat
  return ""
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    const [name = "", phone = ""] = String(stdout || "").trim().split(/\r?\n/);
    if (phone.trim()) {
      logMac("whatsapp.contact.resolved", { query: textForLog(lookupName), name: textForLog(name), source: "contacts" });
      return { ok: true, name: name || lookupName, phone: phone.trim(), source: "contacts" };
    }
  } catch (error) {
    logMac("whatsapp.contacts.lookup_failed", { query: textForLog(lookupName), error });
  }
  return { ok: false, error: `no number for ${lookupName}` };
}

function normalizeWhatsAppPhone(phone) {
  let digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  // Bare 10-digit numbers are assumed local Indian mobiles.
  if (/^\d{10}$/.test(digits)) digits = `91${digits}`;
  return digits;
}

async function sendWhatsAppMessage(recipientRaw, message) {
  const text = String(message || "").trim();
  if (!text) return { ok: false, say: "Tell me what the message should say." };
  sendTaskProgress({ status: "thinking", text: `Messaging ${recipientRaw}` });

  const resolved = await resolveWhatsAppRecipient(recipientRaw);
  if (!resolved.ok) {
    return {
      ok: false,
      say: `I could not find a number for ${recipientRaw}. Say "Braino, remember ${recipientRaw}'s number is" and the number, and I will keep it.`,
    };
  }
  const phone = normalizeWhatsAppPhone(resolved.phone);
  if (!phone || phone.length < 10) {
    return { ok: false, say: `The number I have for ${resolved.name} does not look complete. Teach me the full number with country code.` };
  }

  const wasRunning = await isMacApplicationRunning("WhatsApp");
  await shell.openExternal(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`);
  sendTaskProgress({ status: "thinking", text: `Typing to ${resolved.name}`.slice(0, 36) });
  await new Promise((resolve) => setTimeout(resolve, wasRunning ? 1600 : 3400));

  const pressEnter = `
tell application "System Events"
  if not (exists application process "WhatsApp") then return "no-app"
  tell application process "WhatsApp"
    set frontmost to true
    delay 0.25
    key code 36
  end tell
  return "sent"
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", pressEnter], { timeout: 8000 });
    if (!/sent/.test(String(stdout))) throw new Error(String(stdout || "WhatsApp is not open."));
  } catch (error) {
    logMac("whatsapp.send.enter_failed", { error });
    return {
      ok: false,
      say: `I opened the chat with ${resolved.name} and typed the message, but could not press send. It is sitting in the box, just hit enter.`,
    };
  }
  logMac("whatsapp.sent", {
    recipient: textForLog(resolved.name),
    source: resolved.source,
    messageChars: text.length,
  });
  sendTaskProgress({ status: "done", text: `Sent to ${resolved.name}` });
  return { ok: true, say: `Sent "${text}" to ${resolved.name} on WhatsApp.` };
}

let lastYouTubeList = { items: [], at: 0 };
let musicPlaying = false;
let musicSource = "";
let lastMusicTrack = "";
let lastMusicArtist = "";

let musicTrackKey = "";

const audioFeaturesCache = new Map(); // trackUri -> {tempo, energy, valence}

async function fetchAudioFeaturesForUri(uri) {
  const trackId = String(uri || "").match(/spotify:track:([A-Za-z0-9]+)/)?.[1];
  if (!trackId) return null;
  if (audioFeaturesCache.has(trackId)) return audioFeaturesCache.get(trackId);
  const result = await callSpotifyFunction("spotify-audio-features", { trackId });
  const features = result.ok && typeof result.tempo === "number"
    ? { tempo: result.tempo, energy: result.energy, valence: result.valence }
    : null;
  audioFeaturesCache.set(trackId, features);
  if (audioFeaturesCache.size > 200) audioFeaturesCache.delete(audioFeaturesCache.keys().next().value);
  logMac("music.tempo.fetched", { trackId, tempo: features?.tempo ?? null });
  return features;
}

// The Mac Spotify app's own AppleScript "player state" mirrors the whole
// Spotify Connect session, not this machine specifically: if playback moved
// to an iPhone, a speaker, or another computer, the local app can still say
// "playing" with zero sound coming out of this Mac. Confirm the account's
// active device is actually this class of device ("Computer" — the type
// Spotify uses for both the native app and the browser web player) before
// trusting it; phones/speakers/TVs are definitively elsewhere.
let remoteDeviceStreak = 0;

async function isSpotifyOnThisMac() {
  try {
    const result = await callSpotifyFunction("spotify-player-state", {});
    if (!result.ok) { remoteDeviceStreak = 0; return null; } // API hiccup — don't punish a real local play for it
    const device = result.activeDevice;
    if (!device) { remoteDeviceStreak = 0; return null; }
    const isRemote = device.type !== "Computer";
    if (!isRemote) { remoteDeviceStreak = 0; return true; }
    // Spotify's Connect device state has known momentary staleness — a single
    // "remote" read can be a stale echo even while audio is genuinely local.
    // Require two consecutive remote reads (this poll is every 5s, so ~10s)
    // before believing it, or a single flaky read used to flip Braino home
    // and back out repeatedly (looked like him randomly appearing/vanishing).
    remoteDeviceStreak += 1;
    return remoteDeviceStreak >= 2 ? false : null;
  } catch (_) {
    remoteDeviceStreak = 0;
    return null;
  }
}

// The active-tab check alone missed a YouTube video still playing in a
// BACKGROUND tab (switch tabs and the music state used to just vanish, since
// activeMacContext only reflects the frontmost tab's URL). This scans every
// Chrome tab across every window and asks each YouTube candidate directly,
// via injected JS, whether its <video> is actually unpaused — not just open.
// Needs "Allow JavaScript from Apple Events" in Chrome's View menu; if that
// is off the whole script throws and we fall back to the old active-tab-only
// behavior further down, so nothing regresses for people without it enabled.
// Ambient tab awareness: "he is the all-seeing" — but cheaply. This is plain
// text (window/tab titles + URLs, all free from AppleScript) polled on its
// own slow cadence, kept entirely separate from actual screen PIXELS: vision
// (captureScreenBase64 -> a model call) costs real money per look, so that
// stays strictly on-demand ("what's on my screen", "read this"). Ambient
// awareness of what's simply OPEN can run continuously for free.
let lastTabsSnapshotKey = "";

async function listAllChromeTabs(limitPerWindow = 12) {
  // Iterate the tabs COLLECTION directly (a snapshot), not by index — a tab
  // closing mid-scan (Amazon opening/redirecting a new tab) made "tab 6 of
  // window 2" go invalid (-1719) and crashed the whole scan. Every access is
  // now individually guarded so one bad tab can't kill the batch.
  const script = `
tell application "Google Chrome"
  if (count of windows) = 0 then return ""
  set out to ""
  repeat with w in windows
    try
      set theTabs to tabs of w
      set n to 0
      repeat with t in theTabs
        set n to n + 1
        if n > ${limitPerWindow} then exit repeat
        set tTitle to ""
        set tURL to ""
        try
          set tTitle to title of t
        end try
        try
          set tURL to URL of t
        end try
        set out to out & tTitle & "\t" & tURL & linefeed
      end repeat
    end try
  end repeat
  return out
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 6000 });
    const tabs = [];
    for (const line of String(stdout || "").split(/\r?\n/)) {
      const [title, url] = line.split("\t");
      if (title?.trim() || url?.trim()) tabs.push({ title: (title || "").trim(), url: (url || "").trim() });
      if (tabs.length >= 40) break;
    }
    return tabs;
  } catch (error) {
    logMac("tabs.scan.failed", { error });
    return [];
  }
}

async function checkAllTabsSnapshot() {
  const tabs = await listAllChromeTabs();
  const key = JSON.stringify(tabs);
  if (key === lastTabsSnapshotKey) return;
  lastTabsSnapshotKey = key;
  logMac("tabs.snapshot", { count: tabs.length });
  try { meetingDetectFromTabs(tabs); } catch (_) {}
  sendToRenderer("braino-mac:tabs-snapshot", { tabs });
}

let lastJsOffLogAt = 0;

async function findPlayingYouTubeTab() {
  // Returns "<kind>|<title>" where kind is "music" or "video" — a playing
  // reaction video / podcast must NOT start the dance party, only songs do.
  // Classification comes from YouTube's own page data (category === "Music"),
  // guarded against SPA staleness by matching the videoId to the URL.
  const probeJs = "(function(){var v=document.querySelector('video');if(!(v && !v.paused && !v.ended && v.currentTime > 0))return '';if(location.hostname==='music.youtube.com')return 'music|'+document.title;var cat='';try{var pr=window.ytInitialPlayerResponse;var vid=(new URLSearchParams(location.search)).get('v');if(pr && pr.videoDetails && pr.videoDetails.videoId===vid){cat=(pr.microformat && pr.microformat.playerMicroformatRenderer && pr.microformat.playerMicroformatRenderer.category)||'';}}catch(e){}return (cat==='Music'?'music':'video')+'|'+document.title;})()";
  const script = `
tell application "Google Chrome"
  if (count of windows) = 0 then return ""
  repeat with w in windows
    repeat with t in tabs of w
      set tURL to ""
      try
        set tURL to URL of t
      end try
      if tURL contains "youtube.com/watch" or tURL contains "music.youtube.com" then
        try
          set probeResult to execute t javascript "${probeJs.replace(/"/g, '\\"')}"
          if probeResult is not "" and probeResult is not missing value then
            return probeResult
          end if
        on error errMsg
          if errMsg contains "turned off" then set jsOff to true
        end try
      end if
    end repeat
  end repeat
  if jsOff then return "__jsoff__"
  return ""
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", "set jsOff to false\n" + script], { timeout: 6000 });
    const result = String(stdout || "").trim();
    if (result === "__jsoff__") {
      // Polled constantly — remind once per 10 minutes, not every 8 seconds.
      const now = Date.now();
      if (now - lastJsOffLogAt > 10 * 60 * 1000) {
        lastJsOffLogAt = now;
        logMac("music.youtube_scan.js_off", {});
      }
      return undefined; // same as "could not scan": caller falls back to the title heuristic
    }
    if (!result) return null;
    const sep = result.indexOf("|");
    if (sep < 0) return { kind: "video", title: result };
    return { kind: result.slice(0, sep) === "music" ? "music" : "video", title: result.slice(sep + 1).trim() };
  } catch (error) {
    logMac("music.youtube_scan.unavailable", { error });
    return undefined; // distinct from null: means "could not scan," caller should use the old fallback
  }
}

async function checkMusicState() {
  let playing = false;
  let source = "";
  let track = "";
  let artist = "";
  let uri = "";
  try {
    const state = await readSpotifyMacState();
    if (state.ok && /playing/i.test(state.state || "")) {
      const onThisMac = await isSpotifyOnThisMac();
      if (onThisMac === false) {
        logMac("music.spotify.remote_device", { track: textForLog(state.name || "") });
      } else {
        playing = true;
        source = "spotify";
        track = String(state.name || "").trim();
        artist = String(state.artist || "").trim();
        uri = String(state.uri || "").trim();
      }
    }
  } catch (_) {}
  if (!playing) {
    const scanned = await findPlayingYouTubeTab().catch(() => undefined);
    if (scanned !== undefined) {
      // A real cross-tab result: trust it fully, present or absent, even if
      // the playing tab is currently in the background. Only actual MUSIC
      // starts music mode — a reaction video or podcast is not a concert.
      if (scanned && scanned.kind === "music") {
        playing = true;
        source = "youtube";
        track = scanned.title.replace(/\s*-\s*YouTube.*$/i, "").trim();
      } else if (scanned) {
        logMac("music.youtube.non_music_video", { title: textForLog(scanned.title) });
      }
    } else {
      // Scan unavailable (JS-from-Apple-Events off) — can't read the video's
      // category, so classify by TITLE instead: song uploads almost always
      // carry a marker ("Official Audio/Video", "Lyrics", "[Audio]"...).
      // Podcasts/reactions don't, so they stay quiet.
      const url = activeMacContext?.browserUrl || "";
      const title = String(activeMacContext?.browserTitle || "").replace(/\s*-\s*YouTube.*$/i, "").trim();
      const titleLooksLikeSong = /official\s+(?:music\s+)?(?:audio|video)|\blyric(?:s|al)?\b|\[(?:audio|video|4k)\]|music\s+video|visuali[sz]er|full\s+song/i.test(title);
      if (/music\.youtube\.com/.test(url) || (/youtube\.com\/watch/.test(url) && titleLooksLikeSong)) {
        playing = true;
        source = "youtube";
        track = title;
      }
    }
  }
  const key = `${playing}|${source}|${track}|${artist}`;
  if (key !== musicTrackKey) {
    musicTrackKey = key;
    musicPlaying = playing;
    musicSource = source;
    lastMusicTrack = track;
    lastMusicArtist = artist;
    logMac("music.state", { playing, source, track: textForLog(track) });
    let features = null;
    if (playing && source === "spotify" && uri) {
      features = await fetchAudioFeaturesForUri(uri).catch(() => null);
    }
    sendToRenderer("braino-mac:music-state", {
      playing,
      source,
      track,
      artist,
      tempo: features?.tempo ?? null,
      energy: features?.energy ?? null,
      valence: features?.valence ?? null,
    });
  }
}

async function fetchYouTubeResults(query, { limit = 6 } = {}) {
  const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "en",
    },
  });
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{[\s\S]+?\});<\/script>/);
  if (!match) throw new Error("YouTube results page had no data.");
  const data = JSON.parse(match[1]);
  const videos = [];
  const channels = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.videoRenderer?.videoId) {
      const v = node.videoRenderer;
      videos.push({
        videoId: v.videoId,
        title: v.title?.runs?.[0]?.text || "",
        channel: v.ownerText?.runs?.[0]?.text || "",
        length: v.lengthText?.simpleText || "",
        views: v.shortViewCountText?.simpleText || "",
      });
      return;
    }
    if (node.channelRenderer?.channelId) {
      channels.push({
        channelId: node.channelRenderer.channelId,
        title: node.channelRenderer.title?.simpleText || "",
      });
      return;
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  walk(data.contents);
  return { videos: videos.slice(0, limit), channels: channels.slice(0, 3) };
}

async function fetchYouTubeChannelVideos(channelId, { limit = 4 } = {}) {
  const response = await fetch(`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/videos?hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "en",
    },
  });
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{[\s\S]+?\});<\/script>/);
  if (!match) return [];
  const videos = [];
  const walk = (node) => {
    if (!node || typeof node !== "object" || videos.length >= limit) return;
    if (node.videoRenderer?.videoId) {
      const v = node.videoRenderer;
      videos.push({
        videoId: v.videoId,
        title: v.title?.runs?.[0]?.text || "",
        channel: "",
        length: v.lengthText?.simpleText || "",
        views: v.shortViewCountText?.simpleText || "",
      });
      return;
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  try {
    walk(JSON.parse(match[1]).contents);
  } catch (_) {}
  return videos;
}

function parseYouTubeIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source || !/\byou\s*tube\b/i.test(source)) return null;
  const stripYt = (value) => String(value || "").replace(/\b(?:on|in)\s+you\s*tube\b/gi, "").replace(/\byou\s*tube\b/gi, "").replace(/\s+/g, " ").trim();

  let match = source.match(/\b(?:show|open|see)\s+(?:me\s+)?(?:some\s+(?:of\s+)?)?(?:the\s+)?(?:recent\s+|latest\s+|new\s+)?videos?\s+(?:from|of|by)\s+(.+)$/i)
    || source.match(/\bopen\s+(.+?)(?:'s)?\s+channel\b.*$/i);
  if (match?.[1]) {
    const query = stripYt(match[1]);
    if (query) return { action: "channel", query };
  }

  if (/\b(?:find|search|recommend|suggest|tutorials?|help me find)\b/i.test(source)) {
    match = source.match(/\b(?:find|search(?:\s+for)?|recommend|suggest|help me find)\s+(?:me\s+)?(?:some\s+)?(?:good\s+)?(.+)$/i);
    const query = stripYt(match?.[1] || "");
    if (query) return { action: "search", query };
  }

  match = source.match(/\b(?:play|watch|put on|start)\s+(.+)$/i);
  if (match?.[1]) {
    const query = stripYt(match[1]);
    if (query) return { action: "play", query };
  }
  return null;
}

function parseYouTubePickIntent(raw) {
  if (!lastYouTubeList.items.length || Date.now() - lastYouTubeList.at > 5 * 60 * 1000) return null;
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  const match = source.match(/^(?:play|open|watch)\s+(?:the\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|number\s+\d)\s*(?:one|video)?$/i);
  if (!match) return null;
  const word = match[1].toLowerCase();
  const numberMatch = word.match(/number\s+(\d)/);
  const map = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, fifth: 4, "5th": 4, last: lastYouTubeList.items.length - 1 };
  const index = numberMatch ? Number(numberMatch[1]) - 1 : map[word];
  if (index == null || !lastYouTubeList.items[index]) return null;
  return { item: lastYouTubeList.items[index] };
}

function speakableYouTubeList(items, count = 3) {
  const words = ["First", "Second", "Third", "Fourth", "Fifth"];
  return items.slice(0, count)
    .map((item, index) => `${words[index]}, ${item.title}${item.channel ? ` by ${item.channel}` : ""}`)
    .join(". ");
}

async function playYouTubeVideo(query) {
  sendTaskProgress({ status: "thinking", text: `Finding ${query} on YouTube` });
  try {
    const { videos } = await fetchYouTubeResults(query, { limit: 5 });
    const video = videos[0];
    if (!video) return { ok: false, say: `I could not find ${query} on YouTube.` };
    lastYouTubeList = { items: videos, at: Date.now() };
    await openChromeUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
    logMac("youtube.play", { query: textForLog(query), videoId: video.videoId, title: textForLog(video.title) });
    sendTaskProgress({ status: "done", text: `Playing ${video.title}` });
    return { ok: true, say: `Playing ${video.title}${video.channel ? ` by ${video.channel}` : ""} on YouTube.` };
  } catch (error) {
    logMac("youtube.play.failed", { query: textForLog(query), error });
    await openChromeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    return { ok: true, say: `YouTube search was moody, so I opened the results for ${query}.` };
  }
}

async function openYouTubeChannelFlow(name) {
  sendTaskProgress({ status: "thinking", text: `Finding ${name} on YouTube` });
  try {
    const { channels, videos } = await fetchYouTubeResults(name, { limit: 5 });
    const channel = channels[0];
    if (!channel) {
      if (videos[0]?.channel) {
        // No channel card, but the top videos tell us who they meant.
        lastYouTubeList = { items: videos, at: Date.now() };
        await openChromeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`);
        return { ok: true, say: `I could not pin the channel, but here is what is around. ${speakableYouTubeList(videos)}. Say play the first, second, or third.` };
      }
      return { ok: false, say: `I could not find a channel called ${name} on YouTube.` };
    }
    const recent = await fetchYouTubeChannelVideos(channel.channelId, { limit: 4 });
    await openChromeUrl(`https://www.youtube.com/channel/${channel.channelId}/videos`);
    logMac("youtube.channel", { name: textForLog(channel.title), channelId: channel.channelId, recentCount: recent.length });
    if (recent.length) {
      lastYouTubeList = { items: recent, at: Date.now() };
      sendTaskProgress({ status: "done", text: channel.title });
      return { ok: true, say: `Opened ${channel.title}. Recent uploads: ${speakableYouTubeList(recent)}. Which one should I play?` };
    }
    sendTaskProgress({ status: "done", text: channel.title });
    return { ok: true, say: `Opened ${channel.title}'s channel on YouTube.` };
  } catch (error) {
    logMac("youtube.channel.failed", { name: textForLog(name), error });
    await openChromeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`);
    return { ok: true, say: `I opened YouTube results for ${name}.` };
  }
}

async function searchYouTubeSpoken(query) {
  sendTaskProgress({ status: "thinking", text: `Searching YouTube for ${query}` });
  try {
    const { videos } = await fetchYouTubeResults(query, { limit: 5 });
    if (!videos.length) return { ok: false, say: `Nothing on YouTube for ${query}.` };
    lastYouTubeList = { items: videos, at: Date.now() };
    await openChromeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    logMac("youtube.search", { query: textForLog(query), count: videos.length });
    sendTaskProgress({ status: "done", text: "Found some" });
    return { ok: true, say: `Here is what looks good for ${query}. ${speakableYouTubeList(videos)}. Say play the first, second, or third.` };
  } catch (error) {
    logMac("youtube.search.failed", { query: textForLog(query), error });
    await openChromeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    return { ok: true, say: `I opened YouTube results for ${query}.` };
  }
}

// "Open the amazon page for X" / "open X from google docs" — resolve the
// DESTINATION and the SUBJECT before anything fires. Layer one: understand.
const SEMANTIC_SITES = {
  amazon: { name: "Amazon", search: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  youtube: { name: "YouTube", search: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  "google docs": { name: "Google Docs", search: (q) => `https://drive.google.com/drive/search?q=${encodeURIComponent(q)}` },
  "google drive": { name: "Google Drive", search: (q) => `https://drive.google.com/drive/search?q=${encodeURIComponent(q)}` },
  wikipedia: { name: "Wikipedia", search: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` },
  google: { name: "Google", search: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  flipkart: { name: "Flipkart", search: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
};

function parseSemanticOpenIntent(raw) {
  // Voice corrections ride along — strip "no, I said" style prefixes so the
  // retry doesn't pollute the query.
  const source = cleanPrompt(String(raw || ""))
    .replace(/^(?:no[,\s]+)?(?:i said|i asked(?: you)?(?: to)?|listen)[,\s]+/i, "")
    .replace(/[?.!]+\s*$/, "").trim();
  const siteNames = Object.keys(SEMANTIC_SITES).sort((a, b) => b.length - a.length);
  const sitePattern = siteNames.join("|").replace(/ /g, "\\s+");

  // "open the <site> page for <subject>"
  let match = source.match(new RegExp(`^open\\s+(?:the\\s+)?(${sitePattern})\\s+(?:web\\s+)?(?:page|link|listing|result)\\s+(?:for|of|about)\\s+(.+)$`, "i"));
  // "open <subject> from/on/in <site>"
  if (!match) {
    const alt = source.match(new RegExp(`^open\\s+(?:the\\s+)?(.+?)\\s+(?:from|on|in)\\s+(${sitePattern})$`, "i"));
    if (alt) match = [alt[0], alt[2], alt[1]];
  }
  // "open the page for <subject>" — no site named: books/products lean Amazon,
  // everything else leans Google.
  if (!match) {
    const bare = source.match(/^open\s+(?:the\s+)?(?:web\s+)?page\s+(?:for|of|about)\s+(.+)$/i);
    if (bare) {
      const subject = bare[1].trim();
      const site = /\b(?:book|buy|order|product)\b/i.test(source) || /\bbook\b/i.test(subject) ? "amazon" : "google";
      match = [bare[0], site, subject];
    }
  }
  if (!match) return null;
  const siteKey = match[1].toLowerCase().replace(/\s+/g, " ");
  const site = SEMANTIC_SITES[siteKey];
  const subject = match[2].replace(/^(?:the\s+)?(?:book|movie|song|video)\s+/i, "").trim();
  if (!site || !subject || subject.length < 2) return null;
  return { site: siteKey, siteName: site.name, subject, url: site.search(subject) };
}

function parseNetflixWatchIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source) return null;
  // "resume watching Little Brother on Netflix" / "continue Little Brother" /
  // "watch Little Brother on netflix" / "play Wednesday on netflix"
  let match = source.match(/\b(?:resume|continue|keep)\s+(?:watching\s+)?(.+?)(?:\s+on\s+netflix)?$/i);
  if (match && !/\bnetflix\b/i.test(source) && !match[0].includes("watching")) match = null;
  if (!match) match = source.match(/\b(?:watch|play|put on|start)\s+(.+?)\s+on\s+netflix$/i);
  const title = String(match?.[1] || "").replace(/^\s*(?:the\s+show\s+|the\s+movie\s+|the\s+series\s+)/i, "").trim();
  if (!title || /^netflix$/i.test(title)) return null;
  return { title };
}

async function resumeNetflixOnMac(title) {
  const searchUrl = `https://www.netflix.com/search?q=${encodeURIComponent(title)}`;
  sendTaskProgress({ status: "thinking", text: `Opening ${title} on Netflix` });
  await openChromeUrl(searchUrl);
  // Netflix search cards link straight to /watch/<id>, and a watch URL
  // auto-resumes from where you left off — so clicking the first card IS the
  // whole "resume" flow. Best-effort: needs JS-from-Apple-Events; if that's
  // off the search page is already open and one manual click finishes it.
  const clickJs = "(function(){var a=document.querySelector('a[href*=\\\"/watch/\\\"]');if(a){a.click();return 'clicked';}return 'no_card';})()";
  const script = `
tell application "Google Chrome"
  if (count of windows) = 0 then return "no_window"
  set t to active tab of front window
  try
    return execute t javascript "${clickJs.replace(/"/g, '\\"')}"
  on error
    return "js_off"
  end try
end tell`;
  await new Promise((resolve) => setTimeout(resolve, 4500));
  let clicked = "unavailable";
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    clicked = String(stdout || "").trim();
  } catch (_) {}
  logMac("netflix.resume", { title: textForLog(title), clicked });
  if (clicked === "clicked") {
    return { ok: true, say: `${title} is back on, right where you left it.` };
  }
  return { ok: true, say: `Netflix is open with ${title} right there. Hit the first one and you are back in.` };
}

// ── MESA School of Business: Itish is in the PGP in Venture Building. ──
// The student portal lives in the "Itish" Chrome profile, so opening it means
// launching Chrome with that specific profile directory, not the default one.
const MESA_URL = "https://students.mesaschool.co/?redirect=0";
const MESA_PROFILE_CANDIDATES = ["mesaschool", "mesa", "itish"];
const MESA_STATE_PATH = path.join(AUTH_STORE_DIR, "mesa.json");

function loadMesaState() {
  try { return JSON.parse(fs.readFileSync(MESA_STATE_PATH, "utf8")) || {}; } catch (_) { return {}; }
}

function saveMesaState(patch) {
  try { fs.writeFileSync(MESA_STATE_PATH, JSON.stringify({ ...loadMesaState(), ...patch }, null, 2)); } catch (_) {}
}

function mesaContextLines() {
  const state = loadMesaState();
  const lines = [
    "The user (Itish) is enrolled at Mesa School of Business in the PGP in Venture Building course. Braino tracks his coursework and keeps him accountable.",
  ];
  if (state.lastSummary) {
    const when = state.lastCheckAt ? new Date(state.lastCheckAt).toLocaleString() : "recently";
    lines.push(`Last Mesa portal check (${when}): ${String(state.lastSummary).slice(0, 500)}`);
  }
  return lines;
}

function findChromeProfileDir(candidates) {
  // Chrome keeps human profile names in Local State's info_cache, NOT in the
  // per-profile Preferences (those all say "Your Chrome" here). Candidates are
  // matched in priority order against both the display name and account name.
  try {
    const statePath = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "Local State");
    const cache = JSON.parse(fs.readFileSync(statePath, "utf8"))?.profile?.info_cache || {};
    const list = Array.isArray(candidates) ? candidates : [candidates];
    for (const candidate of list) {
      const want = String(candidate || "").toLowerCase();
      if (!want) continue;
      for (const [dir, info] of Object.entries(cache)) {
        const haystack = `${info?.name || ""} ${info?.gaia_name || ""} ${info?.gaia_given_name || ""}`.toLowerCase();
        if (haystack.includes(want)) return dir;
      }
    }
  } catch (_) {}
  return null;
}

async function openUrlInChromeProfile(url, profileCandidates) {
  const dir = findChromeProfileDir(profileCandidates);
  const args = dir
    ? ["-na", "Google Chrome", "--args", `--profile-directory=${dir}`, url]
    : ["-a", "Google Chrome", url];
  await execFileP("/usr/bin/open", args, { timeout: 8000 });
  logMac("chrome.profile_open", { profileDir: dir || "not_found", url: textForLog(url) });
  return Boolean(dir);
}

async function scrapeChromeTabText(urlFragment) {
  const js = "(function(){return (document.body && document.body.innerText || '').slice(0, 9000);})()";
  const script = `
tell application "Google Chrome"
  if (count of windows) = 0 then return ""
  repeat with w in windows
    repeat with t in tabs of w
      set tURL to ""
      try
        set tURL to URL of t
      end try
      if tURL contains "${urlFragment}" then
        try
          return execute t javascript "${js.replace(/"/g, '\\"')}"
        on error
          return "__jsoff__"
        end try
      end if
    end repeat
  end repeat
  return ""
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 10000 });
    return String(stdout || "").trim();
  } catch (_) {
    return "";
  }
}

async function runMesaCheckIn() {
  sendTaskProgress({ status: "thinking", text: "Opening your Mesa portal" });
  const foundProfile = await openUrlInChromeProfile(MESA_URL, MESA_PROFILE_CANDIDATES);
  await new Promise((resolve) => setTimeout(resolve, 7000));
  const pageText = await scrapeChromeTabText("mesaschool.co");
  if (pageText === "__jsoff__") {
    return { ok: true, say: "Your Mesa portal is open, but Chrome will not let me read pages — flip on Allow JavaScript from Apple Events in View, Developer, then ask me again." };
  }
  if (!pageText || pageText.length < 120) {
    return { ok: true, say: `Your Mesa portal is open${foundProfile ? " in your Itish profile" : ""}. The page has not finished loading for me to read — give it a moment and say Mesa check again.` };
  }
  const prior = loadMesaState();
  const authToken = await getBrainoAuthToken();
  const message = [
    "This text is scraped from Itish's Mesa School of Business student portal (PGP in Venture Building).",
    prior.lastSummary ? `Previous status from ${prior.lastCheckAt ? new Date(prior.lastCheckAt).toDateString() : "earlier"}: ${prior.lastSummary}` : "This is the first check.",
    "Summarize where he stands: current module, pending coursework or assignments, upcoming deadlines, and progress since the previous status.",
    "Keep him accountable — call out anything that looks overdue or untouched, kindly but directly.",
    "Answer for voice: natural, no markdown, under 90 words.",
  ].join("\n");
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ notes: pageText, message, chatHistory: [], responseMedium: "voice" }),
    });
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!response.ok || !reply) throw new Error(data?.error || `mesa summary failed (${response.status})`);
    saveMesaState({ lastSummary: reply, lastCheckAt: Date.now(), lastPageChars: pageText.length });
    logMac("mesa.checkin.done", { pageChars: pageText.length, replyChars: reply.length });
    rememberMacChat("user", "mesa coursework check");
    rememberMacChat("assistant", reply);
    return { ok: true, say: reply };
  } catch (error) {
    logMac("mesa.checkin.failed", { error });
    return { ok: true, say: "Your Mesa portal is open and I read the page, but the summary got stuck. Ask me again in a moment." };
  }
}

function parseMesaIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (!/\bmesa\b/i.test(source)) return null;
  if (/\b(open|check|status|progress|coursework|course|update|portal|school|assignments?|deadlines?|due|how am i doing|accountab)/i.test(source)) return {};
  if (/^\s*mesa\s*$/i.test(source)) return {};
  return null;
}

// ── File retention advisor: what is safe to let go of. ──
// Step-2 flow (user spec): scan → review oldest-first (creation date +
// Spotlight last-used/use-count) → ASK before touching anything → create a
// "Redundant Files" folder → persistent manifest so Braino always knows
// exactly what he moved and can recover any single item by name.
const REVIEW_BIN_PATH = path.join(os.homedir(), "Desktop", "Redundant Files");
const REDUNDANT_MANIFEST_PATH = path.join(AUTH_STORE_DIR, "redundant-folder.json");
let pendingReviewBin = loadRedundantManifest(); // survives restarts

function loadRedundantManifest() {
  try {
    const manifest = JSON.parse(fs.readFileSync(REDUNDANT_MANIFEST_PATH, "utf8"));
    return manifest && Array.isArray(manifest.files) && manifest.files.length ? manifest : null;
  } catch (_) { return null; }
}

function saveRedundantManifest(manifest) {
  try {
    if (!manifest) fs.unlinkSync(REDUNDANT_MANIFEST_PATH);
    else fs.writeFileSync(REDUNDANT_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } catch (_) {}
}

async function dirIsStale(full, days) {
  // True when NOT ONE file inside was modified in the last <days> days.
  try {
    const { stdout } = await execFileP("/usr/bin/find", [full, "-type", "f", "-mtime", `-${days}`, "-print", "-quit"], { timeout: 10000 });
    return !String(stdout || "").trim();
  } catch (_) {
    return false;
  }
}

async function dirSizeBytes(full) {
  try {
    const { stdout } = await execFileP("/usr/bin/du", ["-sk", full], { timeout: 20000 });
    return (Number(String(stdout || "").trim().split(/\s+/)[0]) || 0) * 1024;
  } catch (_) {
    return 0;
  }
}

async function fileUsageMeta(full) {
  // Spotlight metadata: when was it last OPENED and how often — much closer
  // to "relevance" than mtime alone.
  try {
    const { stdout } = await execFileP("/usr/bin/mdls", ["-name", "kMDItemLastUsedDate", "-name", "kMDItemUseCount", full], { timeout: 4000 });
    const lastRaw = stdout.match(/kMDItemLastUsedDate\s*=\s*(.+)/)?.[1]?.trim() || "";
    const countRaw = stdout.match(/kMDItemUseCount\s*=\s*(\d+)/)?.[1] || "";
    const lastUsedMs = lastRaw && lastRaw !== "(null)"
      ? (Date.parse(lastRaw.replace(" ", "T").replace(" +0000", "+0000")) || 0)
      : 0;
    return { lastUsedMs, useCount: Number(countRaw) || 0 };
  } catch (_) {
    return { lastUsedMs: 0, useCount: 0 };
  }
}

async function scanCleanupCandidates() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const roots = ["Desktop", "Downloads", "Documents"].map((name) => path.join(os.homedir(), name));
  const candidates = [];
  for (const root of roots) {
    let entries;
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "Redundant Files" || entry.name === "Braino Review Bin") continue;
      const full = path.join(root, entry.name);
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      if (entry.isDirectory()) {
        if (!(await dirIsStale(full, 45))) continue;
        const size = await dirSizeBytes(full);
        const bornMs = stat.birthtimeMs || stat.mtimeMs;
        candidates.push({ name: entry.name, full, size, bornMs, lastUsedMs: stat.mtimeMs, useCount: 0, isCapture: false, isDir: true });
      } else if (entry.isFile()) {
        const lastTouched = Math.max(stat.mtimeMs, stat.atimeMs || 0);
        const ageDays = (now - lastTouched) / DAY;
        const isCapture = /^(screenshot|screen recording)/i.test(entry.name);
        const big = stat.size > 100 * 1024 * 1024;
        if ((isCapture && ageDays > 3) || ageDays > 45 || (big && ageDays > 14)) {
          const usage = await fileUsageMeta(full);
          candidates.push({
            name: entry.name, full, size: stat.size,
            bornMs: stat.birthtimeMs || stat.mtimeMs,
            lastUsedMs: Math.max(usage.lastUsedMs, lastTouched),
            useCount: usage.useCount, isCapture, isDir: false,
          });
        }
      }
    }
  }
  // Oldest first — least recently touched leads, rarely-opened breaks ties.
  candidates.sort((a, b) => (a.lastUsedMs - b.lastUsedMs) || (a.useCount - b.useCount));
  return candidates.slice(0, 25);
}

async function suggestFileCleanup() {
  sendTaskProgress({ status: "thinking", text: "Reviewing your files" });
  const candidates = await scanCleanupCandidates();
  if (!candidates.length) {
    return { ok: true, say: "I went through Desktop, Downloads and Documents — folders included — and nothing has gone stale enough to push you on. Ask me again in a few weeks." };
  }
  const DAY = 24 * 60 * 60 * 1000;
  const totalMb = Math.round(candidates.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024));
  const sizeSpoken = totalMb > 1024 ? `${(totalMb / 1024).toFixed(1)} gigs` : `${totalMb} megabytes`;
  const oldest = candidates.slice(0, 3).map((c) => {
    const months = Math.max(1, Math.round((Date.now() - c.lastUsedMs) / (30 * DAY)));
    return `${c.name}, untouched about ${months} month${months > 1 ? "s" : ""}`;
  }).join("; ");
  setPendingMacWorkflow({ type: "cleanup", stage: "cleanup_confirm", data: { items: candidates.map((c) => ({ name: c.name, full: c.full, size: c.size, isDir: c.isDir, isCapture: c.isCapture })) } });
  logMac("files.cleanup.proposed", { count: candidates.length, totalMb });
  return {
    ok: true,
    say: `Going oldest first: ${candidates.length} things worth letting go, about ${sizeSpoken}. The oldest are ${oldest}. Want me to create a redundant folder with all of them so you can review?`,
  };
}

async function createRedundantFolder(items) {
  try { fs.mkdirSync(REVIEW_BIN_PATH, { recursive: true }); } catch (_) {}
  const moved = [];
  for (const item of items) {
    try {
      let dest = path.join(REVIEW_BIN_PATH, item.name);
      if (fs.existsSync(dest)) dest = path.join(REVIEW_BIN_PATH, `${path.basename(item.name, path.extname(item.name))} (${path.basename(path.dirname(item.full))})${path.extname(item.name)}`);
      fs.renameSync(item.full, dest);
      moved.push({ binName: path.basename(dest), origRoot: path.dirname(item.full), size: item.size, isDir: Boolean(item.isDir) });
    } catch (_) {}
  }
  if (!moved.length) return { ok: false, say: "I could not move anything into the folder. Nothing changed." };
  pendingReviewBin = { files: moved, at: Date.now(), folder: REVIEW_BIN_PATH };
  saveRedundantManifest(pendingReviewBin);
  await shell.openPath(REVIEW_BIN_PATH);
  logMac("files.cleanup.folder_created", { count: moved.length });
  return {
    ok: true,
    say: `Done. Redundant Files is on your desktop with ${moved.length} things inside, and I know every one of them by name. Review it — say delete them all, put them back, or recover something specific like recover the braino extension folder.`,
  };
}

// File names arrive full of underscores, dashes and dots; voice transcripts
// arrive full of guesses. Normalize both sides to plain words, score every
// item, take the CLOSEST — then confirm before touching anything.
function normalizeFileWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreRedundantMatch(item, phrase) {
  const hay = normalizeFileWords(item.binName);
  const want = normalizeFileWords(phrase).replace(/\b(?:the|that|this|my|a|an|folder|file|one|thing|please|movie|video|clip|image|picture)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!want) return 0;
  if (hay === want) return 2;
  const wantWords = want.split(" ").filter((w) => w.length > 1);
  if (!wantWords.length) return 0;
  const hayWords = new Set(hay.split(" "));
  let hit = 0;
  for (const word of wantWords) {
    if (hayWords.has(word)) hit += 1;
    else if (hay.includes(word)) hit += 0.7;
    else {
      // transcript fuzz: accept a close prefix ("brain" for "braino",
      // "movie" for "mov", "pipeline" for the typo "pipleine")
      for (const hayWord of hayWords) {
        const shorter = Math.min(hayWord.length, word.length, 4);
        if (shorter >= 3 && hayWord.slice(0, shorter) === word.slice(0, shorter)) { hit += 0.5; break; }
      }
    }
  }
  let score = hit / wantWords.length;
  if (hay.includes(want)) score += 0.5;
  return score;
}

function closestRedundantItems(phrase) {
  if (!pendingReviewBin?.files?.length) return [];
  return pendingReviewBin.files
    .map((item) => ({ item, score: scoreRedundantMatch(item, phrase) }))
    .filter((entry) => entry.score >= 0.3)
    .sort((a, b) => b.score - a.score);
}

async function moveRedundantItemsBack(items) {
  let restored = 0;
  for (const item of items) {
    try {
      fs.renameSync(path.join(REVIEW_BIN_PATH, item.binName), path.join(item.origRoot, item.binName));
      restored += 1;
    } catch (_) {}
  }
  pendingReviewBin.files = pendingReviewBin.files.filter((f) => !items.includes(f));
  if (!pendingReviewBin.files.length) { pendingReviewBin = null; try { fs.rmdirSync(REVIEW_BIN_PATH); } catch (_) {} }
  saveRedundantManifest(pendingReviewBin);
  return restored;
}

async function recoverRedundantItem(phrase) {
  if (!pendingReviewBin?.files?.length) return { ok: false, say: "There is no redundant folder of mine holding anything right now." };
  sendTaskProgress({ status: "thinking", text: `Matching "${String(phrase).slice(0, 32)}" in the redundant folder` });
  const ranked = closestRedundantItems(phrase);
  if (!ranked.length) {
    const names = pendingReviewBin.files.slice(0, 6).map((f) => f.binName).join(", ");
    return { ok: true, say: `Nothing in there sounds like that. The folder holds things like ${names}. Which one?` };
  }
  const best = ranked[0];
  const runnerUp = ranked[1];
  // Clear winner + strong score: still confirm — transcription is guesswork.
  if (best.score >= 1.2 && (!runnerUp || best.score - runnerUp.score > 0.4)) {
    setPendingMacWorkflow({ type: "cleanup", stage: "recover_confirm", data: { binName: best.item.binName } });
    return { ok: true, say: `That sounds like ${best.item.binName}. Bring it back?` };
  }
  const options = ranked.slice(0, 3).map((entry) => entry.item.binName);
  setPendingMacWorkflow({ type: "cleanup", stage: "recover_pick", data: { options } });
  return { ok: true, say: `Closest matches: ${options.join(", or ")}. Which one?` };
}

async function openRedundantFolder() {
  if (!fs.existsSync(REVIEW_BIN_PATH)) {
    return { ok: true, say: "There is no redundant folder right now — ask me what is worth deleting and I will build one." };
  }
  await shell.openPath(REVIEW_BIN_PATH);
  const count = pendingReviewBin?.files?.length || 0;
  return { ok: true, say: count ? `Open. ${count} things inside — ask me what is in there, or recover anything by name.` : "Open." };
}

function listRedundantContents() {
  if (!pendingReviewBin?.files?.length) return { ok: true, say: "My redundant folder is empty right now — nothing parked." };
  const files = pendingReviewBin.files;
  const folders = files.filter((f) => f.isDir).length;
  const names = files.slice(0, 10).map((f) => f.binName).join(", ");
  const more = files.length > 10 ? ` and ${files.length - 10} more` : "";
  return { ok: true, say: `The redundant folder holds ${files.length} things${folders ? `, ${folders} of them folders` : ""}: ${names}${more}.` };
}

async function deleteReviewBin() {
  // Truth lives on DISK, not in the manifest — after a partial delete or a
  // restart the folder can exist with a stale/empty manifest, and "delete the
  // redundant folder" must still just work.
  if (!fs.existsSync(REVIEW_BIN_PATH)) {
    pendingReviewBin = null;
    saveRedundantManifest(null);
    return { ok: false, say: "There is no redundant folder right now. Ask me what is worth deleting first." };
  }
  let count = 0;
  try { count = fs.readdirSync(REVIEW_BIN_PATH).filter((n) => !n.startsWith(".")).length; } catch (_) {}
  sendTaskProgress({ status: "thinking", text: `Deleting the redundant folder - Touch ID please` });
  const granted = await requireTouchId(count ? `delete the redundant folder (${count} items)` : "delete the redundant folder");
  if (granted !== true) {
    return { ok: false, say: granted === false ? "Touch ID said no, so everything stays put." : "I could not verify it is you, so everything stays put." };
  }
  try {
    // Trash the WHOLE folder — item-by-item used to leave an empty shell
    // behind (a .DS_Store made the rmdir fail silently).
    await execFileP("/usr/bin/osascript", ["-e",
      `tell application "Finder" to delete (POSIX file "${REVIEW_BIN_PATH}" as alias)`,
    ], { timeout: 15000 });
    pendingReviewBin = null;
    saveRedundantManifest(null);
    logMac("files.cleanup.deleted", { count });
    return { ok: true, say: count ? `Done — the folder and its ${count} things are in the Trash.` : "Done — the folder is in the Trash." };
  } catch (error) {
    logMac("files.cleanup.delete_failed", { error });
    return { ok: false, say: "The delete did not go through. The redundant folder is still on your desktop." };
  }
}

// Vague on purpose: "delete this folder" while a Finder window is front —
// resolve the actual open folder from context instead of hunting by name.
async function deleteCurrentFinderFolder() {
  const folder = await getFinderFrontFolder();
  if (!folder) return { ok: false, say: "I do not see a Finder window open — which folder do you mean?" };
  const clean = folder.replace(/\/$/, "");
  const name = path.basename(clean);
  const home = os.homedir();
  const protectedPaths = new Set([home, path.join(home, "Desktop"), path.join(home, "Documents"), path.join(home, "Downloads"), "/"]);
  if (protectedPaths.has(clean) || clean.split("/").length < 4) {
    return { ok: false, say: `That window is ${name} — I am not deleting that one from voice.` };
  }
  let count = 0;
  try { count = fs.readdirSync(clean).filter((n) => !n.startsWith(".")).length; } catch (_) {}
  sendTaskProgress({ status: "thinking", text: `Deleting ${name} - Touch ID please` });
  const granted = await requireTouchId(`delete the folder ${name}`);
  if (granted !== true) {
    return { ok: false, say: granted === false ? "Touch ID said no, so it stays." : "I could not verify it is you, so it stays." };
  }
  try {
    await execFileP("/usr/bin/osascript", ["-e",
      `tell application "Finder" to delete (POSIX file "${clean}" as alias)`,
    ], { timeout: 15000 });
    if (clean === REVIEW_BIN_PATH) { pendingReviewBin = null; saveRedundantManifest(null); }
    logMac("files.delete_current_folder", { folder: textForLog(clean), count });
    return { ok: true, say: `${name} is in the Trash, ${count} things and all.` };
  } catch (error) {
    logMac("files.delete_current_folder.failed", { error });
    return { ok: false, say: `I could not trash ${name}.` };
  }
}

async function restoreReviewBin() {
  if (!pendingReviewBin?.files?.length) return { ok: false, say: "Nothing is parked for review right now." };
  let restored = 0;
  for (const item of pendingReviewBin.files) {
    try {
      fs.renameSync(path.join(REVIEW_BIN_PATH, item.binName), path.join(item.origRoot, item.binName));
      restored += 1;
    } catch (_) {}
  }
  try { fs.rmdirSync(REVIEW_BIN_PATH); } catch (_) {}
  pendingReviewBin = null;
  saveRedundantManifest(null);
  logMac("files.cleanup.restored", { restored });
  return { ok: true, say: `Put ${restored} things back where they came from. Nothing deleted.` };
}

function parseFileCleanupIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (/\b(?:open|show|reveal)\b.*\b(?:redundant|review)\b.*\bfolder\b/i.test(source)) return { action: "open" };
  // Deterministic one-shot: "create a folder for the files I don't need" /
  // "make a redundant folder" — scan and build it, no twenty questions.
  if (/\b(?:create|make|build)\b.*\bfolder\b.*\b(?:don'?t need|useless|junk|redundant|worth deleting|not needed|old stuff)\b/i.test(source)
    || /\b(?:create|make|build)\b.*\b(?:redundant|cleanup|junk)\b.*\bfolder\b/i.test(source)) return { action: "create_direct" };
  if (/\b(?:delete|trash|remove)\s+(?:this|the (?:open|current))\s+folder\b/i.test(source)) return { action: "delete_current" };
  // Any delete-verb aimed at the redundant/review folder counts — people say
  // "delete the files in the redundant folder", not "delete them all".
  if (/\b(?:delete|trash|clear|empty|remove|erase)\b.*\b(?:redundant|review)\b.*\bfolder\b/i.test(source)
    || /\b(?:redundant|review)\s*folder\b.*\b(?:delete|trash|clear|empty)\b/i.test(source)) return { action: "delete" };
  if (pendingReviewBin && /\b(?:yes[,\s]+)?(?:delete|trash)\s+(?:them|these|those|all|them all|everything)\b/i.test(source)) return { action: "delete" };
  if (/\b(?:put|move)\b.*\b(?:back|home)\b.*\b(?:redundant|review)\b.*\bfolder\b/i.test(source)) return { action: "restore" };
  if (pendingReviewBin && /\bput (?:them|those|these|it) back\b|\brestore (?:them|those|the files|everything)\b/i.test(source)) return { action: "restore" };
  const recoverMatch = source.match(/\b(?:recover|bring back|take out|pull out|get back)\s+(.+?)\s*$/i);
  if (pendingReviewBin && recoverMatch && !/\bthem all\b|\beverything\b/i.test(recoverMatch[1])) return { action: "recover", phrase: recoverMatch[1] };
  if (/\b(?:what(?:'s| is) (?:in|inside))\b.*\b(?:redundant|review)\b.*\bfolder\b/i.test(source)
    || /\bredundant folder\b.*\b(?:contents?|holding|inside|what)\b/i.test(source)) return { action: "list" };
  if (/\b(?:clean|clear|delete|trash|get rid of|remove)\b.*\bscreen\s*(?:shots?|recordings?)\b/i.test(source)
    || /\bscreen\s*shots?\b.*\b(?:clean|delete|useless|clear)\b/i.test(source)) return { action: "screenshots" };
  if (/\b(?:what|which|anything)\b.*\b(?:worth deleting|should i delete|can i delete|to delete)\b/i.test(source)
    || /\b(?:scan|review|check)\b.*\b(?:files|desktop)\b.*\b(?:delete|clean|old|stale)\b/i.test(source)
    || /\bfiles?\b.*\bworth (?:deleting|keeping)\b/i.test(source)) return { action: "suggest" };
  return null;
}

function collectDesktopCaptures() {
  const desktop = path.join(os.homedir(), "Desktop");
  const captures = [];
  try {
    for (const entry of fs.readdirSync(desktop, { withFileTypes: true })) {
      if (!entry.isFile() || !/^(screenshot|screen recording)/i.test(entry.name)) continue;
      const full = path.join(desktop, entry.name);
      try {
        const stat = fs.statSync(full);
        captures.push({ name: entry.name, full, size: stat.size, mtimeMs: stat.mtimeMs });
      } catch (_) {}
    }
  } catch (_) {}
  return captures;
}

function desktopHygieneLines() {
  const lines = [];
  const captures = collectDesktopCaptures();
  if (captures.length >= 3) {
    const mb = Math.round(captures.reduce((sum, c) => sum + c.size, 0) / (1024 * 1024));
    lines.push(`Desktop hygiene: ${captures.length} screenshots and screen recordings are piling up on the user's Desktop (~${mb} MB). Braino knows this and can clean them if the user wants ("clean my screenshots").`);
  }
  if (pendingReviewBin?.files?.length) {
    const names = pendingReviewBin.files.slice(0, 12).map((f) => f.binName).join(", ");
    lines.push(`Braino created a "Redundant Files" folder on the Desktop and knows exactly what is inside (${pendingReviewBin.files.length} items): ${names}. The user can say delete them all, put them back, or recover a specific one by name.`);
  }
  return lines;
}

async function cleanScreenshots() {
  const captures = collectDesktopCaptures();
  if (!captures.length) return { ok: true, say: "Your desktop has no screenshots or recordings on it. Clean already." };
  try { fs.mkdirSync(REVIEW_BIN_PATH, { recursive: true }); } catch (_) {}
  const desktop = path.join(os.homedir(), "Desktop");
  const moved = [];
  for (const capture of captures) {
    try {
      fs.renameSync(capture.full, path.join(REVIEW_BIN_PATH, capture.name));
      moved.push({ binName: capture.name, origRoot: desktop });
    } catch (_) {}
  }
  if (!moved.length) return { ok: false, say: "I could not move the screenshots just now." };
  pendingReviewBin = { files: moved, at: Date.now(), folder: REVIEW_BIN_PATH };
  saveRedundantManifest(pendingReviewBin);
  await shell.openPath(REVIEW_BIN_PATH);
  const mb = Math.round(captures.reduce((sum, c) => sum + c.size, 0) / (1024 * 1024));
  logMac("files.screenshots.collected", { count: moved.length, mb });
  return { ok: true, say: `All ${moved.length} screenshots and recordings — about ${mb} megabytes — are in the Redundant Files folder I just opened. Say delete them all, put them back, or recover one by name.` };
}

// "How many filegen folders do I have?" — a real everything-scan via
// Spotlight, not a polite guess.
function parseCountItemsIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  const match = source.match(/\bhow many\b\s+(?:total\s+)?(.*?)\s*(folders?|files?|items?|screenshots?|screen recordings?)\b(?:\s+(?:do|have|are)\b.*)?$/i);
  if (!match) return null;
  const kind = match[2].toLowerCase();
  let term = String(match[1] || "").replace(/^(?:of\s+)?(?:the\s+)?/i, "").trim();
  if (/^(?:total|all|my|the)$/i.test(term)) term = "";
  // "how many FILES AND folders" — the leading noun is part of the question,
  // not a search term. Same for any bare files/folders remnant.
  if (/^(?:files?|folders?|items?)(?:\s+and)?$/i.test(term)) term = "";
  // "in this folder" / "in here" is vague on purpose — the user is looking
  // at something. Resolve against the frontmost Finder window instead of
  // guessing or counting the world.
  const scope = /\b(?:in|inside)\s+(?:this|the current|that|the open)\s+folder\b|\bin here\b/i.test(source)
    ? "current"
    : undefined;
  if (/^screen/.test(kind)) return { term: "screenshot", kind: "files", scope };
  // No term = "how many folders/files do I have" = count EVERYTHING.
  return { term, kind, scope };
}

// iCloud Drive lives INSIDE ~/Library, which every sane scan prunes — so it
// must be an explicit root or the user's real Documents are invisible
// (locally their Documents folder is empty; the actual files sync to iCloud).
const ICLOUD_DRIVE_PATH = path.join(os.homedir(), "Library", "Mobile Documents", "com~apple~CloudDocs");

async function countAllHomeItems() {
  const roots = [
    { name: "Desktop", full: path.join(os.homedir(), "Desktop") },
    { name: "Downloads", full: path.join(os.homedir(), "Downloads") },
    { name: "Documents", full: path.join(os.homedir(), "Documents") },
    { name: "iCloud Drive", full: ICLOUD_DRIVE_PATH },
  ];
  const perRoot = [];
  let totalFiles = 0;
  let totalDirs = 0;
  for (const { name: rootName, full } of roots) {
    const countType = async (type) => {
      try {
        const { stdout } = await execFileP("/usr/bin/find", [
          full,
          "(", "-path", "*/node_modules", "-o", "-path", "*/.git", "-o", "-name", ".*", ")", "-prune",
          "-o", "-type", type, "-print",
        ], { timeout: 45000, maxBuffer: 32 * 1024 * 1024 });
        return String(stdout || "").split("\n").filter(Boolean).length;
      } catch (error) {
        logMac("files.count_all.root_failed", { root: rootName, type, error });
        return 0;
      }
    };
    const [files, dirs] = await Promise.all([countType("f"), countType("d")]);
    logMac("files.count_all.root", { root: rootName, files, dirs });
    perRoot.push(`${rootName} has ${files} files in ${Math.max(0, dirs - 1)} folders`);
    totalFiles += files;
    totalDirs += Math.max(0, dirs - 1);
  }
  logMac("files.count_all.done", { totalFiles, totalDirs });
  return {
    ok: true,
    say: `I walked everything: ${totalFiles} files across ${totalDirs} folders. ${perRoot.join(". ")}. That skips hidden stuff and code dependencies, which nobody wants counted.`,
  };
}

async function getFinderFrontFolder() {
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e",
      'tell application "Finder" to get POSIX path of (target of front window as alias)',
    ], { timeout: 4000 });
    const folder = String(stdout || "").trim();
    return folder || null;
  } catch (_) {
    return null;
  }
}

async function countCurrentFolderItems(term) {
  const folder = await getFinderFrontFolder();
  if (!folder) {
    return { ok: true, say: "I do not see a Finder window open right now — open the folder you mean and ask again." };
  }
  let files = 0;
  let dirs = 0;
  let matched = 0;
  try {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) dirs += 1; else files += 1;
      if (term && normalizeFileWords(entry.name).includes(normalizeFileWords(term))) matched += 1;
    }
  } catch (error) {
    logMac("files.count_current.failed", { folder: textForLog(folder), error });
    return { ok: false, say: "I could not read that folder." };
  }
  const name = path.basename(folder.replace(/\/$/, "")) || "that folder";
  logMac("files.count_current", { folder: textForLog(folder), files, dirs, term: textForLog(term || "") });
  if (term) return { ok: true, say: `In ${name}: ${matched} things matching ${term}, out of ${files} files and ${dirs} folders.` };
  return { ok: true, say: `${name} has ${files} files and ${dirs} folders in it.` };
}

async function countMatchingItems({ term, kind, scope }) {
  if (scope === "current") return countCurrentFolderItems(term);
  if (!term) {
    // Per spec: ask how they want it first, then the number, then the offer.
    setPendingMacWorkflow({ type: "cleanup", stage: "count_style", data: {} });
    return { ok: true, say: "Sure — full breakdown, or straight to the point?" };
  }
  const safeTerm = term.replace(/["\\]/g, "");
  logMac("files.count.start", { term: textForLog(term), kind });
  let paths = [];
  try {
    const { stdout } = await execFileP("/usr/bin/mdfind", [`kMDItemDisplayName == "*${safeTerm}*"cd`], { timeout: 15000 });
    paths = String(stdout || "").split("\n").filter(Boolean)
      .filter((p) => p.startsWith(os.homedir()) && !/\/node_modules\//.test(p)
        && (p.includes("/Mobile Documents/") || !/\/Library\//.test(p)));
  } catch (_) {}
  if (!paths.length) {
    // Spotlight often can't (or won't) see the home folder from here — walk it
    // for real instead of shrugging. Depth-capped, junk dirs pruned, and
    // iCloud Drive searched explicitly since the Library prune hides it.
    try {
      const [homeOut, icloudOut] = await Promise.all([
        execFileP("/usr/bin/find", [
          os.homedir(), "-maxdepth", "8",
          "(", "-path", "*/Library", "-o", "-path", "*/node_modules", "-o", "-path", "*/.git", "-o", "-path", "*/.Trash", ")", "-prune",
          "-o", "-iname", `*${safeTerm}*`, "-print",
        ], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 }).then(({ stdout }) => stdout).catch(() => ""),
        execFileP("/usr/bin/find", [
          ICLOUD_DRIVE_PATH, "-maxdepth", "8",
          "(", "-path", "*/node_modules", "-o", "-path", "*/.git", ")", "-prune",
          "-o", "-iname", `*${safeTerm}*`, "-print",
        ], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 }).then(({ stdout }) => stdout).catch(() => ""),
      ]);
      paths = `${homeOut}\n${icloudOut}`.split("\n").filter(Boolean);
      logMac("files.count.find_fallback", { term: textForLog(term), found: paths.length });
    } catch (error) {
      logMac("files.count.failed", { term: textForLog(term), error });
    }
  } else {
    logMac("files.count.mdfind", { term: textForLog(term), found: paths.length });
  }
  let dirs = 0;
  let files = 0;
  const parents = new Map();
  for (const p of paths) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) dirs += 1; else files += 1;
      const parent = path.basename(path.dirname(p));
      parents.set(parent, (parents.get(parent) || 0) + 1);
    } catch (_) {}
  }
  const wantFolders = kind.startsWith("folder");
  const count = wantFolders ? dirs : kind.startsWith("file") ? files : dirs + files;
  const topSpots = [...parents.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name).join(", ");
  logMac("files.count", { term: textForLog(term), dirs, files });
  if (!count) return { ok: true, say: `I walked your whole home folder and iCloud Drive by hand — there is genuinely nothing named ${term} on this Mac. Tell me what it might actually be called and I will hunt again.` };
  const other = wantFolders ? `${files} matching files` : `${dirs} matching folders`;
  return { ok: true, say: `You have ${count} ${term} ${wantFolders ? "folders" : "files"}${(wantFolders ? files : dirs) ? ` plus ${other}` : ""}, mostly under ${topSpots}.` };
}

// ── Task-manager awareness: who is eating the machine. ──
let pendingTaskHogs = null; // { apps: [names], at }
const TASK_HOG_PROTECTED = new Set(["Finder", "WindowServer", "loginwindow", "kernel_task", "Electron", "Braino Mac", "Cursor", "Terminal"]);

async function reportTaskHogs() {
  let rows = [];
  try {
    const { stdout } = await execFileP("/bin/ps", ["-Aceo", "rss,pcpu,comm", "-r"], { timeout: 6000 });
    rows = String(stdout || "").split("\n").slice(1).map((line) => {
      const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(.+)$/);
      return match ? { rss: Number(match[1]), cpu: Number(match[2]), name: match[3].trim() } : null;
    }).filter(Boolean);
  } catch (error) {
    logMac("tasks.scan_failed", { error });
    return { ok: false, say: "I could not read the process list just now." };
  }
  const byApp = new Map();
  for (const row of rows) {
    const key = row.name.replace(/ Helper.*$/i, "");
    const entry = byApp.get(key) || { name: key, rss: 0, cpu: 0 };
    entry.rss += row.rss;
    entry.cpu += row.cpu;
    byApp.set(key, entry);
  }
  const top = [...byApp.values()].sort((a, b) => b.rss - a.rss).slice(0, 6);
  const fmt = (kb) => (kb > 1024 * 1024 ? `${(kb / (1024 * 1024)).toFixed(1)} gigs` : `${Math.round(kb / 1024)} megs`);
  const spokenTop = top.map((t) => `${t.name} at ${fmt(t.rss)}`).join(", ");
  const closable = top.filter((t) => !TASK_HOG_PROTECTED.has(t.name) && t.name !== (activeMacContext?.appName || "")).map((t) => t.name);
  pendingTaskHogs = { apps: closable, at: Date.now() };
  logMac("tasks.hogs", { top: top.map((t) => `${t.name}:${Math.round(t.rss / 1024)}mb`).join(",") });
  const closeLine = closable.length ? ` If you want room back, say close them and I will quit ${closable.join(" and ")}.` : "";
  return { ok: true, say: `Heaviest right now: ${spokenTop}.${closeLine}` };
}

async function closeTaskHogs() {
  if (!pendingTaskHogs || Date.now() - pendingTaskHogs.at > 10 * 60 * 1000 || !pendingTaskHogs.apps.length) {
    return { ok: false, say: "Ask me what is eating the machine first, then I will know what to close." };
  }
  const closed = [];
  for (const app of pendingTaskHogs.apps) {
    const result = await quitMacApplication(app).catch(() => null);
    if (result?.ok) closed.push(app);
  }
  pendingTaskHogs = null;
  if (!closed.length) return { ok: false, say: "None of those would close cleanly." };
  return { ok: true, say: `Closed ${closed.join(" and ")}. Breathing room reclaimed.` };
}

function parseTaskHogIntent(raw) {
  const source = cleanPrompt(String(raw || ""));
  if (pendingTaskHogs && /\bclose (?:them|those|these|all|them all)\b/i.test(source)) return { action: "close" };
  if (/\b(?:task manager|activity monitor)\b/i.test(source)
    || /\b(?:what|which|who)\b.*\b(?:eating|hogging|consuming|using|slowing)\b.*\b(?:ram|memory|cpu|machine|mac|resources|space)\b/i.test(source)
    || /\bheavy (?:apps|tasks|processes)\b/i.test(source)) return { action: "report" };
  return null;
}

function parseScreenPointIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "").trim();
  if (!source) return null;
  const FILE_WORDS = /\b(file|files|folder|pdf|document|docs?|image|photo|picture|video|screenshot|download|downloads|resume|receipt|invoice|note|notes)\b/i;
  const UI_WORDS = /\b(button|icon|menu|setting|settings|option|options|tab|link|field|toggle|slider|checkbox|search bar|address bar|sidebar|toolbar|close|save|export|share|profile|cursor|dock|play button|volume)\b/i;

  let target = "";
  let explicit = false;
  let match = source.match(/\b(?:show me where|point (?:to|at)|point out)\s+(?:the\s+|my\s+|this\s+|that\s+|a\s+)?(.+?)(?:\s+(?:is|are))?(?:\s+on\s+(?:the|my)\s+screen)?$/i);
  if (match?.[1]) {
    target = match[1];
    explicit = true;
  } else {
    match = source.match(/\bwhere(?:'s| is| are)\s+(?:the\s+|my\s+|this\s+|that\s+)?(.+?)(?:\s+on\s+(?:the|my)\s+screen)?$/i);
    if (match?.[1]) {
      target = match[1];
      // Bare "where is X" only counts as pointing when X sounds like UI or the
      // user names the screen; otherwise leave it for file search or chat.
      explicit = /\bon\s+(?:the|my)\s+screen\b/i.test(source) || UI_WORDS.test(match[1]);
    }
  }
  target = String(target || "").replace(/\s+/g, " ").trim();
  if (!target || !explicit) return null;
  if (FILE_WORDS.test(target) && !UI_WORDS.test(target)) return null;
  return { target };
}

let lastPointedAt = null; // { x, y (normalized), label, at }

async function clickAtNormalized(x, y, label) {
  const bounds = screen.getPrimaryDisplay().bounds;
  const px = Math.round(bounds.x + x * bounds.width);
  const py = Math.round(bounds.y + y * bounds.height);
  const result = await runAxHelper(["clickat", String(px), String(py)]);
  logMac("ax.clickat", { label: textForLog(label || ""), px, py, status: result.status });
  return result.status === "clicked";
}

async function runScreenPoint(target, raw) {
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: `Finding ${target}` });

  const screenStatus = systemPreferences.getMediaAccessStatus?.("screen") || "unknown";
  if (screenStatus === "denied" || screenStatus === "restricted") {
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture");
    return { ok: false, say: "I need Screen Recording permission to point at things. I opened the setting for you." };
  }

  const shot = await captureScreenBase64();
  if (!shot.ok) return { ok: false, say: shot.error };
  sendTaskProgress({ status: "thinking", text: `Locating ${target}` });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, say: "Vision is not configured on this build." };
  let authToken = await getBrainoAuthToken();
  if (!authToken) {
    await ensureBrainoAuth("vision");
    authToken = await getBrainoAuthToken();
  }

  const surface = activeMacContext || {};
  const pointContext = surface.appName
    ? `front app ${surface.appName}${surface.windowTitle ? `, window "${surface.windowTitle}"` : ""}`
    : "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/vision-point`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        target,
        said: String(raw || "").trim(),
        context: pointContext,
        imageBase64: shot.base64,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    const reply = String(data?.reply || "").trim();
    if (!response.ok || !reply) throw new Error(data?.error || `point vision failed (${response.status}).`);
    let parsed = null;
    try {
      parsed = JSON.parse(reply.match(/\{[\s\S]*\}/)?.[0] || "");
    } catch (_) {}
    logMac("point.result", {
      target: textForLog(target),
      found: Boolean(parsed?.found),
      x: parsed?.x,
      y: parsed?.y,
      durationMs: Date.now() - startedAt,
    });
    if (parsed?.found && Number.isFinite(Number(parsed.x)) && Number.isFinite(Number(parsed.y))) {
      lastPointedAt = {
        x: Math.min(1, Math.max(0, Number(parsed.x))),
        y: Math.min(1, Math.max(0, Number(parsed.y))),
        label: String(parsed.label || target).slice(0, 60),
        at: Date.now(),
      };
      sendToRenderer("braino-mac:point-at", {
        x: lastPointedAt.x,
        y: lastPointedAt.y,
        label: lastPointedAt.label,
      });
      sendTaskProgress({ status: "done", text: `Pointing at ${parsed.label || target}` });
      return { ok: true, say: String(parsed.spoken || `Right there. That is the ${parsed.label || target}.`) };
    }
    // Not on screen: if it sounds like a UI element just say so, otherwise
    // the user probably meant the world, so look it up on the web.
    if (parsed && /\b(button|icon|menu|setting|option|tab|link|field|toolbar)\b/i.test(target)) {
      return { ok: true, say: String(parsed.spoken || `I do not see ${target} on this screen.`) };
    }
    return runMacWebSearch(String(raw || target));
  } catch (error) {
    logMac("point.failed", { target: textForLog(target), error });
    return { ok: false, say: "I could not line that up just now. Try once more." };
  }
}

function stripForSpeech(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function runMacWebSearch(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return { ok: false, say: "Tell me what to search for." };
  const startedAt = Date.now();
  sendTaskProgress({ status: "thinking", text: `Searching the web for ${trimmed}` });

  const googleFallback = async (reason) => {
    logMac("web_search.fallback_google", { reason, query: textForLog(trimmed) });
    await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(trimmed)}`);
    return { ok: true, say: `I opened Google for ${trimmed}.` };
  };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return googleFallback("no_supabase");
  let authToken = await getBrainoAuthToken();
  if (!authToken) {
    await ensureBrainoAuth("web_search");
    authToken = await getBrainoAuthToken();
  }
  if (!authToken) return googleFallback("no_auth");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/web-research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        query: trimmed,
        purpose: "answer",
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.answer) {
      throw new Error(data?.error || `web-research failed (${response.status}).`);
    }
    sendTaskProgress({ status: "thinking", text: "Writing the answer" });
    const say = stripForSpeech(data.answer);
    logMac("web_search.done", {
      query: textForLog(trimmed),
      answerChars: say.length,
      sourceCount: Array.isArray(data.sources) ? data.sources.length : 0,
      durationMs: Date.now() - startedAt,
    });
    sendTaskProgress({ status: "done", text: "Found it" });
    return { ok: true, say: say || `I searched but did not find a clear answer for ${trimmed}.` };
  } catch (error) {
    logMac("web_search.failed", { query: textForLog(trimmed), error });
    return googleFallback(error?.message || "error");
  }
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
  // "repeat IT / that / what you said / the prompt" is asking Braino to say
  // something again — it toggled Spotify repeat twice in the live logs.
  // Music repeat needs music context or a bare on/off form.
  if (mentionsRepeat && !mentionsShuffle) {
    const speechRepeat = /\brepeat\s+(?:it|that|this|yourself|what you|the (?:prompt|question|answer|last))\b/i.test(source)
      || /\bsay (?:it|that) again\b/i.test(source);
    if (speechRepeat) return null;
    const musicContext = /\b(?:song|track|music|playlist|spotify|mode)\b/i.test(source)
      || /^(?:repeat|loop)(?:\s+(?:on|off))?$/i.test(source)
      || /\bturn\s+(?:on|off)\b.*\b(?:repeat|loop)\b/i.test(source)
      || /\b(?:repeat|loop)\b\s*(?:on|off)\b/i.test(source);
    if (!musicContext) return null;
  }
  const off = /\b(?:off|stop|disable|end|cancel)\b/i.test(source) || /\bturn\s+off\b/i.test(source);
  return { feature: mentionsShuffle ? "shuffling" : "repeating", enable: !off };
}

// "Repeat it" / "say that again" — re-speak the last thing he said.
let lastDelegateSay = "";

function parseRepeatSpeechIntent(raw) {
  const source = cleanPrompt(String(raw || "")).replace(/[?.!]+\s*$/, "");
  return /\brepeat\s+(?:it|that|this|yourself|what you (?:just )?said|the (?:prompt|question|answer|last (?:thing|one)))\b/i.test(source)
    || /\bsay (?:it|that) again\b/i.test(source)
    || /^(?:come again|what did you say)$/i.test(source);
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
    set artUrl to ""
    set posText to ""
    set durText to ""
    try
      set trackName to name of current track
      set artistName to artist of current track
      set trackUrl to spotify url of current track
    end try
    try
      set artUrl to artwork url of current track
      set durText to (duration of current track) as text
    end try
    try
      set posText to player position as text
    end try
    try
      set volumeLevel to sound volume as text
    end try
    return stateText & linefeed & trackName & linefeed & artistName & linefeed & volumeLevel & linefeed & trackUrl & linefeed & artUrl & linefeed & posText & linefeed & durText
  end tell
else
  return "not running"
end if`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 4000 });
    const [state = "", name = "", artist = "", volume = "", uri = "", artworkUrl = "", posText = "", durText = ""] = stdout.trim().split(/\r?\n/);
    const volumePercent = Number.isFinite(Number(volume)) ? clampSpotifyVolume(volume) : null;
    const positionSec = Number.isFinite(Number(posText)) ? Number(posText) : null;
    // Spotify reports duration in milliseconds.
    const durationSec = Number.isFinite(Number(durText)) && Number(durText) > 0 ? Number(durText) / 1000 : null;
    return { ok: true, state, name, artist, volumePercent, uri, artworkUrl, positionSec, durationSec };
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

async function likeCurrentSpotifyTrackViaMenu() {
  // Spotify's Web API blocks library writes for development-mode apps (May 2025
  // policy), but the Mac app's own menu bar still works through Accessibility.
  const script = `
tell application "System Events"
  if not (exists application process "Spotify") then return "no-app"
  tell application process "Spotify"
    set playbackMenu to menu "Playback" of menu bar item "Playback" of menu bar 1
    repeat with mi in menu items of playbackMenu
      try
        set itemName to name of mi as text
        if itemName contains "Liked Songs" or itemName contains "Save to Your Library" then
          click mi
          return "clicked:" & itemName
        end if
      end try
    end repeat
    return "not-found"
  end tell
end tell`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 8000 });
    const result = String(stdout || "").trim();
    logMac("spotify.like_menu.result", { result });
    if (result.startsWith("clicked:")) {
      return { ok: true, removed: /remove/i.test(result) };
    }
    return { ok: false, error: result };
  } catch (error) {
    logMac("spotify.like_menu.failed", { error });
    return { ok: false, error: error?.message || "menu click failed" };
  }
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

  // Liking the current song: the Mac app's own menu works even though the Web
  // API blocks library writes for development-mode apps. Try it first.
  if (!playlistName && intent?.useCurrent) {
    const state = await readSpotifyMacState();
    const menuLike = await likeCurrentSpotifyTrackViaMenu();
    if (menuLike.ok) {
      const trackLine = state?.name ? `${state.name}${state.artist ? ` by ${state.artist}` : ""}` : "this song";
      sendTaskProgress({ status: "done", text: menuLike.removed ? "Removed from Liked Songs" : "Added to Liked Songs" });
      logMac("spotify.add_track.done", { track: textForLog(state?.name || ""), destination: "Liked Songs", source: "mac_menu" });
      return {
        ok: true,
        say: menuLike.removed
          ? `Removed ${trackLine} from your Liked Songs.`
          : `Added ${trackLine} to your Liked Songs.`,
      };
    }
  }

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
  // Nobody names a Mac app with a whole sentence. A long target means the
  // user is describing a THING, not an app — fuzzy-matching it against
  // /Applications is how "open the Amazon page for the book..." opened
  // Pages.app. Refuse, so the caller falls through to smarter handling.
  if (String(appName || "").trim().split(/\s+/).length > 3) {
    logMac("app.search.skipped_long_target", { requested: textForLog(appName) });
    return [];
  }
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

async function openApp(appName, { allowFuzzy = true } = {}) {
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

  if (!allowFuzzy) {
    logMac("app.open.no_fuzzy_miss", { canonical });
    return { ok: false, appName: canonical, error: "No exact app match." };
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

const TAB_DOMAIN_NAMES = {
  "claude.ai": "Claude", "youtube.com": "YouTube", "mail.google.com": "Gmail",
  "docs.google.com": "Google Docs", "github.com": "GitHub", "x.com": "X",
  "twitter.com": "X", "chatgpt.com": "ChatGPT", "netflix.com": "Netflix",
  "open.spotify.com": "Spotify", "mesaschool.co": "Mesa", "notion.so": "Notion",
  "linkedin.com": "LinkedIn", "supabase.com": "Supabase",
};

async function describeOpenTabs() {
  sendTaskProgress({ status: "thinking", text: "Reading your tabs" });
  const tabs = await listAllChromeTabs();
  if (!tabs.length) return { ok: true, say: "Chrome has nothing open right now." };
  const groups = new Map();
  for (const tab of tabs) {
    let key = "other";
    try {
      const host = new URL(tab.url).hostname.replace(/^www\./, "");
      const known = Object.keys(TAB_DOMAIN_NAMES).find((domain) => host === domain || host.endsWith(`.${domain}`) || host.includes(domain.split(".")[0]));
      key = known ? TAB_DOMAIN_NAMES[known] : host.split(".").slice(-2, -1)[0] || "other";
    } catch (_) {}
    const group = groups.get(key) || { name: key, count: 0, sample: "" };
    group.count += 1;
    if (!group.sample && tab.title) group.sample = tab.title.slice(0, 50);
    groups.set(key, group);
  }
  const ranked = [...groups.values()].sort((a, b) => b.count - a.count);
  const described = ranked.slice(0, 4).map((g) => (g.count > 1 ? `${g.count} on ${g.name}` : `one on ${g.name}`)).join(", ");
  const rest = ranked.slice(4).reduce((sum, g) => sum + g.count, 0);
  const lead = ranked[0];
  const doing = lead && lead.count > 1 && lead.sample ? ` Mostly ${lead.name} — looks like ${lead.sample}.` : "";
  logMac("tabs.census", { total: tabs.length, groups: ranked.map((g) => `${g.name}:${g.count}`).join(",") });
  return {
    ok: true,
    say: `${tabs.length} tabs: ${described}${rest ? `, and ${rest} more` : ""}.${doing} Say close the tabs and I will clear the lot, or close the ${(ranked[1] || ranked[0])?.name || "YouTube"} tabs for just those.`,
  };
}

async function closeAllBrowserTabs() {
  sendTaskProgress({ status: "thinking", text: "Closing every tab" });
  const browsers = ["Google Chrome", "Brave Browser", "Microsoft Edge", "Safari"];
  let closedIn = [];
  for (const browser of browsers) {
    try {
      const { stdout } = await execFileP("/usr/bin/osascript", ["-e", `
tell application "System Events"
  if not (exists process "${browser}") then return "not_running"
end tell
tell application "${browser}"
  set tabTotal to 0
  repeat with w in windows
    set tabTotal to tabTotal + (count of tabs of w)
  end repeat
  close every tab of every window
  return tabTotal as text
end tell`], { timeout: 10000 });
      const count = Number(String(stdout || "").trim());
      if (Number.isFinite(count) && count > 0) closedIn.push({ browser, count });
    } catch (_) {}
  }
  const total = closedIn.reduce((sum, entry) => sum + entry.count, 0);
  logMac("tabs.close_all", { total, browsers: closedIn.map((e) => `${e.browser}:${e.count}`).join(",") });
  if (!total) return { ok: true, say: "No tabs open anywhere. Already clean." };
  return { ok: true, say: `Closed ${total} tab${total > 1 ? "s" : ""}. Clean slate.` };
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
  // Deleting is sensitive — every delete is Touch ID verified, no exceptions.
  const granted = await requireTouchId(`delete ${path.basename(confirmation.filePath)}`);
  if (granted !== true) {
    pendingFileConfirmation = null;
    return { ok: false, say: granted === false ? "Touch ID said no, so nothing was deleted." : "I could not verify it is you, so nothing was deleted." };
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
        ...mesaContextLines(),
        ...desktopHygieneLines(),
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

  // Voice Commands — the user's OWN configured shortcuts beat every built-in intent below, and
  // must run BEFORE classifyIntentLLM or the model just narrates instead of acting.
  const voiceModes = await fetchVoiceModes();
  const modeQuery = detectVoiceModeQuery(raw, voiceModes);
  if (modeQuery) {
    const active = voiceModes.find((m) => m.isActive) || null;
    logMac("delegate.voice_mode_query", { kind: modeQuery.kind, active: active?.name || "" });
    let say;
    if (modeQuery.kind === "which") {
      say = active ? `I'm in ${active.name}.` : "No mode right now, just me.";
    } else {
      say = active && active.id === modeQuery.mode.id
        ? `Yes, ${modeQuery.mode.name} is on.`
        : active ? `No. ${active.name} is on, not ${modeQuery.mode.name}.` : `No, ${modeQuery.mode.name} is off.`;
    }
    return { ok: true, say };
  }
  const modeCmd = detectVoiceModeCommand(raw, voiceModes);
  if (modeCmd) {
    const starting = modeCmd.action === "start";
    logMac("delegate.voice_mode_toggle", { mode: modeCmd.mode.name, starting });
    voiceStep(starting ? `Mode matched: ${modeCmd.mode.name}` : `Leaving ${modeCmd.mode.name}`);
    await voiceWait(420);
    voiceModesCache.modes = voiceModesCache.modes.map((m) => ({ ...m, isActive: starting ? m.id === modeCmd.mode.id : false }));
    // boot glow replays in the mode's colour, then the notch holds the tint
    sendVoiceModeState(starting ? modeCmd.mode : null);
    void setVoiceModeActive(modeCmd.mode.id, starting);
    await voiceWait(900);
    voiceStepClear();
    return { ok: true, say: starting ? `${modeCmd.mode.name} on.` : `${modeCmd.mode.name} off.` };
  }
  const voicePhrase = detectVoiceCommandPhrase(raw, voiceModes);
  if (voicePhrase) {
    const picked = pickRandomUrls(voicePhrase.command.urls);
    logMac("delegate.voice_command", { mode: voicePhrase.mode.name, count: picked.length, openMode: voicePhrase.command.openMode });
    voiceStep("Command matched");
    await voiceWait(380);
    voiceStep(picked.length > 1 ? `Opening ${picked.length} links` : "Opening");
    for (const url of picked) {
      if (voicePhrase.command.openMode === "incognito") await openChromeIncognitoUrl(url);
      else await openChromeUrl(url);
    }
    await voiceWait(650);
    voiceStepClear();   // back to the compact arch, still wearing the mode colour
    return { ok: true, say: picked.length > 1 ? `Opening ${picked.length} links.` : "Opening it." };
  }

  // MODE LOCK — while a Voice Command mode runs it owns the input. Only its own
  // phrases, a mode question, and leaving the mode get through; everything else
  // is refused rather than falling through to Spotify / files / the agent,
  // which is how "play <something>" used to land in Spotify mid-mode.
  {
    const lockMode = voiceModes.find((m) => m.isActive);
    if (lockMode) {
      logMac("delegate.voice_mode_locked", { mode: lockMode.name, raw: textForLog(raw) });
      voiceStep(`${lockMode.name} only`);
      await voiceWait(500);
      voiceStepClear();
      return { ok: true, say: `${lockMode.name} is on. Say one of its commands, or say stop ${lockMode.name}.` };
    }
  }

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

  const callIntent = parseCallIntent(raw);
  if (callIntent) {
    logMac("delegate.call_intent", {
      app: callIntent.app,
      video: callIntent.video,
      recipient: textForLog(callIntent.recipient),
    });
    return startCall(callIntent);
  }

  const wakeToggle = parseWakeWordToggleIntent(raw);
  if (wakeToggle) {
    logMac("delegate.wakeword_toggle_intent", { enable: wakeToggle.enable });
    saveWakeWordState(wakeToggle.enable);
    if (wakeToggle.enable) {
      wakeWordGaveUp = false;
      wakeWordCrashCount = 0;
      startBrainoWakeWord();
      return {
        ok: true,
        say: "Always listening is on. I stay armed for hey braino on-device, nothing leaves this Mac until I hear it.",
      };
    }
    stopBrainoWakeWord();
    return { ok: true, say: "Okay, back to double Control only." };
  }

  if (parseTouchIdTestIntent(raw)) {
    logMac("delegate.touchid_intent", {});
    sendTaskProgress({ status: "thinking", text: "Waiting for Touch ID" });
    const granted = await requireTouchId("verify it's really you");
    if (granted === true) {
      sendTaskProgress({ status: "done", text: "Verified" });
      return { ok: true, say: "Verified. That's really you." };
    }
    if (granted === false) return { ok: true, say: "Not verified. Try again whenever." };
    return { ok: true, say: "Touch ID is not available on this Mac right now." };
  }

  const timeQuery = parseTimeQueryIntent(raw);
  if (timeQuery) {
    logMac("delegate.time_query", timeQuery);
    return answerTimeQuery(timeQuery);
  }

  const stopwatchIntent = parseStopwatchIntent(raw);
  if (stopwatchIntent) {
    logMac("delegate.stopwatch_intent", { action: stopwatchIntent.action });
    return handleStopwatch(stopwatchIntent);
  }

  const alarmControl = parseAlarmControlIntent(raw);
  if (alarmControl) {
    logMac("delegate.alarm_control", alarmControl);
    return handleAlarmControl(alarmControl);
  }

  const alarmIntent = parseAlarmIntent(raw);
  if (alarmIntent) {
    logMac("delegate.alarm_intent", {
      cancel: Boolean(alarmIntent.cancel),
      fireAt: alarmIntent.fireAt || 0,
      label: textForLog(alarmIntent.label || ""),
    });
    if (alarmIntent.cancel) return cancelReminders("alarm");
    return startAlarm(alarmIntent.fireAt, alarmIntent.label);
  }

  const reminderIntent = parseReminderIntent(raw);
  if (reminderIntent) {
    logMac("delegate.reminder_intent", {
      cancel: Boolean(reminderIntent.cancel),
      seconds: reminderIntent.seconds || 0,
      label: textForLog(reminderIntent.label || ""),
    });
    if (reminderIntent.cancel) return cancelReminders();
    if (!reminderIntent.seconds) return { ok: false, say: "Tell me how long, like remind me in twenty minutes to stretch." };
    return startReminder(reminderIntent.seconds, reminderIntent.label);
  }

  // Deterministic, voice-only summon: the ONLY way the walker physically
  // steps out of the notch on request. Deliberately not bound to any hotkey
  // (double-Control is reserved for starting a conversation, which now
  // happens entirely inside the notch by default) so the two can never
  // collide — asking him out is its own explicit, separate action.
  const summonPhrase = cleanPrompt(raw);
  if (/\b(?:come out|come here|come on (?:my|the) screen|show yourself|step out|join me)\b/i.test(summonPhrase)) {
    logMac("delegate.summon_intent", {});
    sendToRenderer("braino-mac:summon", {});
    return { ok: true, say: "" };
  }
  // The reverse: "go back", "you can go home", "back in the notch", "tuck in".
  // Without this the LLM would happily SAY "okay, going back" and do nothing.
  if (/\b(?:go|get|head)\s+(?:back|home)\b|\bback\s+(?:in|into|to)\s+(?:the\s+)?notch\b|\btuck\s+(?:yourself\s+)?in\b|\breturn\s+home\b/i.test(summonPhrase)
    && !/\b(?:tab|page|song|track|music|video|window|screen|file|folder)\b/i.test(summonPhrase)) {
    logMac("delegate.summon_home_intent", {});
    sendToRenderer("braino-mac:summon-home", {});
    return { ok: true, say: "" };
  }

  const notchPhrase = cleanPrompt(raw);
  if (/\bnotch\s*(?:braino|face)?\b/i.test(notchPhrase)
    && /\b(?:hide|remove|show|bring back|turn\s+(?:on|off)|\bon\b|\boff\b)\b/i.test(notchPhrase)) {
    const on = !/\b(?:hide|remove|off)\b/i.test(notchPhrase);
    logMac("delegate.notch_face_intent", { on });
    sendToRenderer("braino-mac:notch-face", { on });
    return { ok: true, say: on ? "Notch face is back." : "Okay, leaving the notch alone." };
  }

  // Diagnostics first — "why aren't you reading my whatsapps" would otherwise
  // match the enable phrasing below.
  if (/\b(?:why|test|check|debug)\b.*\bwhats\s*app\b.*\b(?:notifs?|notifications?|read|reader|messages?)\b/i.test(cleanPrompt(raw))
    || /\bwhats\s*app\b.*\bnot\s+(?:working|reading|speaking)\b/i.test(cleanPrompt(raw))) {
    logMac("delegate.wa_diagnostics_intent", {});
    return whatsAppListenerDiagnostics();
  }

  const waListenerIntent = parseWaListenerIntent(raw);
  if (waListenerIntent) {
    logMac("delegate.whatsapp_listener_intent", { enable: waListenerIntent.enable });
    return waListenerIntent.enable ? startWhatsAppListener({ announce: true }) : stopWhatsAppListener();
  }

  // Gmail reply first — an email "reply" must beat the WhatsApp reply intent
  // when we're actually on a mail thread.
  const gmailReply = parseGmailReplyIntent(raw);
  if (gmailReply) {
    logMac("delegate.gmail_reply_intent", { hasInstruction: Boolean(gmailReply.instruction) });
    return replyToOpenGmail(gmailReply.instruction);
  }

  const waReply = parseWhatsAppReplyIntent(raw);
  if (waReply && lastIncomingWhatsApp && Date.now() - lastIncomingWhatsApp.at < 15 * 60 * 1000) {
    logMac("delegate.whatsapp_reply_intent", { to: textForLog(lastIncomingWhatsApp.name), messageChars: waReply.message.length });
    return sendWhatsAppMessage(lastIncomingWhatsApp.name, waReply.message);
  }

  const whatsAppRemember = parseWhatsAppRememberIntent(raw);
  if (whatsAppRemember) {
    logMac("delegate.whatsapp_remember_intent", {
      alias: textForLog(whatsAppRemember.alias),
      hasPhone: Boolean(whatsAppRemember.phone),
    });
    const existing = loadWhatsAppContacts()[whatsAppRemember.alias.toLowerCase()] || {};
    saveWhatsAppContact(whatsAppRemember.alias, {
      ...existing,
      ...(whatsAppRemember.name ? { name: whatsAppRemember.name } : {}),
      ...(whatsAppRemember.phone ? { phone: whatsAppRemember.phone } : {}),
    });
    return {
      ok: true,
      say: whatsAppRemember.phone
        ? `Got it. ${whatsAppRemember.alias} is saved with that number.`
        : `Got it. Your ${whatsAppRemember.alias} is ${whatsAppRemember.name}.`,
    };
  }

  const whatsAppIntent = parseWhatsAppIntent(raw);
  if (whatsAppIntent) {
    logMac("delegate.whatsapp_intent", {
      raw: textForLog(raw),
      recipient: textForLog(whatsAppIntent.recipient || ""),
      messageChars: (whatsAppIntent.message || "").length,
      needsMessage: whatsAppIntent.needsMessage,
      needsRecipient: whatsAppIntent.needsRecipient,
    });
    if (whatsAppIntent.needsRecipient) {
      setPendingMacWorkflow({ type: "whatsapp", stage: "whatsapp_recipient", data: { message: whatsAppIntent.message || "" } });
      return { ok: true, say: "Sure. Who should I send it to on WhatsApp?" };
    }
    if (whatsAppIntent.needsMessage) {
      setPendingMacWorkflow({ type: "whatsapp", stage: "whatsapp_message", data: { recipient: whatsAppIntent.recipient } });
      return { ok: true, say: `What should I say to ${whatsAppIntent.recipient}?` };
    }
    return sendWhatsAppMessage(whatsAppIntent.recipient, whatsAppIntent.message);
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

  // "Close the tabs" = wipe them all. Anchored so "close the YOUTUBE tabs"
  // stays a site-specific close, not a scorched-earth one.
  if (/^close\s+(?:all\s+)?(?:the\s+|my\s+)?(?:browser\s+)?tabs$/i.test(cleanPrompt(raw).replace(/[?.!]+\s*$/, ""))) {
    logMac("delegate.close_all_tabs_intent", {});
    return closeAllBrowserTabs();
  }

  // "How many tabs do I have open?" — count AND understand: he groups them by
  // what you're actually doing, not just a number.
  if (/\bhow many\b.*\btabs\b/i.test(cleanPrompt(raw)) || /\bwhat(?:'s| is| are)\b.*\b(?:my\s+)?tabs\b.*\b(?:open|about)\b/i.test(cleanPrompt(raw))) {
    logMac("delegate.tab_census_intent", {});
    return describeOpenTabs();
  }

  const closeTarget = extractCloseShortcutTarget(raw);
  if (closeTarget && !/\bbraino\b/i.test(closeTarget) && !parseSpotifyControlIntent(raw)) {
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

  // "create a redundant folder for the useless files" is the cleanup skill,
  // not a request for an empty folder.
  const createFolderIntent = parseFileCleanupIntent(raw) ? null : parseCreateFolderIntent(raw);
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

  // "move cursor to the left" is a WINDOW command, not a file move — the
  // window intent parses later but must win here.
  const moveFileIntent = parseWindowManageIntent(raw) ? null : parseMoveFileIntent(raw);
  if (moveFileIntent) {
    logMac("delegate.move_file_intent", {
      raw: textForLog(raw),
      query: moveFileIntent.query,
      kind: moveFileIntent.kind || "",
      destination: moveFileIntent.destination,
    });
    return moveMacFile(moveFileIntent);
  }

  // The redundant-folder intents parse later in this router but MUST win over
  // the generic find-and-delete path — "delete the files in the redundant
  // folder" is folder management, not a Spotlight hunt.
  const deleteFileIntent = parseFileCleanupIntent(raw) ? null : parseDeleteFileIntent(raw);
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

  const selectedTextIntent = parseSelectedTextIntent(raw);
  if (selectedTextIntent) {
    logMac("delegate.ax_selection_intent", { raw: textForLog(raw), verb: selectedTextIntent.verb });
    return actOnSelectedText(selectedTextIntent);
  }

  const windowIntent = parseWindowManageIntent(raw);
  if (windowIntent) {
    logMac("delegate.ax_window_intent", { raw: textForLog(raw), action: windowIntent.action, appQuery: textForLog(windowIntent.appQuery) });
    return axManageWindow(windowIntent);
  }

  // Maps + Amazon must beat the generic screen-point/click intents: "show me
  // where X is on the map" is Maps, not vision-pointing at the screen.
  const mapsIntentEarly = parseMapsIntent(raw);
  if (mapsIntentEarly) {
    logMac("delegate.maps_intent", { mode: mapsIntentEarly.mode, dest: textForLog(mapsIntentEarly.destination || mapsIntentEarly.place || "") });
    if (mapsIntentEarly.mode === "ask") return { ok: true, say: "Sure — which place should I pull up?" };
    return mapsIntentEarly.mode === "show" ? runMapsShow(mapsIntentEarly.place) : runMapsDirections(mapsIntentEarly);
  }

  const amazonIntentEarly = parseAmazonIntent(raw);
  if (amazonIntentEarly) {
    logMac("delegate.amazon_intent", { mode: amazonIntentEarly.mode, product: textForLog(amazonIntentEarly.product || "") });
    return runAmazonSearch(amazonIntentEarly.product);
  }

  const axClickIntent = parseAxClickIntent(raw);
  if (axClickIntent) {
    logMac("delegate.ax_click_intent", { raw: textForLog(raw), target: textForLog(axClickIntent.target) });
    return axClick(axClickIntent);
  }

  const screenPoint = parseScreenPointIntent(raw);
  if (screenPoint) {
    logMac("delegate.screen_point_intent", { raw: textForLog(raw), target: textForLog(screenPoint.target) });
    return runScreenPoint(screenPoint.target, raw);
  }

  const screenVision = parseScreenVisionIntent(raw);
  if (screenVision) {
    logMac("delegate.screen_vision_intent", { raw: textForLog(raw) });
    return runScreenVision(screenVision.question);
  }

  if (/\b(what is open|front window|current app|active app)\b/.test(text)) {
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
    if (/\b(?:chrome|browser|tab)\b/i.test(raw)) {
      await openChromeUrl(`https://www.google.com/search?q=${encodeURIComponent(webQuery)}`);
      return { ok: true, say: `Searching Chrome for ${webQuery}.` };
    }
    return runMacWebSearch(webQuery);
  }

  const youtubePick = parseYouTubePickIntent(raw);
  if (youtubePick) {
    logMac("delegate.youtube_pick_intent", { title: textForLog(youtubePick.item.title) });
    await openChromeUrl(`https://www.youtube.com/watch?v=${youtubePick.item.videoId}`);
    return { ok: true, say: `Playing ${youtubePick.item.title} on YouTube.` };
  }

  const youtubeIntent = parseYouTubeIntent(raw);
  if (youtubeIntent) {
    logMac("delegate.youtube_intent", {
      action: youtubeIntent.action,
      query: textForLog(youtubeIntent.query),
    });
    if (youtubeIntent.action === "channel") return openYouTubeChannelFlow(youtubeIntent.query);
    if (youtubeIntent.action === "search") return searchYouTubeSpoken(youtubeIntent.query);
    return playYouTubeVideo(youtubeIntent.query);
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

  // Intelligence layer, rule zero: a QUESTION is not a command. "If I delete
  // the dmg, will I also lose the app?" contains "delete the dmg" but the
  // user is asking about consequences — action intents must never see it.
  const questionProbe = cleanPrompt(raw);
  const isConsequenceQuestion = /^if\s+(?!you\b)/i.test(questionProbe)
    || /\bwill (?:i|it|this|that|we)\b/i.test(questionProbe)
    || /\bwhat (?:happens|would happen)\b/i.test(questionProbe)
    || /\bdoes (?:that|this|it) (?:mean|also|affect|break|delete|remove)\b/i.test(questionProbe)
    || /\b(?:is it safe|would that|am i going to)\b/i.test(questionProbe);
  if (isConsequenceQuestion) {
    logMac("delegate.question_not_command", { raw: textForLog(raw) });
    return runMacConversation(raw);
  }

  // (maps + amazon intents moved earlier, before screen-point/click)
  if (parseSendToPhoneIntent(raw)) {
    logMac("delegate.send_to_phone_intent", {});
    return sendToPhone("");
  }

  const researchIntent = parseResearchIntent(raw);
  if (researchIntent) {
    logMac("delegate.research_intent", { query: textForLog(researchIntent.query) });
    return runResearch(researchIntent.query);
  }

  const wallpaperIntent = parseWallpaperIntent(raw);
  if (wallpaperIntent) {
    logMac("delegate.wallpaper_intent", { mode: wallpaperIntent.mode, subject: textForLog(wallpaperIntent.subject || "") });
    if (wallpaperIntent.mode === "restore") return restoreWallpaper();
    if (wallpaperIntent.mode === "web") return setWallpaperFromWeb(wallpaperIntent.subject);
    return setRandomOfficialWallpaper();
  }

  if (parseScreenshotIntent(raw)) {
    logMac("delegate.screenshot_intent", {});
    return takeScreenshot();
  }

  // Screen recording first — bare "record this" is video, not a meeting.
  const screenRecIntent = parseScreenRecordIntent(raw);
  if (screenRecIntent) {
    logMac("delegate.screenrec_intent", { action: screenRecIntent.action });
    return screenRecIntent.action === "start" ? startScreenRecording() : stopScreenRecording();
  }

  const meetingIntent = parseMeetingIntent(raw);
  if (meetingIntent) {
    logMac("delegate.meeting_intent", { action: meetingIntent.action });
    return meetingIntent.action === "start"
      ? startMeetingRecording(/\bcall\b/i.test(cleanPrompt(raw)) ? "call" : "meeting")
      : stopMeetingRecording();
  }

  // ── Braino Cowork intents (before the ambient ones, so "stop watching my
  // work" lands here and not on the ambient mute) ──
  const coworkProbe = cleanPrompt(raw);
  const coworkEvery = coworkProbe.match(/\b(?:check (?:in )?on me|watch(?: my work| me)?|look at my screen)\s+every\s+(\d+)\s*(seconds?|secs?|minutes?|mins?)\b/i);
  if (coworkEvery) {
    const n = Number(coworkEvery[1]);
    const ms = /min/i.test(coworkEvery[2]) ? n * 60000 : n * 1000;
    const clamped = Math.min(COWORK_MAX_INTERVAL_MS, Math.max(COWORK_MIN_INTERVAL_MS, ms));
    logMac("delegate.cowork_interval_intent", { requestedMs: ms, clampedMs: clamped });
    setCoworkState({ enabled: true, intervalMs: clamped });
    const cadence = clamped >= 60000
      ? `${Math.round(clamped / 60000)} minute${clamped >= 120000 ? "s" : ""}`
      : `${Math.round(clamped / 1000)} seconds`;
    return { ok: true, say: `Cowork mode on. I will check on your work every ${cadence}.` };
  }
  if (/\b(?:start|begin|enter|turn on|enable)\s+(?:braino\s+)?co-?work(?:ing)?(?:\s+mode)?(?:\s+simple)?\b/i.test(coworkProbe)
    || /\b(?:co-?work|work)\s+with\s+me\b/i.test(coworkProbe)
    || /\blet'?s\s+work\s+together\b/i.test(coworkProbe)
    || /\bwatch\s+(?:me\s+work|my\s+work)\b/i.test(coworkProbe)) {
    logMac("delegate.cowork_on_intent", {});
    setCoworkState({ enabled: true });
    setNotchCoworkLabel("co-work"); // the island wears the label
    return { ok: true, say: "Cowork mode on. I will keep an eye on your work and speak up when I can actually help. Say stop cowork whenever." };
  }
  if (/\b(?:stop|end|exit|turn off|disable)\s+(?:braino\s+)?co-?work(?:ing)?(?:\s+mode)?\b/i.test(coworkProbe)
    || /\bstop\s+watching\s+(?:me|my\s+work)\b/i.test(coworkProbe)) {
    logMac("delegate.cowork_off_intent", {});
    setCoworkState({ enabled: false });
    setNotchCoworkLabel("");
    return { ok: true, say: "Cowork mode off. Back to minding my own business." };
  }

  // Cowork Ability #1 — design handoff. Explicit trigger OR a vague design ask
  // that the intelligence layer will route here (see classifyIntentLLM's
  // design_cowork tool). Deterministic once it fires; every step is
  // vision-gated inside runDesignCowork.
  if (/\b(?:ask|get)\s+claude\s+design\b/i.test(coworkProbe)
    || /\b(?:make|build|design)\s+(?:me\s+)?(?:a\s+)?better\s+(?:version|design)\b/i.test(coworkProbe)
    || /\blook\s+at\s+(?:this|my\s+(?:site|website|design|screen))\b.*\b(?:design|better|redesign|claude)\b/i.test(coworkProbe)) {
    logMac("delegate.cowork_design_intent", {});
    return runDesignCowork(raw);
  }

  const ambientProbe = cleanPrompt(raw);
  if (/\b(?:don'?t|do not|stop)\s+(?:disturb|bother|interrupt)(?:ing)?\s*(?:me)?\b/i.test(ambientProbe)) {
    logMac("delegate.ambient_mute_intent", {});
    sendToRenderer("braino-mac:ambient-toggle", { enabled: false });
    return { ok: true, say: "Understood. I will keep my eyes to myself until you say otherwise." };
  }
  if (/\b(?:you can|feel free to)\s+(?:disturb|bother|interrupt|check (?:in )?on) me\b/i.test(ambientProbe)
    || /\b(?:start|resume)\s+(?:checking (?:in )?on|watching over) me\b/i.test(ambientProbe)) {
    logMac("delegate.ambient_unmute_intent", {});
    sendToRenderer("braino-mac:ambient-toggle", { enabled: true });
    return { ok: true, say: "Good. I like keeping you company." };
  }

  if (parseRepeatSpeechIntent(raw)) {
    logMac("delegate.repeat_speech_intent", { hasLast: Boolean(lastDelegateSay) });
    return lastDelegateSay
      ? { ok: true, say: lastDelegateSay }
      : { ok: true, say: "I have not said anything worth repeating yet." };
  }

  const xIntent = parseXIntent(raw);
  if (xIntent) {
    logMac("delegate.x_intent", { raw: textForLog(raw), action: xIntent.action });
    if (xIntent.action === "stats") return speakXStats();
    if (xIntent.action === "mentions") return speakXMentions();
    if (xIntent.action === "clip") return recordScreenClip(xIntent.seconds);
    if (xIntent.action === "tweet_clip") return tweetLastClip(xIntent.caption);
  }

  const mesaIntent = parseMesaIntent(raw);
  if (mesaIntent) {
    logMac("delegate.mesa_intent", { raw: textForLog(raw) });
    return runMesaCheckIn();
  }

  const countIntent = parseCountItemsIntent(raw);
  if (countIntent) {
    logMac("delegate.count_items_intent", { term: textForLog(countIntent.term), kind: countIntent.kind });
    return countMatchingItems(countIntent);
  }

  const cleanupIntent = parseFileCleanupIntent(raw);
  if (cleanupIntent) {
    logMac("delegate.file_cleanup_intent", { raw: textForLog(raw), action: cleanupIntent.action });
    if (cleanupIntent.action === "delete") return deleteReviewBin();
    if (cleanupIntent.action === "restore") return restoreReviewBin();
    if (cleanupIntent.action === "recover") return recoverRedundantItem(cleanupIntent.phrase);
    if (cleanupIntent.action === "list") return listRedundantContents();
    if (cleanupIntent.action === "open") return openRedundantFolder();
    if (cleanupIntent.action === "delete_current") return deleteCurrentFinderFolder();
    if (cleanupIntent.action === "create_direct") {
      sendTaskProgress({ status: "thinking", text: "Scanning for what you don't need" });
      const items = await scanCleanupCandidates();
      if (!items.length) return { ok: true, say: "I looked — nothing is stale enough to park. Your stuff is in use." };
      return createRedundantFolder(items.map((c) => ({ name: c.name, full: c.full, size: c.size, isDir: c.isDir, isCapture: c.isCapture })));
    }
    if (cleanupIntent.action === "screenshots") return cleanScreenshots();
    return suggestFileCleanup();
  }

  const taskHogIntent = parseTaskHogIntent(raw);
  if (taskHogIntent) {
    logMac("delegate.task_hog_intent", { raw: textForLog(raw), action: taskHogIntent.action });
    return taskHogIntent.action === "close" ? closeTaskHogs() : reportTaskHogs();
  }

  const netflixWatch = parseNetflixWatchIntent(raw);
  if (netflixWatch) {
    logMac("delegate.netflix_watch_intent", { raw: textForLog(raw), title: textForLog(netflixWatch.title) });
    return resumeNetflixOnMac(netflixWatch.title);
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

  // First-layer understanding for "open ...": figure out WHAT the user wants
  // before firing anything. "the amazon page for <book>" is a product page,
  // not an app named "Amazon page for...".
  const semanticOpen = parseSemanticOpenIntent(raw);
  if (semanticOpen) {
    logMac("delegate.semantic_open_intent", { site: semanticOpen.site, subject: textForLog(semanticOpen.subject) });
    sendTaskProgress({ status: "thinking", text: `${semanticOpen.siteName}: ${semanticOpen.subject.slice(0, 40)}` });
    await openChromeUrl(semanticOpen.url);
    return { ok: true, say: `${semanticOpen.subject} on ${semanticOpen.siteName}, coming up.` };
  }

  const appName = extractAfter(raw, [
    /\b(?:open|launch|start)\s+(?:the\s+)?(?:app\s+)?([A-Za-z][\w\s.&-]{0,60}?)(?:\s+app)?(?:\s+for\s+me)?$/i,
  ]);
  if (appName && !isLikelyUrl(appName)) {
    const target = cleanOpenTarget(appName);
    logMac("delegate.open_intent", { raw: textForLog(raw), target });
    // Order matters: exact app -> KNOWN website -> user's files -> fuzzy app.
    // Fuzzy app used to run first and "win" on garbage (google docs ->
    // Google Chrome), starving the correct web/file fallbacks.
    const appResult = await openApp(target, { allowFuzzy: false });
    if (appResult.ok) {
      return { ok: true, say: `Opening ${appResult.appName || target}.` };
    }
    const website = commonWebTargetFor(target);
    if (website) {
      logMac("delegate.open_web_fallback", { target, website });
      await openChromeUrl(website);
      const host = new URL(website).hostname.replace(/^www\./, "");
      return { ok: true, say: `Opening ${host}.` };
    }
    const files = await findFiles(target, { kind: "" });
    if (files.length) {
      const opened = await openLocalPath(files[0]);
      if (!opened.ok) return { ok: false, say: `I found ${path.basename(files[0])}, but macOS would not open it: ${opened.error}.`, files };
      return { ok: true, say: `Opened ${path.basename(files[0])}.`, files };
    }
    const fuzzyResult = await openApp(target);
    if (fuzzyResult.ok) {
      return { ok: true, say: `Opening ${fuzzyResult.appName || target}.` };
    }
  }

  if (/\bchrome\b|\bbrowser\b|\bsearch\b|\bopen\b/.test(text)) {
    // Before shrugging to a web search: the thing the user wants to open is
    // very often ON SCREEN right now (a project in Cursor's welcome list, an
    // item in a picker). Try clicking it where they're looking first.
    const openTarget = cleanPrompt(raw).match(/\bopen\s+(?:the\s+)?(.+?)(?:\s+project)?[?.!]*$/i)?.[1]?.trim();
    if (openTarget && openTarget.length > 2) {
      const pressed = await runAxHelper(["press", openTarget]);
      logMac("delegate.open_screen_first", { target: textForLog(openTarget), status: pressed.status, detail: textForLog(pressed.detail) });
      if (pressed.status === "pressed") return { ok: true, say: `Opened ${pressed.detail}.` };
    }
    // No regex claimed it — ask a real model what the user MEANT instead of
    // blindly googling the raw sentence.
    sendTaskProgress({ status: "thinking", text: "understanding what you meant..." });
    const classified = await classifyIntentLLM(raw);
    if (classified) return executeClassifiedIntent(classified, raw);
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

// Every feature run gets one complete audit line: what was heard, what was
// answered, how long it took, and a deterministic efficiency score —
// 100 base for a clean fast run, docked for slowness, floored on failure.
function featureEfficiencyPct(ok, durationMs) {
  if (!ok) return 25;
  if (durationMs <= 2000) return 100;
  if (durationMs <= 5000) return 92;
  if (durationMs <= 10000) return 82;
  if (durationMs <= 20000) return 70;
  return 60;
}

ipcMain.handle("braino-mac:delegate", async (_event, prompt) => {
  const startedAt = Date.now();
  const result = await runDelegate(prompt);
  const durationMs = Date.now() - startedAt;
  const ok = Boolean(result?.ok);
  if (result?.say && String(result.say).trim()) lastDelegateSay = String(result.say).trim();
  logMac("feature.executed", {
    heard: textForLog(String(prompt || "").slice(0, 160)),
    responded: textForLog(String(result?.say || "").slice(0, 160)),
    ok,
    durationMs,
    efficiencyPct: featureEfficiencyPct(ok, durationMs),
    pendingWorkflow: result?.delegateState?.workflowStage || "",
  });
  return result;
});

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

// ── Notch tray backend: universal now-playing, media/system-volume controls,
// calendar Join, dropped-file shelf actions, power + Bluetooth watchers. The
// tray is the hover-expanded island in the renderer; everything here just
// feeds or obeys it. ──

async function readAppleMusicState() {
  const script = `
tell application "System Events"
  set musicRunning to exists application process "Music"
end tell
if musicRunning then
  tell application "Music"
    set stateText to player state as text
    set trackName to ""
    set artistName to ""
    set posText to ""
    set durText to ""
    try
      set trackName to name of current track
      set artistName to artist of current track
      set durText to (duration of current track) as text
      set posText to player position as text
    end try
    return stateText & linefeed & trackName & linefeed & artistName & linefeed & posText & linefeed & durText
  end tell
else
  return "not running"
end if`;
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", script], { timeout: 4000 });
    const [state = "", name = "", artist = "", posText = "", durText = ""] = stdout.trim().split(/\r?\n/);
    return {
      ok: true,
      state,
      name,
      artist,
      positionSec: Number.isFinite(Number(posText)) ? Number(posText) : null,
      durationSec: Number.isFinite(Number(durText)) && Number(durText) > 0 ? Number(durText) : null,
    };
  } catch (error) {
    return { ok: false, error: error?.message || "Could not read Music state." };
  }
}

// One poll, every playback source: Spotify (artwork + progress), Apple Music
// (progress), the YouTube state the music watcher already resolved. Sent every
// beat — the renderer owns change detection, and the tray wants live progress.
let nowPlayingPollBusy = false;
async function pollNowPlaying() {
  if (nowPlayingPollBusy || !dockWindow || dockWindow.isDestroyed()) return;
  nowPlayingPollBusy = true;
  try {
    let candidate = null;
    const spotify = await readSpotifyMacState().catch(() => null);
    if (spotify?.ok && spotify.name) {
      candidate = {
        source: "spotify",
        track: spotify.name,
        artist: spotify.artist || "",
        playing: /playing/i.test(spotify.state || ""),
        artworkUrl: spotify.artworkUrl || "",
        positionSec: spotify.positionSec,
        durationSec: spotify.durationSec,
        canControl: true,
      };
    }
    if (!candidate?.playing) {
      const music = await readAppleMusicState().catch(() => null);
      if (music?.ok && music.name) {
        const musicCandidate = {
          source: "music",
          track: music.name,
          artist: music.artist || "",
          playing: /playing/i.test(music.state || ""),
          artworkUrl: "",
          positionSec: music.positionSec,
          durationSec: music.durationSec,
          canControl: true,
        };
        // A playing source always beats a paused one.
        if (!candidate || musicCandidate.playing) candidate = musicCandidate;
      }
    }
    if (!candidate?.playing && musicPlaying && musicSource === "youtube" && lastMusicTrack) {
      candidate = {
        source: "youtube",
        track: lastMusicTrack,
        artist: lastMusicArtist,
        playing: true,
        artworkUrl: "",
        positionSec: null,
        durationSec: null,
        canControl: false,
      };
    }
    sendToRenderer("braino-mac:nowplaying", candidate || { source: "", track: "", playing: false });
  } finally {
    nowPlayingPollBusy = false;
  }
}

// Voice ducking: music through the speakers drowns the mic — VAD fires on
// Spotify, the user's words never survive a turn, and realtime feels broken.
// So the moment a voice session starts, the PLAYER volume dips to ~20% (his
// own TTS rides system volume, untouched) and is restored on session end.
let musicDuckState = null; // { source, volume }

async function readAppleMusicVolume() {
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", 'tell application "Music" to sound volume as text'], { timeout: 3000 });
    const volume = Number(String(stdout).trim());
    return Number.isFinite(volume) ? volume : null;
  } catch (_) {
    return null;
  }
}

async function setPlayerVolume(source, volume) {
  const appName = source === "music" ? "Music" : "Spotify";
  await execFileP("/usr/bin/osascript", ["-e", `tell application "${appName}" to set sound volume to ${Math.max(0, Math.min(100, Math.round(volume)))}`], { timeout: 4000 });
}

ipcMain.handle("braino-mac:music-duck", async (_event, payload = {}) => {
  const wantDuck = Boolean(payload?.duck);
  try {
    if (wantDuck) {
      if (musicDuckState) return { ok: true, already: true };
      const spotify = await readSpotifyMacState().catch(() => null);
      if (spotify?.ok && /playing/i.test(spotify.state || "") && spotify.volumePercent != null) {
        musicDuckState = { source: "spotify", volume: spotify.volumePercent };
        await setPlayerVolume("spotify", Math.max(8, Math.round(spotify.volumePercent * 0.2)));
        logMac("music.duck", musicDuckState);
        return { ok: true, ducked: "spotify" };
      }
      const music = await readAppleMusicState().catch(() => null);
      if (music?.ok && /playing/i.test(music.state || "")) {
        const volume = await readAppleMusicVolume();
        if (volume != null) {
          musicDuckState = { source: "music", volume };
          await setPlayerVolume("music", Math.max(8, Math.round(volume * 0.2)));
          logMac("music.duck", musicDuckState);
          return { ok: true, ducked: "music" };
        }
      }
      return { ok: true, ducked: "" };
    }
    if (!musicDuckState) return { ok: true };
    const restore = musicDuckState;
    musicDuckState = null;
    await setPlayerVolume(restore.source, restore.volume);
    logMac("music.unduck", restore);
    return { ok: true, restored: restore.source };
  } catch (error) {
    logMac("music.duck.failed", { wantDuck, error });
    musicDuckState = null;
    return { ok: false };
  }
});

ipcMain.handle("braino-mac:timer-cancel", (_event, payload = {}) => {
  const id = String(payload?.id || "");
  const timer = activeTimers.find((t) => t.id === id);
  if (!timer) return { ok: false };
  clearTimeout(timer.handle);
  activeTimers = activeTimers.filter((t) => t.id !== id);
  broadcastTimers();
  logMac("timer.cancelled_from_tray", { kind: timer.kind || "timer", label: textForLog(timer.label) });
  return { ok: true };
});

ipcMain.handle("braino-mac:stopwatch-control", (_event, payload = {}) => {
  return handleStopwatch({ action: String(payload?.action || "read") });
});

ipcMain.handle("braino-mac:media-control", async (_event, payload = {}) => {
  const action = String(payload?.action || "").toLowerCase();
  const source = String(payload?.source || "spotify").toLowerCase();
  logMac("tray.media_control", { action, source });
  if (!["toggle", "play", "pause", "next", "previous"].includes(action)) return { ok: false };
  if (source === "music") {
    const map = { toggle: "playpause", play: "play", pause: "pause", next: "next track", previous: "previous track" };
    try {
      await execFileP("/usr/bin/osascript", ["-e", `tell application "Music" to ${map[action]}`], { timeout: 5000 });
      return { ok: true };
    } catch (error) {
      logMac("tray.media_control.music_failed", { error });
      return { ok: false };
    }
  }
  let resolved = action;
  if (action === "toggle") {
    const state = await readSpotifyMacState().catch(() => null);
    resolved = state?.ok && /playing/i.test(state.state || "") ? "pause" : "play";
  }
  return controlSpotifyPlaybackOnMac(resolved);
});

ipcMain.handle("braino-mac:system-volume", async (_event, payload = {}) => {
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", "output volume of (get volume settings)"], { timeout: 3000 });
    const current = Number(String(stdout).trim());
    let target = Number.isFinite(Number(payload?.set)) ? Number(payload.set) : null;
    if (target === null && Number.isFinite(Number(payload?.delta))) target = current + Number(payload.delta);
    if (target === null) return { ok: true, volume: current };
    target = Math.max(0, Math.min(100, Math.round(target)));
    await execFileP("/usr/bin/osascript", ["-e", `set volume output volume ${target}`], { timeout: 3000 });
    return { ok: true, volume: target };
  } catch (error) {
    logMac("tray.system_volume.failed", { error });
    return { ok: false };
  }
});

ipcMain.handle("braino-mac:calendar-join", async () => {
  const joinUrl = calendarNext?.joinUrl || "";
  if (!joinUrl) return { ok: false, say: "I do not see a call link on that event." };
  logMac("tray.calendar_join", { title: calendarNext?.title || "", url: textForLog(joinUrl) });
  await openChromeUrl(joinUrl);
  // Give the call page a breath to load, then arm the recorder automatically —
  // one click from notch to recorded meeting.
  setTimeout(() => {
    try { startMeetingRecording(calendarNext?.title || "meeting"); } catch (_) {}
  }, 6000);
  return { ok: true, say: `Joining ${calendarNext?.title || "the meeting"}. I will record and take notes.` };
});

ipcMain.handle("braino-mac:shelf-file", async (_event, payload = {}) => {
  const filePath = String(payload?.path || "");
  const action = String(payload?.action || "");
  if (!filePath || !fs.existsSync(filePath)) return { ok: false, say: "That file is gone." };
  logMac("tray.shelf_file", { action, path: textForLog(filePath) });
  try {
    if (action === "open") {
      await execFileP("/usr/bin/open", [filePath], { timeout: 8000 });
      return { ok: true };
    }
    if (action === "reveal") {
      await execFileP("/usr/bin/open", ["-R", filePath], { timeout: 8000 });
      return { ok: true };
    }
    if (action === "trash") {
      await execFileP("/usr/bin/osascript", ["-e", `tell application "Finder" to delete POSIX file ${JSON.stringify(filePath)}`], { timeout: 8000 });
      return { ok: true, say: "In the Trash." };
    }
  } catch (error) {
    logMac("tray.shelf_file.failed", { action, error });
  }
  return { ok: false };
});

// Cursor-zone watcher: the renderer cannot see the mouse while the window is
// click-through mid-drag (macOS sends drag events, not mouseMoved), so the
// MAIN process watches the real cursor. Inside the notch zone → tell the
// renderer, which flips interactivity and opens the tray. This is what makes
// hover-to-expand and drag-a-file-onto-the-notch both work.
let notchZoneInside = false;
let notchZoneExpanded = false;

ipcMain.on("braino-mac:notch-zone-size", (_event, payload) => {
  notchZoneExpanded = Boolean(payload?.expanded);
});

setInterval(() => {
  if (!dockWindow || dockWindow.isDestroyed() || !dockWindow.isVisible()) return;
  try {
    const point = screen.getCursorScreenPoint();
    const bounds = dockWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    // Collapsed zone hugs the PHYSICAL notch (measured housing), nothing
    // more — a fat zone was eating clicks on Chrome's tab strip, which sits
    // exactly in this band when the window is maximized. Only the open tray
    // earns a generous halo.
    const notchW = cachedNotchMetrics?.width || 190;
    const notchH = cachedNotchMetrics?.height || 33;
    const halfWidth = notchZoneExpanded ? 340 : notchW / 2 + 8;
    const height = notchZoneExpanded ? 260 : notchH + 26;
    const inside = Math.abs(point.x - centerX) <= halfWidth
      && point.y >= bounds.y
      && point.y <= bounds.y + height;
    if (inside !== notchZoneInside) {
      notchZoneInside = inside;
      sendToRenderer("braino-mac:notch-zone", { inside });
    }
  } catch (_) {}
}, 130);

// Power watcher: percent + charging state. Events fire on plug/unplug and on
// crossing the 20% / 10% lines while discharging, so the island can react.
let lastPowerState = null;
async function checkPowerState() {
  try {
    const { stdout } = await execFileP("/usr/bin/pmset", ["-g", "batt"], { timeout: 4000 });
    const text = String(stdout || "");
    const pctMatch = text.match(/(\d{1,3})%/);
    const percent = pctMatch ? Number(pctMatch[1]) : null;
    const onAc = /AC Power/i.test(text);
    const charging = /;\s*charging/i.test(text);
    let event = "";
    if (lastPowerState) {
      if (onAc && !lastPowerState.onAc) event = "plugged";
      else if (!onAc && lastPowerState.onAc) event = "unplugged";
      else if (!onAc && percent !== null && lastPowerState.percent !== null) {
        if (percent <= 10 && lastPowerState.percent > 10) event = "critical";
        else if (percent <= 20 && lastPowerState.percent > 20) event = "low";
      }
    }
    const next = { percent, onAc, charging };
    const changed = !lastPowerState
      || lastPowerState.percent !== percent
      || lastPowerState.onAc !== onAc
      || lastPowerState.charging !== charging;
    lastPowerState = next;
    if (changed || event) {
      if (event) logMac("tray.power", { ...next, event });
      sendToRenderer("braino-mac:power", { ...next, event });
    }
  } catch (_) {
    // Desktops without a battery land here — stay quiet.
  }
}

// Bluetooth audio watcher: connected headphones/speakers with battery levels.
// system_profiler is slow (~1-2s) so this runs sparsely and off the hot path.
let btKnownNames = new Set();
let btFirstScanDone = false;
let btPollBusy = false;
async function checkBtAudio() {
  if (btPollBusy) return;
  btPollBusy = true;
  try {
    const { stdout } = await execFileP("/usr/sbin/system_profiler", ["SPBluetoothDataType", "-json"], { timeout: 25000, maxBuffer: 4 * 1024 * 1024 });
    const data = JSON.parse(String(stdout || "{}"));
    const connected = data?.SPBluetoothDataType?.[0]?.device_connected || [];
    const devices = [];
    for (const entry of connected) {
      for (const [name, props] of Object.entries(entry || {})) {
        const minorType = String(props?.device_minorType || "");
        const isAudio = /headphone|headset|speaker|earbud/i.test(minorType) || /airpods|buds|headphone|speaker/i.test(name);
        if (!isAudio) continue;
        const battRaw = String(props?.device_batteryLevelMain || props?.device_batteryLevel || "").replace("%", "");
        const battery = Number.isFinite(Number(battRaw)) && battRaw !== "" ? Number(battRaw) : null;
        devices.push({ name, minorType, battery });
      }
    }
    const names = new Set(devices.map((d) => d.name));
    let event = null;
    if (btFirstScanDone) {
      for (const d of devices) {
        if (!btKnownNames.has(d.name)) { event = { type: "connected", name: d.name, battery: d.battery }; break; }
      }
      if (!event) {
        for (const known of btKnownNames) {
          if (!names.has(known)) { event = { type: "disconnected", name: known }; break; }
        }
      }
    }
    const changed = names.size !== btKnownNames.size || [...names].some((n) => !btKnownNames.has(n));
    btKnownNames = names;
    btFirstScanDone = true;
    if (changed || event) {
      if (event) logMac("tray.bt_audio", event);
      sendToRenderer("braino-mac:bt-audio", { devices, event });
    }
  } catch (_) {
    // No Bluetooth data — stay quiet.
  } finally {
    btPollBusy = false;
  }
}

let personaBundleCache = { at: 0, data: null };

ipcMain.handle("braino-mac:persona-bundle", async () => {
  if (personaBundleCache.data && Date.now() - personaBundleCache.at < 10 * 60 * 1000) {
    return personaBundleCache.data;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const authToken = await getBrainoAuthToken();
  if (!authToken) return null;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/persona-bundle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: "{}",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.persona) {
      logMac("persona.bundle.failed", { status: response.status, error: data?.error || null });
      return personaBundleCache.data;
    }
    personaBundleCache = { at: Date.now(), data };
    logMac("persona.bundle.loaded", {
      personaChars: String(data.persona || "").length,
      contextChars: String(data.userContext || "").length,
    });
    return data;
  } catch (error) {
    logMac("persona.bundle.error", { error });
    return personaBundleCache.data;
  }
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
  setTimeout(() => void importAllContacts(), 8000);
  setInterval(() => void checkMusicState(), 5000);
  setInterval(() => void checkAllTabsSnapshot(), 8000);
  void measureNotch();
  // Poll WhatsApp notifications regardless: spoken when the listener is on,
  // stacked as an unread badge in the notch when it is off.
  setTimeout(() => void startWhatsAppListener({ enable: loadWaListenerState() }), 6000);
  setTimeout(() => void checkCalendarNext(), 20000);
  setInterval(() => void checkCalendarNext(), 5 * 60 * 1000);
  restoreTimers();
  // Notch tray feeds: now-playing (live progress), power, Bluetooth audio.
  setTimeout(() => void pollNowPlaying(), 9000);
  setInterval(() => void pollNowPlaying(), 6000);
  setTimeout(() => void checkPowerState(), 12000);
  setInterval(() => void checkPowerState(), 30000);
  setTimeout(() => void checkBtAudio(), 16000);
  setInterval(() => void checkBtAudio(), 60 * 1000);
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
  if (loadWakeWordState()) startBrainoWakeWord();
  startXStatsPolling();
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
