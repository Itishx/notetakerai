import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Command,
  Download,
  Plus,
  Settings2,
} from "lucide-react";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FEATURES, GRAPHICS } from "./UseCases";
import { motion } from "framer-motion";
import "./profile-grid.css";

// ─── Check / X icons (for comparison table) ──────────────────────────────────

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4L19 6" />
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// ─── Waveform ─────────────────────────────────────────────────────────────────

function MiniWaveform() {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      bars.current.forEach((b) => { if (b) b.style.height = `${6 + Math.random() * 22}px`; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="pg2-wave">
      {Array.from({ length: 24 }).map((_, i) => (
        <span key={i} ref={(el) => { bars.current[i] = el; }} />
      ))}
    </div>
  );
}

// ─── Delegate trace ───────────────────────────────────────────────────────────

const TRACE = [
  { label: "Read inbox thread", ms: "18ms" },
  { label: "Locate Priya's message", ms: "22ms" },
  { label: "Draft reply body", ms: "820ms" },
  { label: "Awaiting your approval", ms: "—" },
];

function DelegateTrace() {
  const [active, setActive] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % TRACE.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="pg2-trace">
      {TRACE.map((step, i) => {
        const done = i < active;
        const isActive = i === active;
        return (
          <div key={i} className={`pg2-trace__row${isActive ? " is-active" : done ? " is-done" : " is-idle"}`}>
            <span className="pg2-trace__dot">{done ? "✓" : ""}</span>
            <span className="pg2-trace__label">{step.label}</span>
            <span className="pg2-trace__ms">{step.ms}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hero browser mockup ──────────────────────────────────────────────────────

type TabId = "chat" | "record" | "delegate";
const TABS: { id: TabId; label: string }[] = [
  { id: "chat", label: "Page Chat" },
  { id: "record", label: "Record & Notes" },
  { id: "delegate", label: "Delegate" },
];

function BrowserMockup({ tab }: { tab: TabId }) {
  return (
    <div className="pg2-browser">
      <div className="pg2-browser__bar">
        <div className="pg2-browser__dots" aria-hidden="true"><span /><span /><span /></div>
        <div className="pg2-browser__url">
          {tab === "chat" && "github.com/braino/pull/184"}
          {tab === "record" && "youtube.com/watch?v=lecture-14"}
          {tab === "delegate" && "mail.google.com/inbox"}
        </div>
        <div className="pg2-browser__badge">Braino</div>
      </div>
      <div className="pg2-browser__body">
        {tab === "chat" && (
          <>
            <div className="pg2-doc">
              <div className="pg2-doc__eyebrow">Pull request · github.com</div>
              <h3 className="pg2-doc__title">Homepage redesign for production</h3>
              <div className="pg2-doc__lines">
                <div className="pg2-doc__line" style={{ width: "95%" }} />
                <div className="pg2-doc__line pg2-doc__line--accent" style={{ width: "80%" }} />
                <div className="pg2-doc__line" style={{ width: "90%" }} />
                <div className="pg2-doc__line" style={{ width: "65%" }} />
              </div>
            </div>
            <aside className="pg2-glass">
              <div className="pg2-glass__head">
                <span className="pg2-glass__status"><span />speaking</span>
                <button className="pg2-glass__pill">Voice</button>
              </div>
              <div className="pg2-bubble pg2-bubble--user">Give me the practical summary.</div>
              <div className="pg2-bubble pg2-bubble--ai">Swaps the old grid for a cinematic hero, tightens the CTA path, and keeps both themes intentional.</div>
            </aside>
          </>
        )}
        {tab === "record" && (
          <>
            <div className="pg2-record-panel">
              <div className="pg2-record-panel__top">
                <span className="pg2-record-led" />
                <span>Recording Lecture 14</span>
                <span className="pg2-record-panel__time">22:31</span>
              </div>
              <MiniWaveform />
              <div className="pg2-note-sheet">
                <div className="pg2-note-sheet__heading">Structured note</div>
                <div className="pg2-note-sheet__row pg2-note-sheet__row--strong">Three main ideas extracted</div>
                <div className="pg2-note-sheet__row">Glossary: tokens, gradients, cache</div>
                <div className="pg2-note-sheet__row">Follow-up: review hero spacing on mobile</div>
              </div>
            </div>
            <aside className="pg2-glass pg2-glass--slim">
              <div className="pg2-glass__head">
                <span className="pg2-glass__status"><span />parsing</span>
                <button className="pg2-glass__pill">Notes</button>
              </div>
              <div className="pg2-bubble pg2-bubble--ai">Transcript ready. Grouped into three sections with four exam-likely terms highlighted.</div>
            </aside>
          </>
        )}
        {tab === "delegate" && (
          <>
            <div className="pg2-task-card">
              <div className="pg2-task-card__label">Task request</div>
              <div className="pg2-task-card__copy">"Reply to Priya and tell her the deck will be there by 4 PM."</div>
            </div>
            <DelegateTrace />
            <aside className="pg2-glass pg2-glass--slim">
              <div className="pg2-glass__head">
                <span className="pg2-glass__status"><span />ready</span>
                <button className="pg2-glass__pill">Confirm</button>
              </div>
              <div className="pg2-bubble pg2-bubble--ai">Draft prepared. Found the correct thread. Waiting on your confirmation before sending.</div>
            </aside>
          </>
        )}
        <div className="pg2-browser__dock">
          <div className="pg2-browser__prompt">What should I handle from this page?</div>
          <div className="pg2-browser__orb">
            <img src="/favicon.svg" alt="Braino" width="44" height="44" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bento cards (user's exact design) ───────────────────────────────────────

const IntegrationCard = () => (
  <Card className="flex h-full flex-col">
    <CardHeader>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
        <span className="text-3xl" role="img" aria-label="sparkles">✳️</span>
      </div>
      <CardTitle>Notion Integration</CardTitle>
      <CardDescription>
        Send notes, transcripts, and task logs directly to Notion. One-click sync keeps everything organised without leaving the browser.
      </CardDescription>
    </CardHeader>
    <CardFooter className="mt-auto flex items-center justify-between">
      <Button variant="outline" size="sm">
        <Settings2 className="mr-2 h-4 w-4" />Configure
      </Button>
      <Switch className="data-[state=checked]:bg-orange-500" aria-label="Toggle integration" />
    </CardFooter>
  </Card>
);

const TrackersCard = () => (
  <Card className="h-full">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div>
        <CardTitle className="text-base font-medium">Pages Captured</CardTitle>
        <CardDescription>03 Active Sessions</CardDescription>
      </div>
      <div className="flex -space-x-2 overflow-hidden">
        <img className="inline-block h-8 w-8 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?w=100&q=80" alt="User 1" />
        <img className="inline-block h-8 w-8 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1550525811-e5869dd03032?w=100&q=80" alt="User 2" />
        <img className="inline-block h-8 w-8 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" alt="User 3" />
      </div>
    </CardContent>
  </Card>
);

const StatisticCard = () => (
  <Card className="relative h-full w-full overflow-hidden">
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#111 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
    <CardContent className="relative z-10 flex h-full items-center justify-center p-6">
      <span className="text-8xl font-bold" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>10X</span>
    </CardContent>
  </Card>
);

const FocusCard = () => (
  <Card className="h-full">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium">Delegate Speed</CardTitle>
          <CardDescription>vs screenshot agents</CardDescription>
        </div>
        <Badge variant="outline" className="border-orange-300 text-orange-600">~1s / step</Badge>
      </div>
      <div><span className="text-6xl font-bold">8×</span></div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Faster than Computer Use</span>
        <span>DOM-native</span>
      </div>
    </CardContent>
  </Card>
);

const ProductivityCard = () => (
  <Card className="h-full">
    <CardContent className="flex h-full flex-col justify-end p-6">
      <CardTitle className="text-base font-medium">Works on every tab.</CardTitle>
      <CardDescription>
        Articles, inboxes, dashboards, GitHub diffs, YouTube lectures — any URL is live context for Braino.
      </CardDescription>
    </CardContent>
  </Card>
);

const ShortcutsCard = () => (
  <Card className="h-full">
    <CardContent className="flex h-full flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <CardTitle className="text-base font-medium">Keyboard Shortcut</CardTitle>
        <CardDescription>Open Braino anywhere, instantly.</CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-background font-mono text-xs font-medium text-muted-foreground">
          <Command className="h-3 w-3" />
        </div>
        <Plus className="h-3 w-3 text-muted-foreground" />
        <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-background font-mono text-xs font-medium text-muted-foreground">B</div>
      </div>
    </CardContent>
  </Card>
);

// ─── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  const s: Record<string, React.CSSProperties> = {
    wrap: { background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", borderRadius: 24, overflow: "hidden", boxShadow: "0 1px 2px rgba(40,28,18,.04), 0 40px 80px -30px rgba(40,28,18,.25)" },
    browserBar: { height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: "linear-gradient(180deg, #F5EFE5, #EFE7DB)", borderBottom: "1px solid var(--sb-line-2)" },
    urlPill: { flex: 1, maxWidth: 480, margin: "0 auto", background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", borderRadius: 8, padding: "0 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--sb-ink-3)", display: "flex", alignItems: "center", gap: 6, height: 28 },
    inner: { display: "flex", minHeight: 600 },
    sidebar: { width: 228, flexShrink: 0, background: "var(--sb-panel)", borderRight: "1px solid var(--sb-line)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 },
    talkBtn: { display: "flex", alignItems: "center", gap: 8, borderRadius: 10, background: "var(--sb-ink)", padding: "10px 12px", marginBottom: 16, fontSize: 13, fontWeight: 500, color: "var(--sb-on-ink)" },
    sectionLabel: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "var(--sb-ink-3)", padding: "4px 8px" },
    main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--sb-bg)" },
    topbar: { height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", borderBottom: "1px solid var(--sb-line-2)", background: "rgba(246,241,234,0.88)", backdropFilter: "blur(12px)", flexShrink: 0 },
    body: { flex: 1, padding: "24px 28px", overflow: "hidden" },
  };

  const navItems = [
    { label: "Overview", icon: "⊞", active: true },
    { label: "Notes", icon: "📄", badge: "31" },
    { label: "Agent Tasks", icon: "⚡" },
    { label: "X Automation", icon: "𝕏", badge: "84" },
    { label: "Recordings", icon: "🎙", badge: "Soon", muted: true },
    { label: "Memory", icon: "⬡", badge: "5" },
  ];

  const stats = [
    { label: "Tasks done", val: "87", sub: "70% success rate", dark: true, spark: "0,22 25,18 50,24 75,10 100,16 125,8 150,14 175,4 200,10" },
    { label: "Total notes", val: "31", sub: "From lectures, meetings, page chat", spark: "0,22 25,20 50,16 75,20 100,12 125,18 150,10 175,14 200,8" },
    { label: "Tasks run", val: "124", sub: "+14 this month", spark: "0,24 25,20 50,22 75,14 100,18 125,10 150,16 175,8 200,12" },
    { label: "This month", val: "14", sub: "11 tasks left on free", spark: "0,26 25,24 50,20 75,22 100,16 125,18 150,12 175,10 200,8" },
  ];

  const notes = [
    { grad: "linear-gradient(135deg,#6B4E32,#8C5A3D)", sh: "LE", title: "Compiler Design — Lecture 14", meta: "lecture · 1h 12m", date: "Today", pill: "Lecture", pillBg: "#FEF3C7", pillC: "#92400E" },
    { grad: "linear-gradient(135deg,#DB4437,#C44033)", sh: "G", title: 'Reply to Priya — "ten minutes late"', meta: "mail.google.com · Delegate", date: "2h ago", pill: "Chat", pillBg: "#FEE2E2", pillC: "#991B1B" },
    { grad: "linear-gradient(135deg,#2B6CDF,#1E50B0)", sh: "MT", title: "Q2 product planning — 14 May", meta: "meeting · 48m", date: "Yesterday", pill: "Meeting", pillBg: "#DBEAFE", pillC: "#1E3A8A" },
    { grad: "linear-gradient(135deg,#E27D39,#C65E1E)", sh: "X", title: "X Automation — 12 tweets scheduled", meta: "x.com · automation", date: "Tue", pill: "X", pillBg: "#F0FDF4", pillC: "#166534" },
  ];

  return (
    <div style={s.wrap}>
      {/* Browser bar */}
      <div style={s.browserBar}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#E36F62","#E7B654","#74C28D"].map((c,i) => <span key={i} style={{ width:11,height:11,borderRadius:"50%",background:c,display:"inline-block" }} />)}
        </div>
        <div style={s.urlPill}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:.7 }}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <strong style={{ color:"var(--sb-ink-2)",fontWeight:500 }}>https://</strong>app.trybraino.com/dashboard
        </div>
        <img src="/favicon.svg" width={22} height={22} alt="Braino" />
      </div>

      <div style={s.inner}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={{ display:"flex",alignItems:"baseline",padding:"2px 8px 18px" }}>
            <span style={{ fontFamily:"'BeVietnam',sans-serif",fontWeight:800,fontSize:17,color:"var(--sb-ink)",letterSpacing:"-0.03em" }}>Braino</span>
          </div>
          <div style={s.talkBtn}>
            <span style={{ width:16,height:16,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",boxShadow:"0 0 8px rgba(243,154,66,0.6)",display:"inline-block",flexShrink:0 }} />
            <span>Talk to Braino</span>
            <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",borderRadius:4,background:"rgba(255,255,255,0.1)",padding:"1px 6px",fontSize:10,color:"rgba(255,255,255,0.6)" }}>⌘K</span>
          </div>
          <div style={s.sectionLabel}>Workspace</div>
          {navItems.map(({ label, active, muted, badge }) => (
            <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,fontSize:13,cursor:"default",background:active?"var(--sb-ink)":"transparent",color:active?"var(--sb-on-ink)":muted?"var(--sb-ink-3)":"var(--sb-ink-2)" }}>
              <span style={{ flex:1 }}>{label}</span>
              {badge && <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"1px 7px",borderRadius:999,background:active?"rgba(255,255,255,0.12)":muted?"var(--sb-bg-2)":"var(--sb-accent-soft)",color:active?"rgba(255,255,255,0.8)":muted?"var(--sb-ink-4)":"var(--sb-accent-deep)" }}>{badge}</span>}
            </div>
          ))}
          <div style={{ ...s.sectionLabel, paddingTop:12 }}>Library</div>
          {["Collections","Search","Highlights"].map(label => (
            <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,fontSize:13,cursor:"default",color:"var(--sb-ink-3)" }}>{label}</div>
          ))}
          {/* Upgrade card */}
          <div style={{ marginTop:"auto",borderTop:"1px solid var(--sb-line-2)",paddingTop:12 }}>
            <div style={{ borderRadius:14,background:"var(--sb-ink)",padding:"14px 14px 12px",marginBottom:10,color:"var(--sb-on-ink)" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".12em",textTransform:"uppercase" as const,color:"var(--sb-accent-2)",marginBottom:6 }}>FREE PLAN</div>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:15,lineHeight:1.2,marginBottom:10 }}>Go Pro for unlimited Delegate.</div>
              <div style={{ height:4,borderRadius:999,background:"rgba(255,255,255,0.1)",marginBottom:10,overflow:"hidden" }}>
                <div style={{ height:"100%",width:"56%",borderRadius:999,background:"var(--sb-accent)" }} />
              </div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRadius:999,background:"var(--sb-panel-2)",padding:"6px 0",fontSize:12,fontWeight:500,color:"var(--sb-ink)",cursor:"default" }}>Upgrade · $12/mo</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div style={s.main}>
          {/* Topbar */}
          <div style={s.topbar}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)",display:"flex",alignItems:"center",gap:6 }}>
              Braino <span style={{ color:"var(--sb-ink-4)" }}>/</span> <span style={{ fontWeight:500,color:"var(--sb-ink)" }}>Overview</span>
            </div>
            <div style={{ flex:1,maxWidth:360,display:"flex",alignItems:"center",gap:8,borderRadius:10,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:"6px 10px",fontSize:13,color:"var(--sb-ink-3)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search notes, tasks...</span>
              <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,borderRadius:4,border:"1px solid var(--sb-line-2)",background:"var(--sb-bg-2)",padding:"1px 5px" }}>⌘K</span>
            </div>
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,borderRadius:9,background:"var(--sb-ink)",padding:"6px 14px",fontSize:13,fontWeight:500,color:"var(--sb-on-ink)",cursor:"default" }}>
                + New task
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={s.body}>
            {/* Greeting */}
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:34,lineHeight:1.02,letterSpacing:"-0.03em",marginBottom:4 }}>
                  Good morning, <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>Itish.</em>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)" }}>Day 45 · last active 2m ago</div>
              </div>
              <div style={{ borderRadius:14,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",padding:"10px 16px",minWidth:190,flexShrink:0 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,textTransform:"uppercase" as const,letterSpacing:".06em",color:"var(--sb-ink-3)",display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span>Delegate this month</span><span style={{ color:"var(--sb-ink)" }}><strong>14</strong> / 25</span>
                </div>
                <div style={{ height:5,borderRadius:999,background:"var(--sb-bg-2)",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:"56%",borderRadius:999,background:"linear-gradient(90deg,var(--sb-accent),var(--sb-accent-deep))" }} />
                </div>
              </div>
            </div>

            {/* Dashboard tabs */}
            <div style={{ display:"flex",alignItems:"center",borderBottom:"1px solid var(--sb-line-2)",marginBottom:16 }}>
              {["Overview","Notes","Agent Tasks","X Automation","Settings"].map((lbl,i) => (
                <div key={lbl} style={{ position:"relative",display:"inline-flex",alignItems:"center",gap:6,padding:"9px 14px",fontSize:13,fontWeight:500,color:i===0?"var(--sb-ink)":"var(--sb-ink-3)",cursor:"default" }}>
                  {lbl}
                  {lbl==="X Automation" && <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,borderRadius:999,padding:"1px 7px",background:"var(--sb-bg-2)",color:"var(--sb-ink-3)" }}>84</span>}
                  {lbl==="Notes" && <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,borderRadius:999,padding:"1px 7px",background:"var(--sb-bg-2)",color:"var(--sb-ink-3)" }}>31</span>}
                  {i===0 && <span style={{ position:"absolute",bottom:-1,left:8,right:8,height:2,borderRadius:999,background:"var(--sb-ink)" }} />}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr 1fr",gap:10,marginBottom:14 }}>
              {stats.map(({ label, val, sub, dark, spark }, i) => (
                <div key={label} style={{ borderRadius:16,border:`1px solid ${dark?"var(--sb-ink)":"var(--sb-line-2)"}`,background:dark?"linear-gradient(180deg,var(--sb-ink) 0%,#2A211A 100%)":"var(--sb-panel-2)",padding:16,color:dark?"var(--sb-on-ink)":undefined }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase" as const,color:dark?"var(--sb-accent-2)":"var(--sb-ink-3)",marginBottom:8 }}>{label}</div>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:38,lineHeight:1,letterSpacing:"-0.03em",fontStyle:"italic",color:dark?"var(--sb-accent-2)":"var(--sb-accent-deep)",marginBottom:4 }}>{val}</div>
                  <div style={{ fontSize:12,color:dark?"rgba(255,255,255,0.55)":"var(--sb-ink-2)",marginBottom:10 }}>{sub}</div>
                  <svg height="24" width="100%" viewBox="0 0 200 28" preserveAspectRatio="none">
                    <polyline points={spark} fill="none" stroke={dark?"oklch(0.82 0.14 65)":"var(--sb-ink-3)"} strokeWidth="1.5"/>
                  </svg>
                </div>
              ))}
            </div>

            {/* Recent notes + in progress */}
            <div style={{ display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:10 }}>
              {/* Recent notes */}
              <div style={{ borderRadius:16,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"14px 18px 10px" }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:20,lineHeight:1 }}>Recent notes</div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)" }}>View all →</span>
                </div>
                {notes.map(({ grad, sh, title, meta, date, pill, pillBg, pillC }, i) => (
                  <div key={i} style={{ display:"grid",gridTemplateColumns:"30px 1fr auto auto",alignItems:"center",gap:10,padding:"10px 18px",borderTop:"1px solid var(--sb-line-2)" }}>
                    <div style={{ width:30,height:30,borderRadius:8,background:grad,display:"grid",placeItems:"center",color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,flexShrink:0 }}>{sh}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:500,color:"var(--sb-ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{title}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)",marginTop:2 }}>{meta}</div>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"2px 8px",borderRadius:999,background:pillBg,color:pillC,border:`1px solid ${pillC}22`,whiteSpace:"nowrap" }}>{pill}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)",whiteSpace:"nowrap" }}>{date}</span>
                  </div>
                ))}
              </div>

              {/* In progress */}
              <div style={{ borderRadius:16,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",padding:"14px 16px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:20,lineHeight:1,marginBottom:4 }}>
                  In <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>progress.</em>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)",marginBottom:12 }}>Live agent work</div>
                <div style={{ borderRadius:12,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:12,marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                    <span style={{ width:7,height:7,borderRadius:"50%",background:"var(--sb-accent)",animation:"sbPulse 1.6s infinite",display:"inline-block" }} />
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".12em",textTransform:"uppercase" as const,color:"var(--sb-accent-deep)" }}>Delegate · acting</span>
                    <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)" }}>just now</span>
                  </div>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:15,lineHeight:1.3,color:"var(--sb-ink)",marginBottom:10 }}>Reply to Marcus on LinkedIn</div>
                  <div style={{ display:"flex",gap:3,marginBottom:8 }}>
                    {[1,2,3,4,5].map(n=>(
                      <span key={n} style={{ height:3,flex:1,borderRadius:999,background:n<3?"var(--sb-accent)":n===3?"linear-gradient(90deg,var(--sb-accent),var(--sb-bg-2))":"var(--sb-bg-2)" }} />
                    ))}
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)" }}>linkedin.com · step 2 / 5</div>
                </div>
                <div style={{ borderRadius:12,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                    <span style={{ width:7,height:7,borderRadius:"50%",background:"#10B981",opacity:0.7,display:"inline-block" }} />
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".12em",textTransform:"uppercase" as const,color:"#047857" }}>Calm</span>
                  </div>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:15,color:"var(--sb-ink)",marginBottom:4 }}>No other live work.</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)" }}>Start a task from the extension or remote agent.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floating chat card UI (replicates the extension overlay) ────────────────

