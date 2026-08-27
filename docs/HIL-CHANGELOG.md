# Human Intelligence Layer — changelog

Every change to HIL, newest first, and what it fixed compared to the run before it.

The rule for this file: **an entry only counts if it names the evidence.** A line
that says "improved routing" is worthless in six weeks. A line that says "414
answer-starts against 22 finishes in the 2026-08-26 session" can be checked, and
can be checked again after the fix. Numbers come from
`~/Library/Logs/Braino Mac/braino-mac.log`, which is the ground truth — not from
memory of what a session felt like.

---

## 2026-08-27 · Round 009 — I built the same bug I had just named

**What triggered it:** the second BookMyShow run. He escalated correctly, worked
for 97 seconds, and searched a mis-transcribed title eleven times while being
corrected three times.

**The finding, and it is not HIL's fault.** HIL read every correction right:

```
"I said insidious."                             hil.understand  running:true  kind:correction
"The latest one Braino, book that one for me."  hil.understand  running:true  kind:correction
"the movie is I-N-S-I-D-I-O-U-S not N-C-D-S"    hil.understand  running:true  kind:correction
```

And then: `voice.interjection` **0**. `hil.loop.told` **0**.
`voice.interrupted_running_turn` **0**.

The code that hands a correction to a running job never executed. I had hung it
off the "he is being interrupted mid-sentence" branch, which needs
`voiceTurnInFlight`. During the booking he was not speaking, he was **working**,
so it never fired once. The corrections went to the chat path, which ignores
them by design while a job runs, and he answered them conversationally: *"that's
got a creepy vibe"* while the job carried on searching NCDS, deaf.

Round 008 said the whole class of bug was HIL being right and thrown away. I
then wrote a fifth instance of it myself. The judgement was correct, computed,
logged, and discarded, this time by my own wiring.

**Fixed:** a job being in flight is the condition, not his mouth being open. The
router now runs on every accepted sentence, before the interrupt branch.

**And the trap that came with it.** Asking HIL costs **3.6 to 6.5 seconds** in
these logs. Awaiting that before every turn would have made "how are you" five
seconds slower. So a cheap `braino-mac:job-running` check runs first, with no
model call on that path, and the question is only paid for when there is a job
for the answer to change. The verdict is then cached so the chat path reuses it
instead of asking the same question twice: one call per sentence, same as before.

**Three more from the same session:**

- **The notch overflowing was mine, from Round 005.** I stopped it tearing
  itself apart by locking short-or-long on the first streamed token. Too strong:
  a reply classified short from its first few words and then kept going stayed
  pinned to the single-row surface, so the text ran out past the rounded edges
  and over the page behind it. Now one way only, short may become long, long
  never goes back. Growing is not flapping: at most once per reply, and only in
  the direction that makes room.
- **"Insidious-right, that's got a creepy vibe."** He is not allowed em dashes.
  The rule is in diction.ts and rides in on the persona, and it was restated in
  the Monday Mode, Her Mode and voice-persona instruction branches. The normal
  branch, the one he actually runs on, was the only one of the four missing it.
- **Eleven searches for a title that does not exist.** New rule in
  `hil-loop-prompt.ts` (2.7.0, deployed): a search returning nothing twice is
  telling you the term is wrong, not the site. Speech gets misheard. Say what
  you typed and what came back so they can hear the word you actually got.
  Probed live against the real state: it now answers `blocked` with *"I will not
  search the same term again ... ask whether NCDS is the right title"* instead
  of a twelfth search.

**Verified:** 199 tests, 198 pass, 6 new. Live probe confirms
`hil_loop_version: 2.7.0` in production. Lint clean. The one failure is the same
`lib/hilShared.js` drift in the built extension copy, unrelated and now six
rounds old.

**Still not verified on hardware.** The interjection path has never once run in
a real session. That is the whole point of this round and it is exactly what the
next log has to show: `voice.interjection` and `hil.loop.told` appearing at all.

---

## 2026-08-27 · Round 008 — he can hear you while he works

**What triggered it:** the BookMyShow session at 13:49. He said he could not
book it, was argued into trying, then worked for 146 seconds and gave up on a
film that was on the screen — after being told which film it was.

**What the log showed, and it is worse than it looked.** Round 007 fired
correctly (`voice.promise.escalated` → `delegate.forced_brain` →
`hil.loop.start`), but every one of the seven turns is `route: "realtime_chat"`.
Including this one, spoken at 13:52:27 while the loop was on step 19:

