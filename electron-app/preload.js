/**
 * Preload — bridges Electron main process to the renderer.
 * Exposes a `chrome` compatibility shim so popup.js runs unchanged.
 */
const { contextBridge, ipcRenderer } = require('electron');

// ── Chrome storage shim ───────────────────────────────────────────────────────
const storage = {
  local: {
    get(keys, cb) {
      const p = ipcRenderer.invoke('storage-get', keys ?? null).then(result => {
        if (typeof cb === 'function') cb(result);
        return result;
      });
      return p;
    },
    set(items, cb) {
      const p = ipcRenderer.invoke('storage-set', items).then(() => {
        if (typeof cb === 'function') cb();
      });
      return p;
    },
    remove(keys, cb) {
      const p = ipcRenderer.invoke('storage-remove', keys).then(() => {
        if (typeof cb === 'function') cb();
      });
      return p;
    },
    clear(cb) {
      const p = ipcRenderer.invoke('storage-set', {}).then(() => {
        if (typeof cb === 'function') cb();
      });
      return p;
    },
  },
  onChanged: { addListener: () => {}, removeListener: () => {} },
};

// ── Chrome tabs shim ──────────────────────────────────────────────────────────
const tabs = {
  query(queryInfo, cb) {
    const p = ipcRenderer.invoke('get-active-tab').then(tab => {
      const result = tab ? [tab] : [];
      if (typeof cb === 'function') cb(result);
      return result;
    });
    return p;
  },
  get(tabId, cb) {
    const p = ipcRenderer.invoke('get-active-tab').then(tab => {
      if (typeof cb === 'function') cb(tab);
      return tab;
    });
    return p;
  },
  captureVisibleTab(_winId, _opts, cb) {
    // Not supported — return null gracefully
    if (typeof cb === 'function') cb(null);
    return Promise.resolve(null);
  },
  sendMessage(_tabId, _msg, cb) {
    if (typeof cb === 'function') cb({ error: 'Content scripts not available in desktop app' });
    return Promise.resolve({ error: 'Not supported' });
  },
  onActivated: { addListener: () => {} },
  onUpdated: { addListener: () => {} },
  onRemoved: { addListener: () => {} },
};

// ── Fake message bus ──────────────────────────────────────────────────────────
const _listeners = [];
const runtime = {
  id: 'sidebrain-electron-app',
  sendMessage(_msg, _cb) { return Promise.resolve({}); },
  onMessage: {
    addListener(fn) { _listeners.push(fn); },
    removeListener(fn) {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    },
  },
  onConnect: { addListener: () => {} },
  getURL(path) { return `app://${path}`; },
  lastError: null,
};

// ── Expose full chrome shim ───────────────────────────────────────────────────
contextBridge.exposeInMainWorld('chrome', {
  storage,
  tabs,
  runtime,
  windows: {
    getCurrent(cb) { if (typeof cb === 'function') cb({ id: 1, focused: true }); return Promise.resolve({ id: 1 }); },
    onFocusChanged: { addListener: () => {} },
  },
  sidePanel: {
    setOptions: () => {},
    open: () => {},
  },
  commands: {
    onCommand: { addListener: () => {} },
  },
  desktopCapture: {
    chooseDesktopMedia: () => {},
    cancelChooseDesktopMedia: () => {},
  },
  i18n: {
    getMessage: (key) => key,
  },
});

// ── Electron-specific extras exposed to renderer ──────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});