function FloatingChatCard() {
  return (
    <div className="pg2-fchat">
      {/* Head row: previous query pill + action buttons */}
      <div className="pg2-fchat__head">
        <span className="pg2-fchat__echo">where are we</span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {["Speak","Copy"].map(b => (
            <button key={b} className="pg2-fchat__hbtn">{b}</button>
          ))}
          <button className="pg2-fchat__hclose">✕</button>
        </div>
      </div>

      {/* Conversation body */}
      <div className="pg2-fchat__body">
        <p className="pg2-fchat__ai">
          You're on Spotify, inside your public playlist <strong>"SUN KISSES"</strong> by <strong>Itish</strong>.
          <br />Current track: <strong>"SUN KISSES" — Citizen</strong>
          <br />Playlist size: <strong>211 songs</strong>
          <br />Playlist vibe: warm pop/indie/alt, a lot of <strong>Fly By Midnight, Zaeden, RUUH, Mitraz, vaultboy, LAUV</strong>, that kind of orbit.
        </p>

        <span className="pg2-fchat__echo pg2-fchat__echo--sm">where are we</span>

        <p className="pg2-fchat__ai">
          Same spot: Spotify, your public playlist <strong>SUN KISSES</strong>. Currently playing{" "}
          <strong>"SUN KISSES" by Citizen</strong>.
          <br />If you meant location in a broader sense, you're going to have to be less cryptic than a moonlit ferry schedule.
        </p>
      </div>

      {/* Input bar */}
      <div className="pg2-fchat__foot">
        <span className="pg2-fchat__input-ghost">show other songs by the artist</span>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <button className="pg2-fchat__mode">⚡ Auto</button>
          <button className="pg2-fchat__send">↑</button>
        </div>
      </div>
    </div>
  );
}

