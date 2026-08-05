import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Circle, Download, Loader2, Moon, Play, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { BRAINO_WALKER_SVG } from "../components/brainoWalkerSvg";
import { Braino, BrainoDefs, useTime } from "../components/BrainoChar";
import EmotionNetwork from "../components/EmotionNetwork";
import HumanIntelligence from "../components/HumanIntelligence";
import IomiNotch from "../components/IomiNotch";
import BrainoGrowthDemo from "../components/BrainoGrowthDemo";
import BrainoFooter from "../components/BrainoFooter";
import { EXTENSION_DOWNLOAD_URL } from "../lib/extensionDownload";
import "./waitlist.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type ProductId = "braino" | "macos" | "braino-os" | "hera" | "studio" | "everything";
type SubmitState = "idle" | "loading" | "done" | "existing" | "error";
type WaitlistSection = "character" | "braino" | "macos" | "braino-os" | "hera" | "studio" | "join";
type TeaserId = "browser" | "macos" | "os";

const SECTION_TABS: Array<{ id: WaitlistSection; label: string }> = [
  { id: "character", label: "Braino" },
  { id: "braino", label: "Browser" },
  { id: "macos", label: "IOMI" },
  { id: "braino-os", label: "Braino OS" },
  { id: "studio", label: "Studio" },
  { id: "hera", label: "Hera" },
  { id: "join", label: "Join" },
];

type MascotMotion = "standing" | "walking" | "dancing" | "moonwalk";

export function MovingBraino({ motion }: { motion: MascotMotion }) {
  const time = useTime();
  const danceBeat = time * 3.4;
  const dancing = motion === "dancing";
  const travel = motion === "walking"
    ? Math.sin(time * 0.72) * 28
    : motion === "moonwalk"
      ? Math.sin(time * 0.58) * 34
      : 0;

  return (
    <div
      className={`wl-moving-braino is-${motion}`}
      style={{ transform: `translateX(${travel}px)` }}
      aria-hidden="true"
    >
      <Braino
        size={230}
        legs
        gloves
        idle
        walk={motion === "walking"}
        moonwalk={motion === "moonwalk"}
        accessory={motion === "moonwalk" ? "fedora" : "none"}
        expr={dancing || motion === "moonwalk" ? "mischief" : "happy"}
        lookX={motion === "walking" ? 0.45 : 0}
        lookY={dancing ? -0.2 : 0}
        leftArm={dancing ? 42 + Math.sin(danceBeat) * 30 : null}
        rightArm={dancing ? -42 + Math.sin(danceBeat) * 30 : null}
        style={dancing ? {
          transform: `translateY(${-Math.abs(Math.sin(danceBeat)) * 9}px) rotate(${Math.sin(danceBeat) * 4}deg)`,
          transformOrigin: "50% 80%",
        } : undefined}
      />
    </div>
  );
}

const BRAINO_FORMS: Array<{
  number: string;
  label: string;
  title: string;
  description: string;
  art: "face" | "reactions" | MascotMotion;
}> = [
  { number: "01", label: "Face", title: "The expression.", description: "Braino’s quickest form. Just enough face to listen, react and let the moment show.", art: "face" },
  { number: "02", label: "Standing", title: "The companion.", description: "He arrives with a body, waits on the page and looks ready for whatever comes next.", art: "standing" },
  { number: "03", label: "Walking", title: "He enters the work.", description: "Not a mascot trapped in a widget. Braino walks onto the page and moves through it with you.", art: "walking" },
  { number: "04", label: "Dancing", title: "Joy has choreography.", description: "The twist, disco fever, the sprinkler—he celebrates small wins like they actually matter.", art: "dancing" },
  { number: "05", label: "Moonwalk", title: "Of course he moonwalks.", description: "Hat on. Feet forward. Gliding backward. Intelligence is more memorable with a little theatre.", art: "moonwalk" },
  { number: "06", label: "Reactions", title: "One Braino. Many moods.", description: "Quiet, curious, delighted or a little mischievous. His personality changes shape without disappearing.", art: "reactions" },
];

