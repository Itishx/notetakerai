import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ActivityMemoryDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 061</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>The Braino app</span><span>MVP</span></div>
          <h1>See what he did.<br /><em>Fix what he knows.</em></h1>
          <p>Activity, editable memory, and a morning question about something you told him.</p>
          <time dateTime="2026-09-29">Published September 29, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Activity lists everything Braino did for you, a day at a time: what you asked, what he did, how long it took, and whether it worked. Memory shows every fact he keeps about you, where it came from, and lets you edit it, make him forget it, or add something new.</p>
          <p>In the morning, after good morning, he asks about one thing you told him in the last two weeks. Only then, and never the same thing twice.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Activity covers the last few days on this Mac. Forget stops him using a fact rather than erasing it, so a slip can be undone.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/activity-and-memory.md</p>
        </footer>
      </article>
    </main>
  );
}
