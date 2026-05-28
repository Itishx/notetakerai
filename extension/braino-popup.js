const API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";
let chatHistory = [];
let authToken = null;

const bpMessages  = document.getElementById("bpMessages");
const bpEmpty     = document.getElementById("bpEmpty");
const bpInput     = document.getElementById("bpInput");
const bpSendBtn   = document.getElementById("bpSendBtn");
const bpSignInBtn = document.getElementById("bpSignInBtn");
const bpUserName  = document.getElementById("bpUserName");

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
function addMessage(role, text, { thinking = false } = {}) {
  bpEmpty.style.display = "none";

  const el = document.createElement("div");
  el.className = `bp-msg bp-msg-${role}${thinking ? " bp-thinking" : ""}`;

  if (role === "assistant" && !thinking) {
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
    const response = await fetch(`${API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        chatHistory: chatHistory.slice(0, -1),
        aiProvider: "lovable",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

    thinkingEl.remove();
    const reply = data.reply || "…";
    addMessage("assistant", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (e) {
    thinkingEl.remove();
    const errEl = addMessage("assistant", `⚠️ ${e.message}`);
    errEl.classList.add("bp-msg-error");
    errEl.classList.remove("bp-msg-assistant");
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
