import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function NotesPdfDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 084</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Notes</span><span>MVP</span></div><h1>Your notes,<br /><em>written up properly.</em></h1><p>Every meeting and lecture, saved as a PDF you would actually read again.</p><time dateTime="2026-10-15">Published October 15, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Record a meeting or a lecture and Braino writes it up like a document, not a wall of text. The answer comes first. Then why you met, who said what, the decisions, who does what by when, and what to say if someone asks you about it later.</p><p>Each one is saved as a PDF in Documents, in a Braino folder, with the date in the name and a coloured tag in Finder. Open the Braino app, go to Notes &amp; meetings, and read it right there. The full transcript sits at the back, so you can always check what was really said.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The write-up only knows what the microphone heard. If it can&rsquo;t finish in about a minute and a half, you get the plain notes instead. Older notes aren&rsquo;t converted on their own yet; open one and press Save as PDF.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/notes-as-pdfs.md</p></footer>
  </article></main>;
}
