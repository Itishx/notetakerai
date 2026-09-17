import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Reading a student's timetable out of their college LMS.
 *
 * Mesa is the first source and deliberately not a special case: everything here
 * writes into schedule_events with source:"mesa", so a PDF timetable or a
 * Google Calendar is another function beside this one and nothing downstream
 * changes.
 */
const bg = readFileSync(new URL("../extension/background.js", import.meta.url), "utf8");
const sql = readFileSync(
  new URL("../supabase/migrations/20260918000001_schedule_events.sql", import.meta.url), "utf8");

test("the login stays in the browser, because that is the only place it exists", () => {
  /* Nexus keeps its refresh token in an httpOnly, path-scoped cookie. No script
     can read it and no server can be handed it, so this has to run where the
     cookie already lives. credentials:"include" is the whole trick. */
  assert.match(bg, /students\.mesaschool\.co\.in/);
  assert.match(bg, /credentials: "include"/, "the cookie only rides along when asked for");
  assert.match(bg, /\/api\/auth\/refresh/, "a fresh 15-minute token is minted per sync, never stored");
  assert.doesNotMatch(bg, /refresh_token\s*=/, "the refresh token must never be copied out of the jar");
});

test("an hourly sync cannot duplicate Monday's lecture", () => {
  /* Without the upsert this is an insert, and a week of hourly syncs is a
     hundred and sixty copies of every class. */
  assert.match(bg, /on_conflict=user_id,source,source_ref/);
  assert.match(bg, /resolution=merge-duplicates/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS schedule_events_source_ref_idx/);
});

test("a deadline is a moment, a class is a span", () => {
  /* Nexus sends the same value for start and end on a deadline. Copied through,
     a briefing reads "from 23:59 until 23:59"; nulled, it can say "due at". */
  assert.match(bg, /event\.endAt !== startsAt \? event\.endAt : null/);
  assert.match(bg, /assignment: "assignment"/, "deadlines must keep their own kind");
  assert.match(sql, /kind IN \('assignment', 'exam'\)/, "and 'what is due' earns its own index");
});

test("not signed in to Nexus is a skip, not a failure", () => {
  // It happens every time the session lapses. The right answer is to try again
  // in an hour, not to raise something nobody can act on.
  assert.match(bg, /skipped: true/);
});

test("the table is built for four sources, not one", () => {
  assert.match(sql, /source TEXT NOT NULL/);
  assert.match(sql, /raw JSONB/, "keep what was sent; four sources are coming");
  assert.doesNotMatch(sql, /CREATE TABLE IF NOT EXISTS public\.mesa_/, "nothing here may be Mesa-shaped");
});

test("a timetable is private, unlike a lesson", () => {
  /* braino_lessons is shared on purpose. This is the opposite: every policy is
     scoped to the owner and there is no cross-user read. */
  assert.match(sql, /ALTER TABLE public\.schedule_events ENABLE ROW LEVEL SECURITY/);
  for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(sql, new RegExp(`FOR ${op}`), `${op} must be scoped to the owner`);
  }
});

test("a service worker sleeps, so the schedule runs on an alarm", () => {
  // setInterval dies with the worker. chrome.alarms survives it.
  assert.match(bg, /chrome\.alarms\.create\(BG_MESA_SYNC_ALARM/);
  assert.match(bg, /periodInMinutes: 60/);
});
