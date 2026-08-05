# Choose Your Avatar

**Type:** Feature
**Platform:** Braino website (Dashboard Settings), Braino for Mac (reads the choice)
**Status:** MVP
**Released:** July 30, 2026

## The simple version

Braino OS is one brain — one voice, one memory, one set of actions. Choose Your Avatar lets you pick which character rides on top of it. Today that's Braino himself, or Webb, an original web-slinger acrobat. Whichever you pick shows up talking, walking, and listening everywhere Braino currently appears in the product — same underlying mechanism, different face.

## Why it exists

The Claude Design cast grid ("Braino Cast Grid.html") already sketched six original characters riding the same OS — Braino, Ferro, Wisp, Glam, Webb, Krush, Blip. This is the first one wired into the real product: pick your character once, and Braino OS carries your voice, memory, and actions over to it. Down the line, more of the cast can join the same switcher.

## How to use it

Open Dashboard → Settings → **Choose your avatar**, and pick Braino or Webb. Your pick saves to your account, so it follows you between the website and Braino for Mac.

## What Braino knows or does

- Renders whichever character is selected wherever the assistant talks back (chat avatar, voice mode).
- Talks with the same procedural mouth-open animation mechanism for both characters — no separate lip-sync system per character.
- Walks with the same walk-cycle mechanism for both — Webb's legs were extended from a single static shape into an articulated pair so he can walk the same way Braino does.
- Persists the choice to `profiles.mascot`, read by both the website and the Mac app.

## Honest limitations

- Webb only has the poses ported so far: idle, wave, point, talk, walk. He doesn't yet have Braino's full repertoire (climb, moonwalk, expressions, wardrobe accessories).
- The picker only changes the *live conversational avatar* (the chat page's mascot). Fixed marketing/demo scenes elsewhere on the site (the homepage dance loop, the waitlist mascot, etc.) intentionally stay Braino — they're choreographed specifically around his rig and aren't "your assistant," they're set dressing.
- The Mac app currently only reads *which* character is selected (wired through to `get-config`); it does not yet render Webb in the notch or the desktop-roaming walker. Those are a deeper, hand-tuned animation system and are a follow-up, not part of this release.

## Technical shape

- `supabase/migrations/20260730000001_profiles_mascot_choice.sql` — adds `profiles.mascot text not null default 'braino'`.
- `src/components/WebbChar.tsx` — Webb's parametric rig, ported from the Claude Design `mascot-webb.jsx`, following the exact pattern of `src/components/BrainoChar.tsx` (shared RAF clock, procedural talk-mouth mix, walk-cycle formula).
- `src/lib/mascotPreference.ts` — `useMascotPreference()` hook; reads/writes `profiles.mascot` for signed-in users, falls back to `localStorage` (`brainoMascotPref`) signed out.
- `src/pages/Dashboard.tsx` — "Choose your avatar" Settings card.
- `src/pages/BrainoChat.tsx` — `BrainoMark` renders `<Braino/>` or `<Webb/>` based on the preference; the message placeholder and voice-mode status text use the selected character's name.
- `mac/braino-mac/main.cjs` — `loadMascotPreference()` fetches `profiles.mascot` (same authenticated REST pattern as `fetchVoiceModes`), cached to `mascot.json` in `userData` for offline/signed-out launches, exposed on `braino-mac:get-config`.

## Product or design decisions

The website Dashboard is the only picker UI. The Mac app has no in-app Preferences window today (only macOS System Settings deep-links for permissions) — rather than building a whole new native settings surface just for this, the Mac app reads the same account-level choice the website writes.

## What comes next

Render Webb in the Mac app's notch and desktop walker. Add more of the cast (Ferro, Wisp, Glam, Krush, Blip) behind the same switcher once each has a walk cycle ported the way Webb's was.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
