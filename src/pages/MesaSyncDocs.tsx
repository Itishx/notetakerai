import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MesaSyncDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 044</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Mesa</span><span>MVP</span></div>
          <h1>Your timetable,<br /><em>already up to date.</em></h1>
          <p>Connect Mesa once and Braino syncs your classes and assignments by himself, every day.</p>
          <time dateTime="2026-09-24">Published September 24, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino used to read your Mesa timetable through your Chrome. When that login expired, he stopped syncing and didn't say a word. For six days, "what's due?" came from old data.</p>
          <p>Now he has his own Mesa login. You sign in once in Settings, and every morning he syncs in the background. No tabs, no Chrome needed.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">When it expires</p>
          <h2>He tells you. Once.</h2>
          <p>If your Mesa login runs out, you get one notification and Settings shows it in red. One tap and you're back.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>It only syncs while the Braino app is running on your Mac. Attendance and grades aren't in the daily sync yet.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mesa-auto-sync.md</p>
        </footer>
      </article>
    </main>
  );
}
