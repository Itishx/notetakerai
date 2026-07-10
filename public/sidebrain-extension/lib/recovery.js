(function initBrainoRecovery(global) {
  "use strict";

  const ErrorTypes = {
    ELEMENT_NOT_FOUND: "ELEMENT_NOT_FOUND",
    STALE_ELEMENT: "STALE_ELEMENT",
    NAV_TIMEOUT: "NAV_TIMEOUT",
    AUTH_WALL: "AUTH_WALL",
    CAPTCHA: "CAPTCHA",
    RATE_LIMIT: "RATE_LIMIT",
    AMBIGUOUS: "AMBIGUOUS",
    ASSERTION_FAILED: "ASSERTION_FAILED",
    UNKNOWN: "UNKNOWN",
  };

  const RECOVERY_PLAYBOOK = {
    ELEMENT_NOT_FOUND: ["rescan", "scrollToward", "waitShort", "retryOnce", "escalate"],
    STALE_ELEMENT: ["rebuildMap", "retryOnce", "escalate"],
    NAV_TIMEOUT: ["waitLong", "retryOnce", "report"],
    AUTH_WALL: ["pauseAndAskUser"],
    CAPTCHA: ["handToUser"],
    RATE_LIMIT: ["backoff", "retryOnce", "report"],
    AMBIGUOUS: ["clarify"],
    ASSERTION_FAILED: ["escalate"],
    UNKNOWN: ["rebuildMap", "escalate"],
  };

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function matchElement(el, match) {
    if (!match || typeof match !== "object") return false;
    if (match.role && normalize(el.role) !== normalize(match.role)) return false;
    if (match.name && !normalize(el.name).includes(normalize(match.name))) return false;
    return true;
  }

  function verifyAssertion(expect, obs) {
    const assertion = expect || { assert: "none" };
    const elements = Array.isArray(obs?.elements) ? obs.elements : [];
    if (assertion.assert === "none") return { ok: true };
    if (assertion.assert === "element_exists") {
      const found = elements.some((el) => matchElement(el, assertion.match));
      return found ? { ok: true } : { ok: false, reason: `No element matched ${JSON.stringify(assertion.match || {})}` };
    }
    if (assertion.assert === "element_gone") {
      const found = elements.some((el) => matchElement(el, assertion.match));
      return found ? { ok: false, reason: `Element still present ${JSON.stringify(assertion.match || {})}` } : { ok: true };
    }
    if (assertion.assert === "url_contains") {
      const needle = normalize(assertion.value);
      if (!needle) return { ok: false, reason: "url_contains requires a value" };
      const rawUrl = String(obs?.url || "");
      let host = "";
      let pathq = "";
      try {
        const u = new URL(rawUrl);
        host = normalize(u.hostname);
        pathq = normalize(`${u.pathname}${u.search}${u.hash}`);
      } catch (_) {
        pathq = normalize(rawUrl);
      }
      // Match the needle only at a token boundary (host label or path/query segment),
      // so url_contains "calendar" hits calendar.google.com but NOT mycalendarapp.com.
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const boundary = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
      const ok = boundary.test(host) || boundary.test(pathq);
      return ok
        ? { ok: true }
        : { ok: false, reason: `URL did not contain "${assertion.value || ""}" as a host/path token` };
    }
    if (assertion.assert === "value_equals") {
      const found = elements.find((el) => Number(el.index) === Number(assertion.index));
      if (!found) return { ok: false, reason: `Element ${assertion.index} not found for value check` };
      return normalize(found.value) === normalize(assertion.value)
        ? { ok: true }
        : { ok: false, reason: `Value was "${found.value || ""}", expected "${assertion.value || ""}"` };
    }
    if (assertion.assert === "text_present") {
      // Search the visible page (title + the visible-element names/values that elementMap
      // already filtered to). The URL is intentionally excluded — a fragment like #inbox in
      // the address bar should not count as "inbox text present" on the page; use url_contains.
      const hay = normalize([obs?.title, ...elements.map((el) => `${el.name || ""} ${el.value || ""}`)].join(" "));
      return hay.includes(normalize(assertion.value))
        ? { ok: true }
        : { ok: false, reason: `Text not present: "${assertion.value || ""}"` };
    }
    return { ok: false, reason: `Unknown assertion ${assertion.assert}` };
  }

  function classifyError(result, verdict, obs) {
    const detail = String(result?.error || verdict?.reason || result?.detail || "Unknown failure");
    const lower = detail.toLowerCase();
    const text = normalize([
      obs?.url,
      obs?.title,
      ...(Array.isArray(obs?.elements) ? obs.elements.map((el) => `${el.name || ""} ${el.value || ""}`) : []),
    ].join(" "));
    if (/captcha|recaptcha|verify you are human|human verification/.test(text) || /captcha/.test(lower)) {
      return { type: ErrorTypes.CAPTCHA, detail };
    }
    // AUTH_WALL demands STRONG evidence. Every retail header contains a "Sign in" link
    // even when the user IS logged in — matching mere page text classified ANY Amazon
    // failure as a login wall ("I hit a login wall" while logged in). A real wall means
    // the sign-in PAGE itself is open, or a password field is in front of us.
    const authUrl = String(obs?.url || "").toLowerCase();
    const authTitle = String(obs?.title || "").toLowerCase();
    const onSigninPage = /\/ap\/signin|\/signin\b|\/login\b|\/sessions\/new|accounts\.google\.com\/v3\/signin/.test(authUrl)
      || /^(sign in|log ?in)\b/.test(authTitle);
    const hasPasswordField = Array.isArray(obs?.elements) && obs.elements.some((el) =>
      String(el?.inputType || "").toLowerCase() === "password"
      || (String(el?.role || "") === "textbox" && /^password\b/i.test(String(el?.name || ""))));
    if (onSigninPage || hasPasswordField || /session expired|not signed in|please sign in to continue/.test(lower)) {
      return { type: ErrorTypes.AUTH_WALL, detail };
    }
    if (/rate limit|too many requests|429/.test(lower)) return { type: ErrorTypes.RATE_LIMIT, detail };
    if (/timeout|timed out|navigation/.test(lower)) return { type: ErrorTypes.NAV_TIMEOUT, detail };
    if (/stale|detached|not in registry/.test(lower)) return { type: ErrorTypes.STALE_ELEMENT, detail };
    if (/element not found|no input element|no image|no <select>|not found/.test(lower)) {
      return { type: ErrorTypes.ELEMENT_NOT_FOUND, detail };
    }
    if (verdict && verdict.ok === false) return { type: ErrorTypes.ASSERTION_FAILED, detail };
    return { type: ErrorTypes.UNKNOWN, detail };
  }

  function validateNoSelectorAction(action) {
    const target = action && typeof action === "object" ? action : {};
    for (const key of ["selector", "targetText", "targetTag", "xpath"]) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        throw new Error(`Selectors are forbidden in Delegate actions: ${key}`);
      }
    }
    return true;
  }

  const api = { ErrorTypes, RECOVERY_PLAYBOOK, classifyError, validateNoSelectorAction, verifyAssertion };
  global.BrainoRecovery = api;
  global.BrainoAssertions = { verifyAssertion };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
