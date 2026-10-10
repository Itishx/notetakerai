"use strict";

/* Did it actually work, and did they actually say yes.
 *
 * Both of these were quietly wrong on the Mac and between them they made the
 * loop look stupid while it was thinking perfectly well. The URL check compared
 * an address against a window title, so every navigation reported failure and
 * the loop navigated again, and again. The gate threw its run away when it
 * asked, so a yes restarted the planning and produced the same question.
 *
 * Pure functions on plain objects, so they can be tested without Electron.
 */

// HIL emits a machine-checkable assert on every step and the Mac was discarding
// all of them, so the only verification was the model judging its own work on the
// next turn. That is the failure mode where a run looks healthy while achieving
// nothing. Mirrors extension/lib/recovery.js verifyAssertion.
function macVerifyAssert(expect, obs) {
  if (!expect || typeof expect !== "object" || expect.assert === "none") return { ok: true };
  const els = Array.isArray(obs?.elements) ? obs.elements : [];
  const hay = [obs?.appName || "", obs?.windowTitle || "", ...els.map((e) => `${e.role} ${e.name}`)].join(" ").toLowerCase();
  const norm = (v) => String(v || "").trim().toLowerCase();
  if (expect.assert === "text_present") {
    return hay.includes(norm(expect.value)) ? { ok: true } : { ok: false, why: `I could not find "${expect.value}" on screen afterwards.` };
  }
  if (expect.assert === "url_contains") {
    /* Against the real address, not the window title.
       The title was the bug that made two jobs impossible: a Gmail window is
       called "Inbox (12) - Gmail" and contains the string "mail.google.com"
       nowhere at all, so every single navigation reported failure, the loop
       decided it had not arrived, and navigated again. And again. That is the
       hundred tabs, and it is why the run never reached its second job: the
       first one could never be declared finished. */
    const want = norm(expect.value);
    const url = norm(obs?.browserUrl);
    if (url) {
      return url.includes(want)
        ? { ok: true }
        : { ok: false, why: `The address is ${obs.browserUrl}, not ${expect.value}.` };
    }
    return hay.includes(want) ? { ok: true } : { ok: false, why: `Nothing on screen mentions "${expect.value}".` };
  }
  if (expect.assert === "element_exists" || expect.assert === "element_gone") {
    const want = norm(expect.match?.name);
    const found = !want || els.some((e) => norm(e.name).includes(want));
    const shouldExist = expect.assert === "element_exists";
    return found === shouldExist ? { ok: true } : { ok: false, why: shouldExist ? `"${expect.match?.name}" never appeared.` : `"${expect.match?.name}" is still there.` };
  }
  if (expect.assert === "value_equals") {
    const el = els.find((e) => Number(e.index) === Number(expect.index));
    if (!el) return { ok: false, why: `Element [${expect.index}] is no longer on screen.` };
    const have = norm(el.name);
    const want = norm(expect.value);
    if (have.includes(want)) return { ok: true };
    /* Chat boxes (Cursor, Claude, ChatGPT) report only the start of long
       text, or a placeholder. 2026-10-05: a bug report typed into Cursor
       five times over, each time correctly, because the full text was never
       read back. The opening words being there is the text being there. */
    const opening = want.slice(0, 40);
    if (want.length > 40 && opening && have.includes(opening)) return { ok: true };
    return { ok: false, why: `[${expect.index}] does not hold "${expect.value}".` };
  }
  return { ok: true };
}

/* Shared with the browser extension, on purpose.
 *
 * These are judgements about the loop rather than about a particular pair of
 * hands, and a fix to one surface that does not reach the other is how the same
 * bug gets found twice. extension/lib/hilShared.js is the single copy; this
 * file adds only what is genuinely Mac-shaped, which is the assertion checker
 * above (a Mac window has no URL until you ask the browser for it). */
const shared = require("../../extension/lib/hilShared.js");
const macPromisesAction = shared.promisesAction;
const macHilStepSignature = shared.stepSignature;
const macHilAnswerApproves = shared.answerApproves;

/* A claim that something WAS done, as opposed to an answer, a plan or a
   question.
 *
 * "Turn on the light" ended with "Done. The light was turned on through the Mac
 * controls." Nothing had been turned on: the run had opened the Home app,
 * looked at the screen, read a terminal that happened to contain the words, and
 * believed it. A claim like that has to be backed by an action that actually
 * ran, and this is the half that recognises the claim.
 *
 * First person or passive completion only. An answer that happens to contain
 * "set" ("the meeting is set for five") is not a claim. */
const CLAIM_PATTERNS = [
  /^(?:ok(?:ay)?,?\s*)?(?:all\s+)?done\b/i,
  /^(?:ok(?:ay)?,?\s*)?(?:just\s+)?(?:turned|switched|opened|closed|sent|posted|played|paused|stopped|created|saved|deleted|renamed|moved|updated|changed|installed|activated|enabled|disabled|added|submitted|uploaded|downloaded|booked|ordered)\b/i,
  /\bI (?:have |'ve )?(?:just )?(?:turned|switched|opened|closed|sent|posted|played|paused|stopped|created|saved|deleted|renamed|moved|updated|changed|installed|activated|enabled|disabled|added|submitted|uploaded|downloaded|booked|ordered|set it)\b/i,
  /\b(?:it|that|the [\w' ]{1,24}) (?:was|has been|is now|are now) (?:turned|switched|opened|closed|sent|posted|played|paused|stopped|created|saved|deleted|renamed|moved|updated|changed|installed|activated|enabled|disabled|added)\b/i,
];
const NOT_A_CLAIM = /\b(?:could ?n[o']t|could not|cannot|can[''`]?t|unable|failed|did ?n[o']t|did not|will|would|should|want me to|do you want|shall I|about to|going to|trying to|next step)\b/i;

function macClaimsAction(text) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  if (!line) return false;
  if (NOT_A_CLAIM.test(line)) return false;
  return CLAIM_PATTERNS.some((pattern) => pattern.test(line));
}

/* Observations are not actions. A run that only looked and read has changed
   nothing, whatever it says at the end. */
const OBSERVATION_ACTIONS = new Set(["read", "look", "observe", "screenshot", "wait", "think", "note"]);

function macActionChangedSomething(action, result) {
  if (!result || result.ok === false) return false;
  const type = String(action?.type || "").toLowerCase();
  if (!type || OBSERVATION_ACTIONS.has(type)) return false;
  if (type === "tool") {
    const tool = String(action.tool || "").toLowerCase();
    // Tools that only report back leave the Mac exactly as it was.
    if (/^(?:now_playing|spotify_now_playing|screen_vision|front_window_summary|take_screenshot|tabs_census|read_selection|web_search|deep_research)$/.test(tool)) return false;
  }
  return true;
}

module.exports = { macVerifyAssert, macHilStepSignature, macHilAnswerApproves, macPromisesAction, macClaimsAction, macActionChangedSomething };
