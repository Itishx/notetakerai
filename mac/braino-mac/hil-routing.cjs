"use strict";

/* Which commands the brain gets.
 *
 * The HIL loop is the same brain the browser Delegate already runs on, and on
 * the Mac it now sits in front of the regex cascade for the work the cascade
 * cannot do. These are the pure decisions about what reaches it, kept out of
 * main.cjs so they can be tested without launching Electron.
 *
 * The cascade stays the fast lane. "play billie jean" and "open spotify" answer
 * in under a second and must never wait on a model, so a single plain command
 * must NOT come here.
 */

function macLooksMultiStep(raw) {
  const t = String(raw || "").toLowerCase();
  if (t.length < 12) return false;
  const JOB = "(send|email|play|open|search|find|save|add|move|summari[sz]e|reply|message|schedule|screenshot|download|write|draft|put)";
  if (new RegExp("\\b(then|after that|and then|once you|followed by)\\b").test(t)) return true;
  // A job verb on EITHER side of "and" is two jobs. Only checking after it missed
  // "summarise this and put it in my notes", where the first verb leads.
  return new RegExp("\\b" + JOB + "\\b.*\\band\\b.*\\b" + JOB + "\\b").test(t);
}

/* Asking him to think forces the loop whatever the sentence looks like, which
   is the honest way to reach for it on purpose. */
function macAsksForTheBrain(text) {
  return /\b(use your brain|think it through|think about it|think this through|figure it out|work it out|reason through|use hil)\b/.test(String(text || ""));
}

function macStripBrainRequest(raw) {
  const stripped = String(raw || "")
    .replace(/\b(use your brain|think it through|think about it|think this through|figure it out|work it out|reason through|use hil)\b[,:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || String(raw || "");
}

/* A job, as opposed to a question about the world. Conversation stays
   conversation: sending "what is the capital of France" round a fourteen step
   agent loop would be slower and worse than simply answering it. */
const MAC_TASK_VERB = /\b(send|email|play|pause|open|close|search|find|save|add|remove|delete|move|rename|summari[sz]e|reply|message|schedule|screenshot|download|write|draft|put|copy|create|make|start|stop|book|order|share|post|upload|install|update|fill|sign in|switch|click|type|go to|take me)\b/;

function macLooksLikeTask(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (t.length < 6) return false;
  if (!MAC_TASK_VERB.test(t)) return false;
  // "what should I open" is a question about opening, not an instruction to open.
  if (/^(what|who|when|where|why|how come|is|are|was|were|does|did|should i|could i|can i)\b/.test(t)) return false;
  return true;
}

module.exports = {
  macLooksMultiStep,
  macAsksForTheBrain,
  macStripBrainRequest,
  macLooksLikeTask,
};
