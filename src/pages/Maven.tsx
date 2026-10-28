import { useEffect, useRef, useState, type ReactNode } from "react";
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
   Affective. The mark is two slanted pills that fade from ink to air. */

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
   look up and a warm light races round its edge; done, the light turns green
   and wraps the capsule (matches the app, 2026-10-26). */
type Mood = "idle" | "listening" | "happy" | "sleepy";

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
        {/* Edge light: a bright point racing round the capsule while it listens; green, wrapping the whole capsule, when the words land. */}
        <svg className="mv-edge" viewBox="0 0 60 32" preserveAspectRatio="none"><rect x="1" y="1" width="58" height="30" rx="15" pathLength="100" /></svg>
      </span>
    </div>
  );
}


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

const DOWNLOAD = "mailto:talk2braino@gmail.com?subject=Maven%20for%20Mac&body=I%27d%20like%20to%20try%20Maven.";


const PRICE_ROWS = [
  { k: "Dictation in any app", free: "Unlimited for your first 4 days, then 2,000 words a week", pro: "Unlimited" },
  { k: "Open and switch apps, tabs and websites", free: "✓", pro: "✓" },
  { k: "Send a message, with your yes", free: "10 a day", pro: "Unlimited" },
  { k: "Fill a form, with your yes", free: "3 a month", pro: "Unlimited" },
  { k: "Reply to what's on your screen", free: "—", pro: "✓" },
  { k: "Memory", free: "Names and basic details", pro: "Lists, details, your way of writing" },
  { k: "Hinglish", free: "—", pro: "Coming soon" },
];

/* Value for money (2026-10-27): a quiet, factual comparison. Only things we can
   stand behind; competitor prices from their own sites, Oct 2026. Sarvam is a
   developer API (about ₹30 an audio hour), not a dictation app, so it isn't here. */
const COMPARE = [
  { k: "Price for unlimited", maven: "$10 a month", wispr: "$15 a month ($12 yearly)", apple: "Free" },
  { k: "Free plan", maven: "Unlimited for 4 days, then 2,000 words a week", wispr: "2,000 words a week", apple: "Unlimited, basic" },
  { k: "Removes ums, adds punctuation", maven: "Yes", wispr: "Yes", apple: "Partly" },
  { k: "Writes ₹, lakh, crore and Indian phone numbers", maven: "Built for it", wispr: "General", apple: "No" },
  { k: "Does the next step (open, send, fill)", maven: "Yes, with your yes", wispr: "No", apple: "No" },
  { k: "Remembers your names and words", maven: "Yes", wispr: "Yes", apple: "No" },
];
function PriceTabs() {
  const [tab, setTab] = useState<"plans" | "compare">("plans");
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-ptab]").forEach((el) => { el.hidden = el.dataset.ptab !== tab; });
  }, [tab]);
  return (
    <>
      <div className="mv-tabs mv-tabs-inline mv-ptabs" role="tablist" aria-label="Pricing view">
        <button type="button" role="tab" aria-selected={tab === "plans"} className={tab === "plans" ? "on" : ""} onClick={() => setTab("plans")}>Plans</button>
        <button type="button" role="tab" aria-selected={tab === "compare"} className={tab === "compare" ? "on" : ""} onClick={() => setTab("compare")}>Value for money</button>
      </div>
      <div className="mv-compare" data-ptab="compare" hidden>
        <p className="mv-compare-lead">More for less: a third cheaper than Wispr Flow, 4 unlimited days to start, and it does the next step for you.</p>
        <div className="mv-compare-scroll">
          <table className="mv-ctable">
            <thead><tr><th scope="col" /><th scope="col" className="is-us">Maven</th><th scope="col">Wispr Flow</th><th scope="col">Apple Dictation</th></tr></thead>
            <tbody>{COMPARE.map((r) => (
              <tr key={r.k}><th scope="row">{r.k}</th><td className="is-us">{r.maven}</td><td>{r.wispr}</td><td>{r.apple}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mv-compare-note">Prices from each company's own site, October 2026. Wispr Flow also has Windows and phone apps; Maven is Mac only for now.</p>
      </div>
    </>
  );
}

const PLANS = [
  { name: "Free", price: "$0", per: "", line: "Dictation, plus Maven doing one thing at a time on your Mac.", gets: ["Dictation in any app: unlimited for your first 4 days, then 2,000 words a week", "Open and switch apps, tabs and websites", "Write and send a message, with your yes, 10 a day", "Fill a form from your details, with your yes, 3 a month", "Remembers your names and basic details"], cta: "Download for Mac", pro: false },
  { name: "Pro", price: "$10", per: "/month", line: "For people who'd rather say it than type it.", gets: ["Unlimited dictation, sending and form filling", "Acts on what's on your screen: “reply to this”", "Full memory: your lists, your details, your way of writing", "Hinglish, coming soon"], cta: "Get Pro", pro: true },
];

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
          fills, and gets you to the place where you type. One step at a time. Anything bigger, like planning a trip or running a whole task across apps, is out of scope on purpose.
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


/* ── The product page (2026-10-27, final): the approved copy and its best
   moments (ribbon, before/after, speed band, tiles, closing panel, giant
   wordmark), dressed in the Affective look: warm light paper, serif display,
   the home page's hero, strip, boxes and FAQ. ── */

function useCalm() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setCalm(m.matches);
    const on = () => setCalm(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return calm;
}

function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return [ref, on] as const;
}

/* The hero film in code: a real Mac, an empty email, Maven listening in the
   bottom-right corner, then the words land at the cursor and it glows green. */
const FILM_WORDS = ["Hey Neha,", "Can we move tomorrow's call to 5:30 PM? I'll send the deck before that.", "Thanks,", "Itish"];
export function MvSceneFilm() {
  const calm = useCalm();
  const [step, setStep] = useState<"listen" | "happy" | "rest">("listen");
  useEffect(() => {
    if (calm) { setStep("rest"); return; }
    const next = { listen: "happy", happy: "rest", rest: "listen" } as const;
    const t = window.setTimeout(() => setStep(next[step]), step === "listen" ? 3200 : step === "happy" ? 1100 : 3400);
    return () => clearTimeout(t);
  }, [step, calm]);
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
        <div className="mv-film-corner"><MavenFace mood={step === "listen" ? "listening" : step === "happy" ? "happy" : "idle"} /></div>
      </div>
    </div>
  );
}

