# Braino Hera

**Faithful, system-wide, on-device dictation for macOS.**

Everything needed to rebuild Hera in a new repo: what it is for, why each decision is what it is, and the code. Self-contained. Nothing in it depends on the rest of Braino except one Supabase function and a mascot you can leave out.

---

## 1. The whole point

Double-tap Option. Speak. Double-tap Option again. The words appear where your caret already was, in any app, cleaned up.

That is the product. Everything below exists to make those three sentences true.

**Why it exists.** Wispr Flow proved the contract: dictation should work in the place you are already writing, not in a box you copy out of. But every cloud dictation tool pays a network round trip per session, which reviewers feel as one to two seconds. Hera puts the model on the Neural Engine, so on the normal path **there is no network leg at all.**

**The two promises, and they fight each other.**

1. **Preserve the words.** What you said, exactly, including names, numbers, URLs, code tokens and profanity. A dictation tool that improves your sentence into a different sentence is worse than useless, because you will not notice.
2. **Write what you meant.** Nobody wants their ums, their false starts, or the abandoned half of "meet at five, actually six".

Those two are in tension, and the resolution is the most important idea in the system: **a model does the cleaning, and deterministic code decides whether to accept it.** The model can delete and repunctuate freely. It cannot add a word, move a word, or change a number. A verifier checks that claim by aligning the two texts word by word, and any violation throws the whole edit away and inserts the raw transcript.

A rougher paste beats a fluent invention.

**Two systems, not one.** Transcription and insertion are separate and never block each other. Preserve the words first. Place them only once macOS can prove where they belong. If it cannot, the transcript goes to the notch and the clipboard rather than into the wrong window.

---

## 2. Two modes, one system

| | Dictation | Room |
|---|---|---|
| Gesture | double Option | `Cmd+Shift+E` |
| Length | a sentence to a few minutes | 40+ minutes |
| Output | inserted at the caret | notes, on screen |
| Source | your microphone, close | the room |
| Noise reduction | near-field on a headset, far-field on the built-in mic | far-field |

Same capture, same decoder, same clean-up contract. Only the destination differs. Build dictation first: room mode is dictation with a different sink and a longer session.

---

## 3. How a session flows

```
double Option ─┬─► start local capture IMMEDIATELY (audio held on device)
               └─► ask macOS where the caret is        (2.0 to 2.3s, blocking)
                                    │
                   ┌────────────────┴─────────────────┐
              secure field?                      editable field?
                   │                                   │
            stop mic, discard                   release the buffer
            (nothing uploaded)                          │
                                                        ▼
                                     ┌──────────────────────────────┐
                                     │  BrainoDictate (Swift)       │
                                     │  Parakeet on the ANE         │
                                     │  160ms chunks, streaming     │
                                     └──────────────┬───────────────┘
                              partial / utterance / delta / final
                                                    │
                       ┌────────────────────────────┴──────────┐
                       ▼                                       ▼
              notch shows live words              on each natural PAUSE:
                                                  prefetch the clean-up
                                                            │
                                                  ┌─────────┴─────────┐
                                                  │ formatter (model) │
                                                  └─────────┬─────────┘
                                                            ▼
                                                  ┌───────────────────┐
                                                  │ assessDictationEdit│ ← deterministic
                                                  │ accept or refuse   │
                                                  └─────────┬─────────┘
                                                            │
double Option ──────────────────────────────────────────────┤
                                                            ▼
                                            insert accepted text at the caret
                                            (paste, verify, or AX fallback)
```

**The two things that make it feel instant**, and neither is model choice:

1. **Capture starts with the shortcut, not after the focus probe.** The old build spent 2.0 to 2.3 seconds resolving Accessibility focus before it even asked for the microphone, so the first sentence was structurally unrecoverable. Now both start together and the audio is held locally until the privacy gate clears.
2. **The clean-up is prefetched during pauses, not run at stop.** Formatting is the slow leg at ~664ms. Someone who finishes a sentence before reaching for the shortcut pays nothing for it. Stop never waits on a formatting request.

