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
Post tweet: navigate → https://x.com/compose/tweet → wait 1000
  → type selector="[data-testid='tweetTextarea_0']"
  → click selector="[data-testid='tweetButtonInline']"
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
Send message: click selector="[data-tab='3']" (search) → type contact name → wait 600
  → click contact in list → type selector="[data-tab='10']" or [aria-label*="Type a message"] → pressKey Enter`;
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
  return `
── GENERAL SITE ──
Prefer navigating to URLs over clicking search bars.
Use sel= selectors from INTERACTIVE ELEMENTS when available.
For forms: click field → type → Tab to next field → submit.`;
}

async function bgCallAgentStep(task, pageInfo, history) {
  const historyText = history.length > 0
    ? history.map((h, i) => {
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
{"type":"done","message":"what was accomplished"}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}  ← ONLY when genuinely blocked

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
8. Flights: IATA codes + DD/MM/YYYY. Never touch date pickers.
9. WRONG SITE: If the current page is wrong for the task (e.g., on Spotify but asked about flights), your FIRST action MUST be navigate to the correct site. Never say "I can't do this here" — just navigate away immediately.

${bgGetPlatformGuide(currentUrl)}

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

STEPS TAKEN SO FAR:
${historyText}

What actions should be taken next? Return a single JSON object, OR a JSON array of up to 3 objects for sequences that are certain to succeed in order (e.g. [type, pressKey] or [click, type]). Only batch when all steps are highly predictable. NEVER include navigate in a batch.`;

  const response = await fetch(`${BG_API_BASE}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: agentSystemPrompt, message: userMessage }),
  });

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

async function bgRunRemoteCommand(cmd, token) {
  console.log("[BgRemoteAgent] Running command in background:", cmd.task);
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps: [] });

  // Resolve tab ID once — reuse for entire run to avoid repeated async lookups
  const tabId = await bgGetActiveTabId();
  console.log("[BgRemoteAgent] Using tab:", tabId);

  const steps = [];
  const history = [];
  const MAX = 20;
  let iterations = 0;

  const finish = async (status, result) => {
    await bgUpdateRemoteCommand(cmd.id, token, { status, result, steps });
    chrome.storage.local.remove("remoteProcessingId");
    chrome.runtime.sendMessage({ action: "remoteCommandComplete", cmdId: cmd.id, result }).catch(() => {});
    console.log("[BgRemoteAgent] Command finished:", status, result);
  };

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
    if (cmd.id === data.remoteProcessingId) return;

    console.log("[BgRemoteAgent] Found command:", cmd.id, cmd.task);
    chrome.storage.local.set({ remoteProcessingId: cmd.id });

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
