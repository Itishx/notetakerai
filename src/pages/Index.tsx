import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

// ─── tiny helpers ────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4L19 6" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ─── Typewriter hook ──────────────────────────────────────────────────────────

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
  const [sideWords, setSideWords] = useState<{ word: string; state: "said" | "current" | "unsaid" }[]>([]);

  useEffect(() => {
    const fullLine = LINES[lineIdx];

    function updateSideCaption(text: string) {
      const words = fullLine.split(" ");
      let charCount = 0;
      setSideWords(
        words.map((word) => {
          const start = charCount;
          charCount += word.length + 1;
          if (charCount <= text.length) return { word, state: "said" as const };
          if (start < text.length) return { word, state: "current" as const };
          return { word, state: "unsaid" as const };
        })
      );
    }

    const delay = deleting ? 35 : charIdx === 0 ? 800 : charIdx === fullLine.length ? 2200 : 42;

    const t = setTimeout(() => {
      if (!deleting) {
        const next = fullLine.slice(0, charIdx + 1);
        setDisplayText(next);
        updateSideCaption(next);
        if (charIdx + 1 >= fullLine.length) {
          setTimeout(() => setDeleting(true), 2200);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        const next = fullLine.slice(0, Math.max(0, charIdx - 1));
        setDisplayText(next);
        updateSideCaption(next);
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

  return { displayText, sideWords };
}

// ─── Waveform ────────────────────────────────────────────────────────────────

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
        <span
          key={i}
          ref={el => { bars.current[i] = el; }}
          style={{
            flex: 1,
            background: "linear-gradient(180deg, #F7B26B, #E27D39)",
            borderRadius: 2,
            height: 8,
            transition: "height 0.08s ease",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

// ─── DelegateTrace ───────────────────────────────────────────────────────────

const TRACE_STEPS = [
  { ix: "01", label: "Read DOM elements + page text", sub: "mail.google.com — inbox view", ms: "20ms" },
  { ix: "02", label: "Decide next action", sub: "find contact, open compose", ms: "800ms" },
  { ix: "03", label: 'Execute click → "Compose"', sub: "button.gmail-compose", ms: "150ms" },
  { ix: "04", label: "Type body", sub: "awaiting", ms: "—" },
];

function DelegateTrace() {
  const [activeStep, setActiveStep] = useState(2);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep(prev => (prev + 1) % TRACE_STEPS.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {TRACE_STEPS.map((step, i) => {
        const isDone = i < activeStep;
        const isActive = i === activeStep;
        const isPending = i > activeStep;

        return (
          <div
            key={i}
            style={{
              background: isActive ? "oklch(0.97 0.025 75)" : "var(--sb-panel)",
              border: `1px solid ${isActive ? "oklch(0.85 0.1 70)" : "var(--sb-line-2)"}`,
              borderRadius: "var(--sb-r)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: isPending ? 0.5 : 1,
              transition: "all .4s",
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)", width: 18 }}>
              {step.ix}
            </span>
            <div style={{ flex: 1, fontSize: 13.5, color: "var(--sb-ink)", display: "flex", flexDirection: "column", gap: 2 }}>
              {step.label}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--sb-ink-3)", letterSpacing: "0.02em" }}>
                {step.sub}
              </span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>{step.ms}</span>
            <span
              style={{
                width: 18, height: 18, borderRadius: "50%",
                display: "grid", placeItems: "center", flexShrink: 0,
                background: isDone ? "var(--sb-ok)" : isActive ? "transparent" : "var(--sb-line)",
                color: isDone ? "#fff" : "transparent",
                border: isActive ? "1.5px solid var(--sb-accent)" : "none",
                borderTopColor: isActive ? "transparent" : undefined,
                animation: isActive ? "sbSpin .9s linear infinite" : "none",
                fontSize: 10,
              }}
            >
              {isDone ? "✓" : ""}
            </span>
          </div>
        );
      })}

      <div style={{
        marginTop: 14, paddingTop: 14,
        borderTop: "1px dashed var(--sb-line)",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--sb-ink-2)",
      }}>
        <span>5 steps · projected:</span>
        <strong style={{ color: "var(--sb-ink)", fontWeight: 600 }}>~9.7s</strong>
        <span style={{
          marginLeft: "auto", padding: "4px 10px", borderRadius: 999,
          background: "var(--sb-ink)", color: "#fff", fontSize: 10.5, letterSpacing: ".06em",
        }}>
          DELEGATE
        </span>
      </div>
    </div>
  );
}

// ─── CursorOrb ───────────────────────────────────────────────────────────────

function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });

  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;

    const onMove = (e: MouseEvent) => {
      pos.current.mx = e.clientX;
      pos.current.my = e.clientY;
      orb.style.opacity = "0.7";
    };
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
    <div
      ref={orbRef}
      style={{
        position: "fixed", left: 0, top: 0,
        width: 32, height: 32, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, rgba(255,217,168,0.7), rgba(243,154,66,0.45) 50%, rgba(217,110,26,0.15) 80%)",
        pointerEvents: "none", zIndex: 9999,
        mixBlendMode: "multiply",
        opacity: 0,
        willChange: "transform",
      }}
    />
  );
}

// ─── Shared style helpers ────────────────────────────────────────────────────

const wrap: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 32px" };
const secHead: React.CSSProperties = { marginBottom: 60, textAlign: "center" };
const H2: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400, fontSize: "clamp(38px,4.6vw,64px)",
  lineHeight: 1.02, margin: "14px auto 16px",
  textWrap: "balance" as React.CSSProperties["textWrap"], maxWidth: 900,
};
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
const subText: React.CSSProperties = { maxWidth: 640, margin: "0 auto", fontSize: 18, color: "var(--sb-ink-2)" };

// ─── Main page ────────────────────────────────────────────────────────────────

type HeroPhase = 'sleeping' | 'yellow' | 'green' | 'awake';

