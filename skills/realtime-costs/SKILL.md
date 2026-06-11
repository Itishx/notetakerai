---
name: realtime-costs
description: Use this skill when Braino needs to answer how much the user has spent in realtime voice, what the current or latest session cost, how much was spent today, how much was spent in the last 7 days, or what the biggest cost driver was.
---

# Realtime Costs Skill

Use this skill for Braino spend receipts and realtime voice cost questions.

## What It Should Answer

- Current live session cost so far, or the most recent session if no live session is running.
- Today's spend with the exact date attached.
- Last 7 days spend with the exact date range attached.
- Biggest cost driver in the last 7 days.
- Most expensive session in the last 7 days.

## Source Of Truth

- Use the logged rows in `realtime_voice_turn_logs` plus `realtime_voice_sessions`.
- Prefer exact stored estimates over vague model guesses.
- If there is no spend logged yet, say so plainly instead of improvising numbers.

## Response Style

- Keep it tight and numeric.
- Use concrete dates, not only words like "today" or "last week".
- Break down spend into OpenAI Realtime, speech-to-text, and voice playback when helpful.
- Never pretend org-wide OpenAI costs are the user's personal costs.

## Example Triggers

- "How much have I spent on Braino today?"
- "What did this realtime session cost me?"
- "Give me my voice spend receipt."
- "How much in the last 7 days, and what's the biggest cost driver?"
