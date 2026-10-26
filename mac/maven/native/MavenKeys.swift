import ApplicationServices
import Cocoa
import Foundation

/* Maven's key watcher (trimmed from the Braino Mac key watcher, 26 Oct 2026).
   Listens only. It reports the Control+Option chord and takes one command on
   stdin, "paste", which sends a real Cmd+V.
   stdout: maven-keys-ready, maven-tap-ready, needs-accessibility,
           event-tap-unavailable, dictate-hold-start / -end / -cancel,
           pasted<TAB><front app> */
final class MavenKeys {
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?
  private var chordHeld = false
  private var lastUnavailableLogAt: TimeInterval = 0

  func start() {
    requestAccessibilityPrompt()
    printLine("maven-keys-ready")
    tryStartEventTap()
    listenForCommands()

    Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
      guard let self, self.eventTap == nil else { return }
      self.tryStartEventTap()
    }

    RunLoop.main.run()
  }

  private func requestAccessibilityPrompt() {
    let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
    let options = [key: true] as CFDictionary
    if !AXIsProcessTrustedWithOptions(options) {
      printLine("needs-accessibility")
    }
  }

  private func tryStartEventTap() {
    guard AXIsProcessTrusted() else {
      requestAccessibilityPrompt()
      return
    }
    let watched: [CGEventType] = [.flagsChanged, .keyDown]
    var mask: CGEventMask = 0
    for type in watched { mask |= CGEventMask(1) << CGEventMask(type.rawValue) }
    let refcon = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
    guard let tap = CGEvent.tapCreate(
      tap: .cgSessionEventTap,
      place: .headInsertEventTap,
      options: .listenOnly,
      eventsOfInterest: mask,
      callback: MavenKeys.handleEvent,
      userInfo: refcon
    ) else {
      let now = ProcessInfo.processInfo.systemUptime
      if now - lastUnavailableLogAt > 6 {
        printLine("event-tap-unavailable")
        lastUnavailableLogAt = now
      }
      return
    }
    eventTap = tap
    runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
    if let source = runLoopSource {
      CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
    }
    CGEvent.tapEnable(tap: tap, enable: true)
    printLine("maven-tap-ready")
  }

  private func handle(_ type: CGEventType, _ event: CGEvent) {
    if type == .keyDown {
      // A real key while the chord is down: it was a shortcut, not speech.
      if chordHeld { printLine("dictate-hold-cancel"); chordHeld = false }
      return
    }
    let f = event.flags
    let ctrl = f.contains(.maskControl), opt = f.contains(.maskAlternate), fn = f.contains(.maskSecondaryFn)
    let extra = f.contains(.maskCommand) || f.contains(.maskShift)
    let want = !extra && ctrl && opt && !fn
    if want != chordHeld {
      printLine(want ? "dictate-hold-start" : "dictate-hold-end")
      chordHeld = want
    }
  }

  /* "paste" on stdin sends Cmd+V as a real keyboard event (~20ms). */
  private func listenForCommands() {
    let thread = Thread {
      while let line = readLine(strippingNewline: true) {
        if line.trimmingCharacters(in: .whitespaces) == "paste" {
          DispatchQueue.main.async { [weak self] in self?.pasteNow() }
        }
      }
    }
    thread.name = "maven.keys.stdin"
    thread.start()
  }

  private func pasteNow() {
    let front = NSWorkspace.shared.frontmostApplication?.localizedName ?? ""
    let src = CGEventSource(stateID: .combinedSessionState)
    let vKey: CGKeyCode = 9
    let down = CGEvent(keyboardEventSource: src, virtualKey: vKey, keyDown: true)
    let up = CGEvent(keyboardEventSource: src, virtualKey: vKey, keyDown: false)
    // Only Command: whatever modifiers are still held must not leak in.
    down?.flags = .maskCommand
    up?.flags = .maskCommand
    down?.post(tap: .cghidEventTap)
    up?.post(tap: .cghidEventTap)
    printLine("pasted\t\(front)")
  }

  private func printLine(_ line: String) {
    print(line)
    fflush(stdout)
  }

  private static let handleEvent: CGEventTapCallBack = { _, type, event, refcon in
    guard let refcon else { return Unmanaged.passUnretained(event) }
    let owner = Unmanaged<MavenKeys>.fromOpaque(refcon).takeUnretainedValue()
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
      if let tap = owner.eventTap {
        CGEvent.tapEnable(tap: tap, enable: true)
        owner.printLine("maven-tap-reenabled")
      }
      return Unmanaged.passUnretained(event)
    }
    guard type == .flagsChanged || type == .keyDown else { return Unmanaged.passUnretained(event) }
    owner.handle(type, event)
    return Unmanaged.passUnretained(event)
  }
}

MavenKeys().start()
