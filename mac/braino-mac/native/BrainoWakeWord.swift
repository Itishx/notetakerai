// BrainoWakeWord.swift — continuous, ON-DEVICE-ONLY wake word listener.
//
// This is deliberately separate from BrainoSpeech.swift (which does one-shot
// dictation as a realtime-voice fallback). This helper runs forever, in the
// background, and its entire reason to exist is the privacy promise: the mic
// is "live" the whole time, but requiresOnDeviceRecognition = true means
// Apple's on-device speech model is doing the listening, not a server —
// nothing about what the user says leaves the machine unless and until the
// wake phrase is actually heard, at which point main.cjs is told to open a
// REAL (paid, cloud) realtime session for the actual conversation.
//
// Prints one line per event:
//   armed                 — listening started, on-device, nothing sent anywhere
//   wake\t<transcript>     — the wake phrase was heard in this utterance
//   healed\t<reason>      — the microphone was re-attached after it went quiet
//   unavailable\t<reason> — on-device recognition isn't usable on this Mac;
//                           caller should NOT fall back to a cloud path here,
//                           that would silently break the privacy guarantee —
//                           surface it and let the user use the hotkey instead
import AVFoundation
import Darwin
import Foundation
import Speech

// Same fuzzy variants voiceAddressesBraino() already accepts in the renderer,
// plus "raino" (the founder's own casual pronunciation) — kept in one place
// here since this runs before anything ever reaches the renderer.
// "reno" and "dino" were in here and they are ordinary words, so he woke up
// inside other people's conversations. With contextualStrings telling the
// recogniser that "Braino" exists, these are only the close acoustic misses.
// "brainelle" is her name when she is the avatar. Only the name itself: the
// spellings Apple writes for it ("Brunel", "Brinell") are real words, and this
// listener runs all day.
let WAKE_WORDS = ["braino", "brayno", "bruno", "breno", "raino", "brainelle"]

func argumentValue(_ name: String) -> String? {
  guard let index = CommandLine.arguments.firstIndex(of: name),
        CommandLine.arguments.indices.contains(index + 1) else { return nil }
  return CommandLine.arguments[index + 1]
}

func containsWakeWord(_ text: String) -> Bool {
  let lower = text.lowercased()
  return WAKE_WORDS.contains { lower.contains($0) }
}

final class BrainoWakeWord: NSObject {
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
  private let audioEngine = AVAudioEngine()
  private let outputPath = argumentValue("--out")
  private let parentPID = Int32(argumentValue("--parent") ?? "") ?? 0
  private let outputLock = NSLock()
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var cycleTimer: Timer?
  private var parentTimer: Timer?
  private var healTimer: Timer?
  private var stopped = false
  /* Which recognition cycle is current. Every callback checks it, so a task
     that has been replaced can no longer touch the one that replaced it. */
  private var cycleGeneration = 0
  /* When the tap last delivered audio. It delivers buffers continuously, even
     in silence, so a long gap means the microphone was taken away from it. */
  private let bufferLock = NSLock()
  private var lastBufferAt = Date()

  func start() {
    printLine("starting\t\(ProcessInfo.processInfo.processIdentifier)")
    guard authorizeSpeech() else {
      printLine("unavailable\tSpeech recognition permission was not granted.")
      exit(1)
    }
    guard authorizeMicrophone() else {
      printLine("unavailable\tMicrophone permission was not granted.")
      exit(1)
    }
    guard let recognizer, recognizer.isAvailable else {
      printLine("unavailable\tmacOS speech recognizer is not available right now.")
      exit(1)
    }
    guard recognizer.supportsOnDeviceRecognition else {
      // Do not silently fall back to server-based recognition for an
      // always-on listener — that would be a real, unannounced privacy
      // regression. Surface it and let the app rely on the manual hotkey.
      printLine("unavailable\tOn-device speech recognition is not supported on this Mac.")
      exit(1)
    }

    do {
      try startEngineIfNeeded()
      try startCycle(with: recognizer)
      startParentMonitor()
      startHealing()
      printLine("armed\t\(ProcessInfo.processInfo.processIdentifier)")
    } catch {
      printLine("unavailable\t\(clean(error.localizedDescription))")
      exit(1)
    }

    RunLoop.main.run()
  }

