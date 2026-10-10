import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, Lit, useAffReveal, useLitWords, useGrowHero } from "@/components/affPage";
import { useNotchNav } from "@/components/useNotchNav";
import { BrainoMascot } from "@/components/BrainoMascot";
import { AppLogo } from "@/components/AppLogo";
/* The jobs are written here rather than read from the site's engine data,
   because this page says a different thing: each one carries what it saves
   you, and the Foundry engines carry the deck's own bullets. The engine files
   stay the source for the pages that use them. */
import "./braino-final.css";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./braino-page.css";

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
    title: "An AI on your Mac",
    titleTail: "that actually does the work.",
    lede: "Braino lives in your Mac's notch. Talk to him or type. He sees your screen, does the work in the apps you already use, and remembers you. Nothing to paste, no tab to open.",
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
      heading: "Five things your Mac never had",
      note: "Each one comes from AffectiveOS, the layer he runs on. Then one rule, and two speeds.",
      jobs: [
        { n: "01", name: "He sees your screen.", job: "Any PDF, email, line of code or error you have open.", points: ["No screenshots, no copy and paste.", "Just ask: \u201cwhat does this error mean?\u201d"], solves: "You stop describing your own screen to a robot.", state: "Running" },
        { n: "02", name: "He talks back.", job: "Out loud, in his own voice.", points: ["Speak or type, whichever is easier.", "Cut him off mid-sentence and he stops and listens."], solves: "It feels like talking to someone next to you, not a search box.", state: "Running" },
        { n: "03", name: "He does the work.", job: "Mail, WhatsApp, Finder, Chrome, forms and files.", points: ["One sentence instead of ten clicks and four apps.", "On your real screen, in your own accounts."], solves: "\u201cSend John the deck\u201d is the whole job.", state: "Running" },
        { n: "04", name: "He remembers you.", job: "Your people, your plans, what you promised.", points: ["Kept on a timeline on your Mac.", "Read, fix or delete anything he keeps."], solves: "He gets better every week you use him.", state: "Running" },
        { n: "05", name: "He asks first.", job: "Anything that sends, pays, posts or deletes.", points: ["He gets it ready, then waits for your yes.", "A rule in the code, not a promise in a prompt."], solves: "You stay in charge of everything that matters.", state: "Running" },
        { n: "06", name: "He has two speeds.", job: "A reflex on your Mac, and a thinker for big jobs.", points: ["Easy asks are understood in 0.05 seconds.", "Big jobs are planned once, in about two seconds, then done."], solves: "Fast when it is simple, careful when it is not.", state: "Running" },
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
      "Braino is in private beta on Mac and Chrome. Leave your email below and we will let you in. Windows is not on the list yet, and we would rather say so.",
    cta: { label: "Get early access", to: "#early-access" },
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
    a: "An AI that lives in your Mac's notch. He sees your screen, talks back, does the work in your apps, and remembers you.",
  },
  {
    q: "How is Braino different from Siri?",
    a: "Siri can open an app or tell you the weather. Braino reads the PDF on your screen, writes the email in your voice and sends it after your yes. He sees what you are looking at, works across any app or site, and remembers you from one day to the next. Siri runs commands. Braino does the work.",
  },
  {
    q: "How is Braino different from Claude Cowork or Perplexity Computer?",
    a: "Perplexity Computer is mainly an AI operator for researching and completing tasks across apps and websites. Claude Cowork is a contained work agent: deep reasoning, long documents, research, and tasks inside the workspace you give it. Braino is meant to be with you on your Mac all day, with a persistent presence, voice, memory, desktop controls, and screen and camera awareness. There is overlap in computer control, but they are task focused. Braino remembers across sessions, knows your people and preferences, and acts across your apps. Claude Cowork has deep project context; Braino has your personal context. A companion for your whole Mac.",
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
    q: "How does AffectiveOS connect to Braino?",
    a: "AffectiveOS is the layer we built: the seeing, hearing, doing and remembering. Braino is the companion in your notch that you actually talk to. You install Braino, and AffectiveOS comes with him.",
  },
  {
    q: "Will he do things without asking me?",
    a: "Never. Anything that spends money, sends a message, posts or deletes something waits for your yes. That is enforced in the code.",
  },
  {
    q: "Where does my data live?",
    a: "What he remembers about you stays on your Mac. Only the request itself, and the context that job needs, is sent to think. Private windows and password apps are never recorded, nothing is sold, and you can read, fix or delete anything he keeps.",
  },
  {
    q: "Are Braino and Foundry two products?",
    a: "One product in two models, like a phone. The same Braino and the same memory. Foundry is pointed at your company and helps it get seen.",
  },
  {
    q: "Did you build the AI itself?",
    a: "No. The thinking comes from the best models of the day, from labs like Anthropic and OpenAI. We build everything between the model and your Mac: the seeing, the hearing, the doing, the remembering, and the part that stops him sending the wrong thing.",
  },
  {
    q: "Can I use him today?",
    a: "Braino is in private beta on Mac and Chrome, and we let people in a few at a time. Leave your email in early access and we will write when it is your turn.",
  },
];

