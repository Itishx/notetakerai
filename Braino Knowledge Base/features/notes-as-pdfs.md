# Notes as PDFs

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 15, 2026

## The simple version

Every meeting and lecture Braino records is written up like a proper document and saved as a PDF on your Mac. You read it inside the Braino app, on the Notes & meetings page. No second window.

## Why it exists

Notes used to end up as a plain block of text on the website dashboard. Nobody revises from that. The Playo assignment write-up showed the better shape: the answer first, then the story, then what to say if someone asks. Every note should read like that.

## How to use it

- Meetings: say "record this meeting". When you stop, the PDF is written in the background.
- Lectures: press Command Shift E (LIVE mode). When you stop, the PDF is written.
- Open the Braino app, then Notes & meetings. Click any note to read it right there.
- Older notes synced to your account are listed too. Open one and press Save as PDF.

## What it does

- Writes the note in a fixed order. Meetings: what we decided, why we met, who was there, what we discussed, numbers mentioned, decisions, action items, open questions, if you are asked. Lectures: the big idea, key ideas, formulas, the worked example, traps the professor flagged, homework, if you are cold-called, revision checklist.
- Saves it to `~/Documents/Braino/Meetings` or `Lectures`, named like `2026-10-15 · Zoom · Pricing review (32 min).pdf`.
- Tags the file in Finder (Meeting blue, Lecture purple, Assignment orange, plus Braino).
- Puts the full transcript at the back, so every line can be checked.
- The Notes page filters by Meetings, Lectures or Notes, sorts newest or oldest, and narrows by this week, this month or any dates. Grouped by month.
- An open note shows its own title at the top, and you can rename it in place (renames the PDF, or the synced note).
- Notes and Transcript are a toggle, like in Notion. A note that is only a transcript opens on the transcript, with a button to write it up.
- Ask about this note: a tutor that answers only from that note and its transcript ("explain it simply", "quiz me").
- Titles like "Notetaker meeting" show as "Meeting, 19 August".
- Saves the PDF even when you are not signed in, so a lecture is never lost to sync.

## Honest limitations

- One extra write-up call per recording (same model as chat, up to about 4,000 words out). If it fails or takes over 90 seconds, the PDF uses the notes he already had.
- The write-up only knows what the transcript heard. Names it never heard show as roles.
- Only the newest 300 synced notes and 300 lectures are listed.
- Each tutor question is one chat call with the note's text (up to 60,000 characters).
- Notes from before today are not converted on their own. Use Save as PDF.

## Technical shape

- `mac/braino-mac/notes-pdf.cjs`: markdown to HTML, the page template (A4, Newsreader serif headings shipped in `renderer/fonts`, SF body text, quiet tables, page header and "Page X of Y" footer), file names, the write-up prompts, `savePdf` (hidden window + `printToPDF`, Finder tags through `xattr`). Never throws.
- `main.cjs`: `saveNotesPdf` (one `chat-about-notes` call with `writeUpPrompt`, 90s timeout, then print), called with `void` from meeting stop and `braino-mac:live-save`. IPC `notes-library`, `notes-render`, `notes-save-pdf`, `notes-reveal` (only paths inside `~/Documents/Braino`). App window has `plugins: true` for the built-in PDF viewer. New dashboard source `docs` (braino_docs lectures).
- `renderer/app.js`: Notes & meetings page lists PDFs and synced notes, opens them inline.
- Spec: `docs/NOTES_PDF_DESIGN.md`. Tests: `tests/mac-notes-pdf.test.mjs`.
- Logs: `notes_pdf.writeup`, `notes_pdf.saved`, `notes_pdf.failed`, `notes_pdf.tag_failed`.

## Product or design decisions

- Answer first, story after. Same shape as the assignment write-ups.
- The PDF is written after "Done" is said, never before, so stopping a recording is never slower.
- The app was also cleaned up the same day: Foundry, Habits, Focus and Routines removed until they are built; Dictation got a page that explains it; People shows every contact in a searchable grid; the app uses SF Pro throughout.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
