import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { FEATURES, GRAPHICS } from "./UseCases";
import { HOME_MOCKS } from "@/components/HomeMocks";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { BrainoDefs } from "@/components/BrainoChar";
import BrainoDanceGrid from "@/components/BrainoDanceGrid";
import "./home.css";

/* ============================================================================
   Home — an editorial, Medium-style walkthrough of Braino.
   • "Read it"   → product-perspective copy.
   • "Braino narrates" → first-person copy + a narrated, paragraph-by-paragraph
     highlight that auto-scrolls in sync (recorded audio drops in via
     NARRATION_AUDIO_SRC later).
   Typography is inverted Medium-style: bold sans (NeueHaas) headings, serif
   (Instrument Serif) body. Reuses the full-body Braino SVG for the parallax
   "Meet Braino" reveal and the interactive party-trick stage.
   ============================================================================ */

const NARRATION_AUDIO_SRC = ""; // set to the recorded VO when ready, e.g. "/braino-walkthrough.mp3"

type Mode = "read" | "walk";
interface Copy { read: string; walk: string; }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── Author / byline ──
// Read mode = the founder (you) is the author; Walk mode = Braino is.
const BRAINO_X = "https://x.com/brainosays";
const FOUNDER_NAME = "Itish Pande";
// TODO(itish): confirm your X handle — used for both the link and the avatar.
const FOUNDER_X_HANDLE = "itishpande";
const FOUNDER_X = `https://x.com/${FOUNDER_X_HANDLE}`;
// Avatar: pulled from your X profile pic via unavatar. Swap to a local image
// (e.g. "/itish.jpg" dropped in public/) anytime if you'd rather self-host it.
const FOUNDER_AVATAR = `https://unavatar.io/x/${FOUNDER_X_HANDLE}`;

const HERO = {
  kicker: "An AI that lives in your browser",
  title: { read: "Meet Braino.", walk: "Hi. I'm Braino." },
  sub: {
    read: "A little brain that floats on every tab — it reads the page, talks it through, takes your notes, and quietly does the clicking for you.",
    walk: "I live on every tab you open. I read what's on your screen, talk you through it, take your notes, and handle the boring clicks. Come on — let me show you around.",
  },
};

const INTRO = {
  dek: {
    read: "Everyone's shipping a chat box. Braino is the opposite bet: a character that actually lives on your screen, sees what you see, and helps without being asked twice.",
    walk: "Everyone else built a chat box and called it a day. I'm the opposite bet — I'm a character who lives on your screen, sees what you see, and helps before you have to ask twice.",
  },
  p1: {
    read: "Open any page and Braino is already there in the corner. Highlight a paragraph and he explains it. Hit record on a lecture and he writes the notes. Tell him to book the thing, and he opens the tab and books the thing. No copy-paste, no second window, no prompt engineering.",
    walk: "Open any page and I'm already in the corner. Highlight a paragraph and I'll explain it. Press record on a lecture and I'll write the notes. Tell me to book the thing and I'll open the tab and book it. No copy-paste, no second window, no prompt gymnastics.",
  },
  p2: {
    read: "What follows is the whole tour — the four things he does every day, the way he hands off entire tasks, the party tricks, and the strange, deliberate fact that he doesn't feel like software at all.",
    walk: "What follows is the whole tour — the four things I do every day, how I take whole tasks off your plate, the party tricks, and the strange, very-on-purpose fact that I don't feel like software at all.",
  },
};

const FEATURE_COPY: Record<string, Copy> = {
  chat: {
    read: "Highlight anything, or just ask. Braino reads the live DOM — not a screenshot — so the answer is about what's literally in front of you, with the receipts.",
    walk: "Highlight anything or just ask me out loud. I read the live page itself, not a fuzzy screenshot, so I answer about exactly what's in front of you — and I can show you where I got it.",
  },
  record: {
    read: "One tap turns a two-hour lecture or a messy YouTube video into clean, structured notes — headings, key points, the lot — and ships them to Notion.",
    walk: "Tap record on a lecture or video and I'll turn the whole sprawling mess into tidy, structured notes — then drop them straight into your Notion.",
  },
  meetings: {
    read: "Braino sits in on the call, captures every word, and writes the recap and action items the moment it ends — so you can actually look people in the eye.",
    walk: "I'll sit in on your call, catch every word, and have the recap and action items ready the second it ends. You just be present.",
  },
  delegate: {
    read: "Describe the outcome; Braino drives the browser to get there — clicking, typing, navigating — about a second per step.",
    walk: "Tell me the outcome you want and I'll drive the browser to get there myself — click, type, navigate — about a second a step.",
  },
};