```
voice.in  "It is the first one Braino, Insidious: The Further."   route: realtime_chat
```

That is the exact fact he was stuck on. It went to a side conversation. The run
never heard it, searched four more times, and at 13:52:51 ended with "I can't
book it because BookMyShow is only showing Insidious: Out of The Further". He had
been told the answer **24 seconds earlier** and there was nowhere to put it.

**The founder's framing, which set the whole round:** *"if I ask a human how
you're doing and also would you get me that coffee, he says I'm doing fine AND
grabs the coffee. Basic common sense. How would a human think about it."* And
the warning that came with it: do not hardcode "stop". Understanding which of
those things was said is HIL's job, or it is another word list.

**Five things, all of them the same thing.**

1. **He can hear you mid-job.** `macActiveHilRun` holds the running job, and an
   interjection is classified by HIL, not matched: a **correction** or an
   **addition** is pushed into `state.facts`, which is how the loop has always
   told itself things mid-run; a **stop** bumps `macHilGeneration`, the existing
   cancellation, so it lands within a step rather than at the end; anything not
   about the job stays a normal turn. No stop-word anywhere.
2. **A job in what YOU said is enough.** The understanding call now runs on every
   utterance, started before he answers and read after, so talk-only turns pay
   nothing for it. `chat_and_task` is the coffee case: he answers the question
   and the job still runs. This also retires the refusal problem at the root —
   whether he says "on it" or "I can't do that from here", HIL read *your*
   sentence, and the job goes either way.
3. **He is told he has hands.** The chat instructions literally said *"say you
   can help and let the app route the action next time"*, which is exactly what
   he did. Replaced: he can operate the Mac, the job is already going to his
   hands as he speaks, never claim he cannot, never talk them through doing it
   themselves, and do not claim it is finished either.
4. **A name is a description, not a string.** New rule 2a in
   `hil-loop-prompt.ts`: one plausible match on the page IS the thing, take it
   and say which; several, ask once; and never end with "not available" when
   something on screen plausibly matches. The session is quoted in the prompt.
5. **What he says is logged.** `voice.out` only ever came from `speak()`, and
   chat replies are spoken by the streamer, so half of every conversation was
   missing — which is why nothing in the log explains the refusal. Logged now,
   only when the streamer spoke it, or the fallback logs it twice.

Plus the notch says **"Taking it on"** when a conversation turns out to have
contained a job, in the same shimmer as Thinking and Calibrating, because
"he agreed to do it" and "he is doing it" looked identical from outside.

**The rule the new module states about itself**, and the one to hold the line on:
*there is no list of task words.* `hil-understand.cjs` carries the prompt and the
parser and nothing else, so the day someone adds a verb to it, it is visible.

**Safety of the new dependency.** Every failure path returns null and every
caller treats null as "carry on exactly as before". A classifier that is down
must never be able to swallow a command. The parser is tolerant on the way in
(fenced JSON, prose around it) and strict on the way out, and coerces a verdict
given in the wrong shape rather than discarding it — `chat_and_task` while
working is an addition, a `correction` with nothing running is a task.

**Verified:** 193 tests, 192 pass; 13 new across the two rounds. The one failure
is the same unrelated `lib/hilShared.js` drift in the built extension copy, now
five rounds old and worth its own fix. `npm test` 96/96. Lint clean on all four
changed files. I broke my own Round 007 test by improving the trigger it pinned,
and updated it.

**Deployed.** Fix 4 lives in a Supabase edge function and is live in production:
prompt bumped to `HIL_LOOP_VERSION = "2.6.0"` and a probe against the real
failure case comes back `"hil_loop_version":"2.6.0"`. The other four are local
and live on restart. **Not verified on hardware** — these are source-level tests, and the
classifier's real accuracy can only be judged from a session.

---

## 2026-08-27 · Round 007 — saying it is not doing it

**What triggered it:** *"braino still does not follow through man… i said book me
movie tickets and he said give me a moment and then bro just stops listening."*

**The turn, from the log** (line 347016, both turns `route: "realtime_chat"`,
**zero** `delegate.*` and **zero** `hil.*` events — counted, not assumed):

