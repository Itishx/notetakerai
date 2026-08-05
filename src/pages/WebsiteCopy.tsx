import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/apple.css";
import "./website-copy.css";

/* ============================================================================
   /website-copy — a design-strategy document, me to you.
   Not a marketing page. Every public page of the site gets a card: its mood,
   the idea, copy directions in bullets, and a moodboard of what to steal from.
   You read, you react ("kill that / more of this / remix"), then we build.
   Rendered in the real Apple system so the doc looks like the thing it plans.
   ============================================================================ */

/* ── Apple's design DNA, distilled — the rules every page below obeys ── */
const DNA: { title: string; body: string; steal: string }[] = [
  {
    title: "Deference",
    body: "The interface gets out of the way so the thing itself is the hero. No chrome competing with content. Confidence is shown by how much you're willing to leave empty.",
    steal: "Whitespace is not wasted space — it's the product saying 'I don't need to shout.'",
  },
  {
    title: "One idea per screen",
    body: "Full-bleed tiles butt against each other with zero gap, each making exactly one claim with one image. Because a tile fills the viewport and reveals on scroll, you physically can't see two ideas at once — the layout forces single-focus. The scroll itself is the reveal: anticipation, then payoff, panel after panel.",
    steal: "If a section is arguing two things, it's two sections. Let the scroll be the reveal.",
  },
  {
    title: "Weight discipline",
    body: "Apple's type ladder jumps 400 → 600 and skips medium entirely — a clean two-state hierarchy, calm vs. emphatic, no muddy middle. Big type caps at semibold; 700 is reserved for the largest poster headlines. And tracking tightens as size grows (negative, ~-0.022em on hero) so the letters fuse into one crafted mass.",
    steal: "Cap big type at 600, pull the tracking negative. That restraint is 80% of what reads as 'Apple.'",
  },
  {
    title: "Headline + subhead formula",
    body: "A short, benefit-led claim in huge type, then one calm line of specifics beneath it. Emotion up top, precision underneath. The claim makes you feel; the subhead makes you believe.",
    steal: "Every hero is two lines: the feeling, then the fact.",
  },
  {
    title: "Colour as accent, not paint",
    body: "The page is near-white (#fbfbfd) or cinematic black. One saturated colour per feature, used on a keyword and its graphic — never wall-to-wall. Colour marks meaning.",
    steal: "One accent per section. The moment everything's coloured, nothing is.",
  },
  {
    title: "Motion serves comprehension",
    body: "Scroll-scrubbed sequences, pinned reveals, parallax — but always to explain, never to decorate. Motion shows how a thing works; it earns its place by teaching.",
    steal: "If the animation doesn't clarify, cut it.",
  },
  {
    title: "Emotion, then proof, then spec, then decision",
    body: "The page arc: make me feel it → show it's real → give me the numbers → tell me which one is mine. Feature pages end on 'which one is right for you.'",
    steal: "Sequence the page like a conversation that closes.",
  },
  {
    title: "Confident understatement",
    body: "Short declarative sentences. Present tense. 'The most advanced…' No jargon in the headline, then real precision in the fine print. It never tries to sound clever.",
    steal: "Say the big thing plainly. Cleverness reads as insecurity.",
  },
];

/* ── The pages ── */
type PageDoc = {
  route: string;
  name: string;
  status: "live" | "todo" | "draft";
  mood: string;               // one-line vibe (supports <tone> via marker)
  idea: string;               // the concept
  copy: { t: string }[];      // copy directions
  moodboard: string[];        // reference inspirations
  faceClass?: string;         // optional class name face (cls-saburi etc.)
};

type Category = { key: string; accent: string; eyebrow: string; title: string; blurb: string; pages: PageDoc[] };

