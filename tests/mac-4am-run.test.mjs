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
  assert.doesNotMatch(main, /`https:\/\/source\.unsplash\.com/);
  assert.match(main, /const candidates = direct \? \[wanted\] : await wallpaperImageUrls\(wanted\);/);
  // Bing first, by rank; Openverse (free photos only) never for a named subject that Bing found.
  assert.match(main, /const bing = await wallpaperUrlsFromBing\(subject\);\n  if \(bing\.length\) return bing;/);
  assert.match(main, /picked = got\.find\(Boolean\) \|\| null;/);
  assert.match(main, /const fresh = candidates\.filter\(\(u\) => !used\.has\(u\)\);/);
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

test("he remembers what they said earlier before asking", () => {
  assert.match(main, /Earlier in this conversation they said: /);
});

test("search answers are in his words, not the tool's", () => {
  assert.match(main, /search results \(\?:do not\|don'\?t\) \(\?:contain\|include\|show\|mention\)/);
});

/* 05:15 the same night: "Done. Your desktop is Superman now." while it was not. */
test("the wallpaper is applied through macOS's own API, then System Events as a fallback", () => {
  assert.match(main, /setDesktopImageURLForScreenOptionsError/);
  assert.match(main, /via = "system_events";/);
});

test("image sources and downloads run at the same time", () => {
  assert.match(main, /const got = await Promise\.all\(batch\.map\(\(url\) => fetchWallpaperImage\(url\)/);
});

test("a tool with no plain words is not read out", () => {
  assert.match(main, /narrator\.line\(stepLine\(turn\.decision\.step\?\.action, \(tool\) => PLAIN_STEP\[tool\] \|\| ""\)\);/);
});
