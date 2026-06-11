---
name: google-calendar
description: Use this skill when Braino needs to schedule, reschedule, cancel, forward, list, remind about, or join Google Calendar events and Google Meet calls.
---

# Google Calendar Skill

Use this skill for calendar actions, meeting awareness, reminders, and Google Meet handoff.

## Core Capabilities

- Schedule calls, meetings, events, and Google Meet links.
- Reschedule upcoming events by finding the matching event first.
- Cancel upcoming events after identifying the event from Calendar.
- Forward an event by adding attendee email addresses and sending Calendar updates.
- List upcoming meetings, calls, events, and today's/tomorrow's schedule.
- Announce meetings around 15 minutes before start when Braino is active in the browser.
- Open the Google Meet link at meeting time and start Meeting & Call mode when the page allows it.

## Workflow

1. Parse the user request into intent: `create_event`, `reschedule_event`, `cancel_event`, `forward_event`, `list_events`, or `open_next_meet`.
2. Extract title, attendee names/emails, date, time, duration, recurrence, location, and whether a Meet link is needed.
3. If date/time is missing for create or reschedule, ask one short clarification before changing Calendar.
4. For create requests, create the event through Google Calendar API, include a Google Meet link by default, add a 15-minute reminder, and send attendee updates when emails are present.
5. For reschedule/cancel/forward requests, search upcoming Calendar events first, then operate only on a returned event ID.
6. Open Google Calendar or Google Meet visibly when it helps the user verify what happened.
7. For reminders, speak a short heads-up and never repeatedly announce the same event/reminder key.

## Safety Rules

- Never invent attendee emails. If the user gives only a name, create the event without sending an invite and clearly say no invite was sent.
- Never cancel or reschedule multiple events from one vague command.
- Never claim a meeting was forwarded unless Calendar accepted the attendee update.
- Do not auto-join audio/video in Google Meet; only open Meet and start Braino's Meeting & Call capture.
- Recurring events should use Google Calendar RRULE syntax only when the recurrence is explicit.

## Output Format

For scheduled events:

```markdown
Scheduled **{title}** for **{date/time}**.
Invite status: {sent/not sent and why}
Meet link: {url if created}
```

For event lists:

```markdown
Here is what I found on your Google Calendar:
- **{title}** - {date/time}. Meet: {url if available}
```

## Example Triggers

- "Schedule a call with Riya for 5pm tomorrow."
- "Schedule a call with riya@example.com for 5pm on Friday."
- "Reschedule my investor meeting to 4:30pm tomorrow."
- "Cancel my 3pm call."
- "Forward my product review meeting to alex@example.com."
- "What meetings do I have today?"
- "Join my next meeting."
