// Decider stage 2 (2026-10-04): Laya v6 also names the job; that guess guards
// its own mistakes and goes to HIL as a hint, never an order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const serve = read("../mac/braino-mac/laya-serve.py");
const cut = (from, to) => main.slice(main.indexOf(from), main.indexOf(to, main.indexOf(from)));
const pieces = [
  cut("const LAYA_UNFINISHED_END", "\nfunction layaAskIsReal"),
  cut("function layaAskIsReal", "\n}\n") + "\n}\n",
  cut("const LAYA_TALK", "\nfunction layaRoute"),
  cut("function layaRoute", "\n}\n") + "\n}\n",
].join("\n");
const make = (stage) => Function("deciderStage", `${pieces}; return layaRoute;`)(() => stage);

test("stage 2 keeps talk and questions out of the planner", () => {
  const r2 = make(2), r0 = make(0);
  const s = (kind, action, c = 0.77, a = 0.4) => ({ kind, confidence: c, action, actionConfidence: a });
  assert.equal(r0(s("multi_step", "files"), "Now can you please tell me how this website is different from yours"), "plan");
  assert.equal(r2(s("multi_step", "files"), "Now can you please tell me how this website is different from yours"), null);
  assert.equal(r2(s("multi_step", "ignore"), "take a look at that and this bubble"), null);
  assert.equal(r2(s("multi_step", "web_search"), "find me the five cheapest flights to Mumbai"), "plan");
  assert.equal(r2(s("ask", "tabs_windows"), "Go back"), null);
  assert.equal(r2(s("ask", "ask", 0.8), "Open the"), "ask");
});

test("Laya names the job only at stage 2, and HIL gets it as a hint", () => {
  assert.match(serve, /AQ = \{"action"/);
  assert.match(serve, /body\.get\("only"\) == "action"/);
  // Kind first, alone; the job name in the background, only for commands, at stage 2+.
  assert.match(main, /if \(deciderStage\(\) >= 2 && \(out\.kind === "one_tool" \|\| out\.kind === "multi_step"\)\) \{\n      sorted\.actionReady = fetch/);
  assert.match(main, /if \(sorted\?\.actionReady\) await Promise\.race\(\[sorted\.actionReady, new Promise\(\(r\) => setTimeout\(r, 250\)\)\]\);/);
  assert.match(main, /layaHintForRouter = layaHintFor\(sorted\);/);
  assert.match(main, /\.\.\.\(layaHintForRouter \? \{ layaGuess: layaHintForRouter \} : \{\}\)/);
  assert.match(main, /a hint, check it against what they said/);
});

test("a Laya left running with an older model is replaced", () => {
  assert.match(main, /if \(info && Number\(info\.serve\) >= 2 && \(info\.actions \|\| !wantsActions\)\)/);
  assert.match(main, /lsof -ti tcp:\$\{LAYA_PORT\} \| xargs kill/);
});
