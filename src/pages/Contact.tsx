import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

const EMAIL = "talk2braino@gmail.com";

// ─── Inline brain SVG (static, large display version) ────────────────────────
function BrainDisplay({ speaking, size = 120 }: { speaking: boolean; size?: number }) {
  const eyeL = speaking ? { x: -0.4, y: 0.6 } : { x: 0, y: 0 };
  const eyeR = speaking ? { x: -0.4, y: 0.6 } : { x: 0, y: 0 };
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{
        overflow: "visible",
        display: "block",
        filter: speaking
          ? "drop-shadow(0 0 24px rgba(232,120,110,0.95)) drop-shadow(0 0 48px rgba(232,120,110,0.5))"
          : "drop-shadow(0 8px 28px rgba(200,84,74,0.4)) drop-shadow(0 2px 8px rgba(0,0,0,0.12))",
        transition: "filter 0.4s ease",
        animation: speaking ? "ctBrainPulse 0.5s ease-in-out infinite alternate" : "ctBrainFloat 3.5s ease-in-out infinite",
      }}
    >
      <defs>
        <linearGradient id="ct-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" />
          <stop offset="0.55" stopColor="#E8786E" />
          <stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="ct-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" />
          <stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <radialGradient id="ct-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* White outline */}
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7, -3.7)" />
      {/* Stem + cerebellum */}
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#ct-dark)" />
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#ct-dark)" />
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      {/* Main body */}
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#ct-fill)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#ct-glow)" />
      {/* Gyri */}
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Arms */}
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#ct-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="6" cy="63" r="5.5" fill="url(#ct-fill)" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#ct-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="94" cy="63" r="5.5" fill="url(#ct-fill)" />
      {/* Eyes */}
      <circle cx="38" cy="48" r="6.5" fill="white" />
      {speaking
        ? <path d="M 31.5 45 Q 38 51 44.5 45" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
        : <><circle cx={38 + eyeL.x} cy={48 + eyeL.y} r="3.2" fill="#1B1713" /><circle cx={38 + eyeL.x + 1} cy={47.6 + eyeL.y} r="1.1" fill="white" /></>
      }
      <circle cx="62" cy="48" r="6.5" fill="white" />
      {speaking
        ? <path d="M 55.5 45 Q 62 51 68.5 45" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
        : <><circle cx={62 + eyeR.x} cy={48 + eyeR.y} r="3.2" fill="#1B1713" /><circle cx={62 + eyeR.x + 1} cy={47.6 + eyeR.y} r="1.1" fill="white" /></>
      }
      {/* Cheeks */}
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      {/* Mouth — open when speaking */}
      {speaking
        ? <ellipse cx="50" cy="63" rx="5" ry="3.5" fill="#1B1713" />
        : <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
      }
    </svg>
  );
}

