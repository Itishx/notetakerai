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
const DOCK_PERCH_LIFT = 42;
const START_OFFSCREEN_X = -W - 36;

walkerFlip.innerHTML = window.brainoMac.getWalkerSvg();
const root = walker.querySelector("#__sbwk_root__");
const q = (selector) => root?.querySelector(selector);

let start = performance.now();
let last = start;
let movementMode = "dock";
let displayMetrics = null;
let posX = START_OFFSCREEN_X;
let posY = getDockBounds().y;
let targetX = getDockBounds().minX;
let targetY = getDockBounds().y;
let nextTargetAt = start + 4200;
let dirX = 1;
let waving = false;
let speaking = false;
let listening = false;
let processing = false;
let sayTimer = 0;
let waveTimer = 0;
let lastLocalControlTap = 0;
let listenToken = 0;
let mousePassthrough = true;
let dragState = null;
let rtPc = null;
let rtDc = null;
let rtMic = null;
let rtRemoteAudio = null;
let rtUserTranscript = "";
let rtTranscriptFlushTimer = 0;
let rtUsageSessionId = null;
let rtHeartbeatTimer = null;
let realtimeActive = false;
let realtimeConnecting = false;
let realtimeVoiceEngine = "fish";
let voiceCycleInFlight = false;
let voiceTurnInFlight = false;
let currentSpeechAudio = null;
let speechGeneration = 0;
let lastSpokenLine = { text: "", ts: 0 };
let scriptedWalk = null;
let authPose = false;
let startupActive = false;
let startupPose = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logRenderer(event, data = {}) {
  window.brainoMac.log({ event, data }).catch(() => {});
}

function errorForLog(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error || ""),
    stack: error?.stack ? String(error.stack).split("\n").slice(0, 5).join("\n") : "",
  };
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
  const measuredDockTop = Number(displayMetrics?.dockTop || 0);
  const dockTop = measuredDockTop > 0
    ? clamp(measuredDockTop, 90, window.innerHeight - 20)
    : window.innerHeight - ESTIMATED_DOCK_HEIGHT;
  const y = clamp(dockTop - H - DOCK_PERCH_LIFT, 54, Math.max(54, window.innerHeight - H - 10));
  return {
    minX: sideInset,
    maxX: Math.max(sideInset, window.innerWidth - sideInset - W),
    y,
    snapThresholdY: dockTop - H - DOCK_PERCH_LIFT - 38,
  };
}

function applyDisplayMetrics(metrics) {
  displayMetrics = metrics && typeof metrics === "object" ? metrics : null;
  if (movementMode !== "dock" || !displayMetrics) return;
  const dock = getDockBounds();
  setPosition(posX, dock.y);
  targetY = dock.y;
  targetX = clamp(targetX, dock.minX, dock.maxX);
  updateFloatingUi();
}

