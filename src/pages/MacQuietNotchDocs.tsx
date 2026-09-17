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
          <h1>A notch that stays<br /><em>out of your way.</em></h1>
          <p>Braino's status lives in the menu bar, your words and his answer get one line that leaves on its own, and stealth fades him to almost nothing.</p>
          <time dateTime="2026-09-17">Published September 17, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Every sheet that dropped out of the notch sat over the tabs of whatever you had open, and caught your clicks while it was there.</p>
          <p>Now the notch says <strong>Listening</strong> in the black band beside the camera, one line shows what you said and what he says, and <strong>every click goes through</strong> to the tabs underneath. Only the band and its buttons are his.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Stealth</p>
          <h2>“Braino, go stealth.”</h2>
          <p>Everything he draws in the notch fades to 1%. Point at the notch and he is back. Turn it off by saying “stealth mode off”, or with the switch in his settings (double-click Braino).</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">When you want more</p>
          <h2>Click the band, or More.</h2>
          <p>While he works, click the band to see every step and the Stop button. When an answer is too long for one line, More opens all of it.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>In stealth he still talks; turn off Talk out loud too for a silent Braino. A long answer can only be read in full through More. His settings are still in the notch for now; a menu bar icon comes next.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-quiet-notch.md</p>
        </footer>
      </article>
    </main>
  );
}
