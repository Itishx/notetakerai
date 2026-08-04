import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HowBrainoTalksDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 015</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino everywhere</span><span>Emotional Engine</span><span>MVP</span></div>
          <h1>He never asks<br /><em>&ldquo;what&rsquo;s on your mind?&rdquo;</em></h1>
          <p>Braino now opens like someone who was already paying attention, and how charming he is scales with the moment, down to none at all when it would be an insult.</p>
          <time dateTime="2026-08-02">Published August 2, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">What outs an AI is not formality. It is eagerness. &ldquo;What&rsquo;s on your mind?&rdquo; is the sound of something waiting to be useful: it hands the work back to you and proves it noticed nothing.</p>
          <p>The charm was always in Braino, but it was locked in the one part of him that only speaks when you ask about him directly. Now it is his baseline. He notices something, says it short, and is a little amused by life. Say hello to him and you get &ldquo;You&rsquo;re back.&rdquo;</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The dial</p>
          <h2>Full charm when things are fine.<br />None at all at a funeral.</h2>
          <p>Teasing when you are joking. Pure speed when you just want the thing done. Warmth with the teasing switched off when you are venting. Plain in heartbreak. And in grief or real distress, the charm removes itself from him completely, because wit there is not charming, it is an insult.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The check</p>
          <h2>The ban is enforced, not requested.</h2>
          <p>Braino has always carried lists of phrases he is never allowed to say: therapy voice, wellness-pamphlet closers, &ldquo;great question&rdquo;, &ldquo;as an AI&rdquo;. Those were requests written into his personality, and a request is not a guarantee. Now every reply he writes is scanned against those lists in code, so it either comes back clean or names the exact phrase that slipped through.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Watch it work</p>
          <h2>Say something. See exactly why he answered that way.</h2>
          <p>The Emotional Intelligence page has two new views. <strong>Reply</strong> gives you his answer plus the whole reason behind it: the moment he read and how he read it, who spoke first, the one sentence that steered him, where the charm dial sat, and the tell check. <strong>Whole mind</strong> runs one message through both halves of him at once, the thinking and the feeling, side by side.</p>
          <div className="kb-cta-row">
            <Link className="kb-btn" to="/emotional-intelligence">Open the Emotional Intelligence lab</Link>
          </div>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>The tell check is a phrase scan. It reliably catches the known bot-tells, but it cannot judge whether a reply is actually good, only whether it contains something he is not allowed to say.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/how-braino-talks.md</p>
        </footer>
      </article>
    </main>
  );
}
