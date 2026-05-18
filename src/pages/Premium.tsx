import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
);

const FEATURES = [
  { tag: "Recording", title: "Record without limits.", body: "Free users hit a 5-minute cap per day. With Pro, record full lectures, long meetings, hour-long podcasts — however long it runs, SideBrain keeps up.", free: "5 min / day", pro: "Unlimited", big: true },
  { tag: "Storage", title: "Cloud sync & note history.", body: "Free notes live only on your device. Reinstall the extension and they're gone. Pro saves every note to the cloud — switch browsers, log in anywhere, your history is waiting.", free: "Local only", pro: "Unlimited cloud history" },
  { tag: "AI", title: "Smarter AI, richer notes.", body: "Pro runs recordings through a more capable model. Better structure, sharper key points, more accurate glossaries — especially on dense or fast-paced content.", free: "Basic model", pro: "Advanced model" },
  { tag: "Languages", title: "Multi-language transcription.", body: "Recording in Spanish, Hindi, Mandarin, or French? Pro transcribes and structures notes in 50+ languages, automatically detected.", free: "English only", pro: "50+ languages" },
  { tag: "Chat", title: "Chat without limits.", body: "Free users get 5 questions per day. Pro unlocks unlimited chat — ask as many questions as you need and reference your notes and the current page simultaneously.", free: "5 questions / day", pro: "Unlimited", big: true },
  { tag: "Delegate", title: "More Delegate tasks.", body: "Free users get 25 Delegate task runs per month. Pro gives you unlimited — automate as many workflows as you need, every day.", free: "25 tasks / month", pro: "Unlimited" },
  { tag: "Memory", title: "Persistent memory.", body: "SideBrain remembers facts you tell it across sessions — your preferences, your context, your ongoing projects. Free users start fresh every session.", free: "Session only", pro: "Persistent across sessions" },
];

export default function Premium() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isIndia, setIsIndia] = useState<boolean | null>(null);
  const isSuccess = new URLSearchParams(window.location.search).get("success") === "true";

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setIsIndia(d.country_code === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  const priceDisplay = isIndia === null ? "..." : isIndia ? "₹299" : "$12";
  const pricePer = isIndia === null ? "" : isIndia ? "/ month" : "/ month";

  const handleGetPro = async () => {
    if (!user) { window.location.href = "/auth?redirect=/premium"; return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://ovapacfrzddnhrwvkbkr.supabase.co"}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ successUrl: window.location.origin + "/premium?success=true" }),
        }
      );
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Could not start checkout. Please try again."); }
    } catch { alert("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Success banner */}
      {isSuccess && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 10, background: "rgba(76,175,125,0.12)", border: "1px solid rgba(76,175,125,0.3)", color: "var(--sb-ok)", borderRadius: 999, padding: "10px 22px", fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
          You're now a Pro member. Welcome!
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "140px 0 80px", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 860 }}>
          <span style={eyebrow}><span style={pip} /> Pricing</span>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400, fontSize: "clamp(44px,6vw,80px)", lineHeight: 1.0,
            letterSpacing: "-0.025em", margin: "14px auto 24px",
          }}>
            Free forever.{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Pro when you want more.</em>
          </h1>
          <p style={{ fontSize: 18, color: "var(--sb-ink-2)", maxWidth: 600, margin: "0 auto", lineHeight: 1.55 }}>
            SideBrain works in your browser. The model runs on us. Pro buys you faster models, unlimited recordings, and more Delegate runs.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section style={{ padding: "60px 0 110px", background: "var(--sb-bg-2)" }}>
        <div style={{ ...wrap, maxWidth: 880 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 80 }}>
            {/* Free */}
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24, padding: 36, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Free</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 6 }}>
                $0<span style={{ fontSize: 16, fontFamily: "'Inter',sans-serif", color: "var(--sb-ink-3)", letterSpacing: 0 }}>&nbsp;/ forever</span>
              </div>
              <p style={{ color: "var(--sb-ink-2)", fontSize: 14.5, lineHeight: 1.5 }}>Everything you need to get started. No credit card.</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: "8px 0", padding: 0 }}>
                {["Voice mode with live captions", "Read & summarize any page", "25 Delegate tasks / month", "5 min recording / day", "Dashboard & library (local)"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, listStyle: "none", color: "var(--sb-accent-deep)" }}>
                    <CheckIcon /><span style={{ color: "var(--sb-ink)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/#install"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
                  padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                  background: "transparent", color: "var(--sb-ink)",
                  border: "1px solid var(--sb-line)", textDecoration: "none", transition: "transform .15s, background .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "var(--sb-panel)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
                Install free
              </Link>
            </div>

            {/* Pro */}
            <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: 36, display: "flex", flexDirection: "column", gap: 18, outline: "1px solid var(--sb-accent)", outlineOffset: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-2)" }}>Pro</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, letterSpacing: "-0.02em", color: "#FBF7F1", display: "flex", alignItems: "baseline", gap: 6 }}>
                {priceDisplay}<span style={{ fontSize: 16, fontFamily: "'Inter',sans-serif", color: "rgba(251,247,241,0.5)", letterSpacing: 0 }}>&nbsp;{pricePer}</span>
              </div>
              <p style={{ color: "rgba(251,247,241,0.65)", fontSize: 14.5, lineHeight: 1.5 }}>For people who actually live in their browser. Pay yearly, save 20%.</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: "8px 0", padding: 0 }}>
                {["Everything in Free", "Faster, smarter models", "Unlimited Delegate tasks", "Unlimited recording & transcription", "Cloud sync across devices", "Custom voices & 50+ languages", "Persistent memory across sessions", "Priority support"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, listStyle: "none", color: "var(--sb-accent-2)" }}>
                    <CheckIcon /><span style={{ color: "rgba(251,247,241,0.9)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleGetPro}
                disabled={loading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
                  padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                  background: "#FBF7F1", color: "#1B1713", border: "1px solid transparent",
                  cursor: loading ? "wait" : "pointer", transition: "transform .15s, opacity .15s",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
                {loading ? "Redirecting…" : "Start Pro →"}
              </button>
            </div>
          </div>

          {/* Feature breakdown */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(28px,3.5vw,44px)", marginBottom: 12 }}>Everything Pro unlocks.</h2>
            <p style={{ fontSize: 15, color: "var(--sb-ink-2)" }}>What changes when you go Pro, feature by feature.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {FEATURES.map(({ tag, title, body, free, pro, big }) => (
              <div key={title} style={{ gridColumn: big ? "span 2" : "span 1", background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 18, padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-accent-deep)" }}>{tag}</span>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 22, lineHeight: 1.1 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.55, flex: 1 }}>{body}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 4 }}>Free</div>
                    <div style={{ fontSize: 13, color: "var(--sb-ink-2)" }}>{free}</div>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--sb-accent-soft)", border: "1px solid rgba(240,168,107,0.3)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-accent-deep)", marginBottom: 4 }}>Pro</div>
                    <div style={{ fontSize: 13, color: "var(--sb-ink)", fontWeight: 500 }}>{pro}</div>
                  </div>
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
