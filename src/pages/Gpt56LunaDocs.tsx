import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function Gpt56LunaDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 027</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Every Braino surface</span><span>Model system</span><span>MVP</span></div>
          <h1>The same Braino.<br /><em>At a smaller bill.</em></h1>
          <p>Braino's everyday text and vision work now points to GPT-5.6 Luna, the cheaper GPT-5.6 option.</p>
          <time dateTime="2026-08-09">Published August 9, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The model choice used to be repeated across chat, notes, research, HIL, X helpers, vision, and the browser extension. That made one small change surprisingly easy to miss.</p>
          <p>There is now one server-side default for Braino's general intelligence routes, with the browser bundle pinned to the same model. You do not need to pick a model on each device.</p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The price decision</p>
          <h2>Luna is 90% cheaper<br />than Terra.</h2>
          <p>At standard short-context rates per million tokens, Luna is $0.20 input and $1.20 output. Terra is $2 input and $12 output. The previous GPT-5.4 Mini was $0.75 input and $4.50 output.</p>
          <p><a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noreferrer">See OpenAI's current API pricing.</a></p>
        </section>

        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>Honest limitation</strong>
            <p>Luna is the cost-first model, not the strongest one. The change is still an MVP until Braino's cross-surface quality and latency checks pass and the updated services and device builds are released.</p>
          </aside>
          <p>Realtime speech, transcription, text-to-speech, embeddings, and moderation keep their purpose-built models. Those are different jobs, not cheaper versions of the same one.</p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/gpt-5-6-luna-across-braino.md</p>
        </footer>
      </article>
    </main>
  );
}
