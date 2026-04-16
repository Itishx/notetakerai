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
  if (message.action === "agentAction" || message.action === "getAgentPageContext") {
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = store.activeTabId;
      if (!tabId) { sendResponse({ error: "No active tab" }); return; }

      // Navigate can be done directly — works even on pages without content scripts
      if (message.action === "agentAction" && message.type === "navigate") {
        chrome.tabs.update(tabId, { url: message.url }, () => {
          if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
          else sendResponse({ success: true });
        });
        return;
      }

      function sendToContentScript(retrying) {
        chrome.tabs.sendMessage(tabId, message, (res) => {
          if (chrome.runtime.lastError) {
            if (retrying) { sendResponse({ error: chrome.runtime.lastError.message }); return; }
            // Inject content script and retry once
            chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
              if (chrome.runtime.lastError) { sendResponse({ error: chrome.runtime.lastError.message }); return; }
              setTimeout(() => sendToContentScript(true), 250);
            });
          } else {
            sendResponse(res || { error: "No response from content script" });
          }
        });
      }
      sendToContentScript(false);
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

// ===== REMOTE AGENT POLLING (background — works even when side panel is closed) =====
const BG_SUPABASE_URL = "https://ovapacfrzddnhrwvkbkr.supabase.co";
const BG_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo";

async function bgPollRemoteCommands() {
  const data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId", "remoteProcessingId"], r));
  if (!data.authUserId || !data.authToken) {
    console.log("[BgRemoteAgent] Not logged in, skipping poll");
    return;
  }

  try {
    const res = await fetch(
      `${BG_SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
      { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${data.authToken}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) {
      console.warn("[BgRemoteAgent] Poll failed:", res.status, await res.text());
      return;
    }
    const rows = await res.json();
    const cmd = rows[0];
    if (!cmd) return;
    if (cmd.id === data.remoteProcessingId) return; // already being handled

    console.log("[BgRemoteAgent] Found command:", cmd.id, cmd.task);
    // Mark as processing so we don't double-pick
    chrome.storage.local.set({ remoteProcessingId: cmd.id });

    // Forward to side panel if open; otherwise open it first, then forward
    const forwarded = await forwardToSidePanel(cmd);
    if (!forwarded) {
      // Open side panel and store command — popup.js will pick it up on load
      chrome.storage.local.set({ pendingRemoteCommand: JSON.stringify(cmd) });
      chrome.windows.getCurrent((win) => {
        if (win) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
      });
    }
  } catch (e) {
    console.error("[BgRemoteAgent] Error:", e);
  }
}

function forwardToSidePanel(cmd) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "handleRemoteCommand", cmd }, (res) => {
      if (chrome.runtime.lastError) {
        // Side panel not open / not listening
        resolve(false);
      } else {
        resolve(true);
      }
    });
    // Timeout fallback — if no response in 300ms, side panel isn't open
    setTimeout(() => resolve(false), 300);
  });
}

// Set up alarm for polling every 30 seconds
chrome.alarms.create("remoteAgentPoll", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "remoteAgentPoll") bgPollRemoteCommands();
});
// Also poll immediately on service worker startup
bgPollRemoteCommands();

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