const CATEGORIES: Category[] = [
  {
    key: "front-door", accent: "ac-coral", eyebrow: "01 — First contact",
    title: "The Front Door",
    blurb: "The two pages that decide whether someone stays. They don't explain features. They land a feeling: this isn't an app, it's a someone.",
    pages: [
      {
        route: "/", name: "Home", status: "live",
        mood: "You don't arrive at a product. You <tone>meet him.</tone>",
        idea: "First frame is almost empty — just his eyes in the notch. Click to wake him. The whole homepage is the moment of introduction, not a feature list. Everything else is one scroll deeper.",
        copy: [
          { t: "Hero: <say>Not an app. A someone.</say> — subhead: <em>Braino lives on your screen, sees what you see, and actually helps.</em>" },
          { t: "Second line option: <say>Every other AI waits in a tab. Braino's already here.</say>" },
          { t: "One CTA, calm: <say>Meet Braino</say> — never 'Sign up free.'" },
          { t: "Below the fold: the three classes as one line — <say>He comes in three: Saburi, Iomi, Telos.</say>" },
        ],
        moodboard: ["apple.com/vision-pro hero (product-is-the-hero)", "openai.com landing restraint", "Rabbit R1 'a companion' framing", "Don't Blink teaser as the emotional key"],
      },
      {
        route: "/product-overview", name: "Product Overview", status: "live",
        mood: "The <tone>flagship.</tone> The one page that says everything, in order.",
        idea: "The reference build. Notch boot-up hero → why it exists → what it is → the bet → the three classes (horizontal scroll) → the emotion engine as a beating heart → spec row. This is where the design language is proven; every other page borrows from it.",
        copy: [
          { t: "Keep the arc: feel it (boot hero) → why (founder quote, word-stomp) → what → the classes → the engine." },
          { t: "Spec row keywords: <say>Sees your screen. Feels the moment. Does the work.</say>" },
          { t: "Closing statement before footer: <say>One person built this, obsessively. You'll feel it.</say>" },
        ],
        moodboard: ["apple.com/iphone-16-pro full-page scroll", "Anatomy of an Apple product page top-to-bottom", "the iMac colour-panel rhythm"],
      },
    ],
  },
  {
    key: "classes", accent: "ac-blue", eyebrow: "02 — The line-up",
    title: "The Three Classes",
    blurb: "Saburi, Iomi, Telos. Not tiers of one product — three personalities of the same soul. Each page is a full editorial article with its own face, its own colour, its own tempo. Think OpenAI blog long-form, not a pricing row.",
    pages: [
      {
        route: "/saburi", name: "Saburi", status: "todo", faceClass: "cls-saburi",
        mood: "The <tone>patient one.</tone> Depth over speed. He sits with you.",
        idea: "Long-form article with a sticky left table-of-contents (OpenAI research-post style). This is also where the full emotion-engine deep-dive lives — the beating heart, the twelve traits, how a moment routes to the leading ones. Warm, unhurried, coral.",
        copy: [
          { t: "Devanagari-flavoured face for the name (Yatra One). Eyebrow: <say>The patient class.</say>" },
          { t: "Opening: <say>Some questions don't want a fast answer. They want someone who stays.</say>" },
          { t: "Section headings: <em>How he feels · The twelve traits · What a moment does to him · Why patience is a feature.</em>" },
          { t: "Embed the live heart. Caption pattern: <say>You say 'I don't know if I can do this' — he feels grief, and answers from there.</say>" },
        ],
        moodboard: ["OpenAI GPT-5.5 research post (sticky TOC + long flow)", "Stripe docs typography calm", "a warm coral editorial ground", "Indian-classical restraint"],
      },
      {
        route: "/iomi", name: "Iomi", status: "todo", faceClass: "cls-iomi",
        mood: "The <tone>bright one.</tone> Fast, golden, always-on presence.",
        idea: "The notch-native everyday companion — the golden shimmer identity from the last seconds of Don't Blink. Speed and delight. Shorter, punchier sections than Saburi; lots of motion; the notch itself is the star graphic.",
        copy: [
          { t: "Keep the golden shimmer face (SF Pro). Eyebrow: <say>The everyday class.</say>" },
          { t: "Opening: <say>Always there. Never in the way. A tap of the Control key and he's listening.</say>" },
          { t: "Feature beats: <em>Lives in the notch · Sees the page · One key to talk · Gone the second you don't need him.</em>" },
          { t: "Closing: <say>The one you'll actually use every day.</say>" },
        ],
        moodboard: ["Dynamic Island choreography", "Apple Intelligence glow language", "Arc browser delight", "the golden Don't Blink final frame"],
      },
      {
        route: "/telos", name: "Telos", status: "todo", faceClass: "cls-telos",
        mood: "The <tone>agent.</tone> Give it a goal. It goes and does it.",
        idea: "The autonomous one — robotic Tesla-font identity, electric blue, HUD energy. Four modes (to be defined with you). This page should feel like a spec sheet for a machine that acts: less warmth, more capability. Benchmark-style charts fit here.",
        copy: [
          { t: "Orbitron uppercase face. Eyebrow: <say>THE AGENT CLASS.</say>" },
          { t: "Opening: <say>You don't chat with Telos. You point it at a goal.</say>" },
          { t: "Placeholder for the four modes — <em>need the four from you.</em> Frame each as a verb: Research · Execute · Watch · Deliver (draft)." },
          { t: "Proof: a real delegated task, start to finish, as a scrubbed scroll sequence." },
        ],
        moodboard: ["Tesla design language (mono, technical)", "Linear's precision", "a Jarvis HUD", "benchmark bars like a model card"],
      },
    ],
  },
  {
    key: "soul", accent: "ac-violet", eyebrow: "03 — Why he exists",
    title: "The Soul",
    blurb: "The pages that aren't selling anything — they're the reason the thing is worth trusting. Founder voice, honest, a little raw. Big SF Pro statements on white, word-by-word reveals, no stock imagery. This is where people fall for it.",
    pages: [
      {
        route: "/n", name: "Founder Letter", status: "live",
        mood: "One person, <tone>talking straight to you.</tone>",
        idea: "The letter that made you want a 'Why it exists' section everywhere. Keep it text-first: huge quote-style statements, word-stomp reveals, the founder's actual voice. No graphics that aren't earned.",
        copy: [
          { t: "Open on the real reason: <say>I didn't want another chatbot in a tab. I wanted someone who's actually there.</say>" },
          { t: "Word-stomp the turns — the emotional lines slam in one word at a time." },
          { t: "Sign it. A real name, a real date. The intimacy is the point." },
        ],
        moodboard: ["Paul Graham essay plainness", "Basecamp/37signals manifestos", "a handwritten-letter intimacy in SF Pro", "the Don't Blink stamp for the key lines"],
      },
      {
        route: "/straight-talk", name: "Straight Talk", status: "live",
        mood: "The <tone>no-spin</tone> page. What it is, what it isn't.",
        idea: "Anti-marketing. Bullet honesty about limits, pricing, what it can't do yet. Builds more trust than any feature list. Plain type, tight, almost a README voice.",
        copy: [
          { t: "Headline: <say>The honest version.</say>" },
          { t: "Two columns: <em>What Braino does today</em> · <em>What it doesn't (yet).</em>" },
          { t: "On money: <say>Free covers real use. Pro is for people who live in it. No dark patterns.</say>" },
        ],
        moodboard: ["Basecamp pricing honesty", "a plaintext README", "Patagonia 'don't buy this' candor"],
      },
      {
        route: "/why-the-wait", name: "Why the Wait", status: "live",
        mood: "Turning a delay into a <tone>reason to trust.</tone>",
        idea: "If there's a waitlist or slow rollout, this reframes it: built by one person, refusing to ship junk. Make the constraint the credibility.",
        copy: [
          { t: "Headline: <say>Good things, one person, no shortcuts.</say>" },
          { t: "A timeline graphic — real commits, real dates (the dev pulse)." },
          { t: "Close: <say>You're not waiting on a queue. You're waiting on care.</say>" },
        ],
        moodboard: ["dev-pulse / commit-graph as art", "a build-in-public timeline", "GitHub contribution grid"],
      },
      {
        route: "/journal", name: "Journal", status: "live",
        mood: "The <tone>build-in-public</tone> diary.",
        idea: "Ongoing dated entries — what changed, what broke, what he learned. Blog index feel; each entry an editorial post. This is where the emotion-engine writeups and dev notes live.",
        copy: [
          { t: "Index: date · title · one-line hook, newest first." },
          { t: "Voice: first-person builder, not press release." },
          { t: "Cross-link entries into the class pages when they go deep." },
        ],
        moodboard: ["OpenAI blog index", "Ghost/Substack clean reading", "a lab notebook"],
      },
    ],
  },
  {
    key: "proof", accent: "ac-green", eyebrow: "04 — Show, don't tell",
    title: "Proof It Works",
    blurb: "Feelings get people to the middle of the page. Proof gets them to install. Real tasks, real logs, real skills — shown live wherever possible. Green, energetic, concrete.",
    pages: [
      {
        route: "/use-cases", name: "Use Cases", status: "live",
        mood: "<tone>Watch him actually do it.</tone>",
        idea: "Not a grid of icons — a set of real scenarios shown as short scrubbed sequences. Each is a job-to-be-done: 'buy that book', 'summarise this lecture', 'clean my inbox.' One scenario per screen.",
        copy: [
          { t: "Frame each as the user's words: <say>'Braino, book me a table for two.'</say> then show it happen." },
          { t: "Group by surface: on any page · in your inbox · while you study · when you shop." },
          { t: "End each with the outcome, not the feature: <say>Done. You didn't touch the keyboard.</say>" },
        ],
        moodboard: ["Apple 'Shot on iPhone' concreteness", "Superhuman use-case reels", "Rewind.ai demos"],
      },
      {
        route: "/live", name: "Live", status: "live",
        mood: "The <tone>heartbeat.</tone> He's doing things right now.",
        idea: "A live dashboard — real activity, real posts (@brainosays), a running log. Proof of life. Could pull the dev pulse + X feed. Keep it a little raw and real-time; that's the charm.",
        copy: [
          { t: "Header: <say>Braino, live.</say> — subhead: <em>What he's doing, saying, and shipping, right now.</em>" },
          { t: "A live log stream (you asked about this — yes, put it here as the centrepiece)." },
          { t: "Ticker of latest commits + latest posts." },
        ],
        moodboard: ["a status page (statuspage.io calm)", "a live-ops dashboard", "an X profile embedded", "trading-terminal energy, softened"],
      },
      {
        route: "/skills", name: "Skills", status: "live",
        mood: "The <tone>growing list</tone> of things he can do.",
        idea: "A tracker of every skill — shipped, in progress, planned. Reads like a capability map. Searchable, grouped. Shows momentum: the list keeps getting longer.",
        copy: [
          { t: "Headline: <say>Everything Braino knows how to do.</say> — subhead: <em>And everything he's learning next.</em>" },
          { t: "Status chips: shipped · learning · planned." },
          { t: "Group: browsing · shopping · comms · media · study · system." },
        ],
        moodboard: ["Linear roadmap", "a Pokédex completeness", "Raycast store grid"],
      },
      {
        route: "/playground", name: "Playground", status: "live",
        mood: "<tone>Try him without installing.</tone>",
        idea: "An in-browser sandbox — talk to Braino on the page itself. Lowest-friction proof. Should feel like a toy you can't put down.",
        copy: [
          { t: "Headline: <say>Say something. See what he does.</say>" },
          { t: "Pre-loaded prompts as chips to lower the blank-box fear." },
          { t: "After a few turns: <say>Like this? He does it everywhere.</say> → install." },
        ],
        moodboard: ["OpenAI Playground", "a friendly REPL", "Teenage Engineering toy-ness"],
      },
      {
        route: "/build-braino", name: "Build Your Braino", status: "live",
        mood: "<tone>Make him yours.</tone>",
        idea: "Configure the persona/voice/skills before you even install — a build-a-companion flow. Interactive, playful, and it sets up the paid story (voices, personas).",
        copy: [
          { t: "Headline: <say>Pick a voice. Pick a vibe. Meet your Braino.</say>" },
          { t: "Live preview reacts as you choose — persona, voice, class." },
          { t: "Ties to voice personas (Trump/etc.) and Fish voice as the payoff." },
        ],
        moodboard: ["Memoji builder", "Tesla configurator", "a character-creation screen"],
      },
    ],
  },
  {
    key: "plumbing", accent: "ac-amber", eyebrow: "05 — Under the hood",
    title: "The Plumbing",
    blurb: "The pages that reassure the technical buyer: it connects to your stuff, it automates the boring parts, and your keys are safe. Confident, precise, spec-row energy. Amber.",
    pages: [
      {
        route: "/integrations", name: "Integrations", status: "live",
        mood: "<tone>He plugs into your life.</tone>",
        idea: "A clean logo/connector grid with a story per integration — Notion, Gmail, Spotify, Maps, Amazon. Each says what Braino does with it, not just 'connected.'",
        copy: [
          { t: "Headline: <say>Braino works where you already do.</say>" },
          { t: "Each tile flips to a real action: <em>Notion → files your notes. Spotify → sets the mood. Maps → plans the route.</em>" },
          { t: "Group: work · comms · media · shopping · system." },
        ],
        moodboard: ["Zapier app grid", "Raycast extensions", "Apple Continuity 'it just connects'"],
      },
      {
        route: "/connectors-vault", name: "Connectors Vault", status: "live",
        mood: "<tone>Your keys. Locked down.</tone>",
        idea: "The trust/security page for API keys and connectors. Vault metaphor. Calm, serious, technical — reassurance for anyone pasting a secret.",
        copy: [
          { t: "Headline: <say>Your credentials never leave your side.</say>" },
          { t: "Show the model: what's stored, where, who can read it (nobody)." },
          { t: "Per-connector: exact scopes requested, plain-English why." },
        ],
        moodboard: ["1Password vault", "Stripe security page", "a bank-grade lock aesthetic"],
      },
      {
        route: "/automations", name: "Automations", status: "live",
        mood: "<tone>Set it once. He runs it.</tone>",
        idea: "Recipes/triggers — 'every morning, brief me'; 'when this arrives, do that.' Show automations as readable sentences, not node graphs.",
        copy: [
          { t: "Headline: <say>The stuff you do every day, done for you.</say>" },
          { t: "Recipes as plain sentences: <say>Open X on my timeline, any tab.</say> → <em>runs on a schedule.</em>" },
          { t: "One-click 'add this automation' cards." },
        ],
        moodboard: ["Apple Shortcuts gallery", "IFTTT recipe cards", "Zapier Zap templates"],
      },
    ],
  },
  {
    key: "deal", accent: "ac-coral", eyebrow: "06 — The ask",
    title: "The Deal",
    blurb: "Where feeling becomes a decision. Apple's 'which one is right for you' energy — clarity over persuasion. Never a pushy pricing wall; a calm choice between two honest tiers.",
    pages: [
      {
        route: "/premium", name: "Premium", status: "live",
        mood: "<tone>Two honest tiers.</tone> No dark patterns.",
        idea: "Free 'Basic Braino' vs paid 'Braino Pro' — voice-first, full agent, unlimited. Present it as a personality choice, not a feature-gate. Creator/admin always unlimited (internal).",
        copy: [
          { t: "Headline: <say>Which Braino is yours?</say>" },
          { t: "Free: <em>Basic Braino — real everyday help, capped surfaces, a taste of voice.</em>" },
          { t: "Pro: <em>Braino Pro — voice-first, the full agent, unlimited. The one who lives with you.</em>" },
          { t: "Honesty line: <say>Free is genuinely useful. Pro is for people who live in it.</say>" },
        ],
        moodboard: ["apple.com/iphone/compare (which-one-is-you)", "Superhuman single-tier confidence", "Basecamp no-tricks pricing"],
      },
    ],
  },
  {
    key: "utility", accent: "ac-blue", eyebrow: "07 — The edges",
    title: "Utility & Support",
    blurb: "The quiet pages. They rarely get read, but when they do it's a moment that matters — a bug, a question, a legal check. Keep them clean, human, and fast. Small doses of personality.",
    pages: [
      {
        route: "/contact", name: "Contact", status: "live",
        mood: "<tone>A real person answers.</tone>",
        idea: "Founder-direct contact. Not a ticket form — an actual channel (email, X @brainosays). Warm, low-friction.",
        copy: [
          { t: "Headline: <say>Talk to the person who built him.</say>" },
          { t: "Cards: email · X / Twitter · maybe 'ask Braino to pass it on.'" },
        ],
        moodboard: ["indie-hacker contact pages", "a founder's personal site", "clean single-column"],
      },
      {
        route: "/changelog", name: "Changelog", status: "live",
        mood: "<tone>Proof of momentum,</tone> dated.",
        idea: "Version history as a readable feed — every ship, dated, human-written. Pairs with Journal and the dev pulse. Shows the thing is alive.",
        copy: [
          { t: "Headline: <say>What's new.</say>" },
          { t: "Entry: version · date · plain-language what changed." },
          { t: "Tag entries: shipped · fixed · new skill." },
        ],
        moodboard: ["Linear changelog", "Vercel release notes", "a clean version feed"],
      },
    ],
  },
];