  private func authorizeSpeech() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var allowed = false
    SFSpeechRecognizer.requestAuthorization { status in
      allowed = status == .authorized
      semaphore.signal()
    }
    semaphore.wait()
    return allowed
  }

  private func startParentMonitor() {
    guard parentPID > 1 else { return }
    parentTimer?.invalidate()
    parentTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
      guard let self else { return }
      if kill(self.parentPID, 0) != 0 {
        self.stopped = true
        self.request?.endAudio()
        self.task?.cancel()
        self.audioEngine.stop()
        exit(0)
      }
    }
  }

  private func authorizeMicrophone() -> Bool {
    let status = AVCaptureDevice.authorizationStatus(for: .audio)
    if status == .authorized { return true }
    if status == .denied || status == .restricted { return false }
    let semaphore = DispatchSemaphore(value: 0)
    var allowed = false
    AVCaptureDevice.requestAccess(for: .audio) { granted in
      allowed = granted
      semaphore.signal()
    }
    semaphore.wait()
    return allowed
  }

  private func startEngineIfNeeded() throws {
    guard !audioEngine.isRunning else { return }
    try attachMicrophone()
  }

  private func attachMicrophone() throws {
    let inputNode = audioEngine.inputNode
    inputNode.removeTap(onBus: 0)
    let format = inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0 else {
      throw NSError(domain: "BrainoWakeWord", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not read the microphone audio format."])
    }
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      guard let self else { return }
      self.bufferLock.lock()
      self.lastBufferAt = Date()
      self.bufferLock.unlock()
      self.request?.append(buffer)
    }
    audioEngine.prepare()
    try audioEngine.start()
    bufferLock.lock()
    lastBufferAt = Date()
    bufferLock.unlock()
  }

  /* Staying attached to the microphone.
   *
   * Opening a voice session opens the same microphone with echo cancellation,
   * and macOS reconfigures the device underneath this engine to do it. The
   * engine stops, the tap goes quiet, and nothing here ever noticed: the
   * recognition cycle kept restarting every 45 seconds on no audio at all. In
   * the log that is a wake word that works exactly once, until the first voice
   * session, and never again — "the mic is off".
   *
   * So: re-attach on every configuration change, and independently, if the tap
   * has delivered nothing for five seconds or the engine is not running, treat
   * it as detached and re-attach. The recognition request is restarted with it,
   * because the input format can change along with the device. */
  private func startHealing() {
    NotificationCenter.default.addObserver(
      forName: .AVAudioEngineConfigurationChange,
      object: audioEngine,
      queue: .main
    ) { [weak self] _ in
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self?.heal("config-change") }
    }
    healTimer?.invalidate()
    healTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
      guard let self, !self.stopped else { return }
      self.bufferLock.lock()
      let quietFor = Date().timeIntervalSince(self.lastBufferAt)
      self.bufferLock.unlock()
      if !self.audioEngine.isRunning {
        self.heal("engine-stopped")
      } else if quietFor > 5 {
        self.heal("no-audio-\(Int(quietFor))s")
      }
    }
  }

  private func heal(_ reason: String) {
    guard !stopped, let recognizer else { return }
    audioEngine.stop()
    do {
      try attachMicrophone()
      restartCycle(with: recognizer)
      printLine("healed\t\(reason)")
    } catch {
      // Not fatal: the timer tries again in three seconds.
      printLine("healfailed\t\(clean(error.localizedDescription))")
    }
  }

  // SFSpeechRecognitionTask has a practical duration ceiling; a long-running
  // wake listener has to cycle to a fresh request well before hitting it.
  // Every cycle is independent and still on-device-only.
  private func startCycle(with recognizer: SFSpeechRecognizer) throws {
    guard !stopped else { return }
    cycleGeneration += 1
    let generation = cycleGeneration
    let req = SFSpeechAudioBufferRecognitionRequest()
    req.shouldReportPartialResults = true
    req.requiresOnDeviceRecognition = true
    /* Apple's model has never heard of "Braino", so it substitutes the nearest
       word it does know. Across 184 real wakes on the founder's Mac it
       transcribed "Reno" 46 times, "Bruno" 42, and "Braino" exactly zero — which
       is why WAKE_WORDS below has to carry a list of misspellings, and why real
       words like "Reno" and "Dino" in that list wake him during other people's
       conversations. Telling the recogniser the word exists is the fix at the
       source; the variants stay as a safety net underneath it. */
    req.contextualStrings = ["Braino", "Hey Braino", "Braino,", "Brainelle", "Hey Brainelle"]
    request = req

    /* Why this only ever woke him once.
     *
     * The handler used to restart the cycle from inside itself, and restarting
     * cancels the task — which calls this same handler again with a
     * cancellation error, which restarted again, cancelling the NEW task, and so
     * on forever. After the first wake (or the first 45-second refresh) the
     * listener spent its life cancelling tasks that never lived long enough to
     * hear anything: one "wake" in the events file, then twenty minutes of
     * nothing, with the process alive and burning a little CPU.
     *
     * Now every callback belongs to one generation and is ignored once that
     * generation is over, and restarts happen on the main queue, after the
     * callback has returned. */
    task = recognizer.recognitionTask(with: req) { [weak self] result, error in
      DispatchQueue.main.async {
        guard let self, !self.stopped, generation == self.cycleGeneration else { return }
        if let result {
          let text = result.bestTranscription.formattedString
          if containsWakeWord(text) {
            self.printLine("wake\t\(self.clean(text))")
            // A beat before listening again, so the tail of the same phrase
            // cannot wake him twice.
            self.scheduleRestart(after: 1.2, with: recognizer)
            return
          }
          if result.isFinal {
            self.scheduleRestart(after: 0.1, with: recognizer)
            return
          }
        }
        if error != nil {
          self.scheduleRestart(after: 0.3, with: recognizer)
        }
      }
    }

    cycleTimer?.invalidate()
    cycleTimer = Timer.scheduledTimer(withTimeInterval: 45.0, repeats: false) { [weak self] _ in
      self?.scheduleRestart(after: 0, with: recognizer)
    }
  }

  private func restartCycle(with recognizer: SFSpeechRecognizer) {
    scheduleRestart(after: 0, with: recognizer)
  }

  /* End the current cycle now (its callbacks stop counting immediately) and
     start the next one after `delay`. */
  private func scheduleRestart(after delay: TimeInterval, with recognizer: SFSpeechRecognizer) {
    guard !stopped else { return }
    cycleGeneration += 1
    let generation = cycleGeneration
    cycleTimer?.invalidate()
    request?.endAudio()
    task?.cancel()
    task = nil
    request = nil
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
      guard let self, !self.stopped, generation == self.cycleGeneration else { return }
      do {
        try self.startCycle(with: recognizer)
      } catch {
        self.printLine("unavailable\t\(self.clean(error.localizedDescription))")
        exit(1)
      }
    }
  }

  private func clean(_ value: String) -> String {
    value
      .replacingOccurrences(of: "\r", with: " ")
      .replacingOccurrences(of: "\n", with: " ")
      .replacingOccurrences(of: "\t", with: " ")
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func printLine(_ line: String) {
    outputLock.lock()
    defer { outputLock.unlock() }
    if let outputPath, !outputPath.isEmpty {
      let url = URL(fileURLWithPath: outputPath)
      let data = Data("\(line)\n".utf8)
      if !FileManager.default.fileExists(atPath: outputPath) {
        FileManager.default.createFile(atPath: outputPath, contents: nil)
      }
      if let handle = try? FileHandle(forWritingTo: url) {
        do {
          try handle.seekToEnd()
          try handle.write(contentsOf: data)
          try handle.close()
        } catch {
          try? handle.close()
        }
      }
    }
    print(line)
    fflush(stdout)
  }
}

let brainoWakeWord = BrainoWakeWord()
brainoWakeWord.start()
