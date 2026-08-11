import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import SiteFooter from "@/components/SiteFooter";
import "../styles/apple.css";
import "./meetings.css";

const HONEST = [
  ["It will not guess a name.", "One unknown voice and one silent invitee, he names them. Two of either, he leaves it alone."],
  ["It is not secret from the room.", "Invisible to your screen share is about your notes. Tell people you are recording."],
  ["It will not start on its own.", "You ask. He tells you which sides he actually heard."],
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".mt-reveal");
    if (!elements?.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in")),
      { threshold: 0.14 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Meetings() {
  const revealRef = useReveal();

  return (
    <div className="apple mt" ref={revealRef}>
      <IomiNotch />

      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Braino <span className="mt-shimmer">Meetings</span></span>
          <div className="an-links">
            <a href="#quiet">Quiet</a>
            <a href="#share">Screen share</a>
            <a href="#hears">How he hears</a>
            <Link to="/waitlist" className="mt-join">Join</Link>
          </div>
        </div>
      </nav>

      <header className="mt-landing">
        <p className="mt-landing-eyebrow"><span aria-hidden="true" /> Braino for meetings</p>
        <h1 className="mt-landing-desc">Say it once.<br />He has the whole meeting.</h1>
        <p className="mt-landing-name">Braino <span className="mt-shimmer">Meetings</span>.</p>
      </header>

      {/* Shown, not described: the participant list is the argument. */}
      <section className="mt-section mt-split" id="quiet">
        <div className="mt-split-copy">
          <p className="mt-kicker mt-reveal">Nothing joins</p>
          <h2 className="mt-h2 mt-reveal">No bot in<br />the room.</h2>
          <p className="mt-p mt-reveal">Nobody has to admit a notetaker. Braino listens from your Mac, the way you do.</p>
        </div>
        <figure className="mt-roster mt-reveal" aria-label="A meeting participant list with no notetaker bot in it">
          <figcaption>Participants</figcaption>
          <ul>
            <li><span aria-hidden="true">PN</span>Priya Nair</li>
            <li><span aria-hidden="true">ML</span>Marcus Lee</li>
            <li><span aria-hidden="true">S</span>Sowmya</li>
            <li className="mt-roster-you"><span aria-hidden="true">Y</span>You</li>
          </ul>
          <p className="mt-roster-gap">No bot. Nothing to admit.</p>
        </figure>
      </section>

      <section className="mt-section" id="share">
        <p className="mt-kicker mt-reveal">Screen share</p>
        <h2 className="mt-h2 mt-big mt-reveal">You can see it.<br />Your screen share cannot.</h2>
        <p className="mt-p mt-reveal">
          He records in the open, where you can watch him work. Share that screen and the overlay
          is not in the picture. On by default. One toggle turns it off.
        </p>
      </section>

      <section className="mt-section" id="hears">
        <p className="mt-kicker mt-reveal">How he hears</p>
        <h2 className="mt-h2 mt-reveal">Two streams.<br />Never mixed.</h2>
        <div className="mt-streams mt-reveal" aria-hidden="true">
          <div className="mt-stream">
            <span>System audio</span>
            <b>Everyone else</b>
          </div>
          <div className="mt-stream mt-stream-you">
            <span>Microphone</span>
            <b>You</b>
          </div>
        </div>
        <p className="mt-p mt-reveal">
          Which side a voice arrived on cannot be wrong. That is why the notes can say who spoke
          instead of counting them.
        </p>
        <p className="mt-p mt-p-soft mt-reveal">
          Names come from outside the audio: the calendar invite, the meeting window, and the moment
          somebody introduces themselves.
        </p>
      </section>

      <section className="mt-section mt-honest">
        <p className="mt-kicker mt-reveal">Honest</p>
        <dl className="mt-honest-list">
          {HONEST.map(([title, body]) => (
            <div className="mt-reveal" key={title}>
              <dt>{title}</dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-foot mt-reveal">
          <span className="mt-status"><span /><b>In active development</b><i>Mac and browser</i></span>
          <div className="mt-links">
            <Link to="/waitlist" className="mt-join mt-join-lg">Join the waitlist</Link>
            <Link to="/knowledge/meeting-recorder">How it is built</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
