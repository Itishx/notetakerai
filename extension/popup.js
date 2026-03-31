// LectureSnap Popup Controller
const API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

let audioSegments = [];
let timerInterval = null;
let seconds = 0;
let totalRecordedSeconds = 0;
let notesMarkdown = "";
let currentSessionId = null;
let chatMessages = [];
let pendingImageBase64 = null;

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
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
const chatAttachBtn = document.getElementById("chatAttachBtn");
const chatFileInput = document.getElementById("chatFileInput");
const chatImagePreview = document.getElementById("chatImagePreview");
const chatPreviewImg = document.getElementById("chatPreviewImg");
const chatRemoveImage = document.getElementById("chatRemoveImage");

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
    // Handle inline images: ![alt](data:...) or ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;">')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>(?:<br>)?)+)/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  return '<p>' + html + '</p>';
}

// Restore session state
chrome.storage.local.get(["audioSegments", "totalRecordedSeconds", "currentSessionId"], (data) => {
  if (data.audioSegments && data.audioSegments.length > 0) {
    audioSegments = data.audioSegments;
    totalRecordedSeconds = data.totalRecordedSeconds || 0;
    currentSessionId = data.currentSessionId || null;
    updateSegmentInfo();
    setResumeUI();
  }
});

// Show history button if there are notes
updateHistoryBtnVisibility();

// Check initial status
chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
  if (res?.isRecording) {
    setRecordingUI();
    chrome.storage.local.get("startTime", (data) => {
      if (data.startTime) {
        seconds = Math.floor((Date.now() - data.startTime) / 1000);
        updateTimer();
        startTimer();
      }
    });
  }
});

// Restore notes + chat for current session
chrome.storage.local.get(["currentNotes", "currentSessionId"], (data) => {
  if (data.currentNotes && data.currentSessionId) {
    notesMarkdown = data.currentNotes;
    currentSessionId = data.currentSessionId;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    notesSection.classList.remove("hidden");
    chatSection.classList.remove("hidden");
    loadChatMessages(currentSessionId);
  }
});

recordBtn.addEventListener("click", startRecordingFlow);
continueBtn?.addEventListener("click", startRecordingFlow);

async function startRecordingFlow() {
  let tabId;
  try {
    const data = await chrome.storage.local.get("activeTabId");
    tabId = data.activeTabId;
  } catch (e) {}

  if (!tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
  }

  if (!tabId) {
    alert("No active tab found. Try clicking the extension icon again.");
    return;
  }

  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentTab?.id) {
    await chrome.storage.local.set({ activeTabId: currentTab.id });
    tabId = currentTab.id;
  }

  chrome.runtime.sendMessage({ action: "startRecording", tabId }, (res) => {
    if (res?.error) {
      alert("Error: " + res.error);
      return;
    }
    seconds = 0;
    chrome.storage.local.set({ startTime: Date.now() });
    setRecordingUI();
    startTimer();
  });
}

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stopRecording" }, (res) => {
    if (res?.error) {
      alert("Error: " + res.error);
      return;
    }
    audioSegments.push(res.audioBase64);
    totalRecordedSeconds += seconds;

    chrome.storage.local.set({ audioSegments, totalRecordedSeconds });

    setResumeUI();
    stopTimer();
    chrome.storage.local.remove("startTime");
    updateSegmentInfo();
  });
});

