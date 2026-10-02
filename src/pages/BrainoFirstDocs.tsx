import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoFirstDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 065</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Affective website</span><span>Home page</span><span>Live</span></div><h1>Braino first.<br /><em>Then why he works.</em></h1><p>One company, one website, and the product is the first thing you meet.</p><time dateTime="2026-10-02">Published October 2, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">The home page used to go Affective, then AffectiveOS, then Braino. You had to change your idea of what you were looking at twice before you found the thing you would actually use. People kept asking if it was one company or two, and if AffectiveOS meant installing a new operating system.</p><p>Now it reads the way apple.com reads: the iPhone first, the company behind it. Meet Braino. See what he does. Then learn that he runs on AffectiveOS, a layer on top of the macOS you already have.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The structure</p><h2>Affective makes it.<br />Braino is it.<br />AffectiveOS is why it works.</h2><p>affctve.com is the only website. trybraino.com stays ours, and its home page now points to Braino on affctve.com. Braino Foundry and Braino for Schools are links in the footer.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Nobody outside has tested the new order yet. The Braino page still shows the three models and needs the same pass.</p></aside><p><Link to="/">See the home page <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/braino-first.md</p></footer>
  </article></main>;
}
