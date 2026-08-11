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

/// Utterances waiting to be committed to the caret.
///
/// The first design assumed FluidAudio's transcript only ever grew, and sent
/// the new suffix each time a callback fired. It does not: the partial callback
/// reports the current hypothesis for the window, which shrinks and rewrites
/// itself. Diffing it produced the same words over and over —
/// "up up up what what what".
///
/// So partials are now display only, and the ONLY thing that reaches the caret
/// is a completed utterance from the end-of-utterance callback. Each one is
/// queued here and drained by the consumer loop, which then resets the model —
/// on the same task that calls `process()`, so the reset can never land in the
/// middle of a decode.
private actor CommitQueue {
    private var pending: [String] = []
    private var latestPartial = ""

    func push(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        pending.append(trimmed)
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

    func takePartial() -> String {
        defer { latestPartial = "" }
        return latestPartial
    }

    func drain() -> [String] {
        defer { pending.removeAll() }
        return pending
    }

    func clear() {
        pending.removeAll()
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

        let engine = AVAudioEngine()
        let commits = CommitQueue()
        let listening = ListeningFlag()
        let inFlight = InFlightCounter()
        // 700ms: long enough that a mid-sentence breath is not treated as the
        // end of a thought, short enough to still feel immediate. EOU now only
        // paces commits — correctness no longer depends on it.
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
            Task { await commits.push(text) }
        }

        do {
            log("loading Parakeet models…")
            try await asr.loadModels()
            log("models ready")
        } catch {
            emit(["type": "error", "message": "model load failed: \(error)"])
            exit(1)
        }

        let (stream, continuation) = AsyncStream<AudioChunk>.makeStream()
        let consumer = Task {
            for await chunk in stream {
                defer { inFlight.leave() }
                do {
                    _ = try await asr.process(audioBuffer: chunk.buffer)
                } catch {
                    emit(["type": "error", "message": "process failed: \(error)"])
                }
                // Deliberately no reset here. Resetting between utterances
                // corrupted the decoder mid-stream, which is what produced
                // "up up up what what what" and the empty finishes. Committed
                // utterances simply queue up until the session ends.
            }
        }

        let format = installMicTap(on: engine, flag: listening, inFlight: inFlight, sink: continuation)

        // Mic comes up now, once, so `start` costs nothing later.
        do {
            engine.prepare()
            try engine.start()
            log("engine running: \(Int(format.sampleRate))Hz, \(format.channelCount)ch")
        } catch {
            emit(["type": "error", "message": "mic start failed: \(error)"])
            exit(1)
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
                    // Exactly the file-mode resolution, which is the one that
                    // is known to be accurate: everything committed, plus
                    // whatever finish() still holds, joined once.
                    var utterances = await commits.drain()
                    let tail = try await asr.finish().trimmingCharacters(in: .whitespacesAndNewlines)
                    if !tail.isEmpty { utterances.append(tail) }
                    var text = utterances.joined(separator: " ")
                    if text.isEmpty { text = await commits.takePartial() }
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

            case "quit":
                listening.set(false)
                continuation.finish()
                consumer.cancel()
                engine.stop()
                await asr.cleanup()
                exit(0)

            default:
                break
            }
        }

        continuation.finish()
        engine.stop()
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
        Task { await commits.push(text) }
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
        var utterances = await commits.drain()
        let tail = try await asr.finish().trimmingCharacters(in: .whitespacesAndNewlines)
        if !tail.isEmpty { utterances.append(tail) }
        let joined = utterances.joined(separator: " ")
        let result = joined.isEmpty ? await commits.takePartial() : joined
        emit([
            "type": "file_result",
            "round": "\(round)",
            "chunk": "\(chunkSize.durationMs)ms",
            "utterances": "\(utterances.count)",
            "text": result,
        ])
        }
    } catch {
        emit(["type": "error", "message": "file transcribe failed: \(error)"])
    }
}

private nonisolated func installMicTap(
    on engine: AVAudioEngine,
    flag: ListeningFlag,
    inFlight: InFlightCounter,
    sink: AsyncStream<AudioChunk>.Continuation
) -> AVAudioFormat {
    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)
    input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, _ in
        // The tap runs whether or not we are dictating; dropping the buffer
        // here is far cheaper than starting and stopping the engine.
        guard flag.isOn else { return }
        if let data = buffer.floatChannelData {
            var peak: Float = 0
            let frames = Int(buffer.frameLength)
            for i in 0..<frames { peak = max(peak, abs(data[0][i])) }
            if let report = flag.note(peak: peak, frames: frames) { log(report) }
        }
        guard let copy = buffer.deepCopy() else { return }
        inFlight.enter()
        sink.yield(AudioChunk(buffer: copy))
    }
    return format
}

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
