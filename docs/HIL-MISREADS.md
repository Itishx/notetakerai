# HIL misreads: the 171

Every Mac command the old word patterns misunderstood (183 rows, 171 distinct commands), from the real log (24 Jul to 18 Sep 2026, 1,616 commands). This is the test set for HIL-first: each of these should come out right before launch.

Run them against the live router with `npm run hil:misreads` (needs OpenAI credit). Data: `tests/fixtures/hil-misreads.json`.

## A. Filler taken as a person's name (10)

| # | Date | Command | Old reply |
|---|---|---|---|
| 191 | 2026-07-25 | Ek minute, I'll call you later | I could not find a number for you later. Say "Braino, remember you later's number is" and the number. |
| 233 | 2026-07-26 | Braino open WhatsApp and open Prakhar brothers chat | What should I say to and open Prakhar brothers chat? |
| 380 | 2026-07-29 | Can you please open WhatsApp and open the group First Order? | What should I say to and open the group First Order? |
| 1533 | 2026-09-17 | Braino, can you please open WhatsApp for me? | What should I say to for me? |
| 1534 | 2026-09-17 | Can you open WhatsApp for me? | What should I say to for me? |
| 1535 | 2026-09-17 | How are you Braino | I could not find a number for for me. Say "Braino, remember for me's number is" and the number, and I will keep it. |
| 894 | 2026-08-20 | Can you maybe not call me an idiot please? | Fine, I won’t call you an idiot. I couldn’t find a number for “me an idiot”; say, “Braino, remember me an idiot’s number is [number],” and I |
| 1335 | 2026-08-29 | Can you please tell me how I can fix this Apple call failed thing? | I could not find a number for failed thing. Say "Braino, remember failed thing's number is" and the number. |
| 496 | 2026-08-06 | Braino, can you please open the Hicksfield team's email that you see on my screen? | I could not find an email address for that you see on my screen in Contacts. Type or say the email address. |
| 1043 | 2026-08-24 | Okay, can you please open the email from Anthropic BBC today that I received? | I could not find an email address for from Anthropic BBC today in Contacts. Type or say the email address. |

## B. Open or find email read as write email (3)

| # | Date | Command | Old reply |
|---|---|---|---|
| 459 | 2026-08-03 | Okay, Braino, can you please open Gmail for me? | What should the email say? |
| 934 | 2026-08-22 | Braino, open the email where you see open houses happening today. | What should the email say? |
| 1178 | 2026-08-25 | Braino, find the latest email I received from Anthropic, put the invoice number in a new note, and then play something instrumental. | What should the email say? |

## C. An old question grabs the next command (29)

