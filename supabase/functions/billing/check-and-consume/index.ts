// Free-tier usage gate (V1 two-tier launch).
// Premium / creator / admin-granted users short-circuit to unlimited and are NEVER
// metered. Free users are checked + consumed against server-authoritative counters so
// the cap can't be bypassed by clearing extension storage.
//
// Request:  { surface, action?: "precheck" | "consume", amount?: number }
// Response: { allowed, unlimited, remaining?, limit?, used? }
//
// Surfaces (free caps): voice_seconds 180/day, recording_seconds 300/day,
//                       chat_count 10/day, delegate_count 5/month.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Period = "day" | "month";
const FREE_LIMITS: Record<string, { limit: number; period: Period; field: string }> = {
  voice_seconds:     { limit: 180, period: "day",   field: "voice_seconds" },
  recording_seconds: { limit: 300, period: "day",   field: "recording_seconds" },
  chat_count:        { limit: 10,  period: "day",   field: "chat_count" },
  delegate_count:    { limit: 5,   period: "month", field: "delegate_count" },
};

// Belt-and-suspenders alongside the access_grants table: the creator is always unlimited.
const INTERNAL_UNLIMITED_EMAILS = new Set(["itishpande21@gmail.com"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    // Fail OPEN (never break the product) when we can't identify the user.
    if (!authHeader) return json({ allowed: true, unlimited: false, error: "no-auth" });

    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await authed.auth.getUser();
    if (authErr || !user) return json({ allowed: true, unlimited: false, error: "unauthorized" });

    const { surface, action = "consume", amount = 1 } = await req.json().catch(() => ({}));
    const cap = FREE_LIMITS[surface as string];
    if (!cap) return json({ allowed: true, unlimited: false, error: "unknown-surface" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── unlimited? internal email OR profiles.is_premium OR access_grants ──
    const email = (user.email || "").toLowerCase();
    let unlimited = INTERNAL_UNLIMITED_EMAILS.has(email);
    if (!unlimited) {
      const { data: prof } = await admin.from("profiles").select("is_premium").eq("user_id", user.id).maybeSingle();
      if (prof?.is_premium === true) unlimited = true;
    }
    if (!unlimited && email) {
      const { data: grant } = await admin.from("access_grants").select("tier").eq("email", email).maybeSingle();
      if (grant && (grant.tier === "unlimited" || grant.tier === "admin")) unlimited = true;
    }
    if (unlimited) return json({ allowed: true, unlimited: true });

    // ── free user: load (create if missing) + reset stale windows ──
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const month = today.slice(0, 7);                     // YYYY-MM

    let { data: row } = await admin.from("usage_counters").select("*").eq("user_id", user.id).maybeSingle();
    if (!row) {
      const { data: created } = await admin
        .from("usage_counters")
        .insert({ user_id: user.id, day: today, month })
        .select("*")
        .maybeSingle();
      row = created;
    }
    if (!row) return json({ allowed: true, unlimited: false, error: "no-row" });

    const reset: Record<string, unknown> = {};
    if (row.day !== today) {
      reset.day = today;
      reset.voice_seconds = 0;
      reset.recording_seconds = 0;
      reset.chat_count = 0;
    }
    if (row.month !== month) {
      reset.month = month;
      reset.delegate_count = 0;
    }
    if (Object.keys(reset).length) {
      const { data: upd } = await admin
        .from("usage_counters")
        .update(reset)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();
      row = upd || { ...row, ...reset };
    }

    const used = Number(row[cap.field] || 0);
    const remaining = Math.max(0, cap.limit - used);

    if (action === "precheck") {
      return json({ allowed: used < cap.limit, unlimited: false, remaining, limit: cap.limit, used });
    }

    // consume
    const isCount = cap.field.endsWith("_count");
    if (isCount && used >= cap.limit) {
      // Hard block for per-call surfaces (chat/delegate) — do NOT increment.
      return json({ allowed: false, unlimited: false, remaining: 0, limit: cap.limit, used });
    }
    const inc = Math.max(0, Number(amount) || 0);
    const newVal = used + inc;
    await admin
      .from("usage_counters")
      .update({ [cap.field]: newVal, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Seconds surfaces (voice/recording) are gated at START via precheck, so consume always
    // succeeds even if the final session pushed slightly over.
    return json({ allowed: true, unlimited: false, remaining: Math.max(0, cap.limit - newVal), limit: cap.limit, used: newVal });
  } catch (e) {
    // Fail OPEN.
    return json({ allowed: true, unlimited: false, error: (e as Error).message });
  }
});