```
08:03:13  voice.in   "Book my show in India and Hyderabad and book me the movie listing for Insidious maybe."
          → he asks which cinema
08:03:33  voice.in   "PVR Atrium anytime after 4 pm."
          → "give me a moment"
08:04:0x  realtime.idle.stop  reason:"turn_done"  idleMs:26465
```

He did not fail to finish the job. **He never started one.** The whole exchange
was classified as conversation.

**Why:** `isLikelyMacActionTranscript` in the renderer is a ~200 word list that
decides task or small talk. It has `open`, `play`, `send`, `download`, `shop`,
`amazon`. It does not have **book**, **ticket**, **reserve**, **buy** or
**order**. Run against the real transcripts:

| Transcript | Verdict |
|---|---|
| "Book my show in India and Hyderabad and book me the movie listing…" | CHAT |
| "PVR Atrium anytime after 4 pm." | CHAT |
| "…please **open** BookMyShow and then book me some movie tickets…" (Aug 24) | ACTION |

It worked on the 24th because the sentence happened to contain "open". The word
"book" has never worked. This is the third failure in one day with one cause: a
hardcoded list is the real router, and every miss is a word somebody forgot.

**The fix is not the missing words.** Adding `book|ticket|reserve` buys one night
and guarantees a fourth word next week. The founder's framing was the correct
one and it reframed the round: *what would a human do if they said "give me a
moment, I'll check it"? They would check.* So the trigger is now **his own
sentence**. A promise is self-evidence that work is owed, and it needs no
vocabulary, because he only says it once he has already understood the job.

`promisesAction` already existed in `extension/lib/hilShared.js` and was already
used inside the HIL loop to refuse a promise as an ending. It was simply never
applied to the chat path. It reads these correctly with no changes:

```
Give me a moment.              PROMISE      Which cinema and what time?   -
Let me check.                  PROMISE      Done, tickets are booked.     -
One sec, let me pull that up.  PROMISE      Here they are.                -
```

**What was built:**

- **Bridged, not copied.** The renderer is context-isolated so it cannot require
  the shared file. `preload.cjs` exposes `promisesAction` over `contextBridge`.
  `hil-verify.cjs` says out loud that hilShared is the single copy, and a second
  regex in the renderer is how the same bug gets found twice.
- **The escalation.** When his reply promises, `answerViaRealtimeChat` logs
  `voice.promise.escalated`, calls `rememberOwedTask` **before** the run so a
  later "go ahead" can still resume it, and hands the job to `runDelegate`.
- **It goes to the brain, not back to the lists.** This is the part that matters
  and the part I nearly got wrong. A new `forceBrain` option rides the delegate
  IPC and returns `runMacHilLoop(raw)` before the cascade. Without it the
  escalated job re-enters the same keyword lists that lost it, and loses it
  again — silently this time, because he has already promised out loud. The
  combined movie prompt happens to reach the brain on its own, by phrasing luck,
  which is exactly the thing being removed.
- **The job is the exchange, not the last sentence.** "PVR Atrium anytime after
  4 pm" is useless alone. `escalationPrompt` carries the previous user turn
  forward, reconstructing *"Book my show in India and Hyderabad and book me the
  movie listing for Insidious maybe. PVR Atrium anytime after 4 pm."*

**Verified:** simulated against the real transcript — his reply reads as a
promise, the job reconstructs, and `macWantsTheBrain("PVR Atrium anytime after
4 pm.")` is **false**, which is the bug in one line. 185 tests, 184 pass; five
new ones cover the trigger, the bridge, the forced route, the reconstruction and
the promise-versus-report distinction. The one failure is the same unrelated
`lib/hilShared.js` drift in the built extension copy. I also broke a Spotify test
by widening `runDelegate`'s signature — it pinned the literal string
`"async function runDelegate(prompt)"` — and repointed the slice.

**What this does NOT fix.** HIL still does not route. It is consulted when a
promise escalates, and it remains fire-and-forget everywhere else
(`void fetch`, main.cjs). The chat path still decides task-or-talk with a word
list; the difference is that a wrong guess is now recoverable instead of silent.
Making HIL the router before the lists is the next round, and it is the one that
actually removes the class.

**Behaviour change worth watching:** he now acts on turns he previously only
talked through. The detector excludes questions and completed statements, and
escalation is capped at one per turn, but "let me check" in idle conversation
will now really check.

---

## 2026-08-27 · Round 006 — designed on a page first, then ported

**What triggered it:** *"create a new page where you put our existing current Mac
notch design in every state"*, and then, after review, *"port it into the Mac app
now."*

