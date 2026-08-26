import { type CSSProperties, type ReactNode } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import SocialCarousel, { ACCENTS, PANELS, type SocialSlide } from "@/components/SocialCarousel";

/* The Braino OS post. This is not a new design: it is the site's own "Under the
   hood" section (Landing.tsx section 7) ported to 4:5, with the same tokens, the
   same four accents, and the same words.

   Two rules the artboard has to obey that the website does not:
   1. Every value is a real pixel at 1080 x 1350. The preview scales the whole
      frame down and the export renders the same node with the scale removed, so
      a vw unit would silently resize between approval and the ZIP.
   2. Nothing animates. The four engine visuals on the site are live canvases and
      intervals, and a still PNG of a live canvas is whatever frame it happened to
      be on. These are deterministic redraws of the same pictures, so the PNG in
      the ZIP is the post rather than a frozen frame of one. */
const { blue: BLUE, coral: CORAL, violet: VIOLET, green: GREEN } = ACCENTS;

/* ── the four engine visuals, redrawn as stills ─────────────────────────── */

const CONTEXTS = [
  { label: "Screen", y: 90 },
  { label: "Memory", y: 160 },
  { label: "Chat", y: 230 },
  { label: "Time", y: 300 },
  { label: "Location", y: 370 },
];

/** The mind: a vague request pulls in what a person would, converges, resolves. */
function MindGraph() {
  const input = { x: 70, y: 230 };
  const core = { x: 462, y: 230 };
  const output = { x: 620, y: 230 };
  return (
    <svg className="osv-svg" viewBox="55 68 580 324" role="img" aria-label="A vague request pulls in your screen, memory, chat, time and location, converges on an understanding, and leaves as a specific action.">
      <g stroke={BLUE} strokeOpacity=".16">
        {CONTEXTS.map((node) => <line key={`a${node.label}`} x1={input.x} y1={input.y} x2={245} y2={node.y} />)}
        {CONTEXTS.map((node) => <line key={`b${node.label}`} x1={245} y1={node.y} x2={core.x} y2={core.y} />)}
      </g>
      <line x1={core.x} y1={core.y} x2={output.x} y2={output.y} stroke={BLUE} strokeOpacity=".28" />
      <circle cx={input.x} cy={input.y} r="6.5" fill={BLUE} />
      {CONTEXTS.map((node) => (
        <g key={node.label}>
          <circle cx={245} cy={node.y} r="11" fill={BLUE} fillOpacity=".12" />
          <circle cx={245} cy={node.y} r="5.5" fill="#fff" stroke={BLUE} strokeWidth="2" />
          <text x={231} y={node.y} textAnchor="end" dominantBaseline="middle">{node.label}</text>
        </g>
      ))}
      <circle cx={core.x} cy={core.y} r="24" fill={BLUE} fillOpacity=".22" />
      <circle cx={core.x} cy={core.y} r="11" fill={BLUE} />
      <text x={core.x} y={core.y + 42} textAnchor="middle">understands</text>
      <circle cx={output.x} cy={output.y} r="7" fill={BLUE} />
    </svg>
  );
}

/* The heart is the site's dense net: input, five hidden layers, output, with one
   path lit for the moment being read. The lit path is written down rather than
   generated, so the picture is identical in every render and every export. */
const NET_LAYERS = [1, 5, 7, 9, 7, 5, 1];
const NET_LIT = [0, 1, 4, 3, 2, 3, 0];
const netNode = (layer: number, index: number) => {
  const count = NET_LAYERS[layer];
  const gap = Math.min(54, 370 / Math.max(1, count - 1));
  return { x: 70 + (layer / (NET_LAYERS.length - 1)) * 540, y: 230 + (index - (count - 1) / 2) * gap };
};

