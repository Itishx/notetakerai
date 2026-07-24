const { contextBridge, ipcRenderer } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function loadWalkerSvg() {
  const sourcePath = path.resolve(__dirname, "../../src/components/brainoWalkerSvg.ts");
  let source = fs.readFileSync(sourcePath, "utf8");
  source = source.replace("export const BRAINO_WALKER_SVG", "const BRAINO_WALKER_SVG");
  return Function(`${source}\nreturn BRAINO_WALKER_SVG;`)();
}

const walkerSvg = loadWalkerSvg();

contextBridge.exposeInMainWorld("brainoMac", {
  getConfig: () => ipcRenderer.invoke("braino-mac:get-config"),
  getWalkerSvg: () => walkerSvg,
  log: (payload) => ipcRenderer.invoke("braino-mac:log", payload),
  activeContext: () => ipcRenderer.invoke("braino-mac:active-context"),
  authStatus: () => ipcRenderer.invoke("braino-mac:auth-status"),
  authSignOut: () => ipcRenderer.invoke("braino-mac:auth-sign-out"),
  ensureAuth: (reason) => ipcRenderer.invoke("braino-mac:ensure-auth", reason),
  delegate: (prompt) => ipcRenderer.invoke("braino-mac:delegate", prompt),
  demoAction: (action, payload) => ipcRenderer.invoke("braino-mac:demo-action", action, payload),
  delegateState: () => ipcRenderer.invoke("braino-mac:delegate-state"),
  createRealtimeCall: (payload) => ipcRenderer.invoke("braino-mac:create-realtime-call", payload),
  updateRealtimeSession: (payload) => ipcRenderer.invoke("braino-mac:update-realtime-session", payload),
  requestAccessibility: () => ipcRenderer.invoke("braino-mac:request-accessibility"),
  requestMicrophone: () => ipcRenderer.invoke("braino-mac:request-microphone"),
  nativeListen: () => ipcRenderer.invoke("braino-mac:native-listen"),
  stopNativeListen: () => ipcRenderer.invoke("braino-mac:native-listen-stop"),
  transcribeAudio: (payload) => ipcRenderer.invoke("braino-mac:transcribe-audio", payload),
  setMousePassthrough: (passthrough) => ipcRenderer.send("braino-mac:set-mouse-passthrough", Boolean(passthrough)),
  ttsConfig: () => ipcRenderer.invoke("braino-mac:tts-config"),
  tts: (text, referenceId) => ipcRenderer.invoke("braino-mac:tts", text, referenceId || ""),
  systemSay: (text) => ipcRenderer.invoke("braino-mac:system-say", text),
  onTaskProgress: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:task-progress", handler);
    return () => ipcRenderer.removeListener("braino-mac:task-progress", handler);
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
  onHerToggle: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:her-toggle", handler);
    return () => ipcRenderer.removeListener("braino-mac:her-toggle", handler);
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
});
