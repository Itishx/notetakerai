/* The row of things under the clock.
 *
 * Four of them ship, and they are the four you actually reach for. Everything
 * after that is yours: any link, any icon, edited from either dashboard and
 * shown on the idle screen on both surfaces.
 *
 * Stored locally for now. The shape is deliberately the one a row in Supabase
 * would have, so moving it to the account later is a change of storage rather
 * than a change of meaning.
 */

export type ShortcutKind = "action" | "link";

export type Shortcut = {
  id: string;
  label: string;
  kind: ShortcutKind;
  /* Built-in things Braino does himself. */
  action?: "speak" | "ask" | "play" | "os";
  /* Where a link goes. */
  url?: string;
  /* An emoji, if you would rather have one than the site's own icon. */
  emoji?: string;
};

/* The shipped four. The iPhone shows two; past about five this stops being an
   idle screen and starts being a launcher, so the editor caps it. */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "speak", label: "Speak", kind: "action", action: "speak" },
  { id: "ask", label: "Ask", kind: "action", action: "ask" },
  { id: "play", label: "Play", kind: "action", action: "play" },
  { id: "os", label: "Braino OS", kind: "action", action: "os" },
];

export const MAX_SHORTCUTS = 8;

export const ACTION_ICONS: Record<string, string> = {
  speak: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  ask: "M4 5h16v11H8l-4 4V5Z",
  play: "M8 5.5v13l11-6.5-11-6.5Z",
  os: "M12 3.5c2 0 3 1.4 3 2.8 1.7.2 3 1.6 3 3.4 0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5 0 1.9-1.6 3.4-3.5 3.4-.6 1.3-1.9 2-3.5 2s-2.9-.7-3.5-2C5.6 18.1 4 16.6 4 14.7c0-1 .4-1.9 1-2.5-.6-.6-1-1.5-1-2.5 0-1.8 1.3-3.2 3-3.4 0-1.4 1-2.8 3-2.8Z",
};

const STORAGE_KEY = "braino.wallpaper.shortcuts";

export function normalizeUrl(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/* A site's own icon says what it is faster than any label. Falls back to the
   emoji, and then to the first letter, so a link is never a blank circle. */
export function faviconFor(url: string): string {
  try {
    const host = new URL(normalizeUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return "";
  }
}

function isUsable(entry: unknown): entry is Shortcut {
  if (!entry || typeof entry !== "object") return false;
  const row = entry as Shortcut;
  if (!row.id || !row.label) return false;
  if (row.kind === "action") return Boolean(row.action && ACTION_ICONS[row.action]);
  return row.kind === "link" && Boolean(row.url);
}

export function loadShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_SHORTCUTS;
    const usable = parsed.filter(isUsable).slice(0, MAX_SHORTCUTS);
    // An empty row is a mistake, not a preference: nobody wants a bare screen
    // with the clock and nothing under it because one bad edit saved.
    return usable.length ? usable : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(shortcuts: Shortcut[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.slice(0, MAX_SHORTCUTS)));
    // The idle screen is usually open on another display while you edit these.
    window.dispatchEvent(new CustomEvent("braino:shortcuts-changed"));
  } catch {
    /* A browser with storage off simply keeps the defaults. */
  }
}

export function newShortcut(): Shortcut {
  return {
    id: `link-${Date.now().toString(36)}`,
    label: "",
    kind: "link",
    url: "",
    emoji: "",
  };
}
