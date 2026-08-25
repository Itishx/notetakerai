"use strict";

/* "Put your screen up."
 *
 * The idle screen is the face Braino puts on the Mac when you are not using it:
 * the clock, the date, and the handful of things you reach for. It comes up on
 * its own after a while, and it comes up when you ask.
 *
 * Its own module, with its own tests, for the same reason Braino OS has one: a
 * phrase that takes the whole screen has to be certain. And it has to stay well
 * clear of the other feature in this app that owns the word "wallpaper" —
 * setting the actual macOS desktop background — so nothing here matches a bare
 * "wallpaper" on its own.
 */

/* What the thing is called. People call it three or four things and mean the
   same screen every time. */
const SCREEN = /\b(?:idle screen|lock screen|screen ?saver|standby screen|resting screen)\b/;

/* Enough of an ask to justify taking the display. */
const SHOW = [
  /\bshow\b/,
  /\bput up\b/,
  /\bbring up\b/,
  /\bopen\b/,
  /\bgo to\b/,
  /\bstart\b/,
  /\blet me see\b/,
  /\bcan i see\b/,
  /\bi want\b/,
];

const HIDE = [
  /\bclose\b/,
  /\bhide\b/,
  /\bdismiss\b/,
  /\bget rid of\b/,
  /\btake .* (?:down|away|off)\b/,
  /\bput .* away\b/,
  /\bwake up\b/,
  /\bgo away\b/,
  /\bexit\b/,
  /\bleave\b/,
];

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseIdleScreenIntent(text) {
  const source = normalize(text);
  if (!source) return null;
  if (!SCREEN.test(source)) return null;

  /* Order matters: "close the idle screen" contains no show verb, but "show me
     the idle screen and then close it" is not a thing anyone says. */
  if (HIDE.some((pattern) => pattern.test(source))) {
    return { action: "close", say: "Back to it." };
  }

  /* A bare naming of the screen is an ask. Nobody says "screen saver" in the
     middle of a sentence to Braino and means nothing by it. */
  const bare = /^(?:braino[,\s]+)?(?:the |your |my )?(?:idle screen|lock screen|screen ?saver|standby screen|resting screen)$/.test(source);
  if (bare || SHOW.some((pattern) => pattern.test(source))) {
    return { action: "open", say: "Here." };
  }
  return null;
}

module.exports = { parseIdleScreenIntent };
