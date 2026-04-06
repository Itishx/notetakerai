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
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
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
    updateChatContextUI();
    updateEmptyState();
  } catch (e) {
    handleRecordingStartError(e instanceof Error ? e.message : "Failed to start recording");
  }
}

async function handleStopRecording() {
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

async function callAgentStep(task, pageInfo, history) {
  const historyText = history.length > 0
    ? history.map((h, i) => `Step ${i + 1}: ${h.description} → ${h.result?.success ? "OK" : ("FAILED: " + (h.result?.error || "unknown"))}`).join("\n")
    : "None yet.";

  const elementsText = pageInfo.interactiveEls?.length > 0
    ? pageInfo.interactiveEls.map(e => `  [${e.tag}] ${e.text}${e.href ? ` (href: ${e.href})` : ""}${e.type ? ` (type: ${e.type})` : ""}`).join("\n")
    : "  (none detected)";

  const selectsText = pageInfo.selectEls?.length > 0
    ? "\n\nDROPDOWNS (use selectOption):\n" + pageInfo.selectEls.map(s =>
        `  [select] ${s.label || "unnamed"} — current: "${s.current}" — options: ${s.options.join(", ")}`
      ).join("\n")
    : "";

  const agentSystemPrompt = `You are a browser automation agent. Respond ONLY with a single JSON object, no other text.

Available actions:
- Click element by text:  {"type":"click","targetText":"exact visible text","targetTag":"button","description":"..."}
- Type into a field:      {"type":"type","targetText":"field label/placeholder","text":"text to type","description":"..."}
- Type into element:      {"type":"type","selector":"css-selector","text":"text to type","description":"..."}
- Press Enter:            {"type":"pressEnter","description":"..."}
- Navigate to any URL:    {"type":"navigate","url":"https://full-url.com","description":"..."}
- Select dropdown option: {"type":"selectOption","selector":"select","value":"Season 2","description":"..."}
- Scroll page:            {"type":"scroll","direction":"down","amount":400,"description":"..."}
- Wait for page to load:  {"type":"wait","ms":2000,"description":"wait for compose window"}
- Task complete:          {"type":"done","message":"what was accomplished"}
- Answer/explain:         {"type":"answer","message":"your response to the user"}

Critical rules:
- Output ONLY valid JSON. No explanation, no markdown, no extra text.
- You can ALWAYS navigate to any URL even if you're on a different page — navigation works universally.
- If the task involves a website you're not on, navigate there FIRST.
- For Gmail: compose → click "Compose" button → type recipient in To field → Tab to Subject → type subject → click body → type message → click Send.
- For typing in Gmail/Docs/rich editors, use selector "div[contenteditable]" or targetText matching the field label.
- After typing in a field, click the next field or use pressEnter rather than assuming focus moved.
- If the user is asking a question or wants information (not a browser task), use {"type":"answer","message":"..."} immediately.
- For Netflix/streaming season selectors: use selectOption with the <select> dropdown, not click.
- After clicking a button that opens a panel (Compose, dialog, etc.), use wait 1500ms before interacting with it.
- If a step failed, try a different selector or approach — never repeat the same failed action.
- Always include "description" explaining what you're doing.`;

  const pageStatus = pageInfo.url
    ? `URL: ${pageInfo.url}\nTitle: ${pageInfo.title}`
    : "Not yet on a specific page (navigate to the right site first)";

  const userMessage = `TASK: ${task}

CURRENT PAGE:
${pageStatus}

PAGE TEXT (excerpt):
${pageInfo.bodyText?.substring(0, 3000) || "(no page content — navigate first)"}

INTERACTIVE ELEMENTS:
${elementsText}${selectsText}

STEPS TAKEN SO FAR:
${historyText}

What is the next single action to take?`;

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
  const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/) || reply.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : reply.trim();
  return JSON.parse(jsonStr);
}

async function runAgentLoop(task) {
  if (agentRunning) return;
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

    let actionObj;
    try {
      actionObj = await callAgentStep(task, pageInfo, history);
    } catch (e) {
      agentAddStep(thinkingBlock, `⚠️ ${e.message}`, "error");
      finish(`⚠️ AI error: ${e.message}`);
      return;
    }

    if (agentShouldStop) { finish("⏹ Stopped."); return; }

    if (actionObj.type === "done" || actionObj.type === "answer") {
      // For answer, skip the thinking block entirely if no steps taken
      if (history.length === 0) {
        thinkingBlock.remove();
      }
      finish(actionObj.message || "Done.");
      return;
    }

    const desc = actionObj.description || actionObj.type;
    const stepEl = agentAddStep(thinkingBlock, desc);

    const result = await executeAgentAction(actionObj);
    history.push({ ...actionObj, result });
    agentMarkStepResult(stepEl, !result?.error, result?.error);

    const waitMs = result?.error ? 600 : (actionObj.type === "navigate" ? 3500 : 1200);
    await new Promise(r => setTimeout(r, waitMs));
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


// ===== AUTH =====
const WEBSITE_URL = "https://notetakerai.lovable.app";
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
let currentAuthUser = null;

function updateAuthUI() {
  chrome.storage.local.get(["authToken", "authDisplayName", "authEmail", "authUserId"], (data) => {
    if (data.authToken && data.authDisplayName) {
      currentAuthUser = { token: data.authToken, name: data.authDisplayName, email: data.authEmail, userId: data.authUserId };
      const firstName = data.authDisplayName.split(" ")[0];
      if (userGreeting) userGreeting.textContent = `Hello, ${firstName} 👋`;
    } else {
      currentAuthUser = null;
      if (userGreeting) userGreeting.textContent = "Hey there 👋";
    }
  });
}

updateAuthUI();

loginBtn?.addEventListener("click", () => {
  const extId = chrome.runtime.id;
  chrome.tabs.create({ url: `${WEBSITE_URL}/auth/extension?ext=${extId}` });
});

logoutBtn?.addEventListener("click", () => {
  chrome.storage.local.remove(["authToken", "authRefreshToken", "authDisplayName", "authEmail", "authUserId"]);
  updateAuthUI();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.authToken || changes.authDisplayName)) updateAuthUI();
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
