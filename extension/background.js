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
    startRecording(message.tabId, message.streamId, message.withMic)
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
    // First try stored activeTabId, then fallback to querying active tab
    chrome.storage.local.get("activeTabId", (store) => {
      let tabId = store.activeTabId;

      function queryTab(tid) {
        chrome.tabs.sendMessage(tid, { action: "extractPageContent" }, (res) => {
          if (chrome.runtime.lastError) {
            // Content script not injected yet — try to inject it programmatically
            if (!chrome.scripting) {
              sendResponse({ error: "Cannot inject on this page" });
              return;
            }
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

      function tryActiveTab() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          if (!tab?.id) { sendResponse({ error: "No active tab" }); return; }
          // Update stored activeTabId for future use
          chrome.storage.local.set({ activeTabId: tab.id });
          queryTab(tab.id);
        });
      }

      if (tabId) {
        // Verify the stored tab still exists
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            // Tab no longer exists, fallback
            tryActiveTab();
          } else {
            queryTab(tabId);
          }
        });
      } else {
        tryActiveTab();
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

// ===== AUTH — onMessageExternal (backup, from website directly) =====
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  if (message.action === "authToken") {
    storeAuthData(message);
    sendResponse({ success: true });
    return true;
  }
});

// ===== AUTH — relay from content script (primary, more reliable) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "authTokenRelay") {
    storeAuthData(message);
    sendResponse({ success: true });
    return true;
  }
});

function storeAuthData(data) {
  chrome.storage.local.set({
    authToken: data.token,
    authRefreshToken: data.refreshToken,
    authDisplayName: data.displayName,
    authEmail: data.email,
    authUserId: data.userId,
  });
}

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

async function startRecording(tabId, existingStreamId, withMic) {
  let streamId;
  if (existingStreamId) {
    streamId = existingStreamId;
  } else if (tabId) {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } else {
    throw new Error("No tab ID or stream ID provided");
  }

  await ensureOffscreen();

  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { target: "offscreen", action: "startCapture", streamId, withMic: !!withMic },
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
