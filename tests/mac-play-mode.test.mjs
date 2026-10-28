import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const play = require("../mac/braino-mac/play-mode.cjs");

/* Play mode (2026-10-28): Braino operates the screen until the job is done. */

test("the model's reply becomes clean actions; a batch is fills plus one click", () => {
  const r = play.parsePlayReply('```json\n{"thought":"Fill qty","actions":[{"action":"set","id":3,"value":"120"},{"action":"set","id":4,"value":"9"},{"action":"click","id":7}],"final":false}\n```');
  assert.equal(r.actions.length, 3);
  assert.equal(r.thought, "Fill qty");
  const mixed = play.parsePlayReply('{"actions":[{"action":"click","id":1},{"action":"click","id":2}]}');
  assert.equal(mixed.actions.length, 1);
  assert.equal(play.parsePlayReply('{"action":"done","summary":"ok"}').actions[0].action, "done");
  assert.equal(play.parsePlayReply("not json"), null);
});

test("final clicks ask, payments and secrets are refused", () => {
  assert.ok(play.isFinalLabel("Submit decisions"));
  assert.ok(play.isFinalLabel("Send"));
  assert.ok(!play.isFinalLabel("Next"));
  assert.ok(play.isForbiddenClick("Pay now"));
  assert.ok(play.isForbiddenClick("Delete account"));
  assert.ok(!play.isForbiddenClick("Next round"));
  assert.ok(play.isSecretField("input:password", "Password"));
  assert.ok(play.isSecretField("input:text", "Card number"));
  assert.ok(!play.isSecretField("input:number", "Order quantity"));
});

test("an exam is spotted; a dashboard or a plain form is not", () => {
  assert.ok(play.detectExam("Midterm Quiz\nQuestion 3 of 10\nTime remaining 12:04"));
  assert.ok(play.detectExam("Unit test\nQuestion 2 of 20\n2 marks"));
  assert.ok(play.detectExam("Proctored exam"));
  assert.equal(play.detectExam("Round 4 dashboard\nCash 12,000\nOrder quantity\nSubmit decisions"), "");
  assert.equal(play.detectExam("Job application\nName\nEmail\nSubmit"), "");
  assert.ok(play.OVERRIDE_RE.test("it's not a test"));
  assert.ok(play.OVERRIDE_RE.test("do it anyway"));
});

test("screenshot pixels map back to screen points (Retina, downscaled)", () => {
  const p = play.mapPoint(640, 400, { x: 100, y: 50, width: 1280, height: 800 }, { width: 1280, height: 800 });
  assert.deepEqual(p, { x: 740, y: 450, inside: true });
  const half = play.mapPoint(640, 400, { x: 0, y: 0, width: 2560, height: 1600 }, { width: 1280, height: 800 });
  assert.equal(half.x, 1280);
  assert.equal(play.mapPoint(5000, 10, { x: 0, y: 0, width: 100, height: 100 }, { width: 100, height: 100 }).inside, false);
});

test("handle_screen is in HIL's catalog and wired on the Mac", () => {
  const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /name: "handle_screen"/);
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /handle_screen: \(a\) => startPlayMode/);
  assert.match(main, /MAC_HIL_TOOLS.play_screen = \(a\) => startPlayMode/);
  for (const phrase of ["handle this for me", "take care of this for me", "fill this form for me", "play this game", "next round"]) {
    assert.ok(play.TRIGGER_RE.test(phrase), phrase);
  }
});

test("cost per step is fractions of a cent", () => {
  const structure = play.estimateCostUsd(play.estimateTokens(9000, false), 150);
  const vision = play.estimateCostUsd(play.estimateTokens(4000, true), 150);
  assert.ok(structure < 0.002 && vision < 0.002);
});

test("every trigger reaches the brain, typed or said (never the music fast lane)", () => {
  const routing = require("../mac/braino-mac/hil-routing.cjs");
  for (const said of ["handle this for me", "take care of this", "take care of this for me", "do this for me", "fill this form for me", "finish this", "complete this", "play this game", "solve this", "next round", "play the next round"]) {
    assert.equal(routing.macWantsTheBrain(said), true, said);
    assert.equal(routing.macIsConversation(said), false, said);
  }
});
