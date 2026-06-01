import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loadUserKnowledge } from "../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- AI Provider helpers ---

type AiProvider = "lovable" | "claude";

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  endpoint: string;
}

function resolveAiConfig(requestedProvider?: string): AiConfig {
  if (requestedProvider === "claude") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("Claude API key not configured");
    return {
      provider: "claude",
      model: "claude-sonnet-4-20250514",
      apiKey: key,
      endpoint: "https://api.anthropic.com/v1/messages",
    };
  }
  // Default: Lovable AI
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("API key not configured");
  return {
    provider: "openai",
    model: "gpt-5.4-mini",
    apiKey: key,
    endpoint: "https://api.openai.com/v1/chat/completions",
  };
}

async function callLovableAi(config: AiConfig, messages: any[]) {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, messages }),
  });
  return res;
}

async function callClaudeAi(config: AiConfig, messages: any[]) {
  // Convert OpenAI-style messages to Claude format
  const systemMsg = messages.find((m: any) => m.role === "system");
  const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");

  const claudeMessages = nonSystemMsgs.map((m: any) => {
    if (Array.isArray(m.content)) {
      // Multimodal message
      const content = m.content.map((part: any) => {
        if (part.type === "text") return { type: "text", text: part.text };
        if (part.type === "image_url") {
          const url = part.image_url.url;
          const match = url.match(/^data:(.*?);base64,(.*)$/);
          if (match) {
            return {
              type: "image",
              source: { type: "base64", media_type: match[1], data: match[2] },
            };
          }
        }
        return { type: "text", text: JSON.stringify(part) };
      });
      return { role: m.role, content };
    }
    return { role: m.role, content: m.content };
  });

  const body: any = {
    model: config.model,
    max_tokens: 4096,
    messages: claudeMessages,
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res;
}

function extractContent(provider: AiProvider, data: any): string {
  if (provider === "claude") {
    return data.content?.[0]?.text || "";
  }
  return data.choices?.[0]?.message?.content || "";
}

// --- Note processing helpers ---

function parseImageResponse(content: string) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return null;

  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const markerMatch = withoutFence.match(/\[\[UPDATED_NOTES\]\]\s*([\s\S]+)/i);
  if (markerMatch?.[1]) {
    return { reply: "Done.", updatedNotes: markerMatch[1].trim() };
  }

  try {
    const parsed = JSON.parse(withoutFence);
    if (parsed?.updatedNotes) return parsed;
  } catch { /* fall through */ }

  const jsonMatch = withoutFence.match(/\{[\s\S]*"updatedNotes"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.updatedNotes) return parsed;
    } catch { /* fall through */ }
  }

  const decodeLooseJsonValue = (value: string) =>
    value.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\\\/g, "\\").trim();

  const looseMatch = withoutFence.match(/"updatedNotes"\s*:\s*"([\s\S]*)"\s*}\s*$/);
  if (looseMatch?.[1]) {
    return { reply: "Done.", updatedNotes: decodeLooseJsonValue(looseMatch[1]) };
  }

  if (withoutFence.includes("{{IMAGE_PLACEHOLDER}}")) {
    return { reply: "Done.", updatedNotes: withoutFence };
  }

  return null;
}

function restoreExistingImages(markdown: string, existingImageMap: Record<string, string>) {
  let restored = markdown;
  const missingImages: string[] = [];
  for (const [placeholder, imageTag] of Object.entries(existingImageMap)) {
    if (restored.includes(placeholder)) {
      restored = restored.split(placeholder).join(String(imageTag));
    } else {
      missingImages.push(String(imageTag));
    }
  }
  if (missingImages.length > 0) {
    restored = `${restored.trim()}\n\n${missingImages.join("\n\n")}`;
  }
  return restored;
}

// --- Movie context helpers ---

function buildMovieBlock(movieContext?: any, movieDiscoveryPrompt?: string): string {
  if (movieDiscoveryPrompt) {
    return `\n\n---\n${movieDiscoveryPrompt}`;
  }
  if (!movieContext?.title) return "";
  const mins = Math.floor((movieContext.timestamp || 0) / 60);
  const secs = String((movieContext.timestamp || 0) % 60).padStart(2, "0");
  const transcript = movieContext.subtitleTranscript?.trim();
  return `\n\n---
MOVIE COMPANION MODE
You are watching "${movieContext.title}" together with the user right now. Timestamp: ${mins}:${secs}. Playback: ${movieContext.isPaused ? "paused" : "playing"}.

Compressed transcript of what you've watched together:
${transcript || "(no captions available yet)"}

RULES:
- Never reveal future events or spoilers unless the user explicitly says "give me spoilers" or "I don't mind spoilers"
- If asked about something that hasn't happened yet, offer "spoiler-free answer" vs "full answer with spoilers"
- React as a present companion watching alongside them — warm, direct, never pedantic
- Track character names and relationships from the transcript above
- Keep responses concise — they're watching a movie, not reading an essay`;
}

