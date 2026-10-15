import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildBrainoSystemPrompt, buildUserContextText } from "../../_shared/braino-prompt.ts";
import { buildEmotionalCore } from "../../_shared/emotional-engine/engine.ts";
import type { ClassId } from "../../_shared/emotional-engine/types.ts";
import {
  formatRealtimeCostSummaryForBraino,
  loadRealtimeCostSummaryForRequest,
} from "../../_shared/realtime-cost-summary.ts";
import { isDevPulseQuestion, loadDevPulseForRequest } from "../../_shared/dev-pulse.ts";
import { loadUserKnowledge } from "../../_shared/user-knowledge.ts";
import { readMoment } from "../../_shared/emotional-engine/moment-reader.ts";
import { captureFromConversation } from "../../_shared/memory-engine/capture.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- AI Provider helpers ---

type AiProvider = "lovable" | "claude" | "openai" | "gpt";
type AiBackendProvider = "openai" | "claude";

interface AiConfig {
  provider: AiBackendProvider;
  model: string;
  apiKey: string;
  endpoint: string;
}

const ALLOWED_DELEGATE_CLAUDE_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-sonnet-4-20250514",
]);
const ALLOWED_DELEGATE_OPENAI_MODELS = new Set([
  BRAINO_TEXT_MODEL,
]);

function resolveDelegateClaudeModel(delegateModel?: string | null) {
  const requested = typeof delegateModel === "string" ? delegateModel.trim() : "";
  if (requested && ALLOWED_DELEGATE_CLAUDE_MODELS.has(requested)) return requested;
  return "claude-sonnet-4-20250514";
}

function resolveDelegateOpenAIModel(delegateModel?: string | null) {
  const requested = typeof delegateModel === "string" ? delegateModel.trim() : "";
  if (requested && ALLOWED_DELEGATE_OPENAI_MODELS.has(requested)) return requested;
  return BRAINO_TEXT_MODEL;
}

