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

function bgDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


async function bgPerformRealWebSearch(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return { error: "No search query provided." };

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}&kl=us-en`;

  try {
    const resp = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();
    const results = [];
    const seen = new Set();

    const clean = s => s
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();

    const decodeUrl = raw => {
      try {
        const base = raw.startsWith("//") ? "https:" + raw : raw.startsWith("/") ? "https://duckduckgo.com" + raw : raw;
        const uddg = new URL(base).searchParams.get("uddg");
        return uddg ? decodeURIComponent(uddg) : raw;
      } catch { return raw; }
    };

    // Split on result blocks — each web result starts with class="result results_links
    const blocks = html.split(/(?=<div[^>]+class="result\s)/);
    for (const block of blocks) {
      if (results.length >= 8) break;
      // title anchor: class="result__a" (attr order may vary)
      const aTag = block.match(/<a\b([^>]*\bclass="[^"]*\bresult__a\b[^"]*"[^>]*|[^>]*\bhref="[^"]*"[^>]*\bclass="[^"]*\bresult__a\b[^"]*")>([\s\S]*?)<\/a>/);
      if (!aTag) continue;
      const hrefM = aTag[1].match(/href="([^"]*)"/);
      if (!hrefM) continue;
      const url = decodeUrl(hrefM[1]);
      if (!url || !/^https?:/i.test(url) || seen.has(url)) continue;

      const title = clean(aTag[2]);
      if (!title) continue;

      const snipM = block.match(/<a\b[^>]*\bclass="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snipM ? clean(snipM[1]) : "";

      seen.add(url);
      results.push({ title, url, snippet });
    }

    if (!results.length) return { error: "No results found for that query." };
    return { query: trimmedQuery, engine: "DuckDuckGo", searchUrl, results };
  } catch (e) {
    return { error: e.message || "Web search failed." };
  }
}

// Toggle injected panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  // Can't inject into chrome://, file://, or extension pages
  const url = tab.url || "";
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) return;

  chrome.storage.local.set({ activeTabId: tab.id });
  chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => {
    const err = chrome.runtime.lastError?.message || "";
    // Only re-inject if the content script genuinely isn't there.
    // "message port closed" means it IS there but didn't call sendResponse — don't re-inject.
    if (err.includes("Receiving end does not exist") || err.includes("Could not establish connection")) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
        void chrome.runtime.lastError;
        chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => { void chrome.runtime.lastError; });
      });
    }
  });
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
    const tabId = message.tabId || sender?.tab?.id;
    startRecording(tabId, message.streamId, message.withMic)
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
  if (message.action === "getLectureSegment") {
    bgGetAndTranscribeSegment(message.existingNotes || "")
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "syncLectureToNotion") {
    bgSyncToNotion(message.markdown, message.title)
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "getStatus") {
    sendResponse({ isRecording });
    return true;
  }
  if (message.action === "startInlineVoiceListening" || message.action === "stopInlineVoiceListening") {
    const isStart = message.action === "startInlineVoiceListening";
    const forwardAction = isStart ? "startVoiceListening" : "stopVoiceListening";

    const forwardToTab = (tabId) => {
      if (!tabId) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      chrome.storage.local.set({ activeTabId: tabId });
      const payload = isStart
        ? { action: forwardAction, mode: "manual", source: "inline" }
        : { action: forwardAction, source: "inline" };
      chrome.tabs.sendMessage(tabId, payload, (res) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse(res || { success: true });
        }
      });
    };

    if (sender?.tab?.id) {
      forwardToTab(sender.tab.id);
      return true;
    }

    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      if (activeTabId) {
        forwardToTab(activeTabId);
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        forwardToTab(tabs?.[0]?.id || null);
      });
    });
    return true;
  }
  if (message.action === "voiceEvent") {
    const tabId = sender?.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "sbVoiceEvent",
        event: message.event,
        text: message.text,
        isFinal: message.isFinal,
        error: message.message,
        source: message.source,
      }, () => { void chrome.runtime.lastError; });
    }
    return false;
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
  if (message.action === "performWebSearch") {
    bgPerformRealWebSearch(message.query)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ error: e.message || "Web search failed." }));
    return true;
  }
  if (message.action === "runBrainAgent") {
    const task = message.task;
    const senderTabId = sender?.tab?.id || null;
    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      const tabId = senderTabId || activeTabId || message.senderTabId;
      if (!tabId) { sendResponse({ ok: true }); return; }
      chrome.storage.local.set({ activeTabId: tabId });
      bgRunBrainAgent(tabId, task);
      sendResponse({ ok: true });
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

// ===== REMOTE AGENT — panel-less execution (runs even when side panel is closed) =====
const BG_SUPABASE_URL = "https://ovapacfrzddnhrwvkbkr.supabase.co";
const BG_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo";
const BG_API_BASE = "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1";

// --- helpers ---

function bgIsScriptableUrl(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") &&
         !url.startsWith("chrome-extension://") &&
         !url.startsWith("about:") &&
         !url.startsWith("devtools://") &&
         !url.startsWith("edge://");
}

async function bgGetActiveTabId() {
  return new Promise(resolve => {
    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      // Verify stored tab is still valid and scriptable
      if (activeTabId) {
        chrome.tabs.get(activeTabId, (tab) => {
          if (!chrome.runtime.lastError && tab && bgIsScriptableUrl(tab.url)) {
            resolve(activeTabId);
            return;
          }
          // Stored tab is gone or not scriptable — find a real one
          bgFindScriptableTab(resolve);
        });
      } else {
        bgFindScriptableTab(resolve);
      }
    });
  });
}

function bgFindScriptableTab(resolve) {
  // First try the active tab in the last focused window
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    const tab = tabs.find(t => bgIsScriptableUrl(t.url));
    if (tab) { resolve(tab.id); return; }
    // Fallback: any scriptable tab in any window
    chrome.tabs.query({}, allTabs => {
      const fallback = allTabs.find(t => bgIsScriptableUrl(t.url));
      resolve(fallback?.id || null);
    });
  });
}

async function bgGetAgentPageContext(tabId) {
  const empty = { url: "", title: "", bodyText: "", interactiveEls: [] };
  if (!tabId) return empty;
  return new Promise(resolve => {
    function sendMsg(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "getAgentPageContext" }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(empty); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
            if (chrome.runtime.lastError) { resolve(empty); return; }
            setTimeout(() => sendMsg(true), 250);
          });
        } else {
          resolve(res || empty);
        }
      });
    }
    sendMsg(false);
  });
}

async function bgGetPageSnapshot(tabId) {
  if (!tabId) return null;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        url: location.href,
        title: document.title,
        text: document.body?.innerText?.slice(0, 500) || ""
      })
    });
    return result?.result || null;
  } catch(e) { return null; }
}

async function bgExecuteAgentAction(tabId, actionObj) {
  if (!tabId) return { error: "No active tab" };

  if (actionObj.type === "navigate") {
    return new Promise(resolve => {
      chrome.tabs.update(tabId, { url: actionObj.url }, () => {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else resolve({ success: true });
      });
    });
  }

  return new Promise(resolve => {
    function sendToContent(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "agentAction", ...actionObj }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve({ error: chrome.runtime.lastError.message }); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
            if (chrome.runtime.lastError) { resolve({ error: chrome.runtime.lastError.message }); return; }
            setTimeout(() => sendToContent(true), 250);
          });
        } else {
          resolve(res || { error: "No response from content script" });
        }
      });
    }
    sendToContent(false);
  });
}

async function bgWaitForTabReady(tabId, maxMs = 5000) {
  const start = Date.now();
  return new Promise(resolve => {
    function check() {
      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError || !tab) return resolve();
        if (tab.status === "complete") return resolve();
        if (Date.now() - start > maxMs) return resolve();
        setTimeout(check, 200);
      });
    }
    setTimeout(check, 400);
  });
}

const BG_SNAPSHOT_ACTIONS = new Set(["navigate", "click", "selectOption", "pressKey"]);

function bgBrainUpdate(tabId, text, final = false) {
  chrome.tabs.sendMessage(tabId, { action: "sbAgentUpdate", text, final }, () => { void chrome.runtime.lastError; });
}

async function bgRunBrainAgent(tabId, task) {
  let currentTabId = tabId;
  const MAX_STEPS = 10;
  const history = [];

  bgBrainUpdate(currentTabId, "Planning…");

  // Fast path — no AI needed
  const fastActions = bgTryFastPath(task, []);
  if (fastActions) {
    for (const action of fastActions) {
      bgBrainUpdate(currentTabId, `→ ${action.description}`);
      if (action.type === "navigate") {
        await new Promise(r => chrome.tabs.update(currentTabId, { url: action.url }, () => setTimeout(r, 2000)));
        await bgWaitForTabReady(currentTabId, 5000);
      } else {
        await bgExecuteAgentAction(currentTabId, action);
      }
    }
    bgBrainUpdate(currentTabId, "Done!");
    return;
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const pageInfo = await bgGetAgentPageContext(currentTabId);

    let actions;
    try {
      actions = await bgCallAgentStep(task, pageInfo, history);
    } catch (e) {
      bgBrainUpdate(currentTabId, "Agent error: " + (e.message || e));
      return;
    }

    for (const action of actions) {
      if (action.type === "done" || action.type === "answer") {
        bgBrainUpdate(currentTabId, action.message || "Done!", true);
        return;
      }
      if (action.type === "clarify") {
        bgBrainUpdate(currentTabId, action.message || "Need more info.", true);
        return;
      }

      if (action.type === "web_search") {
        bgBrainUpdate(currentTabId, `Searching: "${action.query}"…`);
        const searchData = await bgPerformRealWebSearch(action.query);
        const resultsText = searchData.results
          ? searchData.results.map((r, i) => `[${i+1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n")
          : searchData.error || "No results.";
        history.push({ type: "web_search", query: action.query, description: action.description || `Search: "${action.query}"`, result: { success: !searchData.error, text: resultsText } });
        continue;
      }

      bgBrainUpdate(currentTabId, `→ ${action.description || action.type}`);

      const result = await bgExecuteAgentAction(currentTabId, action);

      const latestActiveTabId = await bgGetActiveTabId();
      if (latestActiveTabId && latestActiveTabId !== currentTabId) {
        currentTabId = latestActiveTabId;
        chrome.storage.local.set({ activeTabId: currentTabId });
        bgBrainUpdate(currentTabId, "Continuing in the new tab…");
      }

      let snapshot = null;
      if (BG_SNAPSHOT_ACTIONS.has(action.type)) {
        if (action.type === "navigate") await bgWaitForTabReady(currentTabId, 5000);
        else await new Promise(r => setTimeout(r, 600));
        snapshot = await bgGetPageSnapshot(currentTabId);
      }

      history.push({ ...action, result, snapshot });

      if (result?.error && !result.error.includes("No response")) {
        bgBrainUpdate(currentTabId, `Step failed: ${result.error}`);
        return;
      }
    }
  }

  bgBrainUpdate(currentTabId, "Reached max steps — task may need the full panel.");
}

