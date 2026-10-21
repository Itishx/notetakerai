// 6 Oct: a quick-chat reply never came back. "Thinking" stayed 20 minutes, he
// ignored everything as "busy", and "stop" found nothing to stop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

test("a turn stuck in flight with no job and nothing playing is released after 45s", () => {
  assert.match(js, /const STUCK_TURN_MS = 45000;/);
  const fn = js.slice(js.indexOf("async function checkStuckTurn"), js.indexOf("/* `speaking` stuck on"));
  assert.match(fn, /if \(job\?\.running\) \{ stuckTurnSince = now; return; \}/);
  assert.match(fn, /releaseStuckTurn\("watchdog"\)/);
  assert.match(js, /void checkStuckTurn\(now, playing\);/);
  const rel = js.slice(js.indexOf("function releaseStuckTurn"), js.indexOf("async function checkStuckTurn"));
  for (const bit of ["voiceTurnInFlight = false", "processing = false", "realtimeResponseInFlight = false", 'nfSetThinking("")']) assert.ok(rel.includes(bit), bit);
});

test("stop always clears a stuck Thinking, even with no job running", () => {
  const stop = js.slice(js.indexOf("async function stopTaskNow"), js.indexOf("async function stopTaskNow") + 900);
  assert.match(stop, /if \(processing \|\| realtimeResponseInFlight \|\| nfThinkingShown\(\)\) \{\n      releaseStuckTurn\("stop_with_nothing_running"\);/);
});

/* 2026-10-05 23:40: the 12s timeout resolved "whichever waiter is current";
   another turn had already cleared that slot, so this turn never resolved. */
test("a chat reply that never comes always times out its own wait", async () => {
  const js2 = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const at = js2.indexOf("function createRealtimeResponseWaiter() {");
  const src = js2.slice(at, js2.indexOf("\n}\n", at) + 3);
  const env = Function("window", "logRenderer", `
    let realtimeResponseWaiter = null, realtimeResponseInFlight = true, realtimeResponseText = "";
    const REALTIME_CHAT_RESPONSE_TIMEOUT_MS = 20;
    function resolveRealtimeResponse(result) { const w = realtimeResponseWaiter; realtimeResponseWaiter = null; realtimeResponseInFlight = false; if (w?.resolve) w.resolve(result); }
    ${src}
    return { create: createRealtimeResponseWaiter, wipe: () => { realtimeResponseWaiter = null; } };
  `)({ setTimeout, clearTimeout }, () => {});
  const waiter = env.create();
  env.wipe(); // another turn's finally clears the shared slot
  const result = await Promise.race([waiter, new Promise((r) => setTimeout(() => r("hung"), 500))]);
  assert.equal(result?.status, "timeout");
});

test("a sentence Laya is sure is not for him, without his name, is dropped (class in the room, 6 Oct)", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /if \(layaFirst && layaFirst\.kind === "ignore" && layaFirst\.confidence >= LAYA_TALK_SURE\n    && !macHeardAddressed && !\/\\bbrain\(\?:o\|elle\|a\)\\b\/i\.test\(String\(raw \|\| ""\)\) && !pendingHilRun\) \{/);
  assert.match(main, /source: "laya:not_for_him"/);
});

test("HERA records and the cloud transcribes, words only, with the on-device backup", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const hera = readFileSync(new URL("../mac/braino-mac/hera.cjs", import.meta.url), "utf8");
  const fn = readFileSync(new URL("../supabase/functions/chat/transcribe-and-notes/index.ts", import.meta.url), "utf8");
  assert.match(hera, /function createHera\(\{ BrowserWindow, session, log = \(\) => \{\} \}\)/);
  assert.match(hera, /new MediaRecorder\(stream/);
  assert.match(main, /if \(!liveTranscriptMode && heraCloudEnabled\(\)\) \{\n    const rec = await hera\(\)\.start\(\);/);
  assert.match(main, /if \(heraCloudActive\) \{\n    heraLog\("stop pressed — sending the recording"\);/);
  assert.match(main, /transcriptOnly: true/);
  assert.match(fn, /if \(body\.transcriptOnly === true\) \{\n      return jsonResponse\(\{ transcript: fullTranscript \}\);/);
});