function setPosition(x, y, options = {}) {
  const bounds = getMoveBounds();
  const minX = options.allowOffscreen ? START_OFFSCREEN_X : bounds.minX;
  const minY = options.allowOffscreen ? -H - 36 : bounds.minY;
  const maxY = options.allowOffscreen ? window.innerHeight + H + 36 : bounds.maxY;
  posX = clamp(x, minX, bounds.maxX);
  posY = clamp(y, minY, maxY);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function walkTo(x, y, options = {}) {
  return new Promise((resolve) => {
    scriptedWalk = {
      x,
      y,
      speed: options.speed || 70,
      allowOffscreen: Boolean(options.allowOffscreen),
      resolve,
    };
  });
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
  walker.classList.toggle("voice-active", ["connecting", "listening", "hearing", "captured", "speaking"].includes(status));
  walker.classList.toggle("connecting", status === "connecting");
  walker.classList.toggle("listening", status === "listening");
  walker.classList.toggle("hearing", status === "hearing");
  walker.classList.toggle("captured", status === "captured");
  walker.classList.toggle("speaking", status === "speaking");
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
  window.clearTimeout(waveTimer);
  if (on) waveTimer = window.setTimeout(() => { waving = false; }, 1500);
}

function setAuthPose(on) {
  authPose = Boolean(on);
  walker.classList.toggle("authenticating", authPose);
}

function flashAuthSuccess() {
  walker.classList.add("authenticated");
  window.setTimeout(() => walker.classList.remove("authenticated"), 1200);
}

function setStartupPose(pose) {
  startupPose = pose ? { ...startupPose, ...pose } : null;
}

function normalizeForVoiceMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function noteSpoken(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (normalized) lastSpokenLine = { text: normalized, ts: Date.now() };
}

function voiceAddressesBraino(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (/\b(braino|bruno|breno|reno|dino)\b/.test(normalized)) return true;
  return /\b(stop|pause|wait|hold on|listen|repeat|cancel|enough|organize|organise|open|search|find|clean|undo)\b/.test(normalized);
}

function isSelfEcho(text) {
  const heard = normalizeForVoiceMatch(text);
  const spoken = lastSpokenLine.text;
  if (!heard || !spoken || Date.now() - lastSpokenLine.ts > 10000) return false;
  if (heard === spoken) return true;
  if (heard.length >= 10 && (spoken.includes(heard) || heard.includes(spoken))) return true;
  const heardWords = new Set(heard.split(" "));
  const spokenWords = spoken.split(" ");
  const overlap = spokenWords.filter((word) => heardWords.has(word)).length;
  return spokenWords.length >= 4 && overlap / spokenWords.length >= 0.68;
}

function transcriptStats(text) {
  const normalized = normalizeForVoiceMatch(text);
  const words = normalized ? normalized.split(" ").filter(Boolean) : [];
  return { normalized, words, wordCount: words.length };
}

function shouldAcceptVoiceTranscript(text) {
  const stats = transcriptStats(text);
  if (!stats.normalized || stats.wordCount === 0) return false;
  if (isSelfEcho(text) && !voiceAddressesBraino(text)) return false;
  if ((speaking || processing || voiceTurnInFlight) && !voiceAddressesBraino(text)) return false;
  if (/^(hi|hello|hey|yo|braino|bruno|breno|reno)$/i.test(stats.normalized)) return true;
  if (stats.wordCount === 1 && !voiceAddressesBraino(text)) return false;
  if (stats.normalized.length < 3 && !voiceAddressesBraino(text)) return false;
  if (/^(uh|um|hmm|huh|yeah|okay|ok|no|yes|thanks?|thank you)$/i.test(stats.normalized)) return false;
  return true;
}

function stopSpeechOutput() {
  speechGeneration += 1;
  if (currentSpeechAudio) {
    try { currentSpeechAudio.pause(); } catch (_) {}
    currentSpeechAudio.src = "";
    currentSpeechAudio = null;
  }
  speaking = false;
  setTalk(false);
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
  const generation = ++speechGeneration;
  noteSpoken(line);
  setBubble(line, Math.max(2400, Math.min(7200, line.length * 58)));
  speaking = true;
  setStatus("speaking", "Speaking");
  setTalk(true);
  try {
    const response = await window.brainoMac.tts(line);
    if (response?.ok && response.dataUrl) {
      const audio = new Audio(response.dataUrl);
      currentSpeechAudio = audio;
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
      if (currentSpeechAudio === audio) currentSpeechAudio = null;
    } else {
      await window.brainoMac.systemSay(line);
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(3600, Math.max(900, line.length * 42))));
    }
  } finally {
    if (generation === speechGeneration) {
      speaking = false;
      currentSpeechAudio = null;
      setTalk(false);
      if (realtimeActive && !processing) setStatus("listening", "Listening");
      else if (!listening && !processing) setStatus("ready", "Double Space to show/hide");
    }
  }
}

async function runDelegate(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) return;
  logRenderer("delegate.start", {
    promptChars: text.length,
    keepRealtime: Boolean(options.keepRealtime),
    realtimeActive,
  });
  processing = true;
  if (options.keepRealtime) {
    listening = realtimeActive;
  } else {
    listening = false;
    stopRecognition();
    stopRealtimeVoice();
  }
  setStatus("thinking", "Delegating");
  setBubble(text, 1400);
  setWave(true);
  try {
    const result = await window.brainoMac.delegate(text);
    logRenderer("delegate.done", {
      ok: Boolean(result?.ok),
      sayChars: String(result?.say || "").length,
      filesCount: Array.isArray(result?.files) ? result.files.length : 0,
    });
    showFiles(result?.files || []);
    await speak(result?.say || "Done.");
  } catch (error) {
    logRenderer("delegate.error", { error: errorForLog(error) });
    await speak(`Delegate error: ${error?.message || "something broke"}.`);
    setStatus("error", "Delegate error");
  } finally {
    processing = false;
    if (realtimeActive) {
      listening = true;
      setStatus("listening", "Listening");
    }
  }
}

function stopRecognition() {
  listenToken += 1;
  window.brainoMac.stopNativeListen().catch(() => {});
  listening = false;
}

function buildRealtimeSessionUpdate() {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions: [
        "You are Braino running as a Mac desktop companion.",
        "You are not the final assistant voice. Your job is to listen accurately, transcribe the user's command, and let the Mac app execute it.",
        "If the audio is fan noise, music, a cough, a tiny background word, or side chatter that is not addressed to Braino, do not guess.",
        "Stay in English unless the user explicitly asks otherwise.",
        "Prefer silence over hallucination when the audio is unclear.",
      ].join("\n"),
      output_modalities: realtimeVoiceEngine === "realtime" ? ["audio"] : ["text"],
      audio: {
        input: {
          noise_reduction: {
            type: "near_field",
          },
          transcription: {
            model: "gpt-4o-transcribe",
            language: "en",
            prompt: [
              "Transcribe the user's direct command to Braino.",
              "Ignore music, fans, coughs, accidental noises, and unrelated background speech.",
              "Keep names, app names, URLs, file names, and code tokens intact.",
              "If the input is not a clear user command, leave it empty.",
            ].join(" "),
          },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
            create_response: false,
            interrupt_response: true,
          },
        },
        output: {
          voice: "marin",
        },
      },
    },
  };
}

