import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacQuietNotchDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 039</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>The notch</span><span>MVP</span></div>
          <h1>Stealth, for when<br /><em>you want him out of sight.</em></h1>
          <p>One sentence fades everything Braino draws in the notch to almost nothing. Point at the notch and he is back.</p>
          <time dateTime="2026-09-17">Published September 17, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Sometimes you want Braino listening without the notch lighting up in front of a screen share, a film or a client.</p>
          <p>Stealth keeps him working exactly as before and hides <strong>what he draws in the notch</strong>. Anything you open yourself, and anything that goes wrong, still shows in full.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Stealth</p>
          <h2>“Braino, go stealth.”</h2>
          <p>Everything he draws in the notch fades to 1%. Point at the notch and he is back. Turn it off by saying “stealth mode off”, or with the switch in his settings (double-click Braino).</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>In stealth he still talks; turn off Talk out loud too for a silent Braino. The hardware notch itself stays black, because it is part of the screen.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-quiet-notch.md</p>
        </footer>
      </article>
    </main>
  );
}
