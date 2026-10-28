import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, Lit, useAffReveal, useLitWords, useGrowHero } from "@/components/affPage";
import { useNotchNav } from "@/components/useNotchNav";
import { BrainoMascot } from "@/components/BrainoMascot";
import { AppLogo } from "@/components/AppLogo";
import BrainoFooterGame from "@/components/BrainoFooterGame";
import "@/components/braino-footer.css";
import { BrainoScenes } from "@/components/BrainoScenes";
import { MacApp, Personality, FunParts } from "@/components/BrainoMore";
import "@/components/braino-more.css";
import { MacMenuBar, NotchSheet } from "./aff-figures";
/* The jobs are written here rather than read from the site's engine data,
   because this page says a different thing: each one carries what it saves
   you, and the Foundry engines carry the deck's own bullets. The engine files
   stay the source for the pages that use them. */
import "./braino-final.css";
import { BrainoPeek } from "@/components/BrainoPeek";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./braino-page.css";
import "./maven.css";
import MiniBraino from "@/components/MiniBraino";

/* ============================================================================
   /braino-final — the one page about Braino.

   Everything about him lives on one page in two tabs: Braino and Braino
   Foundry. They are not two products. They are two models of one, the way a
   phone has models: the same machine inside, pointed at a different life. The
   tabs change the story and never the thing. Early access is a section of
   this page (2026-10-02); /waitlist lands on it.

   Written from the reader's side of the screen. Every section starts with the
   day they actually have, in their own words, before a single sentence about
   what we built. Nobody has ever wanted screen awareness; they want to stop
   describing their screen to a robot.

   The page borrows the company page's grammar on purpose: warm paper, hairline
   boxes, serif for claims and the system face for him. A different look would
   say he came from somewhere else.
   ============================================================================ */

type Model = {
  key: string;
  tab: string;
  who: string;
  name: string;
  claim: string;
  claimTail: string;
  /* The day they have now, before anything is sold. */
  painTitle: string;
  pain: string[];
  /* What he does about it, as things somebody would notice. */
  does: { art: string; h: string; p: string }[];
  /* Useful things, each with how fast. The first thing a visitor should see
     after the film, so they want him before they read why. `img` empty = a
     placeholder with `shot` saying which picture goes there. */
  fast?: { t: string; h: string; p: string; img?: string; shot: string }[];
  /* Everything else he can do, as a brick wall of bubbles under the row. */
  wall?: string[];
  /* One ordinary day, after. */
  dayTitle: string;
  day: DayMoment[];
  /* The jobs he takes off you, from the site's own engine data. Mesa has none
     of its own yet and the section simply does not appear. */
  handles?: {
    heading: string;
    note: string;
    jobs: { n: string; name: string; job: string; points: string[]; solves: string; state: string }[];
  };
  /* What it is, in the fewest words somebody could act on. A hero answers
     "what is this", and the problem it solves belongs to the problem section
     two screens down. */
  title: string;
  titleTail: string;
  /* The line under it. */
  lede: string;
  /* His film, if there is one for this model yet. A model without one shows
     nothing rather than an empty frame. */
  film?: { src: string; caption: string };
  /* What is true today, said plainly, including what is not. */
  honest: string;
  cta: { label: string; to: string };
  state: string;
  accent: string;
  /* The same accent with enough light in it to read on a black ground. */
  accentDark: string;
};

