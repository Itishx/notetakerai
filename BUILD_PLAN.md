# BUILD_PLAN.md

**Braino — codebase audit, verb segregation, and phased build plan**
Prepared for: Itish Pande · Creatish Inc.
Prepared by: Claude Code (CTO seat), against `Itishx/notetakerai` @ `1a8e7b9`, branch `BrainoMain`
Status: **proposal — nothing built, awaiting approval**

---

## 0. How to read this document

The Five Verbs brief is the product truth and I am not relitigating it. The stitch
(Body / Brain / Hat), the Day Loop, the asked-twice rule, the 20% rule, "never the
words AI assistant" — all adopted as written.

What changes here is the *engineering* picture, because the brief was written from
memory of the product and this was written from `find`, `grep`, and a test run. In
eleven places the code on disk does not match the brief. Most of those differences
are **in your favour** — Braino is further along than the brief says, in exactly the
verb the brief calls missing.

Three sections matter most if you read nothing else:

- **§2 — Eleven corrections.** What the brief gets wrong about the code.
- **§5.0 — Phase 0.** Why the migration in the brief will fail on contact with the
  test suite, and the one week of work that prevents it.
- **§4 — The one real change to your proposed tree.** `remembers` must stay
  server-side. Moving it client-side forks the moat.

---

## 1. What is actually on disk

Measured, not estimated. All counts from `1a8e7b9`.

| Area | Files | LOC | Notes |
|---|---:|---:|---|
| `src/` (web app) | 318 | 93,023 | 220 pages, 162 routes, **71 are teaser/deck/docs pages** |
| `extension/` (Chrome MV3) | 15 | 38,995 | manifest says **v4.3.5**, not 4.4.8 |
| `mac/braino-mac/` (Electron) | 61 | 40,477 | 22,589 `.cjs` + 15,482 renderer `.js` + 2,406 Swift |
| `supabase/` | 154 | 26,466 | **96 edge functions**, 84 migrations, 53 tables, `_shared` = 8,828 LOC |
| `tests/` + `src/test/` | 45 | ~2,900 | **287 node tests: 285 pass, 2 fail** |
| **Total (product code)** | | **~199,000** | |

### The four god files

This is the single most important number in the audit:

| File | LOC | % of its surface |
|---|---:|---:|
| `extension/content.js` | 25,607 | 66% of extension |
| `mac/braino-mac/main.cjs` | 19,184 | 47% of Mac |
| `mac/braino-mac/renderer/braino-mac.js` | 12,326 | 30% of Mac |
| `extension/background.js` | 10,253 | 26% of extension |
| **Four files** | **67,370** | **~85% of the two client surfaces** |

Everything else in `mac/` and `extension/` is already well-factored — 25 small `.cjs`
intent modules averaging 200 LOC, each with its own test. Those are not the problem.
**The migration cost in this repo is four files, not two repos.** Any plan that does
not say what happens to those four files is not a plan.

---

## 2. Eleven corrections to the brief

Ordered by how much they change the build plan.

### 2.1 Verb 3 (Remembers) is not missing. It is the most finished engine you have.

The brief says *"Verbs 3, 5 — missing. No persistent notebook."* and files every
Remembers row as `SPEC` or `IDEA`.

On disk:

- `supabase/functions/_shared/memory-engine/` — a complete 8-module engine:
  `capture.ts`, `extract.ts`, `gate.ts`, `store.ts`, `retrieve.ts`, `render.ts`,
  `tiers.ts`, `types.ts`, plus README and a preview harness.
- `braino_memories` table (migration `20260622000002`) with `content`, `category`
  (identity / preference / relationship / project / fact / event), `salience`,
  `source`, `status`, `supersedes`, `dedup_key`, `last_used_at`, and two tuned
  indexes for ranked retrieval and dedup.
- `_shared/user-knowledge.ts` injects ranked memories into every prompt, gated by
  tier, ranked against the current message.
- `Dashboard.tsx` already has a `memory` tab with full CRUD over those rows.
- A comment in `hil-loop/index.ts` reads: *"The memory engine has been filling
  `braino_memories` for months."*

**The brief's `IDEA` row — "Five memory types (Master Plan) … to be collapsed into
one schema" — is already built.** `category` + `salience` *is* that collapse, shipped
and indexed.

What is genuinely missing from Verb 3 is narrower and much cheaper than "build the
moat": **the Notebook as a first-class object** (a durable, user-legible document
distinct from a pile of rows), **the calendar pattern summariser**, and **the debrief
writer**. That is roughly 15% of what the brief scoped, and it sits on top of a store
that already works in production.

> **Impact on the plan:** Phase 1 shrinks from "build the memory moat" to "give the
> existing memory engine a face and two new writers." Weeks, not a month.

### 2.2 Calendar is built, and it is Google, not EventKit.

The brief: *"Calendar / Reminders / Contacts read — EventKit native permission —
`SPEC` — Mac · critical first build."*

