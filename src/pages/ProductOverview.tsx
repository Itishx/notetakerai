import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/apple.css";

/* ============================================================================
   /product-overview — the reference implementation of the Apple product-page
   design system for Braino. Giant two-tone SF Pro display headline, full-bleed
   rounded colour feature panels with bold-lead paragraphs, the emotion-engine
   "multi-chaining" network as the hero graphic, and an icon spec row. Light
   mode; every colour is a token on .apple so dark mode is a later flip.
   ============================================================================ */

// The neural-net "multi-chaining" sticker, drawn as a live SVG so it's crisp
// and theme-tintable — 6 layers, fully connected, the emotion engine as a mind.
function NeuralNet({ stroke = "#1d1d1f" }: { stroke?: string }) {
  const layers = [5, 6, 6, 6, 6, 5];
  const w = 720, h = 520, padX = 70, padY = 40;
  const colX = (i: number) => padX + (i * (w - padX * 2)) / (layers.length - 1);
  const nodeY = (count: number, j: number) => padY + (j * (h - padY * 2)) / (count - 1);
  const nodes = layers.map((c, i) => Array.from({ length: c }, (_, j) => ({ x: colX(i), y: nodeY(c, j) })));
  const edges: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let i = 0; i < nodes.length - 1; i++)
    for (const a of nodes[i])
      for (const b of nodes[i + 1])
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, o: 0.12 + ((a.y + b.x) % 5) * 0.1 });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Braino's emotion engine as a neural network">
      {edges.map((e, k) => (
        <line key={k} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={stroke} strokeWidth={0.9} opacity={e.o} />
      ))}
      {nodes.flat().map((n, k) => (
        <circle key={k} cx={n.x} cy={n.y} r={9} fill="#fff" stroke={stroke} strokeWidth={2.4} />
      ))}
    </svg>
  );
}

// Small notch graphic for the first panel (eyes in a black island + caption).
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
            <a href="#overview">Overview</a>
            <a href="#classes">Classes</a>
            <a href="#engine">Emotion Engine</a>
            <Link to="/premium" className="apple-cta">Get Braino</Link>
          </div>
        </div>
      </nav>

      <header className="apple-hero ac-coral" id="overview">
        <p className="apple-eyebrow">Braino</p>
        <h1 className="apple-display">One brain.<br /><span className="tone">Every screen.</span></h1>
        <p className="apple-subhead">
          A companion that lives on your Mac — sees what you see, talks like a person,
          and does the work with you. Not a chatbot in a tab. A presence.
        </p>
        <div className="apple-hero-links">
          <a href="#engine">See how he thinks</a>
          <Link to="/premium">Get Braino</Link>
        </div>
      </header>

      {/* Hero feature — the notch */}
      <section className="apple-section ac-coral">
        <div className="apple-panel text-tr apple-reveal">
          <div className="apple-art"><NotchArt /></div>
          <div className="apple-copy">
            <p><span className="lead">Always right there.</span> He lives in the notch —
              a glance for what's playing, a word to start talking, gone when you don't need him.</p>
          </div>
        </div>
      </section>

      <p className="apple-statement ac-coral">
        He doesn't wait in a window.<br /><span className="tone">He lives on your screen.</span>
      </p>

      {/* Classes — product variants, like iMac colours */}
      <section className="apple-section" id="classes">
        <div className="apple-duo">
          <div className="apple-panel text-tl ac-green apple-reveal">
            <div className="apple-copy">
              <p><span className="lead">Saburi.</span> The patient one. Reads the page you're on and
                answers about what's literally in front of you.</p>
            </div>
          </div>
          <div className="apple-panel text-tl ac-blue apple-reveal">
            <div className="apple-copy">
              <p><span className="lead">Telos.</span> The doer. Say the outcome —
                he drives the browser, the apps, the whole Mac to get there.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Emotion engine — the neural net hero */}
      <section className="apple-section ac-violet" id="engine">
        <div className="apple-panel center apple-reveal" style={{ background: "var(--ap-surface)" }}>
          <div className="apple-art" style={{ opacity: 0.9 }}><NeuralNet stroke="#1d1d1f" /></div>
          <div className="apple-copy center" style={{ maxWidth: "34ch", position: "relative" }}>
            <p><span className="lead">A real personality, chained.</span> Dozens of trait modules
              fire in sequence — so he sounds like someone who knows you, not a model completing a prompt.</p>
          </div>
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
