/* /dd — the dashboard UI, redesigned, on mock data.
 *
 * Nothing here talks to Supabase and nothing sits behind auth: it exists so the
 * spacing and the type can be argued with before any of it is wired into the
 * real Dashboard. Apple type throughout, no serif and no mono. */
import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid, FileText, Bot, Brain, Sparkles, Zap, Linkedin, Search, Settings,
  Plus, Mic, ArrowUpRight, CheckCircle2, Clock, ChevronDown, Check, Users,
  NotebookPen, Presentation, Circle, Loader, Globe, MessageSquare, Briefcase,
  Heart, XCircle, LogOut, ChevronRight,
} from "lucide-react";
import { BRAINO_WALKER_SVG } from "../components/brainoWalkerSvg";
import "./dashboard-design.css";

type World = "companion" | "foundry";
type Tab = "overview" | "notes" | "tasks" | "memory" | "x" | "linkedin" | "research" | "settings";
type NotesTab = "all" | "lectures" | "meetings";
type TasksTab = "all" | "running" | "queued" | "done";
type MemoryTab = "all" | "you" | "preferences" | "projects";

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

const TASKS_TABS: { key: TasksTab; label: string; count: number }[] = [
  { key: "all", label: "All", count: 12 },
  { key: "running", label: "Running", count: 1 },
  { key: "queued", label: "Queued", count: 3 },
  { key: "done", label: "Done", count: 8 },
];

type AgentTask = {
  title: string;
  where: string;
  state: TasksTab;
  when: string;
  steps?: { label: string; state: "done" | "now" | "next"; took?: string }[];
};

const AGENT_TASKS: AgentTask[] = [
  {
    title: "Draft the investor update for September",
    where: "Google Docs",
    state: "running",
    when: "started 2m ago",
    steps: [
      { label: "Read last month's update", state: "done", took: "4s" },
      { label: "Pulled the numbers from Polar", state: "done", took: "11s" },
      { label: "Writing the first section", state: "now" },
      { label: "Share the draft with you", state: "next" },
    ],
  },
  { title: "Pull last month's numbers from Polar", where: "Polar", state: "queued", when: "in 5m" },
  { title: "Reply to the three intro emails", where: "Gmail", state: "queued", when: "in 12m" },
  { title: "Book a table for Saturday, 4 people", where: "Google Maps", state: "queued", when: "tonight" },
  { title: "Summarise the founder interviews", where: "Brainotes", state: "done", when: "1h ago" },
  { title: "Booked the Bengaluru flight for Friday", where: "MakeMyTrip", state: "done", when: "today, 11:02" },
  { title: "Ordered the dark chocolate again", where: "Amazon", state: "done", when: "yesterday" },
  { title: "Cleaned up the Notion inbox", where: "Notion", state: "done", when: "yesterday" },
  { title: "Found three papers on streaming ASR", where: "Deep work", state: "done", when: "Tuesday" },
];

const MEMORY_TABS: { key: MemoryTab; label: string; icon: typeof Brain; count: number }[] = [
  { key: "all", label: "All", icon: Brain, count: 91 },
  { key: "you", label: "About you", icon: Heart, count: 34 },
  { key: "preferences", label: "How you work", icon: MessageSquare, count: 29 },
  { key: "projects", label: "Projects", icon: Briefcase, count: 28 },
];

type Memory = { text: string; kind: MemoryTab; from: string; when: string };

const MEMORIES: Memory[] = [
  { text: "Lives in Bengaluru, and books flights out on Friday evenings when he can.", kind: "you", from: "Chat", when: "2d ago" },
  { text: "Doing the PGP in Venture Building at Mesa School of Business. Mentor feedback counts as a spec change, not an opinion.", kind: "you", from: "Chat", when: "5d ago" },
  { text: "Wants replies short. Five or six bullets, the answer first, no preamble.", kind: "preferences", from: "Correction", when: "1w ago" },
  { text: "Plain language, no jargon and no code names. Simple is not the same as vague.", kind: "preferences", from: "Correction", when: "1w ago" },
  { text: "Ask before changing code. Propose it and wait for an explicit go.", kind: "preferences", from: "Correction", when: "1w ago" },
  { text: "Braino is about three months old. trybraino.com is a waitlist, so never say the product is usable today.", kind: "projects", from: "Chat", when: "2w ago" },
  { text: "BrainoHERA is the live lecture mode. It ran forty minutes at about 88 percent on 3 September.", kind: "projects", from: "Mac app", when: "yesterday" },
  { text: "Production deploys from main. Shipping means merging to main.", kind: "projects", from: "Chat", when: "3w ago" },
  { text: "Prefers a black coffee in the morning and stops drinking it after four.", kind: "you", from: "Voice", when: "3w ago" },
];

