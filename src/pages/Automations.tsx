import { Zap, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const steps = [
  "Install Braino and sign in at trybraino.com.",
  "Go to X (twitter.com) — your timeline, any tab.",
  'Open the Braino bar (click the brain or press ⌘I), hit "X Auto".',
  "Braino reads each eligible tweet, skips ads and political posts, writes a human reply, and posts at most one reply per minute during an active session.",
  'Hit "⏹ Stop" in the brain card at any time to pause.',
];

const coming = [
  { emoji: "💼", name: "LinkedIn Auto-Comment", desc: "Engage posts in your feed with thoughtful, on-topic comments." },
  { emoji: "📧", name: "Gmail Auto-Reply Drafts", desc: "Draft replies to unread emails and queue them for your approval." },
  { emoji: "🔴", name: "Reddit Auto-Comment", desc: "Jump into threads in your subreddits with value-adding replies." },
];

export default function Automations() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="container mx-auto px-6 pt-32 pb-20 text-center max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/60 mb-6 font-medium">Automations</p>
        <h1
          className="text-4xl md:text-6xl font-normal tracking-tight leading-[1.1] mb-6"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Outreach on{" "}
          <em className="text-primary" style={{ fontStyle: "italic" }}>autopilot.</em>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          Braino runs repeatable workflows while you focus on building. First up: X auto-reply — engage your timeline with more human-sounding replies, safer pacing, and live stats synced back to your dashboard.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get the extension
        </Link>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* X Automation card */}
      <section className="container mx-auto px-6 py-20 max-w-3xl">
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-4 p-8 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center text-background flex-shrink-0">
              <XIcon />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground text-lg">X Timeline Auto-Reply</div>
              <div className="text-sm text-muted-foreground mt-0.5">Replies to posts in your timeline with one-minute pacing, 3-hour sessions, and synced session stats.</div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border border-green-500/20 text-green-600/80 bg-green-500/5 flex-shrink-0">Live</span>
          </div>

          {/* Steps */}
          <div className="p-8 flex flex-col gap-5">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
              </div>
            ))}
          </div>

          {/* Note strip */}
          <div className="mx-8 mb-8 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-5 py-4">
            <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sessions run for <strong className="text-foreground">3 hours</strong> and pace themselves at <strong className="text-foreground">one reply per minute</strong>. Builder-invite posts can mention{" "}
              <strong className="text-foreground">trybraino.com</strong>, while promoted posts, political posts, and duplicate-looking drafts are filtered out before posting.
            </p>
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section className="container mx-auto px-6 pb-32 max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6 font-medium">Coming soon</p>
        <div className="flex flex-col gap-3">
          {coming.map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-4 p-5 rounded-2xl border border-border/40 bg-card/20 opacity-60 cursor-default"
            >
              <span className="text-2xl">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
