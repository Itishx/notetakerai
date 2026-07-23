import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, BookOpen, Film, ImageIcon, Shield, Sparkles } from "lucide-react";
import { BRAINO_WALKER_SVG } from "../components/brainoWalkerSvg";
import { GradientBackground } from "../components/ui/paper-design-shader-background";

type ScriptSection = {
  id: string;
  label: string;
  title: string;
  eyebrow: string;
  paragraphs: string[];
  quote?: string;
  bullets?: string[];
  sourceKeys: SourceKey[];
  imageNote: string;
};

type SourceKey = "marvelProfile" | "damageControl" | "noWayHomeEnding" | "brandNewDayTrailer" | "sony";

const SOURCES: Record<SourceKey, { label: string; href: string }> = {
  marvelProfile: {
    label: "Marvel Spider-Man profile",
    href: "https://www.marvel.com/characters/spider-man-peter-parker/on-screen",
  },
  damageControl: {
    label: "Marvel Damage Control guide",
    href: "https://www.marvel.com/articles/comics/damage-control-comics-history-dodc-mcu-appearances",
  },
  noWayHomeEnding: {
    label: "Marvel No Way Home ending interview",
    href: "https://www.marvel.com/articles/movies/spider-man-no-way-home-tom-holland-zendaya-bittersweet-ending",
  },
  brandNewDayTrailer: {
    label: "Marvel Brand New Day trailer article",
    href: "https://www.marvel.com/articles/movies/spider-man-brand-new-day-full-official-trailer-july-2026",
  },
  sony: {
    label: "Sony Pictures Brand New Day page",
    href: "https://www.sonypictures.com/movies/spidermanbrandnewday",
  },
};

const SCRIPT_SECTIONS: ScriptSection[] = [
  {
    id: "civil-war",
    label: "Script 01",
    eyebrow: "Captain America: Civil War",
    title: "Peter meets Tony Stark",
    paragraphs: [
      "Tony Stark discovers that teenager Peter Parker is Spider-Man, gives him an advanced suit, and recruits him for the Avengers airport battle.",
      "From there, Tony becomes Peter's mentor and almost a father figure. This is the connection that pulls Peter out of Queens and into the larger superhero world.",
    ],
    sourceKeys: ["marvelProfile"],
    imageNote: "Image slot after Script 01: airport battle reference, Stark suit beat, or Braino opening the MCU file.",
  },
  {
    id: "homecoming",
    label: "Script 02",
    eyebrow: "Spider-Man: Homecoming",
    title: "Peter becomes his own hero",
    paragraphs: [
      "Peter desperately wants Tony's approval and tries to stop the Vulture. Tony eventually takes away the suit, but Peter defeats Vulture using his homemade equipment.",
      "That proves the important point: the hero matters more than the technology. Peter then rejects immediate Avengers membership and chooses to remain a neighborhood-level Spider-Man.",
      "Also remember Mac Gargan, a criminal injured during Peter's ferry operation who ends the movie in prison wanting revenge.",
    ],
    sourceKeys: ["marvelProfile"],
    imageNote: "Image slot after Script 02: homemade suit, Vulture aftermath, ferry incident, or Gargan prison tease.",
  },
  {
    id: "infinity-endgame",
    label: "Script 03",
    eyebrow: "Infinity War and Endgame",
    title: "Peter loses his mentor",
    paragraphs: [
      "Peter fights Thanos alongside Tony, disappears during the Snap, and returns five years later.",
      "Tony then sacrifices himself to defeat Thanos. Peter survives, but loses the person who introduced him to the superhero world and supplied most of his technology.",
    ],
    sourceKeys: ["marvelProfile"],
    imageNote: "Image slot after Script 03: Titan recap, Snap visual, Tony memorial, or Peter looking at Stark tech.",
  },
  {
    id: "far-from-home",
    label: "Script 04",
    eyebrow: "Spider-Man: Far From Home",
    title: "Peter's identity is exposed",
    paragraphs: [
      "While grieving Tony, Peter is manipulated by Quentin Beck, also known as Mysterio.",
      "Peter defeats him, but Mysterio releases edited footage blaming Spider-Man for the destruction and publicly reveals the secret that changes Peter's life.",
      "Peter and MJ also become a couple during this movie.",
    ],
    quote: "Spider-Man is Peter Parker.",
    sourceKeys: ["damageControl"],
    imageNote: "Image slot after Script 04: Mysterio broadcast, Daily Bugle screen, MJ and Peter, or identity reveal card.",
  },
  {
    id: "no-way-home",
    label: "Script 05",
    eyebrow: "Spider-Man: No Way Home",
    title: "Peter loses everything",
    paragraphs: [
      "Peter asks Doctor Strange to make everyone forget that he is Spider-Man. The spell goes wrong, bringing villains and two other versions of Spider-Man from different universes.",
      "To repair reality, Peter allows Doctor Strange to make everyone forget Peter Parker exists. MJ and Ned remain alive, but no longer remember him.",
      "Peter decides not to tell them because their lives appear safer without him. He ends the movie completely alone, living in a small apartment and using a homemade Spider-Man suit instead of Stark technology.",
    ],
    bullets: [
      "Aunt May is killed.",
      "Peter nearly kills Green Goblin but stops himself.",
      "Everyone forgets Peter Parker exists.",
      "MJ and Ned move forward without remembering him.",
    ],
    sourceKeys: ["noWayHomeEnding"],
    imageNote: "Image slot after Script 05: memory spell, coffee shop ending, apartment window, or homemade suit reveal.",
  },
  {
    id: "brand-new-day",
    label: "Script 06",
    eyebrow: "Spider-Man: Brand New Day",
    title: "The new movie begins from that loneliness",
    paragraphs: [
      "Brand New Day takes place four years after No Way Home. Peter is now an adult living entirely alone, while MJ and Ned have moved forward without remembering him.",
      "He has devoted his entire life to being a full-time Spider-Man. That pressure causes a mysterious physical evolution Peter may not be able to control, while New York faces a powerful unseen enemy.",
    ],
    sourceKeys: ["brandNewDayTrailer", "sony"],
    imageNote: "Image slot after Script 06: new suit placeholder, New York threat board, unseen enemy motif, or final poster beat.",
  },
];

const EXTRA_CHARACTERS = [
  {
    name: "Bruce Banner / Hulk",
    body: "Avengers scientist who can become Hulk and currently has Hulk's strength with Banner's intelligence.",
    imageLabel: "Bruce Banner / Hulk image",
  },
  {
    name: "Frank Castle / Punisher",
    body: "A traumatised former soldier who fights criminals using lethal violence, the opposite of Peter's refusal to kill.",
    imageLabel: "Frank Castle / Punisher image",
  },
  {
    name: "Mac Gargan",
    body: "The criminal from Homecoming who blames Spider-Man for his injuries and wants revenge. Michael Mando, who played Gargan, is in the new film's cast.",
    imageLabel: "Mac Gargan image",
  },
];

const SPIDEY_INVITE_LINE = "Hi, I am Braino. Would you like to watch Spider-Man BrandNewDay with me?";
const TOUR_RAIL_LABELS = [
  "Civil War",
  "Homecoming",
  "IW / Endgame",
  "Far From Home",
  "No Way Home",
  "Brand New Day",
  "Key Things",
  "People",
  "Watch Order",
];
const TOUR_TOTAL = TOUR_RAIL_LABELS.length;
const KEY_TAKEAWAYS = [
  "Tony Stark is gone, so Peter no longer has his mentor or Stark technology carrying him.",
  "Everyone forgot Peter Parker exists, including MJ and Ned.",
  "Peter is alone, older, and choosing to be Spider-Man full-time.",
];
const SWINGING_BRAINO_HTML = BRAINO_WALKER_SVG
  .replace(/sbwk-/g, "bndSwing-")
  .replace(/sbb-/g, "bndSwing-");
