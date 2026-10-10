# Knows Your Localhost

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 3, 2026

## The simple version

Braino now knows which dev servers are running on your Mac and what each one is for. Say "open my localhost link" and he opens the one you have been working in. If he cannot tell, he asks: "Which one? meltique on 3000 or the Affective site on 8080?"

The same night, three quick shortcuts stopped grabbing whole sentences because of one word, and he follows through when he says "just a moment".

## Why it exists

From the run on October 3:

- "Open the localhost link in a new tab" got "Chrome has no tabs open". A tab shortcut read it as a tab called "localhost link in a new", could not read Chrome, and reported that as no tabs.
- "Open LinkedIn and search for Saurabh Jha from Messa Skola Business's profile" opened the Mesa Chrome profile and said "Done". The profile shortcut took the whole sentence as a profile name.
- "What's the weather?" got "Lemme check the local weather for you. Just a moment." and then nothing. The promise check knew "let me" but not "lemme", "just a moment", "one sec" or "hang on".

## How to use it

- "Open my localhost link", "open the dev server", "open localhost 3000", "open the meltique dev server".
- He picks by the port you say, then the project you name, then the localhost page you last had open, then the only one running. Otherwise he asks.

## Honest limitations

- Not tested live on the Mac yet; tested against tonight's sentences and a recorded port list.
- Only servers started by node, python, ruby, bun, deno, php or java count.
- The live words in the notch during conversation, and stopping him mid-sentence, are still open (see below).

## Technical shape

- `mac/braino-mac/dev-servers.cjs`: parses `lsof`, names servers by project folder (Braino's own repo is "the Affective site"), `pickDevServer`.
- `mac/braino-mac/main.cjs`: `macListDevServers` (refreshed every minute), `openLocalhostAsk` before the tab shortcut, a `localhost_pick` answer, and a dev servers line in the reasoning layer's context.
- `tab-switch.cjs`: "in a new tab" is never a tab switch. `main.cjs`: a tab list that could not be read is not "no tabs".
- `chrome-profiles.cjs`: a profile name is one to three words with no second job in it.
- `extension/lib/hilShared.js`: the promise check knows "lemme", "one sec", "just a moment", "hang on", "pulling that up". Shared with the Chrome extension.
- `tests/mac-shortcuts-dont-grab.test.mjs`.

## What comes next

- Show your words in the notch while you speak in conversation, from the on-device recognizer that already runs for his name, the way BrainoHERA does. Today the notch waits for OpenAI's transcript, which starts after you stop talking.
- Stop him the moment you talk over him. Today he only stops if you start with his name or a stop word; otherwise he just gets quieter.
