import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseWhatsNewIntent } = require("../mac/braino-mac/whats-new-intent.cjs");

for (const phrase of [
  "Braino, what's new with you?",
  "Braino, can you tell me what else can you do?",
  "Braido, what is the latest thing that you learned?",
  "Braino, what's new with you lately?",
  "Braino, what is the latest change that you made?",
]) {
  const intent = parseWhatsNewIntent(phrase);
  assert.equal(intent?.slug, "music-segment-loops", phrase);
  assert.equal(intent?.action, "demo-latest-feature", phrase);
}

assert.equal(parseWhatsNewIntent("Braino, play FE!N"), null);
console.log("ok  deterministic what's-new intent variants and latest demo");
