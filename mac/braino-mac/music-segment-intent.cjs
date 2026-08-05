"use strict";

const NUMBER_WORDS = {
  zero: 0, oh: 0, one: 1, two: 2, to: 2, too: 2, three: 3, four: 4,
  for: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50,
};

function spokenNumber(value) {
  const clean = String(value || "").toLowerCase().replace(/-/g, " ").trim();
  if (/^\d+$/.test(clean)) return Number(clean);
  const words = clean.split(/\s+/);
  let total = 0;
  for (const word of words) {
    if (!(word in NUMBER_WORDS)) return null;
    total += NUMBER_WORDS[word];
  }
  return total;
}

function timestampSeconds(value) {
  const clean = String(value || "").toLowerCase().trim();
  const withUnits = clean.match(/^(.+?)\s+minutes?(?:\s+(?:and\s+)?(.+?)\s+seconds?)?$/);
  if (withUnits) {
    const minutes = spokenNumber(withUnits[1]);
    const seconds = withUnits[2] ? spokenNumber(withUnits[2]) : 0;
    if (minutes != null && seconds != null && seconds < 60) return minutes * 60 + seconds;
  }
  const secondsOnly = clean.match(/^(.+?)\s+seconds?$/);
  if (secondsOnly) return spokenNumber(secondsOnly[1]);

  const colon = clean.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  // Whisper commonly drops the colon entirely: "1:26" becomes "126".
  // This recovery is only called for tokens inside an explicit from/to loop
  // range, where a compact timestamp is the only logical interpretation.
  const compact = clean.match(/^(\d{1,2})(\d{2})$/);
  if (compact && Number(compact[2]) < 60) {
    return Number(compact[1]) * 60 + Number(compact[2]);
  }

  const parts = clean.split(/\s+/);
  // Voice transcription often turns 2:20 into "two twenty" or "2 20".
  for (let split = 1; split < parts.length; split += 1) {
    const minutes = spokenNumber(parts.slice(0, split).join(" "));
    const seconds = spokenNumber(parts.slice(split).join(" "));
    if (minutes != null && seconds != null && minutes <= 59 && seconds <= 59) {
      return minutes * 60 + seconds;
    }
  }
  return null;
}

const NUMBER_TOKEN = String.raw`(?:\d{1,4}|(?:zero|oh|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)(?:[\s-]+(?:zero|oh|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)){0,3})`;
const TIME_TOKEN = String.raw`(?:${NUMBER_TOKEN}\s+minutes?(?:\s+(?:and\s+)?${NUMBER_TOKEN}\s+seconds?)?|${NUMBER_TOKEN}\s+seconds?|\d{1,2}\s*[:.]\s*\d{1,2}|\d{3,4}|\d{1,2}\s+\d{1,2}|(?:zero|oh|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)(?:[\s-]+(?:zero|oh|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)){1,3})`;

function parseMusicSegmentRange(raw) {
  const source = String(raw || "").trim();
  const match = source.match(new RegExp(`\\bfrom\\s+(${TIME_TOKEN})\\s+(?:to|through|till|until|and)\\s+(${TIME_TOKEN})(?=\\s|$|[,.!?])`, "i"));
  if (!match) return { valid: false, reason: "missing_range", raw: source };
  const startSeconds = timestampSeconds(match[1]);
  const endSeconds = timestampSeconds(match[2]);
  if (startSeconds == null || endSeconds == null || endSeconds <= startSeconds) {
    return { valid: false, reason: "invalid_range", raw: source, matchedText: match[0] };
  }
  return {
    valid: true,
    reason: null,
    startSeconds,
    endSeconds,
    durationSeconds: endSeconds - startSeconds,
    interpretedRange: `${Math.floor(startSeconds / 60)}:${String(startSeconds % 60).padStart(2, "0")} to ${Math.floor(endSeconds / 60)}:${String(endSeconds % 60).padStart(2, "0")}`,
    matchedText: match[0],
  };
}

function parseMusicSegmentIntent(raw) {
  const source = String(raw || "").trim();
  if (!/\bon\s+(?:a\s+)?loop\b|\bloop(?:ed|ing)?\b/i.test(source)) return null;
  if (!/\b(?:play|put on|start|listen to|loop)\b/i.test(source)) return null;

  const useCurrent = /\b(?:this|that|the|current|currently\s+playing)\s+(?:song|track|music)\b|\b(?:whatever|what)\s+(?:is|'s)\s+playing\b/i.test(source);
  const provider = /\bapple\s+music\b|\bon\s+music\b/i.test(source)
    ? "apple_music"
    : /\byou\s*tube(?:\s+music)?\b|\byt\s+music\b/i.test(source)
      ? "youtube_music"
      : useCurrent
        ? "current"
        : "spotify";
  const range = parseMusicSegmentRange(source);

  const song = source
    .replace(/^\s*(?:braino|breno|braido)[\s,]+/i, "")
    .replace(/^(?:can|could|would)\s+you\s+(?:please\s+)?/i, "")
    .replace(/^(?:please\s+)?(?:play|put on|start|listen to|loop)\s+/i, "")
    .replace(range.matchedText || "", " ")
    .replace(/\bon\s+(?:a\s+)?loop\b|\bloop(?:ed|ing)?\b/gi, " ")
    .replace(/\b(?:this|that|the|current|currently\s+playing)\s+(?:song|track|music)\b/gi, " ")
    .replace(/\b(?:on|in|with)\s+(?:spotify|apple\s+music|you\s*tube(?:\s+music)?|yt\s+music)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[,.!?]+$/g, "")
    .trim();

  if (!range.valid) {
    return { valid: false, reason: range.reason, song, provider, useCurrent, raw: source };
  }

  return {
    valid: Boolean(song) || useCurrent,
    reason: song || useCurrent ? null : "missing_song",
    song,
    provider,
    useCurrent,
    startSeconds: range.startSeconds,
    endSeconds: range.endSeconds,
    durationSeconds: range.durationSeconds,
    interpretedRange: range.interpretedRange,
  };
}

module.exports = { parseMusicSegmentIntent, parseMusicSegmentRange, timestampSeconds };
