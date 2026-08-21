import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import IomiNotch, { type IomiNotchTab } from "@/components/IomiNotch";
import { DISTRA_ENGINES } from "@/data/distraEngines";
import { YapModeContent } from "./YapMode";
import BrainoFooter from "@/components/BrainoFooter";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import EmotionNetwork from "@/components/EmotionNetwork";
import HumanIntelligence from "@/components/HumanIntelligence";
import MemoryEngineViz from "@/components/MemoryEngineViz";
import HeraListening from "@/components/HeraListening";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { BrainoIntroduction } from "./Waitlist";
import { BrainoTVProvider, BrainoTVScreen, useBrainoTV } from "@/components/BrainoTV";
import "../styles/apple.css";
import "./foundry.css";

// The page is one introduction to Braino, then a fork into the three products.
// Everything above the fork is shared: who he is, what the whole brain can do,
// and the table that explains the split. The tabs only swap the product story,
// so nobody has to leave the page to compare them.
type ProductView = "braino" | "browser" | "foundry" | "hera" | "watch";

function viewFromLocation(pathname: string, search: string): ProductView {
  const requested = new URLSearchParams(search).get("view");
  if (requested === "braino" || requested === "browser" || requested === "foundry" || requested === "hera" || requested === "watch") return requested;
  // The retired product URLs still land on the tab they used to be a page for.
  const path = pathname.replace(/\/+$/, "");
  if (path === "/foundry") return "foundry";
  if (path === "/browser") return "browser";
  if (path === "/brainohera" || path === "/hera") return "hera";
  return "braino";
}

// The three products, pinned into the notch bar so the choice is visible at any
// scroll position. BrainoHERA already has a page of its own, so that tab leaves
// this one rather than repeating it here.
// The notch is the only navigation on this page, and every tab stays on it.
/* The notch menu on this page used to be the component's default, which still
   described the old two-product site. Same treatment as the homepage now, with
   this page's own sections in it. */
const FOUNDRY_NOTCH_NAV = [
  { to: "/braino?view=foundry#two-problems", label: "Why Foundry", note: "the two places it stalls" },
  { to: "/braino?view=foundry#code", label: "Braino Code", note: "idea to a shipped MVP" },
  { to: "/braino?view=foundry#distra", label: "Distra", note: "shipped, to actually seen" },
  { to: "/braino?view=foundry#foundry-pricing", label: "Pricing", note: "one co-founder, one price" },
  { to: "/", label: "The companion", note: "free, for anyone with a screen" },
];

function productNotchTabs(basePath: string): IomiNotchTab[] {
  const base = basePath.replace(/\/+$/, "") || "/";
  return [
    { id: "braino", label: "Braino", to: base },
    { id: "browser", label: "Browser", to: `${base}?view=browser` },
    { id: "foundry", label: "Foundry", to: `${base}?view=foundry` },
    { id: "hera", label: "HERA", to: `${base}?view=hera` },
    { id: "watch", label: "Watch", to: `${base}?view=watch` },
  ];
}


const BRAINO_MORE = [
  "Book a table, a flight, or a ride",
  "Turn a lecture into clean notes",
  "Organize your whole desktop",
  "Shop and check out for you",
  "Draft and send your messages",
  "Find any file in a second",
  "Brief you every morning",
  "Set the mood — music and focus",
] as const;

const COMPARISON = [
  ["Relationship", "Another tool you operate", "The co-founder you brief"],
  ["Context", "You paste it in again", "He already knows the company and the work"],
  ["Agent loop", "You brief, chase and re-prompt every agent", "He briefs agents, reviews their work and sends revisions"],
  ["Your attention", "You live inside every chat", "He returns when a decision or approval needs you"],
  ["The result", "Advice or unchecked output", "Reviewed work and an honest status"],
] as const;

const FOUNDRY_WORK = [
  ["01", "Finds the thing", "Pitch deck found. Launch cut found. Definitely Final.pdf, somehow, also found.", "Files"],
  ["02", "Finishes the admin", "The form is filled from company context. You review the important bits and approve.", "Ready"],
  ["03", "Turns conversations into memory", "Meetings and long videos become transcripts, decisions and clean notes.", "Notes"],
  ["04", "Types while you think", "BrainoHERA puts your voice into the text field already under your cursor.", "HERA"],
  ["05", "Works from the screen", "Ask about the error, dashboard or document in front of you without rebuilding the context.", "Context"],
] as const;

// Two entries only. The journal has its own page; this is the doorway.
const JOURNAL_CARDS = [
  {
    kind: "v", accent: "ac-green", tag: "Braino's journal · BrainoHERA", to: "/journal/yap-mode-update",
    title: "I listen. Your words land where you are.",
    body: "Double Option wakes a quiet Mac skill: no answer, no spoken reply, just readable text at the cursor until you stop.",
  },
  {
    kind: "v", accent: "ac-coral", tag: "Itish's journal · Why I built it", to: "/journal/yap-mode",
    title: "I loved Wispr Flow, so I built BrainoHERA.",
    body: "Not a rivalry post. The honest story of loving a tool enough to want that feeling inside the thing I am building.",
  },
] as const;

const BRAINO_FAQS = [
  {
    q: "Is Braino really free?",
    a: "The Chrome side is. It covers real everyday use, capped daily. Braino Foundry on macOS is the paid one, because that is where he runs your machine.",
  },
  {
    q: "What is the difference between Braino and Braino Foundry?",
    a: "Same character, different reach. Braino lives in your browser and works on the page you are on. Foundry lives on your Mac, sees your screen, uses your voice and does the work.",
  },
  {
    q: "What is Braino OS?",
    a: "The layer underneath every Braino, and it is four things. The Human Intelligence Layer works out what you actually meant. The Emotional Engine decides how he shows up. The Memory Engine keeps what matters without being asked. HERA is the ears. It is why he stays the same Braino everywhere.",
  },
  {
    q: "Does he always see my screen?",
    a: "No. Screen access happens only when a feature you invoked needs it, and macOS has to grant permission first. It is on-demand, not ambient.",
  },
  {
    q: "Is my data safe?",
    a: "Your credentials stay on your side and screen access stays on-demand. He is a companion, not a data pipe. The privacy page carries the unsexy details.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Anytime, in a click. No lock-in, no dark patterns, no cancellation maze.",
  },
] as const;

const FAQS = [
  {
    q: "Is this just ChatGPT with a face?",
    a: "That's like calling a co-founder just a guy with opinions. The face is the least of it — it's the memory, screen awareness and doing. But yes, the face is also elite.",
  },
  {
    q: "Why Mac only?",
    a: "Because we'd rather be incredible on one platform than mid on three. Windows people, we see you. Later.",
  },
  {
    q: "Does he really push back?",
    a: "Tell him a bad idea and find out.",
  },
  {
    q: "Is my screen data safe?",
    a: "Screen context is used to help you complete the task you asked for — not to train an ad model. Screen access still requires macOS permission, and the privacy page carries the unsexy details.",
  },
  {
    q: "What's BrainoHERA?",
    a: "System-wide dictation inside Foundry. Speak into any normal text field on your Mac and your words land at the caret. She's the quiet one. For now.",
  },
  {
    q: "Can he do everything?",
    a: "Eventually. Right now he's focused on one job: becoming the best co-founder a solo builder has had. Everything else is on the roadmap, and the roadmap is unhinged.",
  },
] as const;

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const NAV_BRAINO_SVG = BRAINO_WALKER_SVG
  .replace(/__sbwk_/g, "__foundrynav_")
  .replace(/sbwk-/g, "foundrynav-");

