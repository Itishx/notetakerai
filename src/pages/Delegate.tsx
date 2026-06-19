import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

// ─── shared styles ────────────────────────────────────────────────────────────
const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "0 32px" };
const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)",
  display: "inline-flex", alignItems: "center", gap: 8,
};
const pip: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block",
};

// ─── animated trace ───────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    prompt: "Send an email to Priya saying I'll be ten minutes late",
    steps: [
      { label: "Open mail.google.com", ms: "~20ms" },
      { label: 'Search contacts for "Priya"', ms: "~800ms" },
      { label: "Click Compose", ms: "~150ms" },
      { label: "Type subject + body", ms: "~300ms" },
      { label: "Confirm before send", ms: "—" },
    ],
  },
  {
    prompt: "Find boAt Airdopes on Amazon and check reviews",
    steps: [
      { label: "Navigate to Amazon.in", ms: "~20ms" },
      { label: 'Search "boAt Airdopes"', ms: "~150ms" },
      { label: "Open first result", ms: "~150ms" },
      { label: "Extract review summary", ms: "~600ms" },
    ],
  },
  {
    prompt: "Book a 10am team standup on Google Calendar for tomorrow",
    steps: [
      { label: "Open Google Calendar", ms: "~20ms" },
      { label: "Click new event", ms: "~150ms" },
      { label: "Fill title, date, time", ms: "~400ms" },
      { label: "Save event", ms: "~150ms" },
    ],
  },
];

