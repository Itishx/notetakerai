const { contextBridge, ipcRenderer, webUtils } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Same userData path main.cjs writes profiles.mascot's local cache to
// (mascot.json) — read here, synchronously, so the walker mounts with the
// right character's markup from the very first frame. getWalkerSvgFor()
// below lets the renderer also fetch a specific character's markup on
// demand (used to hot-swap when the customizer card's picker changes,
// without needing a restart).
const AUTH_STORE_DIR = path.join(os.homedir(), "Library", "Application Support", "Braino Mac");
const MASCOT_STATE_PATH = path.join(AUTH_STORE_DIR, "mascot.json");

function loadCachedMascotSync() {
  try {
    const id = JSON.parse(fs.readFileSync(MASCOT_STATE_PATH, "utf8"))?.id;
    return id === "webb" || id === "ferro" || id === "brainelle" ? id : "braino";
  } catch (_) {
    return "braino";
  }
}

function loadWalkerSvgSource(fileName, exportName) {
  const sourcePath = path.resolve(__dirname, "../../src/components", fileName);
  let source = fs.readFileSync(sourcePath, "utf8");
  source = source.replace(`export const ${exportName}`, `const ${exportName}`);
  return Function(`${source}\nreturn ${exportName};`)();
}

function walkerSvgFor(mascotId) {
  if (mascotId === "brainelle") return loadWalkerSvgSource("brainelleWalkerSvg.ts", "BRAINELLE_WALKER_SVG");
  if (mascotId === "webb") return loadWalkerSvgSource("webbWalkerSvg.ts", "WEBB_WALKER_SVG");
  if (mascotId === "ferro") return loadWalkerSvgSource("ferroWalkerSvg.ts", "FERRO_WALKER_SVG");
  return loadWalkerSvgSource("brainoWalkerSvg.ts", "BRAINO_WALKER_SVG");
}

const walkerSvg = walkerSvgFor(loadCachedMascotSync());

