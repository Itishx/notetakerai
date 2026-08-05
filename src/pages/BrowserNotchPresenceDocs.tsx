import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function BrowserNotchPresenceDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 013</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Chrome</span><span>Browser notch</span><span>v1.0.0</span></div>
          <h1>The notch holds the state.<br /><em>Braino holds the moment.</em></h1>
          <p>A focused browser experiment where the notch handles the question, live status, and answer without another floating interface.</p>
          <time dateTime="2026-08-05">Released August 5, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino should feel alive without making every webpage feel occupied.</p>
          <p>This study removes the detached liquid conversation window. Speak and the notch becomes the listening animation. Submit and it contracts into calm live task status. A short answer opens a compact tray; a long answer pours downward into a scrollable liquid sheet anchored to the same notch.</p>
          <p>The compact state cycles through Hatching, Calibrating, and Thinking. Click it and the notch opens into full-sentence progress: what Braino is reading, changing, and preparing next. These are useful activity summaries, not private chain-of-thought.</p>
          <p>Braino stays visible inside idle, listening, and working. Listening sends sonar outward from him; working places him beside the live status instead of replacing him with a number. Long answers only grow as tall as their content, and the walker above follow-up uses the production extension gait.</p>
          <p>A small theme switch lets us judge the same expanded states in two materials. Readable uses the warm light surface; Liquid uses the extension’s translucent dark glass across input, modes, expanded thinking, short answers, and long answers. The structure does not jump when the material changes, and Braino’s coral face states stay coral.</p>
          <p>Version 1.0.0 brings that system into the Chrome extension. Space twice forms the notch with a perimeter shimmer, fills Braino’s coral material, authenticates with closed eyes, flashes a green verdict, and opens his eyes before settling into idle. The same mounted surface then handles text, voice, progress, themes, and answers.</p>
          <p>The detached ambient mascot is removed so the notch can be judged on its own. Inside a long answer, the full standing Braino gets one small walker lane above follow-up input. When the answer is dismissed, the notch shrinks instead of leaving another interface open. The same interaction rule is intended for Chrome and Mac/IOMI.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The rule</p>
          <h2>Ask.<br />Think.<br />Answer.</h2>
          <p>One continuous transformation inside the notch, with Braino still visible outside it as the familiar entry point.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>What is still staged</strong><p>The InstaGraphics page uses sample copy and a fictional webpage. The Chrome extension now owns the real lifecycle, while specialist recording and cinema surfaces still keep parts of their older internal UI.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <a href="/braino.zip" download>Download Braino v1.0.0 <ArrowRight aria-hidden="true" /></a>
          <Link to="/instagraphics?design=chrome-system">Open the full-browser prototype <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/browser-notch-presence.md</p>
        </footer>
      </article>
    </main>
  );
}
