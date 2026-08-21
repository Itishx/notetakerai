import { useCallback, useEffect, useState } from "react";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { BrainoTVProvider, BrainoTVScreen } from "@/components/BrainoTV";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME } from "@/lib/extensionDownload";
import "../styles/apple.css";
import "./hero-lab.css";

/* ============================================================================
   /hero-lab — twelve heroes, one page, pick one.

   The homepage hero got fixed once by making it taller, which answered a
   spacing complaint and not the actual question, which was what the hero
   should LOOK like. This page exists so that question gets answered by
   looking rather than by describing.

   Rules I held to so the comparison means something:

   - Same words in all twelve. Only the layout changes, so what you are
     judging is the layout. Where a variation needs extra copy to exist at
     all (the command list, the stat row) it is clearly that variation's
     own furniture.
   - Same tokens as the real site. These are built on apple.css, so a
     variation you pick can move to Landing.tsx without a redesign.
   - Every one is a real, finished hero. None of them are wireframes.

   Arrow keys move. The letter is in the URL hash, so a link points at one.
   ============================================================================ */

const FILM = { src: "/Braino_Final.MP4", title: "" };

const EYEBROW = "Braino";
const HEAD_A = "Speak.";
const HEAD_B = "Watch it happen.";
const SUB = "He lives on your screen and does the boring half of your day. You talk, he moves. No prompt engineering degree required.";
const NOTE = "Free to start. Chrome and Mac.";

function Cta({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"hl-cta" + (compact ? " compact" : "")}>
      <a href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME} className="hl-btn">Get started</a>
      <a href="#does" className="hl-btn ghost">See what he does</a>
    </div>
  );
}

function Film({ className = "" }: { className?: string }) {
  return <BrainoTVScreen className={`hl-film ${className}`} offer={FILM} />;
}

/* ── A. Split ─────────────────────────────────────────────────────────────
   What the site ships today. Here as the control, not as a suggestion. */
function HeroA() {
  return (
    <div className="hl-a">
      <div>
        <p className="hl-eyebrow">{EYEBROW}</p>
        <h1 className="hl-h1">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
        <p className="hl-sub">{SUB}</p>
        <Cta />
        <p className="hl-note">{NOTE}</p>
      </div>
      <div className="hl-screen"><Film /></div>
    </div>
  );
}

/* ── B. Centred stack ─────────────────────────────────────────────────────
   The Linear/Vercel shape. Type takes the whole width, then the product
   sits underneath it wide, so the claim reads before the proof. */
function HeroB() {
  return (
    <div className="hl-b">
      <p className="hl-eyebrow">{EYEBROW}</p>
      <h1 className="hl-h1 xl">{HEAD_A} <span className="tone">{HEAD_B}</span></h1>
      <p className="hl-sub">{SUB}</p>
      <Cta />
      <p className="hl-note">{NOTE}</p>
      <div className="hl-screen wide"><Film /></div>
    </div>
  );
}

/* ── C. Bleed right ───────────────────────────────────────────────────────
   The product runs off the edge of the page instead of being held in a
   card. Reads as a window onto something bigger than the page. */
function HeroC() {
  return (
    <div className="hl-c">
      <div className="hl-c-copy">
        <p className="hl-eyebrow">{EYEBROW}</p>
        <h1 className="hl-h1">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
        <p className="hl-sub">{SUB}</p>
        <Cta />
        <p className="hl-note">{NOTE}</p>
      </div>
      <div className="hl-c-screen"><Film /></div>
    </div>
  );
}

/* ── D. Full bleed ────────────────────────────────────────────────────────
   Film behind everything, copy sitting on it. The most cinematic and the
   least safe: it lives or dies on the first frame of the film. */
function HeroD() {
  return (
    <div className="hl-d">
      <div className="hl-d-bg"><Film /></div>
      <div className="hl-d-scrim" aria-hidden="true" />
      <div className="hl-d-copy">
        <p className="hl-eyebrow light">{EYEBROW}</p>
        <h1 className="hl-h1 on-dark">{HEAD_A}<br /><span>{HEAD_B}</span></h1>
        <p className="hl-sub on-dark">{SUB}</p>
        <Cta />
        <p className="hl-note on-dark">{NOTE}</p>
      </div>
    </div>
  );
}

/* ── E. Browser frame ─────────────────────────────────────────────────────
   Says "this runs in your browser" without a sentence about it. The chrome
   is the argument. */
function HeroE() {
  return (
    <div className="hl-e">
      <p className="hl-eyebrow">{EYEBROW}</p>
      <h1 className="hl-h1 xl">{HEAD_A} <span className="tone">{HEAD_B}</span></h1>
      <p className="hl-sub center">{SUB}</p>
      <Cta />
      <div className="hl-window">
        <div className="hl-window-bar">
          <i /><i /><i />
          <span className="hl-window-url">trybraino.com</span>
        </div>
        <div className="hl-window-body"><Film /></div>
      </div>
    </div>
  );
}