const GLASS_FILTER_SVG = `<defs><filter id="__bnd_glass_filter__" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/><feComponentTransfer in="turbulence" result="mapped"><feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/><feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/><feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/></feComponentTransfer><feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/><feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight"><fePointLight x="-200" y="-200" z="300"/></feSpecularLighting><feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/><feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

function SpideyWalkerMask() {
  return (
    <svg className="bnd-walker-mask" viewBox="-8 -34 116 142" aria-hidden="true">
      <defs>
        <linearGradient id="bndWalkerMaskRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4d4d" />
          <stop offset="0.55" stopColor="#d9182e" />
          <stop offset="1" stopColor="#9d1022" />
        </linearGradient>
        <linearGradient id="bndWalkerLens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dce9ff" />
        </linearGradient>
      </defs>
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="white"
        transform="scale(1.08) translate(-3.7,-3.7)"
      />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#bndWalkerMaskRed)"
        stroke="#111827"
        strokeWidth="1.2"
      />
      <g fill="none" stroke="#220611" strokeWidth="1" strokeLinecap="round" opacity="0.68">
        <path d="M 50 9 L 50 76" />
        <path d="M 29 15 Q 40 38 29 72" />
        <path d="M 71 15 Q 60 38 71 72" />
        <path d="M 18 27 Q 50 34 82 27" />
        <path d="M 14 43 Q 50 52 86 43" />
        <path d="M 19 58 Q 50 66 81 58" />
        <path d="M 31 12 Q 44 29 50 48 Q 56 29 69 12" />
        <path d="M 21 24 Q 35 39 50 48 Q 65 39 79 24" />
        <path d="M 17 43 Q 33 46 50 48 Q 67 46 83 43" />
      </g>
      <path d="M 25 45 C 29 34 42 35 48 45 C 43 57 30 58 23 50 Z" fill="#101827" />
      <path d="M 75 45 C 71 34 58 35 52 45 C 57 57 70 58 77 50 Z" fill="#101827" />
      <path d="M 28 45 C 32 38 40 39 44 46 C 40 53 31 54 27 49 Z" fill="url(#bndWalkerLens)" />
      <path d="M 72 45 C 68 38 60 39 56 46 C 60 53 69 54 73 49 Z" fill="url(#bndWalkerLens)" />
      <path d="M 44 63 Q 50 68 56 63" fill="none" stroke="#170711" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function TourRail({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="bnd-script-rail" aria-label={`Card ${activeIndex + 1} of ${TOUR_TOTAL}`}>
      {TOUR_RAIL_LABELS.map((label, railIndex) => (
        <span
          key={label}
          className={`${railIndex === activeIndex ? "is-active" : ""}${railIndex < activeIndex ? " is-done" : ""}`}
        >
          <b>{String(railIndex + 1).padStart(2, "0")}</b>
          <em>{label}</em>
        </span>
      ))}
    </div>
  );
}

function MovieGlassCard({ section, index }: { section: ScriptSection; index: number }) {
  return (
    <div className="bnd-movie-card">
      <div className="bnd-movie-card-top">
        <span>Card {String(index + 1).padStart(2, "0")} / {String(TOUR_TOTAL).padStart(2, "0")}</span>
        <span>{section.eyebrow}</span>
      </div>
      <TourRail activeIndex={index} />
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.quote && <blockquote>{section.quote}</blockquote>}
      {section.bullets && (
        <ul>
          {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
      <div className="bnd-movie-image-note">
        <ImageIcon size={16} />
        <span>{section.imageNote}</span>
      </div>
    </div>
  );
}

function KeyTakeawaysGlassCard() {
  const activeIndex = SCRIPT_SECTIONS.length;
  return (
    <div className="bnd-movie-card">
      <div className="bnd-movie-card-top">
        <span>Card {String(activeIndex + 1).padStart(2, "0")} / {String(TOUR_TOTAL).padStart(2, "0")}</span>
        <span>Carry these into the movie</span>
      </div>
      <TourRail activeIndex={activeIndex} />
      <h2>Three key things to remember</h2>
      <ul>
        {KEY_TAKEAWAYS.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="bnd-movie-image-note">
        <ImageIcon size={16} />
        <span>Image slot: Peter alone in New York, homemade suit, MJ and Ned memory reset, or Braino pinning the three reminders.</span>
      </div>
    </div>
  );
}

function PeopleGlassCard() {
  const activeIndex = SCRIPT_SECTIONS.length + 1;
  return (
    <div className="bnd-movie-card">
      <div className="bnd-movie-card-top">
        <span>Card {String(activeIndex + 1).padStart(2, "0")} / {String(TOUR_TOTAL).padStart(2, "0")}</span>
        <span>Three people to recognise</span>
      </div>
      <TourRail activeIndex={activeIndex} />
      <h2>Three people your friend should know</h2>
      <div className="bnd-people-grid">
        {EXTRA_CHARACTERS.map((character) => (
          <article key={character.name}>
            <div className="bnd-mini-image">
              <ImageIcon size={15} />
              <span>{character.imageLabel}</span>
            </div>
            <strong>{character.name}</strong>
            <p>{character.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function WatchOrderGlassCard() {
  const activeIndex = SCRIPT_SECTIONS.length + 2;
  return (
    <div className="bnd-movie-card">
      <div className="bnd-movie-card-top">
        <span>Card {String(activeIndex + 1).padStart(2, "0")} / {String(TOUR_TOTAL).padStart(2, "0")}</span>
        <span>Least-overwhelming prep</span>
      </div>
      <TourRail activeIndex={activeIndex} />
      <h2>Least-overwhelming watch order</h2>
      <ul>
        <li><strong>Best prep:</strong> Homecoming - short Infinity War / Endgame recap - Far From Home - No Way Home.</li>
        <li><strong>Absolute minimum:</strong> Far From Home - No Way Home.</li>
        <li><strong>Most important:</strong> No Way Home, because Brand New Day begins from the emotional consequences of its ending.</li>
      </ul>
      <div className="bnd-movie-image-note">
        <ImageIcon size={16} />
        <span>Image slot: simple watch-order strip, movie poster placeholders, or Braino holding the final checklist.</span>
      </div>
    </div>
  );
}

function TourGlassCard({ index }: { index: number }) {
  if (index < SCRIPT_SECTIONS.length) {
    return <MovieGlassCard section={SCRIPT_SECTIONS[index]} index={index} />;
  }
  if (index === SCRIPT_SECTIONS.length) return <KeyTakeawaysGlassCard />;
  if (index === SCRIPT_SECTIONS.length + 1) return <PeopleGlassCard />;
  return <WatchOrderGlassCard />;
}

function getTourSpeech(index: number) {
  if (index < SCRIPT_SECTIONS.length) return SCRIPT_SECTIONS[index].title;
  if (index === SCRIPT_SECTIONS.length) return "Three key things to remember.";
  if (index === SCRIPT_SECTIONS.length + 1) return "Three people your friend should know.";
  return "Here is the least-overwhelming watch order.";
}

function getTourStepId(index: number) {
  if (index < SCRIPT_SECTIONS.length) return SCRIPT_SECTIONS[index].id;
  if (index === SCRIPT_SECTIONS.length) return "key-takeaways";
  if (index === SCRIPT_SECTIONS.length + 1) return "people-to-know";
  return "watch-order";
}

function SpideyInviteGate({ onAccept }: { onAccept: () => void }) {
  void onAccept;
  const walkerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const talkRef = useRef(false);
  const flyingRef = useRef(false);
  const talkTimerRef = useRef<number | undefined>(undefined);
  const [phase, setPhase] = useState<"ask" | "recap" | "done">("ask");
  const [step, setStep] = useState(0);
  const [spideyMode, setSpideyMode] = useState(false);

  const sayLine = (text: string, ms = 3200) => {
    const say = sayRef.current;
    if (!say) return;
    say.classList.remove("show");
    say.textContent = text;
    window.clearTimeout(talkTimerRef.current);
    window.setTimeout(() => {
      sayRef.current?.classList.add("show");
      talkRef.current = true;
      talkTimerRef.current = window.setTimeout(() => { talkRef.current = false; }, ms);
    }, 110);
  };

  const showBarInput = (placeholder: string) => {
    const bar = barRef.current;
    const input = inputRef.current;
    bar?.classList.remove("bg-tour", "sb-climb");
    if (input) {
      input.value = "";
      input.placeholder = placeholder;
      window.setTimeout(() => input.focus(), 80);
    }
  };

  useEffect(() => {
    const walker = walkerRef.current;
    const bar = barRef.current;
    const say = sayRef.current;
    if (!walker || !bar || !say) return;

    const root = walker.querySelector("#__sbwk_root__") as SVGGElement | null;
    const flip = walker.querySelector("#__sbwk_flip__") as HTMLElement | null;
    if (!root) return;
    if (flip) flip.style.transform = "scaleX(1)";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    bar.classList.add("open", "sb-climb");

    const q = (sel: string) => root.querySelector(sel) as SVGElement | null;
    const el = {
      la: q("#__sbwk_la__"),
      laBg: q("#__sbwk_la_bg__"),
      ra: q("#__sbwk_ra__"),
      raBg: q("#__sbwk_ra_bg__"),
      ll: q("#__sbwk_ll__"),
      rl: q("#__sbwk_rl__"),
      eyeL: q("#__sbwk_eye_l__"),
      eyeR: q("#__sbwk_eye_r__"),
      pupL: q("#__sbwk_pupil_l__"),
      pupR: q("#__sbwk_pupil_r__"),
      smile: q("#__sbwk_smile__"),
      talk: q("#__sbwk_talk__"),
      te: q("#__sbwk_te__"),
      ti: q("#__sbwk_ti__"),
    };

    const setArms = (l: number, r: number) => {
      const lt = l ? `rotate(${l} 22 53)` : "";
      const rt = r ? `rotate(${r} 78 53)` : "";
      el.la?.setAttribute("transform", lt);
      el.laBg?.setAttribute("transform", lt);
      el.ra?.setAttribute("transform", rt);
      el.raBg?.setAttribute("transform", rt);
    };
    const setLegs = (l: number, r: number) => {
      el.ll?.setAttribute("transform", l ? `rotate(${l} 44 74)` : "");
      el.rl?.setAttribute("transform", r ? `rotate(${r} 56 74)` : "");
    };
    const setEyes = (sy: number) => {
      const v = Math.max(0.05, sy);
      el.eyeL?.setAttribute("transform", `translate(38,48) scale(1,${v}) translate(-38,-48)`);
      el.eyeR?.setAttribute("transform", `translate(62,48) scale(1,${v}) translate(-62,-48)`);
    };
    const setGaze = (gx: number, gy: number) => {
      el.pupL?.setAttribute("transform", `translate(${gx} ${gy})`);
      el.pupR?.setAttribute("transform", `translate(${gx} ${gy})`);
    };
    const animateMouth = (now: number) => {
      if (talkRef.current) {
        const open = 0.5 + 0.5 * Math.sin(now / 68);
        el.smile?.style.setProperty("display", "none");
        el.talk?.style.setProperty("display", "block");
        el.te?.setAttribute("rx", String(3.6 - open * 0.4));
        el.te?.setAttribute("ry", String(1.5 + open * 4.2));
        el.ti?.style.setProperty("display", open > 0.32 ? "block" : "none");
      } else {
        el.smile?.style.removeProperty("display");
        el.talk?.style.setProperty("display", "none");
      }
    };

    const barRect = bar.getBoundingClientRect();
    const perchX = barRect.left + barRect.width / 2 - 32;
    const perchTop = barRect.top - 84;
    const floorTy = 84;
    const startTy = Math.max(170, window.innerHeight + 40 - perchTop);
    const entryX = Math.max(6, perchX - 150);
    const place = (x: number, ty: number) => { walker.style.transform = `translate(${x}px, ${perchTop + ty}px)`; };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    let raf = 0;
    let phaseName = "pop";
    let phaseStart = performance.now();
    let perched = false;
    let blinkAt = performance.now() + 2600;
    const next = (name: string) => { phaseName = name; phaseStart = performance.now(); };
    const onPerched = () => {
      if (perched) return;
      perched = true;
      walker.classList.add("bg-glow");
      window.setTimeout(() => {
        say.textContent = SPIDEY_INVITE_LINE;
        say.classList.add("show");
        talkRef.current = true;
        window.clearTimeout(talkTimerRef.current);
        talkTimerRef.current = window.setTimeout(() => { talkRef.current = false; }, 2600);
      }, 280);
      window.setTimeout(() => {
        walker.classList.remove("bg-glow");
        bar.classList.remove("sb-climb");
        inputRef.current?.focus();
      }, 1000);
    };

    place(entryX, startTy);
    setArms(0, 0);
    setLegs(0, 0);
    setEyes(1);
    setGaze(0, -0.55);

    const tick = (now: number) => {
      if (flyingRef.current) {
        animateMouth(now);
        raf = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - phaseStart;
      if (phaseName === "pop") {
        const k = easeOut(Math.min(1, elapsed / 1700));
        place(entryX, lerp(startTy, floorTy, k));
        setGaze(0, -0.4);
        if (k >= 1) next("walk");
      } else if (phaseName === "walk") {
        const k = Math.min(1, elapsed / 1900);
        place(lerp(entryX, perchX, ease(k)), floorTy);
        const s = (elapsed / 1000) * 7.5;
        setLegs(Math.max(0, Math.sin(s)) * 16, Math.max(0, Math.sin(s + Math.PI)) * 16);
        setGaze(1.6, 0);
        if (k >= 1) { setLegs(0, 0); next("reach"); }
      } else if (phaseName === "reach") {
        const k = ease(Math.min(1, elapsed / 850));
        place(perchX, floorTy - lerp(0, 6, k));
        setArms(lerp(0, -122, k), lerp(0, 122, k));
        setGaze(0, -0.8);
        if (k >= 1) next("grip");
      } else if (phaseName === "grip") {
        const k = ease(Math.min(1, elapsed / 1050));
        place(perchX, lerp(floorTy - 6, floorTy - 44, k));
        setArms(lerp(-122, -100, k), lerp(122, 100, k));
        setLegs(lerp(0, 18, k), lerp(0, 18, k));
        if (k >= 1) next("mantle");
      } else if (phaseName === "mantle") {
        const k = ease(Math.min(1, elapsed / 1050));
        place(perchX, lerp(floorTy - 44, 0, k));
        setArms(lerp(-100, -26, k), lerp(100, 26, k));
        setLegs(lerp(18, 0, easeOut(k)), lerp(18, 0, easeOut(k)));
        if (k >= 1) { setArms(0, 0); setLegs(0, 0); next("perch"); }
      } else {
        place(perchX, 0);
        setArms(0, -28 + Math.sin(elapsed / 45) * 18);
        setGaze(0, 0);
        if (now > blinkAt) {
          const bk = (now - blinkAt) / 120;
          setEyes(bk < 1 ? 1 - bk : bk < 2 ? bk - 1 : (blinkAt = now + 2600 + Math.random() * 2600, 1));
        }
        onPerched();
      }
      animateMouth(now);
      raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      place(perchX, 0);
      setArms(0, 0);
      setLegs(0, 0);
      setEyes(1);
      setGaze(0, 0);
      phaseName = "perch";
      phaseStart = performance.now();
      onPerched();
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(talkTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecap = () => {
    const walker = walkerRef.current;
    if (walker) {
      const rect = walker.getBoundingClientRect();
      walker.style.setProperty("--bnd-fly-start-x", `${rect.left}px`);
      walker.style.setProperty("--bnd-fly-start-y", `${rect.top}px`);
      walker.classList.add("bg-glow");
    }
    setSpideyMode(true);
    sayLine("Correct. Suiting up.", 1800);
    const bar = barRef.current;
    if (bar) bar.classList.add("sb-climb");
    window.setTimeout(() => {
      flyingRef.current = true;
      sayRef.current?.classList.remove("show");
      if (walker) {
        walker.style.transform = "";
        (walker.querySelector("#__sbwk_flip__") as HTMLElement | null)?.style.removeProperty("transform");
        ["#__sbwk_ra__", "#__sbwk_ra_bg__", "#__sbwk_la__", "#__sbwk_la_bg__", "#__sbwk_ll__", "#__sbwk_rl__"].forEach((selector) => {
          walker.querySelector(selector)?.removeAttribute("transform");
        });
        walker.classList.remove("bg-glow");
        walker.classList.add("bg-flying");
      }
    }, 780);
    window.setTimeout(() => {
      bar?.classList.remove("sb-climb");
      bar?.classList.add("bg-tour");
      setPhase("recap");
      setStep(0);
      sayLine("Okay. Here is the Peter Parker file.", 3600);
    }, 1180);
  };

  const advance = () => {
    if (step < TOUR_TOTAL - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      sayLine(getTourSpeech(nextStep), 3200);
      return;
    }
    setPhase("done");
    showBarInput("Any doubts? Type here...");
    sayLine("Any doubts, or would you like to go ahead?", 4300);
  };

  const onBarBtn = () => {
    const input = inputRef.current;
    const value = (input?.value || "").trim().toLowerCase();
    if (phase === "recap") {
      advance();
      return;
    }
    if (phase === "done") {
      sayLine(value ? "Noted. We are ready for Brand New Day." : "Say it here. I am listening.", 3200);
      if (input) input.value = "";
      return;
    }
    if (value === "yes" || value === "y" || value === "yeah" || value === "yep") {
      if (input) input.value = "";
      startRecap();
      return;
    }
    sayLine("Invalid response. Try yes.", 2800);
    if (input) input.value = "";
  };

  const onCardDown = (event: ReactPointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.transform = "none";
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    dragRef.current = { x: event.clientX, y: event.clientY, ox: rect.left, oy: rect.top };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* noop */ }
  };

  const onCardMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const card = cardRef.current;
    if (!drag || !card) return;
    card.style.left = `${Math.max(8, Math.min(window.innerWidth - 120, drag.ox + (event.clientX - drag.x)))}px`;
    card.style.top = `${Math.max(8, Math.min(window.innerHeight - 90, drag.oy + (event.clientY - drag.y)))}px`;
  };

  const onCardUp = (event: ReactPointerEvent<HTMLElement>) => {
    dragRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* noop */ }
  };

  const cardOpen = phase === "recap";

  return (
    <section className={`bnd-gate bnd-movie-tour${spideyMode ? " is-spidey" : ""}`} aria-label="Spider-Man Brand New Day tour">
      <GradientBackground />
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLASS_FILTER_SVG }} />

      <div ref={cardRef} className={`bg-card${cardOpen ? " show" : ""}`} aria-hidden={!cardOpen}>
        <div
          className="bg-card-grab"
          onPointerDown={onCardDown}
          onPointerMove={onCardMove}
          onPointerUp={onCardUp}
          onPointerCancel={onCardUp}
        >
          Spider-Braino file
        </div>
        <div className="bg-card-scroll">
          <div key={getTourStepId(step)} className="bg-pop">
            <TourGlassCard index={step} />
          </div>
        </div>
      </div>

      <div className="bg-lane">
        <div ref={walkerRef} className="bg-walker">
          <div ref={sayRef} id="__sbwk_say__">{SPIDEY_INVITE_LINE}</div>
          <span className="bnd-tour-web bnd-tour-web-one" />
          <span className="bnd-tour-web bnd-tour-web-two" />
          <span className="bnd-tour-web-spark" />
          <div id="__sbwk_flip__" dangerouslySetInnerHTML={{ __html: SWINGING_BRAINO_HTML }} />
          <span className="bnd-tour-mask"><SpideyWalkerMask /></span>
        </div>
      </div>

      <div ref={barRef} id="__sb_bar__" data-step={phase === "recap" ? `Card ${step + 1} of ${TOUR_TOTAL}` : ""}>
        <input
          ref={inputRef}
          id="__sb_input__"
          placeholder="Type yes or no..."
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onBarBtn();
            }
          }}
        />
        <button className="sb-bar-icon-btn" title="Continue" onClick={onBarBtn} aria-label="Continue">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
        </button>
      </div>
    </section>
  );
}

function SpideyRecapDeck() {
  const [index, setIndex] = useState(0);
  const section = SCRIPT_SECTIONS[index];
  const isLast = index === SCRIPT_SECTIONS.length - 1;

  return (
    <div className="bnd-recap-shell" aria-label="Interactive Brand New Day recap">
      <div className="bnd-recap-topline">
        <span>Braino recap</span>
        <span>{String(index + 1).padStart(2, "0")} / {String(SCRIPT_SECTIONS.length).padStart(2, "0")}</span>
      </div>
      <div className="bnd-recap-card" key={section.id}>
        <div className="bnd-recap-eyebrow">{section.eyebrow}</div>
        <h2>{section.title}</h2>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.quote && <blockquote>{section.quote}</blockquote>}
        {section.bullets && (
          <ul>
            {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        )}
        <div className="bnd-recap-image">
          <ImageIcon size={18} />
          <span>{section.imageNote}</span>
        </div>
      </div>
      <div className="bnd-recap-controls">
        <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (isLast) document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
            else setIndex((value) => Math.min(SCRIPT_SECTIONS.length - 1, value + 1));
          }}
        >
          {isLast ? "Open full file" : "Next beat"}
        </button>
      </div>
    </div>
  );
}

function ImageSlot({ note, index }: { note: string; index: number }) {
  return (
    <div className="bnd-image-slot" aria-label={`Image placeholder ${index + 1}`}>
      <div className="bnd-image-grid" />
      <div className="bnd-image-content">
        <ImageIcon size={28} />
        <span>Image placeholder</span>
        <p>{note}</p>
      </div>
    </div>
  );
}

function ScriptCard({ section, index }: { section: ScriptSection; index: number }) {
  return (
    <article className="bnd-script-card" id={section.id}>
      <div className="bnd-script-meta">
        <span>{section.label}</span>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="bnd-script-eyebrow">{section.eyebrow}</div>
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.quote && <blockquote>{section.quote}</blockquote>}
      {section.bullets && (
        <ul>
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      <div className="bnd-card-sources" aria-label="Sources">
        {section.sourceKeys.map((key) => (
          <a key={key} href={SOURCES[key].href} target="_blank" rel="noreferrer">
            {SOURCES[key].label}
          </a>
        ))}
      </div>
    </article>
  );
}

function TimelineEntry({ section, index }: { section: ScriptSection; index: number }) {
  return (
    <div className={`bnd-entry${index % 2 === 1 ? " bnd-entry-flip" : ""}`}>
      <div className="bnd-entry-copy">
        <ScriptCard section={section} index={index} />
      </div>
      <div className="bnd-entry-figure">
        <ImageSlot note={section.imageNote} index={index} />
      </div>
    </div>
  );
}

const CSS = `
body.bnd-active {
  background: #f5f7fb;
}
body.bnd-active #sb-brain-mascot-wrapper {
  display: none !important;
}
.bnd-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #101827;
  font-family: NeueHaas, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.bnd-hero {
  position: relative;
  min-height: 88svh;
  overflow: hidden;
  display: grid;
  align-items: center;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 68px),
    linear-gradient(60deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 72px),
    linear-gradient(180deg, #07111f 0%, #0a1d3a 64%, #f5f7fb 64%);
}
.bnd-hero-inner {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
  gap: clamp(28px, 5vw, 74px);
  align-items: center;
  padding: 76px 0 96px;
}
.bnd-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  color: #d9e8ff;
  border: 1px solid rgba(217, 232, 255, 0.24);
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.bnd-hero h1 {
  margin: 22px 0 18px;
  color: #ffffff;
  font-size: clamp(48px, 8.2vw, 118px);
  line-height: 0.9;
  letter-spacing: 0;
}
.bnd-hero h1 span {
  color: #ff465d;
  display: block;
}
.bnd-hero-copy {
  max-width: 640px;
  color: rgba(241, 246, 255, 0.78);
  font-size: clamp(17px, 2vw, 22px);
  line-height: 1.5;
  margin: 0;
}
.bnd-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 30px;
}
.bnd-hero-action,
.bnd-hero-note {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
}
.bnd-hero-action {
  background: #ffffff;
  color: #0a1d3a;
  font-weight: 700;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.18);
}
.bnd-hero-note {
  color: #d9e8ff;
  border: 1px solid rgba(217, 232, 255, 0.22);
}
.bnd-scroll {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  color: rgba(16, 24, 39, 0.62);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.bnd-band {
  padding: clamp(52px, 7vw, 96px) 0;
}
.bnd-inner {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}
.bnd-intro-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1.1fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
}
.bnd-section-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c8172e;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 800;
}
.bnd-intro-title {
  margin: 12px 0 0;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 0.98;
  letter-spacing: 0;
}
.bnd-intro-copy {
  margin: 0;
  color: #344154;
  font-size: clamp(17px, 2vw, 20px);
  line-height: 1.65;
}
.bnd-checklist {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.bnd-check {
  border: 1px solid #d8dfec;
  border-radius: 8px;
  padding: 14px;
  min-height: 128px;
  background: #ffffff;
}
.bnd-check svg {
  color: #c8172e;
}
.bnd-check strong {
  display: block;
  margin: 10px 0 4px;
  color: #101827;
}
.bnd-check span {
  color: #5d6a7e;
  font-size: 14px;
  line-height: 1.45;
}
.bnd-scripts {
  background: #101827;
  color: #f8fbff;
}
.bnd-scripts-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: end;
  margin-bottom: 28px;
}
.bnd-scripts-head h2 {
  max-width: 720px;
  margin: 10px 0 0;
  font-size: clamp(34px, 5.5vw, 72px);
  line-height: 0.96;
  letter-spacing: 0;
}
.bnd-scripts-head p {
  max-width: 330px;
  color: rgba(248, 251, 255, 0.68);
  line-height: 1.55;
  margin: 0;
}
.bnd-timeline {
  display: grid;
  gap: 18px;
}
.bnd-script-card {
  border: 1px solid rgba(248, 251, 255, 0.13);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
    #152238;
  padding: clamp(20px, 3vw, 34px);
}
.bnd-script-meta {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: #8fb7ff;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
}
.bnd-script-eyebrow {
  margin-top: 20px;
  color: #ff6678;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 900;
}
.bnd-script-card h2 {
  margin: 10px 0 14px;
  font-size: clamp(26px, 3.6vw, 46px);
  line-height: 1.02;
  letter-spacing: 0;
}
.bnd-script-card p {
  margin: 0 0 12px;
  max-width: 820px;
  color: rgba(248, 251, 255, 0.78);
  font-size: 18px;
  line-height: 1.62;
}
.bnd-script-card p:last-of-type {
  margin-bottom: 0;
}
.bnd-script-card blockquote {
  max-width: 760px;
  margin: 20px 0 0;
  border-left: 4px solid #ff465d;
  padding: 12px 0 12px 18px;
  color: #ffffff;
  font-size: clamp(22px, 3vw, 34px);
  line-height: 1.08;
  font-weight: 900;
}
.bnd-script-card ul {
  display: grid;
  gap: 8px;
  max-width: 760px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}
