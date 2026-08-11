import KineticFilm from "@/components/KineticFilm";
import type { KBeat } from "@/lib/kineticFilm";
import { useEffect, useRef, useState } from "react";
import { applyDontBlinkBlueprint, DONT_BLINK_BLUEPRINT, dontBlinkWords } from "@/lib/dontBlinkBlueprint";
import victoryLap from "../../teasermusic/victorylap.mp3?url";
import "./dont-blink-blueprint.css";
import "./braino-hera-teaser.css";

// The flagship Don't Blink grammar: every word of two or more characters
// constructs from two fused halves. This applies to the entire kinetic
// script; the product-demo transcript inside the notch remains natural text.
const phraseWords = (copy: string) => dontBlinkWords(copy);

const text = (id: string, copy: string, options: Omit<KBeat, "id" | "words"> = {}): KBeat => ({
  id,
  words: phraseWords(copy),
  scriptText: copy,
  cadence: 185,
  gapAfter: 165,
  ...options,
});

const graphic = (id: string, hero: string, heroMode: string, hold: number): KBeat => ({
  id,
  words: [],
  scriptText: `[Graphic: ${heroMode}]`,
  hero,
  heroMode,
  cadence: 1,
  gapAfter: hold,
});

const credit = (id: string, copy: string, mode: string, hold: number): KBeat => ({
  id,
  // The stack lands one complete word at a time. Rendering split halves as
  // separate flex items caused visible collisions such as "some" + "one".
  words: copy.trim().split(/\s+/),
  scriptText: copy,
  hero: "thought",
  heroMode: mode,
  cadence: MIN_CHUNK_CADENCE_MS,
  gapAfter: hold,
});

const MIN_CHUNK_CADENCE_MS = 170;
const THOUGHT_WORD_CADENCE_MS = 190;
const WHOLE_PHRASE_FADE_BEATS = new Set(["stop-scrolling"]);

