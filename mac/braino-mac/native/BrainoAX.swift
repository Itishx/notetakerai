import ApplicationServices
import Cocoa
import Foundation

// BrainoAX — one-shot Accessibility helper (same CLI pattern as BrainoTouchID).
// Subcommands:
//   press <query>            fuzzy-find a pressable element in the front app and press it
//   selected                 read the selected text from the focused element (base64)
//   replace <base64>         replace the selected text in the focused element
//   focused                 report whether the focused element accepts dictation
//   insert <base64>         insert text at the focused editable element's caret
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
  // A weak solo match ("open project" -> "Open Cursor Settings") must NOT be
  // pressed on confidence it doesn't have — report no_match so the caller
  // escalates to vision, which can see what AX can't.
  if best.score < 0.8 {
    out("no_match\t\(best.candidate.label)")
    return
  }
  let result = AXUIElementPerformAction(best.candidate.element, kAXPressAction as CFString)
  if result == .success {
    out("pressed\t\(best.candidate.label)")
  } else {
    out("press_failed\t\(best.candidate.label)")
  }
}

func focusedElement(in appElement: AXUIElement? = nil) -> AXUIElement? {
  // The system-wide focus is often more accurate for Chromium/Electron web
  // editors. Their application-level focused element can briefly stay on the
  // web area while a contenteditable child already owns the caret.
  let systemWide = AXUIElementCreateSystemWide()
  if let raw = axAttr(systemWide, kAXFocusedUIElementAttribute as String) {
    return (raw as! AXUIElement)
  }
  if let appElement,
     let raw = axAttr(appElement, kAXFocusedUIElementAttribute as String) {
    return (raw as! AXUIElement)
  }
  return nil
}

func axSettable(_ element: AXUIElement, _ name: String) -> Bool {
  var settable = DarwinBoolean(false)
  let result = AXUIElementIsAttributeSettable(element, name as CFString, &settable)
  return result == .success && settable.boolValue
}

struct FocusedTarget {
  let status: String
  let element: AXUIElement?
  let role: String
  let appName: String
}

func axBool(_ element: AXUIElement, _ name: String) -> Bool {
  guard let value = axAttr(element, name) else { return false }
  if let number = value as? NSNumber { return number.boolValue }
  return false
}

func editableTarget(from original: AXUIElement) -> (status: String, element: AXUIElement?, role: String) {
  var current: AXUIElement? = original
  var depth = 0
  let editableRoles: Set<String> = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField"]

  while let element = current, depth < 12 {
    let role = axString(element, kAXRoleAttribute as String)
    let subrole = axString(element, kAXSubroleAttribute as String)
    if role == "AXSecureTextField" || subrole == "AXSecureTextField" {
      return ("secure", nil, role)
    }

    let selectedText = axSettable(element, kAXSelectedTextAttribute as String)
    let selectedRange = axSettable(element, kAXSelectedTextRangeAttribute as String)
    let value = axSettable(element, kAXValueAttribute as String)
    let explicitlyEditable = axBool(element, "AXEditable")
    if selectedText || explicitlyEditable || (editableRoles.contains(role) && (selectedRange || value)) {
      return ("editable", element, role)
    }

    guard let parent = axAttr(element, kAXParentAttribute as String) else { break }
    current = (parent as! AXUIElement)
    depth += 1
  }

  return ("not_editable", original, axString(original, kAXRoleAttribute as String))
}

func findFocusedDescendant(in root: AXUIElement) -> AXUIElement? {
  var queue: [AXUIElement] = [root]
  var visited = 0
  let deadline = Date().addingTimeInterval(0.35)
  while !queue.isEmpty && visited < 1800 && Date() < deadline {
    let element = queue.removeFirst()
    visited += 1
    if axBool(element, kAXFocusedAttribute as String) { return element }
    queue.append(contentsOf: axChildren(element))
  }
  return nil
}

func inspectFocusedTarget() -> FocusedTarget {
  guard AXIsProcessTrusted() else {
    return FocusedTarget(status: "needs-accessibility", element: nil, role: "", appName: "")
  }
  guard let (appElement, pid) = frontAppElement() else {
    return FocusedTarget(status: "no_focus", element: nil, role: "", appName: "")
  }
  wakeLazyAccessibility(appElement)
  let appName = NSRunningApplication(processIdentifier: pid)?.localizedName ?? ""
  // Lazy browser accessibility trees do not necessarily update in the same
  // run-loop tick in which AXManualAccessibility is enabled.
  usleep(70_000)
  var element = focusedElement(in: appElement)
  if element == nil, let window = axAttr(appElement, kAXFocusedWindowAttribute as String) {
    element = findFocusedDescendant(in: window as! AXUIElement)
  }
  guard let element else {
    return FocusedTarget(status: "no_focus", element: nil, role: "", appName: appName)
  }
  let resolved = editableTarget(from: element)
  return FocusedTarget(
    status: resolved.status,
    element: resolved.element,
    role: resolved.role,
    appName: appName
  )
}

