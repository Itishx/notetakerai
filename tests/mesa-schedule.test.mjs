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
     blank answer cannot tell them apart. It names the tool that fixes it, not a
     website: pointing at Nexus is what made it invent a URL. */
  assert.match(main, /run the schedule_sync tool to pull it again/);

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

test("a timetable read knows what time it is", () => {
  /* "Your next class is Mentorship Check-ins at 9:30am", answered at 2:49pm.
     Not carelessness: the list started at midnight and said nothing about now,
     so the first row really was the first row. A model cannot reason about
     "next" against data with no present in it.

     Fixed in the data, not the prompt. A rule saying "remember what time it is"
     is a thing to obey; a list that says which items are over is a thing to
     read. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /Right now it is \$\{macFriendlyDay/, "the answer must carry the present");
  assert.match(main, /already finished/);
  assert.match(main, /deadline passed/);

  /* Marked, not hidden. "What was on this morning" is a real question, and a
     past event that is simply missing reads as a gap in the timetable. */
  assert.match(main, /const past = new Date\(r\.ends_at \|\| r\.starts_at\) < now/);

  // And "now" has to exist as a word, or there is no way to ask for it.
  assert.match(main, /if \(t === "now"\) return now;/);
  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /Use from:now for anything about what is NEXT/);
});

test("an empty window looks further before giving up", () => {
  /* "What is my next class" was answered with "no classes between Friday 18
     September and Friday 18 September". The window was one day, the day was
     nearly over, and the answer to a question about what is NEXT was sitting
     the following morning. Asked at five to three, a person does not report
     that the afternoon is empty. They look at tomorrow. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /if \(!rows\.length && windowDays <= 8\)/);
  assert.match(main, /Nothing left in the window you asked about/,
    "and it must say it widened, or two different answers look identical");

  /* Only a short window, and only when empty. "What is on this week" coming
     back empty is a real answer about this week and must not quietly become a
     month. */
  assert.match(main, /const windowDays = \(toEnd - from\) \/ 86400000;/);
});

test("the rest of today is a schedule question too", () => {
  // None of these carry a word from the original list, and they are all the
  // same question.
  const routing = require("../mac/braino-mac/hil-routing.cjs");
  for (const said of [
    "what is left today",
    "what have I got for the rest of the day",
    "am I free today",
  ]) {
    assert.equal(routing.macWantsTheBrain(said), true, said);
  }
  // And the fast lane is still the fast lane.
  assert.equal(routing.macWantsTheBrain("play billie jean"), false);
});

