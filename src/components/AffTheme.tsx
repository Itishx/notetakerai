import { useCallback, useState } from "react";
import "./aff-theme.css";

/* ============================================================================
   The light switch for the Affective pages.

   Explicit only. The site has always been light and a visitor whose machine is
   set to dark should not have the company page change character on them
   without asking; the choice is a button, and it is remembered.

   The value is written onto the page's own root element rather than the
   document, because these pages scope their tokens to .aff precisely so the
   globally dark site tokens cannot reach in. The same wall works in reverse.
   ============================================================================ */

/* Dark by default (2026-10-29, Itish). Only a visitor who flips the switch
   gets light. A new key, written only when someone actually toggles: the old
   one was saved on every visit, so it can't tell a choice from a default. */
const KEY = "aff-theme-choice";
export type AffTheme = "light" | "dark";

export function useAffTheme() {
  const [theme, set] = useState<AffTheme>(() => {
    // Storage throws in a private window and returns nothing on a first visit.
    try {
      return localStorage.getItem(KEY) === "light" ? "light" : "dark";
    } catch (_) {
      return "dark";
    }
  });

  const toggle = useCallback(() => set((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (_) {}
    return next;
  }), []);
  return { theme, toggle };
}

export function AffThemeToggle({ theme, onToggle }: { theme: AffTheme; onToggle: () => void }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="aff-theme"
      onClick={onToggle}
      aria-pressed={dark}
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      <span className="aff-theme-sr">{dark ? "Switch to light" : "Switch to dark"}</span>
      {/* One glyph that is a sun with its rays out, or the same disc with a
          bite taken out of it. Drawn rather than two icons swapped, so the
          change reads as the same object under a different light. */}
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {dark ? (
          <path
            d="M16.2 12.6A7 7 0 0 1 7.4 3.8a7 7 0 1 0 8.8 8.8Z"
            fill="currentColor"
          />
        ) : (
          <>
            <circle cx="10" cy="10" r="4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 1.6v2.1M10 16.3v2.1M1.6 10h2.1M16.3 10h2.1" />
              <path d="M4.1 4.1 5.6 5.6M14.4 14.4l1.5 1.5M15.9 4.1l-1.5 1.5M5.6 14.4l-1.5 1.5" />
            </g>
          </>
        )}
      </svg>
    </button>
  );
}
