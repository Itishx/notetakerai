# Human Intelligence Layer — changelog

Every change to HIL, newest first, and what it fixed compared to the run before it.

The rule for this file: **an entry only counts if it names the evidence.** A line
that says "improved routing" is worthless in six weeks. A line that says "414
answer-starts against 22 finishes in the 2026-08-26 session" can be checked, and
can be checked again after the fix. Numbers come from
`~/Library/Logs/Braino Mac/braino-mac.log`, which is the ground truth — not from
memory of what a session felt like.

---

## 2026-09-18 · Round 014 — he remembers his history with you

**What triggered it:** he knows facts about a person and nothing about what the
two of them have done together. "Do that again", "the same as last time", "send
it where I sent the last one" were dead ends, so somebody had to re-explain a
thing they already said once, to the one who was there for it.

**Almost all of this already existed and was never connected.**
`braino_interactions` was built for exactly this record, has `user_id`, has the
`(user_id, created_at DESC)` index, and has a select-own RLS policy. It is
written from the extension. Nothing on the HIL path ever wrote to it and nothing
anywhere ever read it back to him. So this round is mostly plumbing, and all of
its risk is in the plumbing.

**Read as them, written as us**, and the asymmetry is the point on a public
endpoint. Recall goes through the caller's own token so RLS decides whose history
comes back, which means a caller with no token gets nothing and the public lab is
unaffected. Recording uses the service role because the table has no insert
policy at all: a public endpoint must not be able to write rows that are later
read back into somebody's prompt.

**`loadWhatBrainoKnows` was already resolving the user and building their client,
and throwing both away.** History needs the same answer, so it now returns them.
One round trip, not two, for a fact that was already in hand.

**Whole runs only.** A step in the middle of a job is bookkeeping, not a thing
that happened to somebody, and forty rows of it per run would bury the four that
are actually a memory. Both endings are kept: "you could not do this last time"
is as useful to them as "you did", and much more useful than being asked to
explain it again from the start.

**Something has to connect a memory to now**, or four past commands sitting above
the state are noise wearing the costume of memory. Ranked by the same kind of
job, then the same site, then recency, and a row that is neither the same job nor
the same site does not appear at all. Four lines, never more.

**The threshold is looser than the one routes use, deliberately.** A route gets
executed, so a wrong one costs turns. History is only shown, so a loosely related
past job is at worst ignored, and "roughly this kind of thing, before" is exactly
the recall a person actually has. 0.34 against 0.5.

**What is private is not written down at all**, rather than written down and
starred out. `mentionsPrivateTopic` is now exported from `engine-log.ts` and used
here, rather than copied: two lists of those words would be two lists to keep in
step, and that one already has a test holding it against the Mac's copy.

**A record, never an instruction.** The injected block says so in its own second
line. Four past commands above the state read as a plan unless they are
explicitly framed as a record, and that failure would look exactly like the
feature working.

**Verified:** 363 pass, 0 fail, 12 new. Type-checked under `--strict`. Three
recalls now ride in one `Promise.all`, so lessons, routes and history together
cost what the single lessons read cost before. `HIL_LOOP_VERSION` unchanged at
2.12.0: this round adds a block to the prompt, not a rule to the thinking.
**Not verified on hardware.**

---

## 2026-09-18 · Round 013 — history, so the memory is not empty on day one

**What triggered it:** Round 012 shipped a memory and nothing to put in it. A
route needs two independent runs before anyone is handed it, so on a cold table
every run still works everything out from zero, and the feature reads as having
done nothing for as long as that lasts. Shipping a memory and waiting months for
it to fill is how a good idea gets judged as a bad one.

**He has already done the runs.** `engine_runs` holds every turn of every run
including the ones that finished, and each turn carries the step it chose. So the
routes exist; nothing had ever read them back.

`npm run hil:harvest` rebuilds them. Group turns by `run_id`, keep the runs whose
last verdict is `all_done`, take the host from the first address he actually
navigated to, and rebuild the step list from the turns themselves.

**The off-by-one that a test caught and the eye would not have.** A verdict rides
on the turn AFTER the step it judges, because he judges what just ran before
deciding what runs next. Reading it as judging its own turn drops exactly the
wrong step out of every harvested route: the failures stay and the successes go.
The result still looks like a plausible route, which is the problem. The fixture
in `hil-harvest.test.mjs` states the ordering explicitly so it cannot be quietly
inverted again.

**Three rules held deliberately identical to the live path**, because nothing
downstream can tell a harvested route from a lived one:

