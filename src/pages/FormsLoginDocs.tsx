import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function FormsLoginDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 049</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Automation</span><span>MVP</span></div>
          <h1>Forms fill themselves,<br /><em>and logins just happen.</em></h1>
          <p>Everything he knows about you, in about a second. Your passwords stay with Chrome.</p>
          <time dateTime="2026-09-26">Published September 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Say "fill this form for me" and Braino fills every field he already knows: your name, email, phone, college, programme, role and links. He tells you what's left for you, and he never presses send.</p>
          <p>Tell him a detail once, like "my phone number is 98765 43210", and he uses it on every form after that.</p>
          <p>On a login page, say "log me in". He asks Chrome for the login it already saved, the same way you would by clicking the box, and Chrome fills it in. Braino never sees your password.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>He won’t fill card numbers, codes or captchas, and questions you answer in your own words are still yours. Chrome only, for now.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/fill-forms-and-log-in.md</p>
        </footer>
      </article>
    </main>
  );
}
