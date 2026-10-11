# Google Calendar on the Mac, and where every integration really stands

**Type:** Feature / Technical audit
**Platform:** Braino for Mac
**Status:** MVP (calendar tools live in HIL; audit as of October 11, 2026)
**Released:** October 11, 2026

## The simple version

"Create an instant Google Meet" or "what's on tomorrow" is now one call to Google Calendar, about two seconds, and the Meet link is copied for you. Before, the Mac had no calendar tool at all: it opened Calendar's website and clicked around, failed three times and took over a minute. The extension had a real Calendar connection for months; it had simply never been brought to the Mac.

If your calendar isn't connected, Braino says so once and opens the Google sign in.

## How to use it

- "Create an instant Google Meet." / "A Meet called design review at 5."
- "What's on my calendar today / tomorrow / this week?"
- "Move my design review to 6." / "Cancel the design review." (asks first: attendees are told)
- "Join my next meeting."

## Where every integration stands (the /connectors-vault list)

| Integration | Server | Chrome extension | Mac (HIL tools) |
|---|---|---|---|
| Google Calendar | Built (create, move, cancel, list, next Meet, reminders) | Yes | **Yes, as of today** |
| Google Docs | Built | Yes | Yes: create a doc with text |
| Google Drive | Built (search, list, move, rename, organise, delete) | Yes | Partly: only "create a doc"; search, move and organise are not on the Mac |
| Gmail | No server API | Yes, in the open Gmail tab | Partly: reply to the open Gmail thread; new mail goes through Apple Mail |
| Spotify | Built | Yes | Yes (play, queue, like, playlists) |
| Notion | Built (connect, sync) | A little | Yes: create a page |
| X | Built (BrainoX queue and posting) | Some | Partly: stage a screen clip with a caption |
| GitHub | Server only (Dev Pulse journal) | No | No |
| Slack | Not built | No | No |
| Outlook / Microsoft | Not built | No | No |
| Asana / Jira / ClickUp / Linear / Trello | Not built | No | No |
| Stripe / Shopify | Not built | No | No |
| Discord / n8n / Zoom / Canva / Airtable | Not built | No | No |

The page lists 13; 7 are real somewhere, 6 exist only on the page.

## Honest limitations

- A meeting with a named person ("with Riya") goes to the loop, because Braino has no email for her yet; it still books through the API, a few seconds slower.
- Not run live end to end on the Mac yet; the router picks the tools correctly (checked live).
- Drive search, move and organise exist on the server but are not on the Mac.

## Technical shape

- `mac/braino-mac/main.cjs`: `macCalendar(action, body)` calls `functions/v1/google-calendar-action`; `calendarCreateEvent`, `calendarListEvents`, `calendarRescheduleEvent`, `calendarCancelEvent`, `calendarJoinNextMeet`; `startGoogleCalendarConnect` on "not connected".
- `hil-tool-catalog.ts`: `calendar_create`, `calendar_list`, `calendar_reschedule`, `calendar_cancel` (irreversible), `calendar_join_next`.
- `use-cases.ts` 1.2.0: lesson 5, meetings through the calendar tools, never Calendar's website.
- Also today: `macEnglishish` widens the misheard guard ("read out Ilu's messages" was answered "Say it again?").
- Tests: `tests/mac-4am-run.test.mjs`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
