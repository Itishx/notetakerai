import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function BrainoChatMacDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 059</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>Type to him.<br /><em>He'll do it.</em></h1>
          <p>Everything voice can do, in silence.</p>
          <time dateTime="2026-09-28">Published September 28, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The Braino app now opens on Chat. Type to him and he answers, or does it: open a site, send a WhatsApp, find flights. It uses the same brain, hands and safety checks as voice, and it stays silent, so it works in class.</p>
          <p>While he works, each step appears inside his reply with a tick or a cross and what he was thinking, then folds away when he's done.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Links in his replies aren't clickable yet, and it decides talk or do the same way voice does.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/braino-chat.md</p>
        </footer>
      </article>
    </main>
  );
}
