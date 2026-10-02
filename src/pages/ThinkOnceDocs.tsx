import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ThinkOnceDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 048</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>How he decides</span><span>MVP</span></div>
          <h1>He thinks once,<br /><em>then his hands just go.</em></h1>
          <p>Several steps, one plan, no pausing to think in between.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">"Start a Google Meet and send the link to Ilu" used to take a minute or more. Braino stopped to think before every step, and the thinking was the slow part, not the doing.</p>
          <p>Now he works the whole job out once, then does each step straight after the last. The link from step one goes right into the WhatsApp in step three. For the jobs people ask most, the steps are already written down, so he doesn't think at all.</p>
          <p>Before any of that, a small model on your Mac sorts what you said in about 40 milliseconds: one action, many steps, or something he didn't catch. When it's sure, he goes straight to the right place. When it isn't, he works as before.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Only three jobs have written-down steps so far. The small model is right 85% of the time, and it still mistakes questions about your own day for chat, so for now its chat answers are only logged.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/think-once-then-do.md</p>
        </footer>
      </article>
    </main>
  );
}
