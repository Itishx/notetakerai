/* ============================================================
   WebbChar.tsx — "Webb", the web-slinger. Second face on Braino OS.
   Ported from the Claude Design "mascot-webb.jsx" (same project as
   BrainoChar.tsx's braino-char.jsx source), running the identical
   parametric rig: shared RAF clock, procedural talk-mouth mix,
   walk cycle. Own mask (teardrop lenses), amber/ink suit — an
   original character, not a reskinned Braino.

   The design source drew Webb's legs as one static silhouette (no
   walk pose existed for him yet). This port splits that silhouette
   into two independently posable legs and drives them with Braino's
   own walk-cycle formula (see BrainoChar.tsx's `walk` branch) so
   both characters walk on the same mechanism.

   Exports: Webb, WebbDefs
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTime } from "./BrainoChar";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function WebbDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <linearGradient id="webSuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F39A42" /><stop offset="100%" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="webDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241E1B" /><stop offset="100%" stopColor="#141110" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const LEFT_LEG_PATH = "M 45 66 L 38 66 L 34 100 L 44 100 L 48 72 Z";
const RIGHT_LEG_PATH = "M 55 66 L 62 66 L 66 100 L 56 100 L 52 72 Z";

function Leg({ d, lift = 0, swing = 0, pivotX }: any) {
  return (
    <g transform={`translate(0 ${-lift}) rotate(${swing} ${pivotX} 68)`}>
      <path d={d} fill="url(#webSuit)" stroke="#8A2A22" strokeWidth="0.8" strokeLinejoin="round" />
    </g>
  );
}

export function Webb({
  size = 240, lookX = 0, lookY = 0, blink = 0, arm = "none", tilt = 0, bobAmp = 1,
  idle = true, talk = false, walk = false, leftArm = null, rightArm = null, style = {},
}: any) {
  const t = useTime();
  const bob = idle ? Math.sin(t * 1.7) * 1 * bobAmp : 0;
  const crouch = idle ? Math.sin(t * 1.4 + 1) * 1.2 : 0;
  let autoBlink = 0;
  if (idle) { const c = 3.6, bd = 0.08; const p = t % c; if (p < bd) autoBlink = 1; }
  const eff = Math.max(blink, autoBlink);
  let rA = 0, lA = 0;
  if (arm === "wave") rA = -55 + Math.sin(t * 12) * 18;
  else if (arm === "point") rA = -70;
  if (rightArm != null) rA = rightArm;
  if (leftArm != null) lA = leftArm;
  const talkOpen = talk ? clamp((0.5 + 0.5 * Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 7.5)), 0, 1) : 0;
  const sy = Math.max(0.1, 1 - eff);
  const lx = clamp(lookX, -1, 1) * 3, ly = clamp(lookY, -1, 1) * 2;

  // walk cycle — identical formula to Braino's `walk` branch (BrainoChar.tsx),
  // so both characters move on the same underlying mechanism.
  let leftLift = 0, rightLift = 0, leftSwing = 0, rightSwing = 0, waddle = 0, walkBob = 0;
  if (walk) {
    const s = t * 7.6, Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
    leftLift = Math.max(0, Lp) * 5; rightLift = Math.max(0, Rp) * 5;
    leftSwing = Math.max(0, Lp) * 8; rightSwing = Math.max(0, Rp) * 8;
    waddle = Math.sin(s) * 3.4; walkBob = -Math.abs(Math.sin(s)) * 2 - 0.4;
  }

  return (
    <svg viewBox="-16 -10 132 122" width={size} height={size * 116 / 132} style={{ overflow: "visible", display: "block", ...style }}>
      <g transform={`rotate(${waddle} 50 66) translate(0 ${bob + crouch + walkBob})`}>
        <ellipse cx="50" cy="106" rx="20" ry="5" fill="#000" opacity="0.18" />
        <Leg d={LEFT_LEG_PATH} lift={leftLift} swing={leftSwing} pivotX={43} />
        <Leg d={RIGHT_LEG_PATH} lift={rightLift} swing={rightSwing} pivotX={57} />
        <path d="M 34 44 Q 30 58 36 70 Q 50 78 64 70 Q 70 58 66 44 Q 58 34 50 34 Q 42 34 34 44 Z" fill="url(#webSuit)" stroke="#8A2A22" strokeWidth="0.9" strokeLinejoin="round" />
        <g fill="none" stroke="#141110" strokeWidth="0.7" opacity="0.6"><path d="M 40 40 L 60 66" /><path d="M 60 40 L 40 66" /><path d="M 50 34 L 50 72" /></g>
        <g transform={`rotate(${lA} 35 46)`}><path d="M 35 46 Q 22 50 16 62" stroke="url(#webSuit)" strokeWidth="7.5" strokeLinecap="round" fill="none" /><circle cx="14" cy="64" r="4.6" fill="url(#webDark)" /></g>
        <g transform={`rotate(${rA} 65 46)`}><path d="M 65 46 Q 78 50 84 62" stroke="url(#webSuit)" strokeWidth="7.5" strokeLinecap="round" fill="none" /><circle cx="86" cy="64" r="4.6" fill="url(#webDark)" /></g>
        <path d="M 32 32 Q 28 12 50 9 Q 72 12 68 32 Q 66 42 50 44 Q 34 42 32 32 Z" fill="url(#webDark)" />
        <g fill="none" stroke="#3a332e" strokeWidth="0.6" opacity="0.6"><path d="M 40 14 L 46 34" /><path d="M 50 11 L 50 40" /><path d="M 60 14 L 54 34" /></g>
        <g transform={`scale(1 ${sy})`} style={{ transformOrigin: "50px 26px" }}>
          <path d={`M ${28 + lx} ${28 + ly} Q ${37 + lx} ${18 + ly} ${47 + lx} ${26 + ly} Q ${37 + lx} ${34 + ly} ${28 + lx} ${28 + ly} Z`} fill="#F3C05C" />
          <path d={`M ${72 - lx} ${28 - ly} Q ${63 - lx} ${18 - ly} ${53 - lx} ${26 - ly} Q ${63 - lx} ${34 - ly} ${72 - lx} ${28 - ly} Z`} fill="#F3C05C" />
        </g>
        <path d={`M 44 ${37 + talkOpen * 2} Q 50 ${38 + talkOpen * 4} 56 ${37 + talkOpen * 2}`} fill="none" stroke="#3a332e" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}
