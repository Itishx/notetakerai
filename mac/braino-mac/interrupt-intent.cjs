"use strict";

/* "Stop."
 *
 * The one word that has to work every single time, and in the 2026-08-25
 * session it did not work once. "Braino stop that task. Stop. Stop." was
 * swallowed by a half finished email workflow, which answered "I still need the
 * email address" three times in a row. A running loop carried on for twenty
 * seconds after the stop hotkey. Nothing about that is a small bug: stop is the
 * word people reach for when something is already going wrong.
 *
 * Two things live here, and they are the same problem seen from both ends.
 *
 *   1. What counts as stop. Loose about the sentence, strict about the subject:
 *      "stop that task", "stop, stop, stop", "cancel that" all abort. "Stop the
 *      song" does not, because that is playback and it has its own handler.
 *
 *   2. What a half finished workflow is allowed to claim. A pending question
 *      used to treat the next thing you said as its answer, whatever it was, so
 *      a brand new command became the body of an email. A question may claim an
 *      answer. It may not claim an instruction.
 */

/* Playback, timers and recordings have their own stop verbs and must fall
   through to them. Listed by what is being stopped, never by the verb. */
const STOPPABLE_THING = /\b(?:song|music|track|playback|spotify|player|video|timer|stopwatch|alarm|recording|record|meeting|dictation|listening|talking|speaking)\b/i;

const STOP_PHRASE = /^(?:hey\s+|ok\s+|okay\s+)?(?:braino[,\s]+)?(?:please\s+|just\s+)?(?:stop|cancel|abort|halt|quit it|never\s?mind|forget it|drop it|leave it|scrap that|belay that)\b/i;

/* "stop that", "stop this task", "stop what you are doing" — a subject that
   means the work itself rather than something playing. Articles first, because
   people say "stop that task" and "stop the task" in equal measure. */
const STOP_ARTICLES = /^(?:the|that|this|those|these|your|my)\s+/i;
const STOP_SUBJECT_OK = /^(?:task|job|run|command|thing|work|everything|all of (?:it|this|that)|it|that|this|what(?:ever)? you(?:'re| are)? doing|doing (?:that|this))\b/i;

function parseInterruptIntent(raw) {
  const text = String(raw || "").trim().replace(/[.?!]+\s*$/, "");
  if (!text) return null;
  if (!STOP_PHRASE.test(text)) return null;

  /* What comes after the stop word decides who owns it. */
  const rest = text.replace(STOP_PHRASE, "").trim();
  if (STOPPABLE_THING.test(rest)) return null;

  /* A bare stop, a repeated stop, or a stop aimed at the work itself. */
  const bare = !rest || /^[,\s]*(?:stop[,.\s]*)*(?:cancel|now|please|braino|it|that|this)?[,.\s]*$/i.test(rest);
  if (bare || STOP_SUBJECT_OK.test(rest.replace(STOP_ARTICLES, ""))) {
    return { action: "abort", say: "Stopped." };
  }
  return null;
}

/* Can this pending question claim what was just said?
 *
 * A question may claim an answer. It may not claim an instruction. The tell is
 * not politeness or length, it is that a new command names a PLACE: an app, a
 * site, the screen, a file. Bodies of emails and names of people do not. */
const NEW_COMMAND_VERB = /\b(?:open|close|play|pause|search|find|show|go to|switch|delete|download|start|launch|quit|create|make|write|draft|post|tweet|order|buy|look at|tell me|change|set|put up|take)\b/i;
const NAMES_A_PLACE = /\b(?:chrome|safari|browser|tabs?|gmail|inbox|email|mail|spotify|youtube|github|linkedin|notion|figma|amazon|x\.com|twitter|instagram|whatsapp|calendar|cursor|finder|desktop|downloads?|folder|file|screen|wallpaper|repository|repo|website|site|note|notes|terminal)\b/i;

function workflowClaimsUtterance(pending, raw) {
  const text = String(raw || "").trim();
  if (!text) return false;
  const stage = String(pending?.stage || "");

  /* An email address is the only thing this stage can use. Anything else has
     been answering "I still need the email address" forever. */
  if (stage === "mail_email") return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) || /\b(?:at|dot)\b/i.test(text) === false && text.split(/\s+/).length <= 4;

  /* A recipient is a name. Names are short and do not name places. */
  if (stage === "mail_recipient" || stage === "playlist_name") {
    if (text.split(/\s+/).length > 6) return false;
    return !(NEW_COMMAND_VERB.test(text) && NAMES_A_PLACE.test(text));
  }

  /* A body can be almost anything, so the bar for taking it away is high: it
     has to both tell him to do something AND name somewhere to do it. */
  if (NEW_COMMAND_VERB.test(text) && NAMES_A_PLACE.test(text)) return false;
  return true;
}

module.exports = { parseInterruptIntent, workflowClaimsUtterance };
