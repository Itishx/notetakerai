import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { refreshXAccessToken } from "../_shared/x-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_REPLIES_PER_USER = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearerToken = Deno.env.get("X_BEARER_TOKEN");
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Detect manual user-triggered call via JWT
  let targetUserId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) targetUserId = user.id;
    }
  }

  // Cron mode: all enabled users. Manual mode: only the calling user (bypass toggle gate)
  let personaQuery = supabase
    .from("x_auto_persona")
    .select("user_id, display_name, bio, what_building, tone_notes, x_user_id, last_mention_id");
  personaQuery = targetUserId
    ? personaQuery.eq("user_id", targetUserId)
    : personaQuery.eq("auto_reply_enabled", true);

  const { data: personas, error: personaError } = await personaQuery;

  if (personaError) {
    console.error("Failed to load personas:", personaError);
    return json({ error: personaError.message }, 500);
  }

  if (!personas?.length) {
    return json({ message: "No users with auto reply enabled.", replied: 0 });
  }

  const runStarted = new Date().toISOString();
  const allResults: Array<{ user_id: string; replied: number; error?: string }> = [];

  for (const persona of personas) {
    const runStart = Date.now();
    let repliesPosted = 0;

    try {
      // Get the user's X connection (tokens)
      const { data: connection } = await supabase
        .from("x_connections")
        .select("access_token, refresh_token, token_expires_at")
        .eq("user_identifier", persona.user_id)
        .maybeSingle();

      if (!connection?.access_token) {
        allResults.push({ user_id: persona.user_id, replied: 0, error: "No X account linked" });
        continue;
      }

      // Refresh token if expiring soon
      let accessToken = connection.access_token;
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
      if (expiresAt && expiresAt < Date.now() + 60_000 && connection.refresh_token) {
        const refreshed = await refreshXAccessToken(connection.refresh_token);
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          await supabase
            .from("x_connections")
            .update({
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token ?? connection.refresh_token,
              token_expires_at: refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_identifier", persona.user_id);
        }
      }

      // Resolve X user ID if not cached
      let xUserId = persona.x_user_id;
      if (!xUserId) {
        const meRes = await fetch("https://api.x.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          xUserId = meData?.data?.id ?? null;
          if (xUserId) {
            await supabase
              .from("x_auto_persona")
              .update({ x_user_id: xUserId })
              .eq("user_id", persona.user_id);
          }
        }
      }

      if (!xUserId) {
        allResults.push({ user_id: persona.user_id, replied: 0, error: "Could not resolve X user ID" });
        continue;
      }

      // Fetch recent mentions since last watermark
      const mentionsUrl = new URL(`https://api.x.com/2/users/${xUserId}/mentions`);
      mentionsUrl.searchParams.set("tweet.fields", "text,author_id,created_at");
      mentionsUrl.searchParams.set("expansions", "author_id");
      mentionsUrl.searchParams.set("user.fields", "username,name");
      mentionsUrl.searchParams.set("max_results", "10");
      if (persona.last_mention_id) {
        mentionsUrl.searchParams.set("since_id", persona.last_mention_id);
      }

      const mentionsRes = await fetch(mentionsUrl.toString(), {
        headers: { Authorization: `Bearer ${bearerToken ?? accessToken}` },
      });

      if (!mentionsRes.ok) {
        const err = await mentionsRes.text();
        console.error(`Mentions fetch failed for user ${persona.user_id}:`, err);
        allResults.push({ user_id: persona.user_id, replied: 0, error: `Mentions API error: ${err.slice(0, 100)}` });
        continue;
      }

      const mentionsData = await mentionsRes.json();
      const mentions: Array<{ id: string; text: string; author_id: string }> = mentionsData?.data ?? [];
      const users: Array<{ id: string; username: string; name: string }> = mentionsData?.includes?.users ?? [];

      if (!mentions.length) {
        allResults.push({ user_id: persona.user_id, replied: 0 });
        continue;
      }

      // Update watermark to the newest mention ID
      const newestMentionId = mentions[0].id;

      const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

      const personaContext = [
        persona.display_name ? `Name: ${persona.display_name}` : null,
        persona.bio ? `Bio: ${persona.bio}` : null,
        persona.what_building ? `Building: ${persona.what_building}` : null,
        persona.tone_notes ? `Voice & tone: ${persona.tone_notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      for (const mention of mentions.slice(0, MAX_REPLIES_PER_USER)) {
        try {
          const author = usersById[mention.author_id];
          const authorHandle = author?.username ?? "someone";
          const authorName = author?.name ?? authorHandle;

          const reply = await generateReply({
            apiKey: apiKey ?? null,
            personaContext,
            mentionText: mention.text,
            authorHandle,
          });

          if (!reply) continue;

          // Post the reply
          const replyRes = await fetch("https://api.x.com/2/tweets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              text: reply,
              reply: { in_reply_to_tweet_id: mention.id },
            }),
          });

          if (!replyRes.ok) {
            const err = await replyRes.text();
            console.error(`Reply post failed:`, err);
            continue;
          }

          // Log the reply
          const postUrl = `https://x.com/${authorHandle}/status/${mention.id}`;
          await supabase.from("x_auto_reply_logs").insert({
            user_id: persona.user_id,
            post_author_handle: authorHandle,
            post_author_display_name: authorName,
            post_url: postUrl,
            post_text: mention.text,
            our_reply: reply,
          });

          repliesPosted++;
        } catch (replyErr) {
          console.error(`Failed to reply to mention ${mention.id}:`, replyErr);
        }
      }

      // Update watermark + stats
      await supabase
        .from("x_auto_persona")
        .update({ last_mention_id: newestMentionId })
        .eq("user_id", persona.user_id);

      const runDurationMs = Date.now() - runStart;
      await supabase.rpc("increment_x_automation_stats", {
        p_user_id: persona.user_id,
        p_replies: repliesPosted,
        p_duration_ms: runDurationMs,
        p_started_at: runStarted,
        p_finished_at: new Date().toISOString(),
        p_last_reply_count: repliesPosted,
        p_last_duration_ms: runDurationMs,
      }).then(() => null).catch(() => null); // best-effort stats update

      allResults.push({ user_id: persona.user_id, replied: repliesPosted });
    } catch (err) {
      console.error(`Error processing user ${persona.user_id}:`, err);
      allResults.push({
        user_id: persona.user_id,
        replied: repliesPosted,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const totalReplied = allResults.reduce((sum, r) => sum + r.replied, 0);
  return json({ message: "Engagement run complete.", replied: totalReplied, users: allResults });
});

async function generateReply(opts: {
  apiKey: string | null;
  personaContext: string;
  mentionText: string;
  authorHandle: string;
}): Promise<string | null> {
  if (!opts.apiKey) return null;

  const systemPrompt = `You are writing a reply on X (Twitter) on behalf of someone.
Reply in their authentic voice — helpful, genuine, not promotional.
Keep replies under 260 characters so there is room for the @handle prefix.
Return ONLY the reply text. No quotes, no labels, no markdown.`;

  const userPrompt = `Persona:\n${opts.personaContext}\n\n@${opts.authorHandle} wrote:\n"${opts.mentionText}"\n\nWrite a short, authentic reply:`;

  const response = await fetch(LOVABLE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
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
    .replace(/^["""']+|["""']+$/g, "")
    .slice(0, 260);

  return text || null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
