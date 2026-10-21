# Teach Braino

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 20, 2026

## The simple version

Show Braino a job once and he learns it. Open the Braino app, go to Teach Braino, say what the job is, press Start and just do it. Tap the notch when you are done. Next time, ask him and he does it.

## Why it exists

Everyone has their own jobs nobody can guess. Instead of us building every one, you teach him yours.

## How to use it

1. Braino app, Teach Braino, type what it is (optional), Start. The app steps aside and the notch says "Watching 0:12".
2. Do the job normally, in any app or website.
3. Tap the notch. He learns it, says what he learned, and the app shows it.
4. Later: "Braino, buy me Atomic Habits on Amazon", or press Run on the page.

## What he watches

- Which app and Chrome tab is in front, and every page you open.
- Every click, by the name of what you clicked (read the way a screen reader reads it).
- What you type into a field, once you move on. Password fields are never read.
- No screenshots and nothing recorded when you are not teaching.

## Honest limitations

- One lesson, one way of doing it. If the site changes a lot he works it out like any other job.
- He stops before anything that spends money or sends something, and asks.
- Drag and drop and keyboard shortcuts are not recorded yet, only clicks and typing.
- Taught jobs are separate from Skills he learned.

## Technical shape

- Watching: `BrainoAX watch` (native/BrainoAX.swift) polls the mouse button and reads the element under the cursor and the focused field; JSON lines on stdout. App and tab changes come from the desktop context poll (`teachNoteFocus`).
- Learning: `teach.cjs` tidies the timeline and builds one prompt; one chat-about-notes call returns the job (name, say, goal, inputs, steps, done_when, stop_before). Saved in userData `taught-jobs.json`.
- Running: no new decider. `teach.taughtContextLines` adds the matching taught job's steps to the HIL loop context; the brain follows them. Run from the app calls the delegate with the job's own phrase.
- IPC: teach-start, teach-stop, teach-state, taught-list, taught-delete, taught-run; events braino-mac:teach, taught-changed. Logs: teach.start, teach.stop, teach.learned, teach.learn_failed.
- Tests: tests/mac-teach.test.mjs.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
