import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

/* Brainelle is a saved setting that owns the voice.
 *
 * Once she is on she is on for everything, in her voice rather than his: good
 * morning, are you there, the pitch demo, all of it. She survives restarts, the
 * only ways back are a hotkey and a spoken phrase, and the symptom does not
 * point at a setting, so from the outside it reads as Braino being broken.
 *
 * She is off at the source rather than at each of the places that can turn her
 * on, which is what these hold. Flip BRAINELLE_ENABLED to have her back. */
test("Braino speaks as Braino", () => {
  assert.match(renderer, /const BRAINELLE_ENABLED = false;/);

  /* Nothing may set the character except through the one gate. */
  const assignments = renderer.match(/^\s*macCharacter = .*$/gm) || [];
  assert.equal(assignments.length, 1, `character assigned outside the gate: ${assignments.join(" | ")}`);
  assert.match(renderer, /const next = \(BRAINELLE_ENABLED && MAC_CHARACTERS\[key\]\) \? key : "braino";/);

  /* And a value stored before she was switched off cannot bring her back. */
  assert.match(renderer, /if \(BRAINELLE_ENABLED\) \{[\s\S]{0,200}getItem\(MAC_CHARACTER_STORAGE_KEY\)/);
  assert.match(renderer, /\} else \{[\s\S]{0,120}removeItem\(MAC_CHARACTER_STORAGE_KEY\)/);
});
