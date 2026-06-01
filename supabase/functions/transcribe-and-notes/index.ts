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
    const body = await req.json();
    const existingNotes = typeof body.existingNotes === "string" ? body.existingNotes : "";
    const existingImages = body.existingImages && typeof body.existingImages === "object" ? body.existingImages : {};
    const existingImageKeys = Object.keys(existingImages);
    const hasExistingNotes = existingNotes.trim().length > 0;

    // Support both single audioBase64 (legacy) and audioSegments array
    let segments: string[] = [];
    if (body.audioSegments && Array.isArray(body.audioSegments)) {
      segments = body.audioSegments;
    } else if (body.audioBase64) {
      segments = [body.audioBase64];
    }

    if (segments.length === 0) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Lovable API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Transcribe each audio segment
    console.log(`Transcribing ${segments.length} audio segment(s)...`);
    const transcripts: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      console.log(`Transcribing segment ${i + 1}/${segments.length}...`);
      const transcribeRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a precise transcription assistant. Transcribe the audio exactly as spoken. Include speaker labels if multiple speakers are detected (e.g., Speaker 1:, Speaker 2:). Output ONLY the transcript text, nothing else.",
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: segments[i],
                    format: "webm",
                  },
                },
                {
                  type: "text",
                  text: "Transcribe this audio precisely. Include speaker labels if there are multiple speakers.",
                },
              ],
            },
          ],
        }),
      });

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text();
        console.error("Transcription error:", transcribeRes.status, errText);
        if (transcribeRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (transcribeRes.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `Transcription failed for segment ${i + 1}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.choices?.[0]?.message?.content;
      if (transcript && transcript.trim().length > 0) {
        transcripts.push(transcript.trim());
      }
    }

    if (transcripts.length === 0) {
      return new Response(JSON.stringify({ error: "No speech detected in any audio segment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combine all transcripts with segment markers
    const combinedTranscript = transcripts.length === 1
      ? transcripts[0]
      : transcripts.map((t, i) => `[Segment ${i + 1}]\n${t}`).join("\n\n");

    console.log("Combined transcript length:", combinedTranscript.length);

    // Step 2: Convert transcript to notes
    console.log("Generating notes...");
    const notesSystemPrompt = hasExistingNotes
      ? `You are a precise note-taking assistant. Update the user's existing lecture notes in Markdown using the FULL lecture transcript.

CRITICAL RULE: The transcript is the source of truth. Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or expand on anything.

The transcript may contain multiple segments recorded at different times from the same lecture. Treat them as one continuous lecture and produce one unified set of notes.

Important rules:
- Preserve any existing image placeholders exactly as they appear, such as ${existingImageKeys.length > 0 ? existingImageKeys.join(", ") : "{{EXISTING_IMAGE_1}}"}
- Do not remove, rename, or duplicate existing image placeholders
- If the structure changes, keep each placeholder in the closest relevant section
- Keep the notes concise and easy to study
- Use clear headings (## and ###) and bullet points
- Highlight important terms with **bold**
- Include a "Key Takeaways" section only for content explicitly covered
- Include a "Glossary" section only if technical terms were actually used`
      : `You are a precise note-taking assistant. Convert lecture transcripts into well-structured study notes in Markdown format.

CRITICAL RULE: Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or expand on anything. If something was said in one sentence, it should be one bullet point — not a paragraph. The notes should be a faithful, condensed reflection of ONLY what was spoken.

The transcript may contain multiple segments recorded at different times from the same lecture. Treat them as one continuous lecture and produce unified, cohesive notes — do NOT separate by segment.

Rules:
- Use clear headings (## and ###) to organize by topic
- Use bullet points for key concepts
- Highlight important terms with **bold**
- Include any formulas, code, or technical details mentioned
- Add a "Key Takeaways" section at the end summarizing ONLY what was covered
- Add a "Glossary" section if technical terms were ACTUALLY used in the transcript
- If speakers are identified, attribute key points to them
- Format for easy Notion import (clean Markdown)
- Short transcript = short notes. Never pad or stretch content.`;

    const notesUserPrompt = hasExistingNotes
      ? `Existing lecture notes (for structure and image placement):\n\n${existingNotes}\n\nFull lecture transcript (source of truth):\n\n${combinedTranscript}\n\nUpdate the notes so they reflect the full transcript while preserving every existing image placeholder exactly.`
      : `Convert this lecture transcript into well-structured study notes:\n\n${combinedTranscript}`;

    const notesRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: notesSystemPrompt,
          },
          {
            role: "user",
            content: notesUserPrompt,
          },
        ],
      }),
    });

    if (!notesRes.ok) {
      if (notesRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (notesRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await notesRes.text();
      console.error("Notes generation error:", notesRes.status, errText);
      return new Response(JSON.stringify({ error: "Note generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notesData = await notesRes.json();
    let notes = notesData.choices?.[0]?.message?.content || "No notes generated";

    if (existingImageKeys.length > 0) {
      notes = restoreExistingImages(notes, existingImages as Record<string, string>);
    }

    return new Response(JSON.stringify({ notes, transcript: combinedTranscript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function restoreExistingImages(markdown: string, existingImages: Record<string, string>) {
  let restored = markdown;
  const missingImages: string[] = [];

  for (const [placeholder, imageTag] of Object.entries(existingImages)) {
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
