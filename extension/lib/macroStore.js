(function initBrainoMacroStore(global) {
  "use strict";

  const STORAGE_KEY = "brainoDelegateMacros";
  const VERSION = 1;

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function taskSignature(userTask) {
    const text = normalize(userTask)
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g, "{{email}}")
      .replace(/https?:\/\/\S+/g, "{{url}}")
      .replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/g, "{{time}}");
    if (/\b(send|compose|draft)\b.*\b(email|gmail|mail)\b/.test(text)) return "send_email";
    if (/\b(book|schedule|create|add)\b.*\b(meeting|event|call|calendar)\b/.test(text)) return "create_calendar_event";
    if (/\b(linkedin|jobs?|roles?)\b/.test(text)) return "linkedin_jobs_research";
    if (/\bmaps?|directions?|route|near me|restaurant|cafe\b/.test(text)) return "google_maps";
    if (/\b(tweet|post)\b.*\b(x|twitter)\b/.test(text)) return "x_post";
    return text.replace(/"[^"]*"|'[^']*'/g, "{{text}}").replace(/\b\w+@\w+\.\w+\b/g, "{{email}}").slice(0, 80) || "task";
  }

  function originFromUrl(url) {
    try { return new URL(url || "").origin; } catch (_) { return "unknown"; }
  }

  function macroKey(userTask, origin) {
    return `${taskSignature(userTask)}@${origin || "unknown"}`;
  }

  async function readStore() {
    if (!global.chrome?.storage?.local) return {};
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (data) => resolve(data?.[STORAGE_KEY] && typeof data[STORAGE_KEY] === "object" ? data[STORAGE_KEY] : {}));
    });
  }

  async function writeStore(store) {
    if (!global.chrome?.storage?.local) return;
    await new Promise((resolve) => chrome.storage.local.set({ [STORAGE_KEY]: store }, resolve));
  }

  function targetHintFromElement(elementMap, action) {
    if (!Number.isInteger(Number(action?.index))) return null;
    const el = (elementMap?.elements || []).find((item) => Number(item.index) === Number(action.index));
    if (!el) return null;
    return {
      role: el.role || "",
      name: el.name || "",
      tag: el.tag || "",
      inputType: el.inputType || "",
    };
  }

  function slotPatterns(userTask) {
    const raw = String(userTask || "");
    const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const saying = raw.match(/\b(?:saying|that says|body|message)\s+(.+)$/i)?.[1]?.trim() || "";
    const subject = raw.match(/\bsubject\s+(.+?)(?:\s+(?:saying|body|message)\b|$)/i)?.[1]?.trim() || "";
    return { recipient: email, email, body: saying, message: saying, subject };
  }

  function parameterizeValue(value, slots) {
    let out = String(value || "");
    const entries = Object.entries(slots).filter(([, val]) => val && String(val).length >= 3);
    for (const [key, val] of entries) {
      out = out.split(String(val)).join(`{{${key}}}`);
    }
    return out;
  }

  function fillValue(value, slots) {
    return String(value || "").replace(/\{\{([a-z_]+)\}\}/gi, (_, key) => slots[key] || "");
  }

  function parameterizeAction(action, slots, elementMap) {
    const clone = JSON.parse(JSON.stringify(action || {}));
    if (clone.index != null) {
      clone.targetHint = targetHintFromElement(elementMap, action);
      delete clone.index;
    }
    for (const key of ["text", "url", "query", "value"]) {
      if (clone[key] != null) clone[key] = parameterizeValue(clone[key], slots);
    }
    return clone;
  }

  function fillAction(action, slots, elementMap) {
    const clone = JSON.parse(JSON.stringify(action || {}));
    for (const key of ["text", "url", "query", "value"]) {
      if (clone[key] != null) clone[key] = fillValue(clone[key], slots);
    }
    if (clone.targetHint) {
      const resolved = resolveTargetHint(clone.targetHint, elementMap);
      if (resolved != null) clone.index = resolved;
      delete clone.targetHint;
    }
    return clone;
  }

  function resolveTargetHint(hint, elementMap) {
    if (!hint || !Array.isArray(elementMap?.elements)) return null;
    const wanted = normalize(`${hint.role || ""} ${hint.name || ""} ${hint.tag || ""} ${hint.inputType || ""}`);
    let best = null;
    let bestScore = 0;
    for (const el of elementMap.elements) {
      let score = 0;
      if (hint.role && normalize(el.role) === normalize(hint.role)) score += 3;
      if (hint.tag && normalize(el.tag) === normalize(hint.tag)) score += 1;
      if (hint.inputType && normalize(el.inputType) === normalize(hint.inputType)) score += 1;
      if (hint.name && normalize(el.name).includes(normalize(hint.name))) score += 5;
      const hay = normalize(`${el.role || ""} ${el.name || ""} ${el.tag || ""} ${el.inputType || ""}`);
      if (!score && wanted && hay.includes(wanted)) score = 1;
      if (score > bestScore) {
        best = el.index;
        bestScore = score;
      }
    }
    return bestScore >= 3 ? best : null;
  }

  async function lookup(userTask, origin) {
    const store = await readStore();
    const macro = store[macroKey(userTask, origin)];
    if (!macro || macro.disabled) return null;
    return macro;
  }

  async function record(state, origin, snapshots) {
    if (!state?.history?.length) return null;
    const slots = slotPatterns(state.goal);
    const key = macroKey(state.goal, origin);
    const store = await readStore();
    const steps = [];
    for (let i = 0; i < state.history.length; i++) {
      const item = state.history[i];
      if (!item.ok || !item.action || ["answer", "clarify", "done", "web_search", "read"].includes(item.action.type)) continue;
      steps.push({
        action: parameterizeAction(item.action, slots, snapshots?.[i] || null),
        expect: item.expect || { assert: "none" },
      });
    }
    if (!steps.length) return null;
    const existing = store[key] || {};
    const macro = {
      key,
      steps,
      successCount: Number(existing.successCount || 0) + 1,
      failureCount: Number(existing.failureCount || 0),
      lastUsed: Date.now(),
      version: VERSION,
      pinned: existing.pinned === true,
    };
    const deterministic = steps.every((step) => ["navigate", "scroll", "wait", "pressKey"].includes(step.action?.type));
    if (deterministic && macro.successCount >= 5) macro.pinned = true;
    store[key] = macro;
    await writeStore(store);
    return macro;
  }

  async function demote(key) {
    if (!key) return;
    const store = await readStore();
    if (!store[key]) return;
    store[key].failureCount = Number(store[key].failureCount || 0) + 1;
    if (store[key].failureCount >= 3) store[key].disabled = true;
    await writeStore(store);
  }

  function fillMacro(macro, userTask, elementMap) {
    const slots = slotPatterns(userTask);
    return (macro?.steps || []).map((step) => ({
      action: fillAction(step.action, slots, elementMap),
      expect: step.expect || { assert: "none" },
    }));
  }

  const api = {
    VERSION,
    demote,
    fillMacro,
    lookup,
    macroKey,
    originFromUrl,
    record,
    resolveTargetHint,
    taskSignature,
    _private: { fillValue, parameterizeValue, slotPatterns },
  };

  global.BrainoMacroStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
