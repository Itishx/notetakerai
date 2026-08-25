"use strict";

/* "Braino, can you please dance?"
 *
 * The rig has been able to dance on the Mac for a while: music starting is what
 * turns it on, through reactToMusicStart. Nobody had ever wired the obvious way
 * to ask for it, so the only route in was to already be playing something.
 *
 * Asking should be enough. He picks something worth dancing to, puts it on, and
 * goes.
 */

/* Songs with an actual beat, because "play any good song" answered with a
   ballad is a joke that does not land. Kept as search queries rather than URIs
   so a dead track never breaks the trick. */
const DANCE_FLOOR = [
  "Billie Jean Michael Jackson",
  "Uptown Funk Mark Ronson",
  "Get Lucky Daft Punk",
  "Blinding Lights The Weeknd",
  "Can't Stop The Red Hot Chili Peppers",
  "Le Freak Chic",
  "September Earth Wind & Fire",
  "Dance Monkey Tones and I",
  "One More Time Daft Punk",
  "Levitating Dua Lipa",
  "As It Was Harry Styles",
  "Kala Chashma Baar Baar Dekho",
  "Illegal Weapon 2.0 Street Dancer",
  "Aankh Marey Simmba",
  "FE!N Travis Scott",
];

/* A different one each time. Nothing kills a party trick faster than the same
   song twice in a row, which is what unseeded random gives you often enough to
   notice. */
let lastPick = "";

function pickDanceTrack(random = Math.random) {
  const options = DANCE_FLOOR.filter((track) => track !== lastPick);
  const pick = options[Math.floor(random() * options.length)] || DANCE_FLOOR[0];
  lastPick = pick;
  return pick;
}

const ASK_TO_DANCE = [
  /\b(?:can you|could you|will you|please)?\s*\b(?:dance|bust a move|show me your moves|get down)\b/,
  /\blet'?s dance\b/,
  /\bdance for me\b/,
  /\bdance party\b/,
];

const ASK_TO_STOP = /\b(?:stop|quit|enough|no more)\b.*\bdanc/;

/* Narrow on purpose. "dance" appears in song titles, in film names and in
   ordinary sentences, and none of those are an instruction to start dancing. */
function parseDanceIntent(raw) {
  const text = String(raw || "")
    .toLowerCase()
    .replace(/^\s*(?:hey\s+)?(?:braino|breno|braido|brainer|bruno|brauno)[\s,]+/, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  if (ASK_TO_STOP.test(text)) return { action: "stop", say: "Alright, I'll stop." };

  // Talking about dancing is not asking for it.
  if (/\b(?:play|put on|song called|track called|movie|film|video|watched)\b/.test(text) && !/\byou dance\b/.test(text)) {
    return null;
  }
  if (!ASK_TO_DANCE.some((pattern) => pattern.test(text))) return null;
  // "dance" alone, inside a longer sentence about something else, is not it.
  if (text.split(" ").length > 9) return null;

  return { action: "start" };
}

module.exports = { parseDanceIntent, pickDanceTrack, DANCE_FLOOR };
