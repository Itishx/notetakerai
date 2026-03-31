// LectureSnap Popup Controller
const API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

let audioBase64 = null;
let timerInterval = null;
let seconds = 0;
let notesMarkdown = "";

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const convertBtn = document.getElementById("convertBtn");
const copyBtn = document.getElementById("copyBtn");
const copyNotionBtn = document.getElementById("copyNotionBtn");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const loadingEl = document.getElementById("loading");
const notesSection = document.getElementById("notesSection");
const notesContent = document.getElementById("notesContent");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Simple markdown to HTML converter
function renderMarkdown(md) {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>(?:<br>)?)+)/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  return '<p>' + html + '</p>';
}

// Load saved notes history on popup open
loadHistory();

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

recordBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.runtime.sendMessage({ action: "startRecording", tabId: tab.id }, (res) => {
    if (res?.error) {
      alert("Error: " + res.error);
      return;
    }
    chrome.storage.local.set({ startTime: Date.now() });
    setRecordingUI();
    startTimer();
  });
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stopRecording" }, (res) => {
    if (res?.error) {
      alert("Error: " + res.error);
      return;
    }
    audioBase64 = res.audioBase64;
    setStoppedUI();
    stopTimer();
    chrome.storage.local.remove("startTime");
  });
});

convertBtn.addEventListener("click", async () => {
  if (!audioBase64) return;

  loadingEl.classList.remove("hidden");
  convertBtn.disabled = true;
  statusEl.className = "status processing";
  statusEl.querySelector("span").textContent = "Processing with AI...";

  try {
    const response = await fetch(`${API_BASE}/transcribe-and-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64 }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    notesMarkdown = data.notes;
    notesContent.innerHTML = renderMarkdown(notesMarkdown);
    notesSection.classList.remove("hidden");

    // Save to history
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
  }
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(notesMarkdown).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Markdown'; }, 1500);
  });
});

copyNotionBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(notesMarkdown).then(() => {
    copyNotionBtn.textContent = "Copied for Notion!";
    setTimeout(() => { copyNotionBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 4v16"/><path d="M14 10l-5 4"/></svg> Copy for Notion'; }, 1500);
  });
});

clearHistoryBtn?.addEventListener("click", () => {
  chrome.storage.local.remove("notesHistory", () => {
    loadHistory();
  });
});

function setRecordingUI() {
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  convertBtn.disabled = true;
  statusEl.className = "status recording";
  statusEl.querySelector("span").textContent = "Recording tab audio...";
}

function setStoppedUI() {
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  convertBtn.disabled = false;
  statusEl.className = "status idle";
  statusEl.querySelector("span").textContent = "Recording complete";
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
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  timerEl.textContent = `${m}:${s}`;
}

// History functions
function saveToHistory(markdown) {
  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    history.unshift({
      notes: markdown,
      date: new Date().toISOString(),
      id: Date.now(),
    });
    // Keep max 20 entries
    if (history.length > 20) history.pop();
    chrome.storage.local.set({ notesHistory: history }, () => {
      loadHistory();
    });
  });
}

function loadHistory() {
  chrome.storage.local.get("notesHistory", (data) => {
    const history = data.notesHistory || [];
    if (history.length === 0) {
      historySection.classList.add("hidden");
      return;
    }
    historySection.classList.remove("hidden");
    historyList.innerHTML = "";
    history.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      // Get first heading or first line as preview
      const preview = (entry.notes.match(/^##?\s+(.+)$/m) || ["", entry.notes.substring(0, 60)])[1];
      item.innerHTML = `
        <div class="history-meta">${dateStr}</div>
        <div class="history-preview">${preview}...</div>
      `;
      item.addEventListener("click", () => {
        notesMarkdown = entry.notes;
        notesContent.innerHTML = renderMarkdown(notesMarkdown);
        notesSection.classList.remove("hidden");
        notesSection.scrollIntoView({ behavior: "smooth" });
      });
      historyList.appendChild(item);
    });
  });
}
