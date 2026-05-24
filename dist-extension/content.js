if (globalThis.__SB_CONTENT_SCRIPT_BOOTSTRAP__ !== `${chrome.runtime?.id || "no-runtime"}:${chrome.runtime?.getManifest?.().version || "0"}`) {
  globalThis.__SB_CONTENT_SCRIPT_BOOTSTRAP__ = `${chrome.runtime?.id || "no-runtime"}:${chrome.runtime?.getManifest?.().version || "0"}`;

  (() => {
// Braino Content Script — extracts page text for AI context

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
      __sbSendPageVoiceEvent("listening", { source: currentSource });
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

function __sbAdapterNormalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function __sbAdapterTextEquals(a, b) {
  return __sbAdapterNormalizeText(a) === __sbAdapterNormalizeText(b);
}

function __sbAdapterTextIncludes(haystack, needle) {
  const left = __sbAdapterNormalizeText(haystack);
  const right = __sbAdapterNormalizeText(needle);
  return !!left && !!right && left.includes(right);
}

function __sbAdapterWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function __sbAdapterIsVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function __sbAdapterClick(el) {
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
  } catch(e) {}
  try { el.focus?.(); } catch(e) {}
  try { el.click(); } catch(e) {}
}

function __sbAdapterDeepQueryAll(selector, root) {
  const results = [];
  const seen = new Set();

  function visit(node) {
    if (!node?.querySelectorAll) return;
    let found = [];
    try { found = Array.from(node.querySelectorAll(selector)); } catch(e) { found = []; }
    for (const el of found) {
      if (!seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    }

    let descendants = [];
    try { descendants = Array.from(node.querySelectorAll("*")); } catch(e) { descendants = []; }
    for (const el of descendants) {
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  }

  visit(root || document);
  return results;
}

function __sbAdapterFindTextTarget(text, selector) {
  const candidates = __sbAdapterDeepQueryAll(selector || "button, a, [role='button'], [role='menuitem'], [role='option'], div, span");
  const exact = candidates.find((el) => __sbAdapterIsVisible(el) && __sbAdapterTextEquals(el.innerText || el.textContent || "", text));
  if (exact) return exact.closest("button, a, [role='button'], [role='menuitem'], [role='option']") || exact;

  const fuzzy = candidates.find((el) => __sbAdapterIsVisible(el) && __sbAdapterTextIncludes(el.innerText || el.textContent || "", text));
  if (fuzzy) return fuzzy.closest("button, a, [role='button'], [role='menuitem'], [role='option']") || fuzzy;
  return null;
}

function __sbAdapterGetScrollContainer() {
  return document.querySelector("main") ||
    document.querySelector("[data-overlayscrollbars-viewport]") ||
    document.scrollingElement ||
    document.documentElement ||
    document.body;
}

function __sbSpotifyGetPlaylistLinks() {
  const links = __sbAdapterDeepQueryAll('a[href*="/playlist/"]')
    .filter((el) => __sbAdapterIsVisible(el))
    .map((el) => ({
      el,
      href: el.getAttribute("href") || "",
      text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((entry) => entry.text);

  const seen = new Set();
  return links.filter((entry) => {
    const key = `${entry.href}::${__sbAdapterNormalizeText(entry.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function __sbSpotifyGetCurrentPlaylistName() {
  const h1 = __sbAdapterDeepQueryAll("h1").find((el) => __sbAdapterIsVisible(el) && __sbAdapterNormalizeText(el.innerText || el.textContent));
  if (h1) return (h1.innerText || h1.textContent || "").replace(/\s+/g, " ").trim();

  const fromTitle = document.title.replace(/\s*[-|].*$/, "").trim();
  return fromTitle;
}

function __sbSpotifyGetVisibleTrackEntries() {
  const entries = [];
  const seen = new Set();

  const addEntry = (row, anchor, titleSource) => {
    if (!row) return;

    const title = String(titleSource || "").replace(/\s+/g, " ").trim();
    const rowText = String(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim();
    const normalizedTitle = __sbAdapterNormalizeText(title);
    const normalizedRow = __sbAdapterNormalizeText(rowText);
    if (!normalizedTitle && !normalizedRow) return;

    const key = `${normalizedTitle}::${normalizedRow.slice(0, 160)}`;
    if (seen.has(key)) return;
    seen.add(key);

    entries.push({
      row,
      anchor: anchor || row.querySelector('a[href*="/track/"]') || row,
      title: title || rowText,
      rowText,
    });
  };

  const rows = __sbAdapterDeepQueryAll('[data-testid="tracklist-row"], [role="row"]')
    .filter((row) => __sbAdapterIsVisible(row));

  for (const row of rows) {
    const anchor =
      row.querySelector('a[href*="/track/"]') ||
      row.querySelector('[data-testid="internal-track-link"]') ||
      row.querySelector('[aria-colindex="2"] a') ||
      row.querySelector('[aria-colindex="2"] span');

    const title =
      anchor?.innerText ||
      anchor?.textContent ||
      row.querySelector('[data-testid="entityTitle"]')?.innerText ||
      row.querySelector('[data-testid="entityTitle"]')?.textContent ||
      row.querySelector('img[alt]')?.getAttribute("alt") ||
      "";

    addEntry(row, anchor, title);
  }

  const anchors = __sbAdapterDeepQueryAll('a[href*="/track/"]')
    .filter((el) => __sbAdapterIsVisible(el));

  for (const anchor of anchors) {
    const row =
      anchor.closest('[data-testid="tracklist-row"]') ||
      anchor.closest('[role="row"]') ||
      anchor.closest("div");
    addEntry(row, anchor, anchor.innerText || anchor.textContent || "");
  }

  return entries;
}

async function __sbSpotifyOpenPlaylistByName(playlistName) {
  const scrollEl = __sbAdapterGetScrollContainer();
  const seenTexts = new Set();

  for (let attempt = 0; attempt < 14; attempt++) {
    const links = __sbSpotifyGetPlaylistLinks();
    for (const link of links) seenTexts.add(link.text);

    const exact = links.find((entry) => __sbAdapterTextEquals(entry.text, playlistName));
    if (exact) {
      __sbAdapterClick(exact.el);
      return { success: true, playlist: exact.text };
    }

    const before = scrollEl.scrollTop;
    scrollEl.scrollBy({ top: Math.max(scrollEl.clientHeight * 0.8, 420), behavior: "auto" });
    await __sbAdapterWait(220);
    if (Math.abs(scrollEl.scrollTop - before) < 8) break;
  }

  const suggestions = Array.from(seenTexts).slice(0, 8);
  return {
    error: suggestions.length
      ? `Playlist "${playlistName}" was not found exactly. Visible playlists: ${suggestions.join(", ")}`
      : `Playlist "${playlistName}" was not found on this page.`,
  };
}

async function __sbSpotifyPlayTrackFromCurrentPlaylist(songName) {
  const scrollEl = __sbAdapterGetScrollContainer();

  for (let attempt = 0; attempt < 20; attempt++) {
    const entries = __sbSpotifyGetVisibleTrackEntries();
    const exact =
      entries.find((entry) => __sbAdapterTextEquals(entry.title, songName)) ||
      entries.find((entry) => __sbAdapterTextIncludes(entry.rowText, songName));
    if (exact) {
      const playButton =
        exact.row.querySelector('button[aria-label*="Play"]') ||
        exact.row.querySelector('[data-testid="play-button"]') ||
        exact.row.querySelector('button[aria-label*="play"]');

      if (playButton) __sbAdapterClick(playButton);
      else __sbAdapterClick(exact.anchor);
      return { success: true, track: exact.title };
    }

    const before = scrollEl.scrollTop;
    scrollEl.scrollBy({ top: Math.max(scrollEl.clientHeight * 0.75, 360), behavior: "auto" });
    await __sbAdapterWait(180);
    if (Math.abs(scrollEl.scrollTop - before) < 8) break;
  }

  return { error: `Track "${songName}" was not found in the open playlist.` };
}

async function __sbSpotifyAddTrackToPlaylist(songName, playlistName) {
  const scrollEl = __sbAdapterGetScrollContainer();

  for (let attempt = 0; attempt < 10; attempt++) {
    const entries = __sbSpotifyGetVisibleTrackEntries();
    const target =
      entries.find((entry) => __sbAdapterTextEquals(entry.title, songName)) ||
      entries.find((entry) => __sbAdapterTextIncludes(entry.title, songName)) ||
      entries.find((entry) => __sbAdapterTextIncludes(entry.rowText, songName));

    if (target) {
      const moreButton =
        target.row.querySelector('button[aria-label*="More"]') ||
        target.row.querySelector('button[aria-label*="more"]') ||
        target.row.querySelector('[data-testid="more-button"]');

      if (!moreButton) {
        return { error: `Found "${target.title}" but could not find its more-actions button.` };
      }

      __sbAdapterClick(moreButton);
      await __sbAdapterWait(220);

      const addMenuItem = __sbAdapterFindTextTarget("Add to playlist", "button, [role='menuitem'], [role='button'], span, div");
      if (!addMenuItem) {
        return { error: 'The "Add to playlist" menu item did not appear.' };
      }
      __sbAdapterClick(addMenuItem);
      await __sbAdapterWait(260);

      const playlistTarget = __sbAdapterFindTextTarget(playlistName, "button, [role='menuitemcheckbox'], [role='option'], [role='button'], span, div, a");
      if (!playlistTarget || !__sbAdapterTextEquals(playlistTarget.innerText || playlistTarget.textContent || "", playlistName)) {
        return { error: `Playlist "${playlistName}" was not found exactly in the add-to-playlist dialog.` };
      }

      __sbAdapterClick(playlistTarget);
      await __sbAdapterWait(220);
      return { success: true, track: target.title, playlist: playlistName };
    }

    const before = scrollEl.scrollTop;
    scrollEl.scrollBy({ top: Math.max(scrollEl.clientHeight * 0.8, 420), behavior: "auto" });
    await __sbAdapterWait(180);
    if (Math.abs(scrollEl.scrollTop - before) < 8) break;
  }

  return { error: `Track "${songName}" was not found in the current Spotify view.` };
}

function __sbGoogleDocsGetEditorSurface() {
  const selectors = [
    'div[aria-label="Document content"]',
    'div[aria-label*="Document content"]',
    ".kix-appview-editor",
    ".kix-appview-editor-container",
    ".kix-page",
    '[role="textbox"][contenteditable="true"]',
  ];

  for (const selector of selectors) {
    const candidate = __sbAdapterDeepQueryAll(selector).find((el) => __sbAdapterIsVisible(el));
    if (candidate) return candidate;
  }
  return null;
}

function __sbGoogleDocsGetTitleTarget() {
  const selectors = [
    "#docs-title-input",
    "input.docs-title-input",
    'input[aria-label*="Document name"]',
    'input[aria-label*="Rename"]',
    'input[aria-label*="Title"]',
  ];

  for (const selector of selectors) {
    const target = __sbAdapterDeepQueryAll(selector).find((el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
      return __sbAdapterIsVisible(el) || document.activeElement === el;
    });
    if (target) return target;
  }
  return null;
}

function __sbGoogleDocsGetBodyTarget() {
  const selectors = [
    'div[aria-label="Document content"]',
    'div[aria-label*="Document content"]',
    '[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"]',
  ];

  for (const selector of selectors) {
    const target = __sbAdapterDeepQueryAll(selector).find((el) => {
      if (!el) return false;
      if (!(__sbAdapterIsVisible(el) || document.activeElement === el)) return false;
      const label = __sbAdapterNormalizeText(el.getAttribute?.("aria-label") || "");
      return !/title|document name|rename/.test(label);
    });
    if (target) return target;
  }

  return null;
}

function __sbGoogleDocsSetTitleValue(titleTarget, value) {
  if (!titleTarget) return;
  try {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(titleTarget, value);
    else titleTarget.value = value;
    titleTarget.dispatchEvent(new Event("input", { bubbles: true }));
    titleTarget.dispatchEvent(new Event("change", { bubbles: true }));
  } catch(e) {}
}

function __sbGoogleDocsValueContainsBody(titleTarget, bodySnippet) {
  if (!titleTarget || !bodySnippet) return false;
  const titleValue = __sbAdapterNormalizeText(titleTarget.value || titleTarget.textContent || "");
  return !!titleValue && titleValue.includes(bodySnippet);
}

async function __sbGoogleDocsFocusBodySurface(surface) {
  const titleTarget = __sbGoogleDocsGetTitleTarget();
  if (titleTarget && document.activeElement === titleTarget) {
    try { titleTarget.blur(); } catch(e) {}
  }

  const clickTarget =
    surface.querySelector(".kix-page") ||
    surface.querySelector(".kix-page-content-wrapper") ||
    surface.querySelector(".kix-appview-editor") ||
    surface;

  const rect = clickTarget.getBoundingClientRect();
  const clientX = Math.max(rect.left + Math.min(rect.width * 0.18, 120), rect.left + 24);
  const clientY = Math.max(rect.top + Math.min(rect.height * 0.16, 90), rect.top + 24);

  for (const type of ["mousedown", "mouseup", "click"]) {
    try {
      clickTarget.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
      }));
    } catch(e) {}
  }

  try { clickTarget.focus?.(); } catch(e) {}
  await __sbAdapterWait(200);

  const bodyTarget = __sbGoogleDocsGetBodyTarget();
  if (bodyTarget) {
    try { bodyTarget.focus(); } catch(e) {}
  }

  await __sbAdapterWait(150);
  const active = document.activeElement;
  return !(titleTarget && active === titleTarget);
}

function __sbGoogleDocsPlaceCaretAtStart(target) {
  if (!target) return;
  try {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch(e) {}
}

async function __sbGoogleDocsInsertBodyPayload(target, payload) {
  if (!target || !payload) return false;

  try { target.focus?.(); } catch(e) {}
  await __sbAdapterWait(80);
  __sbGoogleDocsPlaceCaretAtStart(target);
  await __sbAdapterWait(40);

  let inserted = false;
  const paragraphs = String(payload).split("\n");

  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];

    if (paragraph) {
      try {
        target.dispatchEvent(new InputEvent("beforeinput", {
          inputType: "insertText",
          data: paragraph,
          bubbles: true,
          cancelable: true,
        }));
      } catch(e) {}

      let typed = false;
      try {
        typed = document.execCommand("insertText", false, paragraph);
      } catch(e) {}

      if (!typed) {
        try {
          target.textContent = `${target.textContent || ""}${paragraph}`;
          typed = true;
        } catch(e) {}
      }

      inserted = inserted || typed;

      try {
        target.dispatchEvent(new InputEvent("input", {
          inputType: "insertText",
          data: paragraph,
          bubbles: true,
        }));
      } catch(e) {
        try { target.dispatchEvent(new Event("input", { bubbles: true })); } catch(_) {}
      }
    }

    if (index < paragraphs.length - 1) {
      let brokeLine = false;
      try { brokeLine = document.execCommand("insertParagraph", false, null); } catch(e) {}
      if (!brokeLine) {
        try { brokeLine = document.execCommand("insertLineBreak", false, null); } catch(e) {}
      }
      if (!brokeLine) {
        try { brokeLine = document.execCommand("insertText", false, "\n"); } catch(e) {}
      }
      inserted = inserted || brokeLine;
    }

    await __sbAdapterWait(16);
  }

  await __sbAdapterWait(220);
  return inserted;
}

async function __sbGoogleDocsWriteArticle(title, body) {
  const cleanTitle = String(title || "").trim();
  const cleanBody = String(body || "").trim();
  if (!cleanBody) return { error: "No article content to write." };

  const surface = __sbGoogleDocsGetEditorSurface();
  if (!surface) return { error: "Google Docs editor surface was not found." };

  const titleTarget = __sbGoogleDocsGetTitleTarget();
  const originalTitleValue = String(titleTarget?.value || titleTarget?.textContent || "");
  if (titleTarget && cleanTitle) {
    __sbGoogleDocsSetTitleValue(titleTarget, cleanTitle);
    await __sbAdapterWait(120);
  }

  const focusedBody = await __sbGoogleDocsFocusBodySurface(surface);
  if (!focusedBody) {
    return { error: "Google Docs stayed focused on the title field instead of the document body." };
  }

  const target = __sbGoogleDocsGetBodyTarget();
  const bodyPayload = cleanTitle ? `${cleanTitle}\n\n${cleanBody}` : cleanBody;
  const bodySnippet = __sbAdapterNormalizeText(cleanBody.slice(0, 80));
  const titleSnippet = __sbAdapterNormalizeText(cleanTitle.slice(0, 40));

  if (target) {
    try { target.focus(); } catch(e) {}
  }

  const inserted = await __sbGoogleDocsInsertBodyPayload(target, bodyPayload);

  const bodyText = __sbAdapterNormalizeText(surface.innerText || surface.textContent || "");
  if (__sbGoogleDocsValueContainsBody(titleTarget, bodySnippet)) {
    if (titleTarget) {
      __sbGoogleDocsSetTitleValue(titleTarget, cleanTitle || originalTitleValue);
      await __sbAdapterWait(80);
    }
    return { error: "The article text was inserted into the Google Doc title field instead of the body." };
  }

  const looksInserted =
    (bodySnippet && bodyText.includes(bodySnippet)) ||
    (titleSnippet && bodyText.includes(titleSnippet));

  if (!inserted && !looksInserted) {
    return { error: "The article text could not be inserted into the Google Doc body." };
  }

  return { success: true, chars: bodyPayload.length };
}

function __sbGetSiteAdapterContext() {
  const url = window.location.href;
  const host = window.location.hostname;

  if (/spotify\.com$/.test(host)) {
    return {
      site: "spotify",
      url,
      title: document.title,
      currentPlaylistName: __sbSpotifyGetCurrentPlaylistName(),
      visiblePlaylists: __sbSpotifyGetPlaylistLinks().slice(0, 20).map((entry) => entry.text),
      visibleTracks: __sbSpotifyGetVisibleTrackEntries().slice(0, 15).map((entry) => entry.title),
    };
  }

  if (/docs\.google\.com$/.test(host) && /\/document\//.test(url)) {
    return {
      site: "google-docs",
      url,
      title: document.title,
      hasEditorSurface: Boolean(__sbGoogleDocsGetEditorSurface()),
      hasInputTarget: Boolean(__sbGoogleDocsGetBodyTarget()),
    };
  }

  return { site: "generic", url, title: document.title };
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

  if (msg.action === "getSiteAdapterContext") {
    sendResponse(__sbGetSiteAdapterContext());
    return true;
  }

  if (msg.action === "siteAdapterAction") {
    (async () => {
      try {
        if (msg.type === "spotifyOpenPlaylist") {
          sendResponse(await __sbSpotifyOpenPlaylistByName(msg.playlistName || ""));
          return;
        }
        if (msg.type === "spotifyPlayTrackFromCurrentPlaylist") {
          sendResponse(await __sbSpotifyPlayTrackFromCurrentPlaylist(msg.songName || ""));
          return;
        }
        if (msg.type === "spotifyAddTrackToPlaylist") {
          sendResponse(await __sbSpotifyAddTrackToPlaylist(msg.songName || "", msg.playlistName || ""));
          return;
        }
        if (msg.type === "googleDocsWriteArticle") {
          sendResponse(await __sbGoogleDocsWriteArticle(msg.title || "", msg.body || ""));
          return;
        }
        sendResponse({ error: `Unknown site adapter action: ${msg.type}` });
      } catch (e) {
        sendResponse({ error: e.message || "Site adapter action failed." });
      }
    })();
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
// Use a DOM-based ownership marker because this script is also injected on-demand.
// That lets us keep a single live controller for the shared inline UI.
const __SB_INLINE_OWNER_MARKER_ID = "__sb_inline_owner__";
const __SB_INLINE_OWNER_PING_EVENT = "__sb-inline-owner-ping__";
const __SB_INLINE_OWNER_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function __sbCreateInlineOwnerMarker(ownerId) {
  const marker = document.createElement("meta");
  marker.id = __SB_INLINE_OWNER_MARKER_ID;
  marker.dataset.runtimeId = chrome?.runtime?.id || "";
  marker.dataset.ownerId = ownerId;
  marker.dataset.lastSeenAt = String(Date.now());
  (document.head || document.documentElement || document.body)?.appendChild(marker);
  return marker;
}

function __sbTryClaimInlineOwner(ownerId) {
  const runtimeId = chrome?.runtime?.id || "";
  if (!runtimeId) return false;

  const existing = document.getElementById(__SB_INLINE_OWNER_MARKER_ID);
  if (!existing) {
    __sbCreateInlineOwnerMarker(ownerId);
    return true;
  }

  if (existing.dataset.runtimeId !== runtimeId) {
    existing.remove();
    __sbCreateInlineOwnerMarker(ownerId);
    return true;
  }

  const pingToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  existing.dataset.pongToken = "";
  window.dispatchEvent(new CustomEvent(__SB_INLINE_OWNER_PING_EVENT, { detail: { pingToken } }));
  if (existing.dataset.pongToken === pingToken) {
    return false;
  }

  existing.remove();
  __sbCreateInlineOwnerMarker(ownerId);
  return true;
}

if (!__sbTryClaimInlineOwner(__SB_INLINE_OWNER_ID)) { /* inline UI already wired */ } else {
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

function __sbOwnsInlineUi() {
  const marker = document.getElementById(__SB_INLINE_OWNER_MARKER_ID);
  return !!marker && marker.dataset.ownerId === __SB_INLINE_OWNER_ID;
}

function __sbRefreshInlineOwner() {
  const marker = document.getElementById(__SB_INLINE_OWNER_MARKER_ID);
  if (!marker || marker.dataset.ownerId !== __SB_INLINE_OWNER_ID) return;
  marker.dataset.lastSeenAt = String(Date.now());
}

window.addEventListener(__SB_INLINE_OWNER_PING_EVENT, (event) => {
  if (!__sbOwnsInlineUi()) return;
  const pingToken = event.detail?.pingToken;
  const marker = document.getElementById(__SB_INLINE_OWNER_MARKER_ID);
  if (!marker || !pingToken) return;
  marker.dataset.pongToken = pingToken;
  __sbRefreshInlineOwner();
});

window.addEventListener("pagehide", () => {
  const marker = document.getElementById(__SB_INLINE_OWNER_MARKER_ID);
  if (marker?.dataset.ownerId === __SB_INLINE_OWNER_ID) {
    marker.remove();
  }
}, { once: true });

__sbRefreshInlineOwner();

// Re-inject brain UI if SPA navigation (Pinterest, YouTube, etc.) removes the root
new MutationObserver(() => {
  if (!document.getElementById("__sb_root__") && __sbBrainVisible && __sbOwnsInlineUi()) {
    __sbBuildBrainUI();
  }
}).observe(document.body || document.documentElement, { childList: true, subtree: false });

const __SB_BRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="52" height="52"><defs><linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbb-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/><path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#sbb-dark)"/><path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#sbb-dark)"/><path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-fill)"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="6" cy="63" r="5.5" fill="url(#sbb-fill)"/><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="94" cy="63" r="5.5" fill="url(#sbb-fill)"/><circle cx="38" cy="48" r="6.5" fill="white"/><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/><circle cx="62" cy="48" r="6.5" fill="white"/><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/></svg>`;


const __SB_BRAIN_SVG_ORBIT = __SB_BRAIN_SVG.replace('width="52" height="52"', 'width="40" height="40"');

let __sbBrainVisible = false;
let __sbInputOpen = false;
let __sbIsRecording = false;
let __sbVoiceOnlyMode = false;
let __sbChatHistory = [];
let __sbVoicePendingReply = false;
let __sbIsSpeaking = false;
let __sbCurrentSpeechAudio = null;
let __sbCurrentSpeechUrl = null;
let __sbCurrentUtterance = null;
let __sbIsLectureRecording = false;
let __sbLectureNotes = "";
let __sbLectureInterval = null;

// Extension icon click builds brain (first time) and toggles input
if (__sbContextOk()) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!__sbOwnsInlineUi()) return;
    __sbRefreshInlineOwner();
    if (msg.action === "toggleSideBrainPanel") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbToggleBrain();
      sendResponse({ ok: true });
    }
    if (msg.action === "sbAgentUpdate") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      if (msg.final) {
        __sbShowBubble(msg.text, false, { rich: true, kicker: "Braino" });
        __sbSetStopBtn(false);
      } else {
        __sbShowBubble(msg.text, false, { tone: "status" });
        __sbSetStopBtn(true);
      }
    }
    if (msg.action === "sbRecordingUpdate") __sbHandleRecordingUpdate(msg);
    if (msg.action === "sbVoiceEvent") __sbHandleVoiceEvent(msg);
  });
}

function __sbBuildBrainUI() {
  if (!__sbOwnsInlineUi()) return;
  if (document.getElementById("__sb_root__")) return;

  const style = document.createElement("style");
  style.id = "__sb_styles__";
  style.textContent = `
    #__sb_root__ {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
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
      display: flex; flex-direction: column;
      background: rgba(255, 251, 247, 0.96); border-radius: 20px;
      padding: 12px 10px 10px 14px;
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
    #__sb_pill_top__ {
      display: flex; align-items: flex-end; gap: 8px;
    }
    #__sb_pill_bottom__ {
      display: flex; align-items: center; gap: 6px;
      margin-top: 9px; padding-top: 8px;
      border-top: 1px solid rgba(65,48,40,0.07);
    }
    #__sb_input__ {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #1B1713; min-width: 0; padding: 0;
      resize: none; line-height: 1.5; max-height: 120px; overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_input__::placeholder { color: #A79B92; }
    #__sb_send_btn__ {
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: #E8786E; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    #__sb_send_btn__:hover { background: #C9544A; }
    .sb-pill-dropdown-btn {
      display: inline-flex; align-items: center; gap: 4px;
      border: none; background: rgba(65,48,40,0.07); border-radius: 8px;
      padding: 4px 8px 4px 9px; cursor: pointer; transition: background 0.15s;
      font-size: 11px; font-weight: 600; color: #6B5248; white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sb-pill-dropdown-btn:hover { background: rgba(65,48,40,0.12); }
    .sb-pill-dropdown-btn.active-mode { color: #C9544A; background: rgba(201,84,74,0.1); }
    .sb-pill-dropdown-btn svg { flex-shrink: 0; opacity: 0.5; }
    .sb-pill-spacer { flex: 1; }
    #__sb_rec_btn__ {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: transparent; font-size: 15px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    #__sb_rec_btn__:hover { background: rgba(65,48,40,0.08); }
    #__sb_rec_btn__.active { background: #fee2e2; }
    #__sb_voice_mode_btn__ {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: transparent; cursor: pointer; color: #6B5248;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s, color 0.15s; padding: 0;
    }
    #__sb_voice_mode_btn__:hover { background: rgba(65,48,40,0.08); }
    #__sb_voice_mode_btn__.active { background: #fee2e2; color: #C9544A; }
    /* ── dropdowns ── */
    .sb-dropdown {
      position: fixed; z-index: 2147483649;
      background: rgba(252,249,245,0.97);
      border: 1px solid rgba(65,48,40,0.12);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(27,23,19,0.18), 0 2px 8px rgba(27,23,19,0.08);
      backdrop-filter: blur(20px);
      padding: 5px;
      min-width: 170px;
      opacity: 0; transform: translateY(6px) scale(0.97);
      transition: opacity 0.15s, transform 0.15s;
      pointer-events: none;
    }
    .sb-dropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .sb-dropdown-item {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 10px; border-radius: 9px; cursor: pointer;
      font-size: 12.5px; font-weight: 500; color: #2B221D;
      transition: background 0.1s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      border: none; background: transparent; width: 100%; text-align: left;
    }
    .sb-dropdown-item:hover { background: rgba(65,48,40,0.07); }
    .sb-dropdown-item.selected { color: #C9544A; font-weight: 700; }
    .sb-dropdown-item .sb-di-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
    .sb-dropdown-item .sb-di-label { flex: 1; }
    .sb-dropdown-item .sb-di-check { font-size: 11px; color: #C9544A; opacity: 0; }
    .sb-dropdown-item.selected .sb-di-check { opacity: 1; }
    .sb-dropdown-divider { border: none; border-top: 1px solid rgba(65,48,40,0.08); margin: 4px 5px; }
    .sb-dropdown-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: #B09080; padding: 6px 10px 2px;
    }
    #__sb_bubble__ {
      position: fixed;
      z-index: 2147483648;
      width: 420px; max-width: calc(100vw - 100px);
      height: auto; max-height: min(62vh, 520px);
      min-width: 260px; min-height: 80px;
      display: flex; flex-direction: column;
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
      flex: 1; min-height: 0; overflow: hidden;
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
    #__sb_rec_bar__ {
      display: none; align-items: center; gap: 8px;
      padding: 8px 14px 8px 14px;
      border-top: 1px solid rgba(65,48,40,0.08);
    }
    #__sb_rec_bar__.active { display: flex; }
    #__sb_rec_timer__ {
      color: #C9544A; font-weight: 700; font-size: 12px;
      font-variant-numeric: tabular-nums; min-width: 36px;
    }
    #__sb_capture_btn__ {
      border: none; border-radius: 12px; padding: 4px 10px; font-size: 11px;
      cursor: pointer; font-weight: 500; transition: background 0.15s, opacity 0.15s;
      background: rgba(65,48,40,0.08); color: #413028;
    }
    #__sb_capture_btn__:hover { background: rgba(65,48,40,0.15); }
    #__sb_capture_btn__.loading { opacity: 0.45; pointer-events: none; }
    #__sb_rec_stop_btn__ {
      border: none; border-radius: 12px; padding: 4px 10px; font-size: 11px;
      cursor: pointer; font-weight: 500; transition: background 0.15s;
      background: #fee2e2; color: #C9544A;
    }
    #__sb_rec_stop_btn__:hover { background: #fecaca; }
    .sb-lecture-notion-row {
      padding: 8px 14px 12px; border-top: 1px solid rgba(65,48,40,0.08); flex-shrink: 0;
    }
    .sb-notion-btn {
      width: 100%; padding: 7px 0; border-radius: 20px; border: 1px solid rgba(65,48,40,0.18);
      background: transparent; color: #413028; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .sb-notion-btn:hover { background: rgba(65,48,40,0.06); }
    .sb-notion-btn:disabled { opacity: 0.55; cursor: default; }

    /* ── NEW UI: Thin bar + centered glass card ── */
    #__sb_bar__ {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,251,247,0.96); border-radius: 100px;
      padding: 7px 7px 7px 18px;
      border: 1px solid rgba(65,48,40,0.1);
      box-shadow: 0 8px 28px rgba(27,23,19,0.13), 0 2px 8px rgba(27,23,19,0.07);
      width: 360px; max-width: calc(100vw - 90px);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      pointer-events: none; opacity: 0;
      transform: scaleX(0.55) translateY(4px); transform-origin: right center;
      transition: opacity 0.22s cubic-bezier(0.34,1.2,0.64,1), transform 0.22s cubic-bezier(0.34,1.2,0.64,1);
    }
    #__sb_bar__.open { opacity: 1; pointer-events: all; transform: scaleX(1) translateY(0); }
    #__sb_input__ {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #1B1713; min-width: 0; padding: 0; line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_input__::placeholder { color: #A79B92; }
    .sb-bar-icon-btn {
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: transparent; color: #6B5248; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    .sb-bar-icon-btn:hover { background: rgba(65,48,40,0.08); }
    .sb-bar-icon-btn.active { background: #fee2e2; color: #C9544A; }
    #__sb_x_auto_btn__.running { background: #fef9c3; color: #a16207; }
    #__sb_send_btn__ { background: #E8786E !important; color: white !important; }
    #__sb_send_btn__:hover { background: #C9544A !important; }
    #__sb_card_wrap__ {
      position: fixed; z-index: 2147483648; top: 50%; left: 50%;
      transform: translate(-50%, -50%); width: min(580px, calc(100vw - 48px));
      pointer-events: none; opacity: 0; transition: opacity 0.25s;
    }
    #__sb_card_wrap__.visible { opacity: 1; pointer-events: all; }
    #__sb_card_wrap__.visible #__sb_bubble__ { opacity: 1; pointer-events: all; }
    #__sb_card_wrap__.animating-in #__sb_bubble__ {
      animation: __sb_card_in__ 0.38s cubic-bezier(0.34,1.15,0.64,1) both;
    }
    @keyframes __sb_card_in__ {
      from { opacity: 0; transform: scale(0.88) translateY(22px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    #__sb_orbit_brain__ {
      position: absolute; top: 0; left: 0; width: 40px; height: 40px;
      z-index: 2; pointer-events: none; display: none; offset-anchor: 50% 50%;
    }
    #__sb_card_wrap__.visible #__sb_orbit_brain__ { display: block; }
    @keyframes __sb_orbit__ { from { offset-distance: 0%; } to { offset-distance: 100%; } }
    #__sb_bubble__ {
      --sb-fg: #ffffff; --sb-fg-2: rgba(255,255,255,0.85); --sb-fg-3: rgba(255,255,255,0.4);
      --sb-bg: rgba(255,255,255,0.08); --sb-border: rgba(255,255,255,0.22);
      --sb-q-bg: rgba(255,255,255,0.12); --sb-q-border: rgba(255,255,255,0.2);
      --sb-footer-border: rgba(255,255,255,0.12); --sb-footer-bg: rgba(0,0,0,0.1);
      --sb-code-bg: rgba(255,255,255,0.12); --sb-code-fg: #FFD0CB;
      --sb-pre-bg: rgba(0,0,0,0.35); --sb-pre-fg: #FBF7F1;
      --sb-bq-border: rgba(255,160,150,0.5); --sb-bq-fg: rgba(255,255,255,0.7);
      --sb-hr: rgba(255,255,255,0.15); --sb-link: #FFB3AE;
      --sb-btn-fg: rgba(255,255,255,0.75); --sb-btn-bg: rgba(255,255,255,0.18);
      --sb-btn-hover: rgba(255,255,255,0.32); --sb-rec-border: rgba(255,255,255,0.18);
      position: relative; width: 100%;
      height: auto; max-height: min(72vh, 700px); min-height: 120px;
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--sb-bg); border-radius: 24px;
      border: 1px solid var(--sb-border);
      box-shadow: 0 40px 100px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      color: var(--sb-fg); resize: none;
    }
    #__sb_bubble__.sb-light {
      --sb-fg: #1a1a1a; --sb-fg-2: rgba(0,0,0,0.8); --sb-fg-3: rgba(0,0,0,0.35);
      --sb-bg: rgba(255,255,255,0.82); --sb-border: rgba(0,0,0,0.1);
      --sb-q-bg: rgba(0,0,0,0.05); --sb-q-border: rgba(0,0,0,0.1);
      --sb-footer-border: rgba(0,0,0,0.08); --sb-footer-bg: rgba(0,0,0,0.03);
      --sb-code-bg: rgba(0,0,0,0.06); --sb-code-fg: #b44b42;
      --sb-pre-bg: rgba(0,0,0,0.06); --sb-pre-fg: #1a1a1a;
      --sb-bq-border: rgba(201,84,74,0.4); --sb-bq-fg: rgba(0,0,0,0.6);
      --sb-hr: rgba(0,0,0,0.1); --sb-link: #C9544A;
      --sb-btn-fg: rgba(60,40,30,0.8); --sb-btn-bg: rgba(0,0,0,0.07);
      --sb-btn-hover: rgba(0,0,0,0.13); --sb-rec-border: rgba(0,0,0,0.1);
    }
    .sb-card-header {
      display: flex; align-items: center; justify-content: flex-end; gap: 5px;
      padding: 12px 14px 4px; flex-shrink: 0;
    }
    .sb-card-header-btn {
      border: none; background: var(--sb-btn-bg); color: var(--sb-btn-fg);
      height: 26px; padding: 0 10px; border-radius: 8px; cursor: pointer;
      font-size: 11px; font-weight: 600; transition: background 0.12s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sb-card-header-btn:hover { background: var(--sb-btn-hover); }
    .sb-card-scroll {
      flex: 1; min-height: 0; overflow-y: auto; padding: 16px 26px 16px;
    }
    .sb-card-scroll::-webkit-scrollbar { width: 4px; }
    .sb-card-scroll::-webkit-scrollbar-track { background: transparent; }
    .sb-card-scroll::-webkit-scrollbar-thumb { background: rgba(180,140,120,0.3); border-radius: 99px; }
    .sb-card-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,140,120,0.55); }
    .sb-card-q {
      display: inline-block; background: var(--sb-q-bg); border: 1px solid var(--sb-q-border);
      border-radius: 14px; padding: 10px 14px; font-size: 13px; color: var(--sb-fg-2); line-height: 1.5;
      margin-bottom: 18px; max-width: 100%; word-break: break-word;
    }
    .sb-card-a { font-size: 14.5px; line-height: 1.75; color: var(--sb-fg); word-break: break-word; }
    .sb-card-a h1, .sb-card-a h2, .sb-card-a h3 {
      font-family: Georgia, 'Times New Roman', serif; color: var(--sb-fg); margin: 0 0 10px; line-height: 1.25;
    }
    .sb-card-a h1 { font-size: 22px; }
    .sb-card-a h2 { font-size: 18px; }
    .sb-card-a h3 { font-size: 15.5px; }
    .sb-card-a p { margin: 0 0 12px; }
    .sb-card-a p:last-child { margin-bottom: 0; }
    .sb-card-a ul, .sb-card-a ol { margin: 0 0 12px 18px; padding: 0; }
    .sb-card-a li { margin: 0 0 5px; }
    .sb-card-a a { color: var(--sb-link); text-decoration: none; }
    .sb-card-a a:hover { text-decoration: underline; }
    .sb-card-a code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; padding: 2px 5px; border-radius: 5px;
      background: var(--sb-code-bg); color: var(--sb-code-fg);
    }
    .sb-card-a pre {
      margin: 0 0 12px; padding: 12px 14px; border-radius: 14px;
      background: var(--sb-pre-bg); color: var(--sb-pre-fg); overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; line-height: 1.55;
    }
    .sb-card-a pre code { background: transparent; color: inherit; padding: 0; }
    .sb-card-a blockquote {
      margin: 0 0 12px; padding: 0 0 0 12px;
      border-left: 3px solid var(--sb-bq-border); color: var(--sb-bq-fg);
    }
    .sb-card-a hr { border: none; border-top: 1px solid var(--sb-hr); margin: 14px 0; }
    .sb-card-status { font-size: 13.5px; color: var(--sb-fg-2); line-height: 1.65; }
    .sb-card-footer {
      display: flex; align-items: center; gap: 5px;
      padding: 10px 12px 12px; flex-shrink: 0;
      border-top: 1px solid var(--sb-footer-border); background: var(--sb-footer-bg);
    }
    #__sb_card_input__ {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 13.5px; color: var(--sb-fg); min-width: 0; padding: 0;
      resize: none; line-height: 1.5; max-height: 80px; overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_card_input__::placeholder { color: var(--sb-fg-3); }
    .sb-card-foot-btn {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: transparent; color: var(--sb-btn-fg); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
    }
    .sb-card-foot-btn:hover { background: var(--sb-btn-bg); }
    .sb-card-foot-btn.active { background: #fee2e2; color: #C9544A; }
    #__sb_card_send__ { background: #E8786E; color: white; }
    #__sb_card_send__:hover { background: #C9544A; }
    #__sb_rec_bar__ {
      display: none; align-items: center; gap: 8px; padding: 8px 14px; flex-shrink: 0;
      border-top: 1px solid var(--sb-rec-border);
    }
    #__sb_rec_bar__.active { display: flex; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "__sb_root__";
  root.innerHTML = `
    <div id="__sb_bar__">
      <input id="__sb_input__" placeholder="What's on your mind?" autocomplete="off" spellcheck="false" />
      <button id="__sb_mode_btn__" class="sb-pill-dropdown-btn" title="Mode">
        <span id="__sb_mode_label__">⚡ Auto</span>
        <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 5 5 9 1"/></svg>
      </button>
      <button id="__sb_rec_btn__" class="sb-bar-icon-btn" title="Voice">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
      </button>
      <button id="__sb_send_btn__" class="sb-bar-icon-btn" title="Send">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      </button>
      <button id="__sb_x_auto_btn__" class="sb-bar-icon-btn" title="X Automation" style="display:none;gap:4px;padding:0 8px;font-size:11px;font-weight:600;width:auto;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span id="__sb_x_auto_label__">X Auto</span>
      </button>
    </div>
    <div id="__sb_brain_btn__">${__SB_BRAIN_SVG}</div>
  `;
  document.body.appendChild(root);

  // ── Card wrapper ──
  const cardWrap = document.createElement("div");
  cardWrap.id = "__sb_card_wrap__";
  cardWrap.innerHTML = `
    <div id="__sb_orbit_brain__">${__SB_BRAIN_SVG_ORBIT}</div>
    <div id="__sb_bubble__">
      <div class="sb-card-header">
        <button class="sb-card-header-btn" type="button" data-sb-speak>Speak</button>
        <button class="sb-card-header-btn" type="button" data-sb-copy>Copy</button>
        <button class="sb-card-header-btn" id="__sb_stop_btn__" type="button" data-sb-stop style="display:none;background:#fee2e2;color:#C9544A;">⏹ Stop</button>
        <button class="sb-card-header-btn" type="button" data-sb-close>×</button>
      </div>
      <div class="sb-card-scroll"></div>
      <div class="sb-card-footer">
        <textarea id="__sb_card_input__" placeholder="Follow up…" rows="1"></textarea>
        <button id="__sb_card_mode_btn__" class="sb-pill-dropdown-btn" title="Mode">
          <span id="__sb_card_mode_label__">⚡ Auto</span>
          <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 5 5 9 1"/></svg>
        </button>
        <button id="__sb_card_rec_btn__" class="sb-card-foot-btn" title="Voice">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
        </button>
        <button id="__sb_card_voice_mode_btn__" class="sb-card-foot-btn" title="Voice-only mode">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
        </button>
        <button id="__sb_card_send__" class="sb-card-foot-btn" title="Send">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
        <button id="__sb_card_collapse__" class="sb-card-foot-btn" title="Collapse">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 12 12 19 5 12"/></svg>
        </button>
      </div>
      <div id="__sb_rec_bar__">
        <span id="__sb_rec_timer__">00:00</span>
        <button id="__sb_capture_btn__">✂ Capture</button>
        <button id="__sb_rec_stop_btn__">⏹ Stop</button>
      </div>
    </div>
  `;
  document.body.appendChild(cardWrap);

  // ── Dropdowns (body-level to avoid stacking context issues) ──
  const modeDd = document.createElement("div");
  modeDd.id = "__sb_mode_dropdown__";
  modeDd.className = "sb-dropdown";
  modeDd.innerHTML = `
    <div class="sb-dropdown-label">Mode</div>
    <button class="sb-dropdown-item selected" data-mode="page"><span class="sb-di-icon">📄</span><span class="sb-di-label">Chat with Page</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-mode="web"><span class="sb-di-icon">🔍</span><span class="sb-di-label">Web Search</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-mode="lecture"><span class="sb-di-icon">🎙</span><span class="sb-di-label">Lecture &amp; Audio</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-mode="meeting"><span class="sb-di-icon">👥</span><span class="sb-di-label">Meeting &amp; Call</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-mode="agent"><span class="sb-di-icon">🤖</span><span class="sb-di-label">Delegate</span><span class="sb-di-check">✓</span></button>
  `;
  document.body.appendChild(modeDd);

  const modelDd = document.createElement("div");
  modelDd.id = "__sb_model_dropdown__";
  modelDd.className = "sb-dropdown";
  modelDd.innerHTML = `
    <div class="sb-dropdown-label">AI Model</div>
    <button class="sb-dropdown-item selected" data-model="lovable"><span class="sb-di-icon">🧠</span><span class="sb-di-label">Braino AI</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-model="claude"><span class="sb-di-icon">✦</span><span class="sb-di-label">Claude</span><span class="sb-di-check">✓</span></button>
  `;
  document.body.appendChild(modelDd);

  // Brain hidden by default
  document.getElementById("__sb_brain_btn__").style.display = "none";
  document.getElementById("__sb_brain_btn__").addEventListener("click", () => __sbToggleInput(!__sbInputOpen));

  // ⌘I / Ctrl+I — toggle brain
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "i") {
      // Only block if typing inside the extension's own inputs — not page inputs
      if (document.activeElement?.closest("#__sb_root__, #__sb_card_wrap__")) return;
      e.preventDefault();
      __sbToggleBrain();
    }
  }, true);

  // Bar buttons
  document.getElementById("__sb_send_btn__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_rec_btn__").addEventListener("click", __sbToggleRecording);

  // X Auto button — show only on X/Twitter
  const xAutoBtn = document.getElementById("__sb_x_auto_btn__");
  if (__sbIsOnX()) xAutoBtn.style.display = "flex";
  xAutoBtn.addEventListener("click", () => void __sbRunXAutomation());

  // Card footer buttons
  document.getElementById("__sb_card_send__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_card_rec_btn__").addEventListener("click", __sbToggleRecording);
  document.getElementById("__sb_card_collapse__").addEventListener("click", __sbCollapseCard);
  document.getElementById("__sb_card_voice_mode_btn__").addEventListener("click", () => {
    __sbVoiceOnlyMode = !__sbVoiceOnlyMode;
    document.getElementById("__sb_card_voice_mode_btn__").classList.toggle("active", __sbVoiceOnlyMode);
  });
  document.getElementById("__sb_capture_btn__").addEventListener("click", () => void __sbCaptureLectureSegment());
  document.getElementById("__sb_rec_stop_btn__").addEventListener("click", () => void __sbStopLectureRecording());

  // Card header buttons (wired once, not per-show)
  const bubble = document.getElementById("__sb_bubble__");
  bubble.querySelector("[data-sb-close]").addEventListener("click", () => __sbCollapseCard());
  document.getElementById("__sb_stop_btn__").addEventListener("click", () => {
    if (__sbXRunning) {
      __sbXRunning = false;
    }
    chrome.runtime.sendMessage({ action: "stopBrainAgent" }, () => { void chrome.runtime.lastError; });
    __sbSetStopBtn(false);
    __sbShowBubble("Stopped.", true, { tone: "status", title: "Stopped" });
  });
  bubble.querySelector("[data-sb-copy]").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    try {
      await navigator.clipboard.writeText(__sbLastBubbleRaw);
      const prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = prev || "Copy"; }, 1200);
    } catch {}
  });
  bubble.querySelector("[data-sb-speak]").addEventListener("click", () => {
    if (__sbIsSpeaking) { __sbStopSpeech(); return; }
    void __sbSpeakText(__sbLastBubbleRaw);
  });

  // ── Dropdown helpers ──
  let __sbOpenDropdown = null;
  function __sbCloseAllDropdowns() {
    document.getElementById("__sb_mode_dropdown__")?.classList.remove("open");
    document.getElementById("__sb_model_dropdown__")?.classList.remove("open");
    __sbOpenDropdown = null;
  }
  function __sbPositionDropdown(ddEl, triggerEl) {
    const tr = triggerEl.getBoundingClientRect();
    ddEl.style.left = tr.left + "px";
    ddEl.style.bottom = (window.innerHeight - tr.top + 6) + "px";
    ddEl.style.top = "auto";
  }

  // ── Mode dropdown (bar + card share the same dropdown) ──
  function __sbSetupModeBtn(btnEl) {
    btnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = modeDd.classList.contains("open");
      __sbCloseAllDropdowns();
      if (!isOpen) { __sbPositionDropdown(modeDd, btnEl); modeDd.classList.add("open"); __sbOpenDropdown = "mode"; }
    });
  }
  __sbSetupModeBtn(document.getElementById("__sb_mode_btn__"));
  __sbSetupModeBtn(document.getElementById("__sb_card_mode_btn__"));

  modeDd.querySelectorAll(".sb-dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
      const mode = item.dataset.mode;
      window.__sbForcedMode = mode;
      modeDd.querySelectorAll(".sb-dropdown-item").forEach(i => i.classList.remove("selected"));
      item.classList.add("selected");
      const labels = { page: "📄 Page", web: "🔍 Web", lecture: "🎙 Lecture", meeting: "👥 Meeting", agent: "🤖 Delegate" };
      const label = labels[mode] || "📄 Page";
      document.getElementById("__sb_mode_label__").textContent = label;
      document.getElementById("__sb_card_mode_label__").textContent = label;
      document.getElementById("__sb_mode_btn__").classList.toggle("active-mode", mode !== "page");
      document.getElementById("__sb_card_mode_btn__").classList.toggle("active-mode", mode !== "page");
      __sbCloseAllDropdowns();
    });
  });

  modelDd.querySelectorAll(".sb-dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
      const model = item.dataset.model;
      modelDd.querySelectorAll(".sb-dropdown-item").forEach(i => i.classList.remove("selected"));
      item.classList.add("selected");
      if (__sbContextOk()) chrome.storage.local.set({ aiProvider: model });
      __sbCloseAllDropdowns();
    });
  });

  document.addEventListener("click", (e) => {
    if (__sbOpenDropdown && !e.target.closest("#__sb_mode_dropdown__,#__sb_model_dropdown__,#__sb_mode_btn__,#__sb_card_mode_btn__")) {
      __sbCloseAllDropdowns();
    }
  });

  // Bar input
  const inputEl = document.getElementById("__sb_input__");
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbToggleInput(false);
  });

  // Card input
  const cardInputEl = document.getElementById("__sb_card_input__");
  cardInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbCollapseCard();
  });
  cardInputEl.addEventListener("input", () => {
    cardInputEl.style.height = "auto";
    cardInputEl.style.height = Math.min(cardInputEl.scrollHeight, 80) + "px";
  });
}

function __sbDetectPageTheme() {
  const parse = (col) => {
    const m = col?.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length >= 4 && +m[3] < 0.05) return null;
    return { r: +m[0], g: +m[1], b: +m[2] };
  };
  let c = parse(window.getComputedStyle(document.body).backgroundColor);
  if (!c) c = parse(window.getComputedStyle(document.documentElement).backgroundColor);
  if (!c) return "dark";
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.55 ? "light" : "dark";
}

function __sbOpenCard(options = {}) {
  if (!__sbOwnsInlineUi()) return;
  const wrap = document.getElementById("__sb_card_wrap__");
  if (!wrap) return;
  __sbRefreshInlineOwner();
  // Hide the bar — card has its own follow-up input
  document.getElementById("__sb_bar__")?.classList.remove("open");
  wrap.classList.add("visible", "animating-in");
  requestAnimationFrame(() => setTimeout(() => wrap.classList.remove("animating-in"), 400));
  if (options.rich) setTimeout(() => __sbStartOrbit(), 60);
  else __sbStopOrbit();
  const bubble = wrap.querySelector("#__sb_bubble__");
  if (bubble) bubble.classList.toggle("sb-light", __sbDetectPageTheme() === "light");
  __sbInitCardDrag(wrap);
}

function __sbCollapseCard() {
  if (!__sbOwnsInlineUi()) return;
  const wrap = document.getElementById("__sb_card_wrap__");
  if (wrap) wrap.classList.remove("visible");
  __sbStopOrbit();
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (__sbBrainVisible && __sbInputOpen) {
    document.getElementById("__sb_bar__")?.classList.add("open");
  }
}

function __sbStartOrbit() {
  const card = document.getElementById("__sb_bubble__");
  const orbitBrain = document.getElementById("__sb_orbit_brain__");
  if (!card || !orbitBrain) return;
  // Hide the main brain button so only the orbiting one is visible
  const mainBrain = document.getElementById("__sb_brain_btn__");
  if (mainBrain) mainBrain.style.visibility = "hidden";
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const r = 24;
  const path = `M ${r},0 H ${w - r} Q ${w},0 ${w},${r} V ${h - r} Q ${w},${h} ${w - r},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`;
  orbitBrain.style.offsetPath = `path("${path}")`;
  orbitBrain.style.animation = "__sb_orbit__ 12s linear infinite";
}

function __sbStopOrbit() {
  const orbitBrain = document.getElementById("__sb_orbit_brain__");
  if (orbitBrain) {
    orbitBrain.style.offsetPath = "";
    orbitBrain.style.animation = "none";
  }
  // Restore main brain visibility
  const mainBrain = document.getElementById("__sb_brain_btn__");
  if (mainBrain) mainBrain.style.visibility = "";
}

function __sbInitCardDrag(wrap) {
  if (wrap.dataset.dragBound) return;
  wrap.dataset.dragBound = "1";
  const header = wrap.querySelector(".sb-card-header");
  const bubble = document.getElementById("__sb_bubble__");
  if (!header || !bubble) return;

  function pin() {
    const rect = wrap.getBoundingClientRect();
    wrap.style.left = rect.left + "px";
    wrap.style.top = rect.top + "px";
    wrap.style.transform = "none";
  }

  // Drag from header
  header.style.cursor = "grab";
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    dragging = true;
    pin();
    ox = e.clientX - wrap.getBoundingClientRect().left;
    oy = e.clientY - wrap.getBoundingClientRect().top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });

  // Resize grip — bottom-right corner
  const grip = document.createElement("div");
  grip.className = "sb-resize-handle";
  grip.style.cssText = "position:absolute;bottom:4px;right:4px;width:18px;height:18px;cursor:se-resize;z-index:10;opacity:0.5;color:currentColor;";
  grip.innerHTML = `<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 3 L3 11 M11 7 L7 11"/></svg>`;
  wrap.appendChild(grip);

  let resizing = false, rw = 0, rh = 0, rx = 0, ry = 0;
  grip.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    resizing = true;
    pin();
    const wr = wrap.getBoundingClientRect();
    const br = bubble.getBoundingClientRect();
    rw = wr.width; rh = br.height; rx = e.clientX; ry = e.clientY;
    e.preventDefault(); e.stopPropagation();
  });

  document.addEventListener("mousemove", (e) => {
    if (dragging) {
      wrap.style.left = (e.clientX - ox) + "px";
      wrap.style.top = (e.clientY - oy) + "px";
    }
    if (resizing) {
      const nw = Math.max(280, rw + e.clientX - rx);
      const nh = Math.max(120, rh + e.clientY - ry);
      wrap.style.width = nw + "px";
      bubble.style.height = nh + "px";
      bubble.style.maxHeight = nh + "px";
    }
  });
  document.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; header.style.cursor = "grab"; }
    resizing = false;
  });
}