func runFocused() {
  let focused = inspectFocusedTarget()
  guard focused.status == "editable" else {
    let detail = "\(focused.appName)|\(focused.role)"
    out(detail == "|" ? focused.status : "\(focused.status)\t\(Data(detail.utf8).base64EncodedString())")
    return
  }
  let detail = "\(focused.appName)|\(focused.role)"
  out("editable\t\(Data(detail.utf8).base64EncodedString())")
}

func runInsert(base64: String) {
  guard let data = Data(base64Encoded: base64), let text = String(data: data, encoding: .utf8) else {
    out("error\tbad encoding")
    return
  }
  let focused = inspectFocusedTarget()
  guard focused.status == "editable", let element = focused.element else {
    out(focused.status)
    return
  }
  let result = AXUIElementSetAttributeValue(
    element,
    kAXSelectedTextAttribute as CFString,
    text as CFTypeRef
  )
  out(result == .success ? "inserted" : "insert_failed")
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


// ── HIL loop surface ─────────────────────────────────────────────────────────
// The browser's Delegate sees an indexed element map and targets by index. This
// gives the Mac the same shape on top of the accessibility tree, so ONE prompt
// (hil-loop-prompt.ts) can drive both surfaces. Everything below reuses the same
// collectPressables walk the press command already trusts, so what HIL sees and
// what a press hits are the same list in the same order.

let EDITABLE_ROLES: Set<String> = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField"]

func collectEditables(from root: AXUIElement) -> [Candidate] {
  var found: [Candidate] = []
  var queue: [AXUIElement] = [root]
  var visited = 0
  let deadline = Date().addingTimeInterval(2.5)
  while !queue.isEmpty && visited < 8000 && Date() < deadline {
    let element = queue.removeFirst()
    visited += 1
    let role = axString(element, kAXRoleAttribute as String)
    if EDITABLE_ROLES.contains(role) {
      var label = elementLabel(element)
      if label.isEmpty { label = axString(element, kAXPlaceholderValueAttribute as String) }
      if label.isEmpty { label = "text field" }
      found.append(Candidate(element: element, label: label, role: role))
    }
    queue.append(contentsOf: axChildren(element))
  }
  return found
}

// One deterministic list: editables first, then pressables. Both the observe and
// the act commands build it the same way, so index N means the same element in
// both, as long as the screen has not changed underneath (which is exactly what
// the loop's re-observation each turn is for).
func hilCandidates() -> (app: String, window: String, items: [Candidate])? {
  guard let (appElement, _) = frontAppElement() else { return nil }
  wakeLazyAccessibility(appElement)
  let appName = axString(appElement, kAXTitleAttribute as String)
  var root = appElement
  var windowTitle = ""
  if let window = axAttr(appElement, kAXFocusedWindowAttribute as String) {
    root = window as! AXUIElement
    windowTitle = axString(root, kAXTitleAttribute as String)
  }
  var items = collectEditables(from: root)
  items.append(contentsOf: collectPressables(from: root))
  return (appName, windowTitle, items)
}

func jsonEscape(_ value: String) -> String {
  var out = ""
  for ch in value.unicodeScalars {
    switch ch {
    case "\"": out += "\\\""
    case "\\": out += "\\\\"
    case "\n", "\r", "\t": out += " "
    default:
      if ch.value < 0x20 { out += " " } else { out.unicodeScalars.append(ch) }
    }
  }
  return out
}

// Emitted as ONE line of JSON because the Node bridge reads only the first line.
func runObserve(cap: Int) {
  guard let ctx = hilCandidates() else {
    out("error\tno front app")
    return
  }
  var rows: [String] = []
  for (i, c) in ctx.items.prefix(cap).enumerated() {
    let role = c.role.hasPrefix("AX") ? String(c.role.dropFirst(2)).lowercased() : c.role.lowercased()
    rows.append("{\"index\":\(i + 1),\"role\":\"\(jsonEscape(role))\",\"name\":\"\(jsonEscape(c.label))\"}")
  }
  let more = max(0, ctx.items.count - cap)
  out("observe\t{\"app\":\"\(jsonEscape(ctx.app))\",\"window\":\"\(jsonEscape(ctx.window))\",\"hidden\":\(more),\"elements\":[\(rows.joined(separator: ","))]}")
}

// Press by INDEX, with the label the caller expected. The label check is a
// staleness guard: the tree can move between the observation and the click, and
// pressing whatever now happens to sit at that index is how an agent ends up
// clicking Delete when it meant Save.
func runPressIndex(index: Int, expected: String) {
  guard let ctx = hilCandidates() else {
    out("error\tno front app")
    return
  }
  guard index >= 1 && index <= ctx.items.count else {
    out("stale\tindex \(index) is outside the \(ctx.items.count) elements now on screen")
    return
  }
  let target = ctx.items[index - 1]
  if !expected.isEmpty && scoreMatch(label: target.label, query: expected) < 0.5 {
    out("stale\texpected \"\(expected)\" at \(index) but found \"\(target.label)\"")
    return
  }
  let result = AXUIElementPerformAction(target.element, kAXPressAction as CFString)
  out(result == .success ? "pressed\t\(target.label)" : "press_failed\t\(target.label)")
}

// Focus a field by index, then set its value. Two AX calls, one command, because
// HIL's type action names the field and the text in a single step.
func runTypeIndex(index: Int, base64: String) {
  guard let data = Data(base64Encoded: base64), let text = String(data: data, encoding: .utf8) else {
    out("error\tbad encoding")
    return
  }
  guard let ctx = hilCandidates() else {
    out("error\tno front app")
    return
  }
  guard index >= 1 && index <= ctx.items.count else {
    out("stale\tindex \(index) is outside the \(ctx.items.count) elements now on screen")
    return
  }
  let target = ctx.items[index - 1]
  AXUIElementSetAttributeValue(target.element, kAXFocusedAttribute as CFString, kCFBooleanTrue)
  let result = AXUIElementSetAttributeValue(target.element, kAXValueAttribute as CFString, text as CFTypeRef)
  out(result == .success ? "typed\t\(target.label)" : "type_failed\t\(target.label)")
}


// A genuine keystroke, not a fuzzy element search. The loop's pressKey and the
// submit flag on typing both need this: "press Return" must mean the Return KEY,
// never a button whose label happens to read Return.
let KEY_CODES: [String: CGKeyCode] = [
  "return": 36, "enter": 36, "tab": 48, "space": 49, "escape": 53, "esc": 53,
  "delete": 51, "backspace": 51, "down": 125, "up": 126, "left": 123, "right": 124,
]

func runKey(name: String) {
  let key = name.lowercased().trimmingCharacters(in: .whitespaces)
  guard let code = KEY_CODES[key] else {
    out("error\tunknown key \(key)")
    return
  }
  guard let down = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: true),
        let up = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: false) else {
    out("error\tevent create failed")
    return
  }
  down.post(tap: .cghidEventTap)
  usleep(40_000)
  up.post(tap: .cghidEventTap)
  out("key\t\(key)")
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else {
  out("error\tusage: press|pressindex|typeindex|observe|key|selected|replace|focused|insert|window")
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
case "focused":
  runFocused()
case "insert":
  runInsert(base64: arguments.count > 2 ? arguments[2] : "")
case "window":
  let action = arguments.count > 2 ? arguments[2] : ""
  let appQuery = arguments.dropFirst(3).joined(separator: " ")
  runWindow(action: action, appQuery: appQuery.isEmpty ? "front" : appQuery)
case "key":
  runKey(name: arguments.dropFirst(2).joined(separator: " "))
case "observe":
  runObserve(cap: arguments.count > 2 ? (Int(arguments[2]) ?? 120) : 120)
case "pressindex":
  runPressIndex(index: arguments.count > 2 ? (Int(arguments[2]) ?? 0) : 0,
                expected: arguments.dropFirst(3).joined(separator: " "))
case "typeindex":
  runTypeIndex(index: arguments.count > 2 ? (Int(arguments[2]) ?? 0) : 0,
               base64: arguments.count > 3 ? arguments[3] : "")
case "clickat":
  let x = arguments.count > 2 ? (Double(arguments[2]) ?? -1) : -1
  let y = arguments.count > 3 ? (Double(arguments[3]) ?? -1) : -1
  if x < 0 || y < 0 { out("error\tbad coordinates") } else { runClickAt(x: x, y: y) }
default:
  out("error\tunknown command")
}
