import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function SaidToHimDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 069</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Voice</span><span>MVP</span></div><h1>Calling him, or<br /><em>talking about him.</em></h1><p>Braino now knows the difference, the way a person does.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">You call someone at the start of a sentence, or at the end. You talk about them in the middle. &ldquo;Braino, open YouTube&rdquo; is a call. &ldquo;After Braino is done asking me a question&rdquo; is a sentence about him, said to someone else, and he stays out of it.</p><p>And when he has just answered you, you can answer back without his name: &ldquo;the first one&rdquo;, &ldquo;but that&rsquo;s wrong&rdquo;, or anything on the same topic.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. Your words showing in the notch as you speak is still being chased; the next run will say exactly what holds them back.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/said-to-him.md</p></footer>
  </article></main>;
}
