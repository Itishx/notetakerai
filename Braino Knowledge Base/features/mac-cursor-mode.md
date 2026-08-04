# Mac Cursor Mode

**Type:** Mode  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 29, 2026

## The simple version

Cursor Mode lets Braino keep an eye on the coding work happening inside a repository.

You can leave Cursor, watch a video, read something, or do anything else. Braino continues watching the repository. When the work appears finished, he tells you:

> Hey, your task is over. Please take a look.

If Cursor is not open in front of you, Braino opens the repository in Cursor.

## What Braino knows

The MVP watches:

- The current Git commit
- Files changed in the working tree
- The latest commit message
- Whether repository activity is still happening

This context is also added to Braino's conversation, so you can ask:

- “What feature am I working on?”
- “Is Claude finished?”
- “Cursor Mode status.”
- “Give me an idea for what I am building.”

## How completion works today

There is no universal completion signal shared by Cursor, Claude, Codex, and every coding agent. The MVP therefore uses repository activity as its signal.

A task is treated as complete when either:

1. A new commit appears, or
2. The repository remains unchanged for 45 seconds after active changes.

This is deliberately an MVP heuristic. A quiet pause can look like completion. A future version should accept direct lifecycle events from coding agents when those integrations are available.

## Controls

Cursor Mode starts automatically with Braino for Mac.

Voice commands include:

- “Turn on Cursor Mode.”
- “Turn off Cursor Mode.”
- “What am I working on?”
- “Is Claude done?”

## Technical shape

- The Electron main process polls the repository every three seconds.
- Repository snapshots are built from `git status`, `git rev-parse HEAD`, and the latest commit message.
- State is sent to the renderer over Electron IPC.
- The renderer adds that state to Braino's active conversational context.
- Task completion produces a spoken notification.
- macOS opens the repository with `open -a Cursor <repository>` when Cursor is not the frontmost app.

## Product decision

Cursor Mode does not try to read private thoughts from an AI coding agent. It watches the work itself.

That is a useful beginning: Braino knows what changed, where the work is happening, and when it has gone quiet. Later, direct agent events can make the ending exact.

