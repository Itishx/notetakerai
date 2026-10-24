import AVFoundation
import FluidAudio
import Foundation

/*
 BrainoDictate — on-device dictation for Braino for Mac.

 Runs NVIDIA Parakeet (streaming EOU, 160ms chunks) on the Apple Neural Engine
 via FluidAudio, so English dictation never leaves the machine.

 Protocol
   stdin   start | stop | quit
   stdout  {"type":"ready"}                  models loaded, mic already running
           {"type":"partial","text":"..."}   running hypothesis, display only
           {"type":"utterance","text":"..."} a finished phrase, display only
           {"type":"delta","text":"..."}     new words to append at the caret
           {"type":"final","text":"..."}     whole utterance, session closed
           {"type":"error","message":"..."}

 Two things this design gets deliberately right, because the first cut got both
 wrong:

 1. The engine is started ONCE, when the models finish loading, and never
    stopped between sessions. `start` only flips a flag. Starting AVAudioEngine
    on each press put mic spin-up directly in the path the user feels.

 2. The model is NEVER reset mid-session. FluidAudio's transcript grows
    monotonically, so we track how much has already been sent and emit only the
    new suffix. Resetting on end-of-utterance raced with in-flight `process()`
    calls — FluidAudio's own source warns about exactly this — and silently ate
    the tail of whatever was still being decoded.
 */

private struct AudioChunk: @unchecked Sendable {
    let buffer: AVAudioPCMBuffer
}

/// Read by the realtime audio thread on every buffer, so it has to be a plain
/// synchronous lock. Asking an actor meant one Task per buffer — roughly 23 a
/// second — which starved the concurrency pool and wedged the command loop.
/// How many audio chunks have been handed to the consumer but not yet decoded.
private final class InFlightCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var value = 0

    var count: Int {
        lock.lock(); defer { lock.unlock() }
        return value
    }

    func enter() { lock.lock(); value += 1; lock.unlock() }
    func leave() { lock.lock(); value = max(0, value - 1); lock.unlock() }
    func clear() { lock.lock(); value = 0; lock.unlock() }
}

private final class ListeningFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var value = false
    private var peak: Float = 0
    private var frames = 0
    private var lastReport = Date.distantPast

    var isOn: Bool {
        lock.lock(); defer { lock.unlock() }
        return value
    }

    func set(_ next: Bool) {
        lock.lock(); defer { lock.unlock() }
        value = next
        peak = 0
        frames = 0
    }

    /// Returns a line to log once a second, otherwise nil.
    func note(peak level: Float, frames count: Int) -> String? {
        lock.lock(); defer { lock.unlock() }
        peak = max(peak, level)
        frames += count
        guard Date().timeIntervalSince(lastReport) >= 1 else { return nil }
        lastReport = Date()
        let report = "audio peak \(String(format: "%.4f", peak)) over \(frames) frames"
        peak = 0
        frames = 0
        return report
    }
}

/// The session transcript, as the model actually reports it.
///
/// Partials are display only. The partial callback reports the current
/// hypothesis for the window, which shrinks and rewrites itself, and diffing it
/// produced the same words over and over — "up up up what what what".
///
/// What reaches the caret is the end-of-utterance transcript. The important
/// detail, and the one the previous version got wrong: FluidAudio hands back
/// the WHOLE transcript accumulated since the last reset on every one of those
/// callbacks, and `finish()` decodes that same token accumulator again. Neither
/// is a per-phrase suffix. Collecting them in a list and joining it therefore
/// said everything twice — a real speaker-to-mic pass returned "needed five
/// actually six pm can you tell the teen thanks" concatenated to itself, and a
/// three-phrase session would have been far worse.
///
/// So the transcript is stored as one cumulative string that each callback
/// REPLACES, and `finish()` supersedes it when it returns anything at all.
private actor CommitQueue {
    private var cumulative = ""
    private var latestPartial = ""

    /// One end-of-utterance report: the session so far, not the newest phrase.
    func commit(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        cumulative = trimmed
        // The utterance is closed, so the running hypothesis is spent.
        latestPartial = ""
    }

    /// The newest running hypothesis. `finish()` was observed returning an
    /// empty string on short sessions while partials clearly carried the words,
    /// so this is what a session falls back to rather than losing the audio.
    func notePartial(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        latestPartial = trimmed
    }

    /// The best full transcript available, most authoritative first. Never a
    /// concatenation: all three sources describe the same session.
    func resolve(tail: String) -> String {
        let finished = tail.trimmingCharacters(in: .whitespacesAndNewlines)
        if !finished.isEmpty { return finished }
        if !cumulative.isEmpty { return cumulative }
        return latestPartial
    }

    func clear() {
        cumulative = ""
        latestPartial = ""
    }
}

