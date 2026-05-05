(function () {
  if (window.SideBrainBookmarklet && typeof window.SideBrainBookmarklet.toggle === "function") {
    window.SideBrainBookmarklet.toggle(true);
    return;
  }

  const ROOT_ID = "__sidebrain_bookmarklet_root";
  const STYLE_ID = "__sidebrain_bookmarklet_style";
  const FRAME_ID = "__sidebrain_bookmarklet_frame";
  const BUTTON_ID = "__sidebrain_bookmarklet_button";
  const PANEL_ID = "__sidebrain_bookmarklet_panel";
  const APP_ORIGIN = (() => {
    try {
      return new URL(document.currentScript && document.currentScript.src ? document.currentScript.src : window.location.origin).origin;
    } catch (_error) {
      return window.location.origin;
    }
  })();

  const state = {
    open: true,
    root: null,
    button: null,
    panel: null,
    frame: null,
    recognition: null,
    listening: false,
    speaking: null,
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
        font-family: "NeueHaasDisplay", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${BUTTON_ID} {
        all: unset;
        box-sizing: border-box;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px 10px 10px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(29, 24, 19, 0.96), rgba(63, 47, 31, 0.94));
        color: #fff8ef;
        box-shadow: 0 18px 50px rgba(30, 18, 8, 0.28);
        border: 1px solid rgba(255, 227, 192, 0.14);
        backdrop-filter: blur(16px);
      }

      #${BUTTON_ID}:hover {
        transform: translateY(-1px);
      }

      #${BUTTON_ID} .sb-orb {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: radial-gradient(circle at 35% 35%, #ffd8a3 0%, #ef9645 55%, #cf6a18 100%);
        box-shadow: 0 0 0 1px rgba(255, 222, 189, 0.2), 0 0 24px rgba(232, 124, 43, 0.34);
        flex-shrink: 0;
      }

      #${BUTTON_ID} .sb-copy {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }

      #${BUTTON_ID} .sb-title {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      #${BUTTON_ID} .sb-subtitle {
        font-size: 10px;
        color: rgba(255, 248, 239, 0.68);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #${PANEL_ID} {
        width: min(392px, calc(100vw - 24px));
        height: min(690px, calc(100vh - 92px));
        border-radius: 34px;
        overflow: hidden;
        box-shadow: 0 32px 90px rgba(36, 20, 6, 0.28);
        border: 1px solid rgba(106, 76, 38, 0.18);
        background: rgba(255, 250, 244, 0.72);
        backdrop-filter: blur(20px);
        transform-origin: bottom right;
        transition: opacity 180ms ease, transform 180ms ease, visibility 180ms ease;
      }

      #${PANEL_ID}.sb-closed {
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px) scale(0.985);
        pointer-events: none;
      }

      #${FRAME_ID} {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: transparent;
      }

      @media (max-width: 640px) {
        #${ROOT_ID} {
          right: 10px;
          left: 10px;
          bottom: 10px;
          align-items: stretch;
        }

        #${PANEL_ID} {
          width: 100%;
          height: min(76vh, 690px);
        }

        #${BUTTON_ID} {
          align-self: flex-end;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function createUi() {
    const root = document.createElement("div");
    root.id = ROOT_ID;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const iframe = document.createElement("iframe");
    iframe.id = FRAME_ID;
    iframe.src = `${APP_ORIGIN}/assistant-panel?embedded=1`;
    iframe.allow = "microphone; clipboard-read; clipboard-write";
    iframe.title = "SideBrain";
    panel.appendChild(iframe);

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.innerHTML = `
      <span class="sb-orb" aria-hidden="true"></span>
      <span class="sb-copy">
        <span class="sb-title">SideBrain</span>
        <span class="sb-subtitle">Bookmark assistant</span>
      </span>
    `;
    button.addEventListener("click", function () {
      setOpen(!state.open);
    });

    root.appendChild(panel);
    root.appendChild(button);

    state.root = root;
    state.panel = panel;
    state.frame = iframe;
    state.button = button;

    setOpen(true);
    (document.body || document.documentElement).appendChild(root);
  }

  function postToPanel(type, payload) {
    if (!state.frame || !state.frame.contentWindow) return;
    state.frame.contentWindow.postMessage(
      {
        source: "sidebrain-host",
        type: type,
        payload: payload || {},
      },
      APP_ORIGIN,
    );
  }

  function setOpen(nextOpen) {
    state.open = Boolean(nextOpen);
    if (!state.panel) return;
    state.panel.classList.toggle("sb-closed", !state.open);
  }

  function getStableSelector(el) {
    if (!el) return null;
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return "#" + el.id;

    const aria = el.getAttribute("aria-label");
    if (aria) {
      const selector = `${el.tagName.toLowerCase()}[aria-label="${aria.replace(/"/g, '\\"')}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) return selector;
      } catch (_error) {}
    }

    const name = el.getAttribute("name");
    if (name && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
      const selector = `${el.tagName.toLowerCase()}[name="${name.replace(/"/g, '\\"')}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) return selector;
      } catch (_error) {}
    }

    const attrs = ["data-testid", "data-id", "data-cy"];
    for (const attr of attrs) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const selector = `[${attr}="${value.replace(/"/g, '\\"')}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) return selector;
      } catch (_error) {}
    }

    return null;
  }

  function deepQuery(selector, root) {
    const scope = root || document;
    let found = null;
    try {
      found = scope.querySelector(selector);
    } catch (_error) {
      found = null;
    }
    if (found) return found;

    const nodes = scope.querySelectorAll ? scope.querySelectorAll("*") : [];
    for (const node of nodes) {
      if (node.shadowRoot) {
        found = deepQuery(selector, node.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  function isVisibleElement(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getElementLabel(el) {
    return (
      el.innerText ||
      el.value ||
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("title") ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120);
  }

  function collectInteractiveElements() {
    const selectors = [
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[role='tab']",
      "[role='menuitem']",
    ];
    const seen = new Set();
    const items = [];

    document.querySelectorAll(selectors.join(",")).forEach(function (el) {
      if (!isVisibleElement(el)) return;
      const text = getElementLabel(el);
      if (!text) return;
      const key = `${el.tagName.toLowerCase()}:${text}`;
      if (seen.has(key)) return;
      seen.add(key);

      const item = {
        tag: el.tagName.toLowerCase(),
        text: text,
      };
      const selector = getStableSelector(el);
      const href = el.getAttribute("href");
      const type = el.getAttribute("type");
      if (selector) item.selector = selector;
      if (href) item.href = href.slice(0, 160);
      if (type) item.type = type;
      items.push(item);
    });

    return items.slice(0, 60);
  }

  function getPageContext() {
    const bodyText = document.body && document.body.innerText ? document.body.innerText.slice(0, 7000) : "";
    const selectedText = window.getSelection ? String(window.getSelection() || "").trim().slice(0, 1200) : "";
    return {
      title: document.title || "",
      url: window.location.href || "",
      text: bodyText,
      selectedText: selectedText,
      interactiveEls: collectInteractiveElements(),
    };
  }

  function findByText(targetText, targetTag) {
    if (!targetText) return null;
    const needle = targetText.toLowerCase();
    const selectors = targetTag
      ? [targetTag, "[role='button']", "[role='link']"]
      : [
          "button",
          "a",
          "[role='button']",
          "[role='link']",
          "[role='tab']",
          "[role='menuitem']",
          "input[type='submit']",
          "input[type='button']",
          "label",
          "summary",
        ];

    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const found = candidates.find(function (candidate) {
        if (!isVisibleElement(candidate)) return false;
        return getElementLabel(candidate).toLowerCase().includes(needle);
      });
      if (found) return found;
    }

    return null;
  }

  function findEditableElement(selector, targetText) {
    if (selector) {
      const found = deepQuery(selector);
      if (found) return found;
    }

    if (targetText) {
      const hint = targetText.toLowerCase();
      const candidates = Array.from(document.querySelectorAll("input, textarea, [contenteditable='true']"));
      const match = candidates.find(function (candidate) {
        if (!isVisibleElement(candidate)) return false;
        const label = (
          candidate.getAttribute("aria-label") ||
          candidate.getAttribute("placeholder") ||
          candidate.getAttribute("name") ||
          ""
        ).toLowerCase();
        return label.includes(hint);
      });
      if (match) return match;
    }

    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.getAttribute("contenteditable") === "true" ||
        active.isContentEditable)
    ) {
      return active;
    }

    return document.querySelector(
      "[contenteditable='true'], textarea, input:not([type='hidden']):not([type='submit']):not([type='button'])",
    );
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
      return;
    }
    el.value = value;
  }

  function readElement(el) {
    if (!el) return "";
    if (el.tagName === "SELECT") {
      return Array.from(el.options)
        .map(function (option) {
          const marker = option.selected ? "*" : "-";
          return `${marker} ${option.textContent || option.value}`;
        })
        .join("\n");
    }
    return (
      el.innerText ||
      el.textContent ||
      el.value ||
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 3000);
  }

  async function executeAction(action) {
    if (!action || !action.type) return { error: "No action provided" };

    if (action.type === "navigate") {
      const url = String(action.url || "").trim();
      if (!url) return { error: "No URL provided" };
      window.setTimeout(function () {
        window.location.href = url;
      }, 60);
      return { success: true, navigating: true, url: url };
    }

    if (action.type === "scroll") {
      const direction = action.direction === "up" ? -1 : 1;
      const amount = Number(action.amount || 500);
      window.scrollBy({ top: direction * amount, behavior: "smooth" });
      return { success: true };
    }

    if (action.type === "wait") {
      await new Promise(function (resolve) {
        window.setTimeout(resolve, Number(action.ms || 400));
      });
      return { success: true };
    }

    if (action.type === "click") {
      let target = null;
      if (action.selector) target = deepQuery(action.selector);
      if (!target && action.targetText) target = findByText(action.targetText, action.targetTag);
      if (!target) return { error: `Element not found: ${action.targetText || action.selector || "unknown target"}` };

      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      await new Promise(function (resolve) {
        window.setTimeout(resolve, 120);
      });
      target.click();
      return { success: true };
    }

    if (action.type === "read") {
      let target = null;
      if (action.selector) target = deepQuery(action.selector);
      if (!target && action.targetText) target = findByText(action.targetText, action.targetTag);
      if (!target) return { error: `Nothing matched ${action.targetText || action.selector || "that request"}` };
      return { success: true, text: readElement(target) };
    }

    if (action.type === "type") {
      const target = findEditableElement(action.selector, action.targetText);
      if (!target) return { error: "No editable field found" };

      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      target.focus();
      target.click();
      await new Promise(function (resolve) {
        window.setTimeout(resolve, 80);
      });

      const text = String(action.text || "");
      if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
        document.execCommand("insertText", false, text);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return { success: true };
      }

      setNativeValue(target, "");
      target.dispatchEvent(new Event("input", { bubbles: true }));
      setNativeValue(target, text);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return { success: true };
    }

    if (action.type === "pressKey") {
      const key = String(action.key || "Enter");
      const target = document.activeElement || document.body;
      const keyCode = key === "Enter" ? 13 : key === "Tab" ? 9 : key.charCodeAt(0);

      target.dispatchEvent(new KeyboardEvent("keydown", { key: key, keyCode: keyCode, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keypress", { key: key, keyCode: keyCode, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: key, keyCode: keyCode, bubbles: true, cancelable: true }));

      if (key === "Enter" && target.closest) {
        const form = target.closest("form");
        if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }

      return { success: true };
    }

    if (action.type === "selectOption") {
      const target = action.selector ? deepQuery(action.selector) : null;
      if (!target || target.tagName !== "SELECT") return { error: "Dropdown not found" };

      const value = String(action.value || "").toLowerCase();
      const option = Array.from(target.options).find(function (item) {
        return (item.textContent || item.value || "").trim().toLowerCase() === value;
      });
      if (!option) return { error: `Option not found: ${action.value}` };

      target.value = option.value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return { success: true };
    }

    return { error: `Unsupported action type: ${action.type}` };
  }

  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function emitVoiceStatus(errorMessage) {
    postToPanel("sidebrain:voice-status", {
      listening: state.listening,
      supported: Boolean(getSpeechRecognition()),
      error: errorMessage || "",
    });
  }

  function stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    state.speaking = null;
  }

  function speakText(text) {
    stopSpeaking();
    if (!window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.rate = 1;
    utterance.pitch = 1;
    state.speaking = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopVoice() {
    if (state.recognition) {
      state.recognition.onend = null;
      try {
        state.recognition.stop();
      } catch (_error) {}
      state.recognition = null;
    }
    state.listening = false;
    emitVoiceStatus();
  }

  function startVoice() {
    stopSpeaking();
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      emitVoiceStatus("Speech recognition is not available in this browser.");
      return;
    }

    stopVoice();
    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = function () {
      state.listening = true;
      emitVoiceStatus();
    };

    recognition.onresult = function (event) {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0] ? result[0].transcript : "";
        if (!text) continue;
        postToPanel("sidebrain:voice-transcript", {
          text: text,
          isFinal: result.isFinal,
        });
      }
    };

    recognition.onerror = function (event) {
      state.listening = false;
      emitVoiceStatus(event.error || "Voice input failed.");
    };

    recognition.onend = function () {
      state.listening = false;
      emitVoiceStatus();
    };

    state.recognition = recognition;
    recognition.start();
  }

  function handlePanelMessage(event) {
    const data = event.data;
    if (event.origin !== APP_ORIGIN || !data || data.source !== "sidebrain-panel") return;

    if (data.type === "sidebrain:panel-ready") {
      postToPanel("sidebrain:context-updated", { pageContext: getPageContext() });
      emitVoiceStatus();
      return;
    }

    if (data.type === "sidebrain:request-page-context") {
      postToPanel("sidebrain:context-updated", {
        requestId: data.payload && data.payload.requestId ? data.payload.requestId : null,
        pageContext: getPageContext(),
      });
      return;
    }

    if (data.type === "sidebrain:run-action") {
      Promise.resolve(executeAction(data.payload ? data.payload.action : null)).then(function (result) {
        postToPanel("sidebrain:action-result", {
          requestId: data.payload && data.payload.requestId ? data.payload.requestId : null,
          result: result,
        });
      });
      return;
    }

    if (data.type === "sidebrain:start-voice") {
      startVoice();
      return;
    }

    if (data.type === "sidebrain:stop-voice") {
      stopVoice();
      return;
    }

    if (data.type === "sidebrain:speak") {
      speakText(data.payload ? data.payload.text : "");
      return;
    }

    if (data.type === "sidebrain:stop-speaking") {
      stopSpeaking();
    }
  }

  injectStyles();
  createUi();
  window.addEventListener("message", handlePanelMessage);

  window.SideBrainBookmarklet = {
    toggle: function (forceOpen) {
      if (typeof forceOpen === "boolean") {
        setOpen(forceOpen);
        return;
      }
      setOpen(!state.open);
    },
    open: function () {
      setOpen(true);
    },
    close: function () {
      setOpen(false);
    },
    destroy: function () {
      stopVoice();
      stopSpeaking();
      window.removeEventListener("message", handlePanelMessage);
      if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
      const style = document.getElementById(STYLE_ID);
      if (style && style.parentNode) style.parentNode.removeChild(style);
      delete window.SideBrainBookmarklet;
    },
  };
})();