| # | Date | Command | Old reply |
|---|---|---|---|
| 62 | 2026-07-25 | Can you please play 1989 by Nightly on Spotify? | I walked everything: 5499 files across 860 folders. Desktop has 692 files in 152 folders. Downloads has 2399 files in 388 folders. Documents |
| 65 | 2026-07-25 | Open my other Chrome profile. | No recording then. I will sit this one out quietly. |
| 78 | 2026-07-25 | Please play Like I Do by Nightly and Fly By Midnight on Spotify. | No recording then. I will sit this one out quietly. |
| 1224 | 2026-08-26 | You know send that link to Browder on WhatsApp. | No recording then. I will sit this one out quietly. |
| 1472 | 2026-09-07 | can you send it then | No recording then. I will sit this one out quietly. |
| 84 | 2026-07-25 | Norman, can you please click on the 'Send Directions to iPhone' on the screen? | That didn't look like a number. Try again — say send to phone. |
| 460 | 2026-08-03 | Braino, this is a bug. | I could not find an email address for for me in Contacts. Type or say the email address. |
| 461 | 2026-08-03 | Braino, can you please undo all the organized files please? | I still need the email address. Type it like name@example.com, or say cancel. |
| 497 | 2026-08-06 | Can you please send an email to inzamamadil10@gmail.com saying I'll be late tomorrow? | Done. I sent the email to that you see on my screen. |
| 935 | 2026-08-22 | Hey abang. | I could not find an email address for where you see open houses happening today in Contacts. Type or say the email address. |
| 1044 | 2026-08-24 | Braino can you please open LinkedIn, go to jobs and then search for a product designer role in Bangalore | I still need the email address. Type it like name@example.com, or say cancel. |
| 1179 | 2026-08-25 | Braino, open the Note-Taker-AI repository on GitHub, find the newest commit and tell me the title and when it was committed. Braino, are you listening? | I could not find an email address for I received from Anthropic, put the invoice number in a new note, and then play something instrumental  |
| 1180 | 2026-08-25 | Could you please take care of the anthropic task I just told you? | I still need the email address. Type it like name@example.com, or say cancel. |
| 1181 | 2026-08-25 | Braino stop that task. Stop. Stop. | I still need the email address. Type it like name@example.com, or say cancel. |
| 1055 | 2026-08-24 | Okay, let me spread it out for you. It is C-L-A-U-D-E design. | I select the newest email so Gmail can expose the delete control for that specific message. cannot be undone. Want me to go ahead? |
| 1056 | 2026-08-24 | Braino open Claude design and navigate to the Braino project. | Delete the selected Jio Financial Services email? |
| 1248 | 2026-08-26 | Braino, could you please book me a flight from Hyderabad to Bangalore for tomorrow morning? | The Google payment form is waiting for you to enter the card details directly. Once it is filled, tell me and I can continue to the Develope |
| 1249 | 2026-08-26 | On MakeMyTrip | Please enter the card details directly into this Google payment form, then tell me when the form is filled. |
| 1252 | 2026-08-26 | The thing is Braino, I'm a little hesitant to launch you because that would mean that you are being put out in the front of the world, and not just on my Mac an | That makes sense. Do you want to pause the Developer Dashboard setup while you think about the launch, or should I keep going? |
| 1319 | 2026-08-27 | Braino did anyone tell you that you're so smart? | You’re sweet, but connect to what exactly, DJ, a person, or a service? |
| 1389 | 2026-08-31 | And he ended with a moonwalk. | Which paragraph should I delete? I only see the Braino dashboard, not editable text. |
| 1419 | 2026-09-03 | Braino, can you please open YouTube? | What should I do with “Stop caption abort”? Do you want me to stop captions, or abort the current action? |
| 1451 | 2026-09-06 | Braino can you please open Spotify and Prabhas | WhatsApp is asking for a phone number. Enter it and finish linking WhatsApp, then tell me when Pedro's chat is available. |
| 1586 | 2026-09-18 | hey | What phone number should I use for Abhishek Gaur MUSA? |
| 1588 | 2026-09-18 | Spell Bratislava | What phone number should I use for Abhishek Gaur MUSA? |
| 1589 | 2026-09-18 | Check out the game. | What phone number should I use for Abhishek Gaur MUSA? |
| 1590 | 2026-09-18 | It's not up to my expectations. | What phone number should I use for Abhishek? |
| 626 | 2026-08-09 | Braino I got broken up with | I can’t tell the exact time from what I have here. The site is already open, and I don’t have a start timestamp to compare against. |
| 789 | 2026-08-13 | Can you please empty the trash? | Understood, leaving everything as is. |

## D. Unknown open X opens a random file (15)

| # | Date | Command | Old reply |
|---|---|---|---|
| 40 | 2026-07-24 | Can you please open a machine learning article on Medium? | Opened content.js. |
| 56 | 2026-07-25 | Can you please open Coursera for me? | Opened A _ Signature _ Hi_ I_m Braino (1).png. |
| 183 | 2026-07-25 | Okay Braino can you please open my Chrome profile | Opened A _ Signature _ Hi_ I_m Braino (1).png. |
| 241 | 2026-07-26 | Can you please open an incognito window for me? | Opened A _ Signature _ Hi_ I_m Braino (1).png. |
| 307 | 2026-07-28 | Braino can you please open Claude settings usage for me | Opened A _ Signature _ Hi_ I_m Braino (1).png. |
| 69 | 2026-07-25 | Can you please delete that email? | I found A _ Signature _ Hi_ I_m Braino (1).png. Say yes, delete it to move it to Trash, or say cancel. |
| 295 | 2026-07-28 | Braino, please delete the about Donald Trump.jpg | I found A _ Signature _ Hi_ I_m Braino (1).png. Say yes, delete it to move it to Trash, or say cancel. |
| 242 | 2026-07-26 | And any voice command I give, Braino should just open that website directly. | Opened Braino_ Don’t Blink. .mp3. |
| 250 | 2026-07-27 | Then can you please open something for me? | Opened Braino_ Don’t Blink. .mp3. |
| 938 | 2026-08-22 | Open Word | Opened BrainoWakeWord.app. |
| 1485 | 2026-09-10 | Open Braino | Opened braino.mp3. |
| 1084 | 2026-08-24 | Braino, can you please open the Downloads folder. | I found it in Apple Notes. The note "Okay this is Shah Rukh's interview for ten questions I have to ask…" in Notes says: "...ounder of Dineb |
| 384 | 2026-07-29 | Yes, open it. | Opened Itish Pande — Mesa Resume.pdf. |
| 981 | 2026-08-24 | Open it | Opened Itish Pande — Mesa Resume.pdf. |
| 4 | 2026-07-24 | Can you please open it and show me the post you posted? | Opening Real World Cricket Games 2026. |

