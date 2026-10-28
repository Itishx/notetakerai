import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import { VoiceToAction, NotchSheet, MacMenuBar, EffortChartCompact } from "./aff-figures";
import { BrainoMascot } from "@/components/BrainoMascot";
import { LaunchPill } from "@/components/LaunchPill";
import { MacTaskFilm } from "@/components/MacTaskFilm";
import { BrainoShowcase } from "@/components/BrainoShowcase";
import { AppLogo } from "@/components/AppLogo";
import { MavenFace, MvSceneFilm } from "./Maven";

/* ============================================================================
   / — the homepage. Order locked 2026-10-02: the product first, then why it
   works, then who makes it (the Apple and iPhone pattern). Hero, Braino and
   the demo, AffectiveOS as one "why it works" section, questions, the end.
   Foundry and Schools are footer links only. The long version of
   the company is /about; the letter and technical note is /affectiveos.

   (What follows is the /about header, kept because it still describes the
   sections below.)
   /about — the long version of the company.

   This was the homepage until the homepage became the short, flashy one. It
   moved here whole, so nothing it explains was lost. The technical explainer
   of AffectiveOS lives on its own page at /affectiveos.

   Seven sections, one scroll: what we do, the technology, the products, why,
   questions, early access, footer. Braino gets three sentences and a link;
   his own site does the rest. A company page that tells the whole product
   story leaves the product page with nothing to say.

   Three rules, all three arguments rather than decoration.

   The grid has no gaps. A gutter says "separate things arranged", a shared edge
   says "one system divided", which is the claim the page is making.

   Headings are the serif, body is the sans, split by ROLE rather than by size.
   The serif makes claims and says true things; the sans explains and lists. That
   split is what stops a page this long reading as one wall.

   And the copy is written for somebody who has never heard of an accessibility
   tree. Nobody has ever wanted "screen awareness"; they want to not have to do
   it themselves. Every technical sentence was cut or translated.
   ============================================================================ */

/* Braino is the product. Foundry is a model of it.
 *
 * Tabs made them siblings, which is the confusion: Affective is Apple, Braino
 * is the iPhone, and Foundry is the Pro. So the box is Braino, whole, and the
 * models are a line at the bottom of it, the way a product page ends on which
 * one is right for you. His own site does the full lineup. */
const BRAINO = {
  to: "/braino",
  name: "Braino",
  est: "Est. 2026",
  kind: "Browser and Mac",
  line: "Your own Jarvis.",
  lead:
    "A companion who lives on your screen. Tell him what you want and he goes and does it, instead of telling you how. He remembers what you told him last month.",
  does: [
    {
      art: "/os-senses.jpg",
      h: "He is already there.",
      p: "In your browser and your Mac's notch, on whatever you are looking at. Nothing to open, nothing to paste. Asking him is as quick as thinking it.",
    },
    {
      art: "/os-voice.jpg",
      h: "He sits through the meeting.",
      p: "A lecture or a call, written down while you listen. Close the laptop and the notes are waiting: what was decided, and who is doing what.",
    },
    {
      art: "/os-hands.jpg",
      h: "He knows your people.",
      p: "Who you message on a Friday, which Ravi you meant, what you told him last month. No more introducing yourself to your own software every morning.",
    },
    {
      art: "/os-memory.jpg",
      h: "He asks before he acts.",
      p: "Nothing is bought, sent, posted or deleted until you say yes. It is a rule in the code, not a promise in a prompt.",
    },
  ],
  state: "Runs on AffectiveOS \u00b7 Private beta",
};

/* What Braino takes off your plate. Each one is a chore, then how it goes
   away, because people buy the chore gone, not the ability. The last one is
   the one only he does, so it is marked. Every chore here runs in the beta. */
/* Maven first (2026-10-28, Itish): Maven is the first product out; Braino is
   kept for Labs, where people discover him. The six jobs are Maven's real list. */
