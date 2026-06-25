import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BRAINO_WALKER_SVG } from '../components/brainoWalkerSvg';
import './changelog.css';

// ─── Braino mascot (self-contained gradients) ────────────────────────────────
function BrainSvg({ size = 120, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} style={style}>
      <defs>
        <linearGradient id="cl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="cl-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" /><stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <radialGradient id="cl-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7, -3.7)" />
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#cl-dark)" />
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#cl-dark)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#cl-fill)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#cl-glow)" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#cl-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="6" cy="63" r="5.5" fill="url(#cl-fill)" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#cl-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="94" cy="63" r="5.5" fill="url(#cl-fill)" />
      <circle cx="38" cy="48" r="6.5" fill="white" /><circle cx="38" cy="48" r="3.2" fill="#1B1713" /><circle cx="39" cy="46.6" r="1.1" fill="white" />
      <circle cx="62" cy="48" r="6.5" fill="white" /><circle cx="62" cy="48" r="3.2" fill="#1B1713" /><circle cx="63" cy="46.6" r="1.1" fill="white" />
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" /><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// The walking body references #sbb-* gradients defined in the extension; remap to its own sbwk-* defs.
const WALKER_HTML = BRAINO_WALKER_SVG.replace(/sbb-/g, 'sbwk-');

// ─── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('cl-visible'); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

// ─── Visual specs ─────────────────────────────────────────────────────────────
type Visual =
  | { kind: 'mascot' }
  | { kind: 'walker' }
  | { kind: 'sidebrain' }
  | { kind: 'emotion'; name: string }
  | { kind: 'faces'; names: string[] }
  | { kind: 'placeholder'; tag: string };