On disk: `_shared/google-calendar.ts` (375 LOC, 18 exports — OAuth state signing,
token refresh, event watch registration, event summarisation) plus six edge
functions: `google-calendar-oauth-start`, `-oauth-callback`, `-connection-status`,
`-action`, `-reminders`, `-push-webhook`. A `google_calendar_connections` table, a
`google_calendar_reminder_announcements` table, `_shared/watch-resolve.ts` (622 LOC),
and a live consumer in `main.cjs`: `setInterval(() => void checkCalendarNext(), 5 * 60 * 1000)`.

**Recommendation: build the morning greet on Google Calendar and ship it. Add
EventKit in Phase 4, not Phase 1.** Reasons, in order of weight:

1. It already works, on all three surfaces, today.
2. EventKit is Mac-only and the greet then cannot be tested on web or extension.
3. EventKit means a new TCC permission prompt during onboarding — precisely when
   you are most likely to lose the user — for data you can already read.
4. You have a **push webhook**. EventKit gives you polling. Push is strictly better
   for a proactive product.

EventKit's real advantage is local calendars with no Google account, and Reminders +
Contacts, which Google does not cover. That is a Phase 4 completeness argument, not a
first-build argument.

### 2.3 The Emotional Engine is built, and the brief gives it no status.

`_shared/emotional-engine/`: `engine.ts`, `moments.ts` (179 LOC), `moment-reader.ts`,
`tells.ts`, `classes.ts`, `language.ts`, `settings.ts`, `manifest.ts`, and **14 trait
modules** — attunement, authenticity, boundaries, charm, diction, honesty, humanity,
humor, ideation, identity, presence, register, selfhood, warmth. Wired into
`hil-loop`, `hil-reason`, and `braino-prompt.ts`. Has a test (`emotional-moments.test.ts`).

The brief lists 12 qualities; the code has 14 (it adds `charm`, `diction`, `register`,
`honesty`, and drops `candor`/`directness` as separate names). **Someone should
reconcile the names once and pick one list** — right now the deck and the code
disagree, and the deck is the one people quote.

### 2.4 HIL is half-real, and the half that is fake is the half the brief describes.

The brief describes a 10-stage pipeline: Perceive → Resolve → Frame → Intent →
Decompose → Graph → Route → Gate → Execute → Verify.

What is **real and shipping**:
- `mac/braino-mac/hil-routing.cjs`, `hil-understand.cjs`, `hil-verify.cjs` — all three
  `require`d by `main.cjs` (lines 204–212), sitting in front of the regex cascade, with
  four dedicated test files.
- `extension/lib/hilAdapter.js` + `hilShared.js`, loaded in `background.js`.
- `_shared/human-intelligence/` — system prompt, router prompt, loop prompt, a
  **tool catalog with `isIrreversible()`** (the reversibility property the brief asks
  for — already there), and a `lessons.ts` recall/record loop backed by the
  `braino_lessons` table.

What is **not real**: the `reasoning/hil-loop` edge function (929 LOC) is a lab. Its
own header says so: *"Nothing real executes anywhere near this function: the caller
runs steps against a pretend world. The /human-intelligence page's Loop tab is the
only consumer."*

Stage-name coverage across the HIL prompt files is lopsided — `gate` 22 mentions,
`resolve` 20, `route` 13, but `decompose` 1, `graph` 1, `verify` 1. **The middle of
the pipeline is a diagram, not code.**

And the eval set is `files/evals.jsonl` — **12 lines**. Twelve. For the layer that
decides whether Braino is allowed to click Buy.

### 2.5 Hera is Parakeet on-device, not Whisper V3.

The brief: *"Hera dictation — on-device STT … Whisper V3 + LLM cleanup; parallel-chunk
cleanup idea pending."*

On disk: `native/BrainoDictate/` is Swift + **FluidAudio running NVIDIA Parakeet
(streaming EOU, 160 ms chunks) on the Apple Neural Engine**. 675 LOC, with a carefully
documented protocol and two hard-won design rules in its header (engine started once;
model never reset mid-session). `BRAINO_PARAKEET=0` falls back to an OpenAI Realtime
**transcription-only** session — the cloud is the fallback, on-device is the default.

This matters for the roadmap: **"parallel-chunk cleanup" is designed against the wrong
transcriber.** Parakeet already emits `partial` / `utterance` / `delta` / `final` as a
monotonically growing transcript. You do not have chunks to parallelise — you have a
stream. The right optimisation is *incremental cleanup of the delta suffix while the
user is still speaking*, which is a different (and cheaper) build. Re-spec before
scheduling.

### 2.6 The Delegate rearchitecture is partly shipped — and its spec does not exist.

The brief lists `DELEGATE_REARCHITECTURE.md` as a spec on disk and the rearchitecture
as "spec written."

`DELEGATE_REARCHITECTURE.md` **does not exist in this repo, and never has** — no file,
no git history, on any branch. Same for `itish-voice-reference.md`.

