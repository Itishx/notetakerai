# Forms and Logins

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-26

## The simple version

Say **"fill this form for me"** and Braino fills every field he knows the answer to, in about a second: your name, email, phone, college, programme, role, city and links. He leaves anything he doesn't know, tells you which fields are yours, and never presses Send.

Say **"log me in"** on any login page and he uses the login Chrome already has saved. Chrome fills it; Braino never sees your password. Then he presses sign in.

## Why it exists

Automation that stops at every form isn't automation. The Meet-to-WhatsApp job felt instant, and forms and logins should feel the same.

## How to use it

- Open a form in Chrome, then say "fill this form for me".
- Teach him a detail once: "my phone number is 98765 43210", "my GitHub is github.com/itish". He uses it on every form after that.
- On a login page, say "log me in".
- Test forms: `open -a "Google Chrome" mac/braino-mac/test-forms/event-signup.html` (also `job-application.html` and `react-style.html`).

## What Braino knows or does

- **Where the answers come from:** your Braino account (name, email), what you told him in Set him up (college, role), details you told him to remember, and facts with an obvious shape in his memory (a phone number, a LinkedIn link).
- **How he reads a form:** every visible field's label, the text just above it, its placeholder and its autocomplete hint. Dropdowns and choice buttons get the option that means the same thing ("Student").
- **Logins:** he clicks the username box for real, so Chrome opens its saved-login list, then picks the first login with the arrow and Enter keys. For two-page logins (Google), he does it again on the password page.

## Honest limitations

- He never fills passwords himself, card numbers, one-time codes, ID numbers or captchas. Codes and captchas are yours.
- Essay questions ("Why this role?") are left for you. Writing them from what he knows is the next step.
- If Chrome has two logins saved for a site, he picks the first one.
- The first time, Chrome needs View → Developer → Allow JavaScript from Apple Events.
- Chrome only. Safari and Arc aren't covered yet.

## Technical shape

- `mac/braino-mac/form-fill.cjs`: `SCAN_JS` reads the fields, `matchField`/`planFill` match them (pure, no model), `fillJs` writes values through the native setter plus input and change events, so React pages see them. `LOGIN_JS`, `GUARD_JS` (Enter on an empty box can't send the form) and `SUBMIT_JS`.
- `main.cjs`: `formProfile`, `fillFormForMe`, `signInSaved`, `rememberFormDetail` (`form-profile.json` in Braino's settings folder). The voice intents run before the router. The hands `form_fill` and `sign_in_saved` are in `MAC_HIL_TOOLS` and the HIL catalog.
- Logs: terminal `📝 FORM` and `🔑 LOGIN` lines; `form.filled` and `login.saved` in the Mac log. Neither logs values.
- Tests: `tests/mac-form-fill.test.mjs`. Checked in a headless browser on the three test forms (7 of 8, 7 of 10 and 3 of 4 filled, each in under 30ms) and on the GitHub, Google and LinkedIn login pages.

## Status

MVP. The form fill is proven in a test browser. The saved-login click still needs a live test in your own Chrome.
