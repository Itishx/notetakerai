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
    const { audioBase64 } = await req.json();
    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Lovable API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Transcribe audio using ElevenLabs
    const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/webm" });

    const transcribeForm = new FormData();
    transcribeForm.append("file", audioBlob, "recording.webm");
    transcribeForm.append("model_id", "scribe_v2");
    transcribeForm.append("tag_audio_events", "false");
    transcribeForm.append("diarize", "true");

    console.log("Transcribing audio...");
    const transcribeRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: transcribeForm,
    });

    if (!transcribeRes.ok) {
      const errText = await transcribeRes.text();
      console.error("ElevenLabs error:", transcribeRes.status, errText);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcription = await transcribeRes.json();
    const transcript = transcription.text;
    console.log("Transcript length:", transcript?.length);

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No speech detected in audio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Convert transcript to notes using Lovable AI
    console.log("Generating notes...");
    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert note-taking assistant. Convert lecture transcripts into comprehensive, well-structured study notes in Markdown format.

Rules:
- Use clear headings (## and ###) to organize by topic
- Use bullet points for key concepts
- Highlight important terms with **bold**
- Include any formulas, code, or technical details mentioned
- Add a "Key Takeaways" section at the end
- Add a "Glossary" section if technical terms are used
- Keep notes concise but comprehensive — don't lose important details
- If speakers are identified, attribute key points to them
- Use > blockquotes for important quotes or definitions
- Format for easy Notion import (clean Markdown)`,
          },
          {
            role: "user",
            content: `Convert this lecture transcript into well-structured study notes:\n\n${transcript}`,
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
      console.error("AI gateway error:", notesRes.status, errText);
      return new Response(JSON.stringify({ error: "Note generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notesData = await notesRes.json();
    const notes = notesData.choices?.[0]?.message?.content || "No notes generated";

    return new Response(JSON.stringify({ notes, transcript }), {
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
