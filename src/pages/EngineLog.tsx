import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./engine-log.css";

/* ============================================================================
   /engine-log — every call both intelligence layers have ever made.

   The layers are tuned by hand, one prompt edit at a time, and that needs a
   record: what was asked, what came back, what it cost. Before this, a run was
   gone when the tab closed, so the same command was paid for twice to be read
   twice.

   Reads through the engine-runs function, which is creator-gated. The table
   itself has RLS on with no policies, because the endpoints that write it are
   public and nobody should be able to read back what strangers typed.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ADMIN_EMAIL = "itishpande21@gmail.com";

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
};

type Stats = {
  byEngine: Record<string, { runs: number; tokens: number; failed: number; today: number }>;
  total: { runs: number; tokens: number; failed: number };
};

const ENGINES = [
  { id: "all", label: "Everything" },
  { id: "hil-loop", label: "Loop" },
  { id: "hil-reason", label: "Reason" },
  { id: "braino-reply", label: "Reply" },
];

const ENGINE_LABEL: Record<string, string> = {
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
const COST_PER_MTOK = 0.6;

function money(tokens: number) {
  const dollars = (tokens / 1_000_000) * COST_PER_MTOK;
  if (dollars < 0.01) return "<$0.01";
  return `$${dollars.toFixed(2)}`;
}

export default function EngineLog() {
  const { user, session, loading: authLoading } = useAuth();
  const isCreator = user?.email === ADMIN_EMAIL;

  const [rows, setRows] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [engine, setEngine] = useState("all");
  const [failedOnly, setFailedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "Engine log — Braino"; }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const auth = { Authorization: `Bearer ${session.access_token}` };
      const base = `${SUPABASE_URL}/functions/v1/engine-runs`;
      const query = new URLSearchParams({ engine, limit: "200" });
      if (failedOnly) query.set("failed", "1");
      const [listRes, statRes] = await Promise.all([
        fetch(`${base}?${query}`, { headers: auth }),
        fetch(`${base}?stats=1`, { headers: auth }),
      ]);
      if (!listRes.ok) throw new Error(listRes.status === 403 ? "Not authorised." : `List failed (${listRes.status})`);
      const list = await listRes.json();
      setRows(Array.isArray(list.rows) ? list.rows : []);
      if (statRes.ok) setStats(await statRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the log.");
    } finally {
      setLoading(false);
    }
  }, [session, engine, failedOnly]);

  useEffect(() => { if (isCreator && session) void load(); }, [isCreator, session, load]);

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

  if (authLoading) return <div className="el-page"><p className="el-note">Checking who you are...</p></div>;

  if (!isCreator) {
    return (
      <div className="el-page">
        <h1 className="el-title">Engine log</h1>
        <p className="el-note">
          This is the private tuning log for both intelligence layers.
          {user ? " This account cannot read it." : " Sign in as the creator to read it."}
        </p>
        <Link className="el-link" to="/">Back to Braino</Link>
      </div>
    );
  }

  return (
    <div className="el-page">
      <header className="el-head">
        <div>
          <h1 className="el-title">Engine log</h1>
          <p className="el-sub">Every call both layers have made. Command, answer, and what it cost.</p>
        </div>
        <button className="el-refresh" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading" : "Refresh"}
        </button>
      </header>

      {stats && (
        <div className="el-stats">
          <div className="el-stat">
            <span className="el-stat-value">{stats.total.runs}</span>
            <span className="el-stat-label">calls logged</span>
          </div>
          <div className="el-stat">
            <span className="el-stat-value">{stats.total.tokens.toLocaleString()}</span>
            <span className="el-stat-label">tokens, about {money(stats.total.tokens)}</span>
          </div>
          <div className={"el-stat" + (stats.total.failed ? " bad" : "")}>
            <span className="el-stat-value">{stats.total.failed}</span>
            <span className="el-stat-label">failed or unreadable</span>
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
      </div>

      {error && <p className="el-error">{error}</p>}
      {!error && !loading && !rows.length && (
        <p className="el-note">Nothing logged yet. Run something on Human Intelligence or Emotional Intelligence and it lands here.</p>
      )}

      <div className="el-list">
        {groups.map((group) => {
          const first = group.runs[0];
          const tokens = group.runs.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
          const failed = group.runs.some((r) => !r.ok);
          return (
            <section key={group.key} className={"el-group" + (failed ? " failed" : "")}>
              <div className="el-group-head">
                <span className={`el-engine el-engine-${first.engine}`}>{ENGINE_LABEL[first.engine] || first.engine}</span>
                <p className="el-command">{first.command}</p>
                <span className="el-meta">
                  {group.runs.length > 1 ? `${group.runs.length} turns · ` : ""}
                  {tokens.toLocaleString()} tok · {when(first.created_at)}
                </span>
              </div>
              {first.context && <p className="el-context">Context: {first.context}</p>}

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
        <span className="el-foot-note">Cost is an estimate at ${COST_PER_MTOK} per million tokens.</span>
      </footer>
    </div>
  );
}
