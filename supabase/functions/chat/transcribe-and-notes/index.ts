import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

/* Words Itish says that a transcriber would otherwise turn into "Bloom" or "hairajah". */
const DICTATION_VOCABULARY = "Braino, BrainoHERA, HERA, Braino Mac, Wispr Flow, Itish, Affective, AffectiveOS, Laya, Mesa, Supabase, Claude, Cursor, WhatsApp. Natural spoken English, sometimes with Hindi words.";
import {
  buildMeetingCaptionTranscript,
  labelMicEntries,
  meetingContextHasCaptionText,
  mergeTranscriptStreams,
  nameTranscriptEntries,
  normalizeMeetingContext,
  parseDiarizedEntries,
  speakerVocabularyHint,
  transcriptEntriesToText,
} from "../../_shared/meeting-speakers.ts";
import type { MeetingContext, TranscriptEntry } from "../../_shared/meeting-speakers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTES_MODEL = BRAINO_TEXT_MODEL;

type RecordingMode = "lecture" | "meeting";

/** Which side of the conversation an upload came from. "system" is the call coming out of
 *  your speakers, "mic" is you going in, "mixed" is the old single blended stream that
 *  destroyed the distinction before the recorder ever got to it. */
type AudioStreamRole = "system" | "mic" | "mixed";

type AudioSegmentPayload = {
  audioBase64: string;
  fileName: string;
  mimeType: string;
  role: AudioStreamRole;
};

type KnownSpeakerReference = {
  name: string;
  audioBase64: string;
  mimeType: string;
};

type MeetingActionItem = {
  task: string;
  owner: string;
  dueDateText: string;
  dueDateIso: string;
  sourceQuote: string;
};

type MeetingFollowUp = {
  summary: string;
  attendeeName: string;
  attendees: string[];
  dateText: string;
  dateIso: string;
  timeText: string;
  durationMinutes: number;
  sourceQuote: string;
};

