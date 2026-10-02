# Chrome Profiles

**Type:** Feature · **Platform:** Braino for Mac · **Status:** MVP · **Released:** 2026-09-26

## The simple version
Braino reads every Chrome profile on your Mac (its name and the account signed in). Tell him once which is your main one and what the others are for, and links open in the right one. You can do this in **Set him up**, in **Settings → Chrome profiles**, or out loud:
- "Use my Mesa profile for Nexus and Mesa"
- "My main profile is Itish"
- "Switch to my Braino profile"
- "Which Chrome profiles do I have?"
- "You're in the wrong profile, it's my Itish profile"

## Why it exists
"You're in the wrong Chrome profile" cost 20 seconds of thinking on 2026-09-26, because he didn't know there was more than one.

## Honest limitations
- A rule matches words in the link ("nexus" matches nexus.mesaschool.co). Links with no rule open in whichever Chrome window is in front.
- He can't tell which profile a window already open belongs to; he opens the right profile's window instead.
- Two profiles with the same name: he picks the one whose email says it, else Chrome's first.

## Technical shape
- `mac/braino-mac/chrome-profiles.cjs`: `listProfiles` (from Chrome's Local State), `findProfile`, `profileForUrl`, `parseProfileIntent`.
- `main.cjs`: `chrome-profiles.json` in the settings folder, `openChromeProfile` (`open -na "Google Chrome" --args --profile-directory=…`), `openChromeUrl` follows the rules, voice intents in `routeHilFirst`.
- IPC: `braino-mac:chrome-profiles` / `-save`. Setup step `profiles`, and the Settings view `chrome`.
- Tests: `tests/mac-chrome-profiles.test.mjs`.
