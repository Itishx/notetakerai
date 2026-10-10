// HIL reuses its fixed instructions (5 Oct): 2 of 286 loop turns hit the cache.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");
const router = read("../supabase/functions/reasoning/hil-router/index.ts");
const plan = read("../supabase/functions/reasoning/hil-plan/index.ts");
const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
const main = read("../mac/braino-mac/main.cjs");

test("loop, router and planner name their cache and keep it 24h, with a fallback", () => {
  assert.match(loop, /prompt_cache_key: `braino-hil-loop-\$\{model\}`, prompt_cache_retention: "24h"/);
  assert.match(loop, /if \(\/prompt_cache\/i\.test\(why\)\)/);
  assert.match(router, /prompt_cache_key: "braino-hil-router", prompt_cache_retention: "24h"/);
  assert.match(plan, /prompt_cache_key: "braino-hil-plan", prompt_cache_retention: "24h"/);
  for (const src of [router, plan]) assert.match(src, /status === 400 && \/prompt_cache\/i\.test/);
});

test("the cached part comes first and never changes: no live values in the fixed instructions", () => {
  const body = prompt.slice(prompt.indexOf("export const HIL_LOOP_PROMPT"));
  assert.doesNotMatch(body.slice(0, body.indexOf("`;")), /\$\{/);
  const order = loop.slice(loop.indexOf("const systemPrompt = ["), loop.indexOf("].join", loop.indexOf("const systemPrompt = [")));
  assert.ok(order.indexOf("HIL_LOOP_PROMPT") < order.indexOf("skillBlock"), "fixed rules before anything per-command");
  assert.ok(order.indexOf("renderToolCatalog") < order.indexOf("lessonBlock"));
});

test("every step reports how much came from the cache", () => {
  assert.match(loop, /cachedTokens: Number\(aiData\?\.usage\?\.input_tokens_details\?\.cached_tokens/);
  assert.match(main, /inputTokens: turnInputTokens, cachedTokens: turnCachedTokens,/);
});
