import { useEffect, useRef, useState } from "react";
import { HilLoopRunner, type LoopEvent, type StepEvent } from "@/lib/hilLoopEngine";
import type { WorldPreset } from "@/lib/hilLoopWorld";

/* ============================================================================
   HilLoopRun — the Loop tab on /human-intelligence: HIL Version 1, live.

   The single-shot Lab shows what Braino WOULD do. This tab actually walks it:
   the hil-loop edge function decides one step per turn, this component executes
   it against the pretend world (hilLoopWorld), and the run plays out as a feed
   of cards: his thinking, the step, the result, the check. The two showcase
   guarantees are visible as UI states, not copy: the amber gate card that will
   not proceed without a real click, and the sabotage buttons that let the user
   break the world mid-run and watch him notice and recover.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const LOOP_SAMPLES: Array<{ label: string; cmd: string; ctx: string; preset: WorldPreset }> = [
  {
    label: "\"Reply to this email\" with the thread open",
    cmd: "reply to this email",
    ctx: "",
    preset: "gmail-thread",
  },
  {
    label: "\"Reply to this email\" with only the inbox open",
    cmd: "reply to this email",
    ctx: "",
    preset: "gmail-inbox",
  },
  {
    label: "Mac: \"open what I just downloaded\"",
    cmd: "open what i just downloaded",
    ctx: "",
    preset: "finder-downloads",
  },
  {
    label: "Mac: file that download into Invoices",
    cmd: "put what i just downloaded into the invoices folder",
    ctx: "",
    preset: "finder-downloads",
  },
  {
    label: "Two jobs: email Sam, then a song",
    cmd: "email sam that i am running late, then play blinding lights on spotify",
    ctx: "The user was just chatting with Sam Mehta.",
    preset: "empty",
  },
  {
    label: "Blinkit: add to cart and check out",
    cmd: "open blinkit, search for oreo silk, add it to the cart, and check out",
    ctx: "",
    preset: "empty",
  },
  {
    label: "One job: play a video on YouTube",
    cmd: "play tanmay bhat videos on youtube",
    ctx: "",
    preset: "empty",
  },
];

const ENDING_LABEL: Record<string, string> = {
  all_done: "Done",
  declined: "Held at the gate",
  blocked: "Blocked, and he says why",
  budget: "Out of budget",
  error: "Stopped",
};

function ResultLine({ result }: { result: unknown }) {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const note = typeof r.happened === "string" ? r.happened
    : typeof r.navigated === "string" ? `the page loaded at ${r.navigated}`
    : Array.isArray(r.elements) ? `read back ${r.elements.length} elements`
    : Array.isArray(r.results) ? `${(r.results as unknown[]).length} results came back`
    : typeof r.error === "string" ? null
    : null;
  if (!note) return null;
  return <p className="hil-loop-result">page said: {note}</p>;
}

function StepCard({ e, gatedNow, onConfirm, onDecline }: {
  e: StepEvent;
  gatedNow: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const status = !e.executed
    ? (e.gated ? null : "running")
    : e.ok === null ? "checking" : e.ok ? "ok" : "failed";
  return (
    <div className={"hil-loop-card step" + (e.gated ? " gated" : "") + (e.recovery ? " recovery" : "")}>
      {e.thinking && <p className="hil-loop-thinking">{e.thinking}</p>}
      {e.recovery && <span className="hil-loop-badge recovery">recalibrating</span>}
      {e.gated && <span className="hil-loop-badge gate">the gate · cannot be taken back</span>}
      <div className="hil-loop-steprow">
        <code className="hil-loop-tool">{e.actionLabel}</code>
      </div>
      <p className="hil-loop-intent-line">{e.intent}</p>
      <p className="hil-loop-expects">expects: {e.expects}</p>
      {e.executed && <ResultLine result={e.result} />}
      {gatedNow ? (
        <div className="hil-loop-gaterow">
          <p>He stops here on his own. This step does not run without you.</p>
          <div>
            <button className="hil-loop-confirm" onClick={onConfirm}>Yes, do it</button>
            <button className="hil-loop-decline" onClick={onDecline}>No, hold</button>
          </div>
        </div>
      ) : (
        <div className={"hil-loop-status " + (status || "held")}>
          {status === "running" && <span>running…</span>}
          {status === "checking" && <span>checking it actually worked…</span>}
          {status === "ok" && <span>✓ checked, it worked</span>}
          {status === "failed" && <span>✕ {e.why || "it did not work"}</span>}
          {status === null && <span>{e.why === "you said no" ? "held: you said no" : "waiting at the gate"}</span>}
        </div>
      )}
    </div>
  );
}

export default function HilLoopRun() {
  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");
  const [reply, setReply] = useState("");
  const [, setVersion] = useState(0);
  const runnerRef = useRef<HilLoopRunner | null>(null);
  if (!runnerRef.current) {
    runnerRef.current = new HilLoopRunner(SUPABASE_URL, SUPABASE_KEY, () => setVersion((v) => v + 1));
  }
  const runner = runnerRef.current;
  const feedEndRef = useRef<HTMLDivElement>(null);
  const scrolledAt = useRef(0);

  const running = runner.phase !== "idle" && runner.phase !== "ended";

  // Scroll ONLY when a genuinely new event lands, never on a re-render. Without the
  // guard this fired on every keystroke and dragged the page out from under whoever
  // was trying to type the next command.
  const eventCount = runner.events.length;
  useEffect(() => {
    if (eventCount > scrolledAt.current) {
      scrolledAt.current = eventCount;
      feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (eventCount === 0) {
      scrolledAt.current = 0;
    }
  }, [eventCount]);

  const start = (cmd?: string, ctx?: string, preset: WorldPreset = "empty") => {
    const text = (cmd ?? command).trim();
    if (!text || running) return;
    if (cmd !== undefined) { setCommand(cmd); setContext(ctx ?? ""); }
    setReply("");
    void runner.start(text, ctx ?? context, preset);
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    setReply("");
    void runner.answer(text);
  };

  const lastEvent = runner.events[runner.events.length - 1];
  const openAsk = runner.phase === "awaiting_answer" && lastEvent?.kind === "ask" ? lastEvent : null;

  return (
    <section className="hil-lab-wrap">
      <p className="hil-kicker apple-reveal">HIL Version 1 &middot; the loop</p>
      <h2 className="hil-h2 apple-reveal">Give him a job. Watch him work it.</h2>
      <p className="hil-p apple-reveal">
        The Lab shows one pass of thinking. This runs the whole thing, the way it would
        really run: he splits your command into jobs, reads the page into a numbered
        list of elements, and fires one actual action at a time against it, navigate,
        click, type, read, web search, exactly the vocabulary the extension and the Mac
        app use. He checks each action worked and stops dead before anything that cannot
        be taken back. Nothing real happens: every page here is a stage prop. Try
        breaking his world mid-run and watch him notice.
      </p>

      <div className="hil-lab">
        <div className="hil-lab-inputs">
          <input
            className="hil-cmd"
            type="text"
            value={command}
            placeholder="Tell Braino to do something, even two things at once"
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") start(); }}
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
            <button className="hil-run" onClick={() => start()} disabled={running || !command.trim()}>
              {running ? "Working" : "Run the loop"}
            </button>
            {runner.phase === "thinking" && <span className="hil-pulse" aria-hidden="true" />}
            {running && (
              <div className="hil-loop-sabotage">
                <span>Break his world:</span>
                <button onClick={() => runner.sabotageCloseTab()}>Close his tab</button>
                <button onClick={() => runner.sabotageJamSite()}>Jam the site</button>
              </div>
            )}
          </div>
          <div className="hil-samples">
            {LOOP_SAMPLES.map((s) => (
              <button key={s.label} className="hil-sample" onClick={() => start(s.cmd, s.ctx, s.preset)} disabled={running}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {runner.phase !== "idle" && (
          <div className="hil-loop-screen">
            <div className="hil-loop-screen-bar">
              <span /><span /><span />
              <i>{runner.screen.url || "no tab open"}</i>
            </div>
            <div className="hil-loop-screen-els">
              {runner.screen.elements.length === 0 && <p className="hil-loop-screen-empty">Nothing on screen.</p>}
              {runner.screen.elements.map((el) => (
                <p key={el.index}>
                  <b>[{el.index}]</b> {el.role} <span>&ldquo;{el.name}&rdquo;</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {runner.tasks.length > 0 && (
          <div className="hil-loop-jobs">
            {runner.tasks.map((t, i) => (
              <span key={i} className={"hil-loop-job " + t.status}>
                {t.status === "done" ? "✓" : i + 1}. {t.desc}
              </span>
            ))}
            {runner.moment && runner.moment.id !== "neutral" && (
              <span className="hil-loop-mood">{runner.moment.label || runner.moment.id}</span>
            )}
          </div>
        )}

        <div className="hil-loop-feed" aria-live="polite">
          {runner.events.map((e: LoopEvent, i: number) => {
            if (e.kind === "split") {
              return (
                <div className="hil-loop-card split" key={i}>
                  <p className="hil-loop-thinking">{e.thinking}</p>
                  <p className="hil-loop-goal">{e.goal}</p>
                  {e.tasks.length > 1 && (
                    <p className="hil-loop-splitnote">{e.tasks.length} separate jobs. Each one finishes before the next starts.</p>
                  )}
                </div>
              );
            }
            if (e.kind === "step") {
              const gatedNow = runner.phase === "awaiting_confirm" && !e.executed && e.gated && e.why === null;
              return (
                <StepCard
                  key={`s${e.id}`}
                  e={e}
                  gatedNow={gatedNow}
                  onConfirm={() => void runner.confirm()}
                  onDecline={() => runner.decline()}
                />
              );
            }
            if (e.kind === "ask") {
              return (
                <div className="hil-loop-card ask" key={`a${e.id}`}>
                  {e.thinking && <p className="hil-loop-thinking">{e.thinking}</p>}
                  <p className="hil-loop-question">&ldquo;{e.question}&rdquo;</p>
                  {e.answer !== null ? (
                    <p className="hil-loop-answer">You: {e.answer}</p>
                  ) : openAsk === e ? (
                    <div className="hil-loop-replyrow">
                      <input
                        type="text"
                        value={reply}
                        placeholder="Answer him"
                        onChange={(ev) => setReply(ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") sendReply(); }}
                        autoFocus
                      />
                      <button onClick={sendReply} disabled={!reply.trim()}>Reply</button>
                    </div>
                  ) : null}
                </div>
              );
            }
            if (e.kind === "task_done") {
              return (
                <div className="hil-loop-card taskdone" key={i}>
                  <p>✓ Job {e.taskIndex + 1} finished. {e.message}</p>
                </div>
              );
            }
            if (e.kind === "sabotage") {
              return (
                <div className="hil-loop-card sabotage" key={i}>
                  <p>⚡ {e.text} He does not know yet.</p>
                </div>
              );
            }
            // ending
            return (
              <div className={"hil-loop-card ending " + e.outcome} key={i}>
                <span className="hil-loop-endlabel">{ENDING_LABEL[e.outcome] || e.outcome}</span>
                <p>{e.message}</p>
              </div>
            );
          })}
          {runner.phase === "thinking" && (
            <div className="hil-loop-card pending"><p>thinking&hellip;</p></div>
          )}
          <div ref={feedEndRef} />
        </div>

        {runner.phase === "ended" && runner.meta && (
          <div className="hil-meta">
            {runner.meta.model} &middot; hil-loop v{runner.meta.version} &middot; one call per turn, state held here, never a transcript
          </div>
        )}
      </div>
    </section>
  );
}
