import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import SocialCarousel, { ACCENTS, PANELS, type SocialSlide } from "@/components/SocialCarousel";

/* Two posts, one page, one design system. Both are built from the site's own words:
   the hero line and the four features are Landing.tsx and Foundry.tsx, the character
   framing is the Braino deck's "Not a chat box. A character." slide, and the engine
   cards are the pitch deck's Engine 1 / 2 / 3 treatment with the real states from
   src/data/distraEngines.ts. Every graphic is a still for the same reason as the
   Braino OS post: a PNG of a live thing is whatever frame it landed on. */

const { blue: BLUE, coral: CORAL, violet: VIOLET, green: GREEN } = ACCENTS;

function Walker({ className = "os-walker" }: { className?: string }) {
  return <div className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />;
}

/* ── artwork ────────────────────────────────────────────────────────────── */

/** On the page: the page is already there, so there is nothing to upload. */
function PageArt() {
  return (
    <div className="osv-page">
      <div className="osv-chrome-bar"><i /><i /><i /><em>contract.pdf · 40 pages</em></div>
      <div className="osv-page-body">
        <span /><span /><span /><span /><span />
        <div className="osv-ask">“what does clause 9 actually mean?”</div>
      </div>
    </div>
  );
}

/** Notes: three hours in, four minutes out. */
function NotesArt() {
  return (
    <div className="osv-notes">
      <div className="osv-long"><b>3:02:41</b><span>recorded lecture</span><i /></div>
      <em>→</em>
      <div className="osv-note">
        <b>Four minutes to read</b>
        <p>Why the second model failed</p>
        <p>The three terms in the exam</p>
        <p>What to revise first</p>
      </div>
    </div>
  );
}

/** Meetings: the proof is the missing fifth tile. */
function MeetingArt() {
  return (
    <div className="osv-meet">
      <div className="osv-meet-grid">{["A", "R", "K", "M"].map((initial) => <span key={initial}>{initial}</span>)}</div>
      <div className="osv-meet-foot"><Walker className="os-walker is-tiny" /><small>he is here. he is just not in the list.</small></div>
    </div>
  );
}

/** Delegate: one line said out loud, three real tabs, the last one finished. */
function DelegateArt() {
  return (
    <div className="osv-delegate">
      <span className="osv-said">“book the 7am flight to Bombay”</span>
      <div className="osv-tabs">
        <div><i />Searching flights<em>done</em></div>
        <div><i />Filling passenger details<em>done</em></div>
        <div className="is-live"><i />Holding the 7:05, waiting on you<em>needs you</em></div>
      </div>
    </div>
  );
}

const BENTO = [
  { n: "01", name: "On the page", line: "Any page, any PDF, any video. Nothing to paste.", accent: CORAL, panel: PANELS.coral },
  { n: "02", name: "Notes from audio", line: "Lectures, podcasts, the video you never finished.", accent: VIOLET, panel: PANELS.violet },
  { n: "03", name: "Your meetings", line: "No bot in the call. Notes and promises at the end.", accent: BLUE, panel: PANELS.blue },
  { n: "04", name: "He does it", line: "Books it, buys it, fills it in, signed in as you.", accent: GREEN, panel: PANELS.green },
];

/** Four tiles, the site's bento card: number in the accent, words at the bottom. */
function BentoArt() {
  return (
    <div className="osv-bento">
      {BENTO.map((tile) => (
        <div key={tile.n} style={{ "--acc": tile.accent, background: tile.panel } as React.CSSProperties}>
          <i>{tile.n}</i>
          <div><b>{tile.name}</b><p>{tile.line}</p></div>
        </div>
      ))}
    </div>
  );
}

/* The website divides Braino into chapters and so does this post: chapter one is
   the companion the next four slides walk through, chapter two is the co-founder. */
const CHAPTERS = [
  { n: "01", role: "The companion", name: "Braino", where: "Free, in your browser",
    line: "Reads the page you are on, turns anything you listen to into notes, sits in your meetings, and goes and does the thing.",
    foot: "Chapter one is what comes next", accent: CORAL },
  { n: "02", role: "The co-founder", name: "Braino Foundry", where: "Paid, on your Mac",
    line: "Same face, same memory, different job. He builds the product with you, then makes sure the world finds out.",
    foot: "Chapter two follows right after it", accent: BLUE },
];

function ChaptersArt() {
  return (
    <div className="osv-chapters">
      {CHAPTERS.map((chapter) => (
        <div key={chapter.n} style={{ "--acc": chapter.accent } as React.CSSProperties}>
          <i>{chapter.n} / {chapter.role}</i>
          <b>{chapter.name}</b>
          <em>{chapter.where}</em>
          <p>{chapter.line}</p>
          <small>{chapter.foot}</small>
        </div>
      ))}
    </div>
  );
}

/* Engine states are the shipped ones from src/data/distraEngines.ts, not the deck's
   old dates. A slide that implies a planned engine is running is the one thing worse
   than a slow roadmap. */
