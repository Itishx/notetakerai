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

/* Films with a soundtrack must never start themselves out of a screen that is
   below the fold or behind a footer, so this key is deliberately per-src and
   per-browser rather than a global "autoplay is on" flag. */
const AUTO_KEY = "braino-tv-autoplayed";

/* The iframe path is for anything (a route, an embed). Only a real media file
   can be handed to a <video> element, and only <video> can be muted, which is
   the only kind of autoplay a browser will allow. */
const MEDIA_FILE = /\.(mp4|m4v|mov|webm)(\?|#|$)/i;

function alreadyAutoplayed(key: string) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
function rememberAutoplayed(key: string) {
  try { localStorage.setItem(key, "1"); } catch { /* private mode: it just plays again */ }
}

/* `offer` turns the idle screen into a poster with a play button, for pages
   that want a film to be the hero.

   `autoOnce` is opt-in per screen, and only the homepage hero uses it. On a
   visitor's first landing the film simply runs, silently, once. Every visit
   after that it is the poster again, where a click still gets the sound.
   Muted is not a preference here: it is the only autoplay any browser permits
   without a gesture, so the alternative is not sound, it is nothing. */
export function BrainoTVScreen({ className = "", offer, autoOnce = false }: { className?: string; offer?: { src: string; title: string }; autoOnce?: boolean }) {
  const { nowPlaying, screenRef, stop, play } = useBrainoTV();
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoKey = `${AUTO_KEY}:${offer?.src ?? ""}`;

  const [auto, setAuto] = useState(() => {
    if (!autoOnce || !offer || !MEDIA_FILE.test(offer.src)) return false;
    if (alreadyAutoplayed(autoKey)) return false;
    try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false; } catch { /* ignore */ }
    return true;
  });

  useEffect(() => {
    if (!auto) return;
    const video = videoRef.current;
    if (!video) return;
    // Marked before the play attempt, not after: a visitor who lands, sees it
    // start and reloads has had their one automatic play.
    rememberAutoplayed(autoKey);
    const started = video.play();
    // iOS Low Power Mode and a few data-saver settings refuse even muted
    // autoplay. Falling back to the poster leaves a play button rather than a
    // frozen first frame with no way into it.
    if (started && typeof started.catch === "function") started.catch(() => setAuto(false));
  }, [auto, autoKey]);

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
      ) : auto && offer ? (
        <>
          <video
            ref={videoRef}
            className="btv-auto"
            src={offer.src}
            muted
            playsInline
            preload="auto"
            onEnded={() => setAuto(false)}
            aria-label={offer.title || "Braino"}
          />
        </>
      ) : offer ? (
        <button type="button" className="btv-offer" onClick={() => play(offer.src, offer.title)}>
          <span className="btv-offer-play" aria-hidden="true" />
          <span className="btv-idle-label">{offer.title}</span>
          <span className="btv-offer-hint">Play with sound</span>
        </button>
      ) : (
        <div className="btv-idle">
          <span className="btv-idle-label">Braino TV</span>
          <p>Teasers will play here when needed, just scroll.</p>
        </div>
      )}
    </div>
  );
}
