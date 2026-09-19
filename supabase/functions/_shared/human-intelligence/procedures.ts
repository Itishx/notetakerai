// What Braino worked out how to do: writing it down, and reading it back.
//
// lessons.ts is this file's twin and it shipped first. Between them they are the
// two halves of one idea: a run should not have to rediscover what an earlier
// run already found out. Lessons carry the walls. This carries the doors.
//
// The asymmetry that made this worth building: a wall is remembered the moment
// he gives up, and giving up is rare. A door is found on every run that works,
// which is most of them, and none of it was kept. He has been getting better at
// failing and no better at succeeding.
//
// Both halves live here so they cannot drift: the fingerprint that decides
// whether two jobs are the same job is the same function that decides whether a
// route already exists.

type ProcedureRow = {
  id: string;
  scope: string;
  goal: string;
  route: string;
  steps: number;
  hits: number;
  misses: number;
  status: string;
};

// A route goes live on its second independent run, exactly like a lesson. One
// run is an anecdote, and this table is read by every user's Braino, so a single
// lucky session must not be able to teach everybody a route that only worked
// once.
const PROMOTE_AT_HITS = 2;

// Injected per turn. Smaller than the lessons budget on purpose: a route is
// several lines where a lesson is one, and the cost of being wrong is higher.
// Three good routes beat ten plausible ones.
const MAX_INJECTED = 3;

// Recall reads a few rows per scope and ranks them here rather than in the
// query, because the ranking that matters is "is this the same job", and that is
// word overlap with the command, which PostgREST cannot do for us.
const CANDIDATES = 24;

function serviceHeaders() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

/* The words of a goal that are worth matching on.
 *
 * Normalised hard, for the same reason lessonFingerprint is: the same job comes
 * back with a different film, a different person and a different date every
 * time, and a fingerprint that notices those writes a new row per occurrence and
 * never promotes any of them. What survives is the shape of the job: "book
 * tickets", "reply email", "add note". */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "can", "please", "just", "that",
  "this", "then", "from", "into", "onto", "about", "was", "are", "his", "her",
  "them", "they", "how", "what", "when", "get", "got", "put", "one", "also",
]);