const MAVEN_DOES = [
  { h: "Stop typing.", p: "Hold nothing. Press ⌃⌥, talk the way you talk, press again. Clean, punctuated text lands wherever your cursor is." },
  { h: "Stop fixing what you said.", p: "Ums go, full stops come in, and when you change your mind it keeps the last thing you said. Lists, ₹, lakh and phone numbers come out right." },
  { h: "Stop hunting for apps and tabs.", p: "Press fn⌃ and say \u201copen YouTube\u201d or \u201copen Slack\u201d. You're there." },
  { h: "Stop writing the same messages.", p: "\u201cTell Neha I'm running late.\u201d It drafts it on WhatsApp and sends only after your yes." },
  { h: "Stop filling the same forms.", p: "\u201cFill in my address.\u201d Your saved details go in, and it stops before Submit." },
  { h: "Talk in English, Hindi or Hinglish.", p: "Maven understands all three and writes each one the way you'd type it.", key: "Only Maven" },
];
const MAVEN_FAQS = [
  { q: "What is Maven?", a: "A small AI buddy for your Mac. It writes what you say, properly, wherever you type, and does the one small job that comes next. It never talks back." },
  { q: "Which languages does it understand?", a: "English, Hindi and Hinglish. It works out which one you're speaking, and Hindi stays in Devanagari while Hinglish stays in Roman letters." },
  { q: "Will it send or submit anything without asking?", a: "No. Messages, replies and forms always wait for your yes." },
  { q: "How is it different from Wispr Flow?", a: "Wispr Flow types what you say. Maven does that too, then does the small job that comes next: opening apps, sending a message, filling a form. It's also cheaper." },
  { q: "What is Braino?", a: "A companion who lives in your Mac's notch. He sees your screen, hears you, talks back, does the work in your apps and remembers you. He's in the lab now." },
  { q: "When can I use Braino?", a: "He's in private beta while he grows. Join the waitlist on his page and we'll let you in as places open." },
  { q: "What is AffectiveOS?", a: "The layer we built that Maven and Braino run on. It lets the Mac you already own hear you, use your apps and remember you." },
  { q: "Does it work on Windows?", a: "Not yet. Mac only for now." },
  { q: "Where does my voice go?", a: "It's turned into text in the cloud and never kept. Your history stays on your Mac." },
  { q: "What else is Affective building?", a: "Some bigger things, in Labs. Go and have a look." },
];

const DOES = [
  { h: "Stop typing the same replies.", p: "Say \u201ctell Priya Friday works.\u201d He opens WhatsApp, writes it the way you would, and sends it after your yes." },
  { h: "Stop taking notes in meetings.", p: "He listens to the call or the lecture. Close the laptop and the notes are waiting: what was decided, and who does what." },
  { h: "Stop checking five apps every morning.", p: "Ask \u201cwhat's today?\u201d and get one answer: your meetings, your deadlines, and who is waiting on you." },
  { h: "Stop digging for that file.", p: "Say what it was about, and he finds it and opens it. No folders, no search bar." },
  { h: "Stop filling the same forms.", p: "Your name, your email, the login you always forget. He fills it in and stops before submit." },
  { h: "Stop explaining yourself to your software.", p: "He remembers your people and what you told him last month, so you never start from zero.", key: "Only Braino" },
];

const FAQS = [
  { q: "What is Braino?", a: "A companion who lives in your Mac's notch. You say what you want, and he does it in the apps you already use." },
  { q: "What is Braino Foundry?", a: "Braino, as your startup's CMO. He gets your product found on Google and AI, gets it seen with posts and launch listings, and finds the people asking for what you made, so you get your first users and first paying customers. You only say yes. See affctve.com/foundry." },
  { q: "What is AffectiveOS?", a: "The layer we built that Braino runs on. It lets the Mac you already own see your screen, hear you, talk back, use your apps and remember you." },
  { q: "Do I have to install a new operating system?", a: "No. AffectiveOS runs on top of macOS. You install Braino, and that is it." },
  { q: "Who makes Braino?", a: "Affective, a small product company in Bengaluru. Braino is the first thing we have built." },
  { q: "What do I need?", a: "A Mac. Braino lives in the notch on the Mac and also works in Chrome." },
  { q: "Will it do things without asking me?", a: "No. Anything that spends money, sends a message, posts in public or deletes something waits for your yes, every time." },
  { q: "Is it always listening?", a: "No. He listens when you call him: Control twice, or \u201cHey Braino\u201d if you turned it on, which is heard on your Mac only." },
  { q: "Is my screen recorded?", a: "Only if you choose Learn my day: a text diary of your day, on your Mac, gone after a week, never password apps, banking or private windows. Or choose Only when I ask. Screenshots are never stored." },
  { q: "Where does my data go?", a: "Requests go to the AI that thinks for him (OpenAI and Anthropic). What he remembers and your notes live in your Braino account. Nothing is sold. Full details on the Trust page." },
  { q: "Can I delete everything?", a: "Yes. Turn off Learn my day anytime, and deleting your account deletes everything he remembers." },
  { q: "How do I get it?", a: "Braino is in private beta. Join the waitlist and we will invite you as places open up." },
];

