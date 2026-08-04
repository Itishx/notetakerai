import IomiNotch from "@/components/IomiNotch";
import NotchFace from "@/components/NotchFace";
import NotchEyes from "@/components/NotchEyes";
import KineticFilm from "@/components/KineticFilm";
import type { KBeat } from "@/lib/kineticFilm";

/* ============================================================================
   /braino-split — the Motion Editor. Opens pre-loaded with the Braino Split
   script below as a working example, but it's a general tool: paste any
   script (via the script panel's "Paste or write a whole new script"), it
   auto-splits one sentence per beat, and you build the cuts yourself —
   select text, apply an action, watch it live in the canvas beside it.
   Canvas + editor side by side (not an overlay) when visited directly;
   embedded in Braino TV / Motion Graphics it's just the clean film.

   The starting example: Braino splits into Braino (browser) + Braino IOMI
   (macOS), both on Braino OS. "BrainoOS" and the letter-by-letter "IOMI"
   reveal are lifted verbatim from the flagship "Don't Blink" film's own
   BIGGER reveal, paired with the real notch's eye-morph (NotchEyes).
   ============================================================================ */

const BEATS: KBeat[] = [
  { id: "open", words: ["Brai", "+no."], matchCut: true, gapAfter: 420 },
  { id: "split", words: ["just", "spl", "+it."], matchCut: true, gapAfter: 460 },
  { id: "browser", words: ["Braino.", "For", "the", "brow", "+ser."], matchCut: true, gapAfter: 380, hero: "mac" },
  { id: "mac", words: ["Braino.", "For", "the", "Mac."], gapAfter: 420, hero: "mac" },
  // MATCH CUT — the payoff: the notch's eyes morph plain -> IOMI right as
  // the letters land, every letter its own cut (verbatim /dontblink formula).
  { id: "iomi", words: ["I", "O", "M", "I"], cutEveryWord: true, big: true, hero: "mac", heroMode: "iomi", cadence: 260, gapAfter: 700 },
  { id: "pivot", words: ["Both", "run", "o", "+n—"], gapAfter: 260 },
  { id: "brand", words: ["Bra", "+ino", "+OS"], matchCut: true, big: true, gapAfter: 520, cadence: 340 },
  { id: "engine", words: ["Powered", "by", "Emo", "+tional", "Engine", "v1."], matchCut: true, gapAfter: 500 },
  { id: "tag1", words: ["One", "br", "+ain."], matchCut: true, gapAfter: 260 },
  { id: "tag2", words: ["Two", "ways", "in."], cutEveryWord: true, cadence: 270, gapAfter: 500 },
  { id: "hold", words: [], gapAfter: 300 },
];

export default function BrainoSplitTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return (
    <div className="nt-page-root">
      {!embed && <IomiNotch />}
      <KineticFilm
        beats={BEATS}
        audioSrc="/dont-blink.mp3"
        endHoldMs={1400}
        heroSlots={{ mac: <NotchEyes /> }}
        outro={<NotchFace className="on awake nf-wink" />}
        pageClass={embed ? undefined : "me-editor"}
        onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }}
      />
    </div>
  );
}
