import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, GitCommitHorizontal } from "lucide-react";
import "./knowledge-base.css";

const QUESTIONS = [
  "What feature am I working on?",
  "Is Claude finished?",
  "Cursor Mode status.",
  "Give me an idea for what I am building.",
];

export default function MacCursorModeDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Mode 001</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta">
            <span>Braino for Mac</span><span>Cursor Mode</span><span>MVP</span>
          </div>
          <h1>Your coding agent finished.<br /><em>Braino comes to get you.</em></h1>
          <p>
            Cursor Mode lets Braino stay with the coding work even when you leave Cursor.
            He watches the repository, understands what is changing, and tells you when
            the task looks finished.
          </p>
          <time dateTime="2026-07-29">Published July 29, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            You give Claude, Codex, or another coding agent a task. Then you leave.
            Maybe you watch a video. Maybe you make coffee. The work continues, but the
            little completion message stays trapped inside Cursor.
          </p>
          <p>
            Cursor Mode changes that. Braino keeps an eye on the work. When it appears
            finished, he says, “Hey, your task is over. Please take a look.” If Cursor
            is not in front of you, he opens the repository there.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">What Braino knows</p>
          <h2>He watches the work itself.</h2>
          <p>
            The first version does not pretend it can read an agent’s private thoughts.
            It reads the repository—the part that tells the truth.
          </p>
          <div className="kb-fact-grid">
            {["The current Git commit", "Files changed in the working tree", "The latest commit message", "Whether work is still moving"].map((fact) => (
              <div className="kb-fact" key={fact}><Check aria-hidden="true" /><span>{fact}</span></div>
            ))}
          </div>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Talk to him</p>
          <h2>Braino carries the current feature into the conversation.</h2>
          <div className="kb-question-list">
            {QUESTIONS.map((question) => <blockquote key={question}>“{question}”</blockquote>)}
          </div>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">How completion works</p>
          <h2>A practical signal, for now.</h2>
          <div className="kb-timeline">
            <div><span>01</span><GitCommitHorizontal aria-hidden="true" /><p>Braino checks the repository every three seconds.</p></div>
            <div><span>02</span><GitCommitHorizontal aria-hidden="true" /><p>A changed commit finishes the task immediately.</p></div>
            <div><span>03</span><GitCommitHorizontal aria-hidden="true" /><p>Otherwise, 45 quiet seconds after active changes count as finished.</p></div>
          </div>
          <aside className="kb-honesty">
            <strong>The honest limitation</strong>
            <p>
              A quiet pause can look like completion. Cursor, Claude, Codex, and every
              other coding agent do not yet share one universal “done” signal. This
              repository heuristic is the MVP; direct agent lifecycle events are the
              better destination.
            </p>
          </aside>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The product decision</p>
          <h2>Ambient awareness, without surveillance theatre.</h2>
          <p>
            Braino does not need to spy on every word to be useful. He needs enough
            context to understand what you are building, notice movement, and call you
            back at the right moment. Cursor Mode begins there.
          </p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-cursor-mode.md</p>
        </footer>
      </article>
    </main>
  );
}

