// SideBrain Content Script — extracts page text for AI context

// Generate a stable, unique CSS selector for an element (used by browser agent)
function getStableSelector(el) {
  // Priority 1: id attribute (must be valid CSS ident)
  if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
    return '#' + el.id;
  }
  // Priority 2: unique aria-label on this tag
  const aria = el.getAttribute('aria-label');
  if (aria) {
    const c = `${el.tagName.toLowerCase()}[aria-label="${aria.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"]`;
    try { if (document.querySelectorAll(c).length === 1) return c; } catch(e) {}
  }
  // Priority 3: name on form fields
  const name = el.getAttribute('name');
  if (name && ['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) {
    const c = `${el.tagName.toLowerCase()}[name="${name}"]`;
    try { if (document.querySelectorAll(c).length === 1) return c; } catch(e) {}
  }
  // Priority 4: data-testid / data-id / data-cy
  for (const attr of ['data-testid', 'data-id', 'data-cy']) {
    const val = el.getAttribute(attr);
    if (val) {
      const c = `[${attr}="${val}"]`;
      try { if (document.querySelectorAll(c).length === 1) return c; } catch(e) {}
    }
  }
  // Priority 5: type attribute on inputs (only if unique enough)
  if (el.tagName === 'INPUT' && el.type && el.type !== 'text') {
    const c = `input[type="${el.type}"]`;
    try { if (document.querySelectorAll(c).length === 1) return c; } catch(e) {}
  }
  return null;
}

const __SB_WAKE_WORD_RE = /(?:hey|hi|okay|ok)\s*[,.:;!?-]*\s*side[\s-]*brain\b\s*[,.:;!?-]*/i;

function __sbSendPageVoiceEvent(event, payload = {}) {
  try {
    chrome.runtime.sendMessage({
      action: "voiceEvent",
      event,
      text: payload.text,
      isFinal: payload.isFinal,
      message: payload.message,
      source: payload.source,
    });
  } catch {}
}

function __sbExtractWakeCommand(text) {
  const original = String(text || "").trim();
  const normalized = original
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/(?:^|\s)(?:hey|hi|okay|ok)\s+side(?:\s|-)?brain\b/.test(normalized)) {
    return { matched: false, command: "" };
  }
  const match = original.match(__SB_WAKE_WORD_RE);
  if (!match) return { matched: true, command: "" };
  const start = (match.index || 0) + match[0].length;
  return {
    matched: true,
    command: original.slice(start).trim(),
  };
}

function __sbStopPageVoiceRecognition() {
  window.__sideBrainShouldListen = false;
  window.__sideBrainVoiceMode = "off";
  window.__sideBrainVoiceSource = null;
  if (window.__sideBrainRecognition) {
    try { window.__sideBrainRecognition.abort(); } catch(e) {}
    window.__sideBrainRecognition = null;
  }
}

