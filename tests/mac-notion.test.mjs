import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const catalog = read("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts");
const dashboard = read("../src/pages/Dashboard.tsx");

/* Notion's editor is a canvas with no accessible body, so driving the site by
   hand means fighting a page that cannot reliably be typed into. A real run
   spent its whole budget there and produced nothing. */
test("Notion is written through the API, not by clicking the site", () => {
  assert.match(catalog, /name: "notion_page"[\s\S]{0,200}handler: "runNotionPage"/);
  assert.match(main, /async function runNotionPage\(title, markdown\)/);
  assert.match(main, /functions\/v1\/sync-to-notion/);
});

/* "Not connected" is the one failure with a fix the person can carry out, so it
   is named precisely rather than reported as a generic refusal. */
test("a missing connection says what to do about it", () => {
  const fn = main.slice(main.indexOf("async function runNotionPage"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /Open the Braino dashboard settings and press Connect on Notion/);
  assert.match(body, /Sign in to Braino first/);
});

/* The OAuth functions existed for months with nothing calling them: a complete
   backend that was unreachable because there was no button. */
test("the dashboard can actually start the connection", () => {
  assert.match(dashboard, /functions\/v1\/notion-oauth-start/);
  assert.match(dashboard, /functions\/v1\/notion-connection-status/);
  assert.match(dashboard, /async function handleConnectNotion\(\)/);
  /* And it reports state rather than leaving you guessing. */
  assert.match(dashboard, /notionConn \? "Reconnect" : "Connect"/);
  /* Status is loaded on sign-in, not only after pressing Connect. */
  assert.match(dashboard, /refreshNotionConnection\(user\.id\)\.catch/);
});

/* A tool in the catalogue with no handler behind it means the model can choose
   something that cannot run. fetch_assets has been in that state for weeks and
   nothing caught it, so this is the check that would have. */
test("every tool in the catalogue has a handler that exists", () => {
  const declared = [...catalog.matchAll(/handler:\s*"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
  const missing = [...new Set(declared)].filter(
    (h) => !new RegExp(`\\b(async\\s+)?function\\s+${h}\\b`).test(main),
  );
  /* Two known gaps, both older than this test. Anything NEW must fail here. */
  const known = ["runDesignCowork", "runFetchAssets"];
  const unexpected = missing.filter((h) => !known.includes(h));
  assert.deepEqual(unexpected, [], `catalogue tools with no handler: ${unexpected.join(", ")}`);
});
