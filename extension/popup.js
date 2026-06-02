// Braino Popup Controller — Unified Chat UI
const API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";

// ===== GLOBALS =====
let audioSegments = [];
let timerInterval = null;
let seconds = 0;
let totalRecordedSeconds = 0;
let notesMarkdown = "";
let currentSessionId = null;
let chatMessages = [];
let pendingImageBase64 = null;
let notionConnectionPoller = null;
let trackedActiveTabId = null;
let trackedActiveWindowId = null;
let mediaRecorder = null;
let audioChunks = [];
let currentPageContext = null;
let currentMode = "page"; // "page" | "lecture" | "meeting" | "general" | "web" | "agent"
let currentAiProvider = "lovable"; // "lovable" | "claude"
let agentRunning = false;
let agentShouldStop = false;
let isPremium = false;
let currentSelection = null; // { text, url, title } — last text the user highlighted on the page
let sbXPersonaCache = null; // cached x_auto_persona for injecting context on X
const VALID_AI_PROVIDERS = new Set(["lovable", "claude"]);
const INTERNAL_PREMIUM_EMAILS = new Set([
  "itishpande21@gmail.com",
]);

// Daily usage counters (free tier limits)
const FREE_RECORDING_SECONDS = 30 * 60; // 30 min/day
const FREE_CHAT_QUESTIONS = 10;         // 10 questions/day
let isRecording = false;
let recordingCardEl = null; // DOM ref to active recording card
// Dynamic refs inside recording card (assigned in createRecordingCard)
let convertBtn = null;
let pauseBtn = null;
let recTimerEl = null;
let recSegmentEl = null;

const CONVERT_BUTTON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>';

// Mode SVG icons
const MODE_ICONS = {
  page: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  lecture: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  meeting: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  general: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  web: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>`,
  agent: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="8.5" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14" r="1.5" fill="currentColor" stroke="none"/><path d="M9 19h6"/></svg>`,
};

const PANEL_ICON_SVGS = {
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  delegate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="11" rx="2.5"/><path d="M12 8V4M8 4h8"/><circle cx="9" cy="13.5" r="1"/><circle cx="15" cy="13.5" r="1"/></svg>`,
  record: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/></svg>`,
  summary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h16"/></svg>`,
  question: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>`,
};

// ===== POPUP-MODE DETECTION =====
// When BRAINO is opened as an extension popup on a restricted page (chrome://,
// chrome-extension://, Chrome Web Store, etc.) background.js registers
// sidepanel.html?ctx=popup. We detect that here and apply the compact card
// styling + disable modes that require a content script.
const SB_IS_POPUP = new URLSearchParams(window.location.search).get("ctx") === "popup";
if (SB_IS_POPUP) {
  document.documentElement.classList.add("sb-popup-mode");
  document.body.classList.add("sb-popup-mode");
}

// ===== DOM REFS =====
const versionBadge = document.getElementById("versionBadge");
if (versionBadge) versionBadge.textContent = "v" + chrome.runtime.getManifest().version;

const chatArea = document.getElementById("chatArea");
const chatMessagesEl = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatImagePreview = document.getElementById("chatImagePreview");
const chatPreviewImg = document.getElementById("chatPreviewImg");
const chatRemoveImage = document.getElementById("chatRemoveImage");
const loadingEl = document.getElementById("loading");

const notesOverlay = document.getElementById("notesOverlay");
const notesContent = document.getElementById("notesContent");
const syncNotionBtn = document.getElementById("syncNotionBtn");
const syncNotionLabel = document.getElementById("syncNotionLabel");
const copyBtn = document.getElementById("copyBtn");
const closeNotesBtn = document.getElementById("closeNotesBtn");

const modeSelectorBtn = document.getElementById("modeSelectorBtn");
const modeDropup = document.getElementById("modeDropup");
const modeWrap = document.getElementById("modeWrap");
const modeOptions = document.querySelectorAll(".mode-option");

const historyOverlay = document.getElementById("historyOverlay");
const historyList = document.getElementById("historyList");
const closePanelBtn = document.getElementById("closePanelBtn");

// If running inside an injected iframe (not a Chrome side panel), show close button
if (window.parent !== window) {
  closePanelBtn?.style && (closePanelBtn.style.display = "");
  closePanelBtn?.addEventListener("click", () => {
    window.parent.postMessage({ type: "sidebrain-close" }, "*");
  });
}

const historyBtn = document.getElementById("historyBtn");
const historyBackBtn = document.getElementById("historyBackBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const emptyState = document.getElementById("emptyState");
const newSessionBtn = document.getElementById("newSessionBtn");
const pageContextChip = document.getElementById("pageContextChip");
const pageContextFav = document.getElementById("pageContextFav");
const pageContextTitle = document.getElementById("pageContextTitle");
const pageContextUrl = document.getElementById("pageContextUrl");
const pageContextStatus = document.getElementById("pageContextStatus");
const pageContextStatusLabel = document.getElementById("pageContextStatusLabel");
const infoBtn = document.getElementById("infoBtn");
const infoPopover = document.getElementById("infoPopover");
const infoWrap = document.getElementById("infoWrap");
const modelBtn = document.getElementById("modelBtn");
const modelPopover = document.getElementById("modelPopover");
const modelWrap = document.getElementById("modelWrap");
const modelLabel = document.getElementById("modelLabel");

const MODE_LABELS = {
  page: "Chat with Page",
  lecture: "Lecture & Audio",
  meeting: "Meeting & Call",
  general: "General Chat",
  web: "Web Search",
  agent: "Delegate",
  note: "Note",
};

const STATUS_LABELS = {
  ready: "page read",
  reading: "reading",
  listening: "listening",
  speaking: "speaking",
  acting: "acting",
  recording: "recording",
  paused: "paused",
  saved: "saved",
};

const MODE_HINTS = {
  lecture:  { sub: "Lecture & Audio mode", hint: "Press Enter or tap send to start recording — audio from this tab will be captured and turned into notes." },
  meeting:  { sub: "Meeting & Call mode",  hint: "Press Enter or tap send to start recording — great for multi-speaker calls. Pause & Save between segments." },
  page:     { sub: "Chat with Page mode",  hint: "Ask anything about what's on the current page. Braino reads the page so you don't have to." },
  general:  { sub: "General Chat mode",    hint: "Ask me anything — no page context, just a straight conversation." },
  web:      { sub: "Web Search mode",      hint: "Ask a question and Braino will run a real browser search, read the results, and cite the sources." },
  agent:    { sub: "Browser Agent mode",   hint: "Type a task and the agent will navigate, click, and fill forms on your behalf. Experimental — works best for simple tasks." },
  note:     { sub: "Note mode",            hint: "Ask follow-up questions about this note, generate practice questions, or copy it out anywhere." },
};

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getHostFromUrl(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getInitialFromContext(context) {
  const host = getHostFromUrl(context?.url);
  if (host) return host.slice(0, 2).toUpperCase();
  const title = String(context?.title || "S").trim();
  return title.slice(0, 2).toUpperCase();
}

function getContextTone(host) {
  if (/spotify/i.test(host)) return "spotify";
  if (/mail|gmail/i.test(host)) return "gmail";
  if (/github/i.test(host)) return "gh";
  return "default";
}

function getTimeGreetingPrefix() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 23) return "Good evening";
  return "It's late";
}

function getGreetingHeadingHtml() {
  const firstName = currentAuthUser?.name?.split(" ")[0]?.trim();
  const prefix = getTimeGreetingPrefix();
  if (firstName) {
    return `${escapeHtml(prefix)},<br><em>${escapeHtml(firstName)}.</em>`;
  }
  return `${escapeHtml(prefix)}.`;
}

function getFaviconUrlFromContext(context) {
  const explicit = String(context?.faviconUrl || "").trim();
  if (explicit) return explicit;
  const host = getHostFromUrl(context?.url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32` : "";
}

function buildFaviconMarkup(context) {
  const fallback = escapeHtml(getInitialFromContext(context));
  const faviconUrl = getFaviconUrlFromContext(context);
  if (!faviconUrl) return fallback;
  return `<img src="${escapeHtml(faviconUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove(); this.parentElement.textContent='${fallback}'" />`;
}

function renderContextFavicon(el, context, baseClassName) {
  if (!el) return;
  const host = getHostFromUrl(context?.url);
  const tone = getContextTone(host);
  const hasImage = Boolean(getFaviconUrlFromContext(context));
  el.className = `${baseClassName} tone-${tone}${hasImage ? " has-image" : ""}`;
  el.innerHTML = buildFaviconMarkup(context);
}

function isTrueIdlePanel() {
  return !currentPageContext && !hasExistingNotes() && chatMessages.length === 0 && !recordingCardEl;
}

function getPageContextState() {
  if (!currentPageContext || currentMode === "general") return { status: "ready", label: STATUS_LABELS.ready };
  if (voiceActive) {
    const voiceState = voiceOrb?.className.match(/\b(idle|listening|speaking|processing|acting)\b/)?.[1];
    if (voiceState === "listening") return { status: "listening", label: STATUS_LABELS.listening };
    if (voiceState === "speaking") return { status: "speaking", label: STATUS_LABELS.speaking };
    if (voiceState === "acting") return { status: "acting", label: STATUS_LABELS.acting };
    if (voiceState === "processing") return { status: "reading", label: "thinking" };
  }
  if (agentRunning) return { status: "acting", label: STATUS_LABELS.acting };
  if (recordingCardEl && isRecording) return { status: "recording", label: STATUS_LABELS.recording };
  if (recordingCardEl && !isRecording && audioSegments.length > 0) return { status: "paused", label: STATUS_LABELS.paused };
  if (notesMarkdown) return { status: "saved", label: STATUS_LABELS.saved };
  if (!loadingEl?.classList.contains("hidden")) return { status: "reading", label: STATUS_LABELS.reading };
  return { status: "ready", label: STATUS_LABELS.ready };
}

function updateModeSelectorButton() {
  if (!modeSelectorBtn) return;
  let label = MODE_LABELS[currentMode] || MODE_LABELS.page;
  if (isTrueIdlePanel() && currentMode === "page") {
    label = "Auto";
  } else if (notesMarkdown && !currentPageContext && currentMode !== "web" && currentMode !== "agent") {
    label = MODE_LABELS.note;
  }
  const icon = MODE_ICONS[currentMode] || MODE_ICONS.page;
  modeSelectorBtn.innerHTML = `
    <span class="mode-selector-icon">${icon}</span>
    <span class="mode-selector-label">${escapeHtml(label)}</span>
    <svg class="mode-selector-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6,9 12,15 18,9"/></svg>
  `;
}

function updatePageContextChip() {
  if (!pageContextChip) return;
  if (!currentPageContext || currentMode === "general") {
    pageContextChip.classList.add("hidden");
    return;
  }

  const host = getHostFromUrl(currentPageContext.url);
  const state = getPageContextState();

  pageContextChip.classList.remove("hidden");
  renderContextFavicon(pageContextFav, currentPageContext, "page-context-fav");
  pageContextTitle.textContent = currentPageContext.title || "Current page";
  pageContextUrl.textContent = host || currentPageContext.url || "—";
  pageContextStatus.className = `page-context-status is-${state.status}`;
  pageContextStatusLabel.textContent = state.label;
}

function getDefaultPanelActions() {
  return [
    {
      action: "voice",
      icon: "voice",
      title: "Start a voice session",
      meta: "⌥ Space · from any tab",
      prompt: "",
    },
    {
      action: "delegate",
      icon: "delegate",
      title: "Run a Delegate task",
      meta: `"Reply to Priya saying I'm running late"`,
      prompt: "Reply to Priya saying I'm running ten minutes late.",
    },
    {
      action: "record",
      icon: "record",
      title: "Record this tab's audio",
      meta: "Lecture, meeting, podcast",
      prompt: "",
    },
  ];
}

function getPageAwarePanelActions() {
  const host = getHostFromUrl(currentPageContext?.url);
  const title = String(currentPageContext?.title || "").trim();
  const entityHint = title.split(/[-|:]/)[0]?.trim();

  if (/spotify/i.test(host)) {
    return [
      {
        action: "fill",
        icon: "summary",
        title: "Compare the top results",
        meta: "Original · remix · live version",
        prompt: "Compare the top 3 results on this page.",
      },
      {
        action: "delegate",
        icon: "delegate",
        title: "Do this for me on Spotify",
        meta: "Delegate · current tab",
        prompt: "Add the original version to my Liked Songs.",
      },
      {
        action: "fill",
        icon: "search",
        title: entityHint ? `What else is ${entityHint} in?` : "Search beyond this page",
        meta: "Search the web",
        prompt: entityHint ? `Search the web for more context about ${entityHint}.` : "Search the web for more context about what is on this page.",
      },
    ];
  }

  return [
    {
      action: "fill",
      icon: "summary",
      title: "Explain what's on this page",
      meta: host ? `${host} · page summary` : "Page summary",
      prompt: "Summarize what I'm looking at here and what matters.",
    },
    {
      action: "delegate",
      icon: "delegate",
      title: "Do something on this page",
      meta: "Delegate · current tab",
      prompt: "Do this task on the current page for me.",
    },
    {
      action: "fill",
      icon: "search",
      title: "Search beyond this page",
      meta: "Live web results",
      prompt: "Search the web for more context about what's on this page.",
    },
  ];
}

function buildQuickActionCards(items) {
  return items.map((item) => `
    <button class="quick-action-card" type="button" data-action="${escapeHtml(item.action)}" data-prompt="${escapeHtml(item.prompt || "")}">
      <span class="quick-action-icon" aria-hidden="true">${PANEL_ICON_SVGS[item.icon] || ""}</span>
      <span class="quick-action-copy">
        <span class="quick-action-title">${escapeHtml(item.title)}</span>
        <span class="quick-action-meta">${escapeHtml(item.meta || "")}</span>
      </span>
      <span class="quick-action-arrow" aria-hidden="true">${PANEL_ICON_SVGS.arrow}</span>
    </button>
  `).join("");
}

function parseNoteRecap(markdown) {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Saved note";

  const tldrMatch = markdown.match(/(?:^|\n)(?:\*\*)?TL;DR\.?(?:\*\*)?\s*[:.-]?\s*(.+)$/im);
  let summary = tldrMatch ? tldrMatch[1].trim() : "";
  if (!summary) {
    const afterTitle = markdown.split(/\n+/).map((line) => line.trim()).filter(Boolean).find((line) => !/^#/.test(line) && !/^[*-]\s/.test(line));
    summary = afterTitle || "Your note is saved and ready to explore.";
  }

  const bulletLines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .slice(0, 4)
    .map((line) => line.replace(/^[-*]\s+/, "").trim());

  const points = bulletLines.length ? bulletLines : [summary].filter(Boolean);
  return { title, summary, points };
}

function formatHistoryMeta(entry) {
  const date = new Date(entry.date);
  const deltaMs = Date.now() - date.getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

  if (deltaMinutes < 60) return `${deltaMinutes} min ago`;

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 12) return `${deltaHours} hr ago`;

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `today, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getHistoryTitle(entry) {
  const heading = entry.notes.match(/^#\s+(.+)$/m)?.[1];
  if (heading) return heading.trim();
  return (entry.notes.match(/^##?\s+(.+)$/m) || ["", entry.notes.substring(0, 60)])[1].trim();
}

function renderRecentHistory() {
  if (!emptyState) return;
  const recentSection = emptyState.querySelector("[data-empty-recent-section]");
  const recentList = emptyState.querySelector("[data-empty-recent-list]");
  if (!recentSection || !recentList) return;

  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    if (history.length === 0 || hasExistingNotes() || chatMessages.length > 0 || recordingCardEl) {
      recentSection.classList.add("hidden");
      recentList.innerHTML = "";
      return;
    }

    recentSection.classList.remove("hidden");
    recentList.innerHTML = history.slice(0, 3).map((entry) => `
      <button class="recent-note-row" type="button" data-history-id="${entry.id}">
        <span class="recent-note-mark">${escapeHtml(getHistoryTitle(entry).slice(0, 2).toUpperCase())}</span>
        <span class="recent-note-copy">
          <span class="recent-note-title">${escapeHtml(getHistoryTitle(entry))}</span>
          <span class="recent-note-meta">${escapeHtml(formatHistoryMeta(entry))}</span>
        </span>
        <span class="recent-note-arrow" aria-hidden="true">${PANEL_ICON_SVGS.arrow}</span>
      </button>
    `).join("") + `
      <button class="empty-library-link" type="button" data-empty-library-link="true">OPEN LIBRARY →</button>
    `;
  });
}

function renderEmptyStateSurface() {
  const hasSession = hasExistingNotes() || chatMessages.length > 0 || !!recordingCardEl;
  if (!emptyState) return;
  if (hasSession) {
    emptyState.innerHTML = "";
    return;
  }

  const showPageAwareWelcome = Boolean(currentPageContext && currentMode !== "general");

  if (showPageAwareWelcome) {
    const host = getHostFromUrl(currentPageContext.url);
    const title = String(currentPageContext.title || "").trim();
    const contextLabel = host ? `<b>${escapeHtml(host)}</b>` : "this page";
    const detail = title ? `, <i>${escapeHtml(title)}</i>` : "";

    emptyState.dataset.variant = "page";
    emptyState.innerHTML = `
      <div class="sb-empty sb-empty-page">
        <div class="welcome-eye"><span class="welcome-eye-dot"></span> AI Browser Companion</div>
        <h2 class="empty-hero">${getGreetingHeadingHtml()}</h2>
        <p class="empty-state-sub">I've read ${contextLabel}${detail}. Ask me anything about it, or tell me what to do.</p>
        <div class="sb-section-h">Try one of these</div>
        <div class="quick-action-list">
          ${buildQuickActionCards(getPageAwarePanelActions())}
        </div>
        <div class="empty-state-tip">
          <span class="empty-state-tip-mark" aria-hidden="true"></span>
          <span><b>Tip.</b> Hit <span class="kbd">⌥ Space</span> from any tab to talk to Braino without opening this panel.</span>
        </div>
      </div>
    `;
    return;
  }

  emptyState.dataset.variant = "default";
  const idleName = currentAuthUser?.name?.split(" ")[0]?.trim();
  emptyState.innerHTML = `
    <div class="sb-empty sb-empty-default">
      <div class="sb-empty-orb" aria-hidden="true"></div>
      <div class="welcome-eye welcome-eye-center"><span class="welcome-eye-dot"></span> Ready when you are</div>
      <h2 class="empty-hero empty-hero-center">${idleName ? `What's on your mind,<br><em>${escapeHtml(idleName)}?</em>` : "What's on your mind?"}</h2>
      <p class="empty-state-sub empty-state-sub-center">Open a tab and I'll read it with you. Or just start talking — I'm listening.</p>
      <div class="sb-section-h">Quick start</div>
      <div class="quick-action-list">
        ${buildQuickActionCards(getDefaultPanelActions())}
      </div>
      <div class="empty-recent-section hidden" data-empty-recent-section="true">
        <div class="sb-section-h">Recent</div>
        <div class="empty-recent-list" data-empty-recent-list="true"></div>
      </div>
    </div>
  `;
  renderRecentHistory();
}

function refreshPanelChrome() {
  updateModeSelectorButton();
  updatePageContextChip();
  renderEmptyStateSurface();
}

// Info popover toggle
infoBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  infoPopover?.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!infoWrap?.contains(e.target)) infoPopover?.classList.add("hidden");
  if (!modelWrap?.contains(e.target)) modelPopover?.classList.add("hidden");
});

// Model selector
modelBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  modelPopover?.classList.toggle("hidden");
});

// Load saved provider
chrome.storage.local.get(["aiProvider"], (r) => {
  if (VALID_AI_PROVIDERS.has(r.aiProvider)) {
    currentAiProvider = r.aiProvider;
  } else if (r.aiProvider) {
    chrome.storage.local.set({ aiProvider: "lovable" });
  }
  updateModelUI();
});

function getTextAiProvider(provider = currentAiProvider) {
  return provider === "claude" ? "claude" : "lovable";
}

function updateModelUI() {
  if (modelLabel) modelLabel.textContent = currentAiProvider === "claude" ? "Claude Sonnet 4.6" : "Braino AI";
  modelPopover?.querySelectorAll(".model-option").forEach((el) => {
    el.classList.toggle("active", el.dataset.provider === currentAiProvider);
  });
}

modelPopover?.querySelectorAll(".model-option").forEach((el) => {
  el.addEventListener("click", () => {
    currentAiProvider = el.dataset.provider;
    chrome.storage.local.set({ aiProvider: currentAiProvider });
    updateModelUI();
    modelPopover?.classList.add("hidden");
  });
});

pageContextChip?.addEventListener("click", () => {
  if (currentPageContext && currentMode === "general") {
    setMode("page");
  }
  chatInput?.focus();
});

emptyState?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const button = target.closest(".quick-action-card");
  if (button) {
    const action = button.dataset.action;
    const prompt = button.dataset.prompt || "";

    if (action === "voice") {
      openVoiceMode();
      return;
    }

    if (action === "record") {
      if (currentMode !== "lecture" && currentMode !== "meeting") {
        setMode(currentMode === "meeting" ? "meeting" : "lecture");
      }
      startRecordingFlow();
      return;
    }

    if (action === "open-notes") {
      notesOverlay?.classList.remove("hidden");
      return;
    }

    if (action === "delegate") {
      setMode("agent");
    }

    if (prompt && chatInput) {
      chatInput.value = prompt;
      chatInput.focus();
    }
    return;
  }

  const row = target.closest(".recent-note-row");
  if (row) {
    const historyId = Number(row.dataset.historyId);
    chrome.storage.local.get("notesHistory", (data) => {
      const history = data.notesHistory || [];
      const entry = history.find((item) => item.id === historyId);
      if (entry) openHistoryEntry(entry);
    });
    return;
  }

  if (target.closest("[data-empty-library-link]")) {
    openHistoryOverlay();
  }
});

// Legacy hidden elements (kept for JS compatibility in unchanged functions)
const statusEl = document.getElementById("status") || { className: "", querySelector: () => ({ textContent: "" }) };
const timerEl = document.getElementById("timer") || { textContent: "" };
const segmentCountEl = document.getElementById("segmentCount") || { classList: { remove: () => {}, add: () => {} }, textContent: "" };


// ===== MARKDOWN RENDERER (unchanged) =====
function renderMarkdown(md) {
  const codeBlocks = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    codeBlocks.push(`<div class="code-block">${langLabel}<pre><code>${escapedCode}</code></pre></div>`);
    return placeholder;
  });
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  let html = processed
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;">')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  html = html.replace(/((?:<li>.*<\/li>(?:<br>)?)+)/g, (match) => '<ul>' + match.replace(/<br>/g, '') + '</ul>');
  html = '<p>' + html + '</p>';
  codeBlocks.forEach((block, i) => { html = html.replace(`__CODE_BLOCK_${i}__`, block); });
  return html;
}

function hasExistingNotes() {
  return Boolean(notesMarkdown && notesMarkdown.trim());
}

function buildNotesContextForAI(markdown) {
  const existingImages = {};
  let imageIndex = 0;
  const sanitizedNotes = markdown.replace(/<img\b[^>]*src=["']data:image\/[^"']+["'][^>]*>/gi, (match) => {
    imageIndex += 1;
    const placeholder = `{{EXISTING_IMAGE_${imageIndex}}}`;
    existingImages[placeholder] = match;
    return `\n\n${placeholder}\n\n`;
  });
  return { sanitizedNotes, existingImages };
}

function isExplicitWebSearchRequest(text) {
  return /\b(search (the )?web|web search|search online|look (this|that|it) up|look up|google\b|latest\b|current\b|news\b|search for\b)\b/i.test(text);
}

function formatWebSearchResults(query, searchData) {
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

function buildWebSearchPageContext(query, searchData) {
  return {
    title: `Web search results for "${query}"`,
    url: searchData?.searchUrl || "",
    text: formatWebSearchResults(query, searchData),
  };
}

function appendSearchSources(reply, results) {
  if (!results?.length) return reply;
  if (/\n#{1,3}\s*Sources\b/i.test(reply) || /\nSources:\s*$/i.test(reply)) return reply;

  const sources = results
    .slice(0, 5)
    .filter((result) => result?.url)
    .map((result) => {
      const cleanTitle = String(result.title || result.url).replace(/[\[\]]/g, "").trim();
      return `- [${cleanTitle}](${result.url})`;
    });

  if (!sources.length) return reply;
  return `${reply}\n\n## Sources\n${sources.join("\n")}`;
}

