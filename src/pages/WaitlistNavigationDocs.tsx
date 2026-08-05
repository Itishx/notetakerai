import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function WaitlistNavigationDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design 002</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta">
            <span>Braino website</span><span>Design decision</span><span>Live</span>
          </div>
          <h1>The navigation moved<br /><em>beside the story.</em></h1>
          <p>
            The waitlist has six chapters and one reading path. Its navigation now
            stays quietly on the left instead of interrupting the page from above.
            It is also the only public route while the waitlist owns the launch.
          </p>
          <time dateTime="2026-07-29">Published July 29, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            We had an index. Then we had a horizontal menu. Both were trying to help,
            but together they made the beginning feel like instructions before the story.
          </p>
          <p>
            So we removed the duplicate menu and made the chapter navigation part of
            the page’s edge. On a desktop it becomes a slim vertical rail. On smaller
            screens it moves to the bottom, where it stays useful without sitting on
            top of the writing.
          </p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The new rhythm</p>
          <h2>Name it. Show it.<br />Then explain it.</h2>
          <div className="kb-question-list">
            <blockquote>Heading and one direct description.</blockquote>
            <blockquote>The film, before the long explanation.</blockquote>
            <blockquote>Two paragraphs that finish the story.</blockquote>
          </div>
          <p>
            Braino OS is the one exception. It has no film: its two engine graphics
            sit between the opening description and the two paragraphs that explain
            the operating layer underneath Braino.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">What stays private</p>
          <h2>Hera is a name,<br />not a product brief.</h2>
          <p>
            The public page now says only “Coming soon.” Its mechanics,
            comparisons, feature breakdown, and development details stay private
            until there is something we actually want to reveal.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Why the footer changed</p>
          <h2>The footer became a game.</h2>
          <p>
            The old footer simply named the builder and pointed back to the top.
            The waitlist now uses the shared Mario-style Braino footer game from the
            product homepage. The story ends with the character doing something,
            not another static utility strip.
          </p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The homepage</p>
          <h2>One homepage.<br />Every direct route intact.</h2>
          <p>
            The waitlist owns `/`, while existing product and design pages remain
            available at their explicit routes for direct testing and review.
            The hero now pairs its three-beat “cutest AI agent” headline with Braino
            himself, a quiet orbital visual, and one simpler explanation. The old
            “Download Braino” hero button is gone so the page keeps one clear waitlist path.
          </p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/waitlist-navigation.md</p>
        </footer>
      </article>
    </main>
  );
}