async function bgUpdateRemoteCommand(id, token, patch) {
  await fetch(`${BG_SUPABASE_URL}/rest/v1/agent_commands?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

function bgTryFastPath(task, history) {
  if (history.length > 0) return null;
  const t = task.toLowerCase().trim();
  const gotoMatch = t.match(/^(?:go to|open|navigate to|visit)\s+(?:https?:\/\/)?([a-z0-9.\-]+\.[a-z]{2,}(?:\/\S*)?)/i);
  if (gotoMatch) {
    const url = gotoMatch[1].startsWith("http") ? gotoMatch[1] : "https://" + gotoMatch[1];
    return [{ type: "navigate", url, description: `Navigate to ${url}` }];
  }
  const ytMatch = t.match(/search\s+(.+?)\s+on\s+youtube/i) || t.match(/youtube\s+search\s+(.+)/i);
  if (ytMatch) {
    const q = encodeURIComponent(ytMatch[1].trim());
    return [{ type: "navigate", url: `https://www.youtube.com/results?search_query=${q}`, description: `Search YouTube for "${ytMatch[1]}"` }];
  }
  const gMatch = t.match(/(?:search\s+(.+?)\s+on\s+google|^google\s+(.+))/i);
  if (gMatch) {
    const q = encodeURIComponent((gMatch[1] || gMatch[2]).trim());
    return [{ type: "navigate", url: `https://www.google.com/search?q=${q}`, description: `Google search` }];
  }
  if (/^scroll\s+(down|up)/.test(t)) {
    const dir = t.includes("up") ? "up" : "down";
    return [{ type: "scroll", direction: dir, amount: 600, description: `Scroll ${dir}` }];
  }
  return null;
}