function __sbSetStopBtn(visible) {
  const btn = document.getElementById("__sb_stop_btn__");
  if (btn) btn.style.display = visible ? "inline-flex" : "none";
}

// ===== X / TWITTER AUTOMATION =====
const __sbXReplied = new WeakSet();
const __sbXProcessedKeys = new Set();
let __sbXRunning = false;

function __sbSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function __sbIsOnX() {
  return /^(twitter|x)\.com$/.test(location.hostname);
}

function __sbXExtractHandleFromHref(href) {
  if (!href) return '';
  try {
    const url = new URL(href, location.origin);
    const first = url.pathname.split('/').filter(Boolean)[0] || '';
    if (!first) return '';
    if (/^(home|explore|notifications|messages|compose|search|settings|i)$/.test(first)) return '';
    return first.replace(/^@/, '').toLowerCase();
  } catch(e) {
    return '';
  }
}

function __sbXGetCurrentUserHandles() {
  const handles = new Set();
  const hrefSelectors = [
    'a[data-testid="AppTabBar_Profile_Link"]',
    '[data-testid="SideNav_AccountSwitcher_Button"] a[href^="/"]',
    'a[aria-label*="Profile"][href^="/"]',
    'header a[href^="/"]',
    'nav a[href^="/"]',
  ];

  for (const selector of hrefSelectors) {
    for (const el of document.querySelectorAll(selector)) {
      const handle = __sbXExtractHandleFromHref(el.getAttribute('href') || '');
      if (handle) handles.add(handle);
    }
  }

  const textSelectors = [
    '[data-testid="SideNav_AccountSwitcher_Button"]',
    '[data-testid="AppTabBar_Profile_Link"]',
  ];

  for (const selector of textSelectors) {
    for (const el of document.querySelectorAll(selector)) {
      const match = String(el.innerText || el.textContent || '').match(/@([a-z0-9_]{1,32})/i);
      if (match?.[1]) handles.add(match[1].toLowerCase());
    }
  }

  return handles;
}

