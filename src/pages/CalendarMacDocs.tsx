import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function CalendarMacDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 082</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Google Calendar</span><span>MVP</span></div><h1>Meetings in two seconds.<br /><em>Not one minute of clicking.</em></h1><p>&ldquo;Create an instant Google Meet&rdquo; is now one call to your calendar, with the link copied for you.</p><time dateTime="2026-10-11">Published October 11, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Braino used to open Calendar&rsquo;s website and click around to book a meeting. It was slow and it failed. Now he talks to Google Calendar directly: book a Meet now or later, see what&rsquo;s on, move it, cancel it, or jump into your next call.</p><p>Not connected yet? He says so once and opens the Google sign in.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>A meeting &ldquo;with Riya&rdquo; is a little slower, because he doesn&rsquo;t know her email yet. Not tested live end to end on the Mac yet.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/calendar-on-mac-and-integrations.md</p></footer>
  </article></main>;
}
