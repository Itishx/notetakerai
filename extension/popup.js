// SideBrain Popup Controller — Unified Chat UI
const API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

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
let currentMode = "page"; // "page" | "lecture" | "meeting" | "general" | "agent"
let currentAiProvider = "lovable"; // "lovable" | "claude"
let agentRunning = false;
let agentShouldStop = false;
let isPremium = false;

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
  agent: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="8.5" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14" r="1.5" fill="currentColor" stroke="none"/><path d="M9 19h6"/></svg>`,
};

// ===== DOM REFS =====
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
const historyBtn = document.getElementById("historyBtn");
const historyBackBtn = document.getElementById("historyBackBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const emptyState = document.getElementById("emptyState");
const userGreeting = document.getElementById("userGreeting");
const newSessionBtn = document.getElementById("newSessionBtn");
const infoBtn = document.getElementById("infoBtn");
const infoPopover = document.getElementById("infoPopover");
const infoWrap = document.getElementById("infoWrap");
const modelBtn = document.getElementById("modelBtn");
const modelPopover = document.getElementById("modelPopover");
const modelWrap = document.getElementById("modelWrap");
const modelLabel = document.getElementById("modelLabel");

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
  if (r.aiProvider) {
    currentAiProvider = r.aiProvider;
    updateModelUI();
  }
});

function updateModelUI() {
  if (modelLabel) modelLabel.textContent = currentAiProvider === "claude" ? "Claude Sonnet 4.6" : "SideBrain AI";
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
    if (!data.onboardingDone) {
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
      chrome.tabs.create({ url: `https://notetakerai.lovable.app/auth/extension?ext=${extId}&mode=signup` });
      finishOnboarding();
    });

    document.getElementById("onboardingSignInBtn")?.addEventListener("click", () => {
      const extId = chrome.runtime.id;
      chrome.tabs.create({ url: `https://notetakerai.lovable.app/auth/extension?ext=${extId}&mode=signin` });
      finishOnboarding();
    });
  });
}