function useFoundryReveal(view: ProductView) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal, .wl-reveal");
    if (!elements?.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      }),
      { threshold: 0.04 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [view]);
  return ref;
}

function FoundryPageMetadata({ view }: { view: ProductView }) {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content ?? "";
    const TITLES: Record<ProductView, string> = {
      braino: "Braino — Your own Jarvis, with an actual personality",
      hera: "BrainoHERA — System-wide dictation for the Mac",
      watch: "Watch Braino — See how it actually works",
      browser: "Braino Browser — Your own Jarvis in the tab",
      foundry: "Braino Foundry — The AI co-founder for people building alone",
    };
    const DESCRIPTIONS: Record<ProductView, string> = {
      braino: "One character in three places: the browser, your Mac, and your voice. He remembers you, sees your screen, listens, speaks and does the work.",
      hera: "Double Option, speak, and the words land at your cursor in any Mac app. Transcription-only, no answer, no assistant.",
      watch: "A walkthrough of Braino: what he does, how you ask, and what it looks like when he is working.",
      browser: "Braino reads the page, works across tabs, records lectures and meetings, and does the clicking. Your own Jarvis, with an actual personality.",
      foundry: "He lives in your Mac's notch. Sees your screen. Talks back. Pushes back. Handles the boring stuff. Basically a co-founder, minus the equity drama.",
    };
    document.title = TITLES[view];
    if (description) description.content = DESCRIPTIONS[view];
    return () => {
      document.title = previousTitle;
      if (description) description.content = previousDescription;
    };
  }, [view]);
  return null;
}

function FoundryAnchorBar({ view, dark, onThemeToggle }: { view: ProductView; dark: boolean; onThemeToggle: () => void }) {
  const [releasing, setReleasing] = useState(false);
  const releaseTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
  }, []);
  const releaseMascot = () => {
    setReleasing(true);
    if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => setReleasing(false), 720);
  };
  return (
    <div className="apple-anchors">
      <div className="apple-anchors-inner">
        <button
          type="button"
          className={`an-mascot${releasing ? " is-releasing" : ""}`}
          onClick={releaseMascot}
          aria-label="Let Braino walk"
          title="Let Braino walk"
          dangerouslySetInnerHTML={{ __html: NAV_BRAINO_SVG }}
        />
        <span className="foundry-nav-name">{view === "foundry" ? "Braino Foundry" : "Braino"}</span>
        <Link to="/premium" className="apple-cta foundry-nav-cta">Get Braino</Link>
        <button className="apple-theme-toggle" onClick={onThemeToggle} aria-label="Toggle dark mode" title="Toggle dark mode">
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  );
}


function OrchestrationPanel() {
  return (
    <section className="foundry-orchestration ac-violet" id="orchestration">
      <div className="foundry-orchestration-copy apple-reveal">
        <p className="bento-eyebrow">The flagship</p>
        <h2>You stopped writing code.<br /><span>Why are you still writing prompts?</span></h2>
        <p>AI coding tools turned you into a context courier. Look at the bug. Look at the code. Compose the perfect little paragraph. Paste. Pray. Repeat 40 times a day.</p>
      </div>
      <div className="foundry-command apple-reveal">
        <span>Connect GitHub once. Then say:</span>
        <blockquote>“Braino, the signup flow's broken. Fix it.”</blockquote>
        <div className="foundry-agent-map" aria-label="You brief Braino once. Braino manages the coding agents and checks their work.">
          <div className="foundry-agent-node is-founder"><small>You</small><strong>Define the outcome</strong><span>One conversation</span></div>
          <i className="foundry-agent-rail" aria-hidden="true">→</i>
          <div className="foundry-agent-node is-braino"><Braino size={72} legs gloves expr="focus" /><div><small>Your co-founder</small><strong>Braino runs the loop</strong><span>Briefs · follows · reviews · revises</span></div></div>
          <i className="foundry-agent-rail" aria-hidden="true">→</i>
          <div className="foundry-agent-node is-engineers"><small>The engineers</small><strong>Agents do the work</strong><span>Code · research · QA</span></div>
          <p className="foundry-review-loop">↳ If the work is wrong, Braino sends it back. You do not become the prompt manager again.</p>
        </div>
        <small>Coming to Foundry first.</small>
      </div>
      <p className="foundry-orchestration-close apple-reveal"><span>You talk to your co-founder.</span><strong>Your co-founder manages the engineers.</strong></p>
    </section>
  );
}

