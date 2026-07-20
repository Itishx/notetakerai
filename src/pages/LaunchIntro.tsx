/* ============================================================================
   LaunchIntro — the cinematic first thing a visitor sees. A full-screen MP4
   plays start to finish, then the site fades in automatically ("enter to meet
   the website"). Skippable, and it only plays ONCE per visitor (sessionStorage),
   so navigating around later never replays it.

   HOW TO GO LIVE:
     1. Drop the file at  public/Braino_Final.MP4  (and optionally a poster at
        public/braino-launch-poster.jpg).
     2. In src/App.tsx make this the landing page. The cleanest flip:
          <Route path="/" element={<LandingGate />} />
        where LandingGate renders <LaunchIntro/> on the first visit and <Home/>
        afterwards — OR simply point "/" at <LaunchIntro/> and let its
        onFinish navigate to the real home. The route below (/intro) already
        works today for previewing.

   The video path + "enter" target are the two knobs, kept at the top.
   ============================================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const VIDEO_SRC = "/Braino_Final.MP4";
const POSTER_SRC = "/braino-launch-poster.jpg";   // optional first-frame image
const ENTER_TO = "/";                             // where "the website" lives
const SEEN_KEY = "sb_launch_intro_seen";          // once-per-session flag

export function launchIntroSeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}

type LaunchIntroProps = {
  onFinish?: () => void;
  enterTo?: string;
};

export default function LaunchIntro({ onFinish, enterTo = ENTER_TO }: LaunchIntroProps = {}) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);   // autoplay blocked → show a start button
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
    // let the fade play, then enter the site
    window.setTimeout(() => {
      if (onFinish) onFinish();
      else navigate(enterTo, { replace: true });
    }, 620);
  }, [enterTo, leaving, navigate, onFinish]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Try to autoplay WITH sound first (a launch film wants its audio). If the browser
    // blocks it, fall back to a one-tap start rather than silently muting the reveal.
    v.play().catch(() => setNeedsTap(true));
  }, []);

  const startWithSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setNeedsTap(false);
    v.play().catch(() => {
      // still blocked → play muted so the film at least runs
      v.muted = true;
      v.play().catch(() => finish());
    });
  };

  // Keyboard: Esc / Enter / Space skips into the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); finish(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2147483600, background: "#05070b",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: leaving ? 0 : 1, transition: "opacity 0.6s ease",
      }}
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}   /* if the file isn't there yet, don't trap the visitor */
        style={{
          width: "100%", height: "100%",
          objectFit: "contain",   /* show the whole frame, never crop */
          background: "#05070b",
        }}
      />

      {/* Autoplay-blocked fallback: a single tap starts it with sound. */}
      {needsTap && (
        <button
          onClick={startWithSound}
          style={{
            position: "absolute", inset: 0, margin: "auto",
            width: 96, height: 96, borderRadius: "50%", border: "none",
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
            color: "#fff", cursor: "pointer", display: "grid", placeItems: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
          aria-label="Play the launch film"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
      )}

      {/* Always-available skip. */}
      <button
        onClick={finish}
        style={{
          position: "absolute", right: 24, bottom: 22,
          padding: "9px 16px", borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(6px)",
          color: "rgba(255,255,255,0.86)", fontSize: 13, fontWeight: 500,
          fontFamily: "'Inter', -apple-system, sans-serif", cursor: "pointer",
          letterSpacing: "0.01em",
        }}
      >
        Skip intro →
      </button>
    </div>
  );
}
