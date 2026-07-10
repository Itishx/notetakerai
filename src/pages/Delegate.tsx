import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import "./home.css";

/* ============================================================================
   Delegate — the Braino agent, in the editorial (Medium-style) shell.
   Same structure as Home: Navbar + <article className="home-article"> sections
   (eyebrow -> h2 -> serif body) + shared SiteFooter. The interactive trace demo
   is kept from the old page; everything else is rebuilt in the home.css idiom.
   ============================================================================ */

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
    prompt: "Find boAt Airdopes on Amazon and check the reviews",
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

const STEPS = [
  { num: "01", title: "Say it in plain words.", body: "Flip on Delegate and describe the outcome. No commands, no syntax, none of that prompt-engineering nonsense. Just tell him what you'd tell a sharp assistant." },
  { num: "02", title: "He reads the page and plans.", body: "Braino scans the live page — every button, field, link and form — and works out the exact sequence of moves to get you there." },
  { num: "03", title: "He acts, and you watch.", body: "Click, type, navigate, submit. Live, in the tab in front of you. Stop him any time, and he checks in before anything actually gets sent." },
];

const HANDLES = [
  { icon: "✉️", title: "Send & reply to emails", detail: "Gmail, Outlook — composes, finds the thread, replies in context." },
  { icon: "📅", title: "Book calendar events", detail: "Google Calendar — creates, invites, sets the reminders." },
  { icon: "🛒", title: "Search & compare products", detail: "Amazon, Flipkart — opens listings, pulls specs and reviews." },
  { icon: "📝", title: "Fill & submit forms", detail: "Job applications, sign-ups, multi-step checkouts." },
  { icon: "✈️", title: "Find flights & hotels", detail: "MakeMyTrip, Google Flights — filters, compares, copies details." },
  { icon: "💼", title: "Post on LinkedIn / X", detail: "Drafts, previews, posts. No copy-paste shuffle." },
  { icon: "🛍️", title: "Add to cart & checkout", detail: "Walks the product page, picks the variant, heads to pay." },
  { icon: "📄", title: "Edit Docs & Sheets", detail: "Updates cells, adds rows, formats by instruction." },
  { icon: "🔍", title: "Research & extract", detail: "Reads any page and pulls out the facts you asked for." },
  { icon: "📁", title: "Download files", detail: "Finds the attachment and grabs it, so you don't hunt." },
  { icon: "🐙", title: "Navigate GitHub", detail: "Browses issues, PRs and diffs — summarises and acts." },
  { icon: "🔐", title: "Multi-step sign-ups", detail: "Handles email verify, profile fill, preference setup." },
];

const WHY = [
  { title: "It reads the page, not a screenshot.", body: "Delegate works off the live structure of the page — every button and field handed back as a real, indexed element. No screenshots, no vision model squinting at pixels. It acts against what's actually on screen." },
  { title: "About a second a step.", body: "From \"decide\" to \"click\" is roughly a second. A five-step task is done in under fifteen. Screenshot-based agents burn three to six seconds every single step just looking around." },
  { title: "Nothing happens behind your back.", body: "It runs on the tab in front of you. Watch it, correct it mid-task, or let it run. And it always asks before it sends an email or submits a form." },
  { title: "Any site your browser can open.", body: "Gmail, Amazon, LinkedIn, Google Docs, GitHub, your company's internal dashboard. If the tab opens, Delegate can drive it." },
];

const DELEGATE_CSS = `
  .dg-wide { position: relative; left: 50%; transform: translateX(-50%); width: min(1000px, 94vw); margin-top: 10px; }
  .dg-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
  @media (max-width: 820px) { .dg-demo { grid-template-columns: 1fr; gap: 20px; } }
  .dg-picker { display: flex; flex-direction: column; gap: 10px; }
  .dg-say { text-align: left; padding: 14px 18px; border-radius: 14px; border: 1px solid var(--line); background: transparent; color: var(--ink); cursor: pointer; font-family: 'Newsreader', Georgia, serif; font-size: 15px; transition: border-color .18s, background .18s, color .18s; }
  .dg-say:hover { border-color: var(--ink-3); }
  .dg-say.on { background: var(--ink); color: #fff; border-color: var(--ink); }
  .dg-say-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; opacity: .55; margin-bottom: 4px; }
  .dg-trace { background: rgba(0,0,0,0.02); border: 1px solid var(--line); border-radius: 20px; padding: 22px; }
  html.sb-dark .dg-trace { background: #0c0c0c; }
  .dg-trace-head { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #C9544A; margin-bottom: 16px; }
  .dg-trace-foot { margin-top: 18px; padding-top: 18px; border-top: 1px dashed var(--line); display: flex; align-items: center; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-3); }
  .dg-time { font-family: 'Newsreader', Georgia, serif; font-size: 22px; color: #C9544A; font-style: italic; }
  .dg-num { font-family: 'Newsreader', Georgia, serif; font-size: 44px; line-height: 1; color: #C9544A; margin-bottom: 8px; }
  .dg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: 14px; margin-top: 10px; }
  .dg-card { background: rgba(0,0,0,0.02); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }
  html.sb-dark .dg-card { background: #0c0c0c; }
  .dg-card-top { display: flex; align-items: center; gap: 10px; }
  .dg-ic { font-size: 20px; line-height: 1; }
  .dg-card-title { font-family: 'Newsreader', Georgia, serif; font-size: 17px; line-height: 1.2; }
  .dg-card-desc { font-size: 13px; color: var(--ink-2); line-height: 1.5; margin: 8px 0 0; padding-left: 30px; }
  .dg-why { margin: 0 0 24px; }
  .dg-why-title { font-family: 'Newsreader', Georgia, serif; font-weight: 600; font-size: 21px; margin: 0 0 6px; }
  @keyframes sbSpin { to { transform: rotate(360deg); } }
`;