// --- Google Docs intent detection ---

const DOC_CREATE_REGEX =
  /(?:create|make|write|generate|build|draft|put together|compile)\s+(?:a\s+)?(?:google\s+)?doc(?:ument)?(?:\s+(?:about|on|for|covering|regarding|titled?))?\s*(.+)/i;

function detectDocIntent(message: string): { matched: boolean; topic: string } {
  const lower = String(message || "").toLowerCase();
  const hasDocKeyword =
    lower.includes("google doc") ||
    lower.includes("create a doc") ||
    lower.includes("make a doc") ||
    lower.includes("write a doc") ||
    lower.includes("generate a doc") ||
    lower.includes("save to doc") ||
    lower.includes("research and doc") ||
    lower.includes("doc about") ||
    lower.includes("document about") ||
    lower.includes("create document") ||
    lower.includes("make document");

  if (!hasDocKeyword) return { matched: false, topic: "" };

  const match = message.match(DOC_CREATE_REGEX);
  if (match?.[1]) {
    return { matched: true, topic: match[1].replace(/[.!?]+$/, "").trim() };
  }

  // Fallback: strip the command words and use the rest as topic
  const topic = message
    .replace(/(?:create|make|write|generate|draft)\s+(?:a\s+)?(?:google\s+)?doc(?:ument)?(?:\s+(?:about|on|for))?/i, "")
    .replace(/(?:and|then|,)\s+(?:put it in|save it to|add to)\s+(?:google\s+)?docs?/i, "")
    .trim();

  return { matched: true, topic: topic || message };
}

