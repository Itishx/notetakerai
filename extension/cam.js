// Extension-origin camera surface (mirrors mic-permission.js). Because this runs on the
// chrome-extension:// origin inside an iframe the page delegates camera to, the permission is
// granted to the EXTENSION (persistent, cross-page) instead of per-page — and a button click is a
// real user gesture, so the prompt reliably appears (a voice command alone can't trigger it).
// It also IS the live PiP, and hands frames back to the content script over postMessage.

const video = document.getElementById("v");
const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
let stream = null;
let ready = false;

function post(msg) { try { parent.postMessage(Object.assign({ __sbCam: true }, msg), "*"); } catch (_) {} }

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
    if (!ready) { ready = true; post({ type: "ready" }); }
  } catch (e) {
    const name = e?.name || "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") { post({ type: "denied", reason: "nocam" }); showAsk("No camera found on this device."); return; }
    if (name === "NotReadableError" || name === "TrackStartError") { showAsk("Camera is in use by another app. Close it and tap to retry."); return; }
    // NotAllowedError / SecurityError: needs the user to allow it.
    if (viaGesture) { post({ type: "denied", reason: "blocked" }); showAsk("Camera blocked. Click the camera icon in the address bar → Allow, then retry."); }
    else { post({ type: "needpermission" }); showAsk("Tap to let Braino see — then choose Allow."); }
  }
}

grantBtn.addEventListener("click", () => start(true));

window.addEventListener("message", (e) => {
  const d = e?.data || {};
  if (d.__sbCamCmd === "grab") {
    if (!video.videoWidth) { post({ type: "frame", data: "" }); return; }
    const w = Math.min(1024, video.videoWidth);
    const h = Math.round(w * (video.videoHeight / video.videoWidth));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    try { c.getContext("2d").drawImage(video, 0, 0, w, h); } catch (_) { post({ type: "frame", data: "" }); return; }
    // PNG to match the vision backend's declared image/png mime.
    post({ type: "frame", data: (c.toDataURL("image/png").split(",")[1] || "") });
  } else if (d.__sbCamCmd === "stop") {
    try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    stream = null; ready = false;
  }
});

window.addEventListener("beforeunload", () => { try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {} });

// Try silently first — works instantly if the extension already has the grant; otherwise the
// "Enable camera" button is shown and we tell the content script a permission tap is needed.
start(false);
