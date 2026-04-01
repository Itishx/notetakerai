

# SideBrain: Page-Aware AI Browser Companion

## Summary

Add a **content script** that extracts the current page's text and sends it to the sidepanel. The AI chat becomes dual-mode: it works with **notes** (when you've recorded/generated them) AND with **page context** (always available). Users can ask questions about any webpage — LeetCode, blogs, docs, articles — directly from the sidepanel.

## What Changes

1. **Always-visible chat**: The chat section is no longer hidden behind "Convert to Notes." It's always shown at the bottom of the sidepanel. When notes exist, AI uses both page context + notes. When no notes exist, AI uses page context only.

2. **Content script** (`extension/content.js`): Injected into every page, extracts `document.body.innerText` (trimmed to ~12K chars) and sends it to the sidepanel on demand via `chrome.runtime.sendMessage`.

3. **Background relay**: `background.js` gets a new `getPageContent` action — it injects/messages the content script on the active tab and relays the extracted text back to the sidepanel.

4. **Updated manifest**: Adds `content.js` as a content script matching `<all_urls>`, and adds `scripting` permission for programmatic injection fallback.

5. **Chat edge function update**: `chat-about-notes` accepts an optional `pageContext` field. When present, the system prompt includes the page text so the AI can answer questions about it.

6. **UI changes in sidepanel**:
   - Chat section always visible (remove the `hidden` class dependency on notes)
   - Chat placeholder changes contextually: "Ask about this page..." vs "Ask about your notes..."
   - A small badge/indicator shows what context is active (page name / notes)
   - The chat divider text updates to reflect mode

## Technical Details

### New file: `extension/content.js`
```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractPageContent") {
    const text = document.body.innerText.substring(0, 12000);
    const title = document.title;
    const url = window.location.href;
    sendResponse({ text, title, url });
  }
  return true;
});
```

### `extension/manifest.json` changes
- Add `"scripting"` to permissions
- Add content_scripts block:
```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content.js"],
  "run_at": "document_idle"
}]
```

### `extension/background.js` changes
- Add handler for `getPageContent` message that uses `chrome.tabs.sendMessage` to the active tab's content script and relays the response.

### `extension/popup.js` changes
- On load and on tab change, fetch page context via `chrome.runtime.sendMessage({ action: "getPageContent" })`
- Store `currentPageContext = { title, url, text }` in memory
- Make chat section always visible (remove the notes-only gate)
- Update `sendChatMessage()` to include `pageContext` in the request body
- Update chat placeholder text based on available context

### `supabase/functions/chat-about-notes/index.ts` changes
- Accept optional `pageContext` (object with `title`, `url`, `text`)
- When present (and no image), prepend page context to system prompt:
  ```
  The user is currently viewing: "${title}" (${url})
  Page content:
  ${text}
  ```
- When both notes and page context exist, include both in the system prompt

### `extension/sidepanel.html` changes
- Remove `hidden` from `chatSection` initial state
- Update chat divider to show dynamic context indicator
- Update footer text to "Works on any webpage"

### Build
- Add `content.js` to build script copy list
- Rebuild extension ZIP

