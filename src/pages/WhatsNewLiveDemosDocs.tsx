import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function WhatsNewLiveDemosDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 007</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Demo</span><span>MVP</span></div>
          <h1>Don’t tell me what shipped.<br /><em>Walk me through it.</em></h1>
          <p>Ask Braino what is new. He explains the latest feature in his own voice, then performs it live.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">“What’s new with you?” is not small talk anymore. It is Braino’s deterministic doorway into the newest thing he has learned.</p>
          <p>He says what is about to happen, asks if you are ready, and waits until “Watch” has landed before touching the Mac.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The sequence</p>
          <h2>Explain first.<br />Then fire it.</h2>
          <p>The current demo introduces song-segment looping, then plays FE!N from 1:26 to 1:32 on repeat. It uses the real feature, not demo theatre.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Deliberately deterministic</strong><p>Every demoable release needs a reviewed script and action. That little bit of ceremony keeps Braino’s story sharp and the Mac predictable.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/whats-new-live-demos.md</p>
        </footer>
      </article>
    </main>
  );
}
