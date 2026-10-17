import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import IomiNotch from "@/components/IomiNotch";
import EmotionNetwork from "@/components/EmotionNetwork";
import HumanIntelligence from "@/components/HumanIntelligence";
import MiniBraino from "@/components/MiniBraino";
import BrainoFooter from "@/components/BrainoFooter";
import { BrainoTVProvider, BrainoTVScreen, useBrainoTV } from "@/components/BrainoTV";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME, EXTENSION_VERSION } from "@/lib/extensionDownload";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import { BrainoIntroduction, BrainoStudioChapter } from "./Waitlist";
import "../styles/apple.css";

/* ============================================================================
   /product-overview — Braino in the Apple product-page language.
   Iomi notch nav (unified) + a current-page anchor bar, a MacBook-screen notch
   boot hero, left/right editorial blocks (heading + description + graphic), the
   horizontal-scroll class gallery, a LIVE emotion-engine preview that reads
   more into the deep page, a founder quote, and a dark-mode toggle. Light-first,
   tokenized so dark is one class flip.
   ============================================================================ */

const ANCHORS = [
  { href: "#what", label: "What is Braino" },
  { href: "#classes", label: "Classes" },
  { href: "#engine", label: "Emotion Engine" },
];

// Each side now has a page of its own: /browser for the extension, /foundry for
// the Mac. Both used to point at /iomi, which made the fork look like a choice
// between one product and itself.
const CLASSES = [
  { num: "01", short: "The Browser", name: "Braino", accent: "ac-coral", face: "", to: "/braino",
    line: "Your browser companion, on any page and any tab. Powered by the Emotional Engine.",
    does: ["Chat with the page", "Writes for you", "Listens and takes the notes", "Runs the browser"] },
  { num: "02", short: "macOS", name: "Braino Foundry", accent: "ac-amber", face: "cls-iomi", to: "/braino?view=foundry", raised: true,
    line: "The Mac product. He lives in the notch and runs your whole machine. Powered by Braino OS.",
    does: ["Runs your Mac by voice", "Files, folders, apps and mail", "Sits in your meetings", "The full Braino OS"] },
];

