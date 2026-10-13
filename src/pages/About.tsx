import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affectiveos-page.css";
import "./aff-figures.css";
import { Viz, VoiceToAction } from "./aff-figures";
import "./about-story.css";

/* ============================================================================
   /about — the story of Affective and what we believe (2026-09-30). Written
   as a letter in the /affectiveos article style: one serif column, a few
   hairline figures, nothing invented. The old About (the long homepage) is
   gone; its "what it can do" cards now live on /affectiveos.
   ============================================================================ */

const TIMELINE = [
  { when: "May 2026", what: "We started with one question: what if you could just talk to your Mac?" },
  { when: "Summer", what: "Braino, in the browser. He read the page, talked back and did the tabs." },
  { when: "August", what: "He moved into the Mac's notch, with hands for real apps." },
  { when: "Now", what: "AffectiveOS, in private beta. Early access is open." },
];

export default function About() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();

  useEffect(() => {
    document.title = "About · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff ao ab-page" data-theme={theme}>
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

      <article className="ao-col">
        <p className="ao-date">About · Affective · Bengaluru</p>
        <h1 className="ao-title">
          We believe the future of computing is voice-first. You should be able to just tell your
          computer what to do.
        </h1>

        {/* What "voice-first" looks like, before the story of why (2026-10-13). */}
        <Viz caption="You say it once. Your words appear, the steps run, and it stops before anything goes out without your yes."><VoiceToAction /></Viz>

        <h2>Why Affective exists</h2>
        <p>
          Itish, who started Affective, grew up on Marvel. Watching Tony Stark talk to Jarvis, and
          Jarvis simply getting it done, was the computer he always wanted. Not a screen you
          operate. Something you talk to, that listens, does the work and remembers you.
        </p>
        <p>
          That picture never left. Affective exists to turn that piece of science fiction into
          something real, on the Mac you already own.
        </p>

        <h2>What we are about</h2>
        <p>
          Affective is a product company. We make things that make life easier, and that you run
          with your voice. AffectiveOS is the base: it lets a computer see, listen, speak, act and
          remember. Braino is the first product on it, and it will not be the last. We are already
          working on what comes next.
        </p>
        <p>
          We hold ourselves to Apple's standard of craft: nothing ships until it feels obvious and
          right. We take Anthropic's care with what AI should and should not do on your behalf. And
          we borrow the best idea from anywhere else. The goal is simple: to be the best at this.
        </p>
      </article>

      <div className="ao-wide">
        <figure className="ao-pic">
          <div className="ao-viz ab-cost">
            <div className="ab-cost-row">
              <p className="ab-cost-k">Today</p>
              <ol>
                {["Open WhatsApp", "Search for John", "Open the chat", "Type the message", "Send"].map((t) => <li key={t}>{t}</li>)}
              </ol>
            </div>
            <div className="ab-cost-row is-us">
              <p className="ab-cost-k">With Affective</p>
              <ol><li>“Tell John I'll be ten minutes late.”</li></ol>
            </div>
          </div>
          <p className="ao-cap">Figure 1. The same message, the old way and ours.</p>
        </figure>
      </div>

      <article className="ao-col">
        <h2>What we are building</h2>
        <p>
          <b>AffectiveOS</b> is the technology. It lets your Mac see your screen, hear you, talk
          back, use your apps and remember you. <b>Braino</b> is the first product built on it. He
          lives in your Mac's notch, and you talk to him.
        </p>
      </article>

      <div className="ao-wide">
        <figure className="ao-pic">
          <div className="ao-viz">
            <ol className="ab-time ab-time-draw">
              {TIMELINE.map((t, i) => (
                <li key={t.when} className={i === TIMELINE.length - 1 ? "is-now" : ""}>
                  <span className="ab-dot" />
                  <b>{t.when}</b>
                  <p>{t.what}</p>
                </li>
              ))}
            </ol>
          </div>
          <p className="ao-cap">Figure 2. How we got here.</p>
        </figure>
      </div>

      <article className="ao-col">
        <p>A small team in Bengaluru. Come and talk to your Mac with us.</p>
        <p className="ab-go">
          <Link to="/braino#early-access" className="aff-cta">Get early access</Link>
          <Link to="/affectiveos" className="aff-cta aff-cta-ghost">Read about AffectiveOS</Link>
        </p>
        <div style={{ height: "clamp(80px, 10vw, 120px)" }} />
      </article>

      <footer className="ao-foot">
        <span>Affective · Building tech that makes life more affective.</span>
        <span><Link to="/">Home</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/braino">Braino</Link></span>
      </footer>
    </div>
  );
}
