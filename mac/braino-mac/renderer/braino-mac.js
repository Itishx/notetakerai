const W = 64;
const H = 78;
const walker = document.getElementById("walker");
const walkerFlip = document.getElementById("walker-flip");
const lane = document.getElementById("walker-lane");
const bubble = document.getElementById("speech-bubble");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const fileStrip = document.getElementById("file-strip");
const ESTIMATED_DOCK_HEIGHT = 94;
const DOCK_FOOT_OVERLAP = 10;

walkerFlip.innerHTML = window.brainoMac.getWalkerSvg();
const root = walker.querySelector("#__sbwk_root__");
const q = (selector) => root?.querySelector(selector);

let start = performance.now();
let last = start;
let movementMode = "dock";
let posX = getDockBounds().minX;
let posY = getDockBounds().y;
let targetX = getDockBounds().maxX;
let targetY = getDockBounds().y;
let nextTargetAt = start + 4200;
let dirX = 1;
let waving = false;
let speaking = false;
let listening = false;
let processing = false;
let sayTimer = 0;
let lastLocalControlTap = 0;
let recognition = null;
let mousePassthrough = true;
let dragState = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getMoveBounds() {
  return {
    minX: 10,
    maxX: Math.max(10, window.innerWidth - W - 10),
    minY: 54,
    maxY: Math.max(54, window.innerHeight - H - 10),
  };
}

function getDockBounds() {
  const sideInset = Math.max(54, window.innerWidth * 0.03);
  const dockTop = window.innerHeight - ESTIMATED_DOCK_HEIGHT;
  const y = clamp(dockTop - H + DOCK_FOOT_OVERLAP, 54, Math.max(54, window.innerHeight - H - 10));
  return {
    minX: sideInset,
    maxX: Math.max(sideInset, window.innerWidth - sideInset - W),
    y,
    snapThresholdY: dockTop - H - 22,
  };
}

function setPosition(x, y) {
  const bounds = getMoveBounds();
  posX = clamp(x, bounds.minX, bounds.maxX);
  posY = clamp(y, bounds.minY, bounds.maxY);
}

function pickRoamTarget(now = performance.now()) {
  if (movementMode === "dock") {
    const dock = getDockBounds();
    targetX = clamp(dock.minX + Math.random() * (dock.maxX - dock.minX), dock.minX, dock.maxX);
    targetY = dock.y;
    nextTargetAt = now + 3200 + Math.random() * 3600;
    return;
  }

  const bounds = getMoveBounds();
  targetX = clamp(bounds.minX + Math.random() * (bounds.maxX - bounds.minX), bounds.minX, bounds.maxX);
  targetY = clamp(bounds.minY + Math.random() * (bounds.maxY - bounds.minY), bounds.minY, bounds.maxY);
  nextTargetAt = now + 2600 + Math.random() * 4400;
}

function setStatus(status, text) {
  statusPill.className = status;
  lane.className = status;
  statusText.textContent = text;
}

function updateFloatingUi() {
  const bubbleMargin = 22;
  const bubbleX = clamp(posX + W / 2, bubbleMargin, window.innerWidth - bubbleMargin);
  const bubbleY = clamp(posY - 12, 24, window.innerHeight - 90);
  bubble.style.left = `${bubbleX}px`;
  bubble.style.top = `${bubbleY}px`;
}

function setBubble(text, ms = 2600) {
  window.clearTimeout(sayTimer);
  bubble.textContent = text;
  updateFloatingUi();
  bubble.classList.add("show");
  if (ms > 0) {
    sayTimer = window.setTimeout(() => bubble.classList.remove("show"), ms);
  }
}

function showFiles(files = []) {
  fileStrip.innerHTML = "";
  if (!files.length) {
    fileStrip.classList.remove("show");
    return;
  }
  files.slice(0, 4).forEach((file) => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.textContent = String(file || "").split("/").pop() || file;
    fileStrip.appendChild(chip);
  });
  fileStrip.classList.add("show");
  window.setTimeout(() => fileStrip.classList.remove("show"), 7000);
}

function setTalk(on) {
  const smile = q("#__sbwk_smile__");
  const talk = q("#__sbwk_talk__");
  if (smile) smile.style.display = on ? "none" : "";
  if (talk) talk.style.display = on ? "inline" : "none";
}

function setWave(on) {
  waving = on;
  if (on) window.setTimeout(() => { waving = false; }, 1500);
}

function setMousePassthrough(on) {
  if (mousePassthrough === on) return;
  mousePassthrough = on;
  window.brainoMac.setMousePassthrough(on);
}