---

## 4. On-device transcription (the normal path)

A standalone Swift executable the Electron app spawns, so no Swift runtime is pulled into the main process.

### The protocol

Deliberately tiny. Line-delimited JSON over stdio.

```
stdin   start | stop | quit

stdout  {"type":"ready"}                    models loaded, mic already running
        {"type":"partial","text":"..."}     running hypothesis, display only
        {"type":"utterance","text":"..."}   a finished phrase, display only
        {"type":"delta","text":"..."}       new words to append at the caret
        {"type":"final","text":"..."}       whole utterance, session closed
        {"type":"error","message":"..."}
```

`partial` and `utterance` are for the screen. `delta` and `final` are the record. Keeping them separate is what stops a provisional hypothesis reaching the caret.

### Package

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "BrainoDictate",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/FluidInference/FluidAudio.git", from: "0.12.0")
    ],
    targets: [
        .executableTarget(
            name: "BrainoDictate",
            dependencies: [.product(name: "FluidAudio", package: "FluidAudio")]
        )
    ]
)
```

NVIDIA Parakeet via FluidAudio, streaming end-of-utterance, 160ms chunks, on the Apple Neural Engine. Decode runs at about **0.081x real time**, roughly twelve times faster than the audio arrives.

### Two design rules that were both got wrong first

```swift
/*
 1. The engine is started ONCE, when the models finish loading, and never
    stopped between sessions. `start` only flips a flag. Starting AVAudioEngine
    on each press put mic spin-up directly in the path the user feels.

 2. The model is NEVER reset mid-session. FluidAudio's transcript grows
    monotonically, so track how much has already been sent and emit only the
    new suffix. Resetting on end-of-utterance raced with in-flight process()
    calls (FluidAudio's own source warns about exactly this) and silently ate
    the tail of whatever was still being decoded.
 */
```

### Backpressure: drop, never queue

The single most important rule in the audio path, and the actual reason long sessions work.

```swift
private final class MicPipeline: @unchecked Sendable {
    /* How far the decoder may fall behind before audio starts being dropped.
       The tap fires roughly twenty times a second, so this is about half a
       second of slack: enough to ride out a hiccup, not enough to build the
       kind of backlog that never drains. */
    static let maxBacklog = 12

    // ...in the tap callback, on the realtime audio thread:
    if self.inFlight.count > MicPipeline.maxBacklog {
        self.noteDropped()
        return                     // drop this buffer, stay current
    }
    self.inFlight.enter()
    self.sink.yield(AudioChunk(buffer: copy))
}
```

A queue that grows is already broken. If the decoder is behind, the **oldest** audio is the least useful thing you own. Buffer it and you drift further behind forever, and the transcript ends up describing something that happened a minute ago.

Log drops, but rate-limit the log. A session that drops steadily is a machine that cannot decode as fast as it hears, which is a different problem from a session that drops once:

```swift
func noteDropped() {
    lock.lock()
    dropped += 1
    let count = dropped
    let due = Date().timeIntervalSince(lastDropReport) > 5
    if due { lastDropReport = Date() }
    lock.unlock()
    if due { log("dropped \(count) buffers so far (decoder behind)") }
}
```

### The counter has to be a plain lock

```swift
/// Read by the realtime audio thread on every buffer, so it has to be a plain
/// synchronous lock. Asking an actor meant one Task per buffer, roughly 23 a
/// second, which starved the concurrency pool and wedged the command loop.
private final class InFlightCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var value = 0
    func enter() { lock.lock(); value += 1; lock.unlock() }
    func leave() { lock.lock(); value -= 1; lock.unlock() }
    var count: Int { lock.lock(); defer { lock.unlock() }; return value }
    func clear() { lock.lock(); value = 0; lock.unlock() }
}
```

Do not make this an actor. It is called from the realtime audio thread.

### Surviving a microphone change

`AVAudioEngine` binds its input node when it starts and **never re-binds**. Plug in a Bluetooth headset mid-session and the tap delivers nothing at all while the engine cheerfully reports itself as running.

```swift
// Rebuild on the notification...
observer = NotificationCenter.default.addObserver(
    forName: .AVAudioEngineConfigurationChange, object: engine, queue: nil
) { [weak self] _ in
    self?.rebuild(reason: "input device changed")
}