const ENGINES = [
  { n: "Engine 1", state: "running today", name: "Content", line: "Posts in your voice, from what you actually shipped.", accent: CORAL },
  { n: "Engine 2", state: "next", name: "Optics", line: "Checks whether ChatGPT names you, then fixes it.", accent: BLUE },
  { n: "Engine 3", state: "planned", name: "Outbound", line: "Finds the right people and writes to them. He drafts, you send.", accent: GREEN },
];

function EnginesArt() {
  return (
    <div className="osv-engines">
      {ENGINES.map((engine) => (
        <div key={engine.n} style={{ "--acc": engine.accent } as React.CSSProperties}>
          <i>{engine.n} · {engine.state}</i>
          <b>{engine.name}</b>
          <p>{engine.line}</p>
        </div>
      ))}
    </div>
  );
}

const JOBS = [
  { label: "Build", hot: false }, { label: "Design", hot: false }, { label: "Ship", hot: false },
  { label: "Market", hot: true }, { label: "Post", hot: true }, { label: "Sell", hot: true }, { label: "Reply", hot: true },
];

/** The deck's seven jobs. The four that get done badly are the four Foundry takes. */
function JobsArt() {
  return (
    <div className="osv-jobs">
      <div>{JOBS.map((job) => <span key={job.label} className={job.hot ? "is-hot" : undefined}>{job.label}</span>)}</div>
      <small>one person, every job, at the same time</small>
    </div>
  );
}

/* Straight from the eight founder interviews on 22 August, the same numbers the
   pitch deck carries. Nothing rounded up, nothing implied. */
const EVIDENCE = [
  { stat: "8", line: "founders we sat down with, one at a time" },
  { stat: "7 of 8", line: "named posting and content as the thing hurting most" },
  { stat: "8 of 8", line: "wanted to be named by ChatGPT once it was explained" },
];

function EvidenceArt() {
  return (
    <div className="osv-evidence">
      {EVIDENCE.map((row) => <div key={row.stat}><b>{row.stat}</b><p>{row.line}</p></div>)}
    </div>
  );
}

/* ── slide builders ─────────────────────────────────────────────────────── */

type Copy = { eyebrow: string; title: React.ReactNode; copy: string };

function pillar(key: string, accent: string, panel: string, art: React.ReactNode, thought: [string, string] | null, { eyebrow, title, copy }: Copy): SocialSlide {
  return {
    key, className: "is-pillar", accent, panel,
    body: (
      <div className="os-pillar">
        <div className="os-cover">
          <span className="os-notch" aria-hidden="true"><i /><i /></span>
          {thought ? <div className="os-thought"><span>{thought[0]}</span><em>→</em><b>{thought[1]}</b></div> : null}
          <div className="os-visual">{art}</div>
        </div>
        <p className="os-eyebrow"><i />{eyebrow}</p>
        <h2 className="os-h2">{title}</h2>
        <p className="os-sub">{copy}</p>
      </div>
    ),
  };
}

/* One post, in the order the founder asked for: meet him, then the product
   distinction, then what he does, and only then who he actually is, so the
   character lands as the payoff rather than as a claim made up front. */
