import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./deck.css";

/* ============================================================================
   /deck — Braino Foundry, the pitch.

   The original founder deck was twelve slides of problem, two engines and a
   price. Everything that made Braino worth funding lived outside it: the
   character, Braino OS, the memory, the free personal product, and the fact
   that the paid co-founder and the free companion are the same being.

   So this deck keeps the twelve slides' argument and puts the missing half
   back in, in the order an investor actually needs it:

     the shift  ->  who Braino already is  ->  the two Brainos  ->
     the two engines  ->  the loop that joins them  ->  why now  ->  money

   The page is its own scroll container so it behaves like a deck: slides snap,
   arrow keys move, the rail shows the shape. It is light the whole way with a
   near-black cover and close, because a dark slab in the middle of a light
   deck reads as a mistake and a dark cover reads as a cover.
   ============================================================================ */

type Slide = {
  id: string;
  chapter: string;
  /** Act accent. Everything inside the slide inherits it. */
  act?: "coral" | "blue" | "green" | "amber" | "violet";
  night?: boolean;
  center?: boolean;
  /** Divider slides carry the act number instead of a slide number. */
  divider?: boolean;
  /** Fit modifiers: `dense` tightens type on the heavier slides, `diagram`
      sizes the drawing off the viewport height so it shrinks before the copy
      does. Both exist so no slide ever needs a scrollbar of its own. */
  fit?: "dense" | "diagram";
  body: ReactNode;
};

/* ── The static solar system ────────────────────────────────────────────────
   Fixed positions, always-visible labels, nothing in orbit. The animated one
   on the product pages sells presence; this one has to be read correctly in
   about four seconds, so colour carries the commercial split: coral is the
   free personal family, blue is the paid founder product. */

const SUN = { x: 560, y: 380, r: 58 };

type Body = {
  id: string;
  name: string;
  place: string;
  line: string;
  color: string;
  /** Planet centre, in the 1300 x 680 diagram space. */
  x: number;
  y: number;
  r: number;
  /** Which side the label sits on, so nothing ever collides. */
  side: "left" | "right";
};

const BODIES: Body[] = [
  { id: "browser", name: "Braino Browser", place: "Chrome · free", line: "The page you are on, read and answered.", color: "var(--dk-coral)", x: 368, y: 245, r: 21, side: "left" },
  { id: "companion", name: "Braino Companion", place: "macOS · personal", line: "Him on your screen, all day. Just there.", color: "var(--dk-coral)", x: 368, y: 515, r: 21, side: "left" },
  { id: "studio", name: "BrainoStudio", place: "Identity", line: "His face, wardrobe and the way he moves.", color: "var(--dk-violet)", x: 819, y: 193, r: 18, side: "right" },
  { id: "foundry", name: "Braino Foundry", place: "macOS · the co-founder", line: "Braino Code and Distra live here.", color: "var(--dk-blue)", x: 880, y: 380, r: 27, side: "right" },
  { id: "hera", name: "BrainoHERA", place: "Voice", line: "Speak into any text field on the Mac.", color: "var(--dk-green)", x: 819, y: 568, r: 18, side: "right" },
];

