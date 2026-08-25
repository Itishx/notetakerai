import { useCallback, useEffect, useState } from "react";
import {
  ACTION_ICONS,
  DEFAULT_SHORTCUTS,
  MAX_SHORTCUTS,
  faviconFor,
  loadShortcuts,
  newShortcut,
  normalizeUrl,
  saveShortcuts,
  type Shortcut,
} from "@/lib/wallpaperShortcuts";

/* The row under the clock on the idle screen, edited here.
 *
 * Four ship, and they are things Braino does himself. Everything after that is
 * a link you put there. Saves as you type, because a Save button on eight rows
 * of text is a button nobody needs.
 */

const serifStyle = { fontFamily: "'Instrument Serif', Georgia, serif" } as const;
const monoStyle = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

export default function WallpaperShortcutsCard() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadShortcuts());

  useEffect(() => { saveShortcuts(shortcuts); }, [shortcuts]);

  const update = useCallback((id: string, patch: Partial<Shortcut>) => {
    setShortcuts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const remove = useCallback((id: string) => {
    setShortcuts((rows) => rows.filter((row) => row.id !== id));
  }, []);

  return (
    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 style={serifStyle} className="mb-1 text-[24px] leading-none tracking-[-0.02em]">
            Your <em className="text-[var(--sb-accent-deep)]">idle screen.</em>
          </h3>
          <p className="max-w-[560px] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
            The row under the clock. Four of them are things Braino does himself; add any link you
            want beside them and it shows up with that site&apos;s own icon, or an emoji if you
            &apos;d rather. Up to {MAX_SHORTCUTS}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShortcuts(DEFAULT_SHORTCUTS)}
          style={monoStyle}
          className="flex-shrink-0 rounded-full border border-[var(--sb-line-2)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {shortcuts.map((shortcut) => {
          const icon = shortcut.action ? ACTION_ICONS[shortcut.action] : "";
          const favicon = shortcut.kind === "link" && !shortcut.emoji ? faviconFor(shortcut.url || "") : "";
          return (
            <div
              key={shortcut.id}
              className="flex items-center gap-3 rounded-[12px] border border-[var(--sb-line)] bg-[var(--sb-bg-2)] p-2.5"
            >
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[var(--sb-ink-2)]">
                {icon ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                  </svg>
                ) : shortcut.emoji ? (
                  <span className="text-[18px] leading-none">{shortcut.emoji}</span>
                ) : favicon ? (
                  <img src={favicon} alt="" width={18} height={18} className="rounded-[4px]" />
                ) : (
                  <span className="text-[14px]">{(shortcut.label || "?").slice(0, 1).toUpperCase()}</span>
                )}
              </div>

              <input
                value={shortcut.label}
                onChange={(event) => update(shortcut.id, { label: event.target.value })}
                placeholder="Name"
                className="w-[150px] flex-shrink-0 rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-[var(--sb-ink)] outline-none transition-colors focus:border-[var(--sb-line-2)]"
              />

              {shortcut.kind === "link" ? (
                <>
                  <input
                    value={shortcut.url || ""}
                    onChange={(event) => update(shortcut.id, { url: event.target.value })}
                    placeholder="example.com"
                    className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-[var(--sb-ink-2)] outline-none transition-colors focus:border-[var(--sb-line-2)]"
                  />
                  <input
                    value={shortcut.emoji || ""}
                    onChange={(event) => update(shortcut.id, { emoji: event.target.value.slice(0, 2) })}
                    placeholder="🙂"
                    aria-label="Emoji instead of the site icon"
                    className="w-[52px] flex-shrink-0 rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-center text-[15px] outline-none transition-colors focus:border-[var(--sb-line-2)]"
                  />
                </>
              ) : (
                <span style={monoStyle} className="flex-1 text-[11px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                  Built in
                </span>
              )}

              <button
                type="button"
                onClick={() => remove(shortcut.id)}
                aria-label={`Remove ${shortcut.label || "shortcut"}`}
                className="flex-shrink-0 rounded-full px-2 py-1 text-[16px] leading-none text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {shortcuts.length < MAX_SHORTCUTS ? (
        <button
          type="button"
          onClick={() => setShortcuts((rows) => [...rows, newShortcut()])}
          style={monoStyle}
          className="mt-3 w-full rounded-[12px] border border-dashed border-[var(--sb-line-2)] py-2.5 text-[11px] uppercase tracking-[0.16em] text-[var(--sb-ink-3)] transition-colors hover:border-[var(--sb-accent-deep)] hover:text-[var(--sb-ink)]"
        >
          Add a link
        </button>
      ) : null}

      <p className="mt-3 text-[12px] text-[var(--sb-ink-3)]">
        Open it any time with{" "}
        <span style={monoStyle} className="text-[var(--sb-ink-2)]">⌘ ⇧ W</span>, or leave the Mac
        alone for a while and it appears on its own.{" "}
        <a href="/wallpaper" className="underline underline-offset-2 hover:text-[var(--sb-ink)]">
          Preview it
        </a>
        .
      </p>
    </div>
  );
}
