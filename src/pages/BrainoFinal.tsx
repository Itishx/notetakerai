import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BrainoFooterGame from "@/components/BrainoFooterGame";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
/* The jobs are written here rather than read from the site's engine data,
   because this page says a different thing: each one carries what it saves
   you, and the Foundry engines carry the deck's own bullets. The engine files
   stay the source for the pages that use them. */
import "@/components/braino-footer.css";
import "./braino-final.css";

/* ============================================================================
   /braino-final — the one page about Braino.

   Everything about him lives on one page in three tabs: Braino, Braino
   Foundry, and Braino for Mesa School of Business. They are not three
   products. They are three models of one, the way a phone has models: the same
   machine inside, pointed at a different life. The tabs change the story and
   never the thing.

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
  day: { at: string; p: string }[];
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
    title: "An AI that lives on your Mac.",
    titleTail: "And actually does things.",
    lede: "Talk to him or type. He sends the message, replies to the email, finds the file and books the thing, then remembers you. He asks before anything is sent or paid for.",
    tab: "Braino",
    who: "For everyone",
    name: "Braino",
    claim: "AI got brilliant.",
    claimTail: "It still cannot touch your screen.",
    painTitle: "The day you have now",
    pain: [
      "AI will write the email, plan the trip and draft the code. Then it hands it back, and you are the one who has to go and do it.",
      "It cannot see your screen, so you copy, paste, crop and explain. Half the job is describing your own screen to it.",
      "And every chat starts from zero. It has never met your files, your people, or what you decided last month.",
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
      { t: "Under 5 s", h: "Replies to your email", p: "Reads the thread and writes the reply in your voice. You read it, you hit send.", shot: "The notch drafting an email reply in Mail" },
      { t: "About 1 s", h: "Sends a WhatsApp", p: "“Tell John I will be late.” The right John, sent from the Mac app. No typing.", shot: "A WhatsApp message going out from the notch" },
      { t: "Instant", h: "Opens anything", p: "Any site, app, file or tab, the moment you say it.", shot: "Chrome opening YouTube as he speaks" },
      { t: "Under 1 s", h: "Knows your day", p: "“What is my next class?” Straight from your timetable, before you open a calendar.", shot: "The notch showing the next class and room" },
      { t: "Live", h: "Takes the notes", p: "A call or a lecture, written up by the time you stand up. Decisions and to-dos included.", shot: "Live Transcript in the notch during a lecture" },
      { t: "About 1 s", h: "Fills the form", p: "Everything he knows about you, filled in. He stops at submit so you can check it.", shot: "A web form filled in, cursor on Submit" },
      { t: "Under 30 s", h: "Finds the cheapest", p: "“Five cheapest flights to Mumbai on Friday.” He reads the page and tells you.", shot: "Google Flights with five results highlighted" },
      { t: "Every day", h: "Remembers you", p: "What you promised last week, how you like things, who matters. Kept on your Mac.", shot: "The Braino app's Memory page" },
    ],
    film: { src: "/Braino_Final.MP4", caption: "Don't Blink." },
    handles: {
      heading: "How he helps",
      note: "",
      jobs: [
        { n: "01", name: "He reads what is in front of you.", job: "Any page, PDF, email or error on your screen.", points: ["Ask about it like you would ask the person next to you.", "Nothing to copy or paste. He sees what you see."], solves: "No more screenshots into a chat window.", state: "Running" },
        { n: "02", name: "He goes and does it.", job: "Sends it, books it, fills it in, finds it.", points: ["In your own apps and accounts, on your real screen.", "He stops before anything is paid for or sent."], solves: "No more twenty minutes of clicking.", state: "Running" },
        { n: "03", name: "He sits through the meeting.", job: "A call, a lecture, a long video.", points: ["Notes written while you listen.", "What was decided, and who does what."], solves: "You get to be in the room.", state: "Running" },
        { n: "04", name: "He runs your day.", job: "Classes, deadlines, who is waiting on you.", points: ["Ask \u201cwhat's today?\u201d and get one answer.", "Straight from your timetable and messages."], solves: "No more checking five apps every morning.", state: "Running" },
        { n: "05", name: "He talks back.", job: "Out loud, in his own voice.", points: ["Speak or type, whichever is easier.", "Cut him off and he stops and listens."], solves: "It feels like talking to someone, not a search box.", state: "Running" },
        { n: "06", name: "He remembers.", job: "Your people, your plans, your preferences.", points: ["Kept on your Mac, not in a chat that resets.", "Read, fix or delete anything he keeps."], solves: "He gets better the longer you use him.", state: "Running" },
      ],
    },
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
    dayTitle: "An ordinary Tuesday with him, morning to night",
    day: [
      { at: "9:10", p: "“What is on today?” He reads the day back before you have opened a calendar, because he has one." },
      { at: "11:30", p: "An hour on a call. You never touch the keyboard. You stand up and the notes are written, with what was decided and who said they would do what." },
      { at: "1:05", p: "“Put the 6am flight to Delhi in front of me.” He books it to the last screen and waits there, because the next click spends money." },
      { at: "2:40", p: "“Tell Ilu I will send it Friday.” One Ilu in your contacts, no spelling, no number, gone in four seconds." },
      { at: "8:20 pm", p: "“Play something calm.” Spotify starts, the volume comes down, and nothing else on your screen moves." },
      { at: "10:30 pm", p: "“What did I get done today?” He reads the day back: the call, the flight, the form, and the one thing still open." },
      { at: "11:45 pm", p: "“Good night, Braino.” The day is kept on your Mac, so tomorrow's good morning starts where tonight ended." },
    ],
    honest:
      "Braino is in private beta on Mac and Chrome. Join the waitlist and we will let you in. Windows is not on the list yet, and we would rather say so.",
    cta: { label: "Ask for a seat", to: "/waitlist" },
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
    cta: { label: "Talk to us about Foundry", to: "/contact" },
    state: "Runs on AffectiveOS \u00b7 For founders",
    accent: "#b8842a",
    accentDark: "#d3a350",
  }
];

/* The marquee: everything he can do, by kind. */
const CAN_DO: Record<string, string[]> = {
  Messages: ["Send a WhatsApp", "Reply to an email", "Draft in your voice", "Message the right John", "Call on FaceTime", "Forward a link", "Reply to the last message"],
  Work: ["Take lecture notes", "Write up a meeting", "Fill a form", "Start a Google Doc", "Summarise a PDF", "Explain what is on screen", "Draft a post for X"],
  Day: ["Your next class", "What is due this week", "Put it in your calendar", "Set a timer", "Remember what you told him", "Read your day back", "Good morning briefing"],
  Web: ["Open any site", "Search Google", "Find the cheapest flights", "Compare prices", "Shop on Amazon", "Read the page with you", "Log you in"],
  Mac: ["Open any app", "Find a file", "Switch tabs", "Close all tabs", "Type at your cursor", "Change your wallpaper", "Check your battery"],
  Music: ["Play a song on Spotify", "Skip, pause, turn it up", "What song is this", "Play it on YouTube", "Play something calm", "Moonwalk to Billie Jean"],
};