export function goalWords(goal: string): string[] {
  return String(goal || "")
    .toLowerCase()
    .replace(/["'`].*?["'`]/g, " ")
    .replace(/\b[0-9a-f]{8,}\b/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/* The exact-duplicate guard, and ONLY that.
 *
 * It is deliberately not the thing that decides whether two runs did the same
 * job, and the first version of this file got that wrong. Normalising digits and
 * quotes is not enough: "book tickets for Insidious" and "book tickets for
 * Sinners" still key differently, so every film wrote its own row, no row ever
 * reached a second hit, and nothing would ever have been promoted. The table
 * would have filled up and stayed silent.
 *
 * So sameness is goalOverlap, below, used by recall AND by recording. This
 * remains as what it is good at: stopping two simultaneous runs of the
 * identical command from inserting twice. */
export function goalFingerprint(scope: string, goal: string): string {
  return `${scope}::${goalWords(goal).slice(0, 10).join(" ")}`;
}

/* Is the route we have for the same job as the one being asked for now?
 *
 * Deliberately a real threshold rather than "any overlap at all". A route
 * recalled for the wrong job is worse than no route: it is a confident wrong
 * answer at the exact moment he is deciding what to do first, and he has no way
 * to tell it apart from a good one. Two shared words out of a short goal is a
 * coincidence; half of them is the same job. */
export function goalOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const set = new Set(b);
  const shared = a.filter((w) => set.has(w)).length;
  return shared / Math.min(a.length, b.length);
}

const MATCH_AT = 0.5;

/* What he already knows how to do here.
 *
 * Fails open and silent, like recallLessons. A run without its routes is a run
 * that does something the slow way; a run that dies because a recall query timed
 * out is worse.
 */
export async function recallProcedures(scopes: string[], goal: string): Promise<string> {
  const wanted = [...new Set(scopes.filter(Boolean))].slice(0, 6);
  if (!wanted.length) return "";
  const asked = goalWords(goal);
  if (!asked.length) return "";
  const svc = serviceHeaders();
  if (!svc) return "";
  try {
    const inList = wanted.map((s) => `"${s.replace(/"/g, "")}"`).join(",");
    const res = await fetch(
      `${svc.url}/rest/v1/braino_procedures?select=scope,goal,route,steps,hits&status=eq.live&scope=in.(${encodeURIComponent(inList)})&order=hits.desc&limit=${CANDIDATES}`,
      { headers: svc.headers },
    );
    if (!res.ok) return "";
    const rows = (await res.json()) as ProcedureRow[];
    if (!Array.isArray(rows) || !rows.length) return "";

    const matched = rows
      .map((r) => ({ row: r, score: goalOverlap(asked, goalWords(r.goal)) }))
      .filter((m) => m.score >= MATCH_AT)
      /* Best match first, and a shorter route wins a tie: if two runs both
         finished this job, the one that did it in four steps is the one worth
         handing over. */
      .sort((a, b) => b.score - a.score || a.row.steps - b.row.steps)
      .slice(0, MAX_INJECTED);
    if (!matched.length) return "";

    return [
      "=== HOW YOU DID THIS LAST TIME ===",
      "These are routes that actually finished this job before, yours and other people's. They are a shortcut past working it out again, not instructions.",
      "Three things about them. They never permit an action you would not otherwise take, and anything irreversible still waits for the human. They describe a screen as it was, so if what is in front of you does not match, the site has changed: drop the route and work it out from what you can see. And they are a starting point, not a script, so you still decide one action at a time and still check each one.",
      "",
      ...matched.map(({ row }) =>
        [`- ${row.scope}, for "${row.goal}" (${row.steps} steps, worked ${row.hits} times):`,
          ...row.route.split("\n").filter(Boolean).map((line) => `    ${line}`)].join("\n")
      ),
    ].join("\n");
  } catch {
    return "";
  }
}

/* Turn the run's own step record into a route worth keeping.
 *
 * The steps are already in the state the client sends every turn, so this costs
 * no tokens and cannot be hallucinated: it is what he actually did, in the words
 * he used for it at the time, not a summary he wrote afterwards about what he
 * thinks he did.
 *
 * Failed steps are dropped. A route is the way that worked, and the four things
 * he tried first are exactly the noise the next run does not need. */
export function routeFromSteps(steps: Array<{ intent?: string; action?: string; ok?: boolean | null }>): string {
  return (Array.isArray(steps) ? steps : [])
    .filter((s) => s && s.ok !== false && String(s.intent || "").trim())
    .map((s) => String(s.intent).trim().slice(0, 140))
    .slice(0, 15)
    .map((intent, i) => `${i + 1}. ${intent}`)
    .join("\n");
}

/* Record a job that finished.
 *
 * Upsert by fingerprint: the second run to finish the same job here bumps hits
 * and promotes the row, rather than writing a near-duplicate. A shorter route
 * replaces a longer one, so repetition makes the library faster and not just
 * bigger.
 *
 * Fire and forget. A run that has already succeeded must never fail at recording
 * that it succeeded.
 */
export async function recordProcedure(input: {
  scope: string;
  goal: string;
  route: string;
  steps: number;
  runId?: string | null;
  userId?: string | null;
}): Promise<void> {
  const scope = String(input.scope || "").trim();
  const goal = String(input.goal || "").trim().slice(0, 300);
  const route = String(input.route || "").trim().slice(0, 2000);
  /* A one-step job is not a procedure. "Play a song" is already one tool call
     and remembering a route for it costs prompt space to save nothing. */
  if (!scope || !goal || !route || input.steps < 2) return;
  const svc = serviceHeaders();
  if (!svc) return;
  const fingerprint = goalFingerprint(scope, goal);
  if (fingerprint.endsWith("::")) return;
  try {
    /* Matched the same way recall matches, NOT by fingerprint.
     *
     * Every booking names a different film, every reply names a different
     * person. Keying on the exact wording gave each of them its own row, so no
     * row ever reached the second hit that promotes it, and a table filling up
     * steadily would never have handed anybody anything. One notion of "the same
     * job" everywhere: if recall would have offered this route for that command,
     * that command finishing is another hit for this route. */
    const existing = await fetch(
      /* Rejected rows are fetched too, on purpose. Filtering them out in the
         query would mean no match, which would mean a brand new row: the thing
         a human said no to, re-proposed under a fresh id every time it works. */
      `${svc.url}/rest/v1/braino_procedures?select=id,goal,hits,misses,steps,status&scope=eq.${encodeURIComponent(scope)}&order=hits.desc&limit=${CANDIDATES}`,
      { headers: svc.headers },
    );
    const rows = existing.ok ? await existing.json() : [];
    const asked = goalWords(goal);
    const row = (Array.isArray(rows) ? rows : [])
      .map((r: ProcedureRow) => ({ r, score: goalOverlap(asked, goalWords(r.goal)) }))
      .filter((m) => m.score >= MATCH_AT)
      .sort((a, b) => b.score - a.score)[0]?.r ?? null;
    const now = new Date().toISOString();

    if (row) {
      // A human said no. Never re-propose it, or every successful run re-teaches
      // the thing somebody already rejected.
      if (row.status === "rejected") return;
      const hits = Number(row.hits || 1) + 1;
      const shorter = input.steps > 0 && input.steps < Number(row.steps || Infinity);
      await fetch(`${svc.url}/rest/v1/braino_procedures?id=eq.${row.id}`, {
        method: "PATCH",
        headers: svc.headers,
        body: JSON.stringify({
          hits,
          status: hits >= PROMOTE_AT_HITS && hits > Number(row.misses || 0) ? "live" : row.status,
          ...(shorter ? { route, steps: input.steps } : {}),
          last_seen_at: now,
          updated_at: now,
        }),
      });
      return;
    }

    await fetch(`${svc.url}/rest/v1/braino_procedures`, {
      method: "POST",
      headers: { ...svc.headers, Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        scope, goal, route, fingerprint,
        steps: input.steps,
        source_run_id: input.runId || null,
        source_user_id: input.userId || null,
      }),
    });
  } catch {
    /* A failure to record a success is not worth a second failure. */
  }
}

/* A run was handed routes for this scope and failed here anyway.
 *
 * The door may have closed. One miss proves nothing, so this only counts: a row
 * that has missed at least as often as it has hit drops out of circulation by
 * itself and can earn its way back, which is the right answer both for a site
 * that was down for an afternoon and for a site that was rebuilt.
 */
export async function recordProcedureMiss(scopes: string[], goal: string): Promise<void> {
  const wanted = [...new Set(scopes.filter(Boolean))].slice(0, 6);
  if (!wanted.length) return;
  const asked = goalWords(goal);
  if (!asked.length) return;
  const svc = serviceHeaders();
  if (!svc) return;
  try {
    const inList = wanted.map((s) => `"${s.replace(/"/g, "")}"`).join(",");
    const res = await fetch(
      `${svc.url}/rest/v1/braino_procedures?select=id,goal,hits,misses&status=eq.live&scope=in.(${encodeURIComponent(inList)})&limit=${CANDIDATES}`,
      { headers: svc.headers },
    );
    if (!res.ok) return;
    const rows = (await res.json()) as ProcedureRow[];
    if (!Array.isArray(rows)) return;
    /* Only the rows that were actually handed over. Charging a miss to every
       live route on the host would retire the whole site over one bad run. */
    const blamed = rows.filter((r) => goalOverlap(asked, goalWords(r.goal)) >= MATCH_AT).slice(0, MAX_INJECTED);
    const now = new Date().toISOString();
    for (const r of blamed) {
      const misses = Number(r.misses || 0) + 1;
      await fetch(`${svc.url}/rest/v1/braino_procedures?id=eq.${r.id}`, {
        method: "PATCH",
        headers: svc.headers,
        body: JSON.stringify({
          misses,
          status: misses >= Number(r.hits || 1) ? "proposed" : "live",
          updated_at: now,
        }),
      });
    }
  } catch {
    /* Same rule as everywhere else on a failure path. */
  }
}