/* Smooth wallpapers, in the macOS way: soft colour fields, no picture. */
const WALLS = [
  "radial-gradient(120% 90% at 15% 10%, #ffb48a 0%, transparent 55%), radial-gradient(110% 90% at 90% 20%, #c79bff 0%, transparent 55%), radial-gradient(120% 120% at 50% 110%, #3a5bd9 0%, #1d2b6b 70%)",
  "radial-gradient(110% 90% at 85% 0%, #ffd6a0 0%, transparent 50%), radial-gradient(100% 90% at 10% 30%, #f28fb0 0%, transparent 55%), radial-gradient(120% 120% at 60% 110%, #6a4cd8 0%, #241a55 75%)",
  "radial-gradient(110% 90% at 20% 0%, #a8f0d8 0%, transparent 50%), radial-gradient(100% 90% at 90% 40%, #5fb4ff 0%, transparent 55%), radial-gradient(120% 120% at 40% 110%, #155e75 0%, #0b2a3a 75%)",
  "radial-gradient(110% 90% at 80% 10%, #ffe28a 0%, transparent 50%), radial-gradient(100% 90% at 10% 50%, #ff8a5c 0%, transparent 55%), radial-gradient(120% 120% at 50% 110%, #b3344a 0%, #4a1626 75%)",
  "radial-gradient(110% 90% at 10% 10%, #d7c8ff 0%, transparent 50%), radial-gradient(100% 90% at 90% 30%, #8fd3ff 0%, transparent 55%), radial-gradient(120% 120% at 50% 110%, #4b3fb0 0%, #1a1546 75%)",
  "radial-gradient(110% 90% at 85% 10%, #c6f6a0 0%, transparent 50%), radial-gradient(100% 90% at 10% 40%, #58d6b0 0%, transparent 55%), radial-gradient(120% 120% at 50% 110%, #1f6f5c 0%, #0b2b26 75%)",
];

/* Six live tiles under the AffectiveOS line: one per thing it gives your
   Mac, each drawn in code and moving on its own. */
const TILES = [
  { k: "see", h: "Your Mac sees your screen.", p: "We give it eyes. Whatever you have open, it already knows, so you never copy, paste or explain." },
  { k: "talk", h: "Your Mac talks back.", p: "We give it a voice. It answers out loud, and stops the moment you cut in, like a person would." },
  { k: "do", h: "Your Mac does the work.", p: "We give it hands. The message sent, the form filled, the flight found, in the apps you already use." },
  { k: "keep", h: "Your Mac remembers you.", p: "We give it a memory. Who John is, when your class starts, how you like your replies, kept on your Mac." },
  { k: "ask", h: "Your Mac asks first.", p: "We give it manners. Nothing is bought, sent, posted or deleted until you say yes." },
]

/* The closing notch: Braino's face, then one request at a time typed out
   under him, the way the notch shows what it heard. */
const END_ASKS = [
  "Tell John I'll be ten minutes late.",
  "What is due this week?",
  "Fill this form in for me.",
  "Find the cheapest flight to Delhi on Friday.",
  "Draft a reply to this email.",
];

function EndNotch() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const full = END_ASKS[i];
    const t = window.setTimeout(() => {
      if (n < full.length) setN(n + 1);
      else { setN(0); setI((i + 1) % END_ASKS.length); }
    }, n < full.length ? 42 : 2200);
    return () => window.clearTimeout(t);
  }, [i, n]);
  return (
    <div className="hb-notch" aria-hidden="true">
      <NotchSheet done={false} className="ns-heard">{END_ASKS[i].slice(0, n)}<span className="hb-caret" /></NotchSheet>
    </div>
  );
}

/* The six things, with ONE notch: the verbs stacked on the left, the notch on
   the right showing whichever one is active. It steps through them on its
   own and stops when you point at one. */
/* A desktop behind the notch, a different one per verb, from the company's
   own pictures, the way a Mac shows a wallpaper behind the menu bar. */
const NV_APPS = ["Chrome", "Finder", "WhatsApp", "Notes", "LinkedIn", "Calendar"];
const NV_WALLS = ["/affective-hero.jpg", "/os-voice.jpg", "/os-hands.jpg", "/os-memory.jpg", "/os-senses.jpg", "/affective-footer.jpg"];