// ...and rebuild anyway if audio simply stops arriving, for the cases the
// notification does not cover.
if Date().timeIntervalSince(lastBufferAt) > 2.0 {
    rebuild(reason: "watchdog: no audio")
}
```

Both. The notification does not fire for every case, and a session that opens on a dead microphone is indistinguishable from a broken app.

### Audio format

Clean mono, and **no Chromium noise suppression and no automatic gain control.** One microphone-aware noise-reduction stage, not two. Processing speech twice is how it starts sounding underwater.

---

## 5. Cloud fallback

`BRAINO_PARAKEET=0` switches to a transcription-only OpenAI Realtime session. This is the fallback, not the normal route.

```js
function buildDictationTranscriptionConfig({
  model = "gpt-live-transcribe",
  keywords = [],
  languages = ["en", "hi"],
} = {}) {
  const cleanKeywords = Array.from(new Set([
    "Braino", "BrainoHERA", "Braino Hera", "IOMI", "Yap Mode",
    "Notch", "Itish", "Itish Pande",
    ...keywords,
  ].map((v) => String(v || "").trim()).filter(Boolean))).slice(0, 40);

  const config = {
    model,
    // OpenAI documents delay as the accuracy-over-latency control for streaming
    // transcription. Dictation can tolerate the extra beat.
    delay: "low",
  };

  // Context is valid only for the live/transcribe models. The older GA
  // gpt-realtime-whisper rejects prompt and keywords outright.
  if (/^(?:gpt-live-transcribe|gpt-transcribe)(?:$|-)/.test(model)) {
    config.prompt = [
      "This is direct personal dictation into a Mac text field.",
      "Transcribe every clearly spoken word faithfully in the language used by the speaker.",
      "Keep openings, filler words, repetitions, false starts, slang, and profanity when they are spoken.",
      "Add only punctuation and capitalization that are strongly supported by the speech.",
      "Keep names, brands, acronyms, numbers, URLs, file names, and code tokens exact.",
      "Do not summarize, answer, add ideas, or silently rewrite the meaning.",
      "Ignore music, keyboard noise, fans, coughs, and unrelated background speech.",
    ].join(" ");
    config.keywords = cleanKeywords;
    config.languages = Array.from(new Set(
      languages.map((v) => String(v || "").trim().toLowerCase()).filter(Boolean),
    )).slice(0, 8);
  }
  return config;
}

function buildDictationTurnDetection() {
  // gpt-live-transcribe currently rejects server turn detection. Keep the
  // WebRTC input buffer open and commit it from the renderer's local VAD.
  return null;
}
```

**Keep the filler words.** The transcription prompt asks for them explicitly. Cleaning happens later, in a stage that can be verified and refused. A model that tidies during transcription cannot be audited.

Three rules for this path:

- **PCM over the ordered data channel, never a separate RTP audio track.** Buffered opening audio and live frames go down the same ordered channel, so later words cannot overtake the opening.
- **Track turns by `item_id`.** Buffer completion events in commit order, assemble one session transcript at stop. Late events are ignored by ID so provisional text cannot insert twice.
- **1.2 second deadline at stop.** If the final event is late, consume the already-ordered deltas instead of waiting ~4 seconds or losing the phrase.

---

## 6. The clean-up, and the gate that guards it

Two halves. A model that edits, and deterministic code that decides whether to trust it. **The second half is the product.**

### The formatter

```ts
// supabase/functions/voice/dictation-refine/index.ts
const DICTATION_REFINEMENT_MODEL = Deno.env.get("DICTATION_REFINEMENT_MODEL") || "gpt-4.1-mini";
const MAX_TRANSCRIPT_CHARS = 20000;