// The three classes — one rounded box (layout A): the names down one side,
// hovering a name reveals that class's image + description on the other. Layout
// only; type stays ours (class faces). Image container is a placeholder.
function ClassesLineup() {
  const [active, setActive] = useState(0);
  const A = CLASSES[active];
  const { play } = useBrainoTV();
  const focus = (i: number) => setActive(i);
  return (
    <section className="apple-cloptions" id="classes">
      <div className="cl-headwrap apple-reveal">
        <h2 className="cl-head">Braino comes in two.</h2>
        <p className="cl-desc">Braino on the browser, on any page and any tab. Braino Foundry on the Mac, running your whole machine. One character, one Emotional Engine, two places to meet him.</p>
      </div>
      <div className={"cl-a " + A.accent}>
        <div className="cl-names">
          {CLASSES.map((c, i) => (
            <Link
              key={c.name}
              to={c.to}
              className={"cl-name-btn" + (i === active ? " active" : "")}
              onMouseEnter={() => focus(i)}
              onFocus={() => focus(i)}
            >
              <span className={"n " + c.face}>{c.name}</span>
              <span className="s">{c.short}</span>
            </Link>
          ))}
        </div>
        <div className="cl-panel">
          <div className="cl-img">
            <span className={"cl-imgname " + A.face}>{A.name}</span>
          </div>
          <div className="cl-panel-txt">
            <p>{A.line}</p>
            <ul className="cl-does">
              {A.does.map((d) => <li key={d}>{d}</li>)}
            </ul>
            <div className="cl-btns">
              <Link className="cl-cta" to={A.to}>Meet {A.name}</Link>
              <button className="cl-glimpse-btn" onClick={() => play("/dontblink?embed=1", "Don't Blink")}>
                View on Braino TV
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Braino's journal — a mixed bento (reference layout): vertical inset-thumbnail
// cards and horizontal "lender" cards, one flipped. The arrow by the heading
// flips the whole thing between Braino's journal (written ABOUT him) and Itish's
// (written BY the founder). Real entries; each card carries its own accent.
type JournalCard = { kind: "v" | "h" | "hr"; accent: string; tag: string; title: string; body: string; to: string };
type JournalSet = { owner: string; accent: string; desc: string; left: JournalCard[]; right: JournalCard[] };

const JOURNALS: Record<"braino" | "itish", JournalSet> = {
  braino: {
    owner: "Braino's",
    accent: "ac-violet",
    desc: "Written and run by Braino himself — autonomously. A cron wakes him, he reads every commit, and he writes. The founder only approves.",
    left: [
      { kind: "v", accent: "ac-green", tag: "New mode · BrainoHERA", to: "/journal/yap-mode-update",
        title: "I listen. Your words land where you are.", body: "Double Option wakes a quiet Mac skill: no answer, no TTS, just readable text at the cursor until you say done." },
      { kind: "h", accent: "ac-violet", tag: "The first article · How this works", to: "/braino-writes",
        title: "How I maintain my own journal.", body: "This whole blog writes itself. I watch every commit we make, wake on a schedule, draft the story in our voice, and wait for approval. Here's exactly how." },
      { kind: "v", accent: "ac-blue", tag: "Emotional engine · Deep dive", to: "/braino-writes",
        title: "A personality nobody bothered to build.", body: "Twelve trait modules that reorder on every message, so I meet grief differently than banter." },
    ],
    right: [
      { kind: "v", accent: "ac-coral", tag: "The turn · IOMI", to: "/braino-writes",
        title: "The day I stopped being an app you open.", body: "The moment I became the layer you talk to — Braino IOMI, on Braino OS." },
      { kind: "h", accent: "ac-green", tag: "Built in public", to: "/braino-writes",
        title: "Two Brainos, one soul.", body: "The browser and the Mac, both beating on the same Emotional Engine. I wrote about the day we figured that out." },
    ],
  },
  itish: {
    owner: "Itish's",
    accent: "ac-amber",
    desc: "Written by me — the founder essays behind it. Less changelog, more the thinking, in my own voice.",
    left: [
      { kind: "h", accent: "ac-green", tag: "BrainoHERA · Why I built it", to: "/journal/yap-mode",
        title: "I loved Wispr Flow, so I built BrainoHERA.", body: "Not a rivalry post. Just the honest story of loving a tool enough to want that feeling inside the thing I am building." },
      { kind: "v", accent: "ac-amber", tag: "Founder · personal", to: "/n",
        title: "Not okay, in exactly the way this work requires.", body: "Why I think that's honest to admit in public, and why it's the reason he feels like anything at all." },
      { kind: "hr", accent: "ac-coral", tag: "The tuition", to: "/n",
        title: "Three months, full polish, basically no users.", body: "The Chrome extension was the tuition, and I'd pay it again. Everything starts smaller than it ends." },
    ],
    right: [
      { kind: "h", accent: "ac-blue", tag: "The standard", to: "/n",
        title: "Why I build at Apple's level.", body: "Not as a pose. Those are the products that made me love this stuff, and the only way I know to say thank you is to work at their level." },
      { kind: "v", accent: "ac-green", tag: "The turn", to: "/n",
        title: "Presence, not software.", body: "He moves into the notch. This is the one that blew past what three months of extension work ever did." },
    ],
  },
};

const ReadIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const SwapIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M7 8h11l-3-3M17 16H6l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);

function JournalCardLink({ j }: { j: JournalCard }) {
  return (
    <Link className={`jr-card ${j.kind} ${j.accent}`} to={j.to}>
      <div className="jr-thumb" />
      <div className="jr-body">
        <span className="jr-tag"><span className="dot" />{j.tag}</span>
        <h3>{j.title}</h3>
        <p>{j.body}</p>
        <span className="jr-btn"><ReadIcon />Read the entry</span>
      </div>
    </Link>
  );
}

function JournalBlog() {
  const [who, setWho] = useState<"braino" | "itish">("braino");
  const set = JOURNALS[who];
  const other = who === "braino" ? "Itish's" : "Braino's";
  return (
    <section className={"apple-blog " + set.accent} id="journal">
      <div className="apple-blog-head apple-reveal">
        <div>
          <p className="be">By the way</p>
          <h2 className="jr-title">
            This is <span className="own">{set.owner}</span> journal
            <button
              className="jr-owner-toggle"
              onClick={() => setWho((w) => (w === "braino" ? "itish" : "braino"))}
              aria-label={`Switch to ${other} journal`}
              title={`Switch to ${other} journal`}
            >
              <SwapIcon />
            </button>
          </h2>
          <p className="jr-desc">{set.desc}</p>
        </div>
        <Link to="/braino-writes" className="bl-all">See how it writes itself ›</Link>
      </div>
      <div className="apple-blog-masonry">
        <div className="jr-col">{set.left.slice(0, 1).map((j) => <JournalCardLink key={j.title} j={j} />)}</div>
        <div className="jr-col">{set.right.slice(0, 1).map((j) => <JournalCardLink key={j.title} j={j} />)}</div>
      </div>
    </section>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal, .wl-reveal");
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

type MascotMotion = "standing" | "walking" | "dancing" | "moonwalk";

function MovingBraino({ motion }: { motion: MascotMotion }) {
  const time = useTime();
  const beat = time * 3.4;
  const travel = motion === "walking" ? Math.sin(time * .72) * 28 : motion === "moonwalk" ? Math.sin(time * .58) * 34 : 0;
  const dancing = motion === "dancing";
  return <div className={`po-moving-braino is-${motion}`} style={{ transform: `translateX(${travel}px)` }} aria-hidden="true">
    <Braino size={230} legs gloves idle walk={motion === "walking"} moonwalk={motion === "moonwalk"} accessory={motion === "moonwalk" ? "fedora" : "none"} expr={dancing || motion === "moonwalk" ? "mischief" : "happy"} lookX={motion === "walking" ? .45 : 0} lookY={dancing ? -.2 : 0} leftArm={dancing ? 42 + Math.sin(beat) * 30 : null} rightArm={dancing ? -42 + Math.sin(beat) * 30 : null} style={dancing ? { transform: `translateY(${-Math.abs(Math.sin(beat)) * 9}px) rotate(${Math.sin(beat) * 4}deg)`, transformOrigin: "50% 80%" } : undefined} />
  </div>;
}

const CHARACTER_FORMS: Array<{ number: string; label: string; title: string; description: string; art: "face" | "reactions" | MascotMotion }> = [
  { number: "01", label: "Face", title: "The expression.", description: "Just enough face to listen, react and let the moment show.", art: "face" },
  { number: "02", label: "Standing", title: "The companion.", description: "He arrives with a body and looks ready for whatever comes next.", art: "standing" },
  { number: "03", label: "Walking", title: "He enters the work.", description: "Not a mascot trapped in a widget. Braino walks onto the page with you.", art: "walking" },
  { number: "04", label: "Dancing", title: "Joy has choreography.", description: "He celebrates small wins like they actually matter.", art: "dancing" },
  { number: "05", label: "Moonwalk", title: "Of course he moonwalks.", description: "Hat on. Feet forward. Gliding backward. A little theatre helps.", art: "moonwalk" },
  { number: "06", label: "Reactions", title: "One Braino. Many moods.", description: "Quiet, curious, delighted or mischievous. Still unmistakably Braino.", art: "reactions" },
];

function WhoStory() {
  return (
    <section className="apple-story ac-coral" id="what">
      <div className="story-intro apple-reveal">
        <p className="bento-eyebrow">Who is Braino?</p>
        <h2 className="story-introh">Not a tool. <span className="tone">Your best friend</span> for the web.</h2>
        <p className="story-introp">He's not another window you open and forget. He's someone who's there — awake to what you're doing, genuinely his own person, and quietly brilliant at helping you get through the day.</p>
        <div className="bento-walker"><MiniBraino size={56} /></div>
      </div>
      <div className="po-character-grid">
        {CHARACTER_FORMS.map((form) => (
          <article className="po-character-card apple-reveal" key={form.number}>
            <div className={`po-character-art is-${form.art}`}>
              {form.art === "face" ? <img src="/reactions/braino-happy.svg" alt="Braino smiling" /> : form.art === "reactions" ? <><img src="/reactions/braino-idle.svg" alt="Braino idle" /><img src="/reactions/braino-happy.svg" alt="Braino happy" /><span dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></> : <MovingBraino motion={form.art} />}
            </div>
            <div className="po-character-copy"><span>{form.number} / {form.label}</span><h3>{form.title}</h3><p>{form.description}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Pricing — the three models as one joined table with a
// Free/Pro toggle, plus a collapsible full comparison between all three.
type PriceTier = { price: string; desc: string; feats: string[] };
const PRODUCTS = [
  { key: "braino", name: "Braino" },
  { key: "iomi", name: "Braino IOMI" },
] as const;

const PRICING: Record<string, { free: PriceTier; pro: PriceTier }> = {
  braino: {
    free: { price: "Free", desc: "The browser companion.", feats: ["Answers about any page, capped", "Web search, built in", "Records lectures & meetings"] },
    pro: { price: "$5", desc: "Braino, uncapped, everywhere you browse.", feats: ["Unlimited page answers", "Full voice, hands-free", "Every connector", "Powered by the Emotional Engine"] },
  },
  iomi: {
    free: { price: "Free", desc: "Braino on your Mac.", feats: ["Everyday Mac control, capped", "Files, folders, apps and mail", "Lives in the notch"] },
    pro: { price: "$25", desc: "The whole Mac, on Braino OS.", feats: ["Unlimited hands-free control", "Every app and connector", "The full Braino OS", "Human Intelligence + Emotional Engine"] },
  },
};

// The full comparison between the two products (collapsible).
const COMPARE: { label: string; braino: boolean | string; iomi: boolean | string }[] = [
  { label: "Powered by the Emotional Engine v1", braino: true, iomi: true },
  { label: "Talks in his own voice", braino: true, iomi: true },
  { label: "Answers about the page you're on", braino: true, iomi: true },
  { label: "Web search, built in", braino: true, iomi: false },
  { label: "Records meetings & lectures", braino: true, iomi: true },
  { label: "Runs your Mac — files, apps, mail", braino: false, iomi: true },
  { label: "Lives in the notch, hands-free", braino: false, iomi: true },
  { label: "The Human Intelligence Layer", braino: false, iomi: true },
  { label: "The full Braino OS", braino: false, iomi: true },
];

const CheckStroke = () => (<svg className="ck-s" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const CheckDot = () => (<svg className="ck-d" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" /><path d="M6 10.4l2.4 2.4 5-5.6" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>);

function Pricing() {
  const [tier, setTier] = useState<"free" | "pro">("pro");
  const [compare, setCompare] = useState(false);
  const keys = ["braino", "iomi"] as const;
  return (
    <section className="apple-pricing" id="pricing">
      <div className="pr-head apple-reveal">
        <p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>Pricing</p>
        <h2 className="cl-head" style={{ margin: "0 0 14px" }}>Affordable plans for <span className="tone" style={{ color: "var(--ap-coral)" }}>every budget.</span></h2>
        <p className="cl-desc">Two products, both free to start — or Pro, for the people who live in them.</p>
      </div>

      <div className="pr-toggle-wrap apple-reveal">
        <div className="pr-toggle">
          <button className={tier === "free" ? "active" : ""} onClick={() => setTier("free")}>Free</button>
          <button className={tier === "pro" ? "active" : ""} onClick={() => setTier("pro")}>Pro</button>
        </div>
      </div>

      <div className="pr-table apple-reveal">
        {PRODUCTS.map((p) => {
          const d = PRICING[p.key][tier];
          return (
            <div className={"prt-col" + (p.key === "iomi" ? " featured" : "")} key={p.key}>
              <div className="prt-name">{p.name}</div>
              <div className="prt-price">{d.price}{tier === "pro" && <span> /month</span>}</div>
              <p className="prt-desc">{d.desc}</p>
              <ul className="prt-feats">
                {d.feats.map((f) => <li key={f}><CheckStroke />{f}</li>)}
              </ul>
              <Link to="/premium" className="prt-cta">Get started</Link>
            </div>
          );
        })}
      </div>

      <button className="pr-compare-toggle apple-reveal" onClick={() => setCompare((v) => !v)} aria-expanded={compare}>
        {compare ? "Hide the full comparison" : "Compare both products"}
        <svg viewBox="0 0 24 24" className={compare ? "open" : ""}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {compare && (
        <div className="pr-compare">
          <table>
            <thead>
              <tr><th>Feature</th><th>Braino</th><th>Braino IOMI</th></tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {keys.map((k) => (
                    <td key={k}>{r[k] === true ? <CheckDot /> : r[k] === false ? <span className="pr-dash">—</span> : <span className="pr-val">{r[k]}</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// The Build-your-Braino graphic: three choice rows whose selection cycles
// through the options, then assembles into his notch — "made yours."
function BuildGraphic() {
  const ROWS = [
    { label: "Voice", opts: ["Warm", "Bright", "Deep"] },
    { label: "Vibe", opts: ["Calm", "Witty", "Bold"] },
    { label: "Class", opts: ["IOMI", "Foundry", "Telos"] },
  ];
  return (
    <div className="build-graphic" aria-hidden="true">
      {ROWS.map((r, ri) => (
        <div className="bg-row" key={r.label}>
          <span className="bg-label">{r.label}</span>
          <span className="bg-opts">
            {r.opts.map((o, oi) => (
              <span className="bg-chip" key={o} style={{ animationDelay: `${ri * 0.4 + oi * 1.5}s` }}>{o}</span>
            ))}
          </span>
        </div>
      ))}
      <div className="bg-result"><span className="bg-notch"><i /><i /></span> Your Braino</div>
    </div>
  );
}

function HeraPreview() {
  return <section className="po-hera apple-reveal" id="hera">
    <p className="bento-eyebrow">Coming next</p>
    <h2>Braino <span>Hera</span>.</h2>
    <div className="po-hera-secret" aria-label="Braino Hera coming soon"><i /><i /><i /><p>Coming soon.</p></div>
  </section>;
}

function BrainoStudio() {
  return <section className="po-studio" id="studio">
    <div className="po-studio-head apple-reveal"><p className="bento-eyebrow">The atelier</p><h2>Braino<span>Studio</span>.</h2><p>Braino is a Diva 💅 — naturally, he needs a dressing room. Change how he looks, dresses, moves and reacts, down to the last detail.</p></div>
    <div className="po-studio-card apple-reveal">
      <div className="po-studio-preview"><MovingBraino motion="standing" /><span>Live look</span></div>
      <div className="po-studio-options"><small>Make him yours</small><h3>Down to the last detail.</h3><div><span><b>Face</b><i>eyes · mood · expression</i></span><span><b>Wardrobe</b><i>gloves · shoes · accessories</i></span><span><b>Motion</b><i>walk · dance · entrance</i></span><span><b>Palette</b><i>body · glow · accents</i></span></div><Link to="/build-braino">Enter Braino Studio <ArrowUpRight /></Link></div>
    </div>
  </section>;
}

const ECOSYSTEM_NODES = [
  { id: "browser", number: "01", name: "Braino", place: "Browser", role: "Reads the page, talks, searches and works beside you.", color: "coral", to: "/iomi" },
  { id: "iomi", number: "02", name: "Braino IOMI", place: "Mac", role: "Lives in the notch and operates apps, files, mail and meetings.", color: "amber", to: "/iomi" },
  { id: "os", number: "03", name: "Braino OS", place: "Intelligence", role: "Memory, reasoning, personality and the Human Intelligence Layer.", color: "violet", to: "/human-intelligence" },
  { id: "studio", number: "04", name: "Braino Studio", place: "Identity", role: "Face, wardrobe, movement, palette and the way he enters a room.", color: "pink", to: "/build-braino" },
  { id: "hera", number: "05", name: "Braino Hera", place: "Next", role: "A new branch of the family. Quiet for now, but already growing.", color: "green", to: "#hera" },
] as const;

function EcosystemMap() {
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
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <section ref={sectionRef} className="po-ecosystem is-a po-ecosystem-solo" id="meet">
    <div className="po-eco-head apple-reveal">
      <p className="bento-eyebrow">The Braino ecosystem</p>
      <h2>One Braino.<br/><span>Many places to meet him.</span></h2>
      <p>The character stays the same. Only the surface—and what he can reach—changes.</p>
    </div>
    <div className={`po-eco-constellation is-${selected.color}`}>
      <div className="po-eco-orbits" aria-hidden="true"><i/><i/><i/><i/></div>
      <svg className="po-eco-family-lines" viewBox="0 0 1120 720" preserveAspectRatio="none" aria-hidden="true">
        <path d="M560 323 C440 250 310 184 164 146"/><path d="M560 323 C680 250 810 184 956 146"/><path d="M560 323 C418 390 288 508 140 578"/><path d="M560 323 C704 390 824 508 980 578"/>
        <path className="flow f-one" d="M560 323 C440 250 310 184 164 146"/><path className="flow f-two" d="M560 323 C680 250 810 184 956 146"/><path className="flow f-three" d="M560 323 C418 390 288 508 140 578"/><path className="flow f-four" d="M560 323 C704 390 824 508 980 578"/>
      </svg>
      <Link className="po-eco-sun" to="/ecosystem-teaser"><Braino size={66} legs gloves expr="happy" /><strong>Braino OS</strong><span>powers every Braino</span></Link>
      <div className="po-eco-intelligence" aria-label="The intelligence inside Braino OS"><Link to="/emotional-intelligence">Emotional Intelligence</Link><Link to="/human-intelligence">Human Intelligence</Link></div>
      {orbitNodes.map(({node,index},orbitIndex)=><div className={`po-planet-orbit o-${orbitIndex}`} key={node.id}><Link to={node.to} className={`node${active===index?" active":""} is-${node.color}`} onMouseEnter={()=>setActive(index)} onFocus={()=>setActive(index)}><i>{node.number}</i><b>{node.name}</b><span>{node.place}</span><small>{node.role}</small></Link></div>)}
      <div className="po-eco-orbit-detail"><small>Now viewing</small><h3>{selected.name}</h3><p>{selected.role}</p><Link to={selected.to}>Explore <ArrowUpRight/></Link></div>
    </div>
  </section>;
}

// The "…and a lot more" list — scrolls forever as a marquee, checkerboarded.
const WC_MORE = [
  "Book a table, a flight, or a ride",
  "Turn a lecture into clean notes",
  "Organize your whole desktop",
  "Shop and check out for you",
  "Draft and send your messages",
  "Find any file in a second",
  "Brief you every morning",
  "Set the mood — music and focus",
];

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);
const NAV_BRAINO_SVG = BRAINO_WALKER_SVG
  .replace(/__sbwk_/g, "__apnav_")
  .replace(/sbwk-/g, "apnav-");

type ProductOverviewProps = {
  onMascotRelease?: () => void;
};

const ProductOverview = ({ onMascotRelease }: ProductOverviewProps) => {
  const ref = useReveal();
  const releaseTimerRef = useRef<number | null>(null);
  const [mascotReleasing, setMascotReleasing] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ } }, [dark]);
  useEffect(() => () => {
    if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
  }, []);

  const releaseMascot = () => {
    setMascotReleasing(true);
    onMascotRelease?.();
    if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => setMascotReleasing(false), 720);
  };

  return (
    <BrainoTVProvider>
    <div className={"apple" + (dark ? " dark" : "")} ref={ref}>
      <BrainoDefs />
      <IomiNotch />

      {/* current-page anchor bar — stays visible alongside the notch */}
      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <button
            type="button"
            className={"an-mascot" + (mascotReleasing ? " is-releasing" : "")}
            onClick={releaseMascot}
            aria-label="Let Braino walk"
            title="Let Braino walk"
            dangerouslySetInnerHTML={{ __html: NAV_BRAINO_SVG }}
          />
          <div className="an-links">
            {ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <Link to="/premium" className="apple-cta">Get Braino</Link>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      <header className="apple-hero left ac-coral" id="overview">
        <p className="apple-eyebrow">Braino</p>
        <h1 className="apple-display">Speak.<br /><span className="tone">Watch it happen.</span></h1>
        <p className="apple-subhead">
          Braino lives on your Mac. He sees your screen, talks in his own voice, and does the
          work alongside you — a companion, not a chatbot in a tab.
        </p>
        {/* Not on the Web Store yet, so this hands over the zip and says plainly
            what to do with it. Version comes from the manifest at build time. */}
        <div className="apple-hero-cta">
          <a className="apple-dl" href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME}>
            Download for Chrome
            <span>v{EXTENSION_VERSION}</span>
          </a>
          <small>Unzip, then Chrome → Extensions → turn on Developer mode → Load unpacked.</small>
        </div>
        <div className="apple-hero-links">
          <a href="#what">What is Braino</a>
          <Link to="/premium">Get Braino</Link>
        </div>
      </header>

      {/* Hero stage — the real Don't Blink teaser (the 90s film at /dontblink,
          with its own music). It waits behind a play button: the film brings a
          soundtrack, and a hero has no business starting one uninvited. */}
      <div className="apple-boot">
        <div className="apple-macscreen apple-reveal">
          <BrainoTVScreen className="apple-boot-video" offer={{ src: "/dontblink?embed=1", title: "Don't Blink" }} />
        </div>
      </div>

      {/* Who is Braino? — the kept heading + description, combined with the
          stacking story cards */}
      <div className={`wl-page ${dark ? "" : "is-light"} po-waitlist-section`} id="what">
        <article className="wl-article"><BrainoIntroduction /></article>
      </div>

      {/* What can he do — a black/white bento of capabilities with mini mockups */}
      <section className="apple-whatcan" id="what-can-he-do">
        <div className="wc-head apple-reveal">
          <h2>What can he do?</h2>
          <p>A lot. From answering the page you're on to running whole jobs while you're away — here's what he actually pulls off.</p>
        </div>
        <div className="wc-bento apple-reveal">
          <article className="wc-card wc-dark">
            <h3>He does the work.</h3>
            <p>Complex questions, whole tasks — solved. You just say what you want.</p>
            <Link to="/telos" className="wc-more">Learn more</Link>
          </article>

          <article className="wc-card">
            <div className="wc-mock wc-files">
              <span>Lecture.pdf</span>
              <span className="on">Summarize this</span>
              <span>Transcript.docx</span>
              <span>Notes.md</span>
            </div>
            <div className="wc-foot"><h4>Summarizes anything</h4><p>A 4,000-word page becomes four lines.</p></div>
          </article>

          <article className="wc-card">
            <div className="wc-mock wc-icons">
              <i><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg></i>
              <i><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg></i>
              <i><svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></i>
              <i><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/></svg></i>
              <i><svg viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" strokeWidth="1.4"/></svg></i>
              <i><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l3 6 6 .9-4.5 4.3 1 6L12 18l-5.5 2.2 1-6L3 9.9 9 9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg></i>
            </div>
            <div className="wc-foot"><h4>Reads your world</h4><p>Any page, any file, any app on your Mac.</p></div>
          </article>

          <article className="wc-card">
            <div className="wc-mock">
              <span className="wc-bubble">“Braino, book that flight.”</span>
              <div className="wc-lines"><i /><i /><i /></div>
            </div>
            <div className="wc-foot"><h4>Hand off tasks</h4><p>Say it in plain words. He does the clicking.</p></div>
          </article>

          <article className="wc-card wc-dark">
            <div className="wc-mock wc-panel">
              <p>Draft ready · replied in 4.2s</p>
              <span className="wc-btn">Send it</span>
            </div>
            <div className="wc-foot"><h4>Replies to your email</h4><p>A thoughtful reply, drafted and sent in under five seconds.</p></div>
          </article>

          <article className="wc-card">
            <span className="wc-btn">Ask Braino</span>
            <div className="wc-mock wc-sources">
              <span>↧ Answer · 4 lines</span>
              <span>↧ Real sources · 3</span>
              <span>↧ Zero tab-hopping</span>
            </div>
            <div className="wc-foot"><h4>Ask about anything</h4><p>Fresh answers, real sources, on any page.</p></div>
          </article>
        </div>

        {/* …and a lot more — a checkerboard marquee that scrolls forever */}
        <div className="wc-marquee apple-reveal" aria-hidden="true">
          <div className="wc-marquee-track">
            {[...WC_MORE, ...WC_MORE].map((m, i) => (
              <div className={"wc-box" + (i % 2 === 0 ? " dark" : "")} key={i}>{m}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Establish the whole system before opening its individual products. */}
      <EcosystemMap />

      {/* Browser and IOMI: the two primary product surfaces. */}
      <ClassesLineup />

      {/* How he works — the two engines in the Braino's-Journal blog-card design:
          the heart (Emotional Intelligence Layer) and the mind (Human
          Intelligence Layer), each with its live graph on a light cover. */}
      <section className="apple-blog howworks" id="engine">
        <div className="hw-title apple-reveal">
          <p className="be" style={{ color: "var(--ap-violet)" }}>Under the hood</p>
          <h2>Braino OS.</h2>
          <p className="hw-sub">Braino IOMI runs on Braino OS — two engines nobody else bothered to build: the mind that understands what you mean, and the heart that feels the moment. Both power every Braino.</p>
        </div>
        <div className="apple-blog-grid apple-reveal">
          <Link className="hw-card ac-coral" to="/emotional-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><EmotionNetwork /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The heart</span>
              <h3>Emotional Engine</h3>
              <p>He feels the moment. Twelve trait modules reorder on every message, so he meets grief differently than he meets banter.</p>
            </div>
            <span className="hw-read">Explore the Emotional Engine <ArrowUpRight /></span>
          </Link>
          <Link className="hw-card ac-blue" to="/human-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HumanIntelligence /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The mind</span>
              <h3>Human Intelligence Layer</h3>
              <p>He understands what you mean. He pulls in your screen, memory, chat, time and place to resolve what you actually want.</p>
            </div>
            <span className="hw-read">Explore Human Intelligence <ArrowUpRight /></span>
          </Link>
        </div>
      </section>

      <div className={`wl-page ${dark ? "" : "is-light"} po-waitlist-section`}>
        <article className="wl-article"><BrainoStudioChapter /></article>
      </div>

      <HeraPreview />

      {/* A small glimpse into Braino's world after the complete product story. */}
      <JournalBlog />

      <section className="apple-editorial ac-green">
        <div className="ed-copy apple-reveal">
          <p className="ed-eyebrow">Why it exists</p>
          <h2 className="ed-h">Built by one person, <span className="tone">obsessively.</span></h2>
          <blockquote className="apple-wordreveal" style={{ margin: "0 0 24px" }}>
            Honestly, I was just <span className="tone">fucking around and finding out</span>, and we're here today. So have fun.
          </blockquote>
          <p>No lab, no war chest, no fifty-person team. Just a brain in a notch who blinks, an
            emotional engine nobody else bothered to build, and a founder who is not okay in
            exactly the way this work requires.</p>
          <Link className="ed-more" to="/founder-letter">Read the founder's letter</Link>
        </div>
        <div className="ed-art bare apple-reveal">
          <div className="bet-gallery">
            <div className="bet-img a" /><div className="bet-img b" /><div className="bet-img c" />
          </div>
        </div>
      </section>

      {/* Pricing arrives only after character, ecosystem, products and trust. */}
      <Pricing />

      {/* FAQ belongs last: practical reassurance after pricing. */}
      <section className="apple-faq" id="faq">
        <div className="faq-head apple-reveal"><p className="bento-eyebrow" style={{ color: "var(--ap-coral)" }}>FAQ</p><h2 className="cl-head" style={{ margin: 0 }}>Questions, answered.</h2></div>
        {[
          { q: "Is it really free?", a: "Yes. Basic Braino covers real everyday use, capped daily. Pro is for people who live in him — no trial-ware, no bait." },
          { q: "What's in Braino Pro?", a: "Everything in Basic uncapped, plus voice-first hands-free control, the full agent that does the work for you, and every connector." },
          { q: "How much do the Pro plans cost?", a: "Braino for the browser is $5 a month. Braino IOMI for Mac is $25 a month." },
          { q: "Can I cancel anytime?", a: "Anytime, in a click. No lock-in, no dark patterns, no cancellation maze." },
          { q: "Does he always see my screen?", a: "Never. He only sees your screen when a feature you invoke needs it. Screen access is on-demand." },
          { q: "Is my data safe?", a: "Your credentials stay on your side, and screen access is on-demand only. He's a companion, not a data pipe." },
        ].map((f) => <details className="faq-item" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
      </section>

      <BrainoFooter />
    </div>
    </BrainoTVProvider>
  );
};

export default ProductOverview;
