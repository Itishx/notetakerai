import { useEffect, useState } from "react";

/* ============================================================================
   The coral theme option — shared by the four "Braino classes" pages
   (/, /saburi, /iomi, /telos). One click flips the page from its own accent
   into 100% of the notch's coral: background, wordmark, everything. State
   persists across the four pages via localStorage.
   ============================================================================ */

const KEY = "sb-coral-classes";
export const CORAL_ACCENT = "#fff3ec";

export function useCoralTheme() {
  const [coral, setCoral] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, coral ? "1" : "0"); } catch { /* noop */ }
  }, [coral]);
  return [coral, setCoral] as const;
}

export default function ClassThemeToggle({ coral, onToggle }: { coral: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`bos-coraltoggle${coral ? " on" : ""}`}
      onClick={onToggle}
      aria-pressed={coral}
    >
      <i />{coral ? "Coral mode" : "Go full coral"}
    </button>
  );
}