@main
struct BrainoDictate {
    static func main() async {
        // `--file <path> [--chunk 160|320|1280]` transcribes a wav and exits.
        // Same streaming path the microphone uses, so what it reports is what
        // dictation would produce.
        let argv = CommandLine.arguments
        if let fileIndex = argv.firstIndex(of: "--file"), fileIndex + 1 < argv.count {
            var chunk = StreamingChunkSize.ms320
            if let c = argv.firstIndex(of: "--chunk"), c + 1 < argv.count {
                switch argv[c + 1] {
                case "160": chunk = .ms160
                case "1280": chunk = .ms1280
                default: chunk = .ms320
                }
            }
            let rounds = argv.contains("--twice") ? 2 : 1
            await transcribeFile(path: argv[fileIndex + 1], chunkSize: chunk, rounds: rounds)
            exit(0)
        }

        let commits = CommitQueue()
        let listening = ListeningFlag()
        let inFlight = InFlightCounter()
        // 700ms: long enough that a mid-sentence breath is not treated as the
        // end of a thought, short enough to still feel immediate. EOU now only
        // paces commits — correctness no longer depends on it.
        /* 160ms, back from 320ms (2026-10-16).
         *
         * 320ms was chosen while the mic queue had no backpressure and falling
         * behind cost whole sentences. MicPipeline.maxBacklog fixed that, and
         * the health line now reads ~9ms mean decode with a backlog peak of 1,
         * so there is room to spare. At 320ms only ~2 partials a second reached
         * LIVE, with gaps up to 2s, which reads as words arriving in lumps.
         * Wispr Flow streams 40ms frames for the same reason: words should land
         * as they are said. If `health:` ever shows the backlog climbing, this
         * is the line to put back. */
        let asr = StreamingEouAsrManager(chunkSize: .ms160, eouDebounceMs: 700)

        // Partials are for the Notch only — never inserted, because they get
        // rewritten as the model firms up its guess.
        await asr.setPartialCallback { text in
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return }
            emit(["type": "partial", "text": trimmed])
            Task { await commits.notePartial(trimmed) }
        }
        // A finished utterance is the only thing that gets typed.
        await asr.setEouCallback { text in
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            // Announced for the Notch only, and it carries the whole settled
            // transcript rather than one phrase, because that is what the
            // callback provides. The display replaces what it is showing; it
            // must not append, or the panel would repeat every earlier phrase.
            // This is NOT what reaches the caret: insertion happens once, from
            // the delta at stop.
            if !trimmed.isEmpty { emit(["type": "utterance", "text": trimmed]) }
            Task { await commits.commit(text) }
        }

        do {
            log("loading Parakeet models…")
            try await asr.loadModels()
            log("models ready")
        } catch {
            emit(["type": "error", "message": "model load failed: \(error)"])
            exit(1)
        }

        /* Everything the next test run needs to answer one question: is the
           machine keeping up, or is the screen the slow part?
           Decode time is measured here because this is the only place that
           knows how long the model actually took. */
        let health = DecodeHealth()