/* What makes him a companion rather than a tool. Only what is built. */
const COMPANION = [
  { then: "Monday: \u201cPriya likes short replies.\u201d", now: "Thursday: her email comes in and the draft is already three lines." },
  { then: "Week one: you ask which John, every time.", now: "Week three: \u201cSend John the deck\u201d goes to your co-founder, no questions." },
  { then: "Tuesday: \u201cI'll send the invoice by Friday.\u201d", now: "Friday: \u201cWhat did I promise this week?\u201d The invoice, at the top." },
]

/* The questions people actually ask, answered without a word anybody would
   have to look up, and including the ones about what we did not build. */
const FAQ = [
  {
    q: "What is Braino, in one line?",
    a: "An AI that lives on your Mac and in your browser. Talk to him or type, and he does the job: the message, the email, the booking. Then he remembers you.",
  },
  {
    q: "Is this a chatbot?",
    a: "No. A chatbot answers and leaves the work to you. He does the work, on the screen you are already on, and checks it worked before he says so.",
  },
  {
    q: "Do I have to move to a new app?",
    a: "No. He works inside what you already use: your browser, WhatsApp, mail, calendar, your college portal. Nothing to move, nothing to set up.",
  },
  {
    q: "Can he do something I did not ask for?",
    a: "No. Anything that spends money, sends a message, posts or deletes something waits for your yes. That is enforced in the code.",
  },
  {
    q: "Are Braino, Foundry and the school one three products?",
    a: "One product in three models, like a phone. The same Braino and the same memory. Foundry is pointed at your company; the Mesa one has your school's timetable, attendance and deadlines inside him.",
  },
  {
    q: "Did you build the AI itself?",
    a: "No. The thinking comes from the best models of the day, from labs like Anthropic and OpenAI. We build everything between the model and your Mac: the seeing, the hearing, the doing, the remembering, and the part that stops him sending the wrong thing.",
  },
  {
    q: "Can I use him today?",
    a: "Braino is in private beta on Mac and Chrome; join the waitlist to get in. The school version is live at Mesa School of Business. Handing work to coding agents comes to Foundry first and has not shipped.",
  },
  {
    q: "What does it do with what it sees?",
    a: "He uses it to answer you. He reads the screen when you ask about it, and anything private is never written down. Nothing is sold, ever.",
  },
];

