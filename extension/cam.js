// Extension-origin camera GRANT window (top-level → no page Permissions-Policy can block it). Its
// ONLY job is to obtain the camera permission for the extension via a real button gesture — exactly
// like mic-permission.js. Once granted, the (invisible) offscreen document inherits the grant and
// does the actual frame capture. This window then releases the camera and closes.

const ask = document.getElementById("ask");
const grantBtn = document.getElementById("grant");
const hint = document.getElementById("hint");
const video = document.getElementById("v");

function fail(text) { ask.style.display = "flex"; video.style.display = "none"; hint.textContent = text; }

async function start(viaGesture) {
  if (viaGesture) hint.textContent = "Asking for camera…";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    // Brief confirmation preview, then release the camera so the offscreen grabber can use it.
    try { video.srcObject = stream; video.style.display = "block"; ask.style.display = "none"; await video.play().catch(() => {}); } catch (_) {}
    setTimeout(() => {
      try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { window.close(); } catch (_) {}
    }, 1400);
  } catch (e) {
    const n = e?.name || "";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") fail("No camera found on this device.");
    else if (n === "NotReadableError" || n === "TrackStartError") fail("Camera is busy in another app. Close it, then tap.");
    else fail("Tap to let Braino see — then choose Allow.");
  }
}

grantBtn.addEventListener("click", () => start(true));

// Try silently first — if the extension already holds the grant this just flashes a preview and
// closes; otherwise it shows the "Enable camera" button for the one required click.
start(false);
