import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function LearningRunsDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 081</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Human Intelligence</span><span>MVP</span></div><h1>He learns from real runs.<br /><em>Not from keywords.</em></h1><p>A long night with Braino showed where he fell short. Each gap is now a lesson he carries.</p><time dateTime="2026-10-11">Published October 11, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">At 4am, &ldquo;set an Iron Man photo as my wallpaper&rdquo; took three and a half minutes of clicking around Pinterest, and then he said it worked when it hadn&rsquo;t. Now that job is one move, done in seconds, for anyone who asks for a picture of anything as their background, however they say it.</p><p>He stops honestly when something isn&rsquo;t working, answers questions in about two seconds instead of fifteen, says what he&rsquo;s doing in plain words, and doesn&rsquo;t answer the same question twice.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The notch</p><h2>One shape,<br />the whole conversation.</h2><p>When you reply, the notch stays put and only the words change. And there&rsquo;s a new Without subtitles mode: you just hear him, with a small dot while he listens and bars while he speaks.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not re-tested live end to end yet. The new lessons reach him once the server side is deployed.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/learning-from-real-runs.md</p></footer>
  </article></main>;
}
