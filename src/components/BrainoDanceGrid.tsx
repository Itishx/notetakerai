/* ============================================================
   BrainoDanceGrid.tsx — faithful port of the Claude Design
   "Braino Dancing.html": six dance moves, each a pure function
   of time. Uses the parametric <Braino> (BrainoChar).
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLayoutEffect, useRef, useState } from "react";
import { Braino, useTime } from "./BrainoChar";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const SIZE = 150;

const MOVES = [
  {
    name: "The Twist", hint: "hips · low swing",
    pose(t: number) {
      const b = t * 3.4, sway = Math.sin(b), knee = Math.abs(Math.sin(b));
      return { tx: sway * 9, ty: 0, sy: 1 - knee * 0.06, rot: 0, scaleX: 1, tilt: 0,
        leftArm: 42 + sway * 26, rightArm: -42 + sway * 26, expr: "happy", lookX: sway * 0.5, lookY: 0 };
    },
  },
  {
    name: "Disco Fever", hint: "diagonal point · one arm",
    pose(t: number) {
      const b = t * 2.6, stab = Math.tanh(Math.sin(b) * 2.3);
      return { tx: stab * 6, ty: 0, sy: 1 - Math.abs(Math.sin(b * 2)) * 0.045, rot: 0, scaleX: 1, tilt: 0,
        rightArm: -82 - stab * 56, leftArm: -10, expr: "mischief", lookX: 0.45, lookY: -0.3 - Math.max(0, stab) * 0.25 };
    },
  },
  {
    name: "The Sprinkler", hint: "arm sweep · snap back",
    pose(t: number) {
      const period = 2.0, raw = (t % period) / period;
      let e;
      if (raw < 0.78) { const u = raw / 0.78; e = u * u * (3 - 2 * u); } else { e = 1 - (raw - 0.78) / 0.22; }
      return { tx: (e - 0.5) * 5, ty: 0, sy: 1 - Math.abs(Math.sin(raw * Math.PI)) * 0.03, rot: 0, scaleX: 1, tilt: 0,
        rightArm: -128 + e * 100, leftArm: 102, expr: "grin", lookX: -0.35 + e * 0.7, lookY: 0 };
    },
  },
  {
    name: "Raise the Roof", hint: "both hands · push up",
    pose(t: number) {
      const b = t * 3.9, push = Math.abs(Math.sin(b)), lean = Math.sin(b * 0.5);
      return { tx: lean * 5, ty: -push * 11, rot: 0, scaleX: 1, tilt: 0, sy: 1,
        rightArm: -116 - push * 20, leftArm: 116 + push * 20, expr: "grin", lookY: -0.4, lookX: lean * 0.3 };
    },
  },
];

function DanceCell({ move, index }: any) {
  const t = useTime();
  const p = move.pose(t);
  const dx = p.tx || 0, dy = p.ty || 0, rot = p.rot || 0, sx = p.scaleX || 1, sy = p.sy == null ? 1 : p.sy;
  const lift = clamp(-dy / 11, 0, 1);
  const shScale = 1 - lift * 0.22 + Math.abs(dx) / 60;
  const shOp = 1 - lift * 0.4;
  return (
    <div className="dcell">
      <span className="dbadge">{String(index + 1).padStart(2, "0")}</span>
      <div className="dspot" /><div className="dfloor" />
      <div className="dshadow" style={{ transform: `translate(calc(-50% + ${dx}px), 40%) scaleX(${shScale})`, opacity: shOp }} />
      <div className="dancer" style={{ transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot}deg) scaleX(${sx}) scaleY(${sy})` }}>
        <Braino size={SIZE} legs gloves tilt={p.tilt || 0} leftArm={p.leftArm} rightArm={p.rightArm} expr={p.expr || "happy"} lookX={p.lookX || 0} lookY={p.lookY || 0} idle />
      </div>
      <div className="dlabel"><div className="dname">{move.name}</div><div className="dhint">{move.hint}</div></div>
    </div>
  );
}

function GunCell({ index }: any) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const t = useTime();
  const [w, setW] = useState(760);
  useLayoutEffect(() => {
    const measure = () => sceneRef.current && setW(sceneRef.current.clientWidth);
    measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure);
  }, []);
  const SPEED = 56, span = w + SIZE * 1.5;
  const x = w + SIZE * 0.75 - ((t * SPEED + w * 0.55) % span);
  const b = t * 3.0, s = Math.tanh(Math.sin(b) * 2.6), groove = Math.abs(Math.sin(b));
  const sy = 1 - groove * 0.05;
  const rightArm = -130 - s * 25, leftArm = 130 - s * 25;
  const shScale = 0.92 + groove * 0.04;
  return (
    <div className="dcell wide" ref={sceneRef}>
      <span className="dbadge">{String(index + 1).padStart(2, "0")}</span>
      <div className="dspot" /><div className="dfloor" />
      <div className="dshadow" style={{ left: x, transform: `translate(-50%, 40%) scaleX(${shScale})` }} />
      <div className="dancer" style={{ left: x, transform: `translate(-50%, 0) scaleY(${sy})` }}>
        <Braino size={SIZE} legs gloves hands="point" leftArm={leftArm} rightArm={rightArm} expr="mischief" lookX={-0.4} lookY={-0.45} idle />
      </div>
      <div className="dlabel"><div className="dname">Gun Fingers</div><div className="dhint">point to the sky · strut left</div></div>
    </div>
  );
}

function MoonwalkCell({ index }: any) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const t = useTime();
  const [w, setW] = useState(760);
  useLayoutEffect(() => {
    const measure = () => sceneRef.current && setW(sceneRef.current.clientWidth);
    measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure);
  }, []);
  const SPEED = 84, span = w + SIZE * 1.6;
  const x = w + SIZE * 0.7 - ((t * SPEED + w * 0.5) % span);
  const sScale = 1 - 0.06 * Math.abs(Math.sin(t * 4.2));
  return (
    <div className="dcell wide" ref={sceneRef}>
      <span className="dbadge">{String(index + 1).padStart(2, "0")}</span>
      <div className="dspot" /><div className="dfloor" />
      <div className="dshadow" style={{ left: x, transform: `translate(-50%, 40%) scaleX(${sScale})` }} />
      <div className="dancer" style={{ left: x, transform: "translate(-50%, 0)" }}>
        <Braino size={SIZE} legs gloves moonwalk accessory="fedora" expr="mischief" lookX={0.45} lookY={0.05} idle />
      </div>
      <div className="dlabel"><div className="dname">Moonwalk</div><div className="dhint">feet forward · glide back</div></div>
    </div>
  );
}

export default function BrainoDanceGrid() {
  return (
    <div className="dgrid">
      {MOVES.map((m, i) => <DanceCell key={m.name} move={m} index={i} />)}
      <GunCell index={MOVES.length} />
      <MoonwalkCell index={MOVES.length + 1} />
    </div>
  );
}
