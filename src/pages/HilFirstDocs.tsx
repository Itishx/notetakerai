import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HilFirstDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 042</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Human Intelligence</span><span>MVP</span></div>
          <h1>He reads the whole sentence<br /><em>before he acts.</em></h1>
          <p>HIL now decides what every command means. The old word patterns only carry out what it picked.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino used to work out what you meant with a list of word patterns. Say "open WhatsApp for me" and a pattern grabbed "for me" as a person's name. Say "close your eyes" and he went looking for an app called "your eyes".</p>
          <p>We read two months of real commands and found 171 like that. About one in ten.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">What changed</p>
          <h2>HIL goes first now.</h2>
          <p>Every command is read by HIL before anything else touches it. A one-step job runs straight away. A bigger job goes to the part of him that plans. If he needs one fact, he asks. If you're just talking, he talks back.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Still instant</p>
          <h2>Pause is still pause.</h2>
          <p>Short controls like pause, next song and volume up skip the reading, because there's nothing to misread and you'd feel the wait. Everything else takes about a second and a half longer, and gets understood.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>This hasn't been tested on a real Mac yet. When HIL can't be reached, or picks something this Mac can't do yet, Braino falls back to the old patterns, so nothing gets lost. But those commands can still be misread. The number to watch is how many of the 171 now come out right.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/hil-first.md</p>
        </footer>
      </article>
    </main>
  );
}
