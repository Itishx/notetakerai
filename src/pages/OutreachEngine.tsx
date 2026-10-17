import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronRight, Copy, Download, PenLine, LayoutGrid, Rows3, Home as HomeIcon, Package, Settings as SettingsIcon, Building2, Store, Users, Inbox as InboxIcon, RefreshCw, Send, Mail, Moon, Plus, Search, Sparkles, Sun, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { supabase } from "@/integrations/supabase/client";
import "./affective.css";
import "./affectiveos-page.css";
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
  email_status: string; email_source?: string; contacts?: { domain?: string; emails?: string[]; phones?: string[]; whatsapp?: string[]; instagram?: string[] }; linkedin_url: string; website: string; summary: string; photo_url?: string;
  signals: { kind: string; text: string; date?: string; url?: string }[];
  sources: { name: string; url: string; title?: string }[];
  score: number; score_parts: any; reasons: string[]; discarded: boolean; discard_reason: string;
  status: string; reply_kind?: string; message: { channel?: string; subject?: string; body?: string; followups?: string[]; variants?: Record<string, Variant> };
};
type Variant = { subject?: string; body: string; followups?: string[] };
type Product = {
  id: string; name: string; website: string; notes: string; docs: { name: string; text: string }[];
  answers: { q: string; a: string }[]; report: any; questions: string[]; status: string; updated_at: string;
};
const EMAIL_TRUST: Record<string, string> = { verified: "verified", found: "found", pattern: "known format", guessed: "guessed", company: "company inbox" };
const CHANNEL_LABEL: Record<string, string> = { email: "Email", linkedin: "LinkedIn", whatsapp: "WhatsApp", x: "X", instagram: "Instagram" };

const EXAMPLES = [
  { tag: "India · D2C", title: "Skincare founders hiring their first marketer", ask: "Founders of D2C skincare brands in India doing ₹1-10 crore, who are hiring their first marketer" },
  { tag: "US · Logistics", title: "Ops heads at freshly funded startups", ask: "Heads of operations at US logistics startups that raised a Series A in the last 6 months" },
  { tag: "UK · Agencies", title: "Small agency owners short on clients", ask: "Agency owners in London with 5-30 people who post about struggling to find clients" },
];

/* Their public photo when the search found one; their initials when it did
   not, or when the link has expired (LinkedIn's do). */
