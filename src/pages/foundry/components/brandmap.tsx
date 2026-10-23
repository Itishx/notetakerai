import React from "react";
import { fmtTime } from "../lib";
import type { Engine, Project } from "../store";
import { namedRange, shareOfVoice } from "../types";

/* The brand map (2026-10-23). Itish: "a visual of how the engines are live
   feeding into each other and how that is helping the brand in real time."
   Your brand in the middle, the three engines around it. Every line is a real
   hand-off counted from memory (a buyer quote that became a topic, a gap that
   became a post), and every count is real. Dots run along a line when it has
   carried something, and run fast while the engine at its start is working. */

type Busy = Partial<Record<Engine | "setup", string>>;
const NODE: Record<Engine, { x: number; y: number; label: string; color: string }> = {
  optics: { x: 150, y: 96, label: "Get found", color: "var(--fx-o)" },
  content: { x: 570, y: 96, label: "Be seen", color: "var(--fx-c)" },
  outreach: { x: 360, y: 340, label: "Reach people", color: "var(--fx-r)" },
};
const BRAND = { x: 360, y: 190 };
const WHO: Record<string, string> = { optics: "Get found", content: "Be seen", outreach: "Reach people", memory: "Memory", you: "You" };

/* A gentle curve from a to b, bowed to one side so two-way lines don't overlap. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }, bow = 40) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
  return { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, lx: (a.x + 2 * cx + b.x) / 4, ly: (a.y + 2 * cy + b.y) / 4 };
}

export function BrandMap({ p, busy }: { p: Project; busy: Busy }) {
  const m = p.memory;
  const o = p.optics;
  const range = namedRange(p);
  const sov = shareOfVoice(p);
  const of = o?.answers.length || 0;

  // The real hand-offs between engines, from memory.
  const quotedTopics = m.topics.filter((t) => t.source === "reddit").length;
  const gapTopics = m.topics.filter((t) => t.source === "optics").length;
  const objectionFixes = (o?.fixes || []).filter((f) => f.from === "objection").length + m.topics.filter((t) => t.source === "objection").length;
  const quoteSearches = (o?.google || []).filter((g) => !o!.answers.some((a) => a.question.toLowerCase() === g.query.toLowerCase())).length;
  const openers = p.people.filter((x) => x.opener).length;

  const edges: { from: Engine; to: Engine; n: number; label: string; bow: number }[] = [
    { from: "outreach", to: "content", n: quotedTopics, label: `${quotedTopics} buyer quote${quotedTopics === 1 ? "" : "s"} → topics`, bow: -36 },
    { from: "optics", to: "content", n: gapTopics, label: `${gapTopics} gap${gapTopics === 1 ? "" : "s"} → posts`, bow: -28 },
    { from: "outreach", to: "optics", n: quoteSearches + objectionFixes, label: `${quoteSearches + objectionFixes} quote${quoteSearches + objectionFixes === 1 ? "" : "s"} & doubts → fixes`, bow: 36 },
    { from: "content", to: "outreach", n: openers, label: `${openers} post${openers === 1 ? "" : "s"} → openers`, bow: -36 },
  ];

  // What each engine is doing for the brand, said in its own line to the middle.
  const people = p.people.length;
  const talking = p.people.filter((x) => ["replied", "talking", "paid"].includes(x.stage)).length;
  const paid = p.people.filter((x) => x.stage === "paid").length;
  const postsOut = p.posts.filter((x) => x.status === "approved").length;
  const stat: Record<Engine, string> = {
    optics: of ? (range.low === range.high ? `Named in ${range.high} of ${of}` : `Named in ${range.low} to ${range.high} of ${of}`) : "Not checked yet",
    content: p.posts.length ? `${postsOut} out, ${p.posts.filter((x) => x.status === "waiting").length} waiting` : "No posts yet",
    outreach: people ? `${people} found, ${talking} talking` : "Nobody found yet",
  };
  const live = (e: Engine) => busy[e] || "";
  const anyLive = (Object.keys(NODE) as Engine[]).some(live);

  return (
    <section className="fx-sec fx-map">
      <header className="fx-sec-h">
        <h2>{anyLive ? <><i className="fx-map-pulse" />Working for {m.product.name || "you"} right now</> : `How your engines are working for ${m.product.name || "you"}`}</h2>
      </header>
      <div className="fx-map-grid">
        <svg className="fx-map-svg" viewBox="0 0 720 400" role="img" aria-label="Your brand in the middle, the three engines around it, and what they pass to each other">
          <defs>
            <radialGradient id="fxBrandGlow"><stop offset="0%" stopColor="var(--a-ink)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--a-ink)" stopOpacity="0" /></radialGradient>
          </defs>

          {/* Each engine feeds the brand. */}
          {(Object.keys(NODE) as Engine[]).map((e) => {
            const c = curve(NODE[e], BRAND, 0);
            return (
              <g key={`b-${e}`} className={`fx-map-spoke ${live(e) ? "live" : ""}`}>
                <path id={`spoke-${e}`} d={c.d} style={{ stroke: NODE[e].color }} />
                <circle r="3" style={{ fill: NODE[e].color }}><animateMotion dur={live(e) ? "1.2s" : "3.6s"} repeatCount="indefinite"><mpath href={`#spoke-${e}`} /></animateMotion></circle>
              </g>
            );
          })}

          {/* The hand-offs between engines. */}
          {edges.map((ed, i) => {
            const c = curve(NODE[ed.from], NODE[ed.to], ed.bow);
            const on = ed.n > 0;
            const fast = !!live(ed.from);
            return (
              <g key={i} className={`fx-map-edge ${on ? "on" : ""} ${fast ? "live" : ""}`}>
                <path id={`edge-${i}`} d={c.d} style={{ stroke: NODE[ed.from].color }} />
                {on && [0, 1, 2].map((k) => (
                  <circle key={k} r="3.5" style={{ fill: NODE[ed.from].color }}>
                    <animateMotion dur={fast ? "1.4s" : "4.2s"} begin={`${k * (fast ? 0.46 : 1.4)}s`} repeatCount="indefinite"><mpath href={`#edge-${i}`} /></animateMotion>
                  </circle>
                ))}
                <text x={c.lx} y={c.ly} className="fx-map-elabel">{ed.label}</text>
              </g>
            );
          })}

          {/* Your brand. */}
          <circle cx={BRAND.x} cy={BRAND.y} r="92" fill="url(#fxBrandGlow)" className={anyLive ? "fx-map-glow live" : "fx-map-glow"} />
          <g className="fx-map-brand">
            <circle cx={BRAND.x} cy={BRAND.y} r="46" />
            <text x={BRAND.x} y={BRAND.y - 4} className="n">{(m.product.name || "You").slice(0, 14)}</text>
            <text x={BRAND.x} y={BRAND.y + 14} className="s">{sov.total ? `${sov.pct}% of AI's picks` : "your brand"}</text>
          </g>

          {/* The engines. */}
          {(Object.keys(NODE) as Engine[]).map((e) => (
            <g key={e} className={`fx-map-node ${e} ${live(e) ? "live" : ""}`} transform={`translate(${NODE[e].x} ${NODE[e].y})`}>
              {live(e) && <circle r="44" className="ring" style={{ stroke: NODE[e].color }} />}
              <rect x="-74" y="-30" width="148" height="60" rx="16" style={{ stroke: NODE[e].color }} />
              <circle cx="-56" cy="-12" r="4" style={{ fill: NODE[e].color }} />
              <text x="-46" y="-8" className="n">{NODE[e].label}</text>
              <text x="-62" y="14" className="s">{(live(e) || stat[e]).slice(0, 26)}</text>
            </g>
          ))}
        </svg>

        <aside className="fx-map-side">
          <p className="fx-map-k">What it's doing for your brand</p>
          <dl className="fx-map-out">
            <div><dt>Named by AI</dt><dd>{of ? (range.low === range.high ? `${range.high} of ${of}` : `${range.low} to ${range.high} of ${of}`) : "Not yet"}</dd></div>
            <div><dt>Share of AI's picks</dt><dd>{sov.total ? `${sov.pct}%` : "Not yet"}</dd></div>
            <div><dt>Posts out</dt><dd>{postsOut}</dd></div>
            <div><dt>People talking</dt><dd>{talking}{people ? <small> of {people}</small> : null}</dd></div>
            <div><dt>Paid</dt><dd>{paid}</dd></div>
          </dl>
          <p className="fx-map-k">Live</p>
          {m.activity.length ? (
            <ol className="fx-map-feed">
              {m.activity.slice(0, 6).map((a) => (
                <li key={a.id}><i className={`fx-dot ${a.who}`} /><span><b>{WHO[a.who]}</b> {a.text}</span><time>{fmtTime(a.at)}</time></li>
              ))}
            </ol>
          ) : <p className="fx-small">When the engines run, every step shows up here as it happens.</p>}
        </aside>
      </div>
    </section>
  );
}
