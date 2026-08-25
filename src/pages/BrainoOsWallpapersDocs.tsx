import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function BrainoOsWallpapersDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 037</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Feature</span><span>MVP</span></div>
          <h1>Eleven wallpapers.<br /><em>None of them photographs.</em></h1>
          <p>Say &quot;Braino, change my wallpaper&quot; and he puts one of his own on your desktop. The same eleven pictures are what he shows when you walk away, because that is the point.</p>
          <time dateTime="2026-08-26">Published August 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Every one of these is a stack of gradients, a film of grain and a vignette. Nothing is downloaded. That buys three things a photograph cannot: it is drawn at your display&apos;s own size when you ask for it, so nothing is ever upscaled and nothing is ever soft; the whole set is one nine kilobyte file; and a colour, a face or a line of text is one edit away on both surfaces at once.</p>
          <p>From a pale Aurora to a near black Obsidian, by way of Sequoia, Ember, Tide and Graphite, and one called Signature that is nothing but his name set in an editorial italic. Each look carries its own clock face as well as its own colours: Instrument Serif on most, Newsreader italic on Dusk, JetBrains Mono on Mind, and SF Pro Display at three hundred weight on Graphite, because that one is Apple&apos;s own monochrome and wants their face.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The idea we took from Apple</p>
          <h2>The screensaver and the wallpaper<br />are the same picture.</h2>
          <p>Their aerials slow down and become the still desktop picture when you log in, and that is the good idea. So there is no second set to choose from here and no mismatch between what the Mac shows when you walk away and what it shows when you sit back down. Shuffle goes through everything; Dynamic follows the hour the way their dynamic wallpaper follows the sun, Ember at dawn and Obsidian at night. The one thing we did not take: Apple never puts a word on a wallpaper, so Braino OS is signed on these the size of a signature on a print.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>What it does not do yet</strong><p>Your own pictures are not in the set: everything here is his. Setting a desktop picture needs macOS Automation permission for System Events, and without it he draws the file, cannot hang it, and says so. And the Mac keeps its own copy of these settings while the website keeps another, so the two are not yet one list.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/wallpapers">See the whole set <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/braino-os-wallpapers.md</p>
        </footer>
      </article>
    </main>
  );
}
