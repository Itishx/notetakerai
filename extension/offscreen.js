// Offscreen document for audio recording (MV3 requirement)
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let micStream = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return;

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
