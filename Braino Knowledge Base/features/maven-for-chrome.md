# Maven for Chrome

**Type:** Product
**Platform:** Chrome extension (Windows and Mac)
**Status:** MVP
**Released:** October 29, 2026

## The simple version

Maven, inside Chrome. Press Control + Option on any web page, talk, press again, and your words land in the text box, cleaned up. Press Option + Command to ask for one small job.

## Why it exists

We couldn't make a Windows desktop app for Maven yet, so we made it for Chrome: if you're on Windows, the extension is Maven, built for you. Plenty of people live in the browser. The extension lets them try Maven in a minute, without installing a Mac app, and it reaches people the Mac app never can.

## How to use it

- Write: Control + Option (⌃⌥) on a Mac, Ctrl + Alt on Windows, press to start, press again to stop. No text box? It copies and shows the words in the pill.
- Do: Option + Command (⌥⌘) on a Mac, Alt + Windows key on Windows, or fn + Control where Chrome sees fn. "Open YouTube", "go to my Gmail tab", "tell Neha I'm running late" (WhatsApp Web, asks Which Neha? when there are two), "email Rahul the deck is done" (a Gmail draft), "draft a reply to this", "fill this form for me", "add milk to my grocery list", "remember Riya is R-I-Y-A", "what can you do?".
- Drag the pill to the left, centre or right. It stays there in every tab.
- Enter says yes to a card, Esc cancels.
- Onboarding page opens on install: Google sign-in, mic, shortcuts, details for forms, look, language, and a try-it box.

## Honest limitations

- Only inside Chrome web pages. Not Chrome's own pages (new tab, settings, the Web Store), not other Mac apps.
- WhatsApp Web sending depends on WhatsApp's page; when it changes, Maven copies the message and says it did not send.
- Gmail is a draft, never a send. Lists live in the extension, not Apple Notes.
- Long takes are a few seconds slower than the Mac app (one upload at the end instead of phases while you talk).
- Google sign-in is wired through the site, but the Mac app has no sign-in yet, so words and details are not shared between the two yet.

## Technical shape

- mac/maven/chrome/src (MV3). build.sh copies the Mac island (island.html/css/js) unchanged, wraps lib/dictation.cjs (safety gate) and lib/jobs.cjs (the job list), and writes ~/Desktop/Maven-for-Chrome.
- content.js: the island in a frame bottom-right, click-through except over the pill and card; hotkeys; writing at the cursor (setRangeText, insertText, a paste event for Google Docs); form fill; page reading; WhatsApp Web search and send. Runs in every frame so Docs hears the keys.
- island-shim.js: rebuilds the Mac's window.maven on postMessage; drag with pointer capture; forwards shortcuts when focus is inside the island.
- offscreen.js: the mic (webm/opus) and voice level. Mic permission granted once on the welcome page.
- background.js: transcribe-and-notes → dictation-refine (cleanup, intent, compose) → the gate; the card asking; sign-in relay from affctve.com/auth/extension.

## Status

MVP, version 1.0 packaged for the Chrome Web Store on October 29, 2026.
