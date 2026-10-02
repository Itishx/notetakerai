import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HideHimDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 050</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Out of sight,<br /><em>still listening.</em></h1>
          <p>Put him away for an hour, until you call, or in stealth.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Double-click Braino and choose how to hide him: for an hour, until you call him, or stealth, where he stays almost invisible and shows himself when your mouse comes near.</p>
          <p>He still hears you and answers in the notch. To bring him back, say "Braino, come back", press Command Shift B, or click the notch.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Command Shift B used to swap Braino and Brainelle. That lives in his menu now.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/hide-him.md</p>
        </footer>
      </article>
    </main>
  );
}
