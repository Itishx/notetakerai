# Safer By Default

**Type:** Technical
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 3, 2026

## The simple version

Seven fixes from one evening's log, all about Braino doing something you did not ask for, or saying he did something he did not.

- **Undo asks first.** He only undoes a file change when you ask him to undo, and only for a change from the last 15 minutes. An older one has to be named ("undo the Desktop organize").
- **Her mode is a command.** Only "her mode", "talk to her" and similar, said as the whole sentence, switch it on.
- **"Call Param" calls Param.** Laya's "say it again" is only for a sentence that stops short, like "Open the".
- **"Open it" means what you were talking about.** If you talked after his last action, "it" goes to the conversation, not the last app. And "it" is never an app or file name.
- **No false "synced".** A sync says what it really got, including "Nexus did not give me your attendance".
- **"Quit Finder and WhatsApp" quits both.** A plain list closes every app in it; "close X and then open Y" still means two jobs.
- **"Both the Riyas" gives both.** And a misheard surname ("Riya Khurana Mehta") still finds Riya Khurana Mesa.
- **"Stop" stops him at once.** A stop word at the start of what you say, heard on the Mac while he talks, cuts him off in about a third of a second.

## Why it exists

From the October 3 run: "add the PDF into the new folder" undid a Desktop organize from September 25 (23 files); "I was not supposed to talk to her" turned on Her mode; "call Param" got "say it again" three times; "can you open it for me" about a book opened Spotify, and earlier "open it" opened a resume; "your attendance is synced and ready" when the Mesa login had expired; "quit Finder and WhatsApp" quit Finder; "both the Riyas" read one number; and he talked over eleven attempts to stop him.

## Honest limitations

- Not tested live on the Mac yet.
- Stopping him still needs a stop word ("stop", "wait", "hold on", or his name) at the start. Interrupting with any sentence comes after the live-words timing from the next run.
- The wider fix is architectural: shortcuts in front of the thinking layer. See the Oct 3 report.

## Technical shape

- `main.cjs`: `undoAllowed` + `undoLastFileAction(said)`; `layaAskIsReal` in `layaRoute(sorted, raw)`; `macLastTalkAt` and `delegate.context_skipped`; pronoun guards in the open intent and `openApp`; `syncNexusEverything` honest line and `_sync` in `PLAN_ANSWER_TOOLS`; `closeList` before the shared extractor and `closeOpenTarget` splitting; `lookupContactDetails` with `sameNameContacts` and the surname retry.
- `renderer/braino-mac.js`: `HER_ENTER_RE` anchored; live `BARGE_STOP` barge-in on HERA partials.
- `tests/mac-night-of-oct-3.test.mjs`, `tests/mac-laya.test.mjs`.