function bgGetPlatformGuide(url) {
  if (/mail\.google\.com/.test(url)) return `
── GMAIL (you are here) ──
Compose new email:
  1. navigate → https://mail.google.com/mail/u/0/#compose
  2. wait 1200
  3. [{"type":"type","selector":"[name='to']","targetText":"To","text":"RECIPIENT"},{"type":"pressKey","key":"Tab"},{"type":"type","selector":"[name='subjectbox']","text":"SUBJECT"}]
  4. pressKey Tab
  5. type body → selector="[role='textbox'][aria-label*='Message']" or targetText="Message Body"
  6. click Send → selector="[data-tooltip*='Send']" or [aria-label*="Send"] or targetText="Send"
Reply: click Reply (.amn or targetText="Reply") → wait 600 → type in [role='textbox'] → click Send
Search: click [aria-label="Search mail"] → type query → pressKey Enter`;
  if (/youtube\.com/.test(url)) return `
── YOUTUBE (you are here) ──
Search & play: navigate → https://www.youtube.com/results?search_query=QUERY (encode spaces as +)
  → wait 800 → click selector="ytd-video-renderer #video-title" or targetText=video title
Player controls:
  Play/Pause: selector=".ytp-play-button"
  Fullscreen: selector=".ytp-fullscreen-button"
  Mute: selector=".ytp-mute-button"
  Speed: click .ytp-settings-button → targetText="Playback speed"`;
  if (/netflix\.com/.test(url)) return `
── NETFLIX (you are here) ──
Search: navigate → https://www.netflix.com/search?q=QUERY → wait 1200
  → click first result card (targetText=show title) → wait 800 → click Play selector="[data-uia*='play']" or targetText="Play"
Season: selectOption selector="select[id*='season']" value="Season 2"
Episode: click episode card by targetText`;
  if (/x\.com|twitter\.com/.test(url)) return `
── TWITTER/X (you are here) ──
Post tweet: navigate → https://x.com/compose/tweet → wait 1200
  → type selector="[data-testid='tweetTextarea_0']" or selector="[role='textbox']"
  → wait 300
  → click selector="[data-testid='tweetButtonInline']" or selector="[data-testid='tweetButton']"
If the post button stays disabled, re-focus the actual textbox and type there. Do not use intent/tweet URLs.
Search: navigate → https://x.com/search?q=QUERY&src=typed_query
Like: click [data-testid="like"] on the tweet row`;
  if (/linkedin\.com/.test(url)) return `
── LINKEDIN (you are here) ──
Search people: navigate → https://www.linkedin.com/search/results/people/?keywords=NAME
Connect: click targetText="Connect" → click targetText="Send without a note"
Message: navigate to profile → click targetText="Message" → type [aria-label*="Write a message"] → pressKey Enter`;
  if (/amazon\./.test(url)) return `
── AMAZON (you are here) ──
Search: type selector="#twotabsearchtextbox" → pressKey Enter
  → click product title → click selector="#add-to-cart-button"
Buy Now: selector="#buy-now-button"`;
  if (/web\.whatsapp\.com/.test(url)) return `
── WHATSAPP WEB (you are here) ──
Send by contact name:
  1. click selector="[data-testid='chat-list-search']" or selector="[data-tab='3']"
  2. wait 400
  3. type the contact name
  4. wait 800  (wait for results to load)
  5. click first matching contact row: selector="[data-testid='cell-frame-title']" or targetText=CONTACT_NAME
  6. wait 400
  7. type message in selector="[data-testid='conversation-compose-box-input']" or [aria-label*="Type a message"] or [data-tab='10']
  8. pressKey Enter
Send by phone: navigate → https://wa.me/91NUMBER?text=MESSAGE then click "Continue to Chat" button`;
  if (/open\.spotify\.com/.test(url)) return `
── SPOTIFY (you are here) ──
Search & play: navigate → https://open.spotify.com/search/QUERY → wait 1000
  → click first song row selector="[data-testid='tracklist-row']" → click play button inside it`;
  if (/github\.com/.test(url)) return `
── GITHUB (you are here) ──
Search repos: navigate → https://github.com/search?q=QUERY&type=repositories
Open VS Code editor: pressKey "." on any repo page
View file: click file name in file tree`;
  if (/google\.com\/search|google\.co/.test(url)) return `
── GOOGLE SEARCH (you are here) ──
New search: type selector="[name='q']" → pressKey Enter
Direct: navigate → https://www.google.com/search?q=QUERY`;
  if (/reddit\.com\/r\/[^/]+\/submit/.test(url)) return `
── REDDIT SUBMIT (you are here) ──
Follow these steps IN ORDER. Do not skip any step.
1. wait 1200 (page must fully load)
2. type into title: selector="textarea[name='title']" targetText="Title" — type the title text
3. wait 400
4. click body field: selector="div[data-lexical-editor='true']" targetText="Body text"
5. wait 300
6. type into body: selector="div[data-lexical-editor='true']" targetText="Body text" — type the body text
7. wait 600
8. click submit: selector="r-post-form-submit-button" targetText="Post"
NOTES:
- Title uses textarea[name='title'] (may be in shadow DOM — the agent handles this automatically)
- Body uses div[data-lexical-editor='true'] — click it first, then type. It uses beforeinput events.
- Submit is r-post-form-submit-button — if clicking fails, try selector="button[type='submit']" or targetText="Post"`;
  return `
── GENERAL SITE ──
Prefer navigating to URLs over clicking search bars.
Use sel= selectors from INTERACTIVE ELEMENTS when available.
For forms: click field → type → Tab to next field → submit.`;
}