const SLIDES: readonly SocialSlide[] = [
  {
    key: "cover", className: "is-hook", accent: CORAL,
    body: (
      <div className="os-hook">
        <div className="os-hookart">
          <span className="os-island">hi. i’m the suit and the guy.</span>
          <Walker className="os-walker is-big" />
        </div>
        <p className="os-eyebrow">Meet Braino</p>
        <h2 className="os-h2">Iron Man got Jarvis.<br /><em>You get one who is cuter.</em></h2>
        <p className="os-sub">That was the entire brief. Build Jarvis, then make him someone you would actually want around all day. He has a face, a voice, a memory, and opinions about your ideas.</p>
      </div>
    ),
  },
  {
    key: "chapters", className: "is-fork", accent: CORAL,
    body: (
      <div className="os-forkslide">
        <p className="os-eyebrow">The split</p>
        <h2 className="os-h2">Two Brainos.<br /><em>Same guy.</em></h2>
        <p className="os-sub">One lives in your browser and helps with your day. One lives on your Mac and helps you build a company. Same face, same memory, completely different job.</p>
        <ChaptersArt />
      </div>
    ),
  },
  {
    key: "bento", className: "is-fork", accent: VIOLET,
    body: (
      <div className="os-forkslide">
        <p className="os-eyebrow">Chapter 01 · The companion</p>
        <h2 className="os-h2">So here is<br /><em>what he does.</em></h2>
        <p className="os-sub">Four things, free in your browser. You do not learn any of them. You say the thing the way you would say it to a friend.</p>
        <BentoArt />
      </div>
    ),
  },
  pillar("page", CORAL, PANELS.coral, <PageArt />, ["nothing to paste", "nothing to upload"], {
    eyebrow: "Chapter 01 · On the page",
    title: <>Chat with whatever<br /><em>is in front of you.</em></>,
    copy: "Any page, any PDF, any video. He is already on it, so there is nothing to paste and nothing to upload. Revolutionary, I know.",
  }),
  pillar("notes", VIOLET, PANELS.violet, <NotesArt />, ["three hours in", "four minutes out"], {
    eyebrow: "Chapter 01 · Notes",
    title: <>Notes from anything<br /><em>you listen to.</em></>,
    copy: "A lecture, a podcast, a two hour video you were never going to finish. He listens so you do not have to, and hands back something you would actually read.",
  }),
  pillar("meetings", BLUE, PANELS.blue, <MeetingArt />, ["no bot in the call", "notes at the end"], {
    eyebrow: "Chapter 01 · Meetings",
    title: <>He sits in<br /><em>your meetings.</em></>,
    copy: "No bot in the participant list, invisible to your screen share. Notes at the end, plus a list of everything you promised and immediately forgot.",
  }),
  pillar("delegate", GREEN, PANELS.green, <DelegateArt />, ["you say it", "he goes and does it"], {
    eyebrow: "Chapter 01 · Delegate",
    title: <>Say it,<br /><em>and he does it.</em></>,
    copy: "Books it, buys it, finds it, fills it in. In your browser, signed into your accounts, not in some sandbox pretending to be the internet.",
  }),
  {
    key: "hire", className: "is-fork", accent: BLUE,
    body: (
      <div className="os-forkslide">
        <p className="os-eyebrow">Chapter 02 · The co-founder</p>
        <h2 className="os-h2">The one<br /><em>you hire.</em></h2>
        <p className="os-sub">Everything above was chapter one, and it is free. Braino Foundry is the same character on your Mac, working as a co-founder: he builds with you, then makes sure the world finds out.</p>
        <EnginesArt />
        <p className="os-foot-note">A fourth engine holds the other three together and keeps everything in one approval inbox. Nothing goes out without you.</p>
      </div>
    ),
  },
  pillar("problem", BLUE, PANELS.blue, <JobsArt />, ["you build it", "nobody hears about it"], {
    eyebrow: "Chapter 02 · Why he exists",
    title: <>Building it was never<br /><em>the hard part.</em></>,
    copy: "One person builds, designs, ships, markets, posts on five platforms, finds the leads and replies to everyone. Marketing becomes a second full time job nobody signed up for, so it gets done badly, or not at all.",
  }),
  pillar("evidence", BLUE, PANELS.blue, <EvidenceArt />, ["we asked", "they all said the same thing"], {
    eyebrow: "Chapter 02 · What we heard",
    title: <>Eight founders.<br /><em>The same answer.</em></>,
    copy: "We sat down with eight of them and overlaid what their weeks actually contain. Distribution was not one problem among many. It was the one they were all losing.",
  }),
  {
    key: "close", className: "is-close", accent: CORAL,
    body: (
      <div className="os-close">
        <Walker className="os-walker" />
        <h2 className="os-display">Meet him free.<br /><em>Hire him later.</em></h2>
        <p className="os-lede">The companion lives in your browser and costs nothing. Braino Foundry, the engines, and the problem they exist for get their own post. Read that one next.</p>
        <span className="os-nextchip">Next post · Braino Foundry</span>
      </div>
    ),
  },
];

export default function MeetBrainoCarousels() {
  return (
    <main className="os-page">
      <nav className="os-nav"><a href="/instagraphics"><i /> braino</a><span>Social studio · Post 009</span></nav>
      <header className="os-hero">
        <p>009 · Carousel</p>
        <h1>Meet Braino,<br /><em>all of him.</em></h1>
        <div>
          <p>One post instead of two. Who he is, the split between the companion and the co-founder, the four things chapter one does, and why chapter two exists. Every slide is a static 1080 × 1350 frame, so what you approve here is what lands in the ZIP.</p>
          <span>{SLIDES.length} slides · 4320 × 5400 each</span>
        </div>
      </header>
      <section className="os-post" id="meet-braino">
        <header className="os-post-head">
          <div><span>009 · Carousel</span><h2>Meet Braino</h2><p>Opens white on his face and the Jarvis line, splits him into the website’s two chapters, lays the four things out as a bento, walks each one, then spends chapter two on the co-founder: the engine cards, the seven jobs, and what eight founder interviews said.</p></div>
          <aside><span>Instagram portrait</span><strong>1080 × 1350 px</strong><small>{SLIDES.length} slides · static</small></aside>
        </header>
        <SocialCarousel file="meet-braino" label="Meet Braino" slides={SLIDES} />
      </section>
      <footer className="os-foot"><p>Copy: Braino Knowledge Base / design / meet-braino-carousel.md</p><a href="/instagraphics">Back to the archive ↑</a></footer>
    </main>
  );
}
