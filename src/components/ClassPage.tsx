import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import "../styles/apple.css";

/* ============================================================================
   ClassPage — the individual OS pages (Iomi / Telos) in the "Hugo"
   layout: a description up top, then the class NAME pops up as you scroll,
   then a bento carousel of feature cards driven by the ← → arrows. The layout
   is borrowed; the type stays ours — SF Pro throughout, the name in its own
   face (Yatra / shimmer / Orbitron).
   ============================================================================ */

export type ClassFeature = { tag?: string; num?: string; title: string; body: string };

export interface ClassPageProps {
  accent: string;                 // "ac-coral" | "ac-amber" | "ac-blue"
  eyebrow: string;                // "The companion class"
  desc: ReactNode;                // the pitch; wrap phrases in <span className="tone">
  name: string;                   // "Iomi"
  face: string;                   // "cls-iomi"
  lead: { tag: string; title: string; body: string; stat?: { n: string; label: string } };
  features: ClassFeature[];
  cta?: { label: string; to: string };
}

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);
const Arrow = ({ dir }: { dir: "l" | "r" }) => (<svg viewBox="0 0 24 24" fill="none"><path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>);

export default function ClassPage({ accent, eyebrow, desc, name, face, lead, features, cta }: ClassPageProps) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ } }, [dark]);

  const nameRef = useRef<HTMLHeadingElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // The name pops when it scrolls into view.
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("pop"); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollBy = (d: number) => {
    const t = trackRef.current;
    if (t) t.scrollBy({ left: d * Math.min(420, t.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className={"apple " + accent + (dark ? " dark" : "")}>
      <IomiNotch />

      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">{name}</span>
          <div className="an-links">
            <Link to="/product-overview">Overview</Link>
            <Link to="/iomi">Iomi</Link>
            <Link to="/telos">Telos</Link>
            <Link to="/premium" className="apple-cta">Get Braino</Link>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Hugo hero: description left, carousel arrows right */}
      <header className="apple-classhero">
        <p className="ch-eyebrow">{eyebrow}</p>
        <div className="apple-classhero-row">
          <p className="ch-desc">{desc}</p>
          <div className="ch-arrows">
            <button onClick={() => scrollBy(-1)} aria-label="Previous"><Arrow dir="l" /></button>
            <button onClick={() => scrollBy(1)} aria-label="Next"><Arrow dir="r" /></button>
          </div>
        </div>
      </header>

      {/* the name, popping on scroll */}
      <div className="apple-namepop">
        <h1 ref={nameRef} className={"np-name " + face}>{name}</h1>
      </div>

      {/* the bento carousel */}
      <div className="apple-bento">
        <div className="apple-bento-track" ref={trackRef}>
          <div className="bn-card lead">
            <span className="bn-tag">{lead.tag}</span>
            {lead.stat && (
              <div className="bn-stat"><b>{lead.stat.n}</b><span>{lead.stat.label}</span></div>
            )}
            <div className="bn-body">
              <h3>{lead.title}</h3>
              <p>{lead.body}</p>
            </div>
          </div>
          {features.map((f, i) => (
            <div className="bn-card" key={i}>
              {f.num ? <span className="bn-num">{f.num}</span> : f.tag ? <span className="bn-tag">{f.tag}</span> : null}
              <div className="bn-body">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="apple-foot">
        Braino {name}. {cta && <Link to={cta.to} style={{ color: "var(--ap-blue)" }}>{cta.label} ›</Link>}
      </footer>
    </div>
  );
}
