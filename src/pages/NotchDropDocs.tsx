import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function NotchDropDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 063</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>Notch</span><span>MVP</span></div>
          <h1>Drag it to the notch.<br /><em>Keep it, or send it.</em></h1>
          <p>Pick up a file anywhere on your Mac and the notch already knows. It opens into two places to drop it.</p>
          <time dateTime="2026-10-01">Published October 1, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Start dragging a photo, a PDF, anything. Before you get there, the notch grows into two zones, Tray on the left and AirDrop on the right. Whichever one you're over lights up.</p>
          <p>Drop it on AirDrop and Apple's AirDrop opens so you can pick the phone or Mac to send it to. The notch shows what's actually happening: sending, then a tick when it's sent, or a cross and the reason when it isn't.</p>
          <p>Drop it on Tray and it flies in and waits there as a little picture. Drag it back out into Finder, Mail or wherever it needs to go. Ask Braino about "this file" and he knows which one you mean.</p>
          <p>The island stays one size the whole time. Only what's inside it changes. The first time it's on, it says hello.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>You still choose the device in Apple's AirDrop window. No app can choose it for you. The notch only knows a drag has started, never what's on your screen. It's behind a switch until launch, and it hasn't been tried on real hardware yet, so AirDrop's real-world timing is still to be seen.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/notch-drop.md</p>
        </footer>
      </article>
    </main>
  );
}
