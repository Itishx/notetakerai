import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./deck.css";
import "./brainoDeck.css";

/* ============================================================================
   /braino-deck — the everything deck.

   /deck is the Foundry pitch: one product, aimed at an investor who already
   accepts that AI writes code. This is the other deck, the one that explains
   Braino from nothing: what he is, where he lives, what he does today, who pays
   for him, the arithmetic, and what is honestly still unbuilt.

   The rule for every slide here is harsher than on /deck: one idea, readable
   end to end without leaning in. If a slide needs a second read it gets split
   or cut. Twelve numbered slides, cover and close either side.

   It rides deck.css for the shell and the type scale, which are already tuned
   so nothing scrolls inside a slide, and keeps its own components in
   brainoDeck.css. The shell logic below is deliberately duplicated rather than
   extracted out of Deck.tsx, because the Foundry deck is in front of real
   people and must not move when this file changes.

   Every number on the stats, comps and money slides is carried over from /deck,
   which sources them on its own market slide. Nothing here is invented: where a
   figure is a model rather than a measurement, the slide says so.
   ============================================================================ */

type Slide = {
  id: string;
  chapter: string;
  act?: "coral" | "blue" | "green" | "amber" | "violet";
  night?: boolean;
  center?: boolean;
  fit?: "dense" | "diagram";
  body: ReactNode;
};

/* ── The three products ─────────────────────────────────────────────────────
   Price on the card, because a deck that hides the price makes the reader
   hunt for it and stop listening while they do. */

const PRODUCTS = [
  {
    tone: "coral" as const,
    where: "Chrome · the front door",
    name: "Braino Browser",
    does: "He reads the page you are on, answers about it, writes in your tone, and turns lectures and meetings into notes.",
    price: "Free",
    priceSub: "Braino Pro at $8 a month unlocks voice and lets him run the browser himself.",
  },
  {
    tone: "blue" as const,
    where: "macOS · the co-founder",
    name: "Braino Foundry",
    does: "He lives in the notch, sees your screen, sits in your meetings, handles files, and actually does the work rather than describing it.",
    price: "$20 / month",
    priceSub: "₹799 a month in India. BrainoHERA is included.",
  },
  {
    tone: "green" as const,
    where: "Anywhere on the Mac",
    name: "BrainoHERA",
    does: "Double tap Option and speak into any text field in any app. It lands at your cursor. No window, no waiting.",
    price: "Free, 15 min a day",
    priceSub: "$5 a month for unlimited. Included with Foundry.",
  },
];

function ThreeProducts() {
  return (
    <div className="bd-three">
      {PRODUCTS.map((p) => (
        <article key={p.name} className={`bd-prod c-${p.tone}`}>
          <span className="p-where">{p.where}</span>
          <h3>{p.name}</h3>
          <p className="p-does">{p.does}</p>
          <p className="p-price">{p.price}<small>{p.priceSub}</small></p>
        </article>
      ))}
    </div>
  );
}

/* ── The four promises the browser makes ─────────────────────────────────── */

const FOUR = [
  { no: "01", head: "Chat with the page", line: "Whatever is on screen, ask about it. No copying, no pasting, no explaining what you are looking at." },
  { no: "02", head: "Writes for you", line: "Replies, drafts, rewrites, in your tone rather than a robot's." },
  { no: "03", head: "Takes the notes", line: "Lectures, meetings and long videos come back as notes. You stop writing things down." },
  { no: "04", head: "Runs the browser", line: "Say the outcome out loud. He does the clicking, across tabs, until it is done." },
];

