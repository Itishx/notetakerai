import KineticFilm from "@/components/KineticFilm";
import type { KBeat } from "@/lib/kineticFilm";
import { applyDontBlinkBlueprint, dontBlinkWords, DONT_BLINK_BLUEPRINT } from "@/lib/dontBlinkBlueprint";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "./ecosystem-teaser.css";
import "./dont-blink-blueprint.css";
import placesToBe from "../../teasermusic/Fred again.. & Anderson .Paak - places to be feat. Chika.mp3?url";

/* A Braino ecosystem film in the flagship /dontblink grammar. Runtime follows
   the story now; it is never compressed to fit an arbitrary duration. */

const beat = (id: string, text: string, options: Omit<KBeat, "id" | "words"> = {}): KBeat => ({
  id,
  words: dontBlinkWords(text),
  scriptText: text,
  ...options,
  // Ecosystem cuts always land on the spoken payoff at the end of the card.
  ...(options.matchCut ? { matchCut: false, matchCutLast: true } : {}),
});

const RAW_BEATS: KBeat[] = [
  { id: "origin-name", words: ["Bra", "+ino", "@braino", "+@hold"], scriptText: "Braino", cadence: 220, hero: "orbit", heroMode: "origin", gapAfter: 180 },
  beat("origin-a", "started", { cadence: 190, hero: "orbit", heroMode: "origin", gapAfter: 70 }),
  beat("origin-b", "in a browser tab.", { cadence: 190, matchCut: true, hero: "orbit", heroMode: "tab", gapAfter: 300 }),
  beat("small-a", "Cute.", { cadence: 240, matchCut: true, strobeCount: 3, hero: "orbit", heroMode: "tab", gapAfter: 180 }),
  beat("small-b", "But slightly limiting.", { cadence: 210, matchCut: true, hero: "orbit", heroMode: "tab", gapAfter: 300 }),
  beat("learned-a", "Because once he learned", { cadence: 180, hero: "orbit", heroMode: "tab", gapAfter: 70 }),
  beat("learned-b", "how you work", { cadence: 180, matchCut: true, hero: "orbit", heroMode: "tab", gapAfter: 220 }),
  beat("not-big-a", "one tab wasn't going", { cadence: 190, hero: "orbit", heroMode: "tab", gapAfter: 70 }),
  beat("not-big-b", "to cut it.", { cadence: 220, matchCut: true, hero: "orbit", heroMode: "tab", gapAfter: 320 }),
  beat("expanded", "So he expanded", { cadence: 240, matchCut: true, hero: "orbit", heroMode: "tab", gapAfter: 180 }),
  beat("grew", "and grew into", { cadence: 260, hero: "orbit", heroMode: "tab", gapAfter: 560 }),

  { id: "os", words: ["Bra", "+ino", "+*O", "+*S"], scriptText: "Braino OS", cadence: 310, matchCutLast: true, big: true, snap: true, hero: "orbit", heroMode: "ignite", gapAfter: 620 },
  { id: "one-him", words: ["On", "+e", "*intell", "+*igence", "la", "+yer."], scriptText: "One intelligence layer.", cadence: 260, matchCutLast: true, hero: "orbit", heroMode: "system", gapAfter: 180 },
  beat("live-a", "Powering", { cadence: 260, hero: "orbit", heroMode: "system", gapAfter: 70 }),
  { id: "live-b", words: ["every", "Bra", "+ino."], scriptText: "every Braino.", cadence: 260, matchCutLast: true, snap: true, big: true, hero: "orbit", heroMode: "system", gapAfter: 520 },

  beat("browser-a", "Need help", { cadence: 180, matchCut: true, hero: "orbit", heroMode: "browser", gapAfter: 70 }),
  beat("browser-b", "in the browser?", { cadence: 180, matchCut: true, hero: "orbit", heroMode: "browser", gapAfter: 220 }),
  beat("browser-answer", "Braino gotchu homie", { cadence: 220, matchCut: true, snap: true, hero: "orbit", heroMode: "browser", gapAfter: 420 }),

  beat("mac-a", "On your Mac?", { cadence: 190, matchCut: true, hero: "orbit", heroMode: "notch", gapAfter: 70 }),
  beat("mac-answer", "Still gotchu homie", { cadence: 220, matchCut: true, hero: "orbit", heroMode: "notch", gapAfter: 260 }),
  { id: "mac-b", words: ["I", "+O", "+M", "+I"], scriptText: "IOMI", cadence: 280, matchCutEveryToken: true, snap: true, hero: "orbit", heroMode: "notch", gapAfter: 480 },
  beat("follows-a", "He goes", { cadence: 190, hero: "orbit", heroMode: "synthesis", gapAfter: 70 }),
  beat("follows-b", "where the work goes.", { cadence: 190, matchCut: true, hero: "orbit", heroMode: "synthesis", gapAfter: 320 }),
  beat("speak", "Speak", { cadence: 190, matchCut: true, hero: "orbit", heroMode: "notch", gapAfter: 180 }),
  { id: "happen", words: dontBlinkWords("Watch It Happen"), scriptText: "Watch It Happen", cadence: 220, matchCutEveryWordEnd: true, snap: true, hero: "orbit", heroMode: "synthesis", gapAfter: 420 },
  beat("magic", "Magic?", { cadence: 260, matchCut: true, hero: "orbit", heroMode: "synthesis", gapAfter: 300 }),
  beat("nah", "Nah", { cadence: 300, matchCut: true, hero: "orbit", heroMode: "synthesis", gapAfter: 260 }),
  { id: "just-braino", words: ["Ju", "+st", "@braino", "+@hold", "be", "+ing", "@braino", "+@hold"], scriptText: "Just Braino being Braino", cadence: 260, matchCutLast: true, snap: true, hero: "orbit", heroMode: "final", gapAfter: 520 },

  { id: "final", words: ["*Every", "+*where."], scriptText: "Everywhere.", cadence: 400, matchCutLast: true, strobeCount: 3, big: true, hero: "orbit", heroMode: "final", gapAfter: 700 },
];

