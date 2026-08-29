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