/* His footer, the one from his own site, with three corrections the new shape
   forces.
 *
 * Under the hood used to list Braino OS, Human Intelligence and Emotional
 * Intelligence as three things. They are one thing now and it is called
 * AffectiveOS, so the column names it once and links to where the company page
 * explains it.
 *
 * Read loses the knowledge base, which is internal.
 *
 * And every link here points at something that exists. The old first column
 * was anchors on the old landing page, which is not the front door any more,
 * so those anchors now name sections of this page. */
const FOOTER_COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    head: "Braino",
    links: [
      ["What he does", "/braino#what"],
      ["A normal day", "/braino#day"],
      ["Why not another AI tool", "/braino#faq"],
      ["Questions", "/braino#faq"],
      ["Get him", "/waitlist"],
    ],
  },
  {
    head: "The models",
    links: [
      ["Braino", "/braino"],
      ["Braino Foundry", "/braino?model=foundry"],
      ["For institutions", "/braino?model=mesa"],
    ],
  },
  {
    head: "Under the hood",
    links: [
      ["AffectiveOS", "/#technology"],
    ],
  },
  {
    head: "Read",
    links: [
      ["Braino's journal", "/journal"],
      ["Changelog", "/changelog"],
      ["Founder's letter", "/founder-letter"],
      ["The questions page", "/questions"],
    ],
  },
];

/* The film opens from the measure to the whole page as it is scrolled into,
   the same move the company page's picture makes. The progress is measured
   against the element rather than against the page, because this one sits
   halfway down a story rather than at the top of one: nought when its top edge
   is at the bottom of the screen, one by the time it has climbed most of the
   way up.

   Flat under 900px, where there is no width to grow into, and flat for anyone
   who has asked for less motion. */
function useGrow() {
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const off = window.innerWidth < 900 || still.matches;
      document.querySelectorAll<HTMLElement>("[data-grow]").forEach((el) => {
        if (off) { el.style.setProperty("--grow", "1"); return; }
        const r = el.getBoundingClientRect();
        const p = (window.innerHeight - r.top) / Math.max(240, window.innerHeight * 0.8);
        el.style.setProperty("--grow", Math.min(1, Math.max(0, p)).toFixed(3));
      });
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".bf-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs. A page parked at opacity 0
    // waiting on JS is how a site ships looking empty.
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return root;
}

