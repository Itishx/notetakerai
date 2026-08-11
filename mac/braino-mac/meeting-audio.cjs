// Decisions about meeting audio that are worth being sure of, kept away from the Electron
// and MediaRecorder plumbing so they can be tested directly.

// Opus spends almost nothing encoding silence, so a segment this thin is a muted call or a
// closed mic. Dropping it is not only cheaper: transcribers hallucinate on silence, and
// "Thanks for watching" has no business in anyone's meeting notes.
const SILENCE_BYTES_PER_SEC = 800;

// Below this a segment is too short to judge fairly — a two-second clip of a quiet word can
// look like silence by the numbers.
const MIN_JUDGEABLE_MS = 5000;

function streamLooksSilent(stream) {
  const durationMs = Number(stream?.durationMs) || 0;
  const bytes = Number(stream?.bytes) || 0;
  if (!bytes) return true;
  if (durationMs < MIN_JUDGEABLE_MS) return false;
  return (bytes / (durationMs / 1000)) < SILENCE_BYTES_PER_SEC;
}

/** Which of this moment's streams are worth transcribing, and what to say about the rest. */
function selectAudibleStreams(streams) {
  const list = Array.isArray(streams) ? streams : [];
  const audible = [];
  const skipped = [];
  for (const stream of list) {
    if (!stream || typeof stream !== "object") continue;
    const role = stream.role === "mic" ? "mic" : stream.role === "system" ? "system" : "";
    if (!role || !stream.audioBase64) continue;
    if (streamLooksSilent(stream)) {
      skipped.push(role);
      continue;
    }
    audible.push({
      role,
      audioBase64: String(stream.audioBase64),
      mimeType: typeof stream.mimeType === "string" && stream.mimeType.startsWith("audio/")
        ? stream.mimeType
        : "audio/webm",
      durationMs: Number(stream.durationMs) || 0,
    });
  }
  return { audible, skipped };
}

/** An in-person meeting is one where nothing ever came out of the speakers. Worth knowing:
 *  it is the case where the microphone is carrying the whole room rather than just you. */
function looksInPerson(rolesSeen) {
  const roles = new Set(Array.isArray(rolesSeen) ? rolesSeen : []);
  return roles.has("mic") && !roles.has("system");
}

// ── The guest list ───────────────────────────────────────────────────────────
// EventKit hands back either a person's name or a mailto: address, and an address is usually
// a name in disguise. This is the only roster available before anybody has spoken, which
// makes it worth reading carefully: it supplies the names to attach to voices, and it tells
// the transcriber how those names are spelled before it decodes a single word.

const NON_PERSON_MAILBOXES = new Set([
  "admin", "alerts", "billing", "calendar", "contact", "hello", "help", "hi", "info",
  "invites", "mail", "meeting", "meetings", "no-reply", "noreply", "notifications", "sales",
  "support", "team", "webinar",
]);

const CONTROL_WORDS = /\b(?:participants?|captions?|settings|microphone|camera|invite|organizer)\b/i;

function titleCaseName(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (/^[A-Z0-9]+$/.test(token) ? token : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()))
    .join(" ");
}

function inviteeDisplayName(raw) {
  const value = String(raw || "").replace(/^mailto:/i, "").replace(/\s+/g, " ").trim();
  if (!value || value.length > 80) return "";

  if (!value.includes("@")) {
    if (CONTROL_WORDS.test(value)) return "";
    if (!/[a-z]/i.test(value)) return "";
    return titleCaseName(value);
  }

  const localPart = value.slice(0, value.indexOf("@")).toLowerCase();
  if (!localPart || NON_PERSON_MAILBOXES.has(localPart)) return "";
  if (!/^[a-z][a-z0-9._-]*$/.test(localPart)) return "";
  // Letters only, two or more: "priya.nair" is a person, "x1" and "u2" are handles. A wrong
  // name in the notes is worse than an honest "Speaker 2".
  const words = localPart.split(/[._-]+/).filter((word) => /^[a-z]{2,}$/.test(word));
  if (!words.length) return "";
  return titleCaseName(words.join(" "));
}

/** A pipe-joined blob of attendee names or addresses becomes a clean, deduped roster. */
function rosterFromInviteNames(raw) {
  const names = [];
  const seen = new Set();
  for (const part of String(raw || "").split("|")) {
    const name = inviteeDisplayName(part);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.slice(0, 40);
}

module.exports = {
  SILENCE_BYTES_PER_SEC,
  MIN_JUDGEABLE_MS,
  streamLooksSilent,
  selectAudibleStreams,
  looksInPerson,
  inviteeDisplayName,
  rosterFromInviteNames,
};
