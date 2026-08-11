import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoXDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 030</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino website</span><span>/x command center</span><span>MVP</span></div><h1>Itish owns the voice.<br /><em>Braino owns the distribution.</em></h1><p>BrainoX turns a founder&rsquo;s raw thoughts into a policy-gated, explainable X publishing system with a queue, a briefing, and a kill switch.</p><time dateTime="2026-08-12">Published August 12, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Dump a thought, and Braino hands back three honest post options. Approve one, and the system finds it a slot that clears your spacing, your quiet hours, and your daily cap.</p><p>Nothing is invented. Every generated option carries an authenticity note naming the facts it rests on, and the user&rsquo;s own posts go to the queue with the wording untouched.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The hard gate</p><h2>Propose.<br />Policy guard.<br />Publish.</h2><p>Kill switch, duplicates, spacing, quiet hours, daily caps. A blocked post tells you exactly which gate held it and why. &ldquo;Publish now&rdquo; overrides timing, never the kill switch.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Impressions and follower attribution need a paid X API tier, so the MVP reports engagement counts and follower snapshots and says so. Reply discovery, event detection, and the learning engine live in the spec, not yet in the product.</p></aside><p><Link to="/x">Open the command center <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/brainox-distribution.md</p></footer>
  </article></main>;
}