function sendRealtimeEvent(event) {
  if (!rtDc || rtDc.readyState !== "open") return false;
  const payload = { ...event };
  if (!payload.event_id) payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  rtDc.send(JSON.stringify(payload));
  return true;
}

function startRealtimeHeartbeat(sessionId) {
  if (rtHeartbeatTimer) window.clearInterval(rtHeartbeatTimer);
  rtUsageSessionId = sessionId || null;
  if (!rtUsageSessionId) return;
  rtHeartbeatTimer = window.setInterval(() => {
    window.brainoMac.updateRealtimeSession({
      action: "heartbeat",
      sessionId: rtUsageSessionId,
      reason: "mac_heartbeat",
    }).catch(() => {});
  }, 15000);
}

function endRealtimeUsageSession(reason = "mac_client_exit") {
  const sessionId = rtUsageSessionId;
  rtUsageSessionId = null;
  if (rtHeartbeatTimer) {
    window.clearInterval(rtHeartbeatTimer);
    rtHeartbeatTimer = null;
  }
  if (!sessionId) return;
  window.brainoMac.updateRealtimeSession({
    action: "end",
    sessionId,
    reason,
  }).catch(() => {});
}

function stopRealtimeVoice() {
  const dc = rtDc;
  const pc = rtPc;
  const mic = rtMic;
  const remoteAudio = rtRemoteAudio;
  const hadRealtime = Boolean(rtPc || rtDc || rtMic || realtimeActive || realtimeConnecting);
  rtPc = null;
  rtDc = null;
  rtMic = null;
  rtRemoteAudio = null;
  rtUserTranscript = "";
  clearRealtimeTranscriptFlush();
  realtimeActive = false;
  realtimeConnecting = false;
  voiceTurnInFlight = false;
  try { dc?.close(); } catch (_) {}
  try { pc?.close(); } catch (_) {}
  mic?.getTracks().forEach((track) => track.stop());
  if (remoteAudio) {
    try { remoteAudio.pause(); } catch (_) {}
    remoteAudio.srcObject = null;
    remoteAudio.remove();
  }
  if (hadRealtime) endRealtimeUsageSession("mac_client_stop");
  if (listening) listening = false;
}

function clearRealtimeTranscriptFlush() {
  if (rtTranscriptFlushTimer) {
    window.clearTimeout(rtTranscriptFlushTimer);
    rtTranscriptFlushTimer = 0;
  }
}

function scheduleRealtimeTranscriptFlush(reason, delay = 900) {
  clearRealtimeTranscriptFlush();
  rtTranscriptFlushTimer = window.setTimeout(() => {
    rtTranscriptFlushTimer = 0;
    flushRealtimeTranscript(reason);
  }, delay);
}

function flushRealtimeTranscript(reason) {
  const transcript = String(rtUserTranscript || "").trim();
  rtUserTranscript = "";
  clearRealtimeTranscriptFlush();
  const accepted = shouldAcceptVoiceTranscript(transcript);
  logRenderer("realtime.transcript.flush", {
    reason,
    transcriptChars: transcript.length,
    accepted,
    voiceTurnInFlight,
  });
  if (!transcript) {
    setStatus("listening", "Listening");
    return;
  }
  if (voiceTurnInFlight || !accepted) {
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
    } else {
      setStatus("listening", "Listening");
    }
    return;
  }
  if (speaking) stopSpeechOutput();
  voiceTurnInFlight = true;
  setRealtimeMicEnabled(false);
  void runDelegate(transcript, { keepRealtime: true }).finally(() => {
    voiceTurnInFlight = false;
    setRealtimeMicEnabled(true);
    if (realtimeActive) {
      listening = true;
      setStatus("listening", "Listening");
    }
  });
}

function setRealtimeMicEnabled(on) {
  rtMic?.getAudioTracks?.().forEach((track) => {
    track.enabled = Boolean(on);
  });
}

