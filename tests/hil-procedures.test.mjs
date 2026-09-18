import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadPureRules } from "../scripts/lib/hil-pure.mjs";

/* He remembers what worked, not only what did not.
 *
 * braino_lessons shipped first and stores every wall he has ever walked into.
 * Nothing stored the doors, so a run that booked the tickets correctly taught
 * him nothing and the next one worked it out again from zero. This is the other
 * half, built to the same shape on purpose.
 *
 * The tests that matter most here are not the ones about recall working. They
 * are the ones about a remembered route staying advisory: it is read by every
 * user's Braino, it describes a screen that may since have changed, and the one
 * unforgivable version of this feature is the one where "this is how it went
 * last time" quietly becomes a reason to skip asking before something
 * irreversible.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const procedures = read("../supabase/functions/_shared/human-intelligence/procedures.ts");
const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");
const migration = read("../supabase/migrations/20260918000001_braino_procedures.sql");

/* The real matching rules, loaded out of the real file rather than restated
   here: a test that keeps its own copy of them passes forever while the ones
   that actually run rot. Same loader the harvest script uses. */
const pure = await loadPureRules();

test("two bookings for different films are the same job", () => {
  /* The bug this replaced, and it would have been silent. Sameness used to be
     the fingerprint, which keeps proper nouns, so every film wrote its own row,
     no row ever reached the two hits that promote it, and a table quietly
     filling up would never have handed anybody anything. Sameness is overlap
     now, and it is the same function recall uses, so a route is offered on
     exactly the runs that count as hits for it. */
  const a = pure.goalWords("book 2 tickets for Insidious at 7pm");
  const b = pure.goalWords("book 4 tickets for Sinners at 9pm");
  assert.ok(pure.goalOverlap(a, b) >= 0.5, "a different film is not a different job");
});

test("recording matches the way recall matches, not by fingerprint", () => {
  /* One notion of the same job, in one function, used in both places. Two would
     drift, and the drift is invisible: routes accumulate and are never offered,
     or are offered and never credited. */
  assert.match(procedures, /const row = \(Array\.isArray\(rows\) \? rows : \[\]\)[\s\S]{0,200}goalOverlap\(asked, goalWords\(r\.goal\)\)/);
  assert.doesNotMatch(procedures, /fingerprint=eq\./, "the fingerprint is the insert guard, not the matcher");
});

test("a route a human rejected is never quietly re-proposed", () => {
  /* Rejected rows are fetched rather than filtered out in the query. Filtering
     would mean no match, which would mean a new row: the thing somebody said no
     to, back under a fresh id the next time it happens to work. */
  assert.doesNotMatch(procedures, /status=neq\.rejected/);
  assert.match(procedures, /if \(row\.status === "rejected"\) return;/);
});

test("the same job on a different site is a different row", () => {
  assert.notEqual(
    pure.goalFingerprint("bookmyshow.com", "book tickets"),
    pure.goalFingerprint("district.in", "book tickets"),
    "a route is only true of the place it was learned",
  );
});

test("a coincidental word is not a match, half the goal is", () => {
  /* The failure this threshold exists to stop: recalling the route for
     "archive an email" when asked to "reply to an email" is a confident wrong
     answer at the exact moment he is deciding what to do first, and he has no
     way to tell it from a good one. */
  const asked = pure.goalWords("reply to the email from Priya about the deck");
  const same = pure.goalWords("reply to an email from Sam");
  const other = pure.goalWords("archive every email older than a month");
  assert.ok(pure.goalOverlap(asked, same) >= 0.5, "the same job must match");
  assert.ok(pure.goalOverlap(asked, other) < 0.5, "a different job must not");
});

test("a route is what he did, not what he says he did", () => {
  /* Derived from the run's own step record rather than asked for as an extra
     field. It costs no output tokens, it cannot be hallucinated, and a model
     that has just finished a job cannot rewrite history about how. */
  assert.match(procedures, /export function routeFromSteps/);
  assert.match(loop, /const route = routeFromSteps\(loopState\?\.steps \|\| \[\]\)/);
  assert.doesNotMatch(prompt, /"route":/, "the model is never asked to write the route");
});

