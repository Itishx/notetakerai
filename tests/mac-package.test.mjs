import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Shipping to testers (2026-10-13): same brain on every Mac, nothing that only
   exists on Itish's machine, and never a secret inside the app. */
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const pkg = read("../scripts/mac-package.mjs");

test("Swift helpers run compiled when shipped, from source in development", () => {
  assert.match(main, /function prebuiltHelper\(name\)/);
  for (const n of ["BrainoControlTap", "BrainoSpeech", "BrainoTouchID", "BrainoAX", "BrainoNotchMeasure"]) assert.match(main, new RegExp(`prebuiltHelper\\("${n}"\\)`), n);
  for (const n of ["BrainoControlTap", "BrainoSpeech", "BrainoTouchID", "BrainoAX", "BrainoDrop"]) assert.match(pkg, new RegExp(n), n);
});

test("Laya ships inside the app, the live context model, the same as Itish's", () => {
  assert.match(main, /const LAYA_IS_SHIPPED = fs\.existsSync\(path\.join\(LAYA_SHIPPED, "python", "bin", "python3\.11"\)\);/);
  assert.match(main, /PYTHONPATH: path\.join\(LAYA_SHIPPED, "site-packages"\)/);
  assert.match(pkg, /env\.BRAINO_LAYA_CONTEXT = "1";/);
  assert.match(pkg, /"braino-kind-v7"/);
});

test("only the public key and BRAINO_ flags reach the app's settings", () => {
  assert.match(pkg, /\/\^\(VITE_SUPABASE_URL\|VITE_SUPABASE_ANON_KEY\|VITE_SUPABASE_PUBLISHABLE_KEY\|BRAINO_\[A-Z0-9_\]\+\)\$\//);
});

test("macOS is told why each permission is asked for", () => {
  for (const k of ["NSMicrophoneUsageDescription", "NSCameraUsageDescription", "NSAppleEventsUsageDescription", "NSContactsUsageDescription"]) assert.match(pkg, new RegExp(k), k);
});

/* 2026-10-13: the first tester build showed no Braino at all. The preload reads
   his drawing from src/components, which was not in the app, so the bridge
   never loaded and the notch never started. Everything read from outside the
   Mac folder ships. */
test("everything the app reads from outside its folder ships with it", () => {
  assert.match(pkg, /WalkerSvg\\\.ts\$/);
  assert.match(pkg, /path\.join\(ROOT, "shared"\)/);
  assert.match(pkg, /path\.join\(ROOT, "public", "fonts"\)/);
  assert.match(pkg, /path\.join\(ROOT, "extension", "lib"\)/);
});
