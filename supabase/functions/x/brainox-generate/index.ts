// BrainoX content engine (BrainoX.md sections 6, 12, 25, 31, 58, 130).
// Turns raw thoughts into post options, improves authored posts without
// stealing the user's voice, generates pillar drafts, and writes follow-ups.
// Never invents experiences: it may only use what the request carries.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type GenerateMode = "options" | "improve" | "generate" | "follow_up";

type GeneratedOption = {
  text: string;
  angle: string;
  pillar: string;
  scores: Record<string, number>;
  total: number;
  authenticity_note: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required." }, 401);

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "options") as GenerateMode;
    const input = String(body?.input || "").trim();
    const pillar = typeof body?.pillar === "string" ? body.pillar : null;
    const stats = typeof body?.stats === "string" ? body.stats : null;

    if (!["options", "improve", "generate", "follow_up"].includes(mode)) {
      return json({ error: `Unknown mode: ${mode}` }, 400);
    }
    if (mode !== "generate" && !input) {
      return json({ error: "This mode needs input text." }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    // Voice profile + pillars for the prompt; recent posts for anti-repetition.
    const [{ data: settings }, { data: recentScheduled }, { data: recentQueue }] = await Promise.all([
      supabase.from("x_settings").select("voice_profile,pillars,voice_learned,voice_manual").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("scheduled_x_posts")
        .select("content")
        .eq("user_id", user.id)
        .in("status", ["pending", "posted"])
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("x_queue_items")
        .select("text")
        .eq("user_id", user.id)
        .in("status", ["draft", "review", "approved", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    // Posts the user starred as "this is exactly me". Real examples beat any
    // adjective, so they go into the prompt verbatim.
    const { data: starred } = await supabase
      .from("x_voice_samples")
      .select("text")
      .eq("user_id", user.id)
      .eq("starred", true)
      .limit(6);

    const recentTexts = [
      ...(recentScheduled || []).map((row: { content: string }) => row.content),
      ...(recentQueue || []).map((row: { text: string }) => row.text),
    ].filter(Boolean);

    const pillarKeys = Array.isArray(settings?.pillars)
      ? (settings.pillars as Array<{ key?: string; label?: string; paused?: boolean }>)
          .filter((entry) => !entry.paused)
          .map((entry) => `${entry.key} (${entry.label})`)
      : ["building-braino (Building Braino)", "founder (Founder Journey)", "ai-agents (AI / Agents)"];

    const systemPrompt = buildSystemPrompt({
      voiceProfile: settings?.voice_profile ?? null,
      voiceLearned: settings?.voice_learned ?? null,
      voiceManual: settings?.voice_manual ?? null,
      starredExamples: (starred || []).map((row: { text: string }) => row.text).filter(Boolean),
      pillarKeys,
      recentTexts,
    });

    const userPrompt = buildUserPrompt({ mode, input, pillar, stats });

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`Generation failed: ${raw.slice(0, 200)}`);
    }

    const payload = await response.json();
    const rawContent = String(payload?.choices?.[0]?.message?.content || "").trim();
    const options = parseOptions(rawContent);
    if (!options.length) throw new Error("The model returned no usable options.");

    await supabase.from("x_action_log").insert({
      user_id: user.id,
      agent: "content",
      action: `generate:${mode}`,
      target: input.slice(0, 120) || pillar || "pillar draft",
      reason: `${options.length} option(s) produced.`,
      result: "success",
    });

    return json({ mode, options });
  } catch (error) {
    console.error("brainox-generate error:", error);
    const message = error instanceof Error ? error.message : "Generation failed.";
    return json({ error: message }, 500);
  }
});

function buildSystemPrompt(context: {
  voiceProfile: unknown;
  voiceLearned: unknown;
  voiceManual: unknown;
  starredExamples: string[];
  pillarKeys: string[];
  recentTexts: string[];
}): string {
  const recentBlock = context.recentTexts.length
    ? `Recent posts and queued drafts (do NOT repeat these ideas, hooks, or phrasings):\n${context.recentTexts
        .map((text) => `- ${text.slice(0, 200)}`)
        .join("\n")}`
    : "No recent posts to avoid.";

  return [
    "You write X posts for Itish, the founder building Braino, a personal AI that lives in the browser and on the Mac.",
    "Itish owns the voice. You own the phrasing. Absolute rules:",
    "- Never invent experiences, customers, numbers, revenue, meetings, launches, or achievements. Only use facts present in the request.",
    "- Keep FACT (what happened) separate from INTERPRETATION (what Itish believes it means). Never state interpretation as fact.",
    "- Never use em dashes or en dashes. Use commas or periods instead.",
    "- No AI slop: no 'Here's the thing', no 'The future is...', no 'game changer', no 'delve', no forced profundity, no fake vulnerability, no motivational filler.",
    "- At most one hashtag, and only when it genuinely belongs. Usually zero.",
    "- Posts must be 280 characters or fewer unless the request explicitly asks for a thread.",
    "- Sound like a builder talking, not a brand. Specific beats grand.",
    // Three layers, stated in priority order so the model knows which wins.
    // What the user SAID beats what Braino INFERRED, because a person knows
    // things about their voice that 200 old posts cannot show.
    context.voiceManual
      ? `HOW THEY SAY THEY WRITE (their own words, this outranks everything below): ${JSON.stringify(context.voiceManual)}`
      : "",
    context.voiceLearned
      ? `HOW THEY ACTUALLY WRITE (read from their own post history): ${JSON.stringify(context.voiceLearned)}`
      : "",
    `Baseline voice profile: ${JSON.stringify(context.voiceProfile ?? "not set, default to direct and concise")}`,
    context.starredExamples.length
      ? `POSTS THEY STARRED AS "this is exactly me". Match this, do not copy it:\n${context.starredExamples.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "",
    `Active content pillars (use these keys for the pillar field): ${context.pillarKeys.join(", ")}`,
    recentBlock,
    "",
    "Always answer with a single JSON object: {\"options\": [{\"text\", \"angle\", \"pillar\", \"scores\": {\"hook\": 0-20, \"originality\": 0-20, \"voice\": 0-20, \"clarity\": 0-15, \"relevance\": 0-10, \"shareability\": 0-10, \"authenticity\": 0-5}, \"total\": 0-100, \"authenticity_note\": \"which facts from the request this rests on\"}]}",
    "Score honestly. A weak option should score below 70.",
  ].filter(Boolean).join("\n");
}

function buildUserPrompt(request: {
  mode: GenerateMode;
  input: string;
  pillar: string | null;
  stats: string | null;
}): string {
  switch (request.mode) {
    case "options":
      return [
        "Raw thought from Itish. Turn it into 3 distinct post options: one insightful, one contrarian, one conversational.",
        "Preserve the underlying event and perspective exactly. Do not add facts.",
        `Raw thought: ${request.input}`,
      ].join("\n");
    case "improve":
      return [
        "Itish wrote this post himself. Suggest up to 2 improved variants. Keep his meaning, claims, and voice. Tighten, do not rewrite the personality out of it.",
        `Post: ${request.input}`,
      ].join("\n");
    case "follow_up":
      return [
        "This post performed well. Extract the underlying insight and write 2 follow-up options with a genuinely new angle. Never rephrase the original.",
        `Original post: ${request.input}`,
        request.stats ? `Performance: ${request.stats}` : "",
      ].join("\n");
    case "generate":
    default:
      return [
        `Write 2 post options for the pillar "${request.pillar || "building-braino"}".`,
        request.input
          ? `Ground them ONLY in this material from Itish: ${request.input}`
          : "No specific material was provided, so stay at the level of opinion and product philosophy. State no events, numbers, or experiences.",
      ].join("\n");
  }
}

function parseOptions(rawContent: string): GeneratedOption[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return [];
  }
  const list = (parsed as { options?: unknown })?.options;
  if (!Array.isArray(list)) return [];

  return list
    .map((entry) => {
      const option = entry as Partial<GeneratedOption>;
      const text = stripDashes(String(option.text || "").trim());
      if (!text) return null;
      const scores =
        option.scores && typeof option.scores === "object" ? (option.scores as Record<string, number>) : {};
      const total =
        typeof option.total === "number"
          ? option.total
          : Object.values(scores).reduce((sum, value) => sum + (Number(value) || 0), 0);
      return {
        text,
        angle: String(option.angle || "").slice(0, 60),
        pillar: String(option.pillar || "").slice(0, 60),
        scores,
        total: Math.max(0, Math.min(100, Math.round(total))),
        authenticity_note: String(option.authenticity_note || "").slice(0, 300),
      };
    })
    .filter((option): option is GeneratedOption => option !== null);
}

// Braino never ships em or en dashes, even if the model slips one through.
function stripDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ", ");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