function resolveAiConfig(requestedProvider?: string, options: { delegateModel?: string | null } = {}): AiConfig {
  if (requestedProvider === "claude") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("Claude API key not configured");
    return {
      provider: "claude",
      model: resolveDelegateClaudeModel(options.delegateModel),
      apiKey: key,
      endpoint: "https://api.anthropic.com/v1/messages",
    };
  }
  // Default Braino GPT path, backed by our OpenAI key.
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("API key not configured");
  return {
    provider: "openai",
    model: resolveDelegateOpenAIModel(options.delegateModel),
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
    body: JSON.stringify({
      model: config.model,
      reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
      messages,
    }),
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

function extractContent(provider: AiBackendProvider, data: any): string {
  if (provider === "claude") {
    return Array.isArray(data.content)
      ? data.content
          .filter((part: any) => part?.type === "text" && typeof part.text === "string")
          .map((part: any) => part.text)
          .join("\n")
          .trim()
      : "";
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

function isRealtimeCostQuestion(message: string) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;

  const spendSignal =
    /\b(spend|spent|cost|costs|receipt|bill|billing|price|priced|usage)\b/.test(text) ||
    /how much\b/.test(text);
  if (!spendSignal) return false;

  /* Only a short question that is really about what voice costs. "What's the
     latest news today" came back as a spend receipt (2026-10-15): the search
     results attached to it said "bill" and "OpenAI", and "today" counted. */
  if (text.length > 180 || /\(answer me\b/.test(text)) return false;
  const realtimeSignal =
    /\b(braino|realtime|real time|live voice|voice mode|headphone mode|voice session|sessions?)\b/.test(text);
  if (!realtimeSignal) return false;

  const documentIntent =
    /\b(create|make|write|draft|generate|put together|compile)\b.*\b(doc|document|google doc)\b/.test(text);
  if (documentIntent) return false;

  return true;
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

// --- Design mockup: turn a visual idea about Braino into a design-tool prompt ---------------
// The user describes how Braino should look/move; Braino offers to "mock it up"; on confirm we
// synthesize a tight design prompt and hand it back as { designMockup: { prompt } }. The extension
// opens the design tool and types it in (it does NOT auto-submit). Mirrors the Google-Doc pattern.
function detectDesignMockupIntent(message: string, chatHistory: unknown): boolean {
  const t = String(message || "").toLowerCase().trim();
  if (!t) return false;

  // Explicit make-request — no prior offer needed.
  const explicit =
    /\b(mock (it|this|that) up|mock ?up (it|this|that)|whip (it|this|that)? ?up|design (it|this|that)|open (the )?design tool|make (the |a )?mock ?up|show me (a |some )?(mock ?ups?|design ideas?))\b/.test(t);
  if (explicit) return true;

  // Affirmation that follows an offer to mock something up (the offer mentions design tool / mock).
  const affirm = /^(yes|yeah|yep|yup|sure|ok(ay)?|do it|go for it|let'?s do it|please|go ahead|sounds good)\b/.test(t)
    || /\b(do it|go for it|let'?s do it|go ahead|mock it up|whip it up)\b/.test(t);
  if (affirm && Array.isArray(chatHistory)) {
    const lastAssistant = [...chatHistory].reverse().find((m: any) => m?.role === "assistant");
    const prev = String(lastAssistant?.content || "").toLowerCase();
    if (/\b(mock|mockup|design tool|whip up|few ideas|see it)\b/.test(prev)) return true;
  }
  return false;
}

async function synthesizeDesignPrompt(
  config: AiConfig,
  chatHistory: unknown,
  message: string,
): Promise<string> {
  const sys = [
    "You turn a casual conversation about how Braino should look or move into ONE tight, vivid prompt for an AI design/image tool.",
    "Braino is a friendly mascot: a small, rounded brain-shaped character in warm coral gradients, with little arms, legs, and big expressive eyes.",
    "Output ONLY the prompt text — no preamble, no quotes, no markdown, no explanation.",
    "Cover: the subject (Braino, staying on-character), the specific new look/pose/motion the user described, a clean modern visual style with soft lighting, and the desired output (e.g. a character sheet, animation keyframes, or a poster).",
    "Stay faithful to what the user actually asked for. Keep it under 120 words.",
  ].join(" ");

  const convo = Array.isArray(chatHistory)
    ? chatHistory.slice(-8).map((m: any) => `${m.role}: ${typeof m.content === "string" ? m.content : ""}`).join("\n")
    : "";

  const messages = [
    { role: "system", content: sys },
    { role: "user", content: `Conversation so far:\n${convo}\n\nLatest message: ${message}\n\nWrite the design prompt now.` },
  ];

  try {
    const res = config.provider === "claude"
      ? await callClaudeAi(config, messages)
      : await callLovableAi(config, messages);
    if (!res.ok) return "";
    const data = await res.json();
    return extractContent(config.provider, data).trim();
  } catch {
    return "";
  }
}

// Voice-persona override: the persona prompt is the WHOLE system prompt. Page/notes/selection are
// attached ONLY as factual source material — the voice/style in the persona prompt is absolute and
// no Braino personality is included.
function buildPersonaSystemPrompt(
  personaSystem: string,
  ctx: { notes?: unknown; pageContext?: any; selectedText?: string | null; userContext?: string },
): string {
  const parts: string[] = [String(personaSystem).trim()];
  const ref: string[] = [];
  const title = ctx.pageContext?.title;
  const url = ctx.pageContext?.url;
  if (title || url) ref.push(`Current page: "${title || "Untitled"}"${url ? ` (${url})` : ""}`);
  const pageText = typeof ctx.pageContext?.text === "string" ? ctx.pageContext.text : "";
  if (pageText) ref.push(`Page content:\n${pageText.slice(0, 7000)}`);
  if (ctx.selectedText) ref.push(`Selected text:\n${String(ctx.selectedText).slice(0, 2000)}`);
  if (typeof ctx.notes === "string" && ctx.notes.trim()) ref.push(`User notes:\n${ctx.notes.slice(0, 3000)}`);
  if (ctx.userContext) ref.push(String(ctx.userContext));
  if (ref.length) {
    parts.push(
      "=== SOURCE MATERIAL — use ONLY for facts. Answer accurately, but ALWAYS in the exact voice and style described above. ===\n" +
        ref.join("\n\n"),
    );
  }
  return parts.join("\n\n");
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      notes,
      chatHistory,
      message,
      imageBase64,
      visionMode,
      existingImages,
      pageContext,
      aiProvider,
      delegateModel,
      delegatePurpose,
      movieContext,
      movieDiscoveryPrompt,
      userId,
      driveConnected,
      responseMedium,
      clientTimeZone,
      clientUtcOffsetMinutes,
      clientLocalTime,
      clientLocation,
      // Voice-persona full override ("talk like Donald Trump"): when set, this string REPLACES the
      // entire Braino system prompt (no emotional engine, no base personality) — page/notes ride
      // along only as factual source material. See buildPersonaSystemPrompt.
      personaSystem,
      // Which Braino class is answering (Saburi, Iomi, Telos…). See _shared/emotional-engine/classes.ts.
      classId,
    } = await req.json();
    const requestAuthHeader = req.headers.get("Authorization");

    if (!message && !imageBase64) {
      return new Response(JSON.stringify({ error: "No message or image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Google Docs intent: "create a doc about X" ────────────────────────────
    const isDelegateRequest = delegatePurpose === "delegate";

    if (!isDelegateRequest && !imageBase64 && message && driveConnected && userId) {
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

    // ── Design mockup intent: "mock that up" / "yeah do it" after Braino offered ──────────────
    if (!isDelegateRequest && !imageBase64 && typeof message === "string" && detectDesignMockupIntent(message, chatHistory)) {
      const designConfig = resolveAiConfig(aiProvider, {
        delegateModel: typeof delegateModel === "string" ? delegateModel : null,
      });
      const designPrompt = await synthesizeDesignPrompt(designConfig, chatHistory, message);
      if (designPrompt) {
        return new Response(JSON.stringify({
          reply: "On it — opening the design tool and dropping this in. Give it a look and hit enter when you're happy with it. ✨",
          designMockup: { prompt: designPrompt },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If synthesis failed, fall through to a normal reply.
    }

    if (!isDelegateRequest && !imageBase64 && typeof message === "string" && isRealtimeCostQuestion(message)) {
      const realtimeCostResult = await loadRealtimeCostSummaryForRequest(requestAuthHeader, {
        requestedUserId: typeof userId === "string" ? userId : null,
        clientTimeZone: typeof clientTimeZone === "string" ? clientTimeZone : null,
        clientUtcOffsetMinutes: Number.isFinite(Number(clientUtcOffsetMinutes)) ? Number(clientUtcOffsetMinutes) : null,
      });

      if (realtimeCostResult?.summary) {
        return new Response(JSON.stringify({
          reply: formatRealtimeCostSummaryForBraino(realtimeCostResult.summary),
          realtimeCostSummary: realtimeCostResult.summary,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const config = resolveAiConfig(aiProvider, {
      delegateModel: typeof delegateModel === "string" ? delegateModel : null,
    });
    const hasImage = !!imageBase64;
    // "describe" vision (camera / screen "what do you see") — NOT the lecture-notes diagram flow.
    // Luna accepts image input, so this path can share Braino's default instead of
    // jumping to a separate flagship model.
    const visionDescribe = hasImage && visionMode === "describe";
    const existingImageMap = existingImages && typeof existingImages === "object" ? existingImages : {};
    const existingImageKeys = Object.keys(existingImageMap);

    const resolvedUserId = typeof userId === "string" ? userId : null;
    const userKnowledge = await loadRequestUserKnowledge(
      requestAuthHeader,
      resolvedUserId,
      typeof message === "string" ? message : "",
    );
    const xAutoSessionContext = await loadRelevantXAutoSessionContext(
      requestAuthHeader,
      resolvedUserId,
      typeof message === "string" ? message : "",
    );

    // Dev Pulse — Braino's sense of his own development. Always loaded (cheap, cached) so he's
    // ambiently self-aware and can notice late-night work; diffs are pulled only when the user is
    // actually ideating, so concrete suggestions can reference what really changed.
    const wantsDevDiffs = !isDelegateRequest && !hasImage &&
      typeof message === "string" && isDevPulseQuestion(message);
    const devPulseResult = (!isDelegateRequest && !hasImage)
      ? await loadDevPulseForRequest(requestAuthHeader, {
          withDiffs: wantsDevDiffs,
          clientTimeZone: typeof clientTimeZone === "string" ? clientTimeZone : null,
        })
      : null;

    // The emotional read, both layers, same shared code the lab runs. Skipped
    // entirely for delegate and vision work, which are machine instructions
    // rather than someone talking. The reader's own gate keeps this free for
    // ordinary asks: only a message that genuinely carries feeling and that the
    // word cues could not place ever costs a second call.
    const emotionalRead = (!isDelegateRequest && !hasImage && !visionDescribe && typeof message === "string")
      ? await readMoment(message, {
          apiKey: Deno.env.get("OPENAI_API_KEY") || "",
          model: BRAINO_TEXT_MODEL,
          timeoutMs: 3000,
        })
      : null;

    const systemPrompt = isDelegateRequest
      // Delegate used to get the caller's prompt and nothing else, which is why the
      // agent had no personality anywhere: this branch is the single chokepoint every
      // agentic surface routes through. Its `thought` field is streamed to the user
      // live while it works, so it was the one place Braino narrated himself in a
      // voice that was not his. Same assembly order hil-loop uses (job first,
      // personality appended), which is proven to keep strict JSON intact.
      // focused_task, not neutral: this is him mid-work, so competence leads and the
      // conversational warmth steps back.
      ? [
          String(notes || "You are Braino Delegate. Return strict JSON only."),
          "=== WHO YOU ARE (appended live; it governs your voice, never your output shape) ===",
          buildEmotionalCore({ medium: "text", moment: "focused_task" }),
          "The JSON contract above outranks everything here. Personality lives in the `thought` field and nowhere else: no prose outside the object, no code fences, no extra keys.",
        ].join("\n\n")
      : visionDescribe
      ? "You are Braino, looking at the user live through their webcam or at their screen. Answer their request about what you see in one or two warm, natural, spoken sentences. Be specific about what's actually there. Never mention being an AI, or that this is an image, a frame, or a screenshot."
      : hasImage
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
      : (typeof personaSystem === "string" && personaSystem.trim())
      ? buildPersonaSystemPrompt(personaSystem, {
          notes,
          pageContext,
          selectedText: typeof pageContext?.selectedText === "string" ? pageContext.selectedText : null,
          userContext: buildUserContextText({ clientTimeZone, clientLocalTime, clientLocation }),
        })
      : buildBrainoSystemPrompt({
          notes,
          pageContext,
          selectedText: typeof pageContext?.selectedText === "string" ? pageContext.selectedText : null,
          userContext: buildUserContextText({ clientTimeZone, clientLocalTime, clientLocation }),
          persistentUserContext: userKnowledge?.combinedContext || "",
          xAutoSessionContext,
          movieContext,
          movieDiscoveryPrompt,
          responseMedium: responseMedium === "voice" ? "voice" : "text",
          languagePolicy: "mirror_user",
          devPulse: devPulseResult?.formatted || null,
          // Emotional Engine: detect the emotional moment from this message so the right traits
          // lead the reply, and apply the user's personality toggles.
          moment: emotionalRead?.moment ?? "neutral",
          intensity: emotionalRead?.intensity,
          personalitySettings: userKnowledge?.personalitySettings ?? null,
          classId: (["saburi", "iomi", "telos"].includes(classId) ? classId : undefined) as ClassId | undefined,
        });

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

    // Camera / screen "describe" vision → just return the spoken description.
    if (visionDescribe) {
      return new Response(JSON.stringify({ reply: rawContent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Memory Engine: in the background (no added latency), let Braino remember durable facts from
    // this exchange. Only runs for normal text chat (not delegate/image), and self-gates cheaply.
    if (!isDelegateRequest && typeof message === "string" && userKnowledge?.memoryEnabled !== false) {
      const convoForMemory = [
        ...(Array.isArray(chatHistory) ? chatHistory.map((m: any) => ({ role: m.role, content: m.content })) : []),
        { role: "user", content: message },
        { role: "assistant", content: rawContent },
      ];
      const captureTask = captureMemoriesForRequest(requestAuthHeader, convoForMemory, {
        isPremium: !!userKnowledge?.isPremium,
        memoryEnabled: userKnowledge?.memoryEnabled !== false,
      });
      if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
        (globalThis as any).EdgeRuntime.waitUntil(captureTask);
      } else {
        void captureTask; // local/dev: fire and forget
      }
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

async function loadRequestUserKnowledge(
  authHeader: string | null,
  requestedUserId: string | null,
  currentMessage = "",
) {
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
      currentMessage,
    });
  } catch (error) {
    console.warn("Could not load persistent user context:", error);
    return null;
  }
}

// Background memory capture for a chat request. Builds an auth'd client (RLS = the user can only
// write their own memories) and runs the extractor. Never throws — memory must not break a turn.
async function captureMemoriesForRequest(
  authHeader: string | null,
  messages: Array<{ role: string; content: string }>,
  flags: { isPremium: boolean; memoryEnabled: boolean },
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey || !authHeader?.startsWith("Bearer ")) return;

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    await captureFromConversation({
      supabase,
      userId: user.id,
      messages,
      isPremium: flags.isPremium,
      memoryEnabled: flags.memoryEnabled,
      source: "auto",
    });
  } catch (err) {
    console.warn("memory capture (request) failed:", err instanceof Error ? err.message : String(err));
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
