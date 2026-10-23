import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import "../affective.css";
import "./foundry.css";

/* Braino Foundry, the app (rebuilt 2026-10-23). Onboarding first, then a calm
   workspace: Dashboard, the three engines, Approvals, and the shared memory.
   The previous chat version is kept at src/pages/FoundryApp.tsx. */

const NAV: { id: PageId; label: string; icon: string; engine?: Engine }[] = [
  { id: "dashboard", label: "Dashboard", icon: IC.home },
  { id: "optics", label: "Get found", icon: IC.optics, engine: "optics" },
  { id: "content", label: "Be seen", icon: IC.content, engine: "content" },
  { id: "outreach", label: "Reach people", icon: IC.outreach, engine: "outreach" },
  { id: "approvals", label: "Approvals", icon: IC.inbox },
  { id: "memory", label: "Product and founder", icon: IC.memory },
];

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
  const [navOpen, setNavOpen] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sure, setSure] = useState(false);

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

  if (!active || !runner || sync === "loading") return <div className="aff fx" data-theme={theme}><div className="fx-loading">Loading your projects</div></div>;
  const up = (fn: (p: Project) => Project) => update(active.id, fn);
  const pb = busy[active.id] || {};

  if (!active.onboarded) {
    return (
      <div className="aff fx" data-theme={theme}>
        <Onboarding project={active} update={up} theme={theme} onStart={() => { setPage("dashboard"); runner.all(); }} />
        {projects.length > 1 && <button className="fo-out" onClick={() => setActiveId(projects.find((p) => p.id !== active.id)!.id)}>Back to my other project</button>}
        {!user && <button className="fo-signin" onClick={signIn}>Sign in to save your work</button>}
      </div>
    );
  }

  const go = (id: PageId) => { setPage(id); setNavOpen(false); window.scrollTo({ top: 0 }); };
  const props = { p: active, up, busy: pb, run: runner, go, me: settings };
  const waiting = waitingCount(active);

  return (
    <div className="aff fx" data-theme={theme}>
      <div className="fx-shell">
        <aside className={`fx-side ${navOpen ? "open" : ""}`}>
          <div className="fx-side-top">
            <Link to="/foundry" className="fx-word"><BrainoMascot variant="foundry" size={24} /><span>Braino Foundry</span></Link>
            <button className="fx-icon-b fx-only-m" aria-label="Close menu" onClick={() => setNavOpen(false)}><Icon d={IC.close} /></button>
          </div>

          <div className="fx-switch-p">
            <button className="fx-proj" aria-expanded={switcher} onClick={() => setSwitcher((s) => !s)}>
              <span className="fx-proj-a">{(active.memory.product.name || "N").charAt(0).toUpperCase()}</span>
              <span className="fx-proj-n"><b>{active.memory.product.name || active.name}</b><small>{active.memory.product.site ? active.memory.product.site.replace(/^https?:\/\//, "") : "Project"}</small></span>
              <Icon d={IC.chev} size={16} />
            </button>
            {switcher && (
              <div className="fx-menu" onMouseLeave={() => setSwitcher(false)}>
                {projects.map((p) => (
                  <button key={p.id} className={p.id === active.id ? "on" : ""} onClick={() => { setActiveId(p.id); setSwitcher(false); setPage("dashboard"); }}>
                    {p.memory.product.name || p.name}{Object.values(busy[p.id] || {}).some(Boolean) && <i className="fx-live" />}
                  </button>
                ))}
                <button className="add" onClick={() => { create(); setSwitcher(false); }}><Icon d={IC.plus} size={15} />New project</button>
              </div>
            )}
          </div>

          <nav className="fx-nav" aria-label="Foundry">
            {NAV.map((n) => (
              <button key={n.id} className={page === n.id ? "on" : ""} aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>
                <Icon d={n.icon} />
                <span>{n.label}</span>
                {n.engine && pb[n.engine] && <i className={`fx-live ${n.engine}`} title={pb[n.engine]} />}
                {n.id === "approvals" && waiting > 0 && <em className="fx-badge">{waiting}</em>}
              </button>
            ))}
          </nav>

          <footer className="fx-side-foot">
            {!user && <button className="fx-btn sm fx-signin" onClick={signIn}>Sign in with Google to save</button>}
            <button className="fx-me" onClick={() => setSettingsOpen(true)}>
              <Avatar name={settings.name} photo={settings.photo} size={32} />
              <span className="fx-me-n"><b>{settings.name || "Add your name"}</b><small className={`fx-sync ${sync}`}>{SYNC_LINE[sync]}</small></span>
              <Icon d={IC.gear} size={16} />
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
          {page === "dashboard" && <Dashboard {...props} />}
          {page === "optics" && <Optics {...props} />}
          {page === "content" && <Content {...props} />}
          {page === "outreach" && <Outreach {...props} />}
          {page === "approvals" && <Approvals {...props} />}
          {page === "memory" && <Memory {...props} />}
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
