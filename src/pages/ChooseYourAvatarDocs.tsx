import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import "./knowledge-base.css";

export default function ChooseYourAvatarDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 012</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta">
            <span>Braino website</span><span>Choose Your Avatar</span><span>MVP</span>
          </div>
          <h1>One Braino OS.<br /><em>Pick who shows up.</em></h1>
          <p>
            Braino OS is one brain — one voice, one memory, one set of actions. Choose Your
            Avatar lets you decide which character rides on top of it: Braino himself, or
            Webb, an original web-slinger acrobat.
          </p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            The Claude Design cast grid sketched six original characters riding the same
            OS — Braino, Ferro, Wisp, Glam, Webb, Krush, Blip. This is the first one wired
            into the real product.
          </p>
          <p>
            Pick a character once in Dashboard Settings, and it follows you — the same
            talking, walking, listening Braino OS underneath, with a different face on top.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">What changes, what doesn't</p>
          <h2>Same mechanism, different face.</h2>
          <div className="kb-fact-grid">
            {[
              "Same procedural talk-mouth animation for both characters",
              "Same walk-cycle mechanism — Webb's legs were extended to match",
              "Choice saves to your account, follows you between surfaces",
              "Voice, memory, and actions are unchanged either way",
            ].map((fact) => (
              <div className="kb-fact" key={fact}><Check aria-hidden="true" /><span>{fact}</span></div>
            ))}
          </div>
        </section>

        <section className="kb-article-block kb-dark-block">
          <aside className="kb-honesty">
            <strong>The honest limitation</strong>
            <p>
              Webb only has the poses ported so far: idle, wave, point, talk, walk — not
              Braino's full repertoire yet. Fixed marketing scenes elsewhere on the site
              intentionally stay Braino; they're choreographed around his rig specifically,
              not "your assistant." And the Mac app currently only knows which character
              you picked — it doesn't render Webb in the notch or the desktop walker yet.
            </p>
          </aside>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The product decision</p>
          <h2>One picker, not two.</h2>
          <p>
            The website Dashboard is the only place you choose. The Mac app has no in-app
            Preferences window today, so rather than build a whole new native settings
            surface just for this, it simply reads the same account-level choice the
            website writes.
          </p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/choose-your-avatar.md</p>
        </footer>
      </article>
    </main>
  );
}