const MODELS: Model[] = [
  {
    key: "braino",
    title: "Meet Braino,",
    titleTail: "your everyday Mac companion.",
    lede: "A friend who lives on your Mac. Talk to him, ask him anything about what's on your screen, and he gets it done, right where you are.",
    tab: "Braino",
    who: "For everyone",
    name: "Braino",
    claim: "You know the dance.",
    claimTail: "Every. Single. Time.",
    painTitle: "The problem",
    pain: [
      "Copy it. Open a new tab. Paste it. Explain what you're looking at. Wait. Copy the answer. Go back.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He is already there.",
        p: "In your browser and your Mac's notch, on whatever you are looking at. Nothing to open, nothing to paste. Asking him is as quick as thinking it.",
      },
      {
        art: "/os-voice.jpg",
        h: "He sits through the meeting.",
        p: "A call or a lecture, written down while you listen. Close the laptop and the notes are waiting: what was decided, and who is doing what.",
      },
      {
        art: "/os-hands.jpg",
        h: "He knows your people.",
        p: "Which Ravi you meant, who you message on a Friday, what you told him last month. No more introducing yourself to your own software.",
      },
      {
        art: "/os-memory.jpg",
        h: "He asks before he acts.",
        p: "Nothing is bought, sent, posted or deleted until you say yes. It is a rule in the code, not a promise in a prompt.",
      },
    ],
    fast: [
      { t: "Reading", h: "Something dense?", p: "\u201cExplain this like I'm five.\u201d He does, right there.", shot: "" },
      { t: "Writing", h: "Email you're nervous about?", p: "\u201cIs this too rude?\u201d He'll tell you honestly, then fix it.", shot: "" },
      { t: "Forms", h: "Full of jargon?", p: "\u201cWhat do I put here?\u201d He walks you through it, field by field.", shot: "" },
      { t: "Code", h: "Won't work?", p: "\u201cWhy is this broken?\u201d He points at the line.", shot: "" },
      { t: "Meetings", h: "Back to back?", p: "He writes them down, so you can actually be in the room.", shot: "" },
      { t: "Lectures", h: "Going too fast?", p: "Same deal. Listen now, read later.", shot: "" },
    ],
    film: { src: "/Braino_Final.MP4", caption: "Don't Blink." },
    wall: [
      "Reply to an email", "Send a WhatsApp", "Call on FaceTime", "Open any app", "Open any site",
      "Switch tabs", "Close all tabs", "Search Google", "Search YouTube", "Play a song on Spotify",
      "Skip, pause, turn it up", "Set a timer", "Your next class", "What is due this week",
      "Take lecture notes", "Write up a meeting", "Fill a form", "Log you in", "Find a file",
      "Read the page with you", "Explain what is on screen", "Summarise a PDF", "Find the cheapest flights",
      "Shop on Amazon", "Put it in your calendar", "Start a Google Doc", "Draft a post for X",
      "Know which Ravi you meant", "Type at your cursor", "Check your battery", "Change your wallpaper",
      "Remember what you told him", "Moonwalk to Billie Jean",
    ],
    dayTitle: "An ordinary Tuesday with him,|morning to night",
    // You speak first, then Braino answers in the notch, live, in first person (2026-10-24).
    day: [
      { at: "8:30 am", lead: "you", you: "Good morning, Braino.", say: "Morning. Class at 9:30, the deck is due at 5, and John is waiting on a reply." },
      { at: "9:30 am", lead: "you", you: "Take notes for this class.", say: "On it. Just listen, I\u2019ll write it down." },
      { at: "10:45 am", lead: "you", you: "Done?", say: "Your notes are ready. 3 key points and one thing to revise." },
      { at: "11:30 am", lead: "you", you: "Write up this meeting.", say: "Done. Riya sends the budget by Friday. You own the deck." },
      { at: "1:15 pm", lead: "you", you: "Reply to Priya, Friday works.", say: "\u201cFriday works for me!\u201d Send it?" },
      { at: "3:00 pm", lead: "you", you: "What does this even mean?", say: "This form wants your bank details for the refund. Box 4 is your IFSC." },
      { at: "4:45 pm", lead: "you", you: "Send John the deck.", say: "Found it in Downloads. Sent to John on WhatsApp." },
      { at: "6:30 pm", lead: "you", you: "Cheapest flight to Mumbai on Friday?", say: "IndiGo, 7:10 am, \u20b94,180. Want me to open it?" },
      { at: "8:20 pm", lead: "you", you: "Play something calm.", say: "Playing Lofi Beats on Spotify. Volume down a little." },
      { at: "10:30 pm", lead: "you", you: "What did I get done today?", say: "Class, the meeting, the deck. Just the reply to Aman is still open." },
      { at: "11:45 pm", lead: "you", you: "Good night, Braino.", say: "Good night. I\u2019ll pick up from here tomorrow." },
    ],
    honest:
      "Braino is in private beta on Mac and Chrome. Leave your email below and we will let you in. Windows is not on the list yet, and we would rather say so.",
    cta: { label: "Join the waitlist", to: "#early-access" },
    state: "Runs on AffectiveOS · Private beta",
    accent: "#d9645b",
    accentDark: "#e8786e",
  },
  {
    key: "foundry",
    title: "Your AI co-founder.",
    titleTail: "He runs your distribution.",
    lede: "You build the thing. He does the half that gets it seen: the posting, the outreach, the people who said maybe.",
    tab: "Braino Foundry",
    who: "For founders",
    name: "Braino Foundry",
    claim: "You can build it.",
    claimTail: "You cannot get seen.",
    painTitle: "The problem nobody solved",
    pain: [
      "A co-founder splits the work. One in three new companies has nobody to split it with, and the half nobody covers is always the same half: getting the thing in front of people.",
      "So it costs you ten hours a week. Posting, messaging, scrolling, for a handful of real conversations, on the days you had meant to build.",
      "We asked eight founders. Eight said distribution was the biggest unsolved problem. None of them pays for a single tool that solves it, because none of those tools does the work. They hand you a dashboard and a calendar and you are still the one typing.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He writes the week.",
        p: "Five posts, drafted from what you actually shipped, in the way you actually write. One update, fitted to LinkedIn, Reddit and Instagram separately, because they are not the same room. You show up every week without writing a word.",
      },
      {
        art: "/os-voice.jpg",
        h: "He gets you named.",
        p: "More than a third of buying now starts with somebody asking an AI, and right now the answer names your competitor. He works on the reviews, the listings and the pages those answers are built from, until it names you.",
      },
      {
        art: "/os-hands.jpg",
        h: "He writes to the right people.",
        p: "Twenty messages a week, one person at a time, each one about them rather than about you. Replies tracked, follow-ups made, nothing dropped on a Thursday because you were shipping.",
      },
      {
        art: "/os-memory.jpg",
        h: "Nothing goes out without your yes.",
        p: "He drafts, you read, you say go. Nothing posts, sends or spends on its own, and he remembers what you decided in March when today contradicts it.",
      },
    ],
    handles: {
      heading: "The engines",
      note: "Four of them, and the fourth is the one nobody sells: three tools that do not know about each other is the actual problem.",
      jobs: [
        {
          n: "01",
          name: "Content",
          job: "You show up every week without writing a word.",
          points: [
            "Five posts a week, drafted from what you actually shipped.",
            "One update, fitted to each platform properly, rather than pasted into all of them.",
            "LinkedIn, Reddit, Instagram.",
          ],
          solves: "Posting stops being a second job you do at midnight.",
          state: "Running",
        },
        {
          n: "02",
          name: "Optics",
          job: "Buyers find you when they ask an AI.",
          points: [
            "More than a third of buying now starts in an AI answer rather than in Google.",
            "Right now that answer names your competitor. He works until it names you.",
            "He finds the gap, a missing page or a thin listing, and fixes it.",
          ],
          solves: "You stop being invisible in the place people now start looking.",
          state: "Next",
        },
        {
          n: "03",
          name: "Outbound",
          job: "Conversations booked, not messages sent.",
          points: [
            "Twenty messages a week, one person at a time.",
            "Written from what they are actually doing, not a template with their name dropped in.",
            "Replies tracked and followed up, nothing dropped.",
          ],
          solves: "The outreach you keep meaning to do on Sunday gets done on Tuesday.",
          state: "Planned",
        },
        {
          n: "04",
          name: "Glue",
          job: "The other three, talking to each other.",
          points: [
            "What Optics finds missing becomes next week's post.",
            "Everything lands in one inbox where you approve it, edit it or bin it.",
            "Nothing goes out without your yes.",
          ],
          solves: "Three tools that do not know about each other is the actual problem.",
          state: "Next",
        },
      ],
    },
    dayTitle: "One week of your work, done",
    day: [
      { at: "Mon", p: "You ship a feature. He was watching you build it and the post about it is already drafted, in your voice, waiting for a yes." },
      { at: "Tue", p: "The same update, rewritten three ways for three places, because a Reddit post that reads like LinkedIn gets buried on Reddit." },
      { at: "Wed", p: "Twenty people who look like your buyers. Twenty messages, one per person, each mentioning the thing they actually did." },
      { at: "Thu", p: "“Who have we not heard back from?” Nine names, sorted by who is worth chasing, with the last thing each of them said." },
      { at: "Fri", p: "Somebody asks an AI for tools like yours. This week you are in the answer, because he spent the week making that true." },
      { at: "Sun", p: "“We said we would not do enterprise this quarter.” He is right, and you had forgotten you said it." },
    ],
    honest:
      "Foundry is Braino pointed at a company, on macOS, in the same private beta. Content, optics and outreach is what he does; handing work to coding agents and checking it comes to Foundry first and has not shipped. Nothing he writes goes anywhere until you say so.",
    cta: { label: "Ask for Foundry", to: "#early-access" },
    state: "Runs on AffectiveOS \u00b7 For founders",
    accent: "#b8842a",
    accentDark: "#d3a350",
  }
];
/* Foundry is hidden until it is planned (2026-10-13): the page is Braino
   only. Its model stays defined above so it comes back with one line. */
