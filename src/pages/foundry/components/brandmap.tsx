import React from "react";
import "./brandmap.css";
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
  optics: { x: 170, y: 110, label: "Get found", color: "var(--fx-o)" },
  content: { x: 830, y: 110, label: "Be seen", color: "var(--fx-c)" },
  outreach: { x: 500, y: 380, label: "Reach people", color: "var(--fx-r)" },
};
const ENGINE_NAME: Record<Engine, string> = { optics: "Optics", content: "Content", outreach: "Outreach" };
const BRAND = { x: 500, y: 205 };
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
    { from: "outreach", to: "content", n: quotedTopics, label: "buyer quotes became post topics", bow: -60 },
    { from: "optics", to: "content", n: gapTopics, label: "gaps on Google and AI became posts", bow: -70 },
    { from: "outreach", to: "optics", n: quoteSearches + objectionFixes, label: "buyer questions became fixes to get found", bow: 60 },
    { from: "content", to: "outreach", n: openers, label: "posts became openers for messages", bow: 60 },
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
      <div className="fx-map-wrap">
        <svg className="fx-map-svg" viewBox="0 0 1000 470" role="img" aria-label="Your brand in the middle, the three engines around it, and what they pass to each other">
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
              </g>
            );
          })}

          {/* Your brand. */}
          <circle cx={BRAND.x} cy={BRAND.y} r="110" fill="url(#fxBrandGlow)" className={anyLive ? "fx-map-glow live" : "fx-map-glow"} />
          <g className="fx-map-brand">
            <circle cx={BRAND.x} cy={BRAND.y} r="58" />
            <text x={BRAND.x} y={BRAND.y - 4} className="n">{(m.product.name || "You").slice(0, 16)}</text>
            <text x={BRAND.x} y={BRAND.y + 14} className="s">{sov.total ? `${sov.pct}% of AI's picks` : "your brand"}</text>
          </g>

          {/* The engines. */}
          {(Object.keys(NODE) as Engine[]).map((e) => (
            <g key={e} className={`fx-map-node ${e} ${live(e) ? "live" : ""}`} transform={`translate(${NODE[e].x} ${NODE[e].y})`}>
              {live(e) && <rect x="-118" y="-46" width="236" height="92" rx="24" className="ring" style={{ stroke: NODE[e].color }} />}
              <rect x="-110" y="-38" width="220" height="76" rx="20" style={{ stroke: NODE[e].color }} />
              <circle cx="-88" cy="-13" r="5" style={{ fill: NODE[e].color }} />
              <text x="-76" y="-8" className="n">{NODE[e].label}</text>
              <text x="88" y="-8" className="k" style={{ fill: NODE[e].color }}>{ENGINE_NAME[e]}</text>
              <text x="-92" y="20" className="s">{(live(e) || stat[e]).slice(0, 32)}</text>
            </g>
          ))}
        </svg>

        <div className="fx-map-flows">
          {edges.map((ed, i) => (
            <div key={i} className={`fx-map-flow${ed.n ? " on" : ""}`}>
              <span className="fx-map-flow-path"><i style={{ background: NODE[ed.from].color }} />{NODE[ed.from].label}<em>→</em><i style={{ background: NODE[ed.to].color }} />{NODE[ed.to].label}</span>
              <b>{ed.n}</b><span className="fx-map-flow-t">{ed.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fx-map-below">
        <section>
          <p className="fx-map-k">What it's doing for your brand</p>
          <dl className="fx-map-out">
            <div className="o"><dt>Named by AI</dt><dd>{of ? (range.low === range.high ? <>{range.high}<small> of {of}</small></> : <>{range.low} to {range.high}<small> of {of}</small></>) : "Not yet"}</dd></div>
            <div className="o"><dt>Share of AI's picks</dt><dd>{sov.total ? `${sov.pct}%` : "Not yet"}</dd></div>
            <div className="c"><dt>Posts out</dt><dd>{postsOut}</dd></div>
            <div className="r"><dt>People talking</dt><dd>{talking}{people ? <small> of {people}</small> : null}</dd></div>
            <div className="paid"><dt>Paying customers</dt><dd>{paid}</dd></div>
          </dl>
        </section>
        <section>
          <p className="fx-map-k">{anyLive ? <><i className="fx-map-pulse" />Live</> : "Latest"}</p>
          {m.activity.length ? (
            <ol className="fx-map-feed">
              {m.activity.slice(0, 6).map((a) => (
                <li key={a.id}><i className={`fx-dot ${a.who}`} /><b>{WHO[a.who]}</b><span>{a.text}</span><time>{fmtTime(a.at)}</time></li>
              ))}
            </ol>
          ) : <p className="fx-small">When the engines run, every step shows up here as it happens.</p>}
        </section>
      </div>
    </section>
  );
}
