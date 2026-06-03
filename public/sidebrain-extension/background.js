// Background service worker for Braino (MV3)
let isRecording = false;
let bgAgentShouldStop = false;

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

function bgGetStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function bgSetStorage(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function bgRemoveStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

const BG_INTERNAL_PREMIUM_EMAILS = new Set([
  "itishpande21@gmail.com",
]);

function bgNormalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function bgIsInternalPremiumEmail(email) {
  const normalized = bgNormalizeEmail(email);
  return !!normalized && BG_INTERNAL_PREMIUM_EMAILS.has(normalized);
}

async function bgPerformRealWebSearch(query, options = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return { error: "No search query provided." };

  try {
    const stored = await bgGetStorage(["authToken"]);
    let token = stored.authToken;
    if (!token) token = await bgRefreshAuthToken();
    if (!token) return { error: "Please sign in to Braino before using web research." };

    const researchBody = JSON.stringify({
      query: trimmedQuery,
      purpose: options.purpose || "answer",
      aiProvider: options.aiProvider,
      chatHistory: options.chatHistory,
      instructions: options.instructions,
    });

    const callResearch = (jwt) => fetch(`${BG_API_BASE}/web-research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
      },
      body: researchBody,
    });

    let resp = await callResearch(token);
    if (resp.status === 401) {
      const freshToken = await bgRefreshAuthToken();
      if (freshToken) resp = await callResearch(freshToken);
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { error: data?.error || `Web research failed: ${resp.status}` };
    }

    const sources = Array.isArray(data?.sources) ? data.sources : [];
    const results = Array.isArray(data?.results) && data.results.length
      ? data.results
      : sources.map((source) => ({
          title: source.title || source.url || "Untitled source",
          url: source.url || "",
          snippet: source.snippet || source.extractedTextExcerpt || "",
          highlights: source.highlights || [],
          publishedDate: source.publishedDate || null,
          status: source.status || "snippet_only",
        }));

    return {
      ...data,
      query: data?.query || trimmedQuery,
      engine: data?.engine || "OpenAI web_search",
      searchUrl: data?.searchUrl || "",
      sources,
      results,
    };
  } catch (e) {
    return { error: e.message || "Web research failed." };
  }
}

// Toggle injected panel when extension icon is clicked.
// For scriptable tabs this fires normally (no popup registered).
// For restricted tabs the popup is pre-registered via bgSyncActionPopup so
// onClicked never fires — but handle it here as a first-click safety net.
chrome.action.onClicked.addListener((tab) => {
  const url = tab.url || "";
  if (!bgIsScriptableUrl(url)) {
    chrome.action.setPopup({ tabId: tab.id, popup: "braino-popup.html" });
    if (chrome.action.openPopup) chrome.action.openPopup().catch?.(() => {});
    return;
  }

  chrome.storage.local.set({ activeTabId: tab.id });

  const sendToggle = (allowRetry, allowInject) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => {
      const err = chrome.runtime.lastError?.message || "";
      const missingReceiver =
        err.includes("Receiving end does not exist") ||
        err.includes("Could not establish connection");

      if (!missingReceiver) return;

      // Give the manifest-injected content script a moment to finish loading
      // before we fall back to a manual injection.
      if (allowRetry) {
        setTimeout(() => sendToggle(false, allowInject), 180);
        return;
      }

      if (!allowInject) return;

      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
        void chrome.runtime.lastError;
        chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => { void chrome.runtime.lastError; });
      });
    });
  };

  sendToggle(true, true);
});

// Auto-update activeTabId and sync popup state when user switches tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.storage.local.set({ activeTabId: tabId });
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    bgSyncActionPopup(tabId, tab?.url || "");
  });
});

// Keep popup state in sync as tab URLs change (navigation, SPA, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined || changeInfo.status === "complete") {
    bgSyncActionPopup(tabId, tab?.url || "");
  }
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
    bgPerformRealWebSearch(message.query, {
      purpose: message.purpose,
      aiProvider: message.aiProvider,
      chatHistory: message.chatHistory,
      instructions: message.instructions,
    })
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ error: e.message || "Web search failed." }));
    return true;
  }
  if (message.action === "generateXReply") {
    (async () => {
      const { tweetText, handle } = message;
      const builderPrompt = Boolean(message.builderPrompt) || bgIsBuilderPromptTweet(tweetText);
      const persona = await bgLoadXPersona();
      const xReplyPrompt = bgBuildXReplyPrompt({ handle, builderPrompt, persona });

      bgChatFetch({
          notes: '',
          chatHistory: [
            {
              role: 'user',
              content: xReplyPrompt,
            },
            { role: 'assistant', content: 'Got it. Give me the tweet.' },
            { role: 'user', content: '@founder: "Most startup advice is survivorship bias with better branding."' },
            { role: 'assistant', content: 'yeah a lot of it is just luck wearing a framework costume' },
            { role: 'user', content: '@manager: "Remote work isn\'t dying. Bad management is."' },
            { role: 'assistant', content: 'a lot of return-to-office panic really is management debt with better PR' },
            { role: 'user', content: '@builder: "If onboarding needs a meeting, the product probably isn\'t ready."' },
            { role: 'assistant', content: 'mostly true. enterprise is the annoying exception, but even there the payoff has to be obvious fast' },
            { role: 'user', content: '@pm: "The best PMs write better bug reports than specs."' },
            { role: 'assistant', content: 'because they notice where reality breaks, not just where the roadmap sounds neat' },
            { role: 'user', content: '@maker: "what are you building right now? drop it below"' },
            { role: 'assistant', content: 'building Braino right now. ai browser companion that can actually act on the tab for you. trybraino.com' },
          ],
          message: `@${handle || 'user'}: "${tweetText}"`,
        })
        .then(r => r.json())
        .then(data => sendResponse({ reply: bgCleanXReply(data?.reply || data?.response || null) || null }))
        .catch(() => sendResponse({ reply: null }));
    })().catch(() => sendResponse({ reply: null }));
    return true;
  }
  if (message.action === "recordXAutomationRunStats") {
    bgRecordXAutomationRunStats(message)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message || "Could not save X automation stats." }));
    return true;
  }
  if (message.action === "logXReply") {
    bgLogXReply(message).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "loadXPersona") {
    bgLoadXPersona()
      .then(persona => sendResponse({ persona: persona || null }))
      .catch(() => sendResponse({ persona: null }));
    return true;
  }
  if (message.action === "runBrainAgent") {
    const task = message.task;
    const connector = message.connector;
    const senderTabId = sender?.tab?.id || null;
    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      const tabId = senderTabId || activeTabId || message.senderTabId;
      if (!tabId) { sendResponse({ ok: true }); return; }
      chrome.storage.local.set({ activeTabId: tabId });
      bgAgentShouldStop = false;
      bgRunBrainAgent(tabId, task, connector);
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message.action === "stopBrainAgent") {
    bgAgentShouldStop = true;
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "openSilentAuthTab") {
    const extId = chrome.runtime.id;
    chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${extId}`, active: false }, (tab) => {
      if (tab?.id) chrome.storage.local.set({ __sbAuthTabId: tab.id });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "openAuthTab") {
    const extId = chrome.runtime.id;
    chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${extId}` }, (tab) => {
      if (tab?.id) chrome.storage.local.set({ __sbAuthTabId: tab.id });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "checkAuth") {
    (async () => {
      // Pull token from extension storage
      let { authToken, authRefreshToken } = await chrome.storage.local.get(["authToken", "authRefreshToken"]);

      // If no token in extension storage, try to grab it from any open trybraino.com tab
      if (!authToken && !authRefreshToken) {
        try {
          const tabs = await chrome.tabs.query({ url: "*://trybraino.com/*" });
          if (tabs.length > 0) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                try {
                  const raw = localStorage.getItem('sb-suwhgaxxdizowbyjlljj-auth-token');
                  if (!raw) return null;
                  const s = JSON.parse(raw);
                  return s?.access_token ? s : null;
                } catch { return null; }
              }
            });
            const s = results?.[0]?.result;
            if (s?.access_token) {
              authToken = s.access_token;
              authRefreshToken = s.refresh_token || null;
              const authEmail = s.user?.email || null;
              chrome.storage.local.set({
                authToken,
                authRefreshToken,
                authEmail,
                authUserId: s.user?.id || null,
                authDisplayName: s.user?.user_metadata?.full_name || s.user?.user_metadata?.name || null,
                ...(bgIsInternalPremiumEmail(authEmail) ? { isPremium: true, isPremiumCachedAt: Date.now() } : {}),
              });
            }
          }
        } catch {}
      }

      if (!authToken && !authRefreshToken) { sendResponse({ authenticated: false }); return; }
      try {
        const res = await fetch(`${BG_SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) { sendResponse({ authenticated: true }); return; }
        if (authRefreshToken) {
          const refreshed = await bgRefreshAuthToken();
          sendResponse({ authenticated: !!refreshed });
          return;
        }
        sendResponse({ authenticated: false });
      } catch {
        sendResponse({ authenticated: !!authToken });
      }
    })();
    return true;
  }
  if (message.action === "resolvePremiumStatus") {
    (async () => {
      const result = await bgResolvePremiumStatus({ forceRefresh: Boolean(message.forceRefresh) });
      sendResponse(result);
    })();
    return true;
  }
  if (message.action === "openTab") {
    const url = String(message.url || "").trim();
    if (url.startsWith("https://") || url.startsWith("http://")) {
      chrome.tabs.create({ url, active: message.active !== false }, () => { void chrome.runtime.lastError; });
    }
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "classifyBrainAgentTask") {
    (async () => {
      const task = String(message.task || "").trim();
      if (!task) {
        sendResponse({ shouldDelegate: false, matched: null });
        return;
      }

      const senderTabId = sender?.tab?.id || null;
      const activeTabId = senderTabId || await bgGetActiveTabId();
      const siteContext = activeTabId ? await bgGetSiteAdapterContext(activeTabId) : { site: "generic", url: "", title: "" };
      const connectorHint = message.connector;
      const parsed = bgParseAdapterTask(task, siteContext, connectorHint);
      const fastActions = bgTryFastPath(task, []);
      const looksLikeBrowserTask = bgLooksLikeBrowserTask(task);

      sendResponse({
        shouldDelegate: Boolean(parsed || fastActions || looksLikeBrowserTask),
        matched: parsed
          ? "adapter"
          : fastActions
            ? "fastpath"
            : looksLikeBrowserTask
              ? "browser-task"
              : null,
        adapter: parsed?.adapter || null,
        intent: parsed?.intent || null,
      });
    })();
    return true;
  }
  if (
    message.action === "agentAction" ||
    message.action === "getAgentPageContext" ||
    message.action === "siteAdapterAction" ||
    message.action === "getSiteAdapterContext"
  ) {
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = message.tabId || store.activeTabId;
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
const BG_SUPABASE_URL = "https://suwhgaxxdizowbyjlljj.supabase.co";
const BG_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";
const BG_API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";
const BG_PREMIUM_CACHE_MS = 5 * 60 * 1000;
const BG_BRAINO_FAVORITE_SONG_URI = "spotify:track:6Hgh47WXVKtXN5zGOu0hjI";

async function bgChatFetch(body) {
  const { authToken } = await new Promise(r => chrome.storage.local.get("authToken", r));
  return fetch(`${BG_API_BASE}/chat-about-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

let bgXPersonaCache = null;
let bgXPersonaCacheExpiry = 0;

// --- helpers ---

function bgIsBuilderPromptTweet(tweetText) {
  return /\b(what(?:'s| is)?\s+(?:everyone|everybody|yall|you all|you)\s+building|what are you building|what(?:'re| are)\s+you building|drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links|website)|share\s+what\s+you(?:'re| are)\s+building|show\s+me\s+what\s+you(?:'re| are)\s+building|plug\s+your\s+(?:startup|product|app|tool|project)|builders?\s+drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links))\b/i.test(String(tweetText || ""));
}

async function bgLoadXPersona() {
  if (bgXPersonaCache !== null && Date.now() < bgXPersonaCacheExpiry) return bgXPersonaCache;
  try {
    const storage = await new Promise(r => chrome.storage.local.get(['authUserId'], r));
    const userId = storage.authUserId;
    if (!userId) return null;
    const url = `${BG_SUPABASE_URL}/rest/v1/x_auto_persona?user_id=eq.${encodeURIComponent(userId)}&select=display_name,bio,what_building,tone_notes&limit=1`;
    const { res } = await bgAuthedSupabaseFetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return null;
    const rows = await res.json();
    bgXPersonaCache = rows[0] || null;
    bgXPersonaCacheExpiry = Date.now() + 5 * 60 * 1000;
    return bgXPersonaCache;
  } catch { return null; }
}

function bgBuildXReplyPrompt({ handle, builderPrompt, persona }) {
  const personaLines = [];
  if (persona) {
    if (persona.display_name) personaLines.push(`You are ${persona.display_name}.`);
    if (persona.bio) personaLines.push(`Background: ${persona.bio}`);
    if (persona.what_building) personaLines.push(`Currently building: ${persona.what_building}`);
    if (persona.tone_notes) personaLines.push(`Writing style: ${persona.tone_notes}`);
  }
  const personaBlock = personaLines.length ? personaLines.join('\n') + '\n\n' : '';

  const promoRule = builderPrompt
    ? "11. This tweet is explicitly inviting builders to share what they are making. It is okay to mention Braino and include trybraino.com once, naturally and briefly, like a real builder reply."
    : "11. Do not sound promotional. Do not mention Braino or trybraino.com unless the tweet is directly about AI browser agents or workflow automation and the mention feels natural.";

  return `${personaBlock}You write replies on X that sound like a real person in the feed, not a bot, brand intern, customer support rep, or LinkedIn commenter.

Write ONE reply to the tweet.

Rules:
1. Max 180 characters total.
2. Reply to one specific detail, implication, or phrase from the tweet. Do not give generic praise plus a paraphrase.
3. Sound human: conversational, concrete, a little imperfect is okay. One or two short sentences is ideal. Fragments are okay.
4. Match the tweet's energy. If the tweet is sharp, be sharp. If it's thoughtful, be thoughtful. If it's playful, be playful. Do not force slang.
5. Do not start with @${handle || 'user'} unless the meaning would be unclear without it.
6. No em dashes, hashtags, list formatting, or quotes around the whole reply.
7. Avoid canned openings like "great point", "love this", "totally agree", "well said", "interesting take", or "thanks for sharing".
8. Avoid AI-sounding phrasing like "this highlights", "this underscores", "important conversation", "valuable insight", "in today's world", or "I couldn't agree more".
9. Ask a follow-up question only if it is genuinely specific and improves the reply. Do not ask a question by default.
10. At most one emoji, and only if it feels native to the tweet.
${promoRule}
12. Return ONLY the reply text.
13. Never output labels or prefixes like "Draft 1", "Draft 2", "Option 1", "Reply:", "Candidate 1", or multiple candidates.
14. Never reveal your internal drafting process. Draft silently and output only the final chosen reply.

Before answering, silently draft 3 candidate replies and choose the one that is most specific, least generic, and most likely to be posted by a real person on X.`;
}

function bgCleanXReply(value) {
  let reply = String(value || "").trim();
  if (!reply) return "";

  reply = reply
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  const candidateLines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const extractedCandidates = candidateLines
    .map((line) => {
      const labeled = line.match(/^(?:draft|option|reply|candidate)\s*#?\d*\s*[:.)-]?\s*(.+)$/i);
      if (labeled?.[1]) return labeled[1].trim();

      const numbered = line.match(/^\d+\s*[:.)-]\s*(.+)$/);
      if (numbered?.[1]) return numbered[1].trim();

      return null;
    })
    .filter(Boolean);

  if (extractedCandidates.length) {
    reply = extractedCandidates[0];
  } else {
    reply = candidateLines
      .filter((line) => !/^(?:here(?:'s| are)|options?|choices?|candidates?)\b/i.test(line))
      .join(" ")
      .trim();
  }

  reply = reply
    .split(/\s+(?=(?:draft|option|reply|candidate)\s*#?\d+\s*[:.)-]?\s)/i)[0]
    .replace(/^(?:draft|option|reply|candidate)\s*#?\d*\s*[:.)-]?\s*/i, "")
    .replace(/^\d+\s*[:.)-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return reply.slice(0, 240);
}

async function bgAuthedSupabaseFetch(url, options = {}) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token) throw new Error("Not signed in");

  const makeRequest = (jwt) =>
    fetch(url, {
      ...options,
      headers: {
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        ...(options.headers || {}),
      },
    });

  let res = await makeRequest(token);
  if (res.status === 401) {
    const refreshed = await bgRefreshAuthToken();
    if (!refreshed) throw new Error("Auth expired");
    token = refreshed;
    res = await makeRequest(token);
  }

  return { res, token, userId: stored.authUserId || null };
}

async function bgRecordXAutomationRunStats({ repliedCount, durationMs, startedAt, finishedAt }) {
  const safeReplyCount = Math.max(0, Number(repliedCount) || 0);
  const safeDurationMs = Math.max(0, Number(durationMs) || 0);
  const authState = await new Promise((resolve) => chrome.storage.local.get(["authUserId"], resolve));
  const userId = authState.authUserId;
  if (!userId) throw new Error("No signed-in user");

  const selectUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats?user_id=eq.${encodeURIComponent(userId)}&select=id,total_replies,total_runs,total_runtime_ms&limit=1`;
  const { res: selectRes } = await bgAuthedSupabaseFetch(selectUrl, {
    headers: { "Content-Type": "application/json" },
  });
  if (!selectRes.ok) throw new Error(`Could not load X automation stats (${selectRes.status})`);

  const existingRows = await selectRes.json();
  const current = Array.isArray(existingRows) ? existingRows[0] : null;
  const payload = {
    user_id: userId,
    total_replies: (Number(current?.total_replies) || 0) + safeReplyCount,
    total_runs: (Number(current?.total_runs) || 0) + 1,
    total_runtime_ms: (Number(current?.total_runtime_ms) || 0) + safeDurationMs,
    last_run_reply_count: safeReplyCount,
    last_run_duration_ms: safeDurationMs,
    last_run_started_at: startedAt || null,
    last_run_finished_at: finishedAt || null,
  };

  if (current?.id) {
    const updateUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats?id=eq.${current.id}`;
    const { res: updateRes } = await bgAuthedSupabaseFetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!updateRes.ok) throw new Error(`Could not update X automation stats (${updateRes.status})`);
    return;
  }

  const insertUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats`;
  const { res: insertRes } = await bgAuthedSupabaseFetch(insertUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!insertRes.ok) throw new Error(`Could not create X automation stats (${insertRes.status})`);
}

async function bgLogXReply({ postAuthorHandle, postAuthorDisplayName, postUrl, postText, ourReply, repliedAt }) {
  try {
    const storage = await new Promise(r => chrome.storage.local.get(['authUserId'], r));
    const userId = storage.authUserId;
    if (!userId) return;
    const url = `${BG_SUPABASE_URL}/rest/v1/x_auto_reply_logs`;
    await bgAuthedSupabaseFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        post_author_handle: postAuthorHandle || '',
        post_author_display_name: postAuthorDisplayName || '',
        post_url: postUrl || '',
        post_text: postText || '',
        our_reply: ourReply || '',
        replied_at: repliedAt || new Date().toISOString(),
      }),
    });
  } catch { /* fire-and-forget — never surface to caller */ }
}