function handleRealtimeEvent(event) {
  if (!event?.type) return;
  if (![
    "conversation.item.input_audio_transcription.delta",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
  ].includes(event.type)) {
    logRenderer("realtime.event", { type: event.type });
  }
  if (event.type === "session.created" || event.type === "session.updated") {
    if (realtimeActive || realtimeConnecting) {
      setStatus("listening", "Listening");
    }
    return;
  }

  if (event.type === "input_audio_buffer.speech_started") {
    rtUserTranscript = "";
    clearRealtimeTranscriptFlush();
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
      return;
    }
    setStatus("hearing", "Hearing you");
    setBubble("Listening...", 0);
    return;
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
      return;
    }
    setStatus("captured", "Got it");
    setBubble("Got it.", 900);
    scheduleRealtimeTranscriptFlush("speech_stopped", 750);
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (delta) {
      rtUserTranscript += delta;
      setBubble(rtUserTranscript.trim() || "Listening...", 0);
      scheduleRealtimeTranscriptFlush("transcript_idle", 1600);
    }
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    rtUserTranscript = String(event.transcript || rtUserTranscript || "");
    flushRealtimeTranscript("completed");
    return;
  }

  if (event.type === "error") {
    const message = event.error?.message || event.message || "Realtime voice error.";
    logRenderer("realtime.event.error", { message, error: event.error || null });
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${message}`, 3600);
  }
}

async function waitForRealtimeDataChannel(dc) {
  if (dc.readyState === "open") return;
  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Live voice timed out while connecting.")), 15000);
    dc.addEventListener("open", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    dc.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Live voice control channel failed."));
    }, { once: true });
  });
}

function getLocalOfferSdp(pc, fallbackOffer = null) {
  return String(
    pc?.localDescription?.sdp ||
    pc?.pendingLocalDescription?.sdp ||
    fallbackOffer?.sdp ||
    ""
  );
}

function isLikelyRealtimeOfferSdp(sdp) {
  return /^v=0\r?$/m.test(sdp) && /^m=/m.test(sdp);
}

async function waitForIceGathering(pc, timeoutMs = 1500) {
  if (!pc || pc.iceGatheringState === "complete") return;
  await new Promise((resolve) => {
    const timeout = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    function onChange() {
      if (pc.iceGatheringState === "complete") done();
    }
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

async function createLocalRealtimeOffer(pc) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
  });
  await pc.setLocalDescription(offer);
  let sdp = getLocalOfferSdp(pc, offer);
  if (!sdp || !isLikelyRealtimeOfferSdp(sdp)) {
    await waitForIceGathering(pc, 1800);
    sdp = getLocalOfferSdp(pc, offer);
  }
  logRenderer("realtime.offer.created", {
    offerChars: sdp.length,
    iceGatheringState: pc.iceGatheringState || "unknown",
    hasVersionLine: /^v=0\r?$/m.test(sdp),
    mediaLineCount: (sdp.match(/^m=/gm) || []).length,
    hasAudioLine: /^m=audio/m.test(sdp),
    hasApplicationLine: /^m=application/m.test(sdp),
  });
  if (!sdp) {
    throw new Error("Realtime could not create a WebRTC offer. No local SDP was generated.");
  }
  if (!isLikelyRealtimeOfferSdp(sdp)) {
    throw new Error("Realtime created an invalid WebRTC offer before calling the server.");
  }
  return sdp;
}

async function ensureMicrophoneAccess() {
  logRenderer("microphone.request.start");
  const result = await window.brainoMac.requestMicrophone().catch((error) => ({
    ok: false,
    error: error?.message || "Could not request microphone access.",
  }));
  logRenderer("microphone.request.result", {
    ok: result?.ok,
    status: result?.status || "unknown",
    error: result?.error || null,
  });
  if (result?.ok === false) {
    throw new Error(result.error || "Microphone access was denied.");
  }
  if (result?.status && ["denied", "restricted"].includes(result.status)) {
    throw new Error("Microphone access is blocked in macOS Privacy settings.");
  }
}

async function startRealtimeVoice() {
  stopRecognition();
  stopRealtimeVoice();
  realtimeConnecting = true;
  listening = true;
  setStatus("connecting", "Waking voice");
  setBubble("Voice is waking up.", 1300);
  logRenderer("realtime.start", {
    voiceEngine: realtimeVoiceEngine,
    hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    hasRTCPeerConnection: Boolean(window.RTCPeerConnection),
  });

  try {
    const authResult = await window.brainoMac.ensureAuth("realtime").catch((error) => ({
      ok: false,
      error: error?.message || "Braino sign-in failed.",
    }));
    logRenderer("realtime.auth.result", {
      ok: Boolean(authResult?.ok),
      source: authResult?.source || "unknown",
      error: authResult?.error || null,
    });
    if (!authResult?.ok) {
      throw new Error(authResult?.error || "Braino sign-in is required for realtime voice.");
    }
    setAuthPose(false);
    await ensureMicrophoneAccess();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    rtMic = stream;
    logRenderer("realtime.mic.ok", {
      audioTracks: stream.getAudioTracks().length,
    });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const playOpenAiVoice = realtimeVoiceEngine === "realtime";
    rtRemoteAudio = new Audio();
    rtRemoteAudio.autoplay = true;
    rtRemoteAudio.muted = !playOpenAiVoice;
    rtRemoteAudio.volume = playOpenAiVoice ? 1 : 0;
    document.body.appendChild(rtRemoteAudio);
    pc.addEventListener("track", (event) => {
      if (!rtRemoteAudio) return;
      rtRemoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
      rtRemoteAudio.play().catch(() => {});
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc !== rtPc) return;
      logRenderer("realtime.peer.state", { state: pc.connectionState });
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        stopRealtimeVoice();
        setStatus("error", "Voice disconnected");
        setBubble("Voice disconnected. Double Control wakes me again.", 3200);
      }
    });

    const dc = pc.createDataChannel("oai-events");
    rtDc = dc;
    dc.addEventListener("open", () => logRenderer("realtime.datachannel.open"));
    dc.addEventListener("close", () => logRenderer("realtime.datachannel.close"));
    dc.addEventListener("error", () => logRenderer("realtime.datachannel.error"));
    dc.addEventListener("message", (event) => {
      try {
        handleRealtimeEvent(JSON.parse(event.data));
      } catch (_) {}
    });

    const offerSdp = await createLocalRealtimeOffer(pc);
    const result = await window.brainoMac.createRealtimeCall({
      offerSdp,
      voiceEngine: realtimeVoiceEngine,
    });
    if (!result?.ok || !result.answerSdp) {
      logRenderer("realtime.create.failed", {
        error: result?.error || "Realtime voice could not start.",
        transport: result?.transport || null,
      });
      throw new Error(result?.error || "Realtime voice could not start.");
    }
    logRenderer("realtime.create.ok", {
      transport: result.transport || "unknown",
      hasSessionId: Boolean(result.sessionId),
      realtimeModel: result.realtimeModel || null,
      transcriptionModel: result.transcriptionModel || null,
    });
    await pc.setRemoteDescription({ type: "answer", sdp: result.answerSdp });
    await waitForRealtimeDataChannel(dc);
    sendRealtimeEvent(buildRealtimeSessionUpdate());
    startRealtimeHeartbeat(result.sessionId || null);

    realtimeActive = true;
    realtimeConnecting = false;
    listening = true;
    setStatus("listening", "Listening");
    setBubble("I am listening.", 1400);
    logRenderer("realtime.ready");
  } catch (error) {
    logRenderer("realtime.start.error", { error: errorForLog(error) });
    setAuthPose(false);
    stopRealtimeVoice();
    throw error;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

async function recordShortCommandForTranscription() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    logRenderer("voice.record.unavailable", {
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      hasMediaRecorder: Boolean(window.MediaRecorder),
    });
    throw new Error("Mic recording is not available in this Electron build.");
  }

  const mimeType = window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  await ensureMicrophoneAccess();
  logRenderer("voice.record.start", { mimeType });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  try {
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Audio recording failed."));
      recorder.onstop = resolve;
    });

    recorder.start();
    await new Promise((resolve) => window.setTimeout(resolve, 4800));
    if (recorder.state !== "inactive") recorder.stop();
    await done;

    if (!chunks.length) throw new Error("No audio chunks were recorded.");
    const blob = new Blob(chunks, { type: mimeType });
    logRenderer("voice.record.done", {
      chunks: chunks.length,
      bytes: blob.size,
      mimeType: blob.type || mimeType,
    });
    const audioBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return window.brainoMac.transcribeAudio({
      audioBase64,
      mimeType: blob.type || mimeType,
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function startLegacyCommandCapture(reason = "") {
  if (processing) return;
  stopRecognition();
  const token = listenToken;
  listening = true;
  setStatus("listening", "Listening");
  setBubble(reason ? "Realtime missed. Say it once more." : "I am listening.", 1200);
  setWave(true);
  logRenderer("voice.fallback.start", {
    reason,
  });

  try {
    let transcript = "";
    let lastError = null;

    try {
      setStatus("listening", "Recording");
      const recorded = await recordShortCommandForTranscription();
      if (token !== listenToken) return;
      transcript = String(recorded?.transcript || "").trim();
      if (!(recorded?.ok && transcript)) {
        throw new Error(recorded?.error || "Recording did not return a transcript.");
      }
      logRenderer("voice.fallback.recording_transcript", {
        transcriptChars: transcript.length,
      });
    } catch (recordError) {
      lastError = recordError;
      logRenderer("voice.fallback.recording_error", { error: errorForLog(recordError) });
      setStatus("listening", "Native fallback");
      setBubble("Recording missed. Trying native voice.", 1600);
      const result = await window.brainoMac.nativeListen();
      if (token !== listenToken) return;
      transcript = String(result?.transcript || "").trim();
      if (!(result?.ok && transcript)) {
        logRenderer("voice.fallback.native_failed", {
          ok: result?.ok,
          error: result?.error || lastError?.message || null,
        });
        throw new Error(result?.error || lastError?.message || "Voice did not return a transcript.");
      }
      logRenderer("voice.fallback.native_transcript", {
        transcriptChars: transcript.length,
      });
    }

    listening = false;
    void runDelegate(transcript);
  } catch (error) {
    if (token !== listenToken) return;
    logRenderer("voice.fallback.error", { error: errorForLog(error) });
    listening = false;
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${error?.message || "native speech failed"}`, 3600);
    const typed = window.prompt("Braino Mac delegate command");
    if (typed) void runDelegate(typed);
  } finally {
    if (token === listenToken && !processing) {
      listening = false;
      setStatus("ready", "Double Space to show/hide");
    }
  }
}

