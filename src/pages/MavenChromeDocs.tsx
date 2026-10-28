import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MavenChromeDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Product 095</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Maven</span><span>Chrome extension</span><span>MVP</span></div><h1>Maven,<br /><em>in Chrome.</em></h1><p>Talk instead of typing in any text box on the web. Same voice, same cleanup, the same little pill in the corner.</p><time dateTime="2026-10-29">Published October 29, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Lots of people live in the browser. Gmail, WhatsApp Web, Slack, Docs. So Maven now lives there too. Press Control and Option, say what you want to write, press them again, and it lands where your cursor is, without the ums, with the right numbers and punctuation.</p><p>Press Option and Command instead and Maven does one small job. Open a site, jump to a tab, message someone on WhatsApp Web, start a Gmail draft, write a reply to the email on screen, or fill a form with your details. Anything that sends waits for your yes.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">How to use it</p><h2>⌃⌥ to write.<br />⌥⌘ to do.</h2><p>Press to start, talk, press again to stop. Enter says yes to a card, Esc cancels. Drag the pill to the left, centre or right and it stays there in every tab. No text box? Your words are copied and shown in the pill.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>It only works on web pages, not Chrome's own pages and not other apps on your Mac. WhatsApp Web sending depends on WhatsApp's page, so if it ever fails, Maven copies the message and tells you. Gmail is always a draft, never a send. Long takes come back a few seconds slower than on the Mac app. And the Mac app has no sign-in yet, so the two don't share your words yet.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/maven-for-chrome.md</p></footer>
  </article></main>;
}