const BEATS = applyDontBlinkBlueprint([
  // Founder-story cut. The opening and all product mechanics stay visually
  // locked; only the campaign narrative changes.
  { id: "stop-scrolling", words: ["Stop", "scrolling,", "homie."], scriptText: "Stop scrolling, homie.", cadence: 1, gapAfter: 1620 },
  text("real-story", "Real story.", { cadence: 220, gapAfter: 420 }),
  text("while-building", "While I was", { cadence: 190, gapAfter: 90 }),
  text("building-braino", "building Braino.", { cadence: 190, gapAfter: 260 }),
  text("every-note", "every note,", { cadence: 185, gapAfter: 80 }),
  text("every-prompt", "every prompt,", { cadence: 185, gapAfter: 80 }),
  text("every-idea", "every 2am idea.", { cadence: 185, gapAfter: 300, matchCutLast: true }),
  text("wasnt", "I wasn't typing.", { cadence: 200, gapAfter: 420 }),
  text("talking", "I was talking.", { cadence: 220, gapAfter: 520, big: true, matchCutLast: true }),
  text("wispr-flow", "Wispr Flow.", { cadence: 230, gapAfter: 380, big: true, matchCutLast: true }),
  text("genuinely", "Genuinely one", { cadence: 190, gapAfter: 90 }),
  text("of-the-best", "of the best", { cadence: 185, gapAfter: 90 }),
  text("tools-used", "tools I've", { cadence: 185, gapAfter: 80 }),
  text("ever-used", "ever used.", { cadence: 190, gapAfter: 440 }),
  text("one-night", "And one night", { cadence: 190, gapAfter: 90 }),
  text("hit-me", "it hit me.", { cadence: 200, gapAfter: 420 }),
  text("wait", "wait.", { cadence: 250, gapAfter: 480 }),
  credit("thought-1", "I'm building an AI", "roll-1", 260),
  credit("thought-2", "that lives on your Mac.", "roll-2", 220),
  credit("thought-3", "Why is talking", "roll-3", 220),
  credit("thought-4", "someone else's job?", "roll-4", 620),
  text("taught-him", "So I taught him.", { cadence: 210, gapAfter: 460, big: true }),
  text("same-speed", "Same speed,", { cadence: 190, gapAfter: 90 }),
  text("same-magic", "same magic.", { cadence: 210, gapAfter: 440, matchCutLast: true }),
  text("now-lives", "But now it", { cadence: 190, gapAfter: 90 }),
  text("in-notch", "lives in your notch.", { cadence: 210, gapAfter: 460, big: true, matchCutEveryWordEnd: true }),
  graphic("proof", "proof", "full", 9000),
  text("prettier", "and yeah… it's prettier.", { cadence: 195, gapAfter: 260 }),
  text("we-know", "We know.", { cadence: 220, gapAfter: 520, big: true, matchCutLast: true }),
  { id: "post-proof-breath", words: [], scriptText: "[Black transition]", cadence: 1, gapAfter: 260 },
  text("words-that", "The words that", { cadence: 195, gapAfter: 90 }),
  text("built-braino", "built Braino…", { cadence: 205, gapAfter: 420 }),
  text("now-braino", "now Braino", { cadence: 200, gapAfter: 90 }),
  text("types-them", "types them.", { cadence: 220, gapAfter: 720, big: true, matchCutLast: true }),
  text("introducing", "Introducing.", { cadence: 210, gapAfter: 220 }),
  text("brainoflow", "BrainoFlow.", { cadence: 250, gapAfter: 820, big: true }),
  text("ellipsis", "…", { cadence: 1, gapAfter: 720 }),
  text("nah", "Nah.", { cadence: 250, gapAfter: 420 }),
  text("not-flow", "She's not", { cadence: 205, gapAfter: 90 }),
  text("a-flow", "a flow.", { cadence: 205, gapAfter: 360 }),
  text("family", "She's family.", { cadence: 230, gapAfter: 620, matchCutLast: true }),
  { id: "hera-name", words: ["H", "+E", "+R", "+A"], scriptText: "HERA", cadence: 230, gapAfter: 1250, big: true },
  text("talk-types", "Talk. It types.", { cadence: 220, gapAfter: 180, big: true, matchCutLast: true }),
  text("thats-it", "That’s it.", { cadence: 220, gapAfter: 340 }),
  text("included", "Included with Braino", { cadence: 200, gapAfter: 180 }),
  { id: "foundry", words: ["F", "+O", "+U", "+N", "+D", "+R", "+Y."], scriptText: "Foundry.", cadence: 190, gapAfter: 1300, big: true, iomiReveal: true },
  graphic("caret", "caret", "blink", 900),
]).map((beat) => ({
  ...beat,
  snap: true,
  // Film speed and chunk legibility are separate controls. Shorter holds keep
  // the cut fast, while split halves never land closer than 170ms, the same
  // readable principle used by Braino OS and the recent Don't Blink films.
  cadence: beat.words.length > 0 && !WHOLE_PHRASE_FADE_BEATS.has(beat.id)
    ? Math.max(MIN_CHUNK_CADENCE_MS, Math.round((beat.cadence ?? DONT_BLINK_BLUEPRINT.cadence) * .70))
    : beat.cadence,
  gapAfter: beat.gapAfter == null ? beat.gapAfter : Math.round(beat.gapAfter * .85),
}));

const PROOF_LINES = [
  "On a plane? Still types.",
  "Wifi died? Still types.",
  "Middle of nowhere?",
  "Beautiful. Still types.",
] as const;
const PROOF_LINE_CHUNKS = PROOF_LINES.map((line) => dontBlinkWords(line));
const PROOF_CHUNKS = PROOF_LINE_CHUNKS.flat();

const joinProofChunks = (chunks: string[], count: number) => chunks.slice(0, count).reduce((copy, token) => {
  if (token.startsWith("+")) return copy + token.slice(1);
  return `${copy}${copy ? " " : ""}${token}`;
}, "");

