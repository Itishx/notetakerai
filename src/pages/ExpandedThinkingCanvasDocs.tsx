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
            a thin screen-wide sentence first, then a top-quarter live trace on demand.
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
            The new Thinking Canvas keeps the notch thin by default. Words grow left
            from Braino&apos;s centred eyes, continue on the right when necessary, and
            never wrap upward. Click his eyes and the same black island drops down with
            the prompt, current step, and emerging answer.
          </p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The visible sequence</p>
          <h2>Present. Working.<br />Finished.</h2>
          <div className="kb-timeline">
            <div><span>01</span><Circle aria-hidden="true" /><p>The live sentence grows across one thin top strip.</p></div>
            <div><span>02</span><Square aria-hidden="true" /><p>Clicking Braino&apos;s eyes drops the strip into the cognition canvas.</p></div>
            <div><span>03</span><Check aria-hidden="true" /><p>Completion holds briefly, then Braino settles home.</p></div>
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
              Listening and speaking immediately dismiss task progress. Braino&apos;s ears,
              sonar, live words, and speaking mouth cannot be covered by an old thinking
              canvas.
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
