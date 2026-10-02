import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function InstantVoiceDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 051</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Call him,<br /><em>and he is already listening.</em></h1>
          <p>No more four second wait. And he lives in one of four spots, not all over your screen.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Every time you called Braino he opened a new voice connection from nothing, and that took about four seconds. By then you had already started talking. Now one is kept ready, with the microphone off, so pressing Control twice or saying Hey Braino just switches the mic on.</p>
          <p>He also stopped wandering. He lives in one of four spots: the middle of the left edge, the top, the bottom, or the middle of the right edge. Drag him anywhere and he goes to the nearest one. When he listens, he glows in the same coral as the notch.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>A call in the first few seconds after the app opens can still wait for the connection. Nothing is sent from the ready connection until you call him.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/instant-voice-and-spots.md</p>
        </footer>
      </article>
    </main>
  );
}
