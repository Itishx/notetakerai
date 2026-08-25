"use strict";

/* What never reaches a log line.
 *
 * Braino hears everything you say and writes a readable account of it to the
 * terminal and to a file you can paste anywhere. That account is the best
 * debugging tool in this app and it is also the fastest way to put something
 * private on a screen behind you.
 *
 * Two kinds of thing get taken out on the way to a log, and only on the way to
 * a log: the model still receives every word, because it has to act on it.
 *
 *   1. Hidden modes. "mode 18" and friends are private by construction.
 *   2. Anything explicit. This is a privacy filter and not a moral one, so the
 *      list is short and only holds words that cannot turn up in ordinary work.
 *      The whole line goes rather than the matched word, because a sentence
 *      with one word starred out still says what it said.
 *
 * Mishearings count too, and are half the reason this exists: "show me my
 * commands" came back as something else entirely, and it was the transcript,
 * not the person, that put it on screen.
 */

const PERSONAL_MODE_RE = /\bmode\s*\d+\b/gi;

/* Deliberately narrow. "sexy" is missing on purpose: people say it about a
   landing page. */
const PRIVATE_TOPIC_RE = new RegExp(
  "\\b(?:"
  + "porn\\w*|pornhub|onlyfans|nsfw|xvideos|xhamster|redtube|hentai|camgirl|camgirls"
  + "|nude|nudes|naked|topless|lingerie"
  + "|sex|sexual|sexting|sext|threesome|orgasm\\w*|masturbat\\w*|blowjob|handjob"
  + "|erotic|erotica|bdsm|fetish|kink|horny|boobs|tits|dick\\s*pic|genital\\w*"
  + "|escort\\s*service|hookup|hookups"
  + ")\\b",
  "i",
);

const PRIVATE_MARK = "[private]";

function mentionsPrivateTopic(text) {
  return PRIVATE_TOPIC_RE.test(String(text || ""));
}

/* One line in, one line out. A log still shows that a turn happened, how long
   it took and whether it worked; it just does not repeat what was said. */
function scrubForLog(text) {
  const value = String(text == null ? "" : text);
  if (!value) return value;
  if (mentionsPrivateTopic(value)) return PRIVATE_MARK;
  /* The word keeps its own case and spacing; only the number goes. */
  return value.replace(PERSONAL_MODE_RE, (match) => match.replace(/\d+/, "[redacted]"));
}

module.exports = { scrubForLog, mentionsPrivateTopic, PRIVATE_MARK, PERSONAL_MODE_RE, PRIVATE_TOPIC_RE };