## E. The word page opens Apple Pages (5)

| # | Date | Command | Old reply |
|---|---|---|---|
| 19 | 2026-07-24 | Can you please open the OpenAI usage page for me? | Opening Pages. |
| 31 | 2026-07-24 | Can you please open the Amazon page for the book The Subtle Art of Not Giving a Fuck? | Opening Pages. |
| 67 | 2026-07-25 | Can you please open the Vue developer page for me? | Opening Pages. |
| 1155 | 2026-08-25 | No, I don't see the page open. Can you please open the page for me? | Opening Pages. |
| 1265 | 2026-08-27 | Could you please open the page instead? | Opening Pages. |

## F. Leftover words become a Mac file search (27)

| # | Date | Command | Old reply |
|---|---|---|---|
| 150 | 2026-07-25 | Braino, can you please see my screen and then open this download in my files? | I searched the Mac, but did not find this download in my. |
| 152 | 2026-07-25 | Can you please open this in my Mac? | I searched the Mac, but did not find this. |
| 153 | 2026-07-25 | Okay, can you please open the WWDC image I just downloaded? | I searched the Mac, but did not find the WWDC I just downloaded. |
| 309 | 2026-07-28 | Can you please open Fish audio for me? | I searched the Mac, but did not find Fish me. |
| 310 | 2026-07-28 | No, I want you to open the website Fish Audio. | I searched the Mac, but did not find website Fish. |
| 441 | 2026-08-01 | Please open the website for fish audio. | I searched the Mac, but did not find website fish. |
| 442 | 2026-08-01 | Braino open Chrome and look for the website Fish Audio | I searched the Mac, but did not find Chrome and look the website Fish. |
| 396 | 2026-07-29 | Can you please open that note? | I searched the Mac, but did not find that note. |
| 408 | 2026-07-29 | Braino, you can stop recording my screen and delete this video. | I searched the Mac, but did not find this. |
| 410 | 2026-07-29 | Can you please open that recording? | I searched the Mac, but did not find recording. |
| 566 | 2026-08-08 | Please rename the highlighted screenshot to Braino demo. | I searched the Mac, but did not find highlighted screenshot. |
| 1077 | 2026-08-24 | Braino can you please rename this file to invoice one. | I searched the Mac, but did not find this. |
| 650 | 2026-08-10 | Braino can you please show me some good songs by Don Toliver? | I searched the Mac, but did not find some good by Don Toliver. |
| 680 | 2026-08-10 | Braino, can you please open my photos? | I searched the Mac, but did not find my. |
| 1329 | 2026-08-28 | open my notes. | I searched every file name, every file's content Spotlight can read, and every note in Apple Notes for "my" — nothing on this Mac. It may be |
| 790 | 2026-08-13 | No no I mean can you please empty my trash | I searched the Mac, but did not find No no I mean can you please empty my. |
| 795 | 2026-08-13 | Delete the last character. | I searched the Mac, and, shockingly, I did not find a file named last character. Apparently the tiny goblin you asked for does not exist, yo |
| 1005 | 2026-08-24 | Delete the last paragraph. | I searched the Mac, but did not find last paragraph. |
| 827 | 2026-08-15 | Braino, this is very rude of you, I'm sorry, but I'll have to remove you and delete your existence. | I searched the Mac, but couldn’t find you to delete your existence. Apparently even your dramatic execution requires better file management, |
| 1078 | 2026-08-24 | Braino, can you please show me a few photos of Kiara Advani? | I searched every file name, every file's content Spotlight can read, and every note in Apple Notes for "a few of Kiara Advani" — nothing on  |
| 1080 | 2026-08-24 | Show me a few photos of Kiara Advani. | I searched every file name, every file's content Spotlight can read, and every note in Apple Notes for "a few of Kiara Advani" — nothing on  |
| 1088 | 2026-08-24 | Okay, can you please open BookMyShow and then book me some movie tickets for Insidious for tomorrow morning in Hyderabad? | I searched every file name, every file's content Spotlight can read, and every note in Apple Notes for "BookMyShow and then book me some mov |
| 1133 | 2026-08-25 | Okay can you please open this song again for me on Spotify instead? | I searched every file name, every file's content Spotlight can read, and every note in Apple Notes for "this again me on Spotify instead" —  |
| 400 | 2026-07-29 | Remove the Spotify widgets for now. Remove today, no events coming up, battery, SK plan. I mean, remove them from the display, don't remove them from the code. | I searched the Mac, but did not find Spotify widgets now. Remove today, no events coming up, battery, SK plan. I mean, remove them from the  |
| 591 | 2026-08-08 | Remove from Chrome for now. | I searched the Mac, but did not find from Chrome now. |
| 672 | 2026-08-10 | It is not working okay. I still see deciding, hatching, thinking, calibrating for like 20 seconds on my fucking screen. Either way remove this part because it's | I searched the Mac, but did not find this part because it's acting as a fucking bug dude and it's making me lose my mind. |
| 690 | 2026-08-10 | Yes, please open the Bluetooth audio settings and diagnose this for me. | I searched the Mac, but did not find Yes, please the Bluetooth settings and diagnose this me. |

