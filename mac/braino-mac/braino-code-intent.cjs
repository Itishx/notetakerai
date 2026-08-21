"use strict";

// Braino Code, heard out loud.
//
// Two things to recognise, and they are not the same thing:
//
//   build   "build me a website like Perfios for a cybersecurity firm"
//   change  "make the background red"
//
// A change only means anything while a site is already on screen, so the caller
// passes hasActiveBuild and we only look for changes when there is something to
// change. Without that guard "make it red" would be claimed here no matter what
// Braino happened to be doing, which is how an intent parser starts eating
// commands that belong to somebody else.
//
// Speech recognition mangles the wake word constantly (Braino, Breno, Bruno,
// Brainer), so it is stripped the same way every other intent module here does.

const WAKE = /^\s*(?:braino|breno|bruno|braido|brainer|brano)[\s,]+/i;

// "a website", "me a site", "us a landing page", "a web page"
const THING = "(?:a |an |me a |me an |us a |us an |my )?(?:new )?(?:website|web site|web page|webpage|site|landing page|page)";

const BUILD_PATTERNS = [
  new RegExp(`\\b(?:build|make|create|design|whip up|put together|knock up|spin up)\\s+${THING}\\b`, "i"),
  new RegExp(`\\bcan you (?:build|make|create|design)\\s+${THING}\\b`, "i"),
  new RegExp(`\\bi (?:want|need)\\s+${THING}\\b`, "i"),
  new RegExp(`\\bbuild\\s+${THING}\\b`, "i"),
];

// Deliberately narrow. These are the shapes people actually use on a site that
// is already in front of them, and each one names a thing on the page. A bare
// "change it" is not here on purpose: it is too easy to say about anything.
const CHANGE_PATTERNS = [
  /\b(?:make|turn|change|set)\s+(?:the\s+)?(?:background|bg|header|footer|hero|nav|text|font|type|button|accent|colou?r|logo|heading|title|link|card)\b/i,
  /\bchange\s+(?:the\s+)?(?:background|colou?r|font|type|copy|wording|text|headline|title)\b/i,
  /\b(?:make|turn)\s+it\s+(?:more\s+)?(?:red|blue|green|black|white|dark|darker|light|lighter|bigger|smaller|bolder|warmer|cooler|quieter|louder)\b/i,
  /\b(?:add|remove|delete|drop)\s+(?:a\s+|the\s+|an\s+)?(?:section|footer|header|nav|button|form|testimonials?|pricing|faq|contact|team)\b/i,
  /\b(?:rewrite|reword|shorten|lengthen)\s+(?:the\s+)?(?:copy|text|headline|hero|intro|wording)\b/i,
  /\bswap\s+(?:the\s+)?(?:colou?rs?|fonts?|palette)\b/i,
];

// Said about the site as a whole rather than about the page: not our command.
const NOT_OURS = [
  /\bopen\b/i,
  /\bdeploy\b/i,
  /\bpublish\b/i,
  /\bsearch\b/i,
  /\bgoogle\b/i,
];

function strip(raw) {
  return String(raw || "")
    .replace(WAKE, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

/** The brief is the whole sentence, not a slice of it.
 *
 *  An earlier version cut everything before "website" and passed the remainder
 *  along, which threw away "for a cybersecurity firm doing A to Z from
 *  analysing to distribution" — the entire useful part. The design stage wants
 *  every word the person said; it is better at reading intent than a regex is
 *  at guessing which half mattered. Only the wake word goes. */
function parseBrainoCodeIntent(raw, { hasActiveBuild = false } = {}) {
  const text = strip(raw);
  if (!text || text.length < 8) return null;
  if (NOT_OURS.some((pattern) => pattern.test(text))) return null;

  if (BUILD_PATTERNS.some((pattern) => pattern.test(text))) {
    return { action: "build", brief: text };
  }

  if (hasActiveBuild && CHANGE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { action: "change", brief: text };
  }

  return null;
}

module.exports = { parseBrainoCodeIntent };
