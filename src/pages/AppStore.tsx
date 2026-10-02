import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import { BrainoShowcase } from "@/components/BrainoShowcase";
import "./affective.css";
import "./affectiveos-page.css";
import "./aff-figures.css";
import "./store-ao.css";
import "./store-mag.css";

/* ============================================================================
   /apps — the App Store as a magazine (2026-09-30). One hairline grid, edge
   to edge, the way the App Store's Today tab runs stories: Braino featured,
   his three models, what is new in the Mac app (real screens, example data),
   two stories about how he works, and the brain they share.
   Nothing else is in the store until it exists: no mini apps, no "coming".
   ============================================================================ */

function Get({ to, label = "Get", name, sub }: { to: string; label?: string; icon?: boolean; name: string; sub: string }) {
  return (
    <div className="mg-app">
      <span className="mg-icon" aria-hidden="true"><img src="/braino-standing.svg" alt="" width={104} height={127} /></span>
      <div className="mg-app-say"><b>{name}</b><span>{sub}</span></div>
      <Link to={to} className={label === "Get" ? "st-get" : "st-link"}>{label}</Link>
    </div>
  );
}

function Tile({ span, k, h, p, art, children, tone }: { span: string; k: string; h: string; p?: string; art?: ReactNode; children?: ReactNode; tone?: string }) {
  return (
    <article className={"mg-tile " + span + (tone ? " " + tone : "")}>
      {art && <div className="mg-art">{art}</div>}
      <div className="mg-say">
        <p className="mg-k">{k}</p>
        <h2>{h}</h2>
        {p && <p className="mg-p">{p}</p>}
      </div>
      {children}
    </article>
  );
}

export default function AppStore() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();

  useEffect(() => {
    document.title = "App Store · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff ao" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/about">About</Link>
            <Link to="/apps">App Store</Link>
            <Link to="/braino#early-access" className="aff-nav-go">Early access</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      <header className="mg-head">
        <p className="mg-date">App Store · Today</p>
        <h1>Everything we build runs on AffectiveOS.</h1>
      </header>

      <BrainoShowcase />

      <section className="mg-sec mg-sec-last">
        <div className="mg-grid">
          <article className="mg-tile s12 mg-band">
            <div className="mg-say">
              <p className="mg-k">Built on one brain</p>
              <h2>Every app here shares the same senses, voice, hands and memory.</h2>
              <p className="mg-p">So what one learns about you, the others already know.</p>
            </div>
            <Link to="/affectiveos" className="st-get">Read about AffectiveOS</Link>
          </article>
        </div>
      </section>

      <footer className="ao-foot">
        <span>Every app here runs on AffectiveOS.</span>
        <span><Link to="/">Home</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/about">About</Link></span>
      </footer>
    </div>
  );
}
