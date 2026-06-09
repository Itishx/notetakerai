if (globalThis.__SB_CONTENT_SCRIPT_BOOTSTRAP__ !== `${chrome.runtime?.id || "no-runtime"}:${chrome.runtime?.getManifest?.().version || "0"}`) {
  globalThis.__SB_CONTENT_SCRIPT_BOOTSTRAP__ = `${chrome.runtime?.id || "no-runtime"}:${chrome.runtime?.getManifest?.().version || "0"}`;

  (() => {
// Braino Content Script — extracts page text for AI context

// Sync Supabase session from website localStorage into extension storage so
// checkAuth finds a token even when the user logged in on the website (not via the extension auth tab).
if (location.hostname === 'trybraino.com') {
  const __sbSyncWebAuth = () => {
    try {
      const raw = localStorage.getItem('sb-suwhgaxxdizowbyjlljj-auth-token');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s?.access_token) return;
      const email = s.user?.email || null;
      const isInternalPremium = typeof email === "string" && email.trim().toLowerCase() === "itishpande21@gmail.com";
      chrome.storage.local.set({
        authToken: s.access_token,
        authRefreshToken: s.refresh_token || null,
        authEmail: email,
        authUserId: s.user?.id || null,
        authDisplayName: s.user?.user_metadata?.full_name || s.user?.user_metadata?.name || null,
        ...(isInternalPremium ? { isPremium: true, isPremiumCachedAt: Date.now() } : {}),
      });
    } catch {}
  };
  __sbSyncWebAuth();
  window.addEventListener('storage', (e) => {
    if (e.key === 'sb-suwhgaxxdizowbyjlljj-auth-token') __sbSyncWebAuth();
  });
}

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

function __sbSpotifyParseDurationParts(text) {
  const match = String(text || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return { minutes, seconds, totalSeconds: minutes * 60 + seconds };
}

function __sbSpotifyFindDurationText(text) {
  const matches = String(text || "").match(/\b\d{1,2}:\d{2}\b/g);
  return matches?.length ? matches[matches.length - 1] : "";
}

function __sbSpotifyGetVisibleText(nodes) {
  const values = [];
  const seen = new Set();
  for (const node of Array.from(nodes || [])) {
    if (!__sbAdapterIsVisible(node)) continue;
    const text = String(node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
    const normalized = __sbAdapterNormalizeText(text);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(text);
  }
  return values;
}

function __sbSpotifyGetRowMeta(row, anchor, title) {
  const imageUrl =
    row.querySelector('img[src]')?.getAttribute("src") ||
    row.querySelector('img[srcset]')?.getAttribute("src") ||
    "";
  const href = anchor?.getAttribute("href") || "";
  const artistNames = __sbSpotifyGetVisibleText(
    row.querySelectorAll('a[href*="/artist/"], [data-testid="entitySubtitle"] a, [aria-colindex="2"] a[href*="/artist/"]')
  );

  const rawArtists =
    artistNames.join(", ") ||
    row.querySelector('[data-testid="entitySubtitle"]')?.innerText ||
    row.querySelector('[aria-colindex="2"]')?.innerText ||
    "";
  const artists = String(rawArtists || "")
    .split(/[•\n]/)
    .map((part) => part.trim())
    .filter((part) => part && !__sbAdapterTextEquals(part, title))
    .join(", ");

  const album =
    row.querySelector('a[href*="/album/"]')?.innerText ||
    row.querySelector('[aria-colindex="3"] a')?.innerText ||
    row.querySelector('[aria-colindex="3"]')?.innerText ||
    "";

  const durationText =
    row.querySelector('[data-testid="track-duration"]')?.innerText ||
    row.querySelector('[aria-colindex="5"]')?.innerText ||
    row.querySelector('[aria-colindex="4"]')?.innerText ||
    __sbSpotifyFindDurationText(row.innerText || row.textContent || "");

  return {
    artists: String(artists || "").replace(/\s+/g, " ").trim(),
    album: String(album || "").replace(/\s+/g, " ").trim(),
    durationText: String(durationText || "").replace(/\s+/g, " ").trim(),
    imageUrl: String(imageUrl || "").trim(),
    href: href ? new URL(href, location.origin).href : "",
  };
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

    const meta = __sbSpotifyGetRowMeta(row, anchor, title || rowText);
    entries.push({
      row,
      anchor: anchor || row.querySelector('a[href*="/track/"]') || row,
      title: title || rowText,
      rowText,
      artists: meta.artists,
      album: meta.album,
      durationText: meta.durationText,
      imageUrl: meta.imageUrl,
      href: meta.href,
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

function __sbSpotifyGetNowPlaying() {
  const titleEl = __sbAdapterDeepQueryAll([
    '[data-testid="context-item-link"]',
    '[data-testid="context-item-info-title"] a',
    '[data-testid="now-playing-widget"] a[href*="/track/"]',
    'footer a[href*="/track/"]',
  ].join(",")).find((el) => __sbAdapterIsVisible(el));
  const title = String(titleEl?.innerText || titleEl?.textContent || "").replace(/\s+/g, " ").trim();
  if (!title) return null;

  const artistNodes = __sbAdapterDeepQueryAll([
    '[data-testid="context-item-info-artist"] a',
    '[data-testid="context-item-info-subtitles"] a[href*="/artist/"]',
    '[data-testid="now-playing-widget"] a[href*="/artist/"]',
    'footer a[href*="/artist/"]',
  ].join(","));
  const artists = __sbSpotifyGetVisibleText(artistNodes).join(", ");

  const imageEl = __sbAdapterDeepQueryAll([
    '[data-testid="cover-art-image"] img',
    '[data-testid="cover-art-image"]',
    '[data-testid="now-playing-widget"] img',
    'footer img[src]',
  ].join(",")).find((el) => __sbAdapterIsVisible(el));
  const imageUrl = imageEl?.tagName === "IMG"
    ? (imageEl.getAttribute("src") || imageEl.src || "")
    : (imageEl?.querySelector?.("img")?.getAttribute("src") || "");

  const currentTime =
    __sbAdapterDeepQueryAll('[data-testid="playback-position"], [aria-label*="Playback position"], footer [data-testid="playback-position"]')
      .find((el) => __sbAdapterIsVisible(el))?.innerText ||
    "";
  const durationText =
    __sbAdapterDeepQueryAll('[data-testid="playback-duration"], [aria-label*="Playback duration"], footer [data-testid="playback-duration"]')
      .find((el) => __sbAdapterIsVisible(el))?.innerText ||
    "";

  const pauseButton = __sbAdapterDeepQueryAll([
    'button[data-testid="control-button-pause"]',
    'footer button[aria-label*="Pause"]',
    '[data-testid="player-controls"] button[aria-label*="Pause"]',
  ].join(",")).find((el) => __sbAdapterIsVisible(el));
  const playButton = __sbAdapterDeepQueryAll([
    'button[data-testid="control-button-play"]',
    'footer button[aria-label*="Play"]',
    '[data-testid="player-controls"] button[aria-label*="Play"]',
  ].join(",")).find((el) => __sbAdapterIsVisible(el));
  const playing = pauseButton ? true : (playButton ? false : Boolean(currentTime && durationText));

  const progressParts = __sbSpotifyParseDurationParts(currentTime);
  const durationParts = __sbSpotifyParseDurationParts(durationText);
  const progressRatio = (progressParts && durationParts?.totalSeconds)
    ? Math.max(0, Math.min(1, progressParts.totalSeconds / durationParts.totalSeconds))
    : null;

  const deviceEl = __sbAdapterDeepQueryAll([
    'button[data-testid="device-picker-button"]',
    'button[aria-label*="device"]',
    'button[title*="device"]',
  ].join(",")).find((el) => __sbAdapterIsVisible(el));
  const deviceName = String(
    deviceEl?.innerText ||
    deviceEl?.textContent ||
    deviceEl?.getAttribute("aria-label") ||
    deviceEl?.getAttribute("title") ||
    ""
  ).replace(/\s+/g, " ").trim();

  return {
    title,
    artists,
    imageUrl: String(imageUrl || "").trim(),
    href: titleEl?.getAttribute("href") ? new URL(titleEl.getAttribute("href"), location.origin).href : "",
    progressText: String(currentTime || "").replace(/\s+/g, " ").trim(),
    durationText: String(durationText || "").replace(/\s+/g, " ").trim(),
    progressRatio,
    isPlaying: playing,
    deviceName,
  };
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

async function __sbSpotifyPlayFirstTrackResult(songName) {
  const scrollEl = __sbAdapterGetScrollContainer();

  for (let attempt = 0; attempt < 10; attempt++) {
    const entries = __sbSpotifyGetVisibleTrackEntries();
    const target =
      entries.find((entry) => __sbAdapterTextEquals(entry.title, songName)) ||
      entries.find((entry) => __sbAdapterTextIncludes(entry.title, songName)) ||
      entries.find((entry) => __sbAdapterTextIncludes(entry.rowText, songName)) ||
      entries[0];

    if (target) {
      const playButton =
        target.row.querySelector('button[aria-label*="Play"]') ||
        target.row.querySelector('[data-testid="play-button"]') ||
        target.row.querySelector('button[aria-label*="play"]');

      if (playButton) __sbAdapterClick(playButton);
      else __sbAdapterClick(target.anchor);
      return { success: true, track: target.title };
    }

    const before = scrollEl.scrollTop;
    scrollEl.scrollBy({ top: Math.max(scrollEl.clientHeight * 0.75, 360), behavior: "auto" });
    await __sbAdapterWait(180);
    if (Math.abs(scrollEl.scrollTop - before) < 8) break;
  }

  return { error: `No playable Spotify track result was found for "${songName}".` };
}

// Set the Spotify WEB PLAYER volume directly via its media element. The Spotify Web
// API cannot control the web player's volume, so we do it in the DOM where Braino lives.
function __sbSpotifySetVolume(volumePercent, volumeStep) {
  // Drive Spotify's own volume slider via its data-testid — more reliable than
  // querySelectorAll("audio") which misses their shadow-DOM / iframe audio nodes.
  const slider = document.querySelector('[data-testid="volume-bar"] input[type="range"]')
    || document.querySelector('[data-testid="volume-bar-slider"]')
    || document.querySelector('.volume-bar input[type="range"]');

  let current = 50;
  if (slider) {
    const sMin = parseFloat(slider.min || "0");
    const sMax = parseFloat(slider.max || "1");
    const raw = parseFloat(slider.value || "0");
    current = Math.round(((raw - sMin) / Math.max(sMax - sMin, 0.001)) * 100);
  }

  let target;
  if (typeof volumePercent === "number" && !Number.isNaN(volumePercent)) {
    target = volumePercent;
  } else {
    target = current + (Number(volumeStep) || 0);
  }
  target = Math.min(100, Math.max(0, Math.round(target)));

  if (slider) {
    // Spotify's slider range is 0–1, not 0–100. Scale target into slider's actual range.
    const sMin = parseFloat(slider.min || "0");
    const sMax = parseFloat(slider.max || "1");
    const scaledValue = sMin + (target / 100) * (sMax - sMin);
    // React-controlled input: set nativeInputValueSetter then fire synthetic events.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeInputValueSetter) nativeInputValueSetter.call(slider, scaledValue);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true, volumePercent: target };
  }

  // Fallback: try HTML audio/video elements (works on some setups)
  const media = [...document.querySelectorAll("audio, video")];
  let applied = false;
  media.forEach((el) => {
    try { if (target > 0 && el.muted) el.muted = false; el.volume = target / 100; applied = true; } catch (_) {}
  });
  return { ok: applied, volumePercent: target };
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

function __sbGmailNormalizeText(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function __sbGmailVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function __sbGmailFindSearchInput() {
  const selectors = [
    'input[placeholder*="Search mail"]',
    'input[aria-label*="Search mail"]',
    'input[name="q"]',
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && __sbGmailVisible(el)) return el;
  }
  return null;
}

function __sbGmailSetInputValue(input, value) {
  if (!input) return false;
  try { input.focus(); } catch(_) {}
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function __sbGmailFindOpenComposeDialog() {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  return dialogs.find((dialog) => __sbGmailVisible(dialog) && dialog.querySelector('input[name="subjectbox"], input[placeholder*="Subject"], textarea[name="to"]'))
    || null;
}

function __sbGmailFindComposeField(selectors, root = document) {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el && __sbGmailVisible(el)) return el;
  }
  return null;
}

function __sbGmailFindComposeBody(root = document) {
  const selectors = [
    'div[role="textbox"][aria-label*="Message Body"]',
    'div[role="textbox"][g_editable="true"]',
    'div[contenteditable="true"][aria-label*="Message Body"]',
  ];
  return __sbGmailFindComposeField(selectors, root);
}

function __sbGmailFindReplyButton() {
  const candidates = Array.from(document.querySelectorAll('span[role="link"], div[role="button"], span[role="button"], button'));
  return candidates.find((el) => {
    if (!__sbGmailVisible(el)) return false;
    const text = __sbGmailNormalizeText(el.innerText || el.textContent || el.getAttribute("aria-label") || "");
    return /^reply$/i.test(text) || /^reply to all$/i.test(text);
  }) || null;
}

function __sbGmailFindSendButton(root = document) {
  const selectors = [
    'div[role="button"][aria-label^="Send"]',
    'div[role="button"][data-tooltip^="Send"]',
    'button[aria-label^="Send"]',
  ];
  return __sbGmailFindComposeField(selectors, root);
}

async function __sbGmailSearch(query) {
  const input = __sbGmailFindSearchInput();
  if (!input) return { error: "Gmail search box was not found." };
  if (!__sbGmailSetInputValue(input, String(query || "").trim())) {
    return { error: "Gmail search query could not be entered." };
  }
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  return { success: true, query: String(query || "").trim() };
}

async function __sbGmailFillComposeFields({ to, subject, body }, options = {}) {
  const root = __sbGmailFindOpenComposeDialog() || document;
  const toField = __sbGmailFindComposeField([
    'textarea[name="to"]',
    'input[aria-label*="Recipients"]',
    'input[peoplekit-id]',
  ], root);
  const subjectField = __sbGmailFindComposeField([
    'input[name="subjectbox"]',
    'input[placeholder*="Subject"]',
  ], root);
  const bodyField = __sbGmailFindComposeBody(root);

  if (to && toField) __sbGmailSetInputValue(toField, to);
  if (subject && subjectField) __sbGmailSetInputValue(subjectField, subject);

  if (body && bodyField) {
    try { bodyField.focus(); } catch(_) {}
    bodyField.click?.();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const text = String(body || "");
    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    } catch(_) {}
    const inserted = document.execCommand("insertText", false, text);
    if (!inserted || !__sbGmailNormalizeText(bodyField.innerText || bodyField.textContent)) {
      bodyField.textContent = text;
      bodyField.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }));
    }
  }

  if (!options.requireBody && (to || subject || body)) {
    return { success: true };
  }
  if (body && !bodyField) return { error: "Gmail message body field was not found." };
  return { success: true };
}

async function __sbGmailSendOpenCompose() {
  const root = __sbGmailFindOpenComposeDialog() || document;
  const sendButton = __sbGmailFindSendButton(root);
  if (!sendButton) return { error: "Gmail Send button was not found." };
  sendButton.click();
  return { success: true };
}

async function __sbGmailReplyToCurrentThread(body, options = {}) {
  const replyButton = __sbGmailFindReplyButton();
  if (!replyButton) return { error: "Reply button was not found in the current Gmail thread." };
  replyButton.click();
  await new Promise((resolve) => setTimeout(resolve, 700));
  const filled = await __sbGmailFillComposeFields({ body }, { requireBody: true });
  if (filled?.error) return filled;
  if (options.send) {
    return __sbGmailSendOpenCompose();
  }
  return { success: true };
}

function __sbGetSiteAdapterContext() {
  const url = window.location.href;
  const host = window.location.hostname;

  if (/spotify\.com$/.test(host)) {
    const visibleTracks = __sbSpotifyGetVisibleTrackEntries().slice(0, 12);
    return {
      site: "spotify",
      url,
      title: document.title,
      currentPlaylistName: __sbSpotifyGetCurrentPlaylistName(),
      visiblePlaylists: __sbSpotifyGetPlaylistLinks().slice(0, 20).map((entry) => entry.text),
      visibleTracks: visibleTracks.map((entry) => entry.title),
      visibleTrackDetails: visibleTracks.map((entry) => ({
        title: entry.title,
        artists: entry.artists,
        album: entry.album,
        durationText: entry.durationText,
        imageUrl: entry.imageUrl,
        href: entry.href,
      })),
      nowPlaying: __sbSpotifyGetNowPlaying(),
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

  if (/drive\.google\.com$/.test(host)) {
    return {
      site: "google-drive",
      url,
      title: document.title,
    };
  }

  if (/mail\.google\.com$/.test(host)) {
    return {
      site: "gmail",
      url,
      title: document.title,
    };
  }

  return { site: "generic", url, title: document.title };
}

function __sbNormalizeConnectorName(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key || key === "auto" || key === "default") return "auto";
  if (["spotify", "spot", "music"].includes(key)) return "spotify";
  if (["drive", "gdrive", "google-drive", "google_drive"].includes(key)) return "google-drive";
  if (["gmail", "mail", "google-mail", "googlemail"].includes(key)) return "gmail";
  return null;
}

function __sbGetConnectorSiteSuggestion(siteContext) {
  const site = siteContext?.site || "generic";
  if (site === "spotify") return "spotify";
  if (site === "google-drive") return "google-drive";
  if (site === "gmail") return "gmail";
  return "auto";
}

function __sbGetEffectiveConnector(siteContext) {
  const forced = __sbNormalizeConnectorName(window.__sbForcedConnector);
  if (forced && forced !== "auto") return forced;
  return __sbGetConnectorSiteSuggestion(siteContext || __sbGetSiteAdapterContext());
}

function __sbInferConnectorFromPrompt(promptText) {
  const text = String(promptText || "").trim().toLowerCase();
  if (/\bgoogle drive\b|\bdrive\b/.test(text)) return "google-drive";
  if (/\bgmail\b|\bemail\b|\bmail\b/.test(text)) return "gmail";
  if (/\bspotify\b/.test(text) || /^play\s+/i.test(promptText)) return "spotify";
  return "auto";
}

function __sbGetConnectorLabel(connector, options = {}) {
  const key = __sbNormalizeConnectorName(connector) || "auto";
  const includeAutoHint = Boolean(options.includeAutoHint);
  if (key === "spotify") return "♪ Spotify";
  if (key === "google-drive") return "🗂 Drive";
  if (key === "gmail") return "✉ Gmail";
  if (includeAutoHint) {
    const suggestion = __sbGetConnectorSiteSuggestion(options.siteContext || __sbGetSiteAdapterContext());
    if (suggestion === "spotify") return "↗ Auto · Spotify";
    if (suggestion === "google-drive") return "↗ Auto · Drive";
    if (suggestion === "gmail") return "↗ Auto · Gmail";
  }
  return "↗ Auto";
}

function __sbRefreshConnectorButtons() {
  const primaryLabel = document.getElementById("__sb_connector_label__");
  const cardLabel = document.getElementById("__sb_card_connector_label__");
  if (!primaryLabel || !cardLabel) return;
  const siteContext = __sbGetSiteAdapterContext();
  const forced = __sbNormalizeConnectorName(window.__sbForcedConnector) || "auto";
  const effective = __sbGetEffectiveConnector(siteContext);
  const label = __sbGetConnectorLabel(forced === "auto" ? "auto" : forced, {
    includeAutoHint: forced === "auto",
    siteContext,
  });
  primaryLabel.textContent = label;
  cardLabel.textContent = label;
  document.getElementById("__sb_connector_btn__")?.classList.toggle("active-mode", effective !== "auto");
  document.getElementById("__sb_card_connector_btn__")?.classList.toggle("active-mode", effective !== "auto");
  document.querySelectorAll("#__sb_connector_dropdown__ .sb-dropdown-item").forEach((item) => {
    item.classList.toggle("selected", item.getAttribute("data-connector") === forced);
  });
}

function __sbShouldConnectorForceAgent(connector, promptText, forcedMode, siteContext) {
  if (forcedMode !== "page") return false;
  const key = __sbNormalizeConnectorName(connector) || "auto";
  if (key === "auto") return false;
  const text = String(promptText || "").trim().toLowerCase();
  if (!text) return false;
  if (__sbIsExplicitWebSearchRequest(text)) return false;
  if (/\b(record|transcribe|capture audio|start listening|start recording)\b/.test(text)) return false;
  if (__sbIsBrowserActionCommand(text)) return true;
  if (key === "google-drive") {
    return /\b(create|make|find|search|look for|rename|move|delete|remove|trash|organize|organise|organhise|sort|clean|tidy|arrange|list|show|open|take)\b/.test(text);
  }
  if (key === "gmail") {
    return /\b(reply|draft|compose|send|archive|label|star|read|open|find|search|show|summarize|triage|email)\b/.test(text);
  }
  if (key === "spotify") {
    return /\b(play|pause|resume|continue|next|previous|prev|back|skip|stop|shuffle|repeat|song|track|music|playlist|spotify)\b/.test(text);
  }
  return false;
}

function __sbParseConnectorDirective(rawText) {
  const text = String(rawText || "").trim();
  const match = text.match(/^\/([a-z-]+)\b([\s\S]*)$/i);
  if (!match) return { connector: null, task: text };
  const connector = __sbNormalizeConnectorName(match[1]);
  if (!connector) return { connector: null, task: text };
  return {
    connector,
    task: String(match[2] || "").trim(),
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractPageContent") {
    const text = (document.body?.innerText || "").substring(0, 12000);
    const title = document.title || "";
    const url = window.location.href || "";
    const faviconUrl = document.querySelector("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")?.href || "";
    const hoveredContext = __sbGetHoveredContext();
    sendResponse({ text, title, url, faviconUrl, hoveredContext });
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
        if (msg.type === "spotifyPlayFirstTrackResult") {
          sendResponse(await __sbSpotifyPlayFirstTrackResult(msg.songName || ""));
          return;
        }
        if (msg.type === "spotifySetVolume") {
          sendResponse(__sbSpotifySetVolume(
            typeof msg.volumePercent === "number" ? msg.volumePercent : null,
            msg.volumeStep,
          ));
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
        if (msg.type === "mediumReadSearchResults") {
          const selectors = [
            "article h2", "article h3",
            "[data-testid='post-preview'] h2",
            "h2 a", "h3 a",
          ];
          const seen = new Set();
          const articles = [];
          for (const sel of selectors) {
            for (const el of document.querySelectorAll(sel)) {
              const title = el.innerText?.trim();
              if (!title || seen.has(title)) continue;
              seen.add(title);
              const anchor = el.tagName === "A" ? el : (el.closest("a") || el.querySelector("a"));
              articles.push({ title, url: anchor?.href || "" });
              if (articles.length >= (msg.limit || 5)) break;
            }
            if (articles.length >= (msg.limit || 5)) break;
          }
          sendResponse({ articles });
          return;
        }
        if (msg.type === "xReadFeed") {
          const tweets = [...document.querySelectorAll('[data-testid="tweet"]')];
          const posts = tweets.slice(0, msg.limit || 5).map(el => ({
            author: el.querySelector('[data-testid="User-Name"]')?.innerText?.split("\n")[0] || "someone",
            text: el.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || "",
          })).filter(p => p.text);
          sendResponse({ posts });
          return;
        }
        if (msg.type === "googleDocsWriteArticle") {
          sendResponse(await __sbGoogleDocsWriteArticle(msg.title || "", msg.body || ""));
          return;
        }
        if (msg.type === "gmailSearch") {
          sendResponse(await __sbGmailSearch(msg.query || ""));
          return;
        }
        if (msg.type === "gmailFillCompose") {
          sendResponse(await __sbGmailFillComposeFields({
            to: msg.to || "",
            subject: msg.subject || "",
            body: msg.body || "",
          }));
          return;
        }
        if (msg.type === "gmailSendOpenCompose") {
          sendResponse(await __sbGmailSendOpenCompose());
          return;
        }
        if (msg.type === "gmailReplyToCurrentThread") {
          sendResponse(await __sbGmailReplyToCurrentThread(msg.body || "", { send: !!msg.send }));
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
        const requestedMaxChars = Number(msg.maxChars || msg.maxLength || 0);
        const maxChars = Number.isFinite(requestedMaxChars) && requestedMaxChars > 0
          ? Math.min(Math.max(Math.floor(requestedMaxChars), 200), 8000)
          : null;
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
          sendResponse({ success: true, text: document.body?.innerText?.slice(0, maxChars || 800) || "(empty)" });
        } else {
          // For select elements, return all options
          if (el.tagName === "SELECT") {
            const opts = Array.from(el.options).map(o => o.text.trim()).join(", ");
            sendResponse({ success: true, text: `Options: ${opts} | Selected: ${el.options[el.selectedIndex]?.text}` });
          } else {
            sendResponse({ success: true, text: (el.innerText || el.textContent || "").trim().slice(0, maxChars || 500) });
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

  if (msg.action === "voiceTransportStatus") {
    const labelMap = { realtime: "Live AI", legacy: "Legacy", error: "Error", connecting: "Waking up…" };
    __sbSetVoiceStatusBadge(msg.status, labelMap[msg.status] || msg.status);
    return true;
  }

  if (msg.action === "voiceBrainState") {
    if (__sbHeadphoneMode) __sbSetHpBrainState(msg.state || "");
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

// Track the element under the cursor so Braino can answer "what's this?"
let __sbHoverContext = null;
let __sbHoverSignature = "";
let __sbHoverPoint = {
  x: Math.max(32, window.innerWidth - 32),
  y: Math.max(32, window.innerHeight - 32),
};
let __sbHoverUpdateQueued = false;

function __sbNormalizeHoverText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function __sbLimitHoverText(value, max = 240) {
  const normalized = __sbNormalizeHoverText(value);
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function __sbCloneHoverContext(value) {
  return value && typeof value === "object" ? { ...value } : null;
}

function __sbIsOwnUiNode(node) {
  return !!node?.closest?.([
    "#__sb_root__",
    "#__sb_card_wrap__",
    "#__sb_mode_dropdown__",
    "#__sb_connector_dropdown__",
    "#__sb_model_dropdown__",
    "#__sb_connector_slash_dropdown__",
    "#__sb_voice_error_pill__",
  ].join(","));
}

function __sbGetHoverAnchor(target) {
  if (!(target instanceof Element)) return null;
  if (__sbIsOwnUiNode(target)) return null;

  const anchor = target.closest([
    "a[href]",
    "button",
    "input",
    "textarea",
    "select",
    "label",
    "summary",
    "[role='button']",
    "[role='link']",
    "[role='menuitem']",
    "[role='tab']",
    "[role='option']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='switch']",
    "img",
    "video",
    "audio",
    "figure",
    "figcaption",
    "li",
    "td",
    "th",
    "tr",
    "article",
    "section",
    "nav",
    "aside",
    "[data-testid]",
    "[aria-label]",
    "[title]",
  ].join(","));

  return anchor || target;
}

function __sbFindHoverHeading(anchor) {
  const containers = [
    anchor.closest("section, article, main, aside, nav, form, dialog, [role='region'], li, figure"),
    anchor.closest("table"),
  ];

  for (const container of containers) {
    if (!(container instanceof Element)) continue;
    const heading = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
      .find((candidate) => __sbAdapterIsVisible(candidate));
    const text = __sbLimitHoverText(heading?.innerText || heading?.textContent || "", 160);
    if (text) return text;
  }

  return "";
}

function __sbFindHoverNearbyText(anchor, primaryText) {
  const normalizedPrimary = __sbNormalizeHoverText(primaryText);
  const candidates = [
    anchor,
    anchor.closest("label, button, a, li, td, th, tr, figure, figcaption, article, section, nav, aside, p, div"),
    anchor.parentElement,
    anchor.closest("main, article, section"),
  ];
  const seen = new Set();

  for (const candidate of candidates) {
    if (!(candidate instanceof Element) || seen.has(candidate) || __sbIsOwnUiNode(candidate)) continue;
    seen.add(candidate);
    const text = __sbLimitHoverText(candidate.innerText || candidate.textContent || "", 320);
    if (!text) continue;
    if (normalizedPrimary && __sbAdapterNormalizeText(text) === __sbAdapterNormalizeText(normalizedPrimary)) continue;
    if (normalizedPrimary && text.length <= normalizedPrimary.length + 8) continue;
    return text;
  }

  return "";
}

function __sbBuildHoverContext(target) {
  const anchor = __sbGetHoverAnchor(target);
  if (!(anchor instanceof Element) || __sbIsOwnUiNode(anchor)) return null;

  const rect = anchor.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const tag = String(anchor.tagName || "").toLowerCase();
  if (!tag || tag === "html" || tag === "body") return null;

  const label = __sbLimitHoverText(
    anchor.getAttribute("aria-label") ||
    anchor.getAttribute("title") ||
    anchor.getAttribute("placeholder") ||
    anchor.getAttribute("alt") ||
    ((anchor instanceof HTMLInputElement || anchor instanceof HTMLTextAreaElement || anchor instanceof HTMLSelectElement)
      ? anchor.value
      : ""),
    180,
  );
  const rawText = tag === "img"
    ? (anchor.getAttribute("alt") || anchor.getAttribute("title") || anchor.getAttribute("aria-label") || "")
    : (anchor.innerText || anchor.textContent || "");
  const text = __sbLimitHoverText(rawText, 260);
  const heading = __sbFindHoverHeading(anchor);
  const nearbyText = __sbFindHoverNearbyText(anchor, text || label);
  const linkEl = anchor.matches("a[href]") ? anchor : anchor.closest("a[href]");
  let href = "";
  try {
    const rawHref = linkEl?.getAttribute("href") || "";
    href = rawHref ? new URL(rawHref, location.href).href : "";
  } catch {}

  const role = __sbLimitHoverText(anchor.getAttribute("role") || "", 60);
  const inputType = __sbLimitHoverText(anchor.getAttribute("type") || "", 40);

  if (!text && !label && !heading && !nearbyText && !href) return null;

  return {
    tag,
    role,
    inputType,
    label,
    text,
    heading,
    nearbyText,
    href,
  };
}

function __sbHoverContextSignature(context) {
  if (!context) return "";
  return JSON.stringify([
    context.tag || "",
    context.role || "",
    context.inputType || "",
    context.label || "",
    context.text || "",
    context.heading || "",
    context.nearbyText || "",
    context.href || "",
  ]);
}

function __sbEmitHoverContextChanged(context) {
  try {
    const result = chrome.runtime.sendMessage({
      action: "hoverContextChanged",
      hoveredContext: __sbCloneHoverContext(context),
      url: window.location.href,
      title: document.title,
    });
    result?.catch?.(() => {});
  } catch {}
}

function __sbUpdateHoverContextFromPoint(clientX, clientY, options = {}) {
  __sbHoverPoint = { x: clientX, y: clientY };
  const target = document.elementFromPoint(clientX, clientY);
  const nextContext = __sbBuildHoverContext(target);
  const nextSignature = __sbHoverContextSignature(nextContext);

  if (!options.force && nextSignature === __sbHoverSignature) return;

  __sbHoverContext = nextContext;
  __sbHoverSignature = nextSignature;
  __sbEmitHoverContextChanged(nextContext);
}

function __sbScheduleHoverContextUpdate(clientX, clientY, options = {}) {
  __sbHoverPoint = { x: clientX, y: clientY };
  if (options.force) {
    __sbUpdateHoverContextFromPoint(clientX, clientY, options);
    return;
  }
  if (__sbHoverUpdateQueued) return;
  __sbHoverUpdateQueued = true;
  requestAnimationFrame(() => {
    __sbHoverUpdateQueued = false;
    __sbUpdateHoverContextFromPoint(__sbHoverPoint.x, __sbHoverPoint.y);
  });
}

function __sbGetHoveredContext() {
  return __sbCloneHoverContext(__sbHoverContext);
}

document.addEventListener("mousemove", (event) => {
  __sbScheduleHoverContextUpdate(event.clientX, event.clientY);
  __sbScheduleCursorFollow();
}, { passive: true, capture: true });

window.addEventListener("scroll", () => {
  __sbScheduleHoverContextUpdate(__sbHoverPoint.x, __sbHoverPoint.y, { force: true });
}, { passive: true });

window.addEventListener("resize", () => {
  __sbScheduleCursorFollow();
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden || !__sbHoverSignature) return;
  __sbHoverContext = null;
  __sbHoverSignature = "";
  __sbEmitHoverContextChanged(null);
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
const __SB_API = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";
const __SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";

function __sbContextOk() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}
function __sbStorageGet(keys) {
  return new Promise((res) => {
    if (!__sbContextOk()) { res({}); return; }
    chrome.storage.local.get(keys, res);
  });
}
function __sbRuntimeMessage(message) {
  return new Promise((resolve) => {
    if (!__sbContextOk()) { resolve(null); return; }
    try {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(res || null);
      });
    } catch {
      resolve(null);
    }
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

// Animated SVG — groups have IDs so CSS keyframes can drive idle behaviour.
// sbb-arm-l / sbb-arm-r : arm pivot groups (rotate at shoulder origin)
// sbb-pupil-l / sbb-pupil-r : pupil + highlight pairs (translate for gaze drift)
// sbb-eye-l / sbb-eye-r : eye whites (scaleY for blink)
const __SB_BRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="52" height="52"><defs><linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbb-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/><path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/><g id="sbb-arm-l" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><g id="sbb-arm-r" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#sbb-dark)"/><path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#sbb-dark)"/><path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-fill)"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><g id="sbb-arm-l-fill" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="6" cy="63" r="5.5" fill="url(#sbb-fill)"/></g><g id="sbb-arm-r-fill" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="94" cy="63" r="5.5" fill="url(#sbb-fill)"/></g><g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g><g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g><g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g><g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/></svg>`;


const __SB_BRAIN_SVG_ORBIT = __SB_BRAIN_SVG.replace('width="52" height="52"', 'width="40" height="40"');

// Pupils shifted up-left to look toward top-left (center of screen when brain is at bottom-right)
// Pupils are now inside <g id="sbb-pupil-*"> wrappers — target the content inside.
const __SB_BRAIN_SVG_LISTENING = __SB_BRAIN_SVG
  .replace('<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
           '<g id="sbb-pupil-l"><circle cx="36.2" cy="46.5" r="3.2" fill="#1B1713"/><circle cx="37.2" cy="45.1" r="1.1" fill="white"/></g>')
  .replace('<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
           '<g id="sbb-pupil-r"><circle cx="60.2" cy="46.5" r="3.2" fill="#1B1713"/><circle cx="61.2" cy="45.1" r="1.1" fill="white"/></g>');

// Eye whites + pupils are now in separate <g id> groups — replace each group's content.
const __SB_BRAIN_SVG_SLEEPING = __SB_BRAIN_SVG
  .replace('<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g>')
  .replace('<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-l"><path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round"/></g>')
  .replace('<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g>')
  .replace('<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-r"><path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round"/></g>')
  .replace('<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
    '<ellipse cx="28" cy="58" rx="4" ry="2.5" fill="#E14A48" opacity="0.5"/><ellipse cx="72" cy="58" rx="4" ry="2.5" fill="#E14A48" opacity="0.5"/>')
  .replace('<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M 46 62 Q 50 62 54 62" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>');

let __sbBrainVisible = false;
let __sbInputOpen = false;
let __sbIsRecording = false;
let __sbVoiceOnlyMode = false;
let __sbHeadphoneMode = false;
let __sbCursorRideMode = false;
let __sbVoiceSilenceTimer = null;
let __sbLastFinalTranscript = null;
let __sbChatHistory = [];
let __sbCardTurns = []; // {prompt, answer}[] — persists across calls for scrollable history
let __sbThinkingEl = null;
let __sbVoicePendingReply = false;
let __sbIsSpeaking = false;
let __sbCurrentSpeechAudio = null;
let __sbCurrentSpeechUrl = null;
let __sbCurrentUtterance = null;
let __sbSpeechGeneration = 0;
const __SB_TTS_PROVIDER = "elevenlabs";
const __SB_TTS_ENDPOINT = "elevenlabs-tts";
const __SB_TTS_RETRY_MIN_MS = 5000;
const __SB_TTS_RETRY_MAX_MS = 12000;
const __SB_ELEVENLABS_VOICE_ID = "PI9w0jWUtb68a6R6eQbl";
let __sbIsLectureRecording = false;
let __sbLectureNotes = "";
let __sbLectureInterval = null;
let __sbLecSegmentCount = 0;
let __sbSpotifyUiState = {
  active: false,
  source: "spotify",
  intent: "",
  query: "",
  currentPlaylistName: "",
  searchResults: [],
  nowPlaying: null,
  summary: "",
  updatedAt: 0,
};
let __sbSpotifyRefreshTimer = null;
let __sbCursorFollowRaf = 0;
let __sbCursorFollowNeedsFrame = false;
let __sbCursorFollowPosition = null;
let __sbLastAgentTask = "";

// Dashboard (trybraino.com) can set voice preference via postMessage
window.addEventListener("message", (event) => {
  if (event.data?.type !== "sbSetVoicePref") return;
  const pref = __sbNormalizeVoiceOutputPref(event.data.pref);
  __sbVoiceOutputPref = pref;
  chrome.storage.local.set({ brainoVoicePref: pref });
});

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
    if (msg.action === "startXAutomation") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      if (!__sbIsOnX()) {
        sendResponse({ ok: false, error: "This tab is not X." });
        return false;
      }
      if (__sbXRunning) {
        __sbShowBubble('X Automation is already running.', false, { tone: 'status', title: 'X Automation' });
        sendResponse({ ok: true, alreadyRunning: true });
        return false;
      }
      void __sbRunXAutomation({ startOnly: true });
      sendResponse({ ok: true });
      return false;
    }
    if (msg.action === "sbAgentUpdate") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      if (msg.final) {
        // Voice mode speaks the result with no panel; chat mode shows it.
        const agentPrompt = String(msg.task || __sbLastAgentTask || "").trim();
        if (!__sbVoiceOnlyMode) __sbShowBubble(msg.text, false, { rich: true, kicker: "Braino", prompt: agentPrompt });
        __sbSetStopBtn(false);
        if (__sbRtAwaitingDelegateResult) {
          const finalText = String(msg.text || "").trim();
          __sbRtAwaitingDelegateResult = false;
          if (finalText) {
            void (async () => {
              __sbRtRelayingAppMessage = true;
              try {
                await __sbSpeakWithPreferredVoice(finalText, "realtime");
              } finally {
                __sbRtRelayingAppMessage = false;
                __sbCompleteRealtimeCostTurn({ force: true });
                if (__sbHeadphoneMode && !__sbVoicePendingReply) {
                  __sbSetHpBrainState("listening");
                }
              }
            })();
          } else {
            __sbCompleteRealtimeCostTurn({ force: true });
          }
        }
      } else {
        if (!__sbVoiceOnlyMode) __sbShowBubble(msg.text, false, { tone: "status" });
        __sbSetStopBtn(true);
        // Speak milestone hints in voice mode without flooding the user
        if (msg.speakHint && __sbHeadphoneMode && !__sbRtRelayingAppMessage) {
          void __sbSpeakWithPreferredVoice(msg.speakHint, "realtime");
        }
      }
    }
    if (msg.action === "sbSpotifyState") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      // FIX 3: never auto-open the inline Spotify modal on an action. Spotify opens in a
      // new tab and Braino confirms verbally; we only update internal state (mascot
      // visual). The panel still re-renders if the user already has it open, and the
      // manual Spotify-visual click stays unaffected.
      __sbApplySpotifyState(msg.state || {}, { openCard: false, focusSpotify: false });
    }
    if (msg.action === "rtVoiceYield") {
      // Another tab took over voice — stand down here so only one runs. Crucially, do NOT
      // clear the global sbVoiceModeOn flag (that would turn voice off everywhere); just
      // release this tab's presence. __sbReleaseVoicePresence keeps the global session
      // alive in offscreen mode and tears down only the in-tab session otherwise.
      if (__sbHeadphoneMode) __sbReleaseVoicePresence();
      else if (__sbIsRealtimeVoiceReady()) __sbCleanupRealtimeVoice({ reason: "yielded_to_other_tab" });
    }
    // ── Offscreen realtime events ──────────────────────────────────────────
    if (msg.action === "sbRtEvent") {
      // Realtime event forwarded from offscreen via background — process it here.
      try { __sbHandleRtEvent(msg.event); } catch (_) {}
    }
    if (msg.action === "sbRtSessionReady") {
      // Offscreen session is up — configure usage tracking and mark ready.
      __sbUseOffscreenRt = true;
      __sbRtSessionReady = true;
      __sbResetRealtimeConnectFailures();
      __sbResetRealtimeUsageState();
      if (msg.sessionId) {
        __sbRtUsageSessionId = msg.sessionId;
        __sbRtUsageLimitMs = Number(msg.limitMs || 0);
      }
      if (msg.realtimeModel) __sbRtRealtimeModel = String(msg.realtimeModel);
      if (msg.transcriptionModel) __sbRtTranscriptionModel = String(msg.transcriptionModel);
      if (msg.allocatedMs > 0) __sbScheduleRealtimeUsageCap(msg.allocatedMs);
      if (__sbIsRecording) __sbStopRecording({ silent: true });
      __sbStopSpeech();
      try { chrome.runtime.sendMessage({ action: "rtVoiceClaim" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
      document.getElementById("__sb_brain_btn__")?.classList.add("hp-realtime");
      __sbSetVoiceStatusBadge("realtime", "Live AI");
      __sbSetHpBrainState("listening");
      void __sbSyncRealtimeVoiceInstructions();
    }
    if (msg.action === "sbRtSessionFailed") {
      // Offscreen start failed (e.g. mic permission can't be granted in an invisible
      // offscreen doc). Remember that so future tab switches skip offscreen and go straight
      // to the in-tab session, then start the in-tab session here now.
      const errorText = String(msg.error || "Live AI could not start.");
      __sbUseOffscreenRt = false;
      const quotaError = /limit|cap|used .*today|7-minute|429/i.test(errorText);
      if (quotaError) {
        if (__sbHeadphoneMode) void __sbHandleRealtimeConnectFailure(errorText, { nonRetryable: true });
        return;
      }
      if (/microphone|permission|notallowed|notreadable|getusermedia|device/i.test(errorText) && __sbContextOk()) {
        chrome.storage.local.set({ sbOffscreenRtBroken: true });
      }
      if (__sbHeadphoneMode && !__sbIsRealtimeVoiceReady()) void __sbHandleRealtimeConnectFailure(errorText);
    }
    if (msg.action === "sbRtSessionEnded") {
      // Offscreen session dropped — retry realtime first; legacy only starts after 3 failures.
      __sbUseOffscreenRt = false;
      __sbRtSessionReady = false;
      if (__sbHeadphoneMode) void __sbHandleRealtimeConnectFailure("Live AI disconnected.");
    }
    if (msg.action === "sbRtAttach") {
      // Background says this tab is now focused and voice mode is on — take over presence.
      // (Belt-and-suspenders alongside startup check + visibilitychange.)
      if (!__sbOwnsInlineUi()) return;
      if (__sbHeadphoneMode) void __sbSyncRealtimeVoiceInstructions();
      else __sbEnsureVoicePresence();
    }
    if (msg.action === "sbRtDetach") {
      // This tab lost focus to another — hand voice off.
      if (!__sbOwnsInlineUi()) return;
      __sbReleaseVoicePresence();
    }
    if (msg.action === "showMicPermission") {
      // Background wants a one-time mic grant. Show it as a modal in THIS tab (same tab the
      // user is on) via an extension-origin iframe, so the grant unlocks the offscreen doc.
      if (!__sbOwnsInlineUi()) { sendResponse?.({ shown: false }); return; }
      __sbShowMicPermissionModal().then((shown) => sendResponse?.({ shown }));
      return true; // async response
    }
    if (msg.action === "hideMicPermission") {
      __sbHideMicPermissionModal();
    }
    // ────────────────────────────────────────────────────────────────────────
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

    /* ── Idle animations: float + arm swing + gaze drift + blink ── */
    #__sb_brain_btn__.sb-brain-idle {
      animation: __sb_idle_float__ 3.8s ease-in-out infinite;
    }
    @keyframes __sb_idle_float__ {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-5px); }
    }
    /* Arms: left leads, right follows half-cycle behind — matches home mascot idle math */
    #__sb_brain_btn__.sb-brain-idle #sbb-arm-l,
    #__sb_brain_btn__.sb-brain-idle #sbb-arm-l-fill {
      animation: __sb_arm_l__ 3.4s ease-in-out infinite;
    }
    #__sb_brain_btn__.sb-brain-idle #sbb-arm-r,
    #__sb_brain_btn__.sb-brain-idle #sbb-arm-r-fill {
      animation: __sb_arm_r__ 3.4s ease-in-out infinite;
    }
    @keyframes __sb_arm_l__ {
      0%   { transform: rotate(0deg);   }
      25%  { transform: rotate(11deg);  }
      75%  { transform: rotate(-11deg); }
      100% { transform: rotate(0deg);   }
    }
    @keyframes __sb_arm_r__ {
      0%   { transform: rotate(0deg);   }
      25%  { transform: rotate(-11deg); }
      75%  { transform: rotate(11deg);  }
      100% { transform: rotate(0deg);   }
    }
    /* Gaze drift: pupils scan left→right slowly, offset slightly between eyes */
    #__sb_brain_btn__.sb-brain-idle #sbb-pupil-l {
      animation: __sb_gaze__ 4.2s ease-in-out infinite;
    }
    #__sb_brain_btn__.sb-brain-idle #sbb-pupil-r {
      animation: __sb_gaze__ 4.2s ease-in-out 0.4s infinite;
    }
    @keyframes __sb_gaze__ {
      0%   { transform: translate(0px, 0px);    }
      30%  { transform: translate(-0.8px, 0.2px); }
      65%  { transform: translate(0.8px, -0.2px); }
      100% { transform: translate(0px, 0px);    }
    }
    /* Blink: eye whites scaleY collapse every ~4s, super quick */
    #__sb_brain_btn__.sb-brain-idle #sbb-eye-l {
      animation: __sb_blink__ 4s ease-in-out infinite;
    }
    #__sb_brain_btn__.sb-brain-idle #sbb-eye-r {
      animation: __sb_blink__ 4s ease-in-out 0.06s infinite;
    }
    @keyframes __sb_blink__ {
      0%, 88%, 100% { transform: scaleY(1); }
      92%            { transform: scaleY(0.08); }
    }

    /* ── Spotify / music glow — green-cyan pulsing to indicate listening to music ── */
    @keyframes __sb_brain_glow_music__ {
      0%, 100% { filter: drop-shadow(0 2px 8px rgba(29,185,84,0.35)); }
      45%      { filter: drop-shadow(0 0 20px rgba(29,215,96,0.9)) drop-shadow(0 0 38px rgba(0,230,150,0.45)); }
    }
    #__sb_brain_btn__.sb-brain-music {
      animation: __sb_brain_glow_music__ 2.2s ease-in-out infinite;
    }
    #__sb_brain_btn__.recording {
      animation: __sb_pulse__ 1s ease-in-out infinite;
    }
    @keyframes __sb_pulse__ {
      0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.5)); }
      50% { filter: drop-shadow(0 0 22px rgba(220,50,50,0.95)) drop-shadow(0 0 8px rgba(220,50,50,0.7)); }
    }
    @keyframes __sb_brain_glow_auth__ {
      0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.3)); }
      50% { filter: drop-shadow(0 0 30px rgba(255,210,50,1)) drop-shadow(0 0 55px rgba(255,175,0,0.65)); }
    }
    @keyframes __sb_brain_glow_authed__ {
      0%, 100% { filter: drop-shadow(0 2px 12px rgba(40,180,70,0.4)); }
      50% { filter: drop-shadow(0 0 32px rgba(80,230,110,1)) drop-shadow(0 0 60px rgba(40,180,70,0.7)); }
    }
    #__sb_brain_btn__.sb-brain-auth {
      animation: __sb_brain_glow_auth__ 0.85s ease-in-out infinite;
    }
    #__sb_brain_btn__.sb-brain-authed {
      animation: __sb_brain_glow_authed__ 0.85s ease-in-out infinite;
    }
    @keyframes __sb_brain_glow_rejected__ {
      0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,40,40,0.4)); }
      50% { filter: drop-shadow(0 0 30px rgba(255,80,80,1)) drop-shadow(0 0 55px rgba(200,40,40,0.65)); }
    }
    #__sb_brain_btn__.sb-brain-rejected {
      animation: __sb_brain_glow_rejected__ 0.85s ease-in-out infinite;
    }
    @keyframes __sb_brain_glow_spotify__ {
      0%, 100% {
        filter: drop-shadow(0 2px 10px rgba(29,185,84,0.42));
        transform: scale(1);
      }
      38% {
        filter: drop-shadow(0 0 22px rgba(30,215,96,0.95)) drop-shadow(0 0 46px rgba(29,185,84,0.52));
        transform: scale(1.04);
      }
      68% {
        filter: drop-shadow(0 0 16px rgba(145,255,188,0.78)) drop-shadow(0 0 34px rgba(29,185,84,0.32));
        transform: scale(1.01);
      }
    }
    #__sb_brain_btn__.sb-brain-spotify {
      animation: __sb_brain_glow_spotify__ 1.7s cubic-bezier(0.2,0.8,0.2,1) infinite;
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
    #__sb_bubble__.sb-spotify-active {
      border-color: rgba(255, 255, 255, 0.18);
    }
    #__sb_bubble__.sb-spotify-active::before { display: none; }
    #__sb_bubble__.sb-spotify-active::after {
      content: "";
      position: absolute;
      inset: -30% -18%;
      pointer-events: none;
      background: linear-gradient(118deg, transparent 28%, rgba(255,255,255,0.3) 46%, rgba(168,255,212,0.18) 54%, transparent 70%);
      opacity: 0;
      mix-blend-mode: screen;
      animation: __sb_spotify_card_glitter__ 3.2s linear infinite;
    }
    @keyframes __sb_spotify_card_glow__ {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.78; }
      33% { transform: translate3d(10px, -8px, 0) scale(1.04); opacity: 0.96; }
      66% { transform: translate3d(-8px, 10px, 0) scale(0.98); opacity: 0.72; }
    }
    @keyframes __sb_spotify_card_glitter__ {
      0% { transform: translateX(-18%) rotate(0.5deg); opacity: 0; }
      16% { opacity: 0.2; }
      48% { opacity: 0.56; }
      72% { opacity: 0.14; }
      100% { transform: translateX(18%) rotate(0.5deg); opacity: 0; }
    }

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

    /* ── Lecture Mode UI ── */
    .sb-lec-ready { display:flex; flex-direction:column; align-items:center; gap:14px; padding:22px 16px 18px; text-align:center; }
    .sb-lec-kicker { font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:#A79B92; }
    .sb-lec-ready-title { font-size:17px; font-weight:600; color:#1B1713; line-height:1.3; }
    .sb-lec-ready-sub { font-size:12.5px; color:#8A7B73; line-height:1.5; max-width:200px; }
    .sb-lec-start-btn { width:100%; padding:12px; border:none; border-radius:20px; background:#E8786E; color:white; font-size:13.5px; font-weight:600; cursor:pointer; transition:background 0.15s; letter-spacing:0.01em; }
    .sb-lec-start-btn:hover { background:#C9544A; }
    .sb-lec-rec { display:flex; flex-direction:column; align-items:center; gap:10px; padding:20px 16px 14px; }
    .sb-lec-rec-header { display:flex; align-items:center; gap:6px; }
    .sb-lec-rec-dot { width:7px; height:7px; border-radius:50%; background:#E8786E; animation:sbLecPulse 1.4s ease-in-out infinite; flex-shrink:0; }
    @keyframes sbLecPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    .sb-lec-rec-label { font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:#C9544A; font-weight:600; }
    .sb-lec-title { font-size:14.5px; font-weight:600; color:#1B1713; text-align:center; max-width:230px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sb-lec-date { font-size:11px; color:#A79B92; }
    .sb-lec-waveform { display:flex; align-items:flex-end; justify-content:center; gap:3px; height:44px; margin:6px 0; }
    .sb-lec-wave-bar { width:3px; border-radius:2px; background:#E8786E; animation:sbWaveBar 1.2s ease-in-out infinite; transform-origin:bottom; }
    .sb-lec-wave-bar:nth-child(1){height:10px;animation-delay:0s}
    .sb-lec-wave-bar:nth-child(2){height:18px;animation-delay:0.08s}
    .sb-lec-wave-bar:nth-child(3){height:28px;animation-delay:0.16s}
    .sb-lec-wave-bar:nth-child(4){height:36px;animation-delay:0.24s}
    .sb-lec-wave-bar:nth-child(5){height:44px;animation-delay:0.32s}
    .sb-lec-wave-bar:nth-child(6){height:36px;animation-delay:0.40s}
    .sb-lec-wave-bar:nth-child(7){height:44px;animation-delay:0.48s}
    .sb-lec-wave-bar:nth-child(8){height:36px;animation-delay:0.56s}
    .sb-lec-wave-bar:nth-child(9){height:28px;animation-delay:0.64s}
    .sb-lec-wave-bar:nth-child(10){height:18px;animation-delay:0.72s}
    .sb-lec-wave-bar:nth-child(11){height:10px;animation-delay:0.80s}
    .sb-lec-wave-bar:nth-child(12){height:16px;animation-delay:0.88s}
    @keyframes sbWaveBar { 0%,100%{transform:scaleY(0.35)} 50%{transform:scaleY(1)} }
    .sb-lec-waveform.paused .sb-lec-wave-bar { animation:none; transform:scaleY(0.3); opacity:0.35; }
    .sb-lec-timer { font-family:monospace; font-size:26px; font-weight:700; color:#1B1713; letter-spacing:0.04em; }
    .sb-lec-status { font-size:12px; color:#A79B92; text-align:center; min-height:16px; }
    .sb-lec-btns { display:flex; gap:8px; width:100%; margin-top:4px; }
    .sb-lec-seg-btn { flex:1; padding:9px 6px; border:1px solid rgba(65,48,40,0.2); border-radius:14px; background:transparent; color:#413028; font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s; }
    .sb-lec-seg-btn:hover { background:rgba(65,48,40,0.07); }
    .sb-lec-seg-btn:disabled { opacity:0.4; cursor:default; }
    .sb-lec-stop-btn { flex:1; padding:9px 6px; border:none; border-radius:14px; background:#fee2e2; color:#C9544A; font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s; }
    .sb-lec-stop-btn:hover { background:#fecaca; }
    .sb-lec-notes-actions { display:flex; gap:8px; padding:12px 0 4px; }
    .sb-lec-copy-btn { flex:1; padding:8px 4px; border:1px solid rgba(65,48,40,0.2); border-radius:14px; background:transparent; color:#413028; font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s; }
    .sb-lec-copy-btn:hover { background:rgba(65,48,40,0.07); }
    .sb-lec-loading { display:flex; flex-direction:column; align-items:center; gap:10px; padding:28px 16px; text-align:center; }
    .sb-lec-spinner { width:24px; height:24px; border:2px solid rgba(65,48,40,0.15); border-top-color:#E8786E; border-radius:50%; animation:sbLecSpin 0.8s linear infinite; }
    @keyframes sbLecSpin { to { transform: rotate(360deg); } }
    .sb-lec-loading-txt { font-size:12.5px; color:#A79B92; }

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
      transition: opacity 0.38s cubic-bezier(0.34,1.1,0.64,1), transform 0.38s cubic-bezier(0.34,1.1,0.64,1);
    }
    #__sb_bar__.open { opacity: 1; pointer-events: all; transform: scaleX(1) translateY(0); }
    /* ── Wake-up state ── */
    #__sb_wakeup__ {
      display: none; align-items: center; gap: 8px; flex: 1; min-width: 0;
    }
    #__sb_bar__.sb-waking #__sb_wakeup__ { display: flex; }
    #__sb_bar__.sb-waking #__sb_input__,
    #__sb_bar__.sb-waking #__sb_mode_btn__,
    #__sb_bar__.sb-waking #__sb_rec_btn__,
    #__sb_bar__.sb-waking #__sb_send_btn__,
    #__sb_bar__.sb-waking #__sb_x_auto_btn__ { display: none !important; }
    #__sb_wakeup_track__ {
      flex: 1; height: 2px; background: rgba(65,48,40,0.12); border-radius: 99px; overflow: hidden;
    }
    #__sb_wakeup_fill__ {
      height: 100%; width: 0%;
      background: linear-gradient(90deg, #F6A8A2, #E8786E 60%, #C9544A);
      border-radius: 99px; transition: width 0.55s cubic-bezier(0.4,0,0.2,1);
    }
    #__sb_wakeup_label__ {
      font-size: 11.5px; color: #A79B92; white-space: nowrap; flex-shrink: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @keyframes __sb_wu_pulse__ {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    #__sb_bar__.sb-waking #__sb_wakeup_label__ {
      animation: __sb_wu_pulse__ 1.4s ease-in-out infinite;
    }
    /* ── Sign-in CTA state ── */
    #__sb_signin_cta__ {
      display: none; align-items: center; gap: 8px; flex: 1; min-width: 0;
    }
    #__sb_bar__.sb-signin #__sb_signin_cta__ { display: flex; }
    #__sb_bar__.sb-signin #__sb_input__,
    #__sb_bar__.sb-signin #__sb_mode_btn__,
    #__sb_bar__.sb-signin #__sb_rec_btn__,
    #__sb_bar__.sb-signin #__sb_send_btn__,
    #__sb_bar__.sb-signin #__sb_x_auto_btn__,
    #__sb_bar__.sb-signin #__sb_wakeup__ { display: none !important; }
    #__sb_signin_cta_hint__ {
      font-size: 12px; color: #A79B92; flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_signin_btn_cta__ {
      white-space: nowrap; border: none; border-radius: 20px; flex-shrink: 0;
      background: #E8786E; color: white; font-size: 12px; font-weight: 600;
      padding: 6px 14px; cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: background 0.15s;
    }
    #__sb_signin_btn_cta__:hover { background: #C9544A; }
    #__sb_bar__.sb-signin { border-radius: 18px; }
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
      user-select: text;
      -webkit-user-select: text;
    }
    .sb-card-stack {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .sb-turn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .sb-turn + .sb-turn {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    #__sb_bubble__.sb-light .sb-turn + .sb-turn { border-top-color: rgba(0,0,0,0.08); }
    .sb-card-scroll::-webkit-scrollbar { width: 4px; }
    .sb-card-scroll::-webkit-scrollbar-track { background: transparent; }
    .sb-card-scroll::-webkit-scrollbar-thumb { background: rgba(180,140,120,0.3); border-radius: 99px; }
    .sb-card-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,140,120,0.55); }
    .sb-card-q {
      display: inline-block; background: var(--sb-q-bg); border: 1px solid var(--sb-q-border);
      border-radius: 14px; padding: 10px 14px; font-size: 13px; color: var(--sb-fg-2); line-height: 1.5;
      margin-bottom: 18px; max-width: 100%; word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }
    .sb-card-a {
      font-size: 14.5px; line-height: 1.75; color: var(--sb-fg); word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }
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
    .sb-linkedin-card {
      width: 100%;
      display: grid;
      gap: 12px;
      color: #241D18;
      user-select: text;
      -webkit-user-select: text;
    }
    .sb-linkedin-hero {
      position: relative;
      overflow: hidden;
      padding: 18px;
      border-radius: 22px;
      border: 1px solid rgba(65,48,40,0.12);
      background:
        radial-gradient(circle at 8% 0%, rgba(10,102,194,0.18), transparent 15rem),
        linear-gradient(150deg, rgba(255,255,255,0.96), rgba(249,241,231,0.90));
      box-shadow: 0 18px 40px rgba(27,23,19,0.10);
    }
    .sb-linkedin-kicker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 8px;
      color: #0A66C2;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .sb-linkedin-kicker::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 99px;
      background: #0A66C2;
      box-shadow: 0 0 12px rgba(10,102,194,0.45);
    }
    .sb-linkedin-hero h2 {
      margin: 0;
      color: #17120E;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 23px;
      line-height: 1.08;
      letter-spacing: -0.03em;
    }
    .sb-linkedin-hero p {
      margin: 10px 0 0;
      color: rgba(27,23,19,0.70);
      font-size: 13px;
      line-height: 1.5;
    }
    .sb-linkedin-list {
      display: grid;
      gap: 10px;
    }
    .sb-linkedin-job {
      overflow: hidden;
      border: 1px solid rgba(65,48,40,0.12);
      border-radius: 18px;
      background: rgba(255,255,255,0.78);
      box-shadow: 0 12px 28px rgba(27,23,19,0.08);
    }
    .sb-linkedin-job summary {
      list-style: none;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 15px;
      user-select: text;
      -webkit-user-select: text;
    }
    .sb-linkedin-job summary::-webkit-details-marker { display: none; }
    .sb-linkedin-job-title {
      min-width: 0;
      display: grid;
      gap: 4px;
    }
    .sb-linkedin-job-title strong {
      color: #17120E;
      font-size: 14px;
      line-height: 1.25;
    }
    .sb-linkedin-job-title small {
      color: rgba(27,23,19,0.58);
      font-size: 12px;
      line-height: 1.35;
    }
    .sb-linkedin-fit {
      align-self: flex-start;
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 6px 9px;
      color: #1F3B24;
      background: #DFF4E3;
      border: 1px solid rgba(31,59,36,0.12);
      font-size: 11px;
      font-weight: 800;
    }
    .sb-linkedin-fit.maybe, .sb-linkedin-fit.unknown {
      color: #71430F;
      background: #FFF0CC;
      border-color: rgba(113,67,15,0.14);
    }
    .sb-linkedin-fit.weak {
      color: #84261F;
      background: #FFE1DE;
      border-color: rgba(132,38,31,0.14);
    }
    .sb-linkedin-job-body {
      padding: 0 15px 15px;
      color: rgba(27,23,19,0.78);
      font-size: 13px;
      line-height: 1.55;
    }
    .sb-linkedin-job-body p { margin: 0 0 10px; }
    .sb-linkedin-reqs {
      margin: 0 0 12px;
      padding: 12px 12px 10px;
      border-radius: 14px;
      background: rgba(10,102,194,0.07);
      border: 1px solid rgba(10,102,194,0.10);
    }
    .sb-linkedin-reqs span,
    .sb-linkedin-fit-note span,
    .sb-linkedin-conclusion span {
      display: block;
      margin-bottom: 6px;
      color: rgba(27,23,19,0.54);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .sb-linkedin-reqs ul {
      margin: 0 0 0 16px;
      padding: 0;
    }
    .sb-linkedin-reqs li { margin: 0 0 4px; }
    .sb-linkedin-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 12px;
    }
    .sb-linkedin-apply {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 9px 13px;
      color: #fff !important;
      background: #0A66C2;
      text-decoration: none !important;
      font-size: 12px;
      font-weight: 800;
      box-shadow: 0 10px 22px rgba(10,102,194,0.24);
    }
    .sb-linkedin-fit-note {
      padding: 12px;
      border-radius: 14px;
      color: rgba(27,23,19,0.78);
      background: rgba(65,48,40,0.05);
    }
    .sb-linkedin-conclusion {
      padding: 14px 15px;
      border-radius: 18px;
      border: 1px solid rgba(201,84,74,0.16);
      background: linear-gradient(145deg, rgba(255,255,255,0.86), rgba(255,232,217,0.72));
      color: rgba(27,23,19,0.78);
      box-shadow: 0 12px 28px rgba(27,23,19,0.07);
    }
    .sb-linkedin-conclusion p {
      margin: 0;
      line-height: 1.55;
    }
    .sb-x-draft-card {
      width: 100%;
      display: grid;
      gap: 12px;
      padding: 16px;
      border-radius: 22px;
      border: 1px solid rgba(65,48,40,0.12);
      background:
        radial-gradient(circle at 10% 0%, rgba(20,20,20,0.11), transparent 16rem),
        linear-gradient(150deg, rgba(255,255,255,0.96), rgba(249,241,231,0.90));
      box-shadow: 0 18px 40px rgba(27,23,19,0.10);
      color: #17120E;
      user-select: text;
      -webkit-user-select: text;
    }
    .sb-x-draft-kicker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #17120E;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .sb-x-draft-kicker::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 99px;
      background: #17120E;
      box-shadow: 0 0 12px rgba(23,18,14,0.28);
    }
    .sb-x-draft-card h2 {
      margin: 0;
      color: #17120E;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 22px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    .sb-x-draft-card p {
      margin: 0;
      color: rgba(27,23,19,0.66);
      font-size: 13px;
      line-height: 1.5;
    }
    .sb-x-draft-editor {
      width: 100%;
      min-height: 128px;
      border: 1px solid rgba(65,48,40,0.14);
      border-radius: 17px;
      padding: 13px 14px;
      resize: vertical;
      outline: none;
      color: #17120E;
      background: rgba(255,255,255,0.78);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 17px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .sb-x-draft-editor:focus {
      border-color: rgba(201,84,74,0.38);
      box-shadow: 0 0 0 3px rgba(201,84,74,0.10), inset 0 1px 0 rgba(255,255,255,0.65);
    }
    .sb-x-draft-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: rgba(27,23,19,0.56);
      font-size: 11.5px;
      line-height: 1.4;
    }
    .sb-x-draft-count.over { color: #B42318; font-weight: 800; }
    .sb-x-draft-actions,
    .sb-x-schedule-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .sb-x-draft-btn {
      border: none;
      border-radius: 999px;
      padding: 10px 13px;
      cursor: pointer;
      color: #17120E;
      background: rgba(65,48,40,0.08);
      font-size: 12px;
      font-weight: 850;
      transition: transform 0.12s, background 0.12s, opacity 0.12s;
    }
    .sb-x-draft-btn:hover { transform: translateY(-1px); background: rgba(65,48,40,0.13); }
    .sb-x-draft-btn.primary {
      color: #fff;
      background: #17120E;
      box-shadow: 0 10px 22px rgba(23,18,14,0.18);
    }
    .sb-x-draft-btn.accent {
      color: #fff;
      background: #C9544A;
      box-shadow: 0 10px 22px rgba(201,84,74,0.22);
    }
    .sb-x-draft-btn[disabled] {
      opacity: 0.55;
      cursor: wait;
      transform: none;
    }
    .sb-x-schedule-panel {
      display: none;
      gap: 9px;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(201,84,74,0.14);
      background: rgba(255,232,217,0.58);
    }
    .sb-x-schedule-panel.visible { display: grid; }
    .sb-x-schedule-input {
      min-height: 38px;
      border: 1px solid rgba(65,48,40,0.14);
      border-radius: 12px;
      padding: 0 11px;
      color: #17120E;
      background: rgba(255,255,255,0.82);
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sb-x-draft-status {
      min-height: 18px;
      color: rgba(27,23,19,0.62);
      font-size: 12px;
      line-height: 1.45;
    }
    .sb-x-draft-status.error { color: #B42318; font-weight: 700; }
    .sb-x-draft-status.success { color: #17663b; font-weight: 700; }
    .sb-card-stack.sb-card-stack-spotify {
      justify-content: flex-start;
      gap: 18px;
    }
    .sb-card-history {
      display: flex;
      flex-direction: column;
    }
    .sb-spotify-shell {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px;
      border-radius: 22px;
      background: transparent;
      border: none;
      overflow: hidden;
    }
    .sb-spotify-shell::before { display: none; }
    .sb-spotify-hero {
      --sb-ac-r: 80; --sb-ac-g: 180; --sb-ac-b: 100;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(145deg,
        rgba(calc(var(--sb-ac-r) * 0.18), calc(var(--sb-ac-g) * 0.18), calc(var(--sb-ac-b) * 0.18), 0.94),
        rgba(calc(var(--sb-ac-r) * 0.14), calc(var(--sb-ac-g) * 0.14), calc(var(--sb-ac-b) * 0.14), 0.80)
      );
      color: #F4FFF7;
      overflow: hidden;
      transition: background 0.6s ease;
    }
    .sb-spotify-hero.is-playing::after {
      content: "";
      position: absolute;
      inset: -20% -25%;
      pointer-events: none;
      background: linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.16) 46%, rgba(var(--sb-ac-r), var(--sb-ac-g), var(--sb-ac-b), 0.1) 54%, transparent 72%);
      mix-blend-mode: screen;
      animation: __sb_spotify_panel_sheen__ 4s linear infinite;
    }
    @keyframes __sb_spotify_panel_sheen__ {
      0% { transform: translateX(-20%); opacity: 0; }
      20% { opacity: 0.3; }
      55% { opacity: 0.62; }
      100% { transform: translateX(18%); opacity: 0; }
    }
    .sb-spotify-hero-top {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sb-spotify-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(241,255,246,0.92);
    }
    .sb-spotify-badge::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: rgb(var(--sb-ac-r, 100), var(--sb-ac-g, 255), var(--sb-ac-b, 159));
      box-shadow: 0 0 10px rgba(var(--sb-ac-r, 100), var(--sb-ac-g, 255), var(--sb-ac-b, 159), 0.7);
      flex-shrink: 0;
    }
    .sb-spotify-badge.subtle::before {
      background: rgba(255,255,255,0.72);
      box-shadow: none;
    }
    .sb-spotify-hero-main {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
    }
    .sb-spotify-cover {
      position: relative;
      width: 82px;
      height: 82px;
      border-radius: 22px;
      overflow: hidden;
      background: rgba(255,255,255,0.12);
      box-shadow: 0 16px 28px rgba(0,0,0,0.26);
    }
    .sb-spotify-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .sb-spotify-cover-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background: radial-gradient(circle at 30% 20%, rgba(var(--sb-ac-r, 104), var(--sb-ac-g, 255), var(--sb-ac-b, 165), 0.34), rgba(255,255,255,0.06));
    }
    .sb-spotify-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sb-spotify-eyebrow {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(203,255,220,0.76);
      font-weight: 700;
    }
    .sb-spotify-title {
      margin: 0;
      font-size: 22px;
      line-height: 1.08;
      font-weight: 700;
      color: #F7FFF8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-spotify-subtitle {
      font-size: 14px;
      line-height: 1.45;
      color: rgba(235,255,241,0.84);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-spotify-meta {
      font-size: 12px;
      line-height: 1.45;
      color: rgba(210,244,220,0.72);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-spotify-progress {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .sb-spotify-progress-bar {
      height: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      overflow: hidden;
    }
    .sb-spotify-progress-bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, rgb(var(--sb-ac-r, 104), var(--sb-ac-g, 255), var(--sb-ac-b, 170)) 0%, rgba(var(--sb-ac-r, 197), var(--sb-ac-g, 255), var(--sb-ac-b, 226), 0.7) 100%);
      box-shadow: 0 0 18px rgba(var(--sb-ac-r, 104), var(--sb-ac-g, 255), var(--sb-ac-b, 170), 0.48);
    }
    .sb-spotify-progress-times {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      color: rgba(230,255,236,0.72);
    }
    .sb-spotify-controls {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
    }
    .sb-spotify-ctrl-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.12);
      color: #F4FFF7;
      font-size: 16px;
      transition: background 0.15s, transform 0.1s;
    }
    .sb-spotify-ctrl-btn:hover { background: rgba(255,255,255,0.22); transform: scale(1.08); }
    .sb-spotify-ctrl-btn.primary {
      width: 46px;
      height: 46px;
      font-size: 20px;
      background: rgba(100,255,159,0.2);
      border: 1px solid rgba(100,255,159,0.3);
    }
    .sb-spotify-ctrl-btn.primary:hover { background: rgba(100,255,159,0.35); }
    .sb-spotify-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
      gap: 12px;
    }
    .sb-spotify-block {
      min-width: 0;
      padding: 13px 13px 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.42);
      border: 1px solid rgba(255,255,255,0.42);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.34);
    }
    .sb-spotify-section-head {
      margin-bottom: 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgb(calc(var(--sb-ac-r, 58) * 0.42), calc(var(--sb-ac-g, 92) * 0.42), calc(var(--sb-ac-b, 69) * 0.42));
    }
    .sb-spotify-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sb-spotify-result {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 9px 10px;
      border-radius: 14px;
      background: rgba(255,255,255,0.5);
      border: 1px solid rgba(255,255,255,0.35);
    }
    .sb-spotify-result.is-current {
      background: rgba(var(--sb-ac-r, 103), var(--sb-ac-g, 255), var(--sb-ac-b, 159), 0.14);
      border-color: rgba(var(--sb-ac-r, 103), var(--sb-ac-g, 255), var(--sb-ac-b, 159), 0.32);
      box-shadow: 0 10px 18px rgba(var(--sb-ac-r, 29), var(--sb-ac-g, 185), var(--sb-ac-b, 84), 0.08);
    }
    .sb-spotify-result img,
    .sb-spotify-result-art {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      object-fit: cover;
      background: rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .sb-spotify-result-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .sb-spotify-result-title,
    .sb-spotify-result-sub,
    .sb-spotify-result-meta {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-spotify-result-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #193024;
    }
    .sb-spotify-result-sub {
      font-size: 12px;
      color: #4C6657;
    }
    .sb-spotify-result-meta,
    .sb-spotify-duration {
      font-size: 11px;
      color: #6C8376;
    }
    .sb-spotify-about-copy {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 12.5px;
      line-height: 1.6;
      color: #274335;
    }
    .sb-spotify-about-line strong {
      color: #163224;
    }
    .sb-spotify-empty {
      font-size: 12.5px;
      line-height: 1.55;
      color: #587061;
    }
    @media (max-width: 620px) {
      .sb-spotify-hero-main {
        grid-template-columns: 66px minmax(0, 1fr);
      }
      .sb-spotify-cover {
        width: 66px;
        height: 66px;
        border-radius: 18px;
      }
      .sb-spotify-title {
        font-size: 18px;
      }
      .sb-spotify-grid {
        grid-template-columns: 1fr;
      }
    }
    .sb-card-footer {
      position: relative; display: flex; align-items: center; gap: 5px;
      padding: 10px 12px 12px; flex-shrink: 0;
      border-top: 1px solid var(--sb-footer-border); background: var(--sb-footer-bg);
      overflow: hidden;
    }
    .sb-card-footer > * { position: relative; z-index: 1; }
    .sb-card-footer::before {
      content: ""; position: absolute; inset: -16px -24px;
      pointer-events: none; opacity: 0; transform: scaleX(0.62);
      transform-origin: 82% 50%;
      background:
        radial-gradient(circle at 92% 50%, rgba(255,218,142,0.52), transparent 34%),
        radial-gradient(circle at 74% 50%, rgba(232,120,110,0.38), transparent 42%),
        linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
      filter: blur(1px);
    }
    .sb-card-footer.sb-followup-glow {
      animation: __sb_footer_border_glow__ 780ms cubic-bezier(0.2,0.8,0.2,1) both;
    }
    .sb-card-footer.sb-followup-glow::before {
      animation: __sb_followup_radiate__ 780ms cubic-bezier(0.2,0.8,0.2,1) both;
    }
    @keyframes __sb_followup_radiate__ {
      0% { opacity: 0; transform: scaleX(0.48); }
      18% { opacity: 0.95; transform: scaleX(0.72); }
      58% { opacity: 0.48; transform: scaleX(1); }
      100% { opacity: 0; transform: scaleX(1.08); }
    }
    @keyframes __sb_footer_border_glow__ {
      0% { box-shadow: inset 0 1px 0 var(--sb-footer-border); }
      38% { box-shadow: inset 0 1px 0 rgba(255,218,142,0.65), 0 -12px 42px rgba(232,120,110,0.18); }
      100% { box-shadow: inset 0 1px 0 var(--sb-footer-border); }
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
    #__sb_voice_status_badge__ {
      font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
      border-radius: 999px; padding: 2px 7px; border: 1px solid transparent;
      display: none; align-items: center; flex-shrink: 1;
      max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #__sb_voice_status_badge__[data-s="realtime"] {
      display: flex; color: #17663b;
      background: rgba(232,249,239,0.95); border-color: rgba(32,148,84,0.3);
    }
    #__sb_voice_status_badge__[data-s="legacy"] {
      display: flex; color: #8f5b13;
      background: rgba(255,245,224,0.95); border-color: rgba(196,129,34,0.35);
    }
    #__sb_voice_status_badge__[data-s="error"] {
      display: flex; color: #8f2424;
      background: rgba(255,237,237,0.95); border-color: rgba(202,69,69,0.32);
      text-transform: none; max-width: 200px;
    }
    #__sb_voice_status_badge__[data-s="connecting"] {
      display: flex; color: #8f5b13;
      background: rgba(255,245,224,0.95); border-color: rgba(196,129,34,0.35);
    }
    #__sb_card_send__ { background: #E8786E; color: white; }
    #__sb_card_send__:hover { background: #C9544A; }
    #__sb_rec_bar__ {
      display: none; align-items: center; gap: 8px; padding: 8px 14px; flex-shrink: 0;
      border-top: 1px solid var(--sb-rec-border);
    }
    #__sb_rec_bar__.active { display: flex; }

    /* ── Headphone Mode Brain Glows ── */
    @keyframes __sb_hp_listen__ {
      0%,100% { filter: drop-shadow(0 0 18px rgba(210,40,40,0.65)) drop-shadow(0 0 6px rgba(210,40,40,0.4)); }
      50%      { filter: drop-shadow(0 0 26px rgba(220,40,40,0.8))  drop-shadow(0 0 8px rgba(220,40,40,0.5)); }
    }
    @keyframes __sb_hp_captured__ {
      0%,100% { filter: drop-shadow(0 0 18px rgba(255,195,0,0.75)) drop-shadow(0 0 7px rgba(255,170,0,0.5)); }
      50%      { filter: drop-shadow(0 0 26px rgba(255,215,0,0.9))  drop-shadow(0 0 10px rgba(255,185,0,0.6)); }
    }
    @keyframes __sb_hp_speak__ {
      0%,100% { filter: drop-shadow(0 0 16px rgba(210,40,40,0.6))  drop-shadow(0 0 5px rgba(210,40,40,0.35)); transform: scale(1); }
      50%      { filter: drop-shadow(0 0 30px rgba(220,40,40,0.85)) drop-shadow(0 0 10px rgba(220,40,40,0.55)); transform: scale(1.04); }
    }
    @keyframes __sb_hp_connect__ {
      0%,100% { filter: drop-shadow(0 0 14px rgba(234,179,8,0.5))  drop-shadow(0 0 5px rgba(251,191,36,0.3)); }
      50%      { filter: drop-shadow(0 0 22px rgba(234,179,8,0.75)) drop-shadow(0 0 8px rgba(251,191,36,0.45)); }
    }
    /* Blue halo for Live AI (realtime) mode */
    @keyframes __sb_hp_connect_rt__ {
      0%,100% { filter: drop-shadow(0 0 16px rgba(56,189,248,0.55)) drop-shadow(0 0 6px rgba(59,130,246,0.32)); }
      50%      { filter: drop-shadow(0 0 26px rgba(56,189,248,0.8))  drop-shadow(0 0 10px rgba(59,130,246,0.5)); }
    }
    @keyframes __sb_hp_listen_rt__ {
      0%,100% { filter: drop-shadow(0 0 20px rgba(59,130,246,0.75)) drop-shadow(0 0 7px rgba(99,179,255,0.45)); }
      50%      { filter: drop-shadow(0 0 30px rgba(59,130,246,0.9))  drop-shadow(0 0 11px rgba(99,179,255,0.6)); }
    }
    @keyframes __sb_hp_speak_rt__ {
      0%,100% { filter: drop-shadow(0 0 18px rgba(99,102,241,0.7))  drop-shadow(0 0 7px rgba(139,92,246,0.42)); transform: scale(1); }
      50%      { filter: drop-shadow(0 0 32px rgba(99,102,241,0.9))  drop-shadow(0 0 12px rgba(139,92,246,0.65)); transform: scale(1.04); }
    }
    @keyframes __sb_hp_captured_rt__ {
      0%,100% { filter: drop-shadow(0 0 20px rgba(34,211,238,0.75)) drop-shadow(0 0 8px rgba(34,211,238,0.45)); }
      50%      { filter: drop-shadow(0 0 30px rgba(34,211,238,0.9))  drop-shadow(0 0 12px rgba(34,211,238,0.6)); }
    }
    #__sb_brain_btn__.hp-connecting { animation: __sb_hp_connect__    1.6s ease-in-out infinite; }
    #__sb_brain_btn__.hp-listening  { animation: __sb_hp_listen__     2.2s ease-in-out infinite; }
    #__sb_brain_btn__.hp-captured   { animation: __sb_hp_captured__   2s   ease-in-out infinite; }
    #__sb_brain_btn__.hp-speaking   { animation: __sb_hp_speak__      0.9s ease-in-out infinite; }
    /* Realtime overrides — blue halo wins */
    #__sb_brain_btn__.hp-realtime.hp-connecting { animation: __sb_hp_connect_rt__  1.6s ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-listening  { animation: __sb_hp_listen_rt__   2.2s ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-captured   { animation: __sb_hp_captured_rt__ 2s   ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-speaking   { animation: __sb_hp_speak_rt__    0.9s ease-in-out infinite; }

    /* ── Voice Error Pill ── */
    #__sb_voice_error_pill__ {
      position: fixed; bottom: 84px; right: 20px; z-index: 2147483649;
      background: #DC2626; color: #fff;
      padding: 10px 16px; border-radius: 999px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; font-weight: 500;
      box-shadow: 0 4px 18px rgba(220,38,38,0.45);
      max-width: calc(100vw - 48px);
      opacity: 0; transform: translateY(8px) scale(0.97);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
    }
    #__sb_voice_error_pill__.visible { opacity: 1; transform: translateY(0) scale(1); }
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
      <button id="__sb_rec_btn__" class="sb-bar-icon-btn" title="Headphone mode">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
      </button>
      <button id="__sb_send_btn__" class="sb-bar-icon-btn" title="Send">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      </button>
      <button id="__sb_x_auto_btn__" class="sb-bar-icon-btn" title="X Automation" style="display:none;gap:4px;padding:0 8px;font-size:11px;font-weight:600;width:auto;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span id="__sb_x_auto_label__">X Auto</span>
      </button>
      <div id="__sb_wakeup__">
        <span id="__sb_wakeup_label__">Waking up…</span>
        <div id="__sb_wakeup_track__"><div id="__sb_wakeup_fill__"></div></div>
      </div>
      <div id="__sb_signin_cta__">
        <span id="__sb_signin_cta_hint__">Sign in to start chatting</span>
        <button id="__sb_signin_btn_cta__">Sign in →</button>
      </div>
    </div>
    <div id="__sb_brain_btn__">${__SB_BRAIN_SVG}</div>
  `;
  document.body.appendChild(root);
  if (__sbCursorRideMode) {
    __sbPositionRootNearCursor(true);
    __sbScheduleCursorFollow();
  } else {
    __sbAnchorRootBottomRight();
  }

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
        <button id="__sb_card_voice_mode_btn__" class="sb-card-foot-btn" title="Headphone mode">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
        </button>
        <span id="__sb_voice_status_badge__"></span>
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

  // ── Voice Error Pill ──
  const errPill = document.createElement("div");
  errPill.id = "__sb_voice_error_pill__";
  document.body.appendChild(errPill);

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

  const connectorDd = document.createElement("div");
  connectorDd.id = "__sb_connector_dropdown__";
  connectorDd.className = "sb-dropdown";
  connectorDd.innerHTML = `
    <div class="sb-dropdown-label">Connector</div>
    <button class="sb-dropdown-item selected" data-connector="auto"><span class="sb-di-icon">↗</span><span class="sb-di-label">Auto detect</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-connector="google-drive"><span class="sb-di-icon">🗂</span><span class="sb-di-label">Google Drive</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-connector="gmail"><span class="sb-di-icon">✉</span><span class="sb-di-label">Gmail</span><span class="sb-di-check">✓</span></button>
  `;
  document.body.appendChild(connectorDd);

  const connectorSlashDd = document.createElement("div");
  connectorSlashDd.id = "__sb_connector_slash_dropdown__";
  connectorSlashDd.className = "sb-dropdown";
  document.body.appendChild(connectorSlashDd);

  const modelDd = document.createElement("div");
  modelDd.id = "__sb_model_dropdown__";
  modelDd.className = "sb-dropdown";
  modelDd.innerHTML = `
    <div class="sb-dropdown-label">AI Model</div>
    <button class="sb-dropdown-item selected" data-model="lovable"><span class="sb-di-icon">🧠</span><span class="sb-di-label">Braino AI</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-model="claude"><span class="sb-di-icon">✦</span><span class="sb-di-label">Claude</span><span class="sb-di-check">✓</span></button>
  `;
  document.body.appendChild(modelDd);

  // On X/Twitter, lock the Braino bar to the system font — Twitter's global CSS
  // bleeds into injected DOM elements and makes the UI look wrong.
  if (__sbIsOnX()) {
    const xFontFix = document.createElement("style");
    xFontFix.id = "__sb_x_font_fix__";
    xFontFix.textContent = `
      #__sb_bar__, #__sb_bar__ *,
      #__sb_card_wrap__, #__sb_card_wrap__ *,
      #__sb_bubble__, #__sb_bubble__ * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }
    `;
    document.head.appendChild(xFontFix);
  }

  // Brain hidden by default — but if Braino is active (docked), show it on this tab too.
  // This makes Braino persist across tabs: once invoked, it follows you to every tab
  // and survives collapse instead of vanishing.
  document.getElementById("__sb_brain_btn__").style.display = "none";
  __sbStorageGet(["sbBrainDocked", "sbVoiceModeOn"]).then(({ sbBrainDocked, sbVoiceModeOn }) => {
    if (!__sbOwnsInlineUi()) return;
    // Show brain if docked OR if voice mode is on (voice takes over, so show it either way).
    if (sbBrainDocked || sbVoiceModeOn) {
      const b = document.getElementById("__sb_brain_btn__");
      if (b) b.style.display = "";
      __sbBrainVisible = true;
      if (sbBrainDocked && !sbVoiceModeOn) __sbSyncIdleState();
      if (!sbBrainDocked && sbVoiceModeOn && __sbContextOk()) {
        chrome.storage.local.set({ sbBrainDocked: true });
      }
    }
    // If voice mode is on AND this is the visible tab, take over presence immediately —
    // no waiting for sbRtAttach (which races against script load). This is THE primary
    // path for freshly-opened tabs (e.g. Braino opening Spotify). Hidden tabs stay idle.
    if (sbVoiceModeOn && document.visibilityState === "visible") {
      __sbEnsureVoicePresence();
    }
  });
  document.getElementById("__sb_brain_btn__").addEventListener("click", () => {
    // Tapping Braino always silences any ongoing speech first — a guaranteed "stop talking"
    // affordance (covers browser-TTS answers that otherwise had no stop control in voice mode).
    const speaking = __sbIsSpeaking || (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) || __sbHasActiveRealtimeResponse();
    if (speaking) {
      __sbStopSpeech();
      if (__sbHeadphoneMode) { try { __sbInterruptRealtimeResponse(); } catch (_) {} __sbSetHpBrainState("listening"); }
      return;
    }
    if (__sbIsLectureRecording) {
      const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
      if (cardOpen) {
        __sbCollapseCard();
      } else {
        __sbShowLectureRecordingCard();
      }
      return;
    }
    if (__sbHeadphoneMode && !__sbInputOpen) {
      // Open bar so user can stop headphone mode via the headphone button
      __sbToggleInput(true);
    } else if (__sbHasSpotifySurface()) {
      const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
      if (cardOpen) {
        __sbCollapseCard();
      } else {
        __sbRenderSpotifyPanel({ openCard: true, focusInput: false });
      }
    } else {
      __sbToggleInput(!__sbInputOpen);
    }
  });

  // ⌘I / Ctrl+I — toggle brain
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      if (__sbHasExternalEditableFocus()) return;
      e.preventDefault();
      e.stopPropagation();
      if (__sbCursorRideMode) {
        __sbSetCursorRideMode(false);
      } else {
        __sbOpenCursorRideMode();
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "i") {
      // Only block if typing inside the extension's own inputs — not page inputs
      if (document.activeElement?.closest("#__sb_root__, #__sb_card_wrap__")) return;
      e.preventDefault();
      if (__sbCursorRideMode) {
        __sbOpenAnchoredBrain();
      } else {
        __sbToggleBrain();
      }
    }
  }, true);

  // Bar buttons
  document.getElementById("__sb_send_btn__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_rec_btn__").addEventListener("click", __sbToggleHeadphoneMode);

  // X Auto button — show only on X/Twitter
  const xAutoBtn = document.getElementById("__sb_x_auto_btn__");
  if (__sbIsOnX()) xAutoBtn.style.display = "flex";
  xAutoBtn.addEventListener("click", () => void __sbRunXAutomation());

  // Card footer buttons
  document.getElementById("__sb_card_send__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_card_collapse__").addEventListener("click", __sbCollapseCard);
  document.getElementById("__sb_card_voice_mode_btn__").addEventListener("click", __sbToggleHeadphoneMode);

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
      const selection = window.getSelection?.();
      const selectedText = selection?.toString?.()?.trim?.() || "";
      const anchorNode = selection?.anchorNode || null;
      const selectionNode = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
      const selectedInsideBraino = Boolean(selectedText && selectionNode && bubble.contains(selectionNode));
      await navigator.clipboard.writeText(selectedInsideBraino ? selectedText : __sbLastBubbleRaw);
      const prev = btn.textContent;
      btn.textContent = selectedInsideBraino ? "Selection copied" : "Copied";
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
    document.getElementById("__sb_connector_dropdown__")?.classList.remove("open");
    document.getElementById("__sb_model_dropdown__")?.classList.remove("open");
    document.getElementById("__sb_connector_slash_dropdown__")?.classList.remove("open");
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

  function __sbRefreshConnectorUi() {
    __sbRefreshConnectorButtons();
  }

  function __sbApplyConnectorChoice(connector, options = {}) {
    window.__sbForcedConnector = __sbNormalizeConnectorName(connector) || "auto";
    __sbRefreshConnectorUi();
    if (!options.keepDropdownOpen) __sbCloseAllDropdowns();
  }

  function __sbSetupConnectorBtn(btnEl) {
    if (!btnEl) return;
    btnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = connectorDd.classList.contains("open");
      __sbCloseAllDropdowns();
      if (!isOpen) {
        __sbPositionDropdown(connectorDd, btnEl);
        connectorDd.classList.add("open");
        __sbOpenDropdown = "connector";
      }
    });
  }

  function __sbPositionSlashDropdown(inputEl) {
    const rect = inputEl.getBoundingClientRect();
    connectorSlashDd.style.left = rect.left + "px";
    connectorSlashDd.style.bottom = (window.innerHeight - rect.top + 6) + "px";
    connectorSlashDd.style.top = "auto";
    connectorSlashDd.style.minWidth = Math.max(rect.width, 220) + "px";
  }

  function __sbRenderSlashConnectorOptions(filterText, inputEl) {
    const normalized = String(filterText || "").trim().toLowerCase();
    const options = [
      { connector: "google-drive", icon: "🗂", label: "Google Drive", aliases: ["drive", "gdrive"] },
      { connector: "gmail", icon: "✉", label: "Gmail", aliases: ["gmail", "mail"] },
      { connector: "auto", icon: "↗", label: "Auto detect", aliases: ["auto"] },
    ].filter((option) => {
      if (!normalized) return true;
      return option.connector.includes(normalized)
        || option.label.toLowerCase().includes(normalized)
        || option.aliases.some((alias) => alias.includes(normalized));
    });

    if (!options.length) {
      connectorSlashDd.classList.remove("open");
      return;
    }

    connectorSlashDd.innerHTML = `
      <div class="sb-dropdown-label">Choose connector</div>
      ${options.map((option) => `
        <button class="sb-dropdown-item" data-slash-connector="${option.connector}">
          <span class="sb-di-icon">${option.icon}</span>
          <span class="sb-di-label">${option.label}</span>
        </button>
      `).join("")}
    `;
    connectorSlashDd.querySelectorAll("[data-slash-connector]").forEach((item) => {
      item.addEventListener("click", () => {
        const connector = item.getAttribute("data-slash-connector");
        const shortName = connector === "google-drive" ? "drive" : connector;
        inputEl.value = connector === "auto" ? "" : `/${shortName} `;
        __sbApplyConnectorChoice(connector);
        connectorSlashDd.classList.remove("open");
        inputEl.focus();
      });
    });
    __sbPositionSlashDropdown(inputEl);
    connectorSlashDd.classList.add("open");
    __sbOpenDropdown = "connector-slash";
  }

  function __sbSyncSlashConnectorDropdown(inputEl) {
    const value = String(inputEl?.value || "");
    const match = value.match(/^\/([a-z-]*)$/i);
    if (!match) {
      connectorSlashDd.classList.remove("open");
      if (__sbOpenDropdown === "connector-slash") __sbOpenDropdown = null;
      return;
    }
    __sbRenderSlashConnectorOptions(match[1], inputEl);
  }

  __sbSetupConnectorBtn(document.getElementById("__sb_connector_btn__"));
  __sbSetupConnectorBtn(document.getElementById("__sb_card_connector_btn__"));

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
      if ((mode === "lecture" || mode === "meeting") && !__sbIsLectureRecording) {
        __sbShowLectureReadyCard(mode);
      }
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

  connectorDd.querySelectorAll(".sb-dropdown-item").forEach((item) => {
    item.addEventListener("click", () => {
      __sbApplyConnectorChoice(item.dataset.connector);
    });
  });

  document.addEventListener("click", (e) => {
    if (__sbOpenDropdown && !e.target.closest("#__sb_mode_dropdown__,#__sb_model_dropdown__,#__sb_connector_dropdown__,#__sb_connector_slash_dropdown__,#__sb_mode_btn__,#__sb_card_mode_btn__,#__sb_connector_btn__,#__sb_card_connector_btn__")) {
      __sbCloseAllDropdowns();
    }
  });

  // Bar input
  const inputEl = document.getElementById("__sb_input__");
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbToggleInput(false);
  });
  inputEl.addEventListener("input", () => __sbSyncSlashConnectorDropdown(inputEl));

  // Card input
  const cardInputEl = document.getElementById("__sb_card_input__");
  cardInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); __sbSendMessage(); }
    if (e.key === "Escape") __sbCollapseCard();
  });
  cardInputEl.addEventListener("input", () => {
    cardInputEl.style.height = "auto";
    cardInputEl.style.height = Math.min(cardInputEl.scrollHeight, 80) + "px";
    __sbSyncSlashConnectorDropdown(cardInputEl);
  });

  window.__sbForcedConnector = __sbNormalizeConnectorName(window.__sbForcedConnector) || "auto";
  __sbRefreshConnectorUi();
  __sbSyncSpotifyVisualState();
}

function __sbShouldFollowCursor() {
  if (!__sbCursorRideMode || !__sbBrainVisible || __sbInputOpen || __sbHeadphoneMode || __sbIsLectureRecording) return false;
  if (document.getElementById("__sb_card_wrap__")?.classList.contains("visible")) return false;
  return !!document.getElementById("__sb_root__") && !!document.getElementById("__sb_brain_btn__");
}

function __sbClampCursorFollow(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function __sbGetCursorFollowAnchor(root, brainBtn) {
  const rootWidth = root.offsetWidth || 360;
  const rootHeight = root.offsetHeight || 110;
  const brainWidth = brainBtn.offsetWidth || 52;
  const brainHeight = brainBtn.offsetHeight || 52;
  return {
    x: rootWidth - brainWidth / 2,
    y: rootHeight - brainHeight / 2,
    rootWidth,
    rootHeight,
  };
}

function __sbGetCursorFollowTarget() {
  const root = document.getElementById("__sb_root__");
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (!root || !brainBtn) return null;

  const { x: anchorX, y: anchorY, rootWidth, rootHeight } = __sbGetCursorFollowAnchor(root, brainBtn);
  const cursorX = __sbHoverPoint.x || window.innerWidth - 32;
  const cursorY = __sbHoverPoint.y || window.innerHeight - 32;
  const sideOffset = cursorX > window.innerWidth * 0.6 ? -46 : 46;
  const verticalOffset = cursorY > window.innerHeight * 0.7 ? -44 : 36;
  const minCenterX = anchorX + 18;
  const maxCenterX = window.innerWidth - (rootWidth - anchorX) - 18;
  const minCenterY = anchorY + 18;
  const maxCenterY = window.innerHeight - (rootHeight - anchorY) - 18;
  const iconCenterX = __sbClampCursorFollow(cursorX + sideOffset, minCenterX, Math.max(minCenterX, maxCenterX));
  const iconCenterY = __sbClampCursorFollow(cursorY + verticalOffset, minCenterY, Math.max(minCenterY, maxCenterY));

  return {
    x: iconCenterX - anchorX,
    y: iconCenterY - anchorY,
  };
}

function __sbApplyRootPosition(left, top) {
  const root = document.getElementById("__sb_root__");
  if (!root) return;
  root.style.left = `${Math.round(left)}px`;
  root.style.top = `${Math.round(top)}px`;
  root.style.right = "auto";
  root.style.bottom = "auto";
}

function __sbStopCursorFollow() {
  if (__sbCursorFollowRaf) {
    cancelAnimationFrame(__sbCursorFollowRaf);
    __sbCursorFollowRaf = 0;
  }
  __sbCursorFollowNeedsFrame = false;
  __sbCursorFollowPosition = null;
}

function __sbAnchorRootBottomRight() {
  const root = document.getElementById("__sb_root__");
  if (!root) return;
  __sbStopCursorFollow();
  root.style.left = "auto";
  root.style.top = "auto";
  root.style.right = "20px";
  root.style.bottom = "20px";
}

function __sbPositionRootNearCursor(force = false) {
  const target = __sbGetCursorFollowTarget();
  if (!target) return;

  if (force || !__sbCursorFollowPosition) {
    __sbCursorFollowPosition = { ...target };
    __sbApplyRootPosition(target.x, target.y);
  }
}

function __sbRunCursorFollowFrame() {
  __sbCursorFollowRaf = 0;
  __sbCursorFollowNeedsFrame = false;

  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (!brainBtn) return;

  const currentRect = brainBtn.getBoundingClientRect();
  const dx = (__sbHoverPoint.x || 0) - (currentRect.left + currentRect.width / 2);
  const dy = (__sbHoverPoint.y || 0) - (currentRect.top + currentRect.height / 2);
  const distanceToBrain = Math.hypot(dx, dy);

  if (!__sbShouldFollowCursor() || distanceToBrain < 92 || __sbIsOwnUiNode(document.elementFromPoint(__sbHoverPoint.x, __sbHoverPoint.y))) {
    return;
  }

  const target = __sbGetCursorFollowTarget();
  if (!target) return;

  if (!__sbCursorFollowPosition) {
    __sbCursorFollowPosition = { ...target };
  }

  __sbCursorFollowPosition.x += (target.x - __sbCursorFollowPosition.x) * 0.18;
  __sbCursorFollowPosition.y += (target.y - __sbCursorFollowPosition.y) * 0.18;
  __sbApplyRootPosition(__sbCursorFollowPosition.x, __sbCursorFollowPosition.y);

  if (Math.abs(target.x - __sbCursorFollowPosition.x) > 0.6 || Math.abs(target.y - __sbCursorFollowPosition.y) > 0.6) {
    __sbScheduleCursorFollow();
  }
}

function __sbScheduleCursorFollow() {
  if (__sbCursorFollowNeedsFrame || __sbCursorFollowRaf) return;
  __sbCursorFollowNeedsFrame = true;
  __sbCursorFollowRaf = requestAnimationFrame(__sbRunCursorFollowFrame);
}

function __sbSetCursorRideMode(enabled) {
  __sbCursorRideMode = Boolean(enabled);
  if (__sbCursorRideMode) {
    __sbPositionRootNearCursor(true);
    __sbScheduleCursorFollow();
  } else {
    __sbAnchorRootBottomRight();
  }
}

function __sbHasExternalEditableFocus() {
  const active = document.activeElement;
  if (!(active instanceof Element)) return false;
  if (active.closest("#__sb_root__, #__sb_card_wrap__")) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    active.isContentEditable ||
    active.getAttribute("contenteditable") === "true" ||
    active.getAttribute("role") === "textbox"
  );
}

function __sbOpenCursorRideMode() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  const btn = document.getElementById("__sb_brain_btn__");
  if (btn) btn.style.display = "";
  __sbBrainVisible = true;
  __sbToggleInput(false, { skipPersist: true });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  const wrap = document.getElementById("__sb_card_wrap__");
  if (wrap) wrap.classList.remove("visible");
  __sbStopOrbit();
  __sbSetCursorRideMode(true);
}

function __sbOpenAnchoredBrain() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  const btn = document.getElementById("__sb_brain_btn__");
  if (btn) btn.style.display = "";
  __sbBrainVisible = true;
  __sbSetCursorRideMode(false);
  __sbToggleInput(true, { skipPersist: true });
  if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: true });
  __sbSyncIdleState();
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
  const alreadyOpen = wrap.classList.contains("visible");
  wrap.classList.add("visible");
  if (!alreadyOpen) {
    wrap.classList.add("animating-in");
    requestAnimationFrame(() => setTimeout(() => wrap.classList.remove("animating-in"), 400));
  }
  if (options.rich) setTimeout(() => __sbStartOrbit(), 60);
  else __sbStopOrbit();
  const bubble = wrap.querySelector("#__sb_bubble__");
  if (bubble) bubble.classList.toggle("sb-light", __sbDetectPageTheme() === "light");
  __sbInitCardDrag(wrap);
  __sbScheduleCursorFollow();
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
  __sbScheduleCursorFollow();
  __sbSyncIdleState(); // back to docked idle — resume animations
}

function __sbStartOrbit() {
  const card = document.getElementById("__sb_bubble__");
  const orbitBrain = document.getElementById("__sb_orbit_brain__");
  if (!card || !orbitBrain) return;
  // Hide the main brain button so only the orbiting one is visible
  const mainBrain = document.getElementById("__sb_brain_btn__");
  if (mainBrain) mainBrain.style.visibility = "hidden";
  __sbUpdateOrbitPath();
  orbitBrain.dataset.orbitActive = "1";
  orbitBrain.style.animation = "__sb_orbit__ 12s linear infinite";
}

function __sbUpdateOrbitPath() {
  const card = document.getElementById("__sb_bubble__");
  const orbitBrain = document.getElementById("__sb_orbit_brain__");
  if (!card || !orbitBrain) return;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const r = 24;
  const path = `M ${r},0 H ${w - r} Q ${w},0 ${w},${r} V ${h - r} Q ${w},${h} ${w - r},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`;
  orbitBrain.style.offsetPath = `path("${path}")`;
}

function __sbStopOrbit() {
  const orbitBrain = document.getElementById("__sb_orbit_brain__");
  if (orbitBrain) {
    orbitBrain.dataset.orbitActive = "0";
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
  const MIN_W = 280;
  const MIN_H = 120;
  const VIEWPORT_PAD = 16;

  function pin() {
    const rect = wrap.getBoundingClientRect();
    wrap.style.left = rect.left + "px";
    wrap.style.top = rect.top + "px";
    wrap.style.transform = "none";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyCardFrame(left, top, width, height) {
    const maxWidth = Math.max(MIN_W, window.innerWidth - VIEWPORT_PAD * 2);
    const maxHeight = Math.max(MIN_H, window.innerHeight - VIEWPORT_PAD * 2);
    const nextWidth = clamp(width, MIN_W, maxWidth);
    const nextHeight = clamp(height, MIN_H, maxHeight);
    const nextLeft = clamp(left, VIEWPORT_PAD, window.innerWidth - nextWidth - VIEWPORT_PAD);
    const nextTop = clamp(top, VIEWPORT_PAD, window.innerHeight - nextHeight - VIEWPORT_PAD);

    wrap.style.left = Math.round(nextLeft) + "px";
    wrap.style.top = Math.round(nextTop) + "px";
    wrap.style.width = Math.round(nextWidth) + "px";
    bubble.style.height = Math.round(nextHeight) + "px";
    bubble.style.maxHeight = Math.round(nextHeight) + "px";

    if (document.getElementById("__sb_orbit_brain__")?.dataset.orbitActive === "1") {
      __sbUpdateOrbitPath();
    }
  }

  function positionCard(left, top) {
    const width = wrap.getBoundingClientRect().width;
    const height = bubble.getBoundingClientRect().height;
    const nextLeft = clamp(left, VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD);
    const nextTop = clamp(top, VIEWPORT_PAD, window.innerHeight - height - VIEWPORT_PAD);
    wrap.style.left = Math.round(nextLeft) + "px";
    wrap.style.top = Math.round(nextTop) + "px";

    if (document.getElementById("__sb_orbit_brain__")?.dataset.orbitActive === "1") {
      __sbUpdateOrbitPath();
    }
  }

  // Drag from header
  header.style.cursor = "grab";
  let dragging = false;
  let ox = 0;
  let oy = 0;
  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    dragging = true;
    pin();
    ox = e.clientX - wrap.getBoundingClientRect().left;
    oy = e.clientY - wrap.getBoundingClientRect().top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });

  const handles = [
    { dir: "n", css: "top:-6px;left:18px;right:18px;height:12px;cursor:n-resize;" },
    { dir: "s", css: "bottom:-6px;left:18px;right:18px;height:12px;cursor:s-resize;" },
    { dir: "e", css: "top:18px;right:-6px;bottom:18px;width:12px;cursor:e-resize;" },
    { dir: "w", css: "top:18px;left:-6px;bottom:18px;width:12px;cursor:w-resize;" },
    { dir: "ne", css: "top:-6px;right:-6px;width:16px;height:16px;cursor:ne-resize;" },
    { dir: "nw", css: "top:-6px;left:-6px;width:16px;height:16px;cursor:nw-resize;" },
    {
      dir: "se",
      css: "bottom:-6px;right:-6px;width:18px;height:18px;cursor:se-resize;display:flex;align-items:flex-end;justify-content:flex-end;opacity:0.55;color:currentColor;",
      icon: `<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 3 L3 11 M11 7 L7 11"/></svg>`,
    },
    { dir: "sw", css: "bottom:-6px;left:-6px;width:16px;height:16px;cursor:sw-resize;" },
  ];

  let resizing = null;
  handles.forEach(({ dir, css, icon }) => {
    const handle = document.createElement("div");
    handle.className = "sb-resize-handle";
    handle.dataset.dir = dir;
    handle.style.cssText = `position:absolute;z-index:12;touch-action:none;background:transparent;${css}`;
    if (icon) handle.innerHTML = icon;
    wrap.appendChild(handle);
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      pin();
      const wr = wrap.getBoundingClientRect();
      const br = bubble.getBoundingClientRect();
      resizing = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: wr.left,
        startTop: wr.top,
        startWidth: wr.width,
        startHeight: br.height,
        startRight: wr.left + wr.width,
        startBottom: wr.top + br.height,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = handle.style.cursor;
      e.preventDefault();
      e.stopPropagation();
    });
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      if (document.getElementById("__sb_orbit_brain__")?.dataset.orbitActive === "1") {
        __sbUpdateOrbitPath();
      }
    });
    observer.observe(bubble);
  }

  document.addEventListener("mousemove", (e) => {
    if (dragging) {
      positionCard(e.clientX - ox, e.clientY - oy);
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      let left = resizing.startLeft;
      let top = resizing.startTop;
      let width = resizing.startWidth;
      let height = resizing.startHeight;

      if (resizing.dir.includes("e")) {
        width = clamp(resizing.startWidth + dx, MIN_W, window.innerWidth - resizing.startLeft - VIEWPORT_PAD);
      }
      if (resizing.dir.includes("s")) {
        height = clamp(resizing.startHeight + dy, MIN_H, window.innerHeight - resizing.startTop - VIEWPORT_PAD);
      }
      if (resizing.dir.includes("w")) {
        left = clamp(resizing.startLeft + dx, VIEWPORT_PAD, resizing.startRight - MIN_W);
        width = resizing.startRight - left;
      }
      if (resizing.dir.includes("n")) {
        top = clamp(resizing.startTop + dy, VIEWPORT_PAD, resizing.startBottom - MIN_H);
        height = resizing.startBottom - top;
      }

      applyCardFrame(left, top, width, height);
    }
  });
  document.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; header.style.cursor = "grab"; }
    if (resizing) {
      resizing = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  });
  window.addEventListener("resize", () => {
    pin();
    if (bubble.style.height) {
      applyCardFrame(
        wrap.getBoundingClientRect().left,
        wrap.getBoundingClientRect().top,
        wrap.getBoundingClientRect().width,
        bubble.getBoundingClientRect().height,
      );
    } else {
      positionCard(wrap.getBoundingClientRect().left, wrap.getBoundingClientRect().top);
    }
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
let __sbXStopReason = 'finished';
const __sbXPreReplyDelayMs = 3000;
const __sbXPostReplySettleMs = 1500;
const __sbXPoliticalHandleBlocklist = new Set([
  'narendramodi',
  'potus',
  'vp',
  'whitehouse',
]);
const __sbXPoliticalTextPattern = /\b(election|elections|vote|voting|voter|ballot|campaign|candidate|politic|political|politician|president|prime minister|minister|parliament|congress|senate|democrat|republican|bjp|aap|conservative|labour party|government|governance|policy|policies|manifesto|opposition|cabinet|lok sabha|rajya sabha|chief minister|cm\b|mp\b|mla\b|senator|governor)\b/i;
const __sbXBuilderPromptPattern = /\b(what(?:'s| is)?\s+(?:everyone|everybody|yall|you all|you)\s+building|what are you building|what(?:'re| are)\s+you building|drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links|website)|share\s+what\s+you(?:'re| are)\s+building|show\s+me\s+what\s+you(?:'re| are)\s+building|plug\s+your\s+(?:startup|product|app|tool|project)|builders?\s+drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links))\b/i;

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

