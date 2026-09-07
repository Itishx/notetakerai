import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const routing = require("../mac/braino-mac/hil-routing.cjs");

/* Astra drives, and it needs both halves of that to be true.
 *
 * Half one is reaching him at all. The router used to require a verb from a
 * list, so every phrasing the list did not anticipate fell through to a pattern
 * match that answered confidently and wrongly.
 *
 * Half two is having hands once it gets there. The loop knew nine browser
 * actions while everything Braino can actually do sat in a catalog only the
 * cascade could reach, which is why a command ending "put it in my notes" was
 * answered out loud instead: not a refusal, an ability that was never offered.
 */

test("work reaches the brain even when nobody used a listed verb", () => {
  for (const said of [
    "get me a canva document for the pitch",
    "i need three keyboards under ten thousand rupees",
    "some research on braino competitors and a doc about it",
  ]) {
    assert.equal(routing.macWantsTheBrain(said), true, said);
  }
});

test("instant stays instant, and chat stays chat", () => {
  // The fast lane is the whole reason this is not simply "everything to Astra".
  for (const said of ["play billie jean", "open spotify", "take a screenshot"]) {
    assert.equal(routing.macWantsTheBrain(said), false, said);
  }
  // Nothing to DO here, so a fourteen step agent loop is the wrong shape.
  for (const said of ["how are you", "what is the capital of france", "thanks braino"]) {
    assert.equal(routing.macIsConversation(said), true, said);
  }
});

test("a question that names work is work, not conversation", () => {
  // The trap in the line above: this LOOKS like a question and is a job.
  assert.equal(routing.macIsConversation("how much does gpt-6-astra cost per million tokens"), false);
  assert.equal(routing.macWantsTheBrain("how much does gpt-6-astra cost per million tokens"), true);
});

test("every tool the Mac can run is a tool the catalog declares", () => {
  /* The two halves live in different languages and different repos-worth of
     file, so they can only be kept in step by something that fails. A name that
     drifts here does not throw: the model is taught a tool that quietly does
     nothing, which is indistinguishable from the model being bad at its job. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const block = main.slice(main.indexOf("const MAC_HIL_TOOLS = {"));
  const wired = [...block.slice(0, block.indexOf("\n};")).matchAll(/^\s{2}([a-z_0-9]+):/gm)].map((m) => m[1]);
  assert.ok(wired.length >= 10, `expected a real set of wired tools, got ${wired.length}`);

  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url),
    "utf8",
  );
  const declared = new Set([...catalog.matchAll(/\{ name: "([a-z_0-9]+)"/g)].map((m) => m[1]));
  for (const name of wired) {
    assert.ok(declared.has(name), `${name} is wired on the Mac but not in the catalog, so the model is never told it exists`);
  }
});

test("the irreversible ones are still marked irreversible", () => {
  // whatsapp_send is wired and cannot be taken back. The server forces
  // reversible:false off this flag, so losing it here silently removes the
  // confirmation gate from a message that has already gone.
  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url),
    "utf8",
  );
  const line = catalog.split("\n").find((l) => l.includes('name: "whatsapp_send"'));
  assert.ok(line && line.includes("irreversible: true"), "whatsapp_send must stay irreversible");
});

test("a script's return value survives the wrapper", () => {
  /* The bug this pins: pasting model-written code into a function BODY throws
     away the value of an IIFE, which is the shape a model naturally writes. So
     every script would have come back empty and read as a broken page rather
     than as a wrapper bug. eval returns the completion value of both shapes. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /var __r=eval\(\$\{JSON\.stringify\(code\)\}\)/,
    "exec_js must eval the script, not inline it into a function body");

  const wrap = (code) =>
    `(function(){try{var __r=eval(${JSON.stringify(code)});`
    + `return __r===undefined?"(the script returned nothing)":(typeof __r==="string"?__r:JSON.stringify(__r))}`
    + `catch(e){return "BRAINO_ERR "+(e&&e.message?e.message:String(e))}})()`;

  assert.equal(eval(wrap('(function(){ return "hello" })()')), "hello");
  assert.equal(eval(wrap("1 + 1")), "2");
  assert.equal(eval(wrap("({a:1})")), '{"a":1}');
  assert.equal(eval(wrap("undefined")), "(the script returned nothing)");
  assert.match(eval(wrap("null.x")), /^BRAINO_ERR /);
});

test("a cut-off script result says it was cut off", () => {
  /* Nine straight turns of "the output was cut off, I will try a shorter
     extraction" came from silence, not from the cut. A 26,269 character result
     was trimmed to 1,500 with no marker, so the model could see its answer stop
     mid-word and had no way to learn why. Being told the real length turns a
     wall into a fact it can act on. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /CUT OFF HERE/, "an over-long exec_js result must announce the cut");
  assert.match(main, /of \$\{said\.length\} characters/, "and must say how much there really was");

  /* The three places the same result was trimmed, all of which had to move.
     The server one decided what the model actually saw. */
  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  const lastStep = server.match(/result: \$\{JSON\.stringify\(state!\.lastStep\.result \?\? null\)\.slice\(0, (\d+)\)\}/);
  assert.ok(lastStep && Number(lastStep[1]) >= 12000,
    `lastStep result budget is ${lastStep && lastStep[1]}, too small to carry a script's findings`);

  assert.match(main, /My script returned: \$\{String\(result\.answer\)\.slice\(0, 4000\)\}/,
    "script findings must be filed as script findings, not as a search answer");
});

test("a script can read other pages without navigating away", () => {
  /* The last big cost. A script is a third of a second and a TURN is ten, so
     the only thing that makes a run faster is fewer turns, and what forced
     turns was navigation: opening a product page ends the script, so comparing
     ten keyboards cost ten turns to run ten scripts of a third of a second.
     Reading a page does not require being on it. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const helpers = main.slice(main.indexOf("const helpers = `"), main.indexOf("const wrapped = `"));

  assert.match(helpers, /__brainoGet/, "scripts need a way to read another page");
  assert.match(helpers, /__brainoPage/, "and a parsed one, so they are not regexing HTML");
  /* Sync, not fetch, and this is the whole reason it works: the channel returns
     the completion value immediately, so a promise comes back as
     "[object Promise]" and everything the script did is thrown away. */
  assert.match(helpers, /x\.open\("GET",u,false\)/, "must be synchronous XHR, not fetch");
  /* Sync XHR cannot time out, so the counter is the only thing between a
     curious script and a wedged Chrome tab. */
  assert.match(helpers, /__n>12/, "must cap how many pages one script can pull");

  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  assert.match(server, /__brainoPage\(url\)/, "and the model has to be told the helper exists");
});

test("a run reports where its time went", () => {
  // "It feels slow" is not a number. This makes it one, in the terminal, while
  // it happens: turns, thinking, scripts, and everything else named separately,
  // because when the last one is large the fix is not a faster model.
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /function macReportRunSpeed/);
  assert.match(main, /hil\.loop\.speed/);
  for (const part of ["turns", "thinking", "scripts", "everything else"]) {
    assert.ok(main.includes(part), `the speed line must break out ${part}`);
  }
  // Reported from the finally, because a run has several ways to end and the
  // slow ones are the endings nobody planned.
  const tail = main.slice(main.indexOf('logMac("hil.loop.budget"'));
  assert.match(tail.slice(0, 900), /finally \{[\s\S]*macReportRunSpeed/);
});
