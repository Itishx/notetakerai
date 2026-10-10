# Meet Braino: setup, with him

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP (on the `onboarding-notch` branch, not merged)
**Released:** October 10, 2026

## The simple version

The first time you open Braino for Mac and sign in, a new onboarding opens by itself. It is a story, told in Braino's voice, one sentence per scene, lit word by word as he says it, in the Affective homepage style.

1. Welcome to AffectiveOS: a computer that finally understands you.
2. Meet Braino: he lives in your notch.
3. What is new: not an app you open, someone already there.
4. Meetings, your day, your people, and "say it, it's done": one scene each, with a picture of it working.
5. Make him yours: your name and what you do.
6. Trust: four permissions, each tied to a scene you just saw, turning green the moment you allow it.
7. Your first moment: press Control twice and talk to him.
8. Nice to meet you: what he now knows about you.

It uses the Affective homepage's design system: Iowan Old Style headlines with the key word underlined, SF Pro text, the warm page, pill buttons, and the homepage's pixel art in framed pictures.

While you sign in, the notch says "Sign in on the page that opened" instead of holding the Affective logo. During onboarding Braino stays in the notch with his eyes open (before, he jumped out to a spot on screen and the notch looked empty).

After that the app opens on a white home page with your real numbers.

(History, 10 Oct: a first version mirrored each line into the notch and had Braino walking around the window with a speech bubble. Both were removed: the notch text was cramped and the walking Braino was invisible on white.)

## Why it exists

Before this, a brand new person signed in and then nothing happened. The welcome only played on the next launch. The old first run also covered the whole screen, and once that cover locked someone's Mac until a restart. And permissions were a list of "Fix" buttons that opened System Settings and left you to guess.

The goal is the job behind setup: by the time you finish, you should already like him. So he introduces himself first, earns each question, and ends with you talking to him, not with a form.

## How to use it

- New Mac, new account: open Braino, sign in, and setup starts by itself.
- Closed it halfway? He says "Double click me to finish setting up", and offers it again next launch.
- Open it any time from his menu: Set him up.
- To see it as a new person would: quit Braino, run `npm run mac:fresh`, then `npm run mac:dev`. Add `-- --permissions` to reset the macOS permissions too. Run `npm run mac:fresh -- --restore` to get your real Braino back.

## What Braino knows or does

- Starts setup right after a first sign in, and at launch if you never finished.
- Mirrors each step's line into the notch, so you always know where he lives.
- Allow on Microphone shows the real macOS prompt. Allow on Accessibility shows macOS's own prompt. Screen Recording and Contacts register Braino and open the exact setting.
- Checks the permissions every second while you are on that step, turns each row green, and says what it lets him do ("Now I can hear you").
- "Try me" waits for the first real thing you say to him, and shows your words and his reply.
- Everything you tell him is saved as memory he keeps (unchanged from the old setup).
- One step at a time, full width. His notebook (everything he learned) only appears at the end, as the summary beside "Nice to meet you".
- The setup window and the app use the website's warm white and its hero type: Iowan Old Style for every headline, SF Pro for the rest. (Bodoni was tried on 10 Oct and dropped, same as on the site.)
- His eyes open even if the first sign in takes longer than 45 seconds. Before, a slow sign in left the boot marked failed.

## Honest limitations

- Not run end to end on a fresh Mac yet. The automated checks pass; the real test is `npm run mac:fresh -- --permissions`.
- There is no downloadable app (.dmg) yet. Nothing in the repo packages or signs Braino for Mac, so "test it like a real user" still means the dev app with its saved state moved aside. The dev app is Electron, so macOS shows "Electron" in the permission prompts, not "Braino".
- Screen Recording and Contacts cannot show an in-app prompt the way the microphone can; they still open System Settings.
- The website half (simple sign in, then a download page) is not built in this change.
- The old full-screen first run still exists behind `BRAINO_OLD_FIRST_RUN=1`, so we can compare. It should be deleted once this one is verified.

## Technical shape

- `mac/braino-mac/main.cjs`: `maybeStartSetup(why)` runs after `auth.callback.ok` and 9s after startup; it says hello in the notch, then calls `openSetupWindow()`. New IPC: `braino-mac:setup-notch` (line to the notch), `braino-mac:setup-ask` (real permission prompts, falling back to the exact pane), `braino-mac:setup-permissions` (fresh check). `logInteraction` forwards each real exchange to the setup window as `braino-mac:setup-heard`. The setup and app windows are opaque white now, with no Liquid Glass. When setup closes finished, the app opens on Home. `get-config.firstRun` only turns on with `BRAINO_OLD_FIRST_RUN=1`.
- `mac/braino-mac/preload.cjs`: `setupNotch`, `setupAsk`, `setupPermissions`, `onSetupHeard`, `onSetupNotch`.
- `mac/braino-mac/renderer/braino-mac.js`: `onSetupNotch` shows the line with `nfShowTransient`, inside the notch, with no new surface.
- `mac/braino-mac/renderer/onboard.html|css|js`: the new onboarding, written from scratch (`SCENES` array, word lighting, voice through `setupSay`, live permissions, Try me, summary). `SETUP_VIEW_PATH` points here; the old `setup.html` is still on disk until this is verified.
- `showOnThisSpace()` in main.cjs: the setup and app windows open on the Space you are looking at, not Cursor's full screen.
- `mac/braino-mac/renderer/white.css`: loaded last by `setup.html` and `app.html`; remove that one line to get the dark glass back.
- `mac/braino-mac/renderer/app.js`: Home is now a stats board built from `appActivity`, memories and skills, and the app opens on it once setup is done.
- `scripts/mac-fresh-start.mjs` (`npm run mac:fresh`): moves `~/Library/Application Support/Braino Mac` to `Braino Mac.real` and back. It never deletes the real folder.
- `tests/mac-setup-flow.test.mjs`.

## Product or design decisions

- The notch talks and the window shows. A whole walkthrough inside the notch is too small; a window alone loses where he lives. Together, nothing new appears outside the notch.
- Hello first, questions second, try me last. You meet him, then he earns each question, and the last thing you do is talk to him.
- No made-up numbers on Home. If there is no data, it says so.

## What comes next

- Package and sign a real `Braino.app` (.dmg), so prompts say Braino and we can test the true first run.
- Website: simple sign in, then a download page.
- Delete the old full-screen first run once this one is verified.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
