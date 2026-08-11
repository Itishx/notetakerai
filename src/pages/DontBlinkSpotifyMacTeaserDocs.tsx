import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function DontBlinkSpotifyMacTeaserDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 020</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino website</span><span>Don’t Blink film</span><span>MVP</span></div><h1>Spotify changes.<br /><em>Then Braino.</em></h1><p>One sharp Spotify promise, paced to breathe, followed by the character responsible for it.</p><time dateTime="2026-08-07">Published August 7, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">“Say the song. Watch it play. That’s Braino.”</p><p>That is the entire film. A voice command becomes Spotify playback, Braino’s name lands, and the mascot replaces it on the match cut.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The ending</p><h2>Name.<br />Flash.<br />Character.</h2><p>No URL card or second explanation follows. The mascot is the final answer.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The Spotify graphic is a campaign visual, not a live control. Autoplay can hold audio until the first interaction while motion continues.</p></aside><p><Link to="/spotify-mac-teaser">Watch the teaser <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/dont-blink-spotify-mac-teaser.md</p></footer>
  </article></main>;
}
