import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function MeetBrainoDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 079</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Setup</span><span>MVP</span></div><h1>Meet Braino.<br /><em>He sets himself up with you.</em></h1><p>Sign in once, and Braino walks you through the rest, from the notch and a window that move together.</p><time dateTime="2026-10-10">Published October 10, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Setup used to be a form. Now it is a first meeting. He says hi from the notch at the top of your screen, so you know where he lives. Then he asks what to call you, what your days look like, and what to take off your plate.</p><p>The window shows what to tap. The notch says the same thing, in his voice. They move as one.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Permissions</p><h2>Four quick yeses.<br />Each one turns green.</h2><p>Tap Allow and your Mac asks you. Say yes, and the row goes green while he tells you what it lets him do. &ldquo;Now I can hear you.&rdquo; Then you try him, out loud, before you finish.</p></section>
    <section className="kb-article-block"><p>When you are done, Braino opens on a clean white home page with your real numbers: what you asked today and this week, how often it worked, how fast he is, how much he knows about you, and your streak.</p><aside className="kb-honesty"><strong>The honest bit</strong><p>This is not tested end to end on a fresh Mac yet, and there is no downloadable app yet, so permission prompts still say &ldquo;Electron&rdquo;. Screen Recording and Contacts still open System Settings instead of asking in the app.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/meet-braino-setup.md</p></footer>
  </article></main>;
}
