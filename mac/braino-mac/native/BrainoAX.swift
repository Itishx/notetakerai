import ApplicationServices
import Cocoa
import Foundation

// BrainoAX — one-shot Accessibility helper (same CLI pattern as BrainoTouchID).
// Subcommands:
//   press <query>            fuzzy-find a pressable element in the front app and press it
//   selected                 read the selected text from the focused element (base64)
//   replace <base64>         replace the selected text in the focused element
//   window <action> <appQuery|front>   left|right|maximize|minimize|center on the main screen
// Output is a single tab-separated line on stdout.

func out(_ line: String) {
  print(line)
  fflush(stdout)
}

func axAttr(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  return result == .success ? value : nil
}

func axString(_ element: AXUIElement, _ name: String) -> String {
  (axAttr(element, name) as? String) ?? ""
}

func axChildren(_ element: AXUIElement) -> [AXUIElement] {
  guard let raw = axAttr(element, kAXChildrenAttribute as String) else { return [] }
  return (raw as? [AXUIElement]) ?? []
}

func elementLabel(_ element: AXUIElement) -> String {
  let title = axString(element, kAXTitleAttribute as String)
  if !title.isEmpty { return title }
  let description = axString(element, kAXDescriptionAttribute as String)
  if !description.isEmpty { return description }
  if let value = axAttr(element, kAXValueAttribute as String) as? String, !value.isEmpty, value.count < 80 {
    return value
  }
  return axString(element, kAXHelpAttribute as String)
}

let PRESSABLE_ROLES: Set<String> = [
  "AXButton", "AXLink", "AXCheckBox", "AXRadioButton", "AXPopUpButton",
  "AXMenuButton", "AXDisclosureTriangle", "AXMenuItem", "AXCell",
]

struct Candidate {
  let element: AXUIElement
  let label: String
  let role: String
}

func collectPressables(from root: AXUIElement) -> [Candidate] {
  var found: [Candidate] = []
  var queue: [AXUIElement] = [root]
  var visited = 0
  let deadline = Date().addingTimeInterval(3.5)
  while !queue.isEmpty && visited < 8000 && Date() < deadline {
    let element = queue.removeFirst()
    visited += 1
    let role = axString(element, kAXRoleAttribute as String)
    if PRESSABLE_ROLES.contains(role) {
      let label = elementLabel(element)
      if !label.isEmpty { found.append(Candidate(element: element, label: label, role: role)) }
    }
    queue.append(contentsOf: axChildren(element))
  }
  return found
}

func normalize(_ value: String) -> String {
  return value.lowercased()
    .replacingOccurrences(of: "[_\\-.]+", with: " ", options: .regularExpression)
    .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    .trimmingCharacters(in: .whitespaces)
}

func scoreMatch(label: String, query: String) -> Double {
  let hay = normalize(label)
  let want = normalize(query)
  if hay.isEmpty || want.isEmpty { return 0 }
  if hay == want { return 2 }
  var score = 0.0
  let wantWords = want.split(separator: " ").map(String.init).filter { $0.count > 1 }
  if wantWords.isEmpty { return 0 }
  let hayWords = Set(hay.split(separator: " ").map(String.init))
  var hits = 0.0
  for word in wantWords {
    if hayWords.contains(word) { hits += 1 }
    else if hay.contains(word) { hits += 0.7 }
  }
  score = hits / Double(wantWords.count)
  if hay.contains(want) { score += 0.5 }
  return score
}

func frontAppElement() -> (AXUIElement, pid_t)? {
  guard let app = NSWorkspace.shared.frontmostApplication else { return nil }
  return (AXUIElementCreateApplication(app.processIdentifier), app.processIdentifier)
}

// Electron/Chromium apps (Cursor, Chrome, Claude, WhatsApp...) keep their AX
// tree EMPTY until an assistive client announces itself — without this, the
// clicker and selection reader are blind exactly where the user lives.
func wakeLazyAccessibility(_ appElement: AXUIElement) {
  AXUIElementSetAttributeValue(appElement, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  AXUIElementSetAttributeValue(appElement, "AXEnhancedUserInterface" as CFString, kCFBooleanTrue)
  usleep(400_000) // give Chromium a beat to build the tree
}

func runPress(query: String) {
  guard let (appElement, _) = frontAppElement() else {
    out("error\tno front app")
    return
  }
  wakeLazyAccessibility(appElement)
  var roots: [AXUIElement] = []
  if let window = axAttr(appElement, kAXFocusedWindowAttribute as String) {
    roots.append(window as! AXUIElement)
  } else {
    roots.append(appElement)
  }
  var candidates: [Candidate] = []
  for root in roots { candidates.append(contentsOf: collectPressables(from: root)) }
  if candidates.isEmpty {
    out("no_elements")
    return
  }
  let ranked = candidates
    .map { (candidate: $0, score: scoreMatch(label: $0.label, query: query)) }
    .filter { $0.score >= 0.5 }
    .sorted { $0.score > $1.score }
  guard let best = ranked.first else {
    let sample = candidates.prefix(6).map { $0.label }.joined(separator: "|")
    out("no_match\t\(sample)")
    return
  }
  let runnerUp = ranked.dropFirst().first
  if best.score < 1.0 && runnerUp != nil && (best.score - runnerUp!.score) < 0.3 {
    let options = ranked.prefix(4).map { $0.candidate.label }.joined(separator: "|")
    out("ambiguous\t\(options)")
    return
  }
  let result = AXUIElementPerformAction(best.candidate.element, kAXPressAction as CFString)
  if result == .success {
    out("pressed\t\(best.candidate.label)")
  } else {
    out("press_failed\t\(best.candidate.label)")
  }
}

func focusedElement() -> AXUIElement? {
  let systemWide = AXUIElementCreateSystemWide()
  guard let raw = axAttr(systemWide, kAXFocusedUIElementAttribute as String) else { return nil }
  return (raw as! AXUIElement)
}

func runSelected() {
  if let (appElement, _) = frontAppElement() { wakeLazyAccessibility(appElement) }
  guard let element = focusedElement() else {
    out("no_focus")
    return
  }
  let text = axString(element, kAXSelectedTextAttribute as String)
  if text.isEmpty {
    out("empty")
    return
  }
  out("selected\t\(Data(text.utf8).base64EncodedString())")
}

func runClickAt(x: Double, y: Double) {
  let point = CGPoint(x: x, y: y)
  guard let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left),
        let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
        let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) else {
    out("error\tevent create failed")
    return
  }
  move.post(tap: .cghidEventTap)
  usleep(120_000)
  down.post(tap: .cghidEventTap)
  usleep(60_000)
  up.post(tap: .cghidEventTap)
  out("clicked\t\(Int(x)),\(Int(y))")
}

