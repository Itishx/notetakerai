import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";

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

const USD_TO_INR = 96.4;
const INDIA_PRICE_FACTOR = 399 / (21 * USD_TO_INR);

const X_AUTO_OFFERS = [
  { name: "Free preview", usd: 0, replies: "93 replies", bestFor: "Trying it once", notes: "Lets people test quality before paying." },
  { name: "Starter", usd: 9, replies: "500 replies / month", bestFor: "Casual builders", notes: "Good for light timeline presence without feeling expensive." },
  { name: "Core", usd: 15, replies: "1,000 replies / month", bestFor: "Most users", notes: "Best default add-on. Strong value, very healthy margin." },
  { name: "Growth", usd: 29, replies: "2,500 replies / month", bestFor: "Heavy creators", notes: "For people running X Auto regularly across the month." },
  { name: "Pro", usd: 49, replies: "5,000 replies / month", bestFor: "Power users", notes: "Only makes sense once abuse controls and reporting are tighter." },
] as const;

function formatXAutoInrPrice(usd: number) {
  if (usd === 0) return "₹0";
  const discountedInr = usd * USD_TO_INR * INDIA_PRICE_FACTOR;
  const rounded = Math.ceil(discountedInr / 100) * 100 - 1;
  return `₹${rounded}`;
}

function formatDetectedPrice(usd: number, isIndia: boolean | null) {
  if (isIndia === null) return "...";
  if (isIndia) return formatXAutoInrPrice(usd);
  return usd === 0 ? "$0" : `$${usd}`;
}

