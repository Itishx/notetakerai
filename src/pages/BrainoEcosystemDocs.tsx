import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoEcosystemDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back">
          <ArrowLeft aria-hidden="true" /> Knowledge Base
        </Link>
        <span className="kb-nav-label">Philosophy 003</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta">
            <span>Everywhere Braino lives</span>
            <span>Product philosophy</span>
            <span>Exploring</span>
          </div>
          <h1>I made a little character.<br /><em>He asked for a world.</em></h1>
          <p>
            How feeling overwhelmed by too many Brainos slowly revealed something
            stranger and more exciting: a small ecosystem hiding in plain sight.
          </p>
          <time dateTime="2026-07-29">Published July 29, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            I did not sit down one morning and decide to build an operating system.
            I was already overwhelmed trying to make one little character useful.
            Braino lived in the browser. Then he needed a Mac. Then a voice. Then a
            way to remember, move, react and follow the work without feeling like
            another cold assistant trapped in a box.
          </p>
          <p>
            Every new version felt like another product I somehow had to hold in my
            head. Browser Braino. Mac Braino. Braino OS. Hera. Studio. For a while,
            it looked like I had made too many things. The realisation was that I had
            been looking at the containers instead of the character moving between them.
          </p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The ecosystem</p>
          <h2>One Braino.<br />Different places to meet him.</h2>
          <div className="kb-question-list">
            <blockquote>In the browser, he understands the page.</blockquote>
            <blockquote>On the Mac, he stays with the machine.</blockquote>
            <blockquote>In the operating layer, the pieces begin to remember each other.</blockquote>
          </div>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The short film</p>
          <h2>He escaped the tab.</h2>
          <p>
            The ecosystem now has a short kinetic film in the language of <em>Don’t Blink</em>.
            The film first introduces Braino by name and mascot. He begins in a browser tab,
            outgrows it, and Braino OS reveals the browser
            and IOMI as two places for the same character. The film defines Braino OS as one
            intelligence layer powering every version of Braino—not as another surface.
            The working cut uses “places to be,”
            with its major story transitions snapped to the detected beat grid. Braino himself
            replaces his written name in the final joke, then walks through the closing frame before
            the final Everywhere lockup.
          </p>
          <p><Link to="/ecosystem-teaser">Watch the Braino ecosystem film <ArrowRight aria-hidden="true" /></Link></p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The surreal part</p>
          <h2>What if an operating system felt less like infrastructure?</h2>
          <p>
            I do not mean replacing macOS or pretending Braino is already a finished
            operating system. I mean an emotional layer above the tools: one character
            who knows where you are, understands what you are doing and changes form
            without becoming a different product every time.
          </p>
          <p>
            That idea feels surreal because operating systems normally disappear into
            menus, permissions and windows. Braino does the opposite. He walks in. He
            speaks. He wears headphones when music starts. He turns software into a
            place with a little theatre in it.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The honest version</p>
          <h2>The ecosystem is a direction, not a victory lap.</h2>
          <p>
            Some pieces are live. Some are experiments. Some still need the bridge
            that lets Braino carry context cleanly from one surface to another. The
            point is not to dress unfinished work up as a grand platform.
          </p>
          <p>
            The point is that the mess finally has a shape. I was overwhelmed because
            I thought I was building several Brainos. I was actually teaching the same
            Braino how to exist in more of my life. Somehow, the little character became
            an ecosystem. The operating system began to feel less mechanical—and a lot
            more surreal.
          </p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">
            See every Braino document <ArrowRight aria-hidden="true" />
          </Link>
          <p>Internal source: Braino Knowledge Base/philosophy/braino-ecosystem.md</p>
        </footer>
      </article>
    </main>
  );
}
