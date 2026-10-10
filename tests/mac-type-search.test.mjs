import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const ts = require("../mac/braino-mac/type-search.cjs");
const p = (s) => ts.parseTypeSearch(s);

test("type it and enter it; search right here", () => {
  assert.deepEqual(p("Okay, can you please type Savannah Watson videos"), { mode: "type", text: "Savannah Watson videos", enter: true });
  assert.deepEqual(p("type hello how are you and press enter"), { mode: "type", text: "hello how are you", enter: true });
  assert.equal(p("Braino, search for Savannah").mode, "search");
  assert.equal(p("search youtube for lofi beats").site, "youtube");
  assert.equal(p("search for cats on pinterest").site, "pinterest");
  assert.equal(p("google best laptops under 50000").text, "best laptops under 50000");
});

test("not these: other jobs, your own stuff, answers you want said back", () => {
  for (const s of ["write an email to Param", "find my resume file", "search my email for invoices", "type it", "look up the weather in Goa", "find the cheapest flight to Goa and book it", "search for shoes and then open the first one"]) assert.equal(p(s), null, s);
});

test("the search goes where you are", () => {
  assert.equal(ts.siteOf("https://www.youtube.com/watch?v=1"), "youtube");
  assert.match(ts.searchUrl("youtube", "savannah watson"), /youtube\.com\/results\?search_query=savannah%20watson/);
  assert.match(ts.searchUrl("", "x"), /google\.com\/search\?q=x/);
  assert.match(ts.typeJs("hi", "search"), /execCommand\("insertText"/);
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.ok(main.indexOf("const typeAsk = typeSearch.parseTypeSearch(raw);") < main.indexOf("const fire = parseInstantFire(raw, activeMacContext || {});"));
});
