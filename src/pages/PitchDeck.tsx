import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./deck.css";
import "./pitchdeck.css";

/* ============================================================================
   /pitchdeck — Braino, in ten slides.

   The long deck at /deck runs twenty-eight slides and earns them in a room with
   an hour in it. This one is built for the other case, which is the common one:
   a deck opened cold, read once, for about three and a half minutes, by someone
   deciding whether to take the meeting. Ten slides against that budget is about
   twenty seconds each, so every slide carries one idea and at most one piece of
   evidence, and anything that cannot be read in a glance is cut.

   Shape: a cover, eight slides of argument, a close.

     who he is  ->  why the free half is free  ->  what founders actually said
     ->  what we built  ->  how big it is  ->  why the alternatives fail
     ->  how the money works  ->  what the next four quarters look like

   Two sources feed it. The character half and the funnel come from this repo;
   the market, competition, model and projection numbers are carried over from
   the v9 print deck (`files/braino-pitch-v9.html`), which is the current
   finalised set. Primary research is ours: eight structured founder interviews,
   August 2026. Every number is sourced on the slide it appears on.
   ============================================================================ */

type Slide = {
  id: string;
  chapter: string;
  act?: "coral" | "blue" | "green" | "amber" | "violet";
  night?: boolean;
  center?: boolean;
  /** `dense` tightens type on the heavy slides, `diagram` sizes the drawing off
      viewport height so the picture shrinks before the copy does. */
  fit?: "dense" | "diagram";
  body: ReactNode;
};

/* ── Slide 02: the split ────────────────────────────────────────────────────
   Braino himself at the top rather than a labelled node, because the whole
   argument of the slide is that this is a character and not a platform. The
   colours below him carry the commercial shape and hold for the rest of the
   deck: coral is the free companion, blue is the paid co-founder. */

function SplitDiagram() {
  return (
    <div className="pt-split">
      {/* Only the fork is drawn. The cards underneath are real HTML, because
          SVG text cannot wrap and four features crammed into a fixed box is
          exactly how a slide ends up unreadable. */}
      <svg className="pt-svg pt-split-svg" viewBox="0 0 1200 250" role="img"
        aria-label="One Braino forks into a free companion and a paid co-founder">
        <title>One character, two jobs</title>
        <image href="/braino-standing.svg" x={548} y={0} width={104} height={127} />
        <text className="p-line" x={600} y={158} textAnchor="middle">one mind, one memory</text>
        <path className="p-wire" d="M 600 176 C 600 220 300 208 300 250" />
        <path className="p-wire" d="M 600 176 C 600 220 900 208 900 250" />
      </svg>

      <div className="dk-fork pt-fork">
        <article className="dk-card c-coral">
          <span className="c-tag">The companion · free</span>
          <h3>Free. For your life.</h3>
          <ul>
            <li><b>No context switching.</b> He is already on the tab you are on, so there is no new window, no copy-paste, and nothing to explain to him.</li>
            <li><b>Records meetings and lectures.</b> And writes the notes while they happen, so you leave with the notes already done.</li>
            <li><b>Runs browser tasks on command.</b> The small repetitive things you do by hand every day, done by asking.</li>
            <li><b>Remembers you.</b> What you are building, how you talk, what you already said no to. Same person tomorrow.</li>
          </ul>
          <p className="c-price">Free, usage-capped. $15 a month for unlimited.</p>
        </article>

        <article className="dk-card c-blue">
          <span className="c-tag">The co-founder · paid</span>
          <h3>Hired. For your company.</h3>
          <ul>
            <li><b>Same face, same memory.</b> A different job. You never brief him from zero, because he was already there.</li>
            <li><b>Runs distribution end to end.</b> Content, optics and outbound, on one spine that holds the context.</li>
            <li><b>Never posts without you.</b> Everything waits in one approval inbox. Nothing reaches the public around it.</li>
            <li><b>Pushes back.</b> He will tell you an idea is weak rather than praise whatever you just said.</li>
          </ul>
          <p className="c-price">Paid. It does real work.</p>
        </article>
      </div>
    </div>
  );
}

/* ── Slide 03: the funnel ───────────────────────────────────────────────────
   The commercial argument for giving the companion away, drawn rather than
   asserted. The funnel narrows on the left; what the free half buys the company
   is annotated on the right, because that is the part an investor is actually
   asking about when they ask why it is free. */

