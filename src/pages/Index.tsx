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

export default function Index() {
  const heroOrbRef = useRef<HTMLDivElement>(null);
  const { displayText, sideWords } = useTypewriter();
  const [isIndia, setIsIndia] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setIsIndia(d.country_code === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  useEffect(() => {
    const orb = heroOrbRef.current;
    if (!orb) return;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 1200) {
        orb.style.transform = `translateX(-50%) translateY(${y * 0.25}px) scale(${1 - Math.min(0.25, y / 4000)})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const proPrice = isIndia === null ? "…" : isIndia ? "₹299" : "$12";
  const proPer = isIndia === null ? "" : "/ month";

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh", overflowX: "hidden" }}>
      <CursorOrb />
      <Navbar />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section style={{ padding: "120px 0 100px", position: "relative" }}>
        {/* Background orb */}
        <div
          ref={heroOrbRef}
          style={{
            position: "absolute", left: "50%", top: 480,
            transform: "translateX(-50%)",
            width: 460, height: 460,
            pointerEvents: "none", zIndex: 0,
            filter: "blur(0.4px)",
            opacity: 0.75,
          }}
        >
          <div style={{
            position: "absolute", inset: "30%", borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #FFE0BC 0%, #F8A95B 35%, #D9651A 75%)",
            boxShadow: "0 0 80px rgba(243,154,66,0.45), 0 0 160px rgba(243,154,66,0.2), inset 0 -22px 40px rgba(160,60,10,.3)",
            animation: "sbOrbBreathe 5s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, rgba(243,154,66,0.32) 0%, rgba(243,154,66,0.12) 30%, transparent 60%)",
            animation: "sbOrbHalo 5s ease-in-out infinite",
          }} />
        </div>

        <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <span style={eyebrowStyle}><span style={pip} /> AI side panel for your browser</span>
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
            An AI side panel that lives{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>inside</em>
            {" "}your browser.
          </h1>

          {/* Sub */}
          <p style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 36px", fontSize: 19, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>
            Install SideBrain, open any page, click the icon. A side panel wakes up right there — reads the page, answers questions, records lectures, and handles browser tasks for you.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 56, flexWrap: "wrap" }}>
            <a href="#install" style={btnPrimary} onMouseEnter={btnPrimaryHoverIn} onMouseLeave={btnPrimaryHoverOut}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
              Install for Chrome
            </a>
            <a href="#delegate" style={btnGhost} onMouseEnter={btnGhostHoverIn} onMouseLeave={btnGhostHoverOut}>
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
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "radial-gradient(circle at 35% 35%, #FFD9A8 0%, #F39A42 45%, #D96E1A 80%)",
              boxShadow: "0 0 12px rgba(243,154,66,0.5)",
              animation: "sbOrbBreathe 3s ease-in-out infinite",
            }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-accent-deep)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", animation: "sbPulse 1.6s infinite", display: "inline-block" }} />
                SideBrain is speaking
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
              background: "var(--sb-panel-2)",
              borderRadius: 24, border: "1px solid var(--sb-line)",
              boxShadow: "0 1px 2px rgba(40,28,18,.04), 0 40px 80px -30px rgba(40,28,18,.25)",
              overflow: "hidden",
            }}>
              <BrowserBar url="mail.google.com/inbox" />
              <div style={{ display: "flex", minHeight: 540 }}>
                {/* Mock article */}
                <div style={{ flex: 1, padding: "32px 36px", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #DB4437, #C44033)", flexShrink: 0, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>G</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)", letterSpacing: ".04em" }}>GMAIL · INBOX · 3 UNREAD</div>
                  </div>
                  <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, marginBottom: 8, lineHeight: 1.15, color: "var(--sb-ink)" }}>
                    Re: Thursday's onboarding — are you joining?
                  </h1>
                  <div style={{ height: 180, borderRadius: 12, margin: "18px 0", background: "linear-gradient(135deg, #f8f4ef, #EFE7DB)", position: "relative", overflow: "hidden", border: "1px solid var(--sb-line-2)" }}>
                    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {[["From:", "Priya Singh <priya@example.com>"],["To:", "you"],["Date:", "Today 9:41 AM"]].map(([lbl,val])=>(
                        <div key={lbl} style={{ display:"flex",gap:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
                          <span style={{ color:"var(--sb-ink-3)",width:36,flexShrink:0 }}>{lbl}</span>
                          <span style={{ color:"var(--sb-ink-2)" }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ marginTop:8,fontSize:13,color:"var(--sb-ink-2)",lineHeight:1.5 }}>Hey — just checking if you're joining us Thursday. Let me know by EOD if possible.</div>
                    </div>
                  </div>
                  {[100,90,95,75,100,90,60].map((w, i) => (
                    <div key={i} style={{
                      height: 11,
                      background: i === 2 ? "linear-gradient(90deg, var(--sb-accent-soft), rgba(240,168,107,0.5))" : "var(--sb-bg-2)",
                      borderRadius: 4, margin: "10px 0", width: `${w}%`,
                    }} />
                  ))}
                </div>

                {/* SideBrain panel */}
                <div style={{ width: 380, flexShrink: 0, background: "var(--sb-panel)", borderLeft: "1px solid var(--sb-line)", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--sb-line-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block" }} />
                      SideBrain
                    </div>
                    <span style={{ color: "var(--sb-ink-3)", fontSize: 18 }}>×</span>
                  </div>
                  <div style={{ margin: "14px 16px 0", padding: "10px 12px", background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, #DB4437, #C44033)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 10, flexShrink: 0 }}>G</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--sb-ink)", fontWeight: 500, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Re: Thursday's onboarding — Gmail</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--sb-ink-3)" }}>mail.google.com</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--sb-accent-deep)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sb-accent)", animation: "sbPulse 1.6s infinite", display: "inline-block" }} />
                      reading
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 12px" }}>
                      <div style={{ width: 96, height: 96, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #FFD9A8 0%, #F39A42 45%, #D96E1A 80%)", boxShadow: "0 0 50px rgba(243,154,66,0.45), inset 0 -12px 22px rgba(160,60,10,.25)", animation: "sbOrbBreathe 3.5s ease-in-out infinite" }} />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", animation: "sbPulse 1.6s infinite", display: "inline-block" }} />
                      Agent speaking
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, lineHeight: 1.25, color: "var(--sb-ink)", letterSpacing: "-0.005em", minHeight: 80 }}>
                      {sideWords.map((w, i) => (
                        <span key={i} style={{ opacity: w.state === "unsaid" ? 0.22 : 1, color: w.state === "current" ? "var(--sb-accent-deep)" : "var(--sb-ink)", transition: "opacity .25s" }}>
                          {w.word}{" "}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", gap: 8, borderTop: "1px solid var(--sb-line-2)" }}>
                      <CtrlBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ink-2)" strokeWidth="1.7" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>} />
                      <div style={{ height: 34, padding: "0 12px", borderRadius: 10, background: "var(--sb-ink)", border: "1px solid var(--sb-ink)", display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--sb-on-ink)", cursor: "pointer" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                        Interrupt
                      </div>
                      <div style={{ flex: 1 }} />
                      <CtrlBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ink-2)" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>} />
                    </div>
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
            <h2 style={H2}>Three steps. <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Then you're talking.</em></h2>
            <p style={subText}>Install, sign in, and open any page. Your account keeps everything saved and tied to you across devices.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <StepCard num="01" title="Install the extension." body="Add it to Chrome, Arc, Brave, or Edge in about six seconds. Sign in or create a free account — takes 30 seconds, no card required.">
              <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "92%", height: 36, borderRadius: 8, background: "linear-gradient(180deg, #F8F4ED, #EFE7DB)", border: "1px solid var(--sb-line)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
                  <div style={{ display: "flex", gap: 4 }}>{["#DDD3C5","#DDD3C5","#DDD3C5"].map((c,i)=><span key={i} style={{ width:7,height:7,borderRadius:"50%",background:c,display:"inline-block" }} />)}</div>
                  <div style={{ flex:1,height:16,background:"#fff",border:"1px solid var(--sb-line-2)",borderRadius:6 }} />
                  <div style={{ width:18,height:18,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",boxShadow:"0 0 8px rgba(243,154,66,0.55)",animation:"sbPop 1.8s ease-in-out infinite" }} />
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

            <StepCard num="03" title="Click the orb." body="The side panel wakes up. Ask it anything, or just speak. It reads what you're looking at, answers questions, runs tasks, and saves everything to your account automatically.">
              <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",boxShadow:"0 0 14px rgba(243,154,66,0.5)" }} />
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
            <h2 style={H2}>Everything happens <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>right there</em> in the panel.</h2>
            <p style={subText}>No new app, no copy-pasting URLs. SideBrain reads the tab you're already on and acts where you are.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 18 }}>
            {/* Reads pages — large */}
            <FeatureCard tag="01 — Reads" title="Reads any page." body="Selection or full document. Long article, dense doc, tabular dashboard, gnarly PDF — SideBrain parses the live DOM, not a screenshot, so it understands structure as well as content." span={7}>
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
                <div style={{ width:48,height:48,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",boxShadow:"0 0 16px rgba(243,154,66,0.5)",animation:"sbOrbBreathe 3s ease-in-out infinite" }} />
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
            <span style={eyebrowStyle}><span style={pip} /> SideBrain Delegate</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 80, alignItems: "center" }}>
            <div>
              <h2 style={{ ...H2, textAlign: "left", margin: "0 0 24px" }}>Hand it the keys to your browser.</h2>
              <p style={{ fontSize: 19, color: "var(--sb-ink-2)", lineHeight: 1.55, marginBottom: 28 }}>
                Delegate is SideBrain's autonomous agent. Tell it what you want done — in plain language — and it operates your tabs the way you would. Clicks, types, scrolls, navigates. With your supervision, or on its own.
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
            <h2 style={H2}>Most browser agents see your page <em style={{ color:"var(--sb-accent-deep)",fontStyle:"italic" }}>through a camera.</em><br />SideBrain reads it like a developer.</h2>
            <p style={subText}>Computer Use takes a screenshot, sends it to a vision model, and asks "what should I click?" — every step. SideBrain reads the live DOM directly. That difference compounds with every single action.</p>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
            {/* SideBrain col */}
            <div style={{ borderRadius:24,padding:32,display:"flex",flexDirection:"column",border:"1px solid var(--sb-line)",background:"var(--sb-panel-2)" }}>
              <h3 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:28,display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
                <span style={{ width:12,height:12,borderRadius:"50%",background:"var(--sb-accent)",boxShadow:"0 0 12px var(--sb-accent)",display:"inline-block",flexShrink:0 }} /> SideBrain
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
              { title:"Why reading the DOM is faster.", body:"SideBrain's content script reads the live DOM directly. Every button, input, and link comes back as structured text with selectors — not pixels. The model gets a clean element list and acts immediately. No screenshot. No vision model. No waiting for frames to render." },
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
              { feature:"How they compare",us:"SideBrain",them:"Claude Computer Use",isHeader:true },
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
            <BrowserBar url="app.sidebrain.info/library" />
            <div style={{ display:"flex",minHeight:600 }}>
              {/* Sidebar */}
              <aside style={{ width:240,flexShrink:0,background:"#F0E9DF",borderRight:"1px solid #E2D8CC",padding:"18px 14px",display:"flex",flexDirection:"column",gap:4 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"4px 8px 18px" }}>
                  <span style={{ width:20,height:20,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8 0%, #F39A42 45%, #D96E1A 80%)",display:"inline-block",flexShrink:0 }} />
                  <span style={{ fontWeight:600,fontSize:14 }}>SideBrain</span>
                </div>
                {[
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h12"/></svg>,label:"Library",badge:"124",active:true },
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,label:"Chats" },
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>,label:"Tasks",badge:"3" },
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M5 8l7-7 7 7M5 16l7 7 7-7"/></svg>,label:"Recordings" },
                ].map(({icon,label,badge,active})=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,fontSize:13.5,cursor:"default",background:active?"#2A1F14":"transparent",color:active?"#FBF7F1":"#7A6A5A" }}>
                    {icon}{label}
                    {badge&&<span style={{ marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"1px 6px",borderRadius:4,background:active?"rgba(255,255,255,0.15)":"rgba(243,154,66,0.15)",color:active?"rgba(255,255,255,0.85)":"#A0622A" }}>{badge}</span>}
                  </div>
                ))}
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"#C0A882",padding:"18px 8px 6px" }}>Workspace</div>
                {[
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,label:"Memory" },
                  { icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1z"/></svg>,label:"Settings" },
                ].map(({icon,label})=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,fontSize:13.5,color:"#7A6A5A",cursor:"default" }}>{icon}{label}</div>
                ))}
              </aside>

              {/* Main */}
              <main style={{ flex:1,padding:"28px 32px",background:"#FDFAF6",minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:24 }}>
                  <h3 style={{ fontFamily:"'Instrument Serif',serif",fontSize:32,fontWeight:400,color:"#2A1F14" }}>Library</h3>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#A0927F",letterSpacing:".04em" }}>SHOWING 6 OF 124</div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28 }}>
                  {[{lbl:"Conversations",val:"124",delta:"+12 this week"},{lbl:"Tasks completed",val:"87",delta:"+9 today"},{lbl:"Lectures recorded",val:"23",delta:"14h of audio"},{lbl:"Pages read",val:"1.2k",delta:"Across 47 sites",accent:true}].map(({lbl,val,delta,accent})=>(
                    <div key={lbl} style={{ background:"#F5EFE5",border:"1px solid #E8DFD2",borderRadius:12,padding:"16px 18px" }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"#A0927F",marginBottom:8 }}>{lbl}</div>
                      <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:30,letterSpacing:"-0.01em" }}><em style={{ color:"#B5601A",fontStyle:"italic" }}>{val}</em></div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:accent?"#A0622A":"#3D8A6A",marginTop:4 }}>{delta}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"18px 0 12px" }}>
                  <h4 style={{ fontFamily:"'Instrument Serif',serif",fontSize:22,fontWeight:400,color:"#2A1F14" }}>Recent</h4>
                  <a href="#" style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#A0927F",textDecoration:"none" }}>VIEW ALL →</a>
                </div>
                <div>
                  {[
                    { bg:"linear-gradient(135deg,#DB4437,#C44033)",ic:"G",title:'Reply to Priya — "I\'ll be ten minutes late"',meta:"mail.google.com · 4 steps · Delegate",date:"2 min ago",pill:"sent",pillStyle:"done" },
                    { bg:"#FF6B35",ic:"S",title:"Stripe pricing page — 3 key changes detected",meta:"stripe.com · summarized · 2 min read",date:"23 min ago",pill:"saved",pillStyle:"saved" },
                    { bg:"linear-gradient(135deg,#6B4E32,#8C5A3D)",ic:"CS",title:"Compiler Design — Lecture 14: Optimization passes",meta:"recorded · 1h 12m · transcribed",date:"Today, 11:04",pill:"ready",pillStyle:"done" },
                    { bg:"linear-gradient(135deg,#0072B1,#005A8E)",ic:"in",title:"Draft reply to Marcus's recruiter message",meta:"linkedin.com · Delegate",date:"Yesterday",pill:"draft",pillStyle:"draft" },
                    { bg:"linear-gradient(135deg,#1D9BF0,#0F76C0)",ic:"𝕏",title:'"Find me the original Karpathy thread about nanoGPT"',meta:"x.com · 3 steps · found 1 result",date:"Yesterday",pill:"done",pillStyle:"done" },
                    { bg:"#2A1F14",ic:"A",title:"Summarize this Stripe pricing change PDF",meta:"arxiv-style.pdf · 12 pages",date:"Tue",pill:"saved",pillStyle:"saved" },
                  ].map(({bg,ic,title,meta,date,pill,pillStyle},i)=>(
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"26px 1fr 100px 80px",alignItems:"center",gap:14,padding:"14px 6px",borderBottom:i<5?"1px solid #E8DFD2":"none" }}>
                      <div style={{ width:22,height:22,borderRadius:6,display:"grid",placeItems:"center",color:"#fff",fontSize:11,background:bg,flexShrink:0 }}>{ic}</div>
                      <div>
                        <div style={{ fontSize:14,color:"#2A1F14",fontWeight:500 }}>{title}</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#A0927F",marginTop:2 }}>{meta}</div>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#A0927F" }}>{date}</div>
                      <div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"3px 8px",borderRadius:999,letterSpacing:".04em",display:"inline-flex",alignItems:"center",gap:5,background:pillStyle==="done"?"#D9F0E6":pillStyle==="draft"?"#F4ECE2":"#FBECD6",color:pillStyle==="done"?"#2D7A52":pillStyle==="draft"?"#8A7060":"#A0622A" }}>
                          <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block" }} />{pill}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </main>
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
            <p style={subText}>SideBrain works in your browser. The model runs on us. Pro buys you faster models, more Delegate tasks, and unlimited recording.</p>
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
              <a href="#install" style={{ ...btnGhost,alignSelf:"flex-start" }} onMouseEnter={btnGhostHoverIn} onMouseLeave={btnGhostHoverOut}>
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
            <p style={{ maxWidth:660,margin:"0 auto 14px",fontSize:16,color:"var(--sb-ink-2)" }}>Yes — SideBrain and Claude Computer Use are solving the same problem. We know how that looks.</p>
            <p style={{ maxWidth:660,margin:"0 auto 14px",fontSize:16,color:"var(--sb-ink-2)" }}>SideBrain was built independently, from scratch, before Claude's browser agent was publicly known. Parallel discovery is as old as science itself.</p>
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
              Install SideBrain. <em style={{ fontStyle:"italic",color:"var(--sb-accent-2)" }}>Talk to the web.</em>
            </h2>
            <p style={{ color:"rgba(251,247,241,0.7)",maxWidth:540,margin:"0 auto 32px",fontSize:18,position:"relative",zIndex:1 }}>Free during beta. Sign up in 30 seconds. Everything you save is tied to your account, forever.</p>
            <div style={{ display:"flex",gap:12,justifyContent:"center",position:"relative",zIndex:1,flexWrap:"wrap" }}>
              <a href="#" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,background:"#FBF7F1",color:"#1B1713",border:"1px solid transparent",textDecoration:"none",transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
                Add to Chrome
              </a>
              <a href="#" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:999,fontSize:14,fontWeight:500,background:"transparent",color:"#FBF7F1",border:"1px solid rgba(251,247,241,0.2)",textDecoration:"none",transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
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
                <span style={{ fontFamily:"'TNR','Times New Roman',serif",fontStyle:"italic",fontWeight:400,fontSize:18,color:"var(--sb-ink)" }}>side</span>
                <span style={{ fontFamily:"'BeVietnam',sans-serif",fontWeight:800,fontSize:18,color:"var(--sb-ink)",letterSpacing:"-0.03em" }}>brain</span>
              </div>
              <p style={{ fontSize:14,maxWidth:280,marginTop:14,color:"var(--sb-ink-2)" }}>An AI side panel that lives in your browser. Reads pages. Speaks back. Handles tasks. Free during beta.</p>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:60,color:"var(--sb-ink-3)",marginTop:32,letterSpacing:"-0.02em",lineHeight:1 }}>↳ talk to&nbsp;the&nbsp;web.</div>
            </div>
            {[
              { heading:"Product",links:[["#features","Features"],["#delegate","Delegate"],["#speed","Speed"],["#dashboard","Dashboard"],["#pricing","Pricing"]] },
              { heading:"Install",links:[["#","Chrome"],["#","Arc"],["#","Brave"],["#","Edge"],["#","Firefox (soon)"]] },
              { heading:"Company",links:[["#","Manifesto"],["#","Changelog"],["#","Privacy"],["#","Terms"],["#","Contact"]] },
            ].map(({heading,links})=>(
              <div key={heading}>
                <h5 style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--sb-ink-3)",margin:"0 0 14px" }}>{heading}</h5>
                <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8 }}>
                  {links.map(([href,label])=>(
                    <li key={label}><a href={href} style={{ fontSize:14,color:"var(--sb-ink-2)",textDecoration:"none",transition:"color .15s" }} onMouseEnter={e=>e.currentTarget.style.color="var(--sb-ink)"} onMouseLeave={e=>e.currentTarget.style.color="var(--sb-ink-2)"}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:24,borderTop:"1px solid var(--sb-line-2)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--sb-ink-3)",letterSpacing:".04em" }}>
            <div>© 2026 SideBrain · Built by a solo founder, somewhere with good coffee.</div>
            <div>v0.9.2 · Beta</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function BrowserBar({ url }: { url: string }) {
  return (
    <div style={{ height:44,display:"flex",alignItems:"center",gap:8,padding:"0 14px",background:"linear-gradient(180deg, #F5EFE5, #EFE7DB)",borderBottom:"1px solid var(--sb-line-2)" }}>
      <div style={{ display:"flex",gap:6 }}>
        {["#E36F62","#E7B654","#74C28D"].map((c,i)=><span key={i} style={{ width:11,height:11,borderRadius:"50%",background:c,display:"inline-block" }} />)}
      </div>
      <div style={{ flex:1,maxWidth:480,margin:"0 auto",background:"var(--sb-panel-2)",border:"1px solid var(--sb-line)",borderRadius:8,padding:"0 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,color:"var(--sb-ink-3)",display:"flex",alignItems:"center",gap:6,height:28 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:.7 }}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <strong style={{ color:"var(--sb-ink-2)",fontWeight:500 }}>https://</strong>{url}
      </div>
      <span style={{ width:22,height:22,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #FFD9A8 0%, #F39A42 45%, #D96E1A 80%)",boxShadow:"0 0 6px rgba(243,154,66,0.4)",border:"2px solid #fff",display:"inline-block" }} />
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
