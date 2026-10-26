"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("onboarding", {
  perms: () => ipcRenderer.invoke("onboarding:perms"),
  keys: () => ipcRenderer.invoke("onboarding:keys"),
  request: (which) => ipcRenderer.invoke("onboarding:request", which),
  step: (s) => ipcRenderer.send("onboarding:step", s),
  getLanguage: () => ipcRenderer.invoke("onboarding:language:get"),
  setLanguage: (l) => ipcRenderer.invoke("onboarding:language:set", l),
  finish: () => ipcRenderer.send("onboarding:finish"),
  onChord: (fn) => ipcRenderer.on("onboarding:chord", () => fn()),
  onKeys: (fn) => ipcRenderer.on("onboarding:keys", (_e, p) => fn(p)),
  onPlaced: (fn) => ipcRenderer.on("onboarding:placed", (_e, p) => fn(p)),
});