function FunnelDiagram() {
  const bands = [
    {
      id: "meet", top: 40, bottom: 168, topHalf: 350, bottomHalf: 310,
      fill: "var(--dk-coral-tint)", ink: "var(--dk-ink)", sub: "var(--dk-soft)",
      label: "Anyone with a screen", line: "Meets him free. No card, no trial.",
    },
    {
      id: "keep", top: 182, bottom: 310, topHalf: 310, bottomHalf: 250,
      fill: "#f7ded9", ink: "var(--dk-ink)", sub: "var(--dk-soft)",
      label: "They keep him", line: "Two weeks in, you would notice if he were gone.",
    },
    {
      id: "wall", top: 324, bottom: 452, topHalf: 250, bottomHalf: 180,
      fill: "var(--dk-amber-tint)", ink: "var(--dk-ink)", sub: "var(--dk-soft)",
      label: "Some of them are founders", line: "And they hit the wall: nobody can find what they built.",
    },
    {
      id: "hire", top: 466, bottom: 588, topHalf: 180, bottomHalf: 130,
      fill: "var(--dk-blue)", ink: "#ffffff", sub: "rgba(255,255,255,0.72)",
      label: "They hire the co-founder", line: "The one who already knows them.",
    },
  ];
  const cx = 400;

  const notes = [
    { y: 108, title: "Free users, at near zero CAC", line: "The product is the acquisition channel." },
    { y: 268, title: "Brand awareness that compounds", line: "A character gets talked about. An ad does not." },
    { y: 428, title: "Virality, structurally", line: "He lives on other people's screens, in public." },
  ];

  return (
    <div className="pt-funnel">
      <svg className="pt-svg pt-funnel-svg" viewBox="0 0 1200 620" role="img"
        aria-label="A funnel from free companion users down to paid co-founder customers">
        <title>Why the free half is the acquisition system</title>

        {bands.map((band) => (
          <g key={band.id}>
            <polygon
              points={`${cx - band.topHalf},${band.top} ${cx + band.topHalf},${band.top} ${cx + band.bottomHalf},${band.bottom} ${cx - band.bottomHalf},${band.bottom}`}
              fill={band.fill}
            />
            <text className="f-band-label" x={cx} y={band.top + 56} textAnchor="middle" fill={band.ink}>{band.label}</text>
            <text className="f-band-sub" x={cx} y={band.top + 82} textAnchor="middle" fill={band.sub}>{band.line}</text>
          </g>
        ))}

        {/* The divider, and what the free half buys. */}
        <line x1={820} y1={40} x2={820} y2={588} stroke="var(--dk-line-soft)" strokeWidth={1} />
        {notes.map((note) => (
          <g key={note.title}>
            <circle cx={856} cy={note.y - 5} r={3.5} fill="var(--dk-coral)" />
            <text className="f-note" x={876} y={note.y} style={{ fontWeight: 600, fill: "var(--dk-ink)" }}>{note.title}</text>
            <text className="f-note" x={876} y={note.y + 24}>{note.line}</text>
          </g>
        ))}

        <rect x={840} y={492} width={330} height={96} rx={18} className="p-plate" />
        <text className="f-note" x={866} y={526} style={{ fontWeight: 600, fill: "var(--dk-ink)" }}>The benchmark we are playing against</text>
        <text className="f-note" x={866} y={550}>2.6% median freemium conversion in B2B SaaS.</text>
        <text className="f-note" x={866} y={570}>Top quartile 5-8%. Above 10% is exceptional.</text>
      </svg>

      <div className="pt-list">
        <article style={{ ["--s-color" as string]: "var(--dk-coral)" }}>
          <h4><i>01</i>Anyone with a screen meets him free</h4>
          <p>No card, no trial. Two weeks in, you would notice if he were gone.</p>
        </article>
        <article style={{ ["--s-color" as string]: "var(--dk-amber)" }}>
          <h4><i>02</i>Some of them are founders</h4>
          <p>And they hit the wall: they built the thing, and nobody can find it.</p>
        </article>
        <article style={{ ["--s-color" as string]: "var(--dk-blue)" }}>
          <h4><i>03</i>They hire the co-founder</h4>
          <p>The one who already knows them. Median freemium conversion in B2B SaaS is 2.6%, top quartile 5-8%.</p>
        </article>
      </div>
    </div>
  );
}

/* ── Slide 05: the machine ──────────────────────────────────────────────────
   Three engines on one spine, and one gate everything passes through. The gate
   is the only stroked box in the drawing on purpose: 8/8 founders asked for it
   unprompted, so it is a feature, not a caveat. */