async function startListening() {
  if (processing || realtimeConnecting || realtimeActive || voiceCycleInFlight) return;
  voiceCycleInFlight = true;
  logRenderer("voice.toggle.start_listening");
  try {
    await startRealtimeVoice();
  } catch (error) {
    logRenderer("voice.realtime_to_fallback", { error: errorForLog(error) });
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${error?.message || "realtime failed"}`, 3600);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    await startLegacyCommandCapture(error?.message || "");
  } finally {
    voiceCycleInFlight = false;
  }
}

function toggleVoice() {
  if (realtimeActive || realtimeConnecting || listening) {
    stopRealtimeVoice();
    stopRecognition();
    setStatus("ready", "Double Space to show/hide");
    setBubble("Stopped listening.", 1200);
    return;
  }
  void startListening();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function runWakeupClimb(config = {}) {
  return new Promise((resolve) => {
    const dock = getDockBounds();
    const climbX = clamp(Math.round(window.innerWidth * 0.5 - W / 2), dock.minX, dock.maxX);
    const entryX = clamp(climbX - 150, dock.minX, dock.maxX);
    const finalY = dock.y;
    const floorY = finalY + 74;
    const startY = finalY + 230;
    let phase = "pop";
    let phaseStart = performance.now();
    let saidAuth = false;
    let saidHello = false;
    let authBegun = false;
    let authResolved = false;
    let authResult = null;
    let firstName = "";
    let raf = 0;
    let pose = {
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
      eyeScale: 1,
      gazeX: 0,
      gazeY: -0.55,
      rootRot: 0,
      rootY: 0,
      rootScale: 1,
    };

    const next = (name) => {
      phase = name;
      phaseStart = performance.now();
    };
    const poseTo = (patch) => {
      pose = { ...pose, ...patch };
      setStartupPose(pose);
    };
    const place = (x, y, rot = 0) => {
      setPosition(x, y, { allowOffscreen: true });
      poseTo({ rootRot: rot });
    };
    const loadName = async () => {
      const auth = await window.brainoMac.authStatus().catch(() => null);
      firstName = String(auth?.displayName || "").split(" ")[0]?.trim() || "";
    };
    const startAuth = () => {
      if (authBegun) return;
      authBegun = true;
      setAuthPose(true);
      window.brainoMac.ensureAuth("startup").then((result) => {
        authResult = result || { ok: false, error: "Braino sign-in failed." };
      }).catch((error) => {
        authResult = { ok: false, error: error?.message || "Braino sign-in failed." };
      }).finally(async () => {
        authResolved = true;
        if (authResult?.ok) await loadName();
      });
    };
    const finish = (result) => {
      if (raf) window.cancelAnimationFrame(raf);
      setAuthPose(false);
      setStartupPose(null);
      setWave(false);
      setPosition(climbX, finalY, { allowOffscreen: true });
      targetX = climbX;
      targetY = finalY;
      dirX = 1;
      resolve(result || authResult || { ok: false, error: "Braino sign-in failed." });
    };

    void loadName();
    setPosition(entryX, startY, { allowOffscreen: true });
    targetX = climbX;
    targetY = finalY;
    dirX = 1;
    walker.classList.add("visible");
    setStartupPose(pose);

    const step = (now) => {
      const e = now - phaseStart;
      if (phase === "pop") {
        const k = easeOut(Math.min(1, e / 1050));
        place(entryX, lerp(startY, floorY, k));
        poseTo({ gazeX: 0, gazeY: -0.4, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, eyeScale: 1 });
        if (k >= 1) next("walk");
      } else if (phase === "walk") {
        const k = Math.min(1, e / 1000);
        const s = (e / 1000) * 9;
        place(lerp(entryX, climbX, easeInOut(k)), floorY, Math.sin(s) * 3.4);
        poseTo({
          leftLeg: Math.max(0, Math.sin(s)) * 16,
          rightLeg: Math.max(0, Math.sin(s + Math.PI)) * 16,
          gazeX: 1.6,
          gazeY: 0,
        });
        if (k >= 1) {
          poseTo({ leftLeg: 0, rightLeg: 0, rootRot: 0 });
          next("reach");
        }
      } else if (phase === "reach") {
        const k = easeInOut(Math.min(1, e / 600));
        place(climbX, floorY - lerp(0, 6, k));
        poseTo({
          leftArm: lerp(0, -122, k),
          rightArm: lerp(0, 122, k),
          gazeX: 0,
          gazeY: -0.8,
        });
        if (k >= 1) next("grip");
      } else if (phase === "grip") {
        const k = easeInOut(Math.min(1, e / 800));
        place(climbX, lerp(floorY - 6, floorY - 44, k));
        poseTo({
          leftArm: lerp(-122, -100, k),
          rightArm: lerp(122, 100, k),
          leftLeg: lerp(0, 18, k),
          rightLeg: lerp(0, 18, k),
        });
        if (k >= 1) next("mantle");
      } else if (phase === "mantle") {
        const k = easeInOut(Math.min(1, e / 800));
        place(climbX, lerp(floorY - 44, finalY, k));
        poseTo({
          leftArm: lerp(-100, -26, k),
          rightArm: lerp(100, 26, k),
          leftLeg: lerp(18, 0, easeOut(k)),
          rightLeg: lerp(18, 0, easeOut(k)),
        });
        if (k >= 1) {
          poseTo({ leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 });
          next("perch");
        }
      } else if (phase === "perch") {
        place(climbX, finalY);
        poseTo({
          rightArm: -28 + Math.sin(e / 45) * 18,
          leftArm: 0,
          leftLeg: 0,
          rightLeg: 0,
          gazeX: 0,
          gazeY: 0,
        });
        if (e > 300 && !saidAuth) {
          saidAuth = true;
          setBubble("allow me to authenticate you", 1500);
        }
        if (e >= 1700) {
          poseTo({ rightArm: 0 });
          startAuth();
          next("auth");
        }
      } else if (phase === "auth") {
        place(climbX, finalY);
        poseTo({
          eyeScale: lerp(1, 0.06, Math.min(1, e / 350)),
          gazeX: 0,
          gazeY: 0,
        });
        if (authResolved && e >= 700) {
          setAuthPose(false);
          if (authResult?.ok) {
            flashAuthSuccess();
            next("hello");
          } else {
            finish(authResult);
            return;
          }
        }
      } else if (phase === "hello") {
        place(climbX, finalY);
        poseTo({ eyeScale: lerp(0.06, 1, Math.min(1, e / 350)) });
        if (!saidHello && (firstName || e > 900)) {
          saidHello = true;
          setBubble(`hello, ${firstName || "there"}`, 1500);
        }
        if (e >= 1700) {
          finish(authResult || { ok: true });
          return;
        }
      }
      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
  });
}

async function runStartupSequence(config = {}) {
  startupActive = true;
  try {
    applyDisplayMetrics(config.displayMetrics);
    movementMode = "dock";
    setStatus("connecting", "Starting");
    const authResult = await runWakeupClimb(config);
    logRenderer("startup.auth.result", {
      ok: Boolean(authResult?.ok),
      source: authResult?.source || "unknown",
      error: authResult?.error || null,
    });

    if (authResult?.ok) {
      setStatus("ready", "Ready");
    } else {
      setStatus("error", "Auth needed");
      setBubble(`Sign-in did not finish: ${authResult?.error || "try again when the browser page opens."}`, 4200);
    }

    await wait(900);
    let trusted = Boolean(config.accessibilityTrusted);
    if (!trusted) {
      const requested = await window.brainoMac.requestAccessibility().catch(() => null);
      trusted = Boolean(requested?.accessibilityTrusted);
    }

    if (!trusted) {
      setStatus("ready", "Grant Accessibility for double Control");
      setBubble("Give Braino Accessibility permission so double Control works cleanly.", 3400);
    } else if (authResult?.ok) {
      setStatus("ready", "Ready");
    }

    pickRoamTarget();
  } finally {
    startupActive = false;
  }
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
window.addEventListener("beforeunload", () => stopRealtimeVoice());

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - start) / 1000;
  const shouldHoldAttention = listening || realtimeConnecting || processing || speaking;
  let walkingNow = false;

  if (!dragState && scriptedWalk) {
    const dx = scriptedWalk.x - posX;
    const dy = scriptedWalk.y - posY;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    const step = Math.min(dist, scriptedWalk.speed * dt);
    setPosition(
      posX + (dx / dist) * step,
      posY + (dy / dist) * step,
      { allowOffscreen: scriptedWalk.allowOffscreen }
    );
    if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
    walkingNow = step > 0.05 && dist > 0.5;
    if (dist <= 2.5) {
      const resolve = scriptedWalk.resolve;
      scriptedWalk = null;
      walkingNow = false;
      resolve();
    }
  } else if (!dragState && !shouldHoldAttention) {
    if (movementMode === "dock") {
      targetY = getDockBounds().y;
    }
    const distance = Math.hypot(targetX - posX, targetY - posY);
    if (distance < 5 || now > nextTargetAt) pickRoamTarget(now);
    const speed = 76;
    const dx = targetX - posX;
    const dy = targetY - posY;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    const step = Math.min(dist, speed * dt);
    setPosition(posX + (dx / dist) * step, posY + (dy / dist) * step);
    if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
    walkingNow = step > 0.05 && dist > 0.5;
  }

  walker.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
  const engaged = listening || realtimeConnecting || processing || speaking || authPose;
  walkerFlip.style.transform = `scaleX(${engaged ? 1 : dirX})`;
  updateFloatingUi();

  if (startupPose) {
    const pose = startupPose;
    const leftArmTransform = pose.leftArm ? `rotate(${pose.leftArm} 22 53)` : "";
    const rightArmTransform = pose.rightArm ? `rotate(${pose.rightArm} 78 53)` : "";
    root?.setAttribute(
      "transform",
      `rotate(${pose.rootRot || 0} 50 50) translate(0 ${pose.rootY || 0}) scale(${pose.rootScale || 1})`
    );
    q("#__sbwk_ll__")?.setAttribute("transform", pose.leftLeg ? `rotate(${pose.leftLeg} 44 74)` : "");
    q("#__sbwk_rl__")?.setAttribute("transform", pose.rightLeg ? `rotate(${pose.rightLeg} 56 74)` : "");
    q("#__sbwk_la_bg__")?.setAttribute("transform", leftArmTransform);
    q("#__sbwk_la__")?.setAttribute("transform", leftArmTransform);
    q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmTransform);
    q("#__sbwk_ra__")?.setAttribute("transform", rightArmTransform);
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${pose.eyeScale || 1}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${pose.eyeScale || 1}) translate(-62,-48)`);
    q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${pose.gazeX || 0} ${pose.gazeY || 0})`);
    q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${pose.gazeX || 0} ${pose.gazeY || 0})`);
  } else {
    const s = t * 4.5;
    const leftPhase = Math.sin(s);
    const rightPhase = Math.sin(s + Math.PI);
    const walkAmount = walkingNow ? 1 : 0;
    const leftLift = Math.max(0, leftPhase) * 5 * walkAmount;
    const rightLift = Math.max(0, rightPhase) * 5 * walkAmount;
    const leftSwing = Math.max(0, leftPhase) * 8 * walkAmount;
    const rightSwing = Math.max(0, rightPhase) * 8 * walkAmount;
    const waddle = Math.sin(s) * 3.4 * walkAmount;
    const walkBob = (-Math.abs(Math.sin(s)) * 2 - 0.4) * walkAmount;
    const breath = 1 + 0.014 * Math.sin(t * 1.7);
    const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
    const blinkPhase = t % 3.4;
    const blink = blinkPhase < 0.13 ? Math.sin((blinkPhase / 0.13) * Math.PI) : 0;
    const eyeScale = authPose ? 0.07 : Math.max(0.06, 1 - blink);
    const rightArmAngle = waving ? (-28 + Math.sin(t * 11) * 16) : 0;

    root?.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
    q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`);
    q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`);
    q("#__sbwk_la_bg__")?.setAttribute("transform", "");
    q("#__sbwk_la__")?.setAttribute("transform", "");
    q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
    q("#__sbwk_ra__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${eyeScale}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${eyeScale}) translate(-62,-48)`);

    const gaze = (engaged || !walkingNow) ? 0 : 2.4;
    const speechDrift = speaking ? Math.sin(t * 10) * 0.25 : 0;
    q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${gaze} ${speechDrift})`);
    q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${gaze} ${speechDrift})`);
  }

  const mouthOpen = speaking && Math.sin(t * 21) > -0.28;
  setTalk(mouthOpen);

  requestAnimationFrame(tick);
}

