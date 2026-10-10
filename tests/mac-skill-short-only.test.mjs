import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// 2026-09-29: an 81-word Hindi ramble and a 60-word overheard conversation
// were saved as skills. Only short, clear commands may become skills.
const src = fs.readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const body = src.slice(src.indexOf("function maybeSaveSkill("), src.indexOf("\n}\n", src.indexOf("function maybeSaveSkill(")));

test("skills are capped at a short command", () => {
  assert.match(src, /const SKILL_MAX_WORDS = 12;/);
  assert.match(body, /words > SKILL_MAX_WORDS/);
});

test("the length check runs before anything is saved", () => {
  assert.ok(body.indexOf("SKILL_MAX_WORDS") < body.indexOf("writeSkills("));
});