.bnd-script-card li {
  position: relative;
  padding-left: 22px;
  color: rgba(248, 251, 255, 0.76);
  line-height: 1.45;
}
.bnd-script-card li:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff465d;
}
.bnd-card-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.bnd-card-sources a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(143, 183, 255, 0.28);
  color: #b9d3ff;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 800;
}
.bnd-image-slot {
  position: relative;
  min-height: clamp(220px, 42vw, 430px);
  overflow: hidden;
  border-radius: 8px;
  border: 1px dashed rgba(248, 251, 255, 0.32);
  background:
    linear-gradient(135deg, rgba(211, 24, 46, 0.22), transparent 40%),
    linear-gradient(45deg, rgba(46, 109, 194, 0.18), transparent 52%),
    #0b1425;
}
.bnd-image-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.75), transparent);
}
.bnd-image-content {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
  color: rgba(248, 251, 255, 0.86);
}
.bnd-image-content svg {
  color: #ff465d;
}
.bnd-image-content span {
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 800;
}
.bnd-image-content p {
  max-width: 620px;
  margin: 0;
  color: rgba(248, 251, 255, 0.62);
  line-height: 1.5;
}
.bnd-footer-band {
  background: #f5f7fb;
}
.bnd-extra-band {
  background: #ffffff;
}
.bnd-extra-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(300px, 1.12fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: start;
}
.bnd-extra-title {
  margin: 12px 0 14px;
  font-size: clamp(32px, 5vw, 58px);
  line-height: 0.98;
  letter-spacing: 0;
}
.bnd-extra-copy {
  margin: 0;
  color: #5d6a7e;
  line-height: 1.6;
  font-size: 17px;
}
.bnd-character-list {
  display: grid;
  gap: 10px;
}
.bnd-character {
  border: 1px solid #d8dfec;
  border-radius: 8px;
  padding: 16px;
  background: #f8faff;
}
.bnd-character-image {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 138px;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px dashed rgba(20, 17, 15, 0.14);
  background:
    radial-gradient(120% 100% at 30% 20%, rgba(232, 120, 110, 0.12), transparent 58%),
    linear-gradient(135deg, rgba(20, 17, 15, 0.035), rgba(20, 17, 15, 0.01));
  color: var(--sb-ink-3);
}
.bnd-character-image:before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(20, 17, 15, 0.06) 1px, transparent 1px),
    linear-gradient(0deg, rgba(20, 17, 15, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.5;
}
.bnd-character-image span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'BeVietnam', sans-serif;
  font-weight: 800;
}
.bnd-character strong {
  display: block;
  color: #101827;
  font-size: 18px;
  margin-bottom: 6px;
}
.bnd-character p {
  margin: 0;
  color: #47556b;
  line-height: 1.55;
}
.bnd-watch-box {
  margin-top: 18px;
  border: 1px solid #d8dfec;
  border-radius: 8px;
  padding: 18px;
  background: #101827;
  color: #f8fbff;
}
.bnd-watch-box h3 {
  margin: 0 0 12px;
  color: #8fb7ff;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.bnd-watch-box p {
  margin: 0;
  line-height: 1.58;
}
.bnd-watch-box p + p {
  margin-top: 12px;
}
.bnd-watch-box strong {
  color: #ffffff;
}
.bnd-footer-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  border-top: 1px solid #d8dfec;
  padding-top: 34px;
}
.bnd-footer-panel h2 {
  margin: 0 0 8px;
  font-size: clamp(28px, 4vw, 48px);
  letter-spacing: 0;
}
.bnd-footer-panel p {
  margin: 0;
  color: #5d6a7e;
  line-height: 1.55;
}
.bnd-footer-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: #d9182e;
  color: #ffffff;
  min-height: 42px;
  padding: 0 14px;
  font-weight: 800;
  white-space: nowrap;
}
@keyframes bndGuideOpen {
  to {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}
@keyframes bndGateCard {
  from { opacity: 0; transform: translateY(18px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bndGateBrainoClimb {
  0% { transform: translate(-50%, 220px); }
  34% { transform: translate(-50%, 74px); }
  58% { transform: translate(-50%, 26px); }
  76% { transform: translate(-50%, -6px); }
  100% { transform: translate(-50%, 0); }
}
@keyframes bndGateWave {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(-34deg); }
}
@keyframes bndGateBubble {
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes bndNoWiggle {
  0%, 100% { filter: none; }
  40% { filter: blur(0.4px); }
}
@keyframes bndYesPulse {
  0%, 100% { box-shadow: 0 18px 48px rgba(216, 24, 46, 0.38); }
  50% { box-shadow: 0 22px 62px rgba(255, 77, 97, 0.56); }
}
@keyframes bndRecapIn {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bndTourBrainoFlyRoute {
  0%, 13% { transform: translate(var(--bnd-fly-start-x), var(--bnd-fly-start-y)) rotate(0deg); }
  22% { transform: translate(var(--bnd-fly-start-x), calc(var(--bnd-fly-start-y) - 14px)) rotate(-4deg); }
  40% { transform: translate(var(--bnd-fly-right), 18vh) rotate(-22deg); }
  54% { transform: translate(52vw, 25vh) rotate(14deg); }
  68% { transform: translate(18vw, 46vh) rotate(-14deg); }
  84% { transform: translate(64vw, 20vh) rotate(18deg); }
  100% { transform: translate(var(--bnd-fly-right), 34vh) rotate(0deg); }
}
@keyframes bndTourBrainoKeepSwinging {
  0% { transform: translate(var(--bnd-fly-right), 34vh) rotate(0deg); }
  24% { transform: translate(66vw, 54vh) rotate(20deg); }
  50% { transform: translate(42vw, 18vh) rotate(-18deg); }
  74% { transform: translate(20vw, 58vh) rotate(16deg); }
  100% { transform: translate(var(--bnd-fly-right), 34vh) rotate(0deg); }
}
@keyframes bndTourBrainoSwingPose {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(8deg); }
}
@keyframes bndTourRightArmPose {
  0%, 18%, 100% { transform: rotate(-48deg); }
  44% { transform: rotate(-68deg); }
  70% { transform: rotate(-38deg); }
}
@keyframes bndTourLeftArmPose {
  0%, 100% { transform: rotate(18deg); }
  50% { transform: rotate(30deg); }
}
@keyframes bndTourWebOne {
  0%, 14% { opacity: 0; transform: rotate(-28deg) scaleY(0); }
  18% { opacity: 1; transform: rotate(-28deg) scaleY(1); }
  36% { opacity: 0.92; transform: rotate(-34deg) scaleY(1); }
  43%, 100% { opacity: 0; transform: rotate(-34deg) scaleY(0); }
}
@keyframes bndTourWebTwo {
  0%, 50% { opacity: 0; transform: rotate(26deg) scaleY(0); }
  54% { opacity: 1; transform: rotate(26deg) scaleY(1); }
  72% { opacity: 0.9; transform: rotate(33deg) scaleY(1); }
  79%, 100% { opacity: 0; transform: rotate(33deg) scaleY(0); }
}
@keyframes bndTourKeepWebOne {
  0%, 44%, 100% { opacity: 0; transform: rotate(-30deg) scaleY(0); }
  8%, 32% { opacity: 0.9; transform: rotate(-30deg) scaleY(1); }
}
@keyframes bndTourKeepWebTwo {
  0%, 38%, 100% { opacity: 0; transform: rotate(24deg) scaleY(0); }
  50%, 80% { opacity: 0.9; transform: rotate(24deg) scaleY(1); }
}
@keyframes bndTourWebSpark {
  0%, 16% { opacity: 0; transform: scale(0.4); }
  18% { opacity: 1; transform: scale(1.14); }
  23%, 52% { opacity: 0; transform: scale(0.6); }
  54% { opacity: 1; transform: scale(1.14); }
  60%, 100% { opacity: 0; transform: scale(0.6); }
}
@keyframes bndTourKeepSpark {
  0%, 45%, 100% { opacity: 0; transform: scale(0.4); }
  8%, 50% { opacity: 1; transform: scale(1.1); }
  14%, 56% { opacity: 0; transform: scale(0.62); }
}
@keyframes bndSpideyRoute {
  0% { transform: translate(-132px, calc(100vh - 164px)) rotate(0deg); }
  34% { transform: translate(calc(50vw - (var(--bnd-swinger-w) / 2)), calc(100vh - 164px)) rotate(0deg); }
  46% { transform: translate(calc(50vw - (var(--bnd-swinger-w) / 2)), calc(100vh - 164px)) rotate(0deg); }
  61% { transform: translate(min(44vw, var(--bnd-safe-right)), 22vh) rotate(-20deg); }
  69% { transform: translate(min(56vw, var(--bnd-safe-right)), 18vh) rotate(7deg); }
  76% { transform: translate(min(56vw, var(--bnd-safe-right)), 18vh) rotate(0deg); }
  91% { transform: translate(min(74vw, var(--bnd-safe-right)), 48vh) rotate(18deg); }
  100% { transform: translate(var(--bnd-safe-right), 32vh) rotate(0deg); }
}
@keyframes bndKeepSwinging {
  0% { transform: translate(var(--bnd-safe-right), 32vh) rotate(0deg); }
  24% { transform: translate(min(70vw, var(--bnd-safe-right)), 50vh) rotate(20deg); }
  50% { transform: translate(min(50vw, var(--bnd-safe-right)), 20vh) rotate(-18deg); }
  74% { transform: translate(min(64vw, var(--bnd-safe-right)), 56vh) rotate(16deg); }
  100% { transform: translate(var(--bnd-safe-right), 32vh) rotate(0deg); }
}
@keyframes bndSpideyBubble {
  0%, 22% { opacity: 0; transform: translateY(6px) scale(0.94); }
  29%, 43% { opacity: 1; transform: translateY(0) scale(1); }
  50%, 100% { opacity: 0; transform: translateY(-4px) scale(0.96); }
}
@keyframes bndMaskOn {
  0%, 44% { opacity: 0; transform: translateX(-50%) scale(0.9); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
  56%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
}
@keyframes bndWebOne {
  0%, 51% { opacity: 0; transform: rotate(-28deg) scaleY(0); }
  55% { opacity: 1; transform: rotate(-28deg) scaleY(1); }
  68% { opacity: 0.92; transform: rotate(-35deg) scaleY(1); }
  73%, 100% { opacity: 0; transform: rotate(-35deg) scaleY(0); }
}
@keyframes bndWebTwo {
  0%, 76% { opacity: 0; transform: rotate(27deg) scaleY(0); }
  80% { opacity: 1; transform: rotate(27deg) scaleY(1); }
  94% { opacity: 0.9; transform: rotate(34deg) scaleY(1); }
  100% { opacity: 0; transform: rotate(34deg) scaleY(0.12); }
}
@keyframes bndKeepWebOne {
  0%, 46%, 100% { opacity: 0; transform: rotate(-30deg) scaleY(0); }
  8%, 34% { opacity: 0.9; transform: rotate(-30deg) scaleY(1); }
}
@keyframes bndKeepWebTwo {
  0%, 38%, 100% { opacity: 0; transform: rotate(24deg) scaleY(0); }
  50%, 82% { opacity: 0.9; transform: rotate(24deg) scaleY(1); }
}
@keyframes bndKeepSpark {
  0%, 45%, 100% { opacity: 0; transform: scale(0.4); }
  8%, 50% { opacity: 1; transform: scale(1.12); }
  14%, 56% { opacity: 0; transform: scale(0.62); }
}
@keyframes bndWebSpark {
  0%, 52% { opacity: 0; transform: scale(0.4); }
  55% { opacity: 1; transform: scale(1.15); }
  59% { opacity: 0; transform: scale(0.6); }
  78% { opacity: 0; transform: scale(0.4); }
  80% { opacity: 1; transform: scale(1.15); }
  84%, 100% { opacity: 0; transform: scale(0.6); }
}
@keyframes bndWalkerPose {
  0%, 8%, 16%, 24% { transform: translateY(0) rotate(-2deg); }
  4%, 12%, 20% { transform: translateY(-3px) rotate(2deg); }
  28%, 48% { transform: translateY(0) rotate(0deg); }
  60% { transform: translateY(-2px) rotate(-8deg); }
  70% { transform: translateY(0) rotate(8deg); }
  84% { transform: translateY(-2px) rotate(-7deg); }
  100% { transform: translateY(0) rotate(6deg); }
}
@keyframes bndLegLeftPose {
  0%, 8%, 16%, 24% { transform: translateY(0) rotate(-8deg); }
  4%, 12%, 20% { transform: translateY(-6px) rotate(10deg); }
  30%, 50% { transform: translateY(0) rotate(0deg); }
  58%, 100% { transform: translateY(-5px) rotate(18deg); }
}
@keyframes bndLegRightPose {
  0%, 8%, 16%, 24% { transform: translateY(-6px) rotate(10deg); }
  4%, 12%, 20% { transform: translateY(0) rotate(-8deg); }
  30%, 50% { transform: translateY(0) rotate(0deg); }
  58%, 100% { transform: translateY(-5px) rotate(-18deg); }
}
@keyframes bndRightArmPose {
  0%, 28% { transform: rotate(0deg); }
  31% { transform: rotate(-24deg); }
  34% { transform: rotate(-7deg); }
  37% { transform: rotate(-28deg); }
  43% { transform: rotate(0deg); }
  52%, 74% { transform: rotate(-58deg); }
  79%, 100% { transform: rotate(-48deg); }
}
@keyframes bndLeftArmPose {
  0%, 50% { transform: rotate(0deg); }
  58%, 100% { transform: rotate(22deg); }
}
@media (max-width: 860px) {
  .bnd-hero {
    min-height: auto;
    background:
      linear-gradient(120deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 58px),
      linear-gradient(180deg, #07111f 0%, #0a1d3a 72%, #f5f7fb 72%);
  }
  .bnd-hero-inner,
  .bnd-intro-grid,
  .bnd-extra-grid,
  .bnd-footer-panel {
    grid-template-columns: 1fr;
  }
  .bnd-hero-inner {
    padding: 56px 0 84px;
  }
  .bnd-scripts-head {
    display: block;
  }
  .bnd-scripts-head p {
    max-width: 680px;
    margin-top: 12px;
  }
  .bnd-checklist {
    grid-template-columns: 1fr;
  }
  .bnd-footer-badge {
    width: fit-content;
  }
  .bnd-script-rail {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .bnd-people-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .bnd-hero-inner,
  .bnd-inner {
    width: min(100% - 28px, 1120px);
  }
  .bnd-hero-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .bnd-hero-action,
  .bnd-hero-note {
    width: 100%;
    justify-content: center;
  }
  .bnd-script-card p {
    font-size: 16px;
  }
  .bnd-scroll {
    display: none;
  }
  .bnd-movie-tour .bg-card {
    top: 7vh;
    height: 68vh;
    min-width: 0;
  }
  .bnd-script-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Editorial alignment pass: match the rest of the Braino site. */
.bnd-page {
  --bnd-coral: #E8786E;
  --bnd-coral-soft: #F6A8A2;
  --bnd-coral-deep: #C9544A;
  --bnd-night: #08070a;
  --bnd-paper: var(--sb-bg);
  --bnd-paper-2: var(--sb-bg-2);
  --bnd-panel: var(--sb-panel-2);
  --bnd-ink: var(--sb-ink);
  --bnd-muted: var(--sb-ink-2);
  --bnd-line: var(--sb-line);
  background: var(--bnd-paper);
  color: var(--bnd-ink);
  font-family: 'NeueHaas', system-ui, sans-serif;
  overflow-x: clip;
}
.bnd-page > section {
  opacity: 0;
  visibility: hidden;
  transform: translateY(18px);
  animation: bndGuideOpen 0.9s cubic-bezier(0.16, 1, 0.3, 1) 9.3s forwards;
}
.bnd-page.bnd-locked {
  min-height: 100vh;
  overflow: hidden;
}
.bnd-page.bnd-locked > section:not(.bnd-gate) {
  display: none;
}
.bnd-page.bnd-accepted > section {
  opacity: 1;
  visibility: visible;
  transform: none;
  animation: none;
}
.bnd-gate {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fbfaf8;
  background:
    radial-gradient(circle at 20% 20%, rgba(217, 24, 46, 0.28), transparent 34%),
    radial-gradient(circle at 78% 18%, rgba(46, 109, 194, 0.26), transparent 34%),
    linear-gradient(180deg, #060a12 0%, #09192e 58%, #060a12 100%);
  opacity: 1;
  visibility: visible;
  transform: none;
  animation: none;
}
.bnd-gate:before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 58px),
    linear-gradient(65deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 62px);
  opacity: 0.5;
  pointer-events: none;
}
.bnd-movie-tour {
  isolation: isolate;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.bnd-movie-tour .bnd-spidey-stage {
  z-index: 5;
}
.bnd-movie-tour .bg-lane {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
}
.bnd-movie-tour .bg-walker {
  --bnd-fly-start-x: 50vw;
  --bnd-fly-start-y: calc(100vh - 120px);
  --bnd-fly-right: calc(100vw - 116px);
  position: absolute;
  left: 0;
  top: 0;
  width: 64px;
  will-change: transform, filter;
}
.bnd-movie-tour .bg-walker #__sbwk_flip__ {
  display: block;
  position: relative;
  z-index: 2;
  transform-origin: center;
}
.bnd-movie-tour .bg-walker.bg-glow {
  animation: bgMovieGlow 0.85s ease-in-out 1;
}
.bnd-movie-tour .bg-walker.bg-flying {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 11;
  animation:
    bndTourBrainoFlyRoute 8.8s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndTourBrainoKeepSwinging 6.2s ease-in-out 8.75s infinite;
}
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_say__ {
  display: none;
}
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_flip__ {
  animation: bndTourBrainoSwingPose 1.35s ease-in-out infinite;
}
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_ra__,
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_ra_bg__ {
  transform-box: view-box;
  transform-origin: 78px 53px;
  animation: bndTourRightArmPose 1.55s ease-in-out infinite;
}
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_la__,
.bnd-movie-tour .bg-walker.bg-flying #__sbwk_la_bg__ {
  transform-box: view-box;
  transform-origin: 22px 53px;
  animation: bndTourLeftArmPose 1.55s ease-in-out infinite;
}
.bnd-movie-tour .bnd-tour-mask .bnd-walker-mask {
  position: absolute;
  left: 50%;
  top: 0;
  width: 64px;
  transform: translateX(-50%);
  opacity: 0;
  animation: none;
  z-index: 3;
}
.bnd-movie-tour.is-spidey .bnd-tour-mask .bnd-walker-mask {
  animation: bndMaskOn 1.12s ease both;
}
.bnd-tour-web {
  position: absolute;
  left: calc(50% + 35px);
  top: -96px;
  z-index: 1;
  width: 2px;
  height: 168px;
  border-radius: 999px;
  transform-origin: 50% 100%;
  transform: rotate(-28deg) scaleY(0);
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.07));
  box-shadow: 0 0 12px rgba(255,255,255,0.3);
  opacity: 0;
  pointer-events: none;
}
.bnd-tour-web-two {
  left: calc(50% + 31px);
  top: -86px;
  height: 158px;
  transform: rotate(26deg) scaleY(0);
  background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.05));
}
.bnd-tour-web-spark {
  position: absolute;
  left: calc(50% + 33px);
  top: 66px;
  z-index: 4;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 0 14px rgba(255,255,255,0.62), 0 0 26px rgba(232,120,110,0.36);
  opacity: 0;
  pointer-events: none;
}
.bnd-movie-tour .bg-walker.bg-flying .bnd-tour-web-one {
  animation:
    bndTourWebOne 8.8s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndTourKeepWebOne 6.2s ease-in-out 8.75s infinite;
}
.bnd-movie-tour .bg-walker.bg-flying .bnd-tour-web-two {
  animation:
    bndTourWebTwo 8.8s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndTourKeepWebTwo 6.2s ease-in-out 8.75s infinite;
}
.bnd-movie-tour .bg-walker.bg-flying .bnd-tour-web-spark {
  animation:
    bndTourWebSpark 8.8s ease forwards,
    bndTourKeepSpark 6.2s ease-in-out 8.75s infinite;
}
.bnd-movie-tour #__sbwk_say__ {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 4px);
  transform: translateX(-50%) translateY(4px) scale(0.9);
  background: rgba(27, 23, 19, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  padding: 6px 10px;
  border-radius: 12px;
  white-space: normal;
  max-width: 320px;
  min-width: 220px;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  z-index: 7;
  transition: opacity .18s ease, transform .18s ease;
  box-shadow: 0 4px 14px rgba(27,23,19,0.28);
}
.bnd-movie-tour #__sbwk_say__.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
.bnd-movie-tour #__sbwk_say__::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(27, 23, 19, 0.92);
}
.bnd-movie-tour #__sb_bar__ {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) scale(0.94);
  display: flex;
  align-items: center;
  gap: 8px;
  isolation: isolate;
  overflow: visible;
  width: min(680px, calc(100vw - 48px));
  padding: 10px 10px 10px 28px;
  border-radius: 100px;
  background: rgba(255, 251, 247, 0.12);
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 8px 32px rgba(27,23,19,0.18), 0 2px 8px rgba(27,23,19,0.08), inset 2px 2px 1px rgba(255,255,255,0.65), inset -1px -1px 1px rgba(255,255,255,0.3);
  backdrop-filter: blur(6px) saturate(180%);
  -webkit-backdrop-filter: blur(6px) saturate(180%);
  pointer-events: none;
  opacity: 0;
  z-index: 6;
  transition: opacity 0.42s cubic-bezier(0.34,1.1,0.64,1), transform 0.42s cubic-bezier(0.34,1.1,0.64,1);
}
.bnd-movie-tour #__sb_bar__::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(16px) saturate(200%);
  -webkit-backdrop-filter: blur(16px) saturate(200%);
  filter: url(#__bnd_glass_filter__);
  z-index: -1;
  pointer-events: none;
}
.bnd-movie-tour #__sb_bar__[data-step]:not([data-step=""])::after {
  content: attr(data-step);
  position: absolute;
  left: 28px;
  top: -30px;
  color: rgba(245, 241, 234, 0.7);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.bnd-movie-tour #__sb_bar__.open {
  opacity: 1;
  pointer-events: all;
  transform: translateX(-50%) scale(1);
}
.bnd-movie-tour #__sb_bar__.sb-climb #__sb_input__,
.bnd-movie-tour #__sb_bar__.sb-climb .sb-bar-icon-btn {
  opacity: 0;
  pointer-events: none;
}
.bnd-movie-tour #__sb_bar__.bg-tour #__sb_input__ {
  display: none;
}
.bnd-movie-tour #__sb_bar__.bg-tour {
  justify-content: flex-end;
}
.bnd-movie-tour #__sb_input__ {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1B1713;
  font-size: 16px;
  line-height: 1.4;
  padding: 0;
  text-shadow: 0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.7), 0 1px 1px rgba(255,255,255,0.8);
}
.bnd-movie-tour #__sb_input__::placeholder {
  color: #4A3D34;
}
.bnd-movie-tour .sb-bar-icon-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 0;
  background: #E8786E;
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: none;
  transition: background 0.15s, opacity 0.3s ease;
}
.bnd-movie-tour .sb-bar-icon-btn:hover {
  background: #C9544A;
}
.bnd-movie-tour .bg-card {
  position: fixed;
  top: 8vh;
  left: 50%;
  z-index: 4;
  width: min(940px, calc(100vw - 40px));
  height: 67vh;
  min-width: 360px;
  min-height: 280px;
  max-width: calc(100vw - 24px);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  resize: both;
  border-radius: 26px;
  border: 1px solid rgba(255,255,255,0.20);
  background: rgba(16,12,11,0.34);
  color: #F5F1EA;
  box-shadow: 0 40px 100px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 2px 2px 1px rgba(255,255,255,0.22), inset -1px -1px 1px rgba(255,255,255,0.12);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  isolation: isolate;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(20px) scale(0.96);
  transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1);
}
.bnd-movie-tour .bg-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(22px) saturate(200%);
  -webkit-backdrop-filter: blur(22px) saturate(200%);
  filter: url(#__bnd_glass_filter__);
  z-index: -1;
  pointer-events: none;
}
.bnd-movie-tour .bg-card.show {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0) scale(1);
}
.bnd-movie-tour .bg-card-grab {
  flex: none;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245,241,234,0.36);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: grab;
  user-select: none;
}
.bnd-movie-tour .bg-card-grab:active {
  cursor: grabbing;
}
.bnd-movie-tour .bg-card-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px clamp(24px,2.6vw,46px) clamp(20px,2vw,36px);
}
.bnd-movie-tour .bg-card-scroll::-webkit-scrollbar {
  width: 5px;
}
.bnd-movie-tour .bg-card-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 99px;
}
.bnd-movie-tour .bg-pop {
  animation: bgMoviePop .5s cubic-bezier(.22,1.3,.4,1) both;
}
.bnd-movie-card {
  display: flex;
  flex-direction: column;
  color: #F5F1EA;
}
.bnd-movie-card-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #F0A24E;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.bnd-script-rail {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.bnd-script-rail span {
  display: grid;
  align-content: center;
  min-height: 48px;
  padding: 8px 9px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.11);
  background: rgba(255,255,255,0.045);
  color: rgba(245,241,234,0.38);
}
.bnd-script-rail span.is-done {
  color: rgba(245,241,234,0.58);
  border-color: rgba(232,120,110,0.18);
}
.bnd-script-rail span.is-active {
  color: #fff;
  border-color: rgba(232,120,110,0.58);
  background: rgba(232,120,110,0.16);
  box-shadow: 0 12px 32px rgba(232,120,110,0.12);
}
.bnd-script-rail b,
.bnd-script-rail em {
  display: block;
  font-style: normal;
}
.bnd-script-rail b {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1;
}
.bnd-script-rail em {
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.1;
}
.bnd-people-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.bnd-people-grid article {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.055);
}
.bnd-mini-image {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 94px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(255,255,255,0.16);
  color: rgba(245,241,234,0.54);
  text-align: center;
}
.bnd-mini-image span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.bnd-people-grid strong {
  color: #fff;
  font-size: 15px;
}
.bnd-people-grid p {
  margin: 7px 0 0;
  font-size: 15px;
  line-height: 1.42;
}
.bnd-movie-card h2 {
  margin: 16px 0 18px;
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: clamp(34px, 5vw, 70px);
  line-height: 0.96;
  letter-spacing: -0.012em;
}
.bnd-movie-card p,
.bnd-movie-card li {
  color: rgba(245,241,234,0.72);
  font-family: 'Newsreader', Georgia, serif;
  font-size: clamp(17px, 2vw, 21px);
  line-height: 1.58;
}
.bnd-movie-card p {
  margin: 0 0 13px;
}
.bnd-movie-card blockquote {
  margin: 18px 0 0;
  padding-left: 18px;
  border-left: 3px solid #E8786E;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: clamp(30px, 5vw, 58px);
  line-height: 0.98;
}
.bnd-movie-card ul {
  display: grid;
  gap: 8px;
  margin: 18px 0 0;
  padding-left: 20px;
}
.bnd-movie-image-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  padding: 14px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.055);
  color: rgba(245,241,234,0.58);
  font-size: 13px;
  line-height: 1.35;
}
.bnd-movie-image-note svg {
  flex: none;
  color: #E8786E;
}
@keyframes bgMovieGlow {
  0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.4)); }
  45% { filter: drop-shadow(0 0 26px rgba(255,210,120,1)) drop-shadow(0 0 50px rgba(255,170,70,0.6)); }
}
@keyframes bgMoviePop {
  from { opacity: 0; transform: translateY(16px) scale(.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.bnd-gate-accepted {
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.bnd-gate-card {
  position: relative;
  z-index: 2;
  width: min(720px, calc(100vw - 36px));
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 26px;
  padding: clamp(24px, 5vw, 46px);
  background: rgba(9, 14, 24, 0.58);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  box-shadow: 0 34px 110px rgba(0,0,0,0.48), inset 1px 1px 0 rgba(255,255,255,0.14);
  text-align: center;
  animation: bndGateCard 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.8s both;
}
.bnd-gate-kicker {
  font-family: 'BeVietnam', sans-serif;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ff7c8b;
  font-weight: 900;
}
.bnd-gate-card h1 {
  margin: 16px auto 12px;
  max-width: 620px;
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: clamp(40px, 7vw, 82px);
  line-height: 0.95;
  letter-spacing: -0.02em;
}
.bnd-gate-card h1 span {
  color: #ff4d61;
}
.bnd-gate-card p {
  margin: 0 auto;
  max-width: 520px;
  color: rgba(251,250,248,0.68);
  font-family: 'Newsreader', Georgia, serif;
  font-size: 19px;
  line-height: 1.5;
}
.bnd-gate-actions {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 18px;
  min-height: 86px;
  margin-top: 26px;
}
.bnd-yes-button,
.bnd-no-button,
.bnd-gate-input button,
.bnd-recap-controls button {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}
.bnd-yes-button {
  min-width: 118px;
  min-height: 54px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff4d61, #c8172e);
  color: #fff;
  box-shadow: 0 18px 48px rgba(216, 24, 46, 0.38);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center;
  animation: bndYesPulse 1.9s ease-in-out infinite;
}
.bnd-no-button {
  min-width: 100px;
  min-height: 46px;
  border-radius: 999px;
  color: rgba(251,250,248,0.78);
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.16);
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease;
  will-change: transform;
}
.bnd-no-button:hover {
  opacity: 0.72;
  animation: bndNoWiggle 0.32s ease both;
}
.bnd-gate-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(500px, 100%);
  min-height: 58px;
  margin: 10px auto 0;
  padding: 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.18);
}
.bnd-gate-input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 16px;
  padding: 0 14px;
}
.bnd-gate-input input::placeholder {
  color: rgba(251,250,248,0.46);
}
.bnd-gate-input button {
  min-height: 44px;
  border-radius: 999px;
  padding: 0 18px;
  color: #07111f;
  background: #fff;
}
.bnd-gate-message {
  min-height: 18px;
  margin-top: 14px;
  color: #ff9aa6;
  font-family: 'BeVietnam', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bnd-gate-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.bnd-gate-bar {
  position: absolute;
  left: 50%;
  bottom: 30px;
  width: min(680px, calc(100vw - 40px));
  height: 66px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.35);
  backdrop-filter: blur(14px) saturate(170%);
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  box-shadow: 0 16px 56px rgba(0,0,0,0.28), inset 1px 1px 0 rgba(255,255,255,0.3);
}
.bnd-gate-braino {
  position: absolute;
  left: 50%;
  bottom: 78px;
  width: 92px;
  height: 120px;
  transform: translate(-50%, 210px);
  animation: bndGateBrainoClimb 2.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.bnd-gate-art,
.bnd-gate-art svg,
.bnd-gate-braino .bnd-walker-mask {
  width: 92px;
}
.bnd-gate-art {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  filter: drop-shadow(0 18px 28px rgba(0,0,0,0.36));
}
.bnd-gate-braino .bnd-walker-mask {
  top: 18px;
  opacity: 1;
  animation: none;
}
.bnd-gate-braino #__sbwk_ra__,
.bnd-gate-braino #__sbwk_ra_bg__ {
  transform-box: fill-box;
  transform-origin: 0% 22%;
  animation: bndGateWave 0.52s ease-in-out 2.1s 6;
}
.bnd-gate-bubble {
  position: absolute;
  left: 50%;
  top: -28px;
  z-index: 3;
  width: max-content;
  max-width: 250px;
  transform: translateX(-50%) translateY(8px) scale(0.94);
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(27, 23, 19, 0.94);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  opacity: 0;
  animation: bndGateBubble 0.34s ease 2.45s forwards;
}
.bnd-gate-bubble:after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(27, 23, 19, 0.94);
}
.bnd-recap-hero {
  min-height: 100svh;
}
.bnd-recap-hero-inner {
  grid-template-columns: minmax(0, 0.84fr) minmax(340px, 0.96fr);
  align-items: center;
  width: min(1180px, calc(100% - 48px));
}
.bnd-recap-shell {
  position: relative;
  border: 1px solid rgba(255,255,255,0.20);
  border-radius: 26px;
  padding: 18px;
  background: rgba(255,255,255,0.075);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 34px 110px rgba(0,0,0,0.38), inset 1px 1px 0 rgba(255,255,255,0.12);
}
.bnd-recap-topline {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #ff9aa6;
  font-family: 'BeVietnam', sans-serif;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 4px 14px;
}
.bnd-recap-card {
  min-height: 460px;
  border-radius: 20px;
  padding: clamp(20px, 3vw, 30px);
  background: rgba(6, 10, 18, 0.56);
  border: 1px solid rgba(255,255,255,0.12);
  animation: bndRecapIn 0.48s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.bnd-recap-eyebrow {
  color: #ff6678;
  font-family: 'BeVietnam', sans-serif;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.bnd-recap-card h2 {
  margin: 10px 0 14px;
  color: #fff;
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1;
  letter-spacing: -0.018em;
}
.bnd-recap-card p,
.bnd-recap-card li {
  color: rgba(251,250,248,0.74);
  font-family: 'Newsreader', Georgia, serif;
  font-size: 17px;
  line-height: 1.55;
}
.bnd-recap-card p {
  margin: 0 0 11px;
}
.bnd-recap-card blockquote {
  margin: 16px 0 0;
  padding-left: 16px;
  border-left: 3px solid #ff4d61;
  color: #fff;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: clamp(26px, 4vw, 40px);
  line-height: 1;
}
.bnd-recap-card ul {
  display: grid;
  gap: 7px;
  margin: 16px 0 0;
  padding-left: 18px;
}
.bnd-recap-image {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 13px;
  border-radius: 14px;
  color: rgba(251,250,248,0.68);
  background: rgba(255,255,255,0.075);
  border: 1px dashed rgba(255,255,255,0.18);
  font-size: 13px;
  line-height: 1.35;
}
.bnd-recap-image svg {
  color: #ff6678;
  flex: none;
}
.bnd-recap-controls {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}
.bnd-recap-controls button {
  min-height: 44px;
  border-radius: 999px;
  padding: 0 18px;
  color: #fff;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
}
.bnd-recap-controls button:last-child {
  background: linear-gradient(135deg, #ff4d61, #c8172e);
  border-color: transparent;
}
.bnd-recap-controls button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.bnd-hero {
  min-height: 92svh;
  background: var(--bnd-night);
  display: flex;
  align-items: center;
  color: #fbfaf8;
}
.bnd-hero:before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.04;
  pointer-events: none;
  mix-blend-mode: screen;
}
.bnd-hero-inner {
  position: relative;
  z-index: 1;
  width: min(1040px, calc(100% - 48px));
  grid-template-columns: minmax(0, 820px);
  justify-content: start;
  gap: clamp(34px, 7vw, 92px);
  padding: clamp(86px, 14vh, 150px) 0 clamp(72px, 10vh, 110px);
}
.bnd-hero.bnd-recap-hero {
  min-height: 100svh;
}
.bnd-hero-inner.bnd-recap-hero-inner {
  width: min(1180px, calc(100% - 48px));
  grid-template-columns: minmax(0, 0.84fr) minmax(340px, 0.96fr);
  align-items: center;
}
.bnd-kicker,
.bnd-section-kicker {
  font-family: 'BeVietnam', sans-serif;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--bnd-coral);
  border: 0;
  background: transparent;
  border-radius: 0;
  padding: 0;
}
.bnd-kicker svg,
.bnd-section-kicker svg {
  width: 14px;
  height: 14px;
}
.bnd-hero h1 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: clamp(56px, 11vw, 142px);
  line-height: 0.92;
  letter-spacing: -0.02em;
  margin: 22px 0 24px;
}
.bnd-hero h1 span {
  color: var(--bnd-coral);
}
.bnd-hero-copy {
  max-width: 590px;
  color: rgba(255, 255, 255, 0.66);
  font-size: clamp(17px, 2.2vw, 21px);
  line-height: 1.65;
}
.bnd-hero-actions {
  margin-top: 34px;
}
.bnd-hero-action,
.bnd-hero-note {
  border-radius: 999px;
  min-height: 48px;
  padding: 0 20px;
}
.bnd-hero-action {
  background: linear-gradient(135deg, var(--bnd-coral), var(--bnd-coral-deep));
  color: #fff;
  box-shadow: 0 16px 40px rgba(201, 84, 74, 0.36);
}
.bnd-hero-note {
  color: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.bnd-spidey-stage {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}
.bnd-web-swinger {
  --bnd-swinger-w: 260px;
  --bnd-safe-right: max(16px, calc(100vw - var(--bnd-swinger-w) - 16px));
  position: absolute;
  top: 0;
  left: 0;
  width: 260px;
  height: 240px;
  opacity: 0.98;
  animation:
    bndSpideyRoute 9.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndKeepSwinging 6.4s ease-in-out 9.35s infinite;
  will-change: transform;
}
.bnd-spidey-bubble {
  position: absolute;
  left: 88px;
  top: 42px;
  z-index: 4;
  max-width: 190px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(27, 23, 19, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  opacity: 0;
  transform: translateY(6px) scale(0.94);
  animation: bndSpideyBubble 9.4s ease-in-out forwards;
}
.bnd-spidey-bubble:after {
  content: "";
  position: absolute;
  left: 18px;
  bottom: -6px;
  border-width: 7px 7px 0 0;
  border-style: solid;
  border-color: rgba(27, 23, 19, 0.92) transparent transparent transparent;
}
.bnd-swing-path {
  position: absolute;
  top: 0;
  left: 0;
  width: 108px;
  height: 116px;
  transform-origin: 50% -92px;
}
.bnd-swing-body {
  position: absolute;
  inset: 0;
  transform-origin: 50% -72px;
}
.bnd-hand-web {
  position: absolute;
  left: calc(50% + 38px);
  top: -94px;
  width: 2px;
  height: 174px;
  transform-origin: 50% 100%;
  transform: rotate(-28deg) scaleY(0);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.08));
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.28);
  opacity: 0;
  animation:
    bndWebOne 9.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndKeepWebOne 6.4s ease-in-out 9.35s infinite;
}
.bnd-hand-web-two {
  left: calc(50% + 35px);
  top: -86px;
  height: 162px;
  opacity: 0;
  transform: rotate(27deg) scaleY(0);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.04));
  animation:
    bndWebTwo 9.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    bndKeepWebTwo 6.4s ease-in-out 9.35s infinite;
}
.bnd-web-spark {
  position: absolute;
  left: calc(50% + 34px);
  top: 69px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.62), 0 0 26px rgba(232, 120, 110, 0.36);
  opacity: 0;
  transform: scale(0.4);
  animation:
    bndWebSpark 9.4s ease-out forwards,
    bndKeepSpark 6.4s ease-in-out 9.35s infinite;
}
.bnd-walker-art {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 88px;
  transform: translateX(-50%);
  filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.28));
}
.bnd-walker-art svg {
  width: 88px;
  height: auto;
  overflow: visible;
}
.bnd-walker-mask {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 88px;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.16));
  opacity: 0;
  animation: bndMaskOn 9.4s ease-in-out forwards;
}
.bnd-walker-art #__sbwk_root__ {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: bndWalkerPose 9.4s ease-in-out forwards;
}
.bnd-walker-art #__sbwk_ll__ {
  transform-box: fill-box;
  transform-origin: 50% 78%;
  animation: bndLegLeftPose 9.4s ease-in-out forwards;
}
.bnd-walker-art #__sbwk_rl__ {
  transform-box: fill-box;
  transform-origin: 50% 78%;
  animation: bndLegRightPose 9.4s ease-in-out forwards;
}
.bnd-walker-art #__sbwk_ra__,
.bnd-walker-art #__sbwk_ra_bg__ {
  transform-box: fill-box;
  transform-origin: 0% 22%;
  animation: bndRightArmPose 9.4s ease-in-out forwards;
}
.bnd-walker-art #__sbwk_la__,
.bnd-walker-art #__sbwk_la_bg__ {
  transform-box: fill-box;
  transform-origin: 100% 22%;
  animation: bndLeftArmPose 9.4s ease-in-out forwards;
}
.bnd-scroll {
  color: rgba(255, 255, 255, 0.38);
  font-family: 'BeVietnam', sans-serif;
  font-weight: 800;
}
.bnd-band {
  padding: clamp(72px, 11vw, 132px) 0;
}
.bnd-inner {
  width: min(1040px, calc(100% - 48px));
}
.bnd-intro-grid {
  grid-template-columns: minmax(0, 0.85fr) minmax(300px, 1.15fr);
}
.bnd-intro-title,
.bnd-scripts-head h2,
.bnd-extra-title,
.bnd-footer-panel h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.018em;
  color: var(--bnd-ink);
}
.bnd-intro-title {
  font-size: clamp(38px, 6.5vw, 78px);
  line-height: 1.02;
}
.bnd-intro-copy,
.bnd-extra-copy,
.bnd-footer-panel p {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  color: var(--bnd-muted);
}
.bnd-intro-copy {
  font-size: clamp(19px, 2.2vw, 23px);
  line-height: 1.62;
}
.bnd-check {
  background: var(--bnd-panel);
  border: 1px solid var(--bnd-line);
  box-shadow: var(--sb-shadow-sm);
}
.bnd-check svg {
  color: var(--bnd-coral-deep);
}
.bnd-scripts {
  background: var(--bnd-paper-2);
  color: var(--bnd-ink);
}
.bnd-scripts-head {
  align-items: start;
  margin-bottom: clamp(34px, 6vw, 72px);
}
.bnd-scripts-head h2 {
  font-size: clamp(38px, 7vw, 84px);
  line-height: 1;
}
.bnd-scripts-head p {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  color: var(--bnd-muted);
  font-size: 19px;
}
.bnd-timeline {
  gap: 0;
}
.bnd-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  padding: clamp(44px, 7vw, 84px) 0;
  border-top: 1px solid var(--bnd-line);
}
.bnd-entry:last-child {
  border-bottom: 1px solid var(--bnd-line);
}
.bnd-entry-flip .bnd-entry-figure {
  order: -1;
}
.bnd-script-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
}
.bnd-script-meta {
  color: var(--bnd-coral-deep);
  opacity: 0.82;
}
.bnd-script-eyebrow {
  color: var(--bnd-coral);
}
.bnd-script-card h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  color: var(--bnd-ink);
  font-size: clamp(30px, 4.8vw, 54px);
  line-height: 1.06;
  letter-spacing: -0.015em;
}
.bnd-script-card p {
  color: rgba(20, 17, 15, 0.72);
  font-size: clamp(16px, 1.9vw, 18px);
  line-height: 1.75;
}
.bnd-script-card blockquote {
  color: var(--bnd-ink);
  border-left-color: var(--bnd-coral);
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
}
.bnd-script-card li {
  color: rgba(20, 17, 15, 0.7);
}
.bnd-script-card li:before {
  background: var(--bnd-coral);
}
.bnd-card-sources a {
  border: 1px solid var(--bnd-line);
  color: var(--bnd-coral-deep);
  background: var(--bnd-panel);
}
.bnd-image-slot {
  min-height: auto;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  border: 1px solid rgba(20, 17, 15, 0.08);
  background:
    radial-gradient(120% 120% at 30% 25%, rgba(232, 120, 110, 0.08), rgba(20, 17, 15, 0.02)),
    var(--bnd-panel);
  box-shadow: 0 30px 70px rgba(20, 17, 15, 0.10);
}
.bnd-image-grid {
  opacity: 0.42;
  background:
    linear-gradient(90deg, rgba(20, 17, 15, 0.07) 1px, transparent 1px),
    linear-gradient(0deg, rgba(20, 17, 15, 0.05) 1px, transparent 1px);
  background-size: 38px 38px;
}
.bnd-image-content {
  color: var(--bnd-ink);
}
.bnd-image-content svg {
  color: var(--bnd-coral-deep);
}
.bnd-image-content span {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
}
.bnd-image-content p {
  color: var(--bnd-muted);
}
.bnd-extra-band,
.bnd-footer-band {
  background: var(--bnd-paper);
}
.bnd-character {
  background: var(--bnd-panel);
  border: 1px solid var(--bnd-line);
  box-shadow: var(--sb-shadow-sm);
}
.bnd-character p {
  color: var(--bnd-muted);
}
.bnd-watch-box {
  background: #14110E;
  border: 1px solid rgba(20, 17, 15, 0.08);
  box-shadow: 0 24px 60px rgba(20, 17, 15, 0.16);
}
.bnd-watch-box h3 {
  color: var(--bnd-coral);
}
.bnd-footer-panel {
  border-top-color: var(--bnd-line);
}
.bnd-footer-badge {
  background: linear-gradient(135deg, var(--bnd-coral), var(--bnd-coral-deep));
}
@media (max-width: 860px) {
  .bnd-hero {
    background: var(--bnd-night);
  }
  .bnd-hero-inner,
  .bnd-intro-grid,
  .bnd-extra-grid,
  .bnd-footer-panel {
    grid-template-columns: 1fr;
  }
  .bnd-entry {
    grid-template-columns: 1fr;
  }
  .bnd-entry-flip .bnd-entry-figure {
    order: 0;
  }
  .bnd-entry-figure {
    order: -1;
  }
  .bnd-web-swinger {
    --bnd-swinger-w: 220px;
    width: 220px;
    height: 216px;
  }
  .bnd-swing-path {
    top: 76px;
  }
}
@media (max-width: 520px) {
  .bnd-hero-inner,
  .bnd-inner {
    width: min(100% - 28px, 1040px);
  }
  .bnd-hero h1 {
    font-size: clamp(50px, 18vw, 82px);
  }
  .bnd-image-slot {
    border-radius: 14px;
  }
  .bnd-web-swinger {
    --bnd-swinger-w: 190px;
    width: 190px;
    height: 190px;
  }
  .bnd-swing-path {
    top: 66px;
  }
  .bnd-walker-art,
  .bnd-walker-art svg,
  .bnd-walker-mask {
    width: 76px;
  }
}
html.sb-dark .bnd-script-card p,
html.sb-dark .bnd-script-card li,
.dark .bnd-script-card p,
.dark .bnd-script-card li {
  color: rgba(242, 237, 230, 0.72);
}
html.sb-dark .bnd-script-card h2,
html.sb-dark .bnd-script-card blockquote,
html.sb-dark .bnd-check strong,
html.sb-dark .bnd-character strong,
.dark .bnd-script-card h2,
.dark .bnd-script-card blockquote,
.dark .bnd-check strong,
.dark .bnd-character strong {
  color: var(--sb-ink);
}
html.sb-dark .bnd-check span,
html.sb-dark .bnd-character p,
html.sb-dark .bnd-extra-copy,
html.sb-dark .bnd-footer-panel p,
.dark .bnd-check span,
.dark .bnd-character p,
.dark .bnd-extra-copy,
.dark .bnd-footer-panel p {
  color: var(--sb-ink-2);
}
html.sb-dark .bnd-check,
html.sb-dark .bnd-character,
html.sb-dark .bnd-card-sources a,
.dark .bnd-check,
.dark .bnd-character,
.dark .bnd-card-sources a {
  background: var(--sb-panel-2);
  border-color: var(--sb-line);
}
html.sb-dark .bnd-image-slot,
.dark .bnd-image-slot {
  border-color: rgba(255, 255, 255, 0.10);
  background:
    radial-gradient(120% 120% at 30% 25%, rgba(232, 120, 110, 0.10), rgba(255, 255, 255, 0.02)),
    var(--sb-panel-2);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.32);
}
html.sb-dark .bnd-image-grid,
.dark .bnd-image-grid {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 38px 38px;
}
html.sb-dark .bnd-image-content p,
.dark .bnd-image-content p {
  color: var(--sb-ink-2);
}
html.sb-dark .bnd-watch-box,
.dark .bnd-watch-box {
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
}
html.sb-dark .bnd-character-image,
.dark .bnd-character-image {
  border-color: rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(120% 100% at 30% 20%, rgba(232, 120, 110, 0.12), transparent 58%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015));
  color: var(--sb-ink-3);
}
html.sb-dark .bnd-character-image:before,
.dark .bnd-character-image:before {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
}
@media (prefers-reduced-motion: reduce) {
  .bnd-web-swinger,
  .bnd-page > section,
  .bnd-spidey-bubble,
  .bnd-walker-mask,
  .bnd-hand-web,
  .bnd-web-spark,
  .bnd-walker-art #__sbwk_root__,
  .bnd-walker-art #__sbwk_ll__,
  .bnd-walker-art #__sbwk_rl__,
  .bnd-walker-art #__sbwk_ra__,
  .bnd-walker-art #__sbwk_ra_bg__,
  .bnd-walker-art #__sbwk_la__,
  .bnd-walker-art #__sbwk_la_bg__ {
    animation: none;
  }
  .bnd-page > section {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
  .bnd-web-swinger {
    transform: translate(11vw, 66vh);
  }
  .bnd-walker-mask {
    opacity: 1;
  }
  .bnd-hand-web,
  .bnd-web-spark,
  .bnd-spidey-bubble {
    opacity: 0;
  }
}
`;

export default function SpiderManBrandNewDay() {
  useEffect(() => {
    document.body.classList.add("bnd-active");

    return () => {
      document.body.classList.remove("bnd-active");
    };
  }, []);

  return (
    <main className="bnd-page bnd-locked">
      <style>{CSS}</style>
      <SpideyInviteGate onAccept={() => undefined} />

      <section className="bnd-hero bnd-recap-hero">
        <div className="bnd-hero-inner bnd-recap-hero-inner">
          <div>
            <div className="bnd-kicker">
              <Shield size={15} />
              Spider-Braino catch-up file
            </div>
            <h1>
              Here's the
              <span>recap for you.</span>
            </h1>
            <p className="bnd-hero-copy">
              Full spoilers through No Way Home. Braino will walk you through the only Peter Parker story beats you need before Brand New Day.
            </p>
            <div className="bnd-hero-actions">
              <a className="bnd-hero-action" href="#details">
                <ArrowDown size={18} />
                Full file below
              </a>
              <span className="bnd-hero-note">
                <Sparkles size={17} />
                Braino has the mask on
              </span>
            </div>
          </div>
          <SpideyRecapDeck />
        </div>
        <div className="bnd-scroll">Scripts below</div>
      </section>

      <section className="bnd-band" id="details">
        <div className="bnd-inner bnd-intro-grid">
          <div>
            <div className="bnd-section-kicker">
              <BookOpen size={15} />
              No homework mode
            </div>
            <h2 className="bnd-intro-title">The minimum MCU timeline before Brand New Day.</h2>
          </div>
          <div>
            <p className="bnd-intro-copy">
              Your friend does not need the whole Marvel timeline. They only need Peter's arc: Tony pulling him into the larger world, the loss of that support system, the identity reveal, and the lonely reset that Brand New Day begins from.
            </p>
            <div className="bnd-checklist">
              <div className="bnd-check">
                <Film size={20} />
                <strong>Spoiler clear</strong>
                <span>The page openly covers everything through No Way Home.</span>
              </div>
              <div className="bnd-check">
                <ImageIcon size={20} />
                <strong>Visual pauses</strong>
                <span>Every timeline beat gets an image placeholder between sections.</span>
              </div>
              <div className="bnd-check">
                <Shield size={20} />
                <strong>Single focus</strong>
                <span>Peter Parker's emotional reset is the thread, not the entire MCU.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bnd-band bnd-scripts" id="scripts">
        <div className="bnd-inner">
          <div className="bnd-scripts-head">
            <div>
              <div className="bnd-section-kicker">
                <Film size={15} />
                Peter Parker file
              </div>
              <h2>Six beats that make the new movie make sense.</h2>
            </div>
            <p>
              Read this and you can walk into Brand New Day without having watched every Avengers crossover.
            </p>
          </div>

          <div className="bnd-timeline">
            {SCRIPT_SECTIONS.map((section, index) => (
              <TimelineEntry key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bnd-band bnd-extra-band">
        <div className="bnd-inner bnd-extra-grid">
          <div>
            <div className="bnd-section-kicker">
              <Shield size={15} />
              Extra names
            </div>
            <h2 className="bnd-extra-title">Three characters to recognise.</h2>
            <p className="bnd-extra-copy">
              This is the smallest useful glossary: enough to know why these people matter when they appear, without turning the page into homework.
            </p>
            <div className="bnd-watch-box">
              <h3>Least-overwhelming watch order</h3>
              <p>
                <strong>Best prep:</strong> Homecoming - short Infinity War / Endgame recap - Far From Home - No Way Home
              </p>
              <p>
                <strong>Absolute minimum:</strong> Far From Home - No Way Home
              </p>
              <p>
                <strong>Most important:</strong> No Way Home, because Brand New Day begins from the emotional consequences of its ending.
              </p>
            </div>
          </div>
          <div className="bnd-character-list">
            {EXTRA_CHARACTERS.map((character) => (
              <div className="bnd-character" key={character.name}>
                <div className="bnd-character-image" aria-label={`${character.name} image placeholder`}>
                  <span>
                    <ImageIcon size={15} />
                    {character.imageLabel}
                  </span>
                </div>
                <strong>{character.name}</strong>
                <p>{character.body}</p>
              </div>
            ))}
            <div className="bnd-card-sources">
              <a href={SOURCES.sony.href} target="_blank" rel="noreferrer">
                Sony cast listing
              </a>
              <a href={SOURCES.brandNewDayTrailer.href} target="_blank" rel="noreferrer">
                Marvel Brand New Day synopsis
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bnd-band bnd-footer-band">
        <div className="bnd-inner bnd-footer-panel">
          <div>
            <h2>Next pass: images and pacing.</h2>
            <p>
              The timeline is in. The placeholders now mark where we can drop stills, collages, trailer frames, or custom Braino art between each section.
            </p>
          </div>
          <div className="bnd-footer-badge">
            <Sparkles size={17} />
            Brand New Day file
          </div>
        </div>
      </section>
    </main>
  );
}