- only whole commands, never `task_done`, so no route mixes the steps of three
  jobs together;
- two independent runs to go live, so history cannot promote on weaker evidence
  than the living system demands;
- sameness is `goalOverlap`, so "book tickets for Insidious" and "book tickets
  for Sinners" merge into one job with two hits, which is the case that makes
  harvesting worth doing at all.

**One notion of sameness, one copy of it.** `scripts/lib/hil-pure.mjs` reads the
matching rules out of `procedures.ts` and strips its three type signatures rather
than restating them in node. A second copy would not fail loudly when it drifted:
routes would quietly stop being credited, or start being offered for jobs they
were never about. If that section is renamed or gains a construct the strip
cannot handle, the import throws on the next test run, which is the correct way
to find out.

**Dry run by default.** One pass, a service key, and a table every user's Braino
reads from. `--apply` is required, and writes use `ignore-duplicates` so a route
a live run already filed is never overwritten by an older reconstruction of it.
History fills the gaps; it does not correct the present.

**Verified:** 351 pass, 0 fail, 10 new. **Not yet run against the real table** —
that needs the migration applied and a service key, and the number it prints
(how many finished runs are actually in there) is the first thing worth putting
in this file afterwards.

---

## 2026-09-18 · Round 012 — he remembers what worked

**What triggered it:** the founder's read of a system architecture PDF, and the
one thing in it this repo did not already have. `braino_lessons` stores every
wall he has ever walked into. Nothing stored a single door he has ever found.
A run that booked the tickets correctly taught him nothing, so the next one
worked it out again from zero and paid the same ten seconds a turn to arrive at
the same answer.

The asymmetry is the whole finding. A wall is written down when he gives up, and
giving up is rare. A door is found on every run that works, which is most of
them, and none of it was kept. **He has been getting steadily better at failing
and no better at succeeding.**

**`braino_procedures`, built to the shape of `braino_lessons` on purpose**, since
the hard parts were solved there and solving them twice differently is how two
tables drift: scoped so recall is one indexed read, promoted on the second
independent run because one run is an anecdote, advisory always, and service-role
only because hil-loop is public.

**The route is derived, never asked for.** `routeFromSteps` reads the run's own
step record out of the state snapshot the client already sends every turn. It
costs zero output tokens, cannot be hallucinated, and records what he did rather
than what he would afterwards claim he did. Failed steps are dropped: a route is
the way that worked, and the three things he tried first are exactly the noise
the next run does not need. Written on `all_done` only, never `task_done` — one
job of three finishing is not evidence, and the steps at that point belong to all
three jobs mixed together.

**The bug that would have shipped silently, caught by its own test.** Sameness
was the fingerprint, which is `lessonFingerprint`'s normalisation: digits and
quoted strings go, proper nouns stay. So "book tickets for Insidious" and "book
tickets for Sinners" keyed differently, every film wrote its own row, **no row
would ever have reached the two hits that promote it**, and a table filling up
steadily would never once have handed anybody anything. The feature would have
looked built and done nothing, which is the worst failure mode available to it.

Sameness is now `goalOverlap`, the same function recall uses, at half the shorter
goal's content words. One notion of "the same job" in one function used in both
places: a route is credited on exactly the runs it would have been offered on.
The fingerprint stays as what it is actually good at, which is stopping two
simultaneous identical commands from inserting twice.

**A door can close, so a route can retire itself.** A site is redesigned and a
remembered route becomes a confident wrong answer, which is worse than no answer.
`recordProcedureMiss` counts a blocked run against the routes it was actually
handed — not every route on the host, or one bad afternoon would retire a whole
site. A row wrong at least as often as it was right drops back to `proposed` and
can earn its way back. Charged only when a route was genuinely injected, so a run
that never saw one cannot retire it.

**Repetition makes the library faster, not just larger.** A second run finishing
the same job in fewer steps replaces the route, so the stored answer improves
instead of ossifying around whatever the first clumsy run happened to do.

**Rule 13a, `HIL_LOOP_VERSION` 2.12.0.** The rule exists so a route reads as a
head start and not as a script or, worse, as permission. Three sentences do the
work: the screen still decides and a route that does not match the observation
means the site changed; every step is still taken one at a time and still
checked; and it grants nothing, so anything irreversible still stops for the
human exactly as it would have with no route at all. The injected block says the
same three things itself, so it does not depend on the rule having been read.

**What is deliberately NOT here.** No client change: the state already carried
the steps. No new model call, no second round trip — the two recalls are one
`Promise.all`, so the pair costs what the single lessons read cost before.
Nothing on the reflex path: `hil-router` still answers "play a song" in under a
second and has never heard of this table.