const SYSTEM_PROMPT = `You clean up dictated speech into the text the speaker meant to write.

Return one JSON object with exactly one string field named "formatted".

Remove:
- Filler words: um, uh, er, hmm, like, you know, I mean, sort of, kind of.
- False starts and stuttered repeats: "the the parser" becomes "the parser".
- The abandoned half of a self-correction. Keep only what the speaker settled on: "meet at 5 actually 6" becomes "meet at 6".

Fix:
- Sentence case, punctuation, and paragraph breaks.
- Spoken numbers, times, currencies, percentages, and units the way people write them: "five p m" to "5 PM", "six o'clock" to "6:00", "twenty percent" to "20%", "twenty dollars" to "$20".
- A dictated list becomes a list.

Never:
- Add a word the speaker did not say. Not a reason, not a greeting, not a closing.
- Remove a word that carries meaning. Only fillers, false starts, and corrected-away words may go.
- Move a word or clause earlier or later.
- Answer, explain, comment, greet, or summarize.
- Translate. Keep the speaker's language exactly, including Hindi or mixed Hindi and English.
- Change emails, URLs, handles, hashtags, file names, code, product names, or personal names.
- Guess. If an edit would require guessing, keep the source wording.

Output no commentary and no Markdown.`;
```

On device the same contract is given to Apple's on-device model. The cloud endpoint is the fallback.

**A history worth knowing.** This started as a strictly lossless formatter judged by a gate demanding identical words in identical order. The two halves then contradicted each other: cleaning the speech was the entire point, and every clean-up was rejected. Both halves now share the contract above.

### The gate

Never trust the formatter. Align its output against what was actually heard and price every operation.

```js
const DICTATION_EDIT_MIN_COVERAGE = 0.55;

/* Alignment prices. Dropping a word is ordinary; swapping one for a word that
   sounds like it is a real correction but has to stay rare; adding a word that
   was never spoken is the thing this gate exists to stop, so it is priced out
   of every path rather than merely discouraged. */
const DICTATION_SUBSTITUTE_COST = 10;
const DICTATION_INSERT_COST = 1000;

function assessDictationEdit(source, candidate) {
  const raw = String(source || "").trim();
  const edited = String(candidate || "").trim();
  if (!raw) return { accepted: false, reason: "empty_source" };
  if (!edited) return { accepted: false, reason: "empty_candidate" };

  // Deleting words shortens text; punctuation and digits move it a little the
  // other way. Growing well past the original means something was added.
  const lengthRatio = edited.length / Math.max(1, raw.length);
  if (lengthRatio > 1.8) return { accepted: false, reason: "length_grew", lengthRatio };

  // Emails, URLs, handles, hashtags, file names, code tokens: present in the
  // source means present in the output, character for character.
  const foldedCandidate = edited.normalize("NFKC").toLowerCase();
  const missing = protectedDictationTokens(raw).find(
    (t) => !foldedCandidate.includes(t.normalize("NFKC").toLowerCase()),
  );
  if (missing) return { accepted: false, reason: "protected_token_changed", token: missing };

  const sourceTokens = dictationSemanticTokens(raw);
  const candidateTokens = dictationSemanticTokens(edited);
  if (!sourceTokens.length || !candidateTokens.length) {
    return { accepted: false, reason: "missing_words" };
  }

  const align = alignDictationEdit(sourceTokens, candidateTokens);

  // A word with no counterpart in the speech is an invention, and a candidate
  // whose clauses have moved can only be explained as one. Either way it never
  // reaches the caret.
  if (align.inserted > 0) {
    return { accepted: false, reason: "words_added_or_reordered", ...align };
  }

  const sourceCoverage = (align.matched + align.substituted) / sourceTokens.length;
  if (sourceCoverage < DICTATION_EDIT_MIN_COVERAGE) {
    return { accepted: false, reason: "too_much_removed", sourceCoverage, ...align };
  }

  /* Correcting a misheard word is useful; correcting many is a rewrite wearing
     a clean-up's clothes. A handful per utterance, and never most of it. */
  const substitutionCap = Math.min(4, Math.max(1, Math.ceil(sourceTokens.length * 0.15)));
  if (align.substituted > substitutionCap) {
    return { accepted: false, reason: "too_many_words_changed", substitutionCap, ...align };
  }

  return {
    accepted: true,
    reason: align.substituted === 0 && align.deleted === 0 ? "faithful" : "cleaned",
    sourceCoverage,
    ...align,
  };
}
```

The alignment is order-preserving by construction, so a candidate whose clauses have been shuffled can only be explained as insertions, and insertions are refused.

### What counts as "the same word heard twice"

```js
/* Speech models mishear words that sound alike, and a formatter reading the
   whole sentence often has the context to put them right: a real microphone
   pass produced "tell the teen thanks", which is plainly "team". Refusing that
   correction threw away the entire clean-up over one letter.

   Same stem counts too, so "cant" may become "cannot" and "deploy" may become
   "deployment". Words that merely appear in the same sentence do not: "deploy"
   never becomes "expired", and digits never move at all, because a wrong number
   is the one mistake nobody catches by rereading. */