function __sbXGetTweetKey(article, handle, text) {
  const permalink =
    article.querySelector('a[href*="/status/"] time')?.closest('a[href*="/status/"]') ||
    [...article.querySelectorAll('a[href*="/status/"]')].find((el) => /\/status\/\d+/.test(el.getAttribute('href') || ''));

  const href = permalink?.getAttribute('href') || '';
  if (href) {
    try {
      const url = new URL(href, location.origin);
      return url.pathname.replace(/\/analytics$/, '');
    } catch(e) {}
  }

  const normalizedHandle = String(handle || '').trim().toLowerCase();
  const normalizedText = __sbXNormalizeText(text).slice(0, 140);
  return normalizedHandle || normalizedText ? `${normalizedHandle}::${normalizedText}` : '';
}

function __sbXFindTweets(selfHandles) {
  return [...document.querySelectorAll('article[data-testid="tweet"]')]
    .map((article) => ({ article, data: __sbXGetTweetData(article) }))
    .filter(({ article, data }) => {
      const socialContext = __sbXNormalizeText(article.querySelector('[data-testid="socialContext"]')?.innerText || article.querySelector('[data-testid="socialContext"]')?.textContent || '');
      if (__sbXReplied.has(article)) return false;
      if (!article.querySelector('[data-testid="reply"]')) return false;
      if (!data.key) return false;
      if (__sbXProcessedKeys.has(data.key)) return false;
      if (/you replied|you reposted|you posted/.test(socialContext)) return false;
      if (data.handle && selfHandles.has(data.handle.toLowerCase())) return false;
      return true;
    });
}

