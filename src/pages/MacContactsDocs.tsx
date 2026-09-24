import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacContactsDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 043</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Contacts</span><span>MVP</span></div>
          <h1>See everyone<br /><em>he can reach.</em></h1>
          <p>Settings now has a Contacts page: your whole address book, searchable, with a sync button.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino already knew your contacts. He read your Mac's address book every time he started, in a blink. You just couldn't see what he knew.</p>
          <p>Now you can. Open Settings, pick Contacts, and everyone he can call, text or email is right there. Added someone new? Press Sync.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>It only reads your Mac's address book. Contacts that live only in Google won't show up until they're synced to your Mac.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-contacts-page.md</p>
        </footer>
      </article>
    </main>
  );
}
