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
import {
  serif, readFont, mono, wrap, Eyebrow, Section,
  heroCta, ghostBtnLink, neutralCard, CheckIcon, ArrowIcon,
} from "@/lib/editorial";
import "./home.css";

/* ============================================================================
   Home, an editorial "Medium theme" walkthrough of Braino.
   Same system as Integrations / Premium: Instrument Serif display headings with
   an italic-coral accent, Newsreader body, mono pip eyebrows, and alternating
   --sb-* token bands (so light/dark flips for free).
   Interactive machinery preserved intact:
     "Read it" vs "Braino narrates" (first-person copy + auto-scroll narration
     over the .nb blocks), the CinemaHero perch (#pg2-hero-bar) the walking
     mascot stands on, the party-trick stage, and the dance grid.
   ============================================================================ */

const NARRATION_AUDIO_SRC = ""; // set to the recorded VO when ready, e.g. "/braino-walkthrough.mp3"

type Mode = "read" | "walk";
interface Copy { read: string; walk: string; }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── Author / byline ──
// Read mode = the founder (you) is the author; Walk mode = Braino is.
const BRAINO_X = "https://x.com/brainosays";
const FOUNDER_NAME = "Itish Pande";
// TODO(itish): confirm your X handle, used for both the link and the avatar.
const FOUNDER_X_HANDLE = "itishpande";
const FOUNDER_X = `https://x.com/${FOUNDER_X_HANDLE}`;
// Avatar: pulled from your X profile pic via unavatar. Swap to a local image
// (e.g. "/itish.jpg" dropped in public/) anytime if you'd rather self-host it.
const FOUNDER_AVATAR = `https://unavatar.io/x/${FOUNDER_X_HANDLE}`;

const HERO = {
  kicker: "An AI that lives in your browser",
  title: { read: "Meet Braino.", walk: "Hi. I'm Braino." },
  sub: {
    read: "A little brain that floats on every tab. It reads the page, talks it through, takes your notes, and quietly does the clicking for you.",
    walk: "I live on every tab you open. I read what's on your screen, talk you through it, take your notes, and handle the boring clicks. Come on, let me show you around.",
  },
};

const INTRO = {
  dek: {
    read: "Everyone's shipping a chat box. Braino is the opposite bet: a character that actually lives on your screen, sees what you see, and helps without being asked twice.",
    walk: "Everyone else built a chat box and called it a day. I'm the opposite bet. I'm a character who lives on your screen, sees what you see, and helps before you have to ask twice.",
  },
  p1: {
    read: "Open any page and Braino is already there in the corner. Highlight a paragraph and he explains it. Hit record on a lecture and he writes the notes. Tell him to book the thing, and he opens the tab and books the thing. No copy-paste, no second window, no prompt engineering.",
    walk: "Open any page and I'm already in the corner. Highlight a paragraph and I'll explain it. Press record on a lecture and I'll write the notes. Tell me to book the thing and I'll open the tab and book it. No copy-paste, no second window, no prompt gymnastics.",
  },
  p2: {
    read: "What follows is the whole tour. The four things he does every day, the way he hands off entire tasks, the party tricks, and the strange, deliberate fact that he doesn't feel like software at all.",
    walk: "What follows is the whole tour. The four things I do every day, how I take whole tasks off your plate, the party tricks, and the strange, very-on-purpose fact that I don't feel like software at all.",
  },
};

const FEATURE_COPY: Record<string, Copy> = {
  chat: {
    read: "Highlight anything, or just ask. Braino reads the live DOM, not a screenshot, so the answer is about what's literally in front of you, with the receipts.",
    walk: "Highlight anything or just ask me out loud. I read the live page itself, not a fuzzy screenshot, so I answer about exactly what's in front of you, and I can show you where I got it.",
  },
  record: {
    read: "One tap turns a two-hour lecture or a messy YouTube video into clean, structured notes (headings, key points, the lot) and ships them to Notion.",
    walk: "Tap record on a lecture or video and I'll turn the whole sprawling mess into tidy, structured notes, then drop them straight into your Notion.",
  },
  meetings: {
    read: "Braino sits in on the call, captures every word, and writes the recap and action items the moment it ends, so you can actually look people in the eye.",
    walk: "I'll sit in on your call, catch every word, and have the recap and action items ready the second it ends. You just be present.",
  },
  delegate: {
    read: "Describe the outcome. Braino drives the browser to get there, clicking, typing, navigating, about a second per step.",
    walk: "Tell me the outcome you want and I'll drive the browser to get there myself. Click, type, navigate, about a second a step.",
  },
};