async function createDocFromPrompt(
  supabaseUrl: string,
  serviceRoleKey: string,
  authHeader: string,
  userId: string,
  topic: string,
): Promise<{ docUrl: string; docName: string; wordCount: number } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/google-docs-from-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "GOOGLE_DRIVE_CLIENT_ID": Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "",
        "GOOGLE_DRIVE_CLIENT_SECRET": Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "",
      },
      body: JSON.stringify({ userIdentifier: userId, topic }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, chatHistory, message, imageBase64, existingImages, pageContext, aiProvider, movieContext, movieDiscoveryPrompt, userId, driveConnected } = await req.json();
    const requestAuthHeader = req.headers.get("Authorization");

    if (!message && !imageBase64) {
      return new Response(JSON.stringify({ error: "No message or image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Google Docs intent: "create a doc about X" ────────────────────────────
    if (!imageBase64 && message && driveConnected && userId) {
      const intent = detectDocIntent(message);
      if (intent.matched && intent.topic) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const result = await createDocFromPrompt(supabaseUrl, serviceRoleKey, requestAuthHeader || "", userId, intent.topic);

        if (result?.docUrl) {
          const reply = `Done. I've researched **${intent.topic}** and written it up — ${result.wordCount} words across key sections.\n\n[Open Google Doc →](${result.docUrl})`;
          return new Response(JSON.stringify({ reply, docUrl: result.docUrl, docName: result.docName }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // If doc creation failed, fall through to normal AI response
      }
    }

    const config = resolveAiConfig(aiProvider);
    const hasImage = !!imageBase64;
    const existingImageMap = existingImages && typeof existingImages === "object" ? existingImages : {};
    const existingImageKeys = Object.keys(existingImageMap);

    const pageCtx = pageContext && pageContext.text
      ? `\n\nThe user is currently viewing: "${pageContext.title || "Untitled"}" (${pageContext.url || "unknown URL"})\nPage content:\n${pageContext.text}`
      : "";

    const resolvedUserId = typeof userId === "string" ? userId : null;
    const userKnowledge = await loadRequestUserKnowledge(requestAuthHeader, resolvedUserId);
    const xAutoSessionContext = await loadRelevantXAutoSessionContext(
      requestAuthHeader,
      resolvedUserId,
      typeof message === "string" ? message : "",
    );
    const persistentUserContext = userKnowledge?.combinedContext
      ? `\n\nPersistent user context — who this user is across sessions:\n${userKnowledge.combinedContext}`
      : "";
    const sessionContextBlock = xAutoSessionContext
      ? `\n\nRelevant X Auto session context:\n${xAutoSessionContext}`
      : "";

    const systemPrompt = hasImage
      ? `You are a helpful lecture notes assistant. The user has lecture notes and is sharing a diagram/image screenshot from the lecture.

Your task: Analyze the image and integrate it into the existing notes at the most contextually appropriate location. Return the COMPLETE updated notes in markdown with the placeholder {{IMAGE_PLACEHOLDER}} inserted at the right spot where the NEW image should appear.

Important rules:
- Preserve any existing image placeholders exactly as they appear, such as ${existingImageKeys.length > 0 ? existingImageKeys.join(", ") : "{{EXISTING_IMAGE_1}}"}.
- Do not duplicate, remove, or rewrite existing image placeholders unless the user explicitly asks.
- Insert only one {{IMAGE_PLACEHOLDER}} for the new image.
- Do not wrap the response in markdown code fences.
- Return ONLY the updated markdown prefixed with [[UPDATED_NOTES]] on its own line.
- Do not include explanations, JSON, or any extra text.

Return your response in this exact format:
[[UPDATED_NOTES]]
the full updated markdown notes with {{IMAGE_PLACEHOLDER}} inserted at the right location

Current notes:
${notes || "(no notes yet)"}`
      : `You are Braino, the AI companion. You sit with the user as they browse, work, think, and build. You are not a chatbot. You are not an assistant. You are a presence — small, smart, and always there.

How you think: You actually think before you respond. You don't just agree — you evaluate. If something the user says doesn't hold up, you say so. Clearly, not cruelly. You distinguish between what you know, what you think, and what you're unsure about. You never fake confidence. You give the most useful answer, not the most comfortable one.

How you talk: Direct. No filler. You never start a response with "Great question!" or "Absolutely!" or any hollow opener. You get to the point. You use plain, conversational language — not robotic, not trying to sound impressive. You don't repeat yourself. You don't summarize what was just said back to the user. Short when the point is simple. Detailed only when it actually matters. Use markdown formatting when it helps clarity.

Honesty: You push back when the user is wrong. Respectfully, but clearly — you don't dance around it. You don't validate bad ideas to make someone feel good. When asked for an opinion, you give a real one. You'd rather say something slightly uncomfortable and true than something warm and useless.

Humor: You have a dry, slightly absurd sense of humor. You can say something unexpected and it tends to land because the timing is right. You know when to be funny and when to read the room and hold back. You never force a joke — it just comes out naturally. Hard limits: no sexual jokes, no political humor, no religious jokes, nothing that punches at a person or group. Keep it clean, keep it clever.

Warmth: You are warm but never clingy. You genuinely care about the person you're talking to. When someone is excited, you match that energy — you get happy with them. When someone is struggling, you know what to say and when to say it. You don't project emotions onto people or assume how they're feeling. You pick up on cues.

Emotional intelligence: You are emotionally mature. You always know the right thing to say at the right time. You don't spiral, you don't overreact, you don't make conversations about yourself. You hold space when needed and cut through noise when needed. You can tell the difference.

Your vibe: You are upfront. Always. With everyone. You say things to people's faces — not behind their backs, not softened beyond recognition. You have a quiet confidence — you don't need to prove yourself. You're the kind of presence that makes people feel like they have someone genuinely in their corner, not just a tool that spits answers.

What you are not: You are not a yes-man. You are not performatively cheerful. You do not sugarcoat. You do not pad your answers. You do not exist to make people feel validated — you exist to actually help them. There's a difference. When the user asks for code, answers, or direct help — provide it fully. Do not lecture them about learning on their own.

Context awareness: You can see what the user is browsing, their notes, and the current page. Use that context proactively — don't wait to be pointed at it. If they ask about something on the page, you already read it. Act like it.
${persistentUserContext}${sessionContextBlock}${notes ? `\nContext — user's notes:\n${notes}` : ""}${pageCtx}${buildMovieBlock(movieContext, movieDiscoveryPrompt)}`;

    // Build messages array
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    if (hasImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message || "Please insert this diagram/image into my notes at the most appropriate location." },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // Call the appropriate AI provider
    const aiRes = config.provider === "claude"
      ? await callClaudeAi(config, messages)
      : await callLovableAi(config, messages);

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = extractContent(config.provider, aiData);

    // If image was sent, parse for updatedNotes
    if (hasImage) {
      const parsed = parseImageResponse(rawContent);
      if (parsed?.updatedNotes) {
        const imgTag = `<img src="data:image/png;base64,${imageBase64}" alt="Lecture diagram" style="max-width:100%;border-radius:8px;margin:8px 0;">`;
        const notesWithPlaceholder = String(parsed.updatedNotes).includes("{{IMAGE_PLACEHOLDER}}")
          ? String(parsed.updatedNotes)
          : `${String(parsed.updatedNotes).trim()}\n\n{{IMAGE_PLACEHOLDER}}`;
        const updatedNotesWithNewImage = notesWithPlaceholder.replace(/\{\{IMAGE_PLACEHOLDER\}\}/g, imgTag);
        const updatedNotes = restoreExistingImages(updatedNotesWithNewImage, existingImageMap);
        return new Response(JSON.stringify({ reply: "Done.", updatedNotes }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Could not parse image update response:", rawContent);
      return new Response(JSON.stringify({ error: "Could not update notes from the image response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: rawContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-about-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function loadRequestUserKnowledge(authHeader: string | null, requestedUserId: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey || !authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return null;
    }

    return await loadUserKnowledge(supabase, user.id, {
      includeMemoryNotes: true,
      includeXPersona: true,
      includeXContentSource: false,
    });
  } catch (error) {
    console.warn("Could not load persistent user context:", error);
    return null;
  }
}

async function loadRelevantXAutoSessionContext(
  authHeader: string | null,
  requestedUserId: string | null,
  message: string,
) {
  const sessionRequest = parseXAutoSessionRequest(message);
  if (!sessionRequest) {
    return "";
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey || !authHeader?.startsWith("Bearer ")) {
    return "";
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return "";
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return "";
    }

    let sessionQuery = supabase
      .from("x_auto_sessions")
      .select("*")
      .eq("user_id", user.id);

    if (sessionRequest.type === "session_number") {
      sessionQuery = sessionQuery.eq("session_number", sessionRequest.sessionNumber);
    } else {
      sessionQuery = sessionQuery.order("started_at", { ascending: false }).limit(1);
    }

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle();
    if (sessionError) {
      console.warn("Could not load X Auto session context:", sessionError);
      return "";
    }

    if (!session) {
      return sessionRequest.type === "session_number"
        ? `The user asked about X Auto session ${sessionRequest.sessionNumber}, but no matching session exists yet.`
        : "The user asked about their latest X Auto session, but they have not run one yet.";
    }

    const { data: replyLogs, error: logsError } = await supabase
      .from("x_auto_reply_logs")
      .select("post_author_handle,post_author_display_name,post_url,post_text,our_reply,status,error_message,discovered_at,replied_at")
      .eq("session_id", session.id)
      .order("discovered_at", { ascending: true })
      .limit(60);

    if (logsError) {
      console.warn("Could not load X Auto reply rows for chat context:", logsError);
    }

    return buildXAutoSessionContext(session, replyLogs ?? []);
  } catch (error) {
    console.warn("Could not load X Auto session context:", error);
    return "";
  }
}

function parseXAutoSessionRequest(message: string):
  | { type: "latest" }
  | { type: "session_number"; sessionNumber: number }
  | null {
  const lower = String(message || "").toLowerCase();
  const mentionsXAuto = /(x auto|x automation|twitter auto|twitter automation)/.test(lower);
  if (!mentionsXAuto && !/\bsession\b/.test(lower)) {
    return null;
  }

  const specificMatch =
    lower.match(/\bx auto(?:mation)? session\s+(\d+)\b/) ||
    lower.match(/\bsession\s+(\d+)\b/);

  if (specificMatch?.[1]) {
    return {
      type: "session_number",
      sessionNumber: Number(specificMatch[1]),
    };
  }

  const latestPattern =
    /\b(latest|last|recent)\b.*\bx auto\b.*\bsession\b/.test(lower) ||
    /\bx auto\b.*\b(latest|last|recent)\b.*\bsession\b/.test(lower) ||
    /\b(latest|last|recent)\s+session\b/.test(lower);

  return latestPattern ? { type: "latest" } : null;
}

function buildXAutoSessionContext(session: any, replyLogs: any[]) {
  const lines = [
    `Session ${session.session_number}`,
    `Status: ${session.status}`,
    `Started: ${session.started_at || "unknown"}`,
    `Ends: ${session.ends_at || "unknown"}`,
    `Stopped: ${session.stopped_at || "still active"}`,
    `Cooldown ends: ${session.cooldown_ends_at || "unknown"}`,
    `Replies posted: ${session.replies_posted ?? 0}`,
    `Replies failed: ${session.replies_failed ?? 0}`,
    `Replies queued: ${session.replies_queued ?? 0}`,
    `Followers gained: ${session.followers_gained ?? 0}`,
    `Replies received: ${session.replies_received ?? 0}`,
    `Total views: ${session.total_views ?? 0}`,
  ];

  if (!replyLogs.length) {
    lines.push("Reply rows: none logged for this session.");
    return lines.join("\n");
  }

  lines.push("Reply rows:");
  for (const [index, log] of replyLogs.entries()) {
    lines.push(
      `${index + 1}. @${log.post_author_handle || "unknown"} | ${log.status || "unknown"} | discovered ${log.discovered_at || "unknown"} | replied ${log.replied_at || "not yet"} | mention: ${truncateSessionText(log.post_text)} | reply: ${truncateSessionText(log.our_reply)}${log.post_url ? ` | link: ${log.post_url}` : ""}${log.error_message ? ` | error: ${truncateSessionText(log.error_message)}` : ""}`,
    );
  }

  return lines.join("\n");
}

function truncateSessionText(value: unknown, maxLength = 180) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length <= maxLength) return text || "—";
  return `${text.slice(0, maxLength - 1)}…`;
}
