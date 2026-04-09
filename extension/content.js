// SideBrain Content Script — extracts page text for AI context
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractPageContent") {
    const text = (document.body?.innerText || "").substring(0, 12000);
    const title = document.title || "";
    const url = window.location.href || "";
    sendResponse({ text, title, url });
    return true;
  }

  // ===== BROWSER AGENT: get rich page context =====
  if (msg.action === "getAgentPageContext") {
    const url = window.location.href;
    const title = document.title;
    const bodyText = (document.body?.innerText || "").substring(0, 5000);

    // Detect popups/overlays/modals
    const popupInfo = detectPopupsAndOverlays();

    // Collect interactive elements with their visible text
    const interactiveEls = [];
    const seen = new Set();
    const selectors = ['button', 'a', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]', '[role="dialog"] button', '[role="alertdialog"] button', '[aria-label*="close"]', '[aria-label*="dismiss"]'];
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
      // Flag if element is inside a modal/popup
      if (el.closest('[role="dialog"], [role="alertdialog"], [class*="modal"], [class*="popup"], [class*="overlay"], [class*="banner"]')) {
        entry.inPopup = true;
      }
      interactiveEls.push(entry);
    });

    // Also collect <select> dropdowns with their options
    const selectEls = [];
    document.querySelectorAll("select").forEach(sel => {
      const label = sel.getAttribute("aria-label") || sel.getAttribute("name") || sel.id || "";
      const options = Array.from(sel.options).map(o => o.text.trim()).filter(Boolean).slice(0, 20);
      if (options.length) selectEls.push({ label, options, current: sel.options[sel.selectedIndex]?.text || "" });
    });

    sendResponse({ url, title, bodyText, interactiveEls: interactiveEls.slice(0, 80), selectEls, popups: popupInfo });
    return true;
  }

  // ===== BROWSER AGENT: execute action on page =====
  if (msg.action === "agentAction") {
    const { type, selector, targetText, targetTag, text, url, direction, amount } = msg;
    (async () => { try {
      if (type === "click") {
        let el = null;
        // Try CSS selector first
        if (selector) {
          try { el = document.querySelector(selector); } catch (e) {}
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
        }
        // If a targetText hint was given, try finding by aria-label or placeholder
        if (!el && msg.targetText) {
          const hint = msg.targetText.toLowerCase();
          el = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]')).find(e => {
            const label = (e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.getAttribute("name") || "").toLowerCase();
            return label.includes(hint);
          });
        }
        if (!el) {
          // Use focused element if it's an input, otherwise find the most relevant visible one
          const active = document.activeElement;
          const tag = active?.tagName?.toLowerCase();
          if (active && (["input","textarea"].includes(tag) || active.contentEditable === "true")) {
            el = active;
          } else {
            el = document.querySelector('[contenteditable="true"], textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
          }
        }
        if (!el) { sendResponse({ error: "No input element found" }); return true; }

        const isContentEditable = el.contentEditable === "true" || el.getAttribute("contenteditable") === "true";

        el.focus();
        el.click();
        await new Promise(r => setTimeout(r, 80));

        if (isContentEditable) {
          // Gmail body, Notion, etc. — use execCommand for reliable typing
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);
          // Type chunk by chunk using insertText
          document.execCommand("insertText", false, text);
          // Fallback: set textContent and fire input event
          if (!el.textContent.includes(text.substring(0, 5))) {
            el.textContent = text;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
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
        const el = document.activeElement || document.querySelector("input, textarea");
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
            const focusables = Array.from(document.querySelectorAll('input, textarea, button, [contenteditable], [tabindex]:not([tabindex="-1"])'))
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

      } else {
        sendResponse({ error: `Unknown action type: ${type}` });
      }
    } catch (e) {
      sendResponse({ error: e.message });
    } })();
    return true;
  }

// ===== POPUP/OVERLAY DETECTION =====
function detectPopupsAndOverlays() {
  const popups = [];
  
  // Check for modal dialogs
  const dialogSelectors = [
    '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]',
    '[class*="modal"]', '[class*="Modal"]', '[class*="popup"]', '[class*="Popup"]',
    '[class*="overlay"]', '[class*="Overlay"]', '[class*="cookie"]', '[class*="Cookie"]',
    '[class*="consent"]', '[class*="Consent"]', '[class*="banner"]', '[class*="Banner"]',
    '[class*="notification"]', '[class*="Notification"]',
    '[id*="modal"]', '[id*="popup"]', '[id*="overlay"]', '[id*="cookie"]', '[id*="consent"]'
  ];
  
  document.querySelectorAll(dialogSelectors.join(",")).forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    
    // Find dismiss buttons inside
    const dismissButtons = [];
    const dismissSelectors = ['button', '[role="button"]', 'a', '[aria-label*="close"]', '[aria-label*="dismiss"]'];
    el.querySelectorAll(dismissSelectors.join(",")).forEach(btn => {
      const btnText = (btn.innerText || btn.getAttribute("aria-label") || "").trim().substring(0, 50);
      if (btnText) dismissButtons.push(btnText);
    });
    
    const popupText = (el.innerText || "").substring(0, 200).trim();
    if (popupText.length > 5) {
      popups.push({
        type: el.getAttribute("role") || "overlay",
        text: popupText,
        dismissButtons: dismissButtons.slice(0, 5)
      });
    }
  });
  
  // Check for fixed/sticky positioned overlays covering the page
  const allFixed = document.querySelectorAll("*");
  for (const el of allFixed) {
    const style = window.getComputedStyle(el);
    if ((style.position === "fixed" || style.position === "sticky") && 
        style.zIndex && parseInt(style.zIndex) > 100 &&
        style.display !== "none" && style.visibility !== "hidden") {
      const rect = el.getBoundingClientRect();
      // Large overlay covering significant viewport area
      if (rect.width > window.innerWidth * 0.3 && rect.height > window.innerHeight * 0.15) {
        const existing = popups.find(p => p.text === (el.innerText || "").substring(0, 200).trim());
        if (!existing) {
          const dismissBtns = [];
          el.querySelectorAll('button, [role="button"], a').forEach(btn => {
            const t = (btn.innerText || btn.getAttribute("aria-label") || "").trim();
            if (t && t.length < 30) dismissBtns.push(t);
          });
          const txt = (el.innerText || "").substring(0, 200).trim();
          if (txt.length > 5) {
            popups.push({ type: "fixed-overlay", text: txt, dismissButtons: dismissBtns.slice(0, 5) });
          }
        }
      }
    }
    if (popups.length >= 5) break;
  }
  
  return popups;
}


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
