import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function JyotiSirTeamDemoDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 008</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Team Demo</span><span>MVP</span></div>
          <h1>A small product demo.<br /><em>A real thank you.</em></h1>
          <p>Music, Desktop cleanup, an unsent WhatsApp draft, seven Chrome tabs, and one message Itish wanted Jyoti Sir to hear.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino stays on screen while “Places to Be” plays quietly, cleans Itish’s actual Desktop into Braino Organized, says “Boom,” and then restores every file for the next demo.</p>
          <p>After every spoken setup, Braino leaves a two-second beat before acting. He opens Amdocs Jyoti Sir with “hi from braino” ready but unsent, creates seven marked Chrome tabs, closes only those seven, returns to Spotify with “She Needs Him,” and gives Jyoti Sir the updated personal message.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The point</p>
          <h2>Make the mess.<br />Then clear it.</h2>
          <p>The tabs belong only to the demo. Braino tags them before opening them, so “close them all” cannot touch the tabs that were already yours.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Real apps, isolated voice</strong><p>The demo temporarily moves real Desktop items, then undoes the move itself. WhatsApp opens a real chat and draft, but Braino does not press Send. Braino turns listening off before the first line so his voice and Spotify cannot become accidental commands.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/jyoti-sir-team-demo.md</p>
        </footer>
      </article>
    </main>
  );
}