function bgIsScriptableUrl(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") &&
         !url.startsWith("chrome-extension://") &&
         !url.startsWith("about:") &&
         !url.startsWith("devtools://") &&
         !url.startsWith("edge://") &&
         !url.startsWith("https://chrome.google.com/webstore") &&
         !url.startsWith("https://chromewebstore.google.com");
}

// Pre-register the correct action popup for a tab so clicking the icon
// always does the right thing without waiting for onClicked to fire.
function bgSyncActionPopup(tabId, url) {
  const popup = bgIsScriptableUrl(url) ? "" : "braino-popup.html";
  chrome.action.setPopup({ tabId, popup });
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

async function bgGetSiteAdapterContext(tabId) {
  const empty = { site: "generic", url: "", title: "" };
  if (!tabId) return empty;

  return new Promise(resolve => {
    function sendMsg(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "getSiteAdapterContext" }, res => {
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

async function bgExecuteSiteAdapterAction(tabId, actionObj) {
  if (!tabId) return { error: "No active tab" };

  return new Promise(resolve => {
    function sendToContent(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "siteAdapterAction", ...actionObj }, res => {
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

async function bgSendInlineUiMessage(tabId, message) {
  if (!tabId) return null;
  return new Promise((resolve) => {
    function send(retrying) {
      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(null); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            setTimeout(() => send(true), 250);
          });
        } else {
          resolve(res || null);
        }
      });
    }
    send(false);
  });
}

async function bgBuildSpotifyUiState(tabId, base = {}) {
  const siteContext = await bgGetSiteAdapterContext(tabId);
  return {
    active: true,
    source: "spotify",
    intent: String(base.intent || "").trim(),
    query: String(base.query || "").trim(),
    currentPlaylistName: String(siteContext?.currentPlaylistName || "").trim(),
    searchResults: Array.isArray(siteContext?.visibleTrackDetails) ? siteContext.visibleTrackDetails.slice(0, 6) : [],
    nowPlaying: siteContext?.nowPlaying || null,
    summary: String(base.summary || "").trim(),
  };
}

function bgPushSpotifyState(tabId, state, options = {}) {
  void bgSendInlineUiMessage(tabId, {
    action: "sbSpotifyState",
    state,
    openCard: !!options.openCard,
    focusSpotify: !!options.focusSpotify,
  });
}

async function bgSaveAgentTask(tabId, task, result) {
  try {
    const stored = await new Promise(r => chrome.storage.local.get(["authToken"], r));
    if (!stored.authToken) return;
    let sourceUrl = "", sourceTitle = "";
    try {
      const tab = await new Promise(r => chrome.tabs.get(tabId, r));
      sourceUrl = tab?.url || "";
      sourceTitle = tab?.title || "";
    } catch (_) {}
    await fetch(`${BG_API_BASE}/save-note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.authToken}`,
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: "save",
        session_id: crypto.randomUUID(),
        title: task.length > 120 ? task.slice(0, 117) + "…" : task,
        transcript: task,
        structured_notes: result || "Task completed.",
        source_url: sourceUrl,
        source_title: sourceTitle,
        use_case: "agent",
      }),
    });
  } catch (_) {}
}

async function bgRunBrainAgent(tabId, task, connectorHint) {
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
    bgSaveAgentTask(currentTabId, task, "Done.");
    return;
  }

  try {
    const adapterMessage = await bgTryHandleSiteAdapterTask({
      tabId: currentTabId,
      task,
      connectorHint,
      history,
      onProgress: async (description) => {
        bgBrainUpdate(currentTabId, `→ ${description}`);
      },
      shouldStop: () => bgAgentShouldStop,
    });
    if (adapterMessage) {
      bgBrainUpdate(currentTabId, adapterMessage, true);
      bgSaveAgentTask(currentTabId, task, adapterMessage);
      return;
    }
  } catch (e) {
    bgBrainUpdate(currentTabId, "Adapter error: " + (e.message || e), true);
    return;
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    if (bgAgentShouldStop) {
      bgBrainUpdate(currentTabId, "Task stopped.", true);
      return;
    }
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
        bgSaveAgentTask(currentTabId, task, action.message || "Done.");
        return;
      }
      if (action.type === "clarify") {
        bgBrainUpdate(currentTabId, action.message || "Need more info.", true);
        bgSaveAgentTask(currentTabId, task, action.message || "Needs clarification.");
        return;
      }

      if (action.type === "web_search") {
        bgBrainUpdate(currentTabId, `Searching: "${action.query}"…`);
        const searchData = await bgPerformRealWebSearch(action.query, { purpose: "delegate" });
        const resultsText = searchData.results
          ? searchData.results.map((r, i) => `[${i+1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n")
          : searchData.error || "No results.";
        const researchText = searchData.answer
          ? `${searchData.answer}\n\nSource details:\n${resultsText}`
          : resultsText;
        history.push({ type: "web_search", query: action.query, description: action.description || `Search: "${action.query}"`, result: { success: !searchData.error, text: researchText } });
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
  bgSaveAgentTask(currentTabId, task, "Reached max steps.");
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

function bgBuildSpotifyTrackSearchUrl(songName) {
  return `https://open.spotify.com/search/${encodeURIComponent(songName)}/tracks`;
}

function bgBuildGmailComposeUrl({ to, subject, body }) {
  const url = new URL("https://mail.google.com/mail/u/0/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("tf", "1");
  if (to) url.searchParams.set("to", to);
  if (subject) url.searchParams.set("su", subject);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

async function bgCallGoogleDriveFunction(functionName, payload) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token || !stored.authUserId) throw new Error("Please sign in to Braino first.");
  console.log("[Braino][Drive][BG] Calling function:", functionName, payload);

  const response = await fetch(`${BG_API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userIdentifier: stored.authUserId,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  console.log("[Braino][Drive][BG] Function response:", functionName, response.status, data);
  if (!response.ok) {
    if (data?.reconnectRequired) {
      await bgOpenGoogleDriveReconnect(stored.authUserId);
      throw new Error(`${data.error || "Google Drive needs to be reconnected with full Drive access."} I opened the reconnect page. After approving it, run this again.`);
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function bgOpenGoogleDriveReconnect(userIdentifier) {
  if (!userIdentifier) return false;
  try {
    const response = await fetch(`${BG_API_BASE}/google-drive-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userIdentifier }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    await new Promise((resolve) => chrome.tabs.create({ url: data.authUrl }, resolve));
    return true;
  } catch (error) {
    console.warn("[Braino][Drive][BG] Could not open reconnect flow:", error);
    return false;
  }
}

async function bgCallSpotifyFunction(functionName, payload) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token) throw new Error("Please sign in to Braino first.");

  const response = await fetch(`${BG_API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data?.reconnectRequired) {
      await bgOpenSpotifyReconnect(token);
      throw new Error("Spotify needs to be reconnected. I opened the reconnect page — after approving, run this again.");
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function bgOpenSpotifyReconnect(token) {
  try {
    const tok = token || (await bgRefreshAuthToken());
    if (!tok) return false;
    const response = await fetch(`${BG_API_BASE}/spotify-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tok}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    await new Promise((resolve) => chrome.tabs.create({ url: data.authUrl }, resolve));
    return true;
  } catch (err) {
    console.warn("[Braino][Spotify][BG] Could not open reconnect flow:", err);
    return false;
  }
}

