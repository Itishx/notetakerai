# The Braino App, Redesigned

**Type:** Design decision  
**Platform:** Braino for Mac (the app window)  
**Status:** MVP  
**Released:** 2026-10-18

## The simple version

The Braino window now looks like the rest of Affective and reads like Claude's desktop app: warm paper, black ink, hairline borders, Iowan Old Style headings, SF Pro for everything else. The sidebar is a plain list you can fold away. Chat has its own page listing every conversation.

## Why it exists

The old window was square glass tiles and heavy cards. Chat felt cramped, and the list of chats that unfolded under Chat in the sidebar could not be closed again.

## How to use it

- Double-click Braino to open the window.
- The sidebar button next to the traffic lights (or Cmd+\) hides and shows the sidebar. It remembers your choice.
- Click Chat: you see all your chats. Click one to open it, Back to return, New chat to start fresh.

## What Braino knows or does

- Remembers sidebar open or closed on this Mac.
- Lists chats newest first with a title and a time, with search.
- Every settings page (General, Permissions, Shortcuts, Privacy and the rest) uses the same calm rows.

## Honest limitations

- Chats live in this Mac's local storage only, as before.
- Light look only. Dark is not built.
- Some older pages (Home stats, People grid) keep their card layout, restyled rather than redesigned.

## Technical shape

- `mac/braino-mac/renderer/app.html`: sidebar toggle button and a top drag strip; `body.app` scopes the new look.
- `mac/braino-mac/renderer/white.css`: the "Paper" section at the end overrides the older glass rules in `app.css` and `chat.css`. Set him up (setup.html) is untouched because every rule is scoped to `body.app`.
- `mac/braino-mac/renderer/app.js`: `chatsPage()` and `chatThread()` render the two chat views (`S.chatView`), `openChatView()` routes `data-chat` clicks (`list`, `new`, or a chat id), `setSide()` handles the sidebar with `localStorage` key `braino-app-side`. The old `chatSubNav()` dropdown was removed; that was the collapse bug, since clicking Chat only re-rendered it open.
- Chat storage and IPC are unchanged (`chat.js`, `braino-chats` in localStorage, `converse` and `delegate`).

## Product or design decisions

- Fully hidden sidebar instead of an icon rail, because the traffic lights take the first 78px and a rail would collide with them.
- Your messages stay plain and right aligned, no bubbles. His replies are in the serif at reading size.

## Public documentation checklist

- [x] Permanent page added under `/knowledge` (`/knowledge/mac-app-redesign`)
- [x] Entry added to `src/lib/brainoKnowledge.ts` (086)
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
