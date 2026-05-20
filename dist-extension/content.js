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
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      sendResponse({ error: "not-supported" });
      return true;
    }
    // Abort any existing session
    window.__sideBrainShouldListen = true;
    if (window.__sideBrainRecognition) {
      try { window.__sideBrainRecognition.abort(); } catch(e) {}
      window.__sideBrainRecognition = null;
    }

    function buildAndStart() {
      if (!window.__sideBrainShouldListen) return;
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true; // keep listening through natural pauses; onend restarts on unexpected stop
      rec.maxAlternatives = 1;
      window.__sideBrainRecognition = rec;

      rec.onresult = (e) => {
        const text = Array.from(e.results).map(r => r[0].transcript).join("");
        const isFinal = e.results[e.results.length - 1].isFinal;
        chrome.runtime.sendMessage({ action: "voiceEvent", event: "transcript", text, isFinal });
      };

      rec.onerror = (e) => {
        if (e.error === "aborted") return;
        // no-speech is normal (user didn't speak) — just restart silently
        if (e.error === "no-speech") {
          window.__sideBrainRecognition = null;
          setTimeout(buildAndStart, 100);
          return;
        }
        chrome.runtime.sendMessage({ action: "voiceEvent", event: "error", message: e.error });
        window.__sideBrainRecognition = null;
        window.__sideBrainShouldListen = false;
      };

      rec.onstart = () => {
        chrome.runtime.sendMessage({ action: "voiceEvent", event: "listening" });
      };

      rec.onend = () => {
        window.__sideBrainRecognition = null;
        // Auto-restart so user can speak again after the current utterance is processed
        if (window.__sideBrainShouldListen) {
          setTimeout(buildAndStart, 150);
        }
      };

      try {
        rec.start();
      } catch(e) {
        if (window.__sideBrainShouldListen) setTimeout(buildAndStart, 500);
      }
    }

    buildAndStart();
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === "stopVoiceListening") {
    window.__sideBrainShouldListen = false;
    if (window.__sideBrainRecognition) {
      try { window.__sideBrainRecognition.abort(); } catch(e) {}
      window.__sideBrainRecognition = null;
    }
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

// Extension icon click builds brain (first time) and toggles input
if (__sbContextOk()) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "toggleSideBrainPanel") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbToggleInput(!__sbInputOpen);
      sendResponse({ ok: true });
    }
    if (msg.action === "sbAgentUpdate") __sbShowBubble(msg.text, false);
    if (msg.action === "sbRecordingUpdate") __sbHandleRecordingUpdate(msg);
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
      background: #ffffff; border-radius: 28px;
      padding: 7px 7px 7px 16px;
      box-shadow: 0 4px 24px rgba(27,23,19,0.18), 0 1px 4px rgba(27,23,19,0.08);
      width: 288px; max-width: calc(100vw - 90px);
      opacity: 0; transform: translateY(6px) scale(0.97);
      transition: opacity 0.18s, transform 0.18s;
      pointer-events: none;
    }
    #__sb_pill__.open {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }
    #__sb_input__ {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 13.5px; color: #1B1713; min-width: 0; padding: 0;
    }
    #__sb_input__::placeholder { color: #B0A89E; }
    #__sb_send_btn__, #__sb_rec_btn__ {
      width: 32px; height: 32px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    #__sb_send_btn__ { background: #E8786E; color: white; }
    #__sb_send_btn__:hover { background: #C9544A; }
    #__sb_rec_btn__ { background: #f3f0ee; font-size: 13px; }
    #__sb_rec_btn__:hover { background: #ebe8e5; }
    #__sb_rec_btn__.active { background: #fee2e2; }
    #__sb_bubble__ {
      background: #ffffff; border-radius: 14px;
      padding: 11px 14px; font-size: 13px; line-height: 1.55;
      color: #1B1713; max-width: 288px;
      box-shadow: 0 4px 20px rgba(27,23,19,0.14);
      opacity: 0; transform: translateY(4px);
      transition: opacity 0.18s, transform 0.18s;
      pointer-events: none;
      white-space: pre-wrap; word-break: break-word;
      position: relative;
    }
    #__sb_bubble__::after {
      content: ''; position: absolute; bottom: -7px; right: 18px;
      width: 14px; height: 8px; background: #ffffff;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
    }
    #__sb_bubble__.visible {
      opacity: 1; transform: translateY(0); pointer-events: all;
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "__sb_root__";
  root.innerHTML = `
    <div id="__sb_bubble__"></div>
    <div id="__sb_pill__">
      <input id="__sb_input__" placeholder="What do you want to do?" autocomplete="off" spellcheck="false" />
      <button id="__sb_rec_btn__" title="Record tab audio">🎙</button>
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
  document.getElementById("__sb_input__").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbToggleInput(false);
  });
}

function __sbToggleInput(open) {
  if (open) {
    if (!__sbContextOk()) {
      __sbShowBubble("Reload this page to reconnect SideBrain.", true);
      return;
    }
    chrome.storage.local.get("authToken", ({ authToken }) => {
      if (!authToken) { __sbShowSignIn(); return; }
      __sbInputOpen = true;
      const pill = document.getElementById("__sb_pill__");
      if (pill) {
        pill.classList.add("open");
        setTimeout(() => document.getElementById("__sb_input__")?.focus(), 50);
      }
    });
  } else {
    __sbInputOpen = false;
    document.getElementById("__sb_pill__")?.classList.remove("open");
  }
}

let __sbBubbleTimer = null;
function __sbShowBubble(text, autoHide = true) {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add("visible");
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (autoHide) __sbBubbleTimer = setTimeout(() => bubble.classList.remove("visible"), 8000);
}

function __sbShowSignIn() {
  const bubble = document.getElementById("__sb_bubble__");
  if (!bubble) return;
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
    const unwatch = chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.authToken?.newValue) {
        chrome.storage.onChanged.removeListener(unwatch);
        bubble.classList.remove("visible");
        __sbShowBubble("You're signed in! Click the brain to chat.", true);
      }
    });
  }
}

function __sbDetectIntent(text) {
  const t = text.toLowerCase();
  if (/\b(record|transcribe|capture audio|start listening|start recording)\b/.test(t)) return "record";
  if (/\b(go to|navigate to|open tab|click on|fill in|fill out|book|buy|order|search for|find on|do .{0,25} for me|automate|browse to)\b/.test(t)) return "agent";
  if (/\b(this page|this article|this post|this site|this video|summarize|summary|tldr|tl;dr|what does this|explain this|what is this|what are they|what does it say|what did they write|what's on)\b/.test(t)) return "page";
  return "chat";
}

async function __sbSendMessage() {
  const input = document.getElementById("__sb_input__");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const intent = __sbDetectIntent(text);

  if (intent === "record") {
    __sbShowBubble("Starting recording…", false);
    __sbStartRecording();
    return;
  }

  const stored = await __sbStorageGet(["currentNotes", "authToken", "isPremium"]);

  if (intent === "agent") {
    if (!stored.isPremium) {
      __sbShowUpgrade("Browser Agent (Delegate)");
      return;
    }
    __sbShowBubble("Delegating…", false);
    __sbRunAgent(task);
    return;
  }

  const isPageQuery = intent === "page";
  __sbShowBubble(isPageQuery ? "Reading page…" : "Thinking…", false);
  __sbChatHistory.push({ role: "user", content: text });

  try {
    const body = {
      message: text,
      notes: stored.currentNotes || "",
      aiProvider: "anthropic",
      chatHistory: __sbChatHistory.slice(-6, -1),
    };
    if (isPageQuery) {
      body.pageContext = {
        url: location.href,
        title: document.title,
        text: document.body.innerText?.slice(0, 8000) || "",
      };
    }

    const resp = await fetch(`${__SB_API}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 401 || resp.status === 403) { __sbShowSignIn(); return; }

    const json = await resp.json();
    const reply = json.reply || json.response || json.message || json.answer || JSON.stringify(json);
    __sbChatHistory.push({ role: "assistant", content: reply });
    __sbShowBubble(reply, true);
  } catch (err) {
    __sbShowBubble("Error: " + (err.message || "couldn't reach SideBrain"), true);
  }
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
  if (__sbIsRecording) __sbStopRecording(); else __sbStartRecording();
}