**Verified:** 331 pass, 0 fail, 18 new. Type-checked under `--strict`. The write
and retire paths were additionally exercised against a stubbed network, 15 cases:
a second film bumping the first film's row and promoting it, a shorter route
winning, a longer one being refused, a rejected route staying dead rather than
being re-inserted under a new id, a one-step job writing nothing at all, an
unrelated failure blaming nothing, and no credentials meaning silence rather than
a throw. **Not verified on hardware**, and the migration is not yet applied.

---

## 2026-09-18 · Round 011 — the net nobody was pulling

**What triggered it:** the start of HIL Version 2. Everything in that arc changes
how he thinks, and there was no way to tell a round that helped from a round that
only moved things around. This file's own rule is that an entry only counts if it
names the evidence, and ten rounds have honoured it by hand. Doing that by hand
is exactly why the weeks between rounds have no numbers at all.

**The net existed and could not be pulled.** `npm test` runs vitest, which is
scoped to `src/**` and `extension/**`. The 38 files in `tests/` are `node:test`
and were never in any command: they had to be run one file at a time, by someone
who already knew which file to run. A net nobody can pull is decoration.

`npm run test:hil` now runs all of them in one go, and `npm run test:all` runs
both halves.

**The failure that was seven rounds old was real, and it was not a test problem.**
Rounds 005 through 010 each closed with a line like *"the one failure is the same
`lib/hilShared.js` drift in the built extension copy, unrelated"*. It was not
unrelated and it was not drift in a test. `extension/lib/hilShared.js` was never
copied into `public/sidebrain-extension/` or `dist/sidebrain-extension/`, so the
extension people actually download had no such file, and its background worker
never imported it:

```
source  importScripts(..., "lib/searchGuard.js", "lib/hilShared.js", "lib/hilAdapter.js")
built   importScripts(..., "lib/searchGuard.js",                     "lib/hilAdapter.js")
```

`promisesAction`, `stepSignature` and `answerApproves` — the follow-through
detector, the repeat guard and the gate's yes-reader — were shipping absent.
`npm run sync:extension` was all it ever needed. Six rounds of calling a red
test unrelated is the cost of a failure nobody can run casually, which is the
same point as the paragraph above.

**A stale test was pinning a string instead of a behaviour.**
`mac-log-privacy.test.mjs` matched the literal `[Braino HIL-LOOP]` next to
`scrubForLog(thinking)`. Round 010 correctly made that tag a variable so the
brain doing the thinking is named. The privacy behaviour never changed; the test
failed anyway. It now pins the derivation and the scrub, which is what actually
matters, and it goes red only if a thought reaches a terminal unscrubbed.

**The reflex tier had no tests at all.** `hil-router` fronts every spoken
command, is public, has no screen and no second opinion, and had thirteen
siblings' worth of coverage and none of its own. Seven now, and the one that
matters says the floor is code: a verdict naming anything `[CANNOT UNDO]` is
rewritten to an escalate inside `readVerdict`, whatever rule 4 of the prompt did
or did not persuade the model of. Also pinned: the catalog allowlist as the last
word on tool names, all three unreadable-reply paths landing on escalate, the
model being chosen server-side, the cached prefix staying ahead of the dynamic
surface, and a rejected verdict being logged as `ok: true` so the safety net
firing reads as the net working rather than as an outage.

**And the scoreboard**, `npm run hil:score`, reads `engine_runs` and prints the
last seven days against the seven before: runs, finished, gave up, needed Astra,
steps to finish, thinking per run, unreadable turns, and the share of input
served from cache. Each row says which direction is better. It prints the prompt
versions in the window underneath, because two versions in one window means the
two columns are not the same brain and the comparison is not a comparison.

Four decisions in it worth keeping: a run is judged on its LAST verdict, not on
every step; `ask` is neither a win nor a loss, because a run waiting on a person
has not failed; steps-to-finish ignores runs that never finished, or a round that
stops circling earlier reads as a round that got slower; and a rescue counts once
per run, not once per turn, or Astra driving three turns reports three rescues.
Its arithmetic is tested against fixtures rather than the real table, because
`engine_runs` holds what people actually said to Braino.

**Verified:** 313 pass, 0 fail, up from 297 pass / 2 fail. 16 new. The whole
suite is green for the first time since Round 004. `npm run test:all` is the
command from here. No prompt version moved: nothing in this round changes how he
thinks, which is the point of doing it first.

---

