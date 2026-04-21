import { Mic, Download, ChevronRight, Leaf, ArrowRight, Users, Globe, Bot, Zap, FileText, CheckCircle2, XCircle, Clock, NotebookText, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SideBrainLogo from "@/components/SideBrainLogo";

const pillars = [
  {
    num: "01",
    icon: Mic,
    title: "Record Tab Audio",
    tagline: "Any tab. Any audio. Structured notes in seconds.",
    pipeline: ["Record", "Transcribe", "Structure", "Sync to Notion"],
    useCases: ["Online lectures", "Podcasts", "Language learning", "Research talks"],
  },
  {
    num: "02",
    icon: Globe,
    title: "Read Any Page",
    tagline: "SideBrain reads the page. You ask the questions.",
    pipeline: ["Open any URL", "Understand context", "Chat in real time"],
    useCases: ["LeetCode problems", "Documentation", "News articles", "Academic papers"],
  },
  {
    num: "03",
    icon: Users,
    title: "Record Meetings",
    tagline: "Multi-speaker calls, auto-documented.",
    pipeline: ["Record call", "Identify speakers", "AI meeting notes", "Sync to Notion"],
    useCases: ["Google Meet", "Zoom web", "Teams", "Sales calls"],
  },
];

// ─── Dashboard Mockup Components ─────────────────────────────────────────────

function MockBadge({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "green" | "orange" | "red" | "blue" }) {
  const cls = {
    default: "bg-muted/60 text-muted-foreground border-border/40",
    green: "bg-green-500/10 text-green-600 border-green-500/20",
    orange: "bg-primary/10 text-primary border-primary/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }[color];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>{children}</span>;
}

function MockStatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="border border-border/50 rounded-xl p-3 bg-card/60 flex flex-col gap-1.5">
      <div className="text-muted-foreground/60">{icon}</div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function OverviewMockup() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <MockStatCard value="12" label="Total Notes" icon={<FileText className="w-3 h-3" />} />
        <MockStatCard value="47" label="Tasks Run" icon={<Bot className="w-3 h-3" />} />
        <MockStatCard value="8" label="This Month" icon={<Clock className="w-3 h-3" />} />
        <MockStatCard value="41" label="Tasks Done" icon={<CheckCircle2 className="w-3 h-3" />} />
      </div>
      {/* Recent Notes */}
      <div className="border border-border/50 rounded-xl p-3 bg-card/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5"><NotebookText className="w-3 h-3 text-muted-foreground" />Recent Notes</span>
          <span className="text-[10px] text-muted-foreground/50">View all →</span>
        </div>
        <div className="flex flex-col gap-1">
          {[
            { title: "Microeconomics — Week 7", badge: "Lecture", time: "2h ago" },
            { title: "Startup product review call", badge: "Meeting", time: "Yesterday" },
            { title: "React Server Components deep dive", badge: "Chat", time: "2d ago" },
          ].map(n => (
            <div key={n.title} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
              <FileText className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-[11px] text-foreground flex-1 truncate">{n.title}</span>
              <MockBadge>{n.badge}</MockBadge>
              <span className="text-[10px] text-muted-foreground/40">{n.time}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Recent Tasks */}
      <div className="border border-border/50 rounded-xl p-3 bg-card/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5"><Bot className="w-3 h-3 text-muted-foreground" />Recent Agent Tasks</span>
          <span className="text-[10px] text-primary/60">New task →</span>
        </div>
        <div className="flex flex-col gap-1">
          {[
            { task: "Book flights Mumbai → Goa for next Friday", status: "done" as const },
            { task: "Search biryani places near Koregaon Park", status: "done" as const },
            { task: "Find 3BHK apartments in Baner under 40k", status: "error" as const },
          ].map(c => (
            <div key={c.task} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/30 bg-background/40">
              <span className="text-[11px] text-foreground flex-1 truncate">{c.task}</span>
              <MockBadge color={c.status === "done" ? "green" : "red"}>{c.status === "done" ? "Done" : "Error"}</MockBadge>
            </div>
          ))}
        </div>
      </div>
      {/* Notion */}
      <div className="border border-border/50 rounded-xl px-3 py-2.5 bg-card/40 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        <span className="text-[11px] text-foreground">Notion</span>
        <span className="text-[10px] text-muted-foreground">Connected · My Workspace</span>
      </div>
    </div>
  );
}

function NotesMockup() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 border border-border/50 rounded-full px-3 py-1.5 bg-card/60">
          <div className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground/50">Search notes...</span>
        </div>
        <div className="flex gap-1">
          {["All", "Lecture", "Meeting", "Chat"].map((f, i) => (
            <span key={f} className={`text-[10px] px-2.5 py-1 rounded-full border ${i === 0 ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground/60"}`}>{f}</span>
          ))}
        </div>
      </div>
      {/* Notes list */}
      <div className="flex flex-col gap-2 flex-1">
        {[
          { title: "Microeconomics — Week 7 Lecture", source: "nptel.ac.in", badge: "Lecture", time: "2h ago" },
          { title: "Startup product review call", source: "Google Meet", badge: "Meeting", time: "Yesterday" },
          { title: "React Server Components — deep dive", source: "react.dev", badge: "Chat", time: "2d ago" },
          { title: "Design patterns for mobile apps", source: "YouTube", badge: "Lecture", time: "4d ago" },
          { title: "Fintech startup investor call", source: "Zoom", badge: "Meeting", time: "1w ago" },
        ].map(n => (
          <div key={n.title} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card/40 hover:bg-muted/30 cursor-pointer">
            <FileText className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{n.title}</p>
              <p className="text-[10px] text-muted-foreground/50 truncate">{n.source}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <MockBadge>{n.badge}</MockBadge>
              <span className="text-[10px] text-muted-foreground/40">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksMockup() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 flex-wrap">
        {["All", "Done", "Error", "Running"].map((f, i) => (
          <span key={f} className={`text-[10px] px-2.5 py-1 rounded-full border ${i === 0 ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground/60"}`}>{f}</span>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[
          { task: "Book flights Mumbai → Goa for next Friday", status: "done" as const, steps: ["Navigate to MakeMyTrip", "Enter flight details", "Results loaded"] },
          { task: "Search biryani places near Koregaon Park", status: "done" as const, steps: ["Navigate to Zomato", "Search biryani", "Listed top results"] },
          { task: "Open Gmail and compose to team@acme.co", status: "done" as const, steps: ["Navigate to Gmail compose", "Filled recipient + body"] },
          { task: "Find 3BHK apartments in Baner under ₹40k", status: "error" as const, steps: ["Navigate to 99acres", "Filters applied — no results"] },
        ].map((c, i) => (
          <div key={i} className="border border-border/40 rounded-xl overflow-hidden">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate">{c.task}</p>
              </div>
              <MockBadge color={c.status === "done" ? "green" : "red"}>{c.status === "done" ? "Done" : "Error"}</MockBadge>
              <ChevronRight className={`w-3 h-3 text-muted-foreground/40 flex-shrink-0 transition-transform ${open === i ? "rotate-90" : ""}`} />
            </button>
            {open === i && (
              <div className="border-t border-border/40 bg-muted/10 px-3 py-2 flex flex-col gap-1">
                {c.steps.map(s => (
                  <div key={s} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsMockup() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
      {/* Profile */}
      <div className="border border-border/50 rounded-xl p-3 bg-card/40">
        <p className="text-[10px] font-semibold text-foreground mb-2.5">Profile</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-semibold flex-shrink-0">I</div>
          <div>
            <p className="text-[11px] font-medium text-foreground">Itish Pande</p>
            <p className="text-[10px] text-muted-foreground">itishpande21@gmail.com</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 border border-border/50 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground bg-background/60">Itish Pande</div>
          <div className="border border-border/50 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground bg-card/60">Save</div>
        </div>
      </div>
      {/* Notion */}
      <div className="border border-border/50 rounded-xl p-3 bg-card/40">
        <p className="text-[10px] font-semibold text-foreground mb-2">Notion</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] text-foreground">My Workspace</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">Manage</span>
        </div>
      </div>
      {/* Plan */}
      <div className="border border-border/50 rounded-xl p-3 bg-card/40 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-foreground">Plan</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Free plan — limited agent tasks</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" />Upgrade
        </span>
      </div>
    </div>
  );
}

const dashTabs = [
  {
    id: "overview",
    label: "Overview",
    icon: <NotebookText className="w-3.5 h-3.5" />,
    headline: "Everything at a glance",
    desc: "Your personal command centre. See how many notes you've captured, how many browser tasks you've run, your success rate, and what's happened most recently — all in one quick scroll.",
    points: [
      "4 live stat cards pulled from your real data",
      "Last 5 notes with source site and use-case badge",
      "Last 5 agent tasks with status (done / error)",
      "Notion connection status with one-click setup",
    ],
    mockup: <OverviewMockup />,
  },
  {
    id: "notes",
    label: "Notes",
    icon: <FileText className="w-3.5 h-3.5" />,
    headline: "Every note, searchable",
    desc: "Every session you've ever recorded or chatted through lives here. Search by title, filter by type — lecture, meeting, chat, general — and click any note to read the full AI-generated markdown in a clean modal.",
    points: [
      "Full-text search across all note titles",
      "Filter by use case: Lecture, Meeting, Chat, General",
      "Click to open a full-screen rendered markdown view",
      "Copy markdown or sync to Notion directly from the modal",
    ],
    mockup: <NotesMockup />,
  },
  {
    id: "tasks",
    label: "Agent Tasks",
    icon: <Bot className="w-3.5 h-3.5" />,
    headline: "Your agent's full history",
    desc: "Every task you've ever delegated is here. Expand any row to see the exact steps the agent took — which pages it navigated, what it clicked, where it succeeded or failed. Filter by status to diagnose errors.",
    points: [
      "Complete history of all delegated browser tasks",
      "Expand each task to see step-by-step agent actions",
      "Filter by Done, Error, Running, or Pending",
      "Result message shown when task finishes",
    ],
    mockup: <TasksMockup />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="w-3.5 h-3.5" />,
    headline: "Account and connections",
    desc: "Edit your display name, manage your Notion connection, see your plan, and sign out — everything in one tidy place without digging through menus.",
    points: [
      "Edit display name — updates everywhere instantly",
      "Notion connection status with manage / connect links",
      "Plan badge with one-click upgrade for free users",
      "Sign out from the same page",
    ],
    mockup: <SettingsMockup />,
  },
];

// Sidepanel UI shell used in mockups
function SidepanelShell({ children, ctx }: { children: React.ReactNode; ctx?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#e8dfd3] shadow-xl" style={{ background: "#f5f1eb", fontFamily: "Inter, sans-serif", width: "100%", maxWidth: 340 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8dfd3]" style={{ background: "#f5f1eb" }}>
        <span className="text-[13px] font-semibold tracking-tight" style={{ color: "#1a1410" }}>
          <span style={{ fontWeight: 400, fontStyle: "italic" }}>side</span><span>brain</span>
        </span>
        <div className="flex gap-1.5">
          {[...Array(3)].map((_, i) => <span key={i} className="w-5 h-5 rounded-full border border-[#e8dfd3] flex items-center justify-center" style={{ background: "#fffdf9" }} />)}
        </div>
      </div>
      {/* Page context chip */}
      {ctx && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl border border-[#e8dfd3] flex items-center gap-2.5" style={{ background: "#fffdf9" }}>
          <span className="w-4 h-4 rounded bg-gradient-to-br from-red-400 to-red-600 flex-shrink-0 text-white text-[9px] font-bold flex items-center justify-center">G</span>
          <span className="text-[11px] truncate" style={{ color: "#4b413a" }}>{ctx}</span>
          <span className="ml-auto flex items-center gap-1 text-[9px] font-mono" style={{ color: "#c2692a" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />reading
          </span>
        </div>
      )}
      {/* Content */}
      <div className="px-3 py-3 flex flex-col gap-2 min-h-[220px]">{children}</div>
      {/* Bottom bar */}
      <div className="border-t border-[#e8dfd3] px-3 py-2.5 flex items-center gap-2" style={{ background: "#f5f1eb" }}>
        <span className="flex-1 rounded-full border border-[#e8dfd3] px-3 py-1.5 text-[11px]" style={{ color: "#8a7f75", background: "#fffdf9" }}>Ask anything…</span>
        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#1a1410" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </span>
      </div>
    </div>
  );
}

function RecordMockup() {
  return (
    <SidepanelShell>
      <div className="flex flex-col items-center gap-3 py-4">
        {/* Orb */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #ffd9a8, #f39a42 50%, #d96e1a 80%)", boxShadow: "0 0 30px rgba(243,154,66,0.55), 0 0 60px rgba(243,154,66,0.2)", animation: "orbBreathe 3.8s ease-in-out infinite" }} />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "#c2692a" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Recording — 04:32
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-full text-[11px] border border-[#e8dfd3] cursor-pointer" style={{ background: "#fffdf9", color: "#4b413a" }}>Pause & Save</span>
          <span className="px-3 py-1.5 rounded-full text-[11px] border border-[#e8dfd3] opacity-40" style={{ color: "#8a7f75" }}>Convert to Notes</span>
        </div>
      </div>
      <div className="rounded-xl border border-[#e8dfd3] px-3 py-2.5" style={{ background: "#fffdf9" }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "#c2692a" }}>Transcribing</p>
        <p className="text-[11px] leading-relaxed" style={{ color: "#4b413a" }}>
          "…and that's why attention mechanisms allow the model to weigh each token's relationship to every other token in the sequence simultaneously…"
        </p>
      </div>
    </SidepanelShell>
  );
}

function ReadMockup() {
  return (
    <SidepanelShell ctx="leetcode.com — Two Sum">
      <div className="flex justify-end">
        <span className="px-3 py-1.5 rounded-2xl rounded-br-sm text-[11px] leading-relaxed" style={{ background: "#1a1410", color: "#f5f1eb" }}>What's the time complexity?</span>
      </div>
      <div className="flex gap-2 items-start">
        <span className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: "radial-gradient(circle at 35% 35%, #ffd9a8, #f39a42 50%, #d96e1a 80%)" }} />
        <span className="px-3 py-1.5 rounded-2xl rounded-bl-sm text-[11px] leading-relaxed flex-1" style={{ background: "#fffdf9", border: "1px solid #e8dfd3", color: "#4b413a" }}>
          O(n) with a hash map — single pass. Store each number's complement as you iterate.
        </span>
      </div>
      <div className="flex justify-end">
        <span className="px-3 py-1.5 rounded-2xl rounded-br-sm text-[11px]" style={{ background: "#1a1410", color: "#f5f1eb" }}>Give me a hint to start</span>
      </div>
      <div className="flex gap-2 items-start">
        <span className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: "radial-gradient(circle at 35% 35%, #ffd9a8, #f39a42 50%, #d96e1a 80%)" }} />
        <span className="px-3 py-1.5 rounded-2xl rounded-bl-sm text-[11px] leading-relaxed flex-1" style={{ background: "#fffdf9", border: "1px solid #e8dfd3", color: "#4b413a" }}>
          For each number, think about what value you'd need to reach the target. Have you seen that value before?
        </span>
      </div>
    </SidepanelShell>
  );
}

function MeetingMockup() {
  return (
    <SidepanelShell ctx="Google Meet — Sprint Planning">
      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono" style={{ color: "#4b9a6a" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        2 speakers · live
      </div>
      {[
        { s: "Alex", t: "We should ship the redesign by Friday." },
        { s: "Priya", t: "Agreed. I'll handle QA on Thursday." },
        { s: "Alex", t: "Perfect. Let's sync tomorrow at 10." },
        { s: "Priya", t: "I'll send a calendar invite after this." },
      ].map(({ s, t }) => (
        <div key={t} className={`flex gap-2 items-start ${s === "Priya" ? "flex-row-reverse" : ""}`}>
          <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-semibold mt-0.5" style={{ background: s === "Alex" ? "#1a1410" : "#f39a42", color: "#fff" }}>{s[0]}</span>
          <span className="px-2.5 py-1.5 rounded-xl text-[11px] leading-snug" style={{ background: "#fffdf9", border: "1px solid #e8dfd3", color: "#4b413a", maxWidth: "80%" }}>{t}</span>
        </div>
      ))}
      <div className="mt-1 flex gap-2 text-[10px]" style={{ color: "#8a7f75" }}>
        <span>✓ Action items extracted</span><span>✓ Summary ready</span>
      </div>
    </SidepanelShell>
  );
}

function DelegateMockup() {
  const steps = [
    { done: true,    text: "Navigated to Gmail inbox" },
    { done: true,    text: "Found email from Priya" },
    { done: true,    text: "Opened compose window" },
    { done: false,   text: "Drafting reply…", active: true },
    { done: false,   text: "Send email", active: false },
  ];
  return (
    <SidepanelShell ctx="mail.google.com — Inbox (24)">
      {/* Task bubble */}
      <div className="flex justify-end">
        <span className="px-3 py-1.5 rounded-2xl rounded-br-sm text-[11px] leading-relaxed" style={{ background: "#1a1410", color: "#f5f1eb" }}>
          Reply to Priya's email about the launch date
        </span>
      </div>
      {/* Agent thinking */}
      <div className="flex gap-2 items-start">
        <span className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: "radial-gradient(circle at 35% 35%, #ffd9a8, #f39a42 50%, #d96e1a 80%)" }} />
        <div className="flex-1 rounded-2xl rounded-bl-sm px-3 py-2" style={{ background: "#fffdf9", border: "1px solid #e8dfd3" }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#c2692a" }}>● Agent working</p>
          <div className="flex flex-col gap-1.5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                {s.done
                  ? <span className="text-green-500 text-[10px]">✓</span>
                  : s.active
                    ? <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                    : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#e8dfd3" }} />
                }
                <span className="text-[11px]" style={{ color: s.done ? "#4b413a" : s.active ? "#c2692a" : "#8a7f75" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidepanelShell>
  );
}

const pillarMockupComponents = [<RecordMockup />, <ReadMockup />, <MeetingMockup />];

function ThreeThingsSection() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("tt-visible"); }),
      { threshold: 0.15 }
    );
    itemRefs.current.filter(Boolean).forEach(el => observer.observe(el!));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="three-things" className="container mx-auto px-6 py-24">
      <div className="max-w-5xl mx-auto mb-20 text-center">
        <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          SideBrain does<br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>3 things</em>
        </h2>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col gap-24">
        {pillars.map((pillar, i) => (
          <div
            key={pillar.title}
            ref={el => { itemRefs.current[i] = el; }}
            className={`tt-item flex flex-col md:flex-row items-center gap-12 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
          >
            {/* Left: text */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-muted-foreground/30 tracking-widest">{pillar.num}</span>
              <h3 className="text-3xl md:text-4xl font-normal text-foreground mt-2 mb-4 leading-snug tracking-tight">{pillar.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6">{pillar.tagline}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {pillar.useCases.map(uc => (
                  <span key={uc} className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground bg-background/60">{uc}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {pillar.pipeline.map((step, si) => (
                  <span key={step} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/60">{step}</span>
                    {si < pillar.pipeline.length - 1 && <span className="text-border/50 text-xs">→</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: sidepanel mockup */}
            <div className="flex-shrink-0 flex justify-center w-full md:w-auto">
              {pillarMockupComponents[i]}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .tt-item { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .tt-item.tt-visible { opacity: 1; transform: translateY(0); }
        @keyframes orbBreathe { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.06); } }
      `}</style>
    </section>
  );
}

function DashboardShowcase() {
  const [active, setActive] = useState("overview");
  const tab = dashTabs.find(t => t.id === active)!;

  return (
    <section className="container mx-auto px-6 py-24">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">Dashboard</p>
          <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.15]">
            Your SideBrain,<br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>at a glance</em>
          </h2>
          <p className="mt-5 text-muted-foreground text-base max-w-xl mx-auto leading-relaxed">
            Sign in once and you get a personal dashboard — notes, agent history, account settings, all in one place. No digging around.
          </p>
        </div>

        {/* Tab selector row */}
        <div className="flex items-center gap-1 mb-8 border border-border/50 rounded-full p-1 bg-card/40 w-fit mx-auto">
          {dashTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full transition-all duration-200 ${active === t.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Main panel: left explanation + right mockup */}
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-6 items-start">

          {/* Left: explanation */}
          <div className="flex flex-col gap-5 py-2">
            <div>
              <h3 className="text-2xl font-normal text-foreground mb-3 leading-snug">{tab.headline}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tab.desc}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {tab.points.map(p => (
                <div key={p} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0 mt-1.5" />
                  <span className="text-sm text-muted-foreground">{p}</span>
                </div>
              ))}
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 mt-2 text-sm text-primary hover:gap-3 transition-all duration-300 w-fit"
            >
              Open your dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: mockup */}
          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden shadow-sm" style={{ minHeight: 420 }}>
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/20">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-background/60 border border-border/40 rounded-md px-3 py-1 text-[10px] text-muted-foreground/50 font-mono">
                  sidebrain.app/dashboard
                </div>
              </div>
            </div>
            {/* Fake dashboard header */}
            <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Good evening, Itish</p>
                <p className="text-[10px] text-muted-foreground">Free plan</p>
              </div>
              <div className="flex gap-1">
                {dashTabs.map(t => (
                  <span key={t.id} className={`text-[10px] px-2.5 py-1 rounded-full border ${t.id === active ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground/60"}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
            {/* Tab content */}
            <div style={{ minHeight: 340 }}>
              {tab.mockup}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const Index = () => {
  const handleDownload = () => {
    fetch("/sidebrain-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "sidebrain-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert("Extension not yet packaged. Please check back soon."));
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-muted-foreground mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Leaf className="w-3.5 h-3.5 text-primary" />
            Browser AI · Free to start
          </div>

          {/* Headline with orb */}
          <div className="relative">
            {/* Orb cluster A — main, drifts slowly */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift 25s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full animate-breathe"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 50% / 0.12) 0%, hsl(24 80% 50% / 0.04) 50%, transparent 70%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full animate-breathe"
                style={{ animationDelay: '1.5s', background: 'radial-gradient(circle, hsl(24 80% 50% / 0.15) 0%, hsl(24 80% 50% / 0.05) 60%, transparent 75%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[140px] h-[140px] rounded-full animate-breathe"
                style={{ animationDelay: '0.8s', background: 'radial-gradient(circle, hsl(24 80% 50% / 0.25) 0%, hsl(24 80% 50% / 0.08) 60%, transparent 80%)', boxShadow: '0 0 60px 20px hsl(24 80% 50% / 0.1)' }}
              />
            </div>
            {/* Orb B — roams opposite direction, slower */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-b 32s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[260px] h-[260px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 50% / 0.10) 0%, hsl(24 80% 50% / 0.03) 55%, transparent 75%)', animation: 'breathe 6s ease-in-out infinite', animationDelay: '2s' }}
              />
            </div>
            {/* Orb C — small, fast, top-right arc */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-c 18s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[100px] h-[100px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 60% / 0.35) 0%, hsl(24 80% 50% / 0.10) 60%, transparent 80%)', boxShadow: '0 0 40px 10px hsl(24 80% 50% / 0.12)', animation: 'breathe 4s ease-in-out infinite', animationDelay: '1s' }}
              />
            </div>
            {/* Orb D — large, faint, bottom-left sweep */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-d 38s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[380px] h-[380px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 70% 45% / 0.08) 0%, transparent 65%)', animation: 'breathe 8s ease-in-out infinite', animationDelay: '3s' }}
              />
            </div>

            <h1 className="relative z-10 text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Your browser,
              <br />
              <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>made smarter</em>
            </h1>
          </div>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Record tab audio. Read any page. Document meetings. Now control your browser with plain language. SideBrain is the AI layer that lives in your sidebar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <Button
              onClick={handleDownload}
              className="h-13 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Extension
            </Button>
            <Button
              variant="ghost"
              className="h-13 px-8 text-base text-muted-foreground hover:text-foreground transition-colors duration-300"
              onClick={() => document.getElementById("three-things")?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn more
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="mt-14 flex items-center justify-center gap-8 text-muted-foreground/60 text-sm opacity-0 animate-fade-in flex-wrap" style={{ animationDelay: "0.8s" }}>
            <span>Record Tab Audio</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Read Any Page</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Record Meetings</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-primary flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> Browser Agent</span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Three Things */}
      <ThreeThingsSection />


      {/* Delegate */}
      <section className="container mx-auto px-6 py-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-14">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-muted-foreground/30 tracking-widest">04</span>
              <span className="text-xs px-2.5 py-1 rounded-full border border-primary/20 text-primary/60 bg-primary/5">Premium · Experimental</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-foreground leading-snug mb-4">
              And one more thing —<br />
              <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>your browser obeys now</em>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6">
              Type a plain task. Delegate reads the page, clicks buttons, fills forms, and navigates — all from your sidebar. Works from your phone too.
            </p>
            <div className="flex flex-col gap-2 mb-8">
              {["Send emails via Gmail", "Navigate to any website", "Search flights & fill forms", "Control remotely from your phone"].map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <span className="text-xs text-green-500 flex-shrink-0">✓</span>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Link to="/delegate" className="inline-flex items-center gap-2 text-sm text-primary hover:gap-3 transition-all duration-300">
                See Delegate <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/premium" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors">
                What's in Premium →
              </Link>
            </div>
          </div>

          {/* Right: agent running mockup */}
          <div className="flex-shrink-0 flex justify-center w-full md:w-auto">
            <DelegateMockup />
          </div>
        </div>
      </section>

      {/* Dashboard showcase */}
      <DashboardShowcase />

      {/* Install */}
      <section className="container mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-10 md:p-14 max-w-2xl mx-auto">
          <h2 className="text-2xl text-foreground mb-8">Getting started</h2>
          <ol className="space-y-5 text-muted-foreground">
            {[
              "Download and unzip the extension file",
              <>Open <code className="px-2 py-1 rounded-md bg-muted text-foreground text-sm">chrome://extensions</code></>,
              <>Enable <strong className="text-foreground font-normal">Developer mode</strong></>,
              <>Click <strong className="text-foreground font-normal">Load unpacked</strong> → select the folder</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-xs text-muted-foreground/60">
            Works with Chrome, Edge, Brave, Arc, and all Chromium browsers.
          </p>
        </div>
      </section>


      {/* CTA */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <h2 className="text-3xl md:text-5xl font-normal text-foreground mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Ready to capture what matters?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Turn your next lecture, meeting, or podcast into structured notes. One click to Notion.
        </p>
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={handleDownload}
            className="h-13 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Extension
          </Button>
          <p className="mt-5 text-xs text-muted-foreground/50">Free · Sign up in seconds · Works on all Chromium browsers</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 mx-4 md:mx-8 mb-8 rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {/* Footer links */}
        <div className="px-10 md:px-16 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center">
              <SideBrainLogo sizeClass="text-sm" />
            </div>

            {/* Nav columns */}
            <div className="flex gap-16 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground/50 text-xs tracking-widest uppercase">Product</span>
                <Link to="/use-cases" className="text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
                <Link to="/delegate" className="text-muted-foreground hover:text-foreground transition-colors">Delegate</Link>
                <Link to="/notion-sync" className="text-muted-foreground hover:text-foreground transition-colors">Notion Sync</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground/50 text-xs tracking-widest uppercase">Install</span>
                <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Chrome</a>
                <span className="text-muted-foreground">Edge / Brave / Arc</span>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground/40">
              © {new Date().getFullYear()} SideBrain. All rights reserved.
            </p>
          </div>
        </div>

        {/* Big watermark */}
        <div className="pb-2 overflow-hidden select-none pointer-events-none border-t border-border/40 pt-4 text-center">
          <SideBrainLogo sizeClass="text-[80px] md:text-[120px] lg:text-[160px]" className="leading-none text-foreground/5 footer-watermark tracking-tight -mb-4" />
        </div>
      </footer>
    </div>
  );
};

export default Index;
