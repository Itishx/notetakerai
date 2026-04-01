// SideBrain Popup Controller
const API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

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
let playbackEl = null;
let currentPageContext = null;

const CONVERT_BUTTON_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>';

const recordBtn = document.getElementById("recordBtn");
const convertBtn = document.getElementById("convertBtn");
const copyBtn = document.getElementById("copyBtn");
const syncNotionBtn = document.getElementById("syncNotionBtn");
const syncNotionLabel = document.getElementById("syncNotionLabel");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const loadingEl = document.getElementById("loading");
const notesSection = document.getElementById("notesSection");
const notesContent = document.getElementById("notesContent");
const continueBtn = document.getElementById("continueBtn");
const newSessionBtn = document.getElementById("newSessionBtn");
const segmentCount = document.getElementById("segmentCount");

// Layout sections
const headerSection = document.getElementById("headerSection");
const idleStatusBlock = document.getElementById("idleStatusBlock");
const idleControls = document.getElementById("idleControls");
const recordingHero = document.getElementById("recordingHero");
const heroTimer = document.getElementById("heroTimer");
const heroSegment = document.getElementById("heroSegment");
const heroStopBtn = document.getElementById("heroStopBtn");
const heroConvertBtn = document.getElementById("heroConvertBtn");
const orbContainer = recordingHero?.querySelector(".orb-container");

// History overlay elements
const historyOverlay = document.getElementById("historyOverlay");
const historyList = document.getElementById("historyList");
const historyBtn = document.getElementById("historyBtn");
const historyBackBtn = document.getElementById("historyBackBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Chat elements
const chatSection = document.getElementById("chatSection");
const chatMessagesEl = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatImagePreview = document.getElementById("chatImagePreview");
const chatPreviewImg = document.getElementById("chatPreviewImg");
const chatRemoveImage = document.getElementById("chatRemoveImage");
const chatDividerLabel = document.getElementById("chatDividerLabel");
const pageContextBadge = document.getElementById("pageContextBadge");
const pageContextLabel = document.getElementById("pageContextLabel");

// Simple markdown to HTML converter
function renderMarkdown(md) {
  let html = md
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

  html = html.replace(/((?:<li>.*<\/li>(?:<br>)?)+)/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  return '<p>' + html + '</p>';
}

function hasExistingNotes() {
  return Boolean(notesMarkdown && notesMarkdown.trim());
}

function updateConvertButtonLabel() {
  const label = hasExistingNotes() ? "Update Notes" : "Convert to Notes";
  if (convertBtn) convertBtn.innerHTML = `${CONVERT_BUTTON_ICON} ${label}`;
  if (heroConvertBtn) heroConvertBtn.innerHTML = `${CONVERT_BUTTON_ICON} ${label}`;
}

updateConvertButtonLabel();

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
  onboardingNextBtn.textContent = idx === TOTAL_ONBOARDING_SLIDES - 1 ? "Get Started" : "Next";
}

if (onboardingOverlay && onboardingNextBtn) {
  chrome.storage.local.get(["onboardingDone"], (data) => {
    if (!data.onboardingDone) {
      onboardingOverlay.classList.remove("hidden");
    }
  });

  onboardingNextBtn.addEventListener("click", () => {
    if (currentOnboardingSlide < TOTAL_ONBOARDING_SLIDES - 1) {
      currentOnboardingSlide++;
      showOnboardingSlide(currentOnboardingSlide);
    } else {
      chrome.storage.local.set({ onboardingDone: true });
      onboardingOverlay.classList.add("hidden");
    }
  });

  onboardingDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      currentOnboardingSlide = parseInt(dot.dataset.dot);
      showOnboardingSlide(currentOnboardingSlide);
    });
  });
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
  const hasNotes = hasExistingNotes();
  const hasPage = !!currentPageContext;

  if (hasNotes && hasPage) {
    if (chatDividerLabel) chatDividerLabel.textContent = "Chat with AI about notes & page";
    if (chatInput) chatInput.placeholder = "Ask about your notes or this page...";
  } else if (hasNotes) {
    if (chatDividerLabel) chatDividerLabel.textContent = "Chat with AI about your notes";
    if (chatInput) chatInput.placeholder = "Ask about your notes...";
  } else if (hasPage) {
    if (chatDividerLabel) chatDividerLabel.textContent = "Chat with AI about this page";
    if (chatInput) chatInput.placeholder = "Ask about this page...";
  } else {
    if (chatDividerLabel) chatDividerLabel.textContent = "Chat with AI";
    if (chatInput) chatInput.placeholder = "Ask anything...";
  }

  if (hasPage && pageContextBadge && pageContextLabel) {
    const shortTitle = currentPageContext.title.length > 40
      ? currentPageContext.title.substring(0, 40) + "…"
      : currentPageContext.title;
    pageContextLabel.textContent = `Reading: ${shortTitle}`;
    pageContextBadge.classList.remove("hidden");
  } else if (pageContextBadge) {
    pageContextBadge.classList.add("hidden");
  }
}

