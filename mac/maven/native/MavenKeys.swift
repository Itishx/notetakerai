import ApplicationServices
import Cocoa
import Foundation

/* Maven's key watcher (trimmed from the Braino Mac key watcher, 26 Oct 2026).
   Listens only. It reports the Control+Option chord (Write) and the
   fn+Control chord (Do, 27 Oct 2026) and takes one command on
   stdin, "paste", which sends a real Cmd+V.
   stdout: maven-keys-ready, ready (event tap enabled), needs-accessibility,
           event-tap-unavailable, dictate-hold-start / -end / -cancel, do-hold-start / -end / -cancel,
           pasted<TAB><front app>, ask-enter / ask-esc
   stdin "ask-on" / "ask-off" (2026-10-27): while the island asks, Return
   (36, keypad 76) and Escape (53) are caught system-wide and swallowed, so
   the answer never depends on window focus and never reaches WhatsApp. Ask
   mode ends on ask-off, after 25 s, or when stdin closes (Maven quit). */
final class MavenKeys {
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?
  private var chordHeld = "" // "", "dictate" or "do"
  private var lastUnavailableLogAt: TimeInterval = 0

  private var saidNeedsAccessibility = false
  private var askOnAt: TimeInterval = 0 // 0 = ask mode off
  private var asking: Bool {
    if askOnAt == 0 { return false }
    if ProcessInfo.processInfo.systemUptime - askOnAt > 25 { askOnAt = 0; return false }
    return true
  }

  func start() {
    // No system prompt from here: onboarding asks for Accessibility and explains why.
    printLine("maven-keys-ready")
    tryStartEventTap()
    listenForCommands()

    Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
      guard let self, self.eventTap == nil else { return }
      self.tryStartEventTap()
    }

    RunLoop.main.run()
  }

  private func tryStartEventTap() {
    guard AXIsProcessTrusted() else {
      // Said once, not every 2 s (the old code re-prompted on every retry).
      if !saidNeedsAccessibility { printLine("needs-accessibility"); saidNeedsAccessibility = true }
      return
    }
    let watched: [CGEventType] = [.flagsChanged, .keyDown, .keyUp]
    var mask: CGEventMask = 0
    for type in watched { mask |= CGEventMask(1) << CGEventMask(type.rawValue) }
    let refcon = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
    guard let tap = CGEvent.tapCreate(
      tap: .cgSessionEventTap,
      place: .headInsertEventTap,
      options: .defaultTap, // not listen-only: ask mode swallows Return / Esc
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
    printLine("ready")
  }

  /* true = swallow the event. Only Return / Esc, only while asking, no modifiers. */
  private func handle(_ type: CGEventType, _ event: CGEvent) -> Bool {
    if (type == .keyDown || type == .keyUp) && asking {
      let code = event.getIntegerValueField(.keyboardEventKeycode)
      let mods = event.flags.intersection([.maskCommand, .maskControl, .maskAlternate, .maskShift])
      if mods.isEmpty && (code == 36 || code == 76 || code == 53) {
        if type == .keyDown && event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
          askOnAt = 0 // one answer per question; main turns it back on if it asks again
          printLine(code == 53 ? "ask-esc" : "ask-enter")
        }
        return true
      }
    }
    if type == .keyUp { return false }
    if type == .keyDown {
      // A real key while a chord is down: it was a shortcut, not speech.
      if !chordHeld.isEmpty { printLine("\(chordHeld)-hold-cancel"); chordHeld = "" }
      return false
    }
    let f = event.flags
    let ctrl = f.contains(.maskControl), opt = f.contains(.maskAlternate), fn = f.contains(.maskSecondaryFn)
    let extra = f.contains(.maskCommand) || f.contains(.maskShift)
    // Same rule as the Braino key tap: Control+Option = dictate, fn+Control = do.
    let want: String = extra ? "" : (ctrl && opt && !fn ? "dictate" : (ctrl && fn && !opt ? "do" : ""))
    if want != chordHeld {
      if !chordHeld.isEmpty { printLine("\(chordHeld)-hold-end") }
      if !want.isEmpty { printLine("\(want)-hold-start") }
      chordHeld = want
    }
    return false
  }

  /* "paste" on stdin sends Cmd+V as a real keyboard event (~20ms); "copy" sends
     Cmd+C (Do mode reading a selection) and answers "copied<TAB><front app>". */
  private func listenForCommands() {
    let thread = Thread {
      while let line = readLine(strippingNewline: true) {
        let cmd = line.trimmingCharacters(in: .whitespaces)
        if cmd == "ask-on" || cmd == "ask-off" {
          DispatchQueue.main.async { [weak self] in self?.askOnAt = cmd == "ask-on" ? ProcessInfo.processInfo.systemUptime : 0 }
        } else if line.trimmingCharacters(in: .whitespaces) == "paste" {
          DispatchQueue.main.async { [weak self] in self?.pasteNow() }
        } else if line.trimmingCharacters(in: .whitespaces) == "copy" {
          DispatchQueue.main.async { [weak self] in self?.copyNow() }
        }
      }
      // stdin closed: Maven is gone. Never leave Return / Esc swallowed.
      DispatchQueue.main.async { [weak self] in self?.askOnAt = 0; exit(0) }
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

  private func copyNow() {
    let front = NSWorkspace.shared.frontmostApplication?.localizedName ?? ""
    let src = CGEventSource(stateID: .combinedSessionState)
    let cKey: CGKeyCode = 8
    let down = CGEvent(keyboardEventSource: src, virtualKey: cKey, keyDown: true)
    let up = CGEvent(keyboardEventSource: src, virtualKey: cKey, keyDown: false)
    down?.flags = .maskCommand
    up?.flags = .maskCommand
    down?.post(tap: .cghidEventTap)
    up?.post(tap: .cghidEventTap)
    printLine("copied\t\(front)")
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
    guard type == .flagsChanged || type == .keyDown || type == .keyUp else { return Unmanaged.passUnretained(event) }
    if owner.handle(type, event) { return nil }
    return Unmanaged.passUnretained(event)
  }
}

MavenKeys().start()
