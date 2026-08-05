(function initBrainoElementMap(global) {
  "use strict";

  const INTERACTIVE_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "textarea",
    "select",
    "[role='button']",
    "[role='link']",
    "[role='textbox']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='combobox']",
    "[role='menuitem']",
    "[role='tab']",
    "[role='switch']",
    "[contenteditable='true']",
    "[onclick]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  const EDITABLE_SELECTOR = [
    "textarea",
    "input:not([type='hidden']):not([type='submit']):not([type='button'])",
    "[contenteditable='true']",
    "[role='textbox']",
  ].join(",");

  const MAX_NAME = 120;
  const MAX_VALUE = 160;
  const DEFAULT_ELEMENT_CAP = 120;

  let registry = new Map();

  function resetRegistry() {
    registry = new Map();
    global.__sbElementRegistry = registry;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function truncate(value, max) {
    const text = normalizeText(value);
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}...` : text;
  }

  function safeArray(value) {
    try { return Array.from(value || []); } catch (_) { return []; }
  }

  function getStyle(el) {
    try {
      const view = el.ownerDocument?.defaultView || global;
      return view.getComputedStyle(el);
    } catch (_) {
      return null;
    }
  }

  function getRect(el, offset) {
    try {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round((rect.x || rect.left || 0) + offset.x),
        y: Math.round((rect.y || rect.top || 0) + offset.y),
        w: Math.round(rect.width || Math.max(0, (rect.right || 0) - (rect.left || 0))),
        h: Math.round(rect.height || Math.max(0, (rect.bottom || 0) - (rect.top || 0))),
      };
    } catch (_) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const style = getStyle(el);
    if (!style) return false;
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    const clientRects = safeArray(el.getClientRects ? el.getClientRects() : []);
    if (!clientRects.length) return false;
    return clientRects.some((r) => r.width > 0 && r.height > 0);
  }

  function isInteractive(el) {
    if (!el?.matches) return false;
    try { return el.matches(INTERACTIVE_SELECTOR); } catch (_) { return false; }
  }

  function textFromLabelledBy(el) {
    const ids = String(el.getAttribute?.("aria-labelledby") || "").trim();
    if (!ids) return "";
    const doc = el.ownerDocument || global.document;
    return ids
      .split(/\s+/)
      .map((id) => normalizeText(doc.getElementById(id)?.innerText || doc.getElementById(id)?.textContent || ""))
      .filter(Boolean)
      .join(" ");
  }

  function textFromNativeLabel(el) {
    try {
      if (el.labels?.length) {
        return safeArray(el.labels).map((label) => label.innerText || label.textContent || "").join(" ");
      }
      const id = el.id;
      if (id) {
        const label = el.ownerDocument?.querySelector(`label[for="${String(id).replace(/"/g, '\\"')}"]`);
        if (label) return label.innerText || label.textContent || "";
      }
      const wrappingLabel = el.closest?.("label");
      if (wrappingLabel) return wrappingLabel.innerText || wrappingLabel.textContent || "";
    } catch (_) {}
    return "";
  }

  function getAccessibleName(el) {
    const pieces = [
      el.getAttribute?.("aria-label"),
      textFromLabelledBy(el),
      textFromNativeLabel(el),
      el.getAttribute?.("placeholder"),
      el.getAttribute?.("alt"),
      el.getAttribute?.("title"),
      el.getAttribute?.("data-tooltip"),
      el.value,
      el.innerText,
      el.textContent,
    ];
    return truncate(pieces.find((piece) => normalizeText(piece)) || "", MAX_NAME);
  }

  function inferRole(el) {
    const explicit = normalizeText(el.getAttribute?.("role"));
    if (explicit) return explicit.split(/\s+/)[0].toLowerCase();
    const tag = String(el.tagName || "").toLowerCase();
    const type = String(el.getAttribute?.("type") || "").toLowerCase();
    if (tag === "a" && el.getAttribute?.("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "textarea") return "textbox";
    if (tag === "select") return "combobox";
    if (tag === "input") {
      if (["button", "submit", "reset"].includes(type)) return "button";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "range") return "slider";
      return "textbox";
    }
    if (el.isContentEditable || el.getAttribute?.("contenteditable") === "true") return "textbox";
    return tag || "element";
  }

  function isEditable(el) {
    if (!el) return false;
    const tag = String(el.tagName || "").toLowerCase();
    if (tag === "textarea") return true;
    if (tag === "input") {
      const type = String(el.getAttribute("type") || "text").toLowerCase();
      return !["button", "submit", "reset", "checkbox", "radio", "hidden", "file", "image"].includes(type);
    }
    return el.isContentEditable || el.getAttribute?.("contenteditable") === "true" || el.getAttribute?.("role") === "textbox";
  }

  function isDisabled(el) {
    return Boolean(el?.disabled || el?.getAttribute?.("aria-disabled") === "true" || el?.getAttribute?.("disabled") != null);
  }

  function isInViewport(rect, viewport) {
    return rect.x + rect.w > 0 && rect.y + rect.h > 0 && rect.x < viewport.w && rect.y < viewport.h;
  }

  function getScroll(doc) {
    const root = doc?.scrollingElement || doc?.documentElement || {};
    const view = doc?.defaultView || global;
    const x = Math.max(0, Math.round(view.scrollX || root.scrollLeft || 0));
    const y = Math.max(0, Math.round(view.scrollY || root.scrollTop || 0));
    const maxX = Math.max(0, Math.round((root.scrollWidth || 0) - (view.innerWidth || root.clientWidth || 0)));
    const maxY = Math.max(0, Math.round((root.scrollHeight || 0) - (view.innerHeight || root.clientHeight || 0)));
    return { x, y, maxX, maxY, atTop: y <= 2, atBottom: y >= Math.max(0, maxY - 2) };
  }

  function collectRoots(root, out) {
    out.push(root);
    for (const el of safeArray(root.querySelectorAll ? root.querySelectorAll("*") : [])) {
      if (el.shadowRoot) collectRoots(el.shadowRoot, out);
    }
  }

  function collectDocument(doc, offset, elements, viewport, seenDocs) {
    if (!doc || seenDocs.has(doc)) return;
    seenDocs.add(doc);

    const roots = [];
    collectRoots(doc, roots);
    for (const root of roots) {
      for (const el of safeArray(root.querySelectorAll ? root.querySelectorAll(INTERACTIVE_SELECTOR) : [])) {
        if (!isInteractive(el) || !isVisible(el)) continue;
        const rect = getRect(el, offset);
        if (rect.w <= 0 || rect.h <= 0) continue;
        const node = {
          index: elements.length + 1,
          role: inferRole(el),
          name: getAccessibleName(el),
          tag: String(el.tagName || "").toLowerCase(),
          editable: isEditable(el),
          disabled: isDisabled(el),
          inViewport: isInViewport(rect, viewport),
          bbox: [rect.x, rect.y, rect.w, rect.h],
        };
        const inputType = el.getAttribute?.("type");
        if (inputType) node.inputType = String(inputType).toLowerCase();
        if (node.editable || String(el.tagName || "").toLowerCase() === "select") {
          node.value = truncate(el.value || el.innerText || el.textContent || "", MAX_VALUE);
        }
        // Cheap "section" hint (Change C) so duplicate-named controls can be disambiguated later.
        try {
          const sec = el.closest?.('[role="dialog"],dialog,[role="banner"],header,[role="navigation"],nav,[role="main"],main,aside,form');
          if (sec) {
            const stag = String(sec.tagName || "").toLowerCase();
            const srole = sec.getAttribute?.("role") || "";
            const hint =
              (srole === "dialog" || stag === "dialog") ? "dialog" :
              (srole === "banner" || stag === "header") ? "banner" :
              (srole === "navigation" || stag === "nav") ? "nav" :
              (srole === "main" || stag === "main") ? "main" :
              (stag === "form") ? "form" :
              (stag === "aside") ? "aside" : "";
            if (hint) node.section = hint;
          }
        } catch (_) {}
        elements.push(node);
        registry.set(node.index, el);
      }
    }

    for (const frame of safeArray(doc.querySelectorAll ? doc.querySelectorAll("iframe, frame") : [])) {
      if (!isVisible(frame)) continue;
      try {
        const frameDoc = frame.contentDocument;
        if (!frameDoc) continue;
        const frameRect = getRect(frame, offset);
        collectDocument(frameDoc, { x: frameRect.x, y: frameRect.y }, elements, viewport, seenDocs);
      } catch (_) {}
    }
  }

  function buildElementMap(doc) {
    const rootDoc = doc || global.document;
    if (!rootDoc) {
      resetRegistry();
      return { url: "", title: "", scroll: { x: 0, y: 0, maxX: 0, maxY: 0, atTop: true, atBottom: true }, elements: [] };
    }
    resetRegistry();
    const view = rootDoc.defaultView || global;
    const elements = [];
    const viewport = { w: view.innerWidth || 0, h: view.innerHeight || 0 };
    collectDocument(rootDoc, { x: 0, y: 0 }, elements, viewport, new Set());
    return {
      url: view.location?.href || rootDoc.location?.href || "",
      title: rootDoc.title || "",
      scroll: getScroll(rootDoc),
      elements,
    };
  }

  function resolveElement(index) {
    return registry.get(Number(index)) || null;
  }

  function formatScroll(scroll) {
    if (!scroll) return "unknown";
    if (scroll.atTop && scroll.atBottom) return "all";
    if (scroll.atTop) return "top";
    if (scroll.atBottom) return "bottom";
    return `${scroll.y}/${scroll.maxY}`;
  }

  function elementMatchesKeywords(el, keywords) {
    if (!keywords?.length) return false;
    const hay = `${el.role || ""} ${el.name || ""} ${el.tag || ""} ${el.value || ""}`.toLowerCase();
    return keywords.some((keyword) => keyword && hay.includes(keyword));
  }

  function serializeElementMap(map, options) {
    const cap = Math.max(10, Number(options?.cap || DEFAULT_ELEMENT_CAP));
    const keywords = normalizeText(options?.keywords || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3)
      .slice(0, 12);
    const all = safeArray(map?.elements);
    // Keyword match now outweighs mere viewport presence, so an intent-relevant control isn't beaten
    // by on-screen noise (Change A).
    const scoreOf = (el) => (elementMatchesKeywords(el, keywords) ? 4 : 0) + (el.inViewport ? 3 : 0) + (el.editable ? 1 : 0);

    let elements;
    if (all.length <= cap) {
      // Everything fits — keep all, ordered by index. Byte-identical to the previous behaviour.
      elements = all.slice().sort((a, b) => a.index - b.index);
    } else {
      // Tier 1 — ALWAYS keep editable controls + intent-matched controls, so the element the
      // task actually needs is never culled by the flat cap (even when it's offscreen). Keyword
      // matches that are LINKS/BUTTONS (result rows) are kept generously — on a dense results
      // page the real product link sits behind sponsored/nav that also match the query, and a
      // tight top-N dropped it (the "can't see the Atomic Habits result" loop).
      const keep = new Set();
      for (const el of all) if (el.editable) keep.add(el.index);
      const kwMatches = all.filter((el) => elementMatchesKeywords(el, keywords))
        .sort((a, b) => scoreOf(b) - scoreOf(a) || a.index - b.index);
      const kwLinks = kwMatches.filter((el) => el.role === "link" || el.role === "button");
      // keep up to 60 matched links/buttons, plus the top 24 of any other matched controls
      kwLinks.slice(0, 60).forEach((el) => keep.add(el.index));
      kwMatches.filter((el) => !(el.role === "link" || el.role === "button")).slice(0, 24).forEach((el) => keep.add(el.index));
      // Tier 2 — fill the remaining budget by score/viewport ordering.
      all.filter((el) => !keep.has(el.index))
        .sort((a, b) => scoreOf(b) - scoreOf(a) || a.index - b.index)
        .forEach((el) => { if (keep.size < cap) keep.add(el.index); });
      elements = all.filter((el) => keep.has(el.index)).sort((a, b) => a.index - b.index);
    }

    // Change C — disambiguate duplicate role+name controls by appending their section ("(dialog)").
    const labelKey = (el) => `${el.role || ""}|${normalizeText(el.name).toLowerCase()}`;
    const labelCounts = new Map();
    for (const el of elements) labelCounts.set(labelKey(el), (labelCounts.get(labelKey(el)) || 0) + 1);

    const lines = [
      `URL: ${map?.url || ""} | title: ${map?.title || ""} | scroll: ${formatScroll(map?.scroll)}`,
    ];
    for (const el of elements) {
      const dupSuffix = (el.section && labelCounts.get(labelKey(el)) > 1) ? ` (${el.section})` : "";
      const bits = [
        `[${el.index}]`,
        String(el.role || "element").padEnd(9, " "),
        `"${truncate(el.name || el.value || el.tag || "unnamed", 80)}"${dupSuffix}`,
      ];
      if (el.value != null && el.value !== "" && !String(el.name || "").includes(String(el.value))) {
        bits.push(`value="${truncate(el.value, 60)}"`);
      } else if (el.editable && !el.value) {
        bits.push("(empty)");
      }
      if (el.disabled) bits.push("(disabled)");
      if (!el.inViewport) bits.push("(offscreen)");
      lines.push(bits.join(" "));
    }
    if (all.length > elements.length) {
      lines.push(`... ${all.length - elements.length} more elements hidden by cap`);
    }
    return lines.join("\n");
  }

  function signature(el) {
    return [
      el?.role || "",
      normalizeText(el?.name).toLowerCase(),
      el?.tag || "",
      el?.inputType || "",
    ].join("|");
  }

  function diffElementMap(prev, next, options) {
    if (!prev) return serializeElementMap(next, options);
    const prevBySig = new Map(safeArray(prev.elements).map((el) => [signature(el), el]));
    const nextBySig = new Map(safeArray(next?.elements).map((el) => [signature(el), el]));
    const lines = [
      `URL: ${prev.url || ""} -> ${next?.url || ""}`,
      `scroll: ${formatScroll(prev.scroll)} -> ${formatScroll(next?.scroll)}`,
    ];
    for (const [sig, el] of nextBySig) {
      if (!prevBySig.has(sig)) lines.push(`+ [${el.index}] ${el.role} "${truncate(el.name || el.value || el.tag, 80)}"`);
    }
    for (const [sig, el] of prevBySig) {
      if (!nextBySig.has(sig)) lines.push(`- ${el.role} "${truncate(el.name || el.value || el.tag, 80)}"`);
    }
    for (const [sig, el] of nextBySig) {
      const before = prevBySig.get(sig);
      if (!before) continue;
      if ((before.value || "") !== (el.value || "")) {
        lines.push(`~ [${el.index}] ${el.role} "${truncate(el.name || el.tag, 80)}" value="${truncate(before.value || "", 40)}" -> "${truncate(el.value || "", 40)}"`);
      }
    }
    // Change B — anchor stable controls: when the loop passes the active task keywords, re-surface the
    // top intent-relevant UNCHANGED interactables so the model never "forgets" controls that are always
    // present (the canonical Gmail "Send" problem). Skipped when no keywords are passed → the 2-arg
    // call is byte-identical.
    const kw = normalizeText(options?.keywords || "").toLowerCase().split(/\s+/).filter((w) => w.length >= 3).slice(0, 12);
    if (kw.length) {
      const stable = [];
      for (const [sig, el] of nextBySig) {
        const before = prevBySig.get(sig);
        if (!before || (before.value || "") !== (el.value || "")) continue; // truly unchanged only
        if (elementMatchesKeywords(el, kw) || el.editable) stable.push(el);
      }
      const ranked = stable
        .map((el) => ({ el, s: (elementMatchesKeywords(el, kw) ? 4 : 0) + (el.editable ? 1 : 0) }))
        .sort((a, b) => b.s - a.s || a.el.index - b.el.index)
        .slice(0, 8)
        .map((x) => x.el);
      if (ranked.length) {
        lines.push("STILL AVAILABLE (unchanged):");
        for (const el of ranked) lines.push(`  [${el.index}] ${el.role} "${truncate(el.name || el.value || el.tag, 80)}"`);
      }
    }
    return lines.length <= 2 ? `${lines.join("\n")}\n(no element changes)` : lines.join("\n");
  }

  const api = {
    INTERACTIVE_SELECTOR,
    EDITABLE_SELECTOR,
    buildElementMap,
    diffElementMap,
    getAccessibleName,
    inferRole,
    isVisible,
    normalizeText,
    resolveElement,
    serializeElementMap,
  };

  global.BrainoElementMap = api;
  global.__sbElementRegistry = registry;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