function looksLikeAnswerRequest(text) {
  const patterns = [
    /\b(solve|solution|answer|give me the code|write the code|code for|fix this|complete this)\b/i,
    /\b(what('?s| is) the (answer|solution|code))\b/i,
    /\b(do it for me|just (tell|give|show) me)\b/i,
  ];
  return patterns.some(p => p.test(text));
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setStorage(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function removeStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

async function hydrateTrackedTabState() {
  const data = await getStorage(["activeTabId", "activeWindowId"]);
  trackedActiveTabId = typeof data.activeTabId === "number" ? data.activeTabId : trackedActiveTabId;
  trackedActiveWindowId = typeof data.activeWindowId === "number" ? data.activeWindowId : trackedActiveWindowId;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.activeTabId) trackedActiveTabId = typeof changes.activeTabId.newValue === "number" ? changes.activeTabId.newValue : null;
  if (changes.activeWindowId) trackedActiveWindowId = typeof changes.activeWindowId.newValue === "number" ? changes.activeWindowId.newValue : null;
  if (changes.activeTabId) setTimeout(fetchPageContext, 300);
});

window.addEventListener("focus", () => {
  setTimeout(fetchPageContext, 200);
  hydrateTrackedTabState();
  checkNotionConnection();
  updateAuthUI();
});

chrome.tabs.onActivated?.addListener?.(() => setTimeout(fetchPageContext, 300));


// ===== EMPTY STATE =====
function updateEmptyState() {
  const hasSession = hasExistingNotes() || chatMessages.length > 0 || !!recordingCardEl;
  if (emptyState) emptyState.classList.toggle("hidden", hasSession);
  if (newSessionBtn) newSessionBtn.classList.toggle("hidden", !hasSession);
  refreshPanelChrome();
}

// ===== SELECTION CHIP UI =====
const selectionChipEl = document.getElementById("selectionChip");
const selectionChipTextEl = document.getElementById("selectionChipText");
document.getElementById("selectionChipClear")?.addEventListener("click", () => {
  currentSelection = null;
  if (selectionChipEl) selectionChipEl.classList.add("hidden");
});

function showSelectionChip(text) {
  if (!selectionChipEl || !selectionChipTextEl) return;
  const preview = text.length > 60 ? text.slice(0, 60) + "…" : text;
  selectionChipTextEl.textContent = `"${preview}"`;
  selectionChipEl.classList.remove("hidden");
}

// ===== ONBOARDING =====
const onboardingOverlay = document.getElementById("onboardingOverlay");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingDots = document.querySelectorAll("#onboardingDots .dot");
const onboardingSlides = document.querySelectorAll(".onboarding-slide");
let currentOnboardingSlide = 0;
const TOTAL_ONBOARDING_SLIDES = 3;

function showOnboardingSlide(idx) {
  onboardingSlides.forEach((s, i) => {
    s.classList.remove("active", "exit-left");
    if (i < idx) s.classList.add("exit-left");
    if (i === idx) s.classList.add("active");
  });
  onboardingDots.forEach((d, i) => d.classList.toggle("active", i === idx));
  const isAuthSlide = idx === TOTAL_ONBOARDING_SLIDES - 1;
  onboardingNextBtn.style.display = isAuthSlide ? "none" : "";
  onboardingNextBtn.textContent = "Next";
}

function finishOnboarding() {
  chrome.storage.local.set({ onboardingDone: true });
  onboardingOverlay.classList.add("hidden");
}

if (onboardingOverlay && onboardingNextBtn) {
  chrome.storage.local.get(["onboardingDone"], (data) => {
    if (!data.onboardingDone && !SB_IS_POPUP) {
      onboardingOverlay.classList.remove("hidden");
    }

    onboardingNextBtn.addEventListener("click", () => {
      if (currentOnboardingSlide < TOTAL_ONBOARDING_SLIDES - 1) {
        currentOnboardingSlide++;
        showOnboardingSlide(currentOnboardingSlide);
      }
    });

    onboardingDots.forEach((dot) => {
      dot.addEventListener("click", () => {
        currentOnboardingSlide = parseInt(dot.dataset.dot);
        showOnboardingSlide(currentOnboardingSlide);
      });
    });

    document.getElementById("onboardingSignUpBtn")?.addEventListener("click", () => {
      const extId = chrome.runtime.id;
      chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${extId}&mode=signup` });
      finishOnboarding();
    });

    document.getElementById("onboardingSignInBtn")?.addEventListener("click", () => {
      const extId = chrome.runtime.id;
      chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${extId}&mode=signin` });
      finishOnboarding();
    });
  });
}


// ===== MODE SELECTOR =====
function setMode(mode) {
  currentMode = mode;
  chrome.storage.local.set({ currentMode: mode });
  modeDropup?.classList.add("hidden");
  updateChatContextUI();
  if (voiceActive && isRealtimeVoiceMode()) syncRealtimeVoiceSession();
}

modeSelectorBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  modeDropup?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!modeWrap?.contains(e.target)) modeDropup?.classList.add("hidden");
});

modeOptions.forEach((opt) => {
  opt.addEventListener("click", () => setMode(opt.dataset.mode));
});

// Restore saved mode — in popup mode, page & agent need a content script so
// fall back to general chat if the saved mode is one of those.
chrome.storage.local.get("currentMode", (data) => {
  const saved = data.currentMode || "page";
  const mode = SB_IS_POPUP && (saved === "page" || saved === "agent") ? "general" : saved;
  setMode(mode);
});


// ===== RECORDING CARD =====
function createRecordingCard() {
  if (recordingCardEl) return; // already active

  const card = document.createElement("div");
  card.id = "recordingCard";
  card.className = "recording-card";
  card.innerHTML = `
    <div class="recording-card-top">
      <div class="rec-mini">
        <span class="d"></span>
        <span class="l">REC · TAB AUDIO</span>
        <span class="t" id="recTimer">00:00</span>
      </div>
      <div class="recording-orb-shell">
        <div class="orb-hero orb-recording"></div>
      </div>
      <div class="recording-title-wrap">
        <div class="welcome-eye compact"><span class="welcome-eye-dot"></span> Capture in progress</div>
        <h3 class="recording-title">Turn this tab into a usable note.</h3>
        <p class="recording-sub" id="recSegment">Recording...</p>
      </div>
    </div>
    <div class="recording-surface">
      <div class="recording-surface-head">Live capture</div>
      <p class="recording-surface-copy">Braino is listening to this tab. Pause when you want to save a segment, then convert everything into structured notes.</p>
      <div class="recording-suggested">
        <span class="recording-pill">Highlights will be pulled into your note</span>
        <span class="recording-pill">Ask follow-up questions after conversion</span>
      </div>
      <div class="recording-controls">
        <button id="pauseBtn" class="btn btn-stop">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12"/><rect x="14" y="6" width="4" height="12"/></svg>
          Pause &amp; Save
        </button>
        <button id="convertBtn" class="btn btn-convert" disabled>
          ${CONVERT_BUTTON_ICON} Convert to Notes
        </button>
      </div>
    </div>
  `;

  chatArea.appendChild(card);
  chatArea.scrollTop = chatArea.scrollHeight;

  recordingCardEl = card;
  convertBtn = card.querySelector("#convertBtn");
  pauseBtn = card.querySelector("#pauseBtn");
  recTimerEl = card.querySelector("#recTimer");
  recSegmentEl = card.querySelector("#recSegment");

  pauseBtn.addEventListener("click", handlePauseOrContinue);
  convertBtn.addEventListener("click", handleConvertToNotes);
}

function removeRecordingCard() {
  if (recordingCardEl) {
    recordingCardEl.remove();
    recordingCardEl = null;
  }
  convertBtn = null;
  pauseBtn = null;
  recTimerEl = null;
  recSegmentEl = null;
  isRecording = false;
  stopTimer();
  refreshPanelChrome();
}

function injectNotesReadyCard() {
  // Remove any existing notes-ready cards first
  chatArea.querySelectorAll(".notes-ready-card").forEach(el => el.remove());
  const recap = parseNoteRecap(notesMarkdown);

  const card = document.createElement("div");
  card.className = "notes-ready-card note-recap-card";
  card.innerHTML = `
    <div class="note-recap-head">
      <div class="welcome-eye compact"><span class="welcome-eye-dot"></span> Note saved</div>
      <h3 class="note-recap-title">${escapeHtml(recap.title)}</h3>
      <p class="note-recap-summary"><b>TL;DR.</b> ${escapeHtml(recap.summary)}</p>
    </div>
    <div class="note-recap-points">
      ${recap.points.slice(0, 4).map((point, index) => `
        <div class="note-recap-point">
          <span class="note-recap-tag">P${index + 1}</span>
          <span>${escapeHtml(point)}</span>
        </div>
      `).join("")}
    </div>
    <div class="note-recap-actions">
      <button class="open-notes-btn">Open full note</button>
      <button class="recap-secondary-btn copy-notes-btn">Copy markdown</button>
      ${(currentMode === "lecture" || currentMode === "meeting") ? `<button class="recap-secondary-btn record-more-inline-btn">Record more</button>` : ""}
    </div>
  `;
  card.querySelector(".open-notes-btn").addEventListener("click", () => {
    notesOverlay.classList.remove("hidden");
  });
  card.querySelector(".copy-notes-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(notesMarkdown);
  });
  card.querySelector(".record-more-inline-btn")?.addEventListener("click", () => startRecordingFlow());
  chatArea.appendChild(card);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function injectRecordMoreCard() {
  // Remove any stale record-more cards
  chatArea.querySelectorAll(".record-more-card").forEach(el => el.remove());

  const card = document.createElement("div");
  card.className = "record-more-card";
  card.innerHTML = `
    <span class="record-more-icon">🎙️</span>
    <div class="record-more-body">
      <span class="record-more-title">Add another recording</span>
      <span class="record-more-desc">Record a second segment — notes will be merged when you convert again.</span>
    </div>
    <button class="record-more-btn">Record more</button>
  `;
  card.querySelector(".record-more-btn").addEventListener("click", () => {
    card.remove();
    startRecordingFlow();
  });
  chatArea.appendChild(card);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function handlePauseOrContinue() {
  if (isRecording) {
    handleStopRecording();
  } else {
    startRecordingFlow();
  }
}

function updatePauseBtnState() {
  if (!pauseBtn) return;
  if (isRecording) {
    pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12"/><rect x="14" y="6" width="4" height="12"/></svg> Pause &amp; Save`;
    pauseBtn.classList.remove("btn-record");
    pauseBtn.classList.add("btn-stop");
    // Orb glow
    recordingCardEl?.querySelector(".orb-hero")?.classList.add("orb-recording");
  } else {
    pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg> Continue`;
    pauseBtn.classList.remove("btn-stop");
    pauseBtn.classList.add("btn-record");
    recordingCardEl?.querySelector(".orb-hero")?.classList.remove("orb-recording");
  }
  refreshPanelChrome();
}

function updateSegmentUI() {
  if (!recSegmentEl) return;
  if (audioSegments.length === 0) {
    recSegmentEl.textContent = isRecording ? "Listening to this tab in real time." : "Ready to capture a segment.";
  } else {
    const segNum = audioSegments.length;
    const total = formatTime(totalRecordedSeconds);
    recSegmentEl.textContent = `${segNum} saved segment${segNum > 1 ? "s" : ""} · ${total} captured so far.`;
  }
}

function updateConvertButtonLabel() {
  if (!convertBtn) return;
  const label = hasExistingNotes() ? "Update Notes" : "Convert to Notes";
  convertBtn.innerHTML = `${CONVERT_BUTTON_ICON} ${label}`;
}

function applyPageContext(result) {
  if (!result?.text) {
    currentPageContext = null;
    updateChatContextUI();
    updateVoicePageCtx();
    if (voiceActive && isRealtimeVoiceMode()) syncRealtimeVoiceSession();
    return null;
  }

  currentPageContext = {
    title: result.title,
    url: result.url,
    text: result.text,
    faviconUrl: result.faviconUrl || "",
  };
  updateChatContextUI();
  updateVoicePageCtx();
  if (voiceActive && isRealtimeVoiceMode()) syncRealtimeVoiceSession();
  return currentPageContext;
}


// ===== PAGE CONTEXT =====
function fetchPageContext() {
  chrome.runtime.sendMessage({ action: "getPageContent" }, (res) => {
    if (chrome.runtime.lastError || res?.error || !res?.text) {
      applyPageContext(null);
      return;
    }
    applyPageContext(res);
  });
}

function updateChatContextUI() {
  if (!chatInput) return;

  if (currentMode === "page") chatInput.placeholder = currentPageContext ? "Ask about this page…" : "Ask anything, or tell me what to do…";
  else if (currentMode === "lecture" || currentMode === "meeting") chatInput.placeholder = recordingCardEl ? "Ask about what you just heard…" : "Press ↵ to start recording this tab…";
  else if (currentMode === "web") chatInput.placeholder = "Search the web with sources…";
  else if (currentMode === "agent") chatInput.placeholder = "Tell Braino what to do…";
  else if (notesMarkdown) chatInput.placeholder = "Ask about this note…";
  else chatInput.placeholder = "Ask anything…";

  updateSendBtn();
  refreshPanelChrome();
}

fetchPageContext();


// ===== RECORDING FLOW =====
async function startRecordingFlow() {
  const allowed = await checkRecordingLimit();
  if (!allowed) return;
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getStreamId", tabId: trackedActiveTabId || undefined },
        (res) => resolve(res)
      );
    });

    if (response?.error) { handleRecordingStartError(response.error); return; }
    if (!response?.streamId) { handleRecordingStartError("Failed to get audio stream"); return; }

    if (!recordingCardEl) createRecordingCard();

    await beginLocalRecording(response.streamId, currentMode === "meeting");
    isRecording = true;
    seconds = 0;

    updatePauseBtnState();
    updateTimer();
    startTimer();
    startTrackingRecordingTime();
    updateChatContextUI();
    updateEmptyState();
  } catch (e) {
    handleRecordingStartError(e instanceof Error ? e.message : "Failed to start recording");
  }
}

async function handleStopRecording() {
  stopTrackingRecordingTime();
  const capturedSeconds = seconds;
  stopTimer();

  try {
    const audioBase64 = await stopLocalRecording();
    audioSegments.push(audioBase64);
    totalRecordedSeconds += capturedSeconds;
    seconds = 0;
    isRecording = false;

    chrome.storage.local.set({ audioSegments, totalRecordedSeconds });

    updatePauseBtnState();
    updateTimer();
    updateSegmentUI();
    if (convertBtn) convertBtn.disabled = false;
    updateChatContextUI();
  } catch (e) {
    alert("Error: " + e.message);
    isRecording = false;
    updatePauseBtnState();
  }
}

async function handleConvertToNotes() {
  if (audioSegments.length === 0) return;

  const existingNotesContext = hasExistingNotes() ? buildNotesContextForAI(notesMarkdown) : null;

  loadingEl?.classList.remove("hidden");
  if (convertBtn) convertBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = true;

  try {
    const requestBody = { audioSegments };
    if (existingNotesContext) {
      requestBody.existingNotes = existingNotesContext.sanitizedNotes;
      requestBody.existingImages = existingNotesContext.existingImages;
    }

    const response = await fetch(`${API_BASE}/transcribe-and-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    notesMarkdown = data.notes;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);

    chrome.storage.local.set({ currentNotes: notesMarkdown });
    saveToHistory(notesMarkdown);

    if (currentAuthUser?.token && currentSessionId) {
      const pageTitle = currentPageContext?.title || "Untitled";
      const pageUrl = currentPageContext?.url || "";
      saveNoteToCloud(currentSessionId, notesMarkdown, pageUrl, pageTitle, currentMode);
    }

    // Reset audio state
    audioSegments = [];
    totalRecordedSeconds = 0;
    seconds = 0;
    chrome.storage.local.remove(["audioSegments", "totalRecordedSeconds"]);

    // Update UI — remove recording card, show recap + record-more option
    removeRecordingCard();
    injectNotesReadyCard();
    injectRecordMoreCard();
    updateChatContextUI();
  } catch (e) {
    alert("Error: " + e.message);
    if (convertBtn) convertBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = false;
  } finally {
    loadingEl?.classList.add("hidden");
  }
}

function startTimer() {
  timerInterval = setInterval(() => { seconds++; updateTimer(); }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimer() {
  const total = totalRecordedSeconds + seconds;
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  const timeStr = `${m}:${s}`;
  if (recTimerEl) recTimerEl.textContent = timeStr;
  if (timerEl) timerEl.textContent = timeStr;
}

function handleRecordingStartError(message) {
  if (/Extension has not been invoked for the current page|activeTab permission|Chrome pages cannot be captured/i.test(message)) {
    alert("Chrome needs the extension to be reopened on the current page before a new recording can start there. Click the extension icon once on that page/video, then press Start Recording again.");
    return;
  }
  alert("Error: " + message);
}

async function beginLocalRecording(streamId, withMic = false) {
  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "startRecording", tabId: trackedActiveTabId || undefined, streamId, withMic },
      (res) => { if (res?.error) reject(new Error(res.error)); else resolve(); }
    );
  });
  mediaRecorder = true;
}

async function stopLocalRecording() {
  mediaRecorder = null;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "stopRecording" }, (res) => {
      if (res?.error) reject(new Error(res.error));
      else resolve(res.audioBase64);
    });
  });
}

// Restore audio segments on load
chrome.storage.local.get(["audioSegments", "totalRecordedSeconds", "currentSessionId"], (data) => {
  if (data.audioSegments && data.audioSegments.length > 0) {
    audioSegments = data.audioSegments;
    totalRecordedSeconds = data.totalRecordedSeconds || 0;
    currentSessionId = data.currentSessionId || null;
    // Show recording card in paused state so user can convert
    createRecordingCard();
    isRecording = false;
    updatePauseBtnState();
    updateTimer();
    updateSegmentUI();
    if (convertBtn) convertBtn.disabled = false;
  }
});


// ===== HISTORY =====
function openHistoryOverlay() {
  loadHistory();
  historyOverlay.classList.remove("hidden");
  setTimeout(() => historyOverlay.classList.add("open"), 10);
}

historyBtn?.addEventListener("click", openHistoryOverlay);

historyBackBtn?.addEventListener("click", closeHistory);

function closeHistory() {
  historyOverlay.classList.remove("open");
  setTimeout(() => historyOverlay.classList.add("hidden"), 300);
}

clearHistoryBtn?.addEventListener("click", () => {
  chrome.storage.local.remove("notesHistory", () => {
    loadHistory();
    updateHistoryBtnVisibility();
  });
});

function updateHistoryBtnVisibility() {
  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    if (history.length > 0) historyBtn?.classList.remove("hidden");
    else historyBtn?.classList.add("hidden");
    renderRecentHistory();
  });
}

function saveToHistory(markdown) {
  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    if (currentSessionId) {
      const idx = history.findIndex((e) => e.id === currentSessionId);
      if (idx !== -1) {
        history[idx].notes = markdown;
        history[idx].date = new Date().toISOString();
      } else {
        const newId = Date.now();
        currentSessionId = newId;
        chrome.storage.local.set({ currentSessionId });
        history.unshift({ notes: markdown, date: new Date().toISOString(), id: newId });
      }
    } else {
      const newId = Date.now();
      currentSessionId = newId;
      chrome.storage.local.set({ currentSessionId });
      history.unshift({ notes: markdown, date: new Date().toISOString(), id: newId });
    }
    if (history.length > 20) history.pop();
    chrome.storage.local.set({ notesHistory: history }, () => updateHistoryBtnVisibility());
  });
}

function openHistoryEntry(entry) {
  notesMarkdown = entry.notes;
  currentSessionId = entry.id;
  chrome.storage.local.set({ currentSessionId, currentNotes: notesMarkdown });
  notesContent.innerHTML = renderMarkdown(notesMarkdown);
  injectNotesReadyCard();
  updateChatContextUI();
  loadChatMessages(currentSessionId);
  closeHistory();
  notesOverlay.classList.remove("hidden");
}

function loadHistory() {
  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No saved notes yet</div>';
      return;
    }
    history.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const preview = (entry.notes.match(/^##?\s+(.+)$/m) || ["", entry.notes.substring(0, 60)])[1];
      item.innerHTML = `<div class="history-meta">${dateStr}</div><div class="history-preview">${preview}...</div>`;
      item.addEventListener("click", () => openHistoryEntry(entry));
      historyList.appendChild(item);
    });
  });
}


// ===== CHAT =====
function stripSourceSection(markdown) {
  return String(markdown || "").replace(/\n##\s+Sources[\s\S]*$/i, "").trim();
}

function extractSourceLinks(markdown) {
  const sourcesSection = String(markdown || "").match(/\n##\s+Sources[\s\S]*$/i)?.[0] || "";
  const matches = Array.from(sourcesSection.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g));
  return matches.slice(0, 5).map((match) => ({ title: match[1], url: match[2] }));
}

function getAssistantLabel() {
  if (currentMode === "web") return "Braino · Web";
  if (currentMode === "agent") return "Braino · Delegate";
  if (notesMarkdown && !currentPageContext) return "Braino · Notes";
  if (currentPageContext) return "Braino · Page";
  return "Braino";
}

function getFollowupSuggestions() {
  if (currentMode === "web") {
    return [
      "Compare the top 3 sources",
      "Find the official source",
      "What's the latest update here?",
    ];
  }

  if (currentMode === "agent") {
    return [
      "Watch the current tab",
      "Do the next step for me",
      "Summarize what just happened",
    ];
  }

  if (notesMarkdown) {
    return [
      "Generate practice questions",
      "Summarize this note in plain English",
      "Turn this into flashcards",
    ];
  }

  if (currentPageContext) {
    return [
      "What's the key thing here?",
      "Summarize this page",
      "What should I do next?",
    ];
  }

  return [
    "Ask a follow-up question",
    "Search the web for this",
    "Use voice instead",
  ];
}

function loadChatMessages(sessionId) {
  const key = `chat_${sessionId}`;
  chrome.storage.local.get(key, (data) => {
    chatMessages = data[key] || [];
    renderChatMessages();
    updateEmptyState();
  });
}

function saveChatMessages() {
  if (!currentSessionId) return;
  const key = `chat_${currentSessionId}`;
  chrome.storage.local.set({ [key]: chatMessages });
}

function buildAgentTraceEl(msg, index) {
  const stepCount = msg.steps?.length || 0;
  const isComplete = msg.status === "complete";

  const stepsHtml = (msg.steps || []).map((step, si) => {
    const isActive = step.status === "running";
    const isError = step.status === "error";
    const iconCls = isActive ? "run" : isError ? "error" : "done";
    const iconContent = isActive ? "" : isError ? "!" : "✓";
    const subText = isActive ? (step.type === "error" ? "Blocked" : "Working…")
      : isError ? (step.error || "This step failed.") : "Done";
    return `<div class="trace-step${isActive ? " active" : ""} trace-step-${step.type || "step"}${isError ? " trace-step-error" : ""}" data-step-index="${si}">
      <div class="ix">${String(si + 1).padStart(2, "0")}</div>
      <div><div class="desc">${escapeHtml(step.text)}</div><div class="sub">${escapeHtml(subText)}</div></div>
      <div class="ic ${iconCls}">${iconContent}</div>
    </div>`;
  }).join("");

  const totalText = isComplete
    ? `Completed · ${stepCount} step${stepCount !== 1 ? "s" : ""}`
    : stepCount > 0 ? `${stepCount} step${stepCount !== 1 ? "s" : ""} in progress`
    : "Starting…";

  const el = document.createElement("div");
  el.className = `agent-thinking-block${isComplete ? " agent-thinking-complete" : ""}`;
  el.dataset.msgIndex = String(index);
  el.dataset.stepCount = String(stepCount);
  el.innerHTML = `
    <div class="delegate-banner">
      <div class="lbl"><span class="d"></span> Delegate${!isComplete ? " · running" : ""}</div>
      <div class="what">${escapeHtml(msg.task || "")}</div>
    </div>
    <div class="agent-plan-head">Plan · live trace</div>
    <div class="agent-thinking-steps trace">${stepsHtml}</div>
    <div class="trace-total">
      <span class="trace-total-text">${totalText}</span>
      <span class="pill">DELEGATE</span>
    </div>
  `;
  return el;
}

function groupChatIntoTurns(messages) {
  const turns = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role === "agent-trace") {
      turns.push({ type: "agent-trace", msg, flatIdx: i });
      i++;
    } else if (msg.role === "user") {
      const next = messages[i + 1];
      const hasAssistant = next && next.role === "assistant";
      turns.push({
        type: "chat",
        user: msg,
        assistant: hasAssistant ? next : null,
        userFlatIdx: i,
        assistantFlatIdx: hasAssistant ? i + 1 : null,
      });
      i += hasAssistant ? 2 : 1;
    } else {
      i++;
    }
  }
  return turns;
}

