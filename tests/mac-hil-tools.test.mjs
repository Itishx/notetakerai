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

test("a search hands over its links, and they survive the turn", () => {
  /* "The news search returned summaries but no usable article links on both
     attempts. I could not verify the reported stories, so I stopped rather than
     build a briefing from unsupported claims."

     That was not a failed search. web_search counted its sources for the log
     line and then returned only the prose, so the loop got four thousand
     characters of summary and not one URL: nothing to read, nothing to check,
     and refusing to invent it was the right call. Two places had to change,
     because handing the links over is undone if the next line trims them. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /SOURCES, real URLs you can read with __brainoPage\(url\)/,
    "search results must carry their links, and say what to do with them");

  const factLine = main.match(/Search "\$\{stepObj\.action\?\.query\}" answered: \$\{String\(result\.answer\)\.slice\(0, (\d+)\)\}/);
  assert.ok(factLine && Number(factLine[1]) >= 2000,
    `search findings are kept at ${factLine && factLine[1]} chars, which cuts the links off the end`);
});

test("no tool is a website, not a dead end", () => {
  /* Two halves of the same complaint. The model was shown all 115 catalog
     entries while 17 were wired, so it reached for ones that did not exist and
     spent a turn each finding out. And when it hit one, it was told it could
     say it was unable to do that part, so it did.

     Almost everything anyone asks for is a website, and driving a website is
     what this loop is for. A missing tool is a slower route, not a wall. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /tools: Object\.keys\(MAC_HIL_TOOLS\)/,
    "the Mac must declare which tools it actually has, not let the model guess");
  assert.match(main, /do it in the browser instead/,
    "a missing tool must name the way round");
  assert.doesNotMatch(main, /tell the user you cannot do that part/,
    "an exit that easy gets taken");

  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  assert.match(server, /const have = Array\.isArray\(available\)/,
    "the server must narrow the catalog to what the caller can run");
  assert.match(server, /never say you cannot do something because there is no tool for it/i);
  /* An older caller that sends no list must keep everything it had, rather than
     being silently stripped down to nothing by a filter it does not know about. */
  assert.match(server, /have \? HIL_TOOL_CATALOG\.filter\(\(t\) => have\.has\(t\.name\)\) : HIL_TOOL_CATALOG/);
});

test("a page that builds itself in the browser says so, once", () => {
  /* Product Hunt is React, so its HTML is a shell and __brainoPage came back
     with an empty object. Twice, at seven and a half seconds each, because
     "nothing" and "nothing yet" look identical and the sensible answer to an
     empty result is to try again. Fifteen seconds and two turns to learn what
     the first attempt already knew. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const helpers = main.slice(main.indexOf("const helpers = `"), main.indexOf("const wrapped = `"));
  assert.match(helpers, /empty shell/, "an unrenderable page must be named, not returned empty");
  assert.match(helpers, /Do not retry this/, "and must say not to retry, or it will be");
  assert.match(helpers, /Navigate to it instead/, "and must name the way round");
});

test("Google Docs is written through the API, never typed into", () => {
  /* Five turns and two minutes of clicking at a canvas, ending in an empty
     document. Docs has no contenteditable to focus. The endpoints to do it
     properly had been deployed for months and nothing told the model. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /google_doc_create: \(a\) => createGoogleDocWithText/);
  assert.match(main, /google-drive-create-doc/);
  assert.match(main, /google-docs-append/);

  const catalog = readFileSync(
    new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  const line = catalog.split("\n").find((l) => l.includes('name: "google_doc_create"'));
  assert.ok(line, "the tool must be in the catalog or the model is never told it exists");
  assert.match(line, /never try to type into the page/,
    "the gloss must say why, or it will reach for the page again");
});

test("Astra searches inside its own turn, and falls back if it cannot", () => {
  /* A search used to cost three model calls: a turn to decide to search, a
     whole separate model to answer it, and a turn to read the answer. Nine to
     twenty three seconds in the middle, fifteen either side, for one lookup.
     The hosted tool folds that into one turn and deletes the second model. */
  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");

  assert.match(server, /v1\/responses/, "the hosted search tool needs the Responses endpoint");
  assert.match(server, /tools: \[\{ type: "web_search" \}\]/);
  assert.match(server, /You can also SEARCH THE WEB YOURSELF/,
    "and the model has to be told, or it keeps using the slow action");

  /* The safety of the whole change. A new endpoint can be wrong in ways a test
     does not find, and the old path is known to work, so a bad call costs one
     extra request rather than the run. */
  assert.match(server, /responses failed, falling back to chat/,
    "a Responses failure must fall back, not fail the turn");
  assert.match(server, /via: viaResponses \? "responses" : "chat"/,
    "and must report which path answered, or a fallback firing every time is invisible");

  /* Responses names its token counts differently. Left unmapped, every Astra run
     would report zero tokens and look free, in the one table where cost is read. */
  assert.match(server, /prompt_tokens: usage\.input_tokens/);
});

