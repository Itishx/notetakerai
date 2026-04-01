import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, chatHistory, message, imageBase64, existingImages, pageContext } = await req.json();

    if (!message && !imageBase64) {
      return new Response(JSON.stringify({ error: "No message or image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasImage = !!imageBase64;
    const existingImageMap = existingImages && typeof existingImages === "object" ? existingImages : {};
    const existingImageKeys = Object.keys(existingImageMap);

    // Build page context string if available
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
${notes ? `\nCurrent lecture notes:\n${notes}` : ""}${pageCtx}`;

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add chat history
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const parseImageResponse = (content: string) => {
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
        if (parsed?.updatedNotes) {
          return parsed;
        }
      } catch {
        // Fall through to tolerant parsing.
      }

      const jsonMatch = withoutFence.match(/\{[\s\S]*"updatedNotes"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.updatedNotes) {
            return parsed;
          }
        } catch {
          // Fall through to tolerant parsing.
        }
      }

      const decodeLooseJsonValue = (value: string) => value
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\")
        .trim();

      const looseUpdatedNotesMatch = withoutFence.match(/"updatedNotes"\s*:\s*"([\s\S]*)"\s*}\s*$/);
      if (looseUpdatedNotesMatch?.[1]) {
        return {
          reply: "Done.",
          updatedNotes: decodeLooseJsonValue(looseUpdatedNotesMatch[1]),
        };
      }

      if (withoutFence.includes("{{IMAGE_PLACEHOLDER}}")) {
        return { reply: "Done.", updatedNotes: withoutFence };
      }

      return null;
    };

    const restoreExistingImages = (markdown: string) => {
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
    };

    // If image was sent, try to parse JSON response for updatedNotes
    if (hasImage) {
      const parsed = parseImageResponse(rawContent);

      if (parsed?.updatedNotes) {
        const imgTag = `<img src="data:image/png;base64,${imageBase64}" alt="Lecture diagram" style="max-width:100%;border-radius:8px;margin:8px 0;">`;
        const notesWithPlaceholder = String(parsed.updatedNotes).includes("{{IMAGE_PLACEHOLDER}}")
          ? String(parsed.updatedNotes)
          : `${String(parsed.updatedNotes).trim()}\n\n{{IMAGE_PLACEHOLDER}}`;
        const updatedNotesWithNewImage = notesWithPlaceholder.replace(/\{\{IMAGE_PLACEHOLDER\}\}/g, imgTag);
        const updatedNotes = restoreExistingImages(updatedNotesWithNewImage);

        return new Response(JSON.stringify({ reply: "Done.", updatedNotes }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("Could not parse image update response:", rawContent);
      return new Response(JSON.stringify({ error: "Could not update notes from the image response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: rawContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-about-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
