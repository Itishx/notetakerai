// Shortcuts that grabbed whole sentences on one word, from the 2026-10-03 run:
// "open the localhost link in a new tab" → "Chrome has no tabs open";
// "open LinkedIn and search for Saurabh Jha from Messa Skola Business's
// profile" → opened the Mesa Chrome profile and said "Done";
// "Lemme check the local weather. Just a moment." → nothing ever ran.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tabs = require("../mac/braino-mac/tab-switch.cjs");
const profiles = require("../mac/braino-mac/chrome-profiles.cjs");
const dev = require("../mac/braino-mac/dev-servers.cjs");
const { macPromisesAction } = require("../mac/braino-mac/hil-verify.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("opening something in a new tab is not switching tabs", () => {
  assert.equal(tabs.parseTabSwitch("Braino, can you please open the localhost link in a new tab?"), null);
  assert.equal(tabs.parseTabSwitch("open YouTube in a new tab"), null);
  assert.equal(tabs.parseTabSwitch("switch to the Claude tab").query, "claude");
  assert.equal(tabs.parseTabSwitch("go to the Pinterest tab").query, "pinterest");
});

test("a tab list that could not be read is never reported as no tabs", () => {
  assert.match(main, /if \(tabAsk\.saidTab && listed\)/);
});

test("a profile is a short name, not a sentence that ends in profile", () => {
  assert.equal(profiles.parseProfileIntent("Braino, can you please open LinkedIn and search for Saurabh Jha from Messa Skola Business's profile?"), null);
  assert.deepEqual(profiles.parseProfileIntent("switch to my work profile"), { action: "switch", profile: "work" });
  assert.deepEqual(profiles.parseProfileIntent("open the Mesa profile"), { action: "switch", profile: "Mesa" });
  assert.equal(profiles.parseProfileIntent("use my Mesa profile for Nexus").profile, "Mesa");
});

test("he says the promise the way people do, and it still gets done", () => {
  for (const t of ["Lemme check the local weather for you. Just a moment.", "One sec, checking.", "Hang on, pulling that up.", "Okay, one sec."]) assert.equal(macPromisesAction(t), true, t);
  for (const t of ["You have one second left on the timer.", "It is 28 degrees in Bengaluru.", "I opened it."]) assert.equal(macPromisesAction(t), false, t);
});

const LSOF = ["p24197", "cnode", "n*:8080", "p73627", "cnode", "n*:3000", "p36049", "cpython3.1", "n127.0.0.1:47831", "p650", "cControlCe", "n*:5000", "p69400", "cnode", "n*:4719"].join("\n");
const DETAILS = {
  24197: { cwd: "/Users/me/Desktop/notely/notetakerai", cmd: "node /Users/me/Desktop/notely/notetakerai/node_modules/.bin/vite" },
  73627: { cwd: "/Users/me/Desktop/meltique/meltique", cmd: "next-server (v16.3.4)" },
  36049: { cwd: "/Users/me/Desktop/notely/notetakerai", cmd: "/Users/me/.braino-laya/bin/python laya-serve.py" },
  69400: { cwd: "/private/tmp/scratch/ship", cmd: "node vite preview" },
};
const SELF = { ports: [47831], root: "/Users/me/Desktop/notely/notetakerai", rootLabel: "the Affective site" };

test("he knows which dev servers are running, and for which project", () => {
  const servers = dev.devServersFrom(dev.parseListeners(LSOF), DETAILS, SELF);
  assert.deepEqual(servers.map((s) => [s.port, s.project, s.framework]), [[3000, "meltique", "Next.js"], [8080, "the Affective site", "Vite"]]);
  assert.equal(dev.describeDevServers(servers), "Local dev servers running on this Mac: http://localhost:3000 (Next.js, meltique); http://localhost:8080 (Vite, the Affective site).");
});

test("the localhost link is the one you were working in, or he asks", () => {
  const servers = dev.devServersFrom(dev.parseListeners(LSOF), DETAILS, SELF);
  assert.equal(dev.pickDevServer(servers, "open the localhost link in a new tab", ["http://localhost:8080/braino"]).server.port, 8080);
  assert.equal(dev.pickDevServer(servers, "open localhost 3000", []).server.port, 3000);
  assert.equal(dev.pickDevServer(servers, "open the meltique dev server", []).server.port, 3000);
  assert.equal(dev.pickDevServer(servers, "open the localhost link", []).choose.length, 2);
  assert.ok(main.indexOf("devServers.asksForLocalhost(raw)") < main.indexOf("const tabAsk = tabSwitch.parseTabSwitch(raw)"), "localhost runs before the tab shortcut");
});
