import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MacTypeBarDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 092</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>⌘⌥T</span><span>MVP</span></div><h1>Type it.<br /><em>He stays quiet.</em></h1><p>One line of glass in the middle of your screen, whenever you'd rather type than talk.</p><time dateTime="2026-10-25">Published October 25, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Talking to Braino is the main way in. But sometimes you're in a call, in class, or just not in the mood to talk.</p><p>Press ⌘⌥T anywhere and a soft glass bar appears in the middle of your screen. Type, hit Enter, and the answer shows up in the notch like always.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">One rule</p><h2>Typed means<br />quiet.</h2><p>He only talks when he's talked to. Anything you type, here or in the app, gets a written answer and no voice. Esc closes the bar, and the up arrow brings back the last thing you sent.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>It's one line, with no attachments yet. If another app already uses ⌘⌥T, Braino picks ⌘⇧Space instead.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/mac-type-bar.md</p></footer>
  </article></main>;
}
