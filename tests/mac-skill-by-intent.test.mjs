// Saved jobs reuse by intent with the detail swapped in (6 Oct): "put on jazz on
// YouTube" reuses "play some lofi on YouTube", instantly, with jazz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const m = require("../mac/braino-mac/skill-memory.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const store = {
  "play some lofi on youtube": { steps: [{ tool: "youtube_play", args: { query: "lofi" } }] },
  "show me dashboard ui inspirations on pinterest": { steps: [{ tool: "open_url", args: { url: "https://www.pinterest.com/search/pins/?q=dashboard%20UI%20inspiration" } }] },
  "show me some macbook chargers i dont have one": { steps: [{ tool: "amazon_search", args: { product: "MacBook charger" } }] },
  "show me the latest news": { steps: [{ tool: "chrome_search_google", args: { query: "latest news" } }] },
};
const hit = (t) => m.findSkillByIntent(store, m.skillKey(t));

test("same intent, new detail, reused with the detail swapped in", () => {
  assert.deepEqual(hit("put on jazz on youtube").skill.steps[0].args, { query: "jazz" });
  assert.match(hit("show me fintech dashboard ui inspirations on pinterest").skill.steps[0].args.url, /q=fintech\+dashboard\+ui\+inspirations/);
  assert.deepEqual(hit("show me some iphone cases i dont have one").skill.steps[0].args, { product: "iphone cases" });
});

test("a different intent, or a shape that is all detail, never matches", () => {
  assert.equal(hit("play jazz on spotify"), null);
  assert.equal(hit("show me some articles about cricket"), null, "'show me the latest news' is all detail, so it is never a shape");
});

test("Braino uses it, never drops a job when only the reuse failed, and never learns misheard words", () => {
  assert.match(main, /const byIntent = exact\.skill \? null : skillMemory\.findSkillByIntent\(skillStore, skillMemory\.skillKey\(raw\)\);/);
  assert.match(main, /if \(!byIntent\) \{ const store = readSkills\(\); delete store\[skillKey\]; writeSkills\(store\); \}/);
  assert.match(main, /if \(macLooksMisheard\(said\)\) return;/);
});
