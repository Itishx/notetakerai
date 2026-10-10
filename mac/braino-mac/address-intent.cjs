"use strict";

/* Said TO him, or said ABOUT him (2026-10-03).
 *
 * Talking to someone else about Braino woke him: "the bug is that after Braino
 * is done asking me a question..." and "in the logs it says I have to say
 * Braino every single time" both went in as commands, and one started
 * clicking. His name anywhere in a sentence counted as calling him.
 *
 * A person tells the two apart by where the name sits. You call someone at the
 * start ("Braino, open YouTube", "hey Braino"), or at the end ("can you open
 * it, Braino?"), or set off by commas ("can you, Braino, open it"). You talk
 * about someone in the middle of a sentence, as the thing a sentence is about:
 * "after Braino is done", "say Braino", "Braino's notch", "Braino keeps".
 *
 * Pure, so it is tested without a microphone. */

const NAME = /^(?:braino|brayno|breno|raino|bruno|brino|brainelle)$/;
const LEAD_IN = /^(?:hey|hi|hello|ok|okay|so|yo|oi|and|now|right|alright|listen|please|um|uh|oh|well|bro|dude)$/;
const TAIL = /^(?:please|now|thanks|thank|you|bro|dude|man|yaar|ok|okay|right)$/;
// A name followed by an order or a question starts a new sentence to him,
// even mid-stream: "...I will do it later Braino open YouTube".
const STARTS_ASK = /^(?:open|close|quit|play|pause|stop|wait|send|message|text|call|search|find|show|tell|read|turn|set|switch|go|take|check|can|could|would|will|please|what|what's|whats|why|how|when|where|who|which|do|did|are|is|start|make|write|type|help|look|listen|explain|summarise|summarize|put|add|remind|book|order|minimise|minimize|maximise|maximize|mute|skip|next|cancel|hey|are|you)$/;
// Words that, right before the name, make it the subject of the sentence.
const ABOUT_BEFORE = /^(?:after|before|until|when|while|if|because|that|the|a|an|say|said|saying|says|call|called|calling|named|about|of|for|with|like|from|by|than|as|is|was|tell|told|telling|ask|asked|asking|asks|hear|heard|let|make|makes|made|how|why|where|whether|our|my|your|his|this|to|into|on|in|at|whom|or|and|but|not|nor)$/;
// Words that, right after the name, make it the subject of the sentence.
const ABOUT_AFTER = /^(?:is|was|isn|wasn|has|had|hasn|does|did|doesn|didn|will|would|won|can't|cannot|should|needs|need|keeps|kept|says|said|thinks|thought|starts|started|stops|stopped|knows|knew|gets|got|goes|went|works|worked|seems|sounds|looks|hears|heard|listens|replies|answers|asks|asked|takes|took|makes|made|tries|tried|s|itself|himself|and|or)$/;

function tokens(text) {
  return String(text || "").toLowerCase().replace(/[’']/g, "'").split(/\s+/).map((w) => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")).filter(Boolean);
}

/* True when a name in this sentence is calling him. False when the only
   mentions are about him. Null when his name is not in it at all. */
function nameIsAddressed(text) {
  const raw = String(text || "");
  const words = tokens(raw).map((w) => w.replace(/'s$/, " 's").split(" ")).flat();
  const at = [];
  words.forEach((w, i) => { if (NAME.test(w)) at.push(i); });
  if (!at.length) return null;
  // "can you, Braino, open it": set off by commas is calling.
  if (/,\s*(?:hey\s+)?(?:braino|brayno|breno|raino|bruno|brino|brainelle)\s*[,?!.]/i.test(raw)) return true;
  for (const i of at) {
    const before = words[i - 1] || "";
    const after = words[i + 1] || "";
    if (after === "'s") continue;
    // At the start, after nothing but a greeting or filler ("and Braino, ...").
    if (i <= 3 && words.slice(0, i).every((w) => LEAD_IN.test(w)) && !(i > 0 && ABOUT_AFTER.test(after) && !LEAD_IN.test(before))) return true;
    if (before && ABOUT_BEFORE.test(before)) continue;
    if (after && STARTS_ASK.test(after) && !ABOUT_AFTER.test(after)) return true;
    if (after && ABOUT_AFTER.test(after)) continue;
    // At the end, maybe with "please" or "now" after it.
    if (words.slice(i + 1).every((w) => TAIL.test(w))) return true;
  }
  return false;
}

module.exports = { nameIsAddressed };