export default function Index() {
  const { displayText, sideWords } = useTypewriter();
  const [isIndia, setIsIndia] = useState<boolean | null>(null);
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
  const [heroPhase, setHeroPhase] = useState<HeroPhase>('sleeping');
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const onCardMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: cardOffset.x, origY: cardOffset.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      setCardOffset({ x: dragRef.current.origX + ev.clientX - dragRef.current.startX, y: dragRef.current.origY + ev.clientY - dragRef.current.startY });
    };
    const onUp = () => {
      dragRef.current.active = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setIsIndia(d.country_code === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroPhase('yellow'),  900);
    const t2 = setTimeout(() => setHeroPhase('green'),  2500);
    const t3 = setTimeout(() => setHeroPhase('awake'),  3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

const proPrice = isIndia === null ? "…" : isIndia ? "₹399" : "$12";
  const proPer = isIndia === null ? "" : "/ month";

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh", overflowX: "hidden" }}>
      <CursorOrb />
      <Navbar />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section style={{ padding: "120px 0 100px", position: "relative" }}>
        <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <span style={eyebrowStyle}><span style={pip} /> Your AI agent — on every page</span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(48px, 7vw, 96px)",
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
            textAlign: "center",
            textWrap: "balance" as React.CSSProperties["textWrap"],
            maxWidth: 1100,
            margin: "0 auto 28px",
          }}>
            An AI agent that floats on{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>every page</em>
            {" "}you open.
          </h1>

          {/* Sub */}
          <p style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 36px", fontSize: 19, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>
            Install Braino and a small brain appears on every tab. Click it, type what you want — chat about the page, delegate a browser task, record a lecture, search the web. One agent, fully in context, always there.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 56, flexWrap: "wrap" }}>
            <a href="/braino-extension.zip" download style={btnPrimary} onMouseEnter={btnPrimaryHoverIn} onMouseLeave={btnPrimaryHoverOut}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
              Install for Chrome
            </a>
            <a href="#delegate" style={{ ...btnGhost, color: "var(--sb-ink-3)" }} onMouseEnter={btnGhostHoverIn} onMouseLeave={btnGhostHoverOut}>
              Watch a 60s demo <ArrowRightIcon />
            </a>
          </div>
          {/* Browser support line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: -32, marginBottom: 56, color: "var(--sb-ink-3)", fontSize: 12.5, fontFamily: "'JetBrains Mono',monospace" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ opacity: .7 }}>
              <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
            </svg>
            Chrome · Arc · Brave · Edge — Mac, Windows, Linux
          </div>

          {/* Caption typewriter card */}
          <div style={{
            maxWidth: 640, margin: "0 auto 24px",
            background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)",
            borderRadius: 18, padding: "18px 22px",
            boxShadow: "0 1px 2px rgba(40,28,18,.04), 0 4px 12px -4px rgba(40,28,18,.08)",
            display: "flex", gap: 16, alignItems: "center",
          }}>
            <img src="/favicon.svg" width={36} height={36} alt="Braino" style={{ flexShrink: 0, animation: "sbOrbBreathe 3s ease-in-out infinite" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-accent-deep)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", animation: "sbPulse 1.6s infinite", display: "inline-block" }} />
                Braino is speaking
              </div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, lineHeight: 1.3, color: "var(--sb-ink)", letterSpacing: "-0.005em" }}>
                {displayText}
                <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--sb-accent-deep)", marginLeft: 2, verticalAlign: -2, animation: "sbBlink 1s steps(2) infinite" }} />
              </div>
            </div>
          </div>

          {/* Browser frame */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <div style={{
              width: "100%", maxWidth: 1100,
              background: "#0F0D0B",
              borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 2px rgba(0,0,0,.2), 0 40px 80px -30px rgba(0,0,0,.55)",
              overflow: "hidden",
            }}>
              <BrowserBar url="mail.google.com/inbox" dark />
              {/* Content area — full width page + floating Pino widget */}
              <div style={{ position: "relative", minHeight: 540, userSelect: "none" }}>
                {/* Full-width webpage mock — dark */}
                <div style={{ padding: "32px 48px 32px 56px", background: "#0F0D0B", minHeight: 540 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #DB4437, #C44033)", flexShrink: 0, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>G</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,250,242,0.4)", letterSpacing: ".04em" }}>GMAIL · INBOX · 3 UNREAD</div>
                  </div>
                  <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, marginBottom: 8, lineHeight: 1.15, color: "#FBF7F1" }}>
                    Re: Thursday's onboarding — are you joining?
                  </h1>
                  <div style={{ height: 160, borderRadius: 12, margin: "18px 0", background: "#1A1612", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {[["From:", "Priya Singh <priya@example.com>"],["To:", "you"],["Date:", "Today 9:41 AM"]].map(([lbl,val])=>(
                        <div key={lbl} style={{ display:"flex",gap:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
                          <span style={{ color:"rgba(255,250,242,0.35)",width:36,flexShrink:0 }}>{lbl}</span>
                          <span style={{ color:"rgba(255,250,242,0.65)" }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ marginTop:8,fontSize:13,color:"rgba(255,250,242,0.6)",lineHeight:1.5 }}>Hey — just checking if you're joining us Thursday. Let me know by EOD if possible.</div>
                    </div>
                  </div>
                  {[100,90,95,75,100,90,60].map((w, i) => (
                    <div key={i} style={{
                      height: 10,
                      background: i === 2 ? "linear-gradient(90deg, rgba(243,154,66,0.35), rgba(240,168,107,0.18))" : "rgba(255,255,255,0.06)",
                      borderRadius: 4, margin: "9px 0", width: `${w}%`,
                    }} />
                  ))}
                </div>

                {/* ── Glassmorphism response card — draggable ── */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 175,
                    right: 20,
                    width: 380,
                    borderRadius: 22,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 40px 100px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.18)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    color: "#fff",
                    zIndex: 8,
                    transform: `translate(${cardOffset.x}px, ${cardOffset.y}px)`,
                    cursor: "grab",
                  }}
                  onMouseDown={onCardMouseDown}
                >
                  {/* Card header */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,padding:"10px 14px 4px",flexShrink:0 }}>
                    <button style={{ border:"none",background:"rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.75)",height:26,padding:"0 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"sans-serif" }}>Speak</button>
                    <button style={{ border:"none",background:"rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.75)",height:26,padding:"0 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"sans-serif" }}>Copy</button>
                    <button style={{ border:"none",background:"rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.75)",width:26,height:26,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"sans-serif",display:"grid",placeItems:"center" }}>×</button>
                  </div>
                  {/* User query bubble */}
                  <div style={{ padding:"4px 22px 0" }}>
                    <div style={{ display:"inline-block",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:14,padding:"9px 14px",fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.5 }}>
                      Draft a reply to Priya's email
                    </div>
                  </div>
                  {/* AI response */}
                  <div style={{ padding:"14px 22px 18px",fontSize:14.5,lineHeight:1.75,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
                    Sure! Here's a draft reply to Priya's email:<br /><br />
                    <span style={{ color:"rgba(255,255,255,0.75)",fontSize:14 }}>
                      "Hi Priya, yes I'll be there Thursday — see you then!"
                    </span>
                  </div>
                </div>

                {/* ── Floating Pino widget — bottom right ── */}
                <div style={{
                  position: "absolute",
                  bottom: 20,
                  right: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 10,
                  zIndex: 10,
                }}>
                  {/* Pill input bar — slides in when awake */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,251,247,0.97)",
                    borderRadius: 100,
                    padding: "7px 7px 7px 18px",
                    border: "1px solid rgba(65,48,40,0.1)",
                    boxShadow: "0 8px 28px rgba(27,23,19,0.13), 0 2px 8px rgba(27,23,19,0.07)",
                    width: 340,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    opacity: heroPhase === 'awake' ? 1 : 0,
                    transform: heroPhase === 'awake' ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                    pointerEvents: heroPhase === 'awake' ? 'none' : 'none',
                  }}>
                    <span style={{ flex:1, fontSize:14, color:"#A79B92", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", letterSpacing:"-0.01em" }}>
                      What's on your mind?
                    </span>
                    {/* Mode dropdown */}
                    <div style={{ display:"inline-flex",alignItems:"center",gap:4,background:"rgba(65,48,40,0.07)",borderRadius:8,padding:"4px 8px 4px 9px",fontSize:11,fontWeight:600,color:"#6B5248",whiteSpace:"nowrap",flexShrink:0 }}>
                      ⚡ Auto
                      <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 1 5 5 9 1"/></svg>
                    </div>
                    {/* Mic button */}
                    <div style={{ width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#6B5248" }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    </div>
                    {/* Send button */}
                    <div style={{ width:32,height:32,borderRadius:"50%",background:"#E8786E",color:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    </div>
                  </div>

                  {/* Brain button — wakes up on page load */}
                  <div style={{ alignSelf:"flex-end" }}>
                    <img
                      src="/favicon.svg"
                      width={52}
                      height={52}
                      alt="Braino"
                      style={{
                        display: "block",
                        cursor: "pointer",
                        transition: "filter 0.5s ease",
                        animation: heroPhase === 'yellow' || heroPhase === 'green'
                          ? "sbOrbBreathe 0.85s ease-in-out infinite"
                          : "sbOrbBreathe 3s ease-in-out infinite",
                        filter: heroPhase === 'sleeping'
                          ? "drop-shadow(0 2px 6px rgba(200,84,74,0.2)) drop-shadow(0 0 8px rgba(200,84,74,0.1)) brightness(0.75)"
                          : heroPhase === 'yellow'
                          ? "drop-shadow(0 0 14px rgba(255,210,50,1)) drop-shadow(0 0 28px rgba(255,175,0,0.7))"
                          : heroPhase === 'green'
                          ? "drop-shadow(0 0 14px rgba(80,230,110,1)) drop-shadow(0 0 28px rgba(40,180,70,0.7))"
                          : "drop-shadow(0 2px 10px rgba(200,84,74,0.55)) drop-shadow(0 0 18px rgba(200,84,74,0.3))",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ GETTING STARTED ════════════════════════ */}
      <section style={{ padding: "110px 0" }} id="how">
        <div style={wrap}>
          <div style={secHead}>
            <span style={eyebrowStyle}><span style={pip} /> Getting started</span>
            <h2 style={H2}>Three steps. <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Then it's yours.</em></h2>
            <p style={subText}>Install once, sign in, and your agent is live on every tab. Everything it learns is saved to your account across devices.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <StepCard num="01" title="Install the extension." body="Add it to Chrome, Arc, Brave, or Edge in about six seconds. Sign in or create a free account — takes 30 seconds, no card required.">
              <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "92%", height: 36, borderRadius: 8, background: "linear-gradient(180deg, #F8F4ED, #EFE7DB)", border: "1px solid var(--sb-line)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
                  <div style={{ display: "flex", gap: 4 }}>{["#DDD3C5","#DDD3C5","#DDD3C5"].map((c,i)=><span key={i} style={{ width:7,height:7,borderRadius:"50%",background:c,display:"inline-block" }} />)}</div>
                  <div style={{ flex:1,height:16,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:6 }} />
                  <img src="/favicon.svg" width={18} height={18} alt="Braino" style={{ animation: "sbPop 1.8s ease-in-out infinite", flexShrink: 0 }} />
                </div>
              </div>
            </StepCard>

            <StepCard num="02" title="Open any page." body="Article, inbox, doc, dashboard, research paper, recipe — anything you'd read or work with in a tab. No special integrations.">
              <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width:"92%",height:"92%",background:"#fff",borderRadius:8,border:"1px solid var(--sb-line-2)",padding:10,display:"flex",flexDirection:"column",gap:6 }}>
                  {["80%","100%","60%","glow","100%","80%","60%"].map((w,i)=>(
                    <div key={i} style={{ height:5,background:w==="glow"?"linear-gradient(90deg,transparent,var(--sb-accent-soft),transparent)":"var(--sb-bg-2)",borderRadius:2,width:w==="glow"?"100%":w,animation:w==="glow"?"sbShimmer 2.5s linear infinite":undefined,backgroundSize:w==="glow"?"200% 100%":undefined }} />
                  ))}
                </div>
              </div>
            </StepCard>

            <StepCard num="03" title="Click the brain." body="Your agent wakes up inline. Chat about the page, delegate a task, search the web, or record audio — it knows exactly where you are and acts accordingly.">
              <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <img src="/favicon.svg" width={36} height={36} alt="Braino" style={{ filter: "drop-shadow(0 0 8px rgba(201,84,74,0.4))" }} />
                  <span style={{ color:"var(--sb-ink-3)",fontFamily:"'JetBrains Mono',monospace" }}>→</span>
                  <div style={{ width:60,height:90,borderRadius:8,background:"var(--sb-panel-2)",border:"1px solid var(--sb-line)",padding:8,display:"flex",flexDirection:"column",gap:5 }}>
                    <div style={{ width:16,height:16,borderRadius:"50%",background:"var(--sb-accent)",boxShadow:"0 0 8px var(--sb-accent)",margin:"6px auto" }} />
                    {["100%","70%","100%"].map((w,i)=><div key={i} style={{ height:4,background:"var(--sb-bg-2)",borderRadius:2,width:w,margin:i===1?"0 auto":undefined }} />)}
                  </div>
                </div>
              </div>
            </StepCard>
          </div>
        </div>
      </section>

      {/* ════════════════════════ FEATURES ════════════════════════ */}
      <section style={{ padding: "110px 0", background: "var(--sb-bg-2)" }} id="features">
        <div style={wrap}>
          <div style={secHead}>
            <span style={eyebrowStyle}><span style={pip} /> Features</span>
            <h2 style={H2}>One agent. <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Every mode.</em> Already on your page.</h2>
            <p style={subText}>No new app, no tab-switching, no copy-pasting. Braino floats on whatever you're already looking at — reading it, acting on it, remembering it.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 18 }}>
            {/* Reads pages — large */}
            <FeatureCard tag="01 — Reads" title="Reads any page." body="Selection or full document. Long article, dense doc, tabular dashboard, gnarly PDF — Braino parses the live DOM, not a screenshot, so it understands structure as well as content." span={7}>
              <div style={{ width:"100%",padding:14,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:12,display:"flex",flexDirection:"column",gap:7 }}>
                {[["95%",false],["85%",true],["95%",false],["70%",false]].map(([w,highlight],i)=>(
                  <div key={i}>
                    <div style={{ height:highlight?8:7,background:highlight?"linear-gradient(90deg,var(--sb-accent-soft) 0%,rgba(240,168,107,0.5) 80%,transparent 100%)":"var(--sb-bg-2)",borderRadius:3,width:w as string }} />
                    {highlight&&<span style={{ display:"inline-block",marginTop:2,background:"var(--sb-ink)",color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,padding:"2px 6px",borderRadius:4 }}>SELECTED · 47 words</span>}
                  </div>
                ))}
              </div>
            </FeatureCard>

            {/* Voice — small */}
            <FeatureCard tag="02 — Speaks" title="Talk to it like a person." body="Voice in, voice out, with live word-by-word captions while it talks. Interrupt anytime." span={5}>
              <div style={{ width:"100%",display:"flex",alignItems:"center",gap:14,padding:14,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:12 }}>
                <img src="/favicon.svg" width={48} height={48} alt="Braino" style={{ flexShrink: 0, animation: "sbOrbBreathe 3s ease-in-out infinite", filter: "drop-shadow(0 0 10px rgba(201,84,74,0.45))" }} />
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:17,lineHeight:1.25,color:"var(--sb-ink)" }}>
                  I've opened Gmail and I'm <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>drafting your reply</em> to Priya now.
                </div>
              </div>
            </FeatureCard>

            {/* Records — small */}
            <FeatureCard tag="03 — Listens" title="Records lectures." body="Hit record before class or a meeting. Get a clean transcript and a structured note — searchable, shareable, yours." span={5}>
              <div style={{ width:"100%",padding:14,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:12,display:"flex",flexDirection:"column",gap:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-2)" }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",display:"inline-block",background:"oklch(0.62 0.18 25)",animation:"sbPulse 1.5s infinite" }} />
                  REC
                  <span style={{ marginLeft:"auto",color:"var(--sb-ink-3)" }}>00:23:14</span>
                </div>
                <Waveform />
              </div>
            </FeatureCard>

            {/* Tasks — large */}
            <FeatureCard tag="04 — Acts" title="Handles browser tasks." body={`"Send an email to Priya saying I'll be ten minutes late." It opens Gmail, finds the thread, drafts the reply, and asks before sending. You stay in the loop, not in the click stream.`} span={7}>
              <div style={{ width:"100%",padding:14,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:12,display:"flex",flexDirection:"column",gap:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
                {[
                  { label:"Open mail.google.com",done:true },
                  { label:'Search contacts for "Priya"',done:true },
                  { label:"Compose new message",done:true },
                  { label:'Type body "I\'ll be 10 minutes late…"',spinning:true },
                  { label:"Confirm before send",pending:true },
                ].map((row,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:8,color:row.done?"var(--sb-ink-3)":row.spinning?"var(--sb-ink)":"var(--sb-ink-2)" }}>
                    <span style={{ width:14,height:14,borderRadius:"50%",flexShrink:0,display:"grid",placeItems:"center",background:row.done?"var(--sb-ok)":row.spinning?"transparent":"var(--sb-line)",color:row.done?"#fff":"transparent",border:row.spinning?"1.5px solid var(--sb-accent)":"none",borderTopColor:row.spinning?"transparent":undefined,animation:row.spinning?"sbSpin 1s linear infinite":"none",fontSize:9 }}>
                      {row.done?"✓":""}
                    </span>
                    {row.label}
                  </div>
                ))}
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ════════════════════════ DELEGATE ════════════════════════ */}
      <section style={{ padding: "110px 0" }} id="delegate">
        <div style={wrap}>
          <div style={{ ...secHead, textAlign: "left" }}>
            <span style={eyebrowStyle}><span style={pip} /> Braino Delegate</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 80, alignItems: "center" }}>
            <div>
              <h2 style={{ ...H2, textAlign: "left", margin: "0 0 24px" }}>Hand Braino the keys to your browser.</h2>
              <p style={{ fontSize: 19, color: "var(--sb-ink-2)", lineHeight: 1.55, marginBottom: 28 }}>
                Delegate is Braino's autonomous agent. Tell it what you want done — in plain language — and it operates your tabs the way you would. Clicks, types, scrolls, navigates. With your supervision, or on its own.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 32 }}>
                {[
                  { title:"DOM-first, not pixel-first.", body:"Reads the live structure of the page. No screenshots, no waiting for vision models to look at pixels.", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l8 4 8-4M4 7v10l8 4 8-4V7M4 7l8-4 8 4"/></svg> },
                  { title:"About 1 second per step.", body:'From "decide" to "click." A five-step task finishes in under fifteen seconds.', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg> },
                  { title:"Always on the page you're on.", body:"You can watch it work, correct it mid-task, or send it off and come back. Your call.", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l3 6 6 .8-4.5 4.2 1.1 6L12 17l-5.6 3 1.1-6L3 9.8 9 9z"/></svg> },
                ].map(({title,body,icon})=>(
                  <div key={title} style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
                    <div style={{ width:28,height:28,flexShrink:0,borderRadius:7,background:"var(--sb-accent-soft)",border:"1px solid rgba(240,168,107,0.4)",display:"grid",placeItems:"center",color:"var(--sb-accent-deep)" }}>{icon}</div>
                    <div>
                      <h4 style={{ fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:600,marginBottom:2,color:"var(--sb-ink)" }}>{title}</h4>
                      <p style={{ fontSize:14,color:"var(--sb-ink-2)" }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:"var(--sb-panel-2)",border:"1px solid var(--sb-line)",borderRadius:24,padding:24,boxShadow:"0 1px 2px rgba(40,28,18,.04), 0 20px 50px -20px rgba(40,28,18,.18)" }}>
              <div style={{ background:"var(--sb-panel)",border:"1px solid var(--sb-line-2)",borderRadius:12,padding:"14px 16px",marginBottom:18 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-accent-deep)",marginBottom:4 }}>You</div>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:19,color:"var(--sb-ink)" }}>
                  "Send an email to Priya saying <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>I'll be ten minutes late.</em>"
                </div>
              </div>
              <DelegateTrace />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ SPEED COMPARISON ════════════════════════ */}
      <section style={{ padding: "110px 0", background: "var(--sb-bg-2)" }} id="speed">
        <div style={wrap}>
          <div style={secHead}>
            <span style={eyebrowStyle}><span style={pip} /> Why it's fast</span>
            <h2 style={H2}>Most browser agents see your page <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>through a camera.</em><br />Braino reads it like a developer.</h2>
            <p style={subText}>Computer Use takes a screenshot, sends it to a vision model, and asks "what should I click?" — every step. Braino reads the live DOM directly. That difference compounds with every single action.</p>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
            {/* SideBrain col */}
            <div style={{ borderRadius:24,padding:32,display:"flex",flexDirection:"column",border:"1px solid var(--sb-line)",background:"var(--sb-panel-2)" }}>
              <h3 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:28,display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
                <span style={{ width:12,height:12,borderRadius:"50%",background:"var(--sb-accent)",boxShadow:"0 0 12px var(--sb-accent)",display:"inline-block",flexShrink:0 }} /> Braino
              </h3>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"var(--sb-ink-3)",marginBottom:24 }}>
                <strong style={{ color:"var(--sb-accent-deep)" }}>~1s</strong> per step
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:10,flex:1 }}>
                {[{n:"1",label:"Read DOM elements + page text",ms:"~20ms"},{n:"2",label:"Action decision",ms:"~800ms"},{n:"3",label:"Execute click / type / navigate",ms:"~150ms"}].map(({n,label,ms})=>(
                  <div key={n} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:12,background:"var(--sb-panel)",border:"1px solid var(--sb-line-2)" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",background:"var(--sb-accent-soft)",color:"var(--sb-accent-deep)",flexShrink:0 }}>{n}</div>
                    <div style={{ flex:1,fontSize:13.5,color:"var(--sb-ink)" }}>{label}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,color:"var(--sb-ink-3)" }}>{ms}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:18,paddingTop:18,borderTop:"1px dashed var(--sb-line)",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--sb-ink-3)" }}>
                <span>5-step task</span>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:28,color:"var(--sb-ink)",letterSpacing:"-0.01em" }}>
                  <em style={{ fontStyle:"italic",color:"var(--sb-accent-deep)" }}>~8–12s</em>
                </div>
              </div>
            </div>

            {/* Claude col */}
            <div style={{ borderRadius:24,padding:32,display:"flex",flexDirection:"column",border:"1px solid #2A2520",background:"#14110E",color:"#FBF7F1" }}>
              <h3 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:28,display:"flex",alignItems:"center",gap:10,marginBottom:4,color:"#FBF7F1" }}>
                <span style={{ width:12,height:12,borderRadius:"50%",background:"#6F6864",display:"inline-block",flexShrink:0 }} /> Claude Computer Use
              </h3>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(251,247,241,0.55)",marginBottom:24 }}>
                <strong style={{ color:"var(--sb-accent-2)" }}>~6s</strong> per step
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:10,flex:1 }}>
                {[{n:"1",label:"Take full-page screenshot",ms:"~400ms"},{n:"2",label:"Send screenshot to vision model",ms:"~2000ms"},{n:"3",label:"Decide action from pixels",ms:"~600ms"},{n:"4",label:"Execute action",ms:"~150ms"},{n:"5",label:"Wait for render, repeat",ms:"~3000ms"}].map(({n,label,ms})=>(
                  <div key={n} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:12,background:"#1B1814",border:"1px solid #2A2520" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",background:"#2A2520",color:"rgba(251,247,241,0.6)",flexShrink:0 }}>{n}</div>
                    <div style={{ flex:1,fontSize:13.5,color:"rgba(251,247,241,0.85)" }}>{label}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,color:"rgba(251,247,241,0.55)" }}>{ms}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:18,paddingTop:18,borderTop:"1px dashed #2A2520",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"rgba(251,247,241,0.55)" }}>
                <span>5-step task</span>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:28,color:"#FBF7F1",letterSpacing:"-0.01em" }}>
                  <em style={{ fontStyle:"italic",color:"var(--sb-accent-2)" }}>~30–40s</em>
                </div>
              </div>
            </div>
          </div>

          {/* Explain cards */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginTop:60 }}>
            {[
              { title:"Why screenshots are slow.", body:'Computer Use treats the browser like a human would — it can only see what\'s on the screen. That\'s elegant, but every step costs a full screenshot round-trip to a vision model: two or three seconds. Every time. No exceptions. Click an obvious "Send" button? Same cost as parsing a complex chart.' },
              { title:"Why reading the DOM is faster.", body:"Braino's content script reads the live DOM directly. Every button, input, and link comes back as structured text with selectors — not pixels. The model gets a clean element list and acts immediately. No screenshot. No vision model. No waiting for frames to render." },
            ].map(({title,body})=>(
              <div key={title} style={{ background:"var(--sb-panel-2)",border:"1px solid var(--sb-line-2)",borderRadius:18,padding:28 }}>
                <h4 style={{ fontFamily:"'Instrument Serif',serif",fontSize:24,fontWeight:400,marginBottom:12 }}>{title}</h4>
                <p style={{ fontSize:14.5,color:"var(--sb-ink-2)" }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={{ marginTop:60,background:"var(--sb-panel-2)",border:"1px solid var(--sb-line)",borderRadius:18,overflow:"hidden" }}>
            {[
              { feature:"How they compare",us:"Braino",them:"Claude Computer Use",isHeader:true },
              { feature:"Step decision time",us:"~1s",them:"~6s" },
              { feature:"Page understanding",us:"DOM + text",them:"Screenshot pixels" },
              { feature:"Works on any site",us:"check",them:"check" },
              { feature:"Available free",us:"check",them:"x" },
              { feature:"Works from your phone",us:"check",them:"x" },
              { feature:"Handles complex visual UIs",us:"x",them:"check" },
              { feature:"Backed by Anthropic",us:"x",them:"check" },
              { feature:"Built by a solo founder",us:"check",them:"x" },
            ].map(({feature,us,them,isHeader},i)=>(
              <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr",borderBottom:i<8?"1px solid var(--sb-line-2)":"none" }}>
                {[feature,us,them].map((val,j)=>(
                  <div key={j} style={{ padding:"16px 22px",fontSize:isHeader?11:14,color:isHeader?"var(--sb-ink-3)":j===0?"var(--sb-ink-2)":"var(--sb-ink)",fontFamily:isHeader?"'JetBrains Mono',monospace":"inherit",letterSpacing:isHeader?".14em":0,textTransform:isHeader?"uppercase":"none",background:isHeader?"var(--sb-panel)":"transparent",borderLeft:j>0?"1px solid var(--sb-line-2)":"none",display:"flex",alignItems:"center",gap:8 }}>
                    {val==="check"?<span style={{ width:22,height:22,borderRadius:"50%",background:"var(--sb-accent-soft)",color:"var(--sb-accent-deep)",display:"grid",placeItems:"center",flexShrink:0 }}><CheckIcon /></span>
                    :val==="x"?<span style={{ width:22,height:22,borderRadius:"50%",background:"#F4ECE2",color:"var(--sb-ink-4)",display:"grid",placeItems:"center",flexShrink:0 }}><XIcon /></span>
                    :<span style={j>0&&!isHeader?{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5}:{}}>{val}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════ DASHBOARD ════════════════════════ */}
      <section style={{ padding:"110px 0" }} id="dashboard">
        <div style={wrap}>
          {/* Section header — centered */}
          <div style={{ ...secHead, marginBottom:56 }}>
            <span style={eyebrowStyle}><span style={pip} /> Dashboard</span>
            <h2 style={H2}>
              Everything you've ever said,{" "}
              <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>remembered.</em>
            </h2>
            <p style={{ ...subText, maxWidth:560, margin:"0 auto" }}>
              Conversations, recordings, tasks, drafts — searchable, synced, yours.
            </p>
          </div>

          <div style={{ background:"var(--sb-panel-2)",border:"1px solid var(--sb-line)",borderRadius:24,overflow:"hidden",boxShadow:"0 1px 2px rgba(40,28,18,.04), 0 40px 80px -30px rgba(40,28,18,.25)" }}>
            <BrowserBar url="app.trybraino.com/dashboard" />
            <div style={{ display:"flex",minHeight:640 }}>

              {/* ── Sidebar ── */}
              <aside style={{ width:240,flexShrink:0,background:"var(--sb-panel)",borderRight:"1px solid var(--sb-line)",padding:"16px 14px",display:"flex",flexDirection:"column",gap:2 }}>
                {/* Logo */}
                <div style={{ display:"flex",alignItems:"center",gap:0,padding:"2px 8px 20px" }}>
                  <span style={{ fontFamily:"'Times New Roman',serif",fontStyle:"italic",fontSize:17,color:"var(--sb-ink)" }}>side</span>
                  <span style={{ fontFamily:"'BeVietnam',sans-serif",fontWeight:800,fontSize:17,color:"var(--sb-ink)",letterSpacing:"-0.03em" }}>brain</span>
                </div>
                {/* Talk to SideBrain CTA */}
                <div style={{ display:"flex",alignItems:"center",gap:8,borderRadius:10,background:"var(--sb-ink)",padding:"10px 12px",marginBottom:16,fontSize:13.5,fontWeight:500,color:"var(--sb-on-ink)" }}>
                  <span style={{ width:16,height:16,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",boxShadow:"0 0 8px rgba(243,154,66,0.6)",display:"inline-block",flexShrink:0 }} />
                  <span>Talk to SideBrain</span>
                  <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",borderRadius:4,background:"rgba(255,255,255,0.1)",padding:"1px 6px",fontSize:10,color:"rgba(255,255,255,0.6)" }}>CMD K</span>
                </div>
                {/* Workspace section */}
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)",padding:"4px 8px 4px" }}>Workspace</div>
                {[
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label:"Overview", active:true },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label:"Notes", badge:"31" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>, label:"Agent Tasks" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, label:"X Automation", badge:"84" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>, label:"Recordings", muted:true, badge:"Soon" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>, label:"Memory", badge:"5" },
                ].map(({icon,label,active,muted,badge})=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,fontSize:13,cursor:"default",background:active?"var(--sb-ink)":"transparent",color:active?"var(--sb-on-ink)":muted?"var(--sb-ink-3)":"var(--sb-ink-2)" }}>
                    <span style={{ display:"flex",width:16,height:16,alignItems:"center",justifyContent:"center" }}>{icon}</span>
                    {label}
                    {badge&&<span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"1px 7px",borderRadius:999,background:active?"rgba(255,255,255,0.12)":muted?"var(--sb-bg-2)":"var(--sb-accent-soft)",color:active?"rgba(255,255,255,0.8)":muted?"var(--sb-ink-4)":"var(--sb-accent-deep)" }}>{badge}</span>}
                  </div>
                ))}
                {/* Library section */}
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)",padding:"12px 8px 4px" }}>Library</div>
                {[
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, label:"Collections" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label:"Search", badge:"CMD F" },
                  { icon:<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label:"Highlights" },
                ].map(({icon,label,badge})=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,fontSize:13,cursor:"default",color:"var(--sb-ink-3)" }}>
                    <span style={{ display:"flex",width:16,height:16,alignItems:"center",justifyContent:"center" }}>{icon}</span>
                    {label}
                    {badge&&<span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"1px 5px",borderRadius:4,background:"var(--sb-bg-2)",color:"var(--sb-ink-3)" }}>{badge}</span>}
                  </div>
                ))}
                {/* Account */}
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)",padding:"12px 8px 4px" }}>Account</div>
                <div style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,fontSize:13,cursor:"default",color:"var(--sb-ink-2)" }}>
                  <span style={{ display:"flex",width:16,height:16,alignItems:"center",justifyContent:"center" }}><svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1z"/></svg></span>
                  Settings
                </div>
                {/* Bottom: premium card + user */}
                <div style={{ marginTop:"auto",borderTop:"1px solid var(--sb-line-2)",paddingTop:12 }}>
                  <div style={{ borderRadius:14,background:"var(--sb-ink)",padding:"14px 14px 12px",marginBottom:10,color:"var(--sb-on-ink)" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--sb-accent-2)",marginBottom:6 }}>FREE PLAN</div>
                    <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:16,lineHeight:1.2,marginBottom:10 }}>Go Pro for unlimited Delegate.</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:6 }}>14 / 25 tasks used this month</div>
                    <div style={{ height:4,borderRadius:999,background:"rgba(255,255,255,0.1)",marginBottom:10,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:"56%",borderRadius:999,background:"var(--sb-accent)" }} />
                    </div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRadius:999,background:"var(--sb-panel-2)",padding:"6px 0",fontSize:12,fontWeight:500,color:"var(--sb-ink)",cursor:"default" }}>
                      Upgrade · $12/mo
                    </div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,cursor:"default" }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6B4E32,#8C5A3D)",display:"grid",placeItems:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0 }}>IT</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:500,color:"var(--sb-ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>Itish</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--sb-ink-3)",textTransform:"uppercase",letterSpacing:".04em" }}>BETA</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ink-3)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </aside>

              {/* ── Main content ── */}
              <div style={{ flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"var(--sb-bg)" }}>
                {/* Top bar */}
                <div style={{ height:56,display:"flex",alignItems:"center",gap:12,padding:"0 24px",borderBottom:"1px solid var(--sb-line-2)",background:"rgba(246,241,234,0.88)",backdropFilter:"blur(12px)",flexShrink:0 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)",display:"flex",alignItems:"center",gap:6 }}>
                    SideBrain <span style={{ color:"var(--sb-ink-4)" }}>/</span> <span style={{ fontWeight:500,color:"var(--sb-ink)" }}>Overview</span>
                  </div>
                  <div style={{ flex:1,maxWidth:400,display:"flex",alignItems:"center",gap:8,borderRadius:10,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:"6px 10px",fontSize:13,color:"var(--sb-ink-3)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>Search notes, tasks...</span>
                    <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,borderRadius:4,border:"1px solid var(--sb-line-2)",background:"var(--sb-bg-2)",padding:"1px 5px",color:"var(--sb-ink-3)" }}>CMD K</span>
                  </div>
                  <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
                    {[<svg key="b" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>,<svg key="h" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>].map((ic,i)=>(
                      <div key={i} style={{ width:32,height:32,borderRadius:9,display:"grid",placeItems:"center",color:"var(--sb-ink-2)" }}>{ic}</div>
                    ))}
                    <div style={{ display:"flex",alignItems:"center",gap:6,borderRadius:9,background:"var(--sb-ink)",padding:"6px 12px",fontSize:13,fontWeight:500,color:"var(--sb-on-ink)",cursor:"default" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      New task
                    </div>
                  </div>
                </div>

                {/* Page body */}
                <div style={{ flex:1,padding:"24px 28px",overflow:"hidden" }}>
                  {/* Greeting + progress bar */}
                  <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,marginBottom:24 }}>
                    <div>
                      <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:38,lineHeight:1.02,letterSpacing:"-0.03em",marginBottom:6 }}>
                        Good morning, <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>Itish.</em>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)",display:"flex",alignItems:"center",gap:6 }}>
                        <span><strong style={{ fontWeight:500,color:"var(--sb-ink-2)" }}>Day 45</strong></span>
                        <span style={{ width:4,height:4,borderRadius:"50%",background:"var(--sb-ink-4)",display:"inline-block" }} />
                        <span>last active 2m ago</span>
                      </div>
                    </div>
                    <div style={{ borderRadius:14,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",padding:"10px 14px",minWidth:200 }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,textTransform:"uppercase",letterSpacing:".06em",color:"var(--sb-ink-3)",display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                        <span>Delegate this month</span>
                        <span style={{ color:"var(--sb-ink)" }}><strong>14</strong> / 25</span>
                      </div>
                      <div style={{ height:5,borderRadius:999,background:"var(--sb-bg-2)",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:"56%",borderRadius:999,background:"linear-gradient(90deg,var(--sb-accent),var(--sb-accent-deep))" }} />
                      </div>
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div style={{ display:"flex",alignItems:"center",gap:0,borderBottom:"1px solid var(--sb-line-2)",marginBottom:18 }}>
                    {[{lbl:"Overview",active:true},{lbl:"Notes",badge:"31"},{lbl:"Agent Tasks"},{lbl:"X Automation",badge:"84"},{lbl:"Settings"}].map(({lbl,active,badge})=>(
                      <div key={lbl} style={{ position:"relative",display:"inline-flex",alignItems:"center",gap:6,padding:"10px 14px",fontSize:13.5,fontWeight:500,color:active?"var(--sb-ink)":"var(--sb-ink-3)",cursor:"default" }}>
                        {lbl}
                        {badge&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,borderRadius:999,padding:"1px 7px",background:active?"var(--sb-accent-soft)":"var(--sb-bg-2)",color:active?"var(--sb-accent-deep)":"var(--sb-ink-3)" }}>{badge}</span>}
                        {active&&<span style={{ position:"absolute",bottom:-1,left:8,right:8,height:2,borderRadius:999,background:"var(--sb-ink)" }} />}
                      </div>
                    ))}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr 1fr",gap:12,marginBottom:16 }}>
                    {/* Dark card */}
                    <div style={{ borderRadius:18,border:"1px solid var(--sb-ink)",background:"linear-gradient(180deg,var(--sb-ink) 0%,#2A211A 100%)",padding:18,color:"var(--sb-on-ink)" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-accent-2)" }}>Tasks done</span>
                        <span style={{ width:22,height:22,borderRadius:6,background:"rgba(255,255,255,0.1)",display:"grid",placeItems:"center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sb-accent-2)" strokeWidth="1.7" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </span>
                      </div>
                      <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:44,lineHeight:1,letterSpacing:"-0.03em",display:"flex",alignItems:"flex-end",gap:4,marginBottom:4 }}>
                        <em style={{ color:"var(--sb-accent-2)",fontStyle:"italic" }}>87</em>
                        <span style={{ fontSize:16,color:"rgba(255,255,255,0.45)",paddingBottom:4 }}>/ 124</span>
                      </div>
                      <div style={{ fontSize:13,color:"rgba(255,255,255,0.6)",marginBottom:14 }}>70% success rate</div>
                      <svg height="28" width="100%" viewBox="0 0 200 28" preserveAspectRatio="none">
                        <polyline points="0,22 25,18 50,24 75,10 100,16 125,8 150,14 175,4 200,10" fill="none" stroke="oklch(0.82 0.14 65)" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    {/* Light cards */}
                    {[
                      {label:"Total notes",val:"31",sub:"From lectures, meetings, page chat",spark:"0,22 25,20 50,16 75,20 100,12 125,18 150,10 175,14 200,8"},
                      {label:"Tasks run",val:"124",sub:"+14 this month",spark:"0,24 25,20 50,22 75,14 100,18 125,10 150,16 175,8 200,12"},
                      {label:"This month",val:"14",sub:"11 tasks left on free",spark:"0,26 25,24 50,20 75,22 100,16 125,18 150,12 175,10 200,8"},
                    ].map(({label,val,sub,spark})=>(
                      <div key={label} style={{ borderRadius:18,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",padding:18 }}>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)" }}>{label}</span>
                          <span style={{ width:22,height:22,borderRadius:6,background:"var(--sb-bg-2)",display:"grid",placeItems:"center" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ink-2)" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </span>
                        </div>
                        <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:44,lineHeight:1,letterSpacing:"-0.03em",fontStyle:"italic",color:"var(--sb-accent-deep)",marginBottom:4 }}>{val}</div>
                        <div style={{ fontSize:13,color:"var(--sb-ink-2)",marginBottom:14 }}>{sub}</div>
                        <svg height="28" width="100%" viewBox="0 0 200 28" preserveAspectRatio="none">
                          <polyline points={spark} fill="none" stroke="var(--sb-ink-3)" strokeWidth="1.5"/>
                        </svg>
                      </div>
                    ))}
                  </div>

                  {/* Recent notes + In progress */}
                  <div style={{ display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12 }}>
                    {/* Recent notes */}
                    <div style={{ borderRadius:18,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",overflow:"hidden" }}>
                      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"16px 20px 12px" }}>
                        <div>
                          <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:22,lineHeight:1 }}>Recent notes</div>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",marginTop:4 }}>From your last week</div>
                        </div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",letterSpacing:".06em" }}>View all →</span>
                      </div>
                      {[
                        {grad:"linear-gradient(135deg,#6B4E32,#8C5A3D)",sh:"LE",title:"Compiler Design — Lecture 14",meta:"lecture · 1h 12m",date:"Today",pill:"Lecture",pillBg:"#FEF3C7",pillC:"#92400E"},
                        {grad:"linear-gradient(135deg,#DB4437,#C44033)",sh:"G",title:'Reply to Priya — "ten minutes late"',meta:"mail.google.com · Delegate",date:"2h ago",pill:"Chat",pillBg:"#FEE2E2",pillC:"#991B1B"},
                        {grad:"linear-gradient(135deg,#2B6CDF,#1E50B0)",sh:"MT",title:"Q2 product planning — 14 May",meta:"meeting · 48m",date:"Yesterday",pill:"Meeting",pillBg:"#DBEAFE",pillC:"#1E3A8A"},
                        {grad:"linear-gradient(135deg,#E27D39,#C65E1E)",sh:"CH",title:"Stripe pricing page — 3 changes",meta:"stripe.com · summarized",date:"Tue",pill:"Chat",pillBg:"#FEE2E2",pillC:"#991B1B"},
                      ].map(({grad,sh,title,meta,date,pill,pillBg,pillC},i)=>(
                        <div key={i} style={{ display:"grid",gridTemplateColumns:"32px 1fr auto auto",alignItems:"center",gap:12,padding:"11px 20px",borderTop:"1px solid var(--sb-line-2)" }}>
                          <div style={{ width:32,height:32,borderRadius:8,background:grad,display:"grid",placeItems:"center",color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,fontWeight:600,flexShrink:0 }}>{sh}</div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:13.5,fontWeight:500,color:"var(--sb-ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{title}</div>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",marginTop:2 }}>{meta}</div>
                          </div>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,padding:"2px 8px",borderRadius:999,background:pillBg,color:pillC,border:`1px solid ${pillC}22`,whiteSpace:"nowrap" }}>{pill}</span>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",whiteSpace:"nowrap" }}>{date}</span>
                        </div>
                      ))}
                    </div>

                    {/* In progress */}
                    <div style={{ borderRadius:18,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel-2)",padding:"16px 18px" }}>
                      <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:22,lineHeight:1,marginBottom:4 }}>
                        In <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>progress.</em>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",marginBottom:14 }}>Live agent work</div>
                      <div style={{ borderRadius:12,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:"14px 14px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                          <span style={{ width:8,height:8,borderRadius:"50%",background:"var(--sb-accent)",boxShadow:"0 0 8px var(--sb-accent)",display:"inline-block",animation:"sbPulse 1.6s infinite" }} />
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-accent-deep)" }}>Delegate · acting</span>
                          <span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)" }}>just now</span>
                        </div>
                        <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:17,lineHeight:1.3,color:"var(--sb-ink)",marginBottom:14 }}>
                          Reply to Marcus on LinkedIn
                        </div>
                        <div style={{ display:"flex",gap:4,marginBottom:10 }}>
                          {[1,2,3,4,5].map(n=>(
                            <span key={n} style={{ height:3,flex:1,borderRadius:999,background:n<3?"var(--sb-accent)":n===3?"linear-gradient(90deg,var(--sb-accent),var(--sb-bg-2))":"var(--sb-bg-2)" }} />
                          ))}
                        </div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)",display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ width:9,height:9,borderRadius:3,background:"linear-gradient(135deg,#0072B1,#005A8E)",display:"inline-block" }} />
                          linkedin.com · step 2 / 5
                        </div>
                      </div>
                      <div style={{ borderRadius:12,border:"1px solid var(--sb-line-2)",background:"var(--sb-panel)",padding:"14px 14px",marginTop:10 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                          <span style={{ width:8,height:8,borderRadius:"50%",background:"#10B981",opacity:0.7,display:"inline-block" }} />
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"#047857" }}>Calm</span>
                        </div>
                        <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:16,color:"var(--sb-ink)",marginBottom:6 }}>No other live work.</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--sb-ink-3)" }}>Start a task from the extension or remote agent.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ PRICING ════════════════════════ */}
      <section style={{ padding:"110px 0",background:"var(--sb-bg-2)" }} id="pricing">
        <div style={wrap}>
          <div style={secHead}>
            <span style={eyebrowStyle}><span style={pip} /> Pricing</span>
            <h2 style={H2}>Free forever. <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>Pro when you want more.</em></h2>
            <p style={subText}>Braino works in your browser. The model runs on us. Pro buys you faster models, more Delegate tasks, and unlimited recording.</p>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,maxWidth:880,margin:"0 auto" }}>
            {/* Free */}
            <div style={{ background:"var(--sb-panel-2)",border:"1px solid var(--sb-line-2)",borderRadius:24,padding:36,display:"flex",flexDirection:"column",gap:18 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:".16em",textTransform:"uppercase",color:"var(--sb-ink-3)" }}>Free</div>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:64,lineHeight:1,letterSpacing:"-0.02em",display:"flex",alignItems:"baseline",gap:6 }}>
                $0<span style={{ fontSize:16,fontFamily:"'Inter',sans-serif",color:"var(--sb-ink-3)",letterSpacing:0 }}>/ forever</span>
              </div>
              <p style={{ color:"var(--sb-ink-2)",fontSize:14.5,lineHeight:1.5 }}>Everything you need to talk to your browser. No credit card.</p>
              <ul style={{ display:"flex",flexDirection:"column",gap:12,margin:"8px 0",padding:0 }}>
                {["Voice mode with live captions","Read & summarize any page","25 Delegate tasks per month","5 hours of recording per month","Dashboard & library"].map(f=>(
                  <li key={f} style={{ display:"flex",gap:10,alignItems:"flex-start",fontSize:14,listStyle:"none",color:"var(--sb-accent-deep)" }}>
                    <CheckIcon /><span style={{ color:"var(--sb-ink)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/braino-extension.zip" download style={{ ...btnGhost,alignSelf:"flex-start" }} onMouseEnter={btnGhostHoverIn} onMouseLeave={btnGhostHoverOut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
                Install free
              </a>
            </div>

            {/* Pro */}
            <div style={{ background:"#14110E",color:"#FBF7F1",borderRadius:24,padding:36,display:"flex",flexDirection:"column",gap:18,position:"relative",outline:"1px solid var(--sb-accent)",outlineOffset:0 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:".16em",textTransform:"uppercase",color:"var(--sb-accent-2)" }}>Pro</div>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:64,lineHeight:1,letterSpacing:"-0.02em",color:"#FBF7F1",display:"flex",alignItems:"baseline",gap:6 }}>
                {proPrice}<span style={{ fontSize:16,fontFamily:"'Inter',sans-serif",color:"rgba(251,247,241,0.6)",letterSpacing:0 }}>&nbsp;{proPer}</span>
              </div>
              <p style={{ color:"rgba(251,247,241,0.7)",fontSize:14.5,lineHeight:1.5 }}>For people who actually live in their browser. Pay yearly, save 20%.</p>
              <ul style={{ display:"flex",flexDirection:"column",gap:12,margin:"8px 0",padding:0 }}>
                {["Everything in Free","Faster, smarter models","Unlimited Delegate tasks","Unlimited recording & transcription","Custom voices & languages","Priority support"].map(f=>(
                  <li key={f} style={{ display:"flex",gap:10,alignItems:"flex-start",fontSize:14,listStyle:"none",color:"var(--sb-accent-2)" }}>
                    <CheckIcon /><span style={{ color:"rgba(251,247,241,0.9)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#install" style={{ display:"inline-flex",alignItems:"center",gap:8,alignSelf:"flex-start",padding:"13px 18px",borderRadius:999,fontSize:14,fontWeight:500,background:"#FBF7F1",color:"#1B1713",border:"1px solid transparent",textDecoration:"none",transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                Start Pro <ArrowRightIcon />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ COINCIDENCE ════════════════════════ */}
      <section style={{ padding:"110px 0", background:"var(--sb-bg-2)" }}>
        <div style={wrap}>
          <div style={{ background:"var(--sb-bg)",borderRadius:24,padding:"72px 64px",textAlign:"center",border:"1px solid var(--sb-line-2)" }}>
            <span style={eyebrowStyle}><span style={pip} /> A note on parallel discovery</span>
            <h3 style={{ fontFamily:"'Instrument Serif',serif",fontStyle:"italic",fontSize:44,lineHeight:1.05,margin:"14px auto 24px",textWrap:"balance" as React.CSSProperties["textWrap"],maxWidth:700 }}>A coincidence of ideas.</h3>
            <p style={{ maxWidth:660,margin:"0 auto 14px",fontSize:16,color:"var(--sb-ink-2)" }}>Yes — Braino and Claude Computer Use are solving the same problem. We know how that looks.</p>
            <p style={{ maxWidth:660,margin:"0 auto 14px",fontSize:16,color:"var(--sb-ink-2)" }}>Braino was built independently, from scratch, before Claude's browser agent was publicly known. Parallel discovery is as old as science itself.</p>
            <div style={{ fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:"var(--sb-ink-3)",margin:"24px 0" }}>The telephone. Calculus. Natural selection.</div>
            <p style={{ maxWidth:660,margin:"0 auto 14px",fontSize:16,color:"var(--sb-ink-2)" }}>What matters now isn't who thought of it first. It's who executes best. We think a smaller, faster, more accessible tool has a real place in the world alongside a well-funded research lab's flagship product.</p>
            <p style={{ maxWidth:660,margin:"18px auto 0",fontSize:16 }}>
              <em style={{ fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:"var(--sb-accent-deep)" }}>We're not trying to beat Anthropic. We're trying to be useful to you, today, right now, in your browser.</em>
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════ CTA BANNER ════════════════════════ */}
      <section style={{ padding:"110px 0" }} id="install">
        <div style={wrap}>
          <div style={{ background:"#14110E",color:"#FBF7F1",borderRadius:24,padding:"72px 56px",textAlign:"center",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",right:-120,top:-120,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle, rgba(243,154,66,0.45), transparent 60%)",filter:"blur(20px)",pointerEvents:"none" }} />
            <div style={{ position:"absolute",left:-100,bottom:-120,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle, rgba(243,154,66,0.2), transparent 60%)",filter:"blur(20px)",pointerEvents:"none" }} />
            <span style={{ ...eyebrowStyle,color:"rgba(255,250,242,0.55)" }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--sb-accent-2)",boxShadow:"0 0 10px var(--sb-accent-2)",display:"inline-block" }} />
              Ready in 6 seconds
            </span>
            <h2 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:"clamp(38px,5vw,64px)",margin:"20px auto 18px",maxWidth:780,textWrap:"balance" as React.CSSProperties["textWrap"],position:"relative",zIndex:1,color:"#FBF7F1" }}>
              Install Braino. <em style={{ fontStyle:"italic",color:"var(--sb-accent-2)" }}>Talk to the web.</em>
            </h2>
            <p style={{ color:"rgba(251,247,241,0.7)",maxWidth:540,margin:"0 auto 32px",fontSize:18,position:"relative",zIndex:1 }}>Free during beta. Sign up in 30 seconds. Everything you save is tied to your account, forever.</p>
            <div style={{ display:"flex",gap:12,justifyContent:"center",position:"relative",zIndex:1,flexWrap:"wrap" }}>
              <a href="/braino-extension.zip" download style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,background:"#FBF7F1",color:"#1B1713",border:"1px solid transparent",textDecoration:"none",transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
                Add to Chrome
              </a>
              <a href="/braino-extension.zip" download style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,background:"transparent",color:"#FBF7F1",border:"1px solid rgba(251,247,241,0.2)",textDecoration:"none",transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                Other browsers <ArrowRightIcon />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer style={{ padding:"80px 0 60px",background:"var(--sb-bg)",borderTop:"1px solid var(--sb-line-2)" }}>
        <div style={wrap}>
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40,marginBottom:60 }}>
            <div>
              <div style={{ display:"flex",alignItems:"baseline",gap:0 }}>
                <span style={{ fontFamily:"'BeVietnam',sans-serif",fontWeight:800,fontSize:18,color:"var(--sb-ink)",letterSpacing:"-0.03em" }}>Braino</span>
              </div>
              <p style={{ fontSize:14,maxWidth:280,marginTop:14,color:"var(--sb-ink-2)" }}>An AI side panel that lives in your browser. Reads pages. Speaks back. Handles tasks. Free during beta.</p>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:60,color:"var(--sb-ink-3)",marginTop:32,letterSpacing:"-0.02em",lineHeight:1 }}>↳ talk to&nbsp;the&nbsp;web.</div>
            </div>
            {[
              { heading:"Product",links:[["#features","Features"],["#delegate","Delegate"],["#speed","Speed"],["#dashboard","Dashboard"],["#pricing","Pricing"]] },
              { heading:"Install",links:[["/braino-extension.zip","Chrome"],["/braino-extension.zip","Arc"],["/braino-extension.zip","Brave"],["/braino-extension.zip","Edge"],["","Desktop app (coming later)"],["#","Firefox (soon)"]] },
              { heading:"Company",links:[["#","Manifesto"],["#","Changelog"],["/privacy","Privacy"],["/terms","Terms"],["/contact","Contact"]] },
            ].map(({heading,links})=>(
              <div key={heading}>
                <h5 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)",margin:"0 0 14px" }}>{heading}</h5>
                <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8 }}>
                  {links.map(([href,label])=>(
                    <li key={label}>
                      {href ? (
                        <a href={href} style={{ fontSize:14,color:"var(--sb-ink-2)",textDecoration:"none",transition:"color .15s" }} onMouseEnter={e=>e.currentTarget.style.color="var(--sb-ink)"} onMouseLeave={e=>e.currentTarget.style.color="var(--sb-ink-2)"}>{label}</a>
                      ) : (
                        <span style={{ fontSize:14,color:"var(--sb-ink-3)" }}>{label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:24,borderTop:"1px solid var(--sb-line-2)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)",letterSpacing:".04em" }}>
            <div>© 2026 Braino · Built by a solo founder, somewhere with good coffee.</div>
            <div>v0.9.2 · Beta</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function BrowserBar({ url, dark }: { url: string; dark?: boolean }) {
  return (
    <div style={{
      height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
      background: dark ? "linear-gradient(180deg, #1C1814, #161210)" : "linear-gradient(180deg, #F5EFE5, #EFE7DB)",
      borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--sb-line-2)",
    }}>
      <div style={{ display:"flex",gap:6 }}>
        {["#E36F62","#E7B654","#74C28D"].map((c,i)=><span key={i} style={{ width:11,height:11,borderRadius:"50%",background:c,display:"inline-block" }} />)}
      </div>
      <div style={{
        flex:1, maxWidth:480, margin:"0 auto",
        background: dark ? "rgba(255,255,255,0.07)" : "var(--sb-panel-2)",
        border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--sb-line)",
        borderRadius:8, padding:"0 12px",
        fontFamily:"'JetBrains Mono',monospace", fontSize:11.5,
        color: dark ? "rgba(255,250,242,0.45)" : "var(--sb-ink-3)",
        display:"flex", alignItems:"center", gap:6, height:28,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:.7 }}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <strong style={{ color: dark ? "rgba(255,250,242,0.65)" : "var(--sb-ink-2)", fontWeight:500 }}>https://</strong>{url}
      </div>
      <img src="/favicon.svg" width={22} height={22} alt="Braino" style={{ display: "inline-block", flexShrink: 0 }} />
    </div>
  );
}

function StepCard({ num,title,body,children }: { num:string,title:string,body:string,children:React.ReactNode }) {
  return (
    <div style={{ background:"var(--sb-panel-2)",border:"1px solid var(--sb-line-2)",borderRadius:18,padding:28,display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:56,lineHeight:1,color:"var(--sb-accent-deep)",letterSpacing:"-0.03em" }}>{num}</div>
      <h3 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:24,lineHeight:1.1 }}>{title}</h3>
      <p style={{ fontSize:14.5,color:"var(--sb-ink-2)" }}>{body}</p>
      <div style={{ marginTop:12 }}>{children}</div>
    </div>
  );
}

function FeatureCard({ tag,title,body,span,children }: { tag:string,title:string,body:string,span:number,children:React.ReactNode }) {
  return (
    <div
      style={{ gridColumn:`span ${span}`,background:"var(--sb-panel-2)",border:"1px solid var(--sb-line-2)",borderRadius:18,padding:28,display:"flex",flexDirection:"column",gap:14,minHeight:320,transition:"transform .2s, border-color .2s" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor="var(--sb-line)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.borderColor="var(--sb-line-2)"; }}
    >
      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-accent-deep)" }}>{tag}</span>
      <h3 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:28 }}>{title}</h3>
      <p style={{ fontSize:14.5,color:"var(--sb-ink-2)" }}>{body}</p>
      <div style={{ marginTop:"auto",paddingTop:8,display:"flex",alignItems:"flex-end" }}>{children}</div>
    </div>
  );
}

function CtrlBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <div style={{ height:34,width:34,borderRadius:10,background:"var(--sb-panel-2)",border:"1px solid var(--sb-line-2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
      {icon}
    </div>
  );
}

// ─── Inline button styles ─────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display:"inline-flex",alignItems:"center",gap:8,
  padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,
  background:"var(--sb-ink)",color:"var(--sb-on-ink)",
  border:"1px solid transparent",textDecoration:"none",
  transition:"transform .15s, background .15s",
};
const btnPrimaryHoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.style.transform = "translateY(-1px)";
  e.currentTarget.style.background = "#000";
};
const btnPrimaryHoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.style.transform = "";
  e.currentTarget.style.background = "var(--sb-ink)";
};
const btnGhost: React.CSSProperties = {
  display:"inline-flex",alignItems:"center",gap:8,
  padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,
  background:"transparent",color:"var(--sb-ink)",
  border:"1px solid var(--sb-line)",textDecoration:"none",
  transition:"transform .15s, background .15s",
};
const btnGhostHoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.style.transform = "translateY(-1px)";
  e.currentTarget.style.background = "var(--sb-panel)";
};
const btnGhostHoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.style.transform = "";
  e.currentTarget.style.background = "transparent";
};
