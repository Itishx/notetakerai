import AVFoundation
import Foundation
import Speech

final class BrainoSpeech: NSObject, SFSpeechRecognizerDelegate {
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
  private let audioEngine = AVAudioEngine()
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var latestTranscript = ""
  private var lastTranscriptAt = Date()
  private var finished = false

  func start() {
    guard authorizeSpeech() else {
      printLine("speech-error\tSpeech recognition permission was not granted.")
      exit(1)
    }

    guard authorizeMicrophone() else {
      printLine("speech-error\tMicrophone permission was not granted.")
      exit(1)
    }

    guard let recognizer, recognizer.isAvailable else {
      printLine("speech-error\tmacOS speech recognizer is not available right now.")
      exit(1)
    }

    do {
      try startRecording(with: recognizer)
      printLine("speech-ready")
    } catch {
      printLine("speech-error\t\(clean(error.localizedDescription))")
      exit(1)
    }

    Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] timer in
      guard let self else {
        timer.invalidate()
        return
      }
      if self.finished {
        timer.invalidate()
        return
      }
      if !self.latestTranscript.isEmpty && Date().timeIntervalSince(self.lastTranscriptAt) > 1.15 {
        self.finish()
      }
    }

    Timer.scheduledTimer(withTimeInterval: 12.0, repeats: false) { [weak self] _ in
      self?.finish(fallbackError: "No speech heard.")
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

  private func authorizeMicrophone() -> Bool {
    if #available(macOS 10.14, *) {
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
    return true
  }

  private func startRecording(with recognizer: SFSpeechRecognizer) throws {
    request = SFSpeechAudioBufferRecognitionRequest()
    guard let request else {
      throw NSError(domain: "BrainoSpeech", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create speech request."])
    }
    request.shouldReportPartialResults = true
    if #available(macOS 13.0, *) {
      request.addsPunctuation = true
    }

    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0 else {
      throw NSError(domain: "BrainoSpeech", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not read the microphone audio format."])
    }

    task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self, !self.finished else { return }

      if let result {
        self.latestTranscript = result.bestTranscription.formattedString
        self.lastTranscriptAt = Date()
        self.printLine("speech-partial\t\(self.clean(self.latestTranscript))")
        if result.isFinal {
          self.finish()
          return
        }
      }

      if let error, self.latestTranscript.isEmpty {
        self.finish(fallbackError: error.localizedDescription)
      }
    }

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.request?.append(buffer)
    }

    audioEngine.prepare()
    try audioEngine.start()
  }

  private func finish(fallbackError: String? = nil) {
    guard !finished else { return }
    finished = true

    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
    request?.endAudio()
    task?.cancel()

    let transcript = clean(latestTranscript)
    if !transcript.isEmpty {
      printLine("speech-final\t\(transcript)")
    } else {
      printLine("speech-error\t\(clean(fallbackError ?? "No speech heard."))")
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
      exit(transcript.isEmpty ? 1 : 0)
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
    print(line)
    fflush(stdout)
  }
}

BrainoSpeech().start()
