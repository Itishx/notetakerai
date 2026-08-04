import { useEffect, useRef, useState } from "react";
import EmotionNetwork from "@/components/EmotionNetwork";
import type { Moment } from "@/lib/emotional-engine-viz";

/* ============================================================================
   BrainoReplyLab — the Reply tab on /emotional-intelligence.

   The retired Lab tab showed which traits WOULD lead. This one makes him talk,
   then shows the whole reasoning behind how he talked: the moment he read and
   how he read it, which traits led, the exact steering sentence, where the charm
   dial sat, and a tell-scan of his own reply against his own banned-phrase lists.

   The tell scan is the point. "He never says What's on your mind?" stops being a
   hope in a prompt and becomes a check that either passes or names the phrase.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type Tell = { category: string; matched: string; why: string };

type ReplyResult = {
  reply: string;
  moment: {
    id: Moment; label: string; intensity: number;
    how: "cues" | "model" | "none";
    cueHits: Array<{ moment: string; matched: string; weight: number }>;
    cueSaid: Moment;
  };
  personality: {
    leads: string[];
    traits: Array<{ id: string; name: string; summary: string; leading: boolean }>;
    steering_line: string;
    charm: { level: string; note: string; present: boolean };
    settings: Record<string, unknown>;
    core_chars: number;
    trait_count: number;
  };
  tells: Tell[];
  meta: { model: string; elapsed_ms: number; charm_off: boolean };
};

const SAMPLES = [
  { label: "A plain hello", text: "hey" },
  { label: "Quietly not okay", text: "i don't really know why but i've just been feeling off all week" },
  { label: "A win", text: "i got the job!!" },
  { label: "Just do the thing", text: "summarise this page for me" },
  { label: "Teasing him", text: "you're kind of adorable you know that" },
];

// autoRun arrives from /commands through the URL, fired once per command.
export default function BrainoReplyLab({ autoRun }: { autoRun?: string | null }) {
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [main, setMain] = useState<ReplyResult | null>(null);
  const [compare, setCompare] = useState<ReplyResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [swearing, setSwearing] = useState(false);
  const lastSent = useRef("");

  const call = async (text: string, charmOff: boolean): Promise<ReplyResult> => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ message: text, charmOff, settings: { swearing } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string })?.error || "The reply call failed.");
    return data as ReplyResult;
  };

  const run = async (text?: string) => {
    const t = (text ?? message).trim();
    if (!t || running) return;
    if (text !== undefined) setMessage(text);
    setRunning(true);
    setError(null);
    setMain(null);
    setCompare(null);
    lastSent.current = t;
    try {
      setMain(await call(t, false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reply call failed.");
    } finally {
      setRunning(false);
    }
  };

  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!autoRun || firedFor.current === autoRun) return;
    firedFor.current = autoRun;
    void run(autoRun);
    // run is recreated every render; depending on it would refire the command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // The A/B: same message, charm trait removed, so the difference is visible
  // instead of asserted.
  const runCompare = async () => {
    if (!lastSent.current || comparing) return;
    setComparing(true);
    try {
      setCompare(await call(lastSent.current, true));
    } catch {
      /* comparison is a bonus, never blocks the main result */
    } finally {
      setComparing(false);
    }
  };

  return (
    <section className="hil-lab-wrap">
      <p className="hil-kicker apple-reveal">The reply &middot; live</p>
      <h2 className="hil-h2 apple-reveal">Say something. Watch him answer, and see why he answered like that.</h2>
      <p className="hil-p apple-reveal">
        This is the real engine, not a recording. Your message is read for its emotional
        moment, his personality is assembled around that moment, and he answers. Underneath
        the answer is the whole reason it came out that way, including an automatic check of
        his own reply against the phrases he is never allowed to say.
      </p>

      <div className="hil-lab">
        <div className="hil-lab-inputs">
          <input
            className="hil-cmd"
            type="text"
            value={message}
            placeholder="Say something to him"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            disabled={running}
          />
          <div className="hil-lab-row">
            <button className="hil-run" onClick={() => run()} disabled={running || !message.trim()}>
              {running ? "Thinking" : "Send it"}
            </button>
            {running && <span className="hil-pulse" aria-hidden="true" />}
            <label className="eir-toggle">
              <input type="checkbox" checked={swearing} onChange={(e) => setSwearing(e.target.checked)} disabled={running} />
              <span>Let him swear</span>
            </label>
          </div>
          <div className="hil-samples">
            {SAMPLES.map((s) => (
              <button key={s.label} className="hil-sample" onClick={() => run(s.text)} disabled={running}>{s.label}</button>
            ))}
          </div>
        </div>

        {error && <div className="hil-error" role="alert">{error}</div>}

        {main && (
          <>
            <div className="eir-reply">
              <span className="hil-sum-k">He says</span>
              <p>{main.reply}</p>
            </div>

            {/* The check that makes the ban real. */}
            <div className={"eir-tells " + (main.tells.length ? "bad" : "good")}>
              <span className="hil-sum-k">Human or AI</span>
              {main.tells.length === 0 ? (
                <p className="eir-tells-clean">Clean. No bot-tells, no banned openers, no dashes.</p>
              ) : (
                <ul>
                  {main.tells.map((t, i) => (
                    <li key={i}>
                      <code>&ldquo;{t.matched}&rdquo;</code>
                      <span>{t.why}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="eir-grid">
              <div className="eir-card">
                <span className="hil-sum-k">The moment he read</span>
                <p className="eir-moment-name">{main.moment.label}</p>
                <p className="eir-moment-strength">Strength {main.moment.intensity} of 3</p>
                {main.moment.how === "cues" && (
                  <p className="eir-how">
                    Caught by his word cues:{" "}
                    {main.moment.cueHits.map((h, i) => <code key={i}>{h.matched}</code>)}
                  </p>
                )}
                {main.moment.how === "model" && (
                  <p className="eir-how deep">
                    His word cues found nothing here, so he read it properly instead. This is
                    a phrasing worth adding to the cue list.
                  </p>
                )}
                {main.moment.how === "none" && (
                  <p className="eir-how">Nothing emotional in it. Ordinary moment, no steering.</p>
                )}
                <div className="eir-net"><EmotionNetwork caption={false} moment={main.moment.id} /></div>
              </div>

              <div className="eir-card">
                <span className="hil-sum-k">Who led, in order</span>
                <ol className="eir-traits">
                  {main.personality.traits.slice(0, 7).map((t, i) => (
                    <li key={t.id} className={t.leading ? "leading" : ""}>
                      <b>{i + 1}</b>
                      <span>{t.name}{t.leading && <i>leads now</i>}</span>
                    </li>
                  ))}
                </ol>
                <p className="eir-charm">
                  <b>Charm dial: {main.personality.charm.level}</b>
                  <span>{main.personality.charm.note}</span>
                </p>
              </div>
            </div>

            {main.personality.steering_line && (
              <div className="eir-steer">
                <span className="hil-sum-k">The one sentence that steered him</span>
                <p>{main.personality.steering_line}</p>
              </div>
            )}

            <div className="eir-ab">
              {!compare ? (
                <button className="hil-feedback-btn" onClick={runCompare} disabled={comparing}>
                  {comparing ? "Running" : "Same message, without the charm trait"}
                </button>
              ) : (
                <div className="eir-ab-result">
                  <span className="hil-sum-k">Without charm, he would have said</span>
                  <p>{compare.reply}</p>
                  {compare.tells.length > 0 && (
                    <p className="eir-ab-tells">{compare.tells.length} bot-tell{compare.tells.length > 1 ? "s" : ""} in that one.</p>
                  )}
                </div>
              )}
            </div>

            <div className="hil-meta">
              {main.meta.model} &middot; {main.meta.elapsed_ms}ms &middot; {main.personality.trait_count} traits &middot; {main.personality.core_chars.toLocaleString()} chars of personality
            </div>
          </>
        )}
      </div>
    </section>
  );
}
