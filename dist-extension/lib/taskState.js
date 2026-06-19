(function initBrainoTaskState(global) {
  "use strict";

  function now() {
    return Date.now();
  }

  function createTaskState(goal, focusTabId) {
    const desc = String(goal || "").trim() || "Complete the browser task";
    return {
      goal: desc,
      subgoals: [{ id: "1", desc, status: "active" }],
      facts: [],
      history: [],
      focusTabId: focusTabId || null,
      stuckCount: 0,
      activeSubgoal: "1",
      confirmedDestructive: false,
    };
  }

  function normalizeSubgoals(subgoals, fallbackGoal) {
    if (!Array.isArray(subgoals) || !subgoals.length) return [{ id: "1", desc: fallbackGoal, status: "active" }];
    let hasActive = false;
    return subgoals.slice(0, 8).map((item, index) => {
      const status = ["pending", "active", "done", "failed"].includes(item?.status) ? item.status : (index === 0 ? "active" : "pending");
      if (status === "active") hasActive = true;
      return {
        id: String(item?.id || index + 1),
        desc: String(item?.desc || item?.goal || item || `Step ${index + 1}`).trim(),
        status,
      };
    }).map((item, index) => (!hasActive && index === 0 ? { ...item, status: "active" } : item));
  }

  function setSubgoals(state, subgoals) {
    state.subgoals = normalizeSubgoals(subgoals, state.goal);
    state.activeSubgoal = state.subgoals.find((goal) => goal.status === "active")?.id || state.subgoals[0]?.id || "1";
    return state;
  }

  function mergeMemoryUpdate(state, update, source) {
    if (!update || typeof update !== "object") return state;
    if (Array.isArray(update.facts)) {
      for (const fact of update.facts) {
        const key = String(fact?.key || "").trim();
        const value = String(fact?.value || "").trim();
        if (!key || !value) continue;
        const existing = state.facts.find((item) => item.key === key);
        if (existing) {
          existing.value = value;
          existing.source = source || existing.source || "model";
        } else {
          state.facts.push({ key, value, source: source || "model" });
        }
      }
      state.facts = state.facts.slice(-30);
    }
    if (update.current_subgoal) {
      const desc = String(update.current_subgoal).trim();
      let matched = state.subgoals.find((goal) => goal.desc.toLowerCase() === desc.toLowerCase());
      if (!matched) {
        matched = { id: String(state.subgoals.length + 1), desc, status: "pending" };
        state.subgoals.push(matched);
      }
      for (const goal of state.subgoals) {
        if (goal.status !== "done" && goal.status !== "failed") goal.status = goal.id === matched.id ? "active" : "pending";
      }
      state.activeSubgoal = matched.id;
    }
    if (update.subgoal_complete === true) markActiveSubgoalDone(state);
    return state;
  }

  function markActiveSubgoalDone(state) {
    const active = state.subgoals.find((goal) => goal.status === "active");
    if (active) active.status = "done";
    const next = state.subgoals.find((goal) => goal.status === "pending");
    if (next) {
      next.status = "active";
      state.activeSubgoal = next.id;
    }
    return state;
  }

  function markActiveSubgoalFailed(state) {
    const active = state.subgoals.find((goal) => goal.status === "active");
    if (active) active.status = "failed";
    return state;
  }

  function commitHistory(state, decision, result, verdict) {
    state.history.push({
      action: decision?.action || null,
      expect: decision?.expect || { assert: "none" },
      ok: Boolean(verdict?.ok && !result?.error),
      ts: now(),
      result: result || null,
      thought: decision?.thought || "",
    });
    state.history = state.history.slice(-80);
    if (verdict?.ok && !result?.error) state.stuckCount = 0;
    else state.stuckCount += 1;
    return state;
  }

  function renderTaskState(state) {
    const subgoals = state.subgoals.map((goal) => `- [${goal.status}] ${goal.id}. ${goal.desc}`).join("\n") || "- [active] 1. Complete the task";
    const facts = state.facts.slice(-10).map((fact) => `- ${fact.key}: ${fact.value}`).join("\n") || "None.";
    const history = state.history.slice(-3).map((item, index) => {
      const action = item.action ? JSON.stringify(item.action) : "(none)";
      return `${index + 1}. ${item.ok ? "OK" : "FAIL"} ${action}`;
    }).join("\n") || "None.";
    return [
      `Goal: ${state.goal}`,
      "Subgoals:",
      subgoals,
      "Facts:",
      facts,
      "Recent history:",
      history,
      `Stuck count: ${state.stuckCount || 0}`,
    ].join("\n");
  }

  const api = {
    createTaskState,
    commitHistory,
    markActiveSubgoalDone,
    markActiveSubgoalFailed,
    mergeMemoryUpdate,
    normalizeSubgoals,
    renderTaskState,
    setSubgoals,
  };

  global.BrainoTaskState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
