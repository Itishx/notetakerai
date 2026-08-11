import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacMoonwalkPartyTrickDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 017</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Party trick</span><span>MVP</span></div>
          <h1>Spotify is the stage.<br /><em>Braino does the moonwalk.</em></h1>
          <p>The original introduction, Billie Jean from 3:31, an immediate twenty-second moonwalk along the bottom Mac Dock, and one exact closing line.</p>
          <time dateTime="2026-08-05">Published August 5, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Double-press Option and Braino stays wherever he was already standing for his original Jarvis-and-moonwalk introduction. After “Watch,” he does not jump to an edge or a preset rail: Spotify cues the song at 3:31 and he starts moonwalking immediately from that exact spot.</p>
          <p>When the move is over, he pauses the song without closing Spotify, waves, and ends with exactly: “How was it?” Then he stops completely and holds that final position until double-Command exits the mode.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The important bit</p>
          <h2>The timing is real.<br />So is the app.</h2>
          <p>The trick uses Spotify's native Mac controls, not a pretend player or a connected web account. The moonwalk only starts after playback and the 3:31 seek have been verified.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>A proper Mac easter egg</strong><p>Spotify must be installed, playable, and allowed under macOS Automation. While the skit flag is enabled, double Option runs this trick instead of BrainoHERA. Braino remains outside afterward until double-Command explicitly sends him home.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-moonwalk-party-trick.md</p>
        </footer>
      </article>
    </main>
  );
}
