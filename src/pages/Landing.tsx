import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IomiNotch from "@/components/IomiNotch";
import { DISTRA_ENGINES } from "@/data/distraEngines";
import { COMPANION_ENGINES } from "@/data/companionEngines";
import BrainoFooter from "@/components/BrainoFooter";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import MiniBraino from "@/components/MiniBraino";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { BrainoTVProvider, BrainoTVScreen } from "@/components/BrainoTV";
import EmotionNetwork from "@/components/EmotionNetwork";
import HumanIntelligence from "@/components/HumanIntelligence";
import MemoryEngineViz from "@/components/MemoryEngineViz";
import HeraListening from "@/components/HeraListening";
import { ArrowUpRight } from "lucide-react";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME, EXTENSION_VERSION } from "@/lib/extensionDownload";
import "../styles/apple.css";
import "./landing.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* ============================================================================
   / — the landing page.

   The page this replaced was a stack of questions you had to open one at a
   time, a tab row that duplicated the notch, and thirty links out to finished
   pages for an unfinished product. All of that asked the visitor to do the work
   of figuring out what this is. A landing page has to assert.

   The first pass at fixing it swung too far the other way and read as a pitch
   deck: hairlines, big type, nothing to look at. So the argument stays exactly
   as it was and the surface is now the site's own Apple system, with the notch,
   the theme toggle and the real footer that every other page has.

   Free companion first, because that is how anyone meets him, then the turn
   into Distra, because founders with a distribution problem are who this is for.
   Braino Code is deliberately absent: if Distra is the wedge, a second engine on
   the same page dilutes it.
   ============================================================================ */

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);

/* Follows the page's own order, so the menu and the scroll agree. Who he is,
   which two he comes in, what is broken, then the free one and the paid one in
   that order. The tour of the character sits under all of it. */
const NOTCH_NAV = [
  { to: "/#who-is", label: "Who he is", note: "the character" },
  { to: "/#can", label: "What he can do", note: "screen, notes, dictation, tasks" },
  { to: "/#kinds", label: "The two Brainos", note: "one runs your day, one gets you found" },
  { to: "/#pricing", label: "Pricing", note: "three plans, no maths" },
  { to: "/#who", label: "Who it is for", note: "tell him what you do" },
  { to: "/#why", label: "Why him", note: "and not another AI tool" },
  { to: "/#hood", label: "Under the hood", note: "what is running inside him" },
  { to: "/#faq", label: "Questions", note: "the honest answers" },
];

/* One accent per feature, the same way the deck gives one accent per act: the
   colour is what makes four panels read as four ideas rather than one list. */
/* Free is how you meet him, not a promise about the bill. Tokens cost real
   money, so the honest shape is a real free tier that caps by session and then
   one flat price. Saying "free forever" and then metering would be the one
   thing that loses trust permanently. */
/* Who he is, before what he does. Each card holds the real mascot rig doing the
   thing the copy describes, because "he is a character" is a claim you show
   rather than assert. Same gallery /product-overview uses. */
type MascotMotion = "standing" | "walking" | "dancing" | "moonwalk";

const STORY: Array<{ number: string; label: string; title: string; description: string; art: "face" | "reactions" | MascotMotion }> = [
  { number: "01", label: "A character", title: "He is somebody, not something.",
    description: "A face on your screen with a name, a mood and a walk. Not a chat box you remember exists twice a month.", art: "face" },
  { number: "02", label: "A voice", title: "You talk. He talks back.",
    description: "Out loud, in his own voice, while you carry on doing whatever you were doing. Typing is the fallback, not the whole personality.", art: "standing" },
  { number: "03", label: "He is in it", title: "He walks onto the page with you.",
    description: "Not a mascot trapped in a widget in the corner like it is 2011. He is on the actual thing you are working on, looking at the same screen.", art: "walking" },
  { number: "04", label: "An opinion", title: "He will tell you your idea is mid.",
    description: "Respectfully. Sometimes. An assistant that says great question to everything is a very expensive mirror.", art: "reactions" },
  { number: "05", label: "A memory", title: "He knows what you did last week.",
    description: "One memory across the browser, the Mac and everything he runs. You never have to introduce yourself to your own assistant again.", art: "dancing" },
  { number: "06", label: "And yes", title: "Of course he moonwalks.",
    description: "Hat on, feet forward, gliding backwards. If you are going to talk to something every day it should at least be fun.", art: "moonwalk" },
];

function MovingBraino({ motion }: { motion: MascotMotion }) {
  const time = useTime();
  const beat = time * 3.4;
  const travel = motion === "walking" ? Math.sin(time * .72) * 28 : motion === "moonwalk" ? Math.sin(time * .58) * 34 : 0;
  const dancing = motion === "dancing";
  return (
    <div className={`po-moving-braino is-${motion}`} style={{ transform: `translateX(${travel}px)` }} aria-hidden="true">
      <Braino
        size={230} legs gloves idle
        walk={motion === "walking"} moonwalk={motion === "moonwalk"}
        accessory={motion === "moonwalk" ? "fedora" : "none"}
        expr={dancing || motion === "moonwalk" ? "mischief" : "happy"}
        lookX={motion === "walking" ? .45 : 0} lookY={dancing ? -.2 : 0}
        leftArm={dancing ? 42 + Math.sin(beat) * 30 : null}
        rightArm={dancing ? -42 + Math.sin(beat) * 30 : null}
        style={dancing ? { transform: `translateY(${-Math.abs(Math.sin(beat)) * 9}px) rotate(${Math.sin(beat) * 4}deg)`, transformOrigin: "50% 80%" } : undefined}
      />
    </div>
  );
}

