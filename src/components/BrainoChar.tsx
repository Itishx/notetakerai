/* ============================================================
   BrainoChar.tsx — parametric Braino mascot, ported from the
   Claude Design "braino-char.jsx". Eyes / mouth / arms / legs /
   wardrobe are all controllable so we can animate dance moves.
   Gradients live in <BrainoDefs/> (render once on the page).
   Exports: Braino, BrainoDefs, useTime
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// shared RAF clock (seconds) — all dancers tick off one loop
let _t = 0, _raf: number | null = null, _start = 0;
const _subs = new Set<() => void>();
function _loop(now: number) {
  _t = (now - _start) / 1000;
  _subs.forEach((fn) => fn());
  _raf = requestAnimationFrame(_loop);
}
export function useTime(): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (_subs.size === 0) { _start = performance.now(); _raf = requestAnimationFrame(_loop); }
    const fn = () => force((x) => (x + 1) % 1_000_000);
    _subs.add(fn);
    return () => {
      _subs.delete(fn);
      if (_subs.size === 0 && _raf != null) { cancelAnimationFrame(_raf); _raf = null; }
    };
  }, []);
  return _t;
}

const BODY_PATH = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";
const BODY_PATH_LEGS = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 68 80.5 60 79.5 50 79 C 40 79.5 32 80.5 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";
const SHOE_UPPER = "M 47.5 89 C 47.5 87 44.5 86.4 42 87.4 C 36 89.2 29.6 90.6 25.2 94.2 C 22.2 96.7 21.8 99.4 25 100.8 C 27 101.6 31 101.6 35 101.6 L 45.6 101.6 C 47.1 101.6 47.8 100.6 47.5 99.1 Z";
const SHOE_SOLE = "M 23 98.6 Q 21.2 101.2 25.6 101.5 L 45.6 101.5 Q 47.8 101.3 47.4 98.9 Q 34.5 100.1 23 98.6 Z";

export function BrainoDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <linearGradient id="brainCoral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="brainCoralDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" /><stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <linearGradient id="brainHair" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FBE39F" /><stop offset="0.5" stopColor="#F0C56A" /><stop offset="1" stopColor="#D19E42" />
        </linearGradient>
        <linearGradient id="brainDressCloth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E3129" /><stop offset="0.16" stopColor="#B84A3E" />
          <stop offset="0.38" stopColor="#D8594B" /><stop offset="0.5" stopColor="#E26658" />
          <stop offset="0.62" stopColor="#D8594B" /><stop offset="0.84" stopColor="#B84A3E" />
          <stop offset="1" stopColor="#8E3129" />
        </linearGradient>
        <linearGradient id="brainDressTuck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4E1913" stopOpacity="0.17" /><stop offset="1" stopColor="#4E1913" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="brainHairHoney" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#F2CE84" /><stop offset="0.5" stopColor="#D9A445" /><stop offset="1" stopColor="#A9762A" />
        </linearGradient>
        <linearGradient id="brainHairHoneyDeep" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#D9A445" /><stop offset="1" stopColor="#8F5F1F" />
        </linearGradient>
        <linearGradient id="brainHairAuburn" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#CB8C64" /><stop offset="0.5" stopColor="#9A5230" /><stop offset="1" stopColor="#6B3018" />
        </linearGradient>
        <linearGradient id="brainHairAuburnDeep" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#A85E38" /><stop offset="1" stopColor="#5A2612" />
        </linearGradient>
        <linearGradient id="brainHairEspresso" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#7D5749" /><stop offset="0.5" stopColor="#4A2E24" /><stop offset="1" stopColor="#2A1712" />
        </linearGradient>
        <linearGradient id="brainHairEspressoDeep" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#5C3B30" /><stop offset="1" stopColor="#241310" />
        </linearGradient>
        <linearGradient id="brainHairRose" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#F7C3AC" /><stop offset="0.5" stopColor="#E0876B" /><stop offset="1" stopColor="#B85A40" />
        </linearGradient>
        <linearGradient id="brainHairRoseDeep" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#DE8E70" /><stop offset="1" stopColor="#9E4830" />
        </linearGradient>
        <linearGradient id="brainHairDeep" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#EFC97C" /><stop offset="1" stopColor="#B98A34" />
        </linearGradient>
        <linearGradient id="brainPink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC0D6" /><stop offset="0.6" stopColor="#F58FB2" /><stop offset="1" stopColor="#DE6C93" />
        </linearGradient>
        <linearGradient id="brainSilk" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#F9DED8" />
        </linearGradient>
        <radialGradient id="brainHighlight" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function Glove({ x, y, dir = 1 }: any) {
  const st = "rgba(176,86,78,.42)";
  return (
    <g transform={`translate(${x} ${y})`} stroke={st} strokeWidth="0.7">
      <g fill="white"><circle cx={dir * 5} cy="-1.4" r="3" /><circle cx="0" cy="0.6" r="7" /></g>
      <g fill="none" stroke="#C9544A" strokeWidth="0.8" strokeLinecap="round" opacity="0.55">
        <path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8" /><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2" /><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8" />
      </g>
      <path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

function PointHand({ x, y, dir = 1 }: any) {
  const st = "rgba(176,86,78,.42)";
  return (
    <g transform={`translate(${x} ${y})`} stroke={st} strokeWidth="0.7">
      <g fill="white">
        <circle cx="0" cy="0.6" r="6" />
        <ellipse cx={dir * 1.5} cy="3.4" rx="3.4" ry="2.4" transform={`rotate(${dir * 18} ${dir * 1.5} 3.4)`} />
        <rect x={dir * -3.2 - 1.7} y="2.2" width="3.4" height="12" rx="1.7" />
      </g>
      <g fill="none" stroke="#C9544A" strokeWidth="0.7" strokeLinecap="round" opacity="0.5">
        <path d="M -4 1.4 q 4 1.5 8 0" /><path d="M -3.3 3.3 q 3.3 1.2 6.6 0" opacity="0.7" />
      </g>
      <path d="M -5 -4.6 Q 0 -2.8 5 -4.6" fill="none" stroke="#C9544A" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

function LegShoe({ pink = false }: any) {
  const upper = pink ? "url(#brainPink)" : "white";
  const sole = pink ? "#FFE3EC" : "#F6E2DC";
  const trim = pink ? "rgba(160,58,94,.42)" : "rgba(176,86,78,.42)";
  const lace = pink ? "#C4507B" : "#C9544A";
  return (
    <g>
      <path d="M 45 74 L 42.5 87" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M 45 74 L 42.5 87" fill="none" stroke="url(#brainCoral)" strokeWidth="5.5" strokeLinecap="round" />
      <path d={SHOE_UPPER} fill={upper} stroke={trim} strokeWidth="0.9" strokeLinejoin="round" />
      <path d={SHOE_SOLE} fill={sole} stroke={trim} strokeWidth="0.8" strokeLinejoin="round" />
      <g fill="none" stroke={lace} strokeWidth="0.85" strokeLinecap="round" opacity="0.7">
        <path d="M 29.5 90 Q 36 88.5 43 89.2" /><path d="M 32 92.7 Q 37.5 91.7 43 92.2" opacity="0.6" />
      </g>
      <ellipse cx="30" cy="92.4" rx="3" ry="1.4" fill="#fff" opacity={pink ? 0.5 : 0.6} transform="rotate(-12 30 92.4)" />
    </g>
  );
}

function Legs({ leftLift = 0, rightLift = 0, leftSwing = 0, rightSwing = 0, profile = false,
  leftHeel = 0, rightHeel = 0, leftSlideX = 0, rightSlideX = 0, mirror = false, pink = false }: any) {
  if (profile) {
    const inner = (
      <g>
        <g transform={`translate(${12 + rightSlideX} ${-rightLift})`}><g transform={`rotate(${-rightHeel} 24 101)`}><LegShoe pink={pink} /></g></g>
        <g transform={`translate(${leftSlideX} ${-leftLift})`}><g transform={`rotate(${-leftHeel} 24 101)`}><LegShoe pink={pink} /></g></g>
      </g>
    );
    return mirror ? <g transform="translate(100,0) scale(-1,1)">{inner}</g> : inner;
  }
  return (
    <g>
      <g transform={`translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`}><LegShoe pink={pink} /></g>
      <g transform={`translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`}><g transform="translate(100,0) scale(-1,1)"><LegShoe pink={pink} /></g></g>
    </g>
  );
}

/* Hair is two pieces, and getting the split wrong is what makes it look wrong.

   THE CAP is drawn on top of the body: crown plus a fringe sweeping down to the
   temples, ending at y 41. Any lower and it runs down beside her eyes, which
   reads as sideburns rather than hair.

   THE LENGTH is drawn behind everything, before the legs. Hair falls behind the
   head, not in front of the face. Beside the head it can only ever be a sliver,
   because the body fills x 8..92 and there is barely any room either side — but
   below y 64 the body narrows toward the legs, and that is where the fall opens
   out into real volume. Tight at the temples, wide at the bottom, which is how
   long hair actually hangs.

   The two halves stop short of x 50, and Braino's midline seam shows through
   the gap: her parting is his seam. */

