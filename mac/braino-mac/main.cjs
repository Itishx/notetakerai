const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, systemPreferences } = require("electron");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
const INDEX_PATH = path.join(__dirname, "renderer", "index.html");
const HOTKEY_HELPER_PATH = path.join(__dirname, "native", "BrainoControlTap.swift");
const SPEECH_HELPER_PATH = path.join(__dirname, "native", "BrainoSpeech.swift");
const APP_VERSION = "12.0.4";
const ORGANIZED_FOLDER_NAME = "Braino Organized";
const ORGANIZE_MANIFEST_NAME = ".braino-last-organize.json";

let dockWindow = null;
let swiftHotkey = null;
let activeSpeech = null;
let lastControlTapAt = 0;

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
    return { ok: false, error: "Supabase is not configured for transcription." };
  }

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
    return { ok: false, error: data?.error || `Transcription failed (${response.status}).` };
  }

  const transcript = String(data?.transcript || "").trim();
  return transcript
    ? { ok: true, transcript }
    : { ok: false, error: "The audio was recorded, but no speech was detected." };
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
    return { ok: true, say: `I did not have a specific adapter for that yet, so I searched it in Chrome.` };
  }

  return {
    ok: true,
    say: "For the Mac prototype, I can organize your Desktop, open apps, search the web in Chrome, find documents with Spotlight, open files, and tell you the front window. Give me one of those.",
  };
}

ipcMain.handle("braino-mac:get-config", () => ({
  appVersion: APP_VERSION,
  supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
  accessibilityTrusted: systemPreferences.isTrustedAccessibilityClient(false),
}));

ipcMain.handle("braino-mac:delegate", async (_event, prompt) => runDelegate(prompt));

ipcMain.handle("braino-mac:native-listen", async () => runNativeSpeech());

ipcMain.handle("braino-mac:native-listen-stop", () => {
  stopNativeSpeech();
  return { ok: true };
});

ipcMain.handle("braino-mac:transcribe-audio", async (_event, payload) => transcribeAudioCommand(payload));

ipcMain.handle("braino-mac:request-accessibility", () => ({
  accessibilityTrusted: requestAccessibilityTrust(true),
}));

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
  // Keep the menu-barless companion process alive during this prototype.
});