function __sbStartRecording() {
  chrome.runtime.sendMessage({ action: "getStreamId" }, (res) => {
    if (chrome.runtime.lastError || !res?.streamId) {
      __sbShowBubble("Could not access tab audio.", true);
      return;
    }
    chrome.runtime.sendMessage({ action: "startRecording", streamId: res.streamId, tabId: res.tabId }, () => { void chrome.runtime.lastError; });
    __sbIsRecording = true;
    document.getElementById("__sb_rec_btn__")?.classList.add("active");
    document.getElementById("__sb_brain_btn__")?.classList.add("recording");
    __sbShowBubble("Recording… speak now.", false);
  });
}

function __sbStopRecording() {
  chrome.runtime.sendMessage({ action: "stopRecording" }, () => { void chrome.runtime.lastError; });
  __sbIsRecording = false;
  document.getElementById("__sb_rec_btn__")?.classList.remove("active");
  document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
  __sbShowBubble("Stopped. Processing…", false);
}

function __sbHandleRecordingUpdate(msg) {
  if (msg.status === "transcript") {
    __sbShowBubble(msg.text || "Transcribing…", false);
  } else if (msg.status === "done") {
    __sbIsRecording = false;
    document.getElementById("__sb_rec_btn__")?.classList.remove("active");
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble(msg.text || "Recording saved to dashboard.", true);
  } else if (msg.status === "error") {
    __sbIsRecording = false;
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble("Recording error: " + (msg.error || "unknown"), true);
  }
}
} // end window.__sbLoaded guard