const CAP_L = "M 48.8 4 C 38 2 25 6 18 16 C 13 23 10 30 9.8 37 C 9.6 41.5 13 43.5 16 41.8 C 19 40 21.5 36.5 23.5 32 C 26.5 25.5 30.5 21 35.5 18 C 40.5 15 45.5 11 48.8 4 Z";
const CAP_R = "M 51.2 4 C 62 2 75 6 82 16 C 87 23 90 30 90.2 37 C 90.4 41.5 87 43.5 84 41.8 C 81 40 78.5 36.5 76.5 32 C 73.5 25.5 69.5 21 64.5 18 C 59.5 15 54.5 11 51.2 4 Z";

const SWEEP_CAP_L = "M 62 3 C 46 0 28 5 19 16 C 13 23 10 30 9.8 37 C 9.6 41.5 13 43.5 16 41.8 C 19 40 21.5 36.5 23.5 32 C 26.5 25 31 21 37 18.5 C 46 14.5 57 11 62 3 Z";
const SWEEP_CAP_R = "M 62 3 C 73 1.5 83 8 88 18 C 91 24 92 30 91.6 36 C 91.4 40 88.5 42 86 40.5 C 83.5 39 82 35.5 81 32 C 79 26 75 22 69 19.5 C 65.5 18 62 10 62 3 Z";

