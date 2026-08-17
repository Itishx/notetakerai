import { ReactNode, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

/* ============================================================================
   The home page is a question page, and this file is what it can be asked.

   The hero stays. Everything under it is a tab of questions, and every answer
   is a chapter in the page's own editorial voice rather than a summary of one.
   The tabs match the notch on /braino on purpose: Braino, Browser, Foundry,
   HERA, and then Everything, which is the whole argument from the deck.

   Waitlist.tsx owns the introduction tab, because those answers are the real
   sections — the films, the mascot, the engines — and they live there already.
   Every other tab is answered here.

   Nothing on this page may claim Braino is on sale. The site is a waitlist and
   the answers say so where money comes up.
   ============================================================================ */

export type HomeTabId = "braino" | "browser" | "foundry" | "hera" | "everything";

export type FaqEntry = {
  id: string;
  kicker: string;
  question: string;
  hint: string;
};

export const HOME_TABS: Array<{ id: HomeTabId; label: string; note: string }> = [
  { id: "braino", label: "Braino", note: "start here" },
  { id: "browser", label: "Browser", note: "free in Chrome" },
  { id: "foundry", label: "Foundry", note: "the Mac co-founder" },
  { id: "hera", label: "HERA", note: "talk and it types" },
  { id: "everything", label: "Everything", note: "the whole argument" },
];

/* ── The row ────────────────────────────────────────────────────────────────
   One question. The answer stays unmounted until it is asked for the first
   time, then stays mounted so closing it can animate instead of snapping. */

export function FaqRow({ item, open, onToggle, children }: {
  item: FaqEntry;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  const answerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Scroll reveals never fire inside a collapsed panel, so opening the question
  // is the reveal: everything in the answer arrives with it.
  useEffect(() => {
    if (!open || !mounted) return;
    const frame = window.requestAnimationFrame(() => {
      answerRef.current?.querySelectorAll<HTMLElement>(".wl-reveal").forEach((element) => element.classList.add("in"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  return (
    <section className={`wl-faq-item${open ? " open" : ""}`} id={item.id}>
      <h2 className="wl-faq-q">
        <button type="button" aria-expanded={open} aria-controls={`${item.id}-answer`} onClick={() => onToggle(item.id)}>
          <span className="wl-faq-kicker">{item.kicker}</span>
          <span className="wl-faq-ask">{item.question}</span>
          <span className="wl-faq-hint">{item.hint}</span>
          <span className="wl-faq-sign" aria-hidden="true"><i /><i /></span>
        </button>
      </h2>
      <div className="wl-faq-answer" id={`${item.id}-answer`} role="region">
        <div className="wl-faq-answer-inner" ref={answerRef}>{mounted ? children : null}</div>
      </div>
    </section>
  );
}

/* ── Answer parts ───────────────────────────────────────────────────────────
   Small, shared shapes so twenty-odd answers stay one design instead of
   twenty. Everything below rides the page's own tokens and theme. */

function Rows({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="wl-answer-rows">
      {rows.map(([number, title, body]) => (
        <article key={number}>
          <span>{number}</span>
          <div><h3>{title}</h3><p>{body}</p></div>
        </article>
      ))}
    </div>
  );
}

function Compare({ heads, rows }: { heads: [string, string, string]; rows: ReadonlyArray<readonly [string, string, string]> }) {
  return (
    <div className="wl-answer-compare" role="table">
      <div className="wl-answer-compare-row is-head" role="row">
        <span role="columnheader">{heads[0]}</span>
        <b role="columnheader">{heads[1]}</b>
        <b role="columnheader">{heads[2]}</b>
      </div>
      {rows.map(([label, before, after]) => (
        <div className="wl-answer-compare-row" role="row" key={label}>
          <strong role="rowheader">{label}</strong>
          <span role="cell">{before}</span>
          <span role="cell">{after}</span>
        </div>
      ))}
    </div>
  );
}

function Plans({ plans }: {
  plans: Array<{ name: string; price: string; unit?: string; desc: string; feats: string[]; featured?: boolean }>;
}) {
  return (
    <div className="wl-answer-plans">
      {plans.map((plan) => (
        <article key={plan.name} className={plan.featured ? "featured" : undefined}>
          <span className="wl-plan-name">{plan.name}</span>
          <p className="wl-plan-price">{plan.price}{plan.unit && <small>{plan.unit}</small>}</p>
          <p className="wl-plan-desc">{plan.desc}</p>
          <ul>{plan.feats.map((feat) => <li key={feat}>{feat}</li>)}</ul>
        </article>
      ))}
    </div>
  );
}

// Every price on this page is followed by the same sentence, because a page
// that quotes a number and stays quiet about availability is selling.
function NotYetSelling() {
  return <p className="wl-note wl-answer-caveat">Nothing is on sale yet. Braino is a waitlist, and these are the prices he launches at.</p>;
}

const NUMBER_TONES = ["coral", "gold", "green", "os", "studio"] as const;

function Cards({ cards }: {
  cards: Array<{ where: string; name: string; does: string; price: string; priceSub: string }>;
}) {
  return (
    <div className="wl-answer-cards">
      {cards.map((card, index) => (
        <article key={card.name}>
          <small>{card.where}</small>
          <h3 className={`wl-shimmer wl-shimmer-${NUMBER_TONES[index % NUMBER_TONES.length]}`}>{card.name}</h3>
          <p>{card.does}</p>
          <p className="wl-card-price">{card.price}<i>{card.priceSub}</i></p>
        </article>
      ))}
    </div>
  );
}

function Figures({ figures }: { figures: Array<[string, string, string?]> }) {
  return (
    <div className="wl-answer-figures">
      {figures.map(([value, body, note]) => (
        <div key={value}>
          <b>{value}</b>
          <div><p>{body}</p>{note && <small>{note}</small>}</div>
        </div>
      ))}
    </div>
  );
}

function Ledger({ columns }: { columns: Array<{ head: string; note: string; tone: string; items: string[] }> }) {
  return (
    <div className="wl-answer-ledger">
      {columns.map((column) => (
        <section key={column.head} className={`is-${column.tone}`}>
          <div className="wl-ledger-head"><b>{column.head}</b><span>{column.note}</span></div>
          <ul>{column.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

function Sum({ rows, total, note }: { rows: Array<[string, string]>; total: string; note: string }) {
  return (
    <div className="wl-answer-sum">
      {rows.map(([label, value]) => (
        <div className="wl-sum-row" key={label}><span>{label}</span><b>{value}</b></div>
      ))}
      <div className="wl-sum-row is-total"><span>Every month, from ten thousand people</span><b>{total}</b></div>
      <p className="wl-sum-note">{note}</p>
    </div>
  );
}

/* ── Tab one: the introduction ──────────────────────────────────────────────
   Metadata only. Waitlist.tsx renders the answers, because they are the real
   chapters and they already live there. */

export const FAQ: Record<string, FaqEntry> = {
  character: {
    id: "character",
    kicker: "01 / The character",
    question: "Who is Braino?",
    hint: "Before the browser or the Mac, there is the character himself.",
  },
  kinds: {
    id: "kinds",
    kicker: "02 / The family",
    question: "How many kinds of Braino are there?",
    hint: "Six so far. Each one opens a question of its own.",
  },
  braino: {
    id: "braino",
    kicker: "03 / The browser",
    question: "What does he actually do?",
    hint: "The Braino you can meet first: a companion for the web.",
  },
  macos: {
    id: "macos",
    kicker: "04 / IOMI",
    question: "What happens when he leaves the browser?",
    hint: "IOMI lives in the notch of your Mac and wakes by voice.",
  },
  meetings: {
    id: "meetings",
    kicker: "05 / Meetings",
    question: "Can he sit in on my meetings?",
    hint: "No bot in the participant list, and invisible to your screen share.",
  },
  "braino-os": {
    id: "braino-os",
    kicker: "06 / The operating layer",
    question: "What is he made of?",
    hint: "Braino OS: the reasoning, memory, personality and motion underneath.",
  },
  studio: {
    id: "studio",
    kicker: "07 / The atelier",
    question: "Can I make him mine?",
    hint: "Studio: his face, wardrobe, movement and palette.",
  },
  hera: {
    id: "hera",
    kicker: "08 / Hera",
    question: "What is Braino Hera?",
    hint: "Quieter and more personal. We are keeping this one close.",
  },
};

export const BRAINO_ORDER = ["character", "kinds", "braino", "macos", "meetings", "braino-os", "studio", "hera"];

/* ── Tab two: the browser ───────────────────────────────────────────────── */

const BROWSER: Array<{ entry: FaqEntry; answer: ReactNode }> = [
  {
    entry: {
      id: "browser-what",
      kicker: "01 / The front door",
      question: "What is Braino Browser?",
      hint: "The free one. He installs into Chrome and works on the page you are already on.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2 className="wl-product-title">He is already on <span className="wl-shimmer wl-shimmer-browser">the page with you</span>.</h2>
        <p className="wl-large">Braino Browser is the free half of Braino. He installs into Chrome, lives at the edge of the page, and works on whatever you are already looking at.</p>
        <p>Every other AI asks you to leave. You copy the thing you were reading, move to another window, explain where you were and what you meant, and then come back with an answer you now have to re-apply by hand. Braino skips the whole ritual, because he is on the page and can see it.</p>
        <p>He is the front door on purpose. Meeting him should cost nothing, which is why the browser is free and the Mac is the part you hire.</p>
        <div className="wl-status"><span /><b>Built and running</b><i>Chrome · private testing · waitlist</i></div>
        <p className="wl-chapter-link"><Link to="/braino?view=browser">See the browser Braino in full <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "browser-does",
      kicker: "02 / The promises",
      question: "What does he do on a page?",
      hint: "Four things, no asterisks: reads it, writes for you, takes the notes, runs the browser.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Four things, <span className="wl-shimmer wl-shimmer-coral">no asterisks</span>.</h2>
        <p className="wl-large">Everything else he does is built on top of these. If he only ever did these four, he would still be worth installing.</p>
        <Rows rows={[
          ["01", "Chat with the page", "Whatever is on screen, ask about it. Summaries, explanations, and the buried detail on page four. No copying, no pasting, no explaining what you are looking at."],
          ["02", "Writes for you", "Replies, drafts and rewrites, in your tone rather than an assistant's. He has read the thread you are replying to."],
          ["03", "Takes the notes", "Lectures, meetings and long videos come back as transcripts and clean notes. You stop writing things down, because they are already written."],
          ["04", "Runs the browser", "Say the outcome out loud. He does the tabs, the forms and the clicking, and tells you when it is done."],
        ]} />
      </section>
    ),
  },
  {
    entry: {
      id: "browser-agent",
      kicker: "03 / Delegation",
      question: "Can he use the browser himself?",
      hint: "Say the outcome. He opens the tabs, fills the forms and does the clicking.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>You say the outcome. <span className="wl-shimmer wl-shimmer-browser">He does the clicking.</span></h2>
        <p className="wl-large">This is the part people do not believe until they watch it. Braino takes a real task, opens what he needs, works across tabs and reports back.</p>
        <p>The hard part was never the clicking. It was understanding a vague sentence. "Buy that book" means nothing on its own, so before he moves he rewrites the request into something self-contained using the conversation you were just having and the page you are on. That resolved task is what steers the whole run.</p>
        <p>He works in the open, in your browser, on your screen. You can watch every step and stop him at any point. He does not run in a hidden window somewhere pretending to be finished.</p>
        <p className="wl-chapter-link"><Link to="/knowledge">Read how delegation works <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "browser-voice",
      kicker: "04 / The voice",
      question: "Can I just talk to him?",
      hint: "His own voice, hands free, while you keep working.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>He has <span className="wl-shimmer wl-shimmer-gold">a voice</span>, and it is his.</h2>
        <p className="wl-large">Not a stock text-to-speech read of a paragraph. A voice built for him, that interrupts properly when you talk over it.</p>
        <p>Voice mode is hands free and stays out of the way. Ask him something while you are reading, and he answers out loud. Ask him to do something, and the same voice narrates the work while it happens.</p>
        <p>He can also do impressions, which was never on any roadmap and is staying anyway. Ask him to explain the page like someone else and he swaps voice and manner while doing the actual task, then drops it the moment you tell him to be himself.</p>
        <div className="wl-status"><span /><b>Built and running</b><i>Voice · browser and Mac</i></div>
      </section>
    ),
  },
  {
    entry: {
      id: "browser-notes",
      kicker: "05 / Notes",
      question: "Does he take my notes for me?",
      hint: "Lectures, meetings and long videos come back written down.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>You stop <span className="wl-shimmer wl-shimmer-os">writing things down</span>.</h2>
        <p className="wl-large">Start a lecture, a meeting or an hour-long video, tell him to listen, and it comes back as a transcript, the decisions, and notes you can actually read later.</p>
        <p>The point is not the transcript. Anything can produce a transcript. The point is that you were free to pay attention while it happened, and that what comes back knows which parts mattered.</p>
        <p className="wl-chapter-link"><Link to="/meetings">See how meetings work <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "browser-price",
      kicker: "06 / The price",
      question: "What does the browser one cost?",
      hint: "Free. Pro is $8 a month, for when you want him working rather than answering.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Free to meet him. <span className="wl-shimmer wl-shimmer-green">Paid when he works.</span></h2>
        <p className="wl-large">The free tier is not a demo. It is real everyday use, capped daily, with the whole personality intact.</p>
        <Plans plans={[
          {
            name: "Basic",
            price: "Free",
            desc: "Chrome. Where you two get acquainted.",
            feats: ["Chat with any page", "Web search, built in", "Lectures and meetings become notes", "The personality, in full"],
          },
          {
            name: "Braino Pro",
            price: "$8",
            unit: "/ month",
            desc: "The agent tier. Hands free, uncapped.",
            feats: ["Everything in Basic, uncapped", "Voice mode, hands free", "He runs the browser for you", "Notes sync to Notion"],
            featured: true,
          },
        ]} />
        <NotYetSelling />
      </section>
    ),
  },
];

/* ── Tab three: Foundry ─────────────────────────────────────────────────── */

const FOUNDRY: Array<{ entry: FaqEntry; answer: ReactNode }> = [
  {
    entry: {
      id: "foundry-what",
      kicker: "01 / The co-founder",
      question: "What is Braino Foundry?",
      hint: "Braino on macOS, in the notch, with your screen and your voice.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Meet your <span className="wl-shimmer wl-shimmer-gold">AI co-founder</span>.</h2>
        <p className="wl-large">Foundry is Braino with reach. He lives in your Mac's notch, sees what you are working on, hears your voice, and does the boring half of building alone.</p>
        <p>The browser Braino works on a page. Foundry works on a company. He carries the files, the admin, the meetings and yesterday's decision, and he is close enough to the work to act on any of it without being handed context first.</p>
        <p>He also pushes back. A co-founder who agrees with everything is just an expensive mirror.</p>
        <div className="wl-status"><span /><b>In active development</b><i>macOS · voice-first · waitlist</i></div>
        <p className="wl-chapter-link"><Link to="/braino?view=foundry">See Braino Foundry in full <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-different",
      kicker: "02 / The difference",
      question: "How is he different from the AI I already have?",
      hint: "You brief him once instead of managing every prompt yourself.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>You brief him once. <span className="wl-shimmer wl-shimmer-gold">He handles the loop.</span></h2>
        <p className="wl-large">Your current stack still makes you the manager: carry the context, write every prompt, inspect every answer, ask for every fix.</p>
        <Compare
          heads={["Compare", "Typical AI stack", "Braino Foundry"]}
          rows={[
            ["Relationship", "Another tool you operate", "The co-founder you brief"],
            ["Context", "You paste it in again", "He already knows the company and the work"],
            ["Agent loop", "You brief, chase and re-prompt every agent", "He briefs agents, reviews their work and sends revisions"],
            ["Your attention", "You live inside every chat", "He returns when a decision or approval needs you"],
            ["The result", "Advice or unchecked output", "Reviewed work and an honest status"],
          ]}
        />
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-work",
      kicker: "03 / The queue",
      question: "What does he actually do all day?",
      hint: "The work between the work: files, admin, notes, dictation, context.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>The work <span className="wl-shimmer wl-shimmer-coral">between the work</span>.</h2>
        <p className="wl-large">The little jobs that eat the day. The context you keep carrying. The tab you were about to open for the ninth time.</p>
        <Rows rows={[
          ["01", "Finds the thing", "Pitch deck found. Launch cut found. Definitely Final.pdf, somehow, also found."],
          ["02", "Finishes the admin", "The form is filled from company context. You review the important bits and approve."],
          ["03", "Turns conversations into memory", "Meetings and long videos become transcripts, decisions and clean notes."],
          ["04", "Types while you think", "BrainoHERA puts your voice into the text field already under your cursor."],
          ["05", "Works from the screen", "Ask about the error, dashboard or document in front of you without rebuilding the context."],
        ]} />
        <p>He carries the queue. You are still in charge of it.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-screen",
      kicker: "04 / Shared context",
      question: "Why does he need to see my screen?",
      hint: "So you stop briefing your AI like a new intern. On demand, never ambient.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Stop briefing your AI <span className="wl-shimmer wl-shimmer-os">like a new intern.</span></h2>
        <p className="wl-large">The error you are staring at. The dashboard you are lost in. The decision you made yesterday. A co-founder should begin with the situation, not another blank text box.</p>
        <p>That is what screen awareness buys: no screenshot-copy-paste ritual, no "here is some context" paragraph before every question. He sees the billing page you are on, remembers that annual ships first, and understands what you mean when you ask why checkout still says monthly.</p>
        <p><strong>It is on demand, not ambient.</strong> Screen access happens only when a feature you invoked needs it, and macOS has to grant the permission first. Your credentials stay on your side. He is a companion, not a data pipe.</p>
        <p className="wl-chapter-link"><Link to="/privacy">Read the unsexy privacy details <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-agents",
      kicker: "05 / The flagship",
      question: "Can he manage my coding agents?",
      hint: "You stopped writing code. This is about no longer writing prompts either.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>You stopped writing code. <span className="wl-shimmer wl-shimmer-gold">Why are you still writing prompts?</span></h2>
        <p className="wl-large">AI coding tools turned you into a context courier. Look at the bug. Look at the code. Compose the perfect little paragraph. Paste. Pray. Repeat forty times a day.</p>
        <p>Connect GitHub once, then say the thing you actually want: the signup flow is broken, fix it. Braino briefs the coding agents, follows the work, reviews what came back, and sends it again when it is wrong. You do not become the prompt manager, because that job is now his.</p>
        <p>You talk to your co-founder. Your co-founder manages the engineers.</p>
        <div className="wl-status"><span /><b>Being built</b><i>Braino Code · Foundry first</i></div>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-meetings",
      kicker: "06 / Meetings",
      question: "Does he sit in my meetings?",
      hint: "No bot joins, and nothing shows up in the screen you are sharing.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Recorded live. <span className="wl-shimmer wl-shimmer-browser">Invisible to your screen share.</span></h2>
        <p className="wl-large">Say it out loud and Braino records the meeting. No bot joins, nothing appears in the participant list, and your notes never show up in the screen you are sharing.</p>
        <p>Most meeting tools arrive as a guest that somebody has to admit, and the first half minute of the call is about the software instead of the work. Braino listens from your Mac instead. He hears the call and he hears you as two separate streams, keeps them apart, and writes notes that say who said what.</p>
        <p>The part people ask about twice is the screen share. He records in the open, where you can watch him work, and the moment you present, that overlay is not in the picture.</p>
        <p className="wl-chapter-link"><Link to="/meetings">See how meetings work <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-why",
      kicker: "07 / The choice",
      question: "Why founders first?",
      hint: "Because that is the problem his founder actually lives.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>You have the intelligence. <span className="wl-shimmer wl-shimmer-coral">You are missing the second owner.</span></h2>
        <p className="wl-large">You already have models, coding agents and seventeen tabs of pure intelligence. None of it owns anything with you.</p>
        <p>Braino could eventually help almost anyone. Founders came first because that is the problem the person building him actually lives: building alone, managing agents, handling operations, and carrying the whole company in one head.</p>
        <p>The honest version of the pitch is one line. It was never about wanting another assistant. It was about needing the second person in the room.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "foundry-price",
      kicker: "08 / The price",
      question: "What does Foundry cost?",
      hint: "$20 a month, ₹799 in India, with BrainoHERA included.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>One co-founder. <span className="wl-shimmer wl-shimmer-green">Less than one lunch a week.</span></h2>
        <p className="wl-large">The browser stays free forever. Foundry is the paid one, because that is where he runs your machine.</p>
        <Plans plans={[
          {
            name: "Braino Browser",
            price: "Free",
            desc: "Start in Chrome. Move to the Mac when you want more.",
            feats: ["Chat with any page", "Lectures and meetings become notes", "The personality, in full"],
          },
          {
            name: "Braino Foundry",
            price: "$20",
            unit: "/ month",
            desc: "₹799 a month in India. macOS. The co-founder.",
            feats: ["Screen awareness and voice", "Execution, files and BrainoHERA", "Sits in your meetings, both sides", "The full Braino OS"],
            featured: true,
          },
        ]} />
        <NotYetSelling />
      </section>
    ),
  },
];

/* ── Tab four: HERA ─────────────────────────────────────────────────────── */

const HERA: Array<{ entry: FaqEntry; answer: ReactNode }> = [
  {
    entry: {
      id: "hera-what",
      kicker: "01 / The skill",
      question: "What is BrainoHERA?",
      hint: "Double Option, speak, and the words land where your cursor already is.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Talk where <span className="wl-shimmer wl-shimmer-green">the cursor is</span>.</h2>
        <p className="wl-large">BrainoHERA turns Braino into a quiet writing layer across your Mac. Put the caret in Mail, Notes, a browser or an editor, double tap Option, and speak. Your words appear in the field you already chose.</p>
        <p>It does not open a chat, choose a destination for you, or make you move into a special document first. The place you are already writing stays the place you are writing.</p>
        <p>The honest origin story: the founder used Wispr Flow constantly while building Braino, and the thought became stupidly simple. Why should Braino not do this too?</p>
        <div className="wl-status"><span /><b>Built and running</b><i>macOS · double Option</i></div>
        <p className="wl-chapter-link"><Link to="/braino?view=hera">See BrainoHERA in full <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "hera-local",
      kicker: "02 / The speed",
      question: "Why is it faster than the dictation I use?",
      hint: "The model lives on your Mac, so your voice never takes the trip.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>The wait was never <span className="wl-shimmer wl-shimmer-green">the machine thinking.</span></h2>
        <p className="wl-large">It was travelling. Your sentence went to a server in another state and came back as text, and you learned to wait for it.</p>
        <p>BrainoHERA deletes the trip. It runs the speech model on Apple's Neural Engine, inside the machine already on your desk. Nothing is uploaded, nothing is queued, and your words become text a few inches from where you said them.</p>
        <p><strong>The honest caveat.</strong> English runs entirely on your Mac. Hindi and mixed Hinglish still route through Braino's cloud model, because no local model reads them well yet, and he tells you which one is listening instead of quietly picking for you.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "hera-quiet",
      kicker: "03 / The silence",
      question: "Does she talk back?",
      hint: "No. It is transcription only, on purpose, with no opinions to offer.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>He listens. He types. <span className="wl-shimmer wl-shimmer-os">He stays quiet.</span></h2>
        <p className="wl-large">BrainoHERA loads a transcription-only model. It has no opinions to offer, because it was never built to have them.</p>
        <p>Braino does not reason about what you said, answer it, or read it back. The only output is readable text at your active caret. If there is no text box, the notch keeps the full transcript visible and copies it rather than throwing your words away.</p>
        <Rows rows={[
          ["01", "No spoken reply", "No text-to-speech, no answer, no conversation in the middle of your sentence."],
          ["02", "No secure fields", "Password boxes stay closed to it."],
          ["03", "Safe recovery", "Nowhere to type means the notch and your clipboard, not a lost paragraph."],
          ["04", "Done is a word", "It never steals a spoken phrase to control itself. Double Option again closes the microphone."],
        ]} />
      </section>
    ),
  },
  {
    entry: {
      id: "hera-price",
      kicker: "04 / The price",
      question: "What does HERA cost?",
      hint: "Fifteen minutes a day free, $5 for unlimited, included with Foundry.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Fifteen minutes a day, free. <span className="wl-shimmer wl-shimmer-green">Five dollars for all of it.</span></h2>
        <p className="wl-large">Enough free to know whether you want it, which is the only honest way to sell dictation.</p>
        <Plans plans={[
          {
            name: "Free",
            price: "15",
            unit: "min a day",
            desc: "Enough to know whether you want it.",
            feats: ["Double Option, anywhere on the Mac", "Lands at the caret, in any app", "Resets every day"],
          },
          {
            name: "BrainoHERA",
            price: "$5",
            unit: "/ month",
            desc: "Unlimited dictation, and included with Braino Foundry.",
            feats: ["No daily limit", "Everything in the free tier", "Included if you have Foundry"],
            featured: true,
          },
        ]} />
        <NotYetSelling />
      </section>
    ),
  },
];

/* ── Tab five: everything ───────────────────────────────────────────────────
   The deck, asked as questions. Every figure here is carried from /braino-deck
   and /deck, including the parts that are models rather than measurements. */

const EVERYTHING: Array<{ entry: FaqEntry; answer: ReactNode }> = [
  {
    entry: {
      id: "all-what",
      kicker: "01 / In one paragraph",
      question: "So what is Braino, really?",
      hint: "Not an app. One character, one memory, three places.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>One character. <span className="wl-shimmer wl-shimmer-coral">Every screen you use.</span></h2>
        <p className="wl-large">Braino is not an app you open. He is a character with a face, a voice, a memory and an opinion, who shows up in the places you already work.</p>
        <p>He is in your browser, on your Mac and inside your voice, and it is the same him in all three: the same memory of what you are building, the same way of talking to you, the same judgment about when to help and when to shut up. That continuity is the product. The capabilities are what he does with it.</p>
        <p>Braino did not exist in May 2026. Everything described on this page was built between then and now, by one person, across roughly 1,100 commits.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "all-why",
      kicker: "02 / The problem",
      question: "Why does he exist?",
      hint: "Everyone can build now. Almost nobody gets seen.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Everyone can build. <span className="wl-shimmer wl-shimmer-gold">Almost nobody gets seen.</span></h2>
        <p className="wl-large">The problem, in three lines.</p>
        <Rows rows={[
          ["01", "AI made building easy", "Which means being able to build is worth close to nothing now."],
          ["02", "Getting noticed is the whole game", "And it is still done by hand, at night, by the same person who built the thing."],
          ["03", "Your tools do not talk", "One builds, another posts, and neither of them knows the other exists."],
        ]} />
      </section>
    ),
  },
  {
    entry: {
      id: "all-where",
      kicker: "03 / The lineup",
      question: "Where does he live, and what does each one cost?",
      hint: "Three products, one person inside them. Free, $20, $5.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Meet him free. <span className="wl-shimmer wl-shimmer-green">Hire him on the Mac.</span></h2>
        <p className="wl-large">Three products, one person inside them, with the price on the card.</p>
        <Cards cards={[
          {
            where: "Chrome · the front door",
            name: "Braino Browser",
            does: "He reads the page you are on, answers about it, writes in your tone, and turns lectures and meetings into notes.",
            price: "Free",
            priceSub: "Braino Pro at $8 a month unlocks voice and lets him run the browser himself.",
          },
          {
            where: "macOS · the co-founder",
            name: "Braino Foundry",
            does: "He lives in the notch, sees your screen, sits in your meetings, handles files, and actually does the work rather than describing it.",
            price: "$20 / month",
            priceSub: "₹799 a month in India. BrainoHERA is included.",
          },
          {
            where: "Anywhere on the Mac",
            name: "BrainoHERA",
            does: "Double tap Option and speak into any text field in any app. It lands at your cursor. No window, no waiting.",
            price: "Free, 15 min a day",
            priceSub: "$5 a month for unlimited. Included with Foundry.",
          },
        ]} />
        <NotYetSelling />
      </section>
    ),
  },
  {
    entry: {
      id: "all-mind",
      kicker: "04 / The mind",
      question: "What is he actually made of?",
      hint: "Three engines, which is why he is the same person everywhere.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Three engines <span className="wl-shimmer wl-shimmer-os">under all of it.</span></h2>
        <p className="wl-large">Personality is not a system prompt here. It is three built engines that every Braino runs, which is why he is the same person in the browser as he is on the Mac.</p>
        <Rows rows={[
          ["01", "Emotional Engine", "He has moods and they move. Not a mascot with a smile, but a character whose reaction to a bad morning is different from his reaction to a shipped feature."],
          ["02", "Memory Engine", "He remembers you without being told to. What you are building, how you talk, and what you already said no to."],
          ["03", "Human Intelligence Layer", "The part that decides what to actually do about a request, and when to stop and ask instead of guessing."],
        ]} />
        <p className="wl-chapter-link"><Link to="/human-intelligence">Explore the Human Intelligence Layer <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
      </section>
    ),
  },
  {
    entry: {
      id: "all-who",
      kicker: "05 / The customer",
      question: "Who is this actually for?",
      hint: "The person who meets him is not always the one who pays.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>The person who meets him <span className="wl-shimmer wl-shimmer-coral">is not the one who pays.</span></h2>
        <p className="wl-large">Two audiences, stated as two, because a single one would quietly contradict the free tier.</p>
        <Rows rows={[
          ["01", "The one who meets him", "A student, or anyone who reads and writes for a living. They get the browser free, forever, with the whole personality."],
          ["02", "The one who pays", "The solo founder on a Mac, building and shipping and marketing alone. Foundry is built for exactly that day."],
        ]} />
        <p>Free is not a marketing funnel bolted on afterwards. Charging for a friend on your screen is a bad business and a worse product, so the friend is free and the co-founder is the job you hire.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "all-market",
      kicker: "06 / The market",
      question: "Is there actually a market for this?",
      hint: "Four numbers. The customer already exists.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>The customer <span className="wl-shimmer wl-shimmer-green">already exists.</span></h2>
        <p className="wl-large">This niche does not have to be created. It is already here, and it is growing.</p>
        <Figures figures={[
          ["$45B", "of software spend in 2026 across the two halves of this job: AI code assistants, and social media management.", "AI code assistants $10.3B to $16.1B. Social media management $33.5B to $36.4B. The ranges are different analysts, not different years."],
          ["36.3%", "of new startups in the first half of 2025 had a single founder, up from 23.7% in 2019."],
          ["29.8M", "solo business owners in the United States alone, turning over roughly $1.7 trillion a year."],
          ["73%", "of them already use AI. The habit does not need teaching, only aiming."],
        ]} />
        <p className="wl-note">Sources: Grand View Research, Mordor Intelligence, Fortune Business Insights, Research and Markets. Solopreneur figures from US Census via Forbes, January 2026, and Starter Story. Market ranges are analyst estimates for two adjacent categories, not one measured number.</p>
      </section>
    ),
  },
  {
    entry: {
      id: "all-money",
      kicker: "07 / The math",
      question: "How would this make money?",
      hint: "Free at the top, paid on the Mac, with the working shown.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Free at the top. <span className="wl-shimmer wl-shimmer-gold">Paid on the Mac.</span></h2>
        <p className="wl-large">The sum, with its own working, because an assumption printed in the same typeface as a measurement is lying quietly.</p>
        <Sum
          rows={[
            ["10,000 people meet him free in Chrome", "$0"],
            ["5 of every 100 take Braino Pro · 500 × $8", "$4,000"],
            ["2 of every 100 take Foundry · 200 × $20", "$4,000"],
            ["1 of every 100 takes HERA alone · 100 × $5", "$500"],
          ]}
          total="$8,500"
          note="The prices are real and live on this site. The conversion rates are assumptions, so this is a model, not a forecast."
        />
      </section>
    ),
  },
  {
    entry: {
      id: "all-built",
      kicker: "08 / The ledger",
      question: "What is actually built, and what is not?",
      hint: "The honest column-by-column answer. The site is a waitlist today.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Built, <span className="wl-shimmer wl-shimmer-browser">building, next.</span></h2>
        <p className="wl-large">This site is a waitlist today, and this answer says so out loud rather than at the bottom in small type.</p>
        <Ledger columns={[
          {
            head: "Built", note: "Running now", tone: "built",
            items: [
              "Braino OS: the emotional, memory and intelligence engines",
              "His own voice, in the browser and on the Mac",
              "Chrome extension: page context, notes, search, agent",
              "Mac app: screen awareness, execution, meetings both sides",
              "BrainoHERA dictation, system wide",
            ],
          },
          {
            head: "Building", note: "In progress", tone: "now",
            items: [
              "Braino Code: the full voice to shipped product loop",
              "Distra: distribution across platforms as one product",
              "Usage based billing for the founder tier",
            ],
          },
          {
            head: "Next", note: "Not yet started", tone: "next",
            items: [
              "Public launch, out of the waitlist",
              "Credits live on the real billing path",
              "The shared Braino, for a team of two or three",
            ],
          },
        ]} />
      </section>
    ),
  },
  {
    entry: {
      id: "all-next",
      kicker: "09 / The future",
      question: "What happens once he can actually act?",
      hint: "Being built on the left, honest speculation on the right.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Once he can act, <span className="wl-shimmer wl-shimmer-studio">the job changes.</span></h2>
        <p className="wl-large">Everything in the first column is being built and has a route to shipping. Everything in the second is speculation, kept on its own side so nobody has to guess which is which.</p>
        <Ledger columns={[
          {
            head: "Being built", note: "Has a route to shipping", tone: "built",
            items: [
              "Say the product out loud, watch it get built and shipped",
              "One brief becomes posts on every platform, daily, without asking",
              "What lands in public decides what gets built next week",
              "He sits in the meeting and does the follow up afterwards",
              "The same character, shared across a team of two or three",
            ],
          },
          {
            head: "Speculation", note: "Plainly labelled", tone: "next",
            items: [
              "A founder who never opens a dashboard again",
              "Braino noticing a problem before he is told about one",
              "A company where the only human job left is the deciding",
              "Him earning his own keep, on his own usage",
            ],
          },
        ]} />
      </section>
    ),
  },
  {
    entry: {
      id: "all-more",
      kicker: "10 / The long version",
      question: "Where do I read the whole argument?",
      hint: "Two decks and a knowledge base, all of it public.",
    },
    answer: (
      <section className="wl-chapter wl-reveal">
        <h2>Everything above, <span className="wl-shimmer wl-shimmer-os">at full length.</span></h2>
        <p className="wl-large">This page is the short version. Three places carry the long one.</p>
        <Rows rows={[
          ["01", "The everything deck", "Fourteen slides that explain Braino from nothing: what he is, where he lives, who pays, the arithmetic, and what is honestly unbuilt."],
          ["02", "The Foundry deck", "The investor pitch. Thirty six slides on why building is easy now, why being seen is the whole game, and what the business looks like."],
          ["03", "The knowledge base", "Every feature, written up as it shipped, including the design decisions and the honest limitations."],
        ]} />
        <p className="wl-chapter-link">
          <Link to="/braino-deck">Read the everything deck <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link to="/deck">The Foundry deck <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link to="/knowledge">The knowledge base <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </p>
      </section>
    ),
  },
];

export const ANSWERED_SETS: Record<Exclude<HomeTabId, "braino">, Array<{ entry: FaqEntry; answer: ReactNode }>> = {
  browser: BROWSER,
  foundry: FOUNDRY,
  hera: HERA,
  everything: EVERYTHING,
};

// Which tab owns a question id. Deep links and the notch nav use this so a link
// to a question on another tab switches the tab instead of finding nothing.
export const QUESTION_TAB: Record<string, HomeTabId> = {
  ...Object.fromEntries(BRAINO_ORDER.map((id) => [id, "braino" as HomeTabId])),
  ...Object.fromEntries(
    (Object.entries(ANSWERED_SETS) as Array<[Exclude<HomeTabId, "braino">, Array<{ entry: FaqEntry }>]>)
      .flatMap(([tab, set]) => set.map(({ entry }) => [entry.id, tab as HomeTabId])),
  ),
};

export function isHomeTab(value: string | null): value is HomeTabId {
  return HOME_TABS.some((tab) => tab.id === value);
}
