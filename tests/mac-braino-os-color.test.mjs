import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseBrainoOsColorIntent, resolveColor } = require("../mac/braino-mac/braino-os-color.cjs");

test("he changes colour when he is told to", () => {
  const cases = [
    ["Braino, turn yourself orange", "orange"],
    ["can you please turn yourself into orange", "orange"],
    ["turn yourself red", "red"],
    ["change your colour to green", "green"],
    ["change your color to gold", "gold"],
    ["make yourself purple", "purple"],
    ["braino go crimson", "crimson"],
  ];
  for (const [said, name] of cases) {
    const intent = parseBrainoOsColorIntent(said);
    assert.equal(intent?.action, "color", said);
    assert.equal(intent?.name, name, said);
    assert.equal(intent?.color.length, 3, said);
  }
});

test("the vocabulary is as wide as the words people have", () => {
  // Two word names beat the single word inside them.
  assert.equal(resolveColor("dark sea green").name, "dark sea green");
  assert.deepEqual(resolveColor("hot pink").rgb, [255, 105, 180]);
  // Modifiers that are not colours are lifted off and then applied.
  const dark = resolveColor("dark red");
  const plain = resolveColor("red");
  assert.ok(dark.rgb[0] < plain.rgb[0], "dark red is darker than red");
  const neon = resolveColor("neon green");
  assert.ok(neon, "neon green resolves");
  // And the literal forms, for when a name will not do.
  assert.deepEqual(resolveColor("#ff8800").rgb, [255, 136, 0]);
  assert.deepEqual(resolveColor("rgb(12, 34, 56)").rgb, [12, 34, 56]);
});

test("going back is a thing he can be told too", () => {
  assert.equal(parseBrainoOsColorIntent("braino be yourself")?.action, "reset");
  assert.equal(parseBrainoOsColorIntent("go back to blue")?.action, "reset");
  assert.equal(parseBrainoOsColorIntent("reset your colour")?.action, "reset");
});

/* Repainting him is deliberate, never a side effect of saying a colour out
   loud. Something has to point the instruction at him. */
test("talking about a colour never repaints him", () => {
  for (const said of [
    "i like red",
    "the deploy went green",
    "open the orange folder",
    "what colour is the sky",
    "turn on the lights",
    "make me a green tea",
  ]) {
    assert.equal(parseBrainoOsColorIntent(said), null, said);
  }
});

test("the shortest form works too", () => {
  assert.equal(parseBrainoOsColorIntent("turn orange")?.name, "orange");
  assert.equal(parseBrainoOsColorIntent("go red")?.name, "red");
  assert.equal(parseBrainoOsColorIntent("become purple")?.name, "purple");
});

/* The parser being right is not the same as the phrase arriving.
 *
 * A real session logged "turn yourself orange" producing no delegate run at
 * all: the voice turn forks to chat first, chat answered it as conversation,
 * and the intent chain in the main process never saw a word. The persona and
 * grow commands already had to escape that same trap, and the only thing that
 * keeps this working is being checked before the fork. */
test("Braino OS commands are caught before chat can swallow them", async () => {
  const { readFileSync } = await import("node:fs");
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const osCall = renderer.indexOf("if (await runQuickVoiceCommand(turnText)) return;");
  /* Matched by shape rather than by an exact string: the fork became
     "await shouldUseRealtimeDirectChat" when it started asking the main process
     for the routing decision, and an indexOf on the old literal silently
     returned -1, which made this ordering check pass by accident. */
  const chatFork = renderer.search(/if \((?:await )?shouldUseRealtimeDirectChat\(turnText\)\)/);
  assert.ok(osCall > 0, "the voice turn checks Braino OS commands");
  assert.ok(chatFork > 0, "the chat fork is still there");
  assert.ok(osCall < chatFork, "Braino OS has to be checked BEFORE the chat fork");

  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /ipcMain\.handle\("braino-mac:quick-command"/);
  const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");
  assert.match(preload, /quickCommand:/);
});

test("a sentence about a profile, tab or app never repaints him (2026-10-18)", () => {
  for (const t of ["Switch to my default, my main profile.", "switch to the default tab", "switch to red profile", "reset my chrome settings"]) {
    assert.equal(parseBrainoOsColorIntent(t), null, t);
  }
  assert.equal(parseBrainoOsColorIntent("Braino reset your colour")?.action, "reset");
  assert.equal(parseBrainoOsColorIntent("be yourself")?.action, "reset");
});
