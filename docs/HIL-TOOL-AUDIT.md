# HIL tool audit

All 125 tools in `hil-tool-catalog.ts`, checked against the Mac code and the real log (`~/Library/Logs/Braino Mac/braino-mac.log`), 2026-09-24.

- **Status:**
  - ✅ works end to end (proven in the log)
  - ✅ connected, not yet proven
  - 🔴 failing
  - 🟡 code exists but isn't connected (the old word patterns run it, and can misread)
  - ⚫ no direct Mac function
- **Wanted:** how many times HIL picked it, in the background router log plus the 183-misread replay.
- **Loop:** how many times it ran inside a HIL job, and how many of those worked.
- **Priority:**
  - P0 fixed, retest: was broken and core; fixed 2026-09-24
  - P0 connected: core; connected 2026-09-24
  - P1: after launch
  - Done
  - Drop / freeze

| Priority | Tool | What it does | How Braino uses it today | Status | Wanted | Loop | Needed? / notes |
|---|---|---|---|---|---|---|---|
| P0 fixed, retest | `attendance_lookup` | How much of their course the user has actually attended: percentage per course, and how many sessions they can still miss or need in a row | HIL runs it directly | ✅ connected, not yet proven |  |  | Only works once nexus_sync_all has saved attendance, which has never happened. |
| P0 fixed, retest | `google_doc_create` | Create a Google Doc and write the whole text into it in one go | HIL runs it directly | 🔴 failing (0/4) |  | 0/4 | 0/4 inside HIL, every one "Google Drive is not connected yet". Now opens the Google sign-in for you; approve it once. |
| P0 fixed, retest | `nexus_sync_all` | Pull everything else from the user's college LMS: attendance, assessments, courses | HIL runs it directly | 🔴 failing (0/1) |  | 0/1 | 0/1. Now uses Braino's own Mesa login and runs after each daily timetable sync. |
| P0 fixed, retest | `schedule_sync` | Pull the user's timetable from their college LMS into Braino | HIL runs it directly | 🔴 failing (2/5) |  | 2/5 | 2/5. The failures were the expired Mesa login. Own login and daily sync built today; test again. |
| P0 fixed, retest | `spotify_play` | Play one named song or track on Spotify | HIL runs it directly | 🔴 failing (0/2) | 48 | 0/2 | Was 0/2 inside HIL because the song arrived empty (songQuery). Fixed today; test again. |
| P0 fixed, retest | `whatsapp_send` ⚠️ | Send a WhatsApp message to a named contact or saved alias, through the WhatsApp Mac app in about a second | HIL runs it directly | 🔴 failing (0/3) |  | 0/3 | Was 0/3 inside HIL because the contact arrived empty (recipientRaw). Fixed today; test again. |
| P0 connected | `alarm_cancel` ⚠️ | Cancel every pending alarm and clear the notch; timers untouched | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `alarm_control` ⚠️ | Snooze nine minutes or silence a ringing alarm; otherwise cancels pending | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `click_element` ⚠️ | Click a named on-screen button or control, via accessibility then vision | HIL runs it directly | ✅ connected, not yet proven |  |  | The loop clicks by itself today, slowly. Connecting it gives one direct click. |
| P0 connected | `close_target` ⚠️ | Quit a named Mac app and close its matching browser tabs | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `file_find` | Find files on the Mac and optionally open the top hit | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `mail_send` ⚠️ | Compose an Apple Mail message and send it, or leave a draft | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `maps_directions` | Open Google Maps directions to a place, speak distance and travel time | HIL runs it directly | ✅ connected, not yet proven | 1 |  | Core daily job for Companion. |
| P0 connected | `maps_show` | Open Google Maps in Chrome centered on a named place | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `notion_page` | Create a page in the connected Notion workspace with a title and markdown body | HIL runs it directly | ✅ connected, not yet proven |  |  | Companion note export (queue.md task 1). Code exists. |
| P0 connected | `open_folder` | Open Downloads, Documents, Desktop, Applications or Home in Finder | HIL runs it directly | ✅ connected, not yet proven | 5 |  | The most-wanted tool (5 picks). New Mac function: known folders by name, others by folder search. |
| P0 connected | `repeat_last` | Re-speak the last thing Braino said out loud | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `send_to_phone` ⚠️ | iMessage the current Chrome URL or given text to your phone | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `spotify_queue_track` | Queue a named track to play next on Spotify | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `spotify_seek` | Jump to a timestamp, scrub by seconds, or restart the track | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `spotify_set_mode` | Turn Spotify shuffle or repeat on or off | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `spotify_set_volume` | Set Spotify volume to a percent, or nudge it up or down | HIL runs it directly | ✅ connected, not yet proven | 3 |  | Core daily job for Companion. |
| P0 connected | `stop_meeting_recording` ⚠️ | End the meeting recording and publish its summary note | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `stop_screen_recording` | Stop the screen recording and save the video file | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `stopwatch_control` | Start, restart, pause, resume, reset or read the notch stopwatch | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `time_query` | Speak the Mac's current clock time or today's calendar date | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `timer_cancel` ⚠️ | Cancel running countdown timers and clear notch; today also wipes alarms | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P0 connected | `whatsapp_reply_last` ⚠️ | WhatsApp-reply to whoever messaged last, within fifteen minutes of that message | HIL runs it directly | ✅ connected, not yet proven |  |  | Core daily job for Companion. |
| P1 | `ambient_mute` | Silence Braino's unprompted ambient check-ins until the user re-enables them | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `ambient_unmute` | Re-enable Braino's unprompted ambient check-ins and interruptions | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `clean_screenshots` ⚠️ | Move Desktop screenshots and recordings into the Redundant Files folder | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cleanup_create_folder` ⚠️ | Move all stale files into Redundant Files now, no confirmation | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `cleanup_list_bin` | Say what is currently parked in the Redundant Files folder | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `cleanup_open_bin` | Open the Redundant Files folder in Finder and count contents | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cleanup_recover_item` | Pull one named item back out of the Redundant Files folder | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cleanup_restore_bin` | Move everything in Redundant Files back to its original folder | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cleanup_suggest` | Name the stalest files and offer to park them | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `click_last_pointed` ⚠️ | Click whatever Braino just pointed at; needs a point within two minutes | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `count_items` | Count files or folders matching a term across the Mac | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cowork_start` | Start cowork mode at the default glance cadence, label the notch | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `cowork_start_with_interval` | Start cowork mode glancing at your screen on a given cadence | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `cowork_stop` | Turn cowork mode off and clear the notch label | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `create_folder` | Create an empty folder by name, defaulting to the Desktop | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `cursor_mode_set` | Toggle Cursor Mode: watch the git repo, announce when work settles | Old patterns only; HIL can't use it | 🟡 old path only | 3 |  | Useful, not urgent. |
| P1 | `cursor_mode_status` | Report whether a coding task is active and which files changed | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `delete_file` | Find a file and stage deletion, awaiting spoken confirmation | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `desktop_organize` ⚠️ | Bulk-sort Desktop files into folders by type, date, or project | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `gmail_reply` ⚠️ | Draft and send a reply to the Gmail thread open in Chrome | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `mac_storage_report` | Break down disk space: total free, the biggest folders by name and size, and what specifically is inside the biggest one | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `manage_window` | Maximize, minimize, center, or snap a window left or right | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `move_file` | Find a file by name and move it into a folder | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `open_accessibility_settings` | Open macOS Privacy and Accessibility settings to grant Braino permission | Old patterns only; HIL can't use it | 🟡 old path only | 2 |  | Useful, not urgent. |
| P1 | `rename_file` | Find a file by name and rename the first match | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `rewrite_selection` ⚠️ | Overwrite whatever is highlighted: fix, rewrite, shorten or translate it in place | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `screen_clip_record` | Record a screen clip of N seconds, clamped five to sixty | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `spotify_add_track` ⚠️ | Add a song to Liked Songs or a named Spotify playlist | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `spotify_create_playlist` ⚠️ | Create a Spotify playlist, optionally adding the currently playing track | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `tabs_census` | Count open Chrome tabs and group them by site | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `task_hogs_report` | Name the apps eating the most memory right now | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `voice_mode_check` | Answer yes or no whether one named Voice Command mode is active | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `voice_mode_current` | Name which Voice Command mode is active right now, if any | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `voice_mode_set` | Enter or leave a named Voice Command mode; retints the notch | Old patterns only; HIL can't use it | 🟡 old path only | 2 |  | Useful, not urgent. |
| P1 | `wake_word_set` | Turn always-listening hey-braino wake word on or off | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Useful, not urgent. |
| P1 | `wallpaper_restore` | Put back the wallpaper from before Braino changed it | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `whatsapp_listener_diagnostics` | Diagnose why WhatsApp notifications are not read aloud; changes no settings | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `whatsapp_listener_set` | Turn the WhatsApp notification reader on or off | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `whatsapp_remember_contact` | Save a WhatsApp contact's phone number or real name under an alias | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `x_mentions` | Read the three newest X mentions aloud with handles | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `x_stats` | Speak X follower count, weekly change, last tweet engagement | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `youtube_open_channel` | Open a creator's YouTube channel and read their recent uploads | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 1 |  | Useful, not urgent. |
| P1 | `youtube_play_from_list` | Open one video by id from the list just read aloud | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| P1 | `youtube_search` | Search YouTube and speak the top results to pick from | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Useful, not urgent. |
| Done | `alarm_set` | Arm a wall-clock alarm at an absolute epoch time, optional label | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `amazon_search` | Open Amazon search results in Chrome for a physical product to buy | HIL runs it directly | ✅ works end to end | 3 | 2/2 | 2/2 in the loop. |
| Done | `call_start` ⚠️ | Place a phone, FaceTime, or WhatsApp voice or video call | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `chrome_search_google` | Open a Google results tab in Chrome instead of answering aloud | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `contact_lookup` | Read someone out of the Mac address book: every number, email and company, matched by sound so a mis-heard name still finds them | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `deep_research` | Open source tabs, read them, and speak a synthesised comparison | HIL runs it directly | ✅ works end to end | 1 | 1/1 | 1/1 in the loop. |
| Done | `describe_image` | Answer about a picture rather than the whole screen: the copied image, the file selected in Finder, or the one open in Preview | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `file_action_undo` | Reverse the last file move, rename, delete, or desktop organize | HIL runs it directly | ✅ connected, not yet proven | 1 |  |  |
| Done | `front_window_summary` | Say which app, window title and URL is currently in front | HIL runs it directly | ✅ works end to end | 1 | 5/5 | 5/5 in the loop. |
| Done | `mac_wide_deep_search` | Search the whole Mac for a term: file names, file content, and Apple Notes body text, not just titles | HIL runs it directly | ✅ connected, not yet proven | 1 |  |  |
| Done | `media_control` | Pause, resume, mute, unmute or skip whatever is actually playing, anywhere: Spotify or a video in any browser tab | HIL runs it directly | ✅ connected, not yet proven | 1 |  |  |
| Done | `media_volume` | Set the volume of whatever is actually playing, else the Mac's own | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `music_play_segment_loop` | Play only a timestamped slice of a song, looping it forever | HIL runs it directly | ✅ connected, not yet proven | 4 |  |  |
| Done | `netflix_resume` | Resume or start a named Netflix title in Chrome | HIL runs it directly | ✅ connected, not yet proven | 12 |  |  |
| Done | `notes_create` | Create an Apple Note with the given title and body | HIL runs it directly | ✅ connected, not yet proven | 1 |  |  |
| Done | `now_playing` | Say what is playing right now anywhere: the Spotify track, the YouTube video, or nothing | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `open_target` | Open a named app, known website, or local file by name | HIL runs it directly | 🔴 failing (10/12) | 66 | 10/12 | 10/12 in the loop. |
| Done | `open_url` | Open a spoken domain or full URL in Chrome | HIL runs it directly | ✅ works end to end | 18 | 10/10 | 10/10 in the loop. |
| Done | `read_selection` | Summarize, explain or read out whatever is highlighted or on screen; grabs it itself, changes nothing | HIL runs it directly | ✅ connected, not yet proven | 5 |  |  |
| Done | `recent_download` | Open, reveal, name, or move the most recent download | HIL runs it directly | ✅ connected, not yet proven | 2 |  |  |
| Done | `schedule_lookup` | Read the user's own timetable: classes, deadlines, exams and events between two dates | HIL runs it directly | ✅ works end to end | 9 | 12/12 | 12/12 in the loop. |
| Done | `screen_point` | Screenshot and laser-point at a named UI element; stores it for clicking | HIL runs it directly | ✅ connected, not yet proven | 1 |  |  |
| Done | `screen_vision` | Screenshot the display and answer a free-form question about what is shown | HIL runs it directly | ✅ works end to end | 4 | 3/3 | 3/3 in the loop. |
| Done | `spotify_control` | Send play, pause, next or previous to the Spotify app | HIL runs it directly | ✅ works end to end | 13 | 1/1 | 1/1 in the loop. |
| Done | `spotify_now_playing` | Say which Spotify track and artist is playing right now | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `spotify_play_context` | Play a named playlist, album, or artist on Spotify | HIL runs it directly | ✅ connected, not yet proven | 6 |  |  |
| Done | `start_meeting_recording` | Record a meeting or call: transcript, live notes, synced summary | HIL runs it directly | ✅ connected, not yet proven | 5 |  |  |
| Done | `start_screen_recording` | Start recording the screen with mic audio to a Desktop video | HIL runs it directly | ✅ connected, not yet proven | 2 |  |  |
| Done | `tabs_close_all` ⚠️ | Close every open tab across Chrome, Brave, Edge and Safari | HIL runs it directly | ✅ connected, not yet proven |  |  | Native, and counts what it closed. Also runs instantly, before the router. |
| Done | `take_screenshot` | Capture the whole screen to a PNG on the Desktop | HIL runs it directly | ✅ connected, not yet proven |  |  |  |
| Done | `timer_set` | Start a countdown timer for N seconds with an optional label | HIL runs it directly | ✅ connected, not yet proven | 2 |  |  |
| Done | `wallpaper_random` | Set a random built-in macOS wallpaper and name the pick | HIL runs it directly | ✅ connected, not yet proven | 11 |  |  |
| Done | `wallpaper_set_from_web` | Set the desktop wallpaper to a web photo of a subject | HIL runs it directly | ✅ connected, not yet proven | 2 |  |  |
| Done | `web_search` | Search the web: speak the answer, or open Google in Chrome | HIL runs it directly | ✅ works end to end | 7 | 2/2 | 2/2 in the loop. |
| Done | `youtube_play` | Find the best matching YouTube video and play it in Chrome | HIL runs it directly | ✅ connected, not yet proven | 15 |  |  |
| Drop / freeze | `answer_question_conversationally` | Answer a question conversationally instead of firing any action | Old patterns only; HIL can't use it | 🟡 code exists, not connected | 2 |  | Duplicate: the router already has a 'say' verdict for this. Remove from the catalog. |
| Drop / freeze | `braino_return_to_notch` | Send the mascot back home into the notch | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Mascot animation. Leave on the old path. |
| Drop / freeze | `braino_summon` | Make the mascot step out of the notch onto the screen | Old patterns only; HIL can't use it | 🟡 old path only | 3 |  | Mascot animation. Leave on the old path. |
| Drop / freeze | `cleanup_delete_bin` ⚠️ | Trash the entire Redundant Files folder after Touch ID | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Permanent delete. Keep on the old path; don't give it to HIL. |
| Drop / freeze | `delete_current_finder_folder` ⚠️ | Trash the folder open in the frontmost Finder window | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Destructive, rarely asked for. Keep it away from HIL. |
| Drop / freeze | `design_cowork` ⚠️ | Screenshot the frontmost website and hand it to Claude Design for redesign | Old patterns only; HIL can't use it | 🟡 old path only |  |  | The Claude Design link is still a placeholder. Freeze until it's real. |
| Drop / freeze | `fetch_assets` | Download things named or linked by the user and organise them into one folder, with a sources manifest | Old patterns only; HIL can't use it | ⚫ no direct Mac function |  |  | The skill document exists but there's no Mac code. Build it later as its own feature. |
| Drop / freeze | `hide_braino` | Hide the Braino window until the user calls it back | Old patterns only; HIL can't use it | ⚫ no direct Mac function |  |  | No Mac code found. Leave out until needed. |
| Drop / freeze | `mac_skills_list` | Recite the canned list of what Braino does on this Mac | Old patterns only; HIL can't use it | 🟡 old path only | 1 |  | A fixed list. Keep on the old path only; no reason for HIL to pick it. |
| Drop / freeze | `mesa_checkin` | Open the Mesa School portal and speak coursework, deadlines, progress | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Replaced by schedule_lookup, schedule_sync and attendance_lookup. Remove. |
| Drop / freeze | `monday_mode_toggle` | Enter or exit Monday Mode: full sarcastic personality override, notch retints, mascot locks in the notch | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Already handled before the router. Leave as is. |
| Drop / freeze | `notch_face_set` | Show or hide Braino's face in the notch | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Cosmetic. Leave on the old path. |
| Drop / freeze | `semantic_open` | Open a described page on a known site like Amazon, IMDb | Old patterns only; HIL can't use it | ⚫ no direct Mac function | 2 |  | No Mac code. The loop already does this job (open the site, find the page). |
| Drop / freeze | `task_hogs_close` ⚠️ | Quit the memory-hog apps named by the last report | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Quits apps. Risky, rarely wanted. Freeze. |
| Drop / freeze | `touch_id_verify` | Prompt macOS Touch ID, report verified, refused, or unavailable | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Test command only. Leave on the old path. |
| Drop / freeze | `trash_empty` ⚠️ | Empty the real macOS Trash for good, after Touch ID confirms it is you | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Permanent delete. Keep on the old path behind Touch ID; don't give it to HIL. |
| Drop / freeze | `whats_new` | Pitch Braino's newest feature aloud, then demo it | Old patterns only; HIL can't use it | 🟡 old path only |  |  | Demo pitch. Keep on the old path; not a daily job. |
| Drop / freeze | `x_tweet_clip` ⚠️ | Stage the last screen clip for posting to X with caption | Old patterns only; HIL can't use it | 🟡 code exists, not connected |  |  | Posts publicly from a clip. Niche and risky. Freeze. |

**Counts:** P0 fixed, retest: 6, P0 connected: 22, P1: 44, Done: 35, Drop / freeze: 18.

⚠️ = can't be undone. HIL always sends these through the step-by-step loop, never straight to the tool.