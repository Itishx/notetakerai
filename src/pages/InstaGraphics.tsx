import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { Brainelle } from "@/components/Brainelle";
import {
  downloadNodePng,
  nodeToPngBlob,
  recordNodeVideo,
  registerReplay,
  saveBlob,
  supportedVideoType,
  triggerReplay,
  type ExportSize,
} from "@/lib/artboardExport";
import "./insta-graphics.css";

/* Every story artboard is a true 1080 x 1920 box, previewed at 39%. Stills go
   out at 2x that, which is the largest size Instagram will actually use. */
const STORY_SIZE: ExportSize = { width: 1080, height: 1920 };
const STORY_STILL: ExportSize = { width: 2160, height: 3840 };
const CAROUSEL_STILL: ExportSize = { width: 4320, height: 5400 };

/** Publishes an artboard's replay function so the export control, which lives
    outside the scaled frame, can restart the sequence before recording. */
function useReplayHandle(frameId: string, replay: () => void) {
  useEffect(() => registerReplay(frameId, replay), [frameId, replay]);
}

type ArtboardExportProps = {
  /** Element id of the .ig-frame to capture. */
  frameId: string;
  /** Filename stem, without extension. */
  name: string;
  /** Length of the artboard's animation, in milliseconds. */
  durationMs: number;
};

/* One control per artboard: the still, and the animation as a real video file.
   It sits in the entry copy column rather than inside the frame, because
   anything inside the frame would be scaled to 39% on screen and would also be
   rasterised into the export itself. */
function ArtboardExport({ frameId, name, durationMs }: ArtboardExportProps) {
  const [state, setState] = useState<"idle" | "png" | "video" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const videoType = supportedVideoType();
  const busy = state === "png" || state === "video";

  const settle = (next: "done" | "error", note: string) => {
    setState(next);
    setMessage(note);
    window.setTimeout(() => { setState("idle"); setMessage(""); }, 3200);
  };

  const frame = () => {
    const node = document.getElementById(frameId);
    if (!node) throw new Error("This artboard is not on the page");
    return node as HTMLElement;
  };

  const savePng = async () => {
    if (busy) return;
    try {
      setState("png");
      await downloadNodePng(frame(), STORY_STILL, `${name}-2160x3840.png`);
      settle("done", "PNG saved");
    } catch (error) {
      console.error("Artboard PNG export failed", error);
      settle("error", "PNG failed, try again");
    }
  };

  const saveVideo = async () => {
    if (busy || !videoType) return;
    try {
      setState("video");
      setProgress(0);
      const { blob, extension } = await recordNodeVideo(frame(), STORY_SIZE, {
        durationMs,
        maxFps: 30,
        onReplay: () => triggerReplay(frameId),
        onProgress: ({ elapsedMs }) => setProgress(Math.min(100, Math.round((elapsedMs / durationMs) * 100))),
      });
      saveBlob(blob, `${name}-1080x1920.${extension}`);
      settle("done", `${extension.toUpperCase()} saved`);
    } catch (error) {
      console.error("Artboard video export failed", error);
      settle("error", "Recording failed, try again");
    }
  };

  const seconds = Math.round(durationMs / 1000);
  return (
    <div className="ig-export">
      <button type="button" onClick={savePng} disabled={busy}>
        {state === "png" ? "Rendering…" : "Download PNG"}
        <small>2160 × 3840</small>
      </button>
      <button type="button" onClick={saveVideo} disabled={busy || !videoType}>
        {state === "video" ? `Recording… ${progress}%` : videoType ? `Download ${videoType.extension.toUpperCase()}` : "Video unsupported"}
        <small>{videoType ? `1080 × 1920 · ${seconds}s` : "Try Chrome or Safari"}</small>
      </button>
      <p className={`ig-export-note${state === "error" ? " is-error" : ""}`} role="status">
        {message || (state === "video" ? "Plays the sequence once and records it in real time." : "\u00a0")}
      </p>
    </div>
  );
}

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

type ChromeSystemPhase = "invoking" | "authenticating" | "authenticated" | "greeting" | "idle" | "input" | "mode-menu" | "listening" | "working" | "expanded-thinking" | "short-answer" | "long-answer" | "speaking";

