#!/usr/bin/env node
/* Fill braino_procedures from the runs he has already done.
 *
 * Round 012 taught him to keep a route when a job finishes. On its own that is a
 * feature that does nothing for months: the table starts empty, a route needs
 * two independent runs before anybody is handed it, and until then every run
 * still works everything out from zero. Shipping a memory and waiting for it to
 * fill is how a good idea gets judged as not having worked.
 *
 * He has done the runs already. engine_runs holds every turn of every one of
 * them, including the ones that finished. This reads them back, rebuilds the
 * routes that worked, and files them the same way a live run would.
 *
 *   node scripts/hil-harvest-routes.mjs                 dry run: prints, writes nothing
 *   node scripts/hil-harvest-routes.mjs --apply         actually writes
 *   node scripts/hil-harvest-routes.mjs --since 2026-08-01
 *
 * A dry run by default, deliberately. This writes into a table every user's
 * Braino reads from, from a machine with a service key, in one pass. That is
 * exactly the shape of thing that should have to be asked for twice.
 */

import { pathToFileURL } from "node:url";
import { loadPureRules, matchThreshold } from "./lib/hil-pure.mjs";

/* The host this run was working on.
 *
 * The live path takes it from the screen, which engine_runs does not store. The
 * first address he navigated to is the next best thing and is usually the same
 * answer: a run that books tickets starts by going to the ticket site. A run
 * that never navigated anywhere has no host, and is skipped rather than filed
 * under a guess. */
export function scopeOf(turns) {
  for (const t of turns) {
    const url = t.response?.decision?.step?.action?.url;
    if (typeof url === "string" && url.startsWith("http")) {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep looking */ }
    }
  }
  return "";
}

/* Rebuild what loopState.steps held, from the turns themselves.
 *
 * Each turn carries the step it chose. The turn AFTER it carries the verdict on
 * that step. So a step counts as having worked when the next turn did not say it
 * failed, which is the same judgement the live path records. */
export function routeOf(turns) {
  const intents = [];
  for (let i = 0; i < turns.length; i += 1) {
    const step = turns[i].response?.decision?.step;
    if (!step?.intent) continue;
    const judged = turns[i + 1]?.response?.verdict;
    if (judged && judged.ok === false) continue;
    intents.push(String(step.intent).trim().slice(0, 140));
  }
  return intents.slice(0, 15);
}

/* Only when a person ran it. Imported, this file reads nothing, writes nothing
   and prints nothing: its two reconstruction rules are the testable part. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  const APPLY = args.includes("--apply");
  const SINCE = flag("since", "2026-01-01");
  const LIMIT = Number(flag("limit", 200)) || 200;

  const URL_BASE = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL_BASE || !KEY) {
    console.error("Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(2);
  }

  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

  async function readAllTurns() {
    const rows = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const query = [
        "select=run_id,turn,command,verdict,response,created_at,ok",
        "engine=eq.hil-loop",
        `created_at=gte.${SINCE}`,
        "order=created_at.asc",
      ].join("&");
      const res = await fetch(`${URL_BASE}/rest/v1/engine_runs?${query}`, {
        headers: { ...headers, Range: `${from}-${from + PAGE - 1}` },
      });
      if (!res.ok) throw new Error(`engine_runs read failed: ${res.status} ${await res.text()}`);
      const page = await res.json();
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  }



  const rules = await loadPureRules();
  const MATCH_AT = matchThreshold();

  const turns = await readAllTurns();
  const runs = new Map();
  for (const row of turns) {
    if (!row.run_id) continue;
    if (!runs.has(row.run_id)) runs.set(row.run_id, []);
    runs.get(row.run_id).push(row);
  }

  /* Only the runs that finished the whole command. Same rule as the live path:
     one job of three finishing is not evidence the approach worked. */
  const finished = [];
  for (const list of runs.values()) {
    list.sort((a, b) => (a.turn || 0) - (b.turn || 0));
    if (list[list.length - 1]?.verdict !== "all_done") continue;
    const scope = scopeOf(list);
    const route = routeOf(list);
    const command = list[0]?.command || "";
    if (!scope || route.length < 2 || !command) continue;
    finished.push({ scope, command, route, steps: route.length, runId: list[0].run_id });
  }

  /* Merge by the same notion of "the same job" the live path uses: same scope,
     goals overlapping past the threshold. Each merge is an independent run that
     did this job, which is exactly what hits counts, so history promotes a route
     on the same evidence a live pair of runs would have. */
  const merged = [];
  for (const run of finished) {
    const asked = rules.goalWords(run.command);
    const hit = merged.find(
      (m) => m.scope === run.scope && rules.goalOverlap(asked, rules.goalWords(m.goal)) >= MATCH_AT,
    );
    if (!hit) {
      merged.push({ ...run, goal: run.command, hits: 1 });
      continue;
    }
    hit.hits += 1;
    // The shortest way anybody has finished this job is the one worth keeping.
    if (run.steps < hit.steps) { hit.route = run.route; hit.steps = run.steps; }
  }

  const toWrite = merged
    .map((m) => ({
      scope: m.scope,
      goal: m.goal.slice(0, 300),
      route: m.route.map((intent, i) => `${i + 1}. ${intent}`).join("\n").slice(0, 2000),
      fingerprint: rules.goalFingerprint(m.scope, m.goal),
      steps: m.steps,
      hits: m.hits,
      // The same promotion rule, applied to history instead of to the future. A
      // job done once before is still an anecdote and stays proposed.
      status: m.hits >= 2 ? "live" : "proposed",
      source_run_id: m.runId,
    }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, LIMIT);

  const live = toWrite.filter((r) => r.status === "live");
  console.log(`\nRead ${turns.length} turns across ${runs.size} runs since ${SINCE}.`);
  console.log(`${finished.length} finished the whole command and had a host and a real route.`);
  console.log(`${toWrite.length} distinct jobs, of which ${live.length} were done more than once and would go live.\n`);

  for (const r of toWrite.slice(0, 20)) {
    console.log(`  [${r.status}] ${r.scope} — "${r.goal.slice(0, 60)}" (${r.steps} steps, ${r.hits}x)`);
  }
  if (toWrite.length > 20) console.log(`  ... and ${toWrite.length - 20} more`);

  if (!APPLY) {
    console.log("\nDry run. Nothing was written. Re-run with --apply to file these.\n");
    process.exit(0);
  }

  /* ignore-duplicates, so a fingerprint a live run already filed is left alone
     rather than overwritten by an older reconstruction of it. History fills the
     gaps; it does not get to correct the present. */
  let written = 0;
  for (let i = 0; i < toWrite.length; i += 50) {
    const batch = toWrite.slice(i, i + 50);
    const res = await fetch(`${URL_BASE}/rest/v1/braino_procedures`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error(`\nWrite failed at row ${i}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    written += batch.length;
  }
  console.log(`\nFiled ${written} routes. ${live.length} are live and will be handed to runs from now on.\n`);

}
