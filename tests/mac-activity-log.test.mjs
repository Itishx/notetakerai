import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

/* AffectiveOS step 1: capture. Text only, local only, private never written,
   raw days gone after a week, one switch stops it. */
const require = createRequire(import.meta.url);
const { createActivityLog, isPrivate, tidyScreenLines, hashText } = require("../mac/braino-mac/activity-log.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

function fresh(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "activity-"));
  let t = Date.parse("2026-09-24T10:00:00Z");
  const log = createActivityLog({ dir, now: () => t, ...opts });
  return { dir, log, tick: (ms) => { t += ms; } };
}

test("private things are never written", () => {
  assert.equal(isPrivate({ app: "1Password 8" }), true);
  assert.equal(isPrivate({ app: "Google Chrome", title: "New Incognito Tab" }), true);
  assert.equal(isPrivate({ app: "Google Chrome", url: "https://netbanking.hdfcbank.com/login" }), true);
  assert.equal(isPrivate({ app: "Cursor", title: "main.cjs — notetakerai" }), false);
  const { log } = fresh();
  assert.equal(log.record("focus", { app: "Bitwarden" }).skipped, "private");
  assert.equal(log.record("focus", { app: "Braino Mac" }).skipped, "self");
  assert.equal(log.record("focus", { app: "Signal" }, ).row?.kind, "focus");
  const withExtra = fresh({ extraPrivateApps: () => ["Signal"] }).log;
  assert.equal(withExtra.record("focus", { app: "Signal" }).skipped, "private");
});

test("the same screen twice is one row, and pause writes nothing", () => {
  let on = true;
  const { log, tick } = fresh({ enabled: () => on });
  const lines = tidyScreenLines(["Your Jev API", "Your Jev API", "Top up", " "]);
  assert.deepEqual(lines, ["Your Jev API", "Top up"]);
  assert.ok(log.record("screen", { app: "Chrome", hash: hashText(lines.join("\n")), lines }).row);
  tick(120000);
  assert.equal(log.record("screen", { app: "Chrome", hash: hashText(lines.join("\n")), lines }).skipped, "unchanged");
  on = false;
  assert.equal(log.record("focus", { app: "Cursor" }).skipped, "paused");
});

test("raw days older than a week are deleted", () => {
  const { dir, log } = fresh();
  writeFileSync(join(dir, "2026-09-10.jsonl"), "{}\n");
  writeFileSync(join(dir, "2026-09-20.jsonl"), "{}\n");
  assert.equal(log.prune(), 1);
  assert.deepEqual(readdirSync(dir).sort(), ["2026-09-20.jsonl"]);
});

test("everything said to Braino, any channel, reaches the layer", () => {
  assert.match(main, /activityLog\.record\("conversation", \{\n\s+channel: String\(event\?\.kind \|\| "voice"\)/);
  assert.match(main, /startActivityCapture\(\);/);
  // A private window is never even screenshotted.
  assert.match(main, /Checked BEFORE the screenshot: a private window is never captured at all\./);
});

test("its own window, separate from Braino's dashboard", () => {
  assert.match(main, /title: "AffectiveOS Memory"/);
  assert.match(main, /ipcMain\.handle\("braino-mac:activity-day"/);
});
