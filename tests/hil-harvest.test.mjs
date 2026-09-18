import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { routeOf, scopeOf } from "../scripts/hil-harvest-routes.mjs";
import { loadPureRules, matchThreshold } from "../scripts/lib/hil-pure.mjs";

/* Filling the memory from the runs he has already done.
 *
 * Round 012 gave him somewhere to keep a route. On its own that is a feature
 * that does nothing for months: the table starts empty and a route needs two
 * independent runs before anybody is handed it. He has done the runs already,
 * and every turn of every one of them is in engine_runs.
 *
 * The risk this file exists for is not that the harvest fails. It is that the
 * harvest quietly files rubbish: a route stitched together from steps that
 * failed, a run filed under the wrong site, or history promoting something on
 * weaker evidence than a live pair of runs would have needed. All three would
 * look exactly like a full, healthy table.
 */

const harvest = readFileSync(new URL("../scripts/hil-harvest-routes.mjs", import.meta.url), "utf8");

const step = (intent, url) => ({
  response: { decision: { type: "step", step: { intent, action: url ? { type: "navigate", url } : { type: "click" } } } },
});
const judged = (ok) => ({ response: { verdict: { ok } } });
const merge = (a, b) => ({ response: { ...a.response, ...b.response } });

test("a step the next turn called a failure is not part of the route", () => {
  /* The whole point of a route is that it is the way that worked. A run that
     tried three wrong things first and then found the door teaches the door.
     Harvesting the three wrong things teaches the next run to repeat them. */
  /* The verdict rides on the turn AFTER the step it judges, because he judges
     what just ran before deciding what runs next. So the failure of "clicked the
     wrong date" is carried by the turn that chose "picked the 7pm show", and a
     harvest that reads it as judging its own turn would drop exactly the wrong
     step from every route. */
  const turns = [
    step("opened the site", "https://bookmyshow.com/x"),
    merge(judged(true), step("clicked the wrong date")),
    merge(judged(false), step("picked the 7pm show")),
    merge(judged(true), step("chose two seats")),
  ];
  const route = routeOf(turns);
  assert.deepEqual(route, ["opened the site", "picked the 7pm show", "chose two seats"]);
});

test("a step nobody judged is kept, because the run finished", () => {
  /* The last step of a finished run has no turn after it to judge it. Dropping
     unjudged steps would cut the final action off every single route, which is
     usually the one that actually completes the job. */
  const turns = [step("opened the compose window", "https://mail.google.com"), merge(judged(true), step("clicked send"))];
  assert.deepEqual(routeOf(turns), ["opened the compose window", "clicked send"]);
});

test("the site is the first place he actually went", () => {
  const turns = [
    { response: { decision: { type: "step", step: { intent: "thought about it", action: { type: "wait" } } } } },
    step("opened it", "https://www.bookmyshow.com/explore"),
    step("went somewhere else", "https://paytm.com"),
  ];
  assert.equal(scopeOf(turns), "bookmyshow.com", "www is stripped and the first navigation wins");
});

test("a run that never went anywhere is filed under nothing, not under a guess", () => {
  assert.equal(scopeOf([step("did a thing")]), "");
  assert.match(harvest, /if \(!scope \|\| route\.length < 2 \|\| !command\) continue;/);
});

test("only runs that finished the whole command are harvested", () => {
  /* Same rule as the live path. A run where one job of three finished has steps
     belonging to all three mixed together, and a route built from those teaches
     a job nobody asked for. */
  assert.match(harvest, /if \(list\[list\.length - 1\]\?\.verdict !== "all_done"\) continue;/);
});

test("history promotes on the same evidence a live pair of runs would need", () => {
  /* Two independent runs, not one. Harvesting is allowed to fill the table
     faster; it is not allowed to trust a route on weaker evidence than the
     living system does, because nothing downstream can tell the two apart. */
  assert.match(harvest, /status: m\.hits >= 2 \? "live" : "proposed"/);
});

test("history fills the gaps and never corrects the present", () => {
  /* A route a live run already filed is the newer, better record of that job.
     An older reconstruction must not overwrite it. */
  assert.match(harvest, /resolution=ignore-duplicates/);
});

test("nothing is written unless it is asked for twice", () => {
  /* One pass, a service key, and a table every user's Braino reads from. The
     default has to be a dry run. */
  assert.match(harvest, /const APPLY = args\.includes\("--apply"\);/);
  assert.match(harvest, /if \(!APPLY\) \{[\s\S]{0,200}process\.exit\(0\)/);
});

test("the harvest matches jobs with the live rules, not a copy of them", () => {
  /* The failure this guards is silent in both directions: a second copy that
     drifts either stops crediting routes that should merge, or merges jobs that
     are not the same job. Neither throws. */
  assert.match(harvest, /import \{ loadPureRules, matchThreshold \} from "\.\/lib\/hil-pure\.mjs";/);
  assert.match(harvest, /rules\.goalOverlap\(asked, rules\.goalWords\(m\.goal\)\) >= MATCH_AT/);
  assert.doesNotMatch(harvest, /const STOPWORDS/, "the harvest must not carry its own word list");
});

test("the shared rules still load out of the real file", () => {
  /* hil-pure.mjs reads a named section of a Deno module and strips its types. If
     that section is renamed or gains a construct the strip cannot handle, this
     is where it surfaces, rather than in a harvest that quietly matches nothing.
  */
  return loadPureRules().then((rules) => {
    assert.equal(typeof rules.goalWords, "function");
    assert.equal(typeof rules.goalOverlap, "function");
    assert.equal(typeof rules.goalFingerprint, "function");
    assert.ok(matchThreshold() > 0 && matchThreshold() <= 1);
    /* And they still behave, so a strip that produced something importable but
       wrong does not pass. */
    assert.ok(rules.goalOverlap(
      rules.goalWords("book 2 tickets for Insidious"),
      rules.goalWords("book 4 tickets for Sinners"),
    ) >= matchThreshold());
  });
});
