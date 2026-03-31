// Background service worker for LectureSnap (MV3)
let isRecording = false;

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    startRecording(message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "stopRecording") {
    stopRecording()
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "getStatus") {
    sendResponse({ isRecording });
    return true;
  }
});

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Recording tab audio for lecture notes",
    });
  }
}

async function startRecording(tabId) {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

  await ensureOffscreen();

  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { target: "offscreen", action: "startCapture", streamId },
      (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      }
    );
  });

  isRecording = true;
}

async function stopRecording() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { target: "offscreen", action: "stopCapture" },
      (res) => {
        isRecording = false;
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      }
    );
  });
}
