// SideBrain Content Script — extracts page text for AI context
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractPageContent") {
    const text = (document.body?.innerText || "").substring(0, 12000);
    const title = document.title || "";
    const url = window.location.href || "";
    sendResponse({ text, title, url });
  }
  return true;
});

// ===== AUTH RELAY =====
// When the user logs in on the website auth page, the page stores auth data
// in a hidden DOM element. This content script reads it and relays to background.js
// via internal messaging (much more reliable than onMessageExternal).
(function authRelay() {
  // Only run on the auth/extension page
  if (!window.location.pathname.includes("/auth/extension")) return;

  function tryReadAuthData() {
    const el = document.getElementById("sidebrain-auth-data");
    if (!el) return false;
    try {
      const data = JSON.parse(el.textContent || "");
      if (data && data.token) {
        chrome.runtime.sendMessage({
          action: "authTokenRelay",
          token: data.token,
          refreshToken: data.refreshToken,
          displayName: data.displayName,
          email: data.email,
          userId: data.userId,
        });
        return true;
      }
    } catch (e) { /* ignore parse errors */ }
    return false;
  }

  // Poll for the auth data element (it appears after login)
  if (!tryReadAuthData()) {
    const observer = new MutationObserver(() => {
      if (tryReadAuthData()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Also poll as backup
    const interval = setInterval(() => {
      if (tryReadAuthData()) {
        clearInterval(interval);
      }
    }, 500);
    // Stop after 5 minutes
    setTimeout(() => { observer.disconnect(); clearInterval(interval); }, 300000);
  }
})();