function __sbXGetTweetPermalink(article) {
  const link =
    article.querySelector('a[href*="/status/"] time')?.closest('a[href*="/status/"]') ||
    [...article.querySelectorAll('a[href*="/status/"]')].find(el => /\/status\/\d+/.test(el.getAttribute('href') || ''));
  const href = link?.getAttribute('href') || '';
  if (!href) return '';
  try { return new URL(href, location.origin).href; } catch { return ''; }
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

function __sbXGetSocialContextText(article) {
  return __sbXNormalizeText(
    article.querySelector('[data-testid="socialContext"]')?.innerText ||
    article.querySelector('[data-testid="socialContext"]')?.textContent ||
    ''
  );
}

function __sbXGetUserNameText(article) {
  return __sbXNormalizeText(
    article.querySelector('[data-testid="User-Name"]')?.innerText ||
    article.querySelector('[data-testid="User-Name"]')?.textContent ||
    ''
  );
}

function __sbXGetDisplayName(article) {
  const block = article.querySelector('[data-testid="User-Name"]');
  if (!block) return '';

  const text = String(block.innerText || block.textContent || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('@'));

  return text || '';
}

function __sbXIsAdTweet(article) {
  const socialContext = __sbXGetSocialContextText(article);
  if (/\b(ad|promoted)\b/.test(socialContext)) return true;

  const headerText = __sbXGetUserNameText(article);
  if (/\b(ad|promoted)\b/.test(headerText)) return true;

  const lines = String(article.innerText || article.textContent || '')
    .split('\n')
    .map((line) => __sbXNormalizeText(line))
    .filter(Boolean);
  return lines.some((line) => line === 'ad' || line === 'promoted');
}

function __sbXIsBuilderPrompt(text) {
  return __sbXBuilderPromptPattern.test(String(text || ''));
}

function __sbXIsPoliticalTweet(article, data) {
  const handle = String(data?.handle || '').toLowerCase();
  if (handle && __sbXPoliticalHandleBlocklist.has(handle)) return true;

  const context = [
    data?.text || '',
    data?.displayName || '',
    data?.handle || '',
    __sbXGetSocialContextText(article),
    __sbXGetUserNameText(article),
  ]
    .filter(Boolean)
    .join(' ');

  if (__sbXPoliticalTextPattern.test(context)) return true;

  return /\b(modi|narendra modi|bjp|congress|aap|politics|political|prime minister|president)\b/i.test(context);
}

function __sbXFormatRunMinutes(durationMs) {
  const minutes = Math.max(0.1, Math.round((Math.max(0, durationMs) / 60000) * 10) / 10);
  const formatted = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
  return `${formatted} minute${formatted === '1' ? '' : 's'}`;
}

async function __sbXRecordRunStats(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'recordXAutomationRunStats', ...payload }, (res) => {
      void chrome.runtime.lastError;
      resolve(res || { ok: false });
    });
  });
}