const FEATURES = [
  { n: "01", ac: "ac-coral", name: "He is always on the screen",
    line: "Whatever is in front of you, he is already looking at it. Any page, any PDF, any video, no pasting and no uploading. Ask him about it the way you would ask a person sitting next to you." },
  { n: "02", ac: "ac-violet", name: "He writes down anything you listen to",
    line: "A lecture, a meeting, a two hour video you were never going to finish. He listens the whole way through and hands back notes you would actually read, plus everything you promised and immediately forgot." },
  { n: "03", ac: "ac-blue", name: "He types what you say",
    line: "Hold a key and talk. It comes out clean, punctuated and in the box you were already in, anywhere on your Mac. Faster than you type and it does not mind that you said um." },
  { n: "04", ac: "ac-green", name: "He does things for you",
    line: "Books it, buys it, finds it, fills it in. In your own browser, signed into your own accounts, not in some sandbox pretending to be the internet." },
];

const PEOPLE = [
  { id: "student", label: "A student",
    line: "Too much to read, and it is all due Friday.",
    rows: [
      ["Chat with the page", "The forty page PDF you were assigned. Or the LeetCode problem you are stuck on, explained on the page you are stuck on."],
      ["Notes from audio", "A three hour recorded lecture turns into clean notes in about four minutes."],
      ["Meetings", "Group project calls you would otherwise have to remember on your own."],
      ["Delegate", "Find the paper, fill the form, book the slot, rename the forty files."],
    ] },
  { id: "founder", label: "A founder",
    line: "Seven jobs, no one to hand any of them to.",
    rows: [
      ["Chat with the page", "A competitor's pricing page, a contract, a docs page you do not have an hour for. Ask, get the answer."],
      ["Notes from audio", "The podcast you had on at the gym becomes three things worth posting about."],
      ["Meetings", "Investor calls and customer calls. Notes after, and a list of what you promised."],
      ["Delegate", "Book the flight, buy the domain, chase the renewal you keep forgetting."],
    ] },
];

/* "Watch him work" — six slots for real footage of Braino doing the thing.
 *
 * `src` empty means the clip is not shot yet, and the tile renders as a
 * labelled slot instead of a dead player. Drop an .mp4 into public/work/ with
 * the matching name and it starts playing on its own: no other change needed.
 * A poster is optional and only ever a still from the clip itself. */
const WORK: Array<{ id: string; label: string; title: string; line: string; src?: string; poster?: string }> = [
  { id: "voice", label: "Voice", title: "You talk. He moves.",
    line: "Say it out loud and watch him go and do it, on the page you are already on.",
    src: "/work/voice.mp4" },
  { id: "delegate", label: "Delegate", title: "He runs the errand.",
    line: "Books it, buys it, fills the form, chases the renewal. In your browser, signed into your accounts.",
    src: "/work/delegate.mp4" },
  { id: "page", label: "Any page", title: "He reads what you are reading.",
    line: "A forty page PDF, a contract, a competitor's pricing. Ask, get the answer, no pasting.",
    src: "/work/page.mp4" },
  { id: "meetings", label: "Meetings", title: "He sits in and takes the notes.",
    line: "No bot in the participant list. Notes at the end, plus what you promised and forgot.",
    src: "/work/meetings.mp4" },
  { id: "distra", label: "Distra", title: "He writes the week's posts.",
    line: "In your voice, from what you actually shipped. Nothing goes out without your tap.",
    src: "/work/distra.mp4" },
  { id: "roam", label: "Roam", title: "He walks onto the page.",
    line: "Off the bar, onto whatever you are looking at, pointing at the thing he means.",
    src: "/work/roam.mp4" },
];

/* The comparison. Read across, not down: the same question answered twice. */

/* Both halves of Braino, rendered by the same component and shaped by the same
   type. The homepage's one job is to make "companion" and "Foundry" legible as
   two answers to the same question, and a shared renderer is the cheapest way
   to guarantee they never drift apart again.

   Braino Code is not in here on purpose. It is real and it has its own page,
   but leading Foundry with it put the reader in front of a build tool before
   they had met the problem Foundry exists for. It comes back further down the
   page, once, as something that arrives later. */
type EngineBlock = {
  tag: string; name: string; line: string; tone: string; body: string;
  points: Array<[string, string, string]>; foot: string; to: string; cta: string;
};

const COMPANION_DETAIL: EngineBlock[] = [
  {
    tag: "Job one", name: "Habits", line: COMPANION_ENGINES[0].job, tone: "ac-coral",
    body: "Everyone has a list of things they meant to become. The apps for it all work the same way: they hand you an empty grid and ask you to fill it in every night, forever. He does the opposite. You tell him once, and then he is the one paying attention.",
    points: [
      ["01", "One conversation sets it up", "You talk. He listens to the whole thing, then shows you what he heard, laid out. Change anything that is wrong and you are done."],
      ["02", "He breaks it into a real week", "Daily, weekly and monthly, with times that suit you rather than times that suit a template. All of it yours to move."],
      ["03", "He fills it in while you talk", "At the end of the day you say how it went, in a sentence, and watch it land. There is no form anywhere in this."],
    ],
    foot: "Coming with the first release. You have quit three of these before, and it was the typing, not the wanting.",
    to: "/onboarding", cta: "Get started",
  },
  {
    tag: "Job two", name: "Focus", line: COMPANION_ENGINES[1].job, tone: "ac-blue",
    body: "A blocker treats you like a problem to be contained. He is on the same screen as you instead, and he knows what you sat down to do, so he can tell the difference between a detour and a distraction.",
    points: [
      ["01", "He sets the room", "Notifications off, your music on, a clock you can see. One sentence starts it."],
      ["02", "He says something once", "Twenty minutes somewhere else and he mentions it, and offers to clear it away. He does not lock you out of your own computer."],
      ["03", "He takes the break with you", "The timer runs out and he asks. If you want the five minutes he will spend them doing something ridiculous."],
    ],
    foot: "Coming with the first release.",
    to: "/onboarding", cta: "Get started",
  },
  {
    tag: "Job three", name: "Routines", line: COMPANION_ENGINES[2].job, tone: "ac-green",
    body: "Some of your morning is not work, it is just admin you have done so many times you stopped noticing. He notices, because he has been sitting there watching you do it every day.",
    points: [
      ["01", "He spots it before you ask", "The same tabs, the same order, the same fifteen minutes. He brings it up rather than waiting for you to think of it."],
      ["02", "You say yes once", "And then it is his. Every morning, without a setup screen, a trigger or a flowchart anywhere."],
      ["03", "He asks the once", "He will never start something on his own, and he will not ask you twice about the same thing."],
    ],
    foot: "After the first release. Some of your day should be yours, and this is not the part.",
    to: "/onboarding", cta: "Get started",
  },
];

