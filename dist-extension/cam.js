// Extension-origin camera popup window — a TOP-LEVEL context, so no page's Permissions-Policy can
// block the camera. Grants the EXTENSION camera (persistent), shows the live feed, and hands single
// frames to the background over a Port. Reconnects the Port when the MV3 service worker restarts and
// re-announces its status, so the background never loses track of this window.

const video = document.getElementById("v");
const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
let stream = null;
let lastStatus = "";        // "ready" | "needpermission" | "denied"
let port = null;

function send(msg) { try { port && port.postMessage(msg); } catch (_) {} }
function setStatus(s) { lastStatus = s; send({ type: s }); }
function stop() { try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {} stream = null; }

function onPortMsg(m) {
  if (m?.type === "grab") grab();
  else if (m?.type === "ping") { if (lastStatus) send({ type: lastStatus }); }
  else if (m?.type === "close") { stop(); try { window.close(); } catch (_) {} }
}
function connectPort() {
  try { port = chrome.runtime.connect({ name: "camWindow" }); }
  catch (_) { port = null; return; }
  port.onMessage.addListener(onPortMsg);
  port.onDisconnect.addListener(() => { port = null; setTimeout(connectPort, 400); });   // SW restarted → reconnect
  if (lastStatus) send({ type: lastStatus });   // re-announce to a freshly-(re)started worker
}

function showVideo() { ask.style.display = "none"; video.style.display = "block"; }
function showAsk(t) { ask.style.display = "flex"; video.style.display = "none"; if (t) hint.textContent = t; }

function grab() {
  const draw = (tries) => {
    if (!video.videoWidth) {
      if (tries > 0) { setTimeout(() => draw(tries - 1), 120); return; }
      send({ type: "frame", data: "" }); return;
    }
    const w = Math.min(1024, video.videoWidth);
    const h = Math.round(w * (video.videoHeight / video.videoWidth));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    try { c.getContext("2d").drawImage(video, 0, 0, w, h); } catch (_) { send({ type: "frame", data: "" }); return; }
    // PNG to match the vision backend's declared image/png mime.
    send({ type: "frame", data: (c.toDataURL("image/png").split(",")[1] || "") });
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
    setStatus("ready");
  } catch (e) {
    const name = e?.name || "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") { showAsk("No camera found on this device."); setStatus("denied"); return; }
    if (name === "NotReadableError" || name === "TrackStartError") { showAsk("Camera is busy in another app. Close it and tap to retry."); return; }
    if (viaGesture) { showAsk("Blocked. Click the camera icon in the address bar → Allow, then tap again."); setStatus("denied"); }
    else { showAsk("Tap to let Braino see — then choose Allow."); setStatus("needpermission"); }
  }
}

grantBtn.addEventListener("click", () => start(true));
window.addEventListener("beforeunload", stop);

connectPort();
start(false);   // silent attempt — instant if the extension already holds the grant
