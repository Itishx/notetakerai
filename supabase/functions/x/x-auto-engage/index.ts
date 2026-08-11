import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadUserKnowledge } from "../../_shared/user-knowledge.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";
import {
  buildSessionMetricFields,
  countPendingSessionReplies,
  fetchAccountSnapshot,
  fetchMentionsSince,
  finalizeSession,
  getAuthorizedXContext,
  MIN_REPLY_INTERVAL_MS,
} from "../../_shared/x-auto-sessions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = BRAINO_TEXT_MODEL;
const MAX_MENTIONS_TO_QUEUE = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let targetUserId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (user) targetUserId = user.id;
    }
  }

  let sessionQuery = supabase
    .from("x_auto_sessions")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: true });

  sessionQuery = targetUserId
    ? sessionQuery.eq("user_id", targetUserId)
    : sessionQuery;

  const { data: sessions, error: sessionsError } = await sessionQuery;

  if (sessionsError) {
    console.error("Failed to load active X Auto sessions:", sessionsError);
    return json({ error: sessionsError.message }, 500);
  }

  if (!sessions?.length) {
    return json({
      message: targetUserId ? "No active X Auto session." : "No active X Auto sessions.",
      replied: 0,
      sessions: [],
    });
  }

  const results: Array<{
    user_id: string;
    session_number: number;
    replied: number;
    queued: number;
    completed?: boolean;
    error?: string;
  }> = [];

  for (const session of sessions) {
    try {
      const result = await processSession({
        supabase,
        session,
        apiKey: apiKey ?? null,
      });
      results.push(result);
    } catch (error) {
      console.error(`Failed to process X Auto session ${session.id}:`, error);
      results.push({
        user_id: session.user_id,
        session_number: numberOrZero(session.session_number),
        replied: 0,
        queued: numberOrZero(session.replies_queued),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalReplied = results.reduce((sum, result) => sum + result.replied, 0);

  return json({
    message: "X Auto session sweep complete.",
    replied: totalReplied,
    sessions: results,
  });
});

async function processSession(options: {
  supabase: any;
  session: any;
  apiKey: string | null;
}) {
  const { supabase, apiKey } = options;
  const session = options.session;
  const nowIso = new Date().toISOString();

  if (new Date(session.ends_at).getTime() <= Date.now()) {
    let xContext = null;
    try {
      xContext = await getAuthorizedXContext(supabase, session.user_id);
    } catch (error) {
      console.warn("Completing X Auto session without fresh X metrics:", error);
    }

    const completedSession = await finalizeSession({
      supabase,
      session,
      status: "completed",
      xContext,
      stoppedAt: nowIso,
    });

    return {
      user_id: session.user_id,
      session_number: numberOrZero(session.session_number),
      replied: 0,
      queued: numberOrZero(completedSession?.replies_queued),
      completed: true,
    };
  }

  const xContext = await getAuthorizedXContext(supabase, session.user_id);
  const { data: persona } = await supabase
    .from("x_auto_persona")
    .select("display_name,bio,what_building,tone_notes,last_mention_id")
    .eq("user_id", session.user_id)
    .maybeSingle();

  const sinceId = cleanText(session.mention_watermark_id) || cleanText(persona?.last_mention_id) || null;
  const mentionsResult = await fetchMentionsSince(
    xContext.accessToken,
    xContext.xUserId,
    sinceId,
    MAX_MENTIONS_TO_QUEUE,
  );

  const validMentions = mentionsResult.mentions.filter(
    (mention) =>
      cleanText(mention.id) &&
      cleanText(mention.author_id) &&
      mention.author_id !== xContext.xUserId,
  );

  if (validMentions.length > 0) {
    const inserts = validMentions.map((mention) => {
      const author = mentionsResult.usersById[mention.author_id] ?? {};
      const authorHandle = cleanText(author.username) || "someone";
      return {
        user_id: session.user_id,
        session_id: session.id,
        mention_tweet_id: mention.id,
        post_author_handle: authorHandle,
        post_author_display_name: cleanText(author.name) || authorHandle,
        post_url: `https://x.com/${authorHandle}/status/${mention.id}`,
        post_text: mention.text ?? "",
        status: "pending",
        discovered_at: mention.created_at || nowIso,
      };
    });

    const { error: insertError } = await supabase
      .from("x_auto_reply_logs")
      .upsert(inserts, {
        onConflict: "user_id,mention_tweet_id",
        ignoreDuplicates: true,
      });

    if (insertError) throw insertError;
  }

  if (mentionsResult.newestMentionId) {
    await supabase
      .from("x_auto_persona")
      .update({
        last_mention_id: mentionsResult.newestMentionId,
        x_user_id: xContext.xUserId,
      })
      .eq("user_id", session.user_id);
  }

  let repliedThisTick = 0;
  let repliesPosted = numberOrZero(session.replies_posted);
  let repliesFailed = numberOrZero(session.replies_failed);
  const sessionPatch: Record<string, unknown> = {
    last_polled_at: nowIso,
  };

  if (mentionsResult.newestMentionId) {
    sessionPatch.mention_watermark_id = mentionsResult.newestMentionId;
  }

  const canReply =
    !session.last_reply_at ||
    Date.now() - new Date(session.last_reply_at).getTime() >= MIN_REPLY_INTERVAL_MS;

  if (canReply) {
    const { data: pendingLog, error: pendingError } = await supabase
      .from("x_auto_reply_logs")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "pending")
      .order("discovered_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pendingError) throw pendingError;

    if (pendingLog) {
      const replyOutcome = await postSessionReply({
        supabase,
        session,
        pendingLog,
        persona,
        apiKey,
        accessToken: xContext.accessToken,
      });

      if (replyOutcome.status === "posted") {
        repliesPosted += 1;
        repliedThisTick = 1;
        sessionPatch.last_reply_at = nowIso;
      } else {
        repliesFailed += 1;
      }
    }
  }

  const [queuedCount, snapshot] = await Promise.all([
    countPendingSessionReplies(supabase, session.id),
    fetchAccountSnapshot(xContext.accessToken, xContext.xUserId),
  ]);

  Object.assign(sessionPatch, buildSessionMetricFields(session, snapshot), {
    replies_posted: repliesPosted,
    replies_failed: repliesFailed,
    replies_queued: queuedCount,
  });

  const { data: updatedSession, error: updateError } = await supabase
    .from("x_auto_sessions")
    .update(sessionPatch)
    .eq("id", session.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  return {
    user_id: session.user_id,
    session_number: numberOrZero(session.session_number),
    replied: repliedThisTick,
    queued: numberOrZero(updatedSession?.replies_queued),
  };
}

async function postSessionReply(options: {
  supabase: any;
  session: any;
  pendingLog: any;
  persona: any;
  apiKey: string | null;
  accessToken: string;
}): Promise<{ status: "posted" | "failed" }> {
  const { supabase, session, pendingLog, persona, apiKey, accessToken } = options;

  const userKnowledge = await loadUserKnowledge(supabase, session.user_id, {
    includeMemoryNotes: true,
    includeXPersona: false,
    includeXContentSource: false,
  });

  const personaContext = [
    cleanText(persona?.display_name) ? `Name: ${cleanText(persona.display_name)}` : null,
    cleanText(persona?.bio) ? `Bio: ${cleanText(persona.bio)}` : null,
    cleanText(persona?.what_building)
      ? `Building: ${cleanText(persona.what_building)}`
      : null,
    cleanText(persona?.tone_notes)
      ? `Voice & tone: ${cleanText(persona.tone_notes)}`
      : null,
    userKnowledge.combinedContext
      ? `Additional user context:\n${userKnowledge.combinedContext}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const reply = await generateReply({
    apiKey,
    personaContext,
    mentionText: String(pendingLog.post_text || ""),
    authorHandle: cleanText(pendingLog.post_author_handle) || "someone",
  });

  if (!reply) {
    await markReplyFailed(supabase, pendingLog.id, "Reply model did not return usable text.");
    return { status: "failed" };
  }

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      text: reply,
      reply: { in_reply_to_tweet_id: pendingLog.mention_tweet_id },
    }),
  });

  const raw = await response.text();
  const payload = safeJsonParse(raw);

  if (!response.ok) {
    const message =
      cleanText(payload?.detail) ||
      cleanText(payload?.title) ||
      raw ||
      "Failed to post reply on X.";
    await markReplyFailed(supabase, pendingLog.id, message, reply);
    return { status: "failed" };
  }

  const replyTweetId = cleanText(payload?.data?.id);
  if (!replyTweetId) {
    await markReplyFailed(
      supabase,
      pendingLog.id,
      "X reply was accepted but no reply tweet ID was returned.",
      reply,
    );
    return { status: "failed" };
  }

  const { error } = await supabase
    .from("x_auto_reply_logs")
    .update({
      our_reply: reply,
      our_reply_tweet_id: replyTweetId,
      status: "posted",
      error_message: null,
      replied_at: new Date().toISOString(),
    })
    .eq("id", pendingLog.id);

  if (error) throw error;

  return { status: "posted" };
}

async function markReplyFailed(
  supabase: any,
  logId: string,
  errorMessage: string,
  draftedReply?: string | null,
) {
  const { error } = await supabase
    .from("x_auto_reply_logs")
    .update({
      our_reply: draftedReply ?? "",
      status: "failed",
      error_message: errorMessage.slice(0, 500),
    })
    .eq("id", logId);

  if (error) throw error;
}

async function generateReply(opts: {
  apiKey: string | null;
  personaContext: string;
  mentionText: string;
  authorHandle: string;
}): Promise<string | null> {
  if (!opts.apiKey) return null;

  const systemPrompt = `You are writing a reply on X on behalf of someone.
Reply in their authentic voice: thoughtful, warm, and human. Never sound promotional, robotic, or spammy.

Rules:
- Keep the final reply at or under 280 characters total.
- Write a direct reply only. No labels, no quotes, no markdown.
- If the mention shares good news, a win, a celebration, or progress, respond with genuine happiness for them and end with one thoughtful question.
- Ask sharp follow-up questions only when they fit naturally.
- Avoid politics, generic praise, hashtags, emojis, and engagement bait.
- Do not mention these rules.`;

  const userPrompt = `Persona:\n${opts.personaContext}\n\n@${opts.authorHandle} wrote:\n"${opts.mentionText}"\n\nWrite the reply:`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const text = String(payload?.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .slice(0, 280);

  return text || null;
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