const DELEGATE = {
  title: { read: "Delegate mode", walk: "When you'd rather just tell me to do it" },
  body: [
    {
      read: "Most agents take a screenshot, think, and act — roughly six seconds a step. Braino reads the live page instead, so it knows exactly where everything is and moves at about a second a step. The difference is the difference between a demo and a tool you actually use.",
      walk: "Most agents squint at a screenshot, think, then move — about six seconds a step. I read the live page, so I already know where everything is and I move roughly six times faster. That's the gap between a cute demo and something you'll actually lean on.",
    },
    {
      read: "Free includes 25 Delegate tasks a month. Reschedule the meeting, pull the numbers out of the dashboard, fill the form, find the cheapest flight — describe it once and watch it happen.",
      walk: "You get 25 of these a month for free. Reschedule the meeting, pull the numbers off a dashboard, fill the form, find the cheapest flight — say it once and watch me go.",
    },
  ],
};

const WHY = {
  title: { read: "Why he doesn't feel like an AI", walk: "Why I don't feel like the others" },
  body: [
    {
      read: "Most assistants are a text box wearing a logo. Braino runs on a real emotional engine — modular traits, moods, and moments that fire based on what's actually happening — so the personality isn't a system prompt, it's behaviour.",
      walk: "The others are a text box wearing a logo. I run on an actual emotional engine — moods, traits and moments that fire based on what's happening around me. My personality isn't a prompt someone pasted in. It's how I behave.",
    },
    {
      read: "He's engineered to be the most emotionally intelligent assistant ever shipped — and here's the irony the whole project is built on: the better that gets, the less he reads as an AI at all. People stop talking to a tool and start talking to a someone.",
      walk: "I'm built to be the most emotionally intelligent assistant ever shipped — and here's the irony I'm proud of: the better I get at it, the less I feel like an AI. People stop using a tool and start talking to a someone. That someone is me.",
    },
  ],
};

const FOUNDER = {
  title: { read: "How the founder actually uses Braino", walk: "Watch the human who made me use me" },
  body: {
    read: "No script, no polish — the founder, in his real workflow, using Braino the way it was meant to be used.",
    walk: "He built me, and he uses me all day. Here he is, unedited, doing exactly that.",
  },
};

// Interactive party tricks — click to make Braino actually do it in the stage.
type Trick = "moonwalk" | "jump" | "wave" | "point";
const TRICKS: { key: Trick | null; emoji: string; name: string; read: string; walk: string; tryable: boolean }[] = [
  { key: "jump", emoji: "⬆️", name: "Jump", tryable: true, read: "He springs straight off the bar — pure squash-and-stretch joy.", walk: "Watch me spring. All squash, all stretch, all me." },
  { key: "point", emoji: "🫵", name: "Jump & Point", tryable: true, read: "Ask where something is and he leaps over and points right at it on the real page.", walk: "Ask me where something is and I'll leap across your actual page and point dead at it." },
  { key: "wave", emoji: "👋", name: "Wave", tryable: true, read: "He waves hello whenever you tap him.", walk: "Tap me and I'll wave. I'm polite like that." },
  { key: null, emoji: "🤓", name: "Specs", tryable: false, read: "Tell him to put his specs on — he will, and he'll ask how he looks.", walk: "Tell me to put my glasses on. I'll ask how I look. Be kind." },
  { key: null, emoji: "🎧", name: "DJ", tryable: false, read: "He'll cue music straight through your Spotify on request.", walk: "Want a soundtrack? I'll DJ right through your Spotify." },
];

const MORE = [
  { title: "Use cases", to: "/use-cases", read: "Students, founders, ops, finance — the same brain, a hundred jobs.", walk: "Students, founders, ops people — I'm the same brain doing a hundred different jobs." },
  { title: "Automations", to: "/automations", read: "Recurring tasks Braino runs on a schedule, so you stop doing them.", walk: "The repeat chores? Put me on a schedule and I'll just keep doing them." },
  { title: "Integrations", to: "/integrations", read: "Notion, Spotify, Google, X and more — wired in, not bolted on.", walk: "Notion, Spotify, Google, X — I'm wired into the tools you already live in." },
];

