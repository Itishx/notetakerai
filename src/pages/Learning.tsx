import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "./learning.css";

/* ============================================================================
   /learning — what Braino has worked out, and what it cost him.

   He learns three different things and they were all invisible. Routes: the way
   he got a job done, kept so the next run does not work it out again. Lessons:
   the walls he walked into, kept so he stops walking into them. History: what
   the two of you have actually done together.

   The page is a window, not a dashboard. Nothing here is a metric to make go
   up; it is a record you should be able to read and disagree with, which is why
   every route shows its own steps in his words rather than a count.

   It reads one endpoint, braino-learning, which is the only door onto three
   tables that have RLS on and no policies.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

// engine-runs / braino-learning are creator-only, so they need the signed-in session.
async function authHeaderValue() {
  const { data } = await supabase.auth.getSession();
  return `Bearer ${data.session?.access_token ?? ""}`;
}

type Route = {
  id: string;
  goal: string;
  where: string;
  kind: string;
  steps: string[];
  stepCount: number;
  hits: number;
  misses: number;
  status: string;
  learnedAt: string;
  lastSeenAt: string;
};
type Lesson = { id: string; lesson: string; hits: number; status: string; learnedAt: string };
type Moment = { id: string; command: string; route: string; surface: string; kind: string; at: string };
type Payload = {
  counts: { routes: number; live: number; proposed: number; lessons: number; history: number; stepsLearned: number };
  routes: Route[];
  lessons: Lesson[];
  history: Moment[];
};

function whenever(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const mins = Math.round((Date.now() - at.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Learning() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string>("");
  const [tab, setTab] = useState<"routes" | "lessons" | "history">("routes");

  useEffect(() => {
    document.title = "What Braino has learned";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-learning?limit=120`, {
          headers: { apikey: SUPABASE_KEY, Authorization: await authHeaderValue() },
        });
        const body = await res.json();
        if (!alive) return;
        if (body?.error) { setError(String(body.error)); return; }
        setData(body);
        setError("");
      } catch (err) {
        if (alive) setError(String((err as Error)?.message || err));
      }
    };
    load();
    /* It fills itself while you are looking at it, which is the point. */
    const timer = window.setInterval(load, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  /* Where he has learned to work, and how much of it he knows there. The same
     site appearing under four goals is the shape of somebody getting good at
     one place rather than a little bit good everywhere. */
  const places = useMemo(() => {
    const by = new Map<string, { where: string; kind: string; live: number; proposed: number }>();
    for (const r of data?.routes || []) {
      const row = by.get(r.where) || { where: r.where, kind: r.kind, live: 0, proposed: 0 };
      if (r.status === "live") row.live += 1; else row.proposed += 1;
      by.set(r.where, row);
    }
    return [...by.values()].sort((a, b) => (b.live + b.proposed) - (a.live + a.proposed)).slice(0, 12);
  }, [data]);

  const counts = data?.counts;

  return (
    <div className="lrn">
      <nav className="lrn-nav">
        <div className="lrn-wrap lrn-nav-in">
          <Link to="/affective" className="lrn-back">Affective</Link>
          <div className="lrn-nav-links">
            <Link to="/engine-log">Engine log</Link>
            <Link to="/braino-final">Braino</Link>
          </div>
        </div>
      </nav>

      <header className="lrn-head">
        <div className="lrn-wrap">
          <p className="lrn-kicker">What he has learned</p>
          <h1>
            He is not the same
            <b>as he was last week.</b>
          </h1>
          <p className="lrn-lede">
            Braino keeps three things: the route that finished a job, the wall he walked
            into, and what the two of you have done together. This is all of it, as it
            stands right now. It refills itself every thirty seconds.
          </p>
        </div>
      </header>

      {/* The numbers, said as sentences rather than as tiles with big digits:
          a count here is only interesting next to what it means. */}
      <section className="lrn-wrap">
        <div className="lrn-counts">
          <div>
            <strong>{counts?.live ?? "—"}</strong>
            <span>routes he will use</span>
            <small>Two separate successes before one is handed to a run.</small>
          </div>
          <div>
            <strong>{counts?.proposed ?? "—"}</strong>
            <span>waiting for a second run</span>
            <small>One more success each and they go live on their own.</small>
          </div>
          <div>
            <strong>{counts?.lessons ?? "—"}</strong>
            <span>walls he remembers</span>
            <small>Things that went wrong once and now do not.</small>
          </div>
          <div>
            <strong>{counts?.stepsLearned ?? "—"}</strong>
            <span>steps he can skip</span>
            <small>Turns a run no longer spends working out where things live.</small>
          </div>
        </div>
      </section>

      {/* Where the learning is landing. A bar per place, because the shape of
          this is the finding: he gets good at somewhere, not at everything. */}
      {places.length > 0 && (
        <section className="lrn-wrap lrn-places">
          <h2>Where he has learned to work</h2>
          <ul>
            {places.map((p) => {
              const total = p.live + p.proposed;
              const widest = Math.max(...places.map((x) => x.live + x.proposed), 1);
              return (
                <li key={p.where}>
                  <span className="lrn-place-name">{p.where}</span>
                  <span className="lrn-bar" aria-hidden="true">
                    <i className="live" style={{ width: `${(p.live / widest) * 100}%` }} />
                    <i className="proposed" style={{ width: `${(p.proposed / widest) * 100}%` }} />
                  </span>
                  <span className="lrn-place-n">{total}</span>
                </li>
              );
            })}
          </ul>
          <p className="lrn-key">
            <i className="live" /> in use
            <i className="proposed" /> waiting for a second run
          </p>
        </section>
      )}

      <div className="lrn-wrap">
        <div className="lrn-tabs" role="tablist" aria-label="What to look at">
          {([["routes", "Routes"], ["lessons", "Lessons"], ["history", "History"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "on" : ""}
              onClick={() => setTab(key)}
            >
              {label}
              <small>{key === "routes" ? counts?.routes ?? 0 : key === "lessons" ? counts?.lessons ?? 0 : counts?.history ?? 0}</small>
            </button>
          ))}
        </div>
      </div>

      <main className="lrn-wrap lrn-body">
        {error && <p className="lrn-empty">That did not load: {error}</p>}
        {!data && !error && <p className="lrn-empty">Reading what he knows…</p>}

        {tab === "routes" && data && (
          data.routes.length === 0
            ? <p className="lrn-empty">Nothing yet. A route is written when a job finishes cleanly.</p>
            : (
              <ul className="lrn-list">
                {data.routes.map((r) => (
                  <li key={r.id} className={r.status === "live" ? "live" : ""}>
                    <button type="button" className="lrn-row" onClick={() => setOpen(open === r.id ? "" : r.id)}>
                      <span className={`lrn-tag ${r.status}`}>{r.status === "live" ? "in use" : "waiting"}</span>
                      <span className="lrn-goal">{r.goal}</span>
                      <span className="lrn-meta">
                        {r.where} · {r.stepCount} steps · {r.hits} {r.hits === 1 ? "run" : "runs"}
                        {r.misses > 0 && ` · ${r.misses} since failed`}
                      </span>
                      <span className="lrn-when">{whenever(r.lastSeenAt)}</span>
                    </button>
                    {/* His own words for what he did, which is the only way to
                        tell a route worth keeping from one worth deleting. */}
                    {open === r.id && (
                      <ol className="lrn-steps">
                        {r.steps.map((step, i) => <li key={`${r.id}-${i}`}>{step}</li>)}
                      </ol>
                    )}
                  </li>
                ))}
              </ul>
            )
        )}

        {tab === "lessons" && data && (
          data.lessons.length === 0
            ? <p className="lrn-empty">No walls recorded yet.</p>
            : (
              <ul className="lrn-list">
                {data.lessons.map((l) => (
                  <li key={l.id}>
                    <div className="lrn-row lrn-row-flat">
                      <span className={`lrn-tag ${l.status === "live" ? "live" : "proposed"}`}>
                        {l.status === "live" ? "in use" : "waiting"}
                      </span>
                      <span className="lrn-goal">{l.lesson}</span>
                      <span className="lrn-meta">{l.hits} {l.hits === 1 ? "time" : "times"}</span>
                      <span className="lrn-when">{whenever(l.learnedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
        )}

        {tab === "history" && data && (
          data.history.length === 0
            ? <p className="lrn-empty">Nothing recorded yet.</p>
            : (
              <ul className="lrn-list">
                {data.history.map((m) => (
                  <li key={m.id}>
                    <div className="lrn-row lrn-row-flat">
                      <span className="lrn-tag surface">{m.surface || "?"}</span>
                      <span className="lrn-goal">{m.command}</span>
                      <span className="lrn-meta">{[m.kind, m.route].filter(Boolean).join(" · ")}</span>
                      <span className="lrn-when">{whenever(m.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
        )}
      </main>

      <footer className="lrn-foot">
        <div className="lrn-wrap">
          <p>
            Routes come from runs that finished cleanly. Lessons come from runs that did
            not. Anything private is dropped before it ever leaves the table, and a route
            is only ever a head start: the screen still decides, and nothing is sent or
            spent without you saying yes.
          </p>
        </div>
      </footer>
    </div>
  );
}
