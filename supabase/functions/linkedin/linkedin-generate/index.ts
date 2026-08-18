// linkedin-generate — writes LinkedIn posts, and drafts comments on other
// people's posts.
//
// Same voice engine as X, different room. The register genuinely differs: X
// rewards the blunt line, LinkedIn rewards 150 to 300 words with the hook on
// line one and the payoff earned. Cross-posting the same text to both is the
// single most obvious tell that an account is automated, so this rewrites
// rather than copies.
//
// Comment drafting is a first class mode here because on LinkedIn the comment
// is the growth lever, not the post. Comments carry 8 to 15 times the weight of
// likes and a good comment on a large account is seen by more of the right
// people than your own post is. Braino writes it. The founder sends it, because
// the Comments API is behind Community Management access we do not have, and
// because an auto-posted generic comment is worse than no comment.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";
import { X_FORMATS, LENGTH_POLICY, type LengthMode } from "../../_shared/x-voice-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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
    const mode: "post" | "comment" = body?.mode === "comment" ? "comment" : "post";
    const input = String(body?.input ?? "").trim();
    const targetUrl = String(body?.targetUrl ?? "").trim();

    const [{ data: settings }, { data: xSettings }, { data: recent }] = await Promise.all([
      supabase.from("channel_settings").select("*").eq("user_id", user.id).eq("channel", "linkedin").maybeSingle(),
      // LinkedIn will not let a member app read their own history, so the voice
      // Braino learned from X is the best evidence we have of how this person
      // writes. Borrowed openly rather than pretending we read LinkedIn.
      supabase.from("x_settings").select("voice_learned,voice_manual").eq("user_id", user.id).maybeSingle(),
      supabase.from("channel_queue_items").select("text")
        .eq("user_id", user.id).eq("channel", "linkedin")
        .in("status", ["draft", "approved", "scheduled", "published"])
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const lengthMode = (settings?.length_mode ?? "substantial") as LengthMode;
    const mix = Array.isArray(settings?.content_mix) ? settings.content_mix : [];
    const dayIndex = (new Date().getUTCDay() + 6) % 7;
    const todaysFormat = mix[dayIndex]?.format ?? null;
    const fmt = todaysFormat ? X_FORMATS.find((f) => f.key === todaysFormat) : null;
    const recentTexts = (recent ?? []).map((r: { text: string }) => r.text).filter(Boolean);

    const voiceBlock = [
      settings?.voice_manual
        ? `WHAT THEY TOLD YOU ABOUT THEIR LINKEDIN VOICE (highest authority):\n${JSON.stringify(settings.voice_manual, null, 2)}`
        : null,
      xSettings?.voice_manual
        ? `WHAT THEY TOLD YOU ABOUT THEIR VOICE GENERALLY (from their X setup):\n${JSON.stringify(xSettings.voice_manual, null, 2)}`
        : null,
      xSettings?.voice_learned
        ? `HOW THEY ACTUALLY WRITE, read from their X history. Same person, so the thinking and the humour carry over. The FORM does not: translate it into LinkedIn's room.\n${JSON.stringify(xSettings.voice_learned, null, 2)}`
        : null,
    ].filter(Boolean).join("\n\n");

    const system = mode === "comment" ? commentPrompt(voiceBlock) : postPrompt({
      voiceBlock, lengthMode, fmt, recentTexts,
      pillars: Array.isArray(settings?.pillars)
        ? settings.pillars.filter((p: { paused?: boolean }) => !p.paused).map((p: { key: string; label: string }) => `${p.key} (${p.label})`)
        : [],
    });

    const userMsg = mode === "comment"
      ? `The post you are replying to:\n\n${input}\n\n${targetUrl ? `URL: ${targetUrl}` : ""}`
      : input
        ? `Write from this. Do not add facts that are not here.\n\n${input}`
        : `Write today's post for the ${fmt?.label ?? "usual"} slot. Use only what you already know about them, invent nothing.`;

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error(`Generation failed: ${(await res.text()).slice(0, 200)}`);

    const payload = await res.json();
    const parsed = safeJson(String(payload?.choices?.[0]?.message?.content ?? "{}")) ?? {};
    const raw = Array.isArray(parsed.options) ? parsed.options : [];

    // Same floor enforcement as X. A LinkedIn post that is one line is not a
    // LinkedIn post, and stating the rule in a prompt is not enforcing it.
    const floor = mode === "comment" ? 80 : LENGTH_POLICY[lengthMode].min;
    // deno-lint-ignore no-explicit-any
    const graded = raw.map((o: any) => ({
      ...o,
      length_warning: String(o?.text ?? "").trim().length < floor
        ? `Below the ${floor} character floor for this ${mode}.` : null,
    }));
    // deno-lint-ignore no-explicit-any
    const clean = graded.filter((o: any) => !o.length_warning);
    const options = clean.length ? clean : graded;
    if (!options.length) throw new Error("The model returned no usable options.");

    await supabase.from("channel_action_log").insert({
      user_id: user.id, channel: "linkedin", agent: "content",
      action: mode === "comment" ? "draft_comment" : `generate:${todaysFormat ?? "post"}`,
      target: (targetUrl || input).slice(0, 140) || "today's slot",
      reason: `${options.length} option(s) produced.`,
      meta: { format: todaysFormat, length_mode: lengthMode, dropped_short: graded.length - clean.length },
      result: "success",
    });

    return json({ mode, options, format: todaysFormat, length_mode: lengthMode });
  } catch (e) {
    console.error("linkedin-generate:", e);
    return json({ error: e instanceof Error ? e.message : "Generation failed." }, 500);
  }
});