function __sbXGetTweetData(article) {
  const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
  const text = tweetTextEl ? (tweetTextEl.innerText || tweetTextEl.textContent || '').trim() : '';
  const handleHref =
    article.querySelector('[data-testid="User-Name"] a[href^="/"]')?.getAttribute('href') ||
    article.querySelector('a[href^="/"][role="link"]')?.getAttribute('href') ||
    '';
  const handle = __sbXExtractHandleFromHref(handleHref);
  const key = __sbXGetTweetKey(article, handle, text);
  return { text, handle, key };
}

async function __sbXGenerateReply(tweetText, handle) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'generateXReply', tweetText, handle }, (res) => {
      void chrome.runtime.lastError;
      resolve(res?.reply || null);
    });
  });
}

function __sbXGetReplyEditorNow() {
  const dialogCandidates = [
    ...document.querySelectorAll('[role="dialog"] [data-testid="tweetTextarea_0"]'),
    ...document.querySelectorAll('[role="dialog"] [role="textbox"][contenteditable="true"]'),
  ];
  const inDialog = dialogCandidates.find((el) => el?.isContentEditable);
  if (inDialog) return inDialog;

  const all = [
    ...document.querySelectorAll('[data-testid="tweetTextarea_0"]'),
    ...document.querySelectorAll('[role="textbox"][contenteditable="true"]'),
  ].filter((el) => el?.isContentEditable);
  if (all.length > 1) return all[all.length - 1];
  return null;
}

