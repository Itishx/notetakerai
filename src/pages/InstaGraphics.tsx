import { useEffect, useRef } from "react";
import "./insta-graphics.css";

/*
  /InstaGraphics — static 9:16 (1080x1920) export frames for Instagram
  Stories/Reels. Each .ig-frame is a fixed-size 1080x1920 element (native
  resolution, for a pixel-perfect screenshot) — CSS-scaled down purely for
  on-screen preview so it fits the viewport instead of scrolling off below
  the fold. To export: DevTools → Elements → select the .ig-frame node →
  right-click → "Capture node screenshot" (captures at the true 1080x1920,
  ignoring the on-screen preview scale).
*/
export default function InstaGraphics() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      const scale = Math.min((window.innerHeight * 0.94) / 1920, (window.innerWidth * 0.94) / 1080);
      wrapRef.current?.style.setProperty("--ig-scale", String(scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="ig-page" ref={wrapRef}>
      <div className="ig-frame" id="ig-dont-blink">
        <div className="ig-label">Don't Blink</div>
        <div className="ig-tap">(tap)</div>
      </div>
    </div>
  );
}
