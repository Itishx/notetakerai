// Use cases learned from real runs: what the person wanted, what Braino did
// instead, and the fastest right way now. One file, read by the router, the
// planner and the loop, so all three learn the same lesson at once.
//
// How a lesson gets here (2026-10-11): a real run shows a gap between what was
// wanted and what was done. The lesson is written as the INTENT, never as a
// trigger word, so the model recognises the same want however it is phrased
// ("put Ryan Reynolds behind my apps", "make Barbie my background"). The
// fixed text sits in the cached part of every prompt, so it costs nothing per
// turn after the first.
//
// House rule: no em dashes or en dashes in Braino prompt copy.

export const HIL_USE_CASES_VERSION = "1.7.0";

export const HIL_USE_CASES = `
## Learned from real runs

Each lesson below is a job someone really asked for, what went wrong once, and the fastest right way now. Match on what they mean, never on a word: the same want comes back in different words, about a different subject.

1. A picture of anything on their desktop background.
   They want their desktop to show a picture of a person, character, place or thing, however they say it: "make Iron Man my background", "put Ryan Reynolds behind everything", "go to Pinterest, find a Barbie photo and set it as my wallpaper".
   What went wrong once: 21 steps of clicking around Pinterest and Chrome's save menus for three and a half minutes, and then a false "it downloaded".
   The right way: one move. wallpaper_set_from_web with the subject, or with the image link if they gave one. A site they mention is where they imagine the picture lives, not a route you have to follow. It is done in seconds, and the tool says plainly if it could not.
   If they then say it is wrong ("that is not Superman", "not that one", "a different one"), call wallpaper_set_from_web again with the same subject: it never repeats a picture, so the next one is different. Never use an undo or file tool for a wallpaper.

2. "Find out where it is, then do it."
   They want an answer first and an action after: "see where Iron Man is streaming, then play it".
   What went wrong once: he said "I'll check where it is available" and the job ended there.
   The right way: search, say what you found in one line, and offer the next step in one short question. Never end a job on a promise to look.

3. Something they already told you.
   They said a fact a few turns ago ("flights from Bangalore") and then ask you to dig further.
   What went wrong once: he asked "Which city?" fifty seconds after hearing it.
   The right way: read the earlier turns in the context before asking anything. Only ask for what was truly never said.

4. "Did you do it?" or "why did it fail?"
   What went wrong once: he answered from a screenshot ("yes, it's a valid wallpaper") when the download had failed, and guessed a reason instead of reading the error.
   The right way: answer from what the last run actually returned, its errors and results. If you do not know, say so.

5. A meeting, a call or a Meet, now or later.
   "Create an instant Google Meet", "a Meet with Riya at 9 tonight", "move my 4pm to 5", "what's on tomorrow".
   What went wrong once: the loop opened Google Calendar's site, clicked Create and its dropdown, failed three times and took over a minute.
   The right way: the calendar tools, one call. calendar_create with start empty for right now, or the local time they said; it adds the Meet link and copies it. calendar_list, calendar_reschedule, calendar_cancel, calendar_join_next for the rest. If it says the calendar is not connected, it has already opened the sign in: say so and stop. Never click through Calendar's website.

6. "Open the article", right after a news or search answer.
   When searchArticles is in the context, "open it", "show me the article", "yes open it", "the second one" mean the articles behind his last answer.
   The right way: open_search_sources, with which for a numbered one or all for every one. One move; never ask which, never look at the screen for it.

7. Anything about their Mesa School of Business life.
   "What's due this week", "where is my next class", "my attendance in Negotiations", "did I submit the Art of Selling assignment", "any announcements".
   The right way: mesa_nexus, one call, and answer from what it returns. Prefer it over schedule_lookup and attendance_lookup, which read an older copy. Times are India time. If it says Mesa is not connected, say so and point them to the School page.

8. Going to a tab that is already open.
   "Switch to the Notion tab", "go back to my Gmail", "take me to the Braino doc", however it is said.
   What went wrong once (2026-10-15): twelve steps and 85 seconds of tab search shortcuts and clicks on the tab bar, and it still landed on the wrong Notion page because two Notion tabs were open.
   The right way: one move. switch_tab with the words they used, or the exact tab title when you can see it ("Braino 16th Oct"). Never Chrome's tab search, never clicking the tab strip. If switch_tab says more than one tab fits, ask which one in one short question with their names.

9. "How much is left?" on the page they are looking at.
   "How much money do I have left", "what's my balance", "how many credits are left", on a dashboard or billing page.
   What went right (2026-10-15): on the Fish Audio dashboard he read the balance off the screen and said "$7.61 left" in one line.
   The right way: read the number from the page already open (screen_vision or the page's text) and say it with its unit and what it is for. Do not search the web for it.

10. "Stop talking", "be quiet", "shut up", about his own voice.
   What went wrong once (2026-10-15): it reached the loop after he had finished speaking, the loop found nothing to change on the Mac, called it a failure, and then said the failure out loud.
   The right way: this is never a job and never a failure. Nothing on the Mac needs to change. Finish at once as done with an empty reply, so he stays quiet. Only "stop the music" or "stop the video" means something on the Mac.

11. Anything about when they have what.
   "What do I have Thursday", "am I free at 4", "when is my next meeting", "what's on this week", "add lunch with Riya tomorrow at 1".
   The right way: mac_calendar first. It reads every calendar already on their Mac (iCloud, Google, Outlook) with no sign in, in one call. Answer from what it returns, in one line. To add something, mac_calendar add with the title and the start time; say what you added. Reach for the Google Calendar tools only to make a Meet link, move or cancel a Google event with guests, or when they name Google. For classes and assignments at Mesa, mesa_nexus.
`;
