import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");

test("a voice session waits ready with no microphone on it, and calling him uses it", () => {
  assert.match(js, /pc\.addTransceiver\("audio", \{ direction: "sendrecv" \}\)\.sender/);
  assert.match(js, /if \(!sb\.adopted\) return; \/\/ nothing happens in a session nobody is using/);
  assert.match(js, /const standby = !isDictation \? takeVoiceStandby\(\) : null;/);
  assert.match(js, /await standby\.sender\.replaceTrack\(stream\.getAudioTracks\(\)\[0\]\)/);
  assert.match(js, /if \(hadRealtime && warmVoiceOn\(\)\) scheduleVoiceStandby\(1500\);/);
  assert.match(js, /if \(!auth\?\.authenticated\) return; \/\/ never ask you to sign in for this/);
  assert.match(js, /localStorage\.getItem\("brainoWarmVoice"\) !== "0"/);
});

test("the fallback still opens a session from nothing", () => {
  assert.match(js, /\} else \{\n\s+pc = new RTCPeerConnection\(\);/);
  assert.match(js, /\s+result = await window\.brainoMac\.createRealtimeCall\(\{/);
});

test("four spots: menu, and a drop goes to the nearest", () => {
  for (const s of ["left", "top", "bottom", "right", "walk"]) assert.match(html, new RegExp(`data-dock="${s}"`));
  assert.match(js, /dockAt\(nearestDockSpot\(posX, posY\), "drag"\)/);
  const body = js.slice(js.indexOf("function nearestDockSpot"), js.indexOf("function dockAt"));
  const nearest = new Function("DOCK_SPOTS", "dockSpotPoint", `${body}; return nearestDockSpot;`)(
    ["left", "top", "bottom", "right"],
    (s) => ({ left: { x: 10, y: 400 }, right: { x: 1400, y: 400 }, top: { x: 700, y: 54 }, bottom: { x: 700, y: 800 } }[s]));
  assert.equal(nearest(100, 380), "left");
  assert.equal(nearest(1300, 500), "right");
  assert.equal(nearest(650, 120), "top");
  assert.equal(nearest(760, 760), "bottom");
});

test("he glows from the moment you call him", () => {
  assert.match(css, /#walker\.connecting svg,\n#walker\.listening svg \{\n\s+animation: macWalkerListenGlow/);
});

test("already connected: no waking screen, straight to listening", () => {
  assert.match(js, /const warm = !isDictation && Boolean\(voiceStandby && voiceStandby\.dc\?\.readyState === "open"\);\n\s+if \(warm\) \{\n\s+setStatus\("listening", "Listening"\);/);
  assert.match(js, /if \(!isDictation && !standby\) setBubble\("I am listening\.", 1400\);/);
});
