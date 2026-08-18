// x-auto-reply — the brain behind xAuto.
//
// Takes a batch of posts scraped off the timeline and answers two questions:
// which of these are worth replying to at all, and what would this person
// actually say. Most posts come back rejected, and that is the point.
//
// Why it works this way. X blocked automated replies at the API level in
// February 2026 and suspended accounts in the March 2026 enforcement wave. The
// pattern they detect is not volume, it is shape: scripted replies to strangers,
// no selectivity, machine cadence. The old xAuto walked the timeline top to
// bottom and replied to everything, which is that pattern exactly, and is why
// the account got flagged.
//
// This function inverts it. Braino does the reading, the judging and the
// writing. The founder does the sending. The human being the pacing is the one
// thing no detector can pattern-match, and the click was never the expensive
// part anyway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/* Below this, a post is not worth your name being on it. Set high on purpose:
   the failure mode of a reply engine is replying to everything, not replying to
   too little. */
const WORTH_IT = 68;

type Candidate = { id: string; handle: string; text: string; url?: string; followers?: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Sign in required." }, 401);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const candidates: Candidate[] = Array.isArray(body?.candidates) ? body.candidates.slice(0, 12) : [];
    const surface = body?.surface === "mac" ? "mac" : "browser";
    if (!candidates.length) return json({ error: "No posts supplied." }, 400);

    const [{ data: settings }, { data: sentToday }, { data: recentReplies }] = await Promise.all([
      supabase.from("x_settings")
        .select("voice_learned,voice_manual,voice_profile,pillars,xauto_daily_cap,xauto_enabled")
        .eq("user_id", user.id).maybeSingle(),
      supabase.rpc("xauto_sent_today", { p_user: user.id }),
      // Anti-repetition across replies matters more than across posts: three
      // near-identical replies in a session is what a human notices, before
      // any algorithm does.
      supabase.from("x_auto_reply_logs").select("our_reply,post_author_handle")
        .eq("user_id", user.id).eq("outcome", "sent")
        .order("replied_at", { ascending: false }).limit(12),
    ]);

    if (settings?.xauto_enabled === false) {
      return json({ error: "xAuto is switched off in your settings.", disabled: true }, 403);
    }

    const cap = settings?.xauto_daily_cap ?? 20;
    const used = typeof sentToday === "number" ? sentToday : 0;
    const remaining = Math.max(0, cap - used);
    if (remaining <= 0) {
      return json({
        picks: [], skipped: [], remaining: 0, cap, used,
        message: `You have hit today's ceiling of ${cap} replies. That ceiling exists so this never looks like a bot. Tomorrow.`,
      });
    }

    const voice = [
      settings?.voice_manual ? `WHAT THEY TOLD YOU ABOUT THEIR VOICE (outranks everything below):\n${JSON.stringify(settings.voice_manual, null, 2)}` : null,
      settings?.voice_learned ? `HOW THEY ACTUALLY WRITE, read from 200 of their own posts:\n${JSON.stringify(settings.voice_learned, null, 2)}` : null,
      settings?.voice_profile ? `Baseline: ${JSON.stringify(settings.voice_profile)}` : null,
    ].filter(Boolean).join("\n\n");

    // deno-lint-ignore no-explicit-any
    const pillars = Array.isArray(settings?.pillars)
      ? (settings.pillars as any[]).filter((p) => !p.paused).map((p) => p.label ?? p.key)
      : [];

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt({ voice, pillars, recentReplies: (recentReplies ?? []).map((r: { our_reply: string }) => r.our_reply) }) },
          {
            role: "user",
            content: `Here are ${candidates.length} posts from their timeline. Judge every one. They may send at most ${remaining} more replies today.\n\n` +
              candidates.map((c, i) => `[${i}] @${c.handle}${c.followers ? ` (${c.followers} followers)` : ""}\n${c.text}`).join("\n\n---\n\n"),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Scoring failed: ${(await res.text()).slice(0, 200)}`);

    const payload = await res.json();
    const parsed = safeJson(String(payload?.choices?.[0]?.message?.content ?? "{}")) ?? {};
    const judged: Array<{ index: number; score: number; reason: string; reply?: string }> =
      Array.isArray(parsed.judged) ? parsed.judged : [];

    const picks: unknown[] = [];
    const skipped: unknown[] = [];
    for (const j of judged) {
      const c = candidates[j.index];
      if (!c) continue;
      const entry = { ...c, score: j.score, reason: j.reason, reply: j.reply ?? null };
      if (j.score >= WORTH_IT && j.reply && String(j.reply).trim().length >= 15) picks.push(entry);
      else skipped.push({ ...entry, reply: null });
    }

    await supabase.from("x_action_log").insert({
      user_id: user.id, agent: "xauto", action: "scanned",
      target: `${candidates.length} posts from the timeline`,
      reason: `${picks.length} worth answering, ${skipped.length} skipped. ${remaining} replies left today.`,
      meta: { surface, cap, used, remaining },
      result: "success",
    });

    return json({
      picks: picks.slice(0, remaining),
      skipped,
      remaining, cap, used,
      threshold: WORTH_IT,
    });
  } catch (e) {
    console.error("x-auto-reply:", e);
    return json({ error: e instanceof Error ? e.message : "Scoring failed." }, 500);
  }
});

function systemPrompt(ctx: { voice: string; pillars: string[]; recentReplies: string[] }) {
  return [
    "# THE JOB",
    "You are deciding which posts on someone's X timeline are worth them replying to, and writing the reply where the answer is yes.",
    "Your default answer is NO. Most posts on a timeline are not worth a reply, and replying to everything is how an account starts reading as a bot and gets restricted. Rejecting is the useful half of this job.",
    "",
    "# SCORE EACH POST 0 TO 100",
    "Score high only when ALL of these hold:",
    "- This person genuinely has something to add. Not an opinion about the topic, something from their own work.",
    "- The post invites a reply. A real question, an incomplete argument, a claim worth extending or contesting.",
    "- The conversation is still alive. Not a two week old take.",
    "- Their reply would still be worth reading if nobody knew who wrote it.",
    "",
    "Score BELOW 40 automatically, no matter how popular the post is:",
    "- Engagement bait, giveaways, follow-for-follow, threads that end in 'agree?'",
    "- Political or religious flashpoints, tragedies, anything where a reply is a liability",
    "- Personal news that deserves a like and not a comment: births, deaths, illness, layoffs",
    "- Posts already carrying hundreds of replies, where one more is noise",
    "- Anything the reply would only exist to farm reach from",
    "",
    "# WHERE THE ANSWER IS YES, WRITE THE REPLY",
    "- 12 to 45 words. A reply is not a post.",
    "- Pick up ONE specific thing in their post and take it somewhere.",
    "- Bring something only this person could bring: a number from their own work, a case where the opposite happened, a consequence they did not mention.",
    "- Disagreeing is allowed and often better, provided there is a real reason.",
    "- Never open with their name or handle. Never restate their post. Never 'great point'.",
    "- No pitch, no link, no mention of what they are building unless the post is literally about that problem.",
    "- Never use em dashes or en dashes. Never hashtags. Emoji only if this person actually uses them.",
    "",
    "# THEIR VOICE",
    ctx.voice || "Nothing learned yet. Write plainly, first person, like a builder who read the post properly and had one specific thought.",
    "",
    ctx.pillars.length ? `# WHAT THEY KNOW ABOUT\nA post is more likely to be worth answering if it touches: ${ctx.pillars.join(", ")}.` : "",
    "",
    ctx.recentReplies.length
      ? `# REPLIES THEY ALREADY SENT RECENTLY\nDo not write another one shaped like these. Repeating your own move across a session is what a human notices first.\n${ctx.recentReplies.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "",
    "",
    "# OUTPUT",
    'One JSON object: {"judged":[{"index":<the number in brackets>,"score":0-100,"reason":"one short clause, why it is or is not worth answering","reply":"the reply, or omit entirely when the score is below 68"}]}',
    "Judge every post you were given, including the ones you reject. The rejections and their reasons are shown to the user, so they are part of the product.",
  ].filter(Boolean).join("\n");
}

function safeJson(raw: string) { try { return JSON.parse(raw); } catch { return null; } }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