/* Early access, as a section of his page. Same waitlist-signup function as
   the old /waitlist page, with the picks as categories. The open tab is
   picked for you, because that is the one you came for. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;
const PICKS = [
  { id: "braino", name: "Braino", who: "For everyone", line: "Talk to your Mac and he does the job." },
  { id: "foundry", name: "Braino Foundry", who: "For founders", line: "Gets your startup seen: posts, replies and intros." },
];
const NEXT = [
  { h: "You are on the list", p: "Right away. One email to say so, nothing else." },
  { h: "We send you an invite", p: "In small batches, so every new person gets looked after." },
  { h: "You talk to your Mac", p: "Install Braino, say hello, and give him his first job." },
];

function EarlyAccess({ start }: { start: string }) {
  const [picked, setPicked] = useState<Set<string>>(new Set([start]));
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "existing" | "error" | "pick">("idle");
  useEffect(() => { setPicked((cur) => (cur.has(start) ? cur : new Set([...cur, start]))); }, [start]);
  const toggleOne = (id: string) => {
    setPicked((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    if (state === "pick") setState("idle");
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "loading") return;
    if (!email.trim().includes("@")) { setState("error"); return; }
    if (picked.size === 0) { setState("pick"); return; }
    setState("loading");
    const categories = Array.from(picked);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), categories, context: `braino-early-access:${categories.join(",")}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setState(data.error === "already_on_waitlist" ? "existing" : "done");
    } catch {
      setState("error");
    }
  };
  const finished = state === "done" || state === "existing";
  return (
    <section className="bf-sec bf-ea" id="early-access">
      <div className="bf-wrap">
        <div className="bf-sec-head bf-reveal">
          <p className="bf-kicker">Early access</p>
          <h2>Be one of the first <b>to talk to your Mac.</b></h2>
          <p className="bf-sec-note">Braino is in private beta. We let people in a few at a time, so we can watch how it goes and fix what does not.</p>
        </div>
        <form className="bf-ea-box bf-reveal" onSubmit={submit}>
          {finished ? (
            <div className="bf-ea-done" role="status">
              <span className="bf-ea-check" aria-hidden="true" />
              <div>
                <h3>{state === "done" ? "You are on the list." : "You are already with us."}</h3>
                <p>We will write when it is your turn. Nothing else in between.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="bf-ea-k">What do you want to try?</p>
              <div className="bf-ea-picks">
                {PICKS.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <button type="button" key={p.id} className={"bf-ea-pick" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggleOne(p.id)}>
                      <span className="bf-ea-tick" aria-hidden="true" />
                      <small>{p.who}</small>
                      <b>{p.name}</b>
                      <span>{p.line}</span>
                    </button>
                  );
                })}
              </div>
              <label className="bf-ea-k" htmlFor="bf-ea-email">Your email</label>
              <div className="bf-ea-row">
                <input id="bf-ea-email" type="email" value={email} required autoComplete="email" placeholder="you@somewhere.com"
                  onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }} />
                <button type="submit" className="bf-cta" disabled={state === "loading"}>{state === "loading" ? "Joining\u2026" : "Get early access"}</button>
              </div>
              {state === "error" && <p className="bf-ea-msg" role="alert">That did not go through. Check the email and try once more.</p>}
              {state === "pick" && <p className="bf-ea-msg" role="alert">Pick at least one above, so we know what to write to you about.</p>}
            </>
          )}
        </form>
        <ol className="bf-ea-next bf-reveal">
          {NEXT.map((n, i) => <li key={n.h}><span>{i + 1}</span><h3>{n.h}</h3><p>{n.p}</p></li>)}
        </ol>
        <p className="bf-ea-small">Braino runs on a Mac and in Chrome. We only use your email to send you the invite and the occasional note about what is new.</p>
      </div>
    </section>
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
  const { theme, toggle } = useAffTheme();
  /* Which model is open. The url can name one (/braino?model=foundry) and the
     address follows the tab. */
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

  useEffect(() => {
    document.title = "Braino";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff bf bp" data-theme={theme} ref={root} style={{ ["--acc" as string]: theme === "dark" ? model.accentDark : model.accent }}>
      <AffNav theme={theme} onToggle={toggle} links={[["What he does", "#what"], ["A normal day", "#day"], ["Questions", "#faq"]]} />

      {/* ── Hero: the home page's, with him in it ── */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">{model.title}</span>
              <b>{model.titleTail}</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">{model.lede}</p>
              <div className="aff-hero-cta">
                <a href={model.cta.to} className="aff-cta">{model.cta.label}</a>
                {model.film
                  ? <a href="#film" className="aff-cta aff-cta-ghost">Watch the film</a>
                  : <a href="#does" className="aff-cta aff-cta-ghost">See what he does</a>}
              </div>
            </div>
          </div>
          {/* The two models, as the home page's quiet pills. */}
          <div className="bp-tabs aff-reveal" role="tablist" aria-label="Which model" id="what">
            {MODELS.map((m, i) => (
              <button key={m.key} type="button" role="tab" aria-selected={i === at} className={i === at ? "on" : ""} onClick={() => setAt(i)}>
                <small>{m.who}</small>
                <span>{m.tab}</span>
              </button>
            ))}
          </div>
        </div>
        {model.film ? (
          <figure className="aff-hero-shot bp-film" data-grow id="film">
            <video src={model.film.src} playsInline controls={playing} preload="metadata" poster="/affective-hero.jpg"
              onClick={(e) => { setPlaying(true); void e.currentTarget.play(); }} />
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
        ) : (
          <figure className="aff-hero-shot" data-grow>
            <img src="/os-hands.jpg" alt="" width={1774} height={887} loading="eager" decoding="async" />
          </figure>
        )}
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Works in what you already use</p>
            <ul className="aff-strip-names aff-strip-logos">
              {(["WhatsApp", "Spotify", "Chrome", "Mail", "Finder", "Calendar"] as const).map((n) => (
                <li key={n}><AppLogo name={n} /><span>{n}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main className="bp-story">
        {/* ── What he is: the home page's Meet Braino box ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <p className="ah-kicker">{model.painTitle}</p>
            <h2 className="aff-h1 ah-os-line hb6-big" data-lit><Lit text={`${model.claim} ${model.claimTail}`} /></h2>
            <div className="ah-os-say hb6-say aff-reveal">
              {model.pain.map((p) => <p key={p}>{p}</p>)}
            </div>
            <div className="hb6-box aff-reveal">
              <div className="hb6-head">
                <div>
                  <p className="ah-kicker">{model.who}</p>
                  <div className="hb5-name">
                    <h2>{model.name}</h2>
                    <BrainoMascot size={92} className="hb4-him" />
                  </div>
                  <p className="hb6-line">{model.fast ? "Stop chatting with AI. Start handing it the work. He sees your screen, uses your apps, gets it done and remembers it." : "You build the thing. He does the half that gets it seen."}</p>
                </div>
              </div>
              <ul className="hb4-does hb6-jobs" id="does">
                {(model.fast
                  ? model.fast.map((f) => ({ k: f.t, h: f.h, p: f.p }))
                  : model.does.map((d) => ({ k: "", h: d.h, p: d.p }))
                ).map((d) => (
                  <li key={d.h} className={d.k ? "is-key" : undefined}>{d.k && <small>{d.k}</small>}<h3>{d.h}</h3><p>{d.p}</p></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Five things your Mac never had / the engines ── */}
        {model.handles && (
          <section className="ah-os bp-handles">
            <div className="aff-wrap">
              <p className="ah-kicker">What he does for you</p>
              <h2 className="aff-h1 ah-os-line" data-lit><Lit text={model.handles.heading} /></h2>
              {model.handles.note && <div className="ah-os-say aff-reveal"><p>{model.handles.note}</p></div>}
              <ul className="hb4-does hb6-jobs bp-jobs aff-reveal">
                {model.handles.jobs.map((j) => (
                  <li key={j.name} className={j.state !== "Running" ? "is-key" : undefined}>
                    <small>{j.state !== "Running" ? j.state : j.n}</small>
                    <h3>{j.name}</h3>
                    <p>{j.job}</p>
                    <p className="bp-job-so">{j.solves}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Everything he can do ── */}
        {model.fast && <CanDo />}

        {/* ── A companion ── */}
        {model.fast && (
          <section className="ah-os bp-companion">
            <div className="aff-wrap">
              <p className="ah-kicker">A companion</p>
              <h2 className="aff-h1 ah-os-line" data-lit><Lit text="He gets better *the longer he knows you.*" /></h2>
              <div className="bp-grow aff-reveal">
                {COMPANION.map((c) => (
                  <div key={c.then} className="bp-grow-row">
                    <p>{c.then}</p>
                    <i aria-hidden="true">→</i>
                    <p className="bp-grow-now">{c.now}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── A day with him ── */}
        <section className="ah-os bp-day" id="day">
          <div className="aff-wrap">
            <p className="ah-kicker">What changes</p>
            <h2 className="aff-h1 ah-os-line" data-lit><Lit text={model.dayTitle} /></h2>
            <DayClock day={model.day} />
            <div className="ah-os-say aff-reveal bp-honest">
              <p className="ah-kicker">What is true today</p>
              <p>{model.honest}</p>
              <a href={model.cta.to} className="aff-cta">{model.cta.label}<i aria-hidden="true">→</i></a>
            </div>
          </div>
        </section>
      </main>

      <EarlyAccess start={model.key} />

      {/* ── Questions: the home page's ── */}
      <section className="hb2-faq" id="faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>Including the ones about what we did not build.</p>
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
      <section className="hb-end">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal">
          <h2 className="aff-h1 hb-end-line" aria-label="Make your Mac more Affective with Braino.">
            Make your Mac more{" "}
            <span className="hb-end-logo-wrap"><img className="hb-end-logo" src="/affective-logo.png" alt="" width={1000} height={207} aria-hidden="true" /></span>
            <span className="hb-end-with">with <span className="hb-end-braino">Braino.</span></span>
          </h2>
          <p className="hb-end-p">Braino is in private beta. We are letting people in a few at a time.</p>
          <div className="hb-go">
            <a href="#early-access" className="aff-cta">Get early access</a>
            <Link to="/affectiveos" className="aff-cta aff-cta-ghost">Read about AffectiveOS</Link>
          </div>
        </div>
      </section>

      <AffFooter />
    </div>
  );
}
