#!/usr/bin/env node
/* Before/after score for long HIL jobs, read from the Mac log.
   node scripts/hil-long-score.mjs [since=YYYY-MM-DD]
   Splits runs by whether they started with BRAINO_HIL_FAST on, and reports
   speed (from hil.loop.speed) and how runs ended. A long job is 4+ turns. */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const since = process.argv[2] || "2026-09-22";
const lines = readFileSync(`${homedir()}/Library/Logs/Braino Mac/braino-mac.log`, "utf8").split("\n");
const runs = [];
const byPid = new Map();
const byId = new Map();
for (const line of lines) {
  if (!line.includes('"event":"hil.loop')) continue;
  let d; try { d = JSON.parse(line.slice(line.indexOf("{"))); } catch { continue; }
  if (d.ts < since) continue;
  const ev = d.event.slice(9);
  if (ev === "start") {
    const r = { ts: d.ts, cmd: d.command || "", fast: d.fast === true, ev: [], turns: 0, chains: 0, ms: null };
    runs.push(r); byPid.set(d.pid, r); byId.set(d.runId, r); continue;
  }
  if (ev === "speed") { const r = byId.get(d.runId); if (r) { r.ms = d.totalMs; r.turns = d.turns; } continue; }
  const r = byPid.get(d.pid); if (!r) continue;
  if (ev === "chain") r.chains += 1;
  r.ev.push(ev);
}
const ending = (r) => {
  const e = new Set(r.ev);
  if (e.has("stopped_by_user") || e.has("superseded")) return "stopped";
  if (["failed", "stuck", "budget", "timeout", "circling"].some((x) => e.has(x))) return "failed";
  if (e.has("answered") || e.has("told")) return "finished";
  return "unclear";
};
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const fast of [false, true]) {
  for (const long of [false, true]) {
    const rs = runs.filter((r) => r.fast === fast && (long ? r.turns >= 4 : true));
    if (!rs.length) continue;
    const ends = {}; rs.forEach((r) => { const k = ending(r); ends[k] = (ends[k] || 0) + 1; });
    const ms = rs.map((r) => r.ms).filter((x) => x != null);
    console.log(`${fast ? "FAST on " : "FAST off"} ${long ? "long jobs" : "all jobs "}  n=${rs.length}  median ${ms.length ? (median(ms) / 1000).toFixed(1) + "s" : "-"}  ends ${JSON.stringify(ends)}${fast ? `  chained turns ${rs.reduce((n, r) => n + r.chains, 0)}` : ""}`);
  }
}
