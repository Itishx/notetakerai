// HIL first: the router decides, the old patterns only carry it out.
//
// Until now every command went to the regex cascade first and HIL only saw
// what the cascade could not claim. The cascade takes whatever follows a
// trigger word as its target, so "open WhatsApp for me" asked what to say to
// "for me", "close your eyes" looked for an app called "your eyes", and "play
// that song" played a track called That Song. 171 of 1616 logged commands were
// misread that way. A router that reads the sentence cannot make those.
//
// The router answers in ~1.4s. That is worth it for everything except the
// handful of one-word controls where nothing can be misread and waiting would
// be felt, so those keep going straight through.
//
// Pure on purpose: main.cjs does the side effects, this file only decides, so
// the decisions can be tested without an Electron app.

/* Short media and playback controls. Anchored and closed: a sentence that only
   STARTS with one of these words ("play that song on Spotify", "stop the
   current task") is not instant and goes to the router, which is the whole
   point. */
const INSTANT = /^(?:(?:hey\s+)?brain(?:o|elle)[,.!\s]+)?(?:pause|resume|play|unpause|next|next (?:song|track)|skip|skip (?:this|it|this song|the song)|previous|previous (?:song|track)|go back a song|louder|quieter|volume (?:up|down)|turn it (?:up|down)|mute|unmute)(?:\s+(?:the\s+)?(?:music|song|spotify|video))?(?:\s+please)?[.!?\s]*$/i;

function isInstantCommand(raw) {
  return INSTANT.test(String(raw || "").trim());
}

/* What to do with the router's verdict.
 *
 *   fire      a tool this Mac has          -> run it
 *   fire      a tool this Mac does not have -> the old path, which may have it
 *   escalate                               -> the loop
 *   ask                                    -> say the question, hold the command
 *   say                                    -> conversation
 *   anything unreadable                    -> the old path, never nothing
 */
function planFromVerdict(verdict, wiredTools) {
  const v = verdict && typeof verdict === "object" ? String(verdict.v || "") : "";
  if (v === "fire") {
    const tool = String(verdict.t || "");
    if (tool && wiredTools && Object.prototype.hasOwnProperty.call(wiredTools, tool)) {
      const args = verdict.a && typeof verdict.a === "object" && !Array.isArray(verdict.a) ? verdict.a : {};
      return { kind: "fire", tool, args };
    }
    return { kind: "legacy", why: tool ? `unwired:${tool}` : "fire without a tool" };
  }
  if (v === "escalate") return { kind: "loop", why: String(verdict.why || "") };
  if (v === "ask") {
    const question = String(verdict.q || "").trim();
    return question ? { kind: "ask", question } : { kind: "loop", why: "empty question" };
  }
  if (v === "say") return { kind: "chat" };
  return { kind: "legacy", why: "no verdict" };
}

/* OFF by default since 2026-09-25. On its first real day it sent 17 of 38
   commands to the step-by-step loop (15 to 80 seconds each) and added about
   1.4 seconds to every other one; the days before, with the shortcuts first,
   ran at 3 to 4 seconds a turn. BRAINO_HIL_FIRST=1 turns it back on, for when
   the router is fast (Jev) and stops escalating simple commands. */
function hilFirstEnabled(envFile, processEnv) {
  const fromFile = envFile && typeof envFile === "object" ? envFile.BRAINO_HIL_FIRST : "";
  return String(fromFile || (processEnv && processEnv.BRAINO_HIL_FIRST) || "").trim() === "1";
}

module.exports = { isInstantCommand, planFromVerdict, hilFirstEnabled };