const DELEGATE = {
  title: { read: "Delegate mode", walk: "When you'd rather just tell me to do it" },
  body: [
    {
      read: "Most agents take a screenshot, think, and act, roughly six seconds a step. Braino reads the live page instead, so it knows exactly where everything is and moves at about a second a step. The difference is the difference between a demo and a tool you actually use.",
      walk: "Most agents squint at a screenshot, think, then move, about six seconds a step. I read the live page, so I already know where everything is and I move roughly six times faster. That's the gap between a cute demo and something you'll actually lean on.",
    },
    {
      read: "Free includes 25 Delegate tasks a month. Reschedule the meeting, pull the numbers out of the dashboard, fill the form, find the cheapest flight. Describe it once and watch it happen.",
      walk: "You get 25 of these a month for free. Reschedule the meeting, pull the numbers off a dashboard, fill the form, find the cheapest flight. Say it once and watch me go.",
    },
  ],
};

const WHY = {
  title: { read: "Why he doesn't feel like an AI", walk: "Why I don't feel like the others" },
  body: [
    {
      read: "Most assistants are a text box wearing a logo. Braino runs on a real emotional engine (modular traits, moods, and moments that fire based on what's actually happening) so the personality isn't a system prompt, it's behaviour.",
      walk: "The others are a text box wearing a logo. I run on an actual emotional engine, moods, traits and moments that fire based on what's happening around me. My personality isn't a prompt someone pasted in. It's how I behave.",
    },
    {
      read: "He's engineered to be the most emotionally intelligent assistant ever shipped, and here's the irony the whole project is built on: the better that gets, the less he reads as an AI at all. People stop talking to a tool and start talking to a someone.",
      walk: "I'm built to be the most emotionally intelligent assistant ever shipped, and here's the irony I'm proud of: the better I get at it, the less I feel like an AI. People stop using a tool and start talking to a someone. That someone is me.",
    },
  ],
};

const FOUNDER = {
  title: { read: "How the founder actually uses Braino", walk: "Watch the human who made me use me" },
  body: {
    read: "No script, no polish. The founder, in his real workflow, using Braino the way it was meant to be used.",
    walk: "He built me, and he uses me all day. Here he is, unedited, doing exactly that.",
  },
};

// Interactive party tricks, click to make Braino actually do it in the stage.
type Trick = "moonwalk" | "jump" | "wave" | "point";
const TRICKS: { key: Trick | null; emoji: string; name: string; read: string; walk: string; tryable: boolean }[] = [
  { key: "jump", emoji: "⬆️", name: "Jump", tryable: true, read: "He springs straight off the bar, pure squash-and-stretch joy.", walk: "Watch me spring. All squash, all stretch, all me." },
  { key: "point", emoji: "🫵", name: "Jump & Point", tryable: true, read: "Ask where something is and he leaps over and points right at it on the real page.", walk: "Ask me where something is and I'll leap across your actual page and point dead at it." },
  { key: "wave", emoji: "👋", name: "Wave", tryable: true, read: "He waves hello whenever you tap him.", walk: "Tap me and I'll wave. I'm polite like that." },
  { key: null, emoji: "🤓", name: "Specs", tryable: false, read: "Tell him to put his specs on. He will, and he'll ask how he looks.", walk: "Tell me to put my glasses on. I'll ask how I look. Be kind." },
  { key: null, emoji: "🎧", name: "DJ", tryable: false, read: "He'll cue music straight through your Spotify on request.", walk: "Want a soundtrack? I'll DJ right through your Spotify." },
];