function rectContains(rect, x, y, pad = 0) {
  return x >= rect.left - pad
    && x <= rect.right + pad
    && y >= rect.top - pad
    && y <= rect.bottom + pad;
}

function pointHitsBrainoUi(x, y) {
  const walkerRect = walker.getBoundingClientRect();
  if (rectContains(walkerRect, x, y, 18)) return true;

  if (bubble.classList.contains("show")) {
    const bubbleRect = bubble.getBoundingClientRect();
    if (rectContains(bubbleRect, x, y, 8)) return true;
  }

  if (fileStrip.classList.contains("show")) {
    const stripRect = fileStrip.getBoundingClientRect();
    if (rectContains(stripRect, x, y, 8)) return true;
  }

  const statusRect = statusPill.getBoundingClientRect();
  return rectContains(statusRect, x, y, 8);
}

function refreshMousePassthrough(event) {
  if (dragState) {
    setMousePassthrough(false);
    return;
  }
  setMousePassthrough(!pointHitsBrainoUi(event.clientX, event.clientY));
}

async function speak(text) {
  const line = String(text || "").trim();
  if (!line) return;
  setBubble(line, Math.max(2400, Math.min(7200, line.length * 58)));
  speaking = true;
  setStatus("speaking", "Speaking");
  setTalk(true);
  try {
    const response = await window.brainoMac.tts(line);
    if (response?.ok && response.dataUrl) {
      const audio = new Audio(response.dataUrl);
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    } else {
      await window.brainoMac.systemSay(line);
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(3600, Math.max(900, line.length * 42))));
    }
  } finally {
    speaking = false;
    setTalk(false);
    if (!listening && !processing) setStatus("ready", "Double Control or Control+Space");
  }
}

async function runDelegate(prompt) {
  const text = String(prompt || "").trim();
  if (!text) return;
  processing = true;
  listening = false;
  stopRecognition();
  setStatus("thinking", "Delegating");
  setBubble(text, 1400);
  setWave(true);
  try {
    const result = await window.brainoMac.delegate(text);
    showFiles(result?.files || []);
    await speak(result?.say || "Done.");
  } catch (error) {
    await speak(`Delegate error: ${error?.message || "something broke"}.`);
    setStatus("error", "Delegate error");
  } finally {
    processing = false;
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function stopRecognition() {
  if (recognition) {
    try { recognition.abort(); } catch (_) {}
    recognition = null;
  }
  listening = false;
}

function startListening() {
  if (processing) return;
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    const typed = window.prompt("Braino Mac delegate command");
    if (typed) void runDelegate(typed);
    else setStatus("error", "SpeechRecognition unavailable");
    return;
  }

  stopRecognition();
  recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalText = "";
  recognition.onstart = () => {
    listening = true;
    setStatus("listening", "Listening");
    setBubble("I am listening.", 1200);
    setWave(true);
  };
  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const item = event.results[index];
      const heard = item?.[0]?.transcript || "";
      if (item?.isFinal) finalText += heard;
      else interim += heard;
    }
    const visible = (finalText || interim).trim();
    if (visible) setBubble(visible, 0);
  };
  recognition.onerror = (event) => {
    const err = event?.error || event?.message || "voice failed";
    stopRecognition();
    if (err === "no-speech") {
      setStatus("ready", "No speech heard");
      setBubble("I did not catch anything.", 1800);
      return;
    }
    setStatus("error", err);
    setBubble(`Voice error: ${err}`, 2600);
  };
  recognition.onend = () => {
    const clean = finalText.trim();
    stopRecognition();
    if (clean) void runDelegate(clean);
    else if (!processing) setStatus("ready", "Double Control or Control+Space");
  };

  try {
    recognition.start();
  } catch (error) {
    setStatus("error", "Could not start mic");
    setBubble(error?.message || "Could not start voice.", 2600);
  }
}

function toggleVoice() {
  if (listening) {
    stopRecognition();
    setStatus("ready", "Double Control or Control+Space");
    setBubble("Stopped listening.", 1200);
    return;
  }
  startListening();
}

function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  event.preventDefault();
  setPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 2200;
  updateFloatingUi();
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  try { walker.releasePointerCapture(event.pointerId); } catch (_) {}
  walker.classList.remove("dragging");
  dragState = null;
  const dock = getDockBounds();
  if (posY >= dock.snapThresholdY) {
    movementMode = "dock";
    setPosition(posX, dock.y);
    targetX = posX + dirX * 280;
    targetY = dock.y;
  } else {
    movementMode = "free";
  }
  nextTargetAt = performance.now() + 2600;
  setBubble(movementMode === "dock" ? "Back on the Dock." : "Parked here. I can still walk around.", 1600);
  refreshMousePassthrough(event);
}

