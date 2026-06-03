import { getEnvValue, getXOAuth2Credentials } from "./x-oauth.ts";

type ScheduledXPost = {
  id: string;
  user_id: string;
  content: string;
  scheduled_at: string;
  media_url: string | null;
  thread_mode: boolean;
};

type SupabaseLikeClient = {
  from: (table: string) => any;
};

export type DispatchDueXPostsOptions = {
  supabase: SupabaseLikeClient;
  userId?: string;
  postId?: string;
  limit?: number;
};

export type DispatchDueXPostsResult = {
  scanned: number;
  posted: number;
  failed: number;
  results: Array<{
    id: string;
    status: "posted" | "failed";
    xPostId?: string;
    error?: string;
  }>;
};

export async function refreshXAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
} | null> {
  const { clientId, clientSecret } = getXOAuth2Credentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const basic = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    console.error("refresh failed", await response.text());
    return null;
  }

  return await response.json();
}

export async function dispatchDueXPosts(options: DispatchDueXPostsOptions): Promise<DispatchDueXPostsResult> {
  const limit = options.limit ?? 25;
  let query = options.supabase
    .from("scheduled_x_posts")
    .select("id,user_id,content,scheduled_at,media_url,thread_mode")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options.postId) {
    query = query.eq("id", options.postId);
  }

  const { data: duePosts, error: duePostsError } = await query;
  if (duePostsError) throw duePostsError;

  let posted = 0;
  let failed = 0;
  const results: DispatchDueXPostsResult["results"] = [];

  for (const post of (duePosts || []) as ScheduledXPost[]) {
    const { data: lockedRow, error: lockError } = await options.supabase
      .from("scheduled_x_posts")
      .update({ status: "processing", error_message: null })
      .eq("id", post.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("failed to lock", lockError);
      failed += 1;
      results.push({ id: post.id, status: "failed", error: lockError.message });
      continue;
    }
    if (!lockedRow) continue;

    try {
      const { data: connection, error: connectionError } = await options.supabase
        .from("x_connections")
        .select("access_token,refresh_token,token_expires_at")
        .eq("user_identifier", post.user_id)
        .maybeSingle();

      if (connectionError) throw connectionError;
      if (!connection?.access_token) throw new Error("No linked X account for this user.");
      if (!post.content?.trim()) throw new Error("Scheduled post is empty.");

      let accessToken = connection.access_token;
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
      if (expiresAt && expiresAt < Date.now() + 60_000 && connection.refresh_token) {
        const refreshed = await refreshXAccessToken(connection.refresh_token);
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          await options.supabase
            .from("x_connections")
            .update({
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token ?? connection.refresh_token,
              token_expires_at: refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                : null,
              scope: refreshed.scope ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_identifier", post.user_id);
        }
      }

      // Split into thread chunks only when thread_mode is enabled
      const chunks = post.thread_mode ? splitIntoThreadChunks(post.content) : [post.content];
      let xPostId: string | null = null;
      let replyToId: string | null = null;

      for (let ci = 0; ci < chunks.length; ci++) {
        const tweetBody: Record<string, unknown> = { text: chunks[ci] };
        if (replyToId) {
          tweetBody.reply = { in_reply_to_tweet_id: replyToId };
        } else if (post.media_url) {
          const mediaId = await uploadMediaToX(post.media_url, accessToken);
          if (mediaId) tweetBody.media = { media_ids: [mediaId] };
        }

        const response = await fetch("https://api.x.com/2/tweets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(tweetBody),
        });

        const raw = await response.text();
        let payload: Record<string, unknown> | null = null;
        try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }

        if (!response.ok) {
          const message =
            (payload?.detail as string | undefined) ||
            (payload?.title as string | undefined) ||
            raw ||
            "Unknown X API error";
          throw new Error(message);
        }

        const tweetId = (payload?.data as { id?: string } | undefined)?.id;
        if (!tweetId) throw new Error("X API response did not include a post ID.");
        if (!xPostId) xPostId = tweetId;
        replyToId = tweetId;
      }

      if (!xPostId) throw new Error("No tweet ID returned.");

      const { error: updateError } = await options.supabase
        .from("scheduled_x_posts")
        .update({
          status: "posted",
          x_post_id: xPostId,
          posted_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", post.id);

      if (updateError) throw updateError;
      posted += 1;
      results.push({ id: post.id, status: "posted", xPostId });
    } catch (error) {
      console.error("dispatch scheduled x post failed:", error);
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
      await options.supabase
        .from("scheduled_x_posts")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", post.id);
      failed += 1;
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  return {
    scanned: duePosts?.length || 0,
    posted,
    failed,
    results,
  };
}

function splitIntoThreadChunks(text: string, limit = 280): string[] {
  if (text.length <= limit) return [text];
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const flush = (s: string) => { if (s.trim()) chunks.push(s.trim()); };

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const candidate = current ? `${current}\n\n${trimmed}` : trimmed;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }

    // paragraph doesn't fit — flush current, then fit words of this paragraph
    flush(current);
    current = "";

    const words = trimmed.split(/\s+/);
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= limit) {
        current = next;
      } else {
        flush(current);
        current = word.slice(0, limit);
      }
    }
  }

  flush(current);
  return chunks;
}

