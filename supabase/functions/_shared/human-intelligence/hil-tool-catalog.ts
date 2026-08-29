// hil-tool-catalog — every hand HIL has on the Mac, in one place.
//
// This file is the single source of truth for three things that used to be three
// separate lists that drifted: the catalog rendered into the router prompt, the
// dispatch table the Mac validates at boot, and the irreversible set the router
// refuses to fire. hil-loop learned this the hard way. Its ACTION_TYPES comment
// records `look` being taught to the prompt and to the world but not to the
// allowlist, and the symptom was Braino appearing to fail a skill he was
// performing perfectly. That was one action. This is 108.
//
// Generated from a read of routeMacDelegate and verified handler by handler
// against main.cjs. Two fields are safety-critical and were merged with a bias:
// where reviewers disagreed, `irreversible` took the more cautious value and
// `zeroNetwork` the less optimistic one. A wrong `irreversible: false` costs a
// deleted file; a wrong `true` costs one confirmation.
//
// Four entries were deliberately left OUT: pending_workflow_answer,
// file_delete_confirm_answer, voice_mode_lock_notice and voice_command_run.
// Those belong to the continuity door that runs before HIL is ever called. A
// reply to a question Braino just asked is not a routing decision, it is HIL's
// own earlier decision coming back, and handing "yes" to a model that has
// forgotten the question is strictly worse than not asking one.

export type HilTool = {
  name: string;
  params: string[];
  gloss: string;
  /** Cannot be taken back. The router REFUSES to fire these, in code, whatever
   *  the prompt says. They go to hil-loop, which has the confirm gate. */
  irreversible?: boolean;
  /** Toggles a mode, or reads/writes multi-turn state. Never memoised. */
  stateful?: boolean;
  /** Works with no internet. This is the "what Braino can do on a plane"
   *  contract, and the circuit breaker keeps a pre-model trigger for these. */
  zeroNetwork?: boolean;
  /** Safe to remember HIL's decision and replay it: not irreversible, not
   *  stateful, and takes no free-text argument. */
  memoSafe?: boolean;
  /** The real function in main.cjs that does the work. */
  handler?: string;
};

export const HIL_CATALOG_VERSION = "1.3.0";