function __sbStartPageVoiceRecognition(mode = "manual", source = "generic") {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return { error: "not-supported" };
  }

  window.__sideBrainShouldListen = true;
  window.__sideBrainVoiceMode = mode;
  window.__sideBrainVoiceSource = source;

  if (window.__sideBrainRecognition) {
    try { window.__sideBrainRecognition.abort(); } catch(e) {}
    window.__sideBrainRecognition = null;
  }

  function buildAndStart() {
    if (!window.__sideBrainShouldListen) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    window.__sideBrainRecognition = rec;

    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      const isFinal = e.results[e.results.length - 1].isFinal;
      const currentMode = window.__sideBrainVoiceMode || mode;
      const currentSource = window.__sideBrainVoiceSource || source;

      if (currentMode === "wake") {
        const wake = __sbExtractWakeCommand(text);
        if (!wake.matched) return;

        window.__sideBrainVoiceMode = "manual";
        __sbSendPageVoiceEvent("wakeDetected", { source: currentSource });
        if (wake.command) {
          __sbSendPageVoiceEvent("transcript", {
            text: wake.command,
            isFinal,
            source: currentSource,
          });
        } else if (isFinal) {
          const activeRecognition = rec;
          setTimeout(() => {
            if (window.__sideBrainShouldListen && window.__sideBrainRecognition === activeRecognition) {
              try { activeRecognition.stop(); } catch(e) {}
            }
          }, 0);
        }
        return;
      }

      __sbSendPageVoiceEvent("transcript", {
        text,
        isFinal,
        source: currentSource,
      });
    };

    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      if (e.error === "no-speech") {
        window.__sideBrainRecognition = null;
        setTimeout(buildAndStart, 100);
        return;
      }
      __sbSendPageVoiceEvent("error", {
        message: e.error,
        source: window.__sideBrainVoiceSource || source,
      });
      window.__sideBrainRecognition = null;
      window.__sideBrainShouldListen = false;
      window.__sideBrainVoiceMode = "off";
      window.__sideBrainVoiceSource = null;
    };

    rec.onstart = () => {
      const currentMode = window.__sideBrainVoiceMode || mode;
      const currentSource = window.__sideBrainVoiceSource || source;
      __sbSendPageVoiceEvent(currentMode === "wake" ? "wakeReady" : "listening", {
        source: currentSource,
      });
    };

    rec.onend = () => {
      window.__sideBrainRecognition = null;
      if (window.__sideBrainShouldListen) {
        setTimeout(buildAndStart, 150);
      }
    };

    try {
      rec.start();
    } catch(e) {
      if (window.__sideBrainShouldListen) {
        setTimeout(buildAndStart, 500);
      }
    }
  }

  buildAndStart();
  return { success: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractPageContent") {
    const text = (document.body?.innerText || "").substring(0, 12000);
    const title = document.title || "";
    const url = window.location.href || "";
    const faviconUrl = document.querySelector("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")?.href || "";
    sendResponse({ text, title, url, faviconUrl });
    return true;
  }

  // ===== BROWSER AGENT: get rich page context =====
  if (msg.action === "getAgentPageContext") {
    const url = window.location.href;
    const title = document.title;
    const bodyText = (document.body?.innerText || "").substring(0, 5000);

    // Collect interactive elements with their visible text
    const interactiveEls = [];
    const seen = new Set();
    const selectors = ['button', 'a', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]', '[role="textbox"]'];
    document.querySelectorAll(selectors.join(",")).forEach(el => {
      // Skip hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
      if (!el.getBoundingClientRect().width) return;

      const tag = el.tagName.toLowerCase();
      const text = (
        el.innerText ||
        el.value ||
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("title") ||
        ""
      ).trim().replace(/\s+/g, " ").substring(0, 80);

      if (!text) return;
      const key = `${tag}:${text}`;
      if (seen.has(key)) return;
      seen.add(key);

      const entry = { tag, text };
      const type = el.getAttribute("type");
      if (type) entry.type = type;
      const href = el.getAttribute("href");
      if (href) entry.href = href.substring(0, 100);
      const sel = getStableSelector(el);
      if (sel) entry.selector = sel;
      interactiveEls.push(entry);
    });

    // Also collect <select> dropdowns with their options (e.g. Netflix season selector)
    const selectEls = [];
    document.querySelectorAll("select").forEach(sel => {
      const label = sel.getAttribute("aria-label") || sel.getAttribute("name") || sel.id || "";
      const options = Array.from(sel.options).map(o => o.text.trim()).filter(Boolean).slice(0, 20);
      if (options.length) selectEls.push({ label, options, current: sel.options[sel.selectedIndex]?.text || "" });
    });

    sendResponse({ url, title, bodyText, interactiveEls: interactiveEls.slice(0, 80), selectEls });
    return true;
  }

  // ===== BROWSER AGENT: execute action on page =====
  if (msg.action === "agentAction") {
    const { type, selector, targetText, targetTag, text, url, direction, amount } = msg;

    // Pierces open shadow roots so we can find elements inside web components
    function deepQuery(sel, root) {
      root = root || document;
      let el = null;
      try { el = root.querySelector(sel); } catch(e) {}
      if (el) return el;
      for (const host of root.querySelectorAll('*')) {
        if (host.shadowRoot) {
          el = deepQuery(sel, host.shadowRoot);
          if (el) return el;
        }
      }
      return null;
    }

    const EDITABLE_SELECTOR = 'textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"]), [contenteditable="true"], [role="textbox"]';

    function isDirectEditableElement(el) {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable || el.getAttribute("contenteditable") === "true";
    }

    function resolveEditableTarget(el) {
      if (!el) return null;
      if (isDirectEditableElement(el)) return el;

      let nested = null;
      try { nested = el.querySelector(EDITABLE_SELECTOR); } catch(e) {}
      if (!nested) nested = deepQuery(EDITABLE_SELECTOR, el);
      if (nested) return nested;

      if (el.getAttribute?.("role") === "textbox") return el;
      return null;
    }

    function dispatchBeforeInputEvent(target, inputType, data) {
      try {
        target.dispatchEvent(new InputEvent("beforeinput", {
          inputType,
          data,
          bubbles: true,
          cancelable: true,
        }));
      } catch(e) {}
    }

    function dispatchInputEvent(target, inputType, data) {
      try {
        target.dispatchEvent(new InputEvent("input", {
          inputType,
          data,
          bubbles: true,
        }));
      } catch(e) {
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    function normalizeText(value) {
      return (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    function selectAllEditableContent(target) {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function clearContentEditable(target) {
      target.focus();
      target.click();
      selectAllEditableContent(target);
      dispatchBeforeInputEvent(target, "deleteContentBackward", null);
      document.execCommand("delete", false, null);
      if (normalizeText(target.innerText || target.textContent)) {
        target.textContent = "";
      }
      dispatchInputEvent(target, "deleteContentBackward", null);
    }

    function typeIntoContentEditable(target, value) {
      target.focus();
      target.click();

      if (normalizeText(target.innerText || target.textContent)) {
        clearContentEditable(target);
      }

      dispatchBeforeInputEvent(target, "insertText", value);
      const inserted = document.execCommand("insertText", false, value);
      if (inserted) {
        dispatchInputEvent(target, "insertText", value);
      }

      if (!normalizeText(target.innerText || target.textContent)) {
        try {
          const dt = new DataTransfer();
          dt.setData("text/plain", value);
          target.dispatchEvent(new ClipboardEvent("paste", {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          }));
        } catch(e) {}
        dispatchInputEvent(target, "insertFromPaste", value);
      }

      if (!normalizeText(target.innerText || target.textContent)) {
        target.textContent = value;
        dispatchInputEvent(target, "insertText", value);
      }
    }

    (async () => { try {
      if (type === "click") {
        let el = null;
        // Try CSS selector first (with shadow DOM piercing)
        if (selector) {
          try { el = document.querySelector(selector); } catch (e) {}
          if (!el) el = deepQuery(selector);
        }
        // Try by visible text
        if (!el && targetText) {
          const needle = targetText.toLowerCase();
          const tags = targetTag
            ? [targetTag, "[role='button']"]
            : ["button", "a", "[role='button']", "[role='tab']", "[role='menuitem']", "input[type='submit']", "input[type='button']", "div[role='button']", "span[role='button']"];
          for (const t of tags) {
            const candidates = Array.from(document.querySelectorAll(t));
            el = candidates.find(e => {
              const label = (e.innerText || e.getAttribute("aria-label") || e.getAttribute("data-tooltip") || e.value || "").trim().toLowerCase();
              return label.includes(needle);
            });
            if (el) break;
          }
          // Last resort: any visible element containing the text
          if (!el) {
            const all = Array.from(document.querySelectorAll("*"));
            el = all.find(e => {
              if (!e.offsetParent) return false;
              const style = window.getComputedStyle(e);
              if (style.display === "none" || style.visibility === "hidden") return false;
              const label = (e.getAttribute("aria-label") || e.getAttribute("data-tooltip") || "").toLowerCase();
              return label.includes(needle) || (e.children.length === 0 && e.innerText?.trim().toLowerCase() === needle);
            });
          }
        }
        if (!el) { sendResponse({ error: `Element not found: ${targetText || selector}` }); return true; }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.click();
        sendResponse({ success: true });

      } else if (type === "type") {
        let el = null;
        if (selector) {
          try { el = document.querySelector(selector); } catch (e) {}
          if (!el) el = deepQuery(selector);
        }
        el = resolveEditableTarget(el);
        // If a targetText hint was given, try finding by aria-label or placeholder
        if (!el && msg.targetText) {
          const hint = msg.targetText.toLowerCase();
          el = Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).find(e => {
            const label = (e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.getAttribute("name") || "").toLowerCase();
            return label.includes(hint);
          });
          el = resolveEditableTarget(el);
        }
        if (!el) {
          // Use focused element if it's an input, otherwise find the most relevant visible one
          const active = document.activeElement;
          const tag = active?.tagName?.toLowerCase();
          if (active && (["input","textarea"].includes(tag) || active.isContentEditable || active.getAttribute?.("role") === "textbox")) {
            el = resolveEditableTarget(active);
          } else {
            el = resolveEditableTarget(document.querySelector(EDITABLE_SELECTOR));
          }
        }
        if (!el) { sendResponse({ error: "No input element found" }); return true; }

        const isContentEditable = el.isContentEditable || el.getAttribute("contenteditable") === "true" || (el.getAttribute("role") === "textbox" && !["input", "textarea"].includes(el.tagName.toLowerCase()));

        el.focus();
        el.click();
        await new Promise(r => setTimeout(r, 80));

        if (isContentEditable) {
          el.focus();
          el.click();
          await new Promise(r => setTimeout(r, 120));
          typeIntoContentEditable(el, text);
        } else {
          // Regular input/textarea — use native value setter for React compatibility
          const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
          if (nativeInputSetter) {
            nativeInputSetter.call(el, "");
          } else {
            el.value = "";
          }
          el.dispatchEvent(new Event("input", { bubbles: true }));

          for (const char of text) {
            if (nativeInputSetter) {
              nativeInputSetter.call(el, el.value + char);
            } else {
              el.value += char;
            }
            el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
          }
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        sendResponse({ success: true });

      } else if (type === "pressEnter" || type === "pressKey") {
        const key = msg.key || "Enter";
        const keyCode = key === "Enter" ? 13 : key === "Tab" ? 9 : key.charCodeAt(0);
        const el = document.activeElement || document.querySelector('input, textarea, [contenteditable="true"], [role="textbox"]');
        if (el) {
          el.dispatchEvent(new KeyboardEvent("keydown", { key, keyCode, bubbles: true, cancelable: true }));
          el.dispatchEvent(new KeyboardEvent("keypress", { key, keyCode, bubbles: true, cancelable: true }));
          el.dispatchEvent(new KeyboardEvent("keyup", { key, keyCode, bubbles: true, cancelable: true }));
          if (key === "Enter") {
            const form = el.closest("form");
            if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
          if (key === "Tab") {
            // Move focus to next focusable element
            const focusables = Array.from(document.querySelectorAll('input, textarea, button, [contenteditable], [role="textbox"], [tabindex]:not([tabindex="-1"])'))
              .filter(e => !e.disabled && e.offsetParent !== null);
            const idx = focusables.indexOf(el);
            if (idx !== -1 && focusables[idx + 1]) focusables[idx + 1].focus();
          }
        }
        sendResponse({ success: true });

      } else if (type === "navigate") {
        window.location.href = url;
        sendResponse({ success: true });

      } else if (type === "scroll") {
        const px = amount || 400;
        window.scrollBy({ top: direction === "up" ? -px : px, behavior: "smooth" });
        sendResponse({ success: true });

      } else if (type === "selectOption") {
        // For <select> dropdowns (e.g. Netflix season selector)
        let el = null;
        if (selector) { try { el = document.querySelector(selector); } catch (e) {} }
        if (!el && msg.targetText) {
          el = Array.from(document.querySelectorAll("select")).find(s => {
            const label = (s.getAttribute("aria-label") || s.getAttribute("name") || "").toLowerCase();
            return label.includes(msg.targetText.toLowerCase());
          });
        }
        if (!el) el = document.querySelector("select");
        if (!el) { sendResponse({ error: "No <select> found" }); return true; }
        const optionValue = msg.value || msg.text || "";
        const opt = Array.from(el.options).find(o =>
          o.text.toLowerCase().includes(optionValue.toLowerCase()) ||
          o.value.toLowerCase().includes(optionValue.toLowerCase())
        );
        if (!opt) { sendResponse({ error: `Option not found: ${optionValue}` }); return true; }
        el.value = opt.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        sendResponse({ success: true });

      } else if (type === "wait") {
        await new Promise(r => setTimeout(r, Math.min(msg.ms || 1000, 5000)));
        sendResponse({ success: true });

      } else if (type === "read") {
        // Read element content so agent can verify state before acting
        let el = null;
        if (selector) { try { el = document.querySelector(selector); } catch (e) {} }
        if (!el && targetText) {
          const needle = targetText.toLowerCase();
          el = Array.from(document.querySelectorAll("*")).find(e => {
            if (!e.offsetParent) return false;
            const label = (e.getAttribute("aria-label") || e.innerText || "").trim().toLowerCase();
            return label.includes(needle);
          });
        }
        if (!el) {
          // Fall back to returning visible page text excerpt
          sendResponse({ success: true, text: document.body?.innerText?.slice(0, 800) || "(empty)" });
        } else {
          // For select elements, return all options
          if (el.tagName === "SELECT") {
            const opts = Array.from(el.options).map(o => o.text.trim()).join(", ");
            sendResponse({ success: true, text: `Options: ${opts} | Selected: ${el.options[el.selectedIndex]?.text}` });
          } else {
            sendResponse({ success: true, text: (el.innerText || el.textContent || "").trim().slice(0, 500) });
          }
        }

      } else if (type === "downloadImage") {
        let img = null;
        if (selector) { try { img = document.querySelector(selector); } catch(e) {} }
        if (!img && targetText) {
          img = Array.from(document.querySelectorAll("img")).find(i =>
            (i.alt || i.src || "").toLowerCase().includes(targetText.toLowerCase())
          );
        }
        if (!img) img = document.querySelector("img");
        if (!img) { sendResponse({ error: "No image found on page" }); return true; }

        const srcUrl = img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
        if (!srcUrl) { sendResponse({ error: "Image has no src" }); return true; }

        const format = (msg.format || "png").replace("jpg", "jpeg");
        const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
        const filename = msg.filename || `image.${format === "jpeg" ? "jpg" : format}`;

        const drawAndDownload = (imgEl) => new Promise((resolve, reject) => {
          const canvas = document.createElement("canvas");
          canvas.width = imgEl.naturalWidth || imgEl.width;
          canvas.height = imgEl.naturalHeight || imgEl.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(imgEl, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            resolve();
          }, mimeType, 0.95);
        });

        try {
          // Try fetch → canvas (works for CORS-enabled images)
          const resp = await fetch(srcUrl, { mode: "cors" });
          const blob = await resp.blob();
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext("2d").drawImage(bitmap, 0, 0);
          await new Promise((resolve, reject) => {
            canvas.toBlob((outBlob) => {
              if (!outBlob) { reject(new Error("toBlob failed")); return; }
              const a = document.createElement("a");
              a.href = URL.createObjectURL(outBlob);
              a.download = filename;
              a.click();
              URL.revokeObjectURL(a.href);
              resolve();
            }, mimeType, 0.95);
          });
          sendResponse({ success: true });
        } catch(_) {
          try {
            // CORS fallback: reload img with crossOrigin → canvas
            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";
            await new Promise((res, rej) => {
              tempImg.onload = res;
              tempImg.onerror = rej;
              tempImg.src = srcUrl + (srcUrl.includes("?") ? "&" : "?") + "_sb=" + Date.now();
            });
            await drawAndDownload(tempImg);
            sendResponse({ success: true });
          } catch(_2) {
            // Last resort: direct link download (no format conversion)
            const a = document.createElement("a");
            a.href = srcUrl;
            a.download = filename;
            a.click();
            sendResponse({ success: true, note: "Direct download — CORS blocked format conversion" });
          }
        }

      } else {
        sendResponse({ error: `Unknown action type: ${type}` });
      }
    } catch (e) {
      sendResponse({ error: e.message });
    } })();
    return true;
  }

  // ===== VOICE: run SpeechRecognition here in the page context =====
  // Content scripts inherit the page's mic permissions — this is the only
  // reliable way to get mic access in an MV3 extension side panel.
  if (msg.action === "startVoiceListening") {
    sendResponse(__sbStartPageVoiceRecognition(msg.mode || "manual", msg.source || "generic"));
    return true;
  }

  if (msg.action === "stopVoiceListening") {
    __sbStopPageVoiceRecognition();
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// ===== AUTH RELAY =====
// When the user logs in on the website auth page, the page stores auth data
// in a hidden DOM element. This content script reads it and relays to background.js
// via internal messaging (much more reliable than onMessageExternal).
(function authRelay() {
  // Only run on the auth/extension page
  if (!window.location.pathname.includes("/auth/extension")) return;

  function tryReadAuthData() {
    const el = document.getElementById("sidebrain-auth-data");
    if (!el) return false;
    try {
      const data = JSON.parse(el.textContent || "");
      if (data && data.token) {
        chrome.runtime.sendMessage({
          action: "authTokenRelay",
          token: data.token,
          refreshToken: data.refreshToken,
          displayName: data.displayName,
          email: data.email,
          userId: data.userId,
        });
        return true;
      }
    } catch (e) { /* ignore parse errors */ }
    return false;
  }

  // Poll for the auth data element (it appears after login)
  if (!tryReadAuthData()) {
    const observer = new MutationObserver(() => {
      if (tryReadAuthData()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Also poll as backup
    const interval = setInterval(() => {
      if (tryReadAuthData()) {
        clearInterval(interval);
      }
    }, 500);
    // Stop after 5 minutes
    setTimeout(() => { observer.disconnect(); clearInterval(interval); }, 300000);
  }
})();

// ===== SELECTION TRACKING =====
// Detect when user highlights text on the page and relay it to the side panel
document.addEventListener('mouseup', () => {
  const selected = window.getSelection()?.toString()?.trim();
  if (selected && selected.length > 2) {
    chrome.runtime.sendMessage({
      action: 'selectionChanged',
      text: selected,
      url: window.location.href,
      title: document.title,
    }).catch(() => {}); // panel may not be open — ignore
  }
});

// ===== BRAIN INLINE UI =====
if (window.__sbLoaded) { /* already running — skip re-injection */ } else {
window.__sbLoaded = true;
const __SB_API = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

function __sbContextOk() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}
function __sbStorageGet(keys) {
  return new Promise((res) => {
    if (!__sbContextOk()) { res({}); return; }
    chrome.storage.local.get(keys, res);
  });
}
const __SB_BRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="52" height="52"><defs><linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbb-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/><path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#sbb-dark)"/><path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#sbb-dark)"/><path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-fill)"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="6" cy="63" r="5.5" fill="url(#sbb-fill)"/><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="94" cy="63" r="5.5" fill="url(#sbb-fill)"/><circle cx="38" cy="48" r="6.5" fill="white"/><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/><circle cx="62" cy="48" r="6.5" fill="white"/><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/></svg>`;

let __sbInputOpen = false;
let __sbIsRecording = false;
let __sbChatHistory = [];
let __sbVoicePendingReply = false;
let __sbIsSpeaking = false;
let __sbCurrentSpeechAudio = null;
let __sbCurrentSpeechUrl = null;
let __sbCurrentUtterance = null;
let __sbWakeArmed = false;
let __sbVoiceSessionActive = false;
let __sbVoiceSessionTimer = null;
let __sbWakeStartTimer = null;

// Extension icon click builds brain (first time) and toggles input
if (__sbContextOk()) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "toggleSideBrainPanel") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbToggleInput(!__sbInputOpen);
      sendResponse({ ok: true });
    }
    if (msg.action === "sbAgentUpdate") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbShowBubble(msg.text, false, { tone: "status" });
    }
    if (msg.action === "sbRecordingUpdate") __sbHandleRecordingUpdate(msg);
    if (msg.action === "sbVoiceEvent") __sbHandleVoiceEvent(msg);
  });
}

function __sbBuildBrainUI() {
  if (document.getElementById("__sb_root__")) return;

  const style = document.createElement("style");
  style.id = "__sb_styles__";
  style.textContent = `
    #__sb_root__ {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none;
    }
    #__sb_brain_btn__ {
      width: 52px; height: 52px; cursor: pointer; pointer-events: all;
      filter: drop-shadow(0 2px 10px rgba(200,84,74,0.5));
      transition: transform 0.15s, filter 0.15s;
      flex-shrink: 0;
    }
    #__sb_brain_btn__:hover { transform: scale(1.1); filter: drop-shadow(0 4px 16px rgba(200,84,74,0.7)); }
    #__sb_brain_btn__.recording {
      animation: __sb_pulse__ 1s ease-in-out infinite;
    }
    @keyframes __sb_pulse__ {
      0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.5)); }
      50% { filter: drop-shadow(0 0 22px rgba(220,50,50,0.95)) drop-shadow(0 0 8px rgba(220,50,50,0.7)); }
    }
    #__sb_pill__ {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255, 251, 247, 0.96); border-radius: 22px;
      padding: 9px 9px 9px 16px;
      border: 1px solid rgba(65, 48, 40, 0.1);
      box-shadow: 0 16px 40px rgba(27,23,19,0.16), 0 4px 12px rgba(27,23,19,0.08);
      width: 368px; max-width: calc(100vw - 40px);
      backdrop-filter: blur(18px);
      opacity: 0; transform: translateY(6px) scale(0.97);
      transition: opacity 0.18s, transform 0.18s;
      pointer-events: none;
    }
    #__sb_pill__.open {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }
    #__sb_input__ {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #1B1713; min-width: 0; padding: 0;
      resize: none; line-height: 1.5; max-height: 120px; overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_input__::placeholder { color: #A79B92; }
    #__sb_send_btn__, #__sb_rec_btn__ {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    #__sb_send_btn__ { background: #E8786E; color: white; }
    #__sb_send_btn__:hover { background: #C9544A; }
    #__sb_rec_btn__ { background: #f3f0ee; font-size: 13px; }
    #__sb_rec_btn__:hover { background: #ebe8e5; }
    #__sb_rec_btn__.active { background: #fee2e2; }
    #__sb_rec_btn__.wake {
      background: #fff3e2; color: #a7602d;
      box-shadow: inset 0 0 0 1px rgba(167, 96, 45, 0.16);
    }
    #__sb_bubble__ {
      position: fixed;
      z-index: 2147483648;
      width: 420px; max-width: calc(100vw - 100px);
      height: auto; max-height: min(62vh, 520px);
      min-width: 260px; min-height: 80px;
      overflow: hidden; resize: both;
      background: rgba(245, 240, 234, 0.52);
      border-radius: 18px;
      color: #1B1713;
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 20px 60px rgba(27,23,19,0.2), 0 4px 14px rgba(27,23,19,0.08),
                  inset 0 1px 0 rgba(255,255,255,0.65);
      backdrop-filter: blur(44px) saturate(200%) brightness(1.06);
      -webkit-backdrop-filter: blur(44px) saturate(200%) brightness(1.06);
      opacity: 0; transition: opacity 0.2s;
      pointer-events: none;
    }
    #__sb_bubble__.visible { opacity: 1; pointer-events: all; }

    /* ── card layout fills the resizable container ── */
    .sb-bubble-card {
      display: flex; flex-direction: column;
      height: 100%; overflow: hidden;
    }
    .sb-bubble-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 12px 10px 14px; flex-shrink: 0;
      cursor: grab; user-select: none;
      background: linear-gradient(160deg, rgba(255,255,255,0.5) 0%, rgba(250,244,238,0.38) 100%);
      border-bottom: 1px solid rgba(200,170,150,0.18);
    }
    .sb-bubble-head:active { cursor: grabbing; }
    /* drag grip dots */
    .sb-bubble-head::before {
      content: "⠿"; font-size: 14px; color: rgba(180,140,120,0.5); flex-shrink: 0; line-height: 1;
    }
    .sb-bubble-head-main { min-width: 0; flex: 1; display: flex; align-items: center; gap: 8px; }
    .sb-bubble-kicker {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
      color: #B05A48; font-weight: 700; flex-shrink: 0;
    }
    .sb-bubble-kicker::before {
      content: ""; width: 6px; height: 6px; border-radius: 50%;
      background: linear-gradient(135deg, #F6A8A2, #C9544A);
      box-shadow: 0 0 8px rgba(201,84,74,0.45);
      flex-shrink: 0;
    }
    .sb-bubble-title {
      font-size: 12.5px; line-height: 1.3; font-weight: 600; color: #2B221D;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sb-bubble-actions { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .sb-bubble-iconbtn {
      border: none; background: rgba(67,50,42,0.07); color: #7A6157;
      width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600;
      transition: background 0.12s, color 0.12s;
    }
    .sb-bubble-iconbtn:hover { background: rgba(201,84,74,0.14); color: #B44B42; }

    /* ── scrollable body ── */
    .sb-bubble-body {
      flex: 1; min-height: 0;
      padding: 14px 16px; overflow-y: auto;
      font-size: 13.5px; line-height: 1.68; color: #241D18;
      word-break: break-word;
    }
    .sb-bubble-body::-webkit-scrollbar { width: 4px; }
    .sb-bubble-body::-webkit-scrollbar-track { background: transparent; }
    .sb-bubble-body::-webkit-scrollbar-thumb {
      background: rgba(180,140,120,0.35); border-radius: 99px;
    }
    .sb-bubble-body::-webkit-scrollbar-thumb:hover { background: rgba(180,140,120,0.6); }

    .sb-bubble-prompt {
      margin: 0 0 12px;
      padding: 9px 12px; border-radius: 10px;
      background: rgba(201,84,74,0.08); color: #6D5145;
      font-size: 12px; line-height: 1.45;
      border: 1px solid rgba(201,84,74,0.14);
    }
    .sb-bubble-card-status .sb-bubble-body { font-size: 13px; color: #5B4A40; }
    .sb-bubble-markdown > :first-child { margin-top: 0; }
    .sb-bubble-markdown > :last-child { margin-bottom: 0; }
    .sb-bubble-markdown h1, .sb-bubble-markdown h2, .sb-bubble-markdown h3 {
      margin: 0 0 8px; color: #1E1713; line-height: 1.25;
    }
    .sb-bubble-markdown h1 { font-size: 17px; }
    .sb-bubble-markdown h2 { font-size: 15px; }
    .sb-bubble-markdown h3 { font-size: 13.5px; }
    .sb-bubble-markdown p { margin: 0 0 10px; }
    .sb-bubble-markdown ul, .sb-bubble-markdown ol { margin: 0 0 10px 16px; padding: 0; }
    .sb-bubble-markdown li { margin: 0 0 5px; }
    .sb-bubble-markdown a { color: #B44B42; text-decoration: none; }
    .sb-bubble-markdown a:hover { text-decoration: underline; }
    .sb-bubble-markdown code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px; padding: 2px 5px; border-radius: 6px;
      background: rgba(67,50,42,0.1); color: #7C352E;
    }
    .sb-bubble-markdown pre {
      margin: 0 0 10px; padding: 11px 13px; border-radius: 12px;
      background: rgba(30,20,14,0.82); color: #FBF7F1; overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px; line-height: 1.55;
    }
    .sb-bubble-markdown pre code { background: transparent; color: inherit; padding: 0; }
    .sb-bubble-markdown blockquote {
      margin: 0 0 10px; padding: 0 0 0 11px;
      border-left: 3px solid rgba(201,84,74,0.3); color: #705C50;
    }
    .sb-bubble-markdown hr {
      border: none; border-top: 1px solid rgba(65,48,40,0.1); margin: 12px 0;
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "__sb_root__";
  root.innerHTML = `
    <div id="__sb_bubble__"></div>
    <div id="__sb_pill__">
      <textarea id="__sb_input__" placeholder="What do you want to do?" autocomplete="off" spellcheck="false" rows="1"></textarea>
      <button id="__sb_rec_btn__" title="Speak to SideBrain">🎙</button>
      <button id="__sb_send_btn__" title="Send">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div id="__sb_brain_btn__">${__SB_BRAIN_SVG}</div>
  `;
  document.body.appendChild(root);

  document.getElementById("__sb_brain_btn__").addEventListener("click", () => __sbToggleInput(!__sbInputOpen));
  document.getElementById("__sb_send_btn__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_rec_btn__").addEventListener("click", __sbToggleRecording);
  const inputEl = document.getElementById("__sb_input__");
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbToggleInput(false);
  });
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  });

  __sbStorageGet(["sbBrainExpanded", "authToken"]).then(({ sbBrainExpanded, authToken }) => {
    if (sbBrainExpanded && authToken) {
      setTimeout(() => __sbToggleInput(true, { skipPersist: true, suppressFocus: true }), 60);
    }
    if (authToken) {
      __sbScheduleWakeMode();
    }
  });

  if (__sbContextOk() && !window.__sbWakeStorageBound) {
    window.__sbWakeStorageBound = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.authToken?.newValue) {
        __sbScheduleWakeMode(600);
      }
      if (changes.authToken && !changes.authToken.newValue) {
        __sbWakeArmed = false;
        __sbVoiceSessionActive = false;
        __sbClearVoiceSessionTimer();
        __sbSetVoiceButtonState(false);
      }
    });
  }
}

function __sbTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 23) return "Good evening";
  return "It's late";
}

function __sbSetGreetingPlaceholder() {
  __sbStorageGet(["authDisplayName"]).then(({ authDisplayName }) => {
    const input = document.getElementById("__sb_input__");
    if (!input) return;
    const firstName = authDisplayName?.split(" ")[0]?.trim();
    const greeting = __sbTimeGreeting();
    input.placeholder = firstName
      ? `${greeting}, ${firstName} — what's on your mind?`
      : `${greeting} — what's on your mind?`;
  });
}

function __sbToggleInput(open, options = {}) {
  if (open) {
    if (!__sbContextOk()) {
      __sbShowBubble("Reload this page to reconnect SideBrain.", true, { tone: "status" });
      return;
    }
    chrome.storage.local.get("authToken", ({ authToken }) => {
      if (!authToken) {
        if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: false });
        __sbShowSignIn();
        return;
      }
      __sbInputOpen = true;
      if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: true });
      __sbSetGreetingPlaceholder(authToken);
      const pill = document.getElementById("__sb_pill__");
      if (pill) {
        pill.classList.add("open");
        if (!options.suppressFocus) {
          setTimeout(() => document.getElementById("__sb_input__")?.focus(), 50);
        }
      }
    });
  } else {
    __sbInputOpen = false;
    if (!options.skipPersist && __sbContextOk()) chrome.storage.local.set({ sbBrainExpanded: false });
    document.getElementById("__sb_pill__")?.classList.remove("open");
  }
}

