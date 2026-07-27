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
const MOMENT_START = 2600; // must match LiveEngine's interval
function NeuralEngine({ moment }: { moment: Moment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const momentRef = useRef(moment);
  const phaseStartRef = useRef(performance.now());
  useEffect(() => { momentRef.current = moment; phaseStartRef.current = performance.now(); }, [moment]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const W = 860, H = 460;
    const IN = { x: 66, y: H / 2 };
    const DET = { x: 210, y: H / 2 };
    const OUT = { x: 794, y: H / 2 };
    // 12 traits in two columns of 6
    const traitNodes = ORDERED_TRAITS.map((t, i) => {
      const col = i < 6 ? 0 : 1;
      const j = i % 6;
      return { t, x: col === 0 ? 420 : 585, y: 52 + j * ((H - 104) / 5) };
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.width * (H / W) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);

    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, p: number) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
    let raf = 0;

    const draw = (now: number) => {
      const sx = canvas!.width / W, sy = canvas!.height / H;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save(); ctx!.scale(sx, sy);
      ctx!.font = "600 13px 'SF Pro Display', -apple-system, sans-serif";
      ctx!.textBaseline = "middle";

      const m = momentRef.current;
      const [rr, gg, bb] = NET_ACCENTS[m] || [217, 100, 91];
      const acc = `${rr},${gg},${bb}`;
      const leadIdx = ORDERED_TRAITS.map((t, i) => (t.leadsOn.includes(m) ? i : -1)).filter((i) => i >= 0).slice(0, 3);

      // phase 0..1 through the moment (loops if it overruns)
      const p = reduce ? 1 : Math.min(1, (now - phaseStartRef.current) / MOMENT_START);
      // sub-phases: A in→det, B det→traits, C highlight, D leads→out
      const pA = Math.min(1, p / 0.16);
      const pB = Math.min(1, Math.max(0, (p - 0.16) / 0.34));
      const pC = Math.min(1, Math.max(0, (p - 0.5) / 0.18));
      const pD = Math.min(1, Math.max(0, (p - 0.7) / 0.3));

      const faint = "rgba(29,29,31,0.12)";
      const dot = (pt: { x: number; y: number }, r: number, a: number) => { ctx!.fillStyle = `rgba(${acc},${a})`; ctx!.beginPath(); ctx!.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx!.fill(); };
      const line = (a: { x: number; y: number }, b: { x: number; y: number }, col: string, w: number) => { ctx!.strokeStyle = col; ctx!.lineWidth = w; ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke(); };
      const node = (pt: { x: number; y: number }, glow: number, r = 7) => {
        if (glow > 0.03) { ctx!.fillStyle = `rgba(${acc},${glow * 0.22})`; ctx!.beginPath(); ctx!.arc(pt.x, pt.y, r + 11, 0, Math.PI * 2); ctx!.fill(); }
        ctx!.beginPath(); ctx!.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx!.fillStyle = "#fff"; ctx!.fill();
        ctx!.lineWidth = 2; ctx!.strokeStyle = glow > 0.03 ? `rgba(${acc},${0.5 + glow * 0.5})` : "rgba(29,29,31,0.5)"; ctx!.stroke();
      };

      // fan edges det→traits (faint always; pulse during B)
      traitNodes.forEach((tn) => { line(DET, tn, faint, 0.7); });
      // converge edges leads→out (faint always)
      leadIdx.forEach((i) => line(traitNodes[i], OUT, faint, 0.7));
      // in→det edge
      line(IN, DET, p > 0 ? `rgba(${acc},${0.2 + pA * 0.6})` : faint, 1.2);

      // A: pulse in→det
      if (pA > 0 && pA < 1) dot(lerp(IN, DET, pA), 3, 0.9);
      // B: pulses det→each trait
      if (pB > 0) traitNodes.forEach((tn) => { if (pB < 1) { line(DET, tn, `rgba(${acc},${0.15 + (1 - pB) * 0.5})`, 1); dot(lerp(DET, tn, pB), 2.4, 0.85); } });
      // D: pulses leads→out
      if (pD > 0) leadIdx.forEach((i) => { line(traitNodes[i], OUT, `rgba(${acc},${0.25 + pD * 0.55})`, 1.4); if (pD < 1) dot(lerp(traitNodes[i], OUT, pD), 3, 0.9); });

      // nodes
      node(IN, pA);
      node(DET, pA * (1 - pB) + pB * 0.4, 8);
      traitNodes.forEach((tn, i) => {
        const isLead = leadIdx.includes(i);
        const glow = isLead ? pC : Math.max(0, pB - 0.3) * 0.4;
        node(tn, glow);
        if (isLead && pC > 0.15) {
          ctx!.fillStyle = `rgba(${acc},${Math.min(1, pC)})`;
          const label = tn.t.name;
          const lx = tn.x < 500 ? tn.x - 14 : tn.x + 14;
          ctx!.textAlign = tn.x < 500 ? "right" : "left";
          ctx!.fillText(label, lx, tn.y);
        }
      });
      node(OUT, pD, 9);

      ctx!.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's emotion engine: a message becomes a moment, the moment lights the leading traits, and they converge into his response" />;
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
