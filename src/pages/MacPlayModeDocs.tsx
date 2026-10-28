import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MacPlayModeDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Mode 093</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Play mode</span><span>MVP</span></div><h1>Handle this<br /><em>for me.</em></h1><p>Braino does the thing on your screen himself, all the way to the end.</p><time dateTime="2026-10-28">Published October 28, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">He used to fill a form and stop. You still had to click Next, finish the second page, and press Submit.</p><p>Now you say "handle this for me" and he carries it through. Every field, every page, every round of a browser game, one step at a time, and you can watch each step in the notch.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">How to start</p><h2>Say it.<br />Or type it.</h2><p>"Handle this for me", "take care of this", "fill this form for me", "finish this", "play this game", "next round". Typing works too (⌘⌥T). Say stop or press Esc to end it. Before anything final, like Submit or Send, he asks first: Enter for yes, Esc for no.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>He won't do tests, quizzes or exams. If he gets that wrong, tell him "it's not a test" and he'll go on, for that page only. He never types passwords or card details, never solves CAPTCHAs, and never pays or buys. It's new and still being tried on real runs, so watch it the first few times.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/mac-play-mode.md</p></footer>
  </article></main>;
}
