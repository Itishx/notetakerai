/* The changelog's entries, in any order (the page sorts). Written from the
   git history in plain words (2026-10-13). */
export type ChangeEntry = { date: string; version: string; product: string; kind: "New" | "Improved" | "Fixed"; title: string; body: string };
export const CHANGELOG: ChangeEntry[] = [
 {
  "date": "2026-03-31",
  "version": "1.0.0",
  "product": "LectureSnap",
  "kind": "New",
  "title": "Record a tab, get clean notes",
  "body": "The first version records the audio from any browser tab, like a lecture or a meeting, and turns it into tidy notes. Notes only use what was actually said, and you can still hear the tab while it records."
 },
 {
  "date": "2026-03-31",
  "version": "1.0.0",
  "product": "LectureSnap",
  "kind": "New",
  "title": "Notes live in a side panel",
  "body": "Everything now opens in a panel beside the page you are on, so you can watch a lecture and see notes form next to it. Past notes are kept in a history list."
 },
 {
  "date": "2026-03-31",
  "version": "1.0.0",
  "product": "LectureSnap",
  "kind": "New",
  "title": "Pause and resume recordings",
  "body": "You can stop a recording and pick it back up later. The new part is added to the same set of notes instead of starting over."
 },
 {
  "date": "2026-03-31",
  "version": "1.1.0",
  "product": "LectureSnap",
  "kind": "New",
  "title": "Chat with your notes and add screenshots",
  "body": "Ask questions about your notes in a chat. You can also grab and crop a screenshot of a slide or diagram and drop it right into your notes."
 },
 {
  "date": "2026-03-31",
  "version": "1.1.0",
  "product": "LectureSnap",
  "kind": "New",
  "title": "Send notes to Notion",
  "body": "Connect your Notion account and your notes, images included, sync to a Notion page. Each session keeps its own page and stays up to date."
 },
 {
  "date": "2026-03-31",
  "version": "1.1.0",
  "product": "LectureSnap",
  "kind": "Improved",
  "title": "Calm new look with a glowing orb",
  "body": "The panel and website got a quiet, zen style with a soft glowing orb that pulses while you record."
 },
 {
  "date": "2026-04-01",
  "version": "1.2.0",
  "product": "SideBrain",
  "kind": "New",
  "title": "LectureSnap is now SideBrain",
  "body": "The product got a new name, SideBrain, along with a glassy panel design and a short welcome tour for first time users."
 },
 {
  "date": "2026-04-01",
  "version": "1.2.0",
  "product": "SideBrain",
  "kind": "New",
  "title": "Chat with any page",
  "body": "SideBrain can now read the page you are on and answer questions about it. It also handles code questions and shows code answers neatly."
 },
 {
  "date": "2026-04-01",
  "version": "1.2.0",
  "product": "SideBrain",
  "kind": "Fixed",
  "title": "Fewer false security warnings on install",
  "body": "The download was rebuilt in plain form so browsers and antivirus tools stop flagging it by mistake."
 },
 {
  "date": "2026-04-01",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Use Cases and Notion Sync pages",
  "body": "The website gained pages showing what SideBrain is for and how Notion sync works, plus a floating navigation bar."
 },
 {
  "date": "2026-04-02",
  "version": "1.3.0",
  "product": "SideBrain",
  "kind": "New",
  "title": "Accounts and notes saved to the cloud",
  "body": "Sign in on the website and your notes are saved to your account, so they are not stuck on one computer."
 },
 {
  "date": "2026-04-02",
  "version": "1.3.0",
  "product": "SideBrain",
  "kind": "New",
  "title": "Light and dark themes",
  "body": "Pick a light or dark look for both the website and the side panel."
 },
 {
  "date": "2026-04-02",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Premium page and homepage redesign",
  "body": "A new Premium page lists paid features and pricing, and the homepage got a fresh white layout."
 },
 {
  "date": "2026-04-03",
  "version": "1.3.0",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Friendlier home screen",
  "body": "The panel now greets you by name and lets you pick what you want to do, like record a lecture or chat with a page, from a simple chat bar."
 },
 {
  "date": "2026-04-03",
  "version": "1.3.0",
  "product": "SideBrain",
  "kind": "Fixed",
  "title": "More reliable sign in and page reading",
  "body": "Signing in now carries over to the extension properly, and reading the current page works on more sites. A badge shows when the page was read."
 },
 {
  "date": "2026-04-05",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Splash screen on open",
  "body": "A short welcome screen with the logo shows when the extension and website load."
 },
 {
  "date": "2026-04-05",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Website rebuilt around three pillars",
  "body": "The site was reorganized around SideBrain's three main uses with a black and orange look."
 },
 {
  "date": "2026-04-06",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Choose Claude as your AI",
  "body": "A switcher in the chat bar lets you pick which AI model answers you, including Claude."
 },
 {
  "date": "2026-04-06",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Browser Agent does tasks for you",
  "body": "A new mode where SideBrain clicks, types and moves between pages to finish a task you describe. You can watch its steps and stop it anytime."
 },
 {
  "date": "2026-04-07",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Go Premium with real payments",
  "body": "You can now pay for Premium, and the extension unlocks paid features as soon as payment goes through."
 },
 {
  "date": "2026-04-07",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Smarter, more honest Browser Agent",
  "body": "The agent no longer has a step limit, understands your chat so far, and handles Gmail better. It now refuses to claim a task is done unless it actually did the work."
 },
 {
  "date": "2026-04-08",
  "version": "",
  "product": "SideBrain",
  "kind": "Fixed",
  "title": "Premium status stays recognized",
  "body": "Paid users no longer get locked out when their login quietly expires in the background."
 },
 {
  "date": "2026-04-09",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Talk to SideBrain with voice",
  "body": "Speak a request and SideBrain answers out loud with subtitles, and can even run agent tasks from your voice. You can interrupt it and keep talking."
 },
 {
  "date": "2026-04-13",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Faster agent with site shortcuts",
  "body": "The agent learned shortcuts for popular sites so it can jump straight to results instead of filling in forms. The website now honestly calls it experimental."
 },
 {
  "date": "2026-04-13",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Local pricing for India",
  "body": "Premium costs 299 rupees a month in India and 10 dollars a month elsewhere."
 },
 {
  "date": "2026-04-17",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Delegate tasks from your phone",
  "body": "Send a task from your phone and SideBrain runs it in your desktop browser, even when the panel is closed. You see progress live on your phone."
 },
 {
  "date": "2026-04-17",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Browser Agent is now Delegate",
  "body": "The agent was renamed Delegate and got its own page with tested examples across many kinds of tasks."
 },
 {
  "date": "2026-04-18",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Delegate gets faster and stoppable",
  "body": "Tasks start almost instantly, you can stop or delete them, and Delegate can now message WhatsApp contacts by name."
 },
 {
  "date": "2026-04-19",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Your dashboard",
  "body": "A new dashboard on the website shows your notes, past Delegate tasks with how long they took, and your settings."
 },
 {
  "date": "2026-04-19",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Teleprompter style voice mode",
  "body": "Voice mode got a warm new design where spoken words light up as they are said, and it no longer stops listening after one try."
 },
 {
  "date": "2026-04-21",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Compare page",
  "body": "A new page compares SideBrain with Claude, and the homepage shows live demos of each feature."
 },
 {
  "date": "2026-04-26",
  "version": "",
  "product": "SideBrain",
  "kind": "New",
  "title": "Delegate can download images",
  "body": "Ask Delegate to save an image and it downloads it for you."
 },
 {
  "date": "2026-05-02",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Reddit posting helper",
  "body": "Find the right subreddits, have AI write your post, and schedule it. Your browser posts it at the chosen time."
 },
 {
  "date": "2026-05-18",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "Refreshed website and side panel",
  "body": "The site and extension got a cleaner design, and every install button now downloads the right file."
 },
 {
  "date": "2026-05-19",
  "version": "",
  "product": "SideBrain",
  "kind": "Improved",
  "title": "New panel design and voice mode",
  "body": "The side panel was redesigned with a bigger greeting, a clearer record button for lectures and meetings, and a new look for voice mode."
 },
 {
  "date": "2026-05-20",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "First Mac app",
  "body": "An early desktop app for Mac was built. The download was pulled from the homepage a day later while Apple's approval was pending."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Meet Braino, the brain on your page",
  "body": "SideBrain became Braino, a small brain mascot that floats on any page instead of a side panel. It works out by itself whether you want to ask about the page, chat, or have it do a task."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Summon Braino with a shortcut",
  "body": "Press Cmd+B or Ctrl+B to bring Braino up or put him away. He stays hidden until you call him."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Floating answer card",
  "body": "Answers appear in a glassy card you can drag and resize, with neat formatting."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Voice mode and wake word",
  "body": "Braino can listen for a wake word and reply out loud. A dedicated voice mode gives spoken answers only."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Delegate searches the web first",
  "body": "Before acting, Delegate can look things up on the web so it works from real information. Finished tasks are saved to your dashboard."
 },
 {
  "date": "2026-05-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Lecture recording comes to Braino",
  "body": "Recording lectures and meetings, with running notes and Notion sync, now works from the new Braino."
 },
 {
  "date": "2026-05-24",
  "version": "1.3.1",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Slim bar with a centered card",
  "body": "Braino now lives in a thin bar with a glass card that adapts to light and dark pages. The site moved to trybraino.com."
 },
 {
  "date": "2026-05-24",
  "version": "1.3.2",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Works with Spotify and Google Docs",
  "body": "Braino understands Spotify and Google Docs better, so it can find tracks and type into your document."
 },
 {
  "date": "2026-05-24",
  "version": "1.3.7",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "X auto reply",
  "body": "Braino can write and post replies on X for you. A new Automations page lets you manage it."
 },
 {
  "date": "2026-05-24",
  "version": "1.3.9",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Stop button for tasks",
  "body": "A stop button in the card halts anything Braino is doing."
 },
 {
  "date": "2026-05-24",
  "version": "1.4.0",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "X replies type correctly",
  "body": "A series of fixes stopped garbled or doubled text, found the right Reply button, avoided replying to itself, and returns you to your page afterwards."
 },
 {
  "date": "2026-05-25",
  "version": "1.4.12",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Better X replies, no ads",
  "body": "Replies are more relevant, ad posts are skipped, and the dashboard shows reply stats."
 },
 {
  "date": "2026-05-25",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Sign in with Google",
  "body": "You can now log in with your Google account."
 },
 {
  "date": "2026-05-25",
  "version": "1.4.16",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Google Drive connection",
  "body": "Connect Google Drive and ask Braino to find, move or organize files, including tidying lots of files at once."
 },
 {
  "date": "2026-05-25",
  "version": "1.4.23",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Gmail connection",
  "body": "Braino can now work with Gmail through a direct connection and picks the right connected app for each task."
 },
 {
  "date": "2026-05-25",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Integrations page and pricing update",
  "body": "A new page shows planned app connections, and pricing was updated."
 },
 {
  "date": "2026-05-26",
  "version": "1.4.24",
  "product": "Website",
  "kind": "New",
  "title": "Connect X and schedule posts",
  "body": "Link your X account to schedule posts or post right away from Braino."
 },
 {
  "date": "2026-05-27",
  "version": "1.4.25",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Task steps stay visible",
  "body": "The list of steps Delegate takes now stays on screen even as pages change."
 },
 {
  "date": "2026-05-27",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Interactive Braino mascot",
  "body": "Braino on the website became interactive and reacts to you."
 },
 {
  "date": "2026-05-28",
  "version": "1.5.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Headphone mode",
  "body": "A hands free voice mode with a glowing Braino icon. Braino listens, waits for you to finish, and glows to show when he is listening or speaking."
 },
 {
  "date": "2026-05-28",
  "version": "1.5.3",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino wakes up when you open him",
  "body": "The first time you open Braino he slowly wakes up, eyes opening, and checks that you are signed in."
 },
 {
  "date": "2026-05-28",
  "version": "1.6.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino on pages that block extensions",
  "body": "On pages where extensions cannot appear, clicking the icon opens a small floating Braino window instead."
 },
 {
  "date": "2026-05-29",
  "version": "1.6.3",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Popup reads pages, Cmd+I shortcut",
  "body": "The small Braino window can read the page too, matches the main design, and opens with Cmd+I."
 },
 {
  "date": "2026-05-29",
  "version": "1.6.5",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Sign in once, everywhere",
  "body": "Signing in on the website now signs you into the extension too, quietly, with a red glow if you are not signed in."
 },
 {
  "date": "2026-05-29",
  "version": "1.6.9",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "New voice for Braino",
  "body": "Braino got a new speaking voice."
 },
 {
  "date": "2026-05-29",
  "version": "1.7.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino blinks, waves and floats",
  "body": "Braino now has little animations so he feels alive."
 },
 {
  "date": "2026-05-30",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Waitlist and teaser",
  "body": "The homepage became a pre-launch page where Braino chats with you and you can join the waitlist and see your place in line. A short teaser page was added too."
 },
 {
  "date": "2026-05-30",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "A real personality",
  "body": "Braino got a fuller personality with gentle humor and clear limits on topics he will not joke about, and he pays more attention to context."
 },
 {
  "date": "2026-05-30",
  "version": "1.8.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Watch a movie with Braino",
  "body": "Braino can keep you company while you watch, with a soft glow around the screen, and stays visible in full screen on Netflix."
 },
 {
  "date": "2026-05-31",
  "version": "1.9.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "X replies with your own voice",
  "body": "Braino reads full posts before replying, can write in a chosen persona, and keeps a history of replies."
 },
 {
  "date": "2026-05-31",
  "version": "1.9.2",
  "product": "Website",
  "kind": "New",
  "title": "X posting on autopilot",
  "body": "Braino can post and reply on X around the clock, with a live activity view, settings, and buttons to run, stop or clear the queue."
 },
 {
  "date": "2026-05-31",
  "version": "1.9.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Save notes to Google Docs",
  "body": "Send notes to Google Docs in one click, or just describe a document and Braino creates it."
 },
 {
  "date": "2026-05-31",
  "version": "1.9.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Organize my Drive",
  "body": "Say organize my drive and Braino scans your files, shows you the plan, and tidies up once you agree."
 },
 {
  "date": "2026-05-31",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Privacy Policy and Terms",
  "body": "Detailed Privacy Policy and Terms of Service pages were added."
 },
 {
  "date": "2026-05-31",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Dashboard sidebar you can collapse",
  "body": "The dashboard sidebar can be folded away to give you more room."
 },
 {
  "date": "2026-06-01",
  "version": "2.5.1",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Braino 2.5.1 release",
  "body": "A maintenance release that points every part of Braino at its new home behind the scenes so things keep working."
 },
 {
  "date": "2026-06-01",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Sign in with Google for the extension",
  "body": "You can now connect the Braino extension to your account using your Google login."
 },
 {
  "date": "2026-06-01",
  "version": "2.5.3",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Chat and agent sign-in fixed",
  "body": "Chat replies and agent tasks were failing for some people because of a sign-in problem. Both work again."
 },
 {
  "date": "2026-06-02",
  "version": "2.6.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Spotify live mode and Braino's favourite song",
  "body": "Braino can play music on Spotify for you, and you can ask him what his favourite song is."
 },
 {
  "date": "2026-06-02",
  "version": "3.0.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Faster, smarter Spotify playback",
  "body": "Say \"play\" and a song name and Braino plays it right away, with no page jumping and better matching."
 },
 {
  "date": "2026-06-02",
  "version": "3.1.1",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Spotify controls in the panel",
  "body": "Pause, skip and control music right from Braino's panel. If no device is active, Braino finds one and tries again."
 },
 {
  "date": "2026-06-02",
  "version": "3.1.3",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Colours that match the album art",
  "body": "The music panel picks up colours from the cover of whatever is playing."
 },
 {
  "date": "2026-06-02",
  "version": "3.1.4",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Spotify opens and stays in sync",
  "body": "Braino opens Spotify for you when needed and keeps the panel in step with what is playing."
 },
 {
  "date": "2026-06-02",
  "version": "3.1.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Ask Braino what's new",
  "body": "Ask \"What's new with you?\" and Braino tells you about his latest updates in a friendly chat. Web search also got better at knowing when you want it."
 },
 {
  "date": "2026-06-02",
  "version": "4.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Live voice conversations",
  "body": "Talk to Braino out loud and hear him answer in real time, like a phone call. A visible status shows when he is listening or speaking."
 },
 {
  "date": "2026-06-02",
  "version": "4.2.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Blue halo in live voice mode",
  "body": "Braino glows blue while live voice is on, and knows what he can and cannot do by voice."
 },
 {
  "date": "2026-06-02",
  "version": "4.4.8",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Voice that sounds and acts like Braino",
  "body": "Live voice now has a male voice and keeps Braino's real personality. Voice can also send tasks to other tabs and read results back to you."
 },
 {
  "date": "2026-06-03",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Build Your Braino page",
  "body": "Pick the parts of Braino you want, including new music and entertainment options, and see plans and pricing. Works well on phones too."
 },
 {
  "date": "2026-06-03",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Better X post scheduler",
  "body": "Long posts now turn into threads automatically, line breaks are kept, failed posts can be retried, and cancelled ones are hidden."
 },
 {
  "date": "2026-06-03",
  "version": "4.5.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Redesigned lecture recording",
  "body": "Recording a lecture now happens in Braino's floating card with a clearer layout, and the card stays put while you record."
 },
 {
  "date": "2026-06-04",
  "version": "4.7.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino follows your cursor",
  "body": "Braino can fly around the page following your mouse. Live voice now has a daily limit."
 },
 {
  "date": "2026-06-04",
  "version": "4.7.3",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Voice opens real tabs for music and search",
  "body": "When you ask by voice, Braino opens Spotify or a Google search in a new tab so you can watch him do it. You can also change the volume."
 },
 {
  "date": "2026-06-04",
  "version": "4.7.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Choose Braino's voice",
  "body": "Pick which voice Braino speaks with from your dashboard."
 },
 {
  "date": "2026-06-04",
  "version": "4.8.3",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Ask about your X account",
  "body": "Ask Braino how your X account is doing and he answers, out loud in voice mode or in chat."
 },
 {
  "date": "2026-06-04",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Real weekly follower growth on the live page",
  "body": "The live dashboard now saves follower counts daily so it can show true 7 day changes."
 },
 {
  "date": "2026-06-04",
  "version": "4.8.7",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino stays with you across tabs",
  "body": "Braino keeps his spot as you switch tabs, knows what tabs you have open, can read them out and safely close the ones you name."
 },
 {
  "date": "2026-06-04",
  "version": "4.10.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Voice follows you between tabs",
  "body": "Start talking to Braino in one tab, switch tabs, and the conversation keeps going."
 },
 {
  "date": "2026-06-05",
  "version": "4.11.2",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Idle animations and music glow",
  "body": "Braino moves around a little while idle and glows when Spotify is playing."
 },
 {
  "date": "2026-06-05",
  "version": "5.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Keyboard shortcut for voice",
  "body": "Press Cmd+Shift+Space to start talking to Braino."
 },
 {
  "date": "2026-06-05",
  "version": "5.3.0",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Steadier voice mode",
  "body": "Voice now sticks to English, joins new tabs instantly, changes volume directly and makes cleaner search queries."
 },
 {
  "date": "2026-06-05",
  "version": "5.5.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Jarvis voice option",
  "body": "A new voice style was added for Braino to speak with."
 },
 {
  "date": "2026-06-06",
  "version": "5.6.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Agent handles several tasks at once",
  "body": "Give Braino a list of jobs and he works through them, including posting on Medium and X."
 },
 {
  "date": "2026-06-06",
  "version": "5.6.5",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Voice settings fixes",
  "body": "Braino uses the voice you chose, the listening glow stays steady, and the headphone button shows the right state."
 },
 {
  "date": "2026-06-09",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Find jobs on LinkedIn",
  "body": "Ask Braino to look for jobs and he searches LinkedIn and shows you tidy results."
 },
 {
  "date": "2026-06-09",
  "version": "5.7.3",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Google Maps recommendations",
  "body": "Ask for places nearby and Braino finds them on Google Maps, right in front of you."
 },
 {
  "date": "2026-06-10",
  "version": "5.9.2",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Cheaper, quicker live voice",
  "body": "Live voice moved to a lighter model so it responds faster and costs less to run."
 },
 {
  "date": "2026-06-11",
  "version": "5.14.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Braino 5.14.0 release",
  "body": "A bundle of improvements and fixes across the extension."
 },
 {
  "date": "2026-06-14",
  "version": "6.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Movie mode",
  "body": "Braino can watch along with you in a dedicated movie mode."
 },
 {
  "date": "2026-06-14",
  "version": "6.1.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Full screen movie mode",
  "body": "Movie mode now works when your video is full screen."
 },
 {
  "date": "2026-06-15",
  "version": "6.2.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Movie mode on every streaming site",
  "body": "Movie mode now works across all the major streaming platforms."
 },
 {
  "date": "2026-06-15",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Team page",
  "body": "A new team page shows profile cards for the people building Braino, with signed agreements saved securely."
 },
 {
  "date": "2026-06-17",
  "version": "6.2.3",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Better meeting recording",
  "body": "Recording fixes, including picking up your microphone properly in meetings."
 },
 {
  "date": "2026-06-17",
  "version": "6.2.2",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Liquid glass look",
  "body": "Braino's floating interface got a clear glass style, and the homepage became a single smooth scroll."
 },
 {
  "date": "2026-06-17",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Meeting follow ups",
  "body": "After a meeting, Braino picks out follow ups for your notes and calendar and writes better summaries."
 },
 {
  "date": "2026-06-18",
  "version": "6.2.7",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Reactions, emotions and Scholar mode",
  "body": "Braino now reacts with eight different emotions, and puts on his glasses in Scholar mode for lectures."
 },
 {
  "date": "2026-06-18",
  "version": "6.3.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Readable on any page",
  "body": "The floating card stays readable on light or dark pages, and you can switch between a glass look and an easier to read one."
 },
 {
  "date": "2026-06-18",
  "version": "6.3.1",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "New ready to record card",
  "body": "A cleaner card when you are about to record, with a blinking, floating Braino."
 },
 {
  "date": "2026-06-19",
  "version": "6.3.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino walks on the input bar",
  "body": "Press Cmd+I for a wide input bar at the bottom of the screen with Braino walking along it. Works on Netflix and YouTube too."
 },
 {
  "date": "2026-06-19",
  "version": "6.3.11",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino gets legs",
  "body": "Braino now has legs, shoes and gloves and walks above the bar, with a new cinematic wake up."
 },
 {
  "date": "2026-06-19",
  "version": "6.3.16",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Headphone mode polish",
  "body": "A blue shimmer, a glowing mascot and Braino looking toward you while he listens."
 },
 {
  "date": "2026-06-19",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Agent checks its own work",
  "body": "The agent now loops until a task is done and avoids sending the same email twice."
 },
 {
  "date": "2026-06-19",
  "version": "6.3.23",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Throw Braino around",
  "body": "Grab Braino, fling him anywhere on the screen and watch him flail and land back on the bar."
 },
 {
  "date": "2026-06-19",
  "version": "6.3.25",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Choose how Braino shows up",
  "body": "Have Braino off, resting in the corner, or walking on the bar. He also reacts when you throw him, from scared to celebrating."
 },
 {
  "date": "2026-06-20",
  "version": "6.3.28",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Bar always ready",
  "body": "The input bar is always there and Braino climbs onto it when he wakes up."
 },
 {
  "date": "2026-06-20",
  "version": "6.3.31",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Double tap to call Braino",
  "body": "Double tap Space or Ctrl to bring Braino up, and Cmd+I now works reliably."
 },
 {
  "date": "2026-06-20",
  "version": "6.3.33",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "New voice for Braino",
  "body": "Braino has a new, more natural speaking voice, with a backup if it is unavailable."
 },
 {
  "date": "2026-06-20",
  "version": "6.3.42",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Talking mouth, glasses and greetings",
  "body": "Braino's mouth moves when he talks, he wears glasses if you ask and greets you by name."
 },
 {
  "date": "2026-06-20",
  "version": "6.3.45",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino moonwalks",
  "body": "Ask him to moonwalk and he does, with Billie Jean cued up on Spotify."
 },
 {
  "date": "2026-06-20",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Walking Braino on the website",
  "body": "The corner mascot on the website is now the same walking Braino as the extension."
 },
 {
  "date": "2026-06-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Voice that starts faster",
  "body": "Braino starts speaking sooner and stops the moment you talk over him."
 },
 {
  "date": "2026-06-22",
  "version": "7.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino gets feelings and a memory",
  "body": "Braino now has a real personality that responds to the moment, remembers things about you, and has his own chat page."
 },
 {
  "date": "2026-06-22",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Guided tour on the homepage",
  "body": "Braino walks you around the homepage himself."
 },
 {
  "date": "2026-06-22",
  "version": "7.2.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Smarter agent and steadier Spotify",
  "body": "The agent got smarter, Braino travels with it across tabs, and Spotify finds your device reliably."
 },
 {
  "date": "2026-06-22",
  "version": "7.3.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Compare things",
  "body": "Ask Braino to compare products or options and he researches them for you."
 },
 {
  "date": "2026-06-22",
  "version": "7.4.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Quicker, warmer voice replies",
  "body": "Braino speaks sentence by sentence so replies start sooner, and defaults to English but offers to switch."
 },
 {
  "date": "2026-06-22",
  "version": "7.5.2",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Record meetings in place",
  "body": "Record a meeting without leaving the page. A sonar pulse shows when Braino hears you."
 },
 {
  "date": "2026-06-24",
  "version": "8.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino helps you brainstorm",
  "body": "Braino knows how he is being built and can brainstorm ideas with you. He can also turn a visual idea into a design prompt and type it into a design tool. Voice replies are now much faster."
 },
 {
  "date": "2026-06-24",
  "version": "8.5.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino points at things",
  "body": "Ask where something is and Braino leaps off the bar to point at it on the page."
 },
 {
  "date": "2026-06-24",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Changelog as a story",
  "body": "The website changelog became a living documentary of how Braino grew."
 },
 {
  "date": "2026-06-24",
  "version": "8.6.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Status bubble over Braino",
  "body": "A little bubble above Braino's head shows what he is doing during voice chats."
 },
 {
  "date": "2026-06-24",
  "version": "8.7.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Watch the agent work",
  "body": "Agent steps show live in the bar, and Braino tells you the result when he is done."
 },
 {
  "date": "2026-06-25",
  "version": "8.8.1",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Agent searches smarter",
  "body": "The agent understands what you want and writes a proper search, instead of pasting your words and over searching."
 },
 {
  "date": "2026-06-25",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Free and Pro plans",
  "body": "Braino now comes as free Basic Braino and paid Braino Pro, which adds voice first use and the full agent."
 },
 {
  "date": "2026-06-25",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Send directions to your phone",
  "body": "Say \"ping directions to\" a place and they arrive on your phone, with a QR code as backup."
 },
 {
  "date": "2026-06-25",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Progress pill with green ticks",
  "body": "A small pill shows each step of a task with ticks as they finish, and you can follow up with things like \"the Udemy one\"."
 },
 {
  "date": "2026-06-26",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Straight talk page",
  "body": "An honest note from the founder on why the agent is not perfect yet."
 },
 {
  "date": "2026-06-26",
  "version": "8.17.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Faster voice replies",
  "body": "Braino reads the page while you are still talking and plays answers more smoothly."
 },
 {
  "date": "2026-06-26",
  "version": "8.19.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Quick acknowledgement on slow answers",
  "body": "When an answer needs a moment, Braino says something right away so you know he heard you."
 },
 {
  "date": "2026-06-26",
  "version": "8.20.3",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Chat steps aside during tasks",
  "body": "The chat closes while the agent works and reopens with the result."
 },
 {
  "date": "2026-06-26",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Why Braino takes a beat",
  "body": "A plain page explaining why replies can take a moment."
 },
 {
  "date": "2026-06-27",
  "version": "8.21.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Faster replies beta",
  "body": "An optional setting where Braino starts answering before you finish. Off by default."
 },
 {
  "date": "2026-06-27",
  "version": "8.22.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Choose which tabs to close",
  "body": "Pick tabs from a list before Braino closes them. Braino also firmly refuses sexual content."
 },
 {
  "date": "2026-06-28",
  "version": "8.23.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Open sites instantly",
  "body": "Ask to open a known website and Braino opens it straight away."
 },
 {
  "date": "2026-06-28",
  "version": "8.25.1",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Stop button and quicker look ups",
  "body": "Stop the agent from the bar at any time. Simple questions go to fast web search, and the agent handles busy apps better."
 },
 {
  "date": "2026-06-29",
  "version": "8.29.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Jarvis mode",
  "body": "A full screen, voice first mode where Braino flies to the centre, greets you and shows your X stats."
 },
 {
  "date": "2026-06-29",
  "version": "8.31.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Hey Braino and double clap",
  "body": "Say \"Hey Braino\" or clap twice to wake him. Nothing is sent until he wakes."
 },
 {
  "date": "2026-06-29",
  "version": "8.42.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino can see you",
  "body": "Ask \"can you see me?\" or to look at your screen, and Braino describes what he sees. Jarvis mode has a camera button too."
 },
 {
  "date": "2026-07-02",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "A cleaner, editorial website",
  "body": "The site got a calmer, magazine-style redesign with a new home page, a Delegate page and one shared footer."
 },
 {
  "date": "2026-07-02",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Braino talks like a friend",
  "body": "Braino now sounds like a friend instead of a bot, and keeps his replies clean and simple."
 },
 {
  "date": "2026-07-02",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Fast voice replies by default",
  "body": "Voice replies are quicker out of the box, and Braino only pauses to think when a question really needs it. The menu also got simpler."
 },
 {
  "date": "2026-07-02",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Voice mode on the chat page",
  "body": "Tap Control twice on the chat page to talk to Braino out loud, with a soft glow around the screen and a live transcript."
 },
 {
  "date": "2026-07-03",
  "version": "8.43.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Fast replies build",
  "body": "The extension download now ships with fast voice replies switched on."
 },
 {
  "date": "2026-07-03",
  "version": "8.44.0",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Delegate remembers the conversation",
  "body": "When you hand Braino a task, he now uses what you were just talking about, and he no longer opens the same task or tab twice."
 },
 {
  "date": "2026-07-06",
  "version": "8.45.0",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Sign in works on preview sites",
  "body": "The extension can now sign you in from test versions of the site, not only the main one."
 },
 {
  "date": "2026-07-08",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Design kit for motion designers",
  "body": "A new design kit page lets designers grab Braino's bar, chat boxes, poses and animations as images and frame exports."
 },
 {
  "date": "2026-07-09",
  "version": "8.46.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Understands vague tasks like 'buy that book'",
  "body": "Braino turns a vague request into a clear task using your chat and the page you are on. He can also guide you through buying on Amazon and searches the web faster."
 },
 {
  "date": "2026-07-09",
  "version": "9.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino 9.0",
  "body": "A milestone release bringing together smarter task handling, guided Amazon shopping and fast web search."
 },
 {
  "date": "2026-07-09",
  "version": "9.1.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Follows new tabs while working",
  "body": "During a task Braino now follows along when a page opens a new tab, and hears your voice more accurately."
 },
 {
  "date": "2026-07-09",
  "version": "9.1.4",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Fewer pointless repeat searches",
  "body": "Braino stops running the same search twice, keeps exploring when it helps, and finishes every part of a multi-step request."
 },
 {
  "date": "2026-07-09",
  "version": "9.2.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino knows where and when you are",
  "body": "Braino now knows your local time and country, so answers and shopping links fit where you live. No location prompt needed."
 },
 {
  "date": "2026-07-09",
  "version": "9.2.2",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "More reliable web searches",
  "body": "A search only counts as done when results actually load, and personal questions are never sent off to the web."
 },
 {
  "date": "2026-07-10",
  "version": "9.3.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Braino can dance",
  "body": "Ask Braino to dance and he plays the music and performs a full routine, then asks how it was."
 },
 {
  "date": "2026-07-10",
  "version": "9.3.9",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "A polished dance show",
  "body": "The dance got its signature moves, music that reliably starts at the right moment, a big finish and a curtain call."
 },
 {
  "date": "2026-07-10",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "One design across marketing pages",
  "body": "All the marketing pages now share the same editorial look, and the download is always simply braino.zip."
 },
 {
  "date": "2026-07-10",
  "version": "9.4.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "See how Braino thinks while he works",
  "body": "While doing a task, Braino shows his live thinking in the bar so you can see why he does each step."
 },
 {
  "date": "2026-07-10",
  "version": "9.4.8",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Cleaner screen during tasks",
  "body": "Each part of the screen now has one job during a task, thinking shows on every task, and the floating card no longer pops open in the way."
 },
 {
  "date": "2026-07-10",
  "version": "9.5.0",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Voice keeps up with changing pages",
  "body": "On quiz sites like Udemy, Braino now reads the current question, even inside embedded frames, instead of the previous one."
 },
 {
  "date": "2026-07-10",
  "version": "9.5.3",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Braino can never change your cart",
  "body": "As a safety rule, Braino can never delete items from your shopping cart or change quantities."
 },
 {
  "date": "2026-07-10",
  "version": "9.5.4",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Better at finding results on busy pages",
  "body": "Braino stops reading in circles, finds the right results on crowded pages, and follows shopping steps in order."
 },
 {
  "date": "2026-07-10",
  "version": "9.6.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Warmer replies and a swearing toggle",
  "body": "Braino handles flirting kindly, has a sweet answer to 'I love you', and you can switch his swearing on or off from the dashboard."
 },
 {
  "date": "2026-07-10",
  "version": "9.6.2",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Faster Amazon searches",
  "body": "Braino goes straight to Amazon search results with a clean search phrase."
 },
 {
  "date": "2026-07-11",
  "version": "9.6.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Headphones when you play music",
  "body": "When you play music on YouTube, the bar glows warm and Braino puts on his headphones."
 },
 {
  "date": "2026-07-11",
  "version": "10.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Roam mode",
  "body": "Braino leaves the bar and wanders around your screen, perching on real things on the page."
 },
 {
  "date": "2026-07-11",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Launch film intro",
  "body": "The site can open with a full-screen launch film that drops you into the site when it ends."
 },
 {
  "date": "2026-07-11",
  "version": "10.0.4",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Roam stays on screen, voice stays in English",
  "body": "Roaming Braino now walks instead of teleporting and stays in view, and his voice no longer switches to another language by mistake."
 },
 {
  "date": "2026-07-11",
  "version": "10.1.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Voice personas",
  "body": "Ask Braino to talk like someone else and he switches voice, style and even costume until you say 'be yourself'."
 },
 {
  "date": "2026-07-12",
  "version": "10.1.5",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Gen Z mode",
  "body": "A new style-only persona that changes how Braino talks without a costume."
 },
 {
  "date": "2026-07-16",
  "version": "10.0.2",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Reply to Gmail for you",
  "body": "Braino can open your Gmail messages, write a reply and send it from the right thread."
 },
 {
  "date": "2026-07-16",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Speaker-aware meeting notes",
  "body": "Meeting capture now tells speakers apart."
 },
 {
  "date": "2026-07-16",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Chat page rebuilt around the Braino bar",
  "body": "The chat page now centres on the Braino bar, with working controls, smooth scrolling and memory of what you talked about."
 },
 {
  "date": "2026-07-17",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Team mode demo",
  "body": "Braino can introduce a whole team of helpers by name and walk through a scripted demo."
 },
 {
  "date": "2026-07-17",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Ignores background noise",
  "body": "Voice listening is better at ignoring noise around you."
 },
 {
  "date": "2026-07-20",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Demo mode",
  "body": "A guided demo mode shows Braino handling Gmail and Maps from start to finish."
 },
 {
  "date": "2026-07-21",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Interactive homepage tour",
  "body": "The homepage now launches into an interactive tour, narrated in Braino's own voice."
 },
 {
  "date": "2026-07-21",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Nonstop dancing to YouTube",
  "body": "Braino can keep dancing along to music on YouTube in new dance modes."
 },
 {
  "date": "2026-07-22",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Braino arrives on the Mac",
  "body": "A first Mac version of Braino lives on your desktop, talks with you by voice, and signs in through your browser or Google."
 },
 {
  "date": "2026-07-22",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Tidy your desktop and open apps",
  "body": "Braino on the Mac can organise your desktop files, undo it if you change your mind, and open apps and sites by voice."
 },
 {
  "date": "2026-07-23",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Files, Notes, Mail and Spotify on Mac",
  "body": "Braino can work with your files, write in Notes, draft Mail and control Spotify, and he stays visible above every app."
 },
 {
  "date": "2026-07-23",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Her mode",
  "body": "A special voice mode on the Mac where Braino takes on a different voice and personality."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Screen vision and pointing",
  "body": "Braino can look at your screen, then walk over and point at what you asked about."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "WhatsApp by voice",
  "body": "Send WhatsApp messages by voice, hear new messages read out, and start WhatsApp or FaceTime calls."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Braino lives in the notch",
  "body": "The MacBook notch becomes Braino's face, with eyes that blink, a dramatic start up and a glow at the edge of the screen while he listens."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Notch live activities",
  "body": "The notch shows timers, a calendar peek, unread counts, what is playing and live captions of what you said."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Music light show",
  "body": "When music plays, a tiny Braino dances in the notch and the screen glows in time with the beat."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Touch ID and wake word",
  "body": "Deleting files needs Touch ID, and you can opt in to waking Braino with your voice, processed on your Mac."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Smart file cleanup",
  "body": "Braino counts and finds files across your Mac and iCloud, suggests old ones to clean up, and asks before moving anything."
 },
 {
  "date": "2026-07-24",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Music mode comes to Chrome",
  "body": "The headphones, edge glow and music notes from the Mac now appear in the Chrome extension too."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Clicks and windows by voice",
  "body": "Braino can click buttons, arrange windows and act on selected text in any app."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Questions are not commands",
  "body": "Braino now understands what you mean before acting, and a question never triggers an action by accident."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "X stats on the Mac",
  "body": "Ask about your X account to hear your stats and mentions, with a stats panel in the notch."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Tab tools by voice",
  "body": "Close all your tabs or ask how many you have open, and Braino tells you what you seem to be doing."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Meeting recorder",
  "body": "Braino notices a meeting, records it, takes live notes in a glass panel and syncs them to your dashboard."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Gmail, Maps, Amazon and research",
  "body": "Reply to Gmail, look up places, search Amazon, research across several tabs and send things to your phone."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Screen recording and screenshots",
  "body": "Say 'record this' to record your screen with sound, or ask for a screenshot."
 },
 {
  "date": "2026-07-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Wallpaper changes by voice",
  "body": "Ask Braino to change your wallpaper."
 },
 {
  "date": "2026-07-26",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Notch teaser film",
  "body": "A short teaser film showing Braino living in the notch."
 },
 {
  "date": "2026-07-27",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Voice Commands and Modes",
  "body": "Set your own phrases that open the sites you choose, grouped into modes, with the notch narrating each run."
 },
 {
  "date": "2026-07-27",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Dashboard redesign",
  "body": "The dashboard moved to a warm paper style with a new typeface."
 },
 {
  "date": "2026-07-27",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Braino OS launch page",
  "body": "A new launch page where the notch itself is the navigation, and first time visitors wake Braino by clicking his eyes."
 },
 {
  "date": "2026-07-27",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Product overview and emotion engine pages",
  "body": "New pages explain Braino and show an animated, heart-shaped look at how he feels."
 },
 {
  "date": "2026-07-29",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Waitlist homepage",
  "body": "The homepage became a waitlist with a clean, phone-friendly signup and an option to get every update."
 },
 {
  "date": "2026-07-29",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Braino Studio",
  "body": "A showcase of Braino Studio joined the waitlist page."
 },
 {
  "date": "2026-08-04",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Idea tracker and engine log",
  "body": "New pages track ideas and log every time Braino's thinking engine runs, so it can be checked and tuned."
 },
 {
  "date": "2026-08-05",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Emotions read the person, not the words",
  "body": "Braino's feelings engine now reacts to how you are, not just the words you use."
 },
 {
  "date": "2026-08-05",
  "version": "1.0.0",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "The notch comes to Chrome",
  "body": "A new Chrome version with the notch design from the Mac, downloadable from the homepage."
 },
 {
  "date": "2026-08-05",
  "version": "2.0.0",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Notch 2.0",
  "body": "The Chrome notch gets a real talking mouth, subtitles, one-time sign in, Command twice to summon Braino and dragging."
 },
 {
  "date": "2026-08-05",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Moonwalk party trick",
  "body": "Braino plays Billie Jean and does a real moonwalk across your Mac screen."
 },
 {
  "date": "2026-08-05",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "WhatsApp waits until it is ready",
  "body": "Braino now waits for WhatsApp to open before sending, so messages do not get lost."
 },
 {
  "date": "2026-08-06",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Waitlist polish and a download button",
  "body": "The waitlist got a sharper headline and better phone layout, and the product page has an extension download button."
 },
 {
  "date": "2026-08-06",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "New",
  "title": "Morning greeting in the notch",
  "body": "Braino greets you in the notch based on the time of day, on both Chrome and Mac."
 },
 {
  "date": "2026-08-07",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Voice that works like the Mac",
  "body": "Chrome voice was rebuilt to match the Mac: faster turns, easy interrupting, no sign-in loop, and roaming Braino stays on screen."
 },
 {
  "date": "2026-08-07",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Delegate leaves your tab alone",
  "body": "Tasks no longer take over the tab you are using, and the shortcut keys behave the same every time."
 },
 {
  "date": "2026-08-08",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "One brain for every task",
  "body": "A single thinking layer now decides every step of a task, in the browser and as a backup on the Mac."
 },
 {
  "date": "2026-08-08",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Fixed",
  "title": "Crisis replies and language drift",
  "body": "Braino now responds properly to someone in crisis and no longer drifts into other languages on voice."
 },
 {
  "date": "2026-08-08",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Touch ID unlocks hidden modes",
  "body": "Hidden voice modes are now unlocked with Touch ID instead of a password."
 },
 {
  "date": "2026-08-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Meeting recorder and on-device lecture transcription",
  "body": "The meeting recorder shipped, along with live lecture transcription that runs on your Mac."
 },
 {
  "date": "2026-08-11",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "One-page product site",
  "body": "A new one-page product site, with the waitlist kept on the home page until it is ready."
 },
 {
  "date": "2026-08-12",
  "version": "",
  "product": "Braino Browser",
  "kind": "Improved",
  "title": "Browser final night build",
  "body": "Braino Browser got a morning greeting, notch transcripts, a recording indicator and a mascot that stays on screen."
 },
 {
  "date": "2026-08-12",
  "version": "",
  "product": "BrainoX",
  "kind": "New",
  "title": "BrainoX command center",
  "body": "A new command center for planning and queueing posts to X, with a safety check and a daily briefing."
 },
 {
  "date": "2026-08-13",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Disk storage and Mac-wide search",
  "body": "Braino knows what is filling your disk and can search the contents of files across your Mac."
 },
 {
  "date": "2026-08-13",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Braino on any website",
  "body": "Add one line to a website and Braino appears there, walking around with voice and chat."
 },
 {
  "date": "2026-08-14",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Monday Mode",
  "body": "Monday Mode got real refusals and a red shimmer, plus its own public page."
 },
 {
  "date": "2026-08-14",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Setup flow",
  "body": "A new setup flow makes Braino yours before you even install him."
 },
 {
  "date": "2026-08-15",
  "version": "",
  "product": "Braino for Chrome",
  "kind": "Improved",
  "title": "Braino answers first, short and honest",
  "body": "Braino now gives the answer first, keeps it short, and chooses honest over nice."
 },
 {
  "date": "2026-08-17",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Foundry pitch deck",
  "body": "A new pitch deck page for Braino for Founders."
 },
 {
  "date": "2026-08-17",
  "version": "4.0.0",
  "product": "Braino Browser",
  "kind": "New",
  "title": "Braino Browser 4.0",
  "body": "The final browser build gets its own version number and download."
 },
 {
  "date": "2026-08-18",
  "version": "4.1.0",
  "product": "Braino Browser",
  "kind": "Improved",
  "title": "Braino Browser 4.1",
  "body": "The browser now has the Mac's black notch look, one Braino at a time, a recorder that stays out of the way and no more getting stuck while thinking."
 },
 {
  "date": "2026-08-19",
  "version": "",
  "product": "BrainoX",
  "kind": "New",
  "title": "Braino for X",
  "body": "Braino learns how you write on X, shows a readable dashboard, and answers 'How's my X?' in full. Posting help works on browser and Mac."
 },
 {
  "date": "2026-08-19",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "LinkedIn support and Braino for X page",
  "body": "LinkedIn joins X, and a new page explains how the X features work."
 },
 {
  "date": "2026-08-19",
  "version": "4.2.0",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Braino for Mac 4.2",
  "body": "Only one Braino shows on screen, and he sits still during your meetings."
 },
 {
  "date": "2026-08-20",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "New homepage with pricing",
  "body": "The site became one page with a dark look, a box that reads what you do, an FAQ, three simple pricing plans and a Braino Distra page."
 },
 {
  "date": "2026-08-20",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Play films and shows on Netflix",
  "body": "Tell Braino to put on a film or a specific episode and he opens it on Netflix, on the right profile."
 },
 {
  "date": "2026-08-20",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Automatic receipts",
  "body": "A receipt is created and sent automatically when you pay."
 },
 {
  "date": "2026-08-21",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Locked modes explain themselves",
  "body": "A locked mode now tells you what it will accept."
 },
 {
  "date": "2026-08-21",
  "version": "",
  "product": "Braino Foundry",
  "kind": "New",
  "title": "Braino Code",
  "body": "Braino Code shipped, and the site split into two tiers."
 },
 {
  "date": "2026-08-22",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "'Braino, stop listening'",
  "body": "Saying 'Braino, stop listening' now does the same as tapping Control twice."
 },
 {
  "date": "2026-08-22",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Full-screen hero and mobile fixes",
  "body": "The homepage film fills the first screen, the footer game starts when you choose, and phone text and buttons are easier to use."
 },
 {
  "date": "2026-08-23",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Pitch deck and research pages",
  "body": "A rebuilt pitch deck, a research summary, a presenter teleprompter and a fixed PDF for all browsers."
 },
 {
  "date": "2026-08-23",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Watch Braino work",
  "body": "The 'Who is Braino?' section now shows him working, not just describes him."
 },
 {
  "date": "2026-08-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Braino OS full screen",
  "body": "Ask to see Braino OS and your whole screen shows its four systems, lit up and talking, in any colour you ask for."
 },
 {
  "date": "2026-08-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Lecture mode hears and cleans up",
  "body": "BrainoHERA lecture transcription now actually hears you and tidies the text."
 },
 {
  "date": "2026-08-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Smarter, quicker Mac Braino",
  "body": "The Mac now uses the same thinking as the browser, thinks without being asked, lets you change your mind mid task, and stops hearing his own speakers."
 },
 {
  "date": "2026-08-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Dance on request",
  "body": "Ask Braino to dance on the Mac and he really does."
 },
 {
  "date": "2026-08-25",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Idle wallpaper screen",
  "body": "When you step away, Braino puts up a screen of his own. Press Shift twice to show it."
 },
 {
  "date": "2026-08-26",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Eleven wallpapers that take turns",
  "body": "Eleven idle looks rotate, with a battery display and clearer settings."
 },
 {
  "date": "2026-08-27",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Hears you while he works",
  "body": "Braino now listens while working, does what he said he would, and looks at the screen when he gets stuck."
 },
 {
  "date": "2026-08-28",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Fetch and organise anything",
  "body": "Ask Braino to fetch and organise anything you name."
 },
 {
  "date": "2026-08-28",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Pitch deck v10 and v11",
  "body": "The pitch deck was rebuilt for a four minute slot."
 },
 {
  "date": "2026-08-29",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Type to Braino",
  "body": "You can now click the notch and type to Braino instead of talking."
 },
 {
  "date": "2026-08-29",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Reads the real web page",
  "body": "Braino reads the actual page in Chrome instead of the window around it, and can no longer click into the wrong app."
 },
 {
  "date": "2026-08-30",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Connect Notion",
  "body": "A Notion card lets you connect Notion so Braino can use it."
 },
 {
  "date": "2026-08-30",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Get started opens onboarding",
  "body": "Get started now opens the setup flow instead of downloading a file, and signing in brings you back to it."
 },
 {
  "date": "2026-08-30",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "The pitch minute",
  "body": "Press Command Shift P and Braino gives the pitch himself, with a live demo."
 },
 {
  "date": "2026-08-31",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Braino writes and posts for you",
  "body": "In the demo Braino writes a post, presses Post himself and it turns green."
 },
 {
  "date": "2026-08-31",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Dance without listening",
  "body": "When Braino comes out of the notch to dance, nothing else is listening."
 },
 {
  "date": "2026-09-03",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Deep Work research writes a full document",
  "body": "Ask Braino to research something and he keeps digging, then writes it up as a proper document with a theme, an overview, a word count and its sources marked."
 },
 {
  "date": "2026-09-03",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Brainotes: one shelf for your notes",
  "body": "A new notes tab keeps everything you have written down in one place."
 },
 {
  "date": "2026-09-03",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Live lecture mode with words on screen",
  "body": "Braino writes down a lecture word by word as it is spoken, and now holds up for about forty minutes. He can also listen to a whole room, not just a speaker."
 },
 {
  "date": "2026-09-04",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Stop a lecture and get notes",
  "body": "Pressing stop now turns the lecture into tidy notes. The lecture panel is a simple rectangle with working buttons and an easy way out."
 },
 {
  "date": "2026-09-04",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Typing notch no longer gets stuck",
  "body": "The notch you type into can no longer get stuck open, and Braino only walks where you tell him to."
 },
 {
  "date": "2026-09-04",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Redesigned dashboard",
  "body": "A cleaner dashboard with a split layout and screens for tasks, memory and settings, with Braino standing in the header."
 },
 {
  "date": "2026-09-05",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Homepage explains what Braino does",
  "body": "The homepage now shows what Braino can actually do before asking you to choose."
 },
 {
  "date": "2026-09-06",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Mac sign-in sticks",
  "body": "Signing in on the Mac now works reliably, even through Chrome or a brief network hiccup."
 },
 {
  "date": "2026-09-07",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Smarter help on hard web tasks",
  "body": "When Braino gets stuck on a website, a stronger helper steps in and can read several pages at once. Stop now really stops, and saying his name alone is no longer treated as a command."
 },
 {
  "date": "2026-09-07",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "He learns from what went wrong",
  "body": "Braino now looks ahead, remembers what he knows about you, and learns from his mistakes."
 },
 {
  "date": "2026-09-10",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "First run welcome and boot screen",
  "body": "A new first run experience: a boot screen, Braino flying into the notch, a few questions and a hello."
 },
 {
  "date": "2026-09-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "He answers only when called",
  "body": "Braino now responds when you call him and stays quiet otherwise."
 },
 {
  "date": "2026-09-12",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Brainotes public library",
  "body": "A public library of notes, each with its own link you can share."
 },
 {
  "date": "2026-09-16",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Launch teaser for 16 October",
  "body": "A fast teaser film announcing the launch on 16 October 2026: stop using your Mac, start talking to it."
 },
 {
  "date": "2026-09-17",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Hey Braino wakes him reliably",
  "body": "Saying Hey Braino wakes him every time, the notch shows when he can hear you, and background noise no longer fires commands. A Stop button is now there too."
 },
 {
  "date": "2026-09-17",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Double-click opens his settings",
  "body": "Double-click Braino and the notch opens into his settings. A stealth option and a quieter notch were added too."
 },
 {
  "date": "2026-09-17",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Dictation pastes cleaned-up words",
  "body": "When you dictate, Braino shows your words as you speak and pastes a cleaned-up version, even into text boxes it cannot see."
 },
 {
  "date": "2026-09-17",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Apps and calls open correctly",
  "body": "Open Google Meet opens Meet, YouTube opens in a second, nicknames like Iloo reach the right contact, and money is said the Indian way."
 },
 {
  "date": "2026-09-18",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Your college timetable, by voice",
  "body": "Braino reads your timetable and assignments from your college portal, so you can ask what is due this week, your next class, or what you missed yesterday. Attendance too."
 },
 {
  "date": "2026-09-18",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "He remembers what worked",
  "body": "Braino remembers what you meant by it, what worked before and his history with you, and will not claim a task is done when nothing happened."
 },
 {
  "date": "2026-09-19",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Affective company website",
  "body": "A new company site for Affective, with Braino as its first product: stop using your computer, start talking to it."
 },
 {
  "date": "2026-09-20",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "One Braino, three models",
  "body": "A single page explains Braino and the three versions of him."
 },
 {
  "date": "2026-09-20",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Watch Braino learn",
  "body": "A new learning page shows how Braino gets better over time."
 },
 {
  "date": "2026-09-21",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Simple or detailed explanations",
  "body": "The site has a switch between plain words and the technical version, and Braino's page gets a little game."
 },
 {
  "date": "2026-09-23",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Braino gets his own page and store",
  "body": "Affective is the front door and Braino has his own page, plus a store where you get him."
 },
 {
  "date": "2026-09-23",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Launch countdown on your desktop",
  "body": "Braino peeks in from the edge of your screen with a countdown to launch."
 },
 {
  "date": "2026-09-24",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "One brain decides, then remembers",
  "body": "Braino now works out what you want first and keeps a memory of it, making answers more consistent."
 },
 {
  "date": "2026-10-02",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Real site with Braino first",
  "body": "The Affective site is ready as the real site: Braino first on the home page, early access on his page, and better previews when you share a link."
 },
 {
  "date": "2026-10-10",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Brand new onboarding",
  "body": "Setup starts after sign-in and walks you through meeting Braino, making him yours, trust and a first try, in the website's look with pixel art."
 },
 {
  "date": "2026-10-10",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Talk me through it",
  "body": "On longer jobs Braino says Got it and tells you each step out loud."
 },
 {
  "date": "2026-10-10",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "What's up is a greeting",
  "body": "Saying what's up no longer turns the volume up."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Better follow through on tasks",
  "body": "Braino reads research answers aloud, reports what really happened, offers the next step, stops honestly when stuck and never gives two answers."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Notch holds one steady shape",
  "body": "Your words, his thinking and his reply now swap inside one open notch instead of jumping around. When idle it shows just his eyes."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Without subtitles mode",
  "body": "A quiet notch that stays at its normal size and shows just Listening, Thinking or Speaking with a thin colour line. Pressing Control twice sends a gentle pulse along the screen edge."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "Wallpapers set the right picture",
  "body": "Ask for a wallpaper and Braino finds it, checks it is the right picture before setting it on every screen, and tries another if you say that's not it."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Google Calendar by voice",
  "body": "Create meetings with a Meet link, list, reschedule, cancel or join your next one, just by asking."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Open the article from answers",
  "body": "Search answers now offer their articles in the notch. Tap one, or say open the article."
 },
 {
  "date": "2026-10-11",
  "version": "",
  "product": "Braino for Mac",
  "kind": "Fixed",
  "title": "WhatsApp badge and thinking fixes",
  "body": "The WhatsApp message badge clears properly and tapping it shows the messages. The notch no longer hangs on thinking."
 },
 {
  "date": "2026-10-13",
  "version": "12.0.48",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Installable Braino app for testers",
  "body": "Braino now comes as an app you can install from a disk image, with his drawings and notch fonts included. It has a Quit option and stays in the notch."
 },
 {
  "date": "2026-10-13",
  "version": "12.0.48",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Hey Braino switch in settings",
  "body": "Turn Hey Braino on or off in Voice and listening, and choose it during onboarding. The app window now scrolls."
 },
 {
  "date": "2026-10-13",
  "version": "12.0.48",
  "product": "Braino for Mac",
  "kind": "Improved",
  "title": "Connect your college portal in onboarding",
  "body": "Students can connect their college portal during setup, saved privately, so Braino can answer timetable questions."
 },
 {
  "date": "2026-10-13",
  "version": "12.0.48",
  "product": "Braino for Mac",
  "kind": "New",
  "title": "Choose how Braino learns",
  "body": "Onboarding asks whether Braino should learn your day or only learn when you ask. You can change it later in Settings."
 },
 {
  "date": "2026-10-13",
  "version": "",
  "product": "Website",
  "kind": "Improved",
  "title": "Redesigned Braino page",
  "body": "Braino's page gets a blue sky footer with his game, a real notch clock on the MacBook, Instagram and X links, and a clear note about what he sees on your screen."
 },
 {
  "date": "2026-10-13",
  "version": "",
  "product": "Website",
  "kind": "New",
  "title": "Trust page and privacy answers",
  "body": "A new Trust page explains how your data is handled, with privacy FAQs and an honest note about screen access."
 },
 {
  "date": "2026-10-13",
  "version": "",
  "product": "Braino Foundry",
  "kind": "Improved",
  "title": "Foundry hidden for now",
  "body": "Braino Foundry is hidden everywhere for the moment so the focus stays on Braino."
 }
];