function dictationTokensAreClose(left, right) {
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long  = left.length <= right.length ? right : left;

  // A number is never close to another number.
  if (/\d/.test(left) || /\d/.test(right)) return false;

  if (short.length >= 4 && long.startsWith(short) && long.length - short.length <= 4) return true;
  if (short.length < 3) return false;
  return characterEditDistance(left, right) <= 2;
}
```

**Numbers are never corrected.** "The 6th" can never become "the 8th". That is the one mistake nobody catches by rereading their own dictation.

### Failure is a feature

A refused edit, a timeout, an auth failure, a service error: all of them insert the **raw transcript**. Formatting is best-effort. A result that is not ready before stop is skipped for that turn.

---

## 7. Putting the words at the caret

Transcription is done. Now prove where they belong.

### Never guess

The field must **own the caret**. Guessing the "nearest" field can paste private speech into the wrong window. No caret, no insertion: the transcript goes to the notch and the clipboard.

Password and secure fields are blocked outright.

### Focus resolution

System-wide macOS Accessibility focus, then walk editable ancestors and focused descendants, because Chromium and Electron editors nest the real field several levels down. That walk is why browser and Electron editors work at all.

```js
const focus = await runAxHelper(["focused"]);

if (focus.status === "needs-accessibility") {
  void askForPermission("accessibility");
  return fail("Braino needs Accessibility permission to type.");
}
if (focus.status === "secure") {
  return fail("Hera stays out of password and secure text fields.");
}
if (focus.status !== "editable") {
  return keepFallback(text, focus.status);   // notch + clipboard
}
```

### The paste, with a front-app gate

A real paste event is the most compatible insertion path across native, Chromium, Electron, terminal and remote-desktop editors. But focus can move between the check and the keystroke, so the check and the keystroke happen **inside one AppleScript**, atomically.

```js
async function pasteDictationFallback(text, expectedApp = "") {
  const previousClipboard = clipboard.readText();
  clipboard.writeText(text);
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", [
      "-e",
      [
        "on run argv",
        'tell application "System Events"',
        "set targetProcess to first application process whose frontmost is true",
        "set targetName to name of targetProcess as text",
        'set expectedName to ""',
        "if (count of argv) > 0 then set expectedName to item 1 of argv as text",
        "ignoring case",
        'if expectedName is not "" and targetName is not expectedName then return "moved" & tab & targetName',
        "end ignoring",
        "key code 9 using {command down}",
        'return "pasted" & tab & targetName',
        "end tell",
        "end run",
      ].join("\n"),
      expectedApp,
    ], { timeout: 4000 });

    const [outcome = "", targetApp = ""] = String(stdout || "").trim().split("\t");
    if (outcome !== "pasted") {
      return { ok: false, targetApp, previousClipboard,
               error: `Focus moved from ${expectedApp} to ${targetApp}.` };
    }

    // The paste is dispatched synchronously. Keep the clipboard alive for a
    // short native-event grace period, then restore it, without adding a
    // visible half-second tax to every insertion.
    await new Promise((r) => setTimeout(r, 140));
    if (clipboard.readText() === text) clipboard.writeText(previousClipboard);
    return { ok: true, targetApp, previousClipboard };

  } catch (error) {
    // A failed paste deliberately leaves the transcript ON the clipboard. It is
    // safer to preserve the user's words than to restore old contents and make
    // a successful transcription unrecoverable.
    return { ok: false, targetApp: "", previousClipboard,
             error: error?.message || "paste command failed" };
  }
}
```

### Verify it landed

Some apps intercept `Cmd+V`. A dispatched keystroke is not evidence.

Fingerprint a **non-content** Accessibility property of the field before and after (length, selection range), and compare. Never read the field's contents to check: that turns dictation into a tool that reads what you were already writing.

```js
let verification = ok
  ? await verifyDictationFieldChange(focusTarget, text)
  : { verified: false, reason: "paste_command_failed" };

