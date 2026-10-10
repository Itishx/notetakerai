import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { findSkill, skillKey } = require("../mac/braino-mac/skill-memory.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const loop = readFileSync(new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");

const store = { "open github my repos": { steps: [{ tool: "open_url", args: { url: "https://github.com" } }] } };

test("a learned job is found when the same words come in another order", () => {
  assert.equal(findSkill(store, skillKey("Open my repos on GitHub")).key, "");
  assert.equal(findSkill(store, skillKey("open my github repos")).key, "open github my repos");
  assert.equal(findSkill(store, skillKey("open the github repos")).key, "open github my repos");
});

test("a different verb or an extra word never matches", () => {
  assert.equal(findSkill(store, skillKey("close github my repos")).skill, null);
  assert.equal(findSkill(store, skillKey("open github my repos and star one")).skill, null);
  assert.equal(findSkill({}, "").skill, null);
});

test("fast mode is off unless switched on, and it only lives inside HIL", () => {
  assert.match(main, /BRAINO_HIL_FAST \|\| ""\)\.trim\(\) === "1"/);
  assert.match(main, /\.\.\.\(fast \? \{ card: macHilCard\(command, state\), batch: true \} : \{\}\)/);
});

test("a chained move never points at an old element and never sends", () => {
  const runner = main.slice(main.indexOf("async function macRunChain"), main.indexOf("function macHilPin"));
  assert.match(runner, /a\.index != null/);
  assert.match(runner, /macStepCanBeIrreversible\(st\)/);
  assert.match(runner, /macUnaskedMessageSend\(st, command\)/);
  assert.match(runner, /settled\?\.ok === false\) \{ failed = true; break; \}/);
});

test("the server only chains when asked, and drops an irreversible link", () => {
  assert.match(loop, /coerceTurn\(read\.content, Boolean\(loopState\?\.lastStep\), loopState\?\.batch === true\)/);
  assert.match(loop, /if \(!st \|\| st\.reversible === false\) break;/);
  assert.match(loop, /never chain a send, post, buy or delete/);
});

test("a move that just failed is not tried again as-is", () => {
  assert.match(main, /hil\.loop\.repeat_of_failed/);
  assert.match(main, /repeats >= MAC_HIL_REPEAT_LIMIT \|\| sameAsFailed/);
});