/* ── F. What you say, what he does ────────────────────────────────────────
   No film at all. The right column is the product demo, in text, which
   loads instantly and survives someone who never presses play. */
const SAYS: Array<[string, string]> = [
  ["organise my desktop", "412 files, into eleven folders"],
  ["what am I looking at", "reads the screen back to you"],
  ["message mum, I'm on my way", "sent, without your phone"],
  ["wake me at 6:30", "survives a restart"],
];
function HeroF() {
  return (
    <div className="hl-f">
      <div>
        <p className="hl-eyebrow">{EYEBROW}</p>
        <h1 className="hl-h1">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
        <p className="hl-sub">{SUB}</p>
        <Cta />
        <p className="hl-note">{NOTE}</p>
      </div>
      <ul className="hl-says">
        {SAYS.map(([said, did]) => (
          <li key={said}>
            <q>{said}</q>
            <span>{did}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── G. Headline over a row ───────────────────────────────────────────────
   Type first at full width, then three panels. Fits the most information
   above the fold of any variation here. */
function HeroG() {
  return (
    <div className="hl-g">
      <div className="hl-g-top">
        <div>
          <p className="hl-eyebrow">{EYEBROW}</p>
          <h1 className="hl-h1 xl">{HEAD_A} <span className="tone">{HEAD_B}</span></h1>
        </div>
        <div className="hl-g-aside">
          <p className="hl-sub">{SUB}</p>
          <Cta compact />
        </div>
      </div>
      <div className="hl-g-row">
        <div className="hl-screen flat"><Film /></div>
        <article><b>62</b><span>Things he can do, across the Mac and the browser</span></article>
        <article><b>One</b><span>Memory that follows you out of the app and onto the machine</span></article>
      </div>
    </div>
  );
}

/* ── H. In the machine ────────────────────────────────────────────────────
   The film inside a lid with a notch, because the notch is where he
   actually lives on a Mac. Most literal, most on-brand. */
function HeroH() {
  return (
    <div className="hl-h">
      <p className="hl-eyebrow">{EYEBROW}</p>
      <h1 className="hl-h1 xl">{HEAD_A} <span className="tone">{HEAD_B}</span></h1>
      <p className="hl-sub center">{SUB}</p>
      <Cta />
      <div className="hl-lid">
        <span className="hl-lid-notch" aria-hidden="true"><i /><i /></span>
        <div className="hl-lid-screen"><Film /></div>
      </div>
      <div className="hl-lid-base" aria-hidden="true" />
      <p className="hl-note">{NOTE}</p>
    </div>
  );
}

/* ── I. Say something ─────────────────────────────────────────────────────
   The hero object is the thing you do first. Nothing here is a text box
   you type into: it is a picture of talking, with the chips as suggestions. */
const CHIPS = ["organise my desktop", "what am I looking at", "play something", "reply to this email", "wake me at 6:30"];
function HeroI() {
  const [chip, setChip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setChip((n) => (n + 1) % CHIPS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hl-i">
      <p className="hl-eyebrow">{EYEBROW}</p>
      <h1 className="hl-h1 xl">{HEAD_A} <span className="tone">{HEAD_B}</span></h1>
      <p className="hl-sub center">{SUB}</p>
      <div className="hl-mic">
        <span className="hl-mic-key">hold ⌃</span>
        <span className="hl-mic-bars" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }} />)}
        </span>
        <span className="hl-mic-said" key={chip}>“{CHIPS[chip]}”</span>
      </div>
      <Cta />
      <p className="hl-note">{NOTE}</p>
    </div>
  );
}

/* ── J. Offset ────────────────────────────────────────────────────────────
   The film breaks the grid and sits lower than the copy, over a soft field
   of the accent. The least symmetrical, and the one with the most air. */
function HeroJ() {
  return (
    <div className="hl-j">
      <span className="hl-j-glow" aria-hidden="true" />
      <div className="hl-j-copy">
        <p className="hl-eyebrow">{EYEBROW}</p>
        <h1 className="hl-h1">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
        <p className="hl-sub">{SUB}</p>
        <Cta />
        <p className="hl-note">{NOTE}</p>
      </div>
      <div className="hl-j-screen"><Film /></div>
    </div>
  );
}

/* ── K. Type only ─────────────────────────────────────────────────────────
   No film, no card, one button. If the sentence is good enough this is the
   strongest thing on the list, and if it is not, this exposes that. */
function HeroK() {
  return (
    <div className="hl-k">
      <p className="hl-eyebrow">{EYEBROW}</p>
      <h1 className="hl-h1 huge">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
      <p className="hl-sub center big">{SUB}</p>
      <div className="hl-cta">
        <a href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME} className="hl-btn">Get started</a>
      </div>
      <p className="hl-note">{NOTE}</p>
    </div>
  );
}

/* ── L. He is the hero ────────────────────────────────────────────────────
   The mascot at full size, because "he is somebody" is the one claim no
   competitor can make and the only one you can show in a single frame. */
function HeroL() {
  return (
    <div className="hl-l">
      <div className="hl-l-char">
        <BrainoDefs />
        <Braino size={230} legs gloves expr="happy" arm="wave" />
      </div>
      <div>
        <p className="hl-eyebrow">{EYEBROW}</p>
        <h1 className="hl-h1">{HEAD_A}<br /><span className="tone">{HEAD_B}</span></h1>
        <p className="hl-sub">{SUB}</p>
        <Cta />
        <p className="hl-note">{NOTE}</p>
        <div className="hl-l-strip" aria-hidden="true">
          <span dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
        </div>
      </div>
    </div>
  );
}

type Variant = {
  key: string;
  name: string;
  why: string;
  accent: string;
  node: () => JSX.Element;
};

const VARIANTS: Variant[] = [
  { key: "A", name: "Split", why: "What the site ships today. The control, not a suggestion.", accent: "ac-coral", node: HeroA },
  { key: "B", name: "Centred stack", why: "Type at full width, product underneath. The Linear shape.", accent: "ac-blue", node: HeroB },
  { key: "C", name: "Bleed right", why: "The product runs off the edge instead of sitting in a card.", accent: "ac-violet", node: HeroC },
  { key: "D", name: "Full bleed", why: "Film behind everything. Most cinematic, least safe.", accent: "ac-coral", node: HeroD },
  { key: "E", name: "Browser frame", why: "Says it runs in your browser without a sentence about it.", accent: "ac-blue", node: HeroE },
  { key: "F", name: "Say / do", why: "No film. The demo is text, so it never needs a play button.", accent: "ac-green", node: HeroF },
  { key: "G", name: "Headline over a row", why: "The most information above the fold of any of these.", accent: "ac-amber", node: HeroG },
  { key: "H", name: "In the machine", why: "A lid with a notch, because the notch is where he lives.", accent: "ac-violet", node: HeroH },
  { key: "I", name: "Say something", why: "The hero object is the first thing you actually do.", accent: "ac-green", node: HeroI },
  { key: "J", name: "Offset", why: "Breaks the grid. The most air of any of them.", accent: "ac-coral", node: HeroJ },
  { key: "K", name: "Type only", why: "One sentence, one button. Exposes whether the line is good.", accent: "ac-blue", node: HeroK },
  { key: "L", name: "He is the hero", why: "The one claim no competitor can make, in a single frame.", accent: "ac-amber", node: HeroL },
];

export default function HeroLab() {
  const [i, setI] = useState(() => {
    const letter = window.location.hash.replace("#", "").toUpperCase();
    const found = VARIANTS.findIndex((v) => v.key === letter);
    return found >= 0 ? found : 0;
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") !== "light"; } catch { return true; }
  });

  const go = useCallback((next: number) => {
    const wrapped = (next + VARIANTS.length) % VARIANTS.length;
    setI(wrapped);
    window.history.replaceState({}, "", `#${VARIANTS[wrapped].key}`);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const letter = window.location.hash.replace("#", "").toUpperCase();
      const found = VARIANTS.findIndex((variant) => variant.key === letter);
      if (found >= 0) setI(found);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);

  const v = VARIANTS[i];
  const Hero = v.node;

  return (
    <BrainoTVProvider>
      <div className={"apple hl" + (dark ? " dark" : "")}>
        <header className="hl-bar">
          <div className="hl-bar-id">
            <b>Hero lab</b>
            <span>{VARIANTS.length} layouts, same words. Arrow keys to move.</span>
          </div>
          <div className="hl-dots" role="tablist" aria-label="Hero variations">
            {VARIANTS.map((variant, n) => (
              <button
                key={variant.key}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`${variant.key}. ${variant.name}`}
                className={n === i ? "on" : ""}
                onClick={() => go(n)}
              >
                {variant.key}
              </button>
            ))}
          </div>
          <button type="button" className="hl-theme" onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </button>
        </header>

        <div className={"hl-stage " + v.accent}>
          <button type="button" className="hl-arrow left" onClick={() => go(i - 1)} aria-label="Previous layout">‹</button>
          <Hero />
          <button type="button" className="hl-arrow right" onClick={() => go(i + 1)} aria-label="Next layout">›</button>
        </div>

        <footer className="hl-foot">
          <p className="hl-foot-key">{v.key}</p>
          <div>
            <h2>{v.name}</h2>
            <p>{v.why}</p>
          </div>
          <p className="hl-foot-count">{i + 1} of {VARIANTS.length}</p>
        </footer>
      </div>
    </BrainoTVProvider>
  );
}
