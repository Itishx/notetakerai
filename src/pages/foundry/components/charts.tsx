import React from "react";
import type { Engine, Flows, Stage } from "../store";
import { STAGES, STAGE_LABEL } from "../store";

/* Inline SVG charts. They draw in once (CSS keyframes) and then sit still;
   prefers-reduced-motion turns the drawing off in foundry.css. */

export function Ring({ n, of, label, engine = "optics", size = 132 }: { n: number; of: number; label?: string; engine?: Engine; size?: number }) {
  const r = 46, c = 2 * Math.PI * r, p = of ? Math.min(1, n / of) : 0;
  return (
    <svg className={`fx-ring ${engine}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${n} of ${of}${label ? ` ${label}` : ""}`}>
      <circle cx="60" cy="60" r={r} className="track" />
      <circle cx="60" cy="60" r={r} className="val" style={{ ["--len" as string]: `${c * p}`, ["--c" as string]: `${c}` }} strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="60" className="big">{n}</text>
      <text x="60" y="80" className="small">of {of}</text>
    </svg>
  );
}

export function Bars({ rows, you }: { rows: { name: string; value: number }[]; you?: { name: string; value: number } }) {
  const all = you ? [you, ...rows] : rows;
  const max = Math.max(1, ...all.map((r) => r.value));
  return (
    <ul className="fx-bars">
      {all.map((r, i) => (
        <li key={r.name + i} className={you && i === 0 ? "you" : ""}>
          <span className="fx-bars-n">{r.name}</span>
          <span className="fx-bars-t"><i style={{ width: `${(r.value / max) * 100}%`, animationDelay: `${i * 60}ms` }} /></span>
          <b>{r.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function Spark({ values, engine }: { values: number[]; engine?: Engine }) {
  const v = values.length > 1 ? values : [0, ...(values.length ? values : [0])];
  const w = 120, h = 32, max = Math.max(1, ...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - 3 - (x / max) * (h - 6)}`).join(" ");
  const last = pts.split(" ").pop()!.split(",");
  return (
    <svg className={`fx-spark ${engine || ""}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} pathLength={1} />
      <circle cx={last[0]} cy={last[1]} r="2.6" />
    </svg>
  );
}

export function Funnel({ counts }: { counts: Record<Stage, number> }) {
  const max = Math.max(1, ...STAGES.map((s) => counts[s]));
  return (
    <ol className="fx-funnel">
      {STAGES.map((s, i) => (
        <li key={s} className={s}>
          <b>{counts[s]}</b>
          <span className="fx-funnel-bar"><i style={{ height: `${Math.max(6, (counts[s] / max) * 100)}%`, animationDelay: `${i * 70}ms` }} /></span>
          <span className="fx-funnel-l">{STAGE_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="fx-meter" aria-label={`${label || "Readiness"} ${value} of 100`}>
      {label && <span>{label}</span>}
      <i><em style={{ width: `${value}%` }} /></i>
      <b>{value}</b>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/* When to post (2026-10-23): a real week calendar. Seven day columns with the
   date, today marked, and each post as a card in its platform's colour with
   its time and whether it is waiting, approved or skipped. */
const PLAT_COLOR: Record<string, string> = { X: "#111", LinkedIn: "#0a66c2", Reddit: "#ff4500", Instagram: "#d62976", Threads: "#333" };
const ST_LABEL: Record<string, string> = { waiting: "Waiting", approved: "Approved", skipped: "Skipped" };
export function WeekStrip({ items }: { items: { day: number; time: string; label: string; status: string }[] }) {
  const today = (new Date().getDay() + 6) % 7;
  const monday = new Date(); monday.setDate(monday.getDate() - today);
  return (
    <div className="fx-cal" role="table" aria-label="This week's posts">
      {DAYS.map((d, i) => {
        const date = new Date(monday); date.setDate(monday.getDate() + i);
        const posts = items.filter((x) => x.day === i).sort((a, z) => a.time.localeCompare(z.time));
        return (
          <div key={d} className={`fx-cal-day${i === today ? " today" : ""}${i < today ? " past" : ""}`} role="row">
            <div className="fx-cal-h"><span>{d}</span><b>{date.getDate()}</b>{i === today && <em>Today</em>}</div>
            <div className="fx-cal-b">
              {posts.length ? posts.map((x, j) => (
                <div key={j} className={`fx-cal-p ${x.status}`} style={{ ["--pc" as string]: PLAT_COLOR[x.label] || "var(--fx-c)" }}>
                  <small>{x.time}</small>
                  <b>{x.label}</b>
                  <span>{ST_LABEL[x.status] || x.status}</span>
                </div>
              )) : <p className="fx-cal-none">Nothing</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* The loop: three engines round one memory, each arrow labelled with what
   actually moved along it this run. */
export function LoopDiagram({ flows }: { flows: Flows }) {
  const A = ({ d, label, x, y, on }: { d: string; label: string; x: number; y: number; on: boolean }) => (
    <g className={`fx-loop-a ${on ? "on" : ""}`}>
      <path d={d} markerEnd="url(#fxArrow)" />
      <text x={x} y={y}>{label}</text>
    </g>
  );
  return (
    <svg className="fx-loop" viewBox="0 0 520 300" role="img" aria-label="How the three engines fed each other this run">
      <defs><marker id="fxArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" /></marker></defs>
      <A d="M206 214 C150 200 120 160 120 110" on={flows.quotesToOptics > 0} label={`${flows.quotesToOptics} quote to search`} x={54} y={200} />
      <A d="M314 214 C370 200 400 160 400 110" on={flows.quotesToContent > 0} label={`${flows.quotesToContent} quotes to posts`} x={360} y={200} />
      <A d="M176 70 L344 70" on={flows.gapsToContent > 0} label={`${flows.gapsToContent} gaps to posts`} x={260} y={58} />
      <A d="M420 116 C430 190 370 236 318 244" on={flows.postsToOutreach > 0} label={`${flows.postsToOutreach} openers`} x={432} y={250} />
      <g className="fx-loop-n optics"><rect x="60" y="44" width="116" height="52" rx="12" /><text x="118" y="66">Optics</text><text x="118" y="84" className="s">They find you</text></g>
      <g className="fx-loop-n content"><rect x="344" y="44" width="116" height="52" rx="12" /><text x="402" y="66">Content</text><text x="402" y="84" className="s">They see you</text></g>
      <g className="fx-loop-n outreach"><rect x="202" y="214" width="116" height="52" rx="12" /><text x="260" y="236">Outreach</text><text x="260" y="254" className="s">You reach them</text></g>
      <g className="fx-loop-mem"><circle cx="260" cy="146" r="40" /><text x="260" y="143">Memory</text><text x="260" y="160" className="s">{flows.objections} objection{flows.objections === 1 ? "" : "s"}</text></g>
    </svg>
  );
}

export function KPI({ label, value, sub, spark, engine, hint }: { label: string; value: React.ReactNode; sub?: string; spark?: number[]; engine?: Engine; hint?: React.ReactNode }) {
  return (
    <div className={`fx-kpi ${engine || ""}`}>
      <span className="fx-kpi-l">{label}{hint}</span>
      <b className="fx-kpi-v">{value}</b>
      {sub && <span className="fx-kpi-s">{sub}</span>}
      {spark && <Spark values={spark} engine={engine} />}
    </div>
  );
}
