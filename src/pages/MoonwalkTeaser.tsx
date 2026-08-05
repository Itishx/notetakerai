import KineticFilm from "@/components/KineticFilm";
import type { KBeat } from "@/lib/kineticFilm";
import {
  applyDontBlinkBlueprint,
  dontBlinkWords,
  DONT_BLINK_BLUEPRINT,
} from "@/lib/dontBlinkBlueprint";
import "./ecosystem-teaser.css";
import "./dont-blink-blueprint.css";
import "./moonwalk-teaser.css";
import placesToBe from "../../teasermusic/Fred again.. & Anderson .Paak - places to be feat. Chika.mp3?url";

/* A script-only duplicate of the ecosystem teaser's kinetic grammar. Keep the
   film deliberately tiny: one promise, then one oversized destination. */
const BEATS: KBeat[] = applyDontBlinkBlueprint([
  {
    id: "moonwalk-promise",
    words: dontBlinkWords("Does your AI moonwalk?"),
    scriptText: "Does your AI moonwalk?",
    cadence: 185,
    gapAfter: 140,
    matchCutEveryWordEnd: true,
    snap: true,
  },
  {
    id: "moonwalk-answer",
    words: dontBlinkWords("It will now"),
    scriptText: "It will now",
    cadence: 185,
    gapAfter: 300,
    matchCutEveryWordEnd: true,
    snap: true,
  },
  {
    id: "moonwalk-domain",
    words: dontBlinkWords("trybraino.com").map((word) => word.replace(/^\+?/, (prefix) => `${prefix}*`)),
    scriptText: "trybraino.com",
    cadence: 400,
    gapAfter: 650,
    matchCutLast: true,
    strobeCount: 3,
    big: true,
    snap: true,
  },
]);

export default function MoonwalkTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");

  return (
    <div className="nt-page-root ecosystem-film moonwalk-film">
      <KineticFilm
        beats={BEATS}
        cadence={DONT_BLINK_BLUEPRINT.cadence}
        gap={DONT_BLINK_BLUEPRINT.gap}
        audioSrc={placesToBe}
        endHoldMs={900}
        editable={false}
        pageClass="ecosystem-canvas dont-blink-blueprint moonwalk-canvas"
        onEnd={() => {
          if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin);
        }}
      />
    </div>
  );
}