async function bgCallAgentStep(task, pageInfo, history, currentStep = null) {
  const historyText = history.length > 0
    ? history.map((h, i) => {
        if (h.type === "web_search") {
          const resultText = h.result?.success
            ? "Results:\n" + (h.result.text || "").slice(0, 1500)
            : (h.result?.text || "No results");
          return `Step ${i + 1}: [web_search] "${h.query}" → ${resultText}`;
        }
        const status = h.result?.success ? "✓ OK" : `✗ ${h.result?.error || "FAILED"}`;
        const snap = h.snapshot ? ` → page after: "${h.snapshot.title}" | ${h.snapshot.url}` : "";
        const readVal = h.type === "read" && h.result?.text ? ` → content: "${h.result.text.slice(0, 200)}"` : "";
        return `Step ${i + 1}: [${h.type}] ${h.description} → ${status}${snap}${readVal}`;
      }).join("\n")
    : "None yet.";

  const elementsText = pageInfo.interactiveEls?.length > 0
    ? pageInfo.interactiveEls.map(e => `  [${e.tag}]${e.selector ? ` sel="${e.selector}"` : ""} ${e.text}${e.href ? ` (href: ${e.href})` : ""}${e.type ? ` (type: ${e.type})` : ""}`).join("\n")
    : "  (none detected)";

  const selectsText = pageInfo.selectEls?.length > 0
    ? "\n\nDROPDOWNS (use selectOption):\n" + pageInfo.selectEls.map(s =>
        `  [select] ${s.label || "unnamed"} — current: "${s.current}" — options: ${s.options.join(", ")}`
      ).join("\n")
    : "";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const currentUrl = pageInfo.url || "";

  const agentSystemPrompt = `You are SideBrain Browser Agent. Automate a real Chrome browser by returning JSON actions.
Respond ONLY with a JSON object or array. Zero prose. Zero explanation. Zero markdown fences.

MINDSET: You are a browser robot. Every task is solved by executing and verifying actions.
- After every navigate or click, check STEPS TAKEN SO FAR to see what page you landed on.
- If the "page after" in history doesn't match your intent → you are on the wrong page. Recover.
- Never assume a click worked. The history shows you the page title and URL after each action — read it.
- If STEPS TAKEN SO FAR is empty → you have done NOTHING yet → start executing immediately.
- Pure questions with no browser actions → {"type":"answer","message":"..."}

ACTIONS:
{"type":"navigate","url":"https://...","description":"..."}
{"type":"click","selector":"css","targetText":"fallback text","description":"..."}
{"type":"type","selector":"css","targetText":"fallback","text":"...","description":"..."}
{"type":"pressKey","key":"Enter","description":"..."}
{"type":"selectOption","selector":"css","value":"option text","description":"..."}
{"type":"read","selector":"css","targetText":"fallback","description":"Read element to verify state"}
{"type":"scroll","direction":"down","amount":400,"description":"..."}
{"type":"wait","ms":1500,"description":"..."}
{"type":"downloadImage","selector":"css","targetText":"fallback alt text","format":"png","filename":"image.png","description":"Download image as PNG/JPEG/WebP"}
{"type":"web_search","query":"search terms","description":"Search the web for information before acting"}
{"type":"done","message":"what was accomplished"}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}  ← ONLY when genuinely blocked

WEB SEARCH USAGE:
- Use {"type":"web_search"} FIRST when a task requires up-to-date information, research, or content you don't know.
- Results are injected into your history so you can read them and use that knowledge in subsequent actions.
- Example flow: web_search → read results from history → navigate to Google Docs → type article using those facts.
- You can web_search multiple times in one task (for different sub-topics).
- web_search does NOT navigate the browser tab — it is a background fetch. Your current tab stays open.

SELECTOR PRIORITY:
1. sel= value from INTERACTIVE ELEMENTS
2. [aria-label="..."] or [role="button"][aria-label="..."]
3. [data-testid="..."]
4. [placeholder="..."] or [name="..."]
5. targetText (fuzzy visible text match — last resort)

BATCHING: Array of up to 5 actions for certain sequences. NEVER batch navigate or read.
Example: [{"type":"type",...},{"type":"pressKey","key":"Tab"},{"type":"type",...},{"type":"pressKey","key":"Enter"}]

═══ VERIFY BEFORE PROCEED ═══════════════════════════════════
After EVERY navigate or click, STEPS TAKEN SO FAR shows "page after: TITLE | URL".
Before your next action, check that title/URL matches where you intended to be.

RULE: If the page after a click is not what you expected → do NOT continue the original plan.
Assess what happened and recover: navigate back, try a different approach, or re-read the page.

FOR LISTS (seasons, episodes, search results, dropdown menus):
  ALWAYS read the list before picking from it. Never guess position or index.
  Step 1: use {"type":"read"} to read the list element and see what options are available.
  Step 2: pick the exact text you saw in the read result, then click/selectOption.

FOR MEDIA SITES (Netflix, YouTube, Spotify):
  After clicking anything, check if unexpected video/audio playback started.
  If you meant to click a title but a video started playing → you clicked the wrong thing.
  Go back or navigate directly to the correct URL.

CHECKPOINT PLANNING for complex tasks:
  navigate → verify landed on right page
  → find/read target element → confirm it's visible
  → interact → verify interaction result
  → proceed to next step
  Never batch past a verification checkpoint.
═════════════════════════════════════════════════════════════

RULES:
1. STEPS TAKEN SO FAR is ground truth. Read "page after" to know where you are.
2. Never return done unless steps confirm ALL required actions succeeded and page state matches.
3. Never repeat a failed selector — switch strategy immediately.
4. After navigate → the next step should verify the page before clicking anything.
5. Forms: type → Tab → next field → submit.
6. TODAY: ${today}. Calculate all relative dates yourself.
7. Failed click → scroll to find element, then try different selector.
8. ALWAYS check URL SHORTCUTS below first — if a shortcut exists, use it as step 1.
9. WRONG SITE: If the current page is unrelated to the task, your FIRST action MUST be navigate to the correct site. Never say "I can't do this here".

URL SHORTCUTS — single navigate, zero form interaction needed:
── EMAIL / MESSAGING ──
Gmail compose:    https://mail.google.com/mail/?view=cm&to=TO&su=SUBJECT&body=BODY  (encode spaces as %20)
WhatsApp by phone#:  https://wa.me/COUNTRYCODENUMBER?text=MESSAGE  (India: 91XXXXXXXXXX, encode spaces as %20)
WhatsApp by name:    navigate → https://web.whatsapp.com → search contact name → click → type → Enter
Twitter/X post:   navigate → https://x.com/compose/tweet  (type into the composer)

── MAPS / NAVIGATION ──
Google Maps search:     https://www.google.com/maps/search/QUERY+with+spaces+as+plus
Google Maps directions: https://www.google.com/maps/dir/ORIGIN/DESTINATION  (encode spaces as +)

── FLIGHTS (IATA codes: BOM=Mumbai DEL=Delhi BLR=Bangalore MAA=Chennai PNQ=Pune HYD=Hyderabad CCU=Kolkata DED=Dehradun GOI=Goa JAI=Jaipur AMD=Ahmedabad COK=Kochi IXC=Chandigarh) ──
MakeMyTrip one-way: https://www.makemytrip.com/flight/search?itinerary=FROM-TO-DD/MM/YYYY&tripType=O&paxType=A-1_C-0_I-0&cabinClass=E
MakeMyTrip return:  itinerary=FROM-TO-DD/MM/YYYY,TO-FROM-DD/MM/YYYY&tripType=R&paxType=A-1_C-0_I-0&cabinClass=E
Skyscanner:         https://www.skyscanner.co.in/transport/flights/FROM/TO/YYMMDD/  (date = last 2 digits of year + MM + DD)
Example PNQ→DEL 19 Apr 2026: MakeMyTrip itinerary=PNQ-DEL-19/04/2026 · Skyscanner /PNQ/DEL/260419/

── HOTELS ──
Booking.com: https://www.booking.com/searchresults.html?ss=CITY&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&no_rooms=1&group_adults=2
MakeMyTrip hotels: https://www.makemytrip.com/hotels/hotel-listing/?checkin=MM/DD/YYYY&checkout=MM/DD/YYYY&city=CITY_NAME&roomStayQualifier=2e0e

── SHOPPING ──
Amazon India:  https://www.amazon.in/s?k=QUERY+with+plus
Flipkart:      https://www.flipkart.com/search?q=QUERY
Myntra:        https://www.myntra.com/search?q=QUERY
Meesho:        https://www.meesho.com/search?q=QUERY

── FOOD / DELIVERY ──
Zomato:  https://www.zomato.com/CITY/restaurants?q=QUERY  (city lowercase: mumbai, delhi, bangalore, pune, hyderabad)
Swiggy:  https://www.swiggy.com/search?query=QUERY

── JOBS ──
LinkedIn jobs:  https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY
Naukri:         https://www.naukri.com/ROLE-jobs-in-CITY  (lowercase hyphenated e.g. software-engineer-jobs-in-bangalore)
Indeed:         https://in.indeed.com/jobs?q=ROLE&l=CITY

── PRODUCTIVITY ──
Google Calendar new event: https://calendar.google.com/calendar/r/eventedit?text=EVENT+NAME&dates=YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS&location=PLACE&details=NOTES
New Google Doc:   https://docs.new
New Google Sheet: https://sheets.new
New Google Slide: https://slides.new

── MEDIA ──
YouTube search:       https://www.youtube.com/results?search_query=QUERY
Spotify search:       https://open.spotify.com/search/QUERY
YouTube Music search: https://music.youtube.com/search?q=QUERY
Netflix search:       https://www.netflix.com/search?q=QUERY

── OTHER ──
Google search:  https://www.google.com/search?q=QUERY
Wikipedia:      https://en.wikipedia.org/wiki/Special:Search?search=QUERY
Paytm:          https://paytm.com/search?q=QUERY
IRCTC trains:   https://www.irctc.co.in/nget/train-search  (no URL params — use form)

${bgGetPlatformGuide(currentUrl)}

ANSWER FORMATTING (for {"type":"answer"} responses):
- Always use markdown in the message field — never return a flat comma-separated list
- Use ## headers for categories/genres, - bullet points for items
- Keep each bullet concise: "**Title** — brief description"
- Sort/group logically (by genre, category, type, etc.)

FAILURE RECOVERY:
- Wrong page → navigate to the correct URL immediately, no explanation
- Element not found → aria-label, data-testid, placeholder, then targetText
- List selection uncertain → use read action first to see all options
- Form not responding → click field first, then type`;

  const pageStatus = pageInfo.url
    ? `URL: ${pageInfo.url}\nTitle: ${pageInfo.title}`
    : "Not on a specific page yet — navigate first.";

  const userMessage = `TASK: ${task}

CURRENT PAGE:
${pageStatus}

PAGE TEXT (excerpt):
${pageInfo.bodyText?.substring(0, 4000) || "(empty — navigate first)"}

INTERACTIVE ELEMENTS:
${elementsText}${selectsText}
${currentStep ? `\nCURRENT PLAN STEP ${currentStep.id}: ${currentStep.goal}\nSuccess signal: ${currentStep.successSignal || "(none)"}\nFocus on THIS step only. Return {"type":"done","message":"step ${currentStep.id} complete: [summary]"} once the goal is achieved.\n` : ""}
STEPS TAKEN SO FAR:
${historyText}

What actions should be taken next? Return a single JSON object, OR a JSON array of up to 3 objects for sequences that are certain to succeed in order (e.g. [type, pressKey] or [click, type]). Only batch when all steps are highly predictable. NEVER include navigate in a batch.`;

  const fetchBody = JSON.stringify({ notes: agentSystemPrompt, message: userMessage });
  let response;
  try {
    response = await fetch(`${BG_API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: fetchBody,
    });
  } catch (e) {
    if (e instanceof TypeError) {
      // Service worker woke cold — wait and retry once
      await new Promise(r => setTimeout(r, 1200));
      response = await fetch(`${BG_API_BASE}/chat-about-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: fetchBody,
      });
    } else {
      throw e;
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }

  const data = await response.json();
  const reply = (data.reply || "").trim();
  const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/) || reply.match(/([\[{][\s\S]*[\]}])/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : reply.trim();
  const parsed = JSON.parse(jsonStr);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function bgCheckStopped(id, token) {
  try {
    const res = await fetch(`${BG_SUPABASE_URL}/rest/v1/agent_commands?id=eq.${id}&select=status`, {
      headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const rows = await res.json();
    const s = rows[0]?.status;
    return s !== "running" && s !== "pending";
  } catch { return false; }
}

// ── Reddit post — URL params pre-fill everything, agent just clicks Submit ─
async function bgExecuteRedditPost(cmd, token, tabId) {
  const t = cmd.task;
  let subreddit, titleText, bodyText;

  // Format 1 (current): @@REDDIT_POST@@\nsub:X\nttl:Y\nbdy:\nZ
  if (t.startsWith("@@REDDIT_POST@@")) {
    subreddit = (t.match(/\nsub:(.+)/) || [])[1]?.trim();
    titleText = (t.match(/\nttl:(.+)/) || [])[1]?.trim();
    bodyText  = (t.match(/\nbdy:\n([\s\S]*)$/) || [])[1]?.trim();

  // Format 2: Post to Reddit r/X\n\nTITLE:\nY\n\nBODY:\nZ
  } else if (/TITLE:\n/.test(t) && /BODY:\n/.test(t)) {
    subreddit = (t.match(/r\/(\w+)/) || [])[1];
    titleText = (t.match(/TITLE:\n([\s\S]*?)\n\nBODY:/) || [])[1]?.trim();
    bodyText  = (t.match(/BODY:\n([\s\S]*)$/) || [])[1]?.trim();

  // Format 3 (migration 3 step-based): "Create a Reddit text post in r/X"
  } else if (/type this exact title:/.test(t)) {
    subreddit = (t.match(/r\/(\w+)/) || [])[1];
    titleText = (t.match(/type this exact title:\n([\s\S]*?)\n\n/) || [])[1]?.trim();
    bodyText  = (t.match(/type this exact body text:\n([\s\S]*?)(?:\n\n\d+\.|$)/) || [])[1]?.trim();
  }

  if (!subreddit || !titleText || !bodyText) return false;

  const steps = [];

  // Step 1 — navigate to old.reddit.com with everything pre-filled via URL params
  const url = `https://old.reddit.com/r/${subreddit}/submit?title=${encodeURIComponent(titleText)}&text=${encodeURIComponent(bodyText)}&selftext=true`;
  steps.push({ type: "navigate", description: `Open r/${subreddit}/submit with title & body pre-filled`, ok: true });
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps });

  await new Promise(resolve => chrome.tabs.update(tabId, { url }, resolve));
  await bgWaitForTabReady(tabId, 8000);
  await new Promise(r => setTimeout(r, 1500)); // let the form render

  // Step 2 — click Submit (old Reddit has a plain input[type=submit])
  const submit = await new Promise(resolve => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const btn = document.querySelector('button[type="submit"]')
                 || document.querySelector('input[type="submit"]')
                 || Array.from(document.querySelectorAll("button")).find(b => /submit|post/i.test(b.innerText));
        if (!btn) return { error: "Submit button not found" };
        btn.click();
        return { success: true };
      },
    }, (res) => resolve(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : (res?.[0]?.result || { error: "No result" })));
  });

  steps.push({ type: "click", description: "Click Submit", ok: !submit.error });
  await new Promise(r => setTimeout(r, 2000));

  await bgUpdateRemoteCommand(cmd.id, token, {
    status: submit.error ? "error" : "done",
    result: submit.error ? `Submit failed: ${submit.error}` : `Posted to r/${subreddit} successfully.`,
    steps,
  });
  chrome.storage.local.remove(["remoteProcessingId", "remoteProcessingTime"]);
  return true;
}

