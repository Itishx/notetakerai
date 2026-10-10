# He Can See You

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 4, 2026

## The simple version

Ask "can you see me?" and Braino takes one photo with your Mac camera, looks at it, and answers you. It is a single photo, not a video: the camera light comes on for about a second and goes off.

## How to use it

Say "can you see me?", "how do I look?", "what am I holding?" or "look at me". The first time, macOS asks for camera permission.

## Honest limitations

- One photo per question, so he does not follow you or watch continuously.
- About 2 to 4 seconds per answer (camera warm-up plus one vision call).
- He never guesses who you are, your age, or anything sensitive.
- Not tested live yet. The packaged app will need a camera permission line before release.

## Technical shape

- `mac/braino-mac/main.cjs`: `SEE_ME_RE` quick route at the top of `routeHilFirst`; `grabCameraFrame` asks `systemPreferences.askForMediaAccess("camera")`, then grabs one 960px JPEG frame in the notch window via `getUserMedia` and stops the track; `lookAtUser` sends it to chat-about-notes vision; tool `look_at_user`; `camera.look` log events.
- `supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts`: `look_at_user` entry (live after the next HIL deploy).
- Test: `tests/mac-see-me.test.mjs`.
