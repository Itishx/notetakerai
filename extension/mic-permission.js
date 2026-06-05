// Visible extension-origin page whose only job is to obtain the microphone permission
// grant for the extension. Once granted here, the (invisible) offscreen document inherits
// it — that's what lets the realtime voice session live globally and follow across tabs
// with zero reconnect. The background opens this in a small window when needed.

const statusEl = document.getElementById("status");
const btn = document.getElementById("grant");
let done = false;

function report(granted, error) {
  if (done) return;
  done = true;
  try {
    chrome.runtime.sendMessage({ action: "micPermissionResult", granted: !!granted, error: error || null }, () => { void chrome.runtime.lastError; });
  } catch (_) {}
  // Give the user a beat to see the result, then close the helper window.
  setTimeout(() => { try { window.close(); } catch (_) {} }, granted ? 450 : 1600);
}

async function requestMic() {
  statusEl.textContent = "";
  statusEl.className = "status";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // We only needed the permission — release the device immediately.
    stream.getTracks().forEach((t) => t.stop());
    statusEl.textContent = "Microphone enabled ✓";
    statusEl.className = "status ok";
    report(true);
  } catch (e) {
    const name = e?.name || "";
    statusEl.textContent = name === "NotAllowedError"
      ? "Microphone blocked. You can still use voice — Braino will reconnect per tab."
      : "Couldn't access the microphone.";
    statusEl.className = "status err";
    report(false, name || String(e));
  }
}

btn.addEventListener("click", requestMic);

// Try automatically on load (this is a top-level user-opened window, so the prompt shows).
// If the browser requires a gesture, the button is the fallback.
window.addEventListener("DOMContentLoaded", () => {
  requestMic().catch(() => {});
});

// Safety: if the user closes the window without deciding, treat as not-granted.
window.addEventListener("beforeunload", () => { report(false, "window-closed"); });
