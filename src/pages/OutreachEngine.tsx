import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Copy, Mail, Moon, Plus, Search, Sparkles, Sun, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import "./outreach.css";

/* The Outreach Engine's page. Reads come straight from the tables (row level
   security keeps them to the signed-in user); every step that thinks or
   spends goes through the one outreach-engine function. */

const FN = "outreach-engine";
/* Testing mode: on localhost only, the founder's personal key stands in for
   sign-in. Behind import.meta.env.DEV, so the production build drops it and
   the key never ships in the live site's code. */
const DEV_KEY: string = import.meta.env.DEV ? String(import.meta.env.VITE_OUTREACH_DEV_TOKEN || "") : "";

type Brief = {
  id: string; title: string; ask: string; offer: string; icp: any; questions: string[];
  status: string; stats: any; created_at: string; updated_at: string;
};
type Lead = {
  id: string; brief_id: string; name: string; title: string; seniority: string; company: string;
  company_domain: string; industry: string; company_size: string; location: string; email: string;
  email_status: string; linkedin_url: string; website: string; summary: string;
  signals: { kind: string; text: string; date?: string; url?: string }[];
  sources: { name: string; url: string; title?: string }[];
  score: number; score_parts: any; reasons: string[]; discarded: boolean; discard_reason: string;
  status: string; message: { channel?: string; subject?: string; body?: string; followups?: string[] };
};

const EXAMPLES = [
  "Founders of D2C skincare brands in India doing ₹1-10 crore, who are hiring their first marketer",
  "Heads of operations at US logistics startups that raised a Series A in the last 6 months",
  "Agency owners in London with 5-30 people who post about struggling to find clients",
];

const STATUS_LABEL: Record<string, string> = {
  new: "New", drafted: "Drafted", sent: "Sent", replied: "Replied", booked: "Booked",
  not_interested: "Not interested", opted_out: "Opted out",
};
const FILTERS = [
  ["ready", "Ready"], ["drafted", "Drafted"], ["sent", "Sent"], ["replied", "Replied"], ["booked", "Booked"], ["discarded", "Discarded"], ["all", "All"],
] as const;
const HUNT_STEPS = ["Searching people, companies and news", "Reading every result", "Building one record per person", "Ranking and explaining each pick"];

