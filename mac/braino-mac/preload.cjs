const { contextBridge, ipcRenderer, webUtils } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
/* The promise detector, bridged rather than copied.
 *
 * extension/lib/hilShared.js is the single copy of these judgements and
 * hil-verify.cjs says so out loud. The renderer is context-isolated so it
 * cannot require it, and a second regex living over there is exactly how the
 * same bug gets found twice. */
const { macPromisesAction } = require(path.join(__dirname, "hil-verify.cjs"));
const { nameIsAddressed } = require(path.join(__dirname, "address-intent.cjs"));

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
  introDone: () => ipcRenderer.invoke("braino-mac:intro-done"),
  introGuard: (up, ms) => ipcRenderer.send("braino-mac:intro-guard", Boolean(up), Number(ms) || 0),
  onbInteractive: (on) => ipcRenderer.invoke("braino-mac:onb-interactive", { on: Boolean(on) }),
  namedMode: (payload) => ipcRenderer.invoke("braino-mac:named-mode", payload || {}),
  onNamedMode: (callback) => {
    const handler = (_event, p) => callback(p || {});
    ipcRenderer.on("braino-mac:named-mode", handler);
    return () => ipcRenderer.removeListener("braino-mac:named-mode", handler);
  },
  onIntroKill: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:intro-kill", handler);
    return () => ipcRenderer.removeListener("braino-mac:intro-kill", handler);
  },
  setMascot: (id) => ipcRenderer.invoke("braino-mac:set-mascot", id),
  getWalkerSvg: () => walkerSvg,
  getWalkerSvgFor: (mascotId) => walkerSvgFor(mascotId),
  log: (payload) => ipcRenderer.invoke("braino-mac:log", payload),
  noteChat: (payload) => ipcRenderer.invoke("braino-mac:note-chat", payload),
  topContactNames: () => ipcRenderer.invoke("braino-mac:top-contact-names"),
  chromeProfiles: () => ipcRenderer.invoke("braino-mac:chrome-profiles"),
  appOpen: (page) => ipcRenderer.invoke("braino-mac:app-open", page),
  appRecent: () => ipcRenderer.invoke("braino-mac:app-recent"),
  skillsList: () => ipcRenderer.invoke("braino-mac:skills-list"),
  skillsForget: (phrase) => ipcRenderer.invoke("braino-mac:skills-forget", phrase),
  appOverlay: (patch) => ipcRenderer.invoke("braino-mac:app-overlay", patch),
  loginItem: (on) => ipcRenderer.invoke("braino-mac:login-item", on),
  onAppGo: (callback) => {
    const handler = (_event, page) => callback(page);
    ipcRenderer.on("braino-mac:app-go", handler);
    return () => ipcRenderer.removeListener("braino-mac:app-go", handler);
  },
  onAppOverlay: (callback) => {
    const handler = (_event, patch) => callback(patch || {});
    ipcRenderer.on("braino-mac:app-overlay", handler);
    return () => ipcRenderer.removeListener("braino-mac:app-overlay", handler);
  },
  chromeProfilesSave: (config) => ipcRenderer.invoke("braino-mac:chrome-profiles-save", config),
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
  /* HERA alongside voice mode: display only. See voiceCaptionMode in main. */
  voiceCaption: (payload) => ipcRenderer.invoke("braino-mac:voice-caption", payload || {}),
  onVoiceCaption: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:voice-caption", handler);
    return () => ipcRenderer.removeListener("braino-mac:voice-caption", handler);
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
  contactsList: () => ipcRenderer.invoke("braino-mac:contacts-list"),
  waImportant: (name, important) => ipcRenderer.invoke("braino-mac:wa-important", name, important),
  contactsSync: () => ipcRenderer.invoke("braino-mac:contacts-sync"),
  mesaState: () => ipcRenderer.invoke("braino-mac:mesa-state"),
  activityState: () => ipcRenderer.invoke("braino-mac:activity-state"),
  activityDay: (day) => ipcRenderer.invoke("braino-mac:activity-day", day),
  activityPause: (paused) => ipcRenderer.invoke("braino-mac:activity-pause", paused),
  activityDeleteDay: (day) => ipcRenderer.invoke("braino-mac:activity-delete-day", day),
  activityDeleteRow: (day, index) => ipcRenderer.invoke("braino-mac:activity-delete-row", day, index),
  memoryOpen: () => ipcRenderer.invoke("braino-mac:memory-open"),
  arrivalInit: () => ipcRenderer.invoke("braino-mac:arrival-init"),
  arrivalFace: (dataUrl) => ipcRenderer.invoke("braino-mac:arrival-face", dataUrl),
  arrivalSummary: () => ipcRenderer.invoke("braino-mac:arrival-summary"),
  arrivalTouchID: () => ipcRenderer.invoke("braino-mac:arrival-touchid"),
  arrivalMouse: (inside) => ipcRenderer.invoke("braino-mac:arrival-mouse", inside),
  arrivalDone: (outcome) => ipcRenderer.invoke("braino-mac:arrival-done", outcome),
  setupOpen: () => ipcRenderer.invoke("braino-mac:setup-open"),
  setupSnapshot: () => ipcRenderer.invoke("braino-mac:setup-snapshot"),
  setupSave: (answers) => ipcRenderer.invoke("braino-mac:setup-save", answers),
  setupConnect: (kind) => ipcRenderer.invoke("braino-mac:setup-connect", kind),
  setupOpenPane: (pane) => ipcRenderer.invoke("braino-mac:setup-open-pane", pane),
  setupSay: (text) => ipcRenderer.invoke("braino-mac:setup-say", text),
  setupNotch: (text, ms) => ipcRenderer.invoke("braino-mac:setup-notch", { text, ms }),
  setupAsk: (id) => ipcRenderer.invoke("braino-mac:setup-ask", id),
  openSources: (urls) => ipcRenderer.invoke("braino-mac:open-sources", { urls }),
  waBadgeOpen: () => ipcRenderer.invoke("braino-mac:wa-badge-open"),
  waBadgeDismiss: () => ipcRenderer.invoke("braino-mac:wa-badge-dismiss"),
  mesaTokenSave: (token) => ipcRenderer.invoke("braino-mac:mesa-token-save", token),
  quitBraino: () => ipcRenderer.invoke("braino-mac:quit"),
  onbConnect: (kind) => ipcRenderer.invoke("braino-mac:onb-connect", kind),
  onbPeek: (kind) => ipcRenderer.invoke("braino-mac:onb-peek", kind),
  mesaTokenStatus: () => ipcRenderer.invoke("braino-mac:mesa-token-status"),
  mesaTokenRemove: () => ipcRenderer.invoke("braino-mac:mesa-token-remove"),
  mesaOpenDeveloper: () => ipcRenderer.invoke("braino-mac:mesa-open-developer"),
  setupPending: () => ipcRenderer.invoke("braino-mac:setup-pending"),
  setupPermissions: () => ipcRenderer.invoke("braino-mac:setup-permissions"),
  /* His voice, wherever he is drawn: the notch says when sound is playing,
     the app's chat mascot moves its mouth for exactly that long. */
  reportSpeaking: (on) => ipcRenderer.send("braino-mac:speaking", Boolean(on)),
  onSpeaking: (callback) => {
    const handler = (_event, on) => callback(Boolean(on));
    ipcRenderer.on("braino-mac:speaking-state", handler);
    return () => ipcRenderer.removeListener("braino-mac:speaking-state", handler);
  },
  onNarrate: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:narrate", handler);
    return () => ipcRenderer.removeListener("braino-mac:narrate", handler);
  },
  onSetupHeard: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:setup-heard", handler);
    return () => ipcRenderer.removeListener("braino-mac:setup-heard", handler);
  },
  onSetupNotch: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:setup-notch", handler);
    return () => ipcRenderer.removeListener("braino-mac:setup-notch", handler);
  },
  memoryDigests: (day) => ipcRenderer.invoke("braino-mac:memory-digests", day),
  memoryRecallSwitch: (on) => ipcRenderer.invoke("braino-mac:memory-recall-switch", on),
  memoryDigestNow: () => ipcRenderer.invoke("braino-mac:memory-digest-now"),
  memoryAsk: (question) => ipcRenderer.invoke("braino-mac:memory-ask", question),
  memoryPhotos: (day) => ipcRenderer.invoke("braino-mac:memory-photos", day),
  notchDropEnabled: () => ipcRenderer.invoke("braino-mac:notch-drop-enabled"),
  airdrop: (paths) => ipcRenderer.invoke("braino-mac:airdrop", paths),
  fileThumb: (filePath) => ipcRenderer.invoke("braino-mac:file-thumb", filePath),
  trayDragOut: (filePath) => ipcRenderer.send("braino-mac:tray-drag-out", filePath),
  onFileDrag: (callback) => { const h = (_e, p) => callback(p); ipcRenderer.on("braino-mac:file-drag", h); return () => ipcRenderer.removeListener("braino-mac:file-drag", h); },
  onAirdropStatus: (callback) => { const h = (_e, p) => callback(p); ipcRenderer.on("braino-mac:airdrop-status", h); return () => ipcRenderer.removeListener("braino-mac:airdrop-status", h); },
  memoryPhotosFetch: (day) => ipcRenderer.invoke("braino-mac:memory-photos-fetch", day),
  mesaConnect: () => ipcRenderer.invoke("braino-mac:mesa-connect"),
  mesaSync: () => ipcRenderer.invoke("braino-mac:mesa-sync"),
  dashboardData: (key) => ipcRenderer.invoke("braino-mac:dashboard-data", key),
  notesLibrary: () => ipcRenderer.invoke("braino-mac:notes-library"),
  notesRender: (markdown) => ipcRenderer.invoke("braino-mac:notes-render", markdown),
  notesSavePdf: (payload) => ipcRenderer.invoke("braino-mac:notes-save-pdf", payload),
  notesReveal: (file) => ipcRenderer.invoke("braino-mac:notes-reveal", file),
  notesText: (file) => ipcRenderer.invoke("braino-mac:notes-text", file),
  notesRename: (payload) => ipcRenderer.invoke("braino-mac:notes-rename", payload),
  notesAsk: (payload) => ipcRenderer.invoke("braino-mac:notes-ask", payload),
  notesWriteUp: (payload) => ipcRenderer.invoke("braino-mac:notes-write-up", payload),
  onNotesChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("braino-mac:notes-changed", listener);
    return () => ipcRenderer.removeListener("braino-mac:notes-changed", listener);
  },
  dashboardOpen: () => ipcRenderer.invoke("braino-mac:dashboard-open"),
  setWindowTheme: (theme) => ipcRenderer.invoke("braino-mac:window-theme", theme),
  revealPath: (target) => ipcRenderer.invoke("braino-mac:reveal-path", target),
  authSignOut: () => ipcRenderer.invoke("braino-mac:auth-sign-out"),
  ensureAuth: (reason) => ipcRenderer.invoke("braino-mac:ensure-auth", reason),
  delegate: (prompt, options) => ipcRenderer.invoke("braino-mac:delegate", prompt, options || {}),
  converse: (text) => ipcRenderer.invoke("braino-mac:converse", text),
  appActivity: (limit) => ipcRenderer.invoke("braino-mac:app-activity", limit),
  memoriesList: () => ipcRenderer.invoke("braino-mac:memories-list"),
  memoryUpdate: (id, content, category) => ipcRenderer.invoke("braino-mac:memory-update", id, content, category),
  memoryDelete: (id) => ipcRenderer.invoke("braino-mac:memory-delete", id),
  memoryAdd: (content, category) => ipcRenderer.invoke("braino-mac:memory-add", content, category),
  arrivalCallback: () => ipcRenderer.invoke("braino-mac:arrival-callback"),
  onApproval: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:approval", handler);
    return () => ipcRenderer.removeListener("braino-mac:approval", handler);
  },
  /* "Give me a moment" is a promise, "here they are" is not. */
  promisesAction: (text) => macPromisesAction(text),
  /* The moment you start speaking, so "what is this?" uses where the mouse
     was when you said it, not where it drifted to after. */
  noteSpeechStarted: () => ipcRenderer.send("braino-mac:speech-started"),
  /* "Braino, open it" calls him; "after Braino is done" is about him. */
  nameIsAddressed: (text) => nameIsAddressed(text),
  /* What did they just say — asked, not matched. */
  jobRunning: () => ipcRenderer.invoke("braino-mac:job-running"),
  mediaControl: (payload) => ipcRenderer.invoke("braino-mac:media-control", payload),
  // The routing decision, so the voice fork and the intent chain cannot disagree.
  wantsBrain: (text) => ipcRenderer.invoke("braino-mac:wants-brain", text),
  // The tray's transport buttons. A separate channel because it is a separate
  // contract: {action, source} against media-control's {action, target}.
  trayMediaControl: (payload) => ipcRenderer.invoke("braino-mac:tray-media", payload),
  typingFocus: (on) => ipcRenderer.invoke("braino-mac:typing-focus", { on }),
  understand: (payload) => ipcRenderer.invoke("braino-mac:understand", payload || {}),
  tellRunningJob: (note) => ipcRenderer.invoke("braino-mac:tell-running-job", { note }),
  stopRunningJob: () => ipcRenderer.invoke("braino-mac:stop-running-job"),
  demoAction: (action, payload) => ipcRenderer.invoke("braino-mac:demo-action", action, payload),
  delegateState: () => ipcRenderer.invoke("braino-mac:delegate-state"),
  cursorModeState: () => ipcRenderer.invoke("braino-mac:cursor-mode-state"),
  cursorModeControl: (payload) => ipcRenderer.invoke("braino-mac:cursor-mode-control", payload || {}),
  createRealtimeCall: (payload) => ipcRenderer.invoke("braino-mac:create-realtime-call", payload),
  updateRealtimeSession: (payload) => ipcRenderer.invoke("braino-mac:update-realtime-session", payload),
  dictationIntent: (text, active) => ipcRenderer.invoke("braino-mac:dictation-intent", text, Boolean(active)),
  dictationControl: (payload) => ipcRenderer.invoke("braino-mac:dictation-control", payload || {}),
  dictationInsert: (payload) => ipcRenderer.invoke("braino-mac:dictation-insert", payload || {}),
  // LIVE: the lecture as it is being said.
  liveStart: () => ipcRenderer.invoke("braino-mac:live-start"),
  liveStop: () => ipcRenderer.invoke("braino-mac:live-stop"),
  liveSave: (payload) => ipcRenderer.invoke("braino-mac:live-save", payload || {}),
  liveSize: (payload) => ipcRenderer.invoke("braino-mac:live-size", payload || {}),
  liveOpen: (payload) => ipcRenderer.invoke("braino-mac:live-open", payload || {}),
  liveDone: () => ipcRenderer.invoke("braino-mac:live-done"),
  pickerMode: (payload) => ipcRenderer.invoke("braino-mac:picker-mode", payload || {}),
  onPickerDismiss: (fn) => {
    const handler = () => fn();
    ipcRenderer.on("braino-mac:picker-dismiss", handler);
    return () => ipcRenderer.removeListener("braino-mac:picker-dismiss", handler);
  },
  onTypingDismiss: (fn) => {
    const handler = () => fn();
    ipcRenderer.on("braino-mac:typing-dismiss", handler);
    return () => ipcRenderer.removeListener("braino-mac:typing-dismiss", handler);
  },
  onLiveDismiss: (fn) => {
    const handler = () => fn();
    ipcRenderer.on("braino-mac:live-dismiss", handler);
    return () => ipcRenderer.removeListener("braino-mac:live-dismiss", handler);
  },
  onLiveSegment: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:live-segment", handler);
    return () => ipcRenderer.removeListener("braino-mac:live-segment", handler);
  },
  onLiveMode: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:live-mode", handler);
    return () => ipcRenderer.removeListener("braino-mac:live-mode", handler);
  },
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
  notchStyle: (style) => ipcRenderer.invoke("braino-mac:notch-style", style || null),
  // Listening engine: "on-device" (default) or "sarvam". See main.cjs parakeetSend.
  // Dictation orb (2026-10-25): voice level in, ✕/✓ out.
  onHeraLevel: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:hera-level", handler);
    return () => ipcRenderer.removeListener("braino-mac:hera-level", handler);
  },
  heraAction: (action) => ipcRenderer.send("braino-mac:hera-action", String(action || "")),
  speechEngine: (engine) => ipcRenderer.invoke("braino-mac:speech-engine", engine || null),
  onSarvamCommand: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:sarvam-command", handler);
    return () => ipcRenderer.removeListener("braino-mac:sarvam-command", handler);
  },
  sarvamEvent: (payload) => ipcRenderer.send("braino-mac:sarvam-event", payload),
  onNotchStyle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:notch-style", handler);
    return () => ipcRenderer.removeListener("braino-mac:notch-style", handler);
  },
  idleScreenToggle: () => ipcRenderer.invoke("braino-mac:idle-screen-toggle"),
  /* The Braino OS wallpapers: the same looks as the screensaver, standing
     still. The dashboards list them and put one on the desktop. */
  wallpaperLooks: () => ipcRenderer.invoke("braino-mac:wallpaper-looks"),
  wallpaperApply: (look) => ipcRenderer.invoke("braino-mac:wallpaper-apply", { look }),
  wallpaperRestore: () => ipcRenderer.invoke("braino-mac:wallpaper-restore"),
  powerState: () => ipcRenderer.invoke("braino-mac:power-state"),
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
  onWebSources: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:web-sources", handler);
    return () => ipcRenderer.removeListener("braino-mac:web-sources", handler);
  },
  onTaskTrail: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:task-trail", handler);
    return () => ipcRenderer.removeListener("braino-mac:task-trail", handler);
  },
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
  // Hold Fn+Control to talk: { phase: "start" | "end" | "cancel" }.
  onVoicePtt: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:voice-ptt", handler);
    return () => ipcRenderer.removeListener("braino-mac:voice-ptt", handler);
  },
  onVoiceToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:voice-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:voice-toggle", handler);
  },
  onPitchDemo: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:pitch-demo", handler);
    return () => ipcRenderer.removeListener("braino-mac:pitch-demo", handler);
  },
  pitchOpen: (payload) => ipcRenderer.invoke("braino-mac:pitch-open", payload || {}),
  pitchAwaitPost: (payload) => ipcRenderer.invoke("braino-mac:pitch-await-post", payload || {}),
  pitchFront: () => ipcRenderer.invoke("braino-mac:pitch-front"),
  pitchDone: () => ipcRenderer.invoke("braino-mac:pitch-done"),
  onPitchStop: (handler) => {
    ipcRenderer.on("braino-mac:pitch-stop", handler);
    return () => ipcRenderer.removeListener("braino-mac:pitch-stop", handler);
  },
  onTypeToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:type-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:type-toggle", handler);
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
  onMascotHide: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:mascot-hide", handler);
    return () => ipcRenderer.removeListener("braino-mac:mascot-hide", handler);
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
  onWaCard: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:wa-card", handler);
    return () => ipcRenderer.removeListener("braino-mac:wa-card", handler);
  },
  typeBarSend: (text) => ipcRenderer.invoke("braino-mac:type-bar-send", text),
  typeBarClose: () => ipcRenderer.invoke("braino-mac:type-bar-close"),
  onTypeBarShown: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("braino-mac:type-bar-shown", handler);
    return () => ipcRenderer.removeListener("braino-mac:type-bar-shown", handler);
  },
  onRunInput: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:run-input", handler);
    return () => ipcRenderer.removeListener("braino-mac:run-input", handler);
  },
  onWaBadge: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:wa-badge", handler);
    return () => ipcRenderer.removeListener("braino-mac:wa-badge", handler);
  },
  onArrivalHello: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:arrival-hello", handler);
    return () => ipcRenderer.removeListener("braino-mac:arrival-hello", handler);
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
  // The routing decision, so the voice fork and the intent chain cannot disagree.
  wantsBrain: (text) => ipcRenderer.invoke("braino-mac:wants-brain", text),
  // The tray's transport buttons. A separate channel because it is a separate
  // contract: {action, source} against media-control's {action, target}.
  trayMediaControl: (payload) => ipcRenderer.invoke("braino-mac:tray-media", payload),
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
  teachStart: (said) => ipcRenderer.invoke("braino-mac:teach-start", said),
  teachStop: (opts) => ipcRenderer.invoke("braino-mac:teach-stop", opts),
  teachState: () => ipcRenderer.invoke("braino-mac:teach-state"),
  taughtList: () => ipcRenderer.invoke("braino-mac:taught-list"),
  taughtDelete: (id) => ipcRenderer.invoke("braino-mac:taught-delete", id),
  taughtRun: (id) => ipcRenderer.invoke("braino-mac:taught-run", id),
  onTeach: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:teach", handler);
    return () => ipcRenderer.removeListener("braino-mac:teach", handler);
  },
  onTaughtChanged: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:taught-changed", handler);
    return () => ipcRenderer.removeListener("braino-mac:taught-changed", handler);
  },
  calendarNextNow: () => ipcRenderer.invoke("braino-mac:calendar-next-now"),
  recordStop: () => ipcRenderer.invoke("braino-mac:record-stop"),
  recordStart: (payload) => ipcRenderer.invoke("braino-mac:record-start", payload),
  recordingsList: () => ipcRenderer.invoke("braino-mac:recordings-list"),
  recordingGet: (id) => ipcRenderer.invoke("braino-mac:recording-get", id),
  recordingState: () => ipcRenderer.invoke("braino-mac:recording-state"),
  onRecordAsk: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:record-ask", handler);
    return () => ipcRenderer.removeListener("braino-mac:record-ask", handler);
  },
  onRecordPhase: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:record-phase", handler);
    return () => ipcRenderer.removeListener("braino-mac:record-phase", handler);
  },
  onRecordingsChanged: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("braino-mac:recordings-changed", handler);
    return () => ipcRenderer.removeListener("braino-mac:recordings-changed", handler);
  },
  mediaHold: (payload) => ipcRenderer.invoke("braino-mac:media-hold", payload),
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
