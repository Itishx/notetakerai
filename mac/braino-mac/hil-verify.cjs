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

module.exports = { macVerifyAssert, macHilStepSignature, macHilAnswerApproves, macPromisesAction };