function bgExtractSongFromPageTitle(title, url) {
  let s = String(title || "").trim();
  s = s.replace(/\s*[-|–—]\s*(YouTube|SoundCloud|Vimeo|Dailymotion|Spotify|Apple Music|Tidal|Amazon Music)\s*$/i, "");
  s = s.replace(/\s*[\[(](Official\s+(Music\s+)?Video|Official\s+Audio|Official\s+Lyric\s+Video|Lyrics?|Audio|HQ|HD|4K|MV|Live\s+(Performance|Version)?|Visualizer|Fan\s+Made|Radio\s+Edit)[)\]]\s*/gi, " ");
  s = s.replace(/\s*VEVO\s*/gi, " ");
  s = s.replace(/\s*\(\d{4}\)\s*$/, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

function bgNormalizeConnectorHint(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key || key === "auto" || key === "default") return "auto";
  if (["spotify", "spot", "music"].includes(key)) return "spotify";
  if (["drive", "gdrive", "google-drive", "google_drive"].includes(key)) return "google-drive";
  if (["gmail", "mail", "google-mail", "googlemail"].includes(key)) return "gmail";
  return null;
}

function bgFormatSpotifyDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function bgFormatSpotifyTrack(track, options = {}) {
  if (!track) return null;
  const title = String(track.name || track.title || "").trim();
  if (!title) return null;
  const artists = Array.isArray(track.artists)
    ? track.artists.map((item) => typeof item === "string" ? item : item?.name).filter(Boolean).join(", ")
    : String(track.artists || "").trim();
  const durationMs = typeof track.durationMs === "number"
    ? track.durationMs
    : typeof track.duration_ms === "number"
      ? track.duration_ms
      : null;
  const progressMs = typeof options.progressMs === "number" ? options.progressMs : null;
  return {
    title,
    artists,
    album: String(track.albumName || track.album || "").trim(),
    durationText: durationMs != null ? bgFormatSpotifyDuration(durationMs) : "",
    imageUrl: String(track.imageUrl || track.image || "").trim(),
    href: String(track.externalUrl || track.href || "").trim(),
    progressText: progressMs != null ? bgFormatSpotifyDuration(progressMs) : "",
    progressRatio: (progressMs != null && durationMs)
      ? Math.max(0, Math.min(1, progressMs / durationMs))
      : null,
    deviceName: String(options.deviceName || "").trim(),
    isPlaying: Boolean(options.isPlaying),
  };
}

async function bgFetchSpotifyPlayerState() {
  try {
    return await bgCallSpotifyFunction("spotify-player-state", {});
  } catch (error) {
    console.warn("[Braino][Spotify][BG] Could not fetch player state:", error);
    return null;
  }
}

async function bgPlaySpotifyWithAutoOpen(uris) {
  const payload = { action: "play", uris };
  try {
    return await bgCallSpotifyFunction("spotify-playback", payload);
  } catch (firstErr) {
    if (!String(firstErr?.message || "").match(/device|active/i)) throw firstErr;
    // No active device — open Spotify in a new visible tab so the web player registers a device
    try {
      await new Promise(r => chrome.tabs.create({ url: "https://open.spotify.com", active: true }, r));
    } catch (_) {}
    // Poll every 2s up to 10s for Spotify Web Player to register, then retry
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        await bgCallSpotifyFunction("spotify-playback", payload);
        return { ok: true };
      } catch (_) {}
    }
    throw new Error("Opened Spotify but couldn't start playback. Try playing once in Spotify first.");
  }
}