export const HIL_TOOL_CATALOG: HilTool[] = [
  // Split, because one entry covering both halves of actOnSelectedText made the
  // router refuse "summarise this article" as unsafe. It is one handler with one
  // switch: main.cjs:5503 sets speakOnly for read/summarise/explain and returns
  // the answer aloud at :5564 without touching the document. Every other verb
  // falls through to the AX insert at :5353 and overwrites the selection with no
  // undo. So the danger was never the tool, it was the verb, and a single
  // irreversible flag could not express that.
  { name: "read_selection", params: ["verb", "language"], gloss: "Summarize, explain or read out whatever is highlighted or on screen; grabs it itself, changes nothing", handler: "actOnSelectedText", },
  { name: "rewrite_selection", params: ["verb", "language"], gloss: "Overwrite whatever is highlighted: fix, rewrite, shorten or translate it in place", irreversible: true, handler: "actOnSelectedText", },
  { name: "alarm_cancel", params: [], gloss: "Cancel every pending alarm and clear the notch; timers untouched", irreversible: true, zeroNetwork: true, handler: "cancelReminders", },
  { name: "alarm_control", params: ["snooze", "dismiss"], gloss: "Snooze nine minutes or silence a ringing alarm; otherwise cancels pending", irreversible: true, stateful: true, zeroNetwork: true, handler: "handleAlarmControl", },
  { name: "alarm_set", params: ["fireAt", "label"], gloss: "Arm a wall-clock alarm at an absolute epoch time, optional label", zeroNetwork: true, handler: "startAlarm", },
  { name: "amazon_search", params: ["product"], gloss: "Open Amazon search results in Chrome for a physical product to buy", handler: "runAmazonSearch", },
  { name: "ambient_mute", params: [], gloss: "Silence Braino's unprompted ambient check-ins until the user re-enables them", stateful: true, zeroNetwork: true, },
  { name: "ambient_unmute", params: [], gloss: "Re-enable Braino's unprompted ambient check-ins and interruptions", stateful: true, zeroNetwork: true, },
  { name: "answer_question_conversationally", params: ["prompt"], gloss: "Answer a question conversationally instead of firing any action", handler: "runMacConversation", },
  { name: "braino_return_to_notch", params: [], gloss: "Send the mascot back home into the notch", stateful: true, zeroNetwork: true, },
  { name: "braino_summon", params: [], gloss: "Make the mascot step out of the notch onto the screen", stateful: true, zeroNetwork: true, },
  { name: "call_start", params: ["recipient", "app", "video"], gloss: "Place a phone, FaceTime, or WhatsApp voice or video call", irreversible: true, handler: "startCall", },
  { name: "chrome_search_google", params: ["query"], gloss: "Open a Google results tab in Chrome instead of answering aloud", handler: "openChromeUrl", },
  { name: "clean_screenshots", params: [], gloss: "Move Desktop screenshots and recordings into the Redundant Files folder", irreversible: true, zeroNetwork: true, handler: "cleanScreenshots", },
  { name: "cleanup_create_folder", params: [], gloss: "Move all stale files into Redundant Files now, no confirmation", irreversible: true, zeroNetwork: true, },
  { name: "cleanup_delete_bin", params: [], gloss: "Trash the entire Redundant Files folder after Touch ID", irreversible: true, stateful: true, zeroNetwork: true, handler: "deleteReviewBin", },
  { name: "cleanup_list_bin", params: [], gloss: "Say what is currently parked in the Redundant Files folder", stateful: true, zeroNetwork: true, handler: "listRedundantContents", },
  { name: "cleanup_open_bin", params: [], gloss: "Open the Redundant Files folder in Finder and count contents", zeroNetwork: true, memoSafe: true, handler: "openRedundantFolder", },
  { name: "cleanup_recover_item", params: ["phrase"], gloss: "Pull one named item back out of the Redundant Files folder", stateful: true, zeroNetwork: true, handler: "recoverRedundantItem", },
  // Not irreversible: this is the recovery path, not a destructive one. Marking
  // it dangerous meant HIL could not offer to put things back after a bad move.
  { name: "cleanup_restore_bin", params: [], gloss: "Move everything in Redundant Files back to its original folder", stateful: true, zeroNetwork: true, handler: "restoreReviewBin", },
  { name: "cleanup_suggest", params: [], gloss: "Name the stalest files and offer to park them", stateful: true, zeroNetwork: true, handler: "suggestFileCleanup", },
  { name: "click_element", params: ["target"], gloss: "Click a named on-screen button or control, via accessibility then vision", irreversible: true, stateful: true, handler: "axClick", },
  { name: "click_last_pointed", params: [], gloss: "Click whatever Braino just pointed at; needs a point within two minutes", irreversible: true, stateful: true, zeroNetwork: true, handler: "axClick", },
  { name: "close_target", params: ["target"], gloss: "Quit a named Mac app and close its matching browser tabs", irreversible: true, zeroNetwork: true, handler: "closeOpenTarget", },
  { name: "count_items", params: ["term", "kind", "scope"], gloss: "Count files or folders matching a term across the Mac", stateful: true, zeroNetwork: true, handler: "countMatchingItems", },
  { name: "cowork_start", params: [], gloss: "Start cowork mode at the default glance cadence, label the notch", stateful: true, handler: "setCoworkState", },
  { name: "cowork_start_with_interval", params: ["intervalMs"], gloss: "Start cowork mode glancing at your screen on a given cadence", stateful: true, handler: "setCoworkState", },
  { name: "cowork_stop", params: [], gloss: "Turn cowork mode off and clear the notch label", stateful: true, zeroNetwork: true, handler: "setCoworkState", },
  { name: "create_folder", params: ["name", "parentDir"], gloss: "Create an empty folder by name, defaulting to the Desktop", zeroNetwork: true, handler: "createMacFolder", },
  { name: "cursor_mode_set", params: ["enabled"], gloss: "Toggle Cursor Mode: watch the git repo, announce when work settles", stateful: true, zeroNetwork: true, },
  { name: "cursor_mode_status", params: [], gloss: "Report whether a coding task is active and which files changed", stateful: true, zeroNetwork: true, },
  { name: "deep_research", params: ["query"], gloss: "Open source tabs, read them, and speak a synthesised comparison", handler: "runResearch", },
  // The general "go and get this for me" hand. Not logo-specific: it takes names
  // or URLs and ends with an organised folder. Reversible — everything lands in
  // one new directory and nothing existing is touched — so the router may fire
  // it directly. Needs the network by definition.
  { name: "fetch_assets", params: ["items", "folder", "kind"], gloss: "Download things named or linked by the user and organise them into one folder, with a sources manifest", handler: "runFetchAssets", },
  { name: "delete_current_finder_folder", params: [], gloss: "Trash the folder open in the frontmost Finder window", irreversible: true, zeroNetwork: true, handler: "deleteCurrentFinderFolder", },
  { name: "delete_file", params: ["query", "kind"], gloss: "Find a file and stage deletion, awaiting spoken confirmation", stateful: true, zeroNetwork: true, handler: "requestDeleteConfirmation", },
  { name: "design_cowork", params: [], gloss: "Screenshot the frontmost website and hand it to Claude Design for redesign", irreversible: true, stateful: true, handler: "runDesignCowork", },
  { name: "desktop_organize", params: ["mode"], gloss: "Bulk-sort Desktop files into folders by type, date, or project", irreversible: true, stateful: true, zeroNetwork: true, handler: "organizeDesktopFiles", },
  // Same reasoning as cleanup_restore_bin: undo is the thing you reach for when
  // something already went wrong, so it must not need a confirmation gate.
  { name: "file_action_undo", params: [], gloss: "Reverse the last file move, rename, delete, or desktop organize", stateful: true, zeroNetwork: true, handler: "undoLastFileAction", },
  { name: "file_find", params: ["query", "kind", "shouldOpen"], gloss: "Find files on the Mac and optionally open the top hit", zeroNetwork: true, },
  { name: "front_window_summary", params: [], gloss: "Say which app, window title and URL is currently in front", zeroNetwork: true, memoSafe: true, handler: "frontWindowSummary", },
  /* Through the API, not by clicking the site. Notion's editor is a canvas with
     no accessible body, so driving it by hand means fighting a page that cannot
     be typed into; the OAuth connection has existed for months and had nothing
     calling it. */
  { name: "notion_page", params: ["title", "markdown"], gloss: "Create a page in the connected Notion workspace with a title and markdown body", handler: "runNotionPage", },
  { name: "gmail_reply", params: ["userInstruction"], gloss: "Draft and send a reply to the Gmail thread open in Chrome", irreversible: true, handler: "replyToOpenGmail", },
  { name: "hide_braino", params: [], gloss: "Hide the Braino window until the user calls it back", stateful: true, zeroNetwork: true, },
  { name: "mac_skills_list", params: [], gloss: "Recite the canned list of what Braino does on this Mac", zeroNetwork: true, memoSafe: true, },
  { name: "mac_storage_report", params: [], gloss: "Break down disk space: total free, the biggest folders by name and size, and what specifically is inside the biggest one", zeroNetwork: true, memoSafe: true, handler: "reportMacStorage", },
  // Not memoSafe: takes a free-text search term, so no two calls are the same
  // question. Checks file names, file CONTENT via Spotlight, and the actual
  // body text of every Apple Note, the fix for facts that only live inside a
  // note rather than in its title.
  { name: "mac_wide_deep_search", params: ["term"], gloss: "Search the whole Mac for a term: file names, file content, and Apple Notes body text, not just titles", zeroNetwork: true, handler: "runMacWideDeepSearch", },
  { name: "mail_send", params: ["action", "recipient", "recipientEmail", "subject", "body"], gloss: "Compose an Apple Mail message and send it, or leave a draft", irreversible: true, stateful: true, handler: "executeMailWorkflow", },
  { name: "manage_window", params: ["action", "appQuery"], gloss: "Maximize, minimize, center, or snap a window left or right", zeroNetwork: true, handler: "axManageWindow", },
  { name: "maps_directions", params: ["destination", "origin"], gloss: "Open Google Maps directions to a place, speak distance and travel time", handler: "runMapsDirections", },
  { name: "maps_show", params: ["place"], gloss: "Open Google Maps in Chrome centered on a named place", handler: "runMapsShow", },
  { name: "mesa_checkin", params: [], gloss: "Open the Mesa School portal and speak coursework, deadlines, progress", memoSafe: true, handler: "runMesaCheckIn", },
  // Full personality override, same shape as a voice persona. The router
  // never needs to fire this mid-run: entry and exit are checked first, in
  // code, before normal routing even starts.
  { name: "monday_mode_toggle", params: ["action"], gloss: "Enter or exit Monday Mode: full sarcastic personality override, notch retints, mascot locks in the notch", stateful: true, zeroNetwork: true, handler: "setMondayModeState", },
  { name: "move_file", params: ["query", "kind", "destination"], gloss: "Find a file by name and move it into a folder", zeroNetwork: true, handler: "moveMacFile", },
  { name: "music_play_segment_loop", params: ["song", "provider", "startSeconds", "endSeconds", "useCurrent", "interpretedRange"], gloss: "Play only a timestamped slice of a song, looping it forever", stateful: true, handler: "playMusicSegmentOnMac", },
  { name: "netflix_resume", params: ["title"], gloss: "Resume or start a named Netflix title in Chrome", handler: "resumeNetflixOnMac", },
  { name: "notch_face_set", params: ["on"], gloss: "Show or hide Braino's face in the notch", stateful: true, zeroNetwork: true, },
  { name: "notes_create", params: ["title", "body"], gloss: "Create an Apple Note with the given title and body", stateful: true, zeroNetwork: true, handler: "startNoteWorkflow", },
  { name: "open_accessibility_settings", params: [], gloss: "Open macOS Privacy and Accessibility settings to grant Braino permission", zeroNetwork: true, memoSafe: true, },
  { name: "open_folder", params: ["folder"], gloss: "Open Downloads, Documents, Desktop, Applications or Home in Finder", zeroNetwork: true, },
  { name: "open_target", params: ["target"], gloss: "Open a named app, known website, or local file by name", },
  { name: "open_url", params: ["url"], gloss: "Open a spoken domain or full URL in Chrome", handler: "openChromeUrl", },
  { name: "recent_download", params: ["action", "destination"], gloss: "Open, reveal, name, or move the most recent download", stateful: true, zeroNetwork: true, handler: "handleRecentDownloadIntent", },
  { name: "rename_file", params: ["query", "kind", "newName"], gloss: "Find a file by name and rename the first match", zeroNetwork: true, handler: "renameMacFile", },
  { name: "repeat_last", params: [], gloss: "Re-speak the last thing Braino said out loud", stateful: true, zeroNetwork: true, },
  { name: "screen_clip_record", params: ["seconds"], gloss: "Record a screen clip of N seconds, clamped five to sixty", zeroNetwork: true, handler: "recordScreenClip", },
  { name: "screen_point", params: ["target", "raw"], gloss: "Screenshot and laser-point at a named UI element; stores it for clicking", stateful: true, handler: "runScreenPoint", },
  { name: "screen_vision", params: ["question"], gloss: "Screenshot the display and answer a free-form question about what is shown", handler: "runScreenVision", },
  { name: "semantic_open", params: ["site", "subject"], gloss: "Open a described page on a known site like Amazon, IMDb", },
  { name: "send_to_phone", params: ["content"], gloss: "iMessage the current Chrome URL or given text to your phone", irreversible: true, stateful: true, handler: "sendToPhone", },
  { name: "spotify_add_track", params: ["song", "playlist", "useCurrent"], gloss: "Add a song to Liked Songs or a named Spotify playlist", irreversible: true, stateful: true, handler: "addSpotifyTrackOnMac", },
  { name: "spotify_control", params: ["control"], gloss: "Send play, pause, next or previous to the Spotify app", handler: "controlSpotifyPlaybackOnMac", },
  { name: "spotify_create_playlist", params: ["name", "addCurrent"], gloss: "Create a Spotify playlist, optionally adding the currently playing track", irreversible: true, handler: "createSpotifyPlaylistOnMac", },
  { name: "spotify_now_playing", params: [], gloss: "Say which Spotify track and artist is playing right now", memoSafe: true, handler: "describeSpotifyNowPlaying", },
  { name: "spotify_play", params: ["songQuery"], gloss: "Play one named song or track on Spotify", handler: "playSpotifySongOnMac", },
  { name: "spotify_play_context", params: ["kind", "name"], gloss: "Play a named playlist, album, or artist on Spotify", handler: "playSpotifyContextOnMac", },
  { name: "spotify_queue_track", params: ["songQuery"], gloss: "Queue a named track to play next on Spotify", handler: "queueSpotifyTrackOnMac", },
  { name: "spotify_seek", params: ["positionSeconds", "relativeSeconds"], gloss: "Jump to a timestamp, scrub by seconds, or restart the track", handler: "seekSpotifyOnMac", },
  { name: "spotify_set_mode", params: ["feature", "enable"], gloss: "Turn Spotify shuffle or repeat on or off", zeroNetwork: true, handler: "setSpotifyModeOnMac", },
  { name: "spotify_set_volume", params: ["volumePercent", "volumeStep"], gloss: "Set Spotify volume to a percent, or nudge it up or down", handler: "controlSpotifyVolumeOnMac", },
  { name: "start_meeting_recording", params: ["source"], gloss: "Record a meeting or call: transcript, live notes, synced summary", stateful: true, handler: "startMeetingRecording", },
  { name: "start_screen_recording", params: [], gloss: "Start recording the screen with mic audio to a Desktop video", stateful: true, zeroNetwork: true, handler: "startScreenRecording", },
  { name: "stop_meeting_recording", params: [], gloss: "End the meeting recording and publish its summary note", irreversible: true, stateful: true, handler: "stopMeetingRecording", },
  { name: "stop_screen_recording", params: [], gloss: "Stop the screen recording and save the video file", stateful: true, zeroNetwork: true, handler: "stopScreenRecording", },
  { name: "stopwatch_control", params: ["action"], gloss: "Start, restart, pause, resume, reset or read the notch stopwatch", stateful: true, zeroNetwork: true, handler: "handleStopwatch", },
  { name: "tabs_census", params: [], gloss: "Count open Chrome tabs and group them by site", zeroNetwork: true, memoSafe: true, handler: "describeOpenTabs", },
  { name: "tabs_close_all", params: [], gloss: "Close every open tab across Chrome, Brave, Edge and Safari", irreversible: true, zeroNetwork: true, handler: "closeAllBrowserTabs", },
  { name: "take_screenshot", params: [], gloss: "Capture the whole screen to a PNG on the Desktop", zeroNetwork: true, memoSafe: true, handler: "takeScreenshot", },
  { name: "task_hogs_close", params: [], gloss: "Quit the memory-hog apps named by the last report", irreversible: true, stateful: true, zeroNetwork: true, handler: "closeTaskHogs", },
  { name: "task_hogs_report", params: [], gloss: "Name the apps eating the most memory right now", zeroNetwork: true, memoSafe: true, handler: "reportTaskHogs", },
  { name: "time_query", params: ["time", "date"], gloss: "Speak the Mac's current clock time or today's calendar date", zeroNetwork: true, handler: "answerTimeQuery", },
  { name: "timer_cancel", params: [], gloss: "Cancel running countdown timers and clear notch; today also wipes alarms", irreversible: true, zeroNetwork: true, handler: "cancelReminders", },
  { name: "timer_set", params: ["seconds", "label"], gloss: "Start a countdown timer for N seconds with an optional label", zeroNetwork: true, handler: "startReminder", },
  { name: "touch_id_verify", params: [], gloss: "Prompt macOS Touch ID, report verified, refused, or unavailable", zeroNetwork: true, memoSafe: true, handler: "requireTouchId", },
  // Permanent, unlike every cleanup_* entry above — those all land in the
  // recoverable Redundant Files folder. This is the real ~/.Trash, gated on
  // Touch ID the same way executeConfirmedDelete gates a single-file delete.
  { name: "trash_empty", params: [], gloss: "Empty the real macOS Trash for good, after Touch ID confirms it is you", irreversible: true, zeroNetwork: true, handler: "emptyMacTrash", },
  { name: "voice_mode_check", params: ["modeName"], gloss: "Answer yes or no whether one named Voice Command mode is active", stateful: true, },
  { name: "voice_mode_current", params: [], gloss: "Name which Voice Command mode is active right now, if any", stateful: true, },
  { name: "voice_mode_set", params: ["modeName", "action"], gloss: "Enter or leave a named Voice Command mode; retints the notch", stateful: true, },
  { name: "wake_word_set", params: ["enable"], gloss: "Turn always-listening hey-braino wake word on or off", stateful: true, zeroNetwork: true, },
  { name: "wallpaper_random", params: [], gloss: "Set a random built-in macOS wallpaper and name the pick", zeroNetwork: true, memoSafe: true, handler: "setRandomOfficialWallpaper", },
  { name: "wallpaper_restore", params: [], gloss: "Put back the wallpaper from before Braino changed it", zeroNetwork: true, memoSafe: true, handler: "restoreWallpaper", },
  { name: "wallpaper_set_from_web", params: ["subject"], gloss: "Set the desktop wallpaper to a web photo of a subject", handler: "setWallpaperFromWeb", },
  { name: "web_search", params: ["query", "openInChrome"], gloss: "Search the web: speak the answer, or open Google in Chrome", handler: "runMacWebSearch", },
  { name: "whats_new", params: [], gloss: "Pitch Braino's newest feature aloud, then demo it", memoSafe: true, },
  { name: "whatsapp_listener_diagnostics", params: [], gloss: "Diagnose why WhatsApp notifications are not read aloud; changes no settings", zeroNetwork: true, memoSafe: true, handler: "whatsAppListenerDiagnostics", },
  { name: "whatsapp_listener_set", params: ["enable"], gloss: "Turn the WhatsApp notification reader on or off", stateful: true, zeroNetwork: true, handler: "startWhatsAppListener", },
  { name: "whatsapp_remember_contact", params: ["alias", "name", "phone"], gloss: "Save a WhatsApp contact's phone number or real name under an alias", zeroNetwork: true, handler: "saveWhatsAppContact", },
  { name: "whatsapp_reply_last", params: ["message"], gloss: "WhatsApp-reply to whoever messaged last, within fifteen minutes of that message", irreversible: true, stateful: true, handler: "sendWhatsAppMessage", },
  { name: "whatsapp_send", params: ["recipientRaw", "message"], gloss: "Send a WhatsApp message to a named contact or saved alias", irreversible: true, stateful: true, handler: "sendWhatsAppMessage", },
  { name: "x_mentions", params: [], gloss: "Read the three newest X mentions aloud with handles", memoSafe: true, handler: "speakXMentions", },
  { name: "x_stats", params: [], gloss: "Speak X follower count, weekly change, last tweet engagement", memoSafe: true, handler: "speakXStats", },
  { name: "x_tweet_clip", params: ["caption"], gloss: "Stage the last screen clip for posting to X with caption", irreversible: true, stateful: true, handler: "tweetLastClip", },
  { name: "youtube_open_channel", params: ["name"], gloss: "Open a creator's YouTube channel and read their recent uploads", handler: "openYouTubeChannelFlow", },
  { name: "youtube_play", params: ["query"], gloss: "Find the best matching YouTube video and play it in Chrome", handler: "playYouTubeVideo", },
  { name: "youtube_play_from_list", params: ["videoId", "title"], gloss: "Open one video by id from the list just read aloud", stateful: true, handler: "openChromeUrl", },
  { name: "youtube_search", params: ["query"], gloss: "Search YouTube and speak the top results to pick from", handler: "searchYouTubeSpoken", },
];

/** The refusal set. Read by the router before it will return a fire verdict. */
export const HIL_IRREVERSIBLE: ReadonlySet<string> = new Set(
  HIL_TOOL_CATALOG.filter((t) => t.irreversible).map((t) => t.name),
);

export function isIrreversible(name: string): boolean {
  return HIL_IRREVERSIBLE.has(name);
}

/** Works with no network. Asserted at boot on the Mac so this contract cannot
 *  quietly rot into a fallback nobody tested. */
export const HIL_ZERO_NETWORK: ReadonlySet<string> = new Set(
  HIL_TOOL_CATALOG.filter((t) => t.zeroNetwork).map((t) => t.name),
);

export const HIL_MEMO_SAFE: ReadonlySet<string> = new Set(
  HIL_TOOL_CATALOG.filter((t) => t.memoSafe).map((t) => t.name),
);

export function findTool(name: string): HilTool | undefined {
  return HIL_TOOL_CATALOG.find((t) => t.name === name);
}
