import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function PageLinksDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 056</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Companion</span><span>MVP</span></div>
          <h1>"Send the first photo."<br /><em>Done.</em></h1>
          <p>He reads the page like a browser does, so he knows which one you mean.</p>
          <time dateTime="2026-09-27">Published September 27, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">You are looking at a page of results: pins, videos, search results. You say "send the first photo to Param". Braino reads the page itself, finds the first photo's link, and sends it on WhatsApp. No screenshot, no clicking around, no waiting.</p>
          <p>"The second video", "the top result" and "the last one" all work too. And "this link" still means the page you are on.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>First means first in reading order, top to bottom and left to right. It knows Pinterest, YouTube, Google, Instagram, Amazon, Reddit and X best.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/links-off-the-page.md</p>
        </footer>
      </article>
    </main>
  );
}
