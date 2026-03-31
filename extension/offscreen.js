// Offscreen document for audio recording (MV3 requirement)
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return;

  if (message.action === "startCapture") {
    startCapture(message.streamId)
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

async function startCapture(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Play the audio back so the user can still hear it
  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.id = "playback";
  document.body.appendChild(audio);

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

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
