/* /dd — the dashboard UI, redesigned, on mock data.
 *
 * Nothing here talks to Supabase and nothing sits behind auth: it exists so the
 * spacing and the type can be argued with before any of it is wired into the
 * real Dashboard. Apple type throughout, no serif and no mono. */
import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid, FileText, Bot, Brain, Sparkles, Zap, Linkedin, Search, Settings,
  Plus, Mic, ArrowUpRight, CheckCircle2, Clock, ChevronDown, Check, Users,
  NotebookPen, Presentation,
} from "lucide-react";
import "./dashboard-design.css";

type World = "companion" | "foundry";
type Tab = "overview" | "notes" | "tasks" | "memory" | "x" | "linkedin" | "research" | "settings";
type NotesTab = "all" | "lectures" | "meetings";

const WORLDS: { key: World; name: string; blurb: string; icon: typeof Brain }[] = [
  { key: "companion", name: "Braino Companion", blurb: "Your notes, lectures and everything he does for you", icon: Brain },
  { key: "foundry", name: "Braino Foundry", blurb: "The work that goes out: X, LinkedIn, research", icon: Sparkles },
];

const NAV: Record<World, { key: Tab; label: string; icon: typeof LayoutGrid; count?: number }[]> = {
  companion: [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "notes", label: "Notes", icon: FileText, count: 42 },
    { key: "tasks", label: "Agent tasks", icon: Bot, count: 12 },
    { key: "memory", label: "Memory", icon: Brain, count: 91 },
  ],
  foundry: [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "x", label: "X", icon: Zap, count: 48 },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin },
    { key: "research", label: "Deep work", icon: Sparkles, count: 3 },
  ],
};

const NOTES_TABS: { key: NotesTab; label: string; icon: typeof NotebookPen; count: number }[] = [
  { key: "all", label: "All notes", icon: NotebookPen, count: 42 },
  { key: "lectures", label: "Lectures", icon: Presentation, count: 6 },
  { key: "meetings", label: "Meetings", icon: Users, count: 9 },
];

const STATS = [
  { label: "Tasks done", value: "128", delta: "+14 this week", focus: true },
  { label: "Notes kept", value: "42", delta: "+3 this week" },
  { label: "Hours listened", value: "9.2", delta: "+2.4 this week" },
  { label: "Replies sent", value: "48", delta: "+11 this week" },
];

const TODAY = [
  { icon: Mic, title: "Machine Learning, lecture 12", sub: "Notes written, 40 minutes", tag: "Lecture", when: "09:14" },
  { icon: Bot, title: "Booked the Bengaluru flight for Friday", sub: "Delegate, 6 steps", tag: "Done", ok: true, when: "11:02" },
  { icon: Sparkles, title: "Deep work: on-device speech models", sub: "41 sources, 3,781 words", tag: "Research", when: "13:30" },
  { icon: Zap, title: "Replied to 6 mentions on X", sub: "All within your voice policy", tag: "Auto", when: "16:45" },
];

const NOTE_ROWS: Record<NotesTab, { title: string; sub: string; when: string }[]> = {
  all: [
    { title: "Gradient descent, and why the loss surface matters", sub: "Lecture · 2,140 words", when: "2h ago" },
    { title: "Standup: shipping the overlay this week", sub: "Meeting · 610 words", when: "Yesterday" },
    { title: "What Wispr actually does with Llama", sub: "Note · 860 words", when: "Yesterday" },
    { title: "Mesa: prove payment before you build", sub: "Meeting · 1,204 words", when: "Tuesday" },
  ],
  lectures: [
    { title: "Machine Learning, lecture 12", sub: "40 minutes · 2,140 words", when: "2h ago" },
    { title: "Machine Learning, lecture 11", sub: "44 minutes · 2,380 words", when: "Monday" },
    { title: "Systems Design, week 3", sub: "51 minutes · 2,910 words", when: "Last Thursday" },
  ],
  meetings: [
    { title: "Standup: shipping the overlay this week", sub: "18 minutes · 4 people", when: "Yesterday" },
    { title: "Mesa mentor review", sub: "46 minutes · 3 people", when: "Tuesday" },
    { title: "Founder interview, Dinebees", sub: "38 minutes · 2 people", when: "Last Friday" },
  ],
};

