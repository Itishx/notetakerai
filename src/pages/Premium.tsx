import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";

/* ============================================================================
   Braino Pricing — trybraino.com
   Copy: "One brain. Every tab." Two live tiers (Meet Braino / Braino Pro) plus a
   teaser Jarvis Mode waitlist card, a Build Your Brain voice slider, a comparison
   table, FAQ, and the retained X Auto add-on block.
   Impl rules honored:
     - Never display a base voice minute number ("15 minutes"). Voice is always
       "included + expandable"; the slider shows ADD-ON minutes only.
     - Pro price is a flat $20/mo (must match the Polar product price).
     - Pro card gets the coral border/glow; other cards stay neutral.
   ============================================================================ */

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || "https://suwhgaxxdizowbyjlljj.supabase.co";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

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
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const serif = "'Instrument Serif', Georgia, serif";
const readFont = "'Newsreader', Georgia, 'Times New Roman', serif"; // editorial reading serif

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>
);
const ChromeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.4" /><path d="M12 8.6h8M8.9 13.7 4.9 6.8M15.1 13.7l-4 6.9" /></svg>
);
const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>
);

// ─── X Auto (retained add-on) ───────────────────────────────────────────────────
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

// ─── Comparison table ────────────────────────────────────────────────────────────
const COMPARISON: { label: string; free: string; pro: string; mono?: boolean }[] = [
  { label: "Chat", free: "10 / day", pro: "Unlimited", mono: true },
  { label: "Voice mode", free: "5 min / mo", pro: "Included + expandable", mono: true },
  { label: "Delegate tasks", free: "5 / mo", pro: "Unlimited", mono: true },
  { label: "Advanced Delegate", free: "—", pro: "✓" },
  { label: "Memory", free: "7-day session", pro: "Long-term, cross-session" },
  { label: "Cross-tab awareness", free: "✓", pro: "✓" },
  { label: "Build Your Brain add-ons", free: "—", pro: "✓" },
  { label: "Priority features", free: "—", pro: "✓" },
  { label: "Price", free: "Free", pro: "$20 / mo", mono: true },
];

// ─── FAQ ─────────────────────────────────────────────────────────────────────────
const FAQ: { q: string; a: string }[] = [
  { q: "Is the free plan actually free?", a: "Yes. No card, no trial countdown, no tricks. Braino's free tier is free forever. We want you to actually use him before you pay." },
  { q: "What does “unlimited” mean on Pro?", a: "It means unlimited. Chat and delegate as much as you want. We built Braino to be talked to, not rationed." },
  { q: "What are Build Your Brain add-ons?", a: "Pro comes with voice minutes included. If you talk to Braino more than most people, slide up and add exactly what you need, nothing more. It's your brain. Build it your way." },
  { q: "What happens to my memory if I downgrade?", a: "Your long-term memories pause but aren't deleted. Come back to Pro anytime and Braino picks up right where you left off." },
  { q: "What's Jarvis Mode?", a: "🤫" },
  { q: "Can I cancel anytime?", a: "Yep. One click, no retention flow, no guilt trip. (Benu might look at you sadly. That's it.)" },
];

// ─── Build Your Brain slider ─────────────────────────────────────────────────────
// Add-on voice minutes stacked ON TOP of the included allowance. We never show the
// included base number. Rate is a placeholder pending final add-on pricing.
const ADDON_RATE_PER_MIN = 0.1; // $/min — placeholder, confirm before launch
const ADDON_MAX_MIN = 600;
const ADDON_STEP_MIN = 30;

