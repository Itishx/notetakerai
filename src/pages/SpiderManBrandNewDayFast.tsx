import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { BRAINO_WALKER_SVG } from "../components/brainoWalkerSvg";

type ScriptSection = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  quote?: string;
  bullets?: string[];
  imageNote: string;
};

const SCRIPT_SECTIONS: ScriptSection[] = [
  {
    id: "civil-war",
    eyebrow: "Captain America: Civil War",
    title: "Peter meets Tony Stark",
    paragraphs: [
      "Tony Stark discovers that teenager Peter Parker is Spider-Man, gives him an advanced suit, and recruits him for the Avengers airport battle.",
      "From there, Tony becomes Peter's mentor and almost a father figure. This is the connection that pulls Peter out of Queens and into the larger superhero world.",
    ],
    imageNote: "Image slot after Script 01: airport battle reference, Stark suit beat, or Braino opening the MCU file.",
  },
  {
    id: "homecoming",
    eyebrow: "Spider-Man: Homecoming",
    title: "Peter becomes his own hero",
    paragraphs: [
      "Peter desperately wants Tony's approval and tries to stop the Vulture. Tony eventually takes away the suit, but Peter defeats Vulture using his homemade equipment.",
      "That proves the important point: the hero matters more than the technology. Peter then rejects immediate Avengers membership and chooses to remain a neighborhood-level Spider-Man.",
      "Also remember Mac Gargan, a criminal injured during Peter's ferry operation who ends the movie in prison wanting revenge.",
    ],
    imageNote: "Image slot after Script 02: homemade suit, Vulture aftermath, ferry incident, or Gargan prison tease.",
  },
  {
    id: "infinity-endgame",
    eyebrow: "Infinity War and Endgame",
    title: "Peter loses his mentor",
    paragraphs: [
      "Peter fights Thanos alongside Tony, disappears during the Snap, and returns five years later.",
      "Tony then sacrifices himself to defeat Thanos. Peter survives, but loses the person who introduced him to the superhero world and supplied most of his technology.",
    ],
    imageNote: "Image slot after Script 03: Titan recap, Snap visual, Tony memorial, or Peter looking at Stark tech.",
  },
  {
    id: "far-from-home",
    eyebrow: "Spider-Man: Far From Home",
    title: "Peter's identity is exposed",
    paragraphs: [
      "While grieving Tony, Peter is manipulated by Quentin Beck, also known as Mysterio.",
      "Peter defeats him, but Mysterio releases edited footage blaming Spider-Man for the destruction and publicly reveals the secret that changes Peter's life.",
      "Peter and MJ also become a couple during this movie.",
    ],
    quote: "Spider-Man is Peter Parker.",
    imageNote: "Image slot after Script 04: Mysterio broadcast, Daily Bugle screen, MJ and Peter, or identity reveal card.",
  },
  {
    id: "no-way-home",
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
    imageNote: "Image slot after Script 05: memory spell, coffee shop ending, apartment window, or homemade suit reveal.",
  },
  {
    id: "brand-new-day",
    eyebrow: "Spider-Man: Brand New Day",
    title: "The new movie begins from that loneliness",
    paragraphs: [
      "Brand New Day takes place four years after No Way Home. Peter is now an adult living entirely alone, while MJ and Ned have moved forward without remembering him.",
      "He has devoted his entire life to being a full-time Spider-Man. That pressure causes a mysterious physical evolution Peter may not be able to control, while New York faces a powerful unseen enemy.",
    ],
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

type InvitePhase = "setupStart" | "askSender" | "askRecipient" | "generated" | "ask" | "recap" | "done";
type InviteConfig = { sender: string; recipient: string };

const SETUP_START_LINE = "Press Start to make a personalized Spider-Man invite.";
const ASK_SENDER_LINE = "What is your name?";
const ASK_RECIPIENT_LINE = "Who are you asking?";
const fallbackSenderName = "the person who sent this";
const fallbackRecipientName = "you";
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

const SPIDEY_WALKER_HTML = BRAINO_WALKER_SVG
  .replace(/sbwk-/g, "bndSwing-")
  .replace(/sbb-/g, "bndSwing-");

function cleanInviteName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 42);
}

function getInviteLine(senderName: string, recipientName: string) {
  const sender = senderName || fallbackSenderName;
  const recipient = recipientName || fallbackRecipientName;
  return `Hi ${recipient}, I am Braino. Would you like to watch Spider-Man: Brand New Day with ${sender}?`;
}