walker.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dragState = {
    pointerId: event.pointerId,
    offsetX: event.clientX - posX,
    offsetY: event.clientY - posY,
  };
  setMousePassthrough(false);
  walker.classList.add("dragging");
  walker.setPointerCapture(event.pointerId);
  setBubble("Drag me anywhere.", 1200);
});

walker.addEventListener("pointermove", handleDragMove);
walker.addEventListener("pointerup", endDrag);
walker.addEventListener("pointercancel", endDrag);

window.addEventListener("mousemove", refreshMousePassthrough, { passive: true });
window.addEventListener("mouseleave", () => setMousePassthrough(true), { passive: true });
window.addEventListener("resize", () => {
  if (movementMode === "dock") {
    const dock = getDockBounds();
    setPosition(posX, dock.y);
    targetY = dock.y;
  }
  setPosition(posX, posY);
  targetX = clamp(targetX, getMoveBounds().minX, getMoveBounds().maxX);
  targetY = clamp(targetY, getMoveBounds().minY, getMoveBounds().maxY);
  updateFloatingUi();
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Control") return;
  const now = Date.now();
  if (now - lastLocalControlTap < 520) toggleVoice();
  lastLocalControlTap = now;
});

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - start) / 1000;

  if (!dragState) {
    if (movementMode === "dock") {
      targetY = getDockBounds().y;
    }
    const distance = Math.hypot(targetX - posX, targetY - posY);
    if (distance < 5 || now > nextTargetAt) pickRoamTarget(now);
    const speed = processing ? 48 : listening ? 42 : speaking ? 36 : 76;
    const dx = targetX - posX;
    const dy = targetY - posY;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    const step = Math.min(dist, speed * dt);
    setPosition(posX + (dx / dist) * step, posY + (dy / dist) * step);
    if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
  }

  walker.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
  walkerFlip.style.transform = `scaleX(${dirX})`;
  updateFloatingUi();

  const s = t * 4.5;
  const leftPhase = Math.sin(s);
  const rightPhase = Math.sin(s + Math.PI);
  const leftLift = Math.max(0, leftPhase) * 5;
  const rightLift = Math.max(0, rightPhase) * 5;
  const leftSwing = Math.max(0, leftPhase) * 8;
  const rightSwing = Math.max(0, rightPhase) * 8;
  const waddle = Math.sin(s) * 3.4;
  const walkBob = -Math.abs(Math.sin(s)) * 2 - 0.4;
  const breath = 1 + 0.014 * Math.sin(t * 1.7);
  const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
  const blinkPhase = t % 3.4;
  const blink = blinkPhase < 0.13 ? Math.sin((blinkPhase / 0.13) * Math.PI) : 0;
  const eyeScale = Math.max(0.06, 1 - blink);
  const rightArmAngle = waving ? (-28 + Math.sin(t * 11) * 16) : 0;

  root?.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
  q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`);
  q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`);
  q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
  q("#__sbwk_ra__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
  q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${eyeScale}) translate(-38,-48)`);
  q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${eyeScale}) translate(-62,-48)`);

  const mouthOpen = speaking && Math.sin(t * 21) > -0.28;
  setTalk(mouthOpen);
  q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${2.1} ${speaking ? Math.sin(t * 10) * 0.25 : 0})`);
  q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${2.1} ${speaking ? Math.sin(t * 10) * 0.25 : 0})`);

  requestAnimationFrame(tick);
}

window.brainoMac.onVoiceToggle(() => toggleVoice());
window.brainoMac.onHelperStatus((status) => {
  const line = status?.line || "";
  if (line === "braino-control-tap-ready") {
    setStatus("ready", "Double Control ready");
    setBubble("Double Control is ready.", 1800);
    return;
  }
  if (line === "needs-accessibility" || line === "event-tap-unavailable") {
    setStatus("ready", "Grant Accessibility for double Control");
  }
  if (status.type === "swift-error") {
    setStatus("ready", "Control+Space ready");
  }
});

window.brainoMac.getConfig().then(async (config) => {
  setStatus("ready", "Double Control or Control+Space");
  let trusted = Boolean(config.accessibilityTrusted);
  if (!trusted) {
    const requested = await window.brainoMac.requestAccessibility().catch(() => null);
    trusted = Boolean(requested?.accessibilityTrusted);
  }
  const permissionHint = trusted
    ? "I am walking on your Dock now. Drag me anywhere, or double Control and tell me what to do."
    : "I am walking on your Dock now. Drag me anywhere. Control+Space works, and I asked macOS for Accessibility so double Control can work too.";
  void speak(permissionHint);
});

setPosition(posX, posY);
pickRoamTarget();
requestAnimationFrame(tick);