function EnginesDiagram() {
  const engines = [
    { n: "01", name: "Content", line: "Writes in your voice. Reddit, LinkedIn, X, IG.", y: 8, color: "var(--dk-coral)" },
    { n: "02", name: "Optics", line: "AEO and SEO, checked and fixed every week.", y: 94, color: "var(--dk-violet)" },
    { n: "03", name: "Outbound", line: "Twenty personal messages. Not one blast.", y: 180, color: "var(--dk-green)" },
  ];
  const outs = [
    { name: "Social platforms", line: "Reddit · LinkedIn · X · Instagram", y: 8 },
    { name: "AI answers", line: "ChatGPT · Perplexity · Google AIO", y: 94 },
    { name: "Inboxes", line: "Email · LinkedIn DMs", y: 180 },
  ];

  return (
    <div className="pt-engines">
      {/* Wide and short on purpose: this slide also carries the two product
          shots, and a tall drawing would push them off the screen. */}
      <svg className="pt-svg pt-engines-svg" viewBox="0 0 1200 260" role="img"
        aria-label="One voice command feeds three engines, which pass through an approval gate before anything reaches the public">
        <title>Three engines, one spine, one gate</title>

        <rect x={0} y={96} width={112} height={68} rx={16} className="p-plate" />
        <text className="p-name" x={56} y={124} textAnchor="middle" style={{ fontSize: 13 }}>You speak</text>
        <text className="p-line" x={56} y={143} textAnchor="middle" style={{ fontSize: 10.5 }}>one command</text>
        <path className="p-wire" d="M 112 130 H 148" />

        <circle cx={192} cy={130} r={42} fill="var(--dk-night)" />
        <text className="p-core" x={192} y={126} textAnchor="middle" style={{ fontSize: 13 }}>Braino</text>
        <text className="p-core-sub" x={192} y={144} textAnchor="middle" style={{ fontSize: 10 }}>your memory</text>

        {engines.map((engine) => (
          <g key={engine.n}>
            <path className="p-wire" d={`M 234 130 C 262 130 262 ${engine.y + 36} 290 ${engine.y + 36}`} />
            <rect x={290} y={engine.y} width={290} height={72} rx={16} className="p-plate" />
            <text className="e-num" x={312} y={32} style={{ transform: `translateY(${engine.y}px)` }} fill={engine.color}>{engine.n}</text>
            <text className="p-name" x={344} y={engine.y + 32} style={{ fontSize: 15 }}>{engine.name}</text>
            <text className="p-line" x={312} y={engine.y + 54} style={{ fontSize: 11.5 }}>{engine.line}</text>
            <path className="p-wire" d={`M 580 ${engine.y + 36} C 602 ${engine.y + 36} 602 130 620 130`} />
          </g>
        ))}

        <rect x={620} y={86} width={152} height={88} rx={18} className="e-gate" />
        <text className="e-num" x={642} y={110} fill="var(--dk-amber)">The gate</text>
        <text className="p-name" x={642} y={134} style={{ fontSize: 15 }}>You approve</text>
        <text className="p-line" x={642} y={155} style={{ fontSize: 11 }}>Nothing skips you. 8/8.</text>

        {outs.map((out) => (
          <g key={out.name}>
            <path className="p-wire-dash" d={`M 772 130 C 792 130 792 ${out.y + 36} 810 ${out.y + 36}`} />
            <rect x={810} y={out.y} width={390} height={72} rx={16} fill="var(--dk-tint)" />
            <text className="p-name" x={834} y={out.y + 32} style={{ fontSize: 15 }}>{out.name}</text>
            <text className="p-line" x={834} y={out.y + 54} style={{ fontSize: 11.5 }}>{out.line}</text>
          </g>
        ))}
      </svg>

      <div className="pt-list">
        <article style={{ ["--s-color" as string]: "var(--dk-coral)" }}>
          <h4><i>01</i>Content</h4>
          <p>Writes in your voice, in platform-fit versions. Reddit, LinkedIn, X, Instagram. Wanted by 7/8.</p>
        </article>
        <article style={{ ["--s-color" as string]: "var(--dk-violet)" }}>
          <h4><i>02</i>Optics</h4>
          <p>AEO and SEO. Asks the buyer's questions in ChatGPT and Perplexity every week, then fixes what is missing. 8/8 once explained.</p>
        </article>
        <article style={{ ["--s-color" as string]: "var(--dk-green)" }}>
          <h4><i>03</i>Outbound</h4>
          <p>Researches each person and drafts twenty individual messages. Not one blast. 4/8.</p>
        </article>
        <article style={{ ["--s-color" as string]: "var(--dk-amber)" }}>
          <h4><i>GATE</i>You approve</h4>
          <p>Everything stops at one inbox and waits for you. Nothing reaches the public around it. Demanded unprompted by 8 of 8 founders.</p>
        </article>
      </div>
    </div>
  );
}