## G. Close X looks for an app called X (10)

| # | Date | Command | Old reply |
|---|---|---|---|
| 12 | 2026-07-24 | Can you close all the Claude tabs. | Claude exists, but I do not see it running right now. |
| 44 | 2026-07-24 | Braino can you please close the content.js.html file? | I could not find an app or known website called content.js.html file. |
| 239 | 2026-07-26 | Close your eyes | I could not find an app or known website called your eyes. |
| 291 | 2026-07-28 | Close the spreadsheet and open the calculator. | I could not find an app or known website called spreadsheet. |
| 615 | 2026-08-09 | Braino can you please close all the Netflix tabs? | I could not find an app or known website called all the netflix. |
| 638 | 2026-08-09 | Okay, can you please close justwatch.com | I could not find an app or known website called justwatch.com. |
| 995 | 2026-08-24 | Close your mind. | I could not find an app or known website called your mind. |
| 1193 | 2026-08-25 | Close all the tabs please. | I could not find an app or known website called all the tabs. |
| 1538 | 2026-09-17 | Can you please close all | WallpaperAgent exists, but I do not see it running right now. |
| 966 | 2026-08-23 | Braino exit mode. | AutomationModeUI exists, but I do not see it running right now. So, congratulations, you appear to have exited a mode that was not actually  |

## H. Filler words used literally as the title or search (21)

| # | Date | Command | Old reply |
|---|---|---|---|
| 113 | 2026-07-25 | Yes, just show me something on the map dude. | Here's something on the map dude on the map. |
| 122 | 2026-07-25 | Can you please show me some place on the map bro? | Here's some place on the map. |
| 130 | 2026-07-25 | Braino let's resume watching Little Brother on Netflix. Can you please open Netflix and create my Chrome profile and then, you know, watch that movie for me? | Netflix is open with Little Brother on Netflix. Can you please open Netflix and create my Chrome profile and then, you know, watch that movi |
| 299 | 2026-07-28 | Play my favorite song. | Playing Favorite Girl by Justin Bieber on Spotify. |
| 398 | 2026-07-29 | Braino, can you please play anything on YouTube, honestly? | Playing Honestly Anything by Unlikely - Topic on YouTube. |
| 514 | 2026-08-07 | Can you please play a song based on what you see on my screen? | Playing What You Saying by Lil Uzi Vert on Spotify. |
| 872 | 2026-08-20 | No, can you please play that for me? | Playing That’s So True by Gracie Abrams on Spotify. |
| 1140 | 2026-08-25 | Can you please play that song on Spotify? | Playing That Song by NIIVA on Spotify. |
| 1146 | 2026-08-25 | No, Braino, listen to me one last time, okay? Play IYKYK by Jiggy on Spotify. | Playing Last Time by Jxggi on Spotify. |
| 1186 | 2026-08-25 | Braino open Spotify, play the third song in my Discover Weekly, then close the tab and tell me what the song was. | Playing Discovery by Flame Timo, Sensory Meditation, Jasper Whisper, Nina Nalo, Randy Divine, Alma Lin on Spotify. |
| 377 | 2026-07-29 | Braino, can you please do some research about OnePlus Buds 4 and show me the relevant Amazon pages for it? | Here are options for it. Say click the first one, or the second, and I'll open it — then add to cart when you're ready. |
| 129 | 2026-07-25 | Braino, can you please show me some articles by Mark Manson? | Here are options for some articles by Mark Manson. Say click the first one, or the second, and I'll open it — then add to cart when you're r |
| 907 | 2026-08-20 | Braino can you please play any movie on Netflix | Could not find anything called "any movie". |
| 977 | 2026-08-24 | Can you please play any movie on Netflix? | Could not find anything called "any movie". |
| 908 | 2026-08-20 | Braino, what movie should I watch tonight? | Could not find anything called "what movie should I watch tonight". |
| 909 | 2026-08-20 | Braino, where can I watch Interstellar? | Could not find anything called "where can I watch Interstellar". |
| 976 | 2026-08-24 | Braino where can I watch the whole over movie that you just suggested? | Could not find anything called "the whole over movie that you just suggested". |
| 979 | 2026-08-24 | Yes, can you please play Scary Movie 6? | Could not find anything called "Yes, can you please play Scary Movie 6". |
| 1212 | 2026-08-26 | No, could you please change the wallpaper to one of your own designs? | I could not pull a one of your own designs image just now. Try once more, or say random wallpaper for a built-in one. |
| 1457 | 2026-09-06 | The research that you just made. | Done. I created the note in Apple Notes: The research that you just made. |
| 397 | 2026-07-29 | Braino which note did you just create? | Done. I created the note in Apple Notes: did you just create. |