function bgBuildSpotifyUiStateFromPlayback(playerState, base = {}) {
  const baseTrack = bgFormatSpotifyTrack(base.primaryTrack || null, {
    isPlaying: Boolean(base.assumePlaying),
    deviceName: base.deviceName || "",
  });
  const nowPlaying = bgFormatSpotifyTrack(playerState?.track, {
    isPlaying: Boolean(playerState?.isPlaying),
    progressMs: playerState?.progressMs,
    deviceName: playerState?.activeDevice?.name || base.deviceName || "",
  }) || baseTrack;
  const searchResults = Array.isArray(base.searchTracks)
    ? base.searchTracks.map((track) => bgFormatSpotifyTrack(track)).filter(Boolean).slice(0, 6)
    : [];
  if (!searchResults.length && baseTrack) {
    searchResults.push({ ...baseTrack, isPlaying: false, progressText: "", progressRatio: null, deviceName: "" });
  }

  return {
    active: true,
    source: "spotify",
    intent: String(base.intent || "").trim(),
    query: String(base.query || "").trim(),
    currentPlaylistName: String(base.currentPlaylistName || "").trim(),
    searchResults,
    nowPlaying,
    summary: String(base.summary || "").trim(),
  };
}

async function bgPushSpotifyPlaybackState(tabId, base = {}, options = {}) {
  const playerState = await bgFetchSpotifyPlayerState();
  const state = bgBuildSpotifyUiStateFromPlayback(playerState, base);
  bgPushSpotifyState(tabId, state, options);
  return state;
}

