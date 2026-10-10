import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-09-27, from a real run: "which song is playing on Spotify?" was right
   in a second, then "Can you please open this song on YouTube for me?" went
   to file search for "this on YouTube me". The song counted as a file word,
   YouTube had no "open", and "this song" meant nothing. */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const lift = (start) => {
  const at = main.indexOf(start); assert.ok(at >= 0, start);
  return main.slice(at, main.indexOf("\n}\n", at) + 3);
};
const src = [
  lift("function cleanPrompt(input) {"),
  lift("function resolveSongReference(query, nowPlaying = lastNowPlaying) {"),
  lift("function parseYouTubeIntent(raw) {"),
].join("\n");
const load = (nowPlaying) => new Function("lastNowPlaying", `${src}; return { parseYouTubeIntent, resolveSongReference };`)(nowPlaying);
const playing = { track: "Do Din Ki Zindagi", artist: "Kabir Cafe", playing: true };

test("the exact sentence from the run opens the playing song on YouTube", () => {
  const { parseYouTubeIntent } = load(playing);
  assert.deepEqual(parseYouTubeIntent("Can you please open this song on YouTube for me?"), { action: "play", query: "Do Din Ki Zindagi Kabir Cafe" });
});

test("search this song on yt, and the other ways people say it", () => {
  const { parseYouTubeIntent } = load(playing);
  assert.deepEqual(parseYouTubeIntent("search this song on yt"), { action: "search", query: "Do Din Ki Zindagi Kabir Cafe" });
  assert.deepEqual(parseYouTubeIntent("play that song on YouTube"), { action: "play", query: "Do Din Ki Zindagi Kabir Cafe" });
  assert.deepEqual(parseYouTubeIntent("pull it up on YouTube"), { action: "play", query: "Do Din Ki Zindagi Kabir Cafe" });
  assert.deepEqual(parseYouTubeIntent("find the lyrics of this song on YouTube"), { action: "search", query: "the lyrics of Do Din Ki Zindagi Kabir Cafe" });
});

test("named songs are left alone, and nothing playing leaves the words as they were", () => {
  assert.deepEqual(load(playing).parseYouTubeIntent("play Blinding Lights on YouTube"), { action: "play", query: "Blinding Lights" });
  assert.deepEqual(load(null).parseYouTubeIntent("open this song on YouTube"), { action: "play", query: "this song" });
  assert.equal(load(playing).parseYouTubeIntent("which song is playing on Spotify"), null);
});

test("file search stands aside when a website is named", () => {
  const fn = lift("function parseFileIntent(raw) {");
  assert.match(fn, /\(\?:on\|in\|at\)\\s\+\(\?:you\\s\*tube\|yt\|spotify/);
  // ...and YouTube is still asked before files, so it gets there first.
  assert.ok(main.indexOf("const youtubeIntent = parseYouTubeIntent(raw);") < main.indexOf("const fileIntent = parseFileIntent(raw);"));
});