function NotchVerbs() {
  const [on, setOn] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held) return;
    const t = window.setTimeout(() => setOn((on + 1) % TILES.length), 4200);
    return () => window.clearTimeout(t);
  }, [on, held]);
  /* The notch is the thing, so it gets the stage: a thin strip of desktop,
     just the menu bar and the notch, and the six things as a row under it. */
  return (
    <div className="nv2 aff-reveal" onMouseLeave={() => setHeld(false)}>
      <div className="nv2-strip vz-wall" aria-live="polite" style={{ backgroundImage: WALLS[on % WALLS.length] }}>
        <MacMenuBar app={NV_APPS[on % NV_APPS.length]} />
        <div className="nv2-notch" key={TILES[on].k}><TileArt k={TILES[on].k} big /></div>
      </div>
      <ol className="nv2-row">
        {TILES.map((t, i) => (
          <li key={t.k} className={i === on ? "on" : ""}>
            <button type="button" onMouseEnter={() => { setOn(i); setHeld(true); }} onFocus={() => { setOn(i); setHeld(true); }} onClick={() => { setOn(i); setHeld(true); }} aria-pressed={i === on}>
              {i === on && !held && <span className="nv-bar" key={on} aria-hidden="true" />}
              <span className="nv2-h">{t.h.replace("Your Mac ", "").replace(/^./, (c) => c.toUpperCase())}</span>
              <span className="nv2-p">{t.p}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* Every tile is the notch, because everything happens in the notch: each one
   shows the same black sheet saying or doing its one thing. */
/* Braino moonwalking across the closing section, the dance-grid move. */
function MoonwalkStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTime();
  const [w, setW] = useState(900);
  useLayoutEffect(() => {
    const measure = () => ref.current && setW(ref.current.clientWidth);
    measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure);
  }, []);
  const SIZE = 120, span = w + SIZE * 1.6;
  const x = w + SIZE * 0.7 - ((t * 70 + w * 0.5) % span);
  return (
    <div className="hb-moon" ref={ref} aria-hidden="true">
      <BrainoDefs />
      <div className="hb-moon-shadow" style={{ left: x }} />
      <div className="hb-moon-dancer" style={{ left: x }}>
        <Braino size={SIZE} legs gloves moonwalk accessory="fedora" expr="mischief" lookX={0.45} lookY={0.05} idle />
      </div>
    </div>
  );
}

function TileArt({ k, big = false }: { k: string; big?: boolean }) {
  const sz = big ? "ns-md" : "ns-sm";
  if (k === "see") return (
    <div className="ta-screen">
      <NotchSheet className={sz} label="Looking" done={false}>Job application on screen. Want me to fill it in?</NotchSheet>
    </div>
  );
  if (k === "talk") return (
    <div className="ta-screen">
      <NotchSheet className={sz + " ns-glow"} label="Speaking" done={false}>Sure, on it. Opening WhatsApp now.</NotchSheet>
    </div>
  );
  if (k === "do") return (
    <div className="ta-screen">
      <NotchSheet className={sz + " ns-glow"} label="Doing it" done={false}
        children="Sending the deck to John."
        extra={<ol className="ns-steps ns-steps-sm">{["Opened WhatsApp", "Found John", "Sent"].map((t, i) => <li key={t} style={{ animationDelay: `${i * 0.6}s` }}><span className="vz-tick" />{t}</li>)}</ol>}
      />
    </div>
  );
  if (k === "keep") return (
    <div className="ta-screen">
      <NotchSheet className={sz} label="Remembered" done={false}
        children="Got it. I'll keep that for next time."
        extra={<ul className="ns-chips">{["John · co-founder", "Class · Mon 9:30", "Likes short replies"].map((t, i) => <li key={t} style={{ animationDelay: `${i * 0.8}s` }}>{t}</li>)}</ul>}
      />
    </div>
  );
  if (k === "ask") return (
    <div className="ta-screen">
      <NotchSheet className={sz} label="Before I post" done={false}
        extra={<div className="ns-ask"><b>Yes</b><span>Not now</span></div>}
      >Post this to LinkedIn?</NotchSheet>
    </div>
  );
  return (
    <div className="ta-screen"><NotchSheet className={sz} label="Good morning">Your first class is at 9:30, and two WhatsApps are waiting.</NotchSheet></div>
  );
}

/* Words that land one at a time and stay, which is how the teaser builds a
   line: the phrase accumulates rather than fading in as a block. The stamp is
   180ms because a word needs that long to resolve; anything quicker reads as
   choppy however fast the section is meant to feel. */
function Kinetic({ line, gap = 150 }: { line: string; gap?: number }) {
  /* The words are separate boxes with a gap between them, so the text itself
     has no spaces in it. A screen reader is given the sentence whole, and the
     pieces are hidden from it. */
  return (
    <span className="aff-kin" aria-label={line}>
      {line.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" style={{ animationDelay: `${i * gap}ms` }}>{word}</span>
      ))}
    </span>
  );
}

