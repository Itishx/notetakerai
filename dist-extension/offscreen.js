// Offscreen document for audio recording (MV3 requirement)
// Also handles SpeechRecognition for voice mode (mic access works here, not in side panel)
// Phase 2: hosts the realtime WebRTC session so voice follows across tabs.

// ── Production error hygiene: keep uncaught noise out of chrome://extensions ──
window.addEventListener("error", (e) => {
  console.warn("[Braino] handled error:", e?.error?.message || e?.message || e);
  e.preventDefault();
});
window.addEventListener("unhandledrejection", (e) => {
  console.warn("[Braino] handled rejection:", e?.reason?.message || e?.reason || "");
  e.preventDefault();
});

// ===== REALTIME VOICE SESSION (extension-global) =====
const RT_API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";
const RT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";

let rtPc = null;
let rtDc = null;
let rtMic = null;
let rtRemoteAudio = null;

function rtNormalizeSdp(sdp) {
  const text = String(sdp || "");
  if (!text.trim()) return "";
  const normalized = text.replace(/\r?\n/g, "\r\n");
  return normalized.endsWith("\r\n") ? normalized : `${normalized}\r\n`;
}

function rtSdpDiagnostics(sdp) {
  const text = String(sdp || "");
  return {
    offerChars: text.length,
    hasVersionLine: /^v=0\r?$/m.test(text),
    mediaLineCount: (text.match(/^m=/gm) || []).length,
    hasAudioLine: /^m=audio\s/m.test(text),
    hasApplicationLine: /^m=application\s/m.test(text),
    endsWithLineBreak: /\r?\n$/.test(text),
  };
}

function rtIsLikelyOfferSdp(sdp) {
  const d = rtSdpDiagnostics(sdp);
  return d.hasVersionLine && d.hasAudioLine && d.hasApplicationLine;
}

function rtIsLikelyAnswerSdp(sdp) {
  const d = rtSdpDiagnostics(sdp);
  return d.hasVersionLine && d.mediaLineCount > 0;
}

function rtGetLocalOfferSdp(pc, fallbackOffer) {
  return rtNormalizeSdp(
    pc?.localDescription?.sdp ||
    pc?.pendingLocalDescription?.sdp ||
    fallbackOffer?.sdp ||
    "",
  );
}

async function rtWaitForOfferSdp(pc, fallbackOffer, timeoutMs = 900) {
  const startedAt = Date.now();
  let sdp = rtGetLocalOfferSdp(pc, fallbackOffer);
  while (!rtIsLikelyOfferSdp(sdp) && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    sdp = rtGetLocalOfferSdp(pc, fallbackOffer);
  }
  return sdp;
}

// `near_field` assumes the mic is at your mouth. On a laptop mic that scrubs an
// arm's-length voice as if it were room noise, which is what made voice mode demand you
// lean into the screen. Only claim near_field when the label says a headset is on.
const NEAR_FIELD_MIC_RE = /airpods?|head(?:set|phones?)|earbuds?|earphones?|bluetooth|usb|external|lavalier|lapel|rode|shure|yeti|blue snowball|jabra|bose|sony wh|galaxy buds/i;

function pickNoiseReduction(micLabel) {
  return NEAR_FIELD_MIC_RE.test(String(micLabel || "")) ? "near_field" : "far_field";
}

