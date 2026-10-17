import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight, Copy, Mail, Moon, Plus, Search, Sparkles, Sun, X } from "lucide-react";
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
  email_status: string; linkedin_url: string; website: string; summary: string; photo_url?: string;
  signals: { kind: string; text: string; date?: string; url?: string }[];
  sources: { name: string; url: string; title?: string }[];
  score: number; score_parts: any; reasons: string[]; discarded: boolean; discard_reason: string;
  status: string; message: { channel?: string; subject?: string; body?: string; followups?: string[] };
};

const EXAMPLES = [
  { tag: "India · D2C", title: "Skincare founders hiring their first marketer", ask: "Founders of D2C skincare brands in India doing ₹1-10 crore, who are hiring their first marketer" },
  { tag: "US · Logistics", title: "Ops heads at freshly funded startups", ask: "Heads of operations at US logistics startups that raised a Series A in the last 6 months" },
  { tag: "UK · Agencies", title: "Small agency owners short on clients", ask: "Agency owners in London with 5-30 people who post about struggling to find clients" },
];

/* Their public photo when the search found one; their initials when it did
   not, or when the link has expired (LinkedIn's do). */
function Avatar({ name, src, size = 34 }: { name: string; src?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="oas-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {src && !broken ? <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} /> : initials}
    </span>
  );
}

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

/* The page is a conversation, the way Claude is: you say who and what, Braino
   answers in the thread, and everything he makes (the profile, the ranked
   people) arrives as his reply. One column to read down, wide blocks step out
   of it for tables. A person opens in a full sheet, not a sliver. */

export default function OutreachEngine() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<"" | "light" | "dark">(() => {
    try { return (localStorage.getItem("oas-theme") as any) || ""; } catch (_) { return ""; }
  });
  const [sources, setSources] = useState<Record<string, boolean>>({});
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
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
  useEffect(() => { void loadLeads(activeId); }, [activeId, loadLeads]);

  const active = briefs.find((b) => b.id === activeId) || null;

  if (loading && !DEV_KEY) return <main className="oas" data-theme={theme || undefined} />;
  if (!canUse) {
    return (
      <main className="oas" data-theme={theme || undefined}>
        <div className="oas-signin">
          <div className="oas-kicker">Outreach</div>
          <h1 className="oas-q">Find the people most likely to buy.</h1>
          <p className="oas-lede" style={{ margin: "0 auto 24px" }}>Sign in and tell Braino who you want to sell to.</p>
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
        <button className="oas-theme" type="button" aria-label="Switch theme" title={theme ? `${theme} mode` : "Follows your Mac"}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : t === "light" ? "" : "dark"))}>
          {theme === "dark" ? <Moon size={15} /> : theme === "light" ? <Sun size={15} /> : <Sparkles size={15} />}
        </button>
      </header>
      <div className="oas-shell">
        <nav className="oas-rail">
          <button className="oas-new" type="button" onClick={() => setActiveId("")}><Plus size={15} /> New search</button>
          <h6>Searches</h6>
          {briefs.map((b) => (
            <button key={b.id} type="button" className={`oas-brief-item ${b.id === activeId ? "is-on" : ""}`} onClick={() => setActiveId(b.id)}>
              <b>{b.title || "Untitled"}</b>
              <small>{b.status === "ready" ? `${b.stats?.kept ?? 0} people` : b.status === "hunting" ? "Searching…" : b.status === "failed" ? "Needs another try" : "Profile ready"} · {ago(b.updated_at)}</small>
            </button>
          ))}
          {!briefs.length && <p className="oas-note" style={{ padding: "0 8px" }}>Your searches show up here.</p>}
        </nav>
        <section className="oas-main">
          {active
            ? <Thread key={active.id} brief={active} leads={leads} onBrief={async () => { await loadBriefs(); }} onLeads={() => loadLeads(active.id)} say={say} />
            : <Start onCreated={async (b) => { await loadBriefs(); setActiveId(b.id); }} />}
        </section>
      </div>
      {toast && <div className="oas-toast" role="status">{toast}</div>}
    </main>
  );
}