contextBridge.exposeInMainWorld("brainoMac", {
  getConfig: () => ipcRenderer.invoke("braino-mac:get-config"),
  setMascot: (id) => ipcRenderer.invoke("braino-mac:set-mascot", id),
  getWalkerSvg: () => walkerSvg,
  getWalkerSvgFor: (mascotId) => walkerSvgFor(mascotId),
  log: (payload) => ipcRenderer.invoke("braino-mac:log", payload),
  logInteraction: (payload) => ipcRenderer.invoke("braino-mac:log-interaction", payload || {}),
  activeContext: () => ipcRenderer.invoke("braino-mac:active-context"),
  authStatus: () => ipcRenderer.invoke("braino-mac:auth-status"),
  parakeetState: () => ipcRenderer.invoke("braino-mac:parakeet-state"),
  parakeetControl: (payload) => ipcRenderer.invoke("braino-mac:parakeet-control", payload || {}),
  brainoCodeStart: (brief, parentBuildId) =>
    ipcRenderer.invoke("braino-code:start", { brief, parentBuildId: parentBuildId || null }),
  brainoCodeStatus: (buildId) => ipcRenderer.invoke("braino-code:status", { buildId }),
  brainoCodeSource: (buildId) => ipcRenderer.invoke("braino-code:source", { buildId }),
  // Braino Code: main tells the dashboard which build to open after a spoken
  // "build me a website".
  onBrainoCodeOpen: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-code:open", handler);
    return () => ipcRenderer.removeListener("braino-code:open", handler);
  },
  onDictationFallback: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:dictation-fallback", handler);
    return () => ipcRenderer.removeListener("braino-mac:dictation-fallback", handler);
  },
  onDictationUi: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:dictation-ui", handler);
    return () => ipcRenderer.removeListener("braino-mac:dictation-ui", handler);
  },
  onDictationPartial: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:dictation-partial", handler);
    return () => ipcRenderer.removeListener("braino-mac:dictation-partial", handler);
  },
  permissionReport: () => ipcRenderer.invoke("braino-mac:permission-report"),
  permissionAsk: (kind) => ipcRenderer.invoke("braino-mac:permission-ask", { kind }),
  onPermissionNeeded: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:permission-needed", handler);
    return () => ipcRenderer.removeListener("braino-mac:permission-needed", handler);
  },
  dashboardState: () => ipcRenderer.invoke("braino-mac:dashboard-state"),
  dashboardData: (key) => ipcRenderer.invoke("braino-mac:dashboard-data", key),
  dashboardOpen: () => ipcRenderer.invoke("braino-mac:dashboard-open"),
  setWindowTheme: (theme) => ipcRenderer.invoke("braino-mac:window-theme", theme),
  revealPath: (target) => ipcRenderer.invoke("braino-mac:reveal-path", target),
  authSignOut: () => ipcRenderer.invoke("braino-mac:auth-sign-out"),
  ensureAuth: (reason) => ipcRenderer.invoke("braino-mac:ensure-auth", reason),
  delegate: (prompt) => ipcRenderer.invoke("braino-mac:delegate", prompt),
  demoAction: (action, payload) => ipcRenderer.invoke("braino-mac:demo-action", action, payload),
  delegateState: () => ipcRenderer.invoke("braino-mac:delegate-state"),
  cursorModeState: () => ipcRenderer.invoke("braino-mac:cursor-mode-state"),
  cursorModeControl: (payload) => ipcRenderer.invoke("braino-mac:cursor-mode-control", payload || {}),
  createRealtimeCall: (payload) => ipcRenderer.invoke("braino-mac:create-realtime-call", payload),
  updateRealtimeSession: (payload) => ipcRenderer.invoke("braino-mac:update-realtime-session", payload),
  dictationIntent: (text, active) => ipcRenderer.invoke("braino-mac:dictation-intent", text, Boolean(active)),
  dictationControl: (payload) => ipcRenderer.invoke("braino-mac:dictation-control", payload || {}),
  dictationInsert: (payload) => ipcRenderer.invoke("braino-mac:dictation-insert", payload || {}),
  dictationRefine: (payload) => ipcRenderer.invoke("braino-mac:dictation-refine", payload || {}),
  // Teleprompter: the compose panel and the read-along overlay both live in
  // renderer/teleprompter.html, which loads this same preload.
  teleprompterOpen: () => ipcRenderer.invoke("braino-mac:teleprompter-open"),
  teleprompterPresent: (payload) => ipcRenderer.invoke("braino-mac:teleprompter-present", payload || {}),
  teleprompterEdit: () => ipcRenderer.invoke("braino-mac:teleprompter-edit"),
  teleprompterClose: () => ipcRenderer.invoke("braino-mac:teleprompter-close"),
  teleprompterState: () => ipcRenderer.invoke("braino-mac:teleprompter-state"),
  onTeleprompterMode: (handler) => {
    ipcRenderer.on("braino-mac:teleprompter-mode", (_event, payload) => handler(payload));
    return () => ipcRenderer.removeAllListeners("braino-mac:teleprompter-mode");
  },
  requestAccessibility: () => ipcRenderer.invoke("braino-mac:request-accessibility"),
  requestMicrophone: () => ipcRenderer.invoke("braino-mac:request-microphone"),
  nativeListen: () => ipcRenderer.invoke("braino-mac:native-listen"),
  stopNativeListen: () => ipcRenderer.invoke("braino-mac:native-listen-stop"),
  transcribeAudio: (payload) => ipcRenderer.invoke("braino-mac:transcribe-audio", payload),
  meetingSegment: (payload) => ipcRenderer.invoke("braino-mac:meeting-segment", payload || {}),
  meetingCaptureFailed: (reason) => ipcRenderer.invoke("braino-mac:meeting-capture-failed", { reason }),
  meetingStealth: (enabled) => ipcRenderer.invoke("braino-mac:meeting-stealth", Boolean(enabled)),
  setMousePassthrough: (passthrough) => ipcRenderer.send("braino-mac:set-mouse-passthrough", Boolean(passthrough)),
  // Braino OS: the full screen surface inside this same overlay window.
  onBrainoOs: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:braino-os", handler);
    return () => ipcRenderer.removeListener("braino-mac:braino-os", handler);
  },
  brainoOsClosed: () => ipcRenderer.send("braino-mac:braino-os-closed"),
  // Anything cheap, certain and deterministic, answered before chat can take it.
  quickCommand: (text) => ipcRenderer.invoke("braino-mac:quick-command", text),
  /* The idle screen: the clock-and-shortcuts face he puts up when the Mac is
     left alone, or on Shift twice. Not the macOS desktop background, which is
     a different feature that unfortunately owns the word "wallpaper". */
  onIdleScreen: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:idle-screen", handler);
    return () => ipcRenderer.removeListener("braino-mac:idle-screen", handler);
  },
  idleScreenClosed: () => ipcRenderer.send("braino-mac:idle-screen-closed"),
  idleScreenAction: (shortcut) => ipcRenderer.invoke("braino-mac:idle-screen-action", shortcut || {}),
  idleScreenSettings: (patch) => ipcRenderer.invoke("braino-mac:idle-screen-settings", patch || null),
  idleScreenToggle: () => ipcRenderer.invoke("braino-mac:idle-screen-toggle"),
  onDance: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:dance", handler);
    return () => ipcRenderer.removeListener("braino-mac:dance", handler);
  },
  // Each step of a HIL run, shown as it happens rather than waited for.
  onThinkingStep: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:thinking-step", handler);
    return () => ipcRenderer.removeListener("braino-mac:thinking-step", handler);
  },
  onBrainoOsColor: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:braino-os-color", handler);
    return () => ipcRenderer.removeListener("braino-mac:braino-os-color", handler);
  },
  personaBundle: () => ipcRenderer.invoke("braino-mac:persona-bundle"),
  ttsConfig: () => ipcRenderer.invoke("braino-mac:tts-config"),
  tts: (text, referenceId) => ipcRenderer.invoke("braino-mac:tts", text, referenceId || ""),
  systemSay: (text) => ipcRenderer.invoke("braino-mac:system-say", text),
  stopSystemSay: () => ipcRenderer.invoke("braino-mac:system-say-stop"),
  onTaskProgress: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:task-progress", handler);
    return () => ipcRenderer.removeListener("braino-mac:task-progress", handler);
  },
  onCursorMode: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:cursor-mode", handler);
    return () => ipcRenderer.removeListener("braino-mac:cursor-mode", handler);
  },
  onCursorTaskComplete: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:cursor-task-complete", handler);
    return () => ipcRenderer.removeListener("braino-mac:cursor-task-complete", handler);
  },
  onModeCommands: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:mode-commands", handler);
    return () => ipcRenderer.removeListener("braino-mac:mode-commands", handler);
  },
  onVoiceMode: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:voice-mode", handler);
    return () => ipcRenderer.removeListener("braino-mac:voice-mode", handler);
  },
  onSpeechTranscript: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:speech-transcript", handler);
    return () => ipcRenderer.removeListener("braino-mac:speech-transcript", handler);
  },
  onVoiceToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:voice-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:voice-toggle", handler);
  },
  onDictationToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:dictation-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:dictation-toggle", handler);
  },
  onHerToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:her-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:her-toggle", handler);
  },
  onCharacterToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:character-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:character-toggle", handler);
  },
  onMondayMode: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:monday-mode", handler);
    return () => ipcRenderer.removeListener("braino-mac:monday-mode", handler);
  },
  onPointAt: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:point-at", handler);
    return () => ipcRenderer.removeListener("braino-mac:point-at", handler);
  },
  onSpeakLine: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:speak-line", handler);
    return () => ipcRenderer.removeListener("braino-mac:speak-line", handler);
  },
  onTimers: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:timers", handler);
    return () => ipcRenderer.removeListener("braino-mac:timers", handler);
  },
  onTimerFired: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:timer-fired", handler);
    return () => ipcRenderer.removeListener("braino-mac:timer-fired", handler);
  },
  onCalendarNext: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:calendar-next", handler);
    return () => ipcRenderer.removeListener("braino-mac:calendar-next", handler);
  },
  onWaBadge: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:wa-badge", handler);
    return () => ipcRenderer.removeListener("braino-mac:wa-badge", handler);
  },
  onWakeDetected: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:wake-detected", handler);
    return () => ipcRenderer.removeListener("braino-mac:wake-detected", handler);
  },
  onWakeStatus: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:wake-status", handler);
    return () => ipcRenderer.removeListener("braino-mac:wake-status", handler);
  },
  onSummon: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:summon", handler);
    return () => ipcRenderer.removeListener("braino-mac:summon", handler);
  },
  onSummonToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:summon-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:summon-toggle", handler);
  },
  // SKIT (TEMPORARY — Instagram demo, delete with the rest of the skit)
  skitStep: (step) => ipcRenderer.invoke("braino-mac:skit-step", step),
  onSkitStart: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("braino-mac:skit-start", handler);
    return () => ipcRenderer.removeListener("braino-mac:skit-start", handler);
  },
  launchDemoOpen: () => ipcRenderer.invoke("braino-mac:launch-demo-open"),
  launchDemoStop: () => ipcRenderer.invoke("braino-mac:launch-demo-stop"),
  onLaunchDemoStart: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("braino-mac:launch-demo-start", handler);
    return () => ipcRenderer.removeListener("braino-mac:launch-demo-start", handler);
  },
  setLiveCaptions: (on) => ipcRenderer.send("braino-mac:live-captions", Boolean(on)),
  ambientObserve: () => ipcRenderer.invoke("braino-mac:ambient-observe"),
  coworkObserve: () => ipcRenderer.invoke("braino-mac:cowork-observe"),
  coworkState: () => ipcRenderer.invoke("braino-mac:cowork-state"),
  onCowork: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:cowork", handler);
    return () => ipcRenderer.removeListener("braino-mac:cowork", handler);
  },
  onCoworkLabel: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:cowork-label", handler);
    return () => ipcRenderer.removeListener("braino-mac:cowork-label", handler);
  },
  onMeeting: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:meeting", handler);
    return () => ipcRenderer.removeListener("braino-mac:meeting", handler);
  },
  onScreenRec: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:screen-rec", handler);
    return () => ipcRenderer.removeListener("braino-mac:screen-rec", handler);
  },
  onAmbientToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:ambient-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:ambient-toggle", handler);
  },
  onLiveCaption: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:live-caption", handler);
    return () => ipcRenderer.removeListener("braino-mac:live-caption", handler);
  },
  onXStats: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:x-stats", handler);
    return () => ipcRenderer.removeListener("braino-mac:x-stats", handler);
  },
  onSummonHome: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:summon-home", handler);
    return () => ipcRenderer.removeListener("braino-mac:summon-home", handler);
  },
  onWalkerToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:walker-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:walker-toggle", handler);
  },
  onNotchFace: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:notch-face", handler);
    return () => ipcRenderer.removeListener("braino-mac:notch-face", handler);
  },
  onTabsSnapshot: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:tabs-snapshot", handler);
    return () => ipcRenderer.removeListener("braino-mac:tabs-snapshot", handler);
  },
  onMusicState: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:music-state", handler);
    return () => ipcRenderer.removeListener("braino-mac:music-state", handler);
  },
  onAuthRequired: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:auth-required", handler);
    return () => ipcRenderer.removeListener("braino-mac:auth-required", handler);
  },
  onHelperStatus: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:helper-status", handler);
    return () => ipcRenderer.removeListener("braino-mac:helper-status", handler);
  },
  onOverlayContext: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:overlay-context", handler);
    return () => ipcRenderer.removeListener("braino-mac:overlay-context", handler);
  },
  // ── Notch tray ──
  mediaControl: (payload) => ipcRenderer.invoke("braino-mac:media-control", payload),
  timerCancel: (payload) => ipcRenderer.invoke("braino-mac:timer-cancel", payload),
  stopwatchControl: (payload) => ipcRenderer.invoke("braino-mac:stopwatch-control", payload),
  onStopwatch: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:stopwatch", handler);
    return () => ipcRenderer.removeListener("braino-mac:stopwatch", handler);
  },
  onAlarmDismiss: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:alarm-dismiss", handler);
    return () => ipcRenderer.removeListener("braino-mac:alarm-dismiss", handler);
  },
  musicDuck: (payload) => ipcRenderer.invoke("braino-mac:music-duck", payload),
  systemVolume: (payload) => ipcRenderer.invoke("braino-mac:system-volume", payload),
  calendarJoin: () => ipcRenderer.invoke("braino-mac:calendar-join"),
  shelfFile: (payload) => ipcRenderer.invoke("braino-mac:shelf-file", payload),
  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch (_) { return ""; }
  },
  onNowPlaying: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:nowplaying", handler);
    return () => ipcRenderer.removeListener("braino-mac:nowplaying", handler);
  },
  onPower: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:power", handler);
    return () => ipcRenderer.removeListener("braino-mac:power", handler);
  },
  setNotchZone: (payload) => ipcRenderer.send("braino-mac:notch-zone-size", payload || {}),
  onNotchZone: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:notch-zone", handler);
    return () => ipcRenderer.removeListener("braino-mac:notch-zone", handler);
  },
  onBtAudio: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:bt-audio", handler);
    return () => ipcRenderer.removeListener("braino-mac:bt-audio", handler);
  },
});
