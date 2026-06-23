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

async function __sbYouTubeEnsurePlayback() {
  const video = document.querySelector("video");
  if (!video) return { error: "No YouTube video player was found." };
  if (!video.paused && !video.ended) {
    return { success: true, playing: true, alreadyPlaying: true };
  }

  const selectors = [
    ".ytp-large-play-button",
    ".ytp-play-button",
    'button[aria-label*="Play"]',
    '[title="Play (k)"]',
  ];

  let clicked = false;
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (!__sbAdapterIsVisible(button)) continue;
    __sbAdapterClick(button);
    clicked = true;
    break;
  }

  if (clicked) {
    await __sbAdapterWait(550);
  }

  if (video.paused) {
    try {
      await video.play();
      await __sbAdapterWait(250);
    } catch (_) {}
  }

  return {
    success: true,
    playing: !video.paused,
    blocked: !!video.paused,
  };
}

function __sbGetSiteAdapterContext() {
  const url = window.location.href;
  const host = window.location.hostname;

  if (/youtube\.com$/.test(host)) {
    const video = document.querySelector("video");
    return {
      site: "youtube",
      url,
      title: document.title,
      isPlaying: Boolean(video && !video.paused && !video.ended),
    };
  }

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

  if (/calendar\.google\.com$/.test(host)) {
    return {
      site: "google-calendar",
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
  if (["calendar", "cal", "gcal", "google-calendar", "google_calendar", "googlecal"].includes(key)) return "google-calendar";
  return null;
}

function __sbGetConnectorSiteSuggestion(siteContext) {
  const site = siteContext?.site || "generic";
  if (site === "spotify") return "spotify";
  if (site === "google-drive") return "google-drive";
  if (site === "google-calendar") return "google-calendar";
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
  if (/\b(calendar|google calendar|gcal|schedule|reschedule|meeting|google meet)\b/.test(text) ||
      /\b(?:book|set up|create|add|cancel|delete|forward|invite|join|open|start)\b.*\b(?:call|meet|event)\b/.test(text)) return "google-calendar";
  if (/\bgmail\b|\bemail\b|\bmail\b/.test(text)) return "gmail";
  if (/\bspotify\b/.test(text)) return "spotify";
  return "auto";
}

function __sbGetConnectorLabel(connector, options = {}) {
  const key = __sbNormalizeConnectorName(connector) || "auto";
  const includeAutoHint = Boolean(options.includeAutoHint);
  if (key === "spotify") return "♪ Spotify";
  if (key === "google-drive") return "🗂 Drive";
  if (key === "google-calendar") return "📅 Calendar";
  if (key === "gmail") return "✉ Gmail";
  if (includeAutoHint) {
    const suggestion = __sbGetConnectorSiteSuggestion(options.siteContext || __sbGetSiteAdapterContext());
    if (suggestion === "spotify") return "↗ Auto · Spotify";
    if (suggestion === "google-drive") return "↗ Auto · Drive";
    if (suggestion === "google-calendar") return "↗ Auto · Calendar";
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
  if (key === "google-calendar") {
    return /\b(schedule|book|set up|create|add|reschedule|move|postpone|cancel|delete|remove|forward|invite|show|list|open|join|start|calendar|meeting|meet|call|event)\b/.test(text);
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

  if (msg.action === "buildElementMap") {
    const map = window.BrainoElementMap?.buildElementMap(document) || {
      url: window.location.href,
      title: document.title || "",
      scroll: { x: window.scrollX || 0, y: window.scrollY || 0, maxX: 0, maxY: 0, atTop: true, atBottom: true },
      elements: [],
    };
    const serialized = window.BrainoElementMap?.serializeElementMap
      ? window.BrainoElementMap.serializeElementMap(map, { keywords: msg.keywords || "", cap: msg.cap || 120 })
      : "";
    sendResponse({ map, serialized });
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
        if (msg.type === "youtubeEnsurePlayback") {
          sendResponse(await __sbYouTubeEnsurePlayback());
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
    const { type, selector, targetText, targetTag, text, url, direction, amount, index } = msg;

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

    async function typeIntoContentEditable(target, value) {
      target.focus();
      target.click();

      if (normalizeText(target.innerText || target.textContent)) {
        clearContentEditable(target);
      }

      dispatchBeforeInputEvent(target, "insertText", value);
      const inserted = document.execCommand("insertText", false, value);
      if (inserted) {
        dispatchInputEvent(target, "insertText", value);
        await new Promise(r => setTimeout(r, 80));
        if (normalizeText(target.innerText || target.textContent)) return;
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
        await new Promise(r => setTimeout(r, 80));
      }

      if (!normalizeText(target.innerText || target.textContent)) {
        target.textContent = value;
        dispatchInputEvent(target, "insertText", value);
      }
    }

    function resolveIndexedElement() {
      if (!Number.isInteger(Number(index))) return null;
      return window.BrainoElementMap?.resolveElement(Number(index)) || null;
    }

    function dispatchSyntheticKey(target, key) {
      const keyCode = key === "Enter" ? 13 : key === "Tab" ? 9 : key.charCodeAt(0);
      target.dispatchEvent(new KeyboardEvent("keydown", { key, keyCode, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keypress", { key, keyCode, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key, keyCode, bubbles: true, cancelable: true }));
    }

    (async () => { try {
      if (type === "click") {
        let el = resolveIndexedElement();
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
        let el = resolveIndexedElement();
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
          await typeIntoContentEditable(el, text);
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
        if (msg.submit === true) {
          dispatchSyntheticKey(el, "Enter");
          const form = el.closest?.("form");
          if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
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
        let el = resolveIndexedElement();
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
        let el = resolveIndexedElement();
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
        let img = resolveIndexedElement();
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
const __SB_BRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="52" height="52"><defs><linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbb-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/><path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/><g id="sbb-arm-l" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><g id="sbb-arm-r" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#sbb-dark)"/><path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#sbb-dark)"/><path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-fill)"/><path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><g id="sbb-arm-l-fill" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="6" cy="63" r="5.5" fill="url(#sbb-fill)"/></g><g id="sbb-arm-r-fill" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="94" cy="63" r="5.5" fill="url(#sbb-fill)"/></g><g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g><g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g><g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g><g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/><g id="sbb-talk" style="display:none;transform-box:view-box;transform-origin:50px 62px"><ellipse cx="50" cy="62" rx="4" ry="3" fill="#6E211A"/><ellipse cx="50" cy="63" rx="2.3" ry="1.3" fill="#E8786E"/></g><g id="sbb-specs" style="display:none"><circle cx="38" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/><circle cx="62" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/><path d="M 47.2 48 L 52.8 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/><path d="M 28.8 46 Q 24 45 21 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/><path d="M 71.2 46 Q 76 45 79 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/></g></svg>`;


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

// Self-contained variants for the cinematic wakeup brain. The gradients get UNIQUE
// ids (sbcin-*) so the coral fill resolves from the SVG's own inline defs and never
// depends on a duplicated document-level #sbb-fill (the cause of the white brain).
const __SB_BRAIN_SVG_CIN = __SB_BRAIN_SVG
  .replaceAll("sbb-fill", "sbcin-fill").replaceAll("sbb-dark", "sbcin-dark").replaceAll("sbb-glow", "sbcin-glow");
const __SB_BRAIN_SVG_CIN_SLEEP = __SB_BRAIN_SVG_SLEEPING
  .replaceAll("sbb-fill", "sbcin-fill").replaceAll("sbb-dark", "sbcin-dark").replaceAll("sbb-glow", "sbcin-glow");

// ── Emotion SVG variants ──────────────────────────────────────────────────────
// All derived from __SB_BRAIN_SVG. Keep sbb-* IDs so idle CSS animations still work.

const __SB_BRAIN_SVG_HAPPY = __SB_BRAIN_SVG
  .replace(
    '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
    '<ellipse cx="28" cy="58" rx="3.8" ry="2.3" fill="#E14A48" opacity="0.45"/><ellipse cx="72" cy="58" rx="3.8" ry="2.3" fill="#E14A48" opacity="0.45"/>'
  )
  .replace(
    '<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M 42.5 60 Q 50 68 57.5 60" fill="none" stroke="#1B1713" stroke-width="2" stroke-linecap="round"/>'
  );

// Shared laugh-eyes mutation applied by __sbLaughBase
function __sbLaughBase(svg) {
  return svg
    .replace(
      '<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g>',
      '<g id="sbb-eye-l" style="transform-origin:38px 48px"><path d="M 32.5 49 Q 38 54.5 43.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/></g>'
    )
    .replace(
      '<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g>',
      '<g id="sbb-eye-r" style="transform-origin:62px 48px"><path d="M 56.5 49 Q 62 54.5 67.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/></g>'
    )
    .replace(
      '<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
      '<g id="sbb-pupil-l"></g>'
    )
    .replace(
      '<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
      '<g id="sbb-pupil-r"></g>'
    )
    .replace(
      '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
      '<ellipse cx="27" cy="57" rx="4" ry="2.5" fill="#E14A48" opacity="0.5"/><ellipse cx="73" cy="57" rx="4" ry="2.5" fill="#E14A48" opacity="0.5"/>'
    )
    .replace(
      '<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 42 59 Q 50 73.5 58 59 Q 50 62 42 59 Z" fill="#6E211A"/><path d="M 45.5 64.5 Q 50 70 54.5 64.5 Q 50 66.5 45.5 64.5 Z" fill="#E8786E"/><path d="M 43 60 Q 50 62.4 57 60" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'
    );
}

const __SB_BRAIN_SVG_LAUGHING = __sbLaughBase(__SB_BRAIN_SVG);

const __SB_BRAIN_SVG_TEARS = __sbLaughBase(__SB_BRAIN_SVG)
  .replace('</svg>', '<path d="M 30 50.5 C 33 54.5 33 57 30 58 C 27 57 27 54.5 30 50.5 Z" fill="#DFF4FF"/><path d="M 70 50.5 C 73 54.5 73 57 70 58 C 67 57 67 54.5 70 50.5 Z" fill="#DFF4FF"/></svg>');

const __SB_BRAIN_SVG_CELEBRATING = __sbLaughBase(__SB_BRAIN_SVG)
  // Arms raised — outline layer
  .replace(
    '<g id="sbb-arm-l" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>',
    '<g id="sbb-arm-l" style="transform-origin:22px 52px"><path d="M 22 52 Q 10 42 16 28" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>'
  )
  .replace(
    '<g id="sbb-arm-r" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>',
    '<g id="sbb-arm-r" style="transform-origin:78px 52px"><path d="M 78 52 Q 90 42 84 28" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>'
  )
  // Arms raised — fill layer
  .replace(
    '<g id="sbb-arm-l-fill" style="transform-origin:22px 52px"><path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="6" cy="63" r="5.5" fill="url(#sbb-fill)"/></g>',
    '<g id="sbb-arm-l-fill" style="transform-origin:22px 52px"><path d="M 22 52 Q 10 42 16 28" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="15" cy="26" r="5.5" fill="url(#sbb-fill)"/></g>'
  )
  .replace(
    '<g id="sbb-arm-r-fill" style="transform-origin:78px 52px"><path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="94" cy="63" r="5.5" fill="url(#sbb-fill)"/></g>',
    '<g id="sbb-arm-r-fill" style="transform-origin:78px 52px"><path d="M 78 52 Q 90 42 84 28" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><circle cx="85" cy="26" r="5.5" fill="url(#sbb-fill)"/></g>'
  )
  // Confetti dots
  .replace('</svg>', '<circle cx="12" cy="22" r="2.5" fill="#FFD700" opacity="0.9"/><circle cx="88" cy="20" r="2" fill="#FF69B4" opacity="0.9"/><circle cx="6" cy="44" r="2" fill="#7EC8E3" opacity="0.9"/><circle cx="94" cy="42" r="2.2" fill="#90EE90" opacity="0.9"/><circle cx="20" cy="10" r="1.8" fill="#FF8C42" opacity="0.9"/><circle cx="80" cy="10" r="1.8" fill="#E14A48" opacity="0.9"/></svg>');

const __SB_BRAIN_SVG_FOCUS = __SB_BRAIN_SVG
  .replace(
    '<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-l" style="transform-origin:38px 48px"><ellipse cx="38" cy="48.5" rx="6.4" ry="3.7" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-r" style="transform-origin:62px 48px"><ellipse cx="62" cy="48.5" rx="6.4" ry="3.7" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-l"><circle cx="38" cy="48.5" r="3" fill="#1B1713"/><circle cx="39" cy="47.5" r="0.8" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-r"><circle cx="62" cy="48.5" r="3" fill="#1B1713"/><circle cx="63" cy="47.5" r="0.8" fill="white"/></g>'
  )
  .replace(
    '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
    '<ellipse cx="28" cy="58" rx="3" ry="1.7" fill="#E14A48" opacity="0.16"/><ellipse cx="72" cy="58" rx="3" ry="1.7" fill="#E14A48" opacity="0.16"/>'
  )
  .replace(
    '<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M 45.5 62 Q 50 63.2 54.5 62" fill="none" stroke="#1B1713" stroke-width="1.9" stroke-linecap="round"/>'
  )
  .replace('</svg>', '<path d="M 31.5 45.6 Q 38 43.4 44.5 45.6" fill="none" stroke="url(#sbb-fill)" stroke-width="2.8" stroke-linecap="round"/><path d="M 55.5 45.6 Q 62 43.4 68.5 45.6" fill="none" stroke="url(#sbb-fill)" stroke-width="2.8" stroke-linecap="round"/></svg>');

const __SB_BRAIN_SVG_SHOCKED = __SB_BRAIN_SVG
  .replace(
    '<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-l" style="transform-origin:38px 48px"><circle cx="38" cy="47.4" r="7.8" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="48" r="6.5" fill="white"/></g>',
    '<g id="sbb-eye-r" style="transform-origin:62px 48px"><circle cx="62" cy="47.4" r="7.8" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-l"><circle cx="38" cy="47.6" r="2.5" fill="#1B1713"/><circle cx="39" cy="46.2" r="1" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-r"><circle cx="62" cy="47.6" r="2.5" fill="#1B1713"/><circle cx="63" cy="46.2" r="1" fill="white"/></g>'
  )
  .replace(
    '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
    '<ellipse cx="27" cy="58" rx="3.2" ry="1.8" fill="#E14A48" opacity="0.22"/><ellipse cx="73" cy="58" rx="3.2" ry="1.8" fill="#E14A48" opacity="0.22"/>'
  )
  .replace(
    '<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
    '<ellipse cx="50" cy="63" rx="2.7" ry="3.4" fill="#6E211A"/>'
  );

const __SB_BRAIN_SVG_SCARED = __SB_BRAIN_SVG
  .replace(
    '<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-l"><circle cx="39" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="39.8" cy="45.4" r="0.9" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-r"><circle cx="61" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="61.8" cy="45.4" r="0.9" fill="white"/></g>'
  )
  .replace(
    '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>',
    '<ellipse cx="27" cy="59" rx="3.2" ry="1.8" fill="#E14A48" opacity="0.18"/><ellipse cx="73" cy="59" rx="3.2" ry="1.8" fill="#E14A48" opacity="0.18"/>'
  )
  .replace(
    '<path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M 44 63 Q 47 60.5 50 62.6 Q 53 64.7 56 62.2" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>'
  )
  .replace('</svg>', '<path d="M 32 41.5 Q 37 40 43 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/><path d="M 68 41.5 Q 63 40 57 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/><path d="M 81 28 C 84 32 84 35 81 36 C 78 35 78 32 81 28 Z" fill="#CFEFFF"/></svg>');

// Scholar: round glasses, no cap, pupils looking toward center of screen (up-left)
const __SB_BRAIN_SVG_SCHOLAR = __SB_BRAIN_SVG
  // Pupils look toward center of screen — same shift as LISTENING
  .replace(
    '<g id="sbb-pupil-l"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-l"><circle cx="36.2" cy="46.5" r="3.2" fill="#1B1713"/><circle cx="37.2" cy="45.1" r="1.1" fill="white"/></g>'
  )
  .replace(
    '<g id="sbb-pupil-r"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g>',
    '<g id="sbb-pupil-r"><circle cx="60.2" cy="46.5" r="3.2" fill="#1B1713"/><circle cx="61.2" cy="45.1" r="1.1" fill="white"/></g>'
  )
  // Round glasses overlaid last so they sit on top of everything
  .replace('</svg>',
    '<circle cx="38" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.9"/>' +
    '<circle cx="62" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.9"/>' +
    '<path d="M 47.2 48 L 52.8 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>' +
    '<path d="M 28.8 46 Q 24 45 21 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>' +
    '<path d="M 71.2 46 Q 76 45 79 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>' +
    '</svg>'
  );

// ── Walker lane — Braino walks above the bar (exact design from braino-char.jsx) ──
const __SBWK_SHOE = `<path d="M 45 74 L 42.5 87" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><path d="M 45 74 L 42.5 87" fill="none" stroke="url(#sbb-fill)" stroke-width="5.5" stroke-linecap="round"/><path d="M 47.5 89 C 47.5 87 44.5 86.4 42 87.4 C 36 89.2 29.6 90.6 25.2 94.2 C 22.2 96.7 21.8 99.4 25 100.8 C 27 101.6 31 101.6 35 101.6 L 45.6 101.6 C 47.1 101.6 47.8 100.6 47.5 99.1 Z" fill="white" stroke="rgba(176,86,78,.42)" stroke-width="0.9" stroke-linejoin="round"/><path d="M 23 98.6 Q 21.2 101.2 25.6 101.5 L 45.6 101.5 Q 47.8 101.3 47.4 98.9 Q 34.5 100.1 23 98.6 Z" fill="#F6E2DC" stroke="rgba(176,86,78,.42)" stroke-width="0.8" stroke-linejoin="round"/><g fill="none" stroke="#C9544A" stroke-width="0.85" stroke-linecap="round" opacity="0.7"><path d="M 29.5 90 Q 36 88.5 43 89.2"/><path d="M 32 92.7 Q 37.5 91.7 43 92.2" opacity="0.6"/></g><ellipse cx="30" cy="92.4" rx="3" ry="1.4" fill="#fff" opacity="0.6" transform="rotate(-12 30 92.4)"/>`;
const __SBWK_BODY = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 68 80.5 60 79.5 50 79 C 40 79.5 32 80.5 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";

// Reaction faces for the throw — drawn on TOP of the normal face (which the tick hides
// while a reaction is active). Same head coordinate space as the brain emotion SVGs, so
// the eye/mouth shapes are reused verbatim. Solid colors only (no gradient refs).
const __SBWK_REACT = `<g id="__sbwk_react__" display="none">`
  + `<g id="__sbwk_rs__" display="none">`
    + `<circle cx="38" cy="47.4" r="7.8" fill="white"/><circle cx="62" cy="47.4" r="7.8" fill="white"/>`
    + `<circle cx="39" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="39.8" cy="45.4" r="0.9" fill="white"/>`
    + `<circle cx="61" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="61.8" cy="45.4" r="0.9" fill="white"/>`
    + `<path d="M 32 41.5 Q 37 40 43 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`
    + `<path d="M 68 41.5 Q 63 40 57 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`
    + `<ellipse cx="50" cy="64" rx="3" ry="3.8" fill="#6E211A"/>`
    + `<path id="__sbwk_sweat__" d="M 79 39 C 82 43 82 46 79 47 C 76 46 76 43 79 39 Z" fill="#CFEFFF"/>`
  + `</g>`
  + `<g id="__sbwk_rc__" display="none">`
    + `<path d="M 32.5 49 Q 38 54.5 43.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 56.5 49 Q 62 54.5 67.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 42 59 Q 50 73.5 58 59 Q 50 62 42 59 Z" fill="#6E211A"/>`
    + `<path d="M 45.5 64.5 Q 50 70 54.5 64.5 Q 50 66.5 45.5 64.5 Z" fill="#E8786E"/>`
    + `<path d="M 43 60 Q 50 62.4 57 60" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`
    + `<g id="__sbwk_confetti__"><circle cx="12" cy="22" r="2.5" fill="#FFD700"/><circle cx="88" cy="20" r="2" fill="#FF69B4"/><circle cx="6" cy="44" r="2" fill="#7EC8E3"/><circle cx="94" cy="42" r="2.2" fill="#90EE90"/><circle cx="20" cy="10" r="1.8" fill="#FF8C42"/><circle cx="80" cy="10" r="1.8" fill="#E14A48"/></g>`
  + `</g>`
  + `<g id="__sbwk_rt__" display="none">`
    + `<path d="M 32.5 49 Q 38 54.5 43.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 56.5 49 Q 62 54.5 67.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 42 59 Q 50 73.5 58 59 Q 50 62 42 59 Z" fill="#6E211A"/>`
    + `<path d="M 45.5 64.5 Q 50 70 54.5 64.5 Q 50 66.5 45.5 64.5 Z" fill="#E8786E"/>`
    + `<path d="M 43 60 Q 50 62.4 57 60" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`
    + `<path id="__sbwk_tear_l__" d="M 30 50.5 C 33 54.5 33 57 30 58 C 27 57 27 54.5 30 50.5 Z" fill="#DFF4FF"/>`
    + `<path id="__sbwk_tear_r__" d="M 70 50.5 C 73 54.5 73 57 70 58 C 67 57 67 54.5 70 50.5 Z" fill="#DFF4FF"/>`
  + `</g>`
  + `</g>`;
// Moonwalk legs — EXACT port of braino-char.jsx's profile+mirror Legs: BOTH feet are the
// same (un-mirrored) shoe, wrapped in one mirror so the toes point the same way; each foot
// pops onto its toe (heel rotate at 24,101) while the other slides. Hidden until moonwalking.
const __SBWK_MOONLEGS = `<g id="__sbwk_moonlegs__" display="none"><g transform="translate(100,0) scale(-1,1)">`
  + `<g id="__sbwk_mw_r__" transform="translate(12 0)"><g id="__sbwk_mw_rh__" transform="rotate(0 24 101)">${__SBWK_SHOE}</g></g>`
  + `<g id="__sbwk_mw_l__" transform="translate(0 0)"><g id="__sbwk_mw_lh__" transform="rotate(0 24 101)">${__SBWK_SHOE}</g></g>`
  + `</g></g>`;
// Self-contained: its OWN inline defs with unique ids (sbwk-*). The url(#sbb-*)
// refs below are rewritten to url(#sbwk-*) by the .replaceAll chain at the end, so
// the coral gradient resolves locally and never depends on a duplicated document id.
const __SBWK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -34 116 142" width="64" height="78" overflow="visible" style="display:block"><defs><linearGradient id="sbwk-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbwk-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbwk-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><g id="__sbwk_root__">${__SBWK_MOONLEGS}<g id="__sbwk_ll__">${__SBWK_SHOE}</g><g id="__sbwk_rl__"><g transform="translate(100,0) scale(-1,1)">${__SBWK_SHOE}</g></g><g id="__sbwk_la_bg__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><g id="__sbwk_ra_bg__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><path d="${__SBWK_BODY}" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><g id="__sbwk_la__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><g transform="translate(7 64)" stroke="rgba(176,86,78,.42)" stroke-width="0.7"><circle cx="5" cy="-1.4" r="3" fill="white"/><circle cx="0" cy="0.6" r="7" fill="white"/><g fill="none" stroke="#C9544A" stroke-width="0.8" stroke-linecap="round" opacity="0.55"><path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8"/><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2"/><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8"/></g><path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" stroke-width="1.1" stroke-linecap="round"/></g></g><g id="__sbwk_ra__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><g transform="translate(93 64)" stroke="rgba(176,86,78,.42)" stroke-width="0.7"><circle cx="-5" cy="-1.4" r="3" fill="white"/><circle cx="0" cy="0.6" r="7" fill="white"/><g fill="none" stroke="#C9544A" stroke-width="0.8" stroke-linecap="round" opacity="0.55"><path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8"/><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2"/><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8"/></g><path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" stroke-width="1.1" stroke-linecap="round"/></g></g><path d="${__SBWK_BODY}" fill="url(#sbb-fill)"/><path d="${__SBWK_BODY}" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 50.5 60 50 65" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/><g id="__sbwk_eye_l__"><circle cx="38" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_l__"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g></g><g id="__sbwk_eye_r__"><circle cx="62" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_r__"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g></g><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><g id="__sbwk_mouth__"><path id="__sbwk_smile__" d="M 43.5 60 Q 50 67.5 56.5 60" fill="none" stroke="#1B1713" stroke-width="1.9" stroke-linecap="round"/><g id="__sbwk_talk__" style="display:none"><ellipse id="__sbwk_te__" cx="50" cy="61.8" rx="3.5" ry="1.4" fill="#8A2F28"/><ellipse id="__sbwk_ti__" cx="50" cy="62.5" rx="2.2" ry="0.7" fill="#E8776E"/></g></g></g></svg>`
  .replaceAll("url(#sbb-fill)", "url(#sbwk-fill)")
  .replaceAll("url(#sbb-glow)", "url(#sbwk-glow)")
  .replaceAll("url(#sbb-dark)", "url(#sbwk-dark)")
  // Inject the reaction overlay on top of the face (after mouth-close, before root-close).
  .replace("</g></g></g></svg>", "</g></g>" + __SBWK_REACT + "</g></svg>")
  // Glasses overlay (hidden until Braino is asked to "wear specs") — same round-glasses
  // shape as the scholar look; eye coords (38/62, 48) match the brain.
  .replace("</g></svg>",
    '<g id="__sbwk_specs__" display="none">' +
    '<circle cx="38" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>' +
    '<circle cx="62" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>' +
    '<path d="M 47.2 48 L 52.8 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '<path d="M 28.8 46 Q 24 45 21 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '<path d="M 71.2 46 Q 76 45 79 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '</g></g></svg>')
  // MJ fedora (hidden until Braino moonwalks) — paths from braino-char.jsx, cocked -12°.
  .replace("</g></svg>",
    '<g id="__sbwk_fedora__" display="none" transform="rotate(-12 50 2)">' +
    '<path d="M 31 4 C 31 -17 39 -24 50 -24 C 61 -24 69 -17 69 4 Z" fill="#14110f" stroke="#000" stroke-width="0.6"/>' +
    '<path d="M 44 -22 Q 50 -18 56 -22" fill="none" stroke="#2c2723" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M 31 3 Q 50 9 69 3 L 69 -2 Q 50 4 31 -2 Z" fill="#000"/>' +
    '<ellipse cx="50" cy="4" rx="45" ry="8.5" fill="#14110f" stroke="#000" stroke-width="0.6"/>' +
    '<ellipse cx="50" cy="3" rx="32" ry="5" fill="#000" opacity="0.6"/>' +
    '<path d="M 37 -20 Q 35 -8 38 2" fill="none" stroke="#3a332e" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>' +
    '<path d="M 12 5 Q 50 12 88 5" fill="none" stroke="#3a332e" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>' +
    '</g></g></svg>');
// ── Walk lane state ────────────────────────────────────────────────────────────
let __sbWkRaf = null;
let __sbWkStart = null;
let __sbWkLast = null;
let __sbWalkTalking = false;
let __sbWkPosX = 24;
let __sbWkDirX = 1;
let __sbWkWalking = true;
let __sbWkWaving = false;
let __sbWkBusy = false;
let __sbWkAutoTimer = null;
let __sbWkEngaged = false;   // true while headphone mode has Braino's attention (stand still, no idle pacing)
let __sbWkWaveTimer = null;

// ── Throw / drag physics ────────────────────────────────────────────────────
// Braino can be grabbed and flung anywhere on screen. While thrown the tick stops
// driving his position; a physics loop tumbles him (legs flailing) until he settles,
// then he glides back to the bar and resumes walking. He is not amused.
let __sbWkThrowMode = false;   // physics/return owns the walker transform (tick hands off)
let __sbWkThrown = false;      // currently airborne or returning
let __sbWkThrowRaf = null;
let __sbThrowTX = 0;           // lane-local translate (px) from the walking anchor
let __sbThrowTY = 0;
let __sbThrowRot = 0;          // tumble rotation (deg)
let __sbWkSayTimer = null;
let __sbWkReaction = null;     // "scared" | "celebrate" | "tears" while thrown, else null
let __sbWkReactStart = 0;      // performance.now() when the reaction began
let __sbWkClimbing = false;    // true while the wake-up climb owns the rig
let __sbWkClimbRaf = null;
let __sbWkResumeFromX = null;  // start X for the next walk loop (so a climb hands off smoothly)
let __sbWkMoonwalking = false; // true while the moonwalk owns the rig
let __sbWkMoonRaf = null;
let __sbWkJumping = false;      // true while the jump-and-point owns the rig
let __sbWkJumpRaf = null;
let __sbGlassesOn = false;     // Braino is wearing his specs

// "Billie Jean" — exact track + the moonwalk moment (3:31) the user picked.
const __SB_BILLIE_JEAN_URI = "spotify:track:7J1uxwnxfQLu4APicE5Rnj";
const __SB_BILLIE_JEAN_START_MS = 211000;   // 3:31

// Put on / take off Braino's glasses (walker + docked brain).
function __sbSetGlasses(on) {
  __sbGlassesOn = !!on;
  const specs = document.querySelector("#__sbwk_walker__ #__sbwk_specs__");
  if (specs) specs.setAttribute("display", on ? "inline" : "none");
  document.getElementById("__sb_brain_btn__")?.classList.toggle("sb-glasses", !!on);
}

// Detect "wear/put on your specs/glasses" (or take them off) from a prompt.
function __sbGlassesIntent(text) {
  const t = String(text || "").toLowerCase();
  if (!/(glasses|spectacle|\bspecs?\b|scholar)/.test(t)) return null;
  if (/(take off|takeoff|remove|lose the|without|take.*off|no more|put away)/.test(t)) return "off";
  return "on";
}

function __sbMoonwalkIntent(text) {
  return /\bmoon\s?walk(ing|s|ed)?\b/i.test(String(text || ""));
}

// Best-effort: play "Billie Jean" from the moonwalk timestamp via the Spotify Web API.
// We have the exact track URI, so no search — just play + seek. Needs the user's Spotify
// connected + an active device; any failure is swallowed (Braino moonwalks regardless).
async function __sbSpotifyPlayBillieJean(positionMs = __SB_BILLIE_JEAN_START_MS) {
  try {
    const { authToken } = await __sbStorageGet(["authToken"]);
    if (!authToken) return { ok: false, reason: "signin" };
    const r = await fetch(`${__SB_API}/spotify-playback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: __SB_ANON_KEY, Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ action: "play", uris: [__SB_BILLIE_JEAN_URI], positionMs }),
    });
    return { ok: r.ok };
  } catch (_) { return { ok: false }; }
}

// ── Moonwalk ────────────────────────────────────────────────────────────────
// Faithful port of Braino Moonwalk.html: both feet point the SAME way (the mirrored
// #__sbwk_moonlegs__ replaces the normal legs), each pops onto its toe while the other
// slides, and the body GLIDES BACKWARD continuously (the classic illusion). MJ fedora on.
// ── Wait entertainment ───────────────────────────────────────────────────────
// Keeps the mascot lively while a background task (Delegate / Compare / web research) runs, so
// the user isn't staring at a frozen Braino. Uses only safe, self-clearing animations and yields
// to anything that already owns the rig (climb / moonwalk / throw) or to active speech.
let __sbWaitFunTimer = null;
let __sbWaitFunActive = false;
const __SB_WAIT_QUIPS = [
  "Still digging…", "On it…", "Comparing the contenders…", "Almost there…",
  "Reading the fine print…", "Cross-checking the sources…", "Hang tight…", "Doing my homework…",
];

function __sbStartWaitEntertainment() {
  // Only entertain when the walker is on-screen and we're not voice-frozen — in headphone /
  // voice-only mode the mascot is engaged (or hidden) and the user is listening, not watching.
  if (__sbWaitFunActive) return;
  if (__sbHeadphoneMode || __sbVoiceOnlyMode) return;
  if (!__sbInputOpen) return; // the walker only exists while the panel/bar is open
  __sbWaitFunActive = true;
  let beat = 0;
  const tick = () => {
    if (!__sbWaitFunActive) return;
    const rigBusy = __sbWkClimbing || __sbWkMoonwalking || __sbWkThrowMode || __sbIsSpeaking;
    if (!rigBusy) {
      __sbWkSay(__SB_WAIT_QUIPS[Math.floor(Math.random() * __SB_WAIT_QUIPS.length)]);
      if (beat % 3 === 2) __sbWkMoonwalk(2600); // occasional flourish
      else __sbWkTriggerWave();
    }
    beat += 1;
    __sbWaitFunTimer = setTimeout(tick, 4000 + Math.random() * 3000);
  };
  __sbWaitFunTimer = setTimeout(tick, 1200); // small delay so it doesn't clash with the thinking card
}

function __sbStopWaitEntertainment() {
  __sbWaitFunActive = false;
  if (__sbWaitFunTimer) { clearTimeout(__sbWaitFunTimer); __sbWaitFunTimer = null; }
}

function __sbWkMoonwalk(durationMs = 11000) {
  const lane = __sbEnsureWalker();
  lane.style.display = "block";
  const walker = document.getElementById("__sbwk_walker__");
  const root = walker && walker.querySelector("#__sbwk_root__");
  if (!walker || !root) return;

  if (__sbWkRaf) { cancelAnimationFrame(__sbWkRaf); __sbWkRaf = null; }
  if (__sbWkClimbRaf) { cancelAnimationFrame(__sbWkClimbRaf); __sbWkClimbRaf = null; }
  if (__sbWkThrowRaf) { cancelAnimationFrame(__sbWkThrowRaf); __sbWkThrowRaf = null; }
  clearTimeout(__sbWkAutoTimer);
  __sbWkMoonwalking = true; __sbWkThrowMode = true; __sbWkClimbing = false; __sbWkThrown = false; __sbWkReaction = null;

  const flip = document.getElementById("__sbwk_flip__");
  const moonlegs = root.querySelector("#__sbwk_moonlegs__");
  const mwR  = root.querySelector("#__sbwk_mw_r__");
  const mwRh = root.querySelector("#__sbwk_mw_rh__");
  const mwL  = root.querySelector("#__sbwk_mw_l__");
  const mwLh = root.querySelector("#__sbwk_mw_lh__");
  const pupL = root.querySelector("#__sbwk_pupil_l__");
  const pupR = root.querySelector("#__sbwk_pupil_r__");
  // Swap normal legs → moonwalk legs (both feet same direction).
  root.querySelector("#__sbwk_ll__")?.setAttribute("display", "none");
  root.querySelector("#__sbwk_rl__")?.setAttribute("display", "none");
  if (moonlegs) moonlegs.setAttribute("display", "inline");
  root.querySelector("#__sbwk_fedora__")?.setAttribute("display", "inline");
  if (flip) flip.style.transform = "scaleX(1)";          // body NOT mirrored — legs handle it
  if (pupL) pupL.setAttribute("transform", "translate(0.95 0)");  // eyes look the way he faces
  if (pupR) pupR.setAttribute("transform", "translate(0.95 0)");
  __sbWkSay("Hee-hee! 🕺");

  const W = 64;                                           // walker width
  const laneW = lane.clientWidth || 320;
  const wrap = laneW + W;                                 // glide one full pass then wrap
  const X0 = laneW - W;                                   // start at the right edge
  const SPEED = 80;                                       // px/s glide
  const start = performance.now();

  const step = (now) => {
    const t = (now - start) / 1000;
    // continuous BACKWARD (leftward) glide, wrapping cleanly off-screen
    const x = X0 - ((t * SPEED) % wrap);
    walker.style.transform = `translateX(${x}px)`;

    // design moonwalk params (s = t*4): one foot pops onto its toe (heel ~42°) while the
    // other slides; values fed to the same mirrored legs structure as braino-char.jsx.
    const ph = Math.sin(t * 4.0);
    const heelR = Math.max(0,  ph) * 42, heelL = Math.max(0, -ph) * 42;
    const slideR = Math.max(0, -ph) * 10, slideL = Math.max(0, ph) * 10;
    if (mwR)  mwR.setAttribute("transform",  `translate(${12 + slideR} 0)`);
    if (mwRh) mwRh.setAttribute("transform", `rotate(${-heelR} 24 101)`);
    if (mwL)  mwL.setAttribute("transform",  `translate(${slideL} 0)`);
    if (mwLh) mwLh.setAttribute("transform", `rotate(${-heelL} 24 101)`);

    const waddle = ph * 1.0;
    const walkBob = -Math.abs(ph) * 1.0 - 0.3;
    const breath = 1 + 0.014 * Math.sin(t * 1.7);
    const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
    root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);

    if (now - start < durationMs) __sbWkMoonRaf = requestAnimationFrame(step);
    else __sbWkEndMoonwalk(x);
  };
  __sbWkMoonRaf = requestAnimationFrame(step);
}

function __sbWkEndMoonwalk(xResume) {
  if (__sbWkMoonRaf) { cancelAnimationFrame(__sbWkMoonRaf); __sbWkMoonRaf = null; }
  const walker = document.getElementById("__sbwk_walker__");
  const root = walker && walker.querySelector("#__sbwk_root__");
  if (root) {
    root.querySelector("#__sbwk_fedora__")?.setAttribute("display", "none");
    root.querySelector("#__sbwk_moonlegs__")?.setAttribute("display", "none");
    root.querySelector("#__sbwk_ll__")?.setAttribute("display", "inline");
    root.querySelector("#__sbwk_rl__")?.setAttribute("display", "inline");
    root.querySelector("#__sbwk_pupil_l__")?.setAttribute("transform", "translate(0 0)");
    root.querySelector("#__sbwk_pupil_r__")?.setAttribute("transform", "translate(0 0)");
  }
  __sbWkMoonwalking = false; __sbWkThrowMode = false;
  if (__sbInputOpen) {
    // resume from roughly where he is (clamped into the lane)
    const laneW = (document.getElementById("__sb_walk_lane__")?.clientWidth) || 320;
    __sbWkResumeFromX = Math.max(6, Math.min(typeof xResume === "number" ? xResume : 24, laneW - 70));
    __sbStartWalkLoop();
  } else {
    if (walker) walker.style.transform = "";
    const lane = document.getElementById("__sb_walk_lane__");
    if (lane) lane.style.display = "none";
  }
}

// Trigger a single hand wave (used to acknowledge the user in headphone mode).
function __sbWkTriggerWave() {
  __sbWkWaving = true;
  clearTimeout(__sbWkWaveTimer);
  __sbWkWaveTimer = setTimeout(() => { __sbWkWaving = false; }, 1700);
}

function __sbWkApplyThrowTransform() {
  const walker = document.getElementById("__sbwk_walker__");
  if (!walker) return;
  walker.style.transform = `translate(${__sbThrowTX}px, ${__sbThrowTY}px) rotate(${__sbThrowRot}deg)`;
  const say = walker.querySelector("#__sbwk_say__");
  if (say) say.style.transform = `translateX(-50%) rotate(${-__sbThrowRot}deg)`; // keep speech upright
}

// Show a short speech bubble above Braino's head.
function __sbWkSay(text) {
  const walker = document.getElementById("__sbwk_walker__");
  if (!walker) return;
  let b = walker.querySelector("#__sbwk_say__");
  if (!b) { b = document.createElement("div"); b.id = "__sbwk_say__"; walker.appendChild(b); }
  b.textContent = text;
  requestAnimationFrame(() => b.classList.add("show"));
  clearTimeout(__sbWkSayTimer);
  __sbWkSayTimer = setTimeout(() => b.classList.remove("show"), 1500);
}

// Launch Braino with a flick velocity (px/s). Gravity + wall bounces, then return.
function __sbWkLaunch(vx, vy) {
  const lane = document.getElementById("__sb_walk_lane__");
  const walker = document.getElementById("__sbwk_walker__");
  if (!lane || !walker) return;
  __sbWkThrown = true; __sbWkThrowMode = true; __sbWkWalking = false; __sbWkEngaged = false;
  // Each throw rolls one of three reactions at random — the face + bubble match it.
  const reactions = [
    { key: "scared",    say: "AAAH!" },
    { key: "celebrate", say: "WHEEE!" },
    { key: "tears",     say: "HAHAHA!" },
  ];
  const pick = reactions[Math.floor(Math.random() * reactions.length)];
  __sbWkReaction = pick.key;
  __sbWkReactStart = performance.now();
  __sbWkSay(pick.say);

  const laneRect = lane.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight, ww = 64, wh = 78;
  const minTX = -laneRect.left + 4;
  const maxTX = (W - ww) - laneRect.left - 4;
  const minTY = -(laneRect.bottom - wh) + 8;   // toward top of screen
  const maxTY = (H - 6) - laneRect.bottom;      // toward bottom of screen (the "floor")

  let velX = Math.max(-2800, Math.min(2800, vx));
  let velY = Math.max(-2800, Math.min(2800, vy));
  if (Math.abs(velX) < 140 && Math.abs(velY) < 140) velY = -760; // a limp drop still tosses up
  const g = 2800, rest = 0.62;
  let rotV = velX / 90;        // spin scales with horizontal speed
  let last = performance.now(), start = last;

  if (__sbWkThrowRaf) cancelAnimationFrame(__sbWkThrowRaf);
  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000); last = now;
    velY += g * dt;
    __sbThrowTX += velX * dt;
    __sbThrowTY += velY * dt;
    __sbThrowRot += rotV * dt;
    if (__sbThrowTX < minTX) { __sbThrowTX = minTX; velX = -velX * rest; rotV = -rotV * rest; }
    if (__sbThrowTX > maxTX) { __sbThrowTX = maxTX; velX = -velX * rest; rotV = -rotV * rest; }
    if (__sbThrowTY < minTY) { __sbThrowTY = minTY; velY = -velY * rest; }
    if (__sbThrowTY > maxTY) { __sbThrowTY = maxTY; velY = -velY * rest; velX *= 0.72; rotV *= 0.6; }
    __sbWkApplyThrowTransform();
    const elapsed = (now - start) / 1000;
    const settled = Math.abs(velX) < 70 && Math.abs(velY) < 70 && (maxTY - __sbThrowTY) < 2;
    if (elapsed < 2.4 && !settled) __sbWkThrowRaf = requestAnimationFrame(step);
    else __sbWkReturnToBar();
  };
  __sbWkThrowRaf = requestAnimationFrame(step);
}

// Glide Braino back to the bar walking line, then hand control back to the walk loop.
function __sbWkReturnToBar() {
  if (__sbWkThrowRaf) { cancelAnimationFrame(__sbWkThrowRaf); __sbWkThrowRaf = null; }
  const lane = document.getElementById("__sb_walk_lane__");
  const laneW = lane ? lane.clientWidth : 320;
  const fromX = __sbThrowTX, fromY = __sbThrowTY, fromR = __sbThrowRot;
  const toX = Math.max(6, Math.min(__sbWkPosX, laneW - 70));
  const dur = 620, start = performance.now();
  const ease = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    __sbThrowTX = fromX + (toX - fromX) * e;
    __sbThrowTY = fromY + (0 - fromY) * e;
    __sbThrowRot = fromR + (0 - fromR) * e;
    __sbWkApplyThrowTransform();
    if (k < 1) { __sbWkThrowRaf = requestAnimationFrame(ease); }
    else {
      __sbWkThrowRaf = null;
      __sbWkPosX = toX; __sbThrowTX = toX; __sbThrowTY = 0; __sbThrowRot = 0;
      __sbWkThrown = false; __sbWkThrowMode = false; __sbWkWalking = true;
      // Hold the reaction face a beat after landing, then return to the walking smile.
      setTimeout(() => { __sbWkReaction = null; }, 500);
    }
  };
  __sbWkThrowRaf = requestAnimationFrame(ease);
}

// Reset any in-flight throw (called when the walker is torn down / restarted).
function __sbWkResetThrow() {
  if (__sbWkThrowRaf) { cancelAnimationFrame(__sbWkThrowRaf); __sbWkThrowRaf = null; }
  __sbWkThrown = false; __sbWkThrowMode = false; __sbWkReaction = null;
  __sbThrowTX = 0; __sbThrowTY = 0; __sbThrowRot = 0;
}

// Create the walker lane + mascot DOM (idempotent). Returns the lane element.
function __sbEnsureWalker() {
  let lane = document.getElementById("__sb_walk_lane__");
  if (lane) return lane;
  lane = document.createElement("div");
  lane.id = "__sb_walk_lane__";
  const walker = document.createElement("div");
  walker.id = "__sbwk_walker__";
  const flip = document.createElement("div");
  flip.id = "__sbwk_flip__";
  flip.innerHTML = __SBWK_SVG;
  const shadow = document.createElement("div");
  shadow.id = "__sbwk_shadow__";
  walker.appendChild(flip);
  walker.appendChild(shadow);

  // Grab + fling: drag Braino anywhere, release to throw. A plain tap just waves.
  let dragging = false, dragMoved = false, lastPX = 0, lastPY = 0, lastPT = 0, vX = 0, vY = 0;
  walker.addEventListener("pointerdown", (e) => {
    if (__sbWkThrown || __sbWkClimbing || __sbWkMoonwalking || __sbWkJumping) return;
    dragging = true; dragMoved = false;
    try { walker.setPointerCapture(e.pointerId); } catch (_) {}
    __sbWkThrowMode = true;            // tick stops driving the transform
    __sbThrowTX = __sbWkPosX; __sbThrowTY = 0; __sbThrowRot = 0;
    lastPX = e.clientX; lastPY = e.clientY; lastPT = performance.now();
    vX = 0; vY = 0;
    walker.style.cursor = "grabbing";
    e.preventDefault();
  });
  walker.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastPT) / 1000);
    const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    __sbThrowTX += dx; __sbThrowTY += dy;
    vX = dx / dt; vY = dy / dt;        // px/s — used as launch velocity
    lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
    __sbWkApplyThrowTransform();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    walker.style.cursor = "grab";
    try { walker.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!dragMoved) {
      // simple tap → wave hello
      __sbWkThrowMode = false; __sbThrowTX = 0; __sbThrowTY = 0; __sbThrowRot = 0;
      if (!__sbWkBusy) {
        __sbWkBusy = true; __sbWkWalking = false; __sbWkTriggerWave();
        setTimeout(() => { __sbWkBusy = false; __sbWkWalking = true; }, 2200);
      }
      return;
    }
    __sbWkLaunch(vX, vY);               // flung — tumble then return to the bar
  };
  walker.addEventListener("pointerup", endDrag);
  walker.addEventListener("pointercancel", endDrag);

  lane.appendChild(walker);
  (document.documentElement || document.body).appendChild(lane);
  return lane;
}

function __sbStartWalkLoop() {
  if (__sbWkClimbing || __sbWkMoonwalking || __sbWkJumping) return;   // climb/moonwalk/jump own the rig — don't fight it
  const lane = __sbEnsureWalker();
  lane.style.display = "block";
  __sbWkStart = __sbWkLast = performance.now();
  // Resume from the climb's perch point (center) when handed off, else default left.
  __sbWkPosX = (__sbWkResumeFromX != null ? __sbWkResumeFromX : 24);
  __sbWkResumeFromX = null;
  __sbWkDirX = 1;
  __sbWkWalking = true; __sbWkWaving = false; __sbWkBusy = false; __sbWalkTalking = false;
  __sbWkResetThrow();
  if (__sbGlassesOn) __sbSetGlasses(true);   // keep specs on across walker rebuilds
  clearTimeout(__sbWkAutoTimer); __sbWkScheduleAuto();
  if (!__sbWkRaf) __sbWkRaf = requestAnimationFrame(__sbWkTick);
}

function __sbStopWalkLoop() {
  if (__sbWkRaf) { cancelAnimationFrame(__sbWkRaf); __sbWkRaf = null; }
  if (__sbWkClimbRaf) { cancelAnimationFrame(__sbWkClimbRaf); __sbWkClimbRaf = null; }
  if (__sbWkMoonRaf) { cancelAnimationFrame(__sbWkMoonRaf); __sbWkMoonRaf = null; }
  if (__sbWkJumpRaf) { cancelAnimationFrame(__sbWkJumpRaf); __sbWkJumpRaf = null; }
  __sbWkClimbing = false; __sbWkMoonwalking = false; __sbWkJumping = false;
  __sbPointFxClear();
  clearTimeout(__sbWkAutoTimer);
  __sbWkResetThrow();
  __sbWalkTalking = false;
  const lane = document.getElementById("__sb_walk_lane__");
  if (lane) {
    lane.style.display = "none";
    const w = document.getElementById("__sbwk_walker__");
    if (w) {
      w.classList.remove("sbwk-auth", "sbwk-authed");
      w.querySelector("#__sbwk_fedora__")?.setAttribute("display", "none");
    }
  }
}

function __sbRestoreWalkBrain() {
  if (!__sbInputOpen) return;
  const lane = document.getElementById("__sb_walk_lane__");
  if (lane && lane.style.display !== "none") return;
  __sbStartWalkLoop();
}

function __sbWkScheduleAuto() {
  clearTimeout(__sbWkAutoTimer);
  __sbWkAutoTimer = setTimeout(() => {
    if (!__sbWkBusy) {
      __sbWkBusy = true; __sbWkWalking = false; __sbWkWaving = true;
      setTimeout(() => { __sbWkWaving = false; }, 1600);
      setTimeout(() => { __sbWkBusy = false; __sbWkWalking = true; __sbWkScheduleAuto(); }, 2400);
    } else { __sbWkScheduleAuto(); }
  }, 3800 + Math.random() * 2600);
}

// ── Wake-up climb ───────────────────────────────────────────────────────────
// Braino pops up from the bottom, walks under the bar, climbs onto it, waves,
// says "allow me to authenticate you" (glows, eyes shut while the silent auth
// handshake runs), then opens his eyes, says "hello, {name}" and hands off to the
// normal walk loop. Runs its OWN rAF and fully owns the rig (the tick is paused).
function __sbWakeupClimb(finishAuthed, finishRejected) {
  const lane = __sbEnsureWalker();
  lane.style.display = "block";
  const walker = document.getElementById("__sbwk_walker__");
  const root = walker && walker.querySelector("#__sbwk_root__");
  if (!walker || !root) { finishAuthed(); return; }

  __sbWkClimbing = true; __sbWkThrowMode = true;
  if (__sbWkRaf) { cancelAnimationFrame(__sbWkRaf); __sbWkRaf = null; }
  clearTimeout(__sbWkAutoTimer);

  const flip = document.getElementById("__sbwk_flip__");
  if (flip) flip.style.transform = "scaleX(1)";   // face forward

  const laneW = lane.clientWidth || 320;
  const climbX = Math.max(10, laneW * 0.5 - 32);
  const ENTRY_X = Math.max(6, climbX - 150);
  const FLOOR_TY = 74;    // feet near the viewport bottom
  const START_TY = 230;   // below the screen

  const el = {
    la: root.querySelector("#__sbwk_la__"),   laBg: root.querySelector("#__sbwk_la_bg__"),
    ra: root.querySelector("#__sbwk_ra__"),   raBg: root.querySelector("#__sbwk_ra_bg__"),
    ll: root.querySelector("#__sbwk_ll__"),   rl: root.querySelector("#__sbwk_rl__"),
    eyeL: root.querySelector("#__sbwk_eye_l__"), eyeR: root.querySelector("#__sbwk_eye_r__"),
    pupL: root.querySelector("#__sbwk_pupil_l__"), pupR: root.querySelector("#__sbwk_pupil_r__"),
  };
  const setArms = (l, r) => {
    const lt = l ? `rotate(${l} 22 53)` : "", rt = r ? `rotate(${r} 78 53)` : "";
    if (el.la) el.la.setAttribute("transform", lt);
    if (el.laBg) el.laBg.setAttribute("transform", lt);
    if (el.ra) el.ra.setAttribute("transform", rt);
    if (el.raBg) el.raBg.setAttribute("transform", rt);
  };
  const setLegs = (l, r) => {
    if (el.ll) el.ll.setAttribute("transform", l ? `rotate(${l} 44 74)` : "");
    if (el.rl) el.rl.setAttribute("transform", r ? `rotate(${r} 56 74)` : "");
  };
  const setEyes = (sy) => {
    const v = Math.max(0.05, sy);
    if (el.eyeL) el.eyeL.setAttribute("transform", `translate(38,48) scale(1,${v}) translate(-38,-48)`);
    if (el.eyeR) el.eyeR.setAttribute("transform", `translate(62,48) scale(1,${v}) translate(-62,-48)`);
  };
  const setGaze = (gx, gy) => {
    if (el.pupL) el.pupL.setAttribute("transform", `translate(${gx} ${gy})`);
    if (el.pupR) el.pupR.setAttribute("transform", `translate(${gx} ${gy})`);
  };
  const place = (x, ty, rot = 0) => { walker.style.transform = `translate(${x}px, ${ty}px) rotate(${rot}deg)`; };

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  place(ENTRY_X, START_TY); setArms(0, 0); setLegs(0, 0); setEyes(1); setGaze(0, -0.55);

  let firstName = "";
  let alreadyAuthed = false;   // known well before the perch phase (fetched at start)
  __sbStorageGet(["authDisplayName", "authToken"]).then(({ authDisplayName, authToken }) => {
    firstName = authDisplayName?.split(" ")[0]?.trim() || "";
    alreadyAuthed = !!authToken;
  });

  // ── auth handshake (only runs when we DON'T already have a token) ──
  let authResolved = null;   // true | false
  let watcher = null, fallbackTimer = null, authBegun = false;
  const startAuth = () => {
    if (authBegun) return; authBegun = true;
    chrome.runtime.sendMessage({ action: "openSilentAuthTab" }, () => { void chrome.runtime.lastError; });
    watcher = (changes, area) => { if (area === "local" && changes.authToken?.newValue && authResolved === null) authResolved = true; };
    try { chrome.storage.onChanged.addListener(watcher); } catch (_) {}
    fallbackTimer = setTimeout(() => { if (authResolved === null) authResolved = false; }, 6000);
  };
  const cleanupAuth = () => {
    if (watcher) { try { chrome.storage.onChanged.removeListener(watcher); } catch (_) {} watcher = null; }
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  };
  const endClimb = (fn) => {
    cleanupAuth();
    walker.classList.remove("sbwk-auth", "sbwk-authed");
    setArms(0, 0); setLegs(0, 0); setEyes(1); setGaze(0, 0);
    __sbWkClimbing = false; __sbWkThrowMode = false;
    if (__sbWkClimbRaf) { cancelAnimationFrame(__sbWkClimbRaf); __sbWkClimbRaf = null; }
    fn();
  };

  let phase = "pop", pStart = performance.now(), said1 = false, said2 = false;
  const next = (p) => { phase = p; pStart = performance.now(); };

  const step = (now) => {
    const e = now - pStart;
    if (phase === "pop") {
      const k = easeOut(Math.min(1, e / 1050));   // slower, gentler rise from below
      place(ENTRY_X, lerp(START_TY, FLOOR_TY, k)); setGaze(0, -0.4);
      if (k >= 1) next("walk");
    } else if (phase === "walk") {
      const k = Math.min(1, e / 1000);
      place(lerp(ENTRY_X, climbX, ease(k)), FLOOR_TY);
      const s = (e / 1000) * 9;
      setLegs(Math.max(0, Math.sin(s)) * 16, Math.max(0, Math.sin(s + Math.PI)) * 16);
      setGaze(1.6, 0);
      if (k >= 1) { setLegs(0, 0); next("reach"); }
    } else if (phase === "reach") {
      const k = ease(Math.min(1, e / 600));
      place(climbX, FLOOR_TY - lerp(0, 6, k));
      setArms(lerp(0, -122, k), lerp(0, 122, k)); setGaze(0, -0.8);
      if (k >= 1) next("grip");
    } else if (phase === "grip") {
      const k = ease(Math.min(1, e / 800));
      place(climbX, lerp(FLOOR_TY - 6, FLOOR_TY - 44, k));   // haul up
      setArms(lerp(-122, -100, k), lerp(122, 100, k));
      setLegs(lerp(0, 18, k), lerp(0, 18, k));               // legs tuck
      if (k >= 1) next("mantle");
    } else if (phase === "mantle") {
      const k = ease(Math.min(1, e / 800));
      place(climbX, lerp(FLOOR_TY - 44, 0, k));              // top out onto the bar
      setArms(lerp(-100, -26, k), lerp(100, 26, k));         // press down
      setLegs(lerp(18, 0, easeOut(k)), lerp(18, 0, easeOut(k)));
      if (k >= 1) { setArms(0, 0); setLegs(0, 0); next("perch"); }
    } else if (phase === "perch") {
      place(climbX, 0);
      setArms(0, -28 + Math.sin(e / 45) * 18);               // wave
      setGaze(0, 0);
      // Only ask to authenticate the FIRST time (no token yet). Already logged in →
      // skip the line and just blink + glow green on the way to "hello".
      if (!alreadyAuthed && e > 300 && !said1) { said1 = true; __sbWkSay("allow me to authenticate you"); }
      const perchDur = alreadyAuthed ? 850 : 1700;
      if (e >= perchDur) { setArms(0, 0); if (!alreadyAuthed) startAuth(); next("auth"); }
    } else if (phase === "auth") {
      setEyes(lerp(1, 0.06, Math.min(1, e / 350)));          // eyes close (blink shut)
      // The display name only lands in storage AFTER auth — re-read it on the way to hello
      // so first-time logins greet by name instead of "hello there".
      const goHello = () => {
        __sbStorageGet(["authDisplayName"]).then(({ authDisplayName }) => {
          const fn = authDisplayName?.split(" ")[0]?.trim();
          if (fn) firstName = fn;
        });
        next("hello");
      };
      if (alreadyAuthed) {
        // Already logged in: no gold "authenticating" glow — just a green confirm flash.
        walker.classList.add("sbwk-authed");
        if (e >= 700) goHello();
      } else {
        walker.classList.add("sbwk-auth");                   // gold pulse while handshaking
        if (authResolved !== null) {
          walker.classList.remove("sbwk-auth");
          if (authResolved) { walker.classList.add("sbwk-authed"); goHello(); }
          else { endClimb(finishRejected); return; }
        }
      }
    } else if (phase === "hello") {
      setEyes(lerp(0.06, 1, Math.min(1, e / 350)));          // eyes open
      // Wait briefly for the name to load (up to ~900ms) before greeting.
      if (!said2 && (firstName || e > 900)) { said2 = true; __sbWkSay("hello, " + (firstName || "there")); }
      // Hand off so the normal stroll resumes from the CENTER (no jump to the edge).
      if (e >= 1700) { __sbWkResumeFromX = climbX; endClimb(finishAuthed); return; }
    }
    __sbWkClimbRaf = requestAnimationFrame(step);
  };
  __sbWkClimbRaf = requestAnimationFrame(step);
}

// ── Jump & Point ─────────────────────────────────────────────────────────────
// Braino springs off the bar, arcs across the screen, lands beside the element the
// user asked about and points at it while a laser ring traces its outline — then
// arcs back to the bar. The motion is a faithful port of the Claude Design
// "Braino Jump & Point" poseAt() timeline (anticipation crouch → explosive launch →
// airborne arc with knee-tuck → landing squash → spring-back → point + laser → return).
// Runs its OWN rAF and fully owns the rig, exactly like the wake-up climb.

let __sbPointFx = null;
function __sbPointFxEnsure() {
  if (__sbPointFx && document.body.contains(__sbPointFx.wrap)) return __sbPointFx;
  const wrap = document.createElement("div");
  wrap.id = "__sb_point_fx__";
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.id = "__sb_point_svg__";
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const beam = document.createElementNS(NS, "path");
  beam.id = "__sb_point_beam__";
  beam.setAttribute("fill", "none");
  beam.setAttribute("stroke", "oklch(0.8 0.16 58)");
  beam.setAttribute("stroke-width", "2.4");
  beam.setAttribute("stroke-linecap", "round");
  beam.setAttribute("stroke-dasharray", "1 8");
  const ring = document.createElementNS(NS, "path");
  ring.id = "__sb_point_ring__";
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "oklch(0.82 0.17 55)");
  ring.setAttribute("stroke-width", "2.5");
  ring.setAttribute("stroke-linejoin", "round");
  svg.appendChild(beam);
  svg.appendChild(ring);
  const callout = document.createElement("div");
  callout.id = "__sb_point_callout__";
  callout.innerHTML = `Right here <span style="font-weight:800">↗</span>`;
  wrap.appendChild(svg);
  wrap.appendChild(callout);
  (document.documentElement || document.body).appendChild(wrap);
  __sbPointFx = { wrap, svg, beam, ring, callout };
  return __sbPointFx;
}
function __sbPointFxClear() {
  if (__sbPointFx && __sbPointFx.wrap && __sbPointFx.wrap.parentNode) {
    __sbPointFx.wrap.parentNode.removeChild(__sbPointFx.wrap);
  }
  __sbPointFx = null;
}
function __sbRoundRectPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r}`
    + ` V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`
    + ` H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r}`
    + ` V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

// Animate the jump + point at `el`. Resolves once Braino is back on the bar.
function __sbJumpPointAt(el, opts = {}) {
  return new Promise((resolve) => {
    const lane = __sbEnsureWalker();
    lane.style.display = "block";
    const walker = document.getElementById("__sbwk_walker__");
    const flip = document.getElementById("__sbwk_flip__");
    const root = walker && walker.querySelector("#__sbwk_root__");
    if (!el || !walker || !flip || !root) { resolve(false); return; }

    __sbWkJumping = true; __sbWkThrowMode = true;
    if (__sbWkRaf) { cancelAnimationFrame(__sbWkRaf); __sbWkRaf = null; }
    clearTimeout(__sbWkAutoTimer);
    __sbWkWaving = false; __sbWkBusy = true; __sbWkWalking = false;

    const elr = {
      la: root.querySelector("#__sbwk_la__"), laBg: root.querySelector("#__sbwk_la_bg__"),
      ra: root.querySelector("#__sbwk_ra__"), raBg: root.querySelector("#__sbwk_ra_bg__"),
      ll: root.querySelector("#__sbwk_ll__"), rl: root.querySelector("#__sbwk_rl__"),
      eyeL: root.querySelector("#__sbwk_eye_l__"), eyeR: root.querySelector("#__sbwk_eye_r__"),
      pupL: root.querySelector("#__sbwk_pupil_l__"), pupR: root.querySelector("#__sbwk_pupil_r__"),
    };
    // setArms(l,r) maps 1:1 to the design's poseAt p.leftArm / p.rightArm — the walker
    // SVG arm paths + pivots (22,53)/(78,53) are byte-identical to braino-char.jsx.
    const setArms = (l, r) => {
      const lt = `rotate(${l} 22 53)`, rt = `rotate(${r} 78 53)`;
      if (elr.la) elr.la.setAttribute("transform", lt);
      if (elr.laBg) elr.laBg.setAttribute("transform", lt);
      if (elr.ra) elr.ra.setAttribute("transform", rt);
      if (elr.raBg) elr.raBg.setAttribute("transform", rt);
    };
    const setLegs = (l, r) => {
      if (elr.ll) elr.ll.setAttribute("transform", l ? `rotate(${l} 44 74)` : "");
      if (elr.rl) elr.rl.setAttribute("transform", r ? `rotate(${r} 56 74)` : "");
    };
    const setEyes = (sy) => {
      const v = Math.max(0.05, sy);
      if (elr.eyeL) elr.eyeL.setAttribute("transform", `translate(38,48) scale(1,${v}) translate(-38,-48)`);
      if (elr.eyeR) elr.eyeR.setAttribute("transform", `translate(62,48) scale(1,${v}) translate(-62,-48)`);
    };
    const setGaze = (gx, gy) => {
      if (elr.pupL) elr.pupL.setAttribute("transform", `translate(${gx} ${gy})`);
      if (elr.pupR) elr.pupR.setAttribute("transform", `translate(${gx} ${gy})`);
    };

    const lerp = (a, b, u) => a + (b - a) * u;
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const easeBack = (x) => { const c = 2.0; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));

    // feet origin in the 64×78 rendered walker box (viewBox -8 -34 116 142 → feet ≈ 32,74)
    const FOOT_DX = 32;
    flip.style.transformOrigin = `${FOOT_DX}px 74px`;
    const place = (tx, ty) => { walker.style.transform = `translate(${tx}px, ${ty}px)`; };
    let FACE = 1;
    const pose = (sx, sy, rot) => { flip.style.transform = `scale(${(sx * FACE).toFixed(3)},${sy.toFixed(3)}) rotate(${(rot * FACE).toFixed(2)}deg)`; };

    // viewport ↔ lane-local foot coords
    const laneRect = lane.getBoundingClientRect();
    const FOOT_BASE_Y = laneRect.bottom - 4;          // foot viewport-Y when ty=0 (perched)
    const footVx = (tx) => laneRect.left + FOOT_DX + tx;
    const footVy = (ty) => FOOT_BASE_Y + ty;

    // key positions (lane-local, feet)
    const START = { tx: cl(__sbWkPosX, 6, (lane.clientWidth || 320) - 70), ty: 0 };
    const r0 = el.getBoundingClientRect();
    const elCx = r0.left + r0.width / 2;
    const startVx = footVx(START.tx);
    FACE = elCx >= startVx ? 1 : -1;
    const landVx = cl(elCx - 70 * FACE, 48, window.innerWidth - 48);
    const landVy = cl(r0.bottom + 70, 140, FOOT_BASE_Y - 8);
    const LAND = { tx: landVx - laneRect.left - FOOT_DX, ty: landVy - FOOT_BASE_Y };
    const APEX = cl(Math.hypot(LAND.tx - START.tx, LAND.ty - START.ty) * 0.34, 90, 260);

    const fx = __sbPointFxEnsure();
    const aimAt = (tx, ty) => {           // pupils track the element from the current foot
      const fvx = footVx(tx), fvy = footVy(ty);
      setGaze(cl((elCx - fvx) / 260, -1, 1) * 2.1, cl(((r0.top + r0.height / 2) - fvy) / 260, -1, 1) * 1.9);
    };
    const layoutRing = () => {
      const rr = el.getBoundingClientRect();
      const pad = 7;
      fx.ring.setAttribute("d", __sbRoundRectPath(rr.left - pad, rr.top - pad, rr.width + pad * 2, rr.height + pad * 2, 12));
    };
    const layoutBeam = (tx, ty) => {
      const rr = el.getBoundingClientRect();
      const fvx = footVx(tx) + 30 * FACE, fvy = footVy(ty) - 70;   // ~fingertip
      const tgx = rr.left + rr.width * 0.5, tgy = rr.top + rr.height + 4;
      const mx = (fvx + tgx) / 2 + 14 * FACE, my = (fvy + tgy) / 2;
      fx.beam.setAttribute("d", `M ${fvx} ${fvy} Q ${mx} ${my} ${tgx} ${tgy}`);
    };

    const bar = document.getElementById("__sb_bar__");
    const setRecoil = (v) => { if (bar) bar.style.transform = `translateX(-50%) translateY(${(4 * v).toFixed(2)}px) scale(1)`; };

    place(START.tx, START.ty); pose(1, 1, 0); setArms(0, 0); setLegs(0, 0); setEyes(1); aimAt(START.tx, START.ty);
    layoutRing();
    fx.ring.style.opacity = "0"; fx.beam.style.opacity = "0"; fx.callout.style.opacity = "0";
    let ringLen = 0; try { ringLen = fx.ring.getTotalLength() || 0; } catch (_) {}

    // dismiss the hold early on click / Escape
    let dismiss = false;
    const onKey = (e) => { if (e.key === "Escape") dismiss = true; };
    const onClick = () => { dismiss = true; };

    let phase = "crouch", pStart = performance.now(), said = false, holdStart = 0;
    const T = { crouch: 280, launch: 160, fly: 640, land: 160, recover: 260, hold: 3400, bCrouch: 210, bFly: 580 };
    const t0 = performance.now();
    const next = (p) => { phase = p; pStart = performance.now(); };

    const finish = () => {
      __sbWkJumping = false; __sbWkThrowMode = false;
      if (__sbWkJumpRaf) { cancelAnimationFrame(__sbWkJumpRaf); __sbWkJumpRaf = null; }
      try { document.removeEventListener("keydown", onKey, true); } catch (_) {}
      try { document.removeEventListener("pointerdown", onClick, true); } catch (_) {}
      if (bar) bar.style.transform = "";
      flip.style.transformOrigin = ""; flip.style.transform = "";
      setArms(0, 0); setLegs(0, 0); setEyes(1); setGaze(0, 0);
      walker.style.transform = "";
      __sbPointFxClear();
      __sbWkBusy = false;
      __sbWkResumeFromX = START.tx;   // resume strolling from where he launched
      __sbStartWalkLoop();
      resolve(true);
    };

    const step = (now) => {
      const e = now - pStart;
      if (phase === "crouch") {                              // anticipation
        const u = easeOut(Math.min(1, e / T.crouch));
        place(START.tx, START.ty);
        pose(lerp(1, 1.2, u), lerp(1, 0.6, u), lerp(0, -6, u));
        setArms(lerp(0, 40, u), lerp(0, -40, u));
        aimAt(START.tx, START.ty); setRecoil(u);
        if (e >= T.crouch) next("launch");
      } else if (phase === "launch") {                       // explosive push-off
        const u = easeOut(Math.min(1, e / T.launch));
        place(START.tx, START.ty - lerp(0, 22, u));
        pose(lerp(1.2, 0.8, u), lerp(0.6, 1.32, u), -6);
        setArms(lerp(40, 128, u), lerp(-40, -128, u));
        setRecoil(1 - u);
        if (e >= T.launch) next("fly");
      } else if (phase === "fly") {                          // airborne arc
        const u = Math.min(1, e / T.fly);
        const tx = lerp(START.tx, LAND.tx, u);
        const ty = lerp(START.ty - 22, LAND.ty, u) - APEX * Math.sin(Math.PI * u);
        place(tx, ty);
        const sy = lerp(1.2, 0.96, easeOut(u));
        pose(2 - sy, sy, lerp(-14, 6, u));
        const tuck = Math.sin(Math.PI * u) * 10;
        setLegs(tuck, -tuck);
        setArms(lerp(128, 16, u), lerp(-128, -66, u));
        aimAt(tx, ty);
        if (e >= T.fly) { setLegs(0, 0); next("land"); }
      } else if (phase === "land") {                         // squash on impact
        const u = easeOut(Math.min(1, e / T.land));
        place(LAND.tx, LAND.ty);
        const sy = lerp(0.96, 0.66, u);
        pose(2 - sy, sy, lerp(6, 0, u));
        setArms(16, -66); aimAt(LAND.tx, LAND.ty);
        if (e >= T.land) next("recover");
      } else if (phase === "recover") {                      // spring to full height + laser draws on
        const u = easeBack(Math.min(1, e / T.recover));
        const g = Math.min(1, e / T.recover);
        place(LAND.tx, LAND.ty);
        const sy = lerp(0.66, 1, u);
        pose(2 - sy, sy, 0);
        setArms(16, -66); aimAt(LAND.tx, LAND.ty);
        layoutRing(); layoutBeam(LAND.tx, LAND.ty);
        fx.ring.style.opacity = (0.95 * g).toFixed(3);
        if (ringLen) { fx.ring.style.strokeDasharray = ringLen; fx.ring.style.strokeDashoffset = (ringLen * (1 - g)).toFixed(1); }
        fx.beam.style.opacity = (0.9 * g).toFixed(3);
        if (e >= T.recover) {
          said = false; holdStart = now; next("hold");
          try { document.addEventListener("keydown", onKey, true); } catch (_) {}
          setTimeout(() => { try { document.addEventListener("pointerdown", onClick, true); } catch (_) {}; }, 350);
        }
      } else if (phase === "hold") {                         // point + jab, laser pulses
        const held = now - holdStart;
        const tt = (now - t0) / 1000;
        place(LAND.tx, LAND.ty);
        pose(1, 1, 0);
        const jab = Math.sin(held / 1000 * 22) * 2.5;
        setArms(16, -66 + jab);
        aimAt(LAND.tx, LAND.ty);
        layoutRing(); layoutBeam(LAND.tx, LAND.ty);
        const pulse = 0.5 + 0.5 * Math.sin(tt * 5);
        if (ringLen) { fx.ring.style.strokeDasharray = ringLen; fx.ring.style.strokeDashoffset = 0; }
        fx.ring.style.opacity = (0.6 + 0.4 * pulse).toFixed(3);
        fx.ring.style.filter = `drop-shadow(0 0 ${(6 + pulse * 12).toFixed(0)}px oklch(0.74 0.16 58 / 0.7))`;
        fx.beam.style.opacity = "0.9";
        fx.beam.style.strokeDashoffset = (-(tt * 22) % 200).toFixed(1);
        const co = (held > 140 && held < T.hold - 260) ? 1 : 0;
        fx.callout.style.opacity = String(co);
        const cv = footVx(LAND.tx), cvy = footVy(LAND.ty);
        fx.callout.style.left = (cv - 150) + "px";
        fx.callout.style.top = (cvy - 96) + "px";
        if (!said) { said = true; if (opts.say) __sbWkSay(opts.say); }
        if (held >= T.hold || dismiss) {
          fx.callout.style.opacity = "0";
          next("bCrouch");
        }
      } else if (phase === "bCrouch") {                      // coil to jump home
        const u = easeOut(Math.min(1, e / T.bCrouch));
        place(LAND.tx, LAND.ty);
        const sy = lerp(1, 0.62, u);
        pose(2 - sy, sy, lerp(0, 7, u));
        setArms(lerp(16, -30, u), lerp(-66, 30, u));
        fx.ring.style.opacity = (0.95 * (1 - u)).toFixed(3);
        fx.beam.style.opacity = (0.9 * (1 - u)).toFixed(3);
        if (e >= T.bCrouch) next("bFly");
      } else if (phase === "bFly") {                         // arc back to the bar
        const u = Math.min(1, e / T.bFly);
        const tx = lerp(LAND.tx, START.tx, u);
        const ty = lerp(LAND.ty, START.ty, u) - APEX * 0.8 * Math.sin(Math.PI * u);
        place(tx, ty);
        const sy = lerp(1.22, 1, easeOut(u));
        pose(2 - sy, sy, lerp(14, 0, u));
        const tuck = Math.sin(Math.PI * u) * 8;
        setLegs(tuck, -tuck);
        setArms(lerp(-30, 0, u), lerp(30, 0, u));
        setGaze(0, 0);
        if (e >= T.bFly) { setLegs(0, 0); finish(); return; }
      }
      __sbWkJumpRaf = requestAnimationFrame(step);
    };
    __sbWkJumpRaf = requestAnimationFrame(step);
  });
}

// A quick hop in place (bare "jump" with nothing to point at). Owns the rig briefly.
function __sbWkHop() {
  return new Promise((resolve) => {
    const lane = __sbEnsureWalker();
    lane.style.display = "block";
    const walker = document.getElementById("__sbwk_walker__");
    const flip = document.getElementById("__sbwk_flip__");
    if (!walker || !flip) { resolve(false); return; }
    __sbWkJumping = true; __sbWkThrowMode = true;
    if (__sbWkRaf) { cancelAnimationFrame(__sbWkRaf); __sbWkRaf = null; }
    clearTimeout(__sbWkAutoTimer);
    __sbWkBusy = true; __sbWkWalking = false;
    const baseX = __sbWkPosX;
    flip.style.transformOrigin = "32px 74px";
    const t0 = performance.now();
    const DUR = 720, H = 72;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / DUR);
      const ty = -H * Math.sin(Math.PI * u);
      walker.style.transform = `translate(${baseX}px, ${ty}px)`;
      let sx = 1, sy = 1;
      if (u < 0.18) { const k = u / 0.18; sx = 1 + 0.2 * k; sy = 1 - 0.3 * k; }            // crouch
      else if (u < 0.34) { const k = (u - 0.18) / 0.16; sx = 1.2 - 0.4 * k; sy = 0.7 + 0.62 * k; } // stretch up
      else if (u > 0.84) { const k = Math.sin(((u - 0.84) / 0.16) * Math.PI); sx = 1 + 0.16 * k; sy = 1 - 0.16 * k; } // land squash
      flip.style.transform = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
      if (u >= 1) {
        flip.style.transform = ""; flip.style.transformOrigin = ""; walker.style.transform = "";
        __sbWkJumping = false; __sbWkThrowMode = false; __sbWkJumpRaf = null;
        __sbWkBusy = false; __sbWkResumeFromX = baseX; __sbStartWalkLoop(); resolve(true); return;
      }
      __sbWkJumpRaf = requestAnimationFrame(step);
    };
    __sbWkJumpRaf = requestAnimationFrame(step);
  });
}

function __sbWkTick(now) {
  const lane = document.getElementById("__sb_walk_lane__");
  if (!lane || lane.style.display === "none") { __sbWkRaf = null; return; }
  const walker = document.getElementById("__sbwk_walker__");
  if (!walker) { __sbWkRaf = null; return; }

  const dt = Math.min(0.05, (now - __sbWkLast) / 1000);
  __sbWkLast = now;
  const t = (now - __sbWkStart) / 1000;

  // While engaged in headphone mode Braino stops strolling and stands to listen.
  const moving = __sbWkWalking && !__sbWkEngaged;

  // Horizontal stroll (74px/s matching design, ping-pong within lane)
  if (moving) {
    const laneW = lane.clientWidth;
    const maxX = Math.max(28, laneW - 64 - 6);
    let x = __sbWkPosX + __sbWkDirX * 74 * dt;
    if (x >= maxX) { x = maxX; __sbWkDirX = -1; }
    else if (x <= 6) { x = 6; __sbWkDirX = 1; }
    __sbWkPosX = x;
  }
  // While thrown, the physics/return loop owns walker.style.transform — don't fight it.
  if (!__sbWkThrowMode) walker.style.transform = `translateX(${__sbWkPosX}px)`;

  const flip = document.getElementById("__sbwk_flip__");
  // Face forward (right) while standing to listen; otherwise face walk direction.
  if (flip) flip.style.transform = `scaleX(${__sbWkEngaged ? 1 : __sbWkDirX})`;

  // Walk cycle — t * 4.5 for a relaxed stroll (design reference is 7.6)
  const s = t * 4.5;
  const Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
  const ll = moving ? Math.max(0, Lp) * 5 : 0;
  const rl = moving ? Math.max(0, Rp) * 5 : 0;
  const ls = moving ? Math.max(0, Lp) * 8 : 0;
  const rs = moving ? Math.max(0, Rp) * 8 : 0;
  const waddle  = moving ? Math.sin(s) * 3.4 : 0;
  const walkBob = moving ? (-Math.abs(Math.sin(s)) * 2 - 0.4) : 0;

  const breath = 1 + 0.014 * Math.sin(t * 1.7);
  const bob = Math.sin(t * 1.7 + 0.6) * 0.8;

  const bp = t % 3.4;
  const blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
  const eyeSy = Math.max(0.06, 1 - blink);

  const rightAngle = __sbWkWaving ? (-28 + Math.sin(t * 11) * 16) : 0;

  const root = walker.querySelector("#__sbwk_root__");
  if (!root) { __sbWkRaf = null; return; }

  // Reaction adds a quick "pop" scale on trigger plus per-emotion body motion.
  let reactPop = 1, reactShake = 0;
  if (__sbWkReaction) {
    const rt = (now - __sbWkReactStart) / 1000;
    reactPop = 1 + Math.max(0, 0.22 * (1 - rt / 0.34));
    if (__sbWkReaction === "scared") reactShake = Math.sin(now / 26) * 3.4;       // frightened shiver
    else if (__sbWkReaction === "celebrate") reactShake = Math.sin(now / 70) * 2.2; // happy wiggle
    else if (__sbWkReaction === "tears") reactShake = Math.sin(now / 95) * 1.4;
  }

  root.setAttribute("transform",
    `rotate(${waddle + reactShake} 50 50) translate(0 ${bob + walkBob}) scale(${breath * reactPop})`);

  const legL = root.querySelector("#__sbwk_ll__");
  const legR = root.querySelector("#__sbwk_rl__");
  const raBg = root.querySelector("#__sbwk_ra_bg__");
  const raFg = root.querySelector("#__sbwk_ra__");
  if (__sbWkThrowMode) {
    // Grabbed or airborne: legs and arms flail wildly.
    const wob1 = Math.sin(now / 55) * 26, wob2 = Math.sin(now / 48 + 1.7) * 26;
    const arm  = Math.sin(now / 44 + 0.6) * 34;
    if (legL) legL.setAttribute("transform", `rotate(${wob1} 44 74)`);
    if (legR) legR.setAttribute("transform", `rotate(${wob2} 56 74)`);
    if (raBg) raBg.setAttribute("transform", `rotate(${arm} 78 53)`);
    if (raFg) raFg.setAttribute("transform", `rotate(${arm} 78 53)`);
  } else {
    if (legL) legL.setAttribute("transform", `translate(0 ${-ll}) rotate(${ls} 44 74)`);
    if (legR) legR.setAttribute("transform", `translate(0 ${-rl}) rotate(${rs} 56 74)`);
    const raTx = rightAngle ? `rotate(${rightAngle} 78 53)` : "";
    if (raBg) raBg.setAttribute("transform", raTx);
    if (raFg) raFg.setAttribute("transform", raTx);
  }

  const eyeL = root.querySelector("#__sbwk_eye_l__");
  const eyeR = root.querySelector("#__sbwk_eye_r__");
  const mouthG = root.querySelector("#__sbwk_mouth__");
  const reactG = root.querySelector("#__sbwk_react__");

  if (__sbWkReaction) {
    // A reaction face takes over: hide the normal eyes + mouth, show the chosen overlay.
    if (eyeL) eyeL.setAttribute("display", "none");
    if (eyeR) eyeR.setAttribute("display", "none");
    if (mouthG) mouthG.setAttribute("display", "none");
    if (reactG) reactG.setAttribute("display", "inline");
    const key = __sbWkReaction === "scared" ? "rs" : __sbWkReaction === "celebrate" ? "rc" : "rt";
    ["rs", "rc", "rt"].forEach(k => {
      const g = root.querySelector("#__sbwk_" + k + "__");
      if (g) g.setAttribute("display", k === key ? "inline" : "none");
    });
    const rt = (now - __sbWkReactStart) / 1000;
    if (__sbWkReaction === "scared") {
      const sweat = root.querySelector("#__sbwk_sweat__");
      if (sweat) {
        const drop = (rt * 26) % 22;                       // bead slides down the temple
        sweat.setAttribute("transform", `translate(${-drop * 0.25} ${drop})`);
        sweat.setAttribute("opacity", String(Math.max(0, 1 - drop / 22)));
      }
    } else if (__sbWkReaction === "tears") {
      const tl = root.querySelector("#__sbwk_tear_l__");
      const tr = root.querySelector("#__sbwk_tear_r__");
      const drop = (rt * 22) % 14;                          // tears of joy stream down
      const op = String(Math.max(0, 1 - drop / 14));
      if (tl) { tl.setAttribute("transform", `translate(${-drop * 0.18} ${drop})`); tl.setAttribute("opacity", op); }
      if (tr) { tr.setAttribute("transform", `translate(${drop * 0.18} ${drop})`); tr.setAttribute("opacity", op); }
    } else if (__sbWkReaction === "celebrate") {
      const conf = root.querySelector("#__sbwk_confetti__");
      if (conf) conf.setAttribute("transform", `rotate(${Math.sin(now / 120) * 12} 50 30) translate(0 ${Math.sin(now / 90) * 2})`);
    }
  } else {
    // Normal face — restore visibility and run the usual blink / gaze / mouth.
    if (reactG) reactG.setAttribute("display", "none");
    if (eyeL) eyeL.setAttribute("display", "inline");
    if (eyeR) eyeR.setAttribute("display", "inline");
    if (mouthG) mouthG.setAttribute("display", "inline");

    if (eyeL) eyeL.setAttribute("transform", `translate(38,48) scale(1,${eyeSy}) translate(-38,-48)`);
    if (eyeR) eyeR.setAttribute("transform", `translate(62,48) scale(1,${eyeSy}) translate(-62,-48)`);

    // Gaze: pupils look toward the direction of travel while walking; they recentre
    // (look straight at the user) the moment Braino is engaged in headphone mode.
    // Local +X always maps to the walk direction because the body is mirrored by
    // scaleX(__sbWkDirX), so a constant forward offset reads correctly both ways.
    const gaze = (__sbWkEngaged || !moving) ? 0 : 2.4;
    const pupL = root.querySelector("#__sbwk_pupil_l__");
    const pupR = root.querySelector("#__sbwk_pupil_r__");
    if (pupL) pupL.setAttribute("transform", `translate(${gaze} 0)`);
    if (pupR) pupR.setAttribute("transform", `translate(${gaze} 0)`);

    const mSmile = root.querySelector("#__sbwk_smile__");
    const mTalk  = root.querySelector("#__sbwk_talk__");
    const tE = root.querySelector("#__sbwk_te__");
    const tI = root.querySelector("#__sbwk_ti__");
    // Mouth animates whenever Braino is actually speaking (TTS sets __sbWalkTalking) —
    // in voice mode or when reading an answer aloud. The idle wave no longer triggers it
    // (that's decoupled), so no need to also gate on headphone mode.
    const talking = __sbWalkTalking;
    if (talking) {
      const o = Math.max(0, Math.min(1,
        (0.5 + 0.5 * Math.sin(t * 13.5)) *
        (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3)) *
        (0.7 + 0.3 * Math.sin(t * 23))
      ));
      const ry = 1.4 + o * 4.2, rx = 4 - o * 0.5;
      // Use style.display — the talk group carries an inline style="display:none" that
      // would otherwise override the display ATTRIBUTE (that was the missing-mouth bug).
      if (mSmile) mSmile.style.display = "none";
      if (mTalk)  mTalk.style.display = "block";
      if (tE) { tE.setAttribute("rx", String(rx)); tE.setAttribute("ry", String(ry)); }
      if (tI) {
        if (o > 0.25) {
          tI.style.display = "block";
          tI.setAttribute("cy", String(61.8 + ry * 0.4));
          tI.setAttribute("rx", String(rx * 0.62));
          tI.setAttribute("ry", String(ry * 0.5));
        } else { tI.style.display = "none"; }
      }
    } else {
      if (mSmile) mSmile.style.display = "";
      if (mTalk)  mTalk.style.display = "none";
    }
  }

  __sbWkRaf = requestAnimationFrame(__sbWkTick);
}

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
// In-flight TTS fetch controller, so barge-in (__sbStopSpeech) can abort it instantly
// instead of letting it hang until the fetch timeout fires.
let __sbTtsAbortController = null;
const __SB_TTS_PROVIDER = "fish-audio";
const __SB_TTS_FALLBACK_PROVIDER = "openai-tts";
const __SB_TTS_ENDPOINT = "fish-audio-tts";
const __SB_TTS_RETRY_MIN_MS = 800;
const __SB_TTS_RETRY_MAX_MS = 12000;
// With server-side streaming, fetch() resolves on response headers (first audio chunk), so
// this only guards a genuinely stalled connection — not full audio generation. 10s leaves
// room for a cold edge-function start (~5s observed) yet still falls back far faster than
// the old 14s of silence.
const __SB_TTS_FETCH_TIMEOUT_MS = 10000;
// Fish Audio picks the voice server-side via FISH_AUDIO_REFERENCE_ID — the client sends
// only { text }, so no voice id is needed here. Kept as a label for cost telemetry.
const __SB_FISH_VOICE_NAME = "Fish Audio Braino";
let __sbIsLectureRecording = false;
let __sbLectureNotes = "";
let __sbLectureInterval = null;
let __sbLecSegmentCount = 0;
let __sbLectureRecordingMode = "lecture";
let __sbLectureTranscript = "";
let __sbMeetingArtifacts = { actionItems: [], followUps: [] };
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
let __sbAgentLaunchGuard = { task: "", ts: 0 };
let __sbMovieModeActive = false;
let __sbMovieModeState = { frame: null, media: null, descriptor: "" };
let __sbMovieModeSyncTimer = null;
let __sbMovieModeScrollListener = null;
let __sbMovieModeResizeListener = null;
let __sbMovieTranscriptEntries = [];
let __sbMovieLastSubtitleText = "";
let __sbAgentPendingTurn = null;
let __sbMovieLastTitle = "";
let __sbPassiveMovieSyncTimer = null;
let __sbFullscreenUiListenerBound = false;
const __SB_MOVIE_MODE_FRAME_RE = /\b(player|video|media|playback|stream|caption|subtitle|controls?|shaka|jw|vjs|html5|watch|cinema|theater|viewer)\b/i;
const __SB_MOVIE_CONTEXT_HOST_RE = /\b(netflix|hotstar|jiohotstar|disneyplus|disney|primevideo|amazonvideo|amazon|hulu|max|hbomax|appletv|apple\.tv|tv\.apple|zee5|sonyliv|jiocinema|voot|aha|mxplayer|erosnow|altbalaji|youtube|mubi|peacock|paramount|fubo|crunchyroll|funimation|tubi)\b/i;
const __SB_LATEST_UPDATES = [
  {
    title: "Arms, legs, walking, and flinging",
    text: "I have a fuller little body now: arms, legs, walking above the bar, idle waves, expressive reactions, and grab/fling physics where I tumble away and climb back to the bar.",
  },
  {
    title: "Cinema mode",
    text: "I can sit with you while you watch a movie, use the current playback context, timestamp, and captions/subtitle transcript, then answer scene questions without spoiling future events unless you ask.",
  },
  {
    title: "Always-on realtime voice",
    text: "The blue glow still means realtime listening is alive. Ctrl+Ctrl now enters headphone voice with clean Auto routing, so stale Lecture/Web/connector modes do not hijack commands.",
  },
  {
    title: "Faster browser actions",
    text: "Spotify/open/send style voice commands now launch fast adapters immediately, skip slow progress narration, and only use the DOM-grounded closed loop for complex work.",
  },
  {
    title: "Useful working memory",
    text: "I can work with contacts and nicknames, Google Calendar, Google Docs, X/Twitter status and automation, web research, tab awareness, and realtime spend checks.",
  },
];

function __sbBuildLatestUpdatesPromptBlock() {
  return [
    "Current Braino product memory - if the user asks what is new with you, what changed recently, or what you can do now, answer from this list first.",
    ...__SB_LATEST_UPDATES.map((item) => `- ${item.title}: ${item.text}`),
  ].join("\n");
}

function __sbBuildWhatsNewReply() {
  return [
    "Yeah, I should know this now. Here is the current Braino changelog:",
    "",
    ...__SB_LATEST_UPDATES.map((item) => `**${item.title}** — ${item.text}`),
    "",
    "Last night's big one was the body/cinema glow-up: arms, legs, walking/flinging, plus movie companion context. What do you want to try first?",
  ].join("\n\n");
}

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
    if (msg.action === "toggleMovieMode") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      const result = __sbToggleMovieMode();
      sendResponse({ ok: Boolean(result?.ok), active: Boolean(result?.active), error: result?.error || null });
      return false;
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
    if (msg.action === "startMeetingRecording") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      window.__sbForcedMode = "meeting";
      if (__sbIsLectureRecording) {
        __sbShowBubble("Meeting & Call mode is already recording.", false, { tone: "status", title: "Meeting & Call" });
        sendResponse({ ok: true, alreadyRecording: true });
        return false;
      }
      void __sbStartLectureRecording();
      sendResponse({ ok: true });
      return false;
    }
    if (msg.action === "startLectureRecording") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      window.__sbForcedMode = "lecture";
      if (__sbIsLectureRecording) {
        __sbShowBubble("Lecture & Audio mode is already recording.", false, { tone: "status", title: "Lecture & Audio" });
        sendResponse({ ok: true, alreadyRecording: true });
        return false;
      }
      void __sbStartLectureRecording({ readyMessage: msg.readyMessage || "" });
      sendResponse({ ok: true });
      return false;
    }
    if (msg.action === "showBrainoRecovery") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbShowBubble(msg.message || "I moved Braino to a normal tab so it can keep working.", false, {
        tone: "status",
        title: msg.title || "Braino moved here",
      });
      sendResponse({ ok: true });
      return false;
    }
    if (msg.action === "sbAgentUpdate") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      if (msg.final) {
        // Voice mode speaks the result with no panel; chat mode shows it.
        const finalText = String(msg.text || "").trim();
        const agentPrompt = String(msg.task || __sbAgentPendingTurn?.prompt || __sbLastAgentTask || "").trim();
        if (agentPrompt && finalText) {
          __sbFinalizeAgentPendingTurn(agentPrompt, finalText, {
            render: !(msg.keepLectureCard && __sbIsLectureRecording),
          });
        } else {
          __sbAgentPendingTurn = null;
          if (!__sbVoiceOnlyMode) __sbShowBubble(msg.text, false, { rich: true, kicker: "Braino", prompt: agentPrompt });
        }
        __sbSetStopBtn(false);
        if (__sbRtAwaitingDelegateResult) {
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
        if (!__sbVoiceOnlyMode) {
          if (__sbAgentPendingTurn) {
            __sbUpdateAgentPendingTurn(String(msg.text || "Working…").trim() || "Working…");
          } else if (String(msg.task || "").trim()) {
            // Delegate carried over to a new tab — no pending turn exists here yet. Recreate it
            // from the task so the in-flight delegate (progress + subgoals) keeps rendering in the
            // panel instead of resetting to a transient bubble. Continuity across tabs.
            __sbSetAgentPendingTurn(String(msg.task).trim(), String(msg.text || "Working…").trim() || "Working…");
          } else {
            __sbShowBubble(msg.text, false, { tone: "status" });
          }
        }
        __sbSetStopBtn(true);
        // Keep progress visual-only in realtime. Speaking milestones can be slow and
        // can leak back into the live mic; only final agent results should speak.
      }
    }
    if (msg.action === "SB_SUBGOAL_UPDATE" || msg.type === "SB_SUBGOAL_UPDATE") {
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbUpdateAgentSubgoals(Array.isArray(msg.subgoals) ? msg.subgoals : []);
      sendResponse?.({ ok: true });
      return false;
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
      const quotaError = /limit|cap|used .*today|429/i.test(errorText);
      if (quotaError) {
        __sbPlayReaction('shocked', 3000);
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
    if (msg.action === "sbPromptForContact") {
      if (!__sbOwnsInlineUi()) { sendResponse?.({ ok: false, error: "Braino UI is not active on this tab." }); return; }
      __sbShowContactPromptModal(msg.payload || {}).then((result) => sendResponse?.(result || { ok: false }));
      return true;
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
      position: fixed; bottom: 0; right: 0; z-index: 1;
      width: 1px; height: 1px; pointer-events: none; overflow: visible;
    }
    /* Docked mascot — sits at the bottom-right of the page, anchored to #__sb_root__
       (so it still follows cursor-ride repositioning), independent of the bar. */
    #__sb_brain_btn__ {
      position: absolute;
      right: 18px;
      bottom: 18px;
      width: 52px; height: 52px;
      cursor: pointer; pointer-events: all;
      filter: drop-shadow(0 2px 12px rgba(200,84,74,0.55));
      transition: filter 0.15s;
      z-index: 2;
    }
    #__sb_brain_btn__:hover { filter: drop-shadow(0 4px 18px rgba(200,84,74,0.75)); }
    /* Docked mascot stays put at the bottom-right — the old cross-screen "pace"
       (it used to walk across the centered bar) would now fling it ~1020px off the
       right edge. Walking lives in the panel's walker lane, so this is a no-op now. */
    @keyframes __sb_mascot_pace__ {
      0%, 100% { translate: 0px 0px; }
    }
    html.__sb_movie_mode_active__,
    body.__sb_movie_mode_active__ {
      overflow: hidden !important;
      background: #05070b !important;
    }
    #__sb_movie_backdrop__ {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 240px;
      height: 135px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 50% 10%, rgba(255,255,255,0.07), transparent 48%),
        rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow:
        0 0 0 9999px rgba(3, 5, 10, 0.78),
        0 28px 100px rgba(0, 0, 0, 0.58),
        inset 0 1px 0 rgba(255,255,255,0.1);
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0.992);
      transition:
        top 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        left 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        width 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        height 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        border-radius 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        opacity 0.48s ease,
        transform 1.55s cubic-bezier(0.16, 0.92, 0.24, 1),
        box-shadow 1.55s cubic-bezier(0.16, 0.92, 0.24, 1);
      z-index: 2147483645;
      will-change: top, left, width, height, opacity, transform;
    }
    #__sb_movie_backdrop__.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    #__sb_movie_backdrop__.sb-movie-fullscreen {
      box-shadow:
        inset 0 0 0 3px rgba(118,214,255,0.18),
        inset 0 0 60px rgba(84,160,255,0.08);
      background:
        radial-gradient(circle at 50% 5%, rgba(118,214,255,0.06), transparent 40%),
        transparent;
      border: 1.5px solid rgba(118,214,255,0.14);
      border-radius: 0px !important;
      pointer-events: none;
    }
    .__sb_movie_mode_focus__ {
      scroll-margin: 10vh;
    }
    .__sb_movie_mode_video__ {
      filter: saturate(1.03) contrast(1.03) brightness(1.02);
    }

    /* ── Idle animations: float + arm swing + gaze drift + blink ── */
    #__sb_brain_btn__.sb-brain-idle {
      animation: __sb_idle_float__ 3.8s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite;
    }
    @keyframes __sb_idle_float__ {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-6px); }
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
    @keyframes __sb_brain_glow_movie__ {
      0%, 100% {
        filter: drop-shadow(0 2px 10px rgba(118,214,255,0.34));
        transform: scale(1);
      }
      50% {
        filter: drop-shadow(0 0 24px rgba(118,214,255,0.9)) drop-shadow(0 0 52px rgba(84,160,255,0.4));
        transform: scale(1.035);
      }
    }
    #__sb_brain_btn__.sb-brain-movie {
      animation: __sb_brain_glow_movie__ 2.4s ease-in-out infinite;
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
    #__sb_brain_btn__.sb-brain-auth,
    #__sb_cin_brain__.sb-brain-auth {
      animation: __sb_brain_glow_auth__ 0.85s ease-in-out infinite;
    }
    #__sb_brain_btn__.sb-brain-authed,
    #__sb_cin_brain__.sb-brain-authed {
      animation: __sb_brain_glow_authed__ 0.85s ease-in-out infinite;
    }
    @keyframes __sb_brain_glow_rejected__ {
      0%, 100% { filter: drop-shadow(0 2px 10px rgba(200,40,40,0.4)); }
      50% { filter: drop-shadow(0 0 30px rgba(255,80,80,1)) drop-shadow(0 0 55px rgba(200,40,40,0.65)); }
    }
    #__sb_brain_btn__.sb-brain-rejected,
    #__sb_cin_brain__.sb-brain-rejected {
      animation: __sb_brain_glow_rejected__ 0.85s ease-in-out infinite;
    }

    /* ── Reaction popup that floats up above the brain button ── */
    #__sb_reaction_pop__ {
      position: absolute;
      bottom: 100%;
      right: 8px;
      margin-bottom: 4px;
      font-size: 20px;
      line-height: 1;
      pointer-events: none;
      opacity: 0;
      transform: translateY(0px) scale(0.7);
      animation: __sb_reaction_float__ 1.9s cubic-bezier(0.22,1,0.36,1) forwards;
      z-index: 99999;
      user-select: none;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18));
    }
    @keyframes __sb_reaction_float__ {
      0%   { opacity: 0;   transform: translateY(0px)   scale(0.7); }
      12%  { opacity: 1;   transform: translateY(-6px)  scale(1.2); }
      38%  { opacity: 1;   transform: translateY(-18px) scale(1.0); }
      100% { opacity: 0;   transform: translateY(-44px) scale(0.85); }
    }
    /* Quick bounce when the brain swaps to an emotion SVG */
    @keyframes __sb_emotion_bounce__ {
      0%   { transform: scale(1)    rotate(0deg); }
      22%  { transform: scale(1.2)  rotate(-4deg); }
      52%  { transform: scale(0.93) rotate(2deg); }
      100% { transform: scale(1)    rotate(0deg); }
    }
    #__sb_brain_btn__.sb-emotion-active {
      animation: __sb_emotion_bounce__ 0.42s cubic-bezier(0.34,1.56,0.64,1) !important;
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
      border: none; background: rgba(255,251,247,0.55); border-radius: 8px;
      padding: 4px 8px 4px 9px; cursor: pointer; transition: background 0.15s;
      font-size: 11px; font-weight: 600; color: #3A2D24; white-space: nowrap;
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
      background: rgba(255, 240, 230, 0.07);
      border-radius: 18px;
      isolation: isolate;
      color: #1B1713;
      border: 1px solid rgba(255,255,255,0.55);
      box-shadow: 0 20px 60px rgba(27,23,19,0.18), 0 4px 14px rgba(27,23,19,0.07),
                  inset 2px 2px 1px rgba(255,255,255,0.65),
                  inset -1px -1px 1px rgba(255,255,255,0.3);
      backdrop-filter: blur(4px) saturate(160%) brightness(1.04);
      -webkit-backdrop-filter: blur(4px) saturate(160%) brightness(1.04);
      opacity: 0; transition: opacity 0.2s;
      pointer-events: none;
    }
    #__sb_bubble__::before {
      content: ""; position: absolute; inset: 0; border-radius: inherit;
      backdrop-filter: blur(20px) saturate(200%);
      -webkit-backdrop-filter: blur(20px) saturate(200%);
      filter: url(#__sb_glass_filter__);
      z-index: -1; pointer-events: none;
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
      background: rgba(255,255,255,0.1);
      border-bottom: 1px solid rgba(255,255,255,0.18);
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
    /* .sb-lec-ready kept for __sbShowLectureResultMessage which still uses it */
    .sb-lec-ready { display:flex; flex-direction:column; align-items:center; gap:12px; padding:22px 16px 18px; text-align:center; }
    .sb-lec-kicker { font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--sb-fg-3); }
    .sb-lec-ready-title { font-size:17px; font-weight:600; color:var(--sb-fg); line-height:1.3; }
    .sb-lec-ready-sub { font-size:12.5px; color:var(--sb-fg-2); line-height:1.5; max-width:220px; }

    /* ── Ready-to-Record redesign — Braino Ready-to-Record.html Outcome variant ── */
    .sb-ready-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 18px 14px; text-align:center; }
    .sb-ready-mascot { position:relative; display:flex; align-items:center; justify-content:center; width:72px; height:72px; flex-shrink:0; margin-bottom:2px; }
    .sb-ready-mascot-halo { position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle, rgba(232,120,110,0.38) 0%, rgba(243,154,66,0.16) 45%, transparent 68%); filter:blur(5px); animation:sbReadyHalo 4.2s ease-in-out infinite; pointer-events:none; }
    @keyframes sbReadyHalo { 0%,100%{transform:scale(1);opacity:0.85;} 50%{transform:scale(1.1);opacity:1;} }
    .sb-ready-mascot-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(232,120,110,0.45); opacity:0; }
    .sb-ready-mascot-ring-1 { inset:4px; animation:sbReadyRipple 3.6s ease-out infinite; }
    .sb-ready-mascot-ring-2 { inset:4px; animation:sbReadyRipple 3.6s ease-out infinite 1.8s; }
    @keyframes sbReadyRipple { 0%{inset:18px;opacity:0.4;} 100%{inset:-28px;opacity:0;} }
    .sb-ready-eyebrow { font-size:10px; font-weight:600; letter-spacing:0.17em; text-transform:uppercase; color:var(--sb-fg-3); display:inline-flex; align-items:center; gap:7px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace; }
    .sb-ready-headline { font-size:28px; font-weight:400; line-height:1.05; letter-spacing:-0.01em; color:var(--sb-fg); margin:2px 0 0; font-family:'Instrument Serif',Georgia,serif; }
    .sb-ready-copy { font-size:12.5px; line-height:1.55; color:var(--sb-fg-2); margin:0; max-width:28ch; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .sb-ready-preview { width:100%; border:1px solid var(--sb-q-border); border-radius:14px; background:var(--sb-q-bg); padding:11px 13px 13px; text-align:left; box-shadow:0 1px 0 rgba(255,255,255,0.1) inset; }
    .sb-ready-preview-label { font-size:9.5px; font-weight:600; letter-spacing:0.13em; text-transform:uppercase; color:var(--sb-fg-3); display:flex; align-items:center; gap:6px; margin-bottom:9px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace; }
    .sb-ready-preview-label::before { content:""; width:6px; height:6px; border-radius:50%; flex-shrink:0; background:#E8786E; animation:sbReadyPulse 1.8s ease-out infinite; }
    @keyframes sbReadyPulse { 0%{box-shadow:0 0 0 0 rgba(232,120,110,0.55);} 70%{box-shadow:0 0 0 5px rgba(232,120,110,0);} 100%{box-shadow:0 0 0 0 rgba(232,120,110,0);} }
    .sb-ready-chips { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
    .sb-ready-chip { font-size:11px; font-weight:500; color:var(--sb-link); background:rgba(232,120,110,0.14); border:1px solid rgba(232,120,110,0.24); padding:4px 9px; border-radius:7px; white-space:nowrap; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .sb-ready-lines { display:flex; flex-direction:column; gap:7px; }
    .sb-ready-line { height:5px; border-radius:3px; background:var(--sb-fg-3); opacity:0.45; }
    .sb-ready-btn { width:100%; height:52px; border:none; cursor:pointer; border-radius:14px; overflow:hidden; position:relative; background:linear-gradient(168deg,#F09A91 0%,#E8786E 44%,#CF5A50 100%); box-shadow:0 1px 0 rgba(255,255,255,0.5) inset,0 -2px 5px rgba(140,47,40,0.28) inset,0 12px 28px -10px rgba(201,84,74,0.62),0 2px 8px -2px rgba(201,84,74,0.32); display:flex; align-items:center; justify-content:center; gap:9px; color:white; font-size:15.5px; font-weight:600; letter-spacing:-0.01em; text-shadow:0 1px 1px rgba(140,47,40,0.28); transition:transform 0.15s ease,filter 0.15s ease; flex-shrink:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .sb-ready-btn:hover { transform:translateY(-1px); filter:brightness(1.04); }
    .sb-ready-btn:active { transform:translateY(0) scale(0.994); }
    .sb-ready-btn-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(70% 130% at 30% -20%,rgba(255,255,255,0.52),transparent 60%); opacity:0.55; }
    .sb-ready-mascot svg { animation:sbReadyFloat 3.5s ease-in-out infinite; }
    @keyframes sbReadyFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    .sb-ready-mascot #sbb-eye-l { animation:sbReadyBlink 4s ease-in-out infinite; }
    .sb-ready-mascot #sbb-eye-r { animation:sbReadyBlink 4s ease-in-out infinite 0.06s; }
    @keyframes sbReadyBlink { 0%,88%,100%{transform:scaleY(1)} 92%{transform:scaleY(0.08)} }
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
    .sb-meeting-artifacts { display:grid; gap:12px; margin-top:16px; }
    .sb-meeting-artifact-card { border:1px solid rgba(65,48,40,0.12); border-radius:16px; padding:12px; background:rgba(255,251,247,0.72); }
    .sb-meeting-artifact-kicker { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#A79B92; margin-bottom:7px; }
    .sb-meeting-artifact-title { font-size:13px; font-weight:600; color:#1B1713; margin-bottom:6px; line-height:1.4; }
    .sb-meeting-artifact-list { display:grid; gap:7px; margin:0; padding:0 0 0 16px; color:#413028; }
    .sb-meeting-artifact-list li { margin:0; }
    .sb-meeting-artifact-meta { font-size:11.5px; color:#8A7B73; line-height:1.45; }
    .sb-meeting-followup-quote { margin-top:8px; padding-left:10px; border-left:3px solid rgba(232,120,110,0.28); color:#705C50; font-size:11.5px; line-height:1.5; }
    .sb-meeting-followup-actions { display:flex; gap:8px; margin-top:10px; }
    .sb-meeting-followup-btn { flex:1; padding:8px 6px; border-radius:12px; border:1px solid rgba(65,48,40,0.16); background:transparent; color:#413028; font-size:11.5px; font-weight:600; cursor:pointer; transition:background 0.15s, opacity 0.15s; }
    .sb-meeting-followup-btn:hover { background:rgba(65,48,40,0.06); }
    .sb-meeting-followup-btn.accent { background:#E8786E; border-color:#E8786E; color:white; }
    .sb-meeting-followup-btn.accent:hover { background:#C9544A; border-color:#C9544A; }
    .sb-meeting-followup-btn:disabled { opacity:0.5; cursor:default; }
    .sb-meeting-followup-status { min-height:15px; margin-top:8px; font-size:11.5px; color:#8A7B73; line-height:1.45; }

    /* ── Cinema Dock: full-width centered dock bar ── */
    #__sb_bar__ {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%) translateY(24px) scale(0.97);
      display: flex; align-items: center; gap: 8px;
      /* Stays transparent liquid glass — legibility comes from a light text halo
         (see #__sb_input__ etc.) rather than an opaque backing. */
      background: rgba(255,251,247,0.12); border-radius: 100px;
      isolation: isolate;
      overflow: visible;
      padding: 10px 10px 10px 28px;
      border: 1px solid rgba(255,255,255,0.5);
      box-shadow: 0 8px 32px rgba(27,23,19,0.18), 0 2px 8px rgba(27,23,19,0.08),
                  inset 2px 2px 1px rgba(255,255,255,0.65),
                  inset -1px -1px 1px rgba(255,255,255,0.3);
      width: calc(100vw - 48px); max-width: 1100px;
      backdrop-filter: blur(6px) saturate(180%); -webkit-backdrop-filter: blur(6px) saturate(180%);
      pointer-events: none; opacity: 0;
      /* Below the walker lane so the climbing/strolling Braino renders in FRONT of the
         glass (behind it, the bar's backdrop-blur made the climber a blurred ghost). */
      z-index: 2147483645;
      transition: opacity 0.38s cubic-bezier(0.34,1.1,0.64,1), transform 0.38s cubic-bezier(0.34,1.1,0.64,1),
                  background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    }
    #__sb_bar__::before {
      content: ""; position: absolute; inset: 0; border-radius: inherit;
      backdrop-filter: blur(16px) saturate(200%);
      -webkit-backdrop-filter: blur(16px) saturate(200%);
      filter: url(#__sb_glass_filter__);
      z-index: -1; pointer-events: none;
    }
    #__sb_bar__.open { opacity: 1; pointer-events: all; transform: translateX(-50%) translateY(0) scale(1); }
    /* Coral send-pulse — a brief ring + warm glow each time a message is sent. */
    @keyframes __sb_bar_send__ {
      0%   { box-shadow: 0 0 0 0 rgba(232,120,110,0.55), 0 8px 32px rgba(27,23,19,0.18); }
      55%  { box-shadow: 0 0 0 6px rgba(232,120,110,0), 0 0 34px rgba(232,120,110,0.45), 0 8px 32px rgba(27,23,19,0.18); }
      100% { box-shadow: 0 0 0 0 rgba(232,120,110,0), 0 8px 32px rgba(27,23,19,0.18); }
    }
    #__sb_bar__.sb-send-pulse { animation: __sb_bar_send__ 0.7s ease-out; }
    /* Card is display-only now — the constant bottom bar is the single input. */
    #__sb_bubble__ .sb-card-footer { display: none !important; }
    /* Wake-up climb: bar is visible glass, expands from the center (scaleX driven in JS),
       and its inputs stay hidden until Braino has climbed on + authenticated. */
    #__sb_bar__.sb-climb { transform-origin: center center; }
    #__sb_bar__.sb-climb #__sb_input__,
    #__sb_bar__.sb-climb #__sb_mode_btn__,
    #__sb_bar__.sb-climb #__sb_rec_btn__,
    #__sb_bar__.sb-climb #__sb_send_btn__,
    #__sb_bar__.sb-climb #__sb_bar_close__,
    #__sb_bar__.sb-climb #__sb_x_auto_btn__ { opacity: 0; pointer-events: none; }
    /* ── Readable mode: opaque warm cream, dark text — always legible ── */
    #__sb_bar__.sb-readable {
      background: rgba(255,251,247,0.96);
      border: 1px solid rgba(65,48,40,0.12);
      box-shadow: 0 8px 28px rgba(27,23,19,0.14), 0 2px 8px rgba(27,23,19,0.07),
                  inset 0 1px 0 rgba(255,255,255,0.9);
      backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
    }
    #__sb_bar__.sb-readable::before { backdrop-filter: none; -webkit-backdrop-filter: none; filter: none; }
    #__sb_bar__.sb-readable #__sb_input__ { color: #1B1713; }
    #__sb_bar__.sb-readable #__sb_input__::placeholder { color: #A79B92; }
    #__sb_bar__.sb-readable #__sb_mode_btn__ { color: #413028; background: rgba(65,48,40,0.07); border-color: rgba(65,48,40,0.18); }
    #__sb_bar__.sb-readable #__sb_mode_btn__:hover { background: rgba(65,48,40,0.12); }
    #__sb_bar__.sb-readable .sb-bar-icon-btn { color: #6B5248; }
    #__sb_bar__.sb-readable .sb-bar-icon-btn:hover { background: rgba(65,48,40,0.08); color: #1B1713; }
    #__sb_bar__.sb-readable .sb-bar-icon-btn.active { background: #fee2e2; color: #C9544A; }
    #__sb_bar__.sb-readable #__sb_x_auto_btn__.running { background: #fef9c3; color: #a16207; }
    #__sb_bar__.sb-readable #__sb_wakeup_label__,
    #__sb_bar__.sb-readable #__sb_signin_cta_hint__ { color: #A79B92; }
    #__sb_bar__.sb-readable #__sb_wakeup_track__ { background: rgba(65,48,40,0.12); }
    /* ── Wake-up state ── */
    #__sb_wakeup__ {
      display: none; align-items: center; gap: 8px; flex: 1; min-width: 0;
    }
    #__sb_bar__.sb-waking #__sb_wakeup__ { display: flex; }
    #__sb_bar__.sb-waking #__sb_input__,
    #__sb_bar__.sb-waking #__sb_mode_btn__,
    #__sb_bar__.sb-waking #__sb_rec_btn__,
    #__sb_bar__.sb-waking #__sb_send_btn__,
    #__sb_bar__.sb-waking #__sb_bar_close__,
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
    #__sb_bar__.sb-signin #__sb_bar_close__,
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
      font-size: 16px; color: #1B1713; min-width: 0; padding: 0; line-height: 1.4;
      /* Light halo so the dark text stays legible on a transparent glass over dark pages. */
      text-shadow: 0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.7), 0 1px 1px rgba(255,255,255,0.8);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #__sb_input__::placeholder { color: #4A3D34; }
    .sb-bar-icon-btn {
      width: 38px; height: 38px; border-radius: 50%; border: none;
      background: transparent; color: #3A2D24; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s; padding: 0;
      /* Light halo so the stroke icons stay visible on a transparent glass over dark pages. */
      filter: drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.55));
    }
    .sb-bar-icon-btn:hover { background: rgba(65,48,40,0.08); }
    .sb-bar-icon-btn.active { background: #fee2e2; color: #C9544A; }
    #__sb_x_auto_btn__.running { background: #fef9c3; color: #a16207; }
    #__sb_send_btn__ { background: #E8786E !important; color: white !important; width: 42px !important; height: 42px !important; }
    #__sb_send_btn__:hover { background: #C9544A !important; }
    #__sb_card_wrap__ {
      position: fixed; z-index: 2147483648; top: 50%; left: 50%;
      transform: translate(-50%, -50%); width: min(820px, calc(100vw - 32px));
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
      --sb-bg: rgba(255,255,255,0.04); --sb-border: rgba(255,255,255,0.38);
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
      box-shadow: 0 40px 100px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.18),
                  inset 2px 2px 1px rgba(255,255,255,0.25),
                  inset -1px -1px 1px rgba(255,255,255,0.15);
      backdrop-filter: blur(4px) saturate(180%);
      -webkit-backdrop-filter: blur(4px) saturate(180%);
      isolation: isolate;
      color: var(--sb-fg); resize: none;
      transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease,
                  color 0.35s ease, backdrop-filter 0.35s ease;
    }
    /* ── Readable mode: opaque warm cream, dark text — always legible on any bg ── */
    /* Glassmorphism alternate — translucent frosted panel (NOT opaque white) with dark,
       readable text. You can still see the page through it. */
    #__sb_bubble__.sb-readable {
      --sb-fg: #1B1713; --sb-fg-2: rgba(27,23,19,0.82); --sb-fg-3: rgba(27,23,19,0.5);
      --sb-bg: rgba(255,251,247,0.5); --sb-border: rgba(255,255,255,0.55);
      --sb-q-bg: rgba(65,48,40,0.08); --sb-q-border: rgba(65,48,40,0.12);
      --sb-footer-border: rgba(65,48,40,0.1); --sb-footer-bg: rgba(65,48,40,0.04);
      --sb-code-bg: rgba(65,48,40,0.1); --sb-code-fg: #b44b42;
      --sb-pre-bg: rgba(27,23,19,0.08); --sb-pre-fg: #1B1713;
      --sb-bq-border: rgba(201,84,74,0.4); --sb-bq-fg: rgba(27,23,19,0.65);
      --sb-hr: rgba(65,48,40,0.12); --sb-link: #C9544A;
      --sb-btn-fg: rgba(65,48,40,0.8); --sb-btn-bg: rgba(65,48,40,0.08);
      --sb-btn-hover: rgba(65,48,40,0.15); --sb-rec-border: rgba(65,48,40,0.12);
      backdrop-filter: blur(22px) saturate(170%);
      -webkit-backdrop-filter: blur(22px) saturate(170%);
      box-shadow: 0 16px 40px rgba(27,23,19,0.16), 0 4px 12px rgba(27,23,19,0.08),
                  inset 0 1px 0 rgba(255,255,255,0.55);
    }
    #__sb_bubble__.sb-readable .sb-turn + .sb-turn { border-top-color: rgba(65,48,40,0.08); }
    #__sb_bubble__.sb-readable::before { backdrop-filter: none; -webkit-backdrop-filter: none; filter: none; }
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
    #__sb_bubble__ .sb-turn + .sb-turn { border-top-color: rgba(255,255,255,0.08); }
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
    /* Compare skill choice card — reuses the X draft card's visual language. */
    .sb-compare-card {
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
    .sb-compare-kicker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #17120E;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .sb-compare-kicker::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 99px;
      background: #17120E;
      box-shadow: 0 0 12px rgba(23,18,14,0.28);
    }
    .sb-compare-card h2 {
      margin: 0;
      color: #17120E;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 22px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    .sb-compare-card p {
      margin: 0;
      color: rgba(27,23,19,0.66);
      font-size: 13px;
      line-height: 1.5;
    }
    .sb-compare-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .sb-compare-btn {
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
    .sb-compare-btn:hover { transform: translateY(-1px); background: rgba(65,48,40,0.13); }
    .sb-compare-btn.primary {
      color: #fff;
      background: #17120E;
      box-shadow: 0 10px 22px rgba(23,18,14,0.18);
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
    #__sb_brain_btn__.hp-connecting { animation: __sb_hp_connect__    1.6s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-listening  { animation: __sb_hp_listen__     2.2s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-captured   { animation: __sb_hp_captured__   2s   ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-speaking   { animation: __sb_hp_speak__      0.9s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    /* Talking mouth on the docked brain while it speaks in voice mode (the walker has its
       own; this covers the case where the docked mascot is the one on screen). */
    #__sb_brain_btn__.hp-speaking #sbb-talk { display: block !important; animation: __sb_brain_talk__ 0.26s ease-in-out infinite; }
    /* Glasses on the docked brain when Braino is asked to "wear specs". */
    #__sb_brain_btn__.sb-glasses #sbb-specs { display: block !important; }
    @keyframes __sb_brain_talk__ {
      0%, 100% { transform: scaleY(0.28); }
      50%      { transform: scaleY(1.05); }
    }
    /* Realtime overrides — blue halo wins */
    #__sb_brain_btn__.hp-realtime.hp-connecting { animation: __sb_hp_connect_rt__  1.6s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-listening  { animation: __sb_hp_listen_rt__   2.2s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-captured   { animation: __sb_hp_captured_rt__ 2s   ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.hp-realtime.hp-speaking   { animation: __sb_hp_speak_rt__    0.9s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    @keyframes __sb_hp_listen_movie_rt__ {
      0%,100% { filter: drop-shadow(0 0 20px rgba(56,189,248,0.82)) drop-shadow(0 0 8px rgba(125,211,252,0.5)); transform: scale(1); }
      50%      { filter: drop-shadow(0 0 34px rgba(103,232,249,0.96)) drop-shadow(0 0 14px rgba(59,130,246,0.64)); transform: scale(1.035); }
    }
    @keyframes __sb_hp_speak_movie_rt__ {
      0%,100% { filter: drop-shadow(0 0 18px rgba(34,211,238,0.78)) drop-shadow(0 0 8px rgba(99,102,241,0.45)); transform: scale(1); }
      50%      { filter: drop-shadow(0 0 34px rgba(103,232,249,0.98)) drop-shadow(0 0 15px rgba(129,140,248,0.66)); transform: scale(1.05); }
    }
    @keyframes __sb_hp_capture_movie_rt__ {
      0%,100% { filter: drop-shadow(0 0 20px rgba(45,212,191,0.8)) drop-shadow(0 0 8px rgba(34,211,238,0.42)); }
      50%      { filter: drop-shadow(0 0 32px rgba(94,234,212,0.94)) drop-shadow(0 0 13px rgba(59,130,246,0.5)); }
    }
    @keyframes __sb_hp_connect_movie_rt__ {
      0%,100% { filter: drop-shadow(0 0 16px rgba(125,211,252,0.6)) drop-shadow(0 0 7px rgba(56,189,248,0.32)); }
      50%      { filter: drop-shadow(0 0 27px rgba(125,211,252,0.84)) drop-shadow(0 0 12px rgba(34,211,238,0.5)); }
    }
    /* ── Sonar Pulse — plays ONLY while the USER is actively talking (hp-hearing) ──
       Imported from the "Braino Listening" design. The realtime VAD sets hp-hearing on
       speech_started and clears it on speech_stopped, so coral rings ripple out only while you
       speak. When you're not talking and Braino isn't talking (hp-listening / hp-captured) it
       sits in its calm idle; when Braino replies (hp-speaking) the mouth animation plays. */
    @keyframes __sb_sonar_ring__ {
      0%   { transform: translate(-50%,-50%) scale(0.5);  opacity: 0; }
      12%  { opacity: 0.6; }
      100% { transform: translate(-50%,-50%) scale(3.6);  opacity: 0; }
    }
    @keyframes __sb_sonar_core__ {
      0%,100% { filter: drop-shadow(0 0 12px rgba(232,120,110,0.35)); }
      50%      { filter: drop-shadow(0 0 20px rgba(232,120,110,0.55)); }
    }
    #__sb_brain_btn__.hp-hearing,
    #__sb_brain_btn__.hp-realtime.hp-hearing {
      animation: __sb_sonar_core__ 2.2s ease-in-out infinite;
      overflow: visible;
    }
    #__sb_brain_btn__.hp-hearing::before,
    #__sb_brain_btn__.hp-hearing::after {
      content: ""; position: absolute; left: 50%; top: 50%;
      width: 56px; height: 56px; border-radius: 50%;
      border: 2px solid rgba(232,120,110,0.5);
      transform: translate(-50%,-50%) scale(0.5);
      pointer-events: none; z-index: -1;
      animation: __sb_sonar_ring__ 2.4s ease-out infinite;
    }
    #__sb_brain_btn__.hp-hearing::after { animation-delay: 1.2s; }
    /* Waiting / processing — nobody's talking → calm idle float, no glow (overrides the old
       blue listening/captured glows, incl. the realtime variants). */
    #__sb_brain_btn__.hp-listening,
    #__sb_brain_btn__.hp-captured,
    #__sb_brain_btn__.hp-realtime.hp-listening,
    #__sb_brain_btn__.hp-realtime.hp-captured {
      animation: __sb_idle_float__ 3.8s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite;
      filter: none;
    }
    #__sb_brain_btn__.sb-brain-movie.hp-realtime.hp-connecting { animation: __sb_hp_connect_movie_rt__ 1.6s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.sb-brain-movie.hp-realtime.hp-listening  { animation: __sb_hp_listen_movie_rt__  2.2s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.sb-brain-movie.hp-realtime.hp-captured   { animation: __sb_hp_capture_movie_rt__ 2s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    #__sb_brain_btn__.sb-brain-movie.hp-realtime.hp-speaking   { animation: __sb_hp_speak_movie_rt__   0.9s ease-in-out infinite, __sb_mascot_pace__ 32s ease-in-out infinite; }
    /* ── Headphone mode: continuous BLUE shimmer around the bar ──
       A steady blue glow ring (always on while engaged) plus a light sweep that
       travels across the bar — no orange, no blink. */
    #__sb_bar__.hp-active {
      box-shadow: 0 0 0 1.5px rgba(56,189,248,0.55), 0 0 22px rgba(56,189,248,0.40),
                  0 0 46px rgba(59,130,246,0.24), 0 8px 32px rgba(27,23,19,0.18),
                  inset 2px 2px 1px rgba(255,255,255,0.65), inset -1px -1px 1px rgba(255,255,255,0.3);
      border-color: rgba(125,211,252,0.7);
    }
    @keyframes __sb_bar_sweep__ {
      0%   { background-position: 130% 0; }
      100% { background-position: -130% 0; }
    }
    #__sb_bar__.hp-active::after {
      content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(105deg, transparent 38%, rgba(125,211,252,0.45) 50%, transparent 62%);
      background-size: 220% 100%;
      animation: __sb_bar_sweep__ 2.6s linear infinite;
      mix-blend-mode: screen; z-index: 1;
    }
    /* Listening intensifies the ring slightly so the user knows Braino is hearing them. */
    #__sb_bar__.hp-active.hp-listening {
      box-shadow: 0 0 0 2px rgba(59,130,246,0.65), 0 0 28px rgba(56,189,248,0.5),
                  0 0 56px rgba(59,130,246,0.3), 0 8px 32px rgba(27,23,19,0.18),
                  inset 2px 2px 1px rgba(255,255,255,0.65), inset -1px -1px 1px rgba(255,255,255,0.3);
    }
    /* Cinematic wakeup state — brain centered, bar transparent */
    #__sb_bar__.sb-cinematic {
      background: transparent; border-color: transparent; box-shadow: none;
    }
    #__sb_bar__.sb-cinematic::before { display: none; }
    #__sb_bar__.sb-cinematic #__sb_input__,
    #__sb_bar__.sb-cinematic #__sb_mode_btn__,
    #__sb_bar__.sb-cinematic #__sb_rec_btn__,
    #__sb_bar__.sb-cinematic #__sb_send_btn__,
    #__sb_bar__.sb-cinematic #__sb_bar_close__,
    #__sb_bar__.sb-cinematic #__sb_x_auto_btn__,
    #__sb_bar__.sb-cinematic #__sb_wakeup__ { display: none !important; }
    /* (The docked brain button now lives in #__sb_root__, independent of the bar.
       It is hidden in PANEL state from JS — see __sbOpenBarReady / __sbDock.) */

    /* ── Walker lane — Braino strolls directly above the bar, matched to the bar's
       own width so it never wanders off past the bar edges. ── */
    #__sb_walk_lane__ {
      position:fixed; bottom:78px; left:50%; transform:translateX(-50%);
      width:calc(100vw - 48px); max-width:1100px; height:96px;
      pointer-events:none; z-index:2147483646; overflow:visible;
      display:none;
    }
    /* No filter here — element gets a JS transform, and filter+transform on the
       same node breaks the SVG url(#sbb-fill) coral gradient (Chrome bug). Shadow
       is handled by the dedicated #__sbwk_shadow__ div instead. */
    #__sbwk_walker__ {
      position:absolute; bottom:0; width:64px;
      pointer-events:auto; cursor:grab;
      touch-action:none; user-select:none; -webkit-user-select:none;
      will-change:transform;
    }
    /* "not cool 😒" speech bubble shown when Braino is flung */
    #__sbwk_say__ {
      position:absolute; left:50%; bottom:calc(100% - 4px);
      transform:translateX(-50%) translateY(4px) scale(0.9);
      background:rgba(27,23,19,0.92); color:#fff;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:12px; font-weight:600; line-height:1.2;
      padding:5px 10px; border-radius:12px; white-space:nowrap;
      pointer-events:none; opacity:0; z-index:6;
      transition:opacity .18s ease, transform .18s ease;
      box-shadow:0 4px 14px rgba(27,23,19,0.28);
    }
    #__sbwk_say__.show { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    #__sbwk_say__::after {
      content:""; position:absolute; top:100%; left:50%; transform:translateX(-50%);
      border:5px solid transparent; border-top-color:rgba(27,23,19,0.92);
    }
    #__sbwk_flip__ { transform-origin:center; display:block; }
    #__sbwk_shadow__ {
      position:absolute; left:50%; bottom:-4px; width:42px; height:8px;
      transform:translateX(-50%); border-radius:50%;
      background:radial-gradient(closest-side, rgba(120,60,40,.26), transparent 78%);
    }
    /* Headphone-mode glow on the walking mascot. The filter sits on the <svg> (which
       itself never gets a transform — those go on #__sbwk_walker__ / the inner <g>),
       so the coral self-contained gradient is never disturbed. Blue tones only. */
    /* Listening glow is now CORAL (Sonar Pulse), not blue — paired with the ripple rings below. */
    @keyframes __sbwk_glow_listen__ {
      0%,100% { filter: drop-shadow(0 0 10px rgba(232,120,110,0.55)) drop-shadow(0 0 4px rgba(246,168,162,0.4)); }
      50%      { filter: drop-shadow(0 0 18px rgba(232,120,110,0.75)) drop-shadow(0 0 8px rgba(246,168,162,0.55)); }
    }
    @keyframes __sbwk_glow_speak__ {
      0%,100% { filter: drop-shadow(0 0 10px rgba(99,102,241,0.75)) drop-shadow(0 0 4px rgba(139,92,246,0.5)); }
      50%      { filter: drop-shadow(0 0 20px rgba(99,102,241,0.95)) drop-shadow(0 0 9px rgba(139,92,246,0.65)); }
    }
    @keyframes __sbwk_glow_soft__ {
      0%,100% { filter: drop-shadow(0 0 8px rgba(56,189,248,0.6)); }
      50%      { filter: drop-shadow(0 0 16px rgba(56,189,248,0.85)); }
    }
    /* Sonar Pulse on the WALKER (the Braino on the message bar) — ONLY while the user is talking
       (hp-hearing): coral body glow + ripple rings centered on Braino. They ride the walker's
       transform so they stay put. On hp-speaking they're gone and the mouth animation plays;
       while waiting (hp-listening/hp-captured) the walker just stands and breathes — no glow. */
    #__sbwk_walker__.hp-hearing svg { animation: __sbwk_glow_listen__ 2s ease-in-out infinite; }
    #__sbwk_walker__.hp-hearing::before,
    #__sbwk_walker__.hp-hearing::after {
      content: ""; position: absolute; left: 50%; top: 46%;
      width: 52px; height: 52px; border-radius: 50%;
      border: 2px solid rgba(232,120,110,0.5);
      transform: translate(-50%,-50%) scale(0.5);
      pointer-events: none; z-index: -1;
      animation: __sb_sonar_ring__ 2.4s ease-out infinite;
    }
    #__sbwk_walker__.hp-hearing::after { animation-delay: 1.2s; }
    #__sbwk_walker__.hp-speaking svg  { animation: __sbwk_glow_speak__ 1s ease-in-out infinite; }
    #__sbwk_walker__.hp-connecting svg { animation: __sbwk_glow_soft__ 1.6s ease-in-out infinite; }
    /* Wake-up auth glow on the climbing mascot (gold pulse → green flash on success). */
    @keyframes __sbwk_glow_auth__ {
      0%,100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.3)); }
      50%      { filter: drop-shadow(0 0 26px rgba(255,210,50,1)) drop-shadow(0 0 50px rgba(255,175,0,0.6)); }
    }
    @keyframes __sbwk_glow_authed__ {
      0%,100% { filter: drop-shadow(0 2px 12px rgba(40,180,70,0.45)); }
      50%      { filter: drop-shadow(0 0 28px rgba(80,230,110,1)) drop-shadow(0 0 54px rgba(40,180,70,0.7)); }
    }
    #__sbwk_walker__.sbwk-auth svg   { animation: __sbwk_glow_auth__ 0.85s ease-in-out infinite; }
    #__sbwk_walker__.sbwk-authed svg { animation: __sbwk_glow_authed__ 0.85s ease-in-out infinite; }

    /* ── Jump & Point laser overlay (ring + beam + callout) ── */
    #__sb_point_fx__ {
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 2147483644;
    }
    #__sb_point_svg__ {
      position: absolute; inset: 0; width: 100%; height: 100%;
      overflow: visible; pointer-events: none;
    }
    #__sb_point_callout__ {
      position: absolute; pointer-events: none; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 12px; border-radius: 11px;
      background: oklch(0.7 0.16 48); color: #1a0f0c;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 600; font-size: 13.5px;
      box-shadow: 0 14px 30px -12px rgba(0,0,0,.6);
      opacity: 0; transition: opacity .18s ease;
    }

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
  // The docked mascot lives in the root (an independent bottom-right anchor), NOT inside
  // the bar — the bar is opacity:0 when closed, which used to trap/hide the docked brain.
  const __sbBrainBtnEl = document.createElement("div");
  __sbBrainBtnEl.id = "__sb_brain_btn__";
  __sbBrainBtnEl.innerHTML = __SB_BRAIN_SVG;
  root.appendChild(__sbBrainBtnEl);
  (document.documentElement||document.body).appendChild(root);

  // ── Brain gradient defs at document root — MUST be first in DOM so url(#sbb-fill) etc.
  // resolve from here rather than from inside composited/filtered elements (Chrome bug where
  // translate animation + filter on same element breaks SVG url() paint server lookup).
  const __sbGlassSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  __sbGlassSvg.id = "__sb_glass_svg__";
  __sbGlassSvg.setAttribute("style", "position:fixed;pointer-events:none;width:0;height:0;overflow:hidden");
  __sbGlassSvg.innerHTML = `<defs><linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbb-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient><filter id="__sb_glass_filter__" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/><feComponentTransfer in="turbulence" result="mapped"><feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/><feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/><feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/></feComponentTransfer><feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/><feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight"><fePointLight x="-200" y="-200" z="300"/></feSpecularLighting><feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/><feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
  (document.documentElement||document.body).appendChild(__sbGlassSvg);

  // Cinema dock bar — body-level so it can span full width independently
  const __sbDockBar = document.createElement("div");
  __sbDockBar.id = "__sb_bar__";
  __sbDockBar.innerHTML = `
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
      <button id="__sb_bar_close__" class="sb-bar-icon-btn" title="Dock Braino (Esc)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
  `;
  (document.documentElement||document.body).appendChild(__sbDockBar);

  // ── Glass SVG (with brain gradients + displacement filter) appended before bar — see above ──

  if (__sbCursorRideMode) {
    __sbPositionRootNearCursor(true);
    __sbScheduleCursorFollow();
  } else {
    __sbAnchorRootBottomRight();
  }

  const movieBackdrop = document.createElement("div");
  movieBackdrop.id = "__sb_movie_backdrop__";
  (document.documentElement||document.body).appendChild(movieBackdrop);

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
        <button class="sb-card-header-btn" id="__sb_theme_toggle_btn__" type="button" title="Toggle readable mode" style="padding:0 8px;font-size:13px;">◑</button>
        <button class="sb-card-header-btn" id="__sb_newtab_btn__" type="button" title="Open current page in new tab" style="padding:0 8px;font-size:12px;">↗ New tab</button>
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
  (document.documentElement||document.body).appendChild(cardWrap);

  // ── Voice Error Pill ──
  const errPill = document.createElement("div");
  errPill.id = "__sb_voice_error_pill__";
  (document.documentElement||document.body).appendChild(errPill);

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
  (document.documentElement||document.body).appendChild(modeDd);

  const connectorDd = document.createElement("div");
  connectorDd.id = "__sb_connector_dropdown__";
  connectorDd.className = "sb-dropdown";
  connectorDd.innerHTML = `
    <div class="sb-dropdown-label">Connector</div>
    <button class="sb-dropdown-item selected" data-connector="auto"><span class="sb-di-icon">↗</span><span class="sb-di-label">Auto detect</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-connector="google-drive"><span class="sb-di-icon">🗂</span><span class="sb-di-label">Google Drive</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-connector="google-calendar"><span class="sb-di-icon">📅</span><span class="sb-di-label">Google Calendar</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-connector="gmail"><span class="sb-di-icon">✉</span><span class="sb-di-label">Gmail</span><span class="sb-di-check">✓</span></button>
  `;
  (document.documentElement||document.body).appendChild(connectorDd);

  const connectorSlashDd = document.createElement("div");
  connectorSlashDd.id = "__sb_connector_slash_dropdown__";
  connectorSlashDd.className = "sb-dropdown";
  (document.documentElement||document.body).appendChild(connectorSlashDd);

  const modelDd = document.createElement("div");
  modelDd.id = "__sb_model_dropdown__";
  modelDd.className = "sb-dropdown";
  modelDd.innerHTML = `
    <div class="sb-dropdown-label">AI Model</div>
    <button class="sb-dropdown-item selected" data-model="lovable"><span class="sb-di-icon">🧠</span><span class="sb-di-label">Braino AI</span><span class="sb-di-check">✓</span></button>
    <button class="sb-dropdown-item" data-model="claude"><span class="sb-di-icon">✦</span><span class="sb-di-label">Claude</span><span class="sb-di-check">✓</span></button>
  `;
  (document.documentElement||document.body).appendChild(modelDd);

  __sbSyncFullscreenUiMount();
  if (!__sbFullscreenUiListenerBound) {
    __sbFullscreenUiListenerBound = true;
    document.addEventListener("fullscreenchange", () => {
      requestAnimationFrame(() => {
        __sbSyncFullscreenUiMount();
        if (__sbMovieModeActive) void __sbRefreshMovieMode({ allowRetarget: true });
      });
    });
  }
  __sbStartPassiveMovieSync();

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
  __sbStorageGet(["sbBrainDocked", "sbBrainExpanded", "sbVoiceModeOn"]).then(({ sbBrainDocked, sbBrainExpanded, sbVoiceModeOn }) => {
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
    } else if (sbBrainExpanded && document.visibilityState === "visible") {
      // Panel was expanded when this tab opened (e.g. Delegate opened a new tab mid-task).
      // Auto-open the centered glass panel + walker here too so Braino travels seamlessly
      // across tabs instead of collapsing to the docked button. Instant open (no wake-climb);
      // __sbOpenPanel falls back to the sign-in state if the user isn't authed. Hidden tabs
      // stay docked until focused — mirrors the voice-presence path above.
      __sbOpenPanel();
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
      // Docked mascot is only visible/clickable in DOCKED state → open the panel.
      __sbOpenPanel();
    }
  });

  // ⌘I / Ctrl+I — toggle brain. Double-tap Space — primary invoke (cycles the loop).
  let __sbLastCtrlTap = 0;
  let __sbLastSpaceTap = 0;
  document.addEventListener("keydown", (e) => {
    // Double-tap Control → toggle headphone mode.
    if (e.key === "Control") {
      if (!e.repeat && !e.metaKey && !e.altKey && !e.shiftKey) {
        const now = Date.now();
        if (now - __sbLastCtrlTap < 400) {
          __sbLastCtrlTap = 0;
          if (!__sbHasExternalEditableFocus()) {
            if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
            __sbToggleHeadphoneMode();
          }
        } else {
          __sbLastCtrlTap = now;
        }
      }
      return;
    }
    __sbLastCtrlTap = 0;   // any other key breaks the double-tap (Ctrl+key combos don't count)

    // Double-tap Space → invoke / cycle Braino (OFF→PANEL plays the climb wake-up).
    // Ignored while typing in ANY field (page or Braino's own bar) so it never eats text.
    if (e.code === "Space") {
      const ae = document.activeElement;
      const typing = ae instanceof Element && (
        ae.isContentEditable || ae.getAttribute("contenteditable") === "true" ||
        ae.getAttribute("role") === "textbox" ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)
      );
      if (typing || e.repeat || e.metaKey || e.ctrlKey || e.altKey) { __sbLastSpaceTap = 0; return; }
      const now = Date.now();
      if (now - __sbLastSpaceTap < 400) {
        __sbLastSpaceTap = 0;
        e.preventDefault(); e.stopPropagation();   // swallow the scroll on the invoking tap
        if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
        __sbToggleBrain();
      } else {
        __sbLastSpaceTap = now;
      }
      return;
    }
    __sbLastSpaceTap = 0;

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

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "m") {
      if (__sbHasExternalEditableFocus()) return;
      e.preventDefault();
      e.stopPropagation();
      if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
      __sbToggleMovieMode();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "i") {
      // Only bail when typing in a PAGE field — NOT when Braino's own bar is focused
      // (that guard was blocking the cycle right after the panel opened).
      if (__sbHasExternalEditableFocus()) return;
      e.preventDefault();
      __sbToggleBrain();
    }
  }, true);

  // Bar buttons
  document.getElementById("__sb_send_btn__").addEventListener("click", __sbSendMessage);
  document.getElementById("__sb_rec_btn__").addEventListener("click", __sbToggleHeadphoneMode);
  // × on the bar collapses the panel back down to the docked bottom-right mascot.
  document.getElementById("__sb_bar_close__")?.addEventListener("click", () => __sbDock());

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
  document.getElementById("__sb_newtab_btn__").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openTab", url: window.location.href, active: true }, () => { void chrome.runtime.lastError; });
  });
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

  // ── Theme toggle (glass ↔ readable) ──
  const __sbThemeBtn = document.getElementById("__sb_theme_toggle_btn__");
  const __sbApplyTheme = (mode) => {
    const isReadable = mode === "readable";
    // Theme applies to the answer CARD only. The bottom bar stays transparent glass
    // (legibility there comes from the text halo), so we never force it opaque.
    bubble.classList.toggle("sb-readable", isReadable);
    __sbThemeBtn.textContent = isReadable ? "◐" : "◑";
    __sbThemeBtn.title = isReadable ? "Switch to liquid glass" : "Switch to clear glass (readable)";
  };
  // Default = liquid glass. The toggle switches to a translucent glassmorphism (still
  // see-through, but readable) for when the liquid glass makes the page hard to read.
  chrome.storage.local.get("sbTheme", ({ sbTheme }) => __sbApplyTheme(sbTheme || "glass"));
  __sbThemeBtn.addEventListener("click", () => {
    const next = bubble.classList.contains("sb-readable") ? "glass" : "readable";
    __sbApplyTheme(next);
    chrome.storage.local.set({ sbTheme: next });
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
      { connector: "google-calendar", icon: "📅", label: "Google Calendar", aliases: ["calendar", "cal", "gcal"] },
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
        const shortName = connector === "google-drive" ? "drive" : connector === "google-calendar" ? "calendar" : connector;
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
    if (e.key === "Escape") __sbDock();   // collapse panel → docked bottom-right mascot
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

function __sbGetFullscreenUiHost() {
  const fullscreenEl = document.fullscreenElement;
  if (fullscreenEl && fullscreenEl instanceof Element) return fullscreenEl;
  return document.body || document.documentElement;
}

function __sbSyncFullscreenUiMount() {
  const host = __sbGetFullscreenUiHost();
  if (!host) return;
  const ids = [
    "__sb_root__",
    "__sb_movie_backdrop__",
    "__sb_card_wrap__",
    "__sb_voice_error_pill__",
    "__sb_mode_dropdown__",
    "__sb_connector_dropdown__",
    "__sb_connector_slash_dropdown__",
    "__sb_model_dropdown__",
  ];

  for (const id of ids) {
    const node = document.getElementById(id);
    if (!node || node.parentElement === host) continue;
    try {
      host.appendChild(node);
    } catch (_) {
      const fallback = document.body || document.documentElement;
      if (fallback && node.parentElement !== fallback) {
        try { fallback.appendChild(node); } catch (_) {}
      }
    }
  }

  if (document.fullscreenElement) {
    __sbAnchorRootBottomRight();
    return;
  }

  if (__sbCursorRideMode) {
    __sbPositionRootNearCursor(true);
    __sbScheduleCursorFollow();
  } else {
    __sbAnchorRootBottomRight();
  }
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
  if (active.closest("#__sb_root__, #__sb_card_wrap__, #__sb_bar__")) return false;
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
  // In headphone mode: keep bar visible, suppress automated card opens (voice is the UI)
  if (__sbHeadphoneMode && !options.forceOpen) return;
  // The bar stays constant as the single input — the card is display-only (answers).
  // Keep the bar open and Braino strolling on it while the answer card is up.
  const alreadyOpen = wrap.classList.contains("visible");
  wrap.classList.add("visible");
  if (!alreadyOpen) {
    wrap.classList.add("animating-in");
    requestAnimationFrame(() => setTimeout(() => wrap.classList.remove("animating-in"), 400));
  }
  if (options.rich) setTimeout(() => __sbStartOrbit(), 60);
  else __sbStopOrbit();
  const bubble = wrap.querySelector("#__sb_bubble__");
  // theme (glass/readable) is persisted separately via __sbThemeBtn init — no override here
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
    // Bar stays open with the card now, so the walker is already running — only
    // (re)start it if something actually stopped it (don't teleport mid-stroll).
    const lane = document.getElementById("__sb_walk_lane__");
    if (!lane || lane.style.display === "none") __sbStartWalkLoop();
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
  if (__sbXStopReason !== 'manual' && count > 0) __sbPlayReaction('celebrating', 2800);
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

// ── Three-state presence model ──────────────────────────────────────────────
//   OFF    — Braino not on the page          (__sbBrainVisible = false)
//   DOCKED — idle mascot bottom-right         (visible, !__sbInputOpen)
//   PANEL  — glass bar open, Braino walking   (visible, __sbInputOpen)
// Cmd+I cycles OFF → PANEL → DOCKED → OFF. Clicking the docked mascot opens PANEL;
// the bar's × button docks it back; closing from DOCKED via Cmd+I hides it entirely.

// PANEL: open the glass bar with the walker on top (mascot hidden while walking).
function __sbOpenPanel() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  const wasOff = !__sbBrainVisible;             // OFF→PANEL plays the full climb wake-up
  __sbBrainVisible = true;
  __sbSetCursorRideMode(false);
  const btn = document.getElementById("__sb_brain_btn__");
  if (btn) btn.style.display = "none";          // walker is the mascot in PANEL
  __sbToggleInput(true, { skipPersist: true, wakeClimb: wasOff });
  if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: true, sbBrainExpanded: true });
}

// DOCKED: collapse the panel and let Braino sit at the bottom-right, watching.
function __sbDock() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  __sbBrainVisible = true;
  __sbSetCursorRideMode(false);
  __sbToggleInput(false, { skipPersist: true }); // closes bar, stops walker
  const wrap = document.getElementById("__sb_card_wrap__");
  if (wrap) wrap.classList.remove("visible");
  __sbStopOrbit();
  const btn = document.getElementById("__sb_brain_btn__");
  if (btn) btn.style.display = "";
  __sbSyncIdleState();
  if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: true, sbBrainExpanded: false });
}

// OFF: take Braino off the page entirely.
function __sbHideAll() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  __sbBrainVisible = false;
  __sbSetCursorRideMode(false);
  if (__sbMovieModeActive) __sbDeactivateMovieMode({ silent: true });
  const btn = document.getElementById("__sb_brain_btn__");
  if (btn) btn.style.display = "none";
  __sbToggleInput(false, { skipPersist: true });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  const wrap = document.getElementById("__sb_card_wrap__");
  if (wrap) wrap.classList.remove("visible");
  __sbStopOrbit();
  if (__sbContextOk()) chrome.storage.local.set({ sbBrainDocked: false, sbBrainExpanded: false });
}

// Cmd+I — cycle through the three states.
function __sbToggleBrain() {
  if (!__sbOwnsInlineUi()) return;
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  if (!__sbBrainVisible) __sbOpenPanel();   // OFF → PANEL
  else if (__sbInputOpen) __sbDock();        // PANEL → DOCKED
  else __sbHideAll();                        // DOCKED → OFF
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
      bar.classList.remove("sb-signin", "sb-waking", "sb-cinematic");
      bar.classList.add("open");
      // PANEL: the walker is the mascot — hide the docked bottom-right brain button.
      const __dockBtn = document.getElementById("__sb_brain_btn__");
      if (__dockBtn) __dockBtn.style.display = "none";
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
      // Start walk cycle — legs + body animation from braino-char.jsx design
      __sbStartWalkLoop();
    };

    // OFF→PANEL plays the full climb wake-up; DOCKED→PANEL (and other opens) are instant.
    if (options.wakeClimb) {
      chrome.storage.local.set({ sbHasAwoken: true });

      // Bar expands from the center outward while Braino climbs onto it.
      bar.classList.remove("sb-signin", "sb-waking", "sb-cinematic");
      bar.classList.add("open", "sb-climb");
      bar.style.transition = "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)";
      bar.style.transform = "translateX(-50%) scaleX(0.04)";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.transform = "translateX(-50%) scaleX(1)";
      }));

      const finishAuthed = () => {
        bar.classList.remove("sb-climb");
        bar.style.transition = ""; bar.style.transform = "";
        __sbOpenBarReady();
      };
      const finishRejected = () => {
        bar.classList.remove("sb-climb");
        bar.style.transition = ""; bar.style.transform = "";
        bar.classList.add("sb-signin");
        if (!options.skipPersist) chrome.storage.local.set({ sbBrainExpanded: false });
        __sbSetupBarSignIn();
      };
      __sbWakeupClimb(finishAuthed, finishRejected);
      return;
    }

    // Instant open (no climb): straight to ready if authed, else sign-in.
    chrome.storage.local.get("authToken", ({ authToken }) => {
      if (!authToken) {
        bar.classList.add("open", "sb-signin");
        __sbSetupBarSignIn();
        return;
      }
      __sbOpenBarReady();
    });
  } else {
    __sbInputOpen = false;
    __sbStopWalkLoop();
    if (!options.skipPersist && __sbContextOk()) chrome.storage.local.set({ sbBrainExpanded: false });
    const bar = document.getElementById("__sb_bar__");
    bar?.classList.remove("open", "sb-waking", "sb-signin", "sb-cinematic");
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

// Convert markdown/rich text into clean SPOKEN text before it hits TTS. The goal is to stop
// Braino verbalizing syntax — saying "slash" for /, "vertical bar" for | (markdown table rows),
// reading **stars**, backticks, #, >, etc. — while KEEPING normal sentence punctuation (. , ? !)
// so pacing still sounds natural.
function __sbStripMarkdownForSpeech(text) {
  let s = String(text || "");

  // Fenced code blocks ``` ``` → keep the inner text, drop the fences.
  s = s.replace(/```[^\n]*\n?([\s\S]*?)```/g, "$1").replace(/```/g, "");

  // Images → alt text; links → link text; bare autolinks → drop (don't read the URL aloud).
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/<https?:\/\/[^>\s]+>/gi, " ");

  // Tables: drop the |---|:--:| separator rows entirely, and read data-row pipes as comma pauses
  // so columns sound like a list instead of "vertical bar … vertical bar".
  s = s.split("\n").map((line) => {
    const t = line.trim();
    if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(t)) return "";
    if (t.includes("|")) {
      return t.replace(/^\s*\|/, "").replace(/\|\s*$/, "").replace(/\s*\|\s*/g, ", ");
    }
    return line;
  }).join("\n");

  s = s
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")          // headings
    .replace(/^\s{0,3}>\s?/gm, "")               // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "")               // bullet lists
    .replace(/^\s*\d+[.)]\s+/gm, "")             // numbered lists
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, "")      // horizontal rules (---, ***, ___)
    .replace(/\*\*([^*]+)\*\*/g, "$1")           // bold
    .replace(/\*([^*]+)\*/g, "$1")               // italic *
    .replace(/__([^_]+)__/g, "$1")               // bold _
    .replace(/_([^_]+)_/g, "$1")                 // italic _
    .replace(/~~([^~]+)~~/g, "$1")               // strikethrough
    .replace(/`([^`]+)`/g, "$1")                 // inline code
    .replace(/<\/?[a-z][^>]*>/gi, " ")           // stray HTML tags
    .replace(/\\([^\s])/g, "$1")                 // unescape \* \_ etc.
    .replace(/\n{2,}/g, ". ")                    // paragraph break → pause
    .replace(/\n/g, ". ")                        // line break → pause
    .replace(/[*_#`~|>]/g, " ")                  // leftover markdown symbols (keep . , ? !)
    .replace(/[/\\]/g, " ")                      // slashes → space (never say "slash")
    .replace(/(\.\s*){2,}/g, ". ")               // collapse ". . ." runs
    .replace(/\s+([.,?!;:])/g, "$1")             // no space before punctuation
    .replace(/\s{2,}/g, " ")
    .trim();

  return s;
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
  // 1B: tear down the streaming-TTS pipeline. The generation bump above already invalidates the
  // drain loop's token checks; nulling the state stops any further feed/queueing.
  __sbStreamFishActive = false;
  __sbStreamTts = null;
  // Abort any in-flight Fish Audio TTS fetch/stream immediately so barge-in is instant
  // instead of hanging until the fetch timeout. The generation bump above already marks
  // it stale, so the abort is treated as a clean cancel (no error, no browser fallback).
  if (__sbTtsAbortController) {
    try { __sbTtsAbortController.abort(); } catch {}
    __sbTtsAbortController = null;
  }
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
    __sbWalkTalking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();
    if (__sbHeadphoneMode) { __sbSetHpBrainState("speaking"); }

    const finish = () => {
      if (speechToken === __sbSpeechGeneration) {
        if (__sbCurrentUtterance === utterance) __sbCurrentUtterance = null;
        __sbIsSpeaking = false;
        __sbWalkTalking = false;
        __sbSetVoiceButtonState(__sbIsRecording);
        __sbSyncSpeakButtons();
        if (__sbHeadphoneMode) {
          __sbSetHpBrainState(__sbVoicePendingReply ? "captured" : "listening");
        }
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
  // Only true credit exhaustion is fatal. A 429 rate limit is transient and stays RETRYABLE
  // (see __sbIsRetryableVoiceTtsStatus) — it used to be treated as fatal, which dumped replies
  // onto the robotic browser voice the moment Fish got busy.
  return status === 402 || (kind.includes("credit") && !kind.includes("rate"));
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

function __sbIsAbortLikeError(error) {
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  return name === "aborterror" || message.includes("abort") || message.includes("signal is aborted");
}

async function __sbFetchVoiceTtsWithRetry(url, request, speechToken) {
  const startedAt = Date.now();
  const deadlineAt = startedAt + __SB_TTS_RETRY_MAX_MS;
  let attempt = 0;
  let lastError = null;

  while (Date.now() < deadlineAt) {
    attempt += 1;
    if (speechToken !== __sbSpeechGeneration) return null;

    let timeoutId = null;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      if (controller) {
        // Register so barge-in (__sbStopSpeech) can abort instantly. The signal also covers
        // the streamed response body, so an interruption mid-playback is cancelled at once.
        __sbTtsAbortController = controller;
        timeoutId = setTimeout(() => controller.abort(), __SB_TTS_FETCH_TIMEOUT_MS);
      }
      const timedRequest = controller ? { ...request, signal: controller.signal } : request;
      const resp = await fetch(url, timedRequest);
      // Server streams the audio, so fetch resolves on headers — stop the stall timer now
      // and let the body stream freely (it can outlast the timeout for long replies).
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (speechToken !== __sbSpeechGeneration) return null;

      if (resp.ok) {
        const provider = (resp.headers.get("x-braino-tts-provider") || "").toLowerCase();
        if (provider === __SB_TTS_PROVIDER || provider === __SB_TTS_FALLBACK_PROVIDER) return resp;
        const providerError = new Error(`Unexpected TTS provider: ${provider || "unknown"}`);
        providerError.retryable = false;
        lastError = providerError;
        break;
      }

      const httpError = await __sbReadTtsError(resp);
      lastError = httpError;
      if (httpError.isCreditIssue || !httpError.retryable) break;
    } catch (error) {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      // Barge-in / new reply bumped the generation and aborted us on purpose — clean cancel,
      // not a failure. Don't log it or trigger the browser-voice fallback.
      if (speechToken !== __sbSpeechGeneration) return null;
      if (__sbIsAbortLikeError(error)) {
        // DOMException.message is read-only, so we can't relabel the original — wrap it.
        const timeoutErr = new Error(`${__SB_TTS_PROVIDER} TTS timed out.`);
        timeoutErr.isTimeout = true;
        timeoutErr.retryable = true;
        timeoutErr.cause = error;
        lastError = timeoutErr;
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
        lastError.retryable = true;
      }
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

function __sbCanStreamTtsMp3() {
  try {
    return typeof MediaSource !== "undefined"
      && typeof MediaSource.isTypeSupported === "function"
      && MediaSource.isTypeSupported("audio/mpeg");
  } catch { return false; }
}

// Plays a streamed TTS response via MediaSource so audio starts on the FIRST chunk instead
// of waiting for the whole MP3. Resolves with the total byte count once playback ends; rejects
// on a fatal media error. A barge-in aborts the fetch (reader throws) → reject, which the
// caller treats as a clean cancel via the speech-generation check.
function __sbPlayStreamedTts(resp, speechToken, onReady) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishOk = (bytes) => { if (!settled) { settled = true; resolve(bytes); } };
    const finishErr = (e) => { if (!settled) { settled = true; reject(e instanceof Error ? e : new Error(String(e || "stream error"))); } };

    let mediaSource, url, audio;
    try {
      mediaSource = new MediaSource();
      url = URL.createObjectURL(mediaSource);
      audio = new Audio();
      audio.src = url;
    } catch (e) { finishErr(e); return; }

    onReady(audio, url);
    let totalBytes = 0;

    audio.addEventListener("ended", () => finishOk(totalBytes), { once: true });
    audio.addEventListener("error", () => finishErr(audio.error || new Error("audio element error")), { once: true });

    mediaSource.addEventListener("sourceopen", async () => {
      let sb;
      try { sb = mediaSource.addSourceBuffer("audio/mpeg"); }
      catch (e) { finishErr(e); return; }

      const appendChunk = (chunk) => new Promise((res, rej) => {
        const cleanup = () => { sb.removeEventListener("updateend", onEnd); sb.removeEventListener("error", onErr); };
        const onEnd = () => { cleanup(); res(); };
        const onErr = () => { cleanup(); rej(new Error("SourceBuffer append error")); };
        sb.addEventListener("updateend", onEnd);
        sb.addEventListener("error", onErr);
        try { sb.appendBuffer(chunk); } catch (e) { cleanup(); rej(e); }
      });

      const reader = resp.body.getReader();
      let started = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (speechToken !== __sbSpeechGeneration) { try { await reader.cancel(); } catch {} break; }
          if (done) break;
          if (value && value.byteLength) {
            totalBytes += value.byteLength;
            await appendChunk(value);
            if (!started) { started = true; audio.play().catch(finishErr); }
          }
        }
        try { if (mediaSource.readyState === "open") mediaSource.endOfStream(); } catch {}
        if (!started) finishOk(totalBytes); // nothing played (e.g. barge-in before first chunk)
      } catch (e) {
        finishErr(e);
      }
    }, { once: true });
  });
}

// Split a reply into speakable sentences so we can synthesize + play them one at a time. This
// is the core latency win: the first sentence starts playing while later ones are still being
// synthesized, instead of waiting for Fish to render the whole reply. Decimals ("5.4") and
// abbreviations ("e.g.") don't over-split because we only break on a terminator FOLLOWED BY
// whitespace and require a minimum chunk length before flushing.
// Chunk a reply for TTS. Keeping the request COUNT low is what keeps Fish reliable — too many
// rapid calls trip its rate limit (429). So short replies (the common case) go out as ONE
// request; longer replies emit the first sentence alone (fast first audio) then group the rest
// into ≤MAX-char chunks. A few calls per reply, never one-per-sentence.
function __sbSplitSentencesForTts(text) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  const MAX = 240;
  if (clean.length <= MAX) return [clean];

  const sentences = clean.split(/(?<=[.!?…।])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [clean];

  const chunks = [sentences[0]]; // first sentence alone → audio starts fast
  let buf = "";
  for (let i = 1; i < sentences.length; i++) {
    const candidate = buf ? `${buf} ${sentences[i]}` : sentences[i];
    if (buf && candidate.length > MAX) { chunks.push(buf); buf = sentences[i]; }
    else buf = candidate;
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// Fetch one sentence's TTS (Fish, with retry). Never throws — returns { resp } (resp may be
// null if the turn was superseded mid-fetch) or { error } so the caller can decide on fallback
// without risking an unhandled rejection from a prefetch in flight.
async function __sbFetchSentenceTts(clean, speechToken, headers) {
  try {
    const resp = await __sbFetchVoiceTtsWithRetry(`${__SB_API}/${__SB_TTS_ENDPOINT}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: clean }),
    }, speechToken);
    return { resp };
  } catch (error) {
    return { error };
  }
}

// Play one already-fetched TTS Response. Returns true if it played under the current token,
// false on token mismatch. Throws on a media error so the caller can fall back.
async function __sbPlaySentenceResp(resp, speechToken) {
  const ttsProvider = resp.headers.get("x-braino-tts-provider") || __SB_TTS_PROVIDER;
  const ttsContentType = resp.headers.get("content-type") || "";
  const onReady = (audioEl, objUrl) => {
    __sbCurrentSpeechAudio = audioEl;
    __sbCurrentSpeechUrl = objUrl;
    __sbIsSpeaking = true;
    __sbWalkTalking = true;
    __sbSetVoiceButtonState(false);
    __sbSyncSpeakButtons();
    if (__sbHeadphoneMode) { __sbSetHpBrainState("speaking"); }
  };

  if (__sbCanStreamTtsMp3() && resp.body) {
    const bytes = await __sbPlayStreamedTts(resp, speechToken, onReady);
    __sbRecordRealtimeCostTts({ provider: ttsProvider, bytes, contentType: ttsContentType });
    return speechToken === __sbSpeechGeneration;
  }
  // Fallback: buffer the whole clip, then play (older engines without MSE audio/mpeg).
  const blob = await resp.blob();
  __sbRecordRealtimeCostTts({ provider: ttsProvider, bytes: blob.size, contentType: blob.type || ttsContentType });
  if (speechToken !== __sbSpeechGeneration) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  onReady(audio, url);
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
  return speechToken === __sbSpeechGeneration;
}

// Shared "Fish failed → tell the user, fall back to browser voice" handling.
function __sbHandleFishTtsFailure(ttsErr) {
  const isCreditIssue = Boolean(ttsErr?.isCreditIssue);
  const isTimeout = Boolean(ttsErr?.isTimeout) || __sbIsAbortLikeError(ttsErr);
  __sbRecordRealtimeCostTts({ provider: "browser", error: ttsErr?.message || String(ttsErr || "TTS failed") });
  const fallbackMessage = ttsErr?.message || ttsErr;
  if (isTimeout) console.debug("[Braino] Fish Audio TTS timed out; using browser voice:", fallbackMessage);
  else console.warn("[Braino] Fish Audio TTS failed; falling back to browser voice:", fallbackMessage);
  __sbSetVoiceStatusBadge(isCreditIssue ? "error" : "legacy", isCreditIssue ? "Fish Audio credits" : "Browser voice");
  const msg = isCreditIssue
    ? "Fish Audio credits or rate limit are exhausted. Falling back to browser voice for now."
    : isTimeout
      ? "Fish Audio took too long, so I used browser voice for this reply."
      : "Fish Audio voice is unavailable after retrying. Falling back to browser voice for now.";
  if (__sbHeadphoneMode || __sbVoiceOnlyMode) __sbShowVoiceError(msg);
  else __sbShowBubble(msg, true, { tone: "status" });
}

// Keep-warm: ping the TTS edge function so its isolate stays hot while voice mode is active.
// Cold starts (~0.5–5s) were a top cause of the first reply feeling slow / timing out.
let __sbFishWarmTimer = null;

function __sbWarmFishTts() {
  if (__sbVoiceOutputPref !== "fish") return; // only the Fish path pays the cold start
  if (!__sbContextOk()) return;
  try {
    __sbStorageGet(["authToken"]).then(({ authToken }) => {
      const headers = { "Content-Type": "application/json", apikey: __SB_ANON_KEY };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      fetch(`${__SB_API}/${__SB_TTS_ENDPOINT}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ warm: true }),
      }).catch(() => {});
    }).catch(() => {});
  } catch (_) {}
}

function __sbStartFishWarmKeepAlive() {
  __sbWarmFishTts();
  if (__sbFishWarmTimer) return;
  __sbFishWarmTimer = setInterval(() => {
    if (!__sbHeadphoneMode && !__sbVoiceOnlyMode) { __sbStopFishWarmKeepAlive(); return; }
    __sbWarmFishTts();
  }, 240000); // ~4 min — Supabase isolates idle out after a few minutes
}

function __sbStopFishWarmKeepAlive() {
  if (__sbFishWarmTimer) { clearInterval(__sbFishWarmTimer); __sbFishWarmTimer = null; }
}

async function __sbSpeakText(text, options = {}) {
  const clean = __sbStripMarkdownForSpeech(text);
  if (!clean) return false;

  __sbStopSpeech();
  const speechToken = ++__sbSpeechGeneration;
  const sentences = __sbSplitSentencesForTts(clean);
  let spoke = false;

  try {
    const { authToken: ttsToken } = await __sbStorageGet(["authToken"]);
    if (speechToken !== __sbSpeechGeneration) return false;

    // fish-audio-tts uses a server-side key, so it works with just the anon apikey — no user
    // token required. Send the token when we have it.
    const headers = { "Content-Type": "application/json", apikey: __SB_ANON_KEY };
    if (ttsToken) headers.Authorization = `Bearer ${ttsToken}`;

    // Strictly SEQUENTIAL: fetch a chunk, play it, then fetch the next. Never two Fish requests
    // in flight at once — concurrent/bursted calls were tripping Fish's rate limit (429) and
    // dumping every multi-sentence reply onto the browser voice. First audio is still fast
    // because chunk 1 is just the opening sentence.
    for (let i = 0; i < sentences.length; i++) {
      if (speechToken !== __sbSpeechGeneration) return spoke;
      const cur = await __sbFetchSentenceTts(sentences[i], speechToken, headers);
      if (speechToken !== __sbSpeechGeneration) return spoke;

      if (cur.error) {
        // Fish failed for this sentence → speak the unspoken remainder with the browser voice
        // (safety net) so the reply never cuts off half-finished.
        const remainder = sentences.slice(i).join(" ");
        __sbHandleFishTtsFailure(cur.error);
        spoke = (await __sbSpeakWithBrowser(remainder, speechToken)) || spoke;
        return spoke;
      }
      if (!cur.resp) return spoke; // token superseded mid-fetch

      try {
        const played = await __sbPlaySentenceResp(cur.resp, speechToken);
        if (speechToken !== __sbSpeechGeneration) return spoke;
        if (played) spoke = true;
      } catch (mediaErr) {
        if (speechToken !== __sbSpeechGeneration) return spoke;
        const remainder = sentences.slice(i).join(" ");
        __sbHandleFishTtsFailure(mediaErr);
        spoke = (await __sbSpeakWithBrowser(remainder, speechToken)) || spoke;
        return spoke;
      }
    }
    __sbWalkTalking = false;
  } catch (ttsErr) {
    if (speechToken !== __sbSpeechGeneration) return false;
    __sbHandleFishTtsFailure(ttsErr);
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

function __sbEnsureMovieBackdrop() {
  let backdrop = document.getElementById("__sb_movie_backdrop__");
  if (!backdrop && document.body) {
    backdrop = document.createElement("div");
    backdrop.id = "__sb_movie_backdrop__";
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function __sbMovieModeDescriptor(el) {
  if (!el || !(el instanceof Element)) return "player";
  const parts = [
    el.getAttribute("aria-label"),
    el.getAttribute("title"),
    el.getAttribute("data-testid"),
    el.id,
    el.getAttribute("class"),
    el.tagName?.toLowerCase(),
  ].filter(Boolean);
  return String(parts[0] || "player");
}

function __sbMovieModeElementVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.closest("#__sb_root__, #__sb_card_wrap__, #__sb_bar__")) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 180 || rect.height < 100) return false;
  if (rect.bottom < 18 || rect.right < 18) return false;
  if (rect.top > window.innerHeight - 18 || rect.left > window.innerWidth - 18) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.03;
}

function __sbMovieModeRectScore(rect) {
  const area = rect.width * rect.height;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = cx - window.innerWidth / 2;
  const dy = cy - window.innerHeight / 2;
  const distancePenalty = Math.sqrt((dx * dx) + (dy * dy)) * 120;
  return area - distancePenalty;
}

function __sbFindMovieModeFrame(mediaEl) {
  if (!mediaEl || !(mediaEl instanceof Element)) return null;
  const mediaRect = mediaEl.getBoundingClientRect();
  const mediaArea = Math.max(1, mediaRect.width * mediaRect.height);
  let bestEl = mediaEl;
  let bestScore = -Infinity;
  let current = mediaEl;
  let depth = 0;

  while (current && current instanceof Element && current !== document.body && current !== document.documentElement && depth < 9) {
    const rect = current.getBoundingClientRect();
    if (rect.width >= mediaRect.width * 0.84 && rect.height >= mediaRect.height * 0.84) {
      const containsMedia = rect.left <= mediaRect.left + 18
        && rect.top <= mediaRect.top + 18
        && rect.right >= mediaRect.right - 18
        && rect.bottom >= mediaRect.bottom - 18;
      if (containsMedia) {
        const area = Math.max(1, rect.width * rect.height);
        const ratio = area / mediaArea;
        const attrs = [
          current.id,
          typeof current.className === "string" ? current.className : current.getAttribute("class"),
          current.getAttribute("data-testid"),
          current.getAttribute("aria-label"),
          current.getAttribute("role"),
        ].filter(Boolean).join(" ");
        let score = 0;
        if (__SB_MOVIE_MODE_FRAME_RE.test(attrs)) score += 140;
        if (ratio >= 1 && ratio <= 3.8) score += 112 - (Math.abs(ratio - 1.8) * 26);
        else if (ratio > 3.8 && ratio <= 6.5) score += 56 - ((ratio - 3.8) * 11);
        else if (ratio > 6.5) score -= Math.min(140, (ratio - 6.5) * 14);
        if (current.querySelector?.("track, [class*='caption'], [class*='subtitle'], [aria-label*='caption'], [aria-label*='subtitle']")) score += 18;
        if (area > (window.innerWidth * window.innerHeight * 0.97)) score -= 110;
        score += Math.max(0, 28 - (depth * 6));
        if (score > bestScore) {
          bestScore = score;
          bestEl = current;
        }
      }
    }
    current = current.parentElement;
    depth += 1;
  }

  return bestEl;
}

function __sbFindMovieModeTarget() {
  const videoCandidates = __sbAdapterDeepQueryAll("video")
    .filter((el) => __sbMovieModeElementVisible(el));

  let bestVideo = null;
  let bestVideoScore = -Infinity;
  for (const video of videoCandidates) {
    const rect = video.getBoundingClientRect();
    let score = __sbMovieModeRectScore(rect);
    if (!video.paused && !video.ended) score += rect.width * rect.height * 0.35;
    if (video.readyState >= 2) score += rect.width * rect.height * 0.08;
    if (video.currentSrc) score += 9000;
    if (score > bestVideoScore) {
      bestVideoScore = score;
      bestVideo = video;
    }
  }

  if (bestVideo) {
    return {
      frame: __sbFindMovieModeFrame(bestVideo) || bestVideo,
      media: bestVideo,
      descriptor: __sbMovieModeDescriptor(bestVideo),
    };
  }

  const iframeCandidates = __sbAdapterDeepQueryAll("iframe")
    .filter((el) => __sbMovieModeElementVisible(el))
    .filter((el) => {
      const allow = String(el.getAttribute("allow") || "").toLowerCase();
      const src = String(el.getAttribute("src") || "").toLowerCase();
      return /autoplay|fullscreen|encrypted-media/.test(allow)
        || /youtube|vimeo|player|video|stream|hotstar|disney|jio/.test(src);
    });

  let bestFrame = null;
  let bestFrameScore = -Infinity;
  for (const frame of iframeCandidates) {
    const rect = frame.getBoundingClientRect();
    const score = __sbMovieModeRectScore(rect) + ((rect.width * rect.height) * 0.12);
    if (score > bestFrameScore) {
      bestFrameScore = score;
      bestFrame = frame;
    }
  }

  if (!bestFrame) return null;
  return {
    frame: __sbFindMovieModeFrame(bestFrame) || bestFrame,
    media: bestFrame,
    descriptor: __sbMovieModeDescriptor(bestFrame),
  };
}

function __sbMovieModeActiveTarget() {
  const frame = __sbMovieModeState?.frame;
  const media = __sbMovieModeState?.media;
  if (__sbMovieModeElementVisible(frame) && __sbMovieModeElementVisible(media)) {
    return {
      frame,
      media,
      descriptor: __sbMovieModeState?.descriptor || "",
    };
  }
  return null;
}

function __sbFormatMovieTimestamp(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = String(safe % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
  return `${minutes}:${secs}`;
}

function __sbNormalizeMovieSubtitleLine(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[♪♫]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\-–—]\s*/, "")
    .trim();
}

function __sbIsMovieSubtitleNoise(text) {
  const normalized = __sbAdapterNormalizeText(text);
  if (!normalized) return true;
  if (normalized.length < 2 || normalized.length > 180) return true;
  return /\b(audio(?:\s*&\s*subtitles?)?|more like this|skip intro|skip recap|next episode|episodes?|full hd|watchlist|play|pause|rewind|forward|continue watching|english|hindi|tam(?:il)?|telugu|malayalam|quality|subtitles?)\b/i.test(normalized);
}

function __sbExtractMovieSubtitleLinesFromTracks(mediaEl) {
  if (!(mediaEl instanceof HTMLVideoElement) || !mediaEl.textTracks) return [];
  const lines = [];
  for (const track of Array.from(mediaEl.textTracks || [])) {
    if (track.mode === "disabled") continue;
    // Some OTTs (Netflix) use mode="hidden" and manage rendering themselves — still has activeCues
    const activeCues = Array.from(track.activeCues || []);
    for (const cue of activeCues) {
      const cueText = typeof cue?.text === "string" ? cue.text : "";
      for (const part of cueText.split(/\r?\n/)) {
        const line = __sbNormalizeMovieSubtitleLine(part);
        if (!line || __sbIsMovieSubtitleNoise(line)) continue;
        lines.push(line);
      }
    }
    if (lines.length) break;
  }
  return Array.from(new Set(lines));
}

function __sbExtractMovieSubtitleLinesFromDom(frame, mediaEl) {
  const selectors = [
    // Generic
    '[class*="subtitle"]',
    '[class*="Subtitle"]',
    '[class*="caption"]',
    '[class*="Caption"]',
    '[data-testid*="subtitle"]',
    '[data-testid*="caption"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
    '[role="caption"]',
    // Netflix: player-timedtext (aria-live covers outer, but adding direct)
    '[class*="player-timedtext"]',
    // Amazon Prime Video: atvwebplayersdk timedtext
    '[class*="atvwebplayersdk"]',
    '[class*="timedtext"]',
    // Hotstar / JioHotstar
    '[class*="sub-text"]',
    '[class*="SubText"]',
    '[class*="sub_text"]',
    // JioCinema
    '[class*="jio-sub"]',
    // Voot / MXPlayer / generic OTT fallbacks
    '[class*="player-sub"]',
    '[class*="playerSub"]',
    '[class*="video-subtitle"]',
    '[class*="videoSubtitle"]',
  ].join(",");
  const roots = [];
  if (frame instanceof Element) roots.push(frame);
  if (mediaEl instanceof Element && mediaEl !== frame) roots.push(mediaEl.parentElement || mediaEl);
  roots.push(document);

  const seenEls = new Set();
  const lines = [];
  const frameRect = frame?.getBoundingClientRect?.() || mediaEl?.getBoundingClientRect?.() || null;

  for (const root of roots) {
    const candidates = __sbAdapterDeepQueryAll(selectors, root);
    for (const el of candidates) {
      if (!(el instanceof Element) || seenEls.has(el)) continue;
      seenEls.add(el);
      if (!__sbAdapterIsVisible(el) || el.closest("#__sb_root__, #__sb_card_wrap__, #__sb_bar__")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height < 4 || rect.height > 240) continue;
      if (frameRect) {
        const lowerBandTop = frameRect.top + (frameRect.height * 0.35);
        if (rect.bottom < lowerBandTop || rect.top > frameRect.bottom + 40) continue;
        if (rect.left < frameRect.left - 40 || rect.right > frameRect.right + 40) continue;
      } else if (rect.top < window.innerHeight * 0.35) {
        continue;
      }
      const rawText = String(el.innerText || el.textContent || "");
      for (const part of rawText.split(/\r?\n/)) {
        const line = __sbNormalizeMovieSubtitleLine(part);
        if (!line || __sbIsMovieSubtitleNoise(line)) continue;
        lines.push(line);
      }
    }
    if (lines.length) break;
  }

  return Array.from(new Set(lines));
}

function __sbGuessMovieTitle(target) {
  const metaTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
    "";
  const frameHeading =
    target?.frame?.querySelector?.("h1, h2, [data-testid*='title'], [class*='title']")?.textContent ||
    "";
  const titleCandidates = [
    frameHeading,
    metaTitle,
    document.title,
  ];

  const OTT_SUFFIX_RE = /\s*[\-|•|:]\s*(Netflix|JioHotstar|Jio\s*Hotstar|Disney\+?\s*Hotstar|Disney\+|Prime\s*Video|Amazon\s*Prime(?:\s*Video)?|YouTube|Hotstar|Zee5|SonyLIV|Sony\s*LIV|JioCinema|Voot|MX\s*Player|Aha|Hulu|Max|HBO\s*Max|Apple\s*TV\+?|Peacock|Paramount\+?|Mubi|Crunchyroll|Tubi|Fubo).*$/i;
  for (const candidate of titleCandidates) {
    const cleaned = String(candidate || "")
      .replace(/\s+/g, " ")
      .replace(OTT_SUFFIX_RE, "")
      .replace(/\s*\|\s*(Watch|Streaming|Online|Stream|HD|Full\s*Movie|Official).*/i, "")
      .replace(/\s*-\s*(Watch|Stream|Online|HD|Full\s*Movie).*/i, "")
      .trim();
    if (cleaned && cleaned.length > 1) return cleaned;
  }
  return "";
}

function __sbRememberMovieTranscript(lines, timestamp, title) {
  const normalizedTitle = __sbAdapterNormalizeText(title || "");
  if (normalizedTitle && normalizedTitle !== __sbMovieLastTitle) {
    __sbMovieTranscriptEntries = [];
    __sbMovieLastSubtitleText = "";
    __sbMovieLastTitle = normalizedTitle;
  }

  const safeTimestamp = Number.isFinite(Number(timestamp)) ? Math.max(0, Math.round(Number(timestamp))) : null;
  for (const rawLine of Array.isArray(lines) ? lines : []) {
    const line = __sbNormalizeMovieSubtitleLine(rawLine);
    if (!line || __sbIsMovieSubtitleNoise(line)) continue;
    const lastEntry = __sbMovieTranscriptEntries[__sbMovieTranscriptEntries.length - 1];
    if (line === __sbMovieLastSubtitleText) continue;
    if (lastEntry && lastEntry.text === line && safeTimestamp != null && Math.abs((lastEntry.timestamp ?? safeTimestamp) - safeTimestamp) <= 8) continue;
    __sbMovieTranscriptEntries.push({ text: line, timestamp: safeTimestamp });
    __sbMovieLastSubtitleText = line;
  }

  if (__sbMovieTranscriptEntries.length > 18) {
    __sbMovieTranscriptEntries = __sbMovieTranscriptEntries.slice(-18);
  }
}

function __sbBuildMovieContext(options = {}) {
  const host = String(location.hostname || "").replace(/^www\./, "");
  const target = options.target || __sbMovieModeActiveTarget() || __sbFindMovieModeTarget();
  const mediaEl = target?.media || null;
  const frameEl = target?.frame || mediaEl || null;
  if (!target && !__SB_MOVIE_CONTEXT_HOST_RE.test(host) && !__sbMovieTranscriptEntries.length) return null;

  const title = __sbGuessMovieTitle(target);
  let timestamp = 0;
  let duration = null;
  let isPaused = false;
  if (mediaEl instanceof HTMLMediaElement) {
    timestamp = Math.max(0, Math.floor(mediaEl.currentTime || 0));
    duration = Number.isFinite(mediaEl.duration) ? Math.floor(mediaEl.duration) : null;
    isPaused = Boolean(mediaEl.paused);
  }

  const subtitleLines = Array.from(new Set([
    ...__sbExtractMovieSubtitleLinesFromTracks(mediaEl),
    ...__sbExtractMovieSubtitleLinesFromDom(frameEl, mediaEl),
  ]));

  __sbRememberMovieTranscript(subtitleLines, timestamp, title);
  const transcript = __sbMovieTranscriptEntries
    .slice(-12)
    .map((entry) => {
      const prefix = entry.timestamp != null ? `[${__sbFormatMovieTimestamp(entry.timestamp)}] ` : "";
      return `${prefix}${entry.text}`;
    })
    .join("\n");

  if (!title && !subtitleLines.length && !transcript && !target) return null;

  return {
    title: title || document.title || "Current video",
    site: host || "video",
    descriptor: target?.descriptor || "",
    timestamp,
    duration,
    isPaused,
    currentSubtitle: subtitleLines.join(" "),
    subtitleTranscript: transcript,
  };
}

function __sbBuildMovieContextSummary(movieContext) {
  if (!movieContext?.title) return "";
  const lines = [
    "MOVIE COMPANION MODE",
    `Title: ${movieContext.title}`,
    `Playback: ${movieContext.isPaused ? "paused" : "playing"}`,
    `Timestamp: ${__sbFormatMovieTimestamp(movieContext.timestamp || 0)}${movieContext.duration ? ` / ${__sbFormatMovieTimestamp(movieContext.duration)}` : ""}`,
  ];
  if (movieContext.currentSubtitle) lines.push(`Visible subtitle: ${movieContext.currentSubtitle}`);
  if (movieContext.subtitleTranscript) lines.push(`Recent subtitle transcript:\n${movieContext.subtitleTranscript}`);
  return lines.join("\n");
}

function __sbIsMovieSceneQuestion(text) {
  const normalized = String(text || "").toLowerCase().trim();
  if (!normalized) return false;
  // English patterns
  const engRE = /\b(what(?:'s|\s+is)\s+happening|what\s+just\s+happened|what\s+happened\s*(here|there|just\s+now)?|who\s+is\s+(?:that|this|he|she|they)|who\s+are\s+they|who\s+(?:is|was)\s+(?:that|this|he|she)|what\s+did\s+(?:he|she|they|that\s+guy|that\s+person)\s+say|what\s+does\s+that\s+mean|why\s+did\s+(?:he|she|they)|what\s+are\s+they\s+talking\s+about|what\s+(?:is|are)\s+they\s+doing|explain\s+(?:this|that)\s*(scene|moment|part)?|summari[sz]e\s+(?:this|that|the)\s*(scene|episode|part)?|recap\s+(?:this|that|the\s+episode)?|what\s+am\s+i\s+watching|what\s+is\s+going\s+on|who\s+killed|why\s+is\s+he|why\s+is\s+she|what\s+happened\s+to|who\s+(?:is|was)\s+that\s+character|tell\s+me\s+what(?:'s|\s+is)\s+happening)\b/i;
  if (engRE.test(normalized)) return true;
  // Hindi / Hinglish patterns (romanized)
  const hinRE = /\b(kya\s+ho\s+(raha|hua)|kya\s+hua|kaun\s+hai|yeh\s+kaun|ye\s+kaun|kya\s+kar\s+raha|kya\s+chal\s+raha|isko\s+kaun|kyun\s+kiya|kyun\s+mar|explain\s+kar|bata\s+(de|do)|samjha|kya\s+bola|kya\s+keh|scene\s+kya\s+hai)\b/i;
  return hinRE.test(normalized);
}

function __sbPrimeMovieBackdropForWrap() {
  const backdrop = __sbEnsureMovieBackdrop();
  if (!backdrop) return;
  backdrop.style.left = `${window.innerWidth / 2}px`;
  backdrop.style.top = `${window.innerHeight / 2}px`;
  backdrop.style.width = `${Math.max(320, window.innerWidth - 36)}px`;
  backdrop.style.height = `${Math.max(220, window.innerHeight - 36)}px`;
  backdrop.style.borderRadius = "28px";
  backdrop.classList.add("visible");
}

function __sbGetFullscreenMovieTarget() {
  const fullscreenEl = document.fullscreenElement;
  if (!(fullscreenEl instanceof Element)) return null;
  const nestedVideo = fullscreenEl.matches("video")
    ? fullscreenEl
    : (__sbAdapterDeepQueryAll("video", fullscreenEl).find((el) => __sbMovieModeElementVisible(el)) || fullscreenEl.querySelector?.("video"));
  return {
    frame: fullscreenEl,
    media: nestedVideo || fullscreenEl,
    descriptor: __sbMovieModeDescriptor(nestedVideo || fullscreenEl),
  };
}

function __sbClearMovieModeTarget(options = {}) {
  const previousFrame = __sbMovieModeState?.frame;
  const previousMedia = __sbMovieModeState?.media;
  previousFrame?.classList?.remove("__sb_movie_mode_focus__");
  previousMedia?.classList?.remove("__sb_movie_mode_video__");
  if (!options.keepState) {
    __sbMovieModeState = { frame: null, media: null, descriptor: "" };
  }
  if (!options.keepBackdrop) {
    const bd = __sbEnsureMovieBackdrop();
    bd?.classList.remove("visible");
    bd?.classList.remove("sb-movie-fullscreen");
  }
}

function __sbApplyMovieModeTarget(target, options = {}) {
  if (!target?.frame || !target?.media) return false;
  const changed = target.frame !== __sbMovieModeState.frame || target.media !== __sbMovieModeState.media;
  if (changed) __sbClearMovieModeTarget({ keepState: true, keepBackdrop: true });

  if (changed || options.forceScroll) {
    try {
      target.frame.scrollIntoView({ behavior: options.forceScroll ? "smooth" : "auto", block: "center", inline: "center" });
    } catch (_) {}
  }

  target.frame.classList.add("__sb_movie_mode_focus__");
  target.media.classList.add("__sb_movie_mode_video__");

  const rect = target.frame.getBoundingClientRect();
  const padX = Math.min(28, Math.max(12, rect.width * 0.022));
  const padY = Math.min(26, Math.max(12, rect.height * 0.04));
  const left = Math.max(8, rect.left - padX);
  const top = Math.max(8, rect.top - padY);
  const right = Math.min(window.innerWidth - 8, rect.right + padX);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + padY);
  const backdrop = __sbEnsureMovieBackdrop();
  if (backdrop && !options.suppressBackdrop) {
    const applyBackdropRect = () => {
      backdrop.style.left = `${left + ((right - left) / 2)}px`;
      backdrop.style.top = `${top + ((bottom - top) / 2)}px`;
      backdrop.style.width = `${Math.max(160, right - left)}px`;
      backdrop.style.height = `${Math.max(96, bottom - top)}px`;
      backdrop.style.borderRadius = `${Math.round(Math.min(30, Math.max(16, Math.min(right - left, bottom - top) * 0.06)))}px`;
      backdrop.classList.add("visible");
    };
    if (options.animateWrap) {
      __sbPrimeMovieBackdropForWrap();
      requestAnimationFrame(() => requestAnimationFrame(applyBackdropRect));
    } else {
      applyBackdropRect();
    }
  } else if (backdrop && options.suppressBackdrop) {
    backdrop.classList.remove("visible");
  }

  __sbMovieModeState = {
    frame: target.frame,
    media: target.media,
    descriptor: target.descriptor || "",
  };
  __sbBuildMovieContext({ target });
  return true;
}

function __sbSyncMovieModeVisualState() {
  const brain = document.getElementById("__sb_brain_btn__");
  brain?.classList.toggle("sb-brain-movie", __sbMovieModeActive);
  if (brain && !brain.classList.contains("recording")) {
    if (__sbMovieModeActive) { __sbStopWalkLoop(); brain.innerHTML = __SB_BRAIN_SVG_LISTENING; }
    else __sbRestoreWalkBrain();
  }
  if (__sbMovieModeActive) {
    document.documentElement.classList.add("__sb_movie_mode_active__");
    document.body?.classList?.add("__sb_movie_mode_active__");
  } else {
    document.documentElement.classList.remove("__sb_movie_mode_active__");
    document.body?.classList?.remove("__sb_movie_mode_active__");
  }
  __sbSyncIdleState();
}

function __sbRefreshMovieMode(options = {}) {
  if (!__sbMovieModeActive) return { ok: false, active: false, error: "Movie Mode is off." };
  __sbSyncFullscreenUiMount();

  const currentFrame = __sbMovieModeState?.frame;
  const currentMedia = __sbMovieModeState?.media;
  const currentValid = __sbMovieModeElementVisible(currentFrame) && __sbMovieModeElementVisible(currentMedia);

  if (document.fullscreenElement) {
    const target = currentValid && !options.allowRetarget
      ? { frame: currentFrame, media: currentMedia, descriptor: __sbMovieModeState?.descriptor || "" }
      : (currentValid ? { frame: currentFrame, media: currentMedia, descriptor: __sbMovieModeState?.descriptor || "" } : (__sbFindMovieModeTarget() || __sbGetFullscreenMovieTarget()));
    if (target) {
      __sbApplyMovieModeTarget(target, { suppressBackdrop: true, animateWrap: options.animateWrap });
      __sbBuildMovieContext({ target });
    }
    // In fullscreen the video fills the screen — show backdrop in fullscreen mode (no dim overlay)
    const backdrop = __sbEnsureMovieBackdrop();
    if (backdrop) {
      backdrop.classList.add("sb-movie-fullscreen");
      backdrop.style.left = "50%";
      backdrop.style.top = "50%";
      backdrop.style.width = `${window.innerWidth}px`;
      backdrop.style.height = `${window.innerHeight}px`;
      backdrop.style.borderRadius = "0px";
      backdrop.classList.add("visible");
    }
    return { ok: true, active: true, fullscreen: true };
  }

  const target = currentValid && !options.allowRetarget
    ? { frame: currentFrame, media: currentMedia, descriptor: __sbMovieModeState?.descriptor || "" }
    : (currentValid ? { frame: currentFrame, media: currentMedia, descriptor: __sbMovieModeState?.descriptor || "" } : __sbFindMovieModeTarget());

  if (!target) {
    __sbClearMovieModeTarget({ keepBackdrop: false });
    return { ok: false, active: true, error: "No visible video player found on this page." };
  }

  // Remove fullscreen-mode class when we're back in normal windowed mode
  __sbEnsureMovieBackdrop()?.classList.remove("sb-movie-fullscreen");
  __sbApplyMovieModeTarget(target, { forceScroll: options.forceScroll, animateWrap: options.animateWrap });
  return { ok: true, active: true, descriptor: target.descriptor || "" };
}

function __sbStartMovieModeSync() {
  if (__sbMovieModeSyncTimer) clearInterval(__sbMovieModeSyncTimer);
  __sbMovieModeSyncTimer = setInterval(() => {
    void __sbRefreshMovieMode({ allowRetarget: true });
  }, 1100);

  if (!__sbMovieModeResizeListener) {
    __sbMovieModeResizeListener = () => requestAnimationFrame(() => { void __sbRefreshMovieMode({ allowRetarget: true }); });
    window.addEventListener("resize", __sbMovieModeResizeListener);
  }
  if (!__sbMovieModeScrollListener) {
    __sbMovieModeScrollListener = () => requestAnimationFrame(() => { void __sbRefreshMovieMode({ allowRetarget: false }); });
    window.addEventListener("scroll", __sbMovieModeScrollListener, true);
  }
}

function __sbStopMovieModeSync() {
  if (__sbMovieModeSyncTimer) {
    clearInterval(__sbMovieModeSyncTimer);
    __sbMovieModeSyncTimer = null;
  }
  if (__sbMovieModeResizeListener) {
    window.removeEventListener("resize", __sbMovieModeResizeListener);
    __sbMovieModeResizeListener = null;
  }
  if (__sbMovieModeScrollListener) {
    window.removeEventListener("scroll", __sbMovieModeScrollListener, true);
    __sbMovieModeScrollListener = null;
  }
}

function __sbStartPassiveMovieSync() {
  const host = String(location.hostname || "").replace(/^www\./, "");
  if (!__SB_MOVIE_CONTEXT_HOST_RE.test(host)) return;
  if (__sbMovieModeActive || __sbPassiveMovieSyncTimer) return;
  __sbPassiveMovieSyncTimer = setInterval(() => {
    if (__sbMovieModeActive) {
      clearInterval(__sbPassiveMovieSyncTimer);
      __sbPassiveMovieSyncTimer = null;
      return;
    }
    const target = __sbFindMovieModeTarget();
    if (target?.media && !target.media.paused) {
      __sbBuildMovieContext({ target });
    }
  }, 3000);
}

function __sbActivateMovieMode() {
  if (!__sbOwnsInlineUi()) return { ok: false, active: false, error: "Braino UI is not active on this tab." };
  if (!document.getElementById("__sb_root__")) __sbBuildBrainUI();
  __sbRefreshInlineOwner();
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (brainBtn) brainBtn.style.display = "";
  __sbBrainVisible = true;
  __sbToggleInput(false, { skipPersist: true });
  __sbCollapseCard();
  __sbMovieModeActive = true;
  __sbSyncMovieModeVisualState();
  __sbStartMovieModeSync();
  const result = __sbRefreshMovieMode({ allowRetarget: true, forceScroll: true, animateWrap: true });
  if (!result.ok) {
    __sbDeactivateMovieMode({ silent: true });
    __sbShowBubble("Movie Mode couldn't find a visible video player on this page yet.", true, { tone: "status", title: "Movie Mode" });
    return { ok: false, active: false, error: result.error };
  }
  return { ok: true, active: true };
}

function __sbDeactivateMovieMode(options = {}) {
  __sbMovieModeActive = false;
  __sbStopMovieModeSync();
  __sbClearMovieModeTarget({ keepBackdrop: false, keepState: false });
  __sbSyncMovieModeVisualState();
  if (!options.silent && __sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  return { ok: true, active: false };
}

function __sbToggleMovieMode() {
  if (__sbMovieModeActive) return __sbDeactivateMovieMode({ silent: true });
  return __sbActivateMovieMode();
}

function __sbSyncIdleState() {
  const brain = document.getElementById("__sb_brain_btn__");
  if (!brain || !__sbBrainVisible) return;
  // Idle animation runs when Braino is docked but not doing anything active.
  // Removed by music/recording/headphone/speaking states below; re-added here.
  const busy = brain.classList.contains("recording")
    || brain.classList.contains("sb-brain-spotify")
    || brain.classList.contains("sb-brain-music")
    || brain.classList.contains("sb-brain-movie")
    || brain.classList.contains("hp-connecting")
    || brain.classList.contains("hp-listening")
    || brain.classList.contains("hp-hearing")
    || brain.classList.contains("hp-captured")
    || brain.classList.contains("hp-speaking");
  brain.classList.toggle("sb-brain-idle", !busy);
}

// ── Reaction system ───────────────────────────────────────────────────────────
let __sbReactionTimer = null;

const __SB_REACTION_SVGS = {
  happy:        __SB_BRAIN_SVG_HAPPY,
  laughing:     __SB_BRAIN_SVG_LAUGHING,
  'tears-of-joy': __SB_BRAIN_SVG_TEARS,
  celebrating:  __SB_BRAIN_SVG_CELEBRATING,
  focus:        __SB_BRAIN_SVG_FOCUS,
  shocked:      __SB_BRAIN_SVG_SHOCKED,
  scared:       __SB_BRAIN_SVG_SCARED,
  scholar:      __SB_BRAIN_SVG_SCHOLAR,
  idle:         __SB_BRAIN_SVG,
};

const __SB_REACTION_EMOJIS = {
  happy:          '😊',
  laughing:       '😂',
  'tears-of-joy': '🤣',
  celebrating:    '🎉',
  focus:          '🎯',
  shocked:        '😱',
  scared:         '😰',
  scholar:        '🎓',
};

// Play an emotion on the brain mascot for durationMs, then revert.
// Pass durationMs = 0 to keep the emotion indefinitely (caller must clear manually).
function __sbPlayReaction(emotion, durationMs = 2600) {
  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (!brainBtn || !__sbBrainVisible) return;

  // Cancel any pending auto-revert from a previous reaction
  if (__sbReactionTimer) { clearTimeout(__sbReactionTimer); __sbReactionTimer = null; }

  // Swap the mascot SVG to the emotion variant (temporarily pauses walk loop)
  const svg = __SB_REACTION_SVGS[emotion];
  if (svg) {
    __sbStopWalkLoop();
    brainBtn.style.height = "";
    brainBtn.innerHTML = svg;
    brainBtn.classList.remove("sb-brain-idle", "sb-emotion-active");
    void brainBtn.offsetWidth; // force reflow so the animation restarts
    brainBtn.classList.add("sb-emotion-active");
    setTimeout(() => brainBtn.classList.remove("sb-emotion-active"), 450);
  }

  // Show a floating emoji popup above the button
  const emoji = __SB_REACTION_EMOJIS[emotion];
  if (emoji) {
    document.getElementById("__sb_reaction_pop__")?.remove();
    const pop = document.createElement("div");
    pop.id = "__sb_reaction_pop__";
    pop.textContent = emoji;
    // Insert inside the bar so absolute positioning works
    const bar = document.getElementById("__sb_bar__");
    if (bar) {
      bar.style.position = bar.style.position || "relative";
      bar.appendChild(pop);
    } else {
      brainBtn.parentElement?.appendChild(pop);
    }
    pop.addEventListener("animationend", () => pop.remove(), { once: true });
  }

  // Revert to normal idle after durationMs (scholar/idle are persistent modes)
  if (durationMs > 0 && emotion !== 'scholar' && emotion !== 'idle') {
    __sbReactionTimer = setTimeout(() => {
      __sbReactionTimer = null;
      const btn = document.getElementById("__sb_brain_btn__");
      if (btn && !__sbIsLectureRecording) __sbRestoreWalkBrain();
      __sbSyncIdleState();
    }, durationMs);
  }
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

function __sbFormatAgentPendingBody() {
  if (!__sbAgentPendingTurn?.prompt) return "Delegating...";
  const status = String(__sbAgentPendingTurn.status || "Delegating...").trim() || "Delegating...";
  const subgoals = Array.isArray(__sbAgentPendingTurn.subgoals) ? __sbAgentPendingTurn.subgoals : [];
  if (!subgoals.length) return status;
  const seen = new Set();
  const lines = [];
  for (const goal of subgoals) {
    const desc = String(goal?.desc || goal?.goal || "Step").trim();
    const key = desc
      .toLowerCase()
      .replace(/^\s*(?:[-*]|\d+[.)]|\[[x!>\s-]\])\s*/g, "")
      .replace(/\b(?:step|subgoal|task)\s*\d+\s*[:.)-]?\s*/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const state = String(goal?.status || "pending");
    const marker = state === "done" ? "[x]" : state === "active" ? "[>]" : state === "failed" ? "[!]" : "[ ]";
    lines.push(`${marker} ${desc}`);
    if (lines.length >= 8) break;
  }
  return `${status}\n\n${lines.join("\n")}`;
}

function __sbRenderCardHistory(scroll, options = {}) {
  if (!scroll) return;
  const historyHtml = __sbCardTurns
    .map((turn) => __sbBuildCardTurnHtml(turn, { rich: true }))
    .join("");
  const pendingHtml = options.pendingTurn
    ? __sbBuildCardTurnHtml(options.pendingTurn, {
        rich: true,
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

function __sbRenderConversationWithPending(scroll) {
  if (!scroll) return;
  if (__sbAgentPendingTurn?.prompt) {
    __sbRenderCardHistory(scroll, {
      pendingTurn: { prompt: __sbAgentPendingTurn.prompt },
      pendingText: __sbFormatAgentPendingBody(),
    });
    return;
  }
  __sbRenderCardHistory(scroll);
}

function __sbGetRecentSharedChatHistory(limit = 10) {
  return __sbChatHistory
    .slice(-Math.max(1, limit))
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: String(entry?.content || "").trim(),
    }))
    .filter((entry) => entry.content);
}

function __sbGetRecentSharedCardTurns(limit = 6) {
  return __sbCardTurns
    .slice(-Math.max(1, limit))
    .map((turn) => ({
      prompt: String(turn?.prompt || "").trim(),
      answer: String(turn?.answer || "").trim(),
    }))
    .filter((turn) => turn.prompt || turn.answer);
}

function __sbBuildAgentHandoffPayload(task, options = {}) {
  const chatHistory = __sbGetRecentSharedChatHistory(10);
  const cardTurns = __sbGetRecentSharedCardTurns(6);
  const lastUserPrompt = [...chatHistory].reverse().find((entry) => entry.role === "user")?.content || "";
  const lastAssistantReply = [...chatHistory].reverse().find((entry) => entry.role === "assistant")?.content || "";
  return {
    task: String(task || "").trim(),
    connector: __sbNormalizeConnectorName(options.connector) || "auto",
    mode: window.__sbForcedMode || "page",
    chatHistory,
    cardTurns,
    lastUserPrompt,
    lastAssistantReply,
  };
}

function __sbSetAgentPendingTurn(prompt, status = "Delegating…") {
  const task = String(prompt || "").trim();
  if (!task) return;
  __sbAgentPendingTurn = {
    prompt: task,
    status: String(status || "Delegating…").trim() || "Delegating…",
    subgoals: [],
  };
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRenderConversationWithPending(scroll);
  __sbOpenCard({ rich: true });
  __sbSyncSpeakButtons();
}

function __sbUpdateAgentPendingTurn(status) {
  if (!__sbAgentPendingTurn?.prompt) return;
  __sbAgentPendingTurn.status = String(status || "Delegating…").trim() || "Delegating…";
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRenderConversationWithPending(scroll);
  __sbOpenCard({ rich: true });
  __sbSyncSpeakButtons();
}

function __sbUpdateAgentSubgoals(subgoals) {
  if (!__sbAgentPendingTurn?.prompt) return;
  const seen = new Set();
  __sbAgentPendingTurn.subgoals = [];
  if (Array.isArray(subgoals)) {
    for (const goal of subgoals) {
      const desc = String(goal?.desc || goal?.goal || "").trim();
      const key = desc
        .toLowerCase()
        .replace(/^\s*(?:[-*]|\d+[.)]|\[[x!>\s-]\])\s*/g, "")
        .replace(/\b(?:step|subgoal|task)\s*\d+\s*[:.)-]?\s*/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      __sbAgentPendingTurn.subgoals.push({
        desc,
        status: String(goal?.status || "pending").trim() || "pending",
      });
      if (__sbAgentPendingTurn.subgoals.length >= 8) break;
    }
  }
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRenderConversationWithPending(scroll);
  __sbOpenCard({ rich: true });
  __sbSyncSpeakButtons();
}

function __sbFinalizeAgentPendingTurn(prompt, answer, options = {}) {
  __sbStopWaitEntertainment(); // delegate finished — settle the mascot
  const task = String(prompt || "").trim();
  const reply = String(answer || "").trim();
  if (task) {
    const lastUser = __sbChatHistory[__sbChatHistory.length - 1];
    if (!lastUser || lastUser.role !== "user" || String(lastUser.content || "").trim() !== task) {
      __sbChatHistory.push({ role: "user", content: task });
    }
  }
  if (reply) {
    __sbChatHistory.push({ role: "assistant", content: reply });
    if (task) __sbCardTurns.push({ prompt: task, answer: reply });
  }
  __sbAgentPendingTurn = null;
  if (options.render === false) return;
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbRenderConversationWithPending(scroll);
  __sbOpenCard({ rich: true });
  __sbSyncSpeakButtons();
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
  const rawPageText = (document.body?.innerText || "").trim();
  const selectedText = __sbGetSelectedText();
  const movieContext = __sbBuildMovieContext();
  const movieSummary = __sbBuildMovieContextSummary(movieContext);
  let pageText = rawPageText.slice(0, maxChars);
  if (movieSummary) {
    const remainderBudget = Math.max(1200, Math.min(3200, maxChars - movieSummary.length - 120));
    const lessImportant = rawPageText.slice(0, remainderBudget);
    pageText = `${movieSummary}${lessImportant ? `\n\nLess important page chrome:\n${lessImportant}` : ""}`.slice(0, maxChars);
  }
  return {
    url: location.href,
    title: document.title,
    text: pageText,
    selectedText,
    hoveredContext: __sbGetHoveredContext(),
    movieContext,
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

function __sbIsGoogleMapsPlaceTask(text) {
  const t = String(text || "").toLowerCase().replace(/[?!.,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/\b(?:google\s+)?maps?\b/.test(t)) {
    return /\b(open|show|search|find|look up|recommend|suggest|directions?|route|near|nearby|around|in|to)\b/.test(t);
  }
  if (/\b(?:directions?|route|navigate)\b.+\b(?:from|to)\b/.test(t)) return true;
  if (/\b(how far|distance|eta|travel time)\b.+\b(from|to|between)\b/.test(t)) return true;

  const wantsPlaceRecommendation = /\b(recommend|suggest|find|show|look for|search for|where should i|where can i|best|good|nearby|nearest|closest)\b/.test(t);
  if (!wantsPlaceRecommendation) return false;

  const placeCategory = /\b(restaurants?|cafes?|coffee|dinner|lunch|breakfast|brunch|food|eat|eating|places?|bars?|pubs?|hotels?|hospitals?|clinics?|pharmac(?:y|ies)|gyms?|parks?|theat(?:er|re)s?|movie\s+theat(?:er|re)s?|cinemas?|shops?|stores?|salons?|spas?)\b/.test(t);
  const locationHint = /\b(near me|nearby|around me|by me|close to me|my house|my home|at home|from home|where i am|current location|nearest|closest|in\s+[a-z0-9][a-z0-9\s-]{1,40}|near\s+[a-z0-9][a-z0-9\s-]{1,40}|around\s+[a-z0-9][a-z0-9\s-]{1,40}|at\s+[a-z0-9][a-z0-9\s-]{1,40})\b/.test(t);
  return placeCategory && locationHint;
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
  const onOttSite = __SB_MOVIE_CONTEXT_HOST_RE.test(String(location.hostname || "").replace(/^www\./, ""));
  if (__sbIsMovieSceneQuestion(t) && (onOttSite || __sbBuildMovieContext())) return "page";
  // Binary Delegate gate: only decide whether this needs browser control. The
  // background planner handles app/skill classification from the live page.
  if (__sbIsVolumeCommand(t)) return "agent";
  if (/\b(record|transcribe|capture audio|start listening|start recording)\b/.test(t)) return "record";
  if (__sbIsExplicitWebSearchRequest(t)) return "web";
  if (/\b(this page|this article|this post|this site|this video|summarize|summary|tldr|tl;dr|what does this|explain this|what is this|what are they|what does it say|what did they write|what's on)\b/.test(t)) return "page";
  if (__sbIsGoogleMapsPlaceTask(t)) return "agent";
  if (__sbIsBrowserActionCommand(t) || __sbIsSiteScopedBrowseSearch(t) || /\b(do .{0,25} for me|automate|browse to)\b/.test(t)) return "agent";
  if (/^(?:open|go to|navigate to|visit|search|find|look up|show|pull up|bring up|get directions|route|book|schedule|compose|send|post|tweet|apply|buy|order)\b/.test(t)) return "agent";
  if (/\b(gmail|email|calendar|maps?|directions?|linkedin|jobs?|x|twitter|spotify|youtube|amazon|reddit|whatsapp|google docs?|google documents?|drive)\b/.test(t)
    && /\b(open|find|search|send|compose|book|schedule|read|show|create|post|apply|route|directions?)\b/.test(t)) return "agent";
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

// Design Delegate: open the design tool in a visible tab and type a synthesized prompt into its
// composer (the background driver does NOT submit — the user reviews and hits enter). The prompt is
// also copied to the clipboard as a safety net in case the composer can't be resolved.
const SB_DESIGN_TOOL_DEFAULT_URL = "https://claude.ai/design/p/fb4c6286-7eed-4f12-864a-c306cf380014?file=Braino+Motion+Handoff-print-atloqb.html";

async function __sbRunDesignMockup(prompt) {
  const text = String(prompt || "").trim();
  if (!text) return;
  try {
    try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard may be blocked; non-fatal */ }

    const stored = await __sbStorageGet(["sbDesignToolUrl"]);
    const url = (typeof stored.sbDesignToolUrl === "string" && stored.sbDesignToolUrl.trim())
      ? stored.sbDesignToolUrl.trim()
      : SB_DESIGN_TOOL_DEFAULT_URL;

    const res = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ action: "runDesignMockup", url, prompt: text }, (r) => {
        void chrome.runtime.lastError;
        resolve(r || {});
      }));

    if (!res || !res.typed) {
      const note = "Opened the design tool — the prompt's on your clipboard, paste it in and send when you're ready.";
      if (__sbHeadphoneMode && typeof __sbSpeakWithPreferredVoice === "function") {
        __sbSpeakWithPreferredVoice(note).catch(() => {});
      } else if (typeof __sbShowVoiceError === "function") {
        __sbShowVoiceError(note);
      }
      console.warn("design mockup: composer not auto-filled, clipboard fallback active");
    }
    return res;
  } catch (e) {
    console.warn("design mockup failed:", e);
  }
}

// Mirror of the backend detectDesignMockupIntent — used only to STEER voice turns down the chat
// pipeline (which synthesizes the prompt + fires __sbRunDesignMockup). No second delegate engine:
// voice and chat both end up in chat-about-notes → designMockup → __sbRunDesignMockup.
function __sbIsDesignMockupRequest(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return false;
  const explicit = /\b(mock (it|this|that) up|mock ?up (it|this|that)|whip (it|this|that)? ?up|design (it|this|that)|open (the )?design tool|make (the |a )?mock ?up|show me (a |some )?(mock ?ups?|design ideas?))\b/.test(t);
  if (explicit) return true;
  const affirm = /^(yes|yeah|yep|yup|sure|ok(ay)?|do it|go for it|let'?s do it|please|go ahead|sounds good)\b/.test(t)
    || /\b(do it|go for it|let'?s do it|go ahead|mock it up|whip it up)\b/.test(t);
  if (affirm && Array.isArray(__sbChatHistory)) {
    const lastAssistant = [...__sbChatHistory].reverse().find((m) => m && m.role === "assistant");
    const prev = String(lastAssistant?.content || "").toLowerCase();
    if (/\b(mock|mockup|design tool|whip up|few ideas|see it)\b/.test(prev)) return true;
  }
  return false;
}

async function __sbFetchAssistantReply(body) {
  const enrichedBody = body && typeof body === "object" && !Array.isArray(body)
    ? {
        ...body,
        clientTimeZone: body.clientTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        clientUtcOffsetMinutes: Number.isFinite(Number(body.clientUtcOffsetMinutes))
          ? Number(body.clientUtcOffsetMinutes)
          : new Date().getTimezoneOffset(),
      }
    : body;
  const resp = await __sbAuthedApiFetch("chat-about-notes", {
    method: "POST",
  }, {
    allowAnonymous: true,
    jsonBody: enrichedBody,
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
  // Design Delegate: if the backend synthesized a mockup prompt, open the design tool and type it in.
  if (json && json.designMockup && typeof json.designMockup.prompt === "string" && json.designMockup.prompt.trim()) {
    __sbRunDesignMockup(json.designMockup.prompt.trim());
  }
  return { reply: json.reply || json.response || json.message || json.answer || "", designMockup: json.designMockup || null };
}

// ── Jump & Point intent ──────────────────────────────────────────────────────
// "show me X / point me to X / jump to X / where is X / find X" → Braino leaps off
// the bar and points at the matching element. Detection + matching run fully
// client-side (DOM gives exact on-screen coords via getBoundingClientRect).
//
// COMMAND LIST — any of these means "Braino, jump and point at it":
//   • point …      point to/at/towards X · point me to X · point it out · point towards it
//   • show …       show me X · show me where X is · show us the X · jump and show me X
//   • jump …       jump to X · jump to the comments · jump and point at X · jump up to X
//   • where …      where is/are/'s X · where's the X · where can i find/see X · whereabouts is X
//   • find …       find X · find me the X · can you find the X · help me find X
//   • take me …    take/bring/get me to the X
//   • locate …     locate the X
//   • highlight …  highlight the X
//   • select …     select the X
//   • spot …       spot the X · can you spot the X
// Plus a bare "jump" makes him hop in place.
const __SB_LOCATE_PATTERNS = [
  /\bpoint\s+(me|us|it|to|at|towards?|out)\b/,      // point me/it/to/at/towards/out …
  /\bpoint\s+(it\s+)?out\b/,
  /\bshow\s+(me|us)\b/,                              // show me / show us …
  /\bshow\s+(me|us)?\s*(where|the|that|this)\b/,
  /\bjump\b/,                                        // jump / jump to / jump and show …
  /\bwhere('?s| is| are)\b/,                         // where is/are/'s …
  /\bwhere\s+can\s+i\s+(find|see|locate)\b/,
  /\bwhereabouts\b/,
  /\b(find|locate|spot|highlight|select)\b/,         // find/locate/spot/highlight/select …
  /\b(take|bring|get)\s+me\s+to\b/,                  // take/bring/get me to …
];
// Conversational "show me / find …" that are NOT about locating something on screen.
const __SB_LOCATE_NEGATIVE = /\b(show|tell)\s+(me|us)\s+(how|why|what|whether|if|about|more)\b/;
function __sbIsLocateRequest(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return false;
  if (__SB_LOCATE_NEGATIVE.test(t) && !/\b(where|on\s+(the\s+)?(page|screen)|point|jump|highlight)\b/.test(t)) {
    return false;
  }
  return __SB_LOCATE_PATTERNS.some((re) => re.test(t));
}

// Strip the command scaffolding + stopwords to leave the thing the user is looking for.
// Returns "" for bare/pronoun commands ("point towards it", "jump", "show me") → caller
// falls back to the selection or the most prominent media on screen.
function __sbExtractLocateTarget(text) {
  let t = " " + String(text || "").toLowerCase() + " ";
  t = t.replace(/\b(hey|hi|yo|ok|okay)\s+braino\b/g, " ");
  t = t.replace(/\bbraino\b/g, " ");
  t = t.replace(/\b(can|could|would|will|please|pls|kindly|just|quickly|hey|yo)\b/g, " ");
  // command verbs + their particles
  t = t.replace(/\bjump(\s+(up|over|on|in|down|back))?(\s+(to|and|at|towards?))?\b/g, " ");
  t = t.replace(/\bpoint(\s+(me|us|it))?(\s+(to|at|towards?|out))?\b/g, " ");
  t = t.replace(/\bshow\s+(me|us)?(\s+where)?\b/g, " ");
  t = t.replace(/\btell\s+(me|us)\s+where\b/g, " ");
  t = t.replace(/\b(take|bring|get)\s+me\s+to\b/g, " ");
  t = t.replace(/\bwhere\s+can\s+i\s+(find|see|locate)\b/g, " ");
  t = t.replace(/\bwhere('?s| is| are)?\b/g, " ");
  t = t.replace(/\bwhereabouts\b/g, " ");
  t = t.replace(/\b(find|locate|spot|highlight|select)\b/g, " ");
  t = t.replace(/\bon\s+(the\s+)?(page|screen|site)\b/g, " ");
  t = t.replace(/\bfor\s+me\b/g, " ");
  // strip stopwords (incl. pronouns — a bare "it/this/that" leaves an empty target)
  t = t.replace(/\b(the|a|an|to|at|of|on|in|for|me|us|you|u|it|is|are|this|that|those|these|my|your|here|there|towards?|where)\b/g, " ");
  t = t.replace(/["'?.!,]/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

// For bare/pronoun commands: point at the user's selection, else the most prominent
// media (video / large image / large clickable card) currently on screen.
function __sbLocateFallbackEl() {
  try {
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      let n = sel.getRangeAt(0).commonAncestorContainer;
      if (n && n.nodeType === 3) n = n.parentElement;
      if (n && n.getBoundingClientRect) {
        const r = n.getBoundingClientRect();
        if (r.width > 8 && r.height > 8) return n;
      }
    }
  } catch (_) {}
  let best = null, bestArea = 0;
  let nodes;
  try { nodes = document.querySelectorAll('video, img, [role="img"], [style*="background-image"]'); } catch (_) { nodes = []; }
  for (const el of nodes) {
    if (typeof __sbIsOwnUiNode === "function" && __sbIsOwnUiNode(el)) continue;
    const r = el.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.width > 140 && r.height > 100;
    if (!onScreen) continue;
    const area = r.width * r.height;
    if (area > bestArea) { bestArea = area; best = el; }
  }
  return best;
}

// Gather visible, nameable elements with their on-screen rects.
function __sbCollectLocatableTargets() {
  const out = [];
  const seen = new Set();
  const sel = 'a[href], button, [role="link"], [role="button"], [role="tab"], [role="menuitem"],'
    + ' h1, h2, h3, h4, [aria-label], img[alt], [title], input[placeholder], #video-title';
  let nodes;
  try { nodes = document.querySelectorAll(sel); } catch (_) { return out; }
  let scanned = 0;
  for (const node of nodes) {
    if (scanned++ > 2500) break;
    if (out.length > 700) break;
    if (typeof __sbIsOwnUiNode === "function" && __sbIsOwnUiNode(node)) continue;
    const rect = node.getBoundingClientRect();
    if (!rect || rect.width < 16 || rect.height < 10) continue;
    if (rect.width > window.innerWidth * 1.25 || rect.height > window.innerHeight * 1.5) continue;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    let name = (node.getAttribute && (node.getAttribute("aria-label") || node.getAttribute("title")
      || node.getAttribute("alt") || node.getAttribute("placeholder"))) || "";
    if (!name) name = (node.innerText || node.textContent || "").trim();
    name = name.replace(/\s+/g, " ").trim();
    if (!name || name.length < 2 || name.length > 220) continue;
    const key = name.toLowerCase() + "@" + Math.round(rect.left) + "," + Math.round(rect.top);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ el: node, name, rect });
  }
  return out;
}

// Score candidates against the query; return the best clear winner (or null).
const __SB_STOPWORDS = new Set(["the", "a", "an", "to", "at", "of", "on", "in", "for",
  "and", "or", "is", "are", "this", "that", "my", "your", "with", "video", "button", "tab", "link", "icon"]);
function __sbMatchLocateTarget(query, candidates) {
  const q = String(query || "").toLowerCase().trim();
  if (!q || !candidates || !candidates.length) return null;
  const allTokens = q.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  // content tokens drive the match; if the query is ONLY generic words, fall back to all
  let qTokens = allTokens.filter((w) => !__SB_STOPWORDS.has(w));
  if (!qTokens.length) qTokens = allTokens;
  if (!qTokens.length) return null;
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const name = c.name.toLowerCase();
    let score = 0;
    if (name === q) score = 1000;
    else if (name.includes(q)) score = 600 - Math.min(320, name.length - q.length);
    else if (q.includes(name) && name.length >= 4) score = 470 - Math.min(220, q.length - name.length);
    else {
      const nameTokens = new Set(name.split(/[^a-z0-9]+/).filter(Boolean));
      let hit = 0;
      for (const w of qTokens) if (nameTokens.has(w)) hit++;
      const ratio = hit / qTokens.length;
      if (ratio >= 0.5) score = 150 + ratio * 140 - Math.min(70, name.split(/\s+/).length * 3);
    }
    if (score <= 0) continue;
    const r = c.rect;
    if (r.top >= 0 && r.bottom <= window.innerHeight) score += 18;   // already on screen
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 160 ? best : null;
}

// Orchestrate: extract → match → scroll into view → leap + point. Returns true if handled.
async function __sbRunJumpPoint(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const speak = async (line) => { if (fromVoice) { try { await __sbSpeakWithPreferredVoice(line, voiceOutput); } catch (_) {} } };

  const target = __sbExtractLocateTarget(promptText);

  // Resolve what to point at: named target → DOM match; bare/pronoun command → fallback.
  let pointEl = null;
  if (target) {
    const match = __sbMatchLocateTarget(target, __sbCollectLocatableTargets());
    if (match) pointEl = match.el;
  }
  if (!pointEl) pointEl = __sbLocateFallbackEl();

  if (!pointEl) {
    // Nothing to point at. A bare "jump" still makes him hop; otherwise say so.
    if (/\bjump\b/i.test(promptText)) { await __sbWkHop(); return true; }
    if (target) { if (fromVoice) await speak(`I can't spot that on this page.`); else __sbWkSay("Can't spot that 🤔"); }
    else { if (fromVoice) await speak("Point me at what?"); else __sbWkSay("Point me at what? 👀"); }
    return false;
  }

  // Auto-scroll the target into view (handles things below/above the fold), then re-measure.
  try { pointEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); } catch (_) {}
  await new Promise((r) => setTimeout(r, 520));   // let the smooth scroll settle before measuring

  // Prefer a larger card/link ancestor so the laser frames the whole item, not just a title.
  try {
    const a = pointEl.closest && pointEl.closest('a[href], [role="link"], ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, li, article');
    if (a && a !== pointEl) {
      const ar = a.getBoundingClientRect(), pr = pointEl.getBoundingClientRect();
      const aArea = ar.width * ar.height, pArea = pr.width * pr.height;
      if (aArea > pArea && aArea < window.innerWidth * window.innerHeight * 0.6) pointEl = a;
    }
  } catch (_) {}

  await speak("Here it is.");
  await __sbJumpPointAt(pointEl, { say: fromVoice ? null : "Right here 👇" });
  return true;
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

// ── Compare skill ────────────────────────────────────────────────────────────
// A self-contained front-end skill (modeled on the X skill). For "compare X / best X
// under Y / X vs Y" requests, Braino first asks whether to open tabs for theatrics, then
// runs the REAL comparison in the backend (web-research, purpose:"compare"), optionally
// opens a few tabs purely for show, and finally presents/speaks the comparison + best pick.
// It does NOT use the Delegate browser loop.
let __sbCompareSkillState = { phase: "idle" };

function __sbResetCompareSkillState() { __sbCompareSkillState = { phase: "idle" }; }
function __sbSetCompareSkillState(next = {}) {
  __sbCompareSkillState = { phase: "idle", ...next, updatedAt: Date.now() };
}
function __sbIsCompareSkillAwaitingInput() {
  return __sbCompareSkillState?.phase === "awaiting_choice";
}

function __sbLooksLikeCompare(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return false;
  if (/\bcompare\b/.test(t)) return true;
  if (/\b(vs\.?|versus)\b/.test(t)) return true;
  if (/\bwhich\b.{0,40}\b(should i|is better|is best|to)\b.{0,20}\b(buy|get|pick|choose)\b/.test(t)) return true;
  if (/\bbest\b.{0,40}\bunder\b/.test(t)) return true;          // "best headphones under 5000"
  if (/\btop\s+\d+\b/.test(t)) return true;                     // "top 5 ..."
  if (/\b(cheapest|most affordable|best value|value for money)\b/.test(t)) return true;
  if (/\bhelp me\b.{0,20}\b(choose|pick|decide)\b/.test(t)) return true;
  return false;
}

// Interpret the user's answer to "open tabs or just research?". Returns true/false, or null
// if ambiguous (caller re-asks).
function __sbCompareWantsTabs(text) {
  const t = String(text || "").trim().toLowerCase();
  if (/\b(just|only)\b.{0,20}\b(research|find out|look|tell|answer|get back|do it)\b/.test(t)) return false;
  if (/\b(wait|come back|don'?t open|no tabs?|without tabs?|in the background|background)\b/.test(t)) return false;
  if (__sbIsXSkillNo(t)) return false;
  if (/\b(open|show|tabs?|watch|let me see|see you|do it live|go live)\b/.test(t)) return true;
  if (__sbIsXSkillYes(t)) return true;
  return null;
}

function __sbBuildCompareChoiceHtml(query) {
  return `
    <div class="sb-compare-card" data-sb-compare-card>
      <div class="sb-compare-kicker">Compare</div>
      <h2>How should I do this, sir?</h2>
      <p>I'll research and compare <strong>${__sbEscapeHtml(query)}</strong> in the background either way. Want me to open a few tabs so you can watch me work, or just wait while I get back to you?</p>
      <div class="sb-compare-actions">
        <button class="sb-compare-btn primary" type="button" data-sb-compare-action="tabs">Open tabs &amp; watch me</button>
        <button class="sb-compare-btn" type="button" data-sb-compare-action="research">Just research, come back to me</button>
      </div>
    </div>`;
}

function __sbBindCompareChoiceCard() {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  scroll.querySelectorAll("[data-sb-compare-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-sb-compare-action");
      const query = String(__sbCompareSkillState?.query || "").trim();
      if (!query) { __sbResetCompareSkillState(); return; }
      void __sbExecuteCompare(query, {
        openTabs: action === "tabs",
        fromVoice: false,
        voiceOutput: "legacy",
        voiceTurnToken: null,
      });
    });
  });
}

function __sbRenderCompareChoiceCard(query) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const historyHtml = __sbCardTurns.map((turn) => __sbBuildCardTurnHtml(turn, { rich: true })).join("");
  scroll.innerHTML = `<div class="sb-card-stack">${historyHtml}${__sbBuildCompareChoiceHtml(query)}</div>`;
  __sbOpenCard({ rich: true });
  __sbBindCompareChoiceCard();
  __sbScrollCardToLatest(scroll);
  __sbSyncSpeakButtons();
}

async function __sbRunCompare(promptText, ctx = {}) {
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const voiceTurnToken = Number.isInteger(ctx.voiceTurnToken) ? ctx.voiceTurnToken : null;
  const query = __sbExtractSearchQuery(promptText);

  __sbChatHistory.push({ role: "user", content: promptText });
  __sbSetCompareSkillState({ phase: "awaiting_choice", query, fromVoice, voiceOutput, voiceTurnToken });

  const question = "Want me to open a few tabs so you can watch me research, or should I just go do it and come back with the comparison?";
  if (!(fromVoice && __sbVoiceOnlyMode)) {
    __sbRenderCompareChoiceCard(query);
  }
  __sbChatHistory.push({ role: "assistant", content: question });
  if (fromVoice) await __sbSpeakWithPreferredVoice(question, voiceOutput, { verbatim: true });
  __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
}

async function __sbHandleCompareSkillFollowup(promptText, ctx = {}) {
  if (!__sbIsCompareSkillAwaitingInput()) return false;
  const mergedCtx = {
    fromVoice: Boolean(ctx.fromVoice),
    voiceOutput: ctx.voiceOutput === "realtime" ? "realtime" : "legacy",
    voiceTurnToken: Number.isInteger(ctx.voiceTurnToken) ? ctx.voiceTurnToken : null,
  };
  const query = String(__sbCompareSkillState?.query || "").trim();
  if (!query) { __sbResetCompareSkillState(); return false; }

  const wantsTabs = __sbCompareWantsTabs(promptText);
  if (wantsTabs === null) {
    const nudge = "Just say 'open tabs' if you want to watch, or 'just research' if I should work in the background.";
    __sbChatHistory.push({ role: "user", content: promptText });
    if (mergedCtx.fromVoice) await __sbSpeakWithPreferredVoice(nudge, mergedCtx.voiceOutput, { verbatim: true });
    else __sbShowBubble(nudge, false, { rich: true, kicker: "Braino" });
    __sbCompleteVoiceTurn(mergedCtx);
    return true;
  }

  __sbChatHistory.push({ role: "user", content: promptText });
  await __sbExecuteCompare(query, { openTabs: wantsTabs, ...mergedCtx });
  return true;
}

// First theatric tab — a marketplace search. Amazon India is the primary market; the page
// always resolves even when the research later surfaces other retailers.
function __sbCompareMarketplaceSearchUrl(query) {
  return `https://www.amazon.in/s?k=${encodeURIComponent(String(query || "").trim())}`;
}

function __sbCompareIsShoppingUrl(url) {
  return /\b(amazon|flipkart|croma|reliancedigital|myntra|ajio|bestbuy|walmart|target|ebay|noon|snapdeal|rtings|gsmarena)\b/i.test(String(url || ""));
}

async function __sbExecuteCompare(query, ctx = {}) {
  __sbResetCompareSkillState();
  const openTabs = Boolean(ctx.openTabs);
  const fromVoice = Boolean(ctx.fromVoice);
  const voiceOutput = ctx.voiceOutput === "realtime" ? "realtime" : "legacy";
  const voiceTurnToken = Number.isInteger(ctx.voiceTurnToken) ? ctx.voiceTurnToken : null;
  const voiceOnly = fromVoice && __sbVoiceOnlyMode;
  const speakVoiceReply = async (t) => (fromVoice ? __sbSpeakWithPreferredVoice(t, voiceOutput) : false);

  if (!voiceOnly) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, "", openTabs ? "Opening tabs and researching…" : "Researching and comparing…");
    __sbOpenCard({ rich: true });
    __sbSyncSpeakButtons();
    __sbStartWaitEntertainment(); // keep Braino lively while the research runs
  }

  // Theatric tab #1 — marketplace search, fired immediately so the user sees motion.
  if (openTabs) {
    chrome.runtime.sendMessage({
      action: "openTab",
      url: __sbCompareMarketplaceSearchUrl(query),
      active: false,
    }, () => { void chrome.runtime.lastError; });
  }

  const stored = await __sbStorageGet(["aiProvider"]);
  const aiProvider = stored.aiProvider === "claude" ? "claude" : "lovable";
  const previousHistory = __sbChatHistory.slice(-10);

  try {
    const searchData = await __sbPerformWebSearch(query, {
      purpose: "compare",
      aiProvider,
      chatHistory: previousHistory,
    });
    const results = searchData.results || searchData.sources || [];

    // Theatric tabs #2..#3 — top product/review pages, staggered, background only.
    if (openTabs && results.length) {
      const shopping = results.filter((r) => r?.url && __sbCompareIsShoppingUrl(r.url)).slice(0, 2);
      const picks = shopping.length ? shopping : results.filter((r) => r?.url).slice(0, 2);
      picks.forEach((r, i) => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "openTab", url: r.url, active: false }, () => { void chrome.runtime.lastError; });
        }, 900 * (i + 1));
      });
    }

    const finalReply = __sbAppendSearchSources(
      String(searchData.answer || "I couldn't pull together a useful comparison just now."),
      results,
    );
    __sbChatHistory.push({ role: "assistant", content: finalReply });
    __sbCardTurns.push({ prompt: `Compare: ${query}`, answer: finalReply });

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
    __sbShowBubble("Error: " + (err.message || "couldn't run the comparison"), true);
    if (fromVoice) await speakVoiceReply("Something went wrong while comparing.");
  } finally {
    __sbStopWaitEntertainment();
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
  }
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
  if (__sbLooksLikeCompare(promptText)) return false; // the Compare skill owns these, not Delegate
  if (__sbIsMovieSceneQuestion(promptText) && __sbBuildMovieContext()) return false;

  const handoff = __sbBuildAgentHandoffPayload(promptText, { connector: routing?.connectorHint });
  const result = await __sbRuntimeMessage({
    action: "classifyBrainAgentTask",
    task: promptText,
    connector: routing?.connectorHint || "auto",
    chatHistory: handoff.chatHistory,
    cardTurns: handoff.cardTurns,
    lastUserPrompt: handoff.lastUserPrompt,
    lastAssistantReply: handoff.lastAssistantReply,
  });

  return result?.shouldDelegate === true;
}

function __sbShouldFastLaunchRealtimeAgent(routing) {
  const promptText = String(routing?.promptText || "").trim();
  if (!promptText) return false;
  if (__sbLooksLikeCompare(promptText)) return false; // Compare skill, not the realtime agent
  if (__sbIsMovieSceneQuestion(promptText) && __sbBuildMovieContext()) return false;
  if (__sbIsExplicitWebSearchRequest(promptText)) return false;
  if (routing?.intent === "agent") return true;

  const connector = __sbNormalizeConnectorName(routing?.connectorHint) || "auto";
  if (connector !== "auto" && __sbShouldConnectorForceAgent(connector, promptText, routing?.forcedMode || "page", routing?.siteContext)) {
    return true;
  }

  if (!__sbIsBrowserActionCommand(promptText)) return false;
  return /\b(spotify|song|track|music|playlist|youtube|video|gmail|email|mail|calendar|meeting|meet|event|maps?|directions?|linkedin|jobs?|x|twitter|drive|docs?|website|tab|page)\b/i.test(promptText);
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

  // Quick local intent: "wear/put on your specs" → toggle the glasses, no model call.
  const __glassesIntent = __sbGlassesIntent(promptText);
  if (__glassesIntent) {
    __sbSetGlasses(__glassesIntent === "on");
    const sayLine = __glassesIntent === "on" ? "How do I look?" : "Specs off — better?";
    __sbStopSpeech();
    if (fromVoice) { await speakVoiceReply(sayLine); }
    else { __sbWkSay(__glassesIntent === "on" ? "How do I look? 🤓" : "Specs off"); }
    return;
  }

  // "moonwalk" → cue Billie Jean (best-effort) at the moonwalk moment, then dance.
  if (__sbMoonwalkIntent(promptText)) {
    __sbStopSpeech();
    __sbSpotifyPlayBillieJean().then((r) => {
      // If the music couldn't start (no Spotify device etc.), say why — AFTER the dance
      // so it doesn't clobber the "Hee-hee!" bubble.
      if (!r || !r.ok) {
        setTimeout(() => __sbWkSay(r && r.reason === "signin" ? "Connect Spotify for tunes 🎧" : "Open Spotify so I can DJ 🎧"), 11900);
      }
    });
    setTimeout(() => __sbWkMoonwalk(11000), 650);             // let the beat drop, then moonwalk
    return;
  }

  __sbStopSpeech();
  if (!fromVoice && __sbIsRecording) __sbStopRecording({ silent: true });

  // Jump & Point — "where is X / point me to X". Braino leaps off the bar and points at
  // the element; the chat panel does NOT open (in text or voice). Handled fully client-side.
  if (__sbIsLocateRequest(promptText)) {
    if (fromVoice && voiceOutput === "realtime") __sbPatchRealtimeCostTurn({ routeIntent: "point" });
    await __sbRunJumpPoint(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  const connectorHint = routing.connectorHint;
  const forcedMode = routing.forcedMode;
  const forceIntent = ["agent", "web", "record", "page", "chat"].includes(options.forceIntent)
    ? options.forceIntent
    : null;
  let intent = forceIntent || routing.intent;
  if (!forceIntent && forcedMode === "page" && intent === "chat" && !__sbLooksLikeCompare(promptText)) {
    const shouldPromoteToAgent = await __sbShouldForceVoiceDelegate(routing);
    if (shouldPromoteToAgent) intent = "agent";
  }
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

  // Compare skill — capture the "open tabs or just research?" answer if we're waiting on it.
  if (await __sbHandleCompareSkillFollowup(promptText, { fromVoice, voiceOutput, voiceTurnToken })) {
    if (fromVoice && voiceOutput === "realtime") __sbPatchRealtimeCostTurn({ routeIntent: "compare_skill" });
    return;
  }

  // Compare skill — "compare X / best X under Y / X vs Y". Asks tabs-or-wait, researches in the
  // backend, optionally opens theatric tabs, then presents the comparison + best pick.
  if (intent !== "record" && intent !== "agent" && __sbLooksLikeCompare(promptText)) {
    if (fromVoice && voiceOutput === "realtime") __sbPatchRealtimeCostTurn({ routeIntent: "compare_skill" });
    await __sbRunCompare(promptText, { fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  // "What's new / what's in you?" — Braino reads the changelog in first person, then flips the question back
  if (/what'?s?\s+new\s+(with\s+you|going\s+on|up\s+with\s+you)|what\s+have\s+you\s+been\s+up\s+to|what('?s|\s+is)\s+new\s+with\s+braino|anything\s+new\s+with\s+you|what'?s?\s+in\s+you|what\s+(can|do)\s+you\s+(do|have)|what\s+are\s+you\s+capable|what\s+are\s+your\s+(features?|abilities|capabilities)|tell\s+me\s+(about\s+yourself|what\s+you\s+can\s+do)/i.test(promptText)) {
    const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
    __sbShowThinking(scroll, promptText);
    __sbOpenCard({ rich: true });
    __sbChatHistory.push({ role: "user", content: promptText });
    const reply = __sbBuildWhatsNewReply();
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
    const hasPremium = await __sbResolvePremiumStatus(!fromVoice);
    if (!hasPremium) {
      __sbRtAwaitingDelegateResult = false;
      __sbShowUpgrade("Browser Agent (Delegate)");
      if (fromVoice) await speakVoiceReply("Browser agent requires premium.");
      __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
      return;
    }
    if (voiceOutput === "realtime") __sbRtAwaitingDelegateResult = true;
    __sbRunAgent(promptText, { connector: connectorHint });
    // Do not speak an interim ack here: it delays the actual action path and can
    // be re-captured by the realtime mic. The final agent update still speaks.
    __sbCompleteVoiceTurn({ fromVoice, voiceOutput, voiceTurnToken });
    return;
  }

  const pageContext = __sbGetPageContext();
  const hasPageText = Boolean(pageContext.text);
  const selectedText = pageContext.selectedText || undefined;
  const movieContext = pageContext.movieContext || null;
  const previousHistory = __sbChatHistory.slice(-10);

  if (intent === "web") {
    const voiceOnly = fromVoice && __sbVoiceOnlyMode;
    const searchQuery = __sbExtractSearchQuery(promptText); // clean query, not the raw sentence
    if (voiceOnly && __sbShouldOpenVisibleGoogleSearch(promptText)) {
      chrome.runtime.sendMessage({
        action: "openTab",
        url: "https://www.google.com/search?q=" + encodeURIComponent(searchQuery),
        active: false,
      }, () => { void chrome.runtime.lastError; });
    }
    if (!voiceOnly) {
      const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
      __sbShowThinking(scroll, promptText, "Searching the web…");
      __sbOpenCard({ rich: true });
      __sbSyncSpeakButtons();
      __sbStartWaitEntertainment(); // keep Braino lively while the search runs
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
      __sbStopWaitEntertainment();
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
    if (movieContext) body.movieContext = movieContext;
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
  // The bottom bar is the single, constant input — follow-ups come from here too.
  const input = document.getElementById("__sb_input__");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  if (input.tagName === "TEXTAREA") input.style.height = "auto";
  input.placeholder = "Follow up…";   // bar is the follow-up input now
  __sbPulseBar();                      // bar glows on every send
  await __sbProcessPrompt(text);
}

// Coral send-pulse on the constant input bar (mirrors __sbPulseFollowupBar).
function __sbPulseBar() {
  const bar = document.getElementById("__sb_bar__");
  if (!bar) return;
  bar.classList.remove("sb-send-pulse");
  void bar.offsetWidth;     // restart the animation
  bar.classList.add("sb-send-pulse");
  setTimeout(() => bar.classList.remove("sb-send-pulse"), 720);
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
  if (!__sbLastAgentTask) return;
  const now = Date.now();
  if (__sbAgentPendingTurn?.prompt === __sbLastAgentTask || (__sbAgentLaunchGuard.task === __sbLastAgentTask && now - __sbAgentLaunchGuard.ts < 5000)) {
    return;
  }
  __sbAgentLaunchGuard = { task: __sbLastAgentTask, ts: now };
  __sbChatHistory.push({ role: "user", content: __sbLastAgentTask });
  if (!__sbVoiceOnlyMode) { __sbSetAgentPendingTurn(__sbLastAgentTask, "Delegating…"); __sbStartWaitEntertainment(); }
  const handoff = __sbBuildAgentHandoffPayload(__sbLastAgentTask, options);
  // Hand off to background — it runs the full agent loop and sends sbAgentUpdate messages back
  chrome.runtime.sendMessage({
    action: "runBrainAgent",
    task: __sbLastAgentTask,
    connector: handoff.connector,
    mode: handoff.mode,
    chatHistory: handoff.chatHistory,
    cardTurns: handoff.cardTurns,
    lastUserPrompt: handoff.lastUserPrompt,
    lastAssistantReply: handoff.lastAssistantReply,
  }, () => {
    if (!chrome.runtime.lastError) return;
    __sbFinalizeAgentPendingTurn(__sbLastAgentTask, "I couldn't start delegate mode just now.");
  });
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
  const cfg = isM ? {
    emoji: "🤝", eyebrow: "MEETING & CALL",
    copy: "Braino listens to this tab and turns the whole conversation into structured notes.",
    chips: ["Decisions", "Action items", "Attendees"],
    metric: "live transcript · speaker labels",
  } : {
    emoji: "🎙️", eyebrow: "LECTURE & AUDIO",
    copy: "Braino follows the lecture and captures it as clean, study-ready notes.",
    chips: ["Key points", "Definitions", "Takeaways"],
    metric: "live transcript · auto outline",
  };
  const brainSvg = (isM ? __SB_BRAIN_SVG_LISTENING : __SB_BRAIN_SVG_SCHOLAR).replace('width="52" height="52"', 'width="72" height="72"');
  scroll.innerHTML = `
    <div class="sb-ready-wrap">
      <div class="sb-ready-mascot">
        <span class="sb-ready-mascot-halo"></span>
        <span class="sb-ready-mascot-ring sb-ready-mascot-ring-1"></span>
        <span class="sb-ready-mascot-ring sb-ready-mascot-ring-2"></span>
        ${brainSvg}
      </div>
      <div class="sb-ready-eyebrow"><span>${cfg.emoji}</span>${cfg.eyebrow}</div>
      <h2 class="sb-ready-headline">Ready to record</h2>
      <p class="sb-ready-copy">${cfg.copy}</p>
      <div class="sb-ready-preview">
        <div class="sb-ready-preview-label">${cfg.metric}</div>
        <div class="sb-ready-chips">${cfg.chips.map(c => `<span class="sb-ready-chip">${c}</span>`).join("")}</div>
        <div class="sb-ready-lines">
          <span class="sb-ready-line" style="width:88%"></span>
          <span class="sb-ready-line" style="width:71%"></span>
          <span class="sb-ready-line" style="width:82%"></span>
        </div>
      </div>
      <button id="__sb_lec_start_btn__" class="sb-ready-btn">
        <span class="sb-ready-btn-glow"></span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0"><path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z"/></svg>
        Start Recording
      </button>
    </div>
  `;
  __sbOpenCard({ rich: false });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  document.getElementById("__sb_lec_start_btn__")?.addEventListener("click", () => void __sbStartLectureRecording());
}

function __sbShowLectureResultMessage(title, message) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  scroll.innerHTML = `
    <div class="sb-lec-ready">
      <div class="sb-lec-kicker">${__sbEscapeHtml(title)}</div>
      <div class="sb-lec-ready-sub">${__sbEscapeHtml(message)}</div>
    </div>
  `;
}

function __sbGetMeetingArtifacts() {
  const actionItems = Array.isArray(__sbMeetingArtifacts?.actionItems) ? __sbMeetingArtifacts.actionItems : [];
  const followUps = Array.isArray(__sbMeetingArtifacts?.followUps) ? __sbMeetingArtifacts.followUps : [];
  return { actionItems, followUps };
}

function __sbRenderMeetingArtifactsHtml() {
  if (__sbLectureRecordingMode !== "meeting") return "";
  const { actionItems, followUps } = __sbGetMeetingArtifacts();
  if (!actionItems.length && !followUps.length) return "";

  const actionItemsHtml = actionItems.length
    ? `
      <section class="sb-meeting-artifact-card">
        <div class="sb-meeting-artifact-kicker">Action items</div>
        <div class="sb-meeting-artifact-title">Braino pulled out the concrete next steps from the meeting.</div>
        <ul class="sb-meeting-artifact-list">
          ${actionItems.slice(0, 5).map((item) => {
            const task = __sbEscapeHtml(item?.task || "Follow-up");
            const owner = __sbEscapeHtml(item?.owner || "");
            const due = __sbEscapeHtml(item?.dueDateText || "");
            const metaBits = [owner ? `Owner: ${owner}` : "", due ? `Due: ${due}` : ""].filter(Boolean).join(" · ");
            return `<li><strong>${task}</strong>${metaBits ? `<div class="sb-meeting-artifact-meta">${metaBits}</div>` : ""}</li>`;
          }).join("")}
        </ul>
      </section>
    `
    : "";

  const followUpsHtml = followUps.length
    ? followUps.map((item, index) => {
      const summary = __sbEscapeHtml(item?.summary || "Follow-up call");
      const attendee = __sbEscapeHtml(item?.attendeeName || "");
      const rawDateText = String(item?.dateText || "").trim();
      const rawTimeText = String(item?.timeText || "").trim();
      const dateText = __sbEscapeHtml(rawDateText);
      const timeText = __sbEscapeHtml(rawTimeText);
      const quote = __sbEscapeHtml(item?.sourceQuote || "");
      const meta = [attendee ? `With ${attendee}` : "", dateText, timeText].filter(Boolean).join(" · ");
      const buttonLabel = rawTimeText ? `Schedule ${rawDateText}, ${rawTimeText}` : `Schedule ${rawDateText}`;
      return `
        <section class="sb-meeting-artifact-card" data-sb-followup-card="${index}">
          <div class="sb-meeting-artifact-kicker">Calendar follow-up</div>
          <div class="sb-meeting-artifact-title">${summary}</div>
          ${meta ? `<div class="sb-meeting-artifact-meta">${meta}</div>` : ""}
          ${quote ? `<div class="sb-meeting-followup-quote">"${quote}"</div>` : ""}
          <div class="sb-meeting-artifact-meta">Should I put this on your calendar?</div>
          <div class="sb-meeting-followup-actions">
            <button class="sb-meeting-followup-btn accent" type="button" data-sb-followup-schedule="${index}">${__sbEscapeHtml(buttonLabel)}</button>
            <button class="sb-meeting-followup-btn" type="button" data-sb-followup-dismiss="${index}">Not now</button>
          </div>
          <div class="sb-meeting-followup-status" data-sb-followup-status="${index}"></div>
        </section>
      `;
    }).join("")
    : "";

  return `<div class="sb-meeting-artifacts">${actionItemsHtml}${followUpsHtml}</div>`;
}

async function __sbScheduleMeetingFollowUp(index) {
  const { followUps } = __sbGetMeetingArtifacts();
  const followUp = followUps[index];
  if (!followUp) return;

  const scheduleBtn = document.querySelector(`[data-sb-followup-schedule="${index}"]`);
  const dismissBtn = document.querySelector(`[data-sb-followup-dismiss="${index}"]`);
  const statusEl = document.querySelector(`[data-sb-followup-status="${index}"]`);
  if (scheduleBtn) scheduleBtn.disabled = true;
  if (dismissBtn) dismissBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Preparing calendar follow-up…";

  let timeText = String(followUp?.timeText || "").trim();
  if (!timeText) {
    const dateLabel = String(followUp?.dateText || "that day").trim();
    const promptLabel = String(followUp?.summary || "this follow-up").trim();
    const entered = window.prompt(`What time should I schedule "${promptLabel}" for ${dateLabel}?`, "3pm");
    timeText = String(entered || "").trim();
    if (!timeText) {
      if (statusEl) statusEl.textContent = "No time entered, so I left it unscheduled.";
      if (scheduleBtn) scheduleBtn.disabled = false;
      if (dismissBtn) dismissBtn.disabled = false;
      return;
    }
    __sbMeetingArtifacts.followUps[index].timeText = timeText;
  }

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "scheduleMeetingFollowUp",
      followUp: { ...followUp, timeText },
    }, (response) => resolve(response || {}));
  });

  if (res?.error) {
    if (statusEl) statusEl.textContent = String(res.error);
    if (scheduleBtn) scheduleBtn.disabled = false;
    if (dismissBtn) dismissBtn.disabled = false;
    return;
  }

  if (scheduleBtn) {
    scheduleBtn.textContent = "Scheduled ✓";
    scheduleBtn.disabled = true;
  }
  if (dismissBtn) dismissBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Added to Google Calendar.";
}

function __sbDismissMeetingFollowUp(index) {
  const card = document.querySelector(`[data-sb-followup-card="${index}"]`);
  if (card) card.remove();
}

function __sbBindMeetingArtifactsActions() {
  document.querySelectorAll("[data-sb-followup-schedule]").forEach((button) => {
    button.addEventListener("click", () => void __sbScheduleMeetingFollowUp(Number(button.getAttribute("data-sb-followup-schedule") || "-1")));
  });
  document.querySelectorAll("[data-sb-followup-dismiss]").forEach((button) => {
    button.addEventListener("click", () => __sbDismissMeetingFollowUp(Number(button.getAttribute("data-sb-followup-dismiss") || "-1")));
  });
}

function __sbShowLectureRecordingCard() {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  const isMeeting = __sbLectureRecordingMode === "meeting";
  const title = (document.title || "Untitled").slice(0, 50);
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const bars = Array.from({ length: 12 }, () => `<div class="sb-lec-wave-bar"></div>`).join("");
  const segmentButtonHtml = isMeeting ? "" : `<button id="__sb_lec_seg_btn__" class="sb-lec-seg-btn">✂ Save Segment</button>`;
  const statusCopy = isMeeting ? "Listening to this tab and your mic…" : "Listening to this tab…";
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
      <div class="sb-lec-status" id="__sb_lec_status__">${statusCopy}</div>
      <div class="sb-lec-btns">
        ${segmentButtonHtml}
        <button id="__sb_lec_stop_btn__" class="sb-lec-stop-btn">⏹ Stop & Get Notes</button>
      </div>
    </div>
  `;
  __sbOpenCard({ rich: false });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  document.getElementById("__sb_lec_seg_btn__")?.addEventListener("click", () => void __sbCaptureLectureSegment());
  document.getElementById("__sb_lec_stop_btn__")?.addEventListener("click", () => void __sbStopLectureRecording());
}

// ── In-page recording (getDisplayMedia) ──────────────────────────────────────
// chrome.tabCapture.getMediaStreamId (the offscreen path) needs the extension to be INVOKED on
// the tab (activeTab), which a floating-UI button can't grant — that's the real reason meeting
// recording threw "open the meeting in a regular browser tab". getDisplayMedia runs in the page
// with the Start button's user gesture, captures this tab's audio in place, and feeds the same
// transcription backend via the `transcribeSegment` message. Must be called inside a gesture.
let __sbInPageCaptureActive = false;
let __sbIpDisplayStream = null, __sbIpMicStream = null, __sbIpAudioCtx = null;
let __sbIpRecorder = null, __sbIpChunks = [];
let __sbIpMicRecorder = null, __sbIpMicChunks = [];

function __sbBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || "").split(",")[1] || null);
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

async function __sbStartInPageCapture(withMic) {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: true,                  // Chrome requires a video track to be requested…
    audio: true,
    preferCurrentTab: true,       // …default the picker to the tab the user is already on
    systemAudio: "include",
    selfBrowserSurface: "include",
  });
  __sbIpDisplayStream = display;
  display.getVideoTracks().forEach((t) => t.stop()); // we only need audio
  const audioTracks = display.getAudioTracks();
  if (!audioTracks.length) { __sbCleanupInPageCapture(); throw new Error("no_tab_audio"); }
  // If the user hits Chrome's "Stop sharing" bar, finish the recording cleanly.
  audioTracks[0].addEventListener("ended", () => { if (__sbIsLectureRecording) void __sbStopLectureRecording(); });

  let recordStream = new MediaStream(audioTracks);
  if (withMic) {
    __sbIpMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    __sbIpAudioCtx = new AudioContext();
    const dest = __sbIpAudioCtx.createMediaStreamDestination();
    __sbIpAudioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(dest);
    __sbIpAudioCtx.createMediaStreamSource(__sbIpMicStream).connect(dest);
    recordStream = dest.stream;
    __sbIpMicChunks = [];
    __sbIpMicRecorder = new MediaRecorder(__sbIpMicStream, { mimeType: "audio/webm;codecs=opus" });
    __sbIpMicRecorder.ondataavailable = (e) => { if (e.data.size > 0) __sbIpMicChunks.push(e.data); };
    __sbIpMicRecorder.start(1000);
  }
  __sbIpChunks = [];
  __sbIpRecorder = new MediaRecorder(recordStream, { mimeType: "audio/webm;codecs=opus" });
  __sbIpRecorder.ondataavailable = (e) => { if (e.data.size > 0) __sbIpChunks.push(e.data); };
  __sbIpRecorder.start(1000);
  __sbInPageCaptureActive = true;
}

function __sbFlushIpRecorder(rec) {
  return new Promise((resolve) => {
    if (!rec || rec.state !== "recording") { resolve(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(t); rec.removeEventListener("dataavailable", on); resolve(); };
    const on = () => finish();
    const t = setTimeout(finish, 400);
    rec.addEventListener("dataavailable", on, { once: true });
    try { rec.requestData(); } catch { finish(); }
  });
}

async function __sbBuildIpSpeakerRefs() {
  if (__sbIpMicRecorder && __sbIpMicRecorder.state === "recording") await __sbFlushIpRecorder(__sbIpMicRecorder);
  if (__sbIpMicChunks.length < 2) return [];
  const b64 = await __sbBlobToBase64(new Blob(__sbIpMicChunks.slice(0, 6), { type: "audio/webm" }));
  return b64 ? [{ name: "You", audioBase64: b64, mimeType: "audio/webm" }] : [];
}

async function __sbGetInPageSegment() {
  if (!__sbIpRecorder) return { audioBase64: null, knownSpeakerReferences: [] };
  await __sbFlushIpRecorder(__sbIpRecorder);
  const refs = await __sbBuildIpSpeakerRefs();
  if (!__sbIpChunks.length) return { audioBase64: null, knownSpeakerReferences: refs };
  const chunks = __sbIpChunks.slice(); __sbIpChunks = [];
  return { audioBase64: await __sbBlobToBase64(new Blob(chunks, { type: "audio/webm" })), knownSpeakerReferences: refs };
}

async function __sbTranscribeIpSegment(seg) {
  return await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "transcribeSegment",
      audioBase64: seg.audioBase64,
      existingNotes: __sbLectureNotes,
      existingTranscript: __sbLectureTranscript,
      mode: __sbLectureRecordingMode,
      knownSpeakerReferences: seg.knownSpeakerReferences || [],
    }, (r) => resolve(r || {}));
  });
}

function __sbCleanupInPageCapture() {
  try { if (__sbIpRecorder && __sbIpRecorder.state !== "inactive") __sbIpRecorder.stop(); } catch {}
  __sbIpRecorder = null; __sbIpChunks = [];
  try { if (__sbIpMicRecorder && __sbIpMicRecorder.state !== "inactive") __sbIpMicRecorder.stop(); } catch {}
  __sbIpMicRecorder = null; __sbIpMicChunks = [];
  if (__sbIpDisplayStream) { __sbIpDisplayStream.getTracks().forEach((t) => t.stop()); __sbIpDisplayStream = null; }
  if (__sbIpMicStream) { __sbIpMicStream.getTracks().forEach((t) => t.stop()); __sbIpMicStream = null; }
  if (__sbIpAudioCtx) { __sbIpAudioCtx.close().catch(() => {}); __sbIpAudioCtx = null; }
  __sbInPageCaptureActive = false;
}

async function __sbStartLectureRecording(options = {}) {
  if (!__sbContextOk()) {
    __sbShowBubble("Reload this page to reconnect Braino.", true);
    return;
  }
  if (__sbIsLectureRecording) return;

  const mode = window.__sbForcedMode === "meeting" ? "meeting" : "lecture";
  const withMic = (mode === "meeting");

  // Display capture requires a user gesture. If we got here without one (voice/typed command or
  // a background message), show the ready card so the user taps Start — that tap is the gesture.
  if (!(navigator.userActivation && navigator.userActivation.isActive)) {
    __sbShowLectureReadyCard(mode);
    return;
  }

  __sbIsLectureRecording = true;
  __sbLectureNotes = "";
  __sbLectureTranscript = "";
  __sbLecSegmentCount = 0;
  __sbMeetingArtifacts = { actionItems: [], followUps: [] };
  __sbLectureRecordingMode = mode;

  try {
    // Synchronous-until-getDisplayMedia so the click's transient activation is still valid.
    await __sbStartInPageCapture(withMic);
  } catch (err) {
    __sbIsLectureRecording = false;
    __sbCleanupInPageCapture();
    const name = String(err?.name || "");
    if (name === "NotAllowedError" || name === "AbortError") {
      __sbShowBubble("Recording cancelled.", true, { tone: "status" });
    } else if (String(err?.message) === "no_tab_audio") {
      __sbShowBubble("Pick “This Tab” and turn on “Also share tab audio”, then start again.", true, { tone: "status", title: mode === "meeting" ? "Meeting & Call" : "Lecture" });
    } else {
      __sbShowBubble("Could not start recording: " + (err?.message || "unknown error"), true);
    }
    return;
  }

  const brainBtn = document.getElementById("__sb_brain_btn__");
  if (brainBtn) {
    __sbStopWalkLoop();
    brainBtn.classList.add("recording");
    brainBtn.innerHTML = __sbLectureRecordingMode === "lecture" ? __SB_BRAIN_SVG_SCHOLAR : __SB_BRAIN_SVG_LISTENING;
  }
  __sbShowLectureRecordingBar(false);
  __sbShowLectureRecordingCard();
  if (options.readyMessage) {
    const statusEl = document.getElementById("__sb_lec_status__");
    if (statusEl) statusEl.textContent = String(options.readyMessage);
  }

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
  if (__sbLectureRecordingMode === "meeting") return;
  const segBtn = document.getElementById("__sb_lec_seg_btn__");
  const captureBtn = document.getElementById("__sb_capture_btn__");
  const statusEl = document.getElementById("__sb_lec_status__");

  if (segBtn) { segBtn.disabled = true; segBtn.textContent = "Saving…"; }
  if (captureBtn) captureBtn.classList.add("loading");
  if (statusEl) statusEl.textContent = "Capturing segment…";

  try {
    const res = __sbInPageCaptureActive
      ? await __sbTranscribeIpSegment(await __sbGetInPageSegment())
      : await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "getLectureSegment",
            existingNotes: __sbLectureNotes,
            existingTranscript: __sbLectureTranscript,
            mode: __sbLectureRecordingMode,
          }, (r) => resolve(r || {}));
        });

    if (res.error) {
      if (statusEl) statusEl.textContent = `Capture failed — ${res.error}`;
      if (segBtn) { segBtn.disabled = false; segBtn.textContent = "✂ Save Segment"; }
      return;
    }
    if (res.empty) {
      if (statusEl) statusEl.textContent = "Nothing recorded yet — speak a bit longer.";
      if (segBtn) { segBtn.disabled = false; segBtn.textContent = "✂ Save Segment"; }
      return;
    }

    __sbLectureNotes = res.notes || __sbLectureNotes;
    __sbLectureTranscript = res.transcript || __sbLectureTranscript;
    if (res.meetingArtifacts) __sbMeetingArtifacts = res.meetingArtifacts;
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
  if (brainBtnStop) { brainBtnStop.classList.remove("recording"); __sbRestoreWalkBrain(); }
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

  let res;
  if (__sbInPageCaptureActive) {
    // In-page path: flush the final segment, transcribe it, then tear the capture down.
    const seg = await __sbGetInPageSegment();
    res = seg.audioBase64 ? await __sbTranscribeIpSegment(seg) : { notes: __sbLectureNotes, transcript: __sbLectureTranscript };
    __sbCleanupInPageCapture();
  } else {
    res = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "stopRecordingAndTranscribe",
          existingNotes: __sbLectureNotes,
          existingTranscript: __sbLectureTranscript,
          mode: __sbLectureRecordingMode,
        },
        (r) => resolve(r || {}),
      );
    });
  }

  if (res.error) {
    __sbShowLectureResultMessage("Recording stopped", res.error);
    return;
  }

  if (res.notes) __sbLectureNotes = res.notes;
  if (res.transcript) __sbLectureTranscript = res.transcript;
  if (res.meetingArtifacts) __sbMeetingArtifacts = res.meetingArtifacts;

  if (__sbLectureNotes) {
    __sbShowLectureNotes(__sbLectureNotes, true);
    return;
  }

  __sbShowLectureResultMessage(
    "Recording stopped",
    __sbLectureRecordingMode === "meeting"
      ? "No content was captured — try again and make sure the meeting audio and your mic are both audible."
      : "No content was captured — try speaking louder or use ✂ Save Segment during the next session.",
  );
}

function __sbShowLectureNotes(notes, isFinal) {
  const scroll = document.getElementById("__sb_bubble__")?.querySelector(".sb-card-scroll");
  if (!scroll) return;
  __sbLastBubbleRaw = notes;
  const meetingArtifactsHtml = isFinal ? __sbRenderMeetingArtifactsHtml() : "";
  const actionsHtml = isFinal ? `
    <div class="sb-lec-notes-actions">
      <button id="__sb_lec_copy_btn__" class="sb-lec-copy-btn">Copy</button>
      <button id="__sb_notion_sync_btn__" class="sb-notion-btn" style="flex:1.4">Sync to Notion</button>
    </div>
  ` : "";
  scroll.innerHTML = `<div class="sb-card-a">${__sbRenderMarkdown(notes)}${meetingArtifactsHtml}</div>${actionsHtml}`;
  __sbOpenCard({ rich: true });
  if (__sbBubbleTimer) clearTimeout(__sbBubbleTimer);
  if (isFinal) {
    document.getElementById("__sb_notion_sync_btn__")?.addEventListener("click", __sbSyncNotesToNotion);
    document.getElementById("__sb_lec_copy_btn__")?.addEventListener("click", () => {
      navigator.clipboard.writeText(notes).catch(() => {});
      const btn = document.getElementById("__sb_lec_copy_btn__");
      if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1800); }
    });
    __sbBindMeetingArtifactsActions();
  }
}

async function __sbSyncNotesToNotion() {
  const btn = document.getElementById("__sb_notion_sync_btn__");
  if (btn) { btn.textContent = "Syncing…"; btn.disabled = true; }

  const noteLabel = __sbLectureRecordingMode === "meeting" ? "Meeting Notes" : "Lecture Notes";
  const title = `${noteLabel} — ` + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
let __sbVoiceOutputPref = "fish"; // "realtime" | "fish"

// Voice 1B: the conversation "brain". "realtime" = let the realtime model stream the answer
// straight into Fish (fast, no chat-about-notes hop). "chat" = today's batch pipeline (the
// instant-revert fallback). Default realtime. Read once from storage; flip via sbVoiceBrain.
let __sbVoiceBrain = "realtime"; // "realtime" | "chat"
try {
  chrome.storage?.local?.get?.(["sbVoiceBrain"], (r) => {
    if (r && (r.sbVoiceBrain === "chat" || r.sbVoiceBrain === "realtime")) __sbVoiceBrain = r.sbVoiceBrain;
  });
  chrome.storage?.onChanged?.addListener?.((changes, area) => {
    if (area === "local" && changes.sbVoiceBrain) {
      const v = changes.sbVoiceBrain.newValue;
      if (v === "chat" || v === "realtime") __sbVoiceBrain = v;
    }
  });
} catch (_) {}
// Streaming-TTS pipeline state (set while the realtime brain streams deltas into Fish).
let __sbStreamFishActive = false;
let __sbStreamTts = null; // { token, buffer, queue, draining, ended, headers, spoke }
let __sbRtLastAnsweredUrl = ""; // anti-stale: re-sync session context when the page changes

// Language: Braino defaults to English in voice. It only switches after the user explicitly
// confirms (kills the "random foreign-language reply" bug, which was noise mis-detection +
// "mirror the user" instruction). __sbActiveLanguage = the confirmed non-English language for
// this session (null = English). __sbPendingLanguageSwitch = a detected language awaiting a
// yes/no confirmation.
let __sbActiveLanguage = null;
let __sbPendingLanguageSwitch = null;

// Detect a CONFIDENT non-English signal only — never a fuzzy guess. Two triggers:
// 1) a non-Latin script in the text (mostly typed input; voice STT is English-locked), and
// 2) an explicit English-language request ("speak in Hindi", "reply in German", "switch to French").
function __sbDetectLanguageRequest(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const scripts = [
    [/[ऀ-ॿ]/, { code: "hi", name: "Hindi" }],
    [/[一-鿿]/, { code: "zh", name: "Chinese" }],
    [/[぀-ヿ]/, { code: "ja", name: "Japanese" }],
    [/[가-힯]/, { code: "ko", name: "Korean" }],
    [/[Ѐ-ӿ]/, { code: "ru", name: "Russian" }],
    [/[؀-ۿ]/, { code: "ar", name: "Arabic" }],
  ];
  for (const [re, lang] of scripts) if (re.test(t)) return lang;
  const names = {
    hindi: { code: "hi", name: "Hindi" }, german: { code: "de", name: "German" },
    french: { code: "fr", name: "French" }, spanish: { code: "es", name: "Spanish" },
    italian: { code: "it", name: "Italian" }, portuguese: { code: "pt", name: "Portuguese" },
    japanese: { code: "ja", name: "Japanese" }, chinese: { code: "zh", name: "Chinese" },
    mandarin: { code: "zh", name: "Chinese" }, korean: { code: "ko", name: "Korean" },
    russian: { code: "ru", name: "Russian" }, arabic: { code: "ar", name: "Arabic" },
    dutch: { code: "nl", name: "Dutch" }, punjabi: { code: "pa", name: "Punjabi" },
    urdu: { code: "ur", name: "Urdu" }, bengali: { code: "bn", name: "Bengali" },
    tamil: { code: "ta", name: "Tamil" }, telugu: { code: "te", name: "Telugu" },
  };
  const lower = t.toLowerCase();
  const m = lower.match(/\b(?:speak|talk|say|reply|respond|answer|converse|switch)\b[^.?!]*?\b(?:in|to)\s+([a-z]+)/);
  if (m && names[m[1]]) return names[m[1]];
  const m2 = lower.match(/\bin\s+([a-z]+)\s*(?:please|now)?[.?!]?$/);
  if (m2 && names[m2[1]]) return names[m2[1]];
  return null;
}

// Apply a confirmed language switch (or revert to English when lang is null): re-push the session
// so STT and the reply-language instruction update immediately.
function __sbApplyVoiceLanguage(lang) {
  __sbActiveLanguage = lang || null;
  __sbRtInstructionsFingerprint = ""; // force the next sync to re-send instructions
  __sbSendRealtimeSessionUpdate(__sbBuildRealtimeBootInstructions());
  void __sbSyncRealtimeVoiceInstructions();
}
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
let __sbRtRealtimeModel = "gpt-realtime-mini";
let __sbRtTranscriptionModel = "gpt-4o-mini-transcribe";
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
  // "elevenlabs" is the legacy value — migrate it to "fish".
  return value === "realtime" ? "realtime" : "fish";
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
    text.includes("403")
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
  if (__sbVoiceOutputPref === "fish") {
    return { voiceProvider: "fish-audio", voiceId: "", voiceName: __SB_FISH_VOICE_NAME };
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

function __sbBuildRealtimeMovieBlock(movieContext) {
  if (!movieContext?.title) return "";
  return [
    "---",
    "MOVIE COMPANION MODE",
    `You are watching "${movieContext.title}" together with the user right now.`,
    `Timestamp: ${__sbFormatMovieTimestamp(movieContext.timestamp || 0)}. Playback: ${movieContext.isPaused ? "paused" : "playing"}.`,
    "",
    "Recent subtitle transcript:",
    movieContext.subtitleTranscript || (movieContext.currentSubtitle ? movieContext.currentSubtitle : "(no captions available yet)"),
    "",
    "Rules:",
    "- Treat scene questions as local movie questions, not web research.",
    "- Never spoil future events unless the user explicitly asks for spoilers.",
    "- Answer like a companion watching with them: concise, direct, warm.",
  ].join("\n");
}

function __sbAugmentRealtimeInstructionsWithMovieContext(instructions, movieContext) {
  const base = String(instructions || "").trim();
  const movieBlock = __sbBuildRealtimeMovieBlock(movieContext);
  return movieBlock ? `${base}\n\n${movieBlock}` : base;
}

function __sbBuildRealtimeBootInstructions() {
  // Keep the connect path cheap. A synchronous full-page scrape here (e.g. innerText of a huge
  // Notion/Gmail DOM) can add seconds before the socket even opens. We send only the static
  // identity/behavior plus a cheap title/URL line; the full page content, notes, and movie
  // captions are pushed the instant we connect by __sbSyncRealtimeVoiceInstructions().
  const pageLines = [];
  try {
    pageLines.push(`The user is currently viewing: "${document.title || "Untitled"}" (${location.href || "unknown URL"})`);
  } catch (_) {}

  const instructions = [
    // Minimal identity stub only — Braino's full personality (the Emotional Engine) is delivered
    // the instant we connect by __sbSyncRealtimeVoiceInstructions() → openai-realtime-config.
    // Keep this short so we don't drift from the canonical personality in _shared/emotional-engine.
    "You are Braino — a warm, emotionally present companion, not a chatbot and not an assistant. Never say you are made by OpenAI or run on any AI model; if asked, you are Braino, full stop. Your full personality loads in a moment.",
    __sbBuildLatestUpdatesPromptBlock(),
    "Context awareness: You can see what the user is browsing and the current page. Use that context proactively — don't wait to be pointed at it. If they ask about something on the page, you already read it. Act like it. Do not say you cannot access the page.",
    "You can act in the browser: search the web, open tabs and websites, play music, and read the page. NEVER say 'I can't open that from here', 'I can't browse', or 'I cannot do that' — you can. When the user asks you to look something up, search for something, find an article, or open a site, treat it as an action you will carry out, not a limitation. Briefly acknowledge ('On it' / 'Pulling that up') — the system performs the action.",
    "If you only caught noise, music, or unclear audio — or you are not confident what the user said — ask them to repeat it. NEVER invent or guess a response when you didn't actually understand the words.",
    __sbActiveLanguage
      ? `Reply ONLY in ${__sbActiveLanguage.name}. The user has confirmed ${__sbActiveLanguage.name} for this session.`
      : "ALWAYS reply in English. Do NOT switch languages because of background noise, music, accents, names, quoted text, or a few foreign-sounding words — even if a transcript looks like another language, answer in English. The system asks the user first and only tells you to switch after they confirm.",
    "Prefer short spoken answers. No filler. No hollow openers. Get to the point and stop.",
    "If interrupted, stop immediately and wait for the user.",
    ...pageLines,
  ].filter(Boolean).join("\n\n");
  // Movie/page context is delivered by __sbSyncRealtimeVoiceInstructions() right after connect.
  return instructions;
}

function __sbBuildRealtimeSessionUpdate(instructions) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: ["text"],
      audio: {
        input: {
          noise_reduction: {
            type: "near_field",
          },
          transcription: {
            model: "gpt-4o-mini-transcribe",
            // Lock STT to English by default so noise/music/accents can't be mis-detected as a
            // foreign language (the root of the "random language reply" bug). After the user
            // confirms a switch, __sbActiveLanguage relaxes the lock to that language.
            language: __sbActiveLanguage?.code || "en",
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
    movieContext: pageContext.movieContext || null,
    // English by default; only mirror the user's language after a confirmed switch (otherwise
    // the synced instructions would re-introduce "reply in the same language" and undo the lock).
    languagePolicy: __sbActiveLanguage ? "mirror_user" : "english",
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
    const instructions = __sbAugmentRealtimeInstructionsWithMovieContext(
      String(data?.instructions || "").trim(),
      __sbGetPageContext(2500).movieContext || null,
    );
    const fingerprint = String(data?.fingerprint || "").trim();
    if (!instructions) return false;
    const localFingerprint = `${fingerprint || "local"}::${__sbBuildMovieContextSummary(__sbGetPageContext(2500).movieContext || null)}`;
    if (localFingerprint && localFingerprint === __sbRtInstructionsFingerprint) return true;
    if (!__sbHeadphoneMode || !__sbRtControlReady()) return false;

    const updated = __sbSendRealtimeSessionUpdate(instructions);
    if (updated) {
      __sbRtInstructionsFingerprint = localFingerprint;
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
      const errorText = await res.text();
      let errorPayload = {};
      try {
        errorPayload = JSON.parse(errorText);
      } catch {}
      if (res.status === 429) {
        throw new Error(errorPayload.details || errorPayload.error || errorText || "Live AI is busy — too many requests. Try again in a moment.");
      }
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

// ── Voice 1B: stream the realtime model's text deltas into Fish, sentence-by-sentence ────────
// Reuses the existing Fish fetch/play primitives (__sbFetchSentenceTts / __sbPlaySentenceResp)
// and the __sbSpeechGeneration barge-in token. The win over the batch path: we PREFETCH the next
// sentence while the current one plays, and we start the moment sentence 1 lands instead of after
// the whole answer is written.
function __sbBeginStreamTts(speechToken) {
  __sbStreamTts = { token: speechToken, buffer: "", queue: [], draining: false, ended: false, headers: null, spoke: false, firstEmitted: false, group: "" };
  const s = __sbStreamTts;
  __sbStorageGet(["authToken"]).then(({ authToken }) => {
    if (!__sbStreamTts || __sbStreamTts !== s || s.token !== __sbSpeechGeneration) return;
    const headers = { "Content-Type": "application/json", apikey: __SB_ANON_KEY };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    s.headers = headers;
    void __sbDrainStreamTts(); // sentences may already be queued
  });
}

// Pull complete sentences out of the growing buffer and queue them. Boundary rule matches the batch
// chunker (terminator + whitespace, so decimals/"e.g." don't over-split). To respect Fish's 429
// limit (the v7.5.1 lesson: keep request COUNT low), only the FIRST sentence goes out alone (fast
// first audio); the rest are grouped into ≤240-char chunks before queueing.
const __SB_STREAM_TTS_MAX = 240;
function __sbEnqueueStreamSentence(s, sentence) {
  if (!s.firstEmitted) { s.queue.push(sentence); s.firstEmitted = true; return; }
  if (s.group && (s.group.length + 1 + sentence.length) > __SB_STREAM_TTS_MAX) {
    s.queue.push(s.group);
    s.group = sentence;
  } else {
    s.group = s.group ? `${s.group} ${sentence}` : sentence;
  }
}

function __sbFeedStreamTts(delta) {
  const s = __sbStreamTts;
  if (!s || s.token !== __sbSpeechGeneration) return;
  s.buffer += delta;
  let match;
  while ((match = s.buffer.match(/^([\s\S]*?[.!?…।])\s+/))) {
    const sentence = match[1].trim();
    s.buffer = s.buffer.slice(match[0].length);
    if (sentence) __sbEnqueueStreamSentence(s, sentence);
  }
  void __sbDrainStreamTts();
}

function __sbEndStreamTts() {
  const s = __sbStreamTts;
  if (!s || s.token !== __sbSpeechGeneration) return;
  const tail = s.buffer.trim();
  s.buffer = "";
  if (tail) __sbEnqueueStreamSentence(s, tail);
  if (s.group) { s.queue.push(s.group); s.group = ""; } // flush the trailing group
  s.ended = true;
  void __sbDrainStreamTts();
}

// Single drain loop: play queued sentences in order, prefetching the next while the current plays.
async function __sbDrainStreamTts() {
  const s = __sbStreamTts;
  if (!s || s.draining || !s.headers) return;
  s.draining = true;
  try {
    let pending = null; // { promise } — a fetch already started for the next sentence
    while (true) {
      if (!__sbStreamTts || s.token !== __sbSpeechGeneration) return; // barge-in / superseded
      let item = pending;
      pending = null;
      if (!item) {
        if (s.queue.length === 0) {
          if (s.ended) break;
          await new Promise((r) => setTimeout(r, 25));
          continue;
        }
        item = { promise: __sbFetchSentenceTts(s.queue.shift(), s.token, s.headers) };
      }
      const cur = await item.promise;
      if (s.token !== __sbSpeechGeneration) return;
      // Kick off the next sentence's fetch NOW so it overlaps this one's playback (no gap).
      if (s.queue.length > 0) {
        pending = { promise: __sbFetchSentenceTts(s.queue.shift(), s.token, s.headers) };
      }
      if (cur.error) { __sbHandleFishTtsFailure(cur.error); continue; }
      if (!cur.resp) return;
      try {
        const played = await __sbPlaySentenceResp(cur.resp, s.token);
        if (played) s.spoke = true;
      } catch (mediaErr) {
        if (s.token !== __sbSpeechGeneration) return;
        __sbHandleFishTtsFailure(mediaErr);
      }
    }
  } finally {
    s.draining = false;
    if (__sbStreamTts === s && s.token === __sbSpeechGeneration && s.ended && s.queue.length === 0) {
      __sbWalkTalking = false;
    }
  }
}

// 1B conversation turn: refresh session context if the page changed, then let the realtime model
// generate and stream straight into Fish. Returns true if it answered; false → caller falls back.
async function __sbAnswerViaRealtimeStreaming(turnToken) {
  if (!__sbRtControlReady()) return false;

  // Anti-stale gate: only pay a context re-sync when the page actually changed since last answer.
  const url = (typeof location !== "undefined" && location.href) || "";
  if (url && url !== __sbRtLastAnsweredUrl) {
    try { await __sbSyncRealtimeVoiceInstructions(); } catch (_) {}
    __sbRtLastAnsweredUrl = url;
    if (!__sbRtControlReady()) return false;
  }

  __sbStopSpeech(); // claim a fresh speech token + clear any prior stream
  const speechToken = __sbSpeechGeneration;
  __sbBeginStreamTts(speechToken);
  __sbStreamFishActive = true;

  if (__sbHasActiveRealtimeResponse()) __sbInterruptRealtimeResponse();
  __sbRtAssistantTranscript = "";
  __sbRtCurrentResponseMode = "conversation";
  __sbRtHandlingConversationTurn = true;
  __sbVoicePendingReply = true;
  if (__sbHeadphoneMode) __sbSetHpBrainState("speaking");

  const waiter = __sbCreateRtWaiter();
  const sent = __sbSendRtEvent({ type: "response.create", response: { output_modalities: ["text"] } });
  if (!sent) {
    __sbStreamFishActive = false;
    __sbStreamTts = null;
    __sbResetRealtimeResponseState();
    return false; // control channel not ready → fall back to batch path
  }

  const result = await waiter; // resolves at response.done / cancelled / error (TEXT done)
  __sbStreamFishActive = false;
  __sbEndStreamTts(); // flush the trailing partial sentence

  // Fish audio lags the text stream — wait for it to finish playing (or barge-in to supersede)
  // before finalizing the turn, so TTS cost events land on this turn and the next turn waits.
  while (__sbStreamTts && __sbStreamTts.token === speechToken &&
         (__sbStreamTts.draining || __sbStreamTts.queue.length > 0)) {
    await new Promise((r) => setTimeout(r, 40));
  }

  __sbCompleteVoiceTurn({ fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
  return result?.status === "done";
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

  const rtOutputModalities = ["text"];
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
  // TTS endpoint (that would be two voices). Only call __sbSpeakText when Fish Audio is
  // selected, OR when falling back from a failed relay.
  const useExternalTts = __sbVoiceOutputPref === "fish";
  if (preferred === "realtime") __sbAppendRealtimeCostAssistantMessage(text);

  if (preferred === "realtime" && __sbRtControlReady() && !useExternalTts) {
    // Native realtime: send a relay event and let the model speak.
    await __sbRequestRealtimeReply(text, { relayMode: true, verbatim: !!options.verbatim });
    return true;
  }
  // External TTS voice (Fish Audio) or non-realtime context.
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
  }, 350);
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

  if (/\bfavou?rite\b/i.test(promptText)) {
    await __sbProcessPrompt(promptText, {
      fromVoice: true,
      voiceOutput: "realtime",
      voiceTurnToken: turnToken,
    });
    return;
  }

  // Jump & Point — "where is X / point me to X". Steer down __sbProcessPrompt (which runs the
  // leap-and-point) BEFORE delegate/agent classification, so it isn't grabbed by the browser agent.
  if (__sbIsLocateRequest(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "point" });
    await __sbProcessPrompt(promptText, {
      fromVoice: true,
      voiceOutput: "realtime",
      voiceTurnToken: turnToken,
    });
    return;
  }

  // Design mockup — steer down the SAME chat pipeline (synthesizes the prompt + opens the design
  // tool) BEFORE delegate/agent classification, so "open the design tool" isn't grabbed by the
  // generic browser agent. voice = delegate, but the design mockup is one shared capability.
  if (__sbIsDesignMockupRequest(promptText)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "chat" });
    await __sbProcessPrompt(promptText, {
      fromVoice: true,
      voiceOutput: "realtime",
      voiceTurnToken: turnToken,
      forceIntent: "chat",
    });
    return;
  }

  if (__sbShouldFastLaunchRealtimeAgent(routing)) {
    __sbPatchRealtimeCostTurn({ routeIntent: "agent" });
    __sbRtAwaitingDelegateResult = true;
    __sbRunAgent(promptText, { connector: routing.connectorHint });
    __sbCompleteVoiceTurn({ fromVoice: true, voiceOutput: "realtime", voiceTurnToken: turnToken });
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

  // General conversation. 1B: when the realtime-native brain is on and Fish is the voice, let the
  // realtime model stream its answer straight into Fish — no chat-about-notes hop, first audio in
  // ~0.5s instead of after a full batch completion. The session already holds page/notes context
  // (synced via __sbSyncRealtimeVoiceInstructions), so it stays page-aware. Falls back to the batch
  // pipeline below if streaming can't run (toggle off, realtime not ready, or it errors mid-turn).
  if (__sbVoiceBrain === "realtime" && __sbRtControlReady() && __sbVoiceOutputPref === "fish") {
    __sbPatchRealtimeCostTurn({ routeIntent: "chat" });
    const ok = await __sbAnswerViaRealtimeStreaming(turnToken);
    if (ok) return;
    // streaming failed → fall through to the batch pipeline
  }

  // Batch fallback — the SAME smart text pipeline legacy voice uses (chat-about-notes, with full
  // page DOM + notes + selected text), spoken in the realtime voice.
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
    // voices: cancel the realtime model's audio and stop Fish Audio/browser playback.
    // Without this, provider audio keeps playing and feels "not realtime".
    if (__sbHasActiveRealtimeResponse()) {
      __sbVoicePendingReply = false;
      __sbInterruptRealtimeResponse();
    }
    __sbStopSpeech(); // stop Fish Audio / browser TTS playback so the user can barge in
    __sbRtUserTranscript = "";
    if (__sbHeadphoneMode) __sbSetHpBrainState("hearing"); // user is talking → Sonar Pulse
    return;
  }
  if (ev.type === "input_audio_buffer.speech_stopped") {
    // User paused → stop the sonar; sit idle while we transcribe/think (not talking).
    if (__sbHeadphoneMode) __sbSetHpBrainState("listening");
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

    // Language confirmation flow. If we asked the user whether to switch languages, this turn is
    // their yes/no answer — consume it instead of treating it as a normal request.
    if (__sbPendingLanguageSwitch) {
      const lang = __sbPendingLanguageSwitch.lang;
      if (__sbIsXSkillYes(transcript)) {
        __sbPendingLanguageSwitch = null;
        __sbApplyVoiceLanguage(lang);
        void __sbSpeakWithPreferredVoice(`Okay, switching to ${lang.name}.`, "realtime");
      } else if (__sbIsXSkillNo(transcript)) {
        __sbPendingLanguageSwitch = null;
        void __sbSpeakWithPreferredVoice("Okay, I'll stay in English.", "realtime");
      } else {
        void __sbSpeakWithPreferredVoice(`Just say yes to switch to ${lang.name}, or no to stay in English.`, "realtime");
      }
      return;
    }

    // Ask-before-switching: if a clear non-English signal shows up while we're still in English,
    // confirm in English first instead of silently replying in that language.
    if (!__sbActiveLanguage) {
      const detected = __sbDetectLanguageRequest(transcript);
      if (detected) {
        __sbPendingLanguageSwitch = { lang: detected };
        void __sbSpeakWithPreferredVoice(`That sounded like ${detected.name}. Want me to switch to ${detected.name}, or keep speaking English?`, "realtime");
        return;
      }
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
      if (__sbStreamFishActive) __sbFeedStreamTts(ev.delta); // 1B: stream into Fish as it arrives
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

function __sbApplyVoiceAutoRoutingDefaults() {
  // Voice uses SMART auto-routing: conversation answers instantly on the fast chat path, and only
  // genuine tasks go through the Delegate agent (decided by __sbShouldFastLaunchRealtimeAgent's
  // obvious-action shortcut + the backend shouldDelegate classifier in __sbHandleInlineRealtimeTurn).
  // We deliberately do NOT force every spoken turn through the agent loop — that added latency to
  // plain conversation, and keyword-forcing risks treating chit-chat as a task.
  window.__sbForcedMode = "page";
  window.__sbForcedConnector = "auto";

  const label = "⚡ Auto";
  document.getElementById("__sb_mode_label__")?.replaceChildren(document.createTextNode(label));
  document.getElementById("__sb_card_mode_label__")?.replaceChildren(document.createTextNode(label));
  document.getElementById("__sb_mode_btn__")?.classList.remove("active-mode");
  document.getElementById("__sb_card_mode_btn__")?.classList.remove("active-mode");

  document.querySelectorAll("#__sb_mode_dropdown__ .sb-dropdown-item").forEach((item) => {
    item.classList.toggle("selected", item.getAttribute("data-mode") === "page");
  });

  __sbRefreshConnectorButtons();
  document.getElementById("__sb_connector_slash_dropdown__")?.classList.remove("open");
  document.getElementById("__sb_mode_dropdown__")?.classList.remove("open");
  document.getElementById("__sb_connector_dropdown__")?.classList.remove("open");
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

function __sbFormatContactPromptHtml(message) {
  const safe = __sbEscapeHtml(String(message || "").trim() || "Add this contact once and Braino will remember them.");
  return safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function __sbShowContactPromptModal(payload = {}) {
  return new Promise((resolve) => {
    try {
      document.getElementById("__sb_contact_prompt__")?.remove();

      const overlay = document.createElement("div");
      overlay.id = "__sb_contact_prompt__";
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "background:rgba(8,5,4,0.52)",
        "backdrop-filter:blur(4px)",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:24px",
      ].join(";");

      const card = document.createElement("form");
      card.style.cssText = [
        "width:min(440px,92vw)",
        "border-radius:24px",
        "padding:22px",
        "color:#1F1713",
        "background:linear-gradient(180deg, rgba(251,247,241,0.95), rgba(246,236,223,0.92))",
        "border:1px solid rgba(107,82,72,0.18)",
        "box-shadow:0 24px 70px rgba(0,0,0,0.34)",
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      ].join(";");

      const title = document.createElement("div");
      title.textContent = String(payload.title || "Save contact");
      title.style.cssText = "font-size:24px;font-weight:600;letter-spacing:-0.03em;color:#2C201B;";

      const body = document.createElement("div");
      body.innerHTML = __sbFormatContactPromptHtml(payload.message);
      body.style.cssText = "margin-top:8px;font-size:13px;line-height:1.55;color:#6B5248;";

      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;gap:12px;margin-top:18px;";

      const buildField = (labelText, input) => {
        const wrap = document.createElement("label");
        wrap.style.cssText = "display:grid;gap:6px;";
        const label = document.createElement("span");
        label.textContent = labelText;
        label.style.cssText = "font-size:12px;font-weight:600;color:#5D473F;";
        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
      };

      const baseInputStyle = [
        "width:100%",
        "box-sizing:border-box",
        "border-radius:14px",
        "border:1px solid rgba(107,82,72,0.18)",
        "background:rgba(255,255,255,0.72)",
        "padding:12px 14px",
        "font-size:14px",
        "color:#241A16",
        "outline:none",
      ].join(";");

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = String(payload.name || "").trim();
      nameInput.placeholder = "Rahul";
      nameInput.style.cssText = baseInputStyle;

      const nicknameInput = document.createElement("input");
      nicknameInput.type = "text";
      nicknameInput.value = String(payload.nickname || "").trim();
      nicknameInput.placeholder = "rahul bhai";
      nicknameInput.style.cssText = baseInputStyle;

      const emailInput = document.createElement("input");
      emailInput.type = "email";
      emailInput.value = String(payload.email || "").trim();
      emailInput.placeholder = "rahul@example.com";
      emailInput.style.cssText = baseInputStyle;

      const phoneInput = document.createElement("input");
      phoneInput.type = "text";
      phoneInput.value = String(payload.phone || "").trim();
      phoneInput.placeholder = "+91 98765 43210";
      phoneInput.style.cssText = baseInputStyle;

      let currentPhotoUrl = String(payload.photoUrl || "").trim();
      let photoDataUrl = "";
      let photoFileName = "";

      const photoWrap = document.createElement("div");
      photoWrap.style.cssText = [
        "display:grid",
        "gap:12px",
        "border:1px solid rgba(107,82,72,0.14)",
        "background:rgba(255,255,255,0.58)",
        "border-radius:18px",
        "padding:14px",
      ].join(";");

      const photoTop = document.createElement("div");
      photoTop.style.cssText = "display:flex;align-items:center;gap:14px;";

      const photoPreview = document.createElement("div");
      photoPreview.style.cssText = [
        "width:58px",
        "height:58px",
        "border-radius:999px",
        "overflow:hidden",
        "flex-shrink:0",
        "background:linear-gradient(135deg,#6B4E32,#8C5A3D)",
        "display:grid",
        "place-items:center",
        "color:#FBF7F1",
        "font-size:18px",
        "font-weight:700",
      ].join(";");

      const photoImage = document.createElement("img");
      photoImage.style.cssText = "width:100%;height:100%;object-fit:cover;display:none;";

      const photoFallback = document.createElement("div");
      photoFallback.style.cssText = "display:grid;place-items:center;width:100%;height:100%;";

      photoPreview.appendChild(photoImage);
      photoPreview.appendChild(photoFallback);

      const photoMeta = document.createElement("div");
      photoMeta.style.cssText = "min-width:0;display:grid;gap:4px;";

      const photoMetaTitle = document.createElement("div");
      photoMetaTitle.textContent = "Upload a real image";
      photoMetaTitle.style.cssText = "font-size:13px;font-weight:600;color:#2C201B;";

      const photoMetaText = document.createElement("div");
      photoMetaText.textContent = "No photo link needed. JPG, PNG, GIF, or WebP up to 2 MB.";
      photoMetaText.style.cssText = "font-size:11px;line-height:1.45;color:#7A6259;";

      const photoMetaStatus = document.createElement("div");
      photoMetaStatus.style.cssText = "font-size:10px;color:#8A7167;font-family:'SFMono-Regular',ui-monospace,monospace;";

      photoMeta.appendChild(photoMetaTitle);
      photoMeta.appendChild(photoMetaText);
      photoMeta.appendChild(photoMetaStatus);
      photoTop.appendChild(photoPreview);
      photoTop.appendChild(photoMeta);

      const photoPicker = document.createElement("input");
      photoPicker.type = "file";
      photoPicker.accept = "image/*";
      photoPicker.style.display = "none";

      const photoActions = document.createElement("div");
      photoActions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";

      const photoUploadBtn = document.createElement("button");
      photoUploadBtn.type = "button";
      photoUploadBtn.textContent = currentPhotoUrl ? "Replace photo" : "Upload photo";
      photoUploadBtn.style.cssText = [
        "border:1px solid rgba(107,82,72,0.18)",
        "background:rgba(255,255,255,0.74)",
        "color:#5D473F",
        "border-radius:999px",
        "padding:9px 13px",
        "font-size:12px",
        "font-weight:600",
        "cursor:pointer",
      ].join(";");

      const photoClearBtn = document.createElement("button");
      photoClearBtn.type = "button";
      photoClearBtn.textContent = "Remove photo";
      photoClearBtn.style.cssText = [
        "border:1px solid rgba(107,82,72,0.18)",
        "background:rgba(255,255,255,0.48)",
        "color:#6B5248",
        "border-radius:999px",
        "padding:9px 13px",
        "font-size:12px",
        "font-weight:600",
        "cursor:pointer",
      ].join(";");

      photoActions.appendChild(photoUploadBtn);
      photoActions.appendChild(photoClearBtn);
      photoWrap.appendChild(photoTop);
      photoWrap.appendChild(photoPicker);
      photoWrap.appendChild(photoActions);

      const photoInitials = () => {
        const source = String(nameInput.value || payload.name || "B").trim();
        return source
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "B";
      };

      const renderPhotoState = () => {
        const previewSrc = photoDataUrl || currentPhotoUrl;
        if (previewSrc) {
          photoImage.src = previewSrc;
          photoImage.style.display = "block";
          photoFallback.style.display = "none";
        } else {
          photoImage.removeAttribute("src");
          photoImage.style.display = "none";
          photoFallback.style.display = "grid";
          photoFallback.textContent = photoInitials();
        }
        photoUploadBtn.textContent = previewSrc ? "Replace photo" : "Upload photo";
        photoClearBtn.style.display = previewSrc ? "inline-flex" : "none";
        photoMetaStatus.textContent = photoFileName
          ? photoFileName
          : currentPhotoUrl
            ? "Saved photo ready"
            : "No photo saved yet";
      };

      photoUploadBtn.addEventListener("click", () => photoPicker.click());
      photoClearBtn.addEventListener("click", () => {
        photoDataUrl = "";
        photoFileName = "";
        currentPhotoUrl = "";
        photoPicker.value = "";
        renderPhotoState();
      });
      photoPicker.addEventListener("change", () => {
        const file = photoPicker.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          error.textContent = "Upload an image file for the contact photo.";
          photoPicker.value = "";
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          error.textContent = "Keep contact photos under 2 MB in this popup.";
          photoPicker.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          photoDataUrl = String(reader.result || "");
          photoFileName = file.name || "contact-photo";
          error.textContent = "";
          renderPhotoState();
        };
        reader.onerror = () => {
          error.textContent = "Could not read that image. Try another one.";
          photoPicker.value = "";
        };
        reader.readAsDataURL(file);
      });
      nameInput.addEventListener("input", renderPhotoState);

      grid.appendChild(buildField("Name", nameInput));
      grid.appendChild(buildField("Nickname", nicknameInput));
      grid.appendChild(buildField(`Email${payload.requireEmail ? " *" : ""}`, emailInput));
      grid.appendChild(buildField(`Phone${payload.requirePhone ? " *" : ""}`, phoneInput));
      grid.appendChild(buildField("Photo", photoWrap));

      const hint = document.createElement("div");
      hint.textContent = "Nickname, phone, and photo are optional unless Braino explicitly asks for them.";
      hint.style.cssText = "margin-top:10px;font-size:11px;color:#8A7167;";

      const error = document.createElement("div");
      error.style.cssText = "min-height:18px;margin-top:10px;font-size:12px;font-weight:600;color:#B14534;";

      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:10px;justify-content:flex-end;margin-top:16px;";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = [
        "border:1px solid rgba(107,82,72,0.18)",
        "background:rgba(255,255,255,0.65)",
        "color:#6B5248",
        "border-radius:999px",
        "padding:10px 14px",
        "font-size:13px",
        "font-weight:600",
        "cursor:pointer",
      ].join(";");

      const saveBtn = document.createElement("button");
      saveBtn.type = "submit";
      saveBtn.textContent = String(payload.submitLabel || "Save contact");
      saveBtn.style.cssText = [
        "border:0",
        "background:#2C201B",
        "color:#FBF7F1",
        "border-radius:999px",
        "padding:10px 16px",
        "font-size:13px",
        "font-weight:600",
        "cursor:pointer",
        "box-shadow:0 10px 24px rgba(44,32,27,0.2)",
      ].join(";");

      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);

      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(grid);
      card.appendChild(hint);
      card.appendChild(error);
      card.appendChild(actions);
      overlay.appendChild(card);
      (document.body || document.documentElement).appendChild(overlay);

      const finish = (result) => {
        overlay.remove();
        resolve(result);
      };

      cancelBtn.addEventListener("click", () => finish({ ok: false, cancelled: true }));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish({ ok: false, cancelled: true });
      });

      card.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = String(nameInput.value || "").trim();
        const nickname = String(nicknameInput.value || "").trim();
        const email = String(emailInput.value || "").trim();
        const phone = String(phoneInput.value || "").trim();

        if (!name) {
          error.textContent = "Give this contact a name first.";
          nameInput.focus();
          return;
        }
        if (payload.requireEmail && !email) {
          error.textContent = "I need an email address for this action.";
          emailInput.focus();
          return;
        }
        if (payload.requirePhone && !phone) {
          error.textContent = "I need a phone number for this action.";
          phoneInput.focus();
          return;
        }

        finish({
          ok: true,
          saved: true,
          contact: {
            id: String(payload.contactId || "").trim(),
            name,
            nickname,
            email,
            phone,
            photoUrl: currentPhotoUrl,
            photoDataUrl,
            photoFileName,
          },
        });
      });

      renderPhotoState();

      window.setTimeout(() => {
        if (emailInput.value) emailInput.select();
        else if (nameInput.value) emailInput.focus();
        else nameInput.focus();
      }, 20);
    } catch (_) {
      resolve({ ok: false, cancelled: true });
    }
  });
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
  __sbApplyVoiceAutoRoutingDefaults();
  const brain = document.getElementById("__sb_brain_btn__");
  // In PANEL the walker on the bar is the listening mascot — don't also pop the docked
  // bottom-right brain (that was the duplicate "second Braino" in headphone mode).
  if (brain && !__sbInputOpen && brain.style.display === "none") { brain.style.display = ""; __sbBrainVisible = true; }
  __sbHeadphoneMode = true;
  __sbVoiceOnlyMode = true;
  __sbUseOffscreenRt = true;
  __sbRtSessionReady = true;
  __sbStartFishWarmKeepAlive(); // keep the TTS function hot for this newly-focused tab
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
  __sbStopFishWarmKeepAlive();
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
  __sbApplyVoiceAutoRoutingDefaults();
  __sbStartFishWarmKeepAlive(); // keep the TTS function hot so the first reply isn't cold-started
  // Mark voice mode ON globally so every tab knows Braino should follow the user.
  if (__sbContextOk()) chrome.storage.local.set({ sbVoiceModeOn: true, sbBrainDocked: true });

  __sbCollapseCard();

  const brain = document.getElementById("__sb_brain_btn__");
  // In PANEL the walker on the bar is the listening mascot — don't also pop the docked
  // bottom-right brain (that was the duplicate "second Braino" in headphone mode).
  if (brain && !__sbInputOpen && brain.style.display === "none") { brain.style.display = ""; __sbBrainVisible = true; }
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
  __sbStopFishWarmKeepAlive();
  __sbActiveLanguage = null;        // reset to English default for the next session
  __sbPendingLanguageSwitch = null;
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

// state: "connecting" | "listening" | "hearing" | "captured" | "speaking" | ""
//  - "hearing"   = the USER is actively talking (VAD speech_started→stopped) → Sonar Pulse
//  - "listening"/"captured" = waiting / processing, nobody talking → calm idle (no glow)
//  - "speaking"  = Braino is talking → mouth animation
function __sbSetHpBrainState(state) {
  const HP = ["hp-connecting", "hp-listening", "hp-hearing", "hp-captured", "hp-speaking"];
  const brain = document.getElementById("__sb_brain_btn__");
  if (brain) {
    brain.classList.remove(...HP, "recording");
    if (state) brain.classList.add(`hp-${state}`);
  }

  // Bar: a continuous blue shimmer whenever headphone mode is engaged.
  const bar = document.getElementById("__sb_bar__");
  if (bar) {
    bar.classList.toggle("hp-active", !!state);
    bar.classList.toggle("hp-listening", state === "listening");
  }

  // The walker is the visible mascot while the bar is open, so it carries the glow
  // and the listen/wave behaviour (the brain button is hidden in this state).
  const wlk = document.getElementById("__sbwk_walker__");
  if (wlk) {
    wlk.classList.remove(...HP);
    if (state) wlk.classList.add(`hp-${state}`);
  }
  __sbWkEngaged = !!state;          // stand still + look at the user while engaged
  if (state) {
    __sbWkWalking = false;
    // Braino waves hello only as it starts replying — not while idling/processing.
    if (state === "speaking") __sbWkTriggerWave();
  } else {
    __sbWkWalking = true;           // resume strolling when headphone mode ends
  }
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


// Braino's own marketing/app site (trybraino.com + its Vercel prod/preview deploys) runs its
// OWN in-page Braino and the landing onboarding intro. Injecting the extension's floating mascot
// there collides with it (the intro's "yes" gets eaten by the extension's bar), so stay dormant.
// Auth-sync above still runs; only the floating UI is suppressed.
function __sbIsBrainoOwnSite() {
  try {
    const h = String(location.hostname || "").replace(/^www\./, "").toLowerCase();
    if (h === "trybraino.com" || h.endsWith(".trybraino.com")) return true;
    // braino-eight.vercel.app, braino-git-<branch>-<team>.vercel.app, etc.
    if (h.endsWith(".vercel.app") && h.startsWith("braino")) return true;
    return false;
  } catch { return false; }
}

if (__sbIsBrainoOwnSite()) {
  // dormant on Braino's own site — the website provides its own Braino experience
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => __sbBuildBrainUI(), { once: true });
} else {
  __sbBuildBrainUI();
}
} // end guard
  })();
}
