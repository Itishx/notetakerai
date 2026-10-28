import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MavenFilmDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Product 094</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Maven</span><span>Launch film</span><span>MVP</span></div><h1>You talk faster<br /><em>than you type.</em></h1><p>The Maven launch film. Words in the middle, one line at a time, and the real Maven pill in between.</p><time dateTime="2026-10-28">Published October 28, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">The film tells you what Maven does in plain words a 14 year old would get. Hold a key, talk, your words appear, already clean. It works anywhere you type, it gets Hinglish, it learns names, and it can send the message for you.</p><p>Between the lines there are no screenshots, no app windows and no fake text. Only the Maven pill, doing exactly what it does on your Mac: waking up, listening with the warm light, going green when it's done, tilting when it's curious, and growing into the Do bar to send a message.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">How to watch it</p><h2>Open /maven-teaser.<br />Press play.</h2><p>It is a clone of the /dontblink film: same engine, same cuts, same music sync. Space plays and pauses, the arrow keys step one frame, the download button records it.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The Rahul message in the Do bar is our example, not a recording from the app.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/maven-launch-film.md</p></footer>
  </article></main>;
}
