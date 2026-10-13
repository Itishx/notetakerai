import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function PointerDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 074</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Pointer</span><span>MVP</span></div><h1>Point at it.<br /><em>Ask what it is.</em></h1><p>Your mouse is the context: hover over anything and ask.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Hover over a word, a button, or the eye in an anatomy diagram, and say &ldquo;what is this?&rdquo;. Braino looks where your mouse was when you started speaking, because people move the mouse while they talk.</p><p>He checks what you highlighted first, then the exact text under the pointer on a web page, and otherwise looks at a small picture around it. The notch shows what he picked up before he answers, so a wrong pick is obvious straight away.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. A highlight wins even if it is old. In Mac apps the text is read from a picture, so very small text can be missed, and an answer about an image takes a few seconds.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/your-mouse-is-the-context.md</p></footer>
  </article></main>;
}
