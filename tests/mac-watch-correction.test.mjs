// 2026-10-18: "Play Vision Quest S1E1" went to Netflix (it is on Jio Hotstar),
// Braino said "it's right there" when nothing played, learnt that as a skill,
// and then dropped "Braino, I asked you to play… it's on Jio Hotstar" as not
// for him. Each of those must never happen again.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = fs.readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");

test("being named always gets through: the not-for-him gate sees the words as heard", () => {
  assert.match(main, /macHeardAddressed = Boolean\(options\.typed\) \|\| \/\\bbrain\(\?:o\|elle\|a\)\\b\/i\.test\(String\(prompt \|\| ""\)\);/);
  assert.match(main, /&& !macHeardAddressed && !\/\\bbrain/);
});

test("the planner has a play-anywhere tool, and Netflix only when Netflix is meant", () => {
  assert.match(catalog, /name: "watch_play", params: \["title", "service"\]/);
  assert.match(catalog, /name: "netflix_resume"[^\n]*ONLY if they said Netflix/);
  assert.match(main, /watch_play: \(a\) => playWatchTitle\(/);
});

test("Netflix never claims a title is there when no card was found; it finds where it streams", () => {
  assert.match(main, /if \(clicked === "no_card" \|\| clicked === "unavailable"\) \{[\s\S]{0,200}return playWatchTitle\(/);
  assert.doesNotMatch(main, /Netflix is open with \$\{title\} right there/);
});

test("a plan that only half-worked is never learnt as a skill", () => {
  assert.match(main, /if \(out && out\.partial\) partial = true;/);
  assert.match(main, /if \(!run\.partial\) maybeSaveSkill\(command, plan\.steps, plan\.done\);/);
});

test("'play it on Hotstar' after a play request plays that title there, and is remembered", () => {
  assert.match(main, /function fillWatchFollowUp\(raw\)/);
  assert.match(main, /const followUp = fillWatchFollowUp\(prompt\);/);
  assert.match(main, /function rememberWatchService\(title, service\)/);
  assert.match(main, /const known = knownWatchService\(title\); if \(known\)/);
});