convertBtn.addEventListener("click", async () => {
  if (audioSegments.length === 0) return;

  loadingEl.classList.remove("hidden");
  convertBtn.disabled = true;
  if (continueBtn) continueBtn.disabled = true;
  statusEl.className = "status processing";
  statusEl.querySelector("span").textContent = "Processing with AI...";

  try {
    const response = await fetch(`${API_BASE}/transcribe-and-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioSegments }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    notesMarkdown = data.notes;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    notesSection.classList.remove("hidden");
    chatSection.classList.remove("hidden");

    // Persist current notes
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
    if (continueBtn) continueBtn.disabled = false;
  }
});

// New Session
newSessionBtn?.addEventListener("click", () => {
  audioSegments = [];
  totalRecordedSeconds = 0;
  seconds = 0;
  notesMarkdown = "";
  currentSessionId = null;
  chatMessages = [];
  pendingImageBase64 = null;
  chrome.storage.local.remove(["audioSegments", "totalRecordedSeconds", "currentSessionId", "currentNotes"]);
  notesSection.classList.add("hidden");
  chatSection.classList.add("hidden");
  chatMessagesEl.innerHTML = "";
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

function checkNotionConnection() {
  chrome.storage.local.get("notionConnected", (data) => {
    if (data.notionConnected) {
      if (syncNotionLabel) syncNotionLabel.textContent = "Sync to Notion";
    } else {
      if (syncNotionLabel) syncNotionLabel.textContent = "Connect Notion";
    }
  });
}

checkNotionConnection();

syncNotionBtn?.addEventListener("click", async () => {
  const userId = await getNotionUserId();
  
  // Check if connected
  const data = await new Promise((resolve) => chrome.storage.local.get("notionConnected", resolve));
  
  if (!data.notionConnected) {
    // Start OAuth flow
    syncNotionBtn.disabled = true;
    if (syncNotionLabel) syncNotionLabel.textContent = "Connecting...";
    
    try {
      const res = await fetch(`${API_BASE}/notion-oauth-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdentifier: userId }),
      });
      
      if (!res.ok) throw new Error("Failed to start OAuth");
      const { authUrl } = await res.json();
      
      // Open OAuth in new tab
      chrome.tabs.create({ url: authUrl });
      
      // Mark as connected after a delay (user will complete OAuth in the tab)
      // We'll poll or just set it when they come back
      chrome.storage.local.set({ notionConnected: true });
      setTimeout(() => {
        if (syncNotionLabel) syncNotionLabel.textContent = "Sync to Notion";
        syncNotionBtn.disabled = false;
      }, 2000);
    } catch (e) {
      alert("Failed to connect Notion: " + e.message);
      if (syncNotionLabel) syncNotionLabel.textContent = "Connect Notion";
      syncNotionBtn.disabled = false;
    }
    return;
  }
  
  // Sync notes to Notion
  if (!notesMarkdown) {
    alert("No notes to sync!");
    return;
  }
  
  syncNotionBtn.disabled = true;
  if (syncNotionLabel) syncNotionLabel.textContent = "Syncing...";
  
  try {
    // Extract title from notes
    const titleMatch = notesMarkdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "LectureSnap Notes";
    
    const res = await fetch(`${API_BASE}/sync-to-notion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIdentifier: userId,
        title,
        markdown: notesMarkdown,
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
    if (syncNotionLabel) syncNotionLabel.textContent = "Synced! ✓";
    
    // Open the Notion page
    if (result.url) {
      chrome.tabs.create({ url: result.url });
    }
    
    setTimeout(() => {
      if (syncNotionLabel) syncNotionLabel.textContent = "Sync to Notion";
    }, 2000);
  } catch (e) {
    alert("Sync failed: " + e.message);
    if (syncNotionLabel) syncNotionLabel.textContent = "Sync to Notion";
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
    if (history.length > 0) {
      historyBtn?.classList.remove("hidden");
    } else {
      historyBtn?.classList.add("hidden");
    }
  });
}

// ===== UI STATE =====
function setRecordingUI() {
  recordBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.add("hidden");
  if (newSessionBtn) newSessionBtn.classList.add("hidden");
  stopBtn.disabled = false;
  stopBtn.classList.remove("hidden");
  convertBtn.disabled = true;
  statusEl.className = "status recording";
  statusEl.querySelector("span").textContent = "Recording tab audio...";
}

function setResumeUI() {
  recordBtn.classList.add("hidden");
  stopBtn.disabled = true;
  stopBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.remove("hidden");
  if (newSessionBtn) newSessionBtn.classList.remove("hidden");
  convertBtn.disabled = false;
  statusEl.className = "status idle";
  const segText = audioSegments.length === 1 ? "1 segment" : `${audioSegments.length} segments`;
  statusEl.querySelector("span").textContent = `Recording paused · ${segText} captured`;
}

function setIdleUI() {
  recordBtn.classList.remove("hidden");
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  stopBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.add("hidden");
  if (newSessionBtn) newSessionBtn.classList.add("hidden");
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
  timerEl.textContent = `${m}:${s}`;
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
    chrome.storage.local.set({ notesHistory: history }, () => {
      updateHistoryBtnVisibility();
    });
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
        chatSection.classList.remove("hidden");
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
  if (!notesMarkdown) return;

  // Add user message
  const userMsg = { role: "user", content: text || "📎 Image attached — please insert into notes" };
  if (imageBase64) {
    userMsg.image = `data:image/png;base64,${imageBase64}`;
  }
  chatMessages.push(userMsg);
  renderChatMessages();
  saveChatMessages();

  // Show typing indicator
  const typingEl = document.createElement("div");
  typingEl.className = "chat-bubble chat-assistant chat-typing";
  typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  chatMessagesEl.appendChild(typingEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  try {
    const { sanitizedNotes, existingImages } = buildNotesContextForAI(notesMarkdown);
    const body = {
      notes: sanitizedNotes,
      message: text || "Please insert this diagram/image into my notes at the most appropriate location.",
    };

    if (imageBase64) {
      body.existingImages = existingImages;
    } else {
      body.chatHistory = chatMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    }

    if (imageBase64) {
      body.imageBase64 = imageBase64;
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

    // Remove typing indicator
    typingEl.remove();

    // Add AI response
    chatMessages.push({ role: "assistant", content: data.reply });
    renderChatMessages();
    saveChatMessages();

    // If updatedNotes returned, update the notes
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

// Image attachment
chatAttachBtn?.addEventListener("click", () => chatFileInput.click());

chatFileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(",")[1];
    setPendingImage(base64, reader.result);
  };
  reader.readAsDataURL(file);
  chatFileInput.value = "";
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
  // Store positions relative to cropCanvas container
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
  // Calculate relative to the image within the canvas
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
  // Crop using canvas
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
