# WhatsApp, Known Silently

**Type:** Feature
**Platform:** Braino for Mac, with the WhatsApp Mac app
**Status:** MVP
**Released:** 2026-09-24

## The simple version

Braino always knows who messaged you on WhatsApp and what they said, but he never reads messages out by himself. Messages from people you mark as **important** show quietly in the notch, with the text. Everyone else is remembered and not shown. Group chats never show. Ask "did Ilu message?" or "catch me up on WhatsApp" and he answers in a line.

## Why it exists

Braino learned about messages from Mac notifications. That missed everything while WhatsApp was open, during Focus, or with previews off. By default it read every message aloud, and it remembered nothing except who messaged last.

## How to use it

- **Mark someone important:** star them in Settings → Contacts, or say "Braino, mark Ilu as important". "Remove Ilu from important" undoes it. "Who are my important contacts?" lists them.
- **Ask:**
  - "Did Ilu message?"
  - "What did she say?"
  - "Who texted me in the last hour?"
  - "Catch me up on WhatsApp"
- **Reply:** "reply to Ilu: five minutes" sends through the Mac app.

## What Braino knows or does

- Every 3 seconds, reads new messages straight from the WhatsApp Mac app's own database on your Mac. It's read-only, so nothing gets marked as read.
- Never speaks a message on its own.
- Important people's one-to-one messages show in the notch for about 9 seconds, text included, then leave an unread dot. Groups never show.
- Photos, voice notes, stickers and documents come through as "sent a photo" and so on.
- The memory layer keeps **who and when**. The text isn't copied; it stays in WhatsApp's database and is read only when you ask.
- Answers cover the last 7 days unless you ask for longer. One-to-one chats only.

## Honest limitations

- **Not tested live yet.** The database reading and the lookup query were checked against the real WhatsApp database on this Mac (696 messages from 31 people in the last week), but the notch card and the voice answers haven't run in the app.
- **macOS may ask once** whether Braino can read another app's data.
- **Facts from important people's messages** ("Ilu's flight lands at 6") come with the memory digest (step 2). They aren't extracted yet.
- **Group questions aren't answered yet.** "What did FoundersCrew say?" isn't supported.
- **It depends on WhatsApp's database layout,** which isn't a public API. A WhatsApp update could change it.

## Technical shape

- `mac/braino-mac/main.cjs`:
  - `WA_DB_PATH` is `ChatStorage.sqlite` (tables `ZWAMESSAGE` and `ZWACHATSESSION`; session type 0 is one-to-one, 1 is a group).
  - `pollWhatsAppDb` runs every 3 seconds and starts from the latest message.
  - `waMessageFromRow` turns a database row into a message.
  - `lookupWhatsAppMessages` answers questions and is the `whatsapp_messages` tool.
  - `isWaImportant` and `setWaImportant` manage the list, saved in `whatsapp-important.json`.
  - The notification reader no longer speaks, and steps aside when the database is readable.
- The notch card is the `braino-mac:wa-card` event, shown through `nfShowTransient`.
- Dashboard: the stars on the Contacts page use the `braino-mac:wa-important` IPC handler.
- Catalog: `whatsapp_messages`, `HIL_CATALOG_VERSION` 1.10.0.
- Memory: `whatsapp` rows in the AffectiveOS Memory window.