// ── Workflow planning helpers ─────────────────────────────────────────────

function bgIsMultiStepTask(task) {
  const hasConnector = /\b(and then|after that|once you|when done|followed by)\b/i.test(task);
  const hasNavigateThenAct = /\b(open|go to|navigate|visit)\b.+?\b(and|then)\b.+?\b(click|type|fill|send|submit|buy|book|post|search|find)\b/i.test(task);
  const isComplexAction = /\b(send an email|send a message|book a|schedule a|fill out|sign up for|register|create a|post on|post to|upload|reply to|order a|buy a)\b/i.test(task);
  return hasConnector || hasNavigateThenAct || (isComplexAction && task.split(/\s+/).length > 7);
}

async function bgPlanWorkflow(task, pageInfo) {
  const systemPrompt = `You plan multi-step browser automation workflows.
Return ONLY JSON. No prose. No markdown.
Return: {"complexity":"simple"|"multi-step","steps":[{"id":1,"goal":"outcome description","successSignal":"url fragment or visible text confirming this step worked"}]}
Rules:
- "simple" if ≤2 actions on current page, no navigation required
- "multi-step" for anything spanning navigation + on-page actions
- Max 8 steps. Each step = one distinct phase (navigate, fill section, submit, confirm)
- successSignal = specific observable: URL fragment, page title, or visible text
- Write goals as outcomes: "Compose window open in Gmail" not "Click compose"`;

  const userPrompt = `TASK: ${task}\nCURRENT PAGE:\nURL: ${pageInfo.url || "(unknown)"}\nTitle: ${pageInfo.title || "(unknown)"}\nPlan the workflow.`;

  try {
    const res = await fetch(`${BG_API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: systemPrompt, message: userPrompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = (data.reply || "").trim();
    const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/([\[{][\s\S]*[\]}])/);
    const json = match ? match[1].trim() : reply;
    const parsed = JSON.parse(json);
    if (!parsed.complexity || !Array.isArray(parsed.steps)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function bgVerifyStepHeuristic(step, pageInfo) {
  const signal = (step.successSignal || "").toLowerCase().trim();
  if (!signal) return null;
  const url = (pageInfo.url || "").toLowerCase();
  const title = (pageInfo.title || "").toLowerCase();
  const text = (pageInfo.bodyText || "").slice(0, 800).toLowerCase();
  if (url.includes(signal) || title.includes(signal) || text.includes(signal)) return true;
  return null;
}

async function bgReplanWorkflow(task, completedSteps, remainingSteps, pageInfo, lastError) {
  const systemPrompt = `You revise a browser automation plan after a step failed.\nReturn ONLY a JSON array. No prose.\n[{"id":N,"goal":"...","successSignal":"..."}]`;
  const userPrompt = `ORIGINAL TASK: ${task}\nCOMPLETED:\n${completedSteps.map(s => `${s.id}. ${s.goal}`).join("\n") || "None."}\nFAILED AT: ${remainingSteps[0]?.goal || "unknown"} — Error: ${lastError}\nREMAINING:\n${remainingSteps.map(s => `${s.id}. ${s.goal}`).join("\n")}\nPAGE: ${pageInfo.url || ""} | ${pageInfo.title || ""}\nTEXT: ${(pageInfo.bodyText || "").slice(0, 500)}\nRevise remaining steps, starting from id ${(completedSteps.length || 0) + 1}.`;
  try {
    const res = await fetch(`${BG_API_BASE}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: systemPrompt, message: userPrompt }),
    });
    if (!res.ok) return remainingSteps;
    const data = await res.json();
    const reply = (data.reply || "").trim();
    const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\[[\s\S]*\])/);
    const json = match ? match[1].trim() : reply;
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : remainingSteps;
  } catch (_) {
    return remainingSteps;
  }
}

