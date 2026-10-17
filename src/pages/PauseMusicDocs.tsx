import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function PauseMusicDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 083</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Voice</span><span>MVP</span></div><h1>The music pauses<br /><em>while you talk.</em></h1><p>And comes back the moment he has understood you.</p><time dateTime="2026-10-15">Published October 15, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Say &ldquo;Hey Braino&rdquo; with a song or a video playing and it pauses, so he hears you and not the speakers. As soon as he has understood what you asked, it starts again, and he gets on with the job in the background.</p><p>It works with Spotify, Apple Music and anything playing in Chrome. If you asked about the music itself, like &ldquo;next song&rdquo; or &ldquo;pause&rdquo;, he leaves it the way you asked. Turn it on in the app under Calling him.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>It is off by default for now. Safari and other players are not paused yet, and Chrome needs &ldquo;Allow JavaScript from Apple Events&rdquo; turned on. If you say nothing for eight seconds, the music comes back.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/pause-music-while-you-talk.md</p></footer>
  </article></main>;
}
