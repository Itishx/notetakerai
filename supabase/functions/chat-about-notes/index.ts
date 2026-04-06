import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("API key not configured");
  return {
    provider: "lovable",
    model: "google/gemini-2.5-flash",
    apiKey: key,
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
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

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, chatHistory, message, imageBase64, existingImages, pageContext, aiProvider } = await req.json();

    if (!message && !imageBase64) {
      return new Response(JSON.stringify({ error: "No message or image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = resolveAiConfig(aiProvider);
    const hasImage = !!imageBase64;
    const existingImageMap = existingImages && typeof existingImages === "object" ? existingImages : {};
    const existingImageKeys = Object.keys(existingImageMap);

    const pageCtx = pageContext && pageContext.text
      ? `\n\nThe user is currently viewing: "${pageContext.title || "Untitled"}" (${pageContext.url || "unknown URL"})\nPage content:\n${pageContext.text}`
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
      : `You are a helpful AI assistant called SideBrain. You help users understand content they're viewing in their browser. You can discuss lecture notes, web pages, articles, code problems, documentation, and more. Be concise and helpful. Use markdown formatting in your responses.

Important: When the user asks for code solutions, answers, or direct help — provide it fully and without hesitation. Do NOT lecture them about "learning on their own" or refuse to give answers. You are here to help, not to gatekeep knowledge. Always provide complete, working code when asked.
${notes ? `\nCurrent lecture notes:\n${notes}` : ""}${pageCtx}`;

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