// ===== MODE SELECTOR =====
function setMode(mode) {
  currentMode = mode;
  chrome.storage.local.set({ currentMode: mode });
  if (modeSelectorBtn) modeSelectorBtn.innerHTML = MODE_ICONS[mode] || MODE_ICONS.page;
  modeDropup?.classList.add("hidden");
  updateChatContextUI();
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

// Restore saved mode
chrome.storage.local.get("currentMode", (data) => {
  setMode(data.currentMode || "page");
});


// ===== RECORDING CARD =====
function createRecordingCard() {
  if (recordingCardEl) return; // already active

  const card = document.createElement("div");
  card.id = "recordingCard";
  card.className = "recording-card";
  card.innerHTML = `
    <div class="orb-hero orb-recording"></div>
    <div class="recording-meta">
      <span id="recTimer">00:00</span>
      <span class="sep">·</span>
      <span id="recSegment">Recording...</span>
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
}

function injectNotesReadyCard() {
  // Remove any existing notes-ready cards first
  chatArea.querySelectorAll(".notes-ready-card").forEach(el => el.remove());

  const card = document.createElement("div");
  card.className = "notes-ready-card";
  card.innerHTML = `
    <span class="notes-ready-icon">📝</span>
    <span>Notes are ready</span>
    <button class="open-notes-btn">Open Notes →</button>
  `;
  card.querySelector(".open-notes-btn").addEventListener("click", () => {
    notesOverlay.classList.remove("hidden");
  });
  chatArea.appendChild(card);
  chatArea.scrollTop = chatArea.scrollHeight;

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    card.classList.add("notes-ready-fade");
    setTimeout(() => { if (card.parentNode) card.remove(); }, 400);
  }, 5000);
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
}

function updateSegmentUI() {
  if (!recSegmentEl) return;
  if (audioSegments.length === 0) {
    recSegmentEl.textContent = isRecording ? "Recording..." : "Ready";
  } else {
    const segNum = audioSegments.length;
    const total = formatTime(totalRecordedSeconds);
    recSegmentEl.textContent = `${segNum} segment${segNum > 1 ? "s" : ""} · ${total}`;
  }
}

function updateConvertButtonLabel() {
  if (!convertBtn) return;
  const label = hasExistingNotes() ? "Update Notes" : "Convert to Notes";
  convertBtn.innerHTML = `${CONVERT_BUTTON_ICON} ${label}`;
}


// ===== PAGE CONTEXT =====
function fetchPageContext() {
  chrome.runtime.sendMessage({ action: "getPageContent" }, (res) => {
    if (chrome.runtime.lastError || res?.error || !res?.text) {
      currentPageContext = null;
      updateChatContextUI();
      return;
    }
    currentPageContext = { title: res.title, url: res.url, text: res.text };
    updateChatContextUI();
  });
}

function updateChatContextUI() {
  if (!chatInput) return;
  const hasNotes = hasExistingNotes();
  const hasPage = !!currentPageContext;

  if (currentMode === "lecture") {
    chatInput.placeholder = recordingCardEl
      ? "Ask a question while recording..."
      : "Press Enter to start recording lecture...";
  } else if (currentMode === "meeting") {
    chatInput.placeholder = recordingCardEl
      ? "Ask a question while recording..."
      : "Press Enter to start recording meeting...";
  } else if (currentMode === "page") {
    if (hasNotes && hasPage) chatInput.placeholder = "Ask about notes or this page...";
    else if (hasPage) chatInput.placeholder = "Ask about this page...";
    else chatInput.placeholder = "Ask about this page...";
  } else if (currentMode === "agent") {
    if (!agentRunning) chatInput.placeholder = "Tell the agent what to do on this page...";
  } else {
    chatInput.placeholder = hasNotes ? "Ask about your notes..." : "Ask anything...";
  }
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

    // Update UI
    removeRecordingCard();
    injectNotesReadyCard();
    notesOverlay.classList.remove("hidden");
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
historyBtn?.addEventListener("click", () => {
  loadHistory();
  historyOverlay.classList.remove("hidden");
  setTimeout(() => historyOverlay.classList.add("open"), 10);
});

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
      item.addEventListener("click", () => {
        notesMarkdown = entry.notes;
        currentSessionId = entry.id;
        chrome.storage.local.set({ currentSessionId, currentNotes: notesMarkdown });
        notesContent.innerHTML = renderMarkdown(notesMarkdown);
        injectNotesReadyCard();
        updateChatContextUI();
        loadChatMessages(currentSessionId);
        closeHistory();
        notesOverlay.classList.remove("hidden");
      });
      historyList.appendChild(item);
    });
  });
}


// ===== CHAT =====
function loadChatMessages(sessionId) {
  const key = `chat_${sessionId}`;
  chrome.storage.local.get(key, (data) => {
    chatMessages = data[key] || [];
    renderChatMessages();
  });
}

function saveChatMessages() {
  if (!currentSessionId) return;
  const key = `chat_${currentSessionId}`;
  chrome.storage.local.set({ [key]: chatMessages });
}

function renderChatMessages() {
  chatMessagesEl.innerHTML = "";
  chatMessages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-${msg.role}`;
    if (msg.image) bubble.innerHTML += `<img src="${msg.image}" alt="Attached image" class="chat-msg-image" />`;
    bubble.innerHTML += `<div class="chat-bubble-text">${renderMarkdown(msg.content)}</div>`;
    chatMessagesEl.appendChild(bubble);
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

async function sendChatMessage(text, imageBase64) {
  if (!text && !imageBase64) return;
  const allowed = await checkChatLimit();
  if (!allowed) return;
  await incrementChatCount();

  const userMsg = { role: "user", content: text || "📎 Image attached — please insert into notes" };
  if (imageBase64) userMsg.image = `data:image/png;base64,${imageBase64}`;
  chatMessages.push(userMsg);
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
    const body = {
      notes: notesCtx.sanitizedNotes,
      message: text || "Please insert this diagram/image into my notes at the most appropriate location.",
      aiProvider: currentAiProvider,
    };
    if (currentPageContext) body.pageContext = currentPageContext;
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
}

// ---- Agent thinking block (Claude-style collapsible) ----
function createAgentThinkingBlock() {
  const block = document.createElement("div");
  block.className = "agent-thinking-block";
  block.innerHTML = `
    <div class="agent-thinking-header">
      <span class="agent-thinking-spinner"></span>
      <span class="agent-thinking-label">Agent is thinking…</span>
      <span class="agent-thinking-chevron">▾</span>
    </div>
    <div class="agent-thinking-steps"></div>
  `;
  block.querySelector(".agent-thinking-header").addEventListener("click", () => {
    block.classList.toggle("collapsed");
  });
  chatMessagesEl.appendChild(block);
  chatArea.scrollTop = chatArea.scrollHeight;
  return block;
}

function agentAddStep(block, text, type = "step") {
  const steps = block.querySelector(".agent-thinking-steps");
  steps.querySelectorAll(".agent-step-pending").forEach(el => el.remove());
  const line = document.createElement("div");
  line.className = `agent-step agent-step-${type}`;
  line.textContent = text;
  steps.appendChild(line);
  const pending = document.createElement("div");
  pending.className = "agent-step agent-step-pending";
  pending.textContent = "Thinking…";
  steps.appendChild(pending);
  chatArea.scrollTop = chatArea.scrollHeight;
  return line;
}

function agentMarkStepResult(stepEl, success, errorMsg) {
  if (!stepEl) return;
  stepEl.textContent = (success ? "✓ " : "✗ ") + stepEl.textContent;
  if (!success) {
    stepEl.classList.add("agent-step-error");
    const err = document.createElement("div");
    err.className = "agent-step agent-step-error agent-step-sub";
    err.textContent = `  ↳ ${errorMsg}`;
    stepEl.after(err);
  }
}

function agentFinalizeBlock(block, stepCount) {
  // Remove pending line
  block.querySelector(".agent-step-pending")?.remove();
  // Collapse header to summary
  block.classList.add("collapsed");
  const header = block.querySelector(".agent-thinking-header");
  header.querySelector(".agent-thinking-spinner").style.display = "none";
  header.querySelector(".agent-thinking-label").textContent = `Agent · ${stepCount} step${stepCount !== 1 ? "s" : ""}`;
  header.querySelector(".agent-thinking-chevron").textContent = "▸";
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
    ? history.map((h, i) => `Step ${i + 1}: ${h.description} → ${h.result?.success ? "✓ OK" : ("✗ " + (h.result?.error || "FAILED"))}`).join("\n")
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
Post tweet: navigate → https://x.com/compose/tweet → wait 1000
  → type selector="[data-testid='tweetTextarea_0']"
  → click selector="[data-testid='tweetButtonInline']"
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
Send message: click selector="[data-tab='3']" (search) → type contact name → wait 600
  → click contact in list → type selector="[data-tab='10']" or [aria-label*="Type a message"] → pressKey Enter`;

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

  const agentSystemPrompt = `You are SideBrain Browser Agent. Automate a real Chrome browser by returning JSON actions.
Respond ONLY with a JSON object or array. Zero prose. Zero explanation. Zero markdown fences.

MINDSET: You are a browser robot, not a chatbot. Every task is solved by executing actions.
- Infer everything possible. NEVER ask about things you can figure out.
- Never return done/answer before taking the required browser actions.
- If STEPS TAKEN SO FAR is empty → you have done NOTHING yet → start executing immediately.
- If task is a pure question with no browser actions needed → {"type":"answer","message":"..."}

ACTIONS:
{"type":"navigate","url":"https://...","description":"..."}
{"type":"click","selector":"css","targetText":"fallback","description":"..."}
{"type":"type","selector":"css","targetText":"fallback","text":"...","description":"..."}
{"type":"pressKey","key":"Enter","description":"..."}
{"type":"selectOption","selector":"css","value":"option text","description":"..."}
{"type":"scroll","direction":"down","amount":400,"description":"..."}
{"type":"wait","ms":1500,"description":"..."}
{"type":"done","message":"what was accomplished"}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}  ← ONLY when genuinely blocked with no way to infer

SELECTOR PRIORITY:
1. sel= value shown in INTERACTIVE ELEMENTS
2. [aria-label="..."] or [role="button"][aria-label="..."]
3. [data-testid="..."]
4. [placeholder="..."] or [name="..."]
5. targetText fallback (fuzzy visible text match)

BATCHING: Return array of up to 5 actions for predictable sequences. NEVER batch navigate.
Example: [{"type":"type",...},{"type":"pressKey","key":"Tab"},{"type":"type",...},{"type":"pressKey","key":"Enter"}]

RULES:
1. STEPS TAKEN SO FAR is the ground truth. Empty = nothing done. Start from step 1.
2. Never return done unless steps confirm ALL required actions succeeded.
3. Never repeat a failed selector — switch strategy immediately.
4. After navigate → always wait before clicking (pages need load time).
5. Forms: type → Tab → next field. Final field → Enter or click Submit/Send.
6. TODAY: ${today}. Calculate all relative dates yourself. Never ask for the date.
7. Failed click → try scroll first, then different selector, then targetText.
8. Flights: IATA codes + date as DD/MM/YYYY. Never touch date pickers.

${getPlatformGuide(currentUrl)}

FAILURE RECOVERY:
- Element not found → try aria-label, data-testid, placeholder, then targetText
- Page not loaded → add {"type":"wait","ms":1500} before next action
- Form not responding → click field first, then type
- Repeated failure → scroll to find element, then retry`;

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

function stopCurrentTTS() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (voiceWordIntervalId) { clearInterval(voiceWordIntervalId); voiceWordIntervalId = null; }
  isVoiceSpeaking = false;
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
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);

    // Progressive subtitle: sliding window of last 10 words being spoken
    if (onWordUpdate) {
      const words = clean.split(" ").filter(Boolean);
      const totalMs = Math.max((blob.size / 8000) * 1000, words.length * 150);
      const msPerWord = Math.min(totalMs / words.length, 500);
      let i = 0;
      voiceWordIntervalId = setInterval(() => {
        if (i < words.length) {
          i++;
          // Show only the last 10 words currently being spoken
          onWordUpdate(words.slice(Math.max(0, i - 10), i).join(" "));
        } else {
          clearInterval(voiceWordIntervalId);
          voiceWordIntervalId = null;
        }
      }, msPerWord);
    }

    isVoiceSpeaking = true;
    await new Promise(resolve => {
      currentAudio.onended = () => { stopCurrentTTS(); resolve(); };
      currentAudio.onerror = () => { stopCurrentTTS(); resolve(); };
      currentAudio.play().catch(() => { stopCurrentTTS(); resolve(); });
    });
    URL.revokeObjectURL(url);
  } catch (e) {
    stopCurrentTTS();
    console.warn("ElevenLabs TTS error:", e);
  }
}

// ===== VOICE MODE =====
let voiceActive = false;

const voiceOverlay  = document.getElementById("voiceOverlay");
const voiceOrb      = document.getElementById("voiceOrb");
const voiceUserText = document.getElementById("voiceUserText");
const voiceAgentText= document.getElementById("voiceAgentText");
const voiceModeBtn  = document.getElementById("voiceModeBtn");
const voiceCloseBtn = document.getElementById("voiceCloseBtn");

function setOrbState(state) {
  if (voiceOrb) voiceOrb.className = `voice-orb ${state}`;
}

function setSubtitles(user, agent) {
  if (voiceUserText)  voiceUserText.textContent  = user  || "";
  if (voiceAgentText) voiceAgentText.textContent = agent || "";
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

async function openVoiceMode() {
  voiceActive = true;
  voiceOverlay?.classList.remove("hidden");
  setOrbState("listening");
  setSubtitles("", "Starting…");

  const tabId = await getActiveTabId();
  if (!tabId) {
    setSubtitles("", "No active tab. Open a webpage first, then try voice mode.");
    setOrbState("idle");
    return;
  }

  const res = await sendToContentScript(tabId, "startVoiceListening");
  if (res?.error) {
    setSubtitles("", "Could not start voice: " + res.error);
    setOrbState("idle");
  }
}

async function closeVoiceMode() {
  voiceActive = false;
  stopCurrentTTS();
  voiceOverlay?.classList.add("hidden");
  setOrbState("idle");
  const tabId = await getActiveTabId();
  if (tabId) sendToContentScript(tabId, "stopVoiceListening");
}

// Receive voice events relayed from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "voiceEvent" || !voiceActive) return;

  if (msg.event === "listening") {
    // Only update UI if we're not mid-processing or speaking
    if (!isVoiceSpeaking) {
      setOrbState("listening");
      setSubtitles("", "Listening…");
    }
  } else if (msg.event === "transcript") {
    if (!msg.isFinal) {
      // Interim: show what user is saying
      if (voiceUserText) voiceUserText.textContent = msg.text || "";
    } else {
      // Final transcript — interrupt TTS if speaking, then process
      if (isVoiceSpeaking) {
        stopCurrentTTS();
        if (voiceAgentText) voiceAgentText.textContent = "";
      }
      handleVoiceInput(msg.text.trim());
    }
  } else if (msg.event === "error") {
    if (!isVoiceSpeaking) {
      setOrbState("idle");
      setSubtitles("", msg.message === "not-allowed"
        ? "Microphone blocked. Click the mic button again and allow access when prompted."
        : `Error: ${msg.message}`);
    }
  }
});

// Detect if a voice command is a browser action request
function isBrowserActionCommand(text) {
  return /\b(open|go to|navigate to|search for|play|send|click|find|buy|order|type|compose|reply to|download|post on|scroll|refresh|close tab|new tab|visit|book)\b/i.test(text);
}

let voiceHandlingToken = 0;

async function handleVoiceInput(text) {
  if (!text || !voiceActive) return;

  // Cancel any in-progress request (agent loop, TTS, fetch)
  agentShouldStop = true;
  stopCurrentTTS();
  const myToken = ++voiceHandlingToken;
  // Brief gap so previous async calls can detect cancellation
  await new Promise(r => setTimeout(r, 60));
  if (voiceHandlingToken !== myToken || !voiceActive) return;
  agentShouldStop = false;

  setOrbState("processing");
  if (voiceUserText) voiceUserText.textContent = text;
  if (voiceAgentText) voiceAgentText.textContent = "Thinking…";

  // Auto-route to agent if request sounds like a browser action
  // (even if mode isn't explicitly "agent", unless in lecture/meeting mode)
  const useAgent = currentMode === "agent" ||
    (isBrowserActionCommand(text) && currentMode !== "lecture" && currentMode !== "meeting");

  let reply;

  try {
    if (useAgent) {
      reply = await runAgentLoopForVoice(text);
    } else {
      // Use same rich context as sendChatMessage — notes + page context + chat history + mode
      const hasNotes = hasExistingNotes();
      const notesCtx = hasNotes ? buildNotesContextForAI(notesMarkdown) : { sanitizedNotes: "", existingImages: {} };

      const body = {
        notes: notesCtx.sanitizedNotes,
        message: text,
        aiProvider: currentAiProvider,
        chatHistory: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      };

      if (currentMode === "page" && currentPageContext) {
        body.pageContext = currentPageContext;
      }

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
      renderChatMessages();
    }

    setOrbState("speaking");
    if (voiceAgentText) voiceAgentText.textContent = "";
    await speakText(reply, (words) => {
      if (voiceAgentText) voiceAgentText.textContent = words;
    });
  } catch(e) {
    if (voiceAgentText) voiceAgentText.textContent = "Something went wrong. Try again.";
  }

  // Content script auto-restarts recognition — just update orb state
  if (voiceActive && !isVoiceSpeaking) {
    setOrbState("listening");
    setSubtitles("", "Listening…");
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
    const thinkingBlock = createAgentThinkingBlock();

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
        if (history.length === 0) thinkingBlock.remove();
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
        history.push({ ...actionObj, result });
        agentMarkStepResult(stepEl, !result?.error, result?.error);
        if (result?.error) { await new Promise(r => setTimeout(r, 600)); break; }
        if (actionObj.type === "navigate") {
          await waitForTabReady(5000);
          await new Promise(r => setTimeout(r, 300));
        } else {
          await new Promise(r => setTimeout(r, 150));
        }
      }
      await new Promise(r => setTimeout(r, 150));
    }

    finish("I ran out of steps. Please check the page.");
  });
}

voiceModeBtn?.addEventListener("click", openVoiceMode);
voiceCloseBtn?.addEventListener("click", closeVoiceMode);

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
  const thinkingBlock = createAgentThinkingBlock();

  const finish = (msg) => {
    agentFinalizeBlock(thinkingBlock, history.length);
    chatMessages.push({ role: "assistant", content: msg });
    renderChatMessages();
    saveChatMessages();
    setAgentRunningUI(false);
  };

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

      if (history.length === 0) thinkingBlock.remove();
      finish(firstAction.message || "Done.");
      return;
    }

    // Execute each action in the batch
    let batchError = false;
    for (const actionObj of actions) {
      if (agentShouldStop) { finish("⏹ Stopped."); return; }

      // Terminal types mid-batch shouldn't happen, but handle gracefully
      if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
        finish(actionObj.message || "Done.");
        return;
      }

      const desc = actionObj.description || actionObj.type;
      const stepEl = agentAddStep(thinkingBlock, desc);

      const result = await executeAgentAction(actionObj);
      history.push({ ...actionObj, result });
      agentMarkStepResult(stepEl, !result?.error, result?.error);

      if (result?.error) {
        // On error: pause, then break batch and re-query LLM
        await new Promise(r => setTimeout(r, 600));
        batchError = true;
        break;
      }

      if (actionObj.type === "navigate") {
        // Smart wait: poll until tab is loaded instead of fixed 3500ms
        await waitForTabReady(5000);
        await new Promise(r => setTimeout(r, 300)); // small buffer for content script
      } else {
        // Short settle time between batch steps
        await new Promise(r => setTimeout(r, 150));
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

  if (looksLikeAnswerRequest(text) && !img) {
    showAnswerConfirm(text, img);
  } else {
    sendChatMessage(text, img);
  }
}

const SEND_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>`;
const STOP_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;

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
const SUPABASE_URL = "https://ovapacfrzddnhrwvkbkr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo";
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
  const data = await getStorage(["authToken", "authRefreshToken", "authUserId", "isPremium", "isPremiumCachedAt"]);
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
    chrome.tabs.create({ url: "https://notetakerai.lovable.app/premium" });
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
const WEBSITE_URL = "https://notetakerai.lovable.app";
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
let currentAuthUser = null;

function getTimeGreeting(name) {
  const h = new Date().getHours();
  let prefix;
  if (h >= 5 && h < 12)       prefix = "Good morning";
  else if (h >= 12 && h < 17) prefix = "Good afternoon";
  else if (h >= 17 && h < 23) prefix = "Good evening";
  else                         prefix = "It's late";
  return name ? `${prefix}, ${name}` : prefix;
}

function updateAuthUI() {
  chrome.storage.local.get(["authToken", "authDisplayName", "authEmail", "authUserId"], (data) => {
    if (data.authToken && data.authDisplayName) {
      currentAuthUser = { token: data.authToken, name: data.authDisplayName, email: data.authEmail, userId: data.authUserId };
      const firstName = data.authDisplayName.split(" ")[0];
      if (userGreeting) userGreeting.textContent = getTimeGreeting(firstName);
      void loadPremiumStatus(true);
    } else {
      currentAuthUser = null;
      isPremium = false;
      if (userGreeting) userGreeting.textContent = getTimeGreeting(null);
      void removeStorage(["isPremium", "isPremiumCachedAt"]);
    }
  });
}

updateAuthUI();

loginBtn?.addEventListener("click", () => {
  const extId = chrome.runtime.id;
  chrome.tabs.create({ url: `${WEBSITE_URL}/auth/extension?ext=${extId}` });
});

logoutBtn?.addEventListener("click", () => {
  chrome.storage.local.remove(["authToken", "authRefreshToken", "authDisplayName", "authEmail", "authUserId", "isPremium", "isPremiumCachedAt"]);
  updateAuthUI();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.authToken || changes.authDisplayName || changes.authUserId)) updateAuthUI();
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
    const title = titleMatch ? titleMatch[1] : "SideBrain Notes";

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
  notesContent.innerHTML = "";
  updateChatContextUI();
  updateEmptyState();
  updateHistoryBtnVisibility();
});

// ===== INITIAL LOAD =====
hydrateTrackedTabState();
updateHistoryBtnVisibility();

chrome.storage.local.get(["currentNotes", "currentSessionId"], (data) => {
  if (data.currentNotes && data.currentSessionId) {
    notesMarkdown = data.currentNotes;
    currentSessionId = data.currentSessionId;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    injectNotesReadyCard();
    loadChatMessages(data.currentSessionId);
  }
  updateChatContextUI();
  updateEmptyState();
});


