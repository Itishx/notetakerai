import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function FoundryAppDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Product 088</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Web</span><span>Foundry</span><span>MVP</span></div><h1>Get your product<br /><em>seen.</em></h1><p>Foundry finds where buyers can't find you, fixes it, and brings you people asking for it.</p><time dateTime="2026-10-22">Published October 22, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Tell Foundry what you're building, in your own words. It plays it back in two plain lines so you know it understood. Then it asks your buyers' questions to an AI assistant and to Google, and shows you where you're missing and who shows up instead.</p><p>Next it writes posts for X, LinkedIn, Reddit, Instagram and Threads that answer those questions, and finds people on Reddit describing your problem, with a reply written for each. You approve, and it opens the platform with the text ready. <Link to="/foundry">Try Foundry</Link>.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The AI check asks GPT-5.6 the way a buyer would, not a live ChatGPT search. Reddit threads come through Google from the past year. Foundry never posts or sends anything itself; you do, one tap at a time.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/foundry-app.md</p></footer>
  </article></main>;
}
