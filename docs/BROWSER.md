# How Braino sees a web page

Braino used to look at web pages through the macOS accessibility tree, the same
way he looks at any Mac window. That does not work for the web. Chrome puts its
own buttons in that tree and almost nothing of the page, so a real BookMyShow
run was handed browser furniture, told that content was hidden, and spent five
steps scrolling for a "Book tickets" button that was in the middle of the
screen. His reasoning was right every step. What he was given was empty.

## What changed

Chrome will run JavaScript for us, through the same AppleScript door Braino
already used to list tabs. So on a web page he now reads the **real page**:
every link, button and field, with the words actually printed on them.

Three things follow from that, and they are the whole point:

- **It is the page, not a summary of it.** 120 real elements where the tree gave
  browser chrome.
- **It is your own tab.** Already signed in. No second browser, no copying your
  profile, and none of Chrome 136's remote-debugging consent sheet.
- **You watch it happen** in the window you were already looking at.

## Turning it on

Chrome needs one switch: **View > Developer > Allow JavaScript from Apple
Events**. Without it Braino falls back to the accessibility tree, which is no
worse than before. The log says which happened:

| Log line | Meaning |
| --- | --- |
| `hil.observed  source: page` | he read the real page |
| `hil.observed  source: window` | he fell back to the accessibility tree |
| `hil.page_read.failed  reason: javascript_not_allowed` | the switch is off |
| `hil.page_read.failed  reason: chrome_not_running` | no Chrome to read |
| `hil.page_act` | he clicked or typed on the page |

## Same door in, same door out

The numbers in a page read belong to the DOM. The numbers in a window read
belong to the accessibility tree. They are different numbers for different
things, so an action goes back through whichever door the reading came through,
or `[12]` means one thing to him and another to his hands.

Elements are stamped with `data-braino-idx` during the read and acted on by that
stamp afterwards, never by a fresh index. A page moves between reading and
clicking, and clicking the wrong thing on a checkout page is the one mistake
worth engineering against. If the stamped element is gone he is told so rather
than pressing whatever now sits in that position.

## What this is not, yet

- **Only the front tab.** He reads the active tab of the front window.
- **No scrolling into view beyond `scrollIntoView`** on the element he clicks.
- **Offscreen elements are listed but marked**, so he can choose to scroll.
- **Not tested end to end on a booking.** The reader and the action path are
  proven against a live page; a full multi-step purchase has not been run.
