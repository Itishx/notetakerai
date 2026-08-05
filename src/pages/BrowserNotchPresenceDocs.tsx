import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function BrowserNotchPresenceDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 013</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Chrome</span><span>Browser notch</span><span>Exploring</span></div>
          <h1>The notch holds the state.<br /><em>Braino holds the moment.</em></h1>
          <p>A coherent browser system: the mascot carries presence, the notch carries voice and live status, and liquid chat keeps the conversation.</p>
          <time dateTime="2026-07-31">Published July 31, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino should feel alive without making every webpage feel occupied.</p>
          <p>Braino already has a mascot and a liquid conversation window. The notch adds a lighter voice-first layer without replacing either one. Speak and it becomes the listening animation. Submit and it contracts into calm live task status.</p>
          <p>The mascot remains Braino's ambient presence and the way into chat. Liquid chat keeps history, page context, sources, approvals, and follow-ups. When work finishes, the notch shrinks instead of leaving a second interface open.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The rule</p>
          <h2>Presence.<br />Live state.<br />Conversation.</h2>
          <p>Mascot for presence. Notch for voice and status. Liquid chat for depth and history. Each surface gets one clear job.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Prototype only</strong><p>The InstaGraphics study is staged. It does not yet read a live page, start voice, execute a task, or undo anything. Its job is to settle the interaction language before the extension implementation changes.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/instagraphics?design=chrome-system">Open the full-browser prototype <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/browser-notch-presence.md</p>
        </footer>
      </article>
    </main>
  );
}
