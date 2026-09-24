# Contacts, In Settings

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-24

## The simple version

Open the Braino dashboard, go to Settings and pick **Contacts**. You'll see everyone Braino can call, text or email, straight from your Mac's address book. **Sync contacts** reads it again right away. Search works by name, nickname, number or email.

## Why it exists

Braino already read your address book, all 408 people, in about 9 milliseconds, every time the app launched. You just couldn't see it, so there was no way to check whether he knew someone before asking him to call them.

## How to use it

1. Open the dashboard and go to **Settings**, then **Contacts**.
2. Press **Sync contacts** after you add someone on your phone or Mac.
3. Type in the box to find someone.

## What Braino knows or does

- Shows every contact he holds: name, nickname, company, their main number, and how many numbers they have.
- Syncs on demand, straight from the macOS address book database.
- Shows the count and when it last synced.
- Uses the same list for "call", "FaceTime", "WhatsApp" and "text", matched by sound, so "Iloo" finds Ilu.

## Honest limitations

- **Mac address book only.** Google contacts that aren't synced into macOS Contacts won't show up.
- **Needs Contacts access** in System Settings → Privacy & Security. Without it, sync says so.
- **Shows up to 500 at a time.** Search to find anyone further down.
- **Not tested in the running app yet.** It's checked in code only.

## Technical shape

- `mac/braino-mac/renderer/dashboard.html` and `dashboard.js`: the `contacts` view and chip under Settings, plus `loadContacts` and `renderContacts`.
- `mac/braino-mac/preload.cjs`: `contactsList` and `contactsSync`.
- `mac/braino-mac/main.cjs`: `braino-mac:contacts-list` and `braino-mac:contacts-sync`, built on `importAllContacts` (read-only SQLite on `AddressBook-v22.abcddb`, with AppleScript as the fallback) and `contactsCache`.
