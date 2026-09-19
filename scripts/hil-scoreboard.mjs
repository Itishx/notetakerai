#!/usr/bin/env node
/* Did this week go better than last week?
 *
 * The HIL changelog's rule is that an entry only counts if it names the
 * evidence, and every round so far has honoured it by hand: someone read a log,
 * counted, and wrote the number down. That works exactly as long as somebody is
 * willing to do it, which is why rounds 002 to 010 have numbers and the weeks
 * between them have none.
 *
 * Every turn of every run is already in engine_runs. This asks it the four
 * questions a round is actually judged on and prints them next to the window
 * before, so "he got better" stops being a feeling.
 *
 *   node scripts/hil-scoreboard.mjs            last 7 days vs the 7 before
 *   node scripts/hil-scoreboard.mjs --days 14  any window
 *   node scripts/hil-scoreboard.mjs --json     for a script rather than a person
 *
 * Reads with the service role, like every other tool that touches this table,
 * and never writes.
 */

import { pathToFileURL } from "node:url";

/* One window's worth of turns, oldest first. Paged, because a busy fortnight is
   more rows than PostgREST returns in one answer and a scoreboard that silently
   stops at a thousand is worse than no scoreboard. */
async function fetchTurns(URL_BASE, KEY, sinceIso, untilIso) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const query = [
      "select=run_id,turn,verdict,model,elapsed_ms,prompt_tokens,completion_tokens,cached_tokens,ok,error,prompt_version,created_at",
      "engine=eq.hil-loop",
      `created_at=gte.${sinceIso}`,
      `created_at=lt.${untilIso}`,
      "order=created_at.asc",
    ].join("&");
    const res = await fetch(`${URL_BASE}/rest/v1/engine_runs?${query}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`engine_runs read failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

export const median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/* A run is its turns. The verdict that matters is the LAST one, because that is
   how it ended; every turn before it said "step" and none of them are outcomes. */
export function summarise(turns) {
  const runs = new Map();
  for (const t of turns) {
    const key = t.run_id || `single:${t.created_at}`;
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(t);
  }

  let finished = 0, blocked = 0, rescued = 0, malformed = 0;
  const stepsWhenFinished = [];
  const thinkMsPerRun = [];
  let promptTokens = 0, cachedTokens = 0, completionTokens = 0;
  const versions = new Set();

  for (const list of runs.values()) {
    list.sort((a, b) => (a.turn || 0) - (b.turn || 0));
    const last = list[list.length - 1];
    if (last.verdict === "all_done") { finished += 1; stepsWhenFinished.push(list.length); }
    if (last.verdict === "blocked") blocked += 1;
    if (list.some((t) => String(t.model || "").includes("astra"))) rescued += 1;
    malformed += list.filter((t) => t.ok === false || t.error).length;
    thinkMsPerRun.push(list.reduce((sum, t) => sum + (t.elapsed_ms || 0), 0));
    for (const t of list) {
      promptTokens += t.prompt_tokens || 0;
      cachedTokens += t.cached_tokens || 0;
      completionTokens += t.completion_tokens || 0;
      if (t.prompt_version) versions.add(t.prompt_version);
    }
  }

  const total = runs.size;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    runs: total,
    turns: turns.length,
    finishedPct: pct(finished),
    blockedPct: pct(blocked),
    rescuedPct: pct(rescued),
    stepsToFinish: median(stepsWhenFinished),
    thinkSecondsPerRun: Math.round(median(thinkMsPerRun) / 100) / 10,
    malformedTurns: malformed,
    cachedInputPct: promptTokens ? Math.round((cachedTokens / promptTokens) * 100) : 0,
    completionTokens,
    promptVersions: [...versions].sort(),
  };
}

/* Better is not the same direction for every number, so each one says which way
   is up rather than leaving a reader to work it out from the name. */
const ROWS = [
  ["runs", "runs", null],
  ["finished", "finishedPct", "up", "%"],
  ["gave up", "blockedPct", "down", "%"],
  ["needed Astra", "rescuedPct", "down", "%"],
  ["steps to finish", "stepsToFinish", "down"],
  ["thinking per run", "thinkSecondsPerRun", "down", "s"],
  ["unreadable turns", "malformedTurns", "down"],
  ["input served from cache", "cachedInputPct", "up", "%"],
];

function arrow(key, direction, now, before) {
  if (!direction || before[key] === undefined || !before.runs) return "";
  const delta = now[key] - before[key];
  if (!delta) return "  same";
  const better = direction === "up" ? delta > 0 : delta < 0;
  const sign = delta > 0 ? "+" : "";
  return `  ${sign}${Math.round(delta * 10) / 10} ${better ? "better" : "worse"}`;
}

export function render(DAYS, thisWindow, lastWindow) {
  const lines = [];
  const label = `last ${DAYS} day${DAYS === 1 ? "" : "s"}`;
  lines.push(`\nHIL scoreboard — ${label}, against the ${DAYS} before\n`);
  if (!thisWindow.runs) {
    lines.push("  No hil-loop runs in this window.\n");
    return lines.join("\n");
  }
  for (const [name, key, direction, unit = ""] of ROWS) {
    const value = `${thisWindow[key]}${unit}`;
    const was = lastWindow.runs ? `was ${lastWindow[key]}${unit}` : "no prior window";
    lines.push(`  ${name.padEnd(24)} ${value.padEnd(8)} ${was.padEnd(16)}${arrow(key, direction, thisWindow, lastWindow)}`);
  }
  lines.push(`\n  prompt versions in play: ${thisWindow.promptVersions.join(", ") || "none recorded"}`);
  lines.push("  A version change mid-window means these two columns are not the same brain.\n");
  return lines.join("\n");
}

/* Only when a person ran it. Imported (by its test, or by anything that wants
   the numbers), this file reads nothing and prints nothing. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  const DAYS = Math.max(1, Number(flag("days", 7)) || 7);
  const URL_BASE = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!URL_BASE || !KEY) {
    console.error(
      "Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.\n" +
      "Both are on the project's Settings > API page. Nothing is written; this only reads engine_runs.",
    );
    process.exit(2);
  }

  const now = new Date();
  const startOfThis = new Date(now.getTime() - DAYS * 86400000);
  const startOfLast = new Date(now.getTime() - DAYS * 2 * 86400000);

  const [thisWindow, lastWindow] = await Promise.all([
    fetchTurns(URL_BASE, KEY, startOfThis.toISOString(), now.toISOString()).then(summarise),
    fetchTurns(URL_BASE, KEY, startOfLast.toISOString(), startOfThis.toISOString()).then(summarise),
  ]);

  console.log(
    args.includes("--json")
      ? JSON.stringify({ days: DAYS, current: thisWindow, previous: lastWindow }, null, 2)
      : render(DAYS, thisWindow, lastWindow),
  );
}
