import { ArrowLeft, ArrowRight, Check, MessageSquareText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

const STATES = [
  "Thinking stays compact until you click",
  "A short reply stays compact",
  "A long reply becomes a calm reading surface",
  "The panel ends with the answer, not empty space",
  "The words advance with the voice",
];

export default function MacIomiResponseSurfacesDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 023</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>IOMI</span><span>MVP</span></div>
          <h1>The answer now lives<br /><em>inside the notch.</em></h1>
          <p>
            Mac IOMI now uses the same thinking, short-answer, and long-answer
            treatment as browser Braino, without pulling you away from the app you are in.
          </p>
          <time dateTime="2026-08-10">Updated August 10, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            Ask Braino to summarise a Medium article, whether he is home or walking
            on-screen. The compact notch signals that he is working; click it only if
            you want the full black thinking surface. When his voice begins, the same
            object becomes the answer. The same thing happens while the full mascot is
            walking: he keeps his personality, but he no longer carries a subtitle box
            across the page. It is one object changing jobs, not another window.
          </p>
          <p>
            Quick replies stay small. Expanded thinking, short answers, long answers,
            labels, headings, and controls all use the same SF Pro Display face as
            BrainoHERA—there is no editorial serif left inside a response. Longer replies
            keep safe paragraph structure. The sheet measures the
            rendered answer and ends close to its last line instead of leaving a large
            empty black area. Finished words settle into ink as the voice reaches them.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">One continuous sequence</p>
          <h2>Thinking becomes speaking.<br />Speaking becomes readable.</h2>
          <div className="kb-fact-grid">
            {STATES.map((state) => (
              <div className="kb-fact" key={state}><Check aria-hidden="true" /><span>{state}</span></div>
            ))}
          </div>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Same Braino, same design system</p>
          <h2>Black glass.<br />Quiet light and motion.</h2>
          <div className="kb-timeline">
            <div><span>01</span><Sparkles aria-hidden="true" /><p>Useful progress is one click away. Private reasoning does not appear.</p></div>
            <div><span>02</span><MessageSquareText aria-hidden="true" /><p>The compact card&apos;s real two-line capacity chooses compact or long form.</p></div>
            <div><span>03</span><Check aria-hidden="true" /><p>Done folds it now. Otherwise it settles after the reading beat.</p></div>
          </div>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Your app stays yours</p>
          <h2>Readable without stealing the caret.</h2>
          <p>
            The Mac surface deliberately leaves out the browser&apos;s follow-up input.
            Medium, Cursor, Mail, or the current text box keeps focus while the
            always-on-top notch shows the answer.
          </p>
          <p>
            Direct commands do not wait for the surface. Braino queues the command
            first, keeps thinking collapsed, and runs HIL audits after the result.
            Named Spotify tracks also skip redundant context and playback checks, so
            the song starts on the native Mac path before background diagnostics.
          </p>
          <p>
            Live speech subtitles now stay inside a centered black Braino box instead
            of stretching into the old left and right wings. The compact thinking phase
            uses that same box, and the expanded progress sheet measures its real content
            so words such as Hatching are not clipped.
          </p>
          <p>
            The sheet now grows from the measured housing instead of painting a black
            bar across the menu strip. Every state uses the same safe top line, including
            on a second display arranged above or below the main screen, so copy and the
            Done control cannot jump between the top and bottom of the notch.
          </p>
          <aside className="kb-honesty">
            <strong>The honest limitation</strong>
            <p>
              This is a notch-style overlay, not an Apple-owned system surface.
              Long-answer quality still depends on the page context Braino received,
              and system voice fallback estimates word timing instead of receiving timestamps.
            </p>
          </aside>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-iomi-response-surfaces.md</p>
        </footer>
      </article>
    </main>
  );
}
