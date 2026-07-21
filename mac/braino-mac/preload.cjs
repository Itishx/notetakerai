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
  requestAccessibility: () => ipcRenderer.invoke("braino-mac:request-accessibility"),
  setMousePassthrough: (passthrough) => ipcRenderer.send("braino-mac:set-mouse-passthrough", Boolean(passthrough)),
  tts: (text) => ipcRenderer.invoke("braino-mac:tts", text),
  systemSay: (text) => ipcRenderer.invoke("braino-mac:system-say", text),
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
