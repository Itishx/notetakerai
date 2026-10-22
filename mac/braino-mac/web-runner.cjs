"use strict";
/* HIL 2.0 web rules (2026-10-23): act like a person, at script speed.
 *
 * The n8n signup took 17 turns and two minutes for four human clicks. The
 * reasons were not the model being stupid; they were the hands and the rules:
 *   - an empty email box was invisible to the page read (fixed in chrome-page)
 *   - when a click "failed" he wrote into the page with a script, which a real
 *     app ignores, then forced the form through behind its back
 *   - six moves left the page exactly as it was and nothing made him stop
 * This file is those rules, in one place, shared by the Mac and the headless
 * test bench (scripts/hil-web-bench.mjs) so what is tested is what ships. */

/* Up to this many moves run back to back from one look, no thinking between. */
const CHAIN_MAX = 8;

/* A script that does a person's job: types into a box, clicks, or submits a
   form. Reading the page with a script is fine; acting through one is the
   last resort, after the person's way failed twice. */
const SCRIPT_ACTS = /\.value\s*=(?!=)|\.click\s*\(|dispatchEvent\s*\(|requestSubmit\s*\(|\.submit\s*\(|execCommand\s*\(|insertText|setRangeText/;

function isScriptHack(action) {
  return Boolean(action && action.type === "exec_js" && SCRIPT_ACTS.test(String(action.code || "")));
}

/* steps: the run's own record, newest last, each { action, ok }. */
function personFailures(steps) {
  return (steps || []).filter((s) => s && s.ok === false && /^(type|click|pressKey)\b/.test(String(s.action || ""))).length;
}

function scriptGuard(action, steps) {
  if (!isScriptHack(action)) return null;
  if (personFailures(steps) >= 2) return null;
  return {
    ok: false,
    error: "Refused: that script types, clicks or submits behind the page's back, and real sites ignore it. Do it the way a person does: type into the box by its index, click the button by its index, or press Enter. Scripts are only for reading the page.",
  };
}

/* Did anything move? Count moves in a row that left the page exactly as it
   was. Three is the point a person stops, looks properly and rethinks. */
function createWatchdog(limit = 3) {
  let still = 0;
  return {
    note(before, after, action) {
      const quiet = action && /^(wait|read|look|web_search|tool)$/.test(String(action.type || ""));
      if (quiet) return null;
      if (before && after && before === after) still += 1; else still = 0;
      if (still >= limit) {
        still = 0;
        return `STUCK: your last ${limit} moves left the page exactly as it was. Stop repeating. Look at the screen again properly (a box you have not filled, a greyed-out button, a message on the page, a checkbox, a popup in the way), then choose a DIFFERENT approach. If there is no other approach, ask the user one short question.`;
      }
      return null;
    },
    reset() { still = 0; },
  };
}

/* What to try when a move fails, in order, so a failure is never retried as
   the same move. Given to the model as a fact after any failed move. */
const RETRY_LADDER = "A move failed. Do not repeat it as it was. In order: 1) wait 1s if the page is still loading; 2) scroll to it if it is offscreen; 3) pick the same control by a different index or its label (the read may have renumbered); 4) if a button is disabled, the form is missing something: fill it first; 5) look at the screen (look) if the read does not explain it; 6) ask the user.";

module.exports = { CHAIN_MAX, isScriptHack, scriptGuard, createWatchdog, RETRY_LADDER, personFailures };
