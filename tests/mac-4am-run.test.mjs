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

/* 2026-10-11 evening: "New York" got a food blog picture, and "Done." */
test("every wallpaper is looked at before it is set; a no is never set", () => {
  assert.match(main, /async function wallpaperShows\(image, subject\)/);
  assert.match(main, /const ok = await Promise\.all\(got\.map\(\(g\) => \(g \? \(direct \? true : wallpaperShows\(g\.image, wanted\)\) : false\)\)\);/);
  assert.match(main, /picked = got\.find\(\(g, k\) => g && ok\[k\]\) \|\| null;/);
  assert.match(main, /none of them was really \$\{name\}, so I left your wallpaper alone/);
});

test("'a photo of San Francisco' searches for San Francisco", () => {
  assert.match(main, /\(\?:photo\|picture\|pic\|image\|wallpaper\|shot\)s\?\\s\+of\\s\+/);
});

/* 2026-10-11: a Meet "at 9 tonight" took the loop over a minute clicking Calendar. */
const catalog = read("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts");
test("Google Calendar is one API call on the Mac, with a Meet link", () => {
  for (const t of ["calendar_create", "calendar_list", "calendar_reschedule", "calendar_cancel", "calendar_join_next"]) assert.match(catalog, new RegExp(`name: "${t}"`), t);
  assert.match(catalog, /name: "calendar_cancel"[^\n]*irreversible: true/);
  assert.match(main, /functions\/v1\/google-calendar-action/);
  assert.match(main, /if \(link\) \{ try \{ clipboard\.writeText\(link\); \} catch \(_\) \{\} \}/);
  assert.match(main, /if \(r\.notConnected\) return calendarNotConnectedReply\(\);/);
  assert.match(useCases, /Never click through Calendar's website/);
});

/* "Can you please read out Ilu's messages?" got "Say it again?" */
test("a clear English request is never called misheard", () => {
  assert.match(main, /function macEnglishish\(w\)/);
  assert.match(main, /return words\.length >= 3 && !words\.some\(\(w\) => macEnglishish\(w\)\);/);
});

/* "Open the article": the news he just read out, one tap away (2026-10-11). */
const rr = read("../mac/braino-mac/renderer/braino-mac.js");
test("a search answer offers its articles in the sheet; nothing opens on its own", () => {
  assert.match(main, /sendToRenderer\("braino-mac:web-sources", \{ hosts, links, at: Date\.now\(\) \}\);/);
  assert.match(rr, /nfSourceButton\(links\.length > 1 \? `Open \$\{links\.length\} articles` : "Open the article"/);
  assert.match(main, /ipcMain\.handle\("braino-mac:open-sources"/);
});

test("only when the answer IS the search: research jobs and loops do not get it", () => {
  assert.match(main, /const searchAnswer = Date\.now\(\) - answerFromSearchAt < durationMs \+ 500 && !\/\^hil_loop\/\.test/);
  assert.match(main, /if \(!searchAnswer\) sendToRenderer\("braino-mac:web-sources", \{ hosts: \[\], links: \[\], at: 0 \}\);/);
});

test("saying 'open the article' works too, through HIL", () => {
  assert.match(catalog, /name: "open_search_sources"[\s\S]{0,400}handler: "openSearchSources"/);
  assert.match(main, /open_search_sources: \(a\) => openSearchSources\(a\),/);
});

test("the router knows there are articles to open", () => {
  assert.match(main, /searchArticles: Date\.now\(\) - lastSearchLinks\.at < 10 \* 60000/);
  assert.match(useCases, /open_search_sources, with which for a numbered one/);
});

/* "Ilu · 2 new" stuck in the notch for good (2026-10-11). */
test("the WhatsApp badge goes away, and tapping it shows the messages in the notch", () => {
  assert.match(main, /const WA_BADGE_MAX_MS = 10 \* 60 \* 1000;/);
  assert.match(main, /ipcMain\.handle\("braino-mac:wa-badge-open"/);
  assert.match(main, /async function pollWhatsAppDb\(\) \{\n  if \(waBadgeCount && activeMacContext\?\.appName === "WhatsApp"\) clearWaBadge\(\);/);
  assert.match(rr, /const r = await window\.brainoMac\?\.waBadgeOpen\?\.\(\)/);
  assert.match(rr, /void speak\(text, \{ silent: true, notchRich: r\.messages\.length > 1 \}\);/);
});
