import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MascotReplyCaptionsDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 006</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Voice</span><span>MVP</span></div>
          <h1>His words now move<br /><em>with his voice.</em></h1>
          <p>The mascot caption stays put while the word Braino is speaking lights up in coral.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The caption box was already right. Its timing was not. It could disappear before a longer reply had finished.</p>
          <p>Now the complete reply appears softly. The current word turns coral, finished words settle into white, and the caption lingers after his voice ends.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">One continuous reply</p>
          <h2>Dim. Coral.<br />White.</h2>
          <p>Upcoming words wait quietly. The live word carries the voice. Everything already said remains readable.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest timing</strong><p>Streaming audio sometimes hides its final duration at first, so Braino uses a natural speaking-rate estimate until exact timing is available.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mascot-reply-captions.md</p>
        </footer>
      </article>
    </main>
  );
}