const BACK_L = "M 40 10 C 34 12 24 18 15 28 C 8 37 2 48 0.5 60 C -0.5 72 1 82 6 88 C 11 93 21 91 23 83 C 25 73 26 62 29 52 C 32 40 36 26 40 16 Z";
const BACK_R = "M 60 10 C 66 12 76 18 85 28 C 92 37 98 48 99.5 60 C 100.5 72 99 82 94 88 C 89 93 79 91 77 83 C 75 73 74 62 71 52 C 68 40 64 26 60 16 Z";
const TRIM_L = "M 40 10 C 34 12 25 18 16.5 28 C 10 37 5 47 4 58 C 3 68 4.5 76 8.5 81 C 13 85.5 21 84 22.5 77 C 24 69 25 60 28.5 51 C 31.5 40 36 26 40 16 Z";
const TRIM_R = "M 60 10 C 66 12 75 18 83.5 28 C 90 37 95 47 96 58 C 97 68 95.5 76 91.5 81 C 87 85.5 79 84 77.5 77 C 76 69 75 60 71.5 51 C 68.5 40 64 26 60 16 Z";
const WISP_L = "M 40 10 C 34 12 26 18 18 28 C 12.5 36 8.5 45 8 55 C 7.5 63 9 69 12.5 73 C 16.5 77 22 75.5 22.5 70 C 23 63 24 57 27.5 49 C 30.5 39 36 26 40 16 Z";
const WISP_R = "M 60 10 C 66 12 74 18 82 28 C 87.5 36 91.5 45 92 55 C 92.5 63 91 69 87.5 73 C 83.5 77 78 75.5 77.5 70 C 77 63 76 57 72.5 49 C 69.5 39 64 26 60 16 Z";

const FALLS: Record<string, [string, string] | null> = {
  long: [BACK_L, BACK_R],
  longsweep: [BACK_L, BACK_R],
  trim: [TRIM_L, TRIM_R],
  trimsweep: [TRIM_L, TRIM_R],
  wispy: [WISP_L, WISP_R],
  wispysweep: [WISP_L, WISP_R],
};

const HAIR_TONES: Record<string, [string, string]> = {
  blonde: ["brainHair", "brainHairDeep"],
  honey: ["brainHairHoney", "brainHairHoneyDeep"],
  auburn: ["brainHairAuburn", "brainHairAuburnDeep"],
  espresso: ["brainHairEspresso", "brainHairEspressoDeep"],
  rose: ["brainHairRose", "brainHairRoseDeep"],
};

function capPaths(style: string): string[] {
  return style.endsWith("sweep") ? [SWEEP_CAP_L, SWEEP_CAP_R] : [CAP_L, CAP_R];
}

/* The fall, behind the whole character. Deeper tone because it sits in the
   head's shadow, which is also what stops it reading as a flat cut-out. */
function HairBack({ style, tone }: any) {
  const fall = FALLS[style];
  if (!fall) return null;
  const deep = HAIR_TONES[tone]?.[1] ?? "brainHairDeep";
  return (
    <g>
      <g fill="white" stroke="white" strokeWidth="3.6" strokeLinejoin="round">
        <path d={fall[0]} /><path d={fall[1]} />
      </g>
      <path d={fall[0]} fill={`url(#${deep})`} />
      <path d={fall[1]} fill={`url(#${deep})`} />
    </g>
  );
}

/* Sticker rim for the cap, rendered behind the body so the white never crosses
   her face — it shows only where the cap passes outside the silhouette. */
function HairRim({ style }: any) {
  return (
    <g fill="white" stroke="white" strokeWidth="3.6" strokeLinejoin="round">
      {capPaths(style).map((d, i) => <path key={i} d={d} />)}
    </g>
  );
}

function Hair({ style, tone }: any) {
  const fill = HAIR_TONES[tone]?.[0] ?? "brainHair";
  const strands = style.endsWith("sweep")
    ? ["M 58 8 C 42 11 28 19 21 34", "M 52 13 C 38 17 26 25 19.5 40", "M 70 10 C 78 15 84 23 86.5 34"]
    : ["M 46 9 C 33 14 22.5 23 18.5 37", "M 41.5 15 C 31 21 22.5 30 18 40", "M 54 9 C 67 14 77.5 23 81.5 37", "M 58.5 15 C 69 21 77.5 30 82 40"];
  return (
    <g>
      {capPaths(style).map((d, i) => <path key={i} d={d} fill={`url(#${fill})`} />)}
      <g fill="none" stroke="#C89A3E" strokeWidth="1.1" strokeLinecap="round" opacity="0.34">
        {strands.map((d, i) => <path key={i} d={d} opacity={i % 2 ? 0.7 : 1} />)}
      </g>
    </g>
  );
}

/* The dress. The Minnie lesson: she is the same character as Mickey with
   clothing on, not a redrawn anatomy — same ears, same face, no hair.

   Making it look WORN rather than pasted on is four things, none of them the
   shape itself:
     1. cloth shading across the width (dark at the sides, lit in the middle),
        so flat fabric wraps a round body instead of lying on it;
     2. a tuck shadow under the neckline, so the brain reads as continuing
        behind the fabric rather than ending at it;
     3. folds radiating from the waist to the hem, because cloth gathers;
     4. a scalloped trim above the hem, which gives the edge thickness.
   The old flat waistband block was the thing that read as "dress placed on
   top of her". */