        let (stream, continuation) = AsyncStream<AudioChunk>.makeStream()
        let consumer = Task {
            for await chunk in stream {
                defer { inFlight.leave() }
                let began = Date()
                do {
                    _ = try await asr.process(audioBuffer: chunk.buffer)
                } catch {
                    emit(["type": "error", "message": "process failed: \(error)"])
                }
                health.noteDecode(seconds: Date().timeIntervalSince(began), backlog: inFlight.count)
                // Deliberately no reset here. Resetting between utterances
                // corrupted the decoder mid-stream, which is what produced
                // "up up up what what what" and the empty finishes. Committed
                // utterances simply queue up until the session ends.
            }
        }

        let mic = MicPipeline(flag: listening, inFlight: inFlight, sink: continuation)

        // Mic comes up now, once, so `start` costs nothing later. Staying up is
        // a separate problem — see MicPipeline.
        do {
            try mic.start()
        } catch {
            emit(["type": "error", "message": "mic start failed: \(error)"])
            exit(1)
        }

        // A dead tap does not raise anything, so something has to keep asking
        // whether audio is still arriving at all.
        let watchdog = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 500_000_000)
                mic.healIfDeaf(reason: "no audio arriving")
            }
        }

        emit(["type": "ready"])

        let commands = AsyncStream<String> { continuation in
            let thread = Thread {
                while let line = readLine(strippingNewline: true) {
                    continuation.yield(line)
                }
                continuation.finish()
            }
            thread.name = "braino.stdin"
            thread.start()
        }

        for await line in commands {
            switch line.trimmingCharacters(in: .whitespaces) {
            case "start":
                // The input device can have changed since the last session —
                // connecting a Bluetooth headset is enough to do it. Prove the
                // tap is alive before the user starts talking into a dead one.
                mic.healIfDeaf(reason: "session start", threshold: 0.75)
                await asr.reset()
                await commits.clear()
                inFlight.clear()
                listening.set(true)
                log("listening")

            case "stop":
                listening.set(false)
                // The consumer may still be several chunks behind. Asking for
                // the transcript before it catches up is why short sessions
                // came back empty.
                let stopStartedAt = Date()
                var settle = 0
                while inFlight.count > 0 && settle < 60 {
                    try? await Task.sleep(nanoseconds: 25_000_000)
                    settle += 1
                }
                let drainedMs = Int(Date().timeIntervalSince(stopStartedAt) * 1000)
                do {
                    // One transcript, chosen — never several concatenated. See
                    // CommitQueue: every source reports the same whole session.
                    let tail = try await asr.finish()
                    let text = await commits.resolve(tail: tail)
                    if !text.isEmpty {
                        emit(["type": "delta", "text": text])
                    }
                    let totalMs = Int(Date().timeIntervalSince(stopStartedAt) * 1000)
                    // Logged so the cost of stopping is measurable instead of
                    // argued about: decode backlog vs the final decode.
                    log("stop: drain \(drainedMs)ms, total \(totalMs)ms, \(text.count) chars")
                    emit(["type": "final", "text": text])
                } catch {
                    emit(["type": "error", "message": "finish failed: \(error)"])
                }
                await asr.reset()
                await commits.clear()
                log("stopped")

            /* Rotate: end the segment, reset the decoder, keep listening.
             *
             * The model is never reset mid-session because resetting under
             * in-flight `process()` calls corrupts the decoder. That is right,
             * and it is also why a long session degrades: FluidAudio's
             * transcript grows monotonically, every end-of-utterance callback
             * hands back the WHOLE session again, and by minute three the
             * decoder is carrying thousands of tokens it will never need and
             * re-emitting them several times a second. Dictation never noticed
             * because dictation is ten seconds long. An hour of lecture is a
             * different machine.
             *
             * So this does exactly what `stop` does — stop feeding, wait for
             * the backlog to drain, finish, reset — and then starts listening
             * again. Same proven order, no race, and the caller keeps the
             * finished segment. Asked for between utterances, so the gap lands
             * in a pause rather than mid-word. */
            case "rotate":
                listening.set(false)
                var rotateSettle = 0
                while inFlight.count > 0 && rotateSettle < 60 {
                    try? await Task.sleep(nanoseconds: 25_000_000)
                    rotateSettle += 1
                }
                do {
                    let tail = try await asr.finish()
                    let text = await commits.resolve(tail: tail)
                    if !text.isEmpty { emit(["type": "segment", "text": text]) }
                    log("rotate: \(text.count) chars")
                } catch {
                    emit(["type": "error", "message": "rotate failed: \(error)"])
                }
                await asr.reset()
                await commits.clear()
                inFlight.clear()
                listening.set(true)

            case "quit":
                listening.set(false)
                continuation.finish()
                consumer.cancel()
                watchdog.cancel()
                mic.stop()
                await asr.cleanup()
                exit(0)

            default:
                break
            }
        }

        continuation.finish()
        watchdog.cancel()
        mic.stop()
        await asr.cleanup()
    }
}