test("an empty timetable never sends it hunting the web", () => {
  /* The empty message used to end with "open Chrome and sign in to Nexus", and
     the loop did exactly that: went looking for Nexus on the open web, invented
     nexus.ifheindia.org, which is a different college entirely, and reported
     that the timetable was blank.

     An empty result has to point at the one thing that fixes it and forbid the
     thing that looks like it might. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /run the schedule_sync tool to pull it again/);
  assert.match(main, /Do NOT go looking for the LMS on the web/);
  assert.doesNotMatch(main, /open Chrome with Braino installed and signed in to Nexus/,
    "the old wording is what caused the invented URL");

  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /never search the web for it and never guess at its address/);
});

test("one letter must not empty the whole timetable", () => {
  /* kind=eq.classes against rows stored as class. The filter matched nothing,
     the sixty day widen also matched nothing, and it ended up clicking a
     calendar event from eighteen days ago and calling it the next class.

     A model says classes, lectures, deadlines, homework and tests for things
     stored under three names. Accept how people speak, and drop anything still
     unrecognised: a filter nobody understands should widen the answer, never
     silently empty it. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const table = main.slice(main.indexOf("const MAC_SCHEDULE_KINDS"), main.indexOf("function macNormaliseKind"));
  for (const [said, stored] of [
    ["classes", "class"], ["lectures", "class"], ["sessions", "class"],
    ["deadlines", "assignment"], ["homework", "assignment"], ["due", "assignment"],
    ["exams", "exam"], ["tests", "exam"], ["workshops", "workshop"],
  ]) {
    assert.match(table, new RegExp(`${said}: "${stored}"`), `${said} must map to ${stored}`);
  }

  /* The important half: an unknown word drops the filter rather than applying
     it. Otherwise the next unanticipated synonym empties the timetable again. */
  const fn = main.slice(main.indexOf("function macNormaliseKind"), main.indexOf("async function lookupSchedule"));
  assert.match(fn, /logMac\("schedule\.kind\.unknown"/);
  assert.match(fn, /return "";\s*\}/, "an unrecognised kind must fall through to no filter");

  // And the query logs itself, which is the only reason this was findable.
  assert.match(main, /logMac\("schedule\.query", \{ count:/);
});

test("the common timetable questions never reach a model", () => {
  /* "What is my next class" took twelve and a half seconds, and eleven of them
     were thinking: one turn to decide to look it up, another to read the row
     back and say it. The database query is milliseconds. Two language model
     calls to read one row.

     It is a lookup, not a task, so it belongs in the fast lane beside "play
     billie jean". The loop was right while there was nothing to look up. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

  // It has to run BEFORE the HIL gate, or the brain claims the sentence first
  // and nothing here ever executes.
  const fast = main.indexOf("const quickSchedule = await macAnswerScheduleFast(text);");
  const hil = main.indexOf("if (macHilEnabled() && macWantsTheBrain(raw)) {");
  assert.ok(fast > 0 && hil > 0 && fast < hil, "the fast lane must come before the HIL gate");

  /* Narrow on purpose. A fast lane that tries to cover every phrasing stops
     being fast and becomes a worse model, so anything unmatched falls through
     to the brain untouched. */
  const fn = main.slice(main.indexOf("async function macAnswerScheduleFast"), main.indexOf('/* "Am I going to fall below'));
  assert.match(fn, /if \(!say \|\| !String\(say\)\.trim\(\)\) return null;/,
    "an empty fast answer must go to the brain, which can sync and look wider");
  assert.match(fn, /return null; \/\/ fall through to the brain rather than answer badly/);
});

test("one question gets one answer, not the week", () => {
  /* "What is my next class" was answered with two and a half thousand
     characters read aloud. Being told everything when you asked for one thing
     is not a smaller failure than being told nothing, just a louder one. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // One class, or the one you are in plus the one after: never the week.
  assert.match(main, /say = next \? `Your next class is \$\{short\(next\)\}/);
  assert.match(main, /say = `Right now you should be in \$\{live\.title\}/);

  /* And said the way a person says it: "in about an hour", not a timestamp to
     subtract from. That relative phrasing is the whole reason anyone asks. */
  assert.match(main, /function macRelativeWhen/);
  assert.match(main, /return "in about an hour";/);
});

test("the class you are sitting in is not the one after it", () => {
  /* "When does this class end" contains neither the word next nor a day, so it
     has to be matched before the next-class rule or it answers about the wrong
     lesson entirely. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const ends = main.indexOf("MAC_FAST_ENDS.test(t) || MAC_FAST_CURRENT.test(t)");
  const next = main.indexOf("} else if (MAC_FAST_NEXT.test(t)) {");
  assert.ok(ends > 0 && next > 0 && ends < next, "current must be checked before next");
  assert.match(main, /You are in \$\{live\.title\}/);
  assert.match(main, /minutes left/);
});

test("four overdue assignments is not 'nothing due'", () => {
  /* He had four, all overdue, and asking produced nothing: the pattern only
     said deadlines, and the window only looked forward. Both halves wrong, and
     the overdue one is the half you most need telling about. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /do i have any\\s\+\(\?:assignments\?\|homework\|deadlines\?\)/);
  assert.match(main, /const overdue = rows\.filter\(\(r\) => new Date\(r\.starts_at\) < now\);/);
  assert.match(main, /was due \$\{macFriendlyDay/);

  /* And it says where the answer came from, because the calendar carries
     deadline markers and not the submissions themselves. */
  assert.match(main, /Nexus tracks the submissions themselves separately/);
});
