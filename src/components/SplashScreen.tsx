import { useEffect, useState } from "react";
import SideBrainLogo from "@/components/SideBrainLogo";

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const shouldSkip = typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/chat";
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (shouldSkip) {
      onDone();
      return;
    }
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const doneTimer = setTimeout(() => onDone(), 1800);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone, shouldSkip]);

  if (shouldSkip) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
      style={{
        background: "hsl(var(--background))",
        transition: "opacity 0.4s ease",
        opacity: fading ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      <img
        src="/brain.jpeg"
        alt=""
        className="w-28 h-28 object-contain"
        style={{ animation: "splashFloat 2s ease-in-out infinite" }}
      />
      <SideBrainLogo sizeClass="text-3xl" />
      <style>{`
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