// ─── In-page demo section (Spotify context + floating card) ──────────────────

const FAKE_TRACKS = [
  { n:6,  title:"Kho Gaye",                        artist:"RUUH, Adarsh Gourav, JOH", dur:"3:30" },
  { n:7,  title:"Casablanca",                       artist:"Fly By Midnight",           dur:"3:40" },
  { n:8,  title:"this is what forever feels like",  artist:"JVKE, Nick Jonas",          dur:"2:34" },
  { n:9,  title:"Aasa Kooda",                       artist:"Sai Abhyankkar",            dur:"3:35" },
  { n:10, title:"kya hua?",                         artist:"Zaeden, Abdul Hannan",      dur:"2:00" },
  { n:11, title:"pia <3",                           artist:"Zaeden",                    dur:"2:43" },
];

function InPageDemo() {
  return (
    <section className="pg2-inpage">
      <div className="pg2-shell">
        <div className="pg2-inpage__inner">
          {/* Left — description */}
          <div className="pg2-inpage__text">
            <div className="pg2-eyebrow" style={{ color:"rgba(255,250,244,0.38)" }}>What it looks like</div>
            <h2 className="pg2-inpage__title">Floating on the page.<br />Gone when you're done.</h2>
            <p className="pg2-inpage__body">
              A single card appears over whatever tab you're on. Ask, get your answer, close it.
              Braino never opens a new tab you didn't request or interrupts what you're doing.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
              {[
                "Reads the live page — not a screenshot",
                "Works on any URL you're already on",
                "One click to open, one to dismiss",
              ].map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14.5, color:"rgba(255,250,244,0.55)" }}>
                  <span style={{ color:"#28C840", flexShrink:0 }}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* Right — simulated Spotify page + floating card */}
          <div className="pg2-inpage__stage">
            {/* Fake page rows */}
            <div className="pg2-inpage__page">
              <div className="pg2-inpage__page-header">
                <div className="pg2-inpage__page-icon" />
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,250,244,0.88)" }}>SUN KISSES</div>
                  <div style={{ fontSize:11, color:"rgba(255,250,244,0.38)", fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>Itish · 211 songs</div>
                </div>
              </div>
              {FAKE_TRACKS.map(({ n, title, artist, dur }) => (
                <div key={n} className="pg2-inpage__row">
                  <span className="pg2-inpage__row-n">{n}</span>
                  <div className="pg2-inpage__row-thumb" />
                  <div className="pg2-inpage__row-info">
                    <div className="pg2-inpage__row-title">{title}</div>
                    <div className="pg2-inpage__row-artist">{artist}</div>
                  </div>
                  <span className="pg2-inpage__row-dur">{dur}</span>
                </div>
              ))}
            </div>
            {/* Braino card absolutely overlaid on the page rows */}
            <div className="pg2-inpage__card-wrap">
              <FloatingChatCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Animated feature graphics ───────────────────────────────────────────────

const CHAT_QA = [
  { q: "What's the key change in this PR?", a: "Swaps the old grid for a cinematic hero. Tightens the CTA path and adds glassmorphism throughout the sidebar." },
  { q: "Any breaking changes?", a: "No breaking changes — route structure stays the same. Only the visual layer is touched." },
];

function ChatAnimatedGraphic() {
  const [phase, setPhase] = useState<"q" | "typing" | "a">("q");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "q")      t = setTimeout(() => setPhase("typing"), 1600);
    else if (phase === "typing") t = setTimeout(() => setPhase("a"), 1300);
    else t = setTimeout(() => { setIdx(p => (p + 1) % CHAT_QA.length); setPhase("q"); }, 3500);
    return () => clearTimeout(t);
  }, [phase]);
  const qa = CHAT_QA[idx];
  return (
    <div className="pg2-anim-chat">
      <div className="pg2-anim-chat__page">
        <div className="pg2-anim-chat__eyebrow">Pull request · github.com/braino/pull/184</div>
        <div className="pg2-anim-chat__ptitle">Homepage redesign for production release</div>
        <div className="pg2-anim-chat__lines">
          {[100,88,75,92,60].map((w,i) => <div key={i} className="pg2-anim-chat__line" style={{ width:`${w}%` }} />)}
        </div>
        <div className="pg2-anim-chat__diff">
          <div className="add">+ CinematicHero component</div>
          <div className="add">+ glassmorphism sidebar</div>
          <div className="rem">- old grid layout</div>
          <div className="rem">- legacy CTA block</div>
        </div>
      </div>
      <div className="pg2-anim-chat__card">
        <div className="pg2-anim-chat__card-head">
          <span className="pg2-anim-chat__user-q">{qa.q}</span>
          <span className="pg2-anim-chat__live-dot" />
        </div>
        {phase === "typing" && <div className="pg2-anim-chat__typing"><span /><span /><span /></div>}
        {phase === "a" && <div className="pg2-anim-chat__ai-ans">{qa.a}</div>}
        <div className="pg2-anim-chat__input-row">
          <span>Ask anything about this page…</span>
          <div className="pg2-anim-chat__orb" />
        </div>
      </div>
    </div>
  );
}

