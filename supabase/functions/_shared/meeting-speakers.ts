// ── Who said what ────────────────────────────────────────────────────────────
// The transcription API returns anonymous clusters — "Speaker 1", "Speaker 2" — and never
// a name. Names do not live in the audio; they live in the meeting UI, in the calendar, and
// in the sentence where somebody says "thanks, Sam". This module is where those two worlds
// are joined: it parses the diarizer's output onto a meeting-absolute clock, then binds each
// anonymous cluster to a real person using every piece of outside evidence available.
//
// It is a plain module with no Deno or network dependency on purpose, so the same code the
// edge function runs is the code the tests run.

export type MeetingSpeakerEvent = {
  atMs: number;
  untilMs: number;
  name: string;
  source: string;
};

export type MeetingCaptionEvent = {
  atMs: number;
  speaker: string;
  text: string;
  source: string;
};

export type MeetingContext = {
  platform: string;
  platformLabel: string;
  title: string;
  participantNames: string[];
  speakerTimeline: MeetingSpeakerEvent[];
  captionTimeline: MeetingCaptionEvent[];
  currentSpeaker: string;
  isPresenting: boolean;
  /** Where this audio segment sits on the meeting clock. Diarizer timestamps restart at 0
   *  for every upload, while the UI timelines run on meeting-absolute ms — without this
   *  offset the two never overlap, and the platform's own speaker names, the most reliable
   *  evidence we have, went unused for every segment after the first. */
  segmentStartMs: number;
};

