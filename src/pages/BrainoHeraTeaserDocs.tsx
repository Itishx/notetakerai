import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function BrainoHeraTeaserDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design 025</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Motion</span><span>BrainoHERA</span><span>MVP</span></div>
          <h1>Talk.<br /><em>It types.</em></h1>
          <p>A black-and-green Don’t Blink cut for the voice layer that keeps working when the internet does not.</p>
          <time dateTime="2026-08-09">Published August 9, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The film opens by interrupting the scroll, not teaching dictation from zero.</p>
          <p>The composition stays fast through shorter holds, but chunk assembly is protected: every split half gets at least 170ms. Normal chunks use no brightness, glow or glitter animation.</p>
          <p>The final cut is a founder story, not a feature list. Itish built Braino by talking through notes, prompts and 2am ideas; that truth creates the turn: “Why is talking someone else’s job?” After the offline proof, “The words that built Braino… now Braino types them” becomes the emotional payoff, and “She’s not a flow. She’s family” earns HERA’s sharp letter-by-letter slash-cut reveal, with no bounce or scale movement.</p>
          <p>“And one night”, “it hit me”, and “wait” stay in the normal kinetic grammar. The four-line thought after them uses one renderer throughout. Each whole word snaps in at a fast but visible 190ms cadence, while a compressed 36px row pitch makes the lines nearly touch. Victory Lap goes completely silent for this thought and returns on “So I taught him.”</p>
          <p>The notch restores the original offline proof: “On a plane? Still types. Wifi died? Still types. Middle of nowhere? Beautiful. Still types.” It builds downward across four visibly chunked lines, with enough time for the final line to finish cleanly.</p>
          <p>“But now it lives in your notch” now cuts directly to the notch demonstration. Only after the proof does “and yeah… it's prettier” appear, followed by a standalone “We know.” match cut.</p>
          <p>The comparison now ends on the tighter “Same speed, same magic.” The redundant “you're used to” line is removed.</p>
          <p>Every kinetic frame contains no more than three words. The opening stays whole and fades in quietly; after that, scripted words construct from two fused halves in the flagship Don’t Blink grammar. Victory Lap enters from 00:13, with visual cards snapped to detected pulses while readable holds remain intact.</p>
          <p>The entire film uses a black base with HERA-green typography. Roughly every four seconds, a Victory Lap pulse flips it briefly to a green match-cut frame with black type. The Mac notch remains black as part of the same system rather than appearing as a separate campaign color.</p>
          <p>The proof keeps the real 520 × 168 notch proportions in the exact center of a pure black frame and zooms outward from that midpoint to 1.5×. Its SF Pro transcript builds each word from two fused halves at a substantially slower pace. Immediate caret-lock prevents smooth-scroll lag from clipping later chunks, and the 7.2-second scene leaves a measured completed-text hold before fading.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The name</p>
          <h2>BrainoFlow.<br />Wait.</h2>
          <p>The obvious working name lands and feels wrong. Only HERA follows: four larger letters with a static silver-to-green metal face and one hard downward stamp per letter. There is no looping shimmer, glitter or bounce.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>The honest part</strong>
            <p>The offline and nothing-uploaded claims describe BrainoHERA’s on-device English lane. Hindi and mixed Hinglish still use Braino’s transcription-only cloud lane and should not be represented by the privacy proof.</p>
          </aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/brainohera-teaser">Watch BrainoHERA <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/brainohera-dont-blink-teaser.md</p>
        </footer>
      </article>
    </main>
  );
}
