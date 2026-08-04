import { useEffect, useRef, useState } from "react";
import { Check, Keyboard, LockKeyhole, Mic, Square, TextCursorInput, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "../styles/apple.css";
import "./yap-mode.css";

const DEMO_LINES = [
  "Hey Saburi, I read the draft. The opening is strong, but the second paragraph can be clearer.",
  "Turn this into a short update for the team, keep my tone, and put the decision in the first line.",
  "Let's meet after lunch. I want twenty minutes to review the launch notes before the call.",
];

const FLOW = [
  { icon: Keyboard, label: "Double Option", note: "Yap Mode wakes" },
  { icon: Mic, label: "Speak naturally", note: "Whisper transcribes" },
  { icon: TextCursorInput, label: "Keep working", note: "Text lands at the caret" },
  { icon: Check, label: "Say done", note: "The session closes" },
];

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
          {status === "listening" ? "Yap Mode" : status === "done" ? "Done" : "Ready"}
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
        <button className="yap-icon-button" type="button" onClick={active ? stop : start} title={active ? "Stop Yap Mode" : "Start Yap Mode"}>
          {active ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
          <span className="sr-only">{active ? "Stop Yap Mode" : "Start Yap Mode"}</span>
        </button>
        <button className="yap-key-command" type="button" onClick={start} disabled={active} title="Double Option starts Yap Mode">
          <kbd>option</kbd><kbd>option</kbd>
        </button>
        <button className="yap-done-command" type="button" onClick={stop} disabled={!active}>
          Say done
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
          Yap Mode turns Braino into a quiet writing layer across your Mac. Put the caret
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
          do this too? Use Wispr Flow or use Braino Yap. Truly, it is your wish. I am not
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

      <section className="yap-flow yap-reveal" id="flow" aria-label="Yap Mode flow">
        {FLOW.map(({ icon: Icon, label, note }, index) => (
          <div className="yap-flow-step" key={label}>
            <span className="yap-flow-number">{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" />
            <strong>{label}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <article className="yap-read" id="silent">
        <p className="yap-kicker yap-reveal">No conversation in the middle</p>
        <h2 className="yap-h2 yap-reveal">He listens. He types. He stays quiet.</h2>
        <p className="yap-p yap-reveal">
          Yap Mode uses a transcription-only realtime session. Braino does not reason
          about the content, answer it, or read it back. The only output is readable text
          at your active caret.
        </p>
        <div className="yap-rule-row yap-reveal">
          <div><VolumeX aria-hidden="true" /><span><strong>No TTS</strong><small>No spoken reply</small></span></div>
          <div><LockKeyhole aria-hidden="true" /><span><strong>No secure fields</strong><small>Passwords stay closed</small></span></div>
          <div><TextCursorInput aria-hidden="true" /><span><strong>One destination</strong><small>The field you focused</small></span></div>
        </div>
      </article>

      <section className="yap-black-band yap-reveal" id="done">
        <div>
          <p className="yap-kicker">The clean exit</p>
          <h2>“Done” is a command,<br />not part of your sentence.</h2>
          <p>Say it once. The mint glow goes out, the microphone closes, and the word is never inserted.</p>
        </div>
        <div className="yap-done-visual" aria-hidden="true">
          <span>done</span>
          <i />
          <strong>session closed</strong>
        </div>
      </section>

      <article className="yap-read yap-end">
        <p className="yap-kicker yap-reveal">One deliberate lane</p>
        <h2 className="yap-h2 yap-reveal">Built as a skill, not a hidden shortcut.</h2>
        <p className="yap-p yap-reveal">
          Yap Mode has its own activation phrases, visual state, model boundary,
          insertion path, stop commands, and verification contract. Double Option belongs
          to it exclusively.
        </p>
        <div className="yap-links yap-reveal">
          <Link to="/journal/yap-mode-update">Read Braino's mode note</Link>
          <Link to="/human-intelligence">Human Intelligence</Link>
          <Link to="/braino-os">BrainoOS</Link>
        </div>
        <p className="yap-foot">Braino · built by one person · trybraino.com</p>
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
        “Done” stops the session without adding itself to the document.
      </p>
      <div className="yap-samples" role="group" aria-label="Preview phrases">
        {DEMO_LINES.map((line, index) => (
          <button className={sample === line ? "on" : ""} type="button" key={line} onClick={() => setSample(line)}>
            Thought {index + 1}
          </button>
        ))}
      </div>
      <YapPreview key={sample} phrase={sample} compact />
      <p className="yap-lab-note">The shipping Mac skill uses gpt-realtime-whisper in a transcription-only WebRTC session.</p>
    </section>
  );
}

export default function YapMode() {
  const [tab, setTab] = useState<"read" | "lab">("read");
  const revealRef = useReveal(tab);

  return (
    <div className="apple yap" ref={revealRef}>
      <IomiNotch />

      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Yap Mode</span>
          <div className="an-links">
            {tab === "read" && (
              <>
                <a href="#why">Why</a>
                <a href="#flow">Flow</a>
                <a href="#done">Done</a>
              </>
            )}
            <a className="yap-try" href="#views" onClick={(event) => { event.preventDefault(); setTab("lab"); }}>Try it</a>
          </div>
        </div>
      </nav>

      <header className="yap-hero">
        <div className="yap-hero-copy">
          <p className="apple-eyebrow">Speak your mind</p>
          <h1>Yap Mode</h1>
          <p>Talk naturally. Braino puts the readable version wherever your cursor is.</p>
        </div>
        <div className="yap-hero-preview yap-reveal">
          <YapPreview />
        </div>
      </header>

      <div className="yap-tabs" id="views">
        <button className={tab === "read" ? "on" : ""} type="button" onClick={() => setTab("read")}>Read</button>
        <button className={tab === "lab" ? "on" : ""} type="button" onClick={() => setTab("lab")}>Lab</button>
      </div>

      {tab === "read" ? <ReadView /> : <LabView />}
    </div>
  );
}