function renderChatMessages() {
  chatMessagesEl.innerHTML = "";
  const turns = groupChatIntoTurns(chatMessages);

  turns.forEach((turn, turnIdx) => {
    const isActive = turnIdx === turns.length - 1;

    if (turn.type === "agent-trace") {
      chatMessagesEl.appendChild(buildAgentTraceEl(turn.msg, turn.flatIdx));
      return;
    }

    if (turnIdx > 0) {
      const divider = document.createElement("div");
      divider.className = "chat-turn-divider";
      chatMessagesEl.appendChild(divider);
    }

    const turnEl = document.createElement("div");
    turnEl.className = `chat-turn ${isActive ? "chat-turn-active" : "chat-turn-history"}`;

    // User bubble
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble chat-user";
    if (turn.user.image) userBubble.innerHTML += `<img src="${turn.user.image}" alt="Attached image" class="chat-msg-image" />`;
    userBubble.innerHTML += `<div class="chat-bubble-text rendered-md">${renderMarkdown(turn.user.content)}</div>`;
    turnEl.appendChild(userBubble);

    // Assistant bubble
    if (turn.assistant) {
      const aIdx = turn.assistantFlatIdx;
      const sources = extractSourceLinks(turn.assistant.content);
      const bodyMarkdown = stripSourceSection(turn.assistant.content);
      const followups = isActive ? getFollowupSuggestions() : [];

      const assistantBubble = document.createElement("div");
      assistantBubble.className = "chat-bubble chat-assistant chat-assistant-rich";
      assistantBubble.innerHTML = `
        <div class="assistant-bubble-shell">
          <div class="assistant-bubble-head"><span class="assistant-bubble-dot"></span>${escapeHtml(getAssistantLabel())}</div>
          ${turn.assistant.image ? `<img src="${turn.assistant.image}" alt="Attached image" class="chat-msg-image" />` : ""}
          <div class="chat-bubble-text rendered-md">${renderMarkdown(bodyMarkdown)}</div>
          ${sources.length ? `<div class="chat-source-row">${sources.map((s, si) => `<a class="chat-source-pill" href="${escapeHtml(s.url)}" target="_blank" rel="noreferrer"><span class="chat-source-pill-num">${si + 1}</span><span>${escapeHtml(s.title)}</span></a>`).join("")}</div>` : ""}
          ${followups.length ? `<div class="chat-followups">${followups.map(f => `<button class="chat-followup" type="button" data-followup="${escapeHtml(f)}"><span>${escapeHtml(f)}</span><span class="chat-followup-arrow">→</span></button>`).join("")}</div>` : ""}
          ${isActive ? `<div class="chat-assistant-tools"><button class="chat-tool-btn" type="button" data-tool="copy" data-index="${aIdx}">Copy</button><button class="chat-tool-btn" type="button" data-tool="reuse" data-index="${aIdx}">Use again</button></div>` : ""}
        </div>
      `;
      turnEl.appendChild(assistantBubble);
    }

    chatMessagesEl.appendChild(turnEl);
  });

  chatArea.scrollTop = chatArea.scrollHeight;
  refreshPanelChrome();
}

chatMessagesEl?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const followupBtn = target.closest(".chat-followup");
  if (followupBtn && chatInput) {
    chatInput.value = followupBtn.dataset.followup || "";
    chatInput.focus();
    return;
  }

  const toolBtn = target.closest(".chat-tool-btn");
  if (!toolBtn) return;

  const index = Number(toolBtn.dataset.index);
  const tool = toolBtn.dataset.tool;
  const msg = chatMessages[index];
  if (!msg) return;

  if (tool === "copy") {
    navigator.clipboard.writeText(msg.content);
    toolBtn.textContent = "Copied";
    window.setTimeout(() => { toolBtn.textContent = "Copy"; }, 1200);
    return;
  }

  if (tool === "reuse" && chatInput) {
    const previousUser = [...chatMessages.slice(0, index).reverse()].find((entry) => entry.role === "user");
    chatInput.value = previousUser ? previousUser.content.replace(/^🤖\s*/, "") : "";
    chatInput.focus();
  }
});

function sbIsOnX() {
  const url = currentPageContext?.url || "";
  return /^https?:\/\/(www\.)?(twitter|x)\.com/i.test(url);
}

async function sbLoadXPersona() {
  if (sbXPersonaCache !== null) return sbXPersonaCache;
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "loadXPersona" }, res => {
      void chrome.runtime.lastError;
      sbXPersonaCache = res?.persona || null;
      resolve(sbXPersonaCache);
    });
  });
}

function sbBuildXAutoContext(persona) {
  const lines = ["=== BRAINO X AUTO CONFIGURATION ==="];
  lines.push("You are Braino, the AI browser companion. You are currently operating for this user on X/Twitter.");
  lines.push("When the user asks what you know about them, how you reply to posts, or what rules you follow on X — answer fully and specifically based on this configuration.");
  lines.push("");
  lines.push("USER IDENTITY:");
  if (persona?.display_name) lines.push(`Name: ${persona.display_name}`);
  if (persona?.bio) lines.push(`Background: ${persona.bio}`);
  if (persona?.what_building) lines.push(`Currently building: ${persona.what_building}`);
  if (persona?.tone_notes) lines.push(`Writing style: ${persona.tone_notes}`);
  if (!persona?.display_name && !persona?.bio && !persona?.what_building && !persona?.tone_notes) {
    lines.push("(User has not configured their persona yet — go to Dashboard → X Automation → Your Voice & Style to set it up)");
  }
  lines.push("");
  lines.push("X AUTO REPLY RULES (what Braino follows when replying to posts):");
  lines.push("• Max 180 characters per reply");
  lines.push("• Reply to ONE specific detail or phrase — no generic praise or paraphrasing");
  lines.push("• Sound human: conversational, concrete, fragments OK, a little imperfect is fine");
  lines.push("• Match the tweet's energy — sharp, thoughtful, or playful as needed");
  lines.push("• No canned openers: 'great point', 'love this', 'totally agree', 'thanks for sharing'");
  lines.push("• No AI phrases: 'this highlights', 'this underscores', 'important conversation', 'valuable insight'");
  lines.push("• At most one emoji, only if it feels natural to the tweet");
  lines.push("• For builder prompts (e.g. 'what are you building'): can mention Braino and trybraino.com once, naturally");
  lines.push("• For regular tweets: no self-promotion unless directly relevant");
  lines.push("• Skips: ads, promoted posts, political tweets (elections, Modi, party politics)");
  lines.push("• Internally drafts 3 candidates and picks the most specific, least generic one");
  lines.push("=====================================");
  return lines.join("\n");
}