**The method, which is the actual change here.** Rounds 002-005 were all edited
straight into the Mac and judged by running him. That is a bad loop: the Electron
renderer cannot be inspected from here, so every claim about what the notch looked
like was either a screenshot the user had to take or a number I could not verify.
Three separate times in Round 005 I reported a confident measurement that was
wrong, because `getComputedStyle` does not walk ancestors and `getClientRects()`
stays non-zero for `visibility: hidden`.

`/notch-lab` fixes the loop rather than a bug. It imports the real
`mac/braino-mac/renderer/braino-mac.css` as raw text and injects it into a shadow
root with markup lifted verbatim from the Mac's `index.html`, so it is the same
CSS on the same DOM, measurable in a browser. Shadow DOM is load-bearing: the
first attempt imported that stylesheet globally and its `body { pointer-events:
none }` took the whole site down.

**What the review then changed:**

| Note | What was actually wrong |
|---|---|
| *"where is the coral shimmer, I don't see it"* | It was there, as a coral light over a near-black plate. Coral on black at low alpha reads as a stain, not a shimmer. |
| *"no longer black like the actual Braino CSS theme, that coral sweep"* | I had lit a black surface instead of repainting it. The plate now uses the mascot's own gradient, `#F6A8A2 → #EE8B82 → #E8786E`. |
| *"the arrow is too close to the last line of the thinking"* | The canvas had no bottom padding, so the collapse arrow sat against the reasoning. Now 46px, measured at **22px** clear. |

Two consequences of repainting the plate that were not in the note but follow
from it: the fold and smile strokes had to flip to ink (`rgba(92,28,22,…)`) to
survive on a light surface, and the sweep had to become white with
`mix-blend-mode: soft-light`, because coral light on a coral plate is invisible.

**What the port needed beyond CSS.** The stylesheet was already being edited in
place, so the Mac had it. The renderer did not: `updateNotchFace` still opened
the caption during processing, which is exactly the overlay Round 005 replaced.
Restored the handover, with `NF_HEARD_MIN_MS = 1100` so a fast route cannot swap
your own sentence out before you read it, and a follow-up repaint so the floor
expires on its own rather than waiting for an unrelated redraw.

Removing that mode left `syncInlineVoiceSurface` with dead branches and a comment
describing the opposite of what it now does. Cleaning it up, I deleted a variable
the call site still passed — a `ReferenceError` that `node --check` cannot see,
caught only by reading the call site afterwards. Worth remembering: syntax
checking a renderer proves nothing about undefined identifiers.

**Verified:** `node --test tests/*.test.mjs` — 178 pass, 1 fail. The failure is
`keeps source, downloadable, and built extension model defaults aligned`, which
is unrelated drift: `public/sidebrain-extension/background.js` is missing
`lib/hilShared.js` from its `importScripts` list. Pre-existing, not touched by
this round, and worth its own fix. Four new tests pin the coral plate, the arrow
clearance, and the handover so a later edit cannot quietly undo the review.

**Then the port met the real hardware.** *"the mac notch is basically covering
our coral design, his eyes being closed look cut off."* Correct, and older than
this round: `.nf-response-face` started at the pill's y=0 with the closed lids at
y 29-36 of its viewBox against a 33px housing, so the notch had always eaten two
thirds of both eyes. On a near-black plate that read as part of the housing.
Painting him coral is what made it visible, which is the argument for the lab in
miniature: the bug was in the CSS the whole time and only a real screen found it.
Plate now `calc(72px + var(--nf-notch-h))` with the drawing offset by the same
term, so coral still runs edge to edge and the face sits on the chin. Measured on
`/notch-lab`: lids **29px clear** of the housing, header **4px clear** of the
plate. 180 tests, 179 pass, same one unrelated failure.

**Still open, unchanged from Round 005:** the router is still single-shot;
`runFetchAssets` is still missing from `main.cjs`, so voice cannot fire
`fetch_assets`; `REALTIME_IDLE_TIMEOUT_MS` is still 15000.

---

## 2026-08-27 · Round 005 — three states, one at a time

**What triggered it:** *"i speak / i instantly see that in the you said part /
then, in the notch, at its centre, i see thinking with a down arrow / then back
to the same notch as you said but with braino's reply."*