// Fetch page context on load and when tab changes
fetchPageContext();
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.activeTabId) {
    setTimeout(fetchPageContext, 300);
  }
});
window.addEventListener("focus", () => setTimeout(fetchPageContext, 200));

chrome.storage.local.get(["audioSegments", "totalRecordedSeconds", "currentSessionId"], (data) => {
  if (data.audioSegments && data.audioSegments.length > 0) {
    audioSegments = data.audioSegments;
    totalRecordedSeconds = data.totalRecordedSeconds || 0;
    currentSessionId = data.currentSessionId || null;
    updateSegmentInfo();
    setResumeUI();
  }
});

updateHistoryBtnVisibility();
hydrateTrackedTabState();

// Restore notes + chat for current session
chrome.storage.local.get(["currentNotes", "currentSessionId"], (data) => {
  if (data.currentNotes && data.currentSessionId) {
    notesMarkdown = data.currentNotes;
    currentSessionId = data.currentSessionId;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    notesSection.classList.remove("hidden");
    loadChatMessages(currentSessionId);
  }
  updateConvertButtonLabel();
  updateChatContextUI();
});

recordBtn.addEventListener("click", startRecordingFlow);
continueBtn?.addEventListener("click", startRecordingFlow);

async function startRecordingFlow() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getStreamId", tabId: trackedActiveTabId || undefined },
        (res) => resolve(res)
      );
    });

    if (response?.error) {
      handleRecordingStartError(response.error);
      return;
    }

    if (!response?.streamId) {
      handleRecordingStartError("Failed to get audio stream");
      return;
    }

    await beginLocalRecording(response.streamId);
    seconds = 0;
    setRecordingUI();
    updateTimer();
    startTimer();
  } catch (e) {
    handleRecordingStartError(e instanceof Error ? e.message : "Failed to start recording");
  }
}

// Hero stop button
heroStopBtn?.addEventListener("click", handleStopRecording);

async function handleStopRecording() {
  const capturedSeconds = seconds;
  stopTimer();

  try {
    const audioBase64 = await stopLocalRecording();
    audioSegments.push(audioBase64);
    totalRecordedSeconds += capturedSeconds;
    seconds = 0;

    chrome.storage.local.set({ audioSegments, totalRecordedSeconds });

    setResumeUI();
    updateTimer();
    updateSegmentInfo();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function handleConvertToNotes() {
  if (audioSegments.length === 0) return;

  const existingNotesContext = hasExistingNotes() ? buildNotesContextForAI(notesMarkdown) : null;

  loadingEl.classList.remove("hidden");
  convertBtn.disabled = true;
  if (heroConvertBtn) heroConvertBtn.disabled = true;
  if (continueBtn) continueBtn.disabled = true;
  statusEl.className = "status processing";
  statusEl.querySelector("span").textContent = "Processing with AI...";

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
    notesSection.classList.remove("hidden");
    updateConvertButtonLabel();
    updateChatContextUI();

    chrome.storage.local.set({ currentNotes: notesMarkdown });
    saveToHistory(notesMarkdown);

    statusEl.className = "status idle";
    statusEl.querySelector("span").textContent = "Notes ready!";
  } catch (e) {
    alert("Error: " + e.message);
    statusEl.className = "status idle";
    statusEl.querySelector("span").textContent = "Error occurred";
  } finally {
    loadingEl.classList.add("hidden");
    convertBtn.disabled = false;
    if (heroConvertBtn) heroConvertBtn.disabled = false;
    if (continueBtn) continueBtn.disabled = false;
  }
}

convertBtn.addEventListener("click", handleConvertToNotes);
heroConvertBtn?.addEventListener("click", handleConvertToNotes);

// New Session
newSessionBtn?.addEventListener("click", () => {
  audioSegments = [];
  totalRecordedSeconds = 0;
  seconds = 0;
  notesMarkdown = "";
  currentSessionId = null;
  chatMessages = [];
  pendingImageBase64 = null;
  chrome.storage.local.remove(["audioSegments", "totalRecordedSeconds", "currentSessionId", "currentNotes", "notionSyncedPageId"]);
  notesSection.classList.add("hidden");
  chatMessagesEl.innerHTML = "";
  updateConvertButtonLabel();
  updateChatContextUI();
  updateTimer();
  updateSegmentInfo();
  setIdleUI();
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(notesMarkdown).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Markdown'; }, 1500);
  });
});

