import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MacNotchListeningStatesDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 038</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>The notch</span><span>MVP</span></div>
          <h1>You always know<br /><em>if he can hear you.</em></h1>
          <p>The notch now shows every step of listening: waking up, ready, hearing you, working, and asleep until you say his name.</p>
          <time dateTime="2026-09-17">Published September 17, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Voice takes a few seconds to come up. Nothing used to say so, so you started talking into a microphone that was not open yet.</p>
          <p>Now the notch counts it down. <strong>Live in 3, 2, 1.</strong> Then, only once it is actually live, <strong>You can speak now.</strong> What you say stays on screen while he works on it, with one small word beside it: Thinking.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Listening for his name</p>
          <h2>“Say Hey Braino to wake me.”</h2>
          <p>That is what the notch reads while he hears the room and stays out of it. Say his name and the outline of the notch lights up, the same light you see when he boots. Then you have five seconds, counted from the moment you can talk.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Stopping</p>
          <h2>“Braino, stop the task.”</h2>
          <p>He stops right away and tells you he did. No waiting for him to think about what stop means.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>The countdown is an estimate from your Mac's recent sessions. If voice is slower than usual it says “Almost there” rather than pretending. A bare “stop” needs his name on it, because people say that to each other.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/mac-notch-listening-states.md</p>
        </footer>
      </article>
    </main>
  );
}
