import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The four habits Astra volunteered and Luna has to be told.
 *
 * Everything Astra could DO is now Luna's too: scripts, multi-page reads, the
 * tool catalog, Docs through the API, searching inside the turn. Those were the
 * endpoint and the prompt, never the model. What is left is judgement, and
 * these are the four pieces of it that showed up in the logs, each one quoted
 * from a real run before it was written down as a rule.
 */
const prompt = readFileSync(
  new URL("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts", import.meta.url),
  "utf8",
);

test("evidence and conclusion are said separately", () => {
  /* "Today's votes are hidden, so I cannot honestly call its first five
     listings the winners." It knew display order is not a ranking. */
  assert.match(prompt, /9\. SAY WHICH PART YOU SAW AND WHICH PART YOU WORKED OUT/);
  assert.match(prompt, /is not a ranking unless the page says so/);
});

test("an unverified thing is left out, not filled in", () => {
  /* "I could not verify the reported stories, so I stopped rather than build a
     briefing from unsupported claims." The rule that stops invented news. */
  assert.match(prompt, /10\. WHAT YOU COULD NOT CHECK, YOU DO NOT WRITE/);
  assert.match(prompt, /Never fill a gap because the shape of the answer wants filling/);
});

test("a failed last action cannot be reported as done", () => {
  /* "I will stop rather than claim the Google Doc is finished." It left an
     empty doc and said so, which is the only reason we found the real bug. */
  assert.match(prompt, /11\. NEVER SAY IT IS DONE WHEN THE LAST ACTION FAILED/);
  assert.match(prompt, /the screen shows it finished/);
});

test("a step that changed nothing means change approach", () => {
  /* The one Astra itself broke, twice, at seven and a half seconds a go. Rule 8
     already stops a run after two identical failures; this is the turn before
     that, where there is still something to save. */
  assert.match(prompt, /12\. A STEP THAT CHANGED NOTHING MEANS CHANGE THE APPROACH/);
  assert.match(prompt, /Trying it a third time is a bug/);
});

test("the version moved, so a behaviour change is traceable", () => {
  // engine_runs stores prompt_version per call. Four new rules with the old
  // version on them makes every row before and after look identical.
  const version = prompt.match(/HIL_LOOP_VERSION = "([\d.]+)"/);
  assert.ok(version, "the prompt must carry a version");
  assert.notEqual(version[1], "2.8.0", "a prompt change must bump the version");
});
