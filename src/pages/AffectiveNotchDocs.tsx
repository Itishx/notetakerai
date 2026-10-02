import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function AffectiveNotchDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 060</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>AffectiveOS</span><span>MVP</span></div>
          <h1>Same notch.<br /><em>Its own face.</em></h1>
          <p>AffectiveOS is what runs underneath Braino. Now it has a look of its own, and you pick which one you talk to.</p>
          <time dateTime="2026-09-28">Published September 28, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Open the Braino app, go to Appearance, and under Notch choose. Braino is the notch as it has always been. AffectiveOS is the same notch, the same words, the same behaviour, wearing AffectiveOS.</p>
          <p>His replies carry the Affective wordmark instead of the word Braino. A soft light sits along the notch's lower edge while it's open, and it drifts through the colours, ten seconds each. While he thinks, a glow circles the whole island.</p>
          <p>There's no Braino in it. The character steps away while it's on, and the list of thinking steps never drops down beneath the notch. Switch back to the Braino notch and he's right there again.</p>
          <p>It changes the moment you pick. Switch back any time.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>It's a look, not a new mode. Everything about voice works exactly like the Braino notch. We tried an orb, full screen and then inside the notch, and set it aside. The fix that keeps the notch one steady shape through a conversation is separate and still to come. It's built into the Braino Mac app, but not tested on real hardware yet.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/affectiveos-notch.md</p>
        </footer>
      </article>
    </main>
  );
}