/// The tap MUST be installed from a nonisolated context.
///
/// `@main`'s `main()` is MainActor-isolated under Swift 6, so a closure written
/// inline there inherits that isolation. CoreAudio then calls it on its own
/// realtime queue, Swift checks the isolation it was promised, and the process
/// traps in `dispatch_assert_queue_fail` the moment audio starts flowing.
/// Installing from here keeps the closure free of any actor, which is what a
/// realtime audio callback has to be anyway.
/// Feeds a wav through the same streaming manager the microphone uses.
private func transcribeFile(path: String, chunkSize: StreamingChunkSize, rounds: Int = 1) async {
    let asr = StreamingEouAsrManager(chunkSize: chunkSize, eouDebounceMs: 700)
    // The callbacks run concurrently, so collection goes through the same
    // actor the live path uses rather than captured vars.
    let commits = CommitQueue()

    let began = Date()
    await asr.setPartialCallback { text in
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        log("+\(Int(Date().timeIntervalSince(began) * 1000))ms partial: \(trimmed)")
        Task { await commits.notePartial(text) }
    }
    await asr.setEouCallback { text in
        log("+\(Int(Date().timeIntervalSince(began) * 1000))ms EOU")
        Task { await commits.commit(text) }
    }

    do {
        try await asr.loadModels()
        for round in 1...rounds {
        // Each round is a full session: start, feed, stop.
        await asr.reset()
        await commits.clear()
        let url = URL(fileURLWithPath: path)
        let file = try AVAudioFile(forReading: url)
        let format = file.processingFormat
        // 100ms at a time, roughly what a live tap delivers.
        let frames = AVAudioFrameCount(format.sampleRate / 10)
        while file.framePosition < file.length {
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { break }
            try file.read(into: buffer, frameCount: frames)
            if buffer.frameLength == 0 { break }
            _ = try await asr.process(audioBuffer: buffer)
        }
        let tail = try await asr.finish()
        let result = await commits.resolve(tail: tail)
        emit([
            "type": "file_result",
            "round": "\(round)",
            "chunk": "\(chunkSize.durationMs)ms",
            "chars": "\(result.count)",
            "text": result,
        ])
        }
    } catch {
        emit(["type": "error", "message": "file transcribe failed: \(error)"])
    }
}

/// Owns the microphone for the life of the process.
///
/// AVAudioEngine binds its input node to whichever device was default when the
/// engine started, and it does NOT re-bind on its own. Connect a Bluetooth
/// headset, unplug an interface, let the system switch input for any reason,
/// and the installed tap stops delivering buffers — while the engine still
/// reports itself as running. That is silent, permanent deafness.
///
/// It is not hypothetical: on 2026-08-20 a pair of Bluetooth buds connected
/// eight minutes before a dictation session, and the log shows fourteen seconds
/// of "listening" with zero audio buffers and an empty transcript. The last
/// session that ever saw audio was a week earlier, on the built-in mic.
///
/// So the tap is rebuilt whenever the configuration changes, and a watchdog
/// rebuilds it anyway for the cases the notification does not cover.
///
/// The tap closure MUST stay free of any actor. `@main`'s `main()` is
/// MainActor-isolated under Swift 6, so a closure written inline there inherits
/// that isolation; CoreAudio then calls it on its own realtime queue and the
/// process traps in `dispatch_assert_queue_fail`. Building it in here, on a
/// type with no global actor, is what keeps it nonisolated.
/* A five second heartbeat while listening.
 *
 * Two numbers decide whether real-time transcription is working, and neither of
 * them is visible from the outside: how long a decode actually takes, and how
 * deep the backlog is. If decode time is under the chunk length and the backlog
 * is near zero, the machine is keeping up and any lag is further downstream. If
 * decode is over and the backlog climbs, nothing downstream can save it.
 *
 * Written as one line rather than per event, because a per-chunk log is three
 * lines a second and nobody reads that. */
