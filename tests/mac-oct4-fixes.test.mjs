// The four bugs from the 4 Oct test run of decider stage 2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const profiles = require("../mac/braino-mac/chrome-profiles.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("a plain profile switch stays instant at stage 1, and 'work' finds the company profile", () => {
  assert.match(main, /deciderStage\(\) >= 1 && profileParsed && !\["switch", "list"\]\.includes\(profileParsed\.action\) \? null : profileParsed/);
  const list = [
    { dir: "Default", name: "Itish", email: "itishpande21@gmail.com" },
    { dir: "Profile 2", name: "Braino", email: "talk2braino@gmail.com" },
    { dir: "Profile 3", name: "forge27.mesaschool.co", email: "itish_pande@forge27.mesaschool.co" },
  ];
  assert.equal(profiles.findProfile(list, "work")?.dir, "Profile 3");
  assert.equal(profiles.findProfile(list, "braino")?.dir, "Profile 2");
});

test("the answer window starts at the latest question", () => {
  const fn = main.slice(main.indexOf("function setPendingMacWorkflow"), main.indexOf("function clearPendingMacWorkflow"));
  assert.doesNotMatch(fn, /createdAt = hilAskChain\.firstAt/);
});

test("typing with no box named goes into the selected box", () => {
  assert.match(main, /if \(type === "type" && \(action\.index === undefined \|\| action\.index === null \|\| action\.index === ""\)\)/);
  assert.match(main, /kind: "type_focused"/);
});

test("stop the recording stops whichever one is running", () => {
  assert.match(main, /stop_meeting_recording: \(\) => \(!meetingState && screenRecProc \? stopScreenRecording\(\) : stopMeetingRecording\(\)\)/);
  assert.match(main, /stop_screen_recording: \(\) => \(!screenRecProc && meetingState \? stopMeetingRecording\(\) : stopScreenRecording\(\)\)/);
});
