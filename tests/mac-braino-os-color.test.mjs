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
