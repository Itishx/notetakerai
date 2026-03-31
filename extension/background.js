// Background service worker for LectureSnap
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let offscreenCreated = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    startRecording(message.tabId).then(() => sendResponse({ success: true })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "stopRecording") {
    stopRecording().then(blob => {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        sendResponse({ audioBase64: base64 });
      };
      reader.readAsDataURL(blob);
    }).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "getStatus") {
    sendResponse({ isRecording });
    return true;
  }
});

async function startRecording(tabId) {
  const stream = await chrome.tabCapture.capture({
    audio: true,
    video: false
  });

  if (!stream) throw new Error("Failed to capture tab audio");

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.start(1000); // collect chunks every second
  isRecording = true;
}

async function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("Not recording"));
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
      isRecording = false;
      audioChunks = [];
      resolve(blob);
    };

    mediaRecorder.stop();
  });
}