/* Three jobs. The names, the one-liners and the order come from the shared
   list so they can never drift from the Foundry page, but the copy is written
   for this page: shorter, second person, and without the interview counts and
   churn figures that belong in a deck. Glue is the fourth entry there and is
   not an engine here — it is the approval inbox the other three run through,
   which is a note under the cards rather than a card of its own. */
const FOUNDRY_DETAIL: EngineBlock[] = [
  {
    tag: "Job one", name: DISTRA_ENGINES[0].name, line: DISTRA_ENGINES[0].job, tone: "ac-violet",
    body: "You shipped something good this week and told nobody, because writing about it is a second job and you already have one. He reads what you built and writes it up the way you would have.",
    points: [
      ["01", "He writes like you, not like LinkedIn", "He learns your voice from a couple of hundred of your own posts, so what goes out sounds like you on a good day rather than a brand account."],
      ["02", "One thing you shipped, five places", "The same update, fitted to each platform properly, instead of the same paragraph pasted everywhere."],
      ["03", "He never starts from nothing", "Something is always listening for the conversations worth joining, so there is a reason to post before there is a post."],
    ],
    foot: "Working today.",
    to: "/braino?view=foundry#distra", cta: "See Foundry",
  },
  {
    tag: "Job two", name: DISTRA_ENGINES[1].name, line: DISTRA_ENGINES[1].job, tone: "ac-amber",
    body: "People do not open Google first any more. They ask an assistant for something like yours, and it confidently names three companies. Right now you are probably not one of them.",
    points: [
      ["01", "He checks, every week", "He asks the questions your buyers would ask, and reads back whether the answer mentions you."],
      ["02", "He works out why not", "Usually it is a missing page, a thin listing or a review nobody chased. He finds the specific gap."],
      ["03", "Then he fixes it", "The fix goes back out through Content, so the thing that got you named is also the thing you posted."],
    ],
    foot: "Next up.",
    to: "/braino?view=foundry#distra", cta: "See Foundry",
  },
  {
    tag: "Job three", name: DISTRA_ENGINES[2].name, line: DISTRA_ENGINES[2].job, tone: "ac-blue",
    body: "The cold message everyone hates is the one that was clearly sent to four hundred people. He writes the other kind, which is slow, which is why nobody does it.",
    points: [
      ["01", "He picks people who actually fit", "Not a list bought by job title. People with the problem you solve, doing something you can point at."],
      ["02", "One message, about them", "Written from what they are working on, not a template with their first name dropped into it."],
      ["03", "He drafts, you send", "He has never sent anything on his own and he never will."],
    ],
    foot: "After the first two.",
    to: "/braino?view=foundry#distra", cta: "See Foundry",
  },
];

/* Pricing as split cards: identity on the left of each card, contents on the
   right, the way Maze does it. The tri-state comparison table this replaced was
   accurate and unreadable — three kinds of mark in twelve rows is a puzzle, not
   a price. "Everything in Pro, and:" carries the ladder in four words instead. */
const PLANS: Array<{
  badge: string; name: string; desc: string; cta: string; href: string;
  stats: string[]; incHead: string; includes: string[]; tall?: boolean;
}> = [
  {
    badge: "Free", name: "Free",
    desc: "For meeting him properly, before you decide whether he is worth money.",
    cta: "Start free", href: EXTENSION_DOWNLOAD_URL,
    stats: ["Capped by session, then it resets", "Mac and Windows"],
    incHead: "Free includes:",
    includes: [
      "Chat with the page you are on",
      "Turn a lecture into notes",
      "Sit in your meeting, write it up",
      "Run an errand in your browser",
      "The whole character, not a demo of it",
    ],
  },
  {
    badge: "$15 per month", name: "Pro",
    desc: "For people who now open him more often than their email.",
    cta: "Get Pro", href: "/premium",
    stats: ["No session ceiling", "Mac and Windows, one price"],
    incHead: "Everything in Free, and:",
    includes: [
      "Voice, all day",
      "The full delegate agent",
      "Memory that keeps going",
      "Every new mode as it ships",
    ],
  },
  {
    badge: "$50 per month", name: "Braino Foundry", tall: true,
    desc: "For founders who shipped something and heard absolutely nothing back.",
    cta: "Explore Distra", href: "/distra",
    stats: ["Both engines, one price", "Runs on a server, not your laptop"],
    incHead: "Everything in Pro, and:",
    includes: [
      "He learns how you actually write",
      "Posts to X and LinkedIn on a schedule",
      "Replies in your voice, not a bot's",
      "Finds the conversations worth entering",
      "Works while your laptop is shut",
      "Reddit and Instagram, next",
    ],
  },
];

