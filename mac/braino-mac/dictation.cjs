const WAKE_PREFIX_RE = /^(?:(?:hey|hi|hello|okay|ok|yo)\s+)?(?:braino|bruno|breno|reno|dino)[,\s]+/i;

function normalizeDictationCommand(value) {
  return String(value || "")
    .trim()
    .replace(WAKE_PREFIX_RE, "")
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseDictationControl(value, active = false) {
  const text = normalizeDictationCommand(value);
  if (!text) return null;

  if (active && (
    /^(?:done|i(?:'m| am) done|that(?:'s| is) (?:it|all)|stop|finish|end)$/.test(text)
    || /^(?:stop|finish|end|exit|leave|turn off|close)\s+(?:the\s+)?(?:dictation|dictation mode|yap mode|speak your mind)$/.test(text)
  )) {
    return { action: "stop" };
  }

  if (
    /^(?:start|begin|open|turn on)\s+(?:the\s+)?(?:dictation|dictation mode|yap mode|speak your mind)$/.test(text)
    || /^(?:yap mode|speak your mind|take this down|write what i say|start typing|type what i say|listen and type)$/.test(text)
  ) {
    return { action: "start" };
  }

  return null;
}

function normalizeDictationChunk(value) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (/^(?:new line|next line)[.!]?$/i.test(text)) return "\n";
  if (/^(?:new paragraph|next paragraph)[.!]?$/i.test(text)) return "\n\n";
  return /[\s\n]$/.test(text) ? text : `${text} `;
}

function evaluateDictationStart(focusStatus, hasTargetApp = true) {
  const status = String(focusStatus || "error").trim().toLowerCase();
  if (!hasTargetApp) {
    return { ok: false, error: "Open an app before starting Yap Mode." };
  }
  if (status === "needs-accessibility") {
    return { ok: false, error: "Braino needs Accessibility permission before it can type for you." };
  }
  if (status === "secure") {
    return { ok: false, error: "Yap Mode stays out of password and secure text fields." };
  }
  if (status === "editable") {
    // AXSelectedText can report success without committing the change in
    // Electron/Chromium editors. A real paste event is reliable system-wide.
    return { ok: true, insertionMode: "paste" };
  }
  // Chromium contenteditable surfaces such as Notion frequently return
  // no_focus/not_editable even while the caret is live. Start anyway and use
  // the clipboard-restoring paste path used by system-wide dictation apps.
  return { ok: true, insertionMode: "paste" };
}

function shouldUseDictationPasteFallback(focusStatus) {
  return ["no_focus", "not_editable", "insert_failed", "error"].includes(
    String(focusStatus || "").trim().toLowerCase(),
  );
}

module.exports = {
  evaluateDictationStart,
  normalizeDictationChunk,
  normalizeDictationCommand,
  parseDictationControl,
  shouldUseDictationPasteFallback,
};
