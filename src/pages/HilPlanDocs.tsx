import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HilPlanDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 041</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Mac, web</span><span>Human Intelligence</span><span>MVP</span></div>
          <h1>He works out the job once,<br /><em>not on every step.</em></h1>
          <p>HIL now writes a short plan before a long job and keeps it in front of him the whole way through.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Give Braino a long job and he used to figure the whole thing out again on every single step. Nothing was written down. Step six had to rebuild what steps one to five had worked out, just from what was on the screen.</p>
          <p>That's where he got lost. In two months of real use, about one long run in six ended with him going in circles, and a job of four steps or more took almost two minutes.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">What changed</p>
          <h2>A short plan first.<br />Then one step at a time.</h2>
          <p>On the first step he writes the moves he expects to make. Open Gmail, click Compose, type the address, write it, send. Every step after that, he sees the plan and picks up where he is.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">A map, not a script</p>
          <h2>The screen still wins.</h2>
          <p>He still does one thing at a time and checks each one. If the page isn't what the plan expected, he rewrites the rest of it instead of pushing on. And anything that can't be undone still stops and asks you first.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Less waiting between steps</p>
          <h2>He looks you up once per job.</h2>
          <p>Before every step he used to fetch what he remembers about you, your history with him, and what he's learned about the site. None of that changes halfway through a job, so now he does it once, at the start.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>This hasn't been measured on a real Mac yet. It's tested in code, and that isn't the same thing. A plan cuts wasted steps; it doesn't make any one step faster. The number to watch is how many steps a long job takes, and how often he goes in circles.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/hil-plan-first.md</p>
        </footer>
      </article>
    </main>
  );
}
