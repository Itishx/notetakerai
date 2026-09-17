"use strict";

/* "Close it."
 *
 * A person who has just been asked to open YouTube knows what "it" is for the
 * next minute. Braino did not: every command arrived as if it were the first
 * thing ever said, so "close it" reached a model that had to guess, and
 * "reduce the volume also for this" went to Spotify while a video played.
 *
 * So the last thing he acted on is remembered, and a sentence whose only
 * object is a pronoun is rewritten into the sentence the person meant. It is
 * deliberately narrow: a pronoun and nothing else. "Close the other one" names
 * something, so it still goes to the brain, which is better at that than a
 * regex would be.
 *
 * Pure: the remembering lives in main, the rules live here. */

/* Verbs that can act on something already named. */
/* Playback verbs are deliberately absent: "pause it" belongs to the code that
   asks what is actually making noise, which is better at it than a memory. */
const CONTEXT_VERBS = [
  "close", "quit", "reopen", "open",
  "share", "send", "show", "read", "delete", "rename", "move", "copy",
  "call", "facetime", "ring", "message", "text", "whatsapp",
];
const CONTEXT_VERB_RE = new RegExp(`^(?:please\\s+|can you\\s+|could you\\s+)*(${CONTEXT_VERBS.join("|")})\\b`, "i");
/* The object has to be a bare pronoun: anything named goes the normal way. */
const BARE_PRONOUN_RE = /^(?:it|that|this|there|them|those|the same|the same one|that one|this one)\b/i;
/* Words that can trail a pronoun without naming anything new. */
const FILLER_RE = /\b(?:again|too|also|please|now|for me|as well|back|up|down|quickly|right now)\b/gi;
/* Who can be called, what can be closed. */
const PERSON_VERBS = new Set(["call", "facetime", "ring", "message", "text", "whatsapp"]);
const THING_VERBS = new Set(["close", "quit", "reopen", "open", "share", "send", "show", "read", "delete", "rename", "move", "copy"]);

function cleanForContext(raw) {
  return String(raw || "")
    .replace(/\b(?:hey\s+)?brain(?:o|elle)\b/gi, " ")
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.!?]+$/g, "")
    .trim();
}

/* "Do that again", "same thing again": the last command, run again. */
function parseRepeatReference(raw) {
  const text = cleanForContext(raw).toLowerCase();
  if (!text) return null;
  if (/^(?:do|run|try)\s+(?:it|that|this|the same thing)\s*(?:again|one more time)?$/.test(text)) return { kind: "repeat" };
  if (/^(?:again|one more time|same thing again|do the same)$/.test(text)) return { kind: "repeat" };
  return null;
}

/* "Close it", "open that again", "call her": the verb, with the thing left out. */
function parseContextualReference(raw) {
  const repeat = parseRepeatReference(raw);
  if (repeat) return repeat;
  const text = cleanForContext(raw);
  if (!text) return null;
  const verbMatch = text.match(CONTEXT_VERB_RE);
  if (!verbMatch) return null;
  const verb = verbMatch[1].toLowerCase();
  let rest = text.slice(verbMatch[0].length).trim();
  const pronoun = rest.match(BARE_PRONOUN_RE);
  if (!pronoun) {
    // "call her" / "call him": a person, with nobody named.
    if (PERSON_VERBS.has(verb) && /^(?:him|her|them)\b/i.test(rest)) {
      const left = rest.replace(/^(?:him|her|them)\b/i, "").replace(FILLER_RE, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      return left ? null : { kind: "target", verb, wants: "person" };
    }
    return null;
  }
  rest = rest.slice(pronoun[0].length);
  const leftover = rest.replace(FILLER_RE, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (leftover) return null;
  return { kind: "target", verb, wants: PERSON_VERBS.has(verb) ? "person" : "thing" };
}

const CONTEXT_TTL_MS = 5 * 60 * 1000;

/* The sentence the person meant, or nothing when the memory does not fit.
   `remembered` is { kind: "app"|"site"|"file"|"contact"|"media", label, at }. */
function applyContextualReference(reference, remembered, now = Date.now()) {
  if (!reference || reference.kind !== "target") return "";
  if (!remembered?.label || !remembered.kind) return "";
  if (now - Number(remembered.at || 0) > CONTEXT_TTL_MS) return "";
  const isPerson = remembered.kind === "contact";
  if (reference.wants === "person" && !isPerson) return "";
  if (reference.wants === "thing" && isPerson) return "";
  if (reference.wants === "thing" && !THING_VERBS.has(reference.verb)) return "";
  return `${reference.verb} ${remembered.label}`;
}

module.exports = {
  parseContextualReference,
  parseRepeatReference,
  applyContextualReference,
  cleanForContext,
  CONTEXT_TTL_MS,
};