/* The day, as a clock (2026-10-02): the hands move to each moment and the
   moment is told beside it, stepping on its own; the times below it are
   buttons. Replaces a long list. */
function toMinutes(at: string) {
  const m = at.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  const pm = (m[3] || "").toLowerCase() === "pm" || (!m[3] && Number(m[1]) < 8);
  if (pm) h += 12;
  return h * 60 + Number(m[2]);
}
function DayClock({ day }: { day: { at: string; p: string }[] }) {
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
        <p>{d.p}</p>
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

function CanDo() {
  const kinds = Object.keys(CAN_DO);
  const [k, setK] = useState(kinds[0]);
  const items = CAN_DO[k];
  return (
    <section className="bf-sec bf-cando">
      <div className="bf-wrap">
        <div className="bf-sec-head bf-reveal">
          <p className="bf-kicker">Everything he can do</p>
          <h2>Just say it.</h2>
        </div>
        <div className="bf-cando-tabs" role="tablist">
          {kinds.map((x) => (
            <button key={x} role="tab" aria-selected={x === k} className={x === k ? "on" : ""} onClick={() => setK(x)}>{x}</button>
          ))}
        </div>
      </div>
      <div className="bf-marquee" key={k}>
        <div className="bf-marquee-track">
          {[...items, ...items, ...items].map((t, i) => <span key={t + i}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}

export default function BrainoFinal() {
  const root = useReveal();
  const { theme, toggle } = useAffTheme();
  useGrow();
  /* Which of the three is open. A number on the page: there is nothing to
     store and nothing to look up. The url can name one, so /foundry can send
     somebody straight to his, and the address updates when the tab does. */
  const [playing, setPlaying] = useState(false);
  const [params, setParams] = useSearchParams();
  const asked = MODELS.findIndex((m) => m.key === params.get("model"));
  const at = asked >= 0 ? asked : 0;
  const setAt = (next: number) => {
    const key = MODELS[next]?.key;
    if (!key) return;
    setParams(next === 0 ? {} : { model: key }, { replace: true });
  };
  const model = MODELS[at];

  /* Changing tab is a deliberate act, so what it changes to is shown at once.
     The reveal observer only ever sees what was on the page when it started,
     and a story that swapped underneath it stayed at opacity zero: the tab
     looked empty, which is exactly the bug. */
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(".bf-story .bf-reveal")
      .forEach((el) => el.classList.add("is-in"));
  }, [at, root]);

  useEffect(() => {
    document.title = "Braino";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div
      className="bf"
      ref={root}
      data-theme={theme}
      style={{ ["--acc" as string]: theme === "dark" ? model.accentDark : model.accent }}
    >
      <nav className="bf-nav">
        <div className="bf-nav-in">
          <Link to="/braino" className="bf-logo">
            <img src="/braino-standing.svg" alt="" width={104} height={127} aria-hidden="true" />
            <span>Braino</span>
          </Link>
          <div className="bf-nav-links">
            <a href="#what">What he does</a>
            <a href="#day">A normal day</a>
            <a href="#faq">Questions</a>
            <Link to="/waitlist">Get him</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      {/* ── The claim ───────────────────────────────────────────────────────
          The reader's own sentence first, and the answer to it under that. No
          feature is mentioned on the first screen, because nobody has ever
          been sold a feature they had not yet felt the need for. */}
      {/* ── The claim ───────────────────────────────────────────────────────
          The reader's own sentence first, and the answer to it under that. No
          feature is mentioned on the first screen, because nobody has ever
          been sold a feature they had not yet felt the need for. */}
      {/* The hero belongs to the model, not to the page: you choose which
          Braino you came for and then read his opening, rather than reading a
          general one and finding the choice underneath it. */}
      <header className="bf-hero">
        <div className="bf-wrap">
          <p className="bf-eyebrow bf-reveal">Braino · Your companion on the Mac</p>
          <h1 className="bf-h1 bf-reveal">
            {model.title}
            <b>{model.titleTail}</b>
          </h1>
          <div className="bf-hero-row bf-reveal">
            <p className="bf-hero-one">{model.lede}</p>
            <div className="bf-hero-cta">
              <Link to={model.cta.to} className="bf-cta">{model.cta.label}</Link>
              {/* Braino tab only. Deliberately empty for now (2026-09-26): the
                  button is in place for when the Mac build ships. */}
              {model.tab === "Braino" && (
                <button type="button" className="bf-cta bf-cta-ghost" aria-label="Download Braino for Mac">
                  Download for Mac
                </button>
              )}
              <a href="#does" className="bf-cta bf-cta-ghost">See what he does</a>
            </div>
          </div>
        </div>
      </header>

      <div className="bf-switch" id="what">
        <div className="bf-wrap bf-switch-in">
          <div className="bf-tabs" role="tablist" aria-label="Which model">
            {MODELS.map((m, i) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={i === at}
                className={i === at ? "on" : ""}
                style={{ ["--dot" as string]: m.accent }}
                onClick={() => setAt(i)}
              >
                {/* Who it is for comes first, because that is what somebody
                    scans a chooser by. The name is what they click. */}
                <small><i aria-hidden="true" />{m.who}</small>
                <span>{m.tab}</span>
              </button>
            ))}
          </div>
        </div>
      </div>


      <main className="bf-story">
        {/* 1. The teaser, first. */}
        {model.film && (
          <section className="bf-film-sec">
            <figure className="bf-film" data-grow>
              <video
                src={model.film.src}
                playsInline
                controls={playing}
                preload="none"
                poster=""
                onClick={(e) => {
                  const el = e.currentTarget;
                  setPlaying(true);
                  void el.play();
                }}
              />
              {!playing && (
                <button type="button" className="bf-film-play" onClick={(e) => {
                  const video = e.currentTarget.parentElement?.querySelector("video");
                  setPlaying(true);
                  void video?.play();
                }}>
                  <i aria-hidden="true" />
                  <span>{model.film.caption}</span>
                </button>
              )}
            </figure>
          </section>
        )}


        {/* 2. What he is, said plainly: more than a chatbot. */}
        {model.fast && (
          <section className="bf-sec bf-define">
            <div className="bf-wrap">
              <p className="bf-kicker bf-reveal">What Braino is</p>
              <h2 className="bf-define-h bf-reveal">A chatbot tells you how. <b>Braino does it.</b></h2>
              <div className="bf-define-row bf-reveal">
                <p>Braino is a companion who lives in your Mac's notch. You talk to him like a person. He sees your screen, uses your apps and gets the job done, then remembers it, so tomorrow he already knows.</p>
                <div className="bf-vs">
                  <div><small>A chatbot</small><span>Answers in a window</span><span>Needs you to paste things in</span><span>Hands the work back to you</span><span>Forgets you when the chat ends</span></div>
                  <div className="is-us"><small>Braino</small><span>Lives in your notch</span><span>Already sees your screen</span><span>Does the work in your apps</span><span>Remembers you, on your Mac</span></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* What he does (Foundry has no time list, so his four come here). */}
        {!model.fast && (
          <section className="bf-sec" id="does">
            <div className="bf-wrap">
              <div className="bf-sec-head bf-reveal">
                <p className="bf-kicker">What he does</p>
                <h2>{model.name}</h2>
              </div>
              <div className="bf-grid bf-reveal">
                {model.does.map((d, i) => (
                  <article className="bf-cell" key={d.h} style={{ transitionDelay: `${i * 90}ms` }}>
                    <div className="bf-cell-art">
                      <img src={d.art} alt="" width={341} height={415} loading="lazy" decoding="async" />
                    </div>
                    <div className="bf-cell-say">
                      <h3>{d.h}</h3>
                      <p>{d.p}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 2. Three ways he helps (the engines, for Foundry). */}
        {model.handles && (
          <section className="bf-sec bf-handles">
            <div className="bf-wrap">
              <div className="bf-sec-head bf-reveal">
                <p className="bf-kicker">What he does for you</p>
                <h2>{model.handles.heading}</h2>
                {model.handles.note && <p className="bf-sec-note">{model.handles.note}</p>}
              </div>
              <div className={"bf-jobs" + (model.handles.jobs.length === 4 ? " bf-jobs-4" : model.handles.jobs.length > 4 ? " bf-jobs-6" : "")}>
                {model.handles.jobs.map((j) => (
                  <article className="bf-job bf-reveal" key={j.name}>
                    <div className="bf-job-top">
                      <span className="bf-job-n">{j.n}</span>
                      {j.state !== "Running" && (
                        <span className={"bf-job-state is-" + j.state.toLowerCase()}>{j.state}</span>
                      )}
                    </div>
                    <h3>{j.name}</h3>
                    <p className="bf-job-line">{j.job}</p>
                    <ul className="bf-job-points">
                      {j.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                    <p className="bf-job-solves"><i>So</i>{j.solves}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}


        {/* 4. Everything he can do, as a marquee with tabs. */}
        {model.fast && <CanDo />}

        {/* 5. A companion: he gets better the longer he knows you. */}
        {model.fast && (
          <section className="bf-sec bf-companion">
            <div className="bf-wrap">
              <div className="bf-sec-head bf-reveal">
                <p className="bf-kicker">A companion</p>
                <h2>He gets better <b>the longer he knows you.</b></h2>
              </div>
              <div className="bf-grow bf-reveal">
                {COMPANION.map((c) => (
                  <div key={c.then} className="bf-grow-row">
                    <p className="bf-grow-then">{c.then}</p>
                    <i aria-hidden="true">→</i>
                    <p className="bf-grow-now">{c.now}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. A day with him, morning to night. */}
        <section className="bf-sec bf-day" id="day">
          <div className="bf-wrap">
            <div className="bf-sec-head bf-reveal">
              <p className="bf-kicker">What changes</p>
              <h2>{model.dayTitle}</h2>
            </div>
            <DayClock day={model.day} />
            <div className="bf-honest bf-reveal">
              <p className="bf-honest-label">What is true today</p>
              <p>{model.honest}</p>
              <p className="bf-honest-go">
                <Link to={model.cta.to}>{model.cta.label}<i aria-hidden="true">→</i></Link>
                <span>{model.state}</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Questions ─────────────────────────────────────────────────────── */}
      <section className="bf-sec bf-faq-sec" id="faq">
        <div className="bf-wrap">
          <div className="bf-faq-in">
            <div className="bf-faq-head bf-reveal">
              <h2>Questions you may have.</h2>
              <p>Including the ones about what we did not build.</p>
            </div>
            {/* details/summary, so it works with no JavaScript and with a
                keyboard. */}
            <div className="bf-faq bf-reveal">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>
                    <span>{f.q}</span>
                    <i aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* His footer, as it is on his own site: the columns, then the level
          underneath them. The page ends on his own thing rather than on a
          second version of the company's. */}
      <footer className="braino-footer mario bf-game-mount">
        <nav className="bf-cols" aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div className="bf-col" key={column.head}>
              <div className="bf-col-head">{column.head}</div>
              {column.links.map(([label, to]) => (
                <Link key={label + to} to={to}>{label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="bf-game-window">
          <div className="bf-baseline">
            <span className="bf-signoff">
              Braino is a product of Affective. He runs on AffectiveOS.
            </span>
            <span className="bf-legal">
              <Link to="/">Affective</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </span>
          </div>
          <BrainoFooterGame />
        </div>
      </footer>

    </div>
  );
}