async function startRealtimeSession({ authToken, bootInstructions, voiceEngine }) {
  stopRealtimeSession();

  try {
    // AEC on (Braino speaks out loud; without it he hears himself and barge-in dies).
    // AGC on (it is what lifts a distant voice). Chrome's own noiseSuppression off —
    // OpenAI denoises this stream already, and two denoisers on a far-field signal take
    // the voice with the room.
    rtMic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
    });
    const micLabel = String(rtMic.getAudioTracks()[0]?.label || "");
    const noiseReduction = pickNoiseReduction(micLabel);
    console.debug("[Braino][Realtime] noise reduction", { type: noiseReduction, microphone: micLabel || "unknown" });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    rtMic.getTracks().forEach((t) => pc.addTrack(t, rtMic));

    // Default Braino = mute OpenAI's audio (the model is text-only; Fish Audio is the voice).
    // OpenAI-voice mode (voiceEngine === "realtime") = PLAY the model's native audio (faster, no Fish).
    const playOpenAiVoice = voiceEngine === "realtime";
    rtRemoteAudio = new Audio();
    rtRemoteAudio.autoplay = true;
    rtRemoteAudio.muted = !playOpenAiVoice;
    rtRemoteAudio.volume = playOpenAiVoice ? 1 : 0;
    document.body.appendChild(rtRemoteAudio);
    pc.ontrack = (ev) => {
      rtRemoteAudio.srcObject = ev.streams[0] || new MediaStream([ev.track]);
      rtRemoteAudio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc !== rtPc) return;
      const s = pc.connectionState;
      if (s === "failed" || s === "disconnected") {
        chrome.runtime.sendMessage({ action: "offscreenRtDisconnected", reason: s }, () => { void chrome.runtime.lastError; });
      }
    };

    const dc = pc.createDataChannel("oai-events");
    rtDc = dc;

    const dataChannelOpen = new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("Live AI timed out while connecting.")), 15000);
      dc.addEventListener("open", () => { clearTimeout(to); resolve(); }, { once: true });
      dc.addEventListener("error", () => { clearTimeout(to); reject(new Error("Live AI could not open its control channel.")); }, { once: true });
      dc.addEventListener("message", (ev) => {
        try {
          const event = JSON.parse(ev.data);
          chrome.runtime.sendMessage({ action: "offscreenRtEvent", event }, () => { void chrome.runtime.lastError; });
        } catch (_) {}
      });
    });
    dataChannelOpen.catch(() => {});

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const offerSdp = await rtWaitForOfferSdp(pc, offer);
    const sentDiagnostics = rtSdpDiagnostics(offerSdp);
    if (!rtIsLikelyOfferSdp(offerSdp)) {
      console.warn("[Braino][Realtime] refusing invalid offer SDP", sentDiagnostics);
      throw new Error("Live AI could not create a valid audio session offer.");
    }
    console.debug("[Braino][Realtime] sending offer SDP", sentDiagnostics);

    // Per-mode model: OpenAI-voice mode uses gpt-realtime-2; Default Braino uses gpt-realtime-mini.
    // The backend validates this against an allowlist (falls back to env).
    const requestedModel = voiceEngine === "realtime" ? "gpt-realtime-2" : "gpt-realtime-mini";
    const res = await fetch(`${RT_API_BASE}/openai-realtime-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        apikey: RT_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        "X-Braino-Realtime-Model": requestedModel,
      },
      body: offerSdp,
    });

    if (!res.ok) {
      let msg = `Live AI failed (${res.status})`;
      try {
        const t = await res.text();
        try {
          const j = JSON.parse(t);
          msg = j.details || j.error || t || msg;
        } catch {
          msg = t || msg;
        }
        console.warn("[Braino][Realtime] offer rejected", {
          status: res.status,
          message: msg,
          sentDiagnostics,
        });
      } catch {}
      throw new Error(msg);
    }

    const answerSdp = await res.text();
    if (!rtIsLikelyAnswerSdp(answerSdp)) {
      console.warn("[Braino][Realtime] invalid answer SDP", {
        answerChars: String(answerSdp || "").length,
        preview: String(answerSdp || "").slice(0, 160),
      });
      throw new Error("Live AI returned an invalid audio session answer.");
    }
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await dataChannelOpen;

    // Send the full session.update event (system prompt + turn_detection + modalities).
    // This MUST include create_response:false or the model auto-responds to everything.
    if (bootInstructions) {
      // The content script builds this event before any mic exists, so it can only guess
      // the denoiser. We hold the actual device — overwrite its guess with the truth.
      const input = bootInstructions?.session?.audio?.input;
      if (input?.noise_reduction) input.noise_reduction.type = noiseReduction;
      rtSendEvent(bootInstructions); // caller passes the full session.update event object
    }

    return {
      sessionId: res.headers.get("x-braino-realtime-session-id") || null,
      limitMs: Number(res.headers.get("x-braino-realtime-limit-ms") || "0"),
      allocatedMs: Number(res.headers.get("x-braino-realtime-allocated-ms") || "0"),
      realtimeModel: res.headers.get("x-braino-realtime-model") || null,
      transcriptionModel: res.headers.get("x-braino-realtime-transcription-model") || null,
      noiseReduction,
      microphoneLabel: micLabel || null,
    };
  } catch (error) {
    stopRealtimeSession();
    throw error;
  }
}

function rtSendEvent(event) {
  if (!rtDc || rtDc.readyState !== "open") return false;
  const payload = { ...event };
  if (!payload.event_id) payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  rtDc.send(JSON.stringify(payload));
  return true;
}

function stopRealtimeSession() {
  const dc = rtDc;
  const pc = rtPc;
  const mic = rtMic;
  const remoteAudio = rtRemoteAudio;
  rtPc = null; rtDc = null; rtMic = null; rtRemoteAudio = null;
  try { dc?.close(); } catch (_) {}
  try { pc?.close(); } catch (_) {}
  mic?.getTracks().forEach((t) => t.stop());
  if (remoteAudio) { try { remoteAudio.pause(); } catch {} remoteAudio.srcObject = null; remoteAudio.remove(); }
}

// ===== SPEECH RECOGNITION =====
let recognition = null;
let voiceListening = false;

async function startSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "error", message: "Speech recognition not supported." });
    return;
  }

  // getUserMedia in the offscreen document (USER_MEDIA reason) triggers
  // the Chrome mic permission grant for the extension origin.
  // SpeechRecognition reuses this permission once granted.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    stream.getTracks().forEach(t => t.stop()); // release immediately — just needed for permission
  } catch (e) {
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "error", message: "not-allowed" });
    return;
  }

  if (!voiceListening) return; // user may have cancelled while waiting

  if (recognition) { try { recognition.abort(); } catch(e) {} }

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "listening" });
  };

  recognition.onresult = (e) => {
    const results = Array.from(e.results);
    const transcript = results.map(r => r[0].transcript).join("");
    const isFinal = e.results[e.results.length - 1].isFinal;
    const confidences = results
      .map((r) => Number(r?.[0]?.confidence))
      .filter((n) => Number.isFinite(n) && n > 0);
    const confidence = confidences.length
      ? confidences.reduce((sum, n) => sum + n, 0) / confidences.length
      : null;
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "transcript", text: transcript, isFinal, confidence });
    if (isFinal) { voiceListening = false; recognition.stop(); }
  };

  recognition.onerror = (e) => {
    if (e.error === "aborted") return;
    if (e.error === "no-speech") {
      if (voiceListening) startSpeechRecognition();
      return;
    }
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "error", message: e.error });
  };

  recognition.onend = () => {};

  try { recognition.start(); } catch(e) {
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "error", message: e.message });
  }
}

let micStream = null;
let tabStream = null;
let playbackAudio = null;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || null);
    reader.onerror = () => reject(reader.error || new Error("Failed to read audio blob"));
    reader.readAsDataURL(blob);
  });
}

// ── Segment recorders that emit COMPLETE files ───────────────────────────────
// MediaRecorder writes the WebM header (EBML + Tracks) into its FIRST blob only, so slicing
// chunks off one long-running recorder produced headerless fragments the transcription API
// cannot open — every segment after the first was silently discarded. Rotating instead: each
// cut closes the outgoing recorder into a standalone file, and the replacement starts BEFORE
// the outgoing one stops so a boundary duplicates a few milliseconds instead of losing them.
const SEG_MIME = "audio/webm;codecs=opus";

function segRecStart(seg) {
  const recorder = new MediaRecorder(seg.stream, { mimeType: SEG_MIME });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  seg.recorder = recorder;
  seg.chunks = chunks;
  seg.startedAt = Date.now();
  recorder.start(1000);
}

function segRecCreate(stream) {
  const seg = { stream, recorder: null, chunks: [], startedAt: 0 };
  segRecStart(seg);
  return seg;
}

function segRecCut(seg, { keepRecording = true } = {}) {
  return new Promise((resolve) => {
    const outgoing = seg?.recorder;
    const chunks = seg?.chunks || [];
    const durationMs = seg?.startedAt ? Date.now() - seg.startedAt : 0;
    // stop() flushes one last dataavailable into this same array before it fires "stop".
    const done = () => resolve(chunks.length ? { blob: new Blob(chunks, { type: "audio/webm" }), durationMs } : null);
    if (!seg || !outgoing || outgoing.state === "inactive") { done(); return; }
    if (keepRecording) segRecStart(seg);
    else { seg.recorder = null; seg.chunks = []; seg.startedAt = 0; }
    let settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(timer); done(); };
    const timer = setTimeout(finish, 2000);
    outgoing.addEventListener("stop", finish, { once: true });
    try { outgoing.stop(); } catch (_) { finish(); }
  });
}

function segRecStop(seg) {
  try { if (seg?.recorder && seg.recorder.state !== "inactive") seg.recorder.stop(); } catch (_) {}
  if (seg) { seg.recorder = null; seg.chunks = []; seg.startedAt = 0; }
}

// Opus spends almost nothing encoding silence, so a segment this thin is a muted call or a
// closed mic. Skipping it is not only cheaper: transcribers hallucinate on silence, and
// "Thanks for watching" has no business in anyone's meeting notes.
const SILENCE_BYTES_PER_SEC = 800;

function segLooksSilent(cut) {
  const seconds = (cut?.durationMs || 0) / 1000;
  if (!cut?.blob || seconds < 5) return false;   // too short to judge fairly
  return (cut.blob.size / seconds) < SILENCE_BYTES_PER_SEC;
}

// The call (tab audio) and you (mic) are recorded separately and stay separate. See
// startCapture for why that split is the whole point.
let captureSeg = null;
let micSeg = null;

async function getSegmentPayload(options = {}) {
  if (!captureSeg && !micSeg) return { audioStreams: [] };

  // Cut both at the same moment so the two transcripts share a clock and can be interleaved.
  const keepRecording = options.final !== true;
  const [systemCut, micCut] = await Promise.all([
    captureSeg ? segRecCut(captureSeg, { keepRecording }) : Promise.resolve(null),
    micSeg ? segRecCut(micSeg, { keepRecording }) : Promise.resolve(null),
  ]);

  const audioStreams = [];
  for (const [role, cut] of [["system", systemCut], ["mic", micCut]]) {
    if (!cut?.blob || segLooksSilent(cut)) continue;
    const audioBase64 = await blobToBase64(cut.blob);
    if (audioBase64) audioStreams.push({ role, audioBase64, mimeType: "audio/webm", durationMs: cut.durationMs });
  }
  return { audioStreams };
}

function cleanupCaptureResources() {
  if (captureSeg?.stream) {
    captureSeg.stream.getTracks().forEach((t) => t.stop());
  }
  segRecStop(captureSeg);
  captureSeg = null;
  segRecStop(micSeg);
  micSeg = null;
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (tabStream) {
    tabStream.getTracks().forEach((t) => t.stop());
    tabStream = null;
  }
  if (playbackAudio) {
    try { playbackAudio.pause(); } catch (_) {}
    playbackAudio.srcObject = null;
    playbackAudio.remove();
    playbackAudio = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return;

  if (message.action === "grabCameraFrame") {
    (async () => {
      let stream = null, v = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
        });
        v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.srcObject = stream;
        v.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;";
        document.body.appendChild(v);
        await new Promise((res) => { v.onloadedmetadata = () => res(); setTimeout(res, 1500); });
        try { await v.play(); } catch (_) {}
        await new Promise((res) => setTimeout(res, 350));   // let the sensor expose
        const vw = v.videoWidth || 640, vh = v.videoHeight || 480;
        const w = Math.min(1024, vw), h = Math.round(w * (vh / vw));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(v, 0, 0, w, h);
        const data = c.toDataURL("image/png").split(",")[1] || "";
        sendResponse({ frame: data });
      } catch (e) {
        const n = e?.name || "";
        sendResponse({ needpermission: (n === "NotAllowedError" || n === "SecurityError" || n === "PermissionDeniedError"), error: n });
      } finally {
        try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
        try { v && v.remove(); } catch (_) {}
      }
    })();
    return true;
  }

  if (message.action === "startVoiceListening") {
    voiceListening = true;
    startSpeechRecognition();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "stopVoiceListening") {
    voiceListening = false;
    if (recognition) { try { recognition.abort(); } catch(e) {} recognition = null; }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "startRealtimeSession") {
    startRealtimeSession(message)
      .then((info) => {
        chrome.runtime.sendMessage({ action: "offscreenRtReady", ...info }, () => { void chrome.runtime.lastError; });
        sendResponse({ ok: true });
      })
      .catch((e) => sendResponse({ error: e.message || "Realtime session failed" }));
    return true;
  }
  if (message.action === "sendRtEvent") {
    sendResponse({ ok: rtSendEvent(message.event) });
    return false;
  }
  if (message.action === "stopRealtimeSession") {
    stopRealtimeSession();
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "setRtMicEnabled") {
    rtMic?.getAudioTracks?.().forEach((t) => { t.enabled = !!message.enabled; });
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "startCapture") {
    startCapture(message.streamId, message.withMic)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  if (message.action === "stopCapture") {
    stopCapture()
      .then((payload) => sendResponse(payload))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  if (message.action === "getSegment") {
    getSegmentPayload()
      .then((payload) => sendResponse(payload))
      .catch(() => sendResponse({ audioStreams: [] }));
    return true;
  }
});

async function startCapture(streamId, withMic) {
  cleanupCaptureResources();

  tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Play the tab audio back so the user can still hear it
  playbackAudio = document.createElement("audio");
  playbackAudio.srcObject = tabStream;
  playbackAudio.autoplay = true;
  playbackAudio.id = "playback";
  document.body.appendChild(playbackAudio);

  // ── Two recorders, never one ───────────────────────────────────────────────
  // The call arrives on the tab; you leave on the mic. Which side a voice came in on is the
  // only speaker attribution in this system that cannot be wrong, and mixing the two into a
  // single mono track — as this used to, one line before recording — threw it away and then
  // paid a model to guess it back. Apart, the diarizer only separates the far end, and you
  // are identified by physics.
  captureSeg = segRecCreate(tabStream);

  if (withMic) {
    try {
      // Echo cancellation matters more than ever now: without it the remote voices coming out
      // of your speakers land on the mic too and get transcribed a second time, as you.
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      });
      micSeg = segRecCreate(micStream);
    } catch (e) {
      cleanupCaptureResources();
      const message = e?.message || "Microphone access failed";
      throw new Error(`Couldn't access your microphone for Meeting mode. ${message}`);
    }
  }
}

async function stopCapture() {
  if (!captureSeg?.recorder || captureSeg.recorder.state === "inactive") {
    throw new Error("Not recording");
  }
  try {
    return await getSegmentPayload({ final: true });
  } finally {
    cleanupCaptureResources();
  }
}
