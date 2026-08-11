import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

const FACTS = [
  "Opening words are captured immediately",
  "One ordered PCM stream preserves chronology",
  "A black transcript sheet grows downward",
  "Stop never waits for AI formatting",
  "Double Option starts and stops it",
  "Raw words win whenever formatting is uncertain",
];

export default function YapModeDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Mode 022</span>
      </header>

      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>BrainoHERA</span><span>MVP</span></div>
          <h1>Talk where you are.<br /><em>Your words do not get lost.</em></h1>
          <p>
            BrainoHERA is Braino&apos;s quiet system-wide dictation lane: faithful speech
            becomes text at the active caret, with a safe Notch fallback when no field
            can receive it.
          </p>
          <time dateTime="2026-08-08">Published August 8, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">
            Put the caret in Mail, Notes, Notion, a chat box, or an editor. Double
            Option and speak. Braino opens a transcription-only connection and keeps
            every finished phrase in order without touching the field yet.
          </p>
          <p>
            The black Notch sheet grows downward as phrases arrive, without stretching
            sideways or colliding with its BrainoHERA label. Double Option again stops
            capture immediately and inserts the complete session once at the current
            caret. Spoken words never
            become invisible control phrases. Say “done” and Braino types “done.”
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The contract</p>
          <h2>Transcribe first. Insert safely. Recover always.</h2>
          <div className="kb-fact-grid">
            {FACTS.map((fact) => (
              <div className="kb-fact" key={fact}><Check aria-hidden="true" /><span>{fact}</span></div>
            ))}
          </div>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">When there is no text box</p>
          <h2>Braino does not guess<br />where private speech belongs.</h2>
          <p>
            The full transcript opens in the Notch and stays on the clipboard. You can
            move to the right place and paste it yourself. A failed app never gets to
            erase a successful transcription.
          </p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Technical shape</p>
          <h2>One listening lane. One guarded formatting pass.</h2>
          <p>
            The Mac app uses an authenticated `gpt-live-transcribe`
            transcription-only WebRTC session with microphone-aware noise reduction
            and adaptive local voice detection. Protected local capture begins as soon
            as double Option lands, in parallel with the slower Accessibility check.
            The WebRTC sender stays trackless until that privacy gate approves a
            non-secure target; only then does Braino flush up to 30 seconds of opening
            audio. Opening and live microphone frames then stay on one ordered PCM data
            channel, so later speech cannot overtake the first sentence. It explicitly
            commits each pause because this transcription model rejects server turn
            detection, and skips empty, sub-100-ms, or silence-only commits. If a short
            phrase stops before a cold connection is ready, Braino freezes its protected
            local buffer and finishes that transcription instead of cancelling it.
            Realtime item IDs preserve turn order until the stop gesture. The final
            event gets a 1.2-second deadline; if it is late, Braino uses the complete
            ordered transcript deltas already on screen. macOS
            Accessibility proves which field owns the caret while a separate lossless
            formatter is prefetched during speech and adds only punctuation, casing,
            paragraph breaks, and unambiguous
            notation such as “five p m” becoming “5 p.m.” A local ordered-word check
            rejects deletion, invention, summary, or clause movement. A timeout or failed
            check uses the raw transcript. Then a real paste event handles broad editor
            support, and a non-content field fingerprint checks whether the value or caret
            actually changed. Selected-text Accessibility insertion is the second path
            when a verifiable paste did nothing.
          </p>
          <aside className="kb-honesty">
            <strong>The honest limitation</strong>
            <p>
              This is a cloud-transcription MVP, not a promise of perfect words in every
              room or app. Password fields stay blocked. A personal dictionary,
              Backtrack-style editing, history, and app-specific formatting still come
              later. The formatter cannot repair a name the speech model heard as a
              different name. A formatter result that is not ready by Stop is skipped;
              Braino inserts the raw streamed transcript without waiting for the network.
              macOS still needs a small hardware-dependent moment to return the microphone
              stream, and the Mac mic/cross-app matrix needs its final live pass.
            </p>
          </aside>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The product decision</p>
          <h2>Faithful dictation is not hidden rewriting.</h2>
          <p>
            BrainoHERA may add careful punctuation, capitalization, paragraph breaks, and
            obvious written forms for times or numbers. It does not summarize, answer,
            reorder, polish, or quietly change the meaning. Those remain separate actions,
            chosen by the person speaking.
          </p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/yap-mode">Open the BrainoHERA page <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/yap-mode.md</p>
        </footer>
      </article>
    </main>
  );
}
