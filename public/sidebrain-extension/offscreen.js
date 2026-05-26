// Offscreen document for audio recording (MV3 requirement)
// Also handles SpeechRecognition for voice mode (mic access works here, not in side panel)

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