function SolarSystem() {
  return (
    <div className="dk-solar">
      <svg className="dk-solar-svg" viewBox="-40 40 1300 680" role="img" aria-labelledby="dk-solar-title">
        <title id="dk-solar-title">
          Braino OS at the centre, with Braino Browser and the Mac companion in the free personal family,
          and Braino Foundry, BrainoHERA and BrainoStudio around it.
        </title>

        <circle className="s-ring" cx={SUN.x} cy={SUN.y} r={235} />
        <circle className="s-ring" cx={SUN.x} cy={SUN.y} r={320} />

        {BODIES.map((b) => (
          <line key={`spoke-${b.id}`} className="s-spoke" x1={SUN.x} y1={SUN.y} x2={b.x} y2={b.y} />
        ))}

        {/* The sun: Braino OS, drawn with his eyes, because the argument of the
            whole diagram is that the centre is a character and not a platform. */}
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 26} fill="var(--dk-amber)" opacity="0.09" />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 12} fill="var(--dk-amber)" opacity="0.13" />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="var(--dk-amber)" />
        <circle cx={SUN.x - 19} cy={SUN.y - 8} r={8.5} fill="#fff" />
        <circle cx={SUN.x + 19} cy={SUN.y - 8} r={8.5} fill="#fff" />
        <path d={`M ${SUN.x - 15} ${SUN.y + 20} Q ${SUN.x} ${SUN.y + 32} ${SUN.x + 15} ${SUN.y + 20}`} fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <text className="s-sun-name" x={SUN.x} y={SUN.y + 105} textAnchor="middle">Braino OS</text>
        <text className="s-sun-line" x={SUN.x} y={SUN.y + 129} textAnchor="middle">the mind, the memory and the moods</text>

        {BODIES.map((b) => {
          const anchor = b.side === "left" ? "end" : "start";
          const tx = b.side === "left" ? b.x - b.r - 18 : b.x + b.r + 18;
          return (
            <g key={b.id}>
              <circle cx={b.x} cy={b.y} r={b.r + 11} fill={b.color} opacity="0.12" />
              <circle cx={b.x} cy={b.y} r={b.r} fill={b.color} />
              <text className="s-name" x={tx} y={b.y - 10} textAnchor={anchor}>{b.name}</text>
              <text className="s-place" x={tx} y={b.y + 14} textAnchor={anchor} fill={b.color}>{b.place}</text>
              <text className="s-line" x={tx} y={b.y + 36} textAnchor={anchor}>{b.line}</text>
            </g>
          );
        })}
      </svg>

      {/* Below 820px the labels would shrink out of legibility, so the same
          information is a list instead of a smaller diagram. */}
      <div className="dk-solar-list">
        {[{ id: "os", name: "Braino OS", place: "The centre", line: "The mind, the memory and the moods. Every Braino runs it.", color: "var(--dk-amber)" }, ...BODIES].map((b) => (
          <article key={b.id} style={{ ["--s-color" as string]: b.color }}>
            <i />
            <div>
              <h4><small style={{ color: b.color }}>{b.place}</small>{b.name}</h4>
              <p>{b.line}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="dk-solar-legend">
        <span className="lg-os"><i />Braino OS</span>
        <span className="lg-personal"><i />Personal Braino, free</span>
        <span className="lg-founder"><i />Founder Braino, paid on usage</span>
        <span className="lg-hera"><i />Voice</span>
        <span className="lg-studio"><i />Identity</span>
      </div>
    </div>
  );
}

/* ── The loop: what the two engines do to each other ────────────────────────
   Four stations on a dashed ring with Braino OS in the middle, because the
   claim being made is that one brain holds both ends. Static, for the same
   reason the solar system is static. */

const LOOP_R = 210;
const LOOP_C = { x: 500, y: 310 };

const LOOP_NODES = [
  { id: "idea", step: "01", name: "You say it", line: "Out loud. That is the brief.", color: "var(--dk-amber)", x: 500, y: 100 },
  { id: "code", step: "02", name: "Braino Code", line: "He builds and ships it.", color: "var(--dk-blue)", x: 710, y: 310 },
  { id: "distra", step: "03", name: "Distra", line: "The world finds out.", color: "var(--dk-green)", x: 500, y: 520 },
  { id: "signal", step: "04", name: "Signal", line: "Leads, replies, what landed.", color: "var(--dk-coral)", x: 290, y: 310 },
];

/* Arrowheads sit between the stations, at the diagonals, pointing clockwise. */
const LOOP_ARROWS = [
  { x: 648.5, y: 161.5, rotate: 45 },
  { x: 648.5, y: 458.5, rotate: 135 },
  { x: 351.5, y: 458.5, rotate: 225 },
  { x: 351.5, y: 161.5, rotate: 315 },
];

function LoopDiagram() {
  return (
    <div className="dk-loop">
      <svg className="dk-loop-svg" viewBox="0 0 1000 620" role="img" aria-labelledby="dk-loop-title">
        <title id="dk-loop-title">
          You say it, Braino Code builds it, Distra gets it seen, the signal comes back, and Braino OS remembers all of it.
        </title>

        <circle className="l-ring" cx={LOOP_C.x} cy={LOOP_C.y} r={LOOP_R} />

        {LOOP_ARROWS.map((a, i) => (
          <path
            key={i}
            d="M -7 -7 L 7 0 L -7 7 Z"
            fill="var(--dk-line)"
            transform={`translate(${a.x} ${a.y}) rotate(${a.rotate})`}
          />
        ))}

        <circle cx={LOOP_C.x} cy={LOOP_C.y} r={88} fill="var(--dk-amber)" opacity="0.1" />
        <circle cx={LOOP_C.x} cy={LOOP_C.y} r={74} fill="var(--dk-bg)" stroke="var(--dk-amber)" strokeWidth="1.5" />
        <text className="l-core" x={LOOP_C.x} y={LOOP_C.y - 2} textAnchor="middle">Braino OS</text>
        <text className="l-core-sub" x={LOOP_C.x} y={LOOP_C.y + 20} textAnchor="middle">holds all four</text>

        {LOOP_NODES.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 108} y={n.y - 42} width={216} height={84} rx={20} fill="var(--dk-surface)" stroke="var(--dk-line)" strokeWidth="1" />
            <text className="l-step" x={n.x} y={n.y - 18} textAnchor="middle" fill={n.color}>{n.step}</text>
            <text className="l-node-name" x={n.x} y={n.y + 6} textAnchor="middle">{n.name}</text>
            <text className="l-node-line" x={n.x} y={n.y + 27} textAnchor="middle">{n.line}</text>
          </g>
        ))}
      </svg>

      <div className="dk-loop-list">
        {LOOP_NODES.map((n) => (
          <article key={n.id} style={{ ["--s-color" as string]: n.color }}>
            <h4><i>{n.step}</i>{n.name}</h4>
            <p>{n.line}</p>
          </article>
        ))}
        <article>
          <h4><i>OS</i>Braino OS</h4>
          <p>Holds all four, so nothing has to be explained twice.</p>
        </article>
      </div>
    </div>
  );
}

/* ── TAM, SAM, SOM ──────────────────────────────────────────────────────────
   Three stepped bars. Bar length is illustrative, not to scale, because a
   real-area TAM/SOM drawing makes the SOM invisible and the slide useless.
   The numbers do the work; the bars only carry the direction of travel.
   Every figure is sourced on the slide itself. */

const MARKET = [
  {
    id: "tam", eyebrow: "TAM", figure: "$45B", width: 780, color: "var(--dk-green)", tint: "#e8f3ec",
    lines: ["2026 software spend on building it", "and on getting it seen."],
    mobile: "The 2026 software spend on building it and on getting it seen: AI code assistants plus social media management.",
  },
  {
    id: "sam", eyebrow: "SAM", figure: "$3B", width: 450, color: "var(--dk-blue)", tint: "#e9f0fd",
    lines: ["US solopreneurs already earning six", "figures, at about $600 a year."],
    mobile: "Five million US solopreneurs already earning six figures, at about $600 a year. 73% of them already use AI.",
  },
  {
    id: "som", eyebrow: "SOM", figure: "$15M", width: 240, color: "var(--dk-coral)", tint: "#fbeae8",
    lines: ["25,000 paying founders inside three", "years. Half a percent of the SAM."],
    mobile: "25,000 paying founders inside three years. Half a percent of the serviceable market.",
  },
];