/* ── Slide 06: TAM, SAM, SOM ────────────────────────────────────────────────
   Three stepped bars, carried over from the v9 print deck. Bar length is
   illustrative, not to scale: a true-area drawing makes the SOM invisible and
   the slide useless. The numbers do the work; the bars carry direction only. */

const MARKET = [
  {
    id: "tam", eyebrow: "TAM", figure: "$17.9B", width: 620, color: "var(--dk-green)", tint: "var(--dk-green-tint)",
    lines: ["29.8M one-person businesses in the US alone,", "at $600 a year each — one $50/mo tool."],
    source: "US Census · WebFX martech benchmark",
    mobile: "29.8M one-person businesses in the US alone, at $600 a year each — the price of one $50 a month tool. SMBs already pay $200-500/mo for marketing software.",
  },
  {
    id: "sam", eyebrow: "SAM", figure: "$1.3B", width: 385, color: "var(--dk-blue)", tint: "var(--dk-blue-tint)",
    lines: ["2.2M founders who build with AI, in English", "markets and Indian metros."],
    source: "Solopreneur AI adoption · DPIIT",
    mobile: "2.2M founders who build with AI, across English-speaking markets and Indian metros. 240,000 DPIIT startups already sit inside it.",
  },
  {
    id: "som", eyebrow: "SOM", figure: "$39M", width: 200, color: "var(--dk-coral)", tint: "var(--dk-coral-tint)",
    lines: ["65,000 paying founders at $16-99 a month,", "reached via Mesa, agencies and the companion."],
    source: "Year three target",
    mobile: "65,000 paying founders at $16-99 a month depending on market, reached through Mesa, agency partners and the free companion. Year three target.",
  },
];

