// AffectiveOS, step 1: capture. What you did on this Mac, written down.
//
// Not Braino's memory: the layer under every surface. It runs whether or not
// you ever talk to him, and Braino, HERA and whatever comes next read from it.
// This file only WRITES the raw day; the hourly digest (step 2) reads it and
// turns it into memory.
//
// Rules this file exists to keep:
//   - text only, never a picture: screenshots are read and deleted upstream
//   - on this Mac only: a JSONL file per day, nothing uploaded from here
//   - private things are never written at all, not written and hidden later
//   - raw days are deleted after RETENTION_DAYS; the digest is what lasts
//   - one switch stops all of it
//
// Pure apart from the file writes, so the rules are testable without Electron.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const RETENTION_DAYS = 7;

/* Never recorded. Apps whose whole content is private, and windows that say
   they are private. Checked against app name, window title and URL. */
const PRIVATE_APPS = /\b(?:1password|bitwarden|lastpass|dashlane|keeper|keychain access|passwords|enpass|nordpass|proton pass|wallet|banking|netbanking)\b/i;
const PRIVATE_WINDOWS = /\b(?:incognito|private browsing|inprivate|private window)\b/i;
const PRIVATE_SITES = /(?:^|\/\/|\.)(?:[a-z0-9-]+\.)*(?:netbanking|onlinesbi|hdfcbank|icicibank|axisbank|kotak|paypal|razorpay\.com\/dashboard|accounts\.google\.com|1password\.com|bitwarden\.com)\b/i;
/* Braino's own windows are not something you did. */
const SELF = /\bBraino Mac\b|vite_react_shadcn_ts/i;

function isPrivate({ app = "", title = "", url = "" } = {}, extraApps = []) {
  const a = String(app), t = String(title), u = String(url);
  if (PRIVATE_APPS.test(a) || PRIVATE_WINDOWS.test(t) || PRIVATE_WINDOWS.test(a) || PRIVATE_SITES.test(u)) return true;
  return extraApps.some((name) => name && a.toLowerCase().includes(String(name).toLowerCase()));
}

function isSelf({ app = "", title = "" } = {}) {
  return SELF.test(`${app} ${title}`);
}

function dayKey(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hashText(text) {
  return crypto.createHash("sha1").update(String(text || "")).digest("hex").slice(0, 16);
}

/* Screen text worth keeping: the lines, de-duplicated, capped. The same menu
   bar and bookmarks strip are on every screenshot and say nothing. */
function tidyScreenLines(lines, { maxLines = 220, maxChars = 9000 } = {}) {
  const seen = new Set();
  const out = [];
  let chars = 0;
  for (const raw of Array.isArray(lines) ? lines : []) {
    const line = String(raw || "").replace(/\s+/g, " ").trim();
    if (line.length < 2 || seen.has(line)) continue;
    seen.add(line);
    if (chars + line.length > maxChars || out.length >= maxLines) break;
    out.push(line);
    chars += line.length;
  }
  return out;
}

function createActivityLog({ dir, now = () => Date.now(), extraPrivateApps = () => [], enabled = () => true } = {}) {
  if (!dir) throw new Error("activity log needs a directory");
  let lastKey = "";
  let lastKeyAt = 0;
  let lastScreenHash = "";

  function file(ms) {
    return path.join(dir, `${dayKey(ms)}.jsonl`);
  }

  /* Returns the written row, or null with the reason it was not written. */
  function record(kind, data = {}) {
    if (!enabled()) return { skipped: "paused" };
    const ms = now();
    const who = { app: data.app, title: data.title, url: data.url };
    if (isSelf(who)) return { skipped: "self" };
    if (isPrivate(who, extraPrivateApps())) return { skipped: "private" };
    // The same thing twice within a minute is one thing.
    const key = `${kind}|${data.app || ""}|${data.title || ""}|${data.url || ""}|${data.hash || ""}`;
    if (key === lastKey && ms - lastKeyAt < 60000) return { skipped: "duplicate" };
    if (kind === "screen") {
      if (data.hash && data.hash === lastScreenHash) return { skipped: "unchanged" };
      lastScreenHash = data.hash || "";
    }
    lastKey = key;
    lastKeyAt = ms;
    const row = { t: new Date(ms).toISOString(), kind, ...data };
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(file(ms), `${JSON.stringify(row)}\n`);
    } catch (error) {
      return { skipped: "write_failed", error: String(error?.message || error) };
    }
    return { row };
  }

  /* Raw days older than the retention window are deleted. */
  function prune(days = RETENTION_DAYS) {
    const cutoff = dayKey(now() - days * 86400000);
    let removed = 0;
    try {
      for (const name of fs.readdirSync(dir)) {
        const m = name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
        if (m && m[1] < cutoff) { fs.unlinkSync(path.join(dir, name)); removed += 1; }
      }
    } catch (_) {}
    return removed;
  }

  function readDay(ms = now()) {
    try {
      return fs.readFileSync(file(ms), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    } catch (_) {
      return [];
    }
  }

  return { record, prune, readDay, file };
}

module.exports = { createActivityLog, isPrivate, isSelf, tidyScreenLines, hashText, dayKey, RETENTION_DAYS };