/* The punchline under the cards. Real 2026 list prices, which is the only
   reason the joke lands. Change these if they move. */
const RECEIPT: Array<[string, number]> = [
  ["Granola, for the meeting notes", 14],
  ["ChatGPT Plus, for the asking", 20],
  ["Otter, for the transcripts", 20],
  ["Someone to write your posts", 500],
];
const RECEIPT_TOTAL = RECEIPT.reduce((n, [, c]) => n + c, 0);

const FAQ = [
  { q: "Is it actually free?",
    a: "Yes. Not free-for-fourteen-days-then-we-take-your-card free. Every feature is in there. It caps by session, the way any free AI window does: you get a stretch, it resets, and when you reach the end he tells you instead of silently billing you." },
  { q: "What is Braino for Founders, and do I need it?",
    a: "Only if you are building something. The free Braino handles your day. Braino for founders, which we call Foundry, is the one you pay for when you have a company to get off the ground: it builds the product and then goes and gets it seen. It includes the free one, so it is on top of what you already have, never instead of it." },
  { q: "How is Braino Code different from Lovable or Cursor?",
    a: "Those build what you tell them, which is genuinely useful and not what is missing. None of them ask what you are actually solving, or tell you an idea is thin before you spend a week on it. Braino works that out with you first and then builds it. A badly specified idea built well is still the wrong product." },
  { q: "Why does the founder one cost more?",
    a: "Because the free one saves you an hour, and the paid one does two jobs you would otherwise hire people for. A developer is a few thousand for an MVP and a ghostwriter is five hundred a month, and neither of them has ever read your commits at two in the morning." },
  { q: "What can he actually see?",
    a: "The page you are on, when you ask. Meetings you start him in. Nothing in the background, nothing while you are not looking, and never that other tab. You know the one." },
  { q: "Does he post or send anything on his own?",
    a: "No. Money, DMs, deleting anything, and anything published for the first time all stop and ask, at every autonomy level. He decides how. You decide whether." },
  { q: "Is my data used to train anything?",
    a: "No. What he learns about you stays yours and stays in your account, which is also the only reason the memory is worth having." },
  { q: "Does it work on Windows?",
    a: "The browser Braino works anywhere Chrome does. The Mac companion is macOS only for now, because doing it properly means going deep into one operating system instead of shallow into three." },
  { q: "What happens to my meeting recordings?",
    a: "They stay yours. No bot in the call, invisible to screen share, and you can delete a recording and its notes together." },
  { q: "Who is building this?",
    a: "One person, so far. Which is exactly why the honest bits on this site exist. Faster to tell you what is not built than to let you find out the hard way." },
];

const WHY = [
  { h: "He is already there.", p: "No tab to open, no context to paste. He is on the page you are on and in the meeting you are in, which is most of the work before anyone answers anything." },
  { h: "He remembers what you did, not what you typed.", p: "Other assistants remember what you tell them. Braino remembers the pages, the meetings, the commits, and the way you actually write. One of those is a notepad. The other is a coworker." },
  { h: "He works in your browser, in your accounts.", p: "Signed in as you, on the real internet. Not a sandbox in a different window that hits a login wall and quietly gives up." },
  { h: "He finishes the job, not the sentence.", p: "Ask any of them how to do a thing and you get a very good paragraph about it. Ask him and the tab is open, the draft is written, the booking is made. An answer is where the others stop." },
];