function DelegateTrace({ steps }: { steps: { label: string; ms: string }[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % steps.length), 1800);
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
            background: isCurrent ? "rgba(226,125,57,0.10)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${isCurrent ? "rgba(226,125,57,0.4)" : "var(--line)"}`,
            opacity: isPending ? 0.45 : 1, transition: "all .35s",
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              display: "grid", placeItems: "center",
              background: isDone ? "#3FA66A" : isCurrent ? "transparent" : "var(--line)",
              color: isDone ? "#fff" : "transparent",
              border: isCurrent ? "1.5px solid #C9544A" : "none",
              borderTopColor: isCurrent ? "transparent" : undefined,
              animation: isCurrent ? "sbSpin .9s linear infinite" : "none",
              fontSize: 9,
            }}>{isDone ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{step.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-3)" }}>{step.ms}</span>
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
    <div className="home">
      <style>{DELEGATE_CSS}</style>
      <Navbar />

      <article className="home-article">
        {/* ── Hero ── */}
        <section className="home-hero">
          <div className="home-kicker">Delegate · the Braino agent</div>
          <h1 className="home-h1">Hand Braino the keys to your browser.</h1>
          <p className="home-lede">Tell him the outcome in plain words. He reads the live page and does the clicking, typing and navigating himself — about a second a step, right in front of you.</p>
          <div className="home-cta-row">
            <a className="home-cta home-install" href={EXTENSION_DOWNLOAD_URL} download>
              <Download size={16} /> Install for Chrome
            </a>
            <Link className="home-cta home-cta-ghost" to="/auth">Get started →</Link>
          </div>
        </section>

        {/* ── Live trace ── */}
        <section className="home-section">
          <div className="home-eyebrow">Watch it work</div>
          <h2 className="home-h2">Watch him think, then act.</h2>
          <p className="home-body">Pick a task and watch Delegate break it into the exact clicks — the same trace you'll see in the side panel while he runs.</p>
          <div className="dg-wide">
            <div className="dg-demo">
              <div className="dg-picker">
                {EXAMPLES.map((e, i) => (
                  <button key={i} className={`dg-say${activeExample === i ? " on" : ""}`} onClick={() => setActiveExample(i)}>
                    <span className="dg-say-label">You say</span>
                    "{e.prompt}"
                  </button>
                ))}
              </div>
              <div className="dg-trace">
                <div className="dg-trace-head">Delegate trace</div>
                <DelegateTrace key={activeExample} steps={ex.steps} />
                <div className="dg-trace-foot">
                  <span>{ex.steps.length} steps</span>
                  <span className="dg-time">~{ex.steps.length * 2}s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="home-section">
          <div className="home-eyebrow">How it works</div>
          <h2 className="home-h2">Three steps from words to action.</h2>
          <div className="home-more-grid">
            {STEPS.map((s) => (
              <div key={s.num} className="home-more-card" style={{ cursor: "default" }}>
                <div className="dg-num">{s.num}</div>
                <div className="home-more-title">{s.title}</div>
                <div className="home-more-desc">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What it handles ── */}
        <section className="home-section">
          <div className="home-eyebrow">What it handles</div>
          <h2 className="home-h2">A dozen things it does well.</h2>
          <div className="dg-wide">
            <div className="dg-grid">
              {HANDLES.map((h) => (
                <div key={h.title} className="dg-card">
                  <div className="dg-card-top"><span className="dg-ic">{h.icon}</span><span className="dg-card-title">{h.title}</span></div>
                  <p className="dg-card-desc">{h.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why it's fast ── */}
        <section className="home-section">
          <div className="home-eyebrow">Why it's quick</div>
          <h2 className="home-h2">It reads the page. It doesn't squint at a screenshot.</h2>
          {WHY.map((w) => (
            <div key={w.title} className="dg-why">
              <h3 className="dg-why-title">{w.title}</h3>
              <p className="home-body">{w.body}</p>
            </div>
          ))}
          <p className="home-body">
            <Link to="/straight-talk" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              And when he's slow, or gets it wrong? Here's the honest reason why →
            </Link>
          </p>
        </section>

        {/* ── Close ── */}
        <section className="home-close">
          <h2 className="home-h2 home-h2-center">Stop doing the clicking.</h2>
          <div className="home-cta-row">
            <a className="home-cta home-install" href={EXTENSION_DOWNLOAD_URL} download>
              <Download size={16} /> Install for Chrome
            </a>
            <Link className="home-cta home-cta-ghost" to="/premium">See Pro →</Link>
          </div>
          <p className="home-fine">25 Delegate tasks free every month · Chrome, Arc, Brave, Edge</p>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}