let __sbBubbleTimer = null;
let __sbLastBubbleRaw = "";

function __sbEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function __sbFormatInlineMarkdown(value) {
  let html = __sbEscapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function __sbRenderMarkdown(md) {
  const codeBlocks = [];
  let text = String(md || "").replace(/\r/g, "");
  text = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `__SB_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre><code>${__sbEscapeHtml(code)}</code></pre>`
    );
    return placeholder;
  });

  const lines = text.split("\n");
  let html = "";
  let listType = null;

  const closeList = () => {
    if (listType) {
      html += listType === "ol" ? "</ol>" : "</ul>";
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    const codeMatch = line.match(/^__SB_CODE_BLOCK_(\d+)__$/);
    if (codeMatch) {
      closeList();
      html += codeBlocks[Number(codeMatch[1])] || "";
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = Math.min(headingMatch[1].length, 3);
      html += `<h${level}>${__sbFormatInlineMarkdown(headingMatch[2])}</h${level}>`;
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      html += "<hr />";
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeList();
      html += `<blockquote>${__sbFormatInlineMarkdown(quoteMatch[1])}</blockquote>`;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${__sbFormatInlineMarkdown(orderedMatch[1])}</li>`;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${__sbFormatInlineMarkdown(bulletMatch[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${__sbFormatInlineMarkdown(line)}</p>`;
  }

  closeList();
  return html || `<p>${__sbEscapeHtml(String(md || ""))}</p>`;
}

function __sbSetVoiceButtonState(active) {
  const recBtn = document.getElementById("__sb_rec_btn__");
  recBtn?.classList.toggle("active", active);
  recBtn?.classList.toggle("wake", !active && __sbWakeArmed && !__sbIsSpeaking);
  document.getElementById("__sb_brain_btn__")?.classList.toggle("recording", active);
  if (recBtn) {
    recBtn.title = active
      ? "Stop listening"
      : (__sbIsSpeaking
        ? "Stop speaking"
        : (__sbWakeArmed ? "Wake word ready: say 'Hey SideBrain'" : "Speak to SideBrain"));
  }
}

function __sbClearVoiceSessionTimer() {
  if (__sbVoiceSessionTimer) {
    clearTimeout(__sbVoiceSessionTimer);
    __sbVoiceSessionTimer = null;
  }
}

function __sbResetVoiceSessionTimer() {
  __sbClearVoiceSessionTimer();
  if (!__sbVoiceSessionActive) return;
  __sbVoiceSessionTimer = setTimeout(() => {
    if (__sbIsRecording || __sbVoicePendingReply || __sbIsSpeaking) {
      __sbResetVoiceSessionTimer();
      return;
    }
    __sbVoiceSessionActive = false;
    void __sbStartWakeMode();
  }, 25000);
}

function __sbScheduleWakeMode(delay = 1200) {
  if (!__sbContextOk()) return;
  if (__sbWakeStartTimer) clearTimeout(__sbWakeStartTimer);
  __sbWakeStartTimer = setTimeout(() => {
    __sbWakeStartTimer = null;
    void __sbStartWakeMode();
  }, delay);
}

async function __sbStartWakeMode() {
  if (!__sbContextOk()) return false;
  if (__sbWakeArmed || __sbIsRecording || __sbVoicePendingReply || __sbIsSpeaking) return false;
  if (window.__sideBrainShouldListen && window.__sideBrainVoiceSource && !String(window.__sideBrainVoiceSource).startsWith("inline")) {
    return false;
  }

  const { authToken } = await __sbStorageGet(["authToken"]);
  if (!authToken) return false;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "startInlineWakeListening" }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        resolve(false);
        return;
      }
      __sbWakeArmed = true;
      __sbSetVoiceButtonState(false);
      resolve(true);
    });
  });
}

