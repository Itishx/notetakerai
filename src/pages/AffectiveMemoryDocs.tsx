import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function AffectiveMemoryDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Technical 045</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>AffectiveOS</span><span>Memory</span><span>MVP</span></div>
          <h1>Your Mac,<br /><em>written down.</em></h1>
          <p>The first piece of AffectiveOS's memory: a quiet, private log of what you do on your Mac, and a window to see it.</p>
          <time dateTime="2026-09-27">Published September 24, 2026. Updated September 29, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Memory isn't Braino's. It belongs to the layer underneath, the part that should remember your day whether or not you ever talk to him.</p>
          <p>So that's where it starts. While you work, AffectiveOS notes which app you're in, the text on your screen when it changes, what's playing, your conversations with Claude, and everything you say to Braino. All as text, all on your Mac.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">You see it first</p>
          <h2>Your day, as a map. Or in words.</h2>
          <p>Say "open memory" and pick a day. The old window was hard to read, so now there are two views.</p>
          <p><strong>Map.</strong> Two halves, you in the middle. On the left, today, sorted by what you were doing: building, study, messages, social, watching and listening, errands, talking to Braino. Each group shows its time, with its apps and sites around it. A website counts as itself, so Netflix is watching and GitHub is building. On the right, what it knows about you, sorted into who you are, your work, your people, what you like, and what's coming up. The hours sit in a strip along the bottom. Tap one to see that hour. There's a Mind switch too, if you like the dark Braino OS look.</p>
          <p><strong>Tap a dot, walk the web.</strong> Tapping splits the window: the map stays on the left, and on the right that memory sits in the middle and what it's connected to around it. Chrome sits next to GitHub, Porter, and Mom's message, because they happened in the same hours. Tap one to walk there, and the map follows. A trail at the top takes you back. Below, every connection is grouped by kind, with a line saying how it's linked, like "Together at 2 PM and 4 PM".</p>
          <p><strong>Read.</strong> The same day in words. Ask it something at the top. Then your day at a glance, what Braino knows about you (what it learned today first, in plain sentences like "You live in Bengaluru"), where your time went, hour by hour, and your controls: let Braino use it or not, pause remembering, delete the day. The raw record is folded away at the bottom if you want it.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>Screenshots are read and deleted straight away, and private apps are skipped, but it still sees a lot. That's why you can pause it with one sentence. WhatsApp message text is never copied into it, only that someone wrote. When the notch shows you a message from someone important, Braino holds that same short preview for two hours, never on disk, so "what did she text me?" gets an answer. Everything stays on this Mac for 7 days, and facts kept for good stay until you delete them. The map shows one day at a time, and it hasn't been tried on a really busy day yet. The raw list stops at 400 rows. This is all in the Braino Mac app build, not out yet.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/affectiveos-memory-capture.md</p>
        </footer>
      </article>
    </main>
  );
}