/* ── The empty chat ──────────────────────────────────────────────────── */

function Start({ onCreated }: { onCreated: (b: Brief) => void }) {
  const [ask, setAsk] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!ask.trim() || busy) return;
    setBusy(true); setErr("");
    try { const r = await call("refine", { ask, offer }); onCreated(r.brief); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  if (busy) {
    return (
      <div className="oas-thread">
        <Bubble ask={ask} offer={offer} />
        <Braino><p>Okay. Working out exactly who that is…</p><Dots /></Braino>
      </div>
    );
  }
  return (
    <div className="oas-start">
      <h1 className="oas-hello">Who do we want to sell to?</h1>
      <div className="oas-box">
        <textarea rows={2} value={ask} autoFocus onChange={(e) => setAsk(e.target.value)} placeholder="Who do we want to sell to? e.g. founders of D2C skincare brands in India"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
        <div className="oas-box-rule" />
        <textarea rows={1} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="What do we sell, or what problem do we solve?"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
        <div className="oas-box-foot">
          <span className="oas-note">Nothing is searched or sent until you say so.</span>
          <button type="button" className="oas-send" aria-label="Send" disabled={!ask.trim()} onClick={() => void go()}><ArrowUp size={17} /></button>
        </div>
      </div>
      {err && <div className="oas-err">{err}</div>}
      <div className="oas-examples">
        {EXAMPLES.map((x) => (
          <button key={x.ask} type="button" className="oas-ex" onClick={() => setAsk(x.ask)}>
            <small>{x.tag}</small><b>{x.title}</b><ArrowUpRight className="oas-ex-go" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ ask, offer }: { ask: string; offer?: string }) {
  return (
    <div className="oas-you">
      <div className="oas-you-b"><p>{ask}</p>{offer ? <p className="oas-you-offer">We sell: {offer}</p> : null}</div>
    </div>
  );
}
function Braino({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`oas-him ${wide ? "is-wide" : ""}`}><div className="oas-him-av" aria-hidden="true">B</div><div className="oas-him-b">{children}</div></div>;
}
const Dots = () => <span className="oas-dots" aria-label="Working"><i /><i /><i /></span>;

/* ── One search, as a conversation ───────────────────────────────────── */

function Thread({ brief, leads, onBrief, onLeads, say }: {
  brief: Brief; leads: Lead[]; onBrief: () => Promise<void>; onLeads: () => Promise<void>; say: (t: string) => void;
}) {
  const icp = brief.icp || {};
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<"" | "refine" | "hunt" | "draft">("");
  const [huntStep, setHuntStep] = useState(0);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  const run = async (kind: "refine" | "hunt" | "draft", fn: () => Promise<any>) => {
    setBusy(kind); setErr("");
    let timer = 0;
    if (kind === "hunt") { setHuntStep(0); timer = window.setInterval(() => setHuntStep((s) => Math.min(HUNT_STEPS.length - 1, s + 1)), 9000); }
    try { await fn(); }
    catch (e) { setErr((e as Error).message); }
    finally { window.clearInterval(timer); setBusy(""); await onBrief(); await onLeads(); }
  };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [busy, leads.length]);

  const refine = (extra = "") => run("refine", () => call("refine", {
    brief_id: brief.id, ask: brief.ask, offer: brief.offer,
    answers: [
      ...(brief.questions || []).map((qq, i) => ({ q: qq, a: answers[i] || "" })),
      ...(extra ? [{ q: "Anything else to change?", a: extra }] : []),
    ].filter((a) => a.a.trim()),
  }));
  const hunt = () => run("hunt", async () => { await call("hunt", { brief_id: brief.id }); });
  const draftAll = () => run("draft", async () => { const r = await call("draft", { brief_id: brief.id, limit: 12 }); say(`${r.drafted} messages written`); });
  const sendNote = () => { const t = note.trim(); if (!t || busy) return; setNote(""); void refine(t); };

  const hasPeople = leads.length > 0;
  const kept = leads.filter((l) => !l.discarded);
  const lead = leads.find((l) => l.id === open) || null;
  const size = icp.company_size || {};
  const sizeText = size.min_employees || size.max_employees ? `${size.min_employees ?? 1} to ${size.max_employees ?? "any"} people` : "";

  return (
    <>
      <div className="oas-thread">
        <Bubble ask={brief.ask} offer={brief.offer} />

        <Braino>
          <p>Here is who I will look for. {icp.summary ? <span className="oas-soft">{icp.summary}</span> : null}</p>
          <div className="oas-profile">
            <ProfileRow label="Who" items={icp.roles} />
            <ProfileRow label="Industry" items={icp.industries} />
            <ProfileRow label="Size" items={[sizeText, size.revenue].filter(Boolean)} />
            <ProfileRow label="Where" items={icp.locations} />
            <ProfileRow label="Buying signals" items={icp.signals} accent />
            <ProfileRow label="Never" items={[...(icp.exclude_companies || []), ...(icp.exclude_traits || [])]} strike />
            {icp.pain ? <div className="oas-prow"><span>Their pain</span><p>{icp.pain}</p></div> : null}
          </div>
        </Braino>

        {(brief.questions || []).length > 0 && !hasPeople && busy !== "hunt" && (
          <Braino>
            <p>A few things would sharpen who I pick. Answer any, or skip.</p>
            <div className="oas-asks">
              {brief.questions.map((qq, i) => (
                <label key={qq}><span>{qq}</span>
                  <input value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder="Your answer" /></label>
              ))}
            </div>
            <div className="oas-row">
              <button type="button" className="oas-btn is-small" disabled={!!busy || !Object.values(answers).some((a) => a.trim())} onClick={() => void refine()}>{busy === "refine" ? "Updating…" : "Update the profile"}</button>
              <button type="button" className="oas-btn is-primary is-small" disabled={!!busy} onClick={() => void hunt()}><Search /> Skip, find people</button>
            </div>
          </Braino>
        )}

        {!hasPeople && !(brief.questions || []).length && busy !== "hunt" && (
          <Braino><p>Ready when you are.</p><button type="button" className="oas-btn is-primary is-small" disabled={!!busy} onClick={() => void hunt()}><Search /> Find people</button></Braino>
        )}

        {busy === "hunt" && (
          <Braino>
            <p>Okay, finding them. Usually under a minute.</p>
            <div className="oas-steps">{HUNT_STEPS.map((s, i) => <div key={s} className={i < huntStep ? "is-done" : i === huntStep ? "is-now" : ""}><i />{s}</div>)}</div>
          </Braino>
        )}

        {hasPeople && busy !== "hunt" && (
          <Braino wide>
            <p>
              I read {brief.stats?.searched ?? "the"} results and found <b>{leads.length} people</b>. <b>{kept.length}</b> fit; I set {leads.length - kept.length} aside and say why.
              {brief.stats?.learned_from ? ` Ranked using ${brief.stats.learned_from} of your past wins.` : ""} Click anyone to see why they are here and what to send.
            </p>
            <Funnel leads={leads} />
            <People leads={leads} openId={open} onOpen={setOpen} />
            <div className="oas-row" style={{ marginTop: 14 }}>
              <button type="button" className="oas-btn is-primary is-small" disabled={!!busy} onClick={() => void draftAll()}><Sparkles /> {busy === "draft" ? "Writing…" : "Write messages for the top 12"}</button>
              <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void hunt()}><Search /> Search again</button>
              {brief.stats?.cost_usd != null && <span className="oas-note">This search ≈ ${Number(brief.stats.cost_usd).toFixed(2)}</span>}
            </div>
          </Braino>
        )}

        {busy === "refine" && <Braino><p>Updating the profile…</p><Dots /></Braino>}
        {busy === "draft" && <Braino><p>Writing one message per person, from their real moment…</p><Dots /></Braino>}
        {(err || (brief.status === "failed" && brief.stats?.error)) && <Braino><p className="oas-err" style={{ margin: 0 }}>{err || brief.stats.error}</p></Braino>}
        <div ref={endRef} />
      </div>

      <div className="oas-dock">
        <div className="oas-box is-dock">
          <textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Change who we are looking for… e.g. only Mumbai, skip agencies"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNote(); } }} />
          <button type="button" className="oas-send" aria-label="Send" disabled={!note.trim() || !!busy} onClick={sendNote}><ArrowUp size={17} /></button>
        </div>
      </div>

      {lead && <LeadSheet lead={lead} onClose={() => setOpen("")} onChanged={onLeads} say={say} />}
    </>
  );
}

function ProfileRow({ label, items, accent = false, strike = false }: { label: string; items?: unknown[]; accent?: boolean; strike?: boolean }) {
  const list = (Array.isArray(items) ? items : []).map((x) => String(x)).filter(Boolean);
  return (
    <div className="oas-prow">
      <span>{label}</span>
      {list.length
        ? <div className="oas-tags">{list.map((x) => <span key={x} className={`oas-tag ${accent ? "is-accent" : ""} ${strike ? "is-no" : ""}`}>{x}</span>)}</div>
        : <p className="oas-soft">Any</p>}
    </div>
  );
}

function Funnel({ leads }: { leads: Lead[] }) {
  const live = leads.filter((l) => !l.discarded);
  const n = (s: string[]) => live.filter((l) => s.includes(l.status)).length;
  const after = ["sent", "replied", "booked", "not_interested", "opted_out"];
  const stages: [string, number, boolean?][] = [
    ["Kept", live.length], ["Written", n(["drafted", ...after])], ["Sent", n(after)],
    ["Replied", n(["replied", "booked"])], ["Calls booked", n(["booked"]), true],
  ];
  return <div className="oas-funnel">{stages.map(([k, v, goal]) => <div key={k} className={`oas-stage ${goal ? "is-goal" : ""}`}><b>{v}</b><span>{k}</span></div>)}</div>;
}

function People({ leads, openId, onOpen }: { leads: Lead[]; openId: string; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<string>("ready");
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
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
  return (
    <div className="oas-people">
      <div className="oas-tools">
        <div className="oas-seg" role="tablist">{FILTERS.map(([k, label]) => <button key={k} type="button" className={filter === k ? "is-on" : ""} onClick={() => setFilter(k)}>{label}</button>)}</div>
        <input className="oas-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, place" />
        <label className="oas-range">Score ≥ {minScore}<input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /></label>
      </div>
      {shown.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="oas-table">
            <thead><tr><th>#</th><th>Person</th><th>Company</th><th>Score</th><th className="oas-why-h">Why</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((l, i) => (
                <tr key={l.id} className={`${l.id === openId ? "is-on" : ""} ${l.discarded ? "is-out" : ""}`} onClick={() => onOpen(l.id)}>
                  <td className="oas-rank">{i + 1}</td>
                  <td className="oas-person"><div className="oas-who"><Avatar name={l.name} src={l.photo_url} /><div><b>{l.name}</b><small>{l.title}</small></div></div></td>
                  <td className="oas-co"><b>{l.company}</b><small>{[l.industry, l.location].filter(Boolean).join(" · ")}</small></td>
                  <td className="oas-score"><div className={`oas-meter ${l.score >= 70 ? "is-high" : ""}`}><b>{l.score}</b><i style={{ ["--w" as any]: `${l.score}%` }} /></div></td>
                  <td className="oas-why">{l.discarded ? l.discard_reason : (l.reasons || [])[0] || l.summary}</td>
                  <td><span className={`oas-status s-${l.status}`}>{l.discarded ? "Set aside" : STATUS_LABEL[l.status] || l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="oas-empty">Nobody here with these filters.</div>}
    </div>
  );
}

/* ── One person, full sheet ──────────────────────────────────────────── */

function LeadSheet({ lead, onClose, onChanged, say }: { lead: Lead; onClose: () => void; onChanged: () => Promise<void>; say: (t: string) => void }) {
  const [msg, setMsg] = useState({ channel: lead.message?.channel || (lead.email ? "email" : "linkedin"), subject: lead.message?.subject || "", body: lead.message?.body || "", followups: lead.message?.followups || [] });
  const [busy, setBusy] = useState("");
  useEffect(() => {
    setMsg({ channel: lead.message?.channel || (lead.email ? "email" : "linkedin"), subject: lead.message?.subject || "", body: lead.message?.body || "", followups: lead.message?.followups || [] });
  }, [lead.id, lead.message?.body]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const dirty = msg.body !== (lead.message?.body || "") || msg.subject !== (lead.message?.subject || "")
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
    <div className="oas-scrim" onClick={onClose}>
      <div className="oas-sheet" role="dialog" aria-modal="true" aria-label={lead.name} onClick={(e) => e.stopPropagation()}>
        <header className="oas-sheet-head">
          <Avatar name={lead.name} src={lead.photo_url} size={72} />
          <div>
            <h2 className="oas-dname">{lead.name}</h2>
            <p className="oas-dsub">{[lead.title, lead.company].filter(Boolean).join(" at ")}{lead.location ? ` · ${lead.location}` : ""}</p>
            <div className="oas-links">
              {lead.email && <span className="oas-link" title={lead.email_status}><Mail /> {lead.email}{lead.email_status === "verified" ? " ✓" : ""}</span>}
              {lead.linkedin_url && <a className="oas-link" href={lead.linkedin_url} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight /></a>}
              {(lead.website || lead.company_domain) && <a className="oas-link" href={lead.website || `https://${lead.company_domain}`} target="_blank" rel="noreferrer">{lead.company_domain || "Website"} <ArrowUpRight /></a>}
            </div>
          </div>
          <div className="oas-total"><b>{lead.score}</b><span>/ 100</span></div>
          <button type="button" className="oas-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="oas-sheet-body">
          <div className="oas-sheet-col">
            {lead.summary && <p className="oas-sheet-sum">{lead.summary}</p>}
            <section className="oas-dsec">
              <h5>Why Braino picked them</h5>
              <div className="oas-parts">{partRows.map(([k, v]) => <div key={k} className="oas-part"><span>{k}</span><i style={{ ["--w" as any]: pct(v) }} /><b>{Math.round((Number(v) || 0) * 100)}</b></div>)}</div>
              {lead.discarded
                ? <p className="oas-err" style={{ marginTop: 12 }}>Set aside: {lead.discard_reason}</p>
                : <ul className="oas-reasons" style={{ marginTop: 14 }}>{(lead.reasons || []).map((r) => <li key={r}>{r}</li>)}</ul>}
            </section>
            {(lead.signals || []).length > 0 && (
              <section className="oas-dsec">
                <h5>What is happening for them</h5>
                {lead.signals.map((s, i) => {
                  const inner = <><small>{s.kind}{s.date ? ` · ${s.date}` : ""}</small>{s.text}</>;
                  return s.url ? <a key={i} className="oas-signal" href={s.url} target="_blank" rel="noreferrer">{inner}</a> : <div key={i} className="oas-signal">{inner}</div>;
                })}
              </section>
            )}
            {(lead.sources || []).length > 0 && (
              <section className="oas-dsec">
                <h5>Where this came from</h5>
                <div className="oas-links">{lead.sources.map((s, i) => <a key={i} className="oas-link" href={s.url} target="_blank" rel="noreferrer">{s.title ? s.title.slice(0, 48) : s.name.replace("exa:", "")} <ArrowUpRight /></a>)}</div>
              </section>
            )}
          </div>

          <div className="oas-sheet-col oas-msg">
            <section className="oas-dsec">
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
            </section>
            <section className="oas-dsec">
              <h5>What happened</h5>
              <div className="oas-outcomes">
                <button type="button" className="oas-btn is-small is-ink" disabled={!!busy || lead.status === "sent"} onClick={() => void mark("sent", "Marked sent")}>I sent it</button>
                <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("replied", "Reply logged")}>Replied</button>
                <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("booked", "Call booked. Braino learns from this one.")}>Booked a call</button>
                <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("not_interested", "Logged")}>Not interested</button>
                <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("opted_out", "Never contacted again")}>Opted out</button>
                {lead.email && <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void mark("bounced", "Email marked bad")}>Bounced</button>}
              </div>
              <p className="oas-note" style={{ marginTop: 10 }}>Replies and booked calls teach the ranking who converts for you.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
