// BrainoDrop: the notch's file drop, 2026-10-01.
//
// Two jobs, one tiny binary, no special permission:
//
//   BrainoDrop watch [zoneWidth zoneHeight]
//     Notices that a FILE drag has started anywhere on the Mac, so the notch
//     can open its drop zones before you reach it (the NotchNook feel). It
//     looks at nothing but two system values, ten times a second: whether the
//     left mouse button is held, and whether the drag pasteboard changed while
//     it was. No screen reading, no key or mouse monitoring. Prints one JSON
//     line per change: {"drag":true,"count":2,"kinds":["png","pdf"]} and
//     {"drag":false}. While a file drag is on, it also holds an invisible
//     drop target over the island and reports {"hover":"tray"|"air"|""} and
//     {"drop":"tray"|"air","files":[...]}. Exits when its stdin closes.
//
//   BrainoDrop airdrop <path> [<path> ...]
//     Sends the files with macOS's own AirDrop. You pick the device in Apple's
//     AirDrop window (no app can pick it for you). Prints the real outcome:
//     {"status":"picking"} while Apple's window is up, then, read from
//     AirDrop's own session summary, {"status":"sent"}, {"status":"cancelled"}
//     or {"status":"failed","error":"..."} ("closed" if it can't tell).

import Cocoa

func out(_ d: [String: Any]) {
  if let j = try? JSONSerialization.data(withJSONObject: d), let s = String(data: j, encoding: .utf8) {
    print(s)
    fflush(stdout)
  }
}

let args = CommandLine.arguments
let mode = args.count > 1 ? args[1] : ""