// ===== NOTION SYNC =====
function getNotionUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get("notionUserId", (data) => {
      if (data.notionUserId) {
        resolve(data.notionUserId);
      } else {
        const id = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        chrome.storage.local.set({ notionUserId: id });
        resolve(id);
      }
    });
  });
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
  if (changes.activeTabId) {
    trackedActiveTabId = typeof changes.activeTabId.newValue === "number" ? changes.activeTabId.newValue : null;
  }
  if (changes.activeWindowId) {
    trackedActiveWindowId = typeof changes.activeWindowId.newValue === "number" ? changes.activeWindowId.newValue : null;
  }
});

async function closeNotionAuthTab() {
  const data = await getStorage("notionAuthTabId");
  const tabId = data.notionAuthTabId;
  if (typeof tabId === "number") {
    try { await chrome.tabs.remove(tabId); } catch {}
  }
  await removeStorage("notionAuthTabId");
}

async function beginLocalRecording(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  if (playbackEl) playbackEl.remove();

  playbackEl = document.createElement("audio");
  playbackEl.srcObject = stream;
  playbackEl.autoplay = true;
  playbackEl.id = "tabPlayback";
  playbackEl.style.display = "none";
  document.body.appendChild(playbackEl);

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) audioChunks.push(event.data);
  };
  mediaRecorder.start(1000);
}

async function stopLocalRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("Not recording"));
      return;
    }
    const activeRecorder = mediaRecorder;
    activeRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      activeRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      audioChunks = [];
      if (playbackEl) { playbackEl.remove(); playbackEl = null; }
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        resolve(result.split(",")[1]);
      };
      reader.onerror = () => reject(new Error("Failed to read recorded audio"));
      reader.readAsDataURL(blob);
    };
    activeRecorder.stop();
  });
}

function handleRecordingStartError(message) {
  if (/Extension has not been invoked for the current page|activeTab permission|Chrome pages cannot be captured/i.test(message)) {
    statusEl.className = "status idle";
    statusEl.querySelector("span").textContent = "Reopen the extension on this page, then start recording";
    alert("Chrome needs the extension to be reopened on the current page before a new recording can start there. Click the extension icon once on that page/video, then press Start Recording again.");
    return;
  }
  alert("Error: " + message);
}

window.addEventListener("beforeunload", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  }
  if (playbackEl) { playbackEl.remove(); playbackEl = null; }
});

function setNotionButtonLabel(label) {
  if (syncNotionLabel) syncNotionLabel.textContent = label;
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
        syncNotionBtn.disabled = false;
        statusEl.className = "status idle";
        statusEl.querySelector("span").textContent = "Notion connected";
        return;
      }
    } catch {}
    if (attempts >= 60) {
      stopNotionConnectionPolling();
      syncNotionBtn.disabled = false;
      setNotionButtonLabel("Connect Notion");
    }
  }, 1000);
}

