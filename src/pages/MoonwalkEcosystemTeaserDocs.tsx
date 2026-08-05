import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MoonwalkEcosystemTeaserDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 018</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino website</span><span>Campaign film</span><span>MVP</span></div>
          <h1>One strange question.<br /><em>One very big URL.</em></h1>
          <p>The ecosystem teaser's full kinetic language, compressed into a text-only moonwalk campaign cut.</p>
          <time dateTime="2026-08-05">Published August 5, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The film asks, “Does your AI moonwalk?”, answers “It will now” on the next frame, then gets out of the way. Every word still arrives through the same fused chunks, hard stomps and match cuts as the ecosystem film.</p>
          <p>The closing frame is only `trybraino.com`, scaled up until it becomes the destination rather than a footnote.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The restraint</p>
          <h2>Same motion system.<br />Nothing else on screen.</h2>
          <p>No orbit, mascot or product labels compete with the line. The web version loops automatically and uses the existing track as a progressive enhancement.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>The honest bit</strong><p>Browser autoplay can hold the soundtrack until the first tap or key press. The typography still starts immediately on its own clock.</p></aside>
          <p><Link to="/moonwalk-teaser">Watch the moonwalk teaser <ArrowRight aria-hidden="true" /></Link></p>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/moonwalk-ecosystem-teaser.md</p>
        </footer>
      </article>
    </main>
  );
}