Meanwhile the things the spec was supposed to introduce are **already in
`extension/lib/`**: `elementMap.js` (427 LOC — the indexed element map, stamping
`data-braino-idx`), `recovery.js`, `taskState.js`, `searchGuard.js`, `macroStore.js`,
`hilAdapter.js`. And `mac/braino-mac/chrome-page.cjs` implements the same indexed-stamp
discipline for the Mac's DOM path, with an excellent header explaining why the
accessibility tree was abandoned for the web.

> **Impact:** "Delegate rearchitecture shipped" as a Phase 4 acceptance criterion is
> unmeasurable — there is no spec to check against. Either the spec is in a Claude
> chat and needs to land in the repo, or Phase 4 needs a written definition of done
> before it can be scheduled. **This is open question Q1.**

### 2.7 The Mac app is Electron with Swift sidecars, and that changes store readiness.

The brief says "Mac app" and schedules "signed/notarized Mac build" as one Phase 5
line item.

Reality: Electron main process (`main.cjs`) + a renderer + **six separate Swift
binaries** — `BrainoAX.swift` (807 LOC), `BrainoDictate` (SPM package), `BrainoSpeech`,
`BrainoWakeWord`, `BrainoControlTap`, `BrainoLiveCaption` (a full `.app` bundle with
its own `Info.plist` and `_CodeSignature`), `BrainoFormat`, `BrainoTouchID`.

Notarising that is not one line item. Every helper binary needs signing with hardened
runtime, the `.app` needs correct entitlements for Accessibility + Screen Recording +
Microphone + Input Monitoring, and `BrainoLiveCaption.app` is a nested bundle, which
is its own notarisation failure mode. There is currently **no `electron-builder` /
`electron-forge` config in the repo at all** — `mac:dev` runs Electron directly against
source.

> **Estimate: 2–3 weeks, not 2–3 days.** Start it in parallel at Phase 1, not at Phase 5.

### 2.8 There is no CI. At all.

No `.github/workflows`. Nothing runs on push.

You are proposing to split ~199,000 LOC across seven packages and two apps. **Doing
that without CI is the single highest-variance decision in this plan.** It is also the
cheapest to fix — the node test suite needs zero dependencies to run.

### 2.9 Twenty-seven test files assert on source text. The migration breaks all of them.

This is the finding that reorders the roadmap.

287 tests, 285 passing. But **27 of the 37 files in `tests/` use
`readFileSync` + regex against source files** — they assert that `main.cjs` *contains
a particular string*, not that a function *behaves* a certain way. Example, from the
currently-failing `mac-log-privacy.test.mjs`:

```
The input did not match the regular expression
/\[Braino HIL-LOOP\][\s\S]{0,40}scrubForLog\(thinking\)/
```

These tests are pinned to file paths and literal source text. **The moment you move
`main.cjs` into `packages/`, 27 files go red simultaneously**, and you will not be able
to tell a real regression from a moved string. That is how a two-week migration becomes
a two-month one.

The instinct will be to delete them. Don't — they encode real invariants (privacy
scrubbing, model-default alignment, HIL routing rules). They just encode them at the
wrong altitude.

### 2.10 Two tests are already red on `BrainoMain`.

Reproduced with `node --test "tests/*.test.mjs"`:

1. `tests/mac-log-privacy.test.mjs:47` — *"the screen gets the same treatment as the
   file."* A privacy invariant: HIL-LOOP thinking must be scrubbed before logging. The
   source-grep no longer matches. **Needs a human to confirm whether the privacy
   behaviour regressed or only the string moved.** Treat as a possible privacy bug
   until proven otherwise.
2. `tests/openai-models.test.mjs:35` — *"keeps source, downloadable, and built
   extension model defaults aligned."* The built extension in `public/` has drifted
   from `extension/` source. **The extension your users download is not the extension
   in the repo.** Ties to the 4.3.5 / 4.4.8 version mismatch in §2.11.

### 2.11 Smaller mismatches

- **Extension version:** `extension/manifest.json` and `dist-extension/manifest.json`
  both say **4.3.5**. The brief says 4.4.8. Combined with the failing drift test: the
  build outputs are stale.
- **Greeno is not in this repo.** No file, no reference, anywhere. "Merge-back decided
  — salvage what works" cannot start until that code is accessible. **Open question Q2.**
- **`files/hil.py` pins `claude-sonnet-4-6`.** That model id is stale. If the HIL
  starter is ever promoted to production, it should target current Claude 5 models
  (`claude-opus-5` / `claude-sonnet-5`, with `claude-haiku-4-5-20251001` for the fast
  path — which it already uses correctly).
- **`src/pages/BuildPlan.tsx`** is a public page containing a *previous* build plan —
  Polar.sh paywall phases, "all features free for everyone right now." It is stale
  marketing shipped as product. Either update it or pull the route.
- **No workspaces.** `package.json` has no `workspaces` field, 57 deps, 26 devDeps,
  one root `package.json` for web + extension + Electron. The proposed monorepo needs
  tooling that does not exist yet.

---

## 3. Task 1 — Codebase audit: module → verb → status

