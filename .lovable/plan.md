

# Sidepanel Recording UI Redesign — Orb-Centric Layout with Transitions

## What Changes

The sidepanel will have two visual states with smooth CSS transitions between them:

### State 1: Recording Mode (orb is hero)
- The timer and small controls area at the top collapse/hide
- A **large centered orb** replaces the timer area, pulsing/glowing while recording
- Below the orb: small muted text showing duration + segment info (e.g. "00:22 · 1 segment · 22s total")
- Below that: **Pause & Save Segment** and **Continue Recording** buttons
- Convert to Notes button below those

### State 2: Idle / Notes Mode (orb shrinks back)
- The orb **animates smaller** and moves up to where the timer currently sits (compact size, ~40-50px)
- Timer text, status bar, and control buttons return to their normal top positions
- Notes section, chat, Notion sync — all appear below as they currently do

### Additional
- Remove the **Attach image file** button (`chatAttachBtn`) from the chat input bar; keep only the screenshot button
- The orb animation should use CSS transitions (`transition: all 0.5s ease`) for the size/position change between states

## Technical Approach

### 1. `extension/styles.css` — New orb states + transitions
- Add `.orb-recording` class: larger size (180-200px area), centered in the main content area
- Add `.orb-idle` class: small size (~50px), positioned inline where the timer sits
- Add `transition` properties on `.orb-container` and `.orb-layer` for smooth scaling
- Add `.recording-mode` body/container class that restructures the layout
- Style the sub-orb info text (duration + segments)

### 2. `extension/sidepanel.html` — Restructure layout
- Wrap the orb in a dedicated recording-hero area that can expand/collapse
- Add a small text element below the orb for duration/segment info
- Remove the `chatAttachBtn` button and its associated file input
- Keep the orb in the header for idle state, but allow it to "grow" into the main area during recording

### 3. `extension/popup.js` — Toggle recording layout state
- In `setRecordingUI()`: add `.recording-mode` class to container, expand orb, hide top controls, show bottom buttons
- In `setResumeUI()` / `setIdleUI()`: remove `.recording-mode`, shrink orb back, restore normal layout
- Update timer display to write into the sub-orb text element during recording
- Remove `chatAttachBtn` and `chatFileInput` references

### 4. Repackage extension ZIP

