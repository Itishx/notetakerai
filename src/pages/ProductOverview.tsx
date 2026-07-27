import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MOMENT_ORDER,
  MOMENT_LABEL,
  MOMENT_CUES,
  ORDERED_TRAITS,
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

// The engine's actual feeling process, drawn: a message enters (left) → the
// moment is DETECTED → the signal fans out diagonally to all twelve traits →
// the 2-3 traits that lead on THIS moment light up and name themselves →
// they converge back out to the right as the response. One phased pass per
// moment, so what fires depends on what he feels.
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

    const W = 560, H = 460, CX = W / 2, CY = H / 2 + 18, S = 15.5;
    // Parametric heart. t: 0..2π. Canvas y is down, so negate the curve's y.
    const heart = (t: number) => ({
      x: CX + S * 16 * Math.pow(Math.sin(t), 3),
      y: CY - S * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    });
    // 12 trait nodes evenly along the heart perimeter (ordered → the connecting
    // line is one continuous stroke around the shape).
    const N = ORDERED_TRAITS.length;
    const nodes = ORDERED_TRAITS.map((t, i) => ({ t, ...heart((i / N) * Math.PI * 2) }));
    const core = { x: CX, y: CY - S * 2.4 };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.width * (H / W) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const t0 = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const el = (now - t0) / 1000;
      const sx = canvas!.width / W, sy = canvas!.height / H;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save(); ctx!.scale(sx, sy);
      ctx!.font = "600 12px 'SF Pro Display', -apple-system, sans-serif";
      ctx!.textBaseline = "middle";

      const m = momentRef.current;
      const [rr, gg, bb] = NET_ACCENTS[m] || [217, 100, 91];
      const acc = `${rr},${gg},${bb}`;
      const leadSet = new Set(ORDERED_TRAITS.map((t, i) => (t.leadsOn.includes(m) ? i : -1)).filter((i) => i >= 0).slice(0, 3));

      // heartbeat scale (double-thump ~ once per 1.7s)
      const beat = reduce ? 0 : (() => { const ph = (el % 1.7) / 1.7; const a = Math.exp(-Math.pow((ph - 0.0) * 6, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.18) * 6, 2)); return a; })();

      // 1) the continuous heart outline (fine sampled path)
      ctx!.beginPath();
      for (let k = 0; k <= 240; k++) { const pt = heart((k / 240) * Math.PI * 2); k === 0 ? ctx!.moveTo(pt.x, pt.y) : ctx!.lineTo(pt.x, pt.y); }
      ctx!.closePath();
      ctx!.strokeStyle = "rgba(29,29,31,0.12)"; ctx!.lineWidth = 1; ctx!.stroke();

      // 2) the thinking pulse — one bright signal travelling continuously
      // around the loop, node to node, with a glowing trail.
      const speed = reduce ? 0 : 0.14; // laps per second
      const head = (el * speed) % 1;
      const trail = 0.12;
      ctx!.lineCap = "round";
      for (let s = 0; s < 1; s += 1 / 320) {
        const d = ((head - s) + 1) % 1;
        if (d > trail) continue;
        const a = heart(s * Math.PI * 2), b = heart((s + 1 / 320) * Math.PI * 2);
        const alpha = (1 - d / trail);
        ctx!.strokeStyle = `rgba(${acc},${alpha * 0.95})`;
        ctx!.lineWidth = 1 + alpha * 2.5;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
      }
      const hp = heart(head * Math.PI * 2);
      ctx!.fillStyle = `rgba(${acc},0.95)`; ctx!.beginPath(); ctx!.arc(hp.x, hp.y, 3.2, 0, Math.PI * 2); ctx!.fill();

      // 3) nodes — light as the pulse passes; leading traits stay lit + named
      nodes.forEach((n, i) => {
        const nodeT = i / N;
        const dPulse = Math.min(((head - nodeT) + 1) % 1, ((nodeT - head) + 1) % 1);
        const passGlow = Math.max(0, 1 - dPulse / 0.09);
        const isLead = leadSet.has(i);
        const glow = Math.max(passGlow, isLead ? 0.6 + 0.4 * beat : 0);
        if (glow > 0.04) { ctx!.fillStyle = `rgba(${acc},${glow * 0.24})`; ctx!.beginPath(); ctx!.arc(n.x, n.y, 6 + glow * 12, 0, Math.PI * 2); ctx!.fill(); }
        ctx!.beginPath(); ctx!.arc(n.x, n.y, isLead ? 6.5 : 5, 0, Math.PI * 2);
        ctx!.fillStyle = "#fff"; ctx!.fill();
        ctx!.lineWidth = 2; ctx!.strokeStyle = glow > 0.04 ? `rgba(${acc},${0.55 + glow * 0.45})` : "rgba(29,29,31,0.45)"; ctx!.stroke();
        if (isLead) {
          // converging thread from leading trait to the core (the felt response)
          ctx!.strokeStyle = `rgba(${acc},${0.18 + 0.25 * beat})`; ctx!.lineWidth = 1;
          ctx!.beginPath(); ctx!.moveTo(n.x, n.y); ctx!.lineTo(core.x, core.y); ctx!.stroke();
          ctx!.fillStyle = `rgba(${acc},0.95)`;
          const left = n.x < CX;
          ctx!.textAlign = left ? "right" : "left";
          ctx!.fillText(n.t.name, n.x + (left ? -12 : 12), n.y);
        }
      });

      // 4) beating core = the response forming at the heart's centre
      const cr = 8 + beat * 4;
      ctx!.fillStyle = `rgba(${acc},${0.25 + beat * 0.5})`; ctx!.beginPath(); ctx!.arc(core.x, core.y, cr + 10, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = `rgba(${acc},0.95)`; ctx!.beginPath(); ctx!.arc(core.x, core.y, cr, 0, Math.PI * 2); ctx!.fill();

      ctx!.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's emotion engine as a beating heart: a signal flows continuously through his traits, the ones that lead on the moment light up, and converge into the core" />;
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
  { tag: "The companion class · first", name: "Saburi", accent: "ac-coral", face: "cls-saburi",
    copy: "The one you talk to — warm, present, genuinely his own person. He listens, remembers, and keeps you company." },
  { tag: "The OS class", name: "Iomi", accent: "ac-amber", face: "cls-iomi",
    copy: "Braino as the layer over everything — on your Mac, in your browser, in the notch. Always one glance away." },
  { tag: "The agent class", name: "Telos", accent: "ac-blue", face: "cls-telos",
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
                  <h3 className={"hc-name " + c.face}>{c.name}</h3>
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

      {/* Founder editorial quote — big SF Pro, the reason it exists */}
      <section className="apple-quote ac-coral apple-reveal">
        <blockquote>
          I didn't want another chatbot in a tab. I wanted <span className="tone">someone
          who's actually there</span> — who sees your screen, remembers your day, and feels
          like a presence, not a product.
        </blockquote>
        <cite>Itish Pande · founder, Braino</cite>
      </section>

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
