"use strict";
/* Import your Chrome logins into Braino's own browser (2026-10-23).
 *
 * Braino's browser starts signed out of everything. This copies the cookies
 * from your Chrome profile into it, so it is signed in wherever you are, the
 * way Claude Cowork does it. Nothing leaves the Mac and Chrome is not touched:
 * the cookie file is copied to a temp folder, read, and the copy deleted.
 *
 * Chrome locks cookie values with a key kept in the macOS Keychain ("Chrome
 * Safe Storage"). Reading it makes macOS ask you once; "Always Allow" makes
 * the next re-sync silent. Passwords are not imported. */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const CHROME_DIR = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
const CHROME_EPOCH_OFFSET_S = 11644473600; // 1601 to 1970

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 256 * 1024 * 1024, timeout: opts.timeout || 60000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(String(stdout || ""));
    });
  });
}

/* The profile you last used in Chrome, unless one is named. */
function chromeProfile(name) {
  if (name) return name;
  try {
    const state = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, "Local State"), "utf8"));
    if (state?.profile?.last_used) return state.profile.last_used;
  } catch (_) {}
  return "Default";
}

function cookieFile(profile) {
  for (const rel of [["Network", "Cookies"], ["Cookies"]]) {
    const p = path.join(CHROME_DIR, profile, ...rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* macOS shows its own password prompt here. */
async function keychainKey() {
  const pass = (await run("security", ["find-generic-password", "-w", "-s", "Chrome Safe Storage"], { timeout: 120000 })).trim();
  if (!pass) throw new Error("no_key");
  return crypto.pbkdf2Sync(pass, "saltysalt", 1003, 16, "sha1");
}

function decrypt(buf, key, stripHostHash) {
  if (!buf || buf.length < 3) return "";
  const tag = buf.subarray(0, 3).toString("latin1");
  if (tag !== "v10" && tag !== "v11") return buf.toString("utf8");
  const d = crypto.createDecipheriv("aes-128-cbc", key, Buffer.alloc(16, 0x20));
  let out = Buffer.concat([d.update(buf.subarray(3)), d.final()]);
  // Newer Chrome puts a 32-byte hash of the site in front of the value.
  if (stripHostHash && out.length >= 32) out = out.subarray(32);
  return out.toString("utf8");
}

const SAME_SITE = { "-1": "unspecified", 0: "no_restriction", 1: "lax", 2: "strict" };

/* Reads Chrome's cookies into the given Electron session.
   Returns { ok, imported, skipped, sites, profile } or { ok:false, reason }. */
async function importChromeCookies(targetSession, { profile: wanted, log = () => {} } = {}) {
  const started = Date.now();
  const profile = chromeProfile(wanted);
  const src = cookieFile(profile);
  if (!src) return { ok: false, reason: "no_chrome", profile };

  let key;
  try { key = await keychainKey(); }
  catch (_) { return { ok: false, reason: "keychain_denied", profile }; }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "braino-cookies-"));
  const copy = path.join(tmp, "Cookies");
  try {
    fs.copyFileSync(src, copy);
    for (const ext of ["-wal", "-shm"]) if (fs.existsSync(src + ext)) fs.copyFileSync(src + ext, copy + ext);

    let version = 0;
    try { version = Number((await run("sqlite3", [copy, "SELECT value FROM meta WHERE key='version';"])).trim()) || 0; } catch (_) {}
    const raw = await run("sqlite3", ["-json", copy,
      "SELECT host_key, name, path, is_secure, is_httponly, samesite, is_persistent, expires_utc, hex(encrypted_value) AS ev, value FROM cookies;"]);
    const rows = raw.trim() ? JSON.parse(raw) : [];
    const nowS = Date.now() / 1000;
    const sites = new Set();
    let imported = 0, skipped = 0;

    for (const r of rows) {
      try {
        const value = r.ev ? decrypt(Buffer.from(r.ev, "hex"), key, version >= 24) : String(r.value || "");
        const host = String(r.host_key || "");
        const secure = Boolean(Number(r.is_secure));
        const expires = Number(r.expires_utc) > 0 ? Number(r.expires_utc) / 1e6 - CHROME_EPOCH_OFFSET_S : 0;
        if (expires && expires < nowS) { skipped++; continue; }
        const cookie = {
          url: `${secure ? "https" : "http"}://${host.replace(/^\./, "")}${r.path || "/"}`,
          name: r.name, value, path: r.path || "/",
          secure, httpOnly: Boolean(Number(r.is_httponly)),
          sameSite: SAME_SITE[String(r.samesite)] || "unspecified",
        };
        if (host.startsWith(".")) cookie.domain = host;
        if (cookie.sameSite === "no_restriction" && !secure) cookie.sameSite = "unspecified";
        if (expires && Number(r.is_persistent)) cookie.expirationDate = expires;
        await targetSession.cookies.set(cookie);
        imported++;
        sites.add(host.replace(/^\./, "").split(".").slice(-2).join("."));
      } catch (_) { skipped++; }
    }
    try { await targetSession.cookies.flushStore(); } catch (_) {}
    const result = { ok: true, imported, skipped, sites: sites.size, profile, ms: Date.now() - started };
    log("own_browser.cookie_import", result);
    return result;
  } catch (error) {
    log("own_browser.cookie_import_failed", { error: String(error?.message || error).slice(0, 200) });
    return { ok: false, reason: "read_failed", profile };
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  }
}

/* Forget everything his browser is signed in to. */
async function clearOwnCookies(targetSession) {
  await targetSession.clearStorageData({ storages: ["cookies"] });
  try { await targetSession.cookies.flushStore(); } catch (_) {}
  return { ok: true };
}

module.exports = { importChromeCookies, clearOwnCookies, chromeProfile };