function bgParseAdapterTask(task, siteContext, connectorHint) {
  const raw = String(task || "").trim();
  const text = raw.toLowerCase();
  const currentSite = siteContext?.site || "generic";
  const normalizedConnector = bgNormalizeConnectorHint(connectorHint) || "auto";
  const onSpotify = currentSite === "spotify" || normalizedConnector === "spotify" || /\bspotify\b/.test(text) || /^play\s+/i.test(raw);
  const wantsGoogleDoc = /\bgoogle docs?\b|\bgdocs?\b|\bgoogle doc\b|\bgdoc\b|\bdocs?\.new\b|\bdocs?\b/.test(text);
  const wantsGmail =
    currentSite === "gmail" ||
    normalizedConnector === "gmail" ||
    /\bgmail\b|\bemail\b|\bmail\b/.test(text);
  const wantsGoogleDrive =
    currentSite === "google-drive" ||
    normalizedConnector === "google-drive" ||
    /\bgoogle drive\b|\bdrive\b/.test(text);

  if (
    wantsGoogleDrive &&
    /\b(organize|organise|organhise|sort|clean(?:\s+up)?|tidy(?:\s+up)?|arrange)\b/i.test(raw) &&
    /\b(files?|folders?|docs?|documents?|drive)\b/i.test(raw)
  ) {
    return { adapter: "google-drive", intent: "organize" };
  }

  const quotedAdd = raw.match(/add\s+["“](.+?)["”]\s+to\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedAdd) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: quotedAdd[1].trim(), playlist: quotedAdd[2].trim() };
  }

  const addMatch = raw.match(/add\s+(?:the\s+song\s+|song\s+)?(.+?)\s+to\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && addMatch) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: addMatch[1].trim(), playlist: addMatch[2].trim() };
  }

  const quotedPlay = raw.match(/play\s+["“](.+?)["”]\s+from\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedPlay) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: quotedPlay[1].trim(), playlist: quotedPlay[2].trim() };
  }

  const playMatch = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)\s+from\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && playMatch) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: playMatch[1].trim(), playlist: playMatch[2].trim() };
  }

  const isShortPlaybackCommand = /^(?:pause|resume|continue|stop|next|skip|previous|prev|back)\b/i.test(raw);
  const mentionsSpotifyPlayback = /\b(?:spotify|song|track|music|playlist)\b/i.test(raw);

  if (onSpotify || mentionsSpotifyPlayback || isShortPlaybackCommand) {
    if (/^(?:pause|stop)\b/i.test(raw) || /\b(?:pause|stop)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "pause" };
    }
    if (/^(?:resume|continue)\b/i.test(raw) || /\b(?:resume|continue)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "play" };
    }
    if (/^(?:next|skip)\b/i.test(raw) || /\b(?:next|skip)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "next" };
    }
    if (/^(?:previous|prev|back)\b/i.test(raw) || /\b(?:previous|prev|back)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "previous" };
    }
  }

  if (onSpotify || mentionsSpotifyPlayback || isShortPlaybackCommand) {
    const exactVolume = raw.match(/(?:set|change|put|make)\s+(?:the\s+)?(?:spotify\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*%?/i)
      || raw.match(/volume\s+(?:to\s+|at\s+)?(\d{1,3})\s*%?/i);
    if (exactVolume) {
      return { adapter: "spotify", intent: "setVolume", volumePercent: Math.min(100, Math.max(0, parseInt(exactVolume[1], 10))) };
    }
    if (/\b(lower|decrease|reduce|turn\s+down|quieter|softer|dimmer)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "setVolume", volumeStep: -20 };
    }
    if (/\b(raise|increase|turn\s+up|louder|higher|boost)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "setVolume", volumeStep: +20 };
    }
  }

  const quotedDirectPlay = raw.match(/play\s+[“”](.+?)[“”](?:\s+(?:on|in)\s+spotify)?$/i);
  if (quotedDirectPlay && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(quotedDirectPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: quotedDirectPlay[1].trim() };
  }

  const directPlay = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)(?:\s+(?:on|in)\s+spotify)?$/i);
  if (directPlay && !/\bfrom\s+(?:my\s+)?playlist\b/i.test(raw) && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(directPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: directPlay[1].trim() };
  }

  // "add this song to Spotify" — infer song from current page, save to Liked Songs or playlist
  const addThisQuoted = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:playlist\s+)?[""](.+?)[""](?:\s+(?:playlist\s+)?(?:on\s+)?spotify)?/i);
  if (addThisQuoted) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisQuoted[1].trim() };
  }
  const addThisNamed = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+my\s+(.+?)\s+playlist(?:\s+(?:on\s+)?spotify)?\s*$/i);
  if (addThisNamed) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisNamed[1].trim() };
  }
  if (/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:liked\s+songs?\s+(?:on\s+)?)?spotify\b/i.test(raw) ||
      /(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?liked\s+songs?\b/i.test(raw)) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: null };
  }

  const articlePatterns = [
    /search for\s+(.+?)\s+and\s+(?:write|draft|make|create)\s+(?:about it\s+)?(?:(?:a|an)\s+)?(?:article|report|brief|google docs?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google docs?|docs?)?/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+put\s+(?:it\s+)?(?:in|into)\s+(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+(?:write|draft|make|create|put|turn it into)\s+(?:(?:a|an)\s+)?(?:article|report|brief|google docs?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google docs?|docs?)?/i,
    /write\s+an?\s+article\s+about\s+(.+?)\s+in\s+(?:a\s+)?google docs?/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)\s+(?:about|on)\s+(.+)/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:an?\s+)?(?:article|report|brief)\s+(?:about|on)\s+(.+?)\s+(?:in|as|inside)\s+(?:a\s+)?(?:google docs?|docs?|doc(?:ument)?)/i,
  ];

  if (wantsGoogleDoc) {
    for (const pattern of articlePatterns) {
      const match = raw.match(pattern);
      if (match) {
        return { adapter: "google-docs", intent: "researchArticle", topic: match[1].trim() };
      }
    }
  }

  const sendEmailMatch = raw.match(/(?:send|compose|draft|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about|subject)\s+(.+?)\s+(?:saying|that says|body)\s+(.+)$/i);
  if (wantsGmail && sendEmailMatch) {
    return {
      adapter: "gmail",
      intent: /^(send)/i.test(raw.trim()) ? "sendEmail" : "draftEmail",
      to: sendEmailMatch[1].trim(),
      subject: sendEmailMatch[2].trim(),
      body: sendEmailMatch[3].trim(),
    };
  }

  const draftEmailMatch = raw.match(/(?:draft|compose|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:saying|that says|with message)\s+(.+)$/i);
  if (wantsGmail && draftEmailMatch) {
    return {
      adapter: "gmail",
      intent: "draftEmail",
      to: draftEmailMatch[1].trim(),
      subject: "",
      body: draftEmailMatch[2].trim(),
    };
  }

  const replyEmailMatch = raw.match(/reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && replyEmailMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: replyEmailMatch[1].trim(),
      send: true,
    };
  }

  const draftReplyMatch = raw.match(/draft\s+(?:a\s+)?reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && draftReplyMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: draftReplyMatch[1].trim(),
      send: false,
    };
  }

  const gmailSearchMatch = raw.match(/(?:find|search|look for|open)\s+(?:emails?|mail)\s+(?:about|for|from)?\s+(.+)$/i);
  if (wantsGmail && gmailSearchMatch) {
    return {
      adapter: "gmail",
      intent: "search",
      query: gmailSearchMatch[1].trim(),
    };
  }

  const createFolderMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?(?:google\s+)?drive folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?$/i);
  if (wantsGoogleDrive && createFolderMatch) {
    const parentFolderMatch = raw.match(/\s+in\s+folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
    return {
      adapter: "google-drive",
      intent: "createFolder",
      folderName: createFolderMatch[1].trim(),
      parentFolderName: parentFolderMatch?.[1]?.trim() || null,
    };
  }

  const createDocMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?google doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && createDocMatch) {
    return {
      adapter: "google-drive",
      intent: "createDoc",
      docName: createDocMatch[1].trim(),
      parentFolderName: createDocMatch[2]?.trim() || null,
    };
  }

  const renameMatch = raw.match(/rename\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && renameMatch) {
    return {
      adapter: "google-drive",
      intent: "rename",
      targetKind: renameMatch[1]?.trim()?.toLowerCase() || null,
      currentName: renameMatch[2].trim(),
      newName: renameMatch[3].trim(),
    };
  }

  const moveMatch = raw.match(/move\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+(?:folder\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && moveMatch) {
    return {
      adapter: "google-drive",
      intent: "move",
      targetKind: moveMatch[1]?.trim()?.toLowerCase() || null,
      itemName: moveMatch[2].trim(),
      destinationFolderName: moveMatch[3].trim(),
    };
  }

  const deleteMatch = raw.match(/(?:delete|remove|trash)\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?(?:\s+(?:from|in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && deleteMatch) {
    return {
      adapter: "google-drive",
      intent: "delete",
      targetKind: deleteMatch[1]?.trim()?.toLowerCase() || null,
      itemName: deleteMatch[2].trim(),
    };
  }

  const folderSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && folderSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: folderSearchMatch[1].trim(), folderOnly: true };
  }

  const fileSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?file\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:find|search for|look for)\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && fileSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: fileSearchMatch[1].trim(), folderOnly: false };
  }

  return null;
}

function bgLooksLikeBrowserTask(task) {
  const raw = String(task || "").trim();
  if (!raw) return false;

  const strongImperative = /^(?:open|go to|navigate to|visit|search|find|look up|pull up|bring up|take me to|show me|create|make|draft|compose|send|reply|play|pause|resume|continue|next|skip|previous|prev|book|buy|order|post|tweet|get directions|show directions|route|move|rename|delete|remove|archive|label|organize|organise)\b/i.test(raw);
  if (!strongImperative) return false;

  const actionableTarget = /\b(gmail|email|google drive|drive|spotify|youtube|netflix|google docs?|docs?\.new|google sheets?|sheets?\.new|google slides?|slides?\.new|maps?|directions?|calendar|flight|flights|hotel|hotels|restaurant|restaurants|whatsapp|x|twitter|linkedin|amazon|reddit)\b/i.test(raw);
  return actionableTarget;
}