checkNotionConnection();
window.addEventListener("focus", () => {
  hydrateTrackedTabState();
  checkNotionConnection();
});

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
      const dataUrl = imgMatch[1];
      const base64 = dataUrl.split(",")[1];
      if (base64) { images.push({ id: `img_${Date.now()}_${imgIndex++}`, base64, source: dataUrl }); }
    }
    while ((imgMatch = htmlImgRegex.exec(notesMarkdown)) !== null) {
      const dataUrl = imgMatch[1];
      const base64 = dataUrl.split(",")[1];
      if (base64) { images.push({ id: `img_${Date.now()}_${imgIndex++}`, base64, source: dataUrl }); }
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
    statusEl.className = "status idle";
    statusEl.querySelector("span").textContent = "Synced to Notion";
    setTimeout(() => setNotionButtonLabel("Sync to Notion"), 2500);
  } catch (e) {
    alert("Sync failed: " + e.message);
    setNotionButtonLabel("Sync to Notion");
  } finally {
    syncNotionBtn.disabled = false;
  }
});

// ===== HISTORY OVERLAY =====
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

// ===== UI STATE =====
function setRecordingUI() {
  // Hide idle sections
  idleStatusBlock?.classList.add("hidden");
  idleControls?.classList.add("hidden");
  if (newSessionBtn) newSessionBtn.classList.add("hidden");

  // Show recording hero
  recordingHero?.classList.remove("hidden");
  orbContainer?.classList.add("orb-recording");
  heroStopBtn.disabled = false;

  // Update hero convert button
  updateConvertButtonLabel();

  // Status (still update for consistency)
  statusEl.className = "status recording";
  statusEl.querySelector("span").textContent = "Recording tab audio...";
}

function setResumeUI() {
  // Hide recording hero
  recordingHero?.classList.add("hidden");
  orbContainer?.classList.remove("orb-recording");

  // Show idle sections
  idleStatusBlock?.classList.remove("hidden");
  idleControls?.classList.remove("hidden");

  recordBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.remove("hidden");
  if (newSessionBtn) newSessionBtn.classList.remove("hidden");
  updateConvertButtonLabel();
  convertBtn.disabled = false;

  statusEl.className = "status idle";
  const segText = audioSegments.length === 1 ? "1 segment" : `${audioSegments.length} segments`;
  statusEl.querySelector("span").textContent = `Recording paused · ${segText} captured`;
}

function setIdleUI() {
  // Hide recording hero
  recordingHero?.classList.add("hidden");
  orbContainer?.classList.remove("orb-recording");

  // Show idle sections
  idleStatusBlock?.classList.remove("hidden");
  idleControls?.classList.remove("hidden");

  recordBtn.classList.remove("hidden");
  recordBtn.disabled = false;
  if (continueBtn) continueBtn.classList.add("hidden");
  if (newSessionBtn) newSessionBtn.classList.add("hidden");
  updateConvertButtonLabel();
  convertBtn.disabled = true;

  statusEl.className = "status idle";
  statusEl.querySelector("span").textContent = "Ready to record";
}

function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    updateTimer();
  }, 1000);
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

  // Update both idle timer and hero timer
  timerEl.textContent = timeStr;
  if (heroTimer) heroTimer.textContent = timeStr;

  // Update hero segment info
  if (heroSegment) {
    const segNum = audioSegments.length + (mediaRecorder && mediaRecorder.state === "recording" ? 1 : 0);
    const segLabel = segNum === 1 ? "1 segment" : `${segNum} segments`;
    const totalSecs = totalRecordedSeconds + seconds;
    heroSegment.textContent = `${segLabel} · ${formatTime(totalSecs)} total`;
  }
}

