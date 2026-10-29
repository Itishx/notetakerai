"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ultron", {
  onState: (fn) => ipcRenderer.on("ultron:state", (_e, p) => fn(p)),
  onLevel: (fn) => ipcRenderer.on("ultron:level", (_e, v) => fn(v)),
  hover: (over) => ipcRenderer.send("ultron:hover", Boolean(over)),
  spoke: (what) => ipcRenderer.send("ultron:spoke", what),
});
