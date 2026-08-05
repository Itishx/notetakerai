import KineticFilm from "@/components/KineticFilm";
import type { KBeat } from "@/lib/kineticFilm";
import "./braino-os-teaser.css";

/* ============================================================================
   /braino-os — a finished film, not an editor. The timeline follows the
   Don't Blink grammar: natural phrase chunks, tempo acceleration, selective
   match cuts, one strobe climax, a hard stop, then the brand landing.
   ============================================================================ */

const RAW_BEATS: KBeat[] = [
  // Every entry is a replacement card. Words only share an entry when the
  // phrase is deliberately meant to land as one visual chunk.
  { id: "good", words: ["Good"], cadence: 400, cutEveryWord: true, gapAfter: 300 },
  { id: "things", words: ["things"], cadence: 400, cutEveryWord: true, gapAfter: 300 },
  { id: "come", words: ["come"], cadence: 400, cutEveryWord: true, gapAfter: 300 },
  { id: "in", words: ["in"], cadence: 400, cutEveryWord: true, gapAfter: 300 },
  { id: "twos", words: ["tw", "+os."], cadence: 420, matchCut: true, gapAfter: 560 },
  { id: "and-so", words: ["And", "so"], cadence: 350, gapAfter: 300 },
  { id: "does", words: ["does"], cadence: 360, gapAfter: 280 },
  { id: "braino", words: ["Bra", "+ino."], cadence: 380, gapAfter: 650 },

  // The Don't Blink stomp: One → lives → in → your browser.
  { id: "browser-one", words: ["One"], cadence: 300, gapAfter: 170 },
  { id: "browser-lives", words: ["lives"], cadence: 290, gapAfter: 160 },
  { id: "browser-in", words: ["in"], cadence: 280, gapAfter: 150 },
  { id: "browser-place", words: ["your", "browser."], cadence: 270, gapAfter: 360 },
  { id: "free", words: ["Free."], cadence: 320, gapAfter: 360 },
  { id: "always-has", words: ["Always", "has."], cadence: 300, gapAfter: 460 },
  { id: "the-other", words: ["The", "other"], cadence: 290, gapAfter: 180 },
  { id: "just-moved", words: ["just", "moved"], cadence: 280, gapAfter: 170 },
  { id: "into-your", words: ["into", "your"], cadence: 270, gapAfter: 150 },
  { id: "mac", words: ["Mac."], cadence: 300, matchCut: true, gapAfter: 600 },

  // The argument accelerates through short replacement cards.
  { id: "not-app", words: ["Not", "an", "app."], cadence: 250, gapAfter: 250 },
  { id: "apps-do-one-thing", words: ["Apps", "do", "one", "th", "+ing."], cadence: 220, gapAfter: 260 },
  { id: "he-decides", words: ["He", "decides"], cadence: 220, gapAfter: 150 },
  { id: "which-thing", words: ["which", "thing."], cadence: 215, matchCut: true, gapAfter: 340 },
  { id: "thats-not", words: ["That’s", "not"], cadence: 230, gapAfter: 150 },
  { id: "an-app", words: ["an", "app."], cadence: 225, gapAfter: 300 },
  { id: "thats-an", words: ["That’s", "an"], cadence: 230, gapAfter: 150 },
  { id: "os", words: ["OS."], cadence: 260, matchCut: true, gapAfter: 320 },
  { id: "os-brand", words: ["Bra", "+ino", "+OS."], cadence: 280, matchCut: true, big: true, snap: true, gapAfter: 650 },

  // The stack.
  { id: "heres-how", words: ["Here’s", "how:"], cadence: 260, gapAfter: 280 },
  { id: "heart", words: ["Emotional", "Engine."], cadence: 270, gapAfter: 580 },
  { id: "powers-a", words: ["Powers"], cadence: 220, gapAfter: 120 },
  { id: "attunement", words: ["the", "attunement."], cadence: 210, gapAfter: 260 },
  { id: "powers-b", words: ["Powers"], cadence: 210, gapAfter: 110 },
  { id: "qualities", words: ["twelve", "qualities."], cadence: 205, gapAfter: 500 },
  { id: "underneath", words: ["Underneath", "that—"], cadence: 220, gapAfter: 260 },
  { id: "human", words: ["Human"], cadence: 200, gapAfter: 100 },
  { id: "intelligence", words: ["Intelligence"], cadence: 195, gapAfter: 90 },
  { id: "layer", words: ["Layer."], cadence: 200, matchCut: true, gapAfter: 480 },
  { id: "powers-c", words: ["Powers"], cadence: 200, gapAfter: 100 },
  { id: "reasoning", words: ["the", "reasoning."], cadence: 195, gapAfter: 230 },
  { id: "powers-d", words: ["Powers"], cadence: 190, gapAfter: 90 },
  { id: "scheduling", words: ["the", "scheduling."], cadence: 185, gapAfter: 440 },
  { id: "together", words: ["Together"], cadence: 190, gapAfter: 100 },
  { id: "they-power", words: ["they", "power"], cadence: 185, gapAfter: 100 },
  { id: "brand-two", words: ["Bra", "+ino", "+OS."], cadence: 240, matchCut: true, big: true, gapAfter: 540 },

  // Fast proof run.
  { id: "he-sees", words: ["He", "sees"], cadence: 280, gapAfter: 150 },
  { id: "the-screen", words: ["the", "screen."], cadence: 280, gapAfter: 220 },
  { id: "reads", words: ["Reads"], cadence: 270, gapAfter: 140 },
  { id: "the-page", words: ["the", "page."], cadence: 270, gapAfter: 200 },
  { id: "knows-what", words: ["Knows", "what"], cadence: 270, gapAfter: 140 },
  { id: "this-means", words: ["“this”", "means."], cadence: 270, gapAfter: 200 },
  { id: "breaks-it", words: ["Breaks", "it"], cadence: 260, gapAfter: 130 },
  { id: "down", words: ["down."], cadence: 260, gapAfter: 180 },
  { id: "checks", words: ["Checks"], cadence: 260, gapAfter: 130 },
  { id: "his-work", words: ["his", "work."], cadence: 260, gapAfter: 180 },
  { id: "thinks", words: ["Thinks"], cadence: 270, gapAfter: 130 },
  { id: "first", words: ["first."], cadence: 280, matchCut: true, gapAfter: 500 },

  // One controlled strobe climax: four distinct impact cards.
  { id: "new-engine", words: ["New", "engine."], cadence: 190, strobe: true, gapAfter: 100 },
  { id: "new-layer", words: ["New", "layer."], cadence: 190, strobe: true, gapAfter: 100 },
  { id: "new-os", words: ["New", "OS."], cadence: 190, strobe: true, gapAfter: 100 },
  { id: "new-name", words: ["New", "name."], cadence: 190, strobe: true, gapAfter: 650 },

  // Hard stop and final landing.
  { id: "two-brainos", words: ["Two", "Bra", "+inos."], cadence: 320, gapAfter: 260 },
  { id: "one-stack", words: ["One", "stack."], cadence: 320, matchCut: true, gapAfter: 1700 },
  { id: "landing-braino", words: ["Bra", "+ino."], cadence: 300, gapAfter: 220 },
  { id: "landing-and", words: ["And"], cadence: 260, gapAfter: 150 },
  { id: "landing-os", words: ["Bra", "+ino", "OS"], cadence: 240, gapAfter: 220 },
  { id: "landing-iomi", words: ["I", "+O", "+M", "+I."], cadence: 300, cutEveryWord: true, iomiReveal: true, gapAfter: 900 },
  { id: "powered-by", words: ["Powered", "by"], cadence: 220, gapAfter: 140 },
  { id: "powered-engine", words: ["Emotional", "Engine."], cadence: 215, gapAfter: 300 },
  { id: "more-human", words: ["More", "Human."], cadence: 220, gapAfter: 180 },
  { id: "less-ai", words: ["Less", "AI."], cadence: 215, gapAfter: 460 },
  { id: "url", words: ["trybraino.com"], cadence: 300, gapAfter: 300 },
];

