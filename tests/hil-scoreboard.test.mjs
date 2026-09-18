import assert from "node:assert/strict";
import test from "node:test";
import { median, summarise } from "../scripts/hil-scoreboard.mjs";

/* The scoreboard decides whether a round worked, so it is the one tool where
 * being quietly wrong is worse than being absent: a bad number does not read as
 * a broken script, it reads as a brain that got better.
 *
 * Fixtures rather than the real table, on purpose. engine_runs holds what people
 * actually said to Braino, and a test that needs production data is a test that
 * only runs where production data is.
 */

const turn = (over = {}) => ({
  run_id: "r1", turn: 1, verdict: "step", model: "gpt-5.6-luna",
  elapsed_ms: 1000, prompt_tokens: 100, cached_tokens: 0, completion_tokens: 10,
  ok: true, error: null, prompt_version: "2.11.0", created_at: "2026-09-01T00:00:00Z",
  ...over,
});

test("a run is judged on how it ENDED, not on every step along the way", () => {
  /* Nine "step" turns and an "all_done" is one finished run. Counting verdicts
     row by row would call it 90% steps and 10% done, which is not a number about
     anything. */
  const turns = [
    ...Array.from({ length: 9 }, (_, i) => turn({ turn: i + 1 })),
    turn({ turn: 10, verdict: "all_done" }),
  ];
  const s = summarise(turns);
  assert.equal(s.runs, 1);
  assert.equal(s.turns, 10);
  assert.equal(s.finishedPct, 100);
  assert.equal(s.stepsToFinish, 10);
});

test("giving up and finishing are counted apart", () => {
  const s = summarise([
    turn({ run_id: "a", turn: 1, verdict: "all_done" }),
    turn({ run_id: "b", turn: 1, verdict: "blocked" }),
    turn({ run_id: "c", turn: 1, verdict: "all_done" }),
    turn({ run_id: "d", turn: 1, verdict: "ask" }),
  ]);
  assert.equal(s.runs, 4);
  assert.equal(s.finishedPct, 50);
  assert.equal(s.blockedPct, 25);
  /* An ask is neither. A run waiting on a person has not failed, and folding it
     into either column would make asking look like losing. */
});

test("steps to finish ignores the runs that never finished", () => {
  /* A run that gave up at step 40 is not evidence about how long finishing
     takes, and averaging it in makes every round that stops circling earlier
     look like a round that got slower. */
  const s = summarise([
    turn({ run_id: "a", turn: 1 }), turn({ run_id: "a", turn: 2, verdict: "all_done" }),
    ...Array.from({ length: 40 }, (_, i) => turn({ run_id: "b", turn: i + 1 })),
    turn({ run_id: "b", turn: 41, verdict: "blocked" }),
  ]);
  assert.equal(s.stepsToFinish, 2);
});

test("a rescue is counted once per run, not once per turn", () => {
  /* Astra can drive several turns of one stuck run. Counting turns would report
     more rescues than there were runs. */
  const s = summarise([
    turn({ run_id: "a", turn: 1 }),
    turn({ run_id: "a", turn: 2, model: "gpt-6-astra" }),
    turn({ run_id: "a", turn: 3, model: "gpt-6-astra", verdict: "all_done" }),
    turn({ run_id: "b", turn: 1, verdict: "all_done" }),
  ]);
  assert.equal(s.runs, 2);
  assert.equal(s.rescuedPct, 50);
});

test("the cached share is what makes the bill readable", () => {
  /* On a long run the instruction manual is re-sent every turn and billed at the
     cheaper cached rate. If this number falls, something broke the stable prefix
     and the cost moved without anything looking different. */
  const s = summarise([
    turn({ prompt_tokens: 1000, cached_tokens: 900 }),
    turn({ turn: 2, prompt_tokens: 1000, cached_tokens: 700, verdict: "all_done" }),
  ]);
  assert.equal(s.cachedInputPct, 80);
});

test("an unreadable turn is counted even though the run carried on", () => {
  const s = summarise([
    turn({ turn: 1, ok: false, error: "AI 500" }),
    turn({ turn: 2, verdict: "all_done" }),
  ]);
  assert.equal(s.malformedTurns, 1);
  assert.equal(s.finishedPct, 100, "a bad turn mid-run does not make the run a failure");
});

test("two prompt versions in one window is a warning, not a detail", () => {
  /* Comparing a week against the week before only means something if it is the
     same brain in both. The printed line exists so nobody reads a win that was
     really a deploy. */
  const s = summarise([turn({ prompt_version: "2.11.0" }), turn({ turn: 2, prompt_version: "2.12.0" })]);
  assert.deepEqual(s.promptVersions, ["2.11.0", "2.12.0"]);
});

test("an empty window reports nothing rather than dividing by zero", () => {
  const s = summarise([]);
  assert.equal(s.runs, 0);
  assert.equal(s.finishedPct, 0);
  assert.equal(s.cachedInputPct, 0);
});

test("the median holds up on both lengths", () => {
  assert.equal(median([]), 0);
  assert.equal(median([5]), 5);
  assert.equal(median([1, 2, 3, 4]), 3);
  assert.equal(median([3, 1, 2]), 2);
});
