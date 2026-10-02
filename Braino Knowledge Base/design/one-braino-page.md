# One Braino Page

**Type:** Design decision
**Platform:** Affective website
**Status:** Live
**Released:** October 2, 2026

## The simple version

Everything about Braino now lives on one page, affctve.com/braino: what he is, what he does, the questions, and early access. The separate waitlist page and the App Store page are gone. "Braino" sits in the header where "App Store" was.

## Why it exists

A waitlist page with nothing on it but a form, and an App Store with one app in it, were two extra stops between a visitor and the thing they came for. Now the sign-up is right under the story, and every "Get early access" button on the site lands there.

## How to use it

- Header: Braino.
- Any "Get early access" button: jumps to the early access section on the Braino page.
- Old links still work: /waitlist, /early-access and /apps all land on the Braino page.

## What the page says now

1. Hero: "An AI on your Mac that actually does the work." Then a trust line: runs on your Mac, asks before anything is sent, paid for or deleted.
2. The film, then "Stop chatting with AI. Start handing it the work." with the chatbot vs Braino comparison.
3. Five things your Mac never had (sees, talks back, does the work, remembers, asks first), plus his two speeds.
4. Everything he can do, the companion examples, an ordinary Tuesday.
5. Early access: pick Braino or Foundry (the open tab is picked for you), leave an email, see what happens next.
6. Questions, including "How is Braino better than Siri?", "Do I need a new operating system?" and "How does AffectiveOS connect to Braino?".

Two tabs only: Braino and Braino Foundry. Braino for Schools and every Mesa mention are off the public pages.

The home page also lost its second list of examples under the demo, because the six chores above it already say the same thing. The demo still steps through them on its own.

## Honest limitations

- The sign-up uses the same waitlist-signup function as before; it was not re-tested end to end with a real email in this change, to avoid adding a fake signup.

## Technical shape

- `src/pages/BrainoFinal.tsx`: copy, the `EarlyAccess` section (posts to `waitlist-signup` with categories), hash scrolling for `#early-access`.
- `src/App.tsx` and `vercel.json`: /waitlist, /early-access and /apps redirect to the Braino page.
- `src/pages/aff-figures.tsx`: `VoiceToAction` gained `bare`, used on the home page.
- `src/pages/EarlyAccess.tsx` and `src/pages/AppStore.tsx` are no longer routed.
