import { useEffect, useRef } from "react";
import { findActiveIndex, type ScriptLine } from "@/lib/teaserScript";

/* ============================================================================
   ScriptPanel — the left-rail synced script, reading along with the film.
   Pure presentational: given the page's own currentMs (a throttled tap-off
   from its rAF loop, not a per-frame subscription), it finds and highlights
   the active line and auto-scrolls it into view.
   ============================================================================ */

export default function ScriptPanel({ lines, currentMs }: { lines: ScriptLine[]; currentMs: number }) {
  const activeIdx = findActiveIndex(lines, currentMs);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (activeIdx < 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lineRefs.current[activeIdx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);

  if (!lines.length) return null;

  return (
    <div className="nt-script-panel" aria-label="Script">
      {lines.map((line, i) => (
        <div
          key={i}
          ref={(el) => { lineRefs.current[i] = el; }}
          className={"nt-script-line" + (i === activeIdx ? " active" : "")}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