## I1. One word fires the wrong feature (23)

| # | Date | Command | Old reply |
|---|---|---|---|
| 25 | 2026-07-24 | Ok can you please repeat it? | Repeat is off. |
| 26 | 2026-07-24 | Nooramin, can you please repeat the prompt for Claudecode I asked you to just give me? | Repeat is on. |
| 367 | 2026-07-29 | Can you please play some other video by Tanmay Bhatt. | Playing Tanmay Batra on Spotify. |
| 368 | 2026-07-29 | stop the current task | Paused Spotify. |
| 375 | 2026-07-29 | Braino, I recorded a screen recording video. | Recording your screen with audio. Say stop recording when you're finished. |
| 149 | 2026-07-25 | Show me images on the internet for MacBook wallpaper | Fresh look — that's Mac Yellow. |
| 1119 | 2026-08-25 | Braino, what is this website about? | Spotify is paused on Cruel Summer by Taylor Swift. |
| 1120 | 2026-08-25 | That's not what I'm asking you. I'm asking you can you please tell me what is this website about. | Spotify is paused on Cruel Summer by Taylor Swift. |
| 1372 | 2026-08-29 | Braino, can you please explain to me what this website is about? | Spotify is paused on Jolene by Dolly Parton. |
| 1373 | 2026-08-29 | Braino, can you please explain to me what this website is about? | Spotify is paused on Jolene by Dolly Parton. |
| 1374 | 2026-08-29 | Braino, Braino, Braino, what is this website about? | Spotify is paused on Jolene by Dolly Parton. |
| 1375 | 2026-08-29 | Listen to me, I am on a website, right? Explain to me what this website is about. | Spotify is paused on Jolene by Dolly Parton. |
| 1141 | 2026-08-25 | Mute the call. | Spotify volume set to 0%. |
| 1062 | 2026-08-24 | Nobreno please leave this meeting. | Recording. I can hear both sides of this, and it stays invisible if you share your screen. |
| 1063 | 2026-08-24 | Braino I do not ask you to record the meeting, I ask you to end the meeting. | Already recording. I have not missed a word. |
| 180 | 2026-07-25 | Click the red button on the screen. | Clicked Redo. |
| 219 | 2026-07-26 | No, but I want to know how can I restart this extension, where do I click on the screen. | Clicked Screen Reader Optimized. |
| 1591 | 2026-09-18 | Can you please text Abhishek Gorr MESA on WhatsApp saying what's up bro, this is Braino? | Volume 100%. |
| 669 | 2026-08-10 | Braino, can you please open GitHub and navigate to the NoteTaker AI repository? | Directions to the NoteTaker AI repository are up. |
| 670 | 2026-08-10 | Braino I asked you to open GitHub, not Google Maps, you dumbfuck. | Google Maps can help you search locations, get directions and routes, and explore nearby places. (support.google.com) If you want, send me:  |
| 1271 | 2026-08-27 | Okay Braino, can you please navigate to Google Meet and schedule a new call with me for 5 pm today? | Directions to Google Meet and schedule a new call with me for 5 pm today are up. |
| 319 | 2026-07-28 | Braino, can you please do some research on the Kimi Composer 2.6 and tell me if it's good for coding? | ## Realtime Spend Receipt - **Current live session** — $0.00 across 0 turns and 0.4 min. Breakdown: OpenAI Realtime $0.00, speech-to-text $0 |
| 753 | 2026-08-12 | Compare the flight prices from Hyderabad to Mumbai for both Friday evening and Saturday morning on MakeMyTrip. Do a web search, tell me what you find. | ## Realtime Spend Receipt - **Current live session** — $0.00 across 0 turns and 0.5 min. Breakdown: OpenAI Realtime $0.00, speech-to-text $0 |