async function sendChatMessage(text, imageBase64) {
  if (!text && !imageBase64) return;
  const allowed = await checkChatLimit();
  if (!allowed) return;
  await incrementChatCount();

  const userMsg = { role: "user", content: text || "📎 Image attached — please insert into notes" };
  if (imageBase64) userMsg.image = `data:image/png;base64,${imageBase64}`;
  chatMessages.push(userMsg);
  if (!currentSessionId) {
    currentSessionId = Date.now();
    chrome.storage.local.set({ currentSessionId });
  }
  renderChatMessages();
  saveChatMessages();
  updateEmptyState();

  // Create thinking bubble
  const thinkingEl = document.createElement("div");
  thinkingEl.className = "chat-bubble chat-assistant chat-thinking";
  const thinkingText = currentPageContext ? "Reading page..." : "Thinking";
  thinkingEl.innerHTML = `<div class="thinking-wave"><span class="thinking-wave-text">${thinkingText}</span></div>`;
  chatMessagesEl.appendChild(thinkingEl);
  chatArea.scrollTop = chatArea.scrollHeight;

  const thinkingLabels = currentPageContext
    ? ["Reading page...", "Analyzing content...", "Thinking...", "Writing response..."]
    : ["Thinking...", "Writing response..."];
  let labelIdx = 0;
  const thinkingInterval = setInterval(() => {
    labelIdx = (labelIdx + 1) % thinkingLabels.length;
    const textEl = thinkingEl.querySelector(".thinking-wave-text");
    if (textEl) {
      textEl.style.opacity = "0";
      textEl.style.transform = "translateY(4px)";
      setTimeout(() => {
        textEl.textContent = thinkingLabels[labelIdx];
        textEl.style.opacity = "1";
        textEl.style.transform = "translateY(0)";
      }, 200);
    }
  }, 2000);

  try {
    const hasNotes = hasExistingNotes();
    const notesCtx = hasNotes ? buildNotesContextForAI(notesMarkdown) : { sanitizedNotes: "", existingImages: {} };

    // When on X/Twitter, prepend X Auto configuration so Braino is fully context-aware
    let systemNotes = notesCtx.sanitizedNotes;
    if (sbIsOnX()) {
      const xPersona = await sbLoadXPersona();
      const xCtx = sbBuildXAutoContext(xPersona);
      systemNotes = notesCtx.sanitizedNotes ? xCtx + "\n\n" + notesCtx.sanitizedNotes : xCtx;
    }

    const body = {
      notes: systemNotes,
      message: text || "Please insert this diagram/image into my notes at the most appropriate location.",
      aiProvider: getTextAiProvider(),
    };
    if (currentPageContext) body.pageContext = currentPageContext;
    if (currentSelection) body.selectedText = currentSelection;
    if (imageBase64) {
      body.existingImages = notesCtx.existingImages;
      body.imageBase64 = imageBase64;
    } else {
      body.chatHistory = chatMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    }

    const response = await fetch(`${API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    clearInterval(thinkingInterval);
    thinkingEl.remove();
    chatMessages.push({ role: "assistant", content: data.reply });
    renderChatMessages();
    saveChatMessages();

    if (data.updatedNotes) {
      notesMarkdown = data.updatedNotes;
      notesContent.innerHTML = renderMarkdown(notesMarkdown);
      chrome.storage.local.set({ currentNotes: notesMarkdown });
      saveToHistory(notesMarkdown);
    }
  } catch (e) {
    clearInterval(thinkingInterval);
    thinkingEl.remove();
    chatMessages.push({ role: "assistant", content: `⚠️ Error: ${e.message}` });
    renderChatMessages();
    saveChatMessages();
  }
}

async function fetchWebSearchReply(text, historyOverride) {
  const searchData = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "performWebSearch",
      query: text,
      purpose: "answer",
      aiProvider: getTextAiProvider(),
      chatHistory: historyOverride,
    }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ error: chrome.runtime.lastError.message });
        return;
      }
      resolve(res || { error: "No search response" });
    });
  });

  if (searchData?.error) {
    throw new Error(searchData.error);
  }
  if (!searchData?.results?.length && !searchData?.answer) {
    throw new Error("I couldn't pull back any live results for that search.");
  }

  const rawReply = String(searchData.answer || "I couldn't turn those web results into a useful answer.");
  return appendSearchSources(rawReply, searchData.results);
}

async function sendWebSearchMessage(text) {
  if (!text) return;
  const allowed = await checkChatLimit();
  if (!allowed) return;
  await incrementChatCount();

  chatMessages.push({ role: "user", content: text });
  renderChatMessages();
  saveChatMessages();
  updateEmptyState();

  const thinkingEl = document.createElement("div");
  thinkingEl.className = "chat-bubble chat-assistant chat-thinking";
  thinkingEl.innerHTML = `<div class="thinking-wave"><span class="thinking-wave-text">Searching the web...</span></div>`;
  chatMessagesEl.appendChild(thinkingEl);
  chatArea.scrollTop = chatArea.scrollHeight;

  const thinkingLabels = ["Searching the web...", "Reading results...", "Writing response..."];
  let labelIdx = 0;
  const thinkingInterval = setInterval(() => {
    labelIdx = (labelIdx + 1) % thinkingLabels.length;
    const textEl = thinkingEl.querySelector(".thinking-wave-text");
    if (!textEl) return;
    textEl.style.opacity = "0";
    textEl.style.transform = "translateY(4px)";
    setTimeout(() => {
      textEl.textContent = thinkingLabels[labelIdx];
      textEl.style.opacity = "1";
      textEl.style.transform = "translateY(0)";
    }, 200);
  }, 1800);

  try {
    const history = chatMessages.slice(0, -1).map((message) => ({ role: message.role, content: message.content }));
    const reply = await fetchWebSearchReply(text, history);
    clearInterval(thinkingInterval);
    thinkingEl.remove();
    chatMessages.push({ role: "assistant", content: reply });
    renderChatMessages();
    saveChatMessages();
  } catch (e) {
    clearInterval(thinkingInterval);
    thinkingEl.remove();
    chatMessages.push({ role: "assistant", content: `⚠️ Error: ${e.message}` });
    renderChatMessages();
    saveChatMessages();
  }
}


// ===== BROWSER AGENT =====

function setAgentRunningUI(running) {
  agentRunning = running;
  if (!chatSendBtn) return;
  if (running) {
    chatSendBtn.innerHTML = STOP_ICON;
    chatSendBtn.title = "Stop agent";
    chatSendBtn.classList.add("btn-agent-stop");
    if (chatInput) { chatInput.disabled = true; chatInput.placeholder = "Agent is working…"; }
  } else {
    chatSendBtn.innerHTML = SEND_ICON;
    chatSendBtn.title = "Send";
    chatSendBtn.classList.remove("btn-agent-stop");
    if (chatInput) chatInput.disabled = false;
    updateChatContextUI();
  }
  refreshPanelChrome();
}

// ---- Agent thinking block — stored in chatMessages for persistence ----
function createAgentThinkingBlock(task) {
  chatMessages.push({ role: "agent-trace", task, steps: [], status: "running" });
  const msgIndex = chatMessages.length - 1;
  saveChatMessages();
  renderChatMessages();
  chatArea.scrollTop = chatArea.scrollHeight;
  return chatMessagesEl.querySelector(`[data-msg-index="${msgIndex}"]`);
}

function agentAddStep(block, text, type = "step") {
  const msgIndex = block ? Number(block.dataset.msgIndex) : -1;

  let stepIndex;
  if (msgIndex >= 0 && chatMessages[msgIndex]?.role === "agent-trace") {
    const msg = chatMessages[msgIndex];
    stepIndex = msg.steps.length;
    msg.steps.push({ text, type, status: "running" });
    saveChatMessages();
  }

  // Always use the live DOM element in case the block was re-rendered
  const liveBlock = msgIndex >= 0
    ? (chatMessagesEl.querySelector(`[data-msg-index="${msgIndex}"]`) || block)
    : block;

  if (!liveBlock) return null;

  const stepCount = Number(liveBlock.dataset.stepCount || "0") + 1;
  liveBlock.dataset.stepCount = String(stepCount);

  const line = document.createElement("div");
  line.className = `trace-step active trace-step-${type}`;
  if (stepIndex !== undefined) line.dataset.stepIndex = String(stepIndex);
  line._traceRef = { msgIndex, stepIndex };
  line.innerHTML = `
    <div class="ix">${String(stepCount).padStart(2, "0")}</div>
    <div>
      <div class="desc">${escapeHtml(text)}</div>
      <div class="sub">${type === "error" ? "Blocked" : "Working…"}</div>
    </div>
    <div class="ic run"></div>
  `;

  const steps = liveBlock.querySelector(".agent-thinking-steps");
  if (steps) steps.appendChild(line);

  const totalText = liveBlock.querySelector(".trace-total-text");
  if (totalText) totalText.textContent = `${stepCount} step${stepCount !== 1 ? "s" : ""} in progress`;
  chatArea.scrollTop = chatArea.scrollHeight;
  return line;
}

function agentMarkStepResult(stepEl, success, errorMsg) {
  if (!stepEl) return;

  const ref = stepEl._traceRef;
  if (ref?.msgIndex >= 0 && chatMessages[ref.msgIndex]?.steps?.[ref.stepIndex]) {
    chatMessages[ref.msgIndex].steps[ref.stepIndex].status = success ? "done" : "error";
    if (!success) chatMessages[ref.msgIndex].steps[ref.stepIndex].error = errorMsg || null;
    saveChatMessages();
  }

  // Find the live step in case block was re-rendered
  let target = stepEl;
  if (ref?.msgIndex >= 0) {
    const liveBlock = chatMessagesEl.querySelector(`[data-msg-index="${ref.msgIndex}"]`);
    const liveStep = ref.stepIndex !== undefined
      ? liveBlock?.querySelector(`[data-step-index="${ref.stepIndex}"]`)
      : null;
    if (liveStep) target = liveStep;
  }

  target.classList.remove("active");
  const icon = target.querySelector(".ic");
  const sub = target.querySelector(".sub");
  if (!success) {
    target.classList.add("trace-step-error");
    if (icon) { icon.className = "ic error"; icon.innerHTML = "!"; }
    if (sub) sub.textContent = errorMsg || "This step failed.";
  } else {
    if (icon) { icon.className = "ic done"; icon.innerHTML = "✓"; }
    if (sub) sub.textContent = "Done";
  }
}

function agentFinalizeBlock(block, stepCount) {
  const msgIndex = block ? Number(block.dataset.msgIndex) : -1;

  if (msgIndex >= 0 && chatMessages[msgIndex]?.role === "agent-trace") {
    chatMessages[msgIndex].status = "complete";
    saveChatMessages();
  }

  const liveBlock = msgIndex >= 0
    ? (chatMessagesEl.querySelector(`[data-msg-index="${msgIndex}"]`) || block)
    : block;

  if (!liveBlock) return;

  const totalText = liveBlock.querySelector(".trace-total-text");
  if (totalText) totalText.textContent = `Completed · ${stepCount} step${stepCount !== 1 ? "s" : ""}`;
  liveBlock.classList.add("agent-thinking-complete");

  const lbl = liveBlock.querySelector(".delegate-banner .lbl");
  if (lbl) lbl.innerHTML = `<span class="d"></span> Delegate`;
}

function getAgentPageContext() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getAgentPageContext" }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        resolve({ url: "", title: "", bodyText: "", interactiveEls: [] });
      } else {
        resolve(res);
      }
    });
  });
}

function executeAgentAction(actionObj) {
  return new Promise((resolve) => {
    const msg = { action: "agentAction", ...actionObj };
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(res || { error: "No response" });
    });
  });
}

function getSiteAdapterContext() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getSiteAdapterContext" }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        resolve({ site: "generic", url: "", title: "" });
      } else {
        resolve(res || { site: "generic", url: "", title: "" });
      }
    });
  });
}

function executeSiteAdapterAction(actionObj) {
  return new Promise((resolve) => {
    const msg = { action: "siteAdapterAction", ...actionObj };
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(res || { error: "No response" });
    });
  });
}

function buildSpotifyTrackSearchUrl(songName) {
  return `https://open.spotify.com/search/${encodeURIComponent(songName)}/tracks`;
}

function buildGmailComposeUrl({ to, subject, body }) {
  const url = new URL("https://mail.google.com/mail/u/0/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("tf", "1");
  if (to) url.searchParams.set("to", to);
  if (subject) url.searchParams.set("su", subject);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

async function callGoogleDriveFunction(functionName, payload) {
  const token = await getAuthToken();
  const authState = await getStorage(["authUserId"]);
  if (!token || !authState.authUserId) throw new Error("Please sign in to Braino first.");
  console.log("[Braino][Drive][Popup] Calling function:", functionName, payload);

  const response = await fetch(`${API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userIdentifier: authState.authUserId,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  console.log("[Braino][Drive][Popup] Function response:", functionName, response.status, data);
  if (!response.ok) throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  return data;
}

async function callSpotifyFunction(functionName, payload) {
  const token = await getAuthToken();
  if (!token) throw new Error("Please sign in to Braino first.");

  const response = await fetch(`${API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data?.reconnectRequired) {
      await openSpotifyReconnect(token);
      throw new Error("Spotify needs to be reconnected. I opened the reconnect page — after approving, run this again.");
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function openSpotifyReconnect(token) {
  try {
    const tok = token || (await getAuthToken());
    if (!tok) return false;
    const response = await fetch(`${API_BASE}/spotify-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tok}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    window.open(data.authUrl);
    return true;
  } catch (err) {
    console.warn("[Braino][Spotify][Popup] Could not open reconnect flow:", err);
    return false;
  }
}

function extractSongFromPageTitle(title, url) {
  let s = String(title || "").trim();
  s = s.replace(/\s*[-|–—]\s*(YouTube|SoundCloud|Vimeo|Dailymotion|Spotify|Apple Music|Tidal|Amazon Music)\s*$/i, "");
  s = s.replace(/\s*[\[(](Official\s+(Music\s+)?Video|Official\s+Audio|Official\s+Lyric\s+Video|Lyrics?|Audio|HQ|HD|4K|MV|Live\s+(Performance|Version)?|Visualizer|Fan\s+Made|Radio\s+Edit)[)\]]\s*/gi, " ");
  s = s.replace(/\s*VEVO\s*/gi, " ");
  s = s.replace(/\s*\(\d{4}\)\s*$/, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

// Lightweight page snapshot — URL, title, first 500 chars of visible text
// Used to verify the agent actually landed where it intended
async function getPageSnapshot() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) { resolve(null); return; }
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => ({
            url: location.href,
            title: document.title,
            text: document.body?.innerText?.slice(0, 500) || ""
          })
        });
        resolve(result?.result || null);
      } catch(e) { resolve(null); }
    });
  });
}

// Actions after which we capture a snapshot so the agent can verify landing
const SNAPSHOT_ACTIONS = new Set(["navigate", "click", "selectOption", "pressKey"]);

function parseAdapterTask(task, siteContext) {
  const raw = String(task || "").trim();
  const text = raw.toLowerCase();
  const currentSite = siteContext?.site || "generic";
  const onSpotify = currentSite === "spotify" || /\bspotify\b/.test(text);
  const wantsGoogleDoc = /\bgoogle docs?\b|\bgdocs?\b|\bgoogle doc\b|\bgdoc\b|\bdocs?\.new\b|\bdocs?\b/.test(text);
  const wantsGmail = currentSite === "gmail" || /\bgmail\b|\bemail\b|\bmail\b/.test(text);
  const wantsGoogleDrive = currentSite === "google-drive" || /\bgoogle drive\b|\bdrive\b/.test(text);

  if (
    wantsGoogleDrive &&
    /\b(organize|organise|organhise|sort|clean(?:\s+up)?|tidy(?:\s+up)?|arrange)\b/i.test(raw) &&
    /\b(files?|folders?|docs?|documents?|drive)\b/i.test(raw)
  ) {
    return { adapter: "google-drive", intent: "organize" };
  }

  const quotedAdd = raw.match(/add\s+["“](.+?)["”]\s+to\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedAdd) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: quotedAdd[1].trim(), playlist: quotedAdd[2].trim() };
  }

  const addMatch = raw.match(/add\s+(?:the\s+song\s+|song\s+)?(.+?)\s+to\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && addMatch) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: addMatch[1].trim(), playlist: addMatch[2].trim() };
  }

  const quotedPlay = raw.match(/play\s+["“](.+?)["”]\s+from\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedPlay) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: quotedPlay[1].trim(), playlist: quotedPlay[2].trim() };
  }

  const playMatch = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)\s+from\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && playMatch) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: playMatch[1].trim(), playlist: playMatch[2].trim() };
  }

  const quotedDirectPlay = raw.match(/play\s+["“](.+?)["”](?:\s+(?:on|in)\s+spotify)?$/i);
  if (onSpotify && quotedDirectPlay && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(quotedDirectPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: quotedDirectPlay[1].trim() };
  }

  const directPlay = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)(?:\s+(?:on|in)\s+spotify)?$/i);
  if (onSpotify && directPlay && !/\bfrom\s+(?:my\s+)?playlist\b/i.test(raw) && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(directPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: directPlay[1].trim() };
  }

  // "add this song to Spotify" — infer song from current page, save to Liked Songs or playlist
  const addThisQuoted = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:playlist\s+)?[""](.+?)[""](?:\s+(?:playlist\s+)?(?:on\s+)?spotify)?/i);
  if (addThisQuoted) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisQuoted[1].trim() };
  }
  const addThisNamed = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+my\s+(.+?)\s+playlist(?:\s+(?:on\s+)?spotify)?\s*$/i);
  if (addThisNamed) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisNamed[1].trim() };
  }
  if (/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:liked\s+songs?\s+(?:on\s+)?)?spotify\b/i.test(raw) ||
      /(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?liked\s+songs?\b/i.test(raw)) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: null };
  }

  const articlePatterns = [
    /search for\s+(.+?)\s+and\s+(?:write|draft|make|create)\s+(?:about it\s+)?(?:(?:a|an)\s+)?(?:article|report|brief|google docs?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google docs?|docs?)?/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+put\s+(?:it\s+)?(?:in|into)\s+(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+(?:write|draft|make|create|put|turn it into)\s+(?:(?:a|an)\s+)?(?:article|report|brief|google docs?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google docs?|docs?)?/i,
    /write\s+an?\s+article\s+about\s+(.+?)\s+in\s+(?:a\s+)?google docs?/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)\s+(?:about|on)\s+(.+)/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:an?\s+)?(?:article|report|brief)\s+(?:about|on)\s+(.+?)\s+(?:in|as|inside)\s+(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)/i,
  ];

  if (wantsGoogleDoc) {
    for (const pattern of articlePatterns) {
      const match = raw.match(pattern);
      if (match) {
        return { adapter: "google-docs", intent: "researchArticle", topic: match[1].trim() };
      }
    }
  }

  const sendEmailMatch = raw.match(/(?:send|compose|draft|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about|subject)\s+(.+?)\s+(?:saying|that says|body)\s+(.+)$/i);
  if (wantsGmail && sendEmailMatch) {
    return {
      adapter: "gmail",
      intent: /^(send)/i.test(raw.trim()) ? "sendEmail" : "draftEmail",
      to: sendEmailMatch[1].trim(),
      subject: sendEmailMatch[2].trim(),
      body: sendEmailMatch[3].trim(),
    };
  }

  const draftEmailMatch = raw.match(/(?:draft|compose|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:saying|that says|with message)\s+(.+)$/i);
  if (wantsGmail && draftEmailMatch) {
    return {
      adapter: "gmail",
      intent: "draftEmail",
      to: draftEmailMatch[1].trim(),
      subject: "",
      body: draftEmailMatch[2].trim(),
    };
  }

  const replyEmailMatch = raw.match(/reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && replyEmailMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: replyEmailMatch[1].trim(),
      send: true,
    };
  }

  const draftReplyMatch = raw.match(/draft\s+(?:a\s+)?reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && draftReplyMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: draftReplyMatch[1].trim(),
      send: false,
    };
  }

  const gmailSearchMatch = raw.match(/(?:find|search|look for|open)\s+(?:emails?|mail)\s+(?:about|for|from)?\s+(.+)$/i);
  if (wantsGmail && gmailSearchMatch) {
    return {
      adapter: "gmail",
      intent: "search",
      query: gmailSearchMatch[1].trim(),
    };
  }

  const createFolderMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?(?:google\s+)?drive folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?$/i);
  if (wantsGoogleDrive && createFolderMatch) {
    const parentFolderMatch = raw.match(/\s+in\s+folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
    return {
      adapter: "google-drive",
      intent: "createFolder",
      folderName: createFolderMatch[1].trim(),
      parentFolderName: parentFolderMatch?.[1]?.trim() || null,
    };
  }

  const createDocMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?google doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && createDocMatch) {
    return {
      adapter: "google-drive",
      intent: "createDoc",
      docName: createDocMatch[1].trim(),
      parentFolderName: createDocMatch[2]?.trim() || null,
    };
  }

  const renameMatch = raw.match(/rename\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && renameMatch) {
    return {
      adapter: "google-drive",
      intent: "rename",
      targetKind: renameMatch[1]?.trim()?.toLowerCase() || null,
      currentName: renameMatch[2].trim(),
      newName: renameMatch[3].trim(),
    };
  }

  const moveMatch = raw.match(/move\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+(?:folder\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && moveMatch) {
    return {
      adapter: "google-drive",
      intent: "move",
      targetKind: moveMatch[1]?.trim()?.toLowerCase() || null,
      itemName: moveMatch[2].trim(),
      destinationFolderName: moveMatch[3].trim(),
    };
  }

  const deleteMatch = raw.match(/(?:delete|remove|trash)\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?(?:\s+(?:from|in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && deleteMatch) {
    return {
      adapter: "google-drive",
      intent: "delete",
      targetKind: deleteMatch[1]?.trim()?.toLowerCase() || null,
      itemName: deleteMatch[2].trim(),
    };
  }

  const folderSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && folderSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: folderSearchMatch[1].trim(), folderOnly: true };
  }

  const fileSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?file\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:find|search for|look for)\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && fileSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: fileSearchMatch[1].trim(), folderOnly: false };
  }

  return null;
}

async function buildArticleDraftFromWebSearch(topic) {
  const searchData = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "performWebSearch",
      query: topic,
      purpose: "google_doc",
      aiProvider: getTextAiProvider(),
    }, (res) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(res || { error: "No search response" });
    });
  });

  if (searchData?.error) throw new Error(searchData.error);
  if (!searchData?.body) throw new Error(`I couldn't create a grounded research draft for "${topic}".`);

  return {
    title: String(searchData.title || `${topic} - Braino Research`).trim(),
    body: String(searchData.body).trim(),
  };
}

async function buildDriveOrganizationPlan(files) {
  const safeFiles = Array.isArray(files) ? files.slice(0, 180) : [];
  if (!safeFiles.length) {
    return { folders: [], moves: [] };
  }

  const response = await fetch(`${API_BASE}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aiProvider: getTextAiProvider(),
      pageContext: {
        title: "Google Drive file inventory",
        url: "https://drive.google.com",
        text: safeFiles.map((file, index) => (
          `[${index + 1}] id=${file.id}\nname=${file.name}\nmime=${file.mimeType}\nparents=${(file.parentNames || []).join(", ") || "root"}`
        )).join("\n\n"),
      },
      message: `You are organizing a Google Drive using API actions.

Return ONLY JSON. No markdown fences.
Format:
{"folders":["Folder A","Folder B"],"moves":[{"fileId":"abc","targetFolderName":"Folder A"}]}

Rules:
- Create practical folders based on the files provided.
- Use at most 8 folders.
- Every move must reference an exact fileId from the inventory.
- targetFolderName must be one of the folders you propose.
- Skip files that should stay where they are.
- Favor simple, human folder names like Finance, Hiring, Meetings, Decks, Docs, Legal, Product, Misc.
- Do not invent fileIds.
- Do not include explanations outside JSON.`,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Drive organization planning failed: ${response.status}`);
  }

  const data = await response.json();
  const reply = String(data.reply || "").trim();
  const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\{[\s\S]*\})/);
  const json = (match?.[1] ?? match?.[0] ?? reply).trim();
  const parsed = JSON.parse(json);
  return {
    folders: Array.isArray(parsed?.folders) ? parsed.folders.map((item) => String(item || "").trim()).filter(Boolean) : [],
    moves: Array.isArray(parsed?.moves) ? parsed.moves : [],
  };
}

function validateDriveOrganizationPlan(files, plan) {
  const fileMap = new Map((Array.isArray(files) ? files : []).map((file) => [String(file.id), file]));
  const normalizedFolders = Array.from(new Set((Array.isArray(plan?.folders) ? plan.folders : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)));
  const allowedFolders = new Set(normalizedFolders);
  const moves = [];

  for (const move of Array.isArray(plan?.moves) ? plan.moves : []) {
    const fileId = String(move?.fileId || "").trim();
    const targetFolderName = String(move?.targetFolderName || "").trim();
    if (!fileId || !targetFolderName) continue;
    const file = fileMap.get(fileId);
    if (!file) continue;
    if (!allowedFolders.has(targetFolderName)) continue;
    moves.push({
      fileId,
      fileName: file.name,
      currentParentIds: Array.isArray(file.parentIds) ? file.parentIds : [],
      targetFolderName,
    });
  }

  const foldersToCreate = Array.from(new Set(moves.map((move) => move.targetFolderName)));
  return { foldersToCreate, moves };
}

async function runPopupAdapterStep({ thinkingBlock, history, description, type, run, onStatus }) {
  if (onStatus) onStatus(description);
  const stepEl = agentAddStep(thinkingBlock, description);
  const result = await run();
  history.push({ type: type || "adapter", description, result });
  agentMarkStepResult(stepEl, !result?.error, result?.error);
  if (result?.error) throw new Error(result.error);
  return result;
}

async function tryRunPopupSiteAdapter(task, thinkingBlock, history, options = {}) {
  const siteContext = await getSiteAdapterContext();
  const parsed = parseAdapterTask(task, siteContext);
  console.log("[Braino][Adapter][Popup] Parsed task:", { task, siteContext, parsed });
  if (!parsed) return null;

  const onStatus = options.onStatus;
  const shouldStop = options.shouldStop || (() => false);

  if (parsed.adapter === "spotify" && parsed.intent === "addSongToPlaylist") {
    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Open Spotify search for "${parsed.song}"`,
      type: "navigate",
      onStatus,
      run: async () => {
        const result = await executeAgentAction({
          type: "navigate",
          url: buildSpotifyTrackSearchUrl(parsed.song),
          description: `Open Spotify search for "${parsed.song}"`,
        });
        if (!result?.error) {
          await waitForTabReady(6000);
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        return result;
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Add "${parsed.song}" to the exact playlist "${parsed.playlist}"`,
      type: "spotifyAddTrackToPlaylist",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "spotifyAddTrackToPlaylist",
        songName: parsed.song,
        playlistName: parsed.playlist,
      }),
    });

    return `Added **${parsed.song}** to **${parsed.playlist}** on Spotify.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSongFromPlaylist") {
    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Open your Spotify playlists library",
      type: "navigate",
      onStatus,
      run: async () => {
        const result = await executeAgentAction({
          type: "navigate",
          url: "https://open.spotify.com/collection/playlists",
          description: "Open your Spotify playlists library",
        });
        if (!result?.error) {
          await waitForTabReady(6000);
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        return result;
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Open the exact playlist "${parsed.playlist}"`,
      type: "spotifyOpenPlaylist",
      onStatus,
      run: async () => {
        const result = await executeSiteAdapterAction({
          type: "spotifyOpenPlaylist",
          playlistName: parsed.playlist,
        });
        if (!result?.error) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const verify = await getSiteAdapterContext();
          if (!verify?.currentPlaylistName || verify.currentPlaylistName.trim().toLowerCase() !== parsed.playlist.trim().toLowerCase()) {
            return { error: `Opened the wrong playlist. Expected "${parsed.playlist}", got "${verify?.currentPlaylistName || "unknown"}".` };
          }
        }
        return result;
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Play "${parsed.song}" from "${parsed.playlist}"`,
      type: "spotifyPlayTrackFromCurrentPlaylist",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "spotifyPlayTrackFromCurrentPlaylist",
        songName: parsed.song,
      }),
    });

    return `Playing **${parsed.song}** from **${parsed.playlist}** on Spotify.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSong") {
    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Open Spotify search for "${parsed.song}"`,
      type: "navigate",
      onStatus,
      run: async () => {
        const result = await executeAgentAction({
          type: "navigate",
          url: buildSpotifyTrackSearchUrl(parsed.song),
          description: `Open Spotify search for "${parsed.song}"`,
        });
        if (!result?.error) {
          await waitForTabReady(6000);
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        return result;
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Play the best Spotify result for "${parsed.song}"`,
      type: "spotifyPlayFirstTrackResult",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "spotifyPlayFirstTrackResult",
        songName: parsed.song,
      }),
    });

    return `Playing **${parsed.song}** on Spotify.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "addCurrentPageSong") {
    const rawTitle = String(currentPageContext?.title || "").trim();
    if (!rawTitle) throw new Error("I couldn't read the current page title. Make sure you're on YouTube or a music page with Braino attached.");

    const songQuery = extractSongFromPageTitle(rawTitle, currentPageContext?.url || "");

    const searchResult = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Search Spotify for "${songQuery}"`,
      type: "spotify_search",
      onStatus,
      run: async () => {
        const data = await callSpotifyFunction("spotify-search", { query: songQuery, limit: 1 });
        const track = data?.tracks?.[0];
        if (!track) return { error: `No Spotify track found for "${songQuery}".` };
        return { success: true, track };
      },
    });

    if (shouldStop()) return null;

    const track = searchResult.track;
    const destination = parsed.playlist ? `playlist "${parsed.playlist}"` : "Liked Songs";

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Add "${track.name}" by ${track.artists?.join(", ") || "unknown"} to ${destination}`,
      type: "spotify_add_track",
      onStatus,
      run: async () => {
        const payload = parsed.playlist
          ? { action: "addToPlaylist", trackId: track.id, playlistName: parsed.playlist }
          : { action: "like", trackId: track.id };
        return callSpotifyFunction("spotify-add-track", payload);
      },
    });

    const artistStr = track.artists?.length ? ` by ${track.artists.join(", ")}` : "";
    return `Added **${track.name}**${artistStr} to **${destination}** on Spotify.`;
  }

  if (parsed.adapter === "google-docs" && parsed.intent === "researchArticle") {
    const draft = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Research "${parsed.topic}" on the live web`,
      type: "web_search",
      onStatus,
      run: async () => {
        const article = await buildArticleDraftFromWebSearch(parsed.topic);
        return { success: true, ...article };
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Open a fresh Google Doc",
      type: "navigate",
      onStatus,
      run: async () => {
        const result = await executeAgentAction({
          type: "navigate",
          url: "https://docs.new",
          description: "Open a fresh Google Doc",
        });
        if (!result?.error) {
          await waitForTabReady(8000);
          await new Promise((resolve) => setTimeout(resolve, 1800));
        }
        return result;
      },
    });

    if (shouldStop()) throw new Error("Stopped.");

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Write the article into the Google Doc body`,
      type: "googleDocsWriteArticle",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "googleDocsWriteArticle",
        title: draft.title,
        body: draft.body,
      }),
    });

    return `Drafted an article about **${parsed.topic}** in a Google Doc.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "search") {
    if (siteContext?.site !== "gmail") {
      await runPopupAdapterStep({
        thinkingBlock,
        history,
        description: "Open Gmail",
        type: "navigate",
        onStatus,
        run: async () => {
          const result = await executeAgentAction({
            type: "navigate",
            url: "https://mail.google.com/mail/u/0/#inbox",
            description: "Open Gmail",
          });
          if (!result?.error) {
            await waitForTabReady(8000);
            await new Promise((resolve) => setTimeout(resolve, 1800));
          }
          return result;
        },
      });
    }

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Search Gmail for "${parsed.query}"`,
      type: "gmailSearch",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "gmailSearch",
        query: parsed.query,
      }),
    });

    return `Searched Gmail for **${parsed.query}**.`;
  }

  if (parsed.adapter === "gmail" && (parsed.intent === "draftEmail" || parsed.intent === "sendEmail")) {
    const composeUrl = buildGmailComposeUrl({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
    });

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Open Gmail compose for ${parsed.to}`,
      type: "navigate",
      onStatus,
      run: async () => {
        const result = await executeAgentAction({
          type: "navigate",
          url: composeUrl,
          description: `Open Gmail compose for ${parsed.to}`,
        });
        if (!result?.error) {
          await waitForTabReady(8000);
          await new Promise((resolve) => setTimeout(resolve, 1800));
        }
        return result;
      },
    });

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Verify Gmail compose fields",
      type: "gmailFillCompose",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "gmailFillCompose",
        to: parsed.to,
        subject: parsed.subject || "",
        body: parsed.body,
      }),
    });

    if (parsed.intent === "sendEmail") {
      if (shouldStop()) throw new Error("Stopped.");
      await runPopupAdapterStep({
        thinkingBlock,
        history,
        description: "Send the Gmail message",
        type: "gmailSendOpenCompose",
        onStatus,
        run: () => executeSiteAdapterAction({
          type: "gmailSendOpenCompose",
        }),
      });
      return `Sent the email to **${parsed.to}**.`;
    }

    return `Drafted an email to **${parsed.to}** in Gmail.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "replyCurrentThread") {
    if (siteContext?.site !== "gmail") {
      return "Open the Gmail thread you want first, then ask me to reply and I’ll use the Gmail adapter.";
    }

    await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: parsed.send ? "Reply in the current Gmail thread and send" : "Draft a reply in the current Gmail thread",
      type: "gmailReplyToCurrentThread",
      onStatus,
      run: () => executeSiteAdapterAction({
        type: "gmailReplyToCurrentThread",
        body: parsed.body,
        send: !!parsed.send,
      }),
    });

    return parsed.send
      ? "Replied to the current Gmail thread."
      : "Drafted a reply in the current Gmail thread.";
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "search") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Search Google Drive for "${parsed.query}"`,
      type: "googleDriveSearch",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-search", {
        query: parsed.query,
        folderOnly: !!parsed.folderOnly,
      }),
    });

    const results = Array.isArray(result?.results) ? result.results : [];
    if (!results.length) {
      return `I searched Google Drive for **${parsed.query}** but didn’t find any matching ${parsed.folderOnly ? "folders" : "files"}.`;
    }

    const summary = results.slice(0, 3).map((item) => `- ${item.name} (${item.kind})`).join("\n");
    return `I found these matches in Google Drive for **${parsed.query}**:\n${summary}`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "organize") {
    const filesResult = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Read your Google Drive files",
      type: "googleDriveListFiles",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-list-files", { pageSize: 250 }),
    });

    const files = Array.isArray(filesResult?.files) ? filesResult.files : [];
    if (!files.length) {
      return "I couldn't see any Google Drive files to organize. Reconnect Drive with the latest permissions and try again.";
    }

    const planDraft = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Plan folders and file moves with AI",
      type: "googleDriveOrganizePlan",
      onStatus,
      run: async () => {
        const plan = await buildDriveOrganizationPlan(files);
        return { success: true, ...plan };
      },
    });

    const plan = validateDriveOrganizationPlan(files, planDraft);
    if (!plan.moves.length) {
      return `I scanned **${files.length}** Google Drive files, but there was nothing clear to reorganize.`;
    }

    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: "Create folders and move files in Google Drive",
      type: "googleDriveOrganizeApply",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-organize-apply", { plan }),
    });

    return `Organized your Google Drive: scanned **${files.length}** files, created **${result?.createdFolderCount || 0}** folders, and moved **${result?.movedCount || 0}** files.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createFolder") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Create the Google Drive folder "${parsed.folderName}"`,
      type: "googleDriveCreateFolder",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-create-folder", {
        folderName: parsed.folderName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Drive folder **${result?.name || parsed.folderName}**.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createDoc") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Create the Google Doc "${parsed.docName}" in Drive`,
      type: "googleDriveCreateDoc",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-create-doc", {
        docName: parsed.docName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Doc **${result?.name || parsed.docName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "rename") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Rename "${parsed.currentName}" to "${parsed.newName}" in Drive`,
      type: "googleDriveRename",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-rename", {
        currentName: parsed.currentName,
        newName: parsed.newName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Renamed **${result?.oldName || parsed.currentName}** to **${result?.name || parsed.newName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "move") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Move "${parsed.itemName}" to "${parsed.destinationFolderName}" in Drive`,
      type: "googleDriveMove",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-move", {
        itemName: parsed.itemName,
        destinationFolderName: parsed.destinationFolderName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Moved **${result?.name || parsed.itemName}** to **${result?.destinationFolderName || parsed.destinationFolderName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "delete") {
    const result = await runPopupAdapterStep({
      thinkingBlock,
      history,
      description: `Delete "${parsed.itemName}" from Drive`,
      type: "googleDriveDelete",
      onStatus,
      run: () => callGoogleDriveFunction("google-drive-delete", {
        itemName: parsed.itemName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Deleted **${result?.name || parsed.itemName}** from Drive.`;
  }

  return null;
}

// Zero-LLM fast paths for simple deterministic tasks
function tryFastPath(task, history) {
  if (history.length > 0) return null; // only on first step
  const t = task.toLowerCase().trim();

  // "go to / open <url or site>"
  const gotoMatch = t.match(/^(?:go to|open|navigate to|visit)\s+(?:https?:\/\/)?([a-z0-9.\-]+\.[a-z]{2,}(?:\/\S*)?)/i);
  if (gotoMatch) {
    const url = gotoMatch[1].startsWith("http") ? gotoMatch[1] : "https://" + gotoMatch[1];
    return [{ type: "navigate", url, description: `Navigate to ${url}` }];
  }

  // "search <query> on youtube"
  const ytMatch = t.match(/search\s+(.+?)\s+on\s+youtube/i) || t.match(/youtube\s+search\s+(.+)/i);
  if (ytMatch) {
    const q = encodeURIComponent(ytMatch[1].trim());
    return [{ type: "navigate", url: `https://www.youtube.com/results?search_query=${q}`, description: `Search YouTube for "${ytMatch[1]}"` }];
  }

  // "search <query> on google" / "google <query>"
  const gMatch = t.match(/(?:search\s+(.+?)\s+on\s+google|^google\s+(.+))/i);
  if (gMatch) {
    const q = encodeURIComponent((gMatch[1] || gMatch[2]).trim());
    return [{ type: "navigate", url: `https://www.google.com/search?q=${q}`, description: `Google search` }];
  }

  // "scroll down/up"
  if (/^scroll\s+(down|up)/.test(t)) {
    const dir = t.includes("up") ? "up" : "down";
    return [{ type: "scroll", direction: dir, amount: 600, description: `Scroll ${dir}` }];
  }

  return null;
}

async function callAgentStep(task, pageInfo, history, chatHistory) {
  const historyText = history.length > 0
    ? history.map((h, i) => {
        const status = h.result?.success ? "✓ OK" : `✗ ${h.result?.error || "FAILED"}`;
        const snap = h.snapshot ? ` → page after: "${h.snapshot.title}" | ${h.snapshot.url}` : "";
        const readVal = h.type === "read" && h.result?.text ? ` → content: "${h.result.text.slice(0, 200)}"` : "";
        return `Step ${i + 1}: [${h.type}] ${h.description} → ${status}${snap}${readVal}`;
      }).join("\n")
    : "None yet.";

  const elementsText = pageInfo.interactiveEls?.length > 0
    ? pageInfo.interactiveEls.map(e => `  [${e.tag}]${e.selector ? ` sel="${e.selector}"` : ""} ${e.text}${e.href ? ` (href: ${e.href})` : ""}${e.type ? ` (type: ${e.type})` : ""}`).join("\n")
    : "  (none detected)";

  const selectsText = pageInfo.selectEls?.length > 0
    ? "\n\nDROPDOWNS (use selectOption):\n" + pageInfo.selectEls.map(s =>
        `  [select] ${s.label || "unnamed"} — current: "${s.current}" — options: ${s.options.join(", ")}`
      ).join("\n")
    : "";

  // Include recent chat for context (names, preferences, prior info)
  const chatCtx = chatHistory && chatHistory.length > 0
    ? "\n\nCONVERSATION CONTEXT (use this to extract names, emails, details the user mentioned):\n" +
      chatHistory.slice(-10).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")
    : "";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const currentUrl = pageInfo.url || "";

  // Dynamic platform cheat-sheet — only inject the relevant section
  function getPlatformGuide(url) {
    if (/mail\.google\.com/.test(url)) return `
── GMAIL (you are here) ──
Compose new email:
  1. navigate → https://mail.google.com/mail/u/0/#compose
  2. wait 1200
  3. [{"type":"type","selector":"[name='to']","targetText":"To","text":"RECIPIENT"},{"type":"pressKey","key":"Tab"},{"type":"type","selector":"[name='subjectbox']","text":"SUBJECT"}]
  4. pressKey Tab
  5. type body → selector="[role='textbox'][aria-label*='Message']" or targetText="Message Body"
  6. click Send → selector="[data-tooltip*='Send']" or [aria-label*="Send"] or targetText="Send"
Reply: click Reply (.amn or targetText="Reply") → wait 600 → type in [role='textbox'] → click Send
Search: click [aria-label="Search mail"] → type query → pressKey Enter`;

    if (/youtube\.com/.test(url)) return `
── YOUTUBE (you are here) ──
Search & play: navigate → https://www.youtube.com/results?search_query=QUERY (encode spaces as +)
  → wait 800 → click selector="ytd-video-renderer #video-title" or targetText=video title
Player controls:
  Play/Pause: selector=".ytp-play-button"
  Fullscreen: selector=".ytp-fullscreen-button"
  Mute: selector=".ytp-mute-button"
  Speed: click .ytp-settings-button → targetText="Playback speed"`;

    if (/netflix\.com/.test(url)) return `
── NETFLIX (you are here) ──
Search: navigate → https://www.netflix.com/search?q=QUERY → wait 1200
  → click first result card (targetText=show title) → wait 800 → click Play selector="[data-uia*='play']" or targetText="Play"
Season: selectOption selector="select[id*='season']" value="Season 2"
Episode: click episode card by targetText`;

    if (/x\.com|twitter\.com/.test(url)) return `
── TWITTER/X (you are here) ──
Post tweet: navigate → https://x.com/compose/tweet → wait 1200
  → type selector="[data-testid='tweetTextarea_0']" or selector="[role='textbox']"
  → wait 300
  → click selector="[data-testid='tweetButtonInline']" or selector="[data-testid='tweetButton']"
If the post button stays disabled, re-focus the actual textbox and type there. Do not use intent/tweet URLs.
Search: navigate → https://x.com/search?q=QUERY&src=typed_query
Like: click [data-testid="like"] on the tweet row`;

    if (/linkedin\.com/.test(url)) return `
── LINKEDIN (you are here) ──
Search people: navigate → https://www.linkedin.com/search/results/people/?keywords=NAME
Connect: click targetText="Connect" → click targetText="Send without a note"
Message: navigate to profile → click targetText="Message" → type [aria-label*="Write a message"] → pressKey Enter`;

    if (/amazon\./.test(url)) return `
── AMAZON (you are here) ──
Search: type selector="#twotabsearchtextbox" → pressKey Enter
  → click product title → click selector="#add-to-cart-button"
Buy Now: selector="#buy-now-button"`;

    if (/web\.whatsapp\.com/.test(url)) return `
── WHATSAPP WEB (you are here) ──
Send by contact name:
  1. click selector="[data-testid='chat-list-search']" or selector="[data-tab='3']"
  2. wait 400
  3. type the contact name
  4. wait 800  (wait for results to load)
  5. click first matching contact row: selector="[data-testid='cell-frame-title']" or targetText=CONTACT_NAME
  6. wait 400
  7. type message in selector="[data-testid='conversation-compose-box-input']" or [aria-label*="Type a message"] or [data-tab='10']
  8. pressKey Enter
Send by phone: navigate → https://wa.me/91NUMBER?text=MESSAGE then click "Continue to Chat" button`;

    if (/open\.spotify\.com/.test(url)) return `
── SPOTIFY (you are here) ──
Search & play: navigate → https://open.spotify.com/search/QUERY → wait 1000
  → click first song row selector="[data-testid='tracklist-row']" → click play button inside it`;

    if (/github\.com/.test(url)) return `
── GITHUB (you are here) ──
Search repos: navigate → https://github.com/search?q=QUERY&type=repositories
Open VS Code editor: pressKey "." on any repo page
View file: click file name in file tree`;

    if (/google\.com\/search|google\.co/.test(url)) return `
── GOOGLE SEARCH (you are here) ──
New search: type selector="[name='q']" → pressKey Enter
Direct: navigate → https://www.google.com/search?q=QUERY`;

    // Generic guide for unknown sites
    return `
── GENERAL SITE ──
Prefer navigating to URLs over clicking search bars.
Use sel= selectors from INTERACTIVE ELEMENTS when available.
For forms: click field → type → Tab to next field → submit.`;
  }

  const agentSystemPrompt = `You are Braino Browser Agent. Automate a real Chrome browser by returning JSON actions.
Respond ONLY with a JSON object or array. Zero prose. Zero explanation. Zero markdown fences.

MINDSET: You are a browser robot. Every task is solved by executing and verifying actions.
- After every navigate or click, check STEPS TAKEN SO FAR to see what page you landed on.
- If the "page after" in history doesn't match your intent → you are on the wrong page. Recover.
- Never assume a click worked. The history shows you the page title and URL after each action — read it.
- If STEPS TAKEN SO FAR is empty → you have done NOTHING yet → start executing immediately.
- Pure questions with no browser actions → {"type":"answer","message":"..."}

ACTIONS:
{"type":"navigate","url":"https://...","description":"..."}
{"type":"click","selector":"css","targetText":"fallback text","description":"..."}
{"type":"type","selector":"css","targetText":"fallback","text":"...","description":"..."}
{"type":"pressKey","key":"Enter","description":"..."}
{"type":"selectOption","selector":"css","value":"option text","description":"..."}
{"type":"read","selector":"css","targetText":"fallback","description":"Read element to verify state"}
{"type":"scroll","direction":"down","amount":400,"description":"..."}
{"type":"wait","ms":1500,"description":"..."}
{"type":"downloadImage","selector":"css","targetText":"fallback alt text","format":"png","filename":"image.png","description":"Download image as PNG/JPEG/WebP"}
{"type":"done","message":"what was accomplished"}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}  ← ONLY when genuinely blocked

SELECTOR PRIORITY:
1. sel= value from INTERACTIVE ELEMENTS
2. [aria-label="..."] or [role="button"][aria-label="..."]
3. [data-testid="..."]
4. [placeholder="..."] or [name="..."]
5. targetText (fuzzy visible text match — last resort)

BATCHING: Array of up to 5 actions for certain sequences. NEVER batch navigate or read.
Example: [{"type":"type",...},{"type":"pressKey","key":"Tab"},{"type":"type",...},{"type":"pressKey","key":"Enter"}]

═══ VERIFY BEFORE PROCEED ═══════════════════════════════════
After EVERY navigate or click, STEPS TAKEN SO FAR shows "page after: TITLE | URL".
Before your next action, check that title/URL matches where you intended to be.

RULE: If the page after a click is not what you expected → do NOT continue the original plan.
Assess what happened and recover: navigate back, try a different approach, or re-read the page.

FOR LISTS (seasons, episodes, search results, dropdown menus):
  ALWAYS read the list before picking from it. Never guess position or index.
  Step 1: use {"type":"read"} to read the list element and see what options are available.
  Step 2: pick the exact text you saw in the read result, then click/selectOption.
  Example for Netflix seasons: read selector="select[id*='season']" → confirm "Season 4" exists → selectOption.
  Example for episodes: scroll down → read episode titles → click exact title you see.

FOR MEDIA SITES (Netflix, YouTube, Spotify):
  After clicking anything, check if unexpected video/audio playback started.
  If you meant to click a title but a video started playing → you clicked the wrong thing.
  Go back or navigate directly to the correct URL.

CHECKPOINT PLANNING for complex tasks (don't just run a linear script):
  navigate → verify landed on right page
  → find/read target element → confirm it's visible
  → interact → verify interaction result
  → proceed to next step
  Never batch past a verification checkpoint.
═════════════════════════════════════════════════════════════

RULES:
1. STEPS TAKEN SO FAR is ground truth. Read "page after" to know where you are.
2. Never return done unless steps confirm ALL required actions succeeded and page state matches.
3. Never repeat a failed selector — switch strategy immediately.
4. After navigate → the next step should verify the page before clicking anything.
5. Forms: type → Tab → next field → submit.
6. TODAY: ${today}. Calculate all relative dates yourself.
7. Failed click → scroll to find element, then try different selector.
8. ALWAYS check URL SHORTCUTS below first — if a shortcut exists, use it as step 1.
9. WRONG SITE: If the current page is unrelated to the task, your FIRST action MUST be navigate to the correct site. Never say "I can't do this here".

URL SHORTCUTS — single navigate, zero form interaction needed:
── EMAIL / MESSAGING ──
Gmail compose:    https://mail.google.com/mail/?view=cm&to=TO&su=SUBJECT&body=BODY  (encode spaces as %20)
WhatsApp by phone#:  https://wa.me/COUNTRYCODENUMBER?text=MESSAGE  (India: 91XXXXXXXXXX, encode spaces as %20)
WhatsApp by name:    navigate → https://web.whatsapp.com → search contact name → click → type → Enter
Twitter/X post:   navigate → https://x.com/compose/tweet  (type into the composer)

── MAPS / NAVIGATION ──
Google Maps search:     https://www.google.com/maps/search/QUERY+with+spaces+as+plus
Google Maps directions: https://www.google.com/maps/dir/ORIGIN/DESTINATION  (encode spaces as +)

── FLIGHTS (IATA codes: BOM=Mumbai DEL=Delhi BLR=Bangalore MAA=Chennai PNQ=Pune HYD=Hyderabad CCU=Kolkata DED=Dehradun GOI=Goa JAI=Jaipur AMD=Ahmedabad COK=Kochi IXC=Chandigarh) ──
MakeMyTrip one-way: https://www.makemytrip.com/flight/search?itinerary=FROM-TO-DD/MM/YYYY&tripType=O&paxType=A-1_C-0_I-0&cabinClass=E
MakeMyTrip return:  itinerary=FROM-TO-DD/MM/YYYY,TO-FROM-DD/MM/YYYY&tripType=R&paxType=A-1_C-0_I-0&cabinClass=E
Skyscanner:         https://www.skyscanner.co.in/transport/flights/FROM/TO/YYMMDD/  (date = last 2 digits of year + MM + DD)
Example PNQ→DEL 19 Apr 2026: MakeMyTrip itinerary=PNQ-DEL-19/04/2026 · Skyscanner /PNQ/DEL/260419/

── HOTELS ──
Booking.com: https://www.booking.com/searchresults.html?ss=CITY&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&no_rooms=1&group_adults=2
MakeMyTrip hotels: https://www.makemytrip.com/hotels/hotel-listing/?checkin=MM/DD/YYYY&checkout=MM/DD/YYYY&city=CITY_NAME&roomStayQualifier=2e0e

── SHOPPING ──
Amazon India:  https://www.amazon.in/s?k=QUERY+with+plus
Flipkart:      https://www.flipkart.com/search?q=QUERY
Myntra:        https://www.myntra.com/search?q=QUERY
Meesho:        https://www.meesho.com/search?q=QUERY

── FOOD / DELIVERY ──
Zomato:  https://www.zomato.com/CITY/restaurants?q=QUERY  (city lowercase: mumbai, delhi, bangalore, pune, hyderabad)
Swiggy:  https://www.swiggy.com/search?query=QUERY

── JOBS ──
LinkedIn jobs:  https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY
Naukri:         https://www.naukri.com/ROLE-jobs-in-CITY  (lowercase hyphenated e.g. software-engineer-jobs-in-bangalore)
Indeed:         https://in.indeed.com/jobs?q=ROLE&l=CITY

── PRODUCTIVITY ──
Google Calendar new event: https://calendar.google.com/calendar/r/eventedit?text=EVENT+NAME&dates=YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS&location=PLACE&details=NOTES
New Google Doc:   https://docs.new
New Google Sheet: https://sheets.new
New Google Slide: https://slides.new

── MEDIA ──
YouTube search:       https://www.youtube.com/results?search_query=QUERY
Spotify search:       https://open.spotify.com/search/QUERY
YouTube Music search: https://music.youtube.com/search?q=QUERY
Netflix search:       https://www.netflix.com/search?q=QUERY

── OTHER ──
Google search:  https://www.google.com/search?q=QUERY
Wikipedia:      https://en.wikipedia.org/wiki/Special:Search?search=QUERY
Paytm:          https://paytm.com/search?q=QUERY
IRCTC trains:   https://www.irctc.co.in/nget/train-search  (no URL params — use form)

${getPlatformGuide(currentUrl)}

ANSWER FORMATTING (for {"type":"answer"} responses):
- Always use markdown in the message field — never return a flat comma-separated list
- Use ## headers for categories/genres, - bullet points for items
- Keep each bullet concise: "**Title** — brief description"
- Sort/group logically (by genre, category, type, etc.)

FAILURE RECOVERY:
- Wrong page → navigate to the correct URL immediately, no explanation
- Element not found → aria-label, data-testid, placeholder, then targetText
- List selection uncertain → use read action first to see all options
- Form not responding → click field first, then type`;

  const pageStatus = pageInfo.url
    ? `URL: ${pageInfo.url}\nTitle: ${pageInfo.title}`
    : "Not on a specific page yet — navigate first.";

  const userMessage = `TASK: ${task}
${chatCtx}

CURRENT PAGE:
${pageStatus}

PAGE TEXT (excerpt):
${pageInfo.bodyText?.substring(0, 4000) || "(empty — navigate first)"}

INTERACTIVE ELEMENTS:
${elementsText}${selectsText}

STEPS TAKEN SO FAR:
${historyText}

What actions should be taken next? Return a single JSON object, OR a JSON array of up to 3 objects for sequences that are certain to succeed in order (e.g. [type, pressKey] or [click, type]). Only batch when all steps are highly predictable. NEVER include navigate in a batch.`;

  const response = await fetch(`${API_BASE}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notes: agentSystemPrompt,
      message: userMessage,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }

  const data = await response.json();
  const reply = (data.reply || "").trim();

  // Parse JSON from reply — strip markdown code fences if present
  const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/) || reply.match(/([\[{][\s\S]*[\]}])/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : reply.trim();
  const parsed = JSON.parse(jsonStr);
  // Normalize to always be an array
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ===== ELEVENLABS TTS =====
const ELEVENLABS_API_KEY = "sk_2ee3bb5258f10b54aba4d71a7ff1640d98fc322c3e2410cd";
const ELEVENLABS_VOICE_ID = "2ajXGJNYBR0iNHpS4VZb";
let currentAudio = null;
let currentAudioDone = null;
let currentUtterance = null;

function stripMarkdownForTTS(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/`(.+?)`/g, "$1")          // `code`
    .replace(/#{1,6}\s+/g, "")          // ## headings
    .replace(/^\s*[\*\-\+]\s+/gm, "")  // bullet points
    .replace(/^\s*\d+\.\s+/gm, "")     // numbered lists
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")// [links](url)
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")// _italic_ / __bold__
    .replace(/\n{2,}/g, ". ")          // paragraph breaks → pause
    .replace(/\n/g, " ")               // single newlines
    .replace(/\s{2,}/g, " ")           // collapse spaces
    .trim();
}

let voiceWordIntervalId = null;
let isVoiceSpeaking = false;

function finishCurrentTTS() {
  if (!currentAudioDone) return;
  const done = currentAudioDone;
  currentAudioDone = null;
  done();
}

function clearCurrentUtterance() {
  if (!currentUtterance) return;
  try {
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
  } catch {}
  currentUtterance = null;
}

function stopCurrentTTS() {
  if (currentAudio) {
    try { currentAudio.onended = null; } catch {}
    try { currentAudio.onerror = null; } catch {}
    try { currentAudio.pause(); } catch {}
    try {
      currentAudio.removeAttribute("src");
      currentAudio.load();
    } catch {}
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  clearCurrentUtterance();
  if (voiceWordIntervalId) { clearInterval(voiceWordIntervalId); voiceWordIntervalId = null; }
  isVoiceSpeaking = false;
  finishCurrentTTS();
}

function renderVoiceCaptionWords(text) {
  if (!voiceAgentText) return [];
  setCaption(text);
  return Array.from(voiceAgentText.querySelectorAll(".word"));
}

async function speakTextWithBrowserVoice(text, onWordUpdate) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  isVoiceSpeaking = true;

  let wordSpans = [];
  if (onWordUpdate) {
    onWordUpdate(text, -1);
    wordSpans = Array.from(voiceAgentText ? voiceAgentText.querySelectorAll(".word") : []);
  } else {
    wordSpans = renderVoiceCaptionWords(text);
  }

  const estimatedDurationMs = Math.max(900, text.split(/\s+/).filter(Boolean).length * 320);
  const startWordTimer = () => {
    if (!wordSpans.length) return;
    const msPerWord = Math.max(70, estimatedDurationMs / Math.max(wordSpans.length, 1));
    let i = 0;
    voiceWordIntervalId = setInterval(() => {
      if (i < wordSpans.length) {
        if (i > 0) {
          wordSpans[i - 1].classList.remove("current");
          wordSpans[i - 1].classList.add("said");
        }
        wordSpans[i].classList.add("current");
        wordSpans[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
        i++;
      } else {
        if (wordSpans.length > 0) {
          wordSpans[wordSpans.length - 1].classList.remove("current");
          wordSpans[wordSpans.length - 1].classList.add("said");
        }
        clearInterval(voiceWordIntervalId);
        voiceWordIntervalId = null;
      }
    }, msPerWord);
  };

  startWordTimer();

  await new Promise((resolve) => {
    currentAudioDone = resolve;
    utterance.onend = () => {
      clearCurrentUtterance();
      stopCurrentTTS();
    };
    utterance.onerror = () => {
      clearCurrentUtterance();
      stopCurrentTTS();
    };
    try { window.speechSynthesis.cancel(); } catch {}
    window.speechSynthesis.speak(utterance);
  });

  return true;
}

async function speakText(text, onWordUpdate) {
  if (!text) return;
  const clean = stripMarkdownForTTS(text);
  if (!clean) return;

  stopCurrentTTS();

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`, {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, model_id: "eleven_turbo_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn("ElevenLabs TTS unavailable, falling back to browser voice:", res.status, errorText);
      await speakTextWithBrowserVoice(clean, onWordUpdate);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);

    // Word-by-word reveal — wait for actual audio duration before starting timer
    if (onWordUpdate) {
      onWordUpdate(clean, -1); // render word spans first
      const wordSpans = voiceAgentText ? Array.from(voiceAgentText.querySelectorAll(".word")) : [];

      const startWordTimer = (durationMs) => {
        const msPerWord = Math.max(60, durationMs / Math.max(wordSpans.length, 1));
        let i = 0;
        voiceWordIntervalId = setInterval(() => {
          if (i < wordSpans.length) {
            if (i > 0) { wordSpans[i-1].classList.remove("current"); wordSpans[i-1].classList.add("said"); }
            wordSpans[i].classList.add("current");
            // Auto-scroll so current word is always visible
            wordSpans[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
            i++;
          } else {
            if (wordSpans.length > 0) { wordSpans[wordSpans.length-1].classList.remove("current"); wordSpans[wordSpans.length-1].classList.add("said"); }
            clearInterval(voiceWordIntervalId);
            voiceWordIntervalId = null;
          }
        }, msPerWord);
      };

      // Use real audio duration once metadata loads for accurate sync
      currentAudio.onloadedmetadata = () => {
        startWordTimer(currentAudio.duration * 1000 * 0.92); // 0.92 slight lead so last word clears before audio ends
      };
      // Fallback if metadata never fires
      setTimeout(() => {
        if (voiceWordIntervalId === null && wordSpans.length > 0 && wordSpans[0].classList.contains("word") && !wordSpans[0].classList.contains("said")) {
          startWordTimer(wordSpans.length * 300);
        }
      }, 600);
    }

    isVoiceSpeaking = true;
    await new Promise(resolve => {
      currentAudioDone = resolve;
      currentAudio.onended = () => { stopCurrentTTS(); };
      currentAudio.onerror = () => { stopCurrentTTS(); };
      currentAudio.play().catch(() => { stopCurrentTTS(); });
    });
    URL.revokeObjectURL(url);
  } catch (e) {
    stopCurrentTTS();
    console.warn("ElevenLabs TTS error, falling back to browser voice:", e);
    await speakTextWithBrowserVoice(clean, onWordUpdate);
  }
}

// ===== VOICE MODE =====
let voiceActive = false;
let voiceTabId = null;
let voiceMuted = false;
let headphoneMode = false;
let voiceUsingRealtime = false;
let realtimePeerConnection = null;
let realtimeDataChannel = null;
let realtimeMicStream = null;
let realtimeRemoteAudio = null;
let realtimeConnecting = false;
let realtimeSessionReady = false;
let realtimeAssistantTranscript = "";
let realtimeAssistantItemId = null;
let realtimeAudioStartAt = 0;
let realtimeUserTranscript = "";
let realtimeOutputPromise = Promise.resolve();
let realtimeLastResponseFinishedAt = 0;
let realtimeLastResponseStatus = "idle";
let realtimeContextFingerprint = "";
let realtimeSpeechBuffer = "";
let realtimeSpeechQueue = [];
let realtimeSpeechDraining = false;
let realtimeResponseWaiter = null;
let lastRealtimeStartupError = "";

const REALTIME_PAGE_CONTEXT_LIMIT = 12000;
const REALTIME_NOTES_CONTEXT_LIMIT = 6000;
const REALTIME_SELECTION_CONTEXT_LIMIT = 1600;

const voiceOverlay      = document.getElementById("voiceOverlay");
const voiceOrb          = document.getElementById("voiceOrb");
const voiceUserText     = document.getElementById("voiceUserText");
const voiceAgentText    = document.getElementById("voiceAgentText");
const voiceModeBtn      = document.getElementById("voiceModeBtn");
const voiceCloseBtn     = document.getElementById("voiceCloseBtn");
const voiceCapLabelTxt  = document.getElementById("voiceCapLabelTxt");
const voiceInterruptBtn = document.getElementById("voiceInterruptBtn");
const voiceStopTaskBtn  = document.getElementById("voiceStopTaskBtn");
const voiceMuteBtn      = document.getElementById("voiceMuteBtn");
const voiceCtxTitle     = document.getElementById("voiceCtxTitle");
const voiceCtxUrl       = document.getElementById("voiceCtxUrl");
const voiceCtxFavicon   = document.getElementById("voiceCtxFavicon");
const voiceCtxLiveTxt   = document.getElementById("voiceCtxLiveTxt");
const voiceTransportBadge = document.getElementById("voiceTransportBadge");
const voiceTransportError = document.getElementById("voiceTransportError");

const CAP_LABELS = { listening: "Braino · Listening", captured: "Braino · Got it", processing: "Braino · Thinking", speaking: "Braino · Speaking", idle: "Braino · Ready", acting: "Braino · Acting" };

function setOrbState(state) {
  if (voiceOrb) voiceOrb.className = `voice-orb ${state}`;
  if (voiceOrb?.parentElement) voiceOrb.parentElement.dataset.state = state;
  if (voiceCapLabelTxt) voiceCapLabelTxt.textContent = CAP_LABELS[state] || state;
  // Braino icon glow in headphone mode
  const brainoEl = document.getElementById("brainoIcon");
  if (brainoEl && headphoneMode) {
    const animMap = {
      listening:  "brainoGlowListen 1.4s ease-in-out infinite",
      captured:   "brainoGlowCaptured 0.5s ease-in-out infinite",
      speaking:   "brainoGlowSpeak 0.85s ease-in-out infinite",
      processing: "brainoGlowProcess 1.2s ease-in-out infinite",
      idle:       "brainoGlowIdle 3.8s ease-in-out infinite",
    };
    brainoEl.style.animation = animMap[state] || "brainoGlowIdle 3.8s ease-in-out infinite";
  }
}

function updateVoicePageCtx() {
  if (!currentPageContext) {
    if (voiceCtxTitle) voiceCtxTitle.textContent = "Current page";
    if (voiceCtxUrl) voiceCtxUrl.textContent = "—";
    if (voiceCtxFavicon) {
      voiceCtxFavicon.className = "voice-ctx-favicon";
      voiceCtxFavicon.textContent = "BR";
    }
    return;
  }

  if (voiceCtxTitle) voiceCtxTitle.textContent = currentPageContext.title || "Current page";
  if (voiceCtxUrl) voiceCtxUrl.textContent = currentPageContext.url ? new URL(currentPageContext.url).hostname : "—";
  renderContextFavicon(voiceCtxFavicon, currentPageContext, "voice-ctx-favicon");
}

function setCaption(text) {
  if (!voiceAgentText) return;
  voiceAgentText.innerHTML = "";
  if (!text) return;
  const tokens = text.split(/(\s+)/);
  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) { voiceAgentText.appendChild(document.createTextNode(tok)); return; }
    const s = document.createElement("span");
    s.className = "word";
    s.textContent = tok;
    voiceAgentText.appendChild(s);
  });
}

function setSubtitles(user, agent) {
  if (voiceUserText) voiceUserText.textContent = user || "";
  if (agent !== undefined) setCaption(agent);
}

function setVoiceContextStatus(text, { tone, detail = "" } = {}) {
  const statusText = text || "live";
  const resolvedTone = tone || (
    statusText === "realtime" ? "realtime" :
    statusText === "legacy" ? "legacy" :
    statusText === "connecting" ? "pending" :
    statusText === "error" ? "error" :
    "neutral"
  );

  if (voiceCtxLiveTxt) voiceCtxLiveTxt.textContent = statusText;
  if (voiceTransportBadge) {
    voiceTransportBadge.textContent = statusText;
    voiceTransportBadge.dataset.state = resolvedTone;
  }
  if (voiceTransportError) {
    voiceTransportError.textContent = detail;
    voiceTransportError.classList.toggle("hidden", !detail);
  }
}

function isRealtimeVoiceSessionRunning() {
  return realtimeConnecting || !!realtimePeerConnection;
}

function isRealtimeVoiceMode() {
  return voiceUsingRealtime && isRealtimeVoiceSessionRunning();
}

function setRealtimeMicEnabled(enabled) {
  realtimeMicStream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

function truncateRealtimeContext(text, maxChars) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}… [truncated]`;
}

function buildRealtimeVoiceInstructions() {
  const lines = [
    "You are Braino's live voice layer inside a browser extension.",
    "These turns are already routed as conversational voice turns unless the app later feeds you a status update to relay.",
    "Speak clearly, briefly, and naturally.",
    "Prefer short spoken answers unless the user explicitly asks for detail.",
    "Never say you cannot access the page when current page context is provided below.",
    "If the app asks you to relay an update, preserve the meaning and do not add new facts.",
    "If interrupted, stop immediately and wait for the user.",
    `Current Braino mode: ${MODE_LABELS[currentMode] || currentMode}.`,
  ];

  if (currentMode === "page" && currentPageContext?.text) {
    lines.push("Prioritize the current page context in your answer.");
  } else if (currentMode === "general") {
    lines.push("Treat page context as optional background unless the user asks about the page.");
  }

  if (currentPageContext) {
    lines.push(`Current page title: ${currentPageContext.title || "Untitled"}`);
    lines.push(`Current page URL: ${currentPageContext.url || "Unknown"}`);
    const pageText = truncateRealtimeContext(currentPageContext.text, REALTIME_PAGE_CONTEXT_LIMIT);
    if (pageText) lines.push(`Current page text:\n${pageText}`);
  }

  if (currentSelection?.text) {
    const selectedText = truncateRealtimeContext(currentSelection.text, REALTIME_SELECTION_CONTEXT_LIMIT);
    if (selectedText) {
      lines.push(`Currently selected text:\n${selectedText}`);
    }
  }

  if (hasExistingNotes()) {
    const notesCtx = buildNotesContextForAI(notesMarkdown);
    const notesText = truncateRealtimeContext(notesCtx.sanitizedNotes, REALTIME_NOTES_CONTEXT_LIMIT);
    if (notesText) lines.push(`Current saved notes excerpt:\n${notesText}`);
  }

  return lines.join("\n\n");
}

function syncRealtimeVoiceSession({ force = false } = {}) {
  if (!isRealtimeVoiceMode() || !realtimeSessionReady) return false;

  const instructions = buildRealtimeVoiceInstructions();
  const fingerprint = `${currentMode}::${instructions}`;
  if (!force && fingerprint === realtimeContextFingerprint) return true;
  realtimeContextFingerprint = fingerprint;

  return sendRealtimeEvent({
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: ["text"],
      reasoning: {
        effort: "low",
      },
      audio: {
        input: {
          transcription: {
            model: "gpt-4o-transcribe",
          },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "high",
            create_response: false,
            interrupt_response: true,
          },
        },
      },
    },
  });
}

function clearRealtimeSpeechQueue() {
  realtimeSpeechBuffer = "";
  realtimeSpeechQueue = [];
}

function queueRealtimeSpeechChunk(text) {
  const chunk = stripMarkdownForTTS(text);
  if (!chunk) return;
  realtimeSpeechQueue.push(chunk);
  void drainRealtimeSpeechQueue();
}

function flushRealtimeSpeechBuffer({ final = false } = {}) {
  let buffer = realtimeSpeechBuffer;
  if (!buffer) return;

  const chunks = [];
  const sentencePattern = /^([\s\S]*?[.!?](?=\s|$))/;
  let match = buffer.match(sentencePattern);
  while (match) {
    const chunk = match[1].trim();
    if (chunk) chunks.push(chunk);
    buffer = buffer.slice(match[1].length).trimStart();
    match = buffer.match(sentencePattern);
  }

  if (!final && buffer.length > 220) {
    const preferredBreaks = [
      buffer.lastIndexOf(". ", 220),
      buffer.lastIndexOf("! ", 220),
      buffer.lastIndexOf("? ", 220),
      buffer.lastIndexOf("; ", 220),
      buffer.lastIndexOf(", ", 220),
      buffer.lastIndexOf(": ", 220),
      buffer.lastIndexOf(" ", 220),
    ].filter((idx) => idx > 40);
    const splitIndex = preferredBreaks.length ? Math.max(...preferredBreaks) + 1 : -1;
    if (splitIndex > 0) {
      const chunk = buffer.slice(0, splitIndex).trim();
      if (chunk) chunks.push(chunk);
      buffer = buffer.slice(splitIndex).trimStart();
    }
  }

  if (final && buffer.trim()) {
    chunks.push(buffer.trim());
    buffer = "";
  }

  realtimeSpeechBuffer = buffer;
  chunks.forEach(queueRealtimeSpeechChunk);
}

async function drainRealtimeSpeechQueue() {
  if (realtimeSpeechDraining) return;
  realtimeSpeechDraining = true;

  try {
    while (voiceActive && isRealtimeVoiceMode() && realtimeSpeechQueue.length > 0) {
      const nextChunk = realtimeSpeechQueue.shift();
      if (!nextChunk) continue;
      setOrbState("speaking");
      await speakText(nextChunk);
    }
  } finally {
    realtimeSpeechDraining = false;
    if (voiceActive && isRealtimeVoiceMode() && realtimeSpeechQueue.length > 0) {
      void drainRealtimeSpeechQueue();
    }
  }
}

function waitForRealtimeSpeechIdle(timeoutMs = 20000) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (!realtimeSpeechDraining && !isVoiceSpeaking && realtimeSpeechQueue.length === 0) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }
      setTimeout(check, 60);
    };
    check();
  });
}

function createRealtimeResponseWaiter() {
  if (realtimeResponseWaiter) {
    realtimeResponseWaiter.resolve({
      status: "cancelled",
      text: realtimeAssistantTranscript.trim(),
      errorMessage: "",
    });
  }

  return new Promise((resolve) => {
    realtimeResponseWaiter = { resolve };
  });
}

function resolveRealtimeResponse(payload) {
  if (!realtimeResponseWaiter) return;
  const waiter = realtimeResponseWaiter;
  realtimeResponseWaiter = null;
  waiter.resolve(payload);
}

async function finishRealtimeResponse(status, { errorMessage = "", fallbackText = "" } = {}) {
  if (status === "done") {
    if (!realtimeAssistantTranscript && fallbackText) {
      realtimeAssistantTranscript = fallbackText;
      setCaption(fallbackText);
      realtimeSpeechBuffer = fallbackText;
    }
    flushRealtimeSpeechBuffer({ final: true });
    await waitForRealtimeSpeechIdle();
  } else {
    clearRealtimeSpeechQueue();
  }

  resolveRealtimeResponse({
    status,
    text: realtimeAssistantTranscript.trim() || fallbackText || "",
    errorMessage,
  });
}

function extractRealtimeResponseText(response) {
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

function cleanupRealtimeVoiceSession({ keepCaption = false } = {}) {
  voiceUsingRealtime = false;
  realtimeSessionReady = false;
  realtimeConnecting = false;
  realtimeAssistantTranscript = "";
  realtimeAssistantItemId = null;
  realtimeAudioStartAt = 0;
  realtimeUserTranscript = "";
  realtimeOutputPromise = Promise.resolve();
  realtimeLastResponseFinishedAt = 0;
  realtimeLastResponseStatus = "idle";
  realtimeContextFingerprint = "";
  lastRealtimeStartupError = "";
  clearRealtimeSpeechQueue();
  resolveRealtimeResponse({ status: "cancelled", text: "", errorMessage: "" });
  stopCurrentTTS();

  if (realtimeDataChannel) {
    try { realtimeDataChannel.close(); } catch {}
    realtimeDataChannel = null;
  }
  if (realtimePeerConnection) {
    try { realtimePeerConnection.close(); } catch {}
    realtimePeerConnection = null;
  }
  if (realtimeMicStream) {
    realtimeMicStream.getTracks().forEach((track) => track.stop());
    realtimeMicStream = null;
  }
  if (realtimeRemoteAudio) {
    try { realtimeRemoteAudio.pause(); } catch {}
    realtimeRemoteAudio.srcObject = null;
    realtimeRemoteAudio.remove();
    realtimeRemoteAudio = null;
  }

  if (!keepCaption) {
    if (voiceUserText) voiceUserText.textContent = "";
    setCaption("");
  }
  setVoiceContextStatus("reading");
}

function sendRealtimeEvent(event) {
  if (!realtimeDataChannel || realtimeDataChannel.readyState !== "open") return false;
  const payload = { ...event };
  if (!payload.event_id) {
    payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  realtimeDataChannel.send(JSON.stringify(payload));
  return true;
}

function requestVoicePageContext() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getPageContent" }, (res) => {
      if (chrome.runtime.lastError || res?.error || !res?.text) {
        resolve(currentPageContext);
        return;
      }
      applyPageContext(res);
      resolve(currentPageContext);
    });
  });
}

async function requestRealtimeAssistantReply(text, { relayMode = false } = {}) {
  if (!text || !isRealtimeVoiceMode() || !realtimeSessionReady) {
    return { status: "error", text: "", errorMessage: "Realtime voice is not ready." };
  }

  interruptRealtimeSpeech({ clearCaption: false });
  realtimeAssistantTranscript = "";
  realtimeSpeechBuffer = "";
  realtimeSpeechQueue = [];
  realtimeAudioStartAt = Date.now();
  realtimeLastResponseFinishedAt = 0;
  realtimeLastResponseStatus = "pending";

  const responsePromise = createRealtimeResponseWaiter();
  setOrbState(relayMode ? "speaking" : "processing");
  if (!relayMode) setCaption("Thinking…");

  const responseCreated = relayMode
    ? sendRealtimeEvent({
        type: "response.create",
        response: {
          output_modalities: ["text"],
          input: [
            {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Relay this update to the user in one short natural spoken reply. Preserve the meaning and do not add new facts.\n\n${text}`,
                },
              ],
            },
          ],
        },
      })
    : (
      sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      }) &&
      sendRealtimeEvent({
        type: "response.create",
        response: {
          output_modalities: ["text"],
        },
      })
    );

  if (!responseCreated) {
    resolveRealtimeResponse({
      status: "error",
      text: "",
      errorMessage: "Realtime voice channel is not ready.",
    });
  }

  const result = await responsePromise;
  if (result.status === "error") {
    throw new Error(result.errorMessage || "Realtime voice failed.");
  }
  return result;
}

