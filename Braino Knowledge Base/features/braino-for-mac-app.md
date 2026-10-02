# Braino for Mac (the app)

**Type:** Product · **Platform:** Braino for Mac · **Status:** MVP · **Released:** 2026-09-27

## The simple version
Double-click Braino and his app opens: one window for everything, laid out like System Settings. The categories are on the left as square glass tiles, and the panels are on the right. It's see-through, in AffectiveOS type: Iowan Old Style headlines, SF Pro text, and the Braino wordmark in Bodoni Moda.

At the top of the sidebar you switch between **Companion** (your day, library, school, people) and **Foundry** (Content, Optics, Outbound, Approvals, Braino Code, Ideas). **Braino**, **Connections** and **System** are the same in both.

It replaces the small double-click menu and the old dashboard window. ⌘⇧D opens it too.

## What's connected
- Home: greeting, next class, your people, recent commands with their times.
- Memory: both switches and today's summaries.
- School: Nexus state and Sync.
- People: important people and contacts.
- Appearance: character, size, where he stays, hide him.
- Voice: instant listening, talk out loud.
- Skills he learned: each one, and Forget.
- Chrome profiles: main profile and what each is for.
- Permissions: every one, with Fix.
- General: open at login, version.
- Also: Shortcuts, Privacy (delete today, pause memory), Set him up (progress and continue), Account.

## Honest limitations
- **Not built yet, so marked Coming soon:** Habits, Focus, Routines, Optics, Outbound, Approvals and Ideas. Nothing on those pages is made up.
- Notes, Braino Code, Commands and X automation still open the old full library from their page.
- The Dark and Light looks aren't built; the look is Glass for now.

## Technical shape
- `renderer/app.html`, `app.css` and `app.js`. The page definitions are `P`, and the sidebar is `NAV`.
- `openBrainoApp` in `main.cjs` uses the same glass window setup as Set him up.
- New calls: `app-open`, `app-recent` (reads `feature.executed` from the log), `skills-list` / `skills-forget`, `app-overlay` (passed on to the overlay, which applies it), `login-item`.
- Tests: `tests/mac-braino-app.test.mjs`. Every page was also checked in a browser with stand-in data.
