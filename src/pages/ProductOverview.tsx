import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MOMENT_ORDER,
  MOMENT_LABEL,
  MOMENT_CUES,
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

// The emotion engine as a LIVING neural network. A message arrives, and a
// signal chains through the layers left-to-right — edges carry travelling
// pulses, nodes fire as the wave reaches them (the "multi-chaining"). Overlapping
// waves keep it perpetually thinking. The moment cycling above tints it, so the
// same net you see reacts differently to grief than to banter.
const NET_ACCENTS: Partial<Record<Moment, [number, number, number]>> = {
  grief: [107, 82, 196], heartbreak: [217, 100, 91], venting: [184, 132, 42],
  anxiety: [47, 111, 237], celebration: [58, 143, 95], conflict: [217, 100, 91],
  banter: [58, 143, 95], focused_task: [47, 111, 237], building: [107, 82, 196],
  crisis: [217, 100, 91],
};

function NeuralEngine({ moment }: { moment: Moment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const momentRef = useRef(moment);
  momentRef.current = moment;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const LAYERS = [5, 6, 6, 6, 6, 5];
    const W = 760, H = 460, PADX = 60, PADY = 40;
    const colX = (i: number) => PADX + (i * (W - PADX * 2)) / (LAYERS.length - 1);
    const nodeY = (c: number, j: number) => PADY + (j * (H - PADY * 2)) / (c - 1);
    const nodes = LAYERS.map((c, i) => Array.from({ length: c }, (_, j) => ({ x: colX(i), y: nodeY(c, j) })));
    const edges: { a: { x: number; y: number }; b: { x: number; y: number }; li: number }[] = [];
    for (let i = 0; i < nodes.length - 1; i++)
      for (const a of nodes[i]) for (const b of nodes[i + 1]) edges.push({ a, b, li: i });

    // waves: each has a start time; a front travels 0 → (LAYERS-1) over `dur`.
    const dur = 1500;
    let waves: number[] = [0];
    let raf = 0;
    let lastSpawn = 0;
    const t0 = performance.now();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function fit() {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = (rect.width * (H / W)) * dpr;
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    function draw(now: number) {
      const t = now - t0;
      const sx = canvas!.width / W, sy = canvas!.height / H;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save();
      ctx!.scale(sx, sy);
      const [r, g, b] = NET_ACCENTS[momentRef.current] || [217, 100, 91];
      const acc = `${r},${g},${b}`;

      if (!reduce) {
        if (t - lastSpawn > 620) { waves.push(t); lastSpawn = t; }
        waves = waves.filter((w) => t - w < dur + 400);
      }
      const fronts = reduce ? [] : waves.map((w) => ((t - w) / dur) * (LAYERS.length - 1));

      // edges
      for (const e of edges) {
        let act = 0;
        for (const f of fronts) { const d = Math.abs(f - (e.li + 0.5)); if (d < 0.6) act = Math.max(act, 1 - d / 0.6); }
        ctx!.strokeStyle = act > 0.02 ? `rgba(${acc},${0.15 + act * 0.7})` : "rgba(29,29,31,0.10)";
        ctx!.lineWidth = act > 0.02 ? 0.8 + act * 1.4 : 0.7;
        ctx!.beginPath(); ctx!.moveTo(e.a.x, e.a.y); ctx!.lineTo(e.b.x, e.b.y); ctx!.stroke();
        // travelling pulse
        for (const f of fronts) {
          const p = f - e.li;
          if (p > 0 && p < 1) {
            const px = e.a.x + (e.b.x - e.a.x) * p, py = e.a.y + (e.b.y - e.a.y) * p;
            ctx!.fillStyle = `rgba(${acc},0.85)`;
            ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fill();
          }
        }
      }
      // nodes
      nodes.forEach((layer, li) => {
        let glow = 0;
        for (const f of fronts) { const d = Math.abs(f - li); if (d < 0.5) glow = Math.max(glow, 1 - d / 0.5); }
        for (const n of layer) {
          if (glow > 0.05) { ctx!.fillStyle = `rgba(${acc},${glow * 0.25})`; ctx!.beginPath(); ctx!.arc(n.x, n.y, 16, 0, Math.PI * 2); ctx!.fill(); }
          ctx!.beginPath(); ctx!.arc(n.x, n.y, 7, 0, Math.PI * 2);
          ctx!.fillStyle = "#fff"; ctx!.fill();
          ctx!.strokeStyle = glow > 0.05 ? `rgba(${acc},${0.5 + glow * 0.5})` : "rgba(29,29,31,0.55)";
          ctx!.lineWidth = 2; ctx!.stroke();
        }
      });
      ctx!.restore();
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's emotion engine, a neural network firing in real time" />;
}

// Drives the moment cycle and the caption; the net reacts to whatever moment is current.
function LiveEngine() {
  const moments = MOMENT_ORDER.filter((m) => m !== "neutral");
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 2600);
    return () => clearInterval(t);
  }, [moments.length]);
  const moment: Moment = moments[i];
  const cue = MOMENT_CUES[moment]?.[0] || "";
  return (
    <div className="apple-engine-live" aria-hidden="true">
      <div className="apple-engine-thought">
        <span className="dot" />
        <span>{cue ? <>You say {cue} — he feels <b>{MOMENT_LABEL[moment].replace(/^an? /, "")}</b></> : "listening…"}</span>
      </div>
      <NeuralEngine moment={moment} />
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

// Pinned horizontal-scroll gallery: while the tall section passes the
// viewport, vertical scroll is mapped to horizontal translation of the track.
const CLASSES = [
  { tag: "The companion class · first", name: "Saburi", accent: "ac-coral",
    copy: "The one you talk to — warm, present, genuinely his own person. He listens, remembers, and keeps you company." },
  { tag: "The OS class", name: "Iomi", accent: "ac-green",
    copy: "Braino as the layer over everything — on your Mac, in your browser, in the notch. Always one glance away." },
  { tag: "The agent class", name: "Telos", accent: "ac-blue",
    copy: "Say the outcome and he does the clicking — the browser, the apps, the whole Mac, on your behalf." },
];

function ClassesGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mq = window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    // Height gives the scroll runway; ~1 viewport of scroll per card feels right.
    section.style.height = mq.matches ? "" : `${CLASSES.length * 92 + 40}vh`;
    let raf = 0;
    const onScroll = () => {
      if (mq.matches) { track.style.transform = ""; return; }
      const rect = section.getBoundingClientRect();
      const runway = section.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / runway));
      const maxX = track.scrollWidth - window.innerWidth;
      track.style.transform = `translateX(${-progress * Math.max(0, maxX)}px)`;
    };
    const loop = () => { onScroll(); };
    window.addEventListener("scroll", loop, { passive: true });
    window.addEventListener("resize", () => {
      section.style.height = mq.matches ? "" : `${CLASSES.length * 92 + 40}vh`;
      onScroll();
    }, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", loop); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section className="apple-hscroll ac-coral" id="classes" ref={sectionRef}>
      <div className="apple-hscroll-pin">
        <div className="apple-hscroll-head">
          <h2>He comes in <span className="tone">three classes.</span></h2>
          <p>One brain, three ways to live with you.</p>
        </div>
        <div className="apple-hscroll-viewport">
          <div className="apple-hscroll-track" ref={trackRef}>
            {CLASSES.map((c) => (
              <article className={"apple-hcard " + c.accent} key={c.name}>
                <span className="hc-tag">{c.tag}</span>
                <div className="hc-copy">
                  <h3 className="hc-name">{c.name}</h3>
                  <p>{c.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
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

      {/* The three classes — pinned horizontal-scroll gallery */}
      <ClassesGallery />

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
