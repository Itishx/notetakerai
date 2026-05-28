import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXTENSION_SRC = path.join(ROOT, "extension");
const PUBLIC_EXTENSION_DIR = path.join(ROOT, "public", "sidebrain-extension");
const ELECTRON_RENDERER_DIR = path.join(ROOT, "electron-app", "renderer");
const ELECTRON_FONTS_DIR = path.join(ELECTRON_RENDERER_DIR, "fonts");

const EXTENSION_FILES = [
  "background.js",
  "braino-popup.html",
  "braino-popup.js",
  "content.js",
  "icon128.png",
  "icon48.png",
  "manifest.json",
  "offscreen.html",
  "offscreen.js",
  "popup.html",
  "popup.js",
  "sidepanel.html",
  "styles.css",
];

const EXTENSION_DIRS = ["fonts"];
const ELECTRON_SHARED_FILES = ["popup.js", "styles.css"];
const FONT_FILES = [
  "BeVietnam-ExtraBold.ttf",
  "Charter_BT_Roman.ttf",
  "NeueHaasDisplayBold.ttf",
  "NeueHaasDisplayRoman.ttf",
  "Times_New_Roman_MT_Std_Italic.otf",
  "Times_New_Roman_MT_Std_Regular.otf",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(srcDir, destDir, file) {
  ensureDir(destDir);
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}

function copyDirContents(srcDir, destDir) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true, force: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function syncExtensionAssets() {
  if (!fs.existsSync(EXTENSION_SRC)) {
    throw new Error(`Missing extension source directory: ${EXTENSION_SRC}`);
  }

  // Public unpacked extension mirror
  fs.rmSync(PUBLIC_EXTENSION_DIR, { recursive: true, force: true });
  ensureDir(PUBLIC_EXTENSION_DIR);

  for (const file of EXTENSION_FILES) {
    copyFile(EXTENSION_SRC, PUBLIC_EXTENSION_DIR, file);
  }

  for (const dir of EXTENSION_DIRS) {
    copyDirContents(path.join(EXTENSION_SRC, dir), path.join(PUBLIC_EXTENSION_DIR, dir));
  }

  // Electron renderer shares the extension's UI logic and styling.
  ensureDir(ELECTRON_RENDERER_DIR);

  for (const file of ELECTRON_SHARED_FILES) {
    copyFile(EXTENSION_SRC, ELECTRON_RENDERER_DIR, file);
  }

  ensureDir(ELECTRON_FONTS_DIR);
  for (const file of FONT_FILES) {
    copyFile(path.join(EXTENSION_SRC, "fonts"), ELECTRON_FONTS_DIR, file);
  }

  console.log("Synced extension assets:");
  console.log(`  source:   ${path.relative(ROOT, EXTENSION_SRC)}`);
  console.log(`  public:   ${path.relative(ROOT, PUBLIC_EXTENSION_DIR)}`);
  console.log(`  electron: ${path.relative(ROOT, ELECTRON_RENDERER_DIR)}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  syncExtensionAssets();
}
