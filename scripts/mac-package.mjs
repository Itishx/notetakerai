// Braino for Mac, packaged for testers (2026-10-13): `npm run mac:package`.
//
// No Apple Developer account yet, so the app is ad-hoc signed: it runs, but
// macOS asks once (System Settings › Privacy & Security › Open Anyway). Same
// brain as Itish's Mac: Laya ships inside (portable Python, its libraries and
// the live model), and the Swift helpers ship compiled, because a tester has
// no Swift toolchain. Secrets never ship: only the public Supabase key and
// Braino's own BRAINO_* flags are copied into the app's settings file.
//
// Output: dist-mac/Braino.app and dist-mac/Braino-<version>.dmg
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

if (process.platform !== "darwin" || process.arch !== "arm64") { console.error("Build this on an Apple Silicon Mac."); process.exit(1); }
const ROOT = process.cwd();
const SRC = path.join(ROOT, "mac", "braino-mac");
const OUT = path.join(ROOT, "dist-mac");
const APP = path.join(OUT, "Braino.app");
const RES = path.join(APP, "Contents", "Resources");
const APPDIR = path.join(RES, "app");
const LAYA_VENV = path.join(os.homedir(), ".braino-laya");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });
const out = (cmd, args) => String(execFileSync(cmd, args)).trim();
const step = (t) => console.log(`\n▸ ${t}`);

const version = (fs.readFileSync(path.join(SRC, "main.cjs"), "utf8").match(/const APP_VERSION = "([^"]+)"/) || [])[1] || "0.0.0";

step(`Braino ${version}: fresh app shell from Electron`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
run("/usr/bin/ditto", [path.join(ROOT, "node_modules", "electron", "dist", "Electron.app"), APP]);
fs.rmSync(path.join(RES, "default_app.asar"), { force: true });

step("Name, identity and the reasons macOS shows for each permission");
const plist = path.join(APP, "Contents", "Info.plist");
const setKey = (key, type, value) => {
  try { run("/usr/libexec/PlistBuddy", ["-c", `Delete :${key}`, plist], { stdio: "ignore" }); } catch (_) {}
  run("/usr/libexec/PlistBuddy", ["-c", `Add :${key} ${type} ${value}`, plist]);
};
setKey("CFBundleName", "string", "Braino");
setKey("CFBundleDisplayName", "string", "Braino");
setKey("CFBundleIdentifier", "string", "com.affective.braino");
setKey("CFBundleShortVersionString", "string", version);
setKey("CFBundleVersion", "string", version);
setKey("NSMicrophoneUsageDescription", "string", "Braino listens when you call him, and to your meetings when you ask.");
setKey("NSCameraUsageDescription", "string", "Braino takes one photo when you ask him to look at you.");
setKey("NSAppleEventsUsageDescription", "string", "Braino controls apps like Chrome, Spotify, WhatsApp and System Events to do what you ask.");
setKey("NSContactsUsageDescription", "string", "Braino knows who is who when you ask him to message someone.");
setKey("NSSpeechRecognitionUsageDescription", "string", "Braino turns what you say into text.");
setKey("NSCalendarsUsageDescription", "string", "Braino reads and books your meetings when you ask.");

step("Braino's code, laid out as in the repo");
fs.mkdirSync(path.join(APPDIR, "mac"), { recursive: true });
fs.mkdirSync(path.join(APPDIR, "extension"), { recursive: true });
run("/usr/bin/rsync", ["-a", "--exclude", "native/BrainoDictate/.build", "--exclude", "test-forms", "--exclude", ".DS_Store", `${SRC}/`, path.join(APPDIR, "mac", "braino-mac")]);
run("/usr/bin/rsync", ["-a", path.join(ROOT, "extension", "lib") + "/", path.join(APPDIR, "extension", "lib")]);
// Read from outside the Mac folder at runtime: his drawings (the preload builds
// the notch from them; missing, the whole notch failed to start, 2026-10-13)
// and the wallpaper looks.
fs.mkdirSync(path.join(APPDIR, "src", "components"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "src", "components")).filter((n) => /WalkerSvg\.ts$/.test(n))) {
  fs.copyFileSync(path.join(ROOT, "src", "components", f), path.join(APPDIR, "src", "components", f));
}
run("/usr/bin/rsync", ["-a", path.join(ROOT, "shared") + "/", path.join(APPDIR, "shared")]);
run("/usr/bin/rsync", ["-a", path.join(ROOT, "public", "fonts") + "/", path.join(APPDIR, "public", "fonts")]);   // the notch's SF Pro
// On-device dictation: just the built program, not the 500 MB build folder.
const dictateBin = path.join(SRC, "native", "BrainoDictate", ".build", "release", "BrainoDictate");
if (fs.existsSync(dictateBin)) {
  const dest = path.join(APPDIR, "mac", "braino-mac", "native", "BrainoDictate", ".build", "release");
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(dictateBin, path.join(dest, "BrainoDictate"));
  fs.chmodSync(path.join(dest, "BrainoDictate"), 0o755);
}
fs.writeFileSync(path.join(APPDIR, "package.json"), JSON.stringify({ name: "braino", productName: "Braino", version, main: "mac/braino-mac/main.cjs" }, null, 2));

