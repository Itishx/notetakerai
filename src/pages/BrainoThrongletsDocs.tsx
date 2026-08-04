import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoThrongletsDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/" className="kb-back"><ArrowLeft aria-hidden="true" /> Waitlist</Link>
        <span className="kb-nav-label">Product experiment 011</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino world</span><span>Collective character</span><span>Exploring</span></div>
          <h1>One Braino became<br /><em>a tiny civilization.</em></h1>
          <p>Five versions of the same character, living separate little lives inside one shared world.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino Thronglets asks what changes when a companion becomes a society.</p>
          <p>One Braino gardens memories. Another carries context. One builds, one watches patterns, and one has taken personal responsibility for joy. They move on their own rhythms instead of waiting for a command.</p>
          <p>Double-click any citizen to hold that Braino still while you inspect or customize it. Double-click again when you want the little life to continue.</p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The principle</p>
          <h2>Same character.<br />Different lives.<br />Shared world.</h2>
          <p>The inspiration is the idea of small digital beings developing routines and collective meaning. The world, character art, roles, and behavior are original to Braino.</p>
        </section>

        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>A world study, for now</strong>
            <p>The five citizens animate independently, but they do not yet reason, reproduce, preserve memories, or change the environment permanently. The shared civilization is the direction—not a fake claim about what this first version can do.</p>
          </aside>
        </section>

        <footer className="kb-article-footer">
          <Link to="/braino-thronglets">Enter the world <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/braino-thronglets.md</p>
        </footer>
      </article>
    </main>
  );
}