if (ok && verification.verified === false) {
  ok = false;                       // fall through to AX insertion
}
```

If a verifiable paste did nothing, try selected-text Accessibility insertion. If that fails too, keep the words: notch plus clipboard.

### Recovery is not an error state

No editable field is a normal outcome, not a failure. The completed transcript opens in the notch and is copied automatically. The user keeps their words either way.

---

## 8. The gesture

Double Option. No modifier chord, nothing anyone types by accident, and one hand.

```js
// A tap is Option down then up under 300ms with nothing else pressed.
// Two of those inside 400ms is the gesture.
let lastTap = 0;

function onOptionTap() {
  const now = Date.now();
  if (now - lastTap < 400) { lastTap = 0; toggleHera(); }
  else { lastTap = now; }
}
```

Needs a `CGEventTap` (see `BrainoControlTap.swift`) because Electron's `globalShortcut` cannot see a bare modifier.

**Every spoken phrase is dictation.** Saying "done" types "done". There are no hidden voice stop commands, because a dictation tool that sometimes interprets you is one you cannot trust with a sentence containing the word "stop".

Pauses finalise turns internally, but the field stays untouched until the stop gesture. One insertion, at the end, in commit order.

---

## 9. The notch UI

While Hera is active the notch becomes one fixed-width black transcript sheet, expanding downward with the same spring as every other answer surface.

- **Fixed width.** Finished phrases stack **above** the current phrase, so text never pushes the notch sideways or overlaps the label.
- **The wordmark:** `Braino` stays white, uppercase `HERA` carries a moving green shimmer.
- **States:** Listening, Hearing you, Finishing.
- The listening glow disappears the instant the stop gesture lands, before the drain finishes. Stop should feel like it worked, because it did.

```css
.hera-sheet {
  width: 580px;                    /* fixed. never content-sized */
  background: #000;
  border-radius: 26px;
  transition: height 1050ms cubic-bezier(.22, 1, .36, 1);
}
.hera-label { font: 650 9px/1 system-ui; text-transform: uppercase;
              color: rgba(255,255,255,.6); }