// ─────────────────────────────────────────────────────────────────────────

async function bgRunRemoteCommand(cmd, token) {
  console.log("[BgRemoteAgent] Running command in background:", cmd.task);
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps: [] });

  // Resolve tab ID once — reuse for entire run to avoid repeated async lookups
  const tabId = await bgGetActiveTabId();
  console.log("[BgRemoteAgent] Using tab:", tabId);

  // Reddit posts — skip the AI planning loop, inject directly
  if (/@@REDDIT_POST@@|reddit\.com\/r\/\w+\/submit|Post to Reddit|Create a Reddit text post/i.test(cmd.task)) {
    const handled = await bgExecuteRedditPost(cmd, token, tabId);
    if (handled) return;
  }

  const steps = [];
  const history = [];
  const MAX = 20;
  let iterations = 0;
  const startedAt = Date.now();

  const finish = async (status, result) => {
    const durationMs = Date.now() - startedAt;
    await bgUpdateRemoteCommand(cmd.id, token, { status, result, steps: [...steps, { __meta: true, durationMs }] });
    chrome.storage.local.remove("remoteProcessingId");
    chrome.runtime.sendMessage({ action: "remoteCommandComplete", cmdId: cmd.id, result }).catch(() => {});
    console.log("[BgRemoteAgent] Command finished:", status, result);
  };

  // ── Plan-driven loop for multi-step tasks ─────────────────────────────
  if (bgIsMultiStepTask(cmd.task)) {
    const initPage = await bgGetAgentPageContext(tabId);
    let plan = null;
    try { plan = await bgPlanWorkflow(cmd.task, initPage); } catch (_) {}

    if (plan && plan.complexity === "multi-step" && plan.steps.length > 1) {
      console.log("[BgRemoteAgent] Using plan-driven loop:", plan.steps.length, "steps");
      let planSteps = [...plan.steps];
      const completedSteps = [];
      let consecutiveFailures = 0;

      for (let stepIdx = 0; stepIdx < planSteps.length; stepIdx++) {
        const step = planSteps[stepIdx];
        steps.push({ description: `Step ${stepIdx + 1}/${planSteps.length}: ${step.goal}`, ok: null, isHeader: true });
        bgUpdateRemoteCommand(cmd.id, token, { steps });

        let stepDone = false;
        let stepAttempts = 0;

        while (!stepDone && stepAttempts < 3) {
          if (stepIdx > 0 && await bgCheckStopped(cmd.id, token)) { chrome.storage.local.remove("remoteProcessingId"); return; }

          const pageInfo = await bgGetAgentPageContext(tabId);

          if (stepAttempts === 0 && bgVerifyStepHeuristic(step, pageInfo) === true) {
            completedSteps.push(step); stepDone = true; break;
          }

          let actions = bgTryFastPath(cmd.task, history);
          if (!actions) {
            try { actions = await bgCallAgentStep(cmd.task, pageInfo, history, step); }
            catch (e) { await finish("error", `Error: ${e.message}`); return; }
          }

          const first = actions[0];
          if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
            await finish("done", first.message || "Done."); return;
          }

          let stepFailed = false;
          for (const actionObj of actions) {
            if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
              await finish("done", actionObj.message || "Done."); return;
            }
            const result = await bgExecuteAgentAction(tabId, actionObj);
            let snapshot = null;
            if (!result?.error && BG_SNAPSHOT_ACTIONS.has(actionObj.type)) {
              if (actionObj.type === "navigate") { await bgWaitForTabReady(tabId, 5000); await new Promise(r => setTimeout(r, 200)); }
              else { await new Promise(r => setTimeout(r, 200)); }
              snapshot = await bgGetPageSnapshot(tabId);
            } else if (result?.error) {
              await new Promise(r => setTimeout(r, 400));
            }
            history.push({ ...actionObj, result, snapshot });
            steps.push({ description: actionObj.description || actionObj.type, ok: !result?.error, snapshot });
            bgUpdateRemoteCommand(cmd.id, token, { steps });
            if (result?.error) { stepFailed = true; consecutiveFailures++; break; }
            else { consecutiveFailures = 0; }
          }

          stepAttempts++;

          if (!stepFailed) {
            const verifyPage = await bgGetAgentPageContext(tabId);
            if (bgVerifyStepHeuristic(step, verifyPage) !== false) {
              completedSteps.push(step); stepDone = true;
            }
          }

          if (consecutiveFailures >= 2 && stepIdx < planSteps.length - 1) {
            const verifyPage = await bgGetAgentPageContext(tabId);
            const lastErr = history.filter(h => h.result?.error).slice(-1)[0];
            const revised = await bgReplanWorkflow(cmd.task, completedSteps, planSteps.slice(stepIdx), verifyPage, lastErr?.result?.error || "Unknown failure");
            planSteps = [...planSteps.slice(0, stepIdx + 1), ...revised];
            consecutiveFailures = 0;
          }
        }
      }

      await finish("done", `Completed all ${planSteps.length} steps.`);
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  while (iterations++ < MAX) {
    // Check if user stopped the task from phone
    if (iterations > 1 && await bgCheckStopped(cmd.id, token)) {
      console.log("[BgRemoteAgent] Task stopped externally");
      chrome.storage.local.remove("remoteProcessingId");
      return;
    }

    const pageInfo = await bgGetAgentPageContext(tabId);
    let actions = bgTryFastPath(cmd.task, history);
    if (!actions) {
      try {
        actions = await bgCallAgentStep(cmd.task, pageInfo, history);
      } catch (e) {
        await finish("error", `Error: ${e.message}`);
        return;
      }
    }

    const first = actions[0];
    if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
      if (first.type === "done") {
        const realDone = history.filter(h => ["click","type","pressKey","selectOption"].includes(h.type) && h.result?.success);
        const needsActions = /send|submit|reply|compose|type|fill|click|buy|order|play|post|write|upload/i.test(cmd.task);
        if (needsActions && realDone.length === 0) {
          history.push({ type: "correction", description: "No real actions yet — keep going.", result: { success: false } });
          continue;
        }
      }
      await finish("done", first.message || "Done.");
      return;
    }

    for (const actionObj of actions) {
      if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
        await finish("done", actionObj.message || "Done.");
        return;
      }

      const result = await bgExecuteAgentAction(tabId, actionObj);
      let snapshot = null;
      if (!result?.error && BG_SNAPSHOT_ACTIONS.has(actionObj.type)) {
        if (actionObj.type === "navigate") {
          await bgWaitForTabReady(tabId, 5000);
          await new Promise(r => setTimeout(r, 200));
        } else {
          await new Promise(r => setTimeout(r, 200));
        }
        snapshot = await bgGetPageSnapshot(tabId);
      } else if (result?.error) {
        await new Promise(r => setTimeout(r, 400));
      }

      history.push({ ...actionObj, result, snapshot });
      steps.push({ description: actionObj.description || actionObj.type, ok: !result?.error, snapshot });
      // Fire-and-forget step updates — don't block the loop on DB write
      bgUpdateRemoteCommand(cmd.id, token, { steps });

      if (result?.error) break;
    }
  }

  await finish("error", "Ran out of steps. Check your desktop browser.");
}

