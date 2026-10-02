import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function CompanionSetupDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 047</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>He gets to know you,<br /><em>and you watch him write it down.</em></h1>
          <p>Double-click Braino, choose Set him up, and his notebook fills in as you talk.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino could do a lot, but he didn't know you. Not your name, not your day, not who matters. So he asks, one thing at a time, and most answers are a tap.</p>
          <p>On the right is his notebook. Everything you tell him lands there the moment you say it, next to what he's picking up from your Mac right now. Open it again any time to watch it stay in sync.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>He remembers your answers, but his morning greeting doesn't use them yet. That comes next.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/companion-setup.md</p>
        </footer>
      </article>
    </main>
  );
}
