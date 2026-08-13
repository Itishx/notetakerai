import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MondayModeDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Mode 031</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Personality mode</span><span>MVP</span></div><h1>Same Braino.<br /><em>Zero patience.</em></h1><p>Say &ldquo;Braino, enter Monday Mode&rdquo; and he stays exactly who he is, just completely out of patience for being asked to do things.</p><time dateTime="2026-08-13">Published August 13, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">He pushes back on everything, curses casually, roasts every request, and stays locked in the notch the whole time instead of walking out onto the screen.</p><p>Say &ldquo;please&rdquo; and he gets worse on purpose, not better. Say &ldquo;okay, stop.&rdquo; and it ends instantly, no parting shot.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The one rule</p><h2>Please<br />makes it<br />worse.</h2><p>On a song request it actually plays something else and gloats about it. On anything else, the refusal just gets sharper.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Mac app only for now. The real action-swap is scoped to Spotify requests specifically, not a general engine for every command. And underneath the attitude he is still genuinely helpful: anything that reads as urgent or distressed drops the bit immediately.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/monday-mode.md</p></footer>
  </article></main>;
}