function MarketDiagram() {
  return (
    <div className="dk-market">
      <svg className="dk-market-svg" viewBox="0 0 1120 348" role="img" aria-labelledby="pt-market-title">
        <title id="pt-market-title">
          Total addressable market seventeen point nine billion dollars, serviceable market one point three
          billion, and a year three target of thirty nine million.
        </title>
        {MARKET.map((row, index) => {
          const y = index * 116 + 8;
          return (
            <g key={row.id}>
              <rect x={0} y={y} width={row.width} height={92} rx={18} fill={row.tint} />
              <text className="mk-eyebrow" x={30} y={y + 34} fill={row.color}>{row.eyebrow}</text>
              <text className="mk-number" x={30} y={y + 72} fill="var(--dk-ink)">{row.figure}</text>
              {row.lines.map((line, lineIndex) => (
                <text className="mk-desc" x={660} y={y + 38 + lineIndex * 23} key={line}>{line}</text>
              ))}
              <text className="mk-desc" x={660} y={y + 84} style={{ fontSize: 11.5, opacity: 0.72 }}>{row.source}</text>
            </g>
          );
        })}
      </svg>

      <div className="dk-market-list">
        {MARKET.map((row) => (
          <article key={row.id} style={{ ["--m-color" as string]: row.color }}>
            <b>{row.eyebrow}</b>
            <strong>{row.figure}</strong>
            <p>{row.mobile}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Slide 07: the competition ──────────────────────────────────────────────
   v9's table. It is deliberately not a feature grid: the right-hand column is
   what each tool leaves the founder still holding, because that is the thing
   being sold against. Braino's row is the only one where that column is empty
   of work. */

const RIVALS = [
  { does: "Posts for you", who: "Buffer · Postiz", price: "$15-49/mo", left: "You still write every word." },
  { does: "Finds people for you", who: "Apollo · Clay", price: "$50-100/mo", left: "You still write every message." },
  { does: "Measures AI visibility", who: "Peec · Profound", price: "$99-399/mo", left: "Tells you that you are invisible. Does not fix it." },
  { does: "Builds the product", who: "Lovable · Cursor", price: "$25-200/mo", left: "The thing exists. Nobody knows it does." },
  { does: "Does all of it", who: "GTM consultants", price: "$700-1,000/hr", left: "Only funded companies can afford it." },
];

function CompetitionTable() {
  return (
    <div className="pt-comp">
      <div className="pt-comp-head" aria-hidden="true">
        <span>What it does</span><span>Price</span><span>What it leaves you</span>
      </div>
      {RIVALS.map((row) => (
        <div className="pt-comp-row" key={row.who}>
          <h4>{row.does}<em>{row.who}</em></h4>
          <p className="c-price">{row.price}</p>
          <p className="c-left">{row.left}</p>
        </div>
      ))}
      <div className="pt-comp-row is-ours">
        <h4>Writes, posts, gets you named, reaches out<em>Braino</em></h4>
        <p className="c-price">$16-200/mo</p>
        <p className="c-left">One tap. That is the whole job.</p>
      </div>
      <p className="dk-versus-foot">
        The only thing on the market that does the whole job is a human at $700 an hour.
        <b> Everything a founder can actually afford makes them do the work themselves.</b>
      </p>
    </div>
  );
}

/* ── Slide 08: how the money works ──────────────────────────────────────────
   Four tiers, and the service tier is not a footnote. It is the highest margin
   and the fastest learning: whatever we repeat by hand for three clients is
   the next feature, which makes the service paid research. */

const TIERS = [
  {
    tag: "Free", name: "Companion", price: "$0", tone: "c-coral",
    line: "Everyone with a screen. Capped by usage.",
    note: "The top of the funnel, and the relationship.",
  },
  {
    tag: "Consumer", name: "Companion Pro", price: "$15/mo", tone: "c-amber",
    line: "The cap comes off, for the people who live in him.",
    note: "Pays for the free tier's inference.",
  },
  {
    tag: "The product", name: "Foundry", price: "$16-32/mo", tone: "c-blue", hero: true,
    line: "India. $49-99 globally, $200+ at revenue stage.",
    note: "Anchored to what eight founders said out loud.",
  },
  {
    tag: "Done for you", name: "We run it", price: "$260-525/mo", tone: "c-green",
    line: "After a free first month. Dinebees signed.",
    note: "Highest margin, fastest learning, paid research.",
  },
];

function ModelTiers() {
  return (
    <>
      <div className="pt-tiers">
        {TIERS.map((tier) => (
          <article className={`pt-tier ${tier.tone}${tier.hero ? " is-hero" : ""}`} key={tier.name}>
            <span className="t-tag">{tier.tag}</span>
            <h3>{tier.name}</h3>
            <p className="t-price">{tier.price}</p>
            <p className="t-line">{tier.line}</p>
            <p className="t-note">{tier.note}</p>
          </article>
        ))}
      </div>
      <div className="pt-traction">
        <b>Where we are today</b>
        <span><i>1</i>service client signed — Dinebees, 10K downloads</span>
        <span><i>3</i>founders in closing at their own stated price</span>
        <span><i>25</i>founder conversations banked</span>
        <span><i>120</i>Mesa founders to sell into next</span>
      </div>
    </>
  );
}

/* ── Slide 09: the next four quarters ───────────────────────────────────────
   What ships, and who is paying by then. Carried from v9. The revenue row is
   the only highlighted one because it is the row being underwritten. */

const QUARTERS = ["Q3 2026", "Q4 2026", "Q1 2027", "Q2 2027"];
const PROJECTION = [
  {
    label: "Product",
    cells: [
      "Content + Optics live. Approval inbox ships with v1. Launch 31 August.",
      "Outreach: personal drafts at scale, gated. One dashboard across all three.",
      "Braino Code. The co-founder starts building the product, not just distributing it.",
      "End to end. Idea to shipped to seen, one memory across all of it.",
    ],
  },
  { label: "Companion", cells: ["2,000 free", "10,000 free", "30,000 free", "75,000 free"] },
  { label: "Foundry", cells: ["10 paying", "60 paying", "200 paying", "500 paying"] },
  { label: "Service", cells: ["3 clients", "6 clients", "10 clients", "15 clients"] },
  { label: "Revenue", cells: ["$1.2K MRR", "$4.8K MRR", "$15K MRR", "$40K MRR"], hero: true },
  { label: "AI cost", cells: ["-$216", "-$955", "-$2.8K", "-$6.8K"], tone: "is-cost" },
  { label: "Gross profit", cells: ["$984 · 82%", "$3.8K · 80%", "$12.2K · 81%", "$33.2K · 83%"], tone: "is-profit" },
];

function ProjectionTable() {
  return (
    <div className="pt-proj">
      <div className="pt-proj-row pt-proj-head">
        <h4 />
        {QUARTERS.map((q) => <p key={q}>{q}</p>)}
      </div>
      {PROJECTION.map((row) => (
        <div className={`pt-proj-row${row.hero ? " is-hero" : ""}${row.tone ? " " + row.tone : ""}${row.label === "Product" ? " is-prose" : ""}`} key={row.label}>
          <h4>{row.label}</h4>
          {row.cells.map((cell, i) => (
            <p key={QUARTERS[i]}><i aria-hidden="true">{QUARTERS[i]}</i>{cell}</p>
          ))}
        </div>
      ))}
      <p className="dk-source">
        <b>The free companion feeds Foundry, and the service tells us what to build next.</b> Braino Code lands
        in Q1 2027, once distribution is working. <b>How the AI cost is worked out:</b> everything runs on
        gpt-5.6-luna at $0.20 per million input tokens and $1.20 per million output, the price OpenAI set on
        30 July 2026. Per active seat, per month: 0.5M in / 0.07M out for a usage-capped free companion ($0.18),
        12M / 2M for a Foundry seat ($4.80), four times that for a run-it-for-you client ($19.20), and free
        signups counted at 30% monthly active. <b>The free tier is 51% of the AI bill in Q3 and 61% by Q2 2027 —
        that line is the acquisition budget, and it is why the companion can stay free.</b>
      </p>
    </div>
  );
}

/* ── The product, actually shown ────────────────────────────────────────────
   v9's two mockups, ported. They are drawn in markup rather than pasted as
   screenshots so they stay sharp, follow the slide accent, and a wrong label is
   a word to fix rather than a re-export. No box-shadow: Chromium prints one as
   a flat grey slab in PDF. The border carries the frame instead. */

function ProductShots() {
  return (
    <div className="pt-shots">
      <figure className="pt-shot">
        <div className="s-bar"><i /><i /><i /><em>Content · one update, five places</em><u>Engine 1</u></div>
        <div className="s-in">
          <div className="s-tabs"><span className="on">Reddit</span><span>LinkedIn</span><span>X</span><span>Instagram</span></div>
          <p className="s-draft">Shipped dark mode after three people asked in the same thread. <span className="hl">The hard part was not the colours</span> — it was every chart and badge we had hard-coded.</p>
          <p className="s-meta">Learned from 200 of your own posts · long for Reddit, short for X</p>
        </div>
      </figure>

      <figure className="pt-shot">
        <div className="s-bar"><i /><i /><i /><em>Optics · this week's check</em><u>Engine 2</u></div>
        <div className="s-in">
          <p className="s-ask">"Best expense tracker for freelancers?" <span>· asked weekly</span></p>
          <div className="s-score"><b>ChatGPT</b><span className="txt">Names 4 tools. Not you.</span><span className="tag no">Invisible</span></div>
          <div className="s-score"><b>Perplexity</b><span className="txt">Cites your Reddit answer.</span><span className="tag yes">Named</span></div>
          <div className="s-score"><b>Google AIO</b><span className="txt">Competitor's pricing page wins.</span><span className="tag no">Invisible</span></div>
          <p className="s-foot">Fix drafted: a comparison page + 2 Reddit answers → sent to Content</p>
        </div>
      </figure>
    </div>
  );
}

/* ── The ten ───────────────────────────────────────────────────────────────── */

const DECK: Slide[] = [
  /* The cover is the v9 print deck's, ported: the live pill, the wordmark with
     Braino standing next to it, and the two-line claim. It leads with the plain
     word and the character, never with "Foundry" — a stranger cannot decode
     "BrainoFoundry", and the claim already states the whole split. */
  {
    id: "cover", chapter: "Cover", night: true,
    body: (
      <>
        <p className="pt-live"><i />Going live 31 August</p>
        <div className="pt-markrow">
          <h1 className="pt-mark">Braino</h1>
          <figure className="pt-masc">
            <img src="/braino-standing.svg" alt="Braino, standing" width={104} height={127} />
          </figure>
        </div>
        <p className="pt-claim">A companion for everyone.<br /><b>A co-founder for founders.</b></p>
      </>
    ),
  },

  {
    id: "who", chapter: "Who he is", act: "violet", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">Start here</p>
        <h2 className="dk-h sm">One character. <span className="tone">Two jobs.</span></h2>
        <p className="dk-lede">Braino is not an app you open and close. He is one character with one memory who shows up on the screen you are already looking at. That character does two jobs, and the split between them is the whole strategy: the one who already knows you is the one you end up hiring.</p>
        <SplitDiagram />
      </>
    ),
  },

  {
    id: "companion", chapter: "The companion", act: "coral", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">The free half, and why it is free</p>
        <h2 className="dk-h sm">The companion is not charity. <span className="tone">It is the funnel.</span></h2>
        <p className="dk-lede">Charging someone to have a friend on their screen is a bad business and a worse product. So the companion is free, and it does the job a marketing budget would otherwise do: it is how a founder meets Braino, months before they ever have a reason to pay him.</p>
        <FunnelDiagram />
        <p className="dk-source"><b>Sources.</b> Freemium conversion benchmarks, OpenView 2025 Product Benchmarks via Userpilot. The pattern is Canva, Notion and Figma: a genuinely useful free tier that produces its own creators, who bring the next wave, at almost entirely organic acquisition.</p>
      </>
    ),
  },

  {
    id: "said", chapter: "What founders said", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Primary research · eight structured interviews, August 2026</p>
        <h2 className="dk-h">Nobody pays for this.<br /><span className="tone">Everybody needs it.</span></h2>
        <div className="pt-quotes">
          <figure className="pt-quote c-coral">
            <blockquote>Distribution is my biggest bottleneck. I would actually buy this.</blockquote>
            <figcaption><b>Sidhant · CareKin</b>Learned these tools existed during our interview. Ready at $21 a month.</figcaption>
          </figure>
          <figure className="pt-quote c-blue">
            <blockquote>Scripts are the headache. Making videos is easy. Knowing what to say isn't.</blockquote>
            <figcaption><b>Sai Karan · LazyTyper</b>Built his own bot rather than pay for a tool. Says a normal founder pays $100+.</figcaption>
          </figure>
        </div>
        <div className="pt-stats">
          <div className="pt-stat"><b>8 / 8</b><span>say distribution is the biggest unsolved problem</span></div>
          <div className="pt-stat"><b>0 / 8</b><span>pay for a single distribution tool today</span></div>
          <div className="pt-stat"><b>3</b><span>said "I would buy this" on the spot</span></div>
          <div className="pt-stat"><b>$16-32</b><span>a month, the India band they named themselves</span></div>
        </div>
        <p className="dk-source"><b>Their three options today, and why each fails.</b> Do it themselves — ten hours a week, eating the time they needed for building. Build their own hacks — scripts and bots that break, a patch and not a system. Hire experts — $700-1,000 an hour, which only funded companies can afford.</p>
      </>
    ),
  },

  {
    id: "engines", chapter: "The engines", act: "green", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">The paid half, drawn</p>
        <h2 className="dk-h sm">Three engines. <span className="tone">One gate.</span></h2>
        <p className="dk-lede">Overlay all eight founders' weeks and whatever repeats is the union: three jobs, not six, on one spine that holds the context. Roughly 80% of a founder's distribution week. Inbound was cut, because zero of eight asked for it.</p>
        <EnginesDiagram />
        <ProductShots />
      </>
    ),
  },

  {
    id: "market", chapter: "Market size", act: "green", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">How big the opportunity is</p>
        <h2 className="dk-h sm">Big market. <span className="tone">A real slice of it.</span></h2>
        <p className="dk-lede">The wallet exists. It is just not being spent on this yet: 66% of small business owners spend under $1,000 a year on marketing, and zero of our eight founders pay for a distribution tool at all. We are not asking anyone to switch. We are the first thing they buy.</p>
        <MarketDiagram />
        <p className="dk-source"><b>And the ground just moved.</b> 37% of product discovery now starts inside an AI answer rather than a results page (Profound), those referrals convert at 14-16% against 1.8% for Google organic (Omnibound), and 82% of brands have no AI-visibility strategy at all (Erlin). Citations churn about 23% a month (AirOps) — which is what makes this weekly work, and weekly work is recurring revenue.</p>
      </>
    ),
  },

  {
    id: "competition", chapter: "Competition", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Why the alternatives fail</p>
        <h2 className="dk-h sm">Every tool does one piece. <span className="tone">You do the rest.</span></h2>
        <CompetitionTable />
      </>
    ),
  },

  {
    id: "model", chapter: "The model", act: "amber", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">How we make money</p>
        <h2 className="dk-h sm">Free companion. <span className="tone">Paid co-founder.</span></h2>
        <ModelTiers />
        <p className="dk-source"><b>One currency, throughout.</b> The India prices are the founders' own rupee numbers — ₹1,500-3,000 and ₹25-50K — converted at ₹95.2 to the dollar, the rate on 26 August 2026. <b>Why the service tier is not a distraction.</b> Zero of eight founders pay for a tool, so we sell the result rather than the software — "we will get your product in front of buyers" is the pitch. Every task we repeat by hand for three clients becomes a Braino feature, which makes the done-for-you tier paid research with the highest margin on the page.</p>
      </>
    ),
  },

  {
    id: "projections", chapter: "Projections", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Quarter on quarter</p>
        <h2 className="dk-h sm">What ships, <span className="tone">and who is paying by then.</span></h2>
        <ProjectionTable />
      </>
    ),
  },

  /* The close is v9's, verbatim: left aligned, the same headline, and his face
     with the same caption. It is the one slide that argues nothing — it just
     says what the company is for and lets him stand there. */
  {
    id: "close", chapter: "Close", night: true,
    body: (
      <div className="pt-endcover">
        <div>
          <p className="pt-live"><i />Going live 31 August</p>
          <h2 className="pt-end-h">Let's make distribution<br /><span className="tone">the easy part.</span></h2>
          <p className="pt-end-lede">A companion for everyone. A co-founder for founders.</p>
          <p className="pt-speak">Speak and watch it happen.</p>
          <div className="dk-close-cta">
            <Link to="/braino">Meet Braino</Link>
            <Link to="/waitlist" className="ghost">Join the waitlist</Link>
          </div>
        </div>
        <figure className="pt-endmasc">
          <img src="/braino-standing.svg" alt="Braino, standing" width={104} height={127} />
          <figcaption>(he is adorable, we know)</figcaption>
        </figure>
      </div>
    ),
  },
];