if mode == "watch" {
  // The drop target. Electron's notch window lets the mouse through, and macOS
  // will not make such a window a drop target halfway through a drag
  // (2026-10-01: the zones opened, every drop fell through to the app below).
  // So this helper puts up its own invisible panel over the island, only while
  // a file is being dragged, and reports the hover and the drop itself.
  final class DropView: NSView {
    var hot = ""
    override init(frame: NSRect) { super.init(frame: frame); registerForDraggedTypes([.fileURL]) }
    required init?(coder: NSCoder) { fatalError() }
    func zone(_ info: NSDraggingInfo) -> String { convert(info.draggingLocation, from: nil).x < bounds.midX ? "tray" : "air" }
    func setHot(_ z: String) { if z != hot { hot = z; out(["hover": z]) } }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation { setHot(zone(sender)); return .copy }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation { setHot(zone(sender)); return .copy }
    override func draggingExited(_ sender: NSDraggingInfo?) { setHot("") }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool { true }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
      let urls = (sender.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]) ?? []
      let z = zone(sender)
      hot = ""
      out(["drop": z, "files": urls.prefix(8).map { $0.path }])
      return !urls.isEmpty
    }
  }
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  let zoneW = Double(args.count > 2 ? args[2] : "") ?? 540
  let zoneH = Double(args.count > 3 ? args[3] : "") ?? 150
  // The screen with the notch, or the main one.
  func notchScreen() -> NSScreen? {
    if #available(macOS 12.0, *) { if let s = NSScreen.screens.first(where: { $0.safeAreaInsets.top > 0 }) { return s } }
    return NSScreen.main ?? NSScreen.screens.first
  }
  let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: zoneW, height: zoneH), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
  panel.isOpaque = false
  panel.hasShadow = false
  // Not fully clear: a window with nothing in it lets drags straight through.
  panel.backgroundColor = NSColor(white: 0, alpha: 0.004)
  /* Menu level, not screen saver. The notch window sits at screen-saver
     level, above the floating image of a drag, and a target that high never
     felt a drag (2026-10-01: the file slid back "underneath the notch").
     Drags pass through the click-through notch window to this one. */
  panel.level = .popUpMenu
  panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
  panel.ignoresMouseEvents = false
  panel.hidesOnDeactivate = false
  let view = DropView(frame: NSRect(x: 0, y: 0, width: zoneW, height: zoneH))
  panel.contentView = view
  func showPanel() {
    guard let s = notchScreen() else { return }
    let f = s.frame
    panel.setFrame(NSRect(x: f.midX - zoneW / 2, y: f.maxY - zoneH, width: zoneW, height: zoneH), display: false)
    panel.orderFrontRegardless()
    out(["panel": "shown", "x": Int(panel.frame.minX), "y": Int(panel.frame.minY), "w": Int(panel.frame.width), "h": Int(panel.frame.height)])
  }

  let pb = NSPasteboard(name: .drag)
  var countWhileUp = pb.changeCount
  var dragging = false
  var hideWork: DispatchWorkItem?
  let timer = Timer(timeInterval: 0.05, repeats: true) { _ in
    let down = (NSEvent.pressedMouseButtons & 1) != 0
    if !down {
      if dragging {
        dragging = false
        out(["drag": false])
        // The drop lands as the button comes up; keep the target a moment.
        let work = DispatchWorkItem { panel.orderOut(nil); view.hot = "" }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6, execute: work)
      }
      countWhileUp = pb.changeCount
      return
    }
    if dragging || pb.changeCount == countWhileUp { return }
    let urls = (pb.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]) ?? []
    if urls.isEmpty { countWhileUp = pb.changeCount; return }
    dragging = true
    hideWork?.cancel()
    showPanel()
    out(["drag": true, "count": urls.count, "kinds": urls.prefix(8).map { $0.pathExtension.lowercased() }])
  }
  RunLoop.main.add(timer, forMode: .common)
  DispatchQueue.global().async {
    while readLine() != nil {}
    exit(0)
  }
  app.run()
} else if mode == "airdrop" {
  /* The outcome comes from AirDrop itself, not from the sharing callbacks.
     2026-10-01: NSSharingService says "willShare" the moment its window opens
     and "didShare" when it closes, even when you press Cancel, so the notch
     said "Sent with AirDrop" for a cancel. When an AirDrop window closes,
     sharingd logs a session summary (com.apple.sharing.AirDrop.SessionInfo)
     with transfersInitiated and transfersCompleted. That is the truth. */
  let started = Date().timeIntervalSince1970
  func verdict() -> [String: Any] {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/log")
    task.arguments = ["show", "--last", "3m", "--style", "compact", "--predicate", "process == \"sharingd\" AND eventMessage CONTAINS \"AirDrop.SessionInfo\""]
    let pipe = Pipe(); task.standardOutput = pipe; task.standardError = Pipe()
    do { try task.run() } catch { return [:] }
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    task.waitUntilExit()
    let text = String(data: data, encoding: .utf8) ?? ""
    var best: [String: Any] = [:]
    for line in text.split(separator: "\n") {
      guard let open = line.firstIndex(of: "{"), let close = line.lastIndex(of: "}") else { continue }
      var body = String(line[open...close])
      body = body.replacingOccurrences(of: ", }", with: "}").replacingOccurrences(of: ",}", with: "}")
      guard let d = body.data(using: .utf8), let obj = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { continue }
      let ts = (obj["startTimestamp"] as? Double) ?? 0
      if ts + 3 < started { continue }
      // Several summaries per window; the one with the most transfers wins.
      let i = (obj["transfersInitiated"] as? Int) ?? 0, c = (obj["transfersCompleted"] as? Int) ?? 0
      let bi = (best["transfersInitiated"] as? Int) ?? -1, bc = (best["transfersCompleted"] as? Int) ?? -1
      if best.isEmpty || c > bc || (c == bc && i > bi) { best = obj }
    }
    return best
  }
  func finish(_ fallbackError: String?) {
    // The summary is written as the window closes; give it a moment.
    var v: [String: Any] = [:]
    for _ in 0..<8 { v = verdict(); if !v.isEmpty { break }; Thread.sleep(forTimeInterval: 0.5) }
    if v.isEmpty {
      out(["status": fallbackError == nil ? "closed" : "failed", "error": fallbackError ?? "AirDrop closed. I couldn't tell whether it sent."])
      exit(0)
    }
    let initiated = (v["transfersInitiated"] as? Int) ?? 0
    let completed = (v["transfersCompleted"] as? Int) ?? 0
    let peers = (v["totalPeersDiscovered"] as? Int) ?? 0
    if completed > 0 { out(["status": "sent"]) }
    else if initiated > 0 { out(["status": "failed", "error": "It didn't finish. The other device may have declined."]) }
    else { out(["status": "cancelled", "error": peers == 0 ? "No devices were nearby." : "Nothing was sent."]) }
    exit(0)
  }
  final class Watcher: NSObject, NSSharingServiceDelegate {
    let done: (String?) -> Void
    init(done: @escaping (String?) -> Void) { self.done = done }
    func sharingService(_ sharingService: NSSharingService, didShareItems items: [Any]) {
      DispatchQueue.global().async { self.done(nil) }
    }
    func sharingService(_ sharingService: NSSharingService, didFailToShareItems items: [Any], error: Error) {
      let e = error as NSError
      DispatchQueue.global().async { self.done(e.code == NSUserCancelledError ? nil : e.localizedDescription) }
    }
  }
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  let urls = args.dropFirst(2).map { URL(fileURLWithPath: $0) }.filter { FileManager.default.fileExists(atPath: $0.path) }
  if urls.isEmpty { out(["status": "failed", "error": "No file to send"]); exit(0) }
  guard let service = NSSharingService(named: .sendViaAirDrop) else {
    out(["status": "failed", "error": "AirDrop isn't available on this Mac"]); exit(0)
  }
  if !service.canPerform(withItems: urls) {
    out(["status": "failed", "error": "AirDrop is off, or can't send this"]); exit(0)
  }
  let watcher = Watcher(done: finish)
  service.delegate = watcher
  out(["status": "picking"])
  app.activate(ignoringOtherApps: true)
  service.perform(withItems: urls)
  app.run()
} else {
  out(["error": "usage: BrainoDrop watch | BrainoDrop airdrop <path>..."])
  exit(2)
}
