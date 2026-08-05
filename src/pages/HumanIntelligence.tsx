import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { WorldPreset } from "@/lib/hilLoopWorld";
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
          {/* Creator-only: the page itself refuses anyone else, so the link is
              harmless here and saves hunting for the URL mid-tuning. */}
          <Link className="hil-btn ghost" to="/engine-log">Run log</Link>
        </div>
        <p className="hil-foot">Braino &middot; built by one person &middot; trybraino.com</p>
      </section>
    </>
  );
}


// The Lab tab was retired. It ran one call and showed what he WOULD do, which
// the Loop already demonstrates and then some: the Loop narrates its reasoning
// in first person every turn, asks instead of guessing when the screen holds no
// answer, judges each step before the next, and stops at the gate. The claim
// Lab made, the Loop makes while actually finishing the job.
export default function HumanIntelligence() {
  const [tab, setTab] = useState<"read" | "loop">("read");
  const reveal = useReveal();

  // Arriving from /commands: ?run=<command>&preset=<world>. The Loop tab opens
  // itself and the command runs, so a test is one click from the corpus.
  const [params] = useSearchParams();
  const runParam = params.get("run");
  const autoRun = useMemo(
    () => (runParam ? { command: runParam, preset: (params.get("preset") || "empty") as WorldPreset } : null),
    [runParam, params],
  );
  useEffect(() => { if (autoRun) setTab("loop"); }, [autoRun]);

  return (
    <div className="apple hil" ref={reveal} style={{ ["--ap-accent" as string]: "var(--ap-blue)" }}>
      <IomiNotch />

      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Human Intelligence</span>
          <div className="an-links">
            {tab === "read" && ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <a className="hil-tryit" href="#tabs" onClick={(e) => { e.preventDefault(); setTab("loop"); }}>Try it</a>
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
        <button className={tab === "loop" ? "on" : ""} onClick={() => setTab("loop")}>Loop</button>
      </div>

      {tab === "read" ? <ReadTab /> : <HilLoopRun autoRun={autoRun} />}
    </div>
  );
}
