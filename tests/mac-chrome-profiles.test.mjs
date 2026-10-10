import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const cp = require("../mac/braino-mac/chrome-profiles.cjs");
const state = { profile: { last_used: "Profile 3", info_cache: {
  Default: { name: "Itish", user_name: "itishpande21@gmail.com" },
  "Profile 1": { name: "Itish", user_name: "writix.in@gmail.com" },
  "Profile 2": { name: "Braino", user_name: "talk2braino@gmail.com" },
  "Profile 3": { name: "forge27.mesaschool.co", user_name: "itish_pande@forge27.mesaschool.co" } } } };
const ps = cp.listProfiles(state);

test("reads every profile Chrome has, and finds the one you mean", () => {
  assert.equal(ps.length, 4);
  assert.equal(cp.findProfile(ps, "my Mesa profile").dir, "Profile 3");
  assert.equal(cp.findProfile(ps, "Braino").dir, "Profile 2");
  assert.equal(cp.findProfile(ps, "writix").dir, "Profile 1");
  assert.equal(cp.findProfile(ps, "Itish").dir, "Default");
});

test("what you say about profiles", () => {
  assert.deepEqual(cp.parseProfileIntent("use my Mesa profile for Nexus and Mesa"), { action: "rule", profile: "Mesa", words: ["nexus", "mesa"] });
  assert.deepEqual(cp.parseProfileIntent("switch to my Braino profile"), { action: "switch", profile: "Braino" });
  assert.deepEqual(cp.parseProfileIntent("You are in the wrong Chrome profile, Braino. Can you please switch to the correct Chrome profile, which is my Itish Chrome profile?"), { action: "switch", profile: "Itish" });
  assert.deepEqual(cp.parseProfileIntent("my main profile is Itish"), { action: "primary", profile: "Itish" });
  assert.equal(cp.parseProfileIntent("which chrome profiles do I have").action, "list");
  assert.equal(cp.parseProfileIntent("open youtube"), null);
});

test("a link opens in the profile it belongs to", () => {
  const config = { primary: "Default", rules: [{ dir: "Profile 3", words: ["nexus", "mesaschool"] }] };
  assert.equal(cp.profileForUrl(config, "https://nexus.mesaschool.co/attendance"), "Profile 3");
  assert.equal(cp.profileForUrl(config, "https://youtube.com"), "");
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /const profileDir = chromeProfiles\.profileForUrl\(readChromeProfileConfig\(\), url\);/);
  assert.match(main, /`--profile-directory=\$\{dir\}`/);
});
