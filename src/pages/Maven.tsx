import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, useAffReveal } from "@/components/affPage";
import { AppLogo } from "@/components/AppLogo";
import { MacMenuBar } from "./aff-figures";
import "./affectiveos-page.css";
import "./braino-page.css";
import "./affective.css";
import "./affective-home.css";
import "./maven.css";

/* Maven (2026-10-26): agentic dictation for the Mac, its own product by
   Affective (it grew out of BrainoHERA). Copy is Itish's "Maven website copy
   v2"; the page is built from the home page's parts, like /braino and
   /foundry. The mark is two slanted pills that fade from ink to air. */

export function MavenMark({ size = 120 }: { size?: number }) {
  return (
    <svg className="mv-mark" width={size} height={size * 0.625} viewBox="0 0 240 150" role="img" aria-label="Maven">
      <defs>
        <linearGradient id="mv-fade" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="0.45" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(72 75) rotate(41)" fill="url(#mv-fade)" />
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(168 75) rotate(41)" fill="url(#mv-fade)" />
    </svg>
  );
}

/* Maven's face: the two bars are its eyes. No mouth, no body, nothing of
   Braino. It is alive through small things only: it breathes, blinks, looks
   at your pointer, and each mood is one change in how the bars sit. */
type Mood = "idle" | "listening" | "thinking" | "happy" | "sleepy";
const MOODS: { key: Mood; label: string; note: string }[] = [
  { key: "idle", label: "Waiting", note: "Breathes, blinks now and then, and watches your pointer." },
  { key: "listening", label: "Listening", note: "Your voice moves through both bars, the same wave in each." },
  { key: "thinking", label: "Thinking", note: "Still, and a little closer together, while it works out what you meant." },
  { key: "happy", label: "Done", note: "A small hop when your words land." },
];

export function MavenFace({ mood }: { mood: Mood }) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      setLook({ x: Math.max(-1, Math.min(1, dx * 2.2)), y: Math.max(-1, Math.min(1, dy * 2.2)) });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useEffect(() => {
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 140); next(); }, 2200 + Math.random() * 2800); };
    next();
    return () => clearTimeout(t);
  }, []);
  const follow = mood === "idle" || mood === "listening";
  return (
    <div ref={ref} className={`mv-face is-${mood}${blink && mood !== "sleepy" ? " is-blink" : ""}`}
      style={{ ["--lx" as string]: follow ? look.x.toFixed(3) : 0, ["--ly" as string]: follow ? look.y.toFixed(3) : 0 }} aria-hidden="true">
      <div className="mv-eyes">
        {[0, 1].map((e) => (
          <span key={e} className="mv-eye">
            <span className="mv-wave">{[0, 1, 2, 3, 4].map((d) => <i key={d} style={{ ["--i" as string]: d }} />)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* Types a line once it is on screen, the way Maven pastes it. */
function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return [ref, on] as const;
}

type MvScene = { app: string; ask: string; title: string; p: string; out: string[]; field: string; wait?: string };
const SCENES: MvScene[] = [
  { app: "Slack", field: "Message #launch", ask: "Tell Rahul the deck is done, numbers by five.", title: "Type", p: "Hold a key, talk, and clean, formatted text shows up in any app you use. Punctuation in, filler out, names spelled right.", out: ["@Rahul the deck is done. Numbers by 5 PM."] },
  { app: "Notes", field: "Groceries", ask: "I need eggs, mango, strawberries, peanut butter and oat milk.", title: "Lists that look like lists", p: "Say four things and you get a list, not a run-on sentence. Rupees, lakhs and phone numbers come out the way you write them.", out: ["I need:", "- Eggs", "- Mango", "- Strawberries", "- Peanut butter", "- Oat milk"] },
  { app: "Chrome", field: "Shipping address", ask: "Fill in my address.", title: "Do", p: "Open an app. Switch a tab. Fill a form. Small jobs on your Mac, by voice. It stops before anything is sent.", out: ["Itish Pande", "12, 4th Cross, Indiranagar", "Bengaluru 560038"], wait: "Waiting for your yes to submit" },
  { app: "Notes", field: "Launch list", ask: "Add that to my launch list.", title: "Remember", p: "Your names, your lists, your way of writing. Say it once, and Maven keeps it.", out: ["- Record the Maven film", "- Send the deck to Rahul ✓ added"] },
];

function MvSceneRow({ s, n, flip }: { s: MvScene; n: number; flip: boolean }) {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const [phase, setPhase] = useState(0); // 0 listening, 1 typed
  useEffect(() => {
    if (!on) return;
    const t = window.setTimeout(() => setPhase(1), 1800);
    return () => clearTimeout(t);
  }, [on]);
  return (
    <div ref={ref} className={"bs-row mv-row" + (flip ? " is-flip" : "") + (on ? " is-in" : "")} style={{ top: `calc(84px + ${n * 14}px)`, zIndex: n }}>
      <div className="bs-talk">
        <div className="bs-meta"><span className="bs-n">{String(n).padStart(2, "0")}</span><span className="bs-app-tag">{s.app}</span></div>
        <h3>{s.title}</h3>
        <p className="bs-p">{s.p}</p>
        <p className="bs-said">You say <b>{"\u201c"}{s.ask}{"\u201d"}</b></p>
      </div>
      <div className="mv-win">
        <MacMenuBar app={s.app} />
        <div className="mv-win-body">
          <p className="mv-field">{s.field}</p>
          <div className={"mv-typed" + (phase ? " is-on" : "")}>
            {s.out.map((l, i) => <p key={l} style={{ animationDelay: `${i * 0.18}s` }}>{l}</p>)}
          </div>
          {s.wait && phase ? <p className="mv-wait">{s.wait}</p> : null}
          <div className={"mv-win-face" + (phase ? " is-done" : "")}><MavenFace mood={phase ? "happy" : "listening"} /></div>
        </div>
      </div>
    </div>
  );
}

const DOWNLOAD = "mailto:talk2braino@gmail.com?subject=Maven%20for%20Mac&body=I%27d%20like%20to%20try%20Maven.";

const PLANS = [
  { name: "Free", price: "$0", per: "", line: "Dictation, plus Maven doing one thing at a time on your Mac.", gets: ["Dictation in any app, 2,000 words a week", "Open and switch apps, tabs and websites", "Write and send a message, with your yes, 10 a day", "Fill a form from your details, with your yes, 5 a day", "Remembers your names and basic details"], cta: "Download for Mac", pro: false },
  { name: "Pro", price: "$10", per: "/month", line: "For people who'd rather say it than type it.", gets: ["Unlimited dictation, sending and form filling", "Acts on what's on your screen: \u201creply to this\u201d", "Full memory: your lists, your details, your way of writing", "Hinglish, coming soon"], cta: "Get Pro", pro: true },
];

const FAQ = [
  { q: "Does it work in every app?", a: "If you can click into it, you can talk into it." },
  { q: "Will it send a message or submit a form without asking?", a: "No. It waits for your yes." },
  { q: "Where is my memory kept?", a: "In your own account, where you can see it and delete it. Your voice is turned into text in the cloud, and we don't keep the recording." },
  { q: "Does it work on Windows?", a: "Not yet. Tell us and we'll let you know first." },
  { q: "How is Maven different from Wispr Flow?", a: "Wispr Flow is built around dictation: you talk, it types. Maven types too. Then it goes further: it does small jobs on your Mac by voice, like opening apps, switching tabs and filling forms. It also remembers your names, lists and details, so you say them once." },
];

const MAVEN_FILM = "";

function MvSceneFilm() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setStep((x) => (x + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mv-film-in" aria-label="Maven typing a message as you speak">
      <MacMenuBar app="Mail" />
      <div className="mv-film-body">
        <p className="mv-field">To: Neha · Subject: Tomorrow</p>
        <div className={"mv-typed" + (step >= 1 ? " is-on" : "")}>
          <p>Hey Neha,</p>
          <p>Can we move tomorrow's call to 5:30 PM? I'll send the deck before that.</p>
          <p>Thanks,<br />Itish</p>
        </div>
        <div className="mv-film-face"><MavenFace mood={step === 0 ? "listening" : step === 1 ? "thinking" : "happy"} /></div>
      </div>
    </div>
  );
}

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const root = useAffReveal();
  const [mood, setMood] = useState<Mood>("idle");
  useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);
  const current = MOODS.find((m) => m.key === mood)!;

  return (
    <div className="aff mv" data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[["What it does", "#see"], ["Face", "#face"], ["Pricing", "#pricing"], ["Questions", "#faq"]]} go={["Download for Mac", "/maven#download"]} />

      {/* ── Hero: the home page's ── */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1 mv-h1">
              <span className="aff-h1-line">Speak it</span>
              <b>into being.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="ah-kicker">Agentic Dictation</p>
              <p className="aff-hero-one">Maven types what you say, does small jobs for you, and remembers you. On your Mac.</p>
              <div className="aff-hero-cta">
                <a href={DOWNLOAD} className="aff-cta">Download for Mac</a>
                <a href="#see" className="aff-cta aff-cta-ghost">See it work</a>
              </div>
            </div>
          </div>
        </div>
        {/* The film container: a real recording goes in MAVEN_FILM; until then the scene plays in code. */}
        <figure className="aff-hero-shot mv-film" data-grow>
          {MAVEN_FILM ? <video src={MAVEN_FILM} playsInline controls preload="metadata" /> : <MvSceneFilm />}
        </figure>
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Works wherever you type</p>
            <ul className="aff-strip-names aff-strip-logos">
              {(["WhatsApp", "Chrome", "Mail", "Finder", "Calendar", "Spotify"] as const).map((n) => (
                <li key={n}><AppLogo name={n} /><span>{n}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main>
        {/* ── What Maven is, in one breath ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <div className="mv-what aff-reveal">
              <p className="ah-kicker">What is Maven?</p>
              <p className="mv-what-line">A dictation app for your Mac. Hold a key and talk, and your words appear, written properly, in whatever app you're in. Then it does small jobs for you, and it remembers you.</p>
            </div>
          </div>
        </section>

        {/* ── What it does: the Braino page's scene deck ── */}
        <section className="bs bs-deck mv-deck" id="see">
          <div className="bs-wrap">
            <div className="bs-head is-in">
              <h2 className="aff-h1 bs-h">You say it.<br /><em>Maven does it.</em></h2>
              <p>Four things it does today, in the apps you already use.</p>
            </div>
            {SCENES.map((x, i) => <MvSceneRow key={x.title} s={x} n={i + 1} flip={i % 2 === 1} />)}
          </div>
        </section>

        {/* ── Maven's face (2026-10-26): two lines, alive ── */}
        <section className="hb6" id="face">
          <div className="aff-wrap">
            <div className="hb6-box mv-facebox aff-reveal">
              <div className="mv-face-copy">
                <p className="ah-kicker">Meet the face</p>
                <h2 className="mv-h2">Two lines. Still alive.</h2>
                <p className="hb6-line">Maven isn't a mascot. Its whole face is the two lines of its name. They breathe, blink, look at you, and listen. Move your pointer around.</p>
                <div className="mv-moods" role="tablist" aria-label="Mood">
                  {MOODS.map((m) => (
                    <button key={m.key} type="button" role="tab" aria-selected={mood === m.key} className={mood === m.key ? "on" : ""} onClick={() => setMood(m.key)}>{m.label}</button>
                  ))}
                </div>
                <p className="mv-mood-note">{current.note}</p>
              </div>
              <div className="mv-face-stage"><MavenFace mood={mood} /></div>
            </div>
          </div>
        </section>

        {/* ── Honest take ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <div className="mv-honest aff-reveal">
              <p className="ah-kicker">Honest take</p>
              <h2 className="mv-h2">You already talk to AI. Good.</h2>
              <p className="mv-honest-sub">Maven isn't another chatbot.</p>
              <p className="mv-honest-body">Your chatbot lives in a tab. Maven lives wherever you type: messages, docs, forms, everything else. It's not here to replace your chatbot. It's here so your voice works everywhere else too.</p>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="hb6" id="pricing">
          <div className="aff-wrap">
            <div className="mv-price-head aff-reveal">
              <p className="ah-kicker">Pricing</p>
              <h2 className="mv-h2">Start free. Go Pro when you can't stop talking.</h2>
            </div>
            <div className="mv-price aff-reveal">
              {PLANS.map((pl) => (
                <div key={pl.name} className={pl.pro ? "is-pro" : undefined}>
                  <div className="mv-plan-top"><h3>{pl.name}</h3>{pl.pro && <span className="mv-badge">Most people</span>}</div>
                  <p className="mv-amt">{pl.price}{pl.per && <small>{pl.per}</small>}</p>
                  <p className="mv-plan-line">{pl.line}</p>
                  <ul>{pl.gets.map((g) => <li key={g}><i aria-hidden="true">✓</i>{g}</li>)}</ul>
                  <a href={DOWNLOAD} className={"aff-cta" + (pl.pro ? "" : " aff-cta-ghost")}>{pl.cta}</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Questions: the home page's ── */}
      <section className="hb2-faq" id="faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>The short answers.</p>
          </div>
          <div className="hb2-faq-list">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<i aria-hidden="true">+</i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── The last word ── */}
      <section className="hb-end" id="download">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal mv-end">
          <MavenFace mood="happy" />
          <h2 className="aff-h1 hb-end-line">Say something.</h2>
          <a href={DOWNLOAD} className="aff-cta">Download for Mac</a>
          <p className="mv-by">Maven, by <Link to="/">Affective</Link>. Powered by <Link to="/affectiveos">AffectiveOS</Link>.</p>
        </div>
      </section>

      <AffFooter />
    </div>
  );
}
