// BrainoX hard policy gates (BrainoX.md sections 20, 21, 56, 74).
// Pure module on purpose: no Deno globals, no remote imports. brainox-schedule
// runs it server-side and src/test/brainox-policy.test.ts runs it under vitest.

export type PolicyCheck = {
  name: string;
  pass: boolean;
  detail: string;
};

export type PolicyDecision = {
  pass: boolean;
  checks: PolicyCheck[];
};

export type PolicyInput = {
  text: string;
  threadMode: boolean;
  /** Proposed publish time (ms epoch). */
  scheduledAtMs: number;
  /** The proposed time expressed as an hour 0-23 in the user's timezone. */
  localHour: number;
  /** Texts of recent + queued + scheduled posts to compare against. */
  recentTexts: string[];
  /** Publish times (ms epoch) of pending/posted items around the slot. */
  neighborTimesMs: number[];
  /** Publish times (ms epoch) already occupying the same local day. */
  sameDayTimesMs: number[];
  killSwitch: boolean;
  quietStart: number;
  quietEnd: number;
  minGapMinutes: number;
  maxPostsPerDay: number;
};

const POST_CHAR_LIMIT = 280;

export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    // Mentions are addressing, not content; hashtag text is content.
    .replace(/@[\p{L}\p{N}_]+/gu, " ")
    .replace(/#/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token-set Jaccard similarity between two texts, 0..1. */
export function similarityRatio(a: string, b: string): number {
  const ta = new Set(normalizeForCompare(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeForCompare(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const token of ta) if (tb.has(token)) overlap += 1;
  return overlap / (ta.size + tb.size - overlap);
}

export type DuplicateVerdict = {
  duplicate: boolean;
  nearDuplicate: boolean;
  similarity: number;
  match: string | null;
};

export function checkDuplicate(candidate: string, recentTexts: string[]): DuplicateVerdict {
  const normalized = normalizeForCompare(candidate);
  let best = 0;
  let match: string | null = null;
  for (const other of recentTexts) {
    if (normalizeForCompare(other) === normalized) {
      return { duplicate: true, nearDuplicate: true, similarity: 1, match: other };
    }
    const score = similarityRatio(candidate, other);
    if (score > best) {
      best = score;
      match = other;
    }
  }
  return { duplicate: false, nearDuplicate: best >= 0.72, similarity: best, match: best >= 0.72 ? match : null };
}

/** Quiet hours may wrap midnight (23 -> 7). start === end means disabled. */
export function isInQuietHours(localHour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return localHour >= quietStart && localHour < quietEnd;
  return localHour >= quietStart || localHour < quietEnd;
}

export function minGapViolation(
  scheduledAtMs: number,
  neighborTimesMs: number[],
  minGapMinutes: number,
): number | null {
  const gapMs = minGapMinutes * 60_000;
  for (const other of neighborTimesMs) {
    if (Math.abs(other - scheduledAtMs) < gapMs) return other;
  }
  return null;
}

export function runPolicy(input: PolicyInput): PolicyDecision {
  const checks: PolicyCheck[] = [];

  checks.push({
    name: "kill_switch",
    pass: !input.killSwitch,
    detail: input.killSwitch
      ? "X automation is stopped. Resume it from the dashboard to publish."
      : "Automation is live.",
  });

  const trimmed = input.text.trim();
  checks.push({
    name: "content",
    pass: trimmed.length > 0,
    detail: trimmed.length > 0 ? "Post has content." : "Post is empty.",
  });

  const lengthOk = input.threadMode || trimmed.length <= POST_CHAR_LIMIT;
  checks.push({
    name: "length",
    pass: lengthOk,
    detail: lengthOk
      ? `${trimmed.length} characters.`
      : `${trimmed.length} characters is over ${POST_CHAR_LIMIT}. Shorten it or switch to thread mode.`,
  });

  const dup = checkDuplicate(trimmed, input.recentTexts);
  checks.push({
    name: "duplication",
    pass: !dup.duplicate && !dup.nearDuplicate,
    detail: dup.duplicate
      ? "Exact duplicate of a recent or queued post."
      : dup.nearDuplicate
        ? `Too close to a recent post (${Math.round(dup.similarity * 100)}% similar): "${(dup.match || "").slice(0, 80)}"`
        : "No duplicate or near-duplicate found.",
  });

  const quiet = isInQuietHours(input.localHour, input.quietStart, input.quietEnd);
  checks.push({
    name: "quiet_hours",
    pass: !quiet,
    detail: quiet
      ? `That time falls in quiet hours (${input.quietStart}:00 to ${input.quietEnd}:00).`
      : "Outside quiet hours.",
  });

  const clash = minGapViolation(input.scheduledAtMs, input.neighborTimesMs, input.minGapMinutes);
  checks.push({
    name: "spacing",
    pass: clash === null,
    detail:
      clash === null
        ? `At least ${input.minGapMinutes} minutes clear on both sides.`
        : `Within ${input.minGapMinutes} minutes of another post at ${new Date(clash).toISOString()}.`,
  });

  const dayCapOk = input.sameDayTimesMs.length < input.maxPostsPerDay;
  checks.push({
    name: "daily_cap",
    pass: dayCapOk,
    detail: dayCapOk
      ? `${input.sameDayTimesMs.length} of ${input.maxPostsPerDay} posts used that day.`
      : `Daily cap of ${input.maxPostsPerDay} posts already reached for that day.`,
  });

  return { pass: checks.every((check) => check.pass), checks };
}

/**
 * Suggest the next publish slots that clear spacing, quiet hours, and the
 * daily cap. Used by assisted/autopilot planning. Deterministic: walks
 * forward from `fromMs` in 15-minute steps.
 */
export function suggestSlots(options: {
  fromMs: number;
  count: number;
  occupiedTimesMs: number[];
  minGapMinutes: number;
  quietStart: number;
  quietEnd: number;
  maxPostsPerDay: number;
  /** Convert an ms timestamp to the user's local hour + day key. */
  localParts: (ms: number) => { hour: number; dayKey: string };
}): number[] {
  const slots: number[] = [];
  const occupied = [...options.occupiedTimesMs];
  const step = 15 * 60_000;
  const horizon = options.fromMs + 14 * 24 * 60 * 60_000;
  let cursor = Math.ceil(options.fromMs / step) * step;

  while (slots.length < options.count && cursor < horizon) {
    const { hour, dayKey } = options.localParts(cursor);
    const sameDay = occupied.filter((ms) => options.localParts(ms).dayKey === dayKey);
    const ok =
      !isInQuietHours(hour, options.quietStart, options.quietEnd) &&
      minGapViolation(cursor, occupied, options.minGapMinutes) === null &&
      sameDay.length < options.maxPostsPerDay;
    if (ok) {
      slots.push(cursor);
      occupied.push(cursor);
      cursor += options.minGapMinutes * 60_000;
    } else {
      cursor += step;
    }
  }

  return slots;
}