async function __sbResumeConversationAfterReply() {
  __sbVoicePendingReply = false;
  if (!__sbVoiceSessionActive) {
    await __sbStartWakeMode();
    return;
  }

  __sbResetVoiceSessionTimer();
  const restarted = await __sbStartRecording({ silent: true, keepSession: true });
  if (!restarted) {
    __sbVoiceSessionActive = false;
    await __sbStartWakeMode();
  }
}

function __sbStripMarkdownForSpeech(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/^\s*[\*\-\+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function __sbSyncSpeakButtons() {
  document.querySelectorAll("[data-sb-speak]").forEach((button) => {
    if (button instanceof HTMLElement) {
      button.textContent = __sbIsSpeaking ? "Stop" : "Speak";
    }
  });
}

function __sbStopSpeech() {
  if (__sbCurrentSpeechAudio) {
    try { __sbCurrentSpeechAudio.pause(); } catch {}
    __sbCurrentSpeechAudio.src = "";
    __sbCurrentSpeechAudio = null;
  }
  if (__sbCurrentSpeechUrl) {
    URL.revokeObjectURL(__sbCurrentSpeechUrl);
    __sbCurrentSpeechUrl = null;
  }
  if (__sbCurrentUtterance && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    __sbCurrentUtterance = null;
  }
  __sbIsSpeaking = false;
  __sbSetVoiceButtonState(__sbIsRecording);
  __sbSyncSpeakButtons();
}

function __sbSpeakWithBrowser(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    __sbCurrentUtterance = utterance;
    __sbIsSpeaking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();

    const finish = () => {
      if (__sbCurrentUtterance === utterance) __sbCurrentUtterance = null;
      __sbIsSpeaking = false;
      __sbSetVoiceButtonState(__sbIsRecording);
      __sbSyncSpeakButtons();
      resolve(true);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function __sbSpeakText(text) {
  const clean = __sbStripMarkdownForSpeech(text);
  if (!clean) return;

  __sbStopSpeech();

  try {
    const resp = await fetch(`${__SB_API}/elevenlabs-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        voiceId: "2ajXGJNYBR0iNHpS4VZb",
      }),
    });

    if (!resp.ok) throw new Error(`TTS failed: ${resp.status}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    __sbCurrentSpeechAudio = audio;
    __sbCurrentSpeechUrl = url;
    __sbIsSpeaking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  } catch (_err) {
    await __sbSpeakWithBrowser(clean);
    return;
  } finally {
    if (__sbCurrentSpeechAudio) {
      try { __sbCurrentSpeechAudio.pause(); } catch {}
      __sbCurrentSpeechAudio = null;
    }
    if (__sbCurrentSpeechUrl) {
      URL.revokeObjectURL(__sbCurrentSpeechUrl);
      __sbCurrentSpeechUrl = null;
    }
    __sbIsSpeaking = false;
    __sbSetVoiceButtonState(__sbIsRecording);
    __sbSyncSpeakButtons();
  }
}

function __sbBindBubbleActions() {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;

  bubble.querySelector("[data-sb-close]")?.addEventListener("click", () => {
    __sbStopSpeech();
    bubble.classList.remove("visible");
  });

  bubble.querySelector("[data-sb-copy]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) return;
    try {
      await navigator.clipboard.writeText(__sbLastBubbleRaw);
      const previous = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = previous || "Copy"; }, 1200);
    } catch {}
  });

  bubble.querySelector("[data-sb-speak]")?.addEventListener("click", () => {
    if (__sbIsSpeaking) {
      __sbStopSpeech();
      return;
    }
    void __sbSpeakText(__sbLastBubbleRaw);
  });

  __sbSyncSpeakButtons();
}

function __sbCenterBubble(bubble) {
  if (bubble.dataset.positioned) return;
  const w = Math.min(420, window.innerWidth - 100);
  // Anchor above the brain+pill stack (bottom-right)
  bubble.style.right = "20px";
  bubble.style.bottom = "148px"; // brain(52) + gap(8) + pill(52) + gap(8) + margin(28)
  bubble.style.left = "auto";
  bubble.style.top = "auto";
  bubble.style.width = w + "px";
  bubble.dataset.positioned = "1";
  __sbInitDrag(bubble);
}

function __sbInitDrag(bubble) {
  if (bubble.dataset.dragBound) return;
  bubble.dataset.dragBound = "1";
  let dragging = false, ox = 0, oy = 0, bl = 0, bt = 0;
  bubble.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".sb-bubble-head")) return;
    if (e.button !== 0) return;
    dragging = true;
    const r = bubble.getBoundingClientRect();
    // Convert right/bottom anchoring to left/top so drag math works
    bubble.style.left = r.left + "px";
    bubble.style.top = r.top + "px";
    bubble.style.right = "auto";
    bubble.style.bottom = "auto";
    bl = r.left; bt = r.top; ox = e.clientX; oy = e.clientY;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    bubble.style.left = Math.max(0, bl + e.clientX - ox) + "px";
    bubble.style.top = Math.max(0, bt + e.clientY - oy) + "px";
  });
  document.addEventListener("mouseup", () => { dragging = false; });
}

