// BrainoHilAdapter — the seam where the canonical Human Intelligence loop becomes
// the Delegate's brain without replacing its hands.
//
// hil-loop (supabase/functions/reasoning/hil-loop) speaks the lab's contract:
//   in : { command, context, state: { tasks, facts, asides, steps, budgetLeft, screen, userReply, lastStep } }
//   out: { thinking, split, verdict, decision: step | ask | answer | task_done | all_done | blocked }
// The Delegate runner (background.js) speaks its own:
//   { thought, memory_update: { current_subgoal, subgoal_complete }, action, expect }
//
// This file is the ONLY place the two shapes meet, and it is pure functions on
// plain objects so it can be unit-tested with node, no browser required. The
// design rule from the plan: the amnesia lives or dies here. HIL's split becomes
// the runner's subgoals, HIL's task_done becomes subgoal_complete so
// markActiveSubgoalDone advances the pointer, and every turn's thinking becomes
// the thought the island shows — the same sentences the /human-intelligence Loop
// tab displays, now narrating real work.
(function initBrainoHilAdapter(global) {
  "use strict";

  var ASSERT_KINDS = { element_exists: 1, element_gone: 1, url_contains: 1, value_equals: 1, text_present: 1, none: 1 };

  // The kind alone is not enough: bgValidateAssertion THROWS on a missing companion
  // field, and a thrown validation discards the whole turn. An assert that would not
  // survive that check is dropped here so the step still runs, just unverified.
  function usableAssert(a) {
    if (!a || typeof a !== "object") return false;
    var kind = String(a.assert || "");
    if (!ASSERT_KINDS[kind]) return false;
    if (kind === "element_exists" || kind === "element_gone") return Boolean(a.match && typeof a.match === "object");
    if (kind === "url_contains" || kind === "text_present") return typeof a.value === "string" && Boolean(a.value.trim());
    if (kind === "value_equals") return Number.isInteger(a.index) && typeof a.value === "string";
    return true;
  }

  function hostOf(url) {
    try { return new URL(String(url)).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
  }

  // A one-line human label for an action, for HIL's `steps` history. Mirrors the
  // lab's describeAction so the model reads the same kind of trail it trained on.
  function describeAction(action) {
    if (!action || typeof action !== "object") return "nothing";
    var t = String(action.type || "");
    if (t === "navigate") return "navigate " + String(action.url || "");
    if (t === "click") return "click [" + action.index + "]";
    if (t === "type") return "type [" + action.index + "] \"" + String(action.text || "").slice(0, 60) + "\"";
    if (t === "web_search") return "web_search \"" + String(action.query || "").slice(0, 60) + "\"";
    if (t === "read") return action.index != null ? "read [" + action.index + "]" : "read";
    if (t === "scroll") return "scroll " + String(action.direction || "down");
    if (t === "selectOption") return "selectOption [" + action.index + "]";
    if (t === "pressKey") return "pressKey " + String(action.key || "");
    return t || "action";
  }

  function describeExpect(expect) {
    if (!expect || typeof expect !== "object" || expect.assert === "none") return "The action completes without an error.";
    if (expect.assert === "url_contains") return "The page URL contains \"" + expect.value + "\".";
    if (expect.assert === "element_exists") return "An element like " + JSON.stringify(expect.match || {}) + " is on the page.";
    if (expect.assert === "element_gone") return "The element " + JSON.stringify(expect.match || {}) + " is gone.";
    if (expect.assert === "text_present") return "The page shows the text \"" + expect.value + "\".";
    if (expect.assert === "value_equals") return "The field at [" + expect.index + "] holds \"" + expect.value + "\".";
    return "The action completes without an error.";
  }

  // Extension task state + live observation → the hil-loop request body.
  function toHilPayload(opts) {
    var task = String(opts.task || "");
    var state = opts.state || {};
    var subgoals = Array.isArray(state.subgoals) ? state.subgoals : [];
    var history = Array.isArray(state.history) ? state.history : [];
    var facts = Array.isArray(state.facts) ? state.facts : [];

    // On the very first turn the runner has exactly one placeholder subgoal (the
    // task itself, from createTaskState) and no history. Presenting that as "no
    // task list yet" lets HIL run its own RESTATE AND SPLIT, which is the whole
    // point: HIL owns the plan. After the split lands we present ITS list back.
    var firstTurn = !state.hilSplitDone;
    var tasks = firstTurn ? [] : subgoals.map(function (g) {
      return {
        desc: String(g.desc || ""),
        status: g.status === "done" ? "done" : g.status === "active" ? "active" : "pending",
      };
    });

    var steps = history.slice(-14).map(function (h) {
      return {
        intent: String(h.thought || "").slice(0, 200) || describeAction(h.action),
        action: describeAction(h.action),
        ok: typeof h.ok === "boolean" ? h.ok : null,
        why: h.ok ? null : String((h.result && h.result.error) || "").slice(0, 200) || null,
      };
    });

    var last = history.length ? history[history.length - 1] : null;
    var lastStep = last && last.action ? {
      intent: String(last.thought || "").slice(0, 200) || describeAction(last.action),
      action: last.action,
      expects: describeExpect(last.expect),
      result: last.result && last.result.error
        ? { error: String(last.result.error).slice(0, 600) }
        : { ok: last.ok !== false },
    } : undefined;

    return {
      command: task,
      context: String(opts.context || ""),
      runId: opts.runId || undefined,
      state: {
        tasks: tasks,
        facts: facts.slice(-20).map(function (f) {
          return (String(f.key || "") + ": " + String(f.value || "")).slice(0, 300);
        }),
        asides: [],
        steps: steps,
        budgetLeft: Math.max(1, Number(opts.budgetLeft) || 1),
        screen: String(opts.screen || ""),
        userReply: opts.userReply || undefined,
        lastStep: lastStep,
      },
    };
  }

  // A hil-loop turn → the decision shape bgRunDelegateLoop already consumes.
  // Returns { decision, split, verdict, thinking } — split is non-null only when
  // HIL just planned, and the caller must feed it to BrainoTaskState.setSubgoals.
  function fromHilTurn(turn, opts) {
    if (!turn || typeof turn !== "object" || !turn.decision) return null;
    var d = turn.decision;
    var thinking = String(turn.thinking || "").trim();
    var pendingLeft = Number((opts && opts.pendingCount) || 0);

    var base = {
      thought: thinking,
      memory_update: undefined,
      action: null,
      expect: { assert: "none" },
      done_confidence: 0,
    };

    if (d.type === "step" && d.step && d.step.action) {
      var action = Object.assign({}, d.step.action);
      // `look` is the Mac's screenshot verb; a browser's observation IS its screen,
      // and the nearest real act of looking is a full-page read.
      if (action.type === "look") action = { type: "read" };
      base.action = action;
      var a = d.step.assert;
      if (usableAssert(a)) {
        base.expect = a;
      } else if (action.type === "navigate" && hostOf(action.url)) {
        // The one assert that can always be derived. Without it every HIL turn
        // would verify as trivially true and the stuck counter would never move,
        // which silently kills escalation, replan and recovery.
        base.expect = { assert: "url_contains", value: hostOf(action.url) };
      }
      // A step HIL marked irreversible is a buy/publish/destroy moment. The runner
      // has no pause-and-confirm, but it HAS clarify, and the legacy prompt's own
      // rule was "for high-risk final actions not clearly requested, clarify".
      if (d.step.reversible === false) {
        base.action = { type: "clarify", text: "About to: " + String(d.step.intent || describeAction(action)) + ". This cannot be undone. Should I go ahead?" };
        base.expect = { assert: "none" };
      }
      return { decision: base, split: turn.split || null, verdict: turn.verdict || null, thinking: thinking };
    }

    if (d.type === "ask") {
      base.action = { type: "clarify", text: String(d.question || "What should I do here?") };
      return { decision: base, split: turn.split || null, verdict: turn.verdict || null, thinking: thinking };
    }

    if (d.type === "answer") {
      base.action = { type: "answer", text: String(d.text || "") };
      return { decision: base, split: turn.split || null, verdict: turn.verdict || null, thinking: thinking };
    }

    if (d.type === "task_done") {
      if (pendingLeft > 0) {
        // Mid-plan job boundary. The runner advances its pointer through
        // mergeMemoryUpdate's subgoal_complete → markActiveSubgoalDone, and the
        // wait is a harmless heartbeat so this turn still carries an action.
        base.memory_update = { subgoal_complete: true };
        base.action = { type: "wait", ms: 120 };
        base.thought = thinking || String(d.message || "");
        return { decision: base, split: null, verdict: turn.verdict || null, thinking: base.thought };
      }
      base.action = { type: "done" };
      return { decision: base, split: null, verdict: turn.verdict || null, thinking: thinking };
    }

    if (d.type === "all_done") {
      base.action = { type: "done" };
      return { decision: base, split: null, verdict: turn.verdict || null, thinking: thinking };
    }

    // blocked → surface the explanation and stop. clarify is the runner's only
    // "stop with a message, not a success" exit.
    base.action = { type: "clarify", text: String(d.message || "I hit something I could not get past.") };
    return { decision: base, split: null, verdict: turn.verdict || null, thinking: thinking };
  }

  var api = { toHilPayload: toHilPayload, fromHilTurn: fromHilTurn, describeAction: describeAction, describeExpect: describeExpect };
  global.BrainoHilAdapter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
