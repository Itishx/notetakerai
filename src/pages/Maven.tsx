import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, useAffReveal } from "@/components/affPage";
import { AppLogo } from "@/components/AppLogo";
import { MacMenuBar, Viz } from "./aff-figures";
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
      <div className="mv-mac mv-scene-mac">
        <MacMenuBar app={s.app} />
        <div className="mv-desk">
          <div className="mv-mail">
            <div className="mv-mail-bar">
              <span className="mv-lights"><i /><i /><i /></span>
              <span className="mv-mail-title">{s.app}</span>
            </div>
            <div className="mv-mail-row"><span>{s.app === "Chrome" ? "Form" : s.app === "Slack" ? "To" : "Note"}</span>{s.field}</div>
            <div className="mv-mail-body">
              {phase
                ? <div className="mv-landed">{s.out.map((l, i) => <p key={l}>{l}{i === s.out.length - 1 && <span className="mv-caret" />}</p>)}{s.wait && <p className="mv-wait">{s.wait}</p>}</div>
                : <p><span className="mv-caret" /></p>}
            </div>
            {/* Maven sits on the bottom edge of the window, like in the app. */}
            <div className={"mv-edge" + (phase ? " is-gone" : "")}><MavenFace mood="listening" /></div>
          </div>
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

/* ── The announcement letter (2026-10-26): the AffectiveOS page's voice and
   layout, text and diagrams only. ── */
function FigSpeed() {
  const rows = [{ k: "Typing", v: 40, c: "is-grey" }, { k: "Speaking", v: 150, c: "is-ink" }];
  return (
    <svg viewBox="0 0 640 170" className="mv-fig" role="img" aria-label="People type about 40 words a minute and speak about 150.">
      {rows.map((r, i) => (
        <g key={r.k} transform={`translate(0 ${30 + i * 64})`}>
          <text x="0" y="22" className="mv-fig-k">{r.k}</text>
          <rect x="120" y="4" width={r.v * 3.2} height="28" rx="14" className={r.c} />
          <text x={130 + r.v * 3.2} y="24" className="mv-fig-v">~{r.v} words a minute</text>
        </g>
      ))}
    </svg>
  );
}
function FigFlow() {
  const steps = ["You talk", "Heard in stretches, while you talk", "Cleaned up the way you write", "Lands at your cursor"];
  return (
    <svg viewBox="0 0 760 120" className="mv-fig" role="img" aria-label="You talk, it is heard while you talk, cleaned up, and lands at your cursor.">
      {steps.map((t, i) => (
        <g key={t} transform={`translate(${i * 190} 20)`}>
          <rect x="0" y="0" width="170" height="64" rx="14" className={i === 3 ? "is-ink" : "is-box"} />
          <foreignObject x="10" y="8" width="150" height="50"><div className={"mv-fig-t" + (i === 3 ? " is-inv" : "")}>{t}</div></foreignObject>
          {i < 3 && <path d={`M172 32 h16`} className="mv-fig-arrow" />}
        </g>
      ))}
      <text x="570" y="108" className="mv-fig-v">about a second after you let go</text>
    </svg>
  );
}
function FigTwoModes() {
  return (
    <svg viewBox="0 0 760 190" className="mv-fig" role="img" aria-label="Dictation types your words; a task does one small thing, and waits for your yes before sending.">
      <rect x="0" y="10" width="360" height="170" rx="18" className="is-box" />
      <rect x="400" y="10" width="360" height="170" rx="18" className="is-box" />
      <text x="24" y="44" className="mv-fig-k">You dictate</text>
      <text x="24" y="80" className="mv-fig-q">"The deck is done, numbers by five."</text>
      <text x="24" y="124" className="mv-fig-v">Types exactly that, where your</text>
      <text x="24" y="146" className="mv-fig-v">cursor is.</text>
      <text x="424" y="44" className="mv-fig-k">You ask</text>
      <text x="424" y="80" className="mv-fig-q">"Tell Rahul the deck is done."</text>
      <text x="424" y="124" className="mv-fig-v">Opens Slack, writes it to Rahul,</text>
      <text x="424" y="146" className="mv-fig-v">and waits for your yes to send.</text>
    </svg>
  );
}

