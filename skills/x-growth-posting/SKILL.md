---
name: x-growth-posting
description: Use when the user asks about how their X/Twitter account is doing, wants Braino to react to X growth or follower changes, asks Braino to write/post/schedule an X post in their saved voice, or asks to start X Auto automation.
---

# X Growth + Posting

Use this skill for X/Twitter account status, follower-growth reactions, post drafting, posting, scheduling, and X Auto startup.

## Core Flow

1. First read the user's X status using Braino's existing X status behavior.
2. Explain the visible data plainly: followers, follower change if available, mentions, and latest post performance.
3. After every status check, ask whether the user wants a post created.
4. If the user says no, close warmly and stop the X flow.
5. If the user says yes, ask what they want to post about.
6. Capture the next spoken or typed message as the post brief.
7. Draft the post in the user's saved X voice and tone.
8. Show the draft review card only after the draft exists.
9. Do not post or schedule until the user explicitly chooses Post now or Schedule.

## Voice And Text Parity

The same routing rules apply in headphone mode and typed chat:

- "yes", "sure", "do it", or similar after the offer means start post brief capture.
- "no", "not now", "later", or similar means stop and close politely.
- "post it now" after a draft means publish the visible edited draft.
- "schedule it" after a draft means reveal scheduling controls.
- "edit it" after a draft means focus the editable draft card.

## Drafting Rules

Use the saved X persona/settings as the source of truth for tone.

- Draft only first.
- Keep the post at or under 280 characters.
- Sound like the user, not like a brand account.
- Avoid hashtags, generic CTAs, and AI-sounding announcements unless the user's saved style explicitly wants them.
- Never rewrite the approved draft during Post now or Schedule. The visible edited text is the text to publish.

## X Auto Startup

If the user says "start my automation on X" or similar:

1. If already on X, start X Auto immediately.
2. If not on X, open `https://x.com/home`.
3. Wait for Braino to inject on that tab.
4. Start the same X Auto behavior as the existing X Auto button.
5. If X Auto is already running, say so instead of toggling it off.
