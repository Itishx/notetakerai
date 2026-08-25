import { LOOKS, looksForTimeOfDay, timeOfDayNow, type Look } from "@/lib/wallpaperLooks";

/* How you want the set used.
 *
 * Two things, deliberately kept apart, because Apple keeps them apart and they
 * are genuinely different jobs: the **screensaver** is what the Mac shows when
 * you are not there, and the **wallpaper** is what sits behind your work all
 * day. They draw from the same set of looks, which is the whole trick: the
 * screensaver settles into the wallpaper rather than being a separate world.
 */

export type LookMode = "shuffle" | "one" | "dynamic";

export type WallpaperSettings = {
  /* Screensaver */
  mode: LookMode;
  look: string;
  cycleSeconds: number;
  quotes: boolean;
  idleEnabled: boolean;
  idleMinutes: number;
  /* Desktop wallpaper */
  wallpaperMode: Exclude<LookMode, "shuffle">;
  wallpaperLook: string;
};

export const DEFAULT_SETTINGS: WallpaperSettings = {
  mode: "shuffle",
  look: "mind",
  cycleSeconds: 10,
  quotes: true,
  idleEnabled: true,
  idleMinutes: 5,
  wallpaperMode: "one",
  wallpaperLook: "mind",
};

export const CYCLE_CHOICES = [5, 10, 30, 60, 300] as const;

const STORAGE_KEY = "braino.wallpaper.settings";
export const SETTINGS_EVENT = "braino:wallpaper-settings-changed";

function clean(raw: unknown): WallpaperSettings {
  const row = (raw && typeof raw === "object" ? raw : {}) as Partial<WallpaperSettings>;
  const known = (id: unknown, fallback: string) =>
    typeof id === "string" && LOOKS.some((look) => look.id === id) ? id : fallback;
  return {
    mode: row.mode === "one" || row.mode === "dynamic" ? row.mode : "shuffle",
    look: known(row.look, DEFAULT_SETTINGS.look),
    cycleSeconds: Math.min(3600, Math.max(3, Number(row.cycleSeconds) || DEFAULT_SETTINGS.cycleSeconds)),
    quotes: row.quotes !== false,
    idleEnabled: row.idleEnabled !== false,
    idleMinutes: Math.min(120, Math.max(1, Number(row.idleMinutes) || DEFAULT_SETTINGS.idleMinutes)),
    wallpaperMode: row.wallpaperMode === "dynamic" ? "dynamic" : "one",
    wallpaperLook: known(row.wallpaperLook, DEFAULT_SETTINGS.wallpaperLook),
  };
}

export function loadSettings(): WallpaperSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return clean(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: WallpaperSettings): WallpaperSettings {
  const next = clean(settings);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  } catch {
    /* A browser with storage off simply keeps the defaults. */
  }
  return next;
}

/* Which looks the screensaver is allowed to show, in the order it shows them.
   One look means one look; dynamic means the ones that suit the hour. */
export function rotationFor(settings: WallpaperSettings, date = new Date()): Look[] {
  if (settings.mode === "one") {
    const chosen = LOOKS.find((look) => look.id === settings.look);
    return chosen ? [chosen] : [LOOKS[0]];
  }
  if (settings.mode === "dynamic") return looksForTimeOfDay(timeOfDayNow(date));
  return LOOKS;
}