function __sbXLogReply(payload) {
  chrome.runtime.sendMessage({ action: 'logXReply', ...payload }, () => {
    void chrome.runtime.lastError;
  });
}

function __sbXFindTweets(selfHandles) {
  return [...document.querySelectorAll('article[data-testid="tweet"]')]
    .map((article) => ({ article, data: __sbXGetTweetData(article) }))
    .filter(({ article, data }) => {
      const socialContext = __sbXGetSocialContextText(article);
      if (__sbXReplied.has(article)) return false;
      if (__sbXIsAdTweet(article)) return false;
      if (__sbXIsPoliticalTweet(article, data)) return false;
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
  const displayName = __sbXGetDisplayName(article);
  return { text, handle, key, displayName, isBuilderPrompt: __sbXIsBuilderPrompt(text) };
}

async function __sbXExpandShowMore(article) {
  const showMore =
    article.querySelector('[data-testid="tweet-text-show-more-link"]') ||
    [...article.querySelectorAll('[data-testid="tweetText"] a, [data-testid="tweetText"] span[role="link"]')]
      .find(el => /^show\s+more$/i.test((el.innerText || el.textContent || '').trim()));
  if (!showMore) return;
  showMore.click();
  await __sbSleep(600);
}

async function __sbXGenerateReply(tweetText, handle, options = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'generateXReply', tweetText, handle, ...options }, (res) => {
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

async function __sbRunXAutomation(options = {}) {
  if (!__sbIsOnX()) {
    __sbShowBubble('Navigate to X (twitter.com) first, then start the automation.', true, { tone: 'status', title: 'X Automation' });
    return { ok: false, error: "Navigate to X first." };
  }
  if (__sbXRunning) {
    if (options.startOnly) {
      __sbShowBubble('X Automation is already running.', false, { tone: 'status', title: 'X Automation' });
      return { ok: true, alreadyRunning: true };
    }
    __sbXStopReason = 'manual';
    __sbXRunning = false;
    const btn = document.getElementById('__sb_x_auto_btn__');
    if (btn) { btn.classList.remove('running'); document.getElementById('__sb_x_auto_label__').textContent = 'X Auto'; }
    __sbShowBubble('Automation stopped.', true, { tone: 'status', title: 'Stopped' });
    return { ok: true, stopped: true };
  }

  __sbXRunning = true;
  __sbXStopReason = 'finished';
  __sbXProcessedKeys.clear();
  const btn = document.getElementById('__sb_x_auto_btn__');
  if (btn) { btn.classList.add('running'); document.getElementById('__sb_x_auto_label__').textContent = 'Stop'; }
  __sbSetStopBtn(true);
  __sbShowBubble('X Automation started — scanning your timeline…', false, { tone: 'status', title: 'X Automation' });

  let count = 0;
  let scrollStreak = 0;
  const runStartedAt = Date.now();

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

    // Expand truncated post so AI sees the full text, not just the 280-char preview
    await __sbXExpandShowMore(article);
    const expanded = __sbXGetTweetData(article);
    const tweetUrl = __sbXGetTweetPermalink(article);

    const { handle, isBuilderPrompt } = expanded;
    const text = expanded.text || data.text;
    if (!text || text.length < 8) continue;

    __sbShowBubble(`@${handle}: "${text.slice(0, 60)}…" — generating reply`, false, { tone: 'status', title: 'X Automation' });
    const reply = await __sbXGenerateReply(text, handle, { builderPrompt: isBuilderPrompt });
    if (!reply) { await __sbSleep(2000); continue; }

    if (__sbXPreReplyDelayMs > 0) {
      const waitSeconds = Math.round(__sbXPreReplyDelayMs / 1000);
      __sbShowBubble(`@${handle}: reply ready — waiting ${waitSeconds}s before posting`, false, { tone: 'status', title: 'X Automation' });
      await __sbSleep(__sbXPreReplyDelayMs);
      if (!__sbXRunning) break;
    }

    const ok = await __sbXPostReply(article, reply.slice(0, 240));
    if (ok) {
      count++;
      __sbXLogReply({
        postAuthorHandle: handle,
        postAuthorDisplayName: expanded.displayName,
        postUrl: tweetUrl,
        postText: text,
        ourReply: reply.slice(0, 240),
        repliedAt: new Date().toISOString(),
      });
      __sbShowBubble(`Replied to ${count} post${count !== 1 ? 's' : ''} — scanning…`, false, { tone: 'status', title: 'X Automation' });
      await __sbSleep(__sbXPostReplySettleMs);
    } else {
      await __sbSleep(3000);
    }
  }

  __sbXRunning = false;
  if (btn) { btn.classList.remove('running'); document.getElementById('__sb_x_auto_label__').textContent = 'X Auto'; }
  __sbSetStopBtn(false);
  const runFinishedAt = Date.now();
  const durationMs = Math.max(0, runFinishedAt - runStartedAt);
  await __sbXRecordRunStats({
    repliedCount: count,
    durationMs,
    startedAt: new Date(runStartedAt).toISOString(),
    finishedAt: new Date(runFinishedAt).toISOString(),
  });
  const label = __sbXStopReason === 'manual' ? 'Automation stopped' : 'Automation finished';
  __sbShowBubble(`${label} — replied to ${count} post${count !== 1 ? 's' : ''} in ${__sbXFormatRunMinutes(durationMs)}.`, true, { tone: 'status', title: 'Done' });
  return { ok: true, repliedCount: count, durationMs };
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
    __sbSetCursorRideMode(false);
    if (btn) btn.style.display = "none";
    __sbToggleInput(false, { skipPersist: true });
    if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
    const wrap = document.getElementById("__sb_card_wrap__");
    if (wrap) wrap.classList.remove("visible");
    __sbStopOrbit();
    if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: false });
  } else {
    __sbBrainVisible = true;
    if (btn) btn.style.display = "";
    __sbSetCursorRideMode(false);
    __sbToggleInput(true, { skipPersist: true });
    if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: true });
  }
}

