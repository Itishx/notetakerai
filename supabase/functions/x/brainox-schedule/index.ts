// BrainoX distribution engine (BrainoX.md sections 13-20, 53-56, 72-75, 79-82).
// The only path from the BrainoX queue to X: every schedule/publish runs the
// hard policy gates first, then hands the post to the existing
// scheduled_x_posts + dispatch-scheduled-x-posts publish pipeline.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { dispatchDueXPosts, requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { runPolicy, suggestSlots, checkDuplicate, type PolicyDecision } from "../../_shared/brainox-policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Settings = {
  automation_mode: "manual" | "assisted" | "autopilot";
  kill_switch: boolean;
  quiet_start: number;
  quiet_end: number;
  min_gap_minutes: number;
  max_posts_per_day: number;
  timezone: string;
};

const DEFAULT_SETTINGS: Settings = {
  automation_mode: "manual",
  kill_switch: false,
  quiet_start: 23,
  quiet_end: 7,
  min_gap_minutes: 90,
  max_posts_per_day: 5,
  timezone: "Asia/Kolkata",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required." }, 401);

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const settings = await loadSettings(supabase, user.id);

    switch (action) {
      case "check":
      case "schedule":
      case "publish_now":
        return await scheduleOrPublish({ supabase, userId: user.id, settings, body, action });
      case "unschedule":
        return await unschedule(supabase, user.id, String(body?.itemId || ""));
      case "plan":
        return await plan(supabase, user.id, settings, Boolean(body?.apply));
      case "sync":
        return await sync(supabase, user.id);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("brainox-schedule error:", error);
    const message = error instanceof Error ? error.message : "Request failed.";
    return json({ error: message }, 500);
  }
});

async function loadSettings(supabase: ReturnType<typeof createClient>, userId: string): Promise<Settings> {
  const { data } = await supabase
    .from("x_settings")
    .select("automation_mode,kill_switch,quiet_start,quiet_end,min_gap_minutes,max_posts_per_day,timezone")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings;
}

function localParts(timezone: string) {
  const hourFormat = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false });
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  return (ms: number) => ({
    hour: Number(hourFormat.format(new Date(ms))) % 24,
    dayKey: dayFormat.format(new Date(ms)),
  });
}

/** Everything occupying the account's outbound schedule near a moment. */
async function loadNeighborhood(supabase: ReturnType<typeof createClient>, userId: string) {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("scheduled_x_posts")
    .select("content,scheduled_at,posted_at,status")
    .eq("user_id", userId)
    .in("status", ["pending", "processing", "posted"])
    .or(`scheduled_at.gte.${since},posted_at.gte.${since}`)
    .limit(200);
  const rows = data ?? [];
  const times = rows.map((row: { scheduled_at: string; posted_at: string | null }) =>
    new Date(row.posted_at ?? row.scheduled_at).getTime(),
  );
  return { rows, times };
}

