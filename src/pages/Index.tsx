import { useEffect, useRef, useState } from "react";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import { GRAPHICS, FEATURES } from "./UseCases";

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4L19 6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ─── Typewriter ───────────────────────────────────────────────────────────────

const LINES = [
  "I've opened Gmail and I'm drafting your reply to Priya now.",
  "Recording Lecture 14. Transcript ready when you stop.",
  "Found the Karpathy nanoGPT thread — want me to summarize it?",
  "That pricing page changed in three places. Want the breakdown?",
];

function useTypewriter() {
  const [displayText, setDisplayText] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fullLine = LINES[lineIdx];
    const delay = deleting ? 35 : charIdx === 0 ? 800 : charIdx === fullLine.length ? 2200 : 42;
    const t = setTimeout(() => {
      if (!deleting) {
        setDisplayText(fullLine.slice(0, charIdx + 1));
        if (charIdx + 1 >= fullLine.length) {
          setTimeout(() => setDeleting(true), 2200);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplayText(fullLine.slice(0, Math.max(0, charIdx - 1)));
        if (charIdx <= 1) {
          setDeleting(false);
          setCharIdx(0);
          setLineIdx(l => (l + 1) % LINES.length);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, lineIdx, deleting]);

  return displayText;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform() {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf: number;
    function tick() {
      bars.current.forEach(b => {
        if (b) b.style.height = `${8 + Math.random() * 28}px`;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 36 }}>
      {Array.from({ length: 32 }).map((_, i) => (
        <span key={i} ref={el => { bars.current[i] = el; }}
          style={{ flex: 1, background: "linear-gradient(180deg, #F7B26B, #E27D39)", borderRadius: 2, height: 8, transition: "height 0.08s ease", display: "inline-block" }}
        />
      ))}
    </div>
  );
}

// ─── DelegateTrace ────────────────────────────────────────────────────────────

const TRACE_STEPS = [
  { ix: "01", label: "Read DOM elements + page text", sub: "mail.google.com — inbox view", ms: "20ms" },
  { ix: "02", label: "Decide next action", sub: "find contact, open compose", ms: "800ms" },
  { ix: "03", label: 'Execute click → "Compose"', sub: "button.gmail-compose", ms: "150ms" },
  { ix: "04", label: "Type body", sub: "awaiting", ms: "—" },
];

function DelegateTrace() {
  const [activeStep, setActiveStep] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setActiveStep(prev => (prev + 1) % TRACE_STEPS.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {TRACE_STEPS.map((step, i) => {
        const isDone = i < activeStep;
        const isActive = i === activeStep;
        const isPending = i > activeStep;
        return (
          <div key={i} style={{
            background: isActive ? "oklch(0.97 0.025 75)" : "var(--sb-panel)",
            border: `1px solid ${isActive ? "oklch(0.85 0.1 70)" : "var(--sb-line-2)"}`,
            borderRadius: "var(--sb-r)", padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 12,
            opacity: isPending ? 0.5 : 1, transition: "all .4s",
          }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)", width: 18 }}>{step.ix}</span>
            <div style={{ flex: 1, fontSize: 13.5, color: "var(--sb-ink)", display: "flex", flexDirection: "column", gap: 2 }}>
              {step.label}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--sb-ink-3)", letterSpacing: "0.02em" }}>{step.sub}</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>{step.ms}</span>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
              background: isDone ? "var(--sb-ok)" : isActive ? "transparent" : "var(--sb-line)",
              color: isDone ? "#fff" : "transparent",
              border: isActive ? "1.5px solid var(--sb-accent)" : "none",
              borderTopColor: isActive ? "transparent" : undefined,
              animation: isActive ? "sbSpin .9s linear infinite" : "none", fontSize: 10,
            }}>{isDone ? "✓" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── CursorOrb ────────────────────────────────────────────────────────────────

function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });
  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;
    const onMove = (e: MouseEvent) => { pos.current.mx = e.clientX; pos.current.my = e.clientY; orb.style.opacity = "0.7"; };
    const onLeave = () => { orb.style.opacity = "0"; };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    let raf: number;
    function tick() {
      const { mx, my } = pos.current;
      pos.current.cx += (mx - pos.current.cx) * 0.18;
      pos.current.cy += (my - pos.current.cy) * 0.18;
      orb.style.transform = `translate(${pos.current.cx}px, ${pos.current.cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={orbRef} style={{
      position: "fixed", left: 0, top: 0, width: 32, height: 32, borderRadius: "50%",
      background: "radial-gradient(circle at 35% 35%, rgba(255,217,168,0.7), rgba(243,154,66,0.45) 50%, rgba(217,110,26,0.15) 80%)",
      pointerEvents: "none", zIndex: 9999, mixBlendMode: "multiply", opacity: 0, willChange: "transform",
    }} />
  );
}

// ─── BrowserBar ───────────────────────────────────────────────────────────────

function BrowserBar({ url, dark }: { url: string; dark?: boolean }) {
  return (
    <div style={{
      height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
      background: dark ? "linear-gradient(180deg, #1C1814, #161210)" : "linear-gradient(180deg, #F5EFE5, #EFE7DB)",
      borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--sb-line-2)",
    }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["#E36F62", "#E7B654", "#74C28D"].map((c, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, display: "inline-block" }} />)}
      </div>
      <div style={{
        flex: 1, maxWidth: 480, margin: "0 auto",
        background: dark ? "rgba(255,255,255,0.07)" : "var(--sb-panel-2)",
        border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--sb-line)",
        borderRadius: 8, padding: "0 12px",
        fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5,
        color: dark ? "rgba(255,250,242,0.45)" : "var(--sb-ink-3)",
        display: "flex", alignItems: "center", gap: 6, height: 28,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: .7 }}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        <strong style={{ color: dark ? "rgba(255,250,242,0.65)" : "var(--sb-ink-2)", fontWeight: 500 }}>https://</strong>{url}
      </div>
      <img src="/favicon.svg" width={22} height={22} alt="Braino" style={{ display: "inline-block", flexShrink: 0 }} />
    </div>
  );
}

// ─── Use Cases ────────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    tag: "Students",
    title: "Understand anything instantly",
    body: "Open any lecture, paper, or textbook. Braino reads it alongside you and answers questions about it in plain English — no copy-paste, no context switching.",
    graphicId: "chat",
  },
  {
    tag: "Meetings & Calls",
    title: "Every meeting, captured",
    body: "Braino joins your Google Meet or Zoom tab, transcribes in real time, and generates a summary with action items the moment the call ends.",
    graphicId: "meetings",
  },
  {
    tag: "Notes & Research",
    title: "Research at the speed of thought",
    body: "Highlight any text on any page. Braino extracts key points, cross-references your saved notes, and builds a brief you can act on.",
    graphicId: "record",
  },
  {
    tag: "Developers",
    title: "Delegate the repetitive parts",
    body: "Braino can navigate GitHub, fill out Jira tickets, run terminal commands, and send Slack messages — all from a single prompt.",
    graphicId: "delegate",
  },
  {
    tag: "Job Seekers",
    title: "Apply smarter, not harder",
    body: "Paste a job description. Braino reads your resume and writes a tailored cover letter in seconds — and it won't tell you it's great when it isn't.",
    graphicId: "chat",
  },
  {
    tag: "Founders & PMs",
    title: "Cut through the noise",
    body: "Braino reads competitor sites, research threads, and Notion docs — then gives you the honest summary, not the flattering one.",
    graphicId: "delegate",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const WRAP: React.CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "0 56px" };
const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)",
  display: "inline-flex", alignItems: "center", gap: 8,
};
const pip: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)",
  display: "inline-block",
};

// ─── Hero mockup ──────────────────────────────────────────────────────────────

function HeroMockup() {
  const displayText = useTypewriter();
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
  const [heroPhase, setHeroPhase] = useState<"sleeping" | "yellow" | "green" | "awake">("sleeping");
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const onCardMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: cardOffset.x, origY: cardOffset.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      setCardOffset({ x: dragRef.current.origX + ev.clientX - dragRef.current.startX, y: dragRef.current.origY + ev.clientY - dragRef.current.startY });
    };
    const onUp = () => { dragRef.current.active = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setHeroPhase("yellow"), 900);
    const t2 = setTimeout(() => setHeroPhase("green"), 2500);
    const t3 = setTimeout(() => setHeroPhase("awake"), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ width: "100%", background: "#0F0D0B", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,.2), 0 40px 80px -30px rgba(0,0,0,.55)", overflow: "hidden" }}>
      <BrowserBar url="mail.google.com/inbox" dark />
      <div style={{ position: "relative", minHeight: 440, userSelect: "none" }}>
        <div style={{ padding: "28px 40px 28px 48px", background: "#0F0D0B", minHeight: 440 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #DB4437, #C44033)", flexShrink: 0, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>G</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,250,242,0.4)", letterSpacing: ".04em" }}>GMAIL · INBOX · 3 UNREAD</div>
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, marginBottom: 8, lineHeight: 1.15, color: "#FBF7F1" }}>Re: Thursday's onboarding — are you joining?</h1>
          <div style={{ height: 130, borderRadius: 10, margin: "14px 0", background: "#1A1612", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              {[["From:", "Priya Singh <priya@example.com>"], ["To:", "you"], ["Date:", "Today 9:41 AM"]].map(([lbl, val]) => (
                <div key={lbl} style={{ display: "flex", gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
                  <span style={{ color: "rgba(255,250,242,0.35)", width: 36, flexShrink: 0 }}>{lbl}</span>
                  <span style={{ color: "rgba(255,250,242,0.65)" }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,250,242,0.6)", lineHeight: 1.5 }}>Hey — just checking if you're joining us Thursday. Let me know by EOD.</div>
            </div>
          </div>
          {[100, 90, 95, 75, 100, 90, 60].map((w, i) => (
            <div key={i} style={{ height: 9, background: i === 2 ? "linear-gradient(90deg, rgba(243,154,66,0.35), rgba(240,168,107,0.18))" : "rgba(255,255,255,0.06)", borderRadius: 4, margin: "8px 0", width: `${w}%` }} />
          ))}
        </div>

        {/* Typewriter card */}
        <div style={{ position: "absolute", top: 16, left: 16, right: 360, background: "rgba(15,13,11,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-accent-deep)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", animation: "sbPulse 1.6s infinite", display: "inline-block" }} />
            Braino
          </div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 15, lineHeight: 1.4, color: "#FBF7F1" }}>
            {displayText}
            <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--sb-accent-deep)", marginLeft: 2, verticalAlign: -2, animation: "sbBlink 1s steps(2) infinite" }} />
          </div>
        </div>

        {/* Glass card */}
        <div onMouseDown={onCardMouseDown} style={{
          position: "absolute", bottom: 140, right: 16, width: 320,
          borderRadius: 20, overflow: "hidden",
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.18)",
          backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)",
          color: "#fff", zIndex: 8, cursor: "grab",
          transform: `translate(${cardOffset.x}px, ${cardOffset.y}px)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, padding: "10px 14px 4px" }}>
            {["Speak", "Copy"].map(l => <button key={l} style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)", height: 26, padding: "0 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "sans-serif" }}>{l}</button>)}
            <button style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)", width: 26, height: 26, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif", display: "grid", placeItems: "center" }}>×</button>
          </div>
          <div style={{ padding: "4px 22px 0" }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 14, padding: "9px 14px", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>Draft a reply to Priya's email</div>
          </div>
          <div style={{ padding: "14px 22px 18px", fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.92)" }}>
            Sure! Here's a draft:<br /><br />
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>"Hi Priya, yes I'll be there Thursday — see you then!"</span>
          </div>
        </div>

        {/* Floating widget */}
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, zIndex: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,251,247,0.97)", borderRadius: 100, padding: "7px 7px 7px 18px",
            border: "1px solid rgba(65,48,40,0.1)", boxShadow: "0 8px 28px rgba(27,23,19,0.13)",
            width: 300, backdropFilter: "blur(20px)",
            opacity: heroPhase === "awake" ? 1 : 0, transform: heroPhase === "awake" ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
            transition: "opacity 0.5s ease, transform 0.5s ease", pointerEvents: "none",
          }}>
            <span style={{ flex: 1, fontSize: 13, color: "#A79B92", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", letterSpacing: "-0.01em" }}>What's on your mind?</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8786E", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
            </div>
          </div>
          <img src="/favicon.svg" width={48} height={48} alt="Braino" style={{
            display: "block", cursor: "pointer", transition: "filter 0.5s ease",
            animation: heroPhase === "yellow" || heroPhase === "green" ? "sbOrbBreathe 0.85s ease-in-out infinite" : "sbOrbBreathe 3s ease-in-out infinite",
            filter: heroPhase === "sleeping" ? "brightness(0.7)" : heroPhase === "yellow" ? "drop-shadow(0 0 14px rgba(255,210,50,1))" : heroPhase === "green" ? "drop-shadow(0 0 14px rgba(80,230,110,1))" : "drop-shadow(0 2px 10px rgba(200,84,74,0.55))",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Index() {
  const [isIndia, setIsIndia] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("https://ipapi.co/json/").then(r => r.json()).then(d => setIsIndia(d.country_code === "IN")).catch(() => setIsIndia(false));
  }, []);
  const proPrice = isIndia === null ? "…" : isIndia ? "₹399" : "$12";

  return (
    <div style={{ background: "#fff", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <CursorOrb />

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid var(--sb-line-2)", padding: "0 56px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#fff", position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'NeueHaas', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.03em", color: "var(--sb-ink)" }}>Braino</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--sb-ink-3)", textTransform: "uppercase", marginLeft: 4 }}>Beta</span>
        </div>
        <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[["#features", "Features"], ["#pricing", "Pricing"]].map(([href, label]) => (
            <a key={label} href={href} style={{ fontFamily: "'NeueHaas',sans-serif", fontSize: 14, color: "var(--sb-ink-3)", textDecoration: "none", letterSpacing: "-0.01em" }}>{label}</a>
          ))}
          <a href={EXTENSION_DOWNLOAD_URL} download style={{
            fontFamily: "'NeueHaas', sans-serif", fontWeight: 700, fontSize: 13,
            letterSpacing: "-0.01em", color: "var(--sb-ink)", textDecoration: "none",
            padding: "7px 16px", borderRadius: 999, border: "1.5px solid var(--sb-line)",
          }}>
            Install free
          </a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: "80px 0 0" }}>
        <div style={WRAP}>
          <div style={{ ...eyebrowStyle, marginBottom: 24 }}>
            <span style={pip} /> trybraino.com · Browser AI
          </div>
          <h1 style={{
            fontFamily: "'NeueHaas', sans-serif", fontWeight: 700,
            fontSize: "clamp(40px, 5.5vw, 72px)", lineHeight: 1.02,
            letterSpacing: "-0.035em", color: "var(--sb-ink)", margin: "0 0 22px", maxWidth: 760,
          }}>
            An AI that lives in your browser.
          </h1>
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 20, lineHeight: 1.6, color: "var(--sb-ink-2)", margin: "0 0 36px", maxWidth: 560,
          }}>
            Click it. Talk to it. Let it act. One agent on every tab you open — no switching, no copying, no separate app.
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 64 }}>
            <a href={EXTENSION_DOWNLOAD_URL} download style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
              borderRadius: 999, fontSize: 15, fontWeight: 700, background: "var(--sb-ink)",
              color: "#fff", textDecoration: "none", fontFamily: "'NeueHaas',sans-serif", letterSpacing: "-0.01em",
            }}>
              Install free
            </a>
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
              borderRadius: 999, fontSize: 15, fontWeight: 400, background: "transparent",
              color: "var(--sb-ink)", textDecoration: "none", fontFamily: "'NeueHaas',sans-serif",
              border: "1.5px solid var(--sb-line)", letterSpacing: "-0.01em",
            }}>
              See what it does <ArrowRightIcon />
            </a>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section style={{ padding: "100px 0", borderTop: "1px solid #EBEBEB", marginTop: 80 }}>
        <div style={{ ...WRAP, textAlign: "center" }}>
          <blockquote style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: "italic",
            fontSize: "clamp(24px, 3vw, 40px)", lineHeight: 1.3, color: "var(--sb-ink)",
            margin: 0, letterSpacing: "-0.02em", maxWidth: 720, marginLeft: "auto", marginRight: "auto",
          }}>
            "You need to hear what's true. Not what's comfortable. That's what Braino is here for."
          </blockquote>
        </div>
      </section>

      {/* ── Features ── */}
      <div id="features">
        {FEATURES.map((feature, i) => {
          const Graphic = GRAPHICS[feature.id];
          const flip = i % 2 !== 0;
          return (
            <section key={feature.id} style={{ borderTop: "1px solid #EBEBEB", padding: "80px 0" }}>
              <div style={{ ...WRAP, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
                <div style={{ order: flip ? 1 : 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 16 }}>
                    {feature.number ? `${feature.number} — ` : ""}{feature.name}
                  </div>
                  <h2 style={{
                    fontFamily: "'NeueHaas',sans-serif", fontWeight: 700,
                    fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.03em",
                    lineHeight: 1.08, color: "var(--sb-ink)", margin: "0 0 18px",
                    whiteSpace: "pre-line",
                  }}>
                    {feature.heading}
                  </h2>
                  <p style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: 17, lineHeight: 1.7, color: "var(--sb-ink-2)", margin: 0,
                  }}>
                    {feature.description.split(". ")[0]}.
                  </p>
                </div>
                <div style={{ order: flip ? 0 : 1 }}>
                  {Graphic && <Graphic />}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Use Cases ── */}
      <section style={{ borderTop: "1px solid #EBEBEB", padding: "80px 0 0" }}>
        <div style={WRAP}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 16 }}>
            Who it's for
          </div>
          <h2 style={{
            fontFamily: "'NeueHaas',sans-serif", fontWeight: 700,
            fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.03em",
            lineHeight: 1.08, color: "var(--sb-ink)", margin: "0 0 72px", maxWidth: 540,
          }}>
            One agent. Every kind of work.
          </h2>
        </div>
        {USE_CASES.map((uc, i) => {
          const Graphic = GRAPHICS[uc.graphicId as keyof typeof GRAPHICS];
          const flip = i % 2 !== 0;
          return (
            <div key={uc.tag} style={{ borderTop: "1px solid #EBEBEB", padding: "64px 0" }}>
              <div style={{ ...WRAP, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
                <div style={{ order: flip ? 1 : 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 14 }}>
                    {uc.tag}
                  </div>
                  <h3 style={{
                    fontFamily: "'NeueHaas',sans-serif", fontWeight: 700,
                    fontSize: "clamp(22px, 2.4vw, 32px)", letterSpacing: "-0.03em",
                    lineHeight: 1.1, color: "var(--sb-ink)", margin: "0 0 16px",
                  }}>
                    {uc.title}
                  </h3>
                  <p style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: 17, lineHeight: 1.7, color: "var(--sb-ink-2)", margin: 0,
                  }}>
                    {uc.body}
                  </p>
                </div>
                <div style={{ order: flip ? 0 : 1 }}>
                  {Graphic && <Graphic />}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Speed ── */}
      <section style={{ borderTop: "1px solid #EBEBEB", padding: "80px 0", background: "var(--sb-bg-2)" }}>
        <div style={WRAP}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 16 }}>
            How it works
          </div>
          <h2 style={{
            fontFamily: "'NeueHaas',sans-serif", fontWeight: 700,
            fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.03em",
            lineHeight: 1.08, color: "var(--sb-ink)", margin: "0 0 16px", maxWidth: 600,
          }}>
            Reads the page. Doesn't photograph it.
          </h2>
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 17, lineHeight: 1.7, color: "var(--sb-ink-2)", margin: "0 0 48px", maxWidth: 520,
          }}>
            Computer Use takes a screenshot every step. Braino reads the live DOM directly — 5× faster per action.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", borderRadius: 20, padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block" }} />
                <span style={{ fontFamily: "'NeueHaas',sans-serif", fontWeight: 700, fontSize: 16 }}>Braino</span>
                <span style={{ marginLeft: "auto", fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 28, color: "var(--sb-accent-deep)" }}>~1s</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)", marginBottom: 16 }}>per step · 5-step task in ~9s</div>
              <DelegateTrace />
            </div>
            <div style={{ background: "#14110E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#555", display: "inline-block" }} />
                <span style={{ fontFamily: "'NeueHaas',sans-serif", fontWeight: 700, fontSize: 16, color: "rgba(255,250,242,0.7)" }}>Computer Use</span>
                <span style={{ marginLeft: "auto", fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 28, color: "rgba(255,250,242,0.4)" }}>~6s</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,250,242,0.3)", marginBottom: 16 }}>per step · 5-step task in ~35s</div>
              {[
                { label: "Take full-page screenshot", ms: "~400ms" },
                { label: "Send screenshot to vision model", ms: "~2000ms" },
                { label: "Decide action from pixels", ms: "~600ms" },
                { label: "Execute & wait for render", ms: "~3000ms" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 13, color: "rgba(255,250,242,0.55)" }}>{s.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,250,242,0.3)" }}>{s.ms}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ borderTop: "1px solid #EBEBEB", padding: "80px 0" }}>
        <div style={WRAP}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 16 }}>
            Pricing
          </div>
          <h2 style={{
            fontFamily: "'NeueHaas',sans-serif", fontWeight: 700,
            fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.03em",
            lineHeight: 1.08, color: "var(--sb-ink)", margin: "0 0 48px",
          }}>
            Free forever. Pro when you're ready.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Free</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 5 }}>
                $0<span style={{ fontSize: 15, fontFamily: "sans-serif", color: "var(--sb-ink-3)", letterSpacing: 0 }}>&nbsp;/ forever</span>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0", padding: 0 }}>
                {["Voice mode with live captions", "Read & summarize any page", "25 Delegate tasks / month", "5 hours recording / month", "Dashboard & library"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, listStyle: "none", color: "var(--sb-accent-deep)" }}>
                    <CheckIcon /><span style={{ color: "var(--sb-ink)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href={EXTENSION_DOWNLOAD_URL} download style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: "11px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: "transparent", color: "var(--sb-ink)", border: "1px solid var(--sb-line)", textDecoration: "none", fontFamily: "'NeueHaas',sans-serif" }}>
                Install free
              </a>
            </div>
            <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16, outline: "1px solid var(--sb-accent)" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-2)" }}>Pro</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 5 }}>
                {proPrice}<span style={{ fontSize: 15, fontFamily: "sans-serif", color: "rgba(251,247,241,0.5)", letterSpacing: 0 }}>&nbsp;/ month</span>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0", padding: 0 }}>
                {["Everything in Free", "Faster, smarter models", "Unlimited Delegate tasks", "Unlimited recording & transcription", "Custom voices & languages", "Priority support"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, listStyle: "none", color: "var(--sb-accent-2)" }}>
                    <CheckIcon /><span style={{ color: "rgba(251,247,241,0.9)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: "11px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: "#FBF7F1", color: "#1B1713", textDecoration: "none", fontFamily: "'NeueHaas',sans-serif" }}>
                Start Pro <ArrowRightIcon />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ borderTop: "1px solid #EBEBEB", padding: "80px 0" }}>
        <div style={WRAP}>
          <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: "72px 56px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -100, top: -100, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,154,66,0.45), transparent 60%)", filter: "blur(20px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: -80, bottom: -100, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,154,66,0.2), transparent 60%)", filter: "blur(20px)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(32px,4vw,52px)", margin: "0 auto 20px", maxWidth: 600, color: "#FBF7F1", position: "relative", zIndex: 1, lineHeight: 1.1 }}>
              Install Braino. <em style={{ color: "var(--sb-accent-2)" }}>Talk to the web.</em>
            </h2>
            <p style={{ color: "rgba(251,247,241,0.6)", margin: "0 auto 32px", fontSize: 16, position: "relative", zIndex: 1 }}>
              Free during beta. 30 seconds to set up. Works on Chrome, Arc, Brave, and Edge.
            </p>
            <a href={EXTENSION_DOWNLOAD_URL} download style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 999, fontSize: 15, fontWeight: 700, background: "#FBF7F1", color: "#1B1713", textDecoration: "none", fontFamily: "'NeueHaas',sans-serif", letterSpacing: "-0.01em", position: "relative", zIndex: 1 }}>
              Add to Chrome
            </a>
          </div>

          {/* Footer */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginTop: 64, paddingTop: 48, borderTop: "1px solid var(--sb-line-2)" }}>
            <div>
              <div style={{ fontFamily: "'NeueHaas',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-0.025em", marginBottom: 10 }}>Braino</div>
              <p style={{ fontSize: 13, maxWidth: 240, color: "var(--sb-ink-3)", lineHeight: 1.6, margin: 0 }}>An AI that lives in your browser. Reads pages, talks back, handles tasks.</p>
            </div>
            {[
              { heading: "Product", links: [["#features", "Features"], ["#pricing", "Pricing"], ["/changelog", "Changelog"]] },
              { heading: "Install", links: [[EXTENSION_DOWNLOAD_URL, "Chrome"], [EXTENSION_DOWNLOAD_URL, "Arc"], [EXTENSION_DOWNLOAD_URL, "Brave"], [EXTENSION_DOWNLOAD_URL, "Edge"]] },
              { heading: "Company", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/contact", "Contact"], ["https://x.com/brainosays", "@brainosays"]] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h5 style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)", margin: "0 0 12px" }}>{heading}</h5>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {links.map(([href, label]) => (
                    <li key={label}><a href={href} style={{ fontSize: 13.5, color: "var(--sb-ink-2)", textDecoration: "none" }}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