Tagging rules, as the brief specifies: exactly one verb per module, or `engine` / `ui`
/ `cut`. **Modules that straddle verbs are marked ⚠ — those are the split candidates.**

### 3.1 `mac/braino-mac/` — Electron + Swift

| Module | Verb | Status | LOC | Depends on | Notes |
|---|---|---|---:|---|---|
| `main.cjs` | ⚠ **all five** | live | 19,184 | electron, all `.cjs`, Swift bins | **The split. See §5.1.** 96 IPC handlers, ~12 `setInterval` loops |
| `renderer/braino-mac.js` | ⚠ ui + hears + shows-up | live | 12,326 | preload | Notch face, boot, speak, greeting |
| `renderer/dashboard.js` | ui | live | 1,087 | preload | |
| `renderer/braino-os.js` | ui | live | 753 | | |
| `renderer/onboarding.js` | shows-up | live | 402 | | **6-step tap flow, already built** (brief: `SPEC`) |
| `renderer/wallpaper.js` + `boot-intro.js` + `her-*.js` | ui | live | ~914 | | First-run ritual |
| `native/BrainoAX.swift` | acts | live | 807 | AX APIs | Tier-1 AX. Largest native asset |
| `native/BrainoDictate/` | hears | live | 675 | FluidAudio, ANE | **Parakeet on-device** (§2.5) |
| `native/BrainoWakeWord.swift` | hears | partial | 229 | | Brief says `IDEA`; code exists + tested |
| `native/BrainoControlTap.swift` | hears | live | 222 | | Double-Option capture |
| `native/BrainoSpeech.swift` | hears | live | 165 | | |
| `native/BrainoLiveCaption.swift` (+ `.app`) | sees | partial | 143 | | Nested bundle — notarisation risk |
| `native/BrainoFormat` / `BrainoTouchID` | engine / acts | live | 146 | | |
| `dictation.cjs` | hears | live | 547 | | Hera control grammar |
| `preload.cjs` | engine | live | 486 | | IPC surface |
| `chrome-page.cjs` | sees | live | 273 | AppleScript | **DOM read via user's own Chrome** |
| `hil-routing.cjs` | engine (HIL) | live | 223 | | Cascade vs. loop decision |
| `hil-understand.cjs` / `hil-verify.cjs` | engine (HIL) | live | 166 | | |
| `braino-os-color.cjs` | ui | live | 215 | | |
| `cowork-design.cjs` | acts | live | 197 | | |
| `teleprompter.cjs` + `-intent.cjs` | acts | live | 184 | | |
| `notch-response.cjs` | ui | live | 140 | | |
| `music-segment-intent.cjs` + `spotify-focus-return.cjs` | acts | live | 178 | | Spotify |
| `meeting-audio.cjs` + `meeting-intent.cjs` | sees | **dead-ish** | 199 | | Brief: *"never worked reliably — parked"* |
| `file-search-match.cjs` | acts | live | 65 | | |
| `log-privacy.cjs` | engine | live | 55 | | **Has a failing test — see §2.10** |
| `dance-intent.cjs` | **cut** | live | 79 | | Brief explicitly freezes dancing |
| `idle-screen-intent.cjs` | sees | live | 70 | | |
| `braino-code-intent.cjs` | acts (Foundry) | partial | 82 | | Foundry hat seed |
| `interrupt-intent.cjs` / `wallpaper-intent.cjs` / `whats-new-intent.cjs` / `braino-os-intent.cjs` | acts / ui | live | ~244 | | |

### 3.2 `extension/` — Chrome MV3 v4.3.5

| Module | Verb | Status | LOC | Notes |
|---|---|---|---:|---|
| `content.js` | ⚠ **sees + acts + ui** | live | 25,607 | **The other split.** 139 delegate references |
| `background.js` | ⚠ engine + acts | live | 10,253 | 159 delegate references; loads HIL adapter |
| `offscreen.js` | sees | live | 567 | Tab audio capture — the origin feature |
| `lib/elementMap.js` | acts | live | 427 | **Indexed element map — rearchitecture, shipped** |
| `lib/macroStore.js` | remembers | live | 236 | ⚠ only client-side memory in the codebase |
| `lib/hilAdapter.js` + `hilShared.js` | engine (HIL) | live | 307 | |
| `lib/taskState.js` | engine | live | 166 | |
| `lib/openTargets.js` | acts | live | 148 | |
| `lib/recovery.js` | acts | live | 141 | Assertion/verification |
| `lib/searchGuard.js` | acts | live | 115 | |
| `lib/models.js` | engine | live | 37 | **Source of the failing drift test** |
| `cam.js` / `cam.html` | **cut** | live | 89 | No product surface in the brief |
| `braino-popup.*` | ui | live | 682 | |

### 3.3 `supabase/functions/` — 96 edge functions, 53 tables

