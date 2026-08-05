// Shared shape for a teaser film's on-screen script panel. A line is "active"
// from its own tStart until the next line's tStart (or its own tEnd, if given).
export type ScriptLine = { tStart: number; tEnd?: number; text: string };

export function findActiveIndex(lines: ScriptLine[], currentMs: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].tStart <= currentMs) idx = i;
    else break;
  }
  if (idx >= 0) {
    const end = lines[idx].tEnd ?? (lines[idx + 1]?.tStart ?? Infinity);
    if (currentMs >= end && lines[idx + 1] && currentMs < lines[idx + 1].tStart) {
      // between this line's end and the next line's start — nothing active
      return -1;
    }
  }
  return idx;
}

export function formatMs(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