const TASKS = [
  { title: "Draft the investor update for September", state: "Running", live: true, when: "now" },
  { title: "Pull last month's numbers from Polar", state: "Queued", when: "in 5m" },
  { title: "Summarise the founder interviews", state: "Done", ok: true, when: "1h ago" },
];

const ACTIONS = [
  { icon: Plus, label: "New task", key: "N" },
  { icon: Mic, label: "Start a lecture", key: "⌘⇧E" },
  { icon: Sparkles, label: "Deep work", key: "D" },
  { icon: FileText, label: "New note", key: "⌘K" },
];

export default function DashboardDesign() {
  const [world, setWorld] = useState<World>("companion");
  const [tab, setTab] = useState<Tab>("overview");
  const [notesTab, setNotesTab] = useState<NotesTab>("all");
  const [worldOpen, setWorldOpen] = useState(false);
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!worldOpen) return;
    const away = (e: MouseEvent) => {
      if (!worldRef.current?.contains(e.target as Node)) setWorldOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setWorldOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [worldOpen]);

  const current = WORLDS.find((w) => w.key === world)!;

  return (
    <div className="dd">
      <div className="dd-shell">
        <aside className="dd-side">
          <div className="dd-brand">
            <span className="dd-brand-mark">B</span>
            <span className="dd-brand-name">Braino</span>
          </div>

          <nav className="dd-nav">
            {NAV[world].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`dd-item${tab === item.key ? " on" : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  <Icon />
                  <span className="dd-item-n">{item.label}</span>
                  {item.count ? <span className="dd-item-c">{item.count}</span> : null}
                </button>
              );
            })}
            <div className="dd-nav-gap" />
            <button
              type="button"
              className={`dd-item${tab === "settings" ? " on" : ""}`}
              onClick={() => setTab("settings")}
            >
              <Settings />
              <span className="dd-item-n">Settings</span>
            </button>
          </nav>

          <div className="dd-me">
            <span className="dd-me-av">I</span>
            <span>
              <div className="dd-me-n">Itish Pande</div>
              <div className="dd-me-p">Founding</div>
            </span>
          </div>
        </aside>

        <div>
          <header className="dd-top">
            <div className="dd-world" ref={worldRef}>
              <button
                type="button"
                className={`dd-world-btn${worldOpen ? " open" : ""}`}
                onClick={() => setWorldOpen((v) => !v)}
              >
                {current.name}
                <ChevronDown />
              </button>
              {worldOpen ? (
                <div className="dd-world-menu">
                  {WORLDS.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        className={`dd-world-opt${w.key === world ? " on" : ""}`}
                        onClick={() => { setWorld(w.key); setTab("overview"); setWorldOpen(false); }}
                      >
                        <Icon />
                        <span>
                          <div className="dd-world-n">{w.name}</div>
                          <div className="dd-world-d">{w.blurb}</div>
                        </span>
                        {w.key === world ? <Check className="dd-world-tick" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="dd-search">
              <Search style={{ width: 15, height: 15 }} />
              <input placeholder="Search notes, tasks, memory" />
              <span className="dd-kbd">/</span>
            </div>
            <button type="button" className="dd-btn solid">
              <Plus />
              New task
            </button>
          </header>

          {tab === "overview" ? (
            <Overview />
          ) : tab === "notes" ? (
            <Notes active={notesTab} onTab={setNotesTab} />
          ) : (
            <Soon label={NAV[world].find((i) => i.key === tab)?.label ?? "Settings"} />
          )}
        </div>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <main className="dd-page">
      <section className="dd-sec">
        <div className="dd-mast">
          <div>
            <h1 className="dd-h1">Good afternoon, Itish.</h1>
            <div className="dd-mast-meta">
              <span>Day 118</span>
              <span className="dd-dot" />
              <span>last active 4 minutes ago</span>
            </div>
          </div>
          <div className="dd-quota">
            <div className="dd-quota-h">
              <span className="dd-label">Delegate this month</span>
              <span className="dd-num" style={{ fontSize: 13, fontWeight: 550 }}>128 / 400</span>
            </div>
            <div className="dd-quota-bar"><div className="dd-quota-fill" style={{ width: "32%" }} /></div>
          </div>
        </div>
      </section>

      <section className="dd-sec">
        <div className="dd-grid-4">
          {STATS.map((s) => (
            <div key={s.label} className={`dd-card${s.focus ? " dd-focus" : ""}`}>
              <div className="dd-label">{s.label}</div>
              <div className="dd-num dd-stat-v">{s.value}</div>
              <div className="dd-stat-d">{s.delta}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="dd-sec">
        <div className="dd-grid-2">
          <div className="dd-card">
            <div className="dd-sec-h">
              <h2 className="dd-h2">Today</h2>
              <a className="dd-link" href="#">Everything</a>
            </div>
            <div className="dd-rows">
              {TODAY.map((r) => {
                const Icon = r.icon;
                return (
                  <div className="dd-row" key={r.title}>
                    <span className="dd-row-ic"><Icon /></span>
                    <span className="dd-row-b">
                      <div className="dd-row-t">{r.title}</div>
                      <div className="dd-row-s">{r.sub}</div>
                    </span>
                    <span className={`dd-tag${r.ok ? " ok" : ""}`}>{r.tag}</span>
                    <span className="dd-row-r">{r.when}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dd-card">
            <div className="dd-sec-h"><h2 className="dd-h2">Quick</h2></div>
            <div className="dd-acts">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button type="button" className="dd-act" key={a.label}>
                    <Icon />
                    <span className="dd-act-t">{a.label}</span>
                    <span className="dd-act-k">{a.key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="dd-sec">
        <div className="dd-grid-2">
          <div className="dd-card">
            <div className="dd-sec-h">
              <h2 className="dd-h2">Agent tasks</h2>
              <a className="dd-link" href="#">All 12</a>
            </div>
            <div className="dd-rows">
              {TASKS.map((t) => (
                <div className="dd-row" key={t.title}>
                  <span className="dd-row-ic">{t.ok ? <CheckCircle2 /> : <Clock />}</span>
                  <span className="dd-row-b"><div className="dd-row-t">{t.title}</div></span>
                  <span className={`dd-tag${t.live ? " live" : ""}${t.ok ? " ok" : ""}`}>{t.state}</span>
                  <span className="dd-row-r">{t.when}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dd-card">
            <div className="dd-sec-h">
              <h2 className="dd-h2">Recent notes</h2>
              <a className="dd-link" href="#">All 42</a>
            </div>
            <div className="dd-rows">
              {NOTE_ROWS.all.slice(0, 3).map((n) => (
                <div className="dd-row" key={n.title}>
                  <span className="dd-row-b">
                    <div className="dd-row-t">{n.title}</div>
                    <div className="dd-row-s">{n.when} · {n.sub}</div>
                  </span>
                  <ArrowUpRight style={{ width: 15, height: 15, color: "var(--ink-4)", flex: "none" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Notes({ active, onTab }: { active: NotesTab; onTab: (t: NotesTab) => void }) {
  const rows = NOTE_ROWS[active];
  return (
    <main className="dd-page">
      <section className="dd-sec">
        <h1 className="dd-h1">Notes</h1>
        <div className="dd-mast-meta">Everything he wrote down for you, however it arrived.</div>
      </section>

      <section className="dd-sec">
        <div className="dd-tabs">
          {NOTES_TABS.map((t) => {
            const Icon = t.icon;
            const on = t.key === active;
            return (
              <button key={t.key} type="button" className={`dd-tab${on ? " on" : ""}`} onClick={() => onTab(t.key)}>
                <Icon />
                {t.label}
                <span className="dd-tab-c">{t.count}</span>
                {on ? <span className="dd-tab-u" /> : null}
              </button>
            );
          })}
        </div>

        <div className="dd-card">
          <div className="dd-rows">
            {rows.map((n) => (
              <div className="dd-row" key={n.title}>
                <span className="dd-row-b">
                  <div className="dd-row-t">{n.title}</div>
                  <div className="dd-row-s">{n.sub}</div>
                </span>
                <span className="dd-row-r">{n.when}</span>
                <ArrowUpRight style={{ width: 15, height: 15, color: "var(--ink-4)", flex: "none" }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Soon({ label }: { label: string }) {
  return (
    <main className="dd-page">
      <section className="dd-sec">
        <h1 className="dd-h1">{label}</h1>
        <div className="dd-mast-meta">This screen gets the same rhythm once the overview is agreed.</div>
      </section>
      <section className="dd-sec">
        <div className="dd-card"><div className="dd-empty">Nothing here yet.</div></div>
      </section>
    </main>
  );
}