## 2026-08-27 · Round 010 — the eyes were already there

**What triggered it:** *"the book tickets button was right there on the screen
and bro could not see it, kept scrolling. did bro take a look at the screen
using vision?"* And the principle behind it: every part of him is supposed to be
connected, the way a brain is connected to its hands and its eyes.

**Round 009 landed first, and it works.** The interjection path executed in a
real session for the first time:

```
09:23:00  hil.understand    running:true  kind:correction  "I meant to say itishpande21@gmail.com"
09:23:00  hil.loop.told     note:"Use itishpande21@gmail.com as the r..."
09:23:00  voice.interjection  kind:correction  told:true  chars:122
```

A correction went into the running job instead of into a side chat. That had
never once happened.

**I got the diagnosis wrong first and said so.** I told the founder the loop had
no vision and could not look. False. `macLookAtScreen` has been in main.cjs the
whole time, it screenshots the screen and hands it to a vision model, and it
works: it ran successfully 32 seconds later on the very next command. During the
booking run he chose `scroll`, `read`, `scroll`, `read`, `scroll` and never once
chose `look`.

So the gap was not a missing sense. **He had eyes and did not think to use
them**, and the reason is worth keeping: when Chrome does not expose page
content to the accessibility tree, the tree he gets is browser furniture, and a
tree with nothing in it looks exactly like a page that has not been scrolled far
enough. His reasoning was correct every step. The input was empty.

**So looking stops being a decision he has to remember.**

- **He looks instead of giving up.** Circling is precisely the moment a person
  stops and looks properly. The guard now takes one screenshot, pushes what it
  sees, clears the repeat window and continues. One rescue per run: if he
  circles again after actually seeing the screen, the screen really is not
  answering and stopping is right. `MAC_HIL_MAX_LOOKS = 3` caps the run.
- **What he was handed is logged.** `hil.observed` records the element count,
  the hidden count and the cap. The Book tickets run could not be diagnosed from
  the log at all: there was no way to tell a page with nothing on it from a page
  whose content fell off the end of a 220 element cap, and those need opposite
  fixes.

**A near miss worth recording.** Building this I added a second
`macLookAtScreen` without noticing the first, and in JavaScript the later
declaration silently wins. `node --check` passes that happily. Caught by reading
the grep output rather than the file. There is now a test asserting exactly one
definition exists.

**The overlapping notch, properly this time.** Round 009 fixed the wrong thing:
both overlapping replies were 140 and 118 characters against a threshold of 100,
so they were already classified long and the short-to-long promotion never
applied to them. The real fault is a CSS list. `#notch-face.nf-answer-open`
hides `.nf-think-dots` and `.nf-think-arrow`, the old furniture. The chip and
the canvas replaced those and were never added, so anything that set a phase
after an answer opened put the thinking layer straight back on top of it, and
"Deciding" printed through his reply. Guaranteed in CSS rather than by winning a
race in JS. Verified by forcing the exact bad state on `/notch-lab`: with
`nf-answer-open` and `nf-thinking` both set, the chip and canvas measure 0x0 and
`display: none` while the answer sits at 480x146.

**Two small ones from the same log.** *"Turn it off"* logging as a 10.3 second
job with an empty answer was a correct handover reading as a silent failure: the
run was superseded when the next command arrived, and a superseded run answers
with nothing on purpose. It now says so. And the fire and forget `[Braino HIL]`
line, which lands after whatever was said next, now names the command it belongs
to: *"proceed, check Google Calendar"* printed under an unrelated sentence and
read as though he had answered that sentence with a calendar.

**Verified:** 203 tests, 202 pass, 4 new. Lint clean. The privacy test pinning
the `[Braino HIL]` format was updated, and still asserts the goal is scrubbed,
plus the command now beside it. The one failure is the same `lib/hilShared.js`
drift in the built extension copy, unrelated, now seven rounds old.

**A look at the top of every run was built and then removed**, same session, on
the founder's call and correctly: *"I don't want him to look at every single
job, that's just wasting time."* It would have bought nothing on the runs that
were already working, which is most of them, and charged a screenshot and a
vision call before anything had gone wrong. Looking now happens only where the
need is proven: when he catches himself repeating. That is the exact point the
Book tickets run reached at step four and answered by giving up.

A second trigger is tempting and deliberately not built yet: looking when the
observation comes back with no page content in it, which is the underlying fault.
It needs a threshold, and picking one today would be a guess. `hil.observed` was
added this round precisely to gather that, so it can be set from real numbers.

**Not verified on hardware.**

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
