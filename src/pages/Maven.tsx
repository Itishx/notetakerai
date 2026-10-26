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

/* raw: what you actually said; ~word~ is what Maven took out. fixed: what it
   did, in plain words. That before/after is the whole point of the section. */
type MvScene = { group: "write" | "do"; reply?: string; app: string; raw: string; title: string; p: string; out: string[]; field: string; fixed: string[]; wait?: string; form?: string[] };
const SCENES: MvScene[] = [
  /* It writes */
  { group: "write", app: "Slack", field: "To: Rahul Mehta", raw: "~um so~ tell rahul the deck is ~uh~ done numbers by ~five no wait~ six and the budget is twenty five thousand",
    title: "Talk messy. It writes clean.", p: "Ums go, full stops come in, and when you change your mind it keeps the last thing you said. Four things in a row become a list, and money and phone numbers come out the way you'd type them.",
    out: ["The deck is done. Numbers by 6 PM, and the budget is \u20b925,000."], fixed: ["Took out \u201cum\u201d and \u201cuh\u201d", "Kept six, not five", "\u20b925,000, not the words"] },
  { group: "write", app: "WhatsApp", field: "Neha: are we still on for friday?", raw: "reply to this ~um~ yes friday works see you at eight",
    title: "Replies to what's on your screen.", p: "Say \u201creply to this\u201d and it reads the message you're looking at, then writes your answer right in the box. You press send.",
    out: ["Yes, Friday works. See you at 8!"], fixed: ["Read Neha's message", "Wrote it in the reply box", "Left Send to you"] },
  { group: "write", app: "Notes", field: "Launch list", raw: "add ~uh~ record the maven film to my launch list",
    title: "Say it once. It remembers.", p: "Your lists, the names you use and how they're spelled, your address and email. Tell it once and it knows which list you mean next time.",
    out: ["- Send the deck to Rahul", "- Book the venue", "- Record the Maven film"], fixed: ["Knew which list", "Added it at the end"] },
  /* It does */
  { group: "do", app: "Chrome", field: "New tab", raw: "maven could you please open youtube",
    title: "Opens and switches.", p: "Apps, tabs and websites. Say where you want to be and you're there. No hunting through the dock or forty tabs.",
    out: ["youtube.com", "YouTube is open in a new tab."], fixed: ["Opened Chrome", "Went to YouTube"], reply: "YouTube. Open." },
  { group: "do", app: "Slack", field: "To: Rahul Mehta", raw: "tell rahul the deck is done",
    title: "Sends messages, with your yes.", p: "WhatsApp, Slack or Mail. It finds the person, writes the message, and stops. Nothing goes out until you say so.",
    out: ["The deck is done."], fixed: ["Found Rahul in Slack", "Wrote the message", "Waiting for your yes"], reply: "Drafted. Send?" },
  { group: "do", app: "Chrome", field: "Checkout \u00b7 Shipping address", raw: "fill in my address",
    title: "Fills forms.", p: "Names, addresses, emails, phone numbers, from what it already knows about you. It stops before Submit so you can check.",
    form: ["Full name", "Address", "City and PIN"], out: ["Itish Pande", "12, 4th Cross, Indiranagar", "Bengaluru 560038"], fixed: ["Filled 3 fields from what it knows", "Didn't press Submit"], wait: "Waiting for your yes to submit", reply: "Filled. Your call." },
];

function Raw({ text }: { text: string }) {
  return <>{text.split(/(~[^~]+~)/).filter(Boolean).map((t, i) => t.startsWith("~") ? <s key={i}>{t.slice(1, -1)}</s> : <span key={i}>{t}</span>)}</>;
}

