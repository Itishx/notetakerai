import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseMusicSegmentIntent, parseMusicSegmentRange } = require("../mac/braino-mac/music-segment-intent.cjs");

assert.deepEqual(
  parseMusicSegmentIntent("braino play brabus on loop from 2:20 to 2:27"),
  {
    valid: true, reason: null, song: "brabus", provider: "spotify", useCurrent: false,
    startSeconds: 140, endSeconds: 147, durationSeconds: 7,
    interpretedRange: "2:20 to 2:27",
  },
);
assert.equal(parseMusicSegmentIntent("play Brabus"), null, "ordinary play remains ordinary");
assert.equal(parseMusicSegmentIntent("play Brabus on loop from two twenty to two twenty seven").startSeconds, 140);
assert.equal(parseMusicSegmentIntent("play Brabus on loop from 2 20 until 2 27 on Apple Music").provider, "apple_music");
assert.equal(parseMusicSegmentIntent("play Brabus on loop from 2:27 to 2:20").reason, "invalid_range");
assert.equal(parseMusicSegmentIntent("play Brabus on loop").reason, "missing_range");
assert.deepEqual(
  parseMusicSegmentIntent("Breno, can you please loop this song from 2:10 to 2:20"),
  {
    valid: true, reason: null, song: "", provider: "current", useCurrent: true,
    startSeconds: 130, endSeconds: 140, durationSeconds: 10,
    interpretedRange: "2:10 to 2:20",
  },
);
assert.equal(parseMusicSegmentIntent("Braino can you please loop this song from 126 to 130").startSeconds, 86);
assert.equal(parseMusicSegmentIntent("Braino can you please loop this song from 126 to 130").endSeconds, 90);
assert.equal(parseMusicSegmentIntent("Braino loop this song from 226 to 227").startSeconds, 146);
assert.equal(parseMusicSegmentIntent("Braino loop this song from 226 to 227").endSeconds, 147);
assert.deepEqual(
  parseMusicSegmentIntent("Braido, can you please loop this song?"),
  {
    valid: false, reason: "missing_range", song: "", provider: "current",
    useCurrent: true, raw: "Braido, can you please loop this song?",
  },
);
assert.equal(parseMusicSegmentRange("from 126 to 130").startSeconds, 86);
assert.equal(parseMusicSegmentRange("from 126 to 130").endSeconds, 90);
assert.equal(parseMusicSegmentRange("from 1 minute 26 seconds to 1 minute 30 seconds").startSeconds, 86);
assert.equal(parseMusicSegmentRange("from 86 seconds to 90 seconds").endSeconds, 90);

console.log("ok  music segment intent, transcript recovery, providers, and validation");
