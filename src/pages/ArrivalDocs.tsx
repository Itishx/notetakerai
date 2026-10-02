import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ArrivalDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 057</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino for Mac</span><span>AffectiveOS</span><span>MVP</span></div>
          <h1>"Morning, Itish."<br /><em>Not a login.</em></h1>
          <p>Come back to your Mac and the notch greets you like someone who knows you.</p>
          <time dateTime="2026-09-27">Published September 27, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">You unlock your Mac. The notch widens and says "Looking for you" while the camera checks someone is there. Then Touch ID, the way you unlock anything. Nothing personal shows until it passes.</p>
          <p>Then "Morning, Itish." with a green tick and one line: "3 things waiting for you." or "Nothing waiting. Clean start." The notch grows into a short summary. Who messaged you on WhatsApp while you were away, your next Mesa class today, and what's due soon. Real things only. If nothing's waiting, it says so.</p>
          <p>Then the notch folds back, Braino jumps out of it and says "Good morning, Itish." out loud. Just once. If you're mid conversation or he already said it, he stays quiet.</p>
          <p>It shows on the first unlock of the day, or when you've been away half an hour or more. Cancel Touch ID and it says "Okay. Another time." and goes. Press Esc to skip the whole thing.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty"><strong>Honest limitation</strong><p>It doesn't replace the Mac lock screen. Apple doesn't allow that, so it runs right after you unlock. The Touch ID prompt is Apple's own window, not the notch. The camera only checks that a face is there, it doesn't recognise you. Touch ID is the real check. The camera frame stays on your Mac and is never saved or sent anywhere. The summary only reads WhatsApp, Mesa classes and assignments for now. Reminders and Mac notifications aren't in it yet, because Apple keeps notifications private to each app. It's built into the Braino Mac app, but not tested on real hardware yet.</p></aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/arrival.md</p>
        </footer>
      </article>
    </main>
  );
}