async function __sbXFindReplyEditor() {
  // Poll up to 6s for the reply composer to appear.
  // Priority: inside [role="dialog"] → last textarea on page (> 1 means reply opened)
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const editor = __sbXGetReplyEditorNow();
    if (editor) return editor;
    await __sbSleep(300);
  }
  return null;
}

async function __sbXInsertText(editable, text) {
  editable.focus();
  await __sbSleep(200);

  // Select all existing content so insertText replaces rather than appends
  document.execCommand('selectAll', false, null);
  await __sbSleep(80);

  // React 17+ (Twitter) registers its event listeners in CAPTURE phase at the root element.
  // So the order for a beforeinput event is:
  //   1. Capture at React root → Draft.js fires, updates EditorState (text inserted once)
  //   2. Bubble up to document → our listener fires, calls e.preventDefault()
  //   3. execCommand sees defaultPrevented → cancels browser's NATIVE DOM insertion
  // Result: Draft.js has the text once, browser doesn't double-insert.
  // Using capture:true would run BEFORE Draft.js, blocking both Draft.js and browser.
  const blockNative = (e) => { if (e.inputType === 'insertText') e.preventDefault(); };
  document.addEventListener('beforeinput', blockNative); // bubble phase — runs after Draft.js
  try { document.execCommand('insertText', false, text); } catch(e) {}
  document.removeEventListener('beforeinput', blockNative);

  await __sbSleep(600);
}