async function bgBuildArticleDraftFromSearch(topic) {
  const searchData = await bgPerformRealWebSearch(topic, { purpose: "google_doc" });
  if (searchData?.error) throw new Error(searchData.error);
  if (!searchData?.body) throw new Error(`I couldn't create a grounded research draft for "${topic}".`);

  return {
    title: String(searchData.title || `${topic} - Braino Research`).trim(),
    body: String(searchData.body).trim(),
  };
}

async function bgBuildDriveOrganizationPlan(files) {
  const safeFiles = Array.isArray(files) ? files.slice(0, 180) : [];
  if (!safeFiles.length) {
    return { folders: [], moves: [] };
  }

  const response = await bgChatFetch({
      pageContext: {
        title: "Google Drive file inventory",
        url: "https://drive.google.com",
        text: safeFiles.map((file, index) => (
          `[${index + 1}] id=${file.id}\nname=${file.name}\nmime=${file.mimeType}\nparents=${(file.parentNames || []).join(", ") || "root"}`
        )).join("\n\n"),
      },
      message: `You are organizing a Google Drive using API actions.

Return ONLY JSON. No markdown fences.
Format:
{"folders":["Folder A","Folder B"],"moves":[{"fileId":"abc","targetFolderName":"Folder A"}]}

Rules:
- Create practical folders based on the files provided.
- Use at most 8 folders.
- Every move must reference an exact fileId from the inventory.
- targetFolderName must be one of the folders you propose.
- Skip files that should stay where they are.
- Favor simple, human folder names like Finance, Hiring, Meetings, Decks, Docs, Legal, Product, Misc.
- Do not invent fileIds.
- Do not include explanations outside JSON.`,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Drive organization planning failed: ${response.status}`);
  }

  const data = await response.json();
  const reply = String(data.reply || "").trim();
  const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\{[\s\S]*\})/);
  const json = (match?.[1] ?? match?.[0] ?? reply).trim();
  const parsed = JSON.parse(json);
  return {
    folders: Array.isArray(parsed?.folders) ? parsed.folders.map((item) => String(item || "").trim()).filter(Boolean) : [],
    moves: Array.isArray(parsed?.moves) ? parsed.moves : [],
  };
}

function bgValidateDriveOrganizationPlan(files, plan) {
  const fileMap = new Map((Array.isArray(files) ? files : []).map((file) => [String(file.id), file]));
  const normalizedFolders = Array.from(new Set((Array.isArray(plan?.folders) ? plan.folders : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)));
  const allowedFolders = new Set(normalizedFolders);
  const moves = [];

  for (const move of Array.isArray(plan?.moves) ? plan.moves : []) {
    const fileId = String(move?.fileId || "").trim();
    const targetFolderName = String(move?.targetFolderName || "").trim();
    if (!fileId || !targetFolderName) continue;
    const file = fileMap.get(fileId);
    if (!file) continue;
    if (!allowedFolders.has(targetFolderName)) continue;
    moves.push({
      fileId,
      fileName: file.name,
      currentParentIds: Array.isArray(file.parentIds) ? file.parentIds : [],
      targetFolderName,
    });
  }

  const foldersToCreate = Array.from(new Set(moves.map((move) => move.targetFolderName)));
  return { foldersToCreate, moves };
}

async function bgRunAdapterStep({ history, description, type, run, onProgress, onResult }) {
  if (onProgress) await onProgress(description);
  const result = await run();
  history.push({ type: type || "adapter", description, result });
  if (onResult) await onResult({ description, type: type || "adapter", result });
  if (result?.error) throw new Error(result.error);
  return result;
}

async function bgTryHandleSiteAdapterTask({ tabId, task, history, onProgress, onResult, shouldStop, connectorHint }) {
  const siteContext = await bgGetSiteAdapterContext(tabId);
  const parsed = bgParseAdapterTask(task, siteContext, connectorHint);
  console.log("[Braino][Adapter][BG] Parsed task:", { task, tabId, siteContext, connectorHint, parsed });
  if (!parsed) return null;

  if (parsed.adapter === "spotify" && parsed.intent === "addSongToPlaylist") {
    await bgRunAdapterStep({
      history,
      description: `Open Spotify search for "${parsed.song}"`,
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: bgBuildSpotifyTrackSearchUrl(parsed.song),
          description: `Open Spotify search for "${parsed.song}"`,
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 6000);
          await bgDelay(900);
        }
        return result;
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: `Add "${parsed.song}" to the exact playlist "${parsed.playlist}"`,
      type: "spotifyAddTrackToPlaylist",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "spotifyAddTrackToPlaylist",
        songName: parsed.song,
        playlistName: parsed.playlist,
      }),
    });

    return `Added **${parsed.song}** to **${parsed.playlist}** on Spotify.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSongFromPlaylist") {
    const result = await bgRunAdapterStep({
      history,
      description: `Play "${parsed.song}" from "${parsed.playlist}" on Spotify`,
      type: "spotify_playlist_play",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-play-from-playlist", {
        playlistName: parsed.playlist,
        songName: parsed.song,
      }),
    });

    return `Playing **${result?.track?.name || parsed.song}** from **${result?.playlistName || parsed.playlist}** on Spotify. ♫`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "setVolume") {
    let volumePercent = typeof parsed.volumePercent === "number" ? parsed.volumePercent : null;
    if (volumePercent == null) {
      const playerState = await bgFetchSpotifyPlayerState();
      const current = typeof playerState?.volumePercent === "number" ? playerState.volumePercent : 50;
      volumePercent = Math.min(100, Math.max(0, current + (parsed.volumeStep || 0)));
    }
    await bgRunAdapterStep({
      history,
      description: `Set Spotify volume to ${volumePercent}%`,
      type: "spotify_volume",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-playback", { action: "volume", volumePercent }),
    });
    return `Volume set to ${volumePercent}%.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playbackControl") {
    await bgRunAdapterStep({
      history,
      description: `Spotify ${parsed.control}`,
      type: "spotify_control",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-playback", { action: parsed.control }),
    });

    const summaryMap = {
      pause: "Paused Spotify.",
      play: "Resumed Spotify.",
      next: "Skipped to the next track.",
      previous: "Went back to the previous track.",
    };
    return summaryMap[parsed.control] || "Done.";
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSong") {
    const searchResult = await bgRunAdapterStep({
      history,
      description: `Searching Spotify for "${parsed.song}"`,
      type: "spotify_search",
      onProgress,
      onResult,
      run: async () => {
        const data = await bgCallSpotifyFunction("spotify-search", { query: parsed.song, limit: 5 });
        const track = data?.tracks?.[0];
        if (!track) return { error: `No Spotify track found for "${parsed.song}".` };
        return { success: true, track };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    const track = searchResult?.track;
    if (!track?.uri) throw new Error(`Couldn't find "${parsed.song}" on Spotify.`);

    await bgRunAdapterStep({
      history,
      description: `Playing "${track.name}" by ${track.artists?.join(", ") || "unknown"}`,
      type: "spotify_play",
      onProgress,
      onResult,
      run: () => bgPlaySpotifyWithAutoOpen([track.uri]),
    });

    return `Playing **${track.name}** by ${track.artists?.join(", ") || "unknown"} ♫`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "addCurrentPageSong") {
    const pageSnapshot = await bgGetPageSnapshot(tabId);
    const rawTitle = String(pageSnapshot?.title || "").trim();
    if (!rawTitle) throw new Error("I couldn't read the current page title. Make sure you're on YouTube or a music page.");

    const songQuery = bgExtractSongFromPageTitle(rawTitle, pageSnapshot?.url || "");

    const searchResult = await bgRunAdapterStep({
      history,
      description: `Search Spotify for "${songQuery}"`,
      type: "spotify_search",
      onProgress,
      onResult,
      run: async () => {
        const data = await bgCallSpotifyFunction("spotify-search", { query: songQuery, limit: 1 });
        const track = data?.tracks?.[0];
        if (!track) return { error: `No Spotify track found for "${songQuery}".` };
        return { success: true, track };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    const track = searchResult.track;
    const destination = parsed.playlist ? `playlist "${parsed.playlist}"` : "Liked Songs";

    await bgRunAdapterStep({
      history,
      description: `Add "${track.name}" by ${track.artists?.join(", ") || "unknown"} to ${destination}`,
      type: "spotify_add_track",
      onProgress,
      onResult,
      run: async () => {
        const payload = parsed.playlist
          ? { action: "addToPlaylist", trackId: track.id, playlistName: parsed.playlist }
          : { action: "like", trackId: track.id };
        return bgCallSpotifyFunction("spotify-add-track", payload);
      },
    });

    const artistStr = track.artists?.length ? ` by ${track.artists.join(", ")}` : "";
    return `Added **${track.name}**${artistStr} to **${destination}** on Spotify.`;
  }

  if (parsed.adapter === "google-docs" && parsed.intent === "researchArticle") {
    const draft = await bgRunAdapterStep({
      history,
      description: `Research "${parsed.topic}" on the live web`,
      type: "web_search",
      onProgress,
      onResult,
      run: async () => {
        const article = await bgBuildArticleDraftFromSearch(parsed.topic);
        return { success: true, ...article };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: "Open a fresh Google Doc",
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: "https://docs.new",
          description: "Open a fresh Google Doc",
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 8000);
          await bgDelay(1800);
        }
        return result;
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: "Write the article into the Google Doc body",
      type: "googleDocsWriteArticle",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "googleDocsWriteArticle",
        title: draft.title,
        body: draft.body,
      }),
    });

    return `Drafted an article about **${parsed.topic}** in a Google Doc.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "search") {
    if (siteContext?.site !== "gmail") {
      await bgRunAdapterStep({
        history,
        description: "Open Gmail",
        type: "navigate",
        onProgress,
        onResult,
        run: async () => {
          const result = await bgExecuteAgentAction(tabId, {
            type: "navigate",
            url: "https://mail.google.com/mail/u/0/#inbox",
            description: "Open Gmail",
          });
          if (!result?.error) {
            await bgWaitForTabReady(tabId, 8000);
            await bgDelay(1800);
          }
          return result;
        },
      });
    }

    await bgRunAdapterStep({
      history,
      description: `Search Gmail for "${parsed.query}"`,
      type: "gmailSearch",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailSearch",
        query: parsed.query,
      }),
    });

    return `Searched Gmail for **${parsed.query}**.`;
  }

  if (parsed.adapter === "gmail" && (parsed.intent === "draftEmail" || parsed.intent === "sendEmail")) {
    const composeUrl = bgBuildGmailComposeUrl({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
    });

    await bgRunAdapterStep({
      history,
      description: `Open Gmail compose for ${parsed.to}`,
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: composeUrl,
          description: `Open Gmail compose for ${parsed.to}`,
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 8000);
          await bgDelay(1800);
        }
        return result;
      },
    });

    await bgRunAdapterStep({
      history,
      description: "Verify Gmail compose fields",
      type: "gmailFillCompose",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailFillCompose",
        to: parsed.to,
        subject: parsed.subject || "",
        body: parsed.body,
      }),
    });

    if (parsed.intent === "sendEmail") {
      if (shouldStop?.()) throw new Error("Stopped.");
      await bgRunAdapterStep({
        history,
        description: "Send the Gmail message",
        type: "gmailSendOpenCompose",
        onProgress,
        onResult,
        run: () => bgExecuteSiteAdapterAction(tabId, {
          type: "gmailSendOpenCompose",
        }),
      });
      return `Sent the email to **${parsed.to}**.`;
    }

    return `Drafted an email to **${parsed.to}** in Gmail.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "replyCurrentThread") {
    if (siteContext?.site !== "gmail") {
      return "Open the Gmail thread you want first, then ask me to reply and I’ll use the Gmail adapter.";
    }

    await bgRunAdapterStep({
      history,
      description: parsed.send ? "Reply in the current Gmail thread and send" : "Draft a reply in the current Gmail thread",
      type: "gmailReplyToCurrentThread",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailReplyToCurrentThread",
        body: parsed.body,
        send: !!parsed.send,
      }),
    });

    return parsed.send
      ? "Replied to the current Gmail thread."
      : "Drafted a reply in the current Gmail thread.";
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "search") {
    const result = await bgRunAdapterStep({
      history,
      description: `Search Google Drive for "${parsed.query}"`,
      type: "googleDriveSearch",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-search", {
        query: parsed.query,
        folderOnly: !!parsed.folderOnly,
      }),
    });

    const results = Array.isArray(result?.results) ? result.results : [];
    if (!results.length) {
      return `I searched Google Drive for **${parsed.query}** but didn’t find any matching ${parsed.folderOnly ? "folders" : "files"}.`;
    }

    const summary = results.slice(0, 3).map((item) => `- ${item.name} (${item.kind})`).join("\n");
    return `I found these matches in Google Drive for **${parsed.query}**:\n${summary}`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "organize") {
    const filesResult = await bgRunAdapterStep({
      history,
      description: "Read your Google Drive files",
      type: "googleDriveListFiles",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-list-files", { pageSize: 250 }),
    });

    const files = Array.isArray(filesResult?.files) ? filesResult.files : [];
    if (!files.length) {
      return "I couldn't see any Google Drive files to organize. Reconnect Drive with the latest permissions and try again.";
    }

    const planDraft = await bgRunAdapterStep({
      history,
      description: "Plan folders and file moves with AI",
      type: "googleDriveOrganizePlan",
      onProgress,
      onResult,
      run: async () => {
        const plan = await bgBuildDriveOrganizationPlan(files);
        return { success: true, ...plan };
      },
    });

    const plan = bgValidateDriveOrganizationPlan(files, planDraft);
    if (!plan.moves.length) {
      return `I scanned **${files.length}** Google Drive files, but there was nothing clear to reorganize.`;
    }

    const result = await bgRunAdapterStep({
      history,
      description: "Create folders and move files in Google Drive",
      type: "googleDriveOrganizeApply",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-organize-apply", { plan }),
    });

    return `Organized your Google Drive: scanned **${files.length}** files, created **${result?.createdFolderCount || 0}** folders, and moved **${result?.movedCount || 0}** files.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createFolder") {
    const result = await bgRunAdapterStep({
      history,
      description: `Create the Google Drive folder "${parsed.folderName}"`,
      type: "googleDriveCreateFolder",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-create-folder", {
        folderName: parsed.folderName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Drive folder **${result?.name || parsed.folderName}**.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createDoc") {
    const result = await bgRunAdapterStep({
      history,
      description: `Create the Google Doc "${parsed.docName}" in Drive`,
      type: "googleDriveCreateDoc",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-create-doc", {
        docName: parsed.docName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Doc **${result?.name || parsed.docName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "rename") {
    const result = await bgRunAdapterStep({
      history,
      description: `Rename "${parsed.currentName}" to "${parsed.newName}" in Drive`,
      type: "googleDriveRename",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-rename", {
        currentName: parsed.currentName,
        newName: parsed.newName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Renamed **${result?.oldName || parsed.currentName}** to **${result?.name || parsed.newName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "move") {
    const result = await bgRunAdapterStep({
      history,
      description: `Move "${parsed.itemName}" to "${parsed.destinationFolderName}" in Drive`,
      type: "googleDriveMove",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-move", {
        itemName: parsed.itemName,
        destinationFolderName: parsed.destinationFolderName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Moved **${result?.name || parsed.itemName}** to **${result?.destinationFolderName || parsed.destinationFolderName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "delete") {
    const result = await bgRunAdapterStep({
      history,
      description: `Delete "${parsed.itemName}" from Drive`,
      type: "googleDriveDelete",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-delete", {
        itemName: parsed.itemName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Deleted **${result?.name || parsed.itemName}** from Drive.`;
  }

  return null;
}