test("Luna drives, Astra is called in, and the notch says which", () => {
  /* Astra is 50x Luna's input price and 42x its output: $10/$50 per million
     against $0.20/$1.20. Six dollars in a day of testing answered the question.
     Everything built while chasing Astra is an endpoint or a prompt, so Luna
     gets all of it at a fiftieth of the price, and Astra goes back to being the
     rescue, which is where this started. */
  /* Stronger than a switch set to the right value: there is no switch. The
     "Astra drives every turn" mode is gone rather than turned off, because a
     live toggle that costs six dollars a day does not belong in a file people
     edit for other reasons. Git has it if the question needs asking again. */
  const models = readFileSync(
    new URL("../supabase/functions/_shared/openai-models.ts", import.meta.url), "utf8");
  assert.doesNotMatch(models, /BRAINO_BRAIN/, "the drives-everything switch must be gone, not merely off");
  assert.match(models, /BRAINO_RESCUE_MODEL = "gpt-6-astra"/, "Astra stays reachable, as the rescue");

  const loop = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(loop, /ASTRA_DRIVES_ALL|astraDriving/,
    "no path may put the expensive model on an ordinary turn");
  assert.match(loop, /const turnModel = isRescue \? HIL_RESCUE_MODEL : HIL_LOOP_MODEL;/,
    "a rescue is the only way to the expensive model");

  /* Searching inside the turn is an endpoint feature, not an Astra one, so it
     must not be gated on which model is answering. */
  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  assert.match(server, /let aiRes = await callResponsesApi\(apiKey, turnModel/,
    "every model goes through the endpoint that can search");

  /* The Mac could never reach Astra at all: escalation existed only in the lab,
     so a circling run looked at the screen once and then died. */
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /rescue: rescueRequested \|\| undefined/,
    "the Mac must be able to ask for the better brain");
  assert.match(main, /if \(!rescueRequested\) \{/, "and only once per run");

  assert.match(server, /brain: isRescue \? "astra" : "hil"/,
    "a rescue must read as Astra, or the gold badge never appears on the Mac");
});

test("the turn is constrained to JSON, and degrades in the right order", () => {
  /* Measured over five identical turns on the Responses endpoint, one in five
     came back unparseable. That is not a small tax: the turn ends as "I could
     not read my own reasoning", the client burns its retry, three seconds go
     with it. The prompt had always asked for JSON, and asking is not
     constraining. */
  const server = readFileSync(
    new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8");
  assert.match(server, /body\.text = \{ format: \{ type: "json_object" \} \}/);

  /* Two fallbacks, and the order is the point. Rejected for asking for JSON:
     drop that field, keep the endpoint. Rejected for anything else: only then
     go back to chat. Falling all the way back on a formatting complaint would
     trade a nicety for the search that made this endpoint worth using. */
  assert.match(server, /retrying without/, "a json rejection must retry without json, not abandon search");
  const order = server.indexOf("retrying without");
  const chatFallback = server.indexOf("falling back to chat");
  assert.ok(order > 0 && chatFallback > order,
    "the json retry must come before the chat fallback, or search is lost on a formatting error");
});
