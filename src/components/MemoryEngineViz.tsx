import { useEffect, useState } from "react";

/* ============================================================================
   MemoryEngineViz — the Memory Engine as the thing it actually is: a short,
   growing list of durable facts about you that Braino wrote down without being
   asked.

   The two engines beside this one (EmotionNetwork, HumanIntelligence) are
   canvas graphs of a process. Memory is not a process you watch, it is a
   result you accumulate, so this draws the result. It also keeps the section
   cheap: four live canvases on one page is a laptop fan, and the honest
   picture of memory is a list, not a neural net.

   Every line here is the shape a real braino_memories row takes.
   ============================================================================ */

const KEPT: Array<{ fact: string; from: string }> = [
  { fact: "Builds Braino. Three months in, pivoted in May.", from: "from a Tuesday standup" },
  { fact: "Hates credit pricing. Do not put credits on a page.", from: "from a pricing argument" },
  { fact: "Ships from main. Merging to main is the release.", from: "from the launch merge" },
  { fact: "Short answers. Long text gives him a headache.", from: "from being told twice" },
  { fact: "Mesa. PGP in Venture Building, mentor feedback is a spec.", from: "from a Thursday review" },
  { fact: "Distribution is the bottleneck, not the building.", from: "from the Distra brief" },
];

export default function MemoryEngineViz({ caption = true }: { caption?: boolean }) {
  const [head, setHead] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHead((n) => (n + 1) % KEPT.length), 3200);
    return () => clearInterval(t);
  }, []);

  /* Newest first, so the arriving fact lands at the top and the rest slide
     down and fade out, which is how a memory list actually behaves. */
  const rows = Array.from({ length: 5 }, (_, i) => KEPT[(head - i + KEPT.length * 2) % KEPT.length]);

  return (
    <div className="apple-engine-live">
      {caption && (
        <div className="apple-engine-thought" aria-hidden="true">
          <span className="et-in">nobody said “remember this”</span>
          <span className="et-arrow">→</span>
          <span className="et-out">he wrote it down anyway</span>
        </div>
      )}
      <div
        className="mem-viz"
        role="img"
        aria-label="Braino's memory engine: durable facts about you, captured from ordinary conversation and kept without being asked."
      >
        <div className="mem-head">
          <span className="mem-dot" />
          <span>What he knows about you</span>
          <em>{KEPT.length * 31} kept</em>
        </div>
        <ul className="mem-rows">
          {rows.map((row, i) => (
            <li key={`${head}-${i}`} className={i === 0 ? "is-new" : ""} style={{ opacity: 1 - i * 0.19 }}>
              <i />
              <div>
                <b>{row.fact}</b>
                <span>{row.from}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
