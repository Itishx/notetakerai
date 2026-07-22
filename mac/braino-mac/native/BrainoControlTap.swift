import ApplicationServices
import Cocoa
import Foundation

final class BrainoControlTap {
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?
  private var lastControlDown: TimeInterval = 0
  private var lastSpaceDown: TimeInterval = 0
  private var controlIsDown = false
  private var lastUnavailableLogAt: TimeInterval = 0

  func start() {
    requestAccessibilityPrompt()
    printLine("braino-hotkey-helper-ready")
    tryStartEventTap()

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

    let mask = CGEventMask((1 << CGEventType.flagsChanged.rawValue) | (1 << CGEventType.keyDown.rawValue))
    let refcon = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
    guard let tap = CGEvent.tapCreate(
      tap: .cgSessionEventTap,
      place: .headInsertEventTap,
      options: .listenOnly,
      eventsOfInterest: mask,
      callback: BrainoControlTap.handleEvent,
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
    printLine("braino-control-tap-ready")
  }

  private func handle(_ type: CGEventType, _ event: CGEvent) {
    if type == .keyDown {
      handleKeyDown(event)
      return
    }

    let isControl = event.flags.contains(.maskControl)
    if isControl && !controlIsDown {
      let now = ProcessInfo.processInfo.systemUptime
      if now - lastControlDown < 0.52 {
        printLine("double-control")
        lastControlDown = 0
      } else {
        lastControlDown = now
      }
    }
    controlIsDown = isControl
  }

  private func handleKeyDown(_ event: CGEvent) {
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    let isAutoRepeat = event.getIntegerValueField(.keyboardEventAutorepeat) != 0
    guard keyCode == 49, !isAutoRepeat else { return }

    let now = ProcessInfo.processInfo.systemUptime
    if now - lastSpaceDown < 0.52 {
      printLine("double-space")
      lastSpaceDown = 0
    } else {
      lastSpaceDown = now
    }
  }

  private func printLine(_ line: String) {
    print(line)
    fflush(stdout)
  }

  private static let handleEvent: CGEventTapCallBack = { _, type, event, refcon in
    guard (type == .flagsChanged || type == .keyDown), let refcon else {
      return Unmanaged.passUnretained(event)
    }

    let owner = Unmanaged<BrainoControlTap>.fromOpaque(refcon).takeUnretainedValue()
    owner.handle(type, event)
    return Unmanaged.passUnretained(event)
  }
}

BrainoControlTap().start()
