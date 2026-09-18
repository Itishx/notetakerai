import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HilMemoryDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 040</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Mac, Chrome, web</span><span>Human Intelligence</span><span>MVP</span></div>
          <h1>He used to start every morning<br /><em>brand new.</em></h1>
          <p>HIL Version 2: Braino keeps the route that worked, remembers his own history with you, and can finally read the documents that say how he is supposed to behave.</p>
          <time dateTime="2026-09-18">Published September 18, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">He already remembered every wall he had ever walked into. Give up once on a page that cannot be typed into and no Braino ever wastes those five turns again, for anybody. That has been true for a while and it works.</p>
          <p>What he never kept was a single door. Book the tickets on Tuesday, get the whole thing right, and on Wednesday he works it out again from nothing, paying the same ten seconds a turn to arrive at the same answer. He had been getting steadily better at failing and no better at succeeding.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">What changed</p>
          <h2>The job finishes.<br />He keeps how he did it.</h2>
          <p>Not a summary he writes afterwards about what he thinks he did. The actual steps, in his own words for them at the time, with the things that failed left out. The next run asking for the same kind of job on the same site is handed it as a head start.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">A head start, not a script</p>
          <h2>The screen still wins. Every time.</h2>
          <p>A remembered route describes a page as it was. If what is in front of him does not match it, the site changed, and he drops the memory and works from what he can actually see. He still takes one action at a time and still checks each one. And it grants him nothing: send, pay, delete and publish stop for you exactly as they did before, because that gate is code and does not read any of this.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">A door can close</p>
          <h2>A route that stops working retires itself.</h2>
          <p>One bad run is a site having a bad afternoon, so nothing happens on the first miss. A route that has been wrong at least as often as it has been right drops out of circulation on its own, and can earn its way back. And when a later run finishes the same job in fewer steps, the shorter way replaces the longer one, so what he knows gets faster rather than only larger.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The other two halves</p>
          <h2>&ldquo;The same as last time&rdquo;<br />finally means something.</h2>
          <p>He remembers his own history with you now: the jobs you have given him and how each one went, the ones that did not work included, because &ldquo;I could not do this last time&rdquo; saves you explaining it from the start. Anything private is never written down at all. And the ten written contracts that say how a capability is supposed to behave, which until now only people could read, he reads too, at most two at a time and usually none.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>None of this has run on real hardware yet. It is tested, type-checked and exercised against a stubbed network, and that is not the same as a real session on a real Mac. The table it writes to is a migration that has not been applied, and the tool that fills it from past runs has never been pointed at the real one. The number to watch afterwards is whether jobs start taking fewer steps. If they do not, this bought less than it cost.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/hil-version-2-memory.md</p>
        </footer>
      </article>
    </main>
  );
}
