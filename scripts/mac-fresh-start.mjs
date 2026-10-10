// Start Braino for Mac as a brand new person would (2026-10-10).
//
//   npm run mac:fresh                 sign out, forget setup, keep permissions
//   npm run mac:fresh -- --permissions   also reset every macOS permission
//   npm run mac:fresh -- --restore       put your real Braino back
//
// Nothing is deleted. Your whole "Braino Mac" folder (sign in, setup answers,
// memory, logs) is moved aside to "Braino Mac.real" and moved back by
// --restore. Quit Braino first: a running copy would keep writing to it.
import { existsSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

if (process.platform !== "darwin") { console.log("macOS only."); process.exit(0); }
const base = path.join(os.homedir(), "Library", "Application Support");
const live = path.join(base, "Braino Mac");
const kept = path.join(base, "Braino Mac.real");
const args = new Set(process.argv.slice(2));

try {
  execFileSync("/usr/bin/pgrep", ["-f", "braino-mac/main.cjs"], { stdio: "ignore" });
  console.error("Braino is running. Quit it first (menu, Quit), then run this again.");
  process.exit(1);
} catch (_) { /* not running, good */ }

if (args.has("--restore")) {
  if (!existsSync(kept)) { console.log("Nothing to restore: your real Braino was never moved aside."); process.exit(0); }
  if (existsSync(live)) rmSync(live, { recursive: true, force: true }); // only the throwaway test copy
  renameSync(kept, live);
  console.log("Your real Braino is back: sign in, setup, memory and logs.");
  process.exit(0);
}

if (existsSync(kept)) {
  // Already in a fresh run: clear the test copy and start over, never touch the real one.
  if (existsSync(live)) rmSync(live, { recursive: true, force: true });
  console.log("Cleared the last test run. Your real Braino is still safe in \"Braino Mac.real\".");
} else if (existsSync(live)) {
  renameSync(live, kept);
  console.log("Moved your real Braino aside to \"Braino Mac.real\". Nothing was deleted.");
}

if (args.has("--permissions")) {
  // The dev app is Electron; the shipped app will have its own id.
  for (const id of ["com.github.Electron", "com.braino.mac"]) {
    try { execFileSync("/usr/bin/tccutil", ["reset", "All", id], { stdio: "ignore" }); } catch (_) {}
  }
  console.log("Reset Microphone, Accessibility, Screen Recording and Contacts for Braino.");
}

console.log("\nNow run: npm run mac:dev\nYou'll see what a new person sees. When you're done: npm run mac:fresh -- --restore");
