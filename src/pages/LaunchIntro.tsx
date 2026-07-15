import { useCallback, useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/Braino_Final.MP4";

export default function LaunchIntro({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onFinish, 620);
  }, [leaving, onFinish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setNeedsTap(true));
  }, []);

  const startWithSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setNeedsTap(false);
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => finish());
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483600,
        background: "#05070b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#05070b",
        }}
      />

      {needsTap && (
        <button
          type="button"
          onClick={startWithSound}
          aria-label="Play the launch film"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={finish}
        style={{
          position: "absolute",
          right: 24,
          bottom: 22,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(6px)",
          color: "rgba(255,255,255,0.86)",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'Inter', -apple-system, sans-serif",
          cursor: "pointer",
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