| Group | Verb | Status | Notes |
|---|---|---|---|
| `_shared/memory-engine/` (8 modules) | **remembers** | **live** | §2.1. The moat, already running |
| `_shared/emotional-engine/` (14 traits + 8) | **engine** | **live** | §2.3 |
| `_shared/human-intelligence/` (5 modules) | **engine (HIL)** | partial | §2.4. Prompts + catalog + lessons real |
| `reasoning/hil-loop` | engine (HIL) | **lab only** | 929 LOC, explicitly sandboxed |
| `reasoning/hil-reason` | engine (HIL) | live | 304 LOC |
| `_shared/user-knowledge.ts` | remembers | live | Prompt injection of ranked memories |
| `google/` (21 fns) | sees + acts | live | Calendar ×6, Drive ×11, Docs ×4 |
| `_shared/google-calendar.ts` + `watch-resolve.ts` | sees | live | §2.2. ~1,000 LOC |
| `chat/` | hears | live | `chat-about-notes` 912, `transcribe-and-notes` 739 |
| `realtime/` (7 fns) | hears | live | Voice + **full cost telemetry** |
| `spotify/` + `_shared/spotify.ts` | acts | live | |
| `notion/sync-to-notion` | acts | live | 489 LOC |
| `research/` (web + deep) | acts | live | |
| `x/` (18 fns) + `linkedin/` + `channels` | acts (**Foundry/Distra**) | live | **Largest single cluster.** Held per Bhaskar |
| `code/braino-code` | acts (Foundry) | partial | 448 LOC — Claude Code driver seed |
| `_shared/meeting-speakers.ts` | sees | **dead-ish** | 571 LOC for a parked feature |
| `_shared/dev-pulse.ts`, `site-design.ts`, `engine-log.ts` | engine | live | |
| `billing`, `auth`, `waitlist`, `logs`, `media`, `embed` | engine/ui | live | |

### 3.4 `src/` — web

| Cluster | Count | Verb | Notes |
|---|---:|---|---|
| Teaser / deck / docs / carousel / graphics pages | **71 of 220** | **cut → `legacy/`** | `SpiderManBrandNewDay` ×2 = 4,835 LOC |
| `Dashboard.tsx` | 1 | ⚠ remembers + ui | **6,868 LOC.** Has the `memory` tab → becomes the Notebook |
| `BrainoChat.tsx` | 1 | hears | 2,019 LOC |
| `Foundry.tsx`, `DistraPlan.tsx`, `BrainoX.tsx` | 3 | acts (Foundry) | Held |
| `BuildPlan.tsx` | 1 | **cut** | Stale plan shipped publicly (§2.11) |
| `MemoryEngineViz.tsx` | 1 | ui | Renders real `braino_memories` shape |
| `lib/testCommands.ts` | 1 | engine | 1,501 LOC |

### 3.5 Dead code list (as the brief asks)

Confirmed zero-or-near-zero product value, in removal order:

1. **Meetings** — `meeting-audio.cjs`, `meeting-intent.cjs`, `_shared/meeting-speakers.ts`, `mac-meeting-*.test.mjs`. **~850 LOC.** Brief: "never worked reliably — parked."
2. **`dance-intent.cjs`** — 79 LOC. Explicitly frozen.
3. **`cam.js` / `cam.html`** — 89 LOC, no surface.
4. **71 teaser/deck/docs pages** — the largest single deletion available. ~25,000 LOC estimated. Do **not** delete; move to `legacy/` for one release, per the brief's own rule.
5. **`BuildPlan.tsx`** — stale public plan.
6. **Seven duplicate pitch-deck artifacts in `files/`** — ~6 MB of PDFs/HTML in git.
7. **Root clutter** — `*.tmp.mjs` ×5, `braino-extension.zip` + `braino-dist-extension.zip` (933 KB each, committed), `brainoitish.JPG` (1 MB), both `bun.lock` **and** `bun.lockb` **and** `package-lock.json` (three lockfiles, 1 MB).

> Repo hygiene alone: **~10 MB and ~26,000 LOC** out of the working tree with zero
> product risk.

---

## 4. Task 2 — Reacting to the proposed structure

The verb-shaped monorepo is the right target. I am adopting it with **one structural
change, one addition, and one sequencing constraint.**

### 4.1 The one real change: `remembers` stays server-authoritative

Your proposal puts `packages/remembers` alongside `sees` and `acts` as a peer client
package owning "notebook schema + store."

**This would fork the moat.** Memory today lives in Postgres and is read by *three*
surfaces — web, extension, and Mac — through `_shared/user-knowledge.ts`. If
`packages/remembers` owns a store, you get two stores, and within a month they
disagree. The thing that makes Braino not-ChatGPT is that he knows you *the same* in
the notch, the browser, and the web. That is a property of a single authoritative
store, not of a well-named package.

**Revised:**

```
packages/remembers/          # a CLIENT, not a store
  ├── client.ts              # typed read/write against the memory-engine API
  ├── notebook.ts            # the Notebook projection (new)
  ├── patterns.ts            # calendar pattern summariser (new)
  └── cache.ts               # offline read-through cache, last-write-wins to server

supabase/functions/_shared/memory-engine/    # STAYS. Remains the source of truth.
  └── notebook/              # new: projection + debrief writer, server-side
```