function __sbShowBubble(text, autoHide = true, options = {}) {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;
  __sbCenterBubble(bubble);
  __sbLastBubbleRaw = String(text || "");
  const tone = options.tone || "status";
  const title = options.title || document.title || "Current page";
  const prompt = options.prompt ? `<div class="sb-bubble-prompt">${__sbEscapeHtml(options.prompt)}</div>` : "";
  const rich = Boolean(options.rich);

  bubble.innerHTML = rich
    ? `
      <div class="sb-bubble-card">
        <div class="sb-bubble-head">
          <div class="sb-bubble-head-main">
            <div class="sb-bubble-kicker">${__sbEscapeHtml(options.kicker || "SideBrain")}</div>
            <div class="sb-bubble-title">${__sbEscapeHtml(title)}</div>
          </div>
          <div class="sb-bubble-actions">
            <button class="sb-bubble-iconbtn" type="button" data-sb-speak>Speak</button>
            <button class="sb-bubble-iconbtn" type="button" data-sb-copy>Copy</button>
            <button class="sb-bubble-iconbtn" type="button" data-sb-close>×</button>
          </div>
        </div>
        ${prompt}
        <div class="sb-bubble-body sb-bubble-markdown">${__sbRenderMarkdown(text)}</div>
      </div>
    `
    : `
      <div class="sb-bubble-card sb-bubble-card-status">
        <div class="sb-bubble-head">
          <div class="sb-bubble-head-main">
            <div class="sb-bubble-kicker">${__sbEscapeHtml(options.kicker || "SideBrain")}</div>
            <div class="sb-bubble-title">${__sbEscapeHtml(options.title || "Working")}</div>
          </div>
          <div class="sb-bubble-actions">
            <button class="sb-bubble-iconbtn" type="button" data-sb-close>×</button>
          </div>
        </div>
        <div class="sb-bubble-body">${__sbEscapeHtml(text)}</div>
      </div>
    `;
  bubble.classList.add("visible");
  bubble.dataset.tone = tone;
  __sbBindBubbleActions();
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (autoHide) __sbBubbleTimer = setTimeout(() => bubble.classList.remove("visible"), 8000);
}

