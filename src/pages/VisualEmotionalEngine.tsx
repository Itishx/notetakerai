import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmotionNetwork from "@/components/EmotionNetwork";
import IomiNotch from "@/components/IomiNotch";
import BrainoReplyLab from "@/components/BrainoReplyLab";
import BrainoWholeMind from "@/components/BrainoWholeMind";
import {
  MOMENT_CUES,
  MOMENT_LABEL,
  orderTraitsForMoment,
  steeringLine,
  type Moment,
} from "@/lib/emotional-engine-viz";
import { detectMoment } from "../../supabase/functions/_shared/emotional-engine/moments.ts";
import "../styles/apple.css";
import "./human-intelligence.css";
import "./visual-emotional-engine.css";

const ANCHORS = [
  { href: "#why", label: "Why" },
  { href: "#routing", label: "The routing" },
  { href: "#source", label: "The source" },
];

const SAMPLES: Array<{ label: string; message: string }> = [
  { label: "Anxiety", message: "I'm so stressed and everything is too much right now." },
  { label: "Celebration", message: "We shipped it! This is the best day." },
  { label: "Honest feedback", message: "Be brutally honest. What's wrong with this?" },
  { label: "Banter", message: "Roast me for fun lol." },
  { label: "Focused task", message: "Fix this bug and give me the code." },
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
        <h2 className="hil-h2 apple-reveal">The lab runs the production detector.</h2>
        <p className="hil-p apple-reveal">
          The interaction on this page imports the same <code>detectMoment()</code> used
          by the Emotional Engine. The labels, trait order, and steering sentence below
          are produced from that reading rather than recreated for the demo.
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
        </div>
        <p className="hil-foot">Braino &middot; built by one person &middot; trybraino.com</p>
      </section>
    </>
  );
}

