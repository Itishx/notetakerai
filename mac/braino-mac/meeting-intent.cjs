"use strict";

// "Braino, record this meeting for me" and everything a person actually says instead.
//
// The whole promise of the meeting recorder is that you say one sentence and it happens, so
// the sentence cannot have to be phrased just so. The hard part is the boundary next door:
// "record this" on its own means the SCREEN, and quietly starting a note-taking session when
// somebody asked for a screen recording is a worse failure than not understanding them.
// So this only claims a phrase when a meeting word is actually in it.

const MEETING_NOUN = "(?:call|meeting|meet|huddle|standup|stand-up|sync|interview|session|conversation|zoom|1:1|one on one|one-on-one)";

// Stop first: "stop recording" must never be read as a request to start one.
const STOP_PATTERNS = [
  /\bstop\b[^.]*\brecord/i,
  /\brecord(?:ing)?\b[^.]*\bstop\b/i,
  /\b(?:that'?s|thats) (?:it|enough)\b[^.]*\brecord/i,
  new RegExp(`\\b(?:end|finish|wrap up|wrap)\\b[^.]*\\b(?:the\\s+)?(?:recording|notes|${MEETING_NOUN}\\s+notes)\\b`, "i"),
];

const START_PATTERNS = [
  // record / start recording / take notes on … a meeting
  new RegExp(`\\b(?:record|recording)\\b[^.]*\\b${MEETING_NOUN}\\b`, "i"),
  new RegExp(`\\btake\\s+(?:the\\s+)?notes?\\b[^.]*\\b${MEETING_NOUN}\\b`, "i"),
  new RegExp(`\\bnote\\s*take\\b[^.]*\\b${MEETING_NOUN}\\b`, "i"),
  new RegExp(`\\b${MEETING_NOUN}\\b[^.]*\\b(?:record|notes?)\\b`, "i"),
  // "listen in", "sit in on this", "take this down" — only with a meeting word present
  new RegExp(`\\b(?:listen in|sit in)\\b[^.]*\\b${MEETING_NOUN}\\b`, "i"),
];

// A meeting word that is only being asked ABOUT, not recorded.
const NOT_A_REQUEST = [
  /\bwhat(?:'s| is| are)\b/i,
  /\bwhen(?:'s| is)\b/i,
  /\bdid you\b/i,
  /\bhave you\b/i,
  /\bwhere(?:'s| is)\b/i,
  /\bhow (?:do|did|does)\b/i,
];

function normalizeMeetingCommand(raw) {
  return String(raw || "")
    .replace(/^\s*(?:hey\s+)?(?:braino|breno|braido)[\s,]+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[?.!]+\s*$/, "")
    .trim();
}

/** Which kind of meeting it is, purely so Braino can name it back naturally. */
function meetingSourceFor(text) {
  if (/\bcall\b/i.test(text)) return "call";
  if (/\b(?:standup|stand-up)\b/i.test(text)) return "standup";
  if (/\binterview\b/i.test(text)) return "interview";
  if (/\b(?:1:1|one on one|one-on-one)\b/i.test(text)) return "1:1";
  return "meeting";
}

function parseMeetingIntent(raw) {
  const source = normalizeMeetingCommand(raw);
  if (!source) return null;

  if (STOP_PATTERNS.some((pattern) => pattern.test(source))) return { action: "stop" };
  if (NOT_A_REQUEST.some((pattern) => pattern.test(source))) return null;
  if (!START_PATTERNS.some((pattern) => pattern.test(source))) return null;

  return { action: "start", source: meetingSourceFor(source) };
}

/** Does this sentence name a meeting at all?
 *
 *  Screen recording is parsed BEFORE meetings, because bare "record this" means video. Its
 *  guard used to spell out its own short list of meeting words, which meant every word added
 *  here silently became a screen recording instead: "record this standup" started capturing
 *  the display. One exported list, one source of truth, so the two can no longer drift. */
const MEETING_MENTION = new RegExp(`\\b${MEETING_NOUN}\\b`, "i");

function mentionsMeeting(raw) {
  return MEETING_MENTION.test(normalizeMeetingCommand(raw));
}

module.exports = { parseMeetingIntent, normalizeMeetingCommand, meetingSourceFor, mentionsMeeting };
