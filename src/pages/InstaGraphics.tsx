import { useCallback, useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
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

type ChromeSystemPhase = "invoking" | "authenticating" | "authenticated" | "idle" | "input" | "mode-menu" | "listening" | "working" | "expanded-thinking" | "short-answer" | "long-answer" | "speaking";

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

function ChromeSystemPrototype() {
  const [phase, setPhase] = useState<ChromeSystemPhase>("idle");
  const [replayId, setReplayId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(true);
  const [interactionKind, setInteractionKind] = useState<"text" | "voice">("text");
  const [draft, setDraft] = useState("");
  const [glassTheme, setGlassTheme] = useState<"readable" | "liquid">("readable");
  const [authRunId, setAuthRunId] = useState(0);

  useEffect(() => {
    if (!authRunId) return;
    setShowCoachmark(false);
    setPhase("invoking");
    const authenticating = window.setTimeout(() => setPhase("authenticating"), 1250);
    const success = window.setTimeout(() => setPhase("authenticated"), 3150);
    const ready = window.setTimeout(() => setPhase("idle"), 4050);
    return () => { window.clearTimeout(authenticating); window.clearTimeout(success); window.clearTimeout(ready); };
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
    const sequence: Array<[ChromeSystemPhase, number]> = [
      ["invoking", 300],
      ["authenticating", 1650],
      ["authenticated", 3550],
      ["idle", 4450],
      ["input", 5550],
      ["mode-menu", 7950],
      ["listening", 10650],
      ["working", 13350],
      ["expanded-thinking", 16450],
      ["speaking", 19950],
      ["short-answer", 22250],
      ["long-answer", 24950],
      ["idle", 31350],
    ];
    const timers = sequence.map(([nextPhase, delay], index) => window.setTimeout(() => {
      setPhase(nextPhase);
      if (index === sequence.length - 1) setIsPlaying(false);
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [replayId]);

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
    <div className="ig-frame ig-chrome-system-frame" id="ig-chrome-system">
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
        {showCoachmark && phase === "idle" && <div className="ig-cs-coachmark"><span>Click to type</span><small>Control ×2 to talk</small></div>}

        <div className="ig-cs-controls" aria-label="Chrome system states">
          <span>Preview state</span>
          {(["invoking", "authenticating", "authenticated", "idle", "input", "mode-menu", "listening", "working", "expanded-thinking", "speaking", "short-answer", "long-answer"] as ChromeSystemPhase[]).map((item) => (
            <button key={item} type="button" disabled={isPlaying} className={phase === item ? "is-active" : ""} onClick={() => { if (item === "listening" || item === "speaking") setInteractionKind("voice"); if (item === "input") setInteractionKind("text"); setPhase(item); }}>{item}</button>
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
