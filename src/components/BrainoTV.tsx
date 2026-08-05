import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "./braino-tv.css";

/* ============================================================================
   BrainoTV — one shared "now playing" screen per page. Any "View on Braino
   TV" trigger anywhere on the page calls play(src, title): the page scrolls
   up to the screen, swaps its embed, and shows a status via the
   "braino-tv-status" window event (IomiNotch listens for this and shows
   "Watching …"). When the embedded film reports it's done (postMessage
   {type:"braino-tv-ended"}), the screen reverts to idle and the page scrolls
   back to wherever the viewer was.
   ============================================================================ */

type NowPlaying = { src: string; title: string } | null;

type BrainoTVApi = {
  nowPlaying: NowPlaying;
  play: (src: string, title: string) => void;
  stop: () => void;
  screenRef: React.RefObject<HTMLDivElement>;
};

const BrainoTVCtx = createContext<BrainoTVApi | null>(null);

export function BrainoTVProvider({ children, initial }: { children: ReactNode; initial?: { src: string; title: string } }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(initial ?? null);
  const screenRef = useRef<HTMLDivElement>(null);
  const returnY = useRef<number | null>(null);

  const play = useCallback((src: string, title: string) => {
    returnY.current = window.scrollY;
    setNowPlaying({ src, title });
    window.dispatchEvent(new CustomEvent("braino-tv-status", { detail: title }));
    requestAnimationFrame(() => screenRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, []);

  const stop = useCallback(() => {
    setNowPlaying(null);
    window.dispatchEvent(new CustomEvent("braino-tv-status", { detail: null }));
    if (returnY.current != null) {
      window.scrollTo({ top: returnY.current, behavior: "smooth" });
      returnY.current = null;
    }
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "braino-tv-ended") stop(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [stop]);

  return <BrainoTVCtx.Provider value={{ nowPlaying, play, stop, screenRef }}>{children}</BrainoTVCtx.Provider>;
}

export function useBrainoTV(): BrainoTVApi {
  const ctx = useContext(BrainoTVCtx);
  if (!ctx) throw new Error("useBrainoTV must be used within a BrainoTVProvider");
  return ctx;
}

export function BrainoTVScreen({ className = "" }: { className?: string }) {
  const { nowPlaying, screenRef, stop } = useBrainoTV();
  return (
    <div ref={screenRef} className={`btv-root ${className}`}>
      {nowPlaying ? (
        <>
          <iframe
            key={nowPlaying.src}
            className="btv-frame"
            src={nowPlaying.src}
            title={nowPlaying.title}
            scrolling="no"
            style={{ border: 0 }}
            allow="autoplay; fullscreen"
          />
          <button type="button" className="btv-close" onClick={stop} aria-label="Stop">✕</button>
        </>
      ) : (
        <div className="btv-idle">
          <span className="btv-idle-label">Braino TV</span>
          <p>Teasers will play here when needed, just scroll.</p>
        </div>
      )}
    </div>
  );
}
