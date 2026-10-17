import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function OptionMRecordingDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 084</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Recording</span><span>MVP</span></div><h1>One key to record<br /><em>a lecture or a meeting.</em></h1><p>Option+N to start. Option+N to stop. The notes write themselves.</p><time dateTime="2026-10-15">Published October 15, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Press Option+N and the notch asks one thing: lecture or meeting? Tap it and Braino starts recording, with a small REC and a clock in the notch so you always know.</p><p>Press Option+N again when you are done. He writes it up, lecture notes or meeting notes, and saves it on your Mac and in your account.</p><p>In a hurry for class? Cmd+Shift+E skips the question and starts a lecture straight away. Same recorder, same notes, same place they open.</p><p>The words you see while it records come from the same ear Braino always uses. In Settings, under Appearance, Listening lets you pick On this Mac or Sarvam, and every recording, dictation and chat follows it.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>You need to be signed in for the full transcript. If a part of the audio cannot be transcribed, Braino keeps going and notes how much was missed, but he does not try that part again yet.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/option-n-recording.md</p></footer>
  </article></main>;
}