function __sbShowSignIn() {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;
  __sbCenterBubble(bubble);
  bubble.innerHTML = `
    <div style="font-size:13px;line-height:1.5;color:#1B1713">
      Sign in to get started with SideBrain.
    </div>
    <button id="__sb_signin_btn__" style="
      margin-top:10px;width:100%;padding:8px 0;border:none;border-radius:20px;
      background:#E8786E;color:white;font-size:13px;font-weight:600;cursor:pointer;
    ">Sign in</button>
  `;
  bubble.classList.add("visible");
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);

  document.getElementById("__sb_signin_btn__")?.addEventListener("click", () => {
    window.open(chrome.runtime.getURL("sidepanel.html"), "_blank", "width=420,height=680,menubar=no,toolbar=no,resizable=no");
  });

  // Auto-unlock once auth token lands in storage
  if (__sbContextOk()) {
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.authToken?.newValue) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
        bubble.classList.remove("visible");
        __sbShowBubble("You're signed in! Click the brain to chat.", true, { tone: "status", title: "Signed in" });
        __sbScheduleWakeMode(600);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
  }
}

function __sbGetSelectedText() {
  return window.getSelection?.()?.toString?.()?.trim?.() || "";
}

function __sbGetPageContext(maxChars = 12000) {
  const pageText = (document.body?.innerText || "").trim().slice(0, maxChars);
  const selectedText = __sbGetSelectedText();
  return {
    url: location.href,
    title: document.title,
    text: pageText,
    selectedText,
  };
}

