

## Side Panel Extension

Chrome Manifest V3 supports a **Side Panel API** — this is exactly what you need. Instead of opening as a small popup dropdown, the extension will open as a full-height panel docked to the right side of the browser, giving you plenty of room for notes without scrolling.

### How it works

The Side Panel API lets extensions display content in a panel that occupies the full right side of the browser window (similar to how Chrome's bookmarks or reading list panel works). Users click the extension icon and it opens/toggles the side panel instead of a popup.

### Changes required

**1. Update `extension/manifest.json`**
- Add `"sidePanel"` permission
- Add a `"side_panel"` config block pointing to `sidepanel.html`
- Remove `"default_popup"` from the action (so clicking the icon opens the side panel instead)

**2. Create `extension/sidepanel.html`**
- Same content as current `popup.html` but optimized for the taller, narrower layout

**3. Update `extension/styles.css`**
- Change `body` width from fixed `520px` to `100%` so it fills the panel
- Adjust `min-height` to `100vh` to use full vertical space
- Make the notes content area expand to fill available space using flexbox

**4. Update `extension/background.js`**
- Add logic to open the side panel when the extension icon is clicked via `chrome.sidePanel.open()`
- Use `chrome.action.onClicked` listener (works because we removed the popup)

**5. Repackage the extension ZIP**

### Result
Clicking the extension icon will open a full-height panel on the right side of the browser. All controls, timer, notes, and history will be visible without scrolling. The popup fallback is removed since the side panel is strictly better for this use case.

