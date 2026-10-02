# Notch Drop: Tray and AirDrop

Status: MVP, behind a switch · Released: 2026-10-01 (built, not tested on hardware) · Platform: Braino for Mac · Entry 063

## The simple version

Start dragging a file anywhere. The notch opens into two zones, **Tray** and **AirDrop**, and the one under your cursor lights up.

- **AirDrop:** Apple's AirDrop window opens so you pick the device. The notch shows the real outcome: "Pick a device in AirDrop", "Sending with AirDrop" with a moving bar, then a drawn tick ("Sent with AirDrop") or a cross that shakes ("AirDrop didn't go through", with the reason). Cancelling says so.
- **Tray:** the file flies in as a thumbnail and the notch says "In the tray". Drag it back out to Finder, Mail, anywhere. Braino's "this file" points at the newest one.
- **hello:** the first time the feature is on, the notch writes "hello" by hand.

The island is one size (520 wide, notch + 112 tall) for every one of these states. Only what is inside it changes.

## Why it exists

Itish sent the NotchNook demo (2026-10-01): a file dragged to the notch, AirDrop from the notch. The notch is where Braino lives; holding and sending files is the most natural thing for it to do with your hands already moving.

## How to use it

Run `npm run mac:drop` (sets `BRAINO_NOTCH_DROP=1`). Drag any file towards the notch. The first run builds the small native helper (a few seconds).

## Honest limitations

- AirDrop's device has to be chosen in Apple's window; no app can choose it.
- The AirDrop result comes from AirDrop's own session summary (sharingd logs `com.apple.sharing.AirDrop.SessionInfo` with `transfersInitiated` / `transfersCompleted` / `totalPeersDiscovered` when its window closes), not from NSSharingService: on 2026-10-01 that said "shared" for a cancel. Sent = a transfer completed; didn't go through = started, never completed; cancelled = none started ("No devices were nearby" when none were found); "AirDrop closed" when no summary can be read. A completed transfer has not been seen on hardware yet.
- Files held in the tray: pointing at the notch's housing (the top band, not the tab strip under it, which still tucks away) opens the tray; each file has an ×, plus Clear all; a small count shows inside the notch. Dragging out uses dragstart + `webContents.startDrag`.
- The drag watch reads only whether the left button is held and whether the drag pasteboard changed. A drag that starts and ends within ~60 ms can be missed; the notch still opens when the cursor reaches it.
- Behind a switch until 16 Oct; the old hidden shelf drop is replaced while the switch is on.

## Technical shape

- `native/BrainoDrop.swift`: `watch` (10 Hz: `NSEvent.pressedMouseButtons` + `NSPasteboard(name: .drag).changeCount`, file URLs only, JSON lines, exits on stdin close) and `airdrop <paths>` (`NSSharingService(named: .sendViaAirDrop)` with a delegate: picking, sending, sent, cancelled, failed). Built on first use into the app's support folder.
- `main.cjs`: `NOTCH_DROP_ON`, `ensureDropHelper`, `startDropWatcher` (forwards `braino-mac:file-drag`), `braino-mac:airdrop` (streams `braino-mac:airdrop-status`, 5-minute cap), `braino-mac:file-thumb` (nativeImage thumbnail or file icon), `braino-mac:tray-drag-out` (`webContents.startDrag`).
- `renderer/braino-mac.js`: `nfDropSet` / `nfDropRender` state machine (ready, tray, air-picking, air-sending, air-sent, air-failed, air-cancelled, hello); the existing dragover/drop handlers hand over to it when the switch is on; the zone is held open with `nfSetZone` so the whole island takes the drop.
- `renderer/braino-mac.css`: `#notch-face.nf-drop` block. `renderer/index.html`: `.nf-dropbox`.
- Test: `tests/mac-notch-drop.test.mjs`.
