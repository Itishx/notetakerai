import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function TeachBrainoDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 087</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Agent</span><span>MVP</span></div><h1>Show him once.<br /><em>Then just ask.</em></h1><p>Teach Braino any job by doing it while he watches.</p><time dateTime="2026-10-20">Published October 20, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Everyone has jobs nobody else could guess. So instead of waiting for us to build yours, you teach him. Open the Braino app, go to Teach Braino, press Start and do the job the way you always do. Tap the notch when you are done.</p><p>He works out what the job is for, what changes each time, like which book, and the steps. Next time you just say &ldquo;buy me Atomic Habits on Amazon&rdquo; and he does it.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>He watches clicks and typing only while you are teaching, and never reads password fields. He stops before paying or sending anything and asks. Drags and keyboard shortcuts are not learned yet.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/teach-braino.md</p></footer>
  </article></main>;
}