/* The ribbon: messy speech curves into the capsule, clean text rides out on
   the dark band. Text is repeated and the offset loops by one copy's length. */
const MESSY = "um so can you tell rahul the the deck is done and uh numbers by five no wait six";
const CLEAN = "Can you tell Rahul the deck is done? Numbers by 6, and the budget is ₹25,000.";

function useFlow(copies: number, pxPerSec: number, calm: boolean) {
  const ref = useRef<SVGTextPathElement>(null);
  useEffect(() => {
    const tp = ref.current;
    const text = tp?.parentElement as unknown as SVGTextElement | null;
    if (!tp || !text) return;
    if (calm) { tp.setAttribute("startOffset", "0"); return; }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const period = text.getComputedTextLength() / copies || 600;
      const x = (((t - start) / 1000) * pxPerSec) % period;
      tp.setAttribute("startOffset", String(x - period));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [copies, pxPerSec, calm]);
  return ref;
}

function Ribbon() {
  const calm = useCalm();
  const inRef = useFlow(3, 26, calm);
  const outRef = useFlow(3, 34, calm);
  const rep = (s: string) => Array.from({ length: 3 }, () => s).join("   ·   ");
  return (
    <figure className="mv-ribbon" aria-label={`You say: "${MESSY}". Maven writes: "${CLEAN}"`}>
      <svg viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path id="mv-rib-in" d="M -20 80 C 220 60, 330 250, 600 180" fill="none" className="mv-rib-guide" />
        <path id="mv-rib-out" d="M 600 180 C 820 120, 960 300, 1220 250" fill="none" className="mv-rib-band" />
        <text className="mv-rib-messy"><textPath ref={inRef} href="#mv-rib-in">{rep(MESSY)}</textPath></text>
        <text className="mv-rib-clean" dy="7"><textPath ref={outRef} href="#mv-rib-out">{rep(CLEAN)}</textPath></text>
      </svg>
      <div className="mv-rib-face">
        <s className="mv-rib-umm">umm</s>
        <MavenFace mood="listening" />
      </div>
    </figure>
  );
}

const STRIKE = new Set(["um", "the the", "uh", "five no wait"]);
const SAID_PARTS = ["um", " so can you tell rahul ", "the the", " deck is done and ", "uh", " numbers by ", "five no wait", " six"];

/* What it does: plain scenes on a real Mac. raw is what you said; ~word~ is
   what Maven took out; out is what lands. */
type MvScene = { group: "write" | "do"; does: string; reply?: string; browser?: boolean; ask?: { title: string; primary: string }; app: string; raw: string; title: string; p: string; out: string[]; field: string; wait?: string; form?: string[]; list?: string[] };
const SCENES: MvScene[] = [
  { group: "write", app: "Slack", field: "To: Rahul Mehta", raw: "~um so~ the deck is ~uh~ done, numbers by ~five no wait~ six, and the budget is twenty five thousand", does: "Types it cleanly into your Slack message: no ums, the 6 you meant, and ₹25,000.",
    title: "Talk the way you talk. It writes it neatly.", p: "It drops the ums, adds the full stops, and keeps the version you meant. Money and numbers come out right.",
    out: ["The deck is done. Numbers by 6 PM, and the budget is ₹25,000."] },
  { group: "write", app: "WhatsApp", ask: { title: "Reply to Neha", primary: "Send" }, field: "Neha: are we still on for friday?", raw: "reply to this: yes friday works, see you at eight", does: "Reads Neha's message and writes your answer in the reply box. You press send.",
    title: "Answer a message without typing.", p: "Say “reply to this” and your answer. Maven reads her message and writes yours. You send it.",
    out: ["Yes, Friday works. See you at 8!"] },
  { group: "write", app: "Notes", field: "Launch list", raw: "add record the Maven film to my launch list", does: "Adds it to the bottom of your Launch list in Notes.",
    title: "Add to your lists by voice.", p: "Say “add this to my launch list” and it lands in the right list. It remembers names and details too.",
    list: ["Send the deck to Rahul", "Book the venue"], out: ["Record the Maven film"], reply: "Added." },
  { group: "do", app: "Chrome", browser: true, field: "New tab", raw: "open YouTube", does: "Opens YouTube in a new tab and says \"YouTube. Open.\"",
    title: "Open any app, tab or website.", p: "Say where you want to go and you're there. No hunting through forty tabs.",
    out: ["youtube.com", "YouTube is open in a new tab."], reply: "YouTube. Open." },
  { group: "do", app: "Slack", ask: { title: "To Rahul Mehta", primary: "Send" }, field: "To: Rahul Mehta", raw: "tell Rahul the deck is done", does: "Finds Rahul in Slack, writes the message, and waits for your yes before sending.",
    title: "Send a message, after you say yes.", p: "On WhatsApp, Slack or Mail. It writes the message, then waits. Nothing goes out until you say yes.",
    out: ["The deck is done."], reply: "Drafted. Send?" },
  { group: "do", app: "Chrome", ask: { title: "Fill your address", primary: "Fill" }, field: "Checkout · Shipping address", raw: "fill in my address", does: "Fills your name and address into the form, and stops before Submit.",
    title: "Fill a form in one sentence.", p: "Your name, address and phone, filled in from what it knows. It stops before Submit.",
    form: ["Full name", "Address", "City and PIN"], out: ["Itish Pande", "12, 4th Cross, Indiranagar", "Bengaluru 560038"], wait: "Waiting for your yes to submit", reply: "Filled. Your call." },
];

function Raw({ text }: { text: string }) {
  return <>{text.split(/(~[^~]+~)/).filter(Boolean).map((t, i) => t.startsWith("~") ? <s key={i}>{t.slice(1, -1)}</s> : <span key={i}>{t}</span>)}</>;
}

/* What it does (2026-10-27): an accordion on the left, grouped It writes /
   It does; the active scene's Mac window floats on the warm panel on the
   right. Moves on every ~6s until you click. */
function MvDoes() {
  const calm = useCalm();
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!on) return;
    if (calm) { setPhase(1); return; }
    setPhase(0);
    const a = window.setTimeout(() => setPhase(1), 1600);
    const b = held ? 0 : window.setTimeout(() => setAt((at + 1) % SCENES.length), 6000);
    return () => { clearTimeout(a); if (b) clearTimeout(b); };
  }, [on, at, held, calm]);
  const s = SCENES[at];
  return (
    <div ref={ref} className="mv-acc">
      <ul className="mv-acc-list" aria-label="What Maven does">
        {SCENES.map((x, i) => (
          <li key={x.title} className={i === at ? "on" : ""}>
            {(i === 0 || SCENES[i - 1].group !== x.group) && <p className="mv-acc-g">{x.group === "write" ? "It writes" : "It does"}</p>}
            <button type="button" aria-expanded={i === at} onClick={() => { setAt(i); setHeld(true); }}>{x.title}</button>
            {i === at && (
              <div className="mv-acc-body">
                <p className="mv-acc-p">{x.p}</p>
                {/* Two plain steps, so it is obvious what happened (2026-10-27). */}
                <ol className="mv-acc-steps">
                  <li><span>You press ⌃⌥ and say</span><q>“<Raw text={x.raw} />”</q></li>
                  <li><span>Maven</span>{x.does}</li>
                </ol>
                <span className={"mv-acc-bar" + (held || calm ? " is-full" : "")} key={"b" + at}><i /></span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mv-panel mv-acc-vis"><MvSceneWindow s={s} phase={phase} key={at} /></div>
    </div>
  );
}

function SecHead({ pill, children, side }: { pill: string; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="mv-head aff-reveal">
      <div className="mv-head-l"><span className="mv-pill">{pill}</span>{children}</div>
      {side && <div className="mv-head-r">{side}</div>}
    </div>
  );
}

function Strip({ items }: { items: { t: string; p: string }[] }) {
  return <ul className="mv-strip">{items.map((x) => <li key={x.t}><h3>{x.t}</h3><p>{x.p}</p></li>)}</ul>;
}

const HERO_STRIP = [
  { t: "Works anywhere you type", p: "WhatsApp, Gmail, Slack, Notes, ChatGPT, Claude, Cursor, your code editor." },
  { t: "Writes like you write", p: "Lists, ₹, lakh and crore, phone numbers, and the correction you made halfway." },
  { t: "Never sends without your yes", p: "Nothing is sent, posted or submitted without your yes." },
];
const DOES_STRIP = [
  { t: "Only things that end in text", p: "It types, sends, fills, and gets you to the place where you type." },
  { t: "One step at a time", p: "One small job, and it never sends or submits without your yes." },
  { t: "If it isn't sure, it types", p: "Maven is built to tell the two apart from how you say it." },
];

/* The island from the app (Bar design, Ink): listening pill, a slim pill reply,
   or the wide bar asking before it sends. */
function MvIsland({ s, phase }: { s: MvScene; phase: number }) {
  if (s.group === "write" && !s.ask) return <div className="mv-isl-spot"><MavenFace mood={phase ? "happy" : "listening"} /></div>;
  if (!phase) return <div className="mv-isl-spot"><MavenFace mood="listening" /></div>;
  if (s.ask) return (
    <div className="mv-isl-spot"><div className="mv-isl mv-isl-ask">
      <span className="mv-isl-eyes"><i /><i /></span>
      <div className="mv-isl-c">
        <div className="mv-isl-row"><b>{s.ask.title}</b><em>{s.reply || "Drafted. Send?"}</em></div>
        <div className="mv-isl-row"><span className="mv-isl-draft">{s.out.join(", ")}</span><span className="mv-isl-acts"><b className="y">{s.ask.primary}<kbd>⏎</kbd></b><b>Edit</b><b>Cancel</b></span></div>
      </div>
    </div></div>
  );
  return <div className="mv-isl-spot"><div className="mv-isl mv-isl-pill"><span className="mv-isl-eyes"><i /><i /></span><b>{s.reply || "Done."}</b></div></div>;
}

function MvSceneWindow({ s, phase }: { s: MvScene; phase: number }) {
  if (s.browser) return (
    <div className="mv-mac mv-scene-mac">
      <MacMenuBar app={s.app} />
      <div className="mv-desk">
        <div className="mv-mail mv-browser">
          <div className="mv-mail-bar"><span className="mv-lights"><i /><i /><i /></span><span className="mv-tab">{phase ? "YouTube" : "New Tab"}</span></div>
          <div className="mv-url"><span>{phase ? "youtube.com" : ""}</span>{!phase && <span className="mv-caret" />}</div>
          <div className="mv-mail-body mv-page">
            {phase ? (
              <div className="mv-yt"><div className="mv-yt-top"><i className="mv-yt-logo" /><b>YouTube</b><span className="mv-yt-search" /></div>
                <div className="mv-yt-grid">{[0, 1, 2, 3, 4, 5].map((n) => <span key={n} />)}</div></div>
            ) : <p className="mv-blank">Search Google or type a URL</p>}
          </div>
        </div>
      </div>
      <MvIsland s={s} phase={phase} />
    </div>
  );
  return (
    <div className="mv-mac mv-scene-mac">
      <MacMenuBar app={s.app} />
      <div className="mv-desk">
        <div className="mv-mail">
          <div className="mv-mail-bar">
            <span className="mv-lights"><i /><i /><i /></span>
            <span className="mv-mail-title">{s.app}</span>
          </div>
          <div className="mv-mail-row"><span>{s.form ? "Form" : s.app === "Slack" ? "To" : s.app === "WhatsApp" ? "Chat" : "Note"}</span>{s.field}</div>
          {s.form ? (
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
          ) : s.list ? (
            <ul className="mv-mail-body mv-check">
              {s.list.map((l) => <li key={l}><i />{l}</li>)}
              {phase ? <li className="is-new"><i />{s.out[0]}</li> : <li className="is-empty"><i /><span className="mv-caret" /></li>}
            </ul>
          ) : (
            <div className="mv-mail-body">
              {phase
                ? <div className="mv-landed">{s.out.map((l, i) => <p key={l}>{l}{i === s.out.length - 1 && <span className="mv-caret" />}</p>)}</div>
                : <p><span className="mv-caret" /></p>}
            </div>
          )}
        </div>
      </div>
      <MvIsland s={s} phase={phase} />
    </div>
  );
}

const FEATURES = [
  { t: "Writes like you write", p: "Lists, ₹, lakh and crore, phone numbers, and the correction you made halfway." },
  { t: "Knows your words", p: "Add names and jargon to your Dictionary once. They come out right every time." },
  { t: "Snippets", p: "Say “my calendar link”, get the link. Same for your address, email or bio." },
  { t: "Does the next thing", p: "“Open Notes.” “Tell Neha I'm running late.” “Fill in my address.” One small job, and it never sends or submits without your yes.", only: true },
];

/* Maven's jobs: the ONE list. The app keeps an identical copy in
   mac/maven/lib/jobs.cjs (the site can't import from mac/). Change both together. */
const MAVEN_JOBS = {
  write: {
    title: "Write",
    shortcut: "⌃⌥",
    how: "Control+Option, press to start, press again to stop",
    jobs: [
      { job: "Type anything, cleaned up", example: "the deck is done numbers by five no wait six" },
      { job: "Lists, ₹, lakh and crore, phone numbers, emails written properly", short: "Lists, ₹, numbers, emails", example: "the budget is twenty five thousand" },
      { job: "Snippets", example: "my calendar link" },
    ],
  },
  do: {
    title: "Do",
    shortcut: "fn⌃",
    how: "fn+Control, press to start, press again to stop",
    jobs: [
      { job: "Open an app", example: "open Slack" },
      { job: "Open a website", example: "open YouTube" },
      { job: "Send a message on WhatsApp or Mail, after your yes", short: "Send a message", example: "tell Neha I'm running late" },
      { job: "Reply to the email or message on screen, after your yes", short: "Reply to what's on screen", example: "draft a reply to this email", example2: "reply to this, Friday works" },
      { job: "Fill in your saved details", short: "Fill your details", example: "fill in my address" },
      { job: "Add to a list in Notes", short: "Add to a list", example: "add milk to my grocery list" },
      { job: "Remember a name or detail", short: "Remember a name", example: "remember Riya is R-I-Y-A" },
    ],
  },
  not: {
    title: "Not Maven's job",
    jobs: ["Playing music", "Searching the web", "Shopping", "Booking", "Anything with more than one step", "Anything it would have to decide for you"],
  },
} as const;

type MvJob = { job: string; example: string; example2?: string };
function MvJobs() {
  const cols = [
    { key: "write", title: "Write", kbd: MAVEN_JOBS.write.shortcut, how: "Press to start, press again to stop.", jobs: MAVEN_JOBS.write.jobs as readonly MvJob[] },
    { key: "do", title: "Do", kbd: MAVEN_JOBS.do.shortcut, how: "One small job. Sends only after your yes.", jobs: MAVEN_JOBS.do.jobs as readonly MvJob[] },
  ];
  return (
    <div className="mv-jobs aff-reveal">
      {cols.map((c) => (
        <div key={c.key} className={"mv-jobs-col is-" + c.key}>
          <h3>{c.key === "do" && <i className="mv-jobs-dot" aria-hidden="true" />}{c.title} <kbd>{c.kbd}</kbd></h3>
          <p className="mv-jobs-how">{c.how}</p>
          <ul>
            {c.jobs.map((j) => (
              <li key={j.job}>
                <span>{j.job}</span>
                <q>{j.example}</q>{j.example2 && <q>{j.example2}</q>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mv-jobs-col is-not">
        <h3>Not its job</h3>
        <p className="mv-jobs-how">It says “Not my job.” and stops.</p>
        <ul>{MAVEN_JOBS.not.jobs.map((j) => <li key={j}><span>{j}</span></li>)}</ul>
      </div>
    </div>
  );
}

const BEYOND_THEM = ["Clean, punctuated text", "Lists, ₹ and numbers done right"];
const BEYOND_US = ["Replies to what's on screen", "Opens apps and sends, with your yes", "Fills forms from what it knows"];

const FAQ = [
  { q: "Will it work in my apps?", a: "Yes. Anywhere you can type: WhatsApp, Gmail, Slack, Notes, ChatGPT, Claude, Cursor, your code editor." },
  { q: "How is it different from Apple Dictation?", a: "Apple types what it hears. Maven writes what you meant: no ums, the right punctuation, lists, ₹, and your corrections. Then it can do the next step." },
  { q: "Does it understand my accent?", a: "It was tuned on how people in India actually speak and write." },
  { q: "What about Hindi?", a: "Hindi and Hinglish are in early preview: pick your language in Settings. Hinglish keeps Hindi words in Roman letters." },
  { q: "Noisy room or quiet voice?", a: "It works with your Mac's built-in mic. A headset helps in a noisy room." },
  { q: "What happens if I ask Maven something it can't do?", a: "It says “Not my job.” Ask “what can you do?” and it shows you the list." },
  { q: "What are snippets?", a: "Say a short phrase on its own, like “my calendar link”, and Maven pastes your saved text instead." },
  { q: "Is it free?", a: "Yes. Free covers everyday use. Pro is $10 a month for unlimited." },
  { q: "Windows?", a: "Not yet. Tell us and you'll hear first." },
];

const TYPE_LINE = "Can you tell Rahul the deck is done? Numbers by 6, and the budget is ₹25,000. ";

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const [view, setView] = useState<"product" | "letter">(() => (typeof window !== "undefined" && window.location.hash === "#letter" ? "letter" : "product"));
  const show = (v: "product" | "letter") => { setView(v); window.history.replaceState(null, "", v === "letter" ? "#letter" : window.location.pathname); window.scrollTo({ top: 0 }); };
  const root = useAffReveal([view]); // re-arm the reveal when coming back from the letter, or the page stays blank
  useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);
  const toProduct = () => { if (view === "letter") show("product"); };

  return (
    <div className={"aff mv" + (view === "letter" ? " ao" : "")} data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[]} go={["Download for Mac", "/maven#download"]} />

      <div className="mv-tabs" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={view === "product"} className={view === "product" ? "on" : ""} onClick={() => show("product")}>Maven</button>
        <button type="button" role="tab" aria-selected={view === "letter"} className={view === "letter" ? "on" : ""} onClick={() => show("letter")}>The announcement</button>
      </div>
      {view === "letter" ? <MavenLetter /> : null}
      <div className="mv-frame">
      {view === "product" && <>
      {/* 1. Hero: pill + headline left, sub + button right, the film, the strip */}
      <header className="mv-cell mv-hero">
        <SecHead pill="Agentic dictation" side={<>
          <p className="mv-hero-one">Maven turns what you say into clean writing wherever you type. Then it does the small thing that comes next.</p>
          <div className="mv-hero-cta">
            <a href={DOWNLOAD} className="aff-cta">Get Maven for Mac</a>
            <a href="#see" className="aff-cta aff-cta-ghost">See it work</a>
          </div>
        </>}>
          <h1 className="aff-h1 mv-h1">
            <span className="aff-h1-line">Say it once.</span>
            <b>It's <em className="mv-it">already</em> written.</b>
          </h1>
        </SecHead>
        <figure className="mv-panel mv-film"><MvSceneFilm /></figure>
      </header>
      <Strip items={HERO_STRIP} />
      <div className="mv-logos">
        <p className="aff-strip-label">Works wherever you type</p>
        <ul className="aff-strip-names aff-strip-logos">
          {(["Gmail", "WhatsApp", "Slack", "Chrome", "Notes", "Mail"] as const).map((n) => (
            <li key={n}><AppLogo name={n} /><span>{n}</span></li>
          ))}
        </ul>
      </div>

      <main>
        {/* 2. The ribbon, then before and after */}
        <section className="mv-cell mv-demo" id="see">
          <SecHead pill="Product preview"><h2 className="mv-h2">Say it messy. Get it <em className="mv-it">clean</em>.</h2></SecHead>
          <Ribbon />
          <div className="mv-ba aff-reveal">
            <div className="mv-ba-col">
              <p className="mv-k">You said</p>
              <p className="mv-ba-said">“{SAID_PARTS.map((p, i) => STRIKE.has(p) ? <s key={i}>{p}</s> : <span key={i}>{p}</span>)}”</p>
            </div>
            <div className="mv-ba-col is-out">
              <p className="mv-k">Maven wrote</p>
              <p className="mv-ba-out">{CLEAN}</p>
              <span className="mv-ba-face"><MavenFace mood="happy" /></span>
            </div>
          </div>
          <ul className="mv-tags aff-reveal">
            {["Filler removed", "Repeat removed", "Kept six, not five", "₹ written right"].map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        {/* 3. What Maven is, in one breath */}
        <section className="mv-cell mv-what aff-reveal">
          <p className="mv-what-k"><span className="mv-pill">What is Maven?</span><MavenFace mood="idle" follow /></p>
          <p className="mv-what-line">Maven is a small AI buddy that writes what you say, properly, wherever you type. Ask, and it does the small job that comes next. It doesn't talk back. It just does it.</p>
        </section>

        {/* 4. Speed: the one dark band */}
        <section className="mv-cell mv-speed">
          <SecHead pill="Speed" side={<p className="mv-speed-sub">Most people type about 40 words a minute and speak about 150. Maven lets you write at the speed you think.</p>}>
            <h2 className="aff-h1 mv-speed-h">
              <span className="aff-h1-line">Your voice is faster</span>
              <b>than your <em className="mv-it">fingers</em>.</b>
            </h2>
          </SecHead>
          <div className="mv-race">
            <div className="mv-lane is-type">
              <p className="mv-lane-k"><b>Typing</b><span>~40 wpm</span></p>
              <div className="mv-run"><span className="mv-run-t">{TYPE_LINE}{TYPE_LINE}</span></div>
            </div>
            <div className="mv-lane is-maven">
              <p className="mv-lane-k"><b>Maven</b><span>~150 wpm</span></p>
              <div className="mv-run">
                <span className="mv-run-t">{TYPE_LINE}{TYPE_LINE}</span>
                <span className="mv-run-face"><MavenFace mood="listening" /></span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. What it does: accordion + visual, then the strip */}
        <section className="mv-cell" id="does">
          <SecHead pill="How it works" side={<a href={DOWNLOAD} className="aff-cta">Get Maven for Mac</a>}>
            <h2 className="aff-h1 mv-h2">
              <span className="aff-h1-line">You say it.</span>
              <b>Maven does it.</b>
            </h2>
          </SecHead>
          <MvDoes />
        </section>
        <Strip items={DOES_STRIP} />

        {/* 5b. Exactly what Maven does: the one list (MAVEN_JOBS) */}
        <section className="mv-cell" id="jobs">
          <SecHead pill="Its jobs" side={<p className="mv-head-desc">Two shortcuts, a few small jobs. Nothing it has to guess at.</p>}>
            <h2 className="mv-h2">Exactly what Maven does</h2>
          </SecHead>
          <MvJobs />
        </section>

        {/* 6. The details: numbered grid around the app */}
        <section className="mv-cell mv-details">
          <SecHead pill="Benefits"><h2 className="mv-h2">The details</h2></SecHead>
          <div className="mv-grid aff-reveal">
            {[0, 1].map((col) => (
              <ul key={col} className={"mv-grid-col" + (col ? " is-r" : "")}>
                {FEATURES.slice(col * 2, col * 2 + 2).map((f, i) => (
                  <li key={f.t} className={f.only ? "is-key" : undefined}>
                    <span className="mv-num">[0{col * 2 + i + 1}]</span>
                    {f.only && <small>Only Maven</small>}
                    <h3>{f.t}</h3>
                    <p>{f.p}</p>
                    {f.only && <span className="mv-tile-face"><MavenFace mood="happy" /><span className="mv-winedge-reply">YouTube. Open.</span></span>}
                  </li>
                ))}
              </ul>
            ))}
            <div className="mv-grid-mid">
              <div className="mv-panel mv-hub-panel"><MvHub /></div>
              <div className="mv-remember">
                <h3>Remembers you</h3>
                <p>Every dictation, by day, searchable. Mark one “Wrong?” and it learns.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Beyond dictation + privacy: a row of cards */}
        <section className="mv-cell" id="beyond">
          <SecHead pill="Beyond dictation"><h2 className="mv-h2">Other apps stop at typing.<br />Maven <em className="mv-it">keeps going</em>.</h2></SecHead>
          <div className="mv-cards aff-reveal">
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip">Clean text. Done.</span></div>
              <h3>Every dictation app</h3>
              <p>{BEYOND_THEM.join(". ")}.</p>
            </article>
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip mv-snip-face"><MavenFace mood="happy" /><span>Drafted. Send?</span></span></div>
              <h3>Then it <em className="mv-it">does it</em>. <span className="mv-card-tag">Only Maven</span></h3>
              <p>{BEYOND_US.join(". ")}.</p>
            </article>
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip mv-snip-face"><MavenFace mood="sleepy" /><span>Audio is never kept</span></span></div>
              <h3>Your voice stays <em className="mv-it">yours</em>.</h3>
              <p>Audio is never kept. Your history stays on your Mac. Nothing goes out without your yes.</p>
            </article>
          </div>
        </section>

        {/* 9. Pricing */}
        <section className="mv-cell" id="pricing">
          <SecHead pill="Pricing" side={<a href={DOWNLOAD} className="aff-cta">Get Maven for Mac</a>}>
            <h2 className="mv-h2">Start free. Go Pro when you can't stop <em className="mv-it">talking</em>.</h2>
          </SecHead>
          <PriceTabs />
          <div className="mv-ptable-wrap aff-reveal" data-ptab="plans">
          <div className="mv-ptable" role="table" aria-label="Free and Pro">
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

      {/* 10. Questions */}
      <section className="mv-cell mv-faq" id="faq">
        <SecHead pill="Questions" side={<p className="mv-head-desc">The short answers.</p>}><h2 className="mv-h2">Questions</h2></SecHead>
        <div className="mv-faq-list">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<i aria-hidden="true">+</i></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 11. Closing: the warm panel inside the frame */}
      <section className="mv-cell mv-close-sec" id="download">
        <div className="mv-panel mv-close aff-reveal">
          <h2 className="aff-h1 mv-close-h">
            <span className="aff-h1-line">You already know what you want to say.</span>
            <b>Now just <em className="mv-it">say</em> it.</b>
          </h2>
          <div className="mv-close-cta">
            <a href={DOWNLOAD} className="aff-cta">Get Maven for Mac</a>
            <MavenFace mood="happy" />
          </div>
        </div>
      </section>
      </>}

      {/* 12. Footer: a giant wordmark with Maven watching you, then the name's
          meaning, the links and one quiet line. */}
      <footer className="mv-cell mv-foot">
        <div>
          <div className="mv-foot-word">
            <span>Maven</span>
            <MavenFace mood="idle" follow />
          </div>
          <div className="mv-foot-row">
            <div className="mv-foot-brand">
              <MavenMark size={44} />
              <p className="mv-foot-means"><b>M</b>emory <b>A</b>nd <b>V</b>oice <b>En</b>gine</p>
            </div>
            <nav className="mv-foot-links" aria-label="Footer">
              <a href="#does" onClick={toProduct}>What it does</a>
              <a href="#pricing" onClick={toProduct}>Pricing</a>
              <a href="#faq" onClick={toProduct}>Questions</a>
              <a href="#letter" onClick={(e) => { e.preventDefault(); show("letter"); }}>The announcement</a>
              <Link to="/trust">Privacy</Link>
              <a href={DOWNLOAD}>Download for Mac</a>
            </nav>
          </div>
          <p className="mv-foot-base">© 2026 Maven, by <Link to="/">Affective</Link> · Made in Bengaluru · <Link to="/terms">Terms</Link></p>
        </div>
      </footer>
      </div>
    </div>
  );
}
