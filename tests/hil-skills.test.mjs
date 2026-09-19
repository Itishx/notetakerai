import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRegistry, renderModule } from "../scripts/build-skill-registry.mjs";

/* He can read his own instructions.
 *
 * skills/<name>/SKILL.md is where a capability gets written down: what it is
 * for, what it promised the person, what it must never do. Ten of them exist.
 * People read them and Claude Code reads them. Braino never could, so writing
 * down how something should work and making it work that way have been two
 * separate jobs, and the second one gets forgotten.
 *
 * Two things can go wrong here and only one of them is loud. The loud one is the
 * registry going stale, which this file fails on. The quiet one is this block
 * being handed over too often: the tool catalog is already ~2,400 tokens on
 * every command, and a skill library that appends rather than narrows costs
 * latency on every turn that has nothing to do with it.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const generated = read("../supabase/functions/_shared/human-intelligence/skill-registry.ts");
const skills = read("../supabase/functions/_shared/human-intelligence/skills.ts");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");

test("the registry still matches the documents it was built from", () => {
  /* The whole point of the round. If these drift, "we wrote it down" and "he
     does it" quietly become two different facts again, which is the exact
     problem the registry exists to end. Run: npm run skills:build */
  assert.equal(
    renderModule(buildRegistry()),
    generated,
    "skill-registry.ts is out of date — run `npm run skills:build`",
  );
});

test("every skill brings its trigger line, and most bring rules", () => {
  const built = buildRegistry();
  assert.ok(built.length >= 10, `expected the ten skills, got ${built.length}`);
  for (const skill of built) {
    assert.ok(skill.description, `${skill.name} has no description to match on`);
  }
  /* Not all: realtime-costs genuinely documents no rules, and inventing some to
     make a number look better would be worse than the gap. */
  assert.ok(built.filter((s) => s.rules.length).length >= 8);
});

test("a rule that wraps across lines is kept whole", () => {
  /* Reading only a bullet's first line cut every wrapped rule off mid-sentence:
     "Licensing is surfaced, not resolved. The manifest records the licence and
     a". A half-rule is worse than no rule, because it still reads like an
     instruction and he would follow it. */
  const built = buildRegistry();
  const assetFetch = built.find((s) => s.name === "asset-fetch");
  const licensing = assetFetch.rules.find((r) => /Licensing is surfaced/.test(r));
  assert.ok(licensing, "the licensing rule went missing");
  assert.ok(
    /verify link/.test(licensing),
    `the wrapped half of the rule was dropped: ${licensing}`,
  );
});

test("nothing from a skill document rides in whole", () => {
  /* A SKILL.md runs to two hundred lines. Let one in unclipped and this is a
     second instruction manual on every matching turn. */
  const built = buildRegistry();
  for (const skill of built) {
    assert.ok(skill.description.length <= 400, `${skill.name} description is too long`);
    const total = skill.rules.join("").length;
    assert.ok(total <= 700 + 180, `${skill.name} rules total ${total} chars`);
    for (const rule of skill.rules) assert.ok(rule.length <= 180, `a rule in ${skill.name} is too long`);
  }
});

test("the matcher reads a description's examples instead of deleting them", () => {
  /* The bug this replaced, and it made the feature match literally nothing.
     goalWords strips quoted spans, which is right for a command: "play 'Dark
     Side of the Moon'" quotes the one specific thing, and the specific thing is
     never what makes two jobs the same. A description quotes the opposite — its
     examples — so watch-play lost "play Shawshank on Netflix", "put on Stranger
     Things season 2 episode 5" and "where can I watch Dune", which are the
     exact sentences it exists to recognise. */
  assert.match(skills, /\.replace\(\/\["'`\]\/g, " "\)/);
  assert.match(skills, /goalWords\(trigger\)/);
});

test("two at most, and only on a real overlap", () => {
  /* It must narrow. A skill surfaced wrongly does not cost a turn, it costs
     prompt on rules for work he is not doing, on every turn it misfires. */
  assert.match(skills, /const MAX_SHOWN = 2;/);
  assert.match(skills, /\.slice\(0, MAX_SHOWN\)/);
  assert.match(skills, /const MATCH_AT = 0\.4;/);
  /* And a ratio alone is not enough. A two word command sharing one word with a
     description scores 0.5 and means nothing. */
  assert.match(skills, /const MIN_SHARED = 2;/);
  assert.match(skills, /m\.shared >= MIN_SHARED && m\.score >= MATCH_AT/);
});

test("no match means no block, which is the common case", () => {
  assert.match(skills, /if \(!matched\.length\) return "";/);
  assert.match(loop, /\.\.\.\(skillBlock \? \[skillBlock\] : \[\]\)/);
});

test("the contract outranks what he was about to do, and still grants nothing", () => {
  /* It is the only block in the prompt that was decided on purpose rather than
     learned: a route is what happened to work, a lesson is what happened to
     fail, this is somebody having thought about it. So it wins on a conflict.
     It still cannot widen an action, exactly like everything else here. */
  assert.match(skills, /Where it contradicts what you were about to do, it wins/);
  assert.match(skills, /It grants nothing: anything irreversible still waits for the human/);
  assert.match(skills, /It is not a route and it does not tell you which button to press/);
});

test("matching costs no network and no model call", () => {
  /* Ten descriptions against one command, in process. It cannot slow a turn
     down and it cannot fail one, which is why it needs no try/catch and sits
     outside the Promise.all with the three reads. */
  assert.doesNotMatch(skills, /fetch\(/);
  assert.doesNotMatch(skills, /SUPABASE/);
  assert.match(loop, /const skillBlock = renderSkills\(commandText\);/);
});

test("the generated file says not to edit it, and where the truth lives", () => {
  assert.match(generated, /GENERATED by scripts\/build-skill-registry\.mjs\. Do not edit by hand\./);
  assert.match(generated, /The source of truth is skills\/<name>\/SKILL\.md/);
});

test("the reflex tier never sees any of this", () => {
  /* hil-router answers "play a song" in under a second and its whole design is
     that nothing gets added to it. */
  const router = read("../supabase/functions/reasoning/hil-router/index.ts");
  assert.doesNotMatch(router, /skill-registry|renderSkills/);
});