/* marker parser: turns <tone>x</tone>, <say>x</say>, <em>x</em> into spans */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(<tone>.*?<\/tone>|<say>.*?<\/say>|<em>.*?<\/em>)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("<tone>")) return <span key={i} className="tone">{p.slice(6, -7)}</span>;
        if (p.startsWith("<say>")) return <span key={i} className="say">{p.slice(5, -6)}</span>;
        if (p.startsWith("<em>")) return <em key={i}>{p.slice(4, -5)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function WebsiteCopy() {
  const [dark, setDark] = useState(() => localStorage.getItem("braino-apple-theme") === "dark");
  useEffect(() => { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); }, [dark]);
  const root = useReveal();

  return (
    <div className={`apple${dark ? " dark" : ""}`} ref={root}>
      {/* header: the doc's name + jump anchors + theme toggle */}
      <header className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Website Copy</span>
          <nav className="an-links">
            <a href="#dna">Apple DNA</a>
            <a href="#front-door">Pages</a>
            <Link to="/product-overview">Live reference</Link>
            <button
              className="apple-theme-toggle"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light" : "Switch to dark"}
            >
              {dark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="apple-hero">
        <p className="apple-eyebrow">The blueprint</p>
        <h1 className="apple-display">Website Copy</h1>
        <p className="apple-subhead">
          A document, me to you. Every page of the site, with a mood, an idea, and copy
          directions in bullets. Not finished copy — a menu you react to. Kill what's flat,
          circle what sings, and we build from your marks.
        </p>
      </section>
      <div className="wc-jump">
        <a href="#dna">The Apple DNA</a>
        {CATEGORIES.map((c) => (
          <a key={c.key} href={`#${c.key}`}>{c.title}</a>
        ))}
      </div>

      {/* Apple design DNA */}
      <section id="dna" className="wc-doc apple-reveal">
        <div className="wc-cat ac-violet">
          <p className="wc-cat-eyebrow">00 — First principles</p>
          <h2>Before the pages, the <span className="tone">philosophy.</span></h2>
          <p>
            I studied how Apple actually builds product pages — not the look, the logic. Eight rules run
            under everything. Every page below obeys them. Steal the DNA, not the pixels.
          </p>
        </div>
        <div className="wc-dna">
          {DNA.map((d, i) => (
            <div key={d.title} className="wc-principle ac-violet">
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
              <p className="steal"><b>Steal this:</b> {d.steal}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the pages, by category */}
      {CATEGORIES.map((cat) => (
        <section key={cat.key} id={cat.key} className={`wc-doc ${cat.accent}`}>
          <div className="wc-cat apple-reveal">
            <p className="wc-cat-eyebrow">{cat.eyebrow}</p>
            <h2>{cat.title.includes(" ") ? (
              <>{cat.title.split(" ").slice(0, -1).join(" ")} <span className="tone">{cat.title.split(" ").slice(-1)}</span></>
            ) : cat.title}</h2>
            <p>{cat.blurb}</p>
          </div>

          {cat.pages.map((pg) => (
            <article key={pg.route} className="wc-card apple-reveal">
              <div className="wc-card-top">
                <h3 className={`wc-card-name ${pg.faceClass || ""}`}>{pg.name}</h3>
                <Link to={pg.route} className="wc-card-route">{pg.route}</Link>
                <span className={`wc-card-live ${pg.status === "live" ? "" : pg.status}`}>
                  {pg.status === "live" ? "Live" : pg.status === "todo" ? "Needs rebuild" : "Draft"}
                </span>
              </div>
              <p className="wc-mood"><Rich text={pg.mood} /></p>

              <div className="wc-grid">
                <div>
                  <div className="wc-block">
                    <span className="lbl">The idea</span>
                    <p>{pg.idea}</p>
                  </div>
                  <div className="wc-block">
                    <span className="lbl">Copy directions</span>
                    <ul className="wc-list">
                      {pg.copy.map((c, i) => (
                        <li key={i}><Rich text={c.t} /></li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="wc-block">
                  <span className="lbl">Moodboard — steal from</span>
                  <div className="wc-moodboard">
                    {pg.moodboard.map((m) => (
                      <span key={m} className="wc-chip">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}

      <p className="wc-note">
        That's the map. Tell me which cards to keep, kill, or remix — mark them up like a draft —
        and I'll turn your marks into real pages, one at a time, in this exact language.
      </p>
      <div className="apple-foot">
        Website Copy — an internal planning document · not a public page · Braino
      </div>
    </div>
  );
}