## I2. Sent to web search instead of doing it (10)

| # | Date | Command | Old reply |
|---|---|---|---|
| 1553 | 2026-09-17 | Braino can you please open Google Meet? | If you mean “meet” as a word, it commonly means to see and talk to someone for the first time, or more generally to come together for a plan |
| 36 | 2026-07-24 | Can you please open my resume from Google Docs? | Do you mean Google Docs or OpenAI docs? - Google Docs has an official help center and training pages for creating, editing, sharing, offline |
| 38 | 2026-07-24 | No, I said open my resume from Google Docs. | Did you mean Google Docs or GitHub Docs? - Google Docs is Google’s online document editor and help center for it covers creating and editing |
| 39 | 2026-07-24 | Ok, can you just open Google Docs for me | If you mean Google Docs, the official docs are here: - Get started with Docs: Google says Docs lets you create and edit text documents in yo |
| 766 | 2026-08-13 | Braino, can you run a system-wide search for the ODM number? | “ODM number” is ambiguous — there isn’t one universal meaning for it. Common uses of ODM include Original Design Manufacturer and, in Ohio M |
| 656 | 2026-08-10 | Okay Braino, now can you please search for any MESA emails? | If you mean MESA International (Manufacturing Enterprise Solutions Association), the main contact emails I found are: - General / headquarte |
| 227 | 2026-07-26 | Braino can you please look at my screen and point to Gopal Malvi's email? | I can’t see your screen from here, so I can’t point to the email directly. If you upload a screenshot, I can identify it for you. I did find |
| 229 | 2026-07-26 | Look at my screen and point to Gopal Malvi. | I can’t see your screen from here, so I can’t point to Gopal Malvi directly. I did find that the name appears to match multiple people onlin |
| 774 | 2026-08-13 | So like did he not want to open YouTube then? | Yeah, I can’t tell from the web results whether he did or didn’t want to open YouTube, because none of them actually say what that person wa |
| 1153 | 2026-08-25 | Braino, could you please open and create a new Google Doc and then write in three lines about what you did in the last one hour? | 1. I checked a simple three-line journaling format, which is commonly used for short daily logs. (blog.qdiary.app) 2. I used that format to  |

## I3. Chat or background speech treated as a command (8)

| # | Date | Command | Old reply |
|---|---|---|---|
| 1215 | 2026-08-26 | تو I can't really compete with Mac OS کے wallpaper | Fresh look — that's iMac Blue. |
| 715 | 2026-08-11 | to avoid adding three net new meetings to stakeholders' calendars, it would be to a sort of two-month rotation. | Done. I organized 5 Desktop files by date into Braino Organized: 5 By Date/2026-08. Existing folders were left alone, and I saved undo for i |
| 385 | 2026-07-29 | Braino, let's play a game, okay? | Playing GAMEPLAY FUNK! - Super Slowed by ANDROMEDA on Spotify. |
| 560 | 2026-08-08 | Braino, let's play a game. | Playing Gameboy by KATSEYE on Spotify. |
| 329 | 2026-07-28 | Nithin listen to me. | Playing Give Me Everything (feat. Nayer) by Pitbull, AFROJACK, Ne-Yo, Nayer on Spotify. |
| 1279 | 2026-08-27 | How can I make you better? | Cursor failed to accept the improvement request on the second retry. I stopped after the repeated failure, so I did not get Braino's project |
| 499 | 2026-08-06 | Every five minutes it will look at my screen to know what I am doing. | You’re watching Munawar Faruqui’s “DHANDHO” standup on YouTube in Chrome, around the 43-minute mark. There are related comedy videos on the  |
| 347 | 2026-07-29 | Dude, while we are at it, add this capability to increase the size of the Braino mascot who's on the screen both in Chrome and extension. And how that will happ | I see a few: Braino : Your AI Browser Sidekick — notetakerai, or Braino : Your AI Browser Sidekick, Editor Group 1, or Braino : Your AI Brow |