function interruptRealtimeSpeech({ clearCaption = true } = {}) {
  sendRealtimeEvent({ type: "response.cancel" });
  sendRealtimeEvent({ type: "output_audio_buffer.clear" });
  stopCurrentTTS();
  clearRealtimeSpeechQueue();
  realtimeAssistantTranscript = "";
  realtimeAssistantItemId = null;
  realtimeLastResponseFinishedAt = Date.now();
  realtimeLastResponseStatus = "cancelled";
  resolveRealtimeResponse({ status: "cancelled", text: "", errorMessage: "" });
  setRealtimeMicEnabled(!voiceMuted);
  if (clearCaption) setCaption("");
}

async function speakTextWithRealtime(text) {
  if (!text) return false;
  try {
    const result = await requestRealtimeAssistantReply(text, { relayMode: true });
    if (result.status === "error") {
      throw new Error(result.errorMessage || "Realtime voice is not ready.");
    }
    return true;
  } catch (error) {
    realtimeLastResponseFinishedAt = Date.now();
    realtimeLastResponseStatus = "error";
    console.warn("Realtime relay playback failed:", error);
    return false;
  }
}

function handleRealtimeServerEvent(serverEvent) {
  if (!voiceActive || !isRealtimeVoiceMode()) return;

  if (serverEvent.type === "session.created" || serverEvent.type === "session.updated") {
    realtimeSessionReady = true;
    setVoiceContextStatus("realtime");
    if (!realtimeConnecting) setOrbState("listening");
    return;
  }

  if (serverEvent.type === "input_audio_buffer.speech_started") {
    if (isVoiceSpeaking || realtimeLastResponseStatus === "speaking" || realtimeLastResponseStatus === "pending") {
      interruptRealtimeSpeech({ clearCaption: false });
    }
    realtimeUserTranscript = "";
    setCaption("");
    setOrbState("listening");
    return;
  }

  if (serverEvent.type === "input_audio_buffer.speech_stopped") {
    setOrbState("processing");
    if (!realtimeAssistantTranscript) setCaption("Thinking…");
    return;
  }

  if (serverEvent.type === "conversation.item.input_audio_transcription.delta") {
    if (typeof serverEvent.delta === "string" && serverEvent.delta) {
      realtimeUserTranscript += serverEvent.delta;
      setCaption(realtimeUserTranscript.trim());
    }
    return;
  }

  if (serverEvent.type === "conversation.item.input_audio_transcription.completed") {
    const transcript = (serverEvent.transcript || realtimeUserTranscript || "").trim();
    realtimeUserTranscript = "";
    if (!transcript) return;
    if (voiceUserText) voiceUserText.textContent = transcript;
    setCaption("");
    requestVoicePageContext().finally(() => {
      handleVoiceInput(transcript, { useRealtimeSpeech: true });
    });
    return;
  }

  if (serverEvent.type === "response.created") {
    realtimeAssistantTranscript = "";
    realtimeSpeechBuffer = "";
    realtimeSpeechQueue = [];
    realtimeAudioStartAt = Date.now();
    realtimeLastResponseStatus = "pending";
    setOrbState("processing");
    return;
  }

  if (serverEvent.type === "response.output_item.added" || serverEvent.type === "response.output_item.created") {
    if (serverEvent.item?.role === "assistant" && serverEvent.item?.id) {
      realtimeAssistantItemId = serverEvent.item.id;
    }
    return;
  }

  if (serverEvent.type === "response.output_audio_transcript.delta") {
    if (typeof serverEvent.delta === "string" && serverEvent.delta) {
      realtimeAssistantTranscript += serverEvent.delta;
      setOrbState("speaking");
      setCaption(realtimeAssistantTranscript.trim());
    }
    return;
  }

  if (serverEvent.type === "response.output_audio_transcript.done") {
    if (typeof serverEvent.transcript === "string" && serverEvent.transcript.trim()) {
      realtimeAssistantTranscript = serverEvent.transcript.trim();
      setCaption(realtimeAssistantTranscript);
    }
    return;
  }

  if (serverEvent.type === "response.output_text.delta") {
    if (typeof serverEvent.delta === "string" && serverEvent.delta) {
      realtimeAssistantTranscript += serverEvent.delta;
      realtimeSpeechBuffer += serverEvent.delta;
      flushRealtimeSpeechBuffer();
      realtimeLastResponseStatus = "speaking";
      setOrbState("speaking");
      setCaption(realtimeAssistantTranscript.trim());
    }
    return;
  }

  if (serverEvent.type === "response.output_text.done") {
    if (typeof serverEvent.text === "string" && serverEvent.text.trim()) {
      realtimeAssistantTranscript = serverEvent.text.trim();
      setCaption(realtimeAssistantTranscript);
    }
    return;
  }

  if (serverEvent.type === "response.done") {
    const fallbackText = extractRealtimeResponseText(serverEvent.response);
    realtimeLastResponseFinishedAt = Date.now();
    realtimeLastResponseStatus = "done";
    setVoiceContextStatus("realtime");
    void finishRealtimeResponse("done", { fallbackText }).finally(() => {
      if (!voiceActive || !isRealtimeVoiceMode()) return;
      setOrbState("listening");
      if (voiceUserText) voiceUserText.textContent = "";
    });
    return;
  }

  if (serverEvent.type === "response.cancelled") {
    realtimeAssistantTranscript = "";
    realtimeLastResponseFinishedAt = Date.now();
    realtimeLastResponseStatus = "cancelled";
    setOrbState("listening");
    setCaption("");
    void finishRealtimeResponse("cancelled");
    return;
  }

  if (serverEvent.type === "error") {
    const message = serverEvent.error?.message || serverEvent.message || "Realtime voice hit an error.";
    realtimeLastResponseFinishedAt = Date.now();
    realtimeLastResponseStatus = "error";
    setOrbState("idle");
    setCaption(message);
    void finishRealtimeResponse("error", { errorMessage: message });
  }
}

