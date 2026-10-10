import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function SaferDefaultDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 070</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Seven fixes</span><span>MVP</span></div><h1>He does what you asked.<br /><em>And says what he did.</em></h1><p>Seven fixes from one evening&rsquo;s log, all about doing something nobody asked for.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Undo now asks first, and only reaches back fifteen minutes. Her mode switches on only when you ask for it. &ldquo;Call Param&rdquo; calls Param. &ldquo;Open it&rdquo; opens the thing you were talking about, not the last app he touched.</p><p>He no longer says &ldquo;synced&rdquo; when nothing synced. &ldquo;Quit Finder and WhatsApp&rdquo; quits both. And &ldquo;stop&rdquo; stops him straight away, instead of after you finish your sentence.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. Interrupting him with any sentence, not just &ldquo;stop&rdquo;, is still to come.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/safer-by-default.md</p></footer>
  </article></main>;
}
