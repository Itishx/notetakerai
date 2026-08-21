import { useEffect, useRef, useState } from "react";

/* ============================================================================
   HeraListening — the ears. A held key, a voice, and the words landing at your
   cursor in whatever app you were already in.

   The whole argument for HERA is that nothing appears on screen: no window, no
   answer, no chat. So the picture is the app you were in, a caret, and text
   arriving. The bars on the left are the only sign anything is listening.

   CSS/SVG rather than canvas on purpose — see the note in MemoryEngineViz.
   ============================================================================ */

const LINES = [
  "ship the six engines to main tonight",
  "tell mesa the payment proof is the priority",
  "remind me to call the design review at four",
];

const BARS = 13;

export default function HeraListening({ caption = true }: { caption?: boolean }) {
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState("");
  const timer = useRef<number>();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(LINES[0]);
      return;
    }
    let i = 0;
    const text = LINES[line];
    setTyped("");
    const tick = () => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i < text.length) {
        timer.current = window.setTimeout(tick, 46);
      } else {
        timer.current = window.setTimeout(() => setLine((n) => (n + 1) % LINES.length), 2100);
      }
    };
    timer.current = window.setTimeout(tick, 520);
    return () => window.clearTimeout(timer.current);
  }, [line]);

  return (
    <div className="apple-engine-live">
      {caption && (
        <div className="apple-engine-thought" aria-hidden="true">
          <span className="et-in">you said it</span>
          <span className="et-arrow">→</span>
          <span className="et-out">it is already typed</span>
        </div>
      )}
      <div
        className="hera-viz"
        role="img"
        aria-label="BrainoHERA: hold a key anywhere on the Mac, speak, and the words land at your cursor in whatever app you were already in."
      >
        <div className="hera-listen" aria-hidden="true">
          <span className="hera-key">hold ⌥</span>
          <div className="hera-bars">
            {Array.from({ length: BARS }, (_, i) => (
              <i key={i} style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />
            ))}
          </div>
        </div>
        <div className="hera-app" aria-hidden="true">
          <div className="hera-app-bar">
            <span /><span /><span />
            <em>Mail — new message</em>
          </div>
          <p className="hera-typed">
            {typed}
            <b className="hera-caret" />
          </p>
        </div>
      </div>
    </div>
  );
}