private final class DecodeHealth: @unchecked Sendable {
    private let lock = NSLock()
    private var decodes = 0
    private var totalSeconds = 0.0
    private var worstSeconds = 0.0
    private var deepestBacklog = 0
    private var since = Date()

    func noteDecode(seconds: Double, backlog: Int) {
        var line: String?
        lock.lock()
        decodes += 1
        totalSeconds += seconds
        worstSeconds = max(worstSeconds, seconds)
        deepestBacklog = max(deepestBacklog, backlog)
        let elapsed = Date().timeIntervalSince(since)
        if elapsed >= 5 {
            let mean = decodes > 0 ? (totalSeconds / Double(decodes)) * 1000 : 0
            let rate = Double(decodes) / elapsed
            line = String(
                format: "health: %.1f decodes/s, mean %.0fms, worst %.0fms, backlog peak %d",
                rate, mean, worstSeconds * 1000, deepestBacklog
            )
            decodes = 0; totalSeconds = 0; worstSeconds = 0; deepestBacklog = 0; since = Date()
        }
        lock.unlock()
        if let line { log(line) }
    }
}

private final class MicPipeline: @unchecked Sendable {
    /* How far the decoder may fall behind before audio starts being dropped.
       The tap fires roughly twenty times a second, so this is about half a
       second of slack: enough to ride out a hiccup, not enough to build the
       kind of backlog that never drains. */
    static let maxBacklog = 12

    private let engine = AVAudioEngine()
    private let flag: ListeningFlag
    private let inFlight: InFlightCounter
    private let sink: AsyncStream<AudioChunk>.Continuation

    private let lock = NSLock()
    private var lastBufferAt = Date()
    private var quietUntil = Date.distantPast
    private var failures = 0
    private var observer: NSObjectProtocol?
    private var dropped = 0
    private var lastDropReport = Date.distantPast

    /* Dropping is worth knowing about: a session that drops steadily is a
       machine that cannot decode as fast as it hears, which is a different
       problem from a session that drops once. Reported at most every few
       seconds so the log stays readable. */
    func noteDropped() {
        lock.lock()
        dropped += 1
        let count = dropped
        let due = Date().timeIntervalSince(lastDropReport) > 5
        if due { lastDropReport = Date() }
        lock.unlock()
        if due { log("dropped \(count) buffers so far (decoder behind)") }
    }

    init(
        flag: ListeningFlag,
        inFlight: InFlightCounter,
        sink: AsyncStream<AudioChunk>.Continuation
    ) {
        self.flag = flag
        self.inFlight = inFlight
        self.sink = sink
    }

    /// How long since the tap last handed over audio. Buffers arrive whether or
    /// not a session is open, so this reads as health even while idle.
    var silenceAge: TimeInterval {
        lock.lock(); defer { lock.unlock() }
        return Date().timeIntervalSince(lastBufferAt)
    }