// --- realtime subscription (keeps worker alive + instant pickup) ---

const BG_REALTIME_URL = BG_SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1/websocket";

let bgRealtimeWs = null;
let bgRealtimeHeartbeat = null;
let bgRealtimeReconnectTimer = null;
let bgRealtimeBackoff = 5000; // exponential backoff, caps at 60s

async function bgStartRealtime() {
  clearInterval(bgRealtimeHeartbeat);
  clearTimeout(bgRealtimeReconnectTimer);
  if (bgRealtimeWs) { try { bgRealtimeWs.close(); } catch(e) {} bgRealtimeWs = null; }

  // Don't attempt while offline — the online event will restart us
  if (!navigator.onLine) {
    console.log("[BgRealtime] Offline — waiting for network");
    return;
  }

  // Refresh token if it may have expired (try, fall through on failure)
  let data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  if (!data.authUserId) return;
  if (!data.authToken) {
    const fresh = await bgRefreshAuthToken();
    if (!fresh) return;
    data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  }
  if (!data.authToken) return;

  const ws = new WebSocket(`${BG_REALTIME_URL}?apikey=${BG_SUPABASE_ANON_KEY}&vsn=1.0.0`);
  bgRealtimeWs = ws;

  ws.onopen = () => {
    console.log("[BgRealtime] Connected");
    bgRealtimeBackoff = 5000; // reset backoff on successful connect
    ws.send(JSON.stringify({
      topic: "realtime:public:agent_commands",
      event: "phx_join",
      payload: {
        config: {
          postgres_changes: [{ event: "INSERT", schema: "public", table: "agent_commands", filter: `user_id=eq.${data.authUserId}` }]
        },
        access_token: data.authToken
      },
      ref: "1"
    }));
    // Heartbeat every 25s — keeps WebSocket alive AND keeps service worker alive
    bgRealtimeHeartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
      }
    }, 25000);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === "postgres_changes" && msg.payload?.data?.type === "INSERT") {
        console.log("[BgRealtime] New command → triggering poll immediately");
        bgPollRemoteCommands();
      }
      // Supabase sends phx_reply with status "error" when JWT is rejected
      if (msg.event === "phx_reply" && msg.payload?.status === "error") {
        console.warn("[BgRealtime] Join rejected — refreshing token and reconnecting");
        bgRefreshAuthToken().then(() => {
          bgRealtimeBackoff = 2000;
          bgStartRealtime();
        });
      }
    } catch(_) {}
  };

  ws.onclose = () => {
    clearInterval(bgRealtimeHeartbeat);
    bgRealtimeWs = null;
    if (!navigator.onLine) {
      console.log("[BgRealtime] Closed while offline — will reconnect when online");
      return;
    }
    const delay = bgRealtimeBackoff;
    bgRealtimeBackoff = Math.min(bgRealtimeBackoff * 2, 60000);
    console.log(`[BgRealtime] Disconnected — reconnecting in ${delay / 1000}s`);
    bgRealtimeReconnectTimer = setTimeout(bgStartRealtime, delay);
  };

  ws.onerror = () => {}; // onclose always fires after onerror, handled there
}