/* One word that keeps changing its mind.
 *
 * "Stop using your Mac" is where the company starts and not where it ends, so
 * the word swaps: Mac, computer, Mac. The line has to hold still while it
 * happens, and a word box that snaps from one width to the other drags the
 * full stop across the page, so each word is measured once and the box is
 * given that width to travel to. */
function SwapWord({ words, every = 2600 }: { words: string[]; every?: number }) {
  const [at, setAt] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const hold = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (words.length < 2) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    const timer = window.setInterval(() => setAt((v) => (v + 1) % words.length), every);
    return () => window.clearInterval(timer);
  }, [words.length, every]);

  useEffect(() => {
    const live = hold.current?.querySelector<HTMLElement>(`[data-word="${words[at]}"]`);
    if (live) setWidth(live.getBoundingClientRect().width);
  }, [at, words]);

  return (
    <span className="aff-swap" ref={hold} style={width ? { width: `${Math.ceil(width)}px` } : undefined}>
      {/* Every word is drawn, so every word can be measured; only one is lit. */}
      {words.map((word, i) => (
        <span
          key={word}
          data-word={word}
          className={"aff-swap-word" + (i === at ? " on" : "")}
          aria-hidden={i !== at}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/* A sentence that lights up word by word as it crosses the screen. Words are
   separate boxes, so the sentence is given whole to screen readers. */
function useLitWords() {
  useEffect(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-lit]")];
    if (!blocks.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const apply = () => {
      frame = 0;
      for (const block of blocks) {
        const words = [...block.querySelectorAll<HTMLElement>(".ah-w")];
        if (still.matches) { words.forEach((w) => w.classList.add("on")); continue; }
        const r = block.getBoundingClientRect();
        // Nothing lit as the block enters at the bottom; all lit by the time
        // its middle reaches the upper third.
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.88 - r.top) / (r.height * 0.5 + window.innerHeight * 0.5)));
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < lit));
      }
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

/* Words as lit boxes. `*word*` is set in the Didone. */
function Lit({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span className="ah-lit" aria-label={text.replace(/\*/g, "")}>
      {words.map((w, i) => {
        const didone = /^\*.*\*[.,]?$/.test(w);
        const clean = w.replace(/\*/g, "");
        return (
          <span key={`${w}-${i}`} aria-hidden="true" className={"ah-w" + (didone ? " ah-d" : "")}>{clean}{i < words.length - 1 ? " " : ""}</span>
        );
      })}
    </span>
  );
}

/* Scroll-linked drift.
 *
 * Anything marked data-drift slides sideways as it crosses the screen, and the
 * hero picture marked data-grow opens from the measure to the page over the
 * first screen of scrolling. Read on a frame, written as one number each, so
 * the shape of both lives in the stylesheet.
 *
 * Off under 900px, where there is no room to move anything sideways, and off
 * for anyone who has asked for less motion. */
function useDrift() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-drift]")];
    const grows = [...document.querySelectorAll<HTMLElement>("[data-grow]")];
    if (!els.length && !grows.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const narrow = window.innerWidth < 900;
      for (const el of grows) {
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(220, window.innerHeight * 0.55)));
        el.style.setProperty("--grow", narrow || still.matches ? "1" : p.toFixed(3));
      }
      for (const el of els) {
        if (narrow || still.matches) { el.style.setProperty("--drift", "0px"); continue; }
        const r = el.getBoundingClientRect();
        // 0 as it comes up from the bottom, 1 as it leaves the top.
        const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        const amount = Number(el.dataset.drift) || 0;
        el.style.setProperty("--drift", `${((Math.min(1, Math.max(0, p)) - 0.5) * amount).toFixed(1)}px`);
      }
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

