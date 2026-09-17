# Mac IOMI Response Surfaces

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** August 8, 2026  
**Updated:** August 10, 2026

## The simple version

Ask Braino something on the Mac and the whole conversation now stays in the notch, whether the standing mascot is home or walking across the screen.

While Braino works, the compact notch shows a thinking signal. Click it only
when you want the full **Braino is thinking** view from the Chrome-system
InstaGraphics design. When the answer begins, that same object becomes a
compact short answer or a larger reading surface for a long answer. The words
move with Braino's voice instead of appearing in a separate Mac window. On Mac,
all three response surfaces use one fixed black material. The black surface is
attached to the measured Mac housing: it keeps the menu-bar strip clear, opens
below the hardware, and places every label, line, and control on one safe rail.

## Why it exists

The browser and Mac versions of Braino felt like two different products at the most important moment: the answer. Browser Braino already had a clear thinking state, a quick-answer state, and a long-answer state. Mac IOMI fell back to a speaking mouth and hid the reply while Braino was home.

That made a request such as “summarise this Medium article” harder to follow than it needed to be. A useful answer should be visible without moving focus away from the page.

## How to use it

1. Start voice with double `Control` and ask a question, such as “summarise this article.”
2. Let the compact thinking signal stay out of the way, or click the notch to
   inspect the full progress sheet.
3. Read the answer in the notch while Braino speaks it.
4. Press **Done** to fold it immediately, or leave it alone and it will settle home after the reading beat.

## What Braino knows or does

- Keeps the Chrome-system geometry, typography, sleeping-face shimmer, walker,
  and spring animation, but renders them on a fixed black Mac material with
  white and graphite detail. Browser theme colors never leak into the Mac sheet.
- Keeps thinking collapsed by default. The whole compact notch is the click
  target for expansion; clicking away folds it again.
- Shows three concise progress summaries rather than private model reasoning.
- Keeps live heard speech and the compact Thinking/Hatching/Deciding phase
  inside one centered black Braino box. The former left/right subtitle wings
  no longer own normal conversation or thinking.
- Sends live speech to that box even while the standing mascot is out. A stale
  mascot bubble is cleared as soon as the notch receives the transcript.
- Uses a 100-character compact-capacity rule for the normal short-to-long
  answer boundary, so a two-line card never silently clips a medium reply.
- Treats paragraph breaks and lists as long-form answers even when they happen to be shorter.
- Uses one explicit bundled SF Pro Display contract across expanded thinking,
  short answers, long answers, labels, headings, and Done controls—the same
  Apple-style face used by BrainoHERA. Answer text is 17 px with a calmer,
  tighter reading rhythm; no editorial serif leaks into a response state.
- Measures the rendered label and answer after layout, then fits the panel to
  that real content height. Short summaries no longer leave a large empty black
  area below the last line; genuinely long answers stop at the visible-screen
  limit and scroll inside the sheet.
- Measures expanded thinking after its header and three progress rows render,
  so Hatching and longer progress text cannot be clipped by a fixed 260 px
  interaction zone.
- Computes notch depth from the active display's own origin. A screen arranged
  above or below the primary display no longer pushes content into the top edge.
- Uses one shared safe-top token for live captions, BrainoHERA, short answers,
  long answers, and thinking. The Done control cannot drift above the text rail.
- Shapes the narrow neck from the measured housing width, then opens the wider
  body below the menu bar. The former full-width top bar and separately
  composited rim are gone.
- Repairs only unmistakable missing punctuation boundaries in displayed
  answers (`Hey,your` → `Hey, your`) while leaving decimals, URLs, filenames,
  and acronyms intact.
- Highlights completed, current, and upcoming words against actual TTS playback.
- Uses a natural speech-rate estimate only when macOS system speech cannot expose audio timing.
- Keeps the current application active because the response is rendered inside the existing non-modal overlay.
- Uses one answer surface even when the full mascot is walking on-screen; the older floating reply bubble yields instead of duplicating the words.
- Temporarily takes visual priority over music, timers, calendar, and recording tickers, then restores those unchanged.
- Leaves BrainoHERA alone. Dictation remains a separate transcription-only lane and never opens an assistant answer.
- Queues delegate IPC before response-surface presentation, and runs HIL audit
  requests after the command result rather than competing with the action.