function __sbToggleInput(open, options = {}) {
  if (!__sbOwnsInlineUi()) return;
  if (open) {
    // While Spotify is playing, clicking the brain opens the player card, not the bar
    if (__sbSpotifyIsPlaying()) {
      const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
      if (cardOpen) { __sbCollapseCard(); } else { __sbRenderSpotifyPanel({ openCard: true, focusInput: false }); }
      return;
    }

    if (!__sbContextOk()) {
      __sbShowBubble("Reload this page to reconnect Braino.", true, { tone: "status" });
      return;
    }

    const bar = document.getElementById("__sb_bar__");
    if (!bar) return;

    // Skip the wakeup animation if already in a normal open state (e.g. card was visible)
    const cardOpen = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
    if (cardOpen) {
      chrome.storage.local.get("authToken", ({ authToken }) => {
        if (!authToken) { __sbSetupBarSignIn(); return; }
        __sbInputOpen = true;
        if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: true });
        __sbSetGreetingPlaceholder();
      });
      return;
    }

    const brainBtn = document.getElementById("__sb_brain_btn__");

    const __sbOpenBarReady = () => {
      bar.classList.remove("sb-signin", "sb-waking");
      bar.classList.add("open");
      __sbInputOpen = true;
      if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: true });
      __sbSetGreetingPlaceholder();
      // Sync voice/headphone button state with current runtime state
      document.getElementById("__sb_rec_btn__")?.classList.toggle("active", __sbHeadphoneMode);
      document.getElementById("__sb_card_voice_mode_btn__")?.classList.toggle("active", __sbHeadphoneMode);
      __sbStorageGet(["aiProvider"]).then(({ aiProvider }) => {
        const model = aiProvider === "claude" ? "claude" : "lovable";
        document.querySelectorAll("#__sb_model_dropdown__ .sb-dropdown-item").forEach(b =>
          b.classList.toggle("selected", b.dataset.model === model));
      });
      if (!options.suppressFocus) setTimeout(() => document.getElementById("__sb_input__")?.focus(), 50);
    };

    chrome.storage.local.get("sbHasAwoken", ({ sbHasAwoken }) => {
      if (sbHasAwoken) {
        // Fast path — cinematic played before, open bar directly
        chrome.storage.local.get("authToken", ({ authToken }) => {
          if (!authToken) {
            bar.classList.add("open", "sb-signin");
            __sbSetupBarSignIn();
            return;
          }
          __sbOpenBarReady();
        });
        return;
      }

      // First-ever open: cinematic wakeup
      chrome.storage.local.set({ sbHasAwoken: true });

      // Phase 1 (0–1200ms): sleeping, silent
      if (brainBtn) {
        brainBtn.classList.remove("sb-brain-auth", "sb-brain-authed", "sb-brain-rejected");
        brainBtn.innerHTML = __SB_BRAIN_SVG_SLEEPING;
      }

      // Phase 2 (1200ms): yellow glow + open silent auth tab in background
      setTimeout(() => {
        if (brainBtn) brainBtn.classList.add("sb-brain-auth");
        const tYellow = Date.now();
        const minYellow = 800;

        chrome.runtime.sendMessage({ action: "openSilentAuthTab" }, () => { void chrome.runtime.lastError; });

        let resolved = false;

        const goGreen = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(fallbackTimer);
          chrome.storage.onChanged.removeListener(authWatcher);
          const wait = Math.max(0, minYellow - (Date.now() - tYellow));
          setTimeout(() => {
            if (brainBtn) { brainBtn.classList.remove("sb-brain-auth"); brainBtn.innerHTML = __SB_BRAIN_SVG; brainBtn.classList.add("sb-brain-authed"); }
            setTimeout(() => {
              if (brainBtn) brainBtn.classList.remove("sb-brain-authed");
              __sbOpenBarReady();
            }, 1100);
          }, wait);
        };

        const goRed = () => {
          if (resolved) return;
          resolved = true;
          chrome.storage.onChanged.removeListener(authWatcher);
          if (brainBtn) { brainBtn.classList.remove("sb-brain-auth"); brainBtn.classList.add("sb-brain-rejected"); }
          setTimeout(() => {
            if (brainBtn) brainBtn.classList.remove("sb-brain-rejected");
            bar.classList.add("open", "sb-signin");
            if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: false });
            __sbSetupBarSignIn();
          }, 700);
        };

        const authWatcher = (changes, area) => {
          if (area === "local" && changes.authToken?.newValue) goGreen();
        };
        chrome.storage.onChanged.addListener(authWatcher);

        const fallbackTimer = setTimeout(goRed, 6000);
      }, 1200);
    });
  } else {
    __sbInputOpen = false;
    if (!options.skipPersist && __sbContextOk()) chrome.storage.local.set({ sbBrainExpanded: false });
    const bar = document.getElementById("__sb_bar__");
    bar?.classList.remove("open", "sb-waking", "sb-signin");
    __sbScheduleCursorFollow();
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

function __sbCleanLinkedInDisplayText(value) {
  return String(value || "")
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function __sbNormalizeLinkedInLocationLabel(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  if (lower === "hyd") return "Hyderabad";
  if (lower === "blr") return "Bengaluru";
  return clean;
}

function __sbExtractLinkedInSearchContext(promptText, resultText) {
  const source = `${promptText || ""}\n${resultText || ""}`;
  const quoted = source.match(/Jobs I looked at for you in ["“](.+?)["”]\s+for\s+["“](.+?)["”]/i);
  if (quoted) {
    return {
      location: __sbNormalizeLinkedInLocationLabel(quoted[1]),
      role: __sbCleanLinkedInDisplayText(quoted[2]),
    };
  }

  const patterns = [
    /(?:find|search|look for|look up|show|pull up|bring up|get|open)\s+(?:me\s+)?(.+?)\s+(?:jobs?|roles?|positions?|openings?)\s+(?:in|at|near|around)\s+(.+?)(?:\s+(?:for me|please|pls|on linkedin|linkedin))?$/i,
    /(.+?)\s+(?:jobs?|roles?|positions?|openings?)\s+(?:in|at|near|around)\s+(.+?)(?:\s+(?:for me|please|pls|on linkedin|linkedin))?$/i,
  ];
  const firstLine = String(promptText || "").trim();
  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (!match) continue;
    return {
      role: __sbCleanLinkedInDisplayText(match[1]).replace(/\b(?:linkedin|linked in|for|me|please|pls)\b/gi, "").replace(/\s+/g, " ").trim(),
      location: __sbNormalizeLinkedInLocationLabel(
        __sbCleanLinkedInDisplayText(match[2]).replace(/\b(?:for me|please|pls|on linkedin|linkedin)\b/gi, "").trim()
      ),
    };
  }
  return { role: "the role", location: "the location" };
}

function __sbIsLinkedInJobTitleLine(line, lookaheadText = "") {
  const clean = __sbCleanLinkedInDisplayText(line);
  if (!clean || /^#{1,6}\s/.test(clean) || /^LinkedIn Jobs Found$/i.test(clean)) return false;
  if (/^(Link|Description|Requirements|Fit|Final conclusion|Conclusion):/i.test(clean)) return false;
  if (!/\(.*?\)/.test(clean)) return false;
  if (!/(?:\s[—–]\s|\s-\s)/.test(clean)) return false;
  return /Link:\s*https?:\/\/(?:www\.)?linkedin\.com\/jobs/i.test(lookaheadText);
}

function __sbParseLinkedInTitle(line) {
  const clean = __sbCleanLinkedInDisplayText(line);
  const match = clean.match(/^(.*?)\s+[—–]\s+(.+?)\s*\((.*?)\)\s*$/)
    || clean.match(/^(.*?)\s+-\s+(.+?)\s*\((.*?)\)\s*$/);
  if (!match) return { title: clean, company: "Company not captured", location: "Location not captured" };
  return {
    title: __sbCleanLinkedInDisplayText(match[1]),
    company: __sbCleanLinkedInDisplayText(match[2]),
    location: __sbCleanLinkedInDisplayText(match[3]),
  };
}

function __sbParseLinkedInJobBlock(block) {
  const lines = block.map(__sbCleanLinkedInDisplayText).filter(Boolean);
  if (!lines.length) return null;
  const titleInfo = __sbParseLinkedInTitle(lines[0]);
  let link = "";
  let description = "";
  let fit = "";
  const requirements = [];
  let mode = "";

  for (const line of lines.slice(1)) {
    const linkMatch = line.match(/^Link:\s*(https?:\/\/\S+)/i);
    if (linkMatch) {
      link = linkMatch[1];
      mode = "";
      continue;
    }
    const descriptionMatch = line.match(/^Description:\s*(.*)$/i);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
      mode = "description";
      continue;
    }
    if (/^Requirements:\s*$/i.test(line)) {
      mode = "requirements";
      continue;
    }
    const requirementsMatch = line.match(/^Requirements:\s*(.*)$/i);
    if (requirementsMatch) {
      const inline = requirementsMatch[1].trim();
      if (inline) requirements.push(...inline.split(/\s*,\s*/).filter(Boolean));
      mode = "requirements";
      continue;
    }
    const fitMatch = line.match(/^Fit:\s*(.*)$/i);
    if (fitMatch) {
      fit = fitMatch[1].trim();
      mode = "fit";
      continue;
    }

    if (mode === "requirements") requirements.push(line);
    else if (mode === "description" && !description) description = line;
    else if (mode === "description") description += ` ${line}`;
    else if (mode === "fit") fit += ` ${line}`;
  }

  if (!link && !description && !fit) return null;
  const verdict = (fit.match(/^(Strong|Maybe|Weak|Unknown)/i)?.[1] || "Maybe").toLowerCase();
  const fitReason = fit.replace(/^(Strong|Maybe|Weak|Unknown)\s*[—–-]?\s*/i, "").trim() || fit || "Braino did not capture a fit reason.";
  return {
    ...titleInfo,
    link,
    description: description || "No description captured.",
    requirements: requirements.length ? requirements.slice(0, 7) : ["Not visible in the captured excerpt."],
    verdict,
    fitReason,
  };
}

function __sbParseLinkedInJobsResult(md) {
  const text = String(md || "").replace(/\r/g, "").trim();
  if (!/linkedin jobs found|linkedin\.com\/jobs\/view|jobs i looked at for you/i.test(text)) return null;
  const rawLines = text.split("\n");
  const blocks = [];
  let conclusionLines = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (/^(?:Final conclusion|Conclusion|Braino(?:'s)? take):/i.test(__sbCleanLinkedInDisplayText(line))) {
      conclusionLines = rawLines.slice(i).map(__sbCleanLinkedInDisplayText).filter(Boolean);
      break;
    }
    const lookaheadText = rawLines.slice(i, Math.min(i + 8, rawLines.length)).join("\n");
    if (!__sbIsLinkedInJobTitleLine(line, lookaheadText)) continue;
    const block = [line];
    let j = i + 1;
    for (; j < rawLines.length; j++) {
      const next = rawLines[j].trim();
      const nextLookahead = rawLines.slice(j, Math.min(j + 8, rawLines.length)).join("\n");
      if (__sbIsLinkedInJobTitleLine(next, nextLookahead)) break;
      if (/^(?:Final conclusion|Conclusion|Braino(?:'s)? take):/i.test(__sbCleanLinkedInDisplayText(next))) break;
      block.push(next);
    }
    const job = __sbParseLinkedInJobBlock(block);
    if (job) blocks.push(job);
    i = j - 1;
  }

  if (!blocks.length) return null;
  return {
    jobs: blocks.slice(0, 6),
    conclusion: conclusionLines.join(" ").replace(/^(Final conclusion|Conclusion|Braino(?:'s)? take):\s*/i, "").trim(),
  };
}

function __sbBuildLinkedInConclusion(jobs, explicitConclusion) {
  if (explicitConclusion) return explicitConclusion;
  const counts = jobs.reduce((acc, job) => {
    acc[job.verdict] = (acc[job.verdict] || 0) + 1;
    return acc;
  }, {});
  const maybe = counts.maybe || 0;
  const strong = counts.strong || 0;
  const weak = counts.weak || 0;
  const unknown = counts.unknown || 0;
  if (strong > 0) return `Braino's take: I found ${jobs.length} roles, with ${strong} strong fit${strong === 1 ? "" : "s"}. Start with the strong matches, then use the maybe roles as backups if the requirements line up with your actual experience.`;
  if (maybe > weak) return `Braino's take: most of these look like maybe fits. They are worth opening, but the deciding factor is whether your SQL, BI, Python, and analytics experience matches the requirements.`;
  if (weak > 0 && maybe === 0 && unknown === 0) return `Braino's take: these roles look senior or mismatched from the captured details. I would refine the search with fresher, junior, remote, or exact-skill filters before applying.`;
  return `Braino's take: I found ${jobs.length} roles, but some details were incomplete. Open the most relevant ones first and verify the requirements before applying.`;
}

function __sbRenderLinkedInJobsCard(md, options = {}) {
  const parsed = __sbParseLinkedInJobsResult(md);
  if (!parsed) return "";
  const context = __sbExtractLinkedInSearchContext(options.prompt || "", md);
  const jobs = parsed.jobs;
  const title = `Jobs I looked at for you in "${context.location || "the location"}" for "${context.role || "the role"}"`;
  const subtitle = `${jobs.length} LinkedIn role${jobs.length === 1 ? "" : "s"} reviewed. Click a job to see the description, requirements, fit, and apply link.`;
  const jobsHtml = jobs.map((job, index) => {
    const verdictClass = ["strong", "maybe", "weak", "unknown"].includes(job.verdict) ? job.verdict : "maybe";
    const verdictLabel = job.verdict ? job.verdict[0].toUpperCase() + job.verdict.slice(1) : "Maybe";
    const reqs = job.requirements.map(req => `<li>${__sbEscapeHtml(req)}</li>`).join("");
    const linkHtml = job.link
      ? `<a class="sb-linkedin-apply" href="${__sbEscapeHtml(job.link)}" target="_blank" rel="noreferrer">Open job / apply</a>`
      : "";
    return `
      <details class="sb-linkedin-job" ${index === 0 ? "open" : ""}>
        <summary>
          <div class="sb-linkedin-job-title">
            <strong>${__sbEscapeHtml(job.title)}</strong>
            <small>${__sbEscapeHtml(job.company)} · ${__sbEscapeHtml(job.location)}</small>
          </div>
          <span class="sb-linkedin-fit ${verdictClass}">${__sbEscapeHtml(verdictLabel)}</span>
        </summary>
        <div class="sb-linkedin-job-body">
          <p>${__sbEscapeHtml(job.description)}</p>
          <div class="sb-linkedin-reqs">
            <span>Requirements Braino saw</span>
            <ul>${reqs}</ul>
          </div>
          <div class="sb-linkedin-fit-note">
            <span>Fit recommendation</span>
            ${__sbEscapeHtml(job.fitReason)}
          </div>
          <div class="sb-linkedin-actions">${linkHtml}</div>
        </div>
      </details>
    `;
  }).join("");

  return `
    <div class="sb-linkedin-card">
      <section class="sb-linkedin-hero">
        <div class="sb-linkedin-kicker">LinkedIn jobs</div>
        <h2>${__sbEscapeHtml(title)}</h2>
        <p>${__sbEscapeHtml(subtitle)}</p>
      </section>
      <section class="sb-linkedin-list">${jobsHtml}</section>
      <section class="sb-linkedin-conclusion">
        <span>Final conclusion</span>
        <p>${__sbEscapeHtml(__sbBuildLinkedInConclusion(jobs, parsed.conclusion))}</p>
      </section>
    </div>
  `;
}

function __sbRenderMarkdown(md, options = {}) {
  const linkedInJobsCard = __sbRenderLinkedInJobsCard(md, options);
  if (linkedInJobsCard) return linkedInJobsCard;

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
  __sbSpeechGeneration += 1;
  if (__sbHasActiveRealtimeResponse()) {
    __sbVoicePendingReply = false;
    __sbInterruptRealtimeResponse();
  }
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

function __sbSpeakWithBrowser(text, speechToken = __sbSpeechGeneration) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      resolve(false);
      return;
    }
    if (speechToken !== __sbSpeechGeneration) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    __sbCurrentUtterance = utterance;
    __sbIsSpeaking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();
    if (__sbHeadphoneMode) { __sbSetHpBrainState("speaking"); }

    const finish = () => {
      if (speechToken === __sbSpeechGeneration) {
        if (__sbCurrentUtterance === utterance) __sbCurrentUtterance = null;
        __sbIsSpeaking = false;
        __sbSetVoiceButtonState(__sbIsRecording);
        __sbSyncSpeakButtons();
      }
      resolve(speechToken === __sbSpeechGeneration);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

function __sbIsRetryableVoiceTtsStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function __sbIsVoiceTtsCreditStatus(status, errorKind = "") {
  const kind = String(errorKind || "").toLowerCase();
  return status === 402 || status === 429 || kind.includes("credit") || kind.includes("rate_limit");
}

async function __sbReadTtsError(resp) {
  const status = resp?.status || 0;
  const errorKind = resp?.headers?.get?.("x-braino-tts-error") || "";
  let message = `${__SB_TTS_PROVIDER} TTS failed: ${status}`;
  try {
    const data = await resp.clone().json();
    if (data?.error) message = String(data.error);
  } catch (_) {
    try {
      const text = await resp.clone().text();
      if (text) message = text.slice(0, 300);
    } catch (_) {}
  }
  const error = new Error(message);
  error.status = status;
  error.errorKind = errorKind;
  error.isCreditIssue = __sbIsVoiceTtsCreditStatus(status, errorKind);
  error.retryable = __sbIsRetryableVoiceTtsStatus(status)
    && !error.isCreditIssue
    && !String(errorKind || "").toLowerCase().includes("api_key");
  return error;
}

async function __sbFetchVoiceTtsWithRetry(url, request, speechToken) {
  const startedAt = Date.now();
  const deadlineAt = startedAt + __SB_TTS_RETRY_MAX_MS;
  let attempt = 0;
  let lastError = null;

  while (Date.now() < deadlineAt) {
    attempt += 1;
    if (speechToken !== __sbSpeechGeneration) return null;

    try {
      const resp = await fetch(url, request);
      if (speechToken !== __sbSpeechGeneration) return null;

      if (resp.ok) {
        const provider = (resp.headers.get("x-braino-tts-provider") || "").toLowerCase();
        if (provider === __SB_TTS_PROVIDER) return resp;
        const providerError = new Error(`Unexpected TTS provider: ${provider || "unknown"}`);
        providerError.retryable = false;
        lastError = providerError;
        break;
      }

      const httpError = await __sbReadTtsError(resp);
      lastError = httpError;
      if (httpError.isCreditIssue || !httpError.retryable) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastError.retryable = true;
    }

    const elapsedMs = Date.now() - startedAt;
    const mustKeepTrying = elapsedMs < __SB_TTS_RETRY_MIN_MS;
    if (!mustKeepTrying && !lastError?.retryable) break;
    if (!mustKeepTrying && Date.now() >= deadlineAt) break;

    const backoffMs = Math.min(2200, 500 + attempt * 450);
    const remainingMs = Math.max(0, deadlineAt - Date.now());
    await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, remainingMs)));
  }

  throw lastError || new Error(`${__SB_TTS_PROVIDER} TTS failed.`);
}

async function __sbSpeakText(text, options = {}) {
  const clean = __sbStripMarkdownForSpeech(text);
  if (!clean) return false;

  __sbStopSpeech();
  const speechToken = ++__sbSpeechGeneration;
  let spoke = false;
  // In headphone (realtime) mode we DON'T mute the mic while ElevenLabs speaks — the whole
  // point of the realtime mechanism is that the user can barge in. The browser's echo
  // cancellation (echoCancellation:true on the mic) keeps Braino's own voice from
  // self-triggering, and speech_started stops playback the instant the user talks. We only
  // mute in legacy (non-headphone) recording, where there's no barge-in VAD.
  const shouldMuteRealtimeMic = false;

  try {
    if (shouldMuteRealtimeMic) __sbSetRealtimeMicEnabled(false);
    const { authToken: ttsToken } = await __sbStorageGet(["authToken"]);
    if (speechToken !== __sbSpeechGeneration) return false;

    // elevenlabs-tts uses a server-side key, so it works
    // with just the anon apikey — no user token required. Send the token when we have it.
    const headers = { "Content-Type": "application/json", apikey: __SB_ANON_KEY };
    if (ttsToken) headers.Authorization = `Bearer ${ttsToken}`;

    const resp = await __sbFetchVoiceTtsWithRetry(`${__SB_API}/${__SB_TTS_ENDPOINT}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: clean,
      }),
    }, speechToken);
    if (!resp) return false;

    const ttsProvider = resp.headers.get("x-braino-tts-provider") || __SB_TTS_PROVIDER;
    const ttsContentType = resp.headers.get("content-type") || "";
    const blob = await resp.blob();
    __sbRecordRealtimeCostTts({
      provider: ttsProvider,
      bytes: blob.size,
      contentType: blob.type || ttsContentType,
    });
    if (speechToken !== __sbSpeechGeneration) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    __sbCurrentSpeechAudio = audio;
    __sbCurrentSpeechUrl = url;
    __sbIsSpeaking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();
    if (__sbHeadphoneMode) { __sbSetHpBrainState("speaking"); }

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
    spoke = speechToken === __sbSpeechGeneration;
  } catch (ttsErr) {
    if (speechToken !== __sbSpeechGeneration) return false;
    __sbRecordRealtimeCostTts({
      provider: "browser",
      error: ttsErr?.message || String(ttsErr || "TTS failed"),
    });
    console.warn("[Braino] ElevenLabs TTS failed; falling back to browser voice:", ttsErr?.message || ttsErr);
    const isCreditIssue = Boolean(ttsErr?.isCreditIssue);
    __sbSetVoiceStatusBadge(isCreditIssue ? "error" : "legacy", isCreditIssue ? "ElevenLabs credits" : "Browser voice");
    if (__sbHeadphoneMode || __sbVoiceOnlyMode) {
      __sbShowVoiceError(isCreditIssue
        ? "ElevenLabs credits or rate limit are exhausted. Falling back to browser voice for now."
        : "ElevenLabs voice is unavailable after retrying. Falling back to browser voice for now.");
    } else {
      __sbShowBubble(isCreditIssue
        ? "ElevenLabs credits or rate limit are exhausted. Using browser voice."
        : "ElevenLabs voice is unavailable. Using browser voice.", true, { tone: "status" });
    }
    spoke = await __sbSpeakWithBrowser(clean, speechToken);
  } finally {
    if (speechToken === __sbSpeechGeneration) {
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
      // After speaking ends in headphone mode, go back to listening
      if (__sbHeadphoneMode && !__sbVoicePendingReply) {
        __sbSetHpBrainState("listening");
      }
    }
    if (shouldMuteRealtimeMic) __sbSetRealtimeMicEnabled(true);
  }
  return spoke;
}


function __sbScrollCardToLatest(scroll) {
  if (!scroll) return;
  const targetScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
  scroll.scrollTop = targetScrollTop;
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 0);
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 80);
}

function __sbPulseFollowupBar() {
  const footer = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-footer");
  if (!footer) return;
  footer.classList.remove("sb-followup-glow");
  void footer.offsetWidth;
  footer.classList.add("sb-followup-glow");
  setTimeout(() => footer.classList.remove("sb-followup-glow"), 850);
}

function __sbNormalizeSpotifyTrack(track = {}) {
  if (!track || typeof track !== "object") return null;
  const title = String(track.title || track.name || "").replace(/\s+/g, " ").trim();
  if (!title) return null;
  const artists = Array.isArray(track.artists)
    ? track.artists.map((item) => String(item || "").trim()).filter(Boolean).join(", ")
    : String(track.artists || "").replace(/\s+/g, " ").trim();
  const album = String(track.album || "").replace(/\s+/g, " ").trim();
  const durationText = String(track.durationText || track.duration || "").replace(/\s+/g, " ").trim();
  const imageUrl = String(track.imageUrl || track.image || track.albumArt || "").trim();
  const href = String(track.href || track.url || "").trim();
  const progressText = String(track.progressText || "").replace(/\s+/g, " ").trim();
  const deviceName = String(track.deviceName || "").replace(/\s+/g, " ").trim();
  let progressRatio = typeof track.progressRatio === "number" ? track.progressRatio : null;
  if (progressRatio == null && progressText && durationText) {
    const progressParts = __sbSpotifyParseDurationParts(progressText);
    const durationParts = __sbSpotifyParseDurationParts(durationText);
    if (progressParts && durationParts?.totalSeconds) {
      progressRatio = Math.max(0, Math.min(1, progressParts.totalSeconds / durationParts.totalSeconds));
    }
  }
  return {
    title,
    artists,
    album,
    durationText,
    imageUrl,
    href,
    progressText,
    progressRatio,
    deviceName,
    isPlaying: Boolean(track.isPlaying),
  };
}

function __sbHasSpotifySurface() {
  return Boolean(
    __sbSpotifyUiState?.active
    && (
      __sbSpotifyUiState.nowPlaying
      || __sbSpotifyUiState.query
      || (__sbSpotifyUiState.searchResults || []).length
    )
  );
}

function __sbSpotifyIsPlaying() {
  return Boolean(__sbSpotifyUiState?.nowPlaying?.isPlaying);
}

function __sbSyncIdleState() {
  const brain = document.getElementById("__sb_brain_btn__");
  if (!brain || !__sbBrainVisible) return;
  // Idle animation runs when Braino is docked but not doing anything active.
  // Removed by music/recording/headphone/speaking states below; re-added here.
  const busy = brain.classList.contains("recording")
    || brain.classList.contains("sb-brain-spotify")
    || brain.classList.contains("sb-brain-music")
    || brain.classList.contains("hp-connecting")
    || brain.classList.contains("hp-listening")
    || brain.classList.contains("hp-captured")
    || brain.classList.contains("hp-speaking");
  brain.classList.toggle("sb-brain-idle", !busy);
}

function __sbSyncSpotifyVisualState() {
  const brain = document.getElementById("__sb_brain_btn__");
  const bubble = document.getElementById("__sb_bubble__");
  const active = __sbSpotifyIsPlaying();
  // Swap the orange Spotify class for a distinct music-glow class while playing.
  brain?.classList.toggle("sb-brain-spotify", false); // retire the old orange glow
  brain?.classList.toggle("sb-brain-music", active);
  bubble?.classList.toggle("sb-spotify-active", active);
  __sbSyncIdleState();
  // Hide the floating bar while music is playing
  if (active) {
    const bar = document.getElementById("__sb_bar__");
    if (bar?.classList.contains("open") && !bar.classList.contains("sb-waking") && !bar.classList.contains("sb-signin")) {
      bar.classList.remove("open");
      __sbInputOpen = false;
    }
  }
}

function __sbEnsureSpotifyRefreshLoop() {
  if (__sbSpotifyRefreshTimer) {
    clearInterval(__sbSpotifyRefreshTimer);
    __sbSpotifyRefreshTimer = null;
  }
  if (!__sbHasSpotifySurface()) {
    __sbSyncSpotifyVisualState();
    return;
  }
  __sbSpotifyRefreshTimer = setInterval(() => {
    const siteContext = __sbGetSiteAdapterContext();
    const cardVisible = document.getElementById("__sb_card_wrap__")?.classList.contains("visible");
    if (siteContext?.site === "spotify") {
      // On Spotify page — use DOM scraping (free)
      __sbRefreshSpotifyStateFromPage({ rerender: cardVisible });
    } else {
      // On any other page — poll the API via background (live sync from phone/other devices)
      chrome.runtime.sendMessage({ action: "syncSpotifyPlayerState" }, () => { void chrome.runtime.lastError; });
    }
  }, 5000);
  __sbSyncSpotifyVisualState();
}

function __sbRefreshSpotifyStateFromPage(options = {}) {
  if (!__sbHasSpotifySurface()) return;
  const siteContext = __sbGetSiteAdapterContext();
  if (siteContext?.site !== "spotify") return;
  const nowPlaying = __sbNormalizeSpotifyTrack(siteContext.nowPlaying || null);
  const searchResults = Array.isArray(siteContext.visibleTrackDetails)
    ? siteContext.visibleTrackDetails.map((track) => __sbNormalizeSpotifyTrack(track)).filter(Boolean).slice(0, 6)
    : (__sbSpotifyUiState.searchResults || []);

  __sbSpotifyUiState = {
    ...__sbSpotifyUiState,
    source: "spotify",
    currentPlaylistName: String(siteContext.currentPlaylistName || __sbSpotifyUiState.currentPlaylistName || "").trim(),
    nowPlaying: nowPlaying || __sbSpotifyUiState.nowPlaying,
    searchResults: searchResults.length ? searchResults : (__sbSpotifyUiState.searchResults || []),
    updatedAt: Date.now(),
  };
  __sbSyncSpotifyVisualState();
  if (options.rerender) __sbRenderSpotifyPanel({ openCard: false, focusInput: false });
}

function __sbGetSpotifyReferenceTrack() {
  return __sbSpotifyUiState.nowPlaying || (__sbSpotifyUiState.searchResults || [])[0] || null;
}

function __sbBuildSpotifyResultsHtml() {
  const results = (__sbSpotifyUiState.searchResults || []).slice(0, 5);
  if (!results.length) {
    return `<div class="sb-spotify-empty">Search results will show here as soon as Spotify loads the track list.</div>`;
  }
  const currentTitle = __sbAdapterNormalizeText(__sbSpotifyUiState.nowPlaying?.title || "");
  return results.map((track) => {
    const isCurrent = currentTitle && __sbAdapterNormalizeText(track.title) === currentTitle;
    const artHtml = track.imageUrl
      ? `<img src="${__sbEscapeHtml(track.imageUrl)}" alt="${__sbEscapeHtml(track.title)} cover art" />`
      : `<div class="sb-spotify-result-art">♪</div>`;
    const metaBits = [track.album, track.durationText].filter(Boolean).join(" · ");
    return `
      <div class="sb-spotify-result${isCurrent ? " is-current" : ""}">
        ${artHtml}
        <div class="sb-spotify-result-copy">
          <div class="sb-spotify-result-title">${__sbEscapeHtml(track.title)}</div>
          <div class="sb-spotify-result-sub">${__sbEscapeHtml(track.artists || "Spotify")}</div>
          <div class="sb-spotify-result-meta">${__sbEscapeHtml(metaBits || "Loaded from Spotify search")}</div>
        </div>
        <div class="sb-spotify-duration">${isCurrent ? "Live" : __sbEscapeHtml(track.durationText || "")}</div>
      </div>
    `;
  }).join("");
}

function __sbBuildSpotifyAboutHtml() {
  const track = __sbGetSpotifyReferenceTrack();
  if (!track) {
    return `<div class="sb-spotify-empty">Ask Branu to play a song on Spotify and this glass modal will turn into the live music view.</div>`;
  }
  const lines = [];
  if (track.artists) lines.push(`<div class="sb-spotify-about-line"><strong>Artist</strong><br>${__sbEscapeHtml(track.artists)}</div>`);
  if (track.album) lines.push(`<div class="sb-spotify-about-line"><strong>Album</strong><br>${__sbEscapeHtml(track.album)}</div>`);
  if (__sbSpotifyUiState.query) lines.push(`<div class="sb-spotify-about-line"><strong>Search</strong><br>${__sbEscapeHtml(__sbSpotifyUiState.query)}</div>`);
  if (__sbSpotifyUiState.currentPlaylistName) lines.push(`<div class="sb-spotify-about-line"><strong>Context</strong><br>${__sbEscapeHtml(__sbSpotifyUiState.currentPlaylistName)}</div>`);
  if (track.deviceName) lines.push(`<div class="sb-spotify-about-line"><strong>Device</strong><br>${__sbEscapeHtml(track.deviceName)}</div>`);
  if (track.durationText || track.progressText) {
    const timing = [track.progressText, track.durationText].filter(Boolean).join(" / ");
    lines.push(`<div class="sb-spotify-about-line"><strong>Timing</strong><br>${__sbEscapeHtml(timing)}</div>`);
  }
  if (__sbSpotifyUiState.summary) {
    lines.push(`<div class="sb-spotify-about-line"><strong>Braino</strong><br>${__sbEscapeHtml(__sbSpotifyUiState.summary)}</div>`);
  }
  return lines.join("") || `<div class="sb-spotify-empty">Spotify is connected, but I need a live track to show details here.</div>`;
}

function __sbBuildSpotifyPanelHtml(extraHistoryHtml = "") {
  if (!__sbHasSpotifySurface()) return "";
  const track = __sbGetSpotifyReferenceTrack();
  const topBadges = [
    `<span class="sb-spotify-badge">Spotify live</span>`,
    __sbSpotifyUiState.query ? `<span class="sb-spotify-badge subtle">Search: ${__sbEscapeHtml(__sbSpotifyUiState.query)}</span>` : "",
    track?.deviceName ? `<span class="sb-spotify-badge subtle">Device: ${__sbEscapeHtml(track.deviceName)}</span>` : "",
  ].filter(Boolean).join("");
  const coverHtml = track?.imageUrl
    ? `<div class="sb-spotify-cover"><img src="${__sbEscapeHtml(track.imageUrl)}" alt="${__sbEscapeHtml(track.title)} cover art" crossorigin="anonymous" /></div>`
    : `<div class="sb-spotify-cover"><div class="sb-spotify-cover-fallback">♪</div></div>`;
  const metaBits = [track?.album, track?.durationText].filter(Boolean).join(" · ");
  const progressWidth = typeof track?.progressRatio === "number"
    ? `${Math.max(4, Math.min(100, Math.round(track.progressRatio * 100)))}%`
    : "14%";
  const fallbackHistoryHtml = __sbSpotifyUiState.summary
    ? __sbBuildCardTurnHtml({ prompt: __sbSpotifyUiState.query || "Spotify", answer: __sbSpotifyUiState.summary }, { rich: false, answerText: __sbSpotifyUiState.summary })
    : "";
  const historyHtml = extraHistoryHtml || fallbackHistoryHtml;

  return `
    <div class="sb-card-stack sb-card-stack-spotify">
      <div class="sb-spotify-shell">
        <div class="sb-spotify-hero${__sbSpotifyIsPlaying() ? " is-playing" : ""}">
          <div class="sb-spotify-hero-top">${topBadges}</div>
          <div class="sb-spotify-hero-main">
            ${coverHtml}
            <div class="sb-spotify-copy">
              <div class="sb-spotify-eyebrow">${__sbSpotifyIsPlaying() ? "Now playing" : "Ready on Spotify"}</div>
              <h3 class="sb-spotify-title">${__sbEscapeHtml(track?.title || "Waiting for Spotify…")}</h3>
              <div class="sb-spotify-subtitle">${__sbEscapeHtml(track?.artists || "Braino will pull the live song details here.")}</div>
              <div class="sb-spotify-meta">${__sbEscapeHtml(metaBits || "Transparent Branu modal, but in music mode.")}</div>
            </div>
          </div>
          <div class="sb-spotify-progress">
            <div class="sb-spotify-progress-bar"><span style="width:${progressWidth}"></span></div>
            <div class="sb-spotify-progress-times">
              <span>${__sbEscapeHtml(track?.progressText || "Live")}</span>
              <span>${__sbEscapeHtml(track?.durationText || "Spotify")}</span>
            </div>
          </div>
          <div class="sb-spotify-controls">
            <button class="sb-spotify-ctrl-btn" data-sb-spotify-ctrl="previous" title="Previous">⏮</button>
            <button class="sb-spotify-ctrl-btn primary" data-sb-spotify-ctrl="${__sbSpotifyIsPlaying() ? "pause" : "play"}" title="${__sbSpotifyIsPlaying() ? "Pause" : "Play"}">${__sbSpotifyIsPlaying() ? "⏸" : "▶"}</button>
            <button class="sb-spotify-ctrl-btn" data-sb-spotify-ctrl="next" title="Next">⏭</button>
          </div>
        </div>
        <div class="sb-spotify-grid">
          <div class="sb-spotify-block">
            <div class="sb-spotify-section-head">Search Results</div>
            <div class="sb-spotify-results">${__sbBuildSpotifyResultsHtml()}</div>
          </div>
          <div class="sb-spotify-block">
            <div class="sb-spotify-section-head">About This Song</div>
            <div class="sb-spotify-about-copy">${__sbBuildSpotifyAboutHtml()}</div>
          </div>
        </div>
      </div>
      ${historyHtml ? `<div class="sb-card-history">${historyHtml}</div>` : ""}
    </div>
  `;
}

function __sbApplyAlbumColor(scroll) {
  const img = scroll?.querySelector(".sb-spotify-cover img");
  const hero = scroll?.querySelector(".sb-spotify-hero");
  if (!img || !hero) return;
  const apply = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 20; canvas.height = 20;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 20, 20);
      const data = ctx.getImageData(0, 0, 20, 20).data;
      let bestR = 80, bestG = 180, bestB = 100, bestScore = -1;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const bri = max / 255;
        const score = sat * 0.65 + bri * 0.35;
        if (score > bestScore && bri > 0.25 && bri < 0.97) {
          bestScore = score; bestR = r; bestG = g; bestB = b;
        }
      }
      hero.style.setProperty("--sb-ac-r", String(bestR));
      hero.style.setProperty("--sb-ac-g", String(bestG));
      hero.style.setProperty("--sb-ac-b", String(bestB));
    } catch (_) {}
  };
  if (img.complete && img.naturalWidth > 0) { apply(); }
  else { img.addEventListener("load", apply, { once: true }); }
}

function __sbRenderSpotifyPanel(options = {}) {
  if (!__sbHasSpotifySurface()) return;
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const historyHtml = __sbCardTurns.map((turn) => __sbBuildCardTurnHtml(turn, { rich: true })).join("");
  scroll.innerHTML = __sbBuildSpotifyPanelHtml(historyHtml);
  scroll.scrollTop = 0;
  __sbApplyAlbumColor(scroll);
  scroll.querySelectorAll("[data-sb-spotify-ctrl]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ctrl = btn.dataset.sbSpotifyCtrl;
      chrome.runtime.sendMessage({ action: "spotifyControl", control: ctrl }, () => { void chrome.runtime.lastError; });
    });
  });
  if (options.openCard) __sbOpenCard({ rich: true });
  __sbSyncSpeakButtons();
  __sbEnsureSpotifyRefreshLoop();
  if (options.focusInput) {
    const input = document.getElementById("__sb_card_input__");
    input?.focus();
  }
}

function __sbApplySpotifyState(state = {}, options = {}) {
  const nowPlaying = __sbNormalizeSpotifyTrack(state.nowPlaying || null);
  const searchResults = Array.isArray(state.searchResults)
    ? state.searchResults.map((track) => __sbNormalizeSpotifyTrack(track)).filter(Boolean).slice(0, 6)
    : (__sbSpotifyUiState.searchResults || []);

  __sbSpotifyUiState = {
    ...__sbSpotifyUiState,
    active: state.active !== false,
    source: "spotify",
    intent: String(state.intent || __sbSpotifyUiState.intent || "").trim(),
    query: String(state.query || __sbSpotifyUiState.query || "").trim(),
    currentPlaylistName: String(state.currentPlaylistName || __sbSpotifyUiState.currentPlaylistName || "").trim(),
    nowPlaying: nowPlaying || __sbSpotifyUiState.nowPlaying,
    searchResults: searchResults.length ? searchResults : (__sbSpotifyUiState.searchResults || []),
    summary: String(state.summary || __sbSpotifyUiState.summary || "").trim(),
    updatedAt: Date.now(),
  };

  __sbEnsureSpotifyRefreshLoop();
  if (options.focusSpotify || options.openCard || document.getElementById("__sb_card_wrap__")?.classList.contains("visible")) {
    __sbRenderSpotifyPanel({ openCard: !!options.openCard, focusInput: false });
  }
}

function __sbBuildCardTurnHtml(turn = {}, options = {}) {
  const prompt = typeof turn.prompt === "string" ? turn.prompt : "";
  const answer = typeof options.answerText === "string"
    ? options.answerText
    : String(turn.answer || "");
  const promptHtml = prompt ? `<div class="sb-card-q">${__sbEscapeHtml(prompt)}</div>` : "";
  const answerHtml = options.rich
    ? `<div class="sb-card-a">${__sbRenderMarkdown(answer, { prompt })}</div>`
    : `<div class="sb-card-status">${__sbEscapeHtml(answer)}</div>`;
  return `<div class="sb-turn">${promptHtml}${answerHtml}</div>`;
}

function __sbRenderCardHistory(scroll, options = {}) {
  if (!scroll) return;
  const historyHtml = __sbCardTurns
    .map((turn) => __sbBuildCardTurnHtml(turn, { rich: true }))
    .join("");
  const pendingHtml = options.pendingTurn
    ? __sbBuildCardTurnHtml(options.pendingTurn, {
        rich: false,
        answerText: options.pendingText || "Thinking…",
      })
    : "";
  const stackHtml = `${historyHtml}${pendingHtml}`;
  if (__sbHasSpotifySurface()) {
    scroll.innerHTML = __sbBuildSpotifyPanelHtml(stackHtml);
    scroll.scrollTop = 0;
  } else {
    scroll.innerHTML = `<div class="sb-card-stack">${stackHtml}</div>`;
    __sbScrollCardToLatest(scroll);
  }
}

function __sbShowThinking(scroll, promptText = "", pendingText = "Thinking…") {
  if (!scroll) return;
  __sbThinkingEl = null;
  __sbRenderCardHistory(scroll, {
    pendingTurn: { prompt: promptText },
    pendingText,
  });
}

function __sbShowBubble(text, autoHide = true, options = {}) {
  if (!__sbOwnsInlineUi()) return;
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRefreshInlineOwner();
  __sbLastBubbleRaw = String(text || "");
  const rich = Boolean(options.rich);
  const turnHtml = __sbBuildCardTurnHtml(
    { prompt: options.prompt || "", answer: String(text || "") },
    { rich, answerText: String(text || "") },
  );
  if (__sbHasSpotifySurface()) {
    scroll.innerHTML = __sbBuildSpotifyPanelHtml(turnHtml);
    scroll.scrollTop = 0;
  } else {
    scroll.innerHTML = `<div class="sb-card-stack">${turnHtml}</div>`;
    __sbScrollCardToLatest(scroll);
  }
  __sbOpenCard({ rich });
  __sbSyncSpeakButtons();
  __sbSyncSpotifyVisualState();
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (autoHide) __sbBubbleTimer = setTimeout(() => __sbCollapseCard(), 8000);
}

function __sbSetupBarSignIn() {
  const btn = document.getElementById("__sb_signin_btn_cta__");
  if (!btn) return;
  btn.onclick = () => {
    chrome.runtime.sendMessage({ action: "openAuthTab" }, () => { void chrome.runtime.lastError; });
  };

  if (!__sbContextOk()) return;
  const handleAuthArrival = (changes, area) => {
    if (area !== "local" || !changes.authToken?.newValue) return;
    chrome.storage.onChanged.removeListener(handleAuthArrival);
    const bar = document.getElementById("__sb_bar__");
    if (!bar || !bar.classList.contains("open")) return;

    // Flash "Signed in!" then close bar — user clicks brain again to invoke
    const label = document.getElementById("__sb_wakeup_label__");
    const fill = document.getElementById("__sb_wakeup_fill__");
    bar.classList.remove("sb-signin");
    bar.classList.add("sb-waking");
    if (label) label.textContent = "Signed in! ✓";
    if (fill) { fill.style.transition = "none"; fill.style.width = "0%"; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (fill) { fill.style.transition = "width 0.5s cubic-bezier(0.4,0,0.2,1)"; fill.style.width = "100%"; }
    }));
    setTimeout(() => {
      bar.classList.remove("sb-waking", "open");
      if (label) label.textContent = "Waking up…";
      chrome.storage.local.set({ sbBrainExpanded: false });
    }, 900);
  };
  chrome.storage.onChanged.addListener(handleAuthArrival);
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
  document.getElementById("__sb_signin_btn__")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openAuthTab" }, () => { void chrome.runtime.lastError; });
  });
  if (__sbContextOk()) {
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.authToken?.newValue) {
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
    hoveredContext: __sbGetHoveredContext(),
  };
}

function __sbIsExplicitWebSearchRequest(text) {
  // Explicit search commands ("web up" = common mis-hear of "look up")
  if (/\b(search (the )?web|web search|search online|look (this|that|it) up|look up|web up|google\b|search for\b)\b/i.test(text)) return true;
  // Find/read articles/papers/info on a topic — informational look-ups (no specific app).
  // These want an ANSWER, so they go through web search, never the typing automation agent.
  if (/\b(find|pull up|bring up|read|whip up|get|give)\b.{0,30}\b(article|articles|paper|papers|story|stories|post|posts|info|information|page|website|link|links|blog|blogs)\b/i.test(text)) return true;
  if (/\b(articles?|papers?|blogs?)\s+(on|about|regarding)\b/i.test(text)) return true;
  // Freshness signals — needs live data
  if (/\b(latest|current|today|right now|as of|this week|this month|this year|recent|news|price of|stock|weather|score|standings|live|just happened|breaking|update on|status of|is .{1,40} still|did .{1,30} happen|when did|who won|who is winning|what happened|trending)\b/i.test(text)) return true;
  return false;
}

function __sbIsSiteScopedBrowseSearch(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return false;

  const hasMedium = /\bmedium(?:\.com)?\b/.test(t);
  if (hasMedium && /\b(open|go to|navigate|visit|find|search|look for|pull up|bring up|read|show|articles?|posts?|blogs?)\b/.test(t)) {
    return true;
  }

  const hasExplicitDomain = /\b[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/\S*)?\b/i.test(t);
  const hasKnownSite = /\b(youtube|spotify|reddit|amazon|netflix|linkedin|twitter|x\.com|maps|google maps)\b/.test(t);
  if (!hasExplicitDomain && !hasKnownSite) return false;

  const hasBrowseVerb = /\b(open|go to|navigate|visit|find|search|look for|pull up|bring up|read|show)\b/.test(t);
  const hasScopedHint = /\b(there|over there|on there|in there|on that site|inside that site|articles?|posts?|blogs?|videos?|songs?|playlists?|results?)\b/.test(t);
  return hasBrowseVerb && hasScopedHint;
}

function __sbShouldOpenVisibleGoogleSearch(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return false;
  if (/^google\s+.+/.test(t)) return true;
  if (/\bsearch\s+.+\s+on\s+google\b/.test(t)) return true;
  if (/\b(open|show|display|pull up|bring up)\b.{0,60}\bgoogle\b/.test(t)) return true;
  if (/\bgoogle\b.{0,60}\b(search|results?|tab|page)\b/.test(t)) return true;
  if (/\b(open|show|display|pull up|bring up)\b.{0,60}\bsearch results?\b/.test(t)) return true;
  return false;
}

// Strip conversational filler from a spoken request so it becomes a clean search query.
// "I would like to read some articles on how to make good coffee. Can you please web up
//  some articles on Medium for me?" → "how to make good coffee articles medium"
function __sbExtractSearchQuery(text) {
  let q = String(text || "").toLowerCase();
  // Drop polite/command wrappers anywhere in the text.
  const fillers = [
    /\bi(?:'d| would| wanna| want to| would like to| need to| need)\b/g,
    /\bcan you(?: please)?\b/g, /\bcould you(?: please)?\b/g, /\bwould you(?: please)?\b/g,
    /\bplease\b/g, /\bfor me\b/g, /\bhelp me\b/g, /\bi'm looking for\b/g, /\blooking for\b/g,
    /\b(?:web|look|pull|bring) up\b/g, /\bsearch(?: for| the web| online)?\b/g, /\bgoogle\b/g,
    /\bfind(?: me)?\b/g, /\bget(?: me)?\b/g, /\bgive me\b/g, /\bshow me\b/g, /\bread(?: me)?\b/g,
    /\bwhip up\b/g, /\btell me about\b/g, /\bsome\b/g, /\ba few\b/g,
    /\b(?:an?|the)\b/g,
  ];
  for (const re of fillers) q = q.replace(re, " ");
  q = q.replace(/[?!.,]+/g, " ").replace(/\s+/g, " ").trim();
  // If we stripped everything, fall back to the original (minus trailing punctuation).
  if (q.length < 2) return String(text || "").replace(/[?!.]+$/g, "").trim();
  return q;
}

function __sbIsBrowserActionCommand(text) {
  return /\b(open|go to|navigate to|visit|search for|play|pause|resume|continue|next|previous|prev|skip|stop|send|click|find|buy|order|type|compose|reply to|download|post on|scroll|refresh|close tab|new tab|book|fill in|fill out|submit|press)\b/i.test(text);
}

function __sbIsVolumeCommand(text) {
  const t = String(text || "").toLowerCase();
  return /\bvolume\b/.test(t)
    || /\b(louder|quieter|softer|loud)\b/.test(t)
    || /\b(turn|crank|pump|bump)\s+(it|the\s+(music|sound|volume|song))?\s*(up|down)\b/.test(t)
    || /\b(increase|decrease|raise|lower|boost|reduce)\b.*\b(volume|sound|music|it)\b/.test(t);
}

// Parse a volume command into an absolute percent or a relative step. "increase/louder/up"
// with no number defaults to +20%; "decrease/lower/quieter/down" to -20%.
function __sbParseVolumeCommand(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(mute|silence|silent)\b/.test(t)) return { volumePercent: 0 };
  if (/\b(full|max(imum)?)\s*(volume|vol)?\b/.test(t) || /\ball\s+the\s+way\s+up\b/.test(t)) return { volumePercent: 100 };
  const exact = t.match(/(?:to|at)\s+(\d{1,3})\s*%?/) || t.match(/(\d{1,3})\s*%/) || t.match(/(\d{1,3})\s+percent/);
  if (exact) return { volumePercent: Math.min(100, Math.max(0, parseInt(exact[1], 10))) };
  const louder = /\b(louder|raise|increase|boost|higher|crank|pump|bump)\b/.test(t)
    || /\b(turn|volume|sound|music|it)\b.*\bup\b/.test(t) || /\bup\b/.test(t);
  const quieter = /\b(quieter|softer|lower|decrease|reduce|dimmer)\b/.test(t)
    || /\b(turn|volume|sound|music|it)\b.*\bdown\b/.test(t) || /\bdown\b/.test(t);
  if (quieter && !louder) return { volumeStep: -20 };
  if (louder) return { volumeStep: +20 };
  return null;
}

async function __sbHandleVolumeCommand(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const voiceTurnToken = Number.isInteger(ctx.voiceTurnToken) ? ctx.voiceTurnToken : null;
  const parsed = __sbParseVolumeCommand(promptText);
  if (!parsed) return false;
  try {
    const res = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ action: "adjustSpotifyVolume", ...parsed }, (r) => { void chrome.runtime.lastError; resolve(r || {}); })
    );
    let reply;
    if (res?.ok) {
      reply = res.muted ? "Muted." : `Volume set to ${res.volumePercent}%.`;
    } else {
      reply = res?.error || "I couldn't change the volume — make sure something's playing in Spotify.";
    }
    if (fromVoice) await __sbSpeakWithPreferredVoice(reply, voiceOutput);
    else __sbShowBubble(reply, false, { tone: "status" });
  } catch (_) {
    if (fromVoice) await __sbSpeakWithPreferredVoice("I couldn't change the volume.", voiceOutput);
  } finally {
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
  }
  return true;
}

// Detect transcription hallucinations that gpt-4o-transcribe / Whisper emit on music,
// silence, or background noise — so we don't feed garbage to the model (→ gibberish replies).
// Conservative: only filters non-speech symbols and the well-known phantom phrases, so real
// short commands ("stop", "next", "louder", "yes") still pass through.
function __sbIsJunkTranscript(text) {
  const raw = String(text || "").trim();
  if (!raw) return true;
  // No word characters at all (pure punctuation / music notes ♪ ♫ / dots).
  if (!/[a-z0-9]/i.test(raw)) return true;
  // Bracketed sound-effect captions: [music], (applause), [silence], *laughs*.
  if (/^[\[\(\*].*[\]\)\*]$/.test(raw)) return true;
  const norm = raw.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  // Classic silence/music phantom outputs.
  const phantoms = new Set([
    "you", "thank you", "thank you so much", "thanks for watching",
    "thanks for watching everyone", "please subscribe", "subscribe",
    "bye", "bye bye", "okay", "music", "applause", "silence", "the end",
  ]);
  if (phantoms.has(norm)) return true;
  return false;
}

function __sbIsCloseTabsCommand(text) {
  const t = String(text || "").toLowerCase();
  // "can you close some tabs" / "remove unused tabs" / "kill some tabs" / "too many tabs"
  if (/\btabs?\b/.test(t)) {
    if (/\b(close|shut|kill|remove|get\s+rid\s+of|clean\s*up|clear|declutter|trim|wipe|dump|fewer)\b/.test(t)) return true;
    if (/\b(too\s+many|a\s+lot\s+of|so\s+many)\b/.test(t)) return true;
    if (/\b(not\s+need(ed|ing)?|not\s+us(ing|ed)|unused|irrelevant|unnecessary|unimportant|useless)\b/.test(t)) return true;
  }
  return false;
}

function __sbIsTabsQuery(text) {
  const t = String(text || "").toLowerCase();
  if (!/\btabs?\b/.test(t)) return false;
  return /\bhow\s+many\s+tabs?\b/.test(t)
    || /\bwhat('?s| is| are)?\b.*\btabs?\b/.test(t)
    || /\b(list|show|see|read|name|tell\s+me|go\s+through|run\s+through)\b.*\btabs?\b/.test(t)
    || /\btabs?\b.*\b(out|open|list|are)\b/.test(t)
    || /\b(across|all)\b.*\btabs?\b/.test(t)
    || /\bmy\s+(other\s+)?tabs?\b/.test(t);
}

function __sbDetectIntent(text) {
  const t = text.toLowerCase();
  // Volume is a Spotify delegate action — route to agent (works in chat & realtime voice).
  if (__sbIsVolumeCommand(t)) return "agent";
  if (/\b(record|transcribe|capture audio|start listening|start recording)\b/.test(t)) return "record";
  if (__sbIsSiteScopedBrowseSearch(t)) return "agent";
  if (__sbIsExplicitWebSearchRequest(t)) return "web";
  if (__sbIsBrowserActionCommand(t) || /\b(do .{0,25} for me|automate|browse to)\b/.test(t)) return "agent";
  if (/\b(this page|this article|this post|this site|this video|summarize|summary|tldr|tl;dr|what does this|explain this|what is this|what are they|what does it say|what did they write|what's on)\b/.test(t)) return "page";
  return "chat";
}

/* === BRAINO X INTEGRATION MAP (as of this change) ===
 * On-demand read endpoints:
 *   - x-status             (Bearer JWT, POST) -> { connected, followers:{count,delta7d}, lastTweet, mentions[], totals }  (NEW)
 *   - x-auto-public-stats  (service role, ?username=) -> totals, recent_posts[] (likes/rt/replies/text), recent_replies[]  — NO followers
 *   - x-connection-status  (?userIdentifier=)         -> { connected, username, displayName }
 * Buried read helpers (cron-only, exposed via x-status) in _shared/x-auto-sessions.ts:
 *   - getAuthorizedXContext(supabase,userId) -> {accessToken,xUserId,username,displayName}; throws "No X account linked" if disconnected
 *   - fetchAccountSnapshot(token,xUserId)    -> { followersCount, repliesReceived, totalViews }   (LIVE)
 *   - fetchMentionsSince(token,xUserId,since,n) -> { mentions[], usersById, newestMentionId }      (LIVE)
 * Write/automation: x-assistant (post/schedule/queue), x-auto-generate, x-auto-engage, dispatch-scheduled-x-posts.
 * Delta baseline: x_follower_snapshots table (upserted daily by x-status); delta omitted until a 7-day baseline exists.
 */

function __sbIsXStatusRequest(text) {
  const t = String(text || "").toLowerCase();
  // Always-X signals (no "twitter"/"x" word needed)
  if (/\bhow many followers?\b/.test(t) || /\bfollower count\b/.test(t)) return true;
  if (/\bdid anyone mention me\b/.test(t)) return true;
  if (/\b(tweet|post) performance\b/.test(t)) return true;
  if (/\bhow\b.*\blast (tweet|post)\b/.test(t)) return true; // "how did my last tweet do"
  if (/\b(any|got any|new|check (my|for))\b.*\bmentions?\b/.test(t)) return true;
  // Does it reference the user's X / Twitter account?
  const aboutX = /\btwitter\b/.test(t)
    || /\bmy x\b/.test(t)
    || /\bon x\b/.test(t)
    || /\bx (account|profile|stats?|statistics|status|summary|numbers?)\b/.test(t)
    || /\b(twitter|x) (stats?|statistics|status|summary|numbers?)\b/.test(t);
  if (!aboutX) return false;
  // X reference + a status/stat-ish word (loose phrasing: "how is my twitter looking", "twitter doing")
  return /\b(how|hows|doing|look|looking|going|perform|performance|stat|stats|statistics|status|summary|update|check|number|numbers|grow|growing|growth|engagement|mention|mentions|followers?)\b/.test(t);
}

function __sbIsXLastTweetRequest(text) {
  const t = String(text || "").toLowerCase();
  return /\bwhat\s+(did|was|does)\b.*\blast\s+(tweet|post)\b/.test(t)
    || /\bread\s+(me\s+)?my\s+last\s+(tweet|post)\b/.test(t)
    || /\bmy\s+last\s+(tweet|post)\b.*\b(say|said|about|content|text)\b/.test(t);
}

function __sbXFirst12Words(text) {
  const words = String(text || "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length <= 12) return words.join(" ");
  return words.slice(0, 12).join(" ") + "…";
}

let __sbXSkillState = { phase: "idle" };

function __sbResetXSkillState() {
  __sbXSkillState = { phase: "idle" };
}

function __sbSetXSkillState(next = {}) {
  __sbXSkillState = {
    phase: "idle",
    ...next,
    updatedAt: Date.now(),
  };
}

function __sbIsXSkillAwaitingInput() {
  return ["awaiting_create_confirm", "awaiting_post_brief", "draft_ready", "awaiting_schedule"].includes(__sbXSkillState?.phase);
}

function __sbGetXFollowerDelta(data) {
  const raw = data?.followers?.delta7d;
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function __sbBuildXPostOffer(data) {
  const delta = __sbGetXFollowerDelta(data);
  if (delta > 0) {
    return `You seem to have gained ${delta} follower${delta === 1 ? "" : "s"} in the last 7 days. Would you like me to create a post for you, sir?`;
  }
  if (delta < 0) {
    const lost = Math.abs(delta);
    return `You seem to have lost ${lost} follower${lost === 1 ? "" : "s"} in the last 7 days. Would you like me to create a post for you, sir?`;
  }
  return "Would you like me to create a post for you, sir?";
}

function __sbIsXSkillYes(text) {
  const t = String(text || "").trim().toLowerCase();
  return /^(yes|yeah|yep|ya|sure|ok|okay|do it|go ahead|please do|make it|create it|write it|yes sir)\b/.test(t);
}

function __sbIsXSkillNo(text) {
  const t = String(text || "").trim().toLowerCase();
  return /^(no|nope|nah|not now|later|leave it|cancel|stop|don't|do not)\b/.test(t);
}

function __sbIsXDraftPostNowCommand(text) {
  const t = String(text || "").toLowerCase();
  return /\b(post|publish|send)\b.*\b(now|it|this|x|twitter)\b/.test(t)
    || /\b(post|publish|send)\s+it\b/.test(t);
}

function __sbIsXDraftScheduleCommand(text) {
  return /\b(schedule|queue|post later|later)\b/i.test(String(text || ""));
}

function __sbIsXDraftEditCommand(text) {
  return /\b(edit|change|modify|rewrite|revise|make it)\b/i.test(String(text || ""));
}

function __sbIsStartXAutomationCommand(text) {
  const t = String(text || "").toLowerCase();
  return /\b(start|run|launch|begin|turn on)\b.*\b(x|twitter)\b.*\b(auto|automation)\b/.test(t)
    || /\b(start|run|launch|begin|turn on)\b.*\bx auto\b/.test(t)
    || /\bx auto\b.*\b(start|run|launch|begin|turn on)\b/.test(t);
}

function __sbXLocalDateTimeValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function __sbGetXBrowserContext() {
  return {
    browserTime: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };
}

async function __sbDraftXPostFromBrief(brief) {
  return await __sbRuntimeMessage({
    action: "draftXPostFromBrief",
    brief: String(brief || "").trim(),
    ...__sbGetXBrowserContext(),
  });
}

async function __sbPostXDraftNow(content) {
  return await __sbRuntimeMessage({
    action: "postXDraftNow",
    content: String(content || "").trim(),
    ...__sbGetXBrowserContext(),
  });
}

async function __sbScheduleXDraft(content, scheduledAt) {
  return await __sbRuntimeMessage({
    action: "scheduleXDraft",
    content: String(content || "").trim(),
    scheduledAt: String(scheduledAt || "").trim(),
    ...__sbGetXBrowserContext(),
  });
}

function __sbBuildXDraftReviewHtml() {
  const draft = String(__sbXSkillState?.draftText || "").trim();
  const count = draft.length;
  const defaultSchedule = __sbXLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  const scheduleVisible = __sbXSkillState?.phase === "awaiting_schedule";
  const status = String(__sbXSkillState?.statusText || "").trim();
  const statusTone = String(__sbXSkillState?.statusTone || "").trim();
  return `
    <div class="sb-x-draft-card">
      <div class="sb-x-draft-kicker">X draft ready</div>
      <h2>Should I post it for you, sir?</h2>
      <p>I wrote this in your saved X voice. You can edit it here before anything gets posted.</p>
      <textarea class="sb-x-draft-editor" data-sb-x-draft-text spellcheck="true">${__sbEscapeHtml(draft)}</textarea>
      <div class="sb-x-draft-meta">
        <span>Nothing posts until you approve it.</span>
        <strong class="sb-x-draft-count${count > 280 ? " over" : ""}" data-sb-x-draft-count>${count}/280</strong>
      </div>
      <div class="sb-x-draft-actions">
        <button class="sb-x-draft-btn" type="button" data-sb-x-action="edit">Edit post</button>
        <button class="sb-x-draft-btn primary" type="button" data-sb-x-action="post-now">Post now</button>
        <button class="sb-x-draft-btn accent" type="button" data-sb-x-action="schedule">Schedule</button>
      </div>
      <div class="sb-x-schedule-panel${scheduleVisible ? " visible" : ""}" data-sb-x-schedule-panel>
        <div class="sb-x-schedule-row">
          <input class="sb-x-schedule-input" data-sb-x-schedule-input type="datetime-local" value="${__sbEscapeHtml(defaultSchedule)}">
          <button class="sb-x-draft-btn accent" type="button" data-sb-x-action="confirm-schedule">Confirm schedule</button>
        </div>
        <p>Pick the exact local date and time for Braino to queue this on X.</p>
      </div>
      <div class="sb-x-draft-status ${__sbEscapeHtml(statusTone)}" data-sb-x-draft-status>${__sbEscapeHtml(status)}</div>
    </div>
  `;
}

function __sbRenderXDraftReviewCard(options = {}) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const historyHtml = __sbCardTurns.map((turn) => __sbBuildCardTurnHtml(turn, { rich: true })).join("");
  scroll.innerHTML = `<div class="sb-card-stack">${historyHtml}${__sbBuildXDraftReviewHtml()}</div>`;
  __sbOpenCard({ rich: true });
  __sbBindXDraftReviewCard(options);
  __sbScrollCardToLatest(scroll);
  __sbSyncSpeakButtons();
}

function __sbSetXDraftStatus(text, tone = "") {
  __sbXSkillState.statusText = String(text || "");
  __sbXSkillState.statusTone = tone;
  const el = document.querySelector("[data-sb-x-draft-status]");
  if (!el) return;
  el.textContent = __sbXSkillState.statusText;
  el.classList.toggle("error", tone === "error");
  el.classList.toggle("success", tone === "success");
}

function __sbSetXDraftBusy(isBusy) {
  document.querySelectorAll("[data-sb-x-action]").forEach((btn) => {
    btn.disabled = !!isBusy;
  });
}

function __sbGetCurrentXDraftText() {
  const editor = document.querySelector("[data-sb-x-draft-text]");
  return String(editor?.value || __sbXSkillState?.draftText || "").trim();
}

function __sbValidateXDraftText(text) {
  const content = String(text || "").trim();
  if (!content) return "Write something first, then I can post it.";
  if (content.length > 280) return `This is ${content.length} characters. X posts need to stay at 280 or less.`;
  return "";
}

async function __sbMaybeSpeakXDraftResult(text) {
  const shouldSpeak = __sbHeadphoneMode || __sbXSkillState?.source === "voice";
  if (!shouldSpeak) return;
  const voiceOutput = __sbXSkillState?.voiceOutput === "realtime" ? "realtime" : "legacy";
  await __sbSpeakWithPreferredVoice(__sbStripMarkdownForSpeech(text), voiceOutput, { verbatim: true });
}

async function __sbHandleXDraftPostNowClick() {
  const content = __sbGetCurrentXDraftText();
  const error = __sbValidateXDraftText(content);
  if (error) { __sbSetXDraftStatus(error, "error"); return; }

  __sbSetXDraftBusy(true);
  __sbSetXDraftStatus("Posting to X...");
  const data = await __sbPostXDraftNow(content);
  __sbSetXDraftBusy(false);

  if (!data || data.error) {
    const msg = data?.error || "I could not post that to X just now.";
    __sbSetXDraftStatus(msg, "error");
    await __sbMaybeSpeakXDraftResult(msg);
    return;
  }

  const reply = data.reply || "Posted to X.";
  __sbXSkillState.draftText = content;
  __sbChatHistory.push({ role: "assistant", content: reply });
  __sbSetXDraftStatus(reply, "success");
  await __sbMaybeSpeakXDraftResult(reply);
  __sbResetXSkillState();
}

async function __sbHandleXDraftScheduleClick() {
  const content = __sbGetCurrentXDraftText();
  const error = __sbValidateXDraftText(content);
  if (error) { __sbSetXDraftStatus(error, "error"); return; }

  const input = document.querySelector("[data-sb-x-schedule-input]");
  const localValue = String(input?.value || "").trim();
  const scheduledDate = localValue ? new Date(localValue) : null;
  if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    __sbSetXDraftStatus("Pick a future date and time first.", "error");
    return;
  }

  __sbSetXDraftBusy(true);
  __sbSetXDraftStatus("Scheduling on X...");
  const data = await __sbScheduleXDraft(content, scheduledDate.toISOString());
  __sbSetXDraftBusy(false);

  if (!data || data.error) {
    const msg = data?.error || "I could not schedule that X post just now.";
    __sbSetXDraftStatus(msg, "error");
    await __sbMaybeSpeakXDraftResult(msg);
    return;
  }

  const reply = data.reply || "Queued for X.";
  __sbXSkillState.draftText = content;
  __sbChatHistory.push({ role: "assistant", content: reply });
  __sbSetXDraftStatus(reply, "success");
  await __sbMaybeSpeakXDraftResult(reply);
  __sbResetXSkillState();
}

function __sbBindXDraftReviewCard(options = {}) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const editor = scroll.querySelector("[data-sb-x-draft-text]");
  const countEl = scroll.querySelector("[data-sb-x-draft-count]");
  const updateCount = () => {
    const count = String(editor?.value || "").length;
    if (countEl) {
      countEl.textContent = `${count}/280`;
      countEl.classList.toggle("over", count > 280);
    }
    __sbXSkillState.draftText = String(editor?.value || "");
  };
  editor?.addEventListener("input", updateCount);
  updateCount();

  scroll.querySelectorAll("[data-sb-x-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-sb-x-action");
      if (action === "edit") {
        editor?.focus();
        __sbSetXDraftStatus("Editing is live. Change the text, then choose Post now or Schedule.");
        return;
      }
      if (action === "schedule") {
        __sbXSkillState.phase = "awaiting_schedule";
        __sbXSkillState.scheduleVisible = true;
        __sbRenderXDraftReviewCard();
        return;
      }
      if (action === "post-now") {
        void __sbHandleXDraftPostNowClick();
        return;
      }
      if (action === "confirm-schedule") {
        void __sbHandleXDraftScheduleClick();
      }
    });
  });

  if (options.focusEditor) editor?.focus();
}

async function __sbReplyToXSkill(promptText, reply, ctx = {}, options = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const showUi = !fromVoice || !__sbVoiceOnlyMode || options.forceUi;
  if (promptText) __sbChatHistory.push({ role: "user", content: promptText });
  if (reply) __sbChatHistory.push({ role: "assistant", content: reply });
  if (showUi && reply) __sbShowBubble(reply, false, { rich: true, kicker: "Braino" });
  if (fromVoice && reply) await __sbSpeakWithPreferredVoice(reply, voiceOutput, { verbatim: true });
  __sbCompleteVoiceTurn(ctx);
}

async function __sbHandleXSkillFollowup(promptText, ctx = {}) {
  if (!__sbIsXSkillAwaitingInput()) return false;
  const phase = __sbXSkillState.phase;

  if (phase === "awaiting_create_confirm") {
    if (__sbIsXSkillYes(promptText)) {
      __sbSetXSkillState({
        ...__sbXSkillState,
        phase: "awaiting_post_brief",
        source: ctx.fromVoice ? "voice" : "text",
        voiceOutput: ctx.voiceOutput === "realtime" ? "realtime" : "legacy",
      });
      await __sbReplyToXSkill(promptText, "What would you like to post about, sir? Just speak your mind, I'll write something for you.", ctx);
      return true;
    }

    if (__sbIsXSkillNo(promptText)) {
      __sbResetXSkillState();
      await __sbReplyToXSkill(promptText, "Sure sir, let me know when you want anything for X.", ctx);
      return true;
    }

    await __sbReplyToXSkill(promptText, "Just say yes if you want me to create a post, or no if not.", ctx);
    return true;
  }

  if (phase === "awaiting_post_brief") {
    const brief = String(promptText || "").trim();
    if (!brief) {
      await __sbReplyToXSkill(promptText, "Tell me the idea in a sentence or two, sir, and I'll turn it into an X post.", ctx);
      return true;
    }

    __sbSetXSkillState({
      ...__sbXSkillState,
      phase: "drafting_post",
      brief,
      source: ctx.fromVoice ? "voice" : (__sbXSkillState.source || "text"),
      voiceOutput: ctx.voiceOutput === "realtime" ? "realtime" : (__sbXSkillState.voiceOutput || "legacy"),
    });

    const fromVoice = Boolean(ctx.fromVoice);
    const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
    const showUi = !fromVoice || !__sbVoiceOnlyMode;
    __sbChatHistory.push({ role: "user", content: brief });
    if (showUi) __sbShowBubble("Writing that in your X voice now...", false, { rich: true, kicker: "Braino" });
    if (fromVoice) await __sbSpeakWithPreferredVoice("Writing that in your X voice now, sir.", voiceOutput, { verbatim: true });

    const data = await __sbDraftXPostFromBrief(brief);
    if (!data || data.error || !data.draftText) {
      const msg = data?.error || "I could not draft that X post just now.";
      __sbResetXSkillState();
      await __sbReplyToXSkill("", msg, ctx, { forceUi: showUi });
      return true;
    }

    const draftText = String(data.draftText || "").trim();
    const assistantPrompt = "I've written a draft for you. Take a look - should I post it for you, sir?";
    __sbSetXSkillState({
      ...__sbXSkillState,
      phase: "draft_ready",
      draftText,
      statusText: "",
      statusTone: "",
    });
    __sbChatHistory.push({ role: "assistant", content: `${assistantPrompt}\n\n${draftText}` });
    __sbCardTurns.push({ prompt: brief, answer: assistantPrompt });
    __sbRenderXDraftReviewCard();
    if (fromVoice) await __sbSpeakWithPreferredVoice(assistantPrompt, voiceOutput, { verbatim: true });
    __sbCompleteVoiceTurn(ctx);
    return true;
  }

  if (phase === "draft_ready" || phase === "awaiting_schedule") {
    const fromVoice = Boolean(ctx.fromVoice);
    const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
    if (__sbIsXDraftPostNowCommand(promptText)) {
      __sbChatHistory.push({ role: "user", content: promptText });
      __sbSetXDraftStatus("Posting it now...");
      if (fromVoice) await __sbSpeakWithPreferredVoice("Posting it now, sir.", voiceOutput, { verbatim: true });
      __sbCompleteVoiceTurn(ctx);
      await __sbHandleXDraftPostNowClick();
      return true;
    }
    if (__sbIsXDraftScheduleCommand(promptText)) {
      __sbXSkillState.phase = "awaiting_schedule";
      __sbXSkillState.scheduleVisible = true;
      __sbRenderXDraftReviewCard();
      __sbChatHistory.push({ role: "user", content: promptText });
      __sbSetXDraftStatus("Choose the date and time in the card, and I'll schedule it.");
      if (fromVoice) await __sbSpeakWithPreferredVoice("Choose the date and time in the card, and I'll schedule it.", voiceOutput, { verbatim: true });
      __sbCompleteVoiceTurn(ctx);
      return true;
    }
    if (__sbIsXDraftEditCommand(promptText)) {
      __sbRenderXDraftReviewCard({ focusEditor: true });
      __sbChatHistory.push({ role: "user", content: promptText });
      __sbSetXDraftStatus("You can edit the draft in the card. I focused it for you.");
      if (fromVoice) await __sbSpeakWithPreferredVoice("You can edit the draft in the card. I focused it for you.", voiceOutput, { verbatim: true });
      __sbCompleteVoiceTurn(ctx);
      return true;
    }
  }

  return false;
}

async function __sbHandleStartXAutomationCommand(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const showUi = !fromVoice || !__sbVoiceOnlyMode;
  const opening = __sbIsOnX()
    ? "Starting X Auto, sir."
    : "Opening X and starting X Auto, sir.";
  __sbChatHistory.push({ role: "user", content: promptText });
  if (showUi) __sbShowBubble(opening, false, { rich: true, kicker: "Braino" });
  if (fromVoice) await __sbSpeakWithPreferredVoice(opening, voiceOutput, { verbatim: true });

  let result = null;
  if (__sbIsOnX()) {
    if (__sbXRunning) {
      result = { ok: true, alreadyRunning: true };
    } else {
      void __sbRunXAutomation({ startOnly: true });
      result = { ok: true };
    }
  } else {
    result = await __sbRuntimeMessage({ action: "startXAutomationOnX" });
  }

  const finalReply = result?.ok
    ? (result.alreadyRunning ? "X Auto is already running." : "X Auto has started.")
    : (result?.error || "I opened X, but could not start X Auto yet.");
  __sbChatHistory.push({ role: "assistant", content: finalReply });
  if (showUi) __sbShowBubble(finalReply, false, { rich: true, kicker: "Braino" });
  if (fromVoice) await __sbSpeakWithPreferredVoice(finalReply, voiceOutput, { verbatim: true });
  __sbCompleteVoiceTurn(ctx);
}

// Build the spoken/displayed summary. Specific asks get a single sentence; a general
// "stats" ask gets the 3-sentence combo. Sentences are omitted when data is missing.
function __sbFormatXStatus(promptText, data) {
  const t = String(promptText || "").toLowerCase();
  const wantsFollowers = /\bfollowers?\b/.test(t);
  const wantsMentions = /\bmention/.test(t);
  const wantsLastTweet = /\blast\s+(tweet|post)\b/.test(t) || /\b(tweet|post)\s+performance\b/.test(t);
  const general = !(wantsFollowers || wantsMentions || wantsLastTweet);

  const followerSentence = () => {
    const raw = data?.followers?.count;
    if (raw == null) return "You're connected to X, but I couldn't pull your live follower count just now — try again in a moment.";
    const count = Number(raw).toLocaleString();
    const delta = data?.followers?.delta7d;
    let s = `You have ${count} followers on X.`;
    if (delta != null && delta !== 0) {
      const sign = delta > 0 ? "+" : "";
      s += ` You ${delta > 0 ? "gained" : "lost"} ${sign}${delta} in the last 7 days.`;
    }
    return s;
  };

  const mentionSentence = () => {
    const mentions = Array.isArray(data?.mentions) ? data.mentions : [];
    if (!mentions.length) return "You have no new mentions right now.";
    const top = mentions[0];
    return `You have ${mentions.length} new mention${mentions.length === 1 ? "" : "s"}. `
      + `The most recent is from @${top.handle}: '${__sbXFirst12Words(top.text)}'.`;
  };

  const lastTweetSentence = () => {
    const lt = data?.lastTweet;
    if (!lt) return "";
    return `Your last tweet got ${lt.likes} likes, ${lt.retweets} retweets, and ${lt.replies} replies.`;
  };

  if (general) {
    return [followerSentence(), mentionSentence(), lastTweetSentence()].filter(Boolean).join(" ");
  }
  if (wantsFollowers) return followerSentence();
  if (wantsMentions) return mentionSentence();
  if (wantsLastTweet) return lastTweetSentence() || "You haven't posted anything through Braino yet.";
  return followerSentence();
}

let __sbXLastStatus = null;

async function __sbHandleXStatus(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  // Voice mode (voice-only) speaks with no UI; chat mode renders the reply and never speaks.
  const showUi = !fromVoice || !__sbVoiceOnlyMode;
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (showUi) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    if (brainBtn) brainBtn.classList.add("recording");
  }

  try {
    const data = await __sbRuntimeMessage({ action: "getXStatus" });

    if (!data || data.error) {
      const msg = "I couldn't reach X right now — try again in a moment.";
      if (showUi) __sbShowBubble(msg, false, { rich: true, kicker: "Braino" });
      if (fromVoice) await __sbSpeakWithPreferredVoice(msg, voiceOutput);
      return;
    }

    if (data.connected === false) {
      const spoken = "Your X account isn't connected. Want me to open settings?";
      const rich = `${spoken}\n\n[Open Braino settings](https://trybraino.com/dashboard)`;
      __sbChatHistory.push({ role: "user", content: promptText });
      __sbChatHistory.push({ role: "assistant", content: rich });
      if (showUi) __sbShowBubble(rich, false, { rich: true, kicker: "Braino" });
      if (fromVoice) await __sbSpeakWithPreferredVoice(spoken, voiceOutput);
      return;
    }

    __sbXLastStatus = data;
    const formatted = __sbFormatXStatus(promptText, data);
    const offer = __sbBuildXPostOffer(data);
    const combinedReply = `${formatted}\n\n${offer}`;
    __sbSetXSkillState({
      phase: "awaiting_create_confirm",
      lastStatus: data,
      followerDelta: __sbGetXFollowerDelta(data),
      source: fromVoice ? "voice" : "text",
      voiceOutput,
    });
    __sbChatHistory.push({ role: "user", content: promptText });
    __sbChatHistory.push({ role: "assistant", content: combinedReply });
    if (showUi) __sbShowBubble(combinedReply, false, { rich: true, kicker: "Braino" });
    if (fromVoice) await __sbSpeakWithPreferredVoice(combinedReply, voiceOutput, { verbatim: true });
  } finally {
    if (brainBtn) brainBtn.classList.remove("recording");
    __sbCompleteVoiceTurn(ctx);
  }
}

async function __sbHandleXLastTweet(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const showUi = !fromVoice || !__sbVoiceOnlyMode;
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (showUi) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    if (brainBtn) brainBtn.classList.add("recording");
  }

  try {
    let data = __sbXLastStatus;
    if (!data?.lastTweet) data = await __sbRuntimeMessage({ action: "getXStatus" }) || data;
    if (data) __sbXLastStatus = data;

    if (data && data.connected === false) {
      const spoken = "Your X account isn't connected. Want me to open settings?";
      const rich = `${spoken}\n\n[Open Braino settings](https://trybraino.com/dashboard)`;
      if (showUi) __sbShowBubble(rich, false, { rich: true, kicker: "Braino" });
      if (fromVoice) await __sbSpeakWithPreferredVoice(spoken, voiceOutput);
      return;
    }

    const lt = data?.lastTweet;
    const formatted = lt?.text
      ? `Your last tweet said: '${lt.text}'`
      : "You haven't posted anything through Braino yet.";
    console.log('[BRAINO-X-DEMO]', formatted); // TODO: remove before production release
    __sbChatHistory.push({ role: "user", content: promptText });
    __sbChatHistory.push({ role: "assistant", content: formatted });
    if (showUi) __sbShowBubble(formatted, false, { rich: true, kicker: "Braino" });
    if (fromVoice) await __sbSpeakWithPreferredVoice(formatted, voiceOutput, { verbatim: true });
  } finally {
    if (brainBtn) brainBtn.classList.remove("recording");
    __sbCompleteVoiceTurn(ctx);
  }
}

async function __sbHandleTabsQuery(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const showUi = !fromVoice || !__sbVoiceOnlyMode;
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (showUi) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    if (brainBtn) brainBtn.classList.add("recording");
  }
  try {
    const data = await __sbRuntimeMessage({ action: "getTabsOverview" });
    let formatted;
    if (!data || data.error) {
      formatted = "I couldn't read your tabs just now — try again in a moment.";
    } else {
      const count = Number(data.count || 0);
      const windowCount = Number(data.windowCount || 1);
      const windowSuffix = windowCount > 1 ? ` across ${windowCount} windows` : "";
      const wantsList = /\b(list|show|see|read|name|tell\s+me|go\s+through|run\s+through|what\s+tabs?|which\s+tabs?)\b/.test(promptText.toLowerCase());
      if (count <= 1 && !wantsList) {
        formatted = "You only have this tab open right now.";
      } else if (!wantsList) {
        formatted = `You have ${count} tab${count === 1 ? "" : "s"} open${windowSuffix}.`;
      } else {
        const titles = (data.tabs || [])
          .map((t) => t.title)
          .filter(Boolean)
          .slice(0, 8);
        formatted = titles.length
          ? `You have ${count} tab${count === 1 ? "" : "s"} open${windowSuffix}: ${titles.join("; ")}.`
          : `You have ${count} tab${count === 1 ? "" : "s"} open${windowSuffix}.`;
      }
    }
    __sbChatHistory.push({ role: "user", content: promptText });
    __sbChatHistory.push({ role: "assistant", content: formatted });
    if (showUi) __sbShowBubble(formatted, false, { rich: true, kicker: "Braino" });
    if (fromVoice) await __sbSpeakWithPreferredVoice(formatted, voiceOutput, { verbatim: true });
  } finally {
    if (brainBtn) brainBtn.classList.remove("recording");
    __sbCompleteVoiceTurn(ctx);
  }
}

async function __sbHandleCloseTabs(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const showUi = !fromVoice || !__sbVoiceOnlyMode;
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (showUi) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    if (brainBtn) brainBtn.classList.add("recording");
  }
  try {
    // Immediate verbal ack, then close.
    if (fromVoice) await __sbSpeakWithPreferredVoice("Closing, sir.", voiceOutput);
    const data = await __sbRuntimeMessage({ action: "closeIrrelevantTabs", instruction: promptText });
    let formatted;
    if (!data || data.error) {
      formatted = "I couldn't close any tabs just now — try again in a moment.";
    } else if (!data.closedCount) {
      formatted = "Nothing to close — everything looks in use.";
    } else {
      const names = (data.closed || []).slice(0, 5).join("; ");
      formatted = `Closed ${data.closedCount} tab${data.closedCount === 1 ? "" : "s"}${names ? `: ${names}` : ""}. Kept your active, pinned, and playing tabs.`;
    }
    __sbChatHistory.push({ role: "user", content: promptText });
    __sbChatHistory.push({ role: "assistant", content: formatted });
    if (showUi) __sbShowBubble(formatted, false, { rich: true, kicker: "Braino" });
    if (fromVoice) await __sbSpeakWithPreferredVoice(formatted, voiceOutput, { verbatim: true });
  } finally {
    if (brainBtn) brainBtn.classList.remove("recording");
    __sbCompleteVoiceTurn(ctx);
  }
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

async function __sbPerformWebSearch(query, options = {}) {
  if (!__sbContextOk()) throw new Error("Reload page to reconnect Braino.");

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "performWebSearch",
      query,
      purpose: options.purpose || "answer",
      aiProvider: options.aiProvider,
      chatHistory: options.chatHistory,
      instructions: options.instructions,
    }, (res) => {
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

let __sbXPersonaCache = null;
let __sbXPersonaCacheExpiry = 0;

async function __sbLoadXPersona() {
  if (__sbXPersonaCache !== null && Date.now() < __sbXPersonaCacheExpiry) return __sbXPersonaCache;
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'loadXPersona' }, res => {
      void chrome.runtime.lastError;
      __sbXPersonaCache = res?.persona || null;
      __sbXPersonaCacheExpiry = Date.now() + 5 * 60 * 1000;
      resolve(__sbXPersonaCache);
    });
  });
}

function __sbBuildXAutoContext(persona) {
  const lines = ['=== BRAINO X AUTO CONFIGURATION ==='];
  lines.push('You are Braino, the AI browser companion. You are currently on X/Twitter with this user.');
  lines.push('When the user asks what you know about them, how you reply to posts on X, or what rules you follow — answer fully and specifically based on this configuration.');
  lines.push('');
  lines.push('USER IDENTITY:');
  if (persona?.display_name) lines.push('Name: ' + persona.display_name);
  if (persona?.bio) lines.push('Background: ' + persona.bio);
  if (persona?.what_building) lines.push('Currently building: ' + persona.what_building);
  if (persona?.tone_notes) lines.push('Writing style: ' + persona.tone_notes);
  if (!persona?.display_name && !persona?.bio && !persona?.what_building && !persona?.tone_notes) {
    lines.push('(Persona not configured yet — user should go to Dashboard → X Automation → Your Voice & Style)');
  }
  lines.push('');
  lines.push('X AUTO REPLY RULES (what Braino follows when replying to posts):');
  lines.push('• Max 180 characters per reply');
  lines.push('• Reply to ONE specific detail or phrase — never generic praise or paraphrasing');
  lines.push('• Sound human: conversational, concrete, fragments OK');
  lines.push("• Match the tweet's energy — sharp, thoughtful, or playful as needed");
  lines.push("• No canned openers: 'great point', 'love this', 'totally agree', 'thanks for sharing'");
  lines.push("• No AI phrases: 'this highlights', 'this underscores', 'important conversation', 'valuable insight'");
  lines.push('• At most one emoji, only if it feels native to the tweet');
  lines.push('• For builder prompts (e.g. "what are you building"): can mention Braino and trybraino.com once, naturally');
  lines.push('• For regular tweets: no self-promotion unless directly relevant');
  lines.push('• Skips: ads, promoted posts, and political tweets (elections, Modi, party politics)');
  lines.push('• Internally drafts 3 candidates and picks the most specific, least generic one');
  lines.push('=====================================');
  return lines.join('\n');
}

function __sbTrimPromptContext(value, maxChars) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (!Number.isFinite(maxChars) || maxChars <= 0 || normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}… [truncated]`;
}

async function __sbAuthedApiFetch(path, init = {}, options = {}) {
  const { authToken } = await __sbStorageGet(["authToken"]);
  if (!authToken && !options.allowAnonymous) {
    if (!options.suppressSignIn) __sbShowSignIn();
    return null;
  }

  const headers = {
    apikey: __SB_ANON_KEY,
    ...(init.headers || {}),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (options.jsonBody !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${__SB_API}/${String(path || "").replace(/^\/+/, "")}`, {
    ...init,
    headers,
    body: options.jsonBody !== undefined ? JSON.stringify(options.jsonBody) : init.body,
  });

  if ((response.status === 401 || response.status === 403) && !options.suppressSignIn) {
    __sbShowSignIn();
  }

  return response;
}