const MORE = [
  { title: "Use cases", to: "/use-cases", read: "Students, founders, ops, finance. The same brain, a hundred jobs.", walk: "Students, founders, ops people. I'm the same brain doing a hundred different jobs." },
  { title: "Automations", to: "/automations", read: "Recurring tasks Braino runs on a schedule, so you stop doing them.", walk: "The repeat chores? Put me on a schedule and I'll just keep doing them." },
  { title: "Integrations", to: "/integrations", read: "Notion, Spotify, Google, X and more, wired in, not bolted on.", walk: "Notion, Spotify, Google, X. I'm wired into the tools you already live in." },
];

// ── Editorial typography helpers (shared by every section) ──
const accentEm: React.CSSProperties = { fontStyle: "italic", color: "var(--sb-accent-deep)" };
const h2Style: React.CSSProperties = {
  fontFamily: serif, fontWeight: 400, fontSize: "clamp(30px,4.2vw,50px)", lineHeight: 1.05,
  letterSpacing: "-0.022em", color: "var(--sb-ink)", margin: "14px 0 0",
};
const bodyStyle: React.CSSProperties = {
  fontFamily: readFont, fontSize: 20, lineHeight: 1.75, color: "var(--sb-ink)", margin: "20px 0 0",
};
const dekStyle: React.CSSProperties = {
  fontFamily: readFont, fontSize: 22, lineHeight: 1.6, color: "var(--sb-ink-2)", margin: "18px 0 0",
};
const col = { ...wrap, maxWidth: 720 } as React.CSSProperties;

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

  // Split the hero title so "Braino." renders in the italic-coral accent.
  const titleText = T(HERO.title);
  const [titlePre, titlePost] = titleText.split("Braino");

  const segBtn = (active: boolean): React.CSSProperties => ({
    border: "none", cursor: "pointer", padding: "7px 15px", borderRadius: 999,
    fontSize: 13, fontWeight: 500, fontFamily: "inherit",
    background: active ? "var(--sb-ink)" : "transparent",
    color: active ? "var(--sb-on-ink)" : "var(--sb-ink-2)",
    transition: "background .15s, color .15s",
  });

  return (
    <div className="home" style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
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

      {/* ── Hero ── */}
      <section style={{ padding: "132px 0 8px" }}>
        <div style={{ ...wrap, maxWidth: 860 }}>
          <Eyebrow>{HERO.kicker}</Eyebrow>
          <Nb>
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(48px,7.6vw,94px)", lineHeight: 0.98, letterSpacing: "-0.03em", color: "var(--sb-ink)", margin: "18px 0 0" }}>
              {titlePre}<em style={accentEm}>Braino{titlePost}</em>
            </h1>
          </Nb>
          <Nb>
            <p style={{ fontFamily: readFont, fontSize: 23, lineHeight: 1.55, color: "var(--sb-ink-2)", maxWidth: 640, margin: "22px 0 0" }}>
              {T(HERO.sub)}
            </p>
          </Nb>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "32px 0 0" }}>
            <a className="home-install" href={EXTENSION_DOWNLOAD_URL} download style={heroCta}>
              <Download size={16} /> Install for Chrome
            </a>
            <Link to="/auth" style={ghostBtnLink}>Get started →</Link>
          </div>

          {/* Medium-style: the hero image sits right under the title + description. */}
          <div style={{ margin: "48px 0 0" }}>
            <CinemaHero />
          </div>
        </div>
      </section>

      {/* ── Article intro: byline + mode toggle + lede ── */}
      <section style={{ padding: "26px 0 64px" }}>
        <div style={col}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
            {(() => {
              const author = mode === "walk"
                ? { name: "Braino", href: BRAINO_X, avatar: "/favicon.svg", sub: "narrated by me", brain: true }
                : { name: FOUNDER_NAME, href: FOUNDER_X, avatar: FOUNDER_AVATAR, sub: "written by the founder · 6 min read", brain: false };
              return (
                <a href={author.href} target="_blank" rel="noreferrer" aria-label={`${author.name} on X`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
                  <img src={author.avatar} alt={author.name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--sb-line-2)", background: author.brain ? "var(--sb-panel)" : undefined, padding: author.brain ? 6 : 0 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{author.name}<span style={{ color: "var(--sb-ink-3)" }}> ↗</span></span>
                    <span style={{ ...mono, fontSize: 12, color: "var(--sb-ink-3)" }}>{author.sub}</span>
                  </span>
                </a>
              );
            })()}

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div role="tablist" aria-label="Reading mode"
                style={{ display: "inline-flex", padding: 4, gap: 4, background: "var(--sb-panel)", border: "1px solid var(--sb-line)", borderRadius: 999 }}>
                <button onClick={() => onModeToggle("read")} style={segBtn(mode === "read")}>Read it</button>
                <button onClick={() => onModeToggle("walk")} style={segBtn(mode === "walk")}>Braino narrates</button>
              </div>
              {mode === "walk" && (
                <button onClick={() => (playing ? stop() : play())} style={{ ...ghostBtnLink, padding: "9px 16px", fontSize: 13 }}>
                  {playing ? "❚❚ Pause" : "▶ Play"}
                </button>
              )}
            </div>
          </div>

          <hr style={{ height: 1, background: "var(--sb-line)", border: 0, margin: "28px 0 0" }} />

          <Nb><p style={{ ...dekStyle, margin: "28px 0 0" }}>{T(INTRO.dek)}</p></Nb>
          <Nb><p style={bodyStyle}>{T(INTRO.p1)}</p></Nb>
          <Nb><p style={bodyStyle}>{T(INTRO.p2)}</p></Nb>
        </div>
      </section>

      {/* ── Features (Delegate lives in its own Hands-off section, not here) ── */}
      <Section tone="2" pad="82px 0">
        <div style={col}>
          <Eyebrow>The things I do every day</Eyebrow>
          <div style={{ height: 28 }} />
          {FEATURES.filter((f) => f.id !== "delegate").map((feature, idx) => {
            const Graphic = GRAPHICS[feature.id];
            const Mock = HOME_MOCKS[feature.id];
            const copy = FEATURE_COPY[feature.id] || { read: feature.tagline, walk: feature.tagline };
            return (
              <div key={feature.id} style={{ marginTop: idx === 0 ? 0 : 56, paddingTop: idx === 0 ? 0 : 48, borderTop: idx === 0 ? "none" : "1px solid var(--sb-line-2)" }}>
                <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-deep)" }}>{feature.name}</div>
                <Nb><h2 style={h2Style}>{feature.heading}</h2></Nb>
                <Nb><p style={bodyStyle}>{T(copy)}</p></Nb>
                <div style={{ marginTop: 26 }}>
                  {Mock ? <Mock /> : (Graphic && <div className="home-mock"><Graphic /></div>)}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0 24px" }}>
                  {feature.useCases.slice(0, 4).map((u, k) => (
                    <li key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", padding: "12px 0", borderTop: "1px solid var(--sb-line-2)" }}>
                      <span style={{ fontSize: 15, color: "var(--sb-ink)", fontWeight: 500 }}>{u.label}</span>
                      <span style={{ ...mono, fontSize: 11, color: "var(--sb-ink-3)", whiteSpace: "nowrap" }}>{u.who}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Delegate (Hands-off) ── */}
      <Section tone="1" pad="82px 0">
        <div style={col}>
          <Eyebrow>Hands-off</Eyebrow>
          <Nb><h2 style={h2Style}>{T(DELEGATE.title)}</h2></Nb>
          <Nb><p style={bodyStyle}>{T(FEATURE_COPY.delegate)}</p></Nb>
          {DELEGATE.body.map((b, i) => <Nb key={i}><p style={bodyStyle}>{T(b)}</p></Nb>)}
          <Nb>
            <p style={{ ...bodyStyle, fontSize: 18 }}>
              <Link to="/straight-talk" style={{ color: "var(--sb-accent-deep)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                And yeah, sometimes he's slow or gets it wrong. Here's the honest reason why →
              </Link>
            </p>
          </Nb>
        </div>
      </Section>

      {/* ── Why Braino ── */}
      <Section tone="2" pad="82px 0">
        <div style={col}>
          <Eyebrow>The soul of it</Eyebrow>
          <Nb><h2 style={h2Style}>{T(WHY.title)}</h2></Nb>
          {WHY.body.map((b, i) => <Nb key={i}><p style={bodyStyle}>{T(b)}</p></Nb>)}
        </div>
      </Section>

      {/* ── Party tricks, interactive ── */}
      <Section tone="1" pad="82px 0">
        <div style={col}>
          <Eyebrow>Alive on the page</Eyebrow>
          <Nb><h2 style={h2Style}>{mode === "walk" ? "The fun stuff, try me" : "Party tricks (go on, try them)"}</h2></Nb>
          <Nb><p style={bodyStyle}>{mode === "walk"
            ? "I'm not all work. Tap a trick and I'll do it right here in the box."
            : "Braino isn't just useful, he's alive. Tap a trick and watch him do it in the stage below."}</p></Nb>

          <div style={{ marginTop: 30 }}>
            <BrainoStage trick={trick} onDone={() => setTrick(null)} />
          </div>

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
          <p style={{ ...mono, fontSize: 12.5, color: "var(--sb-ink-3)", marginTop: 22 }}>🪩 Want the full routine? Braino takes the floor right below.</p>
        </div>
      </Section>

      {/* ── Braino can dance ── */}
      <Section tone="2" pad="82px 0">
        <div style={col}>
          <Eyebrow>Six moves · full body</Eyebrow>
          <Nb><h2 style={h2Style}>{mode === "walk" ? "Oh, and I can dance" : "Braino can dance"}</h2></Nb>
          <Nb><p style={bodyStyle}>{mode === "walk"
            ? "Properly, on a loop: the twist, disco, the sprinkler, raise the roof, gun fingers, and the moonwalk."
            : "Properly. Six moves on a loop: the twist, disco, the sprinkler, raise the roof, gun fingers, and the moonwalk."}</p></Nb>
          <div style={{ marginTop: 28 }}><BrainoDanceGrid /></div>
        </div>
      </Section>

      {/* ── More: use cases / automations / integrations ── */}
      <Section tone="1" pad="82px 0">
        <div style={{ ...wrap, maxWidth: 980 }}>
          <div style={col}>
            <Eyebrow>There's a lot more</Eyebrow>
            <Nb><h2 style={h2Style}>{mode === "walk" ? "And honestly, that's just the start" : "This is barely the surface"}</h2></Nb>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginTop: 36 }}>
            {MORE.map((m) => (
              <Link key={m.title} to={m.to} style={{ ...neutralCard, textDecoration: "none", gap: 10, transition: "transform .15s, border-color .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--sb-accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--sb-line-2)"; }}>
                <div style={{ fontFamily: serif, fontSize: 27, color: "var(--sb-ink)" }}>{m.title}</div>
                <div style={{ fontFamily: readFont, fontSize: 17, lineHeight: 1.5, color: "var(--sb-ink-2)", flex: 1 }}>{mode === "walk" ? m.walk : m.read}</div>
                <span style={{ ...mono, fontSize: 12, color: "var(--sb-accent-deep)", display: "inline-flex", alignItems: "center", gap: 6 }}>Explore <ArrowIcon /></span>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Founder ── */}
      <Section tone="2" pad="82px 0">
        <div style={col}>
          <Eyebrow>From the desk of the founder</Eyebrow>
          <Nb><h2 style={h2Style}>{T(FOUNDER.title)}</h2></Nb>
          <Nb><p style={bodyStyle}>{T(FOUNDER.body)}</p></Nb>
          <div id="founder-video" style={{ marginTop: 28, aspectRatio: "16 / 9", borderRadius: 18, border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", display: "grid", placeItems: "center", color: "var(--sb-ink-3)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>▶</div>
              <p style={{ ...mono, fontSize: 12, marginTop: 8 }}>Founder demo, video coming here</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Two ways in (tiers) ── */}
      <Section tone="1" pad="82px 0">
        <div style={{ ...wrap, maxWidth: 900 }}>
          <div style={col}>
            <Eyebrow>Two ways to use me</Eyebrow>
            <Nb><h2 style={h2Style}>{mode === "walk" ? "Start free. Talk to me when you want more." : "Free to start. Pro when you want me hands-free."}</h2></Nb>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 22, marginTop: 36, alignItems: "stretch" }}>
            {/* Basic */}
            <div style={neutralCard}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>Basic</div>
              <div style={{ fontFamily: serif, fontSize: 44, lineHeight: 1, color: "var(--sb-ink)" }}>Free</div>
              <p style={{ color: "var(--sb-ink-2)", fontSize: 14.5, margin: 0 }}>Everything that just works.</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "6px 0", display: "flex", flexDirection: "column", gap: 11 }}>
                {["Chat about any page", "Web search", "Record lectures & meetings", "A daily taste of the Braino Agent"].map((f) => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45 }}><span style={{ color: "var(--sb-accent-deep)", marginTop: 2, flexShrink: 0 }}><CheckIcon /></span>{f}</li>
                ))}
              </ul>
              <div style={{ flex: 1 }} />
              <Link to="/auth" style={{ ...ghostBtnLink, justifyContent: "center", width: "100%" }}>Get started →</Link>
            </div>
            {/* Pro */}
            <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 14, position: "relative", outline: "2px solid var(--sb-accent)", boxShadow: "0 0 0 1px var(--sb-accent), 0 12px 50px rgba(226,125,57,0.35)" }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--sb-accent-2)" }}>Braino Pro</div>
              <div style={{ fontFamily: serif, fontSize: 44, lineHeight: 1, color: "#FBF7F1" }}>The Agent</div>
              <p style={{ color: "rgba(251,247,241,0.7)", fontSize: 14.5, margin: 0 }}>Talk to me, and I act for you.</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "6px 0", display: "flex", flexDirection: "column", gap: 11 }}>
                {["The full Braino Agent, voice + actions, unlimited", "Unlimited recording & chat", "Memory, cloud sync, 50+ languages"].map((f) => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, color: "rgba(251,247,241,0.9)" }}><span style={{ color: "var(--sb-accent-2)", marginTop: 2, flexShrink: 0 }}><CheckIcon /></span>{f}</li>
                ))}
              </ul>
              <div style={{ flex: 1 }} />
              <Link to="/premium" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", borderRadius: 999, fontSize: 14.5, fontWeight: 600, background: "#FBF7F1", color: "#1B1713", textDecoration: "none", width: "100%" }}>See Pro →</Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Close ── */}
      <Section tone="2" pad="96px 0 104px">
        <div style={{ ...col, textAlign: "center" }}>
          <Nb><h2 style={{ ...h2Style, fontSize: "clamp(34px,5vw,58px)", margin: 0 }}>{mode === "walk" ? "That's me. Want me on your tabs?" : "Ready when you are."}</h2></Nb>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", margin: "30px 0 0" }}>
            <a className="home-install" href={EXTENSION_DOWNLOAD_URL} download style={heroCta}>
              <Download size={16} /> Install for Chrome
            </a>
            <Link to="/auth" style={ghostBtnLink}>Get started →</Link>
          </div>
          <p style={{ ...mono, fontSize: 12, color: "var(--sb-ink-3)", marginTop: 18 }}>Free to start · Chrome, Arc, Brave, Edge</p>
        </div>
      </Section>

      {/* ── Shared editorial footer ── */}
      <SiteFooter />
    </div>
  );
}
