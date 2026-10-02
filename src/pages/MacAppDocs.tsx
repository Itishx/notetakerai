import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacAppDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Product 055</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Double-click him.<br /><em>Everything is here.</em></h1>
          <p>One app for Braino, laid out the way your Mac lays out its settings.</p>
          <time dateTime="2026-09-27">Published September 27, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Double-click Braino and his app opens. It's one see-through window for everything he does and knows: your day, your memory, school, your people, how he looks and listens, what he's learned, and his permissions.</p>
          <p>Switch between Companion and Foundry at the top. Companion is your day. Foundry is your company: content, being named by AI assistants, outreach, and one approval inbox. What's not built yet says so, and nothing on the page is made up.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Habits, Focus, Routines, and most of Foundry are marked Coming soon. A few pages still open the older full library.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/braino-for-mac-app.md</p>
        </footer>
      </article>
    </main>
  );
}
