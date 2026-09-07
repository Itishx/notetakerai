import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Three things a person does that Braino did not, all built in one pass.
 *
 * He knew nothing about the user, so "send it to Ilu" cost a turn working out
 * who Ilu is. He was short sighted, walking back to a page for the second thing
 * he had already seen on it. And he learned nothing between runs: five turns
 * discovering Google Docs cannot be typed into, and five more tomorrow.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
const lessons = read("../supabase/functions/_shared/human-intelligence/lessons.ts");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");
const mac = read("../mac/braino-mac/main.cjs");

test("the brain is told what Braino already knows", () => {
  assert.match(loop, /loadUserKnowledge/, "the loop must read the memory engine");
  assert.match(loop, /WHAT YOU ALREADY KNOW ABOUT THEM/);
  /* Read as the user, never with a service key. This function is public on
     purpose, so the caller's own token plus RLS is the only thing that can
     safely decide which rows come back. */
  assert.match(loop, /global: \{ headers: \{ Authorization: auth \} \}/,
    "memories must be read as the caller, not with a service key");
  /* And the Mac has to actually identify itself, or the server looks up nothing.
     It was sending the anon key, which resolves to no user at all. */
  assert.match(mac, /Authorization: `Bearer \$\{userToken \|\| SUPABASE_ANON_KEY\}`/,
    "the Mac must send the user's token to hil-loop");
});

test("he takes what he needs while he is on the page", () => {
  assert.match(prompt, /13\. TAKE IT WHILE YOU ARE THERE/);
  assert.match(prompt, /Nobody reads a page, walks away, and comes back/);
});

test("a wall is written down once, for everyone", () => {
  assert.match(prompt, /14\. WHEN YOU GIVE UP, LEAVE THE LESSON BEHIND/);
  assert.match(prompt, /"lesson":"Google Docs draws its body on a canvas/,
    "a worked example beats an instruction");
  assert.match(loop, /recordLesson\(\{/, "the loop must write the lesson when it blocks");
  assert.match(loop, /recallLessons\(lessonScopes\)/, "and read them back on the way in");
});

test("one strange run cannot teach every Braino something false", () => {
  /* The whole risk of a shared table: a wrong lesson is wrong for everybody.
     Two independent runs before it reaches anyone, and a human no is permanent. */
  assert.match(lessons, /const PROMOTE_AT_HITS = 2;/);
  assert.match(lessons, /status=eq\.live/, "only promoted lessons are ever injected");
  assert.match(lessons, /if \(row\.status === "rejected"\) return;/,
    "a rejected lesson must never come back");
});

test("a lesson cannot widen what an action may do", () => {
  /* Lessons are advisory text injected into a prompt. The confirmation gate is
     a code path that never reads this table, and the injected block says so in
     the model's own instructions too. */
  assert.match(lessons, /never permit an action you would not otherwise take/);
  assert.doesNotMatch(loop, /braino_lessons[\s\S]{0,200}reversible/,
    "nothing about reversibility may be decided by a lesson");
});

test("failures here never break a run", () => {
  // A run without its lessons might repeat a known mistake. A run that dies
  // because a lessons query timed out is worse, and pointless.
  const recall = lessons.slice(lessons.indexOf("export async function recallLessons"));
  assert.match(recall.slice(0, 1600), /catch \{\s*return "";/, "recall must fail open");
  assert.match(loop, /\/\/ Never fail a turn over this\./, "memory lookup must fail open too");
});
