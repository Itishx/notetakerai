import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function LayaJobDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 077</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Laya</span><span>MVP</span></div><h1>Laya names the job.<br /><em>HIL still decides.</em></h1><p>A small model on your Mac makes a first guess in a blink, so the big one starts in the right place.</p><time dateTime="2026-10-04">Published October 4, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Before Braino thinks hard about what you said, Laya sorts it on your Mac in under a tenth of a second: is this a chat, one job, a many-step job, or something he should not act on, and which job is it.</p><p>That guess keeps questions out of the planner, stops Braino asking you to repeat a clear command, and goes to HIL as a hint. HIL still picks what to do, and anything that sends, buys or posts still asks you first.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Laya is right 89 times in 100 on how people talk to Braino today, and about 80 on older, harder tests. Naming the job is right about 78 times in 100, which is why it is only a hint. Say &ldquo;decider stage off&rdquo; and everything works as it did before.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/laya-names-the-job.md</p></footer>
  </article></main>;
}
