"use strict";

/* "Show me what you look like."
 *
 * Braino OS is the four systems everything called Braino runs on: the mind, the
 * heart, the ears and the memory. There is now a screen that shows them, and
 * this is how he is asked for it out loud.
 *
 * Kept as its own module, with its own tests, because a phrase that opens a
 * full screen takeover has to be certain. "Show me your heart" opens it;
 * "put your heart into it" must not.
 */

const SYSTEMS = Object.freeze({
  mind: { id: "mind", spoken: "the mind", line: "This is the mind. It reasons, it routes, it decides." },
  heart: { id: "heart", spoken: "the heart", line: "This is the heart. It feels, and it colours everything else I say." },
  ears: { id: "ears", spoken: "the ears", line: "These are the ears. They are listening before anything else happens." },
  memory: { id: "memory", spoken: "the memory", line: "This is the memory. It keeps what matters and lets the rest go." },
});

const WHOLE_LINE = "This is Braino OS. The mind, the heart, the ears, the memory. All of me, underneath.";

/* Only the possessive or article forms count, so an ordinary sentence that
   happens to contain "heart" cannot open a takeover. */
const SYSTEM_PATTERNS = [
  { id: "mind", pattern: /\b(?:your|the|braino'?s)\s+mind\b/ },
  { id: "heart", pattern: /\b(?:your|the|braino'?s)\s+heart\b/ },
  { id: "ears", pattern: /\b(?:your|the|braino'?s)\s+ears?\b/ },
  { id: "memory", pattern: /\b(?:your|the|braino'?s)\s+memor(?:y|ies)\b/ },
];

/* The ask itself. Something has to actually request a look; naming a system on
   its own is just conversation. */
const SHOW_PATTERNS = [
  /\bshow me\b/,
  /\blet me see\b/,
  /\bcan i see\b/,
  /\bopen\b/,
  /\bwhat do you look like\b/,
  /\bwhat does .* look like\b/,
  /\btake me inside\b/,
  /\bgo inside\b/,
];

const OS_NAME = /\bbraino\s*(?:o\.?\s*s\.?|operating system)\b/;

function normalize(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/^\s*(?:hey\s+)?(?:braino|breno|braido|brainer)[\s,]+/, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBrainoOsIntent(raw) {
  const text = normalize(raw);
  if (!text) return null;

  if (/\b(?:close|exit|quit|leave|get out of|hide)\b/.test(text) && (OS_NAME.test(text) || /\bthis\b/.test(text))) {
    if (OS_NAME.test(text)) return { action: "close", say: "Closing it." };
  }

  const asked = SHOW_PATTERNS.some((pattern) => pattern.test(text));
  if (!asked) return null;

  const named = SYSTEM_PATTERNS.find((entry) => entry.pattern.test(text));
  if (named) {
    const system = SYSTEMS[named.id];
    return { action: "open", system: system.id, say: system.line };
  }

  // The whole thing, by name or by asking what he looks like.
  if (OS_NAME.test(text) || /\bwhat do you look like\b/.test(text) || /\byour ?self\b/.test(text)) {
    return { action: "open", system: null, say: WHOLE_LINE };
  }

  return null;
}

module.exports = { parseBrainoOsIntent, SYSTEMS, WHOLE_LINE };
