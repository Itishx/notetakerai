import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function HilOneLookDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 089</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Human Intelligence</span><span>MVP</span></div><h1>One look per page.<br /><em>Then he just does it.</em></h1><p>HIL 2.0. Braino stops thinking before every click and works a page the way you do.</p><time dateTime="2026-10-23">Published October 23, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Asked to sign up for n8n, Braino took two minutes and seventeen rounds of thinking for four clicks. He couldn&rsquo;t see the empty email box, so he kept pressing a greyed-out button.</p><p>Now he looks at a page once, sees every box, what&rsquo;s in it and what&rsquo;s greyed out, fills the whole thing, picks from dropdowns, and presses submit. One look, then the moves run back to back.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Like a person</p><h2>He types and clicks.<br />No tricks.</h2><p>Real sites ignore shortcuts, so he doesn&rsquo;t use them. If three moves change nothing, he stops, looks again and tries a different way. If a choice is yours, like which email owns the account, he asks at the start, not halfway through.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Tested on nine real jobs in a hidden browser, all passing. Not yet tested in a long live session on the Mac. The first time on a new site still takes a few seconds of thinking per page; replaying a saved route with no thinking at all comes next.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/hil-2-one-look-per-page.md</p></footer>
  </article></main>;
}
