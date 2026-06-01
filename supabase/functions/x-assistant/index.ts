import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { dispatchDueXPosts, requireSupabaseServiceConfig } from "../_shared/x-dispatch.ts";
import { loadUserKnowledge } from "../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type XAction =
  | {
      action: "post_now" | "schedule_post";
      content?: string | null;
      brief?: string | null;
      scheduled_at?: string | null;
    }
  | { action: "queue_status" | "connection_status" | "dispatch_due" }
  | { action: "unsupported" | "clarify"; message: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Sign in required." }, 401);
    }

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const { message, browserTime, timeZone } = await req.json();
    const task = String(message || "").trim();
    if (!task) {
      return json({ error: "No X task provided." }, 400);
    }

    const action = await routeXAction({
      task,
      browserTime: typeof browserTime === "string" ? browserTime : null,
      timeZone: typeof timeZone === "string" ? timeZone : null,
    });

    if (action.action === "unsupported" || action.action === "clarify") {
      return json({ reply: action.message, handled: true });
    }

    if (action.action === "connection_status") {
      const { data: connection, error } = await supabase
        .from("x_connections")
        .select("username,display_name,updated_at")
        .eq("user_identifier", user.id)
        .maybeSingle();
      if (error) throw error;

      if (!connection) {
        return json({
          handled: true,
          reply: "Your X account is not linked yet. Use **Connect X** first, then I can post and schedule for you.",
        });
      }

      return json({
        handled: true,
        reply: `Your X account is linked${connection.username ? ` as **@${connection.username}**` : ""}.`,
      });
    }

    if (action.action === "queue_status") {
      const { data: posts, error } = await supabase
        .from("scheduled_x_posts")
        .select("content,scheduled_at,status,error_message,posted_at")
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: false })
        .limit(8);
      if (error) throw error;

      if (!posts?.length) {
        return json({
          handled: true,
          reply: "Your X queue is empty right now.",
        });
      }

      const summary = posts
        .map((post) => {
          const when = new Date(post.scheduled_at).toLocaleString();
          const errorPart = post.error_message ? ` — ${post.error_message}` : "";
          return `- **${post.status}** · ${when} · ${truncate(post.content, 80)}${errorPart}`;
        })
        .join("\n");

      return json({
        handled: true,
        reply: `Here’s your recent X queue:\n${summary}`,
      });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("x_connections")
      .select("id")
      .eq("user_identifier", user.id)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) {
      return json({
        handled: true,
        reply: "Your X account is not linked yet. Connect it first, then I can execute X actions for you.",
      });
    }

    if (action.action === "dispatch_due") {
      const result = await dispatchDueXPosts({ supabase, userId: user.id, limit: 25 });
      return json({
        handled: true,
        reply: `Done. I processed your due X queue: **${result.posted} posted**, **${result.failed} failed**.`,
      });
    }

    const userKnowledge = await loadUserKnowledge(supabase, user.id, {
      includeMemoryNotes: true,
      includeXPersona: true,
      includeXContentSource: false,
    });

    const content = await resolvePostContent(action, userKnowledge.combinedContext);
    if (!content.trim()) {
      return json({
        handled: true,
        reply: "I need the actual post content or a clearer instruction for what to write on X.",
      });
    }

    if (action.action === "schedule_post") {
      if (!action.scheduled_at) {
        return json({
          handled: true,
          reply: "Tell me the exact time to schedule it, and I’ll queue it on X for you.",
        });
      }

      const scheduledAt = new Date(action.scheduled_at);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        return json({
          handled: true,
          reply: "That scheduled time is invalid or already in the past. Give me a future time and I’ll queue it.",
        });
      }

      const { error } = await supabase.from("scheduled_x_posts").insert({
        user_id: user.id,
        content,
        scheduled_at: scheduledAt.toISOString(),
      });
      if (error) throw error;

      return json({
        handled: true,
        reply: `Queued for X on **${scheduledAt.toLocaleString()}**.\n\nPost: ${content}`,
      });
    }

    const dueAt = new Date(Date.now() - 1_000).toISOString();
    const { data: insertedPost, error: insertError } = await supabase
      .from("scheduled_x_posts")
      .insert({
        user_id: user.id,
        content,
        scheduled_at: dueAt,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const dispatchResult = await dispatchDueXPosts({
      supabase,
      userId: user.id,
      postId: insertedPost.id,
      limit: 1,
    });

    const postedResult = dispatchResult.results.find((result) => result.id === insertedPost.id);
    if (postedResult?.status === "posted") {
      return json({
        handled: true,
        reply: `Posted to X${postedResult.xPostId ? ` (ID: ${postedResult.xPostId})` : ""}.\n\n${content}`,
      });
    }

    return json({
      handled: true,
      reply: `I tried to post it on X, but it failed${postedResult?.error ? `: ${postedResult.error}` : "."}`,
    });
  } catch (error) {
    console.error("x-assistant error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function routeXAction(input: {
  task: string;
  browserTime: string | null;
  timeZone: string | null;
}): Promise<XAction> {
  const fastPath = tryFastPath(input.task);
  if (fastPath) return fastPath;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      action: "clarify",
      message:
        "I can execute X actions, but the routing model is not configured yet. Try a direct command like: post this on X: ... or schedule this on X tomorrow at 8pm: ...",
    };
  }

  const systemPrompt = `You route Braino commands into executable X actions.

Return ONLY valid JSON.

Allowed actions:
- {"action":"post_now","content":"exact post text"}
- {"action":"post_now","brief":"topic or writing instruction for the post"}
- {"action":"schedule_post","content":"exact post text","scheduled_at":"ISO_8601"}
- {"action":"schedule_post","brief":"topic or writing instruction for the post","scheduled_at":"ISO_8601"}
- {"action":"queue_status"}
- {"action":"connection_status"}
- {"action":"dispatch_due"}
- {"action":"unsupported","message":"brief explanation"}
- {"action":"clarify","message":"brief question"}

Rules:
- Use post_now when the user wants Braino to publish on X immediately.
- Use schedule_post when the user wants Braino to post later.
- If the user provides the exact post text, put it in "content".
- If the user wants Braino to write the post from an idea/topic, put that in "brief".
- If the user asks about queue, pending posts, scheduled posts, or failures, use queue_status.
- If the user asks whether X is connected or linked, use connection_status.
- If the user asks to run due posts now, use dispatch_due.
- If the user asks for unsupported actions like browsing random X posts, follower delta tracking, or arbitrary reply automation, use unsupported.
- For relative times like "tomorrow 8pm", convert them into ISO 8601 using the browser context below.
- Never output markdown fences.`;

  const userPrompt = `Current server time: ${new Date().toISOString()}
Browser local time: ${input.browserTime || "unknown"}
Browser timezone: ${input.timeZone || "unknown"}

User request:
${input.task}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`X action routing failed: ${raw}`);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content || "";
  return parseJsonResponse<XAction>(rawContent);
}

function tryFastPath(task: string): XAction | null {
  const text = task.trim().toLowerCase();
  if (/^(run|dispatch|process).*(due|queue).*(x|tweet|twitter)/i.test(task)) {
    return { action: "dispatch_due" };
  }
  if (/(is|am).*(x|twitter).*(connected|linked)|\bx account\b/i.test(text)) {
    return { action: "connection_status" };
  }
  if (/(queue|scheduled posts|pending posts|failed posts).*(x|twitter|tweet)|\bmy x queue\b/i.test(text)) {
    return { action: "queue_status" };
  }
  return null;
}

async function resolvePostContent(
  action: Extract<XAction, { action: "post_now" | "schedule_post" }>,
  userContext: string,
) {
  const direct = String(action.content || "").trim();
  if (direct) return direct.slice(0, 280);

  const brief = String(action.brief || "").trim();
  if (!brief) return "";

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return brief.slice(0, 280);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `Write a strong X post in the user's authentic voice.

Hard rules:
- Stay at or under 280 characters total.
- Multi-line only. Minimum 3 non-empty lines.
- Minimum 3 sentences.
- Sound like a real founder or builder texting a sharp friend.
- Use one concrete detail, tension, number, decision, or observation.
- No hashtags. No emojis. No "what do you think?" No CTA. No listicle formatting.
- Never start with "I".
- No generic fluff like "excited to share", "game-changer", "let's dive in", or "unpopular opinion".

Return only the post text. No quotes, no labels, no markdown fences.`,
        },
        {
          role: "user",
          content: `${userContext ? `User identity and voice context:\n${userContext}\n\n` : ""}${brief}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`X post drafting failed: ${raw}`);
  }

  const payload = await response.json();
  const draft = String(payload?.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "");

  return normalizeBriefDraft(draft).slice(0, 280);
}

function normalizeBriefDraft(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseJsonResponse<T>(raw: string): T {
  const trimmed = String(raw || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  return JSON.parse(candidate) as T;
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