// Copied from the flagship Don't Blink teaser: meaningful words of 4+
// letters split once at their midpoint, while connective words stay whole.
// This keeps every card alive without turning natural phrases into stutters.
const CHUNK_SKIP = new Set([
  "your", "yours", "that", "with", "from", "they", "them", "their", "there",
  "have", "been", "were", "will", "just", "else", "what", "when", "than",
  "then", "these", "those", "some", "such", "into", "onto", "over",
  "only", "also", "both", "each", "same", "very", "much", "more", "most",
]);

function chunkWord(word: string): string[] {
  const marker = word.startsWith("+") || word.startsWith("*") ? word[0] : "";
  if (marker === "*") return [word];
  const match = word.slice(marker.length).match(/^([^A-Za-z0-9]*)([A-Za-z0-9’']+)(.*)$/);
  if (!match) return [word];
  const [, prefix, core, suffix] = match;
  if (core.length < 4 || CHUNK_SKIP.has(core.toLowerCase())) return [word];
  const cut = Math.floor(core.length / 2);
  return [`${marker}${prefix}${core.slice(0, cut)}`, `+${core.slice(cut)}${suffix}`];
}

const BEATS: KBeat[] = RAW_BEATS.map((beat) => ({
  ...beat,
  words: beat.words.flatMap(chunkWord),
}));

export default function BrainoOSTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return (
    <div className="nt-page-root braino-os-film">
      <KineticFilm
        beats={BEATS}
        audioSrc="/one.mp3"
        audioStartOffsetMs={140_000}
        cadence={280}
        gap={240}
        endHoldMs={2200}
        editable={false}
        pageClass="braino-os-canvas"
        onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }}
      />
    </div>
  );
}