// One rhythm system for the whole film. Variation comes from phrase length
// and intentional match cuts, not dozens of unrelated local speeds.
const FAST_LIGHT_INDEX = RAW_BEATS.findIndex((item) => item.id === "browser-fast-a");
const BRAINO_OS_INDEX = RAW_BEATS.findIndex((item) => item.id === "os");
// One-line reversible experiment. Switch to "accelerate-after-fast-light" to
// restore the previous 300ms opening and 220ms back half.
const PACING_PROFILE: "unified-fast" | "accelerate-after-fast-light" = "unified-fast";
const BEATS = applyDontBlinkBlueprint(RAW_BEATS).map((item, index) => {
  const accelerating = PACING_PROFILE === "unified-fast" || index > FAST_LIGHT_INDEX;
  const afterBrainoOS = index > BRAINO_OS_INDEX;
  const iomiLetter = item.id === "mac-b";
  return {
    ...item,
    cadence: iomiLetter ? 280
      : item.id === "live-a" ? 260
      : item.id === "live-b" ? 260
      : item.id === "deeper" ? 260
      : afterBrainoOS ? 185
      : accelerating ? 220
      : 300,
    gapAfter: item.id === "live-a"
      ? 180
      : item.id === "live-b"
      ? 520
      : item.id === "deeper"
        ? 360
      : item.id === "os" || item.id === "final"
      ? 650
      : item.id === "mac-b"
        ? 400
        : afterBrainoOS
          ? (item.gapAfter ?? 260) >= 500 ? 300 : 140
          : accelerating
            ? (item.gapAfter ?? 260) >= 500 ? 360 : 180
          : item.id === "browser-fast-a" || (item.gapAfter ?? 260) >= 500 ? 500 : 260,
  };
});

function EcosystemOrbit() {
  return (
    <div className="eco-orbit" aria-hidden="true">
      <div className="eco-morph"><i className="eco-browser-frame"/><i className="eco-notch-shape"/><i className="eco-dial"/><i className="eco-silhouette"/></div>
      <span className="eco-star eco-star-one" />
      <span className="eco-star eco-star-two" />
      <div className="eco-ring eco-ring-one"><span className="eco-planet eco-browser"><b>Braino</b><small>Browser</small></span></div>
      <div className="eco-ring eco-ring-two"><span className="eco-planet eco-iomi"><b>IOMI</b><small>Mac</small></span></div>
      <div className="eco-ring eco-ring-three"><span className="eco-planet eco-studio"><b>Studio</b><small>Identity</small></span></div>
      <div className="eco-sun">
        <img src="/reactions/braino-idle.svg" alt="" />
        <b>Braino OS</b>
        <small>powers every Braino</small>
        <span><i>Emotional<br />Intelligence</i><i>Human<br />Intelligence</i></span>
      </div>
      <div className="eco-final-walker" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
    </div>
  );
}

export default function EcosystemTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return (
    <div className="nt-page-root ecosystem-film">
      <KineticFilm
        beats={BEATS}
        cadence={DONT_BLINK_BLUEPRINT.cadence}
        gap={DONT_BLINK_BLUEPRINT.gap}
        audioSrc={placesToBe}
        endHoldMs={900}
        editable={false}
        pageClass="ecosystem-canvas dont-blink-blueprint"
        heroSlots={{ orbit: <EcosystemOrbit /> }}
        onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }}
      />
    </div>
  );
}
