import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function MeetingRecorderDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Feature 028</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Mac and browser</span><span>Meetings</span><span>MVP</span></div>
          <h1>Record this meeting.<br /><em>He knows who said it.</em></h1>
          <p>Say one sentence. Braino hears the call and he hears you, keeps the two apart, and writes notes with names on them.</p>
          <time dateTime="2026-08-10">Published August 10, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Meeting notes are only useful if you can act on them. "Someone said they would send the deck by Friday" is not a fact you can do anything with. "Marcus said he would send the deck by Friday" is.</p>
          <p>Getting there meant fixing the recording first. There is no clever prompt that recovers audio which was never saved, or a speaker split that was thrown away before the recorder started.</p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The one idea</p>
          <h2>Two streams,<br />never mixed.</h2>
          <p>The call arrives on your speakers. You leave on your microphone. Which side a voice came in on is the only speaker attribution in the whole system that cannot be wrong.</p>
          <p>Braino used to sum both into a single track before recording, throwing that away one line before it started, and then paying a model to guess it back. Now they stay apart, so he only has to work out who is who at the far end, and you are identified by physics.</p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">How to use it</p>
          <h2>Say it out loud.</h2>
          <p><strong>Braino, record this meeting for me.</strong></p>
          <p>A Zoom call, a Google Meet tab, a Teams call, or four people around a table. Say "stop recording" when you are done and the notes land on your dashboard, with action items and any follow-up worth putting on your calendar.</p>
          <p>He stays invisible if you share your screen.</p>
        </section>

        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">Where names come from</p>
          <h2>Not from the audio.</h2>
          <p>Speaker separation tells you how many people are talking and when they swap. It never tells you their names. So Braino takes names from everywhere else: the Meet page in your browser, the Zoom or Teams window through macOS accessibility, the guest list on your calendar invite, and the moment somebody says "hi, I'm Priya".</p>
          <p>The invite matters more than it sounds. Knowing the names in advance is also what stops "Sowmya" arriving as "so my", and a name the transcriber mangles is a name nothing downstream can recover.</p>
        </section>

        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>Honest limitations</strong>
            <p>Names depend on evidence from outside the audio. In a Meet tab or a native Zoom window there is plenty of it. In a plain audio call with no invite there is none, and speakers stay as "Speaker 1" and "Speaker 2". That is on purpose. With one unknown voice and one silent invitee, Braino will name them. With two of either it is a coin flip, and a guessed name on an action item does more harm than an honest label.</p>
            <p>The browser cannot start recording from a voice command alone, because Chrome requires a real click before it hands over tab audio. The Mac has no such rule, which is why the Mac is the better recorder. And the first time you record on the Mac, Braino gives himself permission to hear system audio and asks you to restart once. He says so out loud rather than quietly recording half the meeting.</p>
          </aside>
          <p>Speaker identity is worked out from the evidence available during each stretch of the meeting rather than carried by voice across the whole thing. Voiceprint continuity is the next step.</p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/features/meeting-recorder.md</p>
        </footer>
      </article>
    </main>
  );
}