const DRESS = "M 18 57 C 16 62 15 68 14.5 72 C 12 78 9 82 6.5 86 C 22 92 78 92 93.5 86 C 91 82 88 78 85.5 72 C 85 68 84 62 82 57 C 72 65 60 69 50 69 C 40 69 28 65 18 57 Z";
const DRESS_NECKLINE = "M 18 57 C 28 65 40 69 50 69 C 60 69 72 65 82 57";
const DRESS_TUCK = "M 18 57 C 28 65 40 69 50 69 C 60 69 72 65 82 57 L 82 65 C 72 73 60 77 50 77 C 40 77 28 73 18 65 Z";

/* Staggered lattice rather than a scatter. Dots shrink and tilt toward the
   edges so they sit on the curve, and the bottom row runs off the hem — a dot
   cut by the edge is what proves it is printed on the cloth. */
const DRESS_DOTS: ReadonlyArray<[number, number, number]> = [
  [27, 65, 2.3], [40, 68, 2.6], [60, 68, 2.6], [73, 65, 2.3],
  [18, 76, 2.5], [31, 75, 2.8], [45, 74.5, 2.9], [55, 74.5, 2.9], [69, 75, 2.8], [82, 76, 2.5],
  [11, 86, 2.4], [25, 84.5, 2.8], [38, 83.6, 2.9], [50, 83.4, 3.0], [62, 83.6, 2.9], [75, 84.5, 2.8], [89, 86, 2.4],
];

/* Scalloped trim sitting on the hem, so only the top half of each shows. */
const DRESS_SCALLOPS: ReadonlyArray<[number, number]> = [
  [13, 88.5], [23, 90.3], [33, 91.2], [43, 91.6], [50, 91.7], [57, 91.6], [67, 91.2], [77, 90.3], [87, 88.5],
];

/* A dress hangs from shoulders. This character has none: the arms leave the
   body at y 53, ABOVE the mouth at y 61, so a neckline can only ever land on
   her face. A skirt does not hang, it SITS — on the widest part of the base,
   top edge at y 70, nine units clear of the mouth, legs coming out below. It is
   the only garment the anatomy actually allows. */
const SKIRT = "M 24 70 C 20 74 15 78 11 83 C 24 88 76 88 89 83 C 85 78 80 74 76 70 C 60 74 40 74 24 70 Z";
const SKIRT_WAIST = "M 24 70 C 40 74 60 74 76 70";
const SKIRT_DOTS: ReadonlyArray<[number, number, number]> = [
  [22, 78.5, 2.3], [35, 77.6, 2.6], [50, 77.4, 2.7], [65, 77.6, 2.6], [78, 78.5, 2.3],
  [16, 85, 2.2], [29, 84, 2.5], [42, 83.4, 2.6], [58, 83.4, 2.6], [71, 84, 2.5], [84, 85, 2.2],
];
const SKIRT_SCALLOPS: ReadonlyArray<[number, number]> = [
  [17, 85.2], [26, 86.7], [36, 87.4], [46, 87.7], [54, 87.7], [64, 87.4], [74, 86.7], [83, 85.2],
];

/* Optimised hang. Two changes:
   1. The white sticker rim follows only the OUTER contour, as an open path. On
      the plain skirt it rings the whole shape including the waist, which cuts a
      white line between her and the cloth and reads as a separate object laid
      on top. Leaving the waist rim-less lets the skirt merge into the body.
   2. The scallops ARE the silhouette rather than circles laid over a smooth
      arc, and the sides bell outward instead of running straight, so it hangs
      like cloth instead of standing like a lampshade. */
const BELL_HEM = "Q 14.1 89 19.25 86.2 Q 24.4 91.2 29.5 87.6 Q 34.6 92.3 39.75 88.3 Q 44.9 92.9 50 88.5 Q 55.1 92.9 60.25 88.3 Q 65.4 92.3 70.5 87.6 Q 75.6 91.2 80.75 86.2 Q 85.9 89 91 84";
const BELL_OUTER = `M 24 70 C 19 74 13 78 9 84 ${BELL_HEM} C 87 78 81 74 76 70`;
const BELL = `${BELL_OUTER} C 60 74 40 74 24 70 Z`;
const BELL_DOTS: ReadonlyArray<[number, number, number]> = [
  [23, 78.5, 2.4], [36, 77.6, 2.7], [50, 77.4, 2.8], [64, 77.6, 2.7], [77, 78.5, 2.4],
  [15, 85.5, 2.3], [29, 84.4, 2.6], [43, 83.8, 2.7], [57, 83.8, 2.7], [71, 84.4, 2.6], [85, 85.5, 2.3],
];

