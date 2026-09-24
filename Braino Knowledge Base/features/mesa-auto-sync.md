# Mesa, Synced Every Day

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-24

## The simple version

Connect Mesa once, with your Mesa email and password, and Braino keeps your timetable and assignments up to date by himself. He does it every day, in the background, with no Chrome tab opening. If your login expires, he tells you once and you reconnect in one tap.

## Why it exists

Braino read Nexus by borrowing your Chrome tab. On 18 September that login expired and nothing synced for six days, with no message. "What's due?" was answered from week-old data.

## How to use it

1. Open the dashboard, go to **Settings**, then **Mesa**, and click **Connect Mesa**.
2. Log in with your Mesa email and password in the window that opens. It closes by itself once you're in, and the first sync runs.
3. That's it. **Sync now** is there if you want it straight away, and "Braino, sync my timetable" works too.

## What Braino knows or does

- Syncs classes, assignments, exams and events from Nexus: the last 30 days and the next 120.
- Runs by himself when the app starts, every half hour while it's running, and when the Mac wakes or unlocks, but only if the last good sync is over 20 hours old. A failed try waits an hour before retrying.
- Uses his own saved Mesa login in a hidden window, so it never needs your Chrome.
- If the login expires: one Mac notification a day, and Settings shows "Not connected".
- Counts assignments that are new since the last sync.
- Settings, then Mesa, lists assignments due in the next 3 weeks, with overdue ones marked.
- A sync you ask for yourself falls back to your Chrome tab if his own session isn't connected. The automatic ones never touch Chrome.

## Honest limitations

- **Not tested live yet.** The Mesa login inside Braino's own window hasn't been tried on your Mac, and neither has the first automatic run.
- **Only runs while the Braino Mac app is running.** No server does this while the Mac is off.
- **Attendance, grades and courses aren't in the daily sync yet.** They still use the older Chrome-based "sync everything" tool.
- **How long a Mesa login lasts is unknown.** We'll find out from the first time it expires.
- **New assignments are counted but not yet spoken.** The morning greeting isn't built yet.

## Technical shape

- `mac/braino-mac/main.cjs`:
  - `MESA_PARTITION` (`persist:mesa-nexus`) is his own saved login.
  - `runInMesaSession` runs the sync script in a hidden window. `connectMesa` is the one-time login window, which checks the page is really past the login before it closes.
  - `syncScheduleFromNexus({ background })` tries his own session first. It falls back to Chrome only when you asked for the sync yourself.
  - `mesaAutoSyncIfDue` and `startMesaAutoSync` handle launch, the 30-minute timer, `powerMonitor` resume and unlock, and the 20-hour threshold.
  - `markMesaLoginExpired` sends the once-a-day notification.
  - State lives in `~/Library/Application Support/Braino Mac/mesa-sync.json`.
- The dashboard Settings → Mesa view and chip use the IPC handlers `braino-mac:mesa-state`, `braino-mac:mesa-connect` and `braino-mac:mesa-sync`.
- The log shows `📅 SYNC` lines in the terminal, plus `schedule.sync.done` (with `background`), `mesa.auto_sync`, `mesa.connected` and `mesa.login_expired`.
