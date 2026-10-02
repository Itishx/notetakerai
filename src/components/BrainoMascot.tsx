/* Braino, optionally dressed for a model (2026-10-02): Foundry wears specs,
   Mesa a cap. The real mascot file drawn underneath, the accessory on top in
   the same coordinates (the file's viewBox, eyes at 38,48 and 62,48). */
export function BrainoMascot({ variant = "braino", className = "", size = 104 }: { variant?: "braino" | "foundry" | "mesa"; className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="-8 -34 116 142" width={size} height={Math.round(size * 142 / 116)} aria-hidden="true" style={{ overflow: "visible" }}>
      <image href="/braino-standing.svg" x="-8" y="-34" width="116" height="142" />
      {variant === "foundry" && (
        <g fill="none" stroke="#1b1713" strokeWidth="2.6" strokeLinecap="round">
          <rect x="28" y="39.5" width="20" height="16" rx="5" fill="rgba(255,255,255,.18)" />
          <rect x="52" y="39.5" width="20" height="16" rx="5" fill="rgba(255,255,255,.18)" />
          <path d="M48 46 Q50 43.6 52 46" />
          <path d="M28 44 L19 41" />
          <path d="M72 44 L81 41" />
        </g>
      )}
      {variant === "mesa" && (
        <g>
          <path d="M18 30 Q20 3 50 1 Q80 3 82 30 Z" fill="#2f6fed" />
          <path d="M18 30 Q50 23 82 30 Q78 34 50 33 Q22 34 18 30 Z" fill="#1f4fbf" />
          <path d="M66 31 Q90 29 98 35 Q88 38 68 35 Z" fill="#1f4fbf" />
          <circle cx="50" cy="2" r="2.8" fill="#1f4fbf" />
        </g>
      )}
    </svg>
  );
}