/* The features as a switcher (2026-10-26, replaces the stacking deck): the
   list on the left, one Mac window on the right playing the chosen one. It
   moves on by itself every few seconds; a click takes over. */
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
    const a = window.setTimeout(() => setPhase(1), 1800);
    const b = held ? 0 : window.setTimeout(() => {
      // Through "It writes", then on to "It does", and round again.
      if (at + 1 < list.length) setAt(at + 1);
      else { setGroup((g) => (g === "write" ? "do" : "write")); setAt(0); }
    }, 6500);
    return () => { clearTimeout(a); if (b) clearTimeout(b); };
  }, [on, at, held, group]);
  const s = list[at] || list[0];
  return (
    <div ref={ref}>
    <div className="mv-groups" role="tablist" aria-label="What Maven does">
      <button type="button" role="tab" aria-selected={group === "write"} className={group === "write" ? "on" : ""} onClick={() => { setGroup("write"); setAt(0); setHeld(true); }}><b>It writes</b><span>Dictation, done properly</span></button>
      <button type="button" role="tab" aria-selected={group === "do"} className={group === "do" ? "on" : ""} onClick={() => { setGroup("do"); setAt(0); setHeld(true); }}><b>It does</b><span>Small jobs on your Mac</span></button>
    </div>
    <div className="mv-switch">
      <ol className="mv-switch-list">
        {list.map((x, i) => (
          <li key={x.title} className={i === at ? "on" : ""}>
            <button type="button" onClick={() => { setAt(i); setHeld(true); }} aria-pressed={i === at}>
              <span className="mv-switch-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="mv-switch-t">{x.title}</span>
            </button>
            {i === at && (
              <div className="mv-switch-more">
                <p className="mv-switch-p">{x.p}</p>
                <div className="mv-said">
                  <p className="mv-said-k">What you said</p>
                  <p className="mv-said-raw">{"\u201c"}<Raw text={x.raw} />{"\u201d"}</p>
                  <ul className={"mv-fixed" + (phase ? " is-on" : "")}>{x.fixed.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
                {!held && <span className="mv-switch-bar" key={at} />}
              </div>
            )}
          </li>
        ))}
      </ol>
      <MvSceneWindow s={s} phase={phase} key={group + at} />
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

const BEYOND = [
  { k: "Clean, punctuated text in any app", them: true },
  { k: "Lists, \u20b9 amounts and phone numbers written properly", them: true },
  { k: "Replies to what's on your screen", them: false },
  { k: "Opens apps, tabs and websites by voice", them: false },
  { k: "Sends a message, with your yes", them: false },
  { k: "Fills forms from what it knows", them: false },
  { k: "Remembers your lists, names and details", them: false },
];

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

/* Plays the moods on its own once the lines have drawn in. */
function FaceShow() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const order: Mood[] = ["idle", "listening", "thinking", "happy", "idle"];
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setAt((x) => (x + 1) % order.length), 2600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  return <div ref={ref} className={"mv-faceshow" + (on ? " is-in" : "")}><MavenFace mood={order[at]} /></div>;
}

/* Maven only ever answers in three words or fewer. */
const REPLIES = ["YouTube. Open.", "Drafted. Send?", "Filled. Your call.", "Again?", "Not my job.", "Anytime."];
function FootReplies() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setI((x) => (x + 1) % REPLIES.length), 2000); return () => clearInterval(t); }, []);
  return <p className="mv-foot3-reply" key={i}>{REPLIES[i]}</p>;
}

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const [view, setView] = useState<"product" | "letter">(() => (typeof window !== "undefined" && window.location.hash === "#letter" ? "letter" : "product"));
  const show = (v: "product" | "letter") => { setView(v); window.history.replaceState(null, "", v === "letter" ? "#letter" : window.location.pathname); window.scrollTo({ top: 0 }); };
  const root = useAffReveal();
    useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);

  return (
    <div className={"aff mv" + (view === "letter" ? " ao" : "")} data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[["What it does", "#see"], ["Beyond dictation", "#beyond"], ["Pricing", "#pricing"], ["Questions", "#faq"]]} go={["Download for Mac", "/maven#download"]} />

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
              <p className="mv-what-line">A Mac app that does two things. It writes what you say, properly, wherever you type. And it does the small job that comes next: opens the app, sends the message, fills the form.</p>
            </div>
          </div>
        </section>

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

        {/* ── Beyond dictation: where Maven goes further (computer use) ── */}
        <section className="mv-beyond" id="beyond">
          <div className="aff-wrap">
            <div className="mv-beyond-head aff-reveal">
              <p className="ah-kicker">Beyond dictation</p>
              <h2 className="mv-h2">Other apps stop at typing.<br />Maven keeps going.</h2>
              <p>Dictation apps are good at one thing: you talk, they type. Maven does that too. Then it uses your Mac for you, one small step at a time, and always asks before anything goes out.</p>
            </div>
            <div className="mv-beyond-table aff-reveal" role="table">
              <div className="mv-bt-row mv-bt-head" role="row"><span role="columnheader" /><span role="columnheader">Dictation apps</span><span role="columnheader" className="is-us"><MavenMark size={22} />Maven</span></div>
              {BEYOND.map((r) => (
                <div key={r.k} className="mv-bt-row" role="row">
                  <span role="cell">{r.k}</span>
                  <span role="cell" className={r.them ? "yes" : "no"}>{r.them ? "\u2713" : "\u2014"}</span>
                  <span role="cell" className="yes is-us">\u2713</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Maven's face: just the two lines, big; they draw in, then live ── */}
        <section className="mv-facehero" id="face">
          <FaceShow />
          <p className="ah-kicker">Meet the face</p>
          <h2 className="mv-h2">Two lines. Still alive.</h2>
          <p className="mv-facehero-p">It breathes, blinks, looks where you are, and listens.</p>
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
      {/* Maven's footer (2026-10-26): Maven itself, not a sitemap. The face
          watches you, it answers in three words, and the name spells out
          what it stands for. */}
      <footer className="mv-foot3">
        <div className="mv-foot3-face"><MavenFace mood="idle" /></div>
        <FootReplies />
        <h2 className="mv-foot3-word" aria-label="Maven: Memory And Voice Engine">
          <span><b>M</b><i>emory</i></span>
          <span><b>A</b><i>nd</i></span>
          <span><b>V</b><i>oice</i></span>
          <span><b>En</b><i>gine</i></span>
        </h2>
        <nav className="mv-foot3-links" aria-label="Footer">
          <a href="#see">What it does</a><a href="#pricing">Pricing</a><a href="#faq">Questions</a>
          <a href="#letter" onClick={(e) => { e.preventDefault(); show("letter"); }}>The announcement</a>
          <Link to="/trust">Privacy</Link><a href={DOWNLOAD}>Download for Mac</a>
        </nav>
        <p className="mv-foot3-base">© 2026 Maven, by <Link to="/">Affective</Link> · Made in Bengaluru · <Link to="/terms">Terms</Link></p>
      </footer>
    </div>
  );
}
