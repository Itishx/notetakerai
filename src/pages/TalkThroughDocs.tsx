import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function TalkThroughDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 080</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Voice</span><span>MVP</span></div><h1>Talk me through it.<br /><em>He says what he's doing.</em></h1><p>Give Braino a long job and he tells you what he heard, then what he's doing, while he does it.</p><time dateTime="2026-10-10">Published October 10, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">He used to go quiet for seconds at a time while he clicked around your screen. Now he talks you through it. &ldquo;Got it. Finding the five cheapest flights to Goa.&rdquo; Then &ldquo;Opening Google Flights.&rdquo; &ldquo;Typing Goa.&rdquo; Then the answer.</p><p>Quick things stay quick. &ldquo;Play Billie Jean&rdquo; just plays.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. Steps that happen faster than a few seconds apart aren't all said, on purpose. Turn it off in the Braino app under Voice &amp; listening.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/talk-me-through-it.md</p></footer>
  </article></main>;
}
