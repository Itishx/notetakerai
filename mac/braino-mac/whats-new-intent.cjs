"use strict";

// The newest demoable entry in Braino's changelog. Keeping the narration and
// action together makes "what's new?" predictable instead of model-dependent.
const LATEST_DEMO = Object.freeze({
  slug: "music-segment-loops",
  title: "Music Segment Loops",
  script: "You know what, let me just walk you through it. Here's what I can do. You ready? Watch. Let's say we want to loop FE!N from one twenty-six to one thirty-two. Just that part, again and again. Even Spotify didn't think of this, bro. Let's play that on loop, shall we?",
  action: "demo-latest-feature",
});

function parseWhatsNewIntent(raw) {
  const text = String(raw || "")
    .toLowerCase()
    .replace(/^\s*(?:braino|breno|braido)[\s,]+/, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  if (!text) return null;

  const matches = [
    /\bwhat(?:'s| is) new with you(?: lately)?\b/,
    /\bwhat(?:'s| is) new(?: lately)?\b/,
    /\bwhat (?:else|new) can you do\b/,
    /\b(?:can|could|would) you (?:please )?tell me what (?:else|new) (?:you can do|can you do)\b/,
    /\bwhat is the latest (?:thing|feature|skill|change)(?: that)? you (?:learned|learnt|made|built|got)\b/,
    /\bwhat(?:'s| is) the latest (?:thing|feature|skill|change) (?:you(?:'ve| have) )?(?:learned|learnt|made|built|got)\b/,
    /\bwhat have you (?:learned|learnt|built) lately\b/,
  ].some((pattern) => pattern.test(text));

  return matches ? { ...LATEST_DEMO } : null;
}

module.exports = { LATEST_DEMO, parseWhatsNewIntent };