function updateSegmentInfo() {
  if (!segmentCount) return;
  if (audioSegments.length > 0) {
    segmentCount.classList.remove("hidden");
    segmentCount.textContent = `${audioSegments.length} segment${audioSegments.length > 1 ? "s" : ""} · ${formatTime(totalRecordedSeconds)} total`;
  } else {
    segmentCount.classList.add("hidden");
    segmentCount.textContent = "";
  }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ===== HISTORY =====
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
      item.innerHTML = `
        <div class="history-meta">${dateStr}</div>
        <div class="history-preview">${preview}...</div>
      `;
      item.addEventListener("click", () => {
        notesMarkdown = entry.notes;
        currentSessionId = entry.id;
        chrome.storage.local.set({ currentSessionId, currentNotes: notesMarkdown });
        notesContent.innerHTML = renderMarkdown(notesMarkdown);
        notesSection.classList.remove("hidden");
        updateConvertButtonLabel();
        updateChatContextUI();
        loadChatMessages(currentSessionId);
        closeHistory();
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
    if (msg.image) {
      bubble.innerHTML += `<img src="${msg.image}" alt="Attached image" class="chat-msg-image" />`;
    }
    bubble.innerHTML += `<div class="chat-bubble-text">${renderMarkdown(msg.content)}</div>`;
    chatMessagesEl.appendChild(bubble);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
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

async function sendChatMessage(text, imageBase64) {
  if (!text && !imageBase64) return;
  // Allow chat even without notes — page context is enough
  if (!notesMarkdown && !currentPageContext && !imageBase64) return;

  const userMsg = { role: "user", content: text || "📎 Image attached — please insert into notes" };
  if (imageBase64) userMsg.image = `data:image/png;base64,${imageBase64}`;
  chatMessages.push(userMsg);
  renderChatMessages();
  saveChatMessages();

  const typingEl = document.createElement("div");
  typingEl.className = "chat-bubble chat-assistant chat-typing";
  typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  chatMessagesEl.appendChild(typingEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  try {
    const hasNotes = hasExistingNotes();
    const notesCtx = hasNotes ? buildNotesContextForAI(notesMarkdown) : { sanitizedNotes: "", existingImages: {} };
    const body = {
      notes: notesCtx.sanitizedNotes,
      message: text || "Please insert this diagram/image into my notes at the most appropriate location.",
    };

    // Include page context if available
    if (currentPageContext) {
      body.pageContext = currentPageContext;
    }

    if (imageBase64) {
      body.existingImages = notesCtx.existingImages;
    } else {
      body.chatHistory = chatMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    }

    if (imageBase64) body.imageBase64 = imageBase64;

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
    typingEl.remove();
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
    typingEl.remove();
    chatMessages.push({ role: "assistant", content: `⚠️ Error: ${e.message}` });
    renderChatMessages();
    saveChatMessages();
  }
}

// Chat input handlers
chatSendBtn?.addEventListener("click", () => {
  const text = chatInput.value.trim();
  const img = pendingImageBase64;
  chatInput.value = "";
  clearPendingImage();
  sendChatMessage(text, img);
});

chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatSendBtn.click();
  }
});

// Paste image from clipboard
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

function setPendingImage(base64, dataUrl) {
  pendingImageBase64 = base64;
  chatPreviewImg.src = dataUrl;
  chatImagePreview.classList.remove("hidden");
}

function clearPendingImage() {
  pendingImageBase64 = null;
  chatPreviewImg.src = "";
  chatImagePreview.classList.add("hidden");
}

chatRemoveImage?.addEventListener("click", clearPendingImage);

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
    if (res?.error) {
      alert("Screenshot failed: " + res.error);
      return;
    }
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
  cropSelection.style.left = relX + "px";
  cropSelection.style.top = relY + "px";
  cropSelection.style.width = "0px";
  cropSelection.style.height = "0px";
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging || !cropStart) return;
  const canvasRect = cropCanvas.getBoundingClientRect();
  const relX = e.clientX - canvasRect.left;
  const relY = e.clientY - canvasRect.top;
  const x1 = Math.min(cropStart.x, relX);
  const y1 = Math.min(cropStart.y, relY);
  const x2 = Math.max(cropStart.x, relX);
  const y2 = Math.max(cropStart.y, relY);
  cropSelection.style.left = x1 + "px";
  cropSelection.style.top = y1 + "px";
  cropSelection.style.width = (x2 - x1) + "px";
  cropSelection.style.height = (y2 - y1) + "px";
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
    cropRect = {
      x: Math.round(x1 * scaleX),
      y: Math.round(y1 * scaleY),
      w: Math.round(w * scaleX),
      h: Math.round(h * scaleY),
    };
    cropConfirmBtn.disabled = false;
  } else {
    cropSelection.classList.add("hidden");
    cropConfirmBtn.disabled = true;
    cropRect = null;
  }
  cropStart = null;
});

cropCancelBtn?.addEventListener("click", () => {
  cropOverlay.classList.add("hidden");
  screenshotDataUrl = null;
  cropRect = null;
});

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
