import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BrainoMascot } from "@/components/BrainoMascot";
import { WEEK } from "./lib";
import { runAll, runContent, runOptics, runOutreach, type Ctx } from "./engines";
import { useFoundryStore, type Engine, type Project } from "./store";
import { waitingCount, type PageId, type Runner } from "./types";
import { Icon, IC } from "./components/ui";
import Onboarding from "./Onboarding";
import Dashboard, { Avatar } from "./Dashboard";
import Optics from "./Optics";
import Content from "./Content";
import Outreach from "./Outreach";
import Approvals from "./Approvals";
import Memory from "./Memory";
import Architecture from "./Architecture";
import FirstRun from "./FirstRun";
import WebNotch from "./components/WebNotch";
import { brainoLine, counts, type Go } from "./braino-lines";
import { moveStage } from "./actions";
import { copy } from "./lib";
import "../affective.css";
import "./foundry.css";
import "./redesign.css";

/* Braino Foundry, the app (rebuilt 2026-10-23). Onboarding first, then a calm
   workspace: Dashboard, the three engines, Approvals, and the shared memory.
   The previous chat version is kept at src/pages/FoundryApp.tsx. */

const NAV: { id: PageId; label: string; icon: string; engine?: Engine }[] = [
  { id: "dashboard", label: "Overview", icon: IC.home },
  { id: "optics", label: "Get found", icon: IC.optics, engine: "optics" },
  { id: "content", label: "Be seen", icon: IC.content, engine: "content" },
  { id: "outreach", label: "Reach people", icon: IC.outreach, engine: "outreach" },
  { id: "approvals", label: "Approvals", icon: IC.inbox },
  { id: "memory", label: "Product & founder", icon: IC.memory },
  { id: "architecture", label: "Architecture", icon: "M4 5h6v5H4zM14 5h6v5h-6zM9 15h6v5H9zM7 10v2h10v-2M12 12v3" },
];

const PROJ_COLORS = ["#6b52c4", "#d9645b", "#3a8f5f", "#b8842a", "#2f6fed", "#8a8577"];

type Busy = Record<string, Partial<Record<Engine | "setup", string>>>;

/* Your photo, shrunk to 160px so it fits in this browser's storage. */
function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = 160, c = document.createElement("canvas");
      c.width = side; c.height = side;
      const s = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* Sign in with Google, then come straight back to Foundry. */
