const {
  app, BrowserWindow, Tray, Menu, globalShortcut,
  screen, nativeImage, ipcMain, shell, session
} = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ── Storage (JSON file in userData) ──────────────────────────────────────────
const storageFile = path.join(app.getPath('userData'), 'storage.json');

function readStorage() {
  try { return JSON.parse(fs.readFileSync(storageFile, 'utf8')); }
  catch { return {}; }
}
function writeStorage(data) {
  fs.writeFileSync(storageFile, JSON.stringify(data), 'utf8');
}

ipcMain.handle('storage-get', (_e, keys) => {
  const store = readStorage();
  if (keys === null) return store;
  const list = typeof keys === 'string' ? [keys]
    : Array.isArray(keys) ? keys : Object.keys(keys);
  const result = {};
  list.forEach(k => {
    if (store[k] !== undefined) result[k] = store[k];
    else if (typeof keys === 'object' && !Array.isArray(keys)) result[k] = keys[k];
  });
  return result;
});

ipcMain.handle('storage-set', (_e, items) => {
  const store = readStorage();
  Object.assign(store, items);
  writeStorage(store);
});

ipcMain.handle('storage-remove', (_e, keys) => {
  const store = readStorage();
  const list = Array.isArray(keys) ? keys : [keys];
  list.forEach(k => delete store[k]);
  writeStorage(store);
});

// ── Active browser tab via AppleScript ───────────────────────────────────────
ipcMain.handle('get-active-tab', async () => {
  const tryApp = (appName, urlKey, titleKey) => new Promise(resolve => {
    const script = `tell application "${appName}" to if it is running then ` +
      `return (${urlKey} of active tab of front window) & "|||" & (${titleKey} of active tab of front window)`;
    exec(`osascript -e '${script}'`, (err, out) => {
      if (!err && out.trim()) {
        const [url, title] = out.trim().split('|||');
        resolve({ id: 1, active: true, url: url.trim(), title: (title || '').trim() });
      } else resolve(null);
    });
  });

  return (
    await tryApp('Google Chrome', 'URL', 'title') ||
    await tryApp('Brave Browser', 'URL', 'title') ||
    await tryApp('Arc', 'URL', 'title') ||
    await tryApp('Safari', 'URL', 'name') ||
    null
  );
});

// ── Window management ─────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

const PANEL_WIDTH = 420;

function getWindowBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    width: PANEL_WIDTH,
    height: workArea.height,
    x: workArea.x + workArea.width - PANEL_WIDTH,
    y: workArea.y,
  };
}

function createWindow() {
  const bounds = getWindowBounds();

  mainWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    titleBarStyle: 'hidden',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    visibleOnAllWorkspaces: true,
    hasShadow: true,
    backgroundColor: '#F6F1EA',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Allow microphone for voice mode
      permissions: ['microphone'],
    },
  });

  // ── KEY: invisible in screen share / recordings ───────────────────────────
  mainWindow.setContentProtection(true);

  // Keep it on top even over full-screen apps
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle mic permission
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(['microphone', 'media'].includes(permission));
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // Use the app icon as a 18×18 template image for menu bar
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  const img = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
    : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip('SideBrain — AI Side Panel');

  const menu = Menu.buildFromTemplate([
    { label: 'Show / Hide SideBrain', accelerator: 'Alt+Space', click: toggleWindow },
    { type: 'separator' },
    {
      label: 'Screen Sharing Protection',
      type: 'checkbox',
      checked: true,
      click(item) {
        mainWindow?.setContentProtection(item.checked);
      },
    },
    { type: 'separator' },
    { label: 'Quit SideBrain', accelerator: 'Cmd+Q', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', toggleWindow);
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.on('ready', () => {
  createWindow();
  createTray();

  // Alt+Space global hotkey — same as Chrome extension shortcut
  const ok = globalShortcut.register('Alt+Space', toggleWindow);
  if (!ok) console.warn('GlobalShortcut Alt+Space failed to register');
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Dock icon: hide it (pure tray app)
if (app.dock) app.dock.hide();
