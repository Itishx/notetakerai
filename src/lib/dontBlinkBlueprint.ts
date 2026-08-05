import type { KBeat } from "@/lib/kineticFilm";

/* The reusable motion grammar from /dontblink. A new film supplies only its
   phrases and intentional cuts; this layer owns the visual defaults. */
export const DONT_BLINK_BLUEPRINT = {
  cadence: 300,
  gap: 260,
  wordGapEm: 0.2,
  fontWeight: 600,
  letterSpacingEm: -0.025,
  matchCutHoldMs: 140,
} as const;

export function applyDontBlinkBlueprint(beats: KBeat[]): KBeat[] {
  return beats.map((beat) => ({
    ...beat,
    cadence: beat.cadence ?? DONT_BLINK_BLUEPRINT.cadence,
    gapAfter: beat.gapAfter ?? DONT_BLINK_BLUEPRINT.gap,
  }));
}

/** Split every word of two or more characters exactly once at its median and
 * fuse the second half. For odd lengths, the first half owns the extra letter.
 * Natural sentence spacing remains the renderer's job. */
export function dontBlinkWords(text: string): string[] {
  return text.trim().split(/\s+/).flatMap((word) => {
    const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9’']+)(.*)$/);
    if (!match) return [word];
    const [, prefix, core, suffix] = match;
    if (core.length < 2) return [word];
    // Apostrophes stay attached to the surrounding letters but do not count
    // toward the visual midpoint: "There's" becomes "The" + "re's".
    const letterCount = [...core].filter((character) => /[A-Za-z0-9]/.test(character)).length;
    const median = Math.ceil(letterCount / 2);
    let seen = 0;
    let cut = 0;
    for (const character of core) {
      cut += character.length;
      if (/[A-Za-z0-9]/.test(character)) seen += 1;
      if (seen === median) break;
    }
    return [`${prefix}${core.slice(0, cut)}`, `+${core.slice(cut)}${suffix}`];
  });
}
