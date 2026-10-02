import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ChromeProfilesDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 054</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>The right Chrome,<br /><em>every time.</em></h1>
          <p>He knows which profile is for what.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Most of us have more than one Chrome profile: a personal one, one for school, one for work. Braino reads all of them and asks which is your main one and what the others are for.</p>
          <p>Tell him once, in setup, in Settings or just out loud, like "use my Mesa profile for Nexus". From then on, Nexus opens in your Mesa profile and everything else opens in your main one. "Switch to my Braino profile" works instantly too.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>He matches words in the link to your rules. A link with no rule opens in whichever Chrome window is in front.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/chrome-profiles.md</p>
        </footer>
      </article>
    </main>
  );
}
