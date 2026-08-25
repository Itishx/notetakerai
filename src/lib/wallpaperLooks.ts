import looksFile from "../../shared/wallpaperLooks.json";

/* The Braino OS wallpapers.
 *
 * One file underneath (`shared/wallpaperLooks.json`), read here for the website
 * and by `main.cjs` for the Mac, so a look can never mean two different things
 * on two screens. Apple's rule, followed on purpose: the screensaver and the
 * wallpaper are the same picture, one of them moving and one of them still.
 */

export type LookFamily = "Light" | "Dark" | "Colour" | "Editorial";
export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export type Look = {
  id: string;
  name: string;
  family: LookFamily;
  timeOfDay: TimeOfDay;
  background: string;
  ink: string;
  inkSoft: string;
  glass: string;
  glassBorder: string;
  grain: number;
  vignette: string;
  clockFont: string;
  clockItalic: boolean;
  clockWeight: number;
  clockTracking: string;
  quote: string;
  wordmarkTone: "light" | "dark";
  /* One look is the wordmark rather than wearing it. */
  signature?: boolean;
};

export const LOOKS = (looksFile as { looks: Look[] }).looks;

export const FAMILIES: LookFamily[] = ["Light", "Dark", "Colour", "Editorial"];

export function lookById(id: string): Look {
  return LOOKS.find((look) => look.id === id) || LOOKS[0];
}

export function lookIndexById(id: string): number {
  const found = LOOKS.findIndex((look) => look.id === id);
  return found < 0 ? 0 : found;
}

/* Apple's dynamic wallpaper changes with the sun, and it is the one thing about
   their set that people actually notice. Same idea, done with the clock the
   machine already has rather than a location. */
export function timeOfDayNow(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour < 7) return "night";
  if (hour < 10) return "dawn";
  if (hour < 17) return "day";
  if (hour < 21) return "dusk";
  return "night";
}

export function looksForTimeOfDay(when: TimeOfDay = timeOfDayNow()): Look[] {
  const matching = LOOKS.filter((look) => look.timeOfDay === when);
  return matching.length ? matching : LOOKS;
}