Rule to hold: **every surface reads memory through `packages/remembers`; only
`memory-engine` writes to Postgres.** Offline Mac writes queue and flush.

This also answers the multi-agent constraint better than the original tree. Agent 2
does not need its own memory package — it needs a `user_id` and a scope. One store,
many readers, is the architecture that makes a second agent cheap.

### 4.2 The addition: `packages/os-core` needs an agent context, not just an event bus

The brief's constraint — *"adding Agent 2 must not require redesigning os-core"* — is
not blocked by package layout. It is blocked by **module-level mutable state in
`main.cjs`**: `let parakeet = { proc: null, ready: false, ... }`, `let cursorModeTimer`,
`let overlaySyncTimer`, `let wakeWordTailTimer`, and ~9 more singletons, plus
`setInterval` calls at module top level that start on require.

A second agent in the same process would share all of it.

```
packages/os-core/
  ├── agent-context.ts   # { agentId, userId, bus, memory, tools, timers, logger }
  ├── bus.ts             # typed events; every perceiver emits, nothing polls globally
  ├── timers.ts          # owned by a context, cancellable, testable — kills the 12 setIntervals
  ├── permissions.ts     # TCC state machine (Mac) + chrome.permissions (ext)
  └── config.ts
```

**Every singleton in `main.cjs` becomes a field on a context.** That single refactor —
not the package split — is what makes Agent 2 possible. It is also independently
valuable: it makes `main.cjs` testable without launching Electron, which is the reason
27 tests resorted to grepping source in the first place.

### 4.3 Everything else in your tree: adopted as written

`packages/sees`, `hears`, `acts`, `shows-up`, `engine`, `apps/{mac,chrome,web}`,
`hats/foundry`, `legacy/` — all adopted. Three notes:

- **`packages/engine`** should *re-export* from `supabase/functions/_shared/` rather
  than copy. The Emotional Engine and HIL prompts must stay single-sourced; they are
  already shared by 96 edge functions.
- **`hats/foundry`** already has more in it than the brief implies — 18 `x/` functions,
  `linkedin/`, `channels`, `code/braino-code`, and 8 X-related tables. It is the
  largest cluster in the backend. Held per Bhaskar's directive, but it should be
  *fenced* in Phase 0 so Companion work never accidentally depends on it.
- **Tooling:** use **bun workspaces** (a `bun.lock` already exists, `bun` is already
  the lockfile of record) rather than introducing Nx/Turborepo. One new concept, not two.

### 4.4 Proposed tree (final)

```
apps/
  mac/          # Electron shell, notch UI, onboarding, native bridges. Thin.
  chrome/       # MV3 shell, DOM bridge host. Thin.
  web/          # Chat + Notebook view. Thin.
packages/
  os-core/      # agent-context, bus, timers, permissions, config, auth
  sees/         # screen, DOM bridge, calendar reader, file index, audio capture
  hears/        # Parakeet pipeline, realtime voice, wake word, conversation runners
  remembers/    # CLIENT to memory-engine + notebook projection + pattern summariser
  acts/         # delegate runtime, AX tier-1, spotify, files, focus, routines, registry
  shows-up/     # scheduler client, greet composer, nudge detector, debrief initiator
  engine/       # re-exports emotional-engine + HIL; Braino Trace
hats/
  foundry/      # repo reader, Claude Code driver, Distra engines. Fenced.
supabase/       # UNCHANGED. Remains authoritative for memory, HIL prompts, personality.
native/         # Swift binaries + signing config (promoted out of mac/ for notarisation)
legacy/         # 71 teaser pages, meetings, dance, cam. One release, then deleted.
```

**One deliberate difference from the brief:** `native/` is promoted to top level. Six
Swift binaries with their own signing requirements should not be buried three levels
inside an app package when the notarisation pipeline has to find them.

---

## 5. Task 3 — Phased build plan

### 5.0 Phase 0 — Make the codebase movable (1 week, no feature work)

**The brief allocates Phase 0 to "audit + structure proposal + migration risk list."
That is this document. The actual Phase 0 is different and it is not optional.**

You cannot execute a seven-package migration against a test suite where 27 of 37 files
assert on source text (§2.9) and nothing runs on push (§2.8). Phase 0 is the week that
makes Phases 1–5 possible.