function SkirtBell() {
  return (
    <g>
      <path d={BELL_OUTER} fill="none" stroke="white" strokeWidth="3.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d={BELL} fill="url(#brainDressCloth)" />
      <clipPath id="brainBellClip"><path d={BELL} /></clipPath>
      <g clipPath="url(#brainBellClip)">
        <path d="M 24 70 C 40 74 60 74 76 70 L 76 77 C 60 81 40 81 24 77 Z" fill="url(#brainDressTuck)" />
        <g fill="none" stroke="#6E251F" strokeWidth="1.1" strokeLinecap="round" opacity="0.26">
          <path d="M 31 72 C 27 77 22 81 17 87" />
          <path d="M 42 74 C 40.5 79 39 84 37.5 90" opacity="0.75" />
          <path d="M 58 74 C 59.5 79 61 84 62.5 90" opacity="0.75" />
          <path d="M 69 72 C 73 77 78 81 83 87" />
        </g>
        <g fill="white" opacity="0.93">
          {BELL_DOTS.map(([cx, cy, r], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * (1 - Math.abs(cx - 50) / 150)}
              transform={`rotate(${(cx - 50) * 0.38} ${cx} ${cy})`} />
          ))}
        </g>
        <path d={BELL_OUTER} fill="none" stroke="#FBE9E3" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      </g>
      <path d="M 24 70 C 40 74 60 74 76 70" fill="none" stroke="#F6C4BA" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function Skirt() {
  return (
    <g>
      <path d={SKIRT} fill="white" stroke="white" strokeWidth="3.6" strokeLinejoin="round" />
      <path d={SKIRT} fill="url(#brainDressCloth)" />
      <clipPath id="brainSkirtClip"><path d={SKIRT} /></clipPath>
      <g clipPath="url(#brainSkirtClip)">
        <path d="M 24 70 C 40 74 60 74 76 70 L 76 76 C 60 80 40 80 24 76 Z" fill="url(#brainDressTuck)" />
        <g fill="none" stroke="#6E251F" strokeWidth="1.1" strokeLinecap="round" opacity="0.28">
          <path d="M 31 72 C 28 77 24 81 20 87" />
          <path d="M 42 74 C 40.5 79 39 84 37.5 89" opacity="0.75" />
          <path d="M 58 74 C 59.5 79 61 84 62.5 89" opacity="0.75" />
          <path d="M 69 72 C 72 77 76 81 80 87" />
        </g>
        <g fill="white" opacity="0.93">
          {SKIRT_DOTS.map(([cx, cy, r], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * (1 - Math.abs(cx - 50) / 150)}
              transform={`rotate(${(cx - 50) * 0.38} ${cx} ${cy})`} />
          ))}
        </g>
        <g fill="#FBE9E3" opacity="0.92">
          {SKIRT_SCALLOPS.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.9" />)}
        </g>
      </g>
      {/* the waistband sits ON her, so it gets a lit top edge and a shadow under */}
      <path d={SKIRT_WAIST} fill="none" stroke="#F6C4BA" strokeWidth="1.3" strokeLinecap="round" opacity="0.62" />
    </g>
  );
}

function Dress() {
  return (
    <g>
      <path d={DRESS} fill="white" stroke="white" strokeWidth="3.6" strokeLinejoin="round" />
      <path d={DRESS} fill="url(#brainDressCloth)" />
      <clipPath id="brainDressClip"><path d={DRESS} /></clipPath>
      <g clipPath="url(#brainDressClip)">
        {/* the body tucking in behind the neckline */}
        <path d={DRESS_TUCK} fill="url(#brainDressTuck)" />
        {/* gathers falling from the neckline to the hem */}
        <g fill="none" stroke="#6E251F" strokeWidth="1.1" strokeLinecap="round" opacity="0.28">
          <path d="M 26 62 C 22 71 17 80 12 90" />
          <path d="M 40 68 C 37 76 34 84 31 92" opacity="0.75" />
          <path d="M 60 68 C 63 76 66 84 69 92" opacity="0.75" />
          <path d="M 74 62 C 78 71 83 80 88 90" />
        </g>
        <g fill="none" stroke="#F3A99C" strokeWidth="1" strokeLinecap="round" opacity="0.28">
          <path d="M 47 69 C 46 77 45.5 85 45 92" />
          <path d="M 53 69 C 54 77 54.5 85 55 92" />
        </g>
        <g fill="white" opacity="0.93">
          {DRESS_DOTS.map(([cx, cy, r], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * (1 - Math.abs(cx - 50) / 150)}
              transform={`rotate(${(cx - 50) * 0.38} ${cx} ${cy})`} />
          ))}
        </g>
        <g fill="#FBE9E3" opacity="0.92">
          {DRESS_SCALLOPS.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="3.1" />)}
        </g>
      </g>
      {/* neckline seam: a thin lit edge, not a block */}
      <path d={DRESS_NECKLINE} fill="none" stroke="#F6C4BA" strokeWidth="1.3" strokeLinecap="round" opacity="0.62" />
    </g>
  );
}

function TalkingMouth({ open }: any) {
  const o = clamp(open, 0, 1);
  const ry = 1.4 + o * 4.2, rx = 4 - o * 0.5;
  return (
    <g>
      <ellipse cx="50" cy="61.8" rx={rx} ry={ry} fill="#8A2F28" />
      {o > 0.25 && <ellipse cx="50" cy={61.8 + ry * 0.4} rx={rx * 0.62} ry={ry * 0.5} fill="#E8786E" />}
    </g>
  );
}