test("the steps that failed are left out of the route", () => {
  assert.match(procedures, /\.filter\(\(s\) => s && s\.ok !== false/);
});

test("a route is only kept when the whole command finished", () => {
  /* all_done and not task_done. One job out of three finishing is not evidence
     the approach worked, and the steps at that point belong to all three jobs
     mixed together, which would teach a route that does the wrong two things. */
  assert.match(loop, /if \(turn\?\.decision\?\.type === "all_done" && hostScope\) \{/);
  assert.doesNotMatch(loop, /decision\?\.type === "task_done"[\s\S]{0,200}recordProcedure/);
});

test("one lucky run cannot teach every Braino a route", () => {
  /* The whole risk of a shared table, and the same answer lessons gave: two
     independent runs before anybody else sees it, and a human no is permanent. */
  assert.match(procedures, /const PROMOTE_AT_HITS = 2;/);
  assert.match(procedures, /status=eq\.live/, "only promoted routes are ever injected");
  assert.match(procedures, /if \(row\.status === "rejected"\) return;/);
});

test("a route can never widen what an action is allowed to do", () => {
  /* The line this whole feature lives or dies on. Said in the injected text so
     the model reads it every time, and said in the prompt rule so it is not
     only the block's word for it. The gate is code elsewhere and does not read
     this table at all, which is what actually makes it true. */
  assert.match(procedures, /they never permit an action you would not otherwise take, and anything irreversible still waits for the human/i);
  assert.match(prompt, /13a\. IF YOU HAVE DONE THIS BEFORE, START FROM THERE/);
  assert.match(prompt, /Never treat "this is how it went last time" as permission/);
  assert.match(prompt, /never skip the gate because the route did not mention it/);
});

test("a stale route loses to the screen in front of him", () => {
  /* A door closes. A site is redesigned and a remembered route becomes a
     confident wrong answer, which is worse than no answer at all. */
  assert.match(procedures, /if what is in front of you does not match, the site has changed/i);
  assert.match(prompt, /the site has changed and you work from what is actually in front of you/);
});

test("a route that stops working retires itself", () => {
  /* Counted, never acted on at once: one bad run on a good route is a site
     having a bad afternoon. A row wrong at least as often as it was right drops
     out of circulation and can earn its way back. */
  assert.match(procedures, /export async function recordProcedureMiss/);
  assert.match(procedures, /status: misses >= Number\(r\.hits \|\| 1\) \? "proposed" : "live"/);
  /* And only routes that were actually handed over take the blame, or one bad
     run would retire every route on the host. */
  assert.match(procedures, /const blamed = rows\.filter\(\(r\) => goalOverlap/);
  assert.match(loop, /if \(turn\?\.decision\?\.type === "blocked" && procedureBlock\) \{/);
});

test("a repeat makes the library faster, not just bigger", () => {
  /* Two runs that both finished the job: the four-step one is the one worth
     handing over. Without this the first route ever recorded is the permanent
     one, however clumsy it was. */
  assert.match(procedures, /const shorter = input\.steps > 0 && input\.steps < Number\(row\.steps \|\| Infinity\)/);
  assert.match(procedures, /b\.score - a\.score \|\| a\.row\.steps - b\.row\.steps/);
});

test("a one-step job is not worth remembering", () => {
  /* "Play a song" is already one tool call. A route for it costs prompt space on
     every future run to save nothing. */
  assert.match(procedures, /if \(!scope \|\| !goal \|\| !route \|\| input\.steps < 2\) return;/);
});

test("recall never delays or breaks a run", () => {
  /* Same contract as recallLessons. A run without its routes does something the
     slow way; a run that dies because a recall query timed out is worse. And the
     two reads go together, so the pair costs what the single read cost. */
  assert.match(procedures, /export async function recallProcedures[\s\S]*?catch \{\s*return "";/);
  assert.match(loop, /await Promise\.all\(\[\s*recallLessons\(lessonScopes\),\s*recallProcedures\(lessonScopes, commandText\)/);
});

test("writing a route never fails a run that already succeeded", () => {
  /* Fire and forget, like every other write on this path. A failure to record a
     success must not become a second failure. */
  assert.doesNotMatch(loop, /await recordProcedure\(/);
  assert.match(procedures, /export async function recordProcedure[\s\S]*?catch \{/);
});

test("the table is service-role only, like the one it was built from", () => {
  /* hil-loop is public on purpose. A public endpoint must not be able to write
     straight into a table that every other user's Braino reads from. */
  assert.match(migration, /ALTER TABLE public\.braino_procedures ENABLE ROW LEVEL SECURITY;/);
  assert.doesNotMatch(migration, /CREATE POLICY/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS braino_procedures_fingerprint_idx/);
});

test("the version moved, so the behaviour change is traceable", () => {
  /* Every engine_runs row carries this string. A prompt rule that arrives
     without a bump is a change nobody can find afterwards. */
  assert.match(prompt, /export const HIL_LOOP_VERSION = "2\.12\.0";/);
});