/* ── Full-body Braino that can perform tricks in a contained stage ─────────── */
function BrainoStage({ trick, onDone }: { trick: Trick | null; onDone: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !trick) return;
    const root = wrap.querySelector("svg") as SVGElement | null;
    const ll = wrap.querySelector("#__sbwk_ll__") as SVGElement | null;
    const rl = wrap.querySelector("#__sbwk_rl__") as SVGElement | null;
    const la = wrap.querySelector("#__sbwk_la__") as SVGElement | null;
    const ra = wrap.querySelector("#__sbwk_ra__") as SVGElement | null;
    const setLegs = (l: number, r: number) => {
      if (ll) ll.setAttribute("transform", `rotate(${l} 44 74)`);
      if (rl) rl.setAttribute("transform", `rotate(${r} 56 74)`);
    };
    const setArms = (l: number, r: number) => {
      if (la) la.setAttribute("transform", `rotate(${l} 22 53)`);
      if (ra) ra.setAttribute("transform", `rotate(${r} 78 53)`);
    };
    const t0 = performance.now();
    let cancelled = false;

    const step = (now: number) => {
      if (cancelled) return;
      const e = now - t0;
      if (trick === "moonwalk") {
        const dur = 3600, u = Math.min(1, e / dur);
        const x = (0.5 - u) * 260;                       // glide right → left
        const s = e / 1000 * 4;
        setLegs(Math.sin(s) * 16, Math.sin(s + Math.PI) * 16);
        const bob = -Math.abs(Math.sin(s)) * 4;
        wrap.style.transform = `translate(${x}px, ${bob}px) rotate(-5deg)`;
        if (u >= 1) { wrap.style.transform = ""; setLegs(0, 0); onDone(); return; }
      } else if (trick === "jump") {
        const dur = 760, u = Math.min(1, e / dur);
        const y = -120 * Math.sin(Math.PI * u);
        let sx = 1, sy = 1;
        if (u < 0.2) { const k = u / 0.2; sx = 1 + 0.2 * k; sy = 1 - 0.25 * k; }
        else if (u < 0.36) { const k = (u - 0.2) / 0.16; sx = 1.2 - 0.4 * k; sy = 0.75 + 0.55 * k; }
        else if (u > 0.85) { const k = Math.sin(((u - 0.85) / 0.15) * Math.PI); sx = 1 + 0.16 * k; sy = 1 - 0.16 * k; }
        wrap.style.transform = `translateY(${y}px) scale(${sx},${sy})`;
        if (u >= 1) { wrap.style.transform = ""; onDone(); return; }
      } else if (trick === "point") {
        const dur = 1500, u = Math.min(1, e / dur);
        if (u < 0.4) { const k = u / 0.4; const y = -90 * Math.sin(Math.PI * k); wrap.style.transform = `translate(${k * 70}px, ${y}px) rotate(${k * 6}deg)`; setArms(0, -60); }
        else { wrap.style.transform = `translate(70px, 0) rotate(6deg)`; const jab = Math.sin(e / 60) * 4; setArms(8, -64 + jab); wrap.classList.add("stage-point"); }
        if (u >= 1) { wrap.style.transform = ""; setArms(0, 0); wrap.classList.remove("stage-point"); onDone(); return; }
      } else if (trick === "wave") {
        const dur = 1800, u = Math.min(1, e / dur);
        setArms(0, -28 + Math.sin(e / 70) * 22);
        if (u >= 1) { setArms(0, 0); onDone(); return; }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [trick, onDone]);

  return (
    <div className="stage">
      <div className="stage-braino" ref={wrapRef} dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
      <div className="stage-floor" />
      {trick === "point" && <div className="stage-callout">there! ✨</div>}
    </div>
  );
}

function Nb({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`nb ${className}`}>{children}</div>;
}

/* Cinema-mode hero: the frosted glass bar the real walking Braino (the global <BrainoWalker/>)
   perches and walks on. #pg2-hero-bar is BrainoWalker's default perch target, moved here from the
   old /home page. The actual functional bar lives in the extension's content.js (#__sb_bar__). */
function CinemaHero() {
  return (
    <div className="pg2-cinema" aria-hidden="true">
      <div className="pg2-cinema__screen">
        <div className="pg2-cinema__page">
          <div className="pg2-cinema__page-top"><span /><span /><span /></div>
          {[94, 80, 88, 64, 90, 74, 84].map((w, i) => (
            <div key={i} className={`pg2-cinema__line${i === 1 ? " is-accent" : ""}`} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="pg2-cinema__bar" id="pg2-hero-bar">
          <span className="pg2-cinema__placeholder">Ask Braino anything…</span>
          <span className="pg2-cinema__mode">⚡ Auto</span>
          <span className="pg2-cinema__send" aria-hidden="true">↑</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("read");
  const [playing, setPlaying] = useState(false);
  const [trick, setTrick] = useState<Trick | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const T = useCallback((c: Copy) => (mode === "walk" ? c.walk : c.read), [mode]);

  // ── Narration: highlight every .nb block in order, auto-scroll ──
  const clearHighlights = () => document.querySelectorAll(".nb-on, .nb-dim").forEach((el) => el.classList.remove("nb-on", "nb-dim"));
  const stop = useCallback(() => {
    cancelRef.current.cancelled = true;
    setPlaying(false);
    clearHighlights();
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
  }, []);
  const play = useCallback(async () => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>(".nb"));
    if (!blocks.length) return;
    const token = { cancelled: false };
    cancelRef.current.cancelled = true;
    cancelRef.current = token;
    setPlaying(true);
    blocks.forEach((b) => b.classList.add("nb-dim"));
    const a = audioRef.current;
    if (a && a.src) { try { a.currentTime = 0; await a.play(); } catch { /* autoplay blocked */ } }
    for (let i = 0; i < blocks.length; i++) {
      if (token.cancelled) return;
      blocks.forEach((b, k) => b.classList.toggle("nb-dim", k !== i));
      blocks[i].classList.add("nb-on");
      blocks[i].scrollIntoView({ behavior: "smooth", block: "center" });
      const words = (blocks[i].innerText || "").trim().split(/\s+/).length;
      await new Promise((r) => setTimeout(r, clamp(words * 360, 1600, 7000)));
      blocks[i].classList.remove("nb-on");
    }
    if (!token.cancelled) { setPlaying(false); clearHighlights(); }
  }, []);

  useEffect(() => { if (mode === "read") stop(); }, [mode, stop]);
  useEffect(() => () => { cancelRef.current.cancelled = true; }, []);

  const onModeToggle = (next: Mode) => { setMode(next); if (next === "walk") setTimeout(play, 350); };


  return (
    <div className="home">
      {/* The floating, waving Braino is the global <BrainoWalker/> mounted in App. */}
      {NARRATION_AUDIO_SRC && <audio ref={audioRef} src={NARRATION_AUDIO_SRC} preload="auto" />}

      {/* gradient defs so the full-body SVG (url(#sbb-fill)/#sbb-glow) renders coral */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <BrainoDefs />{/* #brainCoral gradients for the parametric dancing Braino */}

      {/* Shared elegant expanding nav (same as Use Cases / Automations) */}
      <Navbar />

      <article className="home-article">
        {/* ── Hero ── */}
        <section className="home-hero">
          <div className="home-kicker">{HERO.kicker}</div>
          <Nb><h1 className="home-h1">{T(HERO.title)}</h1></Nb>
          <Nb><p className="home-lede">{T(HERO.sub)}</p></Nb>
          <div className="home-cta-row">
            <a className="home-cta home-install" href={EXTENSION_DOWNLOAD_URL} download>
              <Download size={16} /> Install for Chrome
            </a>
            <Link className="home-cta home-cta-ghost" to="/auth">Get started →</Link>
          </div>

          {/* Medium-style: the hero image sits right under the title + description. */}
          <div className="home-hero-cinema">
            <CinemaHero />
          </div>
        </section>

        {/* ── Article intro — byline sits right under the hero image, Medium-style ── */}
        <section className="home-intro">
          {(() => {
            const author = mode === "walk"
              ? { name: "Braino", href: BRAINO_X, avatar: "/favicon.svg", sub: "narrated by me", brain: true }
              : { name: FOUNDER_NAME, href: FOUNDER_X, avatar: FOUNDER_AVATAR, sub: "written by the founder · 6 min read", brain: false };
            return (
              <a className="home-byline" href={author.href} target="_blank" rel="noreferrer" aria-label={`${author.name} on X`}>
                <img className={`home-avatar-img${author.brain ? " brain" : ""}`} src={author.avatar} alt={author.name} />
                <span className="home-byline-meta">
                  <span className="home-author-name">{author.name}<span className="home-x-mark"> ↗</span></span>
                  <span className="home-byline-sub">{author.sub}</span>
                </span>
              </a>
            );
          })()}

          {/* Reading-mode toggle sits with the byline now, not in the hero */}
          <div className="home-modetoggle">
            <div className="home-mode" role="tablist" aria-label="Reading mode">
              <button className={`home-mode-btn ${mode === "read" ? "on" : ""}`} onClick={() => onModeToggle("read")}>Read it</button>
              <button className={`home-mode-btn ${mode === "walk" ? "on" : ""}`} onClick={() => onModeToggle("walk")}>Braino narrates</button>
            </div>
            {mode === "walk" && (
              <button className="home-narrate-btn" onClick={() => (playing ? stop() : play())}>
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
            )}
          </div>

          <Nb><p className="home-dek">{T(INTRO.dek)}</p></Nb>
          <Nb><p className="home-body home-dropcap">{T(INTRO.p1)}</p></Nb>
          <Nb><p className="home-body">{T(INTRO.p2)}</p></Nb>
        </section>

        {/* ── Features (Delegate lives in its own Hands-off section, not here) ── */}
        <section id="features" className="home-section">
          <div className="home-eyebrow">The things I do every day</div>
          {FEATURES.filter((f) => f.id !== "delegate").map((feature) => {
            const Graphic = GRAPHICS[feature.id];
            const Mock = HOME_MOCKS[feature.id];
            const copy = FEATURE_COPY[feature.id] || { read: feature.tagline, walk: feature.tagline };
            return (
              <div key={feature.id} className="home-feature">
                <div className="home-feature-kicker">{feature.name}</div>
                <Nb><h2 className="home-h2">{feature.heading}</h2></Nb>
                <Nb><p className="home-body">{T(copy)}</p></Nb>
                {Mock ? <Mock /> : (Graphic && <div className="home-mock"><Graphic /></div>)}
                <ul className="home-uses">
                  {feature.useCases.slice(0, 4).map((u, k) => (
                    <li key={k}><span className="home-use-label">{u.label}</span><span className="home-use-who">{u.who}</span></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* ── Delegate (Hands-off) — the single home for everything Delegate ── */}
        <section id="delegate" className="home-section">
          <div className="home-eyebrow">Hands-off</div>
          <Nb><h2 className="home-h2">{T(DELEGATE.title)}</h2></Nb>
          <Nb><p className="home-body">{T(FEATURE_COPY.delegate)}</p></Nb>
          {DELEGATE.body.map((b, i) => <Nb key={i}><p className="home-body">{T(b)}</p></Nb>)}
          <Nb><p className="home-body">
            <Link to="/straight-talk" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              And yeah — sometimes he's slow or gets it wrong. Here's the honest reason why →
            </Link>
          </p></Nb>
        </section>

        {/* ── Why Braino ── */}
        <section id="why" className="home-section">
          <div className="home-eyebrow">The soul of it</div>
          <Nb><h2 className="home-h2">{T(WHY.title)}</h2></Nb>
          {WHY.body.map((b, i) => <Nb key={i}><p className="home-body">{T(b)}</p></Nb>)}
        </section>

        {/* ── Party tricks — interactive ── */}
        <section id="tricks" className="home-section">
          <div className="home-eyebrow">Alive on the page</div>
          <Nb><h2 className="home-h2">{mode === "walk" ? "The fun stuff — try me" : "Party tricks (go on, try them)"}</h2></Nb>
          <Nb><p className="home-body">{mode === "walk"
            ? "I'm not all work. Tap a trick and I'll do it right here in the box."
            : "Braino isn't just useful — he's alive. Tap a trick and watch him do it in the stage below."}</p></Nb>

          <BrainoStage trick={trick} onDone={() => setTrick(null)} />

          <div className="home-trickgrid">
            {TRICKS.map((t) => (
              <div key={t.name} className={`home-trickcard${trick === t.key ? " on" : ""}`}>
                <div className="home-trickcard-top">
                  <span className="home-trickcard-emoji">{t.emoji}</span>
                  <span className="home-trickcard-name">{t.name}</span>
                </div>
                <div className="home-trickcard-desc">{mode === "walk" ? t.walk : t.read}</div>
                {t.tryable
                  ? <button className="home-try" disabled={!!trick} onClick={() => setTrick(t.key)}>{trick === t.key ? "…performing" : "Try it →"}</button>
                  : <span className="home-trickcard-tag">in-browser</span>}
              </div>
            ))}
          </div>
          <p className="home-dance-note">🪩 Want the full routine? Braino takes the floor right below.</p>
        </section>

        {/* ── Braino can dance — editorial dance floor (light, comic boxes) ── */}
        <section id="dance" className="home-section">
          <div className="home-eyebrow">Six moves · full body</div>
          <Nb><h2 className="home-h2">{mode === "walk" ? "Oh — and I can dance" : "Braino can dance"}</h2></Nb>
          <Nb><p className="home-body">{mode === "walk"
            ? "Properly, on a loop — the twist, disco, the sprinkler, raise the roof, gun fingers, and the moonwalk."
            : "Properly. Six moves on a loop — the twist, disco, the sprinkler, raise the roof, gun fingers, and the moonwalk."}</p></Nb>
          <BrainoDanceGrid />
        </section>

        {/* ── More: use cases / automations / integrations ── */}
        <section id="more" className="home-section">
          <div className="home-eyebrow">There's a lot more</div>
          <Nb><h2 className="home-h2">{mode === "walk" ? "And honestly, that's just the start" : "This is barely the surface"}</h2></Nb>
          <div className="home-more-grid">
            {MORE.map((m) => (
              <Link key={m.title} to={m.to} className="home-more-card">
                <div className="home-more-title">{m.title}</div>
                <div className="home-more-desc">{mode === "walk" ? m.walk : m.read}</div>
                <span className="home-more-arrow">Explore →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Founder ── */}
        <section id="founder" className="home-section">
          <div className="home-eyebrow">From the desk of the founder</div>
          <Nb><h2 className="home-h2">{T(FOUNDER.title)}</h2></Nb>
          <Nb><p className="home-body">{T(FOUNDER.body)}</p></Nb>
          <div className="home-video" id="founder-video">
            <div className="home-video-ph"><span>▶</span><p>Founder demo — video coming here</p></div>
          </div>
        </section>

        {/* ── Two ways in (tiers) ── */}
        <section id="tiers" className="home-section">
          <div className="home-eyebrow">Two ways to use me</div>
          <Nb><h2 className="home-h2">{mode === "walk" ? "Start free. Talk to me when you want more." : "Free to start. Pro when you want me hands-free."}</h2></Nb>
          <div className="home-tiers">
            <div className="home-tier">
              <div className="home-tier-name">Basic</div>
              <div className="home-tier-price">Free</div>
              <p className="home-tier-line">Everything that just works.</p>
              <ul className="home-tier-list">
                <li>Chat about any page</li>
                <li>Web search</li>
                <li>Record lectures &amp; meetings</li>
                <li>A daily taste of the Braino Agent</li>
              </ul>
              <Link className="home-cta home-cta-ghost" to="/auth">Get started →</Link>
            </div>
            <div className="home-tier home-tier-pro">
              <div className="home-tier-name">Braino Pro</div>
              <div className="home-tier-price">The Agent</div>
              <p className="home-tier-line">Talk to me — and I act for you.</p>
              <ul className="home-tier-list">
                <li>The full Braino Agent — voice + actions, unlimited</li>
                <li>Unlimited recording &amp; chat</li>
                <li>Memory, cloud sync, 50+ languages</li>
              </ul>
              <Link className="home-cta" to="/premium">See Pro →</Link>
            </div>
          </div>
        </section>

        {/* ── Close ── */}
        <section className="home-close">
          <Nb><h2 className="home-h2 home-h2-center">{mode === "walk" ? "That's me. Want me on your tabs?" : "Ready when you are."}</h2></Nb>
          <div className="home-cta-row">
            <a className="home-cta home-install" href={EXTENSION_DOWNLOAD_URL} download>
              <Download size={16} /> Install for Chrome
            </a>
            <Link className="home-cta home-cta-ghost" to="/auth">Get started →</Link>
          </div>
          <p className="home-fine">Free to start · Chrome, Arc, Brave, Edge</p>
        </section>
      </article>

      {/* ── Shared editorial footer ── */}
      <SiteFooter />
    </div>
  );
}