func runReplace(base64: String) {
  guard let data = Data(base64Encoded: base64), let text = String(data: data, encoding: .utf8) else {
    out("error\tbad encoding")
    return
  }
  guard let element = focusedElement() else {
    out("no_focus")
    return
  }
  let result = AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, text as CFTypeRef)
  out(result == .success ? "replaced" : "replace_failed")
}

func targetAppElement(query: String) -> AXUIElement? {
  if query == "front" {
    return frontAppElement()?.0
  }
  let wanted = query.lowercased()
  let app = NSWorkspace.shared.runningApplications.first {
    $0.activationPolicy == .regular && ($0.localizedName ?? "").lowercased().contains(wanted)
  }
  guard let app else { return nil }
  return AXUIElementCreateApplication(app.processIdentifier)
}

func runWindow(action: String, appQuery: String) {
  guard let appElement = targetAppElement(query: appQuery) else {
    out("error\tapp not found")
    return
  }
  var windowRef = axAttr(appElement, kAXFocusedWindowAttribute as String)
  if windowRef == nil {
    windowRef = axChildren(appElement).first {
      axString($0, kAXRoleAttribute as String) == "AXWindow"
    }.map { $0 as CFTypeRef }
  }
  guard let windowRaw = windowRef else {
    out("error\tno window")
    return
  }
  let window = windowRaw as! AXUIElement

  if action == "minimize" {
    AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, kCFBooleanTrue)
    out("done\tminimize")
    return
  }

  guard let screen = NSScreen.main ?? NSScreen.screens.first else {
    out("error\tno screen")
    return
  }
  let visible = screen.visibleFrame
  // AX coordinates use a top-left origin on the primary display; AppKit uses
  // bottom-left. Convert via the primary screen's total height.
  let primaryHeight = (NSScreen.screens.first ?? screen).frame.height
  let topY = primaryHeight - visible.maxY

  var origin = CGPoint(x: visible.minX, y: topY)
  var size = CGSize(width: visible.width, height: visible.height)
  switch action {
  case "left":
    size.width = visible.width / 2
  case "right":
    origin.x = visible.minX + visible.width / 2
    size.width = visible.width / 2
  case "maximize":
    break
  case "center":
    size = CGSize(width: visible.width * 0.72, height: visible.height * 0.8)
    origin = CGPoint(x: visible.minX + (visible.width - size.width) / 2, y: topY + (visible.height - size.height) / 2)
  default:
    out("error\tunknown action")
    return
  }
  var originCopy = origin
  var sizeCopy = size
  guard let positionValue = AXValueCreate(.cgPoint, &originCopy), let sizeValue = AXValueCreate(.cgSize, &sizeCopy) else {
    out("error\tvalue create failed")
    return
  }
  // Un-minimize, then size → position → size again: many apps clamp the
  // first size set while the window still hangs off-screen (the classic
  // "maximize only changed the width" failure).
  AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
  AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, sizeValue)
  let posResult = AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, positionValue)
  let sizeResult = AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, sizeValue)
  if posResult == .success && sizeResult == .success {
    out("done\t\(action)")
  } else {
    out("error\tset failed \(posResult.rawValue) \(sizeResult.rawValue)")
  }
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else {
  out("error\tusage: press|selected|replace|window")
  exit(0)
}
guard AXIsProcessTrusted() else {
  out("needs-accessibility")
  exit(0)
}
switch arguments[1] {
case "press":
  runPress(query: arguments.dropFirst(2).joined(separator: " "))
case "selected":
  runSelected()
case "replace":
  runReplace(base64: arguments.count > 2 ? arguments[2] : "")
case "window":
  let action = arguments.count > 2 ? arguments[2] : ""
  let appQuery = arguments.dropFirst(3).joined(separator: " ")
  runWindow(action: action, appQuery: appQuery.isEmpty ? "front" : appQuery)
case "clickat":
  let x = arguments.count > 2 ? (Double(arguments[2]) ?? -1) : -1
  let y = arguments.count > 3 ? (Double(arguments[3]) ?? -1) : -1
  if x < 0 || y < 0 { out("error\tbad coordinates") } else { runClickAt(x: x, y: y) }
default:
  out("error\tunknown command")
}
