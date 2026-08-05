import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MusicSegmentLoopsDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 005</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Music</span><span>MVP</span></div>
          <h1>Not the whole song.<br /><em>That seven-second part.</em></h1>
          <p>Tell Braino where the good bit begins and ends. He keeps it there for as long as you want.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Every song has a part you return to. A verse, a drop, one line that lands properly. Braino now loops that exact piece without making you babysit the playhead.</p>
          <p>Say, “Braino, play Brabus on loop from 2:20 to 2:27.” Spotify is the default, while Apple Music and YouTube Music work when you name them.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Human about transcripts</p>
          <h2>2:20. “Two twenty.”<br />Same thought.</h2>
          <p>Inside an explicit loop command, Braino knows the only sensible things after “from” and “to” are timestamps. He normalizes the range, shows what he understood, and only then plays it.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The boundary</p>
          <h2>Plain play stays plain.</h2>
          <p>“Play Brabus” starts the song normally. Only “on loop” activates a segment. One small phrase, one predictable behavior.</p>
          <aside className="kb-honesty"><strong>It is an MVP</strong><p>Apple Music searches your Music library. YouTube needs Chrome’s Apple Events JavaScript permission. Extremely short loops can pick up a little provider buffering.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/music-segment-loops.md</p>
        </footer>
      </article>
    </main>
  );
}
