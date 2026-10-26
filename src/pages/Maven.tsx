import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, useAffReveal } from "@/components/affPage";
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

/* Maven's face (2026-10-26): the capsule from the Mac app. A small dark pill
   with two white eyes. Resting it breathes and blinks; listening, the eyes
   give way to one glowing waveform; done, a quick happy squint. */
type Mood = "idle" | "listening" | "happy";
const WAVE = [0.35, 0.5, 0.62, 0.74, 0.86, 0.95, 1, 0.95, 0.86, 0.74, 0.62, 0.5, 0.35];

export function MavenFace({ mood, follow = false }: { mood: Mood; follow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState(0);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!follow) return;
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setLook(Math.max(-1, Math.min(1, ((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2)));
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [follow]);
  useEffect(() => {
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 130); next(); }, 2600 + Math.random() * 2600); };
    next();
    return () => clearTimeout(t);
  }, []);
  return (
    <div ref={ref} className={`mv-face is-${mood}${blink && mood === "idle" ? " is-blink" : ""}`}
      style={{ ["--lx" as string]: mood === "idle" ? look.toFixed(3) : 0 }} aria-hidden="true">
      <span className="mv-cap">
        <span className="mv-eyes"><i className="mv-eye" /><i className="mv-eye" /></span>
        <span className="mv-wave">{WAVE.map((h, i) => <i key={i} style={{ ["--h" as string]: h, ["--i" as string]: i }} />)}</span>
        <svg className="mv-squint" viewBox="0 0 30 12"><path d="M3 10 L7.5 3 L12 10" /><path d="M18 10 L22.5 3 L27 10" /></svg>
        <span className="mv-sheen" />
      </span>
    </div>
  );
}

/* The three bottom spots Maven can live in. */
function MvSpots() {
  return (
    <div className="mv-spots" aria-hidden="true">
      <div className="mv-spots-screen">
        <i className="is-l" /><i className="is-c" /><i className="is-r on" />
      </div>
    </div>
  );
}

