import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import "./braino-classes.css";
import {
  MOMENT_CUES,
  MOMENT_LABEL,
  MOMENT_ORDER,
  orderTraitsForMoment,
  steeringLine,
  type Moment,
} from "@/lib/emotional-engine-viz";
import "./visual-emotional-engine.css";

/* ============================================================================
   /Vig — Visual Emotional Engine. Not documentation, a live diagram: pick a
   moment and watch Braino's actual trait-ordering logic run in front of you
   (ported straight from engine.ts + moments.ts, see src/lib/emotional-engine-viz.ts).
   One thought — the user's message — becomes a moment, the moment reorders
   twelve traits, the reordered traits become the system prompt.
   ============================================================================ */

const MOMENT_NAV: [Moment, string][] = MOMENT_ORDER.map((m) => [m, MOMENT_LABEL[m].replace(/^an? /, "")]);

export default function VisualEmotionalEngine() {
  const [moment, setMoment] = useState<Moment>("neutral");

  const ordered = useMemo(() => orderTraitsForMoment(moment), [moment]);
  const leadCount = useMemo(() => {
    if (moment === "neutral") return 0;
    const lead = new Set(ordered.slice(0, 4).filter((t) => t.leadsOn.includes(moment)));
    return lead.size;
  }, [ordered, moment]);
  const steer = useMemo(() => steeringLine(moment), [moment]);

  return (
    <div className="bos vig" style={{ ["--accent" as string]: "#d97706" }}>
      <IomiNotch />

      <header className="bos-hero quote">
        <div className="bos-wrap">
          <div className="bos-hero-split">
            <div className="bos-hero-copy">
              <div className="bos-pill"><i />the emotional engine &middot; visualized</div>
              <h1 className="bos-qtitle">
                One thought walks in. <em>Watch what it becomes.</em>
              </h1>
              <p className="bos-qsub">
                This isn&rsquo;t a diagram of the idea. It&rsquo;s the actual routing logic Braino
                runs on every message &mdash; pick a moment below and watch his twelve traits
                reorder themselves in real time, the same way they do in production.
              </p>
            </div>
            <div className="bos-art"><div className="bos-orb" /></div>
          </div>
        </div>
      </header>

      <hr className="bos-rule" />

      {/* ---------- Step 1: the thought ---------- */}
      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">Step 1 &middot; the thought</div>
          <h2 className="bos-h2">A message comes in.<br /><em>No AI call yet.</em></h2>
          <p className="bos-lede">
            Before any model is asked to think, a word-cue reader called <code>detectMoment()</code>{" "}
            scans the message for phrases &mdash; no extra latency, no extra cost. Pick the moment
            it would detect:
          </p>
        </div>
      </section>

      <section className="bos-sec vig-picker-sec">
        <div className="bos-wrap">
          <div className="vig-picker">
            {MOMENT_NAV.map(([m, label]) => (
              <button
                key={m}
                className={"vig-chip" + (m === moment ? " active" : "") + (m === "crisis" ? " crisis" : "")}
                onClick={() => setMoment(m)}
              >
                {label}
              </button>
            ))}
          </div>
          {moment !== "neutral" && (
            <div className="vig-cues">
              <span className="vig-cues-label">cues it listens for</span>
              {MOMENT_CUES[moment].map((c) => (
                <span className="vig-cue" key={c}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="bos-rule" />

      {/* ---------- Step 2: the reorder ---------- */}
      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">Step 2 &middot; the reorder</div>
          <h2 className="bos-h2">
            {moment === "neutral" ? (
              <>Nothing detected.<br /><em>The default order holds.</em></>
            ) : (
              <>{leadCount} traits move to the front.<br /><em>The rest recede, but stay present.</em></>
            )}
          </h2>
          <p className="bos-lede">
            Twelve traits make up his mind, always in this priority order by default. A detected
            moment doesn&rsquo;t swap traits in or out &mdash; it just decides who speaks first.
          </p>
        </div>
      </section>

      <section className="bos-sec vig-stack-sec">
        <div className="bos-wrap">
          <div className="vig-stack">
            {ordered.map((t, i) => {
              const leading = moment !== "neutral" && t.leadsOn.includes(moment) && i < 4;
              return (
                <div
                  className={"vig-trait" + (leading ? " leading" : "") + (t.alwaysOn ? " always" : "")}
                  key={t.id}
                  style={{ transitionDelay: `${i * 24}ms` }}
                >
                  <div className="vig-trait-rank">{i + 1}</div>
                  <div className="vig-trait-body">
                    <div className="vig-trait-name">
                      {t.name}
                      {leading && <span className="vig-trait-tag">leads now</span>}
                      {!t.alwaysOn && <span className="vig-trait-tag opt">opt-in</span>}
                    </div>
                    <div className="vig-trait-sum">{t.summary}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      {/* ---------- Step 3: the steering line + assembled prompt ---------- */}
      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">Step 3 &middot; the assembly</div>
          <h2 className="bos-h2">Every trait writes its part.<br /><em>One block gets handed to the model.</em></h2>
          <p className="bos-lede">
            If a moment was detected, one steering sentence is generated and placed first. Then
            each trait in the new order renders its own prose &mdash; in plain English, not code
            &mdash; and they&rsquo;re joined into a single personality block.
          </p>
        </div>
      </section>

      <section className="bos-sec vig-assemble-sec">
        <div className="bos-wrap">
          <div className="vig-terminal">
            <div className="vig-terminal-bar"><span /><span /><span /></div>
            <div className="vig-terminal-body">
              {steer ? (
                <div className="vig-line steer">{steer}</div>
              ) : (
                <div className="vig-line dim">// neutral moment — no steering line, natural order plays</div>
              )}
              {ordered.slice(0, 6).map((t) => (
                <div className="vig-line" key={t.id}>
                  <span className="vig-line-id">[{t.id}]</span> {t.summary}
                </div>
              ))}
              <div className="vig-line dim">// + {Math.max(ordered.length - 6, 0)} more traits, joined into one block</div>
            </div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">What this isn&rsquo;t</div>
          <div className="bos-notx">
            <div className="bos-notx-row no"><b>Not</b><span>one paragraph of "be nice and helpful" pasted into every request.</span></div>
            <div className="bos-notx-row no"><b>Not</b><span>a second AI call to figure out how to feel &mdash; the routing above is plain word-matching, instant and free.</span></div>
            <div className="bos-notx-row no"><b>Not</b><span>traits that vanish when they're not leading &mdash; they just step back and stay present.</span></div>
            <div className="bos-notx-row yes"><b>Just</b><span>twelve hand-written playbooks, reordered by what's actually happening to you right now.</span></div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">One engine.<br /><em>Soon, three different hearts.</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            This is the shared engine every class runs on today. Braino Saburi &mdash; the
            companion class &mdash; is the first to get his own, distinct system prompt, built
            from the ground up for one thing: being someone you can feel.
          </p>
          <div className="bos-cta-row">
            <Link className="bos-btn" to="/saburi">Meet Braino Saburi</Link>
            <Link className="bos-btn ghost" to="/journal/emotional-engine">Read the full write-up</Link>
          </div>
        </div>
        <div className="bos-foot">Braino &middot; built by one person &middot; trybraino.com</div>
      </section>
    </div>
  );
}
