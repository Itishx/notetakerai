import { useCallback, useEffect, useMemo, useState } from "react";
import HilShadowLog from "../components/HilShadowLog";
import "../components/hil-shadow-log.css";
import { Link } from "react-router-dom";
import "./engine-log.css";

/* ============================================================================
   /engine-log — every call both intelligence layers have ever made.

   The layers are tuned by hand, one prompt edit at a time, and that needs a
   record: what was asked, what came back, what it cost. Before this, a run was
   gone when the tab closed, so the same command was paid for twice to be read
   twice.

   Reads through the engine-runs function, which is open: signing in against
   localhost was blocking the tuning this page exists to serve. The table still
   refuses the anon key directly, so this function is the only door, but that
   door is unlocked. Re-gate it before launch, since the demos that fill this
   log are public and these rows include what other people typed into them.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type Run = {
  id: string;
  created_at: string;
  engine: string;
  run_id: string | null;
  turn: number;
  command: string;
  context: string | null;
  response: unknown;
  moment_id: string | null;
  verdict: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  elapsed_ms: number | null;
  ok: boolean;
  error: string | null;
  prompt_version: string | null;
  rating: "good" | "bad" | null;
  note: string | null;
};

type Stats = {
  byEngine: Record<string, { runs: number; tokens: number; failed: number; today: number }>;
  total: { runs: number; tokens: number; failed: number; good: number; bad: number; unjudged: number; cached: number };
};

const ENGINES = [
  { id: "all", label: "Everything" },
  { id: "hil-router", label: "Router" },
  { id: "hil-loop", label: "Loop" },
  { id: "hil-reason", label: "Reason" },
  { id: "braino-reply", label: "Reply" },
];

const ENGINE_LABEL: Record<string, string> = {
  "hil-router": "Router",
  "hil-loop": "Loop",
  "hil-reason": "Reason",
  "braino-reply": "Reply",
};

function when(iso: string) {
  const date = new Date(iso);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Rough, and labelled as such on the page. Enough to answer "is this session
// costing me real money" without pretending to be a billing statement.
//
// Cached input is billed far cheaper than fresh input, and on the loop it is
// most of every turn after the first, so counting it at the full rate would
// overstate the bill several times over. Measured at 97% cached on turn two.
const COST_PER_MTOK = 0.6;
const CACHED_DISCOUNT = 0.1; // cached input bills at roughly a tenth
const USD_TO_INR = 85;

function money(tokens: number, cached = 0) {
  const fresh = Math.max(0, tokens - cached);
  const dollars = ((fresh + cached * CACHED_DISCOUNT) / 1_000_000) * COST_PER_MTOK;
  const rupees = dollars * USD_TO_INR;
  if (rupees < 1) return "under ₹1";
  return `about ₹${rupees < 100 ? rupees.toFixed(1) : Math.round(rupees)}`;
}

export default function EngineLog() {
  const [rows, setRows] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [engine, setEngine] = useState("hil-router");
  const [failedOnly, setFailedOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<"" | "good" | "bad" | "unjudged">("");
  const [open, setOpen] = useState<string | null>(null);
  // Note drafts live here so typing does not fight the row list re-rendering.
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "Engine log — Braino"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
      const base = `${SUPABASE_URL}/functions/v1/engine-runs`;
      const query = new URLSearchParams({ engine, limit: "200" });
      if (failedOnly) query.set("failed", "1");
      if (ratingFilter) query.set("rating", ratingFilter);
      const [listRes, statRes] = await Promise.all([
        fetch(`${base}?${query}`, { headers }),
        fetch(`${base}?stats=1`, { headers }),
      ]);
      if (!listRes.ok) throw new Error(`List failed (${listRes.status})`);
      const list = await listRes.json();
      setRows(Array.isArray(list.rows) ? list.rows : []);
      if (statRes.ok) setStats(await statRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the log.");
    } finally {
      setLoading(false);
    }
  }, [engine, failedOnly, ratingFilter]);

  useEffect(() => { void load(); }, [load]);

  // Judging a RUN, not a turn. A loop run is one attempt at one job, so "he got
  // there badly" is a statement about the whole thing; marking thirteen turns
  // individually would be thirteen copies of one opinion. runId marks them all
  // at once, and the UI shows the verdict once, at the top.
  const judge = useCallback(async (
    key: { id?: string; runId?: string | null },
    rating: "good" | "bad" | null,
    note: string | null,
  ) => {
    const marker = key.runId || key.id || "";
    setSaving(marker);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/engine-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ ...(key.runId ? { runId: key.runId } : { id: key.id }), rating, note: note || null }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setRows((prev) => prev.map((r) => {
        const hit = key.runId ? r.run_id === key.runId : r.id === key.id;
        return hit ? { ...r, rating, note: note || null } : r;
      }));
      setStats(null); // totals are stale now; the next refresh recomputes them
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that rating.");
    } finally {
      setSaving(null);
    }
  }, []);

  // Loop turns belong together: one run is one session of thinking, not nine
  // unrelated calls, so consecutive turns of the same run_id collapse into one
  // group with the command shown once.
  const groups = useMemo(() => {
    const out: Array<{ key: string; runId: string | null; runs: Run[] }> = [];
    for (const row of rows) {
      const last = out[out.length - 1];
      if (last && row.run_id && last.runId === row.run_id) last.runs.push(row);
      else out.push({ key: row.id, runId: row.run_id, runs: [row] });
    }
    return out;
  }, [rows]);

  return (
    <div className="el-page">
      <header className="el-head">
        <div>
          <h1 className="el-title">{engine === "hil-router" ? "Braino vs HIL" : "Engine log"}</h1>
          <p className="el-sub">
            {engine === "hil-router"
              ? "Everything you said, what Braino did, and what HIL would have done. HIL is only watching."
              : "Every call both layers have made. Command, answer, and what it cost."}
          </p>
        </div>
        <button className="el-refresh" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading" : "Refresh"}
        </button>
      </header>

      {stats && engine !== "hil-router" && (
        <div className="el-stats">
          <div className="el-stat">
            <span className="el-stat-value">{stats.total.runs}</span>
            <span className="el-stat-label">calls logged</span>
          </div>
          <div className="el-stat">
            <span className="el-stat-value">{money(stats.total.tokens, stats.total.cached)}</span>
            <span className="el-stat-label">spent, {stats.total.tokens.toLocaleString()} tokens</span>
          </div>
          <div className="el-stat">
            <span className="el-stat-value">
              {stats.total.tokens ? Math.round((100 * stats.total.cached) / stats.total.tokens) : 0}%
            </span>
            <span className="el-stat-label">
              billed at the cheap repeat rate, saving {money(stats.total.cached).replace("about ", "")}
            </span>
          </div>
          <div className={"el-stat" + (stats.total.failed ? " bad" : "")}>
            <span className="el-stat-value">{stats.total.failed}</span>
            <span className="el-stat-label">failed or unreadable</span>
          </div>
          <div className="el-stat">
            <span className="el-stat-value">{stats.total.good} / {stats.total.bad}</span>
            <span className="el-stat-label">marked good / bad, {stats.total.unjudged} unjudged</span>
          </div>
          {Object.entries(stats.byEngine).map(([id, s]) => (
            <div key={id} className="el-stat">
              <span className="el-stat-value">{s.runs}</span>
              <span className="el-stat-label">{ENGINE_LABEL[id] || id}, {s.today} today</span>
            </div>
          ))}
        </div>
      )}

      <div className="el-filters">
        {ENGINES.map((e) => (
          <button key={e.id} className={engine === e.id ? "on" : ""} onClick={() => setEngine(e.id)}>{e.label}</button>
        ))}
        <button className={"el-fail" + (failedOnly ? " on" : "")} onClick={() => setFailedOnly((v) => !v)}>
          Failures only
        </button>
        <span className="el-filter-sep" />
        {([["", "Any verdict"], ["bad", "Marked bad"], ["good", "Marked good"], ["unjudged", "Not judged"]] as const).map(
          ([value, label]) => (
            <button
              key={value || "any"}
              className={"el-rate-filter" + (ratingFilter === value ? " on" : "")}
              onClick={() => setRatingFilter(value)}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {error && <p className="el-error">{error}</p>}
      {!error && !loading && !rows.length && engine !== "hil-router" && (
        <p className="el-note">Nothing logged yet. Run something on Human Intelligence or Emotional Intelligence and it lands here.</p>
      )}

      {/* The shadow stage has exactly one question, so on the Router tab it gets
          the whole page rather than a panel above the generic run list. */}
      {engine === "hil-router" && <HilShadowLog rows={rows} loading={loading} />}

      <div className="el-list" hidden={engine === "hil-router"}>
        {groups.map((group) => {
          const first = group.runs[0];
          const tokens = group.runs.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
          const failed = group.runs.some((r) => !r.ok);
          // Multi-turn loop runs are judged by run; single answers by row.
          const key = group.runId ? { runId: group.runId } : { id: first.id };
          const judgeKey = group.runId || first.id;
          return (
            <section key={group.key} className={"el-group" + (failed ? " failed" : "") + (first.rating ? ` rated-${first.rating}` : "")}>
              <div className="el-group-head">
                <span className={`el-engine el-engine-${first.engine}`}>{ENGINE_LABEL[first.engine] || first.engine}</span>
                <p className="el-command">{first.command}</p>
                {first.rating && <span className={`el-rated el-rated-${first.rating}`}>{first.rating}</span>}
                <span className="el-meta">
                  {group.runs.length > 1 ? `${group.runs.length} turns · ` : ""}
                  {tokens.toLocaleString()} tok · {when(first.created_at)}
                </span>
              </div>
              {first.context && <p className="el-context">Context: {first.context}</p>}

              {/* One verdict for the whole run. This is what turns the log into
                  a worklist: at the end of a session, everything marked bad,
                  with its note, IS the list of prompt edits to make. */}
              <div className="el-judge">
                <button
                  className={"el-good" + (first.rating === "good" ? " on" : "")}
                  disabled={saving === judgeKey}
                  onClick={() => void judge(key, first.rating === "good" ? null : "good", noteDraft[judgeKey] ?? first.note ?? "")}
                >
                  Good
                </button>
                <button
                  className={"el-bad" + (first.rating === "bad" ? " on" : "")}
                  disabled={saving === judgeKey}
                  onClick={() => void judge(key, first.rating === "bad" ? null : "bad", noteDraft[judgeKey] ?? first.note ?? "")}
                >
                  Bad
                </button>
                <input
                  className="el-note-input"
                  placeholder={first.rating === "bad" ? "What was wrong with it?" : "Your remarks (optional)"}
                  value={noteDraft[judgeKey] ?? first.note ?? ""}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [judgeKey]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void judge(key, first.rating, noteDraft[judgeKey] ?? "");
                  }}
                  onBlur={() => {
                    const draft = noteDraft[judgeKey];
                    if (draft !== undefined && draft !== (first.note || "")) void judge(key, first.rating, draft);
                  }}
                />
                <span className="el-saving">{saving === judgeKey ? "saving" : ""}</span>
              </div>

              <div className="el-turns">
                {group.runs.slice().reverse().map((run) => (
                  <div key={run.id} className={"el-turn" + (run.ok ? "" : " bad")}>
                    <button className="el-turn-head" onClick={() => setOpen(open === run.id ? null : run.id)}>
                      <span className="el-turn-n">{group.runs.length > 1 ? `Turn ${run.turn}` : "Answer"}</span>
                      {run.verdict && <span className="el-verdict">{run.verdict}</span>}
                      {run.moment_id && run.moment_id !== "neutral" && <span className="el-moment">{run.moment_id}</span>}
                      <span className="el-turn-meta">
                        {run.elapsed_ms ? `${(run.elapsed_ms / 1000).toFixed(1)}s` : ""}
                        {run.total_tokens ? ` · ${run.total_tokens} tok` : ""}
                      </span>
                      <span className="el-caret">{open === run.id ? "collapse" : "open"}</span>
                    </button>
                    {run.error && <p className="el-turn-error">{run.error}</p>}
                    {open === run.id && (
                      <pre className="el-json">{JSON.stringify(run.response, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="el-foot">
        <Link className="el-link" to="/human-intelligence">Human Intelligence</Link>
        <Link className="el-link" to="/emotional-intelligence">Emotional Intelligence</Link>
        <span className="el-foot-note">
          Estimated at ${COST_PER_MTOK} per million tokens, with repeat text at a tenth of that.
          Check the provider dashboard for the real rate.
        </span>
      </footer>
    </div>
  );
}
