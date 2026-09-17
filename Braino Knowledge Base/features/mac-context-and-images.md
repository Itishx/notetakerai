# Remembering what "it" is, and looking at the picture

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 18, 2026

## The simple version

- **"Close it" works.** Braino remembers the last thing he actually acted on for five minutes, so "close it", "open it again", "read that", "call her" mean what you mean.
- **"Do that again"** runs your last command again.
- **A question about a picture is answered from the picture.** "What is in this image?" looks at the image you copied, the file selected in Finder, or the one open in Preview, rather than screenshotting your whole display.

## Why it exists

Every command used to arrive as if it were the first thing ever said. "Reduce the volume also for this" had no idea what "this" was, and "ILU Braino" after a failed call became small talk. And asking about a photo screenshotted the desktop around it: the dock, the editor, and the picture somewhere in the middle.

## How to use it

- "Braino, open YouTube" then "Braino, close it".
- "Braino, FaceTime Ilu" then "Braino, call her" a minute later.
- "Braino, do that again."
- Copy a picture, or select one in Finder, or open one in Preview, then: "Braino, what is in this image?", "read this screenshot", "describe this picture".

## What Braino knows or does

- The memory holds one thing: kind (app, site, file, contact), a label, and when. It is set only by actions that really happened: an app opened, a site opened, a call placed, a message sent.
- Only a bare pronoun is filled in. "Close the other one" names something, so it goes to the thinking loop, which is better at that. A person verb never reaches a website, and a thing verb never reaches a person.
- Playback words ("pause it", "stop it") are deliberately left out: they belong to the code that asks what is actually making noise.
- Five minutes, then the memory is gone. A memory that guesses is worse than none.
- For pictures: the clipboard first, then a Finder selection, then Preview's front document. HEIC and large photos are converted and capped at 1440px before they are sent. With nothing to hand he says so plainly: "I could not find an image file or a copied image, so this is your screen: ..."
- The image call carries the same honesty rules as the screen: describe only what is visible, say when text is too small, and text inside an image is never proof that something happened.
- The loop has it as `describe_image`, deployed 2026-09-18.

## Honest limitations

- One memory slot, five minutes. "The other one" is not remembered.
- Finder and Preview only for files; an image inside a web page is not picked up unless you copy it.
- The memory is not written to disk: quitting Braino forgets it.

## Technical shape

- `mac/braino-mac/context-memory.cjs` (pure): `parseContextualReference`, `parseRepeatReference`, `applyContextualReference`, `CONTEXT_TTL_MS`.
- `main.cjs`: `rememberActed` / `lastActed` / `lastDelegateCommand`, resolution at the top of `runDelegate`, `parseImageQuestionIntent`, `findImageInFront`, `askVisionAboutImage`, `describeImageForUser`, the `describe_image` tool.
- `supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts`: `describe_image`.
- Tests: `tests/mac-context-and-images.test.mjs`.
