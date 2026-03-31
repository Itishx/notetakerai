

## Interactive Chat, History Tab, and Image-to-Notes

### What's changing

1. **History moves to a sliding sidebar** — "Previous Notes" leaves the main view. A clock/history icon appears in the header next to "+". Clicking it slides in an overlay listing all past notes. Clicking a note loads it and closes the sidebar.

2. **AI Chat below notes** — Below the notes and copy buttons, a chat thread appears with an input bar: "Ask about these notes..." Messages persist per session in `chrome.storage.local`. The AI receives the current notes as context and answers questions.

3. **Image paste in chat** — Users can paste/drop screenshots into the chat input. The image is sent to the AI along with the notes. The AI returns updated notes with the image embedded as a base64 `<img>` tag at the contextually appropriate location. The notes panel re-renders with the image inline.

### Architecture

```text
Header: [Logo] [LectureSnap]         [History ☰] [+ New]

Main view:
  [Status bar] [Timer] [Segment count]
  [Record / Continue / Stop buttons]
  [Convert to Notes]
  [Loading spinner]
  [Your Notes — rendered markdown with inline images]
  [Copy Markdown | Copy for Notion]
  ─── Chat ───
  [AI bubble] [User bubble] [AI bubble]...
  [📎 image preview]
  [Input: "Ask about these notes..." | 📎 | Send]

History overlay (slides from left):
  [← Back] [All Notes]
  [Note 1] [Note 2] ...
  [Clear All]
```

### Technical Details

**New edge function: `supabase/functions/chat-about-notes/index.ts`**
- Accepts `{ notes, chatHistory, message, imageBase64? }`
- Uses Lovable AI (Gemini 2.5 Flash) with notes as system context
- When image is included: sends multimodal content, instructs AI to return the full updated notes markdown with the image embedded as `![description](data:image/png;base64,...)` at the right location
- Returns `{ reply, updatedNotes? }` — `updatedNotes` only present when an image was processed

**Modified: `extension/sidepanel.html`**
- Remove `historySection` div from main flow
- Add history overlay div (absolute positioned, slides in/out)
- Add history icon button in header
- Add chat container below notes: message list + input bar with image attach button
- Add hidden file input for image selection

**Modified: `extension/popup.js`**
- History overlay toggle logic (open/close)
- `loadHistory()` renders into the overlay instead of main view
- Chat state: `chatMessages` array per `currentSessionId`, persisted in `chrome.storage.local`
- `sendChatMessage(text, imageBase64?)` — calls `chat-about-notes` edge function, appends user+AI messages, re-renders chat
- If response includes `updatedNotes`, update `notesMarkdown` and re-render notes panel + save to history
- Paste event listener on chat input to capture clipboard images → convert to base64
- Image attach button triggers file input → convert to base64
- `renderMarkdown()` updated to handle `![alt](data:...)` image syntax → `<img>` tags

**Modified: `extension/styles.css`**
- History overlay: full-height, slides from left, semi-transparent backdrop
- Chat container: flex column, scrollable message list
- Chat bubbles: user (right-aligned, green bg) and AI (left-aligned, card bg)
- Chat input bar: fixed at bottom of chat area, with attach icon
- Image thumbnails in chat messages
- Markdown images in notes: max-width 100%, rounded corners

**Repackage: `public/lecturesnap-extension.zip`**

### Steps

1. Create `supabase/functions/chat-about-notes/index.ts`
2. Update `extension/sidepanel.html` — history overlay + chat UI
3. Update `extension/popup.js` — history sidebar, chat logic, image handling
4. Update `extension/styles.css` — new component styles
5. Update `renderMarkdown()` to support image syntax
6. Repackage extension ZIP

