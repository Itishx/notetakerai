import { useEffect, useRef, useState } from "react";
import {
  Check,
  Cpu,
  Infinity as InfinityIcon,
  Keyboard,
  LockKeyhole,
  Mic,
  ShieldCheck,
  Square,
  TextCursorInput,
  VolumeX,
  WifiOff,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import SiteFooter from "@/components/SiteFooter";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "../styles/apple.css";
// SiteFooter carries no styles of its own. The other pages dress it in the .hos
// cream palette, which would fight this page, so yap-mode.css dresses it in the
// Apple tokens instead.
import "./yap-mode.css";

const DEMO_LINES = [
  "Hey Riya, I read the draft. The opening is strong, but the second paragraph can be clearer.",
  "Turn this into a short update for the team, keep my tone, and put the decision in the first line.",
  "Let's meet after lunch. I want twenty minutes to review the launch notes before the call.",
];

const FLOW = [
  { icon: Keyboard, label: "Double Option", note: "BrainoHERA wakes" },
  { icon: Mic, label: "Speak naturally", note: "Your Mac transcribes" },
  { icon: TextCursorInput, label: "Keep working", note: "Text lands at the caret" },
  { icon: Check, label: "Double Option", note: "The session closes" },
];

/* Hearing a room is the same capability pointed somewhere else, which is why it
   is a section on this page rather than a second product with a second name. */
const ROOM = [
  { icon: Keyboard, label: "Command Shift E", note: "The room, not you" },
  { icon: Mic, label: "The lecture runs", note: "Words appear as they are said" },
  { icon: Square, label: "Minimise", note: "Keep working, it keeps listening" },
  { icon: Check, label: "Stop", note: "It becomes a note you can search" },
];

const HERO_SPECS = [
  { icon: Cpu, label: "On-device", note: "Apple Neural Engine" },
  { icon: WifiOff, label: "No connection", note: "Works with the wifi off" },
  { icon: ShieldCheck, label: "Nothing uploaded", note: "Your voice stays home" },
];

// Two journeys, drawn at their real durations. The cloud dot is still crossing
// the screen long after the on-device dot has arrived and gone quiet.
const LANES = [
  {
    tone: "cloud" as const,
    name: "Dictation that lives in a data centre",
    time: "2 to 3 seconds",
    stops: [
      { label: "your voice", at: 0 },
      { label: "the internet", at: 25 },
      { label: "a server rack", at: 50 },
      { label: "the way back", at: 75 },
      { label: "your caret", at: 100 },
    ],
  },
  {
    tone: "local" as const,
    name: "BrainoHERA",
    time: "under half a second",
    stops: [
      { label: "your voice", at: 0 },
      { label: "your caret", at: 17 },
    ],
  },
];

const CLAIMS = [
  {
    icon: WifiOff,
    title: "Works at 30,000 feet",
    body: "No signal, no hotspot, no captive portal that wants your room number. The model is already on the machine. Airplane mode changes nothing.",
  },
  {
    icon: Zap,
    title: "There is no round trip",
    body: "Nothing to upload and nothing to wait for. Text keeps pace with the sentence instead of arriving after you have already stopped talking.",
  },
  {
    icon: ShieldCheck,
    title: "Your voice never leaves",
    body: "Audio is heard, turned into text, and dropped. Nothing is stored on a server, because nothing is sent to one. Privacy by architecture, not by policy page.",
  },
  {
    icon: InfinityIcon,
    title: "No meter is running",
    body: "There is no per-minute cost behind the scenes, so there is no per-minute limit in front of you. Talk for eight hours. The Mac does not care.",
  },
];

function BrainoHeraWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brainohera-wordmark${className ? ` ${className}` : ""}`}>
      Braino<span className="brainohera-shimmer">HERA</span>
    </span>
  );
}

function useReveal(refreshKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".yap-reveal");
    if (!elements?.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in")),
      { threshold: 0.14 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [refreshKey]);
  return ref;
}

function YapPreview({ phrase = DEMO_LINES[0], compact = false }: { phrase?: string; compact?: boolean }) {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"ready" | "listening" | "done">("ready");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const words = phrase.split(" ");
    const timer = window.setInterval(() => {
      const index = indexRef.current;
      if (index >= words.length) {
        window.clearInterval(timer);
        return;
      }
      setText((current) => `${current}${current ? " " : ""}${words[index]}`);
      indexRef.current += 1;
    }, compact ? 90 : 115);
    return () => window.clearInterval(timer);
  }, [active, compact, phrase]);

  const start = () => {
    indexRef.current = 0;
    setText("");
    setStatus("listening");
    setActive(true);
  };

  const stop = () => {
    setActive(false);
    setStatus("done");
  };

  return (
    <div className={`yap-preview${active ? " is-listening" : ""}${compact ? " compact" : ""}`}>
      <div className="yap-preview-bar">
        <span className="yap-window-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="yap-document">Launch note</span>
        <span className={`yap-preview-status ${status}`}>
          <i aria-hidden="true" />
          {status === "listening" ? <BrainoHeraWordmark /> : status === "done" ? "Done" : "Ready"}
        </span>
      </div>

      <div className="yap-editor">
        <div className="yap-editor-copy" aria-live="polite">
          {text || <span className="yap-placeholder">Your words land here.</span>}
          {active && <span className="yap-caret" aria-hidden="true" />}
        </div>
        <div className="yap-mascot-stage" aria-hidden="true">
          <span className="yap-listening-ring one" />
          <span className="yap-listening-ring two" />
          <div className="yap-mascot" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
          <div className="yap-wave">
            {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
          </div>
        </div>
      </div>

      <div className="yap-preview-controls">
        <button className="yap-icon-button" type="button" onClick={active ? stop : start} title={active ? "Stop BrainoHERA" : "Start BrainoHERA"}>
          {active ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
          <span className="sr-only">{active ? "Stop BrainoHERA" : "Start BrainoHERA"}</span>
        </button>
        <button className="yap-key-command" type="button" onClick={start} disabled={active} title="Double Option starts BrainoHERA">
          <kbd>option</kbd><kbd>option</kbd>
        </button>
        <button className="yap-done-command" type="button" onClick={stop} disabled={!active}>
          Stop
        </button>
      </div>
    </div>
  );
}

function ReadView() {
  return (
    <>
      <article className="yap-read" id="why">
        <p className="yap-kicker yap-reveal">A Braino Mac skill</p>
        <h2 className="yap-h2 yap-reveal">Talk where the cursor is.</h2>
        <p className="yap-p yap-reveal">
          BrainoHERA turns Braino into a quiet writing layer across your Mac. Put the caret
          in Mail, Notes, a browser, or an editor, double Option, and speak. Your words
          appear in the field you already chose.
        </p>
        <p className="yap-p yap-reveal">
          It does not open a chat, choose a destination, or make you move into a special
          document. The place you are already writing stays the place you are writing.
        </p>
      </article>

      <aside className="yap-founder-note yap-reveal" aria-labelledby="yap-founder-title">
        <p className="yap-kicker">Why I built it</p>
        <h2 id="yap-founder-title">I love Wispr Flow. That is the honest starting point.</h2>
        <p>
          Yes, this is exactly the thing I love Wispr Flow for. I used it so much while
          building Braino that the thought became stupidly simple: why should Braino not
          do this too? Use Wispr Flow or use BrainoHERA. Truly, it is your wish. I am not
          building this to tell you which tool deserves your loyalty. I am building
          something that helps you.
        </p>
        <p>
          There is also something special to me about speaking the notes, prompts, and
          corrections that build Braino into Braino himself. The thing I built now helps
          me build the next version of it.
        </p>
        <Link className="yap-founder-link" to="/journal/yap-mode">
          Read why I brought it into Braino
        </Link>
      </aside>

      <section className="yap-flow yap-reveal" id="flow" aria-label="BrainoHERA flow">
        {FLOW.map(({ icon: Icon, label, note }, index) => (
          <div className="yap-flow-step" key={label}>
            <span className="yap-flow-number">{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" />
            <strong>{label}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <article className="yap-read" id="local">
        <p className="yap-kicker yap-reveal">On-device speech</p>
        <h2 className="yap-h2 yap-reveal">The model lives on your Mac.</h2>
        <p className="yap-p yap-reveal">
          Almost every dictation tool you have used, including the ones you love, records
          your voice and flies it to a data centre. That flight is the wait. BrainoHERA
          runs the speech model on Apple's Neural Engine, inside the machine already on
          your desk. Nothing is uploaded. Nothing is queued. Your words become text a few
          inches from where you said them.
        </p>
      </article>

      <section className="yap-lanes yap-reveal" aria-label="How far the words travel">
        {LANES.map((lane) => (
          <div className={`yap-lane ${lane.tone}`} key={lane.name}>
            <div className="yap-lane-head">
              <strong>{lane.name}</strong>
              <span className="yap-lane-time">{lane.time}</span>
            </div>
            <div className="yap-lane-track" aria-hidden="true">
              <i className="yap-lane-fill" />
              {lane.stops.map((stop, index) => (
                <span
                  className={`yap-lane-stop${index === lane.stops.length - 1 ? " end" : ""}`}
                  key={stop.label}
                  style={{ left: `${stop.at}%` }}
                >
                  <b />
                  <small>{stop.label}</small>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="yap-local-foot yap-reveal">
        English runs entirely on your Mac. Hindi and mixed Hinglish still route through
        Braino's cloud model, because no local model reads them well yet. Braino tells you
        which one is listening instead of quietly picking for you.
      </p>

      {/* One capability, two places the words can land. Not two products: the
          microphone, the model and the machine are the same, and only the
          destination changes. */}
      <article className="yap-read">
        <p className="yap-kicker yap-reveal">The same ears, pointed outward</p>
        <h2 className="yap-h2 yap-reveal">It hears you. It also hears the room.</h2>
        <p className="yap-p yap-reveal">
          Dictation is BrainoHERA listening to one person a foot from the microphone. A lecture
          is the same thing, further away and for longer. Nothing about the machine changes, so
          nothing about the setup does either. Where the words land is the only difference:
          in a document they get typed, in a lecture hall they go on the screen and become a
          note you can search afterwards.
        </p>
      </article>

      <section className="yap-flow yap-reveal" aria-label="Hearing a room">
        {ROOM.map(({ icon: Icon, label, note }, index) => (
          <div className="yap-flow-step" key={label}>
            <span className="yap-flow-number">{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" />
            <strong>{label}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <p className="yap-local-foot yap-reveal">
        A forty minute lecture, transcribed on the machine, is the run this was tuned against.
        Around eighty eight percent of the words came back right, and the ones that did not were
        names and technical terms rather than ordinary English. No connection was involved and
        nothing was billed by the minute, which is the part that matters when the thing you are
        recording is three hours of a course you are paying for anyway.
      </p>

      <section className="yap-claims" aria-label="Why on-device matters">
        {CLAIMS.map(({ icon: Icon, title, body }) => (
          <article className="yap-claim yap-reveal" key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <article className="yap-read">
        <p className="yap-kicker yap-reveal">The pause you got used to</p>
        <h2 className="yap-h2 yap-reveal">The wait was never the machine thinking.</h2>
        <p className="yap-p yap-reveal">
          It was travelling. Your sentence went to a server in another state and came back
          as text, and you learned to wait for it. BrainoHERA deletes the trip. The same
          silicon that draws your screen now does the listening.
        </p>
      </article>

      <article className="yap-read" id="silent">
        <p className="yap-kicker yap-reveal">No conversation in the middle</p>
        <h2 className="yap-h2 yap-reveal">He listens. He types. He stays quiet.</h2>
        <p className="yap-p yap-reveal">
          BrainoHERA loads a transcription-only model. It has no opinions to offer, because
          it was never built to have them. Braino does not reason about the content, answer
          it, or read it back. The only output is readable text at your active caret. If
          there is no text box, the Notch keeps the full transcript visible and copies it
          instead of throwing your words away.
        </p>
        <div className="yap-rule-row yap-reveal">
          <div><VolumeX aria-hidden="true" /><span><strong>No TTS</strong><small>No spoken reply</small></span></div>
          <div><LockKeyhole aria-hidden="true" /><span><strong>No secure fields</strong><small>Passwords stay closed</small></span></div>
          <div><TextCursorInput aria-hidden="true" /><span><strong>Safe recovery</strong><small>Notch + clipboard if no field</small></span></div>
        </div>
      </article>

      <article className="yap-read" id="done">
        <p className="yap-kicker yap-reveal">Your words stay yours</p>
        <h2 className="yap-h2 yap-reveal">“Done” is a word, not a hidden command.</h2>
        <p className="yap-p yap-reveal">
          BrainoHERA never steals a spoken phrase to control itself. Double Option again
          closes the microphone.
        </p>
        <div className="yap-done-visual yap-reveal" aria-hidden="true">
          <span>done</span>
          <i />
          <strong>inserted normally</strong>
        </div>
      </article>

      <article className="yap-read yap-end">
        <p className="yap-kicker yap-reveal">One deliberate lane</p>
        <h2 className="yap-h2 yap-reveal">Built as a skill, not a hidden shortcut.</h2>
        <p className="yap-p yap-reveal">
          BrainoHERA has its own activation phrases, visual state, model boundary,
          insertion path, stop commands, and verification contract. Double Option belongs
          to it exclusively.
        </p>
        <div className="yap-links yap-reveal">
          <Link to="/journal/yap-mode-update">Read Braino's mode note</Link>
          <Link to="/human-intelligence">Human Intelligence</Link>
          <Link to="/braino-os">BrainoOS</Link>
        </div>
      </article>
    </>
  );
}

function LabView() {
  const [sample, setSample] = useState(DEMO_LINES[0]);
  return (
    <section className="yap-lab">
      <p className="yap-kicker yap-reveal">Product preview</p>
      <h2 className="yap-h2 yap-reveal">Watch one thought become text.</h2>
      <p className="yap-p yap-reveal">
        Pick a line, then use the microphone button or the double-Option control.
        Double Option again stops the session after the last phrase is safely drained.
      </p>
      <div className="yap-samples" role="group" aria-label="Preview phrases">
        {DEMO_LINES.map((line, index) => (
          <button className={sample === line ? "on" : ""} type="button" key={line} onClick={() => setSample(line)}>
            Thought {index + 1}
          </button>
        ))}
      </div>
      <YapPreview key={sample} phrase={sample} compact />
      <p className="yap-lab-note">The shipping Mac skill runs Parakeet on the Apple Neural Engine for English, and a transcription-only cloud session for Hindi and mixed speech.</p>
    </section>
  );
}

/* The page's own body, without the notch, the anchor bar or the footer. The
   standalone /yap-mode page wraps it in those; the HERA tab on / does not,
   because the host page already has them. One HERA story, two frames. */
export function YapModeContent({ standalone = true }: { standalone?: boolean }) {
  const [tab, setTab] = useState<"read" | "lab">("read");
  const revealRef = useReveal(tab);
  // The name pops the way the class pages pop theirs: one frame after mount, so
  // the transition has a starting state to travel from.
  const [popped, setPopped] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPopped(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`yap${standalone ? " apple" : " yap-embedded"}`} ref={revealRef}>
      {standalone && (
        <nav className="apple-anchors">
          <div className="apple-anchors-inner">
            <BrainoHeraWordmark className="an-name" />
            <div className="an-links">
              {tab === "read" && (
                <>
                  <a href="#why">Why</a>
                  <a href="#local">On-device</a>
                  <a href="#flow">Flow</a>
                  <a href="#done">Done</a>
                </>
              )}
              <a className="yap-try" href="#views" onClick={(event) => { event.preventDefault(); setTab("lab"); }}>Try it</a>
            </div>
          </div>
        </nav>
      )}

      <header className="yap-landing">
        <p className="yap-landing-eyebrow">Speak your mind</p>
        <p className="yap-landing-desc">
          Talk naturally. Braino types it <span className="tone">where your cursor
          already is</span>, in half a second, with the wifi off.
        </p>
        <h1 className={`yap-landing-name${popped ? " pop" : ""}`}><BrainoHeraWordmark /></h1>
        <ul className="yap-hero-specs">
          {HERO_SPECS.map(({ icon: Icon, label, note }) => (
            <li key={label}>
              <Icon aria-hidden="true" />
              <span><strong>{label}</strong><small>{note}</small></span>
            </li>
          ))}
        </ul>
      </header>

      <div className="yap-tabs" id="views">
        <button className={tab === "read" ? "on" : ""} type="button" onClick={() => setTab("read")}>Read</button>
        <button className={tab === "lab" ? "on" : ""} type="button" onClick={() => setTab("lab")}>Lab</button>
      </div>

      {tab === "read" ? <ReadView /> : <LabView />}
    </div>
  );
}

export default function YapMode() {
  return (
    <div className="apple">
      <IomiNotch />
      <YapModeContent />
      <SiteFooter />
    </div>
  );
}