async function call(step: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke(FN, {
    body: { step, ...body },
    ...(DEV_KEY ? { headers: { "x-outreach-key": DEV_KEY } } : {}),
  });
  if (error) {
    let message = error.message || "Something went wrong.";
    try { const j = await (error as any).context?.json?.(); if (j?.error) message = j.error; } catch (_) { /* keep message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function gmailUrl(to: string, subject: string, body: string) {
  const p = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${p.toString()}`;
}

const pct = (v: unknown) => `${Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100)}%`;
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export default function OutreachEngine() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<"" | "light" | "dark">(() => {
    try { return (localStorage.getItem("oas-theme") as any) || ""; } catch (_) { return ""; }
  });
  const [sources, setSources] = useState<Record<string, boolean>>({});
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(0);

  const say = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => { try { localStorage.setItem("oas-theme", theme); } catch (_) { /* fine */ } }, [theme]);

  // Reads go through the engine, so the personal key works without a session.
  const canUse = Boolean(user || DEV_KEY);
  const loadBriefs = useCallback(async () => {
    const r = await call("list_briefs").catch(() => ({ briefs: [] }));
    setBriefs(r.briefs || []);
    return (r.briefs || []) as Brief[];
  }, []);
  const loadLeads = useCallback(async (briefId: string) => {
    if (!briefId) { setLeads([]); return; }
    const r = await call("list_leads", { brief_id: briefId }).catch(() => ({ leads: [] }));
    setLeads(r.leads || []);
  }, []);

  useEffect(() => {
    if (!canUse) return;
    void loadBriefs();
    call("sources").then(setSources).catch(() => setSources({}));
  }, [canUse, loadBriefs]);
  useEffect(() => { void loadLeads(activeId); setSelected(""); }, [activeId, loadLeads]);

  const active = briefs.find((b) => b.id === activeId) || null;

  if (loading && !DEV_KEY) return <main className="oas" data-theme={theme || undefined} />;
  if (!canUse) {
    return (
      <main className="oas" data-theme={theme || undefined}>
        <div className="oas-signin">
          <div className="oas-kicker">Outreach</div>
          <h1 className="oas-q">Find the people most likely to buy.</h1>
          <p className="oas-lede" style={{ margin: "0 auto 24px" }}>Sign in and tell Braino who you want to sell to. He searches, ranks every person with a reason, and writes the first message.</p>
          <Link to="/auth" className="oas-btn is-primary" style={{ textDecoration: "none" }}>Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="oas" data-theme={theme || undefined}>
      <header className="oas-bar">
        <Link to="/outreach" className="oas-mark" onClick={() => setActiveId("")}><b>Outreach</b><span>by Braino · AffectiveOS</span></Link>
        <div className="oas-sources" aria-label="Data sources">
          {[["exa", "Exa"], ["apollo", "Apollo"], ["hunter", "Hunter"], ["model", "Model"]].map(([k, label]) => (
            <span key={k} className={`oas-src ${sources[k] ? "is-on" : ""}`} title={sources[k] ? `${label} is on` : `${label} is off: add its key`}><i />{label}</span>
          ))}
        </div>
        <button className="oas-theme" type="button" aria-label="Switch theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : t === "light" ? "" : "dark"))}>
          {theme === "dark" ? <Moon size={15} /> : theme === "light" ? <Sun size={15} /> : <Sparkles size={15} />}
        </button>
      </header>
      <div className="oas-shell">
        <nav className="oas-rail">
          <button className="oas-new" type="button" onClick={() => setActiveId("")}><Plus size={15} /> New search</button>
          <h6>Your searches</h6>
          {briefs.map((b) => (
            <button key={b.id} type="button" className={`oas-brief-item ${b.id === activeId ? "is-on" : ""}`} onClick={() => setActiveId(b.id)}>
              <b>{b.title || "Untitled"}</b>
              <small>{b.status === "ready" ? `${b.stats?.kept ?? 0} people` : b.status === "hunting" ? "Searching…" : b.status === "failed" ? "Needs another try" : "Profile ready"} · {ago(b.updated_at)}</small>
            </button>
          ))}
          {!briefs.length && <p className="oas-note" style={{ padding: "0 8px" }}>Nothing yet. Your first search shows up here.</p>}
        </nav>
        <section className="oas-main">
          {active
            ? <BriefView key={active.id} brief={active} leads={leads} selected={selected} setSelected={setSelected}
                onBrief={async () => { await loadBriefs(); }} onLeads={() => loadLeads(active.id)} say={say} />
            : <Composer onCreated={async (b) => { await loadBriefs(); setActiveId(b.id); }} />}
        </section>
      </div>
      {toast && <div className="oas-toast" role="status">{toast}</div>}
    </main>
  );
}

/* ── New search ──────────────────────────────────────────────────────── */

function Composer({ onCreated }: { onCreated: (b: Brief) => void }) {
  const [ask, setAsk] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!ask.trim() || busy) return;
    setBusy(true); setErr("");
    try { const r = await call("refine", { ask, offer }); onCreated(r.brief); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="oas-compose">
      <div className="oas-kicker">New search</div>
      <h1 className="oas-q">Who do you want to sell to?</h1>
      <p className="oas-lede">Say it the way you would to a friend. Braino turns it into a precise profile, asks what he needs to know, then searches for the people who fit best.</p>
      <label className="oas-field">
        <span>The people</span>
        <textarea rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Founders of… in… who are…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void go(); }} />
      </label>
      <div className="oas-examples">
        {EXAMPLES.map((x) => <button key={x} type="button" className="oas-ex" onClick={() => setAsk(x)}>{x.length > 64 ? `${x.slice(0, 62)}…` : x}</button>)}
      </div>
      <label className="oas-field">
        <span>What you sell, and the problem it solves</span>
        <textarea rows={3} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="We help… so they can… without…" />
      </label>
      <div className="oas-row" style={{ marginTop: 18 }}>
        <button type="button" className="oas-btn is-primary" disabled={!ask.trim() || busy} onClick={() => void go()}>
          {busy ? "Building the profile…" : "Build the profile"}
        </button>
        <span className="oas-note">Nothing is searched or sent yet. ⌘↵ works too.</span>
      </div>
      {err && <div className="oas-err">{err}</div>}
    </div>
  );
}

