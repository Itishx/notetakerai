import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The Mac's own calendar for the loop (2026-10-15). */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
const lessons = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/use-cases.ts", import.meta.url), "utf8");

test("the loop can call mac_calendar and the Mac answers it", () => {
  assert.match(catalog, /name: "mac_calendar"/);
  assert.match(main, /mac_calendar: \(a\) => macCalendar\(a\)/);
  assert.match(main, /async function macCalendar\(a = \{\}\)/);
});

test("the Swift reads every calendar and can add one event", () => {
  const swift = eval(main.match(/const MAC_CAL_SWIFT = (\[[\s\S]*?\]\.join\("\\n"\));/)[1]);
  assert.match(swift, /predicateForEvents\(withStart: s, end: e, calendars: nil\)/);
  assert.match(swift, /defaultCalendarForNewEvents/);
  assert.match(swift, /print\("DENIED"\)/);
});

test("schedule questions go to the Mac's calendar first, for everyone", () => {
  assert.match(lessons, /11\. Anything about when they have what\./);
  assert.match(lessons, /mac_calendar first/);
  assert.doesNotMatch(lessons, /[\u2013\u2014]/);
});
