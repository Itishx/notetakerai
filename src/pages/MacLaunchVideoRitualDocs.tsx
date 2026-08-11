import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacLaunchVideoRitualDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 026</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Launch ritual</span><span>MVP</span></div>
          <h1>Braino has the file.<br /><em>Of course he plays it.</em></h1>
          <p>Double Shift, one introduction from wherever Braino is standing, and the real launch master playing on the Mac while the notch carries every word.</p>
          <time dateTime="2026-08-09">Published August 9, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino does not disappear into the notch to deliver the introduction. If he is already standing on the desktop, he stays exactly there. His mouth follows the real audio while every line appears in the notch's answer surface. Longer lines expand instead of being cut after two rows.</p>
          <p>The whole introduction is generated as one continuous voice track, so there is no network pause between sentences. Captions run from that audio's loaded duration and account for word length and punctuation, keeping each visible line with the voice. After “Let's fucking go,” the answer closes and QuickTime opens the local launch video in fullscreen. Braino walks home into the notch, where a compact black island holds “Now Playing · Launch Vid.MP4” until you stop the film.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The important bit</p>
          <h2>Not a mock player.<br />The real Mac file.</h2>
          <p>The ritual resolves `Launch Vid.MP4` from Downloads or the Desktop, opens it in QuickTime and starts the front document. If the file is missing, Braino says so instead of substituting another video.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>A recording ritual for now</strong><p>Bare double Shift starts the sequence; using Shift to type or inside a shortcut does not. Press double Shift again at any point to cancel speech, close the QuickTime document, clear the frozen pose and restore Braino's previous state. Double Space keeps its normal behavior. QuickTime may need macOS Automation approval once.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-launch-video-ritual.md</p>
        </footer>
      </article>
    </main>
  );
}
