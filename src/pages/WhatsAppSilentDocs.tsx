import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function WhatsAppSilentDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 046</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>WhatsApp</span><span>MVP</span></div>
          <h1>He knows who texted.<br /><em>He doesn't read it out.</em></h1>
          <p>Every WhatsApp message, remembered quietly. The important ones show in the notch.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">You don't always have time to check your phone, or even open WhatsApp. Braino reads your WhatsApp Mac app quietly, so he always knows who messaged and what they said.</p>
          <p>He never reads a message out by himself. Mark the people who matter as important, and their messages show in the notch. Everyone else waits until you ask: "did Ilu message?" "Catch me up."</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Group chats aren't covered yet, and nothing is shown for them on purpose. It relies on how the WhatsApp Mac app stores messages, which a WhatsApp update could change.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/whatsapp-silent-awareness.md</p>
        </footer>
      </article>
    </main>
  );
}
