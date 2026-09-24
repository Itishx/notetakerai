import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* AffectiveOS steps 2 and 3. The 2am movie-site question is the test case. */
const require = createRequire(import.meta.url);
const { compactHour, recallCandidates, claudeLinesInWindow } = require("../mac/braino-mac/memory-digest.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");

const night = Date.parse("2026-09-24T01:00:00+05:30");
const at = (min) => new Date(night + min * 60000).toISOString();
const rows = [
  { t: at(5), kind: "focus", app: "Google Chrome", title: "Netflix", url: "https://www.netflix.com/browse" },
  { t: at(34), kind: "focus", app: "Google Chrome", title: "Oppenheimer 2023 1080p | 1337x", url: "https://1337x.to/torrent/123/oppenheimer" },
  { t: at(35), kind: "screen", app: "Google Chrome", title: "Oppenheimer 2023 1080p | 1337x", url: "https://1337x.to/torrent/123/oppenheimer", lines: ["1337x", "Oppenheimer (2023) 1080p WEBRip", "Download"] },
  { t: at(62), kind: "focus", app: "Cursor", title: "main.cjs — notetakerai", url: "" },
  { t: at(70), kind: "conversation", channel: "voice", you: "play something chill", braino: "Playing it now." },
];

test("recall sees both movie sites at night, each once, with its address", () => {
  const c = recallCandidates(rows, { from: night, to: night + 2 * 3600000 });
  const sites = c.map((x) => x.site);
  assert.ok(sites.includes("netflix.com"));
  assert.ok(sites.includes("1337x.to"));
  const torrent = c.find((x) => x.site === "1337x.to");
  assert.match(torrent.url, /^https:\/\/1337x\.to\//);
  assert.match(torrent.line, /Oppenheimer/);
  assert.equal(c.filter((x) => x.site === "1337x.to").length, 1, "focus and screen of one page are one candidate");
});

test("an hour becomes compact text with the names kept", () => {
  const { text, rows: n } = compactHour(rows, { start: night, end: night + 3600000 });
  assert.equal(n, 3);
  assert.match(text, /IN FRONT/);
  assert.match(text, /1337x\.to/);
  assert.match(text, /ON SCREEN[\s\S]*Oppenheimer/);
});

test("Claude conversation lines are read for the hour only", () => {
  const jsonl = [
    JSON.stringify({ type: "user", timestamp: at(10), message: { content: "make HIL go first" } }),
    JSON.stringify({ type: "assistant", timestamp: at(12), message: { content: [{ type: "text", text: "Building it." }] } }),
    JSON.stringify({ type: "user", timestamp: at(130), message: { content: "later thing" } }),
  ].join("\n");
  const lines = claudeLinesInWindow(jsonl, { start: night, end: night + 3600000 });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /You: make HIL go first/);
});

test("recall is on by default, has a switch, and can act", () => {
  assert.match(main, /function recallEnabled\(\) \{ return activityState\(\)\.recall !== false; \}/);
  assert.match(main, /memory_search: \(a\) => searchMemory\(/);
  assert.match(main, /MEMORY MATCHES \(act on these: one clear match means do what they asked and say which; several means ask which\)/);
  assert.match(catalog, /name: "memory_search", params: \["query", "from", "to"\]/);
  // .detail reaches the loop, never the voice.
  assert.match(main, /out && typeof out\.detail === "string" \? out\.detail\.trim\(\) : ""/);
});

test("digest runs every completed hour and keeps summaries for good", () => {
  assert.match(main, /setInterval\(\(\) => void digestDueHours\(\), DIGEST_CHECK_MS\)/);
  assert.match(main, /const DIGEST_DIR = path\.join\(AUTH_STORE_DIR, "digests"\);/);
});