function BrainArt({ rightAngle = 0, leftAngle = 0, rightLen = 1, leftLen = 1, gloves = true, stem = true, rGloveDir = -1, lGloveDir = 1, handKind = "glove" }: any) {
  const rArm = (rightAngle || rightLen !== 1) ? `rotate(${rightAngle} 78 53) translate(78 53) scale(${rightLen}) translate(-78 -53)` : "";
  const lArm = (leftAngle || leftLen !== 1) ? `rotate(${leftAngle} 22 53) translate(22 53) scale(${leftLen}) translate(-22 -53)` : "";
  const bp = stem ? BODY_PATH : BODY_PATH_LEGS;
  return (
    <g>
      <g>
        {stem && <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />}
        {stem && <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />}
        <g transform={lArm}><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" /></g>
        <g transform={rArm}><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" /></g>
        <path d={bp} fill="white" transform="scale(1.08) translate(-3.7,-3.7)" />
      </g>
      {stem && <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#brainCoralDark)" />}
      {stem && (
        <g>
          <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#brainCoralDark)" />
          <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          <path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        </g>
      )}
      <g>
        <path d={bp} fill="url(#brainCoral)" />
        <path d={bp} fill="url(#brainHighlight)" />
        <path d={stem ? "M 50 8 Q 49 30 50 50 Q 51 65 50 78" : "M 50 8 Q 49 30 50 50 Q 50.5 60 50 65"} fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </g>
      <g transform={lArm}>
        <path d="M 23 53 Q 11 52 8 59" fill="none" stroke="url(#brainCoral)" strokeWidth="6" strokeLinecap="round" />
        {handKind === "point"
          ? <g transform={`translate(7 64) scale(${1 / leftLen}) translate(-7 -64)`}><PointHand x={7} y={64} dir={lGloveDir} /></g>
          : gloves
            ? <g transform={`translate(7 64) scale(${1 / leftLen}) translate(-7 -64)`}><Glove x={7} y={64} dir={lGloveDir} /></g>
            : <circle cx="7" cy="62" r="5.5" fill="url(#brainCoral)" />}
      </g>
      <g transform={rArm}>
        <path d="M 77 53 Q 89 52 92 59" fill="none" stroke="url(#brainCoral)" strokeWidth="6" strokeLinecap="round" />
        {handKind === "point"
          ? <g transform={`translate(93 64) scale(${1 / rightLen}) translate(-93 -64)`}><PointHand x={93} y={64} dir={rGloveDir} /></g>
          : gloves
            ? <g transform={`translate(93 64) scale(${1 / rightLen}) translate(-93 -64)`}><Glove x={93} y={64} dir={rGloveDir} /></g>
            : <circle cx="93" cy="62" r="5.5" fill="url(#brainCoral)" />}
      </g>
    </g>
  );
}

function Eye({ cx, cy, look, blink, big, lashes = false }: any) {
  const r = big ? 7.2 : 6.5, pr = big ? 3.6 : 3.2;
  const out = cx < 50 ? -1 : 1;
  const dx = clamp(look.x, -1, 1) * 2.1, dy = clamp(look.y, -1, 1) * 1.9;
  const sy = Math.max(0.06, 1 - blink);
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" />
      <circle cx={cx + dx} cy={cy + dy} r={pr} fill="#1B1713" />
      <circle cx={cx + dx + 1} cy={cy + dy - 1.4} r="1.1" fill="white" />
      {lashes && (
        <g fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round">
          <path d={`M ${cx + out * 5.4} ${cy - 3.5} l ${out * 3.5} -2.7`} />
          <path d={`M ${cx + out * 3.6} ${cy - 5.4} l ${out * 2.3} -3.2`} />
          <path d={`M ${cx + out * 1.2} ${cy - 6.4} l ${out * 0.9} -3.4`} />
        </g>
      )}
    </g>
  );
}

function Specs() {
  const ink = "#1B1713";
  return (
    <g>
      <g fill="#FFFFFF" opacity="0.17"><circle cx="38" cy="48" r="9.4" /><circle cx="62" cy="48" r="9.4" /></g>
      <g fill="none" stroke={ink} strokeWidth="1.45" strokeLinecap="round">
        <circle cx="38" cy="48" r="9.4" />
        <circle cx="62" cy="48" r="9.4" />
        <path d="M 47.4 46.4 Q 50 44.6 52.6 46.4" />
        <path d="M 28.7 45.6 L 21.4 42.8" />
        <path d="M 71.3 45.6 L 78.6 42.8" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <path d="M 32.6 43.4 Q 35.4 41.4 38.6 41.2" />
        <path d="M 56.6 43.4 Q 59.4 41.4 62.6 41.2" />
      </g>
    </g>
  );
}

function Mouth({ expr }: any) {
  switch (expr) {
    case "happy": return <path d="M 43.5 60 Q 50 67.5 56.5 60" fill="none" stroke="#1B1713" strokeWidth="1.9" strokeLinecap="round" />;
    case "grin": return <g><path d="M 43 60 Q 50 68 57 60 Z" fill="#8A2F28" /><path d="M 45.5 62.2 Q 50 65 54.5 62.2" fill="#E8786E" /></g>;
    case "think": return <path d="M 46 62 Q 50 62.6 54 61.4" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />;
    case "mischief": return <path d="M 43.5 60.5 Q 49 65.5 57 58.8" fill="none" stroke="#1B1713" strokeWidth="1.9" strokeLinecap="round" />;
    case "wow": return <g><ellipse cx="50" cy="62.5" rx="3.6" ry="4.6" fill="#8A2F28" /><ellipse cx="50" cy="61" rx="1.5" ry="1" fill="#E8786E" /></g>;
    case "ohh": return <ellipse cx="50" cy="62" rx="3" ry="3.6" fill="#8A2F28" />;
    default: return <path d="M 45 61 Q 50 64.3 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />;
  }
}

