import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function TwoLanesDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 052</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>How he decides</span><span>MVP</span></div>
          <h1>Talk, or do.<br /><em>Nothing in between.</em></h1>
          <p>One decision for every sentence, and no waiting on what he already knows.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino used to have many ways to answer the same sentence, and the slowest one was the default. Nearly half of the simplest commands took more than five seconds, and the same command could be instant one day and slow the next.</p>
          <p>Now every sentence goes one of two ways. Talk is answered in about a second. Do runs something he already knows, instantly, or he thinks once and then does it step by step without stopping to think again. If a job runs past twenty seconds, he tells you where he got to and asks.</p>
          <p>And he learns. A job that worked is remembered by the words you used, so saying them again runs it instantly.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Learned jobs only match the same sentence, said the same way. A new way of saying it is thought through once, then learned too.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/two-lanes.md</p>
        </footer>
      </article>
    </main>
  );
}
