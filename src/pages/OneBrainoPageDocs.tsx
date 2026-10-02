import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function OneBrainoPageDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 066</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Affective website</span><span>/braino</span><span>Live</span></div><h1>One page for Braino.<br /><em>Early access included.</em></h1><p>What he is, what he does, the questions, and the sign-up, all in one place.</p><time dateTime="2026-10-02">Published October 2, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">A waitlist page with only a form on it, and an App Store with one app in it, were two extra stops between you and Braino. So both are gone. Braino sits in the header now, and every &ldquo;Get early access&rdquo; button lands on the sign-up at the bottom of his page.</p><p>The page itself got sharper too: an AI on your Mac that actually does the work, the five things your Mac never had, his two speeds, and an honest answer to &ldquo;how is this better than Siri?&rdquo;</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Old links</p><h2>/waitlist.<br />/early-access.<br />/apps.</h2><p>All three still work. They land on the Braino page, at the part you were looking for.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The sign-up uses the same waitlist system as before. It was not tested with a real email in this change, so nobody fake ended up on the list.</p></aside><p><Link to="/braino#early-access">Get early access <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/one-braino-page.md</p></footer>
  </article></main>;
}
