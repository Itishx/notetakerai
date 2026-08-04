import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function HilLoopDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 014</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino website</span><span>Human Intelligence</span><span>MVP</span></div>
          <h1>He does not just think.<br /><em>He works the plan.</em></h1>
          <p>HIL Version 1: Braino splits a command into jobs, takes one small step at a time, checks each one, and stops dead before anything that cannot be undone.</p>
          <time dateTime="2026-08-01">Published August 1, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">The Human Intelligence page could already show one pass of Braino's thinking. The new Loop tab actually walks it: a pretend browser, pretend Gmail, a pretend shop, and a real brain deciding one step per turn, with the result of each step folded back in before the next one is chosen.</p>
          <p>Say two things in one breath, email Sam and then play a song, and he counts two jobs, finishes the first completely, then starts the second. When a step needs something only you know, he asks right there, mid-run, not as an interrogation up front.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The gate</p>
          <h2>&ldquo;Check out&rdquo; in your command<br />still waits for your click.</h2>
          <p>Send, pay, delete, publish: anything irreversible pauses the run on an amber card and will not fire without you. Clarity of intent and reversibility of consequence are different things, and the gate is code, not a polite instruction.</p>
        </section>
        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Break his world</p>
          <h2>Close his tab mid-run. Watch him notice.</h2>
          <p>Two sabotage buttons live next to the run: close his tab, or jam the site he is on. A person whose Chrome tab closes does not fire the next click into nothing; they reopen the tab and continue. So does he, and he says so while he does it. Same failure twice for the same reason, and he stops instead of looping, telling you exactly what broke and how far he got.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>The world is a stage prop: no real tab opens, no real email exists, nothing real can be touched. And the loop is not wired into the real extension yet; that port happens only after the thinking holds up here.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/hil-version-1-loop.md</p>
        </footer>
      </article>
    </main>
  );
}