## J1. Asked for something the sentence already gave (9)

| # | Date | Command | Old reply |
|---|---|---|---|
| 81 | 2026-07-25 | Could you please open Google Maps and show that to me? | I can help with that, but I need a place or address first—what location should I map? Google Maps lets you search for places, areas of inter |
| 1149 | 2026-08-25 | Can you please show me this location on Google Maps and then send it to my phone? | Which location should I show on Google Maps? |
| 420 | 2026-07-29 | Braino can you please loop this song from 126 to 130? | Tell me the loop range, like from two twenty to two twenty seven. |
| 421 | 2026-07-29 | Braino can you please loop this song from 126 to 127? | Tell me the loop range, like from two twenty to two twenty seven. |
| 422 | 2026-07-29 | Braino, can you please loop 10 by 10 again from 126 to 130? | Tell me the loop range, like from two twenty to two twenty seven. |
| 797 | 2026-08-14 | Braino can you please play Brabas on loop from 40 to 50 | I see Brabas from 40 to 50 playing on Spotify. What range should I loop? |
| 564 | 2026-08-08 | Can you please send Elua a text on WhatsApp saying I'll be home late? | Sure. Who should I send it to on WhatsApp? |
| 1585 | 2026-09-18 | He is stored in my contacts as Abhishek Gaur MUSA. Find it and text him. | What phone number should I use for Abhishek? |
| 1139 | 2026-08-25 | Braino, which song am I asking you to play? | Tell me the song name and I will play it on Spotify. |

## J2. Did only part of the command (9)

| # | Date | Command | Old reply |
|---|---|---|---|
| 59 | 2026-07-25 | Can you set an Ironman wallpaper? | Fresh look — that's iMac Blue. |
| 515 | 2026-08-07 | Braino can you help me set a wallpaper of spiderman? | Fresh look — that's iMac Purple. |
| 555 | 2026-08-08 | Braino can you please remind me to call my mom and also set an alarm for 7pm? | Alarm set for 7:00 PM. It is on the notch. |
| 661 | 2026-08-10 | Braino, can you please organize my desktop and change my wallpaper at the same time? | Done. I organized 9 Desktop files by type into Braino Organized: 9 Screenshots and Recordings. Existing folders were left alone, and I saved |
| 666 | 2026-08-10 | Braino, please open Medium and show me a few good machine learning articles. | Opening medium.com. |
| 667 | 2026-08-10 | Yeah, but I asked you to open Medium to show me your machine learning articles, not to just open Medium. | Opening medium.com. |
| 707 | 2026-08-11 | Can you open Instagram on Chrome? | Opening Google Chrome. |
| 930 | 2026-08-22 | Braino can you please open my Gmail and tell me the address for the open house I have today | Opening gmail.com. |
| 1091 | 2026-08-24 | Okay Braino, can you please close all my tabs, open cursor, and then play Baabaas on Spotify? | Playing Baba Maal Tej Aa by Gur Sekhon on Spotify. |

## K. Answered with advice instead of doing it (4)

| # | Date | Command | Old reply |
|---|---|---|---|
| 504 | 2026-08-07 | Braino can you please show me the pitch meeting for Spiderman Brand New Day on YouTube? | You want the YouTube pitch meeting, not the movie trailer. I can pull the exact video if you want. If you’re searching yourself, use this: S |
| 535 | 2026-08-07 | Braino, can you please show me Spider-Man brand new trailer on YouTube? | Search YouTube for “Spider-Man Brand New Day trailer”. The official one should be the first clean result if it’s up. |
| 1281 | 2026-08-27 | Open Google Meet and start an instant meeting for me please. | I can’t start the meeting for you from here, but I can tell you the fastest way to create an instant one in the main apps: - Microsoft Teams |
| 1282 | 2026-08-27 | Please open Google Meet and start a meeting for me. | I can’t start a Google Meet meeting from here because I don’t have access to your account or browser, but you can start one quickly in Googl |