function Avatar({ name, src, size = 34 }: { name: string; src?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = String(name || "?").replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[\p{L}]/u.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
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

/* Gmail status, read once per page and refreshed after connecting. */
type GmailState = { connected: boolean; email: string; reason?: string; cap_today: number; sent_today: number; settings?: any };
let gmailCache: GmailState | null = null;
const gmailListeners = new Set<(g: GmailState) => void>();
async function refreshGmail() {
  const g = await call("gmail_status").catch(() => null);
  if (g) { gmailCache = g; gmailListeners.forEach((f) => f(g)); }
  return g as GmailState | null;
}
function useGmail() {
  const [g, setG] = useState<GmailState | null>(gmailCache);
  useEffect(() => {
    gmailListeners.add(setG);
    if (!gmailCache) void refreshGmail();
    // Coming back from Google's permission screen: look again.
    const onFocus = () => void refreshGmail();
    window.addEventListener("focus", onFocus);
    return () => { gmailListeners.delete(setG); window.removeEventListener("focus", onFocus); };
  }, []);
  return g;
}
async function connectGmail() {
  const r = await call("gmail_connect");
  if (r?.authUrl) window.open(r.authUrl, "_blank", "noopener");
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

/* /outreach opens on what this is; Skip goes straight to the tool, and
   /outreach/app is the tool itself, for links and the back button. */
export default function OutreachEngine() {
  const navigate = useNavigate();
  const location = useLocation();
  const inApp = location.pathname.replace(/\/$/, "").endsWith("/app");
  if (!inApp) return <OutreachLanding onOpen={() => navigate("/outreach/app")} />;
  return <OutreachApp />;
}

function OutreachApp() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<"" | "light" | "dark">(() => {
    try { return (localStorage.getItem("oas-theme") as any) || ""; } catch (_) { return ""; }
  });
  const [sources, setSources] = useState<Record<string, boolean>>({});
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  // "" = new search, "new" = add a product, otherwise a product id being viewed.
  const [productView, setProductView] = useState<string>("");
  const [sellOpen, setSellOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  // Home (the summary) is where you land; New search is the composer.
  const [homeOpen, setHomeOpen] = useState(true);
  const [railQ, setRailQ] = useState("");
  /* One way to move between screens, so no two are ever open at once. */
  const go = (to: { search?: string; product?: string; inbox?: boolean; voice?: boolean; settings?: boolean; products?: boolean; home?: boolean }) => {
    setHomeOpen(Boolean(to.home));
    setActiveId(to.search || ""); setProductView(to.product || ""); setInboxOpen(Boolean(to.inbox));
    setVoiceOpen(Boolean(to.voice)); setSettingsOpen(Boolean(to.settings)); setProductsOpen(Boolean(to.products));
  };
  const [overview, setOverview] = useState<Overview | null>(null);
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
  const loadOverview = useCallback(async () => { const r = await call("overview").catch(() => null); if (r) setOverview(r); }, []);
  useEffect(() => { if (canUse) void loadOverview(); }, [canUse, activeId, inboxOpen, loadOverview]);
  const needsCount = overview ? overview.needs.replies + overview.needs.followups_due : 0;
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
  const loadProducts = useCallback(async () => {
    const r = await call("product_list").catch(() => ({ products: [] }));
    setProducts(r.products || []);
    return (r.products || []) as Product[];
  }, []);
  useEffect(() => {
    if (!canUse) return;
    void loadBriefs();
    void loadProducts();
    call("sources").then(setSources).catch(() => setSources({}));
  }, [canUse, loadBriefs, loadProducts]);
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
        <Link to="/outreach/app" className="oas-mark" onClick={() => go({ home: true })}><b>Outreach</b><span>by Braino · AffectiveOS</span></Link>
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
        <nav className="oas-rail oas-rail2">
          <button className="oas-new" type="button" onClick={() => go({})}><Plus size={15} /> New search</button>
          <div className="oas-nav">
            <button type="button" className={homeOpen ? "is-on" : ""} onClick={() => go({ home: true })}><HomeIcon size={16} /><span>Home</span></button>
            <button type="button" className={inboxOpen ? "is-on" : ""} onClick={() => go({ inbox: true })}><InboxIcon size={16} /><span>Inbox</span>{needsCount ? <em className="oas-badge">{needsCount}</em> : null}</button>
            <button type="button" className={productsOpen || productView ? "is-on" : ""} onClick={() => go({ products: true })}><Package size={16} /><span>What you sell</span>{products.length ? <small>{products.length}</small> : null}</button>
            <button type="button" className={voiceOpen ? "is-on" : ""} onClick={() => go({ voice: true })}><PenLine size={16} /><span>Your voice</span></button>
          </div>
          <div className="oas-rail-sec">
            <h6>Searches <small>{briefs.length}</small></h6>
            {briefs.length > 4 && <input className="oas-rail-q" value={railQ} onChange={(e) => setRailQ(e.target.value)} placeholder="Find a search" />}
            <div className="oas-rail-list">
              {briefs.filter((b) => !railQ.trim() || (b.title || "").toLowerCase().includes(railQ.trim().toLowerCase())).map((b) => {
                const T = b.icp?.target === "companies" ? Building2 : b.icp?.target === "local" ? Store : Users;
                return (
                  <button key={b.id} type="button" className={`oas-brief-item ${b.id === activeId ? "is-on" : ""}`} onClick={() => go({ search: b.id })}>
                    <b><T size={13} /> {b.title || "Untitled"}</b>
                    <small>{b.status === "ready" ? `${b.stats?.kept ?? 0} found` : b.status === "hunting" ? "Searching…" : b.status === "failed" ? "Needs another try" : "Profile ready"} · {ago(b.updated_at)}</small>
                  </button>
                );
              })}
              {!briefs.length && <p className="oas-note" style={{ padding: "0 10px" }}>Your searches show up here.</p>}
            </div>
          </div>
          <div className="oas-rail-foot">
            <button type="button" className={settingsOpen ? "is-on" : ""} onClick={() => go({ settings: true })}><SettingsIcon size={16} /><span>Settings</span></button>
            <div className="oas-me">
              <span className="oas-me-av">{String(user?.email || "I").slice(0, 1).toUpperCase()}</span>
              <span className="oas-me-txt"><b>{(user?.email || "Founder mode").split("@")[0]}</b><small>{DEV_KEY && !user ? "Testing on this Mac" : "Signed in"}</small></span>
            </div>
          </div>
        </nav>
        <section className="oas-main">
          {homeOpen
            ? <HomeView name={(user?.email || "").split("@")[0]} overview={overview} briefsCount={briefs.length} onNew={() => go({})} onOpenSearch={(id) => go({ search: id })} onOpenInbox={() => go({ inbox: true })} onChanged={loadOverview} say={say} />
            : settingsOpen
            ? <SettingsView say={say} sources={sources} theme={theme} setTheme={setTheme} />
            : voiceOpen
            ? <VoiceView say={say} />
            : inboxOpen
            ? <InboxView say={say} />
            : productsOpen
            ? <ProductsView products={products} onOpen={(id) => go({ product: id })} />
            : productView
            ? <ProductView key={productView} product={products.find((p) => p.id === productView) || null}
                onSaved={async (p) => { await loadProducts(); go({ product: p.id }); }} say={say} />
            : active
              ? <Thread key={active.id} brief={active} leads={leads} onBrief={async () => { await loadBriefs(); }} onLeads={() => loadLeads(active.id)} say={say} />
              : <Start products={products} overview={overview} onOpenSearch={(id) => go({ search: id })} onOpenInbox={() => go({ inbox: true })} onAddProduct={() => go({ product: "new" })} onCreated={async (b) => { await loadBriefs(); go({ search: b.id }); }} />}
        </section>
      </div>
      {toast && <div className="oas-toast" role="status">{toast}</div>}
    </main>
  );
}

/* ── The empty chat ──────────────────────────────────────────────────── */

function Start({ products, onCreated, onAddProduct, overview, onOpenSearch, onOpenInbox }: {
  products: Product[]; onCreated: (b: Brief) => void; onAddProduct: () => void;
  overview: Overview | null; onOpenSearch: (id: string) => void; onOpenInbox: () => void;
}) {
  const ready = products.filter((p) => p.status === "ready");
  const [productId, setProductId] = useState<string>(() => {
    try { return localStorage.getItem("oas-product") || ""; } catch (_) { return ""; }
  });
  useEffect(() => {
    if (productId && !ready.some((p) => p.id === productId)) setProductId(ready[0]?.id || "");
    else if (!productId && ready[0]) setProductId(ready[0].id);
  }, [ready.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem("oas-product", productId); } catch (_) { /* fine */ } }, [productId]);
  const selling = ready.find((p) => p.id === productId);
  const [ask, setAsk] = useState("");
  const [target, setTarget] = useState<Target>(() => { try { return (localStorage.getItem("oas-target") as Target) || "people"; } catch (_) { return "people"; } });
  useEffect(() => { try { localStorage.setItem("oas-target", target); } catch (_) { /* fine */ } }, [target]);
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!ask.trim() || busy) return;
    setBusy(true); setErr("");
    try { const r = await call("refine", { ask, offer, product_id: selling?.id || null, target }); onCreated(r.brief); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  if (busy) {
    return (
      <div className="oas-thread">
        <Bubble ask={ask} offer={offer || (selling ? selling.name : "")} />
        <Braino><p>Okay. Working out exactly who that is…</p><Dots /></Braino>
      </div>
    );
  }
  return (
    <div className="oas-start">
      <h1 className="oas-hello">Who do we want to sell to?</h1>
      <div className="oas-box">
        <textarea rows={2} value={ask} autoFocus onChange={(e) => setAsk(e.target.value)} placeholder={TARGETS[target].example}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
        <div className="oas-box-rule" />
        <textarea rows={1} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={selling ? `Anything specific about this pitch for ${selling.name}? (optional)` : "What do we sell, or what problem do we solve?"}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
        <div className="oas-box-foot">
          <span className="oas-note">Nothing is searched or sent until you say so.</span>
          <div className="oas-foot-right">
            <TargetPicker target={target} setTarget={setTarget} />
            <SellPicker ready={ready} productId={productId} setProductId={setProductId} onAddProduct={onAddProduct} />
          <button type="button" className="oas-send" aria-label="Send" disabled={!ask.trim()} onClick={() => void go()}><ArrowUp size={17} /></button>
          </div>
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

/* ── Home dashboard ──────────────────────────────────────────────────────
   Everything at a glance, nothing to decode: six numbers that read as a
   sentence left to right (found → reachable → sent → replied → booked, and
   what it cost), what needs you right now, and every search as a card whose
   bar shows how reachable its people are. */
type Overview = {
  totals: { people: number; with_email: number; verified_email: number; written: number; sent: number; replied: number; booked: number; spend_usd: number };
  needs: { replies: number; interested: number; followups_due: number; ready_to_send: number };
  searches: { id: string; title: string; status: string; updated_at: string; people: number; reach: number[]; sent: number; replied: number; top_score: number }[];
  people?: (Lead & { search: string; reply_text?: string })[];
};
const REACH_TONES = ["var(--o-good)", "var(--o-accent)", "var(--o-warn)", "var(--o-ink-faint)", "var(--o-line-strong)"];

function Dashboard({ o, onOpenSearch, onOpenInbox, onChanged, say }: { o: Overview; onOpenSearch: (id: string) => void; onOpenInbox: () => void; onChanged?: () => Promise<void>; say?: (t: string) => void }) {
  const t = o.totals;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  const kpis: { k: string; v: string | number; sub: string; goal?: boolean }[] = [
    { k: "People found", v: t.people, sub: `${o.searches.length} search${o.searches.length === 1 ? "" : "es"}` },
    { k: "Reachable by email", v: t.with_email, sub: `${t.verified_email} verified · ${pct(t.with_email, t.people)}` },
    { k: "Sent", v: t.sent, sub: `${t.written} written` },
    { k: "Replied", v: t.replied, sub: `${pct(t.replied, t.sent)} reply rate` },
    { k: "Calls booked", v: t.booked, sub: `${pct(t.booked, t.replied)} of replies`, goal: true },
    { k: "Spent", v: `$${t.spend_usd.toFixed(2)}`, sub: t.booked ? `$${(t.spend_usd / t.booked).toFixed(2)} per call` : "on search and writing" },
  ];
  const needs: { n: number; label: string; go: () => void }[] = [
    { n: o.needs.interested, label: o.needs.interested === 1 ? "person is interested" : "people are interested", go: onOpenInbox },
    { n: o.needs.replies, label: o.needs.replies === 1 ? "reply to answer" : "replies to answer", go: onOpenInbox },
    { n: o.needs.followups_due, label: o.needs.followups_due === 1 ? "follow-up is due" : "follow-ups are due", go: onOpenInbox },
    { n: o.needs.ready_to_send, label: "emails written, ready to send", go: () => o.searches[0] && onOpenSearch(o.searches[0].id) },
  ].filter((x) => x.n > 0);
  return (
    <section className="oas-dash" aria-label="Your outreach at a glance">
      <div className="oas-dash-kpis">
        {kpis.map((x, i) => (
          <div key={x.k} className={`oas-kpi ${x.goal ? "is-goal" : ""}`}>
            <span>{x.k}</span><b>{x.v}</b><small>{x.sub}</small>
            {i < kpis.length - 2 ? <i className="oas-kpi-arrow" aria-hidden="true">→</i> : null}
          </div>
        ))}
      </div>
      {needs.length > 0 && (
        <div className="oas-dash-needs">
          <span className="oas-dash-label">Needs you</span>
          {needs.map((x) => <button key={x.label} type="button" onClick={x.go}><b>{x.n}</b> {x.label} <ArrowUpRight size={13} /></button>)}
        </div>
      )}
      <PeopleGrid people={o.people || []} onChanged={onChanged} say={say} />
    </section>
  );
}

/* A score as a ring: the eye reads a circle's fill faster than a bar's length. */
function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = v >= 70 ? "var(--o-good)" : v >= 50 ? "var(--o-accent)" : "var(--o-ink-faint)";
  return (
    <span className="oas-ring" style={{ width: size, height: size }} title={`${v} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--o-line)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b style={{ fontSize: Math.round(size * 0.32) }}>{v}</b>
    </span>
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
  const hunt = () => run("hunt", async () => {
    // Local businesses: the map is read from this browser (map servers turn cloud servers away).
    const finds = icp.target === "local" ? await localFindsInBrowser(icp) : undefined;
    if (icp.target === "local" && !finds?.length) throw new Error("The map found no matching businesses there. Try a wider area or a different kind of business.");
    await call("hunt", { brief_id: brief.id, finds });
  });
  const draftAll = () => run("draft", async () => { const r = await call("draft", { brief_id: brief.id, limit: 12 }); say(`${r.drafted} messages written`); });
  const gmail = useGmail();
  const ready = leads.filter((l) => !l.discarded && l.status === "drafted" && l.email && (l.message?.variants?.email?.body || (l.message?.channel === "email" && l.message?.body)));
  const [confirmAll, setConfirmAll] = useState(false);
  const [finding, setFinding] = useState(false);
  const findEmails = async () => {
    setFinding(true);
    await run("refine", async () => {
      // Eight at a time: their website first (free), then Prospeo.
      let found = 0, tried = 0;
      for (let round = 0; round < 2; round++) {
        const r = await call("find_emails", { brief_id: brief.id });
        found += r.found || 0; tried += r.tried || 0;
        await onLeads();
        if (!r.tried || r.tried < 8) break;
      }
      say(tried ? (found ? `Found ${found} email${found === 1 ? "" : "s"} for ${tried} people` : `No emails found for those ${tried} people`) : "Everyone here has been checked");
    });
    setFinding(false);
  };
  const sendAll = async () => {
    setConfirmAll(false);
    await run("draft", async () => {
      const r = await call("send", { lead_ids: ready.map((l) => l.id) });
      const failed = (r.results || []).filter((x: any) => !x.ok);
      say(`${r.sent} sent${failed.length ? `, ${failed.length} not sent: ${failed[0].why}` : ""}`);
      void refreshGmail();
    });
  };
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
          <>
          <Braino>
            <p>
              I read {brief.stats?.searched ?? "the"} results and found <b>{leads.length} people</b>. <b>{kept.length}</b> fit; I set {leads.length - kept.length} aside and say why.
              {brief.stats?.learned_from ? ` Ranked using ${brief.stats.learned_from} of your past wins.` : ""} The people I can reach are at the top. Click anyone to see why they are here and what to send.
            </p>
          </Braino>
          {/* The results step out of the chat column: a table this wide does not fit a message. */}
          <div className="oas-wide">
            <Funnel leads={leads} />
            <People leads={leads} openId={open} onOpen={setOpen} />
            <div className="oas-row" style={{ marginTop: 14 }}>
              <button type="button" className="oas-btn is-primary is-small" disabled={!!busy} onClick={() => void draftAll()}><Sparkles /> {busy === "draft" ? "Working…" : "Write messages for the top 12"}</button>
              <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void findEmails()}><Mail /> {busy === "refine" && finding ? "Finding emails…" : "Find emails"}</button>
              {ready.length > 0 && (gmail?.connected
                ? <button type="button" className="oas-btn is-small is-ink" disabled={!!busy} onClick={() => setConfirmAll(true)}><Send /> Email all {ready.length} with Gmail</button>
                : <button type="button" className="oas-btn is-small" onClick={() => void connectGmail()}><Mail /> Connect Gmail to send</button>)}
              <button type="button" className="oas-btn is-small" onClick={() => downloadLeads(brief, leads)}><Download /> Download for Excel</button>
              <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void hunt()}><Search /> Search again</button>
              {brief.stats?.cost_usd != null && <span className="oas-note">This search ≈ ${Number(brief.stats.cost_usd).toFixed(2)}</span>}
            </div>
          </div>
          </>
        )}

        {confirmAll && (
          <Braino>
            <p>Send the first email to <b>{Math.min(ready.length, Math.max(0, (gmail?.cap_today ?? 10) - (gmail?.sent_today ?? 0)))}</b> people from <b>{gmail?.email}</b>? Today's limit is {gmail?.cap_today ?? 10}; anyone past it waits for tomorrow. Follow-ups are prepared but only go when you send them from the Inbox.</p>
            <div className="oas-row">
              <button type="button" className="oas-btn is-small is-primary" onClick={() => void sendAll()}><Send /> Yes, send</button>
              <button type="button" className="oas-btn is-small" onClick={() => setConfirmAll(false)}>Not yet</button>
            </div>
          </Braino>
        )}
        {busy === "refine" && <Braino><p>{finding ? "Looking for their emails: company sites, the web, and the company's own pattern…" : "Updating the profile…"}</p><Dots /></Braino>}
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
  return (
    <div className="oas-funnel">
      {stages.map(([k, v, goal], i) => (
        <div key={k} className={`oas-stage ${goal ? "is-goal" : ""}`}>
          <b>{v}</b><span>{k}</span>
          {i > 0 && stages[i - 1][1] ? <em className="oas-conv">{Math.round((v / stages[i - 1][1]) * 100)}%</em> : null}
        </div>
      ))}
    </div>
  );
}

/* How reachable someone is, best first. A person with a verified email is
   worth more today than a better fit we cannot reach. */
const TIERS = [
  { key: "email", label: "with an email" },
  { key: "inbox", label: "known format, guessed or company inbox" },
  { key: "phone", label: "phone or WhatsApp only" },
  { key: "linkedin", label: "LinkedIn only" },
  { key: "none", label: "no contact yet" },
] as const;
function tierOf(l: Lead) {
  const c = l.contacts || {};
  if (l.email && ["verified", "found"].includes(l.email_status)) return 0;
  if (l.email) return 1;
  if ((c.phones || []).length || (c.whatsapp || []).length) return 2;
  if (l.linkedin_url) return 3;
  return 4;
}

function ContactIcons({ l }: { l: Lead }) {
  const c = l.contacts || {};
  const phone = (c.phones || []).length > 0, wa = (c.whatsapp || []).length > 0;
  return (
    <span className="oas-ci">
      {l.email ? <span className={`oas-ci-mail s-${l.email_status}`} title={`${l.email} · ${l.email_source || l.email_status}`}><Mail size={12} />{EMAIL_TRUST[l.email_status] || "email"}</span> : null}
      {phone ? <span title={(c.phones || []).join(", ")}>☎</span> : null}
      {wa ? <span title={`WhatsApp ${(c.whatsapp || []).join(", ")}`}>WA</span> : null}
      {l.linkedin_url ? <span title="LinkedIn">in</span> : null}
      {!l.email && !phone && !wa && !l.linkedin_url ? <span className="oas-soft">none yet</span> : null}
    </span>
  );
}

function People({ leads, openId, onOpen }: { leads: Lead[]; openId: string; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<string>("ready");
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"reach" | "fit">("reach");
  const [tier, setTier] = useState<number | null>(null);
  const [view, setView] = useState<"table" | "board">(() => { try { return (localStorage.getItem("oas-view") as any) || "table"; } catch (_) { return "table"; } });
  useEffect(() => { try { localStorage.setItem("oas-view", view); } catch (_) { /* fine */ } }, [view]);
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "discarded" ? !l.discarded : (filter !== "all" && l.discarded)) return false;
      if (filter === "ready" && !["new", "drafted"].includes(l.status)) return false;
      if (["drafted", "sent", "replied", "booked"].includes(filter) && l.status !== filter) return false;
      if (l.score < minScore) return false;
      if (needle && !`${l.name} ${l.title} ${l.company} ${l.industry} ${l.location} ${l.email}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [leads, filter, q, minScore]);
  const counts = useMemo(() => TIERS.map((_, k) => base.filter((l) => tierOf(l) === k).length), [base]);
  // The board shows every stage at once, so it ignores the status filter.
  const boardLeads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => !l.discarded && l.score >= minScore && (!needle || `${l.name} ${l.title} ${l.company} ${l.industry} ${l.location} ${l.email}`.toLowerCase().includes(needle)));
  }, [leads, q, minScore]);
  const shown = useMemo(() => {
    const list = tier === null ? base : base.filter((l) => tierOf(l) === tier);
    return [...list].sort((a, b) => (sort === "reach" ? tierOf(a) - tierOf(b) : 0) || b.score - a.score);
  }, [base, tier, sort]);
  return (
    <div className="oas-people">
      <div className="oas-reach">
        <b>{counts[0] + counts[1]}</b> of {base.length} have an email
        <span className="oas-reach-chips">
          {TIERS.map((t, k) => counts[k] ? (
            <button key={t.key} type="button" className={`oas-reach-chip t${k} ${tier === k ? "is-on" : ""}`} onClick={() => setTier(tier === k ? null : k)}>{counts[k]} {t.label}</button>
          ) : null)}
        </span>
      </div>
      <div className="oas-tools">
        <div className="oas-seg" role="tablist">{FILTERS.map(([k, label]) => <button key={k} type="button" className={filter === k ? "is-on" : ""} onClick={() => setFilter(k)}>{label}</button>)}</div>
        <div className="oas-seg" aria-label="View">
          <button type="button" className={view === "table" ? "is-on" : ""} onClick={() => setView("table")} title="Table"><Rows3 size={14} /></button>
          <button type="button" className={view === "board" ? "is-on" : ""} onClick={() => setView("board")} title="Pipeline board"><LayoutGrid size={14} /></button>
        </div>
        <div className="oas-seg" aria-label="Sort">
          <button type="button" className={sort === "reach" ? "is-on" : ""} onClick={() => setSort("reach")}>Most reachable</button>
          <button type="button" className={sort === "fit" ? "is-on" : ""} onClick={() => setSort("fit")}>Best fit</button>
        </div>
        <input className="oas-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, place" />
        <label className="oas-range">Score ≥ {minScore}<input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /></label>
      </div>
      {view === "board" ? <Board leads={boardLeads} onOpen={onOpen} openId={openId} /> : shown.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="oas-table">
            <thead><tr><th>#</th><th>Person</th><th>Company</th><th>Contact</th><th>Score</th><th className="oas-why-h">Why</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((l, i) => (
                <tr key={l.id} className={`${l.id === openId ? "is-on" : ""} ${l.discarded ? "is-out" : ""} ${sort === "reach" && i > 0 && tierOf(shown[i - 1]) !== tierOf(l) ? "oas-tier-break" : ""}`} onClick={() => onOpen(l.id)}>
                  <td className="oas-rank">{i + 1}</td>
                  <td className="oas-person"><div className="oas-who"><Avatar name={l.name} src={l.photo_url} /><div><b>{l.name}</b><small>{l.title}</small></div></div></td>
                  <td className="oas-co"><b>{l.company}</b><small>{[l.industry, l.location].filter(Boolean).join(" · ")}</small></td>
                  <td><ContactIcons l={l} /></td>
                  <td className="oas-score"><ScoreRing score={l.score} size={38} /></td>
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
  const initial = () => {
    const m = lead.message || {};
    const variants: Record<string, Variant> = { ...(m.variants || {}) };
    const ch = m.channel || (lead.email ? "email" : "linkedin");
    if (m.body && !variants[ch]) variants[ch] = { subject: m.subject || "", body: m.body, followups: m.followups || [] };
    // Older drafts carried the instruction label into the text ("day 3: …").
    for (const k of Object.keys(variants)) variants[k] = { ...variants[k], followups: (variants[k].followups || []).map((f) => String(f).replace(/^\s*(?:day\s*\d+|follow[- ]?up\s*\d*)\s*[:,.-]\s*/i, "")) };
    return { channel: ch, variants };
  };
  const [state, setState] = useState(initial);
  const cur: Variant = state.variants[state.channel] || { subject: "", body: "", followups: [] };
  const msg = { channel: state.channel, subject: cur.subject || "", body: cur.body || "", followups: cur.followups || [], variants: state.variants };
  const setMsg = (next: { channel: string; subject: string; body: string; followups: string[] }) => setState((s) => (
    next.channel !== s.channel ? { ...s, channel: next.channel }
      : { ...s, variants: { ...s.variants, [s.channel]: { subject: next.subject, body: next.body, followups: next.followups } } }));
  const [busy, setBusy] = useState("");
  useEffect(() => {
    setState(initial());
  }, [lead.id, lead.message?.body]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const dirty = JSON.stringify(state.variants) !== JSON.stringify(initial().variants);
  const hasAny = Object.values(state.variants).some((v) => v?.body);
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
  const gmail = useGmail();
  const sendNow = async () => {
    if (dirty) await call("edit", { lead_id: lead.id, message: msg }).catch(() => null);
    await act("send", async () => {
      const r = await call("send", { lead_ids: [lead.id] });
      const res = (r.results || [])[0];
      if (!res?.ok) throw new Error(res?.why || "Not sent.");
      void refreshGmail();
    }, `Sent to ${lead.name.split(" ")[0]} from ${gmail?.email || "Gmail"}`);
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
              {lead.email
                ? <span className={`oas-link oas-mail s-${lead.email_status}`} title={lead.email_source || lead.email_status}><Mail /> {lead.email}<em>{EMAIL_TRUST[lead.email_status] || ""}</em></span>
                : <button type="button" className="oas-link" onClick={() => void act("find", () => call("find_emails", { lead_ids: [lead.id] }).then((r) => { if (!r.found) throw new Error("No email found for them yet"); }), "Email found")}><Mail /> {busy === "find" ? "Looking…" : "Find email"}</button>}
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
            {lead.email_source && lead.email ? <p className="oas-note" style={{ margin: "0 28px", paddingTop: 14 }}>Email: {lead.email_source}</p> : null}
            {(() => {
              const c = lead.contacts || {};
              const any = (c.emails || []).length || (c.phones || []).length || (c.whatsapp || []).length || (c.instagram || []).length;
              if (!any) return null;
              return (
                <section className="oas-dsec">
                  <h5>From their website{c.domain ? ` · ${c.domain}` : ""}</h5>
                  <div className="oas-links">
                    {(c.emails || []).map((e) => <a key={e} className="oas-link" href={`mailto:${e}`}><Mail /> {e}</a>)}
                    {(c.phones || []).map((p) => <a key={p} className="oas-link" href={`tel:${p}`}>☎ {p}</a>)}
                    {(c.whatsapp || []).map((w) => <a key={w} className="oas-link" href={`https://wa.me/${w}`} target="_blank" rel="noreferrer">WhatsApp {w} <ArrowUpRight /></a>)}
                    {(c.instagram || []).map((h) => <a key={h} className="oas-link" href={`https://instagram.com/${h}`} target="_blank" rel="noreferrer">@{h} <ArrowUpRight /></a>)}
                  </div>
                </section>
              );
            })()}
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
              {!hasAny ? (
                <button type="button" className="oas-btn is-primary" disabled={!!busy || lead.discarded} onClick={() => void draftOne()}><Sparkles /> {busy === "draft" ? "Writing…" : "Write it"}</button>
              ) : (
                <>
                  <div className="oas-chan" role="tablist" aria-label="Channel">
                    {Object.keys(CHANNEL_LABEL).map((c) => (
                      <button key={c} type="button" role="tab" aria-selected={msg.channel === c}
                        className={`${msg.channel === c ? "is-on" : ""} ${state.variants[c]?.body ? "" : "is-empty"}`}
                        onClick={() => setMsg({ ...msg, channel: c })}>{CHANNEL_LABEL[c]}{c === (lead.message?.channel || "") ? <i title="Best channel for them" /> : null}</button>
                    ))}
                  </div>
                  {!msg.body && <p className="oas-note">No {CHANNEL_LABEL[msg.channel]} version yet. Press Rewrite to write all five.</p>}
                  {msg.channel === "email" && <><label>Subject</label><input value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} /></>}
                  <label>Message</label>
                  <textarea value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
                  {msg.followups.map((f, i) => (
                    <div key={i}><label>Follow-up {i + 1} · day {i === 0 ? 3 : 7}</label>
                      <textarea className="is-follow" value={f} onChange={(e) => setMsg({ ...msg, followups: msg.followups.map((x, j) => (j === i ? e.target.value : x)) })} /></div>
                  ))}
                  <div className="oas-row">
                    {msg.channel === "email" && lead.email && !["sent", "replied", "booked", "opted_out"].includes(lead.status) && (gmail?.connected
                      ? <button type="button" className="oas-btn is-primary is-small" disabled={!!busy} onClick={() => void sendNow()}><Send /> {busy === "send" ? "Sending…" : "Send with Gmail"}</button>
                      : <button type="button" className="oas-btn is-primary is-small" onClick={() => void connectGmail()}><Mail /> Connect Gmail to send</button>)}
                    {msg.channel === "email" && lead.email && <button type="button" className="oas-btn is-small" onClick={() => void openGmail()}>Open in Gmail</button>}
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

/* ── What you sell: the product report every search and message reads ── */

const TEXT_FILES = ".txt,.md,.markdown,.csv,.json,.html,.htm,.rtf";

function ProductView({ product, onSaved, say }: { product: Product | null; onSaved: (p: Product) => void; say: (t: string) => void }) {
  const [name, setName] = useState(product?.name || "");
  const [website, setWebsite] = useState(product?.website || "");
  const [notes, setNotes] = useState(product?.notes || "");
  const [docs, setDocs] = useState<{ name: string; text: string }[]>(product?.docs || []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const r = product?.report || {};
  const hasReport = Boolean(product && Object.keys(r).length);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: { name: string; text: string }[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      if (/\.pdf$/i.test(f.name)) { say("PDFs are not read yet: paste the text into the notes"); continue; }
      if (f.size > 2_000_000) { say(`${f.name} is too big`); continue; }
      try { next.push({ name: f.name, text: (await f.text()).slice(0, 30000) }); } catch (_) { say(`Could not read ${f.name}`); }
    }
    setDocs((d) => [...d, ...next].slice(0, 8));
  };
  const build = async (withAnswers = false) => {
    setBusy(true); setErr("");
    try {
      const extra = withAnswers ? (product?.questions || []).map((q) => ({ q, a: answers[q] || "" })).filter((a) => a.a.trim()) : [];
      const res = await call("product_build", {
        product_id: product?.id, name, website, notes, docs,
        ...(withAnswers ? { answers: [...(product?.answers || []), ...extra] } : {}),
      });
      say(withAnswers ? "Report updated" : "Report written");
      setAnswers({});
      onSaved(res.product);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const list = (xs: any) => (Array.isArray(xs) ? xs : []).filter(Boolean);

  return (
    <div className="oas-thread oas-product">
      <div>
        <div className="oas-kicker">What you sell</div>
        <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 6px" }}>{hasReport ? (r.name || name) : "Tell Braino what you sell"}</h1>
        <p className="oas-soft" style={{ margin: 0, fontFamily: "var(--o-serif)", fontSize: 18 }}>
          {hasReport ? r.one_liner : "He reads your website, your notes and documents, and writes a detailed report. Every search and every message uses it."}
        </p>
      </div>

      <div className="oas-form">
        <div className="oas-form-row">
          <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Braino" /></label>
          <label><span>Website</span><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="trybraino.com" /></label>
        </div>
        <label><span>Anything the website does not say</span>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who buys it, pricing, traction, what makes it different, what you never want to claim…" /></label>
        <div className="oas-files">
          <label className="oas-pill is-add" style={{ cursor: "pointer" }}><Plus size={13} /> Add documents
            <input type="file" multiple accept={TEXT_FILES} style={{ display: "none" }} onChange={(e) => { void addFiles(e.target.files); e.currentTarget.value = ""; }} /></label>
          {docs.map((d, i) => <span key={`${d.name}-${i}`} className="oas-pill is-file">{d.name}<button type="button" aria-label={`Remove ${d.name}`} onClick={() => setDocs((x) => x.filter((_, j) => j !== i))}><X size={12} /></button></span>)}
          <span className="oas-note">Text files for now: .txt, .md, .csv, .html</span>
        </div>
        <div className="oas-row">
          <button type="button" className="oas-btn is-primary" disabled={busy || (!website.trim() && !notes.trim() && !docs.length)} onClick={() => void build(false)}>
            <Sparkles /> {busy ? "Reading everything…" : hasReport ? "Read it again" : "Read it and write the report"}
          </button>
          {err && <span className="oas-err" style={{ margin: 0 }}>{err}</span>}
        </div>
      </div>

      {busy && <Braino><p>Reading your website and everything you gave me…</p><Dots /></Braino>}

      {hasReport && !busy && (
        <>
          {list(product?.questions).length > 0 && (
            <Braino>
              <p>A few things I could not find. Answers make every message sharper.</p>
              <div className="oas-asks">
                {list(product?.questions).map((q: string) => (
                  <label key={q}><span>{q}</span><input value={answers[q] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))} placeholder="Your answer" /></label>
                ))}
              </div>
              <button type="button" className="oas-btn is-small is-primary" disabled={busy || !Object.values(answers).some((a) => a.trim())} onClick={() => void build(true)}>Update the report</button>
            </Braino>
          )}
          <div className="oas-report">
            <ReportBlock title="What it is"><p>{r.what_it_is}</p></ReportBlock>
            <ReportBlock title="The problem it removes"><p>{r.problem}</p></ReportBlock>
            <ReportBlock title="Who it is for">{list(r.who_its_for).length ? <div className="oas-tags">{list(r.who_its_for).map((x: string) => <span key={x} className="oas-tag">{x}</span>)}</div> : null}</ReportBlock>
            <ReportBlock title="How it works">{list(r.how_it_works).length ? <ol>{list(r.how_it_works).map((x: string) => <li key={x}>{x}</li>)}</ol> : null}</ReportBlock>
            <ReportBlock title="Features">{list(r.features).length ? <dl>{list(r.features).map((f: any) => <div key={f.name}><dt>{f.name}</dt><dd>{f.detail}</dd></div>)}</dl> : null}</ReportBlock>
            <ReportBlock title="What changes for them">{list(r.outcomes).length ? <ul>{list(r.outcomes).map((x: string) => <li key={x}>{x}</li>)}</ul> : null}</ReportBlock>
            <ReportBlock title="Proof">{list(r.proof).length ? <ul>{list(r.proof).map((x: string) => <li key={x}>{x}</li>)}</ul> : <p className="oas-soft">None found. Messages will not claim any.</p>}</ReportBlock>
            <ReportBlock title="Why this over the alternatives">{list(r.differentiators).length ? <ul>{list(r.differentiators).map((x: string) => <li key={x}>{x}</li>)}</ul> : null}</ReportBlock>
            <ReportBlock title="Objections">{list(r.objections).length ? <dl>{list(r.objections).map((o: any) => <div key={o.objection}><dt>{o.objection}</dt><dd>{o.answer}</dd></div>)}</dl> : null}</ReportBlock>
            <ReportBlock title="Pricing and status"><p>{[r.pricing || "Pricing not stated", r.status ? `Status: ${r.status}` : ""].filter(Boolean).join(" · ")}</p></ReportBlock>
            <ReportBlock title="Voice"><p>{r.tone}</p>{list(r.words_to_avoid).length ? <p className="oas-soft">Never say: {list(r.words_to_avoid).join(", ")}</p> : null}</ReportBlock>
          </div>
        </>
      )}
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  if (!children || (Array.isArray(children) && !children.some(Boolean))) return null;
  return <section className="oas-rblock"><h5>{title}</h5><div>{children}</div></section>;
}

/* The product chip that sits beside send, like a model picker. */
function SellPicker({ ready, productId, setProductId, onAddProduct }: {
  ready: Product[]; productId: string; setProductId: (id: string) => void; onAddProduct: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [open]);
  const cur = ready.find((p) => p.id === productId);
  return (
    <div className="oas-picker" ref={ref}>
      <button type="button" className="oas-picker-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="oas-soft">Selling</span> {cur ? (cur.name || cur.report?.name) : "nothing yet"} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="oas-picker-menu" role="menu">
          {ready.map((p) => (
            <button key={p.id} type="button" role="menuitem" onClick={() => { setProductId(p.id); setOpen(false); }}>
              <span>{p.name || p.report?.name}</span>{p.id === productId ? <Check size={14} /> : null}
            </button>
          ))}
          {ready.length > 0 && (
            <button type="button" role="menuitem" onClick={() => { setProductId(""); setOpen(false); }}><span className="oas-soft">Describe it in the box instead</span>{!productId ? <Check size={14} /> : null}</button>
          )}
          <button type="button" role="menuitem" className="is-add" onClick={() => { setOpen(false); onAddProduct(); }}><Plus size={13} /> Add a product</button>
        </div>
      )}
    </div>
  );
}

/* ── The landing: an AffectiveOS launch post for the Outreach Engine ───
   Same grammar as /affectiveos: the Affective bar, one centred column in the
   company serif, the opening sentence as the headline, a square comparison
   table with our column lit, and the site's own light/dark switch. */

const VS: { row: string; sub: string; us: string; db: string; hand: string }[] = [
  { row: "Finds who to sell to", sub: "from one sentence", us: "Yes, you say who", db: "Filters you set by hand", hand: "Hours of searching" },
  { row: "Says why each person", sub: "is on the list", us: "Every pick, with reasons", db: "No", hand: "In your head" },
  { row: "Knows what you sell", sub: "in detail", us: "Reads your site and docs", db: "No", hand: "Yes" },
  { row: "Writes the message", sub: "for each channel", us: "Email, LinkedIn, WhatsApp, X, Instagram", db: "Templates", hand: "One at a time" },
  { row: "Gets better", sub: "with every reply", us: "Learns from booked calls", db: "No", hand: "Slowly" },
];

function OutreachLanding({ onOpen }: { onOpen: () => void }) {
  const { theme, toggle } = useAffTheme();
  useEffect(() => {
    document.title = "The Outreach Engine · Affective";
    const prev = document.body.style.background;
    document.body.style.background = theme === "dark" ? "#100f0c" : "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, [theme]);
  return (
    <div className="aff ao oas-ao" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective"><img src="/affective-logo.png" alt="Affective" width={1000} height={207} /></Link>
          <div className="aff-nav-links">
            <Link to="/braino">Braino</Link>
            <Link to="/affectiveos">AffectiveOS</Link>
            <button type="button" className="aff-nav-go oas-ao-skip" onClick={onOpen}>Skip to Outreach</button>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      <article className="ao-col">
        <p className="ao-date">October 17, 2026 · Engines · In testing</p>
        <h1 className="ao-title">
          Introducing the Outreach Engine. Tell Braino who you want to sell to, and he finds the people
          most likely to buy, tells you why he picked each one, and writes the first message for every
          channel. You press send.
        </h1>
        <div className="oas-ao-cta">
          <button type="button" className="oas-ao-btn is-ink" onClick={onOpen}>Open Outreach</button>
          <button type="button" className="oas-ao-btn" onClick={onOpen}>Skip</button>
        </div>

        <p>
          Outreach is the part of starting something that nobody likes. You know roughly who should want
          what you made, and then you lose an evening searching, guessing who is worth writing to, and
          rewriting the same message five ways. Most tools hand you a giant list and leave the guessing to you.
        </p>
        <p>
          <b>A short list, with its working shown.</b> You say it the way you would to a friend: founders of
          D2C skincare brands in India, hiring their first marketer. Braino turns that into a precise
          profile, asks what he needs to know, then searches people, companies and the news. Every person
          gets a score out of 100 built from four plain parts: how well they fit, whether something just
          happened for them, how easy they are to reach, and how much they look like the people who said
          yes to you before.
        </p>
        <p>
          <b>He knows what you sell.</b> Give him your website, your notes, your documents. He writes a
          detailed report of the product and asks about anything missing, so a message never claims
          proof you do not have, or a launch that has not happened.
        </p>
        <p>
          <b>One message per channel, not one message pasted five times.</b> Email, LinkedIn, WhatsApp,
          X and Instagram each get their own, built on that person's real moment.
        </p>
      </article>

      <section className="ao-wide">
        <div className="ao-table-wrap">
          <table className="ao-table">
            <thead><tr><th></th><th className="is-us">The Outreach Engine</th><th>A lead database</th><th>Doing it by hand</th></tr></thead>
            <tbody>
              {VS.map((r) => (
                <tr key={r.row}>
                  <td><b>{r.row}</b><span>{r.sub}</span></td>
                  <td className="is-us">{r.us}</td><td>{r.db}</td><td>{r.hand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ao-cap">Table 1. What changes when the search, the reasons and the writing are one step.</p>
      </section>

      <article className="ao-col">
        <h2>Three engines, one Braino</h2>
        <p>
          Braino Distra is three engines working together. <b>Content</b> makes what you publish, in your
          voice. <b>Optics</b> reads what is landing and what is not, and why. <b>Outreach</b> reaches the
          people who should buy. This is the third, and the first one you can use.
        </p>
      </article>

      <section className="ao-wide">
        <div className="oas-ao-trio">
          <div><small>Engine 01</small><h3>Content</h3><p>Writes and shapes what you publish, in your voice.</p><span>Coming</span></div>
          <div><small>Engine 02</small><h3>Optics</h3><p>Reads what is landing, what is not, and why.</p><span>Coming</span></div>
          <div className="is-here"><small>Engine 03</small><h3>Outreach</h3><p>Finds the right people, explains every pick, writes the first message.</p><span>Available in testing</span></div>
        </div>
      </section>

      <article className="ao-col oas-ao-end">
        <h2>The honest bit</h2>
        <p>
          It is early. It finds the people search engines can see, so not everyone comes with an email
          yet. It cannot promise calls; it finds the best fit people it can and shows its working.
          Nothing is ever sent without you, and anyone who opts out is never contacted again.
        </p>
        <div className="oas-ao-cta">
          <button type="button" className="oas-ao-btn is-ink" onClick={onOpen}>Open Outreach</button>
        </div>
      </article>
    </div>
  );
}

/* ── Inbox: everyone contacted, why, for what, and what came back ────────
   Grouped by what needs you: replies to answer and follow-ups that are due
   first, then people you are waiting on, then finished conversations. Every
   send here is a click; nothing goes on its own. */

type SendRow = { id: string; step: number; status: string; scheduled_for: string; sent_at?: string; subject: string; body: string };
type InboxItem = Lead & { search: string; product: string; sends: SendRow[]; reply_text?: string; reply_kind?: string; reply_draft?: string; replied_at?: string; contacted_at?: string };

const REPLY_LABEL: Record<string, string> = { interested: "Interested", question: "Has a question", not_now: "Not now", wrong_person: "Wrong person", unsubscribe: "Unsubscribed", other: "Replied" };
const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

function InboxView({ say }: { say: (t: string) => void }) {
  const gmail = useGmail();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [openId, setOpenId] = useState("");
  const [booking, setBooking] = useState("");
  const [fromName, setFromName] = useState("");

  const load = useCallback(async () => {
    const r = await call("inbox").catch(() => ({ items: [], settings: {} }));
    setItems(r.items || []); setSettings(r.settings || {}); setBooking(r.settings?.booking_url || ""); setFromName(r.settings?.from_name || ""); setLoaded(true);
  }, []);
  const check = useCallback(async (quiet = false) => {
    setChecking(true);
    try { const r = await call("sync"); if (!quiet) say(r.replies ? `${r.replies} new ${r.replies === 1 ? "reply" : "replies"}` : "No new replies"); }
    catch (e) { if (!quiet) say((e as Error).message); }
    finally { setChecking(false); await load(); }
  }, [load, say]);
  useEffect(() => { void load().then(() => check(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = Date.now();
  const dueOf = (it: InboxItem) => it.status === "sent" ? it.sends.find((x) => x.status === "queued" && Date.parse(x.scheduled_for) <= now) : undefined;
  const needs = items.filter((it) => (it.status === "replied" && it.reply_draft) || dueOf(it));
  const waiting = items.filter((it) => it.status === "sent" && !dueOf(it));
  const done = items.filter((it) => !needs.includes(it) && !waiting.includes(it));

  const saveSettings = async () => {
    const r = await call("settings", { booking_url: booking, from_name: fromName }).catch((e) => { say((e as Error).message); return null; });
    if (r) { setSettings(r.settings); say("Saved"); }
  };

  return (
    <div className="oas-thread oas-inbox">
      <div>
        <div className="oas-kicker">Inbox</div>
        <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 6px" }}>Everyone you have reached out to.</h1>
        <p className="oas-soft" style={{ margin: 0, fontFamily: "var(--o-serif)", fontSize: 18 }}>Who, why you picked them, what you sent, and what they said back. Nothing is sent without your click.</p>
      </div>

      <div className="oas-form oas-inbox-bar">
        <div className="oas-row" style={{ justifyContent: "space-between" }}>
          <span className="oas-gmail">
            <i className={gmail?.connected ? "is-on" : ""} />
            {gmail?.connected ? <>Sending from <b>{gmail.email}</b> · {Math.max(0, (gmail.cap_today ?? 10) - (gmail.sent_today ?? 0))} of {gmail.cap_today} left today</> : <>Gmail is not connected for sending</>}
          </span>
          <div className="oas-row">
            {!gmail?.connected && <button type="button" className="oas-btn is-small is-primary" onClick={() => void connectGmail()}><Mail /> Connect Gmail</button>}
            <button type="button" className="oas-btn is-small" disabled={checking} onClick={() => void check()}><RefreshCw /> {checking ? "Checking…" : "Check for replies"}</button>
          </div>
        </div>
        <div className="oas-form-row">
          <label><span>Your name on emails</span><input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Itish Pande" /></label>
          <label><span>Booking link, added when someone is interested</span><input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="https://calendar.app.google/…" /></label>
        </div>
        {(booking !== (settings.booking_url || "") || fromName !== (settings.from_name || "")) && <div><button type="button" className="oas-btn is-small is-ink" onClick={() => void saveSettings()}>Save</button></div>}
      </div>

      {!loaded ? <Braino><p>Opening your inbox…</p><Dots /></Braino> : !items.length ? (
        <div className="oas-empty">Nobody contacted yet. Open a search, write the messages, and press <b>Send with Gmail</b>.</div>
      ) : (
        <>
          <InboxGroup title="Needs you" items={needs} openId={openId} setOpenId={setOpenId} dueOf={dueOf} reload={load} say={say} />
          <InboxGroup title="Waiting on them" items={waiting} openId={openId} setOpenId={setOpenId} dueOf={dueOf} reload={load} say={say} />
          <InboxGroup title="Finished" items={done} openId={openId} setOpenId={setOpenId} dueOf={dueOf} reload={load} say={say} />
        </>
      )}
    </div>
  );
}

function InboxGroup({ title, items, openId, setOpenId, dueOf, reload, say }: {
  title: string; items: InboxItem[]; openId: string; setOpenId: (id: string) => void;
  dueOf: (it: InboxItem) => SendRow | undefined; reload: () => Promise<void>; say: (t: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="oas-ibox">
      <h5>{title} <span>{items.length}</span></h5>
      {items.map((it) => (
        <InboxRow key={it.id} it={it} open={openId === it.id} onToggle={() => setOpenId(openId === it.id ? "" : it.id)} due={dueOf(it)} reload={reload} say={say} />
      ))}
    </section>
  );
}

function InboxRow({ it, open, onToggle, due, reload, say }: { it: InboxItem; open: boolean; onToggle: () => void; due?: SendRow; reload: () => Promise<void>; say: (t: string) => void }) {
  const [draft, setDraft] = useState(it.reply_draft || "");
  const [fu, setFu] = useState(due?.body || "");
  const [busy, setBusy] = useState("");
  useEffect(() => { setDraft(it.reply_draft || ""); }, [it.reply_draft]);
  useEffect(() => { setFu(due?.body || ""); }, [due?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (label: string, fn: () => Promise<any>, done: string) => {
    setBusy(label);
    try { await fn(); say(done); void refreshGmail(); await reload(); }
    catch (e) { say((e as Error).message); }
    finally { setBusy(""); }
  };
  const nextQueued = it.sends.find((x) => x.status === "queued");
  const state = it.status === "replied" ? (REPLY_LABEL[it.reply_kind || "other"] || "Replied")
    : it.status === "sent" ? (due ? `Follow-up ${due.step} due` : nextQueued ? `Follow-up ${nextQueued.step} on ${when(nextQueued.scheduled_for)}` : "Waiting")
    : STATUS_LABEL[it.status] || it.status;
  const sent = it.sends.filter((x) => x.status === "sent").sort((a, b) => Date.parse(a.sent_at || a.scheduled_for) - Date.parse(b.sent_at || b.scheduled_for));

  return (
    <div className={`oas-irow ${open ? "is-open" : ""}`}>
      <button type="button" className="oas-irow-head" onClick={onToggle} aria-expanded={open}>
        <Avatar name={it.name} src={it.photo_url} />
        <span className="oas-irow-who"><b>{it.name}</b><small>{[it.title, it.company].filter(Boolean).join(" at ")}</small></span>
        <span className="oas-irow-for"><small>For</small>{it.product || "—"}<small className="oas-soft"> · {it.search}</small></span>
        <span className={`oas-status s-${it.status} ${it.reply_kind === "interested" ? "s-booked" : ""}`}>{state}</span>
        <span className="oas-irow-when">{when(it.replied_at || it.contacted_at)}</span>
      </button>
      {open && (
        <div className="oas-irow-body">
          <div className="oas-irow-why"><h5>Why you picked them</h5><ul className="oas-reasons">{(it.reasons || []).slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div className="oas-convo">
            {sent.map((x) => (
              <div key={x.id} className="oas-msgb is-you"><small>You · {x.step === 0 ? "First email" : x.step === 9 ? "Reply" : `Follow-up ${x.step}`} · {when(x.sent_at)}</small><p>{x.body}</p></div>
            ))}
            {it.reply_text && <div className="oas-msgb is-them"><small>{it.name.split(" ")[0]} · {when(it.replied_at)}</small><p>{it.reply_text}</p></div>}
            {it.status === "replied" && it.reply_draft !== undefined && (draft || it.reply_draft) ? (
              <div className="oas-msgb is-draft">
                <small>Braino's suggested answer · edit, then send</small>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="oas-row">
                  <button type="button" className="oas-btn is-small is-primary" disabled={!!busy || !draft.trim()} onClick={() => void act("reply", () => call("reply_send", { lead_id: it.id, body: draft }), "Reply sent")}><Send /> {busy === "reply" ? "Sending…" : "Send reply"}</button>
                  <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void act("booked", () => call("outcome", { lead_id: it.id, kind: "booked" }), "Call booked. Braino learns from this one.")}>Booked a call</button>
                </div>
              </div>
            ) : null}
            {due && (
              <div className="oas-msgb is-draft">
                <small>Follow-up {due.step} is due · it only goes when you send it</small>
                <textarea value={fu} onChange={(e) => setFu(e.target.value)} />
                <div className="oas-row">
                  <button type="button" className="oas-btn is-small is-primary" disabled={!!busy || !fu.trim()} onClick={() => void act("fu", () => call("send_followup", { send_id: due.id, body: fu }), "Follow-up sent")}><Send /> {busy === "fu" ? "Sending…" : "Send follow-up"}</button>
                  <button type="button" className="oas-btn is-small" disabled={!!busy} onClick={() => void act("stop", () => call("outcome", { lead_id: it.id, kind: "not_interested" }), "Stopped. No more follow-ups.")}>Stop here</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Download: everything a search found, as a sheet Excel opens ─────────
   A CSV with a byte-order mark, so Excel and Google Sheets read the Indian
   and accented names correctly. One row per person, best reachable first. */
function downloadLeads(brief: Brief, leads: Lead[]) {
  const cols: [string, (l: Lead, i: number) => unknown][] = [
    ["Rank", (_l, i) => i + 1], ["Name", (l) => l.name], ["Title", (l) => l.title], ["Company", (l) => l.company],
    ["Website", (l) => l.website || (l.company_domain ? `https://${l.company_domain}` : "")], ["Industry", (l) => l.industry],
    ["Company size", (l) => l.company_size], ["Location", (l) => l.location],
    ["Email", (l) => l.email], ["Email trust", (l) => (l.email ? EMAIL_TRUST[l.email_status] || l.email_status : "")], ["How the email was found", (l) => l.email_source || ""],
    ["Phones (website)", (l) => (l.contacts?.phones || []).join(" ")], ["WhatsApp (website)", (l) => (l.contacts?.whatsapp || []).join(" ")],
    ["Other emails (website)", (l) => (l.contacts?.emails || []).filter((e) => e !== l.email).join(" ")], ["Instagram", (l) => (l.contacts?.instagram || []).map((h) => `@${h}`).join(" ")],
    ["LinkedIn", (l) => l.linkedin_url], ["Score", (l) => l.score],
    ["Fit", (l) => Math.round((Number(l.score_parts?.fit) || 0) * 100)], ["Timing", (l) => Math.round((Number(l.score_parts?.timing) || 0) * 100)], ["Reachable", (l) => Math.round((Number(l.score_parts?.reach) || 0) * 100)],
    ["Why picked", (l) => (l.discarded ? `Set aside: ${l.discard_reason}` : (l.reasons || []).join(" | "))],
    ["Signals", (l) => (l.signals || []).map((x) => `${x.text}${x.date ? ` (${x.date})` : ""}`).join(" | ")],
    ["Status", (l) => (l.discarded ? "Set aside" : STATUS_LABEL[l.status] || l.status)], ["Best channel", (l) => CHANNEL_LABEL[l.message?.channel || ""] || ""],
    ["Email subject", (l) => l.message?.variants?.email?.subject || ""], ["Email message", (l) => l.message?.variants?.email?.body || ""],
    ["LinkedIn note", (l) => l.message?.variants?.linkedin?.body || ""], ["WhatsApp message", (l) => l.message?.variants?.whatsapp?.body || ""],
    ["X message", (l) => l.message?.variants?.x?.body || ""], ["Instagram message", (l) => l.message?.variants?.instagram?.body || ""],
  ];
  const rows = [...leads].sort((a, b) => Number(a.discarded) - Number(b.discarded) || tierOf(a) - tierOf(b) || b.score - a.score);
  const cell = (v: unknown) => { const t = String(v ?? ""); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = [cols.map(([h]) => cell(h)).join(","), ...rows.map((l, i) => cols.map(([, f]) => cell(f(l, i))).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(brief.title || "outreach").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ── Your voice: how you write, learnt once, used by every channel writer ── */
function VoiceView({ say }: { say: (t: string) => void }) {
  const gmail = useGmail();
  const [voice, setVoice] = useState<any>(null);
  const [pasted, setPasted] = useState("");
  const [self, setSelf] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { void call("voice_get").then((r) => { setVoice(r?.voice || null); setSelf(r?.voice?.self_described || ""); }).catch(() => {}); }, []);
  const build = async (importGmail: boolean) => {
    setBusy(importGmail ? "gmail" : "build"); setErr("");
    try {
      const r = await call("voice_build", { pasted, self_described: self, import_gmail: importGmail });
      setVoice(r.voice); setPasted(""); say("Your voice is learnt. Every channel writer uses it now.");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(""); }
  };
  const p = voice?.profile || {};
  const has = Object.keys(p).length > 0;
  const n = (voice?.samples || []).length;
  const list = (xs: any) => (Array.isArray(xs) ? xs.filter(Boolean) : []);
  return (
    <div className="oas-thread oas-product">
      <div>
        <div className="oas-kicker">Your voice</div>
        <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 6px" }}>{has ? "This is how you write." : "Teach Braino how you write."}</h1>
        <p className="oas-soft" style={{ margin: 0, fontFamily: "var(--o-serif)", fontSize: 18 }}>
          {has ? p.summary : "Every message and every post is written as you, on every platform. Give him a few things you have written, or let him read your sent emails."}
        </p>
      </div>
      <div className="oas-form">
        <label><span>Paste things you have written: emails, LinkedIn posts, WhatsApp messages. Separate pieces with a blank line or ---</span>
          <textarea rows={7} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Hey Rohan, saw your launch yesterday…\n---\nHonestly the hardest part of building Braino was…"} /></label>
        <label><span>In your own words, how do you sound? (optional, and it wins over everything else)</span>
          <textarea rows={2} value={self} onChange={(e) => setSelf(e.target.value)} placeholder="Direct, a bit funny, short sentences, Hinglish with friends, never salesy" /></label>
        <div className="oas-row">
          <button type="button" className="oas-btn is-primary" disabled={!!busy || (!pasted.trim() && !self.trim() && !n)} onClick={() => void build(false)}><Sparkles /> {busy === "build" ? "Learning…" : has ? "Learn again" : "Learn my voice"}</button>
          {gmail?.connected
            ? <button type="button" className="oas-btn" disabled={!!busy} onClick={() => void build(true)}><Mail /> {busy === "gmail" ? "Reading your sent emails…" : "Learn from my sent emails"}</button>
            : <button type="button" className="oas-btn" onClick={() => void connectGmail()}><Mail /> Connect Gmail to learn from sent emails</button>}
          {n ? <span className="oas-note">Learnt from {n} piece{n === 1 ? "" : "s"} of your writing</span> : null}
        </div>
        {err && <div className="oas-err">{err}</div>}
      </div>
      {busy && <Braino><p>Reading how you write: openers, rhythm, the words you always use…</p><Dots /></Braino>}
      {has && !busy && (
        <div className="oas-report">
          <ReportBlock title="Formality"><p>{p.formality}</p></ReportBlock>
          <ReportBlock title="Sentences"><p>{p.sentence_shape}</p></ReportBlock>
          <ReportBlock title="How you open">{list(p.openers).length ? <div className="oas-tags">{list(p.openers).map((x: string) => <span key={x} className="oas-tag">{x}</span>)}</div> : null}</ReportBlock>
          <ReportBlock title="How you sign off">{list(p.sign_offs).length ? <div className="oas-tags">{list(p.sign_offs).map((x: string) => <span key={x} className="oas-tag">{x}</span>)}</div> : null}</ReportBlock>
          <ReportBlock title="Your words">{list(p.signature_phrases).length ? <div className="oas-tags">{list(p.signature_phrases).map((x: string) => <span key={x} className="oas-tag is-accent">{x}</span>)}</div> : null}</ReportBlock>
          <ReportBlock title="Language"><p>{p.language_mix}</p></ReportBlock>
          <ReportBlock title="Habits"><p>{p.punctuation}</p></ReportBlock>
          <ReportBlock title="You never">{list(p.never).length ? <ul>{list(p.never).map((x: string) => <li key={x}>{x}</li>)}</ul> : null}</ReportBlock>
          <ReportBlock title="Unmistakably you">{list(p.examples).length ? <ul>{list(p.examples).map((x: string) => <li key={x}>“{x}”</li>)}</ul> : null}</ReportBlock>
        </div>
      )}
    </div>
  );
}

/* ── Pipeline board: the same people, as cards moving left to right ────── */
const BOARD: { key: string; label: string; match: (l: Lead) => boolean }[] = [
  { key: "reach", label: "Ready to write", match: (l) => l.status === "new" && !l.discarded },
  { key: "drafted", label: "Ready to send", match: (l) => l.status === "drafted" && !l.discarded },
  { key: "sent", label: "Sent, waiting", match: (l) => l.status === "sent" },
  { key: "replied", label: "Replied", match: (l) => l.status === "replied" },
  { key: "booked", label: "Call booked", match: (l) => l.status === "booked" },
];
function Board({ leads, onOpen, openId }: { leads: Lead[]; onOpen: (id: string) => void; openId: string }) {
  return (
    <div className="oas-board">
      {BOARD.map((col) => {
        const items = leads.filter(col.match).sort((a, b) => tierOf(a) - tierOf(b) || b.score - a.score);
        return (
          <div key={col.key} className={`oas-col c-${col.key}`}>
            <div className="oas-col-head"><span>{col.label}</span><b>{items.length}</b></div>
            <div className="oas-col-body">
              {items.map((l) => (
                <button key={l.id} type="button" className={`oas-card ${openId === l.id ? "is-on" : ""}`} onClick={() => onOpen(l.id)}>
                  <div className="oas-card-top"><Avatar name={l.name} src={l.photo_url} size={30} /><div><b>{l.name}</b><small>{l.company}</small></div><ScoreRing score={l.score} size={32} /></div>
                  <p>{l.status === "replied" && l.reply_kind ? `“${String((l as any).reply_text || "").slice(0, 90)}”` : (l.reasons || [])[0] || l.summary}</p>
                  <ContactIcons l={l} />
                </button>
              ))}
              {!items.length && <div className="oas-col-empty">Nobody here yet</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── What we are looking for ─────────────────────────────────────────── */
type Target = "people" | "companies" | "local";
const TARGETS: Record<Target, { label: string; icon: typeof Users; example: string; note: string }> = {
  people: { label: "People", icon: Users, example: "Who do we want to sell to? e.g. founders of D2C skincare brands in India", note: "Decision makers, with their reasons and emails" },
  companies: { label: "Companies", icon: Building2, example: "Which companies? e.g. logistics startups in the US that raised a Series A", note: "Organisations, their sites and contacts" },
  local: { label: "Local businesses", icon: Store, example: "Which businesses, and where? e.g. cafés in Indiranagar, Bangalore without a website", note: "Shops near a place, from the map" },
};
function TargetPicker({ target, setTarget }: { target: Target; setTarget: (t: Target) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [open]);
  const T = TARGETS[target];
  return (
    <div className="oas-picker" ref={ref}>
      <button type="button" className="oas-picker-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><T.icon size={14} /> {T.label} <ChevronDown size={13} /></button>
      {open && (
        <div className="oas-picker-menu" role="menu">
          {(Object.keys(TARGETS) as Target[]).map((k) => { const X = TARGETS[k]; return (
            <button key={k} type="button" role="menuitem" onClick={() => { setTarget(k); setOpen(false); }}>
              <span className="oas-pick-row"><X.icon size={15} /><span><b>{X.label}</b><small>{X.note}</small></span></span>{k === target ? <Check size={14} /> : null}
            </button>
          ); })}
        </div>
      )}
    </div>
  );
}

/* Local businesses from OpenStreetMap, read in the browser. Same listing text
   the engine expects; Google Places takes over once a Maps key is set. */
async function localFindsInBrowser(icp: any) {
  const loc = icp?.local || {};
  const place = String(loc.place || (icp?.locations || [])[0] || "").trim();
  if (!place) return [];
  const g = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(place)}`).then((r) => r.json()).catch(() => null);
  const c = g?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(c)) return [];
  const [lon, lat] = c;
  const radius = Math.max(500, Math.min(15000, Math.round((Number(loc.radius_km) || 3) * 1000)));
  const tags = (Array.isArray(loc.osm_tags) ? loc.osm_tags : []).map(String).filter((t: string) => /^[a-z_:]+=[\w*|-]+$/i.test(t)).slice(0, 6);
  if (!tags.length) return [];
  // One statement per key (amenity cafe|restaurant together), which the free
  // servers answer; one statement per tag times two was too heavy for them.
  const byKey = new Map<string, string[]>();
  for (const t of tags) { const [k, v] = t.split("="); byKey.set(k, [...(byKey.get(k) || []), v]); }
  const sel = [...byKey].map(([k, vs]) => (vs.includes("*") ? `nwr["${k}"](around:${radius},${lat},${lon});` : `nwr["${k}"~"^(${vs.join("|")})$"](around:${radius},${lat},${lon});`)).join("");
  const q = `[out:json][timeout:45];(${sel});out tags center 200;`;
  // Every mirror at once; the first good answer wins.
  const hosts = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  const d: any = await Promise.any(hosts.map(async (host) => {
    const r = await fetch(host, { method: "POST", body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(55000) });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    if (!Array.isArray(j?.elements)) throw new Error("bad");
    return j;
  })).catch(() => null);
  const els = (d?.elements || []).filter((e: any) => e?.tags?.name);
  els.sort((a: any, b: any) => Number(Boolean(b.tags.phone || b.tags["contact:phone"])) - Number(Boolean(a.tags.phone || a.tags["contact:phone"])));
  return els.slice(0, 90).map((e: any) => {
    const t = e.tags;
    const site = t.website || t["contact:website"] || "";
    const phone = t.phone || t["contact:phone"] || "";
    const addr = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] || t["addr:neighbourhood"], t["addr:city"]].filter(Boolean).join(", ");
    const kind = t.amenity || t.shop || t.office || t.craft || t.leisure || t.healthcare || "";
    return {
      url: site || `https://www.openstreetmap.org/${e.type}/${e.id}`,
      title: `${t.name} (${kind})`,
      text: `Business: ${t.name}; kind: ${kind}; ${t.cuisine ? `cuisine: ${t.cuisine}; ` : ""}address: ${addr || place}; phone: ${phone || "none listed"}; website: ${site || "NONE LISTED"}; instagram: ${t["contact:instagram"] || "-"}; opening hours: ${t.opening_hours || "-"}`.slice(0, 600),
    };
  });
}

/* ── What you sell: your products as cards, opened on the right ───────── */
function ProductsView({ products, onOpen }: { products: Product[]; onOpen: (id: string) => void }) {
  return (
    <div className="oas-thread oas-product">
      <div>
        <div className="oas-kicker">What you sell</div>
        <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 6px" }}>Your products.</h1>
        <p className="oas-soft" style={{ margin: 0, fontFamily: "var(--o-serif)", fontSize: 18 }}>Every search and every message reads these, so Braino never has to guess what you sell.</p>
      </div>
      <div className="oas-pgrid">
        {products.map((p) => (
          <button key={p.id} type="button" className="oas-pcard" onClick={() => onOpen(p.id)}>
            <span className="oas-pcard-mark">{(p.name || p.report?.name || "?").slice(0, 1).toUpperCase()}</span>
            <b>{p.name || p.report?.name || "Untitled"}</b>
            <p>{p.report?.one_liner || "No report yet."}</p>
            <span className="oas-pcard-meta">
              <span className={`oas-dot-s ${p.status === "ready" ? "is-ok" : ""}`} />{p.status === "ready" ? "Report ready" : p.status === "reading" ? "Reading…" : "Needs details"}
              {p.website ? <> · {p.website.replace(/^https?:\/\//, "")}</> : null}
              {(p.questions || []).length ? <> · {p.questions.length} open questions</> : null}
            </span>
          </button>
        ))}
        <button type="button" className="oas-pcard is-add" onClick={() => onOpen("new")}><Plus size={22} /><b>Add a product</b><p>Give a website, some notes or a document. Braino writes the report.</p></button>
      </div>
    </div>
  );
}

/* ── Settings ─────────────────────────────────────────────────────────── */
function SettingsView({ say, sources, theme, setTheme }: { say: (t: string) => void; sources: Record<string, boolean>; theme: string; setTheme: (t: any) => void }) {
  const gmail = useGmail();
  const [s, setS] = useState<any>(null);
  const [name, setName] = useState(""); const [booking, setBooking] = useState(""); const [cap, setCap] = useState(20);
  useEffect(() => { void call("gmail_status").then((r) => { const x = r?.settings || {}; setS(x); setName(x.from_name || ""); setBooking(x.booking_url || ""); setCap(x.daily_cap || 20); }).catch(() => {}); }, []);
  const save = async () => {
    const r = await call("settings", { from_name: name, booking_url: booking, daily_cap: cap }).catch((e) => { say((e as Error).message); return null; });
    if (r) { setS(r.settings); say("Settings saved"); void refreshGmail(); }
  };
  const dirty = s && (name !== (s.from_name || "") || booking !== (s.booking_url || "") || cap !== (s.daily_cap || 20));
  const srcs: [string, string, string][] = [["exa", "Exa", "Finds people, companies and news"], ["model", "AI model", "Reads, ranks and writes"], ["apollo", "Apollo", "People database (key not set)"], ["hunter", "Hunter", "Email finder (key not set)"]];
  return (
    <div className="oas-thread oas-product">
      <div>
        <div className="oas-kicker">Settings</div>
        <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 6px" }}>How Outreach works for you.</h1>
      </div>
      <section className="oas-set">
        <h5>Sending</h5>
        <div className="oas-set-row"><span><b>Gmail</b><small>{gmail?.connected ? `Sending from ${gmail.email}` : "Not connected for sending"}</small></span>
          {gmail?.connected ? <span className="oas-pill is-on">Connected</span> : <button type="button" className="oas-btn is-small is-primary" onClick={() => void connectGmail()}><Mail /> Connect Gmail</button>}</div>
        <div className="oas-set-row"><span><b>Your name on emails</b><small>How you sign off and what people see</small></span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Itish Pande" /></div>
        <div className="oas-set-row"><span><b>Booking link</b><small>Added to answers when someone is interested</small></span><input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="https://calendar.app.google/…" /></div>
        <div className="oas-set-row"><span><b>Daily limit</b><small>Starts at 10 and rises 5 a day up to this, so Gmail stays healthy. Today: {gmail?.cap_today ?? 10}</small></span><input type="number" min={1} max={100} value={cap} onChange={(e) => setCap(Number(e.target.value) || 20)} style={{ width: 90 }} /></div>
        {dirty && <div style={{ padding: "12px 18px" }}><button type="button" className="oas-btn is-small is-ink" onClick={() => void save()}>Save changes</button></div>}
      </section>
      <section className="oas-set">
        <h5>Data sources</h5>
        {srcs.map(([k, label, note]) => (
          <div key={k} className="oas-set-row"><span><b>{label}</b><small>{note}</small></span><span className={`oas-pill ${sources[k] ? "is-on" : ""}`}>{sources[k] ? "On" : "Off"}</span></div>
        ))}
        <div className="oas-set-row"><span><b>Prospeo</b><small>Verified emails, about 1 cent each, only when found</small></span><span className="oas-pill is-on">On</span></div>
        <div className="oas-set-row"><span><b>Local businesses</b><small>OpenStreetMap now. Add a Google Maps key for phones, ratings and reviews.</small></span><span className="oas-pill">Free map</span></div>
      </section>
      <section className="oas-set">
        <h5>Appearance</h5>
        <div className="oas-set-row"><span><b>Theme</b><small>Follow your Mac, or pick one</small></span>
          <div className="oas-seg">{[["", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => <button key={k} type="button" className={theme === k ? "is-on" : ""} onClick={() => setTheme(k)}>{l}</button>)}</div></div>
      </section>
    </div>
  );
}

/* ── Home: everything that has happened so far ───────────────────────── */
function HomeView({ name, overview, briefsCount, onNew, onOpenSearch, onOpenInbox, onChanged, say }: {
  name: string; overview: Overview | null; briefsCount: number; onNew: () => void; onOpenSearch: (id: string) => void; onOpenInbox: () => void;
  onChanged: () => Promise<void>; say: (t: string) => void;
}) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name ? name.replace(/[^a-z]/gi, " ").trim().split(/\s+/)[0] : "";
  const who = first ? first[0].toUpperCase() + first.slice(1).replace(/\d+$/, "") : "";
  const t = overview?.totals;
  const line = !t || !t.people
    ? "Nothing yet. Start a search and everything you find, send and hear back lands here."
    : `You have found ${t.people} people across ${briefsCount} search${briefsCount === 1 ? "" : "es"}, can email ${t.with_email} of them, sent ${t.sent}, and heard back from ${t.replied}.${t.booked ? ` ${t.booked} booked a call.` : ""}`;
  return (
    <div className="oas-home">
      <div className="oas-home-head">
        <div>
          <div className="oas-kicker">Home</div>
          <h1 className="oas-hello" style={{ textAlign: "left", margin: "8px 0 8px" }}>{hello}{who ? `, ${who}` : ""}.</h1>
          <p className="oas-home-line">{line}</p>
        </div>
        <button type="button" className="oas-btn is-primary" onClick={onNew}><Plus /> New search</button>
      </div>
      {overview && overview.totals.people > 0 ? <Dashboard o={overview} onOpenSearch={onOpenSearch} onOpenInbox={onOpenInbox} onChanged={onChanged} say={say} /> : !overview ? <Braino><p>Gathering your numbers…</p><Dots /></Braino> : null}
    </div>
  );
}

/* ── Home: the people to get in touch with, as a tagged grid ─────────── */
const NEXT: { key: string; label: string; match: (l: Lead) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "replied", label: "Replied", match: (l) => l.status === "replied" },
  { key: "send", label: "Ready to send", match: (l) => l.status === "drafted" && Boolean(l.email) },
  { key: "write", label: "Needs a message", match: (l) => l.status === "new" },
  { key: "noemail", label: "No email yet", match: (l) => !l.email && l.status !== "replied" },
];
function nextStep(l: Lead) {
  if (l.status === "replied") return { text: l.reply_kind === "interested" ? "Interested, answer now" : "Replied, answer", tone: "good" };
  if (l.status === "sent") return { text: "Sent, waiting", tone: "" };
  if (l.status === "drafted" && l.email) return { text: "Ready to send", tone: "accent" };
  if (l.status === "drafted") return { text: "Written, no email", tone: "" };
  return { text: "Needs a message", tone: "" };
}
function PeopleGrid({ people, onChanged, say }: { people: (Lead & { search: string; reply_text?: string })[]; onChanged?: () => Promise<void>; say?: (t: string) => void }) {
  const [f, setF] = useState("all");
  const [open, setOpen] = useState("");
  const list = people.filter(NEXT.find((x) => x.key === f)!.match);
  const lead = people.find((l) => l.id === open) || null;
  return (
    <>
      <div className="oas-dash-head">
        <span className="oas-dash-label">People to get in touch with</span>
        <div className="oas-seg">{NEXT.map((x) => { const n = people.filter(x.match).length; return n || x.key === "all" ? <button key={x.key} type="button" className={f === x.key ? "is-on" : ""} onClick={() => setF(x.key)}>{x.label} <span className="oas-soft">{n}</span></button> : null; })}</div>
      </div>
      {list.length ? (
        <div className="oas-pgrid2">
          {list.map((l) => {
            const n = nextStep(l);
            return (
              <button key={l.id} type="button" className="oas-pcard2" onClick={() => setOpen(l.id)}>
                <div className="oas-pcard2-top">
                  <Avatar name={l.name} src={l.photo_url} size={44} />
                  <div><b>{l.name}</b><small>{[l.title, l.company].filter(Boolean).join(" · ")}</small></div>
                  <ScoreRing score={l.score} size={38} />
                </div>
                <p>{l.status === "replied" && l.reply_text ? `“${String(l.reply_text).slice(0, 110)}”` : (l.reasons || [])[0] || l.summary}</p>
                <div className="oas-tagrow">
                  <span className={`oas-tg t-${n.tone}`}>{n.text}</span>
                  <ContactIcons l={l} />
                  {l.search ? <span className="oas-tg t-search" title={l.search}>{l.search}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : <div className="oas-empty">Nobody in this group right now.</div>}
      {lead && onChanged && say && <LeadSheet lead={lead} onClose={() => setOpen("")} onChanged={onChanged} say={say} />}
    </>
  );
}
