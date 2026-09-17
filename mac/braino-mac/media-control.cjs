"use strict";

/* Stopping the sound, wherever it is coming from.
 *
 * Three real failures on 2026-09-17, all the same mistake: Braino assumed
 * Spotify. A YouTube video was playing, and
 *
 *   "reduce the volume also for this"   changed Spotify   (58 -> 57)
 *   "reduce the volume by 50%"          took 50 POINTS off Spotify (57 -> 6)
 *   "stop the video playing on YouTube" paused Spotify, then spent 53 seconds
 *                                       in the loop and gave up
 *
 * The rule a person would use: find what is actually making the noise, act on
 * that, say what you did. Spotify is checked first because it answers in a
 * quarter of a second; if it is not playing, the sound is coming from somewhere
 * else and that has to be found rather than assumed.
 *
 * This file holds the decisions with no Mac in them: what the sentence asked
 * for, and what a volume command does to a number. The doing lives in main. */

/* What is being talked about, if anything. */
const MEDIA_NOUN = /\b(?:video|songs?|music|audio|track|playback|sound|movie|film|episode|podcast|stream|youtube|spotify|netflix|reel|clip|player|tune)\b/i;
/* "Stop the task" is a job, not a sound, and has its own path. */
const NOT_MEDIA = /\b(?:task|job|run|agent|recording|meeting|timer|alarm|listening|dictation)\b/i;
const PAUSE_VERB = /\b(?:pause|stop|halt|kill|shut(?:\s+(?:it|this|that))?\s+(?:up|off)|turn\s+(?:it|this|that|the\s+\w+)?\s*off|cut)\b/i;
const RESUME_VERB = /\b(?:resume|unpause|continue|play(?:\s+it)?\s+again|keep\s+playing|carry\s+on)\b/i;
const NEXT_VERB = /\b(?:next|skip)\b/i;
const PREV_VERB = /\b(?:previous|go\s+back\s+a\s+(?:song|track)|last\s+(?:song|track))\b/i;
const MUTE_VERB = /\b(?:mute|silence)\b/i;
const UNMUTE_VERB = /\b(?:unmute|sound\s+back|volume\s+back)\b/i;
/* Words that mean "the thing making noise right now", so "stop this" works. */
const THIS_THAT = /\b(?:it|this|that|everything|whatever(?:'s| is)?\s+playing|the\s+thing)\b/i;

function targetFrom(text) {
  if (/\bspotify\b/i.test(text)) return "spotify";
  if (/\b(?:youtube|video|chrome|browser|tab|netflix|movie|film|episode|reel|clip|stream)\b/i.test(text)) return "browser";
  if (/\b(?:apple\s+music|itunes)\b/i.test(text)) return "music";
  return "any";
}

/* "Stop the video", "pause whatever is playing", "mute it", "next song". */
function parseMediaControlIntent(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (NOT_MEDIA.test(text)) return null;
  const aboutMedia = MEDIA_NOUN.test(text) || THIS_THAT.test(text);
  if (!aboutMedia) return null;
  const target = targetFrom(text);

  if (UNMUTE_VERB.test(text)) return { action: "unmute", target };
  if (MUTE_VERB.test(text)) return { action: "mute", target };
  if (NEXT_VERB.test(text) && MEDIA_NOUN.test(text)) return { action: "next", target };
  if (PREV_VERB.test(text)) return { action: "previous", target };
  if (PAUSE_VERB.test(text)) return { action: "pause", target };
  if (RESUME_VERB.test(text)) return { action: "play", target };
  /* "play the video" only counts when nothing is being named to play: "play
     Billie Jean" is a request for a song, and belongs to Spotify's own path. */
  if (/^\s*(?:please\s+)?play\b/i.test(text) && MEDIA_NOUN.test(text)) {
    const rest = text.replace(/^\s*(?:please\s+)?play\b/i, "").replace(MEDIA_NOUN, " ")
      .replace(/\b(?:the|that|this|it|again|back|on|in|from|please|for me|now)\b/gi, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!rest) return { action: "play", target };
  }
  return null;
}

/* "What is playing?" */
function parseNowPlayingIntent(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text || NOT_MEDIA.test(text)) return null;
  if (!/\b(?:what(?:'s| is| was)?|which|who(?:'s| is)?)\b/i.test(text)) return null;
  if (!/\b(?:playing|song|track|music|video|audio|sound)\b/i.test(text)) return null;
  return { target: targetFrom(text) };
}

const VOLUME_WORD = /\b(?:volume|vol|sound|loud(?:ness)?)\b/i;
const UP_WORD = /\b(?:louder|raise|increase|boost|higher|up|max(?:imum)?|full)\b/i;
const DOWN_WORD = /\b(?:quieter|softer|lower|decrease|reduce|down|less|low)\b/i;

/* What a volume sentence asks for, as numbers rather than words.
 *
 *   mode "absolute"          -> value is the volume to set
 *   mode "points"            -> value is how many points to move it by
 *   mode "percent"           -> value is a share of the CURRENT volume
 *
 * "by 50%" is the one that mattered: half of it, not fifty points off it,
 * which is how a 57 became a 6. */
function parseVolumeCommand(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const target = targetFrom(text);
  const hasVolumeWord = VOLUME_WORD.test(text);
  const wantsUp = /\bturn\s+(?:it|this|that|the\s+\w+\s+)?up\b/i.test(text) || (UP_WORD.test(text) && !/\bup\s+next\b/i.test(text));
  const wantsDown = /\bturn\s+(?:it|this|that|the\s+\w+\s+)?down\b/i.test(text) || DOWN_WORD.test(text);
  if (MUTE_VERB.test(text) && hasVolumeWord) return { mode: "absolute", value: 0, target };
  // "Make it 30 percent" on its own is about the volume being talked about.
  const itIs = text.match(/^(?:please\s+)?(?:make|set|put|keep)\s+it\s+(?:to|at|on)?\s*(\d{1,3})\s*(?:%|percent)\s*\.?$/i);
  if (itIs?.[1]) return { mode: "absolute", value: Number(itIs[1]), target };
  if (!hasVolumeWord && !wantsUp && !wantsDown) return null;
  if (NOT_MEDIA.test(text)) return null;

  if (/\b(?:full|max(?:imum)?)\b/i.test(text) && (hasVolumeWord || wantsUp)) {
    return { mode: "absolute", value: 100, target };
  }
  const direction = wantsDown && !wantsUp ? -1 : 1;

  // "by 50%", "down by 50 percent": a share of what it is now.
  // No \b after "%": a percent sign is not a word character, so "by 50%" at
  // the end of a sentence never matched and became fifty POINTS off.
  const byPercent = text.match(/\bby\s+(\d{1,3})\s*(?:%|percent)(?![a-z])/i)
    || text.match(/\b(\d{1,3})\s*(?:%|percent)\s+(?:quieter|louder|lower|higher)\b/i);
  if (byPercent?.[1] && (wantsUp || wantsDown)) {
    return { mode: "percent", value: Number(byPercent[1]), direction, target };
  }
  // "by 20": twenty points.
  const byPoints = text.match(/\bby\s+(\d{1,3})(?![\d%])\b/i);
  if (byPoints?.[1] && (wantsUp || wantsDown)) {
    return { mode: "points", value: Number(byPoints[1]), direction, target };
  }
  // "set the volume to 40", "volume 40%", "make it 40 percent".
  const absolute = text.match(/(?:set|change|put|make|keep)\s+(?:the\s+)?(?:\w+\s+)?(?:volume|vol|sound)\s+(?:to\s+|at\s+)?(\d{1,3})\s*(?:%|percent)?/i)
    || text.match(/\b(?:volume|vol|sound)\s+(?:to\s+|at\s+|on\s+)?(\d{1,3})\s*(?:%|percent)?\b/i)
    || text.match(/\b(\d{1,3})\s*(?:%|percent)?\s+(?:volume|vol)\b/i)
    || text.match(/\b(?:make|set|put)\s+it\s+(?:to|at|on)?\s*(\d{1,3})\s*(?:%|percent)\b/i)
    || (hasVolumeWord && !wantsUp && !wantsDown ? text.match(/\b(\d{1,3})\s*(?:%|percent)\b/i) : null);
  if (absolute?.[1]) return { mode: "absolute", value: Number(absolute[1]), target };

  if (!wantsUp && !wantsDown) return null;
  // "a bit", "a lot", or nothing said: a step people recognise.
  const size = /\b(?:a\s+(?:bit|little|touch|tad)|slightly|a\s+little\s+bit)\b/i.test(text) ? 10
    : /\b(?:a\s+lot|much|way|loads|significantly)\b/i.test(text) ? 30
      : 20;
  return { mode: "points", value: size, direction, target };
}

/* The arithmetic, kept apart from the Mac so it can be checked: always from
   the volume the thing is ACTUALLY at, never from what we last set. */
function applyVolumeCommand(command, currentPercent) {
  const current = Math.max(0, Math.min(100, Math.round(Number(currentPercent) || 0)));
  if (!command) return current;
  const direction = command.direction === -1 ? -1 : 1;
  let next = current;
  if (command.mode === "absolute") next = Number(command.value);
  else if (command.mode === "points") next = current + direction * Number(command.value);
  else if (command.mode === "percent") next = current * (1 + (direction * Number(command.value)) / 100);
  if (!Number.isFinite(next)) return current;
  return Math.max(0, Math.min(100, Math.round(next)));
}

/* A tab title as a person would say it: "(5418) Tame Impala - Loser (Theatre
   Version) |🎧Use Headphones🎧 - YouTube" is "Tame Impala, Loser". */
function speakableMediaTitle(title) {
  const cleaned = String(title || "")
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*[-–|]\s*(?:YouTube|Netflix|Prime Video|Spotify|Twitch|SoundCloud|Vimeo)\s*$/i, "")
    .split("|")[0]
    .replace(/\((?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|visualizer|hd|4k|theatre version|live)\)/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}\s,.'&!?-]/gu, " ")
    .replace(/\s*-\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "")
    .trim();
  return cleaned.length > 60 ? `${cleaned.slice(0, 57).trim()}...` : cleaned;
}

module.exports = {
  speakableMediaTitle,
  parseMediaControlIntent,
  parseNowPlayingIntent,
  parseVolumeCommand,
  applyVolumeCommand,
};
