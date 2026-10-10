// BrainoScreenText: the words in an image, read on this Mac.
//
// AffectiveOS remembers what you did on your Mac, and most apps do not hand
// their text to anyone: Cursor's chat, WhatsApp, a PDF, a slide in class. A
// screenshot does, if something reads it. Cloud vision reads it for money and
// sends the picture away, which is right when you ask "look at my screen" and
// wrong every twenty seconds all day. Apple's own text recognition does it on
// the Neural Engine, free, and nothing leaves the machine.
//
// Usage: BrainoScreenText <image-path> [--fast]
// Prints one JSON object: {"ok":true,"ms":312,"lines":["..."]}
//
// BrainoScreenText <image-path> --faces
// Prints {"ok":true,"ms":40,"faces":1,"largest":0.08}: is someone there.
// Arrival asks this of one camera frame. It finds a face, not whose face.
// The caller takes the screenshot and deletes it; this only reads.

import Foundation
import Vision
import AppKit

func emit(_ object: [String: Any]) {
  if let data = try? JSONSerialization.data(withJSONObject: object),
     let text = String(data: data, encoding: .utf8) {
    print(text)
  }
}

let args = CommandLine.arguments
guard args.count >= 2 else {
  emit(["ok": false, "error": "usage: BrainoScreenText <image-path> [--fast]"])
  exit(2)
}
let path = args[1]
let fast = args.contains("--fast")

guard let image = NSImage(contentsOfFile: path),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  emit(["ok": false, "error": "could not read image"])
  exit(1)
}

let started = Date()

if args.contains("--faces") {
  let faceRequest = VNDetectFaceRectanglesRequest()
  do {
    try VNImageRequestHandler(cgImage: cg, options: [:]).perform([faceRequest])
  } catch {
    emit(["ok": false, "error": "face check failed: \(error.localizedDescription)"])
    exit(1)
  }
  let faces = faceRequest.results ?? []
  let largest = faces.map { $0.boundingBox.width * $0.boundingBox.height }.max() ?? 0
  emit(["ok": true, "ms": Int(Date().timeIntervalSince(started) * 1000), "faces": faces.count, "largest": Double(largest)])
  exit(0)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = fast ? .fast : .accurate
request.usesLanguageCorrection = !fast
request.recognitionLanguages = ["en-US", "hi-IN"]
request.automaticallyDetectsLanguage = true

do {
  try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
} catch {
  emit(["ok": false, "error": "recognition failed: \(error.localizedDescription)"])
  exit(1)
}

// Top to bottom, left to right, which is the order a person reads a screen in.
let observations = (request.results ?? []).sorted {
  let a = $0.boundingBox, b = $1.boundingBox
  if abs(a.midY - b.midY) > 0.01 { return a.midY > b.midY }
  return a.minX < b.minX
}
let lines = observations.compactMap { obs -> String? in
  guard let top = obs.topCandidates(1).first, top.confidence >= 0.3 else { return nil }
  let text = top.string.trimmingCharacters(in: .whitespacesAndNewlines)
  return text.isEmpty ? nil : text
}
emit(["ok": true, "ms": Int(Date().timeIntervalSince(started) * 1000), "lines": lines])
