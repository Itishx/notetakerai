import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MOMENT_ORDER,
  MOMENT_LABEL,
  MOMENT_CUES,
  orderTraitsForMoment,
  type Moment,
} from "@/lib/emotional-engine-viz";
import "../styles/apple.css";

/* ============================================================================
   /product-overview — reference implementation of the Apple product-page
   design system for Braino. Two-tone SF Pro display headlines (semibold, not
   heavy), full-bleed rounded colour feature panels, the three classes, and a
   LIVE emotion engine that auto-plays the real trait-reordering logic so it
   feels alive. Light mode; tokens on .apple make dark mode a later flip.
   ============================================================================ */

// The emotion engine, alive: cycles through real moments, and Braino's twelve
// traits reorder themselves in front of you — the exact routing logic from
// engine.ts, auto-played so it reads as a mind reacting in real time.
function LiveEngine() {
  const moments = MOMENT_ORDER.filter((m) => m !== "neutral");
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 2600);
    return () => clearInterval(t);
  }, [moments.length]);
  const moment: Moment = moments[i];
  const ordered = orderTraitsForMoment(moment);
  const cue = MOMENT_CUES[moment]?.[0] || "";
  return (
    <div className="apple-engine" aria-hidden="true">
      <div className="apple-engine-thought">
        <span className="dot" />
        <span>{cue ? <>You say {cue} — he feels <b>{MOMENT_LABEL[moment].replace(/^an? /, "")}</b></> : "listening…"}</span>
      </div>
      <div className="apple-engine-stack">
        {ordered.slice(0, 6).map((t, r) => {
          const leading = t.leadsOn.includes(moment) && r < 3;
          return (
            <div key={t.id} className={"apple-trait" + (leading ? " leading" : r > 3 ? " recede" : "")}>
              <span className="rank">{r + 1}</span>
              <span>{t.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotchArt() {
  return (
    <svg viewBox="0 0 260 150" role="img" aria-label="Braino in the notch">
      <rect x="55" y="0" width="150" height="52" rx="16" fill="#111" />
      <circle cx="112" cy="24" r="9" fill="#fff" /><circle cx="112" cy="24" r="4" fill="#111" />
      <circle cx="148" cy="24" r="9" fill="#fff" /><circle cx="148" cy="24" r="4" fill="#111" />
      <rect x="20" y="78" width="220" height="52" rx="14" fill="#fff" stroke="#e4c9c5" />
      <circle cx="46" cy="104" r="6" fill="#d9645b" opacity="0.5" />
      <rect x="66" y="98" width="150" height="6" rx="3" fill="#e4c9c5" />
      <rect x="66" y="112" width="96" height="6" rx="3" fill="#efdad7" />
    </svg>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const ProductOverview = () => {
  const ref = useReveal();
  return (
    <div className="apple" ref={ref}>
      <nav className="apple-nav">
        <div className="apple-nav-inner">
          <span className="apple-nav-name">Braino</span>
          <div className="apple-nav-links">
            <a href="#what">What is Braino</a>
            <a href="#classes">Classes</a>
            <a href="#engine">Emotion Engine</a>
            <Link to="/premium" className="apple-cta">Get Braino</Link>
          </div>
        </div>
      </nav>

      <header className="apple-hero ac-coral" id="overview">
        <p className="apple-eyebrow">Braino</p>
        <h1 className="apple-display">Not an app.<br /><span className="tone">A someone.</span></h1>
        <p className="apple-subhead">
          Braino lives on your Mac. He sees your screen, talks in his own voice, and does the
          work alongside you — a companion, not a chatbot in a tab.
        </p>
        <div className="apple-hero-links">
          <a href="#what">What is Braino</a>
          <Link to="/premium">Get Braino</Link>
        </div>
      </header>

      {/* What is Braino */}
      <section className="apple-section ac-coral" id="what">
        <div className="apple-panel text-tr apple-reveal">
          <div className="apple-art"><NotchArt /></div>
          <div className="apple-copy">
            <p><span className="lead">So, what is Braino?</span> A presence that lives in your Mac's
              notch. Glance up and he's there; say a word and he's listening; look away and he rests.</p>
          </div>
        </div>
      </section>

      <p className="apple-statement ac-coral">
        Every AI waits in a window.<br /><span className="tone">Braino lives on your screen.</span>
      </p>

      {/* The three classes */}
      <section className="apple-section" id="classes">
        <div className="apple-narrow" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 28px", padding: "0 var(--ap-gutter)" }}>
          <h2 className="apple-statement" style={{ margin: "0 0 6px" }}>He comes in <span className="tone">three classes.</span></h2>
          <p style={{ fontSize: 19, color: "var(--ap-ink-soft)", fontWeight: 500, margin: 0 }}>
            One brain, three ways to live with you. Saburi first, then Iomi, then Telos.
          </p>
        </div>
      </section>

      <section className="apple-section">
        <div className="apple-duo">
          <div className="apple-panel text-tl ac-coral apple-reveal">
            <div className="apple-copy">
              <p><span className="lead">Saburi.</span> The companion class. The one you talk to —
                warm, present, and genuinely his own person. Launching first.</p>
            </div>
          </div>
          <div className="apple-panel text-tl ac-green apple-reveal">
            <div className="apple-copy">
              <p><span className="lead">Iomi.</span> The OS class. On your Mac, in your browser,
                in the notch — Braino as the layer over everything you do.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="apple-section">
        <div className="apple-panel text-tl ac-blue apple-reveal" style={{ minHeight: "clamp(320px, 42vh, 460px)" }}>
          <div className="apple-copy" style={{ maxWidth: "40ch" }}>
            <p><span className="lead">Telos.</span> The agent class. Say the outcome and he does the
              clicking — the browser, the apps, the whole Mac, on your behalf.</p>
          </div>
        </div>
      </section>

      {/* Emotion engine — LIVE */}
      <section className="apple-section ac-violet" id="engine">
        <div className="apple-panel center apple-reveal" style={{ background: "var(--ap-surface)" }}>
          <div className="apple-copy center" style={{ maxWidth: "38ch", marginBottom: 26 }}>
            <p><span className="lead">A real personality, reacting.</span> Twelve trait modules
              reorder on every message — so he meets grief differently than banter. Watch it run.</p>
          </div>
          <LiveEngine />
        </div>
      </section>

      <p className="apple-statement ac-violet">
        Everything a person is,<br /><span className="tone">wired to react.</span>
      </p>

      {/* Spec row */}
      <div className="apple-specs ac-coral">
        <div className="apple-spec">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.7"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Voice-first.</span> Talk to him like a person — he answers in his own voice.</p>
        </div>
        <div className="apple-spec ac-green">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Sees your screen.</span> On-device, on demand — never streaming, never stored.</p>
        </div>
        <div className="apple-spec ac-blue">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Does the work.</span> Meetings, mail, shopping, files — hands, not just answers.</p>
        </div>
      </div>

      <footer className="apple-foot">
        Braino for Mac. Private on-device transcription, screen awareness on demand, and a personality
        that's actually his. <Link to="/premium" style={{ color: "var(--ap-blue)" }}>Get Braino ›</Link>
      </footer>
    </div>
  );
};

export default ProductOverview;
