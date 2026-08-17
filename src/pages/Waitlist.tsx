import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Circle, Loader2, Play } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ANSWERED_SETS,
  BRAINO_ORDER,
  FAQ,
  FaqRow,
  HOME_TABS,
  QUESTION_TAB,
  isHomeTab,
  type HomeTabId,
} from "./homeQuestions";
import { BRAINO_WALKER_SVG } from "../components/brainoWalkerSvg";
import { Braino, BrainoDefs, useTime } from "../components/BrainoChar";
import EmotionNetwork from "../components/EmotionNetwork";
import HumanIntelligence from "../components/HumanIntelligence";
import IomiNotch from "../components/IomiNotch";
import BrainoGrowthDemo from "../components/BrainoGrowthDemo";
import BrainoFooter from "../components/BrainoFooter";
import "./waitlist.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type ProductId = "braino" | "macos" | "braino-os" | "hera" | "studio" | "everything";
type SubmitState = "idle" | "loading" | "done" | "existing" | "error" | "needs-pick";
type WaitlistSection = "character" | "kinds" | "braino" | "macos" | "meetings" | "braino-os" | "hera" | "studio" | "join";
type TeaserId = "browser" | "macos" | "os";
const TEASER_SECTION: Record<TeaserId, string> = { browser: "braino", macos: "macos", os: "braino-os" };

// Meetings sits straight after IOMI on purpose: it is the first thing the Mac does that
// people ask for by name, and the chapter before it is what makes it possible.
const SECTION_TABS: Array<{ id: WaitlistSection; label: string }> = [
  { id: "character", label: "Braino" },
  { id: "kinds", label: "The family" },
  { id: "braino", label: "Browser" },
  { id: "macos", label: "IOMI" },
  { id: "meetings", label: "Meetings" },
  { id: "braino-os", label: "Braino OS" },
  { id: "studio", label: "Studio" },
  { id: "hera", label: "Hera" },
  { id: "join", label: "Join" },
];

// Each tab introduces itself. The question list under it is the answer.
const TAB_HEADS: Record<HomeTabId, { name: string; title: string; sub: string }> = {
  braino: {
    name: "the introduction",
    title: "Ask, and he opens up.",
    sub: "The rest of this page is questions. Open the ones you care about, leave the rest closed.",
  },
  browser: {
    name: "Braino Browser",
    title: "The free one, in Chrome.",
    sub: "He installs into your browser and works on the page you are already on. Six questions about the Braino you meet first.",
  },
  foundry: {
    name: "Braino Foundry",
    title: "The one you hire.",
    sub: "Braino on macOS, in the notch, with your screen and your voice. Eight questions about the co-founder.",
  },
  hera: {
    name: "BrainoHERA",
    title: "Talk, and it types.",
    sub: "System-wide dictation that lands at your cursor and never says a word back. Four questions about the quiet one.",
  },
  everything: {
    name: "the whole argument",
    title: "The entire thing, asked properly.",
    sub: "What he is, why he exists, who pays, the arithmetic, and what is honestly still unbuilt. The deck, as questions.",
  },
};

const WAITLIST_NOTCH_NAV = SECTION_TABS.map((section, index) => ({
  to: `#${section.id}`,
  label: section.label,
  note: `Chapter ${String(index + 1).padStart(2, "0")}`,
}));

const BRAINO_REACTIONS = [
  ["/reactions/braino-idle.svg", "Braino calm"],
  ["/reactions/braino-happy.svg", "Braino happy"],
  ["/reactions/braino-laughing.svg", "Braino laughing"],
  ["/reactions/braino-celebrating.svg", "Braino celebrating"],
  ["/reactions/braino-focus.svg", "Braino focused"],
  ["/reactions/braino-shocked.svg", "Braino shocked"],
  ["/reactions/braino-scared.svg", "Braino scared"],
  ["/reactions/braino-tears-of-joy.svg", "Braino crying with joy"],
] as const;

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

