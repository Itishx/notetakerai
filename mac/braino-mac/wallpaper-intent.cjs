"use strict";

/* "Change my wallpaper."
 *
 * Its own module, with its own tests, because this one sentence now has four
 * different answers and only one of them used to exist. Asking for nothing in
 * particular gets one of Braino's own, which is the point of having drawn them;
 * naming one of his by name gets that one; naming anything else still searches
 * the web for a picture of it; and asking for the Mac's own pictures still gets
 * those.
 *
 * The looks are passed in rather than read here, so the parser has no idea
 * where they live and the tests can hand it any set they like.
 */

function parseWallpaperIntent(raw, looks = []) {
  const source = String(raw || "")
    .replace(/[\u2018\u2019\u02bc\uff07]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^(?:hey |hi |ok |okay |yo )?(?:braino|breno|brainelle)[,\s]+/i, "")
    .replace(/^(?:please|could you|can you|would you)\s+/i, "")
    .replace(/^(?:please\s+)?/i, "")
    .trim()
    .replace(/[?.!]+\s*$/, "");
  if (!/\b(?:wallpaper|desktop background|background image)\b/i.test(source)) return null;
  if (/^(?:what|which|whats|what'?s)\b/i.test(source)) return null; // a question, not a command
  if (/\b(?:back|previous|restore|undo|old)\b/i.test(source)) return { mode: "restore" };

  // "set my wallpaper to spider man" / "make spider man my wallpaper"
  let subject = source.match(/\bwallpaper\s+to\s+(?:a|an|the\s+)?(.+)$/i)?.[1]
    || source.match(/\bmake\s+(.+?)\s+my\s+(?:wallpaper|desktop background)\b/i)?.[1]
    || source.match(/\bset\s+(.+?)\s+as\s+(?:my\s+)?wallpaper\b/i)?.[1];
  subject = subject ? subject.replace(/^(?:a|an|the)\s+/i, "").trim() : "";

  /* Naming one of his own beats searching the web for a picture of a word that
     happens to be a colour. */
  const named = subject
    ? (looks || []).find((look) => new RegExp(`^(?:braino\\s*os\\s+)?${look.name}(?:\\s+wallpaper)?$`, "i").test(subject))
    : null;
  if (named) return { mode: "braino", look: named.id };
  if (subject && /^(?:braino|braino ?os|yours|your own|one of yours)$/i.test(subject)) return { mode: "braino" };
  if (subject) return { mode: "web", subject };

  /* Asking for the built-in Mac pictures still gets them; asking for nothing in
     particular now gets one of his, because that is the point of drawing them. */
  if (/\b(?:mac|macos|apple|built[- ]?in|system|official|stock)\b/i.test(source)) return { mode: "random" };
  return { mode: "braino" };
}

module.exports = { parseWallpaperIntent };