/* ── One search: profile, funnel, ranked people ─────────────────────── */

function BriefView({ brief, leads, selected, setSelected, onBrief, onLeads, say }: {
  brief: Brief; leads: Lead[]; selected: string; setSelected: (id: string) => void;
  onBrief: () => Promise<void>; onLeads: () => Promise<void>; say: (t: string) => void;
}) {
  const icp = brief.icp || {};
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<"" | "refine" | "hunt" | "draft">("");
  const [huntStep, setHuntStep] = useState(0);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<string>("ready");
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);

  const run = async (kind: "refine" | "hunt" | "draft", fn: () => Promise<any>) => {
    setBusy(kind); setErr("");
    let timer = 0;
    if (kind === "hunt") {
      setHuntStep(0);
      timer = window.setInterval(() => setHuntStep((s) => Math.min(HUNT_STEPS.length - 1, s + 1)), 9000);
    }
    try { await fn(); }
    catch (e) { setErr((e as Error).message); }
    finally { window.clearInterval(timer); setBusy(""); await onBrief(); await onLeads(); }
  };

  const refine = () => run("refine", () => call("refine", {
    brief_id: brief.id, ask: brief.ask, offer: brief.offer,
    answers: (brief.questions || []).map((qq, i) => ({ q: qq, a: answers[i] || "" })).filter((a) => a.a.trim()),
  }));
  const hunt = () => run("hunt", async () => { const r = await call("hunt", { brief_id: brief.id }); say(`${r.stats?.kept ?? 0} people kept, ${r.stats?.discarded ?? 0} set aside`); });
  const draftAll = () => run("draft", async () => { const r = await call("draft", { brief_id: brief.id, limit: 12 }); say(`${r.drafted} messages written`); });

  const counts = useMemo(() => {
    const live = leads.filter((l) => !l.discarded);
    const n = (s: string[]) => live.filter((l) => s.includes(l.status)).length;
    return {
      found: leads.length, kept: live.length,
      drafted: n(["drafted", "sent", "replied", "booked", "not_interested", "opted_out"]),
      sent: n(["sent", "replied", "booked", "not_interested", "opted_out"]),
      replied: n(["replied", "booked"]), booked: n(["booked"]),
    };
  }, [leads]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "discarded" ? !l.discarded : (filter !== "all" && l.discarded)) return false;
      if (filter === "ready" && !["new", "drafted"].includes(l.status)) return false;
      if (["drafted", "sent", "replied", "booked"].includes(filter) && l.status !== filter) return false;
      if (l.score < minScore) return false;
      if (needle && !`${l.name} ${l.title} ${l.company} ${l.industry} ${l.location}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [leads, filter, q, minScore]);

  const lead = leads.find((l) => l.id === selected) || null;
  const hasPeople = leads.length > 0;
  const tags = (xs: unknown, no = false) => (Array.isArray(xs) && xs.length
    ? <div className="oas-tags">{xs.map((x: any) => <span key={String(x)} className={`oas-tag ${no ? "is-no" : ""}`}>{String(x)}</span>)}</div>
    : <span className="oas-note">Any</span>);
  const size = icp.company_size || {};

  return (
    <>
      <div className="oas-head">
        <div className="oas-kicker">{brief.status === "ready" ? "Ranked" : brief.status === "hunting" ? "Searching" : "Profile"}</div>
        <h1>{brief.title || "Untitled search"}</h1>
        <p>{icp.summary || brief.ask}</p>
        <div className="oas-row">
          <button type="button" className="oas-btn is-primary" disabled={!!busy} onClick={() => void hunt()}>
            <Search /> {busy === "hunt" ? "Searching…" : hasPeople ? "Search again" : "Find people"}
          </button>
          {hasPeople && <button type="button" className="oas-btn" disabled={!!busy} onClick={() => void draftAll()}>
            <Sparkles /> {busy === "draft" ? "Writing…" : "Write messages for the top 12"}
          </button>}
          {brief.stats?.cost_usd != null && <span className="oas-note">Last search ≈ ${Number(brief.stats.cost_usd).toFixed(3)} · {brief.stats.searched ?? 0} results read{brief.stats.learned_from ? ` · learned from ${brief.stats.learned_from} past wins` : ""}</span>}
        </div>
        {err && <div className="oas-err">{err}</div>}
        {brief.status === "failed" && brief.stats?.error && !err && <div className="oas-err">{brief.stats.error}</div>}
      </div>

      <div className="oas-grid">
        <div className="oas-cell"><h5>Roles</h5>{tags(icp.roles)}</div>
        <div className="oas-cell"><h5>Industries</h5>{tags(icp.industries)}</div>
        <div className="oas-cell"><h5>Company size</h5><span>{size.min_employees || size.max_employees ? `${size.min_employees ?? 1}–${size.max_employees ?? "any"} people` : "Any"}{size.revenue ? ` · ${size.revenue}` : ""}</span></div>
        <div className="oas-cell"><h5>Places</h5>{tags(icp.locations)}</div>
        <div className="oas-cell"><h5>Buying signals</h5>{tags(icp.signals)}</div>
        <div className="oas-cell"><h5>Never</h5>{tags([...(icp.exclude_companies || []), ...(icp.exclude_traits || [])], true)}</div>
      </div>

      {(brief.questions || []).length > 0 && !hasPeople && (
        <div className="oas-questions">
          <h4>A few things that would sharpen this</h4>
          {brief.questions.map((qq, i) => (
            <label key={qq}><span>{qq}</span>
              <input value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder="Optional" />
            </label>
          ))}
          <div className="oas-row">
            <button type="button" className="oas-btn is-ink is-small" disabled={!!busy || !Object.values(answers).some((a) => a.trim())} onClick={() => void refine()}>
              {busy === "refine" ? "Updating…" : "Update the profile"}
            </button>
            <span className="oas-note">Or skip, and find people now.</span>
          </div>
        </div>
      )}

      {hasPeople && (
        <div className="oas-funnel">
          <div className="oas-stage"><b>{counts.found}</b><span>Found</span></div>
          <div className="oas-stage"><b>{counts.kept}</b><span>Kept</span></div>
          <div className="oas-stage"><b>{counts.drafted}</b><span>Written</span></div>
          <div className="oas-stage"><b>{counts.sent}</b><span>Sent</span></div>
          <div className="oas-stage"><b>{counts.replied}</b><span>Replied</span></div>
          <div className="oas-stage is-goal"><b>{counts.booked}</b><span>Calls booked</span></div>
        </div>
      )}

      {busy === "hunt" ? (
        <div className="oas-hunting">
          <div className="oas-orb" />
          <h3>Looking for the right people</h3>
          <p className="oas-note">Usually under a minute.</p>
          <div className="oas-steps">
            {HUNT_STEPS.map((s, i) => <div key={s} className={i < huntStep ? "is-done" : i === huntStep ? "is-now" : ""}><i />{s}</div>)}
          </div>
        </div>
      ) : hasPeople ? (
        <>
          <div className="oas-tools">
            <div className="oas-seg" role="tablist">
              {FILTERS.map(([k, label]) => <button key={k} type="button" className={filter === k ? "is-on" : ""} onClick={() => setFilter(k)}>{label}</button>)}
            </div>
            <input className="oas-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, place" />
            <label className="oas-range">Score ≥ {minScore}<input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /></label>
            <span className="oas-note" style={{ marginLeft: "auto" }}>{shown.length} shown</span>
          </div>
          <div className={`oas-split ${lead ? "has-drawer" : ""}`}>
            <div style={{ minWidth: 0, overflowX: "auto" }}>
              {shown.length ? (
                <table className="oas-table">
                  <thead><tr><th>#</th><th>Person</th><th>Company</th><th>Score</th><th className="oas-why-h">Why</th><th>Status</th></tr></thead>
                  <tbody>
                    {shown.map((l, i) => (
                      <tr key={l.id} className={`${l.id === selected ? "is-on" : ""} ${l.discarded ? "is-out" : ""}`} onClick={() => setSelected(l.id === selected ? "" : l.id)}>
                        <td className="oas-rank">{i + 1}</td>
                        <td className="oas-person"><b>{l.name}</b><small>{l.title}</small></td>
                        <td className="oas-co"><b>{l.company}</b><small>{[l.industry, l.location].filter(Boolean).join(" · ")}</small></td>
                        <td className="oas-score"><div className={`oas-meter ${l.score >= 70 ? "is-high" : ""}`}><b>{l.score}</b><i style={{ ["--w" as any]: `${l.score}%` }} /></div></td>
                        <td className="oas-why">{l.discarded ? l.discard_reason : (l.reasons || [])[0] || l.summary}</td>
                        <td><span className={`oas-status s-${l.status}`}>{l.discarded ? "Set aside" : STATUS_LABEL[l.status] || l.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="oas-empty">Nobody here with these filters.</div>}
            </div>
            {lead && <LeadDrawer key={lead.id} lead={lead} onClose={() => setSelected("")} onChanged={onLeads} say={say} />}
          </div>
        </>
      ) : brief.status !== "failed" ? (
        <div className="oas-empty">The profile is ready. Press <b>Find people</b> and Braino searches for everyone who fits.</div>
      ) : null}
    </>
  );
}

/* ── One person ──────────────────────────────────────────────────────── */

function LeadDrawer({ lead, onClose, onChanged, say }: { lead: Lead; onClose: () => void; onChanged: () => Promise<void>; say: (t: string) => void }) {
  const [msg, setMsg] = useState({ channel: lead.message?.channel || (lead.email ? "email" : "linkedin"), subject: lead.message?.subject || "", body: lead.message?.body || "", followups: lead.message?.followups || [] });
  const [busy, setBusy] = useState("");
  const dirty = msg.body !== (lead.message?.body || "") || msg.subject !== (lead.message?.subject || "") || msg.channel !== (lead.message?.channel || msg.channel)
    || JSON.stringify(msg.followups) !== JSON.stringify(lead.message?.followups || []);
  const parts = lead.score_parts || {};

  const act = async (label: string, fn: () => Promise<any>, done?: string) => {
    setBusy(label);
    try { await fn(); if (done) say(done); await onChanged(); }
    catch (e) { say((e as Error).message); }
    finally { setBusy(""); }
  };
  const save = () => act("save", () => call("edit", { lead_id: lead.id, message: msg }), "Saved");
  const draftOne = () => act("draft", () => call("draft", { brief_id: lead.brief_id, lead_ids: [lead.id] }), "Message written");
  const mark = (kind: string, done: string) => act(kind, () => call("outcome", { lead_id: lead.id, kind }), done);
  const copy = async () => {
    const text = msg.channel === "email" && msg.subject ? `Subject: ${msg.subject}\n\n${msg.body}` : msg.body;
    try { await navigator.clipboard.writeText(text); say("Copied"); } catch (_) { say("Could not copy"); }
  };
  const openGmail = async () => {
    if (dirty) await call("edit", { lead_id: lead.id, message: msg }).catch(() => null);
    window.open(gmailUrl(lead.email, msg.subject, msg.body), "_blank", "noopener");
  };

  const partRows: [string, unknown][] = [["Fit", parts.fit], ["Timing", parts.timing], ["Reachable", parts.reach]];
  if (parts.lookalike != null) partRows.push(["Like past wins", parts.lookalike]);

  return (
    <aside className="oas-drawer" aria-label={`${lead.name}`}>
      <div className="oas-dsec">
        <button type="button" className="oas-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <h2 className="oas-dname">{lead.name}</h2>
        <p className="oas-dsub">{[lead.title, lead.company].filter(Boolean).join(" at ")}{lead.location ? ` · ${lead.location}` : ""}</p>
        {lead.summary && <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>{lead.summary}</p>}
        <div className="oas-links">
          {lead.email && <span className="oas-link" title={lead.email_status}><Mail /> {lead.email}{lead.email_status === "verified" ? " ✓" : ""}</span>}
          {lead.linkedin_url && <a className="oas-link" href={lead.linkedin_url} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight /></a>}
          {(lead.website || lead.company_domain) && <a className="oas-link" href={lead.website || `https://${lead.company_domain}`} target="_blank" rel="noreferrer">{lead.company_domain || "Website"} <ArrowUpRight /></a>}
        </div>
      </div>

      <div className="oas-dsec">
        <h5>Why Braino picked them</h5>
        <div className="oas-total"><b>{lead.score}</b><span>out of 100</span></div>
        <div className="oas-parts">
          {partRows.map(([k, v]) => <div key={k} className="oas-part"><span>{k}</span><i style={{ ["--w" as any]: pct(v) }} /><b>{Math.round((Number(v) || 0) * 100)}</b></div>)}
        </div>
        {lead.discarded
          ? <p className="oas-err" style={{ marginTop: 12 }}>Set aside: {lead.discard_reason}</p>
          : <ul className="oas-reasons" style={{ marginTop: 14 }}>{(lead.reasons || []).map((r) => <li key={r}>{r}</li>)}</ul>}
      </div>

      {(lead.signals || []).length > 0 && (
        <div className="oas-dsec">
          <h5>What is happening for them</h5>
          {lead.signals.map((s, i) => {
            const inner = <><small>{s.kind}{s.date ? ` · ${s.date}` : ""}</small>{s.text}</>;
            return s.url ? <a key={i} className="oas-signal" href={s.url} target="_blank" rel="noreferrer">{inner}</a> : <div key={i} className="oas-signal">{inner}</div>;
          })}
        </div>
      )}

      <div className="oas-dsec oas-msg">
        <h5>The message</h5>
        {!msg.body ? (
          <button type="button" className="oas-btn is-primary" disabled={!!busy || lead.discarded} onClick={() => void draftOne()}><Sparkles /> {busy === "draft" ? "Writing…" : "Write it"}</button>
        ) : (
          <>
            <label>Channel</label>
            <select value={msg.channel} onChange={(e) => setMsg({ ...msg, channel: e.target.value })}>
              {["email", "linkedin", "whatsapp", "x", "instagram"].map((c) => <option key={c} value={c}>{c === "x" ? "X" : c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
            {msg.channel === "email" && <><label>Subject</label><input value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} /></>}
            <label>Message</label>
            <textarea value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
            {msg.followups.map((f, i) => (
              <div key={i}><label>Follow-up {i + 1} · day {i === 0 ? 3 : 7}</label>
                <textarea className="is-follow" value={f} onChange={(e) => setMsg({ ...msg, followups: msg.followups.map((x, j) => (j === i ? e.target.value : x)) })} /></div>
            ))}
            <div className="oas-row">
              {msg.channel === "email" && lead.email && <button type="button" className="oas-btn is-primary is-small" onClick={() => void openGmail()}><Mail /> Open in Gmail</button>}
              {msg.channel === "linkedin" && lead.linkedin_url && <a className="oas-btn is-primary is-small" style={{ textDecoration: "none" }} href={lead.linkedin_url} target="_blank" rel="noreferrer" onClick={() => void copy()}>Copy + open LinkedIn <ArrowUpRight /></a>}
              <button type="button" className="oas-btn is-small" onClick={() => void copy()}><Copy /> Copy</button>
              {dirty && <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void save()}>Save</button>}
              <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void draftOne()}>Rewrite</button>
            </div>
          </>
        )}
      </div>

      <div className="oas-dsec">
        <h5>What happened</h5>
        <div className="oas-outcomes">
          <button type="button" className="oas-btn is-small is-ink" disabled={!!busy || lead.status === "sent"} onClick={() => void mark("sent", "Marked sent")}>I sent it</button>
          <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("replied", "Reply logged")}>Replied</button>
          <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("booked", "Call booked. Braino learns from this one.")}>Booked a call</button>
          <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("not_interested", "Logged")}>Not interested</button>
          <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("opted_out", "Never contacted again")}>Opted out</button>
          {lead.email && <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("bounced", "Email marked bad")}>Bounced</button>}
        </div>
        <p className="oas-note" style={{ marginTop: 10 }}>Booked calls and replies teach the ranking who converts for you, so your next search ranks better.</p>
      </div>

      {(lead.sources || []).length > 0 && (
        <div className="oas-dsec">
          <h5>Where this came from</h5>
          <div className="oas-links">{lead.sources.map((s, i) => <a key={i} className="oas-link" href={s.url} target="_blank" rel="noreferrer">{s.name.replace("exa:", "")} <ArrowUpRight /></a>)}</div>
        </div>
      )}
    </aside>
  );
}