function getActiveTabId() {
  return new Promise(resolve => {
    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      if (activeTabId) { resolve(activeTabId); return; }
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        resolve(tabs[0]?.id || null);
      });
    });
  });
}

function sendToContentScript(tabId, action) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action }, res => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(res || {});
    });
  });
}

async function startRealtimeVoiceMode() {
  const authToken = await getAuthToken();
  if (!authToken) {
    lastRealtimeStartupError = "No Braino auth token found.";
    return false;
  }

  cleanupRealtimeVoiceSession({ keepCaption: true });
  voiceUsingRealtime = true;
  realtimeConnecting = true;
  setVoiceContextStatus("connecting");
  setOrbState("processing");
  setCaption("Connecting Braino Live…");

  try {
    realtimeMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const peerConnection = new RTCPeerConnection();
    realtimePeerConnection = peerConnection;

    realtimeMicStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, realtimeMicStream);
    });

    realtimeRemoteAudio = document.createElement("audio");
    realtimeRemoteAudio.autoplay = true;
    realtimeRemoteAudio.playsInline = true;
    realtimeRemoteAudio.style.display = "none";
    document.body.appendChild(realtimeRemoteAudio);

    peerConnection.ontrack = (event) => {
      realtimeRemoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
      realtimeRemoteAudio.play().catch(() => {});
    };

    peerConnection.onconnectionstatechange = () => {
      if (!voiceActive || !isRealtimeVoiceMode()) return;
      const state = peerConnection.connectionState;
      if (state === "failed" || state === "closed" || state === "disconnected") {
        cleanupRealtimeVoiceSession({ keepCaption: true });
        setOrbState("idle");
        setCaption("Braino Live disconnected.");
      }
    };

    const dataChannelOpen = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Braino Live timed out while connecting."));
      }, 10000);

      realtimeDataChannel = peerConnection.createDataChannel("oai-events");
      realtimeDataChannel.addEventListener("open", () => {
        clearTimeout(timeoutId);
        resolve(true);
      }, { once: true });
      realtimeDataChannel.addEventListener("error", () => {
        clearTimeout(timeoutId);
        reject(new Error("Braino Live could not open its control channel."));
      }, { once: true });
      realtimeDataChannel.addEventListener("message", (event) => {
        try {
          handleRealtimeServerEvent(JSON.parse(event.data));
        } catch (error) {
          console.warn("Realtime event parse error:", error);
        }
      });
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const callRealtime = (token) => fetch(`${API_BASE}/openai-realtime-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: offer.sdp || "",
    });

    let response = await callRealtime(authToken);
    if (response.status === 401) {
      const data = await getStorage(["authRefreshToken"]);
      const refreshedToken = data.authRefreshToken ? await refreshAuthToken(data.authRefreshToken) : null;
      if (refreshedToken) {
        response = await callRealtime(refreshedToken);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorPayload = {};
      try {
        errorPayload = JSON.parse(errorText);
      } catch {}
      throw new Error(errorPayload.error || errorPayload.details || errorText || `Realtime session failed (${response.status}).`);
    }

    const answerSdp = await response.text();
    await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await dataChannelOpen;

    realtimeConnecting = false;
    realtimeSessionReady = true;
    lastRealtimeStartupError = "";
    voiceMuted = false;
    if (voiceMuteBtn) voiceMuteBtn.style.opacity = "1";

    await requestVoicePageContext();
    setOrbState("listening");
    setVoiceContextStatus("realtime");
    setCaption("");
    syncRealtimeVoiceSession({ force: true });

    return true;
  } catch (error) {
    realtimeConnecting = false;
    cleanupRealtimeVoiceSession({ keepCaption: true });
    lastRealtimeStartupError = error instanceof Error ? error.message : String(error);
    console.warn("Realtime voice setup failed:", error);
    return false;
  }
}

async function openVoiceMode() {
  voiceActive = true;
  voiceOverlay?.classList.remove("hidden");
  setOrbState("listening");
  setSubtitles("", "");
  setVoiceContextStatus("reading");
  updateVoicePageCtx();

  const tabId = await getActiveTabId();
  if (!tabId) {
    setCaption("No active tab. Open a webpage first.");
    setOrbState("idle");
    return;
  }

  voiceTabId = tabId;
  const startedRealtime = await startRealtimeVoiceMode();
  if (startedRealtime) {
    return;
  }

  setVoiceContextStatus("legacy", {
    tone: "legacy",
    detail: lastRealtimeStartupError ? `Realtime failed: ${lastRealtimeStartupError}` : "Using Braino legacy voice.",
  });
  const res = await sendToContentScript(tabId, "startVoiceListening");
  if (res?.error) {
    const detail = lastRealtimeStartupError ? ` Realtime failed: ${lastRealtimeStartupError}` : "";
    setCaption("Could not start voice: " + res.error + detail);
    setOrbState("idle");
    setVoiceContextStatus("error", {
      tone: "error",
      detail: `Voice start failed: ${res.error}${lastRealtimeStartupError ? ` · Realtime failed: ${lastRealtimeStartupError}` : ""}`,
    });
  } else if (lastRealtimeStartupError) {
    setCaption(`Using legacy voice. Realtime failed: ${lastRealtimeStartupError}`);
  }
}

async function closeVoiceMode() {
  const hadRealtimeSession = isRealtimeVoiceSessionRunning();
  headphoneMode = false;
  document.body.classList.remove("headphone-mode");
  voiceActive = false;
  stopCurrentTTS();
  if (hadRealtimeSession) cleanupRealtimeVoiceSession();
  voiceOverlay?.classList.add("hidden");
  setOrbState("idle");
  const tabId = voiceTabId || await getActiveTabId();
  voiceTabId = null;
  if (!hadRealtimeSession && tabId) sendToContentScript(tabId, "stopVoiceListening");
}

function toggleHeadphoneMode() {
  if (voiceActive) {
    closeVoiceMode();
  } else {
    headphoneMode = true;
    document.body.classList.add("headphone-mode");
    openVoiceMode();
  }
}

// Handle remote commands forwarded by background.js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "handleRemoteCommand" && msg.cmd) {
    sendResponse({ ok: true }); // tell background we're alive and handling it
    getAuthToken().then(token => {
      if (token) runRemoteCommand(msg.cmd, token);
    });
    return true;
  }
});

// Receive voice events relayed from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "voiceEvent" || !voiceActive || isRealtimeVoiceMode()) return;

  if (msg.event === "listening") {
    if (!isVoiceSpeaking) {
      setOrbState("listening");
      setCaption("");
    }
  } else if (msg.event === "transcript") {
    if (!msg.isFinal) {
      // Interim: show live user speech in caption
      setCaption(msg.text || "");
      const wordSpans = voiceAgentText ? voiceAgentText.querySelectorAll(".word") : [];
      wordSpans.forEach(w => { w.classList.remove("current"); w.classList.add("said"); });
    } else {
      // Final — interrupt TTS if speaking, then process
      if (isVoiceSpeaking) { stopCurrentTTS(); setCaption(""); }
      handleVoiceInput(msg.text.trim());
    }
  } else if (msg.event === "error") {
    if (!isVoiceSpeaking) {
      setOrbState("idle");
      setCaption(msg.message === "not-allowed"
        ? "Microphone blocked — allow access and try again."
        : `Error: ${msg.message}`);
    }
  }
});

// Receive page text selections from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "selectionChanged" || !msg.text) return;
  currentSelection = { text: msg.text, url: msg.url, title: msg.title };
  showSelectionChip(msg.text);
  if (voiceActive && isRealtimeVoiceMode()) syncRealtimeVoiceSession();
});

// Detect if a voice command is a browser action request
function isBrowserActionCommand(text) {
  return /\b(open|go to|navigate to|search for|play|send|click|find|buy|order|type|compose|reply to|download|post on|scroll|refresh|close tab|new tab|visit|book)\b/i.test(text);
}

let voiceHandlingToken = 0;

async function handleVoiceInput(text, { useRealtimeSpeech = isRealtimeVoiceMode() } = {}) {
  if (!text || !voiceActive) return;

  // Cancel any in-progress request (agent loop, TTS, fetch)
  agentShouldStop = true;
  stopCurrentTTS();
  const myToken = ++voiceHandlingToken;
  // Brief gap so previous async calls can detect cancellation
  await new Promise(r => setTimeout(r, 60));
  if (voiceHandlingToken !== myToken || !voiceActive) return;
  agentShouldStop = false;

  // Flash "captured" (yellow) briefly before switching to processing
  setOrbState("captured");
  if (voiceUserText) voiceUserText.textContent = text;
  setCaption("");
  await new Promise(r => setTimeout(r, 800));
  if (voiceHandlingToken !== myToken || !voiceActive) return;

  setOrbState("processing");
  setCaption("Thinking…");

  // Auto-route to agent if request sounds like a browser action
  // (even if mode isn't explicitly "agent", unless in lecture/meeting mode)
  const useAgent = currentMode === "agent" ||
    (isBrowserActionCommand(text) && currentMode !== "lecture" && currentMode !== "meeting");
  const useWebSearch = currentMode === "web" ||
    (currentMode !== "lecture" && currentMode !== "meeting" && !useAgent && isExplicitWebSearchRequest(text));

  let reply;
  let replyAlreadySpoken = false;

  try {
    if (useAgent) {
      setOrbState("acting");
      setCaption("Working on it…");
      reply = await runAgentLoopForVoice(text);
    } else if (useWebSearch) {
      reply = await fetchWebSearchReply(
        text,
        chatMessages.slice(-10).map((message) => ({ role: message.role, content: message.content })),
      );

      chatMessages.push({ role: "user", content: text });
      chatMessages.push({ role: "assistant", content: reply });
      saveChatMessages();
      if (!headphoneMode) renderChatMessages();
    } else if (useRealtimeSpeech && isRealtimeVoiceMode()) {
      const realtimeResult = await requestRealtimeAssistantReply(text);
      replyAlreadySpoken = true;
      if (realtimeResult.status === "cancelled") return;
      if (realtimeResult.status === "error") {
        throw new Error(realtimeResult.errorMessage || "Realtime voice is not ready.");
      }
      reply = realtimeResult.text || "Sorry, I didn't get that.";

      chatMessages.push({ role: "user", content: text });
      chatMessages.push({ role: "assistant", content: reply });
      saveChatMessages();
      if (!headphoneMode) renderChatMessages();
    } else {
      // Use same rich context as sendChatMessage — notes + page context + chat history + mode
      const hasNotes = hasExistingNotes();
      const notesCtx = hasNotes ? buildNotesContextForAI(notesMarkdown) : { sanitizedNotes: "", existingImages: {} };

      const body = {
        notes: notesCtx.sanitizedNotes,
        message: text,
        aiProvider: getTextAiProvider(),
        chatHistory: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      };

      if (currentMode === "page" && currentPageContext) {
        body.pageContext = currentPageContext;
      }
      if (currentSelection) body.selectedText = currentSelection;

      const res = await fetch(`${API_BASE}/chat-about-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      reply = data.reply || "Sorry, I didn't get that.";

      chatMessages.push({ role: "user", content: text });
      chatMessages.push({ role: "assistant", content: reply });
      saveChatMessages();
      if (!headphoneMode) renderChatMessages();
    }

    if (voiceHandlingToken !== myToken || !voiceActive) return;

    if (!replyAlreadySpoken) {
      setOrbState("speaking");
      if (useRealtimeSpeech) {
        await speakTextWithRealtime(reply);
      } else {
      // Stop mic so TTS audio isn't picked up as user input
        if (voiceTabId) sendToContentScript(voiceTabId, "stopVoiceListening");
        await speakText(reply, (text, _idx) => {
          if (_idx === -1) setCaption(text); // initial render of word spans
        });
      }
    }
  } catch(e) {
    if (useRealtimeSpeech && isRealtimeVoiceMode()) {
      setOrbState("speaking");
      await speakTextWithRealtime("Something went wrong. Try again.");
    } else {
      setCaption("Something went wrong. Try again.");
    }
  }

  // Restart mic after speaking ends so user can reply
  if (voiceHandlingToken === myToken && voiceActive) {
    setOrbState("listening");
    if (!useRealtimeSpeech) setCaption("");
    if (voiceUserText) voiceUserText.textContent = "";
    if (!useRealtimeSpeech && voiceTabId) sendToContentScript(voiceTabId, "startVoiceListening");
  }
}

