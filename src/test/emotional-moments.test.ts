import { describe, expect, it } from "vitest";
import { detectMomentDetailed, looksEmotionallyLoaded } from "../../supabase/functions/_shared/emotional-engine/moments.ts";
import type { Moment } from "../../supabase/functions/_shared/emotional-engine/types.ts";
import { EI_GROUPS } from "@/lib/testCommands";

/* ============================================================================
   Does the moment detector actually read people correctly?

   This imports the REAL detector the product runs, not a copy, so it cannot
   drift the way the hand-rolled tests in tests/*.test.mjs warn about.

   The fixture is the tuning corpus itself: /commands already groups 525
   emotional messages by the behaviour each one probes, and most of those group
   ids ARE moment names. So the corpus doubles as a labelled test set, and the
   score below is the number that has to move when the cues are widened.

   Groups with no single correct answer are measured but not asserted. Forcing
   a label onto "loneliness" or "two feelings at once" would mean inventing a
   right answer and then congratulating ourselves for matching it.
   ============================================================================ */

// Corpus group id -> the moment a correct detector should return.
const EXPECTED: Record<string, Moment> = {
  crisis: "crisis",
  grief: "grief",
  heartbreak: "heartbreak",
  anxiety: "anxiety",
  venting: "venting",
  celebration: "celebration",
  banter: "banter",
  focused: "focused_task",
  conflict: "conflict",
  honesty: "conflict", // "be brutally honest" is the conflict cue by design
};

// Measured and printed, never asserted: no single moment is correct for these.
const UNSCORED = new Set(["loneliness", "self-doubt", "ordinary", "identity", "boundaries", "tell-bait", "mixed"]);

type Row = { id: string; hit: number; total: number; misses: string[] };

function scoreGroup(id: string, commands: string[], expected: Moment): Row {
  const misses: string[] = [];
  let hit = 0;
  for (const command of commands) {
    const read = detectMomentDetailed(command);
    if (read.moment === expected) hit += 1;
    else misses.push(`${command}  ->  ${read.moment}`);
  }
  return { id, hit, total: commands.length, misses };
}

describe("moment detection, scored against the tuning corpus", () => {
  const rows: Row[] = [];
  for (const group of EI_GROUPS) {
    const expected = EXPECTED[group.id];
    if (!expected) continue;
    rows.push(scoreGroup(group.id, group.commands, expected));
  }

  const scored = rows.reduce((n, r) => n + r.total, 0);
  const hits = rows.reduce((n, r) => n + r.hit, 0);

  it("prints the accuracy table", () => {
    const pct = (h: number, t: number) => `${Math.round((100 * h) / t)}%`.padStart(4);
    const lines = [
      "",
      "  moment detection, real detector vs the corpus",
      "  ------------------------------------------------",
      ...rows
        .slice()
        .sort((a, b) => a.hit / a.total - b.hit / b.total)
        .map((r) => `  ${pct(r.hit, r.total)}  ${String(r.hit).padStart(3)}/${String(r.total).padEnd(3)}  ${r.id}`),
      "  ------------------------------------------------",
      `  ${pct(hits, scored)}  ${hits}/${scored}    OVERALL (scored groups)`,
      "",
    ];

    // What the unscored groups currently land on, for eyes only.
    const spread: string[] = [];
    for (const group of EI_GROUPS) {
      if (!UNSCORED.has(group.id)) continue;
      const counts: Record<string, number> = {};
      for (const command of group.commands) {
        const m = detectMomentDetailed(command).moment;
        counts[m] = (counts[m] || 0) + 1;
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m}:${n}`).join(" ");
      spread.push(`  ${group.id.padEnd(12)} ${top}`);
    }
    console.log([...lines, "  unscored groups, where they land:", ...spread, ""].join("\n"));
    expect(scored).toBeGreaterThan(0);
  });

  // A floor rather than a target. It exists to catch a regression, so it is
  // raised deliberately after an improvement lands, never lowered to pass.
  it("overall accuracy on scored groups holds its floor", () => {
    expect(hits / scored).toBeGreaterThanOrEqual(0.5);
  });

  // Unambiguous crisis language must be caught by the WORDS ALONE, with no
  // model involved. This is the floor that makes the safety promise real: if
  // every network call failed right now, these would still route to crisis.
  it("catches unambiguous crisis language with cues alone", () => {
    const unambiguous = [
      "i want to end it all",
      "i do not want to be here anymore",
      "i don't want to be here anymore",
      "i have been thinking about hurting myself",
      "i have been thinking about hurting myself tonight",
      "everyone would be better off without me",
      "i have no reason to keep going",
      "i cannot go on",
      "i can't go on",
      "there is no point to any of this",
      "i am in a really dark place right now",
      "i want to die",
      "i wish i was dead",
      "life is not worth living",
      "i keep thinking about killing myself",
    ];
    const missed = unambiguous.filter((c) => detectMomentDetailed(c).moment !== "crisis");
    expect(missed).toEqual([]);
  });

  // The rest of the crisis group is real distress worded in ways no word list
  // can enumerate ("I am out of options", "I do not know who else to tell").
  // Those cannot be required to hit crisis on cues, but they must never be
  // silently dropped: either the cues place them somewhere emotional, or the
  // gate opens so the reasoning layer gets to look.
  it("never silently drops a crisis message", () => {
    const crisis = EI_GROUPS.find((g) => g.id === "crisis");
    expect(crisis).toBeTruthy();
    const dropped = (crisis?.commands || []).filter(
      (c) => detectMomentDetailed(c).moment === "neutral" && !looksEmotionallyLoaded(c),
    );
    expect(dropped).toEqual([]);
  });

  it("never reads a plain action command as emotional", () => {
    for (const command of ["open gmail", "play blinding lights", "send an email to sam", "find my resume"]) {
      expect(detectMomentDetailed(command).moment).toBe("neutral");
      expect(looksEmotionallyLoaded(command)).toBe(false);
    }
  });

  // The case that started all of this. Physical descriptions of distress must
  // reach the emotional layer one way or the other: either the cues catch it,
  // or the gate lets the model look at it. Landing on neutral with the gate
  // shut is the exact failure this suite exists to prevent.
  it("does not silently drop distress described through the body", () => {
    const body = [
      "my chest is tight and i cannot focus",
      "my hands are shaking before this call",
      "my heart is racing for no reason",
      "i cannot sleep, my brain will not stop",
      "there is a knot in my stomach all day",
    ];
    const dropped = body.filter((t) => detectMomentDetailed(t).moment === "neutral" && !looksEmotionallyLoaded(t));
    expect(dropped).toEqual([]);
  });
});