| # | Task | Why | Done when |
|---|---|---|---|
| 0.1 | **CI on push**: `node --test "tests/*.test.mjs"` + `vitest run` + `eslint` | Zero-dependency suite, ~30s. There is no reason not to have this today | Green check on every push to `BrainoMain` |
| 0.2 | **Fix the 2 red tests** — and decide whether `log-privacy` is a real privacy regression | A red suite trains people to ignore red | 287/287 |
| 0.3 | **Convert 27 source-grep tests to behavioural tests** | Otherwise the migration produces 27 meaningless failures | No test calls `readFileSync` on a source file |
| 0.4 | **Extract `agent-context` from `main.cjs`** (§4.2) | Kills 12 global timers; makes Electron-free testing possible; unblocks Agent 2 | `main.cjs` has zero module-level `setInterval` |
| 0.5 | **Adopt bun workspaces**, create empty `packages/*` with CODEOWNERS | Shape exists before code moves | `bun install` resolves workspaces |
| 0.6 | **Move dead code to `legacy/`** (§3.5) | ~26k LOC of migration surface deleted instead of migrated | Build + tests green with `legacy/` unreferenced |
| 0.7 | **Fence `hats/foundry`** — lint rule: no Companion package imports from `hats/` | Bhaskar's hold becomes mechanical, not remembered | Lint fails on violation |
| 0.8 | **Fix the extension build drift** (§2.10, §2.11) and reconcile 4.3.5 vs 4.4.8 | Users are downloading a different build than the repo | Drift test green; one version number |

**Rollback:** every item is independently revertable; 0.3 and 0.4 are the only ones
touching product code, both behind a green suite.

**Do not start Phase 1 until 0.1–0.4 are done.** This is the recommendation I would
most defend.

### Phase 0b — Notarisation, starting in parallel (§2.7)

Owner should start this at Phase 0 and let it run in the background: `electron-builder`
config, hardened runtime, entitlements for AX + Screen Recording + Mic + Input
Monitoring, signing for six Swift binaries including the nested
`BrainoLiveCaption.app`. **First signed-and-notarised build installing cleanly on a
second Mac is the milestone.** If this starts at Phase 5 it becomes the thing that
delays the launch.

### Phase 1 — Remembers: the Notebook (1.5 weeks, down from ~4)

Rescoped per §2.1 — the store exists, so this is a projection and two writers.

| Step | Detail |
|---|---|
| 1.1 | **Notebook projection**, server-side in `memory-engine/notebook/`. A rendered document over existing `braino_memories` rows grouped by `category`, ranked by `salience`. **No new table.** |
| 1.2 | **Calendar pattern summariser** — 3 months via the existing Google Calendar connection (§2.2). CLI first, as the brief correctly insists. |
| 1.3 | **Debrief writer** — yap → memory ops through the existing `extract.ts` + `gate.ts`. Reuse, do not rebuild. |
| 1.4 | **Demote `Dashboard.tsx`'s `memory` tab to the Notebook view.** Do not build a new page. |

