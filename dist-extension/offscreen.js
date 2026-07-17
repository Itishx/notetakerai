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

async function startRealtimeSession({ authToken, bootInstructions, voiceEngine }) {
  stopRealtimeSession();

  try {
    rtMic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

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
      body: offer.sdp || "",
    });

    if (!res.ok) {
      let msg = `Live AI failed (${res.status})`;
      try { const t = await res.text(); const j = JSON.parse(t); msg = j.details || j.error || t || msg; } catch {}
      throw new Error(msg);
    }

    const answerSdp = await res.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await dataChannelOpen;

    // Send the full session.update event (system prompt + turn_detection + modalities).
    // This MUST include create_response:false or the model auto-responds to everything.
    if (bootInstructions) {
      rtSendEvent(bootInstructions); // caller passes the full session.update event object
    }

    return {
      sessionId: res.headers.get("x-braino-realtime-session-id") || null,
      limitMs: Number(res.headers.get("x-braino-realtime-limit-ms") || "0"),
      allocatedMs: Number(res.headers.get("x-braino-realtime-allocated-ms") || "0"),
      realtimeModel: res.headers.get("x-braino-realtime-model") || null,
      transcriptionModel: res.headers.get("x-braino-realtime-transcription-model") || null,
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let micStream = null;
let tabStream = null;
let micRecorder = null;
let micChunks = [];
let playbackAudio = null;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || null);
    reader.onerror = () => reject(reader.error || new Error("Failed to read audio blob"));
    reader.readAsDataURL(blob);
  });
}

async function flushRecorder(recorder) {
  if (!recorder || recorder.state !== "recording") return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      recorder.removeEventListener("dataavailable", onDataAvailable);
      resolve();
    };
    const onDataAvailable = () => finish();
    const timer = setTimeout(finish, 300);
    recorder.addEventListener("dataavailable", onDataAvailable, { once: true });
    try {
      recorder.requestData();
    } catch (_) {
      finish();
    }
  });
}

async function buildKnownSpeakerReferences() {
  if (micRecorder && micRecorder.state === "recording") {
    await flushRecorder(micRecorder);
  }
  if (!micChunks.length) return [];
  const referenceChunks = micChunks.slice(0, 6);
  if (referenceChunks.length < 2) return [];
  const audioBase64 = await blobToBase64(new Blob(referenceChunks, { type: "audio/webm" }));
  if (!audioBase64) return [];
  return [{ name: "You", audioBase64, mimeType: "audio/webm" }];
}

async function getSegmentPayload() {
  if (!mediaRecorder) return { audioBase64: null, knownSpeakerReferences: [] };
  await flushRecorder(mediaRecorder);
  if (audioChunks.length === 0) {
    return {
      audioBase64: null,
      knownSpeakerReferences: await buildKnownSpeakerReferences(),
    };
  }
  const chunksToProcess = audioChunks.slice();
  audioChunks = [];
  return {
    audioBase64: await blobToBase64(new Blob(chunksToProcess, { type: "audio/webm" })),
    knownSpeakerReferences: await buildKnownSpeakerReferences(),
  };
}

function cleanupCaptureResources() {
  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
  }
  mediaRecorder = null;
  audioChunks = [];
  if (micRecorder) {
    try { if (micRecorder.state !== "inactive") micRecorder.stop(); } catch (_) {}
    micRecorder = null;
  }
  micChunks = [];
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (tabStream) {
    tabStream.getTracks().forEach((t) => t.stop());
    tabStream = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
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
      .catch(() => sendResponse({ audioBase64: null, knownSpeakerReferences: [] }));
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

  let recordStream = tabStream;

  // For meetings: mix tab audio + microphone
  if (withMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(tabStream).connect(dest);
      audioContext.createMediaStreamSource(micStream).connect(dest);
      recordStream = dest.stream;

      micChunks = [];
      micRecorder = new MediaRecorder(micStream, { mimeType: "audio/webm;codecs=opus" });
      micRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) micChunks.push(e.data);
      };
      micRecorder.start(1000);
    } catch (e) {
      cleanupCaptureResources();
      const message = e?.message || "Microphone access failed";
      throw new Error(`Couldn't access your microphone for Meeting mode. ${message}`);
    }
  }

  audioChunks = [];
  mediaRecorder = new MediaRecorder(recordStream, { mimeType: "audio/webm;codecs=opus" });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.start(1000);
}

async function stopCapture() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("Not recording"));
      return;
    }

    mediaRecorder.onstop = () => {
      (async () => {
        const mixedChunks = audioChunks.slice();
        const audioBase64 = mixedChunks.length
          ? await blobToBase64(new Blob(mixedChunks, { type: "audio/webm" }))
          : null;
        const knownSpeakerReferences = await buildKnownSpeakerReferences();
        cleanupCaptureResources();
        resolve({ audioBase64, knownSpeakerReferences });
      })().catch((error) => {
        cleanupCaptureResources();
        reject(error);
      });
    };

    mediaRecorder.stop();
  });
}