function __sbIsExplicitWebSearchRequest(text) {
  return /\b(search (the )?web|web search|search online|look (this|that|it) up|look up|google\b|latest\b|current\b|news\b|search for\b)\b/i.test(text);
}

function __sbIsBrowserActionCommand(text) {
  return /\b(open|go to|navigate to|visit|search for|play|send|click|find|buy|order|type|compose|reply to|download|post on|scroll|refresh|close tab|new tab|book|fill in|fill out|submit|press)\b/i.test(text);
}

function __sbDetectIntent(text) {
  const t = text.toLowerCase();
  if (/\b(record|transcribe|capture audio|start listening|start recording)\b/.test(t)) return "record";
  if (__sbIsExplicitWebSearchRequest(t)) return "web";
  if (__sbIsBrowserActionCommand(t) || /\b(do .{0,25} for me|automate|browse to)\b/.test(t)) return "agent";
  if (/\b(this page|this article|this post|this site|this video|summarize|summary|tldr|tl;dr|what does this|explain this|what is this|what are they|what does it say|what did they write|what's on)\b/.test(t)) return "page";
  return "chat";
}

function __sbFormatWebSearchResults(query, searchData) {
  const lines = (searchData?.results || []).map((result, index) => {
    const title = String(result.title || "Untitled result").trim();
    const url = String(result.url || "").trim();
    const snippet = String(result.snippet || "").trim();
    return `[${index + 1}] ${title}\nURL: ${url}\nSnippet: ${snippet || "(no snippet provided)"}`;
  });

  return [
    `Live web search query: ${query}`,
    searchData?.engine ? `Search engine: ${searchData.engine}` : "",
    searchData?.searchUrl ? `Search page: ${searchData.searchUrl}` : "",
    "",
    lines.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

function __sbBuildWebSearchPageContext(query, searchData) {
  return {
    title: `Web search results for "${query}"`,
    url: searchData?.searchUrl || "",
    text: __sbFormatWebSearchResults(query, searchData),
  };
}

function __sbAppendSearchSources(reply, results) {
  if (!results?.length) return reply;
  if (/\n#{1,3}\s*Sources\b/i.test(reply) || /\nSources:\s*$/i.test(reply)) return reply;

  const sources = results
    .slice(0, 5)
    .filter((result) => result?.url)
    .map((result) => {
      const cleanTitle = String(result.title || result.url).replace(/[\[\]]/g, "").trim();
      return `- ${cleanTitle}: ${result.url}`;
    });

  if (!sources.length) return reply;
  return `${reply}\n\nSources\n${sources.join("\n")}`;
}

async function __sbPerformWebSearch(query) {
  if (!__sbContextOk()) throw new Error("Reload page to reconnect SideBrain.");

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "performWebSearch", query }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (res?.error) {
        reject(new Error(res.error));
        return;
      }
      resolve(res || { results: [] });
    });
  });
}

async function __sbFetchAssistantReply(body) {
  const resp = await fetch(`${__SB_API}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (resp.status === 401 || resp.status === 403) {
    __sbShowSignIn();
    return { reply: null };
  }

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed: ${resp.status}`);
  }

  const json = await resp.json();
  return { reply: json.reply || json.response || json.message || json.answer || "" };
}

async function __sbProcessPrompt(text, options = {}) {
  const promptText = String(text || "").trim();
  if (!promptText) return;
  const fromVoice = Boolean(options.fromVoice);
  __sbStopSpeech();
  if (!fromVoice && __sbIsRecording) __sbStopRecording({ silent: true });

  const intent = __sbDetectIntent(promptText);

  if (intent === "record") {
    __sbShowBubble("Listening… speak now.", false, { tone: "status", title: "Voice" });
    if (fromVoice) __sbVoicePendingReply = false;
    await __sbStartRecording({ keepSession: true });
    return;
  }

  const stored = await __sbStorageGet(["currentNotes", "authToken", "isPremium", "aiProvider"]);
  const aiProvider = stored.aiProvider === "claude" ? "claude" : "lovable";

  if (intent === "agent") {
    if (!stored.isPremium) {
      if (fromVoice) __sbVoicePendingReply = false;
      __sbShowUpgrade("Browser Agent (Delegate)");
      if (fromVoice) {
        __sbVoiceSessionActive = false;
        await __sbSpeakText("Browser agent requires premium.");
        await __sbStartWakeMode();
      }
      return;
    }
    __sbShowBubble("Delegating…", false);
    __sbRunAgent(promptText);
    if (fromVoice) {
      await __sbSpeakText("On it.");
      await __sbResumeConversationAfterReply();
    }
    return;
  }

  const pageContext = __sbGetPageContext();
  const hasPageText = Boolean(pageContext.text);
  const selectedText = pageContext.selectedText || undefined;
  const previousHistory = __sbChatHistory.slice(-10);

  if (intent === "web") {
    __sbShowBubble("Searching the web…", false);
    __sbChatHistory.push({ role: "user", content: promptText });

    try {
      const searchData = await __sbPerformWebSearch(promptText);
      const { reply } = await __sbFetchAssistantReply({
        aiProvider,
        pageContext: __sbBuildWebSearchPageContext(promptText, searchData),
        chatHistory: previousHistory,
        message: `Answer the user's question using the live web search results in page context. Do not pretend you visited pages beyond these result snippets. If the results are insufficient, say that plainly.\n\nUser question: ${promptText}`,
      });
      if (!reply) {
        if (fromVoice) {
          __sbVoiceSessionActive = false;
          await __sbSpeakText("Please sign in to continue.");
          await __sbStartWakeMode();
        }
        return;
      }

      const finalReply = __sbAppendSearchSources(String(reply), searchData.results || []);
      __sbChatHistory.push({ role: "assistant", content: finalReply });
      __sbShowBubble(finalReply, false, {
        rich: true,
        prompt: promptText,
        title: `Web results · ${location.hostname.replace(/^www\./, "") || "current page"}`,
      });
      if (fromVoice) {
        await __sbSpeakText(finalReply);
      }
    } catch (err) {
      __sbShowBubble("Error: " + (err.message || "couldn't search the web"), true);
      if (fromVoice) {
        __sbVoiceSessionActive = false;
        await __sbSpeakText("Something went wrong while searching the web.");
      }
    } finally {
      if (fromVoice) await __sbResumeConversationAfterReply();
    }
    return;
  }

  __sbShowBubble(hasPageText ? "Reading page…" : "Thinking…", false);
  __sbChatHistory.push({ role: "user", content: promptText });

  try {
      const body = {
      message: promptText,
      notes: stored.currentNotes || "",
      aiProvider,
      chatHistory: previousHistory,
      };
    if (hasPageText) body.pageContext = { url: pageContext.url, title: pageContext.title, text: pageContext.text };
    if (selectedText) body.selectedText = selectedText;

    const { reply } = await __sbFetchAssistantReply(body);
    if (!reply) {
      if (fromVoice) {
        __sbVoiceSessionActive = false;
        await __sbSpeakText("Please sign in to continue.");
        await __sbStartWakeMode();
      }
      return;
    }
    __sbChatHistory.push({ role: "assistant", content: reply });
    __sbShowBubble(reply, false, {
      rich: true,
      prompt: promptText,
      title: pageContext.title || location.hostname.replace(/^www\./, "") || "Current page",
    });
    if (fromVoice) {
      await __sbSpeakText(reply);
    }
  } catch (err) {
    __sbShowBubble("Error: " + (err.message || "couldn't reach SideBrain"), true);
    if (fromVoice) {
      __sbVoiceSessionActive = false;
      await __sbSpeakText("Something went wrong.");
    }
  } finally {
    if (fromVoice) await __sbResumeConversationAfterReply();
  }
}

