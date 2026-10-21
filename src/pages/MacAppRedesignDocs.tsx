import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MacAppRedesignDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 086</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Design</span><span>MVP</span></div><h1>The Braino app,<br /><em>now a calm place to read.</em></h1><p>Warm paper, serif headings, and a sidebar that gets out of the way.</p><time dateTime="2026-10-18">Published October 18, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Double-click Braino and his window opens. It used to look like a stack of glass tiles. Now it looks like the rest of Affective: warm paper, black ink, thin lines, and headings in a book serif.</p><p>The sidebar is a simple list now. The button next to the window controls folds it away when you want room, and Cmd+\ does the same. Braino remembers how you left it.</p><p>Chat has its own page. Click Chat and you see every conversation, newest first, with when it happened. Open one to pick it up again, use Back to return to the list, or start a New chat. Inside a chat, his replies read like a letter in one centred column, and the box to type in stays at the bottom.</p><p>Settings pages like General, Permissions, Shortcuts and Privacy are calm lists too, with the switch or the key on the right.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Your chats are still kept on this Mac only, so they do not follow you to another computer yet. The look is light only for now; a dark version is not built.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/mac-app-redesign.md</p></footer>
  </article></main>;
}