export function BrainoIntroduction() {
  return (
    <section className="wl-chapter wl-reveal" id="character">
      <div className="wl-chapter-number">01 / The character</div>
      <h2>Who is <span className="wl-shimmer wl-shimmer-coral">Braino</span>?</h2>
      <p className="wl-large">Before the browser, the Mac or the operating layer, there is Braino himself.</p>
      <p>He is one character with a whole physical vocabulary. Scroll through the forms: the face, the companion, the walk, the dancing, the reactions—and, naturally, the moonwalk.</p>

      <div className="wl-braino-stories">
        {[0, 2, 4].map((start) => (
          <div className="wl-braino-story-row" key={start}>
            {BRAINO_FORMS.slice(start, start + 2).map((form) => (
              <article className="wl-mascot-card wl-reveal" key={form.number}>
                <div className={`wl-story-art${form.art === "walking" || form.art === "dancing" || form.art === "moonwalk" ? " wl-story-stage" : ""}${form.art === "reactions" ? " wl-reaction-stage" : ""}`}>
                  {form.art === "face" ? (
                    <img src="/reactions/braino-happy.svg" alt="Braino reaction face" />
                  ) : form.art === "reactions" ? (
                    <>
                      <img src="/reactions/braino-idle.svg" alt="Braino idle reaction" />
                      <img src="/reactions/braino-happy.svg" alt="Braino happy reaction" />
                      <div className="wl-mini-walker" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
                    </>
                  ) : (
                    <MovingBraino motion={form.art} />
                  )}
                </div>
                <div className="wl-story-copy">
                  <span>{form.number} / {form.label}</span>
                  <h4>{form.title}</h4>
                  <p>{form.description}</p>
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function BrainoStudioChapter() {
  return (
    <section className="wl-chapter wl-reveal" id="studio">
      <div className="wl-chapter-number">05 / The atelier</div>
      <h2>Braino<span className="wl-shimmer wl-shimmer-studio">Studio</span>.</h2>
      <p className="wl-large">Braino is a Diva 💅 — naturally, he needs a dressing room.</p>
      <p>Studio is where Braino becomes yours. Change the way he looks, dresses, moves and reacts—from the shape of an expression to the colour of a glove and the exact energy of his entrance.</p>
      <div className="wl-studio-card">
        <div className="wl-studio-preview" aria-label="A customizable Braino preview"><MovingBraino motion="standing" /><span>Live look</span></div>
        <div className="wl-studio-controls"><span>In-house Diva system</span><h3>Down to the last detail.</h3><div className="wl-studio-options"><div><b>Face</b><small>eyes · mood · expression</small></div><div><b>Wardrobe</b><small>gloves · shoes · accessories</small></div><div><b>Motion</b><small>walk · dance · entrance</small></div><div><b>Palette</b><small>body · glow · accents</small></div></div></div>
      </div>
    </section>
  );
}

export function BrainoHeraChapter() {
  return (
    <section className="wl-chapter wl-reveal" id="hera">
      <div className="wl-chapter-number">06 / Hera</div>
      <h2 className="wl-product-title">Braino <span className="wl-shimmer wl-shimmer-green">Hera</span>.</h2>
      <div className="wl-hera-secret"><span aria-hidden="true"><i /><i /><i /></span><p className="wl-large">Coming soon.</p></div>
    </section>
  );
}

function ProductName({ product }: { product: ProductId }) {
  if (product === "braino") return <span className="wl-shimmer wl-shimmer-coral">Braino</span>;
  if (product === "macos") return <>Braino <span className="wl-shimmer wl-shimmer-gold">IOMI</span></>;
  if (product === "braino-os") return <>Braino<span className="wl-shimmer wl-shimmer-os">OS</span></>;
  if (product === "hera") return <>Braino <span className="wl-shimmer wl-shimmer-green">Hera</span></>;
  if (product === "studio") return <>Braino<span className="wl-shimmer wl-shimmer-studio">Studio</span></>;
  return <>Send me everything, DAWG</>;
}

const PRODUCTS: Array<{
  id: ProductId;
  number: string;
  name: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "braino",
    number: "01",
    name: "Braino",
    eyebrow: "For the browser",
    description: "A companion for the web. He reads the page you are on, understands what you are doing, talks in his own voice, and helps without asking you to move your work into another window.",
  },
  {
    id: "macos",
    number: "02",
    name: "Braino IOMI",
    eyebrow: "For the Mac",
    description: "IOMI takes Braino beyond the browser: apps, files, mail, music, meetings and whatever is on your screen. Voice-first, glanceable, and built to feel present.",
  },
  {
    id: "braino-os",
    number: "03",
    name: "Braino OS",
    eyebrow: "The intelligence",
    description: "The reasoning, memory, personality and motion layer underneath every version of Braino—turning separate abilities into one coherent character.",
  },
  {
    id: "studio",
    number: "04",
    name: "Braino Studio",
    eyebrow: "Make him yours",
    description: "Braino is a Diva 💅. Studio lets you customize his face, colours, wardrobe, movement and presence down to the last possible detail.",
  },
  {
    id: "hera",
    number: "05",
    name: "Braino Hera",
    eyebrow: "Coming soon",
    description: "We’re keeping this one quiet for now.",
  },
  {
    id: "everything",
    number: "06",
    name: "Send me everything, DAWG",
    eyebrow: "All of Braino",
    description: "Everything announced so far—and whatever strange, adorable form Braino becomes next.",
  },
];

function TeaserPlayer({
  id,
  activeTeaser,
  onPlay,
  src,
  videoSrc,
  title,
}: {
  id: TeaserId;
  activeTeaser: TeaserId | null;
  onPlay: (id: TeaserId) => void;
  src?: string;
  videoSrc?: string;
  title: string;
}) {
  const active = activeTeaser === id;

  return (
    <div className={`wl-teaser-viewport${active ? " playing" : ""}`}>
      {active ? (
        videoSrc ? (
          <video key={id} src={videoSrc} title={title} controls autoPlay playsInline />
        ) : (
          <iframe
            key={id}
            src={src}
            title={title}
            allow="autoplay; fullscreen"
          />
        )
      ) : (
        <button type="button" className="wl-teaser-play" onClick={() => onPlay(id)} aria-label={`Play ${title}`}>
          <span><Play fill="currentColor" aria-hidden="true" /></span>
        </button>
      )}
    </div>
  );
}

function useReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".wl-reveal");
    if (!elements?.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      }),
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return ref;
}

export function WaitlistJoin({ id = "join" }: { id?: string }) {
  const [selected, setSelected] = useState<Set<ProductId>>(new Set());
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const toggleProduct = (product: ProductId) => {
    setSelected((current) => {
      if (product === "everything") return current.has("everything") ? new Set() : new Set<ProductId>(["everything"]);
      const next = new Set(current);
      next.delete("everything");
      if (next.has(product)) next.delete(product);
      else next.add(product);
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes("@") || selected.size === 0 || submitState === "loading") {
      setSubmitState("error");
      return;
    }
    setSubmitState("loading");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), context: `editorial-waitlist:${Array.from(selected).join(",")}` }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setSubmitState(data.error === "already_on_waitlist" ? "existing" : "done");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <section className="wl-join" id={id}>
      <div className="wl-join-head wl-reveal in">
        <Link to="/knowledge/braino-ecosystem">The Braino ecosystem <ArrowUpRight aria-hidden="true" /></Link>
        <h2>Where do you want to meet him?</h2>
        <p>Select only what you want to hear about. We’ll save each choice with your waitlist entry, so the updates you receive actually match the Braino you came for.</p>
      </div>
      <div className="wl-picker wl-reveal in">
        {PRODUCTS.map((product) => {
          const active = selected.has(product.id);
          return <button type="button" className={active ? "selected" : ""} key={product.id} onClick={() => toggleProduct(product.id)} aria-pressed={active}>
            <span className="wl-pick-top"><i>{product.number}</i>{active ? <Check /> : <Circle />}</span>
            <small>{product.eyebrow}</small>
            <h3><ProductName product={product.id} /></h3>
            <p>{product.description}</p>
          </button>;
        })}
      </div>
      <form className="wl-form wl-reveal in" onSubmit={submit}>
        {submitState === "done" || submitState === "existing" ? <div className="wl-success"><Check aria-hidden="true" /><div><strong>{submitState === "done" ? "You’re on the list." : "You’re already with us."}</strong><span>We’ll write when there is something worth opening.</span></div></div> : <>
          <label htmlFor={`${id}-email`}>Your email</label>
          <div><input id={`${id}-email`} type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (submitState === "error") setSubmitState("idle"); }} placeholder="you@somewhere.com" autoComplete="email" required /><button type="submit" disabled={submitState === "loading"}>{submitState === "loading" ? <Loader2 className="wl-spin" /> : <>Join the waitlist <ArrowUpRight /></>}</button></div>
          {submitState === "error" && <p role="alert">That didn’t go through. Check the email and try once more.</p>}
        </>}
      </form>
    </section>
  );
}

export default function Waitlist() {
  const pageRef = useReveal();
  const [activeSection, setActiveSection] = useState<WaitlistSection>("character");
  const [activeTeaser, setActiveTeaser] = useState<TeaserId | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("braino-waitlist-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    const sections = SECTION_TABS
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const next = visible[0]?.target.id as WaitlistSection | undefined;
        if (next) setActiveSection(next);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const teaserSection: Record<TeaserId, WaitlistSection> = {
      browser: "braino",
      macos: "macos",
      os: "braino-os",
    };
    if (activeTeaser && teaserSection[activeTeaser] !== activeSection) {
      setActiveTeaser(null);
    }
  }, [activeSection, activeTeaser]);

  useEffect(() => {
    window.localStorage.setItem("braino-waitlist-theme", theme);
  }, [theme]);

  return (
    <main className={`wl-page is-${theme}`} ref={pageRef}>
      <BrainoDefs />
      <IomiNotch />

      <header className="wl-hero" id="top">
        <div className="wl-hero-layout">
          <div className="wl-hero-copy wl-reveal">
            <span className="wl-hero-eyebrow"><i /> A personal AI with a pulse</span>
            <h1>
              <span>Meet the</span>
              <strong>cutest AI agent</strong>
              <em>you’ll ever meet.</em>
            </h1>
            <p className="wl-dek">Braino began in the browser. Now he is learning how to live across your Mac, your words and the rest of your digital life.</p>
            <a className="wl-download-cta" href={EXTENSION_DOWNLOAD_URL} download="braino.zip">
              <Download aria-hidden="true" />
              <span>Download Braino</span>
              <small>Chrome · v1.0.0</small>
            </a>
            <div className="wl-hero-footnote">
              <span>One character.</span>
              <span>Everywhere you work.</span>
            </div>
          </div>

          <div className="wl-hero-braino wl-reveal" aria-label="Meet Braino">
            <div className="wl-hero-orbit" aria-hidden="true"><i /><i /><i /></div>
            <div className="wl-hero-halo" aria-hidden="true" />
            <Braino
              size={300}
              legs
              gloves
              idle
              expr="happy"
              lookX={-0.18}
              lookY={0.05}
            />
            <span className="wl-hero-braino-label">Hi, I’m Braino.</span>
          </div>
        </div>
      </header>

      <div className="wl-tabs-shell is-revealed" aria-label="Braino waitlist sections">
        <span className="wl-rail-label">Explore</span>
        <nav className="wl-tabs">
          {SECTION_TABS.map((tab, index) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={activeSection === tab.id ? "active" : ""}
              aria-current={activeSection === tab.id ? "location" : undefined}
              onClick={() => setActiveSection(tab.id)}
            >
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="wl-theme-toggle"
          onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </div>

      <article className="wl-article">
        <BrainoIntroduction />

        <section className="wl-chapter wl-reveal" id="braino">
          <div className="wl-chapter-number">02 / The browser</div>
          <h2 className="wl-product-title">Braino for the <span className="wl-shimmer wl-shimmer-browser">browser</span>.</h2>
          <p className="wl-large">The Braino you can meet today: a companion who lives beside whatever you are doing on the web.</p>
          <figure className="wl-teaser-card">
            <TeaserPlayer
              id="browser"
              activeTeaser={activeTeaser}
              onPlay={setActiveTeaser}
              videoSrc="/Braino_Final.MP4"
              title="Don’t Blink — Braino for the browser teaser"
            />
          </figure>
          <p>Most AI waits inside a box. Braino reads the page you are already on, explains it, searches with you, remembers what matters, records a lecture, and helps turn intent into action without making you leave the work.</p>
          <p>The useful part is not that he can answer. Plenty of things can answer. The bet is that software becomes more useful when it has continuity, character, and enough context to understand what kind of help the moment actually needs.</p>
        </section>

        <section className="wl-chapter wl-reveal" id="macos">
          <div className="wl-chapter-number">03 / IOMI</div>
          <h2 className="wl-product-title">Braino <span className="wl-shimmer wl-shimmer-gold">IOMI</span>.</h2>
          <p className="wl-large">The browser taught Braino how people move through the web. IOMI teaches him how people move through an entire day.</p>
          <figure className="wl-teaser-card wl-macos-film">
            <TeaserPlayer
              id="macos"
              activeTeaser={activeTeaser}
              onPlay={setActiveTeaser}
              src="/notch-teaser?embed=1"
              title="Braino IOMI teaser"
            />
          </figure>
          <p>On the Mac, IOMI lives in the notch and wakes by voice. He can work across apps, files, folders, mail, music and meetings. He sees the active work, understands where your attention is, and stays close without occupying the whole screen.</p>
          <p>This version runs on Braino OS: the reasoning, personality, context and controls that turn separate capabilities into one coherent presence.</p>

          <BrainoGrowthDemo />

          <div className="wl-status"><span /><b>In active development</b><i>IOMI · Mac · voice-first</i></div>
        </section>

        <section className="wl-chapter wl-reveal" id="braino-os">
          <div className="wl-chapter-number">04 / The operating layer</div>
          <h2>Braino<span className="wl-shimmer wl-shimmer-os">OS</span>.</h2>
          <p className="wl-large">The intelligence and emotional operating layer underneath every version of Braino.</p>

          <div className="wl-os-cards">
            <article>
              <div className="wl-engine-cover">
                <span className="wl-engine-notch" aria-hidden="true"><i /><i /></span>
                <div className="wl-engine-graphic"><EmotionNetwork caption={false} /></div>
              </div>
              <div className="wl-engine-copy">
                <span>01 / The motion</span>
                <h3>More Than Motion Engine</h3>
                <p>Braino does not merely move, react or animate. The engine underneath him turns context into behaviour, presence and an emotionally appropriate response.</p>
              </div>
            </article>
            <article>
              <div className="wl-engine-cover">
                <span className="wl-engine-notch" aria-hidden="true"><i /><i /></span>
                <div className="wl-engine-graphic"><HumanIntelligence caption={false} /></div>
              </div>
              <div className="wl-engine-copy">
                <span>02 / The mind</span>
                <h3>Human Intelligence</h3>
                <p>A reasoning layer built around how people actually communicate: incomplete thoughts, changing emotions, memory, intent and everything left unsaid.</p>
              </div>
            </article>
          </div>

          <p>Braino OS is what keeps the character continuous while the surface changes. It carries his memory, reasoning, personality and understanding of context from the browser to IOMI and into whatever Braino becomes next.</p>
          <p>Its purpose is not to imitate a person. It is to make software feel present: able to notice what is happening, decide how to help, and respond with movement, language and emotion that belong to the moment.</p>
        </section>

        {/* Shared verbatim with Product Overview. */}
        <BrainoStudioChapter />
        {/*
        <section className="wl-chapter wl-reveal" id="studio">
          <div className="wl-chapter-number">05 / The atelier</div>
          <h2>Braino<span className="wl-shimmer wl-shimmer-studio">Studio</span>.</h2>
          <p className="wl-large">Braino is a Diva 💅 — naturally, he needs a dressing room.</p>
          <p>Studio is where Braino becomes yours. Change the way he looks, dresses, moves and reacts—from the shape of an expression to the colour of a glove and the exact energy of his entrance.</p>

          <div className="wl-studio-card">
            <div className="wl-studio-preview" aria-label="A customizable Braino preview">
              <MovingBraino motion="standing" />
              <span>Live look</span>
            </div>
            <div className="wl-studio-controls">
              <span>In-house Diva system</span>
              <h3>Down to the last detail.</h3>
              <div className="wl-studio-options">
                <div><b>Face</b><small>eyes · mood · expression</small></div>
                <div><b>Wardrobe</b><small>gloves · shoes · accessories</small></div>
                <div><b>Motion</b><small>walk · dance · entrance</small></div>
                <div><b>Palette</b><small>body · glow · accents</small></div>
              </div>
            </div>
          </div>
        </section> */}

        <BrainoHeraChapter />
        {/*
        <section className="wl-chapter wl-reveal" id="hera">
          <div className="wl-chapter-number">06 / Hera</div>
          <h2 className="wl-product-title">Braino <span className="wl-shimmer wl-shimmer-green">Hera</span>.</h2>
          <div className="wl-hera-secret">
            <span aria-hidden="true"><i /><i /><i /></span>
            <p className="wl-large">Coming soon.</p>
          </div>
        </section> */}
      </article>

      <WaitlistJoin />

      <BrainoFooter />
    </main>
  );
}
