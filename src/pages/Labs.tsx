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

   What is in Labs now (2026-10-17): the system we are building, one that
   takes care of things for you end to end, and its three engines. Whatever
   is being worked on lives here and can be tried while it is being made:
   Outreach first (usable), Content being built, Optics after it.
   ============================================================================ */

const ENGINES: { id: string; kicker: string; name: string; line: string; status: string[]; story: string[]; to?: string; cta?: string }[] = [
  {
    id: "outreach", kicker: "Try it now", name: "Outreach", line: "Who should you be talking to?",
    status: ["In testing", "Open to try"],
    story: [
      "Tell Braino who you want to sell to. He finds the people most likely to buy, says why he picked each one, and writes the first message for email, LinkedIn, WhatsApp, X and Instagram. You press send.",
      "It reads your website first, so every message knows exactly what you sell, and it learns from who replies.",
    ],
    to: "/outreach", cta: "Open Outreach",
  },
  {
    id: "content", kicker: "Building now", name: "Content", line: "What should you put out?",
    status: ["Being built", "No release date"],
    story: ["Content makes what you publish, in your own voice: the post, the thread, the caption, shaped for where it is going. It starts from the same picture of your product the Outreach Engine uses, so everything sounds like one company."],
  },
  {
    id: "optics", kicker: "Next", name: "Optics", line: "What is actually working?",
    status: ["Planned"],
    story: ["Optics reads what is landing and what is not, and tells you why in plain words, so the next post and the next message get better on their own."],
  },
];

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

      <section className="lb-sec" id="engines">
        <div className="aff-wrap">
          <p className="ah-kicker">What we are building</p>
          <h2 className="aff-h1 lb-sys">A system that takes care of things for you, <b>end to end.</b></h2>
          <p className="lb-sys-one">Not a tool you operate. Three engines that do the work together: one that makes what you put out, one that reads what is working, and one that reaches the people who should hear about it. Whatever we are working on lives here in Labs, so you can try it while it is still being made.</p>
        </div>
      </section>

      {ENGINES.map((e) => (
        <section key={e.id} className="lb-sec lb-sec-tight" id={e.id}>
          <div className="aff-wrap">
            <div className="lb-box">
              <div className="lb-box-head">
                <div>
                  <p className="ah-kicker">{e.kicker}</p>
                  <h2 className="lb-name">{e.name}</h2>
                  <p className="lb-line">{e.line}</p>
                </div>
                <p className="lb-status">{e.status.map((t) => <span key={t}>{t}</span>)}</p>
              </div>
              <div className="lb-story">
                {e.story.map((t) => <p key={t}>{t}</p>)}
                {e.to ? <div className="aff-hero-cta" style={{ marginTop: 18 }}><Link to={e.to} className="aff-cta">{e.cta}</Link></div> : null}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="lb-sec lb-end">
        <div className="aff-wrap lb-end-in">
          <h2 className="aff-h1 lb-end-line">Curious first. <b>Useful later.</b></h2>
          <p>Each engine shows up here as it changes: what we tried, what broke, and what made it into Braino.</p>
          <div className="aff-hero-cta">
            <Link to="/outreach" className="aff-cta">Try the Outreach Engine</Link>
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