async function __sbSendMessage() {
  const input = document.getElementById("__sb_input__");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";
  await __sbProcessPrompt(text);
}

function __sbShowUpgrade(feature) {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  bubble.innerHTML = `
    <div style="font-size:13px;line-height:1.5;color:#1B1713">⚡ <strong>${feature}</strong> is a Premium feature.</div>
    <button id="__sb_upgrade_btn__" style="margin-top:10px;width:100%;padding:8px 0;border:none;border-radius:20px;background:#E8786E;color:white;font-size:13px;font-weight:600;cursor:pointer;">Upgrade to Premium</button>
  `;
  bubble.classList.add("visible");
  document.getElementById("__sb_upgrade_btn__")?.addEventListener("click", () => {
    window.open("https://notetakerai.lovable.app/#pricing", "_blank");
  });
}

function __sbRunAgent(task) {
  if (!__sbContextOk()) { __sbShowBubble("Reload page to reconnect SideBrain.", true); return; }
  // Hand off to background — it runs the full agent loop and sends sbAgentUpdate messages back
  chrome.runtime.sendMessage({ action: "runBrainAgent", task }, () => { void chrome.runtime.lastError; });
}

function __sbToggleRecording() {
  if (__sbIsRecording) {
    __sbStopRecording();
    return;
  }
  if (__sbVoicePendingReply) {
    __sbShowBubble("Still working on your last voice request.", true, { tone: "status", title: "Voice" });
    return;
  }
  if (__sbIsSpeaking) {
    __sbStopSpeech();
    __sbVoiceSessionActive = false;
    __sbWakeArmed = false;
    __sbShowBubble("Voice playback stopped.", true, { tone: "status", title: "Voice" });
    __sbScheduleWakeMode(300);
    return;
  }
  void __sbStartRecording({ keepSession: true });
}

function __sbStartRecording(options = {}) {
  if (!__sbContextOk()) {
    __sbShowBubble("Reload this page to reconnect SideBrain.", true, { tone: "status", title: "Voice" });
    return Promise.resolve(false);
  }

  __sbStopSpeech();
  __sbWakeArmed = false;
  const input = document.getElementById("__sb_input__");
  if (input) input.value = "";

  __sbVoiceSessionActive = options.keepSession !== false;
  __sbResetVoiceSessionTimer();
  __sbIsRecording = true;
  __sbSetVoiceButtonState(true);
  if (!options.silent) {
    __sbShowBubble("Listening… speak now.", false, { tone: "status", title: "Voice" });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "startInlineVoiceListening" }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        __sbIsRecording = false;
        __sbVoiceSessionActive = false;
        __sbSetVoiceButtonState(false);
        const errorMessage = chrome.runtime.lastError?.message || res?.error || "Could not start voice capture.";
        if (!options.silent) {
          __sbShowBubble(`Voice error: ${errorMessage}`, true, { tone: "status", title: "Voice" });
        }
        __sbScheduleWakeMode(300);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function __sbStopRecording(options = {}) {
  chrome.runtime.sendMessage({ action: "stopInlineVoiceListening" }, () => { void chrome.runtime.lastError; });
  __sbWakeArmed = false;
  __sbIsRecording = false;
  if (options.keepSession !== true) {
    __sbVoiceSessionActive = false;
    __sbClearVoiceSessionTimer();
  }
  __sbSetVoiceButtonState(false);
  if (!options.silent) {
    __sbShowBubble("Voice capture stopped.", true, { tone: "status", title: "Voice" });
  }
  if (!options.silent) {
    __sbScheduleWakeMode(300);
  }
}

function __sbHandleRecordingUpdate(msg) {
  if (msg.status === "transcript") {
    __sbShowBubble(msg.text || "Transcribing…", false, { tone: "status", title: "Recording" });
  } else if (msg.status === "done") {
    __sbIsRecording = false;
    document.getElementById("__sb_rec_btn__")?.classList.remove("active");
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble(msg.text || "Recording saved to dashboard.", true, { tone: "status", title: "Recording saved" });
  } else if (msg.status === "error") {
    __sbIsRecording = false;
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble("Recording error: " + (msg.error || "unknown"), true, { tone: "status", title: "Recording error" });
  }
}

function __sbHandleVoiceEvent(msg) {
  if (msg.source !== "inline" && msg.source !== "inline-wake") return;

  const input = document.getElementById("__sb_input__");

  if (msg.event === "wakeReady") {
    __sbWakeArmed = true;
    __sbSetVoiceButtonState(false);
    return;
  }

  if (msg.event === "wakeDetected") {
    __sbWakeArmed = false;
    __sbVoiceSessionActive = true;
    __sbResetVoiceSessionTimer();
    __sbIsRecording = true;
    __sbSetVoiceButtonState(true);
    if (!__sbInputOpen) {
      __sbToggleInput(true, { skipPersist: true, suppressFocus: true });
    }
    __sbShowBubble("Heard you. Listening…", false, { tone: "status", title: "Wake word heard" });
    return;
  }

  if (!__sbIsRecording && !__sbVoicePendingReply && !__sbVoiceSessionActive) return;

  if (msg.event === "listening") {
    __sbWakeArmed = false;
    __sbIsRecording = true;
    __sbResetVoiceSessionTimer();
    __sbSetVoiceButtonState(true);
    __sbShowBubble("Listening… speak now.", false, { tone: "status", title: "Voice" });
    return;
  }

  if (msg.event === "transcript") {
    const transcript = String(msg.text || "").trim();
    if (!transcript) return;
    __sbResetVoiceSessionTimer();
    if (input) input.value = transcript;

    if (!msg.isFinal) {
      __sbShowBubble(transcript, false, { tone: "status", title: "Listening" });
      return;
    }

    __sbVoicePendingReply = true;
    __sbStopRecording({ silent: true, keepSession: true });
    if (input) input.value = "";
    __sbShowBubble("Thinking…", false, { tone: "status", title: "Voice" });
    void __sbProcessPrompt(transcript, { fromVoice: true });
    return;
  }

  if (msg.event === "error") {
    __sbVoicePendingReply = false;
    __sbVoiceSessionActive = false;
    __sbStopRecording({ silent: true });
    const errorText = msg.error === "not-allowed"
      ? "Microphone access is blocked. Allow mic access and try again."
      : `Voice error: ${msg.error || "unknown error"}`;
    __sbShowBubble(errorText, true, { tone: "status", title: "Voice" });
    __sbScheduleWakeMode(600);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => __sbBuildBrainUI(), { once: true });
} else {
  __sbBuildBrainUI();
}
} // end window.__sbLoaded guard