const SHOWN_MODELS = MODELS.filter((m) => m.key !== "foundry");



/* What makes him a companion, in the home page's job-grid shape. */
const COMPANION_TRAITS = [
  { k: "Morning", h: "Knows your day", p: "Classes, deadlines and who is waiting on you, the moment you open your Mac." },
  { k: "Voice", h: "Talks back", p: "Out loud, in his own voice. Speak or type, whatever is easier." },
  { k: "Hands", h: "Gets it done", p: "Messages, emails, forms and files, in the apps you already use." },
  { k: "Memory", h: "Remembers what matters", p: "Your people, your plans, what you promised. Ask him what he remembers, anytime." },
  { k: "Trust", h: "Asks before he acts", p: "Nothing is sent, bought or deleted without your yes." },
  { k: "Calm", h: "Never nags", p: "No pop-ups, no pings. He is there when you need him, quiet when you don't." },
];

/* The questions people actually ask, answered without a word anybody would
   have to look up, and including the ones about what we did not build. */
const FAQ = [
  {
    q: "What is Braino, in one line?",
    a: "Your everyday Mac companion. He lives in your Mac's notch, sees your screen, talks back, and gets things done in your apps.",
  },
  {
    q: "How is Braino different from Siri?",
    a: "Siri can open an app or tell you the weather. Braino reads the PDF on your screen, writes the email in your voice and sends it after your yes. He sees what you are looking at, works across any app or site, and remembers you from one day to the next. Siri runs commands. Braino does the work.",
  },
  {
    q: "How is Braino different from Claude Cowork or Perplexity Computer?",
    a: "Perplexity Computer is mainly an AI operator for researching and completing tasks across apps and websites.\n\nClaude Cowork is a contained work agent: deep reasoning, long documents, research, and tasks inside the workspace you give it.\n\nBraino is meant to be with you on your Mac all day, with a persistent presence, voice, memory, desktop controls, and screen and camera awareness.\n\nThere is overlap in computer control, but they are task focused. Braino remembers across sessions, knows your people and preferences, and acts across your apps. Claude Cowork has deep project context; Braino has your personal context.\n\nA companion for your whole Mac.",
  },
  {
    q: "Is this a chatbot?",
    a: "No. A chatbot answers and leaves the work to you. He does the work, on the screen you are already on, and checks it worked before he says so.",
  },
  {
    q: "Do I need to install a new operating system?",
    a: "No. Braino is an app that runs on top of macOS. There is nothing to replace or reinstall.",
  },
  {
    q: "Will he do things without asking me?",
    a: "Never. Anything that spends money, sends a message, posts or deletes something waits for your yes. That is enforced in the code.",
  },
  {
    q: "Is it always listening?",
    a: "No. He listens when you call him: Control twice, or \u201cHey Braino\u201d if you turned it on. Listening for his name happens on your Mac, and nothing is sent until he wakes.",
  },
  {
    q: "Is my screen recorded?",
    a: "Only if you choose Learn my day. Then he keeps a text diary of your day on your Mac, which deletes itself after a week, and never includes password managers, banking apps or private windows. Choose Only when I ask, and he looks only when you ask. Screenshots are never stored.",
  },
  {
    q: "Where does my data go?",
    a: "Your requests go to the AI that thinks for him (OpenAI and Anthropic). The lasting things he remembers and your notes are kept in your Braino account. Nothing is sold. The details are on the Trust page, at affctve.com/trust.",
  },
  {
    q: "Can I delete everything?",
    a: "Yes. Switch off Learn my day and the diary stops. Deleting your account deletes everything he remembers about you.",
  },

  {
    q: "Did you build the AI itself?",
    a: "No. The thinking comes from the best models of the day, from labs like Anthropic and OpenAI. We build everything between the model and your Mac: the seeing, the hearing, the doing, the remembering, and the part that stops him sending the wrong thing.",
  },
  {
    q: "Can I use him today?",
    a: "Braino is in private beta on Mac and Chrome, and we let people in a few at a time. Join the waitlist and we will write when it is your turn.",
  },
];

