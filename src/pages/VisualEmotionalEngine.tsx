import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmotionNetwork from "@/components/EmotionNetwork";
import IomiNotch from "@/components/IomiNotch";
import BrainoReplyLab from "@/components/BrainoReplyLab";
import "../styles/apple.css";
import "./human-intelligence.css";
import "./visual-emotional-engine.css";

const ANCHORS = [
  { href: "#why", label: "Why" },
  { href: "#routing", label: "The routing" },
  { href: "#source", label: "The source" },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!elements?.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in")),
      { threshold: 0.16 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return ref;
}

function ReadTab() {
  return (
    <>
      <article className="hil-read" id="why">
        <p className="hil-kicker apple-reveal">Why a heart, before an answer</p>
        <h2 className="hil-h2 apple-reveal">Words carry a moment with them.</h2>
        <p className="hil-p apple-reveal">
          The same technically correct sentence can feel thoughtful, cold, funny, or
          completely wrong depending on when it arrives. Braino reads that emotional
          moment before deciding which parts of his personality should lead.
        </p>
        <p className="hil-p apple-reveal">
          This is not sentiment analysis pasted onto the end of a response. The Emotional
          Intelligence Layer changes the order of the personality prompt before the model
          answers, so the response begins from the right place.
        </p>
        <blockquote className="hil-quote apple-reveal">
          The whole personality stays. The right part steps forward.
        </blockquote>
      </article>

      <article className="hil-read" id="routing">
        <p className="hil-kicker apple-reveal">How the moment moves through him</p>
        <h2 className="hil-h2 apple-reveal">Three small decisions. No second AI call.</h2>
        <p className="hil-p apple-reveal">
          The routing is intentionally legible. A plain word-cue reader detects the
          moment, the relevant traits move to the front, and one steering sentence is
          placed above the assembled personality.
        </p>
        <div className="hil-checkdefs apple-reveal">
          <div className="hil-checkdef">
            <b>One</b>
            <span><strong>Read the signal.</strong> Crisis, grief, anxiety, celebration, conflict, banter, focused work, and ordinary conversation each have explicit cues.</span>
          </div>
          <div className="hil-checkdef">
            <b>Two</b>
            <span><strong>Reorder the traits.</strong> Attunement may lead an anxious moment; directness and boundaries lead when the user just wants the work done.</span>
          </div>
          <div className="hil-checkdef yes">
            <b>Three</b>
            <span><strong>Assemble one heart.</strong> The remaining traits recede without disappearing, and the resulting block becomes the personality half of Braino's prompt.</span>
          </div>
        </div>
      </article>

      <article className="hil-read" id="source">
        <p className="hil-kicker apple-reveal">The source of truth</p>
        <h2 className="hil-h2 apple-reveal">Reply runs the real thing, then checks itself.</h2>
        <p className="hil-p apple-reveal">
          The Reply tab is not a simulation of the engine. It calls the same endpoint
          Braino answers from, so the moment, the trait order, and the steering sentence
          you see are the ones that actually shaped the reply above them.
        </p>
        <p className="hil-p apple-reveal">
          Then it scans his own answer against his own banned phrases. Therapy voice,
          wellness closers, "great question", dashes. A rule he can be caught breaking
          is a rule, and anything else is a wish.
        </p>
      </article>

      <section className="hil-brain-wrap apple-reveal">
        <div className="hil-brain">
          <div className="hil-brain-bar">
            <span /><span /><span />
            <i>emotional-engine / moments.ts</i>
          </div>
          <pre>{`message
  -> detectMoment()
  -> orderTraitsForMoment()
  -> steeringLine()
  -> one assembled personality block`}</pre>
        </div>
      </section>

      <section className="hil-read hil-end">
        <h2 className="hil-h2 apple-reveal">The heart and the mind stay separate.</h2>
        <p className="hil-p apple-reveal">
          Emotional Intelligence decides how Braino should meet the moment. Human
          Intelligence decides what the user means and whether he should act or ask.
          Braino OS runs both, in that order, on every command.
        </p>
        <div className="hil-cta-row apple-reveal">
          <Link className="hil-btn" to="/human-intelligence">Human Intelligence</Link>
          <Link className="hil-btn ghost" to="/braino-os">BrainoOS</Link>
          <Link className="hil-btn ghost" to="/engine-log">Run log</Link>
        </div>
        <p className="hil-foot">Braino &middot; built by one person &middot; trybraino.com</p>
      </section>
    </>
  );
}

// Two tabs, on purpose. Lab was retired because Reply showed everything it did
// plus the actual reply and the tell scan. Whole mind moved to its own page:
// half of it is thinking, and this layer is being tuned on its own first.
export default function VisualEmotionalEngine() {
  const [tab, setTab] = useState<"read" | "reply">("read");
  const reveal = useReveal();

  return (
    <div className="apple hil eil" ref={reveal} style={{ ["--ap-accent" as string]: "var(--ap-coral)" }}>
      <IomiNotch />

      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Emotional Intelligence</span>
          <div className="an-links">
            {tab === "read" && ANCHORS.map((anchor) => (
              <a key={anchor.href} href={anchor.href}>{anchor.label}</a>
            ))}
            <a
              className="hil-tryit"
              href="#tabs"
              onClick={(event) => {
                event.preventDefault();
                setTab("reply");
              }}
            >
              Try it
            </a>
          </div>
        </div>
      </nav>

      <header className="apple-hero hil-hero eil-hero">
        <p className="apple-eyebrow">The Emotional Intelligence Layer</p>
        <h1 className="apple-display">He feels the <span className="tone">moment</span> before he answers.</h1>
        <p className="apple-subhead">
          Every message rearranges the same twelve traits. This is the heart, and a
          place to watch it decide who should speak first.
        </p>
        <div className="hil-hero-art eil-hero-art apple-reveal">
          <EmotionNetwork />
        </div>
      </header>

      <div className="hil-tabs" id="tabs">
        <button className={tab === "read" ? "on" : ""} onClick={() => setTab("read")}>Read</button>
        <button className={tab === "reply" ? "on" : ""} onClick={() => setTab("reply")}>Reply</button>
      </div>

      {tab === "read" ? <ReadTab /> : <BrainoReplyLab />}
    </div>
  );
}
