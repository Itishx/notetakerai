// BrainoTouchID.swift — a one-shot Touch ID (or account password fallback) prompt.
// Invoked as: xcrun swift BrainoTouchID.swift "<reason shown in the prompt>"
// Prints exactly one line: "ok", "denied", or "unavailable".
//
// Uses .deviceOwnerAuthentication (not ...WithBiometrics): this is the same
// policy System Preferences itself uses — Touch ID first on Macs that have
// the sensor, automatic fallback to the account password everywhere else, so
// the same voice command works on every Mac without a separate code path.
import LocalAuthentication
import Foundation

let context = LAContext()
var evalError: NSError?
let reason = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "confirm it's you"

guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &evalError) else {
  print("unavailable")
  exit(0)
}

let semaphore = DispatchSemaphore(value: 0)
var granted = false
context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
  granted = success
  semaphore.signal()
}
semaphore.wait()
print(granted ? "ok" : "denied")
