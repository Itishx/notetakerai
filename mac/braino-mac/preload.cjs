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
  delegate: (prompt) => ipcRenderer.invoke("braino-mac:delegate", prompt),
  createRealtimeCall: (payload) => ipcRenderer.invoke("braino-mac:create-realtime-call", payload),
  updateRealtimeSession: (payload) => ipcRenderer.invoke("braino-mac:update-realtime-session", payload),
  requestAccessibility: () => ipcRenderer.invoke("braino-mac:request-accessibility"),
  requestMicrophone: () => ipcRenderer.invoke("braino-mac:request-microphone"),
  nativeListen: () => ipcRenderer.invoke("braino-mac:native-listen"),
  stopNativeListen: () => ipcRenderer.invoke("braino-mac:native-listen-stop"),
  transcribeAudio: (payload) => ipcRenderer.invoke("braino-mac:transcribe-audio", payload),
  setMousePassthrough: (passthrough) => ipcRenderer.send("braino-mac:set-mouse-passthrough", Boolean(passthrough)),
  tts: (text) => ipcRenderer.invoke("braino-mac:tts", text),
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
  onHelperStatus: (callback) => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on("braino-mac:helper-status", handler);
    return () => ipcRenderer.removeListener("braino-mac:helper-status", handler);
  },
});
