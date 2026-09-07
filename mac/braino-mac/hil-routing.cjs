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

/* The fast lane.
 *
 * These are the things the cascade is genuinely better at than the loop, and
 * they are all the same kind of thing: native Mac powers the loop has no verb
 * for. Launching an app, controlling playback, the file system, calls, system
 * toggles, Braino's own modes. They also answer in under a second, and making
 * "play billie jean" wait on a model would be a downgrade dressed up as
 * intelligence.
 *
 * Everything NOT in here is browser shaped work, which is exactly what the
 * loop's vocabulary is: navigate, read, look, click, type, scroll, search. That
 * work goes to the brain by default, without being asked.
 */
const MAC_FAST_LANE = [
  // Playback and music
  /\b(play|pause|resume|skip|next track|previous track|stop the music|volume|mute|unmute|spotify|moonwalk|dance)\b/,
  // Launching, quitting and switching apps
  /\b(launch|quit|switch to|close)\b/,
  /* An app name, not any sentence that happens to begin with "open". This was
     matching "open a new google doc and write three lines about what you did in
     the last hour" whole, because it is all lowercase letters to the end. */
  /\bopen\s+(?!.*\b(?:gmail|inbox|mail|youtube|linkedin|twitter|maps|amazon|github|medium|docs?|drive|calendar|whatsapp web)\b)(?!.*\band\b)[a-z .]{2,22}$/,
  // The file system
  /\b(file|files|folder|desktop|downloads|organi[sz]e|rename|trash|screenshot|screen shot)\b/,
  // Talking to people through the Mac
  /\b(call|facetime|whatsapp|imessage|text|message)\b/,
  // The machine itself
  /\b(wifi|wi-fi|bluetooth|brightness|dark mode|do not disturb|battery|airdrop|sleep|restart)\b/,
  // Braino's own surfaces
  /\b(braino os|dictation|hera|yap|teleprompter|meeting|note|notes|mode|what'?s new|cursor mode|jarvis|roam)\b/,
];

/* Naming a website settles it, whatever else the sentence contains.
   "reply to that linkedin message" is browser work that happens to say
   "message", and the Mac's own messaging has no idea what LinkedIn is. */
const MAC_BROWSER_TARGET = /\b(gmail|inbox|e?mail thread|youtube|linkedin|twitter|\bx\.com|instagram|reddit|maps|amazon|flipkart|zomato|swiggy|blinkit|github|medium|notion|figma|docs|sheets|drive|calendar|whatsapp web|browser|chrome|tabs?|websites?|sites?|urls?|links?)\b/;

/* Work that has to be found out rather than done.
 *
 * "find three dictation apps and tell me what they charge" contains "find", and
 * the fast lane's file search grabbed it and answered about the local disk. Six
 * of twenty four commands went the wrong way for reasons like that. What marks
 * these is not the verb at the front but that they end in a judgement: compare,
 * rank, tell me which, how much, is it up. No pattern can answer that. */
const MAC_RESEARCH = /\b(compare|look up|find out|research|and tell me|and then tell|summari[sz]e|rank (?:them|these|by)|which (?:one|is|of)|how (?:much|many|fast|long|old)|check (?:if|whether)|word error|charges?|pric(?:e|ing)|versus|vs\.?)\b/;

function macFastLane(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (!t) return true;
  if (MAC_BROWSER_TARGET.test(t)) return false;
  if (MAC_RESEARCH.test(t)) return false;
  return MAC_FAST_LANE.some((re) => re.test(t));
}

/* Pointing at the screen.
 *
 * "rename this file", "click Done on the screen", "open that invoice you just
 * downloaded". A referent like this cannot be answered by a pattern match,
 * because working out what "this" is requires looking. The cascade tried
 * anyway: the log has "rename this file to invoice one" answered with "I
 * searched the Mac, but did not find this", which is what guessing looks like.
 *
 * Kept deliberately narrow. "play that song" is still the fast lane; only an
 * explicit reference to what is on screen, or to something just done, counts. */
const MAC_SCREEN_REFERENT = /\bon (?:my|the|this) screen\b|\byou (?:just |can )?(?:see|saw)\b|\b(?:this|that) (?:file|page|email|tab|window|invoice|document|folder|thing|one)\b|\byou just (?:downloaded|opened|made|created|found)\b|\blook at (?:my|the) screen\b/;

function macNeedsScreenContext(raw) {
  return MAC_SCREEN_REFERENT.test(String(raw || "").toLowerCase());
}

/* What the brain gets, without anyone asking it to.
 *
 * A job, not a question, and not something the cascade does better. This is the
 * whole point: you should not have to say "use your brain" for him to use it.
 */
function macWantsTheBrain(raw) {
  if (macAsksForTheBrain(String(raw || "").toLowerCase())) return true;
  /* More than one job goes to the brain, whatever the jobs are.
   *
   * This is the single worst failure in the 2026-08-25 session and it looks
   * like a routing detail: "find the latest email from Anthropic, put the
   * invoice number in a note, then play something instrumental" contains the
   * word play, the fast lane recognises play, and so all three jobs went to a
   * pattern match. It matched the mail pattern, asked "what should the email
   * say", and then swallowed the next three commands as the body of an email
   * nobody asked for.
   *
   * A pattern match can answer one thing. Deciding what a sentence with three
   * things in it means is the whole job of the layer above, so it gets it
   * before anything else is considered. */
  if (macLooksMultiStep(raw)) return true;
  // Working out what "this" points at means looking, which only he can do.
  if (macNeedsScreenContext(raw)) return true;
  /* Finding something out IS the work, even though "compare" and "look up" are
     not in the list of things you can do to a Mac. Checked before the task gate
     for exactly that reason: it was rejecting them as not-a-task and handing
     them to a pattern match. */
  if (MAC_RESEARCH.test(String(raw || "").toLowerCase())) return true;
  /* The default flipped here, and this is the whole change.
   *
   * It used to be: reach the brain only if the sentence carries one of the verbs
   * on a list. That list is a guess about how people talk, and every phrasing it
   * missed silently fell through to a pattern match. "Get me a Canva document
   * for the pitch" has no listed verb. Neither does "I need three keyboards
   * under ten thousand". Both are obviously work.
   *
   * It is now: the fast lane keeps what it is genuinely better at, conversation
   * stays conversation, and everything else is the brain's. The brain has the
   * whole tool catalog and can answer conversationally itself, so an over-send
   * costs a few seconds. An under-send costs a wrong answer delivered
   * confidently, which is what the old default kept producing. */
  if (macFastLane(raw)) return false;
  return !macIsConversation(raw);
}

/* Talking TO Braino rather than asking him to do something.
 *
 * "how are you", "what is the capital of France", "who made you". Routing these
 * through a fourteen step agent loop would make a one second answer take five,
 * and would be worse: the loop's job is to act, and there is nothing here to do.
 *
 * Narrow on purpose. A question that names work is still work: "how much does
 * Astra cost" is caught by MAC_RESEARCH above and never reaches this. */
const MAC_CHITCHAT = /^(?:hey\s+|ok\s+|okay\s+)?(?:braino[,\s]+)?(?:how (?:are|do) you|who (?:are|made) you|what (?:are|can) you|are you |good (?:morning|evening|night)|hello|hi\b|thanks|thank you|nice|cool|nothing|never ?mind)/i;

function macIsConversation(raw) {
  const t = String(raw || "").trim();
  if (!t) return true;
  if (MAC_CHITCHAT.test(t)) return true;
  /* A bare question about the world, with no job in it. "what is X" is a
     question; "what is X, then put it in a note" is two jobs and already went
     to the brain above, because a continuation is caught before this. */
  if (/^(?:what|who|when|where|why|whose)\b/i.test(t) && !MAC_TASK_VERB.test(t.toLowerCase())) return true;
  return false;
}

/* "Close all the tabs."
 *
 * A native Mac power, so it belongs in the fast lane: one AppleScript, every
 * window, instant. It was already written and it still failed in a real
 * session, because the matcher ended in `tabs$` and the person said "close all
 * the tabs please". The word please sent a one second job to the app resolver,
 * which looked for an application called "all the tabs" and said so out loud.
 *
 * So the phrasing is loose and the SHAPE is what stays strict: one job, no
 * continuation, and no site named. "close the youtube tabs" is a different
 * thing and must not match; "close all my tabs, then open cursor" is two jobs
 * and belongs to the brain.
 */
const CLOSE_ALL_TABS = /^(?:hey\s+|ok\s+|okay\s+)?(?:braino[,\s]+)?(?:can you\s+|could you\s+|please\s+|just\s+)*(?:close|shut|clear|kill|get rid of)\s+(?:all\s+(?:of\s+)?)?(?:the\s+|my\s+|these\s+|those\s+)?(?:browser\s+|open\s+|chrome\s+)?(?:tabs?|every\s+tab)(?:\s+(?:in|on)\s+(?:chrome|the\s+browser|safari|brave|edge))?(?:\s+(?:please|now|for me|thanks|thank you))*[.?!]*$/i;

function macClosesAllTabs(raw) {
  const text = String(raw || "").trim();
  if (!text) return false;
  /* A continuation means more than one job, and the brain owns those. */
  if (/,\s*(?:then|and)\b|\band then\b/i.test(text)) return false;
  return CLOSE_ALL_TABS.test(text);
}

module.exports = {
  macNeedsScreenContext,
  macIsConversation,
  macFastLane,
  macWantsTheBrain,
  macLooksMultiStep,
  macAsksForTheBrain,
  macStripBrainRequest,
  macLooksLikeTask,
  macClosesAllTabs,
  CLOSE_ALL_TABS,
};