function DelegateTrace({ steps }: { steps: { label: string; ms: string }[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((step, i) => {
        const isDone = i < active;
        const isCurrent = i === active;
        const isPending = i > active;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 12,
            background: isCurrent ? "oklch(0.97 0.025 75)" : "var(--sb-panel)",
            border: `1px solid ${isCurrent ? "oklch(0.85 0.1 70)" : "var(--sb-line-2)"}`,
            opacity: isPending ? 0.45 : 1, transition: "all .35s",
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              display: "grid", placeItems: "center",
              background: isDone ? "var(--sb-ok)" : isCurrent ? "transparent" : "var(--sb-line)",
              color: isDone ? "#fff" : "transparent",
              border: isCurrent ? "1.5px solid var(--sb-accent)" : "none",
              borderTopColor: isCurrent ? "transparent" : undefined,
              animation: isCurrent ? "sbSpin .9s linear infinite" : "none",
              fontSize: 9,
            }}>{isDone ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 13, color: "var(--sb-ink)" }}>{step.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>{step.ms}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Delegate() {
  const [activeExample, setActiveExample] = useState(0);
  const ex = EXAMPLES[activeExample];

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "140px 0 100px" }}>
        <div style={{ ...wrap, maxWidth: 900, textAlign: "center" }}>
          <span style={eyebrow}><span style={pip} /> SideBrain Delegate</span>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400, fontSize: "clamp(44px,6vw,80px)", lineHeight: 1.0,
            letterSpacing: "-0.025em", margin: "14px auto 24px", maxWidth: 800,
          }}>
            Hand it the keys to{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>your browser.</em>
          </h1>
          <p style={{ fontSize: 18, color: "var(--sb-ink-2)", maxWidth: 620, margin: "0 auto 48px", lineHeight: 1.55 }}>
            Tell Delegate what you want done — in plain language — and it operates your tabs the way you would. Clicks, types, scrolls, navigates. With your supervision, or on its own.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/#install"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 24px", borderRadius: 999, fontSize: 14.5, fontWeight: 500,
                background: "var(--sb-ink)", color: "var(--sb-on-ink)", textDecoration: "none",
                transition: "transform .15s, background .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#000"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "var(--sb-ink)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
              Try Delegate free
            </Link>
            <Link
              to="/compare"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 24px", borderRadius: 999, fontSize: 14.5, fontWeight: 500,
                background: "transparent", color: "var(--sb-ink)",
                border: "1px solid var(--sb-line)", textDecoration: "none",
                transition: "transform .15s, background .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "var(--sb-panel)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "transparent"; }}
            >
              See how it compares
            </Link>
          </div>
        </div>
      </section>

      {/* Live trace demo */}
      <section style={{ padding: "80px 0", background: "var(--sb-bg-2)" }}>
        <div style={wrap}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <div>
              <span style={eyebrow}><span style={pip} /> Live example</span>
              <h2 style={{
                fontFamily: "'Instrument Serif',serif", fontWeight: 400,
                fontSize: "clamp(28px,3vw,44px)", lineHeight: 1.1, margin: "12px 0 24px",
              }}>Watch it think and act.</h2>
              <p style={{ fontSize: 15, color: "var(--sb-ink-2)", marginBottom: 32, lineHeight: 1.55 }}>
                Pick a task and watch Delegate break it down step by step — exactly what you'd see in the side panel.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveExample(i)}
                    style={{
                      padding: "14px 18px", borderRadius: 14, textAlign: "left",
                      background: activeExample === i ? "var(--sb-ink)" : "var(--sb-panel-2)",
                      border: `1px solid ${activeExample === i ? "var(--sb-ink)" : "var(--sb-line-2)"}`,
                      color: activeExample === i ? "var(--sb-on-ink)" : "var(--sb-ink)",
                      fontSize: 14, cursor: "pointer", transition: "all .2s",
                      fontFamily: "'Instrument Serif',serif",
                    }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, display: "block", marginBottom: 4, opacity: 0.6 }}>YOU SAY</span>
                    "{ex.prompt}"
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", borderRadius: 22, padding: 24, boxShadow: "0 1px 2px rgba(40,28,18,.04), 0 20px 50px -20px rgba(40,28,18,.15)" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 16 }}>Delegate trace</div>
              <DelegateTrace key={activeExample} steps={ex.steps} />
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--sb-line)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>
                <span>{ex.steps.length} steps</span>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: "var(--sb-accent-deep)", fontStyle: "italic" }}>~{ex.steps.length * 2}s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "110px 0" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={eyebrow}><span style={pip} /> How it works</span>
            <h2 style={{
              fontFamily: "'Instrument Serif',serif", fontWeight: 400,
              fontSize: "clamp(32px,4vw,52px)", lineHeight: 1.05, margin: "12px auto 0", maxWidth: 700,
            }}>Three steps from words to action.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {[
              { num: "01", title: "Type in plain language.", body: "Switch to Delegate mode and describe what you want. No commands, no syntax — just plain English." },
              { num: "02", title: "It reads the page and plans.", body: "Delegate scans buttons, inputs, links, and forms — and figures out the exact sequence of actions needed." },
              { num: "03", title: "It acts, step by step.", body: "Clicks, types, navigates, submits. Watch it work in real time. Stop it any time." },
            ].map(({ num, title, body }) => (
              <div key={num} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 18, padding: 28 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 52, lineHeight: 1, color: "var(--sb-accent-deep)", marginBottom: 16 }}>{num}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 22, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12 things it handles well */}
      <section style={{ padding: "80px 0 100px", background: "var(--sb-bg-2)" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={eyebrow}><span style={pip} /> What it handles</span>
            <h2 style={{
              fontFamily: "'Instrument Serif',serif", fontWeight: 400,
              fontSize: "clamp(28px,3.5vw,48px)", lineHeight: 1.05, margin: "12px auto 0", maxWidth: 640,
            }}>
              12 things it does <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>well.</em>
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}>
            {[
              { icon: "✉️", title: "Send & reply to emails", detail: "Gmail, Outlook — compose, find threads, reply in context." },
              { icon: "📅", title: "Book calendar events", detail: "Google Calendar — create, invite, set reminders." },
              { icon: "🛒", title: "Search & compare products", detail: "Amazon, Flipkart — open listings, extract specs and reviews." },
              { icon: "📝", title: "Fill & submit forms", detail: "Job applications, sign-ups, multi-step checkouts." },
              { icon: "✈️", title: "Find flights & hotels", detail: "MakeMyTrip, Google Flights — filter, compare, copy details." },
              { icon: "💼", title: "Post on LinkedIn / X", detail: "Draft, preview, and post — no copy-paste needed." },
              { icon: "🛍️", title: "Add to cart & checkout", detail: "Navigates product pages, selects variants, proceeds to pay." },
              { icon: "📄", title: "Edit Google Docs & Sheets", detail: "Update cells, add rows, format documents by instruction." },
              { icon: "🔍", title: "Research & extract data", detail: "Reads any page and pulls out the facts you ask for." },
              { icon: "📁", title: "Download files & attachments", detail: "Locates and triggers downloads without you hunting." },
              { icon: "🐙", title: "Navigate GitHub", detail: "Browse issues, PRs, diffs — summarise and act on them." },
              { icon: "🔐", title: "Multi-step sign-up flows", detail: "Handles email verify, profile fill, preference setup." },
            ].map(({ icon, title, detail }) => (
              <div
                key={title}
                style={{
                  background: "var(--sb-panel-2)",
                  border: "1px solid var(--sb-line-2)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
                  <span style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400, fontSize: 17, lineHeight: 1.2,
                  }}>{title}</span>
                </div>
                <p style={{
                  fontSize: 13, color: "var(--sb-ink-2)", lineHeight: 1.5, margin: 0,
                  paddingLeft: 32,
                }}>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why DOM-first */}
      <section style={{ padding: "80px 0 110px", background: "var(--sb-bg)" }}>
        <div style={wrap}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {[
              { title: "DOM-first, not pixel-first.", body: "Reads the live structure of the page. No screenshots, no waiting for vision models to look at pixels. Every button and input comes back as an indexed element — the model acts against what is actually on screen." },
              { title: "About 1 second per step.", body: 'From "decide" to "click." A five-step task finishes in under fifteen seconds. Compare that to screenshot-based agents that spend 3–6s every step just waiting for a vision model.' },
              { title: "Always on the page you're on.", body: "You can watch it work, correct it mid-task, or let it go. Your call. Nothing happens behind your back — Delegate asks before submitting forms or sending messages." },
              { title: "Works on any site.", body: "Gmail, Amazon, LinkedIn, Google Docs, GitHub, your company's internal tools. If your browser can open it, Delegate can operate it." },
            ].map(({ title, body }) => (
              <div key={title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: "var(--sb-accent-soft)", border: "1px solid rgba(240,168,107,0.35)", display: "grid", placeItems: "center", color: "var(--sb-accent-deep)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
                </div>
                <div>
                  <h4 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 20, marginBottom: 8 }}>{title}</h4>
                  <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 0", background: "var(--sb-bg)", borderTop: "1px solid var(--sb-line-2)" }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 0, textDecoration: "none" }}>
            <span style={{ fontFamily: "'TNR','Times New Roman',serif", fontStyle: "italic", fontWeight: 400, fontSize: 18, color: "var(--sb-ink)" }}>side</span>
            <span style={{ fontFamily: "'BeVietnam',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--sb-ink)", letterSpacing: "-0.03em" }}>brain</span>
          </Link>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>© 2026 SideBrain · Beta</div>
        </div>
      </footer>
    </div>
  );
}
