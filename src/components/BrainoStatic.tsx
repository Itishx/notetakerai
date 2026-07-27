/* ============================================================================
   BrainoStatic — the canonical static brain character (100×100 viewBox),
   verbatim from docs/braino-design.md §4. Self-contained gradients, no
   animation, no shared defs required. Used anywhere a still character
   illustration is needed rather than the full animated BrainoChar/BrainMascot
   rig — including on a coral background, where the gyri lines (#8A2F28,
   fixed, theme-independent) already read fine with no extra work.
   ============================================================================ */

let uid = 0;

export default function BrainoStatic({ className }: { className?: string }) {
  const id = uid++;
  const fill = `bst-fill-${id}`, dark = `bst-dark-${id}`, glow = `bst-glow-${id}`;
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" /><stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <radialGradient id={glow} cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="white" transform="scale(1.08) translate(-3.7, -3.7)"
      />

      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill={`url(#${dark})`} />

      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill={`url(#${dark})`} />
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />

      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill={`url(#${fill})`}
      />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill={`url(#${glow})`}
      />

      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />

      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke={`url(#${fill})`} strokeWidth="6" strokeLinecap="round" />
      <circle cx="6" cy="63" r="5.5" fill={`url(#${fill})`} />

      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke={`url(#${fill})`} strokeWidth="6" strokeLinecap="round" />
      <circle cx="94" cy="63" r="5.5" fill={`url(#${fill})`} />

      <circle cx="38" cy="48" r="6.5" fill="white" />
      <circle cx="38" cy="48" r="3.2" fill="#1B1713" />
      <circle cx="39" cy="46.6" r="1.1" fill="white" />

      <circle cx="62" cy="48" r="6.5" fill="white" />
      <circle cx="62" cy="48" r="3.2" fill="#1B1713" />
      <circle cx="63" cy="46.6" r="1.1" fill="white" />

      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />

      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