function momentName(moment: Moment) {
  if (moment === "neutral") return "Ordinary";
  return MOMENT_LABEL[moment]
    .replace(/^an? /, "")
    .replace(/^a moment of /, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function LabTab() {
  const [message, setMessage] = useState("");
  const [moment, setMoment] = useState<Moment>("neutral");
  const [intensity, setIntensity] = useState(1);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const ordered = useMemo(() => orderTraitsForMoment(moment), [moment]);
  const leadIds = useMemo(() => {
    if (moment === "neutral") return [];
    return ordered.filter((trait) => trait.leadsOn.includes(moment)).slice(0, 4);
  }, [moment, ordered]);
  const steer = useMemo(() => steeringLine(moment), [moment]);

  const run = (sample?: string) => {
    const text = (sample ?? message).trim();
    if (!text || running) return;
    if (sample) setMessage(sample);
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];

    const reading = detectMoment(text);
    const detected = reading.moment as Moment;
    setMoment(detected);
    setIntensity(reading.intensity);
    setStage(1);
    setRunning(true);
    [2, 3, 4].forEach((nextStage, index) => {
      timers.current.push(window.setTimeout(() => setStage(nextStage), 520 + index * 620));
    });
    timers.current.push(window.setTimeout(() => setRunning(false), 520 + 3 * 620));
  };

  const thinking = [
    `I read the signal in "${message.trim() || "your message"}".`,
    moment === "neutral"
      ? "Nothing emotionally specific fired, so I keep my natural personality order."
      : `This is ${MOMENT_LABEL[moment]} moment. I should not answer it like an ordinary one.`,
    leadIds.length
      ? `${leadIds.map((trait) => trait.name).join(", ")} move forward. The rest of me stays present.`
      : "No traits need to jump the queue.",
    steer || "The default personality block is ready. No steering line is needed.",
  ];

  return (
    <section className="hil-lab-wrap eil-lab-wrap">
      <p className="hil-kicker apple-reveal">The lab &middot; live</p>
      <h2 className="hil-h2 apple-reveal">Give him a message. Watch him feel the moment.</h2>
      <p className="hil-p apple-reveal">
        This runs the production cue detector locally, then plays the trait reordering
        out as a thinking log. No response is generated and nothing leaves the page.
      </p>

      <div className="hil-lab">
        <div className="hil-lab-inputs">
          <textarea
            className="hil-cmd eil-message"
            value={message}
            placeholder="Say something to Braino"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                run();
              }
            }}
            rows={2}
            disabled={running}
          />
          <div className="hil-lab-row">
            <button className="hil-run" onClick={() => run()} disabled={running || !message.trim()}>
              {running ? "Reading the moment" : "Run the heart"}
            </button>
            {running && <span className="hil-pulse" aria-hidden="true" />}
          </div>
          <div className="hil-samples" aria-label="Sample emotional moments">
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                className="hil-sample"
                onClick={() => run(sample.message)}
                disabled={running}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hil-a eil-a">
          <div className="eil-routing-col">
            <span className="eil-panel-k">Moment reading</span>
            <strong className="eil-moment">{stage ? momentName(moment) : "Waiting"}</strong>
            <span className="eil-intensity">{stage ? `Signal strength ${intensity} / 3` : "No message yet"}</span>
            <div className="eil-network">
              <EmotionNetwork caption={false} moment={stage ? moment : "neutral"} />
            </div>
          </div>

          <div className="hil-think-col eil-think-col" aria-live="polite">
            <span className="eil-panel-k">Thinking log</span>
            {stage === 0 && <p className="hil-think-wait">His emotional routing will appear here.</p>}
            {thinking.map((line, index) => (
              stage >= index + 1 && (
                <div className="eil-log-line" key={`${moment}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{line}</p>
                </div>
              )
            ))}
          </div>
        </div>

        {stage >= 3 && (
          <div className="eil-priority">
            <div className="eil-priority-head">
              <span className="eil-panel-k">Live trait order</span>
              <span>{moment === "neutral" ? "Default order" : `${leadIds.length} leading now`}</span>
            </div>
            <ol>
              {ordered.map((trait, index) => {
                const leading = leadIds.some((lead) => lead.id === trait.id);
                return (
                  <li className={leading ? "leading" : ""} key={trait.id}>
                    <span className="eil-rank">{String(index + 1).padStart(2, "0")}</span>
                    <span className="eil-trait-copy">
                      <strong>{trait.name}</strong>
                      <small>{trait.summary}</small>
                    </span>
                    {leading && <span className="eil-leading">Leads now</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {stage >= 4 && (
          <div className="hil-summary eil-summary">
            <div className="hil-sum-row">
              <span className="hil-sum-k">Detected moment</span>
              <p className="hil-sum-goal">{momentName(moment)}</p>
            </div>
            <div className="hil-sum-row">
              <span className="hil-sum-k">Cues</span>
              <div className="eil-cues">
                {MOMENT_CUES[moment].length
                  ? MOMENT_CUES[moment].map((cue) => <span key={cue}>{cue}</span>)
                  : <span>No specific cue fired</span>}
              </div>
            </div>
            <div className="hil-sum-row">
              <span className="hil-sum-k">Steering line</span>
              <p className="eil-steer">{steer || "Natural order. No steering line."}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function VisualEmotionalEngine() {
  const [tab, setTab] = useState<"read" | "lab" | "reply" | "whole">("read");
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
                setTab("lab");
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
        <button className={tab === "lab" ? "on" : ""} onClick={() => setTab("lab")}>Lab</button>
        <button className={tab === "reply" ? "on" : ""} onClick={() => setTab("reply")}>Reply</button>
        <button className={tab === "whole" ? "on" : ""} onClick={() => setTab("whole")}>Whole mind</button>
      </div>

      {tab === "read" ? <ReadTab />
        : tab === "lab" ? <LabTab />
        : tab === "reply" ? <BrainoReplyLab />
        : <BrainoWholeMind />}
    </div>
  );
}
