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
  // hil-router is the reflex tier: one call, one tool name, no deliberation. It
  // runs in shadow first, so these rows are the whole point of that stage —
  // what HIL would have chosen, next to what the cascade actually did.
  engine: "hil-reason" | "hil-loop" | "braino-reply" | "hil-router";
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

// Hidden voice modes are private to the person using them. The model still gets
// the real command — only what lands in this table is redacted. Tuning needs to
// know a mode command happened, never which one.
const PERSONAL_MODE_RE = /\bmode\s*\d+\b/gi;

// The same rule for anything explicit, and for the same reason: this table is
// read on a web page. The whole value goes rather than the matched word, since a
// sentence with one word starred out still says what it said. Mishearings are
// half of why this is here.
//
// Kept in step by hand with mac/braino-mac/log-privacy.cjs, which does this for
// the terminal and the log file; tests/mac-log-privacy.test.mjs fails if the two
// lists drift apart.
const PRIVATE_TOPIC_RE = new RegExp(
  "\\b(?:"
  + "porn\\w*|pornhub|onlyfans|nsfw|xvideos|xhamster|redtube|hentai|camgirl|camgirls"
  + "|nude|nudes|naked|topless|lingerie"
  + "|sex|sexual|sexting|sext|threesome|orgasm\\w*|masturbat\\w*|blowjob|handjob"
  + "|erotic|erotica|bdsm|fetish|kink|horny|boobs|tits|dick\\s*pic|genital\\w*"
  + "|escort\\s*service|hookup|hookups"
  + ")\\b",
  "i",
);

/* The same judgement, exported, because two lists of these words would be two
   lists to keep in step and this one already has a test holding it against the
   Mac's copy. History (human-intelligence/history.ts) uses it to decide what
   never gets written down at all. */
export function mentionsPrivateTopic(value: string): boolean {
  return PRIVATE_TOPIC_RE.test(String(value || ""));
}

function redactPersonalModes(value: string): string {
  if (PRIVATE_TOPIC_RE.test(value)) return "[private]";
  return value.replace(PERSONAL_MODE_RE, (match) => match.replace(/\d+/, "[redacted]"));
}

function clip(value: unknown, limit = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const safe = redactPersonalModes(value);
  return safe.length > limit ? `${safe.slice(0, limit)}\n[truncated]` : safe;
}

// `response` is stored as raw JSON, so it never passed through clip() — which is
// how the model's own replies ("you are now in mode N") kept the number on record
// even when the command was clean. Walk it.
function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactPersonalModes(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactDeep(item);
    }
    return out;
  }
  return value;
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
        response: redactDeep(row.response) ?? null,
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
