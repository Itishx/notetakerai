import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const pl = require("../mac/braino-mac/page-links.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("what you say: which result, what kind, to whom", () => {
  assert.deepEqual(pl.parseSendPageLink("Braino, can you please send the link of the first photo to Param on WhatsApp?"), { nth: 1, kind: "photo", to: "Param" });
  assert.deepEqual(pl.parseSendPageLink("share the second video with Ilu"), { nth: 2, kind: "video", to: "Ilu" });
  assert.deepEqual(pl.parseSendPageLink("send Param the top result"), { nth: 1, kind: "any", to: "Param" });
  assert.equal(pl.parseSendPageLink("send hi to Ilu"), null);
});

test("the nth one, or the last", () => {
  const links = [{ url: "a" }, { url: "b" }, { url: "c" }];
  assert.equal(pl.pickLink(links, 1).url, "a");
  assert.equal(pl.pickLink(links, 2).url, "b");
  assert.equal(pl.pickLink(links, -1).url, "c");
  assert.equal(pl.pickLink([], 1), null);
});

test("read from the page, never a screenshot; 'this' is the page you're on", () => {
  assert.match(pl.pageLinksJs("photo"), /a\[href\*="\/pin\/"\]/);
  assert.match(main, /page_link: async \(a\) => readPageLink/);
  assert.match(main, /if \(nth === 0 && \(kind === "any" \|\|/);
  const plan = readFileSync(new URL("../supabase/functions/reasoning/hil-plan/index.ts", import.meta.url), "utf8");
  assert.match(plan, /page_link\(nth, kind\)/);
});