/* Early access, as a section of his page. Same waitlist-signup function as
   the old /waitlist page, with the picks as categories. The open tab is
   picked for you, because that is the one you came for. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

function EarlyAccess(_: { start?: string }) {
  /* The waitlist (2026-10-14): the one thing we launch on the 16th, so it is
     the loudest section on the page. Braino only. Same waitlist table as
     before; a new email gets its place in line, a known one gets a smile. */
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "existing" | "error">("idle");
  const [position, setPosition] = useState<number | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "loading") return;
    if (!email.trim().includes("@")) { setState("error"); return; }
    setState("loading");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), categories: ["braino"], context: "braino-waitlist" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error === "already_on_waitlist") { setState("existing"); return; }
      if (!res.ok) throw new Error();
      setPosition(typeof data.position === "number" ? data.position : null);
      setState("done");
    } catch {
      setState("error");
    }
  };
  const line = state === "done"
    ? (position ? `You're number ${position} on the waitlist.` : "You're on the waitlist.")
    : state === "existing" ? "Oh, you're already signed up, cutie. Just a little longer now."
    : state === "error" ? "Hmm, that didn't go through. Check the email and try again?"
    : "Hi. Want to be one of the first to meet me?";
  const finished = state === "done" || state === "existing";
  return (
    <div className="wl wl-inline">
      <div className="wl-in">
        <div className="wl-notch"><NotchSheet className="ns-glow" done={finished} label="Braino">{line}</NotchSheet></div>
        {state === "done" && position && (
          <div className="wl-num" role="status"><small>Your place in line</small><b>#{position}</b></div>
        )}
        <p className="wl-p" hidden={!finished}>{finished ? "We'll write the moment it's your turn. Just one email, nothing else." : "Braino isn't out yet. Leave your email and we'll let you in, a few people at a time."}</p>
        {!finished && (
          <form className="wl-form" onSubmit={submit}>
            <input type="email" value={email} required autoComplete="email" placeholder="you@email.com" aria-label="Your email"
              onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }} />
            <button type="submit" disabled={state === "loading"}>{state === "loading" ? "Joining\u2026" : "Join the waitlist"}</button>
          </form>
        )}
        <p className="wl-small">Only for Mac. We only use your email to send you the invite.</p>
      </div>
    </div>
  );
}

