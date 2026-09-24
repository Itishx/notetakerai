import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function AffectiveMemoryDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 045</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>AffectiveOS</span><span>Memory</span><span>MVP</span></div>
          <h1>Your Mac,<br /><em>written down.</em></h1>
          <p>The first piece of AffectiveOS's memory: a quiet, private log of what you do on your Mac, and a window to see it.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Memory isn't Braino's. It belongs to the layer underneath, the part that should remember your day whether or not you ever talk to him.</p>
          <p>So that's where it starts. While you work, AffectiveOS notes which app you're in, the text on your screen when it changes, what's playing, your conversations with Claude, and everything you say to Braino. All as text, all on your Mac.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">You see it first</p>
          <h2>Every day, in its own window.</h2>
          <p>Say "open memory" and you get the day: time per app, a timeline, and exactly what was saved. Delete any line, or the whole day. Braino doesn't read any of it until it's right.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>This is capture, not memory yet. Turning the day into something useful, and letting Braino use it, are the next two steps. Screenshots are read and deleted straight away, and private apps are skipped, but it still sees a lot. That's why you can pause it with one sentence.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/affectiveos-memory-capture.md</p>
        </footer>
      </article>
    </main>
  );
}
