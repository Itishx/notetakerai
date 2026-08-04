import { useState } from "react";
import type { Moment } from "@/lib/emotional-engine-viz";

/* ============================================================================
   BrainoWholeMind — both halves of Braino on one message.

   The thinking half (the Human Intelligence Layer) decides WHAT to do: what the
   person actually wants, what he would do next, and whether anything is unclear
   enough to be worth a question. The feeling half (the Emotional Engine) decides
   HOW IT SOUNDS: which moment this is, who leads, and the words that come out.

   Both run on the same message, side by side, so the two halves can be judged
   together instead of one at a time. Same two public endpoints the other tabs
   use, called in parallel.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type Reasoning = {
  restated_goal: string;
  steps: string[];
  checks: { vague_referent: boolean; unresolved_person: boolean; delivery_fork: boolean };
  clarifying_question: string | null;
  verdict: "proceed" | "ask";
  action: string;
};

type ThinkResult = { reasoning: Reasoning; meta: { elapsed_ms: number } };

type FeelResult = {
  reply: string;
  moment: { id: Moment; label: string; intensity: number; how: string };
  personality: { traits: Array<{ id: string; name: string; leading: boolean }>; charm: { level: string }; steering_line: string };
  tells: Array<{ matched: string; why: string }>;
  meta: { elapsed_ms: number };
};

const SAMPLES = [
  "i'm so behind on everything, can you just summarise this page for me",
  "reply to this email and tell them i'll have it friday",
  "i got the job!! open spotify and put something on",
];

function post<T>(fn: string, body: unknown): Promise<T> {
  return fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string })?.error || `${fn} failed.`);
    return data as T;
  });
}

export default function BrainoWholeMind() {
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [think, setThink] = useState<ThinkResult | null>(null);
  const [feel, setFeel] = useState<FeelResult | null>(null);

  const run = async (text?: string) => {
    const t = (text ?? message).trim();
    if (!t || running) return;
    if (text !== undefined) setMessage(text);
    setRunning(true); setError(null); setThink(null); setFeel(null);
    // Both halves at once: they are independent, so there is no reason to wait.
    const [thinking, feeling] = await Promise.allSettled([
      post<ThinkResult>("hil-reason", { command: t }),
      post<FeelResult>("braino-reply", { message: t }),
    ]);
    if (thinking.status === "fulfilled") setThink(thinking.value);
    if (feeling.status === "fulfilled") setFeel(feeling.value);
    if (thinking.status === "rejected" && feeling.status === "rejected") {
      setError(thinking.reason instanceof Error ? thinking.reason.message : "Both halves failed.");
    }
    setRunning(false);
  };

  const checks = think?.reasoning.checks;
  const firedChecks = checks
    ? [
        checks.vague_referent && "a vague this/that",
        checks.unresolved_person && "an unresolved person",
        checks.delivery_fork && "two ways to deliver it",
      ].filter(Boolean) as string[]
    : [];

  return (
    <section className="hil-lab-wrap">
      <p className="hil-kicker apple-reveal">The whole mind &middot; live</p>
      <h2 className="hil-h2 apple-reveal">One message. Both halves of him.</h2>
      <p className="hil-p apple-reveal">
        The left side is the thinking: what he understood you to want, what he would
        actually do, and whether anything is unclear enough to be worth asking about.
        The right side is the feeling: the moment he read, who spoke first, and the
        words that came out. Same message, both engines, at the same time.
      </p>

      <div className="hil-lab">
        <div className="hil-lab-inputs">
          <input
            className="hil-cmd"
            type="text"
            value={message}
            placeholder="Say something that is both a feeling and a task"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            disabled={running}
          />
          <div className="hil-lab-row">
            <button className="hil-run" onClick={() => run()} disabled={running || !message.trim()}>
              {running ? "Both halves running" : "Run both"}
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

        {(think || feel) && (
          <div className="ewm-split">
            <div className="ewm-half think">
              <p className="ewm-half-k">What he thinks</p>
              {!think ? <p className="ewm-missing">The thinking half did not answer.</p> : (
                <>
                  <p className="ewm-goal">{think.reasoning.restated_goal}</p>
                  <ol className="hil-steps">
                    {think.reasoning.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                  <p className={"ewm-verdict " + think.reasoning.verdict}>
                    {think.reasoning.verdict === "ask"
                      ? `Worth asking first: “${think.reasoning.clarifying_question}”`
                      : think.reasoning.action}
                  </p>
                  {firedChecks.length > 0 && (
                    <p className="ewm-checks">Unclear: {firedChecks.join(", ")}.</p>
                  )}
                </>
              )}
            </div>

            <div className="ewm-half feel">
              <p className="ewm-half-k">What he says</p>
              {!feel ? <p className="ewm-missing">The feeling half did not answer.</p> : (
                <>
                  <p className="ewm-reply">{feel.reply}</p>
                  <p className="ewm-moment">
                    <b>{feel.moment.label}</b> moment, strength {feel.moment.intensity} of 3,
                    charm {feel.personality.charm.level}
                  </p>
                  <p className="ewm-leads">
                    Led by {feel.personality.traits.filter((t) => t.leading).map((t) => t.name.split(",")[0].toLowerCase()).join(", ") || "his natural order"}.
                  </p>
                  <p className={"ewm-tells " + (feel.tells.length ? "bad" : "good")}>
                    {feel.tells.length === 0
                      ? "Tell check: clean."
                      : `Tell check: ${feel.tells.map((t) => `“${t.matched}”`).join(", ")}`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {(think || feel) && (
          <div className="hil-meta">
            thinking {think?.meta.elapsed_ms ?? "n/a"}ms &middot; feeling {feel?.meta.elapsed_ms ?? "n/a"}ms &middot; run in parallel
          </div>
        )}
      </div>
    </section>
  );
}
