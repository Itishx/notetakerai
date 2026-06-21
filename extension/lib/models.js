(function initBrainoModels(global) {
  "use strict";

  // STEP runs every normal loop turn — keep it fast/cheap.
  // STRATEGIST is the stronger GPT-5 brain, used only on the rare hard moments
  // (getting stuck / escalation / re-planning / done-verification), never the hot path.
  const MODELS = {
    STEP: "gpt-5.4-mini",
    STRATEGIST: "gpt-5.4",
  };

  const MODEL_COST_ESTIMATES_USD = {
    [MODELS.STEP]: 0.002,
    [MODELS.STRATEGIST]: 0.02,
  };

  function pickModel(phase, stuckCount) {
    if (phase === "decompose" || phase === "escalate") return MODELS.STRATEGIST;
    if (Number(stuckCount || 0) >= 2) return MODELS.STRATEGIST;
    return MODELS.STEP;
  }

  function estimateModelCost(model) {
    return MODEL_COST_ESTIMATES_USD[model] || MODEL_COST_ESTIMATES_USD[MODELS.STEP];
  }

  function withinBudget(budget, usage) {
    const maxSteps = Number(budget?.maxSteps ?? Infinity);
    const maxMs = Number(budget?.maxMs ?? Infinity);
    const maxLLMUsd = Number(budget?.maxLLMUsd ?? Infinity);
    return Number(usage?.steps || 0) < maxSteps
      && Number(usage?.elapsedMs || 0) < maxMs
      && Number(usage?.llmUsd || 0) < maxLLMUsd;
  }

  const api = { MODELS, MODEL_COST_ESTIMATES_USD, estimateModelCost, pickModel, withinBudget };
  global.BrainoModels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
