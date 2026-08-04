import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import HilTraceGraph from "@/components/HilTraceGraph";
import HilLoopRun from "@/components/HilLoopRun";
import { buildMonologue, type HilMoment, type HilReasoning } from "@/lib/hilMonologue";
// The literal brain. This is the SAME file the hil-reason edge function sends to the
// model (supabase/functions/_shared/human-intelligence/hil-system-prompt.ts), imported
// directly so what this page shows can never drift from what the server runs.
import { HIL_SYSTEM_PROMPT, HIL_VERSION } from "../../supabase/functions/_shared/human-intelligence/hil-system-prompt.ts";
import "../styles/apple.css";
import "./human-intelligence.css";

/* ============================================================================
   /human-intelligence — Apple product-page chrome, Medium's editorial ALIGNMENT
   only (narrow measure, alternating rhythm) — the type stays pure Apple (SF Pro
   Display), same as every other .apple page. Two tabs: Read (the write-up) and
   Lab (its own live view). In the Lab, a command's reasoning arrives once, then
   plays out as Braino's own first-person thinking, sentence by sentence, with
   the trace graph lighting up on the EXACT same stage index — one source of
   truth, two views, so they can never drift apart — landing on a plain summary:
   Goal, Work, Checks, Verdict.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type HilResult = {
  reasoning: HilReasoning;
  moment: HilMoment;
  meta: { model: string; elapsed_ms: number; hil_version: string };
};

const SAMPLES = [
  "open gmail",
  "show me more songs like this",
  "message saburi that i am running late",
  "i am so stressed, just delete these files",
  "summarize this and send it to my editor",
];

const CHECK_META: Array<{ key: keyof HilReasoning["checks"]; name: string; hint: string }> = [
  { key: "vague_referent", name: "Vague referent", hint: "this, it, that one" },
  { key: "unresolved_person", name: "Unresolved person", hint: "which contact?" },
  { key: "delivery_fork", name: "Delivery fork", hint: "tabs, or tell me here?" },
];

const ANCHORS = [
  { href: "#why", label: "Why" },
  { href: "#checks", label: "The checks" },
  { href: "#brain", label: "The prompt" },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.16 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// Hero art: the trace graph running a scripted loop, so the page opens already thinking.
function HeroDemo() {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setLit(5); return; }
    const seq = [1, 2, 3, 4, 5, 5, 5, 0];
    let i = 0;
    const t = setInterval(() => { setLit(seq[i]); i = (i + 1) % seq.length; }, 850);
    return () => clearInterval(t);
  }, []);
  return (
    <HilTraceGraph
      litCols={lit}
      stepCount={3}
      checks={{ vague_referent: false, unresolved_person: false, delivery_fork: true }}
      verdict="ask"
    />
  );
}

function ReadTab() {
  return (
    <>
      <article className="hil-read" id="why">
        <p className="hil-kicker apple-reveal">Why a brain, before hands</p>
        <h2 className="hil-h2 apple-reveal">Assistants guess. People check.</h2>
        <p className="hil-p apple-reveal">
          Most assistants treat every message as a brand-new, context-free command, and
          commit to a best guess every single time. Say <em>show me more songs like this</em>{" "}
          and they pick a meaning and go. Sometimes that is right. When it is wrong, you
          find out by watching tabs open that you did not want.
        </p>
        <p className="hil-p apple-reveal">
          The Human Intelligence Layer is the beat a person takes between hearing and
          doing. It is not a filter bolted onto the front of the brain. It <em>is</em> the
          brain: the outermost layer of Braino's system prompt, the first thing every
          command meets, and the thing that decides whether he moves or asks.
        </p>
        <blockquote className="hil-quote apple-reveal">One question. Not zero, not five.</blockquote>
        <p className="hil-p apple-reveal">
          Zero questions is the assistant that deletes the wrong files. Five is the one
          you stop using by Thursday. The whole design problem is knowing which single
          question is worth your attention, and that turns out to be a question about
          people, not about parsing.
        </p>
      </article>

      <article className="hil-read" id="checks">
        <p className="hil-kicker apple-reveal">How he decides</p>
        <h2 className="hil-h2 apple-reveal">Only three things count as unclear.</h2>
        <p className="hil-p apple-reveal">
          This is the load-bearing decision, so the list is deliberately closed. He is
          not allowed to invent a fourth reason to interrupt you.
        </p>
        <div className="hil-checkdefs apple-reveal">
          <div className="hil-checkdef"><b>One</b><span><strong>A vague referent.</strong> This, it, that one. He looks at what's actually on the user's screen first, since that resolves most of them on its own, and only if the screen can't answer it does it count as genuinely unclear.</span></div>
          <div className="hil-checkdef"><b>Two</b><span><strong>An unresolved person.</strong> A name a real contact list could match zero times, or twice. A wrong recipient is the worst guess there is, because you cannot take it back.</span></div>
          <div className="hil-checkdef"><b>Three</b><span><strong>A delivery fork.</strong> Two genuinely different ways to hand over the result: open tabs or tell me here, draft it or send it.</span></div>
          <div className="hil-checkdef yes"><b>Else</b><span><strong>Everything else proceeds.</strong> Hard is not unclear. Big is not unclear. A missing nice-to-have is not unclear.</span></div>
        </div>
      </article>

      <article className="hil-read">
        <p className="hil-kicker apple-reveal">Before he ever answers</p>
        <h2 className="hil-h2 apple-reveal">The Emotional Engine judges the doubt.</h2>
        <p className="hil-p apple-reveal">
          Before the model is called, a zero-cost word-cue reader labels the moment, and
          Braino's personality assembles around it, handed to the reasoning layer as part
          of the same prompt. That personality decides how much doubt is worth voicing:
          in a heavy moment the bar for asking drops, because guessing wrong when someone
          is fragile costs trust you do not get back. In a get-it-done moment the bar
          rises, because a needless question at full speed is just friction wearing a
          helpful face.{" "}
          <Link className="hil-link" to="/emotional-intelligence">Watch the engine itself run &rsaquo;</Link>
        </p>
      </article>

      <article className="hil-read" id="brain">
        <p className="hil-kicker apple-reveal">The source of truth</p>
        <h2 className="hil-h2 apple-reveal">This is not a diagram of the prompt. It is the prompt.</h2>
        <p className="hil-p apple-reveal">
          One file is the brain. The server imports it and sends exactly these bytes to
          the model. This page imports the same file and prints it. There is no second
          copy to fall out of sync.
        </p>
      </article>

      <section className="hil-brain-wrap apple-reveal">
        <div className="hil-brain">
          <div className="hil-brain-bar">
            <span /><span /><span />
            <i>hil-system-prompt &middot; v{HIL_VERSION} &middot; {HIL_SYSTEM_PROMPT.length.toLocaleString()} chars</i>
          </div>
          <pre>{HIL_SYSTEM_PROMPT}</pre>
        </div>
      </section>

      <section className="hil-read hil-end">
        <h2 className="hil-h2 apple-reveal">The brain is built. The hands come next.</h2>
        <p className="hil-p apple-reveal">
          This layer runs standalone today, on purpose, so the thinking can be tested
          before it is trusted with anything real. Once it holds up, it becomes the first
          thing every Braino surface does with every command you give it.
        </p>
        <div className="hil-cta-row apple-reveal">
          <Link className="hil-btn" to="/iomi">Meet Braino IOMI</Link>
          <Link className="hil-btn ghost" to="/emotional-intelligence">The Emotional Engine</Link>
        </div>
        <p className="hil-foot">Braino &middot; built by one person &middot; trybraino.com</p>
      </section>
    </>
  );
}

function LabTab() {
  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");
  const [stage, setStage] = useState(0);           // 0 idle · 1 sent · 2 goal · 3 plan · 4 checks · 5 verdict
  const [result, setResult] = useState<HilResult | null>(null);
  const [ranWith, setRanWith] = useState<{ command: string; context: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);

  const run = async (cmd?: string) => {
    const text = (cmd ?? command).trim();
    if (!text || running) return;
    if (cmd) setCommand(cmd);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setError(null);
    setResult(null);
    setRanWith(null);
    setRunning(true);
    setStage(1);
    setNote("");
    setNoteState("idle");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hil-reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ command: text, context: context.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error || "The reasoning call failed.");

      setResult(data as HilResult);
      // Snapshotted here, not read live in sendFeedback: the inputs re-enable once
      // running goes false, and editing them afterward must not relabel a note
      // that was written about THIS run's reasoning.
      setRanWith({ command: text, context: context.trim() });
      // Both the graph and the monologue read off this same `stage` number, so they
      // move together — the reveal cadence is presentation, the content is fixed.
      [2, 3, 4, 5].forEach((s, i) => {
        timers.current.push(window.setTimeout(() => setStage(s), 350 + i * 900));
      });
      timers.current.push(window.setTimeout(() => setRunning(false), 350 + 4 * 900));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reasoning call failed.");
      setStage(0);
      setRunning(false);
    }
  };

  const r = result?.reasoning ?? null;
  const beats = r && result ? buildMonologue(result.moment, r) : null;
  const verdictKnown = stage >= 5 && r;

  const sendFeedback = async () => {
    const text = note.trim();
    if (!text || !result || !ranWith || noteState === "sending") return;
    setNoteState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hil-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          command: ranWith.command, context: ranWith.context || undefined,
          momentId: result.moment.id, reasoning: result.reasoning, note: text,
        }),
      });
      if (!res.ok) throw new Error();
      setNoteState("sent");
    } catch {
      setNoteState("error");
    }
  };

  return (
    <section className="hil-lab-wrap">
      <p className="hil-kicker apple-reveal">The lab &middot; live</p>
      <h2 className="hil-h2 apple-reveal">Give him a command. Watch him think.</h2>
      <p className="hil-p apple-reveal">
        This is not a recording. Your command goes to the real brain, one model call, and
        what plays out below is the reasoning he would act on, in his own words. Nothing
        is routed anywhere: no tabs open, no messages send.
      </p>

      <div className="hil-lab">
        <div className="hil-lab-inputs">
          <input
            className="hil-cmd"
            type="text"
            value={command}
            placeholder="Tell Braino to do something"
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            disabled={running}
          />
          <textarea
            className="hil-ctx"
            value={context}
            placeholder="Optional context: what is on screen, what came before"
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            disabled={running}
          />
          <div className="hil-lab-row">
            <button className="hil-run" onClick={() => run()} disabled={running || !command.trim()}>
              {running ? "Thinking" : "Run the brain"}
            </button>
            {running && <span className="hil-pulse" aria-hidden="true" />}
          </div>
          <div className="hil-samples">
            {SAMPLES.map((s) => (
              <button key={s} className="hil-sample" onClick={() => run(s)} disabled={running}>{s}</button>
            ))}
          </div>
        </div>

        {error && <div className="hil-error" role="alert">{error}</div>}

        {/* Layout A (the same split box as the Braino/IOMI class picker): the
            graph on the left, the thinking in the panel on the right, one
            hairline dividing them. One stage number drives both, so the graph
            and the monologue can never fall out of step. */}
        <div className="hil-a">
          <div className="hil-trace-col">
            <HilTraceGraph
              vertical
              litCols={stage}
              stepCount={r?.steps.length ?? 3}
              checks={stage >= 4 && r ? r.checks : null}
              verdict={stage >= 5 && r ? r.verdict : null}
            />
          </div>

          <div className="hil-think-col" aria-live="polite">
            {stage === 1 && !beats && <p className="hil-think-wait">Let me actually think about this before I do anything&hellip;</p>}
            {beats && [2, 3, 4, 5].map((s, i) => stage >= s && (
              <div className="hil-think-beat" key={s}>
                {beats[i].map((line, j) => <p key={j}>{line}</p>)}
              </div>
            ))}
            {stage === 0 && !running && <p className="hil-think-wait">His thinking will play out here, next to the graph.</p>}
          </div>
        </div>

        {/* The plain summary: goal, work, checks, verdict. */}
        {stage >= 2 && r && (
          <div className="hil-summary">
            <div className="hil-sum-row">
              <span className="hil-sum-k">Goal</span>
              <p className="hil-sum-goal">{r.restated_goal}</p>
            </div>
            {stage >= 3 && (
              <div className="hil-sum-row">
                <span className="hil-sum-k">Work</span>
                <ol className="hil-steps">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </div>
            )}
            {stage >= 4 && (
              <div className="hil-sum-row">
                <span className="hil-sum-k">Checks</span>
                <div className="hil-chips">
                  {CHECK_META.map((c) => (
                    <span key={c.key} className={"hil-chip " + (r.checks[c.key] ? "fired" : "clear")}>
                      {r.checks[c.key] ? "▲" : "●"} {c.name}<i>{c.hint}</i>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {verdictKnown && (
              <div className={"hil-sum-row hil-verdict " + r.verdict}>
                <span className="hil-sum-k">Verdict</span>
                {r.verdict === "ask" ? (
                  <p className="hil-question">&ldquo;{r.clarifying_question}&rdquo;</p>
                ) : (
                  <p className="hil-sum-goal">Proceed &mdash; {r.action}</p>
                )}
              </div>
            )}
            {verdictKnown && result && (
              <div className="hil-meta">{result.meta.model} &middot; {result.meta.elapsed_ms}ms &middot; hil v{result.meta.hil_version}</div>
            )}
          </div>
        )}

        {/* Fine-tuning notes — not automated, just a durable log of what should
            change about this specific run, to iterate the prompt by hand against. */}
        {verdictKnown && (
          <div className="hil-feedback">
            <p className="hil-feedback-k">What should change about this?</p>
            <textarea
              className="hil-feedback-box"
              value={note}
              onChange={(e) => { setNote(e.target.value); if (noteState !== "idle") setNoteState("idle"); }}
              placeholder="e.g. this should have asked instead of just doing it, or the wrong thing was flagged as unclear"
              rows={2}
            />
            <div className="hil-feedback-row">
              <button className="hil-feedback-btn" onClick={sendFeedback} disabled={!note.trim() || noteState === "sending"}>
                {noteState === "sending" ? "Saving" : "Save note"}
              </button>
              {noteState === "sent" && <span className="hil-feedback-status ok">Saved.</span>}
              {noteState === "error" && <span className="hil-feedback-status err">Couldn't save, try again.</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function HumanIntelligence() {
  const [tab, setTab] = useState<"read" | "lab" | "loop">("read");
  const reveal = useReveal();

  return (
    <div className="apple hil" ref={reveal} style={{ ["--ap-accent" as string]: "var(--ap-blue)" }}>
      <IomiNotch />

      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Human Intelligence</span>
          <div className="an-links">
            {tab === "read" && ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <a className="hil-tryit" href="#tabs" onClick={(e) => { e.preventDefault(); setTab("lab"); }}>Try it</a>
          </div>
        </div>
      </nav>

      <header className="apple-hero hil-hero">
        <p className="apple-eyebrow">The Human Intelligence Layer</p>
        <h1 className="apple-display">He thinks <span className="tone">before</span> he acts.</h1>
        <p className="apple-subhead">
          Every command meets the same reasoning first. This is that brain, and a place
          to watch it think.
        </p>
        <div className="hil-hero-art apple-reveal"><HeroDemo /></div>
      </header>

      <div className="hil-tabs" id="tabs">
        <button className={tab === "read" ? "on" : ""} onClick={() => setTab("read")}>Read</button>
        <button className={tab === "lab" ? "on" : ""} onClick={() => setTab("lab")}>Lab</button>
        <button className={tab === "loop" ? "on" : ""} onClick={() => setTab("loop")}>Loop</button>
      </div>

      {tab === "read" ? <ReadTab /> : tab === "lab" ? <LabTab /> : <HilLoopRun />}
    </div>
  );
}
