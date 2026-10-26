"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("maven", {
  onState: (fn) => ipcRenderer.on("maven:state", (_e, p) => fn(p)),
  onLevel: (fn) => ipcRenderer.on("maven:level", (_e, p) => fn(p)),
  onAnchor: (fn) => ipcRenderer.on("maven:anchor", (_e, p) => fn(p)),
  hover: (over) => ipcRenderer.send("maven:hover", Boolean(over)),
  action: (a) => ipcRenderer.send("maven:action", a),
  card: (a) => ipcRenderer.send("maven:card", a),
  drag: (what) => ipcRenderer.send("maven:drag", what),
});