function getInviteConfigFromUrl(): InviteConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const sender = cleanInviteName(params.get("from") || params.get("sender") || "");
  const recipient = cleanInviteName(params.get("to") || params.get("recipient") || "");
  return sender && recipient ? { sender, recipient } : null;
}

function buildInviteUrl(sender: string, recipient: string) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("from", sender);
  url.searchParams.set("to", recipient);
  return url.toString();
}

function ImageGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.2" cy="9.4" r="1.5" fill="currentColor" />
      <path d="M4.8 17.2 10 12.3l3.1 3 2.4-2.4 3.7 4.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpideyWalkerMask() {
  return (
    <svg className="bnd-walker-mask" viewBox="-8 -34 116 142" aria-hidden="true">
      <defs>
        <linearGradient id="bndFastMaskRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4d4d" />
          <stop offset="0.55" stopColor="#d9182e" />
          <stop offset="1" stopColor="#9d1022" />
        </linearGradient>
        <linearGradient id="bndFastMaskLens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dce9ff" />
        </linearGradient>
      </defs>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#bndFastMaskRed)" stroke="#111827" strokeWidth="1.2" />
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
      <path d="M 28 45 C 32 38 40 39 44 46 C 40 53 31 54 27 49 Z" fill="url(#bndFastMaskLens)" />
      <path d="M 72 45 C 68 38 60 39 56 46 C 60 53 69 54 73 49 Z" fill="url(#bndFastMaskLens)" />
      <path d="M 44 63 Q 50 68 56 63" fill="none" stroke="#170711" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function TourRail({ activeIndex }: { activeIndex: number }) {
  const progress = `${((activeIndex + 1) / TOUR_TOTAL) * 100}%`;

  return (
    <div className="bnd-script-rail" aria-label={`Chapter ${activeIndex + 1} of ${TOUR_TOTAL}`}>
      <div className="bnd-rail-track" aria-hidden="true">
        <span style={{ width: progress }} />
      </div>
      <div className="bnd-rail-row">
        <div className="bnd-rail-dots" aria-hidden="true">
          {TOUR_RAIL_LABELS.map((label, railIndex) => (
            <span
              key={label}
              className={`${railIndex === activeIndex ? "is-active" : ""}${railIndex < activeIndex ? " is-done" : ""}`}
            />
          ))}
        </div>
        <span className="bnd-rail-current">{TOUR_RAIL_LABELS[activeIndex]}</span>
      </div>
    </div>
  );
}

function ChapterMasthead({ activeIndex, eyebrow }: { activeIndex: number; eyebrow: string }) {
  return (
    <>
      <div className="bnd-card-masthead">
        <div>
          <span className="bnd-card-kicker">Peter Parker file</span>
          <p>{eyebrow}</p>
        </div>
        <div className="bnd-card-count" aria-label={`Chapter ${activeIndex + 1} of ${TOUR_TOTAL}`}>
          <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
          <span>/ {String(TOUR_TOTAL).padStart(2, "0")}</span>
        </div>
      </div>
      <TourRail activeIndex={activeIndex} />
    </>
  );
}

function ImageNote({ children }: { children: string }) {
  return (
    <div className="bnd-movie-image-note">
      <ImageGlyph />
      <span>{children}</span>
    </div>
  );
}

function MovieGlassCard({ section, index }: { section: ScriptSection; index: number }) {
  return (
    <div className="bnd-movie-card">
      <ChapterMasthead activeIndex={index} eyebrow={section.eyebrow} />
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.quote && <blockquote>{section.quote}</blockquote>}
      {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
      <ImageNote>{section.imageNote}</ImageNote>
    </div>
  );
}

function KeyTakeawaysGlassCard() {
  const activeIndex = SCRIPT_SECTIONS.length;
  return (
    <div className="bnd-movie-card">
      <ChapterMasthead activeIndex={activeIndex} eyebrow="Carry these into the movie" />
      <h2>Three key things to remember</h2>
      <ul>{KEY_TAKEAWAYS.map((item) => <li key={item}>{item}</li>)}</ul>
      <ImageNote>Image slot: Peter alone in New York, homemade suit, MJ and Ned memory reset, or Braino pinning the three reminders.</ImageNote>
    </div>
  );
}

function PeopleGlassCard() {
  const activeIndex = SCRIPT_SECTIONS.length + 1;
  return (
    <div className="bnd-movie-card">
      <ChapterMasthead activeIndex={activeIndex} eyebrow="Three people to recognise" />
      <h2>Three people your friend should know</h2>
      <div className="bnd-people-grid">
        {EXTRA_CHARACTERS.map((character) => (
          <article key={character.name}>
            <div className="bnd-mini-image">
              <ImageGlyph size={15} />
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
      <ChapterMasthead activeIndex={activeIndex} eyebrow="Least-overwhelming prep" />
      <h2>Least-overwhelming watch order</h2>
      <ul>
        <li><strong>Best prep:</strong> Homecoming - short Infinity War / Endgame recap - Far From Home - No Way Home.</li>
        <li><strong>Absolute minimum:</strong> Far From Home - No Way Home.</li>
        <li><strong>Most important:</strong> No Way Home, because Brand New Day begins from the emotional consequences of its ending.</li>
      </ul>
      <ImageNote>Image slot: simple watch-order strip, movie poster placeholders, or Braino holding the final checklist.</ImageNote>
    </div>
  );
}

function TourGlassCard({ index }: { index: number }) {
  if (index < SCRIPT_SECTIONS.length) return <MovieGlassCard section={SCRIPT_SECTIONS[index]} index={index} />;
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

function SpideyInviteGate() {
  const walkerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const talkRef = useRef(false);
  const flyingRef = useRef(false);
  const startingRef = useRef(false);
  const lastNoDodgeRef = useRef(0);
  const talkTimerRef = useRef<number | undefined>(undefined);
  const [initialInvite] = useState(() => getInviteConfigFromUrl());
  const [phase, setPhase] = useState<InvitePhase>(() => (initialInvite ? "ask" : "setupStart"));
  const [step, setStep] = useState(0);
  const [spideyMode, setSpideyMode] = useState(false);
  const [noDodges, setNoDodges] = useState(0);
  const [senderName, setSenderName] = useState(initialInvite?.sender ?? "");
  const [recipientName, setRecipientName] = useState(initialInvite?.recipient ?? "");
  const [generatedLink, setGeneratedLink] = useState("");

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
    const perchTop = barRect.top - 74;
    const floorTy = 74;
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
        say.textContent = initialInvite ? getInviteLine(initialInvite.sender, initialInvite.recipient) : SETUP_START_LINE;
        say.classList.add("show");
        talkRef.current = true;
        window.clearTimeout(talkTimerRef.current);
        talkTimerRef.current = window.setTimeout(() => { talkRef.current = false; }, initialInvite ? 5200 : 3400);
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
  }, []);

  useEffect(() => {
    if (phase === "askSender" || phase === "askRecipient" || phase === "done") {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase]);

  const beginSetup = () => {
    setSenderName("");
    setRecipientName("");
    setGeneratedLink("");
    setNoDodges(0);
    setPhase("askSender");
    showBarInput("Your name...");
    sayLine(ASK_SENDER_LINE, 2800);
  };

  const copyGeneratedLink = () => {
    if (!generatedLink) return;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(generatedLink)
        .then(() => sayLine("Copied. Send that link to them.", 2500))
        .catch(() => sayLine("Copy the link from the bar and send it.", 2800));
      return;
    }
    sayLine("Copy the link from the bar and send it.", 2800);
  };

  const startRecap = () => {
    if (startingRef.current) return;
    startingRef.current = true;
    const walker = walkerRef.current;
    if (walker) {
      const rect = walker.getBoundingClientRect();
      walker.style.setProperty("--bnd-fly-start-x", `${rect.left}px`);
      walker.style.setProperty("--bnd-fly-start-y", `${rect.top}px`);
      walker.classList.add("bg-glow");
    }
    setNoDodges(0);
    setSpideyMode(true);
    sayLine("Let's go.", 1500);
    const bar = barRef.current;
    bar?.classList.add("sb-climb");
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

  const dodgeNo = () => {
    const now = performance.now();
    if (now - lastNoDodgeRef.current < 180 || startingRef.current) return;
    lastNoDodgeRef.current = now;
    setNoDodges((value) => {
      const next = Math.min(value + 1, 6);
      sayLine("I'm sorry, but you don't really have an option. I suppose you have to click yes.", 4300);
      return next;
    });
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
    const rawValue = input?.value || "";
    const value = cleanInviteName(rawValue);
    const normalizedValue = value.toLowerCase();
    if (phase === "askSender") {
      if (!value) {
        sayLine("Tell me the name of the person asking.", 2600);
        input?.focus();
        return;
      }
      setSenderName(value);
      setPhase("askRecipient");
      showBarInput("Their name...");
      sayLine(ASK_RECIPIENT_LINE, 3000);
      return;
    }
    if (phase === "askRecipient") {
      if (!value) {
        sayLine("Tell me the name of the person being asked.", 2600);
        input?.focus();
        return;
      }
      setRecipientName(value);
      setNoDodges(0);
      const link = buildInviteUrl(senderName, value);
      setGeneratedLink(link);
      setPhase("generated");
      sayLine(`Done. Send this link to ${value}.`, 3600);
      return;
    }
    if (phase === "generated") {
      copyGeneratedLink();
      return;
    }
    if (phase === "recap") {
      advance();
      return;
    }
    if (phase === "done") {
      sayLine(value ? "Noted. We are ready for Brand New Day." : "Say it here. I am listening.", 3200);
      if (input) input.value = "";
      return;
    }
    if (normalizedValue === "yes" || normalizedValue === "y" || normalizedValue === "yeah" || normalizedValue === "yep") {
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
  const yesWidth = Math.min(96, 50 + noDodges * 8);
  const yesFill = Math.min(100, 18 + noDodges * 15);
  const inputPlaceholder =
    phase === "askSender"
      ? "Your name..."
      : phase === "askRecipient"
        ? "Their name..."
        : phase === "done"
          ? "Any doubts? Type here..."
          : "";
  const choiceStyle = {
    "--bnd-yes-width": `${yesWidth}%`,
    "--bnd-yes-fill": `${yesFill}%`,
    "--bnd-no-x": noDodges % 2 === 1 ? "calc(-100% - 8px)" : "0px",
  } as CSSProperties;

  return (
    <section className={`bnd-gate bnd-movie-tour${spideyMode ? " is-spidey" : ""}`} aria-label="Spider-Man Brand New Day tour">
      <div ref={cardRef} className={`bg-card${cardOpen ? " show" : ""}`} aria-hidden={!cardOpen}>
        <div
          className="bg-card-grab"
          onPointerDown={onCardDown}
          onPointerMove={onCardMove}
          onPointerUp={onCardUp}
          onPointerCancel={onCardUp}
        >
          <span aria-hidden="true" />
        </div>
        <div className="bg-card-scroll">
          <div key={getTourStepId(step)} className="bg-pop">
            <TourGlassCard index={step} />
          </div>
        </div>
      </div>

      <div className="bg-lane">
        <div ref={walkerRef} className="bg-walker">
          <div ref={sayRef} id="__sbwk_say__">
            {recipientName && phase === "ask" ? getInviteLine(senderName, recipientName) : SETUP_START_LINE}
          </div>
          <span className="bnd-tour-web bnd-tour-web-one" />
          <span className="bnd-tour-web bnd-tour-web-two" />
          <span className="bnd-tour-web-spark" />
          <div id="__sbwk_flip__" dangerouslySetInnerHTML={{ __html: SPIDEY_WALKER_HTML }} />
          <span className="bnd-tour-mask"><SpideyWalkerMask /></span>
        </div>
      </div>

      <div ref={barRef} id="__sb_bar__" data-step={phase === "recap" ? `Card ${step + 1} of ${TOUR_TOTAL}` : ""}>
        {phase === "setupStart" ? (
          <div className="bnd-start-ui">
            <button type="button" className="bnd-start-btn" onClick={beginSetup}>
              Start
            </button>
          </div>
        ) : phase === "ask" ? (
          <div className="bnd-choice-ui" style={choiceStyle}>
            <button type="button" className="bnd-choice-btn bnd-choice-yes" onClick={startRecap}>
              <span>Yes</span>
            </button>
            <button
              type="button"
              className="bnd-choice-btn bnd-choice-no"
              onPointerEnter={dodgeNo}
              onPointerDown={(event) => {
                event.preventDefault();
                dodgeNo();
              }}
              onFocus={dodgeNo}
              onClick={(event) => {
                event.preventDefault();
                dodgeNo();
              }}
            >
              <span>No</span>
            </button>
          </div>
        ) : phase === "generated" ? (
          <div className="bnd-link-ui">
            <input
              className="bnd-link-value"
              value={generatedLink}
              readOnly
              aria-label="Personalized invite link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="bnd-copy-btn" onClick={copyGeneratedLink}>
              Copy
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              id="__sb_input__"
              placeholder={inputPlaceholder}
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
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}

const CSS = `
body.bnd-active {
  background: #060a12;
}
body.bnd-active #sb-brain-mascot-wrapper {
  display: none !important;
}
.bnd-spidey-page {
  min-height: 100vh;
  background: #060a12;
  color: #fbfaf8;
  overflow: hidden;
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
    radial-gradient(circle at 20% 20%, rgba(217, 24, 46, 0.26), transparent 34%),
    radial-gradient(circle at 78% 18%, rgba(46, 109, 194, 0.22), transparent 34%),
    linear-gradient(180deg, #060a12 0%, #09192e 58%, #060a12 100%);
}
.bnd-gate::before {
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  --bnd-fly-right: min(78vw, calc(100vw - 116px));
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
  max-width: 340px;
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
  z-index: -1;
  pointer-events: none;
}
.bnd-movie-tour #__sb_bar__[data-step]:not([data-step=""])::after {
  content: attr(data-step);
  position: absolute;
  left: 28px;
  top: -30px;
  color: rgba(245, 241, 234, 0.7);
  font-family: "JetBrains Mono", monospace;
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
.bnd-movie-tour #__sb_bar__.sb-climb .sb-bar-icon-btn,
.bnd-movie-tour #__sb_bar__.sb-climb .bnd-choice-ui,
.bnd-movie-tour #__sb_bar__.sb-climb .bnd-start-ui,
.bnd-movie-tour #__sb_bar__.sb-climb .bnd-link-ui {
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
.bnd-start-ui {
  flex: 1;
  min-width: 0;
  height: 42px;
  margin-left: -18px;
  transition: opacity 0.3s ease;
}
.bnd-start-btn {
  width: 100%;
  height: 42px;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 999px;
  background: linear-gradient(90deg, #C9544A, #E8786E 58%, #F0A24E);
  color: #fff;
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.28), 0 14px 34px rgba(232,120,110,0.2);
  cursor: pointer;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.bnd-start-btn:hover {
  transform: translateY(-1px);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.32), 0 18px 40px rgba(232,120,110,0.28);
}
.bnd-choice-ui {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 42px;
  margin-left: -18px;
  transition: opacity 0.3s ease;
}
.bnd-choice-btn {
  position: absolute;
  top: 0;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.42);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition:
    width 0.34s cubic-bezier(.22,1,.36,1),
    transform 0.26s cubic-bezier(.22,1.3,.36,1),
    box-shadow 0.26s ease,
    border-color 0.26s ease,
    background 0.26s ease;
}
.bnd-choice-btn span {
  position: relative;
  z-index: 1;
}
.bnd-choice-yes {
  left: 0;
  width: calc(var(--bnd-yes-width, 50%) - 4px);
  color: #fff;
  background: rgba(232,120,110,0.34);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.24), 0 10px 28px rgba(200,84,74,0.12);
}
.bnd-choice-yes::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--bnd-yes-fill, 18%);
  border-radius: inherit;
  background: linear-gradient(90deg, #C9544A, #E8786E 58%, #F0A24E);
  box-shadow: 0 0 22px rgba(232,120,110,0.45);
  transition: width 0.34s cubic-bezier(.22,1,.36,1);
  z-index: 0;
}
.bnd-choice-yes:hover {
  border-color: rgba(255,255,255,0.72);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.28), 0 14px 34px rgba(232,120,110,0.22);
}
.bnd-choice-no {
  right: 0;
  width: calc(50% - 4px);
  z-index: 3;
  color: #3D2D27;
  background: rgba(255,251,247,0.64);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.45), 0 8px 22px rgba(27,23,19,0.1);
  transform: translateX(var(--bnd-no-x, 0px));
}
.bnd-choice-no:hover,
.bnd-choice-no:focus-visible {
  border-color: rgba(255,255,255,0.88);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.52), 0 14px 30px rgba(27,23,19,0.16);
}
.bnd-link-ui {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 42px;
  margin-left: -18px;
  transition: opacity 0.3s ease;
}
.bnd-link-value {
  flex: 1;
  min-width: 0;
  height: 42px;
  border: 1px solid rgba(255,255,255,0.42);
  border-radius: 999px;
  outline: 0;
  padding: 0 14px;
  background: rgba(255,251,247,0.62);
  color: #1B1713;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.45), 0 8px 22px rgba(27,23,19,0.1);
  text-shadow: 0 0 4px rgba(255,255,255,0.9);
}
.bnd-copy-btn {
  flex: none;
  width: 76px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: #E8786E;
  color: #fff;
  cursor: pointer;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: background 0.15s ease, transform 0.15s ease;
}
.bnd-copy-btn:hover {
  background: #C9544A;
  transform: translateY(-1px);
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
  cursor: grab;
  user-select: none;
}
.bnd-movie-tour .bg-card-grab span {
  width: 48px;
  height: 4px;
  border-radius: 999px;
  background: rgba(245,241,234,0.24);
  box-shadow: 0 1px 0 rgba(255,255,255,0.16);
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
.bnd-card-masthead {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(245,241,234,0.11);
}
.bnd-card-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(245,241,234,0.48);
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.bnd-card-kicker::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E8786E;
  box-shadow: 0 0 18px rgba(232,120,110,0.82);
}
.bnd-card-masthead p {
  margin: 8px 0 0;
  color: #F0A24E;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.bnd-card-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: rgba(245,241,234,0.44);
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
}
.bnd-card-count strong {
  color: rgba(245,241,234,0.92);
  font-size: clamp(30px, 4vw, 46px);
  line-height: 0.86;
  letter-spacing: 0;
}
.bnd-card-count span {
  font-size: 12px;
  font-weight: 800;
}
.bnd-script-rail {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.bnd-rail-track {
  position: relative;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(245,241,234,0.12);
}
.bnd-rail-track span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #E8786E, #F0A24E);
  box-shadow: 0 0 18px rgba(232,120,110,0.42);
  transition: width 0.42s cubic-bezier(.22,1,.36,1);
}
.bnd-rail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.bnd-rail-dots {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  align-items: center;
  flex: 1;
  gap: 8px;
  max-width: 260px;
}
.bnd-rail-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(245,241,234,0.18);
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}
.bnd-rail-dots span.is-done {
  background: rgba(232,120,110,0.56);
}
.bnd-rail-dots span.is-active {
  transform: scale(1.7);
  background: #F5F1EA;
  box-shadow: 0 0 0 5px rgba(232,120,110,0.18), 0 0 18px rgba(232,120,110,0.48);
}
.bnd-rail-current {
  color: rgba(245,241,234,0.54);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
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
  font-family: "JetBrains Mono", monospace;
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
  font-family: "Instrument Serif", Georgia, serif;
  font-weight: 400;
  font-size: clamp(34px, 5vw, 70px);
  line-height: 0.96;
  letter-spacing: 0;
}
.bnd-movie-card p,
.bnd-movie-card li {
  color: rgba(245,241,234,0.72);
  font-family: "Newsreader", Georgia, serif;
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
  font-family: "Instrument Serif", Georgia, serif;
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
@keyframes bndMaskOn {
  0%, 44% { opacity: 0; transform: translateX(-50%) scale(0.9); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
  56%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
}
@media (max-width: 860px) {
  .bnd-people-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .bnd-movie-tour .bg-card {
    top: 7vh;
    height: 68vh;
    min-width: 0;
  }
  .bnd-card-masthead {
    flex-direction: column;
    gap: 14px;
  }
  .bnd-rail-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .bnd-rail-dots {
    width: 100%;
    max-width: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bnd-movie-tour .bg-walker.bg-flying,
  .bnd-movie-tour .bg-walker.bg-flying #__sbwk_flip__,
  .bnd-movie-tour .bg-walker.bg-flying .bnd-tour-web,
  .bnd-movie-tour .bg-walker.bg-flying .bnd-tour-web-spark {
    animation-duration: 0.2s;
    animation-iteration-count: 1;
  }
}
`;

export default function SpiderManBrandNewDayFast() {
  useEffect(() => {
    document.body.classList.add("bnd-active");
    document.documentElement.classList.remove("bnd-html-boot");
    return () => {
      document.body.classList.remove("bnd-active");
    };
  }, []);

  return (
    <main className="bnd-spidey-page">
      <style>{CSS}</style>
      <SpideyInviteGate />
    </main>
  );
}
