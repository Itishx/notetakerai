"use strict";

/* The whole surface the page needs: say when the pointer is over Braino, ask
   for Braino himself, and one way to stop.

   Nothing is read from disk here on purpose. A preload runs sandboxed, where
   node:fs does not exist, so reaching for it takes the whole preload down with
   it and the page silently loses every one of these. Main reads the file. */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("widget", {
  braino: () => ipcRenderer.invoke("widget:braino"),
  hot: (rect) => ipcRenderer.send("widget:hot", rect),
  onCold: (fn) => ipcRenderer.on("widget:cold", () => fn()),
  quit: () => ipcRenderer.send("widget:quit"),
});