const FEATURES = [
  { tag: "Voice", title: "Talk to Braino, hands-free.", body: "Voice is where Braino comes alive — speak naturally and he answers in his own voice, and on Pro he can act on what you say. Free gives you a 3-minute daily taste; Pro is unlimited, conversation after conversation.", free: "3 min / day", pro: "Unlimited", big: true },
  { tag: "Agent", title: "Let Braino do it for you.", body: "Delegate turns a sentence into action — Braino opens tabs, searches, and works the page for you. Free includes 5 task runs a month to try it; Pro removes the limit so you can automate as much as you want.", free: "5 tasks / month", pro: "Unlimited", big: true },
  { tag: "Recording", title: "Record without limits.", body: "Free users hit a 5-minute cap per day. With Pro, record full lectures, long meetings, hour-long podcasts — however long it runs, Braino keeps up.", free: "5 min / day", pro: "Unlimited" },
  { tag: "Chat", title: "Chat without limits.", body: "Free users get 10 questions per day. Pro unlocks unlimited chat — ask as many questions as you need and reference your notes and the current page simultaneously.", free: "10 questions / day", pro: "Unlimited" },
  { tag: "Storage", title: "Cloud sync & note history.", body: "Free notes live only on your device. Reinstall the extension and they're gone. Pro saves every note to the cloud — switch browsers, log in anywhere, your history is waiting.", free: "Local only", pro: "Unlimited cloud history" },
  { tag: "AI", title: "Smarter AI, richer notes.", body: "Pro runs recordings through a more capable model. Better structure, sharper key points, more accurate glossaries — especially on dense or fast-paced content.", free: "Basic model", pro: "Advanced model" },
  { tag: "Languages", title: "Multi-language transcription.", body: "Recording in Spanish, Hindi, Mandarin, or French? Pro transcribes and structures notes in 50+ languages, automatically detected.", free: "English only", pro: "50+ languages" },
  { tag: "Memory", title: "Persistent memory.", body: "Braino remembers facts you tell it across sessions — your preferences, your context, your ongoing projects. Free users start fresh every session.", free: "Session only", pro: "Persistent across sessions" },
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

  const priceDisplay = isIndia === null ? "..." : isIndia ? "₹399" : "$21";
  const pricePer = isIndia === null ? "" : isIndia ? "/ month" : "/ month";

  const handleGetPro = async () => {
    if (!user) { window.location.href = "/auth?redirect=/premium"; return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://suwhgaxxdizowbyjlljj.supabase.co"}/functions/v1/create-checkout`,
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
            Braino works in your browser. The basics are free — chat about any page, search, and record. Pro is voice-first: talk to Braino and let him act for you, all unlimited. X Auto lives as a separate add-on.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section style={{ padding: "60px 0 110px", background: "var(--sb-bg-2)" }}>
        <div style={{ ...wrap, maxWidth: 880 }}>
          {/* Feature breakdown */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(28px,3.5vw,44px)", marginBottom: 12 }}>Everything Pro unlocks.</h2>
            <p style={{ fontSize: 15, color: "var(--sb-ink-2)" }}>What changes when you go Pro, feature by feature.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 80 }}>
            {FEATURES.map(({ tag, title, body, free, pro, big }) => (
              <div key={title} style={{ gridColumn: big ? "span 2" : "span 1", background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 18, padding: 28, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
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

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(28px,3.5vw,44px)", marginBottom: 12 }}>Pricing</h2>
            <p style={{ fontSize: 15, color: "var(--sb-ink-2)" }}>Core SideBrain access. X Auto is not bundled into Pro.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 80 }}>
            {/* Free */}
            <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24, padding: 36, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Free</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 6 }}>
                $0<span style={{ fontSize: 16, fontFamily: "'Inter',sans-serif", color: "var(--sb-ink-3)", letterSpacing: 0 }}>&nbsp;/ forever</span>
              </div>
              <p style={{ color: "var(--sb-ink-2)", fontSize: 14.5, lineHeight: 1.5 }}>Everything you need to get started. No credit card.</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: "8px 0", padding: 0 }}>
                {["Read & summarize any page — 10 questions/day", "Web search", "5 min recording / day", "Voice mode — 3 min / day taste", "Delegate — 5 tasks / month taste", "Dashboard & library (local)"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, listStyle: "none", color: "var(--sb-accent-deep)" }}>
                    <CheckIcon /><span style={{ color: "var(--sb-ink)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={EXTENSION_DOWNLOAD_URL}
                download
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
              </a>
            </div>

            {/* Pro */}
            <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: 36, display: "flex", flexDirection: "column", gap: 18, outline: "1px solid var(--sb-accent)", outlineOffset: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-2)" }}>Pro</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, letterSpacing: "-0.02em", color: "#FBF7F1", display: "flex", alignItems: "baseline", gap: 6 }}>
                {priceDisplay}<span style={{ fontSize: 16, fontFamily: "'Inter',sans-serif", color: "rgba(251,247,241,0.5)", letterSpacing: 0 }}>&nbsp;{pricePer}</span>
              </div>
              <p style={{ color: "rgba(251,247,241,0.65)", fontSize: 14.5, lineHeight: 1.5 }}>For people who actually live in their browser — voice-first and fully agentic. X Auto is sold separately as an add-on.</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: "8px 0", padding: 0 }}>
                {["Everything in Free", "Unlimited voice — talk to Braino freely", "Full browser Agent — unlimited Delegate", "Unlimited recording & transcription", "Faster, smarter models", "Cloud sync across devices", "Custom voices & 50+ languages", "Persistent memory across sessions", "Priority support"].map(f => (
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

          <div style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(28px,3.4vw,42px)", marginBottom: 12 }}>
                X Auto is a <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>separate add-on.</em>
              </h2>
              <p style={{ fontSize: 15, color: "var(--sb-ink-2)", maxWidth: 760, margin: "0 auto", lineHeight: 1.6 }}>
                Built for people who want Braino engaging on X without manually writing every reply. Pick the level that matches how often you want it showing up in your timeline.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
              {X_AUTO_OFFERS.map((offer) => (
                <div key={offer.name} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 22, padding: 24, display: "grid", gridTemplateColumns: "minmax(160px,1.1fr) minmax(110px,0.7fr) minmax(140px,0.9fr) minmax(130px,0.85fr) minmax(260px,1.25fr)", gap: 18, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--sb-ink)" }}>{offer.name}</div>
                    {offer.name === "Core" ? (
                      <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999, background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>
                        Recommended
                      </div>
                    ) : null}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>
                      Price
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "var(--sb-ink)" }}>{formatDetectedPrice(offer.usd, isIndia)}</div>
                    <div style={{ fontSize: 12.5, color: "var(--sb-ink-3)", marginTop: 4 }}>per month</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>
                      Usage
                    </div>
                    <div style={{ fontSize: 14, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>{offer.replies}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>
                      Best for
                    </div>
                    <div style={{ fontSize: 14, color: "var(--sb-ink)" }}>{offer.bestFor}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>
                      Notes
                    </div>
                    <div style={{ fontSize: 14, color: "var(--sb-ink-2)", lineHeight: 1.6 }}>{offer.notes}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <Link
                to="/automations"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--sb-ink)",
                  textDecoration: "none",
                  background: "var(--sb-panel)",
                  border: "1px solid var(--sb-line)",
                  transition: "transform .15s, background .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "var(--sb-accent-soft)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "var(--sb-panel)"; }}
              >
                Learn more about X Auto →
              </Link>
            </div>

            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 12, color: "var(--sb-ink-3)", fontSize: 13, justifyContent: "center" }}>
              <span>Pro access sold separately.</span>
              <span>30 replies max per run.</span>
              <span>3 second pacing between replies.</span>
              <span>Payment wiring comes later.</span>
            </div>
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
