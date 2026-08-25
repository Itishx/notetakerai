import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacIdleScreenDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 036</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Feature</span><span>MVP</span></div>
          <h1>A Mac left alone shows you a mountain.<br /><em>This one shows you the time.</em></h1>
          <p>Shift twice, or walk away for five minutes, and Braino puts his own screen up: the date, a clock big enough to read across a room, and a row of round buttons for the few things you actually reach for.</p>
          <time dateTime="2026-08-26">Published August 26, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The empty screen is the most valuable surface a machine has, because it is the only time nobody is using it for anything else. So this one has a clock you can read from the doorway and four things Braino does without being asked twice underneath it: Speak, Ask, Play, Braino OS. Add up to eight in total, each one any link you want, and it shows up with that site&apos;s own icon.</p>
          <p>Nothing on it is a photograph. Layered gradients that scale to any display, a film of grain so it reads as a surface rather than a screenshot of a gradient, a vignette holding the middle. Five looks, from a pale aurora to something almost black. The reference is the iPhone lock screen, and the one thing we did not copy is where the clock sits: the phone puts it in the upper third, which strands it on something three times as wide, so it is centred here.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The important bit</p>
          <h2>It is in the way on purpose.<br />Never for longer than a keystroke.</h2>
          <p>Any key, any click, or simply moving the mouse takes it away, and Escape is claimed globally for exactly as long as the screen is up. Only the screen that came up by itself goes away by itself: if you asked for it, moving the mouse is not a request to close it. And it never covers work in progress, so it stands down while Braino OS is up, while dictation is running, while a meeting is being recorded, and while the teleprompter is presenting.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>What it is not yet</strong><p>There is no second window and no network call: the screen is drawn into the transparent full-display window the notch already lives in, so it works with the wifi off. Its settings live on the machine, and the website dashboard still edits its own copy, so the two lists are not yet the same list. The launch film, which used to be Shift twice, moved to Command Shift L.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-idle-screen.md</p>
        </footer>
      </article>
    </main>
  );
}
