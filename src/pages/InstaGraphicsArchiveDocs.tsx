import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function InstaGraphicsArchiveDocs() {
  return <main className="kb-article">
    <header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 019</span></header>
    <article>
      <header className="kb-article-hero"><div className="kb-article-meta"><span>Website</span><span>Social studio</span><span>Exploring</span></div><h1>Every post.<br /><em>Ready to shape.</em></h1><p>Instaposts gives every Braino carousel its own gallery block, hover preview, focused editor, and complete 4K download.</p><time dateTime="2026-08-06">Published August 6, 2026</time></header>
      <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">A social post is a collection, not a loose image.</p><p>The gallery treats every post as one object with five or six connected slides. Hover to recognize it, then open a scrollable, snap-to-slide canvas. Change the words and colours, add and position photos, rearrange the pages, and download the current carousel together. Your edited copy stays in one permanent browser draft even when the surrounding visual design changes. PNG export is explicitly static; animated slides require video export to preserve their motion.</p></section>
      <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The first social story · 1080 × 1350</p><h2>What is<br />Braino?</h2><p>Five portrait slides borrow the product overview's SF Pro hierarchy, warm white, coral signature, and plain-spoken promise. Braino's character forms introduce his personality on slide two; the real coral Chrome system supports the screen-context story on slide four.</p></section>
      <section className="kb-article-block"><p className="kb-article-eyebrow">Post 02 · capability proof</p><h2>What can<br />Braino do?</h2><p>Seven slides begin with one dense capability table, then show the work: page-aware research, lecture notes, browser actions, approved email replies in under five seconds, Calendar and Maps-to-phone handoff, and voice. Only the second post is migrated; the finished introduction post remains untouched.</p></section>
      <section className="kb-article-block"><p className="kb-article-eyebrow">One canvas · every viewport</p><h2>The side panel<br />cannot break it.</h2><p>Slide typography and the embedded Chrome system are pinned to the 4:5 artboard rather than the browser viewport. Full-screen and split-screen previews therefore keep the same hierarchy, and 4K export scales the composed preview instead of laying it out again.</p></section>
      <section className="kb-article-block"><p className="kb-article-eyebrow">Motion export</p><h2>What moves<br />stays moving.</h2><p>Every carousel page can be recorded as a native 1080 × 1350 MP4 for a complete twelve-second cycle and downloaded in one ordered ZIP. Marquees, character movement and the complete coral Chrome flow survive export; static 4K PNG remains a separate fallback.</p></section>
      <section className="kb-article-block"><aside className="kb-honesty"><strong>Take the real files with you</strong><p>One download renders all five slides at 4320 × 5400 and puts the 4K PNGs in a ZIP. Rendering happens locally and can take a moment. The studio still does not publish or schedule posts automatically.</p></aside></section>
      <footer className="kb-article-footer"><Link to="/instaposts">Open Instaposts <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/insta-graphics-editorial-archive.md</p></footer>
    </article>
  </main>;
}
