// HIL 2.16.0 (2026-10-03). The live scores live in tests/fixtures/hil-hard-results
// (before-full 12/22, after-final 22/22, three runs a case); these checks keep
// the pieces that produced them from quietly coming out again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
const js = (ts) => transformSync(ts, { loader: "ts" }).code;

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");
const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
const catalog = read("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts");
const main = read("../mac/braino-mac/main.cjs");

// The bracket repair, lifted out and run on the two real broken replies.
const body = loop.slice(loop.indexOf("function balanceJson"), loop.indexOf("\n}\n", loop.indexOf("function balanceJson")) + 3);
const balanceJson = Function(`${js(body)}; return balanceJson;`)();

test("a reply with a missing or extra bracket is repaired, not thrown away", () => {
  const missing = '{"thinking":"ok","decision":{"type":"step","step":{"action":{"type":"type","index":0,"text":"x"},"reversible":true}}';
  assert.equal(JSON.parse(balanceJson(missing)).decision.step.action.type, "type");
  const extra = '{"thinking":"ok","split":{"plan":["a","b"]}},"replan":null,"decision":{"type":"answer","text":"Yes."}}';
  assert.equal(JSON.parse(balanceJson(extra)).decision.text, "Yes.");
  const good = '{"thinking":"a \\"quote\\" and } inside","decision":{"type":"answer","text":"x"}}';
  assert.deepEqual(JSON.parse(balanceJson(good)), JSON.parse(good));
  assert.match(loop, /JSON\.parse\(balanceJson\(repairJson\(/);
  assert.match(loop, /parse: parseOk \? null : \{ failure:/);
});

test("looking, following a link and drafting are never 'cannot be undone'; buying still is", () => {
  assert.match(loop, /markHarmlessStepsUndoable\(turn, screenText\);/);
  const guard = loop.slice(loop.indexOf("const DESTRUCTIVE_NAME"), loop.indexOf("\n}\n", loop.indexOf("function markHarmlessStepsUndoable")) + 3);
  const mark = Function(`${js(guard)}; return markHarmlessStepsUndoable;`)();
  const screen = '[3] link      "Content Publishing"\n[5] button    "Buy Now"\n[6] link      "Delete account"';
  const step = (action) => ({ decision: { type: "step", step: { action, reversible: false } } });
  for (const action of [{ type: "click", index: 3 }, { type: "navigate", url: "https://x" }, { type: "type", index: 0, text: "draft" }]) {
    const t = step(action); mark(t, screen); assert.equal(t.decision.step.reversible, true, JSON.stringify(action));
  }
  for (const action of [{ type: "click", index: 5 }, { type: "click", index: 6 }, { type: "type", index: 0, text: "hi", submit: true }]) {
    const t = step(action); mark(t, screen); assert.equal(t.decision.step.reversible, false, JSON.stringify(action));
  }
});

test("the five rules are in HIL's instructions, with no dashes", () => {
  assert.match(prompt, /HIL_LOOP_VERSION = "2\.(?:1[67]|18)\.[01]"/);
  for (const rule of ["0. A QUESTION GETS AN ANSWER", "2d. A PAGE THAT HAS JUST OPENED IS STILL LOADING", "2e. A FOLLOW-UP IS THE SAME JOB", "LOOKING IS NEVER GATED", "ask for it on the first turn"]) assert.ok(prompt.includes(rule), rule);
  assert.match(prompt, /mean SAY it, word for word/);
  assert.match(prompt, /sign_in_saved tool is available, use it/);
  const bodyText = prompt.slice(prompt.indexOf("export const HIL_LOOP_PROMPT"));
  assert.equal((bodyText.match(/[–—]/g) || []).length, 0);
});

test("Google Docs never sends them to a sign-in screen", () => {
  assert.match(catalog, /otherwise by opening a new doc in Chrome and pasting the text in/);
  assert.match(main, /async function pasteIntoNewGoogleDoc\(title, text\)/);
  const fn = main.slice(main.indexOf("async function createGoogleDocWithText"));
  assert.ok(fn.indexOf("pasteIntoNewGoogleDoc(") < fn.indexOf("startGoogleDriveConnect("), "paste is tried before the connect page");
  assert.doesNotMatch(prompt, /cannot be typed into with a click or a script\. Use the google_doc_create tool to write the whole document at once\./);
});

test("the hard-command set and its scorer exist, with real gates as regressions", () => {
  const { cases } = JSON.parse(read("./fixtures/hil-hard-commands.json"));
  assert.ok(cases.length >= 22);
  for (const id of ["guard-buy-now", "guard-post", "guard-delete"]) assert.ok(cases.find((c) => c.id === id)?.expect?.mustGate, id);
  assert.match(read("../scripts/hil-hard-eval.mjs"), /mustGate/);
});

test("prompting another AI is sent, on AI chat sites only", () => {
  const guard = loop.slice(loop.indexOf("const DESTRUCTIVE_NAME"), loop.indexOf("\n}\n", loop.indexOf("function markHarmlessStepsUndoable")) + 3);
  const mark = Function(`${js(guard)}; return markHarmlessStepsUndoable;`)();
  const step = (action) => ({ decision: { type: "step", step: { action, reversible: false } } });
  const claude = 'Address: https://claude.ai/new\n[0] textbox   "Write your prompt to Claude"\n[1] button    "Send message"';
  for (const a of [{ type: "type", index: 0, text: "x", submit: true }, { type: "click", index: 1 }, { type: "pressKey", key: "Enter" }]) {
    const t = step(a); mark(t, claude); assert.equal(t.decision.step.reversible, true, JSON.stringify(a));
  }
  const gmail = 'Address: https://mail.google.com/mail/u/0/\n[1] button    "Send"';
  const t = step({ type: "click", index: 1 }); mark(t, gmail); assert.equal(t.decision.step.reversible, false, "sending an email still asks");
  assert.match(prompt, /PROMPTING ANOTHER AI IS NOT SENDING A MESSAGE/);
});

test("research is a web search, never a row of tabs", () => {
  const fn = main.slice(main.indexOf("async function runResearch(query)"), main.indexOf("function parseResearchIntent"));
  assert.match(fn, /return runMacWebSearch\(q\);/);
  assert.doesNotMatch(fn, /chromeOpenTabAndRead|youtube\.com|google\.com\/search/);
  assert.match(catalog, /name: "deep_research".*no tabs opened/);
});

test("a reply whose thinking broke is saved by its decision, not lost (train of thought, 5 Oct)", () => {
  const cut = (n) => { const i = loop.indexOf(`function ${n}`); return loop.slice(i, loop.indexOf("\n}\n", i) + 3); };
  const salvage = Function(`${js(cut("repairJson") + cut("salvageDecision"))}; return salvageDecision;`)();
  const broken = `{"thinking":"they said "book it" and ${"x".repeat(5000)}","decision":{"type":"step","step":{"intent":"Click.","action":{"type":"click","index":7},"reversible":true}}}`;
  assert.equal(salvage(broken).decision.step.action.index, 7);
  assert.match(loop, /const salvaged = salvageDecision\(withoutFence\);/);
  assert.match(prompt, /Under 60 words, and never quote the page or the user with double quotes inside it/);
});