function MarketDiagram() {
  return (
    <div className="dk-market">
      <svg className="dk-market-svg" viewBox="0 0 1120 348" role="img" aria-labelledby="dk-market-title">
        <title id="dk-market-title">
          Total addressable market forty five billion dollars, serviceable market three billion,
          and a three year target of fifteen million in annual recurring revenue.
        </title>
        {MARKET.map((row, index) => {
          const y = index * 116 + 8;
          return (
            <g key={row.id}>
              <rect x={0} y={y} width={row.width} height={92} rx={18} fill={row.tint} />
              <text className="mk-eyebrow" x={30} y={y + 34} fill={row.color}>{row.eyebrow}</text>
              <text className="mk-number" x={30} y={y + 72} fill="var(--dk-ink)">{row.figure}</text>
              {row.lines.map((line, lineIndex) => (
                <text className="mk-desc" x={830} y={y + 44 + lineIndex * 23} key={line}>{line}</text>
              ))}
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

/* ── Today versus Braino ────────────────────────────────────────────────────
   The clarity slide, and it sits second on purpose. An investor should be able
   to state the whole thesis after this one slide and before any act begins.
   Row aligned rather than two loose columns, because the argument only lands
   when each pair is read across: same job, two different worlds. */

const VERSUS = [
  {
    label: "Building the product",
    today: "AI already does this. Everyone has the same tools, so having them is worth nothing.",
    ours: "Same, except he does it while you talk. Building was never going to be the moat.",
  },
  {
    label: "Getting it seen",
    today: "You. By hand. At night. Across five platforms. Badly, or not at all.",
    ours: "He does it. Every platform, every day, without being asked twice.",
  },
  {
    label: "How your tools fit",
    today: "One tool builds. Another posts. Neither knows the other exists.",
    ours: "One mind does both, so what lands in public decides what gets built next.",
  },
  {
    label: "What it knows about you",
    today: "Nothing. A fresh tab and a blank stare every morning.",
    ours: "You. He was on your screen for months before you ever hired him.",
  },
];

function VersusTable() {
  return (
    <div className="dk-versus">
      <div className="dk-versus-head" aria-hidden="true">
        <span />
        <span className="v-today">The market today</span>
        <span className="v-ours">With Braino</span>
      </div>
      {VERSUS.map((row) => (
        <div className="dk-versus-row" key={row.label}>
          <h4>{row.label}</h4>
          <p className="v-today"><i aria-hidden="true">Today</i>{row.today}</p>
          <p className="v-ours"><i aria-hidden="true">Braino</i>{row.ours}</p>
        </div>
      ))}
      <p className="dk-versus-foot">
        Every company in this market sells you the building. <b>Nobody sells you the being seen.</b> That gap is the
        entire company.
      </p>
    </div>
  );
}

/* ── Where the human sits ───────────────────────────────────────────────────
   The question every serious investor asks and most AI decks dodge. The answer
   has a shape: Braino decides HOW, the founder decides WHETHER. So the chain
   runs through a human twice, at the start and immediately before anything
   becomes public, and the three columns name who holds what with no hedging. */

const HIL_CHAIN = [
  { who: "you", label: "You say it", sub: "The brief" },
  { who: "him", label: "He does the work", sub: "Builds, writes, drafts" },
  { who: "you", label: "You approve", sub: "Nothing public until you do" },
  { who: "world", label: "It ships", sub: "Live" },
];

const HIL_COLUMNS = [
  {
    tone: "coral" as const,
    tag: "Always yours",
    title: "You decide whether.",
    lines: [
      "The idea, and whether it is worth doing",
      "Taste. What is good and what is embarrassing",
      "Anything that costs money",
      "Anything with your name in public",
      "The final no, at any point, on anything",
    ],
  },
  {
    tone: "blue" as const,
    tag: "Always his",
    title: "He decides how.",
    lines: [
      "Writing the code and shipping it",
      "Drafting the posts and the replies",
      "Research, scheduling, the boring ninety percent",
      "Watching what landed and reporting back",
      "Doing it again tomorrow without being reminded",
    ],
  },
  {
    tone: "amber" as const,
    tag: "He stops and asks",
    title: "The hard gates.",
    lines: [
      "Before spending a rupee or a dollar",
      "Before anything is published or sent",
      "Before emailing or messaging a human",
      "Before deleting anything, ever",
      "Before changing a price or a promise",
    ],
  },
];

function HumanInLoop() {
  return (
    <div className="dk-hil">
      <ol className="dk-hil-chain">
        {HIL_CHAIN.map((step, i) => (
          <li key={step.label} className={`h-${step.who}`}>
            <span className="h-badge">{step.who === "him" ? "Braino" : step.who === "world" ? "Public" : "You"}</span>
            <b>{step.label}</b>
            <small>{step.sub}</small>
            {i < HIL_CHAIN.length - 1 && <i className="h-arrow" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className="dk-hil-cols">
        {HIL_COLUMNS.map((col) => (
          <article key={col.tag} className={`dk-hil-col c-${col.tone}`}>
            <span className="c-tag">{col.tag}</span>
            <h3>{col.title}</h3>
            <ul>{col.lines.map((line) => <li key={line}>{line}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── The one page summary ───────────────────────────────────────────────────
   The last slide before the close: the entire deck as a single flow, so
   whoever is in the room can photograph one thing and still have the argument
   a week later.

   Built in markup rather than SVG on purpose. Every other diagram here is a
   fixed drawing with short labels, but this one carries real sentences, and
   SVG text does not wrap. Grid bands wrap, reflow on a phone, and stay
   selectable, which matters for the slide someone actually copies out. */

type FlowBand = {
  no: string;
  title: string;
  /** "pair" sits two boxes side by side, "solo" spans the full width. */
  kind: "pair" | "solo";
  /** Sits between the pair. `both` is a two way loop, `right` a one way step. */
  join?: { label: string; dir: "right" | "both" };
  boxes: { tone: "coral" | "blue" | "green" | "amber"; head: string; line: string }[];
};

const FLOW: FlowBand[] = [
  {
    no: "01", title: "The shift", kind: "pair",
    boxes: [
      { tone: "coral", head: "Building is easy now", line: "Anyone can do it, so being able to is worth nothing." },
      { tone: "coral", head: "Getting seen is the whole game", line: "And nobody ever built a founder the tooling for it." },
    ],
  },
  {
    no: "02", title: "The mind", kind: "solo",
    boxes: [
      { tone: "amber", head: "Braino OS", line: "One character, one memory, every surface. Not a tool you open. Someone who already knows you." },
    ],
  },
  {
    no: "03", title: "Two Brainos", kind: "pair", join: { label: "trust first, hire later", dir: "right" },
    boxes: [
      { tone: "coral", head: "Personal Braino · free", line: "Browser and Mac. How every founder meets him." },
      { tone: "blue", head: "Founder Braino · paid", line: "The co-founder you hire once you trust him." },
    ],
  },
  {
    no: "04", title: "Two engines", kind: "pair", join: { label: "signal feeds the next build", dir: "both" },
    boxes: [
      { tone: "blue", head: "Braino Code", line: "You speak. He builds it and ships it." },
      { tone: "green", head: "Distra", line: "The world finds out. Every platform, daily." },
    ],
  },
  {
    no: "05", title: "The money", kind: "solo",
    boxes: [
      { tone: "green", head: "Free personal. Usage priced founder.", line: "$45B already goes to tools that each do half of this job. Lovable and Cursor sell the building. The being seen has no Cursor yet." },
    ],
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
                {/* The join is a sibling between the two boxes, so the grid puts
                    it physically between them and it cannot be misread as an
                    arrow down to the next band. */}
                {band.join && bi === 1 && (
                  <span className="dk-flow-join">
                    <i aria-hidden="true">{band.join.dir === "both" ? "\u21c4" : "\u2192"}</i>
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

/* ── The deck ───────────────────────────────────────────────────────────────── */

const DECK: Slide[] = [
  {
    id: "cover", chapter: "Cover", night: true,
    body: (
      <>
        <p className="dk-cover-mark">Creatish Inc.</p>
        <h1 className="dk-cover-title">Braino<span>Foundry</span></h1>
        <p className="dk-cover-line">Your AI co-founder.<b>Speak. Watch it happen.</b></p>
      </>
    ),
  },

  /* The clarity slide. Second, so the thesis is stated before any act begins. */
  {
    id: "clarity", chapter: "In one slide", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Before anything else</p>
        <h2 className="dk-h sm">What the market sells you.<br /><span className="tone">What we sell you.</span></h2>
        <VersusTable />
      </>
    ),
  },

  /* ── Act one: the shift ── */
  {
    id: "act-shift", chapter: "The shift", act: "coral", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">01</div>
        <h2 className="dk-act-name">The shift</h2>
        <p className="dk-act-sub">Building stopped being the hard part. Almost nobody has reckoned with what that did to the rest of the job.</p>
      </div>
    ),
  },
  {
    id: "building", chapter: "The shift", act: "coral",
    body: (
      <>
        <p className="dk-kicker">The problem, one of two</p>
        <h2 className="dk-h">Building is easy now.<br /><span className="tone">Anyone can build.</span></h2>
        <p className="dk-lede">AI writes the code. Tools ship the product. What took a team and a year now takes one person and a weekend. Building is no longer where startups die.</p>
        <div className="dk-facts">
          <div className="dk-fact"><b>A team</b><span>is now one person and an agent that does not sleep.</span></div>
          <div className="dk-fact"><b>A year</b><span>is now a weekend, and the weekend is getting shorter.</span></div>
          <div className="dk-fact"><b className="tone">Everyone</b><span>has the same advantage, which means nobody does.</span></div>
        </div>
      </>
    ),
  },
  {
    id: "seen", chapter: "The shift", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">The problem, two of two</p>
        <h2 className="dk-h">Getting seen is<br /><span className="tone">the whole game.</span></h2>
        <p className="dk-lede">You could build the best product in the world. If nobody looks at it, it does not exist. Distribution is why average products outsell great ones, every single time.</p>
        <ul className="dk-points">
          <li><i>01</i><p>The product is not the moat. <em>Anyone can rebuild it by Friday.</em></p></li>
          <li><i>02</i><p>Attention is the moat. <em>And it does not arrive because you shipped something good.</em></p></li>
          <li><i>03</i><p>Creators cracked distribution years ago. <em>Founders never got the same tooling, and still do it by hand.</em></p></li>
        </ul>
      </>
    ),
  },
  {
    id: "solo", chapter: "The shift", act: "coral",
    body: (
      <>
        <p className="dk-kicker">Who hurts most</p>
        <h2 className="dk-h">One person.<br /><span className="tone">Every job.</span></h2>
        <p className="dk-lede">Build the product. Design it. Ship it. Market it. Post on five platforms. Find the leads. Reply to everyone. Alone.</p>
        <div className="dk-jobs">
          <span>Build</span><span>Design</span><span>Ship</span>
          <span>Market</span><span>Post</span><span>Sell</span><span>Reply</span>
        </div>
        <p className="dk-jobs-foot">Marketing becomes a second full time job nobody signed up for. So it gets done badly, or not at all, and a good product quietly disappears.</p>
      </>
    ),
  },

  /* ── Act two: who Braino already is. The half the original deck skipped. ── */
  {
    id: "act-braino", chapter: "Who Braino is", act: "violet", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">02</div>
        <h2 className="dk-act-name">Who Braino already is</h2>
        <p className="dk-act-sub">Before the pitch. The thing being pointed at founders already exists, and it is not a chat window.</p>
      </div>
    ),
  },
  {
    id: "character", chapter: "Who Braino is", act: "violet",
    body: (
      <>
        <p className="dk-kicker">The thing itself</p>
        <h2 className="dk-h">Not a chat box.<br /><span className="tone">A character.</span></h2>
        <p className="dk-lede">Braino has a face, a voice, a memory and an opinion. He lives in the corner of your screen, sees what you see, hears you, answers out loud, and increasingly does the work himself. Nobody builds a relationship with a text field. They build one with someone who is there.</p>
        <div className="dk-trio">
          <div>
            <span className="t-tag">Presence</span>
            <h4>He is <span>on the screen.</span></h4>
            <p>In the notch on the Mac, in the tab in Chrome. Always there, never in the way. You look up and he is already looking at the same thing you are.</p>
          </div>
          <div>
            <span className="t-tag">Voice</span>
            <h4>You <span>just talk.</span></h4>
            <p>Wake him and say the thing. He answers in his own voice, with his own timing, not as a wall of text you have to read.</p>
          </div>
          <div>
            <span className="t-tag">Memory</span>
            <h4>He <span>remembers you.</span></h4>
            <p>Between sessions, not just inside one. The company, the decisions, the thing you said you would stop doing.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "os", chapter: "Who Braino is", act: "violet", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Under the hood</p>
        <h2 className="dk-h">One brain.<br /><span className="tone">Every surface.</span></h2>
        <p className="dk-lede">Every Braino, wherever you meet him, runs the same operating system. That is why he is one character rather than four products sharing a logo.</p>
        <ul className="dk-points">
          <li><i>01</i><p>Emotional Engine. <em>Modular traits and deterministic moment routing, so he can be pleased, annoyed, protective, or flatly disagree with you.</em></p></li>
          <li><i>02</i><p>Human Intelligence Layer. <em>Before he acts, he works out what you actually meant: the vague pronoun, the missing person, the fork in the ask.</em></p></li>
          <li><i>03</i><p>Memory Engine. <em>Facts about you and the company are captured and reused, instead of re-explained every morning.</em></p></li>
          <li><i>04</i><p>Presence and hands. <em>Voice, screen awareness, browser and Mac control. He is not restricted to answering.</em></p></li>
        </ul>
      </>
    ),
  },

  /* ── Act three: the two Brainos ── */
  {
    id: "act-two", chapter: "Two Brainos", act: "coral", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">03</div>
        <h2 className="dk-act-name">Two kinds of Braino</h2>
        <p className="dk-act-sub">Same character, same memory, same face. Two completely different jobs, and two completely different reasons to pay.</p>
      </div>
    ),
  },
  {
    id: "types", chapter: "Two Brainos", act: "coral",
    body: (
      <>
        <p className="dk-kicker">The product, honestly</p>
        <h2 className="dk-h sm">There are two <span className="tone">Brainos.</span></h2>
        <p className="dk-lede">One is for your life. One is for your company. They are the same being, and that is the entire strategy: the one who already knows you is the one you end up hiring.</p>
        <div className="dk-fork">
          <article className="dk-card c-coral">
            <span className="c-tag">Personal Braino</span>
            <h3>The one you keep.</h3>
            <p>Free. He lives on your screen, reads what you are reading, turns lectures and meetings into notes, searches, remembers you, and talks back.</p>
            <ul>
              <li>Free in the browser. Not a trial.</li>
              <li>The full personality and the full memory</li>
              <li>Page context, search, notes and voice</li>
              <li>The Mac companion is the only paid part</li>
            </ul>
            <p className="c-price">Free. A relationship is not a subscription.</p>
          </article>
          <article className="dk-card c-blue">
            <span className="c-tag">Founder Braino</span>
            <h3>The one you hire.</h3>
            <p>The co-founder. Two engines: he builds the product with you, then makes sure the world sees it. Priced on usage, because it does real work.</p>
            <ul>
              <li>Braino Code. You speak, he builds.</li>
              <li>Distra. Distribution, end to end.</li>
              <li>Screen awareness and execution on macOS</li>
              <li>Usage based credits</li>
            </ul>
            <p className="c-price">Pay for what you use. Nothing else.</p>
          </article>
        </div>
      </>
    ),
  },
  {
    id: "personal", chapter: "Two Brainos", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Personal Braino</p>
        <h2 className="dk-h">Free, <span className="tone">on purpose.</span></h2>
        <p className="dk-lede">Charging someone to have a friend on their screen is a bad business and a worse product. Personal Braino is free in the browser and stays free. The goal is not productivity. The goal is that after two weeks you would notice if he were gone.</p>
        <ul className="dk-points">
          <li><i>01</i><p>Free in the browser. <em>He reads the page you are on, searches, writes with you, and turns long videos and lectures into clean notes.</em></p></li>
          <li><i>02</i><p>Free to simply be there. <em>The character on screen, the voice, the moods, the memory. None of it is behind a wall.</em></p></li>
          <li><i>03</i><p>The Mac companion is the only paid part. <em>Somewhere around five to ten dollars a month when it lands. Priced like a friend, not like a tool. Not final.</em></p></li>
          <li><i>04</i><p>And commercially, this is the funnel. <em>Personal Braino is how a founder meets him. Founder Braino is what they buy once they trust him.</em></p></li>
        </ul>
      </>
    ),
  },
  {
    id: "founder", chapter: "Two Brainos", act: "blue",
    body: (
      <>
        <p className="dk-kicker">Founder Braino</p>
        <h2 className="dk-h">The one you <span className="tone">hire.</span></h2>
        <p className="dk-lede">Same face, same memory, different job. Founder Braino is aimed at one person: the founder building a company alone, doing seven jobs badly because there is nobody to hand any of them to.</p>
        <div className="dk-trio">
          <div>
            <span className="t-tag">He knows the company</span>
            <h4>Context, <span>not prompts.</span></h4>
            <p>He has been in the browser, the meetings and the files with you. You never brief him from zero, because he was there.</p>
          </div>
          <div>
            <span className="t-tag">He does the work</span>
            <h4>Two <span>engines.</span></h4>
            <p>Braino Code builds it. Distra gets it seen. You stay the one making decisions and stop being the one doing everything.</p>
          </div>
          <div>
            <span className="t-tag">He pushes back</span>
            <h4>Not a <span>yes man.</span></h4>
            <p>The Emotional Engine is the reason he can tell you an idea is weak, instead of praising whatever you just said.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "solar", chapter: "Two Brainos", act: "amber", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">The ecosystem</p>
        <h2 className="dk-h sm">One character. <span className="tone">Many surfaces.</span></h2>
        <p className="dk-lede">Braino OS is the centre. Everything around it is a surface it wears. The colours carry the commercial shape: coral is free and personal, blue is the paid co-founder.</p>
        <SolarSystem />
      </>
    ),
  },

  /* ── Act four: the solution ── */
  {
    id: "act-solution", chapter: "The solution", act: "blue", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">04</div>
        <h2 className="dk-act-name">One co-founder. Two engines.</h2>
        <p className="dk-act-sub">The first builds the thing. The second makes sure somebody sees it. Both of them are him.</p>
      </div>
    ),
  },
  {
    id: "engines", chapter: "The solution", act: "blue",
    body: (
      <>
        <p className="dk-kicker">The solution</p>
        <h2 className="dk-h sm">Solo founders die in <span className="tone">exactly two places.</span></h2>
        <p className="dk-lede">They cannot build it, or nobody sees it. Braino Foundry is two engines pointed at precisely those two places, run by one character who remembers both.</p>
        <div className="dk-fork">
          <article className="dk-card c-blue">
            <span className="c-tag">Engine one</span>
            <h3>Braino Code</h3>
            <p>You have an idea. He builds it.</p>
            <ul>
              <li>Voice first. You speak, he codes.</li>
              <li>Every model, chosen for you, per job</li>
              <li>No editor, no terminal, no prompts</li>
            </ul>
          </article>
          <article className="dk-card c-green">
            <span className="c-tag">Engine two</span>
            <h3>Distra</h3>
            <p>You built it. He gets it seen.</p>
            <ul>
              <li>Every platform, one voice, on schedule</li>
              <li>Finds the people who need what you built</li>
              <li>Tells you the move, then makes it</li>
            </ul>
          </article>
        </div>
      </>
    ),
  },
  {
    id: "code", chapter: "The solution", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Engine one</p>
        <h2 className="dk-h">A coding agent<br /><span className="tone">you talk to.</span></h2>
        <p className="dk-lede">Not one AI. All of them.</p>
        <ul className="dk-points">
          <li><i>01</i><p>Voice first. <em>You speak, he codes. No editor, no terminal, no prompt window to learn.</em></p></li>
          <li><i>02</i><p>Multi model reasoning. <em>The best model for each job, picked automatically. You never choose one, and you never have to care which won.</em></p></li>
          <li><i>03</i><p>Zero prompts. <em>You describe the outcome the way you would describe it to a friend, and that is the whole skill required.</em></p></li>
          <li><i>04</i><p>Agent SDKs underneath. <em>Real agent infrastructure does the work. You only ever meet Braino.</em></p></li>
        </ul>
      </>
    ),
  },
  {
    id: "feels", chapter: "The solution", act: "blue", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">How it feels</p>
        <h2 className="dk-h sm">This is the <span className="tone">entire interface.</span></h2>
        <div className="dk-convo">
          <div className="dk-said"><b>You</b>Braino, I do not like the colour. Make it red.</div>
          <div className="dk-did"><b>Braino</b>Done. Refresh and look.</div>
          <div className="dk-said"><b>You</b>Now add payments. And explain what a webhook is.</div>
          <div className="dk-did"><b>Braino</b>Building it. <em>A webhook is the app calling you back when something happens. Give me a second and I will show you yours.</em></div>
        </div>
        <p className="dk-lede">He does not only build. He teaches you the business while he does it. Tools, design and money, explained plainly enough that someone who has never shipped anything ships something.</p>
      </>
    ),
  },
  {
    id: "distra", chapter: "The solution", act: "green", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Engine two</p>
        <h2 className="dk-h sm">Your product exists.<br /><span className="tone">Now the world finds out.</span></h2>
        <ul className="dk-points">
          <li><i>01</i><p>Runs distribution end to end. <em>Every platform, one voice, on a schedule you never have to keep yourself.</em></p></li>
          <li><i>02</i><p>Finds the people. <em>Leads on Reddit, threads worth entering, the person who just asked out loud for the thing you built.</em></p></li>
          <li><i>03</i><p>Automates the edits. <em>Clips, cuts and posts made out of what you already shipped, without you opening an editor.</em></p></li>
          <li><i>04</i><p>Tells you the move. <em>What to say, where to say it, when. Marketing stops being a guessing game you lose quietly.</em></p></li>
        </ul>
      </>
    ),
  },
  {
    id: "platforms", chapter: "The solution", act: "green",
    body: (
      <>
        <p className="dk-kicker">Everywhere that matters</p>
        <h2 className="dk-h sm">One founder cannot be everywhere.<br /><span className="tone">He can.</span></h2>
        <div className="dk-platforms">
          <span>LinkedIn</span><span>X</span><span>Instagram</span>
          <span>Reddit</span><span>Product Hunt</span><span>YouTube</span>
        </div>
        <p className="dk-lede">Posting, engaging, and finding the people who need what you built. Every day, on every surface, in your voice rather than a marketing voice.</p>
      </>
    ),
  },
  {
    id: "loop", chapter: "The solution", act: "amber", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">How it ties together</p>
        <h2 className="dk-h sm">Two engines, <span className="tone">one loop.</span></h2>
        <p className="dk-lede">This is the part a stack of separate tools cannot do. What Distra learns in public goes straight back into what Braino Code builds next, because one brain holds both ends. Context never leaves the room.</p>
        <LoopDiagram />
      </>
    ),
  },

  {
    id: "human", chapter: "The solution", act: "coral", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">The question that always comes</p>
        <h2 className="dk-h sm">Where is the human <span className="tone">in the loop?</span></h2>
        <p className="dk-lede">At the front of it, and again before anything reaches the world. He decides how. You decide whether. Nobody should hand a company to an agent and walk away, and we are not asking anyone to.</p>
        <HumanInLoop />
      </>
    ),
  },

  /* ── Act five: why us, why now ── */
  {
    id: "act-now", chapter: "Why now", act: "violet", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">05</div>
        <h2 className="dk-act-name">Why us, why now</h2>
        <p className="dk-act-sub">The hard parts are already built. This is not a pivot. It is aim.</p>
      </div>
    ),
  },
  {
    id: "machinery", chapter: "Why now", act: "violet", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Why us</p>
        <h2 className="dk-h">The machinery<br /><span className="tone">already exists.</span></h2>
        <ul className="dk-points">
          <li><i>01</i><p>Voice layer. Built. <em>Braino already talks and listens, in his own voice, in the browser and on the Mac.</em></p></li>
          <li><i>02</i><p>Agent and screen control. Built. <em>He already acts: opens tabs, fills forms, finds files, runs the machine in front of him.</em></p></li>
          <li><i>03</i><p>Personality and memory. Built. <em>An Emotional Engine and a Memory Engine running in production, not drawn on a slide.</em></p></li>
        </ul>
        <p className="dk-lede">None of that is roadmap. Foundry is what happens when all of it is pointed at one specific person instead of at everyone.</p>
      </>
    ),
  },
  {
    id: "pace", chapter: "Why now", act: "violet",
    body: (
      <>
        <p className="dk-kicker">The pace</p>
        <h2 className="dk-h">Three months. <span className="tone">Not eighteen.</span></h2>
        <p className="dk-lede">Braino did not exist in May. The character, the voice, the memory, the Mac app, the browser extension and the distribution engine were all built between then and now, by one person. The speed is not a detail of the story. It is the second product.</p>
        <div className="dk-facts">
          <div className="dk-fact"><b className="tone">3 months</b><span>from the first commit to a working ecosystem.</span></div>
          <div className="dk-fact"><b>1,100+</b><span>commits since the pivot in May 2026.</span></div>
          <div className="dk-fact"><b>1</b><span>person building it. So far.</span></div>
        </div>
      </>
    ),
  },
  {
    id: "ledger", chapter: "Why now", act: "blue",
    body: (
      <>
        <p className="dk-kicker">Where it actually stands</p>
        <h2 className="dk-h sm">Built, <span className="tone">building, next.</span></h2>
        <p className="dk-lede">The site is a waitlist today, and this deck says so out loud. Here is the honest split, because the one thing worse than a slow roadmap is a dishonest one.</p>
        <div className="dk-ledger">
          <section className="is-built">
            <div className="l-head"><b>Built</b><span>Running now</span></div>
            <ul>
              <li>Braino OS: Emotional Engine, Human Intelligence Layer, Memory Engine</li>
              <li>Voice, in his own voice, browser and Mac</li>
              <li>Browser extension: page context, notes, search, agent</li>
              <li>Mac app: screen awareness, execution, BrainoHERA dictation</li>
              <li>BrainoX: the distribution engine, already posting</li>
            </ul>
          </section>
          <section className="is-now">
            <div className="l-head"><b>Building</b><span>In progress</span></div>
            <ul>
              <li>Braino Code: the full voice to shipped product loop</li>
              <li>Distra: multi platform distribution as one product</li>
              <li>Founder Braino packaging and usage based billing</li>
            </ul>
          </section>
          <section className="is-next">
            <div className="l-head"><b>Next</b><span>After launch</span></div>
            <ul>
              <li>Public launch, out of the waitlist</li>
              <li>Credits live on the real billing path</li>
              <li>The paid Mac companion tier for Personal Braino</li>
            </ul>
          </section>
        </div>
      </>
    ),
  },

  /* ── Act six: the business. The founder deck stopped at a pricing model; an
     investor needs the market, the comparables and the route to market too. ── */
  {
    id: "act-business", chapter: "The business", act: "green", divider: true,
    body: (
      <div className="dk-act">
        <div className="dk-act-no">06</div>
        <h2 className="dk-act-name">The business</h2>
        <p className="dk-act-sub">How big the thing is, who already proved people pay for half of it, and how Braino reaches the people who need the other half.</p>
      </div>
    ),
  },
  {
    id: "market", chapter: "The business", act: "green", fit: "diagram",
    body: (
      <>
        <p className="dk-kicker">The market</p>
        <h2 className="dk-h sm">Two markets. <span className="tone">One founder pays both.</span></h2>
        <p className="dk-lede">Building software and being seen are sold as two separate industries today. A solo founder buys from both and gets neither joined up.</p>
        <MarketDiagram />
        <p className="dk-source">
          <b>Sources.</b> AI code assistant and code generation market, 2026: $10.3B (Grand View Research) to $16.1B (Mordor Intelligence).
          Social media management software, 2026: $33.5B to $36.4B across Grand View, Fortune Business Insights and Research and Markets.
          Solopreneur figures: US Census via Forbes, January 2026, and Starter Story. SAM and SOM are bottom-up and ours, not analyst numbers.
        </p>
      </>
    ),
  },
  {
    id: "founders", chapter: "The business", act: "green",
    body: (
      <>
        <p className="dk-kicker">Who is starting companies now</p>
        <h2 className="dk-h sm">One in three new startups<br /><span className="tone">is one person.</span></h2>
        <p className="dk-lede">This is not a niche that has to be created. It already exists, it is growing fast, and it already pays for AI. It just does not have anything built for the shape of the job.</p>
        <div className="dk-facts">
          <div className="dk-fact"><b className="tone">36.3%</b><span>of new startups in the first half of 2025 had a single founder, up from 23.7% in 2019.</span></div>
          <div className="dk-fact"><b>29.8M</b><span>solo business owners in the US alone, turning over about $1.7 trillion a year.</span></div>
          <div className="dk-fact"><b>73%</b><span>of solopreneurs already use AI. The habit does not need teaching, only aiming.</span></div>
        </div>
      </>
    ),
  },
  {
    id: "comps", chapter: "The business", act: "green",
    body: (
      <>
        <p className="dk-kicker">Comparables</p>
        <h2 className="dk-h sm">The build half is <span className="tone">already a category.</span></h2>
        <div className="dk-comps">
          <article className="dk-comp c-violet">
            <span className="cp-name">Lovable</span>
            <p className="cp-figure">$500M<small>ARR, at a $13.2B valuation, with 146 people.</small></p>
            <p>You describe an app and it builds it. Three years old.</p>
          </article>
          <article className="dk-comp c-blue">
            <span className="cp-name">Cursor · Anysphere</span>
            <p className="cp-figure">~$4B<small>ARR by mid 2026. A $60B acquisition agreed in June.</small></p>
            <p>Zero to two billion in ARR in under twenty four months. The fastest SaaS ramp on record.</p>
          </article>
        </div>
        <p className="dk-comps-kicker">Both of them sell building. <span>Neither of them sells being seen.</span> That half has no Cursor yet.</p>
      </>
    ),
  },
  {
    id: "gtm", chapter: "The business", act: "green", fit: "dense",
    body: (
      <>
        <p className="dk-kicker">Go to market</p>
        <h2 className="dk-h">Braino distributes <span className="tone">Braino.</span></h2>
        <ul className="dk-points">
          <li><i>01</i><p>Distra's first customer is Braino. <em>The distribution engine already runs the company's own X account, posting and engaging on the same machinery a founder would buy.</em></p></li>
          <li><i>02</i><p>The character is the marketing. <em>People will watch a mascot moonwalk across a screen. Nobody watches a SaaS demo. Every feature ships as a film, and the film is the ad.</em></p></li>
          <li><i>03</i><p>Free is the funnel. <em>Personal Braino costs nothing and builds the relationship. Founder Braino is the upgrade, never the introduction.</em></p></li>
          <li><i>04</i><p>Acquisition is content, not ads. <em>The waitlist was built on the character. That is the plan at scale too, because Distra is the thing that makes it repeatable.</em></p></li>
        </ul>
      </>
    ),
  },

  /* ── Money ── */
  {
    id: "model", chapter: "Money", act: "amber",
    body: (
      <>
        <p className="dk-kicker">The model</p>
        <h2 className="dk-h sm">Revenue scales with work done,<br /><span className="tone">not with seats sold.</span></h2>
        <p className="dk-lede">Three lines, and only one of them is a subscription. Nobody pays for a licence they forgot they had.</p>
        <div className="dk-trio">
          <div>
            <span className="t-tag">Line one</span>
            <h4>Personal Braino. <span>Free.</span></h4>
            <p>Costs us inference and nothing else, capped per user. It is not a loss leader, it is the acquisition channel: the founder who trusts him is the founder who buys him.</p>
          </div>
          <div>
            <span className="t-tag">Line two</span>
            <h4>Founder credits. <span>Usage.</span></h4>
            <p>Priced above model cost, so gross margin holds as volume grows. A heavy month bills more than a quiet one, which is exactly what a founder expects from a co-founder who did more work.</p>
          </div>
          <div>
            <span className="t-tag">Line three</span>
            <h4>Mac companion. <span>Small.</span></h4>
            <p>The one subscription, on the personal side, expected around five to ten dollars a month. Deliberately priced like a friend rather than a tool. Not final.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "money", chapter: "Money", act: "amber",
    body: (
      <>
        <p className="dk-kicker">Money</p>
        <h2 className="dk-h">Pay for what you use.<br /><span className="tone">Nothing else.</span></h2>
        <div className="dk-money">
          <article>
            <span className="m-tag">Free</span>
            <h3>Personal Braino</h3>
            <p>No card, no wall. The browser, the character, the memory, the notes. Free is not a trial here, it is the product.</p>
            <p className="m-note">This is the top of the funnel, and the relationship.</p>
          </article>
          <article className="hero">
            <span className="m-tag">Credits</span>
            <h3>Founder Braino</h3>
            <p>Usage based. Tokens in, work out. You pay when he builds something or ships something, and not a rupee before.</p>
            <p className="m-note">Priced against what the contractor would have cost.</p>
          </article>
          <article>
            <span className="m-tag">Upgrade</span>
            <h3>Need more?</h3>
            <p>Buy more. That is the entire pricing conversation. No seats, no tiers to decode, no annual lock in.</p>
            <p className="m-note">Mac companion for Personal Braino: around five to ten dollars a month. Not final.</p>
          </article>
        </div>
      </>
    ),
  },

  {
    id: "funds", chapter: "Money", act: "amber",
    body: (
      <>
        <p className="dk-kicker">What funding buys</p>
        <h2 className="dk-h sm">Three things, <span className="tone">in this order.</span></h2>
        <div className="dk-trio">
          <div>
            <span className="t-tag">01</span>
            <h4>Inference and <span>headroom.</span></h4>
            <p>Credits cover the marginal cost of paid work. Funding covers the free tier, which is the entire acquisition strategy, and the headroom to stop rate limiting the thing people came for.</p>
          </div>
          <div>
            <span className="t-tag">02</span>
            <h4>The first <span>hands.</span></h4>
            <p>One person built all of this in three months. The constraint stopped being ideas a while ago. It is now hours, and hours are the one thing that cannot be vibe coded.</p>
          </div>
          <div>
            <span className="t-tag">03</span>
            <h4>Distribution, <span>compounding.</span></h4>
            <p>Distra pointed at Braino first. Every rupee spent on making the distribution engine better is spent twice: once on the product, once on the company selling it.</p>
          </div>
        </div>
        <p className="dk-source"><b>On the ask.</b> Round size, terms and use of proceeds are deliberately not in this deck. They belong in a conversation, with numbers that are current on the day it happens.</p>
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
        <h2 className="dk-close-h">Running a startup becomes as easy as <span>thinking about it.</span></h2>
        <p className="dk-close-sub">Speak. Watch it happen.</p>
        <div className="dk-close-cta">
          <Link to="/braino">Meet Braino</Link>
          <Link to="/waitlist" className="ghost">Join the waitlist</Link>
        </div>
        <p className="dk-close-foot">Braino Foundry · Creatish Inc. · trybraino.com</p>
      </>
    ),
  },
];

export default function Deck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(0);

  /* Slide numbers skip the cover and the act dividers, so "07 / 20" counts the
     slides someone is actually being shown rather than the scroll positions.
     The closing slide is counted: it is the last thing shown, not a title card. */
  const numbers = useMemo(() => {
    let n = 0;
    return DECK.map((slide) => (slide.divider || slide.id === "cover" ? null : ++n));
  }, []);
  const total = useMemo(() => numbers.filter(Boolean).length, [numbers]);

  useEffect(() => {
    document.title = "Braino Foundry · The deck";
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

  // The rail groups consecutive slides that share a chapter.
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
        <span className="dk-bar-name">Braino <span>Foundry</span></span>
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
          {numbers[index] && (
            <span className="dk-num">{String(numbers[index]).padStart(2, "0")}</span>
          )}
          {slide.id === "cover" && (
            <div className="dk-cover-foot">
              <span>trybraino.com</span>
              <i />
              <span>August 2026 · Pre-launch</span>
              <i />
              <span className="dk-cover-hint"><em>↓</em> Scroll, or use the arrow keys</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
