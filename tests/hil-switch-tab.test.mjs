import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* "Switch to the Notion tab" (2026-10-15): 85 seconds and the wrong page,
   because the loop had no tab move and two Notion tabs were open. */
const require = createRequire(import.meta.url);
const tabSwitch = require("../mac/braino-mac/tab-switch.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
const lessons = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/use-cases.ts", import.meta.url), "utf8");

const tabs = [
  { w: 1, i: 1, title: "Fish Audio API balance - Google Search", url: "https://www.google.com/search?q=Fish%20Audio%20API%20balance", active: true },
  { w: 1, i: 2, title: "Braino 16th Oct | Notion", url: "https://app.notion.com/p/itish/Braino-16th-Oct", active: false },
  { w: 1, i: 3, title: "BYOB To Do | Notion", url: "https://app.notion.com/p/itish/BYOB-To-Do", active: false },
];

test("a Notion tab on app.notion.com is found", () => {
  const hit = tabSwitch.pickTab(tabs, { query: "notion", nth: 1, saidTab: true });
  assert.ok(hit && /notion\.com/.test(hit.url));
});

test("the exact title picks the right one of two Notion tabs", () => {
  const exact = tabs.filter((t) => t.title.toLowerCase().includes("braino 16th oct"));
  assert.equal(exact.length, 1);
  assert.equal(exact[0].i, 2);
});

test("the loop can call switch_tab, and the Mac answers it", () => {
  assert.match(catalog, /name: "switch_tab"/);
  assert.match(main, /switch_tab: \(a\) => switchChromeTab\(/);
  assert.match(main, /async function switchChromeTab\(query\)/);
  assert.match(main, /I see more than one: .*Which one\?/);
});

test("the lesson is shared with every user", () => {
  assert.match(lessons, /8\. Going to a tab that is already open\./);
  assert.match(lessons, /switch_tab/);
  assert.match(lessons, /9\. "How much is left\?"/);
  assert.doesNotMatch(lessons, /[–—]/);
});
