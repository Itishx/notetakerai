// One place every reasoning engine records what it was asked and what it said.
//
// Both intelligence layers are tuned by hand against real runs, which only works
// if the runs survive. Before this, a test was gone the moment the tab closed,
// so the same command got paid for twice to be read twice.
//
// Two rules this file obeys:
//   1. Logging NEVER changes the response. It is fire and forget, its own
//      try/catch, and a logging outage is invisible to the caller. A demo that
//      breaks because its logger broke would be worse than no log at all.
//   2. Failures are logged too, and they are the rows worth the most. A run that
//      errored or came back malformed is exactly what a prompt edit has to fix.

type EngineLogRow = {
  engine: "hil-reason" | "hil-loop" | "braino-reply";
  run_id?: string | null;
  turn?: number;
  command: string;
  context?: string | null;
  response?: unknown;
  moment_id?: string | null;
  verdict?: string | null;
  model?: string | null;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    // Input the provider had already seen and billed at the cheaper cached
    // rate. On the loop this is the difference between paying for the whole
    // instruction manual every turn and paying for it once.
    prompt_tokens_details?: { cached_tokens?: number };
  } | null;
  elapsed_ms?: number | null;
  ok?: boolean;
  error?: string | null;
  prompt_version?: string | null;
};

// Long inputs are truncated rather than dropped: a 40k character paste should
// still leave a readable row instead of blowing up the insert.
const MAX_TEXT = 8000;

function clip(value: unknown, limit = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  return value.length > limit ? `${value.slice(0, limit)}\n[truncated]` : value;
}

/**
 * Records the call and returns the id of the row it will land in.
 *
 * The id is generated here rather than by the database so it can go back in the
 * response immediately, without waiting for the insert. That is what lets a
 * surface put Good, Bad and a note directly under the answer it just showed:
 * the verdict belongs where the answer is, not on a different page after
 * hunting for the run.
 */
export function logEngineRun(row: EngineLogRow): string {
  const id = crypto.randomUUID();
  // Deliberately not awaited by callers. Deno keeps the isolate alive for the
  // pending fetch, and if it does not finish, the response was still correct.
  void (async () => {
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) return; // Not configured: stay silent, never throw.

      const usage = row.usage || {};
      const payload = {
        id,
        engine: row.engine,
        run_id: row.run_id ?? null,
        turn: row.turn ?? 1,
        command: clip(row.command) ?? "",
        context: clip(row.context),
        response: row.response ?? null,
        moment_id: row.moment_id ?? null,
        verdict: row.verdict ?? null,
        model: row.model ?? null,
        prompt_tokens: usage.prompt_tokens ?? null,
        completion_tokens: usage.completion_tokens ?? null,
        total_tokens: usage.total_tokens ?? null,
        cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? null,
        elapsed_ms: row.elapsed_ms ?? null,
        ok: row.ok !== false,
        error: clip(row.error, 2000),
        prompt_version: row.prompt_version ?? null,
      };

      const res = await fetch(`${url}/rest/v1/engine_runs`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.error("engine-log insert failed:", res.status, await res.text());
    } catch (error) {
      console.error("engine-log threw:", error);
    }
  })();
  return id;
}
