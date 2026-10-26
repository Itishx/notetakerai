"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("onboarding", {
  perms: () => ipcRenderer.invoke("onboarding:perms"),
  request: (which) => ipcRenderer.invoke("onboarding:request", which),
  step: (s) => ipcRenderer.send("onboarding:step", s),
  finish: () => ipcRenderer.send("onboarding:finish"),
  onChord: (fn) => ipcRenderer.on("onboarding:chord", () => fn()),
});
