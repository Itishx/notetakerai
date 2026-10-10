import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("a plan that fetched something speaks what it found, not its own done line", () => {
  assert.match(main, /say: await planReply\(command, run, plan\.done\)/);
  assert.match(main, /PLAN_ANSWER_TOOLS = .*_lookup/);
});

test("the record offer is answered only by a yes or a no; anything else is a new command", () => {
  const block = main.slice(main.indexOf('pending.stage === "meeting_offer"'), main.indexOf('pending.stage === "meeting_offer"') + 900);
  const yes = new RegExp(block.match(/if \(\/(\^\(\?:\(\?:ok[^\n]*?)\/i\.test\(reply\)/)[1], "i");
  assert.ok(yes.test("yes") && yes.test("yeah record it") && !yes.test("what is my classes tomorrow"));
  assert.match(block, /return null;/);
});

test("no record offer for a Meet Braino opened himself", () => {
  assert.match(main, /brainoOpenedMeetAt < 90 \* 1000\) return;/);
  assert.match(main, /meet\\\.new\|meet\\\.google\\\.com\/i\.test\(String\(args\.url/);
});