const ACTIONS = [
  { icon: Plus, label: "New task", key: "N" },
  { icon: Mic, label: "Start a lecture", key: "⌘⇧E" },
  { icon: Sparkles, label: "Deep work", key: "D" },
  { icon: FileText, label: "New note", key: "⌘K" },
];

/* Every control the live Settings tab actually has, in the order it has them.
   The values are made up; the controls are not. */
const CONNECTORS = [
  { name: "X", on: true, note: "@creatishhh · posting and replies" },
  { name: "Notion", on: true, note: "3 databases · synced 12 minutes ago" },
  { name: "Google Drive", on: false, note: "Read and write files he works on" },
  { name: "Google Calendar", on: true, note: "itish@gmail.com · watch live until Friday" },
  { name: "Spotify", on: false, note: "Play, pause and queue what you ask for" },
];

const SURFACES = [
  { label: "amazon.in", color: "#e8a33d", count: 14 },
  { label: "mail.google.com", color: "#c9544a", count: 11 },
  { label: "notion.so", color: "#6e6e73", count: 9 },
  { label: "linkedin.com", color: "#3b7bbf", count: 6 },
  { label: "makemytrip.com", color: "#34936a", count: 4 },
];

const AVATARS = [
  { id: "braino", name: "Braino", desc: "The original" },
  { id: "brainelle", name: "Brainelle", desc: "Her voice" },
  { id: "webb", name: "Webb", desc: "Web slinger" },
  { id: "ferro", name: "Ferro", desc: "Flight suit" },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`dd-sw${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

export default function DashboardDesign() {
  const [world, setWorld] = useState<World>("companion");
  const [tab, setTab] = useState<Tab>("overview");
  const [notesTab, setNotesTab] = useState<NotesTab>("all");
  const [tasksTab, setTasksTab] = useState<TasksTab>("all");
  const [memoryTab, setMemoryTab] = useState<MemoryTab>("all");
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

  const label = NAV[world].find((i) => i.key === tab)?.label ?? "Settings";

  const current = WORLDS.find((w) => w.key === world)!;

  return (
    <div className="dd">
      <header className="dd-head">
        {/* Him, the name, and the switch, all in the middle. Standing still:
            the walk cycle belongs to the mascot on the page, not to a logo. */}
        <div className="dd-head-brand">
          <span className="dd-mascot" aria-hidden dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
          <span className="dd-wordmark">Braino</span>
          <div className="dd-world" ref={worldRef}>
            <button
              type="button"
              className={`dd-world-btn${worldOpen ? " open" : ""}`}
              onClick={() => setWorldOpen((v) => !v)}
              aria-label="Switch between Companion and Foundry"
            >
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
        </div>

        <div className="dd-head-r">
          <div className="dd-search">
            <Search style={{ width: 15, height: 15 }} />
            <input placeholder="Search" />
            <span className="dd-kbd">/</span>
          </div>
          <button type="button" className="dd-btn solid">
            <Plus />
            New task
          </button>
        </div>
      </header>

      <div className="dd-shell">
        <aside className="dd-left">
          <div className="dd-world-tag">{current.name}</div>
          <h1 className="dd-hello">Good afternoon,<br />Itish.</h1>
          <div className="dd-hello-s">
            <b>Day 118</b> · last active 4 minutes ago
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

          <div className="dd-hero">
            <div className="dd-hero-l">Done for you this month</div>
            <div className="dd-hero-v">128</div>
            <div className="dd-hero-s">of 400 delegate runs · 32 hours back</div>
            <div className="dd-hero-bar"><div className="dd-hero-fill" style={{ width: "32%" }} /></div>
            <div className="dd-hero-rule">
              <span className="dd-me-av">I</span>
              <span>
                <div className="dd-me-n">Itish Pande</div>
                <div className="dd-me-p">Founding</div>
              </span>
            </div>
          </div>
        </aside>

        <div className="dd-right">
          {tab === "overview" ? (
            <Overview />
          ) : tab === "notes" ? (
            <Notes active={notesTab} onTab={setNotesTab} />
          ) : tab === "tasks" ? (
            <Tasks active={tasksTab} onTab={setTasksTab} />
          ) : tab === "memory" ? (
            <Memory active={memoryTab} onTab={setMemoryTab} />
          ) : tab === "settings" ? (
            <SettingsScreen />
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
        <div className="dd-grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="dd-card">
            <div className="dd-led-h">
              <span className="dd-led-t">This week</span>
              <span className="dd-pill good">On pace</span>
            </div>
            <div className="dd-led-r"><span className="dd-led-l">Tasks done</span><span className="dd-led-v">14</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Notes kept</span><span className="dd-led-v">3</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Hours listened</span><span className="dd-led-v">2.4</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Needed you</span><span className="dd-pill good">Once</span></div>
          </div>

          <div className="dd-card">
            <div className="dd-led-h">
              <span className="dd-led-t">This month</span>
              <span className="dd-pill warn">1 running</span>
            </div>
            <div className="dd-led-r"><span className="dd-led-l">Tasks done</span><span className="dd-led-v">128</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Finished alone</span><span className="dd-led-v">94%</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Median run</span><span className="dd-led-v">3m 12s</span></div>
            <div className="dd-led-r"><span className="dd-led-l">Longest lecture</span><span className="dd-led-v">51m</span></div>
          </div>
        </div>
      </section>

      <section className="dd-sec">
        <div className="dd-card">
          <div className="dd-led-h">
            <span className="dd-led-k">Where the 32 hours went</span>
          </div>
          <div className="dd-chips">
            <span className="dd-chip dd-pill good">48% Listening</span>
            <span className="dd-chip dd-pill cool">31% Delegate</span>
            <span className="dd-chip dd-pill plum">21% Research</span>
          </div>
          <div className="dd-why good">
            <div className="dd-why-t">Listening · 48%</div>
            <div className="dd-why-b">
              Nine lectures and four meetings, written up while you were still in the room. This is the
              largest share because it is the one thing he does that you cannot do at the same time as
              paying attention.
            </div>
          </div>
          <div className="dd-why cool">
            <div className="dd-why-t">Delegate · 31%</div>
            <div className="dd-why-b">
              128 runs across nine sites. 94 percent finished without coming back to ask you anything,
              which is the number worth watching: a run that needs you saved you nothing.
            </div>
          </div>
          <div className="dd-why plum">
            <div className="dd-why-t">Research · 21%</div>
            <div className="dd-why-b">
              Three deep work sessions, 41 sources apiece on average. Slower than the rest and meant to be.
            </div>
          </div>
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

function Tasks({ active, onTab }: { active: TasksTab; onTab: (t: TasksTab) => void }) {
  const rows = active === "all" ? AGENT_TASKS : AGENT_TASKS.filter((t) => t.state === active);
  return (
    <main className="dd-page">
      <section className="dd-sec">
        <div className="dd-tabs">
          {TASKS_TABS.map((t) => {
            const on = t.key === active;
            return (
              <button key={t.key} type="button" className={`dd-tab${on ? " on" : ""}`} onClick={() => onTab(t.key)}>
                {t.label}
                <span className="dd-tab-c">{t.count}</span>
                {on ? <span className="dd-tab-u" /> : null}
              </button>
            );
          })}
        </div>

        <div className="dd-card">
          <div className="dd-facts">
            <div>
              <div className="dd-fact-v">128</div>
              <div className="dd-fact-l">Done all time</div>
            </div>
            <div>
              <div className="dd-fact-v">94%</div>
              <div className="dd-fact-l">Finished without you</div>
            </div>
            <div>
              <div className="dd-fact-v">3m 12s</div>
              <div className="dd-fact-l">Median run</div>
            </div>
          </div>

          <div className="dd-rows">
            {rows.map((t) => (
              <div key={t.title} style={{ borderTop: "1px solid var(--line-2)", paddingTop: "var(--s2)", paddingBottom: "var(--s2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
                  <span className="dd-row-ic">
                    {t.state === "done" ? <CheckCircle2 /> : t.state === "running" ? <Loader /> : <Clock />}
                  </span>
                  <span className="dd-row-b">
                    <div className="dd-row-t">{t.title}</div>
                    <div className="dd-row-s">{t.where}</div>
                  </span>
                  <span className={`dd-tag${t.state === "running" ? " live" : ""}${t.state === "done" ? " ok" : ""}`}>
                    {t.state === "running" ? "Running" : t.state === "queued" ? "Queued" : "Done"}
                  </span>
                  <span className="dd-row-r">{t.when}</span>
                </div>
                {t.steps ? (
                  <div className="dd-steps">
                    {t.steps.map((s) => (
                      <div key={s.label} className={`dd-step ${s.state}`}>
                        {s.state === "done" ? <CheckCircle2 /> : s.state === "now" ? <Loader /> : <Circle />}
                        {s.label}
                        {s.took ? <span className="dd-step-d">{s.took}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Memory({ active, onTab }: { active: MemoryTab; onTab: (t: MemoryTab) => void }) {
  const rows = active === "all" ? MEMORIES : MEMORIES.filter((m) => m.kind === active);
  return (
    <main className="dd-page">
      <section className="dd-sec">
        <div className="dd-tabs">
          {MEMORY_TABS.map((t) => {
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

        <div className="dd-card" style={{ marginBottom: "var(--s2)" }}>
          <div className="dd-sec-h">
            <h2 className="dd-h2">What he should know about you</h2>
            <span className="dd-link">412 chars</span>
          </div>
          <textarea
            className="dd-area"
            defaultValue={"I am building Braino and studying at Mesa. I ship faster than I plan, so hold me to shipping rather than rebuilding. Keep answers short and say the answer first."}
            placeholder="Who are you, really? What are you building, what should he hold you to?"
          />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginTop: "var(--s2)" }}>
            <button type="button" className="dd-btn solid">Save</button>
            <span className="dd-hint">He reads this before everything else he does for you.</span>
          </div>
        </div>

        <div className="dd-card">
          {rows.map((m) => (
            <div className="dd-mem" key={m.text}>
              <span className="dd-mem-b">
                <div className="dd-mem-t">{m.text}</div>
                <div className="dd-mem-s">
                  <Globe style={{ width: 13, height: 13 }} />
                  {m.from}
                  <span className="dd-dot" />
                  {m.when}
                </div>
              </span>
              <button type="button" className="dd-forget">
                <XCircle style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                Forget
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SettingsScreen() {
  const [swear, setSwear] = useState(true);
  const [remember, setRemember] = useState(true);
  const [voice, setVoice] = useState("fish");
  const [avatar, setAvatar] = useState("braino");

  return (
    <main className="dd-page">
      <section className="dd-sec">
        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Profile</div>
            <div className="dd-group-d">How he refers to you, and the account everything is saved against.</div>
          </div>
          <div className="dd-list">
            <div className="dd-field">
              <label htmlFor="dd-name">Display name</label>
              <input id="dd-name" className="dd-input" defaultValue="Itish Pande" placeholder="Display name" />
            </div>
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">Email</div>
                <div className="dd-li-s">Used to sign in. Cannot be changed here.</div>
              </span>
              <span className="dd-li-v">itishpande21@gmail.com</span>
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Personality</div>
            <div className="dd-group-d">Two switches that change how he talks and what he keeps.</div>
          </div>
          <div className="dd-list">
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">Let him swear</div>
                <div className="dd-li-s">He stays himself either way. This only decides the language.</div>
              </span>
              <Switch on={swear} onClick={() => setSwear((v) => !v)} />
            </div>
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">Remember what you tell him</div>
                <div className="dd-li-s">Turning this off stops new memories. The 91 he has stay until you forget them.</div>
              </span>
              <Switch on={remember} onClick={() => setRemember((v) => !v)} />
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Voice and language</div>
            <div className="dd-group-d">
              Which voice he uses in live voice mode. Same realtime mechanism either way, only the speaking voice changes.
            </div>
          </div>
          <div className="dd-list">
            <button type="button" className={`dd-li tap${voice === "fish" ? " on" : ""}`} onClick={() => setVoice("fish")} style={{ width: "100%", border: 0, background: "none", textAlign: "left" }}>
              <span className="dd-li-b">
                <div className="dd-li-t">Fish Audio</div>
                <div className="dd-li-s">His default. Realtime listens, Fish Audio speaks.</div>
              </span>
              <span className="dd-radio" />
            </button>
            <button type="button" className={`dd-li tap${voice === "realtime" ? " on" : ""}`} onClick={() => setVoice("realtime")} style={{ width: "100%", background: "none", textAlign: "left" }}>
              <span className="dd-li-b">
                <div className="dd-li-t">Realtime AI</div>
                <div className="dd-li-s">OpenAI's native voice. Lowest latency, but it uses OpenAI audio output.</div>
              </span>
              <span className="dd-radio" />
            </button>
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">Language</div>
                <div className="dd-li-s">English (US)</div>
              </span>
              <span className="dd-tag">Soon</span>
            </div>
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">Speech rate</div>
                <div className="dd-li-s">1.0x, natural</div>
              </span>
              <span className="dd-tag">Soon</span>
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Choose your avatar</div>
            <div className="dd-group-d">Same voice, memory and actions underneath. This only changes which face turns up.</div>
          </div>
          <div className="dd-list">
            <div className="dd-avatars">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`dd-avatar${avatar === a.id ? " on" : ""}`}
                  onClick={() => setAvatar(a.id)}
                >
                  <span className="dd-avatar-n">{a.name}</span>
                  <span className="dd-avatar-d">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Connectors</div>
            <div className="dd-group-d">What he is allowed to reach on your behalf.</div>
          </div>
          <div className="dd-list">
            {CONNECTORS.map((c) => (
              <div className="dd-li" key={c.name}>
                <span className={`dd-conn${c.on ? " on" : ""}`} />
                <span className="dd-li-b">
                  <div className="dd-li-t">{c.name}</div>
                  <div className="dd-li-s">{c.note}</div>
                </span>
                <button type="button" className="dd-btn">{c.on ? "Reconnect" : "Connect"}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Braino contacts</div>
            <div className="dd-group-d">People he can message for you by name.</div>
          </div>
          <div className="dd-list">
            <div className="dd-li">
              <span className="dd-li-b">
                <div className="dd-li-t">No contacts saved yet</div>
                <div className="dd-li-s">Say "save Arjun as a contact" while you are talking to him.</div>
              </span>
              <button type="button" className="dd-btn"><Plus />Add</button>
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Delegate surfaces</div>
            <div className="dd-group-d">
              Per site permissions are coming. For now these are the domains your task history touches most.
            </div>
          </div>
          <div className="dd-list">
            {SURFACES.map((site) => (
              <div className="dd-li" key={site.label}>
                <span className="dd-swatch" style={{ background: site.color }} />
                <span className="dd-li-b"><div className="dd-li-t">{site.label}</div></span>
                <span className="dd-li-v">{site.count} tasks</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-group-h">
            <div className="dd-group-t">Plan</div>
            <div className="dd-group-d">Free plan. Delegate runs are capped, and your whole note history stays available.</div>
          </div>
          <div className="dd-list">
            <div className="dd-plan">
              <div className="dd-plan-tier">Free</div>
              <div className="dd-plan-price">$0</div>
              <div className="dd-plan-note">128 of 400 Delegate runs used this month.</div>
              <button type="button" className="dd-btn solid">Go Pro, $15 a month</button>
            </div>
          </div>
        </div>

        <div className="dd-group">
          <div className="dd-list">
            <button type="button" className="dd-li tap" style={{ width: "100%", background: "none", textAlign: "left" }}>
              <LogOut style={{ width: 16, height: 16 }} className="dd-danger" />
              <span className="dd-li-b"><div className="dd-li-t dd-danger">Sign out</div></span>
              <ChevronRight style={{ width: 16, height: 16, color: "var(--ink-4)" }} />
            </button>
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