That is a **sequence**. Rounds 002-004 built it as an overlay — the caption
staying open through processing so your sentence never disappeared — and every
overlap bug since has been a consequence of two surfaces owning one box.

### What was wrong

1. **The caption stayed open while he worked.** `inlineMode` was
   `processingActive ? "thinking" : ...`, so the caption held your words through
   the whole run while the centred thinking chip tried to occupy the same
   space. Hence the doubled text, and hence "You said" feeling *delayed* — it
   was competing rather than handing over.
2. **The thinking state had no moment of its own.** The chip had been pushed
   hard right and stripped of its text (Round 003) purely to survive sharing the
   box. Nothing on screen said "he is working".
3. **The reply changed shape.** Round 002 froze short/long during streaming and
   then re-ran the call once at `finishNotchAnswer`. One transition beats twenty,
   but the user still watches the sheet resize under a sentence they are reading.

### The fix

- **`inlineMode` returns "" while processing.** The caption owns the box while
  you speak and while the words settle, then hands it over. Your sentence is not
  lost — it is the first line of the panel behind the arrow (`You said: …`).
- **The chip is centred again, with its text and its arrow.** All the Round 003
  overrides that moved and muted it are deleted, because the condition they
  existed for cannot occur any more.
- **No reclassification at finish.** Decide once, stay put. A sheet that guessed
  slightly wrong is better than one that resizes mid-read.

### Verification, honestly

61 unit tests pass. **The notch itself is not verified.** I built a harness to
drive the real markup in a browser three times; it boots into a stripped state
where the pill will not grow past 190x55 and every surface reports hidden, so it
cannot reproduce the runtime. Two of those runs produced *confident wrong
answers* before I noticed the visibility check was not walking ancestors.

This needs the running Mac app. What to look for:

1. Speak — your words appear immediately under **You said**.
2. It hands over to a **centred "Thinking" with a down arrow**. One thing, middle
   of the notch.
3. Arrow opens the full trail, first line `You said: <your words>`.
4. His reply arrives in the same box and **does not change shape** while typing.

If step 1 still lags, the delay is upstream of the notch — in transcript flush,
not in rendering — and that is the next thing to instrument.

---

## 2026-08-27 · Round 004 — he stopped saying yes and doing nothing

**What triggered it:** the 02:05 session. He said *"Got it. The filename is
`BrainoSuperFinal.pdf`, no underscore. I'll use that."* — then did nothing. You
said **"Go ahead do it."** and he did nothing again. Then *"You're telling me
what to do but then you are not following through that."*

### Evidence

```
20:34:43  voice.in  ->  delegate.start  ->  hil.reason      # a working turn
20:35:01  voice.in  ->  realtime.chat.response_started      # "Go ahead do it."
```

No `delegate.start`. No `hil.reason`. The turn was routed to **chat**, so he
talked about the task instead of running it.

### The cause

`shouldUseRealtimeDirectChat` sends anything to chat that
`isLikelyMacActionTranscript` does not recognise as an action. "Go ahead do it"
has no verb-object pair — there is nothing in the sentence to act on — so it
reads as small talk. Its only escape hatch is `hasPendingDelegateFollowup()`,
which knows about a pending *workflow* or a *file confirmation* and nothing
else. It does not know he just asked you a question, or gave up on a job, or
promised to use a filename.

### The fix — remember the task he owes you

- `owedTask` records the **original instruction** whenever a delegate ends
  not-ok, or ends with a question back to you. Not the affirmative — the actual
  job, so there is something real to re-run.
- A bare affirmative is matched **before the chat fork** and re-dispatches that
  instruction as a delegate.
- It expires after three minutes, so "yes" an hour later cannot resurrect a
  stale job.
- `AFFIRMATIVE_ONLY` is anchored at both ends on purpose. "Go ahead do it"
  stacks two affirmatives and an either/or pattern missed it — that was the
  exact sentence from this session. "go ahead **and open Netflix**" is
  deliberately excluded: it carries its own object and must run as spoken.
- Pinned against 26 real phrases from the session, including the ones that must
  NOT resume: `yes`, `okay`, `no`, `do it tomorrow at 5`, `continue the meeting
  notes`.

New log lines: `voice.owed_task.remembered`, `voice.owed_task.resumed`,
`voice.owed_task.expired`.

### Also confirmed working this session

`voice.transcript_dropped_busy` fired at 20:34:27 — the Round 002
instrumentation catching a real command dropped while he was busy. That class of
bug is no longer invisible.