.hera-label .hera-mark {
  background: linear-gradient(90deg, #4ade80, #a7f3d0, #4ade80);
  background-size: 200% 100%;
  -webkit-background-clip: text; color: transparent;
  animation: hera-shimmer 2.4s linear infinite;
}
@keyframes hera-shimmer { to { background-position: -200% 0; } }

.hera-done { color: rgba(255,255,255,.42); }   /* settled phrases */
.hera-live { color: #f7f7f5; }                 /* the current one */
```

Also print every completed transcript to the renderer console as `[BrainoHERA] "…"`. It is the fastest way to debug a bad session.

---

## 10. Privacy

Not a feature. The reason people will leave it switched on.

- **Transcription is on device by default.** No audio leaves the Mac. It works with the wifi off.
- **The WebRTC sender stays trackless and all pre-roll stays local until the Accessibility gate approves the target.** A secure-field rejection stops the microphone and discards the buffer **without uploading it**.
- **Up to 30 seconds of pre-roll**, kept locally, so words spoken immediately after the shortcut survive both focus detection and a cold connection.
- **The microphone is not kept open between sessions.** It would remove latency and it would also leave the macOS privacy indicator lit. That trade is refused deliberately.
- The connection is **transcription-only**. No conversational model is downstream, so nothing can summarize, answer, or rewrite.

---

## 11. Config

| | Value |
|---|---|
| On-device model | NVIDIA Parakeet via FluidAudio ≥ 0.12.0, streaming EOU, 160ms chunks |
| Switch | `parakeetEnabled()`. `BRAINO_PARAKEET=0` forces cloud |
| Cloud model | `gpt-live-transcribe`, `delay: "low"` |
| Formatter, on device | Apple's on-device model |
| Formatter, cloud | `DICTATION_REFINEMENT_MODEL`, default `gpt-4.1-mini` |
| Languages | `["en", "hi"]` |
| Max transcript | 20,000 chars |
| Backlog before dropping | 12 buffers, about 0.5s |
| Final-event deadline at stop | 1200ms |
| Hard cap before pasting raw | 900ms |
| Min buffer to commit | 100ms |

One secret: `OPENAI_API_KEY`, and only for the cloud paths. The normal path needs nothing.

---

## 12. Measured

M-series MacBook Air, real binaries.

| Leg | Measured |
|---|---|
| Live words appear after you start speaking | ~900ms |
| Stop to full transcript available | 14 to 40ms |
| Stop to cleaned text, after a natural pause | 0 to 1ms |
| Stop to cleaned text, stopping mid-word | ~480ms |
| Parakeet decode | 0.081x real time, ~12x faster than the audio |
| Clean-up on Apple's on-device model | 664ms median |

The shape matters more than any number. Transcription streams locally, so by the time the stop gesture lands there is almost nothing left to transcribe. The clean-up is the slow part, which is why it starts from a settled phrase during a pause rather than at stop.

For contrast, Wispr Flow publishes sub-700ms p99 for its whole pipeline and reviewers report one to two seconds in practice, because every session makes a cloud round trip. Hera has no network leg on this path.

**Accuracy is a separate question and is not claimed here.** Wispr reports about 97.2% on standard English audio. Hera has no comparable measured figure.

---

## 13. Files to copy

| From | What it is |
|---|---|
| `mac/braino-mac/dictation.cjs` | **The most valuable file.** The gate, alignment, number folding, transcription config, turn policy. Pure functions, no Electron, fully testable |
| `mac/braino-mac/native/BrainoDictate/` | The Parakeet helper. Swift package, one `main.swift` |
| `mac/braino-mac/native/BrainoAX.swift` | System-wide focused-element discovery and AX insertion |
| `mac/braino-mac/native/BrainoControlTap.swift` | The `CGEventTap` behind double Option |
| `supabase/functions/voice/dictation-refine/` | The cloud formatter |
| `mac/braino-mac/main.cjs` | Session ownership, focus checks, the atomic paste gate, clipboard recovery, logs. Search `hera` and `dictation` |
| `mac/braino-mac/renderer/braino-mac.js` | Pre-roll, the privacy gate, PCM producer, local VAD, `item_id` buffering, formatter prefetch |
| `tests/mac-dictation.test.mjs` | The gate's test suite. Copy it with the gate |

Build order:

1. `dictation.cjs` plus its tests. Pure, and everything else depends on the contract it defines.
2. `BrainoDictate`. Verify the stdio protocol from a terminal before wiring any UI.
3. The double-Option tap.
4. Focus, paste, verify, fallback. Test in Notes, Mail, Notion and an Electron editor before believing it.
5. The notch sheet.
6. The formatter and the prefetch, last. It is an optimisation over something that already works.

---

## 14. Traps

- **`AVAudioEngine` never re-binds its input node.** Rebuild on the config-change notification **and** on a watchdog.
- **Never reset the model mid-session.** It races in-flight `process()` calls and eats the tail.
- **Do not make the in-flight counter an actor.** One Task per buffer starves the pool and wedges the command loop.
- **Drop audio, never queue it.**
- **Start capture with the shortcut, not after the focus probe**, or the first sentence is structurally unrecoverable.
- **`gpt-live-transcribe` rejects server turn detection.** Commit from a local VAD.
- **The older `gpt-realtime-whisper` rejects `prompt` and `keywords`.** Guard on the model name.
- **PCM over the ordered data channel**, never a separate RTP track, or later words overtake the opening.
- **Check the front app and paste in one AppleScript.** Two calls is a race, and the prize is your speech in the wrong window.
- **A dispatched `Cmd+V` is not evidence.** Fingerprint and verify.
- **On failure, leave the transcript on the clipboard.** Restoring the old contents destroys a good transcription.
- **Accessibility and screen-recording grants are keyed to the binary.** Every dev rebuild voids them, and the symptom is a bare `Command failed` from `osascript`, which is a consent prompt hanging invisibly. If the code looks right, it is right. Re-grant.

---

## 15. Known limits, worth stating plainly

- No model promises perfect words for every accent, microphone, name, code token or noisy room.
- The formatter **cannot** recover a word the speech model misheard. A name heard as another name needs vocabulary context or a personal dictionary, and the formatter is forbidden from guessing.
- Keyword hints improve the odds for names and product terms. They do not force a word.
- No personal dictionary UI, no app-specific formatting, no backtrack editing, no transcript history, no audio replay queue.
- Some apps intercept `Cmd+V` or expose incomplete Accessibility trees. The words survive; the user may still paste manually.
- "Instant" means capture starts when the shortcut lands. macOS still takes a hardware-dependent moment to return the live stream.
- The correction allowance is deliberately small: at most four words per utterance, never more than about a sixth of it, and only where the spellings are close. Beyond that the whole edit is refused.

---

## 16. How to know it works

```js
// The gate is where the tests belong. It is pure, and it is the thing that
// stops a fluent invention reaching somebody's document.

test("refuses an invented word", () => {
  const r = assessDictationEdit("send it tomorrow", "Please send it tomorrow.");
  expect(r.accepted).toBe(false);
  expect(r.reason).toBe("words_added_or_reordered");
});

test("accepts fillers being removed", () => {
  const r = assessDictationEdit("um so the the parser is uh broken", "So the parser is broken.");
  expect(r.accepted).toBe(true);
});

test("resolves a self-correction", () => {
  const r = assessDictationEdit("meet at five actually six", "Meet at 6.");
  expect(r.accepted).toBe(true);
});

test("never changes a number", () => {
  const r = assessDictationEdit("due on the 6th", "Due on the 8th.");
  expect(r.accepted).toBe(false);
});

test("protects a URL", () => {
  const r = assessDictationEdit("go to trybraino.com now", "Go to trybraino.co now.");
  expect(r.accepted).toBe(false);
  expect(r.reason).toBe("protected_token_changed");
});

test("allows one close mishearing", () => {
  const r = assessDictationEdit("tell the teen thanks", "Tell the team thanks.");
  expect(r.accepted).toBe(true);
  expect(r.substituted).toBe(1);
});

test("refuses a rewrite wearing a clean-up's clothes", () => {
  const r = assessDictationEdit(
    "i think we should probably ship it on friday",
    "We will deploy Friday.",
  );
  expect(r.accepted).toBe(false);
});
```

And one that is not a test: **do a real microphone pass across Notes, Mail, Notion and an Electron editor before believing any of it.** The Accessibility tree is different in every one of them, and that is where this breaks.