function StampLine({ words, delay = 0, tone = false, whenVisible = false, per = 110 }: {
  words: string[]; delay?: number; tone?: boolean; whenVisible?: boolean; per?: number;
}) {
  const [shown, setShown] = useState(0);
  const hostRef = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(!whenVisible);

  // The close sits far down the page, so the stamp waits until it is actually
  // on screen. An animation that finished before you arrived is not one.
  useEffect(() => {
    if (armed || !hostRef.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setArmed(true)),
      { threshold: 0.5 },
    );
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, [armed]);

  useEffect(() => {
    if (!armed) return;
    const timers = words.map((_, i) =>
      window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), delay + i * per));
    return () => timers.forEach(window.clearTimeout);
  }, [words, delay, armed, per]);
  return (
    <span ref={hostRef} className={tone ? "tone" : undefined}>
      {words.map((w, i) => (
        <Fragment key={w + i}>
          <span className={"ld-stamp" + (i < shown ? " in" : "")}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

/* Which button to lead with. Read once on mount; the wrong guess costs nothing
   because both buttons are always present, only the emphasis moves. */
function useOS(): "mac" | "windows" | "other" {
  const [os, setOs] = useState<"mac" | "windows" | "other">("other");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Mac|iPhone|iPad/.test(ua)) setOs("mac");
    else if (/Win/.test(ua)) setOs("windows");
  }, []);
  return os;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.16 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  /* Someone who signed in from the onboarding flow can land here instead of
     back in it, because Supabase sends people to the site root when the return
     URL is not on its allow list. Carry them back where they were. */
  const navigate = useNavigate();
  useEffect(() => {
    let pending = false;
    try { pending = sessionStorage.getItem("braino.onboarding") === "1"; } catch { /* private mode */ }
    if (!pending) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      try { sessionStorage.removeItem("braino.onboarding"); } catch { /* private mode */ }
      navigate("/onboarding", { replace: true });
    });
  }, [navigate]);

  const ref = useReveal();
  const os = useOS();
  // The notch scrolls away with the page now, so once it is gone there is
  // nothing at the top at all. This brings a slim bar in to replace it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [typed, setTyped] = useState("");
  const [asking, setAsking] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [askErr, setAskErr] = useState<string | null>(null);
  // A generated column sits alongside the presets rather than replacing one, so
  // the pills stay clickable and going back is one tap.
  const [custom, setCustom] = useState<{ label: string; line: string; rows: string[][] } | null>(null);
  // Dark is the default now. Only an explicit "light" choice turns it off, so a
  // first visit is dark and a returning visitor keeps whatever they picked.
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") !== "light"; } catch { return true; }
  });
  const [askLight, setAskLight] = useState(false);
  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { if (!dark) setAskLight(false); }, [dark]);
  useEffect(() => { document.title = "Braino: speak, watch it happen"; }, []);

  // A pre-written example is on screen from the start; asking replaces it.
  // Which of the two directions is showing: the day, or the distribution.
  const [sideTab, setSideTab] = useState<"companion" | "foundry">("companion");
  // Which half of "Who is Braino?" is showing: the character, or the footage.
  const [whoIsTab, setWhoIsTab] = useState<"who" | "work">("who");
  const [who, setWho] = useState(PEOPLE[0].id);
  const person = custom ?? PEOPLE.find((x) => x.id === who) ?? PEOPLE[0];

  const askBraino = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const q = typed.trim();
    if (!q || asking) return;
    setAsking(true); setAskErr(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-for-you`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ who: q }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.rows) throw new Error(payload.error || "Could not work that one out.");
      setCustom(payload);
    } catch (err) {
      setAskErr(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }, [typed, asking]);

  return (
    <BrainoTVProvider>
    <div className={"apple ld" + (dark ? " dark" : "")} ref={ref}>
      <BrainoDefs />
      <IomiNotch nav={NOTCH_NAV} />

      <header className={"ld-bar" + (scrolled ? " is-on" : "")}>
        <a href="#top" className="ld-bar-mark">
          <span className="ld-bar-dot" aria-hidden="true" />
          <span>Braino</span>
          <span className="ld-bar-beta">BETA</span>
        </a>
      </header>

      {/* One navigation, not two. The theme toggle keeps a home of its own,
          because it is a control rather than a destination. */}
      {/* Going light is a decision worth one beat of friction. Going back to dark
          is not, so that direction stays a single click. */}
      {/* Him, top left, opposite the theme control. He is the product; the
          header was the one place on the page he was not. */}
      <a className="ld-mark" href="#top" aria-label="Braino, back to the top">
        <BrainoDefs />
        <Braino size={44} legs gloves expr="happy" />
      </a>

      <div className={"ld-theme-wrap" + (askLight ? " is-asking" : "")}>
        <button
          className="ld-theme"
          onClick={() => { if (dark) setAskLight((a) => !a); else setDark(true); }}
          aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
          title={dark ? "Light theme" : "Dark theme"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="ld-theme-ask">
          <div className="ld-theme-ask-in">
            <span>Sure? The white one will hurt your eyes.</span>
            <button type="button" className="ld-theme-yes" onClick={() => { setDark(false); setAskLight(false); }}>Yes</button>
            <button type="button" className="ld-theme-no" onClick={() => setAskLight(false)}>No</button>
          </div>
        </div>
      </div>

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <header className="ld-hero ac-coral" id="top">
        <div className="ld-hero-copy">
          <p className="apple-eyebrow">Braino</p>
          <h1 className="ld-hero-h1">A companion for everyone.<br /><span className="tone">A co-founder for founders.</span></h1>
          <p className="ld-hero-sub">
            He lives on your screen and does the boring half of your day. You talk, he moves.
            No prompt engineering degree required.
          </p>
          <div className="ld-cta">
            {/* Get Started is the front door, not a download. Handing someone a
                zip before they have an account skips every decision that makes
                Braino theirs, and there is a whole onboarding built for it. */}
            <Link to="/onboarding" className="ld-btn">
              Get started
            </Link>
            <a href="#can" className="ld-btn ghost">See what he does</a>
          </div>
          <p className="ld-hero-note">Free to start. Chrome and Mac.</p>
        </div>

        <div className="ld-hero-screen apple-reveal">
          <BrainoTVScreen className="ld-hero-video" autoOnce offer={{ src: "/Braino_Final.MP4", title: "" }} />
        </div>
      </header>

      {/* ── 2. Who is Braino ─────────────────────────────────────────── */}
      <section className="apple-story ac-coral ld-whois" id="who-is">
        <div className="story-intro apple-reveal">
          <p className="bento-eyebrow">Who is Braino?</p>
          <h2 className="story-introh">Not a tool. <span className="tone">Somebody</span> who is already there.</h2>
          <p className="story-introp">
            He is not another tab you open, use once, and abandon in a graveyard of forty
            others. He is awake to what you are doing, genuinely his own person, and weirdly
            good at getting you through the day.
          </p>
        </div>

        {/* Two ways to answer the same question: read who he is, or watch him
            do it. The footage is the more convincing half, which is why it is
            a peer tab rather than something buried further down. */}
        <div className="ws-tabs apple-reveal" role="tablist" aria-label="Who is Braino">
          <button
            type="button" role="tab" id="ws-tab-who"
            aria-selected={whoIsTab === "who"} aria-controls="ws-panel-who"
            className={"ws-tab" + (whoIsTab === "who" ? " is-on" : "")}
            onClick={() => setWhoIsTab("who")}
          >See who he is</button>
          <button
            type="button" role="tab" id="ws-tab-work"
            aria-selected={whoIsTab === "work"} aria-controls="ws-panel-work"
            className={"ws-tab" + (whoIsTab === "work" ? " is-on" : "")}
            onClick={() => setWhoIsTab("work")}
          >Watch him work</button>
        </div>

        <div
          className="po-character-grid" id="ws-panel-who" role="tabpanel"
          aria-labelledby="ws-tab-who" hidden={whoIsTab !== "who"}
        >
          {STORY.map((form) => (
            <article className="po-character-card apple-reveal" key={form.number}>
              <div className={`po-character-art is-${form.art}`}>
                {form.art === "face"
                  ? <img src="/reactions/braino-happy.svg" alt="Braino smiling" />
                  : form.art === "reactions"
                    ? <><img src="/reactions/braino-idle.svg" alt="Braino idle" /><img src="/reactions/braino-happy.svg" alt="Braino happy" /><span dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></>
                    : <MovingBraino motion={form.art} />}
              </div>
              <div className="po-character-copy">
                <span>{form.number} / {form.label}</span>
                <h3>{form.title}</h3>
                <p>{form.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div
          className="ws-grid" id="ws-panel-work" role="tabpanel"
          aria-labelledby="ws-tab-work" hidden={whoIsTab !== "work"}
        >
          {WORK.map((clip) => (
            <figure className="ws-card apple-reveal" key={clip.id}>
              <div className="ws-media">
                {clip.src ? (
                  <video
                    src={clip.src}
                    poster={clip.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    /* A clip that has not been shot yet is a 404, and a 404
                       <video> renders as a black box. Swap in the slot. */
                    onError={(e) => { e.currentTarget.closest(".ws-media")?.classList.add("is-empty"); }}
                  />
                ) : null}
                <span className="ws-slot">
                  <b>{clip.label}</b>
                  <em>clip goes here</em>
                </span>
              </div>
              <figcaption>
                <h3>{clip.title}</h3>
                <p>{clip.line}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── What he can do ────────────────────────────────────────────
          Capabilities before direction. The page used to open on "there are
          two Brainos", which asks a reader to choose a side before they know
          what the thing is. These four are what he can already do; the two
          directions below are what we point them at. */}
      <section className="ld-why-sec apple-reveal" id="can">
        <div className="ld-wrap">
          <p className="apple-eyebrow">What Braino can do</p>
          <h2 className="ld-h2">Four things, <span className="tone">before any of the rest.</span></h2>
          <p className="ld-lede">
            This is him at his simplest, in your browser and on your Mac. <b>Setup is: install
            him. That is the setup.</b>
          </p>
          <div className="ld-why">
            {FEATURES.map((f) => (
              <div key={f.n}><b>{f.name}</b><p>{f.line}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where this goes: the split, and the split is the tabs ────────
          This was two stacked sections, a bridge and then a tab strip, which
          put two headings back to back and read as cramped. It is one section
          now, and the fork in the picture IS the tab control: the reader picks
          a branch rather than reading a paragraph about there being two. Copy
          is down to a heading and one line, because the diagram is the
          argument. */}
      <section className="ld-kinds apple-reveal" id="kinds">
        <div className="ld-wrap">
          <div className="ld-split-head">
            <p className="apple-eyebrow">Where this goes</p>
            <h2 className="ld-h2">One Braino. <span className="tone">Two jobs.</span></h2>
            <p className="ld-lede">Pick the one you came for.</p>
          </div>

          <div className="ld-split">
            <figure className="ld-split-node">
              <img src="/braino-standing.svg" alt="" aria-hidden="true" />
            </figure>
            <span className="ld-split-stem" aria-hidden="true" />

            <div className="ld-split-forks" role="tablist" aria-label="Which Braino">
              <button
                type="button" role="tab" id="side-tab-companion"
                aria-selected={sideTab === "companion"} aria-controls="side-panel-companion"
                className={"ld-fork" + (sideTab === "companion" ? " is-on" : "")}
                onClick={() => setSideTab("companion")}
              >
                <i>Free</i>
                <b>Braino Companion</b>
                <span>He runs your day</span>
                <em>Habits · Focus · Routines</em>
              </button>
              <button
                type="button" role="tab" id="side-tab-foundry"
                aria-selected={sideTab === "foundry"} aria-controls="side-panel-foundry"
                className={"ld-fork is-paid" + (sideTab === "foundry" ? " is-on" : "")}
                onClick={() => setSideTab("foundry")}
              >
                <i>Paid</i>
                <b>Braino for Founders</b>
                <span>He gets you found</span>
                <em>Content · Optics · Outbound</em>
              </button>
            </div>
          </div>

          <div
            className="ld-side" id="side-panel-companion" role="tabpanel"
            aria-labelledby="side-tab-companion" hidden={sideTab !== "companion"}
          >
            <div className="ld-side-head">
              <p className="apple-eyebrow">Free, for anyone with a screen</p>
              <h3 className="ld-h2">You did not plan your day. <span className="tone">It just happened to you.</span></h3>
              <p className="ld-lede">
                You know how the good version goes. You have written it down before, in an app you
                no longer open. <b>Nothing on your computer is paying attention to whether it
                actually happens.</b> He is on the same screen you are, so he can be.
              </p>
            </div>

            {COMPANION_DETAIL.map((engine) => (
              <article className={`ld-engine-full ${engine.tone}`} key={engine.name}>
                <header>
                  <p className="ld-engine-tag">{engine.tag}</p>
                  <h3>{engine.name}</h3>
                  <p className="ld-engine-line">{engine.line}</p>
                </header>
                <div className="ld-engine-body">
                  <p className="ld-engine-intro">{engine.body}</p>
                  <ol className="ld-engine-points">
                    {engine.points.map(([n, h, t]) => (
                      <li key={n}><i>{n}</i><div><b>{h}</b><p>{t}</p></div></li>
                    ))}
                  </ol>
                  <p className="ld-engine-foot">{engine.foot}</p>
                </div>
              </article>
            ))}

            <p className="ld-lede ld-engine-tail">
              <b>Habits is the one you actually want.</b> Focus is how he keeps you at it, and
              routines is how he clears the time to get to it.
            </p>
            <p className="ld-engine-tail-cta">
              <Link to="/onboarding" className="ld-btn sm">Get started</Link>
            </p>
          </div>

          <div
            className="ld-side" id="side-panel-foundry" role="tabpanel"
            aria-labelledby="side-tab-foundry" hidden={sideTab !== "foundry"}
          >
            <div className="ld-side-head">
              <p className="apple-eyebrow">For people building something</p>
              <h3 className="ld-h2">Anyone can build now. <span className="tone">Almost nobody gets seen.</span></h3>
              <p className="ld-lede">
                You ship it, you post once, and the silence is total. We sat down with eight
                founders and every one of them said the same word. <b>Not one of them pays for
                anything that fixes it.</b>
              </p>
            </div>

            {FOUNDRY_DETAIL.map((engine) => (
              <article className={`ld-engine-full ${engine.tone}`} key={engine.name}>
                <header>
                  <p className="ld-engine-tag">{engine.tag}</p>
                  <h3>{engine.name}</h3>
                  <p className="ld-engine-line">{engine.line}</p>
                </header>
                <div className="ld-engine-body">
                  <p className="ld-engine-intro">{engine.body}</p>
                  <ol className="ld-engine-points">
                    {engine.points.map(([n, h, t]) => (
                      <li key={n}><i>{n}</i><div><b>{h}</b><p>{t}</p></div></li>
                    ))}
                  </ol>
                  <p className="ld-engine-foot">{engine.foot}</p>
                </div>
              </article>
            ))}

            <div className="ld-why ld-engine-tail">
              <div><b>All three land in one inbox</b><p>What the listener hears becomes what he posts. What is missing becomes next week. You approve, edit or bin it, out loud or with a tap, and nothing leaves without that.</p></div>
              <div><b>And then there is Braino Code</b><p>Say the thing out loud and he builds it: a real, designed, working site in about four minutes. It is not one of the three jobs above and it arrives after them, but it is real and you can watch it work.</p></div>
            </div>
            <p className="ld-engine-tail-cta">
              <Link to="/braino?view=foundry#distra" className="ld-btn sm">See Foundry</Link>
              <Link to="/code" className="ld-btn sm ghost">See Braino Code</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. Pricing ───────────────────────────────────────────────── */}
      <section className="ld-pricing apple-reveal" id="pricing">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Pricing</p>
          <h2 className="ld-h2">Three plans. <span className="tone">No credit maths.</span></h2>
          <p className="ld-lede">
            Nobody has ever enjoyed working out what 1,500 credits buys them. A free tier that caps
            by session instead of hiding half the product, one price for the companion who runs your
            day, one for the one who runs your distribution. <b>The second has the first inside it.</b>
          </p>

          <div className="ld-plans">
            {PLANS.map((p) => {
              const id = (
                <div className="ld-plan-id">
                  <span className="ld-plan-badge">{p.badge}</span>
                  <h3>{p.name}</h3>
                  <p>{p.desc}</p>
                  {p.href.startsWith("/")
                    ? <Link to={p.href} className="ld-btn sm">{p.cta}</Link>
                    : <a href={p.href} className="ld-btn sm">{p.cta}</a>}
                </div>
              );
              const body = (
                <div className="ld-plan-body">
                  <ul className="ld-plan-stats">
                    {p.stats.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <p className="ld-plan-inc-head">{p.incHead}</p>
                  <ul className="ld-plan-inc">
                    {p.includes.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              );
              return (
                <article className={"ld-plan" + (p.tall ? " is-tall" : "")} key={p.name}>
                  {p.tall
                    ? <><div className="ld-plan-top">{id}<div className="ld-plan-art"><MovingBraino motion="dancing" /></div></div>{body}</>
                    : <>{id}{body}</>}
                </article>
              );
            })}
          </div>

          <div className="ld-receipt apple-reveal">
            <p className="ld-receipt-head">Or keep paying four tools that have never met each other</p>
            <ul>
              {RECEIPT.map(([what, cost], i) => (
                <li key={what} style={{ ["--d" as string]: `${i * 120}ms` } as React.CSSProperties}>
                  <span>{what}</span><em>${cost}</em>
                </li>
              ))}
            </ul>
            <div className="ld-receipt-sub"><span>Every month, forever</span><em>${RECEIPT_TOTAL}</em></div>
            <div className="ld-receipt-us">
              <span>Braino Foundry<i>All three jobs, and the companion inside it.</i></span>
              <em>$50</em>
            </div>
          </div>

          <p className="ld-fine">
            <strong>Usage lives in Settings</strong>, so you always know where you stand. The
            founding Distra price is a lock, not a sale that quietly ends: the first hundred people
            are still paying thirty three dollars in 2029. Everything else on this page is honest
            about being early.
          </p>
        </div>
      </section>

      {/* ── The rest of him ──────────────────────────────────────────
          Not a chapter, because chapters were ceremony. One line that tells a
          reader the argument is finished and the tour starts here. */}
      <section className="ld-lead ac-violet apple-reveal" id="rest">
        <div className="ld-wrap">
          <p className="ld-lead-tag">The rest of him</p>
          <h2 className="ld-lead-name">Everything <span className="tone">else</span></h2>
          <p className="ld-lead-line">
            Who he is for, why he is not just another AI tool, and what is actually running
            underneath both of him.
          </p>
        </div>
      </section>

      {/* ── 5. Who it is for ─────────────────────────────────────────── */}
      <section className="ld-who apple-reveal" id="who">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Who it is for</p>
          <h2 className="ld-h2">Who is Braino Companion for?</h2>
          <p className="ld-lede">
            The four things never change. Only the mess around them does.
            <b> Pick the one that sounds like you.</b>
          </p>

          <div className="ld-who-bar">
            <div className="ld-who-pick" role="group" aria-label="Pick someone">
              {PEOPLE.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={"ld-who-chip" + (!custom && who === x.id ? " is-on" : "")}
                  onClick={() => { setCustom(null); setTyped(""); setWho(x.id); }}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <p className="ld-who-line">
            <span className="ld-who-tag">{person.label}</span>{person.line}
          </p>
          <div className="ld-rows">
            {person.rows.map(([k, v]) => (
              <div key={k}><b>{k}</b><p>{v}</p></div>
            ))}
          </div>

          {/* The one handoff to the second page. Everyone gets the four things;
              only people building something have the other problem. */}
          <Link to="/braino?view=foundry#distra" className="ld-founder-line">
            <b>Founder?</b>
            <span>Explore Braino Foundry</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── 6. Why him ───────────────────────────────────────────────── */}
      <section className="ld-why-sec apple-reveal" id="why">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The obvious question</p>
          <h2 className="ld-h2">Why not just use <span className="tone">any other AI tool?</span></h2>
          <div className="ld-why">
            {WHY.map((w) => <div key={w.h}><b>{w.h}</b><p>{w.p}</p></div>)}
          </div>
        </div>
      </section>

      {/* ── 7. Under the hood ────────────────────────────────────────── */}
      {/* Four, not two. The mind and the heart were the two we could point at,
          but the memory has been in production since June and the ears ship as
          their own thing, and a reader who only sees two engines has no idea
          why he remembers Tuesday or how he heard you at all. */}
      <section className="apple-blog howworks" id="hood">
        <div className="hw-title apple-reveal">
          <p className="be" style={{ color: "var(--ap-violet)" }}>Under the hood</p>
          <h2>Braino OS.</h2>
          <p className="hw-sub">
            Every Braino runs on the same four things. A mind that works out what you meant, a
            heart that reads the room, a memory that keeps what matters, and a pair of ears.
            That is why he feels like someone instead of something.
          </p>
        </div>
        <div className="apple-blog-grid apple-reveal">
          <Link className="hw-card ac-blue" to="/human-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HumanIntelligence /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The mind</span>
              <h3>Human Intelligence</h3>
              <p>He works a problem the way a person does. Your screen, your memory, the conversation, the time, the place, all pulled together to figure out what you actually want instead of what you literally typed.</p>
            </div>
            <span className="hw-read">Explore Human Intelligence <ArrowUpRight /></span>
          </Link>
          <Link className="hw-card ac-coral" to="/emotional-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><EmotionNetwork /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The heart</span>
              <h3>Emotional Intelligence</h3>
              <p>The most emotionally intelligent AI anyone has built, and yes we know how that sounds. Twelve trait modules reorder on every message, so he meets bad news differently than he meets banter.</p>
            </div>
            <span className="hw-read">Explore the Emotional Engine <ArrowUpRight /></span>
          </Link>
          <Link className="hw-card ac-violet" to="/dashboard">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><MemoryEngineViz /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The memory</span>
              <h3>Memory Engine</h3>
              <p>Nobody has ever remembered to say remember this. So he decides for himself what was worth keeping, writes it down, and keeps it current. Every fact is yours to read, edit or delete.</p>
            </div>
            <span className="hw-read">See what he has kept <ArrowUpRight /></span>
          </Link>
          <Link className="hw-card ac-green" to="/braino?view=hera">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HeraListening /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The ears</span>
              <h3>BrainoHERA</h3>
              <p>Hold a key anywhere on the Mac, say the thing, and the words land at your cursor in whatever app you were already in. No window, no answer, no chat. Just what you said, written down.</p>
            </div>
            <span className="hw-read">Explore BrainoHERA <ArrowUpRight /></span>
          </Link>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────────── */}
      <section className="ld-faq-sec apple-reveal" id="faq">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Questions</p>
          <h2 className="ld-h2">The things people <span className="tone">actually ask.</span></h2>
          <div className="ld-faq">
            {FAQ.map((f, i) => (
              <div key={f.q} className={openFaq === i ? "is-open" : undefined}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.q}<i aria-hidden="true" />
                </button>
                <div className="ld-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Close ────────────────────────────────────────────────── */}
      <section className="ld-close apple-reveal">
        <h2 className="apple-display ld-stamp-line">
          <StampLine words={["Speak,"]} whenVisible per={280} />
          {" "}
          <StampLine words={["watch", "it", "happen."]} delay={560} tone whenVisible per={280} />
        </h2>
        <div className="ld-cta ld-close-cta">
          {os === "mac" ? (
            <>
              <Link to="/braino?view=foundry" className="ld-btn">Get the Mac app</Link>
              <a href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME} className="ld-btn ghost">
                Add to Chrome
              </a>
            </>
          ) : (
            <>
              <a href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME} className="ld-btn">
                Add to Chrome
              </a>
              <Link to="/braino?view=foundry" className="ld-btn ghost">The Mac app</Link>
            </>
          )}
        </div>
        <p className="ld-close-note">
          {os === "mac"
            ? "The Mac companion is on the waitlist and not downloadable yet. The browser Braino works today, on this machine, right now."
            : os === "windows"
              ? "You are on Windows, so the browser Braino is the one for you. The Mac companion is macOS only."
              : "The browser Braino works anywhere Chrome does. The Mac companion is macOS only."}
        </p>
      </section>

      <BrainoFooter />
    </div>
    </BrainoTVProvider>
  );
}
