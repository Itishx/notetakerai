import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function WhichContactDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 067</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>WhatsApp and calls</span><span>MVP</span></div><h1>Which Riya?<br /><em>He asks now.</em></h1><p>When two people share the name you said, Braino asks which one before he sends or calls.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">&ldquo;Send this link to Riya&rdquo; went to the wrong Riya. He matched the bare name to one contact, scored the other lower, and only ever asked when two names tied exactly. A person would have asked. Now he does.</p><p>&ldquo;Which Riya? Riya Khurana, who you talk to most, or the other Riya?&rdquo; Say &ldquo;Khurana&rdquo;, &ldquo;the other one&rdquo;, or tap the name in the notch. Say &ldquo;cancel&rdquo; and nothing goes.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Who comes first</p><h2>The person you<br />actually talk to.</h2><p>He counts your real WhatsApp messages with each of them on your Mac, and offers that person first. It only decides the order. He never picks for you.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. A message to someone with a unique name still sends without a yes, so &ldquo;sends after your yes&rdquo; is only true here for now. In the Chat app you type the second name instead of tapping it.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/which-contact.md</p></footer>
  </article></main>;
}