export function BrainoIntroduction({ id = "character" }: { id?: string }) {
  return (
    <section className="wl-chapter wl-reveal" id={id || undefined}>
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
                    BRAINO_REACTIONS.map(([src, alt]) => <img src={src} alt={alt} key={src} />)
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

export function BrainoStudioChapter({ id = "studio" }: { id?: string }) {
  return (
    <section className="wl-chapter wl-reveal" id={id || undefined}>
      <div className="wl-chapter-number">06 / The atelier</div>
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

export function BrainoHeraChapter({ id = "hera" }: { id?: string }) {
  return (
    <section className="wl-chapter wl-reveal" id={id || undefined}>
      <div className="wl-chapter-number">07 / Hera</div>
      <h2 className="wl-product-title">Braino <span className="wl-shimmer wl-shimmer-green">Hera</span>.</h2>
      <p className="wl-large">A quieter, more personal side of Braino is taking shape.</p>
      <p>We are keeping the details close until the idea is ready to meet people properly. Coming soon.</p>
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
    if (submitState === "loading") return;
    if (!email.trim().includes("@")) {
      setSubmitState("error");
      return;
    }
    if (selected.size === 0) {
      // A real, fixable instruction instead of "your email is wrong".
      setSubmitState("needs-pick");
      return;
    }
    setSubmitState("loading");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({
          email: email.trim(),
          categories: Array.from(selected),
          context: `editorial-waitlist:${Array.from(selected).join(",")}`,
        }),
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
          return <button type="button" className={active ? "selected" : ""} key={product.id} onClick={() => { toggleProduct(product.id); if (submitState === "needs-pick") setSubmitState("idle"); }} aria-pressed={active}>
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
          <div><input id={`${id}-email`} type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (submitState === "error" || submitState === "needs-pick") setSubmitState("idle"); }} placeholder="you@somewhere.com" autoComplete="email" required /><button type="submit" disabled={submitState === "loading"}>{submitState === "loading" ? <Loader2 className="wl-spin" /> : <>Join the waitlist <ArrowUpRight /></>}</button></div>
          {submitState === "error" && <p role="alert">That didn’t go through. Check the email and try once more.</p>}
          {/* The picker is a scroll above the button, so someone can reach here
              with nothing chosen and no idea. Say it while they can still act on
              it; the same sentence turns into a real alert if they submit anyway. */}
          {submitState === "needs-pick"
            ? <p role="alert">Pick at least one above, so we know which Braino to write to you about.</p>
            : selected.size === 0 && <p className="wl-form-hint">Pick at least one above, so we know which Braino to write to you about.</p>}
        </>}
      </form>
    </section>
  );
}

// The "different kinds of Braino" tabs, answered the same way everything else is:
// a question that opens into the map, with each card opening its own question.
function KindsAnswer({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="wl-chapter wl-reveal">
      <h2>One character. <span className="wl-shimmer wl-shimmer-coral">Several bodies.</span></h2>
      <p className="wl-large">Braino is not a product line. He is the same character learning to live in more places.</p>
      <div className="wl-kinds-grid">
        {PRODUCTS.filter((product) => product.id !== "everything").map((product) => (
          <button type="button" key={product.id} onClick={() => onOpen(product.id)}>
            <span className="wl-kinds-num">{product.number}</span>
            <h3><ProductName product={product.id} /></h3>
            <small>{product.eyebrow}</small>
            <p>{product.description}</p>
            <i>Open this question <ArrowUpRight size={14} aria-hidden="true" /></i>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Waitlist() {
  const pageRef = useReveal();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<WaitlistSection>("character");
  const [activeTeaser, setActiveTeaser] = useState<TeaserId | null>(null);
  const [openFaqs, setOpenFaqs] = useState<Set<string>>(() => new Set());
  const requestedTab = new URLSearchParams(location.search).get("view");
  const view: HomeTabId = isHomeTab(requestedTab) ? requestedTab : "braino";
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

  // A film should never keep playing inside a question somebody just closed,
  // or one they have scrolled well past.
  useEffect(() => {
    if (!activeTeaser) return;
    const section = TEASER_SECTION[activeTeaser];
    if (!openFaqs.has(section) || section !== activeSection) setActiveTeaser(null);
  }, [activeSection, activeTeaser, openFaqs]);

  // Deep links (the notch nav, /#meetings, a card in the family answer) open the
  // question they point at instead of landing on a closed row.
  useEffect(() => {
    const id = location.hash.replace("#", "");
    const owner = QUESTION_TAB[id];
    if (!owner) return;
    // A link into a question on another tab moves the tab first, then opens it.
    if (owner !== view) {
      navigate(owner === "braino" ? `/${location.hash}` : `/?view=${owner}${location.hash}`, { replace: true });
      return;
    }
    setOpenFaqs((current) => (current.has(id) ? current : new Set(current).add(id)));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, view, navigate]);

  useEffect(() => {
    window.localStorage.setItem("braino-waitlist-theme", theme);
  }, [theme]);

  const toggleFaq = (id: string) => setOpenFaqs((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const changeTab = (next: HomeTabId) => {
    if (next === view) return;
    navigate(next === "braino" ? "/" : `/?view=${next}`);
    window.requestAnimationFrame(() => {
      document.getElementById("questions")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openFaq = (id: string) => {
    setOpenFaqs((current) => (current.has(id) ? current : new Set(current).add(id)));
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main className={`wl-page is-${theme}`} ref={pageRef}>
      <BrainoDefs />
      <IomiNotch
        nav={WAITLIST_NOTCH_NAV}
        tabs={HOME_TABS.map((tab) => ({ id: tab.id, label: tab.label, to: tab.id === "braino" ? "/" : `/?view=${tab.id}` }))}
        activeTab={view}
        sleepOnFirstVisit={false}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />

      <header className="wl-hero" id="top">
        <div className="wl-hero-layout">
          <div className="wl-hero-copy wl-reveal">
            <span className="wl-hero-eyebrow"><i /> A personal AI with a pulse</span>
            <h1>
              <span>Meet the</span>
              <strong>cutest AI agent</strong>
              <em>you’ll ever see.</em>
            </h1>
            <p className="wl-dek">Braino began in the browser. Now he is learning how to live across your Mac, your words and the rest of your digital life.</p>
            <div className="wl-hero-footnote">
              <span>One character.</span>
              <span>Everywhere you work.</span>
              <span>Click the notch eyes to explore.</span>
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

      <div className="wl-faq-head wl-reveal" id="questions">
        <span className="wl-faq-eyebrow">Everything about Braino</span>
        <h2>{TAB_HEADS[view].title}</h2>
        <p>{TAB_HEADS[view].sub}</p>
      </div>

      <nav className="wl-qtabs" aria-label="Which Braino">
        <div className="wl-qtabs-rail">
          {HOME_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`wl-qtab${tab.id === view ? " on" : ""}`}
              aria-current={tab.id === view ? "page" : undefined}
              onClick={() => changeTab(tab.id)}
            >
              <b>{tab.label}</b>
              <small>{tab.note}</small>
            </button>
          ))}
        </div>
      </nav>

      {view === "braino" ? (
      <article className="wl-article wl-faq">
        <FaqRow item={FAQ.character} open={openFaqs.has("character")} onToggle={toggleFaq}>
          <BrainoIntroduction id="" />
        </FaqRow>

        <FaqRow item={FAQ.kinds} open={openFaqs.has("kinds")} onToggle={toggleFaq}>
          <KindsAnswer onOpen={openFaq} />
        </FaqRow>

        <FaqRow item={FAQ.braino} open={openFaqs.has("braino")} onToggle={toggleFaq}>
          <section className="wl-chapter wl-reveal">
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
            <p className="wl-chapter-link">
              <Link to="/braino">See what the browser Braino does <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </p>
          </section>
        </FaqRow>

        <FaqRow item={FAQ.macos} open={openFaqs.has("macos")} onToggle={toggleFaq}>
          <section className="wl-chapter wl-reveal">
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
            <p className="wl-chapter-link">
              <Link to="/foundry">Meet Braino Foundry <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </p>
          </section>
        </FaqRow>

        <FaqRow item={FAQ.meetings} open={openFaqs.has("meetings")} onToggle={toggleFaq}>
          <section className="wl-chapter wl-reveal">
            <h2 className="wl-product-title">Recorded live. <span className="wl-shimmer wl-shimmer-browser">Invisible to your screen share.</span></h2>
            <p className="wl-large">Say it out loud and Braino records the meeting. No bot joins, nothing appears in the participant list, and your notes never show up in the screen you are sharing.</p>
            <p>Most meeting tools arrive as a guest: a notetaker in the participant list that somebody has to admit, and the first half minute of the call is about the software instead of the work. Braino listens from your Mac instead. He hears the call and he hears you as two separate streams, keeps them apart, and writes notes that say who said what.</p>
            <p>The part people ask about twice is the screen share. Braino records in the open, on your screen, where you can watch him work. The moment you present, that overlay is not in the picture. Your live notes stay yours without you remembering to hide anything.</p>
            <div className="wl-status"><span /><b>In active development</b><i>Mac and browser</i></div>
            <p className="wl-chapter-link">
              <Link to="/meetings">See how meetings work <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </p>
          </section>
        </FaqRow>

        <FaqRow item={FAQ["braino-os"]} open={openFaqs.has("braino-os")} onToggle={toggleFaq}>
          <section className="wl-chapter wl-reveal">
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
        </FaqRow>

        {/* Shared verbatim with Product Overview. */}
        <FaqRow item={FAQ.studio} open={openFaqs.has("studio")} onToggle={toggleFaq}>
          <BrainoStudioChapter id="" />
        </FaqRow>

        <FaqRow item={FAQ.hera} open={openFaqs.has("hera")} onToggle={toggleFaq}>
          <BrainoHeraChapter id="" />
        </FaqRow>
      </article>
      ) : (
        <article className="wl-article wl-faq">
          {ANSWERED_SETS[view].map(({ entry, answer }) => (
            <FaqRow key={entry.id} item={entry} open={openFaqs.has(entry.id)} onToggle={toggleFaq}>
              {answer}
            </FaqRow>
          ))}
          <div className="wl-faq-back wl-reveal in">
            <p>That is {TAB_HEADS[view].name}. <button type="button" onClick={() => changeTab("braino")}>Back to the introduction</button>, or try {view === "everything" ? <button type="button" onClick={() => changeTab("foundry")}>Foundry</button> : <button type="button" onClick={() => changeTab("everything")}>Everything</button>}.</p>
          </div>
        </article>
      )}

      <WaitlistJoin />

      <BrainoFooter />
    </main>
  );
}
