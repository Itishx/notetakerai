# Which Riya?

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 3, 2026

## The simple version

When two people in your contacts share the name you said, Braino asks which one before he sends a message or makes a call. "Which Riya? Riya Khurana Mesa, who you talk to most, or the other Riya?" You can answer out loud, or tap the name in the notch.

## Why it exists

On October 2 at 23:53, "send this link to Riya on WhatsApp" went to the wrong Riya, someone Itish did not want to message. Braino matched the bare name "Riya" to "Riya 🐣" perfectly, scored "Riya Khurana Mesa" lower, and only ever asked on an exact tie. He also leaned on the one message he had sent Riya 🐣 before, while the real chat history said the opposite: 435 messages with Riya Khurana, 11 with Riya 🐣. The safety check that would have asked ran four seconds after the message had gone.

## How to use it

- Say the first name as you always do. If two people have it, he asks.
- Answer any way you like: "Khurana", "the first one", "the other one", "the one I talk to most", or the full name. Or tap a name in the notch.
- Say "cancel" and nothing is sent.
- Say the fuller name ("Riya Khurana") and he sends straight away, because that is one person.

## What Braino knows or does

- Every contact whose first name is the one you said counts, not just exact ties.
- The same person saved twice (one number) is still one person.
- The choices are ordered by how many messages you actually have with each person in WhatsApp on this Mac. That only decides the order; he never picks for you.
- A plan, the step-by-step loop, and chained steps all stop at the question instead of carrying on.

## Honest limitations

- Not yet tested live on the Mac; the automated tests use tonight's names with fake numbers.
- A message to a single, unique contact still sends without a yes. The website says he sends "after your yes"; that is only true for this case today.
- In the Chat app, the card offers the first name and Cancel; pick the other one by typing it.
- If the transcriber hears "Rhea" for "Riya", the names do not match by sound yet.

## Technical shape

- `mac/braino-mac/contact-match.cjs`: `sameNameContacts`, `pickContactChoice`, `contactChoiceQuestion` (pure, tested).
- `mac/braino-mac/main.cjs`: `resolveWhatsAppRecipient` checks same-name contacts first; `waChatCounts` reads message counts per chat name from WhatsApp's own database (newer chats are keyed by a private id, so by name, not number); `askWhichContact` holds the job as a `contact_pick` question; the answer sends to exactly the one chosen. `runPlanSteps`, the loop and the chain stop on `asks`.
- `mac/braino-mac/renderer/braino-mac.js` and `braino-mac.css`: `renderNotchChoices` puts the names inside the answer sheet, so the sheet measures them and keeps one shape.
- `tests/mac-which-contact.test.mjs`.