// Run agent loop from voice — returns the final message string to speak
function runAgentLoopForVoice(task) {
  return new Promise(async (resolve) => {
    if (agentRunning) { resolve("I'm already working on something, please wait."); return; }
    if (!(await loadPremiumStatus())) { resolve("Browser agent requires a premium subscription."); return; }

    agentShouldStop = false;
    setAgentRunningUI(true);

    const userMsg = { role: "user", content: `🤖 ${task}` };
    chatMessages.push(userMsg);
    renderChatMessages();
    saveChatMessages();
    updateEmptyState();

    const history = [];
    const thinkingBlock = createAgentThinkingBlock(task);

    const finish = (msg) => {
      agentFinalizeBlock(thinkingBlock, history.length);
      chatMessages.push({ role: "assistant", content: msg });
      renderChatMessages();
      saveChatMessages();
      setAgentRunningUI(false);
      resolve(msg);
    };

    const MAX = 20;
    let iterations = 0;

    try {
      const adapterMessage = await tryRunPopupSiteAdapter(task, thinkingBlock, history, {
        shouldStop: () => agentShouldStop || !voiceActive,
        onStatus: (description) => setSubtitles(task, description),
      });
      if (adapterMessage) {
        finish(adapterMessage);
        return;
      }
    } catch (e) {
      agentAddStep(thinkingBlock, `⚠️ ${e.message}`, "error");
      finish(`Error: ${e.message}`);
      return;
    }

    while (iterations++ < MAX) {
      if (agentShouldStop || !voiceActive) { finish("Stopped."); return; }

      setSubtitles(task, iterations === 1 ? "Working on it…" : `Step ${iterations}…`);

      const pageInfo = await getAgentPageContext();
      let actions = tryFastPath(task, history);
      if (!actions) try {
        actions = await callAgentStep(task, pageInfo, history, chatMessages.slice(0, -1));
      } catch(e) {
        agentAddStep(thinkingBlock, `⚠️ ${e.message}`, "error");
        finish(`Error: ${e.message}`);
        return;
      }

      if (agentShouldStop || !voiceActive) { finish("Stopped."); return; }

      const first = actions[0];
      if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
        if (first.type === "done") {
          const realDone = history.filter(h => ["click","type","pressKey","selectOption"].includes(h.type) && h.result?.success);
          const needsActions = /send|submit|reply|compose|type|fill|click|buy|order|play|post|write|upload/i.test(task);
          if (needsActions && realDone.length === 0) {
            history.push({ type: "correction", description: "SYSTEM: No real actions executed. Start executing now.", result: { success: false, error: "No real actions" } });
            continue;
          }
        }
        if (history.length === 0) {
          const _mi = Number(thinkingBlock?.dataset.msgIndex);
          if (_mi >= 0 && chatMessages[_mi]?.role === "agent-trace") { chatMessages.splice(_mi, 1); saveChatMessages(); }
          thinkingBlock?.remove();
        }
        finish(first.message || "Done.");
        return;
      }

      for (const actionObj of actions) {
        if (agentShouldStop || !voiceActive) { finish("Stopped."); return; }
        if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
          finish(actionObj.message || "Done.");
          return;
        }
        const stepEl = agentAddStep(thinkingBlock, actionObj.description || actionObj.type);
        const result = await executeAgentAction(actionObj);

        // Capture snapshot after actions that change page state so agent can verify
        let snapshot = null;
        if (!result?.error && SNAPSHOT_ACTIONS.has(actionObj.type)) {
          if (actionObj.type === "navigate") {
            await waitForTabReady(5000);
            await new Promise(r => setTimeout(r, 300));
          } else {
            await new Promise(r => setTimeout(r, 400));
          }
          snapshot = await getPageSnapshot();
        } else if (actionObj.type !== "navigate") {
          await new Promise(r => setTimeout(r, 150));
        }

        history.push({ ...actionObj, result, snapshot });
        agentMarkStepResult(stepEl, !result?.error, result?.error);
        if (result?.error) { await new Promise(r => setTimeout(r, 600)); break; }
      }
      await new Promise(r => setTimeout(r, 150));
    }

    finish("I ran out of steps. Please check the page.");
  });
}

voiceModeBtn?.addEventListener("click", toggleHeadphoneMode);
voiceCloseBtn?.addEventListener("click", closeVoiceMode);
voiceOrb?.addEventListener("click", () => { if (headphoneMode) closeVoiceMode(); });

voiceInterruptBtn?.addEventListener("click", () => {
  agentShouldStop = true;
  voiceHandlingToken++;
  if (isRealtimeVoiceMode()) {
    interruptRealtimeSpeech();
    setOrbState("listening");
    if (voiceUserText) voiceUserText.textContent = "";
    return;
  }

  stopCurrentTTS();
  agentShouldStop = true;
  setOrbState("listening");
  setCaption("");
  if (voiceUserText) voiceUserText.textContent = "";
  if (voiceTabId) sendToContentScript(voiceTabId, "startVoiceListening");
});

voiceStopTaskBtn?.addEventListener("click", () => {
  agentShouldStop = true;
  voiceHandlingToken++;
  if (isRealtimeVoiceMode()) interruptRealtimeSpeech();
  stopCurrentTTS();
  setOrbState("idle");
  setCaption("Task stopped.");
});

voiceMuteBtn?.addEventListener("click", () => {
  voiceMuted = !voiceMuted;
  if (isRealtimeVoiceMode()) {
    realtimeMicStream?.getAudioTracks().forEach((track) => {
      track.enabled = !voiceMuted;
    });
  } else if (voiceTabId) {
    sendToContentScript(voiceTabId, voiceMuted ? "stopVoiceListening" : "startVoiceListening");
  }
  if (voiceMuteBtn) voiceMuteBtn.style.opacity = voiceMuted ? "0.4" : "1";
});

// Poll until the active tab finishes loading (replaces fixed 3500ms navigate wait)
async function waitForTabReady(maxMs = 5000) {
  const start = Date.now();
  return new Promise((resolve) => {
    function check() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return resolve();
        if (tabs[0].status === "complete") return resolve();
        if (Date.now() - start > maxMs) return resolve();
        setTimeout(check, 200);
      });
    }
    // Minimum floor: let content script re-initialize after navigation
    setTimeout(check, 400);
  });
}

async function runAgentLoop(task) {
  if (agentRunning) return;
  if (!(await loadPremiumStatus())) {
    showUpgradePrompt("Browser Agent");
    return;
  }
  agentShouldStop = false;
  setAgentRunningUI(true);

  const userMsg = { role: "user", content: `🤖 ${task}` };
  chatMessages.push(userMsg);
  renderChatMessages();
  saveChatMessages();
  updateEmptyState();

  const history = [];
  const thinkingBlock = createAgentThinkingBlock(task);

  const finish = (msg) => {
    agentFinalizeBlock(thinkingBlock, history.length);
    chatMessages.push({ role: "assistant", content: msg });
    renderChatMessages();
    saveChatMessages();
    setAgentRunningUI(false);
  };

  try {
    const adapterMessage = await tryRunPopupSiteAdapter(task, thinkingBlock, history, {
      shouldStop: () => agentShouldStop,
    });
    if (adapterMessage) {
      agentFinalizeBlock(thinkingBlock, history.length);
      chatMessages.push({ role: "assistant", content: adapterMessage });
      renderChatMessages();
      saveChatMessages();
      setAgentRunningUI(false);
      return;
    }
  } catch (e) {
    agentAddStep(thinkingBlock, `⚠️ ${e.message}`, "error");
    finish(`⚠️ Adapter error: ${e.message}`);
    return;
  }

  while (true) {
    if (agentShouldStop) { finish("⏹ Stopped."); return; }

    const pageInfo = await getAgentPageContext();

    let actions = tryFastPath(task, history);
    if (!actions) try {
      actions = await callAgentStep(task, pageInfo, history, chatMessages.slice(0, -1));
    } catch (e) {
      agentAddStep(thinkingBlock, `⚠️ ${e.message}`, "error");
      finish(`⚠️ AI error: ${e.message}`);
      return;
    }

    if (agentShouldStop) { finish("⏹ Stopped."); return; }

    // Check if first action is terminal
    const firstAction = actions[0];
    if (firstAction.type === "done" || firstAction.type === "answer" || firstAction.type === "clarify") {

      // HALLUCINATION GUARD: if agent claims "done" but no real browser actions were executed, force it to continue
      if (firstAction.type === "done") {
        const realActionTypes = ["click", "type", "pressKey", "selectOption"];
        const successfulRealActions = history.filter(h => realActionTypes.includes(h.type) && h.result?.success);
        const taskRequiresActions = /send|submit|reply|compose|type|fill|click|buy|order|play|post|write|upload/i.test(task);
        if (taskRequiresActions && successfulRealActions.length === 0) {
          // Inject a correction into history so the LLM sees it next iteration
          history.push({
            type: "correction",
            description: "⚠️ SYSTEM: You returned 'done' but NO clicks, types, or keypresses have been executed. The task is NOT complete. You MUST execute the actual browser steps — navigate somewhere if needed, then click and type.",
            result: { success: false, error: "No real actions taken — task not complete" }
          });
          continue; // re-query LLM without marking done
        }
      }

      if (history.length === 0) {
        const _mi = Number(thinkingBlock?.dataset.msgIndex);
        if (_mi >= 0 && chatMessages[_mi]?.role === "agent-trace") { chatMessages.splice(_mi, 1); saveChatMessages(); }
        thinkingBlock?.remove();
      }
      finish(firstAction.message || "Done.");
      return;
    }

    // Execute each action in the batch
    let batchError = false;
    for (const actionObj of actions) {
      if (agentShouldStop) { finish("⏹ Stopped."); return; }

      if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
        finish(actionObj.message || "Done.");
        return;
      }

      const desc = actionObj.description || actionObj.type;
      const stepEl = agentAddStep(thinkingBlock, desc);

      const result = await executeAgentAction(actionObj);

      // Capture snapshot after state-changing actions so agent can verify landing
      let snapshot = null;
      if (!result?.error && SNAPSHOT_ACTIONS.has(actionObj.type)) {
        if (actionObj.type === "navigate") {
          await waitForTabReady(5000);
          await new Promise(r => setTimeout(r, 300));
        } else {
          await new Promise(r => setTimeout(r, 400));
        }
        snapshot = await getPageSnapshot();
      } else if (actionObj.type !== "navigate") {
        await new Promise(r => setTimeout(r, 150));
      }

      history.push({ ...actionObj, result, snapshot });
      agentMarkStepResult(stepEl, !result?.error, result?.error);

      if (result?.error) {
        await new Promise(r => setTimeout(r, 600));
        batchError = true;
        break;
      }
    }

    // If batch succeeded with no error, small pause before re-querying
    if (!batchError) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
}


// ===== SEND HANDLER (unified) =====
function handleSend() {
  if ((currentMode === "lecture" || currentMode === "meeting") && !recordingCardEl) {
    startRecordingFlow();
    return;
  }
  const text = chatInput.value.trim();
  const img = pendingImageBase64;
  if (!text && !img) return;
  chatInput.value = "";
  clearPendingImage();

  if (currentMode === "agent") {
    runAgentLoop(text);
    return;
  }

  if (text && !img && (currentMode === "web" || ((currentMode === "page" || currentMode === "general") && isExplicitWebSearchRequest(text)))) {
    sendWebSearchMessage(text);
    return;
  }

  if (looksLikeAnswerRequest(text) && !img) {
    showAnswerConfirm(text, img);
  } else {
    sendChatMessage(text, img);
  }
}

const SEND_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>`;
const STOP_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;
const REC_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;

function updateSendBtn() {
  if (!chatSendBtn || agentRunning) return;
  const isRecordMode = (currentMode === "lecture" || currentMode === "meeting") && !recordingCardEl;
  chatSendBtn.innerHTML = isRecordMode ? REC_ICON : SEND_ICON;
  chatSendBtn.classList.toggle("btn-record-ready", isRecordMode);
  chatSendBtn.title = isRecordMode ? "Start recording" : "Send";
}

chatSendBtn?.addEventListener("click", () => {
  if (agentRunning) {
    agentShouldStop = true;
  } else {
    handleSend();
  }
});
chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
});


// ===== ANSWER CONFIRMATION =====
let pendingConfirmText = null;
let pendingConfirmImg = null;

function showAnswerConfirm(text, img) {
  pendingConfirmText = text;
  pendingConfirmImg = img;
  document.getElementById("answerConfirmOverlay")?.classList.remove("hidden");
}

function hideAnswerConfirm() {
  document.getElementById("answerConfirmOverlay")?.classList.add("hidden");
  pendingConfirmText = null;
  pendingConfirmImg = null;
}

document.getElementById("answerConfirmYes")?.addEventListener("click", () => {
  const text = pendingConfirmText;
  const img = pendingConfirmImg;
  hideAnswerConfirm();
  if (text || img) sendChatMessage(text, img);
});

document.getElementById("answerConfirmNo")?.addEventListener("click", () => {
  hideAnswerConfirm();
  if (pendingConfirmText && chatInput) chatInput.value = pendingConfirmText;
});


// ===== IMAGE PREVIEW =====
function setPendingImage(base64, dataUrl) {
  pendingImageBase64 = base64;
  if (chatPreviewImg) chatPreviewImg.src = dataUrl;
  chatImagePreview?.classList.remove("hidden");
}

function clearPendingImage() {
  pendingImageBase64 = null;
  if (chatPreviewImg) chatPreviewImg.src = "";
  chatImagePreview?.classList.add("hidden");
}

chatRemoveImage?.addEventListener("click", clearPendingImage);

chatInput?.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        setPendingImage(base64, reader.result);
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
});


// ===== NOTES OVERLAY =====
closeNotesBtn?.addEventListener("click", () => notesOverlay.classList.add("hidden"));

copyBtn?.addEventListener("click", () => {
  navigator.clipboard.writeText(notesMarkdown).then(() => {
    if (copyBtn) {
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
    }
  });
});


// ===== SCREENSHOT CAPTURE & CROP =====
const chatScreenshotBtn = document.getElementById("chatScreenshotBtn");
const cropOverlay = document.getElementById("cropOverlay");
const cropImage = document.getElementById("cropImage");
const cropCanvas = document.getElementById("cropCanvas");
const cropSelection = document.getElementById("cropSelection");
const cropConfirmBtn = document.getElementById("cropConfirmBtn");
const cropUseFullBtn = document.getElementById("cropUseFullBtn");
const cropCancelBtn = document.getElementById("cropCancelBtn");

let screenshotDataUrl = null;
let cropStart = null;
let cropRect = null;
let isDragging = false;

chatScreenshotBtn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "captureScreenshot" }, (res) => {
    if (res?.error) { alert("Screenshot failed: " + res.error); return; }
    screenshotDataUrl = res.dataUrl;
    cropImage.src = screenshotDataUrl;
    cropSelection.classList.add("hidden");
    cropConfirmBtn.disabled = true;
    cropRect = null;
    cropOverlay.classList.remove("hidden");
  });
});

cropCanvas?.addEventListener("mousedown", (e) => {
  if (e.target !== cropImage && e.target !== cropCanvas) return;
  const canvasRect = cropCanvas.getBoundingClientRect();
  const imgRect = cropImage.getBoundingClientRect();
  isDragging = true;
  const relX = e.clientX - canvasRect.left;
  const relY = e.clientY - canvasRect.top;
  cropStart = { x: relX, y: relY, canvasRect, imgRect };
  cropSelection.classList.remove("hidden");
  cropSelection.style.cssText = `left:${relX}px;top:${relY}px;width:0;height:0`;
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging || !cropStart) return;
  const canvasRect = cropCanvas.getBoundingClientRect();
  const relX = e.clientX - canvasRect.left;
  const relY = e.clientY - canvasRect.top;
  const x1 = Math.min(cropStart.x, relX);
  const y1 = Math.min(cropStart.y, relY);
  cropSelection.style.cssText = `left:${x1}px;top:${y1}px;width:${Math.abs(relX - cropStart.x)}px;height:${Math.abs(relY - cropStart.y)}px`;
});

document.addEventListener("mouseup", (e) => {
  if (!isDragging || !cropStart) return;
  isDragging = false;
  const canvasRect = cropCanvas.getBoundingClientRect();
  const imgRect = cropImage.getBoundingClientRect();
  const relX = e.clientX - canvasRect.left;
  const relY = e.clientY - canvasRect.top;
  const imgOffsetX = imgRect.left - canvasRect.left;
  const imgOffsetY = imgRect.top - canvasRect.top;
  const x1 = Math.max(0, Math.min(cropStart.x, relX) - imgOffsetX);
  const y1 = Math.max(0, Math.min(cropStart.y, relY) - imgOffsetY);
  const x2 = Math.min(imgRect.width, Math.max(cropStart.x, relX) - imgOffsetX);
  const y2 = Math.min(imgRect.height, Math.max(cropStart.y, relY) - imgOffsetY);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w > 10 && h > 10) {
    const scaleX = cropImage.naturalWidth / imgRect.width;
    const scaleY = cropImage.naturalHeight / imgRect.height;
    cropRect = { x: Math.round(x1 * scaleX), y: Math.round(y1 * scaleY), w: Math.round(w * scaleX), h: Math.round(h * scaleY) };
    cropConfirmBtn.disabled = false;
  } else {
    cropSelection.classList.add("hidden");
    cropConfirmBtn.disabled = true;
    cropRect = null;
  }
  cropStart = null;
});

cropCancelBtn?.addEventListener("click", () => { cropOverlay.classList.add("hidden"); screenshotDataUrl = null; cropRect = null; });

cropUseFullBtn?.addEventListener("click", () => {
  if (!screenshotDataUrl) return;
  const base64 = screenshotDataUrl.split(",")[1];
  cropOverlay.classList.add("hidden");
  setPendingImage(base64, screenshotDataUrl);
  chatInput.value = "Please add this diagram wherever it's relevant in the notes";
  chatInput.focus();
  screenshotDataUrl = null;
});

cropConfirmBtn?.addEventListener("click", () => {
  if (!screenshotDataUrl || !cropRect) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    const croppedDataUrl = canvas.toDataURL("image/png");
    const base64 = croppedDataUrl.split(",")[1];
    cropOverlay.classList.add("hidden");
    setPendingImage(base64, croppedDataUrl);
    chatInput.value = "Please add this diagram wherever it's relevant in the notes";
    chatInput.focus();
    screenshotDataUrl = null;
    cropRect = null;
  };
  img.src = screenshotDataUrl;
});


// ===== THEME TOGGLE =====
const themeToggleBtn = document.getElementById("themeToggleBtn");
const SUN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const LEAF_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;

function applyTheme(warm) {
  if (warm) {
    document.body.classList.add("theme-warm");
    if (themeToggleBtn) { themeToggleBtn.innerHTML = SUN_ICON; themeToggleBtn.title = "Switch to default theme"; }
  } else {
    document.body.classList.remove("theme-warm");
    if (themeToggleBtn) { themeToggleBtn.innerHTML = LEAF_ICON; themeToggleBtn.title = "Switch to warm theme"; }
  }
}

chrome.storage.local.get("sidepanelWarmTheme", (data) => applyTheme(!!data.sidepanelWarmTheme));

themeToggleBtn?.addEventListener("click", () => {
  const newWarm = !document.body.classList.contains("theme-warm");
  chrome.storage.local.set({ sidepanelWarmTheme: newWarm });
  applyTheme(newWarm);
});


// ===== PREMIUM =====
const SUPABASE_URL = "https://suwhgaxxdizowbyjlljj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";
const PREMIUM_CACHE_MS = 60 * 1000;

async function refreshAuthToken(refreshToken) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;
    await setStorage({
      authToken: json.access_token,
      authRefreshToken: json.refresh_token || refreshToken,
    });
    return json.access_token;
  } catch (e) {
    return null;
  }
}

async function loadPremiumStatus(forceRefresh = false) {
  const data = await getStorage(["authToken", "authRefreshToken", "authUserId", "authEmail", "isPremium", "isPremiumCachedAt"]);
  const normalizedEmail = typeof data.authEmail === "string" ? data.authEmail.trim().toLowerCase() : "";
  if (normalizedEmail && INTERNAL_PREMIUM_EMAILS.has(normalizedEmail)) {
    isPremium = true;
    await setStorage({ isPremium: true, isPremiumCachedAt: Date.now() });
    return true;
  }

  if (!data.authUserId) {
    isPremium = false;
    return false;
  }

  const now = Date.now();
  const hasFreshPositiveCache =
    !forceRefresh &&
    data.isPremium === true &&
    data.isPremiumCachedAt &&
    (now - data.isPremiumCachedAt) < PREMIUM_CACHE_MS;

  if (hasFreshPositiveCache) {
    isPremium = true;
    return true;
  }

  let token = data.authToken;

  const fetchPremium = async (t) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(data.authUserId)}&select=is_premium`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${t}` },
    });
    return res;
  };

  try {
    let res = token ? await fetchPremium(token) : null;

    // If token expired or missing, try refreshing
    if (!res || res.status === 401) {
      if (data.authRefreshToken) {
        const newToken = await refreshAuthToken(data.authRefreshToken);
        if (newToken) {
          token = newToken;
          res = await fetchPremium(token);
        }
      }
    }

    if (!res || !res.ok) throw new Error(`Premium lookup failed: ${res?.status}`);

    const rows = await res.json();
    isPremium = !!rows?.[0]?.is_premium;
    await setStorage({ isPremium, isPremiumCachedAt: now });
    return isPremium;
  } catch (e) {
    console.warn("Premium lookup failed:", e?.message || e);
    isPremium = !!data.isPremium;
    return isPremium;
  }
}

function showUpgradePrompt(feature) {
  // Remove any existing
  chatArea.querySelectorAll(".upgrade-prompt").forEach(el => el.remove());
  const el = document.createElement("div");
  el.className = "upgrade-prompt";
  el.innerHTML = `
    <span class="upgrade-prompt-icon">⚡</span>
    <span><strong>${feature}</strong> is a Premium feature.</span>
    <button class="upgrade-prompt-btn">Upgrade</button>
  `;
  el.querySelector(".upgrade-prompt-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://trybraino.com/premium" });
  });
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
  // Auto-dismiss after 8s
  setTimeout(() => { if (el.parentNode) el.remove(); }, 8000);
}

async function checkRecordingLimit() {
  if (await loadPremiumStatus()) return true;
  const today = new Date().toDateString();
  const data = await getStorage(["recordingSecondsToday", "recordingResetDate"]);
  const usedSeconds = (data.recordingResetDate === today) ? (data.recordingSecondsToday || 0) : 0;
  if (usedSeconds >= FREE_RECORDING_SECONDS) {
    showUpgradePrompt("Unlimited recording");
    return false;
  }
  return true;
}

async function checkChatLimit() {
  if (await loadPremiumStatus()) return true;
  const today = new Date().toDateString();
  const data = await getStorage(["chatQuestionsToday", "chatResetDate"]);
  const used = (data.chatResetDate === today) ? (data.chatQuestionsToday || 0) : 0;
  if (used >= FREE_CHAT_QUESTIONS) {
    showUpgradePrompt("Unlimited chat");
    return false;
  }
  return true;
}

async function incrementChatCount() {
  if (isPremium) return;
  const today = new Date().toDateString();
  const data = await getStorage(["chatQuestionsToday", "chatResetDate"]);
  const used = (data.chatResetDate === today) ? (data.chatQuestionsToday || 0) : 0;
  await setStorage({ chatQuestionsToday: used + 1, chatResetDate: today });
}

// Track recording seconds while active
let recordingSecondInterval = null;
function startTrackingRecordingTime() {
  if (isPremium) return;
  recordingSecondInterval = setInterval(async () => {
    const today = new Date().toDateString();
    const data = await getStorage(["recordingSecondsToday", "recordingResetDate"]);
    const used = (data.recordingResetDate === today) ? (data.recordingSecondsToday || 0) : 0;
    await setStorage({ recordingSecondsToday: used + 1, recordingResetDate: today });
    if (used + 1 >= FREE_RECORDING_SECONDS) {
      handleStopRecording();
      showUpgradePrompt("Unlimited recording");
    }
  }, 1000);
}
function stopTrackingRecordingTime() {
  clearInterval(recordingSecondInterval);
  recordingSecondInterval = null;
}

// ===== AUTH =====
const WEBSITE_URL = "https://trybraino.com";
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
let currentAuthUser = null;

function updateAuthUI() {
  chrome.storage.local.get(["authToken", "authDisplayName", "authEmail", "authUserId"], (data) => {
    if (data.authToken && (data.authDisplayName || data.authEmail || data.authUserId)) {
      const fallbackName = typeof data.authEmail === "string" && data.authEmail.includes("@")
        ? data.authEmail.split("@")[0]
        : "Braino User";
      currentAuthUser = {
        token: data.authToken,
        name: data.authDisplayName || fallbackName,
        email: data.authEmail,
        userId: data.authUserId,
      };
      void loadPremiumStatus(true);
    } else {
      currentAuthUser = null;
      isPremium = false;
      void removeStorage(["isPremium", "isPremiumCachedAt"]);
    }
    refreshPanelChrome();
  });
}

updateAuthUI();

loginBtn?.addEventListener("click", () => {
  const extId = chrome.runtime.id;
  chrome.tabs.create({ url: `${WEBSITE_URL}/auth/extension?ext=${extId}` }, (tab) => {
    if (tab?.id) chrome.storage.local.set({ __sbAuthTabId: tab.id });
  });
});

logoutBtn?.addEventListener("click", () => {
  chrome.storage.local.remove(["authToken", "authRefreshToken", "authDisplayName", "authEmail", "authUserId", "isPremium", "isPremiumCachedAt"]);
  updateAuthUI();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.authToken || changes.authDisplayName || changes.authEmail || changes.authUserId)) updateAuthUI();
});


// ===== CLOUD NOTES SYNC =====
async function saveNoteToCloud(sessionId, notes, sourceUrl, sourceTitle, useCase) {
  if (!currentAuthUser?.token) return;
  try {
    await fetch(`${API_BASE}/save-note`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentAuthUser.token}` },
      body: JSON.stringify({
        action: "save",
        session_id: sessionId,
        title: sourceTitle || "Untitled Notes",
        structured_notes: notes,
        source_url: sourceUrl,
        source_title: sourceTitle,
        use_case: useCase || "lecture",
      }),
    });
  } catch (e) {
    console.log("Cloud save failed:", e.message);
  }
}


