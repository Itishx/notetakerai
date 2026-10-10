import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseTypeSearch, searchUrl } = require("../mac/braino-mac/type-search.cjs");

/* 2026-10-01: typed "hi braino please search medium for machine learning
   articles" googled the whole sentence. */
test("search <site> for <thing> searches on that site", () => {
  const r = parseTypeSearch("hi braino please search medium for machine learning articles");
  assert.deepEqual([r.site, r.text], ["medium", "machine learning articles"]);
  assert.equal(searchUrl(r.site, r.text), "https://medium.com/search?q=machine%20learning%20articles");
  assert.equal(parseTypeSearch("search stack overflow for electron ipc").site, "stackoverflow");
  assert.equal(parseTypeSearch("search for react hooks on medium.com").site, "medium");
});

test("a place it does not know is left to HIL, not googled", () => {
  assert.equal(parseTypeSearch("search notion for my roadmap"), null);
  assert.equal(parseTypeSearch("search for my roadmap on notion"), null);
});

test("a plain search still searches right away", () => {
  assert.deepEqual(parseTypeSearch("search for best pizza"), { mode: "search", text: "best pizza", site: "", enter: true });
});
