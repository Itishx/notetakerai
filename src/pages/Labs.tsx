import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./labs.css";
import { LABS_POSTS } from "@/lib/labsPosts";

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

const ENGINES: { id: string; kicker: string; name: string; line: string; status: string[]; story: string[]; to?: string; cta?: string }[] = [
  {
    id: "optics", kicker: "Inside Braino Foundry", name: "Optics", line: "Where can buyers not find you?",
    status: ["Part of Braino Foundry", "Open to try"],
    story: [
      "Optics asks the questions your buyers ask, in AI answers and on Google, and shows you where you are missing. Every gap comes with the reason and what to do about it.",
      "It is the starting point. What Optics finds tells Content what to write and Outreach who to talk to.",
    ],
    to: "/foundry", cta: "See Braino Foundry",
  },
  {
    id: "content", kicker: "Inside Braino Foundry", name: "Content", line: "What should you put out?",
    status: ["Part of Braino Foundry", "Open to try"],
    story: [
      "Content writes public posts in your voice for X, LinkedIn, Reddit, Instagram and Threads, each one shaped for where it is going.",
      "Nothing goes out on its own. You read it, you approve it, it is ready to post.",
    ],
    to: "/foundry", cta: "See Braino Foundry",
  },
  {
    id: "outreach", kicker: "Inside Braino Foundry", name: "Outreach", line: "Who is asking for you right now?",
    status: ["Part of Braino Foundry", "Open to try"],
    story: [
      "Outreach finds people on Reddit asking about the exact problem you solve, and writes one message for each of them. One person, one message, never a blast.",
      "It was the first engine we built in Labs. Now it lives inside Braino Foundry with the other two, and you approve every message.",
    ],
    to: "/foundry", cta: "See Braino Foundry",
  },
];

const HOW = [
  { h: "Built on what we already made.", p: "Every experiment starts from AffectiveOS: the memory, the voice, the eyes on your screen. We are not starting from zero, so we can try odd things quickly." },
  { h: "Trained on its own.", p: "A Labs project does not have to fit inside Braino first. It gets its own data, its own tests and its own rules, and earns its way into a product later, or not at all." },
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
            <Link to="/foundry">Braino Foundry</Link>
            <a href="#writing">Writing</a>
            <Link to="/braino">Braino</Link>
            <Link to="/about">About</Link>
            <Link to="/foundry/app" className="aff-nav-go">Open Foundry</Link>
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

      {/* One big block: the Foundry announcement. Labs is the blog now. */}
      <section className="lb-sec" id="writing">
        <div className="aff-wrap">
          <p className="ah-kicker">Writing from Labs</p>
          {LABS_POSTS.slice(0, 1).map((p) => (
            <Link key={p.slug} to={`/labs/${p.slug}`} className="lb-feature">
              <div className="lb-feature-art" aria-hidden="true">
                <svg viewBox="0 0 400 260">
                  <path d="M200 60 C 300 70, 330 150, 300 200 M250 220 C 200 240, 150 240, 110 210 M90 190 C 70 140, 110 70, 170 62" className="lb-f-line" />
                  <g className="lb-f-node o"><rect x="140" y="30" width="120" height="48" rx="14" /><text x="200" y="60">Optics</text></g>
                  <g className="lb-f-node c"><rect x="260" y="180" width="120" height="48" rx="14" /><text x="320" y="210">Content</text></g>
                  <g className="lb-f-node r"><rect x="20" y="180" width="120" height="48" rx="14" /><text x="80" y="210">Outreach</text></g>
                  <text x="200" y="150" className="lb-f-mid">You approve</text>
                </svg>
              </div>
              <div className="lb-feature-copy">
                <span className="lb-post-meta">{p.dateLabel} · Announcement · {p.readTime}</span>
                <h2>{p.title}</h2>
                <p>{p.line} Three engines that started here in Labs, now working together.</p>
                <span className="aff-cta">Read the announcement</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="lb-sec lb-end">
        <div className="aff-wrap lb-end-in">
          <h2 className="aff-h1 lb-end-line">Curious first. <b>Useful later.</b></h2>
          <p>Optics, Content and Outreach grew up here. Now they work together as Braino Foundry, your distribution co-founder.</p>
          <div className="aff-hero-cta">
            <Link to="/foundry" className="aff-cta">Meet Braino Foundry</Link>
            <Link to="/foundry/app" className="aff-cta aff-cta-ghost">Open the app</Link>
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
