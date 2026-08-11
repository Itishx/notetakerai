import KineticFilm from "@/components/KineticFilm";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import type { KBeat } from "@/lib/kineticFilm";
import { applyDontBlinkBlueprint, dontBlinkWords, DONT_BLINK_BLUEPRINT } from "@/lib/dontBlinkBlueprint";
import "./dont-blink-spotify-teaser.css";
import "./dont-blink-blueprint.css";

const line = (id: string, text: string, options: Omit<KBeat, "id" | "words"> = {}): KBeat => ({
  id, words: dontBlinkWords(text), scriptText: text, ...options,
  ...(options.matchCut ? { matchCut: false, matchCutLast: true } : {}),
});

const BEATS = applyDontBlinkBlueprint([
  line("spotify-1", "Say the song.", { hero: "proof", heroMode: "spotify-hit", cadence: 180, matchCut: true, snap: true, gapAfter: 380 }),
  line("spotify-2", "Watch it play.", { hero: "proof", heroMode: "spotify-hit", cadence: 180, matchCut: true, snap: true, gapAfter: 480 }),
  { id: "braino-name", words: ["That’s", "Bra", "+ino"], scriptText: "That’s Braino", cadence: 310, matchCutLast: true, strobeCount: 3, snap: true, big: true, gapAfter: 350 },
  { id: "mascot-cut", words: [], scriptText: "Mascot match cut", cadence: 1, hero: "proof", heroMode: "mascot", gapAfter: 1600 },
]);

function ProofGraphic() {
  return <div className="dbs-proof" aria-hidden="true"><BrainoDefs />
    <div className="dbs-spotify"><span className="dbs-album"><i /><i /></span><span className="dbs-track"><small>Spotify</small><b>Now playing</b><i /></span><span className="dbs-player"><i>‹</i><b>▶</b><i>›</i></span><span className="dbs-progress"><i /></span></div>
    <div className="dbs-mac"><span className="dbs-menubar"><i /><i /><i /></span><span className="dbs-notch"><i /><i /></span><span className="dbs-desktop"><i /><i /><i /></span><span className="dbs-dock"><i /><i /><i /><i /><i /></span></div>
    <div className="dbs-mascot"><Braino size={250} legs gloves idle={false} arm="wave" expr="happy" /></div>
  </div>;
}

export default function DontBlinkSpotifyTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return <div className="nt-page-root dbs-film"><KineticFilm beats={BEATS} cadence={DONT_BLINK_BLUEPRINT.cadence} gap={DONT_BLINK_BLUEPRINT.gap} audioSrc="/dont-blink.mp3" endHoldMs={600} editable={false} pageClass="dbs-canvas dont-blink-blueprint" heroSlots={{ proof: <ProofGraphic /> }} onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }} /></div>;
}