function MavenLetter() {
  return (
    <div className="mv-letter">
      <article className="ao-col">
        <p className="ao-date">October 26, 2026 · Announcements</p>
        <h1 className="ao-title">
          Introducing Maven, agentic dictation for the Mac. You talk, and your words are written properly, wherever
          your cursor is. And when you ask, it does the small thing that comes next.
        </h1>

        <aside className="mv-tldr">
          <p className="mv-tldr-h">TL;DR</p>
          <ul>
            <li>Hold two keys, talk, let go. Clean text lands where your cursor is, in about a second.</li>
            <li>It writes the way you do: lists, rupees, lakh and crore, phone numbers, and the correction you made halfway through.</li>
            <li>It can do one small thing at a time: open an app, switch a tab, send a message, fill a form. It never sends or submits without your yes.</li>
            <li>It remembers your names and details, so you say them once.</li>
            <li>Free to start, Pro is $10 a month. Private preview, on Mac.</li>
          </ul>
        </aside>

        <p>
          Here is what bugged us. You can talk almost four times faster than you can type, and yet most of your day is
          still typing. Messages, emails, notes, forms. Your thoughts are ready long before your fingers are.
        </p>
        <Viz caption="Figure 1. Roughly how fast people type and speak."><FigSpeed /></Viz>
        <p>
          Dictation was meant to fix that, and mostly it gave you a wall of words with no full stops. So you fix it
          by hand, and by then you may as well have typed. We wanted dictation you don't have to clean up after.
        </p>
      </article>

      <article className="ao-col">
        <h2>How it works</h2>
        <p>
          <b>It listens while you talk.</b> Long thoughts are heard in stretches as you go, so when you let go,
          only the last few seconds are left.
        </p>
        <p>
          <b>It writes the way you write.</b> Filler goes, punctuation comes in, and four things in a row become a
          list. We trained it on how people in India actually write: ₹25,000, not "twenty five thousand rupees".
        </p>
        <p>
          <b>It lands at your cursor.</b> Slack, Mail, Notes, a form in Chrome, anywhere you can click. If there's
          nowhere to type, it copies the words and shows them to you, so nothing is ever lost.
        </p>
        <Viz caption="Figure 2. From your voice to your cursor."><FigFlow /></Viz>
      </article>

      <article className="ao-col">
        <h2>Dictate, or do</h2>
        <p>
          Most of the time you just want your words typed. Sometimes you want the thing after that: tell Rahul,
          fill the address, add it to the list. Maven is built to tell the two apart from how you say it, and if
          it isn't sure, it types. We're still building this part, and it's the part we're most excited about.
        </p>
        <Viz caption="Figure 3. The same voice, two kinds of help."><FigTwoModes /></Viz>
        <p>
          <b>What it does, and what it doesn't.</b> Maven only does things that end in text: it types, sends,
          fills, and gets you to the place where you type. One step at a time. Anything bigger, like planning a
          trip or running a whole task across apps, is Braino's job, not Maven's.
        </p>
      </article>

      <article className="ao-col">
        <h2>What's honest to say today</h2>
        <p>
          Maven is in private preview on Mac. Dictation works well, and it's fast. Telling a task from dictation
          is being built. Hinglish is next. Windows is not on the list yet.
        </p>
        <p className="ao-why">Talk to your Mac like you'd talk to a friend who types fast. That's the whole idea.</p>
        <p>Itish, founder, Affective</p>
      </article>
    </div>
  );
}

/* The hero film in code (2026-10-26): exactly what happens on a real Mac.
   Your cursor waits in an empty email, Maven's two bars listen with the voice
   moving through them, you let go, and the words land at the cursor at once. */