function usePan() {
  useEffect(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>("[data-pan]")];
    if (!boxes.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const off = window.innerWidth < 900 || still.matches;
      for (const box of boxes) {
        const row = box.querySelector<HTMLElement>("[data-pan-row]");
        if (!row) continue;
        if (off) { row.style.setProperty("--pan", "0px"); continue; }
        const r = box.getBoundingClientRect();
        const runway = Math.max(1, r.height - window.innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / runway));
        const travel = Math.max(0, row.scrollWidth - window.innerWidth);
        row.style.setProperty("--pan", `${(-p * travel).toFixed(1)}px`);
      }
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
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs. A section parked at opacity 0
    // waiting on JS is how a page ships looking empty.
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

export default function Affective() {
  const root = useReveal();
  const { theme, toggle } = useAffTheme();
  const [blink, setBlink] = useState(false);
  /* The film pauses itself when it scrolls off screen or the tab is hidden
     (on phones it kept playing out of sight), and picks up again when it
     comes back into view, unless the viewer paused it (2026-10-26). */
  const filmRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = filmRef.current;
    if (!blink || !v) return;
    let autoPaused = false;
    const pause = () => { if (!v.paused) { v.pause(); autoPaused = true; } };
    const resume = () => { if (autoPaused && v.paused && !v.ended) { autoPaused = false; v.play().catch(() => {}); } };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && e.intersectionRatio >= 0.35 ? resume() : pause()), { threshold: [0, 0.35] });
    io.observe(v);
    const onVis = () => (document.hidden ? pause() : undefined);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", pause);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", pause); v.pause(); };
  }, [blink]);
  useDrift();
  usePan();
  useLitWords();
  /* The wordmark keeps its A and loses the rest once you are past the first
     screen, so the bar gets quieter as the page gets louder. Read on a frame
     rather than on every scroll event, and hysteresis on the two edges so a
     nudge at the threshold cannot flicker it open and shut. */
  useNotchNav();
  useEffect(() => {
    document.title = "Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff" data-theme={theme} ref={root}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/maven">Maven</Link>
            <Link to="/braino">Braino</Link>
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/labs">Labs</Link>
            <Link to="/about">About</Link>
            <Link to="/maven" className="aff-nav-go">Get Maven for Mac</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────
          The picture first, edge to edge and flush under the nav, then the
          claim under it with what the company is beside it. A room rather
          than a screenshot: the page is arguing that the computer stops being
          a thing you sit in front of, and a picture of a screen would argue
          the opposite in the first frame. */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <LaunchPill lead="Maven is here" text="Read the announcement" href="/maven#letter" />
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">
                Stop typing on your Mac.
              </span>
              <b>Start talking to it.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                Maven is out now: it writes what you say, wherever you type. Braino is in the lab: a companion who does the work in your apps.
              </p>
              <div className="aff-hero-cta">
                <Link to="/maven" className="aff-cta">Meet Maven</Link>
                <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
              </div>
            </div>
          </div>
        </div>

        {/* The picture arrives as an object in the measure and opens to the
            whole page as you scroll into it: the room stops being something
            shown to you and becomes somewhere you are. It grows rather than
            slides, so nothing is ever cut off at an edge. */}
        <figure className="aff-hero-shot" data-grow>
          <img
            src="/affective-hero.jpg"
            alt="A cross-stitched view of a lake through stone arches, with a cat sitting on the balustrade watching it."
            width={1774}
            height={887}
            loading="eager"
            decoding="async"
          />
        </figure>

        {/* (strip moved under the demo) Where a landing page puts its customers. We have none to put there,
            and the honest version of that row is the one thing everybody in
            this business is coy about: whose thinking we buy. Saying it here,
            under the first claim, is the same answer the questions give and it
            costs nothing to be first to say it. Names rather than logos, set
            in one ink, because a row of other people's marks reads as their
            page rather than ours. */}


        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Works in what you already use</p>
            <ul className="aff-strip-names aff-strip-logos">
              {(["Gmail", "WhatsApp", "Slack", "Chrome", "Notes", "Mail"] as const).map((n) => (
                <li key={n}><AppLogo name={n} /><span>{n}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* Two products, side by side (2026-10-28, Itish: don't hide Braino). Polaroids:
          the picture on top, the words below. Maven out now, Braino in the lab. */}
      <section className="hb6 aff-polas" id="products">
        <div className="aff-wrap">
          <p className="ah-kicker">What we make</p>
          <div className="aff-pola-row">
            <Link to="/maven" className="aff-pola aff-pola-maven aff-reveal">
              <div className="aff-pola-pic"><span className="aff-pola-face"><MavenFace mood="listening" /></span></div>
              <div className="aff-pola-txt"><span className="aff-pola-tag is-live">Out now</span><h3>Maven</h3><p>Talk, and your words are written properly, wherever you type. Then it does the small job that comes next.</p><span className="aff-pola-go">Meet Maven →</span></div>
            </Link>
            <Link to="/braino" className="aff-pola aff-pola-braino aff-reveal">
              <div className="aff-pola-pic"><BrainoMascot size={150} className="aff-pola-him" /></div>
              <div className="aff-pola-txt"><span className="aff-pola-tag">In the lab</span><h3>Braino</h3><p>A companion who lives in your Mac's notch. He sees your screen, hears you and does the work in your apps.</p><span className="aff-pola-go">Meet Braino →</span></div>
            </Link>
          </div>
        </div>
      </section>

      <section className="hb6">
        <div className="aff-wrap">
          <p className="ah-kicker">Meet Maven</p>
          <h2 className="aff-h1 ah-os-line hb6-big" data-lit>
            <Lit text="Say it once. It's already written." />
          </h2>
          <div className="ah-os-say hb6-say aff-reveal">
            <p>Maven is a small AI buddy for your Mac. It writes what you say, properly, wherever you type. Ask, and it does the one small job that comes next. It never talks back.</p>
          </div>
          <div className="hb6-box aff-reveal">
          <div className="hb6-head">
            <div>
              <p className="ah-kicker">Agentic dictation</p>
              <div className="hb5-name">
                <h2>Maven</h2>
                <span className="hb4-him"><MavenFace mood="idle" follow /></span>
              </div>
              <p className="hb6-line">Press ⌃⌥ to write, fn⌃ to ask. Nothing is sent or submitted without your yes.</p>
            </div>
            <div className="hb6-side">
              <div className="hb5-go">
                <Link to="/maven" className="aff-cta">Get Maven for Mac</Link>
                <Link to="/maven#letter" className="aff-cta aff-cta-ghost">Read the announcement</Link>
              </div>
            </div>
          </div>
            <ul className="hb4-does hb6-jobs">
              {MAVEN_DOES.map((d) => <li key={d.h} className={d.key ? "is-key" : undefined}>{d.key && <small>{d.key}</small>}<h3>{d.h}</h3><p>{d.p}</p></li>)}
            </ul>
          </div>

          {/* Braino, back on the homepage (2026-10-28): the box he had before. */}
          <p className="ah-kicker" style={{ marginTop: 56 }}>Meet Braino · in the lab</p>
          <div className="hb6-box aff-reveal">
          <div className="hb6-head">
            <div>
              <p className="ah-kicker">Private beta</p>
              <div className="hb5-name">
                <h2>Braino</h2>
                <BrainoMascot size={92} className="hb4-him" />
              </div>
              <p className="hb6-line">Tell him what you want and he does it, in the apps you already use, and remembers you. Nothing is sent, bought or posted without your yes.</p>
            </div>
            <div className="hb6-side">
              <div className="hb5-go">
                <button type="button" className="aff-cta" aria-pressed={blink} onClick={() => setBlink((on) => !on)}>{blink ? "Back to what he does" : "Don\u2019t Blink"}</button>
                <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
              </div>
            </div>
          </div>
          {/* Don't Blink: the film plays where the six chores were, and the
              chores come back the moment it ends (2026-10-03). */}
          {blink ? (
            <div className="hb6-film">
              <video ref={filmRef} src="/Braino_Final.MP4" autoPlay playsInline controls onEnded={() => setBlink(false)} />
              <p className="aff-trivia aff-trivia-film" role="note"><span>Trivia</span>We made this film three months ago, when Braino was a tiny browser extension and even his founder had no idea what he would become. Today he lives on your Mac, and he is far better there.</p>
            </div>
          ) : (
            <ul className="hb4-does hb6-jobs">
              {DOES.map((d) => <li key={d.h} className={d.key ? "is-key" : undefined}>{d.key && <small>{d.key}</small>}<h3>{d.h}</h3><p>{d.p}</p></li>)}
            </ul>
          )}
          </div>

          <p className="hb6-also aff-reveal">Braino runs your day. There is also a version of him that runs your startup. <Link to="/foundry">Meet Braino Foundry →</Link></p>
          <div className="hb6-demo">
          <h2 className="aff-h1 ah-os-line hb6-tag" data-lit><Lit text="Speak. Watch it happen." /></h2>
          <p className="hb6-story aff-reveal">You think faster than you type. Say it once, the way you'd say it to a friend, and Maven writes it the way you'd want it written.</p>
          <figure className="ah-os-live aff-reveal aff-rise mv-home-film">
            <MvSceneFilm />
          </figure>
          </div>
        </div>
      </section>



      {/* ── Why it works: AffectiveOS, the layer under him ── */}
      <section className="ah-os" id="technology">
        <div className="aff-wrap">
          <p className="ah-kicker">Why it works</p>
          <h2 className="aff-h1 ah-os-line" data-lit>
            <Lit text="Maven and Braino both run on AffectiveOS, the layer we built for the Mac you already own." />
          </h2>
          <div className="ah-os-say aff-reveal">
            <p>AffectiveOS gives your Mac eyes to see your screen, ears to hear you, a voice to answer, hands to do the work, and a memory of you. It runs on top of macOS, so there is nothing to replace or reinstall.</p>
            <Link to="/affectiveos" className="aff-cta">Read about AffectiveOS<i aria-hidden="true">→</i></Link>
          </div>
        </div>
        {/* What it gives your Mac: the senses grid, three that act and the one
            they all land on, the way the old About page drew it. */}
        <div className="aff-wrap">
          <div className="ah-mac aff-reveal"><MacTaskFilm /></div>
        </div>
      </section>


      {/* ── Questions ─────────────────────────────────────────────────────── */}
      <section className="hb2-faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>Anything else? <Link to="/contact">Ask us directly</Link>.</p>
          </div>
          <div className="hb2-faq-list">
            {MAVEN_FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<i aria-hidden="true">+</i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── The last word ──────────────────────────────────────────────────
          One line in the hero's face, him beside it, and the two ways in. */}
      <section className="hb-end">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal">
          <span className="mv-home-endface"><MavenFace mood="idle" follow /></span>
          <h2 className="aff-h1 hb-end-line" aria-label="Make your Mac more Affective with Maven.">
            Make your Mac more{" "}
            <span className="hb-end-logo-wrap"><img className="hb-end-logo" src="/affective-logo.png" alt="" width={1000} height={207} aria-hidden="true" /></span>
            <span className="hb-end-with">with <span className="hb-end-braino">Maven.</span></span>
          </h2>
          <p className="hb-end-p">Maven is in private preview on Mac. English, Hindi and Hinglish.</p>
          <div className="hb-go">
            <Link to="/maven" className="aff-cta">Get Maven for Mac</Link>
            <Link to="/affectiveos" className="aff-cta aff-cta-ghost">Read about AffectiveOS</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────
          The closing picture, with everything written over it. A scrim from
          the bottom rather than a wash over the whole frame, so the image
          keeps its light and the words still hold at any brightness. */}
      <footer className="aff-foot">
        <img
          className="aff-foot-art"
          src="/affective-footer.jpg"
          alt=""
          width={1983}
          height={793}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <div className="aff-foot-in">
          <div className="aff-wrap">
            <div className="aff-foot-grid">
              <div className="aff-foot-brand">
                {/* Affective is not a computer. It is the company building
                    what the one you already own was missing. */}
                <strong className="aff-mark">
                  <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
                </strong>
                {/* The four compressed into two, because a list of four reads
                    as features and the pair reads as a thing: understanding is
                    the eyes, the ears and the memory; doing is the voice and
                    the hands. "Remembers both" is the clause that earns the
                    word continuity, and without it this is a description of an
                    assistant. */}
                <p>
                  Affective builds voice-first AI for the computer you already own. You talk, your computer does it. No keyboard or mouse needed.
                </p>
                <p className="aff-foot-where">Bengaluru.</p>
              </div>
              {/* Products holds one product, and the product divides into the
                  two he comes in. Drawn rather than listed, because a list
                  makes three separate things out of one. */}

              <nav className="aff-foot-col aff-tree" aria-label="Maven">
                <h4><Link to="/maven">Maven</Link></h4>
                <ul>
                  <li><Link to="/maven">Agentic dictation</Link></li>
                  <li><Link to="/maven#pricing">Pricing</Link></li>
                  <li><Link to="/maven#letter">The announcement</Link></li>
                </ul>
              </nav>
              <nav className="aff-foot-col aff-tree" aria-label="Labs">
                <h4><Link to="/labs">Labs</Link></h4>
                <ul>
                  <li><Link to="/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                  <li><Link to="/labs">Everything in the lab</Link></li>
                </ul>
              </nav>
              <nav className="aff-foot-col">
                <h4>Company</h4>
                <Link to="/affectiveos">AffectiveOS</Link>
                <Link to="/trust">Trust &amp; privacy</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/labs">Labs</Link>
              </nav>
            </div>
            <p className="aff-foot-rule">
              Everything on this page is built and running in our private beta. Nothing here
              is a roadmap.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
