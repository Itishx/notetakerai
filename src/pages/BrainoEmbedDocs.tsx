import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoEmbedDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Mode 032</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Any website</span><span>Embed</span><span>MVP</span></div><h1>One script tag.<br /><em>The real Braino.</em></h1><p>Paste one line into any website and Braino shows up there too: same mascot, same Fish Audio voice, same personality, talking to that site's own visitors.</p><time dateTime="2026-08-13">Published August 13, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">He can chat about the page he's sitting on immediately. If that site also builds one small endpoint over its own database, he can answer grounded in that site's real data too, an order status, a product's stock, whatever the site chooses to expose.</p><p>Braino's voice, memory, and personality never leave his own backend. Every embedded site only ever gets a client talking to it.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The one rule</p><h2>No site<br />ever gets<br />a database key.</h2><p>Instead the target site writes a few lines of its own, scoped, read-only lookup code and hands Braino back plain text. That's what makes "works on anything" safe instead of reckless.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Nothing here is live in production yet. The mascot is a static idle/talking image, not the extension's full animated walker. No memory across visits, no usage metering, and voice is spoken replies plus browser-native speech input, not a full realtime conversation, yet.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/braino-embed.md</p></footer>
  </article></main>;
}
