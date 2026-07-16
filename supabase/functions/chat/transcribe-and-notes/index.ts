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

type MeetingSpeakerEvent = {
  atMs: number;
  untilMs: number;
  name: string;
  source: string;
};

type MeetingCaptionEvent = {
  atMs: number;
  speaker: string;
  text: string;
  source: string;
};

type MeetingContext = {
  platform: string;
  platformLabel: string;
  title: string;
  participantNames: string[];
  speakerTimeline: MeetingSpeakerEvent[];
  captionTimeline: MeetingCaptionEvent[];
  currentSpeaker: string;
  isPresenting: boolean;
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
    const existingTranscript = typeof body.existingTranscript === "string" ? body.existingTranscript.trim() : "";
    const existingImages = body.existingImages && typeof body.existingImages === "object" ? body.existingImages : {};
    const existingImageKeys = Object.keys(existingImages);
    const hasExistingNotes = existingNotes.trim().length > 0;
    const clientNow = typeof body.clientNow === "string" && body.clientNow.trim() ? body.clientNow.trim() : new Date().toISOString();
    const clientTimeZone = typeof body.clientTimeZone === "string" && body.clientTimeZone.trim() ? body.clientTimeZone.trim() : "UTC";
    const segments = normalizeAudioSegments(body);
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

    for (let i = 0; i < segments.length; i++) {
      try {
        console.log(`Transcribing segment ${i + 1}/${segments.length}...`);
        const transcript = await transcribeSegment({
          segment: segments[i],
          mode,
          knownSpeakerReferences,
          meetingContext,
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

    const captionTranscript = mode === "meeting" ? buildMeetingCaptionTranscript(meetingContext) : "";

    if (transcripts.length === 0 && !captionTranscript) {
      return jsonResponse({ error: "No speech detected in any audio segment" }, 400);
    }

    const audioTranscript = transcripts.length === 1
      ? transcripts[0]
      : transcripts.map((t, i) => `[Segment ${i + 1}]\n${t}`).join("\n\n");
    const combinedTranscript = captionTranscript || audioTranscript;
    const fullTranscript = [existingTranscript, combinedTranscript].filter(Boolean).join("\n\n").trim();

    console.log("Combined transcript length:", fullTranscript.length);

    console.log("Generating notes...");
    const { system: notesSystemPrompt, user: notesUserPrompt } = buildNotesPrompts({
      mode,
      hasExistingNotes,
      existingNotes,
      existingImageKeys,
      transcript: fullTranscript || combinedTranscript,
      meetingContext,
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

function normalizeMeetingContext(rawValue: unknown): MeetingContext {
  const raw = rawValue && typeof rawValue === "object" ? rawValue as Record<string, unknown> : {};
  const participantNames = Array.isArray(raw.participantNames)
    ? raw.participantNames.map((name) => normalizeMeetingName(name)).filter(Boolean).slice(0, 60)
    : [];
  const speakerTimeline = Array.isArray(raw.speakerTimeline)
    ? raw.speakerTimeline.map(normalizeMeetingSpeakerEvent).filter((event): event is MeetingSpeakerEvent => Boolean(event)).slice(-200)
    : [];
  const captionTimeline = Array.isArray(raw.captionTimeline)
    ? raw.captionTimeline.map(normalizeMeetingCaptionEvent).filter((event): event is MeetingCaptionEvent => Boolean(event)).slice(-200)
    : [];
  const platform = typeof raw.platform === "string" ? raw.platform.trim().slice(0, 40) : "";
  const platformLabel = typeof raw.platformLabel === "string" ? raw.platformLabel.trim().slice(0, 80) : "";
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
  const currentSpeaker = normalizeMeetingName(raw.currentSpeaker);
  return {
    platform,
    platformLabel,
    title,
    participantNames: [...new Set(participantNames)],
    speakerTimeline,
    captionTimeline,
    currentSpeaker,
    isPresenting: raw.isPresenting === true,
  };
}

function normalizeMeetingSpeakerEvent(value: unknown): MeetingSpeakerEvent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = normalizeMeetingName(raw.name);
  if (!name) return null;
  const atMs = normalizeMs(raw.atMs);
  const untilMs = Math.max(atMs, normalizeMs(raw.untilMs, atMs));
  return {
    atMs,
    untilMs,
    name,
    source: typeof raw.source === "string" ? raw.source.trim().slice(0, 40) : "ui",
  };
}

function normalizeMeetingCaptionEvent(value: unknown): MeetingCaptionEvent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = typeof raw.text === "string" ? raw.text.replace(/\s+/g, " ").trim() : "";
  if (!text) return null;
  return {
    atMs: normalizeMs(raw.atMs),
    speaker: normalizeMeetingName(raw.speaker),
    text: text.slice(0, 600),
    source: typeof raw.source === "string" ? raw.source.trim().slice(0, 40) : "captions",
  };
}

function normalizeMs(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function normalizeMeetingName(value: unknown) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+\(you\)$/i, "")
    .replace(/\s+is\s+(?:speaking|presenting|sharing).*$/i, "")
    .trim();
  if (!text || text.length > 80) return "";
  if (/\b(participants?|captions?|settings|microphone|camera|present|more options|chat|activities|host controls|raise hand|turn on|turn off)\b/i.test(text)) return "";
  if (/^(speaker|participant|person|someone|meeting|google meet|captions?)$/i.test(text)) return "";
  if (/^(you|me)$/i.test(text)) return "You";
  return titleCaseSpeakerName(text);
}

function meetingContextHasCaptionText(context: MeetingContext) {
  return context.captionTimeline.some((caption) => caption.text.trim().length > 0);
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
  meetingContext,
  openAiApiKey,
}: {
  segment: AudioSegmentPayload;
  mode: RecordingMode;
  knownSpeakerReferences: KnownSpeakerReference[];
  meetingContext: MeetingContext;
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
  return formatTranscript(transcribeData, mode, meetingContext);
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

function titleCaseSpeakerName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (/^[A-Z0-9]+$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function isGenericSpeakerLabel(label: string) {
  return /^speaker(?:\s+\d+)?$/i.test(label);
}

function assignGenericSpeakerLabel(
  key: string,
  speakerIds: Map<string, string>,
  counter: { value: number },
) {
  const normalizedKey = key || "__speaker__";
  const existing = speakerIds.get(normalizedKey);
  if (existing) return existing;
  const label = `Speaker ${counter.value++}`;
  speakerIds.set(normalizedKey, label);
  return label;
}

function formatSpeakerLabel(
  rawSpeaker: unknown,
  speakerIds?: Map<string, string>,
  counter?: { value: number },
) {
  const speaker = String(rawSpeaker || "").trim();
  if (!speaker) return assignGenericSpeakerLabel("__speaker__", speakerIds ?? new Map(), counter ?? { value: 1 });

  const lowered = speaker.toLowerCase();
  if (lowered === "you") return "You";

  const numericMatch = lowered.match(/^(?:speaker[_\s-]*|spk[_\s-]*|person\s+)?(\d+)$/i);
  if (numericMatch) return `Speaker ${parseInt(numericMatch[1], 10)}`;

  const letterMatch = lowered.match(/^(?:speaker[_\s-]*|spk[_\s-]*|person\s+)?([a-z])$/i);
  if (letterMatch) return `Speaker ${letterMatch[1].toUpperCase().charCodeAt(0) - 64}`;

  if (/^(?:speaker|spk|person)\b/i.test(lowered)) {
    return assignGenericSpeakerLabel(lowered, speakerIds ?? new Map(), counter ?? { value: 1 });
  }

  return titleCaseSpeakerName(speaker);
}

function extractExplicitSpeakerName(text: string) {
  const source = String(text || "").trim();
  if (!source) return "";

  const patterns = [
    /\b(?:i am|i'm|my name is)\s+([a-z][a-z' -]{1,60})/i,
    /\bthis is\s+([a-z][a-z' -]{1,60})(?:\s+(?:speaking|here))?/i,
  ];
  const disallowed = new Set(["amazing", "awesome", "cool", "fine", "great", "interesting", "nice", "ok", "okay", "what", "why", "how", "when", "where"]);

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1]
      .replace(/\b(?:speaking|here)\b.*$/i, "")
      .replace(/[.?!,]+.*$/, "")
      .trim();
    const words = candidate.split(/\s+/).filter(Boolean).slice(0, 3);
    if (!words.length) continue;
    if (words.some((word) => disallowed.has(word.toLowerCase()))) continue;
    return titleCaseSpeakerName(words.join(" "));
  }

  return "";
}

function promoteExplicitSpeakerNames(entries: Array<{ speaker: string; text: string }>) {
  const renameMap = new Map<string, string>();
  const usedNames = new Set(
    entries
      .map((entry) => entry.speaker)
      .filter((speaker) => speaker !== "You" && !isGenericSpeakerLabel(speaker))
      .map((speaker) => speaker.toLowerCase()),
  );

  for (const entry of entries) {
    if (!isGenericSpeakerLabel(entry.speaker)) continue;
    const explicitName = extractExplicitSpeakerName(entry.text);
    if (!explicitName) continue;
    const normalizedName = explicitName.toLowerCase();
    if (usedNames.has(normalizedName) && renameMap.get(entry.speaker)?.toLowerCase() !== normalizedName) continue;
    renameMap.set(entry.speaker, explicitName);
    usedNames.add(normalizedName);
  }

  return entries.map((entry) => ({
    ...entry,
    speaker: renameMap.get(entry.speaker) || entry.speaker,
  }));
}

function segmentTimeToMs(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number > 10000 ? Math.round(number) : Math.round(number * 1000);
}

function speakerFromMeetingTimeline(startMs: number, endMs: number, context: MeetingContext) {
  if (!context?.speakerTimeline?.length) return "";
  const windowStart = Math.max(0, startMs - 1800);
  const windowEnd = Math.max(windowStart + 1, endMs + 1800);
  const scores = new Map<string, number>();
  for (const event of context.speakerTimeline) {
    const eventStart = Number(event.atMs || 0);
    const eventEnd = Math.max(eventStart + 1200, Number(event.untilMs || eventStart));
    const overlap = Math.max(0, Math.min(windowEnd, eventEnd) - Math.max(windowStart, eventStart));
    if (overlap <= 0) continue;
    scores.set(event.name, (scores.get(event.name) || 0) + overlap);
  }
  let best = "";
  let bestScore = 0;
  for (const [name, score] of scores) {
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : "";
}

function buildMeetingCaptionTranscript(context: MeetingContext) {
  if (!context?.captionTimeline?.length) return "";
  const merged: Array<{ speaker: string; text: string }> = [];
  const seen = new Set<string>();
  for (const caption of context.captionTimeline) {
    const text = String(caption.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const speaker = normalizeMeetingName(caption.speaker) || speakerFromMeetingTimeline(caption.atMs, caption.atMs + 3000, context) || context.currentSpeaker || "Speaker";
    const key = `${speaker}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === speaker) previous.text = `${previous.text} ${text}`.trim();
    else merged.push({ speaker, text });
  }
  return merged.map((entry) => `${entry.speaker}: ${entry.text}`).join("\n");
}

function formatTranscript(payload: Record<string, unknown>, mode: RecordingMode, meetingContext: MeetingContext = normalizeMeetingContext(null)) {
  if (mode !== "meeting") {
    return typeof payload.text === "string" ? payload.text.trim() : "";
  }

  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  if (!segments.length) {
    return typeof payload.text === "string" ? payload.text.trim() : "";
  }

  const merged: Array<{ speaker: string; text: string }> = [];
  const speakerIds = new Map<string, string>();
  const speakerCounter = { value: 1 };
  for (const segment of segments) {
    if (!segment || typeof segment !== "object") continue;
    const raw = segment as Record<string, unknown>;
    const startMs = segmentTimeToMs(raw.start ?? raw.start_time ?? raw.startMs);
    const endMs = segmentTimeToMs(raw.end ?? raw.end_time ?? raw.endMs) || startMs + 3000;
    let speaker = formatSpeakerLabel(raw.speaker, speakerIds, speakerCounter);
    if (isGenericSpeakerLabel(speaker)) {
      const timelineSpeaker = speakerFromMeetingTimeline(startMs, endMs, meetingContext);
      if (timelineSpeaker) speaker = timelineSpeaker;
    }
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${text}`.trim();
    } else {
      merged.push({ speaker, text });
    }
  }

  const renamed = promoteExplicitSpeakerNames(merged);
  return renamed.map((entry) => `${entry.speaker}: ${entry.text}`).join("\n");
}

function buildNotesPrompts({
  mode,
  hasExistingNotes,
  existingNotes,
  existingImageKeys,
  transcript,
  meetingContext,
}: {
  mode: RecordingMode;
  hasExistingNotes: boolean;
  existingNotes: string;
  existingImageKeys: string[];
  transcript: string;
  meetingContext?: MeetingContext;
}) {
  if (mode === "meeting") {
    const knownParticipants = meetingContext?.participantNames?.length
      ? meetingContext.participantNames.join(", ")
      : "none detected";
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
      ? `${meetingContextBlock}\n\nExisting meeting notes:\n\n${existingNotes}\n\nLatest transcript segment(s):\n\n${transcript}\n\nUpdate the meeting notes so they stay accurate and incorporate the new transcript.`
      : `${meetingContextBlock}\n\nConvert this meeting transcript into structured meeting notes:\n\n${transcript}`;

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