const FILM_WORDS = ["Hey Neha,", "Can we move tomorrow's call to 5:30 PM? I'll send the deck before that.", "Thanks,", "Itish"];
function MvSceneFilm() {
  const [step, setStep] = useState<"listen" | "landed">("listen");
  useEffect(() => {
    const t = window.setTimeout(() => setStep((x) => (x === "listen" ? "landed" : "listen")), step === "listen" ? 3200 : 4200);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div className="mv-mac" aria-label="Maven listening, then typing an email where the cursor is">
      <MacMenuBar app="Mail" menus={["File", "Edit", "View", "Mailbox", "Message", "Format", "Window", "Help"]} />
      <div className="mv-desk">
        <div className="mv-mail">
          <div className="mv-mail-bar">
            <span className="mv-lights"><i /><i /><i /></span>
            <span className="mv-mail-title">New Message</span>
            <span className="mv-mail-send" aria-hidden="true">➤</span>
          </div>
          <div className="mv-mail-row"><span>To:</span><b className="mv-chip">Neha Sharma</b></div>
          <div className="mv-mail-row"><span>Subject:</span>Tomorrow</div>
          <div className="mv-mail-body">
            {step === "landed"
              ? <div className="mv-landed">{FILM_WORDS.map((w, i) => <p key={i}>{w}{i === FILM_WORDS.length - 1 && <span className="mv-caret" />}</p>)}</div>
              : <p><span className="mv-caret" /></p>}
          </div>
        </div>
        <div className={"mv-film-face" + (step === "landed" ? " is-gone" : "")}>
          <MavenFace mood="listening" />
          <span className="mv-film-hint">Listening…</span>
        </div>
      </div>
    </div>
  );
}

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const [view, setView] = useState<"product" | "letter">(() => (typeof window !== "undefined" && window.location.hash === "#letter" ? "letter" : "product"));
  const show = (v: "product" | "letter") => { setView(v); window.history.replaceState(null, "", v === "letter" ? "#letter" : window.location.pathname); window.scrollTo({ top: 0 }); };
  const root = useAffReveal();
  const [mood, setMood] = useState<Mood>("idle");
  useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);
  const current = MOODS.find((m) => m.key === mood)!;

  return (
    <div className={"aff mv" + (view === "letter" ? " ao" : "")} data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[["What it does", "#see"], ["Face", "#face"], ["Pricing", "#pricing"], ["Questions", "#faq"]]} go={["Download for Mac", "/maven#download"]} />

      {/* The page, or the letter that introduces it (2026-10-26). */}
      <div className="mv-tabs" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={view === "product"} className={view === "product" ? "on" : ""} onClick={() => show("product")}>Maven</button>
        <button type="button" role="tab" aria-selected={view === "letter"} className={view === "letter" ? "on" : ""} onClick={() => show("letter")}>The announcement</button>
      </div>
      {view === "letter" ? <MavenLetter /> : <>
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

        {/* ── Honest take: a tab, against everywhere ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <div className="hb6-box mv-honest2 aff-reveal">
              <div className="mv-honest2-copy">
                <p className="ah-kicker">Honest take</p>
                <h2 className="mv-h2">You already talk to AI. Good.</h2>
                <p className="mv-honest-sub">Maven isn't another chatbot.</p>
                <p className="mv-honest-body">Your chatbot lives in a tab. Maven lives wherever you type: messages, docs, forms, everything else. It's not here to replace your chatbot. It's here so your voice works everywhere else too.</p>
              </div>
              <div className="mv-honest2-viz" aria-hidden="true">
                <div className="mv-hv-col">
                  <p className="mv-hv-k">Your chatbot</p>
                  <div className="mv-hv-tab"><span className="mv-hv-dots"><i /><i /><i /></span><span>One tab</span></div>
                </div>
                <div className="mv-hv-col">
                  <p className="mv-hv-k">Maven</p>
                  <ul className="mv-hv-apps">
                    {(["WhatsApp", "Mail", "Chrome", "Finder", "Calendar", "Spotify"] as const).map((n, i) => (
                      <li key={n} style={{ animationDelay: `${i * 0.35}s` }}><AppLogo name={n} /><span className="mv-hv-mark"><MavenMark size={18} /></span></li>
                    ))}
                  </ul>
                </div>
              </div>
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

      </>}
      <AffFooter />
    </div>
  );
}
