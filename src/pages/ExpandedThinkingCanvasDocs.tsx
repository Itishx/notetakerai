import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Circle, Square } from "lucide-react";
import "./knowledge-base.css";

export default function ExpandedThinkingCanvasDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 004</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta">
            <span>Braino for Mac</span><span>Thinking Canvas</span><span>MVP</span>
          </div>
          <h1>You should know<br /><em>when Braino is working.</em></h1>
          <p>
            A longer task turns the Mac notch into one continuous cognition surface:
            a compact signal first, then an optional black thinking sheet when you click.
          </p>
          <time dateTime="2026-07-29">Published July 29, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            Braino could be doing useful work in the background while looking completely
            still. Worse, a long status sentence had nowhere sensible to go. It squeezed
            into the notch until the interface felt more anxious than intelligent.
          </p>
          <p>
            Heard words still grow from Braino&apos;s centred eyes without stealing the
            current app. A real request keeps a compact progress signal in the notch.
            Click anywhere on it when you want the black thinking sheet with three short
            progress summaries; click away to fold it again.
          </p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The visible sequence</p>
          <h2>Present. Working.<br />Finished.</h2>
          <div className="kb-timeline">
            <div><span>01</span><Circle aria-hidden="true" /><p>The live sentence grows across one thin top strip.</p></div>
            <div><span>02</span><Square aria-hidden="true" /><p>The thinking sheet opens only when you click the compact notch.</p></div>
            <div><span>03</span><Check aria-hidden="true" /><p>The same surface becomes the short or long answer, then settles home.</p></div>
          </div>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">What appears</p>
          <h2>Useful progress. Never private reasoning.</h2>
          <div className="kb-question-list">
            <blockquote>Understanding your request</blockquote>
            <blockquote>Reading the current page</blockquote>
            <blockquote>Checking the final result</blockquote>
          </div>
          <p>
            Braino shows short summaries of observable work. Raw chain-of-thought,
            technical logs, token streams and hidden prompts do not belong in the UI.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Voice comes first</p>
          <h2>You always know when Braino is listening.</h2>
          <aside className="kb-honesty">
            <strong>One state owns the island</strong>
            <p>
              Listening immediately dismisses stale task progress. A real answer receives
              the notch next, so thinking becomes readable speech instead of dropping to
              an unrelated mouth-only state. The command itself is dispatched before the
              Notch is painted, so visibility can never become execution latency.
            </p>
          </aside>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/expanded-thinking-canvas.md</p>
        </footer>
      </article>
    </main>
  );
}
