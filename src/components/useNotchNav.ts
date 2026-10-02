import { useEffect } from "react";

/* The Affective bar on scroll (2026-10-02): a normal header. Past the top the
   wordmark folds to its A (.is-tight) and that is all; the notch version was
   tried and taken out. Read on a frame, with hysteresis, so a nudge at the
   threshold cannot flicker it. */
export function useNotchNav() {
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const nav = document.querySelector(".aff-nav");
      if (!nav) return;
      const was = nav.classList.contains("is-tight");
      nav.classList.toggle("is-tight", window.scrollY > (was ? 40 : 96));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(read); };
    window.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}
