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
    return norm(el.name).includes(norm(expect.value)) ? { ok: true } : { ok: false, why: `[${expect.index}] does not hold "${expect.value}".` };
  }
  return { ok: true };
}

/* One step, identified. Used to tell "the thing you just said yes to" apart
   from "some other irreversible thing the model chose next". */
function macHilStepSignature(step) {
  const a = step?.action || {};
  return [a.type || "", a.index ?? "", a.url || "", a.key || "", String(a.text || "").slice(0, 40)].join("|");
}

/* A yes.
 *
 * Generous about how it is phrased, strict about what it means: it approves the
 * one step that was described, once. A no is caught before this by
 * isWorkflowCancelIntent, and anything that is neither is treated as an answer
 * to a question rather than as permission. */
function macHilAnswerApproves(text) {
  const t = String(text || "").toLowerCase().trim().replace(/[.!]+$/, "");
  if (!t) return false;
  if (/\b(no|nope|don'?t|do not|stop|cancel|wait|hold on|never ?mind)\b/.test(t)) return false;
  return /\b(yes|yeah|yep|yup|sure|ok|okay|go ahead|go on|do it|please do|confirm|confirmed|proceed|carry on|continue|absolutely|of course)\b/.test(t);
}

/* Saying it is not doing it.
 *
 * Asked to run task 49, he replied "Task 49 is open a site that does not exist
 * and tell me what happened. I'm starting that now." and then the run ended.
 * Nothing was started. An answer that describes what he is about to do is not
 * an answer at all, it is a step he has not taken yet.
 *
 * Deliberately about the future. "I opened it" and "I have sent it" are
 * reports of work done and end the run correctly. */
const PROMISE = /\b(?:i'?ll\b|i will\b|i'?m going to\b|i am going to\b|let me\b|i'?m starting\b|starting (?:that|it|this) now\b|i'?ll get (?:right )?on\b|on it\b|right away\b|give me a (?:second|moment)\b)/i;
const ALREADY_DONE = /\b(?:i (?:have |'?ve )?(?:opened|sent|closed|played|found|downloaded|deleted|added|saved|started|stopped|switched|created)|done\b|finished\b|here (?:it|they) (?:is|are)\b)/i;

function macPromisesAction(text) {
  const said = String(text || "").trim();
  if (!said) return false;
  if (ALREADY_DONE.test(said)) return false;
  return PROMISE.test(said);
}

module.exports = { macVerifyAssert, macHilStepSignature, macHilAnswerApproves, macPromisesAction };
