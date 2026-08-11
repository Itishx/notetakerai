import KineticFilm from "@/components/KineticFilm";
import type { CSSProperties } from "react";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import type { KBeat } from "@/lib/kineticFilm";
import { applyDontBlinkBlueprint, dontBlinkWords, DONT_BLINK_BLUEPRINT } from "@/lib/dontBlinkBlueprint";
import placesToBe from "../../teasermusic/Fred again.. & Anderson .Paak - places to be feat. Chika.mp3?url";
import "./dont-blink-blueprint.css";
import "./sub-agents-teaser.css";

const text = (id: string, copy: string, options: Omit<KBeat, "id" | "words"> = {}): KBeat => ({
  id, words: dontBlinkWords(copy), scriptText: copy, cadence: 190, gapAfter: 180,
  matchCutLast: true, snap: true, ...options,
});

const graphic = (id: string, mode: string, hold: number): KBeat => ({
  id, words: [], scriptText: `[Graphic: ${mode}]`, hero: "subagents", heroMode: mode, cadence: 1, gapAfter: hold,
});

const BEATS = applyDontBlinkBlueprint([
  text("introducing", "Introducing", { cadence: 230, gapAfter: 240 }),
  text("title", "Sub-Agents.", { cadence: 300, gapAfter: 520, big: true, strobeCount: 3 }),
  text("one-braino", "One Braino.", { gapAfter: 220 }),
  text("six-specialists", "Six specialists.", { gapAfter: 240 }),
  text("at-once", "Working at once.", { gapAfter: 360 }),
  graphic("deploy-graphic", "deploy", 2500),
  text("researches", "One researches."),
  text("verifies", "One verifies."),
  text("compares", "One compares."),
  text("builds", "One builds.", { gapAfter: 380 }),
  graphic("parallel-graphic", "parallel", 3000),
  text("same-request", "Same request."),
  text("six-directions", "Six directions.", { gapAfter: 380 }),
  graphic("merge-graphic", "merge", 2500),
  text("one-answer", "One answer.", { cadence: 230, gapAfter: 420, big: true, strobeCount: 3 }),
  text("less-waiting", "Less waiting."),
  text("deeper-thinking", "Deeper thinking."),
  text("more-done", "More gets done.", { gapAfter: 420 }),
  text("thats-subagents", "That’s Sub-Agents.", { cadence: 250, gapAfter: 480, big: true, strobeCount: 3 }),
  text("inside-braino", "Inside Braino.", { cadence: 280, gapAfter: 700, big: true }),
]);

const ROLES = ["RESEARCH", "VERIFY", "COMPARE", "PLAN", "BUILD", "REVIEW"];

function SubAgentsGraphic() {
  return <div className="sdb-graphic" aria-hidden="true">
    <BrainoDefs />
    <div className="sdb-grid"><i /><i /><i /><i /></div>
    <div className="sdb-origin"><Braino size={220} legs gloves idle arm="wave" expr="happy" /></div>
    <div className="sdb-agents">{ROLES.map((role, index) => <div className="sdb-agent" key={role} style={{ "--agent": index } as CSSProperties}>
      <Braino size={122} legs gloves idle arm={index % 3 === 0 ? "point" : index % 3 === 1 ? "wave" : "none"} expr={index > 3 ? "happy" : "think"} />
      <b>{role}</b>
    </div>)}</div>
    <div className="sdb-core"><i /><i /><i /><i /><i /><i /></div>
  </div>;
}

export default function SubAgentsTeaser() {
  const embed = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
  return <div className="nt-page-root subagents-db-film"><KineticFilm
    beats={BEATS}
    cadence={DONT_BLINK_BLUEPRINT.cadence}
    gap={DONT_BLINK_BLUEPRINT.gap}
    audioSrc={placesToBe}
    endHoldMs={900}
    editable={false}
    pageClass="subagents-db-canvas dont-blink-blueprint"
    heroSlots={{ subagents: <SubAgentsGraphic /> }}
    onEnd={() => { if (embed) window.parent.postMessage({ type: "braino-tv-ended" }, window.location.origin); }}
  /></div>;
}