function postPrompt(ctx: {
  voiceBlock: string; lengthMode: LengthMode;
  fmt: { label: string; line: string } | null | undefined;
  recentTexts: string[]; pillars: string[];
}) {
  const len = LENGTH_POLICY[ctx.lengthMode];
  return [
    "# WHO YOU ARE",
    "You write LinkedIn posts as the account owner. A founder writing in public about work they actually did, not a brand account and not a marketer.",
    "",
    "# THIS IS LINKEDIN, NOT X",
    "The same person writes differently in different rooms, and cross-posting identical text to both is the clearest tell that an account is automated.",
    "- Line one is the hook and it is the ONLY line most people see before 'see more'. It must earn the click on its own, without a cliffhanger or a colon-and-list tease.",
    "- Then a blank line. Then the substance.",
    "- 150 to 300 words is the range that performs. Short paragraphs, one to three lines each, with blank lines between them, because a wall of text is not read.",
    "- Specific beats general and a real number beats an adjective. LinkedIn rewards time spent reading, so give them something worth the seconds.",
    "- End on a statement or a genuine question. Never 'thoughts?', never 'agree?'.",
    `Hard floor: ${len.min} characters. Aim for ${len.target[0]} to ${len.target[1]} words worth of substance.`,
    "",
    "# BANNED, BECAUSE LINKEDIN IS FULL OF IT",
    "- 'I'm humbled to announce', 'thrilled to share', 'game changer', 'let that sink in', 'here's the thing', 'unpopular opinion:' as an opener, 'agree?'",
    "- One-word-per-line posts. Fake suspense. A story about a taxi driver who taught you about business.",
    "- Hashtag stacks. At most one, usually none.",
    "- Em dashes and en dashes. Use commas, periods, or a line break.",
    "- Inventing a customer, a number, a meeting, a revenue figure, or an outcome. Only facts in the request exist.",
    "",
    ctx.fmt ? `# TODAY'S SHAPE: ${ctx.fmt.label.toUpperCase()}\n${ctx.fmt.line}` : "",
    "",
    "# THEIR VOICE",
    ctx.voiceBlock || "Nothing learned yet. Write plainly and do not perform a personality.",
    "",
    ctx.pillars.length ? `# TOPICS\n${ctx.pillars.join("\n")}` : "",
    ctx.recentTexts.length
      ? `\n# RECENTLY POSTED, DO NOT REPEAT\nNot the wording and not the underlying point.\n${ctx.recentTexts.map((t, i) => `${i + 1}. ${t.slice(0, 180)}`).join("\n")}`
      : "",
    "",
    "# OUTPUT",
    'One JSON object: {"options":[{"text","angle","pillar","hook_line","scores":{"hook":0-25,"substance":0-25,"voice":0-25,"format":0-15,"authenticity":0-10},"total":0-100}]}',
    "Produce 2 options with genuinely different angles, not two phrasings of one idea. Score honestly, weak options below 70.",
  ].filter(Boolean).join("\n");
}

function commentPrompt(voiceBlock: string) {
  return [
    "# THE JOB",
    "Write a comment the account owner will leave on somebody else's LinkedIn post. This is the highest leverage thing they do on this platform: a comment on a large account is seen by more of the right people than their own post is.",
    "",
    "# WHAT MAKES A COMMENT WORK",
    "- It picks up ONE specific point from the post and takes it somewhere. Never a summary of the post.",
    "- It adds something only this person could add: a number from their own work, a case where the opposite happened, a consequence the author did not mention.",
    "- It reads like a person who found the post interesting, not like someone doing marketing.",
    "- 25 to 70 words. Long enough to be worth reading, short enough to be read.",
    "- It can respectfully disagree. Disagreement outperforms agreement, provided there is a real reason.",
    "",
    "# BANNED",
    "- 'Great post', 'well said', 'thanks for sharing', 'couldn't agree more', 'this!', 'so true'.",
    "- Restating the post back at the author.",
    "- Any pitch, any link, any mention of what they are building unless the post is directly about that problem.",
    "- Em dashes, en dashes, hashtags, emoji.",
    "",
    "# THEIR VOICE",
    voiceBlock || "Nothing learned yet. Write plainly, in first person, like a builder who read the post properly.",
    "",
    "# OUTPUT",
    'One JSON object: {"options":[{"text","angle","scores":{"specificity":0-30,"adds_value":0-30,"voice":0-25,"brevity":0-15},"total":0-100}]}',
    "Produce 3 options: one that agrees and extends, one that respectfully disagrees, one that asks the author a real question. If the post is too thin to comment on well, say so in the angle field and score it low, rather than manufacturing something.",
  ].join("\n");
}

function safeJson(raw: string) { try { return JSON.parse(raw); } catch { return null; } }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