/* A faithful mock of the Maven app window (Home). */
const HUB_STATS = [["1,284", "words this week"], ["142", "words per minute"], ["6", "day streak"], ["37", "dictations"]];
const HUB_HISTORY = [
  ["10:42 AM", "Hey Neha, can we move tomorrow's call to 4? Thanks."],
  ["9:15 AM", "Remind the team the deck is due Friday, and attach the latest numbers."],
  ["Yesterday", "Pick up milk, eggs and coffee on the way home."],
];
function MvHub() {
  return (
    <div className="mv-hub" aria-label="The Maven app: Home">
      <div className="mv-hub-bar"><span className="mv-lights"><i /><i /><i /></span></div>
      <div className="mv-hub-in">
        <aside className="mv-hub-side">
          <div className="mv-hub-brand"><span className="mv-hub-cap"><i /><i /></span>Maven</div>
          {["Home", "Dictionary", "Snippets", "Settings"].map((n, i) => <span key={n} className={"mv-hub-nav" + (i === 0 ? " on" : "")}>{n}</span>)}
        </aside>
        <div className="mv-hub-main">
          <h4>Welcome back</h4>
          <div className="mv-hub-stats">{HUB_STATS.map(([v, k]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
          <p className="mv-hub-day">Today</p>
          <ul className="mv-hub-list">
            {HUB_HISTORY.map(([t, x]) => (
              <li key={t}><time>{t}</time><p>{x}</p><span className="mv-hub-act"><button type="button" tabIndex={-1}>Copy</button><button type="button" tabIndex={-1}>Wrong?</button></span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

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

/* raw: what you actually said; ~word~ is what Maven took out; out is what
   lands. That before/after is the whole point of the section. */
type MvScene = { group: "write" | "do"; reply?: string; app: string; raw: string; title: string; p: string; out: string[]; field: string; wait?: string; form?: string[] };
const SCENES: MvScene[] = [
  /* It writes */
  { group: "write", app: "Slack", field: "To: Rahul Mehta", raw: "~um so~ tell rahul the deck is ~uh~ done numbers by ~five no wait~ six and the budget is twenty five thousand",
    title: "Talk the way you talk. It writes it neatly.", p: "It drops the ums, adds the full stops, and if you change your mind halfway, it keeps the final version. Money and numbers come out the way you'd type them.",
    out: ["The deck is done. Numbers by 6 PM, and the budget is ₹25,000."] },
  { group: "write", app: "WhatsApp", field: "Neha: are we still on for friday?", raw: "reply to this ~um~ yes friday works see you at eight",
    title: "Answer a message without typing.", p: "Neha asks if Friday still works. You say “reply to this” and your answer. Maven reads her message, writes yours in the reply box, and leaves the sending to you.",
    out: ["Yes, Friday works. See you at 8!"] },
  { group: "write", app: "Notes", field: "Launch list", raw: "add ~uh~ record the maven film to my launch list",
    title: "Add to your lists by voice.", p: "Say “add this to my launch list” and it lands in the right list. It also remembers names, spellings and your details, so you only say them once.",
    out: ["- Send the deck to Rahul", "- Book the venue", "- Record the Maven film"] },
  /* It does */
  { group: "do", app: "Chrome", field: "New tab", raw: "maven could you please open youtube",
    title: "Open any app, tab or website.", p: "Say where you want to go and you're there. No hunting through the dock or forty open tabs.",
    out: ["youtube.com", "YouTube is open in a new tab."], reply: "YouTube. Open." },
  { group: "do", app: "Slack", field: "To: Rahul Mehta", raw: "tell rahul the deck is done",
    title: "Send a message, after you say yes.", p: "On WhatsApp, Slack or Mail. It finds the person and writes the message, then waits. Nothing goes out until you say yes.",
    out: ["The deck is done."], reply: "Drafted. Send?" },
  { group: "do", app: "Chrome", field: "Checkout · Shipping address", raw: "fill in my address",
    title: "Fill a form in one sentence.", p: "Your name, address, email and phone number, filled in from what it already knows. It stops before Submit so you can check.",
    form: ["Full name", "Address", "City and PIN"], out: ["Itish Pande", "12, 4th Cross, Indiranagar", "Bengaluru 560038"], wait: "Waiting for your yes to submit", reply: "Filled. Your call." },
];

function Raw({ text }: { text: string }) {
  return <>{text.split(/(~[^~]+~)/).filter(Boolean).map((t, i) => t.startsWith("~") ? <s key={i}>{t.slice(1, -1)}</s> : <span key={i}>{t}</span>)}</>;
}

/* What it does (2026-10-26, side tabs): the two groups on the left, each
   opening to its scenes; one big Mac window on the right with the title,
   one sentence and what you said. It moves on slowly until you click. */
function MvSwitcher() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const [group, setGroup] = useState<"write" | "do">("write");
  const list = SCENES.filter((x) => x.group === group);
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!on) return;
    setPhase(0);
    const a = window.setTimeout(() => setPhase(1), 1600);
    const b = held ? 0 : window.setTimeout(() => {
      if (at + 1 < list.length) setAt(at + 1);
      else { setGroup((g) => (g === "write" ? "do" : "write")); setAt(0); }
    }, 9000);
    return () => { clearTimeout(a); if (b) clearTimeout(b); };
  }, [on, at, held, group]);
  const s = list[at] || list[0];
  const groups = [{ k: "write" as const, label: "It writes" }, { k: "do" as const, label: "It does" }];
  return (
    <div ref={ref} className="mv-side">
      <nav className="mv-side-nav" aria-label="What Maven does">
        {groups.map((g) => (
          <div key={g.k} className={"mv-side-g" + (group === g.k ? " on" : "")}>
            <button type="button" className="mv-side-gb" aria-expanded={group === g.k} onClick={() => { setGroup(g.k); setAt(0); setHeld(true); }}>{g.label}</button>
            {group === g.k && (
              <ul>
                {SCENES.filter((x) => x.group === g.k).map((x, i) => (
                  <li key={x.title}><button type="button" className={i === at ? "on" : ""} aria-current={i === at} onClick={() => { setAt(i); setHeld(true); }}>{x.title}</button></li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
      <div className="mv-side-main">
        <MvSceneWindow s={s} phase={phase} key={group + at} />
        <div className="mv-one-cap" key={"c" + group + at}>
          <h3 className="mv-one-t">{s.title}</h3>
          <p className="mv-one-p">{s.p}</p>
          <p className="mv-one-said"><span>You said</span>“<Raw text={s.raw} />”</p>
        </div>
      </div>
    </div>
  );
}

function MvSceneWindow({ s, phase }: { s: MvScene; phase: number }) {
  return (
      <div className="mv-mac mv-scene-mac">
        <MacMenuBar app={s.app} />
        <div className="mv-desk">
          <div className="mv-mail">
            <div className="mv-mail-bar">
              <span className="mv-lights"><i /><i /><i /></span>
              <span className="mv-mail-title">{s.app}</span>
            </div>
            <div className="mv-mail-row"><span>{s.app === "Chrome" ? "Form" : s.app === "Slack" ? "To" : "Note"}</span>{s.field}</div>
            {s.form ? (
              /* A real form: empty fields, then each fills in by itself. */
              <div className="mv-mail-body mv-form">
                {s.form.map((label, i) => (
                  <label key={label} className="mv-fieldbox">
                    <span>{label}</span>
                    <span className={"mv-input" + (!phase && i === 0 ? " is-focus" : "")}>
                      {phase ? <em style={{ animationDelay: `${i * 0.28}s` }}>{s.out[i]}</em> : i === 0 ? <span className="mv-caret" /> : null}
                    </span>
                  </label>
                ))}
                <div className="mv-form-foot">
                  <span className="mv-submit">Submit</span>
                  {phase && s.wait ? <span className="mv-wait">{s.wait}</span> : null}
                </div>
              </div>
            ) : (
            <div className="mv-mail-body">
              {phase
                ? <div className="mv-landed">{s.out.map((l, i) => <p key={l}>{l}{i === s.out.length - 1 && <span className="mv-caret" />}</p>)}</div>
                : <p><span className="mv-caret" /></p>}
            </div>
            )}
            {/* Maven sits on the bottom edge of the window, like in the app. */}
            <div className={"mv-edge" + (phase && !s.reply ? " is-gone" : "")}>
              <MavenFace mood={phase ? "happy" : "listening"} />
              {phase && s.reply ? <span className="mv-edge-reply">{s.reply}</span> : null}
            </div>
          </div>
        </div>
      </div>
  );
}

const DOWNLOAD = "mailto:talk2braino@gmail.com?subject=Maven%20for%20Mac&body=I%27d%20like%20to%20try%20Maven.";

const BEYOND_THEM = ["Clean, punctuated text", "Lists, ₹ and numbers done right"];
const BEYOND_US = ["Replies to what's on screen", "Opens apps, tabs and websites", "Sends a message, with your yes", "Fills forms from what it knows", "Remembers your names and lists"];

const PRICE_ROWS = [
  { k: "Dictation in any app", free: "2,000 words a week", pro: "Unlimited" },
  { k: "Open and switch apps, tabs and websites", free: "✓", pro: "✓" },
  { k: "Send a message, with your yes", free: "10 a day", pro: "Unlimited" },
  { k: "Fill a form, with your yes", free: "3 a month", pro: "Unlimited" },
  { k: "Reply to what's on your screen", free: "—", pro: "✓" },
  { k: "Memory", free: "Names and basic details", pro: "Lists, details, your way of writing" },
  { k: "Hinglish", free: "—", pro: "Coming soon" },
];

const PLANS = [
  { name: "Free", price: "$0", per: "", line: "Dictation, plus Maven doing one thing at a time on your Mac.", gets: ["Dictation in any app, 2,000 words a week", "Open and switch apps, tabs and websites", "Write and send a message, with your yes, 10 a day", "Fill a form from your details, with your yes, 5 a day", "Remembers your names and basic details"], cta: "Download for Mac", pro: false },
  { name: "Pro", price: "$10", per: "/month", line: "For people who'd rather say it than type it.", gets: ["Unlimited dictation, sending and form filling", "Acts on what's on your screen: “reply to this”", "Full memory: your lists, your details, your way of writing", "Hinglish, coming soon"], cta: "Get Pro", pro: true },
];

const FAQ = [
  { q: "Does it work in every app?", a: "If you can click into it, you can talk into it." },
  { q: "Will it send a message or submit a form without asking?", a: "No. It waits for your yes." },
  { q: "Where is my memory kept?", a: "Your history stays on your Mac, where you can see it and delete it. Your voice is turned into text in the cloud, and the audio is never kept." },
  { q: "What are snippets?", a: "Short phrases you save once. Say one on its own, like “my calendar link”, and Maven pastes your saved text instead." },
  { q: "Does it work on Windows?", a: "Not yet. Tell us and we'll let you know first." },
  { q: "How is Maven different from Wispr Flow?", a: "Wispr Flow is built around dictation: you talk, it types. Maven types too. Then it goes further: it does small jobs on your Mac by voice, like opening apps, switching tabs and filling forms. It also remembers your names, lists and details, so you say them once." },
];

const MAVEN_FILM = "";
/* The 60-second demo. Empty until the recording exists; a poster drawn in code stands in. */
const MAVEN_DEMO_VIDEO = "";
/* "What it does" and "Beyond dictation" are off until they are redesigned from the PRD (2026-10-26). */
const SHOW_DRAFT_SECTIONS = true;

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
  const steps = ["You talk", "Turned into text", "Cleaned up the way you write", "Lands at your cursor"];
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
          <b>You talk, it writes the way you would.</b> Filler goes, punctuation comes in, and four things in a row become a
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
          it isn't sure, it types. (Yes, this is the agentic part. Investors, you may sit up now.) We're still building it, and it's the part we're most excited about.
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
  const [step, setStep] = useState<"listen" | "happy" | "rest">("listen");
  useEffect(() => {
    const next = { listen: "happy", happy: "rest", rest: "listen" } as const;
    const t = window.setTimeout(() => setStep(next[step]), step === "listen" ? 3200 : step === "happy" ? 1100 : 3400);
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
            {step !== "listen"
              ? <div className="mv-landed">{FILM_WORDS.map((w, i) => <p key={i}>{w}{i === FILM_WORDS.length - 1 && <span className="mv-caret" />}</p>)}</div>
              : <p><span className="mv-caret" /></p>}
          </div>
        </div>
        {/* Maven lives in one of three bottom spots; here, bottom right. */}
        <div className="mv-film-corner"><MavenFace mood={step === "listen" ? "listening" : step === "happy" ? "happy" : "idle"} /></div>
      </div>
    </div>
  );
}

/* Plays the moods on its own once the lines have drawn in. */
function FaceShow() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const order: Mood[] = ["idle", "listening", "listening", "happy", "idle"];
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setAt((x) => (x + 1) % order.length), 2600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  return <div ref={ref} className={"mv-faceshow" + (on ? " is-in" : "")}><MavenFace mood={order[at]} follow /></div>;
}

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const [view, setView] = useState<"product" | "letter">(() => (typeof window !== "undefined" && window.location.hash === "#letter" ? "letter" : "product"));
  const show = (v: "product" | "letter") => { setView(v); window.history.replaceState(null, "", v === "letter" ? "#letter" : window.location.pathname); window.scrollTo({ top: 0 }); };
  const root = useAffReveal([view]); // re-arm the reveal when coming back from the letter, or the page stays blank
    useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);

  return (
    <div className={"aff mv" + (view === "letter" ? " ao" : "")} data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[]} go={["Download for Mac", "/maven#download"]} />

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
              {(["Gmail", "WhatsApp", "Slack", "Chrome", "Notes", "Mail"] as const).map((n) => (
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
              <p className="mv-what-line">Maven is a small AI buddy that writes what you say, properly, wherever you type. Ask, and it does the small job that comes next. It doesn't talk back. It just does it.</p>
            </div>
          </div>
        </section>

        {/* ── The demo video ── */}
        <section className="mv-video-sec">
          <div className="aff-wrap">
            <figure className="mv-video aff-reveal">
              {MAVEN_DEMO_VIDEO ? (
                <video src={MAVEN_DEMO_VIDEO} controls playsInline preload="metadata" />
              ) : (
                <div className="mv-video-poster" aria-label="Maven demo video, coming soon">
                  <MavenMark size={150} />
                  <span className="mv-video-play" aria-hidden="true" />
                </div>
              )}
              <figcaption>Watch Maven in 60 seconds</figcaption>
            </figure>
          </div>
        </section>

        {SHOW_DRAFT_SECTIONS && <>
        {/* ── What it does: a switcher ── */}
        <section className="mv-does-sec" id="see">
          <div className="aff-wrap">
            <div className="mv-does-head aff-reveal">
              <h2 className="aff-h1 mv-does-h">You say it.<br /><em>Maven does it.</em></h2>
              <p>Two halves. Dictation that needs no cleanup, and small jobs that need no clicking.</p>
            </div>
            <MvSwitcher />
          </div>
        </section>

        {/* ── The Maven app ── */}
        <section className="mv-app-sec" id="app">
          <div className="aff-wrap">
            <div className="mv-app-head aff-reveal">
              <p className="ah-kicker">The Maven app</p>
              <h2 className="mv-h2">Everything you said, in one calm place.</h2>
            </div>
            <div className="aff-reveal"><MvHub /></div>
            <ul className="mv-app-lines aff-reveal">
              <li><b>History &amp; stats</b>Everything you said, by day, searchable.</li>
              <li><b>Dictionary</b>Teach it your names and words.</li>
              <li><b>Snippets</b>Say “my calendar link”, get the link.</li>
            </ul>
            <div className="mv-app-place aff-reveal">
              <MvSpots />
              <p>Drag Maven to a corner or the bottom. Double-click him to open the app.</p>
            </div>
          </div>
        </section>

        {/* ── Beyond dictation: a five-second comparison ── */}
        <section className="mv-beyond" id="beyond">
          <div className="aff-wrap">
            <h2 className="mv-h2 mv-beyond-h aff-reveal">Other apps stop at typing.<br />Maven keeps going.</h2>
            <div className="mv-cmp aff-reveal">
              <div className="mv-cmp-them">
                <p className="mv-cmp-k">Every dictation app</p>
                <p className="mv-cmp-line">{BEYOND_THEM.join(" · ")}</p>
              </div>
              <div className="mv-cmp-div" aria-hidden="true"><MavenMark size={44} /></div>
              <div className="mv-cmp-us">
                <p className="mv-cmp-k">Only Maven</p>
                <ul>{BEYOND_US.map((k) => <li key={k}>{k}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        </>}
        {/* ── Pricing ── */}
        <section className="hb6" id="pricing">
          <div className="aff-wrap">
            <div className="mv-price-head aff-reveal">
              <p className="ah-kicker">Pricing</p>
              <h2 className="mv-h2">Start free. Go Pro when you can't stop talking.</h2>
            </div>
            <div className="mv-ptable aff-reveal" role="table" aria-label="Free and Pro">
              <div className="mv-pt-row mv-pt-head" role="row">
                <span role="columnheader" />
                {PLANS.map((pl) => (
                  <span key={pl.name} role="columnheader" className={pl.pro ? "is-pro" : undefined}>
                    <b>{pl.name}</b>
                    <em>{pl.price}{pl.per && <small>{pl.per}</small>}</em>
                    <a href={DOWNLOAD} className={"aff-cta" + (pl.pro ? "" : " aff-cta-ghost")}>{pl.cta}</a>
                  </span>
                ))}
              </div>
              {PRICE_ROWS.map((r) => (
                <div key={r.k} className="mv-pt-row" role="row">
                  <span role="cell">{r.k}</span>
                  <span role="cell">{r.free}</span>
                  <span role="cell" className="is-pro">{r.pro}</span>
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

      </>}
      {/* Maven's footer (2026-10-26, light): the name and what it stands for
          on the left, a few links on the right, one quiet line below. */}
      <footer className="mv-foot">
        <div className="aff-wrap">
          <div className="mv-foot-row">
            <div className="mv-foot-brand" id="download">
              <div className="mv-foot-word">
                <MavenMark size={56} />
                <span>Maven</span>
                <FaceShow />
              </div>
              <p className="mv-foot-means"><b>M</b>emory <b>A</b>nd <b>V</b>oice <b>En</b>gine</p>
            </div>
            <nav className="mv-foot-links" aria-label="Footer">
              <a href="#see">What it does</a><a href="#pricing">Pricing</a><a href="#faq">Questions</a>
              <a href="#letter" onClick={(e) => { e.preventDefault(); show("letter"); }}>The announcement</a>
              <Link to="/trust">Privacy</Link><a href={DOWNLOAD}>Download for Mac</a>
            </nav>
          </div>
          <p className="mv-foot-base">© 2026 Maven, by <Link to="/">Affective</Link> · Made in Bengaluru · <Link to="/terms">Terms</Link></p>
        </div>
      </footer>
    </div>
  );
}