const MTG_SPEAKERS = [
  { name: "Itish P.",  initials: "IP", bg: "linear-gradient(135deg,#6B4E32,#9B6B4A)" },
  { name: "Priya S.",  initials: "PS", bg: "linear-gradient(135deg,#2B6CDF,#1E50B0)" },
  { name: "Marcus R.", initials: "MR", bg: "linear-gradient(135deg,#1A7A4E,#0F5235)" },
];
const MTG_LINES = [
  { who: "Itish",  txt: "Let's lock the Q2 targets before Friday." },
  { who: "Priya",  txt: "The roadmap deck is ready — just needs sign-off." },
  { who: "Marcus", txt: "Should we push the launch to fit the audit?" },
];

function MeetingsAnimatedGraphic() {
  const [active, setActive] = useState(0);
  const [lines, setLines] = useState([MTG_LINES[0]]);
  useEffect(() => {
    const t = setInterval(() => {
      setActive(p => {
        const next = (p + 1) % MTG_SPEAKERS.length;
        setLines(prev => [...prev.slice(-2), MTG_LINES[next % MTG_LINES.length]]);
        return next;
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="pg2-anim-meet">
      <div className="pg2-anim-meet__hd">
        <span className="pg2-anim-meet__htitle">Q2 Product Planning</span>
        <span className="pg2-anim-meet__rec">● REC</span>
        <span className="pg2-anim-meet__time">48:12</span>
      </div>
      <div className="pg2-anim-meet__grid">
        {MTG_SPEAKERS.map((s, i) => (
          <div key={s.name} className={`pg2-anim-meet__tile${i === active ? " is-speaking" : ""}`}>
            <div className="pg2-anim-meet__av" style={{ background: s.bg }}>{s.initials}</div>
            <span className="pg2-anim-meet__nm">{s.name}</span>
            {i === active && (
              <div className="pg2-anim-meet__bars">
                {[0,1,2,3].map(j => <span key={j} style={{ animationDelay:`${j * 0.12}s` }} />)}
              </div>
            )}
          </div>
        ))}
        <div className="pg2-anim-meet__notes">
          <div className="pg2-anim-meet__notes-hd">Braino Notes</div>
          {["✓ Review Q2 targets","✓ Launch pushed 1 week","→ Priya sends deck by Fri"].map(n => (
            <div key={n} className="pg2-anim-meet__note">{n}</div>
          ))}
        </div>
      </div>
      <div className="pg2-anim-meet__tr">
        {lines.map((l, i) => (
          <div key={i} className="pg2-anim-meet__tr-row" style={{ opacity: i === lines.length - 1 ? 1 : 0.38 }}>
            <span className="pg2-anim-meet__tr-who">{l.who}</span>
            <span className="pg2-anim-meet__tr-txt">{l.txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DLG_STEPS = [
  { label: "Navigate to Gmail",      ms: "~45ms"  },
  { label: "Find thread — Priya S.", ms: "~80ms"  },
  { label: "Draft reply body",       ms: "~920ms" },
  { label: "Confirm and send?",      ms: "—"      },
];

function DelegateAnimatedGraphic() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(false);
  useEffect(() => {
    if (step < DLG_STEPS.length - 1) {
      const t = setTimeout(() => setStep(p => p + 1), 1600);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setDraft(true), 500);
    const t2 = setTimeout(() => { setStep(0); setDraft(false); }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);
  return (
    <div className="pg2-anim-dlg">
      <div className="pg2-anim-dlg__bar">
        <div className="pg2-anim-dlg__dots"><span /><span /><span /></div>
        <div className="pg2-anim-dlg__url">mail.google.com/inbox</div>
        <span className="pg2-anim-dlg__badge">Braino</span>
      </div>
      <div className="pg2-anim-dlg__task">
        <div className="pg2-anim-dlg__task-lbl">Task</div>
        <div className="pg2-anim-dlg__task-txt">"Reply to Priya — deck will be ready by 4 PM."</div>
      </div>
      <div className="pg2-anim-dlg__trace">
        {DLG_STEPS.map((s, i) => (
          <div key={i} className={`pg2-anim-dlg__step${i < step ? " is-done" : i === step ? " is-active" : " is-idle"}`}>
            <span className="pg2-anim-dlg__dot">{i < step ? "✓" : ""}</span>
            <span className="pg2-anim-dlg__lbl">{s.label}</span>
            <span className="pg2-anim-dlg__ms">{s.ms}</span>
          </div>
        ))}
      </div>
      {draft && (
        <div className="pg2-anim-dlg__draft">
          <div className="pg2-anim-dlg__draft-hd">Draft ready</div>
          <div className="pg2-anim-dlg__draft-txt">
            "Hi Priya — just wanted to let you know the deck will be with you by 4 PM today. Let me know if you need anything else!"
          </div>
          <div className="pg2-anim-dlg__draft-btns">
            <button className="pg2-anim-dlg__btn-send">Send ↑</button>
            <button className="pg2-anim-dlg__btn-edit">Edit</button>
          </div>
        </div>
      )}
    </div>
  );
}

const ANIMATED_GRAPHICS: Record<string, React.ComponentType> = {
  chat:     ChatAnimatedGraphic,
  meetings: MeetingsAnimatedGraphic,
  delegate: DelegateAnimatedGraphic,
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "What browsers does Braino support?", a: "Braino works on Chrome, Arc, Brave, and Edge — on Mac, Windows, and Linux. Firefox and Safari support is coming soon." },
  { q: "Is my browsing data private?", a: "Braino only reads the content of the page you're actively using when you ask it to. It does not run in the background, log your history, or send any page data without your explicit action." },
  { q: "How is Braino different from ChatGPT or other AI tools?", a: "Most AI tools require you to copy text and switch to a separate app. Braino sits directly on the page, reads the live DOM, and acts inside your browser. No copying, no context switching." },
  { q: "What does Delegate mode do?", a: "Delegate mode lets Braino operate your browser on your behalf — clicking, typing, navigating — while showing you a step-by-step trace and asking for confirmation before anything is sent." },
  { q: "Is there a free plan?", a: "Yes. Braino has a generous free tier with chat, recording, and basic delegate tasks. The Pro plan unlocks unlimited usage, voice mode, and advanced automations." },
  { q: "Can I use Braino for lectures and meetings?", a: "Absolutely. Start recording on any tab — YouTube, Zoom, Google Meet — and Braino captures audio, generates a structured transcript, and pulls out key points and action items automatically." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="pg2-faq-list">
      {FAQS.map((item, i) => (
        <div key={i} className={`pg2-faq-item${open === i ? " is-open" : ""}`}>
          <button className="pg2-faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{item.q}</span>
            <span className="pg2-faq-icon">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && <div className="pg2-faq-a">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfileGrid() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  useEffect(() => {
    const t = setInterval(() => {
      setActiveTab((prev) => {
        const idx = TABS.findIndex((t) => t.id === prev);
        return TABS[(idx + 1) % TABS.length].id;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="pg2">

      {/* ── Nav ── */}
      <header className="pg2-nav">
        <div className="pg2-shell pg2-nav__inner">
          <Link to="/home" className="pg2-brand">
            <img src="/favicon.svg" alt="Braino" width="26" height="26" />
            <strong>Braino</strong>
          </Link>
          <nav className="pg2-links" aria-label="Primary">
            <Link to="/use-cases">Use Cases</Link>
            <Link to="/delegate">Delegate</Link>
            <Link to="/premium">Pricing</Link>
            <Link to="/chat">Chat</Link>
          </nav>
          <div className="pg2-nav__ctas">
            <Link to="/auth" className="pg2-btn-ghost">Log in</Link>
            <a href={EXTENSION_DOWNLOAD_URL} download className="pg2-btn-primary">
              <Download size={15} />Sign up
            </a>
          </div>
        </div>
      </header>

      <main>

        {/* ══ HERO ══ */}
        <section className="pg2-shell pg2-hero">
          <div className="pg2-hero__text">
            <h1 className="pg2-hero__h1">
              Bringing intelligence<br />to every tab you open.
            </h1>
            <p className="pg2-hero__sub">
              Braino is a browser extension that puts AI directly on the page you're reading. Chat, record, delegate browser tasks — without switching apps.
            </p>
            <div className="pg2-hero__ctas">
              <a href={EXTENSION_DOWNLOAD_URL} download className="pg2-btn-accent pg2-btn-accent--lg">
                <Download size={16} />Install for Chrome
              </a>
              <Link to="/use-cases" className="pg2-btn-ghost pg2-btn-ghost--lg">
                Explore features <ArrowRight size={15} />
              </Link>
            </div>
            <div className="pg2-browsers-line">Chrome · Arc · Brave · Edge — Mac, Windows, Linux</div>
          </div>
          <div className="pg2-hero__product">
            <div className="pg2-tab-bar" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={activeTab === t.id}
                  className={`pg2-tab${activeTab === t.id ? " is-active" : ""}`}
                  onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <BrowserMockup tab={activeTab} />
          </div>
        </section>

        <InPageDemo />

        {/* ══ ALL FEATURES ══ */}
        <section className="pg2-section pg2-section--muted" id="features">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">What Braino does</div>
              <h2 className="pg2-section__title">Four modes. Every situation.</h2>
              <p className="pg2-section__sub">From a single article to a full browser session — Braino adapts to what you need, right where you need it.</p>
            </div>

            {FEATURES.map((feature, i) => {
              const AnimGraphic = ANIMATED_GRAPHICS[feature.id];
              const Graphic = AnimGraphic ?? GRAPHICS[feature.id];
              const flip = i % 2 !== 0;
              return (
                <div key={feature.id} className={`pg2-feature-row${flip ? " pg2-feature-row--flip" : ""}`}>
                  <motion.div
                    className="pg2-feature-row__text"
                    initial={{ opacity: 0, x: flip ? 60 : -60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="pg2-eyebrow">{feature.number} — {feature.name}</div>
                    <h3 className="pg2-feature-row__title">{feature.heading.replace("\n", " ")}</h3>
                    <p className="pg2-feature-row__body">{feature.description}</p>
                    <div className="pg2-chips">
                      {feature.chips.map((chip) => (
                        <span key={chip} className="pg2-chip">{chip}</span>
                      ))}
                    </div>
                    <ul className="pg2-usecases">
                      {feature.useCases.slice(0, 4).map(({ label, who }) => (
                        <li key={label}>
                          <span className="pg2-usecase__check">✓</span>
                          <span className="pg2-usecase__text">{label}</span>
                          <span className="pg2-usecase__who">{who}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                  <motion.div
                    className="pg2-feature-row__graphic"
                    initial={{ opacity: 0, x: flip ? -60 : 60, scale: 0.9 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                  >
                    <Graphic />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ DASHBOARD ══ */}
        <section className="pg2-section" id="dashboard">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">Dashboard</div>
              <h2 className="pg2-section__title">Everything you've done,<br />remembered.</h2>
              <p className="pg2-section__sub">Conversations, recordings, tasks, X automations, and memory — searchable, synced, yours.</p>
            </div>
            <DashboardMockup />
          </div>
        </section>

        {/* ══ BENTO FEATURES ══ */}
        <section className="pg2-section pg2-section--muted">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">Product features</div>
              <h2 className="pg2-section__title">One extension. Every mode<br />you need.</h2>
              <p className="pg2-section__sub">No new app. No tab-switching. Braino floats on whatever you're already looking at — reading it, acting on it, remembering it.</p>
            </div>
            <BentoGridShowcase
              integration={<IntegrationCard />}
              trackers={<TrackersCard />}
              statistic={<StatisticCard />}
              focus={<FocusCard />}
              productivity={<ProductivityCard />}
              shortcuts={<ShortcutsCard />}
            />
          </div>
        </section>

        {/* ══ SPEED COMPARISON ══ */}
        <section className="pg2-section" id="speed">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">Why it's fast</div>
              <h2 className="pg2-section__title">Most browser agents see your page through a camera.<br />Braino reads it like a developer.</h2>
              <p className="pg2-section__sub">Computer Use takes a screenshot and asks a vision model what to click — every step. Braino reads the live DOM directly. That difference compounds with every action.</p>
            </div>

            <div className="pg2-speed-grid">
              <div className="pg2-speed-card pg2-speed-card--braino">
                <h3 className="pg2-speed-card__name"><span className="pg2-speed-card__dot" />Braino</h3>
                <div className="pg2-speed-card__pace"><strong>~1s</strong> per step</div>
                {[{n:"1",label:"Read DOM elements + page text",ms:"~20ms"},{n:"2",label:"Action decision",ms:"~800ms"},{n:"3",label:"Execute click / type / navigate",ms:"~150ms"}].map(({n,label,ms})=>(
                  <div key={n} className="pg2-speed-row">
                    <span className="pg2-speed-row__num">{n}</span>
                    <span className="pg2-speed-row__label">{label}</span>
                    <span className="pg2-speed-row__ms">{ms}</span>
                  </div>
                ))}
                <div className="pg2-speed-card__total"><span>5-step task</span><em>~8–12s</em></div>
              </div>

              <div className="pg2-speed-card pg2-speed-card--dark">
                <h3 className="pg2-speed-card__name"><span className="pg2-speed-card__dot pg2-speed-card__dot--muted" />Claude Computer Use</h3>
                <div className="pg2-speed-card__pace" style={{ opacity: 0.6 }}><strong>~6s</strong> per step</div>
                {[{n:"1",label:"Take full-page screenshot",ms:"~400ms"},{n:"2",label:"Send screenshot to vision model",ms:"~2000ms"},{n:"3",label:"Decide action from pixels",ms:"~600ms"},{n:"4",label:"Execute action",ms:"~150ms"},{n:"5",label:"Wait for render, repeat",ms:"~3000ms"}].map(({n,label,ms})=>(
                  <div key={n} className="pg2-speed-row pg2-speed-row--dark">
                    <span className="pg2-speed-row__num">{n}</span>
                    <span className="pg2-speed-row__label">{label}</span>
                    <span className="pg2-speed-row__ms">{ms}</span>
                  </div>
                ))}
                <div className="pg2-speed-card__total" style={{ opacity: 0.6 }}><span>5-step task</span><em>~30–40s</em></div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="pg2-compare-table">
              {[
                { feature: "How they compare", us: "Braino", them: "Computer Use", isHeader: true },
                { feature: "Step decision time", us: "~1s", them: "~6s" },
                { feature: "Page understanding", us: "DOM + text", them: "Screenshot pixels" },
                { feature: "Works on any site", us: "check", them: "check" },
                { feature: "Available free", us: "check", them: "x" },
                { feature: "Works from your phone", us: "check", them: "x" },
                { feature: "Handles complex visual UIs", us: "x", them: "check" },
                { feature: "Backed by Anthropic", us: "x", them: "check" },
                { feature: "Built by a solo founder", us: "check", them: "x" },
              ].map(({ feature, us, them, isHeader }, i) => (
                <div key={i} className={`pg2-compare-row${isHeader ? " pg2-compare-row--head" : ""}`}>
                  <div className="pg2-compare-row__feat">{feature}</div>
                  {[us, them].map((val, j) => (
                    <div key={j} className="pg2-compare-row__val">
                      {val === "check" ? <span className="pg2-check"><CheckIcon /></span>
                        : val === "x" ? <span className="pg2-x"><XIcon /></span>
                        : val}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section className="pg2-section pg2-section--muted" id="how">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">Getting started</div>
              <h2 className="pg2-section__title">Three steps. Then it's yours.</h2>
              <p className="pg2-section__sub">Install once, sign in, and your agent is live on every tab across devices.</p>
            </div>
            <div className="pg2-steps">
              {[
                { n: "01", title: "Install the extension.", body: "Add Braino to Chrome, Arc, Brave, or Edge. Sign in or create a free account — takes 30 seconds, no card required." },
                { n: "02", title: "Open any page.", body: "Articles, inboxes, GitHub diffs, YouTube lectures, dashboards — anything in a tab becomes live context." },
                { n: "03", title: "Click the brain.", body: "Your agent wakes up inline. Chat, record, delegate — it knows exactly where you are and acts accordingly." },
              ].map(({ n, title, body }) => (
                <article key={n} className="pg2-step">
                  <div className="pg2-step__num">{n}</div>
                  <h3 className="pg2-step__title">{title}</h3>
                  <p className="pg2-step__body">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PRICING ══ */}
        <section className="pg2-section" id="pricing">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">Pricing</div>
              <h2 className="pg2-section__title">Free forever. Pro when you want more.</h2>
              <p className="pg2-section__sub">Braino works in your browser. The model runs on us. Pro buys faster models, more Delegate tasks, and unlimited recording.</p>
            </div>
            <div className="pg2-pricing-grid">
              <div className="pg2-pricing-card">
                <div className="pg2-pricing-card__tier">Free</div>
                <div className="pg2-pricing-card__price">$0<span>/ forever</span></div>
                <p className="pg2-pricing-card__sub">Everything you need to talk to your browser. No credit card.</p>
                <ul className="pg2-pricing-card__list">
                  {["Voice mode with live captions","Read & summarize any page","25 Delegate tasks per month","5 hours of recording per month","Dashboard & library"].map(f=>(
                    <li key={f}><span className="pg2-check"><CheckIcon /></span>{f}</li>
                  ))}
                </ul>
                <a href={EXTENSION_DOWNLOAD_URL} download className="pg2-btn-ghost" style={{ alignSelf:"flex-start" }}>Install free</a>
              </div>
              <div className="pg2-pricing-card pg2-pricing-card--pro">
                <div className="pg2-pricing-card__tier">Pro</div>
                <div className="pg2-pricing-card__price">$12<span>/ month</span></div>
                <p className="pg2-pricing-card__sub">For people who actually live in their browser. Pay yearly, save 20%.</p>
                <ul className="pg2-pricing-card__list">
                  {["Everything in Free","Faster, smarter models","Unlimited Delegate tasks","Unlimited recording & transcription","Custom voices & languages","Priority support"].map(f=>(
                    <li key={f}><span className="pg2-check"><CheckIcon /></span>{f}</li>
                  ))}
                </ul>
                <Link to="/premium" className="pg2-btn-invert" style={{ alignSelf:"flex-start" }}>Start Pro <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <section className="pg2-section pg2-section--muted" id="faq">
          <div className="pg2-shell">
            <div className="pg2-section__head">
              <div className="pg2-eyebrow">FAQ</div>
              <h2 className="pg2-section__title">Common questions.</h2>
            </div>
            <FAQ />
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="pg2-section">
          <div className="pg2-shell">
            <div className="pg2-cta__inner">
              <div className="pg2-eyebrow">Start for free</div>
              <h2 className="pg2-cta__title">Install Braino. Talk to the web.</h2>
              <p className="pg2-cta__body">Free during beta. Sign up in 30 seconds. Everything you save is tied to your account, forever.</p>
              <div className="pg2-cta__actions">
                <a href={EXTENSION_DOWNLOAD_URL} download className="pg2-btn-accent pg2-btn-accent--lg">
                  <Download size={16} />Install for Chrome
                </a>
                <Link to="/chat" className="pg2-btn-ghost pg2-btn-ghost--lg">
                  <Bot size={15} />Try Braino Chat
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ══ FOOTER ══ */}
      <footer className="pg2-footer">
        <div className="pg2-shell">
          <div className="pg2-footer__top">
            <div className="pg2-footer__brand-block">
              <div className="pg2-footer__brand">
                <img src="/favicon.svg" alt="Braino" width="22" height="22" />
                <strong>Braino</strong>
              </div>
              <p className="pg2-footer__tagline">An AI agent that floats on every tab. Reads pages. Speaks back. Handles tasks.</p>
              <a href={EXTENSION_DOWNLOAD_URL} download className="pg2-btn-accent" style={{ alignSelf:"flex-start" }}>
                <Download size={14} />Add to Chrome — it's free
              </a>
            </div>
            <div className="pg2-footer__cols">
              <div className="pg2-footer__col">
                <div className="pg2-footer__col-head">Product</div>
                <Link to="/use-cases">Use Cases</Link>
                <Link to="/delegate">Delegate</Link>
                <Link to="/premium">Pricing</Link>
                <Link to="/changelog">Changelog</Link>
                <Link to="/compare">Compare</Link>
              </div>
              <div className="pg2-footer__col">
                <div className="pg2-footer__col-head">Resources</div>
                <Link to="/chat">Braino Chat</Link>
                <Link to="/integrations">Integrations</Link>
                <Link to="/remote-agent">Remote Agent</Link>
                <Link to="/contact">Contact</Link>
              </div>
              <div className="pg2-footer__col">
                <div className="pg2-footer__col-head">Legal</div>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="pg2-footer__bottom">
            <span>© 2026 Braino · Built by a solo founder, somewhere with good coffee.</span>
            <span>v5.14.0 · Beta</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
