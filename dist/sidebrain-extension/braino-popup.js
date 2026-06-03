const API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";

let chatHistory = [];
let authToken = null;
let currentMode = "page";
let currentPageContext = null;

const bpMessages  = document.getElementById("bpMessages");
const bpEmpty     = document.getElementById("bpEmpty");
const bpEmptySub  = document.getElementById("bpEmptySub");
const bpInput     = document.getElementById("bpInput");
const bpSendBtn   = document.getElementById("bpSendBtn");
const bpSignInBtn = document.getElementById("bpSignInBtn");
const bpUserName  = document.getElementById("bpUserName");
const bpCtxChip   = document.getElementById("bpCtxChip");
const bpCtxTitle  = document.getElementById("bpCtxTitle");
const bpCtxUrl    = document.getElementById("bpCtxUrl");
const bpBadge     = document.getElementById("bpBadge");

// ── Auth ──────────────────────────────────────────────────────────────────────
function applyAuth(token, name) {
  authToken = token || null;
  if (token && name) {
    bpSignInBtn.style.display = "none";
    bpUserName.textContent = name.split(" ")[0];
    bpUserName.style.display = "inline";
  } else {
    bpSignInBtn.style.display = "";
    bpUserName.style.display = "none";
  }
}

chrome.storage.local.get(["authToken", "authDisplayName"], (d) => {
  applyAuth(d.authToken, d.authDisplayName);
});

chrome.storage.onChanged.addListener((changes) => {
  const token = changes.authToken ? changes.authToken.newValue : authToken;
  const name  = changes.authDisplayName ? changes.authDisplayName.newValue : bpUserName.textContent;
  if (changes.authToken || changes.authDisplayName) applyAuth(token, name);
});

bpSignInBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${chrome.runtime.id}&mode=signin` });
  window.close();
});

// ── Mode selector ─────────────────────────────────────────────────────────────
document.querySelectorAll(".bp-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    document.querySelectorAll(".bp-mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    updateModeUI();
    if (currentMode === "page") fetchPageContext();
  });
});

function updateModeUI() {
  if (currentMode === "page") {
    bpInput.placeholder = currentPageContext ? "Ask about this page…" : "Ask about this page…";
    bpCtxChip.classList.toggle("hidden", !currentPageContext && !bpCtxChip.classList.contains("loading"));
  } else {
    bpInput.placeholder = "Ask me anything…";
    bpCtxChip.classList.add("hidden");
  }
}

// ── Page context ──────────────────────────────────────────────────────────────
function fetchPageContext() {
  currentPageContext = null;
  bpCtxChip.className = "bp-ctx-chip loading";
  if (!bpCtxTitle.textContent) bpCtxTitle.textContent = "Reading page…";

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getPageContent" }, (res) => {
      if (chrome.runtime.lastError || res?.error || !res?.text) {
        // Can't read page (restricted page or no content script)
        bpCtxChip.className = "bp-ctx-chip error";
        bpCtxTitle.textContent = "Can't read this page";
        bpCtxUrl.textContent = "Restricted — switch to General Chat";
        bpInput.placeholder = "Ask me anything… (page unavailable)";
        resolve(null);
        return;
      }
      currentPageContext = {
        title: res.title,
        url: res.url,
        text: res.text,
        hoveredContext: res.hoveredContext || null,
      };
      bpCtxChip.className = "bp-ctx-chip ready";
      bpCtxTitle.textContent = res.title || "Current page";
      try {
        bpCtxUrl.textContent = new URL(res.url || "").hostname || res.url;
      } catch (_) {
        bpCtxUrl.textContent = res.url || "";
      }
      bpInput.placeholder = "Ask about this page…";
      bpBadge.textContent = "page";
      resolve(currentPageContext);
    });
  });
}

// Start fetching page context immediately
fetchPageContext();

// ── Markdown renderer (minimal) ───────────────────────────────────────────────
function renderMd(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

// ── Message rendering ─────────────────────────────────────────────────────────
function addMessage(role, text, { thinking = false, error = false } = {}) {
  bpEmpty.style.display = "none";

  const el = document.createElement("div");
  el.className = `bp-msg bp-msg-${role}${thinking ? " bp-thinking" : ""}${error ? " bp-msg-error" : ""}`;

  if (role === "assistant" && !thinking && !error) {
    el.innerHTML = renderMd(text);
  } else {
    el.textContent = text;
  }

  bpMessages.appendChild(el);
  bpMessages.scrollTop = bpMessages.scrollHeight;
  return el;
}

// ── Send ──────────────────────────────────────────────────────────────────────
async function send() {
  const text = bpInput.value.trim();
  if (!text) return;

  bpInput.value = "";
  bpInput.disabled = true;
  bpSendBtn.disabled = true;

  addMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  const thinkingEl = addMessage("assistant", "Thinking…", { thinking: true });

  try {
    if (currentMode === "page") {
      await fetchPageContext().catch(() => null);
    }

    const body = {
      message: text,
      chatHistory: chatHistory.slice(0, -1),
      aiProvider: "lovable",
    };

    if (currentMode === "page" && currentPageContext) {
      body.pageContext = currentPageContext;
    }

    const response = await fetch(`${API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

    thinkingEl.remove();
    const reply = data.reply || "…";
    addMessage("assistant", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (e) {
    thinkingEl.remove();
    addMessage("assistant", `⚠️ ${e.message}`, { error: true });
  } finally {
    bpInput.disabled = false;
    bpSendBtn.disabled = false;
    bpInput.focus();
  }
}

bpSendBtn.addEventListener("click", send);
bpInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});

bpInput.focus();