function __sbXFindSubmitButton() {
  const roots = [
    document.querySelector('[role="dialog"]'),
    document.querySelector('main'),
    document,
  ].filter(Boolean);

  const selectors = [
    '[data-testid="tweetButton"]',
    '[data-testid="tweetButtonInline"]',
    'button[role="button"]',
  ];

  for (const root of roots) {
    for (const selector of selectors) {
      const buttons = [...root.querySelectorAll(selector)];
      for (const btn of buttons) {
        const text = (btn.textContent || btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
        if (testId === 'tweetbutton' || testId === 'tweetbuttoninline' || /^(reply|post|tweet)$/.test(text)) {
          return btn;
        }
      }
    }
  }

  return null;
}

function __sbXIsSubmitEnabled(btn) {
  if (!btn) return false;
  if (btn.disabled) return false;
  if (btn.getAttribute('aria-disabled') === 'true') return false;
  const style = window.getComputedStyle(btn);
  if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') return false;
  return true;
}

async function __sbXWaitForSubmit() {
  for (let i = 0; i < 12; i++) {
    const btn = __sbXFindSubmitButton();
    if (btn && __sbXIsSubmitEnabled(btn)) return btn;
    await __sbSleep(400);
  }
  return null;
}

function __sbXForceClick(el) {
  if (!el) return;
  try { el.focus?.(); } catch(e) {}
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    try {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
    } catch(e) {}
  }
  try { el.click?.(); } catch(e) {}
}

function __sbXNormalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function __sbXGetStatusText() {
  const selectors = [
    '[role="alert"]',
    '[role="status"]',
    '[aria-live="assertive"]',
    '[aria-live="polite"]',
    '[data-testid="toast"]',
  ];

  const texts = [];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      const text = __sbXNormalizeText(el.innerText || el.textContent || '');
      if (text) texts.push(text);
    }
  }

  return texts.join(' ');
}

async function __sbXWaitForSendOutcome(expectedReplyText) {
  const expected = __sbXNormalizeText(expectedReplyText).slice(0, 80);

  for (let i = 0; i < 20; i++) {
    const editor = __sbXGetReplyEditorNow();
    const submit = __sbXFindSubmitButton();
    const submitEnabled = __sbXIsSubmitEnabled(submit);
    const editorText = __sbXNormalizeText(editor?.innerText || editor?.textContent || '');
    const statusText = __sbXGetStatusText();

    if (!editor) return { sent: true, reason: 'composer-closed' };
    if (/already said that|duplicate/.test(statusText)) return { sent: true, reason: 'duplicate-warning' };
    if (/your (reply|post) was sent|reply sent|post sent|posted your reply/.test(statusText)) {
      return { sent: true, reason: 'sent-toast' };
    }
    if (expected && !editorText.includes(expected) && !submitEnabled) {
      return { sent: true, reason: 'editor-cleared' };
    }

    await __sbSleep(250);
  }

  return { sent: false, reason: 'timeout' };
}

async function __sbXSubmitWithShortcut(editable, expectedReplyText) {
  if (!editable) return false;
  try { editable.focus(); } catch(e) {}
  await __sbSleep(100);

  const combos = [
    { metaKey: true, ctrlKey: false },
    { metaKey: false, ctrlKey: true },
  ];

  for (const combo of combos) {
    for (const type of ['keydown', 'keypress', 'keyup']) {
      try {
        editable.dispatchEvent(new KeyboardEvent(type, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          metaKey: combo.metaKey,
          ctrlKey: combo.ctrlKey,
        }));
      } catch(e) {}
    }

    const outcome = await __sbXWaitForSendOutcome(expectedReplyText);
    if (outcome.sent) return outcome;
  }

  return { sent: false, reason: 'timeout' };
}

async function __sbXPostReply(article, replyText) {
  if (!document.body.contains(article)) return false;

  const replyBtn = article.querySelector('[data-testid="reply"]');
  if (!replyBtn) return false;

  article.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await __sbSleep(600);

  const urlBefore = location.href;
  replyBtn.click();
  __sbShowBubble('X Auto: waiting for reply composer…', false, { tone: 'status', title: 'X Automation' });
  await __sbSleep(1200);

  // Twitter sometimes navigates to /compose/post when reply is clicked.
  // That page also keeps the in-reply-to context, so we can post from there.
  const navigated = location.href !== urlBefore;
  if (navigated) {
    __sbShowBubble('X Auto: compose page opened, finding editor…', false, { tone: 'status', title: 'X Automation' });
  }

  const editable = await __sbXFindReplyEditor();
  if (!editable) {
    __sbShowBubble('X Auto: no reply editor found.', false, { tone: 'status', title: 'X Automation' });
    return false;
  }

  __sbShowBubble(`X Auto: inserting reply (${replyText.length} chars)…`, false, { tone: 'status', title: 'X Automation' });
  await __sbXInsertText(editable, replyText);

  const submit = await __sbXWaitForSubmit();
  if (!submit) {
    __sbShowBubble(`X Auto: submit never enabled. Editor: "${editable.textContent?.slice(0, 50)}"`, false, { tone: 'status', title: 'X Automation' });
    return false;
  }

  __sbShowBubble('X Auto: sending reply…', false, { tone: 'status', title: 'X Automation' });
  __sbXForceClick(submit);
  let outcome = await __sbXWaitForSendOutcome(replyText);

  if (!outcome.sent) {
    __sbShowBubble('X Auto: click did not send, trying shortcut…', false, { tone: 'status', title: 'X Automation' });
    outcome = await __sbXSubmitWithShortcut(editable, replyText);
  }

  if (!outcome.sent) {
    __sbShowBubble('X Auto: reply was written but not sent.', false, { tone: 'status', title: 'X Automation' });
    return false;
  }

  if (outcome.reason === 'duplicate-warning') {
    __sbShowBubble('X Auto: reply was already sent ✓', false, { tone: 'status', title: 'X Automation' });
  } else {
    __sbShowBubble('X Auto: reply posted ✓', false, { tone: 'status', title: 'X Automation' });
  }
  await __sbSleep(1200);

  // If X moved us onto a compose route, return to the exact page we started from.
  // Using history.back() is too loose because X's client-side history can point at a profile or detail page.
  if (navigated && location.href !== urlBefore) {
    try {
      window.location.replace(urlBefore);
    } catch(e) {
      window.location.href = urlBefore;
    }
    await __sbSleep(1800);
  }

  return true;
}

