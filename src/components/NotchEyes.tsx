import "./notch-eyes.css";

/* ============================================================================
   NotchEyes — the real notch's two eye-states (verbatim from IomiNotch.tsx:
   the "plain" realistic eyes every page uses vs. the two-dot "IOMI" eyes),
   as a standalone graphic for kinetic films. Both states are always mounted;
   a parent [data-hero-mode="iomi"] (toggled by KineticFilm in sync with the
   IOMI reveal beat) crossfades between them — fast, driven by the timeline,
   not its own animation loop.
   ============================================================================ */

export default function NotchEyes() {
  return (
    <div className="ne-wrap">
      <svg className="ne-plain" viewBox="32 6 56 46" aria-hidden="true">
        <g><circle cx="49" cy="22" r="12" fill="#fff" /><circle cx="49" cy="22" r="6.2" fill="#1B1713" /><circle cx="51.3" cy="19.3" r="2" fill="#fff" /></g>
        <g><circle cx="71" cy="22" r="12" fill="#fff" /><circle cx="71" cy="22" r="6.2" fill="#1B1713" /><circle cx="73.3" cy="19.3" r="2" fill="#fff" /></g>
        <path d="M 36 22 Q 49 28 62 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M 58 22 Q 71 28 84 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <div className="ne-iomi">
        <span className="ne-dot" /><span className="ne-dot" />
        <span className="ne-label">IOMI</span>
      </div>
    </div>
  );
}