type MeetingArtifacts = {
  actionItems: MeetingActionItem[];
  followUps: MeetingFollowUp[];
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
    // Opt-in: absent for lectures and meetings, "en" for the Mac's command mic.
    const requestedLanguage = typeof body.language === "string" && /^[a-z]{2}$/.test(body.language)
      ? body.language
      : undefined;
    const existingNotes = typeof body.existingNotes === "string" ? body.existingNotes : "";
    const existingTranscript = typeof body.existingTranscript === "string" ? body.existingTranscript.trim() : "";
    const existingImages = body.existingImages && typeof body.existingImages === "object" ? body.existingImages : {};
    const existingImageKeys = Object.keys(existingImages);
    const hasExistingNotes = existingNotes.trim().length > 0;
    const clientNow = typeof body.clientNow === "string" && body.clientNow.trim() ? body.clientNow.trim() : new Date().toISOString();
    const clientTimeZone = typeof body.clientTimeZone === "string" && body.clientTimeZone.trim() ? body.clientTimeZone.trim() : "UTC";
    const { segments, parallel: parallelStreams } = normalizeAudioSegments(body);
    const knownSpeakerReferences = normalizeKnownSpeakerReferences(body.knownSpeakerReferences);
    const meetingContext = normalizeMeetingContext(body.meetingContext);

    if (segments.length === 0 && !(mode === "meeting" && meetingContextHasCaptionText(meetingContext))) {
      return jsonResponse({ error: "No audio data provided" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500);
    }

    console.log(`Transcribing ${segments.length} ${mode} audio segment(s)...`);
    const transcripts: string[] = [];
    // One list of entries per upload, kept apart until they are named, because which stream a
    // voice arrived on is itself the answer to "who was that".
    const entriesByRole: TranscriptEntry[][] = [];
    // Where this upload sits on the meeting clock, so diarizer timestamps can be compared
    // against the UI's speaker and caption timelines.
    let clockCursorMs = meetingContext.segmentStartMs;

    for (let i = 0; i < segments.length; i++) {
      try {
        console.log(`Transcribing ${segments[i].role} stream ${i + 1}/${segments.length}...`);
        const result = await transcribeSegment({
          language: requestedLanguage,
          segment: segments[i],
          mode,
          knownSpeakerReferences,
          openAiApiKey: OPENAI_API_KEY,
          clockOffsetMs: clockCursorMs,
          vocabularyHint: mode === "meeting" ? speakerVocabularyHint(meetingContext) : body.dictation === true ? DICTATION_VOCABULARY : "",
          dictation: body.dictation === true,
        });
        if (result.entries.length) {
          entriesByRole.push(
            // The mic is you, by physics rather than by inference.
            segments[i].role === "mic" ? labelMicEntries(result.entries) : result.entries,
          );
          // Parallel streams share one origin; consecutive chunks do not.
          if (!parallelStreams) {
            clockCursorMs = Math.max(clockCursorMs, result.entries[result.entries.length - 1].endMs);
          }
        }
        const transcript = result.text;
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

    const captionTranscript = mode === "meeting" ? buildMeetingCaptionTranscript(meetingContext) : "";

    if (transcripts.length === 0 && !captionTranscript) {
      return jsonResponse({ error: "No speech detected in any audio segment" }, 400);
    }

    // Meeting mode: lay the streams back onto one timeline, then bind the diarizer's anonymous
    // clusters to the names the meeting UI knows, and let a self-introduction ("I'm Priya")
    // name anything still unresolved.
    const meetingEntries = mergeTranscriptStreams(entriesByRole);
    const namedMeetingTranscript = mode === "meeting" && meetingEntries.length
      ? transcriptEntriesToText(nameTranscriptEntries(meetingEntries, meetingContext))
      : "";

    const audioTranscript = namedMeetingTranscript || (transcripts.length === 1
      ? transcripts[0]
      : transcripts.map((t, i) => `[Segment ${i + 1}]\n${t}`).join("\n\n"));

    // Audio carries the words; the meeting UI carries the names. Captions used to REPLACE the
    // audio transcript outright, which threw away the accurate speaker-attributed text we had
    // just paid for in favour of a lossy, self-rewriting caption feed. They are now only the
    // fallback for when there is no audio at all.
    const combinedTranscript = audioTranscript || captionTranscript;
    const fullTranscript = [existingTranscript, combinedTranscript].filter(Boolean).join("\n\n").trim();

    console.log("Combined transcript length:", fullTranscript.length);

    /* Just the words (6 Oct). A voice command and a HERA dictation only need
       the transcript; writing lecture notes on top of every one cost a second
       model call and several seconds nobody waited for on purpose. */
    if (body.transcriptOnly === true) {
      return jsonResponse({ transcript: fullTranscript });
    }

    console.log("Generating notes...");
    const { system: notesSystemPrompt, user: notesUserPrompt } = buildNotesPrompts({
      mode,
      hasExistingNotes,
      existingNotes,
      existingImageKeys,
      transcript: fullTranscript || combinedTranscript,
      meetingContext,
      // Captions no longer replace the audio transcript, but they are still worth showing the
      // model as a second witness: they carry names, and they sometimes catch a line the audio
      // missed. Only passed when they are not already serving as the transcript itself.
      captionDigest: audioTranscript ? captionTranscript : "",
    });

    const notesRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NOTES_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
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

    let meetingArtifacts: MeetingArtifacts | null = null;
    if (mode === "meeting") {
      try {
        meetingArtifacts = await extractMeetingArtifacts({
          transcript: fullTranscript || combinedTranscript,
          notes,
          meetingContext,
          openAiApiKey: OPENAI_API_KEY,
          clientNow,
          clientTimeZone,
        });
      } catch (artifactError) {
        console.warn("Meeting artifact extraction failed:", artifactError);
      }
    }

    return jsonResponse({ notes, transcript: fullTranscript || combinedTranscript, meetingArtifacts });
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

function normalizeAudioRole(value: unknown): AudioStreamRole {
  const role = String(value || "").trim().toLowerCase();
  if (role === "system" || role === "tab" || role === "remote") return "system";
  if (role === "mic" || role === "microphone" || role === "self") return "mic";
  return "mixed";
}

/** `audioStreams` are the two sides of one moment, sharing a clock. `audioSegments` is the
 *  older list of consecutive chunks. Both still arrive, so both still parse. */
function normalizeAudioSegments(body: Record<string, unknown>): {
  segments: AudioSegmentPayload[];
  parallel: boolean;
} {
  if (Array.isArray(body.audioStreams)) {
    return {
      segments: body.audioStreams
        .map((stream, index) => normalizeAudioSegment(stream, index))
        .filter((segment): segment is AudioSegmentPayload => Boolean(segment)),
      parallel: true,
    };
  }

  const rawSegments = Array.isArray(body.audioSegments)
    ? body.audioSegments
    : typeof body.audioBase64 === "string"
      ? [body.audioBase64]
      : [];

  return {
    segments: rawSegments
      .map((segment, index) => normalizeAudioSegment(segment, index))
      .filter((segment): segment is AudioSegmentPayload => Boolean(segment)),
    parallel: false,
  };
}

function normalizeAudioSegment(segment: unknown, index: number): AudioSegmentPayload | null {
  if (typeof segment === "string" && segment.trim()) {
    return {
      audioBase64: segment,
      mimeType: "audio/webm",
      fileName: `segment-${index + 1}.webm`,
      role: "mixed",
    };
  }

  if (!segment || typeof segment !== "object") return null;
  const raw = segment as Record<string, unknown>;
  const audioBase64 = typeof raw.audioBase64 === "string" ? raw.audioBase64.trim() : "";
  if (!audioBase64) return null;

  const role = normalizeAudioRole(raw.role);
  const mimeType = normalizeMimeType(raw.mimeType, "audio/webm");
  const fileName = typeof raw.fileName === "string" && raw.fileName.trim()
    ? raw.fileName.trim()
    : `${role}-${index + 1}.${extensionFromMimeType(mimeType)}`;

  return { audioBase64, mimeType, fileName, role };
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
  language,
  clockOffsetMs,
  vocabularyHint,
  dictation = false,
}: {
  segment: AudioSegmentPayload;
  mode: RecordingMode;
  knownSpeakerReferences: KnownSpeakerReference[];
  openAiApiKey: string;
  /** Diarizer timestamps restart at 0 for every upload; this lifts them onto the meeting clock. */
  clockOffsetMs: number;
  /** The names we already expect to hear. A name the transcriber mangles is a name no later
   *  layer can recover, so this goes in before a single word is decoded. */
  vocabularyHint?: string;
  dictation?: boolean;
  /** ISO code. Opt-in, and left unset for lectures and meetings, which are
   *  genuinely multilingual. The Mac's spoken-command path sets "en" because
   *  without it the model guesses, and a mic left open in a room playing Hindi
   *  standup came back as fluent Urdu which Braino then answered as a command. */
  language?: string;
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
    /* Dictation: without server-side chunking the model can skip a stretch after a
       pause in a long recording; cut at pauses first, then nothing is skipped. */
    if (dictation) form.append("chunking_strategy", "auto");
  }

  // Naming the language stops the model inventing one from ambient audio. It is
  // a hint, not a filter: it does not make non-English speech transcribe badly,
  // it makes silence and background noise stop arriving as confident sentences.
  if (language) form.append("language", language);

  // Telling it the guest list up front is what keeps Sowmya from arriving as "so my".
  if (vocabularyHint) form.append("prompt", vocabularyHint);

  let transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: form,
  });
  // If chunking is ever refused for this model, dictation still goes through without it.
  if (!transcribeRes.ok && dictation && transcribeRes.status === 400) {
    form.delete("chunking_strategy");
    transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${openAiApiKey}` }, body: form });
  }

  if (!transcribeRes.ok) {
    throw new OpenAiRequestError(transcribeRes.status, await readOpenAiError(transcribeRes, "Transcription failed"));
  }

  const transcribeData = await transcribeRes.json();
  const flatText = typeof transcribeData.text === "string" ? transcribeData.text.trim() : "";
  if (mode !== "meeting") return { text: flatText, entries: [] as TranscriptEntry[] };

  const entries = parseDiarizedEntries(transcribeData, clockOffsetMs);
  if (!entries.length) return { text: flatText, entries: [] as TranscriptEntry[] };
  return { text: transcriptEntriesToText(entries), entries };
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

function buildNotesPrompts({
  mode,
  hasExistingNotes,
  existingNotes,
  existingImageKeys,
  transcript,
  meetingContext,
  captionDigest = "",
}: {
  mode: RecordingMode;
  hasExistingNotes: boolean;
  existingNotes: string;
  existingImageKeys: string[];
  transcript: string;
  meetingContext?: MeetingContext;
  captionDigest?: string;
}) {
  if (mode === "meeting") {
    const knownParticipants = meetingContext?.participantNames?.length
      ? meetingContext.participantNames.join(", ")
      : "none detected";
    const captionBlock = captionDigest
      ? `\n\nPlatform captions for the same stretch of meeting. These are lossy and often truncated, so the transcript above wins on wording. Use these only to confirm who said something, or to catch a point the transcript clearly missed:\n\n${captionDigest.slice(0, 6000)}`
      : "";
    const meetingContextBlock = `Meeting context:
- Platform: ${meetingContext?.platformLabel || meetingContext?.platform || "unknown"}
- Title: ${meetingContext?.title || "unknown"}
- Known participants detected from the meeting UI: ${knownParticipants}
- Presentation active during this segment: ${meetingContext?.isPresenting ? "yes" : "no"}`;
    const system = hasExistingNotes
      ? `You are a precise meeting-notes assistant. Update the user's existing meeting notes using the latest transcript segment(s).

CRITICAL RULE: The transcript is the source of truth. Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or guess.

Rules:
- Keep accurate content already present in the existing notes unless the new transcript clearly revises it
- Output clean Markdown
- Prefer this section order when relevant: ## Summary, ## Participants, ## Decisions, ## Action Items, ## Follow-Ups, ## Open Questions
- Include ## Participants whenever any names or stable speaker labels are available
- Prefer participant names from the meeting context when transcript speaker labels match them.
- Only include action items that were explicitly mentioned
- Only include follow-ups that were explicitly mentioned
- Attribute action items and follow-ups to explicit names when stated; otherwise use You or Speaker N
- Never label speakers as A, B, Person A, or Person B. Use explicit names, You, or Speaker N only.
- Use speaker labels when they help clarify who said what
- Keep the notes concise and skimmable
- Short transcript = short notes. Never pad or stretch content.`
      : `You are a precise meeting-notes assistant. Convert meeting transcripts into clean Markdown notes.

CRITICAL RULE: Only include information that was EXPLICITLY stated in the transcript. Do NOT add, infer, elaborate, or guess. If the transcript does not contain an action item, do not invent one.

Rules:
- Output clean Markdown
- Prefer this section order when relevant: ## Summary, ## Participants, ## Decisions, ## Action Items, ## Follow-Ups, ## Open Questions
- Include ## Participants whenever any names or stable speaker labels are available
- Prefer participant names from the meeting context when transcript speaker labels match them.
- Use short bullet points
- Only include action items that were explicitly mentioned
- Only include follow-ups that were explicitly mentioned
- Attribute action items and follow-ups to explicit names when stated; otherwise use You or Speaker N
- Never label speakers as A, B, Person A, or Person B. Use explicit names, You, or Speaker N only.
- Use speaker labels when they help clarify who said what
- Keep the notes concise and skimmable
- Short transcript = short notes. Never pad or stretch content.`;

    const user = hasExistingNotes
      ? `${meetingContextBlock}\n\nExisting meeting notes:\n\n${existingNotes}\n\nLatest transcript segment(s):\n\n${transcript}${captionBlock}\n\nUpdate the meeting notes so they stay accurate and incorporate the new transcript.`
      : `${meetingContextBlock}\n\nConvert this meeting transcript into structured meeting notes:\n\n${transcript}${captionBlock}`;

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

async function extractMeetingArtifacts({
  transcript,
  notes,
  meetingContext,
  openAiApiKey,
  clientNow,
  clientTimeZone,
}: {
  transcript: string;
  notes: string;
  meetingContext: MeetingContext;
  openAiApiKey: string;
  clientNow: string;
  clientTimeZone: string;
}): Promise<MeetingArtifacts> {
  const knownParticipants = meetingContext.participantNames.length
    ? meetingContext.participantNames.join(", ")
    : "none detected";
  const extractionRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NOTES_MODEL,
      reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
      messages: [
        {
          role: "system",
          content: `You extract explicit action items and scheduling follow-ups from meeting transcripts.

Return JSON only with this exact shape:
{
  "actionItems": [
    {
      "task": "",
      "owner": "",
      "dueDateText": "",
      "dueDateIso": "",
      "sourceQuote": ""
    }
  ],
  "followUps": [
    {
      "summary": "",
      "attendeeName": "",
      "attendees": [],
      "dateText": "",
      "dateIso": "",
      "timeText": "",
      "durationMinutes": 30,
      "sourceQuote": ""
    }
  ]
}

Rules:
- Only include action items that were explicitly stated.
- Only include a followUp when the transcript explicitly suggests another meeting, call, catch-up, sync, check-in, or scheduling next step.
- Resolve relative dates like "Friday" using this reference datetime and timezone: ${clientNow} (${clientTimeZone}).
- If the transcript gives a day but not a time, set dateIso and leave timeText empty.
- If the transcript gives a time, preserve it in timeText exactly as naturally as possible.
- Use owner / attendeeName / attendees only when the relevant person was explicitly named or clearly identified as You or Speaker N in the transcript.
- Prefer these known participant names when the transcript clearly refers to them: ${knownParticipants}.
- Never use A, B, Person A, or Person B. Use explicit names, You, or Speaker N only.
- Keep sourceQuote short and verbatim.
- Never invent owners, times, dates, emails, or extra follow-ups.
- Return valid JSON only. No markdown fences.`,
        },
        {
          role: "user",
          content: `Meeting context:\nPlatform: ${meetingContext.platformLabel || meetingContext.platform || "unknown"}\nTitle: ${meetingContext.title || "unknown"}\nKnown participants: ${knownParticipants}\nPresenting: ${meetingContext.isPresenting ? "yes" : "no"}\n\nMeeting transcript:\n\n${transcript}\n\nMeeting notes:\n\n${notes}`,
        },
      ],
    }),
  });

  if (!extractionRes.ok) {
    const errorText = await extractionRes.text().catch(() => "");
    throw new Error(errorText || `Meeting artifact extraction failed (${extractionRes.status})`);
  }

  const extractionData = await extractionRes.json();
  const raw = extractionData.choices?.[0]?.message?.content || "{}";
  return normalizeMeetingArtifacts(parseLooseJsonObject(raw));
}

function parseLooseJsonObject(raw: string) {
  const text = String(raw || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || text;
  return JSON.parse(candidate);
}

function normalizeMeetingArtifacts(payload: unknown): MeetingArtifacts {
  const raw = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const actionItems = Array.isArray(raw.actionItems) ? raw.actionItems : [];
  const followUps = Array.isArray(raw.followUps) ? raw.followUps : [];

  return {
    actionItems: actionItems
      .map((item) => normalizeMeetingActionItem(item))
      .filter((item): item is MeetingActionItem => Boolean(item))
      .slice(0, 6),
    followUps: followUps
      .map((item) => normalizeMeetingFollowUp(item))
      .filter((item): item is MeetingFollowUp => Boolean(item))
      .slice(0, 4),
  };
}

function normalizeMeetingActionItem(item: unknown): MeetingActionItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const task = typeof raw.task === "string" ? raw.task.trim() : "";
  if (!task) return null;
  return {
    task,
    owner: typeof raw.owner === "string" ? raw.owner.trim() : "",
    dueDateText: typeof raw.dueDateText === "string" ? raw.dueDateText.trim() : "",
    dueDateIso: typeof raw.dueDateIso === "string" ? raw.dueDateIso.trim() : "",
    sourceQuote: typeof raw.sourceQuote === "string" ? raw.sourceQuote.trim() : "",
  };
}

function normalizeMeetingFollowUp(item: unknown): MeetingFollowUp | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const dateText = typeof raw.dateText === "string" ? raw.dateText.trim() : "";
  const dateIso = typeof raw.dateIso === "string" ? raw.dateIso.trim() : "";
  if (!summary || !dateText || !dateIso) return null;
  return {
    summary,
    attendeeName: typeof raw.attendeeName === "string" ? raw.attendeeName.trim() : "",
    attendees: Array.isArray(raw.attendees)
      ? raw.attendees.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    dateText,
    dateIso,
    timeText: typeof raw.timeText === "string" ? raw.timeText.trim() : "",
    durationMinutes: Number.isFinite(Number(raw.durationMinutes)) ? Math.max(15, Number(raw.durationMinutes)) : 30,
    sourceQuote: typeof raw.sourceQuote === "string" ? raw.sourceQuote.trim() : "",
  };
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
