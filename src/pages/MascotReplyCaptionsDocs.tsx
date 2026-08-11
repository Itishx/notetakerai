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
          <p>His written reply still moves with his voice, but normal Mac conversations now keep those words in the notch—even while Braino walks.</p>
          <time dateTime="2026-08-10">Updated August 10, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The caption box was already right. Its timing was not. It could disappear before a longer reply had finished.</p>
          <p>Now the complete reply appears softly in the notch. The current word brightens, finished words settle, and the answer lingers after his voice ends. The mascot keeps walking without dragging another subtitle box over the page.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">One continuous reply</p>
          <h2>Dim. Coral.<br />White.</h2>
          <p>Upcoming words wait quietly. The live word carries the voice. Everything already said remains readable.</p>
          <p>The old glass bubble remains only as a fallback when the notch is unavailable.</p>
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
