/**
 * beatSync.ts — client-side beat analysis for the teaser. Decodes an audio file
 * with the Web Audio API, builds an onset (energy) envelope, estimates tempo by
 * autocorrelation, locks the beat phase, and returns a beat grid in ms.
 *
 * No server, no external model — this is the "AI" that listens to the track and
 * finds where the beats land so the teaser's text can be snapped to them.
 */

export interface BeatAnalysis {
  bpm: number;
  beats: number[];        // beat timestamps, ms from start
  downbeats: number[];    // every 4th beat (bar starts), ms
  durationMs: number;
  analyzedAt: number;     // epoch ms
}

export async function analyzeTrack(arrayBuffer: ArrayBuffer, nowMs: number): Promise<BeatAnalysis> {
  const AC: typeof AudioContext = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || window.AudioContext;
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();

  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  const hop = 512, win = 1024;

  // 1 — short-time RMS energy envelope
  const env: number[] = [];
  for (let i = 0; i + win < data.length; i += hop) {
    let e = 0;
    for (let j = 0; j < win; j++) { const s = data[i + j]; e += s * s; }
    env.push(Math.sqrt(e / win));
  }
  // 2 — onset = positive energy difference (rectified flux)
  const onset = env.map((v, i) => (i > 0 ? Math.max(0, v - env[i - 1]) : 0));
  const fps = sr / hop; // envelope frames per second

  // 3 — tempo via autocorrelation of the onset envelope over 60–180 BPM
  let bestBpm = 120, bestScore = -1;
  for (let bpm = 60; bpm <= 180; bpm++) {
    const lag = Math.round((fps * 60) / bpm);
    if (lag < 1 || lag >= onset.length) continue;
    let score = 0;
    for (let i = lag; i < onset.length; i++) score += onset[i] * onset[i - lag];
    // gently favour mid-tempo to avoid octave errors
    score *= 1 - Math.abs(bpm - 120) / 600;
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }

  // 4 — lock the beat phase: pick the offset whose beats sit on the most onset energy
  const period = (fps * 60) / bestBpm;
  let bestPhase = 0, bestPE = -1;
  for (let p = 0; p < period; p++) {
    let pe = 0;
    for (let b = p; b < onset.length; b += period) pe += onset[Math.round(b)] || 0;
    if (pe > bestPE) { bestPE = pe; bestPhase = p; }
  }

  const beats: number[] = [];
  for (let b = bestPhase; b < onset.length; b += period) beats.push((b / fps) * 1000);
  const downbeats = beats.filter((_, i) => i % 4 === 0);

  return { bpm: bestBpm, beats, downbeats, durationMs: audio.duration * 1000, analyzedAt: nowMs };
}

/** Snap a scene time (ms) to the nearest beat at or after `minMs`. */
export function snapToBeat(ms: number, beats: number[], minMs = 0): number {
  let best = ms, bestD = Infinity;
  for (const b of beats) {
    if (b < minMs) continue;
    const d = Math.abs(b - ms);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
