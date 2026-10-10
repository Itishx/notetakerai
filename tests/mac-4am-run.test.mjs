import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Lessons from the 4am run (2026-10-11, 36 minutes, 27 turns). Each test is
   one gap between what was wanted and what Braino did. */
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const r = read("../mac/braino-mac/renderer/braino-mac.js");
const useCases = read("../supabase/functions/_shared/human-intelligence/use-cases.ts");
const hil = read("../supabase/functions/_shared/human-intelligence/hil-system-prompt.ts");

test("wallpaper from the web no longer uses the dead Unsplash address", () => {
  assert.doesNotMatch(main, /source\.unsplash\.com/);
  assert.match(main, /const candidates = direct \? \[wanted\] : await wallpaperImageUrls\(wanted\);/);
  assert.match(main, /buffer\.length >= 60000/);
});

test("HIL learned the use cases by intent, in every brain, and its version moved", () => {
  assert.match(hil, /export const HIL_VERSION = "1\.2\.0";/);
  assert.match(useCases, /Match on what they mean, never on a word/);
  assert.match(useCases, /wallpaper_set_from_web with the subject/);
  for (const f of ["../supabase/functions/_shared/human-intelligence/hil-router-prompt.ts", "../supabase/functions/reasoning/hil-plan/index.ts", "../supabase/functions/reasoning/hil-loop/index.ts"]) assert.match(read(f), /HIL_USE_CASES/, f);
  assert.doesNotMatch(useCases, /[—–]/);
});

test("the agent stops honestly: three fails in a row, or 90 seconds", () => {
  assert.match(main, /const MAC_HIL_FAILS_IN_A_ROW = 3;/);
  assert.match(main, /const MAC_HIL_SOFT_TIME_MS = 90000;/);
  assert.match(main, /logMac\("hil\.loop\.honest_stop"/);
});

test("he never clicks his own buttons", () => {
  assert.match(main, /filter\(\(el\) => !\/\\bBraino\\b\/i\.test/);
});

test("sure talk goes to the conversation, not the job loop", () => {
  assert.match(main, /logMac\("laya\.talk_fast"/);
});

test("a service only one ear heard decides where it plays", () => {
  assert.match(r, /const heraOnlyService = /);
});

test("markdown is never read out loud", () => {
  assert.match(r, /spoke = await speakWithStreamingTts\(spokenLine, generation\);/);
});

test("'open it in the desktop' is not an app called 'it in the desktop'", () => {
  assert.match(main, /const PRONOUN_LEAD = /);
});
