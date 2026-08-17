// braino-interaction-log — Braino's own interaction log.
//
// What people say to Braino and what he says back, from every surface (Chrome,
// Mac, web), into one table, so he can be improved against real use instead of
// against memory. Not sold, not shared.
//
// Rules, same as _shared/engine-log.ts:
//   1. Logging never gets in the way. Clients fire and forget; this function does
//      no heavy work, and an auth hiccup never rejects an event, it just lands
//      with user_id null.
//   2. Failures are logged too (tts_failure, error) and are the rows worth the
//      most.
//
// POST one event:      { surface, kind, ... }
// POST a batch:        { events: [ { surface, kind, ... }, ... ] }   (max 25)
// Fields per event:    surface        'chrome' | 'mac' | 'web'        required
//                      kind           text (voice, typed, delegate, greeting,
//                                     record, tts_failure, error, ...) required
//                      session_id, mode, user_text, braino_text, route,
//                      tts_provider, tts_error, latency_ms, url_host, meta
// Auth:                optional. Bearer <user jwt> → user_id resolved.
//                      Bearer <anon key> or nothing → user_id null.
// Returns:             { ok: true, inserted: n, skipped: m }
//
// verify_jwt is off in config.toml (the Mac may call with only the anon key).
// The table has RLS on and no insert policy, so this function, writing with the
// service role, is the only way in.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SURFACES = new Set(["chrome", "mac", "web"]);
const MAX_EVENTS = 25;
const MAX_TEXT = 12000;
const MAX_TTS_ERROR = 2000;
const MAX_META_BYTES = 8192;

// Hidden voice modes are private to the person using them. Same redaction as
// engine-log.ts: the row records that a mode command happened, never which one.
const PERSONAL_MODE_RE = /\bmode\s*\d+\b/gi;

type InteractionRow = {
  user_id: string | null;
  surface: string;
  session_id: string | null;
  kind: string;
  mode: string | null;
  user_text: string | null;
  braino_text: string | null;
  route: string | null;
  tts_provider: string | null;
  tts_error: string | null;
  latency_ms: number | null;
  url_host: string | null;
  meta: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase configuration." }, 500);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Expected a JSON body." }, 400);

    const rawEvents: unknown[] = Array.isArray((body as { events?: unknown }).events)
      ? ((body as { events: unknown[] }).events).slice(0, MAX_EVENTS)
      : [body];

    // Who, if we can tell. Never a reason to drop the event.
    const userId = await resolveUserId(req.headers.get("Authorization"), supabaseUrl, anonKey);

    const rows: InteractionRow[] = [];
    let skipped = 0;
    for (const raw of rawEvents) {
      const row = toRow(raw, userId);
      if (row) rows.push(row);
      else skipped += 1;
    }
    if (!rows.length) return json({ error: "No valid events (surface must be chrome|mac|web, kind required).", skipped }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.from("braino_interactions").insert(rows);
    if (error) {
      console.error("braino-interaction-log insert error:", error);
      return json({ error: "Could not save interaction log." }, 500);
    }

    return json({ ok: true, inserted: rows.length, skipped });
  } catch (error) {
    console.error("braino-interaction-log error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// A user JWT gives us the user; the anon key, a stale token, or nothing gives us
// null. Auth being flaky is not the client's problem when it is only logging.
async function resolveUserId(authHeader: string | null, supabaseUrl: string, anonKey: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ") || !anonKey) return null;
  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await authClient.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

function toRow(raw: unknown, userId: string | null): InteractionRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;

  const surface = short(e.surface, 16);
  if (!surface || !SURFACES.has(surface)) return null;
  const kind = short(e.kind, 40);
  if (!kind) return null;

  return {
    user_id: userId,
    surface,
    session_id: short(e.session_id, 120) || null,
    kind,
    mode: short(e.mode, 80) || null,
    user_text: clip(e.user_text, MAX_TEXT),
    braino_text: clip(e.braino_text, MAX_TEXT),
    route: short(e.route, 120) || null,
    tts_provider: short(e.tts_provider, 40) || null,
    tts_error: clip(e.tts_error, MAX_TTS_ERROR),
    latency_ms: toLatency(e.latency_ms),
    url_host: short(e.url_host, 253) || null,
    meta: toMeta(e.meta),
  };
}

// Identifiers and labels: one line, trimmed, bounded.
function short(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

// Free text: kept as typed (newlines matter in a transcript), redacted for
// hidden modes, truncated rather than dropped so a long paste still leaves a
// readable row.
function clip(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const safe = value.replace(PERSONAL_MODE_RE, "mode [redacted]");
  if (!safe.trim()) return null;
  return safe.length > limit ? `${safe.slice(0, limit)}\n[truncated]` : safe;
}

function toLatency(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n), 2_147_483_647);
}

// meta stays small. Oversized meta is dropped whole rather than truncated: a cut
// JSON blob is worse than none.
function toMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    const redacted = JSON.stringify(value).replace(PERSONAL_MODE_RE, "mode [redacted]");
    if (redacted.length > MAX_META_BYTES) return {};
    return JSON.parse(redacted) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
