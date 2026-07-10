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

function LegShoe() {
  return (
    <g>
      <path d="M 45 74 L 42.5 87" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M 45 74 L 42.5 87" fill="none" stroke="url(#brainCoral)" strokeWidth="5.5" strokeLinecap="round" />
      <path d={SHOE_UPPER} fill="white" stroke="rgba(176,86,78,.42)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d={SHOE_SOLE} fill="#F6E2DC" stroke="rgba(176,86,78,.42)" strokeWidth="0.8" strokeLinejoin="round" />
      <g fill="none" stroke="#C9544A" strokeWidth="0.85" strokeLinecap="round" opacity="0.7">
        <path d="M 29.5 90 Q 36 88.5 43 89.2" /><path d="M 32 92.7 Q 37.5 91.7 43 92.2" opacity="0.6" />
      </g>
      <ellipse cx="30" cy="92.4" rx="3" ry="1.4" fill="#fff" opacity="0.6" transform="rotate(-12 30 92.4)" />
    </g>
  );
}

function Legs({ leftLift = 0, rightLift = 0, leftSwing = 0, rightSwing = 0, profile = false,
  leftHeel = 0, rightHeel = 0, leftSlideX = 0, rightSlideX = 0, mirror = false }: any) {
  if (profile) {
    const inner = (
      <g>
        <g transform={`translate(${12 + rightSlideX} ${-rightLift})`}><g transform={`rotate(${-rightHeel} 24 101)`}><LegShoe /></g></g>
        <g transform={`translate(${leftSlideX} ${-leftLift})`}><g transform={`rotate(${-leftHeel} 24 101)`}><LegShoe /></g></g>
      </g>
    );
    return mirror ? <g transform="translate(100,0) scale(-1,1)">{inner}</g> : inner;
  }
  return (
    <g>
      <g transform={`translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`}><LegShoe /></g>
      <g transform={`translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`}><g transform="translate(100,0) scale(-1,1)"><LegShoe /></g></g>
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

function Eye({ cx, cy, look, blink, big }: any) {
  const r = big ? 7.2 : 6.5, pr = big ? 3.6 : 3.2;
  const dx = clamp(look.x, -1, 1) * 2.1, dy = clamp(look.y, -1, 1) * 1.9;
  const sy = Math.max(0.06, 1 - blink);
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" />
      <circle cx={cx + dx} cy={cy + dy} r={pr} fill="#1B1713" />
      <circle cx={cx + dx + 1} cy={cy + dy - 1.4} r="1.1" fill="white" />
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
  return null;
}

export function Braino({
  size = 150, expr = "neutral", lookX = 0, lookY = 0, blink = 0,
  arm = "none", accessory = "none", tilt = 0, bobAmp = 1, idle = true,
  gloves = true, legs = false, talk = false, walk = false, climb = false, moonwalk = false,
  leftArm = null, rightArm = null, leftLen = 1, rightLen = 1, tuck = 0, rGloveDir = -1, lGloveDir = 1, hands = "glove", style = {},
}: any) {
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
  const look = { x: lookX, y: lookY };
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
        {legs && <Legs leftLift={leftLift} rightLift={rightLift} leftSwing={leftSwing} rightSwing={rightSwing}
          profile={moonProfile} leftHeel={moonHeelL} rightHeel={moonHeelR} leftSlideX={moonSlideL} rightSlideX={moonSlideR} mirror={moonwalk} />}
        <BrainArt rightAngle={rightAngle} leftAngle={leftAngle} rightLen={rightLen} leftLen={leftLen} gloves={gloves} stem={!legs} rGloveDir={rGloveDir} lGloveDir={lGloveDir} handKind={hands} />
        <g>
          <Eye cx={38} cy={48} look={look} blink={eff} big={big} />
          <Eye cx={62} cy={48} look={look} blink={eff} big={big} />
          <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
          <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
          {talk ? <TalkingMouth open={talkOpen} /> : <Mouth expr={expr} />}
          <Accessory kind={accessory} />
        </g>
      </g>
    </svg>
  );
}