function NotchWalker() {
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lane = laneRef.current;
    const walker = walkerRef.current;
    const root = walker?.querySelector("#__sbwk_root__") as SVGGElement | null;
    const flip = walker?.querySelector(".ig-cs-walker-flip") as HTMLElement | null;
    if (!lane || !walker || !root || !flip) return;
    let raf = 0, x = 6, direction = 1, last = performance.now();
    const started = last;
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const t = (now - started) / 1000;
      const maxX = Math.max(6, lane.clientWidth - 56);
      x += direction * 74 * dt;
      if (x >= maxX) { x = maxX; direction = -1; }
      else if (x <= 6) { x = 6; direction = 1; }
      walker.style.transform = `translateX(${x}px)`;
      flip.style.transform = `scaleX(${direction})`;
      const s = t * 4.5, lp = Math.sin(s), rp = Math.sin(s + Math.PI);
      const ll = Math.max(0, lp) * 5, rl = Math.max(0, rp) * 5;
      const ls = Math.max(0, lp) * 8, rs = Math.max(0, rp) * 8;
      const waddle = Math.sin(s) * 3.4;
      const walkBob = -Math.abs(Math.sin(s)) * 2 - .4;
      const breath = 1 + .014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + .6) * .8;
      root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
      root.querySelector("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-ll}) rotate(${ls} 44 74)`);
      root.querySelector("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rl}) rotate(${rs} 56 74)`);
      root.querySelector("#__sbwk_pupil_l__")?.setAttribute("transform", "translate(2.4 0)");
      root.querySelector("#__sbwk_pupil_r__")?.setAttribute("transform", "translate(2.4 0)");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={laneRef} className="ig-cs-local-walk-lane"><div ref={walkerRef} className="ig-cs-local-walker"><div className="ig-cs-walker-flip" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></div></div>;
}

export function ChromeSystemPrototype({ socialLoop = false }: { socialLoop?: boolean } = {}) {
  const [phase, setPhase] = useState<ChromeSystemPhase>("idle");
  const [replayId, setReplayId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(!socialLoop);
  const [interactionKind, setInteractionKind] = useState<"text" | "voice">("text");
  const [draft, setDraft] = useState("");
  const [glassTheme, setGlassTheme] = useState<"readable" | "liquid">("readable");
  const [authRunId, setAuthRunId] = useState(0);

  useEffect(() => {
    if (socialLoop) setReplayId(1);
  }, [socialLoop]);

  useEffect(() => {
    if (!authRunId) return;
    setShowCoachmark(false);
    setPhase("invoking");
    // Beat-for-beat with the Mac's runNotchBoot(): green verdict, then a 1100ms
    // hold on the open eyes, then the island spreads into the greeting, then he
    // drops out of the notch and the bar settles to idle.
    const authenticating = window.setTimeout(() => setPhase("authenticating"), 1250);
    const success = window.setTimeout(() => setPhase("authenticated"), 3150);
    const greeting = window.setTimeout(() => setPhase("greeting"), 4250);
    const ready = window.setTimeout(() => setPhase("idle"), 7900);
    return () => { window.clearTimeout(authenticating); window.clearTimeout(success); window.clearTimeout(greeting); window.clearTimeout(ready); };
  }, [authRunId]);

  useEffect(() => {
    let lastControlAt = 0;
    let lastSpaceAt = 0;
    const onShortcut = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
        if (typing) { lastSpaceAt = 0; return; }
        const now = performance.now();
        if (now - lastSpaceAt < 500) {
          event.preventDefault();
          setAuthRunId((value) => value + 1);
          lastSpaceAt = 0;
        } else lastSpaceAt = now;
        return;
      }
      if (event.key === "Control" && !event.repeat) {
        const now = performance.now();
        if (now - lastControlAt < 650) {
          setShowCoachmark(false);
          setInteractionKind("voice");
          setPhase("listening");
          lastControlAt = 0;
        } else {
          lastControlAt = now;
        }
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (replayId === 0) return;
    setInteractionKind("voice");
    setPhase("idle");
    setIsPlaying(true);
    const sequence: Array<[ChromeSystemPhase, number]> = socialLoop ? [
      ["idle", 0],
      ["input", 900],
      ["mode-menu", 2200],
      ["listening", 3900],
      ["speaking", 5600],
      ["short-answer", 7100],
      ["long-answer", 8700],
      ["idle", 12000],
    ] : [
      ["invoking", 300],
      ["authenticating", 1650],
      ["authenticated", 3550],
      ["greeting", 4650],
      ["idle", 8300],
      ["input", 9400],
      ["mode-menu", 11800],
      ["listening", 14500],
      ["working", 17200],
      ["expanded-thinking", 20300],
      ["speaking", 23800],
      ["short-answer", 26100],
      ["long-answer", 28800],
      ["idle", 35200],
    ];
    const timers = sequence.map(([nextPhase, delay], index) => window.setTimeout(() => {
      setPhase(nextPhase);
      if (index === sequence.length - 1) {
        if (socialLoop) setReplayId((value) => value + 1);
        else setIsPlaying(false);
      }
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [replayId, socialLoop]);

  const themeToggle = (
    <button
      type="button"
      className="ig-cs-theme-toggle"
      aria-label={`Switch to ${glassTheme === "readable" ? "liquid" : "readable"} glass`}
      title={`Switch to ${glassTheme === "readable" ? "Liquid" : "Readable"} glass`}
      onClick={(event) => { event.stopPropagation(); setGlassTheme((current) => current === "readable" ? "liquid" : "readable"); }}
    >
      <span aria-hidden="true">◐</span>
    </button>
  );

  return (
    <div className={`ig-frame ig-chrome-system-frame${socialLoop ? " is-social-loop" : ""}`} id={socialLoop ? undefined : "ig-chrome-system"}>
      <div className={`ig-chrome-system theme-${glassTheme} phase-${phase}`}>
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

        <section className="ig-cs-notch" onClick={() => { if (!isPlaying) { setShowCoachmark(false); if (phase === "idle") { setInteractionKind("text"); setPhase("input"); } else if (phase === "listening") setPhase("working"); else if (phase === "working") setPhase("expanded-thinking"); else if (phase === "expanded-thinking") setPhase(interactionKind === "voice" ? "speaking" : "short-answer"); else if (phase === "speaking") setPhase("short-answer"); else if (phase === "short-answer") setPhase("long-answer"); else if (phase === "long-answer") setPhase("idle"); } }}>
          <svg className="ig-cs-flow-perimeter" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="ig-cs-flow-spectrum" x1="-1" y1="0" x2="1" y2="1" spreadMethod="repeat"><stop offset="0" stopColor="#f4cf87"/><stop offset=".4" stopColor="#ec8078"/><stop offset=".72" stopColor="#dc77a8"/><stop offset="1" stopColor="#779cff"/><animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="3.8s" repeatCount="indefinite" /></linearGradient></defs>
            <path className="ig-cs-flow-glow" pathLength="100" d="M 0 0 H 100 V 90 Q 100 100 90 100 H 10 Q 0 100 0 90 Z" fill="none" stroke="url(#ig-cs-flow-spectrum)" />
            <path className="ig-cs-flow-core" pathLength="100" d="M 0 0 H 100 V 90 Q 100 100 90 100 H 10 Q 0 100 0 90 Z" fill="none" stroke="url(#ig-cs-flow-spectrum)" />
          </svg>
          <b className="ig-cs-idle-face ig-cs-persistent-face" aria-hidden="true">
            <svg viewBox="0 0 230 72" preserveAspectRatio="none">
              <path d="M115 0 Q111 14 115 27 Q119 40 115 56" />
              <path d="M25 4 Q14 13 25 22 Q12 31 25 40 Q14 50 30 61" />
              <path d="M61 1 Q49 11 60 20 Q47 30 61 39 Q49 49 65 63" />
              <path d="M169 1 Q181 11 170 20 Q183 30 169 39 Q181 49 165 63" />
              <path d="M205 4 Q216 13 205 22 Q218 31 205 40 Q216 50 200 61" />
              <g className="ig-cs-real-eye"><circle cx="103" cy="29" r="10" /><g className="ig-cs-pupil"><circle cx="104" cy="30" r="4.8" /><circle cx="106" cy="27.5" r="1.7" /></g></g>
              <g className="ig-cs-real-eye"><circle cx="127" cy="29" r="10" /><g className="ig-cs-pupil"><circle cx="128" cy="30" r="4.8" /><circle cx="130" cy="27.5" r="1.7" /></g></g>
              <g className="ig-cs-thinking-lids"><path d="M93 29 Q103 36 113 29"/><path d="M117 29 Q127 36 137 29"/></g>
              <path className="ig-cs-resting-smile" d="M108 47 Q115 54 122 47" />
              <g className="ig-cs-speaking-mouth"><ellipse cx="115" cy="49" rx="7" ry="5.5" /><ellipse cx="115" cy="51" rx="4.2" ry="2.2" /></g>
            </svg>
          </b>
          <span className="ig-cs-notch-idle">
            <small>Talk to Braino</small>
          </span>
          <span className="ig-cs-notch-auth"><small>{phase === "authenticated" ? "Authenticated" : "Authenticating"}</small><i /></span>
          {/* The Mac's nf-iomi-expanded-card, verbatim: the face steps aside, the
              island opens into two columns, and a vertical rule separates the
              greeting from the wake shortcuts. */}
          <span className="ig-cs-notch-greeting">
            <span className="ig-cs-greet-copy">
              <strong><span>Good</span><span>evening,</span><span>Itish.</span></strong>
              <small>Everything is ready.</small>
            </span>
            <i className="ig-cs-greet-divider" />
            <span className="ig-cs-greet-wake">
              <span className="ig-cs-greet-eyes"><i /><i /></span>
              <small>Wake Braino</small>
              <span className="ig-cs-greet-keys"><kbd>Control</kbd><kbd>Control</kbd></span>
              <span className="ig-cs-greet-keys"><kbd>Click</kbd><em>to type</em></span>
            </span>
          </span>
          <span className="ig-cs-notch-input">
            <span><small>Ask Braino</small><input value={draft} onChange={(event) => setDraft(event.target.value)} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Enter" && draft.trim()) { event.preventDefault(); setInteractionKind("text"); setPhase("working"); } }} placeholder="Summarise this page…" /></span>
            <button type="button" className="ig-cs-mode-trigger" onClick={(event) => { event.stopPropagation(); setPhase("mode-menu"); }}>Auto⌄</button>
            <button type="button" className="ig-cs-mic-trigger" onClick={(event) => { event.stopPropagation(); setInteractionKind("voice"); setPhase("listening"); }}>⌁</button>
            <button type="button" className="ig-cs-send-trigger" disabled={!draft.trim()} onClick={(event) => { event.stopPropagation(); if (draft.trim()) { setInteractionKind("text"); setPhase("working"); } }}>↑</button>
            {themeToggle}
          </span>
          <span className="ig-cs-notch-mode-menu" onClick={(event) => event.stopPropagation()}>
            <header><small>Choose a mode</small><span className="ig-cs-header-actions"><em>Auto</em>{themeToggle}</span></header>
            <i onClick={() => setPhase("input")}><b>Auto</b><small>Let Braino decide</small><strong>✓</strong></i>
            <i onClick={() => setPhase("input")}><b>Page</b><small>Read and work on this page</small></i>
            <i onClick={() => setPhase("input")}><b>Lecture</b><small>Capture and explain audio</small></i>
            <i onClick={() => setPhase("input")}><b>Meeting</b><small>Listen, remember and follow up</small></i>
            <i onClick={() => setPhase("input")}><b>Delegate</b><small>Complete a browser task</small></i>
            <i onClick={() => setPhase("input")}><b>Team</b><small>Work with shared context</small></i>
          </span>
          <span className="ig-cs-notch-listening"><small>Listening</small></span>
          <span className="ig-cs-notch-working"><span><strong><i>Hatching</i><i>Calibrating</i><i>Thinking</i></strong><small>Click to see Braino’s process</small></span><em/></span>
          <span className="ig-cs-notch-expanded-thinking">
            <header><span><i /> Braino is thinking</span><span className="ig-cs-header-actions"><em>Collapse</em>{themeToggle}</span></header>
            <p>First I’m reading the page to understand what the writer is actually trying to say.</p>
            <p>Now I’m separating the useful argument from the repetition around it.</p>
            <p>Next I’ll rewrite the answer in your tone and keep the original meaning intact.</p>
          </span>
          <span className="ig-cs-notch-short-answer">
            <span className="ig-cs-short-answer-row"><span><small>Braino</small><strong>I cleaned it up. Want me to replace the original?</strong></span><span className="ig-cs-header-actions"><em>Replace</em>{themeToggle}</span></span>
            {phase === "short-answer" && <NotchWalker />}
          </span>
          <span className="ig-cs-notch-long-answer">
            <header><span><i /><i /><b>Braino</b></span><span className="ig-cs-header-actions"><em>Done</em>{themeToggle}</span></header>
            <article>
              <small>Answer from this page</small>
              <h2>Here’s the useful version.</h2>
              <p>The article argues that better work does not come from adding more tools. It comes from reducing the distance between deciding and doing.</p>
              <p>The strongest idea is to keep context close to the action, so you spend less time rebuilding what you already knew.</p>
              <div><b>1</b><span><strong>Reduce the hand-offs</strong><small>Keep research, decisions and execution connected.</small></span></div>
              <div><b>2</b><span><strong>Preserve context</strong><small>Let the system remember what led to the decision.</small></span></div>
            </article>
            <div className="ig-cs-answer-walk-lane">{phase === "long-answer" && <NotchWalker />}</div>
            <footer id="ig-cs-followup-bar"><span>Ask a follow-up</span><i>⌁</i><b>↑</b></footer>
          </span>
          <span className="ig-cs-notch-speaking"><small>Speaking</small><i /><i /><i /></span>
        </section>
        {/* runIomiBootMascotExit(): he is born inside the notch, then drops out of
            it into the visible page. Outside the notch so nothing clips him. */}
        {phase === "greeting" && (
          <div className="ig-cs-boot-mascot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
        )}
        {!socialLoop && showCoachmark && phase === "idle" && <div className="ig-cs-coachmark"><span>Click to type</span><small>Control ×2 to talk</small></div>}

        {!socialLoop && <div className="ig-cs-controls" aria-label="Chrome system states">
          <span>Preview state</span>
          {(["invoking", "authenticating", "authenticated", "greeting", "idle", "input", "mode-menu", "listening", "working", "expanded-thinking", "speaking", "short-answer", "long-answer"] as ChromeSystemPhase[]).map((item) => (
            <button key={item} type="button" disabled={isPlaying} className={phase === item ? "is-active" : ""} onClick={() => { if (item === "listening" || item === "speaking") setInteractionKind("voice"); if (item === "input") setInteractionKind("text"); setPhase(item); }}>{item}</button>
          ))}
          <button type="button" className="ig-cs-replay" onClick={() => setReplayId((value) => value + 1)}>{isPlaying ? "Playing…" : "Replay flow"}</button>
        </div>}
      </div>
    </div>
  );
}

type TwinModePhase = "alone" | "discovering" | "locked" | "handoff";

// Both Brainos on one screen: the Mac notch lives in the menubar, the browser
// notch hangs off the tab strip. The whole design question is how they SIGNAL
// each other, so the thread between them is the subject, not decoration.
const TWIN_SEQUENCE: ReadonlyArray<[TwinModePhase, number]> = [
  ["alone", 300],
  ["discovering", 2600],
  ["locked", 5400],
  ["handoff", 8600],
  ["locked", 12400],
];

const TWIN_LINES: Record<TwinModePhase, { mac: string; browser: string; note: string }> = {
  alone: { mac: "asleep", browser: "How you doing?", note: "Browser Braino only. No Mac heartbeat." },
  discovering: { mac: "…", browser: "Hold on. Someone else is up.", note: "Handshake in flight." },
  locked: { mac: "I'm here.", browser: "We're on both.", note: "Two Brainos, one mind. Rings breathe together." },
  handoff: { mac: "Taking it.", browser: "This one needs the Mac.", note: "Work crossing the thread." },
};

// One face, two homes. Same eyes as the production notch so the design reads as
// Braino and not a generic status light.
function TwinFace({ awake }: { awake: boolean }) {
  return (
    <svg className={`ig-tw-face${awake ? " is-awake" : ""}`} viewBox="0 0 230 72" preserveAspectRatio="none" aria-hidden="true">
      <g className="ig-tw-eye"><circle cx="103" cy="29" r="10" /><g className="ig-tw-pupil"><circle cx="104" cy="30" r="4.8" /><circle cx="106" cy="27.5" r="1.7" /></g></g>
      <g className="ig-tw-eye"><circle cx="127" cy="29" r="10" /><g className="ig-tw-pupil"><circle cx="128" cy="30" r="4.8" /><circle cx="130" cy="27.5" r="1.7" /></g></g>
      <g className="ig-tw-lids"><path d="M93 29 Q103 36 113 29" /><path d="M117 29 Q127 36 137 29" /></g>
      <path className="ig-tw-smile" d="M108 47 Q115 54 122 47" />
    </svg>
  );
}

function TwinModePrototype() {
  const [phase, setPhase] = useState<TwinModePhase>("locked");
  const [runId, setRunId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const replay = useCallback(() => {
    setPhase("alone");
    setRunId((value) => value + 1);
  }, []);

  useEffect(() => {
    if (runId === 0) return;
    setIsPlaying(true);
    const timers = TWIN_SEQUENCE.map(([next, delay], index) =>
      window.setTimeout(() => {
        setPhase(next);
        if (index === TWIN_SEQUENCE.length - 1) setIsPlaying(false);
      }, delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId]);

  const macAwake = phase !== "alone";
  const line = TWIN_LINES[phase];

  return (
    <div className="ig-frame ig-twin-frame" id="ig-twin-mode">
      <div className={`ig-twin-desktop phase-${phase}`}>
        {/* ── macOS menubar + the Mac app's notch ── */}
        <header className="ig-tw-menubar">
          <span className="ig-tw-mb-apps"><b>Braino</b><i>File</i><i>Edit</i><i>View</i></span>
          <div className="ig-tw-mac-notch">
            <span className="ig-tw-ring ig-tw-ring-blue" aria-hidden="true" />
            <TwinFace awake={macAwake} />
            <span className="ig-tw-notch-say">{line.mac}</span>
          </div>
          <span className="ig-tw-mb-status"><i>􀙇</i><i>􀋲</i><i>9:41</i></span>
        </header>

        {/* ── The thread. This is the whole idea: one lit path between them. ── */}
        <div className="ig-tw-thread" aria-hidden="true">
          <span className="ig-tw-thread-line" />
          <span className="ig-tw-thread-packet" />
        </div>

        {/* ── The browser window, with the extension's own notch ── */}
        <div className="ig-tw-window">
          <header className="ig-tw-chrome-bar">
            <i /><i /><i />
            <span>trybraino.com</span>
            <b>⋯</b>
          </header>

          <div className="ig-tw-browser-notch">
            <span className="ig-tw-ring ig-tw-ring-coral" aria-hidden="true" />
            <TwinFace awake />
            <span className="ig-tw-notch-say">{line.browser}</span>
          </div>

          <main className="ig-tw-page">
            <div className="ig-tw-page-skeleton"><i /><i /><i /><i /></div>
          </main>

          <div className="ig-tw-mascot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
        </div>

        {/* ── The readable state, bottom-left, the way a real HUD would sit ── */}
        <div className="ig-tw-hud">
          <span className="ig-tw-badge ig-tw-badge-browser"><i /> Browser</span>
          <span className="ig-tw-badge ig-tw-badge-mac"><i /> Mac</span>
          <span className="ig-tw-hud-note">{line.note}</span>
        </div>
      </div>

      <div className="ig-cs-controls ig-twin-controls" aria-label="Twin mode states">
        <span>Twin state</span>
        {(["alone", "discovering", "locked", "handoff"] as TwinModePhase[]).map((item) => (
          <button key={item} type="button" disabled={isPlaying} className={phase === item ? "is-active" : ""} onClick={() => setPhase(item)}>
            {item}
          </button>
        ))}
        <button type="button" className="ig-cs-replay" onClick={replay}>{isPlaying ? "Playing…" : "Replay flow"}</button>
      </div>
    </div>
  );
}


/* ── 007 · Brainelle ────────────────────────────────────────────────────────
   A character sheet, not a mascot variant page. The point of the artboard is
   the claim in its footer: she is the same parametric character, so every pose
   he owns already works on her. Both columns of the comparison row therefore
   render the live component rather than exported artwork.

   The hero smiles through every beat — the range lives in the mood row below
   it, so the headline portrait never catches her mid-shock. */

type BrainelleBeat = { pose: Record<string, unknown>; line: string; caption: string };

const BRAINELLE_BEATS: ReadonlyArray<BrainelleBeat> = [
  { pose: { arm: "wave", talk: true }, line: "Hi. I'm Brainelle.", caption: "Talking · waving" },
  { pose: { talk: true }, line: "Same brain. Same gradients. Better bow.", caption: "Talking" },
  { pose: { expr: "happy" }, line: "She isn't a costume. She's the same character, dressed.", caption: "Listening" },
  { pose: { arm: "wave", talk: true }, line: "Every move he knows is already mine.", caption: "Talking · waving" },
];

const BRAINELLE_MOODS: ReadonlyArray<{ expr: string; label: string; lookX?: number }> = [
  { expr: "happy", label: "Happy" },
  { expr: "grin", label: "Grin", lookX: 0.5 },
  { expr: "mischief", label: "Mischief", lookX: -0.6 },
  { expr: "wow", label: "Wow" },
];

const BRAINELLE_BEAT_MS = 3000;

export function BrainellePrototype() {
  const [beat, setBeat] = useState(0);
  const [runId, setRunId] = useState(0);

  const replay = useCallback(() => {
    setBeat(0);
    setRunId((value) => value + 1);
  }, []);
  useReplayHandle("ig-brainelle", replay);

  useEffect(() => {
    const timers = BRAINELLE_BEATS.slice(1).map((_, index) =>
      window.setTimeout(() => setBeat(index + 1), (index + 1) * BRAINELLE_BEAT_MS)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId]);

  const current = BRAINELLE_BEATS[beat];

  return (
    <div className="ig-frame ig-brainelle-frame" id="ig-brainelle">
      <BrainoDefs />
      <header className="ig-story-header">
        <span className="ig-wordmark">braino</span>
        <span className="ig-prelaunch">Character study · 007</span>
      </header>

      <div className="ig-brainelle-head">
        <span>New character</span>
        <h2>Meet<br /><em>Brainelle.</em></h2>
        <p key={beat}>{current.line}</p>
      </div>

      <div className="ig-brainelle-stage">
        <span className="ig-brainelle-halo" aria-hidden="true" />
        <span className="ig-brainelle-sonar" aria-hidden="true"><i /><i /><i /></span>
        <Brainelle size={430} legs idle gaze="wander" {...current.pose} />
        <span className="ig-brainelle-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <b className="ig-brainelle-caption">{current.caption}</b>
      </div>

      <div className="ig-brainelle-moods">
        {BRAINELLE_MOODS.map((mood) => (
          <span key={mood.label}>
            <Brainelle size={128} expr={mood.expr} idle gaze="wander" />
            <i>{mood.label}</i>
          </span>
        ))}
      </div>

      <div className="ig-brainelle-pair">
        <span className="ig-brainelle-pair-cell">
          <Braino size={172} legs walk expr="happy" />
          <i>Braino</i>
        </span>
        <em aria-hidden="true" />
        <span className="ig-brainelle-pair-cell">
          <Brainelle size={172} legs walk expr="happy" />
          <i>Brainelle</i>
        </span>
      </div>

      <footer className="ig-brainelle-foot">
        <p>Honey hair, a silk bow, a scalloped polka dot skirt, round specs, longer lashes, pink shoes. A skirt and not a dress, because she has no shoulders for one to hang from. Nothing about the character underneath is redrawn.</p>
        <span>trybraino.com</span>
      </footer>
    </div>
  );
}


/* A · B · C side by side, so the hair call can be made by looking rather than
   by describing. Route: /instagraphics/brainelle/hair */
/* Every hair weight against every colour, so the call is made by looking.
   Route: /instagraphics/brainelle/hair */
const HAIR_WEIGHTS: ReadonlyArray<{ key: string; label: string; note: string }> = [
  { key: "wispy", label: "Wispy", note: "tips at y 73" },
  { key: "trim", label: "Trim", note: "tips at y 81" },
  { key: "long", label: "Full", note: "tips at y 88" },
  { key: "bob", label: "Fringe", note: "cap only" },
  { key: "trimsweep", label: "Trim, swept", note: "side part" },
  { key: false as unknown as string, label: "None", note: "bow and skirt only" },
];
const HAIR_COLOURS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "blonde", label: "Blonde" },
  { key: "honey", label: "Honey" },
  { key: "rose", label: "Rose" },
  { key: "auburn", label: "Auburn" },
  { key: "espresso", label: "Espresso" },
];

export function BrainelleHairCompare() {
  return (
    <main className="ig-hair-compare">
      <BrainoDefs />
      <header>
        <a href="/instagraphics/brainelle">← Brainelle</a>
        <p>Hair · {HAIR_WEIGHTS.length} weights × {HAIR_COLOURS.length} colours</p>
      </header>
      <div className="ig-hair-matrix" style={{ "--ig-cols": HAIR_COLOURS.length } as React.CSSProperties}>
        <span className="ig-hair-corner" />
        {HAIR_COLOURS.map((colour) => <span key={colour.key} className="ig-hair-colhead">{colour.label}</span>)}
        {HAIR_WEIGHTS.map((weight) => (
          <Fragment key={weight.label}>
            <span className="ig-hair-rowhead"><strong>{weight.label}</strong><em>{weight.note}</em></span>
            {HAIR_COLOURS.map((colour) => (
              <span key={colour.key} className="ig-hair-cell">
                <Brainelle size={168} legs idle expr="happy" hair={weight.key} hairColor={colour.key} />
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </main>
  );
}

/* The same artboard, alone on a black viewport and scaled to fit it, for when
   the 39% archive preview is too small to judge. Route: /instagraphics/brainelle
   The fit is measured in JS rather than CSS because `scale()` needs a unitless
   number, and `calc(100vw / 1080)` resolves to a length. */
export function BrainelleStage() {
  const [scale, setScale] = useState(() =>
    typeof window === "undefined" ? 0.39 : Math.min(window.innerWidth / 1080, window.innerHeight / 1920)
  );

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1080, window.innerHeight / 1920));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <main className="ig-brainelle-preview" style={{ "--ig-scale": scale } as React.CSSProperties}>
      <BrainellePrototype />
      <a className="ig-brainelle-preview-back" href="/instagraphics">← Archive</a>
    </main>
  );
}

const BRAINO_INTRO_SLIDES = [
  {
    number: "01",
    eyebrow: "Meet Braino",
    title: <>Speak.<br /><em>Watch it happen.</em></>,
    copy: "A companion who lives on your Mac, understands what you mean, and does the work alongside you.",
    className: "is-opening",
    art: "character",
  },
  {
    number: "02",
    eyebrow: "Not another chatbot",
    title: <>He sees the work.<br /><em>Then helps with it.</em></>,
    copy: "Braino can understand the page, file, or app in front of you—without making you explain everything twice.",
    className: "is-context",
    art: "screen",
  },
  {
    number: "03",
    eyebrow: "Just ask",
    title: <>Your words in.<br /><em>Real work out.</em></>,
    copy: "Summarize the lecture. Organize the desktop. Draft the reply. Book the thing. Plain language is enough.",
    className: "is-action",
    art: "commands",
  },
  {
    number: "04",
    eyebrow: "A little more human",
    title: <>He reads the room.<br /><em>Not just the prompt.</em></>,
    copy: "Braino changes how he responds with the moment—quiet when life is heavy, playful when it is not.",
    className: "is-feeling",
    art: "feeling",
  },
  {
    number: "05",
    eyebrow: "Braino",
    title: <>Not a tool.<br /><em>Your companion.</em></>,
    copy: "One character. Your browser, your Mac, and the work between them. Meet him at trybraino.com.",
    className: "is-close",
    art: "ecosystem",
  },
] as const;

function SocialArtwork({ kind }: { kind: typeof BRAINO_INTRO_SLIDES[number]["art"] }) {
  if (kind === "screen") return <div className="ig-social-art is-screen"><div className="ig-post-browser"><span><i /><i /><i /></span><div><small>braino is reading</small><b>The page you’re on.</b><em>Not a pasted summary of it.</em></div><strong>Ask Braino <i>↑</i></strong></div></div>;
  if (kind === "commands") return <div className="ig-social-art is-commands"><span>“Summarize this lecture.”</span><span>“Clean up my desktop.”</span><span>“Draft the reply.”</span><span>“Book that table.”</span></div>;
  if (kind === "feeling") return <div className="ig-social-art is-feeling-art"><div className="ig-post-face"><i /><i /></div><span>same intelligence</span><span>different moment</span></div>;
  if (kind === "ecosystem") return <div className="ig-social-art is-ecosystem"><span>Browser</span><span>Braino OS</span><span>IOMI</span><div aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></div>;
  return <div className="ig-social-art is-character"><div aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /><span>hello, human.</span></div>;
}

function BrainoIntroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [exportState, setExportState] = useState<"idle" | "rendering" | "zipping" | "done" | "error">("idle");
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  const move = (direction: number) => {
    setActiveSlide((current) => (current + direction + BRAINO_INTRO_SLIDES.length) % BRAINO_INTRO_SLIDES.length);
  };

  const downloadAll = async () => {
    if (exportState === "rendering" || exportState === "zipping") return;
    try {
      setExportState("rendering");
      const [{ toBlob }, { default: JSZip }] = await Promise.all([import("html-to-image"), import("jszip")]);
      const zip = new JSZip();
      for (let index = 0; index < slideRefs.current.length; index += 1) {
        const slide = slideRefs.current[index];
        if (!slide) throw new Error(`Slide ${index + 1} is not ready`);
        const png = await toBlob(slide, {
          width: 1080,
          height: 1350,
          pixelRatio: 4,
          cacheBust: true,
          backgroundColor: window.getComputedStyle(slide).backgroundColor,
          style: { width: "1080px", height: "1350px", transform: "none" },
        });
        if (!png) throw new Error(`Could not render slide ${index + 1}`);
        zip.file(`braino-introduction-${String(index + 1).padStart(2, "0")}-4k.png`, png);
      }
      setExportState("zipping");
      const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = "braino-instagram-introduction-4k.zip";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportState("done");
      window.setTimeout(() => setExportState("idle"), 2400);
    } catch (error) {
      console.error("Instagram carousel export failed", error);
      setExportState("error");
    }
  };

  const exportLabel = exportState === "rendering" ? "Rendering 4K PNGs…" : exportState === "zipping" ? "Making ZIP…" : exportState === "done" ? "Downloaded" : exportState === "error" ? "Try download again" : "Download all · 4K PNG ZIP";

  return (
    <div className="ig-carousel-shell">
      <div className="ig-carousel-viewport">
        <div className="ig-carousel-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
          {BRAINO_INTRO_SLIDES.map((slide, index) => (
            <section ref={(node) => { slideRefs.current[index] = node; }} className={`ig-social-slide ${slide.className}${index === activeSlide ? " is-active" : ""}`} key={slide.number} aria-hidden={index !== activeSlide}>
              <header><span className="ig-social-brand"><i /> braino</span><span>{slide.number} / 05</span></header>
              <SocialArtwork kind={slide.art} />
              <div className="ig-social-copy">
                <p>{slide.eyebrow}</p>
                <h2>{slide.title}</h2>
                <div className="ig-social-rule" />
                <strong>{slide.copy}</strong>
              </div>
              <footer><span>Introducing Braino</span><span>trybraino.com</span></footer>
            </section>
          ))}
        </div>
      </div>
      <div className="ig-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous carousel slide">←</button>
        <div>{BRAINO_INTRO_SLIDES.map((slide, index) => <button type="button" key={slide.number} className={index === activeSlide ? "is-active" : ""} onClick={() => setActiveSlide(index)} aria-label={`Open slide ${index + 1}`} />)}</div>
        <button type="button" onClick={() => move(1)} aria-label="Next carousel slide">→</button>
      </div>
      <button className="ig-download-all" type="button" onClick={downloadAll} disabled={exportState === "rendering" || exportState === "zipping"}>{exportLabel}<small>5 files · 4320 × 5400 each</small></button>
    </div>
  );
}

export default function InstaGraphics() {
  return (
    <main className="ig-page ig-archive">
      <nav className="ig-archive-nav"><a href="#top" className="ig-archive-wordmark"><i /> braino</a><span>Social studio · 2026</span></nav>
      <header className="ig-archive-hero" id="top">
        <p>Insta Graphics</p>
        <h1>Ideas worth<br /><em>stopping for.</em></h1>
        <div><p>A living, scrollable archive of Braino’s social stories, product studies, and visual experiments.</p><span>Scroll to browse <b>↓</b></span></div>
      </header>

      <section className="ig-feature-story" aria-labelledby="braino-intro-title">
        <div className="ig-story-meta"><span>001 · Carousel</span><span>August 6, 2026</span></div>
        <div className="ig-story-heading"><div><p>New post · 1080 × 1350</p><h2 id="braino-intro-title">So, what is Braino?</h2></div><p>Five portrait slides built from the product overview’s typography, direct voice, warm neutrals, and coral signature—then given their own motion.</p></div>
        <div className="ig-post-workbench"><aside><span>Instagram portrait</span><strong>1080 × 1350 px</strong><small>4:5 · five slides</small></aside><BrainoIntroCarousel /></div>
      </section>

      <section className="ig-archive-list" aria-label="Design archive">
        {[
          { number: "002", type: "Interaction study", title: "IOMI wakes up.", note: "A boot sequence with no authentication theatre—just IOMI resolving into Braino’s open eyes.", content: <IomiBootPrototype /> },
          { number: "003", type: "Browser study", title: "A notch with presence.", note: "The browser surface stays calm and compact until the work needs room to breathe.", content: <BrowserNotchPrototype /> },
          { number: "004", type: "System study", title: "Braino in Chrome.", note: "One connected lifecycle for listening, thinking, answering, and getting out of the way.", content: <ChromeSystemPrototype /> },
          { number: "005", type: "Companion study", title: "Two Brainos. One mind.", note: "A visual exploration of discovery, connection, and handoff between companion instances.", content: <TwinModePrototype /> },
          { number: "006", type: "Onboarding study", title: "Yours before you install him.", note: "An Apple-style setup flow that runs after sign-in and before the download, so Braino arrives already knowing you.", content: <a className="ig-fullpage-link" href="/instagraphics/onboarding"><span>Full-page flow</span><strong>Set up Braino</strong><em>8 steps · opens in its own tab →</em></a> },
          { number: "009", type: "Carousel", title: "Meet Braino.", content: <a className="ig-fullpage-link" href="/instagraphics/meet-braino"><span>New post · 1080 × 1350</span><strong>Open Meet Braino</strong><em>11 slides · 4K PNG ZIP →</em></a>, note: "The whole introduction in one post. Opens white on his face and the Jarvis line, splits him into the website’s two chapters, lays the four things out as a bento, walks each one, then spends chapter two on the co-founder: the engine cards, the seven jobs nobody can do alone, and what eight founder interviews actually said." },
          { number: "008", type: "Carousel", title: "Braino OS, in seven slides.", note: "The site’s own Under the hood section ported to 4:5: what the operating layer is, the four pillars as one table, then a slide each for the mind, the heart, the memory and the ears.", content: <a className="ig-fullpage-link" href="/instagraphics/braino-os"><span>New post · 1080 × 1350</span><strong>Open the Braino OS post</strong><em>7 slides · 4K PNG ZIP →</em></a> },
          { number: "007", type: "Character study", title: "Meet Brainelle.", note: "Not a second mascot. The same parametric character wearing clothes, so every pose, walk cycle, and expression he owns already works on her.", content: <BrainellePrototype />, fullPage: "/instagraphics/brainelle", export: { name: "brainelle-character-sheet", frameId: "ig-brainelle", durationMs: BRAINELLE_BEATS.length * BRAINELLE_BEAT_MS } },
        ].map((item) => <article className="ig-archive-entry" key={item.number}>
          <div className="ig-entry-copy"><span>{item.number} · {item.type}</span><h2>{item.title}</h2><p>{item.note}</p>
            {"fullPage" in item && item.fullPage ? <a className="ig-entry-fullscreen" href={item.fullPage}>Open full screen ↗</a> : null}
            {"export" in item && item.export ? <ArtboardExport frameId={item.export.frameId} name={item.export.name} durationMs={item.export.durationMs} /> : null}</div>
          <div className="ig-artboard-stage">{item.content}</div>
        </article>)}
      </section>
      <footer className="ig-archive-footer"><p>More ideas are already moving.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
