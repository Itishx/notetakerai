import { useCallback, useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import BrainoWalker from "@/components/BrainoWalker";
import "./insta-graphics.css";

type InstaPreview = "braino-os" | "iomi-boot" | "browser-notch" | "chrome-system";
type IomiBootPhase = "shimmer" | "authenticating" | "awake" | "expanded" | "mascot";
type BrowserNotchPhase = "idle" | "input" | "listening" | "hatching" | "expanded" | "speaking" | "hopped";

const BROWSER_NOTCH_SEQUENCE: ReadonlyArray<{ phase: BrowserNotchPhase; delay: number }> = [
  { phase: "idle", delay: 0 },
  { phase: "input", delay: 2400 },
  { phase: "listening", delay: 5200 },
  { phase: "hatching", delay: 8500 },
  { phase: "expanded", delay: 11800 },
  { phase: "speaking", delay: 16000 },
  { phase: "idle", delay: 19200 },
];

const IOMI_BOOT_SEQUENCE: ReadonlyArray<{ phase: IomiBootPhase; delay: number }> = [
  { phase: "shimmer", delay: 0 },
  { phase: "authenticating", delay: 1550 },
  { phase: "awake", delay: 4500 },
  { phase: "expanded", delay: 5600 },
  { phase: "mascot", delay: 8800 },
];

function IomiEyes({ open }: { open: boolean }) {
  return (
    <span className={`ig-iomi-eyes${open ? " is-open" : ""}`} aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

function IomiBootPrototype() {
  const [phase, setPhase] = useState<IomiBootPhase>("shimmer");
  const [runId, setRunId] = useState(0);

  const replay = useCallback(() => {
    setPhase("shimmer");
    setRunId((value) => value + 1);
  }, []);

  useEffect(() => {
    const timers = IOMI_BOOT_SEQUENCE.slice(1).map((step) =>
      window.setTimeout(() => setPhase(step.phase), step.delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId]);

  const awake = phase === "awake" || phase === "expanded" || phase === "mascot";
  const authenticationVisible = phase === "authenticating";
  const eyesVisible = phase === "awake" || phase === "expanded";

  return (
    <div className="ig-frame ig-iomi-frame" id="ig-iomi-boot">
      <header className="ig-iomi-header">
        <span>IOMI · boot study 01</span>
        <span>BrainoOS</span>
      </header>

      <main className="ig-iomi-stage">
        <p className="ig-iomi-kicker">A different Braino deserves a different beginning.</p>
        <h1>
          No authentication screen.
          <br />
          <em>Just IOMI waking up.</em>
        </h1>

        <div className={`ig-iomi-machine phase-${phase}`}>
          <div className="ig-iomi-screen">
            <div className="ig-iomi-wallpaper" />
            <div className={`ig-iomi-island${phase === "expanded" ? " is-expanded" : ""}${phase === "mascot" ? " is-departed" : ""}`}>
              <svg className="ig-iomi-perimeter" viewBox="0 0 190 55" aria-hidden="true">
                <defs>
                  <linearGradient id="ig-iomi-boot-spectrum" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f4cf87" />
                    <stop offset=".42" stopColor="#ec8078" />
                    <stop offset=".7" stopColor="#dc77a8" />
                    <stop offset="1" stopColor="#779cff" />
                  </linearGradient>
                </defs>
                <path className="ig-iomi-perimeter-glow" pathLength="100" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#ig-iomi-boot-spectrum)" fill="none" />
                <path className="ig-iomi-perimeter-core" pathLength="100" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#ig-iomi-boot-spectrum)" fill="none" />
              </svg>
              <span className="ig-iomi-aura" />
              <div className="ig-iomi-face">
                <span className={`ig-iomi-name${authenticationVisible ? " is-visible" : ""}`} aria-label="IOMI">
                  {"IOMI".split("").map((letter, index) => <i key={`${letter}-${index}`}>{letter}</i>)}
                </span>
                <span className={`ig-iomi-eye-wrap${eyesVisible ? " is-visible" : ""}`}>
                  <IomiEyes open={awake} />
                </span>
              </div>
              <div className="ig-iomi-expanded-copy">
                <div className="ig-iomi-greeting">
                  <span aria-label="Good evening, Itish.">
                    <b>Good</b>
                    <b>evening,</b>
                    <b>Itish.</b>
                  </span>
                  <small>Everything is ready.</small>
                </div>
                <i className="ig-iomi-divider" aria-hidden="true" />
                <div className="ig-iomi-wake-cue">
                  <IomiEyes open />
                  <small>Wake Braino</small>
                  <p><kbd>Control</kbd><kbd>⌘</kbd><kbd>⌘</kbd></p>
                </div>
              </div>
            </div>
            <div
              className="ig-iomi-mascot-jump"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }}
            />
          </div>
          <div className="ig-iomi-laptop-base" />
        </div>

        <div className="ig-iomi-controls" aria-label="IOMI boot states">
          {(["shimmer", "authenticating", "awake", "expanded", "mascot"] as IomiBootPhase[]).map((item) => (
            <button
              key={item}
              type="button"
              className={phase === item ? "is-active" : ""}
              onClick={() => setPhase(item)}
            >
              {item}
            </button>
          ))}
          <button type="button" className="ig-iomi-replay" onClick={replay}>Replay</button>
        </div>

        <div className="ig-iomi-notes">
          <p><strong>One perimeter signal.</strong> Warm gold moves through Braino coral into cool blue.</p>
          <p><strong>The handoff is one motion.</strong> IOMI resolves inward into Braino’s open eyes.</p>
          <p><strong>The greeting is spoken.</strong> Production uses Braino’s real voice—never a browser substitute.</p>
        </div>
      </main>

      <footer className="ig-iomi-footer">
        <span>Prototype only · not connected to Mac authentication</span>
        <span>Reduced motion supported</span>
      </footer>
    </div>
  );
}

function BrowserNotchPrototype() {
  const [phase, setPhase] = useState<BrowserNotchPhase>("idle");
  const [runId, setRunId] = useState(0);

  const replay = useCallback(() => {
    setPhase("idle");
    setRunId((value) => value + 1);
  }, []);

  useEffect(() => {
    const timers = BROWSER_NOTCH_SEQUENCE.slice(1).map((step) =>
      window.setTimeout(() => setPhase(step.phase), step.delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId]);

  const handleNotchClick = () => {
    if (phase === "idle") setPhase("input");
    else if (phase === "hatching") setPhase("expanded");
    else if (phase === "expanded") setPhase("hatching");
  };

  return (
    <div className="ig-frame ig-browser-frame" id="ig-browser-notch">
      <main className="ig-browser-stage">
        <div className={`ig-browser-notch-stage phase-${phase}`}>
          <section className={`ig-browser-notch is-${phase}`} aria-live="polite" onClick={handleNotchClick}>
            <span className="ig-browser-spectrum" aria-hidden="true" />
            <div className="ig-browser-home-braino" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />

            <div className="ig-browser-input-shell">
              <span><small>Ask Braino</small>What do you want to do?</span>
              <div>
                <button type="button" aria-label="Start voice">⌁</button>
                <button type="button" aria-label="Send">↑</button>
              </div>
            </div>

            <div className="ig-browser-listening" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
              <span>Listening…</span>
            </div>

            <div className="ig-browser-hatch" aria-hidden="true">
              <span className="ig-browser-hatch-orbit"><i /><i /><i /></span>
              <span>Braino is thinking</span>
              <small>Click to see the work</small>
            </div>

            <div className="ig-browser-thinking-canvas">
              <div className="ig-browser-thinking-head">
                <span><i /> Working on your task</span>
                <button type="button" onClick={(event) => { event.stopPropagation(); setPhase("hatching"); }}>Collapse</button>
              </div>
              <p>Reading the page and pulling out the parts worth keeping.</p>
              <div className="ig-browser-step"><i className="is-done">✓</i><span><small>Done</small>Understood the article</span></div>
              <div className="ig-browser-step is-current"><i>2</i><span><small>Now</small>Writing a clean summary</span><b><em /><em /><em /></b></div>
              <div className="ig-browser-step"><i>3</i><span><small>Next</small>Save it to your notes</span></div>
            </div>

            <div className="ig-browser-speaking" aria-hidden="true">
              <span className="ig-browser-mouth" />
              <p>Done. I saved the useful bits to your notes.</p>
            </div>
          </section>

          <div
            className={`ig-browser-mascot${phase === "hopped" ? " is-visible" : ""} mascot-${phase}`}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }}
          />
          <div className="ig-browser-idle-actions">
            <button type="button" onClick={() => setPhase("input")}>Click Braino to talk</button>
            <button type="button" onClick={() => setPhase("hopped")}>Hop down</button>
          </div>
          <div className="ig-iomi-controls ig-browser-controls" aria-label="Browser notch states">
            {(["idle", "input", "listening", "hatching", "expanded", "speaking", "hopped"] as BrowserNotchPhase[]).map((item) => (
              <button key={item} type="button" className={phase === item ? "is-active" : ""} onClick={() => setPhase(item)}>{item}</button>
            ))}
            <button type="button" className="ig-iomi-replay" onClick={replay}>Replay</button>
          </div>
        </div>
      </main>
    </div>
  );
}

type ChromeSystemPhase = "idle" | "listening" | "working" | "expanded-thinking" | "short-answer" | "long-answer";

function ChromeSystemPrototype() {
  const [phase, setPhase] = useState<ChromeSystemPhase>("idle");
  const [replayId, setReplayId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (replayId === 0) return;
    setPhase("idle");
    setIsPlaying(true);
    const sequence: Array<[ChromeSystemPhase, number]> = [
      ["listening", 1100],
      ["working", 3800],
      ["expanded-thinking", 6900],
      ["short-answer", 10400],
      ["long-answer", 13200],
      ["idle", 18500],
    ];
    const timers = sequence.map(([nextPhase, delay], index) => window.setTimeout(() => {
      setPhase(nextPhase);
      if (index === sequence.length - 1) setIsPlaying(false);
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [replayId]);

  return (
    <div className="ig-frame ig-chrome-system-frame" id="ig-chrome-system">
      <div className={`ig-chrome-system phase-${phase}`}>
        <header className="ig-cs-browser-bar">
          <i /><i /><i />
          <span>braino.com / the page you are already on</span>
          <b>⋯</b>
        </header>

        <main className="ig-cs-webpage">
          <div className="ig-cs-demo-site">
            <header><i /><span /><nav><b /><b /><b /></nav></header>
            <section><span /><span /><span /></section>
            <div><article /><article /><article /></div>
          </div>
        </main>

        <button className="ig-cs-notch" type="button" onClick={() => { if (!isPlaying) setPhase(phase === "idle" ? "listening" : phase === "listening" ? "working" : phase === "working" ? "expanded-thinking" : phase === "expanded-thinking" ? "short-answer" : phase === "short-answer" ? "long-answer" : "idle"); }}>
          {phase !== "long-answer" && <i className="ig-cs-state-braino" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />}
          <span className="ig-cs-notch-idle"><b className="ig-cs-idle-eyes"><i /><i /></b><small>Talk to Braino</small></span>
          <span className="ig-cs-notch-listening"><small>Listening</small></span>
          <span className="ig-cs-notch-working"><span><strong><i>Hatching</i><i>Calibrating</i><i>Thinking</i></strong><small>Click to see Braino’s process</small></span><em/></span>
          <span className="ig-cs-notch-expanded-thinking">
            <header><span><i /> Braino is thinking</span><em>Collapse</em></header>
            <p>First I’m reading the page to understand what the writer is actually trying to say.</p>
            <p>Now I’m separating the useful argument from the repetition around it.</p>
            <p>Next I’ll rewrite the answer in your tone and keep the original meaning intact.</p>
          </span>
          <span className="ig-cs-notch-short-answer">
            <span><small>Braino</small><strong>I cleaned it up. Want me to replace the original?</strong></span>
            <em>Replace</em>
          </span>
          <span className="ig-cs-notch-long-answer">
            <header><span><i /><i /><b>Braino</b></span><em>Done</em></header>
            <article>
              <small>Answer from this page</small>
              <h2>Here’s the useful version.</h2>
              <p>The article argues that better work does not come from adding more tools. It comes from reducing the distance between deciding and doing.</p>
              <p>The strongest idea is to keep context close to the action, so you spend less time rebuilding what you already knew.</p>
              <div><b>1</b><span><strong>Reduce the hand-offs</strong><small>Keep research, decisions and execution connected.</small></span></div>
              <div><b>2</b><span><strong>Preserve context</strong><small>Let the system remember what led to the decision.</small></span></div>
            </article>
            <div className="ig-cs-answer-walk-lane"><BrainoWalker perchTargetId="ig-cs-followup-bar" alwaysPerched /></div>
            <footer id="ig-cs-followup-bar"><span>Ask a follow-up</span><i>⌁</i><b>↑</b></footer>
          </span>
        </button>

        <div className="ig-cs-controls" aria-label="Chrome system states">
          <span>Preview state</span>
          {(["idle", "listening", "working", "expanded-thinking", "short-answer", "long-answer"] as ChromeSystemPhase[]).map((item) => (
            <button key={item} type="button" disabled={isPlaying} className={phase === item ? "is-active" : ""} onClick={() => setPhase(item)}>{item}</button>
          ))}
          <button type="button" className="ig-cs-replay" onClick={() => setReplayId((value) => value + 1)}>{isPlaying ? "Playing…" : "Replay flow"}</button>
        </div>
      </div>
    </div>
  );
}

/*
  /InstaGraphics — static 9:16 (1080x1920) export frames for Instagram
  Stories/Reels. Each .ig-frame is a fixed-size 1080x1920 element (native
  resolution, for a pixel-perfect screenshot) — CSS-scaled down purely for
  on-screen preview so it fits the viewport instead of scrolling off below
  the fold. To export: DevTools → Elements → select the .ig-frame node →
  right-click → "Capture node screenshot" (captures at the true 1080x1920,
  ignoring the on-screen preview scale).
*/
export default function InstaGraphics() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<InstaPreview>(() =>
    new URLSearchParams(window.location.search).get("design") === "iomi" ? "iomi-boot"
      : new URLSearchParams(window.location.search).get("design") === "browser-notch" ? "browser-notch"
        : new URLSearchParams(window.location.search).get("design") === "chrome-system" ? "chrome-system"
        : "braino-os"
  );

  useEffect(() => {
    const fit = () => {
      if (new URLSearchParams(window.location.search).get("export") === "1") {
        wrapRef.current?.style.setProperty("--ig-scale", "1");
        wrapRef.current?.classList.add("is-exporting");
        return;
      }
      const scale = Math.min((window.innerHeight * 0.94) / 1920, (window.innerWidth * 0.94) / 1080);
      wrapRef.current?.style.setProperty("--ig-scale", String(scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className={`ig-page${preview === "iomi-boot" ? " is-iomi-preview" : ""}${preview === "browser-notch" ? " is-browser-preview" : ""}${preview === "chrome-system" ? " is-chrome-system-preview" : ""}`} ref={wrapRef}>
      <nav className="ig-preview-switcher" aria-label="Instagraphics previews">
        <button type="button" className={preview === "braino-os" ? "is-active" : ""} onClick={() => setPreview("braino-os")}>
          Braino post
        </button>
        <button type="button" className={preview === "iomi-boot" ? "is-active" : ""} onClick={() => setPreview("iomi-boot")}>
          IOMI boot
        </button>
        <button type="button" className={preview === "browser-notch" ? "is-active" : ""} onClick={() => setPreview("browser-notch")}>
          Browser notch
        </button>
        <button type="button" className={preview === "chrome-system" ? "is-active" : ""} onClick={() => setPreview("chrome-system")}>
          Chrome system
        </button>
      </nav>

      {preview === "iomi-boot" ? <IomiBootPrototype /> : preview === "browser-notch" ? <BrowserNotchPrototype /> : preview === "chrome-system" ? <ChromeSystemPrototype /> : <div className="ig-frame" id="ig-braino-os">
        <header className="ig-story-header">
          <span className="ig-wordmark">Braino</span>
          <span className="ig-prelaunch">PreLaunch · Saturday</span>
        </header>

        <main className="ig-story-copy">
          <p className="ig-kicker">Hi, just had the best idea ever.</p>
          <h1>
            Build your own
            <br />
            version of <em>Braino.</em>
          </h1>
          <img className="ig-mascot" src="/reactions/braino-idle.svg" alt="" />

          <div className="ig-rule" />

          <p className="ig-intro">
            I love Braino so much because I built him. He speaks like me,
            is trained on me, and that&apos;s why he feels like my kid.
          </p>

          <p className="ig-reveal">
            Now you&apos;ll be able to customise
            <br /><strong>your own version of Braino.</strong>
          </p>

          <div className="ig-choices">
            <span>Your own design</span>
            <span>Your preferred voice</span>
            <span>Choose from a set of skills</span>
          </div>

          <p className="ig-examples">
            Make an <strong>Iron Man Braino.</strong>
            <br />Make a <strong>Barbie Braino.</strong>
          </p>

          <p className="ig-city">
            And every Braino ever made lives together in one city.
            <br />Lowkey Black Mirror type shit.
          </p>
        </main>

        <footer className="ig-story-footer">
          <div className="ig-powered">
            <small>All powered by</small>
            <span>Braino<b>OS</b></span>
          </div>
          <p>You own the look. <strong>I own the tech.</strong></p>
          <p className="ig-kid">He&apos;s my kid. <strong>He should feel like yours too.</strong></p>
          <span className="ig-date">Braino PreLaunch · Saturday</span>
        </footer>
      </div>}
    </div>
  );
}
