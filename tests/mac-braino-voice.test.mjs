import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

/* Brainelle's voice belongs to her body.
 *
 * The character (who you hear) and the avatar (who you see) used to be two
 * settings, and each way they fell apart looked like Braino being broken: her
 * voice coming out of his rig, or her rig speaking in his voice. These hold the
 * one rule that keeps them together — the avatar decides the character, and
 * nothing sets the character any other way. */
test("Brainelle is on", () => {
  assert.match(renderer, /const BRAINELLE_ENABLED = true;/);
  assert.match(renderer, /brainelle: \{\s*name: "Brainelle",\s*refId: "b67aedfb36d04c53892fd0e96db08180"/);
});

test("the character is only ever set through the one gate", () => {
  const assignments = renderer.match(/^\s*macCharacter = .*$/gm) || [];
  assert.equal(assignments.length, 1, `character assigned outside the gate: ${assignments.join(" | ")}`);
  assert.match(renderer, /const next = \(BRAINELLE_ENABLED && MAC_CHARACTERS\[key\]\) \? key : "braino";/);
});

test("picking the avatar is what switches the voice", () => {
  const pick = renderer.match(/function setMascotChoice\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(pick, /macSetCharacter\(mascotChoice === "brainelle" \? "brainelle" : "braino"/);
  // Cmd+Shift+B hides him and brings him back (2026-09-26); the menu swaps characters.
  assert.match(renderer, /onCharacterToggle\?\.\(\(\) => \{[\s\S]{0,240}setMascotHide\(mascotHidden\(\) \? null : "hidden"/);
});

test("saying 'be Brainelle' moves the avatar too, so voice and body never disagree", () => {
  const block = renderer.match(/const charCmd = macDetectCharacterCommand\(transcript\);[\s\S]*?return;\n\s*\}/)?.[0] || "";
  assert.ok(block, "spoken character switch not found");
  assert.match(block, /setMascotChoice\(charCmd\)/);
  assert.doesNotMatch(block, /macSetCharacter\(charCmd\)/);
});