// Restart immediately when network comes back
self.addEventListener("online", () => {
  console.log("[BgRealtime] Network restored — reconnecting");
  bgRealtimeBackoff = 5000;
  bgStartRealtime();
  bgPollRemoteCommands();
});

// --- token refresh ---

async function bgRefreshAuthToken() {
  const { authRefreshToken } = await new Promise(r => chrome.storage.local.get("authRefreshToken", r));
  if (!authRefreshToken) return null;
  try {
    const res = await fetch(`${BG_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: BG_SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: authRefreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;
    chrome.storage.local.set({
      authToken: json.access_token,
      authRefreshToken: json.refresh_token || authRefreshToken,
    });
    return json.access_token;
  } catch (e) {
    return null;
  }
}

// --- polling ---

async function bgPollRemoteCommands() {
  const data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId", "remoteProcessingId"], r));
  if (!data.authUserId) {
    console.log("[BgRemoteAgent] Not logged in, skipping poll");
    return;
  }

  let token = data.authToken;
  if (!token) {
    token = await bgRefreshAuthToken();
    if (!token) { console.log("[BgRemoteAgent] No token, skipping poll"); return; }
  }

  try {
    let res = await fetch(
      `${BG_SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
      { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    // JWT expired — refresh and retry once
    if (res.status === 401) {
      const newToken = await bgRefreshAuthToken();
      if (!newToken) { console.warn("[BgRemoteAgent] Token refresh failed"); return; }
      token = newToken;
      res = await fetch(
        `${BG_SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
        { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    }
    if (!res.ok) {
      console.warn("[BgRemoteAgent] Poll failed:", res.status, await res.text());
      return;
    }
    const rows = await res.json();
    const cmd = rows[0];
    if (!cmd) return;
    if (cmd.id === data.remoteProcessingId) {
      // Same command seen again — only skip if we picked it up recently (< 90s).
      // If it's been longer, the previous attempt silently died; clear the lock and retry.
      const elapsed = Date.now() - (data.remoteProcessingTime || 0);
      if (elapsed < 90000) return;
      console.log("[BgRemoteAgent] Clearing stale lock for:", cmd.id);
      chrome.storage.local.remove(["remoteProcessingId", "remoteProcessingTime"]);
    }

    console.log("[BgRemoteAgent] Found command:", cmd.id, cmd.task);
    chrome.storage.local.set({ remoteProcessingId: cmd.id, remoteProcessingTime: Date.now() });

    // Try side panel first — if it's open, let it handle with UI
    const forwarded = await forwardToSidePanel(cmd);
    if (!forwarded) {
      // Side panel closed — run the full agent loop here in background
      bgRunRemoteCommand(cmd, token);
    }
  } catch (e) {
    console.error("[BgRemoteAgent] Error:", e);
  }
}

function forwardToSidePanel(cmd) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "handleRemoteCommand", cmd }, (res) => {
      if (chrome.runtime.lastError) resolve(false);
      else resolve(true);
    });
    setTimeout(() => resolve(false), 300);
  });
}

// Set up alarm for polling every minute (MV3 minimum is 1 minute)
chrome.alarms.create("remoteAgentPoll", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "remoteAgentPoll") bgPollRemoteCommands();
});
// Also poll + start realtime immediately on service worker startup
bgPollRemoteCommands();
bgStartRealtime();

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
  // Restart realtime with fresh credentials
  bgStartRealtime();
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

async function bgGetAudioSegment() {
  await ensureOffscreen();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ target: "offscreen", action: "getSegment" }, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res || {});
    });
  });
}

async function bgGetAndTranscribeSegment(existingNotes) {
  const stored = await new Promise(r => chrome.storage.local.get(["authToken"], r));
  if (!stored.authToken) return { error: "Not signed in", notes: existingNotes };

  const segRes = await bgGetAudioSegment();
  if (!segRes?.audioBase64) return { notes: existingNotes, empty: true };

  try {
    const res = await fetch(`${BG_API_BASE}/transcribe-and-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.authToken}`,
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ audioSegments: [segRes.audioBase64], existingNotes }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { error: `Transcription failed (${res.status})`, notes: existingNotes };
    }
    const json = await res.json();
    return { notes: json.notes || existingNotes };
  } catch (e) {
    return { error: e.message || "Transcription failed", notes: existingNotes };
  }
}

async function bgSyncToNotion(markdown, title) {
  const stored = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  if (!stored.authToken || !stored.authUserId) return { error: "Not signed in" };

  const statusRes = await fetch(`${BG_API_BASE}/notion-connection-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stored.authToken}`,
      apikey: BG_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ userIdentifier: stored.authUserId }),
  });
  const statusJson = await statusRes.json().catch(() => ({}));
  if (!statusJson.connected) return { error: "not_connected" };

  const syncRes = await fetch(`${BG_API_BASE}/sync-to-notion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stored.authToken}`,
      apikey: BG_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ userIdentifier: stored.authUserId, title: title || "Lecture Notes", markdown }),
  });
  if (!syncRes.ok) {
    const j = await syncRes.json().catch(() => ({}));
    return { error: j.error || "Notion sync failed" };
  }
  const syncJson = await syncRes.json().catch(() => ({}));
  return { success: true, url: syncJson.url };
}
