import JavaScriptObfuscator from "javascript-obfuscator";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { syncExtensionAssets } from "./sync-extension-assets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "extension");
const DIST = path.join(ROOT, "dist-extension");
const ZIP_PATHS = [
  path.join(ROOT, "public", "braino-extension.zip"),
  path.join(ROOT, "dist", "braino-extension.zip"),
  path.join(ROOT, "braino-extension.zip"),
  path.join(ROOT, "braino-dist-extension.zip"),
];

// JS files to minify (simple whitespace removal, no obfuscation — Chrome flags obfuscated code as malware)
const JS_FILES = ["popup.js", "background.js", "offscreen.js", "content.js", "braino-popup.js", "mic-permission.js"];

// Files/folders to copy as-is
const COPY_FILES = [
  "manifest.json",
  "braino-popup.html",
  "sidepanel.html",
  "offscreen.html",
  "mic-permission.html",
  "popup.html",
  "styles.css",
  "icon48.png",
  "icon128.png",
];
const COPY_DIRS = ["fonts", "lib"];

// ── Clean & recreate dist ──────────────────────────────────────────────────
syncExtensionAssets();

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

// ── Copy JS files as-is (no obfuscation) ───────────────────────────────────
for (const file of JS_FILES) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  Skipping ${file} (not found)`);
    continue;
  }
  fs.copyFileSync(src, path.join(DIST, file));
  console.log(`  ✓  Copied ${file}`);
}

// ── Copy static files ──────────────────────────────────────────────────────
for (const file of COPY_FILES) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(DIST, file));
  console.log(`  ✓  Copied ${file}`);
}

for (const dir of COPY_DIRS) {
  const src = path.join(SRC, dir);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(DIST, dir), { recursive: true });
  console.log(`  ✓  Copied ${dir}/`);
}

// ── Zip ────────────────────────────────────────────────────────────────────
const primaryZip = ZIP_PATHS[0];
fs.mkdirSync(path.dirname(primaryZip), { recursive: true });
const output = fs.createWriteStream(primaryZip);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  for (const dest of ZIP_PATHS.slice(1)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(primaryZip, dest);
  }
  console.log(`\n  📦  braino-extension.zip → ${kb} KB`);
  ZIP_PATHS.forEach(p => console.log(`      ${p}`));
  console.log();
});

archive.on("error", (err) => { throw err; });
archive.pipe(output);
archive.directory(DIST, false);
await archive.finalize();
