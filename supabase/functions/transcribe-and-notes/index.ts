import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTES_MODEL = "gpt-5.4-mini";

type RecordingMode = "lecture" | "meeting";

type AudioSegmentPayload = {
  audioBase64: string;
  fileName: string;
  mimeType: string;
};

type KnownSpeakerReference = {
  name: string;
  audioBase64: string;
  mimeType: string;
};

class OpenAiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode: RecordingMode = body.mode === "meeting" ? "meeting" : "lecture";
    const existingNotes = typeof body.existingNotes === "string" ? body.existingNotes : "";
    const existingImages = body.existingImages && typeof body.existingImages === "object" ? body.existingImages : {};
    const existingImageKeys = Object.keys(existingImages);
    const hasExistingNotes = existingNotes.trim().length > 0;
    const segments = normalizeAudioSegments(body);
    const knownSpeakerReferences = normalizeKnownSpeakerReferences(body.knownSpeakerReferences);

    if (segments.length === 0) {
      return jsonResponse({ error: "No audio data provided" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500);
    }

    console.log(`Transcribing ${segments.length} ${mode} audio segment(s)...`);
    const transcripts: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      try {
        console.log(`Transcribing segment ${i + 1}/${segments.length}...`);
        const transcript = await transcribeSegment({
          segment: segments[i],
          mode,
          knownSpeakerReferences,
          openAiApiKey: OPENAI_API_KEY,
        });
        if (transcript) {
          transcripts.push(transcript);
        }
      } catch (error) {
        if (error instanceof OpenAiRequestError) {
          console.error("Transcription error:", error.status, error.message);
          if (looksLikeNoSpeechError(error.message)) {
            continue;
          }
          if (error.status === 429) {
            return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
          }
          if (error.status === 402) {
            return jsonResponse({ error: "AI credits exhausted. Please add funds." }, 402);
          }
          return jsonResponse({ error: error.message || `Transcription failed for segment ${i + 1}` }, error.status >= 400 && error.status < 600 ? error.status : 500);
        }
        throw error;
      }
    }

    if (transcripts.length === 0) {
      return jsonResponse({ error: "No speech detected in any audio segment" }, 400);
    }

    const combinedTranscript = transcripts.length === 1
      ? transcripts[0]
      : transcripts.map((t, i) => `[Segment ${i + 1}]\n${t}`).join("\n\n");

    console.log("Combined transcript length:", combinedTranscript.length);

    console.log("Generating notes...");
    const { system: notesSystemPrompt, user: notesUserPrompt } = buildNotesPrompts({
      mode,
      hasExistingNotes,
      existingNotes,
      existingImageKeys,
      transcript: combinedTranscript,
    });

    const notesRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NOTES_MODEL,
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
        return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      if (notesRes.status === 402) {
        return jsonResponse({ error: "AI credits exhausted. Please add funds." }, 402);
      }
      const errText = await notesRes.text();
      console.error("Notes generation error:", notesRes.status, errText);
      return jsonResponse({ error: "Note generation failed" }, 500);
    }

    const notesData = await notesRes.json();
    let notes = notesData.choices?.[0]?.message?.content || "No notes generated";

    if (existingImageKeys.length > 0) {
      notes = restoreExistingImages(notes, existingImages as Record<string, string>);
    }

    return jsonResponse({ notes, transcript: combinedTranscript });
  } catch (e) {
    console.error("Function error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeAudioSegments(body: Record<string, unknown>): AudioSegmentPayload[] {
  const rawSegments = Array.isArray(body.audioSegments)
    ? body.audioSegments
    : typeof body.audioBase64 === "string"
      ? [body.audioBase64]
      : [];

  return rawSegments
    .map((segment, index) => normalizeAudioSegment(segment, index))
    .filter((segment): segment is AudioSegmentPayload => Boolean(segment));
}

function normalizeAudioSegment(segment: unknown, index: number): AudioSegmentPayload | null {
  if (typeof segment === "string" && segment.trim()) {
    return {
      audioBase64: segment,
      mimeType: "audio/webm",
      fileName: `segment-${index + 1}.webm`,
    };
  }

  if (!segment || typeof segment !== "object") return null;
  const audioBase64 = typeof (segment as Record<string, unknown>).audioBase64 === "string"
    ? String((segment as Record<string, unknown>).audioBase64).trim()
    : "";
  if (!audioBase64) return null;

  const mimeType = normalizeMimeType((segment as Record<string, unknown>).mimeType, "audio/webm");
  const fileName = typeof (segment as Record<string, unknown>).fileName === "string" && String((segment as Record<string, unknown>).fileName).trim()
    ? String((segment as Record<string, unknown>).fileName).trim()
    : `segment-${index + 1}.${extensionFromMimeType(mimeType)}`;

  return { audioBase64, mimeType, fileName };
}

function normalizeKnownSpeakerReferences(rawValue: unknown): KnownSpeakerReference[] {
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .map((reference, index) => normalizeKnownSpeakerReference(reference, index))
    .filter((reference): reference is KnownSpeakerReference => Boolean(reference));
}

function normalizeKnownSpeakerReference(reference: unknown, index: number): KnownSpeakerReference | null {
  if (!reference || typeof reference !== "object") return null;
  const raw = reference as Record<string, unknown>;
  const audioBase64 = typeof raw.audioBase64 === "string" ? raw.audioBase64.trim() : "";
  if (!audioBase64) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Speaker ${index + 1}`;
  return {
    name,
    audioBase64,
    mimeType: normalizeMimeType(raw.mimeType, "audio/webm"),
  };
}

function normalizeMimeType(value: unknown, fallback: string) {
  const mimeType = typeof value === "string" ? value.trim().toLowerCase() : "";
  return mimeType.startsWith("audio/") ? mimeType : fallback;
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function decodeBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function transcribeSegment({
  segment,
  mode,
  knownSpeakerReferences,
  openAiApiKey,
}: {
  segment: AudioSegmentPayload;
  mode: RecordingMode;
  knownSpeakerReferences: KnownSpeakerReference[];
  openAiApiKey: string;
}) {
  const form = new FormData();
  form.append("file", new Blob([decodeBase64(segment.audioBase64)], { type: segment.mimeType }), segment.fileName);

  if (mode === "meeting") {
    form.append("model", "gpt-4o-transcribe-diarize");
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");
    for (const reference of knownSpeakerReferences) {
      form.append("known_speaker_names", reference.name);
      form.append("known_speaker_references", `data:${reference.mimeType};base64,${reference.audioBase64}`);
    }
  } else {
    form.append("model", "gpt-4o-transcribe");
    form.append("response_format", "json");
  }

  const transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: form,
  });

  if (!transcribeRes.ok) {
    throw new OpenAiRequestError(transcribeRes.status, await readOpenAiError(transcribeRes, "Transcription failed"));
  }

  const transcribeData = await transcribeRes.json();
  return formatTranscript(transcribeData, mode);
}

async function readOpenAiError(response: Response, fallback: string) {
  const raw = await response.text().catch(() => "");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.error || parsed?.details || fallback;
  } catch (_) {
    return raw;
  }
}

function looksLikeNoSpeechError(message: string) {
  const lowered = String(message || "").toLowerCase();
  return (
    lowered.includes("no speech") ||
    lowered.includes("speech was not detected") ||
    lowered.includes("empty audio") ||
    lowered.includes("audio appears to be empty")
  );
}

function formatTranscript(payload: Record<string, unknown>, mode: RecordingMode) {
  if (mode !== "meeting") {
    return typeof payload.text === "string" ? payload.text.trim() : "";
  }

  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  if (!segments.length) {
    return typeof payload.text === "string" ? payload.text.trim() : "";
  }

  const merged: Array<{ speaker: string; text: string }> = [];
  for (const segment of segments) {
    if (!segment || typeof segment !== "object") continue;
    const raw = segment as Record<string, unknown>;
    const speaker = formatSpeakerLabel(raw.speaker);
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${text}`.trim();
    } else {
      merged.push({ speaker, text });
    }
  }

  return merged.map((entry) => `${entry.speaker}: ${entry.text}`).join("\n");
}