export default function Premium() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isIndia, setIsIndia] = useState<boolean | null>(null);
  const [addonMin, setAddonMin] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [jarvisEmail, setJarvisEmail] = useState("");
  const [jarvisState, setJarvisState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const isSuccess = new URLSearchParams(window.location.search).get("success") === "true";

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setIsIndia(d.country_code === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  const handleGetPro = async () => {
    if (!user) { window.location.href = "/auth?redirect=/premium"; return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ successUrl: window.location.origin + "/premium?success=true" }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Could not start checkout. Please try again."); }
    } catch { alert("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleJarvisWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jarvisEmail.includes("@")) { setJarvisState("error"); return; }
    setJarvisState("loading");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: jarvisEmail.trim(), context: "jarvis-mode" }),
      });
      if (res.ok) { setJarvisState("done"); setJarvisEmail(""); }
      else setJarvisState("error");
    } catch { setJarvisState("error"); }
  };

  const addonPrice = Math.round(addonMin * ADDON_RATE_PER_MIN);
  const sliderCss = `
    .sb-brain-slider{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px;
      background:linear-gradient(90deg, var(--sb-accent) 0%, var(--sb-accent) var(--pct), var(--sb-line) var(--pct), var(--sb-line) 100%); outline:none; cursor:pointer; }
    .sb-brain-slider::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:22px; height:22px; border-radius:50%;
      background:var(--sb-accent); border:3px solid var(--sb-panel-2); box-shadow:0 0 0 1px var(--sb-accent),0 3px 12px rgba(226,125,57,.5); cursor:pointer; }
    .sb-brain-slider::-moz-range-thumb{ width:22px; height:22px; border-radius:50%; background:var(--sb-accent);
      border:3px solid var(--sb-panel-2); box-shadow:0 0 0 1px var(--sb-accent),0 3px 12px rgba(226,125,57,.5); cursor:pointer; }
  `;

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <style>{sliderCss}</style>
      <Navbar />

      {/* Success banner */}
      {isSuccess && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 10, background: "rgba(76,175,125,0.12)", border: "1px solid rgba(76,175,125,0.3)", color: "var(--sb-ok)", borderRadius: 999, padding: "10px 22px", fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
          <CheckIcon /> You're now a Pro member. Welcome!
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{ padding: "140px 0 70px", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 820 }}>
          <span style={eyebrow}><span style={pip} /> Pricing</span>
          <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(46px,7vw,88px)", lineHeight: 0.98, letterSpacing: "-0.03em", margin: "16px auto 22px" }}>
            One brain.{" "}<em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Every tab.</em>
          </h1>
          <p style={{ fontFamily: readFont, fontSize: 22, color: "var(--sb-ink-2)", maxWidth: 600, margin: "0 auto 34px", lineHeight: 1.55 }}>
            Braino lives in your browser, remembers what you're doing, and actually helps. Start free, upgrade when you can't imagine browsing without him.
          </p>
          <a href={EXTENSION_DOWNLOAD_URL} download style={heroCta}>
            <ChromeIcon /> Add Braino to Chrome — Free
          </a>
        </div>
      </section>

      {/* ── Tier cards ── */}
      <section style={{ padding: "10px 0 90px", background: "var(--sb-bg-2)" }}>
        <div style={{ ...wrap, maxWidth: 1080, paddingTop: 60 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "stretch" }}>

            {/* CARD 1 — Free */}
            <div style={neutralCard}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Meet Braino</div>
              <div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                $0<span style={{ fontSize: 15, fontFamily: "'Inter',sans-serif", color: "var(--sb-ink-3)" }}>&nbsp;/ forever</span>
              </div>
              <p style={cardTagline}>Everything Braino does, in small doses.</p>
              <ul style={featureList}>
                {["10 chats a day with Braino", "5 minutes of voice per month", "5 delegate tasks per month", "Session memory (7 days)", "Cross-tab awareness", "Works on every website"].map(f => (
                  <li key={f} style={featureLi}><span style={{ color: "var(--sb-accent-deep)", flexShrink: 0, marginTop: 2 }}><CheckIcon /></span><span>{f}</span></li>
                ))}
              </ul>
              <div style={{ flex: 1 }} />
              <a href={EXTENSION_DOWNLOAD_URL} download style={ghostBtn}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--sb-panel)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = ""; }}>
                Start free
              </a>
              <div style={microcopy}>No card required. Obviously.</div>
            </div>

            {/* CARD 2 — Pro (highlighted) */}
            <div style={proCard}>
              <div style={popularBadge}>Most Popular</div>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-2)" }}>Braino Pro</div>
              <div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", color: "#FBF7F1", display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                $20<span style={{ fontSize: 15, fontFamily: "'Inter',sans-serif", color: "rgba(251,247,241,0.5)" }}>&nbsp;/ month</span>
              </div>
              <p style={{ ...cardTagline, color: "rgba(251,247,241,0.7)" }}>Braino, fully awake.</p>
              <ul style={featureList}>
                {["Unlimited chat — talk all day, every tab", "Unlimited delegate + Advanced Delegate", "Voice included — expandable with Build Your Brain", "Long-term memory — Braino remembers you across sessions", "Advanced memory storage & recall", "Priority access to new features", "Build Your Brain add-ons"].map(f => (
                  <li key={f} style={{ ...featureLi, color: "rgba(251,247,241,0.9)" }}><span style={{ color: "var(--sb-accent-2)", flexShrink: 0, marginTop: 2 }}><CheckIcon /></span><span>{f}</span></li>
                ))}
              </ul>
              <div style={{ flex: 1 }} />
              <button onClick={handleGetPro} disabled={loading} style={{ ...primaryBtn, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
                {loading ? "Redirecting…" : "Go Pro"}
              </button>
              <div style={{ ...microcopy, color: "rgba(251,247,241,0.5)" }}>Cancel anytime. Benu will miss you though.</div>
            </div>

            {/* CARD 3 — Jarvis Mode (coming soon) */}
            <div style={neutralCard}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Jarvis Mode</div>
              <div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--sb-ink-4)", marginTop: 6 }}>—</div>
              <p style={cardTagline}>You'll know it when you see it.</p>
              <ul style={featureList}>
                <li style={featureLi}><span style={{ color: "var(--sb-ink-3)", flexShrink: 0, marginTop: 2 }}><LockIcon /></span><span>Details classified</span></li>
                <li style={featureLi}><span style={{ color: "var(--sb-ink-3)", flexShrink: 0, marginTop: 1 }}>·</span><span style={{ color: "var(--sb-ink-3)" }}>Coming soon</span></li>
              </ul>
              <div style={{ flex: 1 }} />
              {jarvisState === "done" ? (
                <div style={{ ...ghostBtn, cursor: "default", color: "var(--sb-ok)", borderColor: "rgba(76,175,125,0.4)", background: "rgba(76,175,125,0.08)" }}>
                  <CheckIcon /> You're on the list
                </div>
              ) : (
                <form onSubmit={handleJarvisWaitlist} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    type="email" value={jarvisEmail} onChange={e => { setJarvisEmail(e.target.value); if (jarvisState === "error") setJarvisState("idle"); }}
                    placeholder="you@email.com" required
                    style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${jarvisState === "error" ? "var(--sb-accent)" : "var(--sb-line)"}`, background: "var(--sb-panel)", color: "var(--sb-ink)", fontSize: 14, outline: "none", fontFamily: "'Inter',sans-serif" }}
                  />
                  <button type="submit" disabled={jarvisState === "loading"} style={{ ...ghostBtn, justifyContent: "center", cursor: jarvisState === "loading" ? "wait" : "pointer" }}>
                    {jarvisState === "loading" ? "…" : "Join the waitlist"}
                  </button>
                </form>
              )}
              <div style={microcopy}>{jarvisState === "error" ? "Enter a valid email." : "Be first to find out."}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Build Your Brain ── */}
      <section style={{ padding: "90px 0", background: "var(--sb-bg)" }}>
        <div style={{ ...wrap, maxWidth: 720, textAlign: "center" }}>
          <span style={eyebrow}><span style={pip} /> Build Your Brain</span>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(32px,4.4vw,52px)", letterSpacing: "-0.02em", margin: "14px 0 18px" }}>Build Your Brain</h2>
          <p style={{ fontFamily: readFont, fontSize: 21, color: "var(--sb-ink-2)", lineHeight: 1.65, maxWidth: 620, margin: "0 auto 40px" }}>
            Everyone talks to Braino differently. Some of you chat. Some of you never stop talking. Pro comes with voice included, and a slider to add exactly as much as you need. No bundles you don't want. No paying for silence.
          </p>
          <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 22, padding: "34px 36px", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ ...mono, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>Extra voice</div>
                <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1, color: "var(--sb-ink)" }}>
                  {addonMin === 0 ? "Voice included" : `+${addonMin} min / mo`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...mono, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>Add-on</div>
                <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1, color: "var(--sb-accent-deep)" }}>
                  {addonMin === 0 ? "$0" : `+$${addonPrice} / mo`}
                </div>
              </div>
            </div>
            <input
              type="range" min={0} max={ADDON_MAX_MIN} step={ADDON_STEP_MIN} value={addonMin}
              onChange={e => setAddonMin(Number(e.target.value))}
              className="sb-brain-slider"
              style={{ ["--pct" as string]: `${(addonMin / ADDON_MAX_MIN) * 100}%` }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, ...mono, fontSize: 11, color: "var(--sb-ink-3)" }}>
              <span>Included</span>
              <span>Add as much as you need</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section style={{ padding: "80px 0", background: "var(--sb-bg-2)" }}>
        <div style={{ ...wrap, maxWidth: 820 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(30px,3.8vw,46px)", letterSpacing: "-0.02em" }}>Free vs Pro</h2>
          </div>
          <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", padding: "16px 22px", borderBottom: "1px solid var(--sb-line-2)", background: "var(--sb-bg-2)" }}>
              <div />
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", textAlign: "center" }}>Meet Braino</div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-accent-deep)", textAlign: "center" }}>Braino Pro</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", padding: "15px 22px", alignItems: "center", borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--sb-line-2)" : "none" }}>
                <div style={{ fontSize: 14.5, color: "var(--sb-ink)" }}>{row.label}</div>
                <div style={{ textAlign: "center", fontSize: 13.5, color: "var(--sb-ink-2)", ...(row.mono ? mono : {}) }}>{row.free}</div>
                <div style={{ textAlign: "center", fontSize: 13.5, color: "var(--sb-ink)", fontWeight: 500, ...(row.mono ? mono : {}) }}>{row.pro}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "80px 0", background: "var(--sb-bg)" }}>
        <div style={{ ...wrap, maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(30px,3.8vw,46px)", letterSpacing: "-0.02em" }}>Questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 16, overflow: "hidden" }}>
                  <button onClick={() => setOpenFaq(open ? null : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--sb-ink)", fontSize: 16, fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>
                    {item.q}
                    <span style={{ color: "var(--sb-accent-deep)", transition: "transform .2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0, fontSize: 20, lineHeight: 1 }}>+</span>
                  </button>
                  {open && <div style={{ padding: "0 22px 22px", fontFamily: readFont, fontSize: 18.5, color: "var(--sb-ink-2)", lineHeight: 1.7 }}>{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── X Auto (retained add-on) ── */}
      <section style={{ padding: "80px 0", background: "var(--sb-bg-2)" }}>
        <div style={{ ...wrap, maxWidth: 900 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={eyebrow}><span style={pip} /> Add-on</span>
            <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(28px,3.4vw,42px)", letterSpacing: "-0.02em", margin: "14px 0 12px" }}>
              X Auto is a <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>separate add-on.</em>
            </h2>
            <p style={{ fontFamily: readFont, fontSize: 19.5, color: "var(--sb-ink-2)", maxWidth: 720, margin: "0 auto", lineHeight: 1.6 }}>
              Built for people who want Braino engaging on X without manually writing every reply. Pick the level that matches how often you want it showing up in your timeline.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 16 }}>
            {X_AUTO_OFFERS.map(offer => (
              <div key={offer.name} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, padding: 22, display: "grid", gridTemplateColumns: "minmax(150px,1.1fr) minmax(100px,0.7fr) minmax(130px,0.9fr) minmax(120px,0.8fr) minmax(240px,1.25fr)", gap: 16, alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "var(--sb-ink)" }}>{offer.name}</div>
                  {offer.name === "Core" && (
                    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999, background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)", fontSize: 10.5, ...mono, letterSpacing: ".08em", textTransform: "uppercase" }}>Recommended</div>
                  )}
                </div>
                {[["Price", <>{formatDetectedPrice(offer.usd, isIndia)}<div style={{ fontSize: 12, color: "var(--sb-ink-3)", marginTop: 4, fontWeight: 400 }}>per month</div></>], ["Usage", offer.replies], ["Best for", offer.bestFor], ["Notes", offer.notes]].map(([label, val], idx) => (
                  <div key={String(label)} style={{ minWidth: 0 }}>
                    <div style={{ ...mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: idx === 0 ? 20 : 14, fontWeight: idx === 0 ? 600 : 400, color: idx === 3 ? "var(--sb-ink-2)" : idx === 2 ? "var(--sb-ink)" : "var(--sb-ink-2)", lineHeight: 1.55 }}>{val}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <Link to="/automations" style={ghostBtnLink}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "var(--sb-accent-soft)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "var(--sb-panel)"; }}>
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
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ padding: "100px 0", background: "var(--sb-bg)", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 720 }}>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(34px,4.6vw,58px)", letterSpacing: "-0.025em", lineHeight: 1.02, marginBottom: 30 }}>
            Your browser's been <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>lonely</em> this whole time.
          </h2>
          <a href={EXTENSION_DOWNLOAD_URL} download style={heroCta}>
            <ChromeIcon /> Add Braino to Chrome — Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 0", background: "var(--sb-bg)", borderTop: "1px solid var(--sb-line-2)" }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 0, textDecoration: "none" }}>
            <span style={{ fontFamily: "'TNR','Times New Roman',serif", fontStyle: "italic", fontWeight: 400, fontSize: 18, color: "var(--sb-ink)" }}>side</span>
            <span style={{ fontFamily: "'BeVietnam',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--sb-ink)", letterSpacing: "-0.03em" }}>brain</span>
          </Link>
          <div style={{ ...mono, fontSize: 11, color: "var(--sb-ink-3)" }}>© 2026 SideBrain · Beta</div>
        </div>
      </footer>
    </div>
  );
}

// ─── style objects ──────────────────────────────────────────────────────────────
const heroCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 999,
  fontSize: 15, fontWeight: 600, background: "var(--sb-accent)", color: "#FBF7F1",
  border: "none", textDecoration: "none", boxShadow: "0 8px 30px rgba(226,125,57,0.35)", transition: "transform .15s",
};
const neutralCard: React.CSSProperties = {
  background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24,
  padding: 32, display: "flex", flexDirection: "column", gap: 14, position: "relative",
};
const proCard: React.CSSProperties = {
  background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: 32,
  display: "flex", flexDirection: "column", gap: 14, position: "relative",
  outline: "2px solid var(--sb-accent)", outlineOffset: 0,
  boxShadow: "0 0 0 1px var(--sb-accent), 0 12px 50px rgba(226,125,57,0.35)",
};
const popularBadge: React.CSSProperties = {
  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
  background: "var(--sb-accent)", color: "#FBF7F1", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace",
  letterSpacing: ".1em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 999, whiteSpace: "nowrap",
};
const cardTagline: React.CSSProperties = { color: "var(--sb-ink-2)", fontSize: 14.5, lineHeight: 1.5, margin: 0 };
const featureList: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 11, margin: "6px 0", padding: 0, listStyle: "none" };
const featureLi: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--sb-ink)", lineHeight: 1.45 };
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px",
  borderRadius: 999, fontSize: 14.5, fontWeight: 600, background: "#FBF7F1", color: "#1B1713",
  border: "1px solid transparent", transition: "transform .15s, opacity .15s", width: "100%",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px",
  borderRadius: 999, fontSize: 14.5, fontWeight: 500, background: "transparent", color: "var(--sb-ink)",
  border: "1px solid var(--sb-line)", textDecoration: "none", transition: "transform .15s, background .15s", width: "100%",
};
const ghostBtnLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 999,
  fontSize: 14, fontWeight: 500, color: "var(--sb-ink)", textDecoration: "none",
  background: "var(--sb-panel)", border: "1px solid var(--sb-line)", transition: "transform .15s, background .15s",
};
const microcopy: React.CSSProperties = { fontSize: 12, color: "var(--sb-ink-3)", textAlign: "center", marginTop: 2 };
