// Extension-origin camera surface. Runs as a TOP-LEVEL popup window (not an in-page iframe) so the
// page's Permissions-Policy can never block the camera. Grants the EXTENSION camera (persistent),
// shows the live feed, and streams single frames back to the background over a Port on request.

const video = document.getElementById("v");
const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
let stream = null;
let ready = false;
let port = null;

try { port = chrome.runtime.connect({ name: "camWindow" }); } catch (_) {}
function send(msg) { try { port && port.postMessage(msg); } catch (_) {} }

function showVideo() { ask.style.display = "none"; video.style.display = "block"; }
function showAsk(text) { ask.style.display = "flex"; video.style.display = "none"; if (text) hint.textContent = text; }

async function start(viaGesture) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
    });
    video.srcObject = stream;
    try { await video.play(); } catch (_) {}
    showVideo();
    if (!ready) { ready = true; send({ type: "ready" }); }
  } catch (e) {
    const name = e?.name || "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") { showAsk("No camera found on this device."); send({ type: "denied" }); return; }
    if (name === "NotReadableError" || name === "TrackStartError") { showAsk("Camera is busy in another app. Close it and tap to retry."); return; }
    if (viaGesture) { showAsk("Blocked. Click the camera icon in the address bar → Allow, then tap again."); send({ type: "denied" }); }
    else { showAsk("Tap to let Braino see — then choose Allow."); send({ type: "needpermission" }); }
  }
}

grantBtn.addEventListener("click", () => start(true));

if (port) port.onMessage.addListener((m) => {
  if (m?.type === "grab") {
    if (!video.videoWidth) { send({ type: "frame", data: "" }); return; }
    const w = Math.min(1024, video.videoWidth);
    const h = Math.round(w * (video.videoHeight / video.videoWidth));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    try { c.getContext("2d").drawImage(video, 0, 0, w, h); } catch (_) { send({ type: "frame", data: "" }); return; }
    // PNG to match the vision backend's declared image/png mime.
    send({ type: "frame", data: (c.toDataURL("image/png").split(",")[1] || "") });
  } else if (m?.type === "close") {
    try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { window.close(); } catch (_) {}
  }
});

window.addEventListener("beforeunload", () => { try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {} });

// Try silently first — instant if the extension already has the grant; otherwise show the button.
start(false);
