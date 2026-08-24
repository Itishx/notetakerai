import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseBrainoOsIntent } = require("../mac/braino-mac/braino-os-intent.cjs");

test("opens Braino OS when he is asked what he looks like", () => {
  for (const said of [
    "Braino, show me what Braino OS looks like",
    "show me braino os",
    "open braino OS",
    "what do you look like",
    "hey braino, let me see braino os",
  ]) {
    const intent = parseBrainoOsIntent(said);
    assert.equal(intent?.action, "open", said);
    assert.equal(intent?.system, null, said);
  }
});

test("opens straight into a named system", () => {
  assert.equal(parseBrainoOsIntent("show me your mind")?.system, "mind");
  assert.equal(parseBrainoOsIntent("Braino, show me what your mind looks like")?.system, "mind");
  assert.equal(parseBrainoOsIntent("let me see your heart")?.system, "heart");
  assert.equal(parseBrainoOsIntent("show me your ears")?.system, "ears");
  assert.equal(parseBrainoOsIntent("take me inside your memory")?.system, "memory");
});

/* A phrase that takes over the whole screen has to be certain. These are the
   sentences that contain the words and mean nothing of the sort. */
test("ordinary sentences never take the screen", () => {
  for (const said of [
    "put your heart into it",
    "learn it by heart",
    "my ears are ringing",
    "do you remember what I said",
    "keep that in mind",
    "show me the weather",
    "what does the deploy log look like",
  ]) {
    const intent = parseBrainoOsIntent(said);
    assert.notEqual(intent?.action, "open", said);
  }
});

test("closes only when Braino OS is named", () => {
  assert.equal(parseBrainoOsIntent("close braino os")?.action, "close");
  assert.equal(parseBrainoOsIntent("exit braino OS")?.action, "close");
  assert.equal(parseBrainoOsIntent("close this"), null);
});

/* The window is the whole point: a takeover with the notch still floating over
   it is not the pure thing. */
test("the takeover hides the notch and restores it on close", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const block = main.slice(main.indexOf("function openBrainoOsWindow"), main.indexOf("function closeBrainoOsWindow") + 900);
  assert.match(block, /fullscreen: true/);
  assert.match(block, /frame: false/);
  // The notch goes away while it is open.
  assert.match(block, /dockWindow\.hide\(\)/);
  // And comes back afterwards.
  assert.match(block, /ensureDockWindowVisible\("braino-os-closed"\)/);
  // He talks in there, so the window needs the microphone.
  assert.match(block, /setPermissionRequestHandler/);
});
