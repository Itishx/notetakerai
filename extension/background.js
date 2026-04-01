// Background service worker for SideBrain (MV3)
let isRecording = false;

function doCapture(windowId, sendResponse) {
  chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ dataUrl });
    }
  });
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.set({ activeTabId: tab.id });
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Auto-update activeTabId when user switches tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.storage.local.set({ activeTabId: tabId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getStreamId") {
    // Get stream ID from the background, which has broader permissions
    const targetTabId = message.tabId;
    if (!targetTabId) {
      // Use the currently active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (!tab?.id) {
          sendResponse({ error: "No active tab found" });
          return;
        }
        chrome.storage.local.set({ activeTabId: tab.id });
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
          if (chrome.runtime.lastError || !streamId) {
            sendResponse({ error: chrome.runtime.lastError?.message || "Failed to get stream" });
          } else {
            sendResponse({ streamId });
          }
        });
      });
    } else {
      chrome.tabCapture.getMediaStreamId({ targetTabId: targetTabId }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) {
          sendResponse({ error: chrome.runtime.lastError?.message || "Failed to get stream" });
        } else {
          sendResponse({ streamId });
        }
      });
    }
    return true;
  }
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
  if (message.action === "getPageContent") {
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = store.activeTabId;
      function queryTab(tid) {
        chrome.tabs.sendMessage(tid, { action: "extractPageContent" }, (res) => {
          if (chrome.runtime.lastError) {
            // Content script not injected yet — inject it programmatically and retry
            chrome.scripting.executeScript(
              { target: { tabId: tid }, files: ["content.js"] },
              () => {
                if (chrome.runtime.lastError) {
                  sendResponse({ error: chrome.runtime.lastError.message });
                  return;
                }
                // Retry after injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(tid, { action: "extractPageContent" }, (res2) => {
                    if (chrome.runtime.lastError) {
                      sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                      sendResponse(res2 || { error: "No response from content script" });
                    }
                  });
                }, 100);
              }
            );
          } else {
            sendResponse(res || { error: "No response from content script" });
          }
        });
      }
      if (!tabId) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          if (!tab?.id) { sendResponse({ error: "No active tab" }); return; }
          queryTab(tab.id);
        });
      } else {
        queryTab(tabId);
      }
    });
    return true;
  }
  if (message.action === "captureScreenshot") {
    // Get the window that contains the active tab we're recording
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = store.activeTabId;
      if (!tabId) {
        // Fallback: capture current window
        doCapture(null, sendResponse);
        return;
      }
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          doCapture(null, sendResponse);
        } else {
          doCapture(tab.windowId, sendResponse);
        }
      });
    });
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