    func start() throws {
        try build(reason: "startup")
        observer = NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: engine,
            queue: nil
        ) { [weak self] _ in
            // By the time this lands the old tap is already dead.
            self?.rebuild(reason: "input device changed")
        }
    }

    /// Cheap to call on a timer: rebuilds only once audio has actually stopped.
    func healIfDeaf(reason: String, threshold: TimeInterval = 1.2) {
        guard silenceAge > threshold else { return }
        rebuild(reason: reason)
    }

    func stop() {
        if let observer { NotificationCenter.default.removeObserver(observer) }
        engine.stop()
    }

    private func build(reason: String) throws {
        let input = engine.inputNode
        // Re-read every time. A new device usually means a new sample rate, and
        // installing a tap with a stale format is its own kind of silence.
        let format = input.inputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw MicError.noInputDevice
        }
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            // Recorded before the listening check, so an idle tap dying is still
            // visible to the watchdog and gets healed before the next session.
            self.noteBuffer()
            guard self.flag.isOn else { return }
            if let data = buffer.floatChannelData {
                var peak: Float = 0
                let frames = Int(buffer.frameLength)
                for i in 0..<frames { peak = max(peak, abs(data[0][i])) }
                if let report = self.flag.note(peak: peak, frames: frames) { log(report) }
                // How loud, about 20 times a second, for the dictation orb
                // (2026-10-25). Display only; nothing downstream depends on it.
                var sum: Float = 0
                for i in 0..<frames { sum += data[0][i] * data[0][i] }
                let rms = frames > 0 ? (sum / Float(frames)).squareRoot() : 0
                emit(["type": "level", "v": String(format: "%.3f", min(1, rms * 6))])
            }
            /* Real time means dropping, not queueing.
             *
             * This tap fires about twenty times a second and used to yield into
             * an unbounded stream while the decoder consumed it one buffer at a
             * time. Nothing anywhere applied backpressure. So the moment a
             * decode took longer than a buffer took to arrive — a busy machine,
             * a thermal dip, another app on the Neural Engine — the queue grew,
             * and it never recovered: every second after that added more
             * backlog than it cleared. That is why it was fine for two minutes
             * and then permanently behind.
             *
             * Falling behind IS losing the words, just later and with a worse
             * feeling. So past a small allowance the newest audio is dropped
             * and the transcript stays live. */
            if self.inFlight.count > MicPipeline.maxBacklog {
                self.noteDropped()
                return
            }
            guard let copy = buffer.deepCopy() else { return }
            self.inFlight.enter()
            self.sink.yield(AudioChunk(buffer: copy))
        }
        engine.prepare()
        try engine.start()
        noteBuffer()
        lock.lock(); failures = 0; lock.unlock()
        log("engine running (\(reason)): \(Int(format.sampleRate))Hz, \(format.channelCount)ch")
    }

    private func rebuild(reason: String) {
        lock.lock()
        // One device change fires several notifications; one rebuild covers
        // them. A machine with no usable input backs off instead of spinning.
        if Date() < quietUntil { lock.unlock(); return }
        let backoff = failures >= 2 ? 5.0 : 0.75
        quietUntil = Date().addingTimeInterval(backoff)
        lock.unlock()

        engine.stop()
        do {
            try build(reason: reason)
        } catch {
            lock.lock(); failures += 1; lock.unlock()
            log("mic rebuild failed (\(reason)): \(error)")
        }
    }

    private func noteBuffer() {
        lock.lock(); lastBufferAt = Date(); lock.unlock()
    }
}

private enum MicError: Error { case noInputDevice }

private func emit(_ payload: [String: String]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
          var line = String(data: data, encoding: .utf8) else { return }
    line += "\n"
    FileHandle.standardOutput.write(Data(line.utf8))
}

private func log(_ message: String) {
    FileHandle.standardError.write(Data("[BrainoDictate] \(message)\n".utf8))
}

extension AVAudioPCMBuffer {
    /// The tap reuses its buffer, so anything crossing a thread boundary has to
    /// own its samples.
    func deepCopy() -> AVAudioPCMBuffer? {
        guard let copy = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCapacity) else { return nil }
        copy.frameLength = frameLength
        let channels = Int(format.channelCount)
        let frames = Int(frameLength)
        if let src = floatChannelData, let dst = copy.floatChannelData {
            for channel in 0..<channels {
                dst[channel].update(from: src[channel], count: frames)
            }
            return copy
        }
        if let src = int16ChannelData, let dst = copy.int16ChannelData {
            for channel in 0..<channels {
                dst[channel].update(from: src[channel], count: frames)
            }
            return copy
        }
        return nil
    }
}
