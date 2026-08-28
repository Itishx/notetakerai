import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const bridge = read("../mac/braino-mac/hermes.cjs");
const routing = read("../mac/braino-mac/hermes-routing.cjs");

/* Hermes (NousResearch/hermes-agent, MIT) is a separate agent daemon with its
   own memory and tools, and no access to this Mac. */

test("the split is by kind of work, not by difficulty", () => {
  /* The obvious split, easy here and hard there, would send "book the tickets"
     to an agent with no browser session. Both files say so out loud. */
  assert.match(bridge, /the split is by KIND/);
  assert.match(routing, /The question is NOT "is this hard"/);
  assert.match(routing, /If both apply, it is Braino/);
  /* And no keyword list, which is what caused every routing failure before. */
  assert.doesNotMatch(routing, /\/\\b\(research\|compare/);
});

test("the one-shot surface is the documented one", () => {
  /* `hermes -z` is what the CLI reference calls the purest one-shot: prompt in,
     final text out, nothing else on stdout or stderr. */
  assert.match(bridge, /const args = \["-z", prompt, "--usage-file", usagePath\];/);
  /* Exit 2 is our bug, not their outage, and the two want different handling. */
  assert.match(bridge, /code === 2 \? "bad_invocation" : "backend_failed"/);
  assert.match(bridge, /error\.killed \? "timeout"/);
});

test("a delegated agent that is down cannot swallow a command", () => {
  /* Every failure path returns a value, never throws. */
  assert.doesNotMatch(bridge, /throw new Error/);
  assert.match(bridge, /return resolve\(\{ ok: false, reason: "not_installed" \}\)/);
  /* And the caller falls through to the cascade rather than stopping. */
  const block = main.slice(main.indexOf("Deep work with no screen in it goes to Hermes"));
  assert.match(block.slice(0, 2000), /logMac\("hermes\.failed"/);
  const failIdx = block.indexOf('logMac("hermes.failed"');
  const returnIdx = block.indexOf('return { ok: true, say: run.text');
  assert.ok(returnIdx > 0 && returnIdx < failIdx, "the only early return is the success path");
});

test("nobody who has not installed it pays anything", () => {
  const route = main.slice(main.indexOf("async function macRouteToHermes"));
  const body = route.slice(0, route.indexOf("\n}\n"));
  /* The binary check comes before any network call. */
  assert.ok(body.indexOf("hermesBinary()") < body.indexOf("fetch("), "check for the binary before asking anything");
  assert.match(body, /if \(!hermesEnabled\([\s\S]{0,60}\)\) return null;/);
});

test("an escalated job keeps its hands", () => {
  /* forceBrain means a promise was escalated to the loop, which drives the
     screen. Hermes has no screen, so it must not intercept those. */
  assert.match(main, /if \(!options\.forceBrain\) \{[\s\S]{0,200}macRouteToHermes\(raw\)/);
});

test("a handover with nothing to hand over is not a handover", () => {
  const { parseHermesRoute } = require_("../mac/braino-mac/hermes-routing.cjs");
  /* Hermes cannot see the conversation, so an empty task falls back. */
  assert.equal(parseHermesRoute('{"who":"hermes","task":"","why":"vague"}').who, "braino");
  assert.equal(parseHermesRoute('{"who":"hermes","task":"Compare five tools","why":"research"}').who, "hermes");
  /* Tolerant on the way in, strict on the way out. */
  assert.equal(parseHermesRoute('```json\n{"who":"braino","task":"","why":"needs the browser"}\n```').who, "braino");
  assert.equal(parseHermesRoute('{"who":"nobody"}'), null);
  assert.equal(parseHermesRoute("not json"), null);
});

test("what a delegated job spent is on the record", () => {
  assert.match(main, /costUsd: run\.usage\?\.estimated_cost_usd \?\? null/);
  assert.match(main, /model: run\.usage\?\.model \|\| ""/);
});
