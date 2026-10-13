import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function OwnBrowserDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 078</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Browser</span><span>MVP</span></div><h1>He books it.<br /><em>Your Chrome stays yours.</em></h1><p>Jobs he does for you on the web run in his own browser, out of your way.</p><time dateTime="2026-10-05">Published October 5, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Ask Braino to book tickets, order something or find the cheapest flights, and he does it in his own browser, a window inside the app that stays out of sight. You keep using your Mac and your Chrome the whole time.</p><p>He reads and presses from inside the page, so every step lands where it should and is quick. The notch tells you how it is going, and anything that pays or books still asks you first. Say &ldquo;show me&rdquo; to watch.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>His browser has its own logins, so the first time a site wants you signed in, say &ldquo;show me&rdquo; and sign in once. Some sites with bot checks may refuse it. Thinking still takes a few seconds per decision; what got faster is everything in between.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/brainos-own-browser.md</p></footer>
  </article></main>;
}
