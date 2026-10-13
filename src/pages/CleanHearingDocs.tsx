import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function CleanHearingDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 076</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Voice</span><span>MVP</span></div><h1>He only writes down<br /><em>what you said.</em></h1><p>No more words made out of music, fans, or his own voice.</p><time dateTime="2026-10-04">Published October 4, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Braino used to hear things nobody said. His own voice came back through the speakers, a song turned into a sentence, and a quiet room became &ldquo;Open the door&rdquo;. Some of those ran as commands.</p><p>Now the mic rests while he talks. If the mic never heard a voice, or the transcriber was not sure what it heard, the words are dropped instead of guessed. Say &ldquo;stop&rdquo; and he still stops.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>While he talks, only &ldquo;stop&rdquo; and words like it cut him off. Loud music can still sound like a voice. It is on by default, and you can turn it off in the app under Calling him.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/clean-hearing.md</p></footer>
  </article></main>;
}