function toMinutes(at: string) {
  const m = at.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  const pm = (m[3] || "").toLowerCase() === "pm" || (!m[3] && Number(m[1]) < 8);
  if (pm) h += 12;
  return h * 60 + Number(m[2]);
}
function DayClock({ day }: { day: DayMoment[] }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held) return;
    const t = window.setTimeout(() => setI((i + 1) % day.length), 3800);
    return () => window.clearTimeout(t);
  }, [i, held, day.length]);
  const d = day[i];
  const mins = toMinutes(d.at);
  const hourDeg = mins == null ? 0 : ((mins / 60) % 12) * 30;
  const minDeg = mins == null ? 0 : (mins % 60) * 6;
  const night = mins != null && (mins >= 19 * 60 || mins < 6 * 60);
  return (
    <div className="bf-clock bf-reveal" onMouseLeave={() => setHeld(false)}>
      <div className="bf-clock-say" key={i}>
        <span className="bf-clock-at">{d.at}</span>
        <p>{d.p || (d.you ? `\u201c${d.you}\u201d ${d.say || ""}` : d.say)}</p>
      </div>
      {mins != null ? (
        <svg className={"bf-clock-face" + (night ? " is-night" : "")} viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="94" className="bf-cf-ring" />
          {Array.from({ length: 12 }).map((_, k) => (
            <line key={k} x1="100" y1="14" x2="100" y2={k % 3 === 0 ? 26 : 21} className="bf-cf-tick" transform={`rotate(${k * 30} 100 100)`} />
          ))}
          <line x1="100" y1="100" x2="100" y2="54" className="bf-cf-hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
          <line x1="100" y1="100" x2="100" y2="30" className="bf-cf-min" style={{ transform: `rotate(${minDeg}deg)` }} />
          <circle cx="100" cy="100" r="4" className="bf-cf-dot" />
        </svg>
      ) : <div className="bf-clock-day">{d.at}</div>}
      <div className="bf-clock-times" role="tablist">
        {day.map((x, k) => (
          <button key={x.at} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onMouseEnter={() => { setI(k); setHeld(true); }} onClick={() => { setI(k); setHeld(true); }}>{x.at}</button>
        ))}
      </div>
    </div>
  );
}

/* The day as a scroll (2026-10-11). A Mac screen pins in the middle and the
   scroll is the time of day: the sky moves from morning to night, the sun and
   then the moon cross it, the menu bar clock runs, and at each moment his
   notch opens with what you said while the line under the screen says what
   happened. Between moments the notch folds and the hours sweep by. */
