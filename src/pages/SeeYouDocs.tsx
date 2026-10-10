import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function SeeYouDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 075</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Camera</span><span>MVP</span></div><h1>Can you see me?<br /><em>Now he can.</em></h1><p>One photo, one answer, and the camera goes back off.</p><time dateTime="2026-10-04">Published October 4, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Ask Braino &ldquo;can you see me?&rdquo;, &ldquo;how do I look?&rdquo; or &ldquo;what am I holding?&rdquo; and he takes a single photo with your Mac camera, looks at it, and tells you.</p><p>It is not a video. The camera light comes on for about a second, he takes one picture, and it switches off again. The photo is only used to answer you.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. One photo per question, so he does not follow you around. Each answer takes a few seconds. He never guesses who you are, how old you are, or anything personal.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/he-can-see-you.md</p></footer>
  </article></main>;
}
