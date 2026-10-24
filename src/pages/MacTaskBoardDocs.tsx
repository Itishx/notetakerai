import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MacTaskBoardDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 091</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Task Board</span><span>MVP</span></div><h1>Four jobs.<br /><em>None forgotten.</em></h1><p>Braino now keeps every job you give him, like a to-do list in his head.</p><time dateTime="2026-10-24">Published October 24, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Tell a person ten things at once and they&rsquo;ll forget a few. Braino shouldn&rsquo;t. But until now he held one job at a time, and the next thing you said wiped it.</p><p>Now every job sits on a board: what you asked, what&rsquo;s done, what&rsquo;s left, and what he&rsquo;s stuck on. Say &ldquo;send it to Abhishek instead&rdquo; or &ldquo;continue the Cursor one&rdquo; and he goes back to the right job, with everything else still there.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Just ask him</p><h2>&ldquo;What are you<br />stuck on?&rdquo;</h2><p>He tells you what&rsquo;s done, what&rsquo;s left, and what went wrong. You don&rsquo;t have to dig through anything to find out why a job stopped. He also checks your contacts himself before ever asking you for a number.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>He works out which job you mean from your words, so a sentence that names no job reads as a new one. Quick one-step commands don&rsquo;t go on the board. And his first read of what you mean doesn&rsquo;t see the board yet. That comes when we retrain it.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/mac-task-board.md</p></footer>
  </article></main>;
}
