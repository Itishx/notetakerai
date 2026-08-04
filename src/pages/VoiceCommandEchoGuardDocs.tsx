import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function VoiceCommandEchoGuardDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 009</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Voice safety</span><span>MVP</span></div>
          <h1>His voice cannot become<br /><em>your command.</em></h1>
          <p>Braino now separates a real instruction from music, speaker bleed, and the echo of his own reply.</p>
          <time dateTime="2026-07-30">Published July 30, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Keeping the microphone open makes Braino feel continuous. It also creates one dangerous edge: a speaker can sound like a person giving him a command.</p>
          <p>During music, or just after Braino replies in an open voice conversation, action phrases only run when you address Braino by name. Startup greetings never block your first command. Conversation stays natural. External actions get the stronger proof they deserve.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The simple rule</p>
          <h2>“Send an email” waits.<br />“Braino, send an email” acts.</h2>
          <p>Answers to a workflow Braino already started still work without repeating his name.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>This is a safety gate, not speaker recognition. A real command during the protected window needs Braino’s name.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/voice-command-echo-guard.md</p>
        </footer>
      </article>
    </main>
  );
}
