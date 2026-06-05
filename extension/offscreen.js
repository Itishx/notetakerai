// Offscreen document for audio recording (MV3 requirement)
// Also handles SpeechRecognition for voice mode (mic access works here, not in side panel)
// Phase 2: hosts the realtime WebRTC session so voice follows across tabs.

// ===== REALTIME VOICE SESSION (extension-global) =====
const RT_API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";
const RT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";

let rtPc = null;
let rtDc = null;
let rtMic = null;
let rtRemoteAudio = null;

async function startRealtimeSession({ authToken, bootInstructions }) {
  stopRealtimeSession();

  try {
    rtMic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    rtMic.getTracks().forEach((t) => pc.addTrack(t, rtMic));

    // Remote audio plays from offscreen (extension-global) so it's heard on any tab.
    rtRemoteAudio = new Audio();
    rtRemoteAudio.autoplay = true;
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

    const res = await fetch(`${RT_API_BASE}/openai-realtime-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        apikey: RT_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
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
    const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
    const isFinal = e.results[e.results.length - 1].isFinal;
    chrome.runtime.sendMessage({ action: "voiceEvent", event: "transcript", text: transcript, isFinal });
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return;

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
      .then((base64) => sendResponse({ audioBase64: base64 }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  if (message.action === "getSegment") {
    if (!mediaRecorder || audioChunks.length === 0) {
      sendResponse({ audioBase64: null });
      return true;
    }
    const chunksToProcess = audioChunks.slice();
    audioChunks = [];
    const blob = new Blob(chunksToProcess, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onload = () => sendResponse({ audioBase64: reader.result.split(",")[1] });
    reader.onerror = () => sendResponse({ audioBase64: null });
    reader.readAsDataURL(blob);
    return true;
  }
});

async function startCapture(streamId, withMic) {
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Play the tab audio back so the user can still hear it
  const audio = document.createElement("audio");
  audio.srcObject = tabStream;
  audio.autoplay = true;
  audio.id = "playback";
  document.body.appendChild(audio);

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
    } catch (e) {
      console.warn("Mic access denied, recording tab audio only:", e.message);
      // Fall back to tab-only
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
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      audioChunks = [];

      // Stop mic if active
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
      }

      // Remove playback element
      const playback = document.getElementById("playback");
      if (playback) playback.remove();

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(blob);
    };

    mediaRecorder.stop();
  });
}