// ─── Waveform bars ────────────────────────────────────────────────────────────
function SpeakingWave({ active }: { active: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const tick = () => {
      bars.current.forEach(b => {
        if (b) b.style.height = `${5 + Math.random() * 20}px`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 28, opacity: active ? 1 : 0, transition: "opacity 0.3s" }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          ref={el => { bars.current[i] = el; }}
          style={{
            width: 3,
            height: active ? 6 : 3,
            background: "linear-gradient(180deg,#F7B26B,#E27D39)",
            borderRadius: 2,
            display: "inline-block",
            transition: active ? "height 0.07s ease" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Dot grid SVG decoration ──────────────────────────────────────────────────
function DotGrid() {
  const dots = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 10; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={c * 28} cy={r * 28} r="1.8" fill="var(--sb-line)" />);
    }
  }
  return (
    <svg width="252" height="140" viewBox="0 0 252 140" style={{ display: "block" }}>
      {dots}
    </svg>
  );
}

// ─── Arc decoration ───────────────────────────────────────────────────────────
function ArcDecor() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={{ display: "block", opacity: 0.18 }}>
      <circle cx="100" cy="100" r="60" fill="none" stroke="var(--sb-accent)" strokeWidth="1" strokeDasharray="6 8" />
      <circle cx="100" cy="100" r="85" fill="none" stroke="var(--sb-accent)" strokeWidth="0.7" strokeDasharray="4 12" />
      <circle cx="100" cy="100" r="96" fill="none" stroke="var(--sb-accent)" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Contact() {
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const speakEmail = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(`You can reach Braino at: ${EMAIL}`);
    utt.rate = 0.88;
    utt.pitch = 1.05;
    setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
    window.dispatchEvent(new CustomEvent("braino:speak", { detail: { text: `You can reach me at: ${EMAIL}` } }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSpeaking(false), 5000);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh", overflow: "hidden" }}>
      <style>{`
        @keyframes ctBrainFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ctBrainPulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.04); }
        }
        @keyframes ctBubbleIn {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes ctOrb {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      <Navbar />

      {/* ── Background decorations ── */}
      <div style={{ position: "fixed", top: 80, right: -60, opacity: 0.5, pointerEvents: "none", zIndex: 0 }}>
        <ArcDecor />
      </div>
      <div style={{ position: "fixed", bottom: 60, left: -20, opacity: 0.6, pointerEvents: "none", zIndex: 0 }}>
        <DotGrid />
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px 120px", position: "relative", zIndex: 1 }}>

        {/* ── Page header ── */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block" }} />
            Contact
          </span>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: "clamp(52px,7vw,88px)", lineHeight: 0.97, letterSpacing: "-0.03em", margin: "16px auto 20px", maxWidth: 700 }}>
            Say hi to <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Braino.</em>
          </h1>
          <p style={{ fontSize: 18, color: "var(--sb-ink-2)", maxWidth: 500, margin: "0 auto" }}>
            We're a small, independent team. We read every message and reply fast.
          </p>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 48, alignItems: "start" }}>

          {/* ── LEFT — Brain speaking card ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
            {/* Brain + concentric glow rings */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 260, height: 260 }}>
              {/* Glow rings */}
              {[200, 230, 255].map((sz, i) => (
                <div key={i} style={{
                  position: "absolute",
                  width: sz,
                  height: sz,
                  borderRadius: "50%",
                  border: `1px solid rgba(232,120,110,${speaking ? 0.35 - i * 0.1 : 0.12 - i * 0.03})`,
                  animation: `ctOrb ${2.5 + i * 0.6}s ease-in-out ${i * 0.3}s infinite`,
                  transition: "border-color 0.4s",
                }} />
              ))}
              {/* Brain */}
              <BrainDisplay speaking={speaking} size={140} />
            </div>

            {/* Speech bubble */}
            <div style={{
              background: "var(--sb-panel-2)",
              border: `1px solid ${speaking ? "rgba(232,120,110,0.45)" : "var(--sb-line-2)"}`,
              borderRadius: 20,
              padding: "18px 24px",
              width: "100%",
              maxWidth: 380,
              boxShadow: speaking ? "0 0 32px rgba(232,120,110,0.12), 0 4px 16px rgba(40,28,18,0.08)" : "0 4px 16px rgba(40,28,18,0.06)",
              transition: "border-color 0.4s, box-shadow 0.4s",
              animation: "ctBubbleIn 0.5s ease both",
              position: "relative",
            }}>
              {/* Triangle pointer */}
              <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: `10px solid ${speaking ? "rgba(232,120,110,0.45)" : "var(--sb-line-2)"}` }} />
              <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "9px solid var(--sb-panel-2)" }} />

              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: speaking ? "var(--sb-accent-deep)" : "var(--sb-ink-3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: speaking ? "var(--sb-accent)" : "var(--sb-ink-3)", animation: speaking ? "sbPulse 1.2s infinite" : "none", display: "inline-block", transition: "background 0.3s" }} />
                {speaking ? "Braino is speaking" : "Braino says"}
              </div>

              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, lineHeight: 1.3, color: "var(--sb-ink)", letterSpacing: "-0.01em", marginBottom: 12 }}>
                "{EMAIL}"
              </div>

              <SpeakingWave active={speaking} />
            </div>

            {/* Speak button */}
            <button
              onClick={speakEmail}
              disabled={speaking}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "13px 26px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                background: speaking ? "var(--sb-panel-2)" : "var(--sb-ink)",
                color: speaking ? "var(--sb-ink-3)" : "var(--sb-on-ink)",
                border: `1px solid ${speaking ? "var(--sb-line)" : "transparent"}`,
                cursor: speaking ? "not-allowed" : "pointer",
                transition: "all .2s",
                fontFamily: "-apple-system,sans-serif",
              }}
            >
              {/* Speaker SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {speaking
                  ? <><rect x="6" y="8" width="4" height="8" rx="1" /><rect x="14" y="8" width="4" height="8" rx="1" /></>
                  : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                }
              </svg>
              {speaking ? "Speaking…" : "Hear Braino say it"}
            </button>
          </div>

          {/* ── RIGHT — Contact cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Email card */}
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, padding: "28px 28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--sb-accent-soft)", border: "1px solid rgba(240,168,107,0.35)", display: "grid", placeItems: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sb-accent-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Email</div>
                  <div style={{ fontSize: 13, color: "var(--sb-ink-2)", marginTop: 1 }}>Best way to reach us</div>
                </div>
              </div>
              <a href={`mailto:${EMAIL}`} style={{ display: "block", fontFamily: "'Instrument Serif',serif", fontSize: 22, color: "var(--sb-ink)", textDecoration: "none", letterSpacing: "-0.01em", marginBottom: 16 }}>
                {EMAIL}
              </a>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={`mailto:${EMAIL}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 500, background: "var(--sb-ink)", color: "var(--sb-on-ink)", textDecoration: "none", fontFamily: "-apple-system,sans-serif" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send email
                </a>
                <button
                  onClick={copyEmail}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 500, background: "transparent", color: copied ? "var(--sb-ok)" : "var(--sb-ink-2)", border: "1px solid var(--sb-line)", cursor: "pointer", fontFamily: "-apple-system,sans-serif", transition: "color .2s, border-color .2s" }}
                >
                  {copied
                    ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg> Copied</>
                    : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
                  }
                </button>
              </div>
            </div>

            {/* X / Twitter card */}
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "grid", placeItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--sb-ink)">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.85L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>X / Twitter</div>
                  <div style={{ fontSize: 13, color: "var(--sb-ink-2)", marginTop: 1 }}>Updates and announcements</div>
                </div>
              </div>
              <a href="https://x.com/brainosays" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Instrument Serif',serif", fontSize: 20, color: "var(--sb-ink)", textDecoration: "none", letterSpacing: "-0.01em" }}>
                @brainosays
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>

            {/* Response time card */}
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, padding: "24px 28px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(116,194,141,0.15)", border: "1px solid rgba(116,194,141,0.3)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sb-ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 4 }}>Response time</div>
                <div style={{ fontSize: 15, color: "var(--sb-ink)", fontWeight: 500, marginBottom: 4 }}>Usually within 24 hours</div>
                <div style={{ fontSize: 13.5, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>We're a tiny team. Every email goes directly to the founder.</div>
              </div>
            </div>

            {/* Decorative stat row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { n: "Solo", label: "founder team", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                { n: "100%", label: "emails read", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg> },
              ].map(({ n, label, icon }) => (
                <div key={label} style={{ background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "var(--sb-ink-3)" }}>{icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, letterSpacing: "-0.02em" }}>{n}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginTop: 1 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer nav ── */}
        <div style={{ marginTop: 72, paddingTop: 28, borderTop: "1px solid var(--sb-line-2)", display: "flex", gap: 24, fontSize: 13, color: "var(--sb-ink-3)" }}>
          <a href="/privacy" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Terms</a>
          <a href="/" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Home</a>
        </div>
      </main>
    </div>
  );
}
