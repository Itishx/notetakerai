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
          <p>One permanent home for the extension: Braino lives inside it, the notch becomes every interaction state, and finished work returns home.</p>
          <time dateTime="2026-07-31">Published July 31, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino should feel alive without making every webpage feel occupied.</p>
          <p>Idle Braino lives inside the notch. Click him and that same notch becomes the input bar. Speak and it becomes the listening animation. Submit and it contracts into a calm thinking hatch.</p>
          <p>Click the hatch to expand the old Delegate progress view inside the notch: what Braino is doing, what finished, what is happening now, and what comes next. When he finishes speaking, the notch shrinks back home. “Hop down” is the explicit way to send Braino into browser walking mode.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The rule</p>
          <h2>One object.<br />Every state.<br />Then home.</h2>
          <p>No detached input bar and no separate thinking card. The notch changes shape, does the work, and contracts when the task is over.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Prototype only</strong><p>The InstaGraphics study is staged. It does not yet read a live page, start voice, execute a task, or undo anything. Its job is to settle the interaction language before the extension implementation changes.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/instagraphics?design=browser-notch">Open the live prototype <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/browser-notch-presence.md</p>
        </footer>
      </article>
    </main>
  );
}
