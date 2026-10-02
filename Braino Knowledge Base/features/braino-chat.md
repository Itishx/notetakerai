# Braino Chat

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-28

## The simple version

The Braino app now opens on **Chat**. Type to him and he answers, or does it, silently, so it works in class or a meeting.
- **Talk:** "how's it going?" gets a normal reply.
- **Do:** "open YouTube", "send this page to Param on WhatsApp", "find me five cheapest flights to Mumbai". Same brain, same hands and same safety checks as voice.
- **Approval cards:** when he needs a yes before something he can't take back (a message you didn't clearly ask for, a Buy, Pay, Post or Delete, closing all your tabs, or "keep going?" on a long job), a card appears inside his reply saying exactly what is about to happen, with **Approve** and **Cancel**. Typing yes or cancel still works. After 90 seconds it times out and nothing is done. Spoken commands keep the spoken "Go ahead?": nothing appears outside the notch.
- **Watch him work:** while he does a job, each step appears inside his reply with a tick or a cross, and what he was thinking under it. When he's done it folds to "Done in 14s · 4 steps"; click it to see the steps again.

His replies are in Newsreader, a reading serif; yours are in glass bubbles. **Silent** is the default; press it to hear his replies in his voice. **New chat** clears it. Enter sends, Shift Enter adds a line, the up arrow brings back your last message. The chat is kept on your Mac.

## Why it exists

Everything Braino could do needed your voice. In class, a meeting or a library, that meant he could do nothing.

## Honest limitations

- **Links in replies aren't clickable yet.**
- **The talk or do split is the same one voice uses**, so a sentence voice would misread, typing misreads too.
- **Tested in a test window with pretend answers**, not yet end to end in the running app.

## Technical shape

- `mac/braino-mac/renderer/chat.js` (the page, `window.BrainoChat`) and `chat.css`; registered as the `chat` page, first in both Companion and Foundry, in `app.js`. The app always opens on it.
- Talk or do: `wantsBrain` (the same router voice uses). Talk goes to the new `braino-mac:converse` (`runMacConversation`, same chat history); do goes to `braino-mac:delegate` with `canTalk: false`. A question he just asked is always answered on the do side.
- The thinking trail (`macTrail` in `main.cjs`) is also sent to the Braino app window, and drawn inside the reply being written.
- Sound uses `brainoMac.tts` (his Fish voice).