step("Settings: the public key and Braino's own flags only, never a secret");
const env = {};
for (const file of [".env", ".env.local"]) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && /^(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|VITE_SUPABASE_PUBLISHABLE_KEY|BRAINO_[A-Z0-9_]+)$/.test(m[1])) env[m[1]] = m[2];
  }
}
env.BRAINO_LAYA_CONTEXT = "1";   // the Laya Itish runs: v7, reading context
fs.writeFileSync(path.join(APPDIR, ".env"), Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
console.log(`  ${Object.keys(env).join(", ")}`);

step("Swift helpers, compiled (a tester's Mac has no Swift toolchain)");
const NATIVE = path.join(APPDIR, "mac", "braino-mac", "native");
const PRE = path.join(NATIVE, "prebuilt");
fs.mkdirSync(PRE, { recursive: true });
for (const name of ["BrainoControlTap", "BrainoSpeech", "BrainoTouchID", "BrainoAX", "BrainoDrop"]) {
  run("/usr/bin/swiftc", [path.join(SRC, "native", `${name}.swift`), "-O", "-o", path.join(PRE, name)]);
  console.log(`  ${name}`);
}
// The notch measurer is written inline in main.cjs; lift it out and compile it.
const mainSrc = fs.readFileSync(path.join(SRC, "main.cjs"), "utf8");
const arr = mainSrc.match(/const swiftSource = (\[[\s\S]*?\])\.join\("\\n"\);/);
if (!arr) throw new Error("notch measurer source not found in main.cjs");
const notchSwift = path.join(os.tmpdir(), "BrainoNotchMeasure.swift");
fs.writeFileSync(notchSwift, Function(`return ${arr[1]}`)().join("\n"));
run("/usr/bin/swiftc", [notchSwift, "-O", "-o", path.join(PRE, "BrainoNotchMeasure")]);
console.log("  BrainoNotchMeasure");
// The two helper apps, rebuilt so they are newer than their sources.
for (const [swift, plistName, appName] of [["BrainoWakeWord.swift", "BrainoWakeWord-Info.plist", "BrainoWakeWord.app"], ["BrainoLiveCaption.swift", "BrainoLiveCaption-Info.plist", "BrainoLiveCaption.app"]]) {
  const appPath = path.join(NATIVE, "bin", appName);
  const exe = path.join(appPath, "Contents", "MacOS", appName.replace(/\.app$/, ""));
  fs.mkdirSync(path.dirname(exe), { recursive: true });
  fs.copyFileSync(path.join(SRC, "native", plistName), path.join(appPath, "Contents", "Info.plist"));
  run("/usr/bin/swiftc", [path.join(SRC, "native", swift), "-O", "-o", exe]);
  run("/usr/bin/codesign", ["-s", "-", "-f", "--deep", appPath]);
  console.log(`  ${appName}`);
}

step("Laya: portable Python, its libraries and the live model (the same brain as Itish's)");
const pyHome = fs.realpathSync(path.join(path.dirname(fs.realpathSync(path.join(LAYA_VENV, "bin", "python"))), ".."));
const LAYA = path.join(APPDIR, "laya");
run("/usr/bin/ditto", [pyHome, path.join(LAYA, "python")]);
run("/usr/bin/rsync", ["-a", "--exclude", "__pycache__", path.join(LAYA_VENV, "lib", "python3.11", "site-packages") + "/", path.join(LAYA, "site-packages")]);
run("/usr/bin/ditto", [path.join(LAYA_VENV, "models", "braino-kind-v7"), path.join(LAYA, "models", "braino-kind-v7")]);
console.log(`  python from ${pyHome}`);
// Proof it runs from here, with nothing from the venv.
console.log("  " + out(path.join(LAYA, "python", "bin", "python3.11"), ["-c", "import sys; sys.path.insert(0, sys.argv[1]); import laya, torch; print('laya ok, torch', torch.__version__)", path.join(LAYA, "site-packages")]));

step("Sign (ad hoc: runs, macOS asks once)");
run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", APP]);
console.log("  " + out("/usr/bin/du", ["-sh", APP]));

step("Disk image");
const stage = path.join(OUT, "dmg");
fs.mkdirSync(stage, { recursive: true });
run("/usr/bin/ditto", [APP, path.join(stage, "Braino.app")]);
fs.symlinkSync("/Applications", path.join(stage, "Applications"));
fs.writeFileSync(path.join(stage, "Read me first.txt"), `Braino ${version}, early tester build

1. Drag Braino into Applications.
2. Open Braino. macOS will say it can't check it (it isn't notarised yet).
   Open System Settings › Privacy & Security, scroll down, click "Open Anyway",
   then open Braino again.
3. Sign in when the browser opens, and Braino walks you through the rest.

Call him: press Control twice, or say "Hey Braino".
Something odd? Tell Itish exactly what you said and what happened.
`);
const dmg = path.join(OUT, `Braino-${version}.dmg`);
run("/usr/bin/hdiutil", ["create", "-volname", "Braino", "-srcfolder", stage, "-ov", "-format", "UDZO", dmg]);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`\n✓ ${dmg}  (${out("/usr/bin/du", ["-sh", dmg]).split(/\s/)[0]})`);
