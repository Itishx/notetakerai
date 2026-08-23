"use strict";

// "Braino, start the teleprompter."
//
// Deliberately narrow. This fires a window that covers the screen the founder
// is presenting from, so a false positive is worse than a miss: it has to be
// asked for, not stumbled into. Anything vaguer than the phrasings below falls
// through to the normal delegate path.

const START = [
  /\b(?:start|open|launch|bring up|fire up|show|give me)\b.{0,16}\btele[\s-]?prompter\b/,
  /\btele[\s-]?prompter\b.{0,12}\b(?:on|up|please)\b/,
  /\b(?:i need|i want)\b.{0,16}\btele[\s-]?prompter\b/,
  /^tele[\s-]?prompter$/,
];

const STOP = [
  /\b(?:stop|close|hide|kill|end|dismiss|exit|turn off)\b.{0,16}\btele[\s-]?prompter\b/,
  /\btele[\s-]?prompter\b.{0,12}\b(?:off|away)\b/,
];

function parseTeleprompterIntent(raw) {
  const text = String(raw || "")
    .toLowerCase()
    // he is called Braino, but dictation hears Breno and Braido often enough
    // that dropping the address is the difference between working and not.
    .replace(/^\s*(?:hey\s+)?(?:braino|breno|braido|brano)[\s,]+/, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  if (!text) return null;
  if (!/tele[\s-]?prompter/.test(text)) return null;

  // Stop is checked first: "close the teleprompter" contains no start verb, but
  // "start" and "stop" both survive loose dictation, so order settles the tie.
  if (STOP.some((p) => p.test(text))) return { action: "stop" };
  if (START.some((p) => p.test(text))) return { action: "start" };
  return null;
}

module.exports = { parseTeleprompterIntent };
