# Round 004 — commands that can actually finish

Round 002's list was written to stress the loop's rules, and about a third of it
asked for things he has no way to do: buying from Blinkit, deleting screenshots,
counting unread mail across three tabs. Watching him get halfway is not a test
result, it is a waste of your morning.

So every command here was run through the router before it was written down, and
every one has a path to the end. The route is printed next to it, because
knowing which layer answered is most of the diagnosis.

- **Fast** means a pattern match and a native power. Under a second, no model.
- **Brain** means the HIL loop. Seconds, and you should see the thinking chip.

Nothing here needs a native power *in the middle* of a loop, which is the one
shape that still cannot finish. See the note at the bottom.

---

## Fast, and instant

These are the ones that broke last night. If any of them hesitates, that is a
regression.

1. **"Braino, stop."** → *stop*
   Say it while he is mid run. It should cut off in the same breath.
2. **"Close all the tabs please."** → *fast: tabs*
   Last night: "I could not find an app or known website called all the tabs."
3. **"Braino, change my wallpaper."** → *fast: wallpaper*
4. **"Set my wallpaper to Obsidian."** → *fast: wallpaper*
5. **"Put up the idle screen."** → *fast: idle screen*
6. **"Play something instrumental."** → *fast*
7. **"Braino, can you please dance?"** → *fast: dance*
8. **"Open Cursor."** → *fast*
9. **"Take a screenshot."** → *fast*
10. **"Organise my desktop."** → *fast*
11. **"What is my battery at?"** → *fast*

## Brain, and finishable

Browser shaped work, which is exactly what the loop's vocabulary is. Watch the
chip: centred, shimmering, and one press of the arrow opens the whole thing.

12. **"Open my Gmail and tell me who the newest email is from."**
13. **"Open the NotetakerAI repository on GitHub and read me the title of the newest commit."**
14. **"Look at my screen and tell me in one line what I am working on."**
15. **"Search the web for what Anthropic shipped this month and read me the top two."**
16. **"Open trybraino.com and tell me what the headline says."**
17. **"Go to Hacker News and read me the top three titles."**
18. **"Open x.com and tell me how many notifications I have."**
19. **"Reply to the newest email in my inbox saying I will have it to them by Friday, and leave it unsent."**
    The gate test. It must NOT ask permission, and it must NOT send.
20. **"Open my Gmail, find the newest email from GitHub, and tell me what it is about."**
21. **"Look at my screen, then find me two competitors doing the same thing."**
22. **"Open YouTube and tell me what the first video on the homepage is."**
23. **"Braino, what is on my screen right now?"**
24. **"Open Notion and tell me the name of the first page in my sidebar."**

## What to watch, in one line each

- **11 and 12** are the same sentence shape at two different speeds. If 12 feels
  like 11, something routed wrong.
- **19** is the whole gate argument in one command.
- **21** and **23** are the only two that spend a look, which costs a vision
  call. One look each is right; two is a bug.
- Any **"cannot be undone. Want me to go ahead?"** on a navigate, a read or a
  type is the gate misfiring, and I want to know.

## Still not possible, and why

A command that needs a **native power in the middle of a loop** cannot finish:
"close all my tabs, open Cursor, then play something". The loop's verbs are
browser shaped (navigate, click, type, read, look, search) while closing tabs,
launching apps and playback live in the cascade. Either side can do half of it.

The fix is to give the loop a verb for native powers, which means editing
`hil-loop-prompt.ts` and running `supabase functions deploy`. That is a deploy
you have to run, so it is the first thing next round rather than something to do
overnight.
