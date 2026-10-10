import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./labs.css";

/* ============================================================================
   /labs — Affective Labs (2026-10-03). Where we play with AI and tech that is
   not a product yet. Same grammar as the homepage on purpose: warm paper,
   serif for claims, the sans for explaining, hairline boxes, the three-across
   grid. Labs is the company being curious, not a different company.

   The first experiment is Saburi, the emotional engine that has lived inside
   Braino since the start and never had a room of its own. Everything said
   about it here is true today: it shapes how he writes in chat, his voice
   stays neutral, and it has never been properly tested.
   ============================================================================ */

const HOW = [
  { h: "Built on what we already made.", p: "Every experiment starts from AffectiveOS: the memory, the voice, the eyes on your screen. We are not starting from zero, so we can try odd things quickly." },
  { h: "Trained on its own.", p: "A Labs project does not have to fit inside Braino first. It gets its own data, its own tests and its own rules, and earns its way into a product later, or not at all." },
  { h: "Said plainly.", p: "Each experiment says what works, what does not, and what might be a little naughty. If it is half built, the page says half built." },
];

/* The homepage's word-by-word stamp (affective.css .aff-kin). Each word is
   its own box, so the sentence is given whole to screen readers. `from`
   carries the timing on from the line before. */
function Kinetic({ line, from = 0, gap = 150 }: { line: string; from?: number; gap?: number }) {
  return (
    <span className="aff-kin" aria-label={line}>
      {line.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" style={{ animationDelay: `${(from + i) * gap}ms` }}>{word}</span>
      ))}
    </span>
  );
}


export default function Labs() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();
  // The stamp plays once the page has drawn.
  const [inView, setInView] = useState(false);
  useEffect(() => { const t = window.requestAnimationFrame(() => setInView(true)); return () => window.cancelAnimationFrame(t); }, []);
  useEffect(() => {
    document.title = "Labs · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff lb" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/braino">Braino</Link>
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/about">About</Link>
            <Link to="/braino#early-access" className="aff-nav-go">Early access</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      <header className={"aff-hero lb-hero" + (inView ? " is-in" : "")}>
        <div className="aff-wrap">
          <p className="ah-kicker">Affective Labs</p>
          <div className="aff-hero-row">
            <h1 className="aff-h1">
              <span className="aff-h1-line"><Kinetic line="Where we try things" /></span>
              <b><Kinetic line="before they are things." from={4} /></b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                Labs is where we play with AI and tech that is not a product yet. Some of it will become one. Some of it will not, and that is the point.
              </p>
              <p className="lb-tag"><i aria-hidden="true" />Experimental. Some of it may be a little naughty.</p>
            </div>
          </div>
        </div>
        <figure className="lb-banner">
          <img src="/speak.jpg" alt="A MacBook on a sunlit terrace above the sea, Braino's notch sending a deck and booking a follow-up." width={1672} height={941} loading="eager" decoding="async" />
        </figure>
      </header>

      <section className="lb-sec">
        <div className="aff-wrap">
          <p className="ah-kicker">How Labs works</p>
          <ul className="hb6-jobs lb-grid">
            {HOW.map((d) => <li key={d.h}><h3>{d.h}</h3><p>{d.p}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="lb-sec" id="saburi">
        <div className="aff-wrap">
          <div className="lb-box">
            <div className="lb-box-head">
              <div>
                <p className="ah-kicker">First in Labs</p>
                <h2 className="lb-name">Saburi</h2>
                <p className="lb-line">What if Braino could tell how you are doing?</p>
              </div>
              <p className="lb-status"><span>Experiment</span><span>Not in Braino&rsquo;s voice yet</span><span>No release date</span></p>
            </div>
            <div className="lb-story">
              <p>Some days you want a quick answer. Some days the meeting went badly and you just need someone to notice. Saburi is the part of Braino that tries to tell the difference: when to keep it short, when to be kind, when to tell you the idea is weak, and when a little teasing is exactly right.</p>
              <p>It has been inside Braino since the start, but only ever as a small part of him, and we have never really put it to the test. In Labs it gets room of its own, so we can find out what it should feel like before it goes back in.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lb-sec lb-end">
        <div className="aff-wrap lb-end-in">
          <h2 className="aff-h1 lb-end-line">Curious first. <b>Useful later.</b></h2>
          <p>Saburi will show up here as it changes: what we tried, what broke, and what made it into Braino.</p>
          <div className="aff-hero-cta">
            <Link to="/braino" className="aff-cta">Meet Braino</Link>
            <Link to="/affectiveos" className="aff-cta aff-cta-ghost">Read about AffectiveOS</Link>
          </div>
        </div>
      </section>

      <footer className="lb-foot">
        <div className="aff-wrap lb-foot-in">
          <span>Affective Labs · Bengaluru</span>
          <span><Link to="/">Home</Link><Link to="/braino">Braino</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/about">About</Link></span>
        </div>
      </footer>
    </div>
  );
}