### Still open

- **He narrates intent he then abandons.** Round 004 rescues the *next* turn, but
  the underlying issue is that HIL is single-shot: it returns one tool, not a
  plan, so a job needing ten steps depends on ten separate turns each re-reading
  the screen. The Claude-upload run looped on the same file-picker click ten
  times before giving up.
- **9 screen-read failures** and **7 × `hil.loop.assert_failed`**, carried from
  Round 002.

---

## 2026-08-27 · Round 003 — "You said" got its box back

**What triggered it:** Round 002 fixed the streaming tear, and the stacked trail
landed. Two things were still painting on top of each other: the "YOU SAID"
header had text lying across it and no room for your actual words, and two state
chips ("Live" over "Deciding") shared one corner.

### The cause — three full-bleed layers, one box

`.nf-inline-caption` (z-index 12, `inset: 0`), `.nf-thinking-canvas` (z-index 8,
`inset: 0`) and `.nf-think-chip` (z-index 12, pinned top-centre) can all be
visible at once. The `nf-inline-open` hide-list sends nine other elements away —
`.nf-band`, `.nf-cap`, `#nf-status`, `.nf-folds`, `.nf-privacy`, `.nf-volume`,
`.nf-viz`, `.nf-tray`, `.nf-sonar`, `.nf-think-dots`, `.nf-think-arrow` — and
omits the two that actually collide.

So while he worked: the caption drew "YOU SAID" plus your sentence; the canvas
drew "Reading the current context and understanding what matters…" over it; and
the chip drew that same line a third time, truncated at 64 characters, straight
across the header.

### The fix — one surface owns the box at a time

- **Collapsed, the caption wins.** `.nf-thinking-canvas` is hidden, because the
  caption already reports his phase in its own state chip. The chip's *text* is
  hidden too, for the same reason.
- **The chip's arrow stays**, parked hard right. It is the only way into the
  trail, and hiding the whole chip would have taken the disclosure with it. The
  caption header gains right padding so the two never share that corner again.
- **Opened by hand, the canvas wins** and the caption steps aside. Nothing is
  lost: the sheet's own first line is `Understanding: <what you said>`, so your
  words move into the panel rather than disappearing from it.

### How to tell it worked

Purely visual — no log signal for this one. Speak a command and watch while he
works: one label, one state chip, your sentence readable underneath. Click the
arrow and it becomes `Understanding: …` above the step trail.

---

## 2026-08-27 · Round 002 — the notch stopped tearing itself apart

**What triggered it:** the 2026-08-26 evening session. He completed seventeen
delegated tasks, several of them multi-step, and the screenshots still looked
broken: two layers of text painted over each other in the notch, and commands
spoken over him going nowhere.

### Evidence, before

| Signal | Reading | What it meant |
|---|---|---|
| `notch.answer.start` | **414** | — |
| `notch.answer.finish` | **22** | 19 answers opened for every one that closed |
| One reply, generation 18 | **20 starts in 52ms** | a "new answer" per streaming token |
| Layout class per answer | `short → long → short` | the sheet re-laid-out mid-sentence |
| `hil.thinking_step` | **106** | — |
| Any event clearing them | **0** | nothing ever took a thinking line down |
| `realtime.barge_in` | 10 of 58 speech starts | — |
| Transcripts dropped with a log line | **0** | the drop had no log at all |

### The four causes

1. **Streaming called "open" instead of "append."** `updateNotchAnswerText`
   delegated straight to `startNotchAnswer`, so every token cancelled timers,
   rebuilt classes, reclassified short/long from a half-written sentence, and
   called `setNotchZone` — resizing the real OS-level overlay window. Per token.

2. **The layout class was recomputed from partial text.** `renderNotchAnswer`
   classified whatever it currently held, so an answer crossed the 100-character
   boundary while it was being typed and the box changed shape underneath it.

3. **The thinking trail element did not exist.** `renderThinkingCanvas` has
   queried `.nf-thinking-trail` since it was written; that element was never in
   `index.html`, so the query returned `null` and every step he took was
   discarded. What survived was the current line only — and the code that would
   have rendered a trail was reading `coworkThinkingHistory`, a *different*
   feature's array, capped at two rows.

