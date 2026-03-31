import JavaScriptObfuscator from "javascript-obfuscator";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "extension");
const DIST = path.join(ROOT, "dist-extension");
const OUT_ZIP = path.join(ROOT, "public", "lecturesnap-extension.zip");

// Files to obfuscate
const JS_FILES = ["popup.js", "background.js", "offscreen.js"];

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

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,        // keep global Chrome APIs working
  selfDefending: false,         // can break in strict contexts
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  log: false,
};

// ── Clean & recreate dist ──────────────────────────────────────────────────
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

// ── Obfuscate JS files ─────────────────────────────────────────────────────
for (const file of JS_FILES) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  Skipping ${file} (not found)`);
    continue;
  }
  const code = fs.readFileSync(src, "utf8");
  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
  fs.writeFileSync(path.join(DIST, file), result.getObfuscatedCode(), "utf8");
  console.log(`  ✓  Obfuscated ${file}`);
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
  console.log(`\n  📦  lecturesnap-extension.zip → ${kb} KB`);
  console.log(`      ${OUT_ZIP}\n`);
});

archive.on("error", (err) => { throw err; });
archive.pipe(output);
archive.directory(DIST, false);
await archive.finalize();