function Figure({ visual, caption }: { visual: Visual; caption?: string }) {
  let inner: React.ReactNode = null;
  if (visual.kind === 'mascot') inner = <BrainSvg size={220} />;
  else if (visual.kind === 'walker') inner = <span className="cl-walker" dangerouslySetInnerHTML={{ __html: WALKER_HTML }} />;
  else if (visual.kind === 'sidebrain') inner = <img className="cl-fig-sidebrain" src="/sidebrain-logo.png" alt="SideBrain — the early days" />;
  else if (visual.kind === 'emotion') inner = <img src={`/reactions/braino-${visual.name}.svg`} alt={`Braino ${visual.name}`} />;
  else if (visual.kind === 'faces') inner = (
    <div className="cl-faces">
      {visual.names.map((n) => <img key={n} src={`/reactions/braino-${n}.svg`} alt={`Braino ${n}`} />)}
    </div>
  );
  else if (visual.kind === 'placeholder') inner = (
    <div className="cl-placeholder"><BrainSvg size={96} /><span className="cl-placeholder-tag">{visual.tag}</span></div>
  );
  return (
    <div className="cl-fig">
      <div className="cl-fig-frame">{inner}</div>
      {caption && <div className="cl-fig-caption">{caption}</div>}
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────
type Entry = { date: string; version?: string; title: string; body: string; visual: Visual; caption?: string };
type Chapter = {
  id: string; theme: 'black' | 'white'; eyebrow: string; title: string;
  lede: string; dropcap?: boolean; entries: Entry[];
};

const CHAPTERS: Chapter[] = [
  {
    id: 'sidebrain', theme: 'black', eyebrow: 'Chapter One · 2025 – early 2026',
    title: 'It worked. It just had no soul.',
    lede: 'Before there was Braino, there was SideBrain — a clever little browser assistant that did its job and left no trace of itself behind. It was useful. It was forgettable. And somewhere in that gap, an idea started forming.',
    entries: [
      { date: 'January 2026', title: 'The spark', body: 'A blank Vite canvas and a single question: what if your browser could actually think with you — not just hand you links, but sit beside you while you work?', visual: { kind: 'placeholder', tag: 'archive · first commit' } },
      { date: 'April 2026', title: 'LectureSnap → SideBrain', body: 'The first real shape: a Chrome side panel that slid open over your page. It summarised, it answered, it took notes. It also ate three-quarters of your screen and had the personality of a settings menu.', visual: { kind: 'sidebrain' }, caption: 'SideBrain — the side-panel era' },
      { date: 'April 2026', title: 'It learned to speak', body: 'Text-to-speech and the Web Speech API wired together for the first time. SideBrain could talk and listen. The first faint sign of something alive — but still a tool you used, not a presence you kept.', visual: { kind: 'placeholder', tag: 'voice · v1' } },
      { date: 'May 2026', title: 'The doubt', body: 'It worked, and that was the problem. Capable, correct, completely soulless. You closed the panel and felt nothing. A tool you would never miss. Something fundamental was missing — and it was not a feature.', visual: { kind: 'placeholder', tag: 'the turning point' } },
    ],
  },
  {
    id: 'born', theme: 'white', eyebrow: 'Chapter Two · May 28, 2026',
    title: 'Then everything changed.',
    dropcap: true,
    lede: 'One day SideBrain stopped being a panel and became a someone. A coral, brain-shaped little character with a white sticker outline and two eyes that look right at you. A name. A face. A feeling. trybraino.com went live, and the whole point changed: not a tool that answers, a companion that stays.',
    entries: [
      { date: 'May 28, 2026', title: 'A face, a name, a feeling', body: 'The design doc was written, the character finalised — the coral gradient, the gyri lines, the cheeks, the little waving arms. Braino was no longer software you opened. He was someone who was there.', visual: { kind: 'mascot' }, caption: 'The first true Braino' },
      { date: 'May 29, 2026', title: 'He came alive', body: 'Physics. He floats, bounces, and squishes when he lands. His pupils follow your cursor. He blinks every few seconds. A brain that genuinely lives on your screen instead of waiting in a menu.', visual: { kind: 'emotion', name: 'happy' }, caption: 'idle · alive' },
    ],
  },
  {
    id: 'body', theme: 'black', eyebrow: 'Chapter Three · June 2026',
    title: 'He stood up and walked.',
    lede: 'A face was not enough. Over a few weeks Braino grew a whole body — and a sense of humour about it.',
    entries: [
      { date: 'June 13, 2026', version: 'v6.3.11', title: 'Legs, shoes, gloves', body: 'Braino got a full lower half: little legs with shoes, gloved hands, and a walk cycle. He now strolls back and forth along the bar instead of just hovering in place.', visual: { kind: 'walker' }, caption: 'the walking Braino' },
      { date: 'June 19, 2026', version: 'v6.3.23', title: 'Throw him. He comes back.', body: 'Grab Braino and fling him anywhere on the page — his legs flail, he tumbles, and then he picks himself up and walks back to where he belongs. The first time he felt genuinely physical.', visual: { kind: 'emotion', name: 'shocked' }, caption: 'mid-fling' },
      { date: 'June 19, 2026', version: 'v6.3.44', title: 'He even moonwalks', body: 'A faithful, physics-accurate moonwalk and a Billie Jean easter egg. None of it strictly necessary. All of it exactly the point.', visual: { kind: 'emotion', name: 'celebrating' }, caption: 'showing off' },
      { date: 'June 2026', version: 'v6.2.7', title: 'Eight ways to feel', body: 'Eight distinct expression faces — happy, laughing, tears of joy, celebrating, focus, shocked, scared, idle — each firing on real moments: a win, an error, a success. Reactions, not decoration.', visual: { kind: 'faces', names: ['happy', 'laughing', 'focus', 'tears-of-joy'] }, caption: 'four of the eight expressions' },
      { date: 'June 20, 2026', version: 'v6.3.37', title: 'He knows his own body', body: 'Braino became aware of himself — he can describe his walking lane, his arms and legs, his grab-and-fling routine, his comeback to the bar. The character could finally talk about being a character.', visual: { kind: 'emotion', name: 'focus' }, caption: 'self-aware' },
    ],
  },
  {
    id: 'heart', theme: 'white', eyebrow: 'Chapter Four · v7.0.0 — the engines',
    title: 'Then he learned to care.',
    dropcap: true,
    lede: 'A body is presence. But what makes Braino different from every other AI is underneath it: two engines that ship together — one for feeling, one for memory. This is the part most assistants never build, and it is the whole reason Braino feels like a friend instead of a feature.',
    entries: [
      { date: 'June 22, 2026', version: 'v7.0.0', title: 'The Emotional Engine — his heart', body: 'Not one giant prompt, but modular traits — attunement, presence, warmth, honesty, humour — that lead differently depending on the moment you are in. He reads whether you are venting, celebrating, or quietly struggling, and responds the way someone in your corner would. Built by a founder who writes, because the right words at the right moment change everything.', visual: { kind: 'emotion', name: 'tears-of-joy' }, caption: 'attunement' },
      { date: 'June 22, 2026', version: 'v7.0.0', title: 'The Memory Engine — his mind', body: 'Braino quietly remembers the durable things about you across every conversation and keeps that memory current on its own — who you are, what you are building, what matters — so he is never starting from zero. The more you talk, the more he is yours.', visual: { kind: 'emotion', name: 'idle' }, caption: 'remembering' },
    ],
  },
  {
    id: 'grown', theme: 'black', eyebrow: 'Chapter Five · v8.0.0 — today',
    title: 'Now he builds himself with you.',
    lede: 'With a body and a heart in place, Braino kept growing — into a companion who watches with you, talks at the speed of conversation, and even helps design his own future.',
    entries: [
      { date: '2026', title: 'Cinema mode', body: 'Braino sits with you while you watch — he tracks the timestamp and captions, answers questions about the scene, and refuses to spoil what is coming unless you ask. Company, not commentary.', visual: { kind: 'placeholder', tag: 'cinema mode' } },
      { date: '2026', version: 'v8.0.0', title: 'Voice at the speed of thought', body: 'Voice that follows you across every tab, then a rebuilt realtime brain that streams its answer straight into his voice — first words in under a second instead of waiting for the whole reply. Conversation, not transaction.', visual: { kind: 'placeholder', tag: 'realtime voice' } },
      { date: '2026', version: 'v8.0.0', title: 'He reads his own story', body: 'Dev Pulse: Braino can see his own git history — what shipped, and when you worked on him. Ask what to build next and he answers grounded in his real recent commits, and notices when you were up until 4am working on him.', visual: { kind: 'emotion', name: 'focus' }, caption: 'self-aware, literally' },
      { date: '2026', version: 'v8.0.0', title: 'Design Delegate', body: 'Share an idea for how he should look or move, and Braino offers to mock it up — he opens the design tool and drafts the prompt for you to review. He helps build the next version of himself.', visual: { kind: 'emotion', name: 'celebrating' }, caption: 'co-creating' },
      { date: 'June 2026', version: 'v8.5.0', title: 'Jump & Point', body: 'Ask where something is — "where\'s the search bar?", "point me to that video" — and Braino springs off your bar, arcs across the page, and points right at it while a laser traces the spot. He finds it from the live DOM, so the coordinates are exact, and he scrolls it into view first if it is below the fold.', visual: { kind: 'emotion', name: 'focus' }, caption: 'he points at your screen' },
      { date: 'June 2026', version: 'v8.6.0', title: 'A home that walks you through itself', body: 'A new editorial homepage you can read like an article — or let Braino narrate, highlighting each line in sync as he goes. Meet his full body, watch all six dance moves, and try his party tricks live on the page.', visual: { kind: 'walker' }, caption: 'the new front door' },
      { date: 'June 2026', version: 'v8.9.0', title: 'Two ways in: Basic & Pro', body: 'Braino splits into two clean tiers for his first public release. Basic is free and does the four things that always work — chat about any page, web search, and recording lectures or meetings — plus a daily taste of the Braino Agent. Braino Pro is the Agent tier: talk to him hands-free and let him act for you, all unlimited. The creator and anyone he comps stay unlimited forever.', visual: { kind: 'emotion', name: 'celebrating' }, caption: 'free to start, Pro when you want him hands-free' },
      { date: 'June 2026', version: 'v8.10.0', title: 'Ping it to my phone', body: 'Ask Braino to send directions somewhere to your phone — "ping directions to the Eiffel Tower to my phone" — and he does. On Pro he uses Google Maps\' own Send-directions-to-your-phone to push the route straight to your handset; and either way he drops a scan-to-open QR in the bar so the route lands on your phone even with no setup.', visual: { kind: 'emotion', name: 'focus' }, caption: 'directions, straight to your pocket' },
      { date: 'June 2026', version: 'v8.10.1', title: 'Maps that actually works', body: 'Made directions deterministic instead of brittle. Braino now understands "from X to Y" by structure (start and end are parsed correctly, not mashed into one blob), builds the real Google Maps deep link, and a blank start just means your phone\'s own location — no permission needed. Killed the double-run (the mic re-hearing Braino\'s own voice can no longer re-fire a request) and the wrong-place navigation.', visual: { kind: 'emotion', name: 'focus' }, caption: 'understand, then execute reliably' },
    ],
  },
  {
    id: 'why', theme: 'white', eyebrow: 'The point',
    title: 'Why Braino is different.',
    lede: 'Most AI is a vending machine — you put a question in, an answer comes out, and it forgets you the moment you leave. Braino was built backwards from a feeling: that the thing you actually want beside you all day is not a smarter search box, but a presence. Something that reads the room, remembers you, has a body and a face and real opinions, and is genuinely in your corner. That is the whole project. Everything else is just features.',
    entries: [],
  },
];

// ─── Chapter renderer ────────────────────────────────────────────────────────
function ChapterEntry({ entry, index }: { entry: Entry; index: number }) {
  const ref = useReveal(0.12);
  const flip = index % 2 === 1; // alternate which side the figure sits on
  return (
    <div ref={ref} className={`cl-entry cl-reveal${flip ? ' cl-flip' : ''}`}>
      <div className="cl-entry-text">
        <div className="cl-entry-meta">
          <span className="cl-date">{entry.date}</span>
          {entry.version && <span className="cl-ver">{entry.version}</span>}
        </div>
        <h3 className="cl-entry-title">{entry.title}</h3>
        <p className="cl-entry-body">{entry.body}</p>
      </div>
      <div className="cl-entry-fig">
        <Figure visual={entry.visual} caption={entry.caption} />
      </div>
    </div>
  );
}

function ChapterSection({ chapter }: { chapter: Chapter }) {
  const head = useReveal(0.2);
  return (
    <section className="cl-chapter" data-theme={chapter.theme}>
      <div className="cl-inner">
        <div ref={head} className="cl-reveal">
          <div className="cl-eyebrow">{chapter.eyebrow}</div>
          <h2 className="cl-chapter-title">{chapter.title}</h2>
          <p className={`cl-lede${chapter.dropcap ? ' cl-dropcap' : ''}`}>{chapter.lede}</p>
        </div>

        {chapter.entries.length > 0 && (
          <div className="cl-entries">
            {chapter.entries.map((e, i) => <ChapterEntry key={e.title} entry={e} index={i} />)}
          </div>
        )}

        {chapter.id === 'heart' && (
          <p className="cl-quote">
            Not a service. <em>A presence.</em>
            <span className="cl-quote-by">— Braino's design principle</span>
          </p>
        )}

        {chapter.id === 'why' && (
          <div className="cl-cta">
            <Link to="/" className="cl-cta-btn">Meet Braino →</Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Changelog() {
  return (
    <div className="cl-doc">
      {/* Hero */}
      <section className="cl-chapter cl-hero" data-theme="black">
        <div className="cl-inner">
          <div className="cl-hero-kicker">A living documentary</div>
          <h1 className="cl-hero-title">How SideBrain<br />became Braino</h1>
          <p className="cl-hero-sub">
            The real story of a browser assistant that grew a body, a heart, and a memory —
            told day by day, change by change.
          </p>
          <div className="cl-hero-mascot"><BrainSvg size={150} /></div>
          <div className="cl-scrollcue">Scroll ↓</div>
        </div>
      </section>

      {CHAPTERS.map((c) => <ChapterSection key={c.id} chapter={c} />)}
    </div>
  );
}