// ===== NOTION SYNC =====
function getNotionUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get("notionUserId", (data) => {
      if (data.notionUserId) { resolve(data.notionUserId); return; }
      const id = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      chrome.storage.local.set({ notionUserId: id });
      resolve(id);
    });
  });
}

async function closeNotionAuthTab() {
  const data = await getStorage("notionAuthTabId");
  const tabId = data.notionAuthTabId;
  if (typeof tabId === "number") { try { await chrome.tabs.remove(tabId); } catch {} }
  await removeStorage("notionAuthTabId");
}

async function fetchNotionConnectionStatus(userIdentifier) {
  const res = await fetch(`${API_BASE}/notion-connection-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIdentifier }),
  });
  if (!res.ok) throw new Error("Failed to check Notion connection");
  return res.json();
}

async function getSessionNotionPageId(sessionId = currentSessionId) {
  if (!sessionId) return null;
  const data = await getStorage("notionSyncedPages");
  return data.notionSyncedPages?.[String(sessionId)] || null;
}

async function setSessionNotionPageId(pageId, sessionId = currentSessionId) {
  if (!pageId || !sessionId) return;
  const data = await getStorage("notionSyncedPages");
  const notionSyncedPages = data.notionSyncedPages || {};
  notionSyncedPages[String(sessionId)] = pageId;
  await setStorage({ notionSyncedPages, notionSyncedPageId: pageId });
}

async function getNotionDestination() {
  const data = await getStorage(["notionDestination", "notionSyncedPageId"]);
  if (data.notionDestination?.id && data.notionDestination?.type) return data.notionDestination;
  if (data.notionSyncedPageId) return { type: "page", id: data.notionSyncedPageId };
  return null;
}

function setNotionButtonLabel(label) {
  if (syncNotionLabel) syncNotionLabel.textContent = label;
}

function stopNotionConnectionPolling() {
  if (notionConnectionPoller) { clearInterval(notionConnectionPoller); notionConnectionPoller = null; }
}

async function checkNotionConnection() {
  const userId = await getNotionUserId();
  try {
    const status = await fetchNotionConnectionStatus(userId);
    await setStorage({ notionConnected: Boolean(status.connected) });
    if (status.connected) await closeNotionAuthTab();
    setNotionButtonLabel(status.connected ? "Sync to Notion" : "Connect Notion");
    return Boolean(status.connected);
  } catch {
    await setStorage({ notionConnected: false });
    setNotionButtonLabel("Connect Notion");
    return false;
  }
}

function startNotionConnectionPolling(userId) {
  stopNotionConnectionPolling();
  let attempts = 0;
  notionConnectionPoller = setInterval(async () => {
    attempts += 1;
    try {
      const status = await fetchNotionConnectionStatus(userId);
      if (status.connected) {
        stopNotionConnectionPolling();
        await setStorage({ notionConnected: true });
        await closeNotionAuthTab();
        setNotionButtonLabel("Sync to Notion");
        if (syncNotionBtn) syncNotionBtn.disabled = false;
        return;
      }
    } catch {}
    if (attempts >= 60) {
      stopNotionConnectionPolling();
      if (syncNotionBtn) syncNotionBtn.disabled = false;
      setNotionButtonLabel("Connect Notion");
    }
  }, 1000);
}

checkNotionConnection();

syncNotionBtn?.addEventListener("click", async () => {
  const userId = await getNotionUserId();
  let connected = false;
  try {
    const status = await fetchNotionConnectionStatus(userId);
    connected = Boolean(status.connected);
    await setStorage({ notionConnected: connected });
  } catch { connected = false; }

  if (!connected) {
    syncNotionBtn.disabled = true;
    setNotionButtonLabel("Finish in Notion…");
    try {
      const res = await fetch(`${API_BASE}/notion-oauth-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdentifier: userId }),
      });
      if (!res.ok) throw new Error("Failed to start OAuth");
      const { authUrl } = await res.json();
      const authTab = await chrome.tabs.create({ url: authUrl });
      if (typeof authTab?.id === "number") await setStorage({ notionAuthTabId: authTab.id });
      startNotionConnectionPolling(userId);
    } catch (e) {
      alert("Failed to connect Notion: " + e.message);
      setNotionButtonLabel("Connect Notion");
      syncNotionBtn.disabled = false;
    }
    return;
  }

  if (!notesMarkdown) { alert("No notes to sync!"); return; }

  syncNotionBtn.disabled = true;
  setNotionButtonLabel("Syncing...");

  try {
    const titleMatch = notesMarkdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Braino Notes";

    const images = [];
    const imgRegex = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g;
    const htmlImgRegex = /<img[^>]+src="(data:image\/[^"]+)"/g;
    let imgMatch;
    let imgIndex = 0;
    while ((imgMatch = imgRegex.exec(notesMarkdown)) !== null) {
      const base64 = imgMatch[1].split(",")[1];
      if (base64) images.push({ id: `img_${Date.now()}_${imgIndex++}`, base64, source: imgMatch[1] });
    }
    while ((imgMatch = htmlImgRegex.exec(notesMarkdown)) !== null) {
      const base64 = imgMatch[1].split(",")[1];
      if (base64) images.push({ id: `img_${Date.now()}_${imgIndex++}`, base64, source: imgMatch[1] });
    }

    const notionPageId = await getSessionNotionPageId();
    const notionDestination = await getNotionDestination();

    const res = await fetch(`${API_BASE}/sync-to-notion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIdentifier: userId,
        title,
        markdown: notesMarkdown,
        notionPageId,
        notionDestination,
        images: images.length > 0 ? images : undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (errData.error?.includes("not connected")) {
        chrome.storage.local.set({ notionConnected: false });
        checkNotionConnection();
        alert("Notion not connected. Please click 'Connect Notion' first.");
      } else {
        throw new Error(errData.error || "Sync failed");
      }
      return;
    }

    const result = await res.json();
    if (result.destination?.id && result.destination?.type) await setStorage({ notionDestination: result.destination });
    if (result.pageId) await setSessionNotionPageId(result.pageId);

    setNotionButtonLabel("Synced! ✓");
    setTimeout(() => setNotionButtonLabel("Sync to Notion"), 2500);
  } catch (e) {
    alert("Sync failed: " + e.message);
    setNotionButtonLabel("Sync to Notion");
  } finally {
    syncNotionBtn.disabled = false;
  }
});


// ===== NEW SESSION =====
newSessionBtn?.addEventListener("click", () => {
  if (!confirm("Start a new session? Current notes and chat will be cleared.")) return;
  audioSegments = [];
  totalRecordedSeconds = 0;
  seconds = 0;
  notesMarkdown = "";
  currentSessionId = null;
  chatMessages = [];
  pendingImageBase64 = null;
  stopTimer();
  chrome.storage.local.remove(["audioSegments", "totalRecordedSeconds", "currentSessionId", "currentNotes", "notionSyncedPageId"]);
  removeRecordingCard();
  chatMessagesEl.innerHTML = "";
  chatArea.querySelectorAll(".notes-ready-card").forEach(el => el.remove());
  chatArea.querySelectorAll(".record-more-card").forEach(el => el.remove());
  notesContent.innerHTML = "";
  updateChatContextUI();
  updateEmptyState();
  updateHistoryBtnVisibility();
});

// ===== REMOTE AGENT (phone → desktop) =====
let remotePollingInterval = null;
let remoteProcessingId = null; // ID of command currently being run

function clearRemoteProcessing() {
  remoteProcessingId = null;
  chrome.storage.local.remove("remoteProcessingId");
}

async function getAuthToken() {
  const data = await getStorage(["authToken", "authRefreshToken"]);
  if (data.authToken) return data.authToken;
  if (data.authRefreshToken) {
    return (await refreshAuthToken(data.authRefreshToken)) || null;
  }
  return null;
}

async function pollRemoteCommands() {
  if (agentRunning) return; // don't stack if agent already running
  let token = await getAuthToken();
  if (!token) {
    console.log("[RemoteAgent] No auth token — not logged in yet");
    return;
  }

  try {
    let res = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    // JWT expired — refresh and retry once
    if (res.status === 401) {
      const data = await getStorage(["authRefreshToken"]);
      if (data.authRefreshToken) {
        const newToken = await refreshAuthToken(data.authRefreshToken);
        if (newToken) {
          token = newToken;
          res = await fetch(
            `${SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
          );
        }
      }
    }
    if (!res.ok) {
      const text = await res.text();
      console.warn("[RemoteAgent] Poll failed:", res.status, text);
      return;
    }
    const rows = await res.json();
    console.log("[RemoteAgent] Poll result:", rows.length, "pending commands");
    const [cmd] = rows;
    if (!cmd || cmd.id === remoteProcessingId) return;

    console.log("[RemoteAgent] Picking up command:", cmd.id, cmd.task);
    remoteProcessingId = cmd.id;
    await runRemoteCommand(cmd, token);
  } catch (e) {
    console.error("[RemoteAgent] Poll error:", e);
  }
}

async function updateRemoteCommand(id, token, patch) {
  await fetch(`${SUPABASE_URL}/rest/v1/agent_commands?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

async function runRemoteCommand(cmd, token) {
  if (!(await loadPremiumStatus())) {
    await updateRemoteCommand(cmd.id, token, { status: "error", result: "Premium required to run remote commands." });
    clearRemoteProcessing();
    return;
  }

  await updateRemoteCommand(cmd.id, token, { status: "running", steps: [] });

  // Show task in side panel chat (same as regular agent)
  chatMessages.push({ role: "user", content: `📱 ${cmd.task}` });
  saveChatMessages();
  updateEmptyState();
  const remoteBlock = createAgentThinkingBlock(cmd.task);
  chatArea.scrollTop = chatArea.scrollHeight;

  const steps = [];
  const history = [];
  const MAX = 20;
  let iterations = 0;
  let stepCount = 0;

  const pushStep = async (description, ok, snapshot = null) => {
    steps.push({ description, ok, snapshot });
    stepCount++;
    agentAddStep(remoteBlock, description, ok ? "step" : "error");
    await updateRemoteCommand(cmd.id, token, { steps });
  };

  try {
    const adapterMessage = await (async () => {
      const siteContext = await getSiteAdapterContext();
      const parsed = parseAdapterTask(cmd.task, siteContext);
      if (!parsed) return null;

      const runRemoteAdapterStep = async (description, type, run) => {
        const result = await run();
        history.push({ type: type || "adapter", description, result });
        await pushStep(description, !result?.error, result?.snapshot || null);
        if (result?.error) throw new Error(result.error);
        return result;
      };

      if (parsed.adapter === "spotify" && parsed.intent === "addSongToPlaylist") {
        await runRemoteAdapterStep(`Open Spotify search for "${parsed.song}"`, "navigate", async () => {
          const result = await executeAgentAction({
            type: "navigate",
            url: buildSpotifyTrackSearchUrl(parsed.song),
            description: `Open Spotify search for "${parsed.song}"`,
          });
          if (!result?.error) {
            await waitForTabReady(6000);
            await new Promise(r => setTimeout(r, 900));
          }
          return result;
        });
        await runRemoteAdapterStep(`Add "${parsed.song}" to the exact playlist "${parsed.playlist}"`, "spotifyAddTrackToPlaylist", () =>
          executeSiteAdapterAction({ type: "spotifyAddTrackToPlaylist", songName: parsed.song, playlistName: parsed.playlist })
        );
        return `Added **${parsed.song}** to **${parsed.playlist}** on Spotify.`;
      }

      if (parsed.adapter === "spotify" && parsed.intent === "playSongFromPlaylist") {
        await runRemoteAdapterStep("Open your Spotify playlists library", "navigate", async () => {
          const result = await executeAgentAction({
            type: "navigate",
            url: "https://open.spotify.com/collection/playlists",
            description: "Open your Spotify playlists library",
          });
          if (!result?.error) {
            await waitForTabReady(6000);
            await new Promise(r => setTimeout(r, 900));
          }
          return result;
        });
        await runRemoteAdapterStep(`Open the exact playlist "${parsed.playlist}"`, "spotifyOpenPlaylist", async () => {
          const result = await executeSiteAdapterAction({ type: "spotifyOpenPlaylist", playlistName: parsed.playlist });
          if (!result?.error) {
            await new Promise(r => setTimeout(r, 1200));
            const verify = await getSiteAdapterContext();
            if (!verify?.currentPlaylistName || verify.currentPlaylistName.trim().toLowerCase() !== parsed.playlist.trim().toLowerCase()) {
              return { error: `Opened the wrong playlist. Expected "${parsed.playlist}", got "${verify?.currentPlaylistName || "unknown"}".` };
            }
          }
          return result;
        });
        await runRemoteAdapterStep(`Play "${parsed.song}" from "${parsed.playlist}"`, "spotifyPlayTrackFromCurrentPlaylist", () =>
          executeSiteAdapterAction({ type: "spotifyPlayTrackFromCurrentPlaylist", songName: parsed.song })
        );
        return `Playing **${parsed.song}** from **${parsed.playlist}** on Spotify.`;
      }

      if (parsed.adapter === "spotify" && parsed.intent === "playSong") {
        await runRemoteAdapterStep(`Open Spotify search for "${parsed.song}"`, "navigate", async () => {
          const result = await executeAgentAction({
            type: "navigate",
            url: buildSpotifyTrackSearchUrl(parsed.song),
            description: `Open Spotify search for "${parsed.song}"`,
          });
          if (!result?.error) {
            await waitForTabReady(6000);
            await new Promise(r => setTimeout(r, 900));
          }
          return result;
        });
        await runRemoteAdapterStep(`Play the best Spotify result for "${parsed.song}"`, "spotifyPlayFirstTrackResult", () =>
          executeSiteAdapterAction({ type: "spotifyPlayFirstTrackResult", songName: parsed.song })
        );
        return `Playing **${parsed.song}** on Spotify.`;
      }

      if (parsed.adapter === "spotify" && parsed.intent === "addCurrentPageSong") {
        const rawTitle = String(currentPageContext?.title || "").trim();
        if (!rawTitle) throw new Error("I couldn't read the current page title. Make sure you're on YouTube or a music page.");

        const songQuery = extractSongFromPageTitle(rawTitle, currentPageContext?.url || "");

        const searchResult = await (async () => {
          const data = await callSpotifyFunction("spotify-search", { query: songQuery, limit: 1 });
          const track = data?.tracks?.[0];
          if (!track) throw new Error(`No Spotify track found for "${songQuery}".`);
          history.push({ type: "spotify_search", description: `Search Spotify for "${songQuery}"`, result: { success: true, track } });
          await pushStep(`Found "${track.name}" by ${track.artists?.join(", ") || "unknown"} on Spotify`, true, null);
          return track;
        })();

        const destination = parsed.playlist ? `playlist "${parsed.playlist}"` : "Liked Songs";

        await (async () => {
          const payload = parsed.playlist
            ? { action: "addToPlaylist", trackId: searchResult.id, playlistName: parsed.playlist }
            : { action: "like", trackId: searchResult.id };
          const result = await callSpotifyFunction("spotify-add-track", payload);
          history.push({ type: "spotify_add_track", description: `Add to ${destination}`, result });
          await pushStep(`Added to ${destination}`, true, null);
        })();

        const artistStr = searchResult.artists?.length ? ` by ${searchResult.artists.join(", ")}` : "";
        return `Added **${searchResult.name}**${artistStr} to **${destination}** on Spotify.`;
      }

      if (parsed.adapter === "google-docs" && parsed.intent === "researchArticle") {
        const draft = await runRemoteAdapterStep(`Research "${parsed.topic}" on the live web`, "web_search", async () => {
          const article = await buildArticleDraftFromWebSearch(parsed.topic);
          return { success: true, ...article };
        });
        await runRemoteAdapterStep("Open a fresh Google Doc", "navigate", async () => {
          const result = await executeAgentAction({
            type: "navigate",
            url: "https://docs.new",
            description: "Open a fresh Google Doc",
          });
          if (!result?.error) {
            await waitForTabReady(8000);
            await new Promise(r => setTimeout(r, 1800));
          }
          return result;
        });
        await runRemoteAdapterStep("Write the article into the Google Doc body", "googleDocsWriteArticle", () =>
          executeSiteAdapterAction({ type: "googleDocsWriteArticle", title: draft.title, body: draft.body })
        );
        return `Drafted an article about **${parsed.topic}** in a Google Doc.`;
      }

      return null;
    })();

    if (adapterMessage) {
      agentFinalizeBlock(remoteBlock, stepCount);
      const doneBubble = document.createElement("div");
      doneBubble.className = "chat-bubble chat-assistant";
      doneBubble.innerHTML = `<div class="chat-bubble-text">✅ ${adapterMessage}</div>`;
      chatMessagesEl.appendChild(doneBubble);
      chatArea.scrollTop = chatArea.scrollHeight;
      await updateRemoteCommand(cmd.id, token, { status: "done", result: adapterMessage, steps });
      clearRemoteProcessing();
      return;
    }
  } catch (e) {
    await updateRemoteCommand(cmd.id, token, { status: "error", result: `Error: ${e.message}`, steps });
    clearRemoteProcessing();
    return;
  }

  while (iterations++ < MAX) {
    if (agentShouldStop) break;

    const pageInfo = await getAgentPageContext();
    let actions = tryFastPath(cmd.task, history);
    if (!actions) {
      try {
        actions = await callAgentStep(cmd.task, pageInfo, history, []);
      } catch (e) {
        await updateRemoteCommand(cmd.id, token, { status: "error", result: `Error: ${e.message}`, steps });
        clearRemoteProcessing();
        return;
      }
    }

    const first = actions[0];
    if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
      if (first.type === "done") {
        const realDone = history.filter(h => ["click","type","pressKey","selectOption"].includes(h.type) && h.result?.success);
        const needsActions = /send|submit|reply|compose|type|fill|click|buy|order|play|post|write|upload/i.test(cmd.task);
        if (needsActions && realDone.length === 0) {
          history.push({ type: "correction", description: "No real actions yet — keep going.", result: { success: false } });
          continue;
        }
      }
      const doneMsg = first.message || "Done.";
      agentFinalizeBlock(remoteBlock, stepCount);
      const doneBubble = document.createElement("div");
      doneBubble.className = "chat-bubble chat-assistant";
      doneBubble.innerHTML = `<div class="chat-bubble-text">✅ ${doneMsg}</div>`;
      chatMessagesEl.appendChild(doneBubble);
      chatArea.scrollTop = chatArea.scrollHeight;
      await updateRemoteCommand(cmd.id, token, { status: "done", result: doneMsg, steps });
      clearRemoteProcessing();
      return;
    }

    for (const actionObj of actions) {
      if (agentShouldStop) break;
      if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
        const doneMsg2 = actionObj.message || "Done.";
        agentFinalizeBlock(remoteBlock, stepCount);
        const doneBubble2 = document.createElement("div");
        doneBubble2.className = "chat-bubble chat-assistant";
        doneBubble2.innerHTML = `<div class="chat-bubble-text">✅ ${doneMsg2}</div>`;
        chatMessagesEl.appendChild(doneBubble2);
        chatArea.scrollTop = chatArea.scrollHeight;
        await updateRemoteCommand(cmd.id, token, { status: "done", result: doneMsg2, steps });
        clearRemoteProcessing();
        return;
      }

      const result = await executeAgentAction(actionObj);
      let snapshot = null;
      if (!result?.error && SNAPSHOT_ACTIONS.has(actionObj.type)) {
        if (actionObj.type === "navigate") {
          await waitForTabReady(5000);
          await new Promise(r => setTimeout(r, 300));
        } else {
          await new Promise(r => setTimeout(r, 400));
        }
        snapshot = await getPageSnapshot();
      } else {
        await new Promise(r => setTimeout(r, 150));
      }

      history.push({ ...actionObj, result, snapshot });
      await pushStep(actionObj.description || actionObj.type, !result?.error, snapshot);

      if (result?.error) { await new Promise(r => setTimeout(r, 600)); break; }
    }
  }

  agentFinalizeBlock(remoteBlock, stepCount);
  const errBubble = document.createElement("div");
  errBubble.className = "chat-bubble chat-assistant";
  errBubble.innerHTML = `<div class="chat-bubble-text">❌ Ran out of steps. Check your desktop browser.</div>`;
  chatMessagesEl.appendChild(errBubble);
  chatArea.scrollTop = chatArea.scrollHeight;
  await updateRemoteCommand(cmd.id, token, {
    status: "error",
    result: "Ran out of steps. Check your desktop browser.",
    steps,
  });
  clearRemoteProcessing();
}

function startRemotePolling() {
  if (remotePollingInterval) return;
  console.log("[RemoteAgent] Side panel polling started (4s interval)");
  remotePollingInterval = setInterval(pollRemoteCommands, 4000);
  pollRemoteCommands(); // immediate first check
}

// Always start polling — pollRemoteCommands handles missing auth/premium gracefully
startRemotePolling();

// ===== INITIAL LOAD =====
hydrateTrackedTabState();
updateHistoryBtnVisibility();

chrome.storage.local.get(["currentNotes", "currentSessionId", "pendingRemoteCommand"], (data) => {
  if (data.currentNotes && data.currentSessionId) {
    notesMarkdown = data.currentNotes;
    currentSessionId = data.currentSessionId;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    injectNotesReadyCard();
    loadChatMessages(data.currentSessionId);
  }
  updateChatContextUI();
  updateEmptyState();

  // Handle a remote command that background.js queued while panel was closed
  if (data.pendingRemoteCommand) {
    chrome.storage.local.remove("pendingRemoteCommand");
    try {
      const cmd = typeof data.pendingRemoteCommand === "string"
        ? JSON.parse(data.pendingRemoteCommand)
        : data.pendingRemoteCommand;
      getAuthToken().then(token => {
        if (token) runRemoteCommand(cmd, token);
      });
    } catch (e) { console.error("[RemoteAgent] Failed to parse pending command", e); }
  }
});
