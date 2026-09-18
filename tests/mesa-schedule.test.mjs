import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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
  assert.match(sql, /ADD CONSTRAINT schedule_events_source_ref_key/);
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

test("timetable questions reach the brain, not small talk", () => {
  /* The gap that would have made the whole feature look broken. "What is due
     this week" carries no verb from the task list, so it landed in the
     conversation branch and got answered from thin air by a model with no idea
     what he is enrolled in. The answer is in a table and only the loop can
     reach it. */
  const routing = require("../mac/braino-mac/hil-routing.cjs");
  for (const said of [
    "what's due this week",
    "what's on my timetable today",
    "do I have any classes tomorrow",
    "when is my next exam",
    "what assignments are coming up",
  ]) {
    assert.equal(routing.macWantsTheBrain(said), true, said);
  }
});

test("Braino reads the timetable instead of visiting a website", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /schedule_lookup: \(a\) => lookupSchedule\(a\)/);
  assert.match(main, /rest\/v1\/schedule_events/, "it is a table query, not a browser visit");

  /* A deadline reads as "due at", not as a span from 23:59 until 23:59. */
  assert.match(main, /DUE \$\{time\}/);

  /* Empty and never-synced are different problems with different fixes, and a
     blank answer cannot tell them apart. */
  assert.match(main, /may not have synced yet/);

  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /name: "schedule_lookup"/, "the model is never told about a tool the catalog omits");
});

test("connecting a timetable is not a setup step", () => {
  /* The alternative was a button, a field to paste an LMS link into, or a
     console command. All of it asks someone to tell Braino something Braino can
     already see: they are looking at their own timetable, signed in, right now.
     So the first time the calendar is opened it is already connected. */
  assert.match(bg, /chrome\.tabs\.onUpdated\.addListener/);
  assert.match(bg, /BG_MESA_HOSTS/);
  assert.match(bg, /saw-nexus/);

  /* Throttled, because a Next.js app fires that listener several times per
     navigation and the answer cannot change in ten minutes. */
  assert.match(bg, /BG_MESA_AUTO_SYNC_GAP_MS/);
  assert.match(bg, /changeInfo\.status !== "complete"/);

  // And once at startup, so a morning briefing has something to read before
  // anybody has opened anything.
  assert.match(bg, /chrome\.runtime\.onStartup\?\.addListener/);
});

test("the notch says it once, not every hour", () => {
  /* Connecting has no setup step, which is lovely and completely invisible.
     Somebody who was never asked to do anything still needs telling that
     something happened. But the same fact announced hourly is not information,
     it is weather. */
  const content = readFileSync(new URL("../extension/content.js", import.meta.url), "utf8");
  assert.match(bg, /mesaConnectedShown/, "the once-only flag must survive a sleeping worker");
  assert.match(bg, /chrome\.storage\.local\.set\(\{ mesaConnectedShown/);
  assert.match(bg, /action: "sbSchoolConnected"/);
  assert.match(content, /if \(msg\.action === "sbSchoolConnected"\)/);

  /* Green, and it has to be a colour nothing else uses: coral is him, gold is
     Astra thinking, blue is work in progress. */
  assert.match(content, /sb-notch-connected\{[^}]*#2f9d63/);
  assert.match(content, /__SB_NOTCH_CLASSES[^;]*sb-notch-connected/,
    "it must be in the class list, or the state machine cannot clear it");

  /* And it must stand down without stomping whatever claimed the notch since. */
  assert.match(content, /classList\.contains\("sb-notch-connected"\)/);
});

test("the Mac can sync without the extension, and says why when it cannot", () => {
  /* The extension is the right home for this: Nexus keeps its refresh token in
     an httpOnly cookie and only something inside Chrome can spend it. But
     asking someone to open an extension's service worker console to find out
     whether their calendar synced is not a product, and the Mac app is where he
     actually lives. It drives Chrome through the same AppleScript door that
     reads pages, so it is the same cookie and the same browser. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /schedule_sync: \(\) => syncScheduleFromNexus\(\)/);
  assert.match(main, /r\.open\("POST","\/api\/auth\/refresh",false\)/,
    "synchronous, or the completion value is [object Promise] and the work is thrown away");
  assert.match(main, /r\.withCredentials=true/, "the httpOnly cookie only rides along when asked for");

  /* The one thing that could not be tested from outside is what Nexus calls the
     token field. "It did not work" is a worse answer than the list of what it
     did return. */
  assert.match(main, /no token in refresh, keys: /);

  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /name: "schedule_sync"/);

  // And "sync my nexus calendar" has to reach the brain to find the tool at all.
  assert.equal(require("../mac/braino-mac/hil-routing.cjs").macWantsTheBrain("sync my nexus calendar"), true);
});

test("the upsert key is a constraint, not a partial index", () => {
  /* The bug that made every sync fail with "there is no unique or exclusion
     constraint matching the ON CONFLICT specification".

     It was written as a partial unique index so that rows with nothing to
     reference, a spoken "dentist on Thursday", could coexist. Postgres will not
     resolve ON CONFLICT against a partial index unless the statement repeats
     the predicate, and PostgREST has no way to express one. The clause was also
     unnecessary: NULLs are already distinct from each other in a unique index,
     so those rows coexist regardless. It bought nothing and cost the feature. */
  const first = readFileSync(
    new URL("../supabase/migrations/20260918000001_schedule_events.sql", import.meta.url), "utf8");
  assert.doesNotMatch(first, /CREATE UNIQUE INDEX[\s\S]*?schedule_events[\s\S]*?WHERE source_ref IS NOT NULL/,
    "a partial index cannot answer ON CONFLICT");
  assert.match(first, /ADD CONSTRAINT schedule_events_source_ref_key\s+UNIQUE \(user_id, source, source_ref\)/);

  // And fixed forward for databases that already applied the broken one.
  const fix = readFileSync(
    new URL("../supabase/migrations/20260918000002_schedule_events_upsert_fix.sql", import.meta.url), "utf8");
  assert.match(fix, /DROP INDEX IF EXISTS public\.schedule_events_source_ref_idx/);
  assert.match(fix, /ADD CONSTRAINT schedule_events_source_ref_key/);
});