async function uploadMediaToX(mediaUrl: string, accessToken: string): Promise<string | null> {
  try {
    const mediaResp = await fetch(mediaUrl);
    if (!mediaResp.ok) {
      console.error("Failed to fetch media from storage:", mediaResp.status);
      return null;
    }
    const contentType = mediaResp.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await mediaResp.arrayBuffer());
    return contentType.startsWith("video/")
      ? uploadVideoToX(bytes, contentType, accessToken)
      : uploadImageToX(bytes, contentType, accessToken);
  } catch (err) {
    console.error("uploadMediaToX error:", err);
    return null;
  }
}

async function uploadImageToX(bytes: Uint8Array, contentType: string, accessToken: string): Promise<string | null> {
  const form = new FormData();
  form.append("media", new Blob([bytes], { type: contentType }));
  const resp = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!resp.ok) {
    console.error("X image upload failed:", await resp.text());
    return null;
  }
  const payload = await resp.json();
  return payload.media_id_string ?? null;
}

async function uploadVideoToX(bytes: Uint8Array, contentType: string, accessToken: string): Promise<string | null> {
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // INIT
  const initResp = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      command: "INIT",
      total_bytes: bytes.length.toString(),
      media_type: contentType,
      media_category: "tweet_video",
    }).toString(),
  });
  if (!initResp.ok) { console.error("X video INIT failed:", await initResp.text()); return null; }
  const { media_id_string: mediaId } = await initResp.json();

  // APPEND in 5MB chunks
  const chunkSize = 5 * 1024 * 1024;
  for (let i = 0, seg = 0; i < bytes.length; i += chunkSize, seg++) {
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", mediaId);
    form.append("segment_index", seg.toString());
    form.append("media", new Blob([bytes.slice(i, i + chunkSize)], { type: contentType }));
    const appendResp = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: authHeader,
      body: form,
    });
    if (!appendResp.ok) { console.error("X video APPEND failed:", await appendResp.text()); return null; }
  }

  // FINALIZE
  const finalResp = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ command: "FINALIZE", media_id: mediaId }).toString(),
  });
  if (!finalResp.ok) { console.error("X video FINALIZE failed:", await finalResp.text()); return null; }
  const finalPayload = await finalResp.json();

  // Poll STATUS if async processing required
  if (finalPayload.processing_info) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const waitMs = (finalPayload.processing_info.check_after_secs ?? 5) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      const statusResp = await fetch(
        `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
        { headers: authHeader },
      );
      const { processing_info } = await statusResp.json();
      if (processing_info?.state === "succeeded") break;
      if (processing_info?.state === "failed") {
        console.error("X video processing failed:", processing_info);
        return null;
      }
    }
  }

  return mediaId;
}

export function requireSupabaseServiceConfig() {
  const supabaseUrl = getEnvValue("SUPABASE_URL");
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }
  return { supabaseUrl, serviceRoleKey };
}
