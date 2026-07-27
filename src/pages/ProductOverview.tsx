import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import EmotionHeart from "@/components/EmotionHeart";
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

// The MacBook screen as a scripted stage: boot → greet → "Press Control" →
// (you press) perimeter fires + he speaks → the Don't Blink teaser plays in
// the frame. Audio only after the Control gesture (browsers block autoplay).
type BootPhase = "boot" | "greet" | "prompt" | "activate" | "teaser";
function NotchBootHero() {
  const [phase, setPhase] = useState<BootPhase>("boot");
  const phaseRef = useRef<BootPhase>("boot");
  phaseRef.current = phase;

  const say = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(u);
    } catch { /* speech unavailable */ }
  };

  const activate = () => {
    if (phaseRef.current === "activate" || phaseRef.current === "teaser") return;
    setPhase("activate");
    say("I'll play my teaser for you.");
    window.setTimeout(() => setPhase("teaser"), 2100);
  };

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("greet"), 1500);
    const t2 = window.setTimeout(() => setPhase("prompt"), 3300);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "prompt") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Control") { e.preventDefault(); activate(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const caption =
    phase === "greet" ? "Hey. How you doing?" :
    phase === "activate" ? "I'll play my teaser for you." : "";
  const booting = phase === "activate" || phase === "teaser";

  return (
    <div className="apple-boot">
      <div
        className={"apple-macscreen apple-reveal" + (booting ? " booting" : "")}
        onClick={() => phase === "prompt" && activate()}
        role={phase === "prompt" ? "button" : undefined}
        aria-label={phase === "prompt" ? "Press Control, or click, to talk to Braino" : undefined}
      >
        <div className="apple-boot-perimeter" />
        {phase !== "teaser" && (
          <>
            <div className={"apple-macnotch" + (phase === "boot" ? " waking" : "")}>
              <span className="eye" /><span className="eye" />
            </div>
            {caption && <div className="apple-boot-caption">{caption}</div>}
            {phase === "prompt" && (
              <div className="apple-boot-prompt">
                Press <kbd>Control</kbd> to talk to Braino
              </div>
            )}
          </>
        )}
        {phase === "teaser" && (
          <video
            className="apple-boot-video"
            src="/Braino_Final.MP4"
            autoPlay playsInline controls
            onEnded={() => setPhase("prompt")}
          />
        )}
      </div>
    </div>
  );
}

const CLASSES = [
  { tag: "The companion class · first", name: "Saburi", accent: "ac-coral", face: "cls-saburi", to: "/saburi",
    copy: "The one you talk to — warm, present, genuinely his own person. He listens, remembers, and keeps you company." },
  { tag: "The OS class", name: "Iomi", accent: "ac-amber", face: "cls-iomi", to: "/iomi",
    copy: "Braino as the layer over everything — on your Mac, in your browser, in the notch. Always one glance away." },
  { tag: "The agent class", name: "Telos", accent: "ac-blue", face: "cls-telos", to: "/telos",
    copy: "Say the outcome and he does the clicking — the browser, the apps, the whole Mac, on your behalf." },
];

function ClassesGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mq = window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    const setH = () => { section.style.height = mq.matches ? "" : `${CLASSES.length * 92 + 40}vh`; };
    setH();
    const onScroll = () => {
      if (mq.matches) { track.style.transform = ""; return; }
      const rect = section.getBoundingClientRect();
      const runway = section.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / runway));
      const maxX = track.scrollWidth - window.innerWidth;
      track.style.transform = `translateX(${-progress * Math.max(0, maxX)}px)`;
    };
    const onResize = () => { setH(); onScroll(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);
  return (
    <section className="apple-hscroll ac-coral" id="classes" ref={sectionRef}>
      <div className="apple-hscroll-pin">
        <div className="apple-hscroll-head">
          <h2>He comes in <span className="tone">three classes.</span></h2>
          <p>One brain, three ways to live with you.</p>
        </div>
        <div className="apple-hscroll-viewport">
          <div className="apple-hscroll-track" ref={trackRef}>
            {CLASSES.map((c) => (
              <Link className={"apple-hcard " + c.accent} key={c.name} to={c.to} style={{ textDecoration: "none" }}>
                <span className="hc-tag">{c.tag}</span>
                <div className="hc-copy">
                  <h3 className={"hc-name " + c.face}>{c.name}</h3>
                  <p>{c.copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Word-by-word reveal — the Don't Blink typography feel: the sentence FORMS
// one word at a time as it scrolls into view. Segments let a phrase carry the
// accent colour. Respects reduced-motion (shows the whole line at once).
type WordSeg = { text: string; tone?: boolean };
function WordReveal({ segments, className }: { segments: WordSeg[]; className?: string }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  let wi = 0;
  return (
    <blockquote ref={ref} className={"apple-wordreveal" + (go ? " go" : "") + (className ? " " + className : "")}>
      {segments.map((seg, si) => (
        <span key={si} className={seg.tone ? "tone" : undefined}>
          {seg.text.split(" ").map((w, k) => (
            <span className="wr-word" key={k} style={{ transitionDelay: `${(wi++) * 55}ms` }}>{w}&nbsp;</span>
          ))}
        </span>
      ))}
    </blockquote>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
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

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);

const ProductOverview = () => {
  const ref = useReveal();
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ } }, [dark]);

  return (
    <div className={"apple" + (dark ? " dark" : "")} ref={ref}>
      <IomiNotch />

      {/* current-page anchor bar — stays visible alongside the notch */}
      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Braino</span>
          <div className="an-links">
            {ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <Link to="/premium" className="apple-cta">Get Braino</Link>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      <header className="apple-hero ac-coral" id="overview">
        <p className="apple-eyebrow">Braino</p>
        <h1 className="apple-display">Not an app.<br /><span className="tone">A someone.</span></h1>
        <p className="apple-subhead">
          Braino lives on your Mac. He sees your screen, talks in his own voice, and does the
          work alongside you — a companion, not a chatbot in a tab.
        </p>
        <div className="apple-hero-links">
          <a href="#what">What is Braino</a>
          <Link to="/premium">Get Braino</Link>
        </div>
      </header>

      {/* MacBook-screen notch boot */}
      <NotchBootHero />

      {/* Why it exists — founder voice, right below the teaser */}
      <section className="apple-editorial ac-coral apple-reveal" style={{ gridTemplateColumns: "1fr" }}>
        <div className="ed-copy" style={{ maxWidth: 840 }}>
          <p className="ed-eyebrow">Why it exists</p>
          <WordReveal segments={[
            { text: "I didn't want another chatbot in a tab. I wanted" },
            { text: "someone who's actually there", tone: true },
            { text: "— who sees your screen, remembers your day, and feels like a presence, not a product." },
          ]} />
          <cite style={{ display: "block", marginTop: 20, fontStyle: "normal", fontSize: 15, fontWeight: 500, color: "var(--ap-ink-soft)" }}>
            Itish Pande · founder, Braino
          </cite>
        </div>
      </section>

      {/* What is Braino — left copy, graphic right */}
      <section className="apple-editorial ac-coral" id="what">
        <div className="ed-copy apple-reveal">
          <p className="ed-eyebrow">So, what is Braino?</p>
          <h2 className="ed-h">A presence that <span className="tone">lives in the notch.</span></h2>
          <p>Glance up and he's there. Say a word and he's listening. Look away and he rests —
            a companion woven into your Mac, not a window you open.</p>
          <a className="ed-more" href="#classes">Meet the three classes</a>
        </div>
        <div className="ed-art apple-reveal">
          <svg viewBox="0 0 260 150" role="img" aria-label="Braino in the notch">
            <rect x="55" y="0" width="150" height="52" rx="16" fill="#111" />
            <circle cx="112" cy="24" r="9" fill="#fff" /><circle cx="112" cy="24" r="4" fill="#111" />
            <circle cx="148" cy="24" r="9" fill="#fff" /><circle cx="148" cy="24" r="4" fill="#111" />
            <rect x="20" y="82" width="220" height="46" rx="13" fill="var(--ap-surface)" stroke="var(--ap-hairline)" />
            <rect x="40" y="98" width="150" height="6" rx="3" fill="var(--ap-coral)" opacity="0.35" />
            <rect x="40" y="112" width="96" height="6" rx="3" fill="var(--ap-coral)" opacity="0.2" />
          </svg>
        </div>
      </section>

      {/* The bet — founder-voice editorial, graphic right */}
      <section className="apple-editorial reverse ac-green apple-reveal">
        <div className="ed-copy">
          <p className="ed-eyebrow">The bet</p>
          <h2 className="ed-h">Built by one person, <span className="tone">obsessively.</span></h2>
          <p>No lab, no war chest, no fifty-person team. Just a brain in a notch who blinks, an
            emotional engine nobody else bothered to build, and a founder who is not okay in
            exactly the way this work requires.</p>
          <Link className="ed-more" to="/n">Read the founder's letter</Link>
        </div>
        <div className="ed-art">
          <svg viewBox="0 0 240 200" role="img" aria-label="One brain, many surfaces">
            <circle cx="120" cy="100" r="26" fill="none" stroke="var(--ap-green)" strokeWidth="2.5" />
            <circle cx="120" cy="100" r="9" fill="var(--ap-green)" />
            {[0,1,2,3,4,5].map((k) => {
              const a = (k / 6) * Math.PI * 2; const x = 120 + Math.cos(a) * 74; const y = 100 + Math.sin(a) * 62;
              return <g key={k}><line x1="120" y1="100" x2={x} y2={y} stroke="var(--ap-green)" strokeWidth="1.2" opacity="0.4" /><circle cx={x} cy={y} r="10" fill="none" stroke="var(--ap-green)" strokeWidth="2" /></g>;
            })}
          </svg>
        </div>
      </section>

      {/* The three classes — horizontal-scroll gallery */}
      <ClassesGallery />

      {/* Emotion engine — PREVIEW, graphic left, copy right; read more into the class */}
      <section className="apple-editorial reverse ac-violet" id="engine">
        <div className="ed-copy apple-reveal">
          <p className="ed-eyebrow">The emotion engine</p>
          <h2 className="ed-h">A real personality, <span className="tone">wired to react.</span></h2>
          <p>Twelve trait modules reorder on every message — so he meets grief differently than
            banter. This is a glimpse of the heart. The full engine lives inside Saburi.</p>
          <Link className="ed-more" to="/saburi">Read how he feels</Link>
        </div>
        <div className="ed-art bare apple-reveal">
          <EmotionHeart />
        </div>
      </section>

      {/* Spec row */}
      <div className="apple-specs ac-coral">
        <div className="apple-spec">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.7"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Voice-first.</span> Talk to him like a person — he answers in his own voice.</p>
        </div>
        <div className="apple-spec ac-green">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Sees your screen.</span> On-device, on demand — never streaming, never stored.</p>
        </div>
        <div className="apple-spec ac-blue">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <p><span className="k">Does the work.</span> Meetings, mail, shopping, files — hands, not just answers.</p>
        </div>
      </div>

      <footer className="apple-foot">
        Braino for Mac. Private on-device transcription, screen awareness on demand, and a personality
        that's actually his. <Link to="/premium" style={{ color: "var(--ap-blue)" }}>Get Braino ›</Link>
      </footer>
    </div>
  );
};

export default ProductOverview;
