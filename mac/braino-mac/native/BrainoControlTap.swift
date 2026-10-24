import ApplicationServices
import Cocoa
import Foundation

final class BrainoControlTap {
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?
  private var lastControlDown: TimeInterval = 0
  private var lastSpaceDown: TimeInterval = 0
  private var lastKeyDownAt: TimeInterval = 0
  private var shiftIsDown = false
  private var shiftTapPoisoned = false
  private var lastShiftTap: TimeInterval = 0
  private var controlIsDown = false
  private var optionIsDown = false
  private var optionTapPoisoned = false
  private var lastOptionTap: TimeInterval = 0
  // Hold Option to talk (2026-10-25, Wispr-style): a bare Option held past
  // the threshold is a hold; releasing it ends the hold. A hold is never a
  // tap, so it never counts toward double-Option.
  private var optionHoldActive = false
  private var optionHoldToken = 0
  private let optionHoldThreshold: Double = 0.22
  private var commandIsDown = false
  private var commandTapPoisoned = false
  private var lastCommandTap: TimeInterval = 0
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

    let watched: [CGEventType] = [
      .flagsChanged, .keyDown,
      .leftMouseDown, .rightMouseDown, .otherMouseDown, .scrollWheel,
    ]
    var mask: CGEventMask = 0
    for type in watched { mask |= CGEventMask(1) << CGEventMask(type.rawValue) }
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
    if type == .leftMouseDown || type == .rightMouseDown || type == .otherMouseDown || type == .scrollWheel {
      // Shift+click / Cmd+click / Option+scroll is pointing, not a gesture:
      // poison any held modifier tap so ordinary mouse work never counts
      // toward a double-tap.
      if commandIsDown { commandTapPoisoned = true }
      if optionIsDown { optionTapPoisoned = true }
      if shiftIsDown { shiftTapPoisoned = true }
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

    // Bare double-Shift owns the launch-film ritual. A Shift used with any
    // other modifier or key is a normal shortcut/typed character and must not
    // count as a tap.
    let isShift = event.flags.contains(.maskShift)
    if isShift && !shiftIsDown {
      shiftIsDown = true
      let otherMods: CGEventFlags = [.maskControl, .maskAlternate, .maskCommand]
      shiftTapPoisoned = !event.flags.intersection(otherMods).isEmpty
    } else if isShift && shiftIsDown {
      shiftTapPoisoned = true
    } else if !isShift && shiftIsDown {
      shiftIsDown = false
      if !shiftTapPoisoned {
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastShiftTap < 0.52 {
          printLine("double-shift")
          lastShiftTap = 0
        } else {
          lastShiftTap = now
        }
      }
    }

    // Bare double-Option belongs exclusively to BrainoHERA dictation.
    // Chorded Option shortcuts never count.
    let isOption = event.flags.contains(.maskAlternate)
    if isOption && !optionIsDown {
      optionIsDown = true
      let otherMods: CGEventFlags = [.maskShift, .maskControl, .maskCommand]
      optionTapPoisoned = !event.flags.intersection(otherMods).isEmpty
      // Still down, alone, after the threshold: that is a hold.
      optionHoldToken += 1
      let token = optionHoldToken
      if !optionTapPoisoned {
        DispatchQueue.main.asyncAfter(deadline: .now() + optionHoldThreshold) { [weak self] in
          guard let self = self, token == self.optionHoldToken, self.optionIsDown, !self.optionTapPoisoned, !self.optionHoldActive else { return }
          self.optionHoldActive = true
          self.printLine("option-hold-start")
        }
      }
    } else if isOption && optionIsDown {
      optionTapPoisoned = true
      if optionHoldActive { optionHoldActive = false; printLine("option-hold-cancel") }
    } else if !isOption && optionIsDown {
      optionIsDown = false
      optionHoldToken += 1
      if optionHoldActive {
        optionHoldActive = false
        printLine("option-hold-end")
        lastOptionTap = 0
      } else if !optionTapPoisoned {
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastOptionTap < 0.52 {
          printLine("double-option")
          lastOptionTap = 0
        } else {
          lastOptionTap = now
        }
      }
    }

    // Command double-tap = summon toggle. Only BARE taps count: any key or
    // extra modifier while command is held (a real shortcut like Cmd+C or
    // Cmd+Shift+S) poisons the tap so normal usage never triggers it.
    let isCommand = event.flags.contains(.maskCommand)
    if isCommand && !commandIsDown {
      commandIsDown = true
      let otherMods: CGEventFlags = [.maskShift, .maskControl, .maskAlternate]
      commandTapPoisoned = !event.flags.intersection(otherMods).isEmpty
    } else if isCommand && commandIsDown {
      // Another modifier changed while command stayed down — chorded shortcut.
      commandTapPoisoned = true
    } else if !isCommand && commandIsDown {
      commandIsDown = false
      if !commandTapPoisoned {
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastCommandTap < 0.52 {
          printLine("double-command")
          lastCommandTap = 0
        } else {
          lastCommandTap = now
        }
      }
    }
  }

  private func handleKeyDown(_ event: CGEvent) {
    if commandIsDown { commandTapPoisoned = true }
    if optionIsDown { optionTapPoisoned = true }
    // Option+key is a shortcut or a special character, not dictation.
    if optionHoldActive { optionHoldActive = false; printLine("option-hold-cancel") }
    if shiftIsDown { shiftTapPoisoned = true }
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    let isAutoRepeat = event.getIntegerValueField(.keyboardEventAutorepeat) != 0
    let now = ProcessInfo.processInfo.systemUptime
    let previousKeyAt = lastKeyDownAt
    if !isAutoRepeat { lastKeyDownAt = now }

    // Double Space is two taps of Space on their own, not two spaces in a
    // sentence. Any key between them means typing, and so does a first tap
    // that lands straight after a letter: "is a bug" typed quickly used to
    // count, and sent Braino in and out of the notch every few seconds.
    guard keyCode == 49, !isAutoRepeat else {
      if !isAutoRepeat { lastSpaceDown = 0 }
      return
    }
    if lastSpaceDown > 0 && now - lastSpaceDown < 0.52 {
      printLine("double-space")
      lastSpaceDown = 0
    } else if now - previousKeyAt >= 0.6 {
      lastSpaceDown = now
    } else {
      lastSpaceDown = 0
    }
  }

  private func printLine(_ line: String) {
    print(line)
    fflush(stdout)
  }

  private static let handleEvent: CGEventTapCallBack = { _, type, event, refcon in
    guard let refcon else {
      return Unmanaged.passUnretained(event)
    }

    let owner = Unmanaged<BrainoControlTap>.fromOpaque(refcon).takeUnretainedValue()
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
      if let tap = owner.eventTap {
        CGEvent.tapEnable(tap: tap, enable: true)
        owner.printLine("braino-control-tap-reenabled")
      }
      return Unmanaged.passUnretained(event)
    }
    guard type == .flagsChanged || type == .keyDown || type == .leftMouseDown
      || type == .rightMouseDown || type == .otherMouseDown || type == .scrollWheel else {
      return Unmanaged.passUnretained(event)
    }
    owner.handle(type, event)
    return Unmanaged.passUnretained(event)
  }
}

BrainoControlTap().start()
