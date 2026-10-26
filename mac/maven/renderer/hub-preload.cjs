"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const inv = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld("maven", {
  getHistory: () => inv("hub:history"),
  onHistory: (fn) => { const h = (_e, v) => fn(v); ipcRenderer.on("hub:history", h); return () => ipcRenderer.removeListener("hub:history", h); },
  saveCorrection: (c) => inv("hub:correction", c),
  getDictionary: () => inv("hub:dict:get"),
  saveDictionary: (l) => inv("hub:dict:save", l),
  getSnippets: () => inv("hub:snip:get"),
  saveSnippets: (l) => inv("hub:snip:save", l),
  getSettings: () => inv("hub:settings:get"),
  setSetting: (k, v) => inv("hub:settings:set", k, v),
  getDetails: () => inv("hub:details:get"),
  saveDetails: (d) => inv("hub:details:save", d),
  openDataFolder: () => inv("hub:openData"),
  deleteHistory: () => inv("hub:deleteHistory"),
  getJobs: () => inv("hub:jobs"),
  onPage: (fn) => { const h = (_e, v) => fn(v); ipcRenderer.on("hub:page", h); return () => ipcRenderer.removeListener("hub:page", h); },
  showOnboarding: () => inv("hub:onboarding"),
});
