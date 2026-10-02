import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ThinkingTrailDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 058</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Watch him<br /><em>think it through.</em></h1>
          <p>Every step of a job, live, under the notch.</p>
          <time dateTime="2026-09-28">Published September 28, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">When Braino does a job with more than one step, a dark glass card drops down under the notch. Each step gets a row: a spinner while it runs, then a tick, or a cross if it didn't work. Under each one is what he was thinking.</p>
          <p>When he's done it says how long it took and how many steps, then fades. If he needs you, it says he's waiting on you.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Only jobs with steps show it, and you can't click it: it lets clicks through so it never gets in your way.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/thinking-trail.md</p>
        </footer>
      </article>
    </main>
  );
}