/** The heart: a message cascades through the trait modules, the ones that lead on this moment light up. */
function HeartNet() {
  const edges: ReactNode[] = [];
  for (let layer = 0; layer < NET_LAYERS.length - 1; layer += 1) {
    for (let a = 0; a < NET_LAYERS[layer]; a += 1) {
      for (let b = 0; b < NET_LAYERS[layer + 1]; b += 1) {
        const from = netNode(layer, a);
        const to = netNode(layer + 1, b);
        const lit = NET_LIT[layer] === a && NET_LIT[layer + 1] === b;
        edges.push(<line key={`${layer}-${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={CORAL} strokeOpacity={lit ? ".95" : ".1"} strokeWidth={lit ? 2 : 1} />);
      }
    }
  }
  return (
    <svg className="osv-svg" viewBox="52 32 578 396" role="img" aria-label="A message cascades through dense layers of trait modules and the ones that lead on this moment light up.">
      {edges}
      {NET_LAYERS.map((count, layer) => Array.from({ length: count }, (_, index) => {
        const node = netNode(layer, index);
        const lit = NET_LIT[layer] === index;
        return lit
          ? <g key={`${layer}-${index}`}><circle cx={node.x} cy={node.y} r="13" fill={CORAL} fillOpacity=".2" /><circle cx={node.x} cy={node.y} r="6" fill={CORAL} /></g>
          : <circle key={`${layer}-${index}`} cx={node.x} cy={node.y} r="4.5" fill="#fff" stroke={CORAL} strokeOpacity=".4" strokeWidth="1.5" />;
      }))}
    </svg>
  );
}

const KEPT = [
  { fact: "Builds Braino. Three months in, pivoted in May.", from: "from a Tuesday standup" },
  { fact: "Hates credit pricing. Do not put credits on a page.", from: "from a pricing argument" },
  { fact: "Ships from main. Merging to main is the release.", from: "from the launch merge" },
  { fact: "Short answers. Long text gives him a headache.", from: "from being told twice" },
];

/** The memory: not a process you watch, a result you accumulate. So it draws the result. */
function MemoryList() {
  return (
    <div className="osv-mem" role="img" aria-label="Durable facts Braino kept about you without being asked.">
      <div className="osv-mem-head"><i /><span>What he knows about you</span><em>186 kept</em></div>
      <ul>
        {KEPT.map((row, index) => (
          <li key={row.fact} style={{ opacity: 1 - index * 0.17 }}>
            <i />
            <div><b>{row.fact}</b><span>{row.from}</span></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BAR_HEIGHTS = [10, 18, 30, 22, 38, 26, 44, 28, 36, 20, 30, 16, 11];

/** The ears: the whole argument is that nothing appears on screen, so the picture is the app you were already in. */
function HeraCard() {
  return (
    <div className="osv-hera" role="img" aria-label="Hold a key anywhere on the Mac, speak, and the words land at your cursor in the app you were already in.">
      <div className="osv-hera-listen">
        <span>hold ⌥</span>
        <div>{BAR_HEIGHTS.map((height, index) => <i key={index} style={{ height }} />)}</div>
      </div>
      <div className="osv-hera-app">
        <div className="osv-hera-bar"><span /><span /><span /><em>Mail — new message</em></div>
        <p>ship the six engines to main tonight<b /></p>
      </div>
      <div className="osv-hera-nots"><span>no window</span><span>no answer</span><span>no chat</span></div>
    </div>
  );
}

/* ── the post ───────────────────────────────────────────────────────────── */

type Slide = {
  key: string;
  kind: "open" | "table" | "pillar" | "close";
  eyebrow: string;
  title: ReactNode;
  copy: string;
  accent?: string;
  panel?: string;
  thought?: [string, string];
  visual?: ReactNode;
};

const PILLARS = [
  { role: "The mind", name: "Human Intelligence", line: "Works out what you actually meant.", accent: BLUE },
  { role: "The heart", name: "Emotional Intelligence", line: "Reads the moment and answers inside it.", accent: CORAL },
  { role: "The memory", name: "Memory Engine", line: "Keeps what mattered, without being asked.", accent: VIOLET },
  { role: "The ears", name: "BrainoHERA", line: "Hears you anywhere on the Mac.", accent: GREEN },
];

const SLIDES: readonly Slide[] = [
  {
    key: "open", kind: "open", eyebrow: "Under the hood", accent: VIOLET,
    title: <>Braino OS.</>,
    copy: "Every Braino runs on the same four things. A mind that works out what you meant, a heart that reads the room, a memory that keeps what matters, and a pair of ears. That is why he feels like someone instead of something.",
  },
  {
    key: "table", kind: "table", eyebrow: "The four", accent: VIOLET,
    title: <>One layer.<br /><em>Four jobs.</em></>,
    copy: "Not four products. Four parts of one operating layer, running in the browser, on the Mac, and inside Foundry.",
  },
  {
    key: "mind", kind: "pillar", eyebrow: "01 · The mind", accent: BLUE, panel: PANELS.blue,
    title: <>Human <em>Intelligence.</em></>,
    copy: "He works a problem the way a person does. Your screen, your memory, the conversation, the time, the place, all pulled together to figure out what you actually want instead of what you literally typed.",
    thought: ["“book that”", "the one on your screen"],
    visual: <MindGraph />,
  },
  {
    key: "heart", kind: "pillar", eyebrow: "02 · The heart", accent: CORAL, panel: PANELS.coral,
    title: <>Emotional <em>Intelligence.</em></>,
    copy: "The most emotionally intelligent AI anyone has built, and yes we know how that sounds. Fourteen trait modules reorder on every message, so he meets bad news differently than he meets banter.",
    thought: ["“i lost her today”", "attunement leads, humor stands down"],
    visual: <HeartNet />,
  },
  {
    key: "memory", kind: "pillar", eyebrow: "03 · The memory", accent: VIOLET, panel: PANELS.violet,
    title: <>Memory <em>Engine.</em></>,
    copy: "Nobody has ever remembered to say remember this. So he decides for himself what was worth keeping, writes it down, and keeps it current. Every fact is yours to read, edit or delete.",
    thought: ["nobody said “remember this”", "he wrote it down anyway"],
    visual: <MemoryList />,
  },
  {
    key: "ears", kind: "pillar", eyebrow: "04 · The ears", accent: GREEN, panel: PANELS.green,
    title: <>Braino <em>HERA.</em></>,
    copy: "Hold a key anywhere on the Mac, say the thing, and the words land at your cursor in whatever app you were already in. No window, no answer, no chat. Just what you said, written down.",
    thought: ["you said it", "it is already typed"],
    visual: <HeraCard />,
  },
  {
    key: "close", kind: "close", eyebrow: "Braino OS", accent: CORAL,
    title: <>Speak,<br /><em>watch it happen.</em></>,
    copy: "One mind, one heart, one memory, one pair of ears. The same Braino in the browser, on the Mac, and inside Foundry. Join the waitlist at trybraino.com.",
  },
];

const POST = { file: "braino-os", name: "Braino OS", number: "008" };

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === "open") {
    return (
      <div className="os-open">
        <div className="os-dots">{[BLUE, CORAL, VIOLET, GREEN].map((color) => <i key={color} style={{ background: color }} />)}</div>
        <p className="os-eyebrow">{slide.eyebrow}</p>
        <h2 className="os-display">{slide.title}</h2>
        <p className="os-lede">{slide.copy}</p>
      </div>
    );
  }

  if (slide.kind === "table") {
    return (
      <div className="os-tablewrap">
        <p className="os-eyebrow">{slide.eyebrow}</p>
        <h2 className="os-h2">{slide.title}</h2>
        <p className="os-sub">{slide.copy}</p>
        <div className="os-table">
          {PILLARS.map((pillar) => (
            <div key={pillar.role} style={{ "--acc": pillar.accent } as CSSProperties}>
              <div><span className="os-tag"><i />{pillar.role}</span><b>{pillar.name}</b></div>
              <p>{pillar.line}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "close") {
    return (
      <div className="os-close">
        <div className="os-walker" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
        <h2 className="os-display">{slide.title}</h2>
        <p className="os-lede">{slide.copy}</p>
      </div>
    );
  }

  return (
    <div className="os-pillar">
      <div className="os-cover">
        <span className="os-notch" aria-hidden="true"><i /><i /></span>
        {slide.thought ? <div className="os-thought"><span>{slide.thought[0]}</span><em>→</em><b>{slide.thought[1]}</b></div> : null}
        <div className="os-visual">{slide.visual}</div>
      </div>
      <p className="os-eyebrow"><i />{slide.eyebrow}</p>
      <h2 className="os-h2">{slide.title}</h2>
      <p className="os-sub">{slide.copy}</p>
    </div>
  );
}

const OS_SLIDES: readonly SocialSlide[] = SLIDES.map((slide) => ({
  key: slide.key,
  className: `is-${slide.kind}`,
  accent: slide.accent,
  panel: slide.panel,
  body: <SlideBody slide={slide} />,
}));

export function BrainoOsCarousel() {
  return <SocialCarousel file={POST.file} label="Braino OS" slides={OS_SLIDES} />;
}

/** The post on its own page, so it can be reviewed and downloaded without the archive around it. */
export default function BrainoOsCarousels() {
  return (
    <main className="os-page">
      <nav className="os-nav"><a href="/instagraphics"><i /> braino</a><span>Social studio · Post {POST.number}</span></nav>
      <header className="os-hero">
        <p>{POST.number} · Carousel</p>
        <h1>Braino OS,<br /><em>in seven slides.</em></h1>
        <div>
          <p>The site's own Under the hood section, ported to 4:5. Same words, same four accents, same rhythm. Every slide is a static 1080 × 1350 artboard, so what you approve here is exactly what lands in the ZIP.</p>
          <span>7 slides · 4320 × 5400 each</span>
        </div>
      </header>
      <BrainoOsCarousel />
      <footer className="os-foot"><p>Copy: Braino Knowledge Base / design / brainoos-instagram-carousels.md</p><a href="/instagraphics">Back to the archive ↑</a></footer>
    </main>
  );
}