function FourPromises() {
  return (
    <div className="bd-four">
      {FOUR.map((f) => (
        <article key={f.no}>
          <b>{f.no}</b>
          <div>
            <h4>{f.head}</h4>
            <p>{f.line}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ── The arithmetic ─────────────────────────────────────────────────────────
   Shown as a sum with its own working, and labelled as a model, because the
   conversion rates are assumptions. A deck that presents an assumption in the
   same typeface as a measurement is lying quietly. */

const SUM = [
  { label: "10,000 people meet him free in Chrome", value: "$0" },
  { label: "5 of every 100 take Braino Pro · 500 × $8", value: "$4,000" },
  { label: "2 of every 100 take Foundry · 200 × $20", value: "$4,000" },
  { label: "1 of every 100 takes HERA alone · 100 × $5", value: "$500" },
];

function TheMath() {
  return (
    <div className="bd-math">
      <div className="bd-sum">
        {SUM.map((row) => (
          <div className="bd-sum-row" key={row.label}>
            <span>{row.label}</span>
            <b>{row.value}</b>
          </div>
        ))}
        <div className="bd-sum-row is-total">
          <span>Every month, from ten thousand free users</span>
          <b>$8,500</b>
        </div>
      </div>

      <div>
        <p className="bd-math-note">
          <b>Why the free tier is the engine.</b>
          A free browser user costs inference and nothing else, and it is capped per user. That is not
          charity and it is not a loss leader. It is the cheapest possible way to have someone trust him
          for three months before anyone asks them for money.
        </p>
        <p className="bd-math-note">
          <b>Why usage beats seats.</b>
          A heavy month bills more than a quiet one, which is what anybody expects from a co-founder who
          did more work. Revenue tracks work done, so nobody pays for a licence they forgot about.
        </p>
        <p className="bd-math-note">
          <b>Read this as a model, not a result.</b>
          The prices are real and live on the site. The conversion rates are assumptions, because nothing
          is on sale yet. Braino is a waitlist today.
        </p>
      </div>
    </div>
  );
}

/* ── Who it is actually for ─────────────────────────────────────────────────
   Two tiers rather than one, because the person who meets him is often not the
   person who pays. Saying that out loud is more useful than a single ICP that
   quietly contradicts the free tier. */

const ICP = [
  {
    color: "var(--dk-coral)", tag: "Meets him", head: "Students and people who read for a living",
    line: "The lecture, the meeting, the forty minute video. They arrive for the notes and stay for the personality. They pay nothing, and they are the top of everything.",
    num: "Free, in Chrome",
  },
  {
    color: "var(--dk-blue)", tag: "Pays for him", head: "The solo founder",
    line: "Building the product and being seen are two full time jobs and there is one of them. This is the buyer, and the shape of the job is the whole reason Braino exists.",
    num: "36.3% of new startups are one person",
  },
  {
    color: "var(--dk-green)", tag: "Later", head: "The team of two or three",
    line: "The same character, shared. Not built yet, and deliberately not promised on this slide.",
    num: "After launch",
  },
];

function IcpRings() {
  return (
    <div className="bd-icp">
      {ICP.map((i) => (
        <article key={i.tag} style={{ ["--i-color" as string]: i.color }}>
          <span className="i-tag">{i.tag}</span>
          <h4>{i.head}</h4>
          <p>{i.line}</p>
          <span className="i-num">{i.num}</span>
        </article>
      ))}
    </div>
  );
}

/* ── One page summary, five bands down a spine ─────────────────────────────── */

const FLOW = [
  {
    no: "01", title: "The problem", kind: "pair" as const,
    boxes: [
      { tone: "coral" as const, head: "Building is easy now", line: "Everyone has the same tools, so having them is worth nothing." },
      { tone: "coral" as const, head: "Being seen is the hard part", line: "And nobody ever built a founder the tooling for it." },
    ],
  },
  {
    no: "02", title: "Who he is", kind: "solo" as const,
    boxes: [{ tone: "amber" as const, head: "Braino OS", line: "One character, one memory, every surface. Not a tool you open. Someone who already knows you." }],
  },
  {
    no: "03", title: "Where he lives", kind: "trio" as const,
    boxes: [
      { tone: "coral" as const, head: "Browser · free", line: "Chrome. Where you meet him." },
      { tone: "blue" as const, head: "Foundry · $20", line: "macOS. The co-founder." },
      { tone: "green" as const, head: "HERA · $5", line: "Speak anywhere." },
    ],
  },
  {
    no: "04", title: "Who pays", kind: "pair" as const,
    join: { label: "free first, paid later", dir: "right" as const },
    boxes: [
      { tone: "coral" as const, head: "Students and readers", line: "Arrive for the notes. Pay nothing." },
      { tone: "blue" as const, head: "The solo founder", line: "Two jobs, one person. The buyer." },
    ],
  },
  {
    no: "05", title: "The money", kind: "solo" as const,
    boxes: [{ tone: "green" as const, head: "Free personal. Paid on the Mac.", line: "$45B already goes to tools that each do half of this job. Lovable and Cursor sell the building. The being seen has no Cursor yet." }],
  },
];

function SummaryFlow() {
  return (
    <div className="dk-flow">
      {FLOW.map((band, i) => (
        <div className="dk-flow-band" key={band.no}>
          <div className="dk-flow-step">
            <b>{band.no}</b>
            <span>{band.title}</span>
            {i < FLOW.length - 1 && <i className="f-rail" aria-hidden="true" />}
          </div>
          <div className={`dk-flow-boxes k-${band.kind}${band.join ? " has-join" : ""}`}>
            {band.boxes.map((box, bi) => (
              <Fragment key={box.head}>
                {band.join && bi === 1 && (
                  <span className="dk-flow-join">
                    <i aria-hidden="true">{"→"}</i>
                    {band.join.label}
                  </span>
                )}
                <article className={`dk-flow-box c-${box.tone}`}>
                  <h4>{box.head}</h4>
                  <p>{box.line}</p>
                </article>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── The deck ──────────────────────────────────────────────────────────────── */

const DECK: Slide[] = [
  {
    id: "cover", chapter: "Cover", night: true,
    body: (
      <>
        <p className="dk-cover-mark">Creatish Inc.</p>
        <h1 className="dk-cover-title">Braino</h1>
        <p className="dk-cover-line">One character.<b>Every screen you use.</b></p>
      </>
    ),
  },

  {
    id: "what", chapter: "What he is", act: "amber",
    body: (
      <>
        <p className="dk-kicker">Start here</p>
        <h2 className="dk-h">Braino is not an app.<br /><span className="tone">He is someone who is there.</span></h2>
        <p className="dk-lede">Most AI is a box you open, type into, and close. It forgets you the moment you do. Braino is the opposite bet: one character with one memory, who shows up on the screen you are already looking at, and who is still the same person tomorrow.</p>
        <div className="dk-facts">
          <div className="dk-fact"><b>One character</b><span>not five assistants wearing the same logo.</span></div>
          <div className="dk-fact"><b>One memory</b><span>so nothing has to be explained to him twice.</span></div>
          <div className="dk-fact"><b className="tone">Three places</b><span>your browser, your Mac, and any text field you can type in.</span></div>
        </div>
      </>
    ),
  },

  {
    id: "problem", chapter: "Why he exists", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">The problem, in three lines</p>
        <h2 className="dk-h">Everyone can build.<br /><span className="tone">Almost nobody gets seen.</span></h2>
        <ul className="dk-points">
          <li><i>01</i><p>AI made building easy. <em>Which means being able to build is worth nothing now.</em></p></li>
          <li><i>02</i><p>Getting noticed is the whole game. <em>And it is still done by hand, at night, by the same person who built the thing.</em></p></li>
          <li><i>03</i><p>Your tools do not talk. <em>One builds, another posts, and neither knows the other exists.</em></p></li>
        </ul>
      </>
    ),
  },

  {
    id: "three", chapter: "Where he lives", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Three products, one person inside them</p>
        <h2 className="dk-h sm">Meet him free.<br /><span className="tone">Hire him on the Mac.</span></h2>
        <ThreeProducts />
      </>
    ),
  },

  {
    id: "does", chapter: "What he does", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">What you get on day one</p>
        <h2 className="dk-h sm">Four things, <span className="tone">no asterisks.</span></h2>
        <FourPromises />
      </>
    ),
  },

  {
    id: "os", chapter: "The mind", act: "violet", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">What makes him a character</p>
        <h2 className="dk-h sm">Three engines <span className="tone">under all of it.</span></h2>
        <p className="dk-lede">Personality is not a system prompt here. It is three built engines that every Braino runs, which is why he is the same person in the browser as he is on the Mac.</p>
        <div className="dk-trio">
          <div>
            <span className="t-tag">Engine one</span>
            <h4>Emotional <span>Engine.</span></h4>
            <p>He has moods and they move. Not a mascot with a smile, a character whose reaction to a bad morning is different from his reaction to a shipped feature.</p>
          </div>
          <div>
            <span className="t-tag">Engine two</span>
            <h4>Memory <span>Engine.</span></h4>
            <p>He remembers you without being told to. What you are building, how you talk, what you already said no to.</p>
          </div>
          <div>
            <span className="t-tag">Engine three</span>
            <h4>Human Intelligence <span>Layer.</span></h4>
            <p>The part that decides what to actually do about a request, and when to stop and ask instead of guessing.</p>
          </div>
        </div>
      </>
    ),
  },

  {
    id: "icp", chapter: "Who it is for", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Who this is for</p>
        <h2 className="dk-h sm">The person who meets him<br /><span className="tone">is not always the one who pays.</span></h2>
        <IcpRings />
      </>
    ),
  },

  {
    id: "stats", chapter: "The numbers", act: "green",
    body: (
      <>
        <p className="dk-kicker">The market, four numbers</p>
        <h2 className="dk-h sm">The customer <span className="tone">already exists.</span></h2>
        <div className="bd-huge">
          <div className="bd-huge-row">
            <b>$45B</b>
            <div><p>of software spend in 2026 across the two halves of this job: AI code assistants, and social media management.</p>
              <small>AI code assistants $10.3B to $16.1B. Social media management $33.5B to $36.4B. Ranges are different analysts, not different years.</small></div>
          </div>
          <div className="bd-huge-row">
            <b>36.3%</b>
            <div><p>of new startups in the first half of 2025 had a single founder, up from 23.7% in 2019.</p>
              <small>This niche does not have to be created. It is already here and growing.</small></div>
          </div>
          <div className="bd-huge-row">
            <b>29.8M</b>
            <div><p>solo business owners in the United States alone, turning over roughly $1.7 trillion a year.</p></div>
          </div>
          <div className="bd-huge-row">
            <b>73%</b>
            <div><p>of them already use AI. The habit does not need teaching, only aiming.</p></div>
          </div>
        </div>
        <p className="dk-source"><b>Sources.</b> Grand View Research, Mordor Intelligence, Fortune Business Insights, Research and Markets. Solopreneur figures: US Census via Forbes, January 2026, and Starter Story.</p>
      </>
    ),
  },

  {
    id: "math", chapter: "The math", act: "amber", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">The math, with its working shown</p>
        <h2 className="dk-h sm">Free at the top. <span className="tone">Paid on the Mac.</span></h2>
        <TheMath />
      </>
    ),
  },

  {
    id: "comps", chapter: "The numbers", act: "green", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Comparables</p>
        <h2 className="dk-h sm">Half of this <span className="tone">is already a category.</span></h2>
        <div className="dk-comps">
          <article className="dk-comp c-violet">
            <span className="cp-name">Lovable</span>
            <p className="cp-figure">$500M<small>ARR, at a $13.2B valuation, with 146 people.</small></p>
            <p>You describe an app and it builds it. Three years old.</p>
          </article>
          <article className="dk-comp c-blue">
            <span className="cp-name">Cursor · Anysphere</span>
            <p className="cp-figure">~$4B<small>ARR by mid 2026. A $60B acquisition agreed in June.</small></p>
            <p>Zero to two billion in ARR in under twenty four months.</p>
          </article>
        </div>
        <p className="dk-comps-kicker">Both of them sell the building. <span>Neither sells the being seen.</span> That half has no Cursor yet.</p>
      </>
    ),
  },

  {
    id: "stands", chapter: "Where it stands", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">The honest ledger</p>
        <h2 className="dk-h sm">Built, <span className="tone">building, next.</span></h2>
        <p className="dk-lede">The site is a waitlist today and this deck says so out loud. Braino did not exist in May 2026. Everything in the first column was built between then and now, by one person, across 1,100 commits.</p>
        <div className="dk-ledger">
          <section className="is-built">
            <div className="l-head"><b>Built</b><span>Running now</span></div>
            <ul>
              <li>Braino OS: the emotional, memory and intelligence engines</li>
              <li>His own voice, in the browser and on the Mac</li>
              <li>Chrome extension: page context, notes, search, agent</li>
              <li>Mac app: screen awareness, execution, meetings both sides</li>
              <li>BrainoHERA dictation, system wide</li>
            </ul>
          </section>
          <section className="is-now">
            <div className="l-head"><b>Building</b><span>In progress</span></div>
            <ul>
              <li>Braino Code: the full voice to shipped product loop</li>
              <li>Distra: distribution across platforms as one product</li>
              <li>Usage based billing for the founder tier</li>
            </ul>
          </section>
          <section className="is-next">
            <div className="l-head"><b>Next</b><span>Not yet started</span></div>
            <ul>
              <li>Public launch, out of the waitlist</li>
              <li>Credits live on the real billing path</li>
              <li>The shared Braino, for a team of two or three</li>
            </ul>
          </section>
        </div>
      </>
    ),
  },

  {
    id: "later", chapter: "What comes next", act: "violet", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">What becomes possible</p>
        <h2 className="dk-h sm">Once he can act, <span className="tone">the job changes.</span></h2>
        <p className="dk-lede">Everything on the left is being built now and has a route to shipping. Everything on the right is honest speculation, kept on its own side of the slide so nobody has to guess which is which.</p>
        <div className="bd-later">
          <section className="is-soon">
            <span className="l-tag">Being built</span>
            <h4>The next two things.</h4>
            <ul>
              <li>Say the product out loud, watch it get built and shipped</li>
              <li>One brief becomes posts on every platform, daily, without asking</li>
              <li>What lands in public decides what gets built next week</li>
              <li>He sits in the meeting and does the follow up afterwards</li>
              <li>The same character, shared across a team of two or three</li>
            </ul>
          </section>
          <section className="is-far">
            <span className="l-tag">Speculation, plainly labelled</span>
            <h4>Where it could go.</h4>
            <ul>
              <li>A founder who never opens a dashboard again</li>
              <li>Braino noticing a problem before he is told about one</li>
              <li>A company where the only human job left is the deciding</li>
              <li>Him earning his own keep, on his own usage</li>
            </ul>
          </section>
        </div>
      </>
    ),
  },

  {
    id: "summary", chapter: "One page", act: "amber", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">Take this one with you</p>
        <h2 className="dk-h sm">The whole thing, <span className="tone">on one page.</span></h2>
        <SummaryFlow />
      </>
    ),
  },

  {
    id: "close", chapter: "Close", night: true, center: true,
    body: (
      <>
        <h2 className="dk-close-h">He is not a tool you open. <span>He is already there.</span></h2>
        <p className="dk-close-sub">Braino. One character, every screen you use.</p>
        <div className="dk-close-cta">
          <Link to="/braino">Meet Braino</Link>
          <Link to="/waitlist" className="ghost">Join the waitlist</Link>
        </div>
        <p className="dk-close-foot">Creatish Inc. · trybraino.com · a waitlist today</p>
      </>
    ),
  },
];

export default function BrainoDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(0);

  const numbers = useMemo(() => {
    let n = 0;
    return DECK.map((slide) => (slide.id === "cover" ? null : ++n));
  }, []);
  const total = useMemo(() => numbers.filter(Boolean).length, [numbers]);

  useEffect(() => {
    document.title = "Braino · The deck";
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = slideRefs.current.indexOf(entry.target as HTMLElement);
          if (index >= 0 && entry.isIntersecting) setActive(index);
        });
      },
      { root: scroller, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    slideRefs.current.forEach((el) => el && io.observe(el));

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const span = scroller.scrollHeight - scroller.clientHeight;
        setRead(span > 0 ? (scroller.scrollTop / span) * 100 : 0);
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = scroller.querySelectorAll<HTMLElement>(".dk-rev");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { root: scroller, threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(DECK.length - 1, index));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (["ArrowDown", "PageDown", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        goTo(active - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(DECK.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const activeSlide = DECK[active];
  const night = Boolean(activeSlide?.night);
  const actClass = activeSlide?.act ? `dk-act-${activeSlide.act}` : "dk-act-amber";

  const groups = useMemo(() => {
    const out: Array<{ chapter: string; from: number; count: number }> = [];
    DECK.forEach((slide, index) => {
      const last = out[out.length - 1];
      if (last && last.chapter === slide.chapter) last.count += 1;
      else out.push({ chapter: slide.chapter, from: index, count: 1 });
    });
    return out;
  }, []);

  return (
    <div className={`deck ${actClass}`} ref={scrollerRef}>
      <div className="dk-progress"><i style={{ ["--dk-read" as string]: `${read}%` }} /></div>

      <header className={`dk-bar ${night ? "on-night" : "on-line"}`}>
        <span className="dk-bar-name">Braino</span>
        <span className="dk-bar-chapter">{activeSlide?.chapter}</span>
        <div className="dk-bar-right">
          <span className="dk-bar-count">
            {numbers[active] ? `${String(numbers[active]).padStart(2, "0")} / ${total}` : `— / ${total}`}
          </span>
          <Link to="/braino" className="dk-bar-exit">Leave the deck</Link>
        </div>
      </header>

      <nav className={`dk-rail ${night ? "on-night" : ""}`} aria-label="Slides">
        {groups.map((group) => (
          <div className="dk-rail-group" key={`${group.chapter}-${group.from}`}>
            {Array.from({ length: group.count }, (_, offset) => {
              const index = group.from + offset;
              return (
                <button
                  key={index}
                  type="button"
                  className={`dk-dot${index === active ? " is-on" : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`${group.chapter}, slide ${index + 1}`}
                  aria-current={index === active}
                >
                  <i />
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {DECK.map((slide, index) => (
        <section
          key={slide.id}
          id={`slide-${slide.id}`}
          ref={(el) => { slideRefs.current[index] = el; }}
          className={[
            "dk-slide",
            slide.act ? `dk-act-${slide.act}` : "",
            slide.night ? "is-night" : "",
            slide.fit === "dense" ? "is-dense" : "",
            slide.fit === "diagram" ? "has-diagram" : "",
            slide.center ? "is-center" : "",
          ].filter(Boolean).join(" ")}
        >
          <div className="dk-in dk-rev">{slide.body}</div>
          {numbers[index] && <span className="dk-num">{String(numbers[index]).padStart(2, "0")}</span>}
        </section>
      ))}
    </div>
  );
}