- Gives explicit named-track Spotify commands a deterministic fast path: cached
  focus return, native playback as the primary success path, deferred focus
  restore, and Web API playback only if native playback failed.

### Money, said like a person (September 17)

What he **says** now reads amounts the way people in India say them; what the notch **shows** is unchanged. `speakableAmounts` runs first inside `stripSpeechText`, so every Fish Audio request gets it:

- "₹2,00,000" → "2 lakh rupees", "₹1,97,287.00" → "1.97 lakh rupees", "INR 2,50,00,000" → "2.5 crore rupees", "₹2,713.00" → "2,713 rupees" (paise dropped above ₹100), "₹5k" → "5 thousand rupees", "₹1" → "1 rupee".
- "$1.2M" → "1.2 million dollars", "$0.05" → "5 cents".
- Indian-grouped numbers without a currency ("2,00,000 users") → "2 lakh users". Western grouping ("1,200 people") is left alone.

## Honest limitations

This is an MVP visual and state-machine port. A long answer can only be as useful as the context the Mac delegate received; page extraction still depends on the active Braino browser/Mac context bridge. The overlay imitates the notch because macOS does not expose the physical notch as a public third-party UI surface. Macs without a physical notch receive the same content rhythm in a normal rounded floating sheet.

Audio streams do not provide word timestamps. Fish Audio progress is derived from each playing audio chunk and its duration when available. System `say` uses an estimated reading pace. Markdown is rendered as safe text blocks rather than trusted response HTML.

The automated state, formatting, collapsed-disclosure, and Spotify critical-path
checks pass. The final live Mac pass still needs a real Medium summary, one
short answer, one long answer, a barge-in, a named Spotify song latency trace,
and a Yap/music/recording collision check.

## Technical shape

- Response markup: `mac/braino-mac/renderer/index.html`
- Housing-attached black shell, shared safe rail, thinking shimmer, answer typography, and transition geometry: `mac/braino-mac/renderer/braino-mac.css`
- Thinking → streaming answer → speech progress → linger → restore state machine: `mac/braino-mac/renderer/braino-mac.js`
- Dynamic click-through zone sizing for the visible sheet: `mac/braino-mac/main.cjs`
- Pure answer classification, safe block parsing, display-relative anchoring,
  panel sizing, and linger timing: `mac/braino-mac/notch-response.cjs`
- Focused automated coverage: `tests/mac-notch-response.test.mjs`
- Canonical browser reference: `extension/content.js`, `__sbMountNotchV1`
- Canonical design reference: `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`

The state order is:

`compact thinking signal → optional click-open thinking sheet → short answer | long answer → speaking complete → linger → previous persistent state`

Realtime chat stays in the thinking state until its first text delta. Full delegate answers are classified before TTS begins. Both routes use the same response generation ID, so a cancelled or interrupted voice cannot paint words into a newer answer.

## Product or design decisions

This intentionally reverses the July split-surface decision. The rule is now
literal: the notch owns conversational text; the standing mascot owns presence
and animation. Heard words use the compact notch box, and Braino's answer uses
the designed short/long surface in that same place.

The Mac version does not add the browser follow-up text box. Keeping a text input inside an always-on-top desktop overlay would risk taking the caret away from Medium, Cursor, Mail, or whichever app the person is using. The Mac response is readable and dismissible, but not focus-stealing.

The renderer measures the real header, label, SF Pro answer body, padding, and
Braino lane instead of guessing only from character count. The main process
then expands the interactive zone to that fitted width and height. That keeps
**Done** and long-answer scrolling usable without turning empty transparent
screen space into a click blocker. Scrolling over a long answer scrolls the
answer; scrolling the compact idle notch still controls system volume.

Persistent activities are not destroyed when an answer appears. They yield visual ownership for the answer and return afterward.

Thinking is observability, not execution. A command never waits for the sheet,
and the sheet never opens merely because a deterministic progress event arrived.
This restores the fast-command contract for Spotify and other direct actions.

## What comes next

Complete the live Mac visual matrix, then share the state tokens from one source so the browser and Mac surfaces cannot drift again.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
