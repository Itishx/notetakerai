import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function TypeSearchDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 053</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Say it,<br /><em>and it's typed.</em></h1>
          <p>Type this, search for that, right where you are.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Say "type Savannah Watson videos" and Braino types it into the box you are in and presses Enter. Say "search for Savannah" and he searches on the site you are on, in its own search box if it has one, otherwise on Google, in the same tab.</p>
          <p>No thinking, no clicking around. It happens as fast as you can say it.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Asking him to look something up and tell you the answer is different: he says that answer back to you instead of typing.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/type-and-search.md</p>
        </footer>
      </article>
    </main>
  );
}
