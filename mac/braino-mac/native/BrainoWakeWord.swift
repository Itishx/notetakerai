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
let WAKE_WORDS = ["braino", "brayno", "bruno", "breno", "raino"]

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
  private var stopped = false

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
    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0 else {
      throw NSError(domain: "BrainoWakeWord", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not read the microphone audio format."])
    }
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.request?.append(buffer)
    }
    audioEngine.prepare()
    try audioEngine.start()
  }

  // SFSpeechRecognitionTask has a practical duration ceiling; a long-running
  // wake listener has to cycle to a fresh request well before hitting it.
  // Every cycle is independent and still on-device-only.
  private func startCycle(with recognizer: SFSpeechRecognizer) throws {
    guard !stopped else { return }
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
    req.contextualStrings = ["Braino", "Hey Braino", "Braino,"]
    request = req

    task = recognizer.recognitionTask(with: req) { [weak self] result, error in
      guard let self, !self.stopped else { return }
      if let result {
        let text = result.bestTranscription.formattedString
        if containsWakeWord(text) {
          self.printLine("wake\t\(self.clean(text))")
          self.restartCycle(with: recognizer)
        }
      }
      if error != nil {
        self.restartCycle(with: recognizer)
      }
    }

    cycleTimer?.invalidate()
    cycleTimer = Timer.scheduledTimer(withTimeInterval: 45.0, repeats: false) { [weak self] _ in
      self?.restartCycle(with: recognizer)
    }
  }

  private func restartCycle(with recognizer: SFSpeechRecognizer) {
    guard !stopped else { return }
    request?.endAudio()
    task?.cancel()
    task = nil
    request = nil
    do {
      try startCycle(with: recognizer)
    } catch {
      printLine("unavailable\t\(clean(error.localizedDescription))")
      exit(1)
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
