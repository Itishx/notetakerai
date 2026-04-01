

# Sidepanel: Dual-Mode UI + Code Markdown Rendering

## What Changes

### 1. Dual-Mode Landing (Record vs Browse)

Instead of showing Start Recording + Convert to Notes by default, the idle state will show **two mode cards**:

- **Record Mode** — icon + "Record & Notes" label + subtitle "Capture audio from any tab and convert to structured notes." Clicking enters the current recording flow (orb, timer, convert).
- **Browse Mode** — icon + "Chat with this page" label + subtitle "Ask AI questions about the page you're on." Clicking scrolls/focuses directly to the chat section with page context active.

This gives users a clear entry point based on intent. Both modes remain accessible at all times (the chat section stays visible below recording controls regardless), but the two cards make the distinction obvious on first glance.

### 2. Code Block Rendering in Chat

The current `renderMarkdown()` function doesn't handle fenced code blocks (` ```lang ... ``` `). AI responses with code appear as plain text.

**Fix**: Enhance `renderMarkdown()` to detect fenced code blocks and render them as `<pre><code class="language-xxx">` with proper styling. Add CSS for code blocks with a dark background, monospace font, horizontal scroll, and syntax-appropriate styling.

## Technical Details

### `extension/popup.js`
- Update `renderMarkdown()` to handle fenced code blocks (` ```language\n...\n``` `) BEFORE other replacements. Also handle inline code (`` `code` ``).
- Add click handlers for the two mode cards: Record card calls existing `recordBtn.click()` flow; Browse card scrolls to chat section.

### `extension/sidepanel.html`
- Replace the idle controls area with two side-by-side (or stacked) mode cards inside `#idleControls`.
- Keep existing recording/convert buttons available within the Record flow.

### `extension/styles.css`
- Add `.mode-card` styles: bordered card with icon, title, subtitle, hover effect.
- Add `pre`, `code` styles for chat messages: dark background (`#1e1e1e`), monospace font, padding, border-radius, overflow-x scroll, proper text color.
- Add inline code styling (`` `code` ``): subtle background, smaller font.

### Build
- Rebuild extension ZIP.

