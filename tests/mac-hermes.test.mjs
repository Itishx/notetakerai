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

test("browser work is his, this machine is Braino's", () => {
  /* The first version of this split was built on "Hermes has no hands",
     inferred from a README rather than checked. He has twelve browser tools,
     vision, background computer use, and a real-profile mode that works signed
     in as the user. Booking belongs to him. */
  assert.match(bridge, /it was inferred rather than\s*\n?\s*\* checked/);
  assert.match(routing, /booking, buying, ordering, reserving, checking out/);
  assert.match(routing, /playing, pausing, or controlling music and video/);
  /* And cost must not be smuggled in as a routing reason. */
  assert.match(routing, /Money is not a reason to refuse/);
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
  /* Sliced from the code rather than the comment, because the comment above it
     grew and a fixed-length window stopped reaching the code underneath. */
  const block = main.slice(main.indexOf("const route = await macRouteToHermes(raw);"));
  assert.match(block.slice(0, 1600), /logMac\("hermes\.failed"/);
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

/* A spoken "book me tickets" ALWAYS arrives escalated, so while the Hermes
   check sat below the forceBrain handover, booking could never reach Hermes:
   forceBrain returned into the loop first. Confirmed in a real session, where
   the whole turn logged zero hermes.* events. */
test("an escalated job still gets offered to Hermes", () => {
  const hermesAt = main.indexOf("Deep work with no screen in it goes to Hermes");
  const forcedAt = main.indexOf("if (options.forceBrain && macHilEnabled())");
  assert.ok(hermesAt > 0 && forcedAt > 0);
  assert.ok(hermesAt < forcedAt, "Hermes must be asked BEFORE the forced-brain handover");
  /* And the old guard that caused it must not come back. */
  assert.doesNotMatch(main, /if \(!options\.forceBrain\) \{[\s\S]{0,200}macRouteToHermes/);
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

/* Verified against a real install, v0.20.6. The first live run failed with no
   provider configured, and the useful sentence was in the usage file rather
   than on stderr: all the exit code told us was "1". */
test("his own words about the failure beat our guess", () => {
  const bridge = readFileSync(new URL("../mac/braino-mac/hermes.cjs", import.meta.url), "utf8");
  assert.match(bridge, /detail: String\(usage\?\.failure \|\| stderr \|\| error\.message \|\| ""\)/);
});

/* `hermes -z` is silent until it finishes, so the notch would sit blank through
   a two minute job. `hermes chat` does print previews, but onto the same stdout
   as the answer, with its own furniture, and it exits 0 even when the run
   failed. Verified against the real binary. */
test("he narrates from the log, not from the answer stream", () => {
  const bridge = readFileSync(new URL("../mac/braino-mac/hermes.cjs", import.meta.url), "utf8");
  /* Read only what is appended after the run starts, so an earlier run cannot
     bleed into this one. */
  assert.match(bridge, /tailAgentLog\(agentLogSize\(\), options\.onProgress\)/);
  assert.match(bridge, /function agentLogSize/);
  /* The answer still comes from the clean channel. */
  assert.match(bridge, /const args = \["-z", prompt, "--usage-file", usagePath\];/);
  /* Tailing must never be the reason a job fails. */
  assert.match(bridge, /catch \{ \/\* the log not existing is not a reason to fail a job \*\/ \}/);
  /* And the progress lines reach the same panel Braino uses for his own steps. */
  const main_ = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main_, /onProgress: \(line\) => sendTaskProgress\(\{ status: "thinking", text: line \}\)/);
});

/* Measured against the real binary: a nine second `hermes -z` run grew
   agent.log by exactly 0 bytes and left ~/.hermes/sessions empty. A quiet job
   has nothing to narrate from, so the notch needs a floor of its own. */
test("the notch is never blank, and never invents a step", () => {
  const bridge = readFileSync(new URL("../mac/braino-mac/hermes.cjs", import.meta.url), "utf8");
  assert.match(bridge, /the file grew by exactly 0 bytes/);
  /* The heartbeat says only what is true: the task, and elapsed seconds. */
  assert.match(bridge, /Hermes, \$\{Math\.round\(\(Date\.now\(\) - began\) \/ 1000\)\}s in: \$\{short\}/);
  /* Both sources are torn down on every exit path, success or failure. */
  assert.match(bridge, /if \(stopTail\) stopTail\(\);\s*\n\s*if \(beat\) clearInterval\(beat\);/);
});

/* A job routed to Hermes, ran for 99 seconds and finished, and the terminal
   showed none of it: the pretty-printer had no hermes.* cases at all, so the
   events reached the log file and nowhere a person would look. */
test("Hermes is visible in the terminal, not just the log file", () => {
  for (const ev of ["hermes.route", "hermes.start", "hermes.done", "hermes.failed"]) {
    assert.match(main, new RegExp(`case "${ev.replace(".", "\\.")}":`), `no formatter for ${ev}`);
  }
  /* The two that a person is waiting on must reach chat mode, not just debug. */
  const start = main.slice(main.indexOf('case "hermes.start":'));
  assert.match(start.slice(0, 260), /chat: true/);
  const done = main.slice(main.indexOf('case "hermes.done":'));
  assert.match(done.slice(0, 420), /chat: true/);
  /* Cost and duration are the two numbers worth seeing on a finished job. */
  assert.match(done.slice(0, 420), /\$\{secs\}s/);
});
