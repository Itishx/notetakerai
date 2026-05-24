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
const OUT_ZIP = path.join(ROOT, "public", "sidebrain-extension.zip");
const BRAINO_ZIPS = [
  path.join(ROOT, "public", "braino-extension.zip"),
  path.join(ROOT, "dist", "braino-extension.zip"),
];

// JS files to minify (simple whitespace removal, no obfuscation — Chrome flags obfuscated code as malware)
const JS_FILES = ["popup.js", "background.js", "offscreen.js", "content.js"];

// Files/folders to copy as-is
const COPY_FILES = [
  "manifest.json",
  "sidepanel.html",
  "offscreen.html",
  "popup.html",
  "styles.css",
  "icon48.png",
  "icon128.png",
];
const COPY_DIRS = ["fonts"];

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
fs.mkdirSync(path.dirname(OUT_ZIP), { recursive: true });
const output = fs.createWriteStream(OUT_ZIP);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  // Also copy to braino-extension.zip locations
  for (const dest of BRAINO_ZIPS) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(OUT_ZIP, dest);
  }
  console.log(`\n  📦  braino-extension.zip → ${kb} KB`);
  console.log(`      ${BRAINO_ZIPS[0]}`);
  console.log(`      ${BRAINO_ZIPS[1]}\n`);
});

archive.on("error", (err) => { throw err; });
archive.pipe(output);
archive.directory(DIST, false);
await archive.finalize();