function signIn() {
  void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/foundry/app` } });
}
const SYNC_LINE: Record<string, string> = {
  off: "Saved in this browser only",
  loading: "Loading your projects",
  saving: "Saving",
  saved: "Saved to your account",
  error: "Could not save, will retry",
  "no-table": "Account saving is not switched on yet",
};

export default function FoundryRoot() {
  const { user, signOut } = useAuth();
  const store = useFoundryStore(user?.id);
  const { projects, activeId, setActiveId, update, get, create, remove, settings, setSettings, bytes, clearAll, sync } = store;
  // Your name and photo from Google, until you set your own.
  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata || {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
    const name = meta.full_name || meta.name || "";
    const photo = meta.avatar_url || meta.picture || "";
    if ((!settings.name && name) || (!settings.photo && photo)) setSettings({ ...settings, name: settings.name || name, photo: settings.photo || photo });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { theme, toggle } = useAffTheme();
  const [page, setPage] = useState<PageId>("dashboard");
  const [busy, setBusy] = useState<Busy>({});
  // Projects whose first run is on screen: the founder watches it before the dashboard.
  const [launching, setLaunching] = useState<Record<string, boolean>>({});
  // Project switcher: rename in place, delete after a second tap.
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [switcher, setSwitcher] = useState(true);
  const [mini, setMini] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // ⌘F (or Ctrl+F) jumps to the sidebar search.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && searchRef.current) { e.preventDefault(); setMini(false); setNavOpen(true); searchRef.current.focus(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [notchOpen, setNotchOpen] = useState(false);
  const [greet, setGreet] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hop, setHop] = useState(false);
  const [navKey, setNavKey] = useState(0);

  const active = projects.find((p) => p.id === activeId) || projects[0] || null;
  useEffect(() => { if (!projects.length) create(); }, [projects.length, create]);
  useEffect(() => { if (active && active.id !== activeId) setActiveId(active.id); }, [active, activeId, setActiveId]);
  useEffect(() => { document.title = `${active?.memory.product.name || "New project"} · Braino Foundry`; }, [active?.memory.product.name]);

  const ctxFor = useCallback((id: string): Ctx => ({
    get: () => get(id) as Project,
    update: (fn) => update(id, fn),
    busy: (engine, label) => setBusy((b) => ({ ...b, [id]: { ...(b[id] || {}), [engine]: label } })),
  }), [get, update]);

  const runner: Runner | null = useMemo(() => {
    if (!active) return null;
    const id = active.id;
    const isBusy = () => Object.values(busy[id] || {}).some(Boolean);
    const safe = (f: () => Promise<unknown>) => { f().catch(() => undefined); };
    return {
      all: () => { if (!isBusy()) safe(() => runAll(ctxFor(id))); },
      optics: () => safe(() => { update(id, (p) => ({ ...p, lastRun: p.lastRun || Date.now() })); return runOptics(ctxFor(id)); }),
      content: (extra?: string) => safe(() => runContent(ctxFor(id), extra || "")),
      outreach: () => safe(() => runOutreach(ctxFor(id))),
    };
  }, [active?.id, busy, ctxFor, update]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autopilot: no server schedule yet, so the weekly run happens when the app
  // is open on or after the due date.
  useEffect(() => {
    if (!active || !runner || !active.onboarded || !active.autopilot || !active.lastRun) return;
    if (Date.now() >= active.lastRun + WEEK) runner.all();
  }, [active?.id, active?.autopilot, active?.lastRun]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Braino on the web: he greets you once a day per project, then rests
     folded. He never speaks on his own after that. */
  const anyBusy = !!active && Object.values(busy[active.id] || {}).some(Boolean);
  const wasBusy = useRef(false);
  const doHop = useCallback(() => { setHop(true); window.setTimeout(() => setHop(false), 750); }, []);
  useEffect(() => {
    if (wasBusy.current && !anyBusy) { setFinished(true); doHop(); }
    wasBusy.current = anyBusy;
  }, [anyBusy, doHop]);
  useEffect(() => {
    if (!active || sync === "loading" || launching[active.id]) return;
    const k = `foundry-braino-greet-${active.id}`, today = new Date().toDateString();
    let seen = "";
    try { seen = localStorage.getItem(k) || ""; localStorage.setItem(k, today); } catch (_) { /* private */ }
    if (seen === today) return;
    setGreet(true); setNotchOpen(true);
  }, [active?.id, sync, launching[active?.id || ""]]); // eslint-disable-line react-hooks/exhaustive-deps
  // Someone replied since you last looked: a little hop.
  const repliedN = active ? counts(active).replied.length : 0;
  useEffect(() => {
    if (!active) return;
    const k = `foundry-braino-replied-${active.id}`;
    let seen = 0;
    try { seen = Number(localStorage.getItem(k) || 0); localStorage.setItem(k, String(repliedN)); } catch (_) { /* private */ }
    if (repliedN > seen) doHop();
  }, [active?.id, repliedN]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeNotch = () => { setNotchOpen(false); setGreet(false); setFinished(false); };

  if (!active || !runner || sync === "loading") return <div className="aff fx" data-theme={theme}><div className="fx-loading">Loading your projects</div></div>;
  const up = (fn: (p: Project) => Project) => update(active.id, fn);
  const pb = busy[active.id] || {};

  const line = brainoLine(active, pb, { greeting: greet, finished });

  if (!active.onboarded) {
    return (
      <div className="aff fx" data-theme={theme}>
        <WebNotch open={notchOpen} onOpen={() => setNotchOpen(true)} onClose={closeNotch} text={line.text} buttons={[]} dot={false} />
        <Onboarding project={active} update={up} theme={theme} onStart={() => { setLaunching((l) => ({ ...l, [active.id]: true })); setPage("dashboard"); runner.all(); }} />
        {projects.length > 1 && <button className="fo-out" onClick={() => setActiveId(projects.find((p) => p.id !== active.id)!.id)}>Back to my other project</button>}
        {!user && <button className="fo-signin" onClick={signIn}>Sign in to save your work</button>}
      </div>
    );
  }

  if (launching[active.id]) {
    return <div className="aff fx" data-theme={theme}><FirstRun p={active} busy={pb} onDone={() => setLaunching((l) => ({ ...l, [active.id]: false }))} /></div>;
  }

  const go = (id: PageId) => { setPage(id); setNavOpen(false); window.scrollTo({ top: 0 }); };
  /* "Send it" on a reply: the same as "Copy answer, open" in Reach people,
     then they move to Talking. Nothing goes out without this tap. */
  const sendReply = (id: string) => {
    const x = active.people.find((y) => y.id === id);
    const answer = x && [...x.thread].reverse().find((m) => m.from === "us");
    if (!x || !answer) return false;
    void copy(answer.text);
    window.open(x.url, "_blank", "noopener");
    moveStage(up, x, "talking");
    return true;
  };
  const act = (g: Go) => {
    if ("do" in g) {
      if (g.do === "run-all") { runner.all(); setGreet(false); setFinished(false); return; }
      if (g.do === "send") sendReply(g.person);
      closeNotch();
      return;
    }
    try {
      if (g.person) sessionStorage.setItem("foundry-focus-person", g.person);
      if (g.stage) sessionStorage.setItem("foundry-focus-stage", g.stage);
    } catch (_) { /* private */ }
    setNavKey((k) => k + 1);
    go(g.page);
    closeNotch();
  };
  const props = { p: active, up, busy: pb, run: runner, go, me: settings };
  const waiting = waitingCount(active);
  const ql = q.trim().toLowerCase();
  const navShown = NAV.filter((n) => !ql || n.label.toLowerCase().includes(ql));
  const projShown = projects.filter((x) => !ql || (x.memory.product.name || x.name).toLowerCase().includes(ql));

  return (
    <div className="aff fx" data-theme={theme} style={{ ["--wn-offset" as string]: mini ? "36px" : "130px" } as React.CSSProperties}>
      <WebNotch open={notchOpen} onOpen={() => setNotchOpen(true)} onClose={closeNotch} text={line.text} buttons={line.actions.map((a) => ({ label: a.label, onClick: () => act(a.go) }))} dot={waiting > 0 || repliedN > 0} thinking={anyBusy} hop={hop} />
      <div className={`fx-shell${mini ? " mini" : ""}`}>
        <aside className={`fx-side ${navOpen ? "open" : ""}`}>
          <div className="fx-side-top">
            <Link to="/foundry" className="fx-word"><BrainoMascot variant="foundry" size={24} /><span>Braino Foundry</span></Link>
            <button className="fx-icon-b fx-only-d" aria-label="Collapse menu" title="Collapse menu" onClick={() => setMini((m) => !m)}><Icon d={IC.sidebar} size={17} /></button>
            <button className="fx-icon-b fx-only-m" aria-label="Close menu" onClick={() => setNavOpen(false)}><Icon d={IC.close} /></button>
          </div>

          <label className="fx-search">
            <Icon d={IC.optics} size={15} />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search pages and projects" />
            <kbd>⌘F</kbd>
          </label>

          <nav className="fx-nav" aria-label="Foundry">
            <p className="fx-nav-h">Essentials</p>
            {navShown.map((n) => (
              <button key={n.id} className={page === n.id ? "on" : ""} aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>
                <Icon d={n.icon} size={17} />
                <span>{n.label}</span>
                {n.engine && pb[n.engine] && <i className={`fx-live ${n.engine}`} title={pb[n.engine]} />}
                {n.id === "approvals" && waiting > 0 && <em className="fx-badge">{waiting}</em>}
              </button>
            ))}
            {!navShown.length && !projShown.length && <p className="fx-nav-none">Nothing matches "{q}"</p>}
          </nav>

          <div className="fx-pgroup">
            <div className="fx-nav-h row">
              <button className="fx-pgroup-t" aria-expanded={switcher} onClick={() => setSwitcher((s) => !s)}><Icon d={IC.chev} size={14} />Projects</button>
              <button className="fx-icon-b sm" aria-label="New project" title="New project" onClick={() => create()}><Icon d={IC.plus} size={15} /></button>
            </div>
            {switcher && projShown.map((p) => {
              const name = p.memory.product.name || p.name;
              const color = PROJ_COLORS[projects.indexOf(p) % PROJ_COLORS.length];
              if (renaming?.id === p.id) {
                const save = () => { const n = renaming.name.trim(); if (n) update(p.id, (x) => ({ ...x, name: n, memory: { ...x.memory, product: { ...x.memory.product, name: n } } })); setRenaming(null); };
                return <div key={p.id} className="fx-prow editing"><input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setRenaming(null); }} onBlur={save} /></div>;
              }
              if (confirmDel === p.id) {
                return (
                  <div key={p.id} className="fx-prow confirm">
                    <span>Delete {name}? Its results go too.</span>
                    <button className="fx-pact" onClick={() => setConfirmDel("")}>Cancel</button>
                    <button className="fx-pact del" onClick={() => { remove(p.id); setConfirmDel(""); setPage("dashboard"); }}>Delete</button>
                  </div>
                );
              }
              return (
                <div key={p.id} className={`fx-prow${p.id === active.id ? " on" : ""}`}>
                  <button className="fx-pname" onClick={() => { setActiveId(p.id); setPage("dashboard"); setNavOpen(false); }}>
                    <span className="fx-psq" style={{ background: color }} />{name}{Object.values(busy[p.id] || {}).some(Boolean) && <i className="fx-live" />}
                  </button>
                  <button className="fx-pact" aria-label={`Rename ${name}`} title="Rename" onClick={() => setRenaming({ id: p.id, name })}><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg></button>
                  <button className="fx-pact" aria-label={`Delete ${name}`} title="Delete" onClick={() => setConfirmDel(p.id)}><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg></button>
                </div>
              );
            })}
          </div>

          <div className="fx-side-links">
            <Link to="/knowledge"><Icon d={IC.help} size={17} /><span>Knowledge</span></Link>
            <Link to="/foundry"><Icon d={IC.open} size={17} /><span>About Foundry</span></Link>
          </div>

          <footer className="fx-side-foot">
            {!user && <button className="fx-btn sm fx-signin" onClick={signIn}>Sign in with Google to save</button>}
            <button className="fx-me" onClick={() => setSettingsOpen(true)}>
              <Avatar name={settings.name} photo={settings.photo} size={32} />
              <span className="fx-me-n"><b>{settings.name || "Add your name"}</b><small className={`fx-sync ${sync}`}>{SYNC_LINE[sync]}</small></span>
              <Icon d={IC.chev} size={16} />
            </button>
          </footer>
        </aside>
        {navOpen && <div className="fx-scrim" onClick={() => setNavOpen(false)} />}

        <main className="fx-main">
          <div className="fx-topbar fx-only-m">
            <button className="fx-icon-b" aria-label="Open menu" onClick={() => setNavOpen(true)}><Icon d={IC.menu} /></button>
            <span>{NAV.find((n) => n.id === page)?.label}</span>
            {waiting > 0 ? <button className="fx-badge" onClick={() => go("approvals")}>{waiting}</button> : <span />}
          </div>
          {page === "dashboard" && <Dashboard key={navKey} {...props} />}
          {page === "optics" && <Optics key={navKey} {...props} />}
          {page === "content" && <Content key={navKey} {...props} />}
          {page === "outreach" && <Outreach key={navKey} {...props} />}
          {page === "approvals" && <Approvals key={navKey} {...props} />}
          {page === "memory" && <Memory key={navKey} {...props} />}
          {page === "architecture" && <Architecture />}
        </main>
      </div>

      {settingsOpen && (
        <div className="fx-sheet-wrap" onMouseDown={() => setSettingsOpen(false)}>
          <div className="fx-modal" role="dialog" aria-label="Settings" onMouseDown={(e) => e.stopPropagation()}>
            <header><h3>Settings</h3><button className="fx-icon-b" aria-label="Close" onClick={() => setSettingsOpen(false)}><Icon d={IC.close} /></button></header>
            <label className="fx-field"><span>Your name</span><input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} placeholder="Your name" /></label>
            <div className="fx-field"><span>Your photo</span>
              <div className="fx-photo-row">
                <Avatar name={settings.name} photo={settings.photo} size={48} />
                <label className="fx-ghost fx-upload">{settings.photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void shrinkPhoto(file).then((photo) => setSettings({ ...settings, photo })); }} /></label>
                {settings.photo && <button className="fx-link" onClick={() => setSettings({ ...settings, photo: "" })}>Remove</button>}
              </div>
            </div>
            <div className="fx-field"><span>Theme</span>
              <div className="fx-seg"><button className={theme === "light" ? "on" : ""} onClick={() => theme !== "light" && toggle()}>Light</button><button className={theme === "dark" ? "on" : ""} onClick={() => theme !== "dark" && toggle()}>Dark</button></div>
            </div>
            <div className="fx-field"><span>Account</span>
              {user ? (
                <div className="fx-photo-row"><span className="fx-small">Signed in as {user.email}. {SYNC_LINE[sync]}.</span><button className="fx-link" onClick={() => { void signOut(); setSettingsOpen(false); }}>Sign out</button></div>
              ) : (
                <div className="fx-photo-row"><span className="fx-small">Not signed in. Your work is only in this browser.</span><button className="fx-btn sm" onClick={signIn}>Sign in with Google</button></div>
              )}
            </div>
            <div className="fx-field"><span>Your data</span>
              <p className="fx-small">{projects.length} project{projects.length === 1 ? "" : "s"}, {(bytes / 1024).toFixed(0)} KB. {user && sync === "saved" ? "Saved to your account and kept in this browser." : "Kept in this browser."}</p>
              <div className="fx-acts">
                <button className="fx-ghost" onClick={() => { const b = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "braino-foundry.json"; a.click(); }}>Download a copy</button>
                {projects.length > 1 && <button className="fx-ghost" onClick={() => { remove(active.id); setSettingsOpen(false); }}>Delete this project</button>}
                {sure ? <button className="fx-btn danger" onClick={() => { clearAll(); setSure(false); setSettingsOpen(false); }}>Yes, delete everything</button> : <button className="fx-link" onClick={() => setSure(true)}>Delete all data</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