function Accessory({ kind }: any) {
  if (kind === "fedora") {
    return (
      <g transform="rotate(-12 50 2)">
        <path d="M 31 4 C 31 -17 39 -24 50 -24 C 61 -24 69 -17 69 4 Z" fill="#14110f" stroke="#000" strokeWidth="0.6" />
        <path d="M 44 -22 Q 50 -18 56 -22" fill="none" stroke="#2c2723" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 31 3 Q 50 9 69 3 L 69 -2 Q 50 4 31 -2 Z" fill="#000" />
        <ellipse cx="50" cy="4" rx="45" ry="8.5" fill="#14110f" stroke="#000" strokeWidth="0.6" />
        <ellipse cx="50" cy="3" rx="32" ry="5" fill="#000" opacity="0.6" />
        <path d="M 37 -20 Q 35 -8 38 2" fill="none" stroke="#3a332e" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <path d="M 12 5 Q 50 12 88 5" fill="none" stroke="#3a332e" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  }
  if (kind === "bow") {
    const trim = "rgba(176,86,78,.45)";
    return (
      <g>
        {/* tails first, so the loops and knot stack over them */}
        <path d="M 48 4 C 44.4 8 41.6 12 42.8 15.4 C 45.6 13.8 47.4 10.4 49.2 6.8 Z" fill="url(#brainSilk)" stroke={trim} strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M 52 4 C 55.6 8 58.4 12 57.2 15.4 C 54.4 13.8 52.6 10.4 50.8 6.8 Z" fill="url(#brainSilk)" stroke={trim} strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M 48 3 C 40 -8 30 -10 26 -4 C 22 2 28 9.4 40 7.2 C 44 6.4 47 5 48 3 Z" fill="url(#brainSilk)" stroke={trim} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M 52 3 C 60 -8 70 -10 74 -4 C 78 2 72 9.4 60 7.2 C 56 6.4 53 5 52 3 Z" fill="url(#brainSilk)" stroke={trim} strokeWidth="0.8" strokeLinejoin="round" />
        <g fill="none" stroke="#C9544A" strokeWidth="0.8" strokeLinecap="round" opacity="0.5">
          <path d="M 45.8 3.4 Q 38.4 -2.2 31.2 -3.6" />
          <path d="M 45.4 5.2 Q 38.6 3.6 32.6 1.4" opacity="0.62" />
          <path d="M 54.2 3.4 Q 61.6 -2.2 68.8 -3.6" />
          <path d="M 54.6 5.2 Q 61.4 3.6 67.4 1.4" opacity="0.62" />
        </g>
        <ellipse cx="50" cy="3.4" rx="4.1" ry="3.5" fill="url(#brainCoralDark)" />
        <path d="M 47.3 1.6 Q 50 0.5 52.7 1.6" fill="none" stroke="#F6A8A2" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
      </g>
    );
  }
  return null;
}

/* Where a wandering gaze looks, in order. Eyes hold on a target, then flick to
   the next — a smooth sine drift reads as seasick, not alive. */
const GAZE_TARGETS: ReadonlyArray<[number, number]> = [
  [0, 0], [-0.75, -0.2], [0, -0.15], [0.8, 0.1], [0.15, 0.45],
  [-0.5, 0.35], [0, 0], [0.6, -0.4], [-0.25, -0.45], [0, 0.1],
];
const GAZE_HOLD = 1.45;

function wanderingGaze(t: number) {
  /* `%` keeps the sign of its left operand in JS, so a negative or NaN `t` gave
     a negative index, GAZE_TARGETS[-1] came back undefined, and `from[0]` threw
     "Cannot read properties of undefined (reading '0')" — which took the whole
     <Braino> subtree with it and rendered /instagraphics as a blank page. The
     clock can go negative on a remount, so guard the arithmetic, not the caller. */
  const count = GAZE_TARGETS.length;
  const step = Number.isFinite(t) ? t / GAZE_HOLD : 0;
  const index = ((Math.floor(step) % count) + count) % count;
  const next = (index + 1) % count;
  // ease over the last 22% of each hold, so the flick is quick and the hold long
  const p = clamp((step - Math.floor(step) - 0.78) / 0.22, 0, 1);
  const e = p * p * (3 - 2 * p);
  const from = GAZE_TARGETS[index] ?? GAZE_TARGETS[0];
  const to = GAZE_TARGETS[next] ?? GAZE_TARGETS[0];
  return { x: from[0] + (to[0] - from[0]) * e, y: from[1] + (to[1] - from[1]) * e };
}

export function Braino({
  size = 150, expr = "neutral", lookX = 0, lookY = 0, blink = 0,
  arm = "none", accessory = "none", tilt = 0, bobAmp = 1, idle = true,
  gloves = true, legs = false, talk = false, walk = false, climb = false, moonwalk = false,
  leftArm = null, rightArm = null, leftLen = 1, rightLen = 1, tuck = 0, rGloveDir = -1, lGloveDir = 1, hands = "glove", style = {},
  femme = false, specs = false, hair = false, dress = false, gaze = "fixed", hairColor = "blonde",
}: any) {
  /* hair: false | true | "bob" | "sweep" | "long" | "trim" | "wispy" (+ "sweep" suffix) */
  const hairStyle = hair === true ? "bob" : String(hair);
  const t = useTime();
  const breath = idle ? 1 + 0.014 * Math.sin(t * 1.7) : 1;
  const bob = idle ? Math.sin(t * 1.7 + 0.6) * 0.8 * bobAmp : 0;
  let autoBlink = 0;
  if (idle) { const cycle = 3.4, bd = 0.13, p = t % cycle; if (p < bd) autoBlink = Math.sin((p / bd) * Math.PI); }
  const eff = Math.max(blink, autoBlink);
  let rightAngle = 0, leftAngle = 0;
  if (arm === "wave") rightAngle = -28 + Math.sin(t * 11) * 16;
  else if (arm === "point") rightAngle = -42;
  const big = expr === "wow";
  const look = gaze === "wander" ? wanderingGaze(t) : { x: lookX, y: lookY };
  const talkOpen = talk ? clamp((0.5 + 0.5 * Math.sin(t * 13.5)) * (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3)) * (0.7 + 0.3 * Math.sin(t * 23)), 0, 1) : 0;
  const vbH = legs ? 142 : 132;
  let walkBob = 0, waddle = 0, leftLift = 0, rightLift = 0, leftSwing = 0, rightSwing = 0;
  let moonProfile = false, moonHeelL = 0, moonHeelR = 0, moonSlideL = 0, moonSlideR = 0;
  if (walk) {
    const s = t * 7.6, Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
    leftLift = Math.max(0, Lp) * 5; rightLift = Math.max(0, Rp) * 5;
    leftSwing = Math.max(0, Lp) * 8; rightSwing = Math.max(0, Rp) * 8;
    waddle = Math.sin(s) * 3.4; walkBob = -Math.abs(Math.sin(s)) * 2 - 0.4;
  }
  if (climb) {
    const c = t * 4.6, p = Math.sin(c);
    leftAngle = 125 - Math.max(0, -p) * 90; rightAngle = -125 + Math.max(0, p) * 90;
    rightLift = Math.max(0, p) * 7; leftLift = Math.max(0, -p) * 7;
    leftSwing = Math.max(0, -p) * 10; rightSwing = Math.max(0, p) * 10;
    walkBob = -Math.abs(p) * 2.2 - 0.4; waddle = p * 2.6;
  }
  if (moonwalk) {
    moonProfile = true;
    const s = t * 4.0, ph = Math.sin(s);
    moonHeelR = Math.max(0, ph) * 42; moonHeelL = Math.max(0, -ph) * 42;
    moonSlideL = Math.max(0, ph) * 10; moonSlideR = Math.max(0, -ph) * 10;
    walkBob = -Math.abs(ph) * 1.0 - 0.3; waddle = ph * 1.0;
  }
  if (rightArm != null) rightAngle = rightArm;
  if (leftArm != null) leftAngle = leftArm;
  if (tuck) { leftLift = Math.max(leftLift, tuck); rightLift = Math.max(rightLift, tuck); }

  return (
    <svg viewBox={`-8 -34 116 ${vbH}`} width={size} height={size * vbH / 116} style={{ overflow: "visible", display: "block", ...style }}>
      <g transform={`rotate(${tilt + waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`} style={{ transformOrigin: "50px 50px" }}>
        {hair && <HairBack style={hairStyle} tone={hairColor} />}
        {legs && <Legs pink={femme} leftLift={leftLift} rightLift={rightLift} leftSwing={leftSwing} rightSwing={rightSwing}
          profile={moonProfile} leftHeel={moonHeelL} rightHeel={moonHeelR} leftSlideX={moonSlideL} rightSlideX={moonSlideR} mirror={moonwalk} />}
        {hair && <HairRim style={hairStyle} />}
        <BrainArt rightAngle={rightAngle} leftAngle={leftAngle} rightLen={rightLen} leftLen={leftLen} gloves={gloves} stem={!legs} rGloveDir={rGloveDir} lGloveDir={lGloveDir} handKind={hands} />
        {dress && (dress === "skirt" ? <Skirt /> : dress === "bell" ? <SkirtBell /> : <Dress />)}
        <g>
          {hair && <Hair style={hairStyle} tone={hairColor} />}
          <Eye cx={38} cy={48} look={look} blink={eff} big={big} lashes={femme} />
          <Eye cx={62} cy={48} look={look} blink={eff} big={big} lashes={femme} />
          <ellipse cx={femme ? 30 : 28} cy="58" rx={femme ? 4.4 : 3.5} ry={femme ? 2.5 : 2} fill={femme ? "#E85450" : "#E14A48"} opacity={femme ? 0.5 : 0.35} />
          <ellipse cx={femme ? 70 : 72} cy="58" rx={femme ? 4.4 : 3.5} ry={femme ? 2.5 : 2} fill={femme ? "#E85450" : "#E14A48"} opacity={femme ? 0.5 : 0.35} />
          {specs && <Specs />}
          {talk ? <TalkingMouth open={talkOpen} /> : <Mouth expr={expr} />}
          <Accessory kind={accessory} />
        </g>
      </g>
    </svg>
  );
}
