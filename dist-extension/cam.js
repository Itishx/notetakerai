// Extension-origin camera popup window — a TOP-LEVEL context, so no page's Permissions-Policy can
// block the camera. Grants the EXTENSION camera (persistent), shows the live feed, and answers the
// background's one-shot messages (camGetStatus / camGrab / camClose). No Port → there's nothing to
// lose when the MV3 service worker sleeps and restarts.

const video = document.getElementById("v");
const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
let stream = null;
let lastStatus = "idle";    // idle | ready | needpermission | denied

function stop() { try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {} stream = null; }
function showVideo() { ask.style.display = "none"; video.style.display = "block"; }
function showAsk(t) { ask.style.display = "flex"; video.style.display = "none"; if (t) hint.textContent = t; }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "camGetStatus") { sendResponse({ status: lastStatus }); return; }
  if (msg?.action === "camGrab") { grab((frame) => sendResponse({ frame })); return true; }   // async
  if (msg?.action === "camClose") { stop(); try { window.close(); } catch (_) {} sendResponse && sendResponse({ ok: true }); return; }
});

function grab(cb) {
  const draw = (tries) => {
    if (!video.videoWidth) {
      if (tries > 0) { setTimeout(() => draw(tries - 1), 120); return; }
      cb(""); return;
    }
    const w = Math.min(1024, video.videoWidth);
    const h = Math.round(w * (video.videoHeight / video.videoWidth));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    try { c.getContext("2d").drawImage(video, 0, 0, w, h); } catch (_) { cb(""); return; }
    cb(c.toDataURL("image/png").split(",")[1] || "");   // PNG to match the vision backend's mime
  };
  draw(8);
}

async function start(viaGesture) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
    });
    video.srcObject = stream;
    await new Promise((res) => {                           // wait until the frame actually has dimensions
      if (video.videoWidth) return res();
      video.onloadedmetadata = () => res();
      setTimeout(res, 1500);
    });
    try { await video.play(); } catch (_) {}
    showVideo();
    lastStatus = "ready";
  } catch (e) {
    const name = e?.name || "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") { showAsk("No camera found on this device."); lastStatus = "denied"; return; }
    if (name === "NotReadableError" || name === "TrackStartError") { showAsk("Camera is busy in another app. Close it and tap to retry."); return; }
    if (viaGesture) { showAsk("Blocked. Click the camera icon in the address bar → Allow, then tap again."); lastStatus = "denied"; }
    else { showAsk("Tap to let Braino see — then choose Allow."); lastStatus = "needpermission"; }
  }
}

grantBtn.addEventListener("click", () => start(true));
window.addEventListener("beforeunload", stop);
start(false);   // silent attempt — instant if the extension already holds the grant
