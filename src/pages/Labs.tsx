import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./labs.css";
import { BrainoMascot } from "@/components/BrainoMascot";

/* ============================================================================
   /labs — Affective Labs (2026-10-03). Where we play with AI and tech that is
   not a product yet. Same grammar as the homepage on purpose: warm paper,
   serif for claims, the sans for explaining, hairline boxes, the three-across
   grid. Labs is the company being curious, not a different company.

   What is in Labs now (2026-10-17): the system we are building, one that
   takes care of things for you end to end, and its three engines. Whatever
   is being worked on lives here and can be tried while it is being made:
   Outreach first, then Content and Optics.

   2026-10-22: all three engines now live together inside Braino Foundry
   (/foundry, app at /foundry/app). Labs is also a small blog: articles
   come from src/lib/labsPosts.ts and render at /labs/:slug.
   ============================================================================ */

/* What Braino does, from the homepage he used to lead (moved here 2026-10-28). */
const BRAINO_DOES = [
  { h: "Stop typing the same replies.", p: "Say \u201ctell Priya Friday works.\u201d He opens WhatsApp, writes it the way you would, and sends it after your yes." },
  { h: "Stop taking notes in meetings.", p: "He listens to the call or the lecture. Close the laptop and the notes are waiting." },
  { h: "Stop checking five apps every morning.", p: "Ask \u201cwhat's today?\u201d and get one answer: meetings, deadlines, and who is waiting on you." },
  { h: "Stop digging for that file.", p: "Say what it was about, and he finds it and opens it." },
  { h: "Stop filling the same forms.", p: "Your name, your email, the login you always forget. He fills it in and stops before submit." },
  { h: "Stop explaining yourself.", p: "He remembers your people and what you told him last month, so you never start from zero." },
];

const HOW = [
  { h: "Built on what we already made.", p: "Every experiment starts from AffectiveOS: the memory, the voice, the eyes on your screen. We are not starting from zero, so we can try odd things quickly." },
  { h: "Trained on its own.", p: "A Labs project does not have to fit inside a product first. It gets its own data, its own tests and its own rules, and earns its way into a product later, or not at all." },
  { h: "Said plainly.", p: "Each experiment says what works, what does not, and what surprised us. If it is half built, the page says half built." },
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
  const [blink, setBlink] = useState(false);
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
            <Link to="/maven">Maven</Link>
            <a href="#braino">Braino</a>
            <Link to="/about">About</Link>
            <Link to="/maven" className="aff-nav-go">Get Maven for Mac</Link>
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
              <p className="lb-tag"><i aria-hidden="true" />Experimental. Some of it may turn out brilliant.</p>
            </div>
          </div>
        </div>
        <figure className="lb-banner">
          <img src="/speak.jpg" alt="A MacBook on a sunlit terrace above the sea." width={1672} height={941} loading="eager" decoding="async" />
        </figure>
      </header>

      {/* Braino is the lab now (2026-10-28): Maven is the product out front;
          Braino is what people discover here. Nothing else on this page. */}
      <section className="lb-sec lb-braino" id="braino">
        <div className="aff-wrap">
          <p className="ah-kicker">In the lab</p>
          <div className="lb-bhead">
            <div>
              <h2 className="aff-h1">Braino. <b>Not ready for everyone yet.</b></h2>
              <p className="lb-blede">A companion who lives in your Mac's notch. He sees your screen, hears you, talks back, does the work in your apps and remembers you. He's growing here until he's ready.</p>
              <div className="aff-hero-cta">
                <button type="button" className="aff-cta" aria-pressed={blink} onClick={() => setBlink((on) => !on)}>{blink ? "Back to what he does" : "Don\u2019t Blink"}</button>
                <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
              </div>
            </div>
            <BrainoMascot size={150} className="lb-bmascot" />
          </div>
          {blink ? (
            <div className="hb6-film lb-film">
              <video src="/Braino_Final.MP4" autoPlay playsInline controls onEnded={() => setBlink(false)} />
              <p className="aff-trivia aff-trivia-film" role="note"><span>Trivia</span>We made this film three months ago, when Braino was a tiny browser extension. Today he lives on your Mac, and he is far better there.</p>
            </div>
          ) : (
            <ul className="hb4-does hb6-jobs lb-jobs">
              {BRAINO_DOES.map((d) => <li key={d.h}><h3>{d.h}</h3><p>{d.p}</p></li>)}
            </ul>
          )}
        </div>
      </section>

      <section className="lb-sec">
        <div className="aff-wrap">
          <p className="ah-kicker">How Labs works</p>
          <ul className="hb6-jobs lb-grid">
            {HOW.map((d) => <li key={d.h}><h3>{d.h}</h3><p>{d.p}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="lb-sec lb-end">
        <div className="aff-wrap lb-end-in">
          <h2 className="aff-h1 lb-end-line">Curious first. <b>Useful later.</b></h2>
          <p>What's ready goes out as a product. Right now, that's Maven.</p>
          <div className="aff-hero-cta">
            <Link to="/maven" className="aff-cta">Meet Maven</Link>
            <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
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