function HeraProof() {
  const rootRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [visibleChunks, setVisibleChunks] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const hero = root?.closest<HTMLElement>(".kf-hero");
    if (!hero) return;
    let startTimer = 0;
    let wordTimer = 0;
    let active = false;

    const stop = () => {
      window.clearTimeout(startTimer);
      window.clearInterval(wordTimer);
    };
    const sync = () => {
      const nextActive = hero.dataset.heroMode === "full";
      // KineticFilm writes the current mode on every animation frame. Ignore
      // same-value attribute notifications or the transcript would restart
      // continuously and appear stuck on its opening words.
      if (nextActive === active) return;
      active = nextActive;
      stop();
      if (!active) {
        setVisibleChunks(0);
        return;
      }
      setVisibleChunks(0);
      startTimer = window.setTimeout(() => {
        setVisibleChunks(1);
        wordTimer = window.setInterval(() => {
          setVisibleChunks((count) => {
            if (count >= PROOF_CHUNKS.length) {
              window.clearInterval(wordTimer);
              return count;
            }
            return count + 1;
          });
        }, 145);
      }, 440);
    };

    const observer = new MutationObserver(sync);
    observer.observe(hero, { attributes: true, attributeFilter: ["data-hero-mode"] });
    sync();
    return () => { stop(); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    // Keep the newest dictated line visible as the transcript grows downward.
    transcript.scrollTop = transcript.scrollHeight;
  }, [visibleChunks]);

  return (
    <div ref={rootRef} className="hera-proof" aria-hidden="true">
      <div className="hera-proof-notch">
        <header>
          <span><i />Braino<span className="hera-shimmer">HERA</span></span>
          <b>Listening</b>
        </header>
        <div ref={transcriptRef} className="hera-proof-transcript">
          {PROOF_LINE_CHUNKS.map((chunks, index) => {
            const before = PROOF_LINE_CHUNKS.slice(0, index).reduce((total, line) => total + line.length, 0);
            const count = Math.max(0, Math.min(chunks.length, visibleChunks - before));
            const isCurrent = count > 0 && visibleChunks <= before + chunks.length;
            return count > 0 ? (
              <p className="hera-proof-line" key={PROOF_LINES[index]}>
                {joinProofChunks(chunks, count)}
                {isCurrent ? <i /> : null}
              </p>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function CaretEnd() {
  return <div className="hera-caret-end" aria-hidden="true"><i /></div>;
}

const THOUGHT_LINES = [
  "I'm building an AI",
  "that lives on your Mac.",
  "Why is talking",
  "someone else's job?",
] as const;
const SILENT_THOUGHT_BEATS = ["thought-1", "thought-2", "thought-3", "thought-4"] as const;

function ThoughtRoll() {
  return (
    <div className="hera-thought-roll" aria-hidden="true">
      <div className="hera-thought-track">
        {THOUGHT_LINES.map((line) => (
          <p key={line}>
            {line.split(/\s+/).map((word, index) => (
              <span
                key={`${line}-${index}`}
                style={{ animationDelay: `${index * THOUGHT_WORD_CADENCE_MS}ms` }}
              >
                {word}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function BrainoHeraTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return (
    <div className="nt-page-root hera-db-film">
      <KineticFilm
        beats={BEATS}
        cadence={DONT_BLINK_BLUEPRINT.cadence}
        gap={DONT_BLINK_BLUEPRINT.gap}
        audioSrc={victoryLap}
        audioStartOffsetMs={13_000}
        mutedBeatIds={SILENT_THOUGHT_BEATS}
        endHoldMs={500}
        editable={false}
        pageClass="hera-db-canvas dont-blink-blueprint"
        heroSlots={{ proof: <HeraProof />, thought: <ThoughtRoll />, caret: <CaretEnd /> }}
        onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }}
      />
    </div>
  );
}
