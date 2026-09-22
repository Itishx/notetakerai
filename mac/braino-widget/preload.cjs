"use strict";

/* The whole surface the widget needs: tell main the pointer went down, moved,
   came up, and one way to stop. Nothing else crosses. */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("widget", {
  dragStart: () => ipcRenderer.send("widget:drag-start"),
  dragMove: () => ipcRenderer.send("widget:drag-move"),
  dragEnd: () => ipcRenderer.send("widget:drag-end"),
  sizeStart: () => ipcRenderer.send("widget:size-start"),
  sizeMove: () => ipcRenderer.send("widget:size-move"),
  sizeEnd: () => ipcRenderer.send("widget:size-end"),
  quit: () => ipcRenderer.send("widget:quit"),
});
