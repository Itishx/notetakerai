import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function OneBrainDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 062</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>AffectiveOS</span><span>Architecture</span><span>Exploring</span></div>
          <h1>One brain.<br /><em>Two speeds.</em></h1>
          <p>AffectiveOS understands you with one mind: a fast part that knows what you want, and a deeper part that works out the hard things.</p>
          <time dateTime="2026-09-29">Published September 29, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Intent detection comes first. It runs on your Mac, in about a twentieth of a second, and it looks at what you said along with everything around it: what Braino just said, what's on your screen, what's playing, whether you said his name. Then it makes one decision. Not for me, just talk, do something he already knows, or a bigger job.</p>
          <p>The bigger jobs go to the Human Intelligence Layer. It works out what you meant, plans the steps once, and always asks you before anything final, like posting or sending. When intent detection isn't sure, it doesn't guess. It hands over.</p>
          <p>And the two learn from each other. What the Human Intelligence Layer works out becomes a lesson for intent detection, so over time more of what you say is understood in a blink.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>This is the design we decided on, not what's running yet. Braino today still checks your sentence against a list of rules before the brain gets a say, which is why he sometimes misreads a clear command. Intent detection takes over only once it gets at least 90 of 100 real sentences right that it has never seen. The daily learning is done by hand for now, and becomes automatic later, with a check before any new version is used.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/affectiveos-one-brain.md</p>
        </footer>
      </article>
    </main>
  );
}
