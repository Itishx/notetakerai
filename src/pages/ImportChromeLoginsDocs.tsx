import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function ImportChromeLoginsDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 090</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Own browser</span><span>MVP</span></div><h1>Your logins.<br /><em>His browser.</em></h1><p>Say &ldquo;import my Chrome logins&rdquo; and Braino&rsquo;s browser is signed in everywhere you are.</p><time dateTime="2026-10-23">Published October 23, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Braino does jobs for you in his own browser, so he never takes over your tabs or your mouse. The problem was that his browser started signed out of everything, so every job began at a login page.</p><p>Now you type your Mac password once and he copies your Chrome sessions into his browser. Your Chrome stays exactly as it was. It&rsquo;s a copy, not a move.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Three things to say</p><h2>Import. Sync.<br />Forget.</h2><p>&ldquo;Import my Chrome logins&rdquo; the first time. &ldquo;Sync my logins&rdquo; when something has signed him out. &ldquo;Forget my logins&rdquo; signs his browser out of everything. It all stays on your Mac.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>It&rsquo;s a snapshot, so sessions run out and need a re-sync. Google and banks sometimes notice a new browser and ask you to sign in again. Passwords aren&rsquo;t copied, only sessions. It works with Chrome only for now, using the profile you used last.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/import-chrome-logins.md</p></footer>
  </article></main>;
}
