// BrainoHilShared — the parts of the Human Intelligence harness that must be
// identical on both surfaces.
//
// The THINKING is already shared: one prompt (hil-loop-prompt.ts), one version,
// answered server-side for the browser and the Mac alike. The harness around it
// was not, and that is where every bug of the last week lived. A fix made in the
// Mac app stayed in the Mac app.
//
// So anything that is a judgement about the loop rather than about a particular
// pair of hands belongs here, and both load this same file: the extension by
// importScripts, the Mac app by require. Change it once.
(function initBrainoHilShared(global) {
  "use strict";

  /* Saying it is not doing it.
   *
   * Asked to run a task, Braino replied "I'm starting that now" and the run
   * ended with nothing started. An answer that describes work about to happen is
   * not an answer at all; it is a step that has not been taken. Treating it as
   * an ending is how a confident-sounding assistant does nothing.
   *
   * Deliberately about the future. "I opened it" and "I have sent it" are
   * reports of work done, and those end a run correctly. */
  var PROMISE = /\b(?:i'?ll\b|i will\b|i'?m going to\b|i am going to\b|let me\b|i'?m starting\b|starting (?:that|it|this) now\b|i'?ll get (?:right )?on\b|on it\b|right away\b|give me a (?:second|moment)\b)/i;
  var ALREADY_DONE = /\b(?:i (?:have |'?ve )?(?:opened|sent|closed|played|found|downloaded|deleted|added|saved|started|stopped|switched|created)|done\b|finished\b|here (?:it|they) (?:is|are)\b)/i;

  function promisesAction(text) {
    var said = String(text || "").trim();
    if (!said) return false;
    if (ALREADY_DONE.test(said)) return false;
    return PROMISE.test(said);
  }

  /* One step, identified.
   *
   * Used to tell "the thing you just said yes to" apart from "some other
   * irreversible thing chosen next", and to notice the same move being made over
   * and over. A yes must cover exactly what was asked about, once. */
  function stepSignature(step) {
    var a = (step && step.action) || {};
    return [
      a.type || "",
      a.index === undefined || a.index === null ? "" : a.index,
      a.url || "",
      a.key || "",
      String(a.text || "").slice(0, 40),
    ].join("|");
  }

  /* A yes.
   *
   * Generous about how it is phrased, strict about what it means. A gate that
   * cannot be got through is not a safeguard, it is a wall: one real session has
   * five yeses in a row answered with the identical question. */
  function answerApproves(text) {
    var t = String(text || "").toLowerCase().trim().replace(/[.!]+$/, "");
    if (!t) return false;
    if (/\b(no|nope|don'?t|do not|stop|cancel|wait|hold on|never ?mind)\b/.test(t)) return false;
    return /\b(yes|yeah|yep|yup|sure|ok|okay|go ahead|go on|do it|please do|confirm|confirmed|proceed|carry on|continue|absolutely|of course)\b/.test(t);
  }

  /* Going in circles, which is what should end a run rather than a step counter.
   *
   * A counter can only cut a run short; it can never tell you why. The same
   * action three times inside the last handful of moves means the screen has
   * stopped answering, and that is worth saying out loud instead of pretending
   * the budget ran out. */
  function isCircling(recentSignatures, signature, limit, window) {
    var cap = limit || 3;
    var span = window || 6;
    var recent = (recentSignatures || []).slice(-span);
    var seen = 0;
    for (var i = 0; i < recent.length; i += 1) if (recent[i] === signature) seen += 1;
    return seen >= cap;
  }

  var api = {
    promisesAction: promisesAction,
    stepSignature: stepSignature,
    answerApproves: answerApproves,
    isCircling: isCircling,
    PROMISE_NUDGE: "You just said you were about to do this. Saying it is not doing it. Take the next real action now.",
  };

  global.BrainoHilShared = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