/** Texts to compare against for duplication: recent outbound + active queue. */
async function loadRecentTexts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  excludeItemId: string,
): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: outbound }, { data: queued }] = await Promise.all([
    supabase
      .from("scheduled_x_posts")
      .select("content")
      .eq("user_id", userId)
      .in("status", ["pending", "processing", "posted"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("x_queue_items")
      .select("id,text")
      .eq("user_id", userId)
      .in("status", ["scheduled", "publishing"])
      .limit(40),
  ]);
  return [
    ...(outbound ?? []).map((row: { content: string }) => row.content),
    ...(queued ?? [])
      .filter((row: { id: string }) => row.id !== excludeItemId)
      .map((row: { text: string }) => row.text),
  ].filter(Boolean);
}

async function logAction(
  supabase: ReturnType<typeof createClient>,
  entry: {
    userId: string;
    agent: string;
    action: string;
    target?: string;
    reason?: string;
    meta?: unknown;
    result: "success" | "blocked" | "failed";
  },
) {
  await supabase.from("x_action_log").insert({
    user_id: entry.userId,
    agent: entry.agent,
    action: entry.action,
    target: entry.target?.slice(0, 200) ?? null,
    reason: entry.reason?.slice(0, 500) ?? null,
    meta: entry.meta ?? null,
    result: entry.result,
  });
}

async function scheduleOrPublish(context: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  settings: Settings;
  body: Record<string, unknown>;
  action: "check" | "schedule" | "publish_now";
}): Promise<Response> {
  const { supabase, userId, settings, body, action } = context;
  const itemId = String(body?.itemId || "");
  if (!itemId) return json({ error: "itemId is required." }, 400);

  const { data: item, error: itemError } = await supabase
    .from("x_queue_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) return json({ error: "Queue item not found." }, 404);
  if (["published", "publishing", "archived"].includes(item.status)) {
    return json({ error: `This item is already ${item.status}.` }, 400);
  }

  const scheduledAtMs =
    action === "publish_now"
      ? Date.now()
      : body?.scheduledAt
        ? new Date(String(body.scheduledAt)).getTime()
        : item.scheduled_publish_at
          ? new Date(item.scheduled_publish_at).getTime()
          : NaN;
  if (!Number.isFinite(scheduledAtMs)) {
    return json({ error: "A valid scheduledAt time is required." }, 400);
  }

  const parts = localParts(settings.timezone);
  const [{ times: neighborTimes }, recentTexts] = await Promise.all([
    loadNeighborhood(supabase, userId),
    loadRecentTexts(supabase, userId, itemId),
  ]);
  const dayKey = parts(scheduledAtMs).dayKey;
  const sameDayTimes = neighborTimes.filter((ms) => parts(ms).dayKey === dayKey);

  const decision: PolicyDecision = runPolicy({
    text: item.text,
    threadMode: Boolean(item.thread_mode),
    scheduledAtMs,
    localHour: parts(scheduledAtMs).hour,
    recentTexts,
    neighborTimesMs: neighborTimes,
    sameDayTimesMs: sameDayTimes,
    killSwitch: settings.kill_switch,
    quietStart: settings.quiet_start,
    quietEnd: settings.quiet_end,
    minGapMinutes: settings.min_gap_minutes,
    maxPostsPerDay: settings.max_posts_per_day,
  });

  // Publish-now is an explicit human decision: the user overrides timing rules
  // (BrainoX.md section 98) but never the kill switch or an exact duplicate.
  let effectiveDecision = decision;
  if (action === "publish_now") {
    const dup = checkDuplicate(item.text, recentTexts);
    const hardChecks = decision.checks.filter((check) =>
      ["kill_switch", "content", "length"].includes(check.name),
    );
    const dupCheck = {
      name: "duplication",
      pass: !dup.duplicate,
      detail: dup.duplicate ? "Exact duplicate of a recent post." : "Not an exact duplicate.",
    };
    effectiveDecision = {
      pass: hardChecks.every((check) => check.pass) && dupCheck.pass,
      checks: [...hardChecks, dupCheck],
    };
  }

  if (action === "check") {
    return json({ decision, scheduledAt: new Date(scheduledAtMs).toISOString() });
  }

  if (!effectiveDecision.pass) {
    const reasons = effectiveDecision.checks.filter((check) => !check.pass).map((check) => check.detail);
    await supabase
      .from("x_queue_items")
      .update({ policy: effectiveDecision, why: { held: reasons } })
      .eq("id", itemId)
      .eq("user_id", userId);
    await logAction(supabase, {
      userId,
      agent: "policy-guard",
      action,
      target: item.text,
      reason: reasons.join(" "),
      meta: effectiveDecision,
      result: "blocked",
    });
    return json({ blocked: true, decision: effectiveDecision });
  }

  const scheduledAtIso = new Date(scheduledAtMs).toISOString();
  const { data: scheduledRow, error: insertError } = await supabase
    .from("scheduled_x_posts")
    .insert({
      user_id: userId,
      content: item.text,
      scheduled_at: scheduledAtIso,
      thread_mode: Boolean(item.thread_mode),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const why = {
    scheduled_because: [
      `Passed all ${effectiveDecision.checks.length} policy gates.`,
      item.pillar ? `Pillar: ${item.pillar}.` : null,
      action === "publish_now" ? "Published now by your explicit request." : `Slot: ${scheduledAtIso}.`,
    ].filter(Boolean),
  };

  await supabase
    .from("x_queue_items")
    .update({
      status: action === "publish_now" ? "publishing" : "scheduled",
      scheduled_publish_at: scheduledAtIso,
      scheduled_post_id: scheduledRow.id,
      policy: effectiveDecision,
      why,
      error: null,
    })
    .eq("id", itemId)
    .eq("user_id", userId);

  await logAction(supabase, {
    userId,
    agent: "distribution",
    action,
    target: item.text,
    reason: why.scheduled_because.join(" "),
    result: "success",
  });

  if (action === "publish_now") {
    const dispatch = await dispatchDueXPosts({ supabase, userId, postId: scheduledRow.id });
    const outcome = dispatch.results.find((row) => row.id === scheduledRow.id);
    if (outcome?.status === "posted") {
      await supabase
        .from("x_queue_items")
        .update({ status: "published", x_post_id: outcome.xPostId, published_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("user_id", userId);
      return json({ published: true, xPostId: outcome.xPostId, decision: effectiveDecision });
    }
    const errorMessage = outcome?.error || "Publishing did not complete.";
    await supabase
      .from("x_queue_items")
      .update({ status: "failed", error: errorMessage })
      .eq("id", itemId)
      .eq("user_id", userId);
    return json({ published: false, error: errorMessage, decision: effectiveDecision }, 502);
  }

  return json({ scheduled: true, scheduledAt: scheduledAtIso, decision: effectiveDecision });
}

async function unschedule(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  itemId: string,
): Promise<Response> {
  if (!itemId) return json({ error: "itemId is required." }, 400);
  const { data: item } = await supabase
    .from("x_queue_items")
    .select("id,status,scheduled_post_id,text")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!item) return json({ error: "Queue item not found." }, 404);
  if (item.status !== "scheduled") return json({ error: "Only scheduled items can be unscheduled." }, 400);

  if (item.scheduled_post_id) {
    // Only cancel while still pending; if the dispatcher claimed it, sync wins.
    await supabase
      .from("scheduled_x_posts")
      .update({ status: "cancelled" })
      .eq("id", item.scheduled_post_id)
      .eq("user_id", userId)
      .eq("status", "pending");
  }

  await supabase
    .from("x_queue_items")
    .update({ status: "approved", scheduled_publish_at: null, scheduled_post_id: null })
    .eq("id", itemId)
    .eq("user_id", userId);

  await logAction(supabase, {
    userId,
    agent: "distribution",
    action: "unschedule",
    target: item.text,
    result: "success",
  });
  return json({ unscheduled: true });
}

/**
 * Assisted/autopilot planning: place approved items into the next slots that
 * clear spacing, quiet hours, and daily caps. apply=false returns proposals;
 * apply=true schedules them (each still passes the full policy gate).
 */
async function plan(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settings: Settings,
  apply: boolean,
): Promise<Response> {
  if (settings.kill_switch) {
    return json({ blocked: true, reason: "X automation is stopped." });
  }

  const { data: approved } = await supabase
    .from("x_queue_items")
    .select("id,text,pillar,priority,position,thread_mode")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("position", { ascending: true })
    .limit(10);
  if (!approved?.length) return json({ proposals: [] });

  const parts = localParts(settings.timezone);
  const { times: occupied } = await loadNeighborhood(supabase, userId);
  const slots = suggestSlots({
    fromMs: Date.now() + 15 * 60 * 1000,
    count: approved.length,
    occupiedTimesMs: occupied,
    minGapMinutes: settings.min_gap_minutes,
    quietStart: settings.quiet_start,
    quietEnd: settings.quiet_end,
    maxPostsPerDay: settings.max_posts_per_day,
    localParts: parts,
  });

  const proposals = approved.slice(0, slots.length).map((item: { id: string; text: string }, index: number) => ({
    itemId: item.id,
    text: item.text,
    at: new Date(slots[index]).toISOString(),
  }));

  if (!apply || settings.automation_mode === "manual") {
    return json({ proposals, applied: false });
  }

  const applied: Array<{ itemId: string; at: string; ok: boolean; detail?: string }> = [];
  for (const proposal of proposals) {
    const result = await scheduleOrPublish({
      supabase,
      userId,
      settings,
      body: { itemId: proposal.itemId, scheduledAt: proposal.at },
      action: "schedule",
    });
    const payload = await result.json();
    applied.push({
      itemId: proposal.itemId,
      at: proposal.at,
      ok: Boolean(payload?.scheduled),
      detail: payload?.blocked ? "Blocked by policy." : undefined,
    });
  }
  return json({ proposals, applied: true, results: applied });
}

/** Reconcile queue items with what the dispatcher actually did. */
async function sync(supabase: ReturnType<typeof createClient>, userId: string): Promise<Response> {
  const { data: inFlight } = await supabase
    .from("x_queue_items")
    .select("id,scheduled_post_id,status")
    .eq("user_id", userId)
    .in("status", ["scheduled", "publishing"])
    .not("scheduled_post_id", "is", null);
  if (!inFlight?.length) return json({ synced: 0 });

  const ids = inFlight.map((row: { scheduled_post_id: string }) => row.scheduled_post_id);
  const { data: posts } = await supabase
    .from("scheduled_x_posts")
    .select("id,status,x_post_id,posted_at,error_message")
    .in("id", ids);

  let synced = 0;
  for (const item of inFlight) {
    const post = (posts ?? []).find((row: { id: string }) => row.id === item.scheduled_post_id);
    if (!post) continue;
    if (post.status === "posted") {
      await supabase
        .from("x_queue_items")
        .update({ status: "published", x_post_id: post.x_post_id, published_at: post.posted_at })
        .eq("id", item.id)
        .eq("user_id", userId);
      synced += 1;
    } else if (post.status === "failed") {
      await supabase
        .from("x_queue_items")
        .update({ status: "failed", error: post.error_message })
        .eq("id", item.id)
        .eq("user_id", userId);
      synced += 1;
    } else if (post.status === "cancelled" && item.status === "scheduled") {
      await supabase
        .from("x_queue_items")
        .update({ status: "approved", scheduled_post_id: null, scheduled_publish_at: null })
        .eq("id", item.id)
        .eq("user_id", userId);
      synced += 1;
    }
  }
  return json({ synced });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