function formatSpeakerLabel(rawSpeaker: unknown) {
  const speaker = String(rawSpeaker || "").trim();
  if (!speaker) return "Speaker";
  if (speaker.toLowerCase() === "you") return "You";
  if (/^speaker\b/i.test(speaker)) return speaker;
  if (/^\d+$/.test(speaker)) return `Speaker ${speaker}`;
  return speaker.charAt(0).toUpperCase() + speaker.slice(1);
}

function buildNotesPrompts({
  mode,
  hasExistingNotes,
  existingNotes,
  existingImageKeys,
  transcript,
}: {
  mode: RecordingMode;
  hasExistingNotes: boolean;
  existingNotes: string;
  existingImageKeys: string[];
  transcript: string;
}) {
  if (mode === "meeting") {
    const system = hasExistingNotes
      ? `You are a precise meeting-notes assistant. Update the user's existing meeting notes using the latest transcript segment(s).

CRITICAL RULE: The transcript is the source of truth. Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or guess.

Rules:
- Keep accurate content already present in the existing notes unless the new transcript clearly revises it
- Output clean Markdown
- Prefer these sections when relevant: ## Summary, ## Key Discussion Points, ## Decisions, ## Action Items, ## Open Questions
- Only include action items that were explicitly mentioned
- Only include an owner when the transcript explicitly identifies one
- Use speaker labels when they help clarify who said what
- Keep the notes concise and skimmable
- Short transcript = short notes. Never pad or stretch content.`
      : `You are a precise meeting-notes assistant. Convert meeting transcripts into clean Markdown notes.

CRITICAL RULE: Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or guess. If the transcript does not contain an action item, do not invent one.

Rules:
- Output clean Markdown
- Prefer these sections when relevant: ## Summary, ## Key Discussion Points, ## Decisions, ## Action Items, ## Open Questions
- Use short bullet points
- Only include action items that were explicitly mentioned
- Only include an owner when the transcript explicitly identifies one
- Use speaker labels when they help clarify who said what
- Keep the notes concise and skimmable
- Short transcript = short notes. Never pad or stretch content.`;

    const user = hasExistingNotes
      ? `Existing meeting notes:\n\n${existingNotes}\n\nLatest transcript segment(s):\n\n${transcript}\n\nUpdate the meeting notes so they stay accurate and incorporate the new transcript.`
      : `Convert this meeting transcript into structured meeting notes:\n\n${transcript}`;

    return { system, user };
  }

  const system = hasExistingNotes
    ? `You are a precise note-taking assistant. Update the user's existing lecture notes using the latest transcript segment(s).

CRITICAL RULE: The transcript is the source of truth for the new material. Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or expand on anything.

Rules:
- Preserve any existing image placeholders exactly as they appear, such as ${existingImageKeys.length > 0 ? existingImageKeys.join(", ") : "{{EXISTING_IMAGE_1}}"}
- Do not remove, rename, or duplicate existing image placeholders
- Keep accurate content already present in the existing notes unless the new transcript clearly revises it
- If the structure changes, keep each placeholder in the closest relevant section
- Keep the notes concise and easy to study
- Use clear headings (## and ###) and bullet points
- Highlight important terms with **bold**
- Include a "Key Takeaways" section only for content explicitly covered
- Include a "Glossary" section only if technical terms were actually used`
    : `You are a precise note-taking assistant. Convert lecture transcripts into well-structured study notes in Markdown format.

CRITICAL RULE: Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or expand on anything. If something was said in one sentence, it should be one bullet point — not a paragraph. The notes should be a faithful, condensed reflection of ONLY what was spoken.

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

  const user = hasExistingNotes
    ? `Existing lecture notes (for structure and image placement):\n\n${existingNotes}\n\nLatest transcript segment(s):\n\n${transcript}\n\nUpdate the notes so they reflect the new transcript while preserving every existing image placeholder exactly.`
    : `Convert this lecture transcript into well-structured study notes:\n\n${transcript}`;

  return { system, user };
}

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