const SKY: [number, [number, number, number], [number, number, number]][] = [
  [8 * 60, [196, 222, 240], [246, 226, 205]],
  [13 * 60, [120, 178, 228], [200, 226, 246]],
  [17 * 60 + 30, [92, 120, 186], [244, 170, 120]],
  [19 * 60 + 30, [40, 36, 78], [150, 84, 104]],
  [22 * 60, [10, 12, 26], [30, 30, 58]],
];
function skyAt(m: number) {
  const k = SKY.findIndex((s) => s[0] >= m);
  if (k <= 0) return k === 0 ? SKY[0] : SKY[SKY.length - 1];
  const [a, b] = [SKY[k - 1], SKY[k]];
  const t = (m - a[0]) / (b[0] - a[0]);
  const mix = (x: number[], y: number[]) => x.map((v, i) => Math.round(v + (y[i] - v) * t)) as [number, number, number];
  return [m, mix(a[1], b[1]), mix(a[2], b[2])] as const;
}
function clockText(m: number) {
  const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/* `say`/`you` (2026-10-23, Foundry): Braino speaks in the notch in first
   person, and your answer shows under it. Without them, the /braino day as before. */
type DayMoment = { at: string; p?: string; say?: string; you?: string; lead?: "you" };
export function DayScroll({ day, date = "Tue 13 Oct" }: { day: DayMoment[]; date?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [f, setF] = useState(0);
  const mins = day.map((d) => toMinutes(d.at) as number);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const run = el.offsetHeight - window.innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / run)) : 0;
      setF(p * (day.length - 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [day.length]);
  const k = Math.min(day.length - 2, Math.floor(f));
  const t = f - k;
  const ease = t < 0.2 ? 0 : t > 0.8 ? 1 : (1 - Math.cos(((t - 0.2) / 0.6) * Math.PI)) / 2;
  const now = mins[k] + (mins[k + 1] - mins[k]) * ease;
  const on = ease < 0.5 ? k : k + 1;
  const open = true;
  const [, top, low] = skyAt(now);
  /* Sun from 7am to 7pm, moon after; each rides an arc over the screen. */
  const sun = Math.min(1, Math.max(0, (now - 7 * 60) / (12 * 60)));
  const moon = Math.min(1, Math.max(0, (now - 19 * 60) / (5 * 60)));
  const night = Math.min(1, Math.max(0, (now - 18 * 60) / 120));
  const parts = day.map((d) => {
    if (d.say) return { said: "", did: "", say: d.say, you: d.you || "", lead: d.lead || "" };
    const m = (d.p || "").match(/^\u201c([^\u201d]+)\u201d\s*(.*)$/);
    return m ? { said: m[1], did: m[2], say: "", you: "", lead: "" } : { said: "", did: d.p || "", say: "", you: "", lead: "" };
  });
  return (
    <div className="bf-ds" ref={ref} style={{ height: `${day.length * 55 + 60}vh` }}>
      <div className="bf-ds-pin">
        <div className="bf-ds-stage">
          <div className="bf-ds-screen">
            <div className="bf-ds-sky" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,10,24,${(night * 0.78).toFixed(2)}), rgba(20,16,40,${(night * 0.7).toFixed(2)})), url(/braino-day-wallpaper.jpg)` }}>
            <div className="bf-ds-stars" style={{ opacity: night }} />
            <i className="bf-ds-sun" style={{ left: `${8 + sun * 84}%`, top: `${70 - Math.sin(sun * Math.PI) * 52}%`, opacity: 1 - night }} />
            <i className="bf-ds-moon" style={{ left: `${10 + moon * 70}%`, top: `${66 - Math.sin(Math.min(1, moon * 1.4) * Math.PI / 2) * 40}%`, opacity: night }} />
            <MacMenuBar app="Finder" menus={["File", "Edit", "View", "Go", "Window"]} at={[date, clockText(now)]} />
            {parts[on].say ? (
              <NotchSheet className={"ns-big ns-glow bf-ds-ns ns-work"} label={parts[on].lead === "you" ? `You: \u201c${parts[on].you}\u201d` : "Braino"} done={false}
                extra={parts[on].you && parts[on].lead !== "you" ? <p className="bf-ds-did" key={`y${on}`}>You: “{parts[on].you}”</p> : undefined}>
                <span key={on}>{parts[on].say}</span>
              </NotchSheet>
            ) : (
            <NotchSheet className={"ns-big ns-glow bf-ds-ns " + (open ? "ns-work" : "is-fold")} label={parts[on].said ? "Braino" : "Live notes"} done={false}
              extra={open ? <p className="bf-ds-did" key={on}>{parts[on].did}</p> : undefined}>
              <span key={on}>{parts[on].said ? `\u201c${parts[on].said}\u201d` : "Listening. Writing it down."}</span>
            </NotchSheet>
            )}
            </div>
            <div className="bf-ds-dock" aria-hidden="true">{["#3b82f6", "#22c55e", "#f59e0b", "#1ed760", "#ef4444", "#a855f7"].map((c) => <i key={c} style={{ background: c }} />)}</div>
          </div>
          <div className="bf-ds-base" aria-hidden="true"><i /></div>
          {/* The day as a rail: every moment, the one you are on lit, a line
              filling as the hours pass. */}
          <ol className="bf-ds-rail" style={{ ["--fill" as string]: `${(f / (day.length - 1)) * 100}%` }}>
            {day.map((d, i) => <li key={d.at} className={i === on ? "on" : i < on ? "past" : ""}>{d.at}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* The Maven page's section head and strip, for his page (2026-10-29). */
function BpHead({ pill, children, side }: { pill: string; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="mv-head aff-reveal">
      <div className="mv-head-l"><span className="mv-pill">{pill}</span>{children}</div>
      {side && <div className="mv-head-r">{side}</div>}
    </div>
  );
}
const BP_STRIP = [
  { t: "Already there", p: "In your Mac's notch, on whatever you're looking at. Nothing to open." },
  { t: "Talks back", p: "Out loud, in his own voice. Speak or type, whatever is easier." },
  { t: "Asks first", p: "Nothing is sent, bought or deleted without your yes." },
];
const CLICK_LINE = "Open WhatsApp. Find Priya. Scroll up. Read. Click the box. Type. Fix a typo. Read it again. Send. ";
const SAY_LINE = "\u201cReply to Priya, Friday works.\u201d  ";

export default function BrainoFinal() {
  const { theme, toggle } = useAffTheme();
  /* Which model is open. The url can name one (/braino?model=foundry) and the
     address follows the tab. */
  const [playing, setPlaying] = useState(false);
  const [params, setParams] = useSearchParams();
  const asked = SHOWN_MODELS.findIndex((m) => m.key === params.get("model"));
  const at = asked >= 0 ? asked : 0;
  const setAt = (next: number) => {
    const key = SHOWN_MODELS[next]?.key;
    if (!key) return;
    setParams(next === 0 ? {} : { model: key }, { replace: true });
  };
  const model = SHOWN_MODELS[at];
  /* Built from the home page's own pieces (2026-10-07): lit headlines, the
     rising sections, the picture that opens to the page, its nav and footer. */
  const root = useAffReveal([at]);
  useLitWords([at]);
  useGrowHero();
  useNotchNav();

  /* /waitlist and every "Get early access" link land here with #early-access. */
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(t);
  }, [hash]);

  /* A tab change shows its story at once: the reveal only knows what was on
     the page when it started. */
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(".bp-story .aff-reveal, .bp-story .bf-reveal").forEach((el) => el.classList.add("is-in"));
  }, [at, root]);

  /* Footer game, full screen: the game window morphs out to fill the screen. */
  const [gameFull, setGameFull] = useState(false);
  const toggleGameFull = () => {
    const flip = () => setGameFull((v) => !v);
    const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (d.startViewTransition) d.startViewTransition(flip); else flip();
  };
  useEffect(() => {
    if (!gameFull) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") toggleGameFull(); };
    window.addEventListener("keydown", esc);
    window.dispatchEvent(new Event("resize"));
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [gameFull]);

  useEffect(() => {
    document.title = "Braino";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff mv bf bp bpm" data-theme={theme} ref={root} style={{ ["--acc" as string]: theme === "dark" ? model.accentDark : model.accent }}>
      <AffNav braino theme={theme} onToggle={toggle} links={[["What he does", "#does"], ["A normal day", "#day"], ["Questions", "#faq"]]} go={["Join the waitlist", "#early-access"]} />

      {/* Built the Maven page's way (2026-10-29): one framed column, every
          section a cell with a pill, a headline and one line beside it. His own
          film, scenes, day and game sit inside the cells, unchanged. */}
      <div className="mv-frame">
      <header className="mv-cell mv-hero">
        <BpHead pill="Your Mac companion" side={<>
          <p className="mv-hero-one">{model.lede}</p>
          <div className="mv-hero-cta">
            <a href="#early-access" className="aff-cta">Join the waitlist</a>
            <a href="#see" className="aff-cta aff-cta-ghost">See him work</a>
          </div>
        </>}>
          <h1 className="aff-h1 mv-h1">
            <span className="aff-h1-line">Meet Braino.</span>
            <b>Your Mac, <em className="mv-it">finally</em> listening.</b>
          </h1>
        </BpHead>
        {model.film && (
          <figure className="mv-panel bpm-film" id="film">
            <video src={model.film.src} playsInline controls={playing} preload="metadata" poster="/affective-hero.jpg"
              onClick={(e) => { setPlaying(true); void e.currentTarget.play(); }} onEnded={() => setPlaying(false)} />
            {!playing && (
              <button type="button" className="bp-film-play" onClick={(e) => {
                const video = e.currentTarget.parentElement?.querySelector("video");
                setPlaying(true);
                void video?.play();
              }}>
                <i aria-hidden="true" />
                <span>{model.film.caption}</span>
              </button>
            )}
          </figure>
        )}
      </header>
      <ul className="mv-strip">
        {BP_STRIP.map((x) => <li key={x.t}><h3>{x.t}</h3><p>{x.p}</p></li>)}
      </ul>
      <div className="mv-logos">
        <p className="aff-strip-label">Works in what you already use</p>
        <ul className="aff-strip-names aff-strip-logos">
          {(["WhatsApp", "Spotify", "Chrome", "Mail", "Finder", "Calendar"] as const).map((n) => (
            <li key={n}><AppLogo name={n} /><span>{n}</span></li>
          ))}
        </ul>
      </div>

      <main className="bp-story">
        {/* What he is, in one breath */}
        <section className="mv-cell mv-what aff-reveal">
          <p className="mv-what-k"><span className="mv-pill">What is Braino?</span><BrainoMascot size={64} /></p>
          <p className="mv-what-line">Braino is a friend who lives on your Mac. Talk to him, ask him anything about what's on your screen, and he does the work in your apps. Nothing is sent or bought without your yes.</p>
        </section>

        {/* Product preview: his scenes */}
        <section className="mv-cell mv-demo" id="see">
          <BpHead pill="Product preview" side={<p className="mv-head-desc">{model.pain[0]}</p>}>
            <h2 className="mv-h2">Stop doing the dance. <em className="mv-it">Ask</em> him.</h2>
          </BpHead>
          <BrainoScenes />
        </section>

        {/* Speed: the one dark band */}
        <section className="mv-cell mv-speed">
          <BpHead pill="Speed" side={<p className="mv-speed-sub">Replying to one message takes about twelve clicks: find the app, find the chat, read, type, check, send. With Braino it is one sentence.</p>}>
            <h2 className="aff-h1 mv-speed-h">
              <span className="aff-h1-line">One sentence</span>
              <b>beats <em className="mv-it">twelve</em> clicks.</b>
            </h2>
          </BpHead>
          <div className="mv-race">
            <div className="mv-lane is-type">
              <p className="mv-lane-k"><b>Doing it yourself</b><span>~12 steps</span></p>
              <div className="mv-run"><span className="mv-run-t">{CLICK_LINE}{CLICK_LINE}</span></div>
            </div>
            <div className="mv-lane is-maven">
              <p className="mv-lane-k"><b>Braino</b><span>1 sentence</span></p>
              <div className="mv-run"><span className="mv-run-t">{SAY_LINE}{SAY_LINE}</span></div>
            </div>
          </div>
        </section>

        {/* How it works: his Mac app tour */}
        <section className="mv-cell" id="does">
          <BpHead pill="How it works">
            <h2 className="aff-h1 mv-h2">
              <span className="aff-h1-line">You say it.</span>
              <b>Braino does it.</b>
            </h2>
          </BpHead>
          <MacApp />
        </section>
        <ul className="mv-strip">
          {model.does.slice(0, 3).map((d) => <li key={d.h}><h3>{d.h}</h3><p>{d.p}</p></li>)}
        </ul>

        {/* His jobs: everything he can do */}
        {model.wall && (
          <section className="mv-cell" id="jobs">
            <BpHead pill="His jobs" side={<p className="mv-head-desc">Say it the way you would say it to a friend. These are a start.</p>}>
              <h2 className="mv-h2">Exactly what Braino does</h2>
            </BpHead>
            <ul className="bpm-wall aff-reveal">{model.wall.map((w) => <li key={w}>{w}</li>)}</ul>
          </section>
        )}

        {/* The details: numbered grid around him */}
        <section className="mv-cell mv-details">
          <BpHead pill="Benefits"><h2 className="mv-h2">The details</h2></BpHead>
          <div className="mv-grid aff-reveal">
            {[0, 1].map((col) => (
              <ul key={col} className={"mv-grid-col" + (col ? " is-r" : "")}>
                {COMPANION_TRAITS.slice(col * 2, col * 2 + 2).map((f, i) => (
                  <li key={f.h}>
                    <span className="mv-num">[0{col * 2 + i + 1}]</span>
                    <h3>{f.h}</h3>
                    <p>{f.p}</p>
                  </li>
                ))}
              </ul>
            ))}
            <div className="mv-grid-mid">
              <div className="mv-panel bpm-him"><BrainoMascot size={180} /></div>
              <div className="mv-remember">
                <h3>{COMPANION_TRAITS[4].h}</h3>
                <p>{COMPANION_TRAITS[4].p}</p>
              </div>
            </div>
          </div>
        </section>

        {/* A normal day */}
        <section className="mv-cell bp-day" id="day">
          <BpHead pill="A normal day" side={<p className="mv-head-desc">Scroll fast or slow. Watch the day go by.</p>}>
            <h2 className="mv-h2">An ordinary Tuesday, <em className="mv-it">with him</em>.</h2>
          </BpHead>
          {model.day.every((d) => toMinutes(d.at) != null) ? <DayScroll day={model.day} /> : <DayClock day={model.day} />}
        </section>

        {/* Beyond assistants */}
        <section className="mv-cell" id="beyond">
          <BpHead pill="Beyond assistants"><h2 className="mv-h2">Other assistants answer.<br />Braino <em className="mv-it">does it</em>.</h2></BpHead>
          <div className="mv-cards aff-reveal">
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip">Here's how you could do that.</span></div>
              <h3>Every assistant</h3>
              <p>Answers in a chat window. You copy, paste, explain your screen and still do the work yourself.</p>
            </article>
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip mv-snip-face"><BrainoMascot size={40} /><span>Sent to John.</span></span></div>
              <h3>Then he <em className="mv-it">does it</em>. <span className="mv-card-tag">Only Braino</span></h3>
              <p>He sees your screen, knows your people, and does it in your apps. He remembers you tomorrow.</p>
            </article>
            <article className="mv-card">
              <div className="mv-card-top"><span className="mv-snip mv-snip-face"><BrainoMascot size={40} /><span>Send it?</span></span></div>
              <h3>Nothing goes out <em className="mv-it">without you</em>.</h3>
              <p>Anything that sends, buys, posts or deletes waits for your yes. Screenshots are never stored.</p>
            </article>
          </div>
        </section>

        {/* Who he is, then the fun parts */}
        <section className="mv-cell" id="personality">
          <BpHead pill="Personality"><h2 className="mv-h2">Not a tool. <em className="mv-it">A companion</em>.</h2></BpHead>
          <Personality />
        </section>
        <section className="mv-cell" id="fun">
          <BpHead pill="For fun"><h2 className="mv-h2">He has <em className="mv-it">moves</em>.</h2></BpHead>
          <FunParts />
        </section>

        {/* Early access, where Maven has pricing */}
        <section className="mv-cell" id="early-access">
          <BpHead pill="Early access" side={<p className="mv-head-desc">{model.honest}</p>}>
            <h2 className="mv-h2">Get in <em className="mv-it">early</em>.</h2>
          </BpHead>
          <EarlyAccess />
        </section>
      </main>

      {/* Questions */}
      <section className="mv-cell mv-faq" id="faq">
        <BpHead pill="Questions" side={<p className="mv-head-desc">Including the ones about what we did not build.</p>}><h2 className="mv-h2">Questions</h2></BpHead>
        <div className="mv-faq-list">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<i aria-hidden="true">+</i></summary>
              {f.a.split("\n\n").map((t) => <p key={t}>{t}</p>)}
            </details>
          ))}
        </div>
      </section>

      {/* Closing panel */}
      <section className="mv-cell mv-close-sec">
        <div className="mv-panel mv-close aff-reveal">
          <h2 className="aff-h1 mv-close-h">
            <span className="aff-h1-line">You already know what needs doing.</span>
            <b>Now just <em className="mv-it">say</em> it.</b>
          </h2>
          <div className="mv-close-cta">
            <a href="#early-access" className="aff-cta">Join the waitlist</a>
            <BrainoMascot size={56} />
          </div>
        </div>
      </section>

      {/* Footer: the giant wordmark with him beside it, links, then his game */}
      <footer className="mv-cell mv-foot bpm-foot">
        <div>
          <div className="mv-foot-word">
            <span>Braino</span>
            <MiniBraino size={90} />
          </div>
          <div className="mv-foot-row">
            <div className="mv-foot-brand">
              <p className="mv-foot-means">Your everyday Mac companion</p>
            </div>
            <nav className="mv-foot-links" aria-label="Footer">
              <a href="#does">What he does</a>
              <a href="#day">A normal day</a>
              <a href="#faq">Questions</a>
              <Link to="/changelog">What's new</Link>
              <Link to="/trust">Privacy</Link>
            </nav>
          </div>
          <p className="mv-foot-base">© 2026 Braino, by <Link to="/">Affective</Link> · Made in Bengaluru · <Link to="/terms">Terms</Link></p>
        </div>
      </footer>
      <div className="braino-footer mario bf-game-mount bpm-game">
        <div className={"bf-game-window" + (gameFull ? " is-full" : "")}>
          <button type="button" className="bf-game-max" onClick={toggleGameFull} aria-label={gameFull ? "Exit full screen" : "Play full screen"}>
            {gameFull
              ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>}
          </button>
          <BrainoFooterGame />
        </div>
      </div>
      </div>
    </div>
  );
}
