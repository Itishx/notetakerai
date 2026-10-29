"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ultron", {
  onState: (fn) => ipcRenderer.on("ultron:state", (_e, p) => fn(p)),
  onLevel: (fn) => ipcRenderer.on("ultron:level", (_e, v) => fn(v)),
  spoke: (what) => ipcRenderer.send("ultron:spoke", what),
  onMetrics: (fn) => ipcRenderer.on("ultron:metrics", (_e, m) => fn(m)),
  onPress: (fn) => ipcRenderer.on("ultron:press", () => fn()),
  realtimeCall: (sdp) => ipcRenderer.invoke("ultron:realtime-call", sdp),
  turn: (text) => ipcRenderer.send("ultron:turn", text),
  live: (on, why) => ipcRenderer.send("ultron:live", Boolean(on), String(why || "")),
  fallback: (why) => ipcRenderer.send("ultron:fallback", String(why || "")),
  onGlow: (fn) => ipcRenderer.on("ultron:glow", (_e, on) => fn(on)),
});
