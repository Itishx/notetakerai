# Movie Mode (browser)

**Platform:** Braino Browser (Chrome extension) · **Status:** shipped, v4.1.0 · **Surface:** the notch + the page spotlight

## What it is
Watch a film or a show with Braino. He follows the captions (text tracks + on-page subtitle DOM), tracks who's who, and answers scene questions — "what just happened", "who is that", "kya hua" — without spoiling anything unless you ask. When captions are off he **looks**: a frame of the tab rides along with the question, the notch says "Reading the scene" and his eyes dart (the Mac's vision flow).

## How you enter / leave
- Say **"movie mode"**, **"cinema mode"**, or **"watch with me"** (voice or typed). Say **"exit movie mode"** to leave.
- Hotkeys still work: `⌘/Ctrl+Shift+M` (extension command) and `⌘/Ctrl+M` on the page.
- Braino confirms out loud: *"Movie mode. I'll follow along, and won't spoil anything unless you ask."*

## What you see
- The page dims around the player (`#__sb_movie_backdrop__` spotlight, 1.55s wrap).
- The notch takes the movie tint (cyan glow); scene questions → "Reading the scene" + scanning eyes → the answer in the notch, **spoken** (scene answers are spoken even when typed, like every Mac vision answer).

## Under the hood
- `__sbClassifyMovieModeCommand` / `__sbHandleMovieModeCommand` (voice + typed routers), `__sbActivateMovieMode` / `__sbDeactivateMovieMode`.
- Scene questions in movie mode take the batch path with `movieContext` **and** `imageBase64` (`__sbScreenGrabBase64`) → `chat-about-notes` (`buildMovieBlock` rules server-side).
- Notch: `.movie`, `.scanning`, `__sbNotchSceneReading`, `nfScanLook`.
- Passive context accumulates on OTT hosts even before you enter movie mode (`__sbStartPassiveMovieSync`).

## Related
- `docs/braino-design.md` §18 (notch v2), `extension/content.js` movie block (~14350–14620).