window.brainoMac.onVoiceToggle(() => toggleVoice());
window.brainoMac.onAuthRequired(() => {
  setAuthPose(true);
  setStatus("connecting", "Authenticating");
  setBubble("allow me to authenticate you", 2600);
  setWave(true);
});
window.brainoMac.onTaskProgress((progress) => {
  if (progress.status) setStatus(progress.status, progress.text || progress.status);
  if (progress.text) setBubble(progress.text, 1200);
});
window.brainoMac.onSpeechTranscript((speech) => {
  if (speech.status === "ready") {
    setStatus("listening", "Listening");
    return;
  }
  if (speech.status === "partial" && speech.text) {
    setBubble(speech.text, 0);
  }
});
window.brainoMac.onHelperStatus((status) => {
  const line = status?.line || "";
  if (startupActive) {
    logRenderer("helper.status.deferred", { line, type: status?.type || "" });
    return;
  }
  if (line === "braino-control-tap-ready") {
    setStatus("ready", "Ready");
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
  logRenderer("app.config", {
    appVersion: config?.appVersion,
    dockTop: config?.displayMetrics?.dockTop || null,
    dockHeight: config?.displayMetrics?.dockHeight || null,
    supabaseConfigured: Boolean(config?.supabaseConfigured),
    realtimeConfigured: Boolean(config?.realtimeConfigured),
    realtimeAuthSource: config?.realtimeAuthSource || "unknown",
    accessibilityTrusted: Boolean(config?.accessibilityTrusted),
    microphoneStatus: config?.microphoneStatus || "unknown",
    logPath: config?.logPath || "",
  });
  await runStartupSequence(config || {});
}).catch((error) => {
  logRenderer("app.config.error", { error: errorForLog(error) });
  walker.classList.add("visible");
  setStatus("error", "Startup error");
  setBubble(`Startup error: ${error?.message || "Braino could not load config."}`, 4200);
});

setPosition(posX, posY, { allowOffscreen: true });
pickRoamTarget();
requestAnimationFrame(tick);