async function __sbRunXAutomation() {
  if (!__sbIsOnX()) {
    __sbShowBubble('Navigate to X (twitter.com) first, then start the automation.', true, { tone: 'status', title: 'X Automation' });
    return;
  }
  if (__sbXRunning) {
    __sbXRunning = false;
    const btn = document.getElementById('__sb_x_auto_btn__');
    if (btn) { btn.classList.remove('running'); document.getElementById('__sb_x_auto_label__').textContent = 'X Auto'; }
    __sbShowBubble('Automation stopped.', true, { tone: 'status', title: 'Stopped' });
    return;
  }

  __sbXRunning = true;
  __sbXProcessedKeys.clear();
  const btn = document.getElementById('__sb_x_auto_btn__');
  if (btn) { btn.classList.add('running'); document.getElementById('__sb_x_auto_label__').textContent = 'Stop'; }
  __sbSetStopBtn(true);
  __sbShowBubble('X Automation started — scanning your timeline…', false, { tone: 'status', title: 'X Automation' });

  let count = 0;
  let scrollStreak = 0;

  while (__sbXRunning) {
    const selfHandles = __sbXGetCurrentUserHandles();
    const tweets = __sbXFindTweets(selfHandles);
    if (!tweets.length) {
      if (++scrollStreak > 8) break; // gave up after ~24s of no new tweets
      window.scrollBy(0, 700);
      await __sbSleep(3000);
      continue;
    }
    scrollStreak = 0;

    const { article, data } = tweets[0];
    __sbXReplied.add(article);
    if (data.key) __sbXProcessedKeys.add(data.key);

    const { text, handle } = data;
    if (!text || text.length < 8) continue;

    __sbShowBubble(`@${handle}: "${text.slice(0, 60)}…" — generating reply`, false, { tone: 'status', title: 'X Automation' });
    const reply = await __sbXGenerateReply(text, handle);
    if (!reply) { await __sbSleep(2000); continue; }

    const ok = await __sbXPostReply(article, reply.slice(0, 240));
    if (ok) {
      count++;
      __sbShowBubble(`Replied to ${count} post${count !== 1 ? 's' : ''} — waiting 10s…`, false, { tone: 'status', title: 'X Automation' });
      await __sbSleep(10000);
    } else {
      await __sbSleep(3000);
    }
  }

  __sbXRunning = false;
  if (btn) { btn.classList.remove('running'); document.getElementById('__sb_x_auto_label__').textContent = 'X Auto'; }
  __sbSetStopBtn(false);
  __sbShowBubble(`Automation finished — replied to ${count} post${count !== 1 ? 's' : ''}.`, true, { tone: 'status', title: 'Done' });
}
// ===== END X AUTOMATION =====

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
      ? `${greeting}, ${firstName} — ask anything`
      : `${greeting} — ask anything`;
  });
}

function __sbToggleBrain() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  const btn = document.getElementById("__sb_brain_btn__");
  if (__sbBrainVisible) {
    __sbBrainVisible = false;
    if (btn) btn.style.display = "none";
    __sbToggleInput(false, { skipPersist: true });
    if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
    const wrap = document.getElementById("__sb_card_wrap__");
    if (wrap) wrap.classList.remove("visible");
    __sbStopOrbit();
  } else {
    __sbBrainVisible = true;
    if (btn) btn.style.display = "";
    __sbToggleInput(true, { skipPersist: true });
  }
}

function __sbToggleInput(open, options = {}) {
  if (!__sbOwnsInlineUi()) return;
  if (open) {
    if (!__sbContextOk()) {
      __sbShowBubble("Reload this page to reconnect Braino.", true, { tone: "status" });
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
      __sbStorageGet(["aiProvider"]).then(({ aiProvider }) => {
        const model = aiProvider === "claude" ? "claude" : "lovable";
        document.querySelectorAll("#__sb_model_dropdown__ .sb-dropdown-item").forEach(b =>
          b.classList.toggle("selected", b.dataset.model === model));
      });
      const bar = document.getElementById("__sb_bar__");
      if (bar) {
        const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
        if (!cardOpen) bar.classList.add("open");
        if (!options.suppressFocus) setTimeout(() => document.getElementById("__sb_input__")?.focus(), 50);
      }
    });
  } else {
    __sbInputOpen = false;
    if (!options.skipPersist && __sbContextOk()) chrome.storage.local.set({ sbBrainExpanded: false });
    document.getElementById("__sb_bar__")?.classList.remove("open");
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
  const title = active ? "Stop listening" : (__sbIsSpeaking ? "Stop speaking" : "Speak to Braino");
  ["__sb_rec_btn__", "__sb_card_rec_btn__"].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle("active", active);
    btn.title = title;
  });
  document.getElementById("__sb_brain_btn__")?.classList.toggle("recording", active);
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
  if (!clean) return false;

  __sbStopSpeech();
  let spoke = false;

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
    spoke = true;
  } catch (_err) {
    spoke = await __sbSpeakWithBrowser(clean);
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
  return spoke;
}


function __sbShowBubble(text, autoHide = true, options = {}) {
  if (!__sbOwnsInlineUi()) return;
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRefreshInlineOwner();
  __sbLastBubbleRaw = String(text || "");
  const rich = Boolean(options.rich);
  const promptHtml = options.prompt ? `<div class="sb-card-q">${__sbEscapeHtml(options.prompt)}</div>` : "";
  scroll.innerHTML = rich
    ? promptHtml + `<div class="sb-card-a">${__sbRenderMarkdown(text)}</div>`
    : promptHtml + `<div class="sb-card-status">${__sbEscapeHtml(text)}</div>`;
  __sbOpenCard({ rich });
  __sbSyncSpeakButtons();
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (autoHide) __sbBubbleTimer = setTimeout(() => __sbCollapseCard(), 8000);
}

function __sbShowSignIn() {
  if (!__sbOwnsInlineUi()) return;
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  scroll.innerHTML = `
    <div style="font-size:13.5px;line-height:1.6;color:rgba(255,255,255,0.9);margin-bottom:14px">Sign in to start using Braino.</div>
    <button id="__sb_signin_btn__" style="width:100%;padding:9px 0;border:none;border-radius:20px;background:#E8786E;color:white;font-size:13px;font-weight:600;cursor:pointer;">Sign in</button>
  `;
  __sbOpenCard({ rich: false });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  let __sbSignInClicked = false;
  document.getElementById("__sb_signin_btn__")?.addEventListener("click", () => {
    __sbSignInClicked = true;
    window.open(chrome.runtime.getURL("sidepanel.html"), "_blank", "width=420,height=680,menubar=no,toolbar=no,resizable=no");
  });
  if (__sbContextOk()) {
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.authToken?.newValue && __sbSignInClicked) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
        __sbCollapseCard();
        __sbShowBubble("You're signed in! Click the brain to chat.", true, { tone: "status", title: "Signed in" });
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
  if (!__sbContextOk()) throw new Error("Reload page to reconnect Braino.");

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

  const forcedMode = window.__sbForcedMode || "page";
  const rawIntent = (forcedMode !== "page") ? forcedMode : __sbDetectIntent(promptText);
  // lecture and meeting both drive the recording flow
  const intent = (rawIntent === "lecture" || rawIntent === "meeting") ? "record" : rawIntent;

  if (intent === "record") {
    if (fromVoice) __sbVoicePendingReply = false;
    if (forcedMode === "lecture" || forcedMode === "meeting") {
      void __sbStartLectureRecording();
    } else {
      await __sbStartRecording();
    }
    return;
  }

  const stored = await __sbStorageGet(["currentNotes", "authToken", "isPremium", "aiProvider"]);
  const aiProvider = stored.aiProvider === "claude" ? "claude" : "lovable";

  if (intent === "agent") {
    if (!stored.isPremium) {
      if (fromVoice) __sbVoicePendingReply = false;
      __sbShowUpgrade("Browser Agent (Delegate)");
      if (fromVoice) await __sbSpeakText("Browser agent requires premium.");
      return;
    }
    if (!fromVoice || !__sbVoiceOnlyMode) __sbShowBubble("Delegating…", false);
    __sbRunAgent(promptText);
    if (fromVoice) {
      __sbVoicePendingReply = false;
      await __sbSpeakText("On it.");
    }
    return;
  }

  const pageContext = __sbGetPageContext();
  const hasPageText = Boolean(pageContext.text);
  const selectedText = pageContext.selectedText || undefined;
  const previousHistory = __sbChatHistory.slice(-10);

  if (intent === "web") {
    const voiceOnly = fromVoice && __sbVoiceOnlyMode;
    if (!voiceOnly) __sbShowBubble("Searching the web…", false);
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
        if (fromVoice) await __sbSpeakText("Please sign in to continue.");
        return;
      }

      const finalReply = __sbAppendSearchSources(String(reply), searchData.results || []);
      __sbChatHistory.push({ role: "assistant", content: finalReply });
      if (voiceOnly) {
        const spoke = await __sbSpeakText(finalReply);
        if (!spoke) __sbShowBubble(finalReply, false, { rich: true, prompt: promptText, title: "Couldn't speak — tap to read" });
      } else {
        __sbShowBubble(finalReply, false, { rich: true, prompt: promptText, title: `Web results · ${location.hostname.replace(/^www\./, "") || "current page"}` });
        if (fromVoice) await __sbSpeakText(finalReply);
      }
    } catch (err) {
      __sbShowBubble("Error: " + (err.message || "couldn't search the web"), true);
      if (fromVoice) await __sbSpeakText("Something went wrong while searching the web.");
    } finally {
      if (fromVoice) __sbVoicePendingReply = false;
    }
    return;
  }

  const voiceOnly = fromVoice && __sbVoiceOnlyMode;
  if (!voiceOnly) __sbShowBubble(hasPageText ? "Reading page…" : "Thinking…", false);
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
      if (fromVoice) await __sbSpeakText("Please sign in to continue.");
      return;
    }
    __sbChatHistory.push({ role: "assistant", content: reply });
    if (voiceOnly) {
      const spoke = await __sbSpeakText(reply);
      if (!spoke) __sbShowBubble(reply, false, { rich: true, prompt: promptText, title: "Couldn't speak — tap to read" });
    } else {
      __sbShowBubble(reply, false, {
        rich: true,
        prompt: promptText,
        title: pageContext.title || location.hostname.replace(/^www\./, "") || "Current page",
      });
      if (fromVoice) await __sbSpeakText(reply);
    }
  } catch (err) {
    __sbShowBubble("Error: " + (err.message || "couldn't reach Braino"), true);
    if (fromVoice) await __sbSpeakText("Something went wrong.");
  } finally {
    if (fromVoice) __sbVoicePendingReply = false;
  }
}