export type TranscriptEntry = {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

// ── Normalising what the page scraped ────────────────────────────────────────

export function normalizeMs(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

export function titleCaseSpeakerName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (/^[A-Z0-9]+$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Meeting UIs are full of text that looks like a name and is not: button labels, tooltips,
 *  status lines. Anything that gets through here becomes a person in the notes, so the
 *  filter is deliberately strict. */
export function normalizeMeetingName(value: unknown) {
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

export function normalizeMeetingSpeakerEvent(value: unknown): MeetingSpeakerEvent | null {
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

export function normalizeMeetingCaptionEvent(value: unknown): MeetingCaptionEvent | null {
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

export function normalizeMeetingContext(rawValue: unknown): MeetingContext {
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
    segmentStartMs: normalizeMs(raw.segmentStartMs),
  };
}

export function meetingContextHasCaptionText(context: MeetingContext) {
  return context.captionTimeline.some((caption) => caption.text.trim().length > 0);
}

// ── Speaker labels ───────────────────────────────────────────────────────────

export function isGenericSpeakerLabel(label: string) {
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

export function formatSpeakerLabel(
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

// ── Evidence layer: what somebody said about themselves ──────────────────────

/** Words that end a name. People rarely stop at the name — "my name is Sowmya and I run
 *  design" is the normal shape of an introduction, and blindly taking the next three words
 *  put "Sowmya And I" in the notes as a person. */
const NAME_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "but", "calling", "for", "from", "here", "i", "im",
  "in", "is", "joining", "leading", "my", "of", "on", "or", "our", "representing", "so",
  "speaking", "that", "the", "to", "was", "we", "were", "who", "with", "working",
]);

const NAME_DISALLOWED_WORDS = new Set([
  "amazing", "awesome", "cool", "fine", "great", "interesting", "nice", "ok", "okay",
  "what", "why", "how", "when", "where",
]);

export function extractExplicitSpeakerName(text: string) {
  const source = String(text || "").trim();
  if (!source) return "";

  const patterns = [
    /\b(?:i am|i'm|my name is)\s+([a-z][a-z' -]{1,60})/i,
    /\bthis is\s+([a-z][a-z' -]{1,60})(?:\s+(?:speaking|here))?/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1]
      .replace(/\b(?:speaking|here)\b.*$/i, "")
      .replace(/[.?!,]+.*$/, "")
      .trim();

    const words: string[] = [];
    for (const word of candidate.split(/\s+/).filter(Boolean)) {
      const lowered = word.toLowerCase().replace(/[^a-z']/g, "");
      if (!lowered) break;
      if (NAME_STOP_WORDS.has(lowered)) break;
      words.push(word);
      if (words.length === 3) break;
    }

    if (!words.length) continue;
    if (words.some((word) => NAME_DISALLOWED_WORDS.has(word.toLowerCase()))) continue;
    return titleCaseSpeakerName(words.join(" "));
  }

  return "";
}

export function promoteExplicitSpeakerNames<T extends { speaker: string; text: string }>(entries: T[]): T[] {
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

// ── Evidence layer: what the meeting UI showed ───────────────────────────────

export function segmentTimeToMs(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number > 10000 ? Math.round(number) : Math.round(number * 1000);
}

/** Whose tile was lit while this stretch of audio was being spoken. */
export function speakerFromMeetingTimeline(startMs: number, endMs: number, context: MeetingContext) {
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

export function buildMeetingCaptionTranscript(context: MeetingContext) {
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

// ── Diarizer output → transcript entries ─────────────────────────────────────

/** One audio upload's diarized segments, lifted onto the meeting-absolute clock. */
export function parseDiarizedEntries(
  payload: Record<string, unknown>,
  clockOffsetMs: number,
): TranscriptEntry[] {
  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  if (!segments.length) return [];

  const merged: TranscriptEntry[] = [];
  const speakerIds = new Map<string, string>();
  const speakerCounter = { value: 1 };
  for (const segment of segments) {
    if (!segment || typeof segment !== "object") continue;
    const raw = segment as Record<string, unknown>;
    const startMs = clockOffsetMs + segmentTimeToMs(raw.start ?? raw.start_time ?? raw.startMs);
    const rawEnd = segmentTimeToMs(raw.end ?? raw.end_time ?? raw.endMs);
    const endMs = rawEnd ? clockOffsetMs + rawEnd : startMs + 3000;
    const speaker = formatSpeakerLabel(raw.speaker, speakerIds, speakerCounter);
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${text}`.trim();
      previous.endMs = Math.max(previous.endMs, endMs);
    } else {
      merged.push({ speaker, text, startMs, endMs });
    }
  }
  return merged;
}

export function transcriptEntriesToText(entries: TranscriptEntry[]) {
  return entries.map((entry) => `${entry.speaker}: ${entry.text}`).join("\n");
}

function tokenizeForOverlap(value: string) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9' ]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

/** How much of a caption's wording actually shows up in this stretch of audio. A caption
 *  that lands in the right seconds AND shares words is evidence; one that only shares a
 *  timestamp is a coincidence, and coincidences are how speakers get mislabelled. */
export function captionTextAffinity(captionText: string, entryText: string) {
  const captionTokens = tokenizeForOverlap(captionText);
  if (!captionTokens.size) return 0;
  const entryTokens = tokenizeForOverlap(entryText);
  if (!entryTokens.size) return 0;
  let hits = 0;
  for (const token of captionTokens) if (entryTokens.has(token)) hits++;
  return hits / captionTokens.size;
}

/** Bind anonymous clusters to real people. Every generic cluster votes for the name that
 *  best explains its airtime, drawing on the platform's active-speaker timeline and on
 *  captions that overlap in time AND match in wording. Winners are assigned strongest first,
 *  and a name is only ever spent once, so two clusters can never both become Priya. */
export function resolveSpeakerNamesFromMeetingUi(
  entries: TranscriptEntry[],
  context: MeetingContext,
): TranscriptEntry[] {
  if (!entries.length) return entries;
  const hasUiEvidence = Boolean(context?.speakerTimeline?.length || context?.captionTimeline?.length);
  if (!hasUiEvidence) return entries;

  const votes = new Map<string, Map<string, number>>();
  const addVote = (label: string, name: string, weight: number) => {
    if (!name || weight <= 0 || name === "You") return;
    if (!votes.has(label)) votes.set(label, new Map());
    const perName = votes.get(label)!;
    perName.set(name, (perName.get(name) || 0) + weight);
  };

  for (const entry of entries) {
    if (!isGenericSpeakerLabel(entry.speaker)) continue;

    const timelineName = speakerFromMeetingTimeline(entry.startMs, entry.endMs, context);
    if (timelineName) addVote(entry.speaker, timelineName, Math.max(1000, entry.endMs - entry.startMs));

    for (const caption of context.captionTimeline || []) {
      if (!caption.speaker) continue;
      if (caption.atMs < entry.startMs - 2500 || caption.atMs > entry.endMs + 2500) continue;
      const affinity = captionTextAffinity(caption.text, entry.text);
      if (affinity < 0.3) continue;
      addVote(entry.speaker, caption.speaker, 4000 * affinity);
    }
  }

  const ranked: Array<{ label: string; name: string; score: number }> = [];
  for (const [label, perName] of votes) {
    for (const [name, score] of perName) ranked.push({ label, name, score });
  }
  ranked.sort((a, b) => (b.score - a.score) || a.label.localeCompare(b.label) || a.name.localeCompare(b.name));

  // One name per anonymous cluster, and one anonymous cluster per name: without that, a
  // single loud participant absorbs every unresolved cluster in the meeting. Names already
  // on the transcript do NOT block a match, though — a diarizer routinely splits one person
  // into several clusters, and if the UI says this stretch was Priya while another turn is
  // already Priya, that is one human to be reunited, not two people to keep apart.
  const labelToName = new Map<string, string>();
  const claimedNames = new Set<string>();
  for (const candidate of ranked) {
    if (labelToName.has(candidate.label)) continue;
    if (claimedNames.has(candidate.name.toLowerCase())) continue;
    labelToName.set(candidate.label, candidate.name);
    claimedNames.add(candidate.name.toLowerCase());
  }

  if (!labelToName.size) return entries;
  return entries.map((entry) => ({ ...entry, speaker: labelToName.get(entry.speaker) || entry.speaker }));
}

/** The microphone is the one attribution nobody has to guess at: if it arrived on your mic,
 *  it was said in your room. Usually that is just you, so the dominant cluster becomes "You".
 *  When the mic carries a whole room — an in-person meeting, where the call audio is silent —
 *  the other clusters are real people sitting with you and stay available for naming. */
export function labelMicEntries(entries: TranscriptEntry[]): TranscriptEntry[] {
  if (!entries.length) return entries;

  const airtime = new Map<string, number>();
  for (const entry of entries) {
    if (!isGenericSpeakerLabel(entry.speaker)) continue;
    airtime.set(entry.speaker, (airtime.get(entry.speaker) || 0) + Math.max(0, entry.endMs - entry.startMs));
  }
  if (!airtime.size) return entries;

  let dominant = "";
  let best = -1;
  for (const [label, total] of airtime) {
    if (total > best) {
      dominant = label;
      best = total;
    }
  }

  return entries.map((entry) => (entry.speaker === dominant ? { ...entry, speaker: "You" } : entry));
}

/** Two streams recorded from the same moment, laid back onto one timeline. They share a clock
 *  origin because they are cut together, which is the whole reason for keeping them apart. */
export function mergeTranscriptStreams(streams: TranscriptEntry[][]): TranscriptEntry[] {
  const all = streams.flat().filter((entry) => entry && entry.text.trim());
  all.sort((a, b) => (a.startMs - b.startMs) || (a.endMs - b.endMs));
  return mergeAdjacentSameSpeaker(all);
}

/** Adjacent turns collapse into one once renaming has merged two labels into a name. */
export function mergeAdjacentSameSpeaker(entries: TranscriptEntry[]): TranscriptEntry[] {
  const merged: TranscriptEntry[] = [];
  for (const entry of entries) {
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === entry.speaker) {
      previous.text = `${previous.text} ${entry.text}`.trim();
      previous.endMs = Math.max(previous.endMs, entry.endMs);
    } else {
      merged.push({ ...entry });
    }
  }
  return merged;
}

// ── Evidence layer: the roster, known before anybody speaks ──────────────────
// A calendar invite is the only source that knows who is coming BEFORE the meeting starts.
// That matters twice over: it supplies names to attach to voices, and — passed to the
// transcriber as a vocabulary hint — it stops "Sowmya" arriving as "so my", which is a name
// no later layer could ever have recovered.

/** Addresses that belong to a system rather than a person. */
const NON_PERSON_MAILBOXES = new Set([
  "admin", "alerts", "billing", "calendar", "contact", "hello", "help", "hi", "info",
  "invites", "mail", "meeting", "meetings", "no-reply", "noreply", "notifications", "sales",
  "support", "team", "webinar",
]);

export function attendeeDisplayName(attendee: unknown): string {
  if (typeof attendee === "string") return attendeeDisplayName({ email: attendee });
  if (!attendee || typeof attendee !== "object") return "";
  const raw = attendee as Record<string, unknown>;

  const explicit = normalizeMeetingName(raw.displayName ?? raw.name);
  if (explicit) return explicit;

  const email = String(raw.email || "").replace(/^mailto:/i, "").trim().toLowerCase();
  const localPart = email.includes("@") ? email.slice(0, email.indexOf("@")) : "";
  if (!localPart || NON_PERSON_MAILBOXES.has(localPart)) return "";
  if (!/^[a-z][a-z0-9._-]*$/.test(localPart)) return "";
  // Letters only, two or more: "priya.nair" is a person, "x1" and "u2" are handles. A wrong
  // name in the notes is worse than an honest "Speaker 2".
  const words = localPart.split(/[._-]+/).filter((word) => /^[a-z]{2,}$/.test(word));
  if (!words.length) return "";
  return normalizeMeetingName(words.join(" "));
}

export function rosterFromAttendees(attendees: unknown): string[] {
  if (!Array.isArray(attendees)) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const attendee of attendees) {
    const name = attendeeDisplayName(attendee);
    if (!name || name === "You") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** What to tell the transcriber before it starts, so it spells the people right. */
export function speakerVocabularyHint(context: MeetingContext): string {
  const names = (context?.participantNames || []).filter((name) => name && name !== "You").slice(0, 20);
  if (!names.length) return "";
  return `The speakers in this meeting are: ${names.join(", ")}.`;
}

/** The last resort, and deliberately a narrow one: exactly one voice still unaccounted for,
 *  exactly one person on the invite who has not spoken yet. Then it is them. With two of
 *  either it would be a coin flip, and a coin flip that puts a name on an action item is
 *  worse than leaving the voice anonymous. */
export function assignRemainingFromRoster(
  entries: TranscriptEntry[],
  context: MeetingContext,
): TranscriptEntry[] {
  if (!entries.length) return entries;
  const roster = (context?.participantNames || []).filter((name) => name && name !== "You");
  if (!roster.length) return entries;

  const unresolved = [...new Set(entries.filter((e) => isGenericSpeakerLabel(e.speaker)).map((e) => e.speaker))];
  if (unresolved.length !== 1) return entries;

  const claimed = new Set(
    entries.filter((e) => !isGenericSpeakerLabel(e.speaker)).map((e) => e.speaker.toLowerCase()),
  );
  const available = roster.filter((name) => !claimed.has(name.toLowerCase()));
  if (available.length !== 1) return entries;

  const [label] = unresolved;
  const [name] = available;
  return entries.map((entry) => (entry.speaker === label ? { ...entry, speaker: name } : entry));
}

/** The whole naming pipeline, in the order the evidence deserves: the meeting UI saw who was
 *  talking, a self-introduction names whoever is still anonymous, and only then — with one
 *  voice and one invitee left over — does the roster get to close the last gap. */
export function nameTranscriptEntries(
  entries: TranscriptEntry[],
  context: MeetingContext,
): TranscriptEntry[] {
  return mergeAdjacentSameSpeaker(
    assignRemainingFromRoster(
      promoteExplicitSpeakerNames(resolveSpeakerNamesFromMeetingUi(entries, context)),
      context,
    ),
  );
}
