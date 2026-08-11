import { describe, expect, it } from "vitest";
import {
  checkDuplicate,
  isInQuietHours,
  minGapViolation,
  normalizeForCompare,
  runPolicy,
  similarityRatio,
  suggestSlots,
  type PolicyInput,
} from "../../supabase/functions/_shared/brainox-policy.ts";

const HOUR = 60 * 60 * 1000;

function baseInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    text: "Braino opened Spotify from a voice command today. Assistants are becoming operators.",
    threadMode: false,
    scheduledAtMs: Date.parse("2026-08-12T12:00:00Z"),
    localHour: 12,
    recentTexts: [],
    neighborTimesMs: [],
    sameDayTimesMs: [],
    killSwitch: false,
    quietStart: 23,
    quietEnd: 7,
    minGapMinutes: 90,
    maxPostsPerDay: 5,
    ...overrides,
  };
}

describe("normalizeForCompare", () => {
  it("drops urls, mentions, punctuation, and case", () => {
    expect(normalizeForCompare("Check THIS out! https://x.com/abc @braino #ai")).toBe("check this out ai");
  });
});

describe("similarityRatio", () => {
  it("is 1 for identical texts and 0 for disjoint texts", () => {
    expect(similarityRatio("braino runs the queue", "braino runs the queue")).toBe(1);
    expect(similarityRatio("alpha beta", "gamma delta")).toBe(0);
  });
});

describe("checkDuplicate", () => {
  it("flags exact duplicates even with different casing and links", () => {
    const verdict = checkDuplicate("Braino is my second brain!", ["braino is my second brain https://t.co/x"]);
    expect(verdict.duplicate).toBe(true);
  });

  it("flags near duplicates but passes genuinely new posts", () => {
    const recent = ["AI assistants should stop living inside chat windows and start operating the computer"];
    const near = checkDuplicate(
      "AI assistants should stop living inside chat windows, they should start operating your computer",
      recent,
    );
    expect(near.nearDuplicate).toBe(true);
    const fresh = checkDuplicate("Shipped the meeting recorder today. Both audio sides, with names.", recent);
    expect(fresh.duplicate).toBe(false);
    expect(fresh.nearDuplicate).toBe(false);
  });
});

describe("isInQuietHours", () => {
  it("handles windows that wrap midnight", () => {
    expect(isInQuietHours(23, 23, 7)).toBe(true);
    expect(isInQuietHours(3, 23, 7)).toBe(true);
    expect(isInQuietHours(7, 23, 7)).toBe(false);
    expect(isInQuietHours(12, 23, 7)).toBe(false);
  });

  it("handles same-day windows and the disabled case", () => {
    expect(isInQuietHours(10, 9, 17)).toBe(true);
    expect(isInQuietHours(8, 9, 17)).toBe(false);
    expect(isInQuietHours(12, 5, 5)).toBe(false);
  });
});

describe("minGapViolation", () => {
  it("returns the clashing neighbor inside the gap and null outside it", () => {
    const at = Date.parse("2026-08-12T12:00:00Z");
    expect(minGapViolation(at, [at + 30 * 60 * 1000], 90)).toBe(at + 30 * 60 * 1000);
    expect(minGapViolation(at, [at + 2 * HOUR], 90)).toBeNull();
  });
});

describe("runPolicy", () => {
  it("passes a clean post", () => {
    const decision = runPolicy(baseInput());
    expect(decision.pass).toBe(true);
    expect(decision.checks).toHaveLength(7);
  });

  it("hard-blocks on the kill switch", () => {
    const decision = runPolicy(baseInput({ killSwitch: true }));
    expect(decision.pass).toBe(false);
    expect(decision.checks.find((check) => check.name === "kill_switch")?.pass).toBe(false);
  });

  it("blocks over-length posts unless thread mode is on", () => {
    const long = "a".repeat(300);
    expect(runPolicy(baseInput({ text: long })).pass).toBe(false);
    expect(runPolicy(baseInput({ text: long, threadMode: true })).pass).toBe(true);
  });

  it("blocks when the daily cap is already reached", () => {
    const at = Date.parse("2026-08-12T12:00:00Z");
    const sameDay = [1, 2, 3, 4, 5].map((offsetHours) => at - offsetHours * HOUR);
    const decision = runPolicy(
      baseInput({ sameDayTimesMs: sameDay, neighborTimesMs: [], maxPostsPerDay: 5 }),
    );
    expect(decision.pass).toBe(false);
    expect(decision.checks.find((check) => check.name === "daily_cap")?.pass).toBe(false);
  });
});

describe("suggestSlots", () => {
  const localParts = (ms: number) => {
    const date = new Date(ms);
    return { hour: date.getUTCHours(), dayKey: date.toISOString().slice(0, 10) };
  };

  it("spaces slots by the minimum gap and skips quiet hours", () => {
    const from = Date.parse("2026-08-12T22:00:00Z");
    const slots = suggestSlots({
      fromMs: from,
      count: 3,
      occupiedTimesMs: [],
      minGapMinutes: 90,
      quietStart: 23,
      quietEnd: 7,
      maxPostsPerDay: 5,
      localParts,
    });
    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      expect(isInQuietHours(localParts(slot).hour, 23, 7)).toBe(false);
    }
    for (let index = 1; index < slots.length; index++) {
      expect(slots[index] - slots[index - 1]).toBeGreaterThanOrEqual(90 * 60 * 1000);
    }
  });

  it("respects the daily cap when a day is already full", () => {
    const dayStart = Date.parse("2026-08-12T08:00:00Z");
    const occupied = [0, 1, 2].map((offset) => dayStart + offset * 2 * HOUR);
    const slots = suggestSlots({
      fromMs: dayStart + 5 * HOUR,
      count: 1,
      occupiedTimesMs: occupied,
      minGapMinutes: 60,
      quietStart: 23,
      quietEnd: 7,
      maxPostsPerDay: 3,
      localParts,
    });
    expect(slots).toHaveLength(1);
    expect(localParts(slots[0]).dayKey).not.toBe("2026-08-12");
  });
});