async function __sbFetchAssistantReply(body) {
  const resp = await __sbAuthedApiFetch("chat-about-notes", {
    method: "POST",
  }, {
    allowAnonymous: true,
    jsonBody: body,
  });
  if (!resp) return { reply: null };

  if (resp.status === 401 || resp.status === 403) {
    return { reply: null };
  }

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed: ${resp.status}`);
  }

  const json = await resp.json();
  return { reply: json.reply || json.response || json.message || json.answer || "" };
}

async function __sbResolvePremiumStatus(forceRefresh = false) {
  const cached = await __sbStorageGet(["authEmail", "isPremium"]);
  const normalizedEmail = typeof cached.authEmail === "string" ? cached.authEmail.trim().toLowerCase() : "";
  if (normalizedEmail === "itishpande21@gmail.com") {
    if (__sbContextOk()) {
      chrome.storage.local.set({ isPremium: true, isPremiumCachedAt: Date.now() });
    }
    return true;
  }

  if (!forceRefresh && cached.isPremium === true) return true;

  const result = await __sbRuntimeMessage({
    action: "resolvePremiumStatus",
    forceRefresh,
  });
  return result?.isPremium === true || cached.isPremium === true;
}

function __sbResolvePromptRouting(text) {
  const connectorDirective = __sbParseConnectorDirective(text);
  if (connectorDirective.connector) {
    window.__sbForcedConnector = connectorDirective.connector;
    __sbRefreshConnectorButtons();
  }

  const promptText = String(connectorDirective.task || "").trim();
  const siteContext = __sbGetSiteAdapterContext();
  const detectedConnector = __sbGetEffectiveConnector(siteContext);
  const connectorHint = detectedConnector === "auto" ? __sbInferConnectorFromPrompt(promptText) : detectedConnector;
  const forcedMode = window.__sbForcedMode || "page";
  const rawIntent = (forcedMode !== "page")
    ? forcedMode
    : (__sbShouldConnectorForceAgent(connectorHint, promptText, forcedMode, siteContext) ? "agent" : __sbDetectIntent(promptText));
  const intent = (rawIntent === "lecture" || rawIntent === "meeting") ? "record" : rawIntent;

  return {
    connectorDirective,
    promptText,
    siteContext,
    detectedConnector,
    connectorHint,
    forcedMode,
    rawIntent,
    intent,
  };
}

async function __sbShouldForceVoiceDelegate(routing) {
  const promptText = String(routing?.promptText || "").trim();
  if (!promptText) return false;

  const result = await __sbRuntimeMessage({
    action: "classifyBrainAgentTask",
    task: promptText,
    connector: routing?.connectorHint || "auto",
  });

  return result?.shouldDelegate === true;
}

async function __sbProcessPrompt(text, options = {}) {
  const routing = __sbResolvePromptRouting(text);
  const promptText = String(routing.promptText || "").trim();
  if (!promptText) return;

  const fromVoice = Boolean(options.fromVoice);
  const voiceOutput = options.voiceOutput === "realtime" ? "realtime" : "legacy";
  const voiceTurnToken = Number.isInteger(options.voiceTurnToken) ? options.voiceTurnToken : null;
  const speakVoiceReply = async (replyText) => {
    if (!fromVoice) return false;
    return await __sbSpeakWithPreferredVoice(replyText, voiceOutput);
  };

  __sbStopSpeech();
  if (!fromVoice && __sbIsRecording) __sbStopRecording({ silent: true });

  const connectorHint = routing.connectorHint;
  const forcedMode = routing.forcedMode;
  const forceIntent = ["agent", "web", "record", "page", "chat"].includes(options.forceIntent)
    ? options.forceIntent
    : null;
  const intent = forceIntent || routing.intent;
  if (fromVoice && voiceOutput === "realtime") {
    __sbPatchRealtimeCostTurn({
      routeIntent: intent,
      routeMode: forcedMode,
      connector: connectorHint,
    });
  }

  if (await __sbHandleXSkillFollowup(promptText, { fromVoice, voiceOutput, voiceTurnToken })) {
    if (fromVoice && voiceOutput === "realtime") __sbPatchRealtimeCostTurn({ routeIntent: "x_skill" });
    return;
  }

  // "What's new / what's in you?" — Braino reads the changelog in first person, then flips the question back
  if (/what'?s?\s+new\s+(with\s+you|going\s+on|up\s+with\s+you)|what\s+have\s+you\s+been\s+up\s+to|what('?s|\s+is)\s+new\s+with\s+braino|anything\s+new\s+with\s+you|what'?s?\s+in\s+you|what\s+(can|do)\s+you\s+(do|have)|what\s+are\s+you\s+capable|what\s+are\s+your\s+(features?|abilities|capabilities)|tell\s+me\s+(about\s+yourself|what\s+you\s+can\s+do)/i.test(promptText)) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    __sbChatHistory.push({ role: "user", content: promptText });
    const reply = "Quite a bit, actually — here's what's new:\n\n**Fly mode** — Press Cmd+S and I'll follow your cursor around the screen like a little satellite. Press it again and I dock back to the corner.\n\n**Voice mode sees the page** — I can now read whatever you're looking at the moment you activate live voice. Ask me to summarise an article, explain something on screen, or answer a question about the page — I've got it.\n\n**Spotify control** — Tell me to play a song and I'll open Spotify in a new tab and start it. You can also say \"lower the volume\" or \"raise the volume\" and I'll handle that too.\n\n**Voice web research** — When you ask me something that needs the web, I'll research in the background and speak the answer back. I only open a visible Google tab when you explicitly ask for Google or search results.\n\n**Live voice daily cap** — Realtime voice sessions are now tracked server-side with a 7-minute daily limit so things stay fair and fast.\n\nWhat do you want to try first?";
    __sbChatHistory.push({ role: "assistant", content: reply });
    __sbCardTurns.push({ prompt: promptText, answer: reply });
    const scrollEl = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbRenderCardHistory(scrollEl);
    __sbOpenCard({ rich: true });
    __sbSyncSpeakButtons();
    if (fromVoice) await speakVoiceReply(reply);
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  // Braino's favorite song easter egg
  if (/\bfavou?rite\b/i.test(promptText)) {
    const result = await new Promise(resolve =>
      chrome.runtime.sendMessage({ action: "playBrainoFavoriteSong" }, r => resolve(r || {}))
    );
    const reply = result.ok
      ? "Playing my favorite song for you ♫"
      : result.error?.includes("device")
        ? "Open Spotify on your phone or desktop first, then ask me again ♫"
        : "Spotify isn't connected yet — [connect it here](https://trybraino.com/dashboard).";
    __sbChatHistory.push({ role: "user", content: promptText });
    __sbChatHistory.push({ role: "assistant", content: reply });
    __sbShowBubble(reply, true, { rich: true });
    if (fromVoice) await speakVoiceReply(reply);
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  // X (Twitter) status — answered inline with real data + TTS, panel stays open.
  if (__sbIsStartXAutomationCommand(promptText)) {
    await __sbHandleStartXAutomationCommand(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }
  if (__sbIsXLastTweetRequest(promptText)) {
    await __sbHandleXLastTweet(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }
  if (__sbIsXStatusRequest(promptText)) {
    await __sbHandleXStatus(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  // Volume — handle directly (instant, no premium agent). "increase/louder" defaults to +20%.
  if (__sbIsVolumeCommand(promptText)) {
    const handled = await __sbHandleVolumeCommand(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    if (handled) return;
  }

  // Cross-tab awareness & control (close before query — a close command also says "tabs").
  if (__sbIsCloseTabsCommand(promptText)) {
    await __sbHandleCloseTabs(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }
  if (__sbIsTabsQuery(promptText)) {
    await __sbHandleTabsQuery(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  if (intent === "record") {
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    if (forcedMode === "lecture" || forcedMode === "meeting") {
      void __sbStartLectureRecording();
    } else {
      await __sbStartRecording();
    }
    return;
  }

  const stored = await __sbStorageGet(["currentNotes", "authToken", "aiProvider"]);
  const aiProvider = stored.aiProvider === "claude" ? "claude" : "lovable";

  if (intent === "agent") {
    const hasPremium = await __sbResolvePremiumStatus(true);
    if (!hasPremium) {
      __sbRtAwaitingDelegateResult = false;
      __sbShowUpgrade("Browser Agent (Delegate)");
      if (fromVoice) await speakVoiceReply("Browser agent requires premium.");
      __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
      return;
    }
    if (!fromVoice || !__sbVoiceOnlyMode) __sbShowBubble("Delegating…", false);
    if (voiceOutput === "realtime") __sbRtAwaitingDelegateResult = true;
    __sbRunAgent(promptText, { connector: connectorHint });
    if (fromVoice) {
      await speakVoiceReply("On it.");
    }
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  const pageContext = __sbGetPageContext();
  const hasPageText = Boolean(pageContext.text);
  const selectedText = pageContext.selectedText || undefined;
  const previousHistory = __sbChatHistory.slice(-10);

  if (intent === "web") {
    const voiceOnly = fromVoice && __sbVoiceOnlyMode;
    const searchQuery = __sbExtractSearchQuery(promptText); // clean query, not the raw sentence
    if (voiceOnly && __sbShouldOpenVisibleGoogleSearch(promptText)) {
      chrome.runtime.sendMessage({
        action: "openTab",
        url: "https://www.google.com/search?q=" + encodeURIComponent(searchQuery),
        active: true,
      }, () => { void chrome.runtime.lastError; });
    }
    if (!voiceOnly) {
      const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
      __sbShowThinking(scroll, promptText, "Searching the web…");
      __sbOpenCard({ rich: true });
      __sbSyncSpeakButtons();
    }
    __sbChatHistory.push({ role: "user", content: promptText });

    try {
      const searchData = await __sbPerformWebSearch(searchQuery, {
        purpose: "answer",
        aiProvider,
        chatHistory: previousHistory,
      });

      const finalReply = __sbAppendSearchSources(
        String(searchData.answer || "I couldn't turn those web results into a useful answer."),
        searchData.results || searchData.sources || [],
      );
      __sbChatHistory.push({ role: "assistant", content: finalReply });
      __sbCardTurns.push({ prompt: promptText, answer: finalReply });
      if (voiceOnly) {
        const spoke = await speakVoiceReply(finalReply);
        if (!spoke) {
          const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
          __sbRenderCardHistory(scroll);
          __sbOpenCard({ rich: true });
          __sbSyncSpeakButtons();
        }
      } else {
        const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
        __sbRenderCardHistory(scroll);
        __sbOpenCard({ rich: true });
        __sbSyncSpeakButtons();
        if (fromVoice) await speakVoiceReply(finalReply);
      }
    } catch (err) {
      __sbShowBubble("Error: " + (err.message || "couldn't search the web"), true);
      if (fromVoice) await speakVoiceReply("Something went wrong while searching the web.");
    } finally {
      __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    }
    return;
  }

  const voiceOnly = fromVoice && __sbVoiceOnlyMode;
  if (!voiceOnly) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    __sbSyncSpeakButtons();
  }
  __sbChatHistory.push({ role: "user", content: promptText });

  try {
    // On X/Twitter, prepend the user's persona + X Auto rules so Braino can answer
    // questions about identity, rules, and how it replies — even before the migration is applied
    let systemNotes = stored.currentNotes || "";
    if (__sbIsOnX()) {
      const xPersona = await __sbLoadXPersona();
      const xCtx = __sbBuildXAutoContext(xPersona);
      systemNotes = systemNotes ? xCtx + "\n\n" + systemNotes : xCtx;
    }

    const body = {
      message: promptText,
      notes: systemNotes,
      aiProvider,
      chatHistory: previousHistory,
    };
    if (hasPageText) {
      body.pageContext = {
        url: pageContext.url,
        title: pageContext.title,
        text: pageContext.text,
        hoveredContext: pageContext.hoveredContext || null,
      };
    }
    if (selectedText) body.selectedText = selectedText;

    const { reply } = await __sbFetchAssistantReply(body);
    if (!reply) {
      if (fromVoice) await speakVoiceReply("Please sign in to continue.");
      return;
    }
    __sbChatHistory.push({ role: "assistant", content: reply });
    __sbCardTurns.push({ prompt: promptText, answer: reply });
    if (voiceOnly) {
      const spoke = await speakVoiceReply(reply);
      if (!spoke) {
        const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
        __sbRenderCardHistory(scroll);
        __sbOpenCard({ rich: true });
        __sbSyncSpeakButtons();
      }
    } else {
      const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
      __sbRenderCardHistory(scroll);
      __sbOpenCard({ rich: true });
      __sbSyncSpeakButtons();
      if (fromVoice) await speakVoiceReply(reply);
    }
  } catch (err) {
    if (__sbHeadphoneMode) {
      __sbShowVoiceError("Something went wrong — try again.");
    } else {
      __sbShowBubble("Error: " + (err.message || "couldn't reach Braino"), true);
    }
    if (fromVoice) await speakVoiceReply("Something went wrong.");
  } finally {
    __sbCompleteVoiceTurn({
      fromVoice,
      voiceOutput,
      voiceTurnToken,
      resumeLegacyMic: __sbHeadphoneMode && voiceOutput !== "realtime",
    });
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
  if (cardOpen) __sbPulseFollowupBar();
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

function __sbRunAgent(task, options = {}) {
  if (!__sbContextOk()) { __sbShowBubble("Reload page to reconnect Braino.", true); return; }
  __sbLastAgentTask = String(task || "").trim();
  // Hand off to background — it runs the full agent loop and sends sbAgentUpdate messages back
  chrome.runtime.sendMessage({
    action: "runBrainAgent",
    task,
    connector: __sbNormalizeConnectorName(options.connector) || "auto",
  }, () => { void chrome.runtime.lastError; });
}

function __sbShowLectureRecordingBar(show) {
  document.getElementById("__sb_rec_bar__")?.classList.toggle("active", show);
  const timerEl = document.getElementById("__sb_rec_timer__");
  if (!show && timerEl) timerEl.textContent = "00:00";
}

function __sbShowLectureReadyCard(mode) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const isM = mode === "meeting";
  const icon = isM ? "🤝" : "🎙";
  const modeLabel = isM ? "Meeting & Call" : "Lecture & Audio";
  scroll.innerHTML = `
    <div class="sb-lec-ready">
      <div class="sb-lec-kicker">${icon} ${modeLabel}</div>
      <div class="sb-lec-ready-title">Ready to record</div>
      <div class="sb-lec-ready-sub">Braino will listen to this tab and turn everything into structured notes.</div>
      <button id="__sb_lec_start_btn__" class="sb-lec-start-btn">▶ Start Recording</button>
    </div>
  `;
  __sbOpenCard({ rich: false });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  document.getElementById("__sb_lec_start_btn__")?.addEventListener("click", () => void __sbStartLectureRecording());
}

function __sbShowLectureRecordingCard() {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const title = (document.title || "Untitled").slice(0, 50);
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const bars = Array.from({ length: 12 }, () => `<div class="sb-lec-wave-bar"></div>`).join("");
  scroll.innerHTML = `
    <div class="sb-lec-rec">
      <div class="sb-lec-rec-header">
        <div class="sb-lec-rec-dot"></div>
        <div class="sb-lec-rec-label">Recording</div>
      </div>
      <div class="sb-lec-title">${title}</div>
      <div class="sb-lec-date">${date}</div>
      <div class="sb-lec-waveform" id="__sb_lec_waveform__">${bars}</div>
      <div class="sb-lec-timer" id="__sb_lec_card_timer__">00:00</div>
      <div class="sb-lec-status" id="__sb_lec_status__">Listening to this tab…</div>
      <div class="sb-lec-btns">
        <button id="__sb_lec_seg_btn__" class="sb-lec-seg-btn">✂ Save Segment</button>
        <button id="__sb_lec_stop_btn__" class="sb-lec-stop-btn">⏹ Stop & Get Notes</button>
      </div>
    </div>
  `;
  __sbOpenCard({ rich: false });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  document.getElementById("__sb_lec_seg_btn__")?.addEventListener("click", () => void __sbCaptureLectureSegment());
  document.getElementById("__sb_lec_stop_btn__")?.addEventListener("click", () => void __sbStopLectureRecording());
}

async function __sbStartLectureRecording() {
  if (!__sbContextOk()) {
    __sbShowBubble("Reload this page to reconnect Braino.", true);
    return;
  }
  if (__sbIsLectureRecording) return;
  __sbIsLectureRecording = true;
  __sbLectureNotes = "";
  __sbLecSegmentCount = 0;

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

  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (brainBtn) { brainBtn.classList.add("recording"); brainBtn.innerHTML = __SB_BRAIN_SVG_LISTENING; }
  __sbShowLectureRecordingBar(false);
  __sbShowLectureRecordingCard();

  let seconds = 0;
  __sbLectureInterval = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    const timeStr = `${m}:${s}`;
    const timerEl = document.getElementById("__sb_rec_timer__");
    if (timerEl) timerEl.textContent = timeStr;
    const cardTimerEl = document.getElementById("__sb_lec_card_timer__");
    if (cardTimerEl) cardTimerEl.textContent = timeStr;
  }, 1000);
}

async function __sbCaptureLectureSegment() {
  const segBtn = document.getElementById("__sb_lec_seg_btn__");
  const captureBtn = document.getElementById("__sb_capture_btn__");
  const statusEl = document.getElementById("__sb_lec_status__");

  if (segBtn) { segBtn.disabled = true; segBtn.textContent = "Saving…"; }
  if (captureBtn) captureBtn.classList.add("loading");
  if (statusEl) statusEl.textContent = "Capturing segment…";

  try {
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getLectureSegment", existingNotes: __sbLectureNotes }, (r) => resolve(r || {}));
    });

    if (res.error) {
      if (statusEl) statusEl.textContent = "Capture failed — try again.";
      if (segBtn) { segBtn.disabled = false; segBtn.textContent = "✂ Save Segment"; }
      return;
    }
    if (res.empty) {
      if (statusEl) statusEl.textContent = "Nothing recorded yet — speak a bit longer.";
      if (segBtn) { segBtn.disabled = false; segBtn.textContent = "✂ Save Segment"; }
      return;
    }

    __sbLectureNotes = res.notes || __sbLectureNotes;
    __sbLecSegmentCount++;
    if (statusEl) statusEl.textContent = `✓ Segment ${__sbLecSegmentCount} saved — still recording…`;
    if (segBtn) { segBtn.disabled = false; segBtn.textContent = "✂ Save Segment"; }
  } finally {
    if (captureBtn) captureBtn.classList.remove("loading");
  }
}

async function __sbStopLectureRecording() {
  if (__sbLectureInterval) { clearInterval(__sbLectureInterval); __sbLectureInterval = null; }
  const brainBtnStop = document.getElementById("__sb_brain_btn__");
  if (brainBtnStop) { brainBtnStop.classList.remove("recording"); brainBtnStop.innerHTML = __SB_BRAIN_SVG; }
  __sbShowLectureRecordingBar(false);
  __sbIsLectureRecording = false;

  // Show loading state in the card while we process
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (scroll) {
    scroll.innerHTML = `
      <div class="sb-lec-loading">
        <div class="sb-lec-spinner"></div>
        <div class="sb-lec-loading-txt">Transcribing &amp; generating notes…</div>
      </div>
    `;
  }

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
    if (scroll) {
      scroll.innerHTML = `<div class="sb-lec-ready"><div class="sb-lec-kicker">Recording stopped</div><div class="sb-lec-ready-sub">No content was captured — try speaking louder or use ✂ Save Segment during the next session.</div></div>`;
    }
  }
}

function __sbShowLectureNotes(notes, isFinal) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbLastBubbleRaw = notes;
  const actionsHtml = isFinal ? `
    <div class="sb-lec-notes-actions">
      <button id="__sb_lec_copy_btn__" class="sb-lec-copy-btn">Copy</button>
      <button id="__sb_notion_sync_btn__" class="sb-notion-btn" style="flex:1.4">Sync to Notion</button>
    </div>
  ` : "";
  scroll.innerHTML = `<div class="sb-card-a">${__sbRenderMarkdown(notes)}</div>${actionsHtml}`;
  __sbOpenCard({ rich: true });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (isFinal) {
    document.getElementById("__sb_notion_sync_btn__")?.addEventListener("click", __sbSyncNotesToNotion);
    document.getElementById("__sb_lec_copy_btn__")?.addEventListener("click", () => {
      navigator.clipboard.writeText(notes).catch(() => {});
      const btn = document.getElementById("__sb_lec_copy_btn__");
      if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1800); }
    });
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

// ── Headphone Mode ──────────────────────────────────────────────────────────

// ── GPT Realtime voice — WebRTC (GA Realtime API flow) ──────────────────────
let __sbRtPeerConnection = null;
let __sbRtDataChannel = null;
let __sbRtMic = null;
let __sbRtRemoteAudio = null;
let __sbUseOffscreenRt = false; // true when realtime session lives in the offscreen doc
const __SB_REALTIME_VOICE = "verse";
let __sbVoiceOutputPref = "elevenlabs"; // "realtime" | "elevenlabs"
let __sbRtUserTranscript = "";
let __sbLastRepeatPromptAt = 0; // rate-limit the "didn't catch that" prompt
let __sbRtAssistantTranscript = "";
let __sbRtResponseWaiter = null;
let __sbRtTurnToken = 0;
let __sbRtCurrentResponseMode = "idle";
let __sbRtAwaitingDelegateResult = false;
let __sbRtRelayingAppMessage = false;
let __sbRtHandlingConversationTurn = false;
let __sbRtSessionReady = false;
let __sbRtInstructionsFingerprint = "";
let __sbRtUsageSessionId = null;
let __sbRtUsageAllocatedMs = 0;
let __sbRtUsageLimitMs = 0;
let __sbRtUsageHeartbeatTimer = null;
let __sbRtUsageDeadlineTimer = null;
let __sbRtUsageWarningTimer = null;
let __sbRtConnectHintTimer = null;
let __sbRtRealtimeModel = "gpt-realtime-2";
let __sbRtTranscriptionModel = "gpt-4o-transcribe";
let __sbRtCostTurn = null;
let __sbRtLastCostTurn = null;
let __sbRtCostTurnSeq = 0;
let __sbRtCostKeepOpen = false;
const __SB_RT_MAX_CONNECT_FAILURES = 3;
let __sbRtConnectFailureCount = 0;
let __sbRtRetryTimer = null;
let __sbRtLocalConnectInFlight = false;
let __sbRtLastFailureAt = 0;

function __sbNormalizeVoiceOutputPref(value) {
  return value === "realtime" ? "realtime" : "elevenlabs";
}

function __sbApplyStoredVoiceOutputPref(value) {
  const pref = __sbNormalizeVoiceOutputPref(value);
  __sbVoiceOutputPref = pref;
  if (value && value !== pref && __sbContextOk()) {
    chrome.storage.local.set({ brainoVoicePref: pref });
  }
  return pref;
}

function __sbResetRealtimeConnectFailures() {
  __sbRtConnectFailureCount = 0;
  __sbRtLastFailureAt = 0;
  if (__sbRtRetryTimer) {
    clearTimeout(__sbRtRetryTimer);
    __sbRtRetryTimer = null;
  }
}

function __sbIsNonRetryableRealtimeFailure(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("sign in") ||
    text.includes("401") ||
    text.includes("403") ||
    text.includes("daily live voice limit") ||
    text.includes("7-minute") ||
    text.includes("already used") ||
    text.includes("cap is up")
  );
}

function __sbResetRealtimeUsageState() {
  if (__sbRtUsageHeartbeatTimer) {
    clearInterval(__sbRtUsageHeartbeatTimer);
    __sbRtUsageHeartbeatTimer = null;
  }
  if (__sbRtUsageDeadlineTimer) {
    clearTimeout(__sbRtUsageDeadlineTimer);
    __sbRtUsageDeadlineTimer = null;
  }
  if (__sbRtUsageWarningTimer) {
    clearTimeout(__sbRtUsageWarningTimer);
    __sbRtUsageWarningTimer = null;
  }
  __sbRtUsageSessionId = null;
  __sbRtUsageAllocatedMs = 0;
  __sbRtUsageLimitMs = 0;
}

function __sbGetRealtimeCostVoiceInfo() {
  if (__sbVoiceOutputPref === "elevenlabs") {
    return { voiceProvider: "elevenlabs", voiceId: __SB_ELEVENLABS_VOICE_ID, voiceName: "ElevenLabs Braino" };
  }
  return { voiceProvider: "openai_realtime", voiceId: __SB_REALTIME_VOICE, voiceName: `OpenAI ${__SB_REALTIME_VOICE}` };
}

function __sbBeginRealtimeCostTurn(transcript, turnToken, transcriptionUsage = {}) {
  const text = String(transcript || "").trim();
  if (!text) return null;
  if (__sbRtCostTurn && !__sbRtCostTurn.completedAt) {
    __sbCompleteRealtimeCostTurn({ force: true });
  }

  const now = new Date().toISOString();
  const sessionId = __sbRtUsageSessionId || null;
  const turnIndex = Number.isInteger(turnToken) ? turnToken : ++__sbRtCostTurnSeq;
  __sbRtCostTurnSeq = Math.max(__sbRtCostTurnSeq, turnIndex);
  __sbRtCostTurn = {
    turnId: `${sessionId || "rt"}_${turnIndex}_${Date.now()}`,
    sessionId,
    turnIndex,
    startedAt: now,
    completedAt: null,
    userTranscript: text,
    assistantMessages: [],
    routeIntent: null,
    routeMode: null,
    connector: null,
    realtimeModel: __sbRtRealtimeModel || "unknown",
    transcriptionModel: __sbRtTranscriptionModel || "gpt-4o-transcribe",
    rawRealtimeUsage: {},
    rawTranscriptionUsage: transcriptionUsage && typeof transcriptionUsage === "object" ? transcriptionUsage : {},
    rawTtsUsage: { events: [] },
  };
  __sbRtLastCostTurn = __sbRtCostTurn;
  return __sbRtCostTurn;
}

function __sbPatchRealtimeCostTurn(fields = {}) {
  const turn = __sbRtCostTurn;
  if (!turn || !fields || typeof fields !== "object") return;
  Object.assign(turn, fields);
}

function __sbAppendRealtimeCostAssistantMessage(text) {
  const turn = __sbRtCostTurn;
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!turn || !clean) return;
  const last = turn.assistantMessages[turn.assistantMessages.length - 1];
  if (last !== clean) turn.assistantMessages.push(clean);
}

function __sbRecordRealtimeCostUsage(usage) {
  const turn = __sbRtCostTurn;
  if (!turn || !usage || typeof usage !== "object") return;
  turn.rawRealtimeUsage = usage;
}

function __sbRecordRealtimeCostTts(event = {}) {
  const turn = __sbRtCostTurn;
  if (!turn || !event || typeof event !== "object") return;
  const events = Array.isArray(turn.rawTtsUsage?.events) ? turn.rawTtsUsage.events : [];
  events.push({
    at: new Date().toISOString(),
    provider: String(event.provider || __sbGetRealtimeCostVoiceInfo().voiceProvider),
    bytes: Number(event.bytes || 0) || 0,
    contentType: String(event.contentType || ""),
    error: event.error ? String(event.error).slice(0, 500) : "",
  });
  turn.rawTtsUsage = { events: events.slice(-20) };
}

function __sbCompleteRealtimeCostTurn(options = {}) {
  const turn = __sbRtCostTurn;
  if (!turn) return;
  if (!options.force && (options.keepOpen || __sbRtCostKeepOpen || __sbRtAwaitingDelegateResult)) {
    return;
  }
  if (!turn.completedAt) turn.completedAt = new Date().toISOString();
  const payload = __sbBuildRealtimeCostPayload(turn);
  if (!payload) return;
  void __sbAuthedApiFetch("realtime-cost-log", {
    method: "POST",
  }, {
    jsonBody: payload,
    suppressSignIn: true,
  }).catch(() => {});
  __sbRtLastCostTurn = turn;
  if (__sbRtCostTurn === turn) __sbRtCostTurn = null;
}

function __sbBuildRealtimeCostPayload(turn) {
  if (!turn?.turnId) return null;
  const voiceInfo = __sbGetRealtimeCostVoiceInfo();
  return {
    turnId: turn.turnId,
    sessionId: turn.sessionId || __sbRtUsageSessionId || null,
    turnIndex: turn.turnIndex || 0,
    startedAt: turn.startedAt,
    completedAt: turn.completedAt,
    userTranscript: turn.userTranscript || "",
    assistantMessages: Array.isArray(turn.assistantMessages) ? turn.assistantMessages : [],
    routeIntent: turn.routeIntent || null,
    routeMode: turn.routeMode || null,
    connector: turn.connector || null,
    realtimeModel: turn.realtimeModel || __sbRtRealtimeModel || "unknown",
    transcriptionModel: turn.transcriptionModel || __sbRtTranscriptionModel || "gpt-4o-transcribe",
    voiceProvider: voiceInfo.voiceProvider,
    voiceId: voiceInfo.voiceId,
    voiceName: voiceInfo.voiceName,
    rawRealtimeUsage: turn.rawRealtimeUsage || {},
    rawTranscriptionUsage: turn.rawTranscriptionUsage || {},
    rawTtsUsage: turn.rawTtsUsage || {},
    costConfidence: Object.keys(turn.rawRealtimeUsage || {}).length || Object.keys(turn.rawTranscriptionUsage || {}).length ? "mixed" : "unknown",
  };
}

async function __sbHeartbeatRealtimeUsageSession() {
  if (!__sbRtUsageSessionId) return;
  try {
    await __sbAuthedApiFetch("openai-realtime-session", {
      method: "POST",
    }, {
      jsonBody: {
        action: "heartbeat",
        sessionId: __sbRtUsageSessionId,
      },
      suppressSignIn: true,
    });
  } catch (_) {}
}

async function __sbEndRealtimeUsageSession(reason = "client_exit") {
  const sessionId = __sbRtUsageSessionId;
  __sbResetRealtimeUsageState();
  if (!sessionId) return;

  try {
    await __sbAuthedApiFetch("openai-realtime-session", {
      method: "POST",
    }, {
      jsonBody: {
        action: "end",
        sessionId,
        reason,
      },
      suppressSignIn: true,
    });
  } catch (_) {}
}

function __sbScheduleRealtimeUsageCap(allocatedMs) {
  if (!Number.isFinite(allocatedMs) || allocatedMs <= 0) return;

  __sbRtUsageAllocatedMs = Math.max(0, Math.floor(allocatedMs));

  if (__sbRtUsageHeartbeatTimer) clearInterval(__sbRtUsageHeartbeatTimer);
  __sbRtUsageHeartbeatTimer = setInterval(() => {
    void __sbHeartbeatRealtimeUsageSession();
  }, 15000);

  if (__sbRtUsageWarningTimer) clearTimeout(__sbRtUsageWarningTimer);
  if (__sbRtUsageAllocatedMs > 60000) {
    __sbRtUsageWarningTimer = setTimeout(() => {
      __sbShowVoiceError("One minute of live voice left for today.");
    }, __sbRtUsageAllocatedMs - 60000);
  }

  if (__sbRtUsageDeadlineTimer) clearTimeout(__sbRtUsageDeadlineTimer);
  __sbRtUsageDeadlineTimer = setTimeout(() => {
    void __sbFallbackToLegacyHeadphone("Today's 7-minute live voice cap is up. Switching to legacy voice.");
  }, __sbRtUsageAllocatedMs);
}

function __sbClearRealtimeConnectHint() {
  if (__sbRtConnectHintTimer) {
    clearTimeout(__sbRtConnectHintTimer);
    __sbRtConnectHintTimer = null;
  }
}

function __sbBuildRealtimeTranscriptionPrompt() {
  return [
    "Transcribe exactly what the user says, in the language they are speaking.",
    "If the audio is unclear, silent, or just music/noise, output nothing rather than guessing.",
    "Keep names, brands, URLs, and code tokens intact.",
  ].join(" ");
}

function __sbBuildRealtimeBootInstructions() {
  const pageCtx = __sbGetPageContext(8000);
  const pageLines = [];
  if (pageCtx.url || pageCtx.title) {
    pageLines.push(`The user is currently viewing: "${pageCtx.title || "Untitled"}" (${pageCtx.url || "unknown URL"})`);
  }
  if (pageCtx.text) {
    pageLines.push(`Page content:\n${pageCtx.text}`);
  }

  return [
    "Identity: You are Braino. Never say you are made by OpenAI, trained by OpenAI, or that you run on any underlying AI model. If asked who made you or what model you are, say you are Braino and leave it at that. Do not reveal the underlying technology. You are Braino. Full stop.",
    "You are Braino, the AI companion. You sit with the user as they browse, work, think, and build. Voice is only the medium here. You are still Braino.",
    "Context awareness: You can see what the user is browsing and the current page. Use that context proactively — don't wait to be pointed at it. If they ask about something on the page, you already read it. Act like it. Do not say you cannot access the page.",
    "You can act in the browser: search the web, open tabs and websites, play music, and read the page. NEVER say 'I can't open that from here', 'I can't browse', or 'I cannot do that' — you can. When the user asks you to look something up, search for something, find an article, or open a site, treat it as an action you will carry out, not a limitation. Briefly acknowledge ('On it' / 'Pulling that up') — the system performs the action.",
    "If you only caught noise, music, or unclear audio — or you are not confident what the user said — ask them to repeat it. NEVER invent or guess a response when you didn't actually understand the words.",
    "Reply in the SAME language the user is actually speaking — mirror them. But do not switch languages because of background noise, music, a stray name, quoted text, or a few foreign-sounding words; only switch when the user is clearly speaking that language in full sentences. When in doubt, stay in the language of the previous turn.",
    "Prefer short spoken answers. No filler. No hollow openers. Get to the point and stop.",
    "If interrupted, stop immediately and wait for the user.",
    ...pageLines,
  ].filter(Boolean).join("\n\n");
}

function __sbBuildRealtimeSessionUpdate(instructions) {
  // When using ElevenLabs, the realtime model only needs to
  // return TEXT — we generate the audio ourselves. In native realtime mode, the model
  // produces audio directly.
  const useExternalTts = __sbVoiceOutputPref === "elevenlabs";
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: useExternalTts ? ["text"] : ["audio"],
      reasoning: {
        effort: "low",
      },
      audio: {
        input: {
          noise_reduction: {
            type: "near_field",
          },
          transcription: {
            model: "gpt-4o-transcribe",
            // No hard language lock — the user wants multilingual mirroring (speak any
            // language, Braino mirrors it). Noise-induced language hallucinations are held
            // back by __sbIsJunkTranscript + calmer VAD instead.
            prompt: __sbBuildRealtimeTranscriptionPrompt(),
          },
          turn_detection: {
            // "auto" eagerness is calmer than "high" — it waits for a clearer end-of-speech,
            // so loud background music/noise is less likely to be chopped into false turns.
            type: "semantic_vad",
            eagerness: "auto",
            create_response: false,
            interrupt_response: true,
          },
        },
        output: {
          voice: __SB_REALTIME_VOICE,
        },
      },
    },
  };
}

function __sbSendRealtimeSessionUpdate(instructions) {
  const promptText = String(instructions || "").trim();
  if (!promptText) return false;
  return __sbSendRtEvent(__sbBuildRealtimeSessionUpdate(promptText));
}

async function __sbBuildRealtimeConfigPayload() {
  const pageContext = __sbGetPageContext(8000);
  const stored = await __sbStorageGet(["currentNotes"]);
  let notes = String(stored.currentNotes || "").trim();

  if (__sbIsOnX()) {
    const xPersona = await __sbLoadXPersona();
    const xContext = __sbBuildXAutoContext(xPersona);
    notes = notes ? `${xContext}\n\n${notes}` : xContext;
  }

  return {
    notes: __sbTrimPromptContext(notes, 5000),
    selectedText: __sbTrimPromptContext(pageContext.selectedText || "", 1500),
    pageContext: {
      url: pageContext.url,
      title: pageContext.title,
      text: __sbTrimPromptContext(pageContext.text || "", 8000),
      hoveredContext: pageContext.hoveredContext || null,
    },
    languagePolicy: "mirror_user",
    voiceSurface: "floating_mascot",
  };
}

async function __sbSyncRealtimeVoiceInstructions() {
  try {
    if (!__sbHeadphoneMode || !__sbRtControlReady()) return false;

    const resp = await __sbAuthedApiFetch("openai-realtime-config", {
      method: "POST",
    }, {
      jsonBody: await __sbBuildRealtimeConfigPayload(),
      suppressSignIn: true,
    });
    if (!resp) return false;
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.warn("Realtime config fetch failed:", errData?.error || resp.status);
      return false;
    }

    const data = await resp.json().catch(() => ({}));
    const instructions = String(data?.instructions || "").trim();
    const fingerprint = String(data?.fingerprint || "").trim();
    if (!instructions) return false;
    if (fingerprint && fingerprint === __sbRtInstructionsFingerprint) return true;
    if (!__sbHeadphoneMode || !__sbRtControlReady()) return false;

    const updated = __sbSendRealtimeSessionUpdate(instructions);
    if (updated && fingerprint) {
      __sbRtInstructionsFingerprint = fingerprint;
    }
    return updated;
  } catch (error) {
    // Suppress plain network failures (function not deployed yet) — boot instructions cover the fallback
    if (!(error instanceof TypeError)) {
      console.warn("Realtime config sync failed:", error);
    }
    return false;
  }
}

async function __sbFallbackToLegacyHeadphone(message = "Live AI is unavailable. Switching to legacy voice.") {
  if (!__sbHeadphoneMode) return false;

  __sbResetRealtimeConnectFailures();
  __sbCleanupRealtimeVoice({ reason: "legacy_fallback" });
  __sbSetVoiceStatusBadge("legacy", "Legacy");
  __sbShowVoiceError(message);
  __sbSetHpBrainState("connecting");

  const started = await __sbStartRecording({ silent: true });
  if (started) {
    return true;
  }

  __sbSetHpBrainState("");
  __sbSetVoiceStatusBadge("error", "Voice unavailable");
  __sbShowVoiceError("Legacy voice could not start.");
  return false;
}

function __sbScheduleRealtimeRetry(message, attemptNumber) {
  if (!__sbHeadphoneMode) return;
  if (__sbRtRetryTimer) clearTimeout(__sbRtRetryTimer);

  const delayMs = Math.min(1800, 500 + attemptNumber * 350);
  __sbSetVoiceStatusBadge("connecting", `Retrying Live AI ${attemptNumber}/${__SB_RT_MAX_CONNECT_FAILURES}`);
  __sbShowVoiceError(`${message} Retrying Live AI (${attemptNumber}/${__SB_RT_MAX_CONNECT_FAILURES})…`);
  __sbSetHpBrainState("connecting");

  __sbRtRetryTimer = setTimeout(() => {
    __sbRtRetryTimer = null;
    if (!__sbHeadphoneMode || __sbRtControlReady()) return;
    void __sbStartRealtimeConnectAttempt();
  }, delayMs);
}

async function __sbHandleRealtimeConnectFailure(message = "Live AI failed.", options = {}) {
  if (!__sbHeadphoneMode) return false;

  const failureMessage = String(message || "Live AI failed.");
  if (options.nonRetryable || __sbIsNonRetryableRealtimeFailure(failureMessage)) {
    return await __sbFallbackToLegacyHeadphone(`${failureMessage} Switching to legacy voice.`);
  }

  const now = Date.now();
  if (now - __sbRtLastFailureAt < 750 && __sbRtRetryTimer) {
    return false;
  }
  __sbRtLastFailureAt = now;

  __sbRtConnectFailureCount += 1;
  const attemptNumber = __sbRtConnectFailureCount;

  if (attemptNumber >= __SB_RT_MAX_CONNECT_FAILURES) {
    return await __sbFallbackToLegacyHeadphone(`${failureMessage} Live AI failed after ${__SB_RT_MAX_CONNECT_FAILURES} attempts. Switching to legacy voice.`);
  }

  __sbCleanupRealtimeVoice({ reason: "realtime_retry" });
  __sbHeadphoneMode = true;
  __sbVoiceOnlyMode = true;
  document.getElementById("__sb_rec_btn__")?.classList.add("active");
  document.getElementById("__sb_card_voice_mode_btn__")?.classList.add("active");
  __sbScheduleRealtimeRetry(failureMessage, attemptNumber);
  return false;
}

async function __sbStartRealtimeConnectAttempt() {
  if (!__sbHeadphoneMode || __sbRtControlReady()) return true;

  const stored = await __sbStorageGet(["authToken", "sbOffscreenRtBroken"]);
  const authToken = stored.authToken || null;
  if (!authToken) {
    __sbSetVoiceStatusBadge("error", "Sign in first");
    __sbSetHpBrainState("");
    __sbShowSignIn();
    return false;
  }

  __sbSetHpBrainState("connecting");
  __sbSetVoiceStatusBadge("connecting", "Waking up…");

  if (!stored.sbOffscreenRtBroken) {
    const bootInstructions = __sbBuildRealtimeSessionUpdate(__sbBuildRealtimeBootInstructions());
    chrome.runtime.sendMessage(
      { action: "startOffscreenRealtime", authToken, bootInstructions },
      (res) => {
        if (chrome.runtime.lastError || res?.error) {
          void __sbHandleRealtimeConnectFailure(res?.error || chrome.runtime.lastError?.message || "Live AI transport failed.");
        }
      }
    );
    return true;
  }

  void __sbStartRealtimeVoice();
  return true;
}

async function __sbStartRealtimeVoice() {
  if (__sbRtLocalConnectInFlight || __sbRtControlReady()) return true;
  __sbRtLocalConnectInFlight = true;
  const { authToken } = await __sbStorageGet(["authToken"]);
  if (!authToken) {
    __sbRtLocalConnectInFlight = false;
    __sbSetVoiceStatusBadge("error", "Sign in first");
    __sbSetHpBrainState("");
    return;
  }

  try {
    __sbRtSessionReady = false;
    __sbRtInstructionsFingerprint = "";
    __sbClearRealtimeConnectHint();
    __sbRtConnectHintTimer = setTimeout(() => {
      if (__sbHeadphoneMode && !__sbRtSessionReady) {
        __sbShowVoiceError("Hold up, give me a second…");
      }
    }, 1500);

    __sbRtMic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    const peerConnection = new RTCPeerConnection();
    __sbRtPeerConnection = peerConnection;

    __sbRtMic.getTracks().forEach((track) => {
      peerConnection.addTrack(track, __sbRtMic);
    });

    __sbRtRemoteAudio = document.createElement("audio");
    __sbRtRemoteAudio.autoplay = true;
    __sbRtRemoteAudio.playsInline = true;
    __sbRtRemoteAudio.muted = true;
    __sbRtRemoteAudio.volume = 0;
    __sbRtRemoteAudio.style.display = "none";
    document.body.appendChild(__sbRtRemoteAudio);

    peerConnection.ontrack = (event) => {
      __sbRtRemoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
      __sbRtRemoteAudio.play().catch(() => {});
    };

    let handledConnectionFailure = false;
    peerConnection.onconnectionstatechange = () => {
      if (__sbHeadphoneMode) {
        const state = peerConnection.connectionState;
        if (state === "failed" || state === "closed" || state === "disconnected") {
          if (handledConnectionFailure || peerConnection !== __sbRtPeerConnection) return;
          handledConnectionFailure = true;
          void __sbHandleRealtimeConnectFailure("Live AI disconnected.");
        }
      }
    };

    let _dcReject;
    const dataChannelOpen = new Promise((resolve, reject) => {
      _dcReject = reject;
      const timeoutId = setTimeout(() => {
        reject(new Error("Live AI timed out while connecting."));
      }, 15000);

      __sbRtDataChannel = peerConnection.createDataChannel("oai-events");
      __sbRtDataChannel.addEventListener("open", () => {
        clearTimeout(timeoutId);
        resolve(true);
      }, { once: true });
      __sbRtDataChannel.addEventListener("error", () => {
        clearTimeout(timeoutId);
        reject(new Error("Live AI could not open its control channel."));
      }, { once: true });
      __sbRtDataChannel.addEventListener("message", (event) => {
        try {
          __sbHandleRtEvent(JSON.parse(event.data));
        } catch (_) {}
      });
    });
    dataChannelOpen.catch(() => {});

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const res = await __sbAuthedApiFetch("openai-realtime-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
      },
      body: offer.sdp || "",
    }, {
      suppressSignIn: true,
    });
    if (!res) {
      throw new Error("Please sign in to continue.");
    }
    if (!res.ok) {
      if (_dcReject) _dcReject(new Error("cancelled"));
      if (res.status === 429) throw new Error("Live AI is busy — too many requests. Try again in a moment.");
      const errorText = await res.text();
      let errorPayload = {};
      try {
        errorPayload = JSON.parse(errorText);
      } catch {}
      throw new Error(errorPayload.details || errorPayload.error || errorText || `Live AI failed (${res.status})`);
    }

    __sbResetRealtimeUsageState();
    __sbRtUsageSessionId = res.headers.get("x-braino-realtime-session-id");
    __sbRtUsageLimitMs = Number(res.headers.get("x-braino-realtime-limit-ms") || "0") || 0;
    __sbRtRealtimeModel = res.headers.get("x-braino-realtime-model") || __sbRtRealtimeModel;
    __sbRtTranscriptionModel = res.headers.get("x-braino-realtime-transcription-model") || __sbRtTranscriptionModel;
    const allocatedMs = Number(res.headers.get("x-braino-realtime-allocated-ms") || "0") || 0;
    if (__sbRtUsageSessionId && allocatedMs > 0) {
      __sbScheduleRealtimeUsageCap(allocatedMs);
    }

    const answerSdp = await res.text();
    await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await dataChannelOpen;
    const booted = __sbSendRealtimeSessionUpdate(__sbBuildRealtimeBootInstructions());
    if (!booted) {
      throw new Error("Live AI control channel is not ready.");
    }

    __sbClearRealtimeConnectHint();
    __sbRtSessionReady = true;
    // Claim the single voice session — tells any other tab running voice to stand down,
    // so only one Braino ever listens/speaks (no "two tabs talking"). Because mic + audio
    // are global, this session keeps following the user across tab switches.
    try { chrome.runtime.sendMessage({ action: "rtVoiceClaim" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
    document.getElementById("__sb_brain_btn__")?.classList.add("hp-realtime");
    __sbSetVoiceStatusBadge("realtime", "Live AI");
    __sbSetHpBrainState("listening");
    __sbResetRealtimeConnectFailures();
    if (__sbIsRecording) __sbStopRecording({ silent: true });
    __sbStopSpeech();
    void __sbSyncRealtimeVoiceInstructions();
    return true;

  } catch (err) {
    __sbClearRealtimeConnectHint();
    const message = err?.message || "Live AI failed.";
    const authIssue = /sign in|401|403/i.test(String(message));
    if (authIssue) {
      __sbCleanupRealtimeVoice({ reason: "auth_error" });
      __sbSetVoiceStatusBadge("error", message);
      __sbSetHpBrainState("");
      __sbShowSignIn();
      return;
    }
    await __sbHandleRealtimeConnectFailure(message);
    return false;
  } finally {
    __sbRtLocalConnectInFlight = false;
  }
}

function __sbSendRtEvent(event) {
  if (__sbUseOffscreenRt) {
    if (!__sbRtSessionReady) return false;
    const payload = { ...event };
    if (!payload.event_id) payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    chrome.runtime.sendMessage({ action: "offscreenRtSend", event: payload }, () => { void chrome.runtime.lastError; });
    return true;
  }
  if (!__sbRtDataChannel || __sbRtDataChannel.readyState !== "open") return false;
  const payload = { ...event };
  if (!payload.event_id) {
    payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  __sbRtDataChannel.send(JSON.stringify(payload));
  return true;
}

function __sbSetRealtimeMicEnabled(enabled) {
  if (__sbUseOffscreenRt) {
    chrome.runtime.sendMessage({ action: "offscreenRtMic", enabled }, () => { void chrome.runtime.lastError; });
    return;
  }
  __sbRtMic?.getAudioTracks?.().forEach((track) => { track.enabled = enabled; });
}

// The single realtime voice session keeps running across tab switches (mic + audio are
// system-global), so Braino follows you from tab to tab and stays listening. Single-owner
// enforcement (rtVoiceClaim/rtVoiceYield) prevents the old "two tabs talking" problem, so
// we no longer mute a backgrounded voice tab. We only stop legacy (tab-local)
// SpeechRecognition when hidden, since it can't follow and would double up.
document.addEventListener("visibilitychange", () => {
  if (!__sbOwnsInlineUi()) return;
  if (document.hidden) {
    // Lost focus — hand voice off to whatever tab the user moved to.
    if (__sbHeadphoneMode) {
      __sbReleaseVoicePresence();
    } else if (!__sbUseOffscreenRt && __sbIsRecording) {
      try { __sbStopRecording({ silent: true }); } catch (_) {}
    }
  } else {
    // Became the foreground tab — take over voice presence (instant if a global session
    // exists; otherwise start an in-tab session here).
    __sbEnsureVoicePresence();
  }
});

// Storage is the race-free backbone — every tab converges no matter which signal lands first.
//  - sbVoiceModeOn → false : user turned voice off → every tab fully tears down.
//  - sbRtSessionActive → true : a global offscreen session came up → the focused tab
//    attaches to it instantly (and an in-tab session it may have started is redundant).
//  - sbRtSessionActive → false : global session ended → the focused tab re-ensures
//    presence (will start in-tab if voice mode is still on).
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!__sbOwnsInlineUi()) return;

    if ("brainoVoicePref" in changes) {
      const v = changes.brainoVoicePref.newValue;
      __sbApplyStoredVoiceOutputPref(v);
    }

    if ("sbVoiceModeOn" in changes && changes.sbVoiceModeOn.newValue === false) {
      // Voice fully off everywhere.
      if (__sbHeadphoneMode) {
        __sbCleanupRealtimeVoice({ reason: "voice_mode_off" });
        __sbDetachVoiceVisual();
        __sbStopSpeech();
      }
      return;
    }

    if ("sbRtSessionActive" in changes) {
      const active = changes.sbRtSessionActive.newValue;
      if (active) {
        if (document.visibilityState === "visible") {
          // A global session is now live. If we'd started an in-tab one, drop it and
          // attach to the global one instead (single source of audio).
          if (__sbHeadphoneMode && !__sbUseOffscreenRt) {
            __sbCleanupRealtimeVoice({ reason: "superseded_by_offscreen" });
          }
          if (!__sbHeadphoneMode || !__sbUseOffscreenRt) __sbAttachVoiceVisual();
        }
      } else if (__sbUseOffscreenRt) {
        // Global session dropped. Retry realtime first; do not start legacy until
        // the retry budget is exhausted.
        __sbUseOffscreenRt = false;
        if (document.visibilityState === "visible") {
          void __sbHandleRealtimeConnectFailure("Live AI disconnected.");
        } else {
          __sbDetachVoiceVisual();
        }
      }
    }
  });
} catch (_) {}

function __sbIsRealtimeVoiceReady() {
  return Boolean(__sbRtSessionReady && __sbRtDataChannel && __sbRtDataChannel.readyState === "open");
}

// Readiness for sending control events / relays — accounts for offscreen mode, where the
// data channel lives in the offscreen doc (so __sbRtDataChannel is null here but the
// session is still ready and events route via background → offscreen).
function __sbRtControlReady() {
  if (__sbUseOffscreenRt) return Boolean(__sbRtSessionReady);
  return __sbIsRealtimeVoiceReady();
}

async function __sbWaitForRealtimeControlReady(timeoutMs = 16000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (__sbRtControlReady()) return true;
    if (__sbIsRecording) return false;
    if (!__sbHeadphoneMode) return false;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return __sbRtControlReady();
}

function __sbHasActiveRealtimeResponse() {
  return __sbRtCurrentResponseMode !== "idle" || Boolean(__sbRtResponseWaiter);
}

function __sbIsBenignRealtimeControlError(message) {
  const text = String(message || "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("cancel") ||
    text.includes("clear") ||
    text.includes("no active response") ||
    text.includes("no response to cancel") ||
    text.includes("output audio buffer")
  );
}

function __sbResolveRtWaiter(payload) {
  if (!__sbRtResponseWaiter) return;
  const waiter = __sbRtResponseWaiter;
  __sbRtResponseWaiter = null;
  waiter.resolve(payload);
}

function __sbCreateRtWaiter() {
  if (__sbRtResponseWaiter) {
    __sbResolveRtWaiter({
      status: "cancelled",
      text: __sbRtAssistantTranscript.trim(),
      errorMessage: "",
    });
  }

  return new Promise((resolve) => {
    __sbRtResponseWaiter = { resolve };
  });
}

function __sbExtractRtResponseText(response) {
  const outputs = Array.isArray(response?.output) ? response.output : [];
  for (const item of outputs) {
    if (typeof item?.text === "string" && item.text.trim()) return item.text.trim();
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.transcript === "string" && part.transcript.trim()) return part.transcript.trim();
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function __sbResetRealtimeResponseState() {
  __sbRtAssistantTranscript = "";
  __sbRtCurrentResponseMode = "idle";
  __sbRtRelayingAppMessage = false;
  __sbRtHandlingConversationTurn = false;
}

function __sbInterruptRealtimeResponse() {
  if (__sbRtControlReady() && __sbHasActiveRealtimeResponse()) {
    __sbSendRtEvent({ type: "response.cancel" });
    __sbSendRtEvent({ type: "output_audio_buffer.clear" });
  }
  __sbResetRealtimeResponseState();
  __sbResolveRtWaiter({ status: "cancelled", text: "", errorMessage: "" });
}

async function __sbRequestRealtimeReply(text, { relayMode = false, verbatim = false } = {}) {
  const promptText = String(text || "").trim();
  if (!promptText) {
    return { status: "error", text: "", errorMessage: "Nothing to say." };
  }
  if (!__sbRtControlReady()) {
    return { status: "error", text: "", errorMessage: "Live AI is not ready." };
  }

  if (__sbHasActiveRealtimeResponse()) {
    __sbInterruptRealtimeResponse();
  }
  __sbRtAssistantTranscript = "";
  __sbRtCurrentResponseMode = relayMode ? "relay" : "conversation";
  __sbRtRelayingAppMessage = relayMode;
  __sbRtHandlingConversationTurn = !relayMode;

  const rtOutputModalities = __sbVoiceOutputPref === "elevenlabs" ? ["text"] : ["audio"];
  const responsePromise = __sbCreateRtWaiter();
  const responseCreated = relayMode
    ? __sbSendRtEvent({
        type: "response.create",
        response: {
          output_modalities: rtOutputModalities,
          input: [
            {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: verbatim
                    ? `Read this to the user out loud, exactly as written, word for word. Do not rephrase, summarize, or change any numbers. Say only this:\n\n${promptText}`
                    : `Relay this update to the user in one short natural spoken reply. Preserve the meaning and do not add new facts.\n\n${promptText}`,
                },
              ],
            },
          ],
        },
      })
    : (
      __sbSendRtEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: promptText,
            },
          ],
        },
      }) &&
      __sbSendRtEvent({
        type: "response.create",
        response: {
          output_modalities: rtOutputModalities,
        },
      })
    );

  if (!responseCreated) {
    __sbResetRealtimeResponseState();
    __sbResolveRtWaiter({
      status: "error",
      text: "",
      errorMessage: "Live AI control channel is not ready.",
    });
  }

  return await responsePromise;
}

async function __sbSpeakWithPreferredVoice(text, preferred = "legacy", options = {}) {
  // In native realtime mode the model speaks via WebRTC audio — we must NOT also call a
  // TTS endpoint (that would be two voices). Only call __sbSpeakText when ElevenLabs is
  // selected, OR when falling back from a failed relay.
  const useExternalTts = __sbVoiceOutputPref === "elevenlabs";
  if (preferred === "realtime") __sbAppendRealtimeCostAssistantMessage(text);

  if (preferred === "realtime" && __sbRtControlReady() && !useExternalTts) {
    // Native realtime: send a relay event and let the model speak.
    await __sbRequestRealtimeReply(text, { relayMode: true, verbatim: !!options.verbatim });
    return true;
  }
  // External TTS voice (ElevenLabs) or non-realtime context.
  return await __sbSpeakText(text, { verbatim: !!options.verbatim });
}

function __sbCompleteVoiceTurn(options = {}) {
  const fromVoice = Boolean(options.fromVoice);
  if (!fromVoice) return;

  const voiceOutput = options.voiceOutput === "realtime" ? "realtime" : "legacy";
  const voiceTurnToken = Number.isInteger(options.voiceTurnToken) ? options.voiceTurnToken : null;
  if (voiceOutput === "realtime" && voiceTurnToken !== null && voiceTurnToken !== __sbRtTurnToken) {
    return;
  }

  __sbVoicePendingReply = false;
  if (__sbHeadphoneMode) {
    __sbSetHpBrainState("listening");
    if (voiceOutput === "legacy" && options.resumeLegacyMic) {
      void __sbStartRecording();
    }
  }
  if (voiceOutput === "realtime") {
    __sbCompleteRealtimeCostTurn({ keepOpen: __sbRtAwaitingDelegateResult });
  }
}

// ── Multi-intent voice chain ─────────────────────────────────────────────────

let __sbChainAbortToken = 0;

// Split one voice transcript into sequential task segments.
// Returns string[] — length 1 = no split (zero overhead on common path).
function __sbSplitAndCorrectTranscript(transcript) {
  const raw = transcript.trim();

  // Hard split: sentence terminals and em/en dashes (always a new clause)
  // Soft split: transition/pivot phrases that introduce a new independent command
  const HARD_SPLIT = /(?<=[?!])\s+|[—–]\s*/;
  const SOFT_PIVOT = /[,.]?\s+(?=(?:okay|alright|right|now|also|while (?:we're|you're) at it|on top of that|while (?:we're|you're) at it)\b)/i;

  let parts = [];
  for (const hardPart of raw.split(HARD_SPLIT)) {
    for (const softPart of hardPart.split(SOFT_PIVOT)) {
      parts.push(softPart.trim());
    }
  }

  const FILLER_ONLY = /^(?:okay|ok|alright|right|hmm|ah|oh|uh|um|sure|cool|great|nice|perfect|sounds good|that'?s?\s+too\s+loud)[.!,]?$/i;
  parts = parts.filter(p => p.length > 4 && !FILLER_ONLY.test(p));

  if (parts.length <= 1) return [raw];

  return __sbApplyCorrectionOverrides(parts);
}

// Collapse "do X | no wait, do Y" correction pairs into just "do Y".
function __sbApplyCorrectionOverrides(segments) {
  const CORRECTION_PREFIX = /^(?:no[,.]?\s+|nope[,.]?\s+|wait[,.]?\s+|actually[,.]?\s+|scratch that[,.]?\s+|never mind[,.]?\s+|forget (?:that|it)[,.]?\s+|fuck that[,.]?\s+|no wait[,.]?\s+|no fuck that[,.]?\s+|too loud[,.]?\s*)/i;

  const result = [];
  let i = 0;
  while (i < segments.length) {
    const curr = segments[i];
    const next = i + 1 < segments.length ? segments[i + 1] : null;

    if (next && CORRECTION_PREFIX.test(next)) {
      const corrected = next.replace(CORRECTION_PREFIX, "").trim();
      // Volume-on-volume correction: skip curr, use corrected value
      if (__sbIsVolumeCommand(curr) && (corrected.length === 0 || __sbIsVolumeCommand(corrected))) {
        if (corrected.length > 0) result.push(corrected);
        i += 2;
        continue;
      }
      // Number-only correction of a volume command (e.g. "make it 50")
      if (__sbIsVolumeCommand(curr) && /\b\d+\b/.test(corrected)) {
        const numMatch = corrected.match(/\b(\d+)\b/);
        if (numMatch) {
          result.push(`set volume to ${numMatch[1]}%`);
          i += 2;
          continue;
        }
      }
    }

    result.push(curr);
    i++;
  }
  return result.length ? result : segments;
}

// Sequential executor for a multi-intent segment array.
async function __sbHandleMultiIntentChain(segments, turnToken) {
  const myToken = ++__sbChainAbortToken;
  __sbRtCostKeepOpen = true;
  __sbPatchRealtimeCostTurn({ routeIntent: "multi" });

  try {
    for (let i = 0; i < segments.length; i++) {
      if (__sbChainAbortToken !== myToken || __sbRtTurnToken !== turnToken) return;

      // Hold the pending-reply lock across the whole chain to block concurrent turns.
      __sbVoicePendingReply = true;

      if (i === 0) void __sbSpeakWithPreferredVoice("On it.", "realtime");

      await __sbHandleInlineRealtimeTurn(segments[i], turnToken);

      // If this segment launched an agent, wait for it to finish before the next.
      if (__sbRtAwaitingDelegateResult) {
        await __sbWaitForChainDelegate(myToken, turnToken);
      }

      if (__sbChainAbortToken !== myToken || __sbRtTurnToken !== turnToken) return;

      if (i < segments.length - 1) {
        __sbVoicePendingReply = true;
        await new Promise(r => setTimeout(r, 400));
      }
    }

    __sbVoicePendingReply = false;
    if (__sbHeadphoneMode) __sbSetHpBrainState("listening");
  } finally {
    __sbRtCostKeepOpen = false;
    __sbCompleteRealtimeCostTurn({ force: true });
  }
}

// Poll until the background agent signals completion or we time out / abort.
function __sbWaitForChainDelegate(myToken, turnToken) {
  return new Promise(resolve => {
    const MAX_MS = 45000;
    const started = Date.now();
    const tick = () => {
      if (__sbChainAbortToken !== myToken || __sbRtTurnToken !== turnToken
          || !__sbRtAwaitingDelegateResult || Date.now() - started > MAX_MS) {
        resolve();
      } else {
        setTimeout(tick, 250);
      }
    };
    setTimeout(tick, 250);
  });
}

function __sbScheduleVoiceTurnProcessing(transcript, onReady) {
  const finalTranscript = String(transcript || "").trim();
  if (!finalTranscript || typeof onReady !== "function") return;

  __sbLastFinalTranscript = finalTranscript;
  if (__sbVoiceSilenceTimer) clearTimeout(__sbVoiceSilenceTimer);

  __sbVoiceSilenceTimer = setTimeout(() => {
    __sbVoiceSilenceTimer = null;
    const toProcess = __sbLastFinalTranscript;
    __sbLastFinalTranscript = null;
    if (!toProcess || __sbVoicePendingReply) return;

    if (__sbHeadphoneMode) {
      __sbSetHpBrainState("captured");
    }

    __sbVoicePendingReply = true;
    onReady(toProcess);
  }, 950);
}

async function __sbHandleInlineRealtimeTurn(transcript, turnToken) {
  const routing = __sbResolvePromptRouting(transcript);
  const promptText = String(routing.promptText || "").trim();
  if (!promptText) {
    __sbCompleteVoiceTurn({ fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    return;
  }
  __sbPatchRealtimeCostTurn({
    routeIntent: routing.intent,
    routeMode: routing.forcedMode,
    connector: routing.connectorHint,
  });

  // X (Twitter) status — answer from the backend and speak it, BEFORE any delegate
  // classification (which would otherwise open X in a tab).
  if (__sbIsXLastTweetRequest(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "x_status" });
    await __sbHandleXLastTweet(promptText, { fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    return;
  }
  if (__sbIsXStatusRequest(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "x_status" });
    await __sbHandleXStatus(promptText, { fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    return;
  }

  // Volume — handle directly (instant, no premium agent). "increase/louder" defaults to +20%.
  if (__sbIsVolumeCommand(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "volume" });
    const handled = await __sbHandleVolumeCommand(promptText, { fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    if (handled) return;
  }

  // Cross-tab awareness & control (before delegate classification, which would mis-route).
  if (__sbIsCloseTabsCommand(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "tabs" });
    await __sbHandleCloseTabs(promptText, { fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    return;
  }
  if (__sbIsTabsQuery(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "tabs" });
    await __sbHandleTabsQuery(promptText, { fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
    return;
  }

  if (["agent", "web", "record", "page"].includes(routing.intent)) {
    await __sbProcessPrompt(promptText, {
      fromVoice: true,
      voiceOutput: "realtime",
      voiceTurnToken: turnToken,
    });
    return;
  }

  const shouldForceDelegate = await __sbShouldForceVoiceDelegate(routing);
  if (shouldForceDelegate) {
    __sbPatchRealtimeCostTurn({ routeIntent: "agent" });
    await __sbProcessPrompt(promptText, {
      fromVoice: true,
      voiceOutput: "realtime",
      voiceTurnToken: turnToken,
      forceIntent: "agent",
    });
    return;
  }

  // General conversation — route through the SAME smart text pipeline legacy voice uses
  // (chat-about-notes, with the full page DOM context + user notes + selected text), then
  // speak the answer in the realtime voice. The bare realtime model couldn't see the page
  // properly and felt dumb; this gives realtime legacy's brain + realtime's voice.
  await __sbProcessPrompt(promptText, {
    fromVoice: true,
    voiceOutput: "realtime",
    voiceTurnToken: turnToken,
    forceIntent: "chat",
  });
}

function __sbCleanupRealtimeVoice(options = {}) {
  const reason = String(options.reason || "client_cleanup");
  const usageSessionId = __sbRtUsageSessionId;
  __sbCompleteRealtimeCostTurn({ force: true });
  if (__sbUseOffscreenRt) {
    __sbUseOffscreenRt = false;
    chrome.runtime.sendMessage({ action: "stopOffscreenRealtime" }, () => { void chrome.runtime.lastError; });
  }
  try { chrome.runtime.sendMessage({ action: "rtVoiceRelease" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
  __sbClearRealtimeConnectHint();
  __sbResolveRtWaiter({ status: "cancelled", text: "", errorMessage: "" });
  __sbVoicePendingReply = false;
  try { __sbRtDataChannel?.close(); } catch (_) {}
  try { __sbRtPeerConnection?.close(); } catch (_) {}
  __sbRtMic?.getTracks().forEach(t => t.stop());
  if (__sbRtRemoteAudio) {
    try { __sbRtRemoteAudio.pause(); } catch (_) {}
    __sbRtRemoteAudio.srcObject = null;
    __sbRtRemoteAudio.remove();
  }
  __sbRtPeerConnection = null;
  __sbRtDataChannel = null;
  __sbRtMic = null;
  __sbRtRemoteAudio = null;
  __sbRtUserTranscript = "";
  __sbRtSessionReady = false;
  __sbRtInstructionsFingerprint = "";
  __sbResetRealtimeResponseState();
  __sbRtAwaitingDelegateResult = false;
  if (usageSessionId) {
    void __sbEndRealtimeUsageSession(reason);
  } else {
    __sbResetRealtimeUsageState();
  }
  document.getElementById("__sb_brain_btn__")?.classList.remove("hp-realtime");
}

function __sbHandleRtEvent(ev) {
  if (ev.type === "session.created" || ev.type === "session.updated") {
    if (__sbRtSessionReady) {
      __sbSetVoiceStatusBadge("realtime", "Live AI");
      if (__sbHeadphoneMode) __sbSetHpBrainState("listening");
    }
    return;
  }
  if (ev.type === "input_audio_buffer.speech_started") {
    // The realtime VAD heard the user start talking → INTERRUPT whatever Braino is saying.
    // This is the whole point of the realtime mechanism, and it must work the SAME for both
    // voices: cancel the realtime model's audio and stop ElevenLabs/browser playback.
    // Without this, provider audio keeps playing and feels "not realtime".
    if (__sbHasActiveRealtimeResponse()) {
      __sbVoicePendingReply = false;
      __sbInterruptRealtimeResponse();
    }
    __sbStopSpeech(); // stop ElevenLabs / browser TTS playback so the user can barge in
    __sbRtUserTranscript = "";
    if (__sbHeadphoneMode) __sbSetHpBrainState("captured");
    return;
  }
  if (ev.type === "input_audio_buffer.speech_stopped") {
    if (__sbHeadphoneMode) __sbSetHpBrainState("captured");
    return;
  }
  if (ev.type === "conversation.item.input_audio_transcription.delta") {
    if (typeof ev.delta === "string" && ev.delta) {
      __sbRtUserTranscript += ev.delta;
    }
    return;
  }
  if (ev.type === "conversation.item.input_audio_transcription.completed") {
    const transcript = String(ev.transcript || __sbRtUserTranscript || "").trim();
    const transcriptionUsage = ev.usage || ev.item?.usage || ev.response?.usage || {};
    __sbRtUserTranscript = "";
    if (!transcript) return;

    // Guard against transcription hallucinations on loud music / background noise / silence.
    // The model would otherwise "hear" junk and answer with gibberish. Skip it; if it keeps
    // happening, gently ask the user to repeat (rate-limited so we don't nag).
    if (__sbIsJunkTranscript(transcript)) {
      const now = Date.now();
      if (now - __sbLastRepeatPromptAt > 8000 && !__sbHasActiveRealtimeResponse()) {
        __sbLastRepeatPromptAt = now;
        void __sbSpeakWithPreferredVoice("Sorry, I didn't catch that — could you say it again?", "realtime");
      }
      return;
    }

    __sbScheduleVoiceTurnProcessing(transcript, (toProcess) => {
      const turnToken = ++__sbRtTurnToken;
      __sbBeginRealtimeCostTurn(toProcess, turnToken, transcriptionUsage);
      const segments = __sbSplitAndCorrectTranscript(toProcess);
      if (segments.length > 1) {
        void __sbHandleMultiIntentChain(segments, turnToken);
      } else {
        void __sbHandleInlineRealtimeTurn(toProcess, turnToken);
      }
    });
    return;
  }
  if (ev.type === "response.created") {
    __sbRtAssistantTranscript = "";
    if (__sbHeadphoneMode) __sbSetHpBrainState("captured");
    return;
  }
  if (ev.type === "response.output_audio_transcript.delta" || ev.type === "response.output_text.delta") {
    if (typeof ev.delta === "string" && ev.delta) {
      __sbRtAssistantTranscript += ev.delta;
    }
    if (__sbHeadphoneMode) __sbSetHpBrainState("speaking");
    return;
  }
  if (ev.type === "response.done") {
    const finalText = String(ev.response ? __sbExtractRtResponseText(ev.response) : "").trim();
    const transcript = (__sbRtAssistantTranscript || finalText || "").trim();
    const usage = ev.response?.usage || ev.usage || {};
    if (transcript) __sbAppendRealtimeCostAssistantMessage(transcript);
    if (usage && typeof usage === "object") __sbRecordRealtimeCostUsage(usage);
    __sbResetRealtimeResponseState();
    __sbResolveRtWaiter({
      status: "done",
      text: transcript,
      errorMessage: "",
    });
    if (__sbHeadphoneMode) __sbSetHpBrainState("listening");
    return;
  }
  if (ev.type === "response.cancelled") {
    __sbResetRealtimeResponseState();
    __sbResolveRtWaiter({ status: "cancelled", text: "", errorMessage: "" });
    if (__sbHeadphoneMode) __sbSetHpBrainState("listening");
    return;
  }
  if (ev.type === "error") {
    const message = ev.error?.message || "Realtime error";
    if (!__sbHasActiveRealtimeResponse() && __sbIsBenignRealtimeControlError(message)) {
      return;
    }
    __sbVoicePendingReply = false;
    __sbResetRealtimeResponseState();
    __sbResolveRtWaiter({ status: "error", text: "", errorMessage: message });
    __sbSetVoiceStatusBadge("error", message);
    __sbShowVoiceError(message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function __sbToggleHeadphoneMode() {
  if (__sbHeadphoneMode) {
    __sbExitHeadphoneMode();
  } else {
    __sbEnterHeadphoneMode();
  }
}

// ── One-time mic permission modal (same tab) ─────────────────────────────────
// Hosts the extension-origin permission page in an iframe so getUserMedia there grants the
// EXTENSION the microphone (which the invisible offscreen doc then inherits → global voice).
function __sbShowMicPermissionModal() {
  return new Promise((resolve) => {
    try {
      if (document.getElementById("__sb_mic_perm__")) { resolve(true); return; }
      const overlay = document.createElement("div");
      overlay.id = "__sb_mic_perm__";
      overlay.style.cssText = [
        "position:fixed", "inset:0", "z-index:2147483647",
        "background:rgba(8,5,4,0.55)", "backdrop-filter:blur(3px)",
        "display:flex", "align-items:center", "justify-content:center",
      ].join(";");
      const frame = document.createElement("iframe");
      frame.src = chrome.runtime.getURL("mic-permission.html");
      frame.allow = "microphone"; // delegate mic to the extension-origin iframe
      frame.style.cssText = [
        "width:380px", "height:300px", "border:0", "border-radius:18px",
        "box-shadow:0 20px 60px rgba(0,0,0,0.5)", "background:#160b09",
      ].join(";");
      overlay.appendChild(frame);
      (document.body || document.documentElement).appendChild(overlay);

      // Wait for the iframe to confirm it rendered. If the page's CSP blocked the
      // extension iframe, no "ready" arrives → remove the (blank) overlay and report
      // not-shown so the background falls back to a popup window.
      let settled = false;
      const onMsg = (e) => {
        if (e?.data?.__sbMicPerm === "ready") {
          if (settled) return; settled = true;
          window.removeEventListener("message", onMsg);
          resolve(true);
        }
      };
      window.addEventListener("message", onMsg);
      setTimeout(() => {
        if (settled) return; settled = true;
        window.removeEventListener("message", onMsg);
        __sbHideMicPermissionModal();
        resolve(false);
      }, 1300);
    } catch (_) {
      resolve(false);
    }
  });
}

function __sbHideMicPermissionModal() {
  document.getElementById("__sb_mic_perm__")?.remove();
}

// ── Voice presence model ─────────────────────────────────────────────────────
// `sbVoiceModeOn` (storage) = "the user turned voice on; Braino should be live on
// whatever tab is focused." Two ways the session can live:
//   • GLOBAL offscreen session (sbRtSessionActive=true): truly follows; switching
//     tabs is an instant visual attach with no reconnect.
//   • IN-TAB session (offscreen unavailable): bound to one tab, so we MIGRATE it —
//     tear down on the tab losing focus, start fresh on the tab gaining focus.
// Either way, the focused tab shows the blue presence and the unfocused tab goes
// back to idle. `__sbEnsureVoicePresence`/`__sbReleaseVoicePresence` are the single
// entry points; they're driven by visibilitychange, startup, storage.onChanged,
// and background attach/detach messages — so it converges no matter what races.

// Called when THIS tab becomes the focused tab. Brings voice here.
function __sbEnsureVoicePresence() {
  if (!__sbOwnsInlineUi()) return;
  if (__sbHeadphoneMode) return; // already present here
  __sbStorageGet(["sbVoiceModeOn", "sbRtSessionActive"]).then(({ sbVoiceModeOn, sbRtSessionActive }) => {
    if (!sbVoiceModeOn || !__sbOwnsInlineUi() || __sbHeadphoneMode) return;
    if (document.visibilityState !== "visible") return; // only the focused tab takes over
    if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
    if (sbRtSessionActive) {
      __sbAttachVoiceVisual(); // global offscreen session — instant, no reconnect
    } else {
      __sbEnterHeadphoneMode({ keepFlag: true }); // start an in-tab session on this tab
    }
  });
}

// Called when THIS tab loses focus. Hands voice off to whatever tab the user moved to.
function __sbReleaseVoicePresence() {
  if (!__sbHeadphoneMode) return;
  if (__sbUseOffscreenRt) {
    __sbDetachVoiceVisual(); // global session keeps running; just drop the local halo
  } else {
    // In-tab session is bound to this tab and can't follow — tear it down so this tab
    // stops listening/speaking. Keep sbVoiceModeOn so the next focused tab starts fresh.
    __sbCleanupRealtimeVoice({ reason: "tab_blur_migrate" });
    __sbDetachVoiceVisual();
    __sbStopSpeech();
  }
}

function __sbAttachVoiceVisual() {
  if (!__sbOwnsInlineUi()) return;
  const brain = document.getElementById("__sb_brain_btn__");
  if (brain && brain.style.display === "none") { brain.style.display = ""; __sbBrainVisible = true; }
  __sbHeadphoneMode = true;
  __sbVoiceOnlyMode = true;
  __sbUseOffscreenRt = true;
  __sbRtSessionReady = true;
  document.getElementById("__sb_rec_btn__")?.classList.add("active");
  document.getElementById("__sb_card_voice_mode_btn__")?.classList.add("active");
  document.getElementById("__sb_brain_btn__")?.classList.add("hp-realtime");
  __sbSetVoiceStatusBadge("realtime", "Live AI");
  __sbSetHpBrainState("listening"); // blue halo
  __sbSyncIdleState();              // strips sb-brain-idle now that hp-listening is on
  if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: true });
  void __sbSyncRealtimeVoiceInstructions(); // teach the session what page we're now on
}

// Visual-only teardown — does NOT stop any session. Resets local flags + halo to idle.
function __sbDetachVoiceVisual() {
  __sbHeadphoneMode = false;
  __sbVoiceOnlyMode = false;
  __sbRtSessionReady = false;
  __sbVoicePendingReply = false;
  __sbRtHandlingConversationTurn = false;
  document.getElementById("__sb_rec_btn__")?.classList.remove("active");
  document.getElementById("__sb_card_voice_mode_btn__")?.classList.remove("active");
  __sbSetHpBrainState("");
  __sbSetVoiceStatusBadge(null);
  __sbSyncIdleState(); // back to the floating idle animation
}

function __sbEnterHeadphoneMode(options = {}) {
  __sbHeadphoneMode = true;
  __sbVoiceOnlyMode = true;
  // Mark voice mode ON globally so every tab knows Braino should follow the user.
  if (__sbContextOk()) chrome.storage.local.set({ sbVoiceModeOn: true, sbBrainDocked: true });

  __sbToggleInput(false);
  __sbCollapseCard();

  const brain = document.getElementById("__sb_brain_btn__");
  if (brain && brain.style.display === "none") { brain.style.display = ""; __sbBrainVisible = true; }
  document.getElementById("__sb_rec_btn__")?.classList.add("active");
  document.getElementById("__sb_card_voice_mode_btn__")?.classList.add("active");

  // If an offscreen session is already live, attach instantly — no WebRTC setup, zero delay.
  __sbStorageGet(["sbRtSessionActive", "brainoVoicePref", "authToken", "sbOffscreenRtBroken"]).then((stored) => {
    __sbApplyStoredVoiceOutputPref(stored.brainoVoicePref);

    if (stored.sbRtSessionActive) {
      __sbUseOffscreenRt = true;
      __sbRtSessionReady = true;
      document.getElementById("__sb_brain_btn__")?.classList.add("hp-realtime");
      __sbSetVoiceStatusBadge("realtime", "Live AI");
      __sbSetHpBrainState("listening");
      __sbSyncIdleState();
      void __sbSyncRealtimeVoiceInstructions();
      return;
    }

    __sbSetHpBrainState("connecting");
    __sbSetVoiceStatusBadge("connecting", "Waking up…");

    const authToken = stored.authToken || null;
    if (!authToken) { void __sbStartRealtimeVoice(); return; }

    // If offscreen mic proved unavailable before, skip it — go straight to the in-tab
    // session (avoids re-closing/recreating the offscreen doc on every tab switch).
    if (stored.sbOffscreenRtBroken) { void __sbStartRealtimeVoice(); return; }

    const bootInstructions = __sbBuildRealtimeSessionUpdate(__sbBuildRealtimeBootInstructions());
    chrome.runtime.sendMessage(
      { action: "startOffscreenRealtime", authToken, bootInstructions },
      (res) => {
        // Only the transport-level failure is handled here. Whether the offscreen session
        // actually came up is signalled asynchronously: success → sbRtSessionReady (which
        // sets __sbUseOffscreenRt), failure/denied → sbRtSessionFailed. So we do NOT flip
        // __sbUseOffscreenRt here (that race could mis-route events during a fallback).
        if (chrome.runtime.lastError) {
          void __sbHandleRealtimeConnectFailure(chrome.runtime.lastError.message || "Live AI transport failed.");
        }
      }
    );
  });
}

function __sbExitHeadphoneMode() {
  __sbHeadphoneMode = false;
  __sbVoiceOnlyMode = false;
  __sbVoicePendingReply = false;
  // User explicitly turned voice OFF — clear the global flag so no tab re-arms it.
  if (__sbContextOk()) chrome.storage.local.set({ sbVoiceModeOn: false });

  if (__sbVoiceSilenceTimer) { clearTimeout(__sbVoiceSilenceTimer); __sbVoiceSilenceTimer = null; }
  __sbLastFinalTranscript = null;
  __sbRtTurnToken = 0;
  __sbRtUserTranscript = "";
  __sbRtAwaitingDelegateResult = false;
  __sbRtRelayingAppMessage = false;
  __sbRtHandlingConversationTurn = false;

  if (__sbIsRecording) __sbStopRecording({ silent: true });
  __sbCleanupRealtimeVoice({ reason: "client_exit" });
  __sbStopSpeech();

  __sbSetHpBrainState("");
  __sbSetVoiceStatusBadge(null);

  document.getElementById("__sb_rec_btn__")?.classList.remove("active");
  document.getElementById("__sb_card_voice_mode_btn__")?.classList.remove("active");
}

// state: "connecting" | "listening" | "captured" | "speaking" | ""
function __sbSetHpBrainState(state) {
  const brain = document.getElementById("__sb_brain_btn__");
  if (!brain) return;
  brain.classList.remove("hp-connecting", "hp-listening", "hp-captured", "hp-speaking", "recording");
  if (state) brain.classList.add(`hp-${state}`);
}

function __sbSetVoiceStatusBadge(state, label) {
  const badge = document.getElementById("__sb_voice_status_badge__");
  if (!badge) return;
  if (!state) { badge.removeAttribute("data-s"); badge.textContent = ""; badge.title = ""; return; }
  badge.setAttribute("data-s", state);
  badge.textContent = label || state;
  badge.title = label || state;
}

function __sbShowVoiceError(msg) {
  const pill = document.getElementById("__sb_voice_error_pill__");
  if (!pill) return;
  pill.textContent = msg;
  pill.classList.add("visible");
  setTimeout(() => pill.classList.remove("visible"), 4500);
}

// ────────────────────────────────────────────────────────────────────────────

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
    if (__sbHeadphoneMode) {
      __sbSetHpBrainState("listening");
    }
    return;
  }

  if (msg.event === "transcript") {
    const transcript = String(msg.text || "").trim();
    if (!transcript) return;

    if (!msg.isFinal) {
      // Interim — user still speaking, cancel any pending final processing
      if (__sbVoiceSilenceTimer) {
        clearTimeout(__sbVoiceSilenceTimer);
        __sbVoiceSilenceTimer = null;
        __sbLastFinalTranscript = null;
      }
      return;
    }

    __sbScheduleVoiceTurnProcessing(transcript, (toProcess) => {
      __sbStopRecording({ silent: true });
      if (input) input.value = "";
      if (!__sbVoiceOnlyMode) __sbShowBubble("Thinking…", false, { tone: "status", title: "Voice" });
      void __sbProcessPrompt(toProcess, { fromVoice: true });
    });
    return;
  }

  if (msg.event === "error") {
    __sbVoicePendingReply = false;
    if (__sbVoiceSilenceTimer) { clearTimeout(__sbVoiceSilenceTimer); __sbVoiceSilenceTimer = null; }
    __sbLastFinalTranscript = null;
    __sbStopRecording({ silent: true });
    const errorText = msg.error === "not-allowed"
      ? "Microphone access is blocked. Allow mic access and try again."
      : `Voice error: ${msg.error || "unknown error"}`;
    if (__sbHeadphoneMode) {
      __sbSetHpBrainState("");
      __sbShowVoiceError(errorText);
      // Retry listening after a short delay
      setTimeout(() => {
        if (__sbHeadphoneMode) {
          __sbSetHpBrainState("listening");
          void __sbStartRecording();
        }
      }, 2000);
    } else {
      __sbShowBubble(errorText, true, { tone: "status", title: "Voice" });
    }
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
