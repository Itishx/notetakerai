// LectureSnap Popup Controller
const API_BASE = "%%SUPABASE_URL%%/functions/v1";

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

// Check initial status
chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
  if (res?.isRecording) {
    setRecordingUI();
    // Restore timer from storage
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
    notesContent.textContent = notesMarkdown;
    notesSection.classList.remove("hidden");

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
  // Copy as clean markdown that Notion can parse when pasted
  navigator.clipboard.writeText(notesMarkdown).then(() => {
    copyNotionBtn.textContent = "Copied for Notion!";
    setTimeout(() => { copyNotionBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 4v16"/><path d="M14 10l-5 4"/></svg> Copy for Notion'; }, 1500);
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
