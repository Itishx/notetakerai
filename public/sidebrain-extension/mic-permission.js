// Visible extension-origin page whose only job is to obtain the microphone permission
// grant for the extension. Once granted here, the (invisible) offscreen document inherits
// it — that's what lets the realtime voice session live globally and follow across tabs
// with zero reconnect. Shown either as a same-tab modal iframe or a small popup window.

const statusEl = document.getElementById("status");
const btn = document.getElementById("grant");
let reported = false;

function report(granted, error) {
  if (reported) return;
  reported = true;
  try {
    chrome.runtime.sendMessage({ action: "micPermissionResult", granted: !!granted, error: error || null }, () => { void chrome.runtime.lastError; });
  } catch (_) {}
  // If we're a standalone popup window, close it. (As an iframe, the parent removes us.)
  if (granted) {
    setTimeout(() => { try { window.close(); } catch (_) {} }, 400);
  }
}

async function requestMic() {
  statusEl.textContent = "Waiting for your permission…";
  statusEl.className = "status";
  btn.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // only needed the grant
    statusEl.textContent = "Microphone enabled ✓";
    statusEl.className = "status ok";
    report(true);
  } catch (e) {
    const name = e?.name || "";
    statusEl.textContent = name === "NotAllowedError"
      ? "Microphone blocked. Voice still works — Braino reconnects per tab."
      : "Couldn't access the microphone. Tap to retry.";
    statusEl.className = "status err";
    btn.disabled = false; // let the user retry
    // Only treat an explicit block as a final answer; transient errors keep the modal open.
    if (name === "NotAllowedError") report(false, name);
  }
}

// Button click is a guaranteed user gesture → the prompt reliably appears.
btn.addEventListener("click", requestMic);

// Tell a hosting content script we actually rendered (so it knows the iframe wasn't
// blocked by the page's CSP and can keep the modal up instead of falling back to a window).
try { window.parent && window.parent !== window && window.parent.postMessage({ __sbMicPerm: "ready" }, "*"); } catch (_) {}

// If the user dismisses without granting (popup window closed), report not-granted.
window.addEventListener("beforeunload", () => { if (!reported) report(false, "dismissed"); });
