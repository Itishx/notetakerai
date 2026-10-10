// Puts back the one line the development copy of Braino needs so macOS can ASK
// for Automation permission (NSAppleEventsUsageDescription). Electron's own
// app bundle ships without it, so macOS refused every AppleScript silently and
// never listed Braino under Automation: Spotify checks, pasting dictation and
// reading Chrome all failed (2026-09-26). Every npm install replaces the
// bundle, so this runs after install. macOS only; does nothing elsewhere.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const app = "node_modules/electron/dist/Electron.app";
const plist = `${app}/Contents/Info.plist`;
if (process.platform !== "darwin" || !existsSync(plist)) process.exit(0);
const text = "Braino controls apps like Chrome, Spotify, WhatsApp and System Events to do what you ask.";
try {
  execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :NSAppleEventsUsageDescription", plist], { stdio: "ignore" });
  process.exit(0); // already there
} catch (_) {}
try {
  execFileSync("/usr/libexec/PlistBuddy", ["-c", `Add :NSAppleEventsUsageDescription string ${text}`, plist]);
  execFileSync("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "ignore" });
  console.log("[braino] Added the Automation permission line to the dev Electron app. macOS will ask once, the first time.");
} catch (error) {
  console.warn("[braino] Could not add the Automation permission line:", error.message);
}
