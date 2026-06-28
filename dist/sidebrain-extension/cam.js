// Extension-origin camera window — a TOP-LEVEL, rendered context, so (a) no page Permissions-Policy
// can block the camera and (b) the <video> actually decodes frames (an invisible offscreen doc does
// not paint, so canvas grabs there came back empty). It shows the live feed and PUSHES frames to the
// background — the window→service-worker direction, which is reliable (worker→window was not).

const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
const video = document.getElementById("v");
let stream = null;
let granted = false;
let denied = false;

function push(msg) { try { chrome.runtime.sendMessage(Object.assign({ sbCam: true }, msg), () => { void chrome.runtime.lastError; }); } catch (_) {} }

function pushFrame() {
  if (!granted || !video.videoWidth) return;
  const w = Math.min(768, video.videoWidth);
  const h = Math.round(w * (video.videoHeight / video.videoWidth));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  try { c.getContext("2d").drawImage(video, 0, 0, w, h); } catch (_) { return; }
  const data = c.toDataURL("image/png").split(",")[1] || "";   // PNG = the backend's declared mime
  if (data) push({ type: "frame", data });
}

// One heartbeat: a fresh frame when granted, otherwise the permission status — so the background
// always has a recent signal even right after a service-worker restart.
setInterval(() => { if (granted) pushFrame(); else push({ type: "status", status: denied ? "denied" : "needpermission" }); }, 2000);

async function start(viaGesture) {
  if (viaGesture) hint.textContent = "Asking for camera…";
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
    });
    video.srcObject = stream; ask.style.display = "none"; video.style.display = "block";
    await new Promise((res) => { if (video.videoWidth) return res(); video.onloadedmetadata = () => res(); setTimeout(res, 1500); });
    try { await video.play(); } catch (_) {}
    granted = true; denied = false;
    push({ type: "status", status: "ready" });
    setTimeout(pushFrame, 300);   // first frame ASAP
  } catch (e) {
    const n = e?.name || "";
    granted = false;
    ask.style.display = "flex"; video.style.display = "none";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") { hint.textContent = "No camera found on this device."; denied = true; }
    else if (n === "NotReadableError" || n === "TrackStartError") { hint.textContent = "Camera is busy in another app. Close it, then tap."; }
    else if (viaGesture) { hint.textContent = "Blocked. Click the camera icon in the address bar → Allow, then tap again."; denied = true; }
    else { hint.textContent = "Tap to let Braino see — then choose Allow."; }
    push({ type: "status", status: denied ? "denied" : "needpermission" });
  }
}

grantBtn.addEventListener("click", () => start(true));
window.addEventListener("beforeunload", () => { try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {} });
start(false);   // silent attempt — instant feed if the extension already holds the grant
