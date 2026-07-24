import AVFoundation
import Foundation
import Speech

// BrainoLiveCaption — continuous ON-DEVICE partial transcription, purely for
// live captions while a realtime voice session runs. The OpenAI session stays
// the authoritative transcript; this stream exists so the user sees their
// words forming AS they speak (the Chrome extension's SpeechRecognition
// feel), not after the server commits the audio.
// Protocol (stdout, tab-separated):
//   caption-ready
//   caption\t<partial transcript>
//   caption-final\t<segment transcript>
//   unavailable\t<reason>

final class BrainoLiveCaption: NSObject {
  private let audioEngine = AVAudioEngine()
  private var recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var cycleTimer: Timer?

  func start() {
    SFSpeechRecognizer.requestAuthorization { [weak self] status in
      DispatchQueue.main.async {
        guard status == .authorized else {
          self?.out("unavailable\tspeech permission not granted")
          exit(0)
        }
        self?.boot()
      }
    }
    RunLoop.main.run()
  }

  private func boot() {
    recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    guard let recognizer, recognizer.isAvailable else {
      out("unavailable\trecognizer unavailable")
      exit(0)
    }
    guard recognizer.supportsOnDeviceRecognition else {
      out("unavailable\ton-device recognition unsupported")
      exit(0)
    }
    do {
      try startAudio()
    } catch {
      out("unavailable\taudio engine: \(error.localizedDescription)")
      exit(0)
    }
    startTask()
    out("caption-ready")
    // Apple caps recognition-task duration — cycle before the ceiling.
    cycleTimer = Timer.scheduledTimer(withTimeInterval: 45, repeats: true) { [weak self] _ in
      self?.restartTask()
    }
  }

  private func startAudio() throws {
    let input = audioEngine.inputNode
    let format = input.outputFormat(forBus: 0)
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.request?.append(buffer)
    }
    audioEngine.prepare()
    try audioEngine.start()
  }

  private func startTask() {
    let newRequest = SFSpeechAudioBufferRecognitionRequest()
    newRequest.shouldReportPartialResults = true
    newRequest.requiresOnDeviceRecognition = true
    request = newRequest
    task = recognizer?.recognitionTask(with: newRequest) { [weak self] result, error in
      guard let self else { return }
      if let result {
        let text = result.bestTranscription.formattedString
        if !text.isEmpty {
          self.out(result.isFinal ? "caption-final\t\(self.clean(text))" : "caption\t\(self.clean(text))")
        }
        if result.isFinal { self.restartTask() }
      }
      if error != nil { self.restartTask() }
    }
  }

  private func restartTask() {
    task?.cancel()
    task = nil
    request?.endAudio()
    request = nil
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
      self?.startTask()
    }
  }

  private func clean(_ value: String) -> String {
    return value.replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ")
  }

  private func out(_ line: String) {
    print(line)
    fflush(stdout)
  }
}

BrainoLiveCaption().start()