function OperationsGrid() {
  return (
    <section className="foundry-work" id="work">
      <div className="foundry-work-copy apple-reveal">
        <p className="bento-eyebrow">What he actually does</p>
        <h2>The work between the work.</h2>
        <p>The little jobs that eat the day. The context you keep carrying. The tab you were about to open for the ninth time. Hand it over.</p>
        <a href="#orchestration">See the flagship <ArrowUpRight /></a>
      </div>
      <div className="foundry-workboard apple-reveal">
        <header><span>Braino · founder queue</span><strong>5 things off your plate</strong></header>
        <div className="foundry-work-files" aria-label="Files Braino found"><span>Pitch Deck · June.key</span><span>Launch Cut.mov</span><span>Definitely Final.pdf</span></div>
        <div className="foundry-work-list">{FOUNDRY_WORK.map(([number, title, body, status]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div><small>{status}</small></article>)}</div>
        <footer><i aria-hidden="true" />Braino is carrying the queue. You are still in charge.</footer>
      </div>
    </section>
  );
}

function ComparisonStrip() {
  return (
    <section className="foundry-compare apple-reveal" aria-labelledby="foundry-compare-title">
      <div className="foundry-compare-head">
        <p className="bento-eyebrow">The difference</p>
        <h2 id="foundry-compare-title">You brief Braino once.<br />He handles the agent loop.</h2>
        <p>Normal AI still makes you the manager: copy the context, write every prompt, inspect every answer and ask for every fix. Braino takes the outcome, briefs the right agents, checks what they did, sends them back when it is wrong and returns when your judgment is actually needed.</p>
      </div>
      <div className="foundry-compare-table" role="table" aria-label="Your current AI compared with Braino Foundry">
        <div className="foundry-compare-row is-head" role="row">
          <span role="columnheader">Compare</span><b role="columnheader">Typical AI stack</b><b role="columnheader">Braino Foundry</b>
        </div>
        {COMPARISON.map(([label, current, foundry]) => (
          <div className="foundry-compare-row" role="row" key={label}>
            <strong role="rowheader">{label}</strong><span role="cell">{current}</span><span role="cell">{foundry}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CharacterIntroduction({ dark }: { dark: boolean }) {
  return (
    <div className={`wl-page ${dark ? "" : "is-light"} po-waitlist-section foundry-character-intro`}>
      <article className="wl-article"><BrainoIntroduction /></article>
    </div>
  );
}

function BrainoCapabilities() {
  return (
    <section className="apple-whatcan braino-capabilities" id="work">
      <div className="wc-head apple-reveal">
        <p className="bento-eyebrow">And then some</p>
        <h2>The four are the floor.</h2>
        <p>Ask, research, summarize, draft and automate from the page you are already on. No leaving the tab to brief another AI.</p>
      </div>
      <div className="wc-bento apple-reveal">
        <article className="wc-card wc-dark braino-cap-lead">
          <h3>He does the work.</h3>
          <p>Give Braino the outcome. He chooses the useful capability and helps move it forward.</p>
          <Link to="/product-overview" className="wc-more">See Product Overview</Link>
        </article>
        <article className="wc-card">
          <div className="braino-tab-stack" aria-hidden="true"><span>Research · 12 tabs</span><span className="active">The page you're on</span><span>Dashboard · Billing</span></div>
          <div className="wc-foot"><h4>Never leave the tab</h4><p>Ask about the page, compare information and stop carrying context between windows.</p></div>
        </article>
        <article className="wc-card">
          <div className="wc-mock wc-panel braino-email-mini" aria-hidden="true"><small>Reply drafted</small><strong>“Thursday at 4 works. Sending the deck now.”</strong><span className="wc-btn">Review reply</span></div>
          <div className="wc-foot"><h4>Handles the inbox work</h4><p>Drafts thoughtful replies and runs approved email steps when connected.</p></div>
        </article>
        <article className="wc-card">
          <span className="wc-btn">Ask Braino</span>
          <div className="wc-mock wc-sources" aria-hidden="true"><span>↧ Answer · 4 lines</span><span>↧ Real sources · 3</span><span>↧ Tabs opened · 0</span></div>
          <div className="wc-foot"><h4>Researches without the scavenger hunt</h4><p>Fresh answers, useful sources and the point without twelve detours.</p></div>
        </article>
        <article className="wc-card">
          <div className="foundry-notes-mini" aria-hidden="true"><div className="foundry-video-frame"><span>01:32:18</span><i /></div><div className="foundry-note-lines"><b>Notes ready</b><i /><i /><i /></div></div>
          <div className="wc-foot"><h4>Turns conversations into memory</h4><p>Lectures and meetings become transcripts, summaries and clean notes.</p></div>
        </article>
        <article className="wc-card wc-dark">
          <div className="braino-action-flow" aria-hidden="true"><span>Speak</span><i>→</i><span>Understand</span><i>→</i><span>Do</span></div>
          <div className="wc-foot"><h4>Moves from answer to action</h4><p>Forms, files, apps and approved automations—the direction is work completed, not chat accumulated.</p></div>
        </article>
      </div>
      <div className="wc-marquee apple-reveal" aria-label="More things Braino can help with">
        <div className="wc-marquee-track">{[...BRAINO_MORE, ...BRAINO_MORE].map((item, index) => <div className={`wc-box${index % 2 === 0 ? " dark" : ""}`} key={`${item}-${index}`}>{item}</div>)}</div>
      </div>
    </section>
  );
}

function BrainoOSSection() {
  return (
    <section className="apple-blog howworks braino-os-section" id="braino-os">
      <div className="hw-title apple-reveal">
        <p className="be" style={{ color: "var(--ap-violet)" }}>What powers him</p>
        <h2>Braino OS.</h2>
        <p className="hw-sub">One operating layer keeps Braino coherent across every capability. Four things: the mind that understands what you mean, the heart that understands the moment, the memory that holds what matters, and the ears that hear you.</p>
      </div>
      <div className="apple-blog-grid apple-reveal">
        <Link className="hw-card ac-blue" to="/human-intelligence">
          <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HumanIntelligence /></div>
          <div className="hw-body"><span className="hw-tag"><span className="dot" />The mind</span><h3>Human Intelligence Layer</h3><p>Screen, memory, time and context resolve what you actually mean.</p></div>
          <span className="hw-read">Explore Human Intelligence <ArrowUpRight /></span>
        </Link>
        <Link className="hw-card ac-coral" to="/emotional-intelligence">
          <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><EmotionNetwork /></div>
          <div className="hw-body"><span className="hw-tag"><span className="dot" />The heart</span><h3>Emotional Engine</h3><p>Personality and emotional attunement. The reason Braino feels like Braino.</p></div>
          <span className="hw-read">Explore the Emotional Engine <ArrowUpRight /></span>
        </Link>
        <Link className="hw-card ac-violet" to="/dashboard">
          <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><MemoryEngineViz /></div>
          <div className="hw-body"><span className="hw-tag"><span className="dot" />The memory</span><h3>Memory Engine</h3><p>He decides what was worth keeping and writes it down. Yours to read, edit or delete.</p></div>
          <span className="hw-read">See what he has kept <ArrowUpRight /></span>
        </Link>
        <Link className="hw-card ac-green" to="/braino?view=hera">
          <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HeraListening /></div>
          <div className="hw-body"><span className="hw-tag"><span className="dot" />The ears</span><h3>BrainoHERA</h3><p>Hold a key, say the thing, and the words land at your cursor in any app.</p></div>
          <span className="hw-read">Explore BrainoHERA <ArrowUpRight /></span>
        </Link>
      </div>
    </section>
  );
}

function SharedContextSection() {
  return (
    <section className="foundry-shared" id="presence">
      <div className="foundry-shared-copy apple-reveal">
        <p className="bento-eyebrow">Shared context</p>
        <h2>Stop briefing your AI <span>like a new intern.</span></h2>
        <p>The error you are staring at. The dashboard you are lost in. The decision you made yesterday. A co-founder should begin with the situation, not another blank text box.</p>
        <strong>No screenshot-copy-paste ritual. No “here is some context” paragraph.</strong>
      </div>
      <div className="foundry-shared-screen apple-reveal" aria-label="Braino combines the current screen with company memory">
        <header><i /><i /><i /><span>Shared with Braino</span></header>
        <div className="foundry-shared-canvas">
          <small>On your screen</small><h3>Billing settings</h3>
          <div className="foundry-shared-ui" aria-hidden="true"><span /><span /><span /><span /></div>
          <div className="foundry-memory-chip is-decision"><small>Yesterday's decision</small><strong>Annual plan ships first</strong></div>
          <div className="foundry-memory-chip is-goal"><small>Current goal</small><strong>Fix signup before launch</strong></div>
        </div>
        <footer><Braino size={64} legs gloves expr="focus" /><p><small>Braino already understands</small><strong>“Why is this checkout still showing monthly?”</strong></p></footer>
      </div>
    </section>
  );
}

function EmotionalSection({ foundry = false }: { foundry?: boolean }) {
  return (
    <section className="foundry-emotion-section ac-coral">
      <div className="foundry-emotion-copy apple-reveal">
        <p className="ed-eyebrow">Emotional Engine</p>
        <h2>{foundry ? <>He knows the work.<br /><span>And he knows you.</span></> : <>Useful is not enough.<br /><span>He has to feel alive.</span></>}</h2>
        <p>{foundry ? "Braino remembers what you are building, how you make decisions and what this moment means. He knows when to celebrate, when to slow you down and when the product needs honesty." : "The goal was never a cold command line with a cute face pasted on. Braino remembers, reacts, reads the moment and develops a relationship with you."}</p>
        <p>{foundry ? "That is not a personality pasted onto the answer. It is the Emotional Engine shaping how your co-founder shows up." : "The capabilities can keep expanding. The character has to stay recognizably Braino through all of them."}</p>
        <Link to="/emotional-intelligence">Explore the Emotional Engine <ArrowUpRight /></Link>
      </div>
      <div className="foundry-emotion-visual apple-reveal">
        <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><EmotionNetwork /></div>
        <div className="foundry-emotion-signals">
          <span><i />Memory</span><span><i />The moment</span><span><i />Judgment</span>
        </div>
      </div>
    </section>
  );
}

function PresenceSection() {
  return (
    <section className="foundry-room apple-reveal">
      <div>
        <p className="bento-eyebrow">Presence</p>
        <h2>He's in the room.</h2>
        <p>Blinks in your notch. Reacts when things happen. Plays your music when you're grinding. Loses his mind a little when you ship.</p>
        <blockquote>Is the moonwalk necessary? No.<br />Is it staying? Obviously.</blockquote>
      </div>
      <div className="foundry-room-stage" aria-hidden="true"><Braino size={250} legs gloves moonwalk accessory="fedora" expr="mischief" /></div>
    </section>
  );
}

const HEROES: Record<Exclude<ProductView, "hera" | "watch">, { eyebrow: string; title: JSX.Element; sub: string; cta: string; to: string }> = {
  braino: {
    eyebrow: "Meet Braino.",
    title: <>Your own Jarvis.<br /><span className="tone">With an actual personality.</span></>,
    sub: "He remembers you, sees your screen, listens, speaks, and increasingly does the work. One character, in three places.",
    cta: "Get Braino", to: "/premium",
  },
  browser: {
    eyebrow: "Braino Browser.",
    title: <>He is already on<br /><span className="tone">the page with you.</span></>,
    sub: "Free in Chrome. He reads the page you are on, writes for you, turns lectures and meetings into notes, and runs the browser when you ask.",
    cta: "Get Braino free", to: "/premium",
  },
  foundry: {
    eyebrow: "Braino Foundry.",
    title: <>Meet your<br /><span className="tone">AI co-founder.</span></>,
    sub: "On your Mac, in the notch. He sees your screen, hears your voice, handles the boring half of building alone, and pushes back when it matters.",
    cta: "Get Braino Foundry", to: "/premium",
  },
};

function ProductHero({ view }: { view: Exclude<ProductView, "hera" | "watch"> }) {
  const hero = HEROES[view];
  return (
    <header className="apple-hero left ac-coral foundry-hero">
      <p className="apple-eyebrow">{hero.eyebrow}</p>
      <h1 className="apple-display">{hero.title}</h1>
      <p className="apple-subhead">{hero.sub}</p>
      <div className="foundry-hero-actions">
        <Link className="foundry-primary" to={hero.to}>{hero.cta}</Link>
        {view === "braino" && <a className="foundry-secondary" href="#split">Where do I meet him <ArrowUpRight /></a>}
      </div>
    </header>
  );
}


/* The whole brain, not any one product. Deliberately not a feature list: the
   features live inside the tabs, and putting them here is what made the page
   feel like it was saying everything twice. */
const WHOLE_BRAIN: Array<[string, string]> = [
  ["He sees your screen", "The page, the window, the file you have open. You stop re-explaining your own context."],
  ["He listens and speaks", "His own voice, hands free. Talk to him while you keep working."],
  ["He does the work", "Not just answers. Whole tasks, run and reported back."],
  ["He reads the room", "The personality shifts with the moment. Banter is not the same as bad news."],
  ["He is one character", "Browser, Mac or dictation. Same memory, same voice, same Braino."],
];

function WhatBrainoCanDo() {
  return (
    <section className="apple-whatcan braino-whole" id="whole-brain">
      <div className="wc-head apple-reveal">
        <p className="bento-eyebrow">The whole brain</p>
        <h2>What can Braino do?</h2>
        <p>A general answer first. What that turns into depends on where you meet him, which is the next section.</p>
      </div>
      <div className="wc-bento apple-reveal">
        <article className="wc-card wc-dark">
          <h3>He remembers you.</h3>
          <p>What you are building, how you like to be spoken to, the decision you made last week. You stop re-explaining yourself.</p>
        </article>
        {WHOLE_BRAIN.map(([title, body]) => (
          <article className="wc-card" key={title}>
            <div className="wc-foot"><h4>{title}</h4><p>{body}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}


function BrainoJournal() {
  return (
    <section className="apple-blog ac-violet" id="journal">
      <div className="apple-blog-head apple-reveal">
        <div>
          <p className="be">By the way</p>
          <h2 className="jr-title">He keeps his own journal</h2>
          <p className="jr-desc">
            A cron wakes Braino, he reads every commit we made, and he writes the entry
            himself. The founder only approves it. The other half is written by hand.
          </p>
        </div>
        <Link to="/journal" className="bl-all">Read the journal ›</Link>
      </div>
      <div className="apple-blog-masonry">
        {JOURNAL_CARDS.map((card) => (
          <div className="jr-col" key={card.title}>
            <Link className={`jr-card ${card.kind} ${card.accent}`} to={card.to}>
              <div className="jr-thumb" />
              <div className="jr-body">
                <span className="jr-tag"><span className="dot" />{card.tag}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <span className="jr-btn">Read the entry</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function BrainoFaq() {
  return (
    <section className="apple-faq" id="faq">
      <div className="faq-head apple-reveal">
        <p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>FAQ</p>
        <h2 className="cl-head" style={{ margin: 0 }}>Questions, answered.</h2>
      </div>
      {BRAINO_FAQS.map((faq) => (
        <details className="faq-item" key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>
      ))}
    </section>
  );
}

/* Ported from /product-overview, where this was the clearest thing on the site:
   name the products, say what each one is for, let people pick. It is now three
   rather than two, and picking here moves the tabs below instead of navigating
   away. */
const PRODUCT_SPLIT: Array<{ id: ProductView; shimmer: string; name: string; place: string; line: string; does: string[] }> = [
  {
    id: "browser", shimmer: "wl-shimmer-coral", name: "Braino", place: "The browser",
    line: "Free in Chrome. He reads the page you are on and works beside you in the tab.",
    does: ["Chat with the page", "Writes for you", "Listens and takes the notes", "Runs the browser"],
  },
  {
    id: "foundry", shimmer: "wl-shimmer-gold", name: "Braino Foundry", place: "macOS",
    line: "The co-founder. He lives in the notch, sees your screen and does the work.",
    does: ["Screen awareness and voice", "Files, mail and admin", "Sits in your meetings", "The full Braino OS"],
  },
  {
    id: "hera", shimmer: "wl-shimmer-green", name: "BrainoHERA", place: "Your voice",
    line: "System-wide dictation. Speak into any Mac text field and the words land at your cursor.",
    does: ["Double Option to wake", "On-device transcription", "Lands at the caret, in any app", "No answer, no assistant"],
  },
];

const ECOSYSTEM_NODES: Array<{
  id: string; number: string; name: string; place: string; role: string; color: string;
  view?: ProductView; to?: string;
}> = [
  { id: "browser", number: "01", name: "Braino", place: "Browser", role: "Reads the page, talks, searches and works beside you.", color: "coral", view: "browser" },
  { id: "foundry", number: "02", name: "Braino Foundry", place: "Mac", role: "Lives in the notch and operates apps, files, mail and meetings.", color: "amber", view: "foundry" },
  { id: "os", number: "03", name: "Braino OS", place: "Intelligence", role: "The mind, the heart, the memory and the ears, under every Braino.", color: "violet", to: "/human-intelligence" },
  { id: "hera", number: "04", name: "BrainoHERA", place: "Voice", role: "Talk and it types, straight into any Mac text field.", color: "green", view: "hera" },
  { id: "studio", number: "05", name: "Braino Studio", place: "Identity", role: "Face, wardrobe, movement, palette and the way he enters a room.", color: "pink", to: "/build-braino" },
];

function EcosystemMap({ onViewChange }: { onViewChange: (view: ProductView) => void }) {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const selected = ECOSYSTEM_NODES[active];
  const orbitNodes = ECOSYSTEM_NODES.map((node, index) => ({ node, index })).filter(({ node }) => node.id !== "os");
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight));
      section.style.setProperty("--eco-parallax", `${progress * 42}px`);
      section.style.setProperty("--eco-parallax-soft", `${progress * -18}px`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const open = (node: typeof ECOSYSTEM_NODES[number]) => {
    if (node.view) onViewChange(node.view);
  };

  return (
    <section ref={sectionRef} className="po-ecosystem is-a po-ecosystem-solo" id="meet">
      <div className="po-eco-head apple-reveal">
        <p className="bento-eyebrow">The Braino ecosystem</p>
        <h2>One Braino.<br /><span>Many places to meet him.</span></h2>
        <p>The character stays the same. Only the surface, and what he can reach, changes.</p>
      </div>
      <div className={`po-eco-constellation is-${selected.color}`}>
        <div className="po-eco-orbits" aria-hidden="true"><i /><i /><i /><i /></div>
        <svg className="po-eco-family-lines" viewBox="0 0 1120 720" preserveAspectRatio="none" aria-hidden="true">
          <path d="M560 323 C440 250 310 184 164 146" /><path d="M560 323 C680 250 810 184 956 146" /><path d="M560 323 C418 390 288 508 140 578" /><path d="M560 323 C704 390 824 508 980 578" />
          <path className="flow f-one" d="M560 323 C440 250 310 184 164 146" /><path className="flow f-two" d="M560 323 C680 250 810 184 956 146" /><path className="flow f-three" d="M560 323 C418 390 288 508 140 578" /><path className="flow f-four" d="M560 323 C704 390 824 508 980 578" />
        </svg>
        <Link className="po-eco-sun" to="/ecosystem-teaser"><Braino size={66} legs gloves expr="happy" /><strong>Braino OS</strong><span>powers every Braino</span></Link>
        <div className="po-eco-intelligence" aria-label="The intelligence inside Braino OS"><Link to="/emotional-intelligence">Emotional Intelligence</Link><Link to="/human-intelligence">Human Intelligence</Link></div>
        {orbitNodes.map(({ node, index }, orbitIndex) => (
          <div className={`po-planet-orbit o-${orbitIndex}`} key={node.id}>
            {node.view ? (
              <button
                type="button"
                className={`node${active === index ? " active" : ""} is-${node.color}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => open(node)}
              ><i>{node.number}</i><b>{node.name}</b><span>{node.place}</span><small>{node.role}</small></button>
            ) : (
              <Link
                to={node.to!}
                className={`node${active === index ? " active" : ""} is-${node.color}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              ><i>{node.number}</i><b>{node.name}</b><span>{node.place}</span><small>{node.role}</small></Link>
            )}
          </div>
        ))}
        <div className="po-eco-orbit-detail">
          <small>Now viewing</small><h3>{selected.name}</h3><p>{selected.role}</p>
          {selected.view ? (
            <button type="button" onClick={() => open(selected)}>Open the tab <ArrowUpRight /></button>
          ) : (
            <Link to={selected.to!}>Explore <ArrowUpRight /></Link>
          )}
        </div>
      </div>
    </section>
  );
}

function BrainoComesInThree({ view, onViewChange }: { view: ProductView; onViewChange: (view: ProductView) => void }) {
  const [hover, setHover] = useState<string>(view);
  const { play } = useBrainoTV();
  const active = PRODUCT_SPLIT.find((product) => product.id === hover) ?? PRODUCT_SPLIT[0];
  return (
    <section className="apple-cloptions braino-split" id="split">
      <div className="cl-headwrap braino-split-head apple-reveal">
        <h2 className="cl-head">Braino comes in <span className="wl-shimmer wl-shimmer-coral">three</span>.</h2>
        <p className="cl-desc">One character, one Braino OS underneath. Three places to meet him, depending on where your work actually happens.</p>
      </div>
      <div className="cl-a ac-coral">
        <div className="cl-names">
          {PRODUCT_SPLIT.map((product) => (
            <button
              type="button"
              key={product.id}
              className={"cl-name-btn" + (product.id === hover ? " active" : "")}
              onMouseEnter={() => setHover(product.id)}
              onFocus={() => setHover(product.id)}
              onClick={() => onViewChange(product.id)}
            >
              <span className={`n wl-shimmer ${product.shimmer}`}>{product.name}</span>
              <span className="s">{product.place}</span>
            </button>
          ))}
        </div>
        <div className="cl-panel">
          <div className="cl-img"><span className={`cl-imgname wl-shimmer ${active.shimmer}`}>{active.name}</span></div>
          <div className="cl-panel-txt">
            <p>{active.line}</p>
            <ul className="cl-does">
              {active.does.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="cl-btns">
              <button type="button" className="cl-cta" onClick={() => onViewChange(active.id)}>
                Meet {active.name}
              </button>
              <button type="button" className="cl-glimpse-btn" onClick={() => play("/dontblink?embed=1", "Don't Blink")}>
                View on Braino TV
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* The four. Borrowed from the numbered-row design, because a numbered list of
   four reads as a promise rather than a feature dump. */
const BROWSER_BASICS: Array<[string, string, string]> = [
  ["01", "Chat with the page", "Whatever is on screen, ask about it. Summaries, explanations, the buried detail on page four."],
  ["02", "Writes for you", "Replies, drafts, rewrites. Your tone, not an assistant's."],
  ["03", "Listens and takes the notes", "Lectures, meetings, long videos. You stop writing things down, because they are already written."],
  ["04", "Runs the browser", "Say the outcome. He does the tabs, the forms and the clicking."],
];

/* The walkthrough. The film is not shot yet, so the frame says so plainly rather
   than sitting empty or pretending to buffer. Drop the file in WATCH_VIDEO and
   the placeholder disappears on its own. */
const WATCH_VIDEO = "";

function WatchStory() {
  return (
    <main id="watch-view-panel" role="tabpanel" aria-labelledby="watch-view-tab">
      <header className="apple-hero left ac-coral foundry-hero">
        <p className="apple-eyebrow">Watch this.</p>
        <h1 className="apple-display">See him work.<br /><span className="tone">Then decide.</span></h1>
        <p className="apple-subhead">A walkthrough of Braino: what he does, how you ask for it, and what it looks like when he is actually working. No slides.</p>
      </header>

      <section className="watch-stage">
        <figure className="watch-frame apple-reveal">
          {WATCH_VIDEO ? (
            <video src={WATCH_VIDEO} controls playsInline preload="metadata" />
          ) : (
            <div className="watch-empty">
              <span className="watch-empty-badge">Filming</span>
              <p>The walkthrough is being recorded.</p>
              <small>It lands here the moment it is cut.</small>
            </div>
          )}
        </figure>
      </section>

      <section className="braino-basics" id="watch-chapters">
        <div className="wc-head apple-reveal">
          <p className="bento-eyebrow">What the walkthrough covers</p>
          <h2>Four minutes,<br />start to finish.</h2>
        </div>
        <div className="braino-basics-rows">
          <article className="apple-reveal"><span>01</span><h3>Meet him</h3><p>Where he lives, how you wake him, and what he looks like while he thinks.</p></article>
          <article className="apple-reveal"><span>02</span><h3>Ask for something</h3><p>The page you are on, a question about it, and a task you would rather not do yourself.</p></article>
          <article className="apple-reveal"><span>03</span><h3>Let him work</h3><p>What handing over a real job looks like, and how you stay in control of it.</p></article>
          <article className="apple-reveal"><span>04</span><h3>Make it yours</h3><p>Voice, personality and the settings worth changing on day one.</p></article>
        </div>
      </section>
    </main>
  );
}

function HeraStory() {
  return (
    <main id="hera-view-panel" role="tabpanel" aria-labelledby="hera-view-tab">
      <YapModeContent standalone={false} />

      <section className="apple-pricing foundry-lineup" id="hera-pricing">
        <div className="pr-head apple-reveal">
          <p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>BrainoHERA pricing</p>
          <h2 className="cl-head" style={{ margin: "0 0 14px" }}>Fifteen minutes a day, free.<br /><span className="tone" style={{ color: "var(--ap-coral)" }}>Five dollars for all of it.</span></h2>
        </div>
        <div className="pr-table apple-reveal">
          <article className="prt-col">
            <div className="prt-name">Free</div>
            <div className="prt-price">15<span> min a day</span></div>
            <p className="prt-desc">Enough to know whether you want it.</p>
            <ul className="prt-feats">
              <li>Double Option, anywhere on the Mac</li>
              <li>Lands at the caret, in any app</li>
              <li>Resets every day</li>
            </ul>
            <Link to="/premium" className="prt-cta">Start free</Link>
          </article>
          <article className="prt-col featured">
            <div className="prt-name">BrainoHERA</div>
            <div className="prt-price">$5<span> /month</span></div>
            <p className="prt-desc">Unlimited dictation. Also included with Braino Foundry.</p>
            <ul className="prt-feats">
              <li>No daily limit</li>
              <li>Everything in the free tier</li>
              <li>Included if you have Foundry</li>
            </ul>
            <Link to="/premium" className="prt-cta">Get BrainoHERA</Link>
          </article>
        </div>
      </section>
    </main>
  );
}

function BrowserStory() {
  return (
    <main id="browser-view-panel" role="tabpanel" aria-labelledby="browser-view-tab">
      <section className="braino-basics" id="browser-basics">
        <div className="wc-head apple-reveal">
          <p className="bento-eyebrow">Braino Browser</p>
          <h2>Four things he<br />always does.</h2>
        </div>
        <div className="braino-basics-rows">
          {BROWSER_BASICS.map(([number, title, body]) => (
            <article className="apple-reveal" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <BrainoCapabilities />

      <section className="apple-pricing foundry-lineup" id="browser-pricing">
        <div className="pr-head apple-reveal">
          <p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>Braino Browser pricing</p>
          <h2 className="cl-head" style={{ margin: "0 0 14px" }}>Free to meet him.<br /><span className="tone" style={{ color: "var(--ap-coral)" }}>Pro when you want him working.</span></h2>
        </div>
        <div className="pr-table apple-reveal">
          <article className="prt-col">
            <div className="prt-name">Basic</div>
            <div className="prt-price">Free</div>
            <p className="prt-desc">Chrome. Where you two get acquainted.</p>
            <ul className="prt-feats">
              <li>Chat with any page</li>
              <li>Web search, built in</li>
              <li>Lectures and meetings become notes</li>
              <li>The personality, in full</li>
            </ul>
            <Link to="/premium" className="prt-cta">Get Braino</Link>
          </article>
          <article className="prt-col featured">
            <div className="prt-name">Braino Pro</div>
            <div className="prt-price">$8<span> /month</span></div>
            <p className="prt-desc">The agent tier. Hands free, unlimited.</p>
            <ul className="prt-feats">
              <li>Everything in Basic, uncapped</li>
              <li>Voice mode, hands free</li>
              <li>He runs the browser for you</li>
              <li>Notes sync to Notion</li>
            </ul>
            <Link to="/premium" className="prt-cta">Get Braino Pro</Link>
          </article>
        </div>
      </section>
    </main>
  );
}



function CofounderHelp() {
  const jobs = [
    ["01", "Carries the context", "The screen, the files, yesterday's decision and the thing you are trying to ship. You stop re-explaining the company."],
    ["02", "Takes work off your plate", "Research, email, forms, notes, files and Mac actions move from another founder chore to an approved handoff."],
    ["03", "Manages the agents", "You describe the outcome once. Braino briefs the coding agent, follows the work and checks whether the result is actually fixed."],
    ["04", "Brings judgment", "He remembers the goal, reads the moment and pushes back when a decision is hurting the product. Then he helps repair it."],
  ] as const;
  return (
    <section className="foundry-help">
      <div className="foundry-help-head apple-reveal"><p className="bento-eyebrow">How he co-founds</p><h2>Not four more tools.<br />One less person to be.</h2><p>A co-founder does not merely answer. They carry part of the company with you.</p></div>
      <div className="foundry-help-rows apple-reveal">{jobs.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>
  );
}

function FoundryChoice() {
  return (
    <section className="foundry-choice apple-reveal">
      <div className="foundry-choice-title">
        <p className="bento-eyebrow">Why Foundry</p>
        <h2>You have the intelligence.<br /><span>You're missing the second owner.</span></h2>
      </div>
      <div className="foundry-choice-copy">
        <strong>You have models, coding agents and seventeen tabs of pure intelligence.</strong>
        <p>Braino could eventually help almost anyone. We chose founders first because this is the problem his founder actually lives: building alone, managing agents, handling operations and carrying the whole company in one head.</p>
        <blockquote>“I wasn't looking for another assistant. I needed the second person in the room.”</blockquote>
      </div>
    </section>
  );
}

/* ── The two problems ───────────────────────────────────────────────────────
   Foundry's opening argument, and the reason it is one purchase rather than
   two products: a solo founder fails in exactly two places, and there is an
   engine pointed at each.

   The Code half spends its words on a distinction, not a feature list. Lovable,
   Cursor and v0 already build things, and pretending otherwise would insult the
   reader. What they do not do is disagree with you. They take an instruction and
   execute it, so a badly specified idea becomes a well built wrong thing. The
   claim here is that Braino works out what you actually want first, which is the
   part a co-founder does and a tool never has.

   Distra's six engines are named as a count and not enumerated, because the six
   are not decided yet and inventing them here would put fiction on a live page. */
function TwoProblems() {
  return (
    <section className="fd-two apple-reveal" id="two-problems">
      <div className="ld-wrap">
        <p className="apple-eyebrow">Why Foundry exists</p>
        <h2 className="cl-head">Founders get stuck in <span className="tone">exactly two places.</span></h2>
        <p className="fd-two-lede">
          They cannot build it, or nobody sees it. Almost everything else is survivable. Foundry is
          one thing you buy with an engine pointed at each, in the order they actually happen.
        </p>

        <div className="fd-two-row">
          <article className="fd-stage ac-blue">
            <span className="fd-stage-tag">Stage one · the build</span>
            <h3>Braino Code</h3>
            <p className="fd-stage-line">Idea to a shipped MVP</p>
            <p className="fd-stage-body">
              He works out what you are actually building before he builds anything. You talk it
              through, he asks the questions that matter and tells you when an idea is thinner than
              you think. Then he designs it and writes it.
            </p>

          </article>

          <article className="fd-stage ac-green">
            <span className="fd-stage-tag">Stage two · the launch</span>
            <h3>Distra</h3>
            <p className="fd-stage-line">Shipped, to actually seen</p>
            <p className="fd-stage-body">
              Shipping to silence is the other way it stalls, and it is the half nobody sells.
              Distra learns how you write, then works your distribution the way a co-founder would:
              every day, in your voice, without becoming your whole week.
            </p>

          </article>
        </div>

        <p className="fd-two-foot">
          The order matters. Code hands Distra a product it already understands, and what Distra
          learns in public goes back into what Code builds next. <b>One character holds both ends</b>,
          which is the thing a stack of separate tools structurally cannot do.
        </p>
      </div>
    </section>
  );
}


/* ── The two engines, in full ───────────────────────────────────────────────
   Distra used to be its own page, which split one purchase across two URLs and
   made a reader work out for themselves that they were halves of one thing.
   Both engines live here now, behind a tab, so the page can say "Foundry is
   this" without a detour.

   A tab rather than two stacked walls of copy: nobody reads the second engine
   if they have to scroll past the first one to reach it, and the two are
   alternatives to each other in the reader's head, not a sequence to consume. */

const CODE_DOES = [
  { n: "01", ac: "ac-violet", name: "He works out what you are building",
    line: "Before a line is written. You talk it through, he asks what it is for and who for, and says so when an idea is thinner than you think it is." },
  { n: "02", ac: "ac-blue", name: "He decides how it should look",
    line: "A palette, a typeface and a shape for the page, chosen from your brief rather than from habit. A security product does not come back looking like a bakery." },
  { n: "03", ac: "ac-green", name: "He writes the whole thing",
    line: "Real copy, real structure, responsive, accessible. Not a wireframe with lorem ipsum in it waiting for you to finish the job." },
  { n: "04", ac: "ac-coral", name: "He changes it while you watch",
    line: "\u201cMake the background red\u201d lands in about fourteen seconds, because he edits the one line that matters instead of rebuilding the site." },
];

const DISTRA_DOES = [
  { n: "01", ac: "ac-blue", name: "He learns how you write",
    line: "By reading two hundred of your own posts, ranked by what actually worked. Not by making you describe your own voice in a text box, which nobody alive can do." },
  { n: "02", ac: "ac-violet", name: "He writes from what you shipped",
    line: "He reads your commits and your week, and there are drafts waiting in the morning. No more staring at an empty box at 11pm wondering what you even did." },
  { n: "03", ac: "ac-green", name: "He picks the hour and posts it",
    line: "From your own history, not some best-practice blog post. Then he goes and checks it actually posted, instead of assuming." },
  { n: "04", ac: "ac-coral", name: "He finds the conversations",
    line: "The posts worth replying to, with the reply already written in your voice. You press send, because that part should stay human." },
];

const DISTRA_CHANNELS = [
  { name: "X", state: "Live", line: "Posts, threads and xAuto: he reads your timeline, picks the few worth answering and drafts the reply." },
  { name: "LinkedIn", state: "Live", line: "Writes for LinkedIn's room rather than cross-posting, and drafts the comments that actually grow you." },
  { name: "Reddit", state: "Next", line: "The highest intent density anywhere. People ask for products by name, in the present tense." },
  { name: "Instagram", state: "Next", line: "Reels cut from what you already shipped, without an editor being opened." },
];

const DISTRA_GATES = ["Anything that spends money", "Sending a DM", "Deleting anything", "Following or unfollowing", "Changing a price or a promise"];

function EngineTabs() {
  // The hash picks the tab, so a link can land on the engine it names. Without
  // this every footer and deck link pointing here opens on Code, and half of
  // them are about Distra.
  const readHash = () => (window.location.hash === "#distra" ? "distra" : "code");
  const [engine, setEngine] = useState<"code" | "distra">(readHash);
  const isCode = engine === "code";

  useEffect(() => {
    const onHash = () => setEngine(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Reflect the choice back into the URL so the tab survives a refresh and can
  // be linked to, without pushing a history entry for every click.
  const pick = (next: "code" | "distra") => {
    setEngine(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  return (
    <section className="fd-engines apple-reveal" id="engines">
        <span id="code" aria-hidden="true" />
        <span id="distra" aria-hidden="true" />
      <div className="ld-wrap">
        <p className="apple-eyebrow">Inside Foundry</p>
        <h2 className="cl-head">Two engines. <span className="tone">One character.</span></h2>

        <div className="fd-tabs" role="tablist" aria-label="Foundry engines">
          <button
            role="tab" aria-selected={isCode}
            className={`fd-tab${isCode ? " is-on" : ""}`}
            onClick={() => pick("code")}
          >
            <b>Braino Code</b><span>Idea to a shipped MVP</span>
          </button>
          <button
            role="tab" aria-selected={!isCode}
            className={`fd-tab${!isCode ? " is-on" : ""}`}
            onClick={() => pick("distra")}
          >
            <b>Distra</b><span>Shipped, to actually seen</span>
          </button>
        </div>

        {isCode ? (
          <div className="fd-panel ac-blue" role="tabpanel">
            <p className="fd-panel-lede">
              Lovable, Cursor and v0 already build things, and pretending otherwise would be silly.
              What none of them do is disagree with you. You specify, they execute, and a badly
              specified idea becomes a well built wrong thing. <b>Braino works out what you actually
              want first.</b> That is the part a co-founder does and a tool never has.
            </p>

            <div className="fd-vs">
              <div>
                <b>A tool</b>
                <ul>
                  <li>You specify, it executes</li>
                  <li>Never asks what you are really solving</li>
                  <li>Never pushes back on a weak idea</li>
                  <li>A badly specified idea, built well</li>
                </ul>
              </div>
              <div className="is-on">
                <b>A co-founder</b>
                <ul>
                  <li>Brainstorms before a line is written</li>
                  <li>Asks what this is for, and who for</li>
                  <li>Disagrees with you when he should</li>
                  <li>Then builds the thing you meant</li>
                </ul>
              </div>
            </div>

            <ol className="fd-does">
              {CODE_DOES.map((d) => (
                <li key={d.n} className={d.ac}>
                  <i>{d.n}</i>
                  <div><b>{d.name}</b><p>{d.line}</p></div>
                </li>
              ))}
            </ol>

            <p className="fd-fine">
              <b>Working today.</b> A spoken sentence becomes a live, designed website in about four
              minutes. It is not a mockup and not a template: one self-contained page, written for
              that brief, that you can open and send to someone.
            </p>
          </div>
        ) : (
          <div className="fd-panel ac-green" role="tabpanel">
            <p className="fd-panel-lede">
              You can ship a real product in a weekend now, and by Friday nobody has heard of it. The
              reason is never the product. <b>Posting consistently in your own voice is a job</b>, and
              it is the seventh one you are already doing badly.
            </p>

            <ol className="fd-does">
              {DISTRA_DOES.map((d) => (
                <li key={d.n} className={d.ac}>
                  <i>{d.n}</i>
                  <div><b>{d.name}</b><p>{d.line}</p></div>
                </li>
              ))}
            </ol>

            <p className="apple-eyebrow fd-sub">The six engines</p>
            <p className="fd-panel-lede sm">
              Distribution is six separate jobs, each with its own pile of tools that do not talk
              to each other. Running all six is the product. <b>One of them is live today</b>, and
              this page will keep saying which until the rest are.
            </p>
            <ol className="fd-engines-six">
              {DISTRA_ENGINES.map((e) => (
                <li key={e.n}>
                  <i>{e.n}</i>
                  <div>
                    <b>{e.name}</b>
                    <span className="fd-six-job">{e.job}</span>
                    <p>{e.detail}</p>
                  </div>
                  <em className={e.state === "Running" ? "is-live" : undefined}>{e.state}</em>
                </li>
              ))}
            </ol>

            <p className="apple-eyebrow fd-sub">Where he does it</p>
            <div className="fd-channels">
              {DISTRA_CHANNELS.map((c) => (
                <article key={c.name}>
                  <header><b>{c.name}</b><span className={c.state === "Live" ? "is-live" : undefined}>{c.state}</span></header>
                  <p>{c.line}</p>
                </article>
              ))}
            </div>

            <p className="apple-eyebrow fd-sub">Where the line is</p>
            <p className="fd-panel-lede sm">
              Nobody should hand their accounts to an agent and walk away, and we are not asking you
              to. Three levels, set per platform, changed any day. He drops back a level by himself if
              anything looks off.
            </p>
            <div className="fd-levels">
              <div><b>Ask me everything</b><p>He writes. You approve every post.</p></div>
              <div className="is-on"><b>Approve once</b><p>You approve the post. He picks the hour, publishes it, checks it landed, reports back.</p></div>
              <div><b>Run it</b><p>He fills the queue and publishes on his own. You can veto anything in it.</p></div>
            </div>

            <p className="apple-eyebrow fd-sub">He always stops and asks before these</p>
            <div className="fd-gates">{DISTRA_GATES.map((g) => <span key={g}>{g}</span>)}</div>

            <p className="apple-eyebrow fd-sub">The honest bit</p>
            <ul className="fd-honest">
              <li><b>It will not make you go viral.</b> Nobody can promise that and anyone who does is selling something. It makes you consistent, in your own voice, without it feeling like a second job.</li>
              <li><b>He never sends a reply or a comment himself.</b> Automated engagement is what gets accounts restricted, so he judges and drafts and you press the key.</li>
              <li><b>Some numbers are genuinely unavailable.</b> LinkedIn analytics need partner access we do not have. The dashboard shows a dash and says why, instead of making a number up.</li>
              <li><b>Distra's first customer is Braino.</b> It runs this company's own distribution before it runs yours.</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function FoundryStory() {
  return (
    <main id="foundry-view-panel" role="tabpanel" aria-labelledby="foundry-view-tab">
      <TwoProblems />
      <EngineTabs />
      <ComparisonStrip />
      <div id="foundry-why"><FoundryChoice /></div>
      <CofounderHelp />
      <SharedContextSection />
      <OperationsGrid />
      <OrchestrationPanel />
      <EmotionalSection foundry />
      <PresenceSection />
      <section className="apple-pricing foundry-lineup" id="foundry-pricing">
        <div className="pr-head apple-reveal">
          <p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>Braino Foundry pricing</p>
          <h2 className="cl-head" style={{ margin: "0 0 14px" }}>One co-founder.<br /><span className="tone" style={{ color: "var(--ap-coral)" }}>Less than one lunch a week.</span></h2>
        </div>
        <div className="pr-table apple-reveal">
          <article className="prt-col">
            <div className="prt-name">Braino Browser</div>
            <div className="prt-price">Free</div>
            <p className="prt-desc">Start in Chrome. Move to the Mac when you want more.</p>
            <ul className="prt-feats">
              <li>Chat with any page</li>
              <li>Lectures and meetings become notes</li>
              <li>The personality, in full</li>
            </ul>
            <Link to="/premium" className="prt-cta">Get Braino</Link>
          </article>
          <article className="prt-col featured">
            <div className="prt-name">Braino Foundry</div>
            <div className="prt-price">$50<span> /month</span></div>
            <p className="prt-desc">₹799/month in India. macOS. The co-founder.</p>
            <ul className="prt-feats">
              <li>Screen awareness and voice</li>
              <li>Execution, files and BrainoHERA</li>
              <li>Sits in your meetings, both sides</li>
              <li>The full Braino OS</li>
            </ul>
            <Link to="/premium" className="prt-cta">Get Foundry</Link>
          </article>
        </div>
      </section>

      <BrainoFaq />
      <section className="foundry-final apple-reveal"><p>You've been the founder, the engineer, the intern, and the emotional support human.</p><h2>Hire the co-founder.</h2><Link className="foundry-primary" to="/premium">Get Braino Foundry</Link><small>Braino Foundry. Version one. Coming very soon.</small></section>
    </main>
  );
}

export default function Foundry() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromLocation(location.pathname, location.search);
  const pageRef = useFoundryReveal(view);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* storage can be unavailable */ }
  }, [dark]);
  const changeView = (nextView: ProductView) => {
    if (nextView === view) return;
    const base = location.pathname.replace(/\/+$/, "") || "/";
    navigate(nextView === "braino" ? base : `${base}?view=${nextView}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // No `initial` on the provider: the TV screen sits below the footer, so
  // seeding it played Don't Blink's soundtrack out of an iframe nobody could
  // see. It stays idle until a "View on Braino TV" button asks for a film.
  return (
    <BrainoTVProvider>
    <div className={`apple foundry${dark ? " dark" : ""}`} ref={pageRef}>
      <FoundryPageMetadata view={view} />
      <BrainoDefs />
      <IomiNotch nav={FOUNDRY_NOTCH_NAV} tabs={productNotchTabs(location.pathname)} activeTab={view} />
      <FoundryAnchorBar view={view} dark={dark} onThemeToggle={() => setDark((value) => !value)} />
      {view !== "hera" && view !== "watch" && <ProductHero view={view} />}

      {view === "braino" && (
        <>
          <CharacterIntroduction dark={dark} />
          <BrainoComesInThree view={view} onViewChange={changeView} />
          <WhatBrainoCanDo />
          <BrainoOSSection />
          <section className="braino-handoff apple-reveal">
            <p>That is Braino. Switch tabs above for <button type="button" onClick={() => changeView("browser")}>Browser</button>, <button type="button" onClick={() => changeView("foundry")}>Foundry</button> or <button type="button" onClick={() => changeView("hera")}>HERA</button>.</p>
          </section>
          <EcosystemMap onViewChange={changeView} />
        </>
      )}
      {view === "browser" && <BrowserStory />}
      {view === "foundry" && <FoundryStory />}
      {view === "hera" && <HeraStory />}
      {view === "watch" && <WatchStory />}

      {view !== "foundry" && <BrainoJournal />}
      {view !== "foundry" && <BrainoFaq />}
      <BrainoFooter />
      <BrainoTVScreen />
    </div>
    </BrainoTVProvider>
  );
}
