#!/usr/bin/env node
// Replays every logged misread against the LIVE hil-router and prints what
// HIL-first would now do with it: fire a tool, hand it to the loop, ask, chat,
// or fall back to the old patterns. Nothing runs on the Mac; this only asks
// the router, so it is safe to run any time. Needs OpenAI credit on the server.
//
//   npm run hil:misreads              all of them
//   npm run hil:misreads -- --only C  one category
//   npm run hil:misreads -- --limit 10
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { planFromVerdict, isInstantCommand } = require("../mac/braino-mac/hil-first.cjs");

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_BASE = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

// The tools this Mac can actually run, read from the same table the app uses.
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const table = main.slice(main.indexOf("const MAC_HIL_TOOLS = {"), main.indexOf("\n};", main.indexOf("const MAC_HIL_TOOLS = {")));
const wired = Object.fromEntries([...table.matchAll(/\n {2}([a-z_]+): /g)].map((m) => [m[1], true]));

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

const { misreads } = JSON.parse(readFileSync(new URL("../tests/fixtures/hil-misreads.json", import.meta.url), "utf8"));
const rows = misreads.filter((r) => !only || r.category === only).slice(0, limit);

const ICON = { fire: "⚡ fire", loop: "🗺  loop", ask: "❓ ask ", chat: "💬 chat", legacy: "↩  OLD ", instant: "⏩ instant", error: "✖  error" };
const results = [];
console.log(`\nReplaying ${rows.length} misreads against hil-router (${Object.keys(wired).length} tools wired on the Mac)\n`);

for (const r of rows) {
  let plan;
  let ms = 0;
  if (isInstantCommand(r.command)) {
    plan = { kind: "instant" };
  } else {
    const started = Date.now();
    try {
      const res = await fetch(`${URL_BASE}/functions/v1/hil-router`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ command: r.command, surface: {}, shadow: true }),
      });
      const data = await res.json().catch(() => ({}));
      ms = Date.now() - started;
      plan = res.ok && data?.verdict ? planFromVerdict(data.verdict, wired) : { kind: "error", why: data?.error || `http ${res.status}` };
    } catch (error) {
      plan = { kind: "error", why: String(error?.message || error) };
    }
  }
  const detail = plan.tool ? `${plan.tool} ${JSON.stringify(plan.args || {})}` : plan.question || plan.why || "";
  console.log(`[${r.category.padEnd(2)}] #${String(r.id).padEnd(4)} ${ICON[plan.kind] || plan.kind}  ${String(ms).padStart(5)}ms  "${r.command.slice(0, 70)}"`);
  if (detail) console.log(`                     → ${detail.slice(0, 140)}`);
  console.log(`                     was: ${r.oldReply.slice(0, 110)}`);
  results.push({ ...r, plan, ms });
  if (plan.kind === "error" && /credit|rate|429|quota|AI request failed/i.test(plan.why || "")) {
    console.log("\nStopping: the server has no OpenAI credit right now. Top it up and run again.");
    break;
  }
}

const count = (k) => results.filter((x) => x.plan.kind === k).length;
console.log(`\nDone: ${results.length} replayed`);
for (const k of ["fire", "loop", "ask", "chat", "instant", "legacy", "error"]) if (count(k)) console.log(`  ${ICON[k]}  ${count(k)}`);
console.log(`\n"OLD" means the router picked a tool the Mac has not wired yet, so the old patterns still run it. Those are the next ones to connect.`);
mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
const out = new URL(`../test-results/hil-misreads-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`, import.meta.url);
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(`Full results: ${out.pathname}\n`);