export default function PitchDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(0);

  /* Eight slides, numbered one to eight. The long deck hides the cover from the
     count because it has act dividers to skip too; here the promise is literally
     eight slides, so the count says eight. */
  const total = DECK.length;

  useEffect(() => {
    document.title = "Braino · The pitch, in eight";
  }, []);

  // Which slide is on screen, and how far through the deck we are.
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

  // The reveal, scoped to this scroller rather than the window.
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

  // Arrow keys, page keys and space move slide to slide, the way a deck should.
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
  const actClass = activeSlide?.act ? `dk-act-${activeSlide.act}` : "dk-act-coral";

  // One dot per slide. With eight of them the rail needs no chapter grouping.
  const groups = useMemo(
    () => DECK.map((slide, index) => ({ chapter: slide.chapter, index })),
    [],
  );

  return (
    <div className={`deck ${actClass}`} ref={scrollerRef}>
      <div className="dk-progress"><i style={{ ["--dk-read" as string]: `${read}%` }} /></div>

      <header className={`dk-bar ${night ? "on-night" : "on-line"}`}>
        <span className="dk-bar-name">Braino</span>
        <span className="dk-bar-chapter">{activeSlide?.chapter}</span>
        <div className="dk-bar-right">
          <span className="dk-bar-count">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <a href="/braino-pitchdeck.pdf" download className="dk-bar-exit">Download PDF</a>
          <Link to="/braino" className="dk-bar-exit">Leave the deck</Link>
        </div>
      </header>

      <nav className={`dk-rail ${night ? "on-night" : ""}`} aria-label="Slides">
        {groups.map((group) => (
          <div className="dk-rail-group" key={group.index}>
            <button
              type="button"
              className={`dk-dot${group.index === active ? " is-on" : ""}`}
              onClick={() => goTo(group.index)}
              aria-label={`${group.chapter}, slide ${group.index + 1}`}
              aria-current={group.index === active}
            >
              <i />
            </button>
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
          {/* The cover carries the credit line in the same corner, and the bar
              already reads 01 / 08, so the stamped number would only collide. */}
          {slide.id !== "cover" && (
            <span className="dk-num">{String(index + 1).padStart(2, "0")}</span>
          )}
          {slide.id === "cover" && (
            <div className="dk-cover-foot">
              <span>Itish Pande · Mesa School of Business</span>
              <i />
              <span>August 2026 · trybraino.com</span>
              <i />
              <span className="dk-cover-hint"><em>↓</em> Scroll, or use the arrow keys</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