function bgTryFastPath(task, history) {
  if (history.length > 0) return null;
  const t = task.toLowerCase().trim();
  if (/^(?:open|go to)\s+gmail\b/i.test(task)) {
    return [{ type: "navigate", url: "https://mail.google.com/mail/u/0/#inbox", description: "Open Gmail" }];
  }
  if (/^(?:open|go to)\s+(?:google\s+)?drive\b/i.test(task)) {
    return [{ type: "navigate", url: "https://drive.google.com", description: "Open Google Drive" }];
  }
  if (/^(?:open|go to)\s+(?:google\s+)?calendar\b/i.test(task)) {
    return [{ type: "navigate", url: "https://calendar.google.com/calendar/u/0/r", description: "Open Google Calendar" }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google doc\b|^(?:new|open)\s+docs\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://docs.new", description: "Open a new Google Doc" }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google sheet\b|^(?:new|open)\s+sheets\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://sheets.new", description: "Open a new Google Sheet" }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google slide\b|^(?:new|open)\s+slides\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://slides.new", description: "Open a new Google Slide deck" }];
  }
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
  const spotifyMatch = t.match(/search\s+(.+?)\s+on\s+spotify/i) || t.match(/spotify\s+search\s+(.+)/i);
  if (spotifyMatch) {
    const query = (spotifyMatch[1] || spotifyMatch[2] || "").trim();
    const q = encodeURIComponent(query);
    return [{ type: "navigate", url: `https://open.spotify.com/search/${q}`, description: `Search Spotify for "${query}"` }];
  }
  const netflixMatch = t.match(/search\s+(.+?)\s+on\s+netflix/i) || t.match(/netflix\s+search\s+(.+)/i);
  if (netflixMatch) {
    const query = (netflixMatch[1] || netflixMatch[2] || "").trim();
    const q = encodeURIComponent(query);
    return [{ type: "navigate", url: `https://www.netflix.com/search?q=${q}`, description: `Search Netflix for "${query}"` }];
  }
  const mapDirectionsMatch = t.match(/(?:directions|route)\s+from\s+(.+?)\s+to\s+(.+)/i);
  if (mapDirectionsMatch) {
    const origin = encodeURIComponent(mapDirectionsMatch[1].trim());
    const destination = encodeURIComponent(mapDirectionsMatch[2].trim());
    return [{
      type: "navigate",
      url: `https://www.google.com/maps/dir/${origin}/${destination}`,
      description: `Open directions from "${mapDirectionsMatch[1].trim()}" to "${mapDirectionsMatch[2].trim()}"`,
    }];
  }
  const mapsSearchMatch = t.match(/(?:search|find|look up)\s+(.+?)\s+on\s+(?:google\s+)?maps/i);
  if (mapsSearchMatch) {
    const query = encodeURIComponent(mapsSearchMatch[1].trim());
    return [{
      type: "navigate",
      url: `https://www.google.com/maps/search/${query}`,
      description: `Search Google Maps for "${mapsSearchMatch[1].trim()}"`,
    }];
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

  const agentSystemPrompt = `You are Braino Browser Agent. Automate a real Chrome browser by returning JSON actions.
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
    response = await bgChatFetch(fetchBody);
  } catch (e) {
    if (e instanceof TypeError) {
      // Service worker woke cold — wait and retry once
      await new Promise(r => setTimeout(r, 1200));
      response = await bgChatFetch(fetchBody);
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
    const res = await bgChatFetch({ notes: systemPrompt, message: userPrompt });
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
    const res = await bgChatFetch({ notes: systemPrompt, message: userPrompt });
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

  try {
    const adapterMessage = await bgTryHandleSiteAdapterTask({
      tabId,
      task: cmd.task,
      history,
      onProgress: null,
      onResult: async ({ description, result }) => {
        steps.push({ description, ok: !result?.error });
        bgUpdateRemoteCommand(cmd.id, token, { steps });
      },
      shouldStop: () => false,
    });
    if (adapterMessage) {
      await finish("done", adapterMessage);
      return;
    }
  } catch (e) {
    await finish("error", `Error: ${e.message}`);
    return;
  }

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

async function bgResolvePremiumStatus(options = {}) {
  const now = Date.now();
  const data = await bgGetStorage([
    "authToken",
    "authRefreshToken",
    "authUserId",
    "authEmail",
    "isPremium",
    "isPremiumCachedAt",
  ]);

  if (bgIsInternalPremiumEmail(data.authEmail)) {
    await bgSetStorage({ isPremium: true, isPremiumCachedAt: now });
    return { ok: true, isPremium: true, source: "internal" };
  }

  const hasFreshPositiveCache =
    !options.forceRefresh &&
    data.isPremium === true &&
    data.isPremiumCachedAt &&
    now - data.isPremiumCachedAt < BG_PREMIUM_CACHE_MS;

  if (hasFreshPositiveCache) {
    return { ok: true, isPremium: true, source: "cache" };
  }

  if (!data.authUserId) {
    await bgSetStorage({ isPremium: false, isPremiumCachedAt: now });
    return { ok: true, isPremium: false, source: "missing-user" };
  }

  let token = data.authToken;
  const fetchPremium = async (accessToken) => fetch(
    `${BG_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(data.authUserId)}&select=is_premium&limit=1`,
    { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } },
  );

  try {
    let res = token ? await fetchPremium(token) : null;
    if (!res || res.status === 401) {
      token = data.authRefreshToken ? await bgRefreshAuthToken() : null;
      res = token ? await fetchPremium(token) : null;
    }

    if (!res || !res.ok) {
      throw new Error(`Premium lookup failed: ${res?.status || "no-token"}`);
    }

    const rows = await res.json();
    const isPremium = rows?.[0]?.is_premium === true;
    await bgSetStorage({ isPremium, isPremiumCachedAt: now });
    return { ok: true, isPremium, source: "profile" };
  } catch (error) {
    return {
      ok: false,
      isPremium: data.isPremium === true,
      source: "fallback",
      error: error?.message || String(error),
    };
  }
}

// --- polling ---

async function bgPollRemoteCommands() {
  if (!navigator.onLine) return; // skip silently when offline
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
    // Expected on network loss — warn only so Chrome error panel stays clean
    console.warn("[BgRemoteAgent] Error:", e.message || e);
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
// Delay startup connections — gives the service worker time to settle
// and avoids flooding the Chrome error panel on a cold start with a flaky network
setTimeout(() => {
  bgPollRemoteCommands();
  bgStartRealtime();
}, 2000);

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
  if (message.action === "syncSpotifyPlayerState") {
    (async () => {
      try {
        if (!sender?.tab?.id) { sendResponse({}); return; }
        await bgPushSpotifyPlaybackState(sender.tab.id, {}, { focusSpotify: false });
        sendResponse({ ok: true });
      } catch (_) { sendResponse({ ok: false }); }
    })();
    return true;
  }
  if (message.action === "spotifyControl") {
    (async () => {
      try {
        await bgCallSpotifyFunction("spotify-playback", { action: message.control });
        if (sender?.tab?.id) {
          await bgPushSpotifyPlaybackState(sender.tab.id, {
            assumePlaying: message.control !== "pause",
          }, { focusSpotify: false });
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
  if (message.action === "playBrainoFavoriteSong") {
    (async () => {
      try {
        await bgPlaySpotifyWithAutoOpen([BG_BRAINO_FAVORITE_SONG_URI]);
        sendResponse({ ok: true });
      } catch (e) {
        const msg = e?.message || "favorite song failed";
        console.warn("[Braino][Spotify][BG] Favorite song failed:", msg);
        sendResponse({ ok: false, error: msg });
      }
    })();
    return true;
  }
});

function storeAuthData(data) {
  const isInternalPremium = bgIsInternalPremiumEmail(data.email);
  chrome.storage.local.set({
    authToken: data.token,
    authRefreshToken: data.refreshToken,
    authDisplayName: data.displayName,
    authEmail: data.email,
    authUserId: data.userId,
    ...(isInternalPremium ? { isPremium: true, isPremiumCachedAt: Date.now() } : {}),
  });
  // Auto-close the auth tab opened by the extension
  chrome.storage.local.get("__sbAuthTabId", ({ __sbAuthTabId }) => {
    if (typeof __sbAuthTabId === "number") {
      chrome.tabs.remove(__sbAuthTabId, () => { void chrome.runtime.lastError; });
      chrome.storage.local.remove("__sbAuthTabId");
    }
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

  const syncRes = await fetch(`${BG_API_BASE}/sync-to-notion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stored.authToken}`,
      apikey: BG_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ userIdentifier: stored.authUserId, title: title || "Lecture Notes", markdown }),
  });
  const syncJson = await syncRes.json().catch(() => ({}));
  if (!syncRes.ok) {
    const msg = syncJson.error || "";
    if (syncRes.status === 401 || msg.toLowerCase().includes("not connected")) return { error: "not_connected" };
    return { error: msg || "Notion sync failed" };
  }
  return { success: true, url: syncJson.url };
}