4. **Interrupting him threw your words away.** Barge-in stopped his audio
   correctly. Then `shouldAcceptVoiceTranscript` hit
   `if ((speaking || processing || voiceTurnInFlight) && !addressed) return false;`
   — a bare return with **no log line** — and binned the sentence, because
   `speaking` was still true when it arrived. He went quiet, looked attentive,
   did nothing. The command only landed if you said it again after he finished.
   Because the drop was silent, the log showed a user who never spoke.

### The fixes

- **Open once, then append.** `updateNotchAnswerText` detects a live generation
  and updates text in place. No zone resize, no class churn, no second
  `notch.answer.start`.
- **The class is frozen for the life of an answer** (`nfAnswerModeLocked`) and
  may change exactly once, in `finishNotchAnswer`, when the whole sentence has
  landed. Worst case is now one transition at the end instead of N mid-sentence.
- **`hilThinkingHistory`** records his steps, and `.nf-thinking-trail` now
  exists in the markup, inside `.nf-thinking-lines` so `renderedThinkingHeight`
  measures it and the sheet grows to fit. Collapsed shows the latest step alone;
  opened shows the whole trail, scrollable, as readable rows rather than the
  4px dots the collapsed state uses.
- **A real interruption outranks every busy flag.** `rtBargeInAt` is stamped by a
  genuine `speech_started` barge-in and consumed by the next transcript, so what
  you said while cutting him off survives. It expires after 8s, so a cough that
  interrupts him cannot hand a free pass to whatever is transcribed a minute
  later. The silent drop now logs `voice.transcript_dropped_busy` **with the
  text**, so this class of bug can never be invisible again.

### How to tell it worked

Next session, in the same log:

- `notch.answer.start` should be **roughly equal to** `notch.answer.finish`, and
  both should be near the number of spoken replies. If starts are still a
  multiple of finishes, the append path is not being taken.
- No generation should log more than one `kind` value.
- `voice.barge_in.transcript_kept` should appear whenever you talk over him.
- `voice.transcript_dropped_busy` is the new honest one: if it appears a lot,
  the busy guard is still too aggressive and the *next* round tunes it.

### Known, not fixed

- **9 screen-read failures** (`tabs.scan.failed` ×5,
  `desktop.context.read_failed` ×4). This is the "last click failed because the
  Finder element map was stale" message — he clicked using a picture of the
  screen that had already changed. Untouched this round.
- **7 × `hil.loop.assert_failed`.** His own verification saying it is not sure he
  did what he said. Worth a round of its own.
- **`REALTIME_IDLE_TIMEOUT_MS = 15000`** ends the session after 15s of real
  quiet (`turn_done idleMs=20516` and similar, 7 times). Restart costs ~2.3s
  from `realtime.start` to `realtime.ready`. Correct behaviour arguably, but it
  is why he sometimes is not listening when you come back to him.

---

## Baseline — what HIL was before this file existed

Reconstructed from git history so this changelog starts where the layer did,
rather than where the logging did. These are the commits that built it, not
entries written at the time.

| Date | Milestone |
|---|---|
| 2026-08-04 | Reasoning surfaces and the first split of the two layers apart |
| 2026-08-05 | Engine run log opened publicly; a corpus, and a verdict on every run |
| 2026-08-07 | Both engines tuned against the run log, with what was tried recorded |
| 2026-08-08 | Stage 0 — the tuned engines loaded into the real Braino |
| 2026-08-08 | One brain: the canonical HIL loop decides every Delegate step |
| 2026-08-08 | The real HIL layer put in the browser, beside the Emotional Engine |
| 2026-08-14 | Monday Mode sharpened: real refusals |
| 2026-08-21 | Two engine-log findings, and a correction |
| 2026-08-25 | The Mac reaches for the same brain the browser already runs on |
| 2026-08-25 | "You should not have to ask him to think" |
| 2026-08-25 | **HIL was not being stupid, the Mac was lying to it** |
| 2026-08-25 | Round 001: everything the first real session exposed |

Two standing constraints from that period still hold and are worth re-reading
before any change here:

- **The router returns one tool, not a plan.** HIL is single-shot; multi-step
  asks are stitched together above it. Half-working GitHub, WhatsApp and Medium
  flows all trace back to this one fact.
- **`hil-tool-catalog.ts` is the single source of truth** for the router prompt,
  the Mac's boot-time dispatch check, and the irreversible set. It drifted into
  three lists once and the symptom was Braino appearing to fail a skill he was
  performing perfectly.