async function __sbSendMessage() {
  if (!__sbOwnsInlineUi()) return;
  const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
  const input = document.getElementById(cardOpen ? "__sb_card_input__" : "__sb_input__");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  if (input.tagName === "TEXTAREA") input.style.height = "auto";
  await __sbProcessPrompt(text);
}

function __sbShowUpgrade(feature) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  scroll.innerHTML = `
    <div style="font-size:13.5px;line-height:1.6;color:#1B1713;margin-bottom:14px">⚡ <strong>${feature}</strong> is a Premium feature.</div>
    <button id="__sb_upgrade_btn__" style="width:100%;padding:9px 0;border:none;border-radius:20px;background:#E8786E;color:white;font-size:13px;font-weight:600;cursor:pointer;">Upgrade to Premium</button>
  `;
  __sbOpenCard({ rich: false });
  document.getElementById("__sb_upgrade_btn__")?.addEventListener("click", () => {
    window.open("https://trybraino.com/#pricing", "_blank");
  });
}

function __sbRunAgent(task) {
  if (!__sbContextOk()) { __sbShowBubble("Reload page to reconnect Braino.", true); return; }
  // Hand off to background — it runs the full agent loop and sends sbAgentUpdate messages back
  chrome.runtime.sendMessage({ action: "runBrainAgent", task }, () => { void chrome.runtime.lastError; });
}

function __sbShowLectureRecordingBar(show) {
  document.getElementById("__sb_rec_bar__")?.classList.toggle("active", show);
  const timerEl = document.getElementById("__sb_rec_timer__");
  if (!show && timerEl) timerEl.textContent = "00:00";
}

async function __sbStartLectureRecording() {
  if (!__sbContextOk()) {
    __sbShowBubble("Reload this page to reconnect Braino.", true);
    return;
  }
  if (__sbIsLectureRecording) return;
  __sbIsLectureRecording = true;
  __sbLectureNotes = "";

  const mode = window.__sbForcedMode || "page";
  const withMic = (mode === "meeting");

  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "startRecording", withMic }, (res) => {
        if (chrome.runtime.lastError || res?.error) reject(new Error(res?.error || chrome.runtime.lastError?.message || "Failed to start"));
        else resolve();
      });
    });
  } catch (err) {
    __sbIsLectureRecording = false;
    __sbShowBubble("Could not start recording: " + (err.message || "unknown error"), true);
    return;
  }

  document.getElementById("__sb_brain_btn__")?.classList.add("recording");
  __sbShowLectureRecordingBar(true);

  let seconds = 0;
  __sbLectureInterval = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    const timerEl = document.getElementById("__sb_rec_timer__");
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);

  const modeLabel = withMic ? "Meeting" : "Lecture";
  __sbShowBubble(`${modeLabel} recording started — brain is listening. Press ✂ Capture to save notes from what's been said.`, true, { tone: "status", title: `${modeLabel} Recording` });
}

async function __sbCaptureLectureSegment() {
  const captureBtn = document.getElementById("__sb_capture_btn__");
  if (captureBtn) captureBtn.classList.add("loading");

  try {
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getLectureSegment", existingNotes: __sbLectureNotes }, (r) => resolve(r || {}));
    });

    if (res.error) {
      __sbShowBubble("Capture failed: " + res.error, true, { tone: "status", title: "Recording" });
      return;
    }
    if (res.empty) {
      __sbShowBubble("Nothing recorded yet — speak a bit longer before capturing.", true, { tone: "status", title: "Recording" });
      return;
    }

    __sbLectureNotes = res.notes || __sbLectureNotes;
    if (__sbLectureNotes) __sbShowLectureNotes(__sbLectureNotes, false);
  } finally {
    if (captureBtn) captureBtn.classList.remove("loading");
  }
}

async function __sbStopLectureRecording() {
  if (__sbLectureInterval) { clearInterval(__sbLectureInterval); __sbLectureInterval = null; }
  document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
  __sbShowLectureRecordingBar(false);
  __sbIsLectureRecording = false;

  // Get final segment and stop recording simultaneously
  const [segRes] = await Promise.allSettled([
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getLectureSegment", existingNotes: __sbLectureNotes }, (r) => resolve(r || {}));
    }),
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "stopRecording" }, () => resolve());
    }),
  ]);

  const seg = segRes.status === "fulfilled" ? segRes.value : {};
  if (seg.notes) __sbLectureNotes = seg.notes;

  if (__sbLectureNotes) {
    __sbShowLectureNotes(__sbLectureNotes, true);
  } else {
    __sbShowBubble("Recording stopped. No content was captured — try using ✂ Capture during next session.", true, { tone: "status", title: "Recording" });
  }
}

function __sbShowLectureNotes(notes, isFinal) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbLastBubbleRaw = notes;
  const notionHtml = isFinal ? `
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(65,48,40,0.1)">
      <button id="__sb_notion_sync_btn__" class="sb-notion-btn">Sync to Notion</button>
    </div>
  ` : "";
  scroll.innerHTML = `<div class="sb-card-a">${__sbRenderMarkdown(notes)}</div>${notionHtml}`;
  __sbOpenCard({ rich: true });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (isFinal) {
    document.getElementById("__sb_notion_sync_btn__")?.addEventListener("click", __sbSyncNotesToNotion);
  }
}

async function __sbSyncNotesToNotion() {
  const btn = document.getElementById("__sb_notion_sync_btn__");
  if (btn) { btn.textContent = "Syncing…"; btn.disabled = true; }

  const title = "Lecture Notes — " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  try {
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "syncLectureToNotion", markdown: __sbLectureNotes, title }, (r) => resolve(r || {}));
    });

    if (res.error === "not_connected") {
      if (btn) { btn.textContent = "Connect Notion →"; btn.disabled = false; }
      btn?.addEventListener("click", () => window.open("https://trybraino.com/notion-sync", "_blank"), { once: true });
    } else if (res.error) {
      if (btn) { btn.textContent = "Sync failed — retry?"; btn.disabled = false; }
      btn?.addEventListener("click", __sbSyncNotesToNotion, { once: true });
    } else {
      if (btn) {
        btn.textContent = "✓ Synced to Notion";
        btn.style.background = "rgba(34,197,94,0.1)";
        btn.style.color = "#16a34a";
        btn.style.borderColor = "rgba(34,197,94,0.25)";
      }
    }
  } catch (err) {
    if (btn) { btn.textContent = "Sync failed — retry?"; btn.disabled = false; }
    btn?.addEventListener("click", __sbSyncNotesToNotion, { once: true });
  }
}

function __sbToggleRecording() {
  const mode = window.__sbForcedMode || "page";
  const isLectureMode = (mode === "lecture" || mode === "meeting");

  if (__sbIsLectureRecording) {
    void __sbStopLectureRecording();
    return;
  }
  if (isLectureMode) {
    void __sbStartLectureRecording();
    return;
  }
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
    __sbShowBubble("Voice playback stopped.", true, { tone: "status", title: "Voice" });
    return;
  }
  void __sbStartRecording();
}

function __sbStartRecording(options = {}) {
  if (!__sbContextOk()) {
    __sbShowBubble("Reload this page to reconnect Braino.", true, { tone: "status", title: "Voice" });
    return Promise.resolve(false);
  }

  __sbStopSpeech();
  const input = document.getElementById("__sb_input__");
  const cardInput = document.getElementById("__sb_card_input__");
  if (input) input.value = "";
  if (cardInput) cardInput.value = "";

  __sbIsRecording = true;
  __sbSetVoiceButtonState(true);

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "startInlineVoiceListening" }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        __sbIsRecording = false;
        __sbSetVoiceButtonState(false);
        const errorMessage = chrome.runtime.lastError?.message || res?.error || "Could not start voice capture.";
        if (!options.silent) {
          __sbShowBubble(`Voice error: ${errorMessage}`, true, { tone: "status", title: "Voice" });
        }
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function __sbStopRecording(options = {}) {
  chrome.runtime.sendMessage({ action: "stopInlineVoiceListening" }, () => { void chrome.runtime.lastError; });
  __sbIsRecording = false;
  __sbSetVoiceButtonState(false);
  if (!options.silent) {
    __sbShowBubble("Voice capture stopped.", true, { tone: "status", title: "Voice" });
  }
}

function __sbHandleRecordingUpdate(msg) {
  if (!__sbOwnsInlineUi()) return;
  if (msg.status === "transcript") {
    __sbShowBubble(msg.text || "Transcribing…", false, { tone: "status", title: "Recording" });
  } else if (msg.status === "done") {
    __sbIsRecording = false;
    document.getElementById("__sb_rec_btn__")?.classList.remove("active");
    document.getElementById("__sb_card_rec_btn__")?.classList.remove("active");
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble(msg.text || "Recording saved to dashboard.", true, { tone: "status", title: "Recording saved" });
  } else if (msg.status === "error") {
    __sbIsRecording = false;
    document.getElementById("__sb_brain_btn__")?.classList.remove("recording");
    __sbShowBubble("Recording error: " + (msg.error || "unknown"), true, { tone: "status", title: "Recording error" });
  }
}

function __sbHandleVoiceEvent(msg) {
  if (!__sbOwnsInlineUi()) return;
  if (msg.source !== "inline") return;

  const input = document.getElementById("__sb_input__");
  if (!__sbIsRecording && !__sbVoicePendingReply) return;

  if (msg.event === "listening") {
    __sbIsRecording = true;
    __sbSetVoiceButtonState(true);
    return;
  }

  if (msg.event === "transcript") {
    const transcript = String(msg.text || "").trim();
    if (!transcript) return;

    if (!msg.isFinal) {
      return;
    }

    __sbVoicePendingReply = true;
    __sbStopRecording({ silent: true });
    if (input) input.value = "";
    if (!__sbVoiceOnlyMode) __sbShowBubble("Thinking…", false, { tone: "status", title: "Voice" });
    void __sbProcessPrompt(transcript, { fromVoice: true });
    return;
  }

  if (msg.event === "error") {
    __sbVoicePendingReply = false;
    __sbStopRecording({ silent: true });
    const errorText = msg.error === "not-allowed"
      ? "Microphone access is blocked. Allow mic access and try again."
      : `Voice error: ${msg.error || "unknown error"}`;
    __sbShowBubble(errorText, true, { tone: "status", title: "Voice" });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => __sbBuildBrainUI(), { once: true });
} else {
  __sbBuildBrainUI();
}
} // end guard
  })();
}
