# Import Chrome Logins

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** October 23, 2026

## The simple version

Braino has his own browser on your Mac. It used to start signed out of everything. Now you say "import my Chrome logins", type your Mac password once, and his browser is signed in everywhere your Chrome is.

## Why it exists

Jobs Braino does for you, like booking, ordering and filling forms, run in his own browser. Every one of them hit a login wall first. Claude Cowork showed the fix: copy the sessions you already have.

## How to use it

- Say "import my Chrome logins". macOS asks for your password. Choose "Always Allow" so the next re-sync is silent.
- Say "sync my logins" any time to refresh them.
- Say "forget my logins" to sign his browser out of everything.

## What Braino knows or does

- Copies the cookies from the Chrome profile you last used into his own browser.
- Leaves your Chrome untouched. Logging out in one browser does not log you out in the other.
- Keeps everything on the Mac. Nothing is sent to our servers.

## Honest limitations

- It is a snapshot. Sessions expire, so he needs a re-sync now and then.
- Some sites, like Google and banks, may notice a new browser and ask you to sign in again.
- Passwords are not imported, only sessions.
- Only Chrome for now, and only one profile, the one you used last.

## Technical shape

- `mac/braino-mac/chrome-cookies.cjs` copies Chrome's cookie database to a temp folder, reads it with `sqlite3`, and decrypts values with the "Chrome Safe Storage" Keychain key (PBKDF2 then AES-128-CBC). From cookie database version 24, it strips the 32-byte host hash.
- Cookies are set into the `persist:braino-browser` Electron session, then flushed to disk.
- Voice commands live in `routeHilFirst` in `main.cjs`, next to "show me" and "hide it".
- The log events are `own_browser.cookie_import` and `own_browser.cookie_import_failed`.

## Product or design decisions

- Braino uses his own browser, not your Chrome. Newer Chrome blocks outside control of your main profile, and his own browser is faster to script.
- It runs only when you ask. It never syncs silently in the background.

## What comes next

- A one-click "Import from Chrome" button in settings.
- An automatic re-sync when a site says he is signed out.
- Picking a Chrome profile.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
