import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function HilScoredDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 072</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Human Intelligence Layer</span><span>2.16.0</span><span>Live</span></div><h1>12 of 22.<br /><em>Then 22 of 22.</em></h1><p>Braino&rsquo;s thinking layer now has a test made of real hard commands, and it passes all of them.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">One night of hard commands went badly. Questions got answered with clicks, a docs link was called &ldquo;cannot be undone&rdquo;, a half-loaded page was called logged out, and sometimes he simply lost his train of thought. That last one turned out to be a bracket the model dropped or added, in 7 of 32 replies.</p><p>So the commands became a test: 22 of them, each with the screen he saw and the right thing to do, run three times each. Then every pattern was fixed, and the test proves it.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The rules he learned</p><h2>A question gets an answer.<br />Looking is never gated.<br />A follow-up is the same job.</h2><p>Plus: ask for the missing piece straight away, wait for a page to load before judging it, and say it back when asked to repeat it.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Twenty-two commands is a start, not a guarantee. Every new failure becomes a new case. Laya was retrained the same night and was not better yet, so the current model stays; the early-user beta is where her next thousands of examples come from.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/hil-scored.md</p></footer>
  </article></main>;
}