**Acceptance (the brief's bar, kept):** Braino tells a stranger their own weekly
pattern from their real calendar and they say *"yeah, that's me."*
**Added engineering bar:** the same Notebook renders identically on web, extension, and
Mac from one server read.

### Phase 2 — Shows up: the morning greet (2 weeks)

**Architecture decision the brief does not make, and must:** *where does the scheduler
live?* The Mac is the only always-present surface, but it is asleep at 3am and may be
shut at 9am.

**Recommendation: server-scheduled, client-rendered.** You already have the precedent —
**pg_cron is in use in three migrations** (`x_follower_snapshot_cron`,
`braino_journal_cron`, `x_auto_pipeline`) with `dispatch-scheduled-x-posts` as the
dispatcher pattern.

| Step | Detail |
|---|---|
| 2.1 | `braino_greets` table + pg_cron job, per-user local-time aware |
| 2.2 | **Greet composer** edge function: calendar + notebook + (deferred) inbox → one composed line. Emotional Engine applied server-side, as `hil-loop` already does |
| 2.3 | Mac renders it in the notch. **Mac-local fallback** if the machine was offline at fire time: render on next wake, stamped, never twice |
| 2.4 | **The earned-proactivity gate** — build it now, as the brief demands. `profiles.proactivity_tier`, week 1 = greet only |

**Acceptance:** greet runs at 9am from real calendar + notebook for 10 strangers,
including at least 3 whose Mac was shut at 9am.

### Phase 3 — The loop closes (1 week)

Night debrief → notebook update → next morning's greet references it.
**Acceptance (brief's, kept):** day-2 greet references something said in the day-1
debrief. **Added:** an automated test asserts this end-to-end against a seeded user, so
the loop cannot silently break.

### Phase 4 — Stabilise `acts` and `hears` (2 weeks, blocked on Q1)

- **Delegate:** blocked until the rearchitecture spec exists in the repo (§2.6). The
  primitives are already shipped; what is missing is a definition of done.
- **Hera:** **re-spec before building** (§2.5). Parakeet streams deltas; there are no
  chunks to parallelise. The real win is incremental cleanup of the delta suffix
  during speech.
- **HIL evals: 12 → 100+.** The brief does not mention this and it is the highest-risk
  gap in the product. Twelve evals is not a safety net for a layer that decides whether
  to click Buy. `run_evals.py` already exists; it needs cases, and it needs to run in CI.
- **EventKit** lands here (calendars without Google, plus Reminders + Contacts).

### Phase 5 — Distribution (1 week, given 0b ran in parallel)

Chrome Web Store listing (`CHROME_WEB_STORE_GUIDE.md` already written), $99 Apple
Developer, onboarding flow. **The 6-step tap onboarding already exists** (§3.1) — this
is wiring it to the voice briefing, not building it.

**Acceptance:** a stranger installs both surfaces without a DM, and reaches a greet on
day 2.

### Revised timeline

| Phase | Brief's implied | This plan | Why |
|---|---|---|---|
| 0 — movable | (audit only) | **1 week** | New. Non-optional |
| 0b — notarisation | in Ph5 | **parallel, 2–3 wks** | §2.7 |
| 1 — Notebook | ~4 weeks | **1.5 weeks** | §2.1 — store exists |
| 2 — Greet | ~2 weeks | 2 weeks | unchanged |
| 3 — Loop | ~1 week | 1 week | unchanged |
| 4 — Stabilise | ~2 weeks | 2 weeks | +evals, −Hera respec risk |
| 5 — Store | ~1 week | 1 week | 0b already done |
| **Total** | ~10 weeks | **~8.5 weeks** | Phase 0 pays for itself twice |

---

## 6. Migration risk list

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | 27 source-grep tests break on first file move | **High** | Phase 0.3 — convert before moving |
| R2 | No CI; regressions land silently across 199k LOC | **High** | Phase 0.1 — one afternoon |
| R3 | `main.cjs` global state blocks Agent 2 *and* testing | **High** | Phase 0.4 — agent-context |
| R4 | Memory forks between client package and Postgres | **High** | §4.1 — server-authoritative, one writer |
| R5 | Electron + 6 Swift binaries fail notarisation late | **High** | Phase 0b — start in parallel, not Phase 5 |
| R6 | Delegate Phase 4 unmeasurable — no spec exists | Medium | **Q1** — land the spec or redefine done |
| R7 | Greeno merge-back blocked — code not in repo | Medium | **Q2** — get access or drop it |
| R8 | 12 HIL evals gate irreversible actions | **High** | Phase 4 — 100+ cases, in CI |
| R9 | Downloadable extension ≠ repo extension | Medium | Phase 0.8 |
| R10 | Possible privacy regression in HIL-LOOP logging | **High** | Phase 0.2 — human confirms |
| R11 | Foundry/X cluster accidentally becomes a Companion dep | Medium | Phase 0.7 — lint fence |
| R12 | Emotional Engine trait list differs deck vs code (12 vs 14) | Low | Reconcile once, pick one |

---

## 7. Open questions for the founder

**Q1 — Delegate rearchitecture spec.** `DELEGATE_REARCHITECTURE.md` does not exist in
this repo and never has. `elementMap.js`, `recovery.js`, `taskState.js`, `searchGuard.js`
suggest much of it already shipped. Is the spec in a Claude chat? Without it, Phase 4's
"rearchitecture shipped" is unmeasurable. **Blocks Phase 4.**

**Q2 — Greeno.** Not in this repo, no references anywhere. Where does
`greeno-omega.vercel.app`'s source live, and is "salvage what works" still on given
that the 6-step onboarding already exists in `renderer/onboarding.js`?

**Q3 — Inbox read.** Brief says "Gmail via Google testing mode (first 100 users) or
deferred." You already have Google OAuth infrastructure for Calendar, Drive, and Docs —
adding Gmail scope is small, but it changes your OAuth verification posture. **Greet
works without it.** Ship greet on calendar + notebook only, add inbox in Phase 4?

**Q4 — Scheduler ownership.** §Phase 2 recommends pg_cron server-side with Mac
fallback, following your existing `x_follower_snapshot_cron` pattern. The alternative —
Mac-local — is simpler but silently misses every morning the laptop is shut. Confirm
server-side.

**Q5 — Hera re-spec.** "Parallel-chunk cleanup" is designed against Whisper. You ship
Parakeet streaming (§2.5). Should Phase 4 build incremental delta cleanup instead, or
is there a reason the cloud path should become primary?

**Q6 — The 71 teaser pages.** They are 32% of your web surface and are not product.
`legacy/` for one release, then deleted — confirm, per your own rule.

**Q7 — Emotional Engine trait list.** Code has 14 traits, deck says 12, and the names
differ. Which list is canonical?

**Q8 — The 20% rule against this plan.** By my count Phases 1–3 are **~70% new
behaviour** (Notebook, greet, debrief, scheduler) and 30% fix/tune. That exceeds your
own 20% rule. I believe the rule should be *suspended for Phases 1–3 by explicit
decision* — Verbs 3 and 5 are the tool/someone gap and there is no way to close it with
tuning — but that is your call to make consciously rather than by drift.
Phase 0 and Phase 4 are 100% fix/tune and bring the average back.

---

## 8. What I did not do

Per the brief: **nothing was built.** No source file was modified. This document is the
only artifact.

Also flagged for later, per `AGENTS.md`: once a phase ships, its feature page goes in
`Braino Knowledge Base/` and `/knowledge`, registered in `src/lib/brainoKnowledge.ts`.
A plan is not yet a feature, so no KB page is created here.

---

*Braino — Not an app. A someone. · Creatish Inc. · Internal*
