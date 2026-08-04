import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function IomiBootIdentityDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 010</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>IOMI</span><span>Boot identity</span><span>Built · testing</span></div>
          <h1>Authentication disappears.<br /><em>IOMI wakes up.</em></h1>
          <p>A black beginning with one warm-to-cool trace, smaller eyes, and one silent success moment.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">IOMI is not the existing Braino boot animation in a new colour. It has its own first impression.</p>
          <p>A subdued gold trace moves through Braino coral into cool blue around the empty notch. A larger, precisely centred IOMI resolves inward into Braino’s eyes. “Good,” “evening,” and “Itish” then fade in one at a time beside a vertical divider and the wake shortcut.</p>
          <p>The full introduction runs automatically in about seven seconds: quick enough to feel like a boot sequence, with enough room for IOMI and the waking moment to land.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The entire verdict</p>
          <h2>One trace.<br />IOMI.<br />Open eyes.</h2>
          <p>No blue pulse, red wave, green tick, or “Authenticated” label. Success should feel obvious without becoming loud.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Built for Mac</strong><p>The production boot now follows real startup authentication, uses Braino’s Fish Audio-first voice path, and brings the shared Mac mascot into the screen. It still needs a live launch on both saved-auth and browser-sign-in paths. Slow sign-in can hold the completed IOMI word longer, and the setup walkthrough after landing still comes next.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/instagraphics?design=iomi">Open the live prototype <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/iomi-boot-identity.md</p>
        </footer>
      </article>
    </main>
  );
}
