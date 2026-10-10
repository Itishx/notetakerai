import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const body = main.slice(main.indexOf("const LAYA_UNFINISHED_END"), main.indexOf("// ── Think once, then the hands run"));
// Stage 0, the route as it was before decider stage 2 (see mac-decider-stage2).
const layaRoute = new Function("deciderStage", `${body}; return layaRoute;`)(() => 0);

test("only a sure many-step job or a sure garble changes the route", () => {
  assert.equal(layaRoute({ kind: "multi_step", confidence: 0.76 }), "plan");
  assert.equal(layaRoute({ kind: "multi_step", confidence: 0.5 }), null);
  assert.equal(layaRoute({ kind: "ask", confidence: 0.8 }), "ask");
  assert.equal(layaRoute({ kind: "ask", confidence: 0.65 }), null);
  // 2026-10-03: a complete sentence is never "say it again", however sure Laya is.
  assert.equal(layaRoute({ kind: "ask", confidence: 0.8 }, "call Param"), null);
  assert.equal(layaRoute({ kind: "ask", confidence: 0.8 }, "Open the"), "ask");
});

test("chat and ignore are logged, never acted on: data questions came out as chat", () => {
  assert.equal(layaRoute({ kind: "chat", confidence: 0.77 }), null);
  assert.equal(layaRoute({ kind: "ignore", confidence: 0.99 }), null);
  assert.equal(layaRoute({ kind: "one_tool", confidence: 0.9 }), null);
});

test("Laya missing or slow never blocks a command", () => {
  assert.match(main, /if \(!layaReady\) return null;/);
  assert.match(main, /AbortSignal\.timeout\(400\)/); // the kind alone; the job name is fetched in the background
  assert.match(main, /flag !== "0" && fs\.existsSync\(LAYA_PY\)/);
});
