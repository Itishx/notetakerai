import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const page = read("../mac/braino-mac/chrome-page.cjs");

/* Chrome exposes its own furniture to the accessibility tree and almost none of
   the page. A real BookMyShow run was handed browser chrome and spent five
   steps hunting a Book tickets button that was in the middle of the screen. */

test("on the web he reads the page, not the window", () => {
  const obs = main.slice(main.indexOf("async function macBuildObservation"));
  const body = obs.slice(0, obs.indexOf("\n}\n"));
  assert.match(body, /if \(isChromeApp\(data\?\.app\)\) \{/);
  assert.match(body, /elements = page\.elements;/);
  /* And the log says which world the reading came from. */
  assert.match(body, /source: sawPage \? "page" : "window"/);
});

/* It must land in the observation builder and nowhere else: an earlier attempt
   put this in readCursorAgentSignal, because a blind replace took the first
   match of a line that appears twice. */
test("the page read is in the observation builder only", () => {
  assert.equal((main.match(/let sawPage = false;/g) || []).length, 1);
  const cursorFn = main.slice(main.indexOf("async function readCursorAgentSignal"));
  assert.doesNotMatch(cursorFn.slice(0, cursorFn.indexOf("\n}\n")), /isChromeApp|hil\.observed/);
});

/* DOM indexes and accessibility-tree indexes are different numbers for
   different things. An action has to go back through the door the reading
   came through. */
test("actions return through the same door", () => {
  assert.match(main, /const onPage = Boolean\(macLastReadWasPage\)/);
  assert.match(main, /const res = await actOnChrome\(action\.index, kind, value, macLastReadWasPage\.app\);/);
  /* The old accessibility path is still there for everything that is not a page. */
  assert.match(main, /runAxHelper\(\["pressindex"/);
});

/* Clicking the wrong thing on a checkout page is the one mistake worth
   engineering against, so acting uses the stamp the read left behind rather
   than a fresh index that may have drifted. */
test("he acts on what he saw, not on what is there now", () => {
  assert.match(page, /e\.setAttribute\('data-braino-idx', String\(n\)\)/);
  assert.match(page, /document\.querySelector\('\[data-braino-idx="' \+ /);
  assert.match(page, /BRAINO_GONE/);
});

test("a shut door is told apart from a broken script", () => {
  assert.match(page, /Allow JavaScript from Apple Events[\s\S]{0,80}javascript_not_allowed/);
  assert.match(page, /chrome_not_running/);
  assert.match(page, /bad_script/);
});

test("the reader hands back what the loop already understands", () => {
  const { readChromePage, isChromeApp } = require_("../mac/braino-mac/chrome-page.cjs");
  assert.equal(typeof readChromePage, "function");
  assert.equal(isChromeApp("Google Chrome"), true);
  assert.equal(isChromeApp("Cursor"), false);
});

/* The page reading never fired once in a real session. The accessibility helper
   reports the front app as "Chrome"; the check looked for "Google Chrome", so
   every observation silently fell back to the tree and a whole Notion run was
   done blind. AppleScript, meanwhile, only answers to the full name. */
test("the name the Mac reports and the name AppleScript needs are both handled", () => {
  const { isChromeApp, chromeScriptName } = require_("../mac/braino-mac/chrome-page.cjs");
  assert.equal(isChromeApp("Chrome"), true, "the Mac reports it as Chrome");
  assert.equal(chromeScriptName("Chrome"), "Google Chrome", "AppleScript needs the full name");
  assert.equal(chromeScriptName("Brave"), "Brave Browser");
  assert.equal(isChromeApp("Electron"), false);
  /* And nothing may pass the reported name straight to AppleScript. */
  assert.doesNotMatch(page, /runJs\(READ_JS, app \|\| "Google Chrome"\)/);
  assert.match(page, /runJs\(READ_JS, chromeScriptName\(app\)\)/);
});

/* A real run navigated to Notion perfectly, then judged itself failed because
   it asked for notion.so and arrived at app.notion.com, and spent the rest of
   its budget circling over a redirect that had worked. */
test("a redirect is not a failure", () => {
  const prompt = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts", import.meta.url), "utf8");
  assert.match(prompt, /A SITE THAT MOVES YOU IS NOT A SITE THAT FAILED YOU/);
  assert.match(prompt, /assert on the part that identifies the SERVICE/);
  assert.match(prompt, /believe the page. The assert is a helper, not a judge/);
  const v = prompt.match(/HIL_LOOP_VERSION = "(\d+)\.(\d+)\.\d+"/);
  assert.ok(v && (Number(v[1]) > 2 || Number(v[2]) >= 8), `version ${v?.[0]} predates this rule`);
});

/* Google Docs was pressed on "Blank document" four times, reported success four
   times, and never opened a document. A dispatched click is synthetic and
   serious sites refuse it; no amount of faking the event sequence changes that,
   because the page can see the event was not genuine. Proven on that exact
   tile: a real OS click at the same point opened the document. */
test("a click is a real mouse press, not a dispatched event", () => {
  const block = main.slice(main.indexOf("A click goes through the real mouse"));
  const body = block.slice(0, 2200);
  assert.match(body, /chromePointFor\(action\.index, macLastReadWasPage\.app\)/);
  assert.match(body, /runAxHelper\(\["clickat", String\(point\.x\), String\(point\.y\)\]/);
  /* Eyes from the DOM, hands from the OS. */
  assert.match(body, /Eyes from the DOM, hands from the OS/);
});

/* Reporting a dead click as a good one is what made him press the same tile
   four times in a row. */
test("a click that changes nothing is reported as changing nothing", () => {
  const block = main.slice(main.indexOf("A click goes through the real mouse"));
  const body = block.slice(0, 2200);
  assert.match(body, /const before = await pageSignature\(/);
  assert.match(body, /const after = await pageSignature\(/);
  assert.match(body, /if \(before && after && before === after\)/);
  assert.match(body, /nothing on the page changed/);
});

/* The DOM gives viewport coordinates and a real mouse needs screen ones. */
test("the page says where, in points the mouse can be sent to", () => {
  assert.match(page, /window\.outerHeight - window\.innerHeight/);
  assert.match(page, /window\.screenX \+ r\.left \+ r\.width\/2/);
  /* And an element that has gone is reported gone, not clicked at zero. */
  assert.match(page, /if\(!r\.width\|\|!r\.height\) return 'BRAINO_GONE';/);
});
